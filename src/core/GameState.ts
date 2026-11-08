import type { EquipSlot, ZoneId } from '@/data/types';
import type { ItemInstance } from '@/systems/Inventory';
import type { DailyState } from '@/systems/DailyQuests';
import { newTutorial, type TutorialState } from '@/systems/Tutorial';
import { CLASSES, type HeroClass } from '@/data/classes';
import type { ClearRecord } from '@/systems/StageClear';
import { DUNGEON_ORDER, ZONES } from '@/data/zones';
import { newCompanionState, type CompanionState } from '@/data/companions';
import { newAchievementState, type AchievementState } from '@/systems/Achievements';
import { newLoginState, type LoginState } from '@/systems/Welcome';
import { newTowerState, type TowerState } from '@/systems/TrialTower';
import { newDivinityState, type DivinityState } from '@/systems/Divinity';
import { newMythicState, type MythicState } from '@/systems/Mythic';
import { newWeeklyState, type WeeklyState } from '@/systems/WeeklyBoss';
import { newReviveState, type ReviveState } from '@/systems/Revive';
import { newRebirthState, type RebirthState } from '@/systems/Rebirth';

/**
 * GameState：唯一需要存檔的「玩家進度」資料。
 * 規範：
 * - 只放可序列化的純資料（不放 Three.js 物件）。
 * - 欄位變更時，必須把 SAVE_VERSION +1 並在 SaveSystem.migrate() 補遷移。
 */
export const SAVE_VERSION = 29;

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
  /** v10：HP 低於這個比例自動喝紅藥水（0＝關閉，預設 0.7） */
  autoPotionAt: number;
  /** v22：畫面方向（auto＝手機橫拿就切橫式、portrait 固定直式、landscape 固定橫式） */
  orientation: 'auto' | 'portrait' | 'landscape';
  /** v23：撿到時自動賣出這個稀有度以下、比身上差的裝備（off＝關閉；★神話裝永遠不賣） */
  autoSell: 'off' | 'common' | 'fine' | 'rare';
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
  /** v11：左下快捷道具欄（2 格，道具 id；null = 空） */
  quickSlots: (string | null)[];
  /** v8：長時間加成的剩餘秒數（遊戲時間；謬思蜂蜜、堤喀金幣） */
  boosts: { exp: number; gold: number };
  /** v5：新手指引進度 */
  tutorial: TutorialState;
  /** v9：每個關卡的破關紀錄（次數、最快時間、最佳評價） */
  clears: Partial<Record<ZoneId, ClearRecord>>;
  /** v13：守護者夥伴（已收服、目前帶著的、收服保底次數） */
  companions: CompanionState;
  /** v14：怪物圖鑑（敵人 id → 擊殺數，見 data/codex.ts） */
  codex: Record<string, number>;
  /** v14：成就（已領取、已通知；進度從存檔算，見 data/achievements.ts） */
  achievements: AchievementState;
  /** v15：每日簽到（7 天一輪） */
  login: LoginState;
  /** v18：無盡試煉塔紀錄 */
  tower: TowerState;
  /** v19：神格等級（滿級後的經驗、點數分配） */
  divinity: DivinityState;
  /** v19：看過結局（打倒最終首領後播一次，選單可重看） */
  endingSeen: boolean;
  /** v20：神話難度（開關、神話破關紀錄） */
  mythic: MythicState;
  /** v21：每週首領挑戰（本週紀錄、已領獎勵的難度） */
  weekly: WeeklyState;
  /** v24：倒下後原地復活（每天的免費次數） */
  revive: ReviveState;
  /** v1.95 寶箱開啟時間（`區域:編號` → Date.now()），TREASURE.respawnMs 內不會重生；重新整理網頁也一樣 */
  treasures: Record<string, number>;
  /** v1.96 旅行商人當天已買的數量（日期不同就重算，data/shops.ts 的 merchantLeft / recordMerchant） */
  merchant: { day: string; bought: Record<string, number> };
  /** v25：轉生次數與紀錄 */
  rebirth: RebirthState;
  /** 統計（結算畫面、平衡、成就用；v14 新增 bossKills 以後的欄位，舊存檔從 0 開始） */
  stats: {
    kills: number;
    deaths: number;
    playTime: number;
    bossKills: number;
    enhanceOk: number;
    itemsUsed: number;
    questsDone: number;
    mythics: number;
    goldEarned: number;
  };
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
    companions: newCompanionState(),
    tutorial: newTutorial(),
    // 新手先送幾個道具，讓玩家知道有這個東西
    consumables: { hestia_bread: 2, hermes_feather: 1 },
    quickSlots: ['hestia_bread', 'hermes_feather'],
    boosts: { exp: 0, gold: 0 },
    codex: {},
    achievements: newAchievementState(),
    login: newLoginState(),
    tower: newTowerState(),
    divinity: newDivinityState(),
    endingSeen: false,
    mythic: newMythicState(),
    weekly: newWeeklyState(),
    revive: newReviveState(),
    treasures: {},
    merchant: { day: '', bought: {} },
    rebirth: newRebirthState(),
    stats: { kills: 0, deaths: 0, playTime: 0, bossKills: 0, enhanceOk: 0, itemsUsed: 0, questsDone: 0, mythics: 0, goldEarned: 0 },
    settings: { zoom: 1.1, showFps: false, musicVolume: 0.5, sfxVolume: 0.8, quality: 'auto', leftHanded: false, uiScale: 1, vibration: true, autoPotionAt: 0.7, orientation: 'auto', autoSell: 'common' },
  };
}

/** 副本 / 支線地圖是否已解鎖 */
export function isZoneUnlocked(state: GameState, id: ZoneId): boolean {
  const z = ZONES[id];
  const after = z.dungeon?.unlockAfter ?? z.side?.unlockAfter ?? z.beast?.unlockAfter;
  if (!after) return true;
  return state.bossesDefeated.includes(after);
}

export { DUNGEON_ORDER };
