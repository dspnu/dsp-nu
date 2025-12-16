import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil } from 'lucide-react';
import { useCreateResource, useUpdateResource } from '@/hooks/useResources';
import type { Tables } from '@/integrations/supabase/types';

type Resource = Tables<'resources'>;

const resourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().optional(),
  folder: z.string().min(1, 'Folder is required'),
  file_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  file_type: z.string().optional(),
  is_officer_only: z.boolean(),
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

const DEFAULT_FOLDERS = ['General', 'Forms', 'Bylaws', 'Templates', 'Training', 'Marketing'];

interface ResourceFormProps {
  resource?: Resource;
  trigger?: React.ReactNode;
}

export function ResourceForm({ resource, trigger }: ResourceFormProps) {
  const [open, setOpen] = useState(false);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const isEditing = !!resource;

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: resource?.title || '',
      description: resource?.description || '',
      folder: resource?.folder || 'General',
      file_url: resource?.file_url || '',
      file_type: resource?.file_type || '',
      is_officer_only: resource?.is_officer_only || false,
    },
  });

  const onSubmit = async (values: ResourceFormValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      folder: values.folder,
      file_url: values.file_url || null,
      file_type: values.file_type || null,
      is_officer_only: values.is_officer_only,
    };
    if (isEditing) {
      await updateResource.mutateAsync({ id: resource.id, ...payload });
    } else {
      await createResource.mutateAsync(payload);
    }
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="folder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Folder</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEFAULT_FOLDERS.map((folder) => (
                        <SelectItem key={folder} value={folder}>
                          {folder}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_officer_only"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="text-base">Officers Only</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Only officers can view this resource
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createResource.isPending || updateResource.isPending}>
                {isEditing ? 'Save' : 'Add'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function EditResourceButton({ resource }: { resource: Resource }) {
  return (
    <ResourceForm
      resource={resource}
      trigger={
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );
}
