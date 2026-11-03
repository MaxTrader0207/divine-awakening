import type { HeroClass } from './classes';
import { CLASSES } from './classes';
import { ZONES, DUNGEON_ORDER } from './zones';
import { ENHANCE_GEM_COST, ENHANCE_MAX, POTION_PRICE, RARITY, RARITY_ORDER } from './items';
import type { ZoneId } from './types';

/**
 * 遊戲說明（選單「指引」分頁下半部）。
 * 每段是一個可展開的區塊；文字裡的 **粗體** 與 [按鍵] 由 ui/GuideTab.ts 轉成樣式。
 * 數字盡量從遊戲資料讀，改數值時說明會跟著變。
 */
export interface ManualSection {
  icon: string;
  title: string;
  lines: string[];
}

/** 每個技能一句話的說明（依 skill.id） */
export const SKILL_HELP: Record<string, string> = {
  magic_bolt: '追蹤最近的敵人的魔法彈。',
  fireball: '追蹤的火球，命中後爆炸，傷害周圍的敵人。',
  frost_nova: '以自己為中心冰凍一圈，敵人移動變慢 2.5 秒。',
  flame_burst: '目標腳下短暫預警後爆炸，範圍大、傷害高。',
  blink: '往搖桿方向瞬移一段距離，瞬間無敵，用來躲大招。',
  arrow: '快速的追蹤箭。',
  multishot: '扇形一次射出 5 支箭。',
  pierce: '直線穿透所有敵人。',
  arrow_rain: '在目標區域降下 3 波箭雨。',
  backstep: '往後跳開，順便讓附近的敵人變慢。',
  slash: '前方扇形揮劍，可以同時砍到好幾隻。',
  shield_bash: '盾牌重擊，暈眩敵人並打斷他們正在準備的攻擊（首領不會暈）。',
  guard: '4 秒內受到的傷害大減，並吸引附近的敵人打你。',
  whirlwind: '原地旋轉 3 圈，打到身邊所有敵人。',
  charge: '往前衝鋒，撞到的敵人都會受傷，衝刺中無敵。',
  cleave: '前方大範圍劈砍。',
  leap: '跳到目標身邊，落地造成範圍傷害並讓敵人變慢，空中無敵。',
  bloodlust: '6 秒內造成傷害的一部分會變成你的血量。',
  execute: '重擊；敵人血量低於 35% 時傷害加倍。',
  berserk: '8 秒內攻擊力提高、普攻變快、怒氣累積更快。',
  shadow_bolt: '追蹤的暗影箭（本人傷害較低，主力是召喚物）。',
  raise_skeleton: '召喚 2 隻近戰亡靈，最多同時 4 隻，存在 20 秒。',
  raise_mage: '召喚 1 隻遠程亡靈，最多 2 隻。',
  raise_guard: '召喚 1 隻高血量的坦克亡靈，出場時吸引附近敵人。',
  bone_burst: '讓所有召喚物原地爆炸造成範圍傷害，每爆一隻回復你一些血量。',
};

const SLOT_KEYS: Record<string, string> = { basic: '普攻', Q: 'Q', W: 'W', E: 'E', R: 'R' };

function zoneLine(id: ZoneId): string {
  const z = ZONES[id];
  const [a, b] = z.levelRange ?? [1, 1];
  // 副本的地名在 name（subtitle 是「第一層・…」）；野外的 name 是大陸名，地名在 subtitle 前半
  const name = z.dungeon ? `${'一二三四五'[z.dungeon.floor - 1]}層・${z.name}` : z.subtitle.split('・')[0];
  const boss = z.dungeon ? `，首領「${z.dungeon.bossName}」` : '';
  const need = z.minLevel ? `（Lv.${z.minLevel} 才能進入）` : '';
  return `**${name}**：建議 Lv.${a}~${b}${boss}${need}`;
}

export function manualSections(heroClass: HeroClass): ManualSection[] {
  const c = CLASSES[heroClass];
  const rarities = RARITY_ORDER.map((r) => `${RARITY[r].name} ×${RARITY[r].mul}`).join('、');
  const resource = c.resource === 'rage' ? '怒氣（打人、被打都會累積，不打會慢慢消退）' : 'MP（會自然回復，也可以喝藍藥水）';
  return [
    {
      icon: '🎮',
      title: '操作方式',
      lines: [
        '**移動**：拖曳左下的搖桿　電腦 [W][A][S][D] 或方向鍵',
        '**普攻**：右下最大的按鈕，會自動瞄準附近的怪物　電腦 [空白] 或 [J]',
        '**技能**：普攻旁的 Q、W、E、R，用過要等冷卻　電腦 [U][I][O][P]',
        '**藥水**：左下紅藥水回 35% 血量、藍藥水回 MP，喝完要等 2 秒　電腦 [1][2]',
        '**AUTO 自動戰鬥**：右下 AUTO 按鈕　電腦 [T]',
        '**畫面遠近**：狀態框下方的 − / +',
        '**暫停**：右上「暫停」　電腦 [Esc]；**選單**：右上「選單」　電腦 [M]',
        '點右上角的小地圖可以打開大地圖。',
      ],
    },
    {
      icon: '⚔',
      title: '戰鬥基本',
      lines: [
        '怪物名字前面是等級，比你高很多的怪物會又痛又硬，比你低很多的經驗值很少。',
        '被怪物攻擊時，只要不移動也不按攻擊，角色會自動反擊。',
        '地上出現**紅色範圍**是攻擊預警，趕快走出去！首領的大招都有預警。',
        '離開戰鬥 5 秒後會慢慢回血；在雅典城裡回得很快。',
        '血量歸零會在雅典城復活，並損失 10% 金幣。',
      ],
    },
    {
      icon: c.icon,
      title: `你的職業：${c.name}`,
      lines: [
        c.desc,
        `技能消耗：${resource}`,
        ...c.skills.map((s) => `[${SLOT_KEYS[s.slot] ?? s.slot}] **${s.name}**：${SKILL_HELP[s.id] ?? ''}`),
        '想玩其他職業：到「選單 → 存檔」在空的欄位開新遊戲，最多可以有 10 個存檔。',
      ],
    },
    {
      icon: '🤖',
      title: 'AUTO 自動戰鬥',
      lines: [
        '打開後角色會自動找怪、走過去、依序施放技能。',
        '血量低於 40% 自動喝紅藥水，MP 低於 20% 自動喝藍藥水（藥水要自己準備）。',
        '想自己操作時推搖桿就會暫時接手，放開後 AUTO 繼續。',
        '城裡是安全區，不能開 AUTO；回城會自動關閉。',
      ],
    },
    {
      icon: '🎒',
      title: '裝備與強化',
      lines: [
        '6 個欄位：武器、帽子、衣服、手套、鞋子、戒指（名稱依職業不同）。怪物掉落的裝備走過去就會撿起來（背包 40 格）。',
        `稀有度（屬性倍率）：${rarities}。名字顏色白 → 綠 → 藍 → 紫。`,
        '背包裡比身上好的裝備會標上 ▲；點裝備可以穿上、強化或賣出，也能一鍵賣掉精良以下的裝備。',
        `**強化**：在強化屋或「選單 → 強化」，每級屬性 +8%，最高 +${ENHANCE_MAX}。+2 之後有失敗機率，失敗只扣金幣、裝備不會壞；花 ${ENHANCE_GEM_COST} 顆寶石可以保證成功。`,
        '越後面的副本掉落越高階的裝備（見習 → 海神 → 火神 → 宙斯）。',
      ],
    },
    {
      icon: '🛒',
      title: '商城、金幣與寶石',
      lines: [
        `藥水一瓶 ${POTION_PRICE.hp} 金幣，一次買 10 瓶打九折。`,
        '商城也賣基本裝備，擊敗副本首領後會開放更高階的裝備。',
        '金幣：打怪、賣裝備、每日任務。寶石：首領、每日任務、新手指引，可以用來保證強化成功。',
        '走進雅典城商店門口的金色光圈會打開商城，也可以直接從選單開。',
      ],
    },
    {
      icon: '🗺',
      title: '地圖與副本',
      lines: [
        '**雅典城**：安全區，有商店街、強化屋，中央廣場的傳送石可以前往副本。',
        zoneLine('grassland'),
        ...DUNGEON_ORDER.map((id) => zoneLine(id)),
        zoneLine('mistwood'),
        '副本要依序解鎖：擊敗上一層的首領才能進下一層。',
      ],
    },
    {
      icon: '📋',
      title: '每日任務',
      lines: [
        '每天 00:00（你的時區）會有 3 個新任務，內容依你的等級決定。',
        '完成後到「選單 → 任務」領獎，三個都領完還有一個獎勵寶箱。',
        '右上「選單」按鈕出現紅點代表有獎勵可以領。',
      ],
    },
    {
      icon: '💾',
      title: '存檔',
      lines: [
        '遊戲會自動存檔（換地圖、暫停、切到其他 App 時）。',
        '「選單 → 存檔」有 10 個欄位，可以複製、切換、刪除，或在空欄位開新角色。',
        '登入雲端存檔後可以在不同裝置繼續玩，也能參加排行榜（「選單 → 設定」）。',
      ],
    },
    {
      icon: '💡',
      title: '小技巧',
      lines: [
        '打首領前先買好藥水，AUTO 會自動喝。',
        '首領血量低時會狂暴，攻擊更快，這時候更要注意紅色預警。',
        '打不贏就回頭：升幾級、強化武器，再來挑戰會輕鬆很多。',
        '城裡的小動物：靠近鴿子會飛走，狗狗偶爾會跑來找你玩。',
      ],
    },
  ];
}
