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

import { TOWER_AFFIXES, affixBonusGold, affixCount, rollAffixes, towerRng } from './TrialTower';

describe('試煉塔詞綴（v1.73）', () => {
  it('同一週同一層結果固定；不同週不同', () => {
    const a = floorPlan(23, towerRng('2026-11-02', 23));
    const b = floorPlan(23, towerRng('2026-11-02', 23));
    expect(b).toEqual(a);
    const diff = Array.from({ length: 10 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`).some((w) => JSON.stringify(floorPlan(23, towerRng(w, 23))) !== JSON.stringify(a));
    expect(diff).toBe(true);
  });

  it('詞綴數量隨層數增加，首領專用 / 一般層專用不會出錯層', () => {
    const r = () => 0.1;
    expect(affixCount(3, r)).toBe(0);
    expect(affixCount(5, r)).toBe(0);
    expect(affixCount(10, r)).toBe(1);
    expect(affixCount(25, r)).toBe(1);
    expect(affixCount(45, r)).toBe(2);
    for (let f = 6; f < 80; f++) {
      for (const id of rollAffixes(f, towerRng('2026-11-02', f))) {
        const a = TOWER_AFFIXES[id];
        if (a.only === 'boss') expect(f % 5).toBe(0);
        if (a.only === 'mob') expect(f % 5).not.toBe(0);
      }
      const ids = rollAffixes(f, towerRng('w', f));
      expect(ids.filter((x) => TOWER_AFFIXES[x].good).length).toBeLessThanOrEqual(1);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('詞綴數值套進樓層設定；不利詞綴給額外金幣', () => {
    let found = 0;
    for (let f = 20; f < 60; f++) {
      const p = floorPlan(f, towerRng('2026-11-02', f));
      const base = floorPlan(f, () => 0.99999);
      if (p.affixes.includes('tough') && !p.boss) {
        expect(p.timeLimit).toBeGreaterThan(30);
        found++;
      }
      expect(affixBonusGold(p)).toBe(p.affixes.filter((a) => !TOWER_AFFIXES[a].good).length * p.level * 25);
      expect(base.level).toBe(p.level);
    }
    expect(found).toBeGreaterThanOrEqual(0);
    const t = floorPlan(30, () => 0);
    expect(t.timeLimit).toBeGreaterThan(0);
  });
});

describe('首領召喚守護者助陣（v1.104）', () => {
  it('第 20 層前不召喚、越高層越多越強', async () => {
    const { bossAllyPlan, allyChance, allyHpShare, allyAtkShare, BOSS_ALLY } = await import('./TrialTower');
    expect(bossAllyPlan(15, 'x', towerRng('w', 15))).toEqual([]);
    expect(bossAllyPlan(21, 'x', towerRng('w', 21))).toEqual([]); // 不是首領層
    expect(allyChance(19)).toBe(0);
    expect(allyChance(100)).toBe(1);
    expect(allyHpShare(100)).toBeLessThanOrEqual(BOSS_ALLY.hpMax);
    expect(allyAtkShare(60)).toBeGreaterThan(allyAtkShare(20));
    for (let f = 40; f <= 120; f += 5) {
      const plan = bossAllyPlan(f, 'x', towerRng('2026-11-09', f));
      expect(plan.length).toBeGreaterThanOrEqual(1); // 第 40 層起第一隻必定出現
      expect(plan.length).toBeLessThanOrEqual(BOSS_ALLY.countAt.filter((c) => f >= c).length);
      expect(new Set(plan.map((a) => a.id)).size).toBe(plan.length); // 不重複
      for (let i = 1; i < plan.length; i++) expect(plan[i].at).toBeLessThan(plan[i - 1].at);
    }
    // 同一週同一層固定
    expect(bossAllyPlan(70, 'x', towerRng('w1', 70))).toEqual(bossAllyPlan(70, 'x', towerRng('w1', 70)));
    // 不會召喚和首領同一隻
    expect(bossAllyPlan(80, 'guardian_pegasus', towerRng('w1', 80)).some((a) => a.id === 'guardian_pegasus')).toBe(false);
  });
});
