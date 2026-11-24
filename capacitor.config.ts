import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 8：把網頁版包成 Android App Bundle（.aab）/ iOS App（說明見 docs/APP.md）
 * webDir 是 `npm run build` 的輸出資料夾。原生行為（全螢幕、返回鍵）在 src/platform/native.ts。
 */
const config: CapacitorConfig = {
  appId: 'com.weistudio.divineawakening',
  appName: '神格覺醒',
  webDir: 'dist',
  backgroundColor: '#0e131c',
  android: {
    allowMixedContent: false,
    // 正式版不開放 chrome://inspect 偵錯（debug 建置 Capacitor 會自動開）
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    // Android 16（targetSdk 36）強制 edge-to-edge：畫面畫到劉海 / 手勢條底下，
    // 版面靠 style.css 的 env(safe-area-inset-*) 避開；舊版 WebView（Chromium < 140）由 Capacitor 補正
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
      hidden: true,
    },
  },
};

export default config;
