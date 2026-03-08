import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MemberStandingDetail } from './MemberStandingDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, CalendarCheck, Shield, Eye } from 'lucide-react';
import { useMembers } from '@/hooks/useMembers';
import { useAllAttendance } from '@/hooks/useAttendance';
import { useChapterSetting, useUpdateChapterSetting } from '@/hooks/useChapterSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const categories = ['chapter', 'rush', 'fundraising', 'service', 'brotherhood', 'professionalism', 'dei'] as const;
const POINTS_REQUIREMENT = 100;
const SERVICE_HOURS_REQUIREMENT = 10;

export function VPChapterOpsDashboard() {
  const { data: members = [] } = useMembers();
  const { data: allAttendance = [] } = useAllAttendance();
  const { data: eopVisible } = useChapterSetting('eop_visible');
  const updateSetting = useUpdateChapterSetting();
  const [selectedMember, setSelectedMember] = useState<{ userId: string; name: string } | null>(null);

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

  // Build member spreadsheet data
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">VP of Chapter Operations</h3>
        <p className="text-sm text-muted-foreground">Attendance, EOP, and member standing overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{members.filter(m => m.status === 'active' || m.status === 'new_member').length}</p>
              <p className="text-xs text-muted-foreground">Active Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgAttendance}%</p>
              <p className="text-xs text-muted-foreground">Avg Attendance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{memberRows.filter(m => m.isGoodStanding).length}</p>
              <p className="text-xs text-muted-foreground">Good Standing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">EOP Visible</p>
              <p className="text-xs text-muted-foreground">Toggle for all</p>
            </div>
            <Switch
              checked={!!eopVisible}
              onCheckedChange={(checked) => updateSetting.mutate({ key: 'eop_visible', value: checked })}
              disabled={updateSetting.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Member Points Spreadsheet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member Standing Spreadsheet</CardTitle>
        </CardHeader>
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
                  {memberRows.map((row) => (
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
