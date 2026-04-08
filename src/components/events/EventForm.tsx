import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { org, type EventCategory } from '@/config/org';

type Event = Tables<'events'>;

const categories: { value: EventCategory; label: string }[] = [
  ...org.eventCategories.map(c => ({ value: c.key as EventCategory, label: c.label })),
  { value: 'new_member' as EventCategory, label: `${org.newMemberCategory.label} / PDP` },
  { value: 'exec' as EventCategory, label: 'Exec (Officers Only)' },
];

interface EventFormProps {
  event?: Event;
  trigger?: React.ReactNode;
}

export function EventForm({ event, trigger }: EventFormProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

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
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: EventCategory) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points_value">Points Value</Label>
              <Input
                id="points_value"
                type="number"
                min="0"
                value={formData.points_value}
                onChange={(e) => setFormData({ ...formData, points_value: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
              />
              <Label htmlFor="is_required">Required Event</Label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="payment_required"
              checked={formData.payment_required}
              onCheckedChange={(checked) => setFormData({ ...formData, payment_required: checked })}
            />
            <Label htmlFor="payment_required">Requires Dues Payment</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
              {event ? 'Update' : 'Create'} Event
            </Button>
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
