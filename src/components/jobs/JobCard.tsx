import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Calendar, ExternalLink, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { EditJobButton } from './JobForm';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteJob } from '@/hooks/useJobs';

type JobPost = Tables<'job_posts'>;

const jobTypeLabels: Record<string, string> = {
  internship: 'Internship',
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contract: 'Contract',
};

interface JobCardProps {
  job: JobPost;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export function JobCard({ job, isBookmarked, onToggleBookmark }: JobCardProps) {
  const { isAdminOrOfficer } = useAuth();
  const deleteJob = useDeleteJob();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <Badge variant="secondary" className="text-xs">
              {jobTypeLabels[job.job_type]}
            </Badge>
            <CardTitle className="text-lg">{job.title}</CardTitle>
          </div>
          <div className="flex gap-1">
            {onToggleBookmark && (
              <Button variant="ghost" size="icon" onClick={onToggleBookmark}>
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            )}
            {isAdminOrOfficer && (
              <>
                <EditJobButton job={job} />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => deleteJob.mutate(job.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">{job.company}</span>
        </div>
        {job.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
          </div>
        )}
        {job.deadline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Deadline: {format(new Date(job.deadline), 'MMM d, yyyy')}</span>
          </div>
        )}
        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
        )}
        {job.tags && job.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {job.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {job.apply_url && (
          <Button asChild size="sm" className="gap-1 mt-2">
            <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Apply Now
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
