import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clapperboard, CheckCircle, ExternalLink, ChevronDown, Send, Link2, Upload, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { useMyPaddleSubmission, useSubmitPaddle } from '@/hooks/usePaddleSubmissions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { org } from '@/config/org';

type SubmitMode = 'link' | 'upload';

export function PaddleSubmissionCard() {
  const { user } = useAuth();
  const { data: visible, isLoading: settingLoading } = useChapterSetting('paddle_submissions_visible');
  const { data: existing, isLoading: subLoading } = useMyPaddleSubmission();
  const submitPaddle = useSubmitPaddle();

  const [isOpen, setIsOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [mode, setMode] = useState<SubmitMode>('link');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (settingLoading || !visible || subLoading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subjectName.trim()) return;

    let finalUrl = '';

    if (mode === 'link') {
      if (!linkUrl.trim()) return;
      finalUrl = linkUrl.trim();
    } else {
      if (!file) return;
      setUploading(true);
      try {
        const ext = file.name.split('.').pop() || 'mp4';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('paddle-media')
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('paddle-media')
          .getPublicUrl(path);
        finalUrl = urlData.publicUrl;
      } catch (err) {
        toast.error('Failed to upload file');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    submitPaddle.mutate({
      user_id: user.id,
      subject_name: subjectName.trim(),
      link_url: finalUrl,
    });
  };

  const isSubmitting = submitPaddle.isPending || uploading;

  if (existing) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Clapperboard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Paddle Submitted!</p>
                <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                  <CheckCircle className="h-2.5 w-2.5" />Done
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Video of <span className="font-medium text-foreground">{existing.subject_name}</span>
              </p>
            </div>
            <a
              href={existing.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0"
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden border-border/60 hover:border-primary/30 transition-all">
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Clapperboard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">🎬 Paddle Time!</p>
                <p className="text-xs text-muted-foreground">
                  Submit a funny video of a {org.terms.member.toLowerCase()}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="border-t border-border/40 pt-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="paddle-subject" className="text-xs font-medium">Who's the star of this video?</Label>
                  <Input
                    id="paddle-subject"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="h-9"
                    required
                  />
                </div>

                {/* Mode toggle */}
                <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMode('link')}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-all ${
                      mode === 'link'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Paste Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-all ${
                      mode === 'upload'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload File
                  </button>
                </div>

                {mode === 'link' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="paddle-link" className="text-xs font-medium">Video Link</Label>
                    <Input
                      id="paddle-link"
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="Paste your link here..."
                      className="h-9"
                      required={mode === 'link'}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Video / Photo</Label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="video/*,image/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    {file ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/40">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 h-9"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Choose file
                      </Button>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  size="sm"
                  className="w-full gap-2"
                  disabled={isSubmitting || (!linkUrl.trim() && mode === 'link') || (!file && mode === 'upload') || !subjectName.trim()}
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />{uploading ? 'Uploading...' : 'Submitting...'}</>
                  ) : (
                    <><Send className="h-3.5 w-3.5" />Send It</>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
