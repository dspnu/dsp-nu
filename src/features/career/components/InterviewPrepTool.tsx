import { useRef, useState } from 'react';
import { MessagesSquare, Users, Code2, Building2, Sparkles, PencilLine } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AIToolShell } from './AIToolShell';
import { DocumentUpload } from './DocumentUpload';
import { ChoiceChips } from './ChoiceChips';
import { useToast } from '@/hooks/use-toast';

type Focus = 'behavioral' | 'technical' | 'case' | 'mixed';

const FOCUS_OPTIONS: { value: Focus; label: string; icon: React.ReactNode }[] = [
  { value: 'behavioral', label: 'Behavioral', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'technical', label: 'Technical', icon: <Code2 className="h-3.5 w-3.5" /> },
  { value: 'case', label: 'Case / fit', icon: <Building2 className="h-3.5 w-3.5" /> },
  { value: 'mixed', label: 'Mixed', icon: <Sparkles className="h-3.5 w-3.5" /> },
];

export function InterviewPrepTool() {
  const [focus, setFocus] = useState<Focus>('behavioral');
  const roleRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const [jd, setJd] = useState('');
  const [jdFile, setJdFile] = useState<string | null>(null);
  const [showJdPaste, setShowJdPaste] = useState(false);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="interview_prep"
      title="Interview Prep"
      description="Get tailored questions, model answers, and coach tips."
      icon={<MessagesSquare className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <div className="space-y-5">
          {/* Role card */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Interviewing for</Label>
            <div className="rounded-xl border border-border bg-muted/30 p-3 grid sm:grid-cols-2 gap-2">
              <Input
                ref={roleRef}
                placeholder="Role (e.g. PM Intern)"
                disabled={disabled}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 px-0"
              />
              <Input
                ref={companyRef}
                placeholder="Company (optional)"
                disabled={disabled}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 px-0 sm:border-l sm:border-border/60 sm:pl-3"
              />
            </div>
          </div>

          {/* Focus */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Focus</Label>
            <ChoiceChips options={FOCUS_OPTIONS} value={focus} onChange={setFocus} disabled={disabled} />
          </div>

          {/* JD (optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Job description <span className="text-muted-foreground/60 normal-case">(optional)</span>
              </Label>
              {!jdFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowJdPaste(v => !v)}
                  disabled={disabled}
                >
                  <PencilLine className="h-3 w-3 mr-1" />
                  {showJdPaste ? 'Upload instead' : 'Paste text'}
                </Button>
              )}
            </div>
            {!showJdPaste ? (
              <DocumentUpload
                attachedName={jdFile}
                disabled={disabled}
                label="Upload JD (PDF / DOCX)"
                onExtracted={(text, name) => { setJd(text); setJdFile(name); }}
                onClear={() => { setJdFile(null); setJd(''); }}
              />
            ) : (
              <Textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={5}
                disabled={disabled}
                className="text-xs"
                placeholder="Paste the full job description…"
              />
            )}
          </div>
        </div>
      )}
      collectInput={() => {
        const role = roleRef.current?.value.trim() ?? '';
        if (!role) {
          toast({ title: 'Add the role you\'re interviewing for', variant: 'destructive' });
          return null;
        }
        return {
          role,
          focus,
          company: companyRef.current?.value.trim() || undefined,
          jobDescription: jd.trim() || undefined,
        };
      }}
    />
  );
}
