import './ui/style.css';
import { Game } from './core/Game';
import * as Inventory from './systems/Inventory';
import { Assets } from './assets/Assets';

/**
 * 進入點：只負責找 DOM、建立 Game、啟動。
 * 開發時可在主控台用 window.__game 檢查狀態（僅 dev 或網址帶 ?debug）。
 */
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

// 防止手機上雙擊縮放、長按選字、下拉重新整理
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

// 載入畫面：模型載完（或失敗）才開始遊戲；失敗的模型會自動改用程式模型
const loading = document.createElement('div');
loading.className = 'loading';
loading.innerHTML = '<div class="loading-box"><b>小法師</b><span>載入中…</span><i><em></em></i><small>Wei Studio</small></div>';
app.appendChild(loading);
const bar = loading.querySelector('em') as HTMLElement;
const label = loading.querySelector('span') as HTMLElement;

let game!: Game;
await Assets.loadAll((done, total) => {
  bar.style.width = `${(done / total) * 100}%`;
  label.textContent = `載入中… ${done}/${total}`;
});
game = new Game(canvas, app, uiRoot);
game.start();
loading.classList.add('done');
setTimeout(() => loading.remove(), 500);

// PWA：正式版、https（或 localhost）、不在 iframe 內時註冊離線快取
const inFrame = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
if (import.meta.env.PROD && 'serviceWorker' in navigator && !inFrame && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    /* 不支援或被封鎖時照常遊玩 */
  });
}

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __game: Game; __inv: typeof Inventory }).__game = game;
  (window as unknown as { __inv: typeof Inventory }).__inv = Inventory;
}
