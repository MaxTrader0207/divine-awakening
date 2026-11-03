import { describe, expect, it } from 'vitest';
import { CLASS_GEAR } from './gear';
import { ITEM_BASES, NAMED_BUDGET, SLOT_ORDER, applyClassGear, namedGearIds, statScore } from './items';
import { CLASS_LIST } from './classes';
import { rollDrop } from '@/systems/LootTable';

describe('職業裝備', () => {
  it('每個職業、每個欄位都有 10 件神話裝，名稱不重複', () => {
    const all = new Set<string>();
    for (const cls of CLASS_LIST) {
      for (const slot of SLOT_ORDER) {
        const names = CLASS_GEAR[cls].named[slot];
        expect(names).toHaveLength(10);
        for (const n of names) {
          expect(all.has(n), `重複的名稱：${n}`).toBe(false);
          all.add(n);
        }
      }
    }
    expect(all.size).toBe(300);
  });

  it('神話裝比同階標準裝略強（預算 ×1.08，容許取整誤差），但不超過下一階', () => {
    for (const b of Object.values(ITEM_BASES)) {
      if (!b.named) continue;
      const std = statScore(ITEM_BASES[`${b.slot}_t${b.tier}`].stats);
      const s = statScore(b.stats);
      expect(s).toBeGreaterThan(std * 0.92);
      expect(s).toBeLessThan(std * NAMED_BUDGET * 1.15);
      if (b.tier < 4) expect(s).toBeLessThan(statScore(ITEM_BASES[`${b.slot}_t${b.tier + 1}`].stats));
    }
  });

  it('標準裝依職業改名（騎士的帽子是頭盔）', () => {
    applyClassGear('knight');
    expect(ITEM_BASES.hat_t1.name).toBe('阿卡迪亞頭盔');
    expect(ITEM_BASES.weapon_t4.name).toBe('奧林帕斯長劍');
    applyClassGear('summoner');
    expect(ITEM_BASES.ring_t4.name).toBe('塔爾塔洛斯護符');
    applyClassGear('mage');
  });

  it('掉落只會出現自己職業的神話裝', () => {
    let named = 0;
    for (let i = 0; i < 3000; i++) {
      const d = rollDrop(3, true, Math.random, 'archer')!;
      const b = ITEM_BASES[d.base];
      expect(b).toBeTruthy();
      if (b.named) {
        named++;
        expect(b.cls).toBe('archer');
        expect(b.tier).toBe(3);
      }
    }
    expect(named).toBeGreaterThan(1500);
    expect(namedGearIds('mage', 'weapon', 4)).toHaveLength(2);
  });
});
