import { describe, expect, it } from 'vitest';
import { claimableCount, ensureToday, generateDaily, progressQuests, zonesForLevel } from './DailyQuests';
import type { ZoneId } from '@/data/types';

describe('DailyQuests', () => {
  it('同一天同等級區間產生相同任務', () => {
    const a = generateDaily('2026-11-02', 7, []);
    const b = generateDaily('2026-11-02', 8, []);
    expect(a.quests.map((q) => q.kind)).toEqual(b.quests.map((q) => q.kind));
    expect(a.quests).toHaveLength(3);
  });

  it('第一個任務一定是擊倒類', () => {
    for (let d = 1; d <= 28; d++) {
      const s = generateDaily(`2026-02-${String(d).padStart(2, '0')}`, 12, ['dungeon_1', 'dungeon_2']);
      expect(['kill', 'kill_zone']).toContain(s.quests[0].kind);
      expect(new Set(s.quests.map((q) => q.kind)).size).toBe(3);
    }
  });

  it('跨日重置', () => {
    const st: Parameters<typeof ensureToday>[0] = { level: 5, bossesDefeated: [] };
    expect(ensureToday(st, '2026-11-02')).toBe(true);
    expect(ensureToday(st, '2026-11-02')).toBe(false);
    expect(ensureToday(st, '2026-11-03')).toBe(true);
    expect(st.daily!.date).toBe('2026-11-03');
  });

  it('進度推進與完成', () => {
    const d = generateDaily('2026-11-02', 5, []);
    d.quests = [
      { kind: 'kill', target: 2, progress: 0, claimed: false, reward: { gold: 1, gems: 0 } },
      { kind: 'kill_zone', zone: 'dungeon_1', target: 1, progress: 0, claimed: false, reward: { gold: 1, gems: 0 } },
      { kind: 'gold', target: 100, progress: 0, claimed: false, reward: { gold: 1, gems: 0 } },
    ];
    expect(progressQuests(d, { type: 'kill', zone: 'grassland' })).toHaveLength(0);
    const done = progressQuests(d, { type: 'kill', zone: 'dungeon_1' });
    expect(done.map((q) => q.kind).sort()).toEqual(['kill', 'kill_zone']);
    progressQuests(d, { type: 'gold', amount: 250 });
    expect(d.quests[2].progress).toBe(100);
    expect(claimableCount(d)).toBe(3);
    d.quests.forEach((q) => (q.claimed = true));
    expect(claimableCount(d)).toBe(1); // 獎勵寶箱
  });

  it('區域依等級與進度', () => {
    expect(zonesForLevel(3, [])).toEqual(['grassland', 'dungeon_1']);
    expect(zonesForLevel(15, ['dungeon_1', 'dungeon_2'])).toEqual(['dungeon_3', 'mistwood', 'delphi_path', 'marathon_field', 'troy_beach', 'side_1']);
    expect(zonesForLevel(22, ['dungeon_1', 'dungeon_2'])).toEqual(['mistwood', 'troy_beach']);
  });
});

describe('破關後的每日任務（v1.81）', () => {
  const all = Array.from({ length: 30 }, (_, i) => `dungeon_${i + 1}`) as ZoneId[];
  it('打倒最終首領後，第三個任務固定是神話或每週首領；沒破關不會出現', () => {
    for (let d = 1; d <= 20; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      const post = generateDaily(date, 150, all);
      expect(['mythic', 'weekly']).toContain(post.quests[2].kind);
      expect(new Set(post.quests.map((q) => q.kind)).size).toBe(3);
      const pre = generateDaily(date, 60, all.slice(0, 12));
      expect(pre.quests.some((q) => q.kind === 'mythic' || q.kind === 'weekly')).toBe(false);
    }
  });
  it('事件推進', () => {
    const daily = generateDaily('2026-11-03', 150, all);
    const q = daily.quests[2];
    const done = progressQuests(daily, { type: q.kind as 'mythic' | 'weekly' });
    expect(done).toContain(q);
  });
});
