import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { org } from '@/config/org';
import { useMembers } from '@/core/members/hooks/useMembers';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { id: 'active', label: 'Active members' },
  { id: 'new_member', label: 'New members' },
  { id: 'pnm', label: org.terms.pledge + 's' },
  { id: 'alumni', label: 'Alumni' },
  { id: 'inactive', label: 'Inactive' },
] as const;

const OFFICER_ROLES = ['officer', 'admin', 'president'] as const;

export type AnnouncementAudience = {
  everyone: boolean;
  statuses: string[];
  committees: string[];
  pledgeClasses: string[];
  families: string[];
  positions: string[];
  officers: boolean;
  userIds: string[];
};

export const EMPTY_AUDIENCE: AnnouncementAudience = {
  everyone: true,
  statuses: [],
  committees: [],
  pledgeClasses: [],
  families: [],
  positions: [],
  officers: false,
  userIds: [],
};

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Chip({
  pressed,
  label,
  onClick,
}: {
  pressed: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs transition-colors',
        pressed
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  );
}

function GroupRow({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <Chip key={option} label={option} pressed={selected.includes(option)} onClick={() => onToggle(option)} />
        ))}
      </div>
    </div>
  );
}

export function audienceHasSelection(audience: AnnouncementAudience) {
  return (
    audience.everyone ||
    audience.officers ||
    audience.statuses.length > 0 ||
    audience.committees.length > 0 ||
    audience.pledgeClasses.length > 0 ||
    audience.families.length > 0 ||
    audience.positions.length > 0 ||
    audience.userIds.length > 0
  );
}

export function ChapterAnnouncementAudience({
  audience,
  onChange,
}: {
  audience: AnnouncementAudience;
  onChange: (next: AnnouncementAudience) => void;
}) {
  const { data: members = [] } = useMembers();
  const [search, setSearch] = useState('');

  const committees = useMemo(
    () => uniqueSorted(members.flatMap((member) => member.committees ?? [])),
    [members],
  );
  const pledgeClasses = useMemo(() => uniqueSorted(members.map((member) => member.pledge_class)), [members]);
  const families = useMemo(() => uniqueSorted(members.map((member) => member.family)), [members]);
  const positions = useMemo(
    () => uniqueSorted([...org.positions, ...members.flatMap((member) => member.positions ?? [])]),
    [members],
  );

  const selectedCount = useMemo(() => {
    if (audience.everyone) return members.length;
    const userIds = new Set(audience.userIds);
    return members.filter((member) => {
      if (userIds.has(member.user_id)) return true;
      if (audience.statuses.includes(member.status)) return true;
      if (member.committees?.some((committee) => audience.committees.includes(committee))) return true;
      if (member.pledge_class && audience.pledgeClasses.includes(member.pledge_class)) return true;
      if (member.family && audience.families.includes(member.family)) return true;
      if (member.positions?.some((position) => audience.positions.includes(position))) return true;
      return false;
    }).length;
  }, [audience, members]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(query),
    );
  }, [members, search]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Recipients</Label>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            label="Everyone"
            pressed={audience.everyone}
            onClick={() => onChange({ ...EMPTY_AUDIENCE, everyone: true })}
          />
          <Chip
            label="Choose people"
            pressed={!audience.everyone}
            onClick={() => onChange({ ...audience, everyone: false })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {audience.everyone
            ? 'Sends to every member who allows announcements.'
            : `${selectedCount} member${selectedCount === 1 ? '' : 's'} selected${audience.officers ? ', plus officers' : ''}. People who turned announcements off are skipped.`}
        </p>
      </div>

      {!audience.everyone && (
        <div className="space-y-3 rounded-md border border-border/50 bg-background/60 p-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  pressed={audience.statuses.includes(option.id)}
                  onClick={() =>
                    onChange({ ...audience, statuses: toggleValue(audience.statuses, option.id) })
                  }
                />
              ))}
              <Chip
                label="Officers"
                pressed={audience.officers}
                onClick={() => onChange({ ...audience, officers: !audience.officers })}
              />
            </div>
          </div>

          <GroupRow
            title="Committees"
            options={committees}
            selected={audience.committees}
            onToggle={(value) => onChange({ ...audience, committees: toggleValue(audience.committees, value) })}
          />
          <GroupRow
            title="Pledge classes"
            options={pledgeClasses}
            selected={audience.pledgeClasses}
            onToggle={(value) =>
              onChange({ ...audience, pledgeClasses: toggleValue(audience.pledgeClasses, value) })
            }
          />
          <GroupRow
            title="Families"
            options={families}
            selected={audience.families}
            onToggle={(value) => onChange({ ...audience, families: toggleValue(audience.families, value) })}
          />
          <GroupRow
            title="Positions"
            options={positions}
            selected={audience.positions}
            onToggle={(value) => onChange({ ...audience, positions: toggleValue(audience.positions, value) })}
          />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Individual members</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search members"
                className="h-8 pl-8 text-sm"
              />
            </div>
            <ScrollArea className="h-40 rounded-md border border-border/50">
              <div className="space-y-0.5 p-1">
                {filteredMembers.map((member) => {
                  const checked = audience.userIds.includes(member.user_id);
                  return (
                    <label
                      key={member.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          onChange({ ...audience, userIds: toggleValue(audience.userIds, member.user_id) })
                        }
                      />
                      <span className="min-w-0 truncate text-sm">
                        {member.first_name} {member.last_name}
                      </span>
                    </label>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No members match that search.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

export function audienceRpcArgs(audience: AnnouncementAudience) {
  if (audience.everyone) return {};

  return {
    ...(audience.userIds.length > 0 ? { p_user_ids: audience.userIds } : {}),
    ...(audience.statuses.length > 0 ? { p_statuses: audience.statuses } : {}),
    ...(audience.committees.length > 0 ? { p_committees: audience.committees } : {}),
    ...(audience.pledgeClasses.length > 0 ? { p_pledge_classes: audience.pledgeClasses } : {}),
    ...(audience.families.length > 0 ? { p_families: audience.families } : {}),
    ...(audience.positions.length > 0 ? { p_positions: audience.positions } : {}),
    ...(audience.officers ? { p_roles: [...OFFICER_ROLES] } : {}),
  };
}
