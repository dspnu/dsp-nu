import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Download, GraduationCap, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { MemberCard } from '@/core/members/components/MemberCard';
import { ProfileEditDialog } from '@/core/members/components/ProfileEditDialog';
import { MemberAdminActions } from '@/core/members/components/MemberAdminActions';
import { AlumniForm } from '@/features/alumni/components/AlumniForm';
import { AlumniCard } from '@/features/alumni/components/AlumniCard';
import { AlumniImportDialog } from '@/features/alumni/components/AlumniImportDialog';
import { useMembers, useMemberByUserId, useBulkSetMemberStatus, useSyncAlumniDirectory } from '@/core/members/hooks/useMembers';
import { useAlumni } from '@/features/alumni/hooks/useAlumni';
import { useAuth } from '@/core/auth/AuthContext';
import { org } from '@/config/org';
import { exportToCSV } from '@/lib/csv';
import { Constants, Enums } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';

type MemberStatus = Enums<'member_status'>;

const MEMBER_STATUSES = Constants.public.Enums.member_status;

function formatStatusLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function PeoplePage() {
  const { isAdmin, isAdminOrOfficer, isDeveloper, user } = useAuth();
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: alumni, isLoading: alumniLoading } = useAlumni();
  const { data: myProfile } = useMemberByUserId(user?.id || '');
  
  const [memberSearch, setMemberSearch] = useState('');
  const [alumniSearch, setAlumniSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('members');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState('');
  const bulkSetStatus = useBulkSetMemberStatus();

  const canManageAdminRoles =
    isAdmin || (org.superAdmins as readonly string[]).includes(user?.email?.toLowerCase() ?? '');
  const canBatchManage = isAdmin || isDeveloper;

  const directoryMembers = useMemo(
    () => (members ?? []).filter((member) => member.status !== 'alumni'),
    [members],
  );

  useSyncAlumniDirectory(members, alumniLoading ? undefined : alumni, canBatchManage);

  const filteredMembers = useMemo(() => {
    return directoryMembers.filter(member => {
      const matchesSearch = memberSearch === '' || 
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(memberSearch.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
        member.major?.toLowerCase().includes(memberSearch.toLowerCase());
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [directoryMembers, memberSearch, statusFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [memberSearch, statusFilter]);

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

  const totalMembers = directoryMembers.length;
  const activeMembers = directoryMembers.filter(m => m.status === 'active').length;
  const totalAlumni = alumni?.length || 0;

  const handleExportMembers = () => {
    if (directoryMembers.length === 0) return;
    exportToCSV(directoryMembers, 'members-directory');
  };

  const allVisibleSelected =
    filteredMembers.length > 0 && filteredMembers.every((member) => selectedIds.has(member.id));

  const toggleMember = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleVisibleMembers = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredMembers.forEach((member) => {
        if (checked) next.add(member.id);
        else next.delete(member.id);
      });
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBatchStatus('');
  };

  const applyBatchStatus = async () => {
    if (!batchStatus) return;
    const selectedMembers = directoryMembers.filter((member) => selectedIds.has(member.id));
    if (selectedMembers.length === 0) return;
    try {
      await bulkSetStatus.mutateAsync({
        members: selectedMembers,
        status: batchStatus as MemberStatus,
      });
    } catch {
      return;
    }
    clearSelection();
    if (batchStatus === 'alumni') setActiveTab('alumni');
  };

  const handleExportAlumni = () => {
    if (!alumni) return;
    exportToCSV(alumni, 'alumni-directory');
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
                aria-label="Search members"
                type="search"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-9 text-sm" aria-label="Filter by member status">
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
                <Button variant="outline" size="sm" onClick={handleExportMembers} className="h-9 px-2.5" aria-label="Export members as CSV">
                  <Download className="h-3.5 w-3.5" aria-hidden />
                </Button>
              )}
            </div>
          </div>

          {canBatchManage && selectedIds.size > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    allVisibleSelected
                      ? true
                      : filteredMembers.some((member) => selectedIds.has(member.id))
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(checked) => toggleVisibleMembers(checked === true)}
                  aria-label="Select all visible members"
                />
                <button
                  type="button"
                  className="text-sm"
                  onClick={() => toggleVisibleMembers(!allVisibleSelected)}
                >
                  Select all
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <Select value={batchStatus || undefined} onValueChange={setBatchStatus}>
                  <SelectTrigger className="w-40 h-9 text-sm" aria-label="Batch status">
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9"
                  disabled={!batchStatus || bulkSetStatus.isPending}
                  onClick={applyBatchStatus}
                >
                  {bulkSetStatus.isPending ? 'Updating...' : 'Apply'}
                </Button>
                <Button size="sm" variant="ghost" className="h-9" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}

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
              {filteredMembers.map((member) => {
                const selected = selectedIds.has(member.id);
                const selectionActive = selectedIds.size > 0;
                const showAdminActions = !selectionActive && (canManageAdminRoles || isDeveloper);
                return (
                <div key={member.id} className="group relative">
                  <Link
                    to={`/people/${member.id}`}
                    className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] transition-transform"
                  >
                    <MemberCard
                      member={member}
                      reserveActionSpace={showAdminActions || (canBatchManage && selectionActive)}
                      className={cn(selected && 'border-primary/40 bg-primary/5 hover:bg-primary/10')}
                    />
                  </Link>
                  {canBatchManage && (
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${selected ? 'Deselect' : 'Select'} ${member.first_name} ${member.last_name}`}
                      onClick={() => toggleMember(member.id, !selected)}
                      className={cn(
                        'absolute top-2 right-2 z-20 flex h-5 w-5 items-center justify-center rounded-full border shadow-sm transition-opacity',
                        'border-foreground/20 bg-background/95 text-primary-foreground',
                        'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
                        '[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100',
                        selectionActive && 'pointer-events-auto opacity-100',
                        selected ? 'border-primary bg-primary' : 'hover:border-foreground/40',
                      )}
                    >
                      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>
                  )}
                  {showAdminActions && (
                    <MemberAdminActions
                      member={member}
                      canManageAdminRoles={canManageAdminRoles}
                      canManagePositions={isDeveloper}
                      className={canBatchManage ? 'group-hover:right-9' : undefined}
                    />
                  )}
                </div>
                );
              })}
            </div>
          ) : directoryMembers.length > 0 ? (
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
                aria-label="Search alumni"
                type="search"
              />
            </div>
            <div className="flex gap-2">
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-full sm:w-36 h-9 text-sm" aria-label="Filter alumni by industry">
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
                <Button variant="outline" size="sm" onClick={handleExportAlumni} className="h-9 px-2.5" aria-label="Export alumni as CSV">
                  <Download className="h-3.5 w-3.5" aria-hidden />
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
    </AppLayout>
  );
}
