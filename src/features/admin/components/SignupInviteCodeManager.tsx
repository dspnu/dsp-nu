import { useEffect, useState } from 'react';
import { KeyRound, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChapterSetting, useUpdateChapterSetting } from '@/hooks/useChapterSettings';
import { toast } from 'sonner';

function asInviteCode(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
}

export function SignupInviteCodeManager() {
  const { data: storedCode, isPending } = useChapterSetting<string>('signup_invite_code', {
    whenMissing: '',
  });
  const updateSetting = useUpdateChapterSetting();
  const currentCode = asInviteCode(storedCode);
  const [draft, setDraft] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!isPending && !hydrated) {
      setDraft(currentCode);
      setHydrated(true);
    }
  }, [isPending, hydrated, currentCode]);

  const save = () => {
    const next = draft.trim();
    if (!next) {
      toast.error('Invite code cannot be empty.');
      return;
    }
    updateSetting.mutate(
      { key: 'signup_invite_code', value: next },
      {
        onSuccess: () => {
          setRevealed(true);
        },
      },
    );
  };

  const copy = async () => {
    const code = draft.trim() || currentCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Invite code copied');
    } catch {
      toast.error('Could not copy invite code');
    }
  };

  const generate = () => {
    const semester = new Date().getMonth() < 6 ? 'SPRING' : 'FALL';
    const year = String(new Date().getFullYear()).slice(-2);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    setDraft(`NU-${semester}${year}-${suffix}`);
    setRevealed(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Signup invite code
        </CardTitle>
        <CardDescription>
          Required for new accounts only. Rotating the code does not lock out brothers who already signed up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="signup-invite-code">Current code</Label>
          <div className="flex gap-2">
            <Input
              id="signup-invite-code"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              type={revealed ? 'text' : 'password'}
              autoComplete="off"
              placeholder={isPending ? 'Loading…' : 'Set a chapter invite code'}
              disabled={isPending}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? 'Hide invite code' : 'Show invite code'}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={save} disabled={updateSetting.isPending || isPending}>
            Save code
          </Button>
          <Button type="button" variant="outline" onClick={() => void copy()} disabled={!draft.trim() && !currentCode}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button type="button" variant="secondary" onClick={generate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
