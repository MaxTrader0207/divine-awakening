import * as THREE from 'three';
import type { ZoneDef } from '@/data/types';
import { ENEMIES } from '@/data/enemies';
import { Enemy } from '@/entities/Enemy';
import { updateEnemyAI, type AiContext } from './EnemyAI';

/**
 * EnemyManager：依區域的 spawns 生成敵人、每幀更新 AI 與動畫、提供查詢。
 * 切換區域時 clear() 會釋放所有敵人。
 */
const BLOB_MAX = 64;

/** 中間深、邊緣漸淡的圓形影子貼圖 */
function blobTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class EnemyManager {
  enemies: Enemy[] = [];
  /** 地面高度查詢（高台），由 Game 指向目前 Zone */
  heightAt: (x: number, z: number) => number = () => 0;

  /** 小怪的圓形影子（v1.84）：所有小怪共用一個 InstancedMesh，1 個 draw call */
  private blobs: THREE.InstancedMesh;
  private blobM = new THREE.Matrix4();

  constructor(private scene: THREE.Scene) {
    const tex = blobTexture();
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false });
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.blobs = new THREE.InstancedMesh(geo, mat, BLOB_MAX);
    this.blobs.count = 0;
    this.blobs.frustumCulled = false;
    this.blobs.renderOrder = -1;
    scene.add(this.blobs);
  }

  /** 每幀把活著的小怪影子放到地面上（飛得越高影子越小越淡——淡用縮小近似） */
  private updateBlobs() {
    let n = 0;
    for (const e of this.enemies) {
      if (n >= BLOB_MAX) break;
      if (e.def.boss || e.state === 'dead' || !e.object.visible) continue;
      const r = (e.radius * 2.9 * e.blobFade) / (1 + e.blobLift * 0.35);
      this.blobM.makeScale(r, 1, r).setPosition(e.pos.x, e.groundY + 0.035, e.pos.z);
      this.blobs.setMatrixAt(n++, this.blobM);
    }
    this.blobs.count = n;
    this.blobs.instanceMatrix.needsUpdate = true;
  }

  /** 特寫畫面暫時隱藏敵人時，影子也一起藏 */
  setBlobsVisible(v: boolean) {
    this.blobs.visible = v;
  }

  /**
   * 依區域生成敵人。mod（v1.77 神話難度）：每隻生成後套用難度倍率；回傳覆寫的等級與防禦（標籤要在建立時就知道）。
   */
  spawnForZone(def: ZoneDef, mod?: (ed: import('@/data/types').EnemyDef) => { level: number; defense: number; apply: (e: Enemy) => void } | null) {
    this.clear();
    for (const s of def.spawns ?? []) {
      const ed = ENEMIES[s.enemy];
      if (!ed) {
        console.warn(`[EnemyManager] 找不到敵人資料：${s.enemy}`);
        continue;
      }
      const n = s.count ?? 1;
      for (let i = 0; i < n; i++) {
        // 初次生成時均勻散開（黃金角），之後重生才隨機
        const r = n > 1 ? (s.spread ?? 0) * Math.sqrt((i + 0.5) / n) : 0;
        const a = i * 2.39996;
        const m = mod?.(ed) ?? null;
        const e = new Enemy(ed, { ...s, x: s.x + Math.cos(a) * r, z: s.z + Math.sin(a) * r, count: 1, spread: s.spread ?? 0, ...(m ? { level: m.level, def: m.defense } : {}) });
        m?.apply(e);
        e.groundY = this.heightAt(e.pos.x, e.pos.z);
        this.enemies.push(e);
        this.scene.add(e.object);
      }
    }
  }

  /**
   * 生成一隻不會重生的敵人（無盡試煉塔，v1.70）：生命、攻擊倍率與防禦另外指定。
   */
  spawnOne(id: string, x: number, z: number, opts: { hpMul?: number; atkMul?: number; def?: number; tag?: string } = {}): Enemy | null {
    const ed = ENEMIES[id];
    if (!ed) return null;
    const e = new Enemy(ed, { enemy: id, x, z, count: 1, spread: 0, respawn: 1e9, def: opts.def, tag: opts.tag });
    e.maxHp = ed.stats.maxHp * (opts.hpMul ?? 1);
    e.hp = e.maxHp;
    e.atkMul = opts.atkMul ?? 1;
    e.groundY = this.heightAt(e.pos.x, e.pos.z);
    this.enemies.push(e);
    this.scene.add(e.object);
    return e;
  }

  clear() {
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
  }

  update(dt: number, camera: THREE.Camera, ai?: AiContext) {
    for (const e of this.enemies) {
      if (ai) updateEnemyAI(e, dt, ai);
      if (e.alive) e.groundY += (this.heightAt(e.pos.x, e.pos.z) - e.groundY) * Math.min(1, dt * 12);
      e.update(dt, camera);
    }
    this.separate();
    this.updateBlobs();
  }

  /** 敵人之間互相推開，避免疊在一起 */
  private separate() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const min = (a.radius + b.radius) * 0.9;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          // 首領不被小怪推動
          const wa = a.def.boss ? 0 : b.def.boss ? 2 : 1;
          const wb = b.def.boss ? 0 : a.def.boss ? 2 : 1;
          a.pos.x -= (dx / d) * push * wa;
          a.pos.z -= (dz / d) * push * wa;
          b.pos.x += (dx / d) * push * wb;
          b.pos.z += (dz / d) * push * wb;
        }
      }
    }
  }

  /** 範圍內最近的活著的敵人（排除脫戰回家中的；includeDummies = false 時排除木樁，給 AUTO 用） */
  nearest(x: number, z: number, range: number, includeDummies = true): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range;
    for (const e of this.enemies) {
      if (!e.alive || e.ai === 'return') continue;
      if (!includeDummies && e.def.aggro === 'none') continue;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z) - e.radius;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** 戰鬥中的首領（HUD 上方血條） */
  engagedBoss(): Enemy | null {
    return this.enemies.find((e) => e.def.boss && e.engaged) ?? null;
  }

  /** 把角色推出敵人身體（敵人視為圓形障礙） */
  pushOut(pos: { x: number; z: number }, radius: number) {
    for (const e of this.enemies) {
      if (!e.alive || e.def.shape === 'bat') continue;
      const dx = pos.x - e.pos.x;
      const dz = pos.z - e.pos.z;
      const min = e.radius + radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.0001;
        pos.x = e.pos.x + (dx / d) * min;
        pos.z = e.pos.z + (dz / d) * min;
      }
    }
  }
}
