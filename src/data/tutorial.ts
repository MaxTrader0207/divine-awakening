import type { ZoneId } from './types';

/**
 * 新手指引的步驟（依序完成，每步有小獎勵）。
 * 進度邏輯在 systems/Tutorial.ts；HUD 卡片、地上的金色箭頭、選單「指引」分頁都讀這份資料。
 */
export type TutorialGoal =
  | { type: 'move'; meters: number }
  | { type: 'zone'; zone: ZoneId }
  | { type: 'kill'; count: number }
  /** 施放 Q/W/E/R 中幾種不同的技能 */
  | { type: 'skills'; count: number }
  | { type: 'auto' }
  /** 使用一次道具（快捷欄 ③④ 或「裝備 → 道具」） */
  | { type: 'item' }
  | { type: 'level'; level: number }
  | { type: 'equip' }
  | { type: 'buy' }
  | { type: 'enhance' }
  | { type: 'boss'; zone: ZoneId };

export interface TutorialReward {
  gold?: number;
  gems?: number;
  hp?: number;
  mp?: number;
}

export interface TutorialStep {
  id: string;
  /** 短標題（選單清單） */
  title: string;
  /** 目標（HUD 卡片顯示這一行） */
  text: string;
  /** 怎麼做（選單、點 HUD 卡片時顯示） */
  hint: string;
  goal: TutorialGoal;
  reward: TutorialReward;
  /** 地上金色箭頭指向的位置（依玩家所在區域） */
  targets?: Partial<Record<ZoneId, { x: number; z: number }>>;
}

/** 從草原回城的出口 */
const BACK_TO_TOWN = { grassland: { x: 0, z: -28 } };

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'move',
    title: '走走看',
    text: '用搖桿走動一下',
    hint: '拖曳畫面左下角的搖桿，角色會朝那個方向走，放開就停下。電腦可以用 WASD 或方向鍵（如果按了沒反應，先用滑鼠點一下遊戲畫面）。',
    goal: { type: 'move', meters: 10 },
    reward: { gold: 20 },
  },
  {
    id: 'field',
    title: '出城冒險',
    text: '往南出城，前往阿卡迪亞草原',
    hint: '跟著腳邊的金色箭頭，走進城南的光圈。雅典城是安全區，不會有怪物；出城後才會遇到怪物。',
    goal: { type: 'zone', zone: 'grassland' },
    reward: { gold: 30 },
    targets: { town: { x: 0, z: 40.5 } },
  },
  {
    id: 'kill',
    title: '第一場戰鬥',
    text: '按「普攻」打倒 3 隻怪物',
    hint: '右下角最大的按鈕是普攻，會自動瞄準附近的怪物（電腦：空白鍵或 J）。左上角是你的血量（紅）和 MP（藍）；血量低於 70% 會自動喝紅藥水（可在「設定 → 自動補血」調整），血量歸零會回到雅典城並損失 10% 金幣。',
    goal: { type: 'kill', count: 3 },
    reward: { gold: 30, hp: 2 },
  },
  {
    id: 'skills',
    title: '使用技能',
    text: '施放 Q、W、E、R 中任 2 種技能',
    hint: '普攻旁邊的 4 顆按鈕是技能，用過要等冷卻（按鈕上會倒數），長按可以看技能說明。技能會花 MP（狂戰士花的是怒氣，打人和被打都會累積）。電腦：Q、F、E、R（W 是往上走，所以 W 技能改按 F）。',
    goal: { type: 'skills', count: 2 },
    reward: { gems: 2 },
  },
  {
    id: 'auto',
    title: '自動戰鬥',
    text: '打開右下角的 AUTO 自動戰鬥',
    hint: 'AUTO 會自動找怪、走過去、依序放技能，MP 不夠時自動喝藍藥水（紅藥水本來就會在 HP 低於 70% 自動喝）。想自己操作時推搖桿就會暫時接手，放開後 AUTO 繼續。再按一次 AUTO 關閉（電腦：T）。回到城裡會自動關閉。',
    goal: { type: 'auto' },
    reward: { gold: 30 },
  },
  {
    id: 'level',
    title: '變強',
    text: '升到 Lv.3',
    hint: '打倒怪物得到經驗值。升級會補滿血量與 MP，各項屬性也會提高。怪物名字前面有等級，比你高太多的要小心。',
    goal: { type: 'level', level: 3 },
    reward: { gold: 50 },
  },
  {
    id: 'item',
    title: '快捷道具',
    text: '點左下快捷欄 ③，用一次道具',
    hint: '紅、藍藥水右邊的 ③④ 是快捷道具欄，一開始放了「赫斯提亞爐火麵包」（慢慢回血）和「赫密士之羽」（立刻回城）。點一下就會使用（電腦：3、4）。想換別的道具：到「裝備 → 道具」按道具旁的 ③④。空的格子點一下也會帶你過去。',
    goal: { type: 'item' },
    reward: { gold: 40, hp: 2 },
  },
  {
    id: 'equip',
    title: '換上新裝備',
    text: '在「裝備」換上一件新裝備',
    hint: '怪物會掉落裝備，走過去就會撿起來（也可以在商城購買）。點左上角的角色卡（或「選單 → 裝備」），在背包點想穿的裝備，再按「裝備」；背包裡比身上好的會標 ▲。開著選單時遊戲會停住，戰鬥中換裝也不會被打。名字顏色越亮越稀有：白 → 綠 → 藍 → 紫。',
    goal: { type: 'equip' },
    reward: { gold: 40 },
  },
  {
    id: 'buy',
    title: '補給',
    text: '回雅典城，到道具店買一瓶藥水',
    hint: '走進商店門口的金色光圈就會打開那間店，也可以從選單直接開「商城」看全部商品。藥水一瓶 20 金幣：紅藥水回血、藍藥水回 MP（畫面左下，電腦：1、2）。西市集還有藥房、職業行會和每天換貨的旅行商人，小地圖上有各店的圖示。',
    goal: { type: 'buy' },
    reward: { hp: 3 },
    targets: { town: { x: -22, z: -12.6 }, ...BACK_TO_TOWN },
  },
  {
    id: 'enhance',
    title: '強化裝備',
    text: '到強化屋把裝備強化一次',
    hint: '強化讓裝備屬性提高（每級 +8%，最高 +10）。+2 之後有失敗機率，失敗只會花掉金幣，裝備不會壞；花 5 顆鑽石可以保證成功。',
    goal: { type: 'enhance' },
    reward: { gold: 60 },
    targets: { town: { x: 22, z: -12.6 }, ...BACK_TO_TOWN },
  },
  {
    id: 'dungeon',
    title: '前往副本',
    text: '到廣場的傳送石，選「波賽頓海岸」',
    hint: '走到中央廣場的藍色傳送石會打開地圖，點副本就能傳送。副本的怪物比較強，最深處有首領，建議 Lv.4 以上再去。',
    goal: { type: 'zone', zone: 'dungeon_1' },
    reward: { gems: 2 },
    targets: { town: { x: 0, z: 1.5 }, ...BACK_TO_TOWN },
  },
  {
    id: 'boss',
    title: '擊敗首領',
    text: '打倒首領「巨蟹卡基諾斯」',
    hint: '首領放大招前，地上會先出現紅色範圍，看到就快走開！首領會依你的等級與裝備調整強度，每一場大約要打 3 分鐘，血少時可以按「暫停」在暫停畫面喝藥。打不贏就回城強化裝備、升級後再來。首領一定掉落精良以上的裝備，打倒後會開放下一層副本（第二層之後還會開放支線地圖，打倒守護者有機會收服夥伴）。首領會學習：一直用同一種方式躲招，牠的預警會越來越短。',
    goal: { type: 'boss', zone: 'dungeon_1' },
    reward: { gold: 150, gems: 5 },
    targets: { dungeon_1: { x: -2, z: -21 } },
  },
];

export function rewardText(r: TutorialReward): string {
  const parts: string[] = [];
  if (r.gold) parts.push(`${r.gold} 金幣`);
  if (r.gems) parts.push(`${r.gems} 鑽石`);
  if (r.hp) parts.push(`紅藥水 ×${r.hp}`);
  if (r.mp) parts.push(`藍藥水 ×${r.mp}`);
  return parts.join('、');
}
