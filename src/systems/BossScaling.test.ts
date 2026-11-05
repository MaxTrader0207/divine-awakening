import { describe, expect, it } from 'vitest';
import { BOSS_PACE, BossScaler, bossAtkMul, bossInitialHpMul, expectedHit } from './BossScaling';

/** 用固定秒傷打首領，回傳打倒花的秒數 */
function fight(baseHp: number, dps: number, maxT = 900) {
  const e = { hp: baseHp, maxHp: baseHp };
  const s = new BossScaler(baseHp);
  const dt = 0.1;
  for (let t = 0; t < maxT; t += dt) {
    e.hp -= s.clamp(e, dps * dt);
    s.update(dt, e);
    if (e.hp <= 0) return { secs: s.t, scale: e.maxHp / baseHp, absorbed: s.absorbed };
  }
  return { secs: Infinity, scale: e.maxHp / baseHp, absorbed: s.absorbed };
}

describe('首領強度自動調整', () => {
  it('輸出很高（原本 20 秒就打完）也會拉到 180 秒左右，而且不會低於 150 秒', () => {
    const r = fight(100000, 5000);
    expect(r.secs).toBeGreaterThanOrEqual(BOSS_PACE.min);
    expect(r.secs).toBeGreaterThan(165);
    expect(r.secs).toBeLessThan(200);
    expect(r.scale).toBeGreaterThan(5);
  });
  it('剛好的輸出（原本 180 秒）幾乎不調整', () => {
    const r = fight(180000, 1000);
    expect(r.secs).toBeGreaterThan(170);
    expect(r.secs).toBeLessThan(195);
    expect(r.scale).toBeGreaterThan(0.9);
    expect(r.scale).toBeLessThan(1.15);
  });
  it('輸出太低（原本 400 秒）會把血量往下調，但最多降到 50%', () => {
    const r = fight(400000, 1000);
    expect(r.scale).toBeGreaterThanOrEqual(BOSS_PACE.minMul - 1e-6);
    expect(r.secs).toBeLessThan(300);
  });
  it('一次爆發：開場 4% 以外的傷害被擋下', () => {
    const e = { hp: 100000, maxHp: 100000 };
    const s = new BossScaler(100000);
    const dealt = s.clamp(e, 50000);
    expect(dealt).toBeCloseTo(4000, 0);
    expect(s.absorbed).toBeCloseTo(46000, 0);
  });
  it('攻擊力：玩家比標準配備強才提高（加成取一半），弱的時候不降，上限 ×2（全部再 ×0.85）', () => {
    const B = BOSS_PACE.atkBase;
    expect(bossAtkMul(500, { maxHp: 3000, def: 50 }, { maxHp: 3000, def: 50 })).toBeCloseTo(B, 5);
    expect(bossAtkMul(500, { maxHp: 1500, def: 20 }, { maxHp: 3000, def: 50 })).toBe(B);
    const m = bossAtkMul(500, { maxHp: 6000, def: 100 }, { maxHp: 3000, def: 50 });
    const full = (((500 - 50) / 3000) * 6000 + 100) / 500; // 完全追上標準配備需要的倍率
    expect(m).toBeCloseTo((1 + (full - 1) * BOSS_PACE.atkSoft) * B, 5);
    expect(bossAtkMul(500, { maxHp: 1e6, def: 9999 }, { maxHp: 3000, def: 50 })).toBeCloseTo(BOSS_PACE.atkMax * B, 5);
  });
  it('開戰生命預估：比標準強才放大，跟每下期望傷害成正比（略保守）', () => {
    const ref = { atk: 300, pen: 0.1, critRate: 0.15, critDmg: 1.8 };
    expect(bossInitialHpMul(ref, ref, 100)).toBeCloseTo(1, 5);
    expect(bossInitialHpMul({ ...ref, atk: 150 }, ref, 100)).toBe(1);
    const r = expectedHit({ ...ref, atk: 1200 }, 100) / expectedHit(ref, 100);
    expect(bossInitialHpMul({ ...ref, atk: 1200 }, ref, 100)).toBeCloseTo(Math.pow(r, BOSS_PACE.initPow), 5);
  });
});
