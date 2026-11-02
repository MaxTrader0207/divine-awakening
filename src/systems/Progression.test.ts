import { describe, expect, it } from 'vitest';
import { addExp, expForKill, rollGold } from './Progression';
import { expToNext } from '@/data/player';

describe('Progression', () => {
  it('經驗足夠時升級並保留餘數', () => {
    const need = expToNext(1);
    const r = addExp(1, 0, need + 5);
    expect(r).toEqual({ level: 2, exp: 5, levelsGained: 1 });
  });

  it('一次升多級', () => {
    const r = addExp(1, 0, expToNext(1) + expToNext(2) + expToNext(3));
    expect(r.level).toBe(4);
    expect(r.levelsGained).toBe(3);
  });

  it('等級差修正', () => {
    expect(expForKill(100, 5, 5)).toBe(100);
    expect(expForKill(100, 10, 5)).toBe(40);
    expect(expForKill(100, 13, 5)).toBe(10);
    expect(expForKill(100, 2, 5)).toBe(120);
  });

  it('金幣在範圍內', () => {
    expect(rollGold([3, 6], () => 0)).toBe(3);
    expect(rollGold([3, 6], () => 0.9999)).toBe(6);
  });
});
