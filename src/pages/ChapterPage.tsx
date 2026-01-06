import { useState } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Progress } from '@/components/ui/progress';
import { 
  Award, Download, TrendingUp, CheckCircle, 
  Clock, Plus, DollarSign, Shield, Trophy, Target, 
  ChevronRight, Users
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMembers, useMemberPoints } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV } from '@/lib/csv';
import { GrantPointsDialog } from '@/components/points/GrantPointsDialog';
import { useServiceHours, useLogServiceHours, useAllServiceHours, useVerifyServiceHours } from '@/hooks/useServiceHours';
import { useAllDues, useRecordDues } from '@/hooks/useDues';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';

const categories = ['chapter', 'rush', 'fundraising', 'service', 'brotherhood', 'professionalism', 'dei'] as const;

// Requirements - could be made configurable later
const POINTS_REQUIREMENT = 100;
const SERVICE_HOURS_REQUIREMENT = 10;

export default function ChapterPage() {
  const { user, isAdminOrOfficer } = useAuth();
  const { data: members } = useMembers();
  const { data: myPoints } = useMemberPoints(user?.id ?? '');
  const { data: myHours = [] } = useServiceHours(user?.id);
  const { data: allHours = [] } = useAllServiceHours();
  const verifyHours = useVerifyServiceHours();
  const logHours = useLogServiceHours();
  const { data: allDues = [] } = useAllDues();
  const recordDues = useRecordDues();

  const [activeTab, setActiveTab] = useState('standing');
  const [logHoursOpen, setLogHoursOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [duesOpen, setDuesOpen] = useState(false);
  const [duesUserId, setDuesUserId] = useState('');
  const [duesAmount, setDuesAmount] = useState('');
  const [duesSemester, setDuesSemester] = useState('');
  const [duesNotes, setDuesNotes] = useState('');

  // Fetch all points for leaderboard
  const { data: allPoints } = useQuery({
    queryKey: ['all-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  // Calculate totals by member
  const memberTotals = members?.map(member => {
    const memberPoints = allPoints?.filter(p => p.user_id === member.user_id) ?? [];
    const total = memberPoints.reduce((sum, p) => sum + p.points, 0);
    const byCategory = memberPoints.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.points;
      return acc;
    }, {} as Record<string, number>);
    
    return { member, total, byCategory };
  }).sort((a, b) => b.total - a.total) ?? [];

  // My totals
  const myTotal = myPoints?.reduce((sum, p) => sum + p.points, 0) ?? 0;
  const myByCategory = myPoints?.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.points;
    return acc;
  }, {} as Record<string, number>) ?? {};

  // Service hours stats
  const myTotalHours = myHours.reduce((sum, h) => sum + Number(h.hours), 0);
  const myVerifiedHours = myHours.filter(h => h.verified).reduce((sum, h) => sum + Number(h.hours), 0);
  const myPendingHours = myTotalHours - myVerifiedHours;

  // My rank
  const myRank = memberTotals.findIndex(m => m.member.user_id === user?.id) + 1;

  // Admin stats
  const pendingServiceHours = allHours.filter(h => !h.verified);
  const totalMembersCount = members?.length || 0;

  const getMemberName = (userId: string) => {
    const member = members?.find(m => m.user_id === userId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const handleExportPoints = () => {
    if (!memberTotals) return;
    const exportData = memberTotals.map(({ member, total, byCategory }) => ({
      'First Name': member.first_name,
      'Last Name': member.last_name,
      Email: member.email,
      'Total Points': total,
      Chapter: byCategory.chapter || 0,
      Rush: byCategory.rush || 0,
      Fundraising: byCategory.fundraising || 0,
      Service: byCategory.service || 0,
      Brotherhood: byCategory.brotherhood || 0,
      Professionalism: byCategory.professionalism || 0,
      'DE&I': byCategory.dei || 0,
    }));
    exportToCSV(exportData, 'points-report');
  };

  const handleLogHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !hours || !description || !serviceDate) return;
    
    logHours.mutate({
      user_id: user.id,
      hours: parseFloat(hours),
      description,
      service_date: serviceDate,
    }, {
      onSuccess: () => {
        setLogHoursOpen(false);
        setHours('');
        setDescription('');
        setServiceDate('');
      }
    });
  };

  const handleVerify = (id: string) => {
    if (!user?.id) return;
    verifyHours.mutate({ id, verified_by: user.id });
  };

  const handleRecordDues = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !duesUserId || !duesAmount || !duesSemester) return;
    
    recordDues.mutate({
      user_id: duesUserId,
      amount: parseFloat(duesAmount),
      semester: duesSemester,
      notes: duesNotes || undefined,
      created_by: user.id,
    }, {
      onSuccess: () => {
        setDuesOpen(false);
        setDuesUserId('');
        setDuesAmount('');
        setDuesSemester('');
        setDuesNotes('');
      }
    });
  };

  // Progress percentages
  const pointsProgress = Math.min((myTotal / POINTS_REQUIREMENT) * 100, 100);
  const hoursProgress = Math.min((myVerifiedHours / SERVICE_HOURS_REQUIREMENT) * 100, 100);
  const isGoodStanding = myTotal >= POINTS_REQUIREMENT && myVerifiedHours >= SERVICE_HOURS_REQUIREMENT;

  return (
    <AppLayout>
      <PageHeader 
        title="Chapter" 
        description="Your standing, contributions, and chapter governance"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="standing" className="flex-1 gap-2">
            <Award className="h-4 w-4" />
            My Standing
          </TabsTrigger>
          {isAdminOrOfficer && (
            <TabsTrigger value="admin" className="flex-1 gap-2">
              <Shield className="h-4 w-4" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        {/* Standing Tab - Clean Personal Dashboard */}
        <TabsContent value="standing" className="space-y-6">
          {/* Status Banner */}
          <Card className={`border-2 ${isGoodStanding ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isGoodStanding ? (
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Target className="h-5 w-5 text-amber-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">
                      {isGoodStanding ? 'You\'re in Good Standing!' : 'Keep Going!'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isGoodStanding 
                        ? 'All semester requirements met' 
                        : `${POINTS_REQUIREMENT - myTotal > 0 ? `${POINTS_REQUIREMENT - myTotal} points` : ''} ${POINTS_REQUIREMENT - myTotal > 0 && SERVICE_HOURS_REQUIREMENT - myVerifiedHours > 0 ? 'and ' : ''}${SERVICE_HOURS_REQUIREMENT - myVerifiedHours > 0 ? `${(SERVICE_HOURS_REQUIREMENT - myVerifiedHours).toFixed(1)} service hours` : ''} to go`
                      }
                    </p>
                  </div>
                </div>
                {myRank > 0 && (
                  <div className="text-right hidden sm:block">
                    <p className="text-2xl font-bold text-primary">#{myRank}</p>
                    <p className="text-xs text-muted-foreground">Chapter Rank</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Points Progress */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Points
                  </CardTitle>
                  <span className="text-2xl font-bold">{myTotal}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress to {POINTS_REQUIREMENT}</span>
                    <span className="font-medium">{Math.round(pointsProgress)}%</span>
                  </div>
                  <Progress value={pointsProgress} className="h-2" />
                </div>
                
                {/* Category Breakdown - Compact */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {categories.slice(0, 4).map(cat => (
                    <div key={cat} className="text-center">
                      <div className="text-lg font-semibold">{myByCategory[cat] || 0}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{cat}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Hours Progress */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Service Hours
                  </CardTitle>
                  <span className="text-2xl font-bold">{myVerifiedHours.toFixed(1)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress to {SERVICE_HOURS_REQUIREMENT}</span>
                    <span className="font-medium">{Math.round(hoursProgress)}%</span>
                  </div>
                  <Progress value={hoursProgress} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  {myPendingHours > 0 && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      {myPendingHours.toFixed(1)} hrs pending verification
                    </Badge>
                  )}
                  <Dialog open={logHoursOpen} onOpenChange={setLogHoursOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="ml-auto">
                        <Plus className="h-4 w-4 mr-1" />
                        Log Hours
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Service Hours</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleLogHours} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="hours">Hours</Label>
                            <Input
                              id="hours"
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={hours}
                              onChange={(e) => setHours(e.target.value)}
                              placeholder="2.5"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                              id="date"
                              type="date"
                              value={serviceDate}
                              onChange={(e) => setServiceDate(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">What did you do?</Label>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the service activity..."
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={logHours.isPending}>
                          {logHours.isPending ? 'Submitting...' : 'Submit for Verification'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Leaderboard Row */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Recent Points */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Recent Points</CardTitle>
              </CardHeader>
              <CardContent>
                {myPoints && myPoints.length > 0 ? (
                  <div className="space-y-3">
                    {myPoints.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryBadge category={entry.category} />
                          <span className="text-sm truncate">{entry.reason}</span>
                        </div>
                        <Badge variant={entry.points > 0 ? 'default' : 'destructive'} className="shrink-0">
                          {entry.points > 0 ? '+' : ''}{entry.points}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No points earned yet. Attend events to start earning!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top Members
                </CardTitle>
                {isAdminOrOfficer && (
                  <Button variant="ghost" size="sm" onClick={handleExportPoints} className="h-8 gap-1">
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {memberTotals.length === 0 ? (
                  <EmptyState
                    icon={Award}
                    title="No points yet"
                    description="Points will appear as members earn them."
                  />
                ) : (
                  <div className="space-y-2">
                    {memberTotals.slice(0, 5).map(({ member, total }, index) => {
                      const isMe = member.user_id === user?.id;
                      return (
                        <Link 
                          key={member.id} 
                          to={`/people/${member.id}`}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-accent ${isMe ? 'bg-primary/5 border border-primary/20' : ''}`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-yellow-950' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-amber-600 text-amber-50' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.first_name} {member.last_name}
                              {isMe && <span className="text-primary ml-1">(You)</span>}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">{total} pts</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Admin Tab - Streamlined */}
        {isAdminOrOfficer && (
          <TabsContent value="admin" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalMembersCount}</p>
                    <p className="text-xs text-muted-foreground">Active Members</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingServiceHours.length}</p>
                    <p className="text-xs text-muted-foreground">Pending Hours</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{allDues.length}</p>
                    <p className="text-xs text-muted-foreground">Dues Paid</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <GrantPointsDialog />
                  <Dialog open={duesOpen} onOpenChange={setDuesOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Record Dues
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Record Dues Payment</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleRecordDues} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="member">Member</Label>
                          <Select value={duesUserId} onValueChange={setDuesUserId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select member" />
                            </SelectTrigger>
                            <SelectContent>
                              {members?.map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id}>
                                  {member.first_name} {member.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="amount">Amount ($)</Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={duesAmount}
                              onChange={(e) => setDuesAmount(e.target.value)}
                              placeholder="100.00"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="semester">Semester</Label>
                            <Input
                              id="semester"
                              value={duesSemester}
                              onChange={(e) => setDuesSemester(e.target.value)}
                              placeholder="Fall 2024"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes (optional)</Label>
                          <Textarea
                            id="notes"
                            value={duesNotes}
                            onChange={(e) => setDuesNotes(e.target.value)}
                            placeholder="Payment notes..."
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={recordDues.isPending}>
                          {recordDues.isPending ? 'Recording...' : 'Record Payment'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Pending Service Hours */}
            {pendingServiceHours.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Service Hours ({pendingServiceHours.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingServiceHours.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getMemberName(entry.user_id).split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{getMemberName(entry.user_id)}</p>
                            <p className="text-xs text-muted-foreground">
                              {Number(entry.hours).toFixed(1)} hrs • {format(new Date(entry.service_date), 'MMM d')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground max-w-[150px] truncate hidden sm:block">
                            {entry.description}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleVerify(entry.id)}
                            disabled={verifyHours.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Dues Payments */}
            {allDues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Recent Dues Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDues.slice(0, 5).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {getMemberName(payment.user_id)}
                          </TableCell>
                          <TableCell>${Number(payment.amount).toFixed(2)}</TableCell>
                          <TableCell>{payment.semester}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(payment.paid_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}
