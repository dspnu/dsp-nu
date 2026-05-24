import { useRef } from 'react';
import { FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIToolShell } from './AIToolShell';
import { useToast } from '@/hooks/use-toast';

export function ResumeReviewTool() {
  const resumeRef = useRef<HTMLTextAreaElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="resume_review"
      title="Resume Review"
      description="Paste your resume — get specific feedback, rewrites, and ATS keyword suggestions."
      icon={<FileText className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="target-role">Target role (optional)</Label>
            <Input
              id="target-role"
              ref={roleRef}
              placeholder="e.g. Investment Banking Summer Analyst"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resume">Resume text</Label>
            <Textarea
              id="resume"
              ref={resumeRef}
              rows={10}
              placeholder="Paste the full text of your resume here…"
              disabled={disabled}
              className="font-mono text-xs"
            />
          </div>
        </>
      )}
      collectInput={() => {
        const resume = resumeRef.current?.value.trim() ?? '';
        if (resume.length < 100) {
          toast({ title: 'Resume too short', description: 'Paste your full resume (at least a few sections).', variant: 'destructive' });
          return null;
        }
        return {
          targetRole: roleRef.current?.value.trim() || undefined,
          resume,
        };
      }}
    />
  );
}
