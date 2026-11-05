import { describe, expect, it } from 'vitest';
import { CLASS_GEAR } from './gear';
import { ITEM_BASES, MP_TO_HP, NAMED_BUDGET, SLOT_ORDER, applyClassGear, namedGearIds, statScore } from './items';
import { CLASS_LIST } from './classes';
import { rollDrop } from '@/systems/LootTable';

describe('職業裝備', () => {
  it('每個職業、每個欄位都有 20 件神話裝，名稱不重複', () => {
    const all = new Set<string>();
    for (const cls of CLASS_LIST) {
      for (const slot of SLOT_ORDER) {
        const names = CLASS_GEAR[cls].named[slot];
        expect(names).toHaveLength(20);
        for (const n of names) {
          expect(all.has(n), `重複的名稱：${n}`).toBe(false);
          all.add(n);
        }
      }
    }
    expect(all.size).toBe(CLASS_LIST.length * 6 * 20);
  });

  it('神話裝比同階標準裝略強（預算 ×1.08，容許取整誤差），但不超過下一階', () => {
    for (const b of Object.values(ITEM_BASES)) {
      if (!b.named) continue;
      const std = statScore(ITEM_BASES[`${b.slot}_t${b.tier}`].stats);
      const s = statScore(b.stats);
      expect(s).toBeGreaterThan(std * 0.92);
      expect(s).toBeLessThan(std * NAMED_BUDGET * 1.15);
      if (b.tier < 8) expect(s).toBeLessThan(statScore(ITEM_BASES[`${b.slot}_t${b.tier + 1}`].stats));
    }
  });

  it('怒氣職業（狂戰士）的裝備不帶 MP，換成等值的 HP；換回其他職業會還原', () => {
    applyClassGear('berserker');
    expect(ITEM_BASES.hat_t1.stats.maxMp).toBeUndefined();
    expect(ITEM_BASES.hat_t1.stats.maxHp).toBe(Math.round(20 * MP_TO_HP));
    for (const b of Object.values(ITEM_BASES)) if (b.cls === 'berserker') expect(b.stats.maxMp).toBeUndefined();
    applyClassGear('mage');
    expect(ITEM_BASES.hat_t1.stats.maxMp).toBe(20);
    expect(ITEM_BASES.hat_t1.stats.maxHp).toBeUndefined();
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
    expect(namedGearIds('mage', 'weapon', 5)).toHaveLength(3);
    expect(namedGearIds('mage', 'weapon', 6)).toHaveLength(2);
  });

  it('裝備 8 階：每階都比上一階強；第 5~8 階有掉落', () => {
    for (const slot of SLOT_ORDER)
      for (let t = 2; t <= 8; t++) expect(statScore(ITEM_BASES[`${slot}_t${t}`].stats)).toBeGreaterThan(statScore(ITEM_BASES[`${slot}_t${t - 1}`].stats));
    expect(ITEM_BASES[rollDrop(6, true, () => 0.99, 'mage')!.base].tier).toBe(6);
    expect(ITEM_BASES[rollDrop(8, true, () => 0.99, 'mage')!.base].tier).toBe(8);
    expect(ITEM_BASES[rollDrop(11, true, () => 0.99)!.base].tier).toBe(8); // 超過上限會被限制在 8
    expect(namedGearIds('mage', 'weapon', 7)).toHaveLength(3);
    expect(namedGearIds('mage', 'weapon', 8)).toHaveLength(2);
    applyClassGear('knight');
    expect(ITEM_BASES.weapon_t6.name).toBe('卡俄斯長劍');
    expect(ITEM_BASES.weapon_t8.name).toBe('神格長劍');
    applyClassGear('summoner');
    expect(ITEM_BASES.ring_t6.name).toBe('冥王護符');
    expect(ITEM_BASES.ring_t7.name).toBe('斯堤克斯護符');
    applyClassGear('mage');
  });
});
