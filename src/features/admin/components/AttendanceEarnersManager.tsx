import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, Trash2, Users, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useAttendanceEarners,
  useCreateAttendanceEarner,
  useUpdateAttendanceEarner,
  useDeleteAttendanceEarner,
  useAttendanceEarnerCompletions,
  useGrantAttendanceEarner,
  useRevokeAttendanceEarner,
  AttendanceEarner,
} from '@/features/events/hooks/useAttendanceEarners';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useAuth } from '@/core/auth/AuthContext';
import { org } from '@/config/org';

const categories = org.eventCategories.map(c => c.key);
type CategoryType = (typeof org.eventCategories)[number]['key'] | 'new_member' | 'exec';

function EarnerForm({ earner, onClose }: { earner?: AttendanceEarner; onClose: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState(earner?.title ?? '');
  const [description, setDescription] = useState(earner?.description ?? '');
  const [category, setCategory] = useState<CategoryType>(earner?.category as CategoryType ?? 'chapter');
  const [pointsValue, setPointsValue] = useState(earner?.points_value?.toString() ?? '1');
  const create = useCreateAttendanceEarner();
  const update = useUpdateAttendanceEarner();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const values = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      points_value: parseInt(pointsValue) || 1,
    };
    if (earner) {
      update.mutate({ id: earner.id, ...values }, { onSuccess: onClose });
    } else {
      create.mutate({ ...values, created_by: user?.id }, { onSuccess: onClose });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. GM Participation" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="How members can earn this..." rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as CategoryType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c === 'dei' ? 'DE&I' : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Points</Label>
          <Input type="number" min={1} value={pointsValue} onChange={e => setPointsValue(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={create.isPending || update.isPending}>
          {earner ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

function EarnerCard({ earner }: { earner: AttendanceEarner }) {
  const { user } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: completions = [] } = useAttendanceEarnerCompletions(earner.id);
  const update = useUpdateAttendanceEarner();
  const deleteEarner = useDeleteAttendanceEarner();
  const grant = useGrantAttendanceEarner();
  const revoke = useRevokeAttendanceEarner();
  const [formOpen, setFormOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const activeMembers = members.filter(m => m.status === 'active' || m.status === 'new_member');
  const completedUserIds = new Set(completions.map(c => c.user_id));
  const completedCount = completions.length;

  const handleGrant = (memberId: string, memberUserId: string) => {
    if (!user?.id) return;
    grant.mutate({
      earner_id: earner.id,
      user_id: memberUserId,
      granted_by: user.id,
      category: earner.category,
      points_value: earner.points_value,
      reason: earner.title,
    });
  };

  const handleRevoke = (userId: string) => {
    const completion = completions.find(c => c.user_id === userId);
    if (completion) {
      revoke.mutate(completion.id);
    }
  };

  return (
    <Card className={!earner.is_active ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm">{earner.title}</h4>
              <Badge variant="secondary" className="capitalize text-xs">
                {earner.category === 'dei' ? 'DE&I' : earner.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {earner.points_value} pt{earner.points_value !== 1 ? 's' : ''}
              </Badge>
            </div>
            {earner.description && (
              <p className="text-xs text-muted-foreground mt-1">{earner.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {completedCount}/{activeMembers.length} completed
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={earner.is_active}
              onCheckedChange={(checked) => update.mutate({ id: earner.id, is_active: checked })}
              disabled={update.isPending}
            />
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Attendance Earner</DialogTitle>
                </DialogHeader>
                <EarnerForm earner={earner} onClose={() => setFormOpen(false)} />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => deleteEarner.mutate(earner.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Expandable member list */}
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            <span>Manage Members</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          {expanded && (
            <ScrollArea className="h-48 mt-2">
              <div className="space-y-1">
                {activeMembers.map(member => {
                  const hasCompleted = completedUserIds.has(member.user_id);
                  return (
                    <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {member.first_name[0]}{member.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.first_name} {member.last_name}</span>
                      </div>
                      {hasCompleted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleRevoke(member.user_id)}
                          disabled={revoke.isPending}
                        >
                          <X className="h-3 w-3 mr-1" /> Revoke
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-primary hover:text-primary"
                          onClick={() => handleGrant(member.id, member.user_id)}
                          disabled={grant.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" /> Grant
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AttendanceEarnersManager() {
  const { data: earners, isLoading } = useAttendanceEarners();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Attendance Earners</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Point opportunities not tied to specific events</p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Earner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Attendance Earner</DialogTitle>
            </DialogHeader>
            <EarnerForm onClose={() => setFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !earners?.length ? (
          <p className="text-sm text-muted-foreground">No attendance earners created yet. Create one to allow members to earn points outside of events.</p>
        ) : (
          <div className="space-y-3">
            {earners.map(e => (
              <EarnerCard key={e.id} earner={e} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
