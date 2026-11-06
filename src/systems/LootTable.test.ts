import { describe, expect, it } from 'vitest';

describe('混合掉落階級（v1.62 野外）', () => {
  it('lootTiers 每件各自抽，只會出現清單內的階級，比例照清單', async () => {
    const { rollZoneTier, lootTierText } = await import('@/data/stages');
    let n3 = 0;
    let n4 = 0;
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 3000; i++) {
      const t = rollZoneTier('delphi_path', rng);
      if (t === 3) n3++;
      else if (t === 4) n4++;
      else throw new Error(`不該出現 ${t} 階`);
    }
    expect(n3 / 3000).toBeGreaterThan(0.6);
    expect(n4 / 3000).toBeGreaterThan(0.28);
    expect(lootTierText('marathon_field')).toBe('3～4 階');
    expect(lootTierText('mistwood')).toBe('4 階');
    expect(rollZoneTier('dungeon_5')).toBe(4);
  });
});
