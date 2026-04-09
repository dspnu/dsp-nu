import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, UserMinus, X } from 'lucide-react';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { useUpdateCandidate } from '@/features/eop/hooks/useEOP';
import type { Tables } from '@/integrations/supabase/types';

type EOPCandidate = Tables<'eop_candidates'>;

export function EOPOutOfRoomControl({
  candidate,
  className,
}: {
  candidate: EOPCandidate;
  className?: string;
}) {
  const updateCandidate = useUpdateCandidate();
  const { data: baseVoters } = useChapterSetting('eop_base_voters');

  const [absentName, setAbsentName] = useState('');
  const [open, setOpen] = useState(false);

  const absentMembers: string[] = candidate.absent_members ?? [];
  const baseNumber =
    typeof baseVoters === 'number'
      ? baseVoters
      : typeof baseVoters === 'string'
        ? parseInt(baseVoters as string, 10)
        : 0;

  const handleAddAbsent = () => {
    const name = absentName.trim();
    if (!name) return;
    const updated = [...absentMembers, name];
    updateCandidate.mutate({
      id: candidate.id,
      absent_members: updated,
      eligible_voters: Math.max(0, baseNumber - updated.length),
    });
    setAbsentName('');
  };

  const handleRemoveAbsent = (index: number) => {
    const updated = absentMembers.filter((_, i) => i !== index);
    updateCandidate.mutate({
      id: candidate.id,
      absent_members: updated,
      eligible_voters: Math.max(0, baseNumber - updated.length),
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <UserMinus className="h-4 w-4 mr-2" />
          Out of Room
          {absentMembers.length > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
              {absentMembers.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Members out of the room</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddAbsent();
            }}
            className="flex gap-1.5"
          >
            <Input
              value={absentName}
              onChange={(e) => setAbsentName(e.target.value)}
              placeholder="Name..."
              className="h-8 text-sm"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 px-2 shrink-0"
              disabled={!absentName.trim() || updateCandidate.isPending}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>
          {absentMembers.length > 0 ? (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {absentMembers.map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="flex items-center justify-between py-1 px-2 rounded bg-muted/50 text-sm"
                >
                  <span className="truncate">{name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveAbsent(i)}
                    disabled={updateCandidate.isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">No one marked as absent</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
