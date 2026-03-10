import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Save, Download } from 'lucide-react';
import { useMembers } from '@/hooks/useMembers';
import { useEventAttendance, useSaveAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { useIsVPChapterOps } from '@/hooks/useEOPRealtime';
import { Tables } from '@/integrations/supabase/types';
import { exportToCSV } from '@/lib/csv';

type Event = Tables<'events'>;

type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'none';

interface ManualAttendanceProps {
  event: Event;
}

export function ManualAttendance({ event }: ManualAttendanceProps) {
  const [search, setSearch] = useState('');
  const { data: members } = useMembers();
  const { data: existingAttendance } = useEventAttendance(event.id);
  const saveAttendance = useSaveAttendance();
  const { user, isAdminOrOfficer } = useAuth();
  const { isVPChapterOps } = useIsVPChapterOps();

  const isChapterEvent = event.category === 'chapter';
  const isExecEvent = event.category === 'exec';
  
  // Permission check: chapter events = VP of Chapter Operations only, others = any exec
  const canRecord = isChapterEvent ? isVPChapterOps : isAdminOrOfficer;

  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});

  const sortedMembers = useMemo(() => {
    let filtered = members?.filter(m => m.status === 'active' || m.status === 'new_member') || [];
    
    // For exec events, only show members with positions
    if (isExecEvent) {
      filtered = filtered.filter(m => (m.positions?.length ?? 0) > 0);
    }
    
    return filtered.sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [members, isExecEvent]);

  const mapAttendanceStatus = (record: any): AttendanceStatus => {
    if (record.status === 'present' || record.status === 'excused' || record.status === 'unexcused') {
      return record.status;
    }

    return record.is_excused ? 'excused' : 'present';
  };

  useEffect(() => {
    if (!existingAttendance || !sortedMembers.length) return;

    const map: Record<string, AttendanceStatus> = {};

    existingAttendance.forEach((record: any) => {
      map[record.user_id] = mapAttendanceStatus(record);
    });

    if (isChapterEvent) {
      sortedMembers.forEach(member => {
        if (!map[member.user_id]) {
          map[member.user_id] = 'present';
        }
      });
    }

    setStatusMap(map);
  }, [existingAttendance, sortedMembers, isChapterEvent]);

  const filteredMembers = sortedMembers.filter(member => {
    const name = `${member.first_name} ${member.last_name}`.toLowerCase();
    return search === '' || name.includes(search.toLowerCase());
  });

  const setMemberStatus = (userId: string, status: AttendanceStatus) => {
    setStatusMap(prev => ({ ...prev, [userId]: status }));
  };

  const togglePresent = (userId: string) => {
    if (isChapterEvent) return; // For chapter events, use the three buttons
    setStatusMap(prev => ({
      ...prev,
      [userId]: prev[userId] === 'present' ? 'none' : 'present',
    }));
  };

  const handleSave = () => {
    if (!user) return;
    const records = sortedMembers
      .map(member => {
        const status = statusMap[member.user_id] || (isChapterEvent ? 'present' : 'none');
        return {
          user_id: member.user_id,
          status,
        };
      })
      .filter(record => record.status !== 'none')
      .map(record => ({
        ...record,
        status: record.status as 'present' | 'excused' | 'unexcused',
      }));

    saveAttendance.mutate({ eventId: event.id, records, checkedInBy: user.id });
  };

  const presentCount = Object.values(statusMap).filter(s => s === 'present').length;
  const excusedCount = Object.values(statusMap).filter(s => s === 'excused').length;

  const handleExport = () => {
    const exportData = sortedMembers.map(m => ({
      Name: `${m.first_name} ${m.last_name}`,
      Email: m.email,
      Status: statusMap[m.user_id] || (isChapterEvent ? 'present' : 'absent'),
    }));
    exportToCSV(exportData, `attendance-${event.title.replace(/\s+/g, '-').toLowerCase()}`);
  };

  if (!canRecord) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {isChapterEvent
            ? 'Only the VP of Chapter Operations can record chapter meeting attendance.'
            : 'Only executive board members can record attendance.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{presentCount}</span> present
          {isChapterEvent && (
            <>
              {' · '}
              <span className="font-medium text-foreground">{excusedCount}</span> excused
            </>
          )}
          {' · '}
          <span>{sortedMembers.length} total</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saveAttendance.isPending} className="gap-1">
            <Save className="h-3.5 w-3.5" />
            {saveAttendance.isPending ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {event.points_value > 0 && (
        <div className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          ✨ Members marked Present will automatically receive <strong>{event.points_value} {event.category} point{event.points_value !== 1 ? 's' : ''}</strong>.
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-1">
          {filteredMembers.map((member) => {
            const status = statusMap[member.user_id] || (isChapterEvent ? 'present' : 'none');

            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                  status === 'present' ? 'bg-emerald-500/5 border-emerald-500/20' :
                  status === 'excused' ? 'bg-amber-500/5 border-amber-500/20' :
                  status === 'unexcused' ? 'bg-red-500/5 border-red-500/20' :
                  'border-border'
                }`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={member.avatar_url || ''} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.last_name}, {member.first_name}
                  </p>
                </div>

                {isChapterEvent ? (
                  // Chapter meeting: Present / Excused / Unexcused
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant={status === 'present' ? 'default' : 'outline'}
                      className={`h-7 text-xs px-2 ${status === 'present' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                      onClick={() => setMemberStatus(member.user_id, 'present')}
                    >
                      P
                    </Button>
                    <Button
                      size="sm"
                      variant={status === 'excused' ? 'default' : 'outline'}
                      className={`h-7 text-xs px-2 ${status === 'excused' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                      onClick={() => setMemberStatus(member.user_id, 'excused')}
                    >
                      E
                    </Button>
                    <Button
                      size="sm"
                      variant={status === 'unexcused' ? 'default' : 'outline'}
                      className={`h-7 text-xs px-2 ${status === 'unexcused' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                      onClick={() => setMemberStatus(member.user_id, 'unexcused')}
                    >
                      U
                    </Button>
                  </div>
                ) : (
                  // Non-chapter event: just toggle Present
                  <Button
                    size="sm"
                    variant={status === 'present' ? 'default' : 'outline'}
                    className={`h-7 text-xs px-3 ${status === 'present' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    onClick={() => togglePresent(member.user_id)}
                  >
                    {status === 'present' ? '✓ Present' : 'Mark Present'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {isChapterEvent && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span><strong>P</strong> = Present</span>
          <span><strong>E</strong> = Excused</span>
          <span><strong>U</strong> = Unexcused</span>
        </div>
      )}
    </div>
  );
}
