import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-secondary/20 text-secondary-foreground">
              {alumni.first_name?.[0]}{alumni.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">
                  {alumni.first_name} {alumni.last_name}
                </h3>
                {alumni.job_title && alumni.company && (
                  <p className="text-sm text-muted-foreground">
                    {alumni.job_title} at {alumni.company}
                  </p>
                )}
              </div>
              {isAdminOrOfficer && (
                <div className="flex gap-1">
                  <EditAlumniButton alumni={alumni} />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteAlumni.mutate(alumni.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              {alumni.graduation_year && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3 w-3" />
                  <span>Class of {alumni.graduation_year}</span>
                </div>
              )}
              {alumni.industry && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3" />
                  <span>{alumni.industry}</span>
                </div>
              )}
              {alumni.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>{alumni.location}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              {alumni.email && (
                <Button asChild variant="outline" size="sm" className="gap-1">
                  <a href={`mailto:${alumni.email}`}>
                    <Mail className="h-3 w-3" />
                    Email
                  </a>
                </Button>
              )}
              {alumni.linkedin_url && (
                <Button asChild variant="outline" size="sm" className="gap-1">
                  <a href={alumni.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
