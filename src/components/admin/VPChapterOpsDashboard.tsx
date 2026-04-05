import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MemberStandingDetail } from './MemberStandingDetail';
import { AttendanceEarnersManager } from './AttendanceEarnersManager';
import { FamilyGamesManager } from './FamilyGamesManager';
import { ChairPositionsManager } from './ChairPositionsManager';
import { ElectionManager } from './ElectionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CalendarCheck, Shield, Eye, Search, Calendar, Vote, Trophy, Settings, ClipboardList, Award, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMembers } from '@/hooks/useMembers';
import { useAllAttendance } from '@/hooks/useAttendance';
import { useChapterSetting, useUpdateChapterSetting } from '@/hooks/useChapterSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeCandidates, useRealtimeVoteCounts } from '@/hooks/useEOPRealtime';
import { toast } from 'sonner';

const categories = ['chapter', 'rush', 'fundraising', 'service', 'brotherhood', 'professionalism', 'dei'] as const;
const POINTS_REQUIREMENT = 7;
const SERVICE_HOURS_REQUIREMENT = 3;

export function VPChapterOpsDashboard() {
  const { data: members = [] } = useMembers();
  const { data: allAttendance = [] } = useAllAttendance();
  const { data: eopVisible } = useChapterSetting('eop_visible');
  const { data: eopDate } = useChapterSetting('eop_date');
  const { data: eopAttendanceData } = useChapterSetting('eop_attendance');
  const { data: eopBaseVoters } = useChapterSetting('eop_base_voters');
  const { data: eopCandidates = [] } = useRealtimeCandidates();
  const { data: eopVoteCounts } = useRealtimeVoteCounts();
  const updateSetting = useUpdateChapterSetting();
  const [selectedMember, setSelectedMember] = useState<{ userId: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [standingFilter, setStandingFilter] = useState<'all' | 'good' | 'at_risk'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | typeof categories[number]>('all');
  const [categoryMode, setCategoryMode] = useState<'has' | 'missing'>('missing');
  const [eopDateInput, setEopDateInput] = useState('');

  const currentEopDate = typeof eopDate === 'string' ? eopDate : '';

  const eopAttendance: Record<string, 'present' | 'excused' | 'unexcused'> = 
    (eopAttendanceData && typeof eopAttendanceData === 'object' && !Array.isArray(eopAttendanceData)) 
      ? (eopAttendanceData as Record<string, 'present' | 'excused' | 'unexcused'>) 
      : {};

  const activeMembers = useMemo(() => 
    members.filter(m => m.status === 'active' || m.status === 'new_member')
      .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)),
    [members]
  );

  const getEopStatus = (userId: string): 'present' | 'excused' | 'unexcused' =>
    eopAttendance[userId] ?? 'present';

  const presentCount = useMemo(() => 
    activeMembers.filter((member) => getEopStatus(member.user_id) === 'present').length,
    [activeMembers, eopAttendance]
  );

  const handleEopAttendanceChange = (userId: string, status: 'present' | 'excused' | 'unexcused') => {
    const current = getEopStatus(userId);
    const newAttendance = { ...eopAttendance };
    
    if (current === status) {
      if (status !== 'present') {
        delete newAttendance[userId];
      }
    } else {
      if (status === 'present') {
        delete newAttendance[userId];
      } else {
        newAttendance[userId] = status;
      }
    }
    
    const newPresentCount = activeMembers.filter((member) => (newAttendance[member.user_id] ?? 'present') === 'present').length;
    updateSetting.mutate({ key: 'eop_attendance', value: newAttendance });
    updateSetting.mutate({ key: 'eop_base_voters', value: newPresentCount });
  };

  const { data: allPoints = [] } = useQuery({
    queryKey: ['all-points'],
    queryFn: async () => {
      const { data, error } = await supabase.from('points_ledger').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allHours = [] } = useQuery({
    queryKey: ['all-service-hours'],
    queryFn: async () => {
      const { data, error } = await supabase.from('service_hours').select('*');
      if (error) throw error;
      return data;
    },
  });

  const totalEvents = events.length;
  const totalPresent = allAttendance.filter(a => a.status === 'present').length;
  const avgAttendance = totalEvents > 0 && members.length > 0
    ? Math.round((totalPresent / (totalEvents * members.length)) * 100)
    : 0;

  const memberRows = useMemo(() => {
    return members
      .filter(m => m.status === 'active' || m.status === 'new_member')
      .map(member => {
        const pts = allPoints.filter(p => p.user_id === member.user_id);
        const byCategory: Record<string, number> = {};
        categories.forEach(c => {
          byCategory[c] = pts.filter(p => p.category === c).reduce((s, p) => s + p.points, 0);
        });
        const totalPts = pts.reduce((s, p) => s + p.points, 0);

        const hrs = allHours.filter(h => h.user_id === member.user_id);
        const verifiedHrs = hrs.filter(h => h.verified).reduce((s, h) => s + Number(h.hours), 0);
        const pendingHrs = hrs.filter(h => !h.verified).reduce((s, h) => s + Number(h.hours), 0);

        const memberAttendance = allAttendance.filter(a => a.user_id === member.user_id);
        const attended = memberAttendance.filter(a => a.status === 'present').length;
        const attendanceRate = totalEvents > 0 ? Math.round((attended / totalEvents) * 100) : 0;

        return {
          id: member.id,
          userId: member.user_id,
          name: `${member.first_name} ${member.last_name}`,
          status: member.status,
          totalPts,
          byCategory,
          verifiedHrs,
          pendingHrs,
          attended,
          totalEvents,
          attendanceRate,
          isGoodStanding: totalPts >= POINTS_REQUIREMENT && verifiedHrs >= SERVICE_HOURS_REQUIREMENT,
        };
      })
      .sort((a, b) => b.totalPts - a.totalPts);
  }, [members, allPoints, allHours, allAttendance, totalEvents]);

  const filteredRows = useMemo(() => {
    return memberRows.filter(row => {
      const matchesSearch = searchQuery === '' || row.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStanding = standingFilter === 'all' || (standingFilter === 'good' ? row.isGoodStanding : !row.isGoodStanding);
      const matchesCategory = categoryFilter === 'all' || (
        categoryMode === 'has'
          ? (row.byCategory[categoryFilter] || 0) > 0
          : (row.byCategory[categoryFilter] || 0) === 0
      );
      return matchesSearch && matchesStanding && matchesCategory;
    });
  }, [memberRows, searchQuery, standingFilter, categoryFilter, categoryMode]);

  const [eopAttSearch, setEopAttSearch] = useState('');

  const filteredEopMembers = useMemo(() => {
    if (!eopAttSearch) return activeMembers;
    return activeMembers.filter(m => 
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(eopAttSearch.toLowerCase())
    );
  }, [activeMembers, eopAttSearch]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">VP of Chapter Operations</h3>
        <p className="text-sm text-muted-foreground">Manage chapter operations, EOP, elections, and more</p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{activeMembers.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{avgAttendance}%</p>
              <p className="text-xs text-muted-foreground">Avg Attendance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{memberRows.filter(m => m.isGoodStanding).length}</p>
              <p className="text-xs text-muted-foreground">Good Standing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Sections */}
      <Tabs defaultValue="standings" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-10">
          <TabsTrigger value="standings" className="text-xs gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Standings</span>
          </TabsTrigger>
          <TabsTrigger value="eop" className="text-xs gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">EOP</span>
          </TabsTrigger>
          <TabsTrigger value="elections" className="text-xs gap-1.5">
            <Vote className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Elections</span>
          </TabsTrigger>
          <TabsTrigger value="games" className="text-xs gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Family Games</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Standings Tab */}
        <TabsContent value="standings" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={standingFilter} onValueChange={(v) => setStandingFilter(v as 'all' | 'good' | 'at_risk')}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Standing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="good">Good Standing</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Select value={categoryMode} onValueChange={(v) => setCategoryMode(v as 'has' | 'missing')}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="has">Has</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c === 'dei' ? 'DE&I' : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[900px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">Member</TableHead>
                        <TableHead className="text-center">Total Pts</TableHead>
                        {categories.map(c => (
                          <TableHead key={c} className="text-center capitalize text-xs">{c === 'dei' ? 'DE&I' : c}</TableHead>
                        ))}
                        <TableHead className="text-center">Verified Hrs</TableHead>
                        <TableHead className="text-center">Pending Hrs</TableHead>
                        <TableHead className="text-center">Attendance</TableHead>
                        <TableHead className="text-center">Standing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell
                            className="sticky left-0 bg-background z-10 font-medium text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => setSelectedMember({ userId: row.userId, name: row.name })}
                          >
                            {row.name}
                          </TableCell>
                          <TableCell className="text-center font-semibold">{row.totalPts}</TableCell>
                          {categories.map(c => (
                            <TableCell key={c} className="text-center text-sm text-muted-foreground">{row.byCategory[c] || 0}</TableCell>
                          ))}
                          <TableCell className="text-center text-sm">{row.verifiedHrs.toFixed(1)}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{row.pendingHrs.toFixed(1)}</TableCell>
                          <TableCell className="text-center text-sm">{row.attended}/{row.totalEvents} ({row.attendanceRate}%)</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={row.isGoodStanding ? 'default' : 'destructive'} className="text-xs">
                              {row.isGoodStanding ? 'Good' : 'At Risk'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Attendance Earners inside Standings */}
          <AttendanceEarnersManager />
        </TabsContent>

        {/* EOP Tab */}
        <TabsContent value="eop" className="mt-4 space-y-4">
          {/* EOP Visibility Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">EOP Tab Visible to Members</Label>
            </div>
            <Switch
              checked={!!eopVisible}
              onCheckedChange={(checked) => updateSetting.mutate({ key: 'eop_visible', value: checked })}
              disabled={updateSetting.isPending}
            />
          </div>
          {/* EOP Date */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                EOP Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  type="date"
                  value={eopDateInput || currentEopDate}
                  onChange={(e) => setEopDateInput(e.target.value)}
                  className="w-48 h-9"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const val = eopDateInput || currentEopDate;
                    if (val) {
                      updateSetting.mutate({ key: 'eop_date', value: val });
                      setEopDateInput('');
                      toast.success('EOP date saved');
                    }
                  }}
                  disabled={updateSetting.isPending}
                >
                  Save
                </Button>
                {currentEopDate && (
                  <span className="text-sm text-muted-foreground">
                    Set to: <strong>{format(new Date(currentEopDate + 'T00:00:00'), 'MMM d, yyyy')}</strong>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* EOP Attendance */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">EOP Attendance</CardTitle>
                <Badge variant="outline">{presentCount} Present (Base Number)</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mark members present at EOP. Present count automatically sets the base number for voting.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={eopAttSearch}
                  onChange={(e) => setEopAttSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <ScrollArea className="h-[400px] rounded-md border">
                <div className="space-y-1">
                  {filteredEopMembers.map((member) => {
                    const status = getEopStatus(member.user_id);
                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                      >
                        <span className="text-sm font-medium">
                          {member.last_name}, {member.first_name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant={status === 'present' ? 'default' : 'outline'}
                            size="sm"
                            className={`h-7 w-8 p-0 text-xs font-bold ${
                              status === 'present' 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                : ''
                            }`}
                            onClick={() => handleEopAttendanceChange(member.user_id, 'present')}
                          >
                            P
                          </Button>
                          <Button
                            variant={status === 'excused' ? 'default' : 'outline'}
                            size="sm"
                            className={`h-7 w-8 p-0 text-xs font-bold ${
                              status === 'excused' 
                                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                : ''
                            }`}
                            onClick={() => handleEopAttendanceChange(member.user_id, 'excused')}
                          >
                            E
                          </Button>
                          <Button
                            variant={status === 'unexcused' ? 'default' : 'outline'}
                            size="sm"
                            className={`h-7 w-8 p-0 text-xs font-bold ${
                              status === 'unexcused' 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : ''
                            }`}
                            onClick={() => handleEopAttendanceChange(member.user_id, 'unexcused')}
                          >
                            U
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* EOP Results */}
          {eopCandidates.length > 0 && (() => {
            const currentBase = typeof eopBaseVoters === 'number' ? eopBaseVoters : (typeof eopBaseVoters === 'string' ? parseInt(eopBaseVoters as string) : 0);
            const results = eopCandidates.map((c) => {
              const counts = eopVoteCounts?.[c.id];
              const yesVotes = counts?.yes || 0;
              const absentMembers: string[] = (c as any).absent_members || [];
              const eligibleVoters = Math.max(0, currentBase - absentMembers.length);
              const requiredYes = eligibleVoters > 0 ? Math.ceil(eligibleVoters * 0.8) : 0;
              const isApproved = eligibleVoters > 0 && yesVotes >= requiredYes;
              return { ...c, yesVotes, eligibleVoters, isApproved };
            });
            const approvedCount = results.filter(r => r.isApproved).length;
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    EOP Results ({approvedCount}/{eopCandidates.length} approved)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {results.map((c) => (
                    <div key={c.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${c.isApproved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <div className="flex items-center gap-2">
                        {c.isApproved ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        <span className="text-sm font-medium">{c.first_name} {c.last_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.yesVotes}/{c.eligibleVoters} yes ({c.eligibleVoters > 0 ? Math.round((c.yesVotes / c.eligibleVoters) * 100) : 0}%)
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        {/* Elections Tab */}
        <TabsContent value="elections" className="mt-4">
          <ElectionManager />
        </TabsContent>

        {/* Family Games Tab */}
        <TabsContent value="games" className="mt-4">
          <FamilyGamesManager />
        </TabsContent>

        {/* Settings Tab (Chair Positions + Attendance Earners config) */}
        <TabsContent value="settings" className="mt-4">
          <ChairPositionsManager />
        </TabsContent>
      </Tabs>

      {selectedMember && (
        <MemberStandingDetail
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
          userId={selectedMember.userId}
          memberName={selectedMember.name}
        />
      )}
    </div>
  );
}
