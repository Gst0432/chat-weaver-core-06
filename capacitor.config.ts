import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.000c91c6f9804359901b7034686d3ba2',
  appName: 'chat-weaver-core-06',
  webDir: 'dist',
  server: {
    url: 'https://000c91c6-f980-4359-901b-7034686d3ba2.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DEFAULT',
    },
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;