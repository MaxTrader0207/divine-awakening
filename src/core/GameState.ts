import type { EquipSlot, ZoneId } from '@/data/types';
import type { ItemInstance } from '@/systems/Inventory';
import type { DailyState } from '@/systems/DailyQuests';
import { newTutorial, type TutorialState } from '@/systems/Tutorial';
import { CLASSES, type HeroClass } from '@/data/classes';
import type { ClearRecord } from '@/systems/StageClear';
import { DUNGEON_ORDER, ZONES } from '@/data/zones';

/**
 * GameState：唯一需要存檔的「玩家進度」資料。
 * 規範：
 * - 只放可序列化的純資料（不放 Three.js 物件）。
 * - 欄位變更時，必須把 SAVE_VERSION +1 並在 SaveSystem.migrate() 補遷移。
 */
export const SAVE_VERSION = 9;

export interface Settings {
  zoom: number; // 攝影機縮放 0.8 ~ 1.5
  showFps: boolean;
  musicVolume: number;
  sfxVolume: number;
  /** 畫質：auto / high / medium / low */
  quality: 'auto' | 'high' | 'medium' | 'low';
  /** v6：左手模式（搖桿在右、技能在左） */
  leftHanded: boolean;
  /** v6：介面大小 0.9 ~ 1.2 */
  uiScale: number;
  /** v7：震動回饋（被重擊、首領放大招、升級、倒地） */
  vibration: boolean;
}

export interface GameState {
  version: number;
  createdAt: number;
  updatedAt: number;
  playerName: string;
  /** v4：職業 */
  heroClass: HeroClass;
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
  /** v3：每日任務（沒有或過期時由 ensureToday 產生） */
  daily?: DailyState;
  /** v8：道具（消耗品）數量，id → 個數 */
  consumables: Record<string, number>;
  /** v8：長時間加成的剩餘秒數（遊戲時間；謬思蜂蜜、堤喀金幣） */
  boosts: { exp: number; gold: number };
  /** v5：新手指引進度 */
  tutorial: TutorialState;
  /** v9：每個關卡的破關紀錄（次數、最快時間、最佳評價） */
  clears: Partial<Record<ZoneId, ClearRecord>>;
  /** 統計（結算畫面、平衡用） */
  stats: { kills: number; deaths: number; playTime: number };
  settings: Settings;
}

export function newGameState(heroClass: HeroClass = 'mage'): GameState {
  const now = Date.now();
  return {
    heroClass,
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    playerName: heroClass === 'mage' ? '小法師' : `小${CLASSES[heroClass].name}`,
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
    clears: {},
    tutorial: newTutorial(),
    // 新手先送幾個道具，讓玩家知道有這個東西
    consumables: { hestia_bread: 2, hermes_feather: 1 },
    boosts: { exp: 0, gold: 0 },
    stats: { kills: 0, deaths: 0, playTime: 0 },
    settings: { zoom: 1.1, showFps: false, musicVolume: 0.5, sfxVolume: 0.8, quality: 'auto', leftHanded: false, uiScale: 1, vibration: true },
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
