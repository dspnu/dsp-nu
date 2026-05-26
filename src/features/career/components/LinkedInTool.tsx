import { useRef, useState } from 'react';
import { Linkedin } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIToolShell } from './AIToolShell';
import { DocumentUpload } from './DocumentUpload';
import { useToast } from '@/hooks/use-toast';

export function LinkedInTool() {
  const headlineRef = useRef<HTMLInputElement>(null);
  const aboutRef = useRef<HTMLTextAreaElement>(null);
  const goalRef = useRef<HTMLInputElement>(null);
  const [exportText, setExportText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="linkedin"
      title="LinkedIn Optimizer"
      description="Upload your LinkedIn PDF export or paste your sections — get rewrites and keyword suggestions."
      icon={<Linkedin className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="goal">What do you want your LinkedIn to attract?</Label>
            <Input id="goal" ref={goalRef} placeholder="e.g. Product Management internships at tech companies" disabled={disabled} />
          </div>

          <div className="space-y-1.5">
            <Label>Profile export (recommended)</Label>
            <DocumentUpload
              attachedName={fileName}
              disabled={disabled}
              label="Upload LinkedIn PDF / DOCX"
              hint="On LinkedIn → More → Save to PDF. We'll extract the whole profile."
              onExtracted={(text, name) => { setExportText(text); setFileName(name); }}
              onClear={() => { setFileName(null); setExportText(''); }}
            />
          </div>

          {!fileName && (
            <>
              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or fill in manually</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="headline">Current headline</Label>
                <Input id="headline" ref={headlineRef} placeholder="e.g. Finance Student at OSU | Aspiring Investment Banker" disabled={disabled} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="about">About section</Label>
                <Textarea id="about" ref={aboutRef} rows={5} placeholder="Paste your About section…" disabled={disabled} />
              </div>
            </>
          )}
        </>
      )}
      collectInput={() => {
        if (fileName && exportText.trim().length > 50) {
          return {
            goal: goalRef.current?.value.trim() || undefined,
            linkedinExport: exportText.trim(),
          };
        }
        const headline = headlineRef.current?.value.trim() ?? '';
        const about = aboutRef.current?.value.trim() ?? '';
        if (!headline && !about) {
          toast({ title: 'Need more info', description: 'Upload your LinkedIn export, or fill in a headline / About.', variant: 'destructive' });
          return null;
        }
        return {
          goal: goalRef.current?.value.trim() || undefined,
          headline,
          about,
        };
      }}
    />
  );
}
