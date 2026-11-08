import { describe, expect, it } from 'vitest';
import { WEEKLY, ensureWeeklyWeek, hoursToReset, newWeeklyState, normalizeWeekly, recordWeeklyWin, weeklyAffixMods, weeklyPick } from './WeeklyBoss';

describe('每週首領挑戰', () => {
  it('同一週選到同一隻首領與詞綴，詞綴不重複', () => {
    const a = weeklyPick('2026-11-02');
    const b = weeklyPick('2026-11-02');
    expect(a.boss.id).toBe(b.boss.id);
    expect(a.affixes).toEqual(b.affixes);
    expect(new Set(a.affixes).size).toBe(WEEKLY.affixes);
    expect(a.boss.boss).toBe(true);
    // 不同週大多會換
    const ids = new Set(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'].map((w) => weeklyPick(w).boss.id));
    expect(ids.size).toBeGreaterThan(1);
  });

  it('第一次獎勵每週每難度一次、最快時間', () => {
    const now = new Date(2026, 10, 4);
    const w = newWeeklyState();
    ensureWeeklyWeek(w, now);
    expect(recordWeeklyWin(w, 'hero', 120, now)).toEqual({ first: true, newBest: true });
    expect(recordWeeklyWin(w, 'hero', 130, now)).toEqual({ first: false, newBest: false });
    expect(recordWeeklyWin(w, 'hero', 100, now).newBest).toBe(true);
    expect(w.best.hero).toBe(100);
    // 下一週重置
    const next = new Date(2026, 10, 10);
    expect(recordWeeklyWin(w, 'hero', 150, next).first).toBe(true);
    expect(w.wins).toBe(4);
  });

  it('詞綴倍率、讀檔整理、倒數', () => {
    const m = weeklyAffixMods(['might', 'regen']);
    expect(m.atk).toBeCloseTo(1.3);
    expect(m.regen).toBeGreaterThan(0);
    expect(normalizeWeekly({ claimed: ['hero', 'xxx'], wins: 3 }).claimed).toEqual(['hero']);
    const h = hoursToReset(new Date(2026, 10, 8, 23, 0));
    expect(h).toBe(1);
  });
});
