import { describe, expect, it } from 'vitest';
import { addItem, computeStats, enhance, equip, itemName, itemStats, sell, sellJunk, unequip, INVENTORY_SIZE, type InventoryState } from './Inventory';
import { rollDrop } from './LootTable';
import { statsForLevel } from '@/data/player';

const fresh = (): InventoryState => ({ inventory: [], equipment: {}, nextUid: 1, gold: 10000, gems: 20, level: 1 });

describe('Inventory', () => {
  it('裝備後屬性增加，卸下後還原', () => {
    const s = fresh();
    const w = addItem(s, 'weapon_t1', 'common')!;
    expect(equip(s, w.uid)).toBe(true);
    expect(computeStats(s).atk).toBe(statsForLevel(1).atk + 8);
    expect(unequip(s, 'weapon')).toBe(true);
    expect(computeStats(s).atk).toBe(statsForLevel(1).atk);
  });

  it('替換裝備時舊的回到背包', () => {
    const s = fresh();
    const a = addItem(s, 'ring_t1', 'common')!;
    const b = addItem(s, 'ring_t2', 'rare')!;
    equip(s, a.uid);
    equip(s, b.uid);
    expect(s.equipment.ring?.uid).toBe(b.uid);
    expect(s.inventory.map((i) => i.uid)).toEqual([a.uid]);
  });

  it('稀有度與強化倍率', () => {
    const s = fresh();
    const c = addItem(s, 'weapon_t1', 'common')!;
    const e = addItem(s, 'weapon_t1', 'epic', 5)!;
    expect(itemStats(c).atk).toBe(8);
    expect(itemStats(e).atk).toBeCloseTo(8 * 2.2 * 1.4);
    expect(itemName(e)).toBe('史詩・見習法杖 +5');
  });

  it('穿透上限 90%', () => {
    const s = fresh();
    for (const b of ['hat_t3', 'ring_t3']) equip(s, addItem(s, b, 'epic', 10)!.uid);
    expect(computeStats(s).pen).toBeLessThanOrEqual(0.9);
  });

  it('背包滿了不能再加', () => {
    const s = fresh();
    for (let i = 0; i < INVENTORY_SIZE; i++) addItem(s, 'boots_t1', 'common');
    expect(addItem(s, 'boots_t1', 'common')).toBeNull();
  });

  it('賣出拿到金幣', () => {
    const s = fresh();
    const it = addItem(s, 'robe_t2', 'fine')!;
    const g = s.gold;
    const p = sell(s, it.uid);
    expect(p).toBeGreaterThan(0);
    expect(s.gold).toBe(g + p);
    expect(s.inventory).toHaveLength(0);
  });

  it('一鍵賣出不賣比身上好的', () => {
    const s = fresh();
    equip(s, addItem(s, 'weapon_t2', 'common')!.uid);
    addItem(s, 'weapon_t1', 'common'); // 較差 → 賣
    addItem(s, 'weapon_t3', 'common'); // 較好 → 留
    addItem(s, 'hat_t1', 'rare'); // 稀有 → 留
    const r = sellJunk(s, 'fine');
    expect(r.count).toBe(1);
    expect(s.inventory.map((i) => i.base).sort()).toEqual(['hat_t1', 'weapon_t3']);
  });

  it('強化成功 / 失敗 / 鑽石保證', () => {
    const s = fresh();
    const it = addItem(s, 'gloves_t1', 'common', 9)!;
    expect(enhance(s, it.uid, false, () => 0.99)).toBe('fail');
    expect(it.plus).toBe(9);
    expect(enhance(s, it.uid, true, () => 0.99)).toBe('success');
    expect(it.plus).toBe(10);
    expect(enhance(s, it.uid)).toBe('max');
  });

  it('金幣不足不能強化', () => {
    const s = { ...fresh(), gold: 0 };
    const it = addItem(s, 'gloves_t1', 'common')!;
    expect(enhance(s, it.uid)).toBe('no-gold');
  });
});

describe('rollDrop', () => {
  it('首領必掉精良以上', () => {
    for (let i = 0; i < 50; i++) {
      const d = rollDrop(2, true, Math.random)!;
      expect(d).not.toBeNull();
      expect(d.rarity).not.toBe('common');
      expect(d.base.endsWith('_t2')).toBe(true);
    }
  });

  it('小怪掉落率約 18%', () => {
    let n = 0;
    for (let i = 0; i < 4000; i++) if (rollDrop(1, false, Math.random)) n++;
    expect(n / 4000).toBeGreaterThan(0.14);
    expect(n / 4000).toBeLessThan(0.22);
  });
});
