import { describe, expect, it } from 'vitest';
import { CLASS_LIST } from './classes';
import { DIVINE_ORNAMENTS, DIVINE_PALETTES, divineFormOf, mythicPieces, setLabel } from './divineForm';

const SLOTS = ['weapon', 'hat', 'robe', 'gloves', 'boots', 'ring'] as const;
const full = (cls: string, nn: string) => Object.fromEntries(SLOTS.map((s) => [s, { base: `${cls}_${s}_${nn}` }]));

describe('神裝形態（v1.99）', () => {
  it('全身 6 格★神話裝才變身；5 件或混標準裝不算', () => {
    const eq: Record<string, { base: string }> = full('mage', '20');
    expect(mythicPieces(eq)).toBe(6);
    const f = divineFormOf(eq)!;
    expect(f.full).toBe(true);
    expect(f.palette).toBe(DIVINE_PALETTES[f.tier]);
    eq.ring = { base: 'ring_t8' };
    expect(mythicPieces(eq)).toBe(5);
    expect(divineFormOf(eq)).toBeNull();
    delete eq.ring;
    expect(divineFormOf(eq)).toBeNull();
  });

  it('6 件★神話裝但不同套：仍是神裝形態，不是完整套裝；配色取件數最多的那套', () => {
    const eq: Record<string, { base: string }> = full('knight', '20');
    eq.ring = { base: 'knight_ring_05' };
    const f = divineFormOf(eq)!;
    expect(f).not.toBeNull();
    expect(f.full).toBe(false);
    expect(f.setId).toBe(divineFormOf(full('knight', '20'))!.setId);
  });

  it('每個職業都有飾物、每一階都有配色', () => {
    for (const c of CLASS_LIST) expect(DIVINE_ORNAMENTS[c].kind).toBeTruthy();
    for (let t = 1; t <= 8; t++) expect(DIVINE_PALETTES[t].name).toBeTruthy();
    expect(new Set(CLASS_LIST.map((c) => DIVINE_ORNAMENTS[c].kind)).size).toBe(CLASS_LIST.length);
    expect(setLabel('阿斯特賴亞套裝')).toBe('阿斯特賴亞套裝');
    expect(setLabel('烏拉諾斯')).toBe('烏拉諾斯套裝');
  });
});

describe('每個職業 × 每一套整套（v1.102 檢查）', () => {
  it('25 套（20 套★神話＋5 套神域）都能變成完整神裝形態，配色與飾物都存在', () => {
    for (const cls of CLASS_LIST) {
      expect(DIVINE_ORNAMENTS[cls]).toBeTruthy();
      const keys = new Set<string>();
      for (let n = 1; n <= 25; n++) {
        const nn = String(n).padStart(2, '0');
        const f = divineFormOf(full(cls, nn));
        expect(f, `${cls}_${nn}`).not.toBeNull();
        expect(f!.full, `${cls}_${nn}`).toBe(true);
        expect(f!.palette, `${cls}_${nn}`).toBeTruthy();
        expect(f!.setId).toBe(`${cls}_${nn}`);
        keys.add(f!.key);
      }
      // 8 個階級配色＋5 個神域配色
      expect(keys.size).toBe(13);
    }
  });
});
