import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, GraduationCap, Linkedin, Mail, Trash2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { EditAlumniButton } from './AlumniForm';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteAlumni } from '@/hooks/useAlumni';

type Alumni = Tables<'alumni'>;

interface AlumniCardProps {
  alumni: Alumni;
}

export function AlumniCard({ alumni }: AlumniCardProps) {
  const { isAdminOrOfficer } = useAuth();
  const deleteAlumni = useDeleteAlumni();

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {alumni.first_name?.[0]}{alumni.last_name?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="font-medium text-sm">
              {alumni.first_name} {alumni.last_name}
            </span>
            {alumni.job_title && alumni.company && (
              <p className="text-xs text-muted-foreground truncate">
                {alumni.job_title} at {alumni.company}
              </p>
            )}
          </div>
          {isAdminOrOfficer && (
            <div className="flex gap-0.5 shrink-0">
              <EditAlumniButton alumni={alumni} />
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={() => deleteAlumni.mutate(alumni.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          {alumni.graduation_year && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              {alumni.graduation_year}
            </span>
          )}
          {alumni.industry && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {alumni.industry}
            </span>
          )}
          {alumni.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {alumni.location}
            </span>
          )}
        </div>
        
        {(alumni.email || alumni.linkedin_url) && (
          <div className="flex gap-1.5 mt-2">
            {alumni.email && (
              <Button asChild variant="outline" size="sm" className="h-6 text-[11px] px-2 gap-1">
                <a href={`mailto:${alumni.email}`}>
                  <Mail className="h-3 w-3" />
                  Email
                </a>
              </Button>
            )}
            {alumni.linkedin_url && (
              <Button asChild variant="outline" size="sm" className="h-6 text-[11px] px-2 gap-1">
                <a href={alumni.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-3 w-3" />
                  LinkedIn
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
