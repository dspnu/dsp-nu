import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Briefcase, ExternalLink, Sparkles, Users, Activity, Coins } from 'lucide-react';
import { useJobs, useApproveJob } from '@/features/jobs/hooks/useJobs';
import { supabase } from '@/integrations/supabase/client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const TOOL_LABELS: Record<string, string> = {
  resume_review: 'Resume Review',
  linkedin: 'LinkedIn',
  personal_brand: 'Personal Brand',
  outreach: 'Outreach',
  interview_prep: 'Interview Prep',
  job_strategy: 'Job Strategy',
};

interface CareerStats {
  period_days: number;
  total_runs: number;
  runs_in_period: number;
  unique_users: number;
  unique_users_in_period: number;
  by_tool: { tool: string; count: number }[];
  by_day: { day: string; count: number }[];
  top_users: { user_id: string; first_name: string | null; last_name: string | null; count: number }[];
  week_start: string;
  weekly_credits_used: number;
  bonus_credits_outstanding: number;
}

function useCareerHubStats(days = 30) {
  return useQuery({
    queryKey: ['career-hub-stats', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_career_hub_usage_stats', { p_days: days });
      if (error) throw error;
      return data as unknown as CareerStats;
    },
  });
}

export function VPProfessionalActivitiesDashboard() {
  const { data: jobs = [] } = useJobs();
  const approveJob = useApproveJob();
  const { data: stats, isLoading: statsLoading } = useCareerHubStats(30);

  const pendingJobs = jobs.filter(j => !j.is_approved);
  const approvedJobs = jobs.filter(j => j.is_approved);
  const maxDay = Math.max(1, ...(stats?.by_day.map(d => d.count) ?? [0]));
  const maxTool = Math.max(1, ...(stats?.by_tool.map(t => t.count) ?? [0]));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">VP of Professional Activities</h3>
        <p className="text-sm text-muted-foreground">Job board management and professional event oversight</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedJobs.length}</p>
              <p className="text-xs text-muted-foreground">Active Listings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingJobs.length}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{jobs.filter(j => j.job_type === 'internship').length}</p>
              <p className="text-xs text-muted-foreground">Internships</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Job Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div>
                  <p className="font-medium text-sm">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.company} • {job.job_type.replace('_', ' ')}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => approveJob.mutate(job.id)}
                  disabled={approveJob.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />Approve
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Listings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Job Listings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedJobs.slice(0, 10).map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium text-sm">{job.title}</TableCell>
                  <TableCell className="text-sm">{job.company}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">{job.job_type.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(job.created_at), 'MMM d')}</TableCell>
                  <TableCell>
                    {job.apply_url && (
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Career Hub usage */}
      <div className="space-y-3 pt-2">
        <div className="flex items-baseline justify-between">
          <h4 className="font-display text-base font-semibold text-foreground">Career Hub usage</h4>
          <span className="text-xs text-muted-foreground">Last {stats?.period_days ?? 30} days</span>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '—' : stats?.runs_in_period ?? 0}</p>
                <p className="text-xs text-muted-foreground">AI runs (period)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '—' : stats?.total_runs ?? 0}</p>
                <p className="text-xs text-muted-foreground">All-time runs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '—' : stats?.unique_users_in_period ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '—' : stats?.weekly_credits_used ?? 0}</p>
                <p className="text-xs text-muted-foreground">Credits used this week</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage by tool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(stats?.by_tool ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
              {(stats?.by_tool ?? []).map((row) => (
                <div key={row.tool} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{TOOL_LABELS[row.tool] ?? row.tool}</span>
                    <span className="text-muted-foreground">{row.count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(row.count / maxTool) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily activity</CardTitle>
            </CardHeader>
            <CardContent>
              {(stats?.by_day ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="h-40 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={(stats?.by_day ?? []).map((d) => ({
                        day: format(new Date(d.day), 'MMM d'),
                        count: d.count,
                      }))}
                      margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        width={24}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: 'hsl(var(--primary))' }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats?.top_users ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-sm text-muted-foreground">
                      No activity yet.
                    </TableCell>
                  </TableRow>
                )}
                {(stats?.top_users ?? []).map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="text-sm">
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown member'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{u.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
