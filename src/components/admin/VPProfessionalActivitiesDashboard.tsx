import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Briefcase, ExternalLink } from 'lucide-react';
import { useJobs, useApproveJob } from '@/hooks/useJobs';

export function VPProfessionalActivitiesDashboard() {
  const { data: jobs = [] } = useJobs();
  const approveJob = useApproveJob();

  const pendingJobs = jobs.filter(j => !j.is_approved);
  const approvedJobs = jobs.filter(j => j.is_approved);

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
    </div>
  );
}
