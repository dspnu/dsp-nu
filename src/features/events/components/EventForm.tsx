import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/features/events/hooks/useEvents';
import { useAuth } from '@/core/auth/AuthContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tables } from '@/integrations/supabase/types';
import { org, type EventCategory } from '@/config/org';
import { cn } from '@/lib/utils';
import { useChapterSetting } from '@/hooks/useChapterSettings';

type Event = Tables<'events'>;

interface EventFormProps {
  event?: Event;
  trigger?: React.ReactNode;
}

export function EventForm({ event, trigger }: EventFormProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data: customEventTypesSetting } = useChapterSetting('custom_event_types', {
    whenMissing: org.eventCategories.map((c) => c.label),
  });
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const customEventTypeLabels = Array.isArray(customEventTypesSetting)
    ? customEventTypesSetting.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : org.eventCategories.map((c) => c.label);
  const categories: { value: EventCategory; label: string }[] = [
    ...org.eventCategories.map((category, index) => ({
      value: category.key as EventCategory,
      label: customEventTypeLabels[index] || category.label,
    })),
    { value: 'new_member' as EventCategory, label: `${org.newMemberCategory.label} / PDP` },
    { value: 'exec' as EventCategory, label: 'Exec (Officers Only)' },
  ];

  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    category: (event?.category || 'chapter') as EventCategory,
    start_time: event?.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
    end_time: event?.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
    location: event?.location || '',
    points_value: event?.points_value || 0,
    is_required: event?.is_required || false,
    payment_required: (event as any)?.payment_required || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData = {
      ...formData,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
      organizer_id: user?.id,
    };

    if (event) {
      await updateEvent.mutateAsync({ id: event.id, ...eventData });
    } else {
      await createEvent.mutateAsync(eventData);
    }
    
    setOpen(false);
    if (!event) {
      setFormData({
        title: '',
        description: '',
        category: 'chapter',
        start_time: '',
        end_time: '',
        location: '',
        points_value: 0,
        is_required: false,
        payment_required: false,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="h-9 shrink-0 gap-1.5">
            <Plus className="h-4 w-4" />
            New event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-4 sm:max-w-xl sm:p-5">
        <DialogHeader className="space-y-0 pb-3 text-left">
          <DialogTitle className="text-lg">{event ? 'Edit event' : 'New event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title" className="text-xs text-muted-foreground">
              Title
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="h-9"
              placeholder="Event name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="start_time" className="text-xs text-muted-foreground">
              Start
            </Label>
            <Input
              id="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_time" className="text-xs text-muted-foreground">
              End <span className="font-normal opacity-70">(optional)</span>
            </Label>
            <Input
              id="end_time"
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs text-muted-foreground">
              Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value: EventCategory) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs text-muted-foreground">
              Location <span className="font-normal opacity-70">(optional)</span>
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="h-9"
              placeholder="Room, address, or link"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description" className="text-xs text-muted-foreground">
              Details <span className="font-normal opacity-70">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="min-h-[4rem] resize-y text-sm"
              placeholder="Short note for the calendar…"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-3 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="points_value" className="sr-only">
                Points value
              </Label>
              <span className="whitespace-nowrap text-xs text-muted-foreground">Points</span>
              <Input
                id="points_value"
                type="number"
                min="0"
                value={formData.points_value}
                onChange={(e) => setFormData({ ...formData, points_value: parseInt(e.target.value, 10) || 0 })}
                className="h-9 w-[5.5rem]"
              />
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
                <Label htmlFor="is_required" className="cursor-pointer text-sm font-normal leading-none">
                  Required
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="payment_required"
                  checked={formData.payment_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, payment_required: checked })}
                />
                <Label htmlFor="payment_required" className="cursor-pointer text-sm font-normal leading-none">
                  Dues required
                </Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between sm:pt-1">
            {event && (
              <DeleteEventButton
                event={event}
                variant="outline"
                disabled={createEvent.isPending || updateEvent.isPending}
                onDeleted={() => setOpen(false)}
                triggerClassName="self-start sm:order-first"
              />
            )}
            <div className="flex justify-end gap-2 sm:ml-auto">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createEvent.isPending || updateEvent.isPending}>
                {event ? 'Save' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditEventButton({ event }: { event: Event }) {
  return (
    <EventForm
      event={event}
      trigger={
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );
}

interface DeleteEventButtonProps {
  event: Event;
  onDeleted?: () => void;
  disabled?: boolean;
  /** e.g. icon on cards vs text in forms */
  variant?: 'icon' | 'outline';
  triggerClassName?: string;
}

export function DeleteEventButton({
  event,
  onDeleted,
  disabled,
  variant = 'icon',
  triggerClassName,
}: DeleteEventButtonProps) {
  const { canManageEvents } = useAuth();
  const deleteEvent = useDeleteEvent();

  if (!canManageEvents) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={triggerClassName}
            disabled={disabled}
            aria-label="Delete event"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn('text-destructive hover:text-destructive', triggerClassName)}
            disabled={disabled}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this event?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{event.title}&rdquo; will be removed from the calendar. Related RSVPs and attendance
            records will be deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleteEvent.isPending}
            onClick={async () => {
              await deleteEvent.mutateAsync(event.id);
              onDeleted?.();
            }}
          >
            {deleteEvent.isPending ? 'Deleting…' : 'Delete event'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
