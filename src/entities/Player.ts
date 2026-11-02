import * as THREE from 'three';
import type { Stats } from '@/data/types';
import { statsForLevel } from '@/data/player';
import type { CollisionWorld } from '@/world/Collision';
import { mat } from '@/world/Props';

/**
 * 玩家角色（小法師）
 * - 模型：灰盒低多邊形（帽子＋法袍＋法杖），第 8 週替換成 glTF。
 * - 只負責移動、朝向、動畫；戰鬥由 CombatSystem（第 2 週）處理。
 */
export class Player {
  readonly object = new THREE.Group();
  readonly radius = 0.55;
  readonly pos = { x: 0, z: 0 };
  facing = Math.PI; // 弧度，0 = 朝 +z（南）
  stats: Stats = statsForLevel(1);
  hp = 0;
  mp = 0;
  /** 0~1，目前移動強度（給動畫用） */
  private moveAmount = 0;
  private bobT = 0;
  private body: THREE.Group;
  private staffTip: THREE.Mesh;
  /** 施法動畫剩餘時間 */
  private castT = 0;
  /** 鎖定方向（施法時強制面向目標），null = 跟移動方向 */
  private lockFacing: number | null = null;
  private lockTimer = 0;

  constructor() {
    this.body = new THREE.Group();
    this.object.add(this.body);

    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 7), mat(0x4b3a8c));
    robe.position.y = 0.6;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), mat(0xf3d2b5));
    head.position.y = 1.35;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 10), mat(0x2d2560));
    brim.position.y = 1.55;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.9, 8), mat(0x2d2560));
    hat.position.set(0, 2.0, -0.05);
    hat.rotation.x = -0.25;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.4, 0.1, 8), mat(0xe8b84a));
    band.position.y = 1.63;
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 5), mat(0x7a5232));
    staff.position.set(0.48, 0.9, 0.1);
    this.staffTip = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      new THREE.MeshLambertMaterial({ color: 0x8fe8ff, emissive: 0x3ab0e0 }),
    );
    this.staffTip.position.set(0.48, 1.75, 0.1);

    for (const m of [robe, head, brim, hat, band, staff, this.staffTip]) {
      m.castShadow = true;
      this.body.add(m);
    }
  }

  setLevel(level: number) {
    this.stats = statsForLevel(level);
    this.hp = Math.min(this.hp, this.stats.maxHp);
    this.mp = Math.min(this.mp, this.stats.maxMp);
  }

  teleport(x: number, z: number) {
    this.pos.x = x;
    this.pos.z = z;
    this.object.position.set(x, 0, z);
  }

  /** 施法：面向指定方向一小段時間並播放揮杖動畫 */
  cast(dirX: number, dirZ: number) {
    this.lockFacing = Math.atan2(dirX, dirZ);
    this.lockTimer = 0.35;
    this.castT = 0.22;
  }

  /** 法杖頂端的世界座標（投射物出生點） */
  staffTipWorld(out: THREE.Vector3): THREE.Vector3 {
    return this.staffTip.getWorldPosition(out);
  }

  /** move：世界方向向量，長度 0~1 */
  update(dt: number, move: { x: number; z: number }, collision: CollisionWorld, pushOut?: (pos: { x: number; z: number }, r: number) => void) {
    const len = Math.hypot(move.x, move.z);
    if (len > 0.001) {
      const speed = this.stats.moveSpeed * len;
      this.pos.x += move.x * speed * dt;
      this.pos.z += move.z * speed * dt;
      if (this.lockTimer <= 0) {
        const target = Math.atan2(move.x, move.z);
        this.facing = lerpAngle(this.facing, target, 1 - Math.exp(-dt * 14));
      }
    }
    if (this.lockTimer > 0 && this.lockFacing !== null) {
      this.lockTimer -= dt;
      this.facing = lerpAngle(this.facing, this.lockFacing, 1 - Math.exp(-dt * 30));
    }
    pushOut?.(this.pos, this.radius); // 敵人等動態障礙
    collision.resolve(this.pos, this.radius);

    this.moveAmount += ((len > 0.001 ? 1 : 0) - this.moveAmount) * Math.min(1, dt * 10);
    this.bobT += dt * (4 + this.moveAmount * 8);

    this.object.position.set(this.pos.x, 0, this.pos.z);
    this.object.rotation.y = this.facing;
    // 走路：上下彈跳＋前傾；待機：呼吸
    this.body.position.y = Math.abs(Math.sin(this.bobT)) * 0.12 * this.moveAmount + Math.sin(this.bobT * 0.5) * 0.02;
    this.body.rotation.x = 0.12 * this.moveAmount;
    this.staffTip.rotation.y += dt * 3;
    // 施法：身體前傾 + 法杖頂端放大發光
    if (this.castT > 0) this.castT = Math.max(0, this.castT - dt);
    const c = this.castT / 0.22;
    this.body.rotation.x += 0.25 * Math.sin(c * Math.PI);
    this.staffTip.scale.setScalar(1 + c * 1.2);
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
