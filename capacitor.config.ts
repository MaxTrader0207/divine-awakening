import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor：把網頁版包成 Android / iOS App（說明見 docs/APP.md）
 * webDir 是 `npm run build` 的輸出資料夾。
 */
const config: CapacitorConfig = {
  appId: 'com.weistudio.littlemage',
  appName: '古希臘探險',
  webDir: 'dist',
  backgroundColor: '#0e131c',
  android: {
    allowMixedContent: false,
  },
};

export default config;
