import { describe, expect, it } from 'vitest';
import { CLASS_CONSUMABLES, CONSUMABLES, MAX_STACK, consumablesFor, rollConsumable } from '@/data/consumables';
import { CLASS_LIST } from '@/data/classes';
import { addConsumable, autoQuickSlots, cannotUse, consume, setQuickSlot, type UseContext } from './Consumables';
import { migrate } from '@/core/SaveSystem';
import { newGameState, SAVE_VERSION } from '@/core/GameState';

const field: UseContext = { safe: false, bossFight: false, hpFull: false, mpFull: false, potionCd: false, alive: true };

describe('道具', () => {
  it('共 20 種，id 與名稱不重複', () => {
    expect(CONSUMABLES).toHaveLength(20);
    expect(new Set(CONSUMABLES.map((c) => c.id)).size).toBe(20);
    expect(new Set(CONSUMABLES.map((c) => c.name)).size).toBe(20);
  });

  it('使用會扣數量，用完就不能用', () => {
    const bag = { consumables: {} as Record<string, number> };
    addConsumable(bag, 'ambrosia', 2);
    expect(consume(bag, 'ambrosia', field)?.id).toBe('ambrosia');
    expect(bag.consumables.ambrosia).toBe(1);
    consume(bag, 'ambrosia', field);
    expect(bag.consumables.ambrosia).toBeUndefined();
    expect(cannotUse(bag, 'ambrosia', field)).toContain('用完');
  });

  it('不能用的情況：血滿喝神饌、藥水冷卻、城裡用回城羽毛、首領戰傳送', () => {
    const bag = { consumables: { ambrosia: 1, hermes_feather: 1, wine: 1 } };
    expect(cannotUse(bag, 'ambrosia', { ...field, hpFull: true })).toBe('HP 已滿');
    expect(cannotUse(bag, 'wine', { ...field, hpFull: true })).toBeNull(); // MP 沒滿還是有用
    expect(cannotUse(bag, 'ambrosia', { ...field, potionCd: true })).toBe('藥水冷卻中');
    expect(cannotUse(bag, 'hermes_feather', { ...field, safe: true })).toBe('已經在城裡了');
    expect(cannotUse(bag, 'hermes_feather', { ...field, bossFight: true })).toBe('首領戰中不能傳送');
    expect(consume(bag, 'hermes_feather', { ...field, safe: true })).toBeNull();
    expect(bag.consumables.hermes_feather).toBe(1);
  });

  it('掉落依權重，便宜的比較常見', () => {
    const n: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) {
      const id = rollConsumable();
      n[id] = (n[id] ?? 0) + 1;
    }
    expect(Object.keys(n)).toHaveLength(20);
    expect(n.hestia_bread).toBeGreaterThan(n.muse_honey * 3);
  });

  it('存檔 v8：新遊戲有新手道具，舊存檔送見面禮、加成歸零', () => {
    expect(newGameState('mage').consumables.hestia_bread).toBe(2);
    const old = migrate({ version: 7, level: 9 } as never)!;
    expect(old.version).toBe(SAVE_VERSION);
    expect(old.consumables).toEqual({ ambrosia: 2, hermes_feather: 1 });
    expect(old.boosts).toEqual({ exp: 0, gold: 0 });
    const kept = migrate({ version: 8, consumables: { nectar: 3 }, boosts: { exp: 120, gold: 0 } } as never)!;
    expect(kept.consumables).toEqual({ nectar: 3 });
    expect(kept.boosts.exp).toBe(120);
  });

  it('每個職業各有 20 種專屬道具，所有道具名稱不重複', () => {
    for (const cls of CLASS_LIST) {
      expect(CLASS_CONSUMABLES.filter((c) => c.cls === cls)).toHaveLength(20);
      expect(consumablesFor(cls)).toHaveLength(40);
    }
    const names = [...CONSUMABLES, ...CLASS_CONSUMABLES].map((c) => c.name);
    expect(new Set(names).size).toBe(20 + CLASS_LIST.length * 20);
    expect(new Set([...CONSUMABLES, ...CLASS_CONSUMABLES].map((c) => c.id)).size).toBe(20 + CLASS_LIST.length * 20);
  });

  it('掉落只會出現共用或自己職業的道具', () => {
    for (let i = 0; i < 3000; i++) {
      const id = rollConsumable(Math.random, 'knight');
      expect(id.startsWith('knight_') || CONSUMABLES.some((c) => c.id === id)).toBe(true);
    }
  });

  it('每種最多 99 個；城裡不能用範圍攻擊道具', () => {
    const bag = { consumables: { mage_promethean_fire: MAX_STACK - 1 } as Record<string, number> };
    expect(addConsumable(bag, 'mage_promethean_fire')).toBe(true);
    expect(addConsumable(bag, 'mage_promethean_fire')).toBe(false);
    expect(bag.consumables.mage_promethean_fire).toBe(99);
    expect(cannotUse(bag, 'mage_promethean_fire', { ...field, safe: true })).toBe('城裡沒有敵人');
    expect(cannotUse({ consumables: { berserker_thracian_spirit: 1 } }, 'berserker_thracian_spirit', { ...field, hpFull: true, mpFull: true })).toBe('怒氣已滿');
  });
});

describe('快捷道具欄', () => {
  it('自動挑數量最多的兩種，回城羽毛排最後', () => {
    expect(autoQuickSlots({ hermes_feather: 9, hestia_bread: 2, ambrosia: 5 })).toEqual(['ambrosia', 'hestia_bread']);
    expect(autoQuickSlots({ hermes_feather: 1 })).toEqual(['hermes_feather', null]);
    expect(autoQuickSlots({})).toEqual([null, null]);
  });
  it('放入、交換、再按一次取下', () => {
    let q = setQuickSlot([null, null], 0, 'ambrosia');
    expect(q).toEqual(['ambrosia', null]);
    q = setQuickSlot(q, 1, 'hestia_bread');
    expect(q).toEqual(['ambrosia', 'hestia_bread']);
    q = setQuickSlot(q, 1, 'ambrosia'); // 已在第 1 格 → 兩格交換
    expect(q).toEqual(['hestia_bread', 'ambrosia']);
    q = setQuickSlot(q, 1, 'ambrosia'); // 同一格再按 → 取下
    expect(q).toEqual(['hestia_bread', null]);
  });
});

describe('道具冷卻（v1.106）', () => {
  it('無敵、增益不能連續使用；增益同時最多 3 種', async () => {
    const { CONSUMABLE_MAP, cdGroup, cdSeconds, ITEM_CD, MAX_ACTIVE_BUFFS } = await import('@/data/consumables');
    const bag = { consumables: { mage_hades_cap_shard: 5, mage_metis_draught: 5, mage_owl_feather: 5 } } as never;
    const f = { safe: false, bossFight: true, hpFull: true, mpFull: true, potionCd: false, alive: true };
    const inv = CONSUMABLE_MAP.mage_hades_cap_shard;
    expect(cdGroup(inv)).toBe('invuln');
    expect(cdSeconds(inv)).toBe(ITEM_CD.invuln);
    expect(cannotUse(bag, 'mage_hades_cap_shard', { ...f, itemCd: {} })).toBeNull();
    expect(cannotUse(bag, 'mage_hades_cap_shard', { ...f, itemCd: { invuln: 30 } })).toContain('冷卻中');
    // 增益：同屬性冷卻 = 持續時間 × 1.5
    const crit = CONSUMABLE_MAP.mage_metis_draught;
    expect(cdGroup(crit)).toBe('buff:crit');
    expect(cdSeconds(crit)).toBe(90);
    expect(cannotUse(bag, 'mage_metis_draught', { ...f, itemCd: { 'buff:crit': 10 } })).toContain('冷卻中');
    // 已經有 3 種增益時不能再加第 4 種
    const three = ['atk', 'def', 'pen'].slice(0, MAX_ACTIVE_BUFFS);
    expect(cannotUse(bag, 'mage_owl_feather', { ...f, itemCd: {}, activeBuffs: three })).toContain('同時最多');
    expect(cannotUse(bag, 'mage_owl_feather', { ...f, itemCd: {}, activeBuffs: ['atk', 'critDmg', 'pen'] })).toBeNull();
  });
});
