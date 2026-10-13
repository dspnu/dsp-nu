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
    CapacitorUpdater: {
      autoUpdate: 'always',
      version: '0.0.0',
      appId: 'com.jacobtartabini.dspapp',
      autoSplashscreen: true
    },
    SplashScreen: {
      launchAutoHide: false,
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
