import type { DrumPat, Inst, Section, TrackDef } from './songs';

/**
 * 每一隻首領專屬的戰鬥曲（v1.111）
 * ------------------------------------------------------------
 * 依「首領 id（或關卡 id）」當種子，自動作一首魔王戰曲：
 *   - 屬性決定風格：調式（弗里吉亞、和聲小調、多利亞……）、速度範圍、主奏樂器、墊音、鼓組手感
 *   - 種子決定：調性（12 個主音）、和弦進行、旋律動機（節奏型＋音型，之後每小節變化）、低音型、重音、二階段加入的聲部
 * 同一隻首領每次聽到的都一樣；不同首領不會重複（測試會檢查）。
 * 曲子格式和 songs.ts 手寫的曲子一樣，交給 Music.compile() 播放。
 */

type Style = {
  modes: number[][];
  bpm: [number, number];
  leads: Inst[];
  doubles: (Inst | undefined)[];
  pads: { inst: Inst; vol: number; octave: number }[];
  pad2?: { inst: Inst; vol: number; octave: number };
  taiko: number;
  reverb: number;
  arp: Inst;
};

const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const PHRYG_DOM = [0, 1, 4, 5, 7, 8, 10];
const HARM_MINOR = [0, 2, 3, 5, 7, 8, 11];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const DOUBLE_HARM = [0, 1, 4, 5, 7, 8, 11];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const MIXO = [0, 2, 4, 5, 7, 9, 10];

/** 屬性 → 風格（沒屬性的首領隨機挑一種） */
export const BOSS_STYLES: Record<string, Style> = {
  fire: { modes: [PHRYG_DOM, PHRYGIAN], bpm: [152, 170], leads: ['brass', 'aulos'], doubles: [undefined, 'brass'], pads: [{ inst: 'strings', vol: 0.05, octave: 2 }], taiko: 1, reverb: 0.9, arp: 'tremolo' },
  water: { modes: [DORIAN, AEOLIAN], bpm: [138, 152], leads: ['strings', 'lyre'], doubles: ['flute', undefined], pads: [{ inst: 'pad', vol: 0.05, octave: 3 }], pad2: { inst: 'choir', vol: 0.02, octave: 4 }, taiko: 0.3, reverb: 1.3, arp: 'lyre' },
  thunder: { modes: [HARM_MINOR, PHRYGIAN], bpm: [166, 182], leads: ['chip', 'brass'], doubles: ['brass', undefined], pads: [{ inst: 'strings', vol: 0.045, octave: 2 }], taiko: 0.6, reverb: 0.8, arp: 'chip' },
  wind: { modes: [AEOLIAN, DORIAN], bpm: [150, 164], leads: ['flute', 'aulos'], doubles: ['strings', undefined], pads: [{ inst: 'pad', vol: 0.05, octave: 3 }], taiko: 0.4, reverb: 1.2, arp: 'pluck' },
  light: { modes: [LYDIAN, MIXO, HARM_MINOR], bpm: [140, 156], leads: ['choir', 'brass'], doubles: ['strings', undefined], pads: [{ inst: 'strings', vol: 0.05, octave: 3 }], pad2: { inst: 'choir', vol: 0.025, octave: 4 }, taiko: 0.3, reverb: 1.4, arp: 'bell' },
  dark: { modes: [PHRYGIAN, HARM_MINOR], bpm: [132, 148], leads: ['choir', 'tremolo', 'strings'], doubles: ['brass', undefined], pads: [{ inst: 'strings', vol: 0.05, octave: 2 }], pad2: { inst: 'choir', vol: 0.03, octave: 3 }, taiko: 0.7, reverb: 1.6, arp: 'tremolo' },
  ice: { modes: [AEOLIAN, HARM_MINOR], bpm: [140, 156], leads: ['bell', 'strings'], doubles: ['flute', undefined], pads: [{ inst: 'pad', vol: 0.05, octave: 3 }], pad2: { inst: 'choir', vol: 0.02, octave: 4 }, taiko: 0.3, reverb: 1.5, arp: 'bell' },
  earth: { modes: [AEOLIAN, PHRYGIAN], bpm: [136, 150], leads: ['brass', 'aulos'], doubles: ['strings', undefined], pads: [{ inst: 'strings', vol: 0.05, octave: 2 }], taiko: 1, reverb: 1, arp: 'pluck' },
  poison: { modes: [DOUBLE_HARM, PHRYG_DOM], bpm: [144, 160], leads: ['aulos', 'chip'], doubles: [undefined, 'strings'], pads: [{ inst: 'pad', vol: 0.05, octave: 2 }], taiko: 0.6, reverb: 1.1, arp: 'pluck' },
  metal: { modes: [HARM_MINOR, AEOLIAN], bpm: [156, 172], leads: ['brass', 'strings'], doubles: ['brass', undefined], pads: [{ inst: 'strings', vol: 0.05, octave: 2 }], pad2: { inst: 'choir', vol: 0.02, octave: 4 }, taiko: 0.8, reverb: 0.9, arp: 'tremolo' },
};

const BASS_PATS = ['RRpRRRpRRRpRRpRp', 'R.RR.RR.R.RR.R5.', 'R..R..R.R..R..O.', 'RRRRRRRRRRRRRRRR', 'R.R.5.R.R.R.O.5.', 'R...R.R.R...R.Rp', 'RR.RR.RR.RR.R5O5'];
const KICKS = ['X..x..x.X..x..x.', 'X.x...x.X.x...x.', 'X...x...X...x..x', 'X..X..x.X..x.x..', 'X.xX..x.X.xX..x.'];
const SNARES = ['....x.......x...', '....x..x....x...', '....x.......x.x.', '....x...x...x...'];
const HATS = ['..x...x...x...x.', 'x.x.x.x.x.x.x.x.', '.xx..xx..xx..xx.', 'x.xxx.xxx.xxx.xx'];
const TOMS = ['x.......x...x.x.', 'x..x..x.x.......', 'x...x...x.x.x.x.', '..x...x...x..xx.'];
const STABS = ['X..........x..x.', 'X..x..x.........', 'X.......X...x.x.', 'X.....x.....x...', 'x..x..x..x..x.x.'];
const FILLS: DrumPat[] = [
  { k: 'X..x..x.X.......', s: '........x.x.xxxx', t: 'x.x.x.x.xxxx....' },
  { k: 'X..x..x.X.......', s: '....x...xxxxxxxx', t: 'x...x...x.x.x.x.' },
  { k: 'X.x.X.x.X.......', s: '........xxxxXXXX', T: '........x.x.x.x.' },
  { k: 'X...X...X.X.X.X.', s: '....x...x.xxxxxx', t: 'x.x.x.x.........' },
];
/** 8 小節和弦進行（調式音階的級數，0 = 主音） */
const PROGS = [
  [0, 1, 0, 1, 5, 4, 5, 4],
  [0, 5, 3, 4, 0, 5, 6, 4],
  [0, 6, 5, 6, 0, 6, 5, 4],
  [0, 0, 5, 5, 3, 3, 4, 4],
  [0, 3, 0, 4, 5, 3, 1, 4],
  [0, 5, 6, 4, 0, 5, 1, 4],
  [0, 2, 5, 4, 0, 2, 3, 4],
  [0, 1, 5, 4, 3, 1, 5, 4],
];
const RHYTHMS = [
  'x - - - x - x -',
  'x - x - x - - .',
  'x . x x - - x -',
  'x - - x - x - -',
  'x x x - x - - .',
  'x - x x x - x -',
  'x - - - - - x x',
  'x . x . x x - -',
];
const TITLES = ['怒濤之章', '宿命之戰', '神諭的審判', '血與青銅', '天穹裂痕', '深淵的回音', '不屈的誓約', '眾神的注視', '烈焰與灰燼', '最後的守門者', '破曉之前', '命運三女神的絲線', '永劫的迴廊', '戰鼓與雷霆', '暗月之歌', '英雄的試煉'];

const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (midi: number) => `${NOTE[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rngOf(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 調式音階上第 deg 級的三和弦（和弦名稱＋組成音的音高類別） */
function triad(root: number, mode: number[], deg: number): { name: string; tones: number[] } {
  const at = (k: number) => {
    const o = Math.floor(k / 7);
    return root + mode[((k % 7) + 7) % 7] + 12 * o;
  };
  const r = at(deg);
  const t3 = at(deg + 2) - r;
  const t5 = at(deg + 4) - r;
  const q = t3 === 3 && t5 === 7 ? 'm' : t3 === 4 && t5 === 7 ? '' : t3 === 3 && t5 === 6 ? 'dim' : t3 === 4 && t5 === 8 ? 'aug' : t3 === 3 ? 'm' : '';
  return { name: NOTE[((r % 12) + 12) % 12] + q, tones: [r, r + t3, r + t5].map((x) => ((x % 12) + 12) % 12) };
}

export interface BossSongOpts {
  /** 首領名稱（曲名用） */
  name: string;
  element?: string;
}

/** 依種子作一首魔王戰曲 */
export function genBossSong(id: string, opts: BossSongOpts): TrackDef {
  const rnd = rngOf(hash(id));
  const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)];
  const styles = Object.values(BOSS_STYLES);
  const st = (opts.element && BOSS_STYLES[opts.element]) || pick(styles);
  const mode = pick(st.modes);
  const root = 52 + Math.floor(rnd() * 12); // E3 ~ D#4 的主音
  const bpm = Math.round(st.bpm[0] + rnd() * (st.bpm[1] - st.bpm[0]));
  const li = Math.floor(rnd() * st.leads.length);
  const scale: number[] = [];
  for (let m = 48; m <= 96; m++) if (mode.includes((((m - root) % 12) + 12) % 12)) scale.push(m);

  const motif = pick(RHYTHMS).split(' ');
  const motif2 = pick(RHYTHMS).split(' ');
  const contour = Array.from({ length: 8 }, () => Math.floor(rnd() * 5) - 2);

  const section = (prog: number[], lift: number, rhythmA: string[], rhythmB: string[]): Section => {
    const chords: string[] = [];
    const bars: string[] = [];
    // 起始音：主音上方八度附近
    let cur = scale.findIndex((m) => m >= root + 12 + lift);
    prog.forEach((deg, bi) => {
      const tr = triad(root, mode, deg);
      chords.push(tr.name);
      const last = bi === prog.length - 1;
      const rhythm = last ? ['x', '-', '-', '-', 'x', '-', '-', '.'] : bi % 4 === 3 ? rhythmB : rhythmA;
      const toks: string[] = [];
      rhythm.forEach((r, k) => {
        if (r !== 'x') {
          toks.push(r);
          return;
        }
        // 音型：照動機的走向，偶數小節反向；強拍落在和弦音
        const dir = contour[(k + bi) % contour.length] * (bi % 2 ? -1 : 1);
        cur = Math.max(4, Math.min(scale.length - 6, cur + dir + (rnd() < 0.2 ? (rnd() < 0.5 ? -2 : 2) : 0)));
        if (k % 4 === 0 || last) {
          // 找最近的和弦音
          let best = cur;
          for (let d = 0; d <= 3; d++) {
            if (tr.tones.includes(scale[cur + d] % 12)) { best = cur + d; break; }
            if (cur - d >= 0 && tr.tones.includes(scale[cur - d] % 12)) { best = cur - d; break; }
          }
          cur = best;
        }
        // 音域：E4 ~ E6
        while (scale[cur] > 88) cur -= 7;
        while (scale[cur] < 64) cur += 7;
        toks.push(noteName(scale[cur]));
      });
      bars.push(toks.join(' '));
    });
    return { chords: chords.join(' | '), melody: bars.join(' | ') };
  };

  const progA = pick(PROGS);
  let progB = pick(PROGS);
  if (progB === progA) progB = PROGS[(PROGS.indexOf(progA) + 3) % PROGS.length];
  const A = section(progA, 0, motif, motif2);
  const B = section(progB, 5, motif2, motif);
  A.first = { c: 'x...............' };
  B.first = { c: 'x...............' };
  A.fill = pick(FILLS);
  B.fill = pick(FILLS);

  const taiko = rnd() < st.taiko;
  const drums: DrumPat = { k: pick(KICKS), s: pick(SNARES), h: pick(HATS) };
  if (taiko) drums.t = pick(TOMS);
  const phase2Drums: DrumPat = rnd() < 0.5 ? { h: 'xxxxxxxxxxxxxxxx', o: '..............x.' } : { h: 'x.xxx.xxx.xxx.xx', c: 'x.......x.......', T: '....x.......x.x.' };

  const name = `「${opts.name}」・${pick(TITLES)}`;
  return {
    id,
    name,
    bpm,
    level: 0.95,
    bossFight: true,
    lead: { inst: st.leads[li], vol: st.leads[li] === 'bell' || st.leads[li] === 'chip' ? 0.13 : 0.16, double: st.doubles[li] },
    pad: pick(st.pads),
    pad2: st.pad2,
    reverb: st.reverb,
    bass: { inst: 'bassSaw', vol: 0.15, pattern: pick(BASS_PATS), octave: 2 },
    arps: [{ inst: st.arp, vol: 0.045, pattern: pick([[0, 1, 2, 1], [0, 2, 1, 2], [0, 1, 2, 0], [2, 1, 0, 1]]), grid: 1, octave: 4, phase2: true }],
    stabs: [
      { inst: 'brass', vol: 0.055, pattern: pick(STABS), octave: 4 },
      { inst: 'brass', vol: 0.045, pattern: pick(STABS), octave: 4, phase2: true },
    ],
    drums,
    drumVol: 0.85,
    phase2Drums,
    phase2LeadUp: rnd() < 0.5,
    sections: { A, B },
    order: rnd() < 0.5 ? ['A', 'B'] : ['A', 'A', 'B'],
  };
}

/** 執行時產生的曲子（id → 曲譜） */
const GENERATED = new Map<string, TrackDef>();

/** 首領戰曲的 id：`boss:<種子>`；第一次用時產生並登記 */
export function ensureBossSong(seed: string, opts: BossSongOpts): string {
  const id = `boss:${seed}`;
  if (!GENERATED.has(id)) GENERATED.set(id, genBossSong(id, opts));
  return id;
}

export function generatedSong(id: string): TrackDef | undefined {
  return GENERATED.get(id);
}
