import { describe, expect, it } from 'vitest';
import { CAPTURE, COMPANION_LIST, newCompanionState, tryCapture } from './companions';
import { COMPANION_SKILLS, GROWTH, addBond, addCompExp, bondLevel, compCooldown, compDuration, compExpToNext, compStatMul, growthOf, newGrowth, skillInterval, skillUnlocked } from './companionGrowth';
import { newGameState } from '@/core/GameState';
import { migrate } from '@/core/SaveSystem';

describe('夥伴養成', () => {
  it('每隻夥伴都有專屬技能', () => {
    for (const c of COMPANION_LIST) expect(COMPANION_SKILLS[c.id], c.id).toBeTruthy();
  });

  it('經驗升級、最高 Lv.30', () => {
    const g = newGrowth();
    expect(addCompExp(g, compExpToNext(1) + compExpToNext(2))).toBe(2);
    expect(g.lv).toBe(3);
    addCompExp(g, 999999);
    expect(g.lv).toBe(GROWTH.maxLv);
    expect(g.exp).toBe(0);
    expect(addCompExp(g, 100)).toBe(0);
    expect(compStatMul(g)).toBeCloseTo(1 + (GROWTH.maxLv - 1) * GROWTH.perLv);
  });

  it('好感度各階效果', () => {
    const g = newGrowth();
    expect(compCooldown(g)).toBe(CAPTURE.cooldown);
    expect(compDuration(g)).toBe(CAPTURE.duration);
    expect(skillUnlocked(g)).toBe(false);
    expect(addBond(g, GROWTH.bondTiers[0])).toBe(true);
    expect(compCooldown(g)).toBe(CAPTURE.cooldown - 5);
    addBond(g, GROWTH.bondTiers[2] - g.bond);
    expect(bondLevel(g.bond)).toBe(3);
    expect(skillUnlocked(g)).toBe(true);
    expect(compDuration(g)).toBe(CAPTURE.duration + 5);
    const before = skillInterval('pegasus', g);
    addBond(g, 999);
    expect(bondLevel(g.bond)).toBe(5);
    expect(compCooldown(g)).toBe(CAPTURE.cooldown - 10);
    expect(skillInterval('pegasus', g)).toBeLessThan(before);
    expect(compStatMul(g)).toBeCloseTo(1 + GROWTH.bond5Stat);
  });

  it('收服時建立養成資料；舊存檔遷移補上', () => {
    const st = newCompanionState();
    tryCapture(st, 'pegasus', () => 0);
    expect(growthOf(st, 'pegasus')).toEqual({ lv: 1, exp: 0, bond: 0 });
    const old = newGameState('mage') as unknown as { version: number; companions: Record<string, unknown> };
    old.version = 15;
    old.companions = { owned: ['pegasus', 'ares'], active: 'ares', attempts: {} };
    const m = migrate(old as never)!;
    expect(m.companions.growth).toEqual({ pegasus: { lv: 1, exp: 0, bond: 0 }, ares: { lv: 1, exp: 0, bond: 0 } });
  });
});
