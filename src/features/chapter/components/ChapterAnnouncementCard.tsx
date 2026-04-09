import { useState } from 'react';
import { Loader2, Megaphone, Send } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function normalizeAnnouncementLink(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^javascript:/i.test(t)) return null;
  if (t.startsWith('/') || /^https?:\/\//i.test(t)) return t;
  return `/${t.replace(/^\/+/, '')}`;
}

export function ChapterAnnouncementCard() {
  const { canManageEvents } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  if (!canManageEvents) return null;

  const handleSend = async () => {
    const t = title.trim();
    const m = message.trim();
    if (!t || !m) {
      toast({ title: 'Add a title and message', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const p_link = normalizeAnnouncementLink(link);
      const { error } = await supabase.rpc('broadcast_chapter_announcement', {
        p_title: t,
        p_message: m,
        p_link,
      });
      if (error) throw error;
      toast({ title: 'Announcement sent', description: 'Members who allow announcements were notified.' });
      setTitle('');
      setMessage('');
      setLink('');
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({
        title: 'Could not send',
        description: err.message ?? 'Try again later.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Chapter announcement</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Send a short message to members who have chapter announcements enabled in Settings. Optional link opens when they tap the notification.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="announcement-title" className="text-xs">
            Title
          </Label>
          <Input
            id="announcement-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Room change for this week"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="announcement-body" className="text-xs">
            Message
          </Label>
          <Textarea
            id="announcement-body"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Keep it brief; members can read details in Notification Center."
            rows={3}
            maxLength={2000}
            className="resize-y min-h-[80px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="announcement-link" className="text-xs">
            Link <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="announcement-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="e.g. /events or https://…"
            maxLength={2048}
            autoComplete="off"
          />
        </div>
        <Button type="button" onClick={handleSend} disabled={sending} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send to chapter
        </Button>
      </div>
    </div>
  );
}
