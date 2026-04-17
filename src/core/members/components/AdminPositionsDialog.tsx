import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Shield, X, Plus } from 'lucide-react';
import { useUpdateMember } from '@/core/members/hooks/useMembers';
import { Tables, Enums } from '@/integrations/supabase/types';
import { Constants } from '@/integrations/supabase/types';
import { org } from '@/config/org';
import { useChapterSetting } from '@/hooks/useChapterSettings';

type Profile = Tables<'profiles'>;
type MemberStatus = Enums<'member_status'>;

interface AdminPositionsDialogProps {
  member: Profile;
}

const COMMON_POSITIONS = org.positions;

export function AdminPositionsDialog({ member }: AdminPositionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [positions, setPositions] = useState<string[]>(member.positions || []);
  const [newPosition, setNewPosition] = useState('');
  const [status, setStatus] = useState<MemberStatus>(member.status);
  const updateMember = useUpdateMember();
  const { data: customExecPositionsSetting } = useChapterSetting('custom_exec_positions', { whenMissing: COMMON_POSITIONS });
  const customPositions = Array.isArray(customExecPositionsSetting)
    ? customExecPositionsSetting.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : COMMON_POSITIONS;

  const addPosition = (position: string) => {
    if (position && !positions.includes(position)) {
      setPositions([...positions, position]);
    }
    setNewPosition('');
  };

  const removePosition = (position: string) => {
    setPositions(positions.filter(p => p !== position));
  };

  const handleSave = async () => {
    await updateMember.mutateAsync({
      id: member.id,
      positions,
      status,
    });
    setOpen(false);
  };

  const statusOptions = Constants.public.Enums.member_status;
  const formatStatusLabel = (value: MemberStatus) =>
    value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          Manage Positions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage {member.first_name}'s Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Member Status */}
          <div className="space-y-2">
            <Label>Member Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MemberStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Positions */}
          <div className="space-y-2">
            <Label>Current Positions</Label>
            <div className="flex flex-wrap gap-2">
              {positions.length === 0 ? (
                <span className="text-sm text-muted-foreground">No positions assigned</span>
              ) : (
                positions.map((pos) => (
                  <Badge key={pos} variant="secondary" className="gap-1">
                    {pos}
                    <button onClick={() => removePosition(pos)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Add Position */}
          <div className="space-y-2">
            <Label>Add Position</Label>
            <Select value="" onValueChange={addPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Select a position" />
              </SelectTrigger>
              <SelectContent>
                {customPositions.filter(p => !positions.includes(p)).map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Or type custom position..."
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPosition(newPosition))}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addPosition(newPosition)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMember.isPending}>
              {updateMember.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
