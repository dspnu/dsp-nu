import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tartabinienterprises.dspnu',
  appName: 'DSP Nu',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#faf9f7',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#faf9f7',
    },
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;
