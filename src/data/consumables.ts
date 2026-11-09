import type { HeroClass } from './classes';
import type { MinionId } from './minions';

/**
 * 道具（消耗品）—— 古希臘神話主題：共用 20 種＋每個職業專屬 20 種（v1.33 起第 11~15 種是後期的高階道具；v1.39 起後 5 種是 Lv.61 以後的終盤道具）
 * ------------------------------------------------------------
 * 紅藥水 / 藍藥水仍是快捷鍵 1、2 的基本藥水；這裡是背包裡的進階道具，
 * 在「選單 → 裝備」的「道具」區使用，商城有賣，怪物偶爾掉落（首領必掉 1 個）。
 * 效果由 Game.useConsumable() 套用；邏輯（能不能用、扣數量）在 systems/Consumables.ts。
 */
export type BuffStat = 'atk' | 'def' | 'speed' | 'crit' | 'pen' | 'critDmg' | 'cdr' | 'leech';

export type ConsumableEffect =
  /** 立即回復（比例；怒氣職業的 MP 改成固定加怒氣 rage） */
  | { type: 'heal'; hp?: number; mp?: number; rage?: number }
  /** 持續回復：duration 秒內共回復 total 比例的 HP（mp: true 改回 MP） */
  | { type: 'regen'; total: number; duration: number; mp?: boolean }
  /**
   * 暫時增益（秒）。value 的意思：
   * atk / speed：倍率加成（0.2 = +20%）；def：受到傷害減少比例；crit / pen / critDmg：直接加上去；
   * cdr：技能冷卻轉得更快（0.3 = 快 30%）；leech：造成傷害的這個比例回血
   */
  | { type: 'buff'; stat: BuffStat; value: number; duration: number }
  /** 傳送回雅典城 */
  | { type: 'town' }
  /** 長時間加成（遊戲時間秒數，存檔保存） */
  | { type: 'boost'; stat: 'exp' | 'gold'; value: number; duration: number }
  /** 所有技能冷卻立即轉好 */
  | { type: 'cdReset' }
  /** 無敵（秒） */
  | { type: 'invuln'; duration: number }
  /** 以自己為中心的範圍傷害：攻擊力 × power，可附帶暈眩（首領免疫）/ 緩速 */
  | { type: 'nova'; power: number; radius: number; color: number; stun?: number; slow?: number }
  /** 召喚師 / 訓獸師：立即召喚（不花 MP、不受冷卻） */
  | { type: 'summon'; minion: MinionId; count: number }
  /** 訓獸師：立即野性咆哮（鼓舞附近野獸 duration 秒） */
  | { type: 'roar'; duration: number }
  /** 護盾：吸收最大 HP 的 ratio 比例傷害，duration 秒後消失 */
  | { type: 'shield'; ratio: number; duration: number };

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
  /** 職業專屬（沒填 = 所有職業共用） */
  cls?: HeroClass;
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
  /* ---- v1.33 高階共用道具 ---- */
  {
    id: 'hebe_cup',
    name: '赫柏青春之杯',
    icon: '🏆',
    desc: '立即回復 100% HP 與 100% MP（狂戰士：怒氣補滿）',
    lore: '青春女神赫柏為眾神斟酒的金杯',
    price: 320,
    effect: { type: 'heal', hp: 1, mp: 1, rage: 100 },
    dropWeight: 2,
    sharesPotionCd: true,
  },
  {
    id: 'nike_wreath',
    name: '尼姬勝利花環',
    icon: '🌸',
    desc: '60 秒內攻擊力 +30%',
    lore: '有翼的勝利女神為勝利者戴上的花環',
    price: 220,
    effect: { type: 'buff', stat: 'atk', value: 0.3, duration: 60 },
    dropWeight: 3,
  },
  {
    id: 'aegis_shard',
    name: '埃癸斯神盾碎片',
    icon: '🛡️',
    desc: '獲得最大 HP 45% 的護盾（30 秒）',
    lore: '宙斯與雅典娜的神盾，上面鑲著梅杜莎的頭',
    price: 240,
    effect: { type: 'shield', ratio: 0.45, duration: 30 },
    dropWeight: 3,
  },
  {
    id: 'kairos_sand',
    name: '凱洛斯時機之沙',
    icon: '⏳',
    desc: '所有技能冷卻立即轉好',
    lore: '「恰當時機」之神凱洛斯，只有前額有頭髮，錯過就抓不住',
    price: 260,
    effect: { type: 'cdReset' },
    dropWeight: 2,
  },
  {
    id: 'zeus_bolt',
    name: '宙斯雷霆碎片',
    icon: '⚡',
    desc: '對周圍 8 公尺造成 4 倍攻擊力的雷擊傷害',
    lore: '獨眼巨人為宙斯鍛造的雷霆掉下的一角',
    price: 240,
    effect: { type: 'nova', power: 4, radius: 8, color: 0xffe25a },
    dropWeight: 3,
  },
  /* ---- v1.39 終盤共用道具（Lv.61 以後） ---- */
  {
    id: 'gaia_spring',
    name: '蓋亞大地之泉',
    icon: '⛲',
    desc: '20 秒內持續回復共 120% HP',
    lore: '大地之母蓋亞從岩縫裡湧出的泉水，萬物都由她而生',
    price: 360,
    effect: { type: 'regen', total: 1.2, duration: 20 },
    dropWeight: 3,
  },
  {
    id: 'titanomachy_horn',
    name: '泰坦之戰號角',
    icon: '📯',
    desc: '60 秒內攻擊力 +40%',
    lore: '眾神與泰坦大戰十年，最後一戰前吹響的號角',
    price: 450,
    effect: { type: 'buff', stat: 'atk', value: 0.4, duration: 60 },
    dropWeight: 2,
  },
  {
    id: 'thalassa_pearl',
    name: '塔拉薩深海珍珠',
    icon: '🦪',
    desc: '獲得最大 HP 60% 的護盾（40 秒）',
    lore: '原初海洋女神塔拉薩，海裡的魚群都由她而生',
    price: 420,
    effect: { type: 'shield', ratio: 0.6, duration: 40 },
    dropWeight: 2,
  },
  {
    id: 'hundred_hand_boulder',
    name: '百臂巨人巨石',
    icon: '🪨',
    desc: '周圍 9 公尺的敵人受到 5.5 倍傷害並暈眩 1.5 秒（首領不會暈）',
    lore: '百臂巨人一次扔出三百塊巨石，把泰坦埋進塔爾塔洛斯',
    price: 520,
    effect: { type: 'nova', power: 5.5, radius: 9, color: 0xc8a070, stun: 1.5 },
    dropWeight: 2,
  },
  {
    id: 'phanes_egg',
    name: '法涅斯宇宙卵',
    icon: '🥚',
    desc: '15 分鐘內（遊戲時間）獲得的經驗值 +50%',
    lore: '原初之光法涅斯從宇宙卵中破殼而出，第一次照亮了世界',
    price: 600,
    effect: { type: 'boost', stat: 'exp', value: 0.5, duration: 900 },
    dropWeight: 1,
  },
];

/** 同一種道具最多疊幾個 */
export const MAX_STACK = 99;

/** 精簡寫法：建立一個職業專屬道具 */
function c(cls: HeroClass, id: string, name: string, icon: string, desc: string, lore: string, price: number, effect: ConsumableEffect, dropWeight: number): ConsumableDef {
  return { id: `${cls}_${id}`, name, icon, desc, lore, price, effect, dropWeight, cls, sharesPotionCd: effect.type === 'heal' };
}

/** 職業專屬道具：每個職業 20 種，只有該職業看得到、買得到、掉得到 */
export const CLASS_CONSUMABLES: ConsumableDef[] = [
  // ---- 法師：魔力、冷卻、穿透 ----
  c('mage', 'nymph_spring', '寧芙泉水', '💧', '立即回復 50% MP', '山林寧芙守護的清泉', 40, { type: 'heal', mp: 0.5 }, 12),
  c('mage', 'selene_dew', '塞勒涅月露', '🌙', '20 秒內持續回復共 80% MP', '月神夜裡灑下的露水', 70, { type: 'regen', total: 0.8, duration: 20, mp: true }, 9),
  c('mage', 'circe_potion', '喀耳刻藥水', '🧪', '立即回復 35% HP 與 60% MP', '艾尤島女巫的祕方，這次不會把你變成豬', 90, { type: 'heal', hp: 0.35, mp: 0.6 }, 8),
  c('mage', 'delphi_laurel', '德爾菲月桂葉', '🌿', '30 秒內技能冷卻快 30%', '阿波羅神廟裡皮媞亞咀嚼的月桂葉', 150, { type: 'buff', stat: 'cdr', value: 0.3, duration: 30 }, 4),
  c('mage', 'hecate_moon', '黑卡蒂月光藥', '🔮', '45 秒內穿透 +15%', '在三岔路口、月光下調製的魔藥', 150, { type: 'buff', stat: 'pen', value: 0.15, duration: 45 }, 4),
  c('mage', 'owl_feather', '貓頭鷹智慧之羽', '🪶', '60 秒內爆擊傷害 +40%', '雅典娜的聖鳥掉下的羽毛', 160, { type: 'buff', stat: 'critDmg', value: 0.4, duration: 60 }, 4),
  c('mage', 'promethean_fire', '普羅米修斯火種', '🔥', '對周圍 6 公尺造成 3 倍攻擊力的火焰傷害', '從奧林帕斯偷給人類的火', 120, { type: 'nova', power: 3, radius: 6, color: 0xff7a2a }, 5),
  c('mage', 'muse_scroll', '謬思靈感卷軸', '📜', '所有技能冷卻立即轉好', '九位謬思同時降下的靈感', 200, { type: 'cdReset' }, 3),
  c('mage', 'hades_cap_shard', '隱形帽碎片', '🎩', '4 秒內無敵', '黑帝斯隱形帽上掉下的一角', 180, { type: 'invuln', duration: 4 }, 3),
  c('mage', 'medea_elixir', '美狄亞回春藥', '⚗️', '立即回復 100% HP 與 MP', '美狄亞讓老人返老還童的藥鍋', 250, { type: 'heal', hp: 1, mp: 1 }, 2),
  c('mage', 'mnemosyne_spring', '謨涅摩緒涅記憶泉', '⛲', '25 秒內持續回復共 100% MP', '記憶女神之泉，喝了想起所有咒語', 150, { type: 'regen', total: 1, duration: 25, mp: true }, 6),
  c('mage', 'metis_draught', '墨提斯智謀藥', '🧠', '60 秒內爆擊率 +15%', '智慧女神墨提斯，雅典娜的母親', 170, { type: 'buff', stat: 'crit', value: 0.15, duration: 60 }, 4),
  c('mage', 'aegis_mantle', '雅典娜神盾披風', '🧥', '獲得最大 HP 45% 的護盾（30 秒）', '雅典娜借給佩爾修斯的光亮盾牌', 210, { type: 'shield', ratio: 0.45, duration: 30 }, 3),
  c('mage', 'chronos_hourglass', '柯羅諾斯時之沙漏', '⌛', '30 秒內技能冷卻快 45%', '時間之神手中流動的沙', 240, { type: 'buff', stat: 'cdr', value: 0.45, duration: 30 }, 2),
  c('mage', 'hyperion_flame', '許珀里翁烈陽', '🌞', '對周圍 7 公尺造成 4.5 倍攻擊力的烈焰傷害', '光明泰坦許珀里翁的太陽之火', 240, { type: 'nova', power: 4.5, radius: 7, color: 0xffb030 }, 3),
  c('mage', 'charybdis_whirl', '卡律布狄斯漩渦藥', '🌀', '45 秒內穿透 +25%', '一天吞吐三次海水的漩渦，再厚的防禦都會被捲走', 320, { type: 'buff', stat: 'pen', value: 0.25, duration: 45 }, 3),
  c('mage', 'argus_eyedrop', '阿爾戈斯百眼藥', '👁️', '60 秒內爆擊率 +25%', '百眼巨人睡覺時，總有幾隻眼睛還睜著', 340, { type: 'buff', stat: 'crit', value: 0.25, duration: 60 }, 3),
  c('mage', 'uranus_stardust', '烏拉諾斯星塵', '🌌', '30 秒內技能冷卻快 50%', '天空之神烏拉諾斯披在大地上的星空，抖落的星塵', 400, { type: 'buff', stat: 'cdr', value: 0.5, duration: 30 }, 2),
  c('mage', 'hyperborean_aurora', '希柏里爾極光', '🌠', '對周圍 8 公尺造成 6 倍攻擊力的極光傷害並緩速', '北風之外的樂土，阿波羅每年冬天都到那裡過冬', 420, { type: 'nova', power: 6, radius: 8, color: 0x7affd8, slow: 3 }, 2),
  c('mage', 'aether_veil', '埃忒耳蒼穹屏障', '🔷', '獲得最大 HP 60% 的護盾（40 秒）', '原初神埃忒耳是眾神呼吸的上層光明之氣', 380, { type: 'shield', ratio: 0.6, duration: 40 }, 2),
  // ---- 弓手：爆擊、移速、穿透 ----
  c('archer', 'nymph_dew', '林地寧芙露水', '💧', '立即回復 50% HP', '樹林裡寧芙收集的晨露', 40, { type: 'heal', hp: 0.5 }, 12),
  c('archer', 'chiron_herbs', '喀戎草藥包', '🌿', '20 秒內持續回復共 70% HP', '半人馬賢者喀戎教阿斯克勒庇俄斯的草藥', 80, { type: 'regen', total: 0.7, duration: 20 }, 9),
  c('archer', 'centaur_wine', '半人馬奔馳酒', '🍺', '40 秒內移動速度 +40%', '半人馬族婚宴上喝的烈酒', 100, { type: 'buff', stat: 'speed', value: 0.4, duration: 40 }, 6),
  c('archer', 'artemis_eye', '阿蒂蜜絲鷹眼藥', '🦅', '60 秒內爆擊率 +15%', '狩獵女神滴在箭手眼中的藥', 150, { type: 'buff', stat: 'crit', value: 0.15, duration: 60 }, 4),
  c('archer', 'apollo_oil', '阿波羅金陽油', '☀️', '60 秒內攻擊力 +25%', '塗在箭頭上，閃著太陽神的金光', 160, { type: 'buff', stat: 'atk', value: 0.25, duration: 60 }, 4),
  c('archer', 'orion_star', '奧利安星光', '✨', '45 秒內穿透 +15%', '獵戶座三顆腰帶星的光', 150, { type: 'buff', stat: 'pen', value: 0.15, duration: 45 }, 4),
  c('archer', 'string_wax', '赫拉克勒斯弓弦蠟', '🏹', '30 秒內技能冷卻快 30%', '大力士用來保養神弓的蜂蠟', 150, { type: 'buff', stat: 'cdr', value: 0.3, duration: 30 }, 4),
  c('archer', 'hydra_venom', '九頭蛇毒箭油', '🐍', '對周圍 7 公尺造成 2.5 倍傷害並緩速', '赫拉克勒斯把箭浸在九頭蛇血裡', 120, { type: 'nova', power: 2.5, radius: 7, color: 0x6fd36a, slow: 3 }, 5),
  c('archer', 'golden_apple', '阿塔蘭塔金蘋果', '🍎', '所有技能冷卻立即轉好', '讓飛毛腿阿塔蘭塔停下腳步的金蘋果', 200, { type: 'cdReset' }, 3),
  c('archer', 'stag_horn', '亞克提安鹿角粉', '🦌', '3 秒內無敵', '被變成鹿的獵人留下的角', 160, { type: 'invuln', duration: 3 }, 3),
  c('archer', 'cerynitian_antler', '刻律涅牝鹿金角', '🦌', '40 秒內移動速度 +50%', '赫拉克勒斯追了一整年的金角銅蹄鹿', 150, { type: 'buff', stat: 'speed', value: 0.5, duration: 40 }, 5),
  c('archer', 'stymphalian_quill', '斯廷法利斯銅羽', '🪶', '60 秒內爆擊傷害 +50%', '怪鳥射出的銅羽，比箭還鋒利', 180, { type: 'buff', stat: 'critDmg', value: 0.5, duration: 60 }, 4),
  c('archer', 'nemean_pelt', '涅墨亞獅皮斗篷', '🦁', '獲得最大 HP 40% 的護盾（30 秒）', '刀槍不入的獅皮，赫拉克勒斯一直披在身上', 200, { type: 'shield', ratio: 0.4, duration: 30 }, 3),
  c('archer', 'hesperides_apple', '赫斯珀里得斯金蘋果', '🍏', '立即回復 100% HP', '黃昏女神花園裡赫拉的金蘋果', 250, { type: 'heal', hp: 1 }, 2),
  c('archer', 'helios_arrow', '赫利俄斯日焰箭', '☄️', '對周圍 8 公尺造成 4 倍攻擊力的火焰傷害', '太陽神的金車掉下的一道火光', 240, { type: 'nova', power: 4, radius: 8, color: 0xffa030 }, 3),
  c('archer', 'calydon_tusk', '卡呂冬野豬獠牙', '🐗', '60 秒內爆擊傷害 +70%', '阿塔蘭塔射中第一箭，墨勒阿革洛斯把獠牙送給了她', 360, { type: 'buff', stat: 'critDmg', value: 0.7, duration: 60 }, 3),
  c('archer', 'griffin_feather', '獅鷲金羽', '🪶', '60 秒內爆擊率 +25%', '獅身鷹首的守寶獸，羽毛閃著北方黃金的光', 340, { type: 'buff', stat: 'crit', value: 0.25, duration: 60 }, 3),
  c('archer', 'arimaspi_eye', '阿里瑪斯波伊獨目', '🎯', '45 秒內穿透 +25%', '只有一隻眼睛的北方民族，世代與獅鷲爭奪黃金', 340, { type: 'buff', stat: 'pen', value: 0.25, duration: 45 }, 3),
  c('archer', 'nessus_arrow', '涅索斯毒血箭', '🩸', '對周圍 9 公尺造成 5.5 倍傷害並緩速', '海克力斯浸過九頭蛇毒的箭，射穿了半人馬涅索斯', 420, { type: 'nova', power: 5.5, radius: 9, color: 0x8a2a3a, slow: 3 }, 2),
  c('archer', 'hemera_daylight', '赫墨拉白晝之光', '🌅', '立即回復 100% HP 與 MP', '原初白晝女神赫墨拉，每天早上驅散母親尼克斯的黑夜', 380, { type: 'heal', hp: 1, mp: 1 }, 2),
  // ---- 騎士：防禦、護盾、暈眩 ----
  c('knight', 'black_broth', '斯巴達黑湯', '🥣', '立即回復 60% HP', '斯巴達戰士每天喝的黑湯，難喝但有力', 50, { type: 'heal', hp: 0.6 }, 12),
  c('knight', 'hector_oath', '赫克托耳誓言', '🕯️', '20 秒內持續回復共 80% HP', '特洛伊守護者出城前的誓言', 120, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('knight', 'hoplite_oil', '重裝步兵盾油', '🛢️', '60 秒內受到傷害 -35%', '擦亮圓盾的橄欖油', 150, { type: 'buff', stat: 'def', value: 0.35, duration: 60 }, 5),
  c('knight', 'ajax_charm', '埃阿斯塔盾護符', '🛡️', '獲得最大 HP 40% 的護盾（30 秒）', '特洛伊戰爭中最堅固的七層牛皮盾', 180, { type: 'shield', ratio: 0.4, duration: 30 }, 4),
  c('knight', 'achilles_cry', '阿基里斯戰吼', '📯', '60 秒內攻擊力 +20%', '阿基里斯在城牆下的怒吼', 140, { type: 'buff', stat: 'atk', value: 0.2, duration: 60 }, 5),
  c('knight', 'red_cloak', '斯巴達紅披風', '🧣', '40 秒內移動速度 +30%', '斯巴達戰士的紅披風，看不出有沒有受傷', 100, { type: 'buff', stat: 'speed', value: 0.3, duration: 40 }, 5),
  c('knight', 'olive_crown', '奧林匹亞橄欖冠', '🫒', '60 秒內穿透 +12%', '奧運冠軍頭上的野橄欖枝', 140, { type: 'buff', stat: 'pen', value: 0.12, duration: 60 }, 4),
  c('knight', 'medusa_eye', '梅杜莎之眼', '👁️', '周圍 6 公尺的敵人石化 3 秒並受到 2 倍傷害（首領不會石化）', '佩爾修斯砍下的蛇髮女妖之眼', 160, { type: 'nova', power: 2, radius: 6, color: 0x9fd3a0, stun: 3 }, 4),
  c('knight', 'leonidas_song', '列奧尼達戰歌', '🎺', '所有技能冷卻立即轉好', '溫泉關三百勇士的戰歌', 200, { type: 'cdReset' }, 3),
  c('knight', 'styx_water', '忒提斯冥河水', '🌊', '5 秒內無敵', '阿基里斯的母親把他浸入冥河的水', 200, { type: 'invuln', duration: 5 }, 2),
  c('knight', 'asclepius_salve', '阿斯克勒庇俄斯蛇杖膏', '⚕️', '立即回復 100% HP', '醫神蛇杖上的藥膏，能讓死人復活', 250, { type: 'heal', hp: 1 }, 2),
  c('knight', 'myrmidon_banner', '密爾彌冬戰旗', '🚩', '60 秒內攻擊力 +30%', '阿基里斯麾下最勇猛的軍團戰旗', 190, { type: 'buff', stat: 'atk', value: 0.3, duration: 60 }, 4),
  c('knight', 'hephaestus_rivet', '赫菲斯托斯神鍛鉚釘', '🔩', '45 秒內受到傷害 -45%', '火神為阿基里斯打造盾牌時留下的鉚釘', 210, { type: 'buff', stat: 'def', value: 0.45, duration: 45 }, 3),
  c('knight', 'zeus_aegis', '宙斯埃癸斯', '🛡️', '獲得最大 HP 60% 的護盾（30 秒）', '眾神之王的山羊皮神盾，搖動就會雷電交加', 250, { type: 'shield', ratio: 0.6, duration: 30 }, 2),
  c('knight', 'heracles_club', '赫拉克勒斯橄欖木棒', '🏏', '周圍 7 公尺的敵人受到 3.5 倍傷害並暈眩 2 秒（首領不會暈）', '大力士親手砍下的野橄欖樹幹', 220, { type: 'nova', power: 3.5, radius: 7, color: 0xd8a86a, stun: 2 }, 3),
  c('knight', 'themis_scale', '忒彌斯天秤', '⚖️', '60 秒內受到傷害 -35%', '律法女神的天秤，誰也不能讓它傾斜', 340, { type: 'buff', stat: 'def', value: 0.35, duration: 60 }, 3),
  c('knight', 'andromeda_chain', '安朵美達斷鏈', '⛓️', '60 秒內攻擊力 +35%', '珀耳修斯斬斷鎖鏈，救下獻給海怪的公主', 360, { type: 'buff', stat: 'atk', value: 0.35, duration: 60 }, 3),
  c('knight', 'astraea_star', '阿斯特賴亞星芒', '🌟', '20 秒內持續回復共 120% HP', '最後一位離開人間的正義女神，化為處女座', 360, { type: 'regen', total: 1.2, duration: 20 }, 3),
  c('knight', 'iolaus_torch', '伊俄拉俄斯火炬', '🔥', '周圍 8 公尺的敵人受到 5 倍傷害並暈眩 2 秒（首領不會暈）', '海克力斯的姪子用這支火炬燒灼九頭蛇的斷頸', 420, { type: 'nova', power: 5, radius: 8, color: 0xff9a3a, stun: 2 }, 2),
  c('knight', 'briareus_gate', '布里阿瑞俄斯青銅門', '🚪', '獲得最大 HP 70% 的護盾（40 秒）', '百臂巨人布里阿瑞俄斯看守塔爾塔洛斯的青銅大門，泰坦一個也逃不出去', 450, { type: 'shield', ratio: 0.7, duration: 40 }, 2),
  // ---- 狂戰士：怒氣、攻擊、吸血 ----
  c('berserker', 'thracian_spirit', '色雷斯烈酒', '🍶', '怒氣立即補滿', '北方蠻族喝了就上戰場的烈酒', 40, { type: 'heal', rage: 100 }, 12),
  c('berserker', 'bull_blood', '米諾陶洛斯牛血', '🐂', '立即回復 50% HP', '迷宮怪物的血，喝了渾身發熱', 45, { type: 'heal', hp: 0.5 }, 12),
  c('berserker', 'antaeus_soil', '安泰俄斯大地之土', '🪨', '20 秒內持續回復共 80% HP', '只要碰到大地就能恢復力量的巨人', 110, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('berserker', 'ares_wine', '阿瑞斯血酒', '🍷', '60 秒內攻擊力 +30%', '戰神神殿供桌上的紅酒', 170, { type: 'buff', stat: 'atk', value: 0.3, duration: 60 }, 4),
  c('berserker', 'maenad_vine', '酒神女信徒之藤', '🍇', '45 秒內造成傷害的 10% 回血', '狂歡的酒神女信徒頭上的葡萄藤', 160, { type: 'buff', stat: 'leech', value: 0.1, duration: 45 }, 4),
  c('berserker', 'kratos_powder', '克拉托斯力量粉', '💪', '60 秒內爆擊傷害 +50%', '力量之神克拉托斯的祝福', 160, { type: 'buff', stat: 'critDmg', value: 0.5, duration: 60 }, 4),
  c('berserker', 'chariot_grease', '戰車輪油', '🛞', '40 秒內移動速度 +35%', '阿瑞斯戰車輪軸上的油', 100, { type: 'buff', stat: 'speed', value: 0.35, duration: 40 }, 5),
  c('berserker', 'lion_heart', '尼米亞獅心', '🦁', '30 秒內受到傷害 -40%', '刀槍不入的尼米亞猛獅之心', 160, { type: 'buff', stat: 'def', value: 0.4, duration: 30 }, 4),
  c('berserker', 'titan_stone', '泰坦撼地石', '🌋', '對周圍 7 公尺造成 3.5 倍傷害', '泰坦之戰時被扔下奧林帕斯的巨石碎片', 140, { type: 'nova', power: 3.5, radius: 7, color: 0xff5a3c }, 5),
  c('berserker', 'enyo_horn', '恩尤戰禍號角', '📯', '所有技能冷卻立即轉好', '戰爭女神恩尤吹響的號角', 200, { type: 'cdReset' }, 3),
  c('berserker', 'talos_ichor', '塔洛斯神血', '🩸', '立即回復 100% HP，怒氣補滿', '青銅巨人腳踝裡流動的神血', 250, { type: 'heal', hp: 1, rage: 100 }, 2),
  c('berserker', 'heracles_wrath', '赫拉克勒斯之怒', '😤', '45 秒內攻擊力 +40%', '被赫拉逼瘋時的大力士之怒', 230, { type: 'buff', stat: 'atk', value: 0.4, duration: 45 }, 3),
  c('berserker', 'lycaon_fang', '呂卡翁狼牙', '🐺', '45 秒內造成傷害的 15% 回血', '被宙斯變成狼的阿卡迪亞國王', 210, { type: 'buff', stat: 'leech', value: 0.15, duration: 45 }, 3),
  c('berserker', 'ares_bronze', '阿瑞斯青銅盾', '🛡️', '獲得最大 HP 45% 的護盾（30 秒）', '戰神在特洛伊城下舉著的青銅盾', 200, { type: 'shield', ratio: 0.45, duration: 30 }, 3),
  c('berserker', 'cyclops_hammer', '獨眼巨人鐵鎚', '🔨', '對周圍 7 公尺造成 4.5 倍傷害並暈眩 1.5 秒（首領不會暈）', '為宙斯鍛造雷霆的鐵鎚', 240, { type: 'nova', power: 4.5, radius: 7, color: 0xff8a3a, stun: 1.5 }, 3),
  c('berserker', 'scylla_fang', '斯庫拉犬牙', '🦷', '45 秒內造成傷害的 18% 回血', '斯庫拉腰間的六個犬頭，一口就叼走六名水手', 380, { type: 'buff', stat: 'leech', value: 0.18, duration: 45 }, 3),
  c('berserker', 'orthrus_collar', '俄耳托斯項圈', '🐕', '60 秒內爆擊傷害 +70%', '看守紅牛群的雙頭犬，被海克力斯一棒打死', 360, { type: 'buff', stat: 'critDmg', value: 0.7, duration: 60 }, 3),
  c('berserker', 'geryon_beef', '革律翁紅牛肉', '🍖', '18 秒內持續回復共 120% HP', '厄律提亞島上的紅牛群，被夕陽染成一片通紅', 340, { type: 'regen', total: 1.2, duration: 18 }, 3),
  c('berserker', 'cetus_bone', '刻托斯鯨骨', '🦴', '獲得最大 HP 60% 的護盾（40 秒）', '被珀耳修斯擊敗的海怪，骨頭大得能當船的龍骨', 380, { type: 'shield', ratio: 0.6, duration: 40 }, 2),
  c('berserker', 'kampe_scorpion', '坎佩蠍尾', '🦂', '對周圍 8 公尺造成 6.5 倍傷害並暈眩 2 秒（首領不會暈）', '塔爾塔洛斯的獄龍，背上高高翹著一條蠍尾', 480, { type: 'nova', power: 6.5, radius: 8, color: 0x9a2a5a, stun: 2 }, 2),
  // ---- 召喚師：召喚、魔力、生存 ----
  c('summoner', 'styx_water', '冥河之水', '💧', '立即回復 50% MP', '連眾神都要對著它發誓的冥河水', 40, { type: 'heal', mp: 0.5 }, 12),
  c('summoner', 'pomegranate', '普西芬妮石榴籽', '🫐', '立即回復 40% HP 與 40% MP', '吃了就得每年回冥界半年的石榴籽', 70, { type: 'heal', hp: 0.4, mp: 0.4 }, 10),
  c('summoner', 'orpheus_lyre', '奧菲斯里拉', '🎻', '20 秒內持續回復共 80% HP', '感動冥王的琴聲', 110, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('summoner', 'charon_obol', '卡戎銀幣', '🪙', '立即召喚 2 隻斯巴達亡靈（不花 MP）', '付給冥河擺渡人的船資', 90, { type: 'summon', minion: 'skeleton_minion', count: 2 }, 8),
  c('summoner', 'seer_bone', '提瑞西阿斯預言骨', '🦴', '立即召喚 1 隻提瑞西阿斯亡靈', '盲眼先知在冥府占卜用的骨片', 120, { type: 'summon', minion: 'skeleton_mage', count: 1 }, 6),
  c('summoner', 'dragon_tooth', '卡德摩斯龍牙', '🦷', '立即召喚 1 隻埃阿斯亡靈', '種進土裡就會長出戰士的龍牙', 150, { type: 'summon', minion: 'skeleton_warrior', count: 1 }, 5),
  c('summoner', 'honey_cake', '刻耳柏洛斯蜜餅', '🍪', '60 秒內受到傷害 -30%', '安撫冥界三頭犬的蜜餅', 140, { type: 'buff', stat: 'def', value: 0.3, duration: 60 }, 4),
  c('summoner', 'thanatos_feather', '塔納托斯黑羽', '🖤', '45 秒內攻擊力 +25%（召喚物一起變強）', '死神翅膀上的黑色羽毛', 150, { type: 'buff', stat: 'atk', value: 0.25, duration: 45 }, 4),
  c('summoner', 'hecate_flame', '黑卡蒂冥火', '🕯️', '對周圍 6 公尺造成 2.5 倍傷害', '冥界女神火炬上的幽火', 120, { type: 'nova', power: 2.5, radius: 6, color: 0xb48cff }, 5),
  c('summoner', 'lethe_water', '勒特忘川水', '🌫️', '所有技能冷卻立即轉好', '喝了就會忘記一切的遺忘之河', 200, { type: 'cdReset' }, 3),
  c('summoner', 'orpheus_lament', '奧菲斯輓歌', '🎶', '立即召喚 2 隻提瑞西阿斯亡靈', '讓冥府亡魂都落淚的歌', 200, { type: 'summon', minion: 'skeleton_mage', count: 2 }, 4),
  c('summoner', 'hades_key', '冥府之鑰', '🗝️', '立即召喚 2 隻埃阿斯亡靈', '冥王黑帝斯掌管的冥府大門鑰匙', 250, { type: 'summon', minion: 'skeleton_warrior', count: 2 }, 3),
  c('summoner', 'persephone_crown', '普西芬妮冥后冠', '👑', '獲得最大 HP 40% 的護盾（30 秒）', '冥后頭上的水仙花冠', 200, { type: 'shield', ratio: 0.4, duration: 30 }, 3),
  c('summoner', 'nyx_veil', '尼克斯夜幕面紗', '🌑', '4 秒內無敵', '連宙斯都畏懼的黑夜女神', 190, { type: 'invuln', duration: 4 }, 3),
  c('summoner', 'erebus_mist', '厄瑞玻斯冥霧', '🌫️', '對周圍 7 公尺造成 3 倍傷害並緩速', '冥府最深處的黑暗之霧', 170, { type: 'nova', power: 3, radius: 7, color: 0x7a5aaa, slow: 3 }, 4),
  c('summoner', 'eurynomos_bone', '歐律諾摩斯白骨', '💀', '立即召喚 3 隻埃阿斯亡靈', '冥府的食屍惡靈，吃盡血肉只留下白骨', 380, { type: 'summon', minion: 'skeleton_warrior', count: 3 }, 2),
  c('summoner', 'echidna_brood', '厄喀德那之卵', '🥚', '立即召喚 3 隻提瑞西阿斯亡靈', '萬怪之母產下的卵，孵出來的都是傳說中的怪物', 340, { type: 'summon', minion: 'skeleton_mage', count: 3 }, 3),
  c('summoner', 'hermes_syrinx', '赫密士催眠笛', '🎵', '周圍 9 公尺的敵人沉睡 3 秒並受到 4 倍傷害（首領不會睡著）', '赫密士吹著蘆笛，讓百眼巨人的一百隻眼睛全部闔上', 400, { type: 'nova', power: 4, radius: 9, color: 0x9adfff, stun: 3 }, 2),
  c('summoner', 'moirai_thread', '摩伊賴命運之線', '🧵', '30 秒內技能冷卻快 50%', '命運三女神紡線、量線、剪線，連宙斯都不能違抗', 400, { type: 'buff', stat: 'cdr', value: 0.5, duration: 30 }, 2),
  c('summoner', 'tartarus_chain', '塔爾塔洛斯青銅鎖鏈', '⛓️', '獲得最大 HP 65% 的護盾（40 秒）', '囚禁獨眼巨人的青銅鎖鏈，被宙斯解開後成了眾神的盾', 420, { type: 'shield', ratio: 0.65, duration: 40 }, 2),
  // ---- 劍俠：爆擊、冷卻、身法 ----
  c('swordsman', 'icaria_wine', '伊卡里亞葡萄酒', '🍷', '立即回復 50% HP', '酒神第一次把葡萄酒交給人間的村莊', 45, { type: 'heal', hp: 0.5 }, 12),
  c('swordsman', 'castalia_spring', '卡斯塔利亞聖泉', '💧', '立即回復 50% MP', '德爾菲山腳下、詩人與劍客都來飲的泉水', 40, { type: 'heal', mp: 0.5 }, 12),
  c('swordsman', 'panacea_herb', '帕納刻萬靈草', '🌿', '20 秒內持續回復共 80% HP', '醫神之女帕納刻，能治百病的藥草', 110, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('swordsman', 'hermes_strap', '赫密士鞋帶', '🪢', '40 秒內移動速度 +40%', '從信使之神的飛翼涼鞋拆下的鞋帶', 100, { type: 'buff', stat: 'speed', value: 0.4, duration: 40 }, 6),
  c('swordsman', 'nemesis_whetstone', '涅墨西斯磨劍石', '🪨', '60 秒內爆擊率 +20%', '復仇女神用來磨利審判之劍的石頭', 150, { type: 'buff', stat: 'crit', value: 0.2, duration: 60 }, 4),
  c('swordsman', 'peleus_oil', '珀琉斯劍油', '🛢️', '60 秒內攻擊力 +25%', '阿基里斯之父擦拭神賜之劍的油', 160, { type: 'buff', stat: 'atk', value: 0.25, duration: 60 }, 4),
  c('swordsman', 'palamedes_dice', '帕拉墨得斯骰子', '🎲', '30 秒內技能冷卻快 30%', '特洛伊戰場上，智者發明來打發時間的骰子', 150, { type: 'buff', stat: 'cdr', value: 0.3, duration: 30 }, 4),
  c('swordsman', 'harpe_shard', '珀耳修斯金鐮碎片', '🌙', '60 秒內爆擊傷害 +50%', '斬下梅杜莎頭顱的金鐮刃上掉下的碎片', 170, { type: 'buff', stat: 'critDmg', value: 0.5, duration: 60 }, 4),
  c('swordsman', 'boreas_gust', '玻瑞阿斯北風', '🌬️', '對周圍 7 公尺造成 3 倍傷害並緩速', '北風之神一口氣吹出的劍風', 130, { type: 'nova', power: 3, radius: 7, color: 0xb8f0ff, slow: 3 }, 5),
  c('swordsman', 'ariadne_thread', '阿里阿德涅線團', '🧶', '所有技能冷卻立即轉好', '帶忒修斯走出迷宮的線團', 200, { type: 'cdReset' }, 3),
  c('swordsman', 'dioscuri_star', '狄俄斯庫里雙星', '✨', '3 秒內無敵', '守護航海者與劍士的雙子星', 160, { type: 'invuln', duration: 3 }, 3),
  c('swordsman', 'meleager_brand', '墨勒阿革洛斯命運木', '🪵', '45 秒內造成傷害的 12% 回血', '燒完就會帶走主人性命的那根木柴', 180, { type: 'buff', stat: 'leech', value: 0.12, duration: 45 }, 3),
  c('swordsman', 'thetis_veil', '忒提斯海紗', '🌊', '獲得最大 HP 45% 的護盾（30 秒）', '海之女神披在兒子身上的海紗', 210, { type: 'shield', ratio: 0.45, duration: 30 }, 3),
  c('swordsman', 'fleece_thread', '金羊毛絲線', '🐑', '立即回復 100% HP 與 MP', '從科爾基斯金羊毛上抽出的一縷金絲', 250, { type: 'heal', hp: 1, mp: 1 }, 2),
  c('swordsman', 'cronus_harpe', '克洛諾斯鐮刃', '🌘', '對周圍 7 公尺造成 5 倍攻擊力的傷害', '泰坦之王推翻天空時揮出的第一把鐮刃', 260, { type: 'nova', power: 5, radius: 7, color: 0x8fd8ff }, 2),
  c('swordsman', 'hermes_blade', '赫密士斬眼刃', '🗡️', '60 秒內爆擊傷害 +70%', '赫密士用笛聲催眠阿爾戈斯，再一劍斬下他的頭', 380, { type: 'buff', stat: 'critDmg', value: 0.7, duration: 60 }, 3),
  c('swordsman', 'dike_sword', '狄刻正義之劍', '⚔️', '60 秒內爆擊率 +25%', '正義女神狄刻手持寶劍，懲罰一切不義之人', 360, { type: 'buff', stat: 'crit', value: 0.25, duration: 60 }, 3),
  c('swordsman', 'pelion_ash', '佩利翁山梣木', '🌳', '60 秒內攻擊力 +35%', '喀戎在佩利翁山削下梣木，做成阿基里斯的長槍', 360, { type: 'buff', stat: 'atk', value: 0.35, duration: 60 }, 3),
  c('swordsman', 'nephele_cloud', '涅斐勒雲影', '☁️', '4 秒內無敵', '宙斯用雲捏出的赫拉替身，半人馬一族由她而生', 400, { type: 'invuln', duration: 4 }, 2),
  c('swordsman', 'aeolus_bag', '埃俄羅斯風之囊', '🌪️', '對周圍 9 公尺造成 5.5 倍傷害並緩速', '風神把所有逆風裝進牛皮囊，卻被奧德修斯的船員好奇打開', 440, { type: 'nova', power: 5.5, radius: 9, color: 0xc8f0ff, slow: 3 }, 2),
  // ---- 訓獸師：野獸、生存、野性 ----
  c('tamer', 'goat_milk', '阿瑪爾忒亞羊奶', '🥛', '立即回復 50% HP', '把嬰兒宙斯餵大的神羊阿瑪爾忒亞的奶', 45, { type: 'heal', hp: 0.5 }, 12),
  c('tamer', 'spring_water', '阿瑞圖薩泉水', '💧', '立即回復 50% MP', '寧芙阿瑞圖薩為了躲避河神，化成了一道清泉', 40, { type: 'heal', mp: 0.5 }, 12),
  c('tamer', 'chiron_herb', '喀戎藥草', '🌿', '20 秒內持續回復共 80% HP', '半人馬賢者喀戎，在佩利翁山上教英雄們辨認的草藥', 110, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('tamer', 'hound_whistle', '斯巴達獵犬哨', '📯', '立即喚來 2 隻斯巴達獵犬（不花 MP）', '斯巴達人用來召集獵犬的青銅哨子', 90, { type: 'summon', minion: 'hound', count: 2 }, 8),
  c('tamer', 'eagle_feather', '宙斯神鷹羽', '🪶', '立即召來 1 隻宙斯神鷹', '替宙斯銜來雷霆的神鷹，掉下的一根金羽', 120, { type: 'summon', minion: 'eagle', count: 1 }, 6),
  c('tamer', 'bear_honey', '卡呂冬野蜂蜜', '🍯', '立即喚出 1 隻卡呂冬巨熊', '卡呂冬森林深處的野蜂蜜，巨熊聞到就會跑來', 150, { type: 'summon', minion: 'bear', count: 1 }, 5),
  c('tamer', 'pan_pipes', '牧神潘之笛', '🎵', '立即野性咆哮：附近野獸 8 秒內攻擊與攻速大增、回血', '山野之神潘吹起蘆笛，林間的野獸都跟著躁動起來', 160, { type: 'roar', duration: 8 }, 4),
  c('tamer', 'deer_hide', '刻律涅鹿皮', '🦌', '40 秒內移動速度 +40%', '金角聖鹿的皮，穿上就能跑得像牠一樣快', 100, { type: 'buff', stat: 'speed', value: 0.4, duration: 40 }, 6),
  c('tamer', 'lion_mane', '涅墨亞獅鬃', '🦁', '60 秒內受到傷害 -30%', '刀槍不入的金獅鬃毛', 140, { type: 'buff', stat: 'def', value: 0.3, duration: 60 }, 4),
  c('tamer', 'boar_tusk', '卡呂冬獠牙', '🐗', '45 秒內攻擊力 +25%（野獸一起變強）', '阿塔蘭塔射中的那頭巨大野豬的獠牙', 150, { type: 'buff', stat: 'atk', value: 0.25, duration: 45 }, 4),
  c('tamer', 'artemis_arrow', '阿蒂蜜絲銀箭', '🏹', '對周圍 6 公尺造成 2.5 倍傷害', '狩獵女神從不落空的銀箭', 120, { type: 'nova', power: 2.5, radius: 6, color: 0xd8e8ff }, 5),
  c('tamer', 'orpheus_song', '俄耳甫斯之歌', '🎶', '立即喚來 3 隻斯巴達獵犬', '連猛獸都會安靜下來聆聽的歌聲', 200, { type: 'summon', minion: 'hound', count: 3 }, 4),
  c('tamer', 'atalanta_apple', '希波墨涅斯金蘋果', '🍎', '所有技能冷卻立即轉好', '希波墨涅斯丟下金蘋果，讓世上跑得最快的女獵人停下腳步', 200, { type: 'cdReset' }, 3),
  c('tamer', 'actaeon_antler', '阿克泰翁鹿角', '🦴', '獲得最大 HP 40% 的護盾（30 秒）', '偷看女神沐浴而被變成鹿的獵人留下的角', 200, { type: 'shield', ratio: 0.4, duration: 30 }, 3),
  c('tamer', 'cybele_roar', '庫柏勒獅吼', '🌋', '對周圍 7 公尺造成 3 倍傷害並暈眩 1.5 秒（首領不會暈）', '眾神之母乘坐獅車，獅子一吼山河震動', 180, { type: 'nova', power: 3, radius: 7, color: 0xffb060, stun: 1.5 }, 4),
  c('tamer', 'pegasus_bridle', '珀伽索斯金轡頭', '✨', '立即召來 2 隻宙斯神鷹', '雅典娜送給柏勒洛豐、用來馴服飛馬的金轡頭', 340, { type: 'summon', minion: 'eagle', count: 2 }, 3),
  c('tamer', 'callisto_star', '卡利斯托大熊星', '🌌', '立即喚出 2 隻卡呂冬巨熊', '被變成熊的寧芙卡利斯托，被宙斯升上夜空成了大熊座', 380, { type: 'summon', minion: 'bear', count: 2 }, 2),
  c('tamer', 'potnia_crown', '萬獸女主之冠', '👑', '45 秒內造成傷害的 12% 回血', '古老的「萬獸女主」，野獸都向她低頭', 360, { type: 'buff', stat: 'leech', value: 0.12, duration: 45 }, 3),
  c('tamer', 'helios_reins', '赫利俄斯日車韁繩', '☀️', '30 秒內技能冷卻快 50%', '駕著四匹火馬拉的日車橫越天空的韁繩', 400, { type: 'buff', stat: 'cdr', value: 0.5, duration: 30 }, 2),
  c('tamer', 'beast_mother', '厄喀德那獸母之血', '🩸', '立即野性咆哮 15 秒：附近野獸回血、攻擊與攻速大增', '萬怪之母的血，讓所有野獸都把你當成了牠們的母親', 450, { type: 'roar', duration: 15 }, 2),
  // ---- 忍者（v1.88）：夜、睡、死、詭計——希臘神話裡屬於黑夜的神祇 ----
  c('ninja', 'nyx_dew', '倪克斯夜露', '💧', '立即回復 50% HP', '夜之女神披上黑紗時落下的露水', 45, { type: 'heal', hp: 0.5 }, 12),
  c('ninja', 'lethe_water', '勒忒忘川水', '🫗', '立即回復 50% MP', '喝一口就忘了疲憊的冥府之水', 40, { type: 'heal', mp: 0.5 }, 12),
  c('ninja', 'hypnos_poppy', '許普諾斯罌粟', '🌺', '20 秒內持續回復共 80% HP', '睡神枕邊的罌粟，讓傷口在夢裡癒合', 110, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('ninja', 'hermes_sandal', '赫密士夜行草鞋', '🩴', '40 秒內移動速度 +40%', '盜賊之神偷走阿波羅牛群那晚穿的草鞋', 100, { type: 'buff', stat: 'speed', value: 0.4, duration: 40 }, 6),
  c('ninja', 'autolycus_pick', '奧托呂科斯開鎖針', '🪡', '60 秒內爆擊率 +20%', '赫密士之子、盜賊之王最得意的小工具', 150, { type: 'buff', stat: 'crit', value: 0.2, duration: 60 }, 4),
  c('ninja', 'medea_venom', '美狄亞毒刃油', '🧪', '60 秒內攻擊力 +25%', '科爾基斯女巫調出來塗在刀刃上的毒', 160, { type: 'buff', stat: 'atk', value: 0.25, duration: 60 }, 4),
  c('ninja', 'sisyphus_wit', '西西弗斯詭計', '🎲', '30 秒內技能冷卻快 30%', '騙過死神兩次的國王留下的小聰明', 150, { type: 'buff', stat: 'cdr', value: 0.3, duration: 30 }, 4),
  c('ninja', 'thanatos_feather', '塔納托斯死神黑羽', '🪶', '60 秒內爆擊傷害 +50%', '死神翅膀上掉下的一根黑羽', 170, { type: 'buff', stat: 'critDmg', value: 0.5, duration: 60 }, 4),
  c('ninja', 'erebus_smoke', '厄瑞玻斯黑煙', '🌫️', '對周圍 7 公尺造成 3 倍傷害並緩速', '幽冥之神吐出的一口黑煙', 130, { type: 'nova', power: 3, radius: 7, color: 0x8a7ab8, slow: 3 }, 5),
  c('ninja', 'morpheus_dream', '墨菲斯夢境', '💭', '所有技能冷卻立即轉好', '夢神讓時間在夢裡倒流', 200, { type: 'cdReset' }, 3),
  c('ninja', 'hades_helm', '黑帝斯隱身盔', '🪖', '3 秒內無敵', '冥王借給珀耳修斯的隱身頭盔', 160, { type: 'invuln', duration: 3 }, 3),
  c('ninja', 'nemesis_blood', '涅墨西斯之血', '🩸', '45 秒內造成傷害的 12% 回血', '復仇女神從不讓仇人全身而退', 180, { type: 'buff', stat: 'leech', value: 0.12, duration: 45 }, 3),
  c('ninja', 'nyx_veil', '倪克斯夜幕', '🌌', '獲得最大 HP 45% 的護盾（30 秒）', '夜之女神的面紗，連宙斯都不敢掀開', 210, { type: 'shield', ratio: 0.45, duration: 30 }, 3),
  c('ninja', 'hecate_torch', '赫卡忒火炬', '🔥', '立即回復 100% HP 與 MP', '十字路口女神為迷路者點亮的火炬', 250, { type: 'heal', hp: 1, mp: 1 }, 2),
  c('ninja', 'thanatos_scythe', '塔納托斯冥鐮', '🌘', '對周圍 7 公尺造成 5 倍攻擊力的傷害', '死神親手收割靈魂的鐮刀', 260, { type: 'nova', power: 5, radius: 7, color: 0x9a7aff }, 2),
  c('ninja', 'odysseus_horse', '奧德修斯木馬', '🐴', '60 秒內爆擊傷害 +70%', '藏著伏兵、騙開特洛伊城門的木馬', 380, { type: 'buff', stat: 'critDmg', value: 0.7, duration: 60 }, 3),
  c('ninja', 'eris_apple', '厄里斯紛爭金蘋果', '🍎', '60 秒內爆擊率 +25%', '一顆蘋果，就點燃了整場特洛伊戰爭', 360, { type: 'buff', stat: 'crit', value: 0.25, duration: 60 }, 3),
  c('ninja', 'styx_oath', '斯堤克斯之誓', '🌊', '60 秒內攻擊力 +35%', '連眾神都不敢違背的冥河誓約', 360, { type: 'buff', stat: 'atk', value: 0.35, duration: 60 }, 3),
  c('ninja', 'chaos_shadow', '卡俄斯原初之影', '🕳️', '4 秒內無敵', '萬物誕生之前就存在的黑暗', 400, { type: 'invuln', duration: 4 }, 2),
  c('ninja', 'tartarus_gale', '塔爾塔洛斯陰風', '🌪️', '對周圍 9 公尺造成 5.5 倍傷害並緩速', '從無底深淵吹上來的陰風', 440, { type: 'nova', power: 5.5, radius: 9, color: 0x7a5ad8, slow: 3 }, 2),
];

/** 某職業看得到的所有道具（共用＋專屬） */
export function consumablesFor(cls?: HeroClass): ConsumableDef[] {
  return [...CONSUMABLES, ...CLASS_CONSUMABLES.filter((d) => d.cls === cls)];
}

export const CONSUMABLE_MAP: Record<string, ConsumableDef> = Object.fromEntries([...CONSUMABLES, ...CLASS_CONSUMABLES].map((d) => [d.id, d]));

/** 小怪掉道具的機率（首領必掉 1 個） */
export const CONSUMABLE_DROP_CHANCE = 0.05;

/** 依權重隨機挑一個道具（共用＋該職業專屬） */
export function rollConsumable(rng: () => number = Math.random, cls?: HeroClass): string {
  const pool = consumablesFor(cls);
  const total = pool.reduce((a, d) => a + d.dropWeight, 0);
  let r = rng() * total;
  for (const d of pool) {
    r -= d.dropWeight;
    if (r < 0) return d.id;
  }
  return pool[0].id;
}

/* ======================= 道具冷卻（v1.106） ======================= */

/**
 * 以前只有回復類有冷卻，快捷欄放兩瓶無敵藥水輪流按就能一直無敵、攻擊藥水一直續。
 * v1.106：每一類道具各自一個冷卻（同類共用，換一種同類道具也要等）：
 * - 回復（heal）沿用藥水冷卻；持續回復 regen 20 秒
 * - 無敵 invuln 90 秒、技能冷卻重置 cdReset 90 秒、護盾 shield 45 秒、召喚 summon 30 秒、咆哮 roar 30 秒、範圍攻擊 nova 12 秒
 * - 增益 buff：同一種屬性（攻擊、爆擊…）的冷卻 = 持續時間 × BUFF_CD_MUL（60 秒的攻擊藥 → 90 秒才能再喝，最多約 2/3 時間有效），
 *   而且**同時最多 MAX_ACTIVE_BUFFS 種增益**
 * - 傳送、長時間加成（經驗 / 金幣）沒有冷卻
 * 冷卻不存檔（重新整理會清掉），只在戰鬥世界時間裡倒數（暫停、開選單時不動）。
 */
export const ITEM_CD: Partial<Record<ConsumableEffect['type'], number>> = {
  regen: 20,
  invuln: 90,
  cdReset: 90,
  shield: 45,
  summon: 30,
  roar: 30,
  nova: 12,
};
export const BUFF_CD_MUL = 1.5;
export const MAX_ACTIVE_BUFFS = 3;

const CD_NAMES: Partial<Record<string, string>> = {
  regen: '持續回復', invuln: '無敵', cdReset: '冷卻重置', shield: '護盾', summon: '召喚', roar: '咆哮', nova: '範圍攻擊',
  'buff:atk': '攻擊增益', 'buff:def': '防禦增益', 'buff:speed': '移速增益', 'buff:crit': '爆擊增益', 'buff:pen': '穿透增益',
  'buff:critDmg': '爆傷增益', 'buff:cdr': '冷卻縮減', 'buff:leech': '吸血增益',
};

/** 冷卻群組（同群組共用冷卻）；回復類（走藥水冷卻）與沒有冷卻的回傳 null */
export function cdGroup(def: ConsumableDef): string | null {
  const e = def.effect;
  if (e.type === 'buff') return `buff:${e.stat}`;
  return ITEM_CD[e.type] ? e.type : null;
}

/** 用了之後這個群組要冷卻幾秒 */
export function cdSeconds(def: ConsumableDef): number {
  const e = def.effect;
  if (e.type === 'buff') return Math.round(e.duration * BUFF_CD_MUL);
  return ITEM_CD[e.type] ?? 0;
}

export function cdGroupName(group: string): string {
  return CD_NAMES[group] ?? '道具';
}
