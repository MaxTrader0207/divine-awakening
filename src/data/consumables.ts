/**
 * 道具（消耗品）—— 古希臘神話主題，10 種
 * ------------------------------------------------------------
 * 紅藥水 / 藍藥水仍是快捷鍵 1、2 的基本藥水；這裡是背包裡的進階道具，
 * 在「選單 → 裝備」的「道具」區使用，商城有賣，怪物偶爾掉落（首領必掉 1 個）。
 * 效果由 Game.useConsumable() 套用；邏輯（能不能用、扣數量）在 systems/Consumables.ts。
 */
export type ConsumableEffect =
  /** 立即回復（比例；怒氣職業的 MP 改成固定加怒氣 rage） */
  | { type: 'heal'; hp?: number; mp?: number; rage?: number }
  /** 持續回復：duration 秒內共回復 total 比例的 HP */
  | { type: 'regen'; total: number; duration: number }
  /** 暫時增益（秒） */
  | { type: 'buff'; stat: 'atk' | 'def' | 'speed'; value: number; duration: number }
  /** 傳送回雅典城 */
  | { type: 'town' }
  /** 長時間加成（遊戲時間秒數，存檔保存） */
  | { type: 'boost'; stat: 'exp' | 'gold'; value: number; duration: number };

export interface ConsumableDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** 典故 */
  lore: string;
  price: number;
  effect: ConsumableEffect;
  /** 掉落權重（0 = 不會掉） */
  dropWeight: number;
  /** 共用藥水冷卻（立即回復類） */
  sharesPotionCd?: boolean;
}

export const CONSUMABLES: ConsumableDef[] = [
  {
    id: 'ambrosia',
    name: '神饌安布羅西亞',
    icon: '🍯',
    desc: '立即回復 70% HP',
    lore: '奧林帕斯眾神的食物，吃了能長生不老',
    price: 60,
    effect: { type: 'heal', hp: 0.7 },
    dropWeight: 10,
    sharesPotionCd: true,
  },
  {
    id: 'nectar',
    name: '神酒涅克塔',
    icon: '🏺',
    desc: '立即回復 70% MP（狂戰士：怒氣 +60）',
    lore: '眾神宴會上由赫柏斟上的美酒',
    price: 60,
    effect: { type: 'heal', mp: 0.7, rage: 60 },
    dropWeight: 10,
    sharesPotionCd: true,
  },
  {
    id: 'wine',
    name: '狄俄尼索斯葡萄酒',
    icon: '🍷',
    desc: '立即回復 40% HP 與 40% MP（狂戰士：怒氣 +35）',
    lore: '酒神親手釀的葡萄酒，讓人忘卻疲憊',
    price: 70,
    effect: { type: 'heal', hp: 0.4, mp: 0.4, rage: 35 },
    dropWeight: 8,
    sharesPotionCd: true,
  },
  {
    id: 'hestia_bread',
    name: '赫斯提亞爐火麵包',
    icon: '🍞',
    desc: '15 秒內持續回復共 60% HP',
    lore: '在灶神聖火旁烤好的麵包，每個家庭爐火的祝福',
    price: 40,
    effect: { type: 'regen', total: 0.6, duration: 15 },
    dropWeight: 12,
  },
  {
    id: 'ares_blood',
    name: '阿瑞斯戰血',
    icon: '⚔️',
    desc: '60 秒內攻擊力 +20%',
    lore: '戰神在特洛伊戰場上流下的血',
    price: 120,
    effect: { type: 'buff', stat: 'atk', value: 0.2, duration: 60 },
    dropWeight: 5,
  },
  {
    id: 'athena_oil',
    name: '雅典娜橄欖油',
    icon: '🫒',
    desc: '60 秒內受到的傷害 -25%',
    lore: '雅典娜送給雅典城的聖樹所榨的油，塗在盾上能擋住惡意',
    price: 120,
    effect: { type: 'buff', stat: 'def', value: 0.25, duration: 60 },
    dropWeight: 5,
  },
  {
    id: 'hermes_tonic',
    name: '赫密士疾行藥',
    icon: '💨',
    desc: '30 秒內移動速度 +30%',
    lore: '信使之神的祕方，喝了腳步像長了翅膀',
    price: 80,
    effect: { type: 'buff', stat: 'speed', value: 0.3, duration: 30 },
    dropWeight: 6,
  },
  {
    id: 'hermes_feather',
    name: '赫密士之羽',
    icon: '🪶',
    desc: '立即傳送回雅典城（城裡、首領戰中不能用）',
    lore: '從信使之神的飛翼涼鞋上掉下來的羽毛',
    price: 50,
    effect: { type: 'town' },
    dropWeight: 6,
  },
  {
    id: 'muse_honey',
    name: '謬思蜂蜜',
    icon: '🐝',
    desc: '10 分鐘內（遊戲時間）獲得的經驗值 +30%',
    lore: '赫利孔山上，九位謬思女神花園裡的蜂蜜',
    price: 300,
    effect: { type: 'boost', stat: 'exp', value: 0.3, duration: 600 },
    dropWeight: 2,
  },
  {
    id: 'tyche_coin',
    name: '堤喀幸運金幣',
    icon: '🪙',
    desc: '10 分鐘內（遊戲時間）獲得的金幣 +50%',
    lore: '命運與幸運女神堤喀的金幣，擲出去總是正面',
    price: 300,
    effect: { type: 'boost', stat: 'gold', value: 0.5, duration: 600 },
    dropWeight: 2,
  },
];

export const CONSUMABLE_MAP: Record<string, ConsumableDef> = Object.fromEntries(CONSUMABLES.map((c) => [c.id, c]));

/** 小怪掉道具的機率（首領必掉 1 個） */
export const CONSUMABLE_DROP_CHANCE = 0.05;

/** 依權重隨機挑一個道具 */
export function rollConsumable(rng: () => number = Math.random): string {
  const total = CONSUMABLES.reduce((a, c) => a + c.dropWeight, 0);
  let r = rng() * total;
  for (const c of CONSUMABLES) {
    r -= c.dropWeight;
    if (r < 0) return c.id;
  }
  return CONSUMABLES[0].id;
}
