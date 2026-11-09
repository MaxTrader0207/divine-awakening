/**
 * 傷害計算（純函式，不碰 Three.js、不碰 DOM，方便單元測試）
 * ------------------------------------------------------------
 *   原始傷害 raw   = 攻擊 × 技能倍率
 *   有效防禦 eDef  = 防禦 × (1 − 穿透)
 *   減防後         = raw − eDef
 *   保底           = raw × MIN_DAMAGE_RATIO（防禦再高也至少打出這麼多）
 *   基礎傷害       = max(保底, 減防後)
 *   最終傷害       = 基礎 × 浮動(0.9~1.1) × (爆擊 ? 爆擊傷害 : 1)，四捨五入，至少 1
 *
 * 防禦是「減法」而非百分比：高防敵人會讓低攻擊的普攻幾乎無效，
 * 因此副本 2、3 層（防禦 18 / 40）必須靠升級、裝備與「穿透」突破。
 */

export const MIN_DAMAGE_RATIO = 0.1;
export const VARIANCE = 0.1;

export interface AttackerStats {
  atk: number;
  pen: number;
  critRate: number;
  critDmg: number;
}

export interface DamageResult {
  amount: number;
  crit: boolean;
  /** 被防禦擋掉的量（除錯與 UI 用） */
  blocked: number;
}

export type Rng = () => number;

/**
 * v1.105 敵人防禦的實際比例：以前穿透很容易堆到 90%，防禦幾乎沒作用、關卡數值是照那樣調的；
 * 穿透改成不吃強化、上限 50% 後，敵人防禦整體 × 0.5，讓一般玩家的傷害大致維持原本的水準。
 */
export const ENEMY_DEF_SCALE = 0.5;

export function calcDamage(attacker: AttackerStats, power: number, targetDef: number, rng: Rng = Math.random): DamageResult {
  const raw = attacker.atk * power;
  const pen = clamp(attacker.pen, 0, 1);
  const effectiveDef = Math.max(0, targetDef) * (1 - pen);
  const floor = raw * MIN_DAMAGE_RATIO;
  const base = Math.max(floor, raw - effectiveDef);
  const variance = 1 - VARIANCE + rng() * VARIANCE * 2;
  const crit = rng() < attacker.critRate;
  const amount = Math.max(1, Math.round(base * variance * (crit ? attacker.critDmg : 1)));
  return { amount, crit, blocked: Math.max(0, raw - base) };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
