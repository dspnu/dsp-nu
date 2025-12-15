import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEventAttendance, useUpdateExcuse } from '@/hooks/useAttendance';
import { Download } from 'lucide-react';
import { exportToCSV } from '@/lib/csv';

interface AttendanceListProps {
  eventId: string;
  eventTitle: string;
}

export function AttendanceList({ eventId, eventTitle }: AttendanceListProps) {
  const { data: attendance, isLoading } = useEventAttendance(eventId);
  const updateExcuse = useUpdateExcuse();

  const handleExport = () => {
    if (!attendance) return;
    
    const exportData = attendance.map((a: any) => ({
      Name: `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`,
      Email: a.profile?.email || '',
      'Checked In At': format(new Date(a.checked_in_at), 'yyyy-MM-dd HH:mm'),
      Excused: a.is_excused ? 'Yes' : 'No',
      Notes: a.excuse_notes || '',
    }));
    
    exportToCSV(exportData, `attendance-${eventTitle.replace(/\s+/g, '-').toLowerCase()}`);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading attendance...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          Attendance ({attendance?.length || 0})
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {!attendance?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No check-ins yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Excused</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={record.profile?.avatar_url || ''} />
                        <AvatarFallback>
                          {record.profile?.first_name?.[0]}{record.profile?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {record.profile?.first_name} {record.profile?.last_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(record.checked_in_at), 'h:mm a')}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={record.is_excused}
                      onCheckedChange={(checked) => 
                        updateExcuse.mutate({ attendanceId: record.id, isExcused: checked })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
