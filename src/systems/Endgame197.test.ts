import { describe, expect, it } from 'vitest';
import { migrate } from '@/core/SaveSystem';
import { newGameState } from '@/core/GameState';
import { DUNGEON_ORDER, ZONES, bossOf } from '@/data/zones';
import { ENEMIES } from '@/data/enemies';
import { BOSS_SKILLS } from '@/data/bossSkills';
import { MAX_LEVEL, addExp } from './Progression';
import { divinityOpen } from './Divinity';
import { mythicLevel, mythicOpen } from './Mythic';
import { TOWER, towerLevel, floorPlan } from './TrialTower';

/** v1.97：主線加到 30 層、等級上限 150 */
describe('第 23～30 層與等級上限 150（v1.97）', () => {
  it('30 層、最終首領是克洛諾斯，第 23～30 層每層等級 +5、首領 4 招', () => {
    expect(DUNGEON_ORDER.length).toBe(30);
    expect(MAX_LEVEL).toBe(150);
    for (let f = 23; f <= 30; f++) {
      const z = ZONES[DUNGEON_ORDER[f - 1]];
      expect(z.levelRange).toEqual([5 * f - 4, 5 * f]);
      const b = bossOf(z.id)!;
      expect(b.level).toBe(5 * f);
      expect(b.bossSkills).toHaveLength(4);
      for (const s of b.bossSkills!) expect(BOSS_SKILLS[s as keyof typeof BOSS_SKILLS]).toBeTruthy();
      // 每層越來越強
      const prev = bossOf(DUNGEON_ORDER[f - 2])!;
      expect(b.stats.maxHp).toBeGreaterThan(prev.stats.maxHp);
      expect(b.stats.atk).toBeGreaterThan(prev.stats.atk);
    }
    expect(bossOf('dungeon_30')!.name).toBe('泰坦之王克洛諾斯');
  });

  it('Lv.110 可以繼續升級，滿級（150）才開始累積神格', () => {
    const r = addExp(110, 0, 1e9);
    expect(r.level).toBe(MAX_LEVEL);
    expect(divinityOpen(110)).toBe(false);
    expect(divinityOpen(150)).toBe(true);
  });

  it('神話難度從 Lv.151 起算，要打倒第 30 層才開放', () => {
    expect(mythicLevel(1)).toBe(151);
    expect(mythicOpen(DUNGEON_ORDER.slice(0, 22))).toBe(false);
    expect(mythicOpen([...DUNGEON_ORDER])).toBe(true);
  });

  it('試煉塔維持 Lv.110 封頂、不會抽到第 23 層以後的敵人（每週排行標準不變）', () => {
    expect(towerLevel(200)).toBe(TOWER.levelCap);
    for (let f = 50; f <= 80; f += 5) {
      const p = floorPlan(f, () => 0.5);
      for (const g of p.groups) expect(ENEMIES[g.id].level).toBeLessThanOrEqual(TOWER.levelCap + 3);
    }
  });

  it('舊存檔（v27，看過坎佩版結局）讀檔後會在打倒克洛諾斯時再播一次新結局', () => {
    const old = { ...newGameState('mage'), version: 27, level: 110, endingSeen: true, bossesDefeated: DUNGEON_ORDER.slice(0, 22) };
    const m = migrate(old)!;
    expect(m.endingSeen).toBe(false);
    expect(m.level).toBe(110);
    const done = migrate({ ...old, version: 28 })!;
    expect(done.endingSeen).toBe(true);
  });
});
