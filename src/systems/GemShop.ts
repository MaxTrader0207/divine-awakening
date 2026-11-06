import type { GameState } from '@/core/GameState';
import type { EquipSlot, Rarity } from '@/data/types';
import { SLOT_ORDER, namedGearIds, tierForLevel } from '@/data/items';
import { CONSUMABLE_MAP, rollConsumable } from '@/data/consumables';
import { COMPANIONS } from '@/data/companions';
import { addBond, addCompExp, growthOf, GROWTH } from '@/data/companionGrowth';
import { equippedSets, type GearSetDef } from '@/data/gearSets';
import { INVENTORY_SIZE, addItem, itemName } from './Inventory';
import { addConsumable } from './Consumables';

/**
 * 鑽石商店（v1.68，純邏輯，可單元測試；畫面在「商城」最上面）
 * ------------------------------------------------------------
 * 鑽石來源：首領、成就、每日任務寶箱、簽到。這裡把鑽石換成刷裝備很難拿到的東西：
 * 指定階級的★神話裝、補齊套裝的缺件、史詩裝、夥伴培養、金幣與道具。
 * 新增商品：在 GEM_SHOP 加一筆（blocked 回傳不能買的原因，buy 回傳獲得的東西）。
 */
export interface GemShopItem {
  id: string;
  icon: string;
  name: string;
  price: number;
  desc: (s: GameState) => string;
  /** 不能買的原因（null = 可以買） */
  blocked: (s: GameState) => string | null;
  /** 發放獎勵（鑽石由 buyGemItem 扣），回傳獲得的東西 */
  buy: (s: GameState, rng: () => number) => string[];
}

const pick = <T,>(xs: T[], rng: () => number) => xs[Math.floor(rng() * xs.length)];
/** 神話裝的稀有度：稀有 70%、史詩 30% */
const mythRarity = (rng: () => number): Rarity => (rng() < 0.3 ? 'epic' : 'rare');
const bagFull = (s: GameState) => (s.inventory.length >= INVENTORY_SIZE ? '背包已滿' : null);

/** 目前等級的★神話裝（這一階這個欄位沒有就往下找） */
export function rollMythic(s: GameState, rng: () => number, slot: EquipSlot = pick(SLOT_ORDER, rng)): string | null {
  for (let t = tierForLevel(s.level); t >= 1; t--) {
    const ids = namedGearIds(s.heroClass, slot, t);
    if (ids.length) return pick(ids, rng);
  }
  return null;
}

/** 套裝補完的目標：身上件數最多、還沒湊滿的套裝（同件數挑階級高的） */
export function setToComplete(s: GameState): { set: GearSetDef; missing: EquipSlot[] } | null {
  for (const a of equippedSets(s.equipment)) {
    if (a.set.cls !== s.heroClass) continue;
    const missing = SLOT_ORDER.filter((sl) => !a.slots.includes(sl));
    if (missing.length) return { set: a.set, missing };
  }
  return null;
}

export const GEM_SHOP: GemShopItem[] = [
  {
    id: 'mythic',
    icon: '★',
    name: '神話裝寶箱',
    price: 60,
    desc: (s) => `隨機一件第 ${tierForLevel(s.level)} 階★神話裝（依你的等級；稀有 70%、史詩 30%）`,
    blocked: bagFull,
    buy: (s, rng) => {
      const id = rollMythic(s, rng);
      const it = id ? addItem(s, id, mythRarity(rng)) : null;
      return it ? [itemName(it)] : [];
    },
  },
  {
    id: 'setPiece',
    icon: '🧩',
    name: '套裝補完',
    price: 90,
    desc: (s) => {
      const t = setToComplete(s);
      return t ? `補一件「${t.set.name}」缺少的部位（目前 ${6 - t.missing.length}/6，稀有以上）` : '先穿上至少一件★神話裝，這裡會補你身上那套缺的部位';
    },
    blocked: (s) => bagFull(s) ?? (setToComplete(s) ? null : '身上沒有可以補的套裝'),
    buy: (s, rng) => {
      const t = setToComplete(s);
      if (!t) return [];
      const slot = pick(t.missing, rng);
      const it = addItem(s, t.set.pieces[slot], mythRarity(rng));
      return it ? [itemName(it)] : [];
    },
  },
  {
    id: 'epic',
    icon: '🟣',
    name: '史詩裝備箱',
    price: 40,
    desc: (s) => `隨機欄位的第 ${tierForLevel(s.level)} 階史詩標準裝`,
    blocked: bagFull,
    buy: (s, rng) => {
      const it = addItem(s, `${pick(SLOT_ORDER, rng)}_t${tierForLevel(s.level)}`, 'epic');
      return it ? [itemName(it)] : [];
    },
  },
  {
    id: 'petGift',
    icon: '🍯',
    name: '夥伴神饌禮盒',
    price: 30,
    desc: (s) => {
      const c = s.companions.active ? COMPANIONS[s.companions.active] : undefined;
      return c ? `${c.icon} ${c.name}（主力）經驗 +300、好感 +10` : '帶著的主力夥伴經驗 +300、好感 +10';
    },
    blocked: (s) => {
      const id = s.companions.active;
      if (!id) return '還沒帶夥伴';
      const g = growthOf(s.companions, id);
      return g.lv >= GROWTH.maxLv && g.bond >= GROWTH.bondTiers[GROWTH.bondTiers.length - 1] ? '這隻夥伴已經滿級滿好感' : null;
    },
    buy: (s) => {
      const id = s.companions.active!;
      const g = growthOf(s.companions, id);
      addCompExp(g, 300);
      addBond(g, 10);
      return [`${COMPANIONS[id].name} Lv.${g.lv}・好感 ${g.bond}`];
    },
  },
  {
    id: 'gold',
    icon: '💰',
    name: '金幣袋',
    price: 10,
    desc: (s) => `${goldBag(s.level).toLocaleString()} 金幣`,
    blocked: () => null,
    buy: (s) => {
      const g = goldBag(s.level);
      s.gold += g;
      return [`${g.toLocaleString()} 金幣`];
    },
  },
  {
    id: 'items',
    icon: '🎒',
    name: '道具福袋',
    price: 15,
    desc: () => '隨機 4 個道具（含職業專屬）',
    blocked: () => null,
    buy: (s, rng) => {
      const got: string[] = [];
      for (let i = 0; i < 4; i++) {
        const id = rollConsumable(rng, s.heroClass);
        if (addConsumable(s, id, 1)) got.push(`${CONSUMABLE_MAP[id].icon}${CONSUMABLE_MAP[id].name}`);
      }
      return got;
    },
  },
];

export function goldBag(level: number): number {
  return 1000 + level * 200;
}

/** 購買：成功回傳獲得的東西，失敗回傳原因字串 */
export function buyGemItem(s: GameState, id: string, rng: () => number = Math.random): { ok: true; got: string[] } | { ok: false; why: string } {
  const item = GEM_SHOP.find((x) => x.id === id);
  if (!item) return { ok: false, why: '沒有這個商品' };
  if (s.gems < item.price) return { ok: false, why: `鑽石不夠（需要 ${item.price}💎）` };
  const why = item.blocked(s);
  if (why) return { ok: false, why };
  const got = item.buy(s, rng);
  if (!got.length) return { ok: false, why: '購買失敗' };
  s.gems -= item.price;
  return { ok: true, got };
}
