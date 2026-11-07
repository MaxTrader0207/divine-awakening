import { describe, expect, it } from 'vitest';
import { DIVINITY, DIV_STATS, addDivExp, allocPoint, applyDivinity, divExpToNext, freePoints, newDivinityState, normalizeDivinity, resetAlloc } from './Divinity';

describe('神格等級', () => {
  it('經驗累積升級，多出來的經驗保留', () => {
    const d = newDivinityState();
    expect(addDivExp(d, divExpToNext(0) - 1)).toBe(0);
    expect(addDivExp(d, 1 + divExpToNext(1) + 5)).toBe(2);
    expect(d.lv).toBe(2);
    expect(d.exp).toBe(5);
    expect(divExpToNext(10)).toBeGreaterThan(divExpToNext(0));
    expect(divExpToNext(0)).toBe(DIVINITY.base);
  });

  it('投點：要有點數、不能超過上限', () => {
    const d = newDivinityState();
    expect(allocPoint(d, 'atk')).not.toBeNull();
    d.lv = 60;
    for (let i = 0; i < 55; i++) allocPoint(d, 'atk');
    expect(d.alloc.atk).toBe(DIV_STATS.find((s) => s.id === 'atk')!.cap);
    expect(freePoints(d)).toBe(10);
    resetAlloc(d);
    expect(freePoints(d)).toBe(60);
  });

  it('加成：攻擊乘法、爆擊率加法', () => {
    const d = newDivinityState();
    d.lv = 20;
    for (let i = 0; i < 10; i++) allocPoint(d, 'atk');
    for (let i = 0; i < 10; i++) allocPoint(d, 'critRate');
    const st = { atk: 100, maxHp: 1000, def: 50, critRate: 0.1, critDmg: 1.6 };
    applyDivinity(st, d);
    expect(st.atk).toBeCloseTo(110);
    expect(st.critRate).toBeCloseTo(0.14);
    expect(st.maxHp).toBe(1000);
  });

  it('讀檔整理：壞資料、點數比等級多', () => {
    expect(normalizeDivinity(null).lv).toBe(0);
    const d = normalizeDivinity({ lv: 3, exp: 10, alloc: { atk: 5, def: 999 } });
    expect(d.lv).toBe(3);
    expect(d.alloc.def).toBeLessThanOrEqual(3);
    expect(freePoints(d)).toBe(0);
  });
});
