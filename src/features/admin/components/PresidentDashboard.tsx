import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Crown, Users, DollarSign, Shield, TrendingUp } from 'lucide-react';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useAllDues } from '@/features/dues/hooks/useDues';
import { useAllServiceHours } from '@/features/service-hours/hooks/useServiceHours';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { org } from '@/config/org';
import { DataExportCard } from '@/features/admin/components/DataExportCard';
import { useChapterSetting, useUpdateChapterSetting } from '@/hooks/useChapterSettings';
import { X, Plus } from 'lucide-react';

const POINTS_REQUIREMENT = org.standing.minPoints;
const SERVICE_HOURS_REQUIREMENT = 10;

const DEFAULT_EVENT_TYPES = org.eventCategories.map((category) => category.label);
const DEFAULT_POINT_CATEGORIES = org.eventCategories.map((category) => category.key);
const DEFAULT_EXEC_POSITIONS = org.positions;
const DEFAULT_MEMBER_STATUS_TYPES = ['active', 'new_member', 'inactive', 'alumni', 'pnm'];
const DEFAULT_FAMILIES = ['Unassigned'];

type AdminTabVisibility = {
  chapterOps: boolean;
  communityService: boolean;
  professionalActivities: boolean;
  scholarship: boolean;
  finance: boolean;
  chancellor: boolean;
  brotherhood: boolean;
  announcements: boolean;
};

const DEFAULT_ADMIN_TAB_VISIBILITY: AdminTabVisibility = {
  chapterOps: true,
  communityService: true,
  professionalActivities: true,
  scholarship: true,
  finance: true,
  chancellor: true,
  brotherhood: true,
  announcements: true,
};

const normalizeListSetting = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback;
};

const normalizeAdminVisibility = (value: unknown): AdminTabVisibility => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_ADMIN_TAB_VISIBILITY;
  }
  const candidate = value as Record<string, unknown>;
  return {
    chapterOps: typeof candidate.chapterOps === 'boolean' ? candidate.chapterOps : DEFAULT_ADMIN_TAB_VISIBILITY.chapterOps,
    communityService: typeof candidate.communityService === 'boolean' ? candidate.communityService : DEFAULT_ADMIN_TAB_VISIBILITY.communityService,
    professionalActivities: typeof candidate.professionalActivities === 'boolean' ? candidate.professionalActivities : DEFAULT_ADMIN_TAB_VISIBILITY.professionalActivities,
    scholarship: typeof candidate.scholarship === 'boolean' ? candidate.scholarship : DEFAULT_ADMIN_TAB_VISIBILITY.scholarship,
    finance: typeof candidate.finance === 'boolean' ? candidate.finance : DEFAULT_ADMIN_TAB_VISIBILITY.finance,
    chancellor: typeof candidate.chancellor === 'boolean' ? candidate.chancellor : DEFAULT_ADMIN_TAB_VISIBILITY.chancellor,
    brotherhood: typeof candidate.brotherhood === 'boolean' ? candidate.brotherhood : DEFAULT_ADMIN_TAB_VISIBILITY.brotherhood,
    announcements: typeof candidate.announcements === 'boolean' ? candidate.announcements : DEFAULT_ADMIN_TAB_VISIBILITY.announcements,
  };
};

export function PresidentDashboard() {
  const { data: members = [] } = useMembers();
  const { data: allDues = [] } = useAllDues();
  const { data: allHours = [] } = useAllServiceHours();
  const updateSetting = useUpdateChapterSetting();
  const { data: eventTypesSetting } = useChapterSetting('custom_event_types', { whenMissing: DEFAULT_EVENT_TYPES });
  const { data: pointCategoriesSetting } = useChapterSetting('custom_point_categories', { whenMissing: DEFAULT_POINT_CATEGORIES });
  const { data: execPositionsSetting } = useChapterSetting('custom_exec_positions', { whenMissing: DEFAULT_EXEC_POSITIONS });
  const { data: memberStatusTypesSetting } = useChapterSetting('custom_member_status_types', { whenMissing: DEFAULT_MEMBER_STATUS_TYPES });
  const { data: familiesSetting } = useChapterSetting('custom_families', { whenMissing: DEFAULT_FAMILIES });
  const { data: adminVisibilitySetting } = useChapterSetting('admin_tab_visibility', { whenMissing: DEFAULT_ADMIN_TAB_VISIBILITY });
  const { data: showAdminTabSetting } = useChapterSetting('chapter_admin_tab_visible', { whenMissing: true });
  const { data: serviceHoursRequirementSetting } = useChapterSetting('service_hours_requirement', { whenMissing: SERVICE_HOURS_REQUIREMENT });

  const [newEventType, setNewEventType] = useState('');
  const [newPointCategory, setNewPointCategory] = useState('');
  const [newExecPosition, setNewExecPosition] = useState('');
  const [newMemberStatusType, setNewMemberStatusType] = useState('');
  const [newFamily, setNewFamily] = useState('');
  const [serviceHoursInput, setServiceHoursInput] = useState(String(serviceHoursRequirementSetting ?? SERVICE_HOURS_REQUIREMENT));

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
  const eventTypes = normalizeListSetting(eventTypesSetting, DEFAULT_EVENT_TYPES);
  const pointCategories = normalizeListSetting(pointCategoriesSetting, DEFAULT_POINT_CATEGORIES);
  const execPositions = normalizeListSetting(execPositionsSetting, DEFAULT_EXEC_POSITIONS);
  const memberStatusTypes = normalizeListSetting(memberStatusTypesSetting, DEFAULT_MEMBER_STATUS_TYPES);
  const families = normalizeListSetting(familiesSetting, DEFAULT_FAMILIES);
  const adminTabVisibility = normalizeAdminVisibility(adminVisibilitySetting);
  const serviceHoursRequirement = typeof serviceHoursRequirementSetting === 'number'
    ? serviceHoursRequirementSetting
    : Number(serviceHoursRequirementSetting) || SERVICE_HOURS_REQUIREMENT;

  useEffect(() => {
    setServiceHoursInput(String(serviceHoursRequirement));
  }, [serviceHoursRequirement]);

  const goodStandingCount = useMemo(() => {
    return activeMembers.filter(m => {
      const pts = allPoints.filter(p => p.user_id === m.user_id).reduce((s, p) => s + p.points, 0);
      const hrs = allHours.filter(h => h.user_id === m.user_id && h.verified).reduce((s, h) => s + Number(h.hours), 0);
      return pts >= POINTS_REQUIREMENT && hrs >= serviceHoursRequirement;
    }).length;
  }, [activeMembers, allPoints, allHours, serviceHoursRequirement]);

  const saveListSetting = (key: string, values: string[]) => {
    updateSetting.mutate({ key, value: values });
  };

  const addListItem = (key: string, existing: string[], value: string, clearInput: () => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (existing.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Item already exists');
      return;
    }
    saveListSetting(key, [...existing, trimmed]);
    clearInput();
  };

  const removeListItem = (key: string, existing: string[], value: string) => {
    const next = existing.filter((item) => item !== value);
    saveListSetting(key, next.length > 0 ? next : existing);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">President</h3>
        <p className="text-sm text-muted-foreground">Chapter overview and dues</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Customization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Service hours requirement (good standing)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={serviceHoursInput}
                onChange={(e) => setServiceHoursInput(e.target.value)}
                className="max-w-[200px]"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const parsed = Number(serviceHoursInput);
                  if (!Number.isFinite(parsed) || parsed < 0) {
                    toast.error('Enter a valid number');
                    return;
                  }
                  updateSetting.mutate({ key: 'service_hours_requirement', value: parsed });
                }}
              >
                Save
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ListSetting
              title="Event Types"
              items={eventTypes}
              inputValue={newEventType}
              onInputChange={setNewEventType}
              onAdd={() => addListItem('custom_event_types', eventTypes, newEventType, () => setNewEventType(''))}
              onRemove={(value) => removeListItem('custom_event_types', eventTypes, value)}
            />
            <ListSetting
              title="Point Categories"
              items={pointCategories}
              inputValue={newPointCategory}
              onInputChange={setNewPointCategory}
              onAdd={() => addListItem('custom_point_categories', pointCategories, newPointCategory, () => setNewPointCategory(''))}
              onRemove={(value) => removeListItem('custom_point_categories', pointCategories, value)}
            />
            <ListSetting
              title="Exec Positions"
              items={execPositions}
              inputValue={newExecPosition}
              onInputChange={setNewExecPosition}
              onAdd={() => addListItem('custom_exec_positions', execPositions, newExecPosition, () => setNewExecPosition(''))}
              onRemove={(value) => removeListItem('custom_exec_positions', execPositions, value)}
            />
            <ListSetting
              title="Member Status Types"
              items={memberStatusTypes}
              inputValue={newMemberStatusType}
              onInputChange={setNewMemberStatusType}
              onAdd={() => addListItem('custom_member_status_types', memberStatusTypes, newMemberStatusType, () => setNewMemberStatusType(''))}
              onRemove={(value) => removeListItem('custom_member_status_types', memberStatusTypes, value)}
            />
            <ListSetting
              title="Families"
              items={families}
              inputValue={newFamily}
              onInputChange={setNewFamily}
              onAdd={() => addListItem('custom_families', families, newFamily, () => setNewFamily(''))}
              onRemove={(value) => removeListItem('custom_families', families, value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Show Admin tab in Chapter page</p>
                <p className="text-xs text-muted-foreground">Master visibility toggle for the entire tab.</p>
              </div>
              <Switch
                checked={!!showAdminTabSetting}
                onCheckedChange={(checked) => updateSetting.mutate({ key: 'chapter_admin_tab_visible', value: checked })}
              />
            </div>

            {[
              { key: 'chapterOps', label: 'VP of Chapter Operations dashboard' },
              { key: 'communityService', label: 'VP of Community Service dashboard' },
              { key: 'professionalActivities', label: 'VP of Professional Activities dashboard' },
              { key: 'scholarship', label: 'VP Scholarship dashboard' },
              { key: 'finance', label: 'VP Finance dashboard' },
              { key: 'chancellor', label: 'Chancellor dashboard' },
              { key: 'brotherhood', label: 'VP Brotherhood dashboard' },
              { key: 'announcements', label: 'Chapter announcements card' },
            ].map((item) => {
              const value = adminTabVisibility[item.key as keyof AdminTabVisibility];
              return (
                <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="text-sm">{item.label}</p>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) =>
                      updateSetting.mutate({
                        key: 'admin_tab_visibility',
                        value: { ...adminTabVisibility, [item.key]: checked },
                      })
                    }
                  />
                </div>
              );
            })}
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

interface ListSettingProps {
  title: string;
  items: string[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}

function ListSetting({ title, items, inputValue, onInputChange, onAdd, onRemove }: ListSettingProps) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="gap-1">
            {item}
            <button type="button" onClick={() => onRemove(item)} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={`Add ${title.toLowerCase()}...`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button type="button" size="icon" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
