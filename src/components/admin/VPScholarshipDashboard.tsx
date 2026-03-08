import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Palette, ExternalLink, Award } from 'lucide-react';
import { useChapterSetting, useUpdateChapterSetting } from '@/hooks/useChapterSettings';
import { useAllPaddleSubmissions } from '@/hooks/usePaddleSubmissions';
import { useMembers } from '@/hooks/useMembers';

export function VPScholarshipDashboard() {
  const { data: paddleVisible } = useChapterSetting('paddle_submissions_visible');
  const updateSetting = useUpdateChapterSetting();
  const { data: submissions = [] } = useAllPaddleSubmissions();
  const { data: members = [] } = useMembers();

  const getMemberName = (userId: string) => {
    const m = members.find(m => m.user_id === userId);
    return m ? `${m.first_name} ${m.last_name}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-foreground">VP of Scholarship & Awards</h3>
        <p className="text-sm text-muted-foreground">Paddle submissions and awards management</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{submissions.length}</p>
              <p className="text-xs text-muted-foreground">Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Paddle Form</p>
              <p className="text-xs text-muted-foreground">Show on Home</p>
            </div>
            <Switch
              checked={!!paddleVisible}
              onCheckedChange={(checked) => updateSetting.mutate({ key: 'paddle_submissions_visible', value: checked })}
              disabled={updateSetting.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />Paddle Submissions ({submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {submissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Video Of</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-sm">{getMemberName(sub.user_id)}</TableCell>
                    <TableCell className="text-sm">{sub.subject_name}</TableCell>
                    <TableCell>
                      <a href={sub.link_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(sub.created_at), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Palette className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No paddle submissions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
