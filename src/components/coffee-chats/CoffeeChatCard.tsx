import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Coffee, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { useConfirmCoffeeChat, useRejectCoffeeChat } from '@/hooks/useCoffeeChats';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type CoffeeChat = Tables<'coffee_chats'>;

interface CoffeeChatCardProps {
  chat: CoffeeChat;
  partnerName?: string;
  initiatorName?: string;
  isOfficer?: boolean;
}

export function CoffeeChatCard({ chat, partnerName, initiatorName, isOfficer }: CoffeeChatCardProps) {
  const { user } = useAuth();
  const confirmChat = useConfirmCoffeeChat();
  const rejectChat = useRejectCoffeeChat();

  const isPartner = user?.id === chat.partner_id;
  const canConfirm = (isPartner || isOfficer) && chat.status === 'pending';

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Coffee className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {user?.id === chat.initiator_id ? partnerName : initiatorName}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(chat.chat_date), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
          <Badge className={statusColors[chat.status]}>{chat.status}</Badge>
        </div>

        {chat.notes && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{chat.notes}</p>
        )}

        {canConfirm && (
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              onClick={() => confirmChat.mutate(chat.id)}
              disabled={confirmChat.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => rejectChat.mutate(chat.id)}
              disabled={rejectChat.isPending}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
