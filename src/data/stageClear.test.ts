import { describe, expect, it } from 'vitest';
import { CLASS_CLEAR, CLEAR_QUOTES, STAGE_EPILOGUE } from './stageClear';
import { CLASS_LIST } from './classes';
import { STAGES, ENEMIES } from './stages';
import { finishClear, fmtSecs, rankClear, type ClearRecord } from '@/systems/StageClear';
import type { ZoneId } from './types';
import { migrate } from '@/core/SaveSystem';

const bossStages = STAGES.filter((s) => (s.zone.spawns ?? []).some((sp) => ENEMIES[sp.enemy]?.boss)).map((s) => s.zone.id);

describe('破關畫面', () => {
  it('每個有首領的關卡都有結局文字，每個職業 × 關卡都有自己的台詞（新增關卡要補 data/stageClear.ts）', () => {
    expect(bossStages.length).toBe(24);
    const quotes = new Set<string>();
    for (const id of bossStages) {
      expect(STAGE_EPILOGUE[id]?.title, `${id} 缺少 STAGE_EPILOGUE`).toBeTruthy();
      for (const cls of CLASS_LIST) {
        const q = CLEAR_QUOTES[cls][id];
        expect(q, `${cls} 在 ${id} 缺少破關台詞`).toBeTruthy();
        expect(quotes.has(q!), `台詞重複：${q}`).toBe(false);
        quotes.add(q!);
      }
    }
    for (const cls of CLASS_LIST) expect(CLASS_CLEAR[cls].title).toBeTruthy();
  });

  it('評價：無傷速殺 S，挨打多、用藥多、拖太久往下掉', () => {
    expect(rankClear(180, 0, 0)).toBe('S');
    expect(rankClear(180, 3, 2)).toBe('S');
    expect(rankClear(185, 5, 6)).toBe('A');
    expect(rankClear(190, 9, 10)).toBe('B');
    expect(rankClear(300, 12, 20)).toBe('C');
  });

  it('紀錄：次數累加、最快時間、新紀錄、最佳評價', () => {
    const clears: Partial<Record<ZoneId, ClearRecord>> = {};
    const f = (start: number, skillHits: number) => ({ zoneId: 'dungeon_1' as ZoneId, start, skillHits, hits: skillHits, itemsAtStart: 10 });
    const a = finishClear(clears, f(0, 4), 100, 8);
    expect(a).toMatchObject({ first: true, count: 1, secs: 100, itemsUsed: 2, newRecord: false });
    const b = finishClear(clears, f(0, 0), 70, 10);
    expect(b).toMatchObject({ first: false, count: 2, prevBest: 100, newRecord: true, rank: 'S' });
    const c = finishClear(clears, f(0, 9), 150, 4);
    expect(c.newRecord).toBe(false);
    expect(clears.dungeon_1).toEqual({ count: 3, best: 70, bestRank: 'S' });
    expect(fmtSecs(65)).toBe('1:05');
  });

  it('存檔 v9：舊存檔補上空的破關紀錄，已有的保留', () => {
    expect(migrate({ version: 8, level: 20 } as never)!.clears).toEqual({});
    const kept = migrate({ version: 9, clears: { dungeon_2: { count: 2, best: 88, bestRank: 'A' } } } as never)!;
    expect(kept.clears.dungeon_2?.best).toBe(88);
  });
});
