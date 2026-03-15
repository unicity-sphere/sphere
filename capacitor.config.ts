import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.unicity.sphere',
  appName: 'Sphere',
  webDir: 'dist',
  server: {
    // Required for localStorage, IndexedDB to work in Android WebView
    androidScheme: 'https',
  },
};

export default config;
