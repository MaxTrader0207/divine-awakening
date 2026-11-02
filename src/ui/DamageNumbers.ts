import * as THREE from 'three';
import { bus } from '@/core/EventBus';

/**
 * 傷害數字（DOM 物件池）
 * 世界座標每幀投影到螢幕；往上飄、放大後淡出。爆擊為黃色大字。
 * 用 DOM 而非 3D 文字：中文字型清晰、無需產生貼圖，且數量少（< 40）成本低。
 */
interface Num {
  el: HTMLDivElement;
  active: boolean;
  t: number;
  pos: THREE.Vector3;
  driftX: number;
}

const POOL = 40;
const LIFE = 0.9;

export class DamageNumbers {
  private nums: Num[] = [];
  private v = new THREE.Vector3();

  constructor(parent: HTMLElement, private container: HTMLElement) {
    const layer = document.createElement('div');
    layer.className = 'dmg-layer';
    parent.appendChild(layer);
    for (let i = 0; i < POOL; i++) {
      const el = document.createElement('div');
      el.className = 'dmg';
      layer.appendChild(el);
      this.nums.push({ el, active: false, t: 0, pos: new THREE.Vector3(), driftX: 0 });
    }
    bus.on('combat:hit', (h) => this.spawn(h.x, h.y, h.z, h.amount, h.crit, h.targetIsPlayer));
    bus.on('float:text', (f) => this.spawnText(f.x, f.y, f.z, f.text, f.kind));
  }

  spawn(x: number, y: number, z: number, amount: number, crit: boolean, onPlayer: boolean) {
    // 池滿時覆蓋最舊的
    const n = this.nums.find((q) => !q.active) ?? this.nums.reduce((a, b) => (a.t > b.t ? a : b));
    n.active = true;
    n.t = 0;
    n.pos.set(x, y, z);
    n.driftX = (Math.random() - 0.5) * 30;
    n.el.textContent = crit ? `${amount}!` : String(amount);
    n.el.className = `dmg${crit ? ' crit' : ''}${onPlayer ? ' hurt' : ''}`;
    n.el.style.opacity = '1';
  }

  spawnText(x: number, y: number, z: number, text: string, kind: string) {
    const n = this.nums.find((q) => !q.active) ?? this.nums.reduce((a, b) => (a.t > b.t ? a : b));
    n.active = true;
    n.t = 0;
    n.pos.set(x, y, z);
    n.driftX = 0;
    n.el.textContent = text;
    n.el.className = `dmg txt ${kind}`;
    n.el.style.opacity = '1';
  }

  clear() {
    for (const n of this.nums) {
      n.active = false;
      n.el.style.opacity = '0';
    }
  }

  update(dt: number, camera: THREE.Camera) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    for (const n of this.nums) {
      if (!n.active) continue;
      n.t += dt;
      const k = n.t / LIFE;
      if (k >= 1) {
        n.active = false;
        n.el.style.opacity = '0';
        continue;
      }
      this.v.copy(n.pos).project(camera);
      const sx = (this.v.x * 0.5 + 0.5) * w + n.driftX * k;
      const sy = (-this.v.y * 0.5 + 0.5) * h - 46 * easeOut(k);
      const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.7 : 1.3 - Math.min(0.3, (k - 0.12) * 1.2);
      n.el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(${pop})`;
      n.el.style.opacity = String(k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1);
    }
  }
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
