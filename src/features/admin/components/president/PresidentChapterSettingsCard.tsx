import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ListSetting } from '@/features/admin/components/president/listSettingHelpers';

export type AdminTabVisibility = {
  chapterOps: boolean;
  communityService: boolean;
  professionalActivities: boolean;
  scholarship: boolean;
  finance: boolean;
  chancellor: boolean;
  brotherhood: boolean;
  announcements: boolean;
};

export interface PresidentChapterSettingsCardProps {
  serviceHoursInput: string;
  onServiceHoursInputChange: (value: string) => void;
  onSaveServiceHoursRequirement: () => void;
  eventTypes: string[];
  newEventType: string;
  onNewEventTypeChange: (value: string) => void;
  onAddEventType: () => void;
  onRemoveEventType: (value: string) => void;
  pointCategories: string[];
  newPointCategory: string;
  onNewPointCategoryChange: (value: string) => void;
  onAddPointCategory: () => void;
  onRemovePointCategory: (value: string) => void;
  execPositions: string[];
  newExecPosition: string;
  onNewExecPositionChange: (value: string) => void;
  onAddExecPosition: () => void;
  onRemoveExecPosition: (value: string) => void;
  memberStatusTypes: string[];
  newMemberStatusType: string;
  onNewMemberStatusTypeChange: (value: string) => void;
  onAddMemberStatusType: () => void;
  onRemoveMemberStatusType: (value: string) => void;
  families: string[];
  newFamily: string;
  onNewFamilyChange: (value: string) => void;
  onAddFamily: () => void;
  onRemoveFamily: (value: string) => void;
  showAdminTab: boolean;
  onShowAdminTabChange: (checked: boolean) => void;
  adminTabVisibility: AdminTabVisibility;
  onAdminVisibilityChange: (key: keyof AdminTabVisibility, checked: boolean) => void;
}

const VISIBILITY_ROWS: { key: keyof AdminTabVisibility; label: string }[] = [
  { key: 'chapterOps', label: 'VP of Chapter Operations dashboard' },
  { key: 'communityService', label: 'VP of Community Service dashboard' },
  { key: 'professionalActivities', label: 'VP of Professional Activities dashboard' },
  { key: 'scholarship', label: 'VP Scholarship dashboard' },
  { key: 'finance', label: 'VP Finance dashboard' },
  { key: 'chancellor', label: 'Chancellor dashboard' },
  { key: 'brotherhood', label: 'VP Brotherhood dashboard' },
  { key: 'announcements', label: 'Chapter announcements card' },
];

export function PresidentChapterSettingsCard(props: PresidentChapterSettingsCardProps) {
  const {
    serviceHoursInput,
    onServiceHoursInputChange,
    onSaveServiceHoursRequirement,
    eventTypes,
    newEventType,
    onNewEventTypeChange,
    onAddEventType,
    onRemoveEventType,
    pointCategories,
    newPointCategory,
    onNewPointCategoryChange,
    onAddPointCategory,
    onRemovePointCategory,
    execPositions,
    newExecPosition,
    onNewExecPositionChange,
    onAddExecPosition,
    onRemoveExecPosition,
    memberStatusTypes,
    newMemberStatusType,
    onNewMemberStatusTypeChange,
    onAddMemberStatusType,
    onRemoveMemberStatusType,
    families,
    newFamily,
    onNewFamilyChange,
    onAddFamily,
    onRemoveFamily,
    showAdminTab,
    onShowAdminTabChange,
    adminTabVisibility,
    onAdminVisibilityChange,
  } = props;

  return (
    <div className="space-y-6">
        <div className="grid gap-2">
          <Label>Service hours requirement (good standing)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={serviceHoursInput}
              onChange={(e) => onServiceHoursInputChange(e.target.value)}
              className="max-w-[200px]"
            />
            <Button variant="outline" onClick={onSaveServiceHoursRequirement}>
              Save
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ListSetting
            title="Event Types"
            items={eventTypes}
            inputValue={newEventType}
            onInputChange={onNewEventTypeChange}
            onAdd={onAddEventType}
            onRemove={onRemoveEventType}
          />
          <ListSetting
            title="Point Categories"
            items={pointCategories}
            inputValue={newPointCategory}
            onInputChange={onNewPointCategoryChange}
            onAdd={onAddPointCategory}
            onRemove={onRemovePointCategory}
          />
          <ListSetting
            title="Exec Positions"
            items={execPositions}
            inputValue={newExecPosition}
            onInputChange={onNewExecPositionChange}
            onAdd={onAddExecPosition}
            onRemove={onRemoveExecPosition}
          />
          <ListSetting
            title="Member Status Types"
            items={memberStatusTypes}
            inputValue={newMemberStatusType}
            onInputChange={onNewMemberStatusTypeChange}
            onAdd={onAddMemberStatusType}
            onRemove={onRemoveMemberStatusType}
          />
          <ListSetting
            title="Families"
            items={families}
            inputValue={newFamily}
            onInputChange={onNewFamilyChange}
            onAdd={onAddFamily}
            onRemove={onRemoveFamily}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Show Admin tab in Chapter page</p>
              <p className="text-xs text-muted-foreground">Master visibility toggle for the entire tab.</p>
            </div>
            <Switch checked={showAdminTab} onCheckedChange={onShowAdminTabChange} />
          </div>

          {VISIBILITY_ROWS.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
              <p className="text-sm">{item.label}</p>
              <Switch
                checked={adminTabVisibility[item.key]}
                onCheckedChange={(checked) => onAdminVisibilityChange(item.key, checked)}
              />
            </div>
          ))}
        </div>
    </div>
  );
}
