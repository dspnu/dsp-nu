import { useRef, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIToolShell } from './AIToolShell';
import { DocumentUpload } from './DocumentUpload';
import { useToast } from '@/hooks/use-toast';

export function PersonalBrandTool() {
  const fieldRef = useRef<HTMLInputElement>(null);
  const audienceRef = useRef<HTMLInputElement>(null);
  const goalsRef = useRef<HTMLTextAreaElement>(null);
  const strengthsRef = useRef<HTMLTextAreaElement>(null);
  const [bio, setBio] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="personal_brand"
      title="Personal Brand"
      description="Generate a brand statement, bio variants, and content pillars."
      icon={<Megaphone className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="field">Field / industry</Label>
              <Input id="field" ref={fieldRef} placeholder="e.g. Consulting" disabled={disabled} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audience">Target audience</Label>
              <Input id="audience" ref={audienceRef} placeholder="e.g. Recruiters & alumni" disabled={disabled} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goals">Career goals (1-3 sentences)</Label>
            <Textarea id="goals" ref={goalsRef} rows={3} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="strengths">Your strengths / experiences</Label>
            <Textarea id="strengths" ref={strengthsRef} rows={4} placeholder="Top accomplishments, skills, things you geek out about…" disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label>Existing bio or about doc (optional)</Label>
            <DocumentUpload
              attachedName={fileName}
              disabled={disabled}
              label="Upload current bio (PDF / DOCX)"
              onExtracted={(text, name) => { setBio(text); setFileName(name); }}
              onClear={() => { setFileName(null); setBio(''); }}
            />
          </div>
        </>
      )}
      collectInput={() => {
        const goals = goalsRef.current?.value.trim() ?? '';
        if (!goals) {
          toast({ title: 'Add your goals', description: 'Tell us what you want this brand to do for you.', variant: 'destructive' });
          return null;
        }
        return {
          field: fieldRef.current?.value.trim() || undefined,
          audience: audienceRef.current?.value.trim() || undefined,
          goals,
          strengths: strengthsRef.current?.value.trim() || undefined,
          existingBio: bio.trim() || undefined,
        };
      }}
    />
  );
}
