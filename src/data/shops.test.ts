import { describe, expect, it } from 'vitest';
import { DAILY, SHOPS, dailyDeals, isHealing, merchantLeft, recordMerchant } from './shops';
import { CONSUMABLES, consumablesFor } from './consumables';
import { CLASS_LIST } from './classes';

describe('商店（v1.94）', () => {
  it('每間店都有名稱、店主、招呼語與至少一個區塊', () => {
    for (const s of Object.values(SHOPS)) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.greet.length).toBeGreaterThan(0);
      expect(s.sections.length).toBeGreaterThan(0);
    }
  });

  it('藥房 / 道具店把通用道具分乾淨（不重複、不遺漏）', () => {
    const heal = CONSUMABLES.filter(isHealing);
    const goods = CONSUMABLES.filter((c) => !isHealing(c));
    expect(heal.length + goods.length).toBe(CONSUMABLES.length);
    expect(heal.length).toBeGreaterThan(0);
    expect(goods.length).toBeGreaterThan(0);
  });

  it('旅行商人：同一天同職業的貨固定、不重複、全部打折', () => {
    for (const cls of CLASS_LIST) {
      const a = dailyDeals('2026-11-8', cls);
      const b = dailyDeals('2026-11-8', cls);
      expect(a.map((d) => d.item.id)).toEqual(b.map((d) => d.item.id));
      expect(a.length).toBe(DAILY.count);
      expect(new Set(a.map((d) => d.item.id)).size).toBe(DAILY.count);
      const allowed = new Set(consumablesFor(cls).map((c) => c.id));
      for (const d of a) {
        expect(allowed.has(d.item.id)).toBe(true);
        expect(d.price).toBeLessThan(d.item.price);
      }
    }
  });

  it('旅行商人：換一天貨會變', () => {
    const days = ['2026-11-8', '2026-11-9', '2026-11-10', '2026-11-11'].map((d) => dailyDeals(d, 'mage').map((x) => x.item.id).join());
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('旅行商人限購（v1.96）：買滿就沒了，換日重算', () => {
    const log = { day: '', bought: {} as Record<string, number> };
    expect(merchantLeft(log, 'd1', 'x')).toBe(DAILY.limit);
    for (let i = 0; i < DAILY.limit; i++) recordMerchant(log, 'd1', 'x');
    expect(merchantLeft(log, 'd1', 'x')).toBe(0);
    expect(merchantLeft(log, 'd1', 'y')).toBe(DAILY.limit);
    expect(merchantLeft(log, 'd1', 'bundle')).toBe(DAILY.bundleLimit);
    expect(merchantLeft(log, 'd2', 'x')).toBe(DAILY.limit);
    recordMerchant(log, 'd2', 'y');
    expect(log.day).toBe('d2');
    expect(log.bought.x).toBeUndefined();
  });
});
