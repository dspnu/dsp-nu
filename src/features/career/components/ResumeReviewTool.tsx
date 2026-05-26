import { useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIToolShell } from './AIToolShell';
import { DocumentUpload } from './DocumentUpload';
import { useToast } from '@/hooks/use-toast';

export function ResumeReviewTool() {
  const roleRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="resume_review"
      title="Resume Review"
      description="Upload your resume (PDF or DOCX) or paste it — get specific feedback, rewrites, and ATS keywords."
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
            <Label>Your resume</Label>
            <DocumentUpload
              attachedName={fileName}
              disabled={disabled}
              label="Upload resume"
              hint="We extract the text in your browser — your file never leaves your device until you hit Generate."
              onExtracted={(text, name) => { setResume(text); setFileName(name); }}
              onClear={() => { setFileName(null); setResume(''); }}
            />
            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or paste</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Textarea
              id="resume"
              value={resume}
              onChange={(e) => { setResume(e.target.value); if (fileName) setFileName(null); }}
              rows={10}
              placeholder="Paste the full text of your resume here…"
              disabled={disabled}
              className="font-mono text-xs"
            />
          </div>
        </>
      )}
      collectInput={() => {
        const clean = resume.trim();
        if (clean.length < 100) {
          toast({ title: 'Resume too short', description: 'Upload a file or paste your full resume.', variant: 'destructive' });
          return null;
        }
        return {
          targetRole: roleRef.current?.value.trim() || undefined,
          resume: clean,
        };
      }}
    />
  );
}
