import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useAllServiceHours } from '@/features/service-hours/hooks/useServiceHours';
import { supabase } from '@/integrations/supabase/client';
import { org } from '@/config/org';
import { useChapterSetting, useUpdateChapterSetting } from '@/hooks/useChapterSettings';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';

const POINTS_REQUIREMENT = org.standing.minPoints;
const DEFAULT_SERVICE_HOURS = 10;

const normalizeListSetting = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback;
};

function suggestPledgeClassOrder(members: { status: string; pledge_class: string | null; graduation_year: number | null }[]): string[] {
  const candidates = members.filter((m) => (m.status === 'active' || m.status === 'new_member') && m.pledge_class?.trim());
  const maxGradByClass = new Map<string, number>();
  for (const m of candidates) {
    const pc = m.pledge_class!.trim();
    const gy = m.graduation_year ?? 0;
    maxGradByClass.set(pc, Math.max(maxGradByClass.get(pc) ?? 0, gy));
  }
  return Array.from(maxGradByClass.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k]) => k);
}

function suggestCurrentPc(members: { status: string; pledge_class: string | null }[]): string | null {
  const nm = members.filter((m) => m.status === 'new_member' && m.pledge_class?.trim());
  if (nm.length === 0) return null;
  const counts = new Map<string, number>();
  for (const m of nm) {
    const pc = m.pledge_class!.trim();
    counts.set(pc, (counts.get(pc) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [pc, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = pc;
    }
  }
  return best;
}

export function PledgeClassTrackingSection() {
  const { data: members = [] } = useMembers();
  const { data: allHours = [] } = useAllServiceHours();
  const updateSetting = useUpdateChapterSetting();
  const { data: orderSetting } = useChapterSetting('pledge_class_order', { whenMissing: [] as string[] });
  const { data: currentPcSetting } = useChapterSetting('current_pc_pledge_class', { whenMissing: '' });
  const { data: serviceHoursRequirementSetting } = useChapterSetting('service_hours_requirement', { whenMissing: DEFAULT_SERVICE_HOURS });

  const [newClass, setNewClass] = useState('');
  const storedOverride = typeof currentPcSetting === 'string' && currentPcSetting ? currentPcSetting : '';
  const [overrideInput, setOverrideInput] = useState('');
  useEffect(() => {
    setOverrideInput(storedOverride);
  }, [storedOverride]);

  const pledgeOrder = normalizeListSetting(orderSetting, []);
  const serviceHoursRequirement =
    typeof serviceHoursRequirementSetting === 'number'
      ? serviceHoursRequirementSetting
      : Number(serviceHoursRequirementSetting) || DEFAULT_SERVICE_HOURS;

  const { data: allPoints = [] } = useQuery({
    queryKey: ['all-points'],
    queryFn: async () => {
      const { data, error } = await supabase.from('points_ledger').select('*');
      if (error) throw error;
      return data;
    },
  });

  const suggestedCurrent = useMemo(() => suggestCurrentPc(members), [members]);

  const currentPc = storedOverride.trim() || suggestedCurrent || pledgeOrder[0] || null;

  const currentIdx = currentPc ? pledgeOrder.indexOf(currentPc) : -1;
  const previousPc =
    currentIdx >= 0 && currentIdx + 1 < pledgeOrder.length ? pledgeOrder[currentIdx + 1] : null;

  const previousMembers = useMemo(() => {
    if (!previousPc) return [];
    return members.filter(
      (m) =>
        (m.status === 'active' || m.status === 'new_member') &&
        (m as { pledge_class?: string | null }).pledge_class?.trim() === previousPc
    );
  }, [members, previousPc]);

  const rows = useMemo(() => {
    return previousMembers.map((m) => {
      const uid = m.user_id;
      const pts = allPoints.filter((p: { user_id: string }) => p.user_id === uid).reduce((s: number, p: { points: number }) => s + p.points, 0);
      const hrs = allHours.filter((h) => h.user_id === uid && h.verified).reduce((s, h) => s + Number(h.hours), 0);
      const good = pts >= POINTS_REQUIREMENT && hrs >= serviceHoursRequirement;
      return { m, pts, hrs, good };
    });
  }, [previousMembers, allPoints, allHours, serviceHoursRequirement]);

  const saveOrder = (next: string[]) => {
    updateSetting.mutate({ key: 'pledge_class_order', value: next.length > 0 ? next : [] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Previous pledge class standing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Order pledge classes <span className="font-medium text-foreground">newest first</span>. The class immediately after the current PC in this list is treated as the{' '}
          <span className="font-medium text-foreground">previous</span> class for visibility. Current PC defaults to the most common pledge class among new members; override if needed.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-3">
            <Label>Pledge class order (newest first)</Label>
            <div className="flex flex-wrap gap-2">
              {pledgeOrder.map((item) => (
                <Badge key={item} variant="secondary" className="gap-1">
                  {item}
                  <button
                    type="button"
                    onClick={() => saveOrder(pledgeOrder.filter((x) => x !== item))}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                placeholder="Add pledge class label…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const t = newClass.trim();
                    if (!t || pledgeOrder.includes(t)) return;
                    saveOrder([...pledgeOrder, t]);
                    setNewClass('');
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  const t = newClass.trim();
                  if (!t || pledgeOrder.some((x) => x.toLowerCase() === t.toLowerCase())) {
                    toast.error('Enter a unique pledge class');
                    return;
                  }
                  saveOrder([...pledgeOrder, t]);
                  setNewClass('');
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const next = suggestPledgeClassOrder(members);
                  if (next.length === 0) {
                    toast.error('No pledge classes found on active/new member profiles');
                    return;
                  }
                  saveOrder(next);
                  toast.success('Order suggested from roster');
                }}
              >
                Suggest from roster
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <Label>Current PC override (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Suggested current: {suggestedCurrent || '—'}. Stored value overrides when set.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Input
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                placeholder="Match a label from order list"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const t = overrideInput.trim();
                  updateSetting.mutate({ key: 'current_pc_pledge_class', value: t.length > 0 ? t : null });
                }}
              >
                Save override
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOverrideInput('');
                  updateSetting.mutate({ key: 'current_pc_pledge_class', value: null });
                }}
              >
                Clear override
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Current PC (resolved):</span>{' '}
            <span className="font-medium">{currentPc || '—'}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Previous PC (for tracking):</span>{' '}
            <span className="font-medium">{previousPc || '—'}</span>
          </p>
          {!previousPc && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Add at least two pledge classes in order above (or set current PC) to identify the class before the current one.
            </p>
          )}
        </div>

        {previousPc && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Members in previous PC ({previousPc}) — points & good standing vs {POINTS_REQUIREMENT} pts / {serviceHoursRequirement}h service
            </p>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active or new members found with this pledge class.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Service hrs</TableHead>
                    <TableHead>Standing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ m, pts, hrs, good }) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.first_name} {m.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{m.status}</TableCell>
                      <TableCell className="text-right">{pts}</TableCell>
                      <TableCell className="text-right">{hrs}</TableCell>
                      <TableCell>
                        {good ? (
                          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-200">
                            Good
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/40">
                            Below threshold
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
