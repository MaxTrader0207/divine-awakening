import { describe, expect, it } from 'vitest';
import { compile } from './Music';
import { genBossSong } from './bossSongs';
import { STAGES } from '@/data/stages';

describe('首領專屬戰曲（v1.111）', () => {
  const bosses = STAGES.flatMap((s) => Object.values(s.enemies).filter((e) => e.boss).map((e) => ({ zone: s.zone.id, e })));
  it('每一關的首領戰曲都能編譯、彼此不同', () => {
    expect(bosses.length).toBeGreaterThan(50);
    const fps = new Set<string>();
    for (const { zone, e } of bosses) {
      const def = genBossSong(`boss:${zone}`, { name: e.name, element: e.element });
      expect(def.bossFight).toBe(true);
      expect(def.bpm).toBeGreaterThanOrEqual(130);
      expect(def.bpm).toBeLessThanOrEqual(185);
      const c = compile(def);
      expect(c.bars.length).toBeGreaterThanOrEqual(16);
      fps.add(`${def.bpm}|${def.sections.A.melody}`);
    }
    expect(fps.size).toBe(bosses.length);
  });
  it('同一個種子每次都是同一首', () => {
    expect(genBossSong('boss:x', { name: 'A' })).toEqual(genBossSong('boss:x', { name: 'A' }));
  });
});
