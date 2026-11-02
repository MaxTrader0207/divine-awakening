import * as THREE from 'three';
import type { Stats } from '@/data/types';
import { statsForLevel } from '@/data/player';
import type { CollisionWorld } from '@/world/Collision';
import { mat } from '@/world/Props';
import { Assets } from '@/assets/Assets';
import { CharacterRig } from './CharacterRig';
import { CLASSES, type HeroAnimSet } from '@/data/classes';

export type { HeroAnimSet } from '@/data/classes';
/** 相容舊程式 */
export const MAGE_ANIMS: HeroAnimSet = CLASSES.mage.anims;

/** 角色目標身高（公尺），模型依原始高度自動縮放 */
const HERO_HEIGHT = 2.9;

/**
 * 玩家角色
 * - 有 KayKit 模型時用骨架動畫（idle / 跑 / 施法 / 受擊 / 倒下 / 閃避 / 歡呼）；
 *   模型沒載入時退回程式產生的低多邊形法師（帽子＋法袍＋法杖）。
 * - 只負責移動、朝向、動畫；戰鬥由各 system 處理。
 */
export class Player {
  readonly object = new THREE.Group();
  readonly radius = 0.55;
  readonly pos = { x: 0, z: 0 };
  facing = Math.PI; // 弧度，0 = 朝 +z（南）
  stats: Stats = statsForLevel(1);
  hp = 0;
  mp = 0;
  /** 地面高度（高台、石階），由 Game 依 Zone.heightAt 更新 */
  groundY = 0;
  /** 無敵剩餘秒數（閃現、復活） */
  invulnerable = 0;
  /** 距離上次受傷的秒數（脫戰回血用） */
  sinceHurt = 99;
  private hurtT = 0;
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
  /** 骨架動畫（有模型時） */
  rig: CharacterRig | null = null;
  private anims: HeroAnimSet;

  constructor(anims: HeroAnimSet = MAGE_ANIMS) {
    this.anims = anims;
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
    this.useModel();
  }

  /** 換成 glTF 模型（成功回傳 true） */
  private useModel(): boolean {
    const inst = Assets.cloneRig(this.anims.model);
    if (!inst) return false;
    this.body.clear();
    const s = HERO_HEIGHT / Assets.height(this.anims.model);
    inst.root.scale.setScalar(s);
    this.body.add(inst.root);
    // 法杖頂端改成隱形的定位點（投射物出生點、施法光效）
    this.staffTip.visible = false;
    this.staffTip.position.set(0.45, 1.6, 0.35);
    this.body.add(this.staffTip);
    this.rig = new CharacterRig(inst);
    this.rig.setLoop(this.anims.idle, 0);
    return true;
  }

  /** 大招施法（烈焰爆發）、閃避、歡呼：只有模型時有動作 */
  castBig() {
    this.rig?.playOnce(this.anims.castBig, { timeScale: 1.6 });
  }

  dodge() {
    this.rig?.playOnce(this.anims.dodge, { timeScale: 1.4 });
  }

  cheer() {
    this.rig?.playOnce(this.anims.cheer, { priority: false });
  }

  get alive() {
    return this.hp > 0;
  }

  /** 受到傷害；回傳實際扣血量（無敵 / 已死亡回傳 0） */
  takeDamage(amount: number): number {
    if (!this.alive || this.invulnerable > 0) return 0;
    this.hp = Math.max(0, this.hp - amount);
    this.sinceHurt = 0;
    this.hurtT = 0.3;
    if (this.hp <= 0) this.rig?.die(this.anims.death);
    else if (this.rig && !this.rig.busy) this.rig.playOnce(this.anims.hit, { priority: false, timeScale: 1.3 });
    return amount;
  }

  /** 復活：滿血滿魔、短暫無敵 */
  revive() {
    this.hp = this.stats.maxHp;
    this.mp = this.stats.maxMp;
    this.invulnerable = 2;
    this.sinceHurt = 99;
    this.object.visible = true;
    this.body.rotation.set(0, 0, 0);
    this.body.position.y = 0;
    this.rig?.revive(this.anims.idle);
  }

  setLevel(level: number) {
    this.stats = statsForLevel(level);
    this.hp = Math.min(this.hp, this.stats.maxHp);
    this.mp = Math.min(this.mp, this.stats.maxMp);
  }

  teleport(x: number, z: number) {
    this.pos.x = x;
    this.pos.z = z;
    this.object.position.set(x, this.groundY, z);
  }

  /** 施法：面向指定方向一小段時間並播放揮杖動畫 */
  cast(dirX: number, dirZ: number) {
    this.lockFacing = Math.atan2(dirX, dirZ);
    this.lockTimer = 0.35;
    this.castT = 0.22;
    this.rig?.playOnce(this.anims.cast, { timeScale: 2.2 });
  }

  /** 法杖頂端的世界座標（投射物出生點） */
  staffTipWorld(out: THREE.Vector3): THREE.Vector3 {
    return this.staffTip.getWorldPosition(out);
  }

  /** move：世界方向向量，長度 0~1 */
  update(dt: number, move: { x: number; z: number }, collision: CollisionWorld, pushOut?: (pos: { x: number; z: number }, r: number) => void) {
    if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.sinceHurt += dt;
    this.rig?.update(dt);
    if (!this.alive) {
      if (this.rig) return; // 模型播死亡動畫
      // 倒地動畫
      this.body.rotation.z += (Math.PI / 2 - this.body.rotation.z) * Math.min(1, dt * 8);
      this.body.position.y = Math.max(-0.3, this.body.position.y - dt);
      return;
    }
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

    this.object.position.set(this.pos.x, this.groundY, this.pos.z);
    this.object.rotation.y = this.facing;
    this.object.visible = this.invulnerable > 0.05 ? Math.floor(this.invulnerable * 12) % 2 === 0 : true;
    if (this.rig) {
      // 有模型：跑步動畫速度跟著移動速度
      if (this.moveAmount > 0.3) this.rig.setLoop(this.anims.run, 0.15, 0.8 + 0.4 * Math.min(1.5, this.stats.moveSpeed / 6.5));
      else this.rig.setLoop(this.anims.idle, 0.2);
      return;
    }
    // 走路：上下彈跳＋前傾；待機：呼吸
    this.body.position.y = Math.abs(Math.sin(this.bobT)) * 0.12 * this.moveAmount + Math.sin(this.bobT * 0.5) * 0.02;
    this.body.rotation.x = 0.12 * this.moveAmount;
    this.staffTip.rotation.y += dt * 3;
    // 施法：身體前傾 + 法杖頂端放大發光
    if (this.castT > 0) this.castT = Math.max(0, this.castT - dt);
    const c = this.castT / 0.22;
    this.body.rotation.x += 0.25 * Math.sin(c * Math.PI);
    this.staffTip.scale.setScalar(1 + c * 1.2);
    // 受傷：左右晃；無敵：閃爍
    if (this.hurtT > 0) this.hurtT = Math.max(0, this.hurtT - dt);
    this.body.rotation.z = Math.sin(this.hurtT * 40) * 0.12 * (this.hurtT / 0.3);
    this.object.visible = this.invulnerable > 0.05 ? Math.floor(this.invulnerable * 12) % 2 === 0 : true;
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
