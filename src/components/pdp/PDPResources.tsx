import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, FolderOpen, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { usePDPResources, useCreatePDPResource, useDeletePDPResource } from '@/hooks/usePDPResources';
import { usePDPModules } from '@/hooks/usePDPModules';

interface Props {
  isVP: boolean;
}

export function PDPResources({ isVP }: Props) {
  const { data: resources, isLoading } = usePDPResources();
  const { data: modules } = usePDPModules();
  const createResource = useCreatePDPResource();
  const deleteResource = useDeletePDPResource();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [moduleId, setModuleId] = useState<string>('none');

  const handleCreate = () => {
    if (!title) return;
    createResource.mutate(
      { title, description: description || undefined, url: url || undefined, module_id: moduleId === 'none' ? undefined : moduleId },
      { onSuccess: () => { setTitle(''); setDescription(''); setUrl(''); setModuleId('none'); setOpen(false); } }
    );
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{resources?.length || 0} resources</p>
        {isVP && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add PDP Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource title" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
                </div>
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Module</label>
                  <Select value={moduleId} onValueChange={setModuleId}>
                    <SelectTrigger><SelectValue placeholder="No module" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No module</SelectItem>
                      {modules?.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createResource.isPending || !title}>
                    {createResource.isPending ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!resources || resources.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No PDP resources yet"
          description={isVP ? "Add links and documents for the new member class." : "Resources will appear here when added."}
        />
      ) : (
        <div className="space-y-2">
          {resources.map(resource => {
            const modName = modules?.find(m => m.id === resource.module_id)?.name;
            return (
              <Card key={resource.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-foreground">{resource.title}</h4>
                      {modName && <Badge variant="outline" className="text-[10px]">{modName}</Badge>}
                    </div>
                    {resource.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{resource.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Added {format(new Date(resource.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {resource.url && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                        <a href={resource.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {isVP && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteResource.mutate(resource.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
