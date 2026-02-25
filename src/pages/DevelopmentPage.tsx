import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Search, Coffee, FolderOpen, FileText, Folder, AlertCircle } from 'lucide-react';
import { useJobs, useJobBookmarks } from '@/hooks/useJobs';
import { useMyCoffeeChats, useCoffeeChats } from '@/hooks/useCoffeeChats';
import { useResources } from '@/hooks/useResources';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { JobForm } from '@/components/jobs/JobForm';
import { JobCard } from '@/components/jobs/JobCard';
import { CoffeeChatForm } from '@/components/coffee-chats/CoffeeChatForm';
import { CoffeeChatCard } from '@/components/coffee-chats/CoffeeChatCard';
import { CoffeeChatDashboard } from '@/components/coffee-chats/CoffeeChatDashboard';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { ResourceCard } from '@/components/resources/ResourceCard';

const jobTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'internship', label: 'Internship' },
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
];

const FOLDER_ICONS: Record<string, string> = {
  General: '📁',
  Forms: '📋',
  Bylaws: '📜',
  Templates: '📝',
  Training: '🎓',
  Marketing: '📢',
};

export default function DevelopmentPage() {
  const { user, profile, isAdminOrOfficer } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: myChats, isLoading: chatsLoading } = useMyCoffeeChats();
  const { data: allChats } = useCoffeeChats();
  const { data: resources, isLoading: resourcesLoading } = useResources();
  const { data: members } = useMembers();
  const { bookmarks, toggleBookmark } = useJobBookmarks(user?.id ?? '');
  
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobSearch, setJobSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resourceSearch, setResourceSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');

  // Active members see coffee chats here; new members/VPs use PDP instead
  const isNewMember = profile?.status === 'new_member';
  const isVP = profile?.positions?.includes('VP of New Member Development') ||
    profile?.positions?.includes('VP of Pledge Education') ||
    profile?.positions?.includes('VP of New Member Education');

  // Job filtering
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

  const getMemberName = (userId: string) => {
    const member = members?.find(m => m.user_id === userId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const pendingConfirmations = myChats?.filter(
    c => c.status === 'emailed' && c.partner_id === user?.id
  ) || [];

  // Resource filtering
  const folders = useMemo(() => {
    if (!resources) return [];
    const uniqueFolders = [...new Set(resources.map(r => r.folder))];
    return uniqueFolders.sort();
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
      if (!groups[resource.folder]) {
        groups[resource.folder] = [];
      }
      groups[resource.folder].push(resource);
    });
    return groups;
  }, [filteredResources]);

  return (
    <AppLayout>
      <PageHeader 
        title="Development" 
        description="Professional growth and career resources"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="jobs" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="coffee-chats" className="gap-2">
            <Coffee className="h-4 w-4" />
            Coffee Chats
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <div className="flex justify-end">
            {isAdminOrOfficer && <JobForm />}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, or tags..."
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {jobTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
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
                  <EmptyState
                    icon={Briefcase}
                    title="No job postings"
                    description="Job and internship opportunities will appear here."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        isBookmarked={bookmarks.includes(job.id)}
                        onToggleBookmark={() => toggleBookmark(job.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="bookmarked" className="mt-4">
                {bookmarkedJobs.length === 0 ? (
                  <EmptyState
                    icon={Briefcase}
                    title="No saved jobs"
                    description="Bookmark jobs to save them for later."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {bookmarkedJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        isBookmarked={true}
                        onToggleBookmark={() => toggleBookmark(job.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        {/* Coffee Chats Tab — for active members, shows their chats + engagement table */}
        <TabsContent value="coffee-chats" className="space-y-8">
          {/* Pending Confirmations */}
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
                    <CoffeeChatCard
                      key={chat.id}
                      chat={chat}
                      partnerName={getMemberName(chat.partner_id)}
                      initiatorName={getMemberName(chat.initiator_id)}
                      isOfficer={isAdminOrOfficer}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* My Chats */}
          <section>
            <Tabs defaultValue="mine" className="space-y-4">
              <TabsList>
                <TabsTrigger value="mine">My Chats</TabsTrigger>
                {isAdminOrOfficer && <TabsTrigger value="all">All Chats</TabsTrigger>}
              </TabsList>

              <TabsContent value="mine">
                {chatsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3].map(i => (
                      <Card key={i} className="h-32 animate-pulse bg-muted" />
                    ))}
                  </div>
                ) : myChats && myChats.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myChats.map((chat) => (
                      <CoffeeChatCard
                        key={chat.id}
                        chat={chat}
                        partnerName={getMemberName(chat.partner_id)}
                        initiatorName={getMemberName(chat.initiator_id)}
                        isOfficer={isAdminOrOfficer}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Coffee}
                    title="No coffee chats yet"
                    description="Coffee chats you've been invited to will appear here."
                  />
                )}
              </TabsContent>

              {isAdminOrOfficer && (
                <TabsContent value="all">
                  {allChats && allChats.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {allChats.map((chat) => (
                        <CoffeeChatCard
                          key={chat.id}
                          chat={chat}
                          partnerName={getMemberName(chat.partner_id)}
                          initiatorName={getMemberName(chat.initiator_id)}
                          isOfficer={isAdminOrOfficer}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Coffee}
                      title="No coffee chats logged"
                      description="Coffee chats from all members will appear here."
                    />
                  )}
                </TabsContent>
              )}
            </Tabs>
          </section>

          {/* Active Member Engagement table — visible to all */}
          <CoffeeChatDashboard />
        </TabsContent>

        {/* Resources Tab */}
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
            {isAdminOrOfficer && <ResourceForm />}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={resourceSearch}
              onChange={(e) => setResourceSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {resourcesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="h-20 animate-pulse bg-muted" />
              ))}
            </div>
          ) : resources && resources.length > 0 ? (
            <Tabs value={activeFolder} onValueChange={setActiveFolder} className="space-y-4">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all">All</TabsTrigger>
                {folders.map((folder) => (
                  <TabsTrigger key={folder} value={folder}>
                    <span className="mr-1">{FOLDER_ICONS[folder] || '📁'}</span>
                    {folder}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all" className="space-y-6">
                {Object.entries(groupedResources).map(([folder, folderResources]) => (
                  <div key={folder}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <span>{FOLDER_ICONS[folder] || '📁'}</span>
                      {folder}
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
            <EmptyState
              icon={FolderOpen}
              title="No resources yet"
              description={isAdminOrOfficer 
                ? "Add documents and files for the chapter to access."
                : "Chapter resources will appear here when added by officers."
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
