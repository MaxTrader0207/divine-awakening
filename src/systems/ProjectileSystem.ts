import * as THREE from 'three';
import { bus } from '@/core/EventBus';
import type { Enemy } from '@/entities/Enemy';
import type { EnemyManager } from './EnemyManager';
import { calcDamage, type AttackerStats } from './Combat';

/**
 * 投射物系統（物件池，不在戰鬥中 new / dispose，避免手機 GC 卡頓）
 * - 有目標：追蹤目標（不會打歪，手機上手感較好）
 * - 無目標：沿面向直線飛，碰到任何敵人就命中
 * 命中時呼叫 calcDamage → Enemy.takeDamage → 發出 combat:hit / enemy:killed。
 */
export interface FireOptions {
  from: THREE.Vector3;
  dirX: number;
  dirZ: number;
  target: Enemy | null;
  attacker: AttackerStats;
  power: number;
  speed?: number;
  range?: number;
  color?: number;
  size?: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  glow: THREE.Sprite;
  active: boolean;
  vel: THREE.Vector3;
  target: Enemy | null;
  attacker: AttackerStats;
  power: number;
  speed: number;
  life: number;
}

interface Spark {
  mesh: THREE.Mesh;
  active: boolean;
  t: number;
}

const POOL = 40;
const SPARK_POOL = 24;
const SPARK_TIME = 0.28;
const HIT_PAD = 0.35;

export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private sparks: Spark[] = [];
  private tmp = new THREE.Vector3();

  constructor(scene: THREE.Scene, private enemies: EnemyManager) {
    const geo = new THREE.IcosahedronGeometry(0.22, 0);
    const glowTex = makeGlowTexture();
    for (let i = 0; i < POOL; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd36b }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd36b, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.setScalar(1.3);
      mesh.add(glow);
      mesh.visible = false;
      scene.add(mesh);
      this.projectiles.push({ mesh, glow, active: false, vel: new THREE.Vector3(), target: null, attacker: { atk: 0, pen: 0, critRate: 0, critDmg: 1 }, power: 1, speed: 18, life: 0 });
    }
    const ringGeo = new THREE.RingGeometry(0.2, 0.42, 20);
    for (let i = 0; i < SPARK_POOL; i++) {
      const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      mesh.visible = false;
      scene.add(mesh);
      this.sparks.push({ mesh, active: false, t: 0 });
    }
  }

  fire(o: FireOptions): boolean {
    const p = this.projectiles.find((q) => !q.active);
    if (!p) return false;
    const speed = o.speed ?? 18;
    p.active = true;
    p.target = o.target;
    p.attacker = { ...o.attacker };
    p.power = o.power;
    p.speed = speed;
    p.life = (o.range ?? 10) / speed + 0.25;
    p.mesh.position.copy(o.from);
    p.mesh.scale.setScalar(o.size ?? 1);
    (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(o.color ?? 0xffd36b);
    p.glow.material.color.setHex(o.color ?? 0xffd36b);
    p.vel.set(o.dirX, 0, o.dirZ).normalize().multiplyScalar(speed);
    p.mesh.visible = true;
    return true;
  }

  /** 切換區域時清掉所有飛行中的投射物 */
  clear() {
    for (const p of this.projectiles) this.kill(p);
    for (const s of this.sparks) {
      s.active = false;
      s.mesh.visible = false;
    }
  }

  update(dt: number, camera: THREE.Camera) {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.kill(p);
        continue;
      }
      // 追蹤
      if (p.target && p.target.alive) {
        this.tmp.set(p.target.pos.x, p.target.aimY, p.target.pos.z).sub(p.mesh.position);
        p.vel.copy(this.tmp.normalize().multiplyScalar(p.speed));
      } else p.target = null;

      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 12;
      p.mesh.rotation.y += dt * 9;

      const hit = this.findHit(p);
      if (hit) this.resolveHit(p, hit);
    }

    for (const s of this.sparks) {
      if (!s.active) continue;
      s.t += dt;
      const k = s.t / SPARK_TIME;
      if (k >= 1) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      s.mesh.scale.setScalar(1 + k * 2.2);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      s.mesh.quaternion.copy(camera.quaternion);
    }
  }

  private findHit(p: Projectile): Enemy | null {
    const pos = p.mesh.position;
    // 追蹤中的目標優先
    const candidates = p.target ? [p.target] : this.enemies.enemies;
    for (const e of candidates) {
      if (!e.alive) continue;
      if (Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z) < e.radius + HIT_PAD) return e;
    }
    return null;
  }

  private resolveHit(p: Projectile, e: Enemy) {
    const res = calcDamage(p.attacker, p.power, e.defense);
    const killed = e.takeDamage(res.amount);
    bus.emit('combat:hit', { x: e.pos.x, y: e.height + 0.2, z: e.pos.z, amount: res.amount, crit: res.crit, targetIsPlayer: false });
    if (killed) bus.emit('enemy:killed', { enemyId: e.def.id, x: e.pos.x, z: e.pos.z });
    this.spawnSpark(p.mesh.position, (p.mesh.material as THREE.MeshBasicMaterial).color.getHex(), res.crit);
    this.kill(p);
  }

  private spawnSpark(at: THREE.Vector3, color: number, big: boolean) {
    const s = this.sparks.find((q) => !q.active);
    if (!s) return;
    s.active = true;
    s.t = 0;
    s.mesh.position.copy(at);
    s.mesh.visible = true;
    (s.mesh.material as THREE.MeshBasicMaterial).color.setHex(big ? 0xfff2a0 : color);
    s.mesh.scale.setScalar(big ? 1.6 : 1);
  }

  private kill(p: Projectile) {
    p.active = false;
    p.target = null;
    p.mesh.visible = false;
  }

  get activeCount() {
    return this.projectiles.filter((p) => p.active).length;
  }
}

function makeGlowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
