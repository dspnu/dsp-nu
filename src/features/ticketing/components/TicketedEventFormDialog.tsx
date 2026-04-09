import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tables } from '@/integrations/supabase/types';
import { useCreateTicketedEvent, useUpdateTicketedEvent } from '@/features/ticketing/hooks/useTicketMutations';
import { Plus, Pencil } from 'lucide-react';

type TicketedEvent = Tables<'ticketed_events'>;

interface TicketedEventFormDialogProps {
  event?: TicketedEvent;
  trigger?: React.ReactNode;
}

export function TicketedEventFormDialog({ event, trigger }: TicketedEventFormDialogProps) {
  const [open, setOpen] = useState(false);
  const createEv = useCreateTicketedEvent();
  const updateEv = useUpdateTicketedEvent();

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    starts_at: '',
    ends_at: '',
    capacity: '' as string | number,
    price_dollars: '0',
    payment_url: '',
    payment_url_internal: false,
    registrations_open: true,
    published: true,
    notifyOnSave: false,
    notifyTitle: '',
    notifyMessage: '',
  });

  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        title: event.title,
        description: event.description ?? '',
        location: event.location ?? '',
        starts_at: event.starts_at ? new Date(event.starts_at).toISOString().slice(0, 16) : '',
        ends_at: event.ends_at ? new Date(event.ends_at).toISOString().slice(0, 16) : '',
        capacity: event.capacity ?? '',
        price_dollars: (event.price_cents / 100).toFixed(2),
        payment_url: event.payment_url ?? '',
        payment_url_internal: event.payment_url_internal,
        registrations_open: event.registrations_open,
        published: event.published,
        notifyOnSave: false,
        notifyTitle: `Update: ${event.title}`,
        notifyMessage: 'Details for this ticketed event were updated. Check Tickets for the latest info.',
      });
    } else {
      setForm({
        title: '',
        description: '',
        location: '',
        starts_at: '',
        ends_at: '',
        capacity: '',
        price_dollars: '0',
        payment_url: '',
        payment_url_internal: false,
        registrations_open: true,
        published: true,
        notifyOnSave: false,
        notifyTitle: '',
        notifyMessage: '',
      });
    }
  }, [open, event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(form.price_dollars || '0') * 100);
    const capacity =
      form.capacity === '' || form.capacity === null
        ? null
        : Math.max(1, parseInt(String(form.capacity), 10));

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      capacity,
      price_cents: Math.max(0, priceCents),
      payment_url: form.payment_url.trim() || null,
      payment_url_internal: form.payment_url_internal,
      registrations_open: form.registrations_open,
      published: form.published,
    };

    if (event) {
      await updateEv.mutateAsync({
        id: event.id,
        updates: payload,
        notify:
          form.notifyOnSave && form.notifyTitle.trim() && form.notifyMessage.trim()
            ? { title: form.notifyTitle.trim(), message: form.notifyMessage.trim() }
            : undefined,
      });
    } else {
      await createEv.mutateAsync(payload);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New ticketed event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit ticketed event' : 'Create ticketed event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="te-title">Name</Label>
            <Input
              id="te-title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="te-desc">Description</Label>
            <Textarea
              id="te-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="te-start">Starts</Label>
              <Input
                id="te-start"
                type="datetime-local"
                required
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="te-end">Ends (optional)</Label>
              <Input
                id="te-end"
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="te-loc">Location</Label>
            <Input
              id="te-loc"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="te-cap">Capacity (blank = unlimited)</Label>
              <Input
                id="te-cap"
                type="number"
                min={1}
                placeholder="∞"
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value ? e.target.value : '' }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="te-price">Price (USD)</Label>
              <Input
                id="te-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price_dollars}
                onChange={(e) => setForm((f) => ({ ...f, price_dollars: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="te-pay">Payment link (paid events)</Label>
            <Input
              id="te-pay"
              placeholder="https://…"
              value={form.payment_url}
              onChange={(e) => setForm((f) => ({ ...f, payment_url: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="te-internal"
              checked={form.payment_url_internal}
              onCheckedChange={(v) => setForm((f) => ({ ...f, payment_url_internal: v }))}
            />
            <Label htmlFor="te-internal">Link opens in chapter portal / internal</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="te-reg"
              checked={form.registrations_open}
              onCheckedChange={(v) => setForm((f) => ({ ...f, registrations_open: v }))}
            />
            <Label htmlFor="te-reg">Registrations open</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="te-pub"
              checked={form.published}
              onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
            />
            <Label htmlFor="te-pub">Published on Tickets page</Label>
          </div>
          {event && (
            <div className="rounded-md border border-border/60 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="te-notify"
                  checked={form.notifyOnSave}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, notifyOnSave: v }))}
                />
                <Label htmlFor="te-notify">Notify ticket holders after save</Label>
              </div>
              {form.notifyOnSave && (
                <>
                  <Input
                    placeholder="Notification title"
                    value={form.notifyTitle}
                    onChange={(e) => setForm((f) => ({ ...f, notifyTitle: e.target.value }))}
                  />
                  <Textarea
                    placeholder="What changed?"
                    rows={2}
                    value={form.notifyMessage}
                    onChange={(e) => setForm((f) => ({ ...f, notifyMessage: e.target.value }))}
                  />
                </>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEv.isPending || updateEv.isPending}>
              {event ? (
                <>
                  <Pencil className="h-4 w-4 mr-1" /> Save
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
