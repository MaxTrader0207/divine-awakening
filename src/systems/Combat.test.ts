import { describe, expect, it } from 'vitest';
import { calcDamage, MIN_DAMAGE_RATIO } from './Combat';

const mage = { atk: 24, pen: 0, critRate: 0, critDmg: 1.5 };
/** 固定亂數：浮動 = 1.0、不爆擊 */
const mid = () => 0.5;

describe('calcDamage', () => {
  it('無防禦時傷害 = 攻擊 × 倍率', () => {
    expect(calcDamage(mage, 1, 0, mid).amount).toBe(24);
    expect(calcDamage(mage, 2.2, 0, mid).amount).toBe(53);
  });

  it('防禦用減法扣除', () => {
    expect(calcDamage(mage, 1, 18, mid).amount).toBe(6);
  });

  it('防禦過高時有保底傷害', () => {
    const r = calcDamage(mage, 1, 40, mid);
    expect(r.amount).toBe(Math.round(24 * MIN_DAMAGE_RATIO));
    expect(r.blocked).toBeCloseTo(24 * (1 - MIN_DAMAGE_RATIO));
  });

  it('穿透降低有效防禦', () => {
    const noPen = calcDamage(mage, 1, 18, mid).amount;
    const halfPen = calcDamage({ ...mage, pen: 0.5 }, 1, 18, mid).amount;
    const fullPen = calcDamage({ ...mage, pen: 1 }, 1, 18, mid).amount;
    expect(halfPen).toBe(15);
    expect(fullPen).toBe(24);
    expect(noPen).toBeLessThan(halfPen);
  });

  it('穿透超過 1 視為 1', () => {
    expect(calcDamage({ ...mage, pen: 3 }, 1, 40, mid).amount).toBe(24);
  });

  it('爆擊乘上爆擊傷害', () => {
    const seq = [0.5, 0]; // 浮動 1.0、爆擊判定 0 < critRate
    const rng = () => seq.shift() ?? 0.5;
    const r = calcDamage({ ...mage, critRate: 0.2 }, 1, 0, rng);
    expect(r.crit).toBe(true);
    expect(r.amount).toBe(36);
  });

  it('浮動範圍在 ±10%', () => {
    expect(calcDamage(mage, 1, 0, () => 0).amount).toBe(22); // 浮動 0.9；critRate=0 所以不會爆擊
    expect(calcDamage(mage, 1, 0, () => 0.9999).amount).toBe(26);
  });

  it('至少 1 點傷害', () => {
    expect(calcDamage({ ...mage, atk: 0 }, 1, 100, mid).amount).toBe(1);
  });
});
