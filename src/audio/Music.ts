/**
 * 背景音樂引擎（Web Audio 即時合成，不需要音檔）
 * ------------------------------------------------------------
 * - 曲子是 `songs.ts` 的純資料：和弦、旋律、貝斯音型、鼓組、段落順序。
 * - 以 16 分音符為一格，用 lookahead 排程（每 100ms 排下一段 0.3 秒的音符）。
 * - 換曲時舊曲淡出、新曲淡入；進魔王戰切換較快。
 * - 魔王戰有「二階段」：首領血量低於一半時加入額外聲部（16 分音符踩鈸、弦樂顫音、銅管重音）。
 * - 混音（v1.44）：每個聲部有自己的聲道（左右聲相）、殘響（程式產生的石廳脈衝響應）與 ping-pong 回音；
 *   力度與時間有微小隨機（人性化），閉合鈸有強弱。
 * - 同一套引擎也能用 OfflineAudioContext 離線輸出（試聽、測音量用）。
 */
import { SONGS, type DrumPat, type Inst, type TrackDef } from './songs';

export type TrackId = keyof typeof SONGS;

interface NoteEv {
  midi: number;
  len: number; // 格數（16 分音符）
}

interface ChordAt {
  step: number;
  root: number; // 0~11
  tones: number[]; // 相對根音的音程
}

interface BarData {
  chords: ChordAt[];
  melody: Map<number, NoteEv>;
  drums: DrumPat;
}

interface Compiled {
  def: TrackDef;
  bars: BarData[];
  stepDur: number;
}

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  '5': [0, 7],
};

export const midiFreq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** 'F#5' → 78 */
export function noteToMidi(s: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) throw new Error(`音名錯誤：${s}`);
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** 'Em7' → { root: 4, tones: [0,3,7,10] } */
export function parseChord(s: string): { root: number; tones: number[] } {
  const m = /^([A-G])(#|b)?(.*)$/.exec(s);
  if (!m || !(m[3] in QUALITY)) throw new Error(`和弦錯誤：${s}`);
  const root = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return { root, tones: QUALITY[m[3]] };
}

/** 把曲子資料展開成「每小節」的事件，方便排程 */
export function compile(def: TrackDef): Compiled {
  const bars: BarData[] = [];
  for (const secId of def.order) {
    const sec = def.sections[secId];
    if (!sec) throw new Error(`${def.id} 沒有段落 ${secId}`);
    const chordBars = sec.chords.split('|').map((b) => b.trim());
    const melBars = sec.melody.split('|').map((b) => b.trim());
    if (chordBars.length !== melBars.length) throw new Error(`${def.id}/${secId}：和弦 ${chordBars.length} 小節、旋律 ${melBars.length} 小節`);
    chordBars.forEach((cb, i) => {
      const names = cb.split(/\s+/);
      const chords = names.map((n, j) => ({ step: Math.round((16 / names.length) * j), ...parseChord(n) }));
      const toks = melBars[i].split(/\s+/);
      if (16 % toks.length) throw new Error(`${def.id}/${secId} 第 ${i + 1} 小節旋律格數 ${toks.length} 不能整除 16`);
      const grid = 16 / toks.length;
      const melody = new Map<number, NoteEv>();
      let last: NoteEv | null = null;
      toks.forEach((t, k) => {
        if (t === '-') {
          if (last) last.len += grid;
        } else if (t === '.') last = null;
        else {
          last = { midi: noteToMidi(t), len: grid };
          melody.set(k * grid, last);
        }
      });
      const isLast = i === chordBars.length - 1;
      let drums = (isLast && sec.fill) || sec.drums || def.drums;
      if (i === 0 && sec.first) drums = { ...drums, ...sec.first };
      bars.push({ chords, melody, drums });
    });
  }
  return { def, bars, stepDur: 60 / def.bpm / 4 };
}

const BASS_OFF: Record<string, (tones: number[]) => number> = {
  R: () => 0,
  '5': () => 7,
  O: () => 12,
  '3': (t) => t[1] ?? 4,
  '7': () => 10,
  p: () => 1, // 降二度（緊張感）
  m: () => -1,
  '4': () => 5,
};

/** 混音聲道：每首曲子切換時各建一組（聲相、殘響量、延遲量） */
type Ch = 'lead' | 'lead2' | 'padL' | 'padC' | 'padR' | 'bass' | 'arpL' | 'arpR' | 'stab' | 'kick' | 'snare' | 'hat' | 'perc' | 'cym';
const CHANNELS: Record<Ch, { pan: number; rev: number; dly: number }> = {
  lead: { pan: 0, rev: 0.3, dly: 0.2 },
  lead2: { pan: -0.18, rev: 0.32, dly: 0.08 },
  padL: { pan: -0.6, rev: 0.5, dly: 0 },
  padC: { pan: 0, rev: 0.5, dly: 0 },
  padR: { pan: 0.6, rev: 0.5, dly: 0 },
  bass: { pan: 0, rev: 0.04, dly: 0 },
  arpL: { pan: -0.42, rev: 0.32, dly: 0.12 },
  arpR: { pan: 0.42, rev: 0.32, dly: 0.12 },
  stab: { pan: 0.12, rev: 0.3, dly: 0 },
  kick: { pan: 0, rev: 0.02, dly: 0 },
  snare: { pan: 0.06, rev: 0.22, dly: 0 },
  hat: { pan: 0.3, rev: 0.06, dly: 0 },
  perc: { pan: -0.24, rev: 0.2, dly: 0 },
  cym: { pan: 0.1, rev: 0.35, dly: 0 },
};
const PAD_CH: Ch[] = ['padL', 'padC', 'padR'];
const DRUM_CH: Record<keyof DrumPat, Ch> = { k: 'kick', s: 'snare', r: 'snare', h: 'hat', o: 'hat', sh: 'perc', t: 'perc', T: 'perc', c: 'cym' };

/** 一首曲子的混音台：總推桿＋殘響 / 延遲送出，換曲時整組淡入淡出 */
interface Mix {
  fader: GainNode;
  rev: GainNode;
  dly: GainNode;
  ch: Record<Ch, GainNode>;
}

export class MusicPlayer {
  private out: GainNode;
  private revIn: GainNode;
  private dlyIn: GainNode;
  private dlyL: DelayNode;
  private dlyR: DelayNode;
  private mix: Mix | null = null;
  private cur: Compiled | null = null;
  private curId: TrackId | null = null;
  private want: TrackId = 'town';
  private jingle: TrackId | null = null;
  private jingleEnd = 0;
  private step = 0;
  private nextTime = 0;
  private noiseBuf: AudioBuffer;
  private compiled = new Map<TrackId, Compiled>();
  /** 0 = 一般，1 = 二階段（魔王血量低於一半） */
  intensity = 0;

  constructor(private ctx: BaseAudioContext, dest: AudioNode) {
    // 壓縮器：多聲部疊加時不爆音
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    // 低切：去掉聽不到、只會吃掉音量的超低頻
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 32;
    hp.Q.value = 0.6;
    hp.connect(comp).connect(dest);
    this.out = ctx.createGain();
    this.out.connect(hp);

    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // 殘響：程式產生的立體聲脈衝響應（約 2.4 秒、越後面越暗），像神殿石廳的空間感
    const conv = ctx.createConvolver();
    conv.buffer = this.impulse(2.4, 3);
    this.revIn = ctx.createGain();
    const revOut = ctx.createGain();
    revOut.gain.value = 0.7;
    this.revIn.connect(conv).connect(revOut).connect(hp);

    // 延遲：左右交替（ping-pong）的附點八分音符回音，給主旋律、琶音
    this.dlyIn = ctx.createGain();
    this.dlyL = ctx.createDelay(2);
    this.dlyR = ctx.createDelay(2);
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2600;
    const merge = ctx.createChannelMerger(2);
    const dlyOut = ctx.createGain();
    dlyOut.gain.value = 0.55;
    this.dlyIn.connect(this.dlyL);
    this.dlyL.connect(merge, 0, 0);
    this.dlyL.connect(this.dlyR);
    this.dlyR.connect(merge, 0, 1);
    this.dlyR.connect(damp).connect(fb).connect(this.dlyL);
    merge.connect(dlyOut).connect(hp);
  }

  private impulse(sec: number, decay: number): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * sec);
    const pre = Math.floor(sr * 0.012);
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = pre; i < len; i++) {
        const x = (i - pre) / (len - pre);
        const n = (Math.random() * 2 - 1) * Math.pow(1 - x, decay);
        lp += (n - lp) * (0.62 - 0.5 * x); // 高頻衰減得比較快
        d[i] = lp;
      }
    }
    return buf;
  }

  get playing(): TrackId | null {
    return this.curId;
  }

  setTrack(id: TrackId) {
    this.want = id;
  }

  /** 播一段不循環的短曲（勝利），播完回到 setTrack 指定的曲子 */
  playJingle(id: TrackId) {
    this.jingle = id;
    this.jingleEnd = 0;
  }

  private get(id: TrackId): Compiled {
    let c = this.compiled.get(id);
    if (!c) {
      c = compile(SONGS[id]);
      this.compiled.set(id, c);
    }
    return c;
  }

  /** 排程到 until 為止的音符（AudioSystem 每 100ms 呼叫一次；離線輸出時一次排完） */
  scheduleUntil(until: number) {
    const now = this.ctx.currentTime;
    let target: TrackId = this.want;
    if (this.jingle) {
      if (this.curId === this.jingle && this.jingleEnd && now >= this.jingleEnd) this.jingle = null;
      else target = this.jingle;
    }
    if (target !== this.curId) this.switchTo(target);
    const c = this.cur!;
    // 主執行緒卡住、排程落後時：跳過錯過的拍子（保持節拍位置，不擠在一起補播）
    if (this.nextTime < now) {
      const behind = Math.ceil((now - this.nextTime) / c.stepDur);
      this.step += behind;
      this.nextTime += behind * c.stepDur;
    }
    while (this.nextTime < until) {
      if (c.def.loop === false && this.step >= c.bars.length * 16) return;
      this.playStep(c, this.step, this.nextTime);
      this.nextTime += c.stepDur;
      this.step++;
    }
  }

  private makeMix(def: TrackDef): Mix {
    const ctx = this.ctx;
    const fader = ctx.createGain();
    const rev = ctx.createGain();
    const dly = ctx.createGain();
    fader.connect(this.out);
    rev.connect(this.revIn);
    dly.connect(this.dlyIn);
    const revMul = def.reverb ?? 1;
    const ch = {} as Record<Ch, GainNode>;
    for (const [name, c] of Object.entries(CHANNELS) as [Ch, (typeof CHANNELS)[Ch]][]) {
      const g = ctx.createGain();
      const pan = ctx.createStereoPanner();
      pan.pan.value = c.pan;
      g.connect(pan).connect(fader);
      if (c.rev > 0) {
        const s = ctx.createGain();
        s.gain.value = c.rev * revMul;
        g.connect(s).connect(rev);
      }
      if (c.dly > 0) {
        const s = ctx.createGain();
        s.gain.value = c.dly * (def.echo ?? 1);
        g.connect(s).connect(dly);
      }
      ch[name] = g;
    }
    return { fader, rev, dly, ch };
  }

  private switchTo(id: TrackId) {
    const ctx = this.ctx;
    const t = Math.max(ctx.currentTime, 0);
    const toBoss = SONGS[id].bossFight === true || id === 'victory';
    const fade = toBoss ? 0.25 : 0.7;
    if (this.mix) {
      const old = this.mix;
      for (const g of [old.fader, old.rev, old.dly]) {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + fade);
      }
      setTimeout(() => {
        old.fader.disconnect();
        old.rev.disconnect();
        old.dly.disconnect();
      }, (fade + 4) * 1000);
    }
    const def = SONGS[id];
    const mix = this.makeMix(def);
    const lvl = def.level ?? 1;
    for (const g of [mix.fader, mix.rev, mix.dly]) {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lvl, t + (toBoss ? 0.15 : fade));
    }
    this.mix = mix;
    this.cur = this.get(id);
    this.curId = id;
    this.step = 0;
    this.nextTime = t + (toBoss ? 0.08 : fade * 0.6);
    // 回音跟著曲速：附點八分音符
    const echo = Math.min(1.5, this.cur.stepDur * 3);
    this.dlyL.delayTime.setTargetAtTime(echo, t, 0.05);
    this.dlyR.delayTime.setTargetAtTime(echo, t, 0.05);
    // 不循環的短曲：直接算出結束時間（不依賴排程進度）
    this.jingleEnd = this.cur.def.loop === false ? this.nextTime + this.cur.bars.length * 16 * this.cur.stepDur + 0.4 : 0;
  }

  private chordAt(bar: BarData, s: number): ChordAt {
    let c = bar.chords[0];
    for (const ch of bar.chords) if (ch.step <= s) c = ch;
    return c;
  }

  /** 人性化：力度 ±7%、時間 0~4ms 的微小偏差，聽起來比較像真人演奏 */
  private human(v: number): number {
    return v * (0.93 + Math.random() * 0.14);
  }

  private playStep(c: Compiled, step: number, t0: number) {
    const def = c.def;
    const bar = c.bars[Math.floor(step / 16) % c.bars.length];
    const s = step % 16;
    const sd = c.stepDur;
    // 搖擺：反拍的八分音符稍微延後（輕快的曲子用）
    const t = t0 + (def.swing && s % 4 === 2 ? def.swing * sd : 0);
    const chord = this.chordAt(bar, s);
    const p2 = this.intensity > 0;
    const jit = () => t + Math.random() * 0.004;

    // 和聲墊音：和弦開始時（三個和弦音分到左、中、右，聲音比較寬）
    if (def.pad && bar.chords.some((ch) => ch.step === s)) {
      const next = bar.chords.find((ch) => ch.step > s)?.step ?? 16;
      const base = 12 * (def.pad.octave + 1) + chord.root;
      chord.tones.slice(0, 3).forEach((iv, i) => this.note(def.pad!.inst, base + iv, t, (next - s) * sd, def.pad!.vol, PAD_CH[i]));
      if (def.pad2) chord.tones.slice(0, 3).forEach((iv, i) => this.note(def.pad2!.inst, 12 * (def.pad2!.octave + 1) + chord.root + iv, t, (next - s) * sd, def.pad2!.vol, PAD_CH[2 - i]));
    }
    // 貝斯
    const bt = def.bass.pattern[s];
    if (bt && bt !== '.') {
      let len = 1;
      while (s + len < 16 && def.bass.pattern[s + len] === '.' && len < 4) len++;
      const off = BASS_OFF[bt]?.(chord.tones) ?? 0;
      this.note(def.bass.inst, 12 * ((def.bass.octave ?? 2) + 1) + chord.root + off, t, len * sd * 0.92, this.human(def.bass.vol) * (s % 4 ? 0.88 : 1), 'bass');
    }
    // 琶音（左右交替）
    for (const arp of def.arps ?? []) {
      if (arp.phase2 && !p2) continue;
      if (s % arp.grid) continue;
      const k = s / arp.grid;
      const idx = arp.pattern[k % arp.pattern.length];
      const tone = chord.tones[idx % chord.tones.length] + 12 * Math.floor(idx / chord.tones.length);
      this.note(arp.inst, 12 * (arp.octave + 1) + chord.root + tone, jit(), arp.grid * sd * (arp.gate ?? 0.8), this.human(arp.vol) * (s % 4 ? 0.85 : 1), k % 2 ? 'arpR' : 'arpL');
    }
    // 和弦重音（銅管）
    for (const st of def.stabs ?? []) {
      if (st.phase2 && !p2) continue;
      if (st.pattern[s] !== 'x' && st.pattern[s] !== 'X') continue;
      const base = 12 * (st.octave + 1) + chord.root;
      const v = st.pattern[s] === 'X' ? st.vol * 1.3 : st.vol;
      for (const iv of chord.tones.slice(0, 3)) this.note(st.inst, base + iv, t, sd * 1.6, v, 'stab');
    }
    // 主旋律（強拍稍微重一點）
    const ev = bar.melody.get(s);
    if (ev) {
      const up = p2 && def.phase2LeadUp ? 12 : 0;
      const accent = s === 0 ? 1.08 : s % 4 ? 0.92 : 1;
      this.note(def.lead.inst, ev.midi + up, jit(), ev.len * sd * 0.95, this.human(def.lead.vol) * accent, 'lead');
      if (def.lead.double) this.note(def.lead.double, ev.midi + up - 12, jit(), ev.len * sd * 0.95, def.lead.vol * 0.45, 'lead2');
    }
    // 鼓
    this.drums(bar.drums, s, t, def.drumVol ?? 1);
    if (p2 && def.phase2Drums) this.drums(def.phase2Drums, s, t, def.drumVol ?? 1);
  }

  private drums(p: DrumPat, s: number, t: number, vol: number) {
    for (const [k, pat] of Object.entries(p) as [keyof DrumPat, string][]) {
      const ch = pat?.[s];
      if (!ch || ch === '.') continue;
      // 閉合鈸：反拍輕一點、加一點隨機，聽起來不像機器
      const groove = k === 'h' ? (s % 4 === 0 ? 1 : s % 2 ? 0.62 : 0.8) * (0.85 + Math.random() * 0.3) : 1;
      this.drum(k, t, (ch === 'X' ? 1.35 : 1) * vol * groove, DRUM_CH[k]);
    }
  }

  /* ---------------- 樂器 ---------------- */

  private env(g: GainNode, t: number, peak: number, a: number, decay: number, sus: number, dur: number, rel: number) {
    const p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(peak * sus, t + a, decay / 3);
    const end = Math.max(t + a, t + dur);
    p.setTargetAtTime(0, end, rel / 3);
    return end + rel * 1.2;
  }

  private osc(type: OscillatorType, freq: number, t: number, stop: number, dest: AudioNode, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(stop);
    return o;
  }

  /** 延遲出現的顫音（長音才會抖） */
  private vibrato(o: OscillatorNode, t: number, end: number, dur: number, rate: number, cents: number) {
    if (dur < 0.3) return;
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    lfo.frequency.value = rate;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(cents, t + Math.min(0.4, dur));
    lfo.connect(lg).connect(o.detune);
    lfo.start(t);
    lfo.stop(end);
  }

  private gainTo(dest: AudioNode, v: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = v;
    g.connect(dest);
    return g;
  }

  note(inst: Inst, midi: number, t: number, dur: number, vol: number, channel: Ch = 'lead') {
    const ctx = this.ctx;
    const dest = this.mix?.ch[channel] ?? this.out;
    const f = midiFreq(midi);
    const g = ctx.createGain();
    g.connect(dest);
    switch (inst) {
      case 'flute': {
        // 三角波＋延遲顫音＋起音的氣音：溫暖的木管
        const end = this.env(g, t, vol, 0.035, 0.2, 0.75, dur, 0.12);
        const o = this.osc('triangle', f, t, end, g);
        this.vibrato(o, t, end, dur, 5.2, 14);
        this.osc('sine', f * 2, t, end, this.gainTo(g, 0.12));
        this.noiseHit(t, 0.07, 'bandpass', Math.min(6000, f * 3), vol * 0.22, 1.5, g);
        break;
      }
      case 'chip': {
        // 方波＋低通：柔和的 8-bit 主旋律
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2600;
        lp.connect(g);
        const end = this.env(g, t, vol * 0.55, 0.008, 0.12, 0.65, dur, 0.06);
        this.osc('square', f, t, end, lp);
        this.osc('square', f, t, end, lp, 9);
        break;
      }
      case 'pluck': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(4200, t);
        lp.frequency.exponentialRampToValueAtTime(700, t + 0.25);
        lp.connect(g);
        const end = this.env(g, t, vol, 0.004, 0.18, 0.0001, Math.min(dur, 0.3), 0.08);
        this.osc('triangle', f, t, end, lp);
        this.osc('sawtooth', f, t, end, this.gainTo(lp, 0.35), 6);
        break;
      }
      case 'lyre': {
        // 里拉琴（古希臘豎琴）：明亮的撥弦，泛音快速變暗、尾音比 pluck 長
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(5200, t);
        lp.frequency.exponentialRampToValueAtTime(1100, t + 0.45);
        lp.connect(g);
        const end = this.env(g, t, vol, 0.003, 0.8, 0.0001, Math.min(dur, 1.1), 0.35);
        this.osc('triangle', f, t, end, lp);
        this.osc('sine', f * 2, t, end, this.gainTo(lp, 0.28));
        this.osc('sawtooth', f, t, end, this.gainTo(lp, 0.16), 5);
        break;
      }
      case 'bell': {
        const end = this.env(g, t, vol, 0.003, 0.5, 0.0001, Math.min(dur, 0.5), 0.3);
        this.osc('sine', f, t, end, g);
        this.osc('sine', f * 3.01, t, end, this.gainTo(g, 0.3));
        break;
      }
      case 'pad': {
        // 兩個微走音的鋸齒波＋三角波，低通後很柔：比原本的三角波墊音厚
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1000;
        lp.Q.value = 0.4;
        lp.connect(g);
        const end = this.env(g, t, vol, 0.3, 0.5, 0.8, dur, 0.6);
        this.osc('sawtooth', f, t, end, this.gainTo(lp, 0.35), -9);
        this.osc('sawtooth', f, t, end, this.gainTo(lp, 0.35), 9);
        this.osc('triangle', f, t, end, lp);
        break;
      }
      case 'choir': {
        // 合唱「啊」：鋸齒波經過三個共振峰（母音 a），慢起音＋顫音，神殿氣氛
        const end = this.env(g, t, vol, 0.35, 0.6, 0.85, dur, 0.6);
        const mixIn = ctx.createGain();
        for (const [fq, q, a] of [[700, 5, 1], [1150, 7, 0.55], [2700, 9, 0.22]] as const) {
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = fq;
          bp.Q.value = q;
          mixIn.connect(bp).connect(this.gainTo(g, a * 2.2));
        }
        const o1 = this.osc('sawtooth', f, t, end, mixIn, -10);
        const o2 = this.osc('sawtooth', f, t, end, mixIn, 11);
        this.vibrato(o1, t, end, dur, 4.6, 9);
        this.vibrato(o2, t, end, dur, 5.1, 9);
        break;
      }
      case 'aulos': {
        // 阿夫洛斯管（古希臘雙簧管）：帶鼻音的簧片聲
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = Math.min(3200, Math.max(900, f * 2.2));
        bp.Q.value = 0.9;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3400;
        bp.connect(lp).connect(g);
        const end = this.env(g, t, vol * 1.5, 0.03, 0.25, 0.8, dur, 0.1);
        const o = this.osc('sawtooth', f, t, end, bp);
        this.osc('square', f, t, end, this.gainTo(bp, 0.45), 6);
        this.vibrato(o, t, end, dur, 5.8, 18);
        break;
      }
      case 'strings': {
        // 鋸齒波弦樂：魔王戰的低音墊
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1100;
        lp.Q.value = 0.7;
        lp.connect(g);
        const end = this.env(g, t, vol, 0.12, 0.4, 0.85, dur, 0.35);
        this.osc('sawtooth', f, t, end, lp, -8);
        this.osc('sawtooth', f, t, end, lp, 8);
        break;
      }
      case 'tremolo': {
        // 短促鋸齒波（16 分音符弦樂顫音）
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        lp.connect(g);
        const end = this.env(g, t, vol, 0.006, 0.06, 0.4, dur, 0.04);
        this.osc('sawtooth', f, t, end, lp);
        break;
      }
      case 'brass': {
        // 兩個鋸齒波＋濾波器包絡：銅管（長音會微微顫）
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 1.2;
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.linearRampToValueAtTime(2600, t + 0.06);
        lp.frequency.setTargetAtTime(1300, t + 0.06, 0.15);
        lp.connect(g);
        const end = this.env(g, t, vol, 0.03, 0.25, 0.75, dur, 0.1);
        const o = this.osc('sawtooth', f, t, end, lp, -7);
        this.osc('sawtooth', f, t, end, lp, 7);
        this.vibrato(o, t, end, dur, 5, 8);
        break;
      }
      case 'bass': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        lp.connect(g);
        const end = this.env(g, t, vol, 0.006, 0.15, 0.7, dur, 0.06);
        this.osc('triangle', f, t, end, lp);
        this.osc('sine', f, t, end, lp);
        break;
      }
      case 'bassSaw': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 2;
        lp.frequency.setValueAtTime(1400, t);
        lp.frequency.exponentialRampToValueAtTime(300, t + 0.12);
        lp.connect(g);
        const end = this.env(g, t, vol, 0.004, 0.1, 0.6, dur, 0.05);
        this.osc('sawtooth', f, t, end, lp);
        this.osc('square', f / 2, t, end, lp);
        break;
      }
    }
  }

  private noiseHit(t: number, dur: number, type: BiquadFilterType, freq: number, vol: number, q = 0.8, dest?: AudioNode) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private sweep(t: number, f0: number, f1: number, dur: number, vol: number, type: OscillatorType, dest: AudioNode) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private drum(k: keyof DrumPat, t: number, v: number, channel: Ch) {
    const d = this.mix?.ch[channel] ?? this.out;
    switch (k) {
      case 'k': // 大鼓：低頻掃頻＋起音的「喀」
        this.sweep(t, 150, 44, 0.22, 0.9 * v, 'sine', d);
        this.noiseHit(t, 0.014, 'highpass', 3000, 0.22 * v, 0.7, d);
        break;
      case 's': // 小鼓：響弦噪音＋鼓皮音＋高頻的「啪」
        this.noiseHit(t, 0.18, 'bandpass', 1800, 0.48 * v, 0.6, d);
        this.noiseHit(t, 0.06, 'highpass', 5200, 0.2 * v, 0.7, d);
        this.sweep(t, 210, 165, 0.1, 0.28 * v, 'triangle', d);
        break;
      case 'r': this.noiseHit(t, 0.05, 'bandpass', 3200, 0.35 * v, 2, d); break; // 邊擊 / 拍手
      case 'h': this.noiseHit(t, 0.032, 'highpass', 8000, 0.24 * v, 0.7, d); break;
      case 'o': this.noiseHit(t, 0.26, 'highpass', 6500, 0.18 * v, 0.7, d); break;
      case 'sh': this.noiseHit(t, 0.06, 'bandpass', 6000, 0.14 * v, 1.2, d); break; // 沙鈴
      case 't': // 太鼓：深沉的鼓身＋鼓皮
        this.sweep(t, 108, 54, 0.42, 0.75 * v, 'sine', d);
        this.noiseHit(t, 0.1, 'lowpass', 600, 0.3 * v, 0.8, d);
        break;
      case 'T': this.sweep(t, 190, 118, 0.24, 0.5 * v, 'sine', d); break;
      case 'c': // 銅鈸：寬頻噪音＋高頻閃爍
        this.noiseHit(t, 1.6, 'highpass', 4200, 0.26 * v, 0.5, d);
        this.noiseHit(t, 0.9, 'bandpass', 9000, 0.12 * v, 1.5, d);
        break;
    }
  }
}

/** 離線輸出（試聽、音量檢查用）：回傳立體聲 WAV 的 ArrayBuffer */
export async function renderTrack(id: TrackId, seconds: number, intensity = 0, gain = 0.55, sampleRate = 44100): Promise<ArrayBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const out = ctx.createGain();
  out.gain.value = gain; // 與遊戲內音樂匯流排相同的倍率
  out.connect(ctx.destination);
  const p = new MusicPlayer(ctx, out);
  p.intensity = intensity;
  p.setTrack(id);
  p.scheduleUntil(seconds);
  const buf = await ctx.startRendering();
  return toWav(buf);
}

export function toWav(buf: AudioBuffer): ArrayBuffer {
  const ch = buf.numberOfChannels;
  const n = buf.length;
  const out = new ArrayBuffer(44 + n * ch * 2);
  const v = new DataView(out);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + n * ch * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, ch, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      v.setInt16(o, s * 0x7fff, true);
      o += 2;
    }
  return out;
}
