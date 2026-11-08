import type { EnemyDef, ZoneId } from '@/data/types';
import { ENEMIES } from '@/data/enemies';
import { DUNGEON_ORDER } from '@/data/zones';
import { BOSS_PACE } from './BossScaling';
import type { ClearRecord } from './StageClear';
import { TOWER } from './TrialTower';
import { MAX_LEVEL } from './Progression';

/**
 * 神話難度（v1.77，純邏輯，可單元測試）
 * ------------------------------------------------------------
 * 打倒最終首領後開放。主線副本（v1.97 起 30 層）可以切到「神話」重打：
 * - 第 N 層的敵人都換算成 Lv.(MAX_LEVEL＋N)（v1.97 起 150＋N）：小怪依「同等級小怪的中位數屬性」換算生命 / 攻擊 / 防禦，
 *   首領依最終首領的屬性換算；再乘上試煉塔同樣的超越倍率（每 2 級 ×TOWER.overflow）。
 * - 首領**不會自動調整強度**（跟試煉塔一樣），看你的裝備、神格夠不夠。
 * - 掉落一律最高階（MAX_TIER），首領多掉 1 件；經驗、金幣也跟著換算（滿級後經驗進神格）。
 * - 依序開放：神話第 N 層要先在神話難度打倒第 N−1 層首領。第一次打倒每層神話首領有鑽石。
 * 數值都在 MYTHIC；改了要看一下說明頁（data/manual.ts）的文字。
 */
export const MYTHIC = {
  /** 第 N 層的敵人等級 = base + N（跟著等級上限） */
  levelBase: MAX_LEVEL,
  /** 首領生命（相對「最終首領原本生命 × 換算」；原本約為標準配備 180 秒） */
  bossHp: 0.5,
  /** 首領多掉幾件裝備 */
  bossExtraDrops: 1,
  /** 經驗、金幣換算的指數（1 = 跟屬性一樣比例；小一點避免太誇張） */
  rewardPow: 0.85,
};

export interface MythicState {
  /** 目前是否開著神話難度 */
  on: boolean;
  /** 神話難度的破關紀錄（跟普通難度分開） */
  clears: Partial<Record<ZoneId, ClearRecord>>;
}

export function newMythicState(): MythicState {
  return { on: false, clears: {} };
}

export function normalizeMythic(v: unknown): MythicState {
  const m = newMythicState();
  if (!v || typeof v !== 'object') return m;
  const o = v as Partial<MythicState>;
  m.on = o.on === true;
  if (o.clears && typeof o.clears === 'object') m.clears = { ...o.clears };
  return m;
}

/** 開放條件：打倒最終層首領 */
export function mythicOpen(bossesDefeated: readonly ZoneId[]): boolean {
  return bossesDefeated.includes(DUNGEON_ORDER[DUNGEON_ORDER.length - 1]);
}

/** 第幾層（1 起算）；不是主線副本回傳 0 */
export function mythicFloor(zoneId: ZoneId): number {
  return DUNGEON_ORDER.indexOf(zoneId) + 1;
}

export function mythicLevel(floor: number): number {
  return MYTHIC.levelBase + floor;
}

/** 神話第 floor 層開放了沒（第 1 層直接開放，之後要先打過上一層神話首領） */
export function mythicUnlocked(m: MythicState, floor: number): boolean {
  if (floor <= 1) return true;
  return (m.clears[DUNGEON_ORDER[floor - 2]]?.count ?? 0) > 0;
}

/** 已經打過的最高神話層 */
export function mythicBest(m: MythicState): number {
  let n = 0;
  DUNGEON_ORDER.forEach((id, i) => {
    if ((m.clears[id]?.count ?? 0) > 0) n = i + 1;
  });
  return n;
}

/** 第一次打倒神話第 floor 層首領的鑽石 */
export function mythicFirstGems(floor: number): number {
  return 10 + floor * 2;
}

/** 超過等級上限之後的生命 / 攻擊倍率（跟試煉塔一樣：每 2 級 ×overflow） */
export function mythicOver(floor: number): number {
  return Math.pow(TOWER.overflow, floor / 2);
}

interface Ref {
  hp: number;
  atk: number;
  def: number;
  exp: number;
  gold: number;
}

const med = (xs: number[]) => {
  const a = [...xs].sort((p, q) => p - q);
  return a[Math.floor(a.length / 2)] ?? 0;
};

const refCache = new Map<number, Ref>();
/** 等級附近小怪的中位數屬性 */
function mobRef(level: number): Ref {
  const hit = refCache.get(level);
  if (hit) return hit;
  const pool = Object.values(ENEMIES).filter((e) => !e.boss && e.aggro === 'aggressive' && e.exp > 0);
  let near = pool.filter((e) => Math.abs(e.level - level) <= 3);
  if (near.length < 3) near = [...pool].sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level)).slice(0, 6);
  const r: Ref = {
    hp: med(near.map((e) => e.stats.maxHp)),
    atk: med(near.map((e) => e.stats.atk)),
    def: med(near.map((e) => e.stats.def)),
    exp: med(near.map((e) => e.exp)),
    gold: med(near.map((e) => (e.gold[0] + e.gold[1]) / 2)),
  };
  refCache.set(level, r);
  return r;
}

/** 最終首領（換算首領用） */
function finalBoss(): EnemyDef | undefined {
  return Object.values(ENEMIES)
    .filter((e) => e.boss)
    .sort((a, b) => b.level - a.level)[0];
}

export interface MythicMods {
  level: number;
  hpMul: number;
  atkMul: number;
  defense: number;
  expMul: number;
  goldMul: number;
}

/** 某隻敵人在神話第 floor 層的換算（相對牠原本的屬性） */
export function mythicMods(def: EnemyDef, floor: number): MythicMods {
  const level = mythicLevel(floor);
  const over = mythicOver(floor);
  const cap = MYTHIC.levelBase;
  if (def.boss) {
    const fb = finalBoss() ?? def;
    const hpR = fb.stats.maxHp / Math.max(1, def.stats.maxHp);
    const atkR = fb.stats.atk / Math.max(1, def.stats.atk);
    const expR = fb.exp / Math.max(1, def.exp);
    const goldR = (fb.gold[0] + fb.gold[1]) / Math.max(1, def.gold[0] + def.gold[1]);
    return {
      level,
      hpMul: MYTHIC.bossHp * hpR * over,
      atkMul: BOSS_PACE.atkBase * atkR * over,
      defense: fb.stats.def,
      expMul: Math.pow(expR * over, MYTHIC.rewardPow),
      goldMul: Math.pow(goldR * over, MYTHIC.rewardPow),
    };
  }
  const from = mobRef(def.level);
  const to = mobRef(cap);
  // 這隻怪相對同等級中位數的特色（肉、脆、高攻）保留下來
  const hpR = to.hp / Math.max(1, from.hp);
  const atkR = to.atk / Math.max(1, from.atk);
  const defense = Math.round(Math.max(def.stats.def, 1) * (to.def / Math.max(1, from.def)));
  return {
    level,
    hpMul: hpR * over,
    atkMul: atkR * over,
    defense,
    expMul: Math.pow((to.exp / Math.max(1, from.exp)) * over, MYTHIC.rewardPow),
    goldMul: Math.pow((to.gold / Math.max(1, from.gold)) * over, MYTHIC.rewardPow),
  };
}
