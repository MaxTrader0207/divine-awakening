import { describe, expect, it } from 'vitest';
import { newGameState } from './GameState';
import { LocalSave, SaveSlots, SLOT_COUNT, migrate, type KV } from './SaveSystem';

function memKV(init: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
}

describe('SaveSlots 多存檔', () => {
  it('共 10 格，預設第 1 格、全部是空的', () => {
    const s = new SaveSlots(memKV());
    expect(SLOT_COUNT).toBe(10);
    expect(s.active).toBe(1);
    expect(s.list().every((i) => i.empty)).toBe(true);
  });

  it('各格互不影響，切換使用中欄位', () => {
    const kv = memKV();
    const s = new SaveSlots(kv);
    const a = newGameState('mage');
    a.level = 7;
    const b = newGameState('archer');
    b.level = 15;
    s.write(1, a);
    s.write(4, b);
    expect(s.load(1)!.level).toBe(7);
    expect(s.load(4)!.heroClass).toBe('archer');
    expect(s.info(2).empty).toBe(true);
    s.setActive(4);
    expect(new LocalSave(new SaveSlots(kv)).load()!.level).toBe(15);
    expect(s.setActive(11)).toBe(false);
  });

  it('複製與刪除', () => {
    const s = new SaveSlots(memKV());
    const a = newGameState();
    a.gold = 999;
    s.write(2, a);
    expect(s.copy(2, 5)).toBe(true);
    expect(s.load(5)!.gold).toBe(999);
    s.delete(2);
    expect(s.info(2).empty).toBe(true);
    expect(s.load(5)!.gold).toBe(999);
    expect(s.copy(3, 1)).toBe(false); // 空的不能複製
  });

  it('舊版單一存檔自動搬到第 1 格', () => {
    const old = newGameState();
    old.level = 12;
    const kv = memKV({ 'little-mage.save.v1': JSON.stringify(old) });
    const s = new SaveSlots(kv);
    expect(s.load(1)!.level).toBe(12);
    expect(kv.data['little-mage.save.v1']).toBeUndefined();
    expect(s.active).toBe(1);
  });

  it('損壞的存檔不會讓遊戲掛掉', () => {
    const s = new SaveSlots(memKV({ 'little-mage.save.slot3': '{壞掉' }));
    expect(s.load(3)).toBeNull();
    expect(s.info(3).corrupt).toBe(true);
  });

  it('沒有 localStorage（無痕 / 封鎖）時照常運作', () => {
    const s = new SaveSlots(null);
    expect(s.write(1, newGameState())).toBe(false);
    expect(s.load(1)).toBeNull();
    expect(s.list()).toHaveLength(SLOT_COUNT);
  });
});

describe('擴充為 10 格', () => {
  it('第 6~10 格可以存讀，舊的第 1~5 格資料不受影響', () => {
    const kv = memKV();
    const s = new SaveSlots(kv);
    const old = newGameState('knight');
    old.level = 9;
    s.write(3, old);
    const a = newGameState('summoner');
    a.level = 21;
    expect(s.write(10, a)).toBe(true);
    expect(s.setActive(10)).toBe(true);
    expect(s.active).toBe(10);
    expect(s.load(10)!.heroClass).toBe('summoner');
    expect(s.load(3)!.level).toBe(9);
    expect(kv.data['little-mage.save.slot3']).toBeTruthy();
    expect(s.write(11, a)).toBe(false);
    expect(s.list().filter((i) => !i.empty).map((i) => i.slot)).toEqual([3, 10]);
  });
});

describe('存檔 v6 / v7', () => {
  it('舊存檔補上左手模式與介面大小的預設值，原本的設定保留', () => {
    const old = migrate({ version: 5, level: 2, settings: { zoom: 1.3, showFps: true, musicVolume: 0.2, sfxVolume: 0.4, quality: 'low' } } as never)!;
    expect(old.version).toBe(7);
    expect(old.settings.vibration).toBe(true);
    expect(old.settings.leftHanded).toBe(false);
    expect(old.settings.uiScale).toBe(1);
    expect(old.settings.zoom).toBe(1.3);
  });
});
