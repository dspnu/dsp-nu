import { useState } from 'react';
import { LifeBuoy, Send, Loader2, Link as LinkIcon, Paperclip, X, Plus, FileText } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubmitCareerHelp, type HelpAttachment } from '../hooks/useCareerHelp';

interface Props {
  tool?: string;
  toolLabel?: string;
  trigger?: React.ReactNode;
  defaultSubject?: string;
}

const MAX_FILE_MB = 15;
const MAX_FILES = 5;

export function RequestHelpDialog({ tool, toolLabel, trigger, defaultSubject }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [message, setMessage] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const submit = useSubmitCareerHelp();
  const { toast } = useToast();

  const reset = () => {
    setSubject(defaultSubject ?? '');
    setMessage('');
    setLinks([]);
    setLinkDraft('');
    setFiles([]);
  };

  const addLink = () => {
    const v = linkDraft.trim();
    if (!v) return;
    const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try { new URL(withProto); } catch { toast({ title: 'Invalid URL', variant: 'destructive' }); return; }
    setLinks((prev) => [...prev, withProto]);
    setLinkDraft('');
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const combined = [...files, ...picked].slice(0, MAX_FILES);
    const oversize = combined.find(f => f.size > MAX_FILE_MB * 1024 * 1024);
    if (oversize) {
      toast({ title: 'File too large', description: `${oversize.name} exceeds ${MAX_FILE_MB}MB`, variant: 'destructive' });
      return;
    }
    setFiles(combined);
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const attachments: HelpAttachment[] = [];
      for (const f of files) {
        const safeName = f.name.replace(/[^\w.\-]+/g, '_');
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from('career-help-attachments')
          .upload(path, f, { contentType: f.type || 'application/octet-stream', upsert: false });
        if (upErr) throw upErr;
        attachments.push({ name: f.name, path, size: f.size, type: f.type || 'application/octet-stream' });
      }

      await submit.mutateAsync({
        tool,
        subject: subject.trim(),
        message: message.trim(),
        links,
        attachments,
      });
      setOpen(false);
      reset();
    } catch (e: any) {
      toast({ title: 'Could not send request', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const busy = uploading || submit.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <LifeBuoy className="h-3.5 w-3.5" />
            Ask a chair for help
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="chr-subject" className="text-xs uppercase tracking-wide text-muted-foreground">Topic</Label>
            <Input
              id="chr-subject"
              placeholder="e.g. Need help tailoring my resume for GS"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chr-message" className="text-xs uppercase tracking-wide text-muted-foreground">What do you need?</Label>
            <Textarea
              id="chr-message"
              rows={4}
              placeholder="Give context — role, deadline, what you've tried, what's blocking you…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <LinkIcon className="h-3 w-3" /> Links <span className="text-muted-foreground/60 normal-case">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://job-posting.com/…"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                disabled={busy}
              />
              <Button type="button" variant="secondary" size="sm" onClick={addLink} disabled={busy || !linkDraft.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {links.length > 0 && (
              <ul className="space-y-1 pt-1">
                {links.map((l, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                    <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-foreground">{l}</span>
                    <button
                      type="button"
                      onClick={() => setLinks(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={busy}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" /> Files <span className="text-muted-foreground/60 normal-case">(optional · up to {MAX_FILES}, {MAX_FILE_MB}MB each)</span>
            </Label>
            <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-3 cursor-pointer hover:bg-muted/40 transition-colors">
              <Paperclip className="h-3.5 w-3.5" />
              <span>Attach resume, JD, screenshots…</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={onPickFiles}
                disabled={busy || files.length >= MAX_FILES}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif"
              />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1 pt-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-foreground">{f.name}</span>
                    <span className="text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={busy}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSend} disabled={busy || !subject.trim() || !message.trim()}>
            {busy ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {uploading && files.length ? 'Uploading…' : 'Sending…'}</>
            ) : (
              <><Send className="h-3.5 w-3.5 mr-1.5" /> Send request</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
