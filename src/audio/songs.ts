/**
 * 背景音樂曲譜（純資料）
 * ------------------------------------------------------------
 * 寫法：
 * - chords：每小節一個和弦，用 `|` 分小節；同小節兩個和弦用空白隔開（各半小節）。
 *   支援 C、Cm、C7、Cm7、Cmaj7、Cdim、Caug、Csus4、Csus2、C5（可加 # / b）。
 * - melody：每小節用空白分成 4 / 8 / 16 格（四分 / 八分 / 十六分音符）；
 *   音名如 `E5`、`F#4`、`Bb4`，`-` 延長前一個音，`.` 休止。
 * - bass.pattern：16 格，R 根音、5 五度、O 高八度、3 三度、7 小七度、4 四度、p 降二度、m 低半音、`.` 休止。
 * - 鼓組每個聲部 16 格：x 一般、X 重音、`.` 無。
 *   k 大鼓、s 小鼓、r 邊擊、h 閉合鈸、o 開放鈸、sh 沙鈴、t 太鼓、T 高音鼓、c 銅鈸。
 * - phase2：魔王二階段（首領血量低於一半）才加入的聲部。
 * 新增曲子：在 SONGS 加一筆，然後在關卡（data/stages/）的 zone 設定 `music: '曲子 id'`，首領戰曲用 `bossMusic`（要有 bossFight: true）。
 */
/** 樂器：lyre 里拉琴、choir 合唱、aulos 阿夫洛斯管（古希臘雙簧管）是 v1.44 新增 */
export type Inst = 'flute' | 'chip' | 'pluck' | 'lyre' | 'bell' | 'pad' | 'choir' | 'aulos' | 'strings' | 'tremolo' | 'brass' | 'bass' | 'bassSaw';

export interface DrumPat {
  k?: string;
  s?: string;
  r?: string;
  h?: string;
  o?: string;
  sh?: string;
  t?: string;
  T?: string;
  c?: string;
}

export interface Section {
  chords: string;
  melody: string;
  drums?: DrumPat;
  /** 段落第一小節額外加的鼓（例如銅鈸） */
  first?: DrumPat;
  /** 段落最後一小節改用的鼓（過門） */
  fill?: DrumPat;
}

export interface TrackDef {
  id: string;
  /** 顯示名稱（設定頁「正在播放」） */
  name: string;
  bpm: number;
  /** 整體音量倍率（各曲聽感平衡用） */
  level?: number;
  /** false = 播完就停（勝利短曲） */
  loop?: boolean;
  lead: { inst: Inst; vol: number; double?: Inst };
  pad?: { inst: Inst; vol: number; octave: number };
  /** 第二層墊音（例如弦樂上再疊合唱） */
  pad2?: { inst: Inst; vol: number; octave: number };
  /** 殘響量倍率（預設 1；洞窟 / 冥府可以大一點） */
  reverb?: number;
  /** 回音量倍率（預設 1） */
  echo?: number;
  /** 反拍延後比例（0~0.4 格，輕快的曲子用） */
  swing?: number;
  /** 魔王戰曲：換曲時快速切入 */
  bossFight?: boolean;
  bass: { inst: Inst; vol: number; pattern: string; octave?: number };
  arps?: { inst: Inst; vol: number; pattern: number[]; grid: 1 | 2 | 4; octave: number; gate?: number; phase2?: boolean }[];
  stabs?: { inst: Inst; vol: number; pattern: string; octave: number; phase2?: boolean }[];
  drums: DrumPat;
  drumVol?: number;
  phase2Drums?: DrumPat;
  phase2LeadUp?: boolean;
  sections: Record<string, Section>;
  order: string[];
}

/* ======================= 主城：雅典的午後 ======================= */
const town: TrackDef = {
  id: 'town',
  name: '雅典的午後',
  bpm: 96,
  level: 1.25,
  lead: { inst: 'flute', vol: 0.2 },
  pad: { inst: 'pad', vol: 0.05, octave: 3 },
  bass: { inst: 'bass', vol: 0.26, pattern: 'R.......5.....R.' },
  arps: [{ inst: 'lyre', vol: 0.075, pattern: [0, 1, 2, 1], grid: 2, octave: 4 }],
  drums: { k: 'x.......x.......', sh: '..x...x...x...x.', r: '........x.......' },
  drumVol: 0.7,
  swing: 0.18,
  sections: {
    A: {
      chords: 'C | Am | F | G | C | Am | Dm G | C',
      melody: [
        'E5 - D5 C5 E5 - G5 -',
        'A5 - G5 E5 C5 - - .',
        'F5 - E5 D5 C5 - A4 -',
        'B4 - C5 D5 G4 - - .',
        'E5 - D5 C5 E5 - G5 -',
        'A5 - C6 - B5 A5 G5 -',
        'F5 - A5 - G5 F5 D5 B4',
        'C5 - - - - - . .',
      ].join(' | '),
    },
    B: {
      chords: 'F | G | Em | Am | Dm | Em | F | G',
      melody: [
        'A4 - C5 - F5 - E5 -',
        'D5 - B4 - G4 - . .',
        'G4 - B4 - E5 - D5 -',
        'C5 - E5 - A5 - - .',
        'F5 - E5 - D5 - A4 -',
        'G5 - F5 - E5 - B4 -',
        'C5 - D5 - E5 - F5 -',
        'G5 - - - D5 - B4 -',
      ].join(' | '),
      fill: { k: 'x.......x.......', sh: '..x...x...x.x.x.', r: '........x...x.x.' },
    },
  },
  order: ['A', 'B', 'A', 'B'],
};

/* ======================= 阿卡迪亞草原：阿卡迪亞小冒險 ======================= */
const grassland: TrackDef = {
  id: 'grassland',
  name: '阿卡迪亞小冒險',
  bpm: 128,
  lead: { inst: 'chip', vol: 0.19 },
  pad: { inst: 'pad', vol: 0.04, octave: 3 },
  bass: { inst: 'bass', vol: 0.28, pattern: 'R..RO.5.R..RO.5.' },
  arps: [{ inst: 'pluck', vol: 0.06, pattern: [0, 2, 1, 2], grid: 2, octave: 4 }],
  drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  drumVol: 0.75,
  sections: {
    A: {
      chords: 'G | D | Em | C | G | D | C D | G',
      melody: [
        'D5 - G5 - B5 - A5 G5',
        'F#5 - A5 - D5 - - .',
        'E5 - G5 - B5 - A5 G5',
        'E5 - - C5 E5 - G5 -',
        'D5 - G5 - B5 - D6 -',
        'C6 - B5 A5 F#5 - D5 -',
        'E5 - G5 - F#5 - A5 -',
        'G5 - - - D5 B4 G4 .',
      ].join(' | '),
      first: { c: 'x...............' },
    },
    B: {
      chords: 'C | D | Bm | Em | Am | D | C D | G',
      melody: [
        'E5 E5 . E5 G5 - E5 -',
        'F#5 F#5 . F#5 A5 - F#5 -',
        'D5 - F#5 - B5 - A5 -',
        'G5 - - E5 B4 - - .',
        'C5 - E5 - A5 - G5 -',
        'F#5 - E5 - D5 - C5 -',
        'B4 - C5 - D5 - F#5 -',
        'G5 - B5 - G5 - . .',
      ].join(' | '),
      fill: { k: 'x.....x.........', s: '....x...x.x.xxxx', h: 'x.x.x.x.........' },
    },
  },
  order: ['A', 'B'],
};

/* ======================= 多多納聖林：聖林小徑 ======================= */
const forest: TrackDef = {
  id: 'forest',
  name: '聖林小徑',
  bpm: 112,
  level: 1.2,
  lead: { inst: 'flute', vol: 0.19 },
  pad: { inst: 'pad', vol: 0.05, octave: 3 },
  pad2: { inst: 'choir', vol: 0.022, octave: 4 },
  reverb: 1.3,
  bass: { inst: 'bass', vol: 0.26, pattern: 'R.......5.....R.' },
  arps: [{ inst: 'bell', vol: 0.035, pattern: [0, 1, 2, 3, 2, 1], grid: 1, octave: 5, gate: 1 }],
  drums: { k: 'x.......x.......', sh: 'x.x.x.x.x.x.x.x.', r: '....x.......x...' },
  drumVol: 0.6,
  sections: {
    A: {
      chords: 'Dm | G | Dm | C | Dm | G | F G | Am',
      melody: [
        'A4 - D5 - E5 - F5 -',
        'G5 - - F5 E5 - D5 -',
        'F5 - E5 D5 A4 - - .',
        'G4 - C5 - E5 - D5 -',
        'A4 - D5 - E5 - F5 -',
        'B5 - A5 G5 F5 - E5 -',
        'A5 - F5 - G5 - B5 -',
        'A5 - - - E5 - . .',
      ].join(' | '),
    },
    B: {
      chords: 'F | C | G | Dm | F | C | Bb | C',
      melody: [
        'C6 - A5 - F5 - A5 -',
        'G5 - E5 - C5 - E5 -',
        'D5 - G5 - B5 - A5 G5',
        'A5 - - - F5 - D5 -',
        'C5 - F5 - A5 - C6 -',
        'E6 - D6 C6 G5 - E5 -',
        'F5 - D5 - Bb4 - D5 -',
        'E5 - G5 - C6 - . .',
      ].join(' | '),
      fill: { k: 'x.......x.......', sh: 'x.x.x.x.x.x.x.x.', r: '....x.......x.xx' },
    },
  },
  order: ['A', 'B'],
};

/* ======================= 副本：神殿探險 ======================= */
const dungeon: TrackDef = {
  id: 'dungeon',
  name: '神殿探險',
  bpm: 120,
  lead: { inst: 'chip', vol: 0.18 },
  pad: { inst: 'pad', vol: 0.045, octave: 3 },
  bass: { inst: 'bass', vol: 0.3, pattern: 'R.RR5.R.R.RRO.5.' },
  arps: [{ inst: 'lyre', vol: 0.06, pattern: [0, 1, 2, 1], grid: 2, octave: 4 }],
  reverb: 1.25,
  drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
  drumVol: 0.75,
  sections: {
    A: {
      chords: 'Am | F | C | G | Am | F | G | E',
      melody: [
        'E5 - A5 - B5 - C6 -',
        'A5 - - F5 C5 - F5 -',
        'G5 - E5 - C5 - E5 -',
        'D5 - G5 - B4 - D5 -',
        'E5 - A5 - B5 - C6 -',
        'D6 - C6 - A5 - F5 -',
        'G5 - A5 - B5 - D6 -',
        'B5 - - - G#5 - E5 -',
      ].join(' | '),
      first: { c: 'x...............' },
    },
    B: {
      chords: 'F | G | C | Am | Dm | E | Am | E',
      melody: [
        'C5 - F5 - A5 - G5 F5',
        'D5 - G5 - B5 - A5 G5',
        'E5 - G5 - C6 - B5 A5',
        'A5 - - - E5 - C5 -',
        'F5 - A5 - D6 - C6 -',
        'B5 - G#5 - E5 - B4 -',
        'C5 - E5 - A5 - - .',
        'G#5 - B5 - E6 - - .',
      ].join(' | '),
      fill: { k: 'x.....x.........', s: '....x...x.x.xxxx', h: 'x.x.x.x.........' },
    },
  },
  order: ['A', 'B'],
};

/* ======================= 魔王戰：巨影來襲 ======================= */
const boss: TrackDef = {
  id: 'boss',
  name: '巨影來襲（魔王戰）',
  bpm: 152,
  level: 0.95,
  lead: { inst: 'brass', vol: 0.16 },
  bossFight: true,
  pad: { inst: 'strings', vol: 0.05, octave: 2 },
  pad2: { inst: 'choir', vol: 0.02, octave: 4 },
  // 16 分音符不停的低音，夾著降二度：持續的壓迫感
  bass: { inst: 'bassSaw', vol: 0.16, pattern: 'RRpRRRpRRRpRRpRp', octave: 2 },
  arps: [{ inst: 'tremolo', vol: 0.045, pattern: [0, 1, 2, 1], grid: 1, octave: 4, phase2: true }],
  stabs: [
    { inst: 'brass', vol: 0.06, pattern: 'X..........x..x.', octave: 4 },
    { inst: 'brass', vol: 0.05, pattern: '...x..x....x....', octave: 4, phase2: true },
  ],
  drums: { k: 'X..x..x.X..x..x.', s: '....x.......x...', t: 'x.......x...x.x.', h: '..x...x...x...x.' },
  drumVol: 0.85,
  phase2Drums: { h: 'xxxxxxxxxxxxxxxx', o: '..............x.' },
  sections: {
    A: {
      chords: 'Em | F | Em | F | C | B | C | B',
      melody: [
        'E5 - - - B4 - - .',
        'F5 - - - E5 - D5 -',
        'E5 - G5 - B5 - - -',
        'A5 - G5 - F5 - - .',
        'G5 - - E5 C5 - E5 -',
        'F#5 - - - D#5 - B4 -',
        'E5 - G5 - C6 - B5 A5',
        'B5 - - - - - . .',
      ].join(' | '),
      first: { c: 'x...............' },
      fill: { k: 'X..x..x.X.......', s: '........x.x.xxxx', t: 'x.x.x.x.xxxx....' },
    },
    B: {
      chords: 'Am | B | Em | C | Am | B | C | B',
      melody: [
        'C6 - B5 A5 E5 - A5 -',
        'D#6 - - - B5 - F#5 -',
        'G5 - F#5 E5 B4 - E5 -',
        'E5 - G5 - C6 - - .',
        'A5 - C6 - E6 - D6 C6',
        'B5 - A5 - F#5 - D#5 -',
        'E5 - G5 - E6 - C6 -',
        'D#6 - - - B5 - - .',
      ].join(' | '),
      first: { c: 'x...............' },
      fill: { k: 'X..x..x.X.......', s: '....x...xxxxxxxx', t: 'x...x...x.x.x.x.' },
    },
  },
  order: ['A', 'B'],
};

/* ======================= 海岸副本：波賽頓的潮聲 ======================= */
// 波賽頓海岸、賽蓮海蝕洞、墨西拿海峽、衣索比亞海岸。B 小調轉 D 大調，里拉琴琶音像海浪一波一波
const sea: TrackDef = {
  id: 'sea',
  name: '波賽頓的潮聲',
  bpm: 108,
  level: 1.15,
  lead: { inst: 'flute', vol: 0.19 },
  pad: { inst: 'pad', vol: 0.045, octave: 3 },
  pad2: { inst: 'choir', vol: 0.018, octave: 4 },
  reverb: 1.35,
  echo: 1.3,
  bass: { inst: 'bass', vol: 0.27, pattern: 'R.....5.R.....5.' },
  arps: [{ inst: 'lyre', vol: 0.065, pattern: [0, 1, 2, 3, 2, 1], grid: 2, octave: 4 }],
  drums: { k: 'x.......x.......', sh: 'x.x.x.x.x.x.x.x.', r: '........x.......', o: '..............x.' },
  drumVol: 0.6,
  sections: {
    A: {
      chords: 'Bm | G | D | A | Bm | G | Em A | D',
      melody: [
        'F#5 - D5 - B4 - D5 F#5',
        'G5 - - F#5 D5 - B4 -',
        'A5 - F#5 - D5 - E5 F#5',
        'E5 - - - C#5 - - .',
        'F#5 - B5 - D6 - B5 A5',
        'G5 - B5 - D6 - B5 G5',
        'E5 - G5 - A5 - C#6 -',
        'D6 - - - A5 - F#5 -',
      ].join(' | '),
      first: { c: 'x...............' },
    },
    B: {
      chords: 'G | A | F#m | Bm | G | A | Bm A | D',
      melody: [
        'B5 - A5 G5 D5 - G5 -',
        'C#6 - B5 A5 E5 - A5 -',
        'A5 - G5 F#5 C#5 - F#5 -',
        'D5 - - - B4 - - .',
        'D6 - B5 - G5 - B5 D6',
        'E6 - C#6 - A5 - E5 -',
        'F#5 - D6 - E6 - C#6 -',
        'D6 - - - - - . .',
      ].join(' | '),
      fill: { k: 'x.......x...x...', sh: 'x.x.x.x.x.x.xxxx', r: '........x...x.x.' },
    },
  },
  order: ['A', 'B'],
};

/* ======================= 冥府副本：冥火深淵 ======================= */
// 赫菲斯托斯熔爐、塔爾塔洛斯深淵、冥王黑帝斯的國度、萬怪之母的巢穴、俄特律斯山。D 小調弗里吉亞（降 E），阿夫洛斯管＋合唱＋太鼓
const inferno: TrackDef = {
  id: 'inferno',
  name: '冥火深淵',
  bpm: 100,
  level: 1.1,
  lead: { inst: 'aulos', vol: 0.15 },
  pad: { inst: 'strings', vol: 0.035, octave: 2 },
  pad2: { inst: 'choir', vol: 0.026, octave: 3 },
  reverb: 1.6,
  bass: { inst: 'bass', vol: 0.3, pattern: 'R..R..R.R..R.pR.' },
  arps: [{ inst: 'lyre', vol: 0.045, pattern: [0, 2, 1, 2], grid: 4, octave: 4, gate: 1 }],
  drums: { t: 'x.....x...x.....', k: 'x.......x.......', r: '....x.......x...', sh: '..x...x...x...x.' },
  drumVol: 0.72,
  sections: {
    A: {
      chords: 'Dm | Eb | Dm | C | Bb | A | Dm Eb | Dm',
      melody: [
        'D5 - - - A4 - F4 -',
        'Eb5 - D5 - Bb4 - G4 -',
        'F5 - E5 D5 A4 - - .',
        'G5 - F5 E5 C5 - - .',
        'D5 - F5 - Bb5 - A5 G5',
        'A5 - - - C#5 - E5 -',
        'D5 - F5 - Eb5 - G5 -',
        'D5 - - - - - . .',
      ].join(' | '),
      first: { c: 'x...............' },
    },
    B: {
      chords: 'Gm | Dm | Eb | A | Gm | Dm | Eb A | Dm',
      melody: [
        'G5 - Bb5 - D6 - C6 Bb5',
        'A5 - - F5 D5 - - .',
        'G5 - Bb5 - Eb6 - D6 C6',
        'C#6 - - - A5 - E5 -',
        'D6 - C6 Bb5 G5 - Bb5 -',
        'F5 - E5 D5 A4 - D5 -',
        'Eb5 - G5 - E5 - C#5 -',
        'D5 - - - A4 - D5 .',
      ].join(' | '),
      fill: { t: 'x.....x...x.x.x.', k: 'x.......x.......', r: '....x.......xxxx' },
    },
  },
  order: ['A', 'B'],
};

/* ======================= 山野副本：英雄遠征 ======================= */
// 涅墨亞山谷、底比斯荒原、卡呂冬森林、希柏里爾雪原、刻律涅山、阿爾戈斯牧場、佩利翁山。E 小調進行曲，銅管＋里拉琴＋行軍小鼓
const wild: TrackDef = {
  id: 'wild',
  name: '英雄遠征',
  bpm: 132,
  lead: { inst: 'brass', vol: 0.12, double: 'lyre' },
  pad: { inst: 'pad', vol: 0.045, octave: 3 },
  bass: { inst: 'bass', vol: 0.29, pattern: 'R..R..5.R..R..O.' },
  arps: [{ inst: 'lyre', vol: 0.05, pattern: [0, 1, 2, 1], grid: 2, octave: 4 }],
  drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', T: '..............x.' },
  drumVol: 0.72,
  sections: {
    A: {
      chords: 'Em | C | G | D | Em | C | Am B | Em',
      melody: [
        'E5 - - B4 E5 - G5 -',
        'G5 - - E5 C5 - E5 -',
        'D5 - - B4 G5 - B5 -',
        'A5 - - - F#5 - D5 -',
        'B5 - - G5 E5 - G5 -',
        'C6 - B5 A5 G5 - E5 -',
        'A5 - C6 - B5 - D#6 -',
        'E6 - - - B5 - . .',
      ].join(' | '),
      first: { c: 'x...............' },
    },
    B: {
      chords: 'C | D | Bm | Em | C | D | B | B',
      melody: [
        'E5 - G5 - C6 - B5 A5',
        'F#5 - A5 - D6 - C6 B5',
        'B5 - A5 - F#5 - D5 -',
        'E5 - - - G5 - B5 -',
        'C6 - - B5 G5 - E5 -',
        'D6 - - C6 A5 - F#5 -',
        'D#6 - - - B5 - F#5 -',
        'B5 - - - - - . .',
      ].join(' | '),
      fill: { k: 'x.......x.x.....', s: '....x...x.x.xxxx', T: '........x.x.x.x.' },
    },
  },
  order: ['A', 'B'],
};

/* ======================= 魔王戰（第十二～二十一層）：泰坦之戰 ======================= */
// C 小調，合唱＋銅管＋太鼓，比「巨影來襲」更壯闊；二階段加入弦樂顫音與 16 分音符鈸
const titan: TrackDef = {
  id: 'titan',
  name: '泰坦之戰（魔王戰）',
  bpm: 160,
  level: 0.95,
  bossFight: true,
  lead: { inst: 'brass', vol: 0.15 },
  pad: { inst: 'strings', vol: 0.045, octave: 2 },
  pad2: { inst: 'choir', vol: 0.03, octave: 4 },
  reverb: 1.15,
  bass: { inst: 'bassSaw', vol: 0.15, pattern: 'RR.RRR.RRR.RR.5.', octave: 2 },
  arps: [{ inst: 'tremolo', vol: 0.04, pattern: [0, 1, 2, 1], grid: 1, octave: 4, phase2: true }],
  stabs: [
    { inst: 'brass', vol: 0.055, pattern: 'X.....x.X.....x.', octave: 4 },
    { inst: 'brass', vol: 0.045, pattern: '...x.....x...x..', octave: 4, phase2: true },
  ],
  drums: { k: 'X..x..x.X..x..x.', s: '....x.......x...', t: 'x...x...x...x...', h: '..x...x...x...x.' },
  drumVol: 0.85,
  phase2Drums: { h: 'xxxxxxxxxxxxxxxx', T: '..........x.x.x.' },
  sections: {
    A: {
      chords: 'Cm | Ab | Bb | G | Cm | Ab | Fm G | Cm',
      melody: [
        'C5 - - - G4 - C5 Eb5',
        'Eb5 - - - C5 - Ab4 -',
        'D5 - - - F5 - Bb5 -',
        'B4 - - - D5 - G5 -',
        'G5 - - Eb5 C6 - - .',
        'C6 - Bb5 Ab5 Eb5 - Ab5 -',
        'F5 - Ab5 - G5 - B5 -',
        'C6 - - - - - . .',
      ].join(' | '),
      first: { c: 'x...............' },
      fill: { k: 'X..x..x.X.......', s: '........x.x.xxxx', t: 'x.x.x.x.xxxx....' },
    },
    B: {
      chords: 'Ab | Bb | Eb | Cm | Ab | Bb | G | G',
      melody: [
        'Ab5 - - G5 Eb5 - C5 -',
        'Bb5 - - Ab5 F5 - D5 -',
        'G5 - Bb5 - Eb6 - D6 -',
        'C6 - - - G5 - Eb5 -',
        'Eb6 - D6 C6 Ab5 - C6 -',
        'F6 - Eb6 D6 Bb5 - D6 -',
        'D6 - - - B5 - G5 -',
        'G5 - - - B5 - D6 -',
      ].join(' | '),
      first: { c: 'x...............' },
      fill: { k: 'X..x..x.X.......', s: '....x...xxxxxxxx', t: 'x...x...x.x.x.x.' },
    },
  },
  order: ['A', 'B'],
};

/* ======================= 最終決戰（俄特律斯山・坎佩）：萬神黃昏 ======================= */
// D 小調，最快、最滿：弦樂＋合唱雙層墊音、銅管主旋律、太鼓與大鼓齊奏；二階段旋律升高八度
const final: TrackDef = {
  id: 'final',
  name: '萬神黃昏（最終決戰）',
  bpm: 168,
  level: 0.92,
  bossFight: true,
  lead: { inst: 'brass', vol: 0.15, double: 'strings' },
  pad: { inst: 'strings', vol: 0.05, octave: 2 },
  pad2: { inst: 'choir', vol: 0.034, octave: 4 },
  reverb: 1.2,
  bass: { inst: 'bassSaw', vol: 0.16, pattern: 'RRpRRRpRRR5RRpRO', octave: 2 },
  arps: [
    { inst: 'lyre', vol: 0.035, pattern: [0, 1, 2, 3], grid: 2, octave: 5 },
    { inst: 'tremolo', vol: 0.045, pattern: [0, 1, 2, 1], grid: 1, octave: 4, phase2: true },
  ],
  stabs: [
    { inst: 'brass', vol: 0.06, pattern: 'X.....x...x...x.', octave: 4 },
    { inst: 'brass', vol: 0.05, pattern: '...x...x.....x..', octave: 4, phase2: true },
  ],
  drums: { k: 'X.xx..x.X.xx..x.', s: '....x.......x...', t: 'x.......x.x.....', h: 'x.x.x.x.x.x.x.x.' },
  drumVol: 0.85,
  phase2Drums: { h: 'xxxxxxxxxxxxxxxx', o: '......x.......x.', T: '............xxxx' },
  phase2LeadUp: false,
  sections: {
    A: {
      chords: 'Dm | Bb | Gm | A | Dm | Bb | Gm A | Dm',
      melody: [
        'D5 - F5 - A5 - - D6',
        'D6 - C6 Bb5 F5 - - .',
        'G5 - Bb5 - D6 - C6 Bb5',
        'C#6 - - - A5 - E5 -',
        'F6 - E6 D6 A5 - D6 -',
        'D6 - - C6 Bb5 - F5 -',
        'G5 - Bb5 - A5 - C#6 -',
        'D6 - - - - - . .',
      ].join(' | '),
      first: { c: 'x...............' },
      fill: { k: 'X.xx..x.X.......', s: '........x.x.xxxx', t: 'x.x.x.x.xxxx....' },
    },
    B: {
      chords: 'F | C | Dm | A | Bb | C | A | A',
      melody: [
        'A5 - C6 - F6 - E6 D6',
        'E6 - - D6 C6 - G5 -',
        'F6 - E6 D6 A5 - D6 -',
        'E6 - - - C#6 - A5 -',
        'D6 - F6 - Bb5 - D6 -',
        'E6 - G6 - C6 - E6 -',
        'C#6 - E6 - A6 - G6 F6',
        'E6 - - - C#6 - A5 -',
      ].join(' | '),
      first: { c: 'x...............' },
      fill: { k: 'X.xx..x.X.......', s: '....x...xxxxxxxx', t: 'x...x...x.x.x.x.' },
    },
  },
  order: ['A', 'B'],
};

/* ======================= 勝利短曲 ======================= */
const victory: TrackDef = {
  id: 'victory',
  name: '勝利',
  bpm: 132,
  level: 1.1,
  loop: false,
  lead: { inst: 'chip', vol: 0.22, double: 'flute' },
  bossFight: true,
  pad: { inst: 'pad', vol: 0.07, octave: 3 },
  bass: { inst: 'bass', vol: 0.28, pattern: 'R.......R...5...' },
  arps: [{ inst: 'bell', vol: 0.05, pattern: [0, 1, 2, 3], grid: 1, octave: 5, gate: 1 }],
  drums: { k: 'x.......x...x...', s: '....x.......x...' },
  drumVol: 0.8,
  sections: {
    A: {
      chords: 'C | F G | C',
      melody: ['G4 C5 E5 G5 C6 - - G5', 'A5 - F5 A5 B5 - D6 -', 'C6 - - - - - - .'].join(' | '),
      first: { c: 'x...............' },
      fill: { k: 'x...............', c: 'x...............' },
    },
  },
  order: ['A'],
};

export const SONGS = { town, grassland, forest, dungeon, sea, inferno, wild, boss, titan, final, victory } satisfies Record<string, TrackDef>;
