import { describe, expect, it } from 'vitest';
import { inCone } from './Damage';
import type { Enemy } from '@/entities/Enemy';

const at = (x: number, z: number, radius = 0.5) => ({ pos: { x, z }, radius }) as unknown as Enemy;

describe('近戰扇形判定（騎士）', () => {
  // 面向 +z，半徑 2.7，總角度 120°
  const hit = (e: Enemy) => inCone(e, 0, 0, 0, 1, 2.7, 2.1);
  it('正前方、範圍內命中', () => expect(hit(at(0, 2))).toBe(true));
  it('側前方 50° 命中、側面 90° 不中', () => {
    expect(hit(at(Math.sin(0.87) * 2, Math.cos(0.87) * 2))).toBe(true);
    expect(hit(at(2, 0))).toBe(false);
  });
  it('背後不中，但貼身一律命中', () => {
    expect(hit(at(0, -2))).toBe(false);
    expect(hit(at(0, -0.8))).toBe(true);
  });
  it('大型首領：距離算到體型邊緣', () => {
    expect(hit(at(0, 4.5, 2))).toBe(true);
    expect(hit(at(0, 4.5, 0.5))).toBe(false);
  });
});
