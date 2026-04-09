import { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Users, DollarSign, Shield, TrendingUp } from 'lucide-react';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useAllDues, useRecordDues } from '@/features/dues/hooks/useDues';
import { useAllServiceHours } from '@/features/service-hours/hooks/useServiceHours';
import { GrantPointsDialog } from '@/core/points/GrantPointsDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';
import { org } from '@/config/org';
import { DataExportCard } from '@/features/admin/components/DataExportCard';

const POINTS_REQUIREMENT = org.standing.minPoints;
const SERVICE_HOURS_REQUIREMENT = 10;

export function PresidentDashboard() {
  const { user } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: allDues = [] } = useAllDues();
  const { data: allHours = [] } = useAllServiceHours();
  const recordDues = useRecordDues();

  const [duesOpen, setDuesOpen] = useState(false);
  const [duesUserId, setDuesUserId] = useState('');
  const [duesAmount, setDuesAmount] = useState('');
  const [duesSemester, setDuesSemester] = useState('');
  const [duesNotes, setDuesNotes] = useState('');

  const { data: allPoints = [] } = useQuery({
    queryKey: ['all-points'],
    queryFn: async () => {
      const { data, error } = await supabase.from('points_ledger').select('*');
      if (error) throw error;
      return data;
    },
  });

  const activeMembers = members.filter(m => m.status === 'active' || m.status === 'new_member');
  const totalDuesCollected = allDues.reduce((s, d) => s + Number(d.amount), 0);

  const goodStandingCount = useMemo(() => {
    return activeMembers.filter(m => {
      const pts = allPoints.filter(p => p.user_id === m.user_id).reduce((s, p) => s + p.points, 0);
      const hrs = allHours.filter(h => h.user_id === m.user_id && h.verified).reduce((s, h) => s + Number(h.hours), 0);
      return pts >= POINTS_REQUIREMENT && hrs >= SERVICE_HOURS_REQUIREMENT;
    }).length;
  }, [activeMembers, allPoints, allHours]);

  const handleRecordDues = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    recordDues.mutate({
      user_id: duesUserId,
      amount: parseFloat(duesAmount),
      semester: duesSemester,
      notes: duesNotes || null,
      created_by: user.id,
    }, {
      onSuccess: () => {
        setDuesOpen(false);
        setDuesUserId(''); setDuesAmount(''); setDuesSemester(''); setDuesNotes('');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">President</h3>
        <p className="text-sm text-muted-foreground">Chapter overview, dues, and quick actions</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeMembers.length}</p>
              <p className="text-xs text-muted-foreground">Active Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{goodStandingCount}/{activeMembers.length}</p>
              <p className="text-xs text-muted-foreground">Good Standing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">${totalDuesCollected.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Dues Collected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allDues.length}</p>
              <p className="text-xs text-muted-foreground">Dues Payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <Label>Member</Label>
                    <Select value={duesUserId} onValueChange={setDuesUserId}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.first_name} {m.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input type="number" step="0.01" min="0" value={duesAmount} onChange={(e) => setDuesAmount(e.target.value)} placeholder="100.00" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Semester</Label>
                      <Input value={duesSemester} onChange={(e) => setDuesSemester(e.target.value)} placeholder="Fall 2024" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea value={duesNotes} onChange={(e) => setDuesNotes(e.target.value)} placeholder="Payment notes..." />
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

      {/* Recent Dues */}
      {allDues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Recent Dues Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                {allDues.slice(0, 10).map((payment) => {
                  const m = members.find(m => m.user_id === payment.user_id);
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{m ? `${m.first_name} ${m.last_name}` : 'Unknown'}</TableCell>
                      <TableCell>${Number(payment.amount).toFixed(2)}</TableCell>
                      <TableCell>{payment.semester}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(payment.paid_at), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <DataExportCard />
    </div>
  );
}
