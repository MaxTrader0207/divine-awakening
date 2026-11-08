import { describe, expect, it } from 'vitest';
import { THEMES, autoTheme, themeFor } from './mapThemes';
import { ZONES } from './zones';
import { CollisionWorld } from '@/world/Collision';
import { reachMap } from '@/world/zoneCollision';

describe('地圖主題（v1.92）', () => {
  it('每張地圖都能算出合法的主題', () => {
    for (const d of Object.values(ZONES)) {
      expect(THEMES[autoTheme(d)]).toBeDefined();
      if (d.theme === false) continue;
      const t = themeFor(d);
      expect(t.scatter.length).toBeGreaterThan(0);
      expect(t.border.colors.length).toBeGreaterThan(0);
      expect(t.light.hemi).toBeGreaterThan(0);
    }
  });

  it('覆寫只改指定的欄位，其他沿用基底主題', () => {
    const base = ZONES.dungeon_7;
    const t = themeFor({ ...base, theme: { base: 'snow', border: { colors: [0x123456] } } });
    expect(t.border.colors).toEqual([0x123456]);
    expect(t.border.kind).toBe(THEMES.snow.border.kind);
    expect(t.particles).toEqual(THEMES.snow.particles);
    expect(t.light).toEqual(THEMES.snow.light);
  });

  it('自動判斷：音樂優先（海 → 海岸、森林 → 森林、火山 → 火山或冥界）', () => {
    const mk = (music: string, groundColor: number) => autoTheme({ id: 'x', kind: 'dungeon', music, groundColor } as never);
    expect(mk('sea', 0x888888)).toBe('coast');
    expect(mk('forest', 0x888888)).toBe('forest');
    expect(['volcanic', 'underworld']).toContain(mk('inferno', 0x5a2a20));
  });
});

describe('走得到的範圍 reachMap（寶箱位置用）', () => {
  it('被牆隔開的區域走不到', () => {
    const col = new CollisionWorld();
    col.bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
    col.addBox(0, 0, 1, 20); // 中間一道牆，把地圖切成左右兩半
    const can = reachMap(col, { x: -5, z: 0 });
    expect(can(-5, 5)).toBe(true);
    expect(can(5, 5)).toBe(false);
    expect(can(50, 0)).toBe(false);
  });
});
