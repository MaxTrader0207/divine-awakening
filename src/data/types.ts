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
  | 'dungeon_3';

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
  | 'pillar';

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
  /** 覆寫該隻敵人的防禦（訓練木樁用來展示穿透） */
  def?: number;
  /** 顯示名稱後綴，例如「防禦 40」 */
  tag?: string;
  /** 死亡後幾秒重生，預設用 EnemyDef.respawn */
  respawn?: number;
}

export interface ZoneDef {
  id: ZoneId;
  kind: ZoneKind;
  name: string;
  /** HUD 第二行顯示，例如「主城艾爾芙・安全區」 */
  subtitle: string;
  /** 大區域名稱，例如「艾爾芙大陸」 */
  region: string;
  levelRange?: [number, number];
  safe: boolean;
  /** 地圖大小（x 寬 × z 深），原點在中心 */
  size: { w: number; d: number };
  groundColor: number;
  skyColor: number;
  fogColor: number;
  patches: PatchDef[];
  props: PropDef[];
  portals: PortalDef[];
  spawn: Vec2;
  /** 進入區域後輪播的提示 */
  tips: string[];
  /** 敵人出生點（第 2 週起） */
  spawns?: SpawnDef[];
  /** 副本專用 */
  dungeon?: {
    floor: number;
    bossName: string;
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

export type EnemyShape = 'dummy' | 'crab' | 'frog' | 'slime' | 'golem';

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
  boss?: boolean;
  color: number;
  scale: number;
}
