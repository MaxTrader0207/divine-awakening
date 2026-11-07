/**
 * 橫式版面（v1.74 試作）：網址帶 ?landscape 時啟用（之後可改成設定或依手機方向自動切換）。
 * 參考 MOBA（英雄聯盟 / 激鬥峽谷）：左上小地圖、右上錢包與選單、下方中央角色狀態＋道具列、
 * 左下搖桿、右下技能扇形。直式版面完全不受影響。
 */
export const LANDSCAPE = (() => {
  try {
    return new URLSearchParams(location.search).has('landscape');
  } catch {
    return false;
  }
})();
if (LANDSCAPE) document.documentElement.classList.add('landscape');
