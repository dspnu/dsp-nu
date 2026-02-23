import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Mail, CalendarCheck, CheckCircle2, Calendar, Edit2, Save, X, ArrowRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useUpdateCoffeeChat, useDeleteCoffeeChat } from '@/hooks/useCoffeeChats';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type CoffeeChat = Tables<'coffee_chats'>;

interface CoffeeChatCardProps {
  chat: CoffeeChat;
  partnerName?: string;
  initiatorName?: string;
  isOfficer?: boolean;
}

const statusConfig = {
  emailed: {
    icon: Mail,
    label: 'Emailed',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    next: 'scheduled' as const,
    nextLabel: 'Mark Scheduled',
  },
  scheduled: {
    icon: CalendarCheck,
    label: 'Scheduled',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    next: 'completed' as const,
    nextLabel: 'Mark Completed',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    next: null,
    nextLabel: null,
  },
};

export function CoffeeChatCard({ chat, partnerName, initiatorName, isOfficer }: CoffeeChatCardProps) {
  const { user } = useAuth();
  const updateChat = useUpdateCoffeeChat();
  const deleteChat = useDeleteCoffeeChat();
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(chat.chat_date);
  const [editNotes, setEditNotes] = useState(chat.notes || '');
  const [editStatus, setEditStatus] = useState<string>(chat.status);

  const config = statusConfig[chat.status as keyof typeof statusConfig] || statusConfig.emailed;
  const StatusIcon = config.icon;

  const isOwner = user?.id === chat.initiator_id;
  const canEdit = isOwner || isOfficer;
  const canDelete = isOwner || isOfficer;
  const canAdvance = canEdit && config.next;

  const handleAdvance = () => {
    if (config.next) {
      updateChat.mutate({ id: chat.id, status: config.next as any });
    }
  };

  const handleSave = () => {
    updateChat.mutate({
      id: chat.id,
      chat_date: editDate,
      notes: editNotes || null,
      status: editStatus as any,
    }, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const handleDelete = () => {
    deleteChat.mutate(chat.id);
  };

  if (isEditing) {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm text-foreground">Editing Coffee Chat</p>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={updateChat.isPending}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={editStatus} onValueChange={setEditStatus}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emailed">Emailed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <StatusIcon className="h-5 w-5 text-primary" />
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
          <div className="flex items-center gap-1">
            <Badge className={config.color}>{config.label}</Badge>
            {canEdit && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Coffee Chat</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this coffee chat? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {chat.notes && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{chat.notes}</p>
        )}

        {canAdvance && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full"
            onClick={handleAdvance}
            disabled={updateChat.isPending}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            {config.nextLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
