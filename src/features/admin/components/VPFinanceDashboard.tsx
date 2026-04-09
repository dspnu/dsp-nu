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
import {
  DollarSign,
  Users,
  Plus,
  Trash2,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  CalendarRange,
  Scale,
  LayoutGrid,
} from 'lucide-react';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useAuth } from '@/core/auth/AuthContext';
import { useChapterSetting, useUpdateChapterSetting } from '@/hooks/useChapterSettings';
import { Switch } from '@/components/ui/switch';
import {
  useDuesConfig,
  useCreateDuesConfig,
  useDeleteDuesConfig,
  useDuesLateFees,
  useCreateLateFee,
  useDeleteLateFee,
  useDuesLineItems,
  useCreateLineItem,
  useDeleteLineItem,
  useDuesInstallments,
  useCreateInstallment,
  useUpdateInstallment,
  computeMemberBalance,
} from '@/features/dues/hooks/useDuesConfig';
import { FinanceScheduleCalendar, type FinanceScheduleItem } from '@/features/dues/components/FinanceScheduleCalendar';

const currentSemester = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 7 ? `Fall ${year}` : `Spring ${year}`;
};

const STATUS_LABELS = ['active', 'new_member', 'inactive', 'alumni'] as const;

const DUES_LOG_TYPES = ['payment', 'credit'] as const;
const FINE_LOG_TYPES = ['fine', 'late_fee'] as const;

const DUES_HOME_WIDGET_KEY = 'dues_home_widget_visible';

export function VPFinanceDashboard() {
  const { user } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: duesHomeWidgetVisible } = useChapterSetting(DUES_HOME_WIDGET_KEY, { whenMissing: true });
  const updateChapterSetting = useUpdateChapterSetting();
  const [semester, setSemester] = useState(currentSemester());

  const { data: configs = [] } = useDuesConfig(semester);
  const { data: lateFees = [] } = useDuesLateFees(semester);
  const { data: lineItems = [] } = useDuesLineItems(semester);
  const { data: installments = [] } = useDuesInstallments(semester);

  const createConfig = useCreateDuesConfig();
  const deleteConfig = useDeleteDuesConfig();
  const createLateFee = useCreateLateFee();
  const deleteLateFee = useDeleteLateFee();
  const createLineItem = useCreateLineItem();
  const deleteLineItem = useDeleteLineItem();
  const createInstallment = useCreateInstallment();
  const updateInstallment = useUpdateInstallment();

  const [tierOpen, setTierOpen] = useState(false);
  const [tierName, setTierName] = useState('');
  const [tierStatus, setTierStatus] = useState('active');
  const [tierAmount, setTierAmount] = useState('');

  const [lateFeeOpen, setLateFeeOpen] = useState(false);
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [lateFeeDeadline, setLateFeeDeadline] = useState('');
  const [lateFeeDesc, setLateFeeDesc] = useState('');

  const [payOpen, setPayOpen] = useState(false);
  const [payUserId, setPayUserId] = useState('');
  const [payType, setPayType] = useState<'payment' | 'credit'>('payment');
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');

  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeUserId, setChargeUserId] = useState('');
  const [chargeType, setChargeType] = useState<'fine' | 'late_fee'>('fine');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDesc, setChargeDesc] = useState('');

  const [installOpen, setInstallOpen] = useState(false);
  const [installUserId, setInstallUserId] = useState('');
  const [installCount, setInstallCount] = useState('2');
  const [installDates, setInstallDates] = useState<string[]>(['', '']);

  const activeMembers = members.filter(
    (m) => m.status === 'active' || m.status === 'new_member' || m.status === 'inactive'
  );

  const memberBalances = useMemo(() => {
    return activeMembers.map((m) => ({
      ...m,
      ...computeMemberBalance(m.user_id, m.status, configs, lineItems, lateFees),
    }));
  }, [activeMembers, configs, lineItems, lateFees]);

  const duesLogItems = useMemo(
    () => lineItems.filter((li) => DUES_LOG_TYPES.includes(li.type as (typeof DUES_LOG_TYPES)[number])),
    [lineItems]
  );

  const fineLogItems = useMemo(
    () => lineItems.filter((li) => FINE_LOG_TYPES.includes(li.type as (typeof FINE_LOG_TYPES)[number])),
    [lineItems]
  );

  const scheduleItems: FinanceScheduleItem[] = useMemo(() => {
    const name = (uid: string) => {
      const m = members.find((x) => x.user_id === uid);
      return m ? `${m.first_name} ${m.last_name}` : 'Member';
    };
    const fromInstallments = installments.map((i) => ({
      id: `inst-${i.id}`,
      title: `${name(i.user_id)} · #${i.installment_number}`,
      date: i.due_date,
      variant: 'installment' as const,
      detail: `$${Number(i.amount).toFixed(2)}${i.paid ? ' · paid' : ''}`,
    }));
    const fromLateFees = lateFees.map((f) => ({
      id: `lf-${f.id}`,
      title: f.description?.trim() || 'Late fee deadline',
      date: f.deadline,
      variant: 'late_fee' as const,
      detail: `$${Number(f.fee_amount).toFixed(2)}`,
    }));
    return [...fromInstallments, ...fromLateFees];
  }, [installments, lateFees, members]);

  const totalCollected = memberBalances.reduce((s, m) => s + m.totalPaid, 0);
  const totalOutstanding = memberBalances.reduce((s, m) => s + m.balance, 0);
  const paidCount = memberBalances.filter((m) => m.status === 'paid').length;
  const partialCount = memberBalances.filter((m) => m.status === 'partial').length;

  const handleCreateTier = (e: React.FormEvent) => {
    e.preventDefault();
    createConfig.mutate(
      {
        tier_name: tierName,
        member_status: tierStatus,
        amount: parseFloat(tierAmount),
        semester,
      },
      {
        onSuccess: () => {
          setTierOpen(false);
          setTierName('');
          setTierAmount('');
        },
      }
    );
  };

  const handleCreateLateFee = (e: React.FormEvent) => {
    e.preventDefault();
    createLateFee.mutate(
      {
        semester,
        fee_amount: parseFloat(lateFeeAmount),
        deadline: lateFeeDeadline,
        description: lateFeeDesc || undefined,
      },
      {
        onSuccess: () => {
          setLateFeeOpen(false);
          setLateFeeAmount('');
          setLateFeeDeadline('');
          setLateFeeDesc('');
        },
      }
    );
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createLineItem.mutate(
      {
        user_id: payUserId,
        semester,
        type: payType,
        amount: parseFloat(payAmount),
        description: payDesc || undefined,
        created_by: user.id,
      },
      {
        onSuccess: () => {
          setPayOpen(false);
          setPayUserId('');
          setPayAmount('');
          setPayDesc('');
          setPayType('payment');
        },
      }
    );
  };

  const handleRecordCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    createLineItem.mutate(
      {
        user_id: chargeUserId,
        semester,
        type: chargeType,
        amount: parseFloat(chargeAmount),
        description: chargeDesc || undefined,
        created_by: user.id,
      },
      {
        onSuccess: () => {
          setChargeOpen(false);
          setChargeUserId('');
          setChargeAmount('');
          setChargeDesc('');
          setChargeType('fine');
        },
      }
    );
  };

  const handleCreateInstallments = (e: React.FormEvent) => {
    e.preventDefault();
    const member = activeMembers.find((m) => m.user_id === installUserId);
    if (!member) return;
    const bal = computeMemberBalance(member.user_id, member.status, configs, lineItems, lateFees);
    const count = parseInt(installCount, 10);
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
    if (status === 'paid')
      return (
        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Paid
        </Badge>
      );
    if (status === 'partial')
      return (
        <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">
          <Clock className="mr-1 h-3 w-3" />
          Partial
        </Badge>
      );
    return (
      <Badge className="border-destructive/20 bg-destructive/10 text-destructive">
        <AlertCircle className="mr-1 h-3 w-3" />
        Unpaid
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">VP Finance</h3>
          <p className="text-sm text-muted-foreground">
            Dues, fines, and schedules — use the tab that matches what you are managing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Semester</Label>
          <Input value={semester} onChange={(e) => setSemester(e.target.value)} className="w-36" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <div className="flex min-w-0 items-center gap-2">
          <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <Label className="text-sm font-medium">Dues card on Home</Label>
            <p className="text-xs text-muted-foreground">
              When off, members do not see the dues balance / installment reminder on the home screen.
            </p>
          </div>
        </div>
        <Switch
          checked={!!duesHomeWidgetVisible}
          onCheckedChange={(checked) =>
            updateChapterSetting.mutate({ key: DUES_HOME_WIDGET_KEY, value: checked })
          }
          disabled={updateChapterSetting.isPending}
        />
      </div>

      <Tabs defaultValue="dues" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="dues" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            Dues
          </TabsTrigger>
          <TabsTrigger value="fines" className="gap-1.5">
            <Scale className="h-4 w-4" />
            Fines
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <CalendarRange className="h-4 w-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* ——— Dues ——— */}
        <TabsContent value="dues" className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalCollected.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Collected</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalOutstanding.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{paidCount}</p>
                  <p className="text-xs text-muted-foreground">Fully paid</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{partialCount}</p>
                  <p className="text-xs text-muted-foreground">Partial</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Record payment or credit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record payment or credit</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Use this for payments and discounts only. Fines and late-fee charges belong under the Fines tab.
                </p>
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Member</Label>
                    <Select value={payUserId} onValueChange={setPayUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeMembers.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.first_name} {m.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={payType} onValueChange={(v) => setPayType(v as 'payment' | 'credit')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="credit">Credit / discount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={payDesc}
                      onChange={(e) => setPayDesc(e.target.value)}
                      placeholder="e.g. Venmo payment, senior discount…"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createLineItem.isPending}>
                    {createLineItem.isPending ? 'Recording…' : 'Record'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={installOpen} onOpenChange={setInstallOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Set up installments
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create payment plan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateInstallments} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Member</Label>
                    <Select value={installUserId} onValueChange={setInstallUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeMembers.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.first_name} {m.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Number of installments</Label>
                    <Select
                      value={installCount}
                      onValueChange={(v) => {
                        setInstallCount(v);
                        setInstallDates(Array(parseInt(v, 10)).fill(''));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {installDates.map((d, i) => (
                    <div key={i} className="space-y-1">
                      <Label>Installment {i + 1} due date</Label>
                      <Input
                        type="date"
                        value={d}
                        onChange={(e) => {
                          const nd = [...installDates];
                          nd[i] = e.target.value;
                          setInstallDates(nd);
                        }}
                        required
                      />
                    </div>
                  ))}
                  <Button type="submit" className="w-full" disabled={createInstallment.isPending}>
                    Create plan
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="members" className="space-y-4">
            <TabsList>
              <TabsTrigger value="members">Member balances</TabsTrigger>
              <TabsTrigger value="tiers">Tier configuration</TabsTrigger>
              <TabsTrigger value="payments">Payment log</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4">
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
                      {memberBalances.map((m) => (
                        <TableRow key={m.user_id}>
                          <TableCell className="font-medium">
                            {m.first_name} {m.last_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {m.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.tierName}</TableCell>
                          <TableCell className="text-right">
                            ${(m.totalOwed + m.totalFines).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">${m.totalPaid.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">${m.balance.toFixed(2)}</TableCell>
                          <TableCell>{statusBadge(m.status as 'paid' | 'partial' | 'unpaid')}</TableCell>
                        </TableRow>
                      ))}
                      {memberBalances.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                            No members found. Configure tiers first.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {installments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Active payment plans</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Installment</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installments.map((inst) => {
                          const m = members.find((x) => x.user_id === inst.user_id);
                          return (
                            <TableRow key={inst.id}>
                              <TableCell>{m ? `${m.first_name} ${m.last_name}` : 'Unknown'}</TableCell>
                              <TableCell>#{inst.installment_number}</TableCell>
                              <TableCell>${Number(inst.amount).toFixed(2)}</TableCell>
                              <TableCell>{format(new Date(inst.due_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>
                                {inst.paid ? (
                                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                                    Paid
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateInstallment.mutate({ id: inst.id, paid: true })}
                                  >
                                    Mark paid
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

            <TabsContent value="tiers" className="space-y-4">
              <Dialog open={tierOpen} onOpenChange={setTierOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add tier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add dues tier</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTier} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tier name</Label>
                      <Input
                        value={tierName}
                        onChange={(e) => setTierName(e.target.value)}
                        placeholder="e.g. Senior active"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Member status</Label>
                        <Select value={tierStatus} onValueChange={setTierStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_LABELS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Amount ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tierAmount}
                          onChange={(e) => setTierAmount(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createConfig.isPending}>
                      Create tier
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier name</TableHead>
                        <TableHead>Member status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.tier_name}</TableCell>
                          <TableCell className="capitalize">{c.member_status.replace('_', ' ')}</TableCell>
                          <TableCell className="text-right">${Number(c.amount).toFixed(2)}</TableCell>
                          <TableCell>{c.semester}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => deleteConfig.mutate(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {configs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                            No tiers for {semester}. Add one above.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Payments and credits only. Fine charges are listed under Fines → Charge log.
              </p>
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
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duesLogItems.map((li) => {
                        const m = members.find((x) => x.user_id === li.user_id);
                        return (
                          <TableRow key={li.id}>
                            <TableCell className="font-medium">
                              {m ? `${m.first_name} ${m.last_name}` : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {li.type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                li.type === 'payment' || li.type === 'credit'
                                  ? 'text-emerald-600'
                                  : 'text-destructive'
                              }`}
                            >
                              {li.type === 'payment' || li.type === 'credit' ? '-' : '+'}$
                              {Number(li.amount).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{li.description || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(li.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => deleteLineItem.mutate(li.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {duesLogItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No payments or credits recorded.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ——— Fines ——— */}
        <TabsContent value="fines" className="space-y-6">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Late fee rules</strong> define when automatic late fees apply.
            <strong className="text-foreground"> Charges</strong> record one-off fines or manual late-fee line items
            to a member&apos;s account.
          </p>

          <div className="flex flex-wrap gap-2">
            <Dialog open={lateFeeOpen} onOpenChange={setLateFeeOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add late fee rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add late fee rule</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateLateFee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fee amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={lateFeeAmount}
                        onChange={(e) => setLateFeeAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Deadline</Label>
                      <Input
                        type="datetime-local"
                        value={lateFeeDeadline}
                        onChange={(e) => setLateFeeDeadline(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={lateFeeDesc}
                      onChange={(e) => setLateFeeDesc(e.target.value)}
                      placeholder="e.g. $25 after Oct 15"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createLateFee.isPending}>
                    Add rule
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Charge fine or late fee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Charge fine or late fee</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Adds an amount owed to the member. Use late fee rules above for chapter-wide deadlines; use this
                  for individual fines or manual charges.
                </p>
                <form onSubmit={handleRecordCharge} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Member</Label>
                    <Select value={chargeUserId} onValueChange={setChargeUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeMembers.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.first_name} {m.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={chargeType} onValueChange={(v) => setChargeType(v as 'fine' | 'late_fee')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fine">Fine</SelectItem>
                          <SelectItem value="late_fee">Late fee (manual charge)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={chargeAmount}
                        onChange={(e) => setChargeAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={chargeDesc}
                      onChange={(e) => setChargeDesc(e.target.value)}
                      placeholder="Reason for the charge…"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createLineItem.isPending}>
                    {createLineItem.isPending ? 'Recording…' : 'Record charge'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="rules" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rules">Late fee rules</TabsTrigger>
              <TabsTrigger value="charges">Charge log</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lateFees.map((f) => (
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
                            <Button size="sm" variant="ghost" onClick={() => deleteLateFee.mutate(f.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {lateFees.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                            No late fee rules configured.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="charges" className="space-y-4">
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
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fineLogItems.map((li) => {
                        const m = members.find((x) => x.user_id === li.user_id);
                        return (
                          <TableRow key={li.id}>
                            <TableCell className="font-medium">
                              {m ? `${m.first_name} ${m.last_name}` : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {li.type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-destructive">
                              +${Number(li.amount).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{li.description || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(li.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => deleteLineItem.mutate(li.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {fineLogItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No fines or manual late fees recorded.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ——— Schedule ——— */}
        <TabsContent value="schedule">
          <FinanceScheduleCalendar items={scheduleItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
