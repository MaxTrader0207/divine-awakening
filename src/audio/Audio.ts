import { bus } from '@/core/EventBus';
import type { Settings } from '@/core/GameState';
import type { ZoneKind } from '@/data/types';

/**
 * 音效與音樂（Web Audio 即時合成，不需要任何音檔）
 * ------------------------------------------------------------
 * - 瀏覽器規定要使用者互動後才能出聲：第一次觸控 / 按鍵時 unlock()。
 * - 音效：短促的合成音（振盪器 + 包絡 + 濾波）。
 * - 音樂：每種區域一段簡單的循環（和弦墊音 + 琶音），用 lookahead 排程，切區域時淡入淡出。
 * 之後換成正式音檔時，只要保留 play(id) / setZoneMusic(kind) 這兩個介面即可。
 */
export type SfxId =
  | 'bolt' | 'fireball' | 'frost' | 'flame' | 'blink' | 'hit' | 'crit' | 'hurt' | 'kill'
  | 'levelup' | 'pickup' | 'coin' | 'potion' | 'warn' | 'boss' | 'ui' | 'enhance' | 'fail';

type MusicKind = ZoneKind | 'boss';

/** 每種音樂：BPM、根音（MIDI）、和弦進行（相對根音的音程陣列）、琶音音型 */
const SONGS: Record<MusicKind, { bpm: number; root: number; chords: number[][]; arp: number[]; wave: OscillatorType }> = {
  town: { bpm: 84, root: 60, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]], arp: [0, 1, 2, 1], wave: 'triangle' },
  field: { bpm: 108, root: 62, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], arp: [0, 2, 1, 2], wave: 'triangle' },
  dungeon: { bpm: 96, root: 57, chords: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [7, 10, 14]], arp: [0, 1, 2, 1, 0, 2], wave: 'sine' },
  boss: { bpm: 132, root: 52, chords: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]], arp: [0, 2, 1, 2], wave: 'sawtooth' },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private song: MusicKind | null = null;
  private wantSong: MusicKind = 'town';
  private nextNote = 0;
  private step = 0;
  private timer: number | null = null;
  private lastPlay = new Map<SfxId, number>();

  constructor(private settings: Settings) {
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { once: false, passive: true });
    window.addEventListener('keydown', unlock, { once: false });
    bus.on('settings:changed', () => this.applyVolume());
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.visibilityState === 'hidden') void this.ctx.suspend();
      else void this.ctx.resume();
    });
    this.bindEvents();
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  private unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.sfxBus = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.sfxBus.connect(this.master);
        this.musicBus.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.applyVolume();
        this.startSequencer();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      /* 無法建立音訊時靜音遊玩 */
    }
  }

  private applyVolume() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.settings.sfxVolume * 0.55, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * 0.16, t, 0.3);
  }

  setZoneMusic(kind: MusicKind) {
    this.wantSong = kind;
  }

  /** 事件 → 音效 */
  private bindEvents() {
    bus.on('skill:cast', ({ slot }) => {
      const map: Record<string, SfxId> = { basic: 'bolt', Q: 'fireball', W: 'frost', E: 'flame', R: 'blink', potion: 'potion' };
      if (map[slot]) this.play(map[slot]);
    });
    bus.on('combat:hit', (h) => this.play(h.targetIsPlayer ? 'hurt' : h.crit ? 'crit' : 'hit'));
    bus.on('enemy:killed', (k) => this.play(k.boss ? 'boss' : 'kill'));
    bus.on('player:levelup', () => this.play('levelup'));
    bus.on('loot:picked', () => this.play('pickup'));
    bus.on('float:text', (f) => f.kind === 'gold' && this.play('coin'));
    bus.on('menu:open', () => this.play('ui'));
    bus.on('boss:cast', () => this.play('warn'));
  }

  play(id: SfxId) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.settings.sfxVolume <= 0) return;
    // 同一音效 40ms 內不重複（AoE 一次打很多隻時避免爆音）
    const now = ctx.currentTime;
    if (now - (this.lastPlay.get(id) ?? -1) < 0.04) return;
    this.lastPlay.set(id, now);
    const t = now + 0.005;
    switch (id) {
      case 'bolt': this.tone('sine', 880, 1320, t, 0.09, 0.25); break;
      case 'fireball': this.noise(t, 0.35, 900, 0.5); this.tone('sawtooth', 160, 70, t, 0.3, 0.25); break;
      case 'frost': this.tone('triangle', 1600, 2400, t, 0.25, 0.2); this.tone('sine', 2400, 1800, t + 0.05, 0.3, 0.15); break;
      case 'flame': this.noise(t + 0.3, 0.45, 600, 0.6); this.tone('square', 110, 55, t + 0.3, 0.35, 0.18); break;
      case 'blink': this.tone('sine', 400, 1600, t, 0.15, 0.25); break;
      case 'hit': this.tone('square', 220, 140, t, 0.06, 0.12); break;
      case 'crit': this.tone('square', 330, 160, t, 0.1, 0.18); this.tone('sine', 1320, 990, t, 0.12, 0.15); break;
      case 'hurt': this.tone('sawtooth', 180, 90, t, 0.18, 0.3); break;
      case 'kill': this.tone('triangle', 520, 260, t, 0.16, 0.2); break;
      case 'levelup': [0, 4, 7, 12].forEach((n, i) => this.tone('triangle', midi(72 + n), midi(72 + n), t + i * 0.09, 0.22, 0.25)); break;
      case 'pickup': this.tone('sine', 988, 988, t, 0.08, 0.2); this.tone('sine', 1319, 1319, t + 0.07, 0.12, 0.2); break;
      case 'coin': this.tone('square', 1568, 2093, t, 0.06, 0.07); break;
      case 'potion': this.tone('sine', 300, 900, t, 0.25, 0.2); break;
      case 'warn': this.tone('sawtooth', 220, 220, t, 0.12, 0.15); break;
      case 'boss': [0, 3, 7, 12, 15].forEach((n, i) => this.tone('triangle', midi(60 + n), midi(60 + n), t + i * 0.11, 0.35, 0.25)); break;
      case 'ui': this.tone('sine', 660, 660, t, 0.04, 0.1); break;
      case 'enhance': [0, 7, 12].forEach((n, i) => this.tone('triangle', midi(76 + n), midi(76 + n), t + i * 0.07, 0.2, 0.22)); break;
      case 'fail': this.tone('triangle', 330, 220, t, 0.25, 0.2); break;
    }
  }

  private tone(type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number, dest?: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(t: number, dur: number, cutoff: number, vol: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
  }

  /* ---------------- 音樂排程 ---------------- */

  private startSequencer() {
    if (this.timer !== null) return;
    this.nextNote = this.ctx!.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 100);
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.song !== this.wantSong) {
      // 換曲：音樂匯流排淡出再淡入
      const t = ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setTargetAtTime(0, t, 0.15);
      this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * 0.16, t + 0.6, 0.4);
      this.song = this.wantSong;
      this.step = 0;
      this.nextNote = t + 0.6;
    }
    const song = SONGS[this.song];
    const stepDur = 60 / song.bpm / 2; // 八分音符
    while (this.nextNote < ctx.currentTime + 0.3) {
      const bar = Math.floor(this.step / 8) % song.chords.length;
      const chord = song.chords[bar];
      const inBar = this.step % 8;
      if (inBar === 0) {
        // 和弦墊音（整小節）
        for (const n of chord) this.tone('sine', midi(song.root - 12 + n), midi(song.root - 12 + n), this.nextNote, stepDur * 8, 0.12, this.musicBus);
        this.tone('triangle', midi(song.root - 24 + chord[0]), midi(song.root - 24 + chord[0]), this.nextNote, stepDur * 4, 0.22, this.musicBus);
      }
      const idx = song.arp[this.step % song.arp.length];
      const note = song.root + chord[idx % chord.length] + (inBar >= 4 ? 12 : 0);
      this.tone(song.wave, midi(note), midi(note), this.nextNote, stepDur * 0.9, this.song === 'boss' ? 0.06 : 0.1, this.musicBus);
      this.nextNote += stepDur;
      this.step++;
    }
  }
}
