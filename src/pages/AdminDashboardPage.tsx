import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Award, Clock, DollarSign, Users } from 'lucide-react';
import { GrantPointsDialog } from '@/components/points/GrantPointsDialog';
import { Button } from '@/components/ui/button';
import { useMembers } from '@/hooks/useMembers';
import { useAllServiceHours, useVerifyServiceHours } from '@/hooks/useServiceHours';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const { isAdminOrOfficer, user } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: allServiceHours = [] } = useAllServiceHours();
  const verifyHours = useVerifyServiceHours();

  // Filter to unverified service hours
  const unverifiedHours = allServiceHours.filter(h => !h.verified);

  if (!isAdminOrOfficer) {
    return <Navigate to="/" replace />;
  }

  const handleVerifyHours = async (id: string) => {
    if (!user?.id) return;
    try {
      await verifyHours.mutateAsync({ id, verified_by: user.id });
      toast.success('Service hours verified');
    } catch {
      toast.error('Failed to verify hours');
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Admin Dashboard"
        description="Manage chapter operations, points, service hours, and dues"
      />

      <Tabs defaultValue="points" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="points" className="gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Points</span>
          </TabsTrigger>
          <TabsTrigger value="service" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Service</span>
          </TabsTrigger>
          <TabsTrigger value="dues" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Dues</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
        </TabsList>

        {/* Points Tab */}
        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle>Grant Points</CardTitle>
              <CardDescription>
                Award points to members for attendance, participation, and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GrantPointsDialog />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Hours Tab */}
        <TabsContent value="service">
          <Card>
            <CardHeader>
              <CardTitle>Pending Service Hours</CardTitle>
              <CardDescription>
                Review and verify member service hour submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unverifiedHours.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending service hours to review
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unverifiedHours.map((entry) => {
                      const member = members.find(m => m.user_id === entry.user_id);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {member ? `${member.first_name} ${member.last_name}` : 'Unknown'}
                          </TableCell>
                          <TableCell>{format(new Date(entry.service_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{entry.hours}</TableCell>
                          <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleVerifyHours(entry.id)}
                              disabled={verifyHours.isPending}
                            >
                              Verify
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dues Tab */}
        <TabsContent value="dues">
          <Card>
            <CardHeader>
              <CardTitle>Dues Management</CardTitle>
              <CardDescription>
                Track and record member dues payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                View full dues management on the dedicated Dues page.
              </p>
              <Button variant="outline" asChild>
                <a href="/dues">Go to Dues Page</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Overview Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Member Overview</CardTitle>
              <CardDescription>
                Quick stats and member management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{members.filter(m => m.status === 'active').length}</p>
                  <p className="text-sm text-muted-foreground">Active Members</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{members.filter(m => m.status === 'new_mem').length}</p>
                  <p className="text-sm text-muted-foreground">New Members</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{unverifiedHours.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Hours</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{members.filter(m => m.status === 'pnm').length}</p>
                  <p className="text-sm text-muted-foreground">PNMs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
