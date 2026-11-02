import { describe, expect, it } from 'vitest';
import { contains } from './Telegraphs';

describe('Telegraph contains', () => {
  it('circle', () => {
    const s = { kind: 'circle' as const, x: 0, z: 0, r: 3 };
    expect(contains(s, 2, 2)).toBe(true);
    expect(contains(s, 3, 3)).toBe(false);
  });
  it('cone 朝 +z 的 90 度扇形', () => {
    const s = { kind: 'cone' as const, x: 0, z: 0, dir: 0, angle: Math.PI / 2, r: 5 };
    expect(contains(s, 0, 4)).toBe(true);
    expect(contains(s, 0, -4)).toBe(false);
    expect(contains(s, 4, 0.5)).toBe(false);
    expect(contains(s, 2, 3)).toBe(true);
  });
  it('rect 朝 +x 長 10 寬 2', () => {
    const s = { kind: 'rect' as const, x: 0, z: 0, dir: Math.PI / 2, length: 10, width: 2 };
    expect(contains(s, 5, 0)).toBe(true);
    expect(contains(s, 5, 1.5)).toBe(false);
    expect(contains(s, -1, 0)).toBe(false);
    expect(contains(s, 11, 0)).toBe(false);
  });
});
