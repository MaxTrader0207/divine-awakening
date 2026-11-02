import { SaveSlots, type SlotInfo } from '@/core/SaveSystem';
import { CLASSES } from '@/data/classes';
import { DUNGEON_ORDER, zoneLabel } from '@/data/zones';
import { h } from './dom';

/**
 * 開頭畫面：遊戲標題 + 「繼續遊戲」 + 5 格存檔。
 * 回傳玩家選的欄位（呼叫端負責 setActive；空格接著進選職業）。
 * 從選單「讀取 / 開新遊戲」重新載入時會跳過（見 skipTitleOnce）。
 */
const SKIP_KEY = 'little-mage.skipTitle';

/** 下一次載入跳過開頭畫面（選單切換存檔時用） */
export function skipTitleOnce() {
  try {
    sessionStorage.setItem(SKIP_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** 這次載入要不要顯示開頭畫面（會順便清掉跳過旗標） */
export function shouldShowTitle(): boolean {
  if (new URLSearchParams(location.search).has('class')) return false; // 測試用：直接進遊戲
  try {
    if (sessionStorage.getItem(SKIP_KEY)) {
      sessionStorage.removeItem(SKIP_KEY);
      return false;
    }
  } catch {
    /* ignore */
  }
  return true;
}

const fmtTime = (t?: number) => (t ? new Date(t).toLocaleString('zh-TW', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const fmtPlay = (sec = 0) => {
  const m = Math.floor(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60} 分` : `${m} 分`;
};

function slotSummary(info: SlotInfo): string {
  const cls = CLASSES[info.heroClass ?? 'mage'];
  return `${cls.name} Lv.${info.level}・${zoneLabel(info.zoneId)}`;
}

export function showTitleScreen(app: HTMLElement, slots: SaveSlots, version: string): Promise<number> {
  return new Promise((resolve) => {
    const el = h('div', { class: 'title-screen' });
    const finish = (n: number) => {
      el.classList.add('done');
      setTimeout(() => el.remove(), 400);
      resolve(n);
    };

    const draw = () => {
      const list = slots.list();
      const active = slots.active;
      const cur = list[active - 1];
      const firstEmpty = list.find((s) => s.empty)?.slot;
      const hasAny = list.some((s) => !s.empty && !s.corrupt);

      // 主按鈕：有存檔 → 繼續；沒有 → 開始新遊戲
      const main = !cur.empty && !cur.corrupt
        ? h('button', { class: 'ts-continue', onclick: () => finish(active) }, [
            h('b', {}, '繼續遊戲'),
            h('small', {}, `存檔 ${active}・${cur.playerName ?? ''}・${slotSummary(cur)}`),
          ])
        : h('button', { class: 'ts-continue', onclick: () => finish(cur.empty ? active : (firstEmpty ?? active)) }, [
            h('b', {}, hasAny ? '開始新遊戲' : '開始遊戲'),
            h('small', {}, `建立在存檔 ${cur.empty ? active : (firstEmpty ?? active)}`),
          ]);

      const rows = list.map((info) => {
        const n = info.slot;
        const isActive = n === active;
        if (info.empty) {
          return h('button', { class: 'ts-slot empty', 'data-slot': n, onclick: () => finish(n) }, [
            h('span', { class: 'ts-no' }, String(n)),
            h('span', { class: 'ts-info' }, [h('b', {}, '＋ 新遊戲'), h('small', {}, '空的存檔欄位')]),
          ]);
        }
        if (info.corrupt) {
          return h('div', { class: 'ts-slot bad', 'data-slot': n }, [
            h('span', { class: 'ts-no' }, String(n)),
            h('span', { class: 'ts-info' }, [h('b', {}, '存檔損壞'), h('small', {}, '無法讀取，可以刪除後重新開始')]),
            delBtn(n),
          ]);
        }
        const cls = CLASSES[info.heroClass ?? 'mage'];
        return h('div', { class: `ts-slot${isActive ? ' active' : ''}`, 'data-slot': n }, [
          h('button', { class: 'ts-pick', onclick: () => finish(n) }, [
            h('span', { class: 'ts-no' }, String(n)),
            h('span', { class: 'ts-ico' }, cls.icon),
            h('span', { class: 'ts-info' }, [
              h('b', {}, `${info.playerName ?? cls.name}　${slotSummary(info)}`),
              h('small', {}, `首領 ${info.bosses ?? 0}/${DUNGEON_ORDER.length}・遊戲 ${fmtPlay(info.playTime)}・${fmtTime(info.updatedAt)}`),
            ]),
            isActive ? h('em', { class: 'ts-tag' }, '上次') : h('span', {}, ''),
          ]),
          delBtn(n),
        ]);
      });

      el.replaceChildren(
        h('div', { class: 'ts-box' }, [
          h('div', { class: 'ts-logo' }, [h('span', { class: 'ts-orb' }, '🔮'), h('h1', {}, '戰鬥法師'), h('p', {}, 'BATTLE MAGE')]),
          main,
          h('div', { class: 'ts-title' }, '選擇存檔'),
          h('div', { class: 'ts-list' }, rows),
          h('p', { class: 'ts-foot' }, `v${version}・Wei Studio`),
        ]),
      );
    };

    /** 刪除：按兩次確認 */
    const delBtn = (n: number) => {
      const b = h('button', { class: 'ts-del', 'aria-label': `刪除存檔 ${n}` }, '🗑');
      let armed = false;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!armed) {
          armed = true;
          b.textContent = '確定？';
          b.classList.add('armed');
          setTimeout(() => {
            armed = false;
            b.textContent = '🗑';
            b.classList.remove('armed');
          }, 3000);
          return;
        }
        slots.delete(n);
        draw();
      });
      return b;
    };

    draw();
    app.appendChild(el);
  });
}
