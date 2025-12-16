import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Search, FileText, Folder } from 'lucide-react';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { useResources } from '@/hooks/useResources';
import { useAuth } from '@/contexts/AuthContext';

const FOLDER_ICONS: Record<string, string> = {
  General: '📁',
  Forms: '📋',
  Bylaws: '📜',
  Templates: '📝',
  Training: '🎓',
  Marketing: '📢',
};

export default function ResourcesPage() {
  const { isAdminOrOfficer } = useAuth();
  const { data: resources, isLoading } = useResources();
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');

  // Get unique folders
  const folders = useMemo(() => {
    if (!resources) return [];
    const uniqueFolders = [...new Set(resources.map(r => r.folder))];
    return uniqueFolders.sort();
  }, [resources]);

  // Filter resources
  const filteredResources = useMemo(() => {
    if (!resources) return [];
    return resources.filter(resource => {
      const matchesSearch = search === '' || 
        resource.title.toLowerCase().includes(search.toLowerCase()) ||
        resource.description?.toLowerCase().includes(search.toLowerCase());
      
      const matchesFolder = activeFolder === 'all' || resource.folder === activeFolder;
      
      return matchesSearch && matchesFolder;
    });
  }, [resources, search, activeFolder]);

  // Group resources by folder
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

  // Stats
  const totalResources = resources?.length || 0;
  const folderCount = folders.length;

  return (
    <AppLayout>
      <PageHeader 
        title="Resources" 
        description="Chapter documents and files"
      >
        {isAdminOrOfficer && <ResourceForm />}
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalResources}</p>
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
              <p className="text-2xl font-bold">{folderCount}</p>
              <p className="text-sm text-muted-foreground">Folders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
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
    </AppLayout>
  );
}
