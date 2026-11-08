/**
 * 環境音（v1.87，Web Audio 即時合成）
 * ------------------------------------------------------------
 * 每種環境 = 一層持續的「底噪」（濾波過的噪音，慢慢起伏）＋ 隨機出現的點綴音（鳥叫、水滴、火星、海鷗…）。
 * 換地區時舊的淡出、新的淡入。音量由 AudioSystem 的 ambBus 控制（跟著音效音量）。
 * 地區 → 環境：ambienceFor()，依區域的背景音樂與種類決定，不用每個關卡另外設定。
 */
export type AmbienceId = 'none' | 'town' | 'meadow' | 'forest' | 'cave' | 'waves' | 'fire' | 'wind';

interface Bed {
  /** 濾波種類與頻率 */
  filter: BiquadFilterType;
  freq: number;
  q?: number;
  vol: number;
  /** 起伏：週期（秒）與深度（0~1） */
  lfo?: { period: number; depth: number };
}

interface Def {
  beds: Bed[];
  /** 點綴音：平均每幾秒一次 */
  events?: { kind: 'bird' | 'drip' | 'crackle' | 'gull' | 'chime' | 'gust' | 'rumble'; every: number }[];
}

const DEFS: Record<Exclude<AmbienceId, 'none'>, Def> = {
  town: { beds: [{ filter: 'lowpass', freq: 900, vol: 0.18 }, { filter: 'bandpass', freq: 2600, q: 1.2, vol: 0.05, lfo: { period: 5, depth: 0.5 } }], events: [{ kind: 'bird', every: 4 }, { kind: 'chime', every: 14 }] },
  meadow: { beds: [{ filter: 'lowpass', freq: 600, vol: 0.22, lfo: { period: 7, depth: 0.6 } }], events: [{ kind: 'bird', every: 3 }, { kind: 'gust', every: 11 }] },
  forest: { beds: [{ filter: 'lowpass', freq: 500, vol: 0.28, lfo: { period: 8, depth: 0.5 } }, { filter: 'bandpass', freq: 1400, q: 0.8, vol: 0.14, lfo: { period: 6, depth: 0.5 } }], events: [{ kind: 'bird', every: 1.8 }, { kind: 'drip', every: 9 }] },
  cave: { beds: [{ filter: 'lowpass', freq: 180, vol: 0.5, lfo: { period: 9, depth: 0.4 } }], events: [{ kind: 'drip', every: 2.2 }, { kind: 'rumble', every: 16 }] },
  waves: { beds: [{ filter: 'lowpass', freq: 700, vol: 0.5, lfo: { period: 5.5, depth: 0.85 } }, { filter: 'highpass', freq: 3500, vol: 0.04, lfo: { period: 5.5, depth: 0.9 } }], events: [{ kind: 'gull', every: 7 }] },
  fire: { beds: [{ filter: 'lowpass', freq: 140, vol: 0.6, lfo: { period: 8, depth: 0.35 } }, { filter: 'bandpass', freq: 900, q: 0.7, vol: 0.06 }], events: [{ kind: 'crackle', every: 0.35 }, { kind: 'rumble', every: 10 }] },
  wind: { beds: [{ filter: 'bandpass', freq: 500, q: 1.5, vol: 0.5, lfo: { period: 6, depth: 0.75 } }, { filter: 'bandpass', freq: 1200, q: 4, vol: 0.06, lfo: { period: 4, depth: 0.9 } }], events: [{ kind: 'gust', every: 6 }] },
};

/** 地區的背景音樂 / 種類 → 環境音 */
export function ambienceFor(z: { music?: string; kind: string; safe?: boolean; tower?: unknown }): AmbienceId {
  const byMusic: Record<string, AmbienceId> = { town: 'town', grassland: 'meadow', forest: 'forest', dungeon: 'cave', sea: 'waves', inferno: 'fire', wild: 'wind', titan: 'wind' };
  if (z.tower) return 'cave';
  if (z.music && byMusic[z.music]) return byMusic[z.music];
  return z.kind === 'town' ? 'town' : z.kind === 'dungeon' ? 'cave' : 'meadow';
}

interface Layer {
  out: GainNode;
  stop: () => void;
}

export class Ambience {
  private cur: AmbienceId = 'none';
  private layer: Layer | null = null;
  private next = new Map<string, number>();
  private buf: AudioBuffer;

  constructor(private ctx: AudioContext, private dest: AudioNode) {
    // 自己的 4 秒噪音（循環播放當底噪）
    const len = ctx.sampleRate * 4;
    this.buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.buf.getChannelData(0);
    // 粉紅噪音（比白噪音柔和），頭尾交叉淡化避免循環接縫
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
    const fade = Math.floor(ctx.sampleRate * 0.25);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] = d[i] * k + d[len - fade + i] * (1 - k);
    }
  }

  set(id: AmbienceId) {
    if (id === this.cur) return;
    this.cur = id;
    const t = this.ctx.currentTime;
    if (this.layer) {
      const old = this.layer;
      old.out.gain.setTargetAtTime(0, t, 0.5);
      window.setTimeout(() => old.stop(), 3000);
      this.layer = null;
    }
    this.next.clear();
    if (id === 'none') return;
    const def = DEFS[id];
    const out = this.ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, t, 0.8);
    out.connect(this.dest);
    const nodes: AudioScheduledSourceNode[] = [];
    for (const b of def.beds) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buf;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = b.filter;
      f.frequency.value = b.freq;
      if (b.q) f.Q.value = b.q;
      const g = this.ctx.createGain();
      g.gain.value = b.vol * (b.lfo ? 1 - b.lfo.depth / 2 : 1);
      if (b.lfo) {
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = (1 / b.lfo.period) * (0.85 + Math.random() * 0.3);
        const lg = this.ctx.createGain();
        lg.gain.value = (b.vol * b.lfo.depth) / 2;
        lfo.connect(lg).connect(g.gain);
        lfo.start(t);
        nodes.push(lfo);
      }
      src.connect(f).connect(g).connect(out);
      src.start(t, Math.random() * 3.5);
      nodes.push(src);
    }
    this.layer = {
      out,
      stop: () => {
        for (const n of nodes) {
          try {
            n.stop();
          } catch {
            /* 已停止 */
          }
        }
        out.disconnect();
      },
    };
  }

  /** 每 0.1 秒呼叫：排程點綴音 */
  update(now: number) {
    if (!this.layer || this.cur === 'none') return;
    for (const ev of DEFS[this.cur].events ?? []) {
      const at = this.next.get(ev.kind);
      if (at === undefined) {
        this.next.set(ev.kind, now + Math.random() * ev.every);
        continue;
      }
      if (now < at) continue;
      this.next.set(ev.kind, now + ev.every * (0.5 + Math.random()));
      this.event(ev.kind, now + 0.05);
    }
  }

  private event(kind: string, t: number) {
    const out = this.layer!.out;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = Math.random() * 1.6 - 0.8;
      pan.connect(out);
    }
    const dest: AudioNode = pan ?? out;
    window.setTimeout(() => pan?.disconnect(), 3000);
    const r = Math.random;
    switch (kind) {
      case 'bird': {
        // 2~4 聲短促的啾啾
        const base = 2200 + r() * 1800;
        const n = 2 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) this.chirp(base * (0.9 + r() * 0.25), base * (1.2 + r() * 0.3), t + i * (0.09 + r() * 0.05), 0.07, 0.09, dest);
        break;
      }
      case 'gull': for (let i = 0; i < 2; i++) this.chirp(1400, 900, t + i * 0.32, 0.28, 0.03, dest, 'sawtooth'); break;
      case 'drip': this.chirp(1600 + r() * 1200, 600, t, 0.08, 0.08, dest); break;
      case 'chime': [0, 4, 7].forEach((n, i) => this.chirp(1318 * Math.pow(2, n / 12), 1318 * Math.pow(2, n / 12), t + i * 0.18, 0.9, 0.025, dest)); break;
      case 'crackle': this.burst(t, 0.02 + r() * 0.03, 2500 + r() * 2500, 0.25 + r() * 0.3, dest); break;
      case 'gust': this.burst(t, 1.6, 700, 0.35, dest, true); break;
      case 'rumble': this.burst(t, 2.2, 120, 0.9, dest, true); break;
    }
  }

  private chirp(f0: number, f1: number, t: number, dur: number, vol: number, dest: AudioNode, type: OscillatorType = 'sine') {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.015, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** 一段濾波噪音；swell = 慢慢變大再變小（陣風、地鳴） */
  private burst(t: number, dur: number, freq: number, vol: number, dest: AudioNode, swell = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.buf;
    const f = this.ctx.createBiquadFilter();
    f.type = swell ? 'lowpass' : 'highpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (swell ? dur * 0.4 : 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 3, dur + 0.05);
  }
}
