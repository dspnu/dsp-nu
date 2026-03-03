import { useState, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Award, Download, TrendingUp, CheckCircle, Clock, Plus, DollarSign,
  Shield, Trophy, Target, ChevronRight, Users, Briefcase, Coffee,
  FolderOpen, FileText, Folder, Search, AlertCircle, UserCheck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMembers, useMemberPoints } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV } from '@/lib/csv';
import { GrantPointsDialog } from '@/components/points/GrantPointsDialog';
import { useServiceHours, useLogServiceHours, useAllServiceHours, useVerifyServiceHours } from '@/hooks/useServiceHours';
import { useAllDues, useRecordDues } from '@/hooks/useDues';
import { useJobs, useJobBookmarks, useApproveJob } from '@/hooks/useJobs';
import { useMyCoffeeChats, useCoffeeChats } from '@/hooks/useCoffeeChats';
import { useApproveResource, useResources } from '@/hooks/useResources';
import { useChapterSetting, useUpdateChapterSetting } from '@/hooks/useChapterSettings';
import { useIsVPChapterOps } from '@/hooks/useEOPRealtime';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { JobForm } from '@/components/jobs/JobForm';
import { JobCard } from '@/components/jobs/JobCard';
import { CoffeeChatForm } from '@/components/coffee-chats/CoffeeChatForm';
import { CoffeeChatCard } from '@/components/coffee-chats/CoffeeChatCard';
import { CoffeeChatDashboard } from '@/components/coffee-chats/CoffeeChatDashboard';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { ResourceCard } from '@/components/resources/ResourceCard';

const categories = ['chapter', 'rush', 'fundraising', 'service', 'brotherhood', 'professionalism', 'dei', 'new_member'] as const;
const POINTS_REQUIREMENT = 100;
const SERVICE_HOURS_REQUIREMENT = 10;

const jobTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'internship', label: 'Internship' },
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
];

const FOLDER_ICONS: Record<string, string> = {
  General: '📁', Forms: '📋', Bylaws: '📜', Templates: '📝', Training: '🎓', Marketing: '📢',
};

export default function ChapterPage() {
  const { user, profile, isAdminOrOfficer } = useAuth();
  const { isVPChapterOps } = useIsVPChapterOps();
  const { data: members } = useMembers();
  const { data: myPoints } = useMemberPoints(user?.id ?? '');
  const { data: myHours = [] } = useServiceHours(user?.id);
  const { data: allHours = [] } = useAllServiceHours();
  const verifyHours = useVerifyServiceHours();
  const logHours = useLogServiceHours();
  const { data: allDues = [] } = useAllDues();
  const recordDues = useRecordDues();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const approveJob = useApproveJob();
  const { data: myChats, isLoading: chatsLoading } = useMyCoffeeChats();
  const { data: allChats } = useCoffeeChats();
  const { data: resources, isLoading: resourcesLoading } = useResources();
  const approveResource = useApproveResource();
  const { bookmarks, toggleBookmark } = useJobBookmarks(user?.id ?? '');
  const { data: eopVisible } = useChapterSetting('eop_visible');
  const updateSetting = useUpdateChapterSetting();

  const [activeTab, setActiveTab] = useState('jobs');
  const [jobSearch, setJobSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resourceSearch, setResourceSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');
  const [logHoursOpen, setLogHoursOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [duesOpen, setDuesOpen] = useState(false);
  const [duesUserId, setDuesUserId] = useState('');
  const [duesAmount, setDuesAmount] = useState('');
  const [duesSemester, setDuesSemester] = useState('');
  const [duesNotes, setDuesNotes] = useState('');

  // ---- Points / Leaderboard ----
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

  // Family-based leaderboard
  const familyTotals = useMemo(() => {
    if (!members || !allPoints) return [];
    const familyMap: Record<string, { family: string; total: number; memberCount: number }> = {};
    members.forEach(member => {
      const family = member.family || 'Unassigned';
      const memberPoints = allPoints.filter(p => p.user_id === member.user_id);
      const total = memberPoints.reduce((sum, p) => sum + p.points, 0);
      if (!familyMap[family]) {
        familyMap[family] = { family, total: 0, memberCount: 0 };
      }
      familyMap[family].total += total;
      familyMap[family].memberCount += 1;
    });
    return Object.values(familyMap).sort((a, b) => b.total - a.total);
  }, [members, allPoints]);

  const myTotal = myPoints?.reduce((sum, p) => sum + p.points, 0) ?? 0;
  const myByCategory = myPoints?.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.points;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const myTotalHours = myHours.reduce((sum, h) => sum + Number(h.hours), 0);
  const myVerifiedHours = myHours.filter(h => h.verified).reduce((sum, h) => sum + Number(h.hours), 0);
  const myPendingHours = myTotalHours - myVerifiedHours;
  const myFamily = profile?.family || 'Unassigned';
  const myFamilyRank = familyTotals.findIndex(f => f.family === myFamily) + 1;

  const pendingServiceHours = allHours.filter(h => !h.verified);
  const pendingJobs = jobs?.filter(job => !job.is_approved) ?? [];
  const pendingResources: any[] = [];
  const totalMembersCount = members?.length || 0;

  const getMemberName = (userId: string) => {
    const member = members?.find(m => m.user_id === userId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const pointsProgress = Math.min((myTotal / POINTS_REQUIREMENT) * 100, 100);
  const hoursProgress = Math.min((myVerifiedHours / SERVICE_HOURS_REQUIREMENT) * 100, 100);
  const isGoodStanding = myTotal >= POINTS_REQUIREMENT && myVerifiedHours >= SERVICE_HOURS_REQUIREMENT;

  // ---- Jobs ----
  const filteredJobs = jobs?.filter(job => {
    const matchesSearch =
      job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.company.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.description?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.tags?.some(tag => tag.toLowerCase().includes(jobSearch.toLowerCase()));
    const matchesType = typeFilter === 'all' || job.job_type === typeFilter;
    return matchesSearch && matchesType;
  }) ?? [];
  const bookmarkedJobs = filteredJobs.filter(job => bookmarks.includes(job.id));

  // ---- Coffee Chats ----
  const pendingConfirmations = myChats?.filter(
    c => c.status === 'emailed' && c.partner_id === user?.id
  ) || [];

  // ---- Resources ----
  const folders = useMemo(() => {
    if (!resources) return [];
    return [...new Set(resources.map(r => r.folder))].sort();
  }, [resources]);

  const filteredResources = useMemo(() => {
    if (!resources) return [];
    return resources.filter(resource => {
      const matchesSearch = resourceSearch === '' ||
        resource.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        resource.description?.toLowerCase().includes(resourceSearch.toLowerCase());
      const matchesFolder = activeFolder === 'all' || resource.folder === activeFolder;
      return matchesSearch && matchesFolder;
    });
  }, [resources, resourceSearch, activeFolder]);

  const groupedResources = useMemo(() => {
    const groups: Record<string, typeof filteredResources> = {};
    filteredResources.forEach(resource => {
      if (!groups[resource.folder]) groups[resource.folder] = [];
      groups[resource.folder].push(resource);
    });
    return groups;
  }, [filteredResources]);

  // ---- Handlers ----
  const handleExportPoints = () => {
    if (!familyTotals) return;
    const exportData = familyTotals.map(({ family, total, memberCount }) => ({
      Family: family,
      'Total Points': total,
      Members: memberCount,
    }));
    exportToCSV(exportData, 'family-points-report');
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

  const tabCount = 4 + (isAdminOrOfficer ? 1 : 0);

  return (
    <AppLayout>
      <PageHeader
        title="Chapter"
        description="Your one-stop hub for chapter life"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`w-full max-w-2xl grid`} style={{ gridTemplateColumns: `repeat(${tabCount}, 1fr)` }}>
          <TabsTrigger value="jobs" className="gap-2">
            <Briefcase className="h-4 w-4 hidden sm:block" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="coffee-chats" className="gap-2">
            <Coffee className="h-4 w-4 hidden sm:block" />
            Coffee Chats
          </TabsTrigger>
          <TabsTrigger value="standing" className="gap-2">
            <Award className="h-4 w-4 hidden sm:block" />
            Standing
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <FolderOpen className="h-4 w-4 hidden sm:block" />
            Resources
          </TabsTrigger>
          {isAdminOrOfficer && (
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4 hidden sm:block" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        {/* ========== JOBS TAB ========== */}
        <TabsContent value="jobs" className="space-y-6">
          <div className="flex justify-end">
            <JobForm />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search jobs, companies, or tags..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
              <SelectContent>
                {jobTypes.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {jobsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Jobs ({filteredJobs.length})</TabsTrigger>
                <TabsTrigger value="bookmarked">Saved ({bookmarkedJobs.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                {filteredJobs.length === 0 ? (
                  <EmptyState icon={Briefcase} title="No job postings" description="Job and internship opportunities will appear here." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredJobs.map((job) => (
                      <JobCard key={job.id} job={job} isBookmarked={bookmarks.includes(job.id)} onToggleBookmark={() => toggleBookmark(job.id)} />
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="bookmarked" className="mt-4">
                {bookmarkedJobs.length === 0 ? (
                  <EmptyState icon={Briefcase} title="No saved jobs" description="Bookmark jobs to save them for later." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {bookmarkedJobs.map((job) => (
                      <JobCard key={job.id} job={job} isBookmarked={true} onToggleBookmark={() => toggleBookmark(job.id)} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        {/* ========== COFFEE CHATS TAB ========== */}
        <TabsContent value="coffee-chats" className="space-y-8">
          {pendingConfirmations.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Waiting for Your Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingConfirmations.map((chat) => (
                    <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <section>
            <Tabs defaultValue="mine" className="space-y-4">
              <TabsList>
                <TabsTrigger value="mine">My Chats</TabsTrigger>
                {isAdminOrOfficer && <TabsTrigger value="all">All Chats</TabsTrigger>}
              </TabsList>
              <TabsContent value="mine">
                {chatsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3].map(i => (<Card key={i} className="h-32 animate-pulse bg-muted" />))}</div>
                ) : myChats && myChats.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myChats.map((chat) => (
                      <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Coffee} title="No coffee chats yet" description="Coffee chats you've been invited to will appear here." />
                )}
              </TabsContent>
              {isAdminOrOfficer && (
                <TabsContent value="all">
                  {allChats && allChats.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {allChats.map((chat) => (
                        <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={Coffee} title="No coffee chats logged" description="Coffee chats from all members will appear here." />
                  )}
                </TabsContent>
              )}
            </Tabs>
          </section>
          <CoffeeChatDashboard />
        </TabsContent>

        {/* ========== STANDING TAB ========== */}
        <TabsContent value="standing" className="space-y-4 sm:space-y-6">
          {/* Status Banner */}
          <Card className={`border-2 ${isGoodStanding ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
            <CardContent className="py-3 sm:py-4 px-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {isGoodStanding ? (
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base">
                      {isGoodStanding ? "You're in Good Standing!" : 'Keep Going!'}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                      {isGoodStanding
                        ? 'All semester requirements met'
                        : `${POINTS_REQUIREMENT - myTotal > 0 ? `${POINTS_REQUIREMENT - myTotal} pts` : ''} ${POINTS_REQUIREMENT - myTotal > 0 && SERVICE_HOURS_REQUIREMENT - myVerifiedHours > 0 ? '& ' : ''}${SERVICE_HOURS_REQUIREMENT - myVerifiedHours > 0 ? `${(SERVICE_HOURS_REQUIREMENT - myVerifiedHours).toFixed(1)} hrs` : ''} to go`
                      }
                    </p>
                  </div>
                </div>
                {myFamilyRank > 0 && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl sm:text-2xl font-bold text-primary">#{myFamilyRank}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Family Rank</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {/* Points */}
            <Card>
              <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />Points
                  </CardTitle>
                  <span className="text-xl sm:text-2xl font-bold">{myTotal}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Progress to {POINTS_REQUIREMENT}</span>
                    <span className="font-medium">{Math.round(pointsProgress)}%</span>
                  </div>
                  <Progress value={pointsProgress} className="h-2" />
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                  {categories.slice(0, 4).map(cat => (
                    <div key={cat} className="text-center">
                      <div className="text-base sm:text-lg font-semibold">{myByCategory[cat] || 0}</div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground capitalize truncate">{cat}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Hours */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />Service Hours
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
                      <Button size="sm" variant="outline" className="ml-auto"><Plus className="h-4 w-4 mr-1" />Log Hours</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Log Service Hours</DialogTitle></DialogHeader>
                      <form onSubmit={handleLogHours} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="hours">Hours</Label>
                            <Input id="hours" type="number" step="0.5" min="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2.5" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">What did you do?</Label>
                          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the service activity..." required />
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

          {/* Recent Activity & Family Leaderboard */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base font-medium">Recent Points</CardTitle></CardHeader>
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
                  <p className="text-sm text-muted-foreground text-center py-4">No points earned yet. Attend events to start earning!</p>
                )}
              </CardContent>
            </Card>

            {/* Family Leaderboard */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />Top Families
                </CardTitle>
                {isAdminOrOfficer && (
                  <Button variant="ghost" size="sm" onClick={handleExportPoints} className="h-8 gap-1">
                    <Download className="h-3 w-3" />Export
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {familyTotals.length === 0 ? (
                  <EmptyState icon={Award} title="No points yet" description="Points will appear as members earn them." />
                ) : (
                  <div className="space-y-2">
                    {familyTotals.slice(0, 8).map(({ family, total, memberCount }, index) => {
                      const isMyFamily = family === myFamily;
                      return (
                        <div
                          key={family}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isMyFamily ? 'bg-primary/5 border border-primary/20' : ''}`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-yellow-950' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-amber-600 text-amber-50' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {family}
                              {isMyFamily && <span className="text-primary ml-1">(Yours)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{memberCount} members</p>
                          </div>
                          <span className="text-sm font-semibold">{total} pts</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========== RESOURCES TAB ========== */}
        <TabsContent value="resources" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="grid gap-4 md:grid-cols-2 flex-1 mr-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{resources?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Resources</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Folder className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{folders.length}</p>
                    <p className="text-sm text-muted-foreground">Folders</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <ResourceForm />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search resources..." value={resourceSearch} onChange={(e) => setResourceSearch(e.target.value)} className="pl-9" />
          </div>
          {resourcesLoading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => (<Card key={i} className="h-20 animate-pulse bg-muted" />))}</div>
          ) : resources && resources.length > 0 ? (
            <Tabs value={activeFolder} onValueChange={setActiveFolder} className="space-y-4">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all">All</TabsTrigger>
                {folders.map((folder) => (
                  <TabsTrigger key={folder} value={folder}>
                    <span className="mr-1">{FOLDER_ICONS[folder] || '📁'}</span>{folder}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all" className="space-y-6">
                {Object.entries(groupedResources).map(([folder, folderResources]) => (
                  <div key={folder}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <span>{FOLDER_ICONS[folder] || '📁'}</span>{folder}
                      <span className="text-xs">({folderResources.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {folderResources.map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} isOfficer={isAdminOrOfficer} />
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
              {folders.map((folder) => (
                <TabsContent key={folder} value={folder} className="space-y-3">
                  {groupedResources[folder]?.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} isOfficer={isAdminOrOfficer} />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <EmptyState icon={FolderOpen} title="No resources yet" description={isAdminOrOfficer ? "Add documents and files for the chapter to access." : "Chapter resources will appear here when added by officers."} />
          )}
        </TabsContent>

        {/* ========== ADMIN TAB ========== */}
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
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingJobs.length + pendingResources.length}</p>
                    <p className="text-xs text-muted-foreground">Pending Posts</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(pendingJobs.length > 0 || pendingResources.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pending Resource & Job Approvals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                      <div>
                        <p className="font-medium text-sm">{job.title}</p>
                        <p className="text-xs text-muted-foreground">Job • {job.company}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => approveJob.mutate(job.id)}
                        disabled={approveJob.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />Approve
                      </Button>
                    </div>
                  ))}
                  {pendingResources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                      <div>
                        <p className="font-medium text-sm">{resource.title}</p>
                        <p className="text-xs text-muted-foreground">Resource • {resource.folder}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => approveResource.mutate(resource.id)}
                        disabled={approveResource.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />Approve
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* EOP Visibility Toggle - VP of Chapter Ops only */}
            {isVPChapterOps && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Chapter Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">EOP Tab Visibility</p>
                      <p className="text-xs text-muted-foreground">Toggle to show or hide the EOP voting tab for all members</p>
                    </div>
                    <Switch
                      checked={!!eopVisible}
                      onCheckedChange={(checked) => updateSetting.mutate({ key: 'eop_visible', value: checked })}
                      disabled={updateSetting.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <GrantPointsDialog />
                  <Dialog open={duesOpen} onOpenChange={setDuesOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2"><DollarSign className="h-4 w-4" />Record Dues</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Record Dues Payment</DialogTitle></DialogHeader>
                      <form onSubmit={handleRecordDues} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="member">Member</Label>
                          <Select value={duesUserId} onValueChange={setDuesUserId}>
                            <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                            <SelectContent>
                              {members?.map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id}>{member.first_name} {member.last_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="amount">Amount ($)</Label>
                            <Input id="amount" type="number" step="0.01" min="0" value={duesAmount} onChange={(e) => setDuesAmount(e.target.value)} placeholder="100.00" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="semester">Semester</Label>
                            <Input id="semester" value={duesSemester} onChange={(e) => setDuesSemester(e.target.value)} placeholder="Fall 2024" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes (optional)</Label>
                          <Textarea id="notes" value={duesNotes} onChange={(e) => setDuesNotes(e.target.value)} placeholder="Payment notes..." />
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
                    <Clock className="h-4 w-4" />Pending Service Hours ({pendingServiceHours.length})
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
                            <p className="text-xs text-muted-foreground">{Number(entry.hours).toFixed(1)} hrs • {format(new Date(entry.service_date), 'MMM d')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground max-w-[150px] truncate hidden sm:block">{entry.description}</p>
                          <Button size="sm" onClick={() => handleVerify(entry.id)} disabled={verifyHours.isPending}>
                            <CheckCircle className="h-4 w-4 mr-1" />Verify
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Dues */}
            {allDues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Recent Dues Payments</CardTitle>
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
                          <TableCell className="font-medium">{getMemberName(payment.user_id)}</TableCell>
                          <TableCell>${Number(payment.amount).toFixed(2)}</TableCell>
                          <TableCell>{payment.semester}</TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(payment.paid_at), 'MMM d, yyyy')}</TableCell>
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
