import * as THREE from 'three';
import { bus } from '@/core/EventBus';
import type { Settings } from '@/core/GameState';

/**
 * 畫質設定與自動調整
 * ------------------------------------------------------------
 *  高：解析度 ×2、陰影 2048
 *  中：解析度 ×1.5、陰影 1024
 *  低：解析度 ×1、關閉陰影
 *  自動：從「高」（或低階手機從「中」）開始，連續 4 秒平均低於 40 FPS 就降一級；只降不升，避免畫質來回跳。
 * 網址加 ?quality=high|medium|low 可強制指定（測試用）。
 */
export type QualityLevel = 'high' | 'medium' | 'low';
export type QualitySetting = QualityLevel | 'auto';

const LEVELS: Record<QualityLevel, { pixelRatio: number; shadows: boolean; shadowSize: number; label: string }> = {
  high: { pixelRatio: 2, shadows: true, shadowSize: 2048, label: '高' },
  medium: { pixelRatio: 1.5, shadows: true, shadowSize: 1024, label: '中' },
  low: { pixelRatio: 1, shadows: false, shadowSize: 512, label: '低' },
};
const ORDER: QualityLevel[] = ['high', 'medium', 'low'];
const SAMPLE_SECONDS = 4;
const MIN_FPS = 40;

export class Quality {
  current: QualityLevel = 'high';
  private frames = 0;
  private time = 0;
  /** 切換後先等一下再量，避免切換瞬間的卡頓被算進去 */
  private grace = 3;
  private forced: QualityLevel | null;

  constructor(private renderer: THREE.WebGLRenderer, private sun: THREE.DirectionalLight, private settings: Settings, private onResize: () => void) {
    const q = new URLSearchParams(location.search).get('quality');
    this.forced = q === 'high' || q === 'medium' || q === 'low' ? q : null;
    this.apply(this.initialLevel());
  }

  get label(): string {
    return LEVELS[this.current].label;
  }

  private initialLevel(): QualityLevel {
    if (this.forced) return this.forced;
    const s = this.settings.quality;
    if (s !== 'auto') return s;
    // 低階裝置（核心數少）從「中」開始
    const cores = navigator.hardwareConcurrency ?? 8;
    return cores <= 4 ? 'medium' : 'high';
  }

  /** 設定頁切換 */
  set(setting: QualitySetting) {
    this.settings.quality = setting;
    this.apply(setting === 'auto' ? this.initialLevel() : setting);
  }

  apply(level: QualityLevel) {
    this.current = level;
    const cfg = LEVELS[level];
    this.renderer.setPixelRatio(Math.min(cfg.pixelRatio, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = cfg.shadows;
    this.sun.castShadow = cfg.shadows;
    if (this.sun.shadow.mapSize.x !== cfg.shadowSize) {
      this.sun.shadow.mapSize.set(cfg.shadowSize, cfg.shadowSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.grace = 3;
    this.frames = 0;
    this.time = 0;
    this.onResize();
  }

  /** 每個真實畫面呼叫一次（不是 tick），realDt 是實際經過時間 */
  sample(realDt: number) {
    if (this.forced || this.settings.quality !== 'auto') return;
    if (document.visibilityState === 'hidden') return;
    if (this.grace > 0) {
      this.grace -= realDt;
      return;
    }
    this.frames++;
    this.time += realDt;
    if (this.time < SAMPLE_SECONDS) return;
    const fps = this.frames / this.time;
    this.frames = 0;
    this.time = 0;
    const idx = ORDER.indexOf(this.current);
    if (fps < MIN_FPS && idx < ORDER.length - 1) {
      this.apply(ORDER[idx + 1]);
      bus.emit('toast', { text: `畫面較不順，已自動調整畫質為「${LEVELS[this.current].label}」（可在設定更改）`, duration: 3 });
    }
  }
}
