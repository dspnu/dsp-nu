import { useRef } from 'react';
import { Linkedin } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIToolShell } from './AIToolShell';
import { useToast } from '@/hooks/use-toast';

export function LinkedInTool() {
  const headlineRef = useRef<HTMLInputElement>(null);
  const aboutRef = useRef<HTMLTextAreaElement>(null);
  const expRef = useRef<HTMLTextAreaElement>(null);
  const goalRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="linkedin"
      title="LinkedIn Optimizer"
      description="Sharpen your headline, About, and experience bullets for recruiters."
      icon={<Linkedin className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="goal">What do you want your LinkedIn to attract?</Label>
            <Input id="goal" ref={goalRef} placeholder="e.g. Product Management internships at tech companies" disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="headline">Current headline</Label>
            <Input id="headline" ref={headlineRef} placeholder="e.g. Finance Student at OSU | Aspiring Investment Banker" disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="about">About section</Label>
            <Textarea id="about" ref={aboutRef} rows={5} placeholder="Paste your About section…" disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="experience">A few experience bullets</Label>
            <Textarea id="experience" ref={expRef} rows={6} placeholder="Paste 3-5 bullets from your most recent role…" disabled={disabled} className="font-mono text-xs" />
          </div>
        </>
      )}
      collectInput={() => {
        const headline = headlineRef.current?.value.trim() ?? '';
        const about = aboutRef.current?.value.trim() ?? '';
        if (!headline && !about) {
          toast({ title: 'Need more info', description: 'Provide at least a headline or About section.', variant: 'destructive' });
          return null;
        }
        return {
          goal: goalRef.current?.value.trim() || undefined,
          headline,
          about,
          experienceBullets: expRef.current?.value.trim() || undefined,
        };
      }}
    />
  );
}
