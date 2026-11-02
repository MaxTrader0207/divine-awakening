import './ui/style.css';
import { Game } from './core/Game';
import * as Inventory from './systems/Inventory';
import { Assets } from './assets/Assets';
import { LocalSave } from './core/SaveSystem';
import { CLASSES, CLASS_LIST, type HeroClass } from './data/classes';

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
loading.classList.add('done');
setTimeout(() => loading.remove(), 500);

// 新玩家：先選職業（已有存檔就直接進遊戲；?class=archer 可略過畫面，測試用）
let heroClass: HeroClass = 'mage';
if (!new LocalSave().load()) heroClass = await pickClass();
game = new Game(canvas, app, uiRoot, heroClass);
game.start();

function pickClass(): Promise<HeroClass> {
  const forced = new URLSearchParams(location.search).get('class');
  if (forced === 'mage' || forced === 'archer') return Promise.resolve(forced);
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'class-pick';
    el.innerHTML = `<div class="cp-box"><h2>選擇你的職業</h2><p>之後可以在「設定 → 重置存檔」重新選擇</p><div class="cp-list"></div></div>`;
    const list = el.querySelector('.cp-list')!;
    for (const id of CLASS_LIST) {
      const c = CLASSES[id];
      const b = document.createElement('button');
      b.className = 'cp-card';
      const sk = c.skills.filter((s) => s.slot !== 'basic').map((s) => `${s.icon} ${s.name}`).join('　');
      b.innerHTML = `<span class="cp-ico">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small><em>${sk}</em><i>HP ${c.base.maxHp}・攻擊 ${c.base.atk}・移速 ${c.base.moveSpeed}・爆擊 ${Math.round(c.base.critRate * 100)}%</i>`;
      b.addEventListener('click', () => {
        el.classList.add('done');
        setTimeout(() => el.remove(), 350);
        resolve(id);
      });
      list.appendChild(b);
    }
    app.appendChild(el);
  });
}

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
