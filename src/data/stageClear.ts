import type { HeroClass } from './classes';
import type { ZoneId } from './types';

/**
 * 破關畫面的文字資料
 * ------------------------------------------------------------
 * - STAGE_EPILOGUE：每個有首領的關卡一筆（結局標題、神話尾聲、徽記），破關畫面的背景色取自關卡的天空 / 地面色。
 * - CLASS_CLEAR：每個職業的稱號與主題色。
 * - CLEAR_QUOTES：職業 × 關卡，各自一句勝利台詞（5 職業 × 13 關 = 65 句）。
 * 新增關卡時三個都要補；src/data/stageClear.test.ts 會檢查有沒有漏。
 */
export interface StageEpilogue {
  /** 結局標題（例如「九頭蛇的終焉」） */
  title: string;
  /** 神話尾聲（一句話） */
  myth: string;
  /** 首領徽記（emoji） */
  emblem: string;
}

export const STAGE_EPILOGUE: Partial<Record<ZoneId, StageEpilogue>> = {
  dungeon_1: { title: '巨蟹歸於星辰', emblem: '🦀', myth: '赫拉把這隻忠心的巨蟹放上夜空，成了巨蟹座。' },
  dungeon_2: { title: '青銅巨人倒下', emblem: '🗿', myth: '腳踝的銅釘一拔，神血流盡，守護克里特的巨人轟然倒下。' },
  dungeon_3: { title: '熔爐歸於平靜', emblem: '🌋', myth: '堤豐被壓回埃特納火山之下，從此只剩偶爾的地鳴。' },
  mistwood: { title: '龍牙之軍潰散', emblem: '💀', myth: '卡德摩斯播下的龍牙戰士失去了將軍，聖林的橡樹又能說出神諭。' },
  dungeon_4: { title: '九頭蛇的終焉', emblem: '🐍', myth: '海克力斯與伊俄拉俄斯以火燒灼斷頸，九頭蛇再也長不出新的頭。' },
  dungeon_5: { title: '走出迷宮', emblem: '🐂', myth: '忒修斯循著阿里阿德涅的線團，走出了代達洛斯的迷宮。' },
  dungeon_6: { title: '冥犬伏首', emblem: '🐕', myth: '海克力斯徒手制伏三頭犬，把牠帶到人間，又送回冥府的大門。' },
  dungeon_7: { title: '金獅之皮', emblem: '🦁', myth: '刀槍不入的金獅倒下，牠的皮成了英雄的披風，也成了夜空的獅子座。' },
  dungeon_8: { title: '石化之眼閉上', emblem: '👁️', myth: '佩爾修斯看著盾上的倒影斬下蛇髮女妖，飛馬珀伽索斯從她的血中誕生。' },
  dungeon_9: { title: '逃出巨人洞窟', emblem: '🐏', myth: '「我的名字叫『沒有人』。」奧德修斯藏在公羊肚下，逃出了洞穴。' },
  dungeon_10: { title: '謎底揭曉', emblem: '🏺', myth: '「答案是人。」謎題被解開，斯芬克斯從高岩墜落，底比斯重獲自由。' },
  dungeon_11: { title: '黃昏的金蘋果', emblem: '🍎', myth: '巨龍拉冬沉睡了，赫拉把牠升上夜空，化為天龍座。' },
  dungeon_12: { title: '冥府之門前的勝利', emblem: '🔥', myth: '柏勒洛豐騎著珀伽索斯擊敗了奇美拉——如今你在冥府門前，做到了同樣的事。' },
};

export interface ClassClear {
  /** 破關畫面上的稱號 */
  title: string;
  /** 主題色（光芒、徽章外圈） */
  color: string;
  glow: string;
}

export const CLASS_CLEAR: Record<HeroClass, ClassClear> = {
  mage: { title: '奧林帕斯的大法師', color: '#a78bff', glow: '#6a4aff' },
  archer: { title: '阿蒂蜜絲的神射手', color: '#7ee07a', glow: '#2f9a4a' },
  knight: { title: '雅典的守護騎士', color: '#b8d4f4', glow: '#4a78b8' },
  berserker: { title: '阿瑞斯的狂戰士', color: '#ff9a6a', glow: '#c83a1a' },
  summoner: { title: '冥府的召喚師', color: '#d09aff', glow: '#7a2ab8' },
  swordsman: { title: '浪跡赫拉斯的劍俠', color: '#7fe0ff', glow: '#2a8ab8' },
};

type Quotes = Partial<Record<ZoneId, string>>;

export const CLEAR_QUOTES: Record<HeroClass, Quotes> = {
  mage: {
    dungeon_1: '魔法比巨鉗更快——卡基諾斯，去星空當你的巨蟹座吧。',
    dungeon_2: '再堅固的青銅，也擋不住融化一切的烈焰。',
    dungeon_3: '在火神的熔爐裡比火？我的火球可不會輸。',
    mistwood: '龍牙長出來的戰士，一樣怕冰霜凍住骨頭。',
    dungeon_4: '九顆頭又如何？一記烈焰爆發，全部燒乾淨。',
    dungeon_5: '迷宮再複雜，也困不住會讀星象的人。',
    dungeon_6: '三顆頭，就吃三倍的火球——很公平。',
    dungeon_7: '刀槍不入？可惜我用的是魔法。',
    dungeon_8: '我沒看你的眼睛，只看你的弱點。',
    dungeon_9: '只有一隻眼睛，看不清法陣從哪裡亮起。',
    dungeon_10: '謎語的答案很簡單——是會魔法的人。',
    dungeon_11: '金蘋果歸我了，雅典娜應該會稱讚我的智慧。',
    dungeon_12: '冥府之門前的烈焰，終究由我來熄滅。',
  },
  archer: {
    dungeon_1: '一箭命中蟹殼的縫隙，連赫拉都要鼓掌。',
    dungeon_2: '腳踝那根銅釘——我從一百步外就看見了。',
    dungeon_3: '熔岩跳得再高，也快不過我的箭。',
    mistwood: '骨頭兵排成陣？正好一箭貫穿一整排。',
    dungeon_4: '每一顆頭，我都替它準備了一支箭。',
    dungeon_5: '在迷宮裡迷路的是牠，不是一直看著風向的我。',
    dungeon_6: '三顆頭同時張嘴，就是三個最好的靶心。',
    dungeon_7: '箭射不穿獅皮，就射進牠張開的嘴。',
    dungeon_8: '不必看你也能命中，這是阿蒂蜜絲教我的。',
    dungeon_9: '我瞄準的，是你那唯一的一隻眼睛。',
    dungeon_10: '答案寫在風裡，我的箭比謎底先到。',
    dungeon_11: '摘下金蘋果，比射中金蘋果還容易。',
    dungeon_12: '就算在冥府的黑暗裡，我的箭也不會偏。',
  },
  knight: {
    dungeon_1: '盾牌擋住巨鉗，長劍終結巨蟹。為了雅典！',
    dungeon_2: '青銅對青銅，最後站著的是守護者。',
    dungeon_3: '熔爐的熱度，比不上溫泉關的戰意。',
    mistwood: '將軍倒下了，龍牙兵就只是一堆骨頭。',
    dungeon_4: '斬一頭長兩頭？那就連脖子一起斬下。',
    dungeon_5: '和忒修斯一樣，我在迷宮裡從不回頭。',
    dungeon_6: '冥府的看門犬，也得向雅典的盾低頭。',
    dungeon_7: '劍砍不穿就用盾壓制，騎士從不缺辦法。',
    dungeon_8: '擦亮的盾牌，就是梅杜莎最怕的鏡子。',
    dungeon_9: '巨棒再重，也打不碎守護的誓言。',
    dungeon_10: '解謎不是我的專長，站到最後才是。',
    dungeon_11: '守護聖園的巨龍，敗給了守護人們的騎士。',
    dungeon_12: '冥府之門已經封上，人間由我守護。',
  },
  berserker: {
    dungeon_1: '巨鉗？我的斧頭比較大。',
    dungeon_2: '青銅巨人？剛好拿來試試斧頭有多利。',
    dungeon_3: '火山在冒煙？那是我的戰意在沸騰！',
    mistwood: '將軍？戰場上只有活下來的才算數。',
    dungeon_4: '九顆頭不夠砍！還有沒有？',
    dungeon_5: '牛頭人跟我比力氣？你選錯對手了。',
    dungeon_6: '三頭犬叫得再兇，也蓋不過我的戰吼。',
    dungeon_7: '獅子很強，但我更狂。',
    dungeon_8: '石化？我的怒火連石頭都能燒紅。',
    dungeon_9: '你的棒子很大，我的斧頭很快。',
    dungeon_10: '謎語？我的回答只有一個字——「砍」！',
    dungeon_11: '金蘋果的味道，就是勝利的味道！',
    dungeon_12: '連冥府都在震動——這才叫戰鬥！',
  },
  summoner: {
    dungeon_1: '亡靈們，把這隻螃蟹拖回海底吧。',
    dungeon_2: '青銅的身體裡沒有靈魂，所以你贏不了我。',
    dungeon_3: '火山之下，也有亡者聽從我的呼喚。',
    mistwood: '龍牙兵本來就是骷髏——現在歸我指揮了。',
    dungeon_4: '九顆頭的魂魄，正好補滿我的軍團。',
    dungeon_5: '迷宮裡迷路的祭品亡魂，終於可以安息了。',
    dungeon_6: '三頭犬，冥府的主人換人當了。',
    dungeon_7: '獅子的魂魄很驕傲，但亡者不會害怕。',
    dungeon_8: '早已死去的人，又怎麼會被石化呢？',
    dungeon_9: '洞窟裡的白骨，都站到我這邊了。',
    dungeon_10: '謎底是「人」——而亡者，早已超越了人。',
    dungeon_11: '連守護的巨龍，也會在黃昏時沉睡。',
    dungeon_12: '黑帝斯的國度，今天起聽我號令。',
  },
  swordsman: {
    dungeon_1: '一劍破甲——蟹殼再硬，也有縫隙。',
    dungeon_2: '青銅巨人再高，也只是一座會走路的雕像。',
    dungeon_3: '劍要在火裡淬過，才會更利。',
    mistwood: '龍牙兵千千萬萬，我只需要一劍。',
    dungeon_4: '九顆頭，九道劍光，一個不留。',
    dungeon_5: '迷宮千迴百轉，我的劍只走直線。',
    dungeon_6: '冥府的看門犬，也攔不住浪跡天涯的人。',
    dungeon_7: '刀槍不入？那是你還沒見過真正的劍意。',
    dungeon_8: '閉著眼也能出劍——心中有劍，何須用眼。',
    dungeon_9: '洞窟太小，容不下我的劍氣。',
    dungeon_10: '謎底是人——而人，可以練成一把劍。',
    dungeon_11: '金蘋果我收下了，巨龍就留在黃昏裡吧。',
    dungeon_12: '萬劍歸宗，冥府之門也得為我讓路。',
  },
};
