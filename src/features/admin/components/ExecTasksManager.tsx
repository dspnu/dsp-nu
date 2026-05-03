import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList } from 'lucide-react';
import { useMembers } from '@/core/members/hooks/useMembers';
import {
  useCreateExecTask,
  useDeleteExecTask,
  useExecTasksList,
  useUpdateExecTask,
} from '@/features/admin/hooks/useExecTasks';

export function ExecTasksManager() {
  const { data: tasks = [], isLoading } = useExecTasksList();
  const { data: members = [] } = useMembers();
  const createTask = useCreateExecTask();
  const updateTask = useUpdateExecTask();
  const deleteTask = useDeleteExecTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assignee, setAssignee] = useState('');

  const execMembers = useMemo(() => {
    return members.filter((m) => (m.positions?.length ?? 0) > 0).sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [members]);

  const memberByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(m.user_id, `${m.first_name} ${m.last_name}`);
    }
    return map;
  }, [members]);

  const openRows = tasks.filter((t) => t.status === 'open');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Exec task list
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">New task</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due</Label>
              <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={assignee || undefined} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose exec member" />
                </SelectTrigger>
                <SelectContent>
                  {execMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.first_name} {m.last_name}
                      {m.positions?.[0] ? ` — ${m.positions[0]}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            disabled={createTask.isPending || !title.trim() || !assignee}
            onClick={() => {
              const due = dueAt ? new Date(dueAt).toISOString() : null;
              createTask.mutate(
                {
                  title: title.trim(),
                  description: description.trim() || null,
                  due_at: due,
                  priority: null,
                  assigned_to_user_id: assignee,
                  assigned_position: null,
                },
                {
                  onSuccess: () => {
                    setTitle('');
                    setDescription('');
                    setDueAt('');
                    setAssignee('');
                  },
                }
              );
            }}
          >
            Create task
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Open tasks</p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : openRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openRows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.title}</div>
                      {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{memberByUserId.get(t.assigned_to_user_id) ?? t.assigned_to_user_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {t.due_at ? format(new Date(t.due_at), 'MMM d, yyyy h:mm a') : '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateTask.mutate({ id: t.id, patch: { status: 'done' } })}
                      >
                        Done
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTask.mutate(t.id)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {tasks.some((t) => t.status !== 'open') && (
          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground">Recently completed / cancelled</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks
                  .filter((t) => t.status !== 'open')
                  .slice(0, 8)
                  .map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.title}</TableCell>
                      <TableCell className="text-sm capitalize">{t.status}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
