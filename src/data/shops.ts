import type { HeroClass } from './classes';
import { CONSUMABLES, consumablesFor, type ConsumableDef } from './consumables';

/**
 * 雅典城的商店（v1.94）
 * 每間店是「商城」的一個店面：走進門口光圈（ZoneDef.triggers 的 shop）只顯示這間店賣的東西，
 * 店面最下面可以「查看全部商品」切回完整商城；從選單直接開商城則顯示全部。
 * 區塊（ShopSection）的畫面在 ui/InventoryTabs.ts 的 renderShop()。
 */
export type ShopSection = 'potions' | 'healing' | 'goods' | 'class' | 'weapons' | 'armor' | 'rings' | 'gems' | 'exchange' | 'daily';

export type ShopId = 'weapon' | 'armor' | 'general' | 'apothecary' | 'jeweler' | 'guild' | 'oracle' | 'merchant';

export interface ShopDef {
  name: string;
  icon: string;
  /** 店主與招呼語 */
  keeper: string;
  greet: string[];
  sections: ShopSection[];
}

export const SHOPS: Record<ShopId, ShopDef> = {
  weapon: { name: '武器店', icon: '⚔️', keeper: '鐵匠達達洛斯', greet: ['刀刃要磨，人也要磨。', '這把是用赫菲斯托斯爐裡的餘火打的。'], sections: ['weapons'] },
  armor: { name: '防具店', icon: '🛡️', keeper: '皮匠阿瑞忒', greet: ['命只有一條，盔甲可以有很多件。', '斯巴達人說：帶著盾牌回來，或躺在盾牌上回來。'], sections: ['armor'] },
  general: { name: '道具店', icon: '🎒', keeper: '雜貨商歐律克勒斯', greet: ['出城前，藥水帶夠了嗎？', '赫密士之羽賣得最好——誰不想一下子就回家呢。'], sections: ['potions', 'goods'] },
  apothecary: { name: '阿斯克勒庇俄斯藥房', icon: '⚕️', keeper: '藥師帕娜刻亞', greet: ['家父是醫神，這裡的藥都是他的方子。', '回血、回魔、護盾，受傷了就來找我。'], sections: ['potions', 'healing'] },
  jeweler: { name: '阿芙蘿黛蒂珠寶', icon: '💍', keeper: '珠寶商卡里斯', greet: ['戒指不只好看，戴對了能救命。', '這些寶石都是從賽蓮海蝕洞撈上來的。'], sections: ['rings'] },
  guild: { name: '職業行會', icon: '🏛️', keeper: '行會長老', greet: ['同行的祕藥，只賣給自己人。', '每個職業都有自己的老規矩與老配方。'], sections: ['class'] },
  oracle: { name: '德爾斐神諭殿', icon: '💎', keeper: '女祭司皮媞亞', greet: ['神明不收金幣，只收鑽石。', '月桂葉告訴我，你會需要更好的裝備。'], sections: ['gems', 'exchange'] },
  merchant: { name: '旅行商人', icon: '🐫', keeper: '腓尼基商人', greet: ['從推羅一路走來，今天的貨明天就沒了！', '每天換一批，全部打七折。'], sections: ['daily'] },
};

/** 店名（行會依職業） */
export function shopName(id: ShopId, clsName: string): string {
  return id === 'guild' ? `${clsName}行會` : SHOPS[id].name;
}

/** 回血 / 回魔 / 護盾類道具（藥房賣），其他通用道具（道具店賣） */
export function isHealing(c: ConsumableDef): boolean {
  return c.effect.type === 'heal' || c.effect.type === 'regen' || c.effect.type === 'shield';
}

export const DAILY = {
  /** 每天幾樣 */
  count: 5,
  /** 折扣（0.7 ＝ 七折） */
  discount: 0.7,
  /** 藥水福袋：紅藍各 10 瓶的價格倍率（相對單價 × 20） */
  bundleMul: 0.75,
};

/** 本地日期（每天換貨） */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** 今天旅行商人的貨：依日期與職業固定（同一天每次打開都一樣），從職業道具＋通用道具挑 */
export function dailyDeals(day: string, cls: HeroClass): { item: ConsumableDef; price: number }[] {
  let h = 2166136261;
  for (const ch of `${day}:${cls}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pool = [...consumablesFor(cls).filter((c) => c.cls), ...CONSUMABLES];
  const out: { item: ConsumableDef; price: number }[] = [];
  while (out.length < DAILY.count && pool.length) {
    const item = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    out.push({ item, price: Math.max(1, Math.round(item.price * DAILY.discount)) });
  }
  return out;
}
