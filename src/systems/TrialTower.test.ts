import { describe, expect, it } from 'vitest';
import { ENEMIES } from '@/data/stages';
import { TOWER, bossGems, ensureWeek, floorPlan, isBossFloor, newTowerState, overflowMul, recordFloor, startFloors, towerLevel, weekKey } from './TrialTower';
import { newGameState } from '@/core/GameState';
import { migrate } from '@/core/SaveSystem';

describe('無盡試煉塔', () => {
  it('層數 → 等級、首領層、封頂後繼續變強', () => {
    expect(towerLevel(1)).toBe(6);
    expect(towerLevel(53)).toBe(110);
    expect(towerLevel(80)).toBe(110);
    expect(isBossFloor(5)).toBe(true);
    expect(isBossFloor(6)).toBe(false);
    expect(overflowMul(53)).toBe(1);
    expect(overflowMul(63)).toBeCloseTo(Math.pow(TOWER.overflow, 10));
  });

  it('每層都能產生敵人，等級接近，首領層只有一隻首領', () => {
    for (let f = 1; f <= 70; f++) {
      const p = floorPlan(f, () => 0.37);
      const n = p.groups.reduce((a, g) => a + g.count, 0);
      for (const g of p.groups) {
        const e = ENEMIES[g.id];
        expect(e, `${f}:${g.id}`).toBeTruthy();
        expect(!!e.boss).toBe(p.boss);
        expect(Math.abs(e.level - p.level), `第 ${f} 層 ${e.name}`).toBeLessThanOrEqual(8);
      }
      if (p.boss) expect(n).toBe(1);
      else expect(n).toBeGreaterThanOrEqual(5);
    }
  });

  it('紀錄與每週鑽石：同一週同一層只給一次', () => {
    const t = newTowerState();
    const mon = new Date(2026, 10, 2, 10); // 週一
    expect(weekKey(new Date(2026, 10, 8, 23))).toBe('2026-11-02'); // 週日還是同一週
    expect(recordFloor(t, 4, mon)).toBe(0);
    expect(recordFloor(t, 5, mon)).toBe(bossGems(5));
    expect(recordFloor(t, 5, mon)).toBe(0);
    expect(t.best).toBe(5);
    const nextWeek = new Date(2026, 10, 9, 1);
    ensureWeek(t, nextWeek);
    expect(t.weekBest).toBe(0);
    expect(recordFloor(t, 5, nextWeek)).toBe(bossGems(5));
    expect(t.best).toBe(5);
  });

  it('檢查點與存檔遷移', () => {
    expect(startFloors(9)).toEqual([1]);
    expect(startFloors(27)).toEqual([1, 21]);
    const old = newGameState('mage') as unknown as Record<string, unknown>;
    old.version = 17;
    delete old.tower;
    old.zoneId = 'trial_tower';
    const m = migrate(old as never)!;
    expect(m.tower).toEqual(newTowerState());
    expect(m.zoneId).toBe('town');
  });
});

import { generateDaily, progressQuests } from './DailyQuests';

describe('試煉塔每日任務（v1.71）', () => {
  it('開放前不會出現；開放後某些天會出現，打過一層 +1', () => {
    const days = Array.from({ length: 60 }, (_, i) => `2026-12-${String((i % 28) + 1).padStart(2, '0')}|${i}`);
    expect(days.some((d) => generateDaily(d, 30, []).quests.some((q) => q.kind === 'tower'))).toBe(false);
    const withTower = days.map((d) => generateDaily(d, 30, ['dungeon_1', 'dungeon_2', 'dungeon_3'])).find((d) => d.quests.some((q) => q.kind === 'tower'));
    expect(withTower).toBeTruthy();
    const q = withTower!.quests.find((x) => x.kind === 'tower')!;
    progressQuests(withTower!, { type: 'tower' });
    expect(q.progress).toBe(1);
  });
});
