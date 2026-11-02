import type { EquipSlot, ZoneId } from '@/data/types';
import type { ItemInstance } from '@/systems/Inventory';
import { DUNGEON_ORDER, ZONES } from '@/data/zones';

/**
 * GameState：唯一需要存檔的「玩家進度」資料。
 * 規範：
 * - 只放可序列化的純資料（不放 Three.js 物件）。
 * - 欄位變更時，必須把 SAVE_VERSION +1 並在 SaveSystem.migrate() 補遷移。
 */
export const SAVE_VERSION = 2;

export interface Settings {
  zoom: number; // 攝影機縮放 0.8 ~ 1.5
  showFps: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  updatedAt: number;
  playerName: string;
  level: number;
  exp: number;
  hp: number;
  mp: number;
  gold: number;
  gems: number;
  zoneId: ZoneId;
  pos: { x: number; z: number };
  /** 已擊敗首領的副本 */
  bossesDefeated: ZoneId[];
  potions: { hp: number; mp: number };
  /** v2：背包與裝備 */
  inventory: ItemInstance[];
  equipment: Partial<Record<EquipSlot, ItemInstance>>;
  nextUid: number;
  /** 統計（結算畫面、平衡用） */
  stats: { kills: number; deaths: number; playTime: number };
  settings: Settings;
}

export function newGameState(): GameState {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    playerName: '小法師',
    level: 1,
    exp: 0,
    hp: -1, // -1 = 滿血（載入時依屬性補滿）
    mp: -1,
    gold: 120,
    gems: 10,
    zoneId: 'town',
    pos: { ...ZONES.town.spawn },
    bossesDefeated: [],
    potions: { hp: 5, mp: 5 },
    // 新手裝：見習法杖
    inventory: [],
    equipment: { weapon: { uid: 1, base: 'weapon_t1', rarity: 'common', plus: 0 } },
    nextUid: 2,
    stats: { kills: 0, deaths: 0, playTime: 0 },
    settings: { zoom: 1.1, showFps: false, musicVolume: 0.5, sfxVolume: 0.8 },
  };
}

/** 副本是否已解鎖 */
export function isZoneUnlocked(state: GameState, id: ZoneId): boolean {
  const z = ZONES[id];
  const after = z.dungeon?.unlockAfter;
  if (!after) return true;
  return state.bossesDefeated.includes(after);
}

export { DUNGEON_ORDER };
