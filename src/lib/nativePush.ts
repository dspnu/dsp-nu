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

  await PushNotifications.register();

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out while registering for push notifications.'));
    }, 15000);

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
        cleanup();
        resolve();
      } catch (e) {
        cleanup();
        reject(e);
      }
    });

    const errSubPromise = PushNotifications.addListener('registrationError', (err) => {
      cleanup();
      reject(new Error(typeof err === 'string' ? err : JSON.stringify(err)));
    });

    const cleanup = () => {
      clearTimeout(timeout);
      void tokenSubPromise.then((s) => s.remove()).catch(() => {});
      void errSubPromise.then((s) => s.remove()).catch(() => {});
    };
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
