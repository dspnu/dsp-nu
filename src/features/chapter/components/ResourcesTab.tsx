import { useState, useMemo, useEffect } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { FolderOpen, Folder, Search } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthContext';
import { useResources } from '@/features/resources/hooks/useResources';
import { ResourceForm } from '@/features/resources/components/ResourceForm';
import { ResourceCard } from '@/features/resources/components/ResourceCard';

export function ResourcesTab() {
  const { isAdminOrOfficer, isExecBoard } = useAuth();
  const { data: resources, isLoading: resourcesLoading } = useResources();
  const [resourceSearch, setResourceSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('all');

  const folders = useMemo(() => {
    if (!resources) return [];
    return [...new Set(resources.map(r => r.folder))].sort();
  }, [resources]);

  const searchMatched = useMemo(() => {
    if (!resources) return [];
    const q = resourceSearch.toLowerCase().trim();
    return resources.filter(resource => {
      if (q === '') return true;
      return (
        resource.title.toLowerCase().includes(q) ||
        (resource.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [resources, resourceSearch]);

  const groupedForAllTab = useMemo(() => {
    const groups: Record<string, typeof searchMatched> = {};
    searchMatched.forEach(resource => {
      if (!groups[resource.folder]) groups[resource.folder] = [];
      groups[resource.folder].push(resource);
    });
    return groups;
  }, [searchMatched]);

  const folderMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    searchMatched.forEach(r => {
      counts[r.folder] = (counts[r.folder] || 0) + 1;
    });
    return counts;
  }, [searchMatched]);

  useEffect(() => {
    if (activeFolder !== 'all' && folders.length > 0 && !folders.includes(activeFolder)) {
      setActiveFolder('all');
    }
  }, [folders, activeFolder]);

  const listEmptyAfterSearch = resources && resources.length > 0 && searchMatched.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by title or description…"
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isExecBoard && (
          <div className="shrink-0 sm:self-stretch flex sm:items-center">
            <ResourceForm />
          </div>
        )}
      </div>

      {resourcesLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => (<Card key={i} className="h-16 animate-pulse bg-muted/80" />))}</div>
      ) : resources && resources.length > 0 ? (
        listEmptyAfterSearch ? (
          <EmptyState
            icon={FolderOpen}
            title="No matches"
            description="Try another search or clear the filter."
          />
        ) : (
          <Tabs value={activeFolder} onValueChange={setActiveFolder} className="space-y-4">
            <div className="-mx-1 px-1 overflow-x-auto pb-1">
              <TabsList className="inline-flex h-9 w-max min-w-full sm:min-w-0 flex-nowrap justify-start gap-1 bg-muted/60 p-1">
                <TabsTrigger value="all" className="shrink-0 gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5 opacity-70" />
                  All
                  <span className="text-muted-foreground tabular-nums">({searchMatched.length})</span>
                </TabsTrigger>
                {folders.map((folder) => (
                  <TabsTrigger key={folder} value={folder} className="shrink-0 gap-1.5">
                    <Folder className="h-3.5 w-3.5 opacity-70" />
                    {folder}
                    <span className="text-muted-foreground tabular-nums">
                      ({folderMatchCounts[folder] ?? 0})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="all" className="mt-0 space-y-6">
              {Object.entries(groupedForAllTab).map(([folder, folderResources]) => (
                <div key={folder}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5" />
                    {folder}
                    <span className="font-normal normal-case tabular-nums">· {folderResources.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {folderResources.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} isOfficer={isAdminOrOfficer} />
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
            {folders.map((folder) => {
              const inFolder = searchMatched.filter(r => r.folder === folder);
              return (
                <TabsContent key={folder} value={folder} className="mt-0 space-y-2">
                  {inFolder.length === 0 ? (
                    <EmptyState
                      icon={FolderOpen}
                      title="Nothing in this folder"
                      description="Adjust your search or pick another folder."
                    />
                  ) : (
                    inFolder.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} isOfficer={isAdminOrOfficer} />
                    ))
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )
      ) : (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-8">
          <EmptyState
            icon={FolderOpen}
            title="No resources yet"
            description={
              isExecBoard
                ? 'Add documents and links so the chapter can find them in one place.'
                : 'Executive board members can add chapter documents and links here.'
            }
          />
        </div>
      )}
    </div>
  );
}
