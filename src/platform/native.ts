import { Capacitor, SystemBars } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * 原生 App 層（v1.112）：Android App Bundle（Capacitor 8）專用的行為，網頁版完全不受影響。
 * ------------------------------------------------------------
 * 只有這個檔案可以 import `@capacitor/*`；其他地方要判斷平台用 `IS_NATIVE`。
 * - 全螢幕：隱藏狀態列與導覽列（回到前景時再隱藏一次，系統有時會把它們叫回來）。
 * - 返回鍵 / 返回手勢：交給 `hooks.onBack()`（Game.handleBack：關選單 → 暫停），
 *   沒有東西可以處理時把 App 縮到背景（不直接結束，回來還在原地）。
 * - 切到背景：`hooks.onBackground()` 立刻存檔（WebView 的 visibilitychange 偶爾來得比較晚）。
 * - 螢幕恆亮寫在 android/.../MainActivity.java（不需要外掛）。
 * - App 版不註冊 Service Worker（檔案本來就包在 App 裡，見 main.ts）。
 */
export const IS_NATIVE = Capacitor.isNativePlatform();
/** 'android' / 'ios' / 'web' */
export const PLATFORM = Capacitor.getPlatform();

export interface NativeHooks {
  /** 返回鍵：有處理回傳 true；回傳 false → App 縮到背景 */
  onBack?: () => boolean;
  /** App 被切到背景（存檔） */
  onBackground?: () => void;
}

const hooks: NativeHooks = {};

/** Game 建好後接上（開頭畫面、選職業時還沒有 Game，返回鍵就是縮到背景） */
export function setNativeHooks(h: NativeHooks) {
  Object.assign(hooks, h);
}

const hideBars = () => void SystemBars.hide().catch(() => {});

/** 啟動時呼叫一次（網頁版直接略過） */
export function initNative() {
  if (!IS_NATIVE) return;
  document.documentElement.classList.add('native', `native-${PLATFORM}`);
  hideBars();
  void App.addListener('backButton', () => {
    let handled = false;
    try {
      handled = hooks.onBack?.() ?? false;
    } catch {
      handled = false;
    }
    if (!handled) void App.minimizeApp().catch(() => {});
  });
  void App.addListener('pause', () => {
    try {
      hooks.onBackground?.();
    } catch {
      /* 存檔失敗不影響切換 */
    }
  });
  void App.addListener('resume', hideBars);
}
