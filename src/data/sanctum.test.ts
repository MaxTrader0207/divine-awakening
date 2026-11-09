import { describe, expect, it } from 'vitest';
import { CLASS_LIST } from './classes';
import { BLESSING, SANCTUMS, curseFor, rollSanctumPiece, rollSanctumRarity, sanctumIndex, sanctumPieces } from './sanctum';
import { ITEM_BASES, namedGearIds } from './items';
import { GEAR_SETS } from './gearSets';
import { divineFormOf, DIVINE_PALETTES } from './divineForm';
import { SANCTUM_ORDER, ZONES } from './stages';
import { isZoneUnlocked, newGameState } from '@/core/GameState';

const SLOTS = ['weapon', 'hat', 'robe', 'gloves', 'boots', 'ring'] as const;

describe('神域副本（v1.101）', () => {
  it('詛咒：0 件最重、每件減輕 1/6、6 件變祝福；越後面的神域越重', () => {
    for (const s of SANCTUMS) {
      const c0 = curseFor(s.order, 0);
      expect(c0.dealtMul).toBeCloseTo(1 - s.curse.dealt);
      expect(c0.takenMul).toBeCloseTo(1 + s.curse.taken);
      const c3 = curseFor(s.order, 3);
      expect(c3.dealtMul).toBeCloseTo(1 - s.curse.dealt / 2);
      for (let p = 1; p <= 5; p++) expect(curseFor(s.order, p).dealtMul).toBeGreaterThan(curseFor(s.order, p - 1).dealtMul);
      const c6 = curseFor(s.order, 6);
      expect(c6.blessed).toBe(true);
      expect(c6.dealtMul).toBeCloseTo(1 + BLESSING.dealt);
      expect(c6.takenMul).toBeCloseTo(1 - BLESSING.taken);
    }
    for (let i = 1; i < SANCTUMS.length; i++) {
      expect(SANCTUMS[i].curse.taken).toBeGreaterThanOrEqual(SANCTUMS[i - 1].curse.taken);
      expect(SANCTUMS[i].floor).toBeGreaterThan(SANCTUMS[i - 1].floor);
      expect(SANCTUMS[i].budget).toBeGreaterThan(SANCTUMS[i - 1].budget);
    }
  });

  it('每個職業 5 套 × 6 件神域裝都存在，不會從一般神話掉落池出現', () => {
    for (const cls of CLASS_LIST) {
      for (const s of SANCTUMS) {
        const nn = sanctumIndex(s.order);
        for (const sl of SLOTS) {
          const b = ITEM_BASES[`${cls}_${sl}_${nn}`];
          expect(b, `${cls}_${sl}_${nn}`).toBeTruthy();
          expect(b.sanctum).toBe(s.order);
          expect(b.named).toBe(true);
        }
        expect(GEAR_SETS.get(`${cls}_${nn}`)?.sanctum).toBe(s.order);
      }
      for (const sl of SLOTS) for (let t = 1; t <= 8; t++) for (const id of namedGearIds(cls, sl, t)) expect(ITEM_BASES[id].sanctum).toBeUndefined();
    }
  });

  it('件數只算這個神域的套裝；全身同一套神域裝用專屬配色', () => {
    const eq = Object.fromEntries(SLOTS.map((s) => [s, { base: `mage_${s}_23` }]));
    expect(sanctumPieces('mage', 3, eq)).toBe(6);
    expect(sanctumPieces('mage', 2, eq)).toBe(0);
    expect(sanctumPieces('archer', 3, eq)).toBe(0);
    const f = divineFormOf(eq)!;
    expect(f.palette).toBe(DIVINE_PALETTES[11]);
  });

  it('掉落偏向還沒有的部位；首領至少精良', () => {
    const owned = new Set(SLOTS.slice(0, 5).map((s) => `knight_${s}_21`));
    let ring = 0;
    let x = 1;
    const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1000; i++) if (rollSanctumPiece('knight', 1, owned, rng) === 'knight_ring_21') ring++;
    expect(ring).toBeGreaterThan(600);
    for (let i = 0; i < 200; i++) expect(rollSanctumRarity(true, rng)).not.toBe('common');
  });

  it('打倒第 30 層後依序開放 5 個神域', () => {
    expect(SANCTUM_ORDER).toEqual(SANCTUMS.map((s) => s.zone));
    const st = newGameState('mage');
    expect(isZoneUnlocked(st, 'sanctum_1')).toBe(false);
    st.bossesDefeated.push('dungeon_30');
    expect(isZoneUnlocked(st, 'sanctum_1')).toBe(true);
    expect(isZoneUnlocked(st, 'sanctum_2')).toBe(false);
    for (let i = 0; i < SANCTUM_ORDER.length - 1; i++) {
      expect(ZONES[SANCTUM_ORDER[i + 1]].sanctum!.unlockAfter).toBe(SANCTUM_ORDER[i]);
    }
  });
});
