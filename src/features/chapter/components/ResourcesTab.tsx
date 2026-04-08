import { useState, useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { FolderOpen, FileText, Folder, Search } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthContext';
import { useResources } from '@/features/resources/hooks/useResources';
import { ResourceForm } from '@/features/resources/components/ResourceForm';
import { ResourceCard } from '@/features/resources/components/ResourceCard';

const FOLDER_ICONS: Record<string, string> = {
  General: '📁', Forms: '📋', Bylaws: '📜', Templates: '📝', Training: '🎓', Marketing: '📢',
};

export function ResourcesTab() {
  const { isAdminOrOfficer } = useAuth();
  const { data: resources, isLoading: resourcesLoading } = useResources();
  const [resourceSearch, setResourceSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');

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

  return (
    <div className="space-y-6">
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
    </div>
  );
}
