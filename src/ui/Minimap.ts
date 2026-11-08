import type { ZoneDef } from '@/data/types';
import { PROP_DEFAULTS } from '@/world/Props';
import { ENEMIES } from '@/data/enemies';
import { SHOPS } from '@/data/shops';

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
      // 轉 90° 的物件（長椅、柵欄）寬深對調
      const turned = Math.abs(Math.sin(p.rot ?? 0)) > 0.7;
      const w = (turned ? p.d ?? pd.d : p.w ?? pd.w) * s;
      const d = (turned ? p.w ?? pd.w : p.d ?? pd.d) * s;
      const green = ['tree', 'palm', 'bush', 'olive', 'cypress', 'hedge', 'flowers'].includes(p.kind);
      g.fillStyle = p.kind === 'house' || p.kind === 'temple' ? '#e9e2d4' : green ? '#3f8a45' : '#9a8f7a';
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
    // 商店入口（金色圓點）、首領位置（紅色骷髏點）
    const dot = (x: number, z: number, r: number, fill: string, stroke = '#1b2433') => {
      g.fillStyle = fill;
      g.strokeStyle = stroke;
      g.lineWidth = Math.max(1, this.size * 0.012);
      g.beginPath();
      g.arc(ox + x * s, oz + z * s, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    };
    const u = this.size * 0.035;
    // v1.95 商店：白底圓圈＋店的圖示（強化屋 🔨）
    for (const t of def.triggers ?? []) {
      const icon = t.shop ? SHOPS[t.shop].icon : t.tab === 'enhance' ? '🔨' : '';
      if (!icon) {
        dot(t.x, t.z, u, '#f4c64e');
        continue;
      }
      const r = this.size * 0.055;
      dot(t.x, t.z - 1.6, r, 'rgba(255, 248, 230, 0.92)', t.tab === 'enhance' ? '#c38bff' : '#f4c64e');
      g.font = `${Math.round(r * 1.35)}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(icon, ox + t.x * s, oz + (t.z - 1.6) * s + r * 0.08);
    }
    for (const sp of def.spawns ?? []) if (ENEMIES[sp.enemy]?.boss) dot(sp.x, sp.z, u * 1.5, '#e5533d', '#fff2c4');
  }

  /** v1.95 還沒打開的寶箱（金色方塊，會閃），由 Hud 每幀設定 */
  chests: { x: number; z: number }[] = [];

  /** 新手指引目標（金色脈動圈），由 Hud 每幀設定 */
  target: { x: number; z: number } | null = null;
  private t = 0;

  draw(px: number, pz: number, facing: number) {
    const def = this.def;
    if (!def || !this.size) return;
    const ctx = this.ctx;
    ctx.drawImage(this.staticLayer, 0, 0);
    const s = this.size / Math.max(def.size.w, def.size.d);
    this.t += 1 / 60;
    if (this.chests.length) {
      const b = this.size * 0.04;
      const a = 0.7 + Math.sin(this.t * 5) * 0.3;
      ctx.lineWidth = Math.max(1, this.size * 0.012);
      for (const c of this.chests) {
        const cx = this.size / 2 + c.x * s;
        const cy = this.size / 2 + c.z * s;
        ctx.fillStyle = `rgba(255, 196, 64, ${a})`;
        ctx.strokeStyle = '#5a3a10';
        ctx.fillRect(cx - b, cy - b * 0.75, b * 2, b * 1.5);
        ctx.strokeRect(cx - b, cy - b * 0.75, b * 2, b * 1.5);
      }
    }
    if (this.target) {
      const k = (this.t * 0.9) % 1;
      const tx = this.size / 2 + this.target.x * s;
      const ty = this.size / 2 + this.target.z * s;
      ctx.strokeStyle = `rgba(255, 211, 107, ${1 - k})`;
      ctx.lineWidth = this.size * 0.025;
      ctx.beginPath();
      ctx.arc(tx, ty, this.size * (0.04 + k * 0.08), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd36b';
      ctx.beginPath();
      ctx.arc(tx, ty, this.size * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
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
