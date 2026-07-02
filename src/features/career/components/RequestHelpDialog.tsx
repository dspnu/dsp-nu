import { useState } from 'react';
import { LifeBuoy, Send, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSubmitCareerHelp } from '../hooks/useCareerHelp';

interface Props {
  tool?: string;
  toolLabel?: string;
  trigger?: React.ReactNode;
  defaultSubject?: string;
}

export function RequestHelpDialog({ tool, toolLabel, trigger, defaultSubject }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [message, setMessage] = useState('');
  const submit = useSubmitCareerHelp();

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    await submit.mutateAsync({ tool, subject: subject.trim(), message: message.trim() });
    setOpen(false);
    setSubject(defaultSubject ?? '');
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <LifeBuoy className="h-3.5 w-3.5" />
            Ask a chair for help
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-primary" />
            Request human help
          </DialogTitle>
          <DialogDescription>
            Sends a notification to the <span className="font-medium text-foreground">VP of Professional Activities</span> and the{' '}
            <span className="font-medium text-foreground">Professionalism chairs</span>.
            {toolLabel && <> They'll know it's about <span className="font-medium text-foreground">{toolLabel}</span>.</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="chr-subject" className="text-xs uppercase tracking-wide text-muted-foreground">Subject</Label>
            <Input
              id="chr-subject"
              placeholder="e.g. Need help tailoring my resume for GS"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submit.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chr-message" className="text-xs uppercase tracking-wide text-muted-foreground">What do you need?</Label>
            <Textarea
              id="chr-message"
              rows={5}
              placeholder="Give context — role, deadline, what you've tried, what's blocking you…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submit.isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submit.isPending}>Cancel</Button>
          <Button onClick={handleSend} disabled={submit.isPending || !subject.trim() || !message.trim()}>
            {submit.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Sending…</>
            ) : (
              <><Send className="h-3.5 w-3.5 mr-1.5" /> Send request</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
