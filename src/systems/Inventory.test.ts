import { CRIT_DMG_MAX, CRIT_RATE_MAX, ENHANCE_CAP, ENHANCE_NAMED_BONUS, ITEM_BASES, PEN_MAX, SLOT_ORDER } from '@/data/items';
import type { Rarity } from '@/data/types';
import { CLASS_LIST } from '@/data/classes';
import { describe, expect, it } from 'vitest';
import { addItem, autoSellPrice, computeStats, enhance, equip, itemName, itemStats, junkItems, sell, sellJunk, unequip, INVENTORY_SIZE, type InventoryState } from './Inventory';
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
    expect(itemName(e)).toBe('史詩・阿卡迪亞法杖 +5');
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

  it('一鍵賣出（v1.98）：可選稀有度上限；身上沒穿的部位、★神話裝不賣', () => {
    const s = fresh();
    equip(s, addItem(s, 'weapon_t3', 'rare')!.uid);
    addItem(s, 'weapon_t1', 'common'); // 普通 → 賣
    addItem(s, 'weapon_t2', 'fine'); // 精良：只有選「精良以下」才賣
    addItem(s, 'hat_t1', 'common'); // 帽子沒穿 → 留
    expect(junkItems(s, 'common').map((i) => i.base)).toEqual(['weapon_t1']);
    expect(junkItems(s, 'fine').map((i) => i.base).sort()).toEqual(['weapon_t1', 'weapon_t2']);
    const named = Object.keys(ITEM_BASES).find((k) => ITEM_BASES[k].named && ITEM_BASES[k].slot === 'weapon' && (ITEM_BASES[k].tier ?? 1) === 1);
    if (named) {
      addItem(s, named, 'common');
      expect(junkItems(s, 'rare').some((i) => i.base === named)).toBe(false);
    }
    expect(sellJunk(s, 'common').count).toBe(1);
  });

  it('強化成功 / 失敗 / 鑽石保證', () => {
    const s = fresh();
    const it = addItem(s, 'gloves_t1', 'epic', 9)!;
    expect(enhance(s, it.uid, false, () => 0.99)).toBe('fail');
    expect(it.plus).toBe(9);
    expect(enhance(s, it.uid, true, () => 0.99)).toBe('success');
    expect(it.plus).toBe(10);
    expect(enhance(s, it.uid)).toBe('max');
  });

  it('v1.105 強化上限依稀有度，★神話裝多 2 級', () => {
    const s = fresh();
    s.gold = 1e9;
    for (const [r, cap] of Object.entries(ENHANCE_CAP) as [Rarity, number][]) {
      const it = addItem(s, 'weapon_t3', r, 99)!;
      expect(it.plus).toBe(cap); // 加進背包時就夾在上限
      expect(enhance(s, it.uid, true)).toBe('max');
    }
    const named = addItem(s, 'mage_weapon_20', 'epic', 99)!;
    expect(named.plus).toBe(ENHANCE_CAP.epic + ENHANCE_NAMED_BONUS);
  });

  it('v1.105 百分比屬性不吃強化；標準裝怎麼堆都碰不到上限', () => {
    const a = itemStats({ uid: 1, base: 'ring_t8', rarity: 'epic', plus: 0 });
    const b = itemStats({ uid: 2, base: 'ring_t8', rarity: 'epic', plus: 10 });
    expect(b.pen).toBeCloseTo(a.pen!);
    expect(b.critDmg).toBeCloseTo(a.critDmg!);
    for (const cls of CLASS_LIST) {
      const s = { ...fresh(), heroClass: cls, level: 150 };
      for (const sl of SLOT_ORDER) s.equipment[sl] = { uid: 100, base: `${sl}_t8`, rarity: 'epic', plus: 10 };
      const st = computeStats(s);
      expect(st.critRate, cls).toBeLessThan(CRIT_RATE_MAX);
      expect(st.critDmg, cls).toBeLessThan(CRIT_DMG_MAX);
      expect(st.pen, cls).toBeLessThan(PEN_MAX);
    }
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

describe('狂戰士怒氣上限', () => {
  it('怒氣上限固定 100，不受等級與裝備 MP 影響', () => {
    const s: InventoryState = { inventory: [], equipment: { hat: { uid: 1, base: 'hat_t3', rarity: 'epic', plus: 5 } }, nextUid: 2, gold: 0, gems: 0, level: 20, heroClass: 'berserker' };
    expect(computeStats(s).maxMp).toBe(100);
    expect(computeStats({ ...s, heroClass: 'mage' }).maxMp).toBeGreaterThan(100);
  });
});

describe('撿到時自動賣出（v1.80）', () => {
  it('只賣稀有度以下、比身上差的；身上沒裝備、比較好、★神話裝都不賣', () => {
    const s = fresh();
    s.heroClass = 'mage';
    // 身上沒武器：不賣
    expect(autoSellPrice(s, 'weapon_t3', 'common', 'fine')).toBe(0);
    s.equipment.weapon = { uid: 99, base: 'weapon_t5', rarity: 'rare', plus: 0 };
    expect(autoSellPrice(s, 'weapon_t3', 'common', 'fine')).toBeGreaterThan(0);
    expect(autoSellPrice(s, 'weapon_t3', 'common', 'off')).toBe(0);
    // 稀有度超過設定：不賣
    expect(autoSellPrice(s, 'weapon_t3', 'rare', 'fine')).toBe(0);
    // 比身上好：不賣
    expect(autoSellPrice(s, 'weapon_t8', 'fine', 'fine')).toBe(0);
    // ★神話裝：不賣
    expect(autoSellPrice(s, 'mage_weapon_01', 'common', 'rare')).toBe(0);
  });
});
