import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import type { ApprovedCoffeeChatMember } from '@/hooks/useApprovedMembers';

interface Props {
  member: ApprovedCoffeeChatMember;
  children: React.ReactNode;
}

export function ApprovedMemberProfile({ member, children }: Props) {
  const details = [
    { label: 'Email', value: member.osu_email },
    { label: 'Position', value: member.dsp_position },
    { label: 'Major(s)', value: member.majors },
    { label: 'Minor(s)', value: member.minors },
    { label: 'Hometown', value: [member.hometown, member.state].filter(Boolean).join(', ') },
    { label: 'School Year', value: member.school_year },
    { label: 'Pledge Class', value: member.pledge_class },
    { label: 'Family', value: member.family },
    { label: 'Grand Big', value: member.grand_big },
    { label: 'Big', value: member.big },
    { label: 'Little(s)', value: member.littles },
    { label: 'OSU Involvements', value: member.osu_involvements },
    { label: 'Internships/Experiences', value: member.internships_experiences },
    { label: 'Hobbies/Interests', value: member.hobbies_interests },
    { label: 'Fun Facts', value: member.fun_facts },
  ].filter(d => d.value);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {member.first_name} {member.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {details.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
