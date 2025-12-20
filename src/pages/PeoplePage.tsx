import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Download, GraduationCap, Building2 } from 'lucide-react';
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

type Profile = Tables<'profiles'>;

export default function PeoplePage() {
  const { isAdminOrOfficer, user } = useAuth();
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

  // Filter members
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

  // Get unique industries
  const industries = useMemo(() => {
    if (!alumni) return [];
    const uniqueIndustries = [...new Set(alumni.map(a => a.industry).filter(Boolean))];
    return uniqueIndustries.sort();
  }, [alumni]);

  // Filter alumni
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

  // Stats
  const totalMembers = members?.length || 0;
  const activeMembers = members?.filter(m => m.status === 'active').length || 0;
  const totalAlumni = alumni?.length || 0;
  const uniqueCompanies = new Set(alumni?.map(a => a.company).filter(Boolean)).size;

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
      <PageHeader 
        title="People" 
        description="Chapter members and alumni network"
      >
        {myProfile && <ProfileEditDialog profile={myProfile} />}
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="alumni" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Alumni
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalMembers}</p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeMembers}</p>
                  <p className="text-sm text-muted-foreground">Active Members</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or major..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="new_mem">New Member</SelectItem>
                <SelectItem value="shiny">Shiny</SelectItem>
                <SelectItem value="pnm">PNM</SelectItem>
              </SelectContent>
            </Select>
            {isAdminOrOfficer && (
              <Button variant="outline" onClick={handleExportMembers}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>

          {/* Members Grid */}
          {membersLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="h-48 animate-pulse bg-muted" />
              ))}
            </div>
          ) : filteredMembers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <div key={member.id} className="relative group">
                  <div onClick={() => handleMemberClick(member)} className="cursor-pointer">
                    <MemberCard member={member} />
                  </div>
                  {isAdminOrOfficer && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AdminPositionsDialog member={member} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : members && members.length > 0 ? (
            <EmptyState
              icon={Search}
              title="No results found"
              description="Try adjusting your search or filters."
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Members will appear here once they sign up and join the chapter."
            />
          )}
        </TabsContent>

        {/* Alumni Tab */}
        <TabsContent value="alumni" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalAlumni}</p>
                  <p className="text-sm text-muted-foreground">Alumni</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueCompanies}</p>
                  <p className="text-sm text-muted-foreground">Companies</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, or title..."
                value={alumniSearch}
                onChange={(e) => setAlumniSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry!}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              {isAdminOrOfficer && (
                <>
                  <AlumniImportDialog />
                  <AlumniForm />
                </>
              )}
              <Button variant="outline" onClick={handleExportAlumni}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Alumni Grid */}
          {alumniLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="h-48 animate-pulse bg-muted" />
              ))}
            </div>
          ) : filteredAlumni.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAlumni.map((alum) => (
                <AlumniCard key={alum.id} alumni={alum} />
              ))}
            </div>
          ) : alumni && alumni.length > 0 ? (
            <EmptyState
              icon={Search}
              title="No results found"
              description="Try adjusting your search or filters."
            />
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

      {/* Member Profile Dialog */}
      <MemberProfileDialog
        member={selectedMember}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />
    </AppLayout>
  );
}
