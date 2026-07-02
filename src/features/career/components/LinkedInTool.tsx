import { useRef, useState } from 'react';
import { Linkedin, Target, Briefcase, TrendingUp, Users, Sparkles, PencilLine } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AIToolShell } from './AIToolShell';
import { DocumentUpload } from './DocumentUpload';
import { ChoiceChips } from './ChoiceChips';
import { useToast } from '@/hooks/use-toast';

type Goal = 'internships' | 'full_time' | 'networking' | 'personal_brand' | 'custom';

const GOAL_OPTIONS: { value: Goal; label: string; icon: React.ReactNode; prompt: string }[] = [
  { value: 'internships', label: 'Land internships', icon: <Briefcase className="h-3.5 w-3.5" />, prompt: 'Land competitive internships' },
  { value: 'full_time', label: 'Full-time roles', icon: <Target className="h-3.5 w-3.5" />, prompt: 'Get noticed for full-time roles' },
  { value: 'networking', label: 'Grow my network', icon: <Users className="h-3.5 w-3.5" />, prompt: 'Attract recruiters and industry contacts' },
  { value: 'personal_brand', label: 'Build my brand', icon: <TrendingUp className="h-3.5 w-3.5" />, prompt: 'Build a strong personal brand' },
  { value: 'custom', label: 'Something else', icon: <Sparkles className="h-3.5 w-3.5" /> , prompt: '' },
];

export function LinkedInTool() {
  const [goal, setGoal] = useState<Goal>('internships');
  const customGoalRef = useRef<HTMLInputElement>(null);
  const [exportText, setExportText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const headlineRef = useRef<HTMLInputElement>(null);
  const aboutRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  return (
    <AIToolShell
      tool="linkedin"
      title="LinkedIn Optimizer"
      description="Upload your profile export — get a full audit in seconds."
      icon={<Linkedin className="h-5 w-5" />}
      renderForm={({ disabled }) => (
        <div className="space-y-5">
          {/* Goal */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">What's your goal?</Label>
            <ChoiceChips options={GOAL_OPTIONS} value={goal} onChange={setGoal} disabled={disabled} />
            {goal === 'custom' && (
              <Input
                ref={customGoalRef}
                placeholder="Describe your goal in a sentence…"
                disabled={disabled}
                className="mt-2"
              />
            )}
          </div>

          {/* Upload */}
          {!manual ? (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Your profile</Label>
              <DocumentUpload
                attachedName={fileName}
                disabled={disabled}
                label="Upload LinkedIn PDF export"
                hint="On LinkedIn → your profile → More → Save to PDF"
                onExtracted={(text, name) => { setExportText(text); setFileName(name); }}
                onClear={() => { setFileName(null); setExportText(''); }}
              />
              {!fileName && (
                <button
                  type="button"
                  onClick={() => setManual(true)}
                  disabled={disabled}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 inline-flex items-center gap-1"
                >
                  <PencilLine className="h-3 w-3" /> No file? Enter manually
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Enter manually</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setManual(false)}>
                  Upload instead
                </Button>
              </div>
              <Input ref={headlineRef} placeholder="Your headline" disabled={disabled} />
              <Textarea ref={aboutRef} rows={4} placeholder="Your About section…" disabled={disabled} />
            </div>
          )}
        </div>
      )}
      collectInput={() => {
        const chosen = GOAL_OPTIONS.find(g => g.value === goal)!;
        const goalText = goal === 'custom'
          ? customGoalRef.current?.value.trim() || ''
          : chosen.prompt;

        if (!manual && fileName && exportText.trim().length > 50) {
          return { goal: goalText || undefined, linkedinExport: exportText.trim() };
        }
        if (manual) {
          const headline = headlineRef.current?.value.trim() ?? '';
          const about = aboutRef.current?.value.trim() ?? '';
          if (!headline && !about) {
            toast({ title: 'Add your headline or About', variant: 'destructive' });
            return null;
          }
          return { goal: goalText || undefined, headline, about };
        }
        toast({ title: 'Upload your LinkedIn export', description: 'Or switch to manual entry.', variant: 'destructive' });
        return null;
      }}
    />
  );
}
