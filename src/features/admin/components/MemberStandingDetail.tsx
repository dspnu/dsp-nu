import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MemberStandingDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  memberName: string;
}

export function MemberStandingDetail({ open, onOpenChange, userId, memberName }: MemberStandingDetailProps) {
  const { data: points = [] } = useQuery({
    queryKey: ['member-points-detail', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*, events(title, category, start_time)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['member-attendance-detail', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, events(title, category, start_time, points_value)')
        .eq('user_id', userId)
        .order('checked_in_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId,
  });

  const { data: serviceHours = [] } = useQuery({
    queryKey: ['member-service-detail', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_hours')
        .select('*')
        .eq('user_id', userId)
        .order('service_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{memberName} — Standing Detail</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="points" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="points" className="flex-1">Points ({points.length})</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1">Attendance ({attendance.length})</TabsTrigger>
            <TabsTrigger value="service" className="flex-1">Service ({serviceHours.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="points">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {points.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No points recorded</TableCell></TableRow>
                  )}
                  {points.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{format(new Date(p.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-sm">{p.reason}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {p.category === 'dei' ? 'DE&I' : p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{p.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="attendance">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No attendance records</TableCell></TableRow>
                  )}
                  {attendance.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        {a.events?.start_time ? format(new Date(a.events.start_time), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{a.events?.title ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {a.events?.category === 'dei' ? 'DE&I' : a.events?.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={a.status === 'present' ? 'default' : a.is_excused ? 'secondary' : 'destructive'} className="text-xs capitalize">
                          {a.status === 'present' ? 'Present' : a.is_excused ? 'Excused' : 'Absent'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="service">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-center">Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceHours.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No service hours</TableCell></TableRow>
                  )}
                  {serviceHours.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm">{format(new Date(h.service_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-sm">{h.description}</TableCell>
                      <TableCell className="text-right font-medium">{Number(h.hours).toFixed(1)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={h.verified ? 'default' : 'secondary'} className="text-xs">
                          {h.verified ? 'Yes' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
