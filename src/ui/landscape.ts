/**
 * 橫式版面（v1.74 試作 → v1.113 起是唯一的版面，直式已移除）
 * ------------------------------------------------------------
 * 參考 MOBA：左上小地圖、右上錢包與選單、下方中央角色狀態＋道具列、左下搖桿、右下技能扇形。
 * - `<html class="landscape">` 永遠掛著（style.css 的橫式規則都靠它）；`LANDSCAPE` 永遠是 true。
 * - App 版由 AndroidManifest 鎖 `sensorLandscape`（左右橫放都可以）；PWA 由 manifest 的 `orientation: landscape` 鎖。
 * - 一般瀏覽器鎖不了方向：畫面是直的（高 > 寬）時顯示「請把裝置橫放」遮罩，轉橫就消失（遊戲在遮罩底下照常，Game 會先暫停）。
 */
export const LANDSCAPE = true;

document.documentElement.classList.add('landscape');

const isUpright = () => window.innerHeight > window.innerWidth;
const listeners: ((upright: boolean) => void)[] = [];
let upright = isUpright();

/** 目前畫面是不是直的（顯示著「請橫放」遮罩） */
export const isRotatePromptOn = () => upright;
/** 直 ↔ 橫改變時通知（Game：變直的時候暫停） */
export function onUprightChange(cb: (upright: boolean) => void) {
  listeners.push(cb);
}

let prompt: HTMLElement | null = null;
function render() {
  document.documentElement.classList.toggle('upright', upright);
  if (upright && !prompt) {
    prompt = document.createElement('div');
    prompt.className = 'rotate-prompt';
    const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    prompt.innerHTML = `<div class="rp-box"><i class="rp-phone"></i><b>請把${touch ? '裝置橫放' : '視窗拉寬'}</b><span>神格覺醒是橫式遊戲${touch ? '（記得關閉手機的「直向鎖定」）' : ''}</span></div>`;
    document.body.appendChild(prompt);
  } else if (!upright && prompt) {
    prompt.remove();
    prompt = null;
  }
}

function check() {
  const now = isUpright();
  if (now === upright) return;
  upright = now;
  render();
  for (const cb of listeners) cb(upright);
}

// 能鎖就鎖（已安裝的 PWA、全螢幕時有效；一般分頁會被拒絕，忽略即可）
try {
  const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  void o?.lock?.('landscape')?.catch(() => {});
} catch {
  /* 不支援 */
}

if (document.body) render();
else document.addEventListener('DOMContentLoaded', render);

// 這個模組比 Game 先載入，所以 resize 時會先更新遮罩，Game 的 resize 再量尺寸
window.addEventListener('resize', check);
window.addEventListener('orientationchange', () => {
  check();
  // 有些手機轉向後尺寸要晚一點才更新
  setTimeout(() => {
    check();
    window.dispatchEvent(new Event('resize'));
  }, 300);
});
