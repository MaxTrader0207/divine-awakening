/**
 * 離線遊玩狀態（v1.85）：問 Service Worker 已經下載了幾個遊戲檔案。
 * 單一 HTML 版、claude.ai 預覽（iframe）、開發模式沒有 Service Worker → supported: false。
 */
export interface OfflineStatus {
  supported: boolean;
  cached: number;
  total: number;
}

export function offlineStatus(timeoutMs = 8000): Promise<OfflineStatus> {
  const none: OfflineStatus = { supported: false, cached: 0, total: 0 };
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return Promise.resolve(none);
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      navigator.serviceWorker.removeEventListener('message', on);
      resolve({ supported: true, cached: 0, total: 0 });
    }, timeoutMs);
    const on = (e: MessageEvent) => {
      if (e.data?.type !== 'sw:status') return;
      clearTimeout(t);
      navigator.serviceWorker.removeEventListener('message', on);
      resolve({ supported: true, cached: e.data.cached ?? 0, total: e.data.total ?? 0 });
    };
    navigator.serviceWorker.addEventListener('message', on);
    sw.postMessage({ type: 'sw:status' });
  });
}
