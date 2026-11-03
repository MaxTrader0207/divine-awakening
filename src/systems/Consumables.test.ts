import { describe, expect, it } from 'vitest';
import { CLASS_CONSUMABLES, CONSUMABLES, MAX_STACK, consumablesFor, rollConsumable } from '@/data/consumables';
import { CLASS_LIST } from '@/data/classes';
import { addConsumable, cannotUse, consume, type UseContext } from './Consumables';
import { migrate } from '@/core/SaveSystem';
import { newGameState } from '@/core/GameState';

const field: UseContext = { safe: false, bossFight: false, hpFull: false, mpFull: false, potionCd: false, alive: true };

describe('道具', () => {
  it('共 15 種，id 與名稱不重複', () => {
    expect(CONSUMABLES).toHaveLength(15);
    expect(new Set(CONSUMABLES.map((c) => c.id)).size).toBe(15);
    expect(new Set(CONSUMABLES.map((c) => c.name)).size).toBe(15);
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
    expect(Object.keys(n)).toHaveLength(15);
    expect(n.hestia_bread).toBeGreaterThan(n.muse_honey * 3);
  });

  it('存檔 v8：新遊戲有新手道具，舊存檔送見面禮、加成歸零', () => {
    expect(newGameState('mage').consumables.hestia_bread).toBe(2);
    const old = migrate({ version: 7, level: 9 } as never)!;
    expect(old.version).toBe(8);
    expect(old.consumables).toEqual({ ambrosia: 2, hermes_feather: 1 });
    expect(old.boosts).toEqual({ exp: 0, gold: 0 });
    const kept = migrate({ version: 8, consumables: { nectar: 3 }, boosts: { exp: 120, gold: 0 } } as never)!;
    expect(kept.consumables).toEqual({ nectar: 3 });
    expect(kept.boosts.exp).toBe(120);
  });

  it('每個職業各有 15 種專屬道具，所有道具名稱不重複', () => {
    for (const cls of CLASS_LIST) {
      expect(CLASS_CONSUMABLES.filter((c) => c.cls === cls)).toHaveLength(15);
      expect(consumablesFor(cls)).toHaveLength(30);
    }
    const names = [...CONSUMABLES, ...CLASS_CONSUMABLES].map((c) => c.name);
    expect(new Set(names).size).toBe(90);
    expect(new Set([...CONSUMABLES, ...CLASS_CONSUMABLES].map((c) => c.id)).size).toBe(90);
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
