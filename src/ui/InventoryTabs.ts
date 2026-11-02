import type { GameState } from '@/core/GameState';
import type { EquipSlot, Stats } from '@/data/types';
import {
  ENHANCE_GEM_COST, ENHANCE_MAX, ENHANCE_RATES, ITEM_BASES, POTION_PRICE, RARITY, SLOT_NAMES, SLOT_ORDER,
  STAT_LABELS, enhanceCost, formatStat, sellPrice, shopPrice,
} from '@/data/items';
import {
  INVENTORY_SIZE, addItem, computeStats, enhance, equip, findItem, itemName, itemScore, itemStats, sell, sellJunk, unequip,
  type ItemInstance,
} from '@/systems/Inventory';
import { h } from './dom';
import { bus } from '@/core/EventBus';

/**
 * 選單的「裝備 / 強化 / 商城」三個分頁。
 * 只操作 GameState（透過 systems/Inventory 的純函式），變動後呼叫 ctx.changed() 讓 Game 重算屬性並存檔。
 */
export interface InvContext {
  state: GameState;
  /** 背包或金錢變動：重算屬性、刷新 HUD、存檔 */
  changed(): void;
  toast(text: string): void;
  rerender(): void;
  goTab(tab: 'equip' | 'enhance' | 'shop'): void;
  /** 強化成功特效 */
  celebrate(): void;
}

/** 跨分頁記住選取的物品 */
let selectedUid: number | null = null;

const STAT_KEYS: (keyof Stats)[] = ['atk', 'def', 'maxHp', 'maxMp', 'pen', 'critRate', 'critDmg', 'moveSpeed'];

/* ======================= 裝備 ======================= */

export function renderEquip(ctx: InvContext): HTMLElement[] {
  const s = ctx.state;
  const st = computeStats(s);
  const statsGrid = h('div', { class: 'stat-grid' }, STAT_KEYS.map((k) => h('div', { class: 'stat' }, [h('span', {}, STAT_LABELS[k]), h('b', {}, formatStat(k, st[k]))])));

  const slots = h('div', { class: 'slot-grid' });
  for (const slot of SLOT_ORDER) {
    const it = s.equipment[slot];
    slots.appendChild(
      h('button', { class: `slot${it ? '' : ' empty'}${it && it.uid === selectedUid ? ' sel' : ''}`, style: it ? `--rc:${RARITY[it.rarity].color}` : '', onclick: () => { if (it) { selectedUid = it.uid; ctx.rerender(); } } }, [
        h('span', { class: 'slot-ico' }, it ? ITEM_BASES[it.base].icon : '＋'),
        h('small', {}, it ? shortName(it) : SLOT_NAMES[slot]),
      ]),
    );
  }

  const items = [...s.inventory].sort((a, b) => SLOT_ORDER.indexOf(ITEM_BASES[a.base].slot) - SLOT_ORDER.indexOf(ITEM_BASES[b.base].slot) || itemScore(b) - itemScore(a));
  const grid = h('div', { class: 'inv-grid' });
  for (const it of items) {
    const better = isUpgrade(s, it);
    grid.appendChild(
      h('button', { class: `inv-item${it.uid === selectedUid ? ' sel' : ''}`, style: `--rc:${RARITY[it.rarity].color}`, onclick: () => { selectedUid = it.uid; ctx.rerender(); } }, [
        h('span', {}, ITEM_BASES[it.base].icon),
        it.plus > 0 ? h('i', { class: 'plus' }, `+${it.plus}`) : null,
        better ? h('i', { class: 'up' }, '▲') : null,
      ]),
    );
  }
  if (!items.length) grid.appendChild(h('p', { class: 'empty-note' }, '背包是空的。打倒怪物有機會掉落裝備。'));

  const out: HTMLElement[] = [
    h('div', { class: 'card' }, [h('h4', {}, `${s.playerName}・Lv.${s.level}`), statsGrid]),
    slots,
  ];
  const sel = selectedUid !== null ? findItem(s, selectedUid) : undefined;
  if (sel) out.push(detailCard(ctx, sel));
  out.push(
    h('div', { class: 'inv-head' }, [
      h('span', { class: 'section-title' }, `背包 ${s.inventory.length}/${INVENTORY_SIZE}`),
      h('button', {
        class: 'go ghost small',
        onclick: () => {
          const r = sellJunk(s, 'fine');
          ctx.toast(r.count ? `賣出 ${r.count} 件，獲得 ${r.gold} 金幣` : '沒有可以賣的裝備（只賣精良以下、比身上差的）');
          if (r.count) ctx.changed();
          ctx.rerender();
        },
      }, '一鍵賣出較差裝備'),
    ]),
    grid,
  );
  return out;
}

function detailCard(ctx: InvContext, it: ItemInstance): HTMLElement {
  const s = ctx.state;
  const base = ITEM_BASES[it.base];
  const equipped = s.equipment[base.slot]?.uid === it.uid;
  const cur = s.equipment[base.slot];
  const mine = itemStats(it);
  const theirs = cur && !equipped ? itemStats(cur) : {};
  const lines = (Object.keys(mine) as (keyof Stats)[]).map((k) => {
    const v = mine[k] ?? 0;
    const diff = cur && !equipped ? v - (theirs[k] ?? 0) : 0;
    return h('div', { class: 'line' }, [
      h('span', {}, STAT_LABELS[k]),
      h('b', {}, `+${formatStat(k, v)}`),
      diff ? h('em', { class: diff > 0 ? 'pos' : 'neg' }, `${diff > 0 ? '▲' : '▼'} ${formatStat(k, Math.abs(diff))}`) : null,
    ]);
  });
  const price = sellPrice(base.tier, it.rarity, it.plus);
  const buttons = equipped
    ? [
        h('button', { class: 'go ghost', onclick: () => { if (unequip(s, base.slot)) { ctx.changed(); ctx.rerender(); } else ctx.toast('背包已滿'); } }, '卸下'),
        h('button', { class: 'go', onclick: () => ctx.goTab('enhance') }, '強化'),
      ]
    : [
        h('button', { class: 'go', onclick: () => { equip(s, it.uid); ctx.changed(); ctx.rerender(); } }, '裝備'),
        h('button', { class: 'go ghost', onclick: () => ctx.goTab('enhance') }, '強化'),
        h('button', { class: 'go danger', onclick: () => { const g = sell(s, it.uid); selectedUid = null; ctx.toast(`賣出，獲得 ${g} 金幣`); ctx.changed(); ctx.rerender(); } }, `賣出 ${price}`),
      ];
  return h('div', { class: 'card item-detail', style: `--rc:${RARITY[it.rarity].color}` }, [
    h('div', { class: 'detail-head' }, [h('span', { class: 'big-ico' }, base.icon), h('div', {}, [h('h4', {}, itemName(it)), h('p', {}, `${SLOT_NAMES[base.slot]}・第 ${base.tier} 階${equipped ? '・裝備中' : ''}`)])]),
    h('div', { class: 'lines' }, lines),
    cur && !equipped ? h('p', { class: 'cmp-note' }, `與目前的「${itemName(cur)}」比較`) : null,
    h('div', { class: 'card-row' }, buttons),
  ]);
}

/* ======================= 強化 ======================= */

export function renderEnhance(ctx: InvContext): HTMLElement[] {
  const s = ctx.state;
  const list: ItemInstance[] = [];
  for (const slot of SLOT_ORDER) {
    const it = s.equipment[slot];
    if (it) list.push(it);
  }
  const sel = selectedUid !== null ? findItem(s, selectedUid) : undefined;
  if (sel && !list.includes(sel)) list.unshift(sel);

  const out: HTMLElement[] = [
    h('div', { class: 'card' }, [
      h('p', {}, `每強化 +1，裝備全屬性 +8%。失敗只會扣金幣，不會降級。使用 ${ENHANCE_GEM_COST} 鑽石可保證成功。`),
      h('div', { class: 'wallet-line' }, [h('span', { class: 'coin' }), h('b', {}, String(s.gold)), h('span', { class: 'gem' }), h('b', {}, String(s.gems))]),
    ]),
  ];
  if (!list.length) out.push(h('p', { class: 'empty-note' }, '身上沒有裝備可以強化。'));
  for (const it of list) {
    const base = ITEM_BASES[it.base];
    const maxed = it.plus >= ENHANCE_MAX;
    const cost = enhanceCost(base.tier, it.plus);
    const rate = ENHANCE_RATES[it.plus] ?? 0;
    const next: ItemInstance = { ...it, plus: Math.min(ENHANCE_MAX, it.plus + 1) };
    const now = itemStats(it);
    const after = itemStats(next);
    const preview = (Object.keys(now) as (keyof Stats)[]).map((k) => `${STAT_LABELS[k]} ${formatStat(k, now[k] ?? 0)} → ${formatStat(k, after[k] ?? 0)}`).join('　');
    const doIt = (gems: boolean) => {
      const r = enhance(s, it.uid, gems);
      const msg = { success: `強化成功！${itemName(it)}`, fail: '強化失敗…（裝備沒有降級）', max: '已達最高強化', 'no-gold': '金幣不足', 'no-gems': '鑽石不足', missing: '找不到裝備' }[r];
      ctx.toast(msg);
      if (r === 'success') ctx.celebrate();
      if (r === 'success' || r === 'fail') bus.emit('enhance:done', { success: r === 'success' });
      if (r === 'success' || r === 'fail') ctx.changed();
      ctx.rerender();
    };
    out.push(
      h('div', { class: 'card enh', style: `--rc:${RARITY[it.rarity].color}` }, [
        h('div', { class: 'detail-head' }, [h('span', { class: 'big-ico' }, base.icon), h('div', {}, [h('h4', {}, itemName(it)), h('p', {}, maxed ? '已達 +10' : preview)])]),
        maxed
          ? h('span', { class: 'pill' }, 'MAX')
          : h('div', { class: 'card-row' }, [
              h('button', { class: 'go', onclick: () => doIt(false) }, `強化 ${Math.round(rate * 100)}%・${cost} 金幣`),
              rate < 1 ? h('button', { class: 'go ghost', onclick: () => doIt(true) }, `保證成功・${ENHANCE_GEM_COST}💎`) : null,
            ]),
      ]),
    );
  }
  return out;
}

/* ======================= 商城 ======================= */

export function renderShop(ctx: InvContext): HTMLElement[] {
  const s = ctx.state;
  const maxTier = 1 + Math.min(2, s.bossesDefeated.length);
  const buy = (price: number, give: () => boolean, label: string) => {
    if (s.gold < price) return ctx.toast('金幣不足');
    if (!give()) return ctx.toast('背包已滿');
    s.gold -= price;
    ctx.toast(`購買 ${label}`);
    ctx.changed();
    ctx.rerender();
  };
  const potionRow = (kind: 'hp' | 'mp') =>
    h('div', { class: 'shop-row' }, [
      h('span', { class: 'shop-ico' }, '🧪'),
      h('div', { class: 'shop-main' }, [h('b', {}, kind === 'hp' ? '紅藥水' : '藍藥水'), h('small', {}, `回復 35% ${kind === 'hp' ? 'HP' : 'MP'}・持有 ${s.potions[kind]}`)]),
      h('button', { class: 'go small', onclick: () => buy(POTION_PRICE[kind], () => ((s.potions[kind] += 1), true), kind === 'hp' ? '紅藥水' : '藍藥水') }, `${POTION_PRICE[kind]}`),
      h('button', { class: 'go small', onclick: () => buy(POTION_PRICE[kind] * 9, () => ((s.potions[kind] += 10), true), `${kind === 'hp' ? '紅藥水' : '藍藥水'} ×10`) }, `×10 ${POTION_PRICE[kind] * 9}`),
    ]);

  const out: HTMLElement[] = [
    h('div', { class: 'card' }, [
      h('div', { class: 'wallet-line' }, [h('span', { class: 'coin' }), h('b', {}, String(s.gold)), h('span', { class: 'gem' }), h('b', {}, String(s.gems))]),
    ]),
    h('div', { class: 'section-title' }, '道具店'),
    h('div', { class: 'card' }, [potionRow('hp'), potionRow('mp')]),
    h('div', { class: 'section-title' }, `武器店・防具店（普通裝備，擊敗首領解鎖更高階；目前到第 ${maxTier} 階）`),
  ];
  const gear = h('div', { class: 'card' });
  for (let tier = 1; tier <= maxTier; tier++) {
    for (const slot of SLOT_ORDER) {
      const base = ITEM_BASES[`${slot}_t${tier}`];
      const stats = Object.entries(base.stats).map(([k, v]) => `${STAT_LABELS[k as keyof Stats]} +${formatStat(k as keyof Stats, v as number)}`).join('　');
      gear.appendChild(
        h('div', { class: 'shop-row' }, [
          h('span', { class: 'shop-ico' }, base.icon),
          h('div', { class: 'shop-main' }, [h('b', {}, `${base.name}（第 ${tier} 階）`), h('small', {}, stats)]),
          h('button', { class: 'go small', onclick: () => buy(shopPrice(tier), () => !!addItem(s, base.id, 'common'), base.name) }, String(shopPrice(tier))),
        ]),
      );
    }
  }
  out.push(gear);
  out.push(
    h('div', { class: 'section-title' }, '鑽石兌換'),
    h('div', { class: 'card' }, [
      h('div', { class: 'shop-row' }, [
        h('span', { class: 'shop-ico' }, '💎'),
        h('div', { class: 'shop-main' }, [h('b', {}, '10 鑽石 → 1000 金幣'), h('small', {}, '鑽石主要來源：擊敗首領')]),
        h('button', {
          class: 'go small',
          onclick: () => {
            if (s.gems < 10) return ctx.toast('鑽石不足');
            s.gems -= 10;
            s.gold += 1000;
            ctx.toast('兌換 1000 金幣');
            ctx.changed();
            ctx.rerender();
          },
        }, '兌換'),
      ]),
    ]),
  );
  return out;
}

/* ---------------- 工具 ---------------- */

function shortName(it: ItemInstance): string {
  return `${ITEM_BASES[it.base].name}${it.plus ? ` +${it.plus}` : ''}`;
}

function isUpgrade(s: GameState, it: ItemInstance): boolean {
  const slot: EquipSlot = ITEM_BASES[it.base].slot;
  const cur = s.equipment[slot];
  return !cur || itemScore(it) > itemScore(cur);
}
