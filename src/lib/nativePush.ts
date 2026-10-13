import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * iOS: registers with APNs via Capacitor and stores the device token in Supabase.
 * This is intentionally idempotent (upsert on the token).
 */
export async function enableNativePush(): Promise<void> {
  if (!isNativeApp()) throw new Error('Native push is only available in the iOS app.');

  const permStatus = await PushNotifications.requestPermissions();
  if (permStatus.receive !== 'granted') throw new Error('Notifications permission not granted.');

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tokenSubPromise = PushNotifications.addListener('registration', async (token: Token) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await (supabase as any)
          .from('device_push_tokens')
          .upsert(
            {
              user_id: user.id,
              platform: 'ios',
              token: token.value,
              enabled: true,
            },
            { onConflict: 'user_id,platform,token' }
          );

        if (error) throw error;
        finish(() => resolve());
      } catch (e) {
        finish(() => reject(e));
      }
    });

    const errSubPromise = PushNotifications.addListener('registrationError', (err) => {
      const message =
        typeof err === 'string'
          ? err
          : typeof err?.error === 'string'
            ? err.error
            : 'Apple could not register this phone for push notifications.';
      finish(() => reject(new Error(message)));
    });

    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      void tokenSubPromise.then((s) => s.remove()).catch(() => {});
      void errSubPromise.then((s) => s.remove()).catch(() => {});
      settle();
    };

    timeout = setTimeout(() => {
      finish(() => reject(new Error('Timed out while registering for push notifications.')));
    }, 15000);

    void Promise.all([tokenSubPromise, errSubPromise])
      .then(() => PushNotifications.register())
      .catch((e) => finish(() => reject(e)));
  });
}

export async function disableNativePush(): Promise<void> {
  if (!isNativeApp()) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await (supabase as any)
    .from('device_push_tokens')
    .update({ enabled: false })
    .eq('user_id', user.id)
    .eq('platform', 'ios');

  if (error) throw error;
}
