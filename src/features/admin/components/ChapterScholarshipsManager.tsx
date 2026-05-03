import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthContext';
import { useMembers } from '@/core/members/hooks/useMembers';
import {
  useChapterScholarships,
  useCreateChapterScholarship,
  useDeleteChapterScholarship,
  useUpdateChapterScholarship,
} from '@/features/chapter/hooks/useChapterScholarships';
import type { Tables } from '@/integrations/supabase/types';

type ScholarshipRow = Tables<'chapter_scholarships'>;

const NONE = '__none__';

function emptyForm() {
  return {
    name: '',
    description: '',
    application_instructions: '',
    info_url: '',
    application_url: '',
    amount_summary: '',
    due_date: '',
    winner_user_id: NONE,
    winner_display_name: '',
    academic_year: '',
    sort_order: '0',
    is_active: true,
  };
}

export function ChapterScholarshipsManager() {
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useChapterScholarships();
  const { data: members = [] } = useMembers();
  const createScholarship = useCreateChapterScholarship();
  const updateScholarship = useUpdateChapterScholarship();
  const deleteScholarship = useDeleteChapterScholarship();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScholarshipRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)),
    [members]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (row: ScholarshipRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      description: row.description ?? '',
      application_instructions: row.application_instructions ?? '',
      info_url: row.info_url ?? '',
      application_url: row.application_url ?? '',
      amount_summary: row.amount_summary ?? '',
      due_date: row.due_date ?? '',
      winner_user_id: row.winner_user_id ?? NONE,
      winner_display_name: row.winner_display_name ?? '',
      academic_year: row.academic_year ?? '',
      sort_order: String(row.sort_order ?? 0),
      is_active: row.is_active,
    });
    setFormOpen(true);
  };

  const norm = (s: string) => {
    const t = s.trim();
    return t === '' ? null : t;
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const due = norm(form.due_date);
    const payload = {
      name: form.name.trim(),
      description: norm(form.description),
      application_instructions: norm(form.application_instructions),
      info_url: norm(form.info_url),
      application_url: norm(form.application_url),
      amount_summary: norm(form.amount_summary),
      due_date: due,
      winner_user_id: form.winner_user_id === NONE ? null : form.winner_user_id,
      winner_display_name: norm(form.winner_display_name),
      academic_year: norm(form.academic_year),
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
      is_active: form.is_active,
    };

    if (editing) {
      updateScholarship.mutate({ id: editing.id, ...payload }, { onSuccess: () => setFormOpen(false) });
    } else if (user?.id) {
      createScholarship.mutate(
        { ...payload, created_by: user.id },
        { onSuccess: () => setFormOpen(false) }
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Scholarships ({rows.length})
          </CardTitle>
          <Button type="button" size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground px-6 pb-6">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 px-6 text-muted-foreground">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No scholarships yet. Add one for the chapter to see it on the Standing tab.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id} className={!s.is_active ? 'opacity-60' : undefined}>
                    <TableCell className="font-medium text-sm max-w-[200px]">
                      <span className="line-clamp-2">{s.name}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.amount_summary ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.due_date ? format(new Date(`${s.due_date}T12:00:00`), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {s.is_active ? (
                        <Badge variant="secondary" className="text-xs">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Hidden</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit scholarship' : 'New scholarship'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Nu Chapter Excellence Award" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short summary for the chapter" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input value={form.amount_summary} onChange={(e) => setForm((f) => ({ ...f, amount_summary: e.target.value }))} placeholder="$500" />
              </div>
              <div className="space-y-2">
                <Label>Application due</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>How to apply</Label>
              <Textarea rows={3} value={form.application_instructions} onChange={(e) => setForm((f) => ({ ...f, application_instructions: e.target.value }))} placeholder="Steps, materials, or where to email" />
            </div>
            <div className="space-y-2">
              <Label>Info / details link</Label>
              <Input value={form.info_url} onChange={(e) => setForm((f) => ({ ...f, info_url: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="space-y-2">
              <Label>Application link</Label>
              <Input value={form.application_url} onChange={(e) => setForm((f) => ({ ...f, application_url: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Academic year (optional)</Label>
                <Input value={form.academic_year} onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))} placeholder="2025–26" />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Winner (chapter member)</Label>
              <Select value={form.winner_user_id} onValueChange={(v) => setForm((f) => ({ ...f, winner_user_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {sortedMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.first_name} {m.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Winner display name (if not in directory)</Label>
              <Input value={form.winner_display_name} onChange={(e) => setForm((f) => ({ ...f, winner_display_name: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Show on Standing</p>
                <p className="text-xs text-muted-foreground">Hidden rows stay in this list for your records only.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c }))} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                !form.name.trim()
                || (editing ? updateScholarship.isPending : createScholarship.isPending)
              }
            >
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this scholarship?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Members will no longer see it on the Standing tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteScholarship.isPending}
              onClick={() => {
                if (deleteId) deleteScholarship.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
