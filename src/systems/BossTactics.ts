import type { BossSkillDef } from '@/data/bossSkills';

/**
 * 首領應變（v1.58，純邏輯，可單元測試；BossController 套用）
 * ------------------------------------------------------------
 * 1. 仇恨：首領記住最近 5 秒誰打得最痛。召喚物 / 守護者夥伴的傷害超過玩家的 1.3 倍，
 *    首領會轉頭追打牠 4 秒（招式也瞄準牠），之後 6 秒內不會再被拉走——夥伴扛不了一整場。
 * 2. 看場面放招：身邊（7 公尺內）有 2 隻以上召喚物 → 優先放以自己為中心的範圍招；
 *    玩家拉開距離 → 優先放打得到遠處的招（原本就有）；玩家血少 → 優先放最重的一招。
 * 3. 三階段：血量 70% 進入第二階段、35% 進入最終階段，各怒吼一次、馬上出招；
 *    最終階段冷卻再縮短、預警再快一點。（50% 的狂暴照舊：招式範圍 / 數量加強）
 * 4. 學習閃躲：玩家連續躲過首領的招式，首領的預警（前搖）會越來越短（每次 −6%，最多 −30%），
 *    連躲 4 次以上還會接一個連續技；被打中後慢慢恢復。
 */
export const TACTICS = {
  /** 仇恨衰減時間常數（秒） */
  threatDecay: 5,
  /** 召喚物傷害 > 玩家 × 這個倍率才轉頭 */
  threatRatio: 1.3,
  /** 轉頭追打召喚物多久、之後多久不再被拉走 */
  threatTime: 4,
  threatCooldown: 6,
  /** 幾公尺內的召喚物算「圍著首領」 */
  crowdRange: 7,
  crowdCount: 2,
  /** 玩家血量低於多少時首領加壓 */
  pressureHp: 0.35,
  /** 階段門檻 */
  phase2: 0.7,
  phase3: 0.35,
  /** 最終階段冷卻、預警倍率 */
  phase3Cd: 0.85,
  phase3Windup: 0.92,
  /** 每連躲一次預警縮短多少、最多縮短多少 */
  dodgeStep: 0.06,
  dodgeMax: 0.3,
  /** 連躲幾次後接連續技 */
  chainAt: 4,
  /** 被打中時連躲次數扣多少 */
  hitForgive: 2,
};

/** 以自己為中心的範圍招（被召喚物圍住時優先） */
export const AREA_PATTERNS = new Set<BossSkillDef['pattern']>(['nova', 'spokes']);

/** 階段：1（> 70%）、2（≤ 70%）、3（≤ 35%） */
export function phaseOf(hpFrac: number): 1 | 2 | 3 {
  if (hpFrac <= TACTICS.phase3) return 3;
  if (hpFrac <= TACTICS.phase2) return 2;
  return 1;
}

/** 連躲次數 → 預警倍率（1 = 原本，最低 1 − dodgeMax） */
export function dodgeWindupMul(streak: number): number {
  return Math.max(1 - TACTICS.dodgeMax, 1 - TACTICS.dodgeStep * Math.max(0, streak));
}

/** 上一招的結果更新連躲次數：被打中扣 hitForgive、沒打中 +1（招式不是瞄準玩家的不算） */
export function nextDodgeStreak(streak: number, targetedPlayer: boolean, hitPlayer: boolean): number {
  if (!targetedPlayer) return streak;
  return hitPlayer ? Math.max(0, streak - TACTICS.hitForgive) : streak + 1;
}

/**
 * 仇恨：回傳要轉頭追打的召喚物（沒有就 null）。
 * entries = [召喚物, 最近傷害]；alive 判斷由呼叫端過濾。
 */
export function threatTarget<T>(playerThreat: number, entries: [T, number][], minAmount = 1): T | null {
  let best: T | null = null;
  let bestV = 0;
  for (const [m, v] of entries) {
    if (v > bestV) {
      best = m;
      bestV = v;
    }
  }
  if (!best || bestV < minAmount) return null;
  return bestV > playerThreat * TACTICS.threatRatio ? best : null;
}

export interface PickContext {
  /** 玩家在普攻距離外（風箏中） */
  far: boolean;
  /** 首領身邊的召喚物數量 */
  crowd: number;
  /** 玩家血量比例 */
  playerHp: number;
}

/**
 * 依場面挑招：從輪替順序（next 開始）往後找第一個符合條件的招式，回傳要跳過幾個（0 = 照順序）。
 * 優先序：風箏 → 遠程招；被圍 → 範圍招；玩家血少 → 最重的一招。
 */
export function pickOffset(skills: { pattern: BossSkillDef['pattern']; power: number }[], next: number, ctx: PickContext, reaching: Set<BossSkillDef['pattern']>): number {
  const n = skills.length;
  const at = (i: number) => skills[(next + i) % n];
  const findFirst = (ok: (s: { pattern: BossSkillDef['pattern']; power: number }) => boolean) => {
    for (let i = 0; i < n; i++) if (ok(at(i))) return i;
    return -1;
  };
  if (ctx.far) {
    const i = findFirst((s) => reaching.has(s.pattern));
    if (i >= 0) return i;
  }
  if (ctx.crowd >= TACTICS.crowdCount) {
    const i = findFirst((s) => AREA_PATTERNS.has(s.pattern));
    if (i >= 0) return i;
  }
  if (ctx.playerHp < TACTICS.pressureHp) {
    let best = 0;
    for (let i = 1; i < n; i++) if (at(i).power > at(best).power) best = i;
    return best;
  }
  return 0;
}
