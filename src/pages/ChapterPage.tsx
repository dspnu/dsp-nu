import { useState, useMemo, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Award, Download, TrendingUp, Check, Clock, Plus, DollarSign,
  Shield, Trophy, Target, ChevronRight, Users, Briefcase, Coffee,
  FolderOpen, FileText, Folder, Search, AlertCircle, UserCheck, Camera, Image, X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMembers, useMemberPoints } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV } from '@/lib/csv';
import { GrantPointsDialog } from '@/components/points/GrantPointsDialog';
import { useServiceHours, useLogServiceHours, useAllServiceHours, useVerifyServiceHours } from '@/hooks/useServiceHours';
import { useAllDues, useRecordDues } from '@/hooks/useDues';
import { useJobs, useJobBookmarks, useApproveJob } from '@/hooks/useJobs';
import { useMyCoffeeChats, useCoffeeChats } from '@/hooks/useCoffeeChats';
import { useApproveResource, useResources } from '@/hooks/useResources';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { useIsVPChapterOps } from '@/hooks/useEOPRealtime';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { JobForm } from '@/components/jobs/JobForm';
import { JobCard } from '@/components/jobs/JobCard';
import { CoffeeChatForm } from '@/components/coffee-chats/CoffeeChatForm';
import { CoffeeChatCard } from '@/components/coffee-chats/CoffeeChatCard';
import { CoffeeChatDashboard } from '@/components/coffee-chats/CoffeeChatDashboard';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { VPChapterOpsDashboard } from '@/components/admin/VPChapterOpsDashboard';
import { VPCommunityServiceDashboard } from '@/components/admin/VPCommunityServiceDashboard';
import { VPProfessionalActivitiesDashboard } from '@/components/admin/VPProfessionalActivitiesDashboard';
import { VPScholarshipDashboard } from '@/components/admin/VPScholarshipDashboard';
import { PresidentDashboard } from '@/components/admin/PresidentDashboard';
import { VPFinanceDashboard } from '@/components/admin/VPFinanceDashboard';
import { ChancellorDashboard } from '@/components/admin/ChancellorDashboard';
import { org, allCategories } from '@/config/org';

const categories = allCategories;
const POINTS_REQUIREMENT = org.standing.minPoints;
const SERVICE_HOURS_REQUIREMENT = org.standing.minServiceHours;

const jobTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'internship', label: 'Internship' },
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
];

const FOLDER_ICONS: Record<string, string> = {
  General: '📁', Forms: '📋', Bylaws: '📜', Templates: '📝', Training: '🎓', Marketing: '📢',
};

export default function ChapterPage() {
  const { user, profile, isAdminOrOfficer } = useAuth();
  const { isVPChapterOps } = useIsVPChapterOps();
  const { data: members } = useMembers();
  const { data: myPoints } = useMemberPoints(user?.id ?? '');
  const { data: myHours = [] } = useServiceHours(user?.id);
  const { data: allHours = [] } = useAllServiceHours();
  const verifyHours = useVerifyServiceHours();
  const logHours = useLogServiceHours();
  const { data: allDues = [] } = useAllDues();
  const recordDues = useRecordDues();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const approveJob = useApproveJob();
  const { data: myChats, isLoading: chatsLoading } = useMyCoffeeChats();
  const { data: allChats } = useCoffeeChats();
  const { data: resources, isLoading: resourcesLoading } = useResources();
  const approveResource = useApproveResource();
  const { bookmarks, toggleBookmark } = useJobBookmarks(user?.id ?? '');
  const { data: eopVisible } = useChapterSetting('eop_visible');
  const isVPScholarship = profile?.positions?.includes('VP of Scholarship & Awards') || false;
  const isVPCommunityService = profile?.positions?.includes('VP of Community Service') || false;
  const isVPProfessionalActivities = profile?.positions?.includes('VP of Professional Activities') || false;
  const isPresident = profile?.positions?.includes('President') || false;
  const isVPFinance = profile?.positions?.includes('VP Finance') || profile?.positions?.includes('VP of Finance') || false;
  const isChancellor = profile?.positions?.includes('Chancellor') || false;
  const hasExecPosition = (profile?.positions?.length ?? 0) > 0;

  const [activeTab, setActiveTab] = useState('standing');
  const [jobSearch, setJobSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resourceSearch, setResourceSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');
  const [logHoursOpen, setLogHoursOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [servicePhoto, setServicePhoto] = useState<File | null>(null);
  const [servicePhotoPreview, setServicePhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch {
      toast.error('Could not access camera');
    }
  }, []);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setServicePhoto(file);
        setServicePhotoPreview(URL.createObjectURL(file));
      }
      closeCamera();
    }, 'image/jpeg', 0.85);
  }, [closeCamera]);
  const [duesOpen, setDuesOpen] = useState(false);
  const [duesUserId, setDuesUserId] = useState('');
  const [duesAmount, setDuesAmount] = useState('');
  const [duesSemester, setDuesSemester] = useState('');
  const [duesNotes, setDuesNotes] = useState('');

  // ---- Points / Leaderboard ----
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

  // Family Games data
  const { data: familyWeights = [] } = useQuery({
    queryKey: ['family-game-weights'],
    queryFn: async () => {
      const { data, error } = await supabase.from('family_game_weights').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: familyBonusPoints = [] } = useQuery({
    queryKey: ['family-bonus-points'],
    queryFn: async () => {
      const { data, error } = await supabase.from('family_bonus_points').select('*');
      if (error) throw error;
      return data;
    },
  });

  const SCORED_CATEGORIES = org.scoredCategories;

  // Family-based leaderboard with weighted scoring
  const familyTotals = useMemo(() => {
    if (!members || !allPoints) return [];
    const activeMembers = members.filter(m => m.status === 'active' || m.status === 'new_member');
    const familyMap: Record<string, { family: string; score: number; memberCount: number }> = {};

    // Group members by family
    const familyMembers: Record<string, typeof activeMembers> = {};
    activeMembers.forEach(member => {
      const family = member.family || 'Unassigned';
      if (!familyMembers[family]) familyMembers[family] = [];
      familyMembers[family].push(member);
    });

    // Calculate weighted score per family
    Object.entries(familyMembers).forEach(([family, fMembers]) => {
      const totalInFamily = fMembers.length;
      let score = 0;

      SCORED_CATEGORIES.forEach(cat => {
        const weight = familyWeights.find(w => w.category === cat);
        const weightValue = weight ? Number(weight.weight) : 1;
        const membersWithPoint = fMembers.filter(m =>
          allPoints.some(p => p.user_id === m.user_id && p.category === cat && p.points > 0)
        ).length;
        score += (membersWithPoint / totalInFamily) * weightValue;
      });

      // Add bonus points
      const bonus = familyBonusPoints
        .filter(bp => bp.family_name === family)
        .reduce((sum, bp) => sum + bp.points, 0);
      score += bonus;

      familyMap[family] = { family, score, memberCount: totalInFamily };
    });

    return Object.values(familyMap).sort((a, b) => b.score - a.score);
  }, [members, allPoints, familyWeights, familyBonusPoints]);

  const myTotal = myPoints?.reduce((sum, p) => sum + p.points, 0) ?? 0;
  const myByCategory = myPoints?.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.points;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const myTotalHours = myHours.reduce((sum, h) => sum + Number(h.hours), 0);
  const myVerifiedHours = myHours.filter(h => h.verified).reduce((sum, h) => sum + Number(h.hours), 0);
  const myPendingHours = myTotalHours - myVerifiedHours;
  const myFamily = profile?.family || 'Unassigned';
  const myFamilyRank = familyTotals.findIndex(f => f.family === myFamily) + 1;

  const pendingServiceHours = allHours.filter(h => !h.verified);
  const pendingJobs = jobs?.filter(job => !job.is_approved) ?? [];
  const pendingResources: any[] = [];
  const totalMembersCount = members?.length || 0;

  const getMemberName = (userId: string) => {
    const member = members?.find(m => m.user_id === userId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const pointsProgress = Math.min((myTotal / POINTS_REQUIREMENT) * 100, 100);
  const hoursProgress = Math.min((myVerifiedHours / SERVICE_HOURS_REQUIREMENT) * 100, 100);
  const isGoodStanding = myTotal >= POINTS_REQUIREMENT && myVerifiedHours >= SERVICE_HOURS_REQUIREMENT;

  // ---- Jobs ----
  const filteredJobs = jobs?.filter(job => {
    const matchesSearch =
      job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.company.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.description?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.tags?.some(tag => tag.toLowerCase().includes(jobSearch.toLowerCase()));
    const matchesType = typeFilter === 'all' || job.job_type === typeFilter;
    return matchesSearch && matchesType;
  }) ?? [];
  const bookmarkedJobs = filteredJobs.filter(job => bookmarks.includes(job.id));

  // ---- Coffee Chats ----
  const pendingConfirmations = myChats?.filter(
    c => c.status === 'emailed' && c.partner_id === user?.id
  ) || [];

  // ---- Resources ----
  const folders = useMemo(() => {
    if (!resources) return [];
    return [...new Set(resources.map(r => r.folder))].sort();
  }, [resources]);

  const filteredResources = useMemo(() => {
    if (!resources) return [];
    return resources.filter(resource => {
      const matchesSearch = resourceSearch === '' ||
        resource.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        resource.description?.toLowerCase().includes(resourceSearch.toLowerCase());
      const matchesFolder = activeFolder === 'all' || resource.folder === activeFolder;
      return matchesSearch && matchesFolder;
    });
  }, [resources, resourceSearch, activeFolder]);

  const groupedResources = useMemo(() => {
    const groups: Record<string, typeof filteredResources> = {};
    filteredResources.forEach(resource => {
      if (!groups[resource.folder]) groups[resource.folder] = [];
      groups[resource.folder].push(resource);
    });
    return groups;
  }, [filteredResources]);

  // ---- Handlers ----
  const handleExportPoints = () => {
    if (!familyTotals) return;
    const exportData = familyTotals.map(({ family, score, memberCount }) => ({
      Family: family,
      Score: score.toFixed(1),
      Members: memberCount,
    }));
    exportToCSV(exportData, 'family-games-report');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setServicePhoto(file);
      setServicePhotoPreview(URL.createObjectURL(file));
    }
  };

  const clearPhoto = () => {
    setServicePhoto(null);
    if (servicePhotoPreview) URL.revokeObjectURL(servicePhotoPreview);
    setServicePhotoPreview(null);
  };

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !hours || !description || !serviceDate) return;

    let photo_url: string | undefined;

    if (servicePhoto) {
      setUploadingPhoto(true);
      const ext = servicePhoto.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('service-hours-photos')
        .upload(path, servicePhoto);
      setUploadingPhoto(false);
      if (uploadError) {
        toast.error('Failed to upload photo');
        return;
      }
      const { data: urlData } = supabase.storage
        .from('service-hours-photos')
        .getPublicUrl(path);
      photo_url = urlData.publicUrl;
    }

    logHours.mutate({
      user_id: user.id,
      hours: parseFloat(hours),
      description,
      service_date: serviceDate,
      photo_url,
    }, {
      onSuccess: () => {
        setLogHoursOpen(false);
        setHours('');
        setDescription('');
        setServiceDate('');
        clearPhoto();
      }
    });
  };

  const handleVerify = (id: string) => {
    if (!user?.id) return;
    verifyHours.mutate({ id, verified_by: user.id });
  };

  const handleRecordDues = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !duesUserId || !duesAmount || !duesSemester) return;
    recordDues.mutate({
      user_id: duesUserId,
      amount: parseFloat(duesAmount),
      semester: duesSemester,
      notes: duesNotes || undefined,
      created_by: user.id,
    }, {
      onSuccess: () => {
        setDuesOpen(false);
        setDuesUserId('');
        setDuesAmount('');
        setDuesSemester('');
        setDuesNotes('');
      }
    });
  };

  const showAdminTab = hasExecPosition || isAdminOrOfficer;
  const tabCount = 4 + (showAdminTab ? 1 : 0);

  return (
    <AppLayout>
      <PageHeader
        title="Chapter"
        description="Your one-stop hub for chapter life"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`w-full max-w-2xl grid`} style={{ gridTemplateColumns: `repeat(${tabCount}, 1fr)` }}>
          <TabsTrigger value="standing" className="gap-2">
            <Award className="h-4 w-4 hidden sm:block" />
            Standing
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2">
            <Briefcase className="h-4 w-4 hidden sm:block" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="coffee-chats" className="gap-2">
            <Coffee className="h-4 w-4 hidden sm:block" />
            Coffee Chats
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <FolderOpen className="h-4 w-4 hidden sm:block" />
            Resources
          </TabsTrigger>
          {showAdminTab && (
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4 hidden sm:block" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        {/* ========== JOBS TAB ========== */}
        <TabsContent value="jobs" className="space-y-6">
          <div className="flex justify-end">
            <JobForm />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search jobs, companies, or tags..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
              <SelectContent>
                {jobTypes.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {jobsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Jobs ({filteredJobs.length})</TabsTrigger>
                <TabsTrigger value="bookmarked">Saved ({bookmarkedJobs.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                {filteredJobs.length === 0 ? (
                  <EmptyState icon={Briefcase} title="No job postings" description="Job and internship opportunities will appear here." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredJobs.map((job) => (
                      <JobCard key={job.id} job={job} isBookmarked={bookmarks.includes(job.id)} onToggleBookmark={() => toggleBookmark(job.id)} />
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="bookmarked" className="mt-4">
                {bookmarkedJobs.length === 0 ? (
                  <EmptyState icon={Briefcase} title="No saved jobs" description="Bookmark jobs to save them for later." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {bookmarkedJobs.map((job) => (
                      <JobCard key={job.id} job={job} isBookmarked={true} onToggleBookmark={() => toggleBookmark(job.id)} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        {/* ========== COFFEE CHATS TAB ========== */}
        <TabsContent value="coffee-chats" className="space-y-8">
          {pendingConfirmations.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Waiting for Your Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingConfirmations.map((chat) => (
                    <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <section>
            <Tabs defaultValue="mine" className="space-y-4">
              <TabsList>
                <TabsTrigger value="mine">My Chats</TabsTrigger>
                {isAdminOrOfficer && <TabsTrigger value="all">All Chats</TabsTrigger>}
              </TabsList>
              <TabsContent value="mine">
                {chatsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3].map(i => (<Card key={i} className="h-32 animate-pulse bg-muted" />))}</div>
                ) : myChats && myChats.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myChats.map((chat) => (
                      <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Coffee} title="No coffee chats yet" description="Coffee chats you've been invited to will appear here." />
                )}
              </TabsContent>
              {isAdminOrOfficer && (
                <TabsContent value="all">
                  {allChats && allChats.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {allChats.map((chat) => (
                        <CoffeeChatCard key={chat.id} chat={chat} partnerName={getMemberName(chat.partner_id)} initiatorName={getMemberName(chat.initiator_id)} isOfficer={isAdminOrOfficer} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={Coffee} title="No coffee chats logged" description="Coffee chats from all members will appear here." />
                  )}
                </TabsContent>
              )}
            </Tabs>
          </section>
          <CoffeeChatDashboard />
        </TabsContent>

        {/* ========== STANDING TAB ========== */}
        <TabsContent value="standing" className="space-y-5">
          {/* Compact status + stats row */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isGoodStanding ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
              {isGoodStanding ? <Check className="h-4 w-4 text-emerald-600" /> : <Target className="h-4 w-4 text-amber-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {isGoodStanding ? 'Good Standing' : 'In Progress'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isGoodStanding
                  ? 'All requirements met'
                  : `${POINTS_REQUIREMENT - myTotal > 0 ? `${POINTS_REQUIREMENT - myTotal} pts` : ''}${POINTS_REQUIREMENT - myTotal > 0 && SERVICE_HOURS_REQUIREMENT - myVerifiedHours > 0 ? ' & ' : ''}${SERVICE_HOURS_REQUIREMENT - myVerifiedHours > 0 ? `${(SERVICE_HOURS_REQUIREMENT - myVerifiedHours).toFixed(1)} hrs remaining` : ''}`
                }
              </p>
            </div>
            {myFamilyRank > 0 && (
              <div className="text-right shrink-0 pl-2 border-l border-border/60">
                <p className="text-lg font-bold text-primary">#{myFamilyRank}</p>
                <p className="text-[10px] text-muted-foreground">Family</p>
              </div>
            )}
          </div>

          {/* Points + Service in one card */}
          <Card className="border-border/60">
            <CardContent className="p-0">
              {/* Points section */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Points</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{myTotal}</span>
                    <span className="text-xs text-muted-foreground">/ {POINTS_REQUIREMENT}</span>
                  </div>
                </div>
                <Progress value={pointsProgress} className="h-1.5 mb-3" />
                <div className="flex flex-wrap gap-1.5">
                  {categories.filter(c => c !== 'new_member').map(cat => {
                    const earned = (myByCategory[cat] || 0) >= 1;
                    return (
                      <Badge
                        key={cat}
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 capitalize ${
                          earned
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'text-muted-foreground border-border/60'
                        }`}
                      >
                        {earned && <Check className="h-2.5 w-2.5 mr-0.5" />}
                        {cat === 'dei' ? 'DE&I' : cat}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* Service hours section */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Service Hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {myVerifiedHours >= SERVICE_HOURS_REQUIREMENT ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/20 text-xs">
                        <Check className="h-2.5 w-2.5 mr-1" />Done
                      </Badge>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{myVerifiedHours.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">/ {SERVICE_HOURS_REQUIREMENT}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Progress value={hoursProgress} className="h-1.5 mb-3" />
                <div className="flex items-center justify-between">
                  {myPendingHours > 0 && (
                    <span className="text-xs text-amber-600">
                      {myPendingHours.toFixed(1)} hrs pending
                    </span>
                  )}
                  <Dialog open={logHoursOpen} onOpenChange={setLogHoursOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="ml-auto h-7 text-xs gap-1.5">
                        <Plus className="h-3 w-3" />Log Hours
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Log Service Hours</DialogTitle></DialogHeader>
                      <form onSubmit={handleLogHours} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="hours">Hours</Label>
                            <Input id="hours" type="number" step="0.5" min="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2.5" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">What did you do?</Label>
                          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the service activity..." required />
                        </div>
                        <div className="space-y-2">
                          <Label>Photo Proof (optional)</Label>
                          {servicePhotoPreview ? (
                            <div className="relative">
                              <img src={servicePhotoPreview} alt="Service proof" className="w-full h-40 object-cover rounded-md border" />
                              <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={clearPhoto}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : cameraOpen ? (
                            <div className="relative rounded-md overflow-hidden border">
                              <video ref={videoRef} autoPlay playsInline muted className="w-full h-48 object-cover" />
                              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                                <Button type="button" size="sm" onClick={capturePhoto} className="gap-1">
                                  <Camera className="h-4 w-4" />Capture
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={closeCamera}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => document.getElementById('service-photo-upload')?.click()}>
                                <Image className="h-4 w-4" />Upload
                              </Button>
                              <Button type="button" variant="outline" className="flex-1 gap-2" onClick={openCamera}>
                                <Camera className="h-4 w-4" />Camera
                              </Button>
                              <input id="service-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                            </div>
                          )}
                        </div>
                        <Button type="submit" className="w-full" disabled={logHours.isPending || uploadingPhoto}>
                          {uploadingPhoto ? 'Uploading photo...' : logHours.isPending ? 'Submitting...' : 'Submit for Verification'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Points + Family Leaderboard side by side */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Recent Points */}
            <div className="space-y-2.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent Activity</span>
              {myPoints && myPoints.length > 0 ? (
                <div className="space-y-1">
                  {myPoints.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <CategoryBadge category={entry.category} />
                      <span className="text-sm flex-1 min-w-0 truncate">{entry.reason}</span>
                      <span className={`text-xs font-semibold tabular-nums ${entry.points > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {entry.points > 0 ? '+' : ''}{entry.points}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No points earned yet</p>
              )}
            </div>

            {/* Family Leaderboard */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />Family Games
                </span>
                {isAdminOrOfficer && (
                  <Button variant="ghost" size="sm" onClick={handleExportPoints} className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground">
                    <Download className="h-3 w-3" />Export
                  </Button>
                )}
              </div>
              {familyTotals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No family data yet</p>
              ) : (
                <div className="space-y-1">
                  {familyTotals.slice(0, 8).map(({ family, score, memberCount }, index) => {
                    const isMyFamily = family === myFamily;
                    return (
                      <div
                        key={family}
                        className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${isMyFamily ? 'bg-primary/5 ring-1 ring-primary/15' : 'hover:bg-muted/40'}`}
                      >
                        <span className={`w-5 text-center text-xs font-bold tabular-nums ${
                          index === 0 ? 'text-amber-500' :
                          index === 1 ? 'text-muted-foreground' :
                          index === 2 ? 'text-amber-700' :
                          'text-muted-foreground/60'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {family}
                            {isMyFamily && <span className="text-primary text-xs ml-1">•</span>}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{memberCount}m</span>
                        <span className="text-sm font-semibold tabular-nums w-12 text-right">{score.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ========== RESOURCES TAB ========== */}
        <TabsContent value="resources" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="grid gap-4 md:grid-cols-2 flex-1 mr-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{resources?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Resources</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Folder className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{folders.length}</p>
                    <p className="text-sm text-muted-foreground">Folders</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <ResourceForm />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search resources..." value={resourceSearch} onChange={(e) => setResourceSearch(e.target.value)} className="pl-9" />
          </div>
          {resourcesLoading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => (<Card key={i} className="h-20 animate-pulse bg-muted" />))}</div>
          ) : resources && resources.length > 0 ? (
            <Tabs value={activeFolder} onValueChange={setActiveFolder} className="space-y-4">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all">All</TabsTrigger>
                {folders.map((folder) => (
                  <TabsTrigger key={folder} value={folder}>
                    <span className="mr-1">{FOLDER_ICONS[folder] || '📁'}</span>{folder}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all" className="space-y-6">
                {Object.entries(groupedResources).map(([folder, folderResources]) => (
                  <div key={folder}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <span>{FOLDER_ICONS[folder] || '📁'}</span>{folder}
                      <span className="text-xs">({folderResources.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {folderResources.map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} isOfficer={isAdminOrOfficer} />
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
              {folders.map((folder) => (
                <TabsContent key={folder} value={folder} className="space-y-3">
                  {groupedResources[folder]?.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} isOfficer={isAdminOrOfficer} />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <EmptyState icon={FolderOpen} title="No resources yet" description={isAdminOrOfficer ? "Add documents and files for the chapter to access." : "Chapter resources will appear here when added by officers."} />
          )}
        </TabsContent>

        {/* ========== ADMIN TAB ========== */}
        {showAdminTab && (
          <TabsContent value="admin" className="space-y-8">
            {/* Each officer only sees their own dashboard */}
            {isVPChapterOps && <VPChapterOpsDashboard />}
            {isVPCommunityService && <VPCommunityServiceDashboard />}
            {isVPProfessionalActivities && <VPProfessionalActivitiesDashboard />}
            {isVPScholarship && <VPScholarshipDashboard />}
            {isPresident && <PresidentDashboard />}
            {isVPFinance && <VPFinanceDashboard />}
            {isChancellor && <ChancellorDashboard />}

          </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}
