import { useRef, useState } from 'react';
import { Mail, Coffee, Handshake, MessageSquare, Send, User, Briefcase } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIToolShell } from './AIToolShell';
import { ChoiceChips } from './ChoiceChips';
import { useToast } from '@/hooks/use-toast';

type Ask = 'coffee' | 'referral' | 'advice' | 'followup';
type Tone = 'warm' | 'professional' | 'concise';

const ASK_OPTIONS: { value: Ask; label: string; icon: React.ReactNode; prompt: string }[] = [
  { value: 'coffee', label: 'Coffee chat', icon: <Coffee className="h-3.5 w-3.5" />, prompt: '15-minute coffee chat to learn about their path' },
  { value: 'referral', label: 'Referral', icon: <Handshake className="h-3.5 w-3.5" />, prompt: 'A referral for a role at their company' },
  { value: 'advice', label: 'Advice', icon: <MessageSquare className="h-3.5 w-3.5" />, prompt: 'Quick advice on breaking into their field' },
  { value: 'followup', label: 'Follow up', icon: <Send className="h-3.5 w-3.5" />, prompt: 'A follow-up after a previous conversation' },
];

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: 'warm', label: 'Warm' },
  { value: 'professional', label: 'Professional' },
  { value: 'concise', label: 'Concise' },
];

export function OutreachTool() {
  const [ask, setAsk] = useState<Ask>('coffee');
  const [tone, setTone] = useState<Tone>('warm');
  const contactRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const hookRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="outreach"
      title="Outreach Messages"
      description="Craft a cold message that actually gets replies."
      icon={<Mail className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <div className="space-y-5">
          {/* Ask */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">What are you asking for?</Label>
            <ChoiceChips options={ASK_OPTIONS} value={ask} onChange={setAsk} disabled={disabled} />
          </div>

          {/* Contact card */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Who are you reaching?</Label>
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  ref={contactRef}
                  placeholder="Name (e.g. Sarah Lee)"
                  disabled={disabled}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 px-0"
                />
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  ref={roleRef}
                  placeholder="Role @ Company (e.g. Recruiter @ Goldman)"
                  disabled={disabled}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 px-0"
                />
              </div>
            </div>
          </div>

          {/* Hook */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Your hook <span className="text-muted-foreground/60 normal-case">(optional)</span>
            </Label>
            <Textarea
              ref={hookRef}
              rows={2}
              disabled={disabled}
              placeholder="e.g. Saw your post on private equity recruiting — I'm a junior at OSU studying finance."
            />
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tone</Label>
            <ChoiceChips options={TONE_OPTIONS} value={tone} onChange={setTone} disabled={disabled} size="sm" />
          </div>
        </div>
      )}
      collectInput={() => {
        const contactName = contactRef.current?.value.trim();
        if (!contactName) {
          toast({ title: 'Add a contact name', variant: 'destructive' });
          return null;
        }
        const askText = ASK_OPTIONS.find(a => a.value === ask)!.prompt;
        return {
          ask: askText,
          tone,
          contactName,
          contactRole: roleRef.current?.value.trim() || undefined,
          context: hookRef.current?.value.trim() || undefined,
        };
      }}
    />
  );
}
