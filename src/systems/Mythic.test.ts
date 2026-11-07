import { describe, expect, it } from 'vitest';
import { ENEMIES } from '@/data/enemies';
import { DUNGEON_ORDER, ZONES } from '@/data/zones';
import { mythicBest, mythicFirstGems, mythicMods, mythicOpen, mythicUnlocked, newMythicState, normalizeMythic } from './Mythic';

const mobsOf = (floor: number) => (ZONES[DUNGEON_ORDER[floor - 1]].spawns ?? []).map((s) => ENEMIES[s.enemy]).filter((e) => e && !e.boss);
const bossOf = (floor: number) => (ZONES[DUNGEON_ORDER[floor - 1]].spawns ?? []).map((s) => ENEMIES[s.enemy]).find((e) => e?.boss)!;

describe('神話難度', () => {
  it('打倒最終首領才開放、依序解鎖', () => {
    expect(mythicOpen([])).toBe(false);
    expect(mythicOpen([DUNGEON_ORDER[DUNGEON_ORDER.length - 1]])).toBe(true);
    const m = newMythicState();
    expect(mythicUnlocked(m, 1)).toBe(true);
    expect(mythicUnlocked(m, 2)).toBe(false);
    m.clears[DUNGEON_ORDER[0]] = { count: 1, best: 100, bestRank: 'A' };
    expect(mythicUnlocked(m, 2)).toBe(true);
    expect(mythicBest(m)).toBe(1);
    expect(mythicFirstGems(22)).toBeGreaterThan(mythicFirstGems(1));
  });

  it('第一層的小怪換算後跟 Lv.110 小怪差不多強，而且越高層越強', () => {
    const lv110 = mobsOf(22);
    const medHp = lv110.map((e) => e.stats.maxHp).sort((a, b) => a - b)[Math.floor(lv110.length / 2)];
    for (const e of mobsOf(1)) {
      const m = mythicMods(e, 1);
      const hp = e.stats.maxHp * m.hpMul;
      expect(hp).toBeGreaterThan(medHp * 0.4);
      expect(hp).toBeLessThan(medHp * 3);
      expect(m.level).toBe(111);
    }
    const e = mobsOf(5)[0];
    expect(mythicMods(e, 20).hpMul).toBeGreaterThan(mythicMods(e, 5).hpMul);
  });

  it('首領換算到最終首領等級，獎勵也變多', () => {
    const b1 = bossOf(1);
    const b22 = bossOf(22);
    const m1 = mythicMods(b1, 1);
    expect(b1.stats.maxHp * m1.hpMul).toBeGreaterThan(b22.stats.maxHp * 0.3);
    expect(m1.expMul).toBeGreaterThan(10);
    expect(mythicMods(b22, 22).hpMul).toBeGreaterThan(mythicMods(b22, 1).hpMul);
  });

  it('讀檔整理', () => {
    expect(normalizeMythic(null).on).toBe(false);
    expect(normalizeMythic({ on: true, clears: { dungeon_1: { count: 2, best: 90, bestRank: 'S' } } }).clears.dungeon_1?.count).toBe(2);
  });
});
