import { useCallback, useEffect, useState } from 'react';
import { Copy, Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Factor, PasskeyListItem } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { org } from '@/config/org';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { canUsePasskeys, isPasskeyCancellation, passkeyErrorMessage } from '@/core/auth/webauthnSupport';

function qrImageSrc(qrCode: string): string {
  return qrCode.startsWith('data:') ? qrCode : `data:image/svg+xml;utf-8,${qrCode}`;
}

export function SecuritySettingsCard() {
  const [totpFactors, setTotpFactors] = useState<Factor[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const passkeysAvailable = canUsePasskeys();

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    setTotpFactors(data.totp);

    if (passkeysAvailable) {
      try {
        const listed = await supabase.auth.passkey.list();
        if (!listed.error && listed.data) {
          setPasskeys(listed.data);
        }
      } catch {
        setPasskeys([]);
      }
    }
  }, [passkeysAvailable]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Could not load security settings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const cancelEnroll = async (id: string | null) => {
    if (id) {
      await supabase.auth.mfa.unenroll({ factorId: id });
    }
    setEnrolling(false);
    setFactorId(null);
    setQr('');
    setSecret('');
    setCode('');
  };

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified = existing?.all?.filter((factor) => factor.status !== 'verified') ?? [];
      await Promise.all(unverified.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })));

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator',
        issuer: org.shortName,
      });
      if (error) throw error;
      if (!data || !('totp' in data) || !data.totp) {
        throw new Error('Unexpected authenticator response');
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setCode('');
      setEnrolling(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start authenticator setup');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (nextCode: string) => {
    if (!factorId || nextCode.length !== 6 || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: nextCode,
    });
    if (error) {
      toast.error(error.message);
      setCode('');
      setBusy(false);
      return;
    }
    toast.success('Authenticator enabled. Other devices were signed out.');
    setEnrolling(false);
    setFactorId(null);
    setQr('');
    setSecret('');
    setCode('');
    setBusy(false);
    await refresh();
  };

  const disableTotp = async () => {
    const factor = totpFactors[0];
    if (!factor) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    await supabase.auth.refreshSession();
    toast.success('Authenticator disabled.');
    setDisableOpen(false);
    setBusy(false);
    await refresh();
  };

  const registerPasskey = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      if (data?.id) {
        await supabase.auth.passkey.update({
          passkeyId: data.id,
          friendlyName: `${org.shortName} passkey`,
        });
      }
      toast.success('Passkey saved on this device.');
      await refresh();
    } catch (error) {
      if (!isPasskeyCancellation(error)) {
        toast.error(passkeyErrorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  };

  const deletePasskey = async (passkeyId: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId });
      if (error) throw error;
      toast.success('Passkey removed.');
      await refresh();
    } catch (error) {
      toast.error(passkeyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const totpEnabled = totpFactors.length > 0;

  return (
    <>
      <div className="rounded-xl border bg-card divide-y">
        <div className="px-4 py-3.5 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Authenticator app</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Optional extra step after password or Google/Apple. Use Google Authenticator, Authy, 1Password, or Apple
                Passwords.
              </p>
            </div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mt-1" />
            ) : totpEnabled ? (
              <span className="text-xs font-medium text-primary shrink-0 mt-1">On</span>
            ) : null}
          </div>

          {enrolling && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
              </p>
              {qr && (
                <div className="flex justify-center">
                  <div className="rounded-lg bg-white p-3">
                    <img src={qrImageSrc(qr)} alt="Authenticator QR code" className="h-40 w-40" />
                  </div>
                </div>
              )}
              {secret && (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <code className="text-xs break-all flex-1">{secret}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      void navigator.clipboard.writeText(secret);
                      toast.success('Secret copied');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => {
                    const digits = value.replace(/\D/g, '').slice(0, 6);
                    setCode(digits);
                    if (digits.length === 6) void confirmEnroll(digits);
                  }}
                  disabled={busy}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void cancelEnroll(factorId)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={busy || code.length !== 6} onClick={() => void confirmEnroll(code)}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
                </Button>
              </div>
            </div>
          )}

          {!enrolling && !loading && (
            <div className="mt-3 flex justify-end">
              {totpEnabled ? (
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setDisableOpen(true)}>
                  Turn off
                </Button>
              ) : (
                <Button type="button" size="sm" disabled={busy} onClick={() => void startEnroll()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set up'}
                </Button>
              )}
            </div>
          )}
        </div>

        {passkeysAvailable && (
          <div className="px-4 py-3.5 sm:px-5">
            <div className="flex items-start gap-3">
              <Fingerprint className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Passkeys</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign in with Face ID, Touch ID, or a hardware key instead of a password. This is a login method, not a
                  second factor — if an authenticator is also on, you will still enter a code after the passkey.
                </p>
                {passkeys.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {passkeys.map((passkey) => (
                      <li key={passkey.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm truncate">{passkey.friendly_name || 'Passkey'}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void deletePasskey(passkey.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void registerPasskey()}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add passkey'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={disableOpen} onOpenChange={setDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off authenticator?</AlertDialogTitle>
            <AlertDialogDescription>
              You will only need your password or Google/Apple to sign in. Officers can also reset this if you lose the
              device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it on</AlertDialogCancel>
            <AlertDialogAction onClick={() => void disableTotp()}>Turn off</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function SecuritySectionLabel() {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sign-in security</h3>
    </div>
  );
}
