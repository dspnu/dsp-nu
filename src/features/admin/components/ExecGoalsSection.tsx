import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target } from 'lucide-react';
import { org } from '@/config/org';
import {
  useExecChapterGoals,
  useUpsertExecChapterGoal,
  type ExecChapterGoal,
  type ExecGoalProgress,
} from '@/features/admin/hooks/useExecChapterGoals';

const PROGRESS_OPTIONS: ExecGoalProgress[] = ['not_started', 'in_progress', 'met', 'missed'];

function goalFor(goals: ExecChapterGoal[] | undefined, year: string, position: string): ExecChapterGoal | undefined {
  return goals?.find((g) => g.performance_year === year && g.position_title === position);
}

function defaultYearLabel(): string {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(-2)}`;
}

export function ExecGoalsSection() {
  const { data: goals = [], isLoading } = useExecChapterGoals();
  const upsert = useUpsertExecChapterGoal();

  const distinctYears = useMemo(() => {
    const ys = new Set(goals.map((g) => g.performance_year));
    return Array.from(ys).sort((a, b) => b.localeCompare(a));
  }, [goals]);

  const [editYear, setEditYear] = useState(() => defaultYearLabel());
  const [yearInput, setYearInput] = useState('');
  const [compareA, setCompareA] = useState<string>(() => defaultYearLabel());
  const [compareB, setCompareB] = useState<string>(() => defaultYearLabel());

  const yearOptions = useMemo(() => {
    const s = new Set([...distinctYears, editYear, compareA, compareB].filter(Boolean));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [distinctYears, editYear, compareA, compareB]);

  useEffect(() => {
    if (distinctYears.length === 0) return;
    setCompareA((prev) => (distinctYears.includes(prev) ? prev : distinctYears[0]));
    setCompareB((prev) => (distinctYears.includes(prev) ? prev : distinctYears[1] ?? distinctYears[0]));
  }, [distinctYears]);

  const positions = org.positions;

  const [drafts, setDrafts] = useState<Record<string, { goal_text: string; success_criteria: string; actual_summary: string; progress: ExecGoalProgress }>>({});

  const getDraft = (position: string) => {
    const existing = goalFor(goals, editYear, position);
    const d = drafts[position];
    if (d) return d;
    return {
      goal_text: existing?.goal_text ?? '',
      success_criteria: existing?.success_criteria ?? '',
      actual_summary: existing?.actual_summary ?? '',
      progress: (existing?.progress ?? 'not_started') as ExecGoalProgress,
    };
  };

  const setDraftField = (position: string, field: keyof ReturnType<typeof getDraft>, value: string | ExecGoalProgress) => {
    setDrafts((prev) => ({
      ...prev,
      [position]: { ...getDraft(position), [field]: value },
    }));
  };

  const savePosition = (position: string) => {
    const d = getDraft(position);
    upsert.mutate({
      performance_year: editYear,
      position_title: position,
      goal_text: d.goal_text,
      success_criteria: d.success_criteria || null,
      actual_summary: d.actual_summary || null,
      progress: d.progress,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Executive goals and performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-3">
          <Label>Performance year to edit</Label>
          <div className="flex flex-wrap gap-2 items-end">
            <Select
              value={editYear}
              onValueChange={(v) => {
                setEditYear(v);
                setDrafts({});
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Pick a year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Add year label (e.g. 2025-26)"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="w-[180px]"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const t = yearInput.trim();
                  if (!t) return;
                  setEditYear(t);
                  setYearInput('');
                  setDrafts({});
                }}
              >
                Use year
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Set chapter-wide goals by position for each performance year, then record how the year went for year-over-year context.
          </p>
        </div>

        <div className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading goals…</p>}
          {positions.map((position) => {
            const d = getDraft(position);
            return (
              <div key={position} className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-semibold">{position}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Goal</Label>
                    <Textarea
                      rows={3}
                      value={d.goal_text}
                      onChange={(e) => setDraftField(position, 'goal_text', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Success criteria</Label>
                    <Textarea
                      rows={3}
                      value={d.success_criteria}
                      onChange={(e) => setDraftField(position, 'success_criteria', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs">How we did (outcomes)</Label>
                    <Textarea
                      rows={2}
                      value={d.actual_summary}
                      onChange={(e) => setDraftField(position, 'actual_summary', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Progress</Label>
                    <Select value={d.progress} onValueChange={(v) => setDraftField(position, 'progress', v as ExecGoalProgress)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROGRESS_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="button" size="sm" onClick={() => savePosition(position)} disabled={upsert.isPending}>
                  Save {position}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm font-medium">Year-over-year comparison</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Year A</Label>
              <Select value={compareA} onValueChange={setCompareA}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={`a-${y}`} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Year B</Label>
              <Select value={compareB} onValueChange={setCompareB}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={`b-${y}`} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>{compareA} goal</TableHead>
                  <TableHead>{compareA} outcome</TableHead>
                  <TableHead>{compareB} goal</TableHead>
                  <TableHead>{compareB} outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  const ga = goalFor(goals, compareA, position);
                  const gb = goalFor(goals, compareB, position);
                  return (
                    <TableRow key={position}>
                      <TableCell className="font-medium whitespace-nowrap">{position}</TableCell>
                      <TableCell className="text-sm max-w-[200px]">{ga?.goal_text || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[200px]">{ga?.actual_summary || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[200px]">{gb?.goal_text || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[200px]">{gb?.actual_summary || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
