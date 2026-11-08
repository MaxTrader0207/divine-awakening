import type { EnemyDef } from '@/data/types';
import { ENEMIES } from '@/data/enemies';
import { DUNGEON_ORDER, ZONES } from '@/data/zones';
import { TOWER_AFFIXES, towerRng, weekKey, type AffixId } from './TrialTower';

/**
 * 每週首領挑戰（v1.78，純邏輯，可單元測試）
 * ------------------------------------------------------------
 * 打倒最終首領後開放。每週一換一隻主線首領＋2 個強化詞綴（同一週大家都一樣，用 towerRng 固定種子），
 * 在試煉塔的競技場單挑，限時 WEEKLY.time 秒。三種難度各有每週第一次打倒的獎勵：
 * 鑽石＋★神話裝（神話難度 2 件史詩）。最快時間每週記錄。
 * 首領強度：Mythic.mythicMods(首領, 難度的 floor)——跟神話難度同一套換算，不自動調整。
 */
export type WeeklyDiff = 'trial' | 'hero' | 'myth';

export interface WeeklyDiffDef {
  id: WeeklyDiff;
  name: string;
  icon: string;
  /** 換算用的神話層數（等級 = 110 + floor） */
  floor: number;
  gems: number;
  /** ★神話裝件數與稀有度 */
  gear: number;
  rarity: 'rare' | 'epic';
  /** 首領生命倍率（試煉難度給剛破關的玩家，打薄一點） */
  hp: number;
}

export const WEEKLY = {
  /** 限時（秒） */
  time: 180,
  /** 每週幾個詞綴 */
  affixes: 2,
  /** 可以抽的詞綴（只對首領有意義、不需要小怪的） */
  pool: ['frenzy', 'tough', 'might', 'armored', 'regen'] as AffixId[],
  /** 首領再生（每秒最大生命比例；詞綴「再生」的首領版） */
  bossRegen: 0.0025,
  /** 種子用的層數偏移（跟試煉塔的層數錯開） */
  seed: 9001,
};

export const WEEKLY_DIFFS: WeeklyDiffDef[] = [
  { id: 'trial', name: '試煉', icon: '🥉', floor: 1, gems: 20, gear: 1, rarity: 'rare', hp: 0.75 },
  { id: 'hero', name: '英雄', icon: '🥈', floor: 12, gems: 35, gear: 1, rarity: 'epic', hp: 1 },
  { id: 'myth', name: '神話', icon: '🥇', floor: 24, gems: 60, gear: 2, rarity: 'epic', hp: 1 },
];
export const WEEKLY_DIFF_MAP = Object.fromEntries(WEEKLY_DIFFS.map((d) => [d.id, d])) as Record<WeeklyDiff, WeeklyDiffDef>;

export interface WeeklyState {
  week: string;
  /** 本週各難度最快秒數（沒打過 = 沒有） */
  best: Partial<Record<WeeklyDiff, number>>;
  /** 本週已領過第一次獎勵的難度 */
  claimed: WeeklyDiff[];
  /** 歷史打倒次數（成就用） */
  wins: number;
}

export function newWeeklyState(): WeeklyState {
  return { week: weekKey(), best: {}, claimed: [], wins: 0 };
}

export function normalizeWeekly(v: unknown): WeeklyState {
  const w = newWeeklyState();
  if (!v || typeof v !== 'object') return w;
  const o = v as Partial<WeeklyState>;
  if (typeof o.week === 'string') w.week = o.week;
  if (o.best && typeof o.best === 'object') w.best = { ...o.best };
  if (Array.isArray(o.claimed)) w.claimed = o.claimed.filter((d) => d in WEEKLY_DIFF_MAP);
  w.wins = Math.max(0, Math.floor(Number(o.wins) || 0));
  return w;
}

/** 換週：清掉本週紀錄（歷史次數保留） */
export function ensureWeeklyWeek(w: WeeklyState, now = new Date()) {
  const k = weekKey(now);
  if (w.week === k) return;
  w.week = k;
  w.best = {};
  w.claimed = [];
}

/** 本週的首領與詞綴 */
export function weeklyPick(week: string): { boss: EnemyDef; zoneId: string; affixes: AffixId[] } {
  const rng = towerRng(week, WEEKLY.seed);
  const bosses = DUNGEON_ORDER.map((id) => ({ id, boss: (ZONES[id].spawns ?? []).map((s) => ENEMIES[s.enemy]).find((e) => e?.boss) })).filter((x) => !!x.boss) as { id: string; boss: EnemyDef }[];
  const pick = bosses[Math.floor(rng() * bosses.length)];
  const left = [...WEEKLY.pool];
  const affixes: AffixId[] = [];
  while (affixes.length < WEEKLY.affixes && left.length) affixes.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  return { boss: pick.boss, zoneId: pick.id, affixes };
}

/** 詞綴換成倍率 */
export function weeklyAffixMods(affixes: AffixId[]): { hp: number; atk: number; def: number; haste: number; regen: number } {
  const m = { hp: 1, atk: 1, def: 1, haste: 1, regen: 0 };
  for (const id of affixes) {
    const a = TOWER_AFFIXES[id];
    if (a.hp) m.hp *= a.hp;
    if (a.atk) m.atk *= a.atk;
    if (a.def) m.def *= a.def;
    if (a.haste) m.haste *= a.haste;
    if (a.regen) m.regen = WEEKLY.bossRegen;
  }
  return m;
}

/** 打倒：記錄時間；回傳這次要不要發第一次獎勵、是不是新紀錄 */
export function recordWeeklyWin(w: WeeklyState, diff: WeeklyDiff, secs: number, now = new Date()): { first: boolean; newBest: boolean } {
  ensureWeeklyWeek(w, now);
  const prev = w.best[diff];
  const newBest = prev === undefined || secs < prev;
  if (newBest) w.best[diff] = secs;
  const first = !w.claimed.includes(diff);
  if (first) w.claimed.push(diff);
  w.wins++;
  return { first, newBest };
}

/** 距離下週一 00:00 還有幾小時 */
export function hoursToReset(now = new Date()): number {
  const x = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() + (7 - dow));
  return Math.max(0, Math.ceil((x.getTime() - now.getTime()) / 3600000));
}
