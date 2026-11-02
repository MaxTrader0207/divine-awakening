import type { ZoneDef } from '@/data/types';
import { PROP_DEFAULTS } from '@/world/Props';

/**
 * 小地圖：整張區域縮放進方框。
 * 靜態圖層在換區域時畫一次（離屏 canvas），每幀只疊玩家箭頭。
 */
export class Minimap {
  readonly el: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private staticLayer = document.createElement('canvas');
  private def: ZoneDef | null = null;
  private size = 0;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('canvas');
    this.el.className = 'minimap';
    parent.appendChild(this.el);
    this.ctx = this.el.getContext('2d')!;
  }

  setZone(def: ZoneDef) {
    this.def = def;
    this.redrawStatic();
  }

  private redrawStatic() {
    const def = this.def;
    if (!def) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const css = this.el.clientWidth || 96;
    this.size = Math.round(css * dpr);
    this.el.width = this.el.height = this.size;
    const c = this.staticLayer;
    c.width = c.height = this.size;
    const g = c.getContext('2d')!;
    const s = this.size / Math.max(def.size.w, def.size.d);
    const ox = this.size / 2;
    const oz = this.size / 2;
    const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

    g.fillStyle = hex(def.fogColor);
    g.fillRect(0, 0, this.size, this.size);
    g.fillStyle = hex(def.groundColor);
    g.fillRect(ox - (def.size.w / 2) * s, oz - (def.size.d / 2) * s, def.size.w * s, def.size.d * s);
    for (const p of def.patches) {
      g.fillStyle = hex(p.color);
      g.fillRect(ox + (p.x - p.w / 2) * s, oz + (p.z - p.d / 2) * s, p.w * s, p.d * s);
    }
    for (const p of def.props) {
      const pd = PROP_DEFAULTS[p.kind];
      const w = (p.w ?? pd.w) * s;
      const d = (p.d ?? pd.d) * s;
      g.fillStyle = p.kind === 'house' ? '#e9e2d4' : p.kind === 'tree' || p.kind === 'palm' || p.kind === 'bush' ? '#3f8a45' : '#9a8f7a';
      if (pd.round) {
        g.beginPath();
        g.arc(ox + p.x * s, oz + p.z * s, Math.max(1.5, w / 2), 0, Math.PI * 2);
        g.fill();
      } else g.fillRect(ox + p.x * s - w / 2, oz + p.z * s - d / 2, w, d);
    }
    for (const p of def.portals) {
      g.fillStyle = '#6fe3ff';
      g.beginPath();
      g.arc(ox + p.x * s, oz + p.z * s, Math.max(3, p.radius * s), 0, Math.PI * 2);
      g.fill();
    }
  }

  draw(px: number, pz: number, facing: number) {
    const def = this.def;
    if (!def || !this.size) return;
    const ctx = this.ctx;
    ctx.drawImage(this.staticLayer, 0, 0);
    const s = this.size / Math.max(def.size.w, def.size.d);
    const x = this.size / 2 + px * s;
    const y = this.size / 2 + pz * s;
    const r = this.size * 0.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-facing + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1b2433';
    ctx.lineWidth = r * 0.35;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.4);
    ctx.lineTo(r, r);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}
