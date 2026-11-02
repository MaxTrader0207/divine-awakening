import './ui/style.css';
import { Game } from './core/Game';

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

const game = new Game(canvas, app, uiRoot);
game.start();

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __game: Game }).__game = game;
}
