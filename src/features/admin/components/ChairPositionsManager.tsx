import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useChairPositions, useCreateChairPosition, useUpdateChairPosition, useDeleteChairPosition } from '@/hooks/useChairPositions';
import { Tables } from '@/integrations/supabase/types';

type ChairPosition = Tables<'chair_positions'>;

function ChairForm({ position, onClose }: { position?: ChairPosition; onClose: () => void }) {
  const [title, setTitle] = useState(position?.title ?? '');
  const [description, setDescription] = useState(position?.description ?? '');
  const [sortOrder, setSortOrder] = useState(position?.sort_order?.toString() ?? '0');
  const create = useCreateChairPosition();
  const update = useUpdateChairPosition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const values = { title: title.trim(), description: description.trim() || undefined, sort_order: parseInt(sortOrder) || 0 };
    if (position) {
      update.mutate({ id: position.id, ...values }, { onSuccess: onClose });
    } else {
      create.mutate(values, { onSuccess: onClose });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Social Chair" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Responsibilities and duties..." rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Sort Order</Label>
        <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={create.isPending || update.isPending}>
          {position ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

export function ChairPositionsManager() {
  const { data: positions, isLoading } = useChairPositions();
  const deletePosition = useDeleteChairPosition();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChairPosition | undefined>();

  const openEdit = (p: ChairPosition) => {
    setEditing(p);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Chair Positions</CardTitle>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Position
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Position' : 'New Chair Position'}</DialogTitle>
            </DialogHeader>
            <ChairForm position={editing} onClose={() => setFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !positions?.length ? (
          <p className="text-sm text-muted-foreground">No chair positions defined yet.</p>
        ) : (
          <div className="space-y-2">
            {positions.map(p => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <GripVertical className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{p.title}</p>
                  {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePosition.mutate(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
