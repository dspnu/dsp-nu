import { Button } from '@/components/ui/button';
import { useEventRSVP } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, HelpCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventRSVPProps {
  eventId: string;
}

export function EventRSVP({ eventId }: EventRSVPProps) {
  const { user } = useAuth();
  const { rsvps, isLoading, submitRSVP } = useEventRSVP(eventId);

  const currentUserRSVP = rsvps?.find((r) => r.user_id === user?.id);
  const currentResponse = currentUserRSVP?.response;

  const yesCount = rsvps?.filter((r) => r.response === 'yes').length ?? 0;
  const noCount = rsvps?.filter((r) => r.response === 'no').length ?? 0;
  const maybeCount = rsvps?.filter((r) => r.response === 'maybe').length ?? 0;

  const handleRSVP = (response: string) => {
    if (!user) return;
    submitRSVP({ response, userId: user.id });
  };

  if (isLoading) {
    return <div className="h-10 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{yesCount} going · {maybeCount} maybe · {noCount} not going</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant={currentResponse === 'yes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleRSVP('yes')}
          className={cn(
            'flex-1 gap-1',
            currentResponse === 'yes' && 'bg-emerald-600 hover:bg-emerald-700'
          )}
        >
          <Check className="h-4 w-4" />
          Going
        </Button>
        <Button
          variant={currentResponse === 'maybe' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleRSVP('maybe')}
          className={cn(
            'flex-1 gap-1',
            currentResponse === 'maybe' && 'bg-amber-500 hover:bg-amber-600'
          )}
        >
          <HelpCircle className="h-4 w-4" />
          Maybe
        </Button>
        <Button
          variant={currentResponse === 'no' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleRSVP('no')}
          className={cn(
            'flex-1 gap-1',
            currentResponse === 'no' && 'bg-destructive hover:bg-destructive/90'
          )}
        >
          <X className="h-4 w-4" />
          Can't Go
        </Button>
      </div>
    </div>
  );
}
