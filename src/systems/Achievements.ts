import type { GameState } from '@/core/GameState';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, type AchievementDef } from '@/data/achievements';

/** 成就存檔（v1.64，存檔 v14）：已領取、已通知過（避免重複跳提示） */
export interface AchievementState {
  claimed: string[];
  seen: string[];
}

export function newAchievementState(): AchievementState {
  return { claimed: [], seen: [] };
}

export function isDone(s: GameState, a: AchievementDef): boolean {
  const [cur, target] = a.progress(s);
  return cur >= target;
}

/** 達成但還沒領的數量（選單紅點） */
export function claimableAchievements(s: GameState): number {
  const claimed = new Set(s.achievements.claimed);
  let n = 0;
  for (const a of ACHIEVEMENTS) if (!claimed.has(a.id) && isDone(s, a)) n++;
  return n;
}

/** 新達成（還沒通知過）的成就；會把它們記到 seen */
export function newlyDone(s: GameState): AchievementDef[] {
  const seen = new Set(s.achievements.seen);
  const out: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (seen.has(a.id) || !isDone(s, a)) continue;
    s.achievements.seen.push(a.id);
    out.push(a);
  }
  return out;
}

/** 領取；成功回傳獎勵鑽石數，不能領回傳 0 */
export function claimAchievement(s: GameState, id: string): number {
  const a = ACHIEVEMENT_BY_ID.get(id);
  if (!a || s.achievements.claimed.includes(id) || !isDone(s, a)) return 0;
  s.achievements.claimed.push(id);
  s.gems += a.gems;
  return a.gems;
}

/** 一次領完全部；回傳 [領了幾個, 共幾顆鑽石] */
export function claimAllAchievements(s: GameState): [number, number] {
  let n = 0;
  let gems = 0;
  for (const a of ACHIEVEMENTS) {
    const g = claimAchievement(s, a.id);
    if (g) {
      n++;
      gems += g;
    }
  }
  return [n, gems];
}
