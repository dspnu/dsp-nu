import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, Plus, Trash2, Settings, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDuesConfig, useCreateDuesConfig, useUpdateDuesConfig, useDeleteDuesConfig,
  useDuesLateFees, useCreateLateFee, useDeleteLateFee,
  useDuesLineItems, useCreateLineItem, useDeleteLineItem,
  useDuesInstallments, useCreateInstallment, useUpdateInstallment,
  computeMemberBalance,
} from '@/hooks/useDuesConfig';

const currentSemester = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 7 ? `Fall ${year}` : `Spring ${year}`;
};

const STATUS_LABELS = ['active', 'new_member', 'inactive', 'alumni'] as const;

export function VPFinanceDashboard() {
  const { user } = useAuth();
  const { data: members = [] } = useMembers();
  const [semester, setSemester] = useState(currentSemester());

  const { data: configs = [] } = useDuesConfig(semester);
  const { data: lateFees = [] } = useDuesLateFees(semester);
  const { data: lineItems = [] } = useDuesLineItems(semester);
  const { data: installments = [] } = useDuesInstallments(semester);

  const createConfig = useCreateDuesConfig();
  const updateConfig = useUpdateDuesConfig();
  const deleteConfig = useDeleteDuesConfig();
  const createLateFee = useCreateLateFee();
  const deleteLateFee = useDeleteLateFee();
  const createLineItem = useCreateLineItem();
  const deleteLineItem = useDeleteLineItem();
  const createInstallment = useCreateInstallment();
  const updateInstallment = useUpdateInstallment();

  // Tier form
  const [tierOpen, setTierOpen] = useState(false);
  const [tierName, setTierName] = useState('');
  const [tierStatus, setTierStatus] = useState('active');
  const [tierAmount, setTierAmount] = useState('');

  // Late fee form
  const [lateFeeOpen, setLateFeeOpen] = useState(false);
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [lateFeeDeadline, setLateFeeDeadline] = useState('');
  const [lateFeeDesc, setLateFeeDesc] = useState('');

  // Payment/line item form
  const [payOpen, setPayOpen] = useState(false);
  const [payUserId, setPayUserId] = useState('');
  const [payType, setPayType] = useState('payment');
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');

  // Installment form
  const [installOpen, setInstallOpen] = useState(false);
  const [installUserId, setInstallUserId] = useState('');
  const [installCount, setInstallCount] = useState('2');
  const [installDates, setInstallDates] = useState<string[]>(['', '']);

  const activeMembers = members.filter(m => m.status === 'active' || m.status === 'new_member' || m.status === 'inactive');

  const memberBalances = useMemo(() => {
    return activeMembers.map(m => ({
      ...m,
      ...computeMemberBalance(m.user_id, m.status, configs, lineItems, lateFees),
    }));
  }, [activeMembers, configs, lineItems, lateFees]);

  const totalCollected = memberBalances.reduce((s, m) => s + m.totalPaid, 0);
  const totalOutstanding = memberBalances.reduce((s, m) => s + m.balance, 0);
  const paidCount = memberBalances.filter(m => m.status === 'paid').length;
  const partialCount = memberBalances.filter(m => m.status === 'partial').length;

  const handleCreateTier = (e: React.FormEvent) => {
    e.preventDefault();
    createConfig.mutate({ tier_name: tierName, member_status: tierStatus, amount: parseFloat(tierAmount), semester }, {
      onSuccess: () => { setTierOpen(false); setTierName(''); setTierAmount(''); },
    });
  };

  const handleCreateLateFee = (e: React.FormEvent) => {
    e.preventDefault();
    createLateFee.mutate({ semester, fee_amount: parseFloat(lateFeeAmount), deadline: lateFeeDeadline, description: lateFeeDesc || undefined }, {
      onSuccess: () => { setLateFeeOpen(false); setLateFeeAmount(''); setLateFeeDeadline(''); setLateFeeDesc(''); },
    });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createLineItem.mutate({ user_id: payUserId, semester, type: payType, amount: parseFloat(payAmount), description: payDesc || undefined, created_by: user.id }, {
      onSuccess: () => { setPayOpen(false); setPayUserId(''); setPayAmount(''); setPayDesc(''); setPayType('payment'); },
    });
  };

  const handleCreateInstallments = (e: React.FormEvent) => {
    e.preventDefault();
    const member = activeMembers.find(m => m.user_id === installUserId);
    if (!member) return;
    const bal = computeMemberBalance(member.user_id, member.status, configs, lineItems, lateFees);
    const count = parseInt(installCount);
    const perInstall = Math.ceil(bal.balance / count);
    
    installDates.slice(0, count).forEach((date, i) => {
      if (date) {
        createInstallment.mutate({
          user_id: installUserId,
          semester,
          installment_number: i + 1,
          amount: i === count - 1 ? bal.balance - perInstall * (count - 1) : perInstall,
          due_date: date,
        });
      }
    });
    setInstallOpen(false);
    setInstallUserId('');
    setInstallDates(['', '']);
  };

  const statusBadge = (status: 'paid' | 'partial' | 'unpaid') => {
    if (status === 'paid') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    if (status === 'partial') return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="h-3 w-3 mr-1" />Unpaid</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">VP Finance</h3>
          <p className="text-sm text-muted-foreground">Dues management, tiers, payments, and balances</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Semester:</Label>
          <Input value={semester} onChange={e => setSemester(e.target.value)} className="w-32" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">${totalCollected.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">${totalOutstanding.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Outstanding</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{paidCount}</p>
              <p className="text-xs text-muted-foreground">Fully Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{partialCount}</p>
              <p className="text-xs text-muted-foreground">Partial</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Member Balances</TabsTrigger>
          <TabsTrigger value="config">Tier Config</TabsTrigger>
          <TabsTrigger value="fees">Late Fees</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        {/* Member Balances */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />Record Payment / Adjustment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Payment or Adjustment</DialogTitle></DialogHeader>
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Member</Label>
                    <Select value={payUserId} onValueChange={setPayUserId}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        {activeMembers.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.first_name} {m.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={payType} onValueChange={setPayType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="credit">Credit / Discount</SelectItem>
                          <SelectItem value="fine">Fine</SelectItem>
                          <SelectItem value="late_fee">Late Fee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input type="number" step="0.01" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea value={payDesc} onChange={e => setPayDesc(e.target.value)} placeholder="e.g. Venmo payment, senior discount..." />
                  </div>
                  <Button type="submit" className="w-full" disabled={createLineItem.isPending}>
                    {createLineItem.isPending ? 'Recording...' : 'Record'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={installOpen} onOpenChange={setInstallOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Settings className="h-4 w-4" />Set Up Installments</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Payment Plan</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateInstallments} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Member</Label>
                    <Select value={installUserId} onValueChange={setInstallUserId}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        {activeMembers.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.first_name} {m.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Installments</Label>
                    <Select value={installCount} onValueChange={v => { setInstallCount(v); setInstallDates(Array(parseInt(v)).fill('')); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {installDates.map((d, i) => (
                    <div key={i} className="space-y-1">
                      <Label>Installment {i + 1} Due Date</Label>
                      <Input type="date" value={d} onChange={e => { const nd = [...installDates]; nd[i] = e.target.value; setInstallDates(nd); }} required />
                    </div>
                  ))}
                  <Button type="submit" className="w-full" disabled={createInstallment.isPending}>Create Plan</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Owed</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberBalances.map(m => (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-medium">{m.first_name} {m.last_name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{m.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.tierName}</TableCell>
                      <TableCell className="text-right">${(m.totalOwed + m.totalFines).toFixed(2)}</TableCell>
                      <TableCell className="text-right">${m.totalPaid.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">${m.balance.toFixed(2)}</TableCell>
                      <TableCell>{statusBadge(m.status as 'paid' | 'partial' | 'unpaid')}</TableCell>
                    </TableRow>
                  ))}
                  {memberBalances.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No members found. Set up tiers first.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Installments section */}
          {installments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Active Payment Plans</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Installment</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.map(inst => {
                      const m = members.find(m => m.user_id === inst.user_id);
                      return (
                        <TableRow key={inst.id}>
                          <TableCell>{m ? `${m.first_name} ${m.last_name}` : 'Unknown'}</TableCell>
                          <TableCell>#{inst.installment_number}</TableCell>
                          <TableCell>${Number(inst.amount).toFixed(2)}</TableCell>
                          <TableCell>{format(new Date(inst.due_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {inst.paid ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => updateInstallment.mutate({ id: inst.id, paid: true })}>
                                Mark Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tier Config */}
        <TabsContent value="config" className="space-y-4">
          <Dialog open={tierOpen} onOpenChange={setTierOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Tier</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Dues Tier</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateTier} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tier Name</Label>
                  <Input value={tierName} onChange={e => setTierName(e.target.value)} placeholder="e.g. Senior Active" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Member Status</Label>
                    <Select value={tierStatus} onValueChange={setTierStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_LABELS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input type="number" step="0.01" min="0" value={tierAmount} onChange={e => setTierAmount(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createConfig.isPending}>Create Tier</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier Name</TableHead>
                    <TableHead>Member Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.tier_name}</TableCell>
                      <TableCell className="capitalize">{c.member_status.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">${Number(c.amount).toFixed(2)}</TableCell>
                      <TableCell>{c.semester}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => deleteConfig.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {configs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No tiers configured for {semester}. Add one above.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Late Fees */}
        <TabsContent value="fees" className="space-y-4">
          <Dialog open={lateFeeOpen} onOpenChange={setLateFeeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Late Fee</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Late Fee</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateLateFee} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fee Amount ($)</Label>
                    <Input type="number" step="0.01" min="0" value={lateFeeAmount} onChange={e => setLateFeeAmount(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    <Input type="datetime-local" value={lateFeeDeadline} onChange={e => setLateFeeDeadline(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={lateFeeDesc} onChange={e => setLateFeeDesc(e.target.value)} placeholder="e.g. $25 late fee after Oct 15" />
                </div>
                <Button type="submit" className="w-full" disabled={createLateFee.isPending}>Add Late Fee</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lateFees.map(f => (
                    <TableRow key={f.id}>
                      <TableCell>{f.description || 'Late fee'}</TableCell>
                      <TableCell className="text-right">${Number(f.fee_amount).toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(f.deadline), 'MMM d, yyyy h:mm a')}</TableCell>
                      <TableCell>
                        {new Date(f.deadline) < new Date() ? (
                          <Badge variant="destructive">Active</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => deleteLateFee.mutate(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lateFees.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No late fees configured.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map(li => {
                    const m = members.find(m => m.user_id === li.user_id);
                    return (
                      <TableRow key={li.id}>
                        <TableCell className="font-medium">{m ? `${m.first_name} ${m.last_name}` : 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{li.type.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${li.type === 'payment' || li.type === 'credit' ? 'text-emerald-600' : 'text-destructive'}`}>
                          {li.type === 'payment' || li.type === 'credit' ? '-' : '+'}${Number(li.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{li.description || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(li.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => deleteLineItem.mutate(li.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {lineItems.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions recorded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
