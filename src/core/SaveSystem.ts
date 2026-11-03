import { newGameState, SAVE_VERSION, type GameState } from './GameState';
import { ZONES } from '@/data/zones';
import { tutorialForExisting } from '@/systems/Tutorial';
import type { HeroClass } from '@/data/classes';

/**
 * 本機存檔（localStorage），多存檔欄位
 * ------------------------------------------------------------
 * - 共 SLOT_COUNT 格：`little-mage.save.slot1` ~ `slot10`（v1.19 由 5 格擴充為 10 格，舊的 1~5 格不受影響）；目前使用中的欄位記在 `little-mage.activeSlot`。
 * - 舊版單一存檔（`little-mage.save.v1`）第一次啟動時自動搬到第 1 格。
 * - 所有讀寫都包 try/catch：無痕模式或封鎖儲存時遊戲仍可正常遊玩（只是不保存）。
 * - 雲端存檔：實作同樣的 SaveBackend 介面即可替換。
 */
export const SLOT_COUNT = 10;
const LEGACY_KEY = 'little-mage.save.v1';
const ACTIVE_KEY = 'little-mage.activeSlot';
const slotKey = (n: number) => `little-mage.save.slot${n}`;

export interface SaveBackend {
  load(): GameState | null;
  save(state: GameState): boolean;
  clear(): void;
}

/** 存檔欄位摘要（存檔畫面用，不必整份讀進來處理） */
export interface SlotInfo {
  slot: number;
  empty: boolean;
  heroClass?: HeroClass;
  playerName?: string;
  level?: number;
  zoneId?: string;
  playTime?: number;
  updatedAt?: number;
  bosses?: number;
  /** 讀得到但格式損壞 */
  corrupt?: boolean;
}

/** 只用到 localStorage 的這幾個方法（測試時可換成假的） */
export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const defaultKV = (): KV | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/** 存檔欄位管理：列出、切換、複製、刪除 */
export class SaveSlots {
  private kv: KV | null;

  constructor(kv?: KV | null) {
    this.kv = kv === undefined ? defaultKV() : kv;
    this.migrateLegacy();
  }

  private get(key: string): string | null {
    try {
      return this.kv?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private set(key: string, value: string): boolean {
    try {
      if (!this.kv) return false;
      this.kv.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  private remove(key: string) {
    try {
      this.kv?.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  /** 舊版單一存檔 → 第 1 格（第 1 格已有資料就不覆蓋） */
  private migrateLegacy() {
    const legacy = this.get(LEGACY_KEY);
    if (!legacy) return;
    if (!this.get(slotKey(1)) && this.set(slotKey(1), legacy)) {
      this.remove(LEGACY_KEY);
      if (!this.get(ACTIVE_KEY)) this.set(ACTIVE_KEY, '1');
    } else if (this.get(slotKey(1))) this.remove(LEGACY_KEY);
  }

  /** 目前使用中的欄位（1 ~ SLOT_COUNT） */
  get active(): number {
    const n = Number(this.get(ACTIVE_KEY));
    return Number.isInteger(n) && n >= 1 && n <= SLOT_COUNT ? n : 1;
  }

  setActive(n: number): boolean {
    if (!validSlot(n)) return false;
    return this.set(ACTIVE_KEY, String(n));
  }

  load(n: number): GameState | null {
    if (!validSlot(n)) return null;
    const raw = this.get(slotKey(n));
    if (!raw) return null;
    try {
      return migrate(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  write(n: number, state: GameState): boolean {
    if (!validSlot(n)) return false;
    state.updatedAt = Date.now();
    return this.set(slotKey(n), JSON.stringify(state));
  }

  /** 把 from 的進度複製到 to（覆蓋） */
  copy(from: number, to: number): boolean {
    if (from === to) return false;
    const st = this.load(from);
    return !!st && this.write(to, st);
  }

  delete(n: number) {
    if (validSlot(n)) this.remove(slotKey(n));
  }

  info(n: number): SlotInfo {
    const raw = this.get(slotKey(n));
    if (!raw) return { slot: n, empty: true };
    const st = this.load(n);
    if (!st) return { slot: n, empty: false, corrupt: true };
    return {
      slot: n,
      empty: false,
      heroClass: st.heroClass,
      playerName: st.playerName,
      level: st.level,
      zoneId: st.zoneId,
      playTime: st.stats.playTime,
      updatedAt: st.updatedAt,
      bosses: st.bossesDefeated.length,
    };
  }

  list(): SlotInfo[] {
    return Array.from({ length: SLOT_COUNT }, (_, i) => this.info(i + 1));
  }
}

const validSlot = (n: number) => Number.isInteger(n) && n >= 1 && n <= SLOT_COUNT;

/** 目前使用中欄位的存檔（Game 用這個；切換欄位時重新載入頁面） */
export class LocalSave implements SaveBackend {
  readonly slots: SaveSlots;

  constructor(slots = new SaveSlots()) {
    this.slots = slots;
  }

  get slot() {
    return this.slots.active;
  }

  load(): GameState | null {
    return this.slots.load(this.slot);
  }

  save(state: GameState): boolean {
    return this.slots.write(this.slot, state);
  }

  clear(): void {
    this.slots.delete(this.slot);
  }
}

/** 舊版存檔遷移。新增欄位時以預設值補齊，避免舊存檔壞掉 */
export function migrate(data: Partial<GameState>): GameState | null {
  if (!data || typeof data !== 'object') return null;
  const base = newGameState();
  const merged: GameState = {
    ...base,
    ...data,
    potions: { ...base.potions, ...(data.potions ?? {}) },
    settings: { ...base.settings, ...(data.settings ?? {}) },
    stats: { ...base.stats, ...(data.stats ?? {}) },
    version: SAVE_VERSION,
  };
  // v1 → v2：沒有背包欄位，補上新手法杖
  if ((data.version ?? 1) < 2 || !Array.isArray(data.inventory)) {
    merged.inventory = [];
    merged.equipment = base.equipment;
    merged.nextUid = base.nextUid;
  }
  if (!ZONES[merged.zoneId]) {
    merged.zoneId = 'town';
    merged.pos = { ...ZONES.town.spawn };
  }
  // v2 → v3：新增 daily（選填，進遊戲時自動產生），不需轉換
  // v3 → v4：新增職業，舊存檔都是法師
  if (!merged.heroClass) merged.heroClass = 'mage';
  // v4 → v5：新增新手指引；已經玩過一段（Lv.3 以上或打過首領）的視為完成、不顯示
  if (!data.tutorial || typeof data.tutorial !== 'object') merged.tutorial = tutorialForExisting(merged.level, merged.bossesDefeated ?? []);
  else merged.tutorial = { ...base.tutorial, ...data.tutorial };
  // v5 → v6：設定新增 leftHanded、uiScale（上面 settings 合併時已補預設值）
  // v6 → v7：設定新增 vibration（同上，合併時補預設值 true）
  // v7 → v8：新增道具與長時間加成；老玩家送 2 個神饌、1 根赫密士之羽當作見面禮
  if (!data.consumables || typeof data.consumables !== 'object') merged.consumables = (data.version ?? 1) < 8 ? { ambrosia: 2, hermes_feather: 1 } : {};
  merged.boosts = { exp: 0, gold: 0, ...(data.boosts ?? {}) };
  // v8 → v9：新增破關紀錄（舊存檔從零開始記錄，已擊敗的首領照樣保留）
  merged.clears = data.clears && typeof data.clears === 'object' ? { ...data.clears } : {};
  // 未來版本：if ((data.version ?? 0) < 10) { ... }
  return merged;
}
