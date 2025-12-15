import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Mail, Phone, GraduationCap, Linkedin } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

type Profile = Tables<'profiles'>;

interface MemberCardProps {
  member: Profile;
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={member.avatar_url || ''} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {member.first_name?.[0]}{member.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">
                  {member.first_name} {member.last_name}
                </h3>
                <StatusBadge status={member.status} />
              </div>
            </div>
            
            {member.positions && member.positions.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {member.positions.map((pos) => (
                  <Badge key={pos} variant="secondary" className="text-xs">
                    {pos}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${member.email}`} className="hover:underline">
                  {member.email}
                </a>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.graduation_year && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3 w-3" />
                  <span>Class of {member.graduation_year}</span>
                </div>
              )}
            </div>
            
            {member.linkedin_url && (
              <Button asChild variant="outline" size="sm" className="gap-1 mt-2">
                <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-3 w-3" />
                  LinkedIn
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
