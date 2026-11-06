import type { Element } from './elements';
/**
 * 資料定義（Data Definitions）
 * ------------------------------------------------------------
 * 規範：所有「遊戲內容」都用純資料描述，放在 src/data/*.ts。
 * 程式（systems）只讀資料、不寫死內容。新增怪物、技能、地圖時
 * 原則上只改 data 檔，不改 system 程式。
 * 座標系：x 向右（東）、z 向下（南）、y 向上；單位 = 公尺。
 */

export type ZoneId =
  | 'town'
  | 'grassland'
  | 'dungeon_1'
  | 'dungeon_2'
  | 'dungeon_3'
  | 'mistwood'
  | 'delphi_path'
  | 'marathon_field'
  | 'troy_beach'
  | 'dungeon_4'
  | 'dungeon_5'
  | 'dungeon_6'
  | 'dungeon_7'
  | 'dungeon_8'
  | 'dungeon_9'
  | 'dungeon_10'
  | 'dungeon_11'
  | 'dungeon_12'
  | 'dungeon_13'
  | 'dungeon_14'
  | 'dungeon_15'
  | 'dungeon_16'
  | 'dungeon_17'
  | 'dungeon_18'
  | 'dungeon_19'
  | 'dungeon_20'
  | 'dungeon_21'
  | 'dungeon_22'
  | 'side_1'
  | 'side_2'
  | 'side_3'
  | 'side_4'
  | 'side_5'
  | 'side_6'
  | 'side_7'
  | 'side_8'
  | 'side_9'
  | 'side_10';

export type ZoneKind = 'town' | 'field' | 'dungeon';

export interface Vec2 {
  x: number;
  z: number;
}

/** 場景中的靜態物件。kind 決定由 ZoneBuilder 的哪個工廠函式產生外觀 */
export type PropKind =
  | 'house'
  | 'tree'
  | 'palm'
  | 'rock'
  | 'bush'
  | 'lamp'
  | 'fence'
  | 'wall'
  | 'fountain'
  | 'stairs'
  | 'pillar'
  | 'stonering'
  | 'crystal'
  /* 古希臘風格（程式模型，雅典城用） */
  | 'column'
  | 'temple'
  | 'statue'
  | 'olive'
  | 'cypress'
  | 'flowers'
  | 'bench'
  | 'stall'
  | 'amphora'
  | 'hedge'
  /** 純裝飾模型（桶子、箱子、火把、帳篷…），一定要指定 model */
  | 'decor';

export interface PropDef {
  kind: PropKind;
  x: number;
  z: number;
  /** 寬（x 方向），預設依 kind */
  w?: number;
  /** 深（z 方向），預設依 kind */
  d?: number;
  /** 高，預設依 kind */
  h?: number;
  /** 旋轉（弧度，繞 y 軸） */
  rot?: number;
  color?: number;
  /** 建築物招牌文字，例如「武器店」 */
  sign?: string;
  /** 是否阻擋移動，預設依 kind */
  solid?: boolean;
  /** 使用 KayKit 模型 id（src/assets/models/<id>.glb）；沒載入時退回程式模型 */
  model?: string;
}

/** 城裡隨機走動的小動物（純裝飾，不影響玩法） */
export type CritterKind = 'cat' | 'dog' | 'chicken' | 'chick' | 'pigeon' | 'owl' | 'butterfly';

export interface CritterDef {
  kind: CritterKind;
  x: number;
  z: number;
  /** 活動範圍（中心 x/z、寬 w、深 d）；沒填時是整張地圖 */
  area?: { x: number; z: number; w: number; d: number };
  /** 毛色 / 花色樣式（同種動物不同外觀） */
  variant?: number;
  /** 停在高處（貓頭鷹）：固定高度 */
  perchY?: number;
  /** 面向（弧度） */
  rot?: number;
}

/** 地面上不同材質的色塊（道路、沙地、水面…） */
export interface PatchDef {
  x: number;
  z: number;
  w: number;
  d: number;
  color: number;
  /** water = 不可行走 */
  water?: boolean;
}

/**
 * 高台：可以走上去的抬高地面。四周是峭壁（擋住），南側（+z）可開一段石階。
 * 石階從高台南緣往外延伸 rampLength 公尺，高度線性下降到 0。
 */
export interface PlatformDef {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color?: number;
  stairs?: { x: number; width: number };
}

/** 傳送點：走進去就切換區域 */
export interface PortalDef {
  x: number;
  z: number;
  radius: number;
  to: ZoneId;
  /** 抵達目標區域時的出生點 */
  arrive: Vec2;
  label: string;
  /** 'edge' = 地圖邊緣出口（只顯示光柱）；'stone' = 傳送石（打開地圖選單） */
  style: 'edge' | 'stone';
}

/** 敵人出生點 */
export interface SpawnDef {
  enemy: string;
  x: number;
  z: number;
  /** 覆寫該隻敵人的防禦（斯巴達訓練木樁用來展示穿透） */
  def?: number;
  /** 顯示名稱後綴，例如「防禦 40」 */
  tag?: string;
  /** 死亡後幾秒重生，預設用 EnemyDef.respawn */
  respawn?: number;
  /** 一次生成幾隻（預設 1） */
  count?: number;
  /** 散佈半徑，生成與重生都在此範圍內隨機（預設 0） */
  spread?: number;
}

export interface ZoneDef {
  id: ZoneId;
  kind: ZoneKind;
  name: string;
  /** HUD 第二行顯示，例如「雅典城・安全區」 */
  subtitle: string;
  /** 大區域名稱，例如「赫拉斯大陸」 */
  region: string;
  /** 背景音樂（audio/songs.ts 的曲子 id）；沒填時依 kind 決定 */
  music?: string;
  /** 首領戰音樂（audio/songs.ts，bossFight 曲）；沒填時用 'boss' */
  bossMusic?: string;
  levelRange?: [number, number];
  safe: boolean;
  /** 地圖大小（x 寬 × z 深），原點在中心 */
  size: { w: number; d: number };
  groundColor: number;
  skyColor: number;
  fogColor: number;
  patches: PatchDef[];
  platforms?: PlatformDef[];
  props: PropDef[];
  portals: PortalDef[];
  spawn: Vec2;
  /** 進入區域後輪播的提示 */
  tips: string[];
  /** 敵人出生點（第 2 週起） */
  spawns?: SpawnDef[];
  /** 走進去會開啟選單分頁（主城商店門口） */
  triggers?: { x: number; z: number; radius: number; tab: 'shop' | 'enhance'; label: string }[];
  /** 進入需要的等級（未達到時傳送點與地圖會擋下） */
  minLevel?: number;
  /** 掉落裝備的階級（預設：副本層數，野外 1） */
  lootTier?: number;
  /**
   * 混合掉落（v1.62，野外用）：每件掉落各自從這裡隨機抽一個階級，例如 [3, 3, 4] = 2/3 機率 3 階、1/3 機率 4 階。
   * 有填時 lootTier 只拿來算首領強度與顯示用的「主要階級」。
   */
  lootTiers?: number[];
  /** 霧的起訖距離（預設 60 / 130） */
  fogRange?: [number, number];
  /** 飄動的霧氣 */
  mist?: boolean;
  /** 隨機走動的小動物 */
  critters?: CritterDef[];
  /**
   * 支線地圖專用（v1.58）：守護者的家。打倒守護者有機會收服成夥伴（data/companions.ts）。
   * 支線地圖的 kind 是 'field'，但不列在野外清單，地圖頁另外一區「支線・守護者」。
   */
  side?: {
    /** 守護者的敵人 id */
    guardian: string;
    /** 擊敗哪一層首領後開放 */
    unlockAfter: ZoneId;
  };
  /** 副本專用 */
  dungeon?: {
    floor: number;
    /** 敵人防禦（地圖頁顯示用；實際防禦寫在各 EnemyDef） */
    enemyDefense: number;
    /** 擊敗哪一層首領後解鎖；undefined = 預設解鎖 */
    unlockAfter?: ZoneId;
  };
}

/* ---------- 以下為第 2 週之後會用到的定義，先訂好規格 ---------- */

export interface Stats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  /** 穿透 0~1，忽略目標防禦的比例 */
  pen: number;
  /** 移動速度 m/s */
  moveSpeed: number;
  critRate: number;
  critDmg: number;
}

export type SkillSlot = 'basic' | 'Q' | 'W' | 'E' | 'R';

export interface SkillDef {
  id: string;
  name: string;
  slot: SkillSlot;
  mpCost: number;
  cooldown: number;
  /** 傷害倍率（乘 atk） */
  power: number;
  range: number;
  shape: 'projectile' | 'circle' | 'cone' | 'dash';
  radius?: number;
  icon: string;
  color: number;
  /** AUTO 施放規則：target-aoe 目標附近多隻或首領、self-aoe 自身附近多隻、single 有目標就放、guard 被圍或打首領時開防禦、gap 近戰離目標太遠時衝過去、burst 打首領或被圍時開爆發、summon 召喚物不足時補、detonate 殘血或首領戰時引爆召喚物、none 不自動 */
  auto?: 'target-aoe' | 'self-aoe' | 'single' | 'guard' | 'gap' | 'burst' | 'summon' | 'detonate' | 'none';
  /** 召喚物 id（data/minions.ts），召喚數量用 count */
  summon?: string;
  /** 近戰扇形的總角度（弧度） */
  arc?: number;
  /** 施放時播的角色動畫（沒填用職業的 cast） */
  anim?: string;
  /** 暈眩秒數（盾擊） */
  stun?: number;
  /** 持續秒數（守護） */
  duration?: number;
  /** 多重箭的箭數 */
  count?: number;
  /** 箭雨的波數 */
  waves?: number;
}

export type Rarity = 'common' | 'fine' | 'rare' | 'epic';
export type EquipSlot = 'weapon' | 'hat' | 'robe' | 'gloves' | 'boots' | 'ring';

export interface ItemDef {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: Rarity;
  tier: number;
  stats: Partial<Stats>;
  price: number;
}

export type AggroType = 'aggressive' | 'passive';

export type EnemyShape = 'dummy' | 'crab' | 'frog' | 'slime' | 'golem' | 'mushroom' | 'bat' | 'skeleton' | 'serpent' | 'hydra' | 'harpy' | 'bull' | 'minotaur' | 'hound' | 'boar' | 'lion' | 'gorgon' | 'cyclops' | 'sphinx' | 'dragon' | 'chimera' | 'scylla' | 'griffin' | 'hind' | 'argus' | 'geryon' | 'cetus' | 'centaur' | 'echidna' | 'kampe' | 'pegasus' | 'aetos' | 'chrysomallos' | 'hippocampus' | 'phoenix' | 'boreas' | 'briareos' | 'scorpius' | 'phobos' | 'ares';

/** 首領招式 id（招式資料在 data/bossSkills.ts） */
export type { BossSkillId } from './bossSkills';
import type { BossSkillId } from './bossSkills';

/**
 * 關卡：一張地圖＋在這張地圖出現的敵人（小怪與首領）。
 * 每個關卡一個檔案放在 src/data/stages/，在 stages/index.ts 的 STAGES 登記。見 docs/CONTENT.md。
 */
export interface StageDef {
  zone: ZoneDef;
  /** 這個關卡的敵人（id → 資料）；id 全遊戲唯一 */
  enemies: Record<string, EnemyDef>;
}

export interface EnemyDef {
  id: string;
  name: string;
  level: number;
  aggro: AggroType | 'none';
  shape: EnemyShape;
  /** 碰撞半徑 */
  radius: number;
  /** 死亡後重生秒數 */
  respawn: number;
  stats: Pick<Stats, 'maxHp' | 'atk' | 'def' | 'moveSpeed'>;
  exp: number;
  gold: [number, number];
  /** 擊殺給的鑽石（首領） */
  gems?: number;
  boss?: boolean;
  /** 屬性（v1.58：守護者夥伴的相剋，見 data/elements.ts） */
  element?: Element;
  bossSkills?: BossSkillId[];
  /** KayKit 骨架模型 id（shape = 'skeleton' 時使用） */
  model?: string;
  /** 遠程攻擊（黑卡蒂亡巫）：在距離內放魔法彈，而不是近戰 */
  ranged?: boolean;
  /** 近戰攻擊：距離、出手前搖（秒）、冷卻 */
  attack?: { range: number; windup: number; cooldown: number };
  color: number;
  scale: number;
}
