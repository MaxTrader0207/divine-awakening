import type { HeroClass } from './classes';
import { CLASSES } from './classes';
import { ZONES, DUNGEON_ORDER, FIELD_ORDER, SIDE_ORDER, BEAST_ORDER, bossOf, zoneLabel } from './zones';
import { beastFirstGems } from '@/systems/BeastHunt';
import { CRIT_DMG_MAX, CRIT_RATE_MAX, ENHANCE_GEM_COST, ENHANCE_MAX, POTION_PRICE, RARITY, RARITY_ORDER } from './items';
import { BOSS_PACE } from '@/systems/BossScaling';
import { TACTICS } from '@/systems/BossTactics';
import { CAPTURE, COMPANION_LIST } from './companions';
import { ELEMENTS, ELEMENT_STRONG_MUL, ELEMENT_WEAK_MUL } from './elements';
import { PAR_SECS } from '@/systems/StageClear';
import type { ZoneId } from './types';
import { SET_4, SET_6 } from './gearSets';
import { TOWER, TOWER_AFFIXES, bossGems } from '@/systems/TrialTower';
import { GEM_SHOP } from '@/systems/GemShop';
import { DIVINITY, DIV_STATS, divBonusText } from '@/systems/Divinity';
import { MYTHIC } from '@/systems/Mythic';
import { REVIVE } from '@/systems/Revive';
import { REBIRTH } from '@/systems/Rebirth';
import { WEEKLY, WEEKLY_DIFFS } from '@/systems/WeeklyBoss';
import { MAX_TIER } from './gear';
import { MAX_LEVEL } from '@/systems/Progression';
import { BOND_PERKS, COMPANION_SKILLS, DUO, FEED, GROWTH } from './companionGrowth';
import { CODEX_BONUS_MAX, CODEX_ENTRIES, CODEX_TIERS } from './codex';
import { ACHIEVEMENTS } from './achievements';
import { LOGIN_DAYS, OFFLINE } from '@/systems/Welcome';

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
  sword_strike: '前方快速劈砍，每第三下變成突刺，傷害更高、距離更遠。',
  sword_qi: '揮出一道劍氣，直線貫穿路上所有敵人。',
  swift_step: '往前（或搖桿方向）疾步穿過敵陣，沿路的敵人受傷並緩速，期間短暫無敵。',
  sword_rain: '目標附近連續落下四波飛劍，傷害範圍內所有敵人。',
  sword_intent: '8 秒內普攻變快、爆擊率 +20%、爆擊傷害 +20%，快劍每一下都會附帶一道小劍氣。',
  beast_whip: '朝前方甩出長鞭，鞭梢可以打到稍遠的敵人，一次打中前方好幾隻。',
  call_hounds: '吹哨喚來 2 隻斯巴達獵犬，跑得快、咬得兇，最多同時 3 隻、陪你 25 秒。',
  call_eagle: '召來宙斯神鷹在空中盤旋，從遠處俯衝攻擊敵人，最多 2 隻。',
  call_bear: '喚出卡呂冬巨熊：血厚皮硬，出場就把周圍的小怪全吸引過來替你擋刀。',
  wild_roar: '一聲咆哮：附近所有野獸回復 40% 血量、多陪你 8 秒，8 秒內攻擊力與攻速提升 35%。',
};

const SLOT_KEYS: Record<string, string> = { basic: '普攻', Q: 'Q', W: 'W', E: 'E', R: 'R' };

function zoneLine(id: ZoneId): string {
  const z = ZONES[id];
  const [a, b] = z.levelRange ?? [1, 1];
  const name = zoneLabel(id);
  const bossDef = bossOf(id);
  const boss = bossDef ? `，首領「${bossDef.name}」` : '';
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
        '**技能**：普攻旁的 Q、W、E、R，用過要等冷卻　電腦 [Q][F][E][R]（W 是移動，所以 W 技能改按 F；[U][I][O][P] 也可以）',
        '**藥水**：左下紅藥水回 35% 血量、藍藥水回 MP，喝完要等 2 秒　電腦 [1][2]',
        '**快捷道具欄**：藥水右邊兩格可以放任何道具，在「裝備 → 道具」按 ③④ 放上去；空格點一下會帶你過去　電腦 [3][4]',
        '**AUTO 自動戰鬥**：右下 AUTO 按鈕　電腦 [T]',
        '**畫面遠近**：雙指開合　電腦滑鼠滾輪',
        '電腦按鍵沒反應時，先用滑鼠點一下遊戲畫面（鍵盤焦點可能還在網頁其他地方），也可以把中文輸入法切到英文。',
        '**暫停**：右上「暫停」　電腦 [Esc]；**選單**：右上「選單」　電腦 [M]。暫停或開著選單時整個遊戲停住，可以放心喝藥、換裝備；暫停畫面上也能直接喝藥水、用快捷欄道具。',
        '**角色卡**：點左上角的頭像 / 血條會直接打開「裝備」。',
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
        '**自動補血**：HP 低於 70% 會自動喝紅藥水（不用開 AUTO；「選單 → 設定 → 自動補血」可以改成 50% / 85% 或關閉，主城不會喝）。',
        `**爆擊**：爆擊時傷害乘上爆擊傷害倍率。爆擊率最高 ${Math.round(CRIT_RATE_MAX * 100)}%、爆擊傷害最高 ×${CRIT_DMG_MAX}（含道具）；劍俠、弓手、狂戰士天生比較容易爆擊。`,
        `血量歸零後可以選：**原地復活**（每天第一次免費，之後 ${REVIVE.gemBase}💎 起、同一張地圖越用越貴，最多 ${REVIVE.gemMax}💎；不扣金幣、${REVIVE.invuln} 秒無敵，等你選的時候戰場是停住的，首領保留血量）、**在入口復活**或**回主城**（都損失 10% 金幣）。AUTO 開著時 ${REVIVE.autoSecs} 秒後自動在入口復活。試煉塔、每週首領倒下直接結算。`,
      ],
    },
    {
      icon: '👑',
      title: '首領戰',
      lines: [
        `首領會依你的等級與裝備自動調整強度：你越強，首領越硬、打得越痛；等級或裝備不夠時則會變弱一些。每場大約 ${Math.round(BOSS_PACE.target / 60)} 分鐘（${BOSS_PACE.target} 秒左右）。`,
        `再強的裝備也不可能在 ${BOSS_PACE.min} 秒內打倒首領，太猛的傷害會被首領的神力擋下。血條旁出現「⚖ 依實力調整」代表這隻首領已經依你的實力調整過。`,
        '首領的血量越低越兇：70% 時「認真起來」、50% 以下狂暴（招式範圍更大、出招更快）、35% 時「使出全力」（冷卻更短），每次都會怒吼一聲、馬上出招。放大招前地上會先出現紅色範圍。',
        `首領會學習：你連續躲過牠的招式，牠的預警會越來越短（最多快 ${Math.round(TACTICS.dodgeMax * 100)}%），連躲 ${TACTICS.chainAt} 次以上還會接連續技；被打中後才慢慢恢復。`,
        `首領也會看場面：召喚物或夥伴打得比你痛，牠會轉頭追打牠們 ${TACTICS.threatTime} 秒；被召喚物圍住就放範圍招；你血少時會挑最重的一招。`,
        `破關評價 S / A / B / C：滿分 100，被首領的招式打中每次 −4、用藥每個 −1.5、超過 ${PAR_SECS} 秒每 4 秒 −1。想拿 S 就要躲開紅色預警、少喝藥。`,
        '血少時可以按「暫停」在暫停畫面喝藥；打不贏就回城強化裝備、升級後再來。',
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
        'MP 低於 20% 自動喝藍藥水；紅藥水依「自動補血」設定（預設 HP 低於 70%）喝，設定關閉時 AUTO 仍會在 40% 以下喝（藥水要自己準備）。',
        '想自己操作時推搖桿就會暫時接手，放開後 AUTO 繼續。',
        '城裡是安全區，不能開 AUTO；回城會自動關閉。',
      ],
    },
    {
      icon: '🎒',
      title: '裝備與強化',
      lines: [
        '6 個欄位：武器、帽子、衣服、手套、鞋子、戒指（名稱依職業不同）。怪物掉落的裝備走過去就會撿起來（背包 100 格，可以依欄位或「★神話」篩選）。',
        `稀有度（屬性倍率）：${rarities}。名字顏色白 → 綠 → 藍 → 紫。`,
        '背包裡比身上好的裝備會標上 ▲；點裝備可以穿上、強化或賣出，也能一鍵賣掉精良以下的裝備。「設定 → 撿到時自動賣出」可以讓比身上差的低稀有度裝備撿起來就直接換成金幣（★神話裝不會賣）。',
        `**強化**：在強化屋或「選單 → 強化」，每級屬性 +8%，最高 +${ENHANCE_MAX}。+2 之後有失敗機率，失敗只扣金幣、裝備不會壞；花 ${ENHANCE_GEM_COST} 顆鑽石可以保證成功。`,
        '裝備共 8 階，越後面的副本掉落越高階（阿卡迪亞 → 波賽頓 → 赫菲斯托斯 → 奧林帕斯 → 泰坦 → 卡俄斯 → 堤豐 → 神格）：第一～三層是 1~3 階，第四～六層 4 階、第七～九層 5 階、第十～十二層 6 階、第十三～十七層 7 階、第十八～二十二層 8 階。',
        '**★神話裝**：每個職業、每個欄位各有 20 件以神話人物命名的專屬裝備，只會從怪物身上掉落（首領機率更高）。比同階標準裝略強，並偏重某種能力，例如爆擊、穿透、防禦、生命或移速。',
        `**套裝效果**：同一個編號的★神話裝 6 個欄位是同一套（例如法師的「烏拉諾斯」系列），同時穿著 2 件觸發這套的專長加成（例如爆擊率 +4%、穿透 +5%），4 件 ${SET_4.text}，6 件再 ${SET_6.text}。點★神話裝可以看它屬於哪一套、穿了幾件；「選單 → 裝備」上方顯示目前生效的套裝。`,
        '爆擊率、爆擊傷害只會吃到一部分稀有度與強化加成（攻擊、防禦、生命則全部吃到），所以後期主要靠攻擊力與穿透變強。',
      ],
    },
    {
      icon: '🛒',
      title: '商城、金幣與鑽石',
      lines: [
        `藥水一瓶 ${POTION_PRICE.hp} 金幣，一次買 10 瓶打九折。`,
        '商城也賣標準裝，擊敗副本首領後會開放更高階的裝備。',
        '**道具**：神饌、神酒、葡萄酒（立即回復）、爐火麵包（持續回復）、戰血（攻擊）、橄欖油（減傷）、疾行藥（移速）、赫密士之羽（回城）、謬思蜂蜜（經驗）、堤喀金幣（金幣），以及高階的赫柏青春之杯（全滿）、尼姬勝利花環（攻擊 +30%）、埃癸斯神盾碎片（護盾）、凱洛斯時機之沙（冷卻轉好）、宙斯雷霆碎片（範圍雷擊），終盤還有蓋亞大地之泉、泰坦之戰號角、塔拉薩深海珍珠、百臂巨人巨石、法涅斯宇宙卵。在「選單 → 裝備」下方切到「道具」使用；商城有賣，怪物偶爾掉落，首領必掉。每種最多 99 個，不佔裝備背包。',
        '**職業專屬道具**：每個職業另有 20 種，例如法師的「謬思靈感卷軸」（技能冷卻立即轉好）、弓手的「九頭蛇毒箭油」（範圍傷害＋緩速）、騎士的「埃阿斯塔盾護符」（護盾）、狂戰士的「色雷斯烈酒」（怒氣補滿）、召喚師的「卡戎銀幣」（立即召喚亡靈）、劍俠的「珀耳修斯金鐮碎片」（爆擊傷害）、訓獸師的「牧神潘之笛」（立即野性咆哮）。常用的可以放進左下快捷欄 ③④。',
        '金幣：打怪、賣裝備、每日任務。鑽石：首領、成就、每日任務、簽到、新手指引，可以用來保證強化成功。',
        `**鑽石商店**（商城最上面）：${GEM_SHOP.map((g) => `${g.icon}${g.name} ${g.price}💎`).join('、')}。「套裝補完」會補你身上那套★神話裝缺少的部位，是湊滿 6 件最快的方法。`,
        '走進雅典城商店門口的金色光圈會打開商城，也可以直接從選單開。',
      ],
    },
    {
      icon: '🗺',
      title: '地圖與副本',
      lines: [
        '**雅典城**：安全區，有商店街、強化屋，中央廣場的傳送石可以前往副本。',
        ...FIELD_ORDER.filter((id) => id !== 'town').map((id) => zoneLine(id)),
        ...DUNGEON_ORDER.map((id) => zoneLine(id)),
        '副本要依序解鎖：擊敗上一層的首領才能進下一層。',
        ...SIDE_ORDER.map((id) => `**支線・${ZONES[id].name}**：擊敗${zoneLabel(ZONES[id].side!.unlockAfter)}後開放，守護者是${bossOf(id)?.name ?? '？'}。`),
        `**⚔ 神獸討伐**（地圖頁）：${BEAST_ORDER.length} 座只有一隻魔王的競技場，隨主線開放；每次打倒都掉首領裝備，第一次打倒另外送 ${beastFirstGems(1)}～${beastFirstGems(BEAST_ORDER.length)}💎。`,
        ...BEAST_ORDER.map((id) => `**神獸討伐・${ZONES[id].name}**：擊敗${zoneLabel(ZONES[id].beast!.unlockAfter)}後開放，魔王是${bossOf(id)?.name ?? '？'}（Lv.${bossOf(id)?.level ?? '?'}）。`),
      ],
    },
    {
      icon: '🪽',
      title: '守護者夥伴與屬性',
      lines: [
        `主線推進後會開放「支線」地圖（地圖頁的金框卡片），每張住著一隻守護者——古希臘的魔獸或戰神，一共 10 隻（目前開放 ${COMPANION_LIST.length} 隻）。`,
        `打倒守護者有 ${Math.round(CAPTURE.chance * 100)}% 機率收服成夥伴；運氣不好也沒關係，第 ${CAPTURE.pity} 次一定成功。`,
        `在「選單 → 裝備」下方切到「夥伴」帶上一隻；戰鬥中按右下的「夥伴」按鈕（電腦 G）召喚：存在 ${CAPTURE.duration} 秒、冷卻 ${CAPTURE.cooldown} 秒，AUTO 會在首領戰自動召喚。夥伴的數值跟著你的等級與裝備成長。`,
        `**屬性**：每隻守護者和每個首領都有屬性（首領血條上顯示）。夥伴打首領、首領打夥伴都算相剋：剋制 ×${ELEMENT_STRONG_MUL}、被剋 ×${ELEMENT_WEAK_MUL}。`,
        '火 → 冰 → 風 → 土 → 雷 → 水 → 火（箭頭方向＝剋）；光 ⇄ 暗、金 ⇄ 毒 互剋。挑剋制首領的夥伴，牠會更有用、也更耐打。',
        `**夥伴養成**：帶著的夥伴從你打倒的敵人拿經驗（夥伴在場上 ×${GROWTH.liveMul}），也可以在夥伴卡片花金幣餵食（+${FEED.exp} 經驗、+${FEED.bond} 好感）；再次打倒已收服的守護者，那隻夥伴 +${GROWTH.repeatExp} 經驗。每級屬性 +${GROWTH.perLv * 100}%，最高 Lv.${GROWTH.maxLv}。`,
        `**雙夥伴**：收服 ${DUO.unlockOwned} 隻後，可以多帶一隻「支援」，按一次夥伴鍵兩隻一起出場（冷卻跟著主力）。支援夥伴屬性 ×${DUO.supportMul}，經驗、好感、專屬技能都照算——挑不同屬性搭配，打首領更容易剋到。`,
        `**好感度**：召喚、在場時打倒首領、餵食都會增加。${BOND_PERKS.map((t, i) => `${'♥'.repeat(i + 1)} ${t}`).join('；')}。`,
        ...COMPANION_LIST.map((c) => `${c.icon} **${c.name}**（${ELEMENTS[c.element].icon}${ELEMENTS[c.element].name}）：${c.role}專屬技能「${COMPANION_SKILLS[c.id].name}」：${COMPANION_SKILLS[c.id].desc}。`),
      ],
    },
    {
      icon: '🗼',
      title: '無盡試煉塔',
      lines: [
        `擊敗第三層首領後開放，從「選單 → 地圖」最上面的卡片進入。`,
        `每層打倒全部敵人就上樓（回復 ${TOWER.healOnClear * 100}% 生命），每 5 層有首領；第 N 層的敵人約 Lv.4＋2N，到 Lv.110 之後每層再變強 ${Math.round((TOWER.overflow - 1) * 100)}%。`,
        `一般層 ${TOWER.timeBase}＋每隻敵人 ${TOWER.timePerMob} 秒、首領層 ${TOWER.timeBoss} 秒；時間到或倒下就結算。塔裡倒下**不會掉金幣**，打怪的經驗、金幣、掉落照拿（掉落階級跟著層數）。`,
        `塔裡的首領**不會自動調整強度**——越往上越難，看你能撐到第幾層。一般層的敵人分兩波出場，第二波從場地兩側進來。`,
        `**層數詞綴**（第 6 層起；20 層起每層 1 個、40 層起每層 2 個）：${Object.values(TOWER_AFFIXES).map((a) => `${a.icon}${a.name}（${a.desc}）`).join('、')}。不利的詞綴層通過時有額外金幣。同一週同一層的怪和詞綴大家都一樣，排行比的是同一座塔。`,
        `每 ${TOWER.checkpoint} 層是檢查點，下次可以從最高紀錄以下最近的檢查點開始。本週第一次打過首領層有鑽石（第 5 層 ${bossGems(5)}💎，越高越多），每週一 00:00 重置本週紀錄。`,
        '登入雲端存檔的話，每次結算會自動更新「排行 → 🗼 試煉塔」的本週排行；試煉塔開放後，每日任務也可能出現「在試煉塔打過 5 層」。',
      ],
    },
    {
      icon: '✨',
      title: '破關後：結局、神格、神話難度、每週首領、轉生',
      lines: [
        `打倒最終首領**${ZONES[DUNGEON_ORDER[DUNGEON_ORDER.length - 1]].name}**的首領之後會播結局與製作名單，之後可以在「選單 → 收藏」重看。`,
        `等級到 Lv.${MAX_LEVEL} 之後，打怪的經驗會累積成**神格等級**（左上經驗條變成紫色的「神格」）。每升一級得到 1 點神格點數和 ${DIVINITY.gems}💎，第 1 級要 ${DIVINITY.base.toLocaleString()} 經驗，之後每級多 ${DIVINITY.growth * 100}%。`,
        `到「選單 → 裝備」的「✨ 神格等級」卡分配點數：${DIV_STATS.map((d) => `${d.icon}${d.name} 每點 ${divBonusText(d.id, 1)}（上限 ${d.cap} 點）`).join('、')}。投錯了可以花 ${DIVINITY.resetCost}💎 全部退回重配。爆擊率、爆擊傷害仍然有上限（${Math.round(CRIT_RATE_MAX * 100)}%、×${CRIT_DMG_MAX}）。`,
        `**神話難度**：打倒最終首領後，在「選單 → 地圖」切到 🔥 神話。第 N 層的敵人變成 Lv.${MYTHIC.levelBase}＋N（屬性換算到同等級，越高層每 2 級再強 ${Math.round((TOWER.overflow - 1) * 100)}%），首領**不會自動調整強度**。掉落一律第 ${MAX_TIER} 階、首領多掉 ${MYTHIC.bossExtraDrops} 件，經驗金幣也跟著變多。要依序挑戰，第一次打倒神話第 N 層首領 +(10＋2N)💎；神話的破關評價另外記錄。`,
        `**每週首領挑戰**：打倒最終首領後在「選單 → 地圖」。每週一換一隻主線首領＋${WEEKLY.affixes} 個強化詞綴（大家都一樣），在試煉塔競技場單挑、限時 ${Math.round(WEEKLY.time / 60)} 分鐘，不會自動調整強度。${WEEKLY_DIFFS.map((d) => `${d.icon}${d.name} Lv.${MYTHIC.levelBase + d.floor}：本週第一次打倒 ${d.gems}💎＋★神話裝 ${d.gear} 件`).join('；')}。挑戰中倒下不掉金幣，可以一直重打刷最快時間。`,
        `**轉生**：Lv.${MAX_LEVEL} 而且打倒過最終首領後，可以在「選單 → 裝備」的 ♻ 轉生卡回到 Lv.1 重新冒險（可以換職業，最多 ${REBIRTH.maxCount} 次）。每轉生一次：攻擊 / 生命 / 防禦永久 +${REBIRTH.bonusPerRebirth * 100}%、打怪經驗 +${REBIRTH.expPerRebirth * 100}%、送 ${REBIRTH.gems}💎。裝備、金幣、鑽石、道具、夥伴、圖鑑、成就、神格都保留；等級、主線進度、神話紀錄重來。轉生過的角色要練回等級才能穿高階裝備。`,
      ],
    },
    {
      icon: '📋',
      title: '每日任務',
      lines: [
        '每天 00:00（你的時區）會有 3 個新任務，內容依你的等級決定。',
        '完成後到「選單 → 任務」領獎，三個都領完還有一個獎勵寶箱。',
        '右上「選單」按鈕出現紅點代表有獎勵可以領。',
        `**每日簽到**：每天第一次進遊戲可以簽到一次，${LOGIN_DAYS} 天一輪，漏掉的天數不會重來，第 ${LOGIN_DAYS} 天必得**★神話裝**。進遊戲沒簽到的話，也可以在「選單 → 任務」最上面簽。`,
        `**離線收益**：離開 ${OFFLINE.minMinutes} 分鐘以上，回來時會拿到經驗與金幣（最多算 ${OFFLINE.capHours} 小時；滿級時是神格經驗，轉生的經驗加成也算），每打倒 ${OFFLINE.dropEvery} 隻撿到一件裝備（最多 ${OFFLINE.dropMax} 件），每 ${OFFLINE.potionHours} 小時紅藍藥水各 1 瓶，帶著的夥伴也有經驗。可以花 ${OFFLINE.doubleCost} 顆鑽石領 2 倍。`,
        `**沒網路也能玩**：用遊戲網址開啟一次後，整個遊戲會下載到這台裝置（「設定 → 📦 離線遊玩」看進度），之後沒網路也能開啟遊玩，建議加到手機主畫面。離線時畫面右上角顯示「📴 離線」，進度存在本機，連上網路後自動同步雲端存檔與排行。`,
      ],
    },
    {
      icon: '📖',
      title: '成就與怪物圖鑑',
      lines: [
        `「選單 → 收藏」有 ${ACHIEVEMENTS.length} 個**成就**，達成後領取鑽石；進度從你的冒險紀錄自動計算。`,
        `**怪物圖鑑**收錄 ${CODEX_ENTRIES.length} 種敵人：小怪打倒 ${CODEX_TIERS.mob.join(' / ')} 隻、首領（含菁英、守護者）打倒 ${CODEX_TIERS.boss.join(' / ')} 次各得一顆星。`,
        `星星會變成**永久加成**，全部收集滿是攻擊 +${CODEX_BONUS_MAX.atk * 100}%、生命 +${CODEX_BONUS_MAX.maxHp * 100}%、防禦 +${CODEX_BONUS_MAX.def * 100}%（照比例給，每顆星都有用）。`,
        '想刷圖鑑：低等地圖的小怪也算，挑打得快的地方開 AUTO 就好。',
      ],
    },
    {
      icon: '💾',
      title: '存檔',
      lines: [
        '遊戲會自動存檔（換地圖、暫停、切到其他 App 時）。',
        '讀檔時如果人在野外或副本，會先停在「準備出發」畫面：看看血量和附近有幾隻怪，先補血、換裝或回城，按「開始冒險」後有 3 秒無敵。',
        '「選單 → 存檔」有 10 個欄位，可以複製、切換、刪除，或在空欄位開新角色。',
        '登入雲端存檔後可以在不同裝置繼續玩，也能參加排行榜（「選單 → 設定」）。',
      ],
    },
    {
      icon: '💡',
      title: '小技巧',
      lines: [
        '打首領前先買好藥水（紅藥水會自動喝），再把神饌之類的強力回復道具放進快捷欄 ③④ 備用。',
        '切到別的 App 或分頁時遊戲會自動暫停，回來時不會被怪打。',
        '打不贏就回頭：升幾級、強化武器，再來挑戰會輕鬆很多。',
        '城裡的小動物：靠近鴿子會飛走，狗狗偶爾會跑來找你玩。',
      ],
    },
  ];
}
