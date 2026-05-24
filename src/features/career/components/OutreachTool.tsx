import { useRef } from 'react';
import { Mail } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIToolShell } from './AIToolShell';
import { useToast } from '@/hooks/use-toast';

export function OutreachTool() {
  const contactNameRef = useRef<HTMLInputElement>(null);
  const contactRoleRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef<HTMLTextAreaElement>(null);
  const askRef = useRef<HTMLTextAreaElement>(null);
  const aboutMeRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="outreach"
      title="Outreach Messages"
      description="Cold-message a recruiter, alum, or hiring manager. Get 3 variants."
      icon={<Mail className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contactName">Contact name</Label>
              <Input id="contactName" ref={contactNameRef} placeholder="e.g. Sarah Lee" disabled={disabled} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactRole">Their role / company</Label>
              <Input id="contactRole" ref={contactRoleRef} placeholder="e.g. Recruiter @ Goldman Sachs" disabled={disabled} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="context">Why them? (mutual connection, posting, etc.)</Label>
            <Textarea id="context" ref={contextRef} rows={2} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ask">What are you asking for?</Label>
            <Textarea id="ask" ref={askRef} rows={2} placeholder="e.g. 15-min coffee chat about the SA program" disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aboutMe">A few lines about you</Label>
            <Textarea id="aboutMe" ref={aboutMeRef} rows={2} placeholder="Year, school, relevant background" disabled={disabled} />
          </div>
        </>
      )}
      collectInput={() => {
        const ask = askRef.current?.value.trim() ?? '';
        if (!ask) {
          toast({ title: 'Add your ask', description: 'What do you want them to do?', variant: 'destructive' });
          return null;
        }
        return {
          contactName: contactNameRef.current?.value.trim() || undefined,
          contactRole: contactRoleRef.current?.value.trim() || undefined,
          context: contextRef.current?.value.trim() || undefined,
          ask,
          aboutMe: aboutMeRef.current?.value.trim() || undefined,
        };
      }}
    />
  );
}
