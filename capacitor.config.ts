import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jacobtartabini.dspapp',
  appName: 'DSP Nu',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    // 'never' keeps position:fixed (bottom nav / headers) stable.
    // Safe areas are handled in CSS via env(safe-area-inset-*).
    contentInset: 'never',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: '#faf9f7',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#faf9f7',
    },
    Keyboard: {
      // Native resize avoids shifting the fixed bottom nav with the page.
      resize: 'native',
    },
  },
};

export default config;
