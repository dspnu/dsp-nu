import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Progress } from '@/components/ui/progress';
import { Award, Download, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMembers, useMemberPoints } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV } from '@/lib/csv';
import { GrantPointsDialog } from '@/components/points/GrantPointsDialog';

const categories = ['chapter', 'rush', 'fundraising', 'service', 'brotherhood', 'professionalism', 'dei'] as const;

export default function PointsPage() {
  const { user, isAdminOrOfficer } = useAuth();
  const { data: members } = useMembers();
  const { data: myPoints } = useMemberPoints(user?.id ?? '');

  // Fetch all points for leaderboard
  const { data: allPoints } = useQuery({
    queryKey: ['all-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calculate totals by member
  const memberTotals = members?.map(member => {
    const memberPoints = allPoints?.filter(p => p.user_id === member.user_id) ?? [];
    const total = memberPoints.reduce((sum, p) => sum + p.points, 0);
    const byCategory = memberPoints.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.points;
      return acc;
    }, {} as Record<string, number>);
    
    return { member, total, byCategory };
  }).sort((a, b) => b.total - a.total) ?? [];

  // My totals
  const myTotal = myPoints?.reduce((sum, p) => sum + p.points, 0) ?? 0;
  const myByCategory = myPoints?.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.points;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const handleExport = () => {
    if (!memberTotals) return;
    
    const exportData = memberTotals.map(({ member, total, byCategory }) => ({
      'First Name': member.first_name,
      'Last Name': member.last_name,
      Email: member.email,
      'Total Points': total,
      Chapter: byCategory.chapter || 0,
      Rush: byCategory.rush || 0,
      Fundraising: byCategory.fundraising || 0,
      Service: byCategory.service || 0,
      Brotherhood: byCategory.brotherhood || 0,
      Professionalism: byCategory.professionalism || 0,
      'DE&I': byCategory.dei || 0,
    }));
    
    exportToCSV(exportData, 'points-report');
  };

  return (
    <AppLayout>
      <PageHeader title="Points" description="Your chapter points breakdown">
        <div className="flex gap-2">
          {isAdminOrOfficer && <GrantPointsDialog />}
          {isAdminOrOfficer && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* My Points Summary */}
        {user && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                My Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-4">{myTotal}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {categories.slice(0, 4).map(cat => (
                  <div key={cat} className="space-y-1">
                    <CategoryBadge category={cat} />
                    <div className="font-semibold">{myByCategory[cat] || 0}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Points History */}
        {myPoints && myPoints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My Points History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myPoints.slice(0, 10).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d')}
                      </TableCell>
                      <TableCell>
                        <CategoryBadge category={entry.category} />
                      </TableCell>
                      <TableCell>{entry.reason}</TableCell>
                      <TableCell className="text-right font-medium">
                        <Badge variant={entry.points > 0 ? 'default' : 'destructive'}>
                          {entry.points > 0 ? '+' : ''}{entry.points}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Chapter Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memberTotals.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No points yet"
                description="Points will appear here as members earn them."
              />
            ) : (
              <div className="space-y-3">
                {memberTotals.slice(0, 10).map(({ member, total, byCategory }, index) => {
                  const maxPoints = memberTotals[0]?.total || 1;
                  return (
                    <div key={member.id} className="flex items-center gap-4">
                      <div className="w-8 text-center font-bold text-muted-foreground">
                        {index + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback>
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {member.first_name} {member.last_name}
                        </div>
                        <Progress value={(total / maxPoints) * 100} className="h-2 mt-1" />
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {total} pts
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
