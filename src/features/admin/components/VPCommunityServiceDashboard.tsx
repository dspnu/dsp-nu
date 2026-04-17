import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, Clock, Heart } from 'lucide-react';
import { useAllServiceHours, useVerifyServiceHours } from '@/features/service-hours/hooks/useServiceHours';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useAuth } from '@/core/auth/AuthContext';
import { useChapterSetting } from '@/hooks/useChapterSettings';

const SERVICE_HOURS_REQUIREMENT = 10;

export function VPCommunityServiceDashboard() {
  const { user } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: allHours = [] } = useAllServiceHours();
  const verifyHours = useVerifyServiceHours();
  const { data: serviceHoursRequirementSetting } = useChapterSetting('service_hours_requirement', { whenMissing: SERVICE_HOURS_REQUIREMENT });
  const serviceHoursRequirement = typeof serviceHoursRequirementSetting === 'number'
    ? serviceHoursRequirementSetting
    : Number(serviceHoursRequirementSetting) || SERVICE_HOURS_REQUIREMENT;

  const pendingHours = allHours.filter(h => !h.verified);
  const totalVerified = allHours.filter(h => h.verified).reduce((s, h) => s + Number(h.hours), 0);
  const totalPending = pendingHours.reduce((s, h) => s + Number(h.hours), 0);

  const getMemberName = (userId: string) => {
    const m = members.find(m => m.user_id === userId);
    return m ? `${m.first_name} ${m.last_name}` : 'Unknown';
  };

  const activeMembers = members.filter(m => m.status === 'active' || m.status === 'new_member');
  const memberHoursSummary = activeMembers.map(m => {
    const hrs = allHours.filter(h => h.user_id === m.user_id);
    const verified = hrs.filter(h => h.verified).reduce((s, h) => s + Number(h.hours), 0);
    return { name: `${m.first_name} ${m.last_name}`, verified, met: verified >= serviceHoursRequirement };
  }).sort((a, b) => b.verified - a.verified);

  const metRequirement = memberHoursSummary.filter(m => m.met).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">VP of Community Service</h3>
        <p className="text-sm text-muted-foreground">Service hours verification and tracking</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalVerified.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Verified Hours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingHours.length}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metRequirement}</p>
              <p className="text-xs text-muted-foreground">Met Requirement</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPending.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Pending Hours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verification */}
      {pendingHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />Pending Verification ({pendingHours.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingHours.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getMemberName(entry.user_id).split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{getMemberName(entry.user_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(entry.hours).toFixed(1)} hrs • {format(new Date(entry.service_date), 'MMM d')} • {entry.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(entry as any).photo_url && (
                      <a href={(entry as any).photo_url} target="_blank" rel="noopener noreferrer">
                        <img src={(entry as any).photo_url} alt="Proof" className="h-8 w-8 rounded object-cover border" />
                      </a>
                    )}
                    <Button size="sm" onClick={() => verifyHours.mutate({ id: entry.id, verified_by: user?.id ?? '' })} disabled={verifyHours.isPending}>
                      <CheckCircle className="h-4 w-4 mr-1" />Verify
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Hours Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member Hours Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-center">Verified Hours</TableHead>
                <TableHead className="text-center">Requirement ({serviceHoursRequirement}h)</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberHoursSummary.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium text-sm">{row.name}</TableCell>
                  <TableCell className="text-center">{row.verified.toFixed(1)}</TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {serviceHoursRequirement > 0
                      ? `${Math.min((row.verified / serviceHoursRequirement) * 100, 100).toFixed(0)}%`
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.met ? 'default' : 'secondary'} className="text-xs">
                      {row.met ? 'Complete' : 'In Progress'}
                    </Badge>
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
