import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Download, GraduationCap } from 'lucide-react';
import { MemberCard } from '@/components/members/MemberCard';
import { ProfileEditDialog } from '@/components/members/ProfileEditDialog';
import { MemberProfileDialog } from '@/components/members/MemberProfileDialog';
import { AdminPositionsDialog } from '@/components/members/AdminPositionsDialog';
import { AlumniForm } from '@/components/alumni/AlumniForm';
import { AlumniCard } from '@/components/alumni/AlumniCard';
import { AlumniImportDialog } from '@/components/alumni/AlumniImportDialog';
import { useMembers, useMemberByUserId } from '@/hooks/useMembers';
import { useAlumni } from '@/hooks/useAlumni';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV } from '@/lib/csv';
import { Tables } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';

type Profile = Tables<'profiles'>;

export default function PeoplePage() {
  const { isAdminOrOfficer, isDeveloper, user } = useAuth();
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: alumni, isLoading: alumniLoading } = useAlumni();
  const { data: myProfile } = useMemberByUserId(user?.id || '');
  
  const [memberSearch, setMemberSearch] = useState('');
  const [alumniSearch, setAlumniSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('members');

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(member => {
      const matchesSearch = memberSearch === '' || 
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(memberSearch.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
        member.major?.toLowerCase().includes(memberSearch.toLowerCase());
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, memberSearch, statusFilter]);

  const industries = useMemo(() => {
    if (!alumni) return [];
    return [...new Set(alumni.map(a => a.industry).filter(Boolean))].sort();
  }, [alumni]);

  const filteredAlumni = useMemo(() => {
    if (!alumni) return [];
    return alumni.filter(alum => {
      const matchesSearch = alumniSearch === '' || 
        `${alum.first_name} ${alum.last_name}`.toLowerCase().includes(alumniSearch.toLowerCase()) ||
        alum.company?.toLowerCase().includes(alumniSearch.toLowerCase()) ||
        alum.job_title?.toLowerCase().includes(alumniSearch.toLowerCase());
      const matchesIndustry = industryFilter === 'all' || alum.industry === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [alumni, alumniSearch, industryFilter]);

  const totalMembers = members?.length || 0;
  const activeMembers = members?.filter(m => m.status === 'active').length || 0;
  const totalAlumni = alumni?.length || 0;

  const handleExportMembers = () => {
    if (!members) return;
    exportToCSV(members, 'members-directory');
  };

  const handleExportAlumni = () => {
    if (!alumni) return;
    exportToCSV(alumni, 'alumni-directory');
  };

  const handleMemberClick = (member: Profile) => {
    setSelectedMember(member);
    setProfileDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-1">
        <PageHeader 
          title="People" 
          description="Chapter members and alumni network"
        />
        {myProfile && <ProfileEditDialog profile={myProfile} />}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList className="h-9">
            <TabsTrigger value="members" className="gap-1.5 text-xs sm:text-sm px-3">
              <Users className="h-3.5 w-3.5" />
              Members
              <span className="text-muted-foreground font-normal ml-0.5">({totalMembers})</span>
            </TabsTrigger>
            <TabsTrigger value="alumni" className="gap-1.5 text-xs sm:text-sm px-3">
              <GraduationCap className="h-3.5 w-3.5" />
              Alumni
              <span className="text-muted-foreground font-normal ml-0.5">({totalAlumni})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4 mt-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="new_member">New Member</SelectItem>
                  <SelectItem value="pnm">PNM</SelectItem>
                </SelectContent>
              </Select>
              {isAdminOrOfficer && (
                <Button variant="outline" size="sm" onClick={handleExportMembers} className="h-9 px-2.5">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {statusFilter !== 'all' && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredMembers.length} of {totalMembers} · {activeMembers} active
            </p>
          )}

          {membersLoading ? (
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="h-20 animate-pulse bg-muted" />
              ))}
            </div>
          ) : filteredMembers.length > 0 ? (
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <div key={member.id} className="relative group">
                  <div onClick={() => handleMemberClick(member)} className="cursor-pointer active:scale-[0.98] transition-transform">
                    <MemberCard member={member} />
                  </div>
                  {isDeveloper && (
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AdminPositionsDialog member={member} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : members && members.length > 0 ? (
            <EmptyState icon={Search} title="No results found" description="Try adjusting your search or filters." />
          ) : (
            <EmptyState icon={Users} title="No members yet" description="Members will appear here once they sign up and join the chapter." />
          )}
        </TabsContent>

        {/* Alumni Tab */}
        <TabsContent value="alumni" className="space-y-4 mt-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search alumni..."
                value={alumniSearch}
                onChange={(e) => setAlumniSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry!}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1.5">
                {isAdminOrOfficer && (
                  <>
                    <AlumniImportDialog />
                    <AlumniForm />
                  </>
                )}
                <Button variant="outline" size="sm" onClick={handleExportAlumni} className="h-9 px-2.5">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {alumniLoading ? (
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="h-20 animate-pulse bg-muted" />
              ))}
            </div>
          ) : filteredAlumni.length > 0 ? (
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAlumni.map((alum) => (
                <AlumniCard key={alum.id} alumni={alum} />
              ))}
            </div>
          ) : alumni && alumni.length > 0 ? (
            <EmptyState icon={Search} title="No results found" description="Try adjusting your search or filters." />
          ) : (
            <EmptyState
              icon={GraduationCap}
              title="No alumni yet"
              description={isAdminOrOfficer 
                ? "Add alumni to build your network directory."
                : "Alumni network will appear here when added by officers."
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <MemberProfileDialog member={selectedMember} open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </AppLayout>
  );
}
