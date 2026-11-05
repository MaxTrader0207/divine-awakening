/**
 * 屬性與相剋（v1.58，守護者夥伴）
 * ------------------------------------------------------------
 * 10 種屬性，每種剛好剋 1 種、被 1 種剋：
 *   火 → 冰 → 風 → 土 → 雷 → 水 → 火（六屬性循環）
 *   光 ⇄ 暗（互剋）、金 ⇄ 毒（互剋）
 * 目前只用在「守護者夥伴 ↔ 首領」之間：剋制 ×1.5、被剋 ×0.7（夥伴打首領、首領打夥伴都算）。
 * 10 隻守護者各一種屬性（第一隻：天馬珀伽索斯＝雷）；首領的屬性寫在 EnemyDef.element。
 */
export type Element = 'fire' | 'water' | 'thunder' | 'ice' | 'earth' | 'wind' | 'poison' | 'light' | 'dark' | 'metal';

export const ELEMENTS: Record<Element, { name: string; icon: string; color: string }> = {
  fire: { name: '火', icon: '🔥', color: '#ff7a45' },
  water: { name: '水', icon: '💧', color: '#4fb8ff' },
  thunder: { name: '雷', icon: '⚡', color: '#ffd84a' },
  ice: { name: '冰', icon: '❄', color: '#9fe6ff' },
  earth: { name: '土', icon: '⛰', color: '#c79a5a' },
  wind: { name: '風', icon: '🌪', color: '#8fe3b0' },
  poison: { name: '毒', icon: '☠', color: '#a8d14f' },
  light: { name: '光', icon: '☀', color: '#fff0a8' },
  dark: { name: '暗', icon: '🌑', color: '#a98cff' },
  metal: { name: '金', icon: '⚙', color: '#d0d6e0' },
};

/** a 剋 STRONG[a] */
export const STRONG: Record<Element, Element> = {
  fire: 'ice',
  ice: 'wind',
  wind: 'earth',
  earth: 'thunder',
  thunder: 'water',
  water: 'fire',
  light: 'dark',
  dark: 'light',
  metal: 'poison',
  poison: 'metal',
};

export const ELEMENT_STRONG_MUL = 1.5;
export const ELEMENT_WEAK_MUL = 0.7;

/** 攻擊方屬性打防守方屬性的傷害倍率（任一方沒有屬性 = 1） */
export function elementMul(attacker?: Element, defender?: Element): number {
  if (!attacker || !defender) return 1;
  if (STRONG[attacker] === defender) return ELEMENT_STRONG_MUL;
  if (STRONG[defender] === attacker) return ELEMENT_WEAK_MUL;
  return 1;
}

/** 誰剋這個屬性 */
export function counterOf(e: Element): Element {
  return (Object.keys(STRONG) as Element[]).find((k) => STRONG[k] === e)!;
}
