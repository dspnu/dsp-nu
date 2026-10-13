import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jacobtartabini.dspapp',
  appName: 'DSP Nu',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'never'
  },
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1400,
      launchFadeOutDuration: 350,
      backgroundColor: '#faf9f7',
      showSpinner: false
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#faf9f7',
      overlaysWebView: true
    },
    Keyboard: {
      resize: 'native'
    }
  }
};

export default config;
