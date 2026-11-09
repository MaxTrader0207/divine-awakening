import { ENEMIES } from '@/data/stages';
import type { EnemyDef } from '@/data/types';
import { BOSS_PACE } from './BossScaling';
import { COMPANIONS } from '@/data/companions';

/**
 * 無盡試煉塔（v1.70，純邏輯，可單元測試；Game 負責生成敵人與結算）
 * ------------------------------------------------------------
 * - 第 N 層的敵人等級 towerLevel(N) = 4 + 2N（第 53 層到 Lv.110）；之後每層生命、攻擊 ×TOWER.overflow。
 * - 一般層：從遊戲裡等級相近的小怪隨機挑 2~3 種，共 5~10 隻；時間限制 = timeBase + timePerMob × 敵人數。
 * - 每 5 層是首領層：挑一隻等級相近的首領（主線、菁英、守護者），生命 × TOWER.bossHp（標準配備約 60 秒），
 *   不套用一般首領的自動強度調整——越往上越難，打不過就是極限。時間限制 TOWER.timeBoss 秒。
 * - 打倒全部敵人就上樓；倒下或時間到結算。在塔裡倒下不會掉金幣。
 * - 每 10 層是檢查點，下次可以從「最高紀錄以下最近的檢查點」開始。
 * - 本週紀錄每週一 00:00（當地時間）重置；本週第一次打過某個首領層，給 bossGems(N) 鑽石。
 */
export const TOWER = {
  /** 擊敗哪一層首領後開放 */
  unlockAfter: 'dungeon_3' as const,
  /** 一般層時間 = timeBase + timePerMob × 敵人數（v1.73：依數量給時間，召喚系清場較慢也來得及） */
  timeBase: 30,
  timePerMob: 5,
  timeBoss: 120,
  /** 一般層小怪生命倍率（v1.73：塔裡的怪成群出現，比副本的單隻弱一點） */
  mobHp: 0.8,
  /** 一般層小怪攻擊倍率（v1.73：一群怪同時圍上來，遠程職業容易被瞬間打倒） */
  mobAtk: 0.85,
  /** 一般層分兩波出場：第一波比例；第二波在場上剩 2 隻以下或 secondWaveAt 秒後出場 */
  firstWave: 0.6,
  secondWaveAt: 10,
  /** 一般層敵人數：minMobs + 層數 / 5，最多 maxMobs */
  minMobs: 5,
  maxMobs: 10,
  /** 上樓前的間隔（秒）、上樓時回復最大生命比例 */
  between: 2.5,
  healOnClear: 0.2,
  /** 首領生命倍率（相對原本首領；原本約為標準配備 180 秒） */
  bossHp: 0.35,
  /** 等級封頂後每層的生命、攻擊倍率 */
  overflow: 1.07,
  checkpoint: 10,
  /** 敵人等級上限（v1.97 主線加到 Lv.150，但塔維持 110 封頂、之後靠 overflow 變強，排行標準不變） */
  levelCap: 110,
};

export function towerLevel(floor: number): number {
  return Math.min(TOWER.levelCap, 4 + floor * 2);
}

export function isBossFloor(floor: number): boolean {
  return floor % 5 === 0;
}

/** 等級封頂後的屬性倍率 */
export function overflowMul(floor: number): number {
  const capFloor = Math.ceil((TOWER.levelCap - 4) / 2);
  return Math.pow(TOWER.overflow, Math.max(0, floor - capFloor));
}

/* ======================= 層數詞綴（v1.73） ======================= */

export type AffixId = 'frenzy' | 'tough' | 'might' | 'armored' | 'horde' | 'regen' | 'elite' | 'blessed' | 'hasty' | 'reinforce';

export interface AffixDef {
  id: AffixId;
  icon: string;
  name: string;
  desc: string;
  /** 只出現在一般層 / 只出現在首領層（沒填 = 都會） */
  only?: 'mob' | 'boss';
  /** 對玩家有利的詞綴 */
  good?: boolean;
  hp?: number;
  atk?: number;
  def?: number;
  /** 敵人數量倍率（一般層） */
  count?: number;
  /** 時間加減（秒）與倍率 */
  time?: number;
  timeMul?: number;
  /** 敵人移動、出手速度倍率 */
  haste?: number;
  /** 敵人每秒回復最大生命比例 */
  regen?: number;
  /** 其中一隻變成菁英（生命 ×3、攻擊 ×1.4、體型變大） */
  elite?: boolean;
  /** 你這層攻擊 +x */
  blessAtk?: number;
  /** 首領生命掉到 60%、30% 時叫援軍 */
  reinforce?: boolean;
}

export const TOWER_AFFIXES: Record<AffixId, AffixDef> = {
  frenzy: { id: 'frenzy', icon: '🔥', name: '狂暴', desc: '敵人移動與出手速度 +30%', haste: 1.3 },
  tough: { id: 'tough', icon: '🪨', name: '堅韌', desc: '敵人生命 +50%（時間 +15 秒）', hp: 1.5, time: 15 },
  might: { id: 'might', icon: '⚔', name: '強攻', desc: '敵人攻擊 +30%', atk: 1.3 },
  armored: { id: 'armored', icon: '🛡', name: '鐵壁', desc: '敵人防禦 +60%', def: 1.6 },
  horde: { id: 'horde', icon: '👥', name: '大軍', desc: '敵人數量 +50%（時間跟著增加）', only: 'mob', count: 1.5 },
  regen: { id: 'regen', icon: '💚', name: '再生', desc: '小怪每秒回復 2% 生命（首領 0.5%）', regen: 0.02 },
  elite: { id: 'elite', icon: '👑', name: '菁英', desc: '其中一隻變成菁英：生命 ×3、攻擊 ×1.4', only: 'mob', elite: true },
  blessed: { id: 'blessed', icon: '✨', name: '神眷', desc: '奧林帕斯眾神祝福：你這層攻擊 +25%', good: true, blessAtk: 0.25 },
  hasty: { id: 'hasty', icon: '⏱', name: '急行', desc: '時間限制只有 70%', only: 'mob', timeMul: 0.7 },
  reinforce: { id: 'reinforce', icon: '📯', name: '援軍', desc: '首領生命剩 60%、30% 時各叫 3 隻小怪', only: 'boss', reinforce: true },
};

/** 第幾層有幾個詞綴：1~5 層沒有、6~19 層一般層一半機率 1 個、首領層（10 層起）1 個、20 層起每層 1 個、40 層起每層 2 個 */
export function affixCount(floor: number, rng: () => number): number {
  if (floor <= 5) return 0;
  if (floor >= 40) return 2;
  if (floor >= 20) return 1;
  if (isBossFloor(floor)) return floor >= 10 ? 1 : 0;
  return rng() < 0.5 ? 1 : 0;
}

export function rollAffixes(floor: number, rng: () => number): AffixId[] {
  const n = affixCount(floor, rng);
  const boss = isBossFloor(floor);
  const pool = (Object.values(TOWER_AFFIXES) as AffixDef[]).filter((a) => !a.only || a.only === (boss ? 'boss' : 'mob'));
  const out: AffixId[] = [];
  while (out.length < n && pool.length) {
    const a = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    // 兩個詞綴時不要兩個都是有利的
    if (a.good && out.some((x) => TOWER_AFFIXES[x].good)) continue;
    out.push(a.id);
  }
  return out;
}

/** 每週固定的亂數：同一週、同一層，大家打到的怪和詞綴都一樣（排行才公平） */
export function towerRng(week: string, floor: number): () => number {
  let h = 2166136261;
  for (const ch of `${week}#${floor}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 首領「援軍」叫出來的小怪（等級最接近的 3 種各 1 隻） */
export function reinforceMobs(level: number, rng: () => number): string[] {
  const near = nearest(MOB_POOL(), level, 6);
  const out: string[] = [];
  for (let i = 0; i < 3; i++) out.push(near[Math.floor(rng() * near.length)].id);
  return out;
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
  /** 這層的詞綴（v1.73） */
  affixes: AffixId[];
}

/** 副本防禦大約是 (等級 − 5) × 4（第四層 55、第二十二層 415） */
export function towerDefense(level: number): number {
  return Math.max(0, Math.round((level - 5) * 3.9));
}

const MOB_POOL = (): EnemyDef[] => Object.values(ENEMIES).filter((e) => !e.boss && e.aggro === 'aggressive' && e.exp > 0 && e.level <= TOWER.levelCap);
const BOSS_POOL = (): EnemyDef[] => Object.values(ENEMIES).filter((e) => e.boss && (e.bossSkills?.length ?? 0) > 0 && e.level <= TOWER.levelCap + 3);

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
    return applyAffixes({ floor, level, boss, groups: [{ id: b.id, count: 1 }], hpMul: TOWER.bossHp * over, atkMul: BOSS_PACE.atkBase * over, defense: towerDefense(level), timeLimit: TOWER.timeBoss, affixes: rollAffixes(floor, rng) });
  }
  const near = nearest(MOB_POOL(), level, 10);
  const kinds = 2 + (floor >= 10 ? 1 : 0);
  // 不重複抽 kinds 種（從還沒選到的裡面抽，rng 固定也不會卡住）
  const left = [...near];
  const chosen: EnemyDef[] = [];
  while (chosen.length < kinds && left.length) chosen.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  const affixes = rollAffixes(floor, rng);
  const countMul = affixes.reduce((m, a) => m * (TOWER_AFFIXES[a].count ?? 1), 1);
  // 「大軍」最多 13 隻（v1.73 模擬：15 隻＋堅韌時大部分職業都清不完）
  const total = Math.min(Math.round(TOWER.maxMobs * 1.3), Math.round(Math.min(TOWER.maxMobs, TOWER.minMobs + Math.floor(floor / 5)) * countMul));
  const groups = chosen.map((e, i) => ({ id: e.id, count: Math.floor(total / chosen.length) + (i < total % chosen.length ? 1 : 0) }));
  return applyAffixes({ floor, level, boss, groups, hpMul: TOWER.mobHp * over, atkMul: TOWER.mobAtk * over, defense: towerDefense(level), timeLimit: TOWER.timeBase + TOWER.timePerMob * total, affixes });
}

/** 把詞綴的數值套進這層的設定（生命、攻擊、防禦、時間） */
function applyAffixes(p: FloorPlan): FloorPlan {
  for (const id of p.affixes) {
    const a = TOWER_AFFIXES[id];
    if (a.hp) p.hpMul *= a.hp;
    if (a.atk) p.atkMul *= a.atk;
    if (a.def) p.defense = Math.round(p.defense * a.def);
    if (a.time) p.timeLimit += a.time;
    if (a.timeMul) p.timeLimit = Math.round(p.timeLimit * a.timeMul);
  }
  return p;
}

/** 詞綴層通過的額外金幣（每個不利的詞綴：等級 × 25） */
export function affixBonusGold(plan: FloorPlan): number {
  return plan.affixes.filter((a) => !TOWER_AFFIXES[a].good).length * plan.level * 25;
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

/* ======================= 首領召喚守護者助陣（v1.104） ======================= */

/**
 * 越高層的首領，越可能在戰鬥中召喚「守護者」（支線地圖的 10 隻神獸）來助陣：
 * - 第 fromFloor 層起才會發生；每一層最多召喚幾隻看 countAt（第 20 層 1 隻、第 40 層 2 隻、第 70 層 3 隻）。
 * - 首領生命掉到 at[i] 時召喚第 i 隻；每一次是否發生看 chance(層)（越高層越必定），第 guaranteeFrom 層起第一隻必定出現。
 * - 助陣守護者的生命 = 首領最大生命 × hpShare(層)、攻擊 = 首領攻擊 × atkShare（越高層越強）。
 * - 首領倒下時，還在場的助陣守護者會一起消散（不用另外清場）。
 * 同一週同一層大家遇到的都一樣（用 towerRng 固定種子）。
 */
export const BOSS_ALLY = {
  fromFloor: 20,
  countAt: [20, 40, 70],
  at: [0.7, 0.45, 0.22],
  chanceBase: 0.45,
  chancePerFloor: 0.015,
  guaranteeFrom: 40,
  hpBase: 0.22,
  hpPerFloor: 0.004,
  hpMax: 0.4,
  atkBase: 0.55,
  atkPerFloor: 0.004,
  atkMax: 0.8,
};

export interface AllyCall {
  /** 首領生命比例掉到多少時召喚 */
  at: number;
  /** 守護者的敵人 id */
  id: string;
  /** 對應的夥伴（顯示名稱、圖示用） */
  companion: string;
}

export function allyChance(floor: number): number {
  if (floor < BOSS_ALLY.fromFloor) return 0;
  return Math.min(1, BOSS_ALLY.chanceBase + BOSS_ALLY.chancePerFloor * (floor - BOSS_ALLY.fromFloor));
}

export function allyHpShare(floor: number): number {
  return Math.min(BOSS_ALLY.hpMax, BOSS_ALLY.hpBase + BOSS_ALLY.hpPerFloor * Math.max(0, floor - BOSS_ALLY.fromFloor));
}

export function allyAtkShare(floor: number): number {
  return Math.min(BOSS_ALLY.atkMax, BOSS_ALLY.atkBase + BOSS_ALLY.atkPerFloor * Math.max(0, floor - BOSS_ALLY.fromFloor));
}

/** 這一層首領會在什麼時候叫哪些守護者（可能是空的） */
export function bossAllyPlan(floor: number, bossId: string, rng: () => number): AllyCall[] {
  if (!isBossFloor(floor) || floor < BOSS_ALLY.fromFloor) return [];
  const n = BOSS_ALLY.countAt.filter((f) => floor >= f).length;
  const pool = Object.values(COMPANIONS).filter((c) => ENEMIES[c.guardian] && c.guardian !== bossId);
  const out: AllyCall[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const sure = i === 0 && floor >= BOSS_ALLY.guaranteeFrom;
    if (!sure && rng() >= allyChance(floor)) continue;
    const k = Math.floor(rng() * pool.length);
    const c = pool.splice(k, 1)[0];
    out.push({ at: BOSS_ALLY.at[i], id: c.guardian, companion: c.id });
  }
  return out;
}
