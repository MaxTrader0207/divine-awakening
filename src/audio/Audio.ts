import { bus } from '@/core/EventBus';
import type { Settings } from '@/core/GameState';
import type { ZoneKind } from '@/data/types';
import { MusicPlayer, type TrackId } from './Music';
import { SONGS } from './songs';

/**
 * 音效與音樂（Web Audio 即時合成，不需要任何音檔）
 * ------------------------------------------------------------
 * - 瀏覽器規定要使用者互動後才能出聲：第一次觸控 / 按鍵時 unlock()。
 * - 音效：短促的合成音（振盪器 + 包絡 + 濾波）。
 * - 音樂：Music.ts 的合成引擎播 songs.ts 的曲譜（主城、草原、森林、副本、魔王戰、勝利）。
 * 之後換成正式音檔時，只要保留 play(id) / setMusic(id) / setBossIntensity() 這幾個介面即可。
 */
export type SfxId =
  | 'bolt' | 'fireball' | 'frost' | 'flame' | 'blink' | 'hit' | 'crit' | 'hurt' | 'kill'
  | 'levelup' | 'pickup' | 'coin' | 'potion' | 'warn' | 'boss' | 'ui' | 'enhance' | 'fail'
  | 'slash' | 'bash' | 'guard' | 'whirl' | 'charge' | 'cleave' | 'leap' | 'land' | 'roar' | 'execute' | 'summon' | 'burst' | 'shadow';

/** 區域種類 → 預設曲子（區域資料沒指定 music 時） */
const KIND_MUSIC: Record<ZoneKind, TrackId> = { town: 'town', field: 'grassland', dungeon: 'dungeon' };

/** 音樂匯流排音量倍率（乘上設定的音樂音量） */
const MUSIC_GAIN = 0.55;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private music: MusicPlayer | null = null;
  private wantSong: TrackId = 'town';
  private bossIntensity = 0;
  private paused = false;
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
        this.music = new MusicPlayer(this.ctx, this.musicBus);
        this.music.setTrack(this.wantSong);
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
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * MUSIC_GAIN * (this.paused ? 0.3 : 1), t, this.paused ? 0.12 : 0.3);
  }

  /** 暫停時音樂轉小聲（不中斷），繼續時恢復 */
  setPaused(v: boolean) {
    this.paused = v;
    this.applyVolume();
  }

  /** 指定曲子（區域音樂 / 魔王戰）；同一首重複呼叫不會重播 */
  setMusic(id: string) {
    const tid = (id in SONGS ? id : 'town') as TrackId;
    this.wantSong = tid;
    this.music?.setTrack(tid);
  }

  /** 舊介面：依區域種類選曲 */
  setZoneMusic(kind: ZoneKind | 'boss') {
    this.setMusic(kind === 'boss' ? 'boss' : KIND_MUSIC[kind]);
  }

  /** 魔王戰強度：0 = 一般，1 = 二階段（血量低於一半，加入更多聲部） */
  setBossIntensity(v: number) {
    this.bossIntensity = v;
    if (this.music) this.music.intensity = v;
  }

  /** 目前播放的曲名（設定頁顯示） */
  get nowPlaying(): string {
    const id = this.music?.playing ?? this.wantSong;
    return SONGS[id].name;
  }

  /** 事件 → 音效 */
  private bindEvents() {
    bus.on('skill:cast', ({ slot, id }) => {
      // 騎士技能有自己的音效；其他職業依欄位
      const byId: Record<string, SfxId> = { slash: 'slash', shield_bash: 'bash', guard: 'guard', whirlwind: 'whirl', charge: 'charge', cleave: 'cleave', leap: 'leap', leap_land: 'land', bloodlust: 'roar', berserk: 'roar', execute: 'execute', shadow_bolt: 'shadow', raise_skeleton: 'summon', raise_mage: 'summon', raise_guard: 'summon', bone_burst: 'burst' };
      const map: Record<string, SfxId> = { basic: 'bolt', Q: 'fireball', W: 'frost', E: 'flame', R: 'blink', potion: 'potion' };
      const sfx = (id && byId[id]) || map[slot];
      if (sfx) this.play(sfx);
    });
    bus.on('combat:hit', (h) => this.play(h.targetIsPlayer ? 'hurt' : h.crit ? 'crit' : 'hit'));
    bus.on('enemy:killed', (k) => this.play(k.boss ? 'boss' : 'kill'));
    bus.on('player:levelup', () => this.play('levelup'));
    bus.on('loot:picked', () => this.play('pickup'));
    bus.on('float:text', (f) => f.kind === 'gold' && this.play('coin'));
    bus.on('menu:open', () => this.play('ui'));
    bus.on('boss:cast', () => this.play('warn'));
    bus.on('boss:defeated', () => this.music?.playJingle('victory'));
  }

  play(id: SfxId) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.settings.sfxVolume <= 0) return;
    if (this.paused && id !== 'ui') return;
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
      case 'slash': this.noise(t, 0.12, 3200, 0.35); this.tone('triangle', 900, 300, t, 0.1, 0.12); break;
      case 'bash': this.tone('square', 140, 60, t, 0.16, 0.3); this.noise(t, 0.1, 1400, 0.5); this.tone('triangle', 620, 610, t + 0.02, 0.18, 0.12); break;
      case 'guard': [0, 7, 12].forEach((n, i) => this.tone('sine', midi(67 + n), midi(67 + n), t + i * 0.05, 0.4, 0.16)); break;
      case 'whirl': [0, 0.3, 0.6].forEach((d) => { this.noise(t + d, 0.22, 2400, 0.32); this.tone('sawtooth', 300, 700, t + d, 0.2, 0.06); }); break;
      case 'charge': this.noise(t, 0.35, 900, 0.45); this.tone('sawtooth', 120, 260, t, 0.3, 0.16); break;
      case 'cleave': this.noise(t, 0.16, 1800, 0.45); this.tone('triangle', 500, 140, t, 0.14, 0.16); break;
      case 'leap': this.noise(t, 0.3, 1200, 0.25); this.tone('sine', 200, 500, t, 0.3, 0.1); break;
      case 'land': this.tone('sine', 120, 40, t, 0.35, 0.5); this.noise(t, 0.3, 700, 0.6); break;
      case 'roar': this.tone('sawtooth', 110, 90, t, 0.5, 0.2); this.tone('square', 165, 120, t, 0.45, 0.1); this.noise(t, 0.4, 900, 0.25); break;
      case 'shadow': this.tone('sine', 520, 260, t, 0.14, 0.2); this.tone('triangle', 780, 390, t, 0.1, 0.08); break;
      case 'summon': [0, 3, 7].forEach((n, i) => this.tone('triangle', midi(50 + n), midi(62 + n), t + i * 0.06, 0.4, 0.14)); this.noise(t, 0.35, 600, 0.25); break;
      case 'burst': [0, 0.06, 0.12].forEach((d) => { this.tone('square', 160, 50, t + d, 0.25, 0.18); this.noise(t + d, 0.25, 1500, 0.45); }); break;
      case 'execute': this.tone('square', 90, 40, t, 0.3, 0.35); this.noise(t, 0.2, 2400, 0.5); this.tone('triangle', 1400, 700, t, 0.15, 0.12); break;
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
    this.timer = window.setInterval(() => {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running' || !this.music) return;
      this.music.intensity = this.bossIntensity;
      this.music.scheduleUntil(ctx.currentTime + 0.5);
    }, 100);
  }
}
