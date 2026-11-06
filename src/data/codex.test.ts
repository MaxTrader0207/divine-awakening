import { describe, expect, it } from 'vitest';
import { CODEX_BONUS_MAX, CODEX_ENTRIES, CODEX_GROUPS, CODEX_MAX_POINTS, CODEX_TIERS, codexBonus, codexFound, codexNext, codexPoints, codexStars, recordKill } from './codex';
import { ENEMIES } from './stages';
import { ACHIEVEMENTS } from './achievements';
import { newGameState } from '@/core/GameState';
import { migrate } from '@/core/SaveSystem';
import { claimAchievement, claimAllAchievements, claimableAchievements, newlyDone } from '@/systems/Achievements';
import { computeStats } from '@/systems/Inventory';

describe('怪物圖鑑', () => {
  it('包含所有會攻擊的敵人，不含訓練木樁，id 不重複', () => {
    const ids = CODEX_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('training_dummy');
    const spawned = new Set(CODEX_GROUPS.flatMap((g) => g.entries.map((e) => e.id)));
    for (const [id, e] of Object.entries(ENEMIES)) if (e.aggro !== 'none' && spawned.has(id)) expect(ids).toContain(id);
    expect(CODEX_ENTRIES.length).toBeGreaterThan(200);
  });

  it('升星門檻', () => {
    expect(codexStars('mob', 0)).toBe(0);
    expect(codexStars('mob', 1)).toBe(1);
    expect(codexStars('mob', CODEX_TIERS.mob[1])).toBe(2);
    expect(codexStars('boss', CODEX_TIERS.boss[2])).toBe(3);
    expect(codexNext('mob', 1)).toBe(CODEX_TIERS.mob[1]);
    expect(codexNext('boss', 999)).toBeNull();
  });

  it('recordKill 只在升星時回傳星數', () => {
    const c: Record<string, number> = {};
    const id = CODEX_ENTRIES.find((e) => e.kind === 'mob')!.id;
    expect(recordKill(c, id)).toBe(1);
    expect(recordKill(c, id)).toBe(0);
    c[id] = CODEX_TIERS.mob[1] - 1;
    expect(recordKill(c, id)).toBe(2);
    expect(recordKill(c, 'not_in_codex')).toBe(0);
    expect(c.not_in_codex).toBeUndefined();
  });

  it('點數與加成照比例，全滿等於上限', () => {
    const full: Record<string, number> = {};
    for (const e of CODEX_ENTRIES) full[e.id] = 9999;
    expect(codexPoints(full)).toBe(CODEX_MAX_POINTS);
    expect(codexFound(full)).toBe(CODEX_ENTRIES.length);
    expect(codexBonus(full).atk).toBeCloseTo(CODEX_BONUS_MAX.atk);
    expect(codexBonus({}).atk).toBe(0);
    const s = newGameState('mage');
    const base = computeStats(s);
    s.codex = full;
    const boosted = computeStats(s);
    expect(boosted.atk).toBeCloseTo(base.atk * (1 + CODEX_BONUS_MAX.atk), -1);
    expect(boosted.maxHp).toBeGreaterThan(base.maxHp);
  });
});

describe('成就', () => {
  it('id 不重複、目標都大於 0', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const s = newGameState('mage');
    for (const a of ACHIEVEMENTS) {
      const [cur, target] = a.progress(s);
      expect(target, a.id).toBeGreaterThan(0);
      expect(cur, a.id).toBeLessThanOrEqual(target);
      expect(a.gems).toBeGreaterThan(0);
    }
  });

  it('新存檔沒有可領的成就；達成後只通知一次、只能領一次', () => {
    const s = newGameState('mage');
    expect(claimableAchievements(s)).toBe(0);
    s.level = 10;
    s.stats.kills = 120;
    const first = newlyDone(s).map((a) => a.id);
    expect(first).toEqual(expect.arrayContaining(['lv10', 'kill100']));
    expect(newlyDone(s)).toEqual([]);
    expect(claimableAchievements(s)).toBe(2);
    const g0 = s.gems;
    expect(claimAchievement(s, 'lv10')).toBe(5);
    expect(claimAchievement(s, 'lv10')).toBe(0);
    expect(claimAchievement(s, 'lv30')).toBe(0);
    const [n, gems] = claimAllAchievements(s);
    expect(n).toBe(1);
    expect(s.gems).toBe(g0 + 5 + gems);
  });

  it('舊存檔遷移（v13 → v14）：首領圖鑑從破關紀錄補上', () => {
    const old = newGameState('mage') as unknown as Record<string, unknown>;
    old.version = 13;
    delete old.codex;
    delete old.achievements;
    old.stats = { kills: 50, deaths: 1, playTime: 100 };
    old.clears = { dungeon_1: { count: 3, best: 120, bestRank: 'S' } };
    old.bossesDefeated = ['dungeon_1'];
    const m = migrate(old as never)!;
    expect(m.codex.boss_crab ?? Object.values(m.codex)[0]).toBe(3);
    expect(m.stats.bossKills).toBe(3);
    expect(m.stats.kills).toBe(50);
    expect(m.achievements).toEqual({ claimed: [], seen: [] });
    expect(newlyDone(m).map((a) => a.id)).toEqual(expect.arrayContaining(['rankS1', 'floor3'].slice(0, 1)));
  });
});
