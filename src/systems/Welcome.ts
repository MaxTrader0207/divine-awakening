import type { GameState } from '@/core/GameState';
import { ENEMIES } from '@/data/stages';
import { CONSUMABLE_MAP, rollConsumable } from '@/data/consumables';
import { tierForLevel, namedGearIds, SLOT_ORDER } from '@/data/items';
import { addConsumable } from './Consumables';
import { addItem, itemName } from './Inventory';
import { localDate } from './DailyQuests';
import { expForKill } from './Progression';
import { rollDrop } from './LootTable';
import { rebirthExpMul } from './Rebirth';
import type { HeroClass } from '@/data/classes';
import type { Rarity } from '@/data/types';

/**
 * 每日簽到與離線收益（v1.65，純邏輯，可單元測試）
 * ------------------------------------------------------------
 * 簽到：7 天一輪，每天第一次進遊戲可以領一次；漏掉的天數不會重置進度（第 7 天一定拿得到）。
 * 離線收益：離開 10 分鐘以上，回來時依「離開時間 × 目前等級的標準小怪」給經驗與金幣，最多算 12 小時。
 * v1.85 起另有：裝備（每 dropEvery 隻一件）、紅藍藥水、帶著的夥伴經驗；轉生的經驗加成也算。
 */

/* ======================= 每日簽到 ======================= */

export interface LoginState {
  /** 上次簽到的日期 YYYY-MM-DD（'' = 沒簽過） */
  last: string;
  /** 下一次簽到是這一輪的第幾天（0~6） */
  next: number;
  /** 累計簽到天數 */
  total: number;
}

export function newLoginState(): LoginState {
  return { last: '', next: 0, total: 0 };
}

export const LOGIN_DAYS = 7;

export interface LoginRewardDef {
  icon: string;
  /** 卡片上的短文字 */
  label: string;
}

/** 第 day 天（0~6）的獎勵說明（金額依等級） */
export function loginRewardDef(day: number, level: number): LoginRewardDef {
  const gold = level * 100 + 300;
  switch (day) {
    case 0:
      return { icon: '🪙', label: `${gold.toLocaleString()} 金幣` };
    case 1:
      return { icon: '🧪', label: '紅、藍藥水各 5' };
    case 2:
      return { icon: '💎', label: '10 鑽石' };
    case 3:
      return { icon: '🎒', label: '隨機道具 ×3' };
    case 4:
      return { icon: '💰', label: `${(gold * 2).toLocaleString()} 金幣` };
    case 5:
      return { icon: '💎', label: '20 鑽石' };
    default:
      return { icon: '★', label: '神話裝＋10 鑽石' };
  }
}

export function canClaimLogin(s: GameState, today = localDate()): boolean {
  return s.login.last !== today;
}

/**
 * 簽到：發獎勵、推進天數。回傳獲得的東西（顯示用）；今天已簽過回傳 null。
 * 第 7 天的神話裝背包滿了會改發 3 倍金幣（不讓玩家因為背包滿而拿不到）。
 */
export function claimLogin(s: GameState, today = localDate(), rng: () => number = Math.random): string[] | null {
  if (!canClaimLogin(s, today)) return null;
  const day = s.login.next % LOGIN_DAYS;
  const gold = s.level * 100 + 300;
  const got: string[] = [];
  switch (day) {
    case 0:
      s.gold += gold;
      got.push(`${gold.toLocaleString()} 金幣`);
      break;
    case 1:
      s.potions.hp += 5;
      s.potions.mp += 5;
      got.push('紅藥水 ×5', '藍藥水 ×5');
      break;
    case 2:
      s.gems += 10;
      got.push('10 鑽石');
      break;
    case 3:
      for (let i = 0; i < 3; i++) {
        const id = rollConsumable(rng, s.heroClass);
        if (addConsumable(s, id, 1)) got.push(`${CONSUMABLE_MAP[id].icon} ${CONSUMABLE_MAP[id].name}`);
      }
      if (!got.length) {
        s.gold += gold;
        got.push(`${gold.toLocaleString()} 金幣（道具已滿）`);
      }
      break;
    case 4:
      s.gold += gold * 2;
      got.push(`${(gold * 2).toLocaleString()} 金幣`);
      break;
    case 5:
      s.gems += 20;
      got.push('20 鑽石');
      break;
    default: {
      s.gems += 10;
      got.push('10 鑽石');
      const tier = tierForLevel(s.level);
      const slot = SLOT_ORDER[Math.floor(rng() * SLOT_ORDER.length)];
      // 這一階這個欄位沒有神話裝時往下找最近的一階
      let ids: string[] = [];
      for (let t = tier; t >= 1 && !ids.length; t--) ids = namedGearIds(s.heroClass, slot, t);
      const it = ids.length ? addItem(s, ids[Math.floor(rng() * ids.length)], rng() < 0.3 ? 'epic' : 'rare') : null;
      if (it) got.push(itemName(it));
      else {
        s.gold += gold * 3;
        got.push(`${(gold * 3).toLocaleString()} 金幣（背包已滿，改發金幣）`);
      }
    }
  }
  s.login = { last: today, next: (day + 1) % LOGIN_DAYS, total: s.login.total + 1 };
  return got;
}

/* ======================= 離線收益 ======================= */

export const OFFLINE = {
  /** 離開幾分鐘以上才算 */
  minMinutes: 10,
  /** 最多算幾小時（v1.85：8 → 12） */
  capHours: 12,
  /** 每打倒幾隻掉一件裝備（目前等級的掉落階級），最多 dropMax 件 */
  dropEvery: 20,
  dropMax: 8,
  /** 每幾小時各得 1 瓶紅藍藥水 */
  potionHours: 2,
  /** 每分鐘相當於打倒幾隻同等級小怪（實際練功約每分鐘 6 隻，離線大約 1/30） */
  killsPerMin: 0.2,
  /** 花幾顆鑽石領 2 倍 */
  doubleCost: 10,
};

export interface OfflineReward {
  /** 實際離開的分鐘數 */
  away: number;
  /** 計算收益的分鐘數（上限 capHours） */
  minutes: number;
  kills: number;
  exp: number;
  gold: number;
  /** v1.85：撿到的裝備（領 2 倍時再加 bonusDrops） */
  drops: { base: string; rarity: Rarity }[];
  bonusDrops: { base: string; rarity: Rarity }[];
  /** 紅藍藥水各幾瓶 */
  potions: number;
  /** 帶著的夥伴各得的經驗 */
  compExp: number;
}

/** 目前等級的「標準小怪」：等級差 3 以內、會攻擊的小怪，經驗與金幣取中位數 */
export function refMob(level: number): { level: number; exp: number; gold: number } {
  const pool = Object.values(ENEMIES).filter((e) => !e.boss && e.aggro !== 'none' && e.exp > 0);
  let near = pool.filter((e) => Math.abs(e.level - level) <= 3);
  if (!near.length) near = [...pool].sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level)).slice(0, 5);
  const med = (xs: number[]) => {
    const a = [...xs].sort((p, q) => p - q);
    return a[Math.floor(a.length / 2)];
  };
  return {
    level: med(near.map((e) => e.level)),
    exp: med(near.map((e) => e.exp)),
    gold: med(near.map((e) => (e.gold[0] + e.gold[1]) / 2)),
  };
}

/** 離開 awayMs 毫秒的收益；不到門檻回傳 null */
export function offlineReward(
  level: number,
  awayMs: number,
  opts: { cls?: HeroClass; rebirth?: number; rng?: () => number } = {},
): OfflineReward | null {
  const away = Math.floor(awayMs / 60000);
  if (!(away >= OFFLINE.minMinutes)) return null;
  const minutes = Math.min(away, OFFLINE.capHours * 60);
  const kills = Math.max(1, Math.round(minutes * OFFLINE.killsPerMin));
  const m = refMob(level);
  const rng = opts.rng ?? Math.random;
  const nDrops = Math.min(OFFLINE.dropMax, Math.floor(kills / OFFLINE.dropEvery));
  const roll = () => {
    const out: { base: string; rarity: Rarity }[] = [];
    for (let i = 0, tries = 0; i < nDrops && tries < nDrops * 40; tries++) {
      const d = rollDrop(tierForLevel(level), false, rng, opts.cls);
      if (d) {
        out.push(d);
        i++;
      }
    }
    return out;
  };
  return {
    away,
    minutes,
    kills,
    exp: Math.round(kills * expForKill(m.exp, level, m.level) * rebirthExpMul(opts.rebirth ?? 0)),
    gold: Math.round(kills * m.gold),
    drops: roll(),
    bonusDrops: roll(),
    potions: Math.floor(minutes / 60 / OFFLINE.potionHours),
    compExp: kills,
  };
}

/** 領取後實際拿到的東西（畫面顯示用） */
export interface OfflineClaim {
  exp: number;
  gold: number;
  potions: number;
  compExp: number;
  /** 收進背包的裝備 */
  kept: { base: string; rarity: Rarity }[];
  /** 自動賣出或背包滿換成金幣 */
  soldCount: number;
  soldGold: number;
  /** 滿級：經驗變成神格經驗 */
  divine: boolean;
}

/** 「3 小時 12 分」 */
export function formatAway(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h >= 24) return `${Math.floor(h / 24)} 天 ${h % 24} 小時`;
  return h ? `${h} 小時${m ? ` ${m} 分` : ''}` : `${m} 分鐘`;
}
