import { bus } from '@/core/EventBus';
import type { Settings } from '@/core/GameState';
import type { ZoneKind } from '@/data/types';
import { MusicPlayer, toWav, type TrackId } from './Music';
import { SONGS } from './songs';
import { Ambience, type AmbienceId } from './Ambience';

/**
 * 音效與音樂（Web Audio 即時合成，不需要任何音檔）
 * ------------------------------------------------------------
 * - 瀏覽器規定要使用者互動後才能出聲：第一次觸控 / 按鍵時 unlock()。
 * - 音效：短促的合成音（振盪器 + 包絡 + 濾波）。v1.87：
 *   · 7 個職業各有自己的技能音效（SKILL_SFX，依技能 id）；
 *   · 打擊類音效每次音高 / 音量微變化（不會聽膩），帶世界座標的音效依左右位置分聲道、越遠越小聲；
 *   · 主輸出加限幅器（DynamicsCompressor），一次打很多隻也不會爆音；同時發聲數有上限；
 *   · 首領怒吼、重擊、倒下、稀有掉落等事件音效；大事件時音樂短暫壓低（duck）。
 * - 環境音（v1.87）：Ambience.ts 依地區播海浪 / 風 / 火山 / 森林 / 洞窟 / 城鎮，音量跟著音效音量。
 * - 音樂：Music.ts 的合成引擎播 songs.ts 的曲譜。
 * 之後換成正式音檔時，只要保留 play(id) / setMusic(id) / setBossIntensity() 這幾個介面即可。
 */
export type SfxId =
  | 'bolt' | 'fireball' | 'frost' | 'flame' | 'blink' | 'hit' | 'crit' | 'hurt' | 'kill'
  | 'levelup' | 'pickup' | 'coin' | 'potion' | 'warn' | 'boss' | 'ui' | 'enhance' | 'fail'
  | 'slash' | 'bash' | 'guard' | 'whirl' | 'charge' | 'cleave' | 'leap' | 'land' | 'roar' | 'execute' | 'summon' | 'burst' | 'shadow'
  /* v1.87 */
  | 'arrow' | 'volley' | 'pierce' | 'arrowRain' | 'backstep'
  | 'sword' | 'swordQi' | 'swiftStep' | 'swordRain' | 'intent'
  | 'whip' | 'howl' | 'screech' | 'growl' | 'wildRoar'
  | 'bossRoar' | 'impact' | 'death' | 'rare' | 'mythic';

/** 技能 id → 音效（v1.87：每個職業都有自己的聲音；沒列到的依欄位用 SLOT_SFX） */
export const SKILL_SFX: Record<string, SfxId> = {
  // 法師
  magic_bolt: 'bolt', fireball: 'fireball', frost_nova: 'frost', flame_burst: 'flame', blink: 'blink',
  // 弓手
  arrow: 'arrow', multishot: 'volley', pierce: 'pierce', arrow_rain: 'arrowRain', backstep: 'backstep',
  // 騎士
  slash: 'slash', shield_bash: 'bash', guard: 'guard', whirlwind: 'whirl', charge: 'charge',
  // 狂戰士
  cleave: 'cleave', leap: 'leap', leap_land: 'land', bloodlust: 'roar', execute: 'execute', berserk: 'roar',
  // 召喚師
  shadow_bolt: 'shadow', raise_skeleton: 'summon', raise_mage: 'summon', raise_guard: 'summon', bone_burst: 'burst',
  // 劍俠
  sword_strike: 'sword', sword_qi: 'swordQi', swift_step: 'swiftStep', sword_rain: 'swordRain', sword_intent: 'intent',
  // 訓獸師
  beast_whip: 'whip', call_hounds: 'howl', call_eagle: 'screech', call_bear: 'growl', wild_roar: 'wildRoar',
};
const SLOT_SFX: Record<string, SfxId> = { basic: 'bolt', Q: 'fireball', W: 'frost', E: 'flame', R: 'blink', potion: 'potion' };

/** 每次音高隨機變化的幅度（打擊類多一點，介面音不變） */
const JITTER: Partial<Record<SfxId, number>> = {
  hit: 0.14, crit: 0.08, hurt: 0.1, kill: 0.12, coin: 0.06, pickup: 0.04, arrow: 0.08, sword: 0.1, slash: 0.1, cleave: 0.08, whip: 0.1,
  bolt: 0.06, shadow: 0.06, impact: 0.08,
};
/** 太吵時先丟掉的音效（同時發聲超過上限時） */
const LOW_PRIORITY = new Set<SfxId>(['hit', 'crit', 'coin', 'kill', 'pickup']);
const MAX_VOICES = 28;

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
  private duckGain!: GainNode;
  private ambBus!: GainNode;
  private music: MusicPlayer | null = null;
  private ambience: Ambience | null = null;
  private wantSong: TrackId = 'town';
  private wantAmb: AmbienceId = 'none';
  private bossIntensity = 0;
  private paused = false;
  private timer: number | null = null;
  private lastPlay = new Map<SfxId, number>();
  private noiseBuf: AudioBuffer | null = null;
  /** 目前這一發音效的輸出點與音高倍率（play() 設定，tone / noise 使用） */
  private shotDest: AudioNode | null = null;
  private pm = 1;
  private voices = 0;
  /** 聽者位置（玩家），給左右聲道與距離衰減用 */
  private listener: () => { x: number; z: number } = () => ({ x: 0, z: 0 });

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

  /** Game 設定聽者（玩家位置） */
  setListener(fn: () => { x: number; z: number }) {
    this.listener = fn;
  }

  private unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        const ctx = (this.ctx = new AC());
        this.master = ctx.createGain();
        this.sfxBus = ctx.createGain();
        this.musicBus = ctx.createGain();
        this.duckGain = ctx.createGain();
        this.ambBus = ctx.createGain();
        // 限幅器：很多音效疊在一起時壓住峰值，不會破音
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 8;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.18;
        this.sfxBus.connect(this.master);
        this.musicBus.connect(this.duckGain).connect(this.master);
        this.ambBus.connect(this.master);
        this.master.connect(limiter).connect(ctx.destination);
        this.music = new MusicPlayer(ctx, this.musicBus);
        this.music.setTrack(this.wantSong);
        this.ambience = new Ambience(ctx, this.ambBus);
        this.ambience.set(this.wantAmb);
        // 共用的白噪音（2 秒），每次從隨機位置取一段，不用每次重新產生
        const len = ctx.sampleRate * 2;
        this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
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
    this.ambBus.gain.setTargetAtTime(this.settings.sfxVolume * 0.22 * (this.paused ? 0.35 : 1), t, 0.4);
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

  /** 環境音（v1.87）；同一種重複呼叫不會重來 */
  setAmbience(id: AmbienceId) {
    if (id === this.wantAmb) return;
    this.wantAmb = id;
    this.ambience?.set(id);
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

  /** 大事件時把音樂壓低一下（depth 0~1，hold 秒後慢慢回來） */
  private duck(depth: number, hold: number) {
    if (!this.ctx) return;
    const g = this.duckGain.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(1 - depth, t + 0.05);
    g.setValueAtTime(1 - depth, t + hold);
    g.linearRampToValueAtTime(1, t + hold + 0.8);
  }

  /** 事件 → 音效 */
  private bindEvents() {
    bus.on('skill:cast', ({ slot, id }) => {
      const sfx = (id && SKILL_SFX[id]) || SLOT_SFX[slot];
      if (sfx) this.play(sfx);
    });
    bus.on('combat:hit', (h) => this.play(h.targetIsPlayer ? 'hurt' : h.crit ? 'crit' : 'hit', h.targetIsPlayer ? undefined : h));
    bus.on('enemy:killed', (k) => this.play(k.boss ? 'boss' : 'kill', k));
    bus.on('player:levelup', () => {
      this.play('levelup');
      this.duck(0.45, 0.6);
    });
    bus.on('loot:picked', (l) => {
      // 稀有度越高聲音越亮：★神話裝最華麗、史詩次之
      if (l.base && /_\d\d$/.test(l.base)) this.play('mythic');
      else if (l.rarity === 'epic') this.play('rare');
      else this.play('pickup');
    });
    bus.on('float:text', (f) => f.kind === 'gold' && this.play('coin', f));
    bus.on('menu:open', () => this.play('ui'));
    bus.on('boss:cast', () => this.play('warn'));
    bus.on('boss:roar', () => {
      this.play('bossRoar');
      this.duck(0.6, 0.9);
    });
    bus.on('camera:shake', ({ power }) => power >= 0.45 && this.play('impact'));
    bus.on('player:died', () => {
      this.play('death');
      this.duck(0.7, 1.5);
    });
    bus.on('boss:defeated', () => this.music?.playJingle('victory'));
  }

  /** 播音效；at = 世界座標（有的話依左右位置分聲道、越遠越小聲） */
  play(id: SfxId, at?: { x: number; z: number }) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.settings.sfxVolume <= 0) return;
    if (this.paused && id !== 'ui') return;
    // 同一音效 40ms 內不重複（AoE 一次打很多隻時避免爆音）
    const now = ctx.currentTime;
    if (now - (this.lastPlay.get(id) ?? -1) < 0.04) return;
    if (this.voices >= MAX_VOICES && LOW_PRIORITY.has(id)) return;
    this.lastPlay.set(id, now);
    const t = now + 0.005;
    // 這一發的輸出：音量（距離衰減）→ 左右聲道 → 音效匯流排
    const shot = ctx.createGain();
    let out: AudioNode = shot;
    if (at) {
      const l = this.listener();
      const dx = at.x - l.x;
      const dist = Math.hypot(dx, at.z - l.z);
      shot.gain.value = Math.max(0.3, 1 - dist / 28);
      if (ctx.createStereoPanner) {
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.max(-0.75, Math.min(0.75, dx / 12));
        shot.connect(pan);
        out = pan;
      }
    }
    out.connect(this.sfxBus);
    this.shotDest = shot;
    const j = JITTER[id] ?? 0;
    this.pm = 1 + (Math.random() - 0.5) * j;
    this.voices++;
    window.setTimeout(() => {
      this.voices--;
      try {
        out.disconnect();
      } catch {
        /* 已斷開 */
      }
    }, 2600);
    this.emit(id, t);
    this.shotDest = null;
    this.pm = 1;
  }

  private emit(id: SfxId, t: number) {
    switch (id) {
      case 'bolt': this.tone('sine', 880, 1320, t, 0.09, 0.25); break;
      case 'fireball': this.noise(t, 0.35, 900, 0.5); this.tone('sawtooth', 160, 70, t, 0.3, 0.25); break;
      case 'frost': this.tone('triangle', 1600, 2400, t, 0.25, 0.2); this.tone('sine', 2400, 1800, t + 0.05, 0.3, 0.15); break;
      case 'flame': this.noise(t + 0.3, 0.45, 600, 0.6); this.tone('square', 110, 55, t + 0.3, 0.35, 0.18); break;
      case 'blink': this.tone('sine', 400, 1600, t, 0.15, 0.25); break;
      case 'hit': this.tone('square', 220, 140, t, 0.06, 0.12); this.noise(t, 0.05, 2400, 0.18); break;
      case 'crit': this.tone('square', 330, 160, t, 0.1, 0.18); this.tone('sine', 1320, 990, t, 0.12, 0.15); this.noise(t, 0.08, 3600, 0.25); break;
      case 'hurt': this.tone('sawtooth', 180, 90, t, 0.18, 0.3); this.noise(t, 0.08, 900, 0.25); break;
      case 'kill': this.tone('triangle', 520, 260, t, 0.16, 0.2); this.noise(t + 0.02, 0.18, 1200, 0.18); break;
      case 'levelup': [0, 4, 7, 12].forEach((n, i) => this.tone('triangle', midi(72 + n), midi(72 + n), t + i * 0.09, 0.22, 0.25)); this.tone('sine', midi(96), midi(96), t + 0.36, 0.5, 0.1); break;
      case 'pickup': this.tone('sine', 988, 988, t, 0.08, 0.2); this.tone('sine', 1319, 1319, t + 0.07, 0.12, 0.2); break;
      case 'coin': this.tone('square', 1568, 2093, t, 0.06, 0.07); break;
      case 'potion': this.tone('sine', 300, 900, t, 0.25, 0.2); this.noise(t, 0.2, 1800, 0.12, 'bandpass'); break;
      case 'warn': this.tone('sawtooth', 220, 220, t, 0.12, 0.15); this.tone('sawtooth', 233, 233, t, 0.12, 0.08); break;
      case 'boss': [0, 3, 7, 12, 15].forEach((n, i) => this.tone('triangle', midi(60 + n), midi(60 + n), t + i * 0.11, 0.35, 0.25)); this.boom(t, 0.6, 0.5); break;
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

      /* ---- 弓手 ---- */
      case 'arrow': this.twang(t, 0.2); this.noise(t + 0.01, 0.13, 5200, 0.22, 'highpass'); break;
      case 'volley': [0, 0.045, 0.09].forEach((d, i) => { this.twang(t + d, 0.14, 1 + i * 0.06); this.noise(t + d, 0.12, 5000, 0.16, 'highpass'); }); break;
      case 'pierce': this.twang(t, 0.22, 0.85); this.noise(t, 0.2, 4200, 0.25, 'highpass'); this.tone('sine', 2100, 1500, t + 0.03, 0.3, 0.08); break;
      case 'arrowRain':
        this.twang(t, 0.18, 0.9);
        for (let i = 0; i < 6; i++) this.tone('sine', 2600 - i * 60, 900, t + 0.35 + i * 0.07, 0.35, 0.045);
        for (let i = 0; i < 5; i++) this.noise(t + 0.75 + i * 0.07, 0.08, 1600, 0.2);
        break;
      case 'backstep': this.sweep(t, 0.22, 600, 3200, 0.35); break;

      /* ---- 劍俠 ---- */
      case 'sword': this.noise(t, 0.09, 5200, 0.32, 'highpass'); this.tone('sine', 2600, 2350, t + 0.02, 0.18, 0.06); break;
      case 'swordQi': this.sweep(t, 0.35, 900, 5200, 0.4); this.tone('sawtooth', 380, 1500, t, 0.3, 0.06); this.tone('sine', 1760, 2640, t + 0.08, 0.35, 0.07); break;
      case 'swiftStep': this.sweep(t, 0.16, 1200, 4800, 0.3); this.tone('sine', 1200, 2400, t, 0.12, 0.05); break;
      case 'swordRain': for (let i = 0; i < 7; i++) { this.noise(t + i * 0.06, 0.07, 5600, 0.2, 'highpass'); this.tone('sine', 2400 + (i % 3) * 300, 2100, t + i * 0.06, 0.16, 0.035); } break;
      case 'intent': [0, 5, 7, 12].forEach((n, i) => this.tone('sine', midi(74 + n), midi(74 + n), t + i * 0.05, 0.6, 0.09)); this.sweep(t, 0.6, 500, 3000, 0.18); break;

      /* ---- 訓獸師 ---- */
      case 'whip': this.noise(t, 0.035, 6000, 0.55, 'highpass'); this.tone('square', 1800, 900, t, 0.03, 0.1); this.noise(t + 0.06, 0.05, 2400, 0.2); break;
      case 'howl': [0, 0.12, 0.2].forEach((d, i) => this.glide('triangle', 330 + i * 40, 560 + i * 50, 420, t + d, 0.7, 0.07)); break;
      case 'screech': this.glide('sawtooth', 1600, 2700, 1300, t, 0.45, 0.06); this.noise(t, 0.3, 3200, 0.15, 'bandpass'); this.sweep(t + 0.1, 0.3, 400, 1800, 0.25); break;
      case 'growl': this.tone('sawtooth', 85, 70, t, 0.6, 0.18); this.noise(t, 0.55, 350, 0.5); this.tone('square', 130, 100, t, 0.45, 0.05); break;
      case 'wildRoar': this.tone('sawtooth', 120, 80, t, 0.7, 0.2); this.noise(t, 0.6, 700, 0.45); this.glide('triangle', 300, 520, 380, t + 0.1, 0.6, 0.06); break;

      /* ---- 事件 ---- */
      case 'bossRoar':
        this.tone('sawtooth', 78, 52, t, 1.1, 0.24);
        this.tone('square', 117, 82, t, 0.95, 0.1);
        this.tone('sine', 48, 36, t, 1.2, 0.35);
        this.noise(t, 1.0, 520, 0.55);
        this.noise(t + 0.05, 0.5, 2200, 0.12, 'bandpass');
        break;
      case 'impact': this.boom(t, 0.55, 0.7); this.noise(t, 0.25, 1600, 0.25); break;
      case 'death': [7, 3, 0, -5].forEach((n, i) => this.tone('triangle', midi(64 + n), midi(64 + n) * 0.98, t + i * 0.16, 0.4, 0.18)); this.boom(t, 0.8, 0.3); break;
      case 'rare': [0, 4, 7, 11, 14].forEach((n, i) => this.tone('sine', midi(79 + n), midi(79 + n), t + i * 0.05, 0.35, 0.09)); break;
      case 'mythic':
        [0, 4, 7, 12, 16, 19].forEach((n, i) => this.tone('triangle', midi(76 + n), midi(76 + n), t + i * 0.06, 0.5, 0.11));
        this.tone('sine', midi(100), midi(100), t + 0.36, 0.8, 0.06);
        this.sweep(t, 0.5, 2000, 8000, 0.12);
        break;
    }
  }

  private tone(type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number, dest?: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0 * this.pm, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * this.pm), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.shotDest ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** 頻率先升後降（動物叫聲）：f0 → f1（前 40%）→ f2 */
  private glide(type: OscillatorType, f0: number, f1: number, f2: number, t: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0 * this.pm, t);
    o.frequency.linearRampToValueAtTime(f1 * this.pm, t + dur * 0.4);
    o.frequency.linearRampToValueAtTime(f2 * this.pm, t + dur);
    lfo.frequency.value = 7;
    lg.gain.value = f1 * 0.025;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.shotDest ?? this.sfxBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.02);
    lfo.stop(t + dur + 0.02);
  }

  /** 弓弦：短促的撥弦（三角波快速下滑）＋一點弦的金屬味 */
  private twang(t: number, vol: number, k = 1) {
    this.tone('triangle', 520 * k, 210 * k, t, 0.12, vol);
    this.tone('sine', 1040 * k, 880 * k, t, 0.07, vol * 0.35);
  }

  /** 低頻重擊 */
  private boom(t: number, dur: number, vol: number) {
    this.tone('sine', 95, 32, t, dur, vol);
  }

  /** 風切聲：帶通濾波的噪音，中心頻率從 f0 掃到 f1 */
  private sweep(t: number, dur: number, f0: number, f1: number, vol: number) {
    const ctx = this.ctx!;
    const src = this.noiseSrc(t, dur);
    if (!src) return;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.5;
    f.frequency.setValueAtTime(f0 * this.pm, t);
    f.frequency.exponentialRampToValueAtTime(f1 * this.pm, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.shotDest ?? this.sfxBus);
  }

  private noiseSrc(t: number, dur: number): AudioBufferSourceNode | null {
    const ctx = this.ctx!;
    if (!this.noiseBuf) return null;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const off = Math.random() * Math.max(0, this.noiseBuf.duration - dur - 0.05);
    src.start(t, off, dur + 0.02);
    return src;
  }

  private noise(t: number, dur: number, cutoff: number, vol: number, type: BiquadFilterType = 'lowpass') {
    const ctx = this.ctx!;
    const src = this.noiseSrc(t, dur);
    if (!src) return;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = cutoff * this.pm;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.shotDest ?? this.sfxBus);
  }

  /**
   * 除錯：把一串音效離線輸出成 WAV（試聽用，?debug 下 `await __renderSfx(['arrow','sword'])`）。
   * 暫時把 ctx 換成 OfflineAudioContext，輸出完換回來。
   */
  async renderSfx(ids: SfxId[], gap = 1.0, ambience: AmbienceId = 'none', ambSecs = 0): Promise<ArrayBuffer> {
    const sr = 44100;
    const dur = ids.length * gap + 1 + ambSecs;
    const off = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
    const save = { ctx: this.ctx, bus: this.sfxBus, nb: this.noiseBuf };
    const bus = off.createGain();
    bus.gain.value = 0.55;
    const lim = off.createDynamicsCompressor();
    lim.threshold.value = -12;
    lim.ratio.value = 8;
    bus.connect(lim).connect(off.destination);
    const nb = off.createBuffer(1, sr * 2, sr);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = off as unknown as AudioContext;
    this.sfxBus = bus;
    this.noiseBuf = nb;
    try {
      ids.forEach((id, i) => {
        this.pm = 1 + (Math.random() - 0.5) * (JITTER[id] ?? 0);
        this.emit(id, 0.1 + i * gap);
      });
      if (ambience !== 'none' && ambSecs > 0) {
        const ag = off.createGain();
        ag.gain.value = 0.5;
        ag.connect(lim);
        const amb = new Ambience(off as unknown as AudioContext, ag);
        amb.set(ambience);
        // 離線時沒有計時器：先把點綴音排好
        const t0 = ids.length * gap + 0.5;
        for (let t = 0; t < ambSecs; t += 0.1) amb.update(t0 + t);
      }
    } finally {
      this.pm = 1;
      this.ctx = save.ctx;
      this.sfxBus = save.bus;
      this.noiseBuf = save.nb;
    }
    return toWav(await off.startRendering());
  }

  /* ---------------- 音樂排程 ---------------- */

  private startSequencer() {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running' || !this.music) return;
      this.music.intensity = this.bossIntensity;
      this.music.scheduleUntil(ctx.currentTime + 0.5);
      this.ambience?.update(ctx.currentTime);
    }, 100);
  }
}
