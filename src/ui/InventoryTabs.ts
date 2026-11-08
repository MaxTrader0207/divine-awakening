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
import { DIVINITY, DIV_MAX_POINTS, DIV_STATS, allocPoint, divBonusText, divExpToNext, divinityOpen, freePoints, resetAlloc, spentPoints } from '@/systems/Divinity';
import { PROFILE_LABEL } from '@/data/gear';
import { equippedSets, setOf, setTiers } from '@/data/gearSets';
import { GEM_SHOP, buyGemItem } from '@/systems/GemShop';
import { CONSUMABLES, MAX_STACK, consumablesFor, type ConsumableDef } from '@/data/consumables';
import { setQuickSlot } from '@/systems/Consumables';
import { CLASSES, type HeroClass } from '@/data/classes';
import { REBIRTH, equipBlock, rebirthBlocked, rebirthExpMul, rebirthStatMul } from '@/systems/Rebirth';
import { addConsumable } from '@/systems/Consumables';
import { bus } from '@/core/EventBus';
import { isZoneUnlocked } from '@/core/GameState';
import { CAPTURE, COMPANION_LIST, pityLeft } from '@/data/companions';
import { BOND_PERKS, COMPANION_SKILLS, FEED, GROWTH, DUO, addBond, addCompExp, bondLevel, bondNext, compCooldown, compDuration, compExpToNext, compStatMul, duoUnlocked, feedCost, growthOf, skillUnlocked } from '@/data/companionGrowth';
import { ELEMENTS, ELEMENT_STRONG_MUL, ELEMENT_WEAK_MUL, STRONG, counterOf, type Element } from '@/data/elements';
import { ZONES, zoneLabel } from '@/data/zones';

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
  /** 使用道具 */
  useConsumable(id: string): void;
  /** v1.83 轉生 */
  rebirth(cls: HeroClass): void;
}

/** 道具區：職業專屬 / 通用兩組，每列：圖示、名稱、數量（上限 99）、效果、使用 */
function consumableCards(ctx: InvContext): HTMLElement[] {
  const s = ctx.state;
  const all = consumablesFor(s.heroClass);
  const row = (c: ConsumableDef) =>
    h('div', { class: 'shop-row' }, [
      h('span', { class: 'shop-ico' }, c.icon),
      h('div', { class: 'shop-main' }, [h('b', {}, `${c.name} ×${s.consumables[c.id]}`), h('small', {}, c.desc)]),
      // 快捷欄③④：按了放進去（已在另一格就交換、同一格再按就取下）
      h('div', { class: 'quick-pick' }, [0, 1].map((i) =>
        h('button', {
          class: `qp${s.quickSlots[i] === c.id ? ' on' : ''}`,
          title: s.quickSlots[i] === c.id ? `從快捷欄 ${i + 3} 取下` : `放到快捷欄 ${i + 3}`,
          onclick: () => { s.quickSlots = setQuickSlot(s.quickSlots, i, c.id); bus.emit('player:changed'); bus.emit('save:request'); ctx.rerender(); },
        }, ['③', '④'][i]),
      )),
      h('button', { class: 'go small', onclick: () => ctx.useConsumable(c.id) }, '使用'),
    ]);
  const mine = all.filter((c) => c.cls && (s.consumables[c.id] ?? 0) > 0);
  const shared = all.filter((c) => !c.cls && (s.consumables[c.id] ?? 0) > 0);
  const out: HTMLElement[] = [];
  if (!mine.length && !shared.length) out.push(h('div', { class: 'card' }, [h('p', {}, '還沒有道具。可以在商城購買，打倒怪物也有機會掉落（首領必掉）。每種最多 99 個。')]));
  if (mine.length) out.push(h('div', { class: 'card' }, [h('h4', {}, `${CLASSES[s.heroClass].icon} ${CLASSES[s.heroClass].name}專屬`), ...mine.map(row)]));
  if (shared.length) out.push(h('div', { class: 'card' }, [h('h4', {}, '通用道具'), ...shared.map(row)]));
  out.push(h('p', { class: 'empty-note' }, `按「③」「④」把道具放進左下快捷欄（電腦按 3、4 使用）。每種道具最多 ${MAX_STACK} 個，不佔裝備背包的格子。`));
  return out;
}

/** 從快捷欄跳過來時直接顯示「道具」 */
export function openItemsView() {
  invView = 'items';
}

/** 從夥伴按鈕跳過來時直接顯示「夥伴」 */
export function openCompanionView() {
  invView = 'companions';
}

/* ======================= 守護者夥伴（v1.58） ======================= */

const elName = (k: Element) => `${ELEMENTS[k].icon}${ELEMENTS[k].name}`;

function companionCards(ctx: InvContext): HTMLElement[] {
  const s = ctx.state;
  const c = s.companions;
  const out: HTMLElement[] = [];
  const duo = duoUnlocked(c);
  out.push(
    h('div', { class: `card duo-card${duo ? ' on' : ''}` }, [
      h('h4', {}, duo ? '👥 雙夥伴已開放' : '👥 雙夥伴'),
      h('p', {}, duo
        ? `除了主力，還可以多帶一隻「支援」：按一次夥伴鍵兩隻一起出場，冷卻跟著主力。支援夥伴屬性 ×${DUO.supportMul}，兩隻都會拿經驗與好感，專屬技能各自施放。挑兩種屬性一起帶，打首領更容易剋到。`
        : `收服 ${DUO.unlockOwned} 隻夥伴後，可以同時帶 2 隻（主力＋支援）一起出場。目前 ${c.owned.length} / ${DUO.unlockOwned}。`),
    ]),
  );
  for (const def of COMPANION_LIST) {
    const owned = c.owned.includes(def.id);
    const el = ELEMENTS[def.element];
    const zone = ZONES[def.zone];
    const open = isZoneUnlocked(s, def.zone);
    const active = c.active === def.id;
    const support = duo && c.support === def.id;
    const set = (main: string | null, sup: string | null, msg?: string) => {
      c.active = main;
      c.support = sup && sup !== main ? sup : null;
      if (msg) ctx.toast(msg);
      ctx.changed();
      ctx.rerender();
    };
    let action: HTMLElement;
    if (owned) {
      const btns: HTMLElement[] = [];
      if (active) btns.push(h('button', { class: 'go ghost small', onclick: () => set(c.support, null) }, c.support && duo ? '收回（支援改當主力）' : '收回（不帶）'));
      else if (support) {
        btns.push(h('button', { class: 'go small', onclick: () => set(def.id, c.active, `${def.icon} ${def.name} 改當主力`) }, '換成主力'));
        btns.push(h('button', { class: 'go ghost small', onclick: () => set(c.active, null) }, '收回支援'));
      } else {
        btns.push(h('button', { class: 'go small', onclick: () => set(def.id, c.support === def.id ? null : c.support, `${def.icon} 帶上 ${def.name}`) }, duo ? '當主力' : '帶上牠'));
        if (duo) btns.push(h('button', { class: 'go small alt', onclick: () => (c.active ? set(c.active, def.id, `${def.icon} ${def.name} 擔任支援`) : set(def.id, null, `${def.icon} 帶上 ${def.name}`)) }, '當支援'));
      }
      action = h('span', { class: 'comp-actions' }, btns);
    }
    else action = h('span', { class: 'pill locked' }, open ? `再打倒 ${pityLeft(c, def.id)} 次內必定收服` : `🔒 擊敗${zoneLabel(zone.side!.unlockAfter)}後開放`);
    const weakTo = ELEMENTS[counterOf(def.element)];
    const strongTo = ELEMENTS[STRONG[def.element]];
    out.push(
      h('div', { class: `card comp-card${owned ? '' : ' locked'}${active || support ? ' active' : ''}`, style: `--el:${el.color}` }, [
        h('div', { class: 'comp-ico' }, owned ? def.icon : '？'),
        h('h4', {}, [owned || open ? def.name : '？？？', h('small', {}, `${el.icon}${el.name}屬性${active ? (duo ? '・主力' : '・帶著') : support ? '・支援' : ''}`)]),
        h('p', {}, owned ? `${def.title}。${def.role}` : `住在支線「${zone.name}」。打倒守護者有 ${Math.round(CAPTURE.chance * 100)}% 機率收服，第 ${CAPTURE.pity} 次一定成功。`),
        owned ? growthBlock(ctx, def.id) : h('p', {}, STRONG[STRONG[def.element]] === def.element ? `與 ${strongTo.icon}${strongTo.name} 互剋（打牠 ×${ELEMENT_STRONG_MUL}、被牠打也 ×${ELEMENT_STRONG_MUL}）` : `剋 ${strongTo.icon}${strongTo.name}、被 ${weakTo.icon}${weakTo.name} 剋`),
        h('div', { class: 'card-row' }, [action, ...(owned ? [feedButton(ctx, def.id)] : [])]),
      ]),
    );
  }
  out.push(
    h('div', { class: 'card' }, [
      h('h4', {}, '屬性相剋'),
      h('p', {}, `夥伴打首領、首領打夥伴都算：剋制 ×${ELEMENT_STRONG_MUL}、被剋 ×${ELEMENT_WEAK_MUL}。首領的屬性顯示在血條等級旁。`),
      h('div', { class: 'el-chart' }, [
        h('span', {}, [(['fire', 'ice', 'wind', 'earth', 'thunder', 'water', 'fire'] as Element[]).map(elName).join(' → '), '（箭頭方向＝剋）']),
        h('span', {}, `${elName('light')} ⇄ ${elName('dark')}、${elName('metal')} ⇄ ${elName('poison')}（互剋）`),
      ]),
    ]),
    h('div', { class: 'card' }, [
      h('h4', {}, '夥伴養成'),
      h('p', {}, `等級：帶著的夥伴從你打倒的每隻敵人拿經驗（在場上 ×${GROWTH.liveMul}、首領 ${GROWTH.bossExp}），也可以花金幣餵食（+${FEED.exp} 經驗、+${FEED.bond} 好感）；再次打倒已收服的守護者，那隻夥伴 +${GROWTH.repeatExp} 經驗。每級生命、攻擊、防禦 +${GROWTH.perLv * 100}%，最高 Lv.${GROWTH.maxLv}。`),
      h('p', {}, `好感度：召喚 +${GROWTH.bondSummon}、在場時打倒首領 +${GROWTH.bondBoss}。${BOND_PERKS.map((t, i) => `${'♥'.repeat(i + 1)} ${t}`).join('；')}。`),
    ]),
    h('p', { class: 'empty-note' }, `戰鬥中按「夥伴」（電腦 G）召喚帶著的夥伴：基本存在 ${CAPTURE.duration} 秒、冷卻 ${CAPTURE.cooldown} 秒（好感度會縮短）；AUTO 會在首領戰自動召喚。數值跟著你的等級、裝備與夥伴等級成長。`),
  );
  return out;
}

/** 夥伴卡片：等級、好感度、專屬技能 */
function growthBlock(ctx: InvContext, id: string): HTMLElement {
  const g = growthOf(ctx.state.companions, id);
  const b = bondLevel(g.bond);
  const nextBond = bondNext(g.bond);
  const max = g.lv >= GROWTH.maxLv;
  const sk = COMPANION_SKILLS[id];
  const unlocked = skillUnlocked(g);
  return h('div', { class: 'comp-grow' }, [
    h('div', { class: 'comp-line' }, [
      h('b', {}, `Lv.${g.lv}`),
      h('div', { class: 'quest-bar' }, [h('i', { style: `width:${max ? 100 : (g.exp / compExpToNext(g.lv)) * 100}%` })]),
      h('small', {}, max ? '已滿級' : `${g.exp} / ${compExpToNext(g.lv)}`),
    ]),
    h('div', { class: 'comp-line' }, [
      h('b', { class: 'hearts' }, '♥'.repeat(b) + '♡'.repeat(5 - b)),
      h('small', {}, nextBond ? `好感 ${g.bond} / ${nextBond}・下一階：${BOND_PERKS[b]}` : `好感 ${g.bond}・羈絆已滿`),
    ]),
    h('p', {}, `屬性 ×${compStatMul(g).toFixed(2)}・存在 ${compDuration(g)} 秒・冷卻 ${compCooldown(g)} 秒`),
    h('p', { class: `comp-skill${unlocked ? ' on' : ''}` }, [h('b', {}, `${unlocked ? '✦' : '🔒'} ${sk.name}`), `　${sk.desc}${unlocked ? '' : '（好感 ♥♥♥ 解鎖）'}`]),
  ]);
}

/** 餵食神饌點心：花金幣換經驗與好感 */
function feedButton(ctx: InvContext, id: string): HTMLElement {
  const s = ctx.state;
  const g = growthOf(s.companions, id);
  const cost = feedCost(g);
  const maxed = g.lv >= GROWTH.maxLv && bondLevel(g.bond) >= 5;
  return h('button', {
    class: 'go ghost small',
    disabled: s.gold < cost || maxed,
    onclick: () => {
      if (s.gold < cost) return ctx.toast('金幣不夠');
      s.gold -= cost;
      const ups = addCompExp(g, FEED.exp);
      const bondUp = addBond(g, FEED.bond);
      ctx.toast(`🍯 餵食神饌點心：經驗 +${FEED.exp}、好感 +${FEED.bond}${ups ? `，升到 Lv.${g.lv}！` : ''}${bondUp ? `，好感度 ${'♥'.repeat(bondLevel(g.bond))}` : ''}`);
      ctx.changed();
      ctx.rerender();
    },
  }, maxed ? '已滿' : `🍯 餵食 ${cost.toLocaleString()} 金`);
}

/** 跨分頁記住選取的物品 */
let selectedUid: number | null = null;
/** 裝備頁下半部：裝備背包 / 道具 */
let invView: 'gear' | 'items' | 'companions' = 'gear';
/** 背包篩選 */
let invFilter: 'all' | 'named' | EquipSlot = 'all';

const STAT_KEYS: (keyof Stats)[] = ['atk', 'def', 'maxHp', 'maxMp', 'pen', 'critRate', 'critDmg', 'moveSpeed'];

/* ======================= 裝備 ======================= */

/** 轉生卡（v1.83）：目前加成、選職業、按兩次確認 */
let rebirthPick: HeroClass | null = null;
let rebirthArmed = false;
function rebirthCard(ctx: InvContext): HTMLElement {
  const s = ctx.state;
  const n = s.rebirth?.count ?? 0;
  const why = rebirthBlocked(s);
  const pct = (v: number) => `${Math.round((v - 1) * 100)}%`;
  const parts: (HTMLElement | null)[] = [
    h('h4', {}, ['♻ 轉生', h('small', {}, n ? `已轉生 ${n} 次・攻擊 / 生命 / 防禦 +${pct(rebirthStatMul(n))}・打怪經驗 +${pct(rebirthExpMul(n))}` : '還沒轉生過')]),
  ];
  if (why) {
    parts.push(h('p', { class: 'div-locked' }, n >= REBIRTH.maxCount ? why : `下一次轉生：${why}。`));
    return h('div', { class: 'card rebirth-card' }, parts.filter((x): x is HTMLElement => !!x));
  }
  const next = n + 1;
  parts.push(
    h('p', { class: 'div-locked' }, `回到 Lv.1 重新冒險，可以換職業。轉生後永久：攻擊 / 生命 / 防禦 +${pct(rebirthStatMul(next))}、打怪經驗 +${pct(rebirthExpMul(next))}，並獲得 ${REBIRTH.gems}💎。`),
    h('p', { class: 'div-locked' }, '保留：裝備（全部收進背包，高階裝備要練回等級才能穿）、金幣、鑽石、道具、夥伴、圖鑑、成就、神格。重來：等級、打倒的首領與破關紀錄、神話難度紀錄。'),
    h('div', { class: 'rebirth-classes' }, (Object.keys(CLASSES) as HeroClass[]).map((c) =>
      h('button', { class: `rb-cls${rebirthPick === c ? ' on' : ''}${c === s.heroClass ? ' cur' : ''}`, onclick: () => { rebirthPick = c; rebirthArmed = false; ctx.rerender(); } }, [h('span', {}, CLASSES[c].icon), h('small', {}, CLASSES[c].name)]),
    )),
    h('button', {
      class: `go ${rebirthArmed ? 'danger' : ''} rb-go`,
      disabled: !rebirthPick,
      onclick: () => {
        if (!rebirthPick) return;
        if (!rebirthArmed) {
          rebirthArmed = true;
          ctx.rerender();
          return;
        }
        const c = rebirthPick;
        rebirthPick = null;
        rebirthArmed = false;
        ctx.rebirth(c);
      },
    }, !rebirthPick ? '先選轉生後的職業' : rebirthArmed ? `再按一次確定：轉生成 Lv.1 ${CLASSES[rebirthPick].name}` : `轉生成${CLASSES[rebirthPick].name}（第 ${next} 轉）`),
  );
  return h('div', { class: 'card rebirth-card' }, parts.filter((x): x is HTMLElement => !!x));
}

/** 神格等級卡（v1.76）：進度、5 種屬性投點、重新分配 */
function divinityCard(ctx: InvContext): HTMLElement {
  const s = ctx.state;
  const d = s.divinity;
  const free = freePoints(d);
  const r = Math.min(1, d.exp / divExpToNext(d.lv));
  const rows = DIV_STATS.map((def) =>
    h('div', { class: 'div-row' }, [
      h('span', { class: 'ico' }, def.icon),
      h('div', {}, [h('b', {}, def.name), h('small', {}, `每點 ${divBonusText(def.id, 1)}・${d.alloc[def.id]}/${def.cap}`)]),
      h('span', { class: 'val' }, divBonusText(def.id, d.alloc[def.id])),
      h('button', {
        disabled: free <= 0 || d.alloc[def.id] >= def.cap,
        onclick: () => {
          const why = allocPoint(d, def.id);
          if (why) ctx.toast(why);
          ctx.changed();
          ctx.rerender();
        },
      }, '＋'),
    ]),
  );
  return h('div', { class: 'card div-card' }, [
    h('h4', {}, ['✨ 神格等級 Lv.' + d.lv, h('small', {}, free ? `可用點數 ${free}` : '點數已分配完')]),
    h('div', { class: 'div-bar' }, [h('i', { style: `width:${r * 100}%` })]),
    h('small', { class: 'div-locked' }, `滿級後打怪的經驗會累積神格：下一級還要 ${Math.max(0, divExpToNext(d.lv) - Math.floor(d.exp)).toLocaleString()} 經驗；每升一級 +1 點、+${DIVINITY.gems} 💎`),
    ...rows,
    h('div', { class: 'div-foot' }, [
      h('span', {}, `已分配 ${spentPoints(d)}・全部投滿要 ${DIV_MAX_POINTS} 點`),
      h('button', {
        disabled: spentPoints(d) === 0,
        onclick: () => {
          if (s.gems < DIVINITY.resetCost) return ctx.toast(`鑽石不夠（需要 ${DIVINITY.resetCost}💎）`);
          s.gems -= DIVINITY.resetCost;
          resetAlloc(d);
          ctx.toast(`點數已全部退回（-${DIVINITY.resetCost}💎）`);
          ctx.changed();
          ctx.rerender();
        },
      }, `重新分配 ${DIVINITY.resetCost}💎`),
    ]),
  ]);
}

/**
 * 裝備頁。v1.80：用 .equip-split 包成兩欄（直式 display: contents 不影響排版；
 * 橫式左欄＝屬性、裝備格、物品詳情，右欄＝裝備 / 道具 / 夥伴切換與背包，左欄固定不跟著捲）
 */
export function renderEquip(ctx: InvContext): HTMLElement[] {
  const out = renderEquipInner(ctx);
  const i = out.findIndex((e) => e.classList.contains('inv-switch'));
  if (i < 0) return out;
  const colA = h('div', { class: 'col-a' }, out.slice(0, i));
  // 橫式：物品詳情排在左欄最上面（CSS order），重畫時左欄捲回頂端
  requestAnimationFrame(() => (colA.scrollTop = 0));
  return [h('div', { class: 'equip-split' }, [colA, h('div', { class: 'col-b' }, out.slice(i))])];
}

function renderEquipInner(ctx: InvContext): HTMLElement[] {
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
  // 背包篩選（100 格時方便找）
  const shown = items.filter((it) => {
    const b = ITEM_BASES[it.base];
    return invFilter === 'all' || (invFilter === 'named' ? !!b.named : b.slot === invFilter);
  });
  const grid = h('div', { class: 'inv-grid' });
  for (const it of shown) {
    const better = isUpgrade(s, it);
    grid.appendChild(
      h('button', { class: `inv-item${it.uid === selectedUid ? ' sel' : ''}`, style: `--rc:${RARITY[it.rarity].color}`, onclick: () => { selectedUid = it.uid; ctx.rerender(); } }, [
        h('span', {}, ITEM_BASES[it.base].icon),
        ITEM_BASES[it.base].named ? h('i', { class: 'star' }, '★') : null,
        it.plus > 0 ? h('i', { class: 'plus' }, `+${it.plus}`) : null,
        better ? h('i', { class: 'up' }, '▲') : null,
      ]),
    );
  }
  if (!items.length) grid.appendChild(h('p', { class: 'empty-note' }, '背包是空的。打倒怪物有機會掉落裝備。'));
  else if (!shown.length) grid.appendChild(h('p', { class: 'empty-note' }, '這個分類沒有裝備。'));

  const out: HTMLElement[] = [
    h('div', { class: 'card' }, [h('h4', {}, `${s.playerName}・Lv.${s.level}`), statsGrid]),
  ];
  // v1.76 神格等級：滿級後顯示（有點數沒分配時排在裝備格前面）
  if (divinityOpen(s.level)) out.push(divinityCard(ctx));
  // v1.83 轉生：可以轉生或轉生過才顯示
  if (!rebirthBlocked(s) || s.rebirth?.count) out.push(rebirthCard(ctx));
  out.push(slots);
  const sets = equippedSets(s.equipment);
  if (sets.length) out.push(h('div', { class: 'card set-card' }, [h('h4', {}, '🧩 套裝效果'), ...sets.map((a) => setBlock(a.set, a.count))]));
  const sel = selectedUid !== null ? findItem(s, selectedUid) : undefined;
  if (sel) out.push(detailCard(ctx, sel));
  // 下半部：裝備背包 / 道具 切換
  const nItems = Object.values(s.consumables).reduce((a, n) => a + n, 0);
  out.push(
    h('div', { class: 'seg seg3 inv-switch' }, [
      h('button', { class: `seg-btn${invView === 'gear' ? ' on' : ''}`, onclick: () => { invView = 'gear'; ctx.rerender(); } }, `🎒 裝備 ${s.inventory.length}/${INVENTORY_SIZE}`),
      h('button', { class: `seg-btn${invView === 'items' ? ' on' : ''}`, onclick: () => { invView = 'items'; ctx.rerender(); } }, `🧪 道具 ${nItems}`),
      h('button', { class: `seg-btn${invView === 'companions' ? ' on' : ''}`, onclick: () => { invView = 'companions'; ctx.rerender(); } }, `🪽 夥伴 ${s.companions.owned.length}`),
    ]),
  );
  if (invView === 'items') {
    out.push(...consumableCards(ctx));
    return out;
  }
  if (invView === 'companions') {
    out.push(...companionCards(ctx));
    return out;
  }
  const chips: [typeof invFilter, string][] = [['all', '全部'], ['named', '★神話'], ...SLOT_ORDER.map((sl) => [sl, SLOT_NAMES[sl]] as [typeof invFilter, string])];
  out.push(
    h(
      'div',
      { class: 'chips' },
      chips.map(([f, label]) => {
        const n = f === 'all' ? items.length : items.filter((it) => (f === 'named' ? ITEM_BASES[it.base].named : ITEM_BASES[it.base].slot === f)).length;
        return h('button', { class: `chip${invFilter === f ? ' on' : ''}`, onclick: () => { invFilter = f; ctx.rerender(); } }, `${label} ${n}`);
      }),
    ),
  );
  out.push(
    h('div', { class: 'inv-head' }, [
      h('span', { class: 'section-title' }, `背包 ${s.inventory.length}/${INVENTORY_SIZE} 格`),
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
  // 兩件裝備的屬性種類可能不同（神話裝有偏向），比較時取聯集
  const keys = [...new Set([...Object.keys(mine), ...Object.keys(theirs)])] as (keyof Stats)[];
  const lines = keys.map((k) => {
    const v = mine[k] ?? 0;
    const diff = cur && !equipped ? v - (theirs[k] ?? 0) : 0;
    return h('div', { class: 'line' }, [
      h('span', {}, STAT_LABELS[k]),
      h('b', {}, v ? `+${formatStat(k, v)}` : '—'),
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
        h('button', { class: 'go', disabled: !!equipBlock(s, it), onclick: () => { if (equip(s, it.uid)) bus.emit('item:equipped'); ctx.changed(); ctx.rerender(); } }, '裝備'),
        h('button', { class: 'go ghost', onclick: () => ctx.goTab('enhance') }, '強化'),
        h('button', { class: 'go danger', onclick: () => { const g = sell(s, it.uid); selectedUid = null; ctx.toast(`賣出，獲得 ${g} 金幣`); ctx.changed(); ctx.rerender(); } }, `賣出 ${price}`),
      ];
  return h('div', { class: 'card item-detail', style: `--rc:${RARITY[it.rarity].color}` }, [
    h('div', { class: 'detail-head' }, [h('span', { class: 'big-ico' }, base.icon), h('div', {}, [h('h4', {}, itemName(it)), h('p', {}, `${SLOT_NAMES[base.slot]}・第 ${base.tier} 階・${base.named ? `★神話裝（${PROFILE_LABEL[base.profile!]}）` : '標準裝'}${equipped ? '・裝備中' : ''}`)])]),
    h('div', { class: 'lines' }, lines),
    setOf(it.base) ? setBlock(setOf(it.base)!, equippedSets(s.equipment).find((a) => a.set.id === setOf(it.base)!.id)?.count ?? 0) : null,
    cur && !equipped ? h('p', { class: 'cmp-note' }, `與目前的「${itemName(cur)}」比較`) : null,
    !equipped && equipBlock(s, it) ? h('p', { class: 'cmp-note warn' }, `🔒 ${equipBlock(s, it)}`) : null,
    h('div', { class: 'card-row' }, buttons),
  ]);
}

/** 套裝：名稱、件數、2 / 4 / 6 件效果（達成的亮起來） */
function setBlock(set: NonNullable<ReturnType<typeof setOf>>, count: number): HTMLElement {
  return h('div', { class: 'set-block' }, [
    h('div', { class: 'set-head' }, [h('b', {}, `${set.name}`), h('small', {}, `第 ${set.tier} 階・穿著 ${count}/6`)]),
    ...setTiers(set).map((t) => h('div', { class: `set-tier${count >= t.need ? ' on' : ''}` }, [h('span', {}, `${t.need} 件`), h('span', {}, t.text)])),
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
    bus.emit('shop:bought');
    ctx.changed();
    ctx.rerender();
  };
  const shopItemRow = (c: ConsumableDef) =>
    h('div', { class: 'shop-row' }, [
      h('span', { class: 'shop-ico' }, c.icon),
      h('div', { class: 'shop-main' }, [h('b', {}, `${c.name}${s.consumables[c.id] ? `（持有 ${s.consumables[c.id]}/${MAX_STACK}）` : ''}`), h('small', {}, `${c.desc}・${c.lore}`)]),
      h('button', {
        class: 'go small',
        onclick: () => {
          if ((s.consumables[c.id] ?? 0) >= MAX_STACK) return ctx.toast(`${c.name}最多 ${MAX_STACK} 個`);
          buy(c.price, () => addConsumable(s, c.id), c.name);
        },
      }, String(c.price)),
    ]);
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
    h('div', { class: 'section-title' }, '💎 鑽石商店'),
    h('div', { class: 'card' }, GEM_SHOP.map((g) => {
      const why = s.gems < g.price ? null : g.blocked(s);
      return h('div', { class: 'shop-row' }, [
        h('span', { class: 'shop-ico' }, g.icon),
        h('div', { class: 'shop-main' }, [h('b', {}, g.name), h('small', {}, why ? `${g.desc(s)}（${why}）` : g.desc(s))]),
        h('button', {
          class: 'go small gem-btn',
          disabled: s.gems < g.price || !!why,
          onclick: () => {
            const r = buyGemItem(s, g.id);
            if (!r.ok) return ctx.toast(r.why);
            ctx.toast(`${g.icon} ${g.name}：獲得 ${r.got.join('、')}`);
            bus.emit('shop:bought');
            ctx.changed();
            ctx.rerender();
          },
        }, `${g.price}💎`),
      ]);
    })),
    h('div', { class: 'section-title' }, '道具店'),
    h('div', { class: 'card' }, [potionRow('hp'), potionRow('mp')]),
    h('div', { class: 'section-title' }, `${CLASSES[s.heroClass].icon} ${CLASSES[s.heroClass].name}專屬道具`),
    h('div', { class: 'card' }, consumablesFor(s.heroClass).filter((c) => c.cls).map(shopItemRow)),
    h('div', { class: 'section-title' }, '通用道具'),
    h('div', { class: 'card' }, CONSUMABLES.map(shopItemRow)),
    h('div', { class: 'section-title' }, `武器店・防具店（標準裝，擊敗首領解鎖更高階；目前到第 ${maxTier} 階。★神話裝只會從怪物身上掉落）`),
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
  if (equipBlock(s, it)) return false; // 轉生後還不能穿的不標 ▲
  const slot: EquipSlot = ITEM_BASES[it.base].slot;
  const cur = s.equipment[slot];
  return !cur || itemScore(it) > itemScore(cur);
}
