import { describe, expect, it } from 'vitest';
import { CLASSES } from './classes';
import { MINIONS } from './minions';

describe('召喚師與召喚物資料', () => {
  it('召喚技能都指向存在的召喚物，召喚數量不超過上限', () => {
    const summons = CLASSES.summoner.skills.filter((s) => s.summon);
    expect(summons.length).toBe(3);
    for (const s of summons) {
      const def = MINIONS[s.summon as keyof typeof MINIONS];
      expect(def, s.id).toBeTruthy();
      expect(s.count ?? 1).toBeLessThanOrEqual(def.max);
    }
  });

  it('巨衛是坦克（血最多、防禦最高、會嘲諷），骷髏法師是遠程', () => {
    const { skeleton_warrior: w, skeleton_minion: m, skeleton_mage: mage } = MINIONS;
    expect(w.hpMul).toBeGreaterThan(m.hpMul);
    expect(w.defMul).toBeGreaterThan(m.defMul);
    expect(w.taunt).toBe('always');
    expect(mage.ranged).toBe(true);
    expect(mage.range).toBeGreaterThan(4);
  });
});
