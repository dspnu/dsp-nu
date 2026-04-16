import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

function getUrlFromNotification(notification: any): string | null {
  const data = notification?.data;
  const url = data?.url;
  return typeof url === 'string' && url.length ? url : null;
}

export function NativePushBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const actionSub = PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const url = getUrlFromNotification(event?.notification);
      if (url) navigate(url);
    });

    return () => {
      actionSub.remove();
    };
  }, [navigate]);

  return null;
}

