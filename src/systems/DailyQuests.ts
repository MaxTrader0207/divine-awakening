import type { Rarity, ZoneId } from '@/data/types';

/**
 * 每日任務（純邏輯，可單元測試）
 * ------------------------------------------------------------
 * - 每天（玩家當地日期）依「日期 + 等級區間」固定產生 3 個任務，同一天重新整理不會換。
 * - 進度由遊戲事件推進：擊倒、首領、強化、撿到稀有裝備、喝藥、賺金幣。
 * - 每個任務完成後到選單「任務」領獎；三個都領完再領一個獎勵寶箱。
 */
export type QuestKind = 'kill' | 'kill_zone' | 'boss' | 'enhance' | 'loot_rare' | 'potion' | 'gold';

export interface Quest {
  kind: QuestKind;
  target: number;
  progress: number;
  claimed: boolean;
  zone?: ZoneId;
  reward: { gold: number; gems: number };
}

export interface DailyState {
  date: string;
  quests: Quest[];
  bonusClaimed: boolean;
}

export const ZONE_NAMES: Partial<Record<ZoneId, string>> = {
  grassland: '新手草原',
  dungeon_1: '海岸古道',
  dungeon_2: '珊瑚洞窟',
  dungeon_3: '熔心火山口',
  mistwood: '迷霧森林',
};

export function questText(q: Quest): string {
  switch (q.kind) {
    case 'kill':
      return `擊倒 ${q.target} 隻怪物`;
    case 'kill_zone':
      return `在${ZONE_NAMES[q.zone!] ?? ''}擊倒 ${q.target} 隻怪物`;
    case 'boss':
      return `擊敗任一首領 ${q.target} 次`;
    case 'enhance':
      return `強化裝備 ${q.target} 次（成功或失敗都算）`;
    case 'loot_rare':
      return `取得稀有以上的裝備 ${q.target} 件`;
    case 'potion':
      return `使用藥水 ${q.target} 次`;
    case 'gold':
      return `從怪物身上獲得 ${q.target} 金幣`;
  }
}

/** 玩家當地日期 YYYY-MM-DD */
export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 依日期字串產生固定的亂數（同一天結果相同） */
function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  let s = (h >>> 0) || 1;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
}

/** 目前等級適合打的區域（給「在某區擊倒」任務用） */
export function zonesForLevel(level: number, bossesDefeated: ZoneId[]): ZoneId[] {
  const out: ZoneId[] = [];
  if (level <= 8) out.push('grassland', 'dungeon_1');
  if (level >= 5 && level <= 13 && bossesDefeated.includes('dungeon_1')) out.push('dungeon_2');
  if (level >= 10 && level <= 18 && bossesDefeated.includes('dungeon_2')) out.push('dungeon_3');
  if (level >= 11) out.push('mistwood');
  return out.length ? out : ['grassland'];
}

export function generateDaily(date: string, level: number, bossesDefeated: ZoneId[]): DailyState {
  const rnd = seeded(`${date}|${Math.floor(level / 5)}`);
  const goldScale = 40 + level * 25;
  const pool: (() => Quest)[] = [
    () => ({ kind: 'kill', target: 30 + Math.floor(level / 5) * 10, progress: 0, claimed: false, reward: { gold: goldScale * 3, gems: 1 } }),
    () => {
      const zones = zonesForLevel(level, bossesDefeated);
      const zone = zones[Math.floor(rnd() * zones.length)];
      return { kind: 'kill_zone', zone, target: 25, progress: 0, claimed: false, reward: { gold: goldScale * 3, gems: 2 } };
    },
    () => ({ kind: 'boss', target: 1, progress: 0, claimed: false, reward: { gold: goldScale * 4, gems: 3 } }),
    () => ({ kind: 'enhance', target: 3, progress: 0, claimed: false, reward: { gold: goldScale * 2, gems: 2 } }),
    () => ({ kind: 'loot_rare', target: 1, progress: 0, claimed: false, reward: { gold: goldScale * 2, gems: 2 } }),
    () => ({ kind: 'potion', target: 5, progress: 0, claimed: false, reward: { gold: goldScale * 2, gems: 1 } }),
    () => ({ kind: 'gold', target: 200 + level * 60, progress: 0, claimed: false, reward: { gold: goldScale * 2, gems: 1 } }),
  ];
  // 洗牌後取 3 個，第一個固定是擊倒類（每天都有能穩定完成的任務）
  const idx = pool.map((_, i) => i).slice(2);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const first = rnd() < 0.5 ? 0 : 1;
  const quests = [pool[first](), pool[idx[0]](), pool[idx[1]]()];
  return { date, quests, bonusClaimed: false };
}

/** 確保是今天的任務；跨日就重新產生。回傳是否重置 */
export function ensureToday(state: { daily?: DailyState; level: number; bossesDefeated: ZoneId[] }, today = localDate()): boolean {
  if (state.daily && state.daily.date === today) return false;
  state.daily = generateDaily(today, state.level, state.bossesDefeated);
  return true;
}

export type QuestEvent =
  | { type: 'kill'; zone: ZoneId }
  | { type: 'boss' }
  | { type: 'enhance' }
  | { type: 'loot'; rarity: Rarity }
  | { type: 'potion' }
  | { type: 'gold'; amount: number };

/** 推進進度；回傳這次「剛完成」的任務（用來顯示提示） */
export function progressQuests(daily: DailyState, ev: QuestEvent): Quest[] {
  const done: Quest[] = [];
  for (const q of daily.quests) {
    if (q.progress >= q.target) continue;
    let add = 0;
    if (ev.type === 'kill' && (q.kind === 'kill' || (q.kind === 'kill_zone' && q.zone === ev.zone))) add = 1;
    else if (ev.type === 'boss' && q.kind === 'boss') add = 1;
    else if (ev.type === 'enhance' && q.kind === 'enhance') add = 1;
    else if (ev.type === 'loot' && q.kind === 'loot_rare' && (ev.rarity === 'rare' || ev.rarity === 'epic')) add = 1;
    else if (ev.type === 'potion' && q.kind === 'potion') add = 1;
    else if (ev.type === 'gold' && q.kind === 'gold') add = ev.amount;
    if (!add) continue;
    q.progress = Math.min(q.target, q.progress + add);
    if (q.progress >= q.target) done.push(q);
  }
  return done;
}

export function canClaim(q: Quest) {
  return q.progress >= q.target && !q.claimed;
}

export function claimableCount(daily?: DailyState): number {
  if (!daily) return 0;
  const n = daily.quests.filter(canClaim).length;
  const bonus = daily.quests.every((q) => q.claimed) && !daily.bonusClaimed ? 1 : 0;
  return n + bonus;
}

export const BONUS_GEMS = 5;
