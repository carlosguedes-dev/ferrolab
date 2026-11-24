import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.carlosguedes.ferrolab',
  appName: 'FerroLab',
  webDir: 'dist',
  backgroundColor: '#07080B',
  android: {
    backgroundColor: '#07080B',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
