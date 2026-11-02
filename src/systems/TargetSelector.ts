import * as THREE from 'three';
import type { Enemy } from '@/entities/Enemy';
import type { EnemyManager } from './EnemyManager';

/**
 * 目標鎖定：普攻、技能、AUTO、自動反擊共用。
 * 規則：目前目標還活著且在 1.25 倍射程內就保持鎖定；否則改鎖最近的敵人。
 * 鎖定中的敵人腳下顯示紅色圈。
 */
export class TargetSelector {
  current: Enemy | null = null;
  private ring: THREE.Mesh;
  private t = 0;

  constructor(scene: THREE.Scene, private enemies: EnemyManager) {
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.95, 32),
      new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.05;
    this.ring.visible = false;
    scene.add(this.ring);
  }

  /** 依射程更新並回傳目標（可能為 null） */
  acquire(x: number, z: number, range: number): Enemy | null {
    const c = this.current;
    if (c && c.alive && Math.hypot(c.pos.x - x, c.pos.z - z) - c.radius <= range * 1.25) return c;
    this.current = this.enemies.nearest(x, z, range);
    return this.current;
  }

  clear() {
    this.current = null;
  }

  update(dt: number) {
    this.t += dt;
    const c = this.current;
    if (c && !c.alive) this.current = null;
    if (!this.current) {
      this.ring.visible = false;
      return;
    }
    this.ring.visible = true;
    this.ring.position.set(this.current.pos.x, this.current.groundY + 0.05, this.current.pos.z);
    this.ring.scale.setScalar(this.current.radius * 1.4 * (1 + Math.sin(this.t * 6) * 0.06));
    this.ring.rotation.z += dt;
  }
}
