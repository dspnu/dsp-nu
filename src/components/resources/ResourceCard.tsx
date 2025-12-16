import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Link as LinkIcon, Trash2, Lock, ExternalLink } from 'lucide-react';
import { useDeleteResource } from '@/hooks/useResources';
import { EditResourceButton } from './ResourceForm';
import type { Tables } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Resource = Tables<'resources'>;

interface ResourceCardProps {
  resource: Resource;
  isOfficer?: boolean;
}

export function ResourceCard({ resource, isOfficer }: ResourceCardProps) {
  const deleteResource = useDeleteResource();

  const getFileIcon = () => {
    if (resource.file_type?.includes('pdf')) return '📄';
    if (resource.file_type?.includes('doc')) return '📝';
    if (resource.file_type?.includes('sheet') || resource.file_type?.includes('xls')) return '📊';
    if (resource.file_type?.includes('presentation') || resource.file_type?.includes('ppt')) return '📽️';
    return '📁';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">{getFileIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">{resource.title}</h3>
              {resource.is_officer_only && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            {resource.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {resource.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {resource.folder}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {resource.file_url && (
              <Button variant="ghost" size="icon" asChild>
                <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            {isOfficer && (
              <>
                <EditResourceButton resource={resource} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{resource.title}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteResource.mutate(resource.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
