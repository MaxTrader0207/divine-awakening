import type { EquipSlot } from './types';
import type { HeroClass } from './classes';
import { ITEM_BASES } from './items';
import { equippedSets } from './gearSets';

/**
 * 神裝形態（v1.99）
 * ------------------------------------------------------------
 * 身上 6 個欄位全部是★神話裝 → 角色換成「神裝形態」：
 *   - 衣服重新上色（依主要套裝的階級，DIVINE_PALETTES）、全身發出輪廓光
 *   - 腳下旋轉的神紋法陣、往上飄的光點
 *   - 每個職業背後一個專屬飾物（DIVINE_ORNAMENTS，造型在 entities/DivineAura.ts）
 *   - HUD 狀態框換成神裝配色（.hud.mythic-form）
 * 6 件是同一套時是「完整套裝」，法陣多一圈、光點更多。
 * 外觀只看裝備，不影響屬性（屬性加成照套裝效果 data/gearSets.ts）。
 */
const SLOTS: EquipSlot[] = ['weapon', 'hat', 'robe', 'gloves', 'boots', 'ring'];

export interface DivinePalette {
  /** 名稱（顯示用） */
  name: string;
  /** 衣服主色的色相（0~360） */
  hue: number;
  /** 飽和度倍率 */
  sat: number;
  /** 明度倍率 */
  light: number;
  /** 發光色（輪廓光、法陣、光點） */
  glow: number;
  /** 點綴色（飾物、法陣外圈） */
  accent: number;
}

/** 依套裝階級（1~8）的配色：越高階越華麗 */
export const DIVINE_PALETTES: Record<number, DivinePalette> = {
  1: { name: '青銅', hue: 28, sat: 0.9, light: 0.95, glow: 0xffb070, accent: 0xd89a5a },
  2: { name: '白銀', hue: 215, sat: 0.4, light: 1.0, glow: 0xd8ecff, accent: 0xe8eef8 },
  3: { name: '翡翠', hue: 150, sat: 1.0, light: 1.0, glow: 0x7affc0, accent: 0xa8ffd8 },
  4: { name: '蒼穹', hue: 210, sat: 1.0, light: 1.0, glow: 0x7ac8ff, accent: 0xb8e4ff },
  5: { name: '紫晶', hue: 275, sat: 0.95, light: 1.0, glow: 0xc89aff, accent: 0xe0c8ff },
  6: { name: '緋紅', hue: 352, sat: 1.0, light: 0.95, glow: 0xff7a8a, accent: 0xffc0a0 },
  7: { name: '黃金', hue: 42, sat: 1.0, light: 1.0, glow: 0xffd86a, accent: 0xfff0b0 },
  8: { name: '神輝', hue: 225, sat: 1.0, light: 1.0, glow: 0xffe9a0, accent: 0xffd36b },
};

export type OrnamentKind = 'runeRing' | 'wings' | 'halo' | 'flameCrown' | 'soulWisps' | 'floatingSwords' | 'spiritMoon' | 'shadowShuriken';

/** 每個職業的背後飾物 */
export const DIVINE_ORNAMENTS: Record<HeroClass, { kind: OrnamentKind; title: string }> = {
  mage: { kind: 'runeRing', title: '智慧的符文環' },
  archer: { kind: 'wings', title: '月神的光羽' },
  knight: { kind: 'halo', title: '守護者的聖環' },
  berserker: { kind: 'flameCrown', title: '戰神的怒焰' },
  summoner: { kind: 'soulWisps', title: '冥府的魂火' },
  swordsman: { kind: 'floatingSwords', title: '御劍・三才' },
  tamer: { kind: 'spiritMoon', title: '獸神的月輪' },
  ninja: { kind: 'shadowShuriken', title: '夜之手裏劍' },
};

export interface DivineForm {
  /** 主要套裝（件數最多、同件數取高階） */
  setId: string;
  setName: string;
  tier: number;
  /** 6 件同一套 */
  full: boolean;
  palette: DivinePalette;
  /** 比對用：同樣的 key 不用重建外觀 */
  key: string;
}

/** 身上有幾件★神話裝 */
export function mythicPieces(equipment: Partial<Record<EquipSlot, { base: string }>>): number {
  return SLOTS.filter((s) => {
    const it = equipment[s];
    return !!it && !!ITEM_BASES[it.base]?.named;
  }).length;
}

/** 全身★神話裝 → 神裝形態；不是回傳 null */
export function divineFormOf(equipment: Partial<Record<EquipSlot, { base: string }>>): DivineForm | null {
  if (mythicPieces(equipment) < SLOTS.length) return null;
  const top = equippedSets(equipment)[0];
  if (!top) return null;
  const tier = Math.max(1, Math.min(8, top.set.tier));
  const full = top.count >= SLOTS.length;
  return { setId: top.set.id, setName: top.set.name, tier, full, palette: DIVINE_PALETTES[tier], key: `${tier}:${full ? 1 : 0}` };
}

/** 顯示用的套裝名稱（名稱本身已經有「套裝」就不再加） */
export function setLabel(name: string): string {
  return name.endsWith('套裝') ? name : `${name}套裝`;
}
