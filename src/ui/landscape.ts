/**
 * 橫式版面（v1.74）：參考 MOBA（英雄聯盟 / 激鬥峽谷）——左上小地圖、右上錢包與選單、
 * 下方中央角色狀態＋道具列、左下搖桿、右下技能扇形。
 *
 * 什麼時候是橫式（v1.75 起自動切換）：
 * - 手機 / 平板（觸控為主）橫著拿 → 橫式；轉回直的 → 直式（不用重新整理）。
 * - 網址帶 ?landscape 強制橫式（電腦測試用）、?portrait 強制直式。
 * - 電腦預設維持直式畫框。
 * - 設定「畫面方向」（v1.79）：自動（手機 / 平板橫拿）、橫式（寬螢幕都用，含電腦）、直式（一律直式畫框）；網址參數優先。
 */
const params = (() => {
  try {
    return new URLSearchParams(location.search);
  } catch {
    return new URLSearchParams();
  }
})();
const forced: boolean | null = params.has('landscape') ? true : params.has('portrait') ? false : null;

let pref: 'auto' | 'portrait' | 'landscape' = 'auto';

function want(): boolean {
  if (forced !== null) return forced;
  if (pref === 'portrait') return false;
  // 「橫式」：螢幕是寬的就用（電腦、平板也算）；畫面是直的時候橫式版面沒辦法用，所以還是直式
  if (pref === 'landscape') return window.innerWidth > window.innerHeight;
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return touch && window.innerWidth > window.innerHeight;
}

/** 目前是不是橫式（會隨手機轉向改變） */
export let LANDSCAPE = want();
const listeners: ((on: boolean) => void)[] = [];

function apply() {
  document.documentElement.classList.toggle('landscape', LANDSCAPE);
}
apply();

/** 橫 / 直切換時通知（Hud 搬動元件用） */
export function onLandscapeChange(cb: (on: boolean) => void) {
  listeners.push(cb);
}

function check() {
  const on = want();
  if (on === LANDSCAPE) return;
  LANDSCAPE = on;
  apply();
  for (const cb of listeners) cb(on);
}
/** 設定「畫面方向」（Game 讀檔後、設定頁切換時呼叫） */
export function setOrientationPref(p: 'auto' | 'portrait' | 'landscape') {
  pref = p;
  const before = LANDSCAPE;
  check();
  // 寬度變了，讓 Game 重新量畫面
  if (before !== LANDSCAPE) window.dispatchEvent(new Event('resize'));
}

// 這個模組比 Game 先載入，所以 resize 時會先切好 #app 寬度，Game 的 resize 再量尺寸
window.addEventListener('resize', check);
window.addEventListener('orientationchange', () => {
  check();
  // 有些手機轉向後尺寸要晚一點才更新
  setTimeout(() => {
    check();
    window.dispatchEvent(new Event('resize'));
  }, 300);
});
