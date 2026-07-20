import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Ensure camera permission is granted on native before getUserMedia / html5-qrcode.
 * On web this is a no-op (browser prompts on first getUserMedia).
 */
export async function ensureCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    let status = await Camera.checkPermissions();
    if (status.camera === 'granted' || status.camera === 'limited') return true;
    status = await Camera.requestPermissions({ permissions: ['camera'] });
    return status.camera === 'granted' || status.camera === 'limited';
  } catch (e) {
    console.warn('Camera permission check failed:', e);
    return false;
  }
}

/**
 * Capture a photo as a File.
 * Prefers Capacitor Camera on native (more reliable than getUserMedia in WKWebView),
 * falls back to a provided web capture callback.
 */
export async function capturePhotoFile(options?: {
  fileName?: string;
  quality?: number;
}): Promise<File | null> {
  const fileName = options?.fileName ?? `capture-${Date.now()}.jpg`;
  const quality = options?.quality ?? 85;

  if (Capacitor.isNativePlatform()) {
    const ok = await ensureCameraPermission();
    if (!ok) throw new Error('Camera permission not granted');

    const photo = await Camera.getPhoto({
      quality,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      correctOrientation: true,
    });

    if (!photo.webPath) return null;
    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  }

  return null;
}

export function isNativeCameraAvailable(): boolean {
  return Capacitor.isNativePlatform();
}
