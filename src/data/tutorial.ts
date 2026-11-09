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
  | { type: 'boss'; zone: ZoneId }
  /** v1.100 打開一個寶箱 */
  | { type: 'chest' }
  /** v1.100 完成一個每日任務 */
  | { type: 'quest' };

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
    hint: '在畫面左下半部任何地方按住拖曳，搖桿就會出現，角色朝那個方向走，放開就停下。雙指開合可以拉遠拉近鏡頭。電腦用 WASD 或方向鍵（按了沒反應就先用滑鼠點一下畫面）。',
    goal: { type: 'move', meters: 10 },
    reward: { gold: 20 },
  },
  {
    id: 'field',
    title: '出城冒險',
    text: '往南出城，前往阿卡迪亞草原',
    hint: '跟著腳邊的金色箭頭，走進城南的光圈。雅典城是安全區，不會有怪物；出城後才會遇到怪物。右上角的小地圖可以看到出口、商店和寶箱的位置。',
    goal: { type: 'zone', zone: 'grassland' },
    reward: { gold: 30 },
    targets: { town: { x: 0, z: 40.5 } },
  },
  {
    id: 'kill',
    title: '第一場戰鬥',
    text: '按「普攻」打倒 3 隻怪物',
    hint: '右下角最大的按鈕是普攻，會自動瞄準最近的怪物（電腦：空白鍵或 J）。左上角是你的 HP（紅）和 MP（藍），HP 低於 70% 會自動喝紅藥水（「設定 → 自動補血」可以調整）。地上出現紅色範圍就是怪物要出手了，走開就不會被打到。倒下時可以選原地復活（每天第一次免費）、在入口復活或回主城。',
    goal: { type: 'kill', count: 3 },
    reward: { gold: 30, hp: 2 },
  },
  {
    id: 'skills',
    title: '使用技能',
    text: '施放 Q、W、E、R 中任 2 種技能',
    hint: '普攻旁邊的 4 顆按鈕是技能，用過要等冷卻（按鈕上會倒數），長按可以看技能說明。技能會花 MP（狂戰士花的是怒氣，打人和被打都會累積）。每個職業的技能不一樣，「選單 → 指引」的說明頁有完整介紹。電腦：Q、F、E、R（W 是往上走，所以 W 技能改按 F）。',
    goal: { type: 'skills', count: 2 },
    reward: { gems: 2 },
  },
  {
    id: 'auto',
    title: '自動戰鬥',
    text: '打開右下角的 AUTO 自動戰鬥',
    hint: 'AUTO 會自己找怪、放技能、閃開首領的大招、撿掉落物，附近沒有怪時還會順路去開寶箱；MP 不夠會自動喝藍藥水。想自己操作就推搖桿，放開後 AUTO 繼續。再按一次關閉（電腦：T），回到城裡會自動關閉。',
    goal: { type: 'auto' },
    reward: { gold: 30 },
  },
  {
    id: 'level',
    title: '變強',
    text: '升到 Lv.3',
    hint: '打倒怪物得到經驗值（左上角最下面那條細線）。升級會補滿 HP 與 MP、提高各項屬性。怪物名字前面有等級，比你高太多的要小心；去和自己等級差不多的地方打，經驗最多。',
    goal: { type: 'level', level: 3 },
    reward: { gold: 50 },
  },
  {
    id: 'item',
    title: '快捷道具',
    text: '點左下快捷欄 ③，用一次道具',
    hint: '紅、藍藥水右邊的 ③④ 是快捷道具欄，一開始放了「赫斯提亞爐火麵包」（慢慢回血）和「赫密士之羽」（立刻回城）。點一下就會使用（電腦：3、4）。想換別的道具：到「裝備 → 道具」按道具旁的 ③④；空的格子點一下也會帶你過去。',
    goal: { type: 'item' },
    reward: { gold: 40, hp: 2 },
  },
  {
    id: 'equip',
    title: '換上新裝備',
    text: '在「裝備」換上一件新裝備',
    hint: '怪物會掉裝備，走過去就撿起來。點左上角的角色卡（或「選單 → 裝備」），在背包點裝備再按「裝備」；比身上好的會標 ▲。名字顏色越亮越稀有：白（普通）→ 綠（精良）→ 藍（稀有）→ 紫（史詩），名字有 ★ 的是神話裝，同一套穿越多件加成越多，全身都是★神話裝還會換成「神裝形態」。比身上差的普通裝備撿到會自動換成金幣，背包上方也能一鍵賣出。開著選單時遊戲會停住。',
    goal: { type: 'equip' },
    reward: { gold: 40 },
  },
  {
    id: 'buy',
    title: '補給',
    text: '回雅典城，到道具店買一瓶藥水',
    hint: '走進商店門口的金色光圈就會打開那間店；選單裡的「商城」可以看全部商品。藥水一瓶 20 金幣，一次買 10 瓶打九折。雅典城有 8 間店：武器、防具、道具、藥房、珠寶、職業行會、神諭殿（用鑽石買），還有每天換貨的旅行商人，小地圖上有各店的圖示。',
    goal: { type: 'buy' },
    reward: { hp: 3 },
    targets: { town: { x: -22, z: -12.6 }, ...BACK_TO_TOWN },
  },
  {
    id: 'enhance',
    title: '強化裝備',
    text: '到強化屋把裝備強化一次',
    hint: '強化屋在城的東邊（小地圖上的 🔨）。每強化一級屬性 +8%，最高 +10；+2 之後有失敗機率，失敗只花掉金幣、裝備不會壞，花 5 顆鑽石可以保證成功。先強化武器，打怪最有感。',
    goal: { type: 'enhance' },
    reward: { gold: 60 },
    targets: { town: { x: 22, z: -12.6 }, ...BACK_TO_TOWN },
  },
  {
    id: 'dungeon',
    title: '前往副本',
    text: '到廣場的傳送石，選「波賽頓海岸」',
    hint: '走到中央廣場的藍色傳送石會打開地圖，點副本就能傳送（選單「地圖」也可以）。副本的怪物比較強，最深處有首領，建議 Lv.4 以上再去。',
    goal: { type: 'zone', zone: 'dungeon_1' },
    reward: { gems: 2 },
    targets: { town: { x: 0, z: 1.5 }, ...BACK_TO_TOWN },
  },
  {
    id: 'boss',
    title: '擊敗首領',
    text: '打倒首領「巨蟹卡基諾斯」',
    hint: '首領放大招前，地上會先出現紅色範圍，看到就走開！首領會依你的等級與裝備調整強度，每一場大約 3 分鐘；血少時可以按「暫停」喝藥。首領會學習：一直用同一招躲，預警會越來越短。打不贏就回城強化、升級後再來。打倒後一定掉精良以上的裝備，並開放下一層。',
    goal: { type: 'boss', zone: 'dungeon_1' },
    reward: { gold: 150, gems: 5 },
    targets: { dungeon_1: { x: -2, z: -21 } },
  },
  {
    id: 'chest',
    title: '尋寶',
    text: '在野外或副本打開 1 個寶箱',
    hint: '野外和副本的角落藏著寶箱：地上有一圈金光，小地圖上是閃爍的金色方塊。走過去就會打開，有金幣、裝備，有時還有道具。打開的寶箱過 10 分鐘會重新出現。開著 AUTO 時，附近沒有怪物就會順路去開。',
    goal: { type: 'chest' },
    reward: { gold: 80 },
  },
  {
    id: 'quest',
    title: '每日任務',
    text: '完成 1 個每日任務',
    hint: '「選單 → 任務」有今天的 3 個任務（例如打倒幾隻怪、賺多少金幣），每天換新；完成後回到任務頁領金幣和鑽石。同一頁還有每日簽到，連續簽到 7 天獎勵越來越好。選單按鈕上的紅點表示有東西可以領。',
    goal: { type: 'quest' },
    reward: { gems: 3 },
  },
  {
    id: 'floor2',
    title: '繼續深入',
    text: '打倒第二層「賽蓮海蝕洞」的首領',
    hint: '打倒第二層首領後會開放第一張支線地圖「赫利孔山靈泉」：支線最深處的守護者打倒後有機會收服成夥伴，召喚出來一起戰鬥。主線一共 30 層、Lv.150，之後還有神獸討伐、試煉塔、每週首領等著你。指引到這裡結束，祝你冒險愉快！',
    goal: { type: 'boss', zone: 'dungeon_2' },
    reward: { gold: 300, gems: 10 },
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
