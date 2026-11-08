import { describe, expect, it } from 'vitest';
import { newGameState } from '@/core/GameState';
import { migrate } from '@/core/SaveSystem';
import { ITEM_BASES } from '@/data/items';
import { LOGIN_DAYS, OFFLINE, canClaimLogin, claimLogin, formatAway, offlineReward, refMob } from './Welcome';
import { expToNext } from '@/data/player';

describe('每日簽到', () => {
  it('一天只能簽一次，隔天推進到下一天', () => {
    const s = newGameState('mage');
    expect(canClaimLogin(s, '2026-11-06')).toBe(true);
    const g = s.gold;
    expect(claimLogin(s, '2026-11-06')).not.toBeNull();
    expect(s.gold).toBeGreaterThan(g);
    expect(canClaimLogin(s, '2026-11-06')).toBe(false);
    expect(claimLogin(s, '2026-11-06')).toBeNull();
    expect(s.login.next).toBe(1);
    // 漏掉幾天也不會重置
    expect(claimLogin(s, '2026-11-10')).not.toBeNull();
    expect(s.login.next).toBe(2);
    expect(s.login.total).toBe(2);
  });

  it('7 天一輪；第 7 天拿到★神話裝', () => {
    const s = newGameState('archer');
    s.level = 40;
    for (let i = 0; i < LOGIN_DAYS; i++) claimLogin(s, `2026-12-${String(i + 1).padStart(2, '0')}`, () => 0.5);
    expect(s.login.next).toBe(0);
    expect(s.inventory.some((it) => ITEM_BASES[it.base]?.named)).toBe(true);
    expect(s.potions.hp).toBe(newGameState('archer').potions.hp + 5);
  });

  it('舊存檔遷移從第 1 天開始', () => {
    const old = newGameState('mage') as unknown as Record<string, unknown>;
    old.version = 14;
    delete old.login;
    expect(migrate(old as never)!.login).toEqual({ last: '', next: 0, total: 0 });
  });
});

describe('離線收益', () => {
  it('不到 10 分鐘沒有收益；超過上限（12 小時）只算上限', () => {
    expect(offlineReward(20, 5 * 60000)).toBeNull();
    const a = offlineReward(20, 60 * 60000)!;
    expect(a.minutes).toBe(60);
    const b = offlineReward(20, 30 * 3600000)!;
    expect(b.minutes).toBe(OFFLINE.capHours * 60);
    expect(b.away).toBe(30 * 60);
    expect(b.exp).toBeGreaterThan(a.exp);
  });

  it('8 小時大約等於 1~3 級的經驗（不會取代實際遊玩）', () => {
    for (const lv of [5, 20, 50, 80, 105]) {
      const r = offlineReward(lv, 8 * 3600000)!;
      const levels = r.exp / expToNext(lv);
      expect(levels, `Lv.${lv}`).toBeGreaterThan(0.5);
      expect(levels, `Lv.${lv}`).toBeLessThan(3.5);
      expect(r.gold).toBeGreaterThan(0);
    }
  });

  it('v1.85：裝備、藥水、夥伴經驗，轉生加成經驗', () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const r = offlineReward(40, 12 * 3600000, { cls: 'knight', rng })!;
    expect(r.drops.length).toBe(Math.min(OFFLINE.dropMax, Math.floor(r.kills / OFFLINE.dropEvery)));
    expect(r.bonusDrops.length).toBe(r.drops.length);
    expect(r.drops.every((d) => !!ITEM_BASES[d.base])).toBe(true);
    expect(r.potions).toBe(OFFLINE.capHours / OFFLINE.potionHours);
    expect(r.compExp).toBe(r.kills);
    // 短時間：沒有裝備與藥水
    const short = offlineReward(40, 30 * 60000)!;
    expect(short.drops.length).toBe(0);
    expect(short.potions).toBe(0);
    // 轉生 2 次：經驗 ×1.4
    const reb = offlineReward(40, 3 * 3600000, { rebirth: 2 })!;
    const base = offlineReward(40, 3 * 3600000)!;
    expect(reb.exp / base.exp).toBeCloseTo(1.4, 1);
  });

  it('參考小怪接近玩家等級', () => {
    expect(Math.abs(refMob(60).level - 60)).toBeLessThanOrEqual(3);
    expect(formatAway(192)).toBe('3 小時 12 分');
    expect(formatAway(25)).toBe('25 分鐘');
  });
});
