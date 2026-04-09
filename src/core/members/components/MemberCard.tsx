import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { GraduationCap } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface MemberCardProps {
  member: Profile;
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={member.avatar_url || ''} />
        <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
          {member.first_name?.[0]}{member.last_name?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {member.first_name} {member.last_name}
          </span>
          <StatusBadge status={member.status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {member.major && <span className="truncate">{member.major}</span>}
          {member.major && member.graduation_year && <span>·</span>}
          {member.graduation_year && (
            <span className="flex items-center gap-1 shrink-0">
              <GraduationCap className="h-3 w-3" />
              {member.graduation_year}
            </span>
          )}
        </div>
        {member.positions && member.positions.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {member.positions.slice(0, 2).map((pos) => (
              <Badge key={pos} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {pos}
              </Badge>
            ))}
            {member.positions.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                +{member.positions.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
