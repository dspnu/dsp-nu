import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, User, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApprovedMembers, type ApprovedCoffeeChatMember } from '@/hooks/useApprovedMembers';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'osu_email', label: 'Email' },
  { key: 'dsp_position', label: 'Position' },
  { key: 'majors', label: 'Major(s)' },
  { key: 'school_year', label: 'Year' },
  { key: 'pledge_class', label: 'Pledge Class' },
  { key: 'family', label: 'Family' },
  { key: 'hometown', label: 'Hometown' },
] as const;

export default function CoffeeChatDirectoryPage() {
  const { profile } = useAuth();
  const { data: members, isLoading } = useApprovedMembers();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ApprovedCoffeeChatMember | null>(null);

  const isNewMember = profile?.status === 'new_member';
  const isVP = profile?.positions?.includes('VP of New Member Development') ||
    profile?.positions?.includes('VP of Pledge Education') ||
    profile?.positions?.includes('VP of New Member Education');

  if (!isNewMember && !isVP) {
    return <Navigate to="/" replace />;
  }

  const filtered = useMemo(() => {
    if (!members) return [];
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      m.osu_email?.toLowerCase().includes(q) ||
      m.majors?.toLowerCase().includes(q) ||
      m.dsp_position?.toLowerCase().includes(q) ||
      m.family?.toLowerCase().includes(q) ||
      m.hometown?.toLowerCase().includes(q) ||
      m.pledge_class?.toLowerCase().includes(q) ||
      m.hobbies_interests?.toLowerCase().includes(q) ||
      m.school_year?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const detailFields = [
    { label: 'Email', value: selected?.osu_email },
    { label: 'Position', value: selected?.dsp_position },
    { label: 'Major(s)', value: selected?.majors },
    { label: 'Minor(s)', value: selected?.minors },
    { label: 'Hometown', value: [selected?.hometown, selected?.state].filter(Boolean).join(', ') },
    { label: 'School Year', value: selected?.school_year },
    { label: 'Pledge Class', value: selected?.pledge_class },
    { label: 'Family', value: selected?.family },
    { label: 'Grand Big', value: selected?.grand_big },
    { label: 'Big', value: selected?.big },
    { label: 'Little(s)', value: selected?.littles },
    { label: 'OSU Involvements', value: selected?.osu_involvements },
    { label: 'Internships/Experiences', value: selected?.internships_experiences },
    { label: 'Hobbies/Interests', value: selected?.hobbies_interests },
    { label: 'Fun Facts', value: selected?.fun_facts },
  ].filter(d => d.value);

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link to="/pdp"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageHeader
          title="Coffee Chat Directory"
          description={`${members?.length || 0} approved members to connect with`}
        />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, major, family, position..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columns.map(col => (
                    <th key={col.key} className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={columns.length} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    {search ? 'No members match your search' : 'No approved members uploaded yet'}
                  </td></tr>
                ) : (
                  filtered.map(m => (
                    <tr
                      key={m.id}
                      className="border-b hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => setSelected(m)}
                    >
                      <td className="p-3 font-medium whitespace-nowrap">
                        {m.first_name} {m.last_name}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{m.osu_email || '—'}</td>
                      <td className="p-3 whitespace-nowrap">
                        {m.dsp_position ? <Badge variant="secondary" className="text-[10px]">{m.dsp_position}</Badge> : '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap">{m.majors || '—'}</td>
                      <td className="p-3 whitespace-nowrap">{m.school_year || '—'}</td>
                      <td className="p-3 whitespace-nowrap">{m.pledge_class || '—'}</td>
                      <td className="p-3 whitespace-nowrap">{m.family || '—'}</td>
                      <td className="p-3 whitespace-nowrap">
                        {[m.hometown, m.state].filter(Boolean).join(', ') || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selected?.first_name} {selected?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {detailFields.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
