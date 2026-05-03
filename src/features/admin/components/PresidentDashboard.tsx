import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useAllDues } from '@/features/dues/hooks/useDues';
import { useAllServiceHours } from '@/features/service-hours/hooks/useServiceHours';
import { supabase } from '@/integrations/supabase/client';
import { org } from '@/config/org';
import { DataExportCard } from '@/features/admin/components/DataExportCard';
import { ExecGoalsSection } from '@/features/admin/components/ExecGoalsSection';
import { ExecTasksManager } from '@/features/admin/components/ExecTasksManager';
import { PledgeClassTrackingSection } from '@/features/admin/components/PledgeClassTrackingSection';
import {
  PresidentChapterSettingsCard,
  type AdminTabVisibility,
} from '@/features/admin/components/president/PresidentChapterSettingsCard';
import { PresidentOverviewStats } from '@/features/admin/components/president/PresidentOverviewStats';
import { PresidentRecentDuesCard } from '@/features/admin/components/president/PresidentRecentDuesCard';
import { useChapterSetting, useUpdateChapterSetting } from '@/hooks/useChapterSettings';

const POINTS_REQUIREMENT = org.standing.minPoints;
const SERVICE_HOURS_REQUIREMENT = 10;

const DEFAULT_EVENT_TYPES = org.eventCategories.map((category) => category.label);
const DEFAULT_POINT_CATEGORIES = org.eventCategories.map((category) => category.key);
const DEFAULT_EXEC_POSITIONS = org.positions;
const DEFAULT_MEMBER_STATUS_TYPES = ['active', 'new_member', 'inactive', 'alumni', 'pnm'];
const DEFAULT_FAMILIES = ['Unassigned'];

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
    communityService:
      typeof candidate.communityService === 'boolean' ? candidate.communityService : DEFAULT_ADMIN_TAB_VISIBILITY.communityService,
    professionalActivities:
      typeof candidate.professionalActivities === 'boolean'
        ? candidate.professionalActivities
        : DEFAULT_ADMIN_TAB_VISIBILITY.professionalActivities,
    scholarship: typeof candidate.scholarship === 'boolean' ? candidate.scholarship : DEFAULT_ADMIN_TAB_VISIBILITY.scholarship,
    finance: typeof candidate.finance === 'boolean' ? candidate.finance : DEFAULT_ADMIN_TAB_VISIBILITY.finance,
    chancellor: typeof candidate.chancellor === 'boolean' ? candidate.chancellor : DEFAULT_ADMIN_TAB_VISIBILITY.chancellor,
    brotherhood: typeof candidate.brotherhood === 'boolean' ? candidate.brotherhood : DEFAULT_ADMIN_TAB_VISIBILITY.brotherhood,
    announcements:
      typeof candidate.announcements === 'boolean' ? candidate.announcements : DEFAULT_ADMIN_TAB_VISIBILITY.announcements,
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

  const [openSections, setOpenSections] = useState<string[]>(['at-a-glance', 'leadership']);

  const { data: allPoints = [] } = useQuery({
    queryKey: ['all-points'],
    queryFn: async () => {
      const { data, error } = await supabase.from('points_ledger').select('*');
      if (error) throw error;
      return data;
    },
  });

  const activeMembers = members.filter((m) => m.status === 'active' || m.status === 'new_member');
  const totalDuesCollected = allDues.reduce((s, d) => s + Number(d.amount), 0);
  const eventTypes = normalizeListSetting(eventTypesSetting, DEFAULT_EVENT_TYPES);
  const pointCategories = normalizeListSetting(pointCategoriesSetting, DEFAULT_POINT_CATEGORIES);
  const execPositions = normalizeListSetting(execPositionsSetting, DEFAULT_EXEC_POSITIONS);
  const memberStatusTypes = normalizeListSetting(memberStatusTypesSetting, DEFAULT_MEMBER_STATUS_TYPES);
  const families = normalizeListSetting(familiesSetting, DEFAULT_FAMILIES);
  const adminTabVisibility = normalizeAdminVisibility(adminVisibilitySetting);
  const serviceHoursRequirement =
    typeof serviceHoursRequirementSetting === 'number'
      ? serviceHoursRequirementSetting
      : Number(serviceHoursRequirementSetting) || SERVICE_HOURS_REQUIREMENT;

  useEffect(() => {
    setServiceHoursInput(String(serviceHoursRequirement));
  }, [serviceHoursRequirement]);

  useEffect(() => {
    if (allDues.length > 0) {
      setOpenSections((prev) => (prev.includes('money') ? prev : [...prev, 'money']));
    }
  }, [allDues.length]);

  const goodStandingCount = useMemo(() => {
    return activeMembers.filter((m) => {
      const pts = allPoints.filter((p) => p.user_id === m.user_id).reduce((s, p) => s + p.points, 0);
      const hrs = allHours.filter((h) => h.user_id === m.user_id && h.verified).reduce((s, h) => s + Number(h.hours), 0);
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

  const onSaveServiceHoursRequirement = () => {
    const parsed = Number(serviceHoursInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Enter a valid number');
      return;
    }
    updateSetting.mutate({ key: 'service_hours_requirement', value: parsed });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">President</h3>
        <p className="text-sm text-muted-foreground">Overview, leadership tools, and chapter settings</p>
      </div>

      <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">
        <AccordionItem value="at-a-glance" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left font-medium hover:no-underline py-4">At a glance</AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <PresidentOverviewStats
              activeMemberCount={activeMembers.length}
              goodStandingCount={goodStandingCount}
              totalDuesCollected={totalDuesCollected}
              duesPaymentCount={allDues.length}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="leadership" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left font-medium hover:no-underline py-4">Leadership</AccordionTrigger>
          <AccordionContent className="space-y-6 pb-4 pt-0">
            <ExecGoalsSection />
            <PledgeClassTrackingSection />
            <ExecTasksManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="money" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
            <span className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-2">
              <span>Money</span>
              {allDues.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {allDues.length} payment{allDues.length === 1 ? '' : 's'} on record
                </span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            {allDues.length > 0 ? (
              <PresidentRecentDuesCard payments={allDues} members={members} />
            ) : (
              <p className="text-sm text-muted-foreground">No dues payments recorded yet.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="chapter-settings" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left font-medium hover:no-underline py-4">Chapter settings</AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <PresidentChapterSettingsCard
              serviceHoursInput={serviceHoursInput}
              onServiceHoursInputChange={setServiceHoursInput}
              onSaveServiceHoursRequirement={onSaveServiceHoursRequirement}
              eventTypes={eventTypes}
              newEventType={newEventType}
              onNewEventTypeChange={setNewEventType}
              onAddEventType={() => addListItem('custom_event_types', eventTypes, newEventType, () => setNewEventType(''))}
              onRemoveEventType={(value) => removeListItem('custom_event_types', eventTypes, value)}
              pointCategories={pointCategories}
              newPointCategory={newPointCategory}
              onNewPointCategoryChange={setNewPointCategory}
              onAddPointCategory={() =>
                addListItem('custom_point_categories', pointCategories, newPointCategory, () => setNewPointCategory(''))
              }
              onRemovePointCategory={(value) => removeListItem('custom_point_categories', pointCategories, value)}
              execPositions={execPositions}
              newExecPosition={newExecPosition}
              onNewExecPositionChange={setNewExecPosition}
              onAddExecPosition={() => addListItem('custom_exec_positions', execPositions, newExecPosition, () => setNewExecPosition(''))}
              onRemoveExecPosition={(value) => removeListItem('custom_exec_positions', execPositions, value)}
              memberStatusTypes={memberStatusTypes}
              newMemberStatusType={newMemberStatusType}
              onNewMemberStatusTypeChange={setNewMemberStatusType}
              onAddMemberStatusType={() =>
                addListItem('custom_member_status_types', memberStatusTypes, newMemberStatusType, () => setNewMemberStatusType(''))
              }
              onRemoveMemberStatusType={(value) => removeListItem('custom_member_status_types', memberStatusTypes, value)}
              families={families}
              newFamily={newFamily}
              onNewFamilyChange={setNewFamily}
              onAddFamily={() => addListItem('custom_families', families, newFamily, () => setNewFamily(''))}
              onRemoveFamily={(value) => removeListItem('custom_families', families, value)}
              showAdminTab={!!showAdminTabSetting}
              onShowAdminTabChange={(checked) => updateSetting.mutate({ key: 'chapter_admin_tab_visible', value: checked })}
              adminTabVisibility={adminTabVisibility}
              onAdminVisibilityChange={(key, checked) =>
                updateSetting.mutate({
                  key: 'admin_tab_visibility',
                  value: { ...adminTabVisibility, [key]: checked },
                })
              }
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="data" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-left font-medium hover:no-underline py-4">Data export</AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <DataExportCard />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
