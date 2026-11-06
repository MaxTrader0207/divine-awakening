import { ENEMIES } from '@/data/stages';
import type { EnemyDef } from '@/data/types';
import { BOSS_PACE } from './BossScaling';

/**
 * 無盡試煉塔（v1.70，純邏輯，可單元測試；Game 負責生成敵人與結算）
 * ------------------------------------------------------------
 * - 第 N 層的敵人等級 towerLevel(N) = 4 + 2N（第 53 層到 Lv.110）；之後每層生命、攻擊 ×TOWER.overflow。
 * - 一般層：從遊戲裡等級相近的小怪隨機挑 2~3 種，共 5~12 隻；時間限制 TOWER.timeNormal 秒。
 * - 每 5 層是首領層：挑一隻等級相近的首領（主線、菁英、守護者），生命 × TOWER.bossHp（標準配備約 60 秒），
 *   不套用一般首領的自動強度調整——越往上越難，打不過就是極限。時間限制 TOWER.timeBoss 秒。
 * - 打倒全部敵人就上樓；倒下或時間到結算。在塔裡倒下不會掉金幣。
 * - 每 10 層是檢查點，下次可以從「最高紀錄以下最近的檢查點」開始。
 * - 本週紀錄每週一 00:00（當地時間）重置；本週第一次打過某個首領層，給 bossGems(N) 鑽石。
 */
export const TOWER = {
  /** 擊敗哪一層首領後開放 */
  unlockAfter: 'dungeon_3' as const,
  timeNormal: 50,
  timeBoss: 100,
  /** 上樓前的間隔（秒）、上樓時回復最大生命比例 */
  between: 2.5,
  healOnClear: 0.2,
  /** 首領生命倍率（相對原本首領；原本約為標準配備 180 秒） */
  bossHp: 0.35,
  /** 等級封頂後每層的生命、攻擊倍率 */
  overflow: 1.07,
  checkpoint: 10,
};

export function towerLevel(floor: number): number {
  return Math.min(110, 4 + floor * 2);
}

export function isBossFloor(floor: number): boolean {
  return floor % 5 === 0;
}

/** 等級封頂後的屬性倍率 */
export function overflowMul(floor: number): number {
  const capFloor = Math.ceil((110 - 4) / 2);
  return Math.pow(TOWER.overflow, Math.max(0, floor - capFloor));
}

export interface FloorPlan {
  floor: number;
  level: number;
  boss: boolean;
  /** 敵人 id 與數量 */
  groups: { id: string; count: number }[];
  hpMul: number;
  atkMul: number;
  /** 敵人防禦（依等級：大約和同等級副本相同） */
  defense: number;
  timeLimit: number;
}

/** 副本防禦大約是 (等級 − 5) × 4（第四層 55、第二十二層 415） */
export function towerDefense(level: number): number {
  return Math.max(0, Math.round((level - 5) * 3.9));
}

const MOB_POOL = (): EnemyDef[] => Object.values(ENEMIES).filter((e) => !e.boss && e.aggro === 'aggressive' && e.exp > 0);
const BOSS_POOL = (): EnemyDef[] => Object.values(ENEMIES).filter((e) => e.boss && (e.bossSkills?.length ?? 0) > 0);

/** 等級最接近的 n 個 */
function nearest(pool: EnemyDef[], level: number, n: number): EnemyDef[] {
  return [...pool].sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level)).slice(0, n);
}

export function floorPlan(floor: number, rng: () => number = Math.random): FloorPlan {
  const level = towerLevel(floor);
  const over = overflowMul(floor);
  const boss = isBossFloor(floor);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  if (boss) {
    const b = pick(nearest(BOSS_POOL(), level, 4));
    return { floor, level, boss, groups: [{ id: b.id, count: 1 }], hpMul: TOWER.bossHp * over, atkMul: BOSS_PACE.atkBase * over, defense: towerDefense(level), timeLimit: TOWER.timeBoss };
  }
  const near = nearest(MOB_POOL(), level, 10);
  const kinds = 2 + (floor >= 10 ? 1 : 0);
  // 不重複抽 kinds 種（從還沒選到的裡面抽，rng 固定也不會卡住）
  const left = [...near];
  const chosen: EnemyDef[] = [];
  while (chosen.length < kinds && left.length) chosen.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  const total = Math.min(12, 5 + Math.floor(floor / 4));
  const groups = chosen.map((e, i) => ({ id: e.id, count: Math.floor(total / chosen.length) + (i < total % chosen.length ? 1 : 0) }));
  return { floor, level, boss, groups, hpMul: over, atkMul: over, defense: towerDefense(level), timeLimit: TOWER.timeNormal };
}

/** 本週的鍵（週一開始），例如 2026-11-02 */
export function weekKey(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 週一 = 0
  x.setDate(x.getDate() - dow);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/** 本週第一次打過第 N 層首領層給的鑽石 */
export function bossGems(floor: number): number {
  return 3 + Math.floor(floor / 10) * 2;
}

/** 可以從哪一層開始：1 或最高紀錄以下最近的檢查點 + 1 */
export function startFloors(best: number): number[] {
  const cp = Math.floor(best / TOWER.checkpoint) * TOWER.checkpoint;
  return cp >= TOWER.checkpoint ? [1, cp + 1] : [1];
}

/** 試煉塔存檔（存檔 v18） */
export interface TowerState {
  /** 歷史最高（打過的最高層） */
  best: number;
  /** 本週鍵與本週最高 */
  week: string;
  weekBest: number;
  /** 挑戰次數 */
  runs: number;
}

export function newTowerState(): TowerState {
  return { best: 0, week: '', weekBest: 0, runs: 0 };
}

/** 換週時重置本週紀錄 */
export function ensureWeek(t: TowerState, now = new Date()): void {
  const k = weekKey(now);
  if (t.week !== k) {
    t.week = k;
    t.weekBest = 0;
  }
}

/**
 * 打過第 floor 層：更新紀錄，回傳本週新打過首領層的鑽石（沒有回傳 0）。
 */
export function recordFloor(t: TowerState, floor: number, now = new Date()): number {
  ensureWeek(t, now);
  let gems = 0;
  if (floor > t.weekBest) {
    if (isBossFloor(floor)) gems = bossGems(floor);
    t.weekBest = floor;
  }
  if (floor > t.best) t.best = floor;
  return gems;
}
