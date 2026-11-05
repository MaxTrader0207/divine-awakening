import { describe, expect, it } from 'vitest';
import { contains, escapeDir } from './Telegraphs';

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

describe('閃招方向（v1.61）', () => {
  it('圓形：往外閃，但往場地中央偏（最多 45°）', () => {
    const d = escapeDir({ kind: 'circle', x: 0, z: 0, r: 3 }, 1, 0, { x: 0, z: 20 });
    expect(d.x).toBeGreaterThan(0.6); // 仍然往外
    expect(d.z).toBeGreaterThan(0.6); // 偏向中央
    const plain = escapeDir({ kind: 'circle', x: 0, z: 0, r: 3 }, 1, 0);
    expect(plain.x).toBeCloseTo(1);
  });
  it('長方形：站在中線附近時選場地中央那一側', () => {
    const rect = { kind: 'rect' as const, x: 0, z: 0, dir: 0, length: 10, width: 3 };
    expect(escapeDir(rect, 0.3, 4, { x: -10, z: 4 }).x).toBeLessThan(0);
    expect(escapeDir(rect, 0.3, 4).x).toBeGreaterThan(0);
    // 已經偏一側很多：照原本那側（最快出去）
    expect(escapeDir(rect, 1.4, 4, { x: -10, z: 4 }).x).toBeGreaterThan(0);
  });
});
