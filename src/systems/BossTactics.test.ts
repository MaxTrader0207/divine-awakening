import { describe, expect, it } from 'vitest';
import { AREA_PATTERNS, TACTICS, dodgeWindupMul, nextDodgeStreak, phaseOf, pickOffset, threatTarget } from './BossTactics';
import { elementMul, counterOf, ELEMENT_STRONG_MUL, ELEMENT_WEAK_MUL, STRONG, type Element } from '@/data/elements';

describe('首領應變', () => {
  it('階段：70% / 35%', () => {
    expect(phaseOf(1)).toBe(1);
    expect(phaseOf(0.71)).toBe(1);
    expect(phaseOf(0.7)).toBe(2);
    expect(phaseOf(0.36)).toBe(2);
    expect(phaseOf(0.35)).toBe(3);
  });

  it('學習閃躲：預警逐次縮短、有下限', () => {
    expect(dodgeWindupMul(0)).toBe(1);
    expect(dodgeWindupMul(2)).toBeCloseTo(1 - TACTICS.dodgeStep * 2);
    expect(dodgeWindupMul(99)).toBeCloseTo(1 - TACTICS.dodgeMax);
    expect(nextDodgeStreak(3, true, false)).toBe(4);
    expect(nextDodgeStreak(3, true, true)).toBe(3 - TACTICS.hitForgive);
    expect(nextDodgeStreak(1, true, true)).toBe(0);
    // 瞄準召喚物的招式不算
    expect(nextDodgeStreak(3, false, false)).toBe(3);
  });

  it('仇恨：召喚物要明顯比玩家痛才轉頭', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    expect(threatTarget(100, [[a, 120]])).toBeNull();
    expect(threatTarget(100, [[a, 140], [b, 90]])).toBe(a);
    expect(threatTarget(0, [[a, 0.5]])).toBeNull();
    expect(threatTarget(0, [])).toBeNull();
  });

  it('看場面挑招', () => {
    const skills = [
      { pattern: 'cone' as const, power: 1.2 },
      { pattern: 'nova' as const, power: 1.0 },
      { pattern: 'leap' as const, power: 1.6 },
    ];
    const reach = new Set(['leap' as const, 'dash' as const]);
    const base = { far: false, crowd: 0, playerHp: 1 };
    expect(pickOffset(skills, 0, base, reach)).toBe(0);
    expect(pickOffset(skills, 0, { ...base, far: true }, reach)).toBe(2);
    expect(pickOffset(skills, 0, { ...base, crowd: TACTICS.crowdCount }, reach)).toBe(1);
    expect(AREA_PATTERNS.has(skills[1].pattern)).toBe(true);
    expect(pickOffset(skills, 0, { ...base, playerHp: 0.2 }, reach)).toBe(2);
    // 從輪替中間開始也找得到
    expect(pickOffset(skills, 2, { ...base, crowd: 3 }, reach)).toBe(2);
  });
});

describe('屬性相剋', () => {
  it('每種屬性剛好剋 1 種、被 1 種剋', () => {
    const all = Object.keys(STRONG) as Element[];
    expect(all.length).toBe(10);
    for (const e of all) {
      expect(STRONG[e]).not.toBe(e);
      expect(all.filter((k) => STRONG[k] === e).length).toBe(1);
      expect(STRONG[counterOf(e)]).toBe(e);
    }
  });
  it('倍率', () => {
    expect(elementMul('thunder', 'water')).toBe(ELEMENT_STRONG_MUL);
    expect(elementMul('thunder', 'earth')).toBe(ELEMENT_WEAK_MUL);
    expect(elementMul('thunder', 'fire')).toBe(1);
    expect(elementMul(undefined, 'fire')).toBe(1);
  });
});
