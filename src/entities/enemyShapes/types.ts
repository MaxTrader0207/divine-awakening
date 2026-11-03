import type * as THREE from 'three';
import type { EnemyDef } from '@/data/types';

/**
 * 敵人程式模型（沒有外部模型時使用）的共用介面。
 * 每種造型（shape）一個建造函式：用 b.add() 把零件掛到 b.body 上（面向 +z、腳在 y=0），回傳模型高度與動畫。
 * 直接掛在 body 上的零件會被合併成一個網格；要會動的零件請先 b.group() 建一個 pivot，再把零件掛在 pivot 下。
 */
export interface ShapeBuilder {
  readonly def: EnemyDef;
  readonly boss: boolean;
  /** 模型根節點（會依 def.scale 縮放） */
  readonly body: THREE.Group;
  /** 主色、暗色（主色 × 0.65）、亮色（往米白混合） */
  readonly color: number;
  readonly dark: number;
  readonly light: number;
  /** 加一個零件（Lambert 平面著色）；parent 預設是 body */
  add(geo: THREE.BufferGeometry, color: number, x?: number, y?: number, z?: number, parent?: THREE.Object3D): THREE.Mesh;
  /** 加一個發光零件（MeshBasicMaterial，不受光影、不會被合併） */
  glow(geo: THREE.BufferGeometry, color: number, x?: number, y?: number, z?: number, parent?: THREE.Object3D): THREE.Mesh;
  /** 建一個會動的 pivot 群組 */
  group(x?: number, y?: number, z?: number, parent?: THREE.Object3D): THREE.Group;
  /** 一對卡通眼睛 */
  eyes(y: number, z: number, gap?: number, size?: number): void;
}

/** 每幀動畫的輸入 */
export interface ShapeAnimState {
  /** 累計時間（秒） */
  t: number;
  dt: number;
  /** 正在移動 */
  moving: boolean;
  /** 前搖中（快要出手） */
  winding: boolean;
  /** 前搖後仰角度 */
  lean: number;
  /** def.scale */
  scale: number;
  body: THREE.Group;
}

export interface ShapeResult {
  /** 模型高度（未乘 scale） */
  height: number;
  /** 自訂動畫；沒有的話用預設（走路上下晃、前搖後仰） */
  animate?: (st: ShapeAnimState) => void;
}

export type ShapeBuild = (b: ShapeBuilder) => ShapeResult;
