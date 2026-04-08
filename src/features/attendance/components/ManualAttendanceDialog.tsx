import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, Check } from 'lucide-react';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useEventAttendance, useCheckIn } from '@/features/events/hooks/useAttendance';
import { useAuth } from '@/core/auth/AuthContext';
import { Tables } from '@/integrations/supabase/types';

type Event = Tables<'events'>;

interface ManualAttendanceDialogProps {
  event: Event;
}

export function ManualAttendanceDialog({ event }: ManualAttendanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: members } = useMembers();
  const { data: attendance } = useEventAttendance(event.id);
  const checkIn = useCheckIn();
  const { user } = useAuth();

  const checkedInUserIds = new Set(attendance?.map(a => a.user_id) || []);

  const filteredMembers = members?.filter(member => {
    const matchesSearch = search === '' || 
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }) || [];

  const handleToggleAttendance = async (memberId: string, userId: string) => {
    if (checkedInUserIds.has(userId)) {
      // Already checked in - could add delete functionality here
      return;
    }
    
    await checkIn.mutateAsync({
      eventId: event.id,
      userId: userId,
      checkedInBy: user?.id,
    });
  };

  const checkedInCount = attendance?.length || 0;
  const totalMembers = members?.length || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Manual Check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Attendance - {event.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Attendance</span>
            <span className="font-medium">{checkedInCount} / {totalMembers} checked in</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredMembers.map((member) => {
                const isCheckedIn = checkedInUserIds.has(member.user_id);
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                      isCheckedIn 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleToggleAttendance(member.id, member.user_id)}
                  >
                    <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                      isCheckedIn ? 'bg-primary border-primary' : 'border-input'
                    }`}>
                      {isCheckedIn && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
