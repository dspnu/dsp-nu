import { useRef } from 'react';
import { Target } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIToolShell } from './AIToolShell';
import { useToast } from '@/hooks/use-toast';

export function JobStrategyTool() {
  const targetRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLTextAreaElement>(null);
  const constraintsRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="job_strategy"
      title="Job Search Strategy"
      description="A 30/60/90-day plan, target list framework, and weekly targets."
      icon={<Target className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="js-target">Target role</Label>
              <Input id="js-target" ref={targetRef} placeholder="e.g. Data Analyst" disabled={disabled} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="js-timeline">Timeline</Label>
              <Input id="js-timeline" ref={timelineRef} placeholder="e.g. Offer by Dec" disabled={disabled} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="js-status">Where are you today?</Label>
            <Textarea id="js-status" ref={statusRef} rows={3} placeholder="Year in school, GPA, top experiences, current apps in progress…" disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="js-cons">Constraints / preferences (optional)</Label>
            <Textarea id="js-cons" ref={constraintsRef} rows={2} placeholder="Location, visa, salary, remote-only, etc." disabled={disabled} />
          </div>
        </>
      )}
      collectInput={() => {
        const target = targetRef.current?.value.trim() ?? '';
        if (!target) {
          toast({ title: 'Add a target role', variant: 'destructive' });
          return null;
        }
        return {
          targetRole: target,
          timeline: timelineRef.current?.value.trim() || undefined,
          currentStatus: statusRef.current?.value.trim() || undefined,
          constraints: constraintsRef.current?.value.trim() || undefined,
        };
      }}
    />
  );
}
