import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, LayoutGrid, Trash2, Edit2, ClipboardList, FolderOpen, ExternalLink,
  Calendar, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, Link as LinkIcon
} from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { usePDPModules, useCreatePDPModule, useDeletePDPModule, useUpdatePDPModule } from '@/hooks/usePDPModules';
import { usePDPAssignments, useCreateAssignment, useDeleteAssignment, useMySubmissions } from '@/hooks/usePDPAssignments';
import { usePDPResources, useCreatePDPResource, useDeletePDPResource } from '@/hooks/usePDPResources';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  isVP: boolean;
  isNewMember: boolean;
  onNavigateToAssignments: () => void;
}

export function PDPHome({ isVP, isNewMember, onNavigateToAssignments }: Props) {
  const { data: modules, isLoading: modulesLoading } = usePDPModules();
  const { data: assignments } = usePDPAssignments();
  const { data: resources } = usePDPResources();
  const { data: mySubmissions } = useMySubmissions();
  const createModule = useCreatePDPModule();
  const deleteModule = useDeletePDPModule();
  const updateModule = useUpdatePDPModule();
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const createResource = useCreatePDPResource();
  const deleteResource = useDeletePDPResource();

  const [moduleOpen, setModuleOpen] = useState(false);
  const [moduleName, setModuleName] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');

  // Add item dialog
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemModuleId, setAddItemModuleId] = useState('');
  const [addItemType, setAddItemType] = useState<'assignment' | 'resource'>('assignment');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemDueDate, setItemDueDate] = useState('');
  const [itemSubmissionType, setItemSubmissionType] = useState<'text' | 'file' | 'both'>('text');
  const [itemUrl, setItemUrl] = useState('');

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateModule = () => {
    if (!moduleName) return;
    createModule.mutate(
      { name: moduleName, description: moduleDesc || undefined },
      { onSuccess: () => { setModuleName(''); setModuleDesc(''); setModuleOpen(false); } }
    );
  };

  const openAddItem = (moduleId: string, type: 'assignment' | 'resource') => {
    setAddItemModuleId(moduleId);
    setAddItemType(type);
    setItemTitle('');
    setItemDesc('');
    setItemDueDate('');
    setItemSubmissionType('text');
    setItemUrl('');
    setAddItemOpen(true);
  };

  const handleAddItem = () => {
    if (!itemTitle) return;
    if (addItemType === 'assignment') {
      if (!itemDueDate) return;
      createAssignment.mutate(
        {
          title: itemTitle,
          description: itemDesc || undefined,
          due_date: new Date(itemDueDate).toISOString(),
          submission_type: itemSubmissionType,
          module_id: addItemModuleId,
        },
        { onSuccess: () => setAddItemOpen(false) }
      );
    } else {
      createResource.mutate(
        {
          title: itemTitle,
          description: itemDesc || undefined,
          url: itemUrl || undefined,
          module_id: addItemModuleId,
        },
        { onSuccess: () => setAddItemOpen(false) }
      );
    }
  };

  // Group assignments and resources by module
  const getModuleAssignments = (moduleId: string) =>
    assignments?.filter(a => a.module_id === moduleId) || [];
  const getModuleResources = (moduleId: string) =>
    resources?.filter(r => r.module_id === moduleId) || [];
  
  // Unassigned items
  const unassignedAssignments = assignments?.filter(a => !a.module_id) || [];
  const unassignedResources = resources?.filter(r => !r.module_id) || [];

  if (modulesLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Program Overview</h2>
          <p className="text-sm text-muted-foreground">Your modules, assignments, and resources at a glance</p>
        </div>
        {isVP && (
          <Dialog open={moduleOpen} onOpenChange={setModuleOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Module
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Module</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={moduleName} onChange={e => setModuleName(e.target.value)} placeholder="e.g. Week 1 - Introduction" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={moduleDesc} onChange={e => setModuleDesc(e.target.value)} placeholder="Optional description" rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setModuleOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateModule} disabled={createModule.isPending || !moduleName}>
                    {createModule.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Modules */}
      {(!modules || modules.length === 0) && unassignedAssignments.length === 0 && unassignedResources.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No modules yet"
          description={isVP ? "Create your first module to organize the PDP program." : "Modules will appear here once created by your VP."}
        />
      ) : (
        <div className="space-y-4">
          {modules?.map(mod => {
            const modAssignments = getModuleAssignments(mod.id);
            const modResources = getModuleResources(mod.id);
            const isExpanded = expandedModules.has(mod.id);
            const totalItems = modAssignments.length + modResources.length;

            return (
              <Card key={mod.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer pb-3 hover:bg-accent/50 transition-colors"
                  onClick={() => toggleModule(mod.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <CardTitle className="text-base">{mod.name}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">{totalItems} item{totalItems !== 1 ? 's' : ''}</Badge>
                    </div>
                    {isVP && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openAddItem(mod.id, 'assignment')}>
                          <ClipboardList className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openAddItem(mod.id, 'resource')}>
                          <LinkIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm('Delete this module? Items will be unassigned, not deleted.')) {
                              deleteModule.mutate(mod.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {mod.description && <p className="text-xs text-muted-foreground ml-6">{mod.description}</p>}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-2">
                    {modAssignments.length === 0 && modResources.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No items in this module yet</p>
                    )}

                    {modAssignments.map(a => {
                      const overdue = isPast(new Date(a.due_date));
                      const daysLeft = differenceInDays(new Date(a.due_date), new Date());
                      const mySub = mySubmissions?.find(s => s.assignment_id === a.id);

                      return (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                          <div className="flex items-center gap-2 min-w-0">
                            {mySub?.status === 'complete' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : mySub?.status === 'incomplete' ? (
                              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            ) : mySub ? (
                              <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                            ) : (
                              <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                              <p className={`text-xs ${overdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {overdue ? 'Overdue' : `Due ${format(new Date(a.due_date), 'MMM d')}`}
                                {!overdue && daysLeft <= 3 && ` (${daysLeft}d left)`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px]">Assignment</Badge>
                            {isVP && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteAssignment.mutate(a.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {modResources.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                            {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px]">Resource</Badge>
                          {r.url && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                              <a href={r.url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          {isVP && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteResource.mutate(r.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Unassigned items */}
          {(unassignedAssignments.length > 0 || unassignedResources.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-muted-foreground">Unassigned Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unassignedAssignments.map(a => {
                  const overdue = isPast(new Date(a.due_date));
                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <p className={`text-xs ${overdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {overdue ? 'Overdue' : `Due ${format(new Date(a.due_date), 'MMM d')}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Assignment</Badge>
                    </div>
                  );
                })}
                {unassignedResources.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium truncate">{r.title}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Resource</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {addItemType === 'assignment' ? 'Assignment' : 'Resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder="Title" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="Optional description" rows={2} />
            </div>
            {addItemType === 'assignment' && (
              <>
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input type="datetime-local" value={itemDueDate} onChange={e => setItemDueDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Submission Type</label>
                  <Select value={itemSubmissionType} onValueChange={v => setItemSubmissionType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Only</SelectItem>
                      <SelectItem value="file">File Upload Only</SelectItem>
                      <SelectItem value="both">Text + File Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {addItemType === 'resource' && (
              <div>
                <label className="text-sm font-medium">URL</label>
                <Input value={itemUrl} onChange={e => setItemUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
              <Button onClick={handleAddItem} disabled={!itemTitle || (addItemType === 'assignment' && !itemDueDate)}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
