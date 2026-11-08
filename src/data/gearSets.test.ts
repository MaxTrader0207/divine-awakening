import { describe, expect, it } from 'vitest';
import { CLASS_LIST } from './classes';
import { GEAR_SETS, equippedSets, setBonusTotal, setOf, setTiers } from './gearSets';
import { ITEM_BASES, SLOT_ORDER } from './items';
import { newGameState } from '@/core/GameState';
import { computeStats } from '@/systems/Inventory';
import { GEM_SHOP, buyGemItem, goldBag, setToComplete } from '@/systems/GemShop';

describe('套裝效果', () => {
  it('每個職業 20 套，每套 6 件都存在、同一階', () => {
    expect(GEAR_SETS.size).toBe(CLASS_LIST.length * 20);
    for (const set of GEAR_SETS.values()) {
      for (const slot of SLOT_ORDER) {
        const b = ITEM_BASES[set.pieces[slot]];
        expect(b, set.pieces[slot]).toBeTruthy();
        expect(b.tier).toBe(set.tier);
        expect(setOf(b.id)?.id).toBe(set.id);
      }
      expect(set.name.length).toBeGreaterThan(2);
    }
    expect(setOf('weapon_t3')).toBeUndefined();
    expect(GEAR_SETS.get('mage_14')!.name).toBe('烏拉諾斯套裝');
  });

  it('2 / 4 / 6 件分段生效，屬性確實提高', () => {
    const s = newGameState('mage');
    s.level = 60;
    s.equipment = {};
    const set = GEAR_SETS.get('mage_14')!;
    const base = computeStats(s);
    s.equipment.weapon = { uid: 1, base: set.pieces.weapon, rarity: 'rare', plus: 0 };
    expect(setBonusTotal(s.equipment)).toEqual({});
    s.equipment.hat = { uid: 2, base: set.pieces.hat, rarity: 'rare', plus: 0 };
    expect(setBonusTotal(s.equipment)).toEqual(setTiers(set)[0].bonus);
    s.equipment.robe = { uid: 3, base: set.pieces.robe, rarity: 'rare', plus: 0 };
    s.equipment.gloves = { uid: 4, base: set.pieces.gloves, rarity: 'rare', plus: 0 };
    expect(setBonusTotal(s.equipment).atk).toBeGreaterThanOrEqual(0.06);
    s.equipment.boots = { uid: 5, base: set.pieces.boots, rarity: 'rare', plus: 0 };
    s.equipment.ring = { uid: 6, base: set.pieces.ring, rarity: 'rare', plus: 0 };
    expect(equippedSets(s.equipment)[0].count).toBe(6);
    const six = computeStats(s);
    s.equipment.ring = { uid: 6, base: 'ring_t6', rarity: 'rare', plus: 0 };
    const five = computeStats(s);
    expect(six.atk).toBeGreaterThan(five.atk);
    expect(five.atk).toBeGreaterThan(base.atk);
  });
});

describe('鑽石商店', () => {
  it('鑽石不夠不能買、買了扣鑽石', () => {
    const s = newGameState('archer');
    s.level = 30;
    s.gems = 5;
    expect(buyGemItem(s, 'gold').ok).toBe(false);
    s.gems = 200;
    const g = s.gold;
    expect(buyGemItem(s, 'gold').ok).toBe(true);
    expect(s.gold).toBe(g + goldBag(30));
    expect(s.gems).toBe(190);
    const r = buyGemItem(s, 'mythic', () => 0.5);
    expect(r.ok).toBe(true);
    expect(s.inventory.some((it) => ITEM_BASES[it.base].named && ITEM_BASES[it.base].cls === 'archer')).toBe(true);
    expect(s.gems).toBe(130);
  });

  it('套裝補完只補身上那套缺的部位；沒穿神話裝不能買', () => {
    const s = newGameState('knight');
    s.level = 50;
    s.gems = 500;
    expect(buyGemItem(s, 'setPiece').ok).toBe(false);
    const set = GEAR_SETS.get('knight_11')!;
    s.equipment = { weapon: { uid: 1, base: set.pieces.weapon, rarity: 'rare', plus: 0 }, hat: { uid: 2, base: set.pieces.hat, rarity: 'rare', plus: 0 } };
    expect(setToComplete(s)!.missing).toEqual(['robe', 'gloves', 'boots', 'ring']);
    expect(buyGemItem(s, 'setPiece', () => 0).ok).toBe(true);
    expect(s.inventory.at(-1)!.base).toBe(set.pieces.robe);
  });

  it('沒帶夥伴不能買神饌禮盒；每個商品都有說明', () => {
    const s = newGameState('mage');
    s.gems = 100;
    expect(buyGemItem(s, 'petGift').ok).toBe(false);
    s.companions.owned = ['pegasus'];
    s.companions.active = 'pegasus';
    expect(buyGemItem(s, 'petGift').ok).toBe(true);
    expect(s.companions.growth.pegasus.bond).toBe(10);
    for (const g of GEM_SHOP) expect(g.desc(s).length).toBeGreaterThan(3);
  });
});
