import type { GameState } from '@/core/GameState';
import type { HeroClass } from '@/data/classes';
import { CLASSES } from '@/data/classes';
import { ITEM_BASES, tierForLevel } from '@/data/items';
import { ZONES } from '@/data/zones';
import { MAX_LEVEL } from './Progression';
import { mythicOpen, newMythicState } from './Mythic';
import { INVENTORY_SIZE, itemScore, sell, type ItemInstance } from './Inventory';
import { autoQuickSlots } from './Consumables';
import { consumablesFor } from '@/data/consumables';

/**
 * 轉生（v1.83，純邏輯，可單元測試）
 * ------------------------------------------------------------
 * 條件：等級上限（v1.97 起 Lv.150）而且打倒過最終首領（第 30 層克洛諾斯）。轉生後：
 * - 回到 Lv.1、主線進度（打倒的首領、破關紀錄、神話難度紀錄）重來，可以換職業；
 * - 保留：背包與身上的裝備（全部收進背包）、金幣、鑽石、道具、夥伴、圖鑑、成就、神格、試煉塔與每週紀錄；
 * - 每轉生一次：攻擊 / 生命 / 防禦永久 +bonusPerRebirth、打怪經驗 +expPerRebirth、送鑽石；
 * - 轉生過的角色，裝備的階級不能超過目前等級的掉落階級（tierForLevel），要練回等級才能穿。
 * 套用：computeStats() 的 rebirthStatMul、Game.onEnemyKilled() 的 rebirthExpMul、Inventory.equip() 的 equipBlock。
 */
export const REBIRTH = {
  maxCount: 10,
  /** 每轉生一次的攻擊、生命、防禦加成 */
  bonusPerRebirth: 0.05,
  /** 每轉生一次的打怪經驗加成 */
  expPerRebirth: 0.2,
  /** 轉生時送的鑽石 */
  gems: 100,
};

export interface RebirthState {
  count: number;
  /** 每次轉生前的職業（紀錄用） */
  history: { cls: HeroClass; at: number }[];
}

export function newRebirthState(): RebirthState {
  return { count: 0, history: [] };
}

export function normalizeRebirth(v: unknown): RebirthState {
  const r = newRebirthState();
  if (!v || typeof v !== 'object') return r;
  const o = v as Partial<RebirthState>;
  r.count = Math.min(REBIRTH.maxCount, Math.max(0, Math.floor(Number(o.count) || 0)));
  if (Array.isArray(o.history)) r.history = o.history.filter((h) => h && typeof h.cls === 'string' && h.cls in CLASSES).slice(-REBIRTH.maxCount);
  return r;
}

/** 不能轉生的原因（null = 可以） */
export function rebirthBlocked(s: Pick<GameState, 'level' | 'bossesDefeated' | 'rebirth'>): string | null {
  if ((s.rebirth?.count ?? 0) >= REBIRTH.maxCount) return `已經轉生 ${REBIRTH.maxCount} 次（上限）`;
  if (s.level < MAX_LEVEL) return `需要 Lv.${MAX_LEVEL}`;
  if (!mythicOpen(s.bossesDefeated)) return '需要打倒最終首領';
  return null;
}

/** 攻擊 / 生命 / 防禦倍率 */
export function rebirthStatMul(count: number): number {
  return 1 + REBIRTH.bonusPerRebirth * Math.max(0, count);
}

/** 打怪經驗倍率 */
export function rebirthExpMul(count: number): number {
  return 1 + REBIRTH.expPerRebirth * Math.max(0, count);
}

/** 顯示用：「2轉」 */
export function rebirthLabel(count: number): string {
  return count > 0 ? `${count}轉` : '';
}

/** 轉生過的角色：裝備階級不能超過目前等級的掉落階級；回傳不能裝的原因 */
export function equipBlock(s: { level: number; rebirth?: RebirthState }, it: ItemInstance): string | null {
  if (!s.rebirth?.count) return null;
  const tier = ITEM_BASES[it.base]?.tier ?? 1;
  const allow = tierForLevel(s.level);
  if (tier <= allow) return null;
  let lv = s.level;
  while (lv < MAX_LEVEL && tierForLevel(lv) < tier) lv++;
  return `轉生後要 Lv.${lv} 才能裝備第 ${tier} 階`;
}

export interface RebirthResult {
  count: number;
  /** 背包放不下、換成金幣的件數與金幣 */
  sold: number;
  gold: number;
}

/** 執行轉生（直接改 state；呼叫端存檔後重新載入頁面） */
export function applyRebirth(s: GameState, cls: HeroClass, now = Date.now()): RebirthResult {
  const r = s.rebirth ?? newRebirthState();
  r.history.push({ cls: s.heroClass, at: now });
  r.count = Math.min(REBIRTH.maxCount, r.count + 1);
  s.rebirth = r;
  // 預設名字跟著新職業換（自己取的名字不動）
  const defName = (c: HeroClass) => (c === 'mage' ? '小法師' : `小${CLASSES[c].name}`);
  if (s.playerName === defName(s.heroClass)) s.playerName = defName(cls);
  s.heroClass = cls;
  s.level = 1;
  s.exp = 0;
  s.hp = -1;
  s.mp = -1;
  s.bossesDefeated = [];
  s.clears = {};
  s.mythic = newMythicState();
  s.zoneId = 'town';
  s.pos = { ...ZONES.town.spawn };
  delete s.daily; // 每日任務依新等級重新產生
  // 身上的裝備全部收進背包，換上新手武器；背包放不下的（最差的先）換成金幣
  for (const it of Object.values(s.equipment)) if (it) s.inventory.push(it);
  s.equipment = { weapon: { uid: s.nextUid++, base: 'weapon_t1', rarity: 'common', plus: 0 } };
  let sold = 0;
  let gold = 0;
  if (s.inventory.length > INVENTORY_SIZE) {
    const extra = [...s.inventory].sort((a, b) => itemScore(a) - itemScore(b)).slice(0, s.inventory.length - INVENTORY_SIZE);
    for (const it of extra) {
      gold += sell(s, it.uid);
      sold++;
    }
  }
  s.gems += REBIRTH.gems;
  // 快捷欄重新挑（舊職業的專屬道具新職業不能用）
  const usable = new Set(consumablesFor(cls).map((c) => c.id));
  s.quickSlots = autoQuickSlots(Object.fromEntries(Object.entries(s.consumables).filter(([id]) => usable.has(id))));
  return { count: r.count, sold, gold };
}
