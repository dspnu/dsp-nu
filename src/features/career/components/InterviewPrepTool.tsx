import { useRef } from 'react';
import { MessagesSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIToolShell } from './AIToolShell';
import { useToast } from '@/hooks/use-toast';

export function InterviewPrepTool() {
  const roleRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const jdRef = useRef<HTMLTextAreaElement>(null);
  const bgRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="interview_prep"
      title="Interview Prep"
      description="Likely questions, technical practice, and a STAR-answer template."
      icon={<MessagesSquare className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ip-role">Role</Label>
              <Input id="ip-role" ref={roleRef} placeholder="e.g. Product Manager Intern" disabled={disabled} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ip-company">Company (optional)</Label>
              <Input id="ip-company" ref={companyRef} placeholder="e.g. Stripe" disabled={disabled} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ip-jd">Job description (paste it in)</Label>
            <Textarea id="ip-jd" ref={jdRef} rows={6} disabled={disabled} className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ip-bg">Your relevant background (1-2 stories)</Label>
            <Textarea id="ip-bg" ref={bgRef} rows={4} placeholder="A leadership moment, a recent project, etc." disabled={disabled} />
          </div>
        </>
      )}
      collectInput={() => {
        const role = roleRef.current?.value.trim() ?? '';
        if (!role) {
          toast({ title: 'Add the role', description: 'We need a target role to tailor questions.', variant: 'destructive' });
          return null;
        }
        return {
          role,
          company: companyRef.current?.value.trim() || undefined,
          jobDescription: jdRef.current?.value.trim() || undefined,
          background: bgRef.current?.value.trim() || undefined,
        };
      }}
    />
  );
}
