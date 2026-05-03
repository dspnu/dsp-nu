import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/core/auth/AuthContext';
import { useMyExecTasks } from '@/features/admin/hooks/useExecTasks';
import { ClipboardList } from 'lucide-react';

export function ExecTasksCard() {
  const { isExecBoard } = useAuth();
  const { data: tasks = [], isLoading } = useMyExecTasks();

  if (!isExecBoard) return null;

  const upcoming = [...tasks]
    .sort((a, b) => {
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    })
    .slice(0, 5);

  if (!isLoading && upcoming.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Upcoming exec tasks
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/chapter?tab=admin">Chapter admin</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading tasks…</p>}
        {!isLoading &&
          upcoming.map((t) => {
            const overdue = t.due_at && isPast(new Date(t.due_at)) && t.status === 'open';
            return (
              <div key={t.id} className="flex flex-col gap-0.5 rounded-lg border border-border/80 px-3 py-2">
                <span className="text-sm font-medium">{t.title}</span>
                {t.description && <span className="text-xs text-muted-foreground line-clamp-2">{t.description}</span>}
                <span className={`text-xs ${overdue ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                  {t.due_at ? `Due ${format(new Date(t.due_at), 'MMM d, yyyy')}` : 'No due date'}
                </span>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
