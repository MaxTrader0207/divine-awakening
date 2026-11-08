import { describe, expect, it } from 'vitest';
import { REVIVE, freeLeft, newReviveState, normalizeRevive, payRevive, reviveCost } from './Revive';

describe('倒下後的復活', () => {
  it('每天第一次免費，之後花鑽石、越來越貴、有上限', () => {
    const r = newReviveState();
    const w = { gems: 100 };
    const day = '2026-11-08';
    expect(reviveCost(r, 0, day)).toBe(0);
    expect(payRevive(r, w, 0, day)).toBe(true);
    expect(w.gems).toBe(100);
    expect(freeLeft(r, day)).toBe(0);
    expect(reviveCost(r, 1, day)).toBe(REVIVE.gemBase + REVIVE.gemStep);
    expect(payRevive(r, w, 1, day)).toBe(true);
    expect(w.gems).toBe(100 - (REVIVE.gemBase + REVIVE.gemStep));
    expect(reviveCost(r, 99, day)).toBe(REVIVE.gemMax);
    // 隔天又有免費
    expect(reviveCost(r, 3, '2026-11-09')).toBe(0);
  });
  it('鑽石不夠不能復活、讀檔整理', () => {
    const r = newReviveState();
    r.freeDate = '2026-11-08';
    r.freeUsed = 1;
    const w = { gems: 2 };
    expect(payRevive(r, w, 0, '2026-11-08')).toBe(false);
    expect(w.gems).toBe(2);
    expect(normalizeRevive({ freeDate: 'x', freeUsed: '3' }).freeUsed).toBe(3);
    expect(normalizeRevive(null).freeUsed).toBe(0);
  });
});
