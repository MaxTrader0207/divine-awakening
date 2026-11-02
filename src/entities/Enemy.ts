import * as THREE from 'three';
import type { EnemyDef, SpawnDef } from '@/data/types';
import { makeLabelSprite } from '@/world/Label';

export type EnemyState = 'alive' | 'dying' | 'dead';

const DYING_TIME = 0.45;

/**
 * 敵人實體
 * - 第 2 週：受擊閃白、晃動、頭頂血條、死亡縮小消失、定時重生。
 * - 第 4 週：AI 狀態機會掛在這裡（EnemyAI 讀寫 pos / facing）。
 * 每隻敵人有自己的材質副本，才能單獨閃白。
 */
export class Enemy {
  readonly object = new THREE.Group();
  readonly def: EnemyDef;
  readonly spawn: SpawnDef;
  readonly pos: { x: number; z: number };
  readonly defense: number;
  readonly displayName: string;
  readonly radius: number;
  /** 頭頂高度（傷害數字、血條位置） */
  readonly height: number;
  hp: number;
  state: EnemyState = 'alive';
  /** 緩速剩餘秒數與倍率（冰霜新星） */
  slowTimer = 0;
  slowMul = 1;

  private body = new THREE.Group();
  private materials: THREE.MeshLambertMaterial[] = [];
  private flash = 0;
  private tinted = false;
  private shake = 0;
  private stateTimer = 0;
  private hpBar: THREE.Group;
  private hpFill: THREE.Mesh;
  private hpBarTimer = 0;

  constructor(def: EnemyDef, spawn: SpawnDef) {
    this.def = def;
    this.spawn = spawn;
    this.pos = { x: spawn.x, z: spawn.z };
    this.defense = spawn.def ?? def.stats.def;
    this.displayName = spawn.tag ? `${def.name}・${spawn.tag}` : def.name;
    this.radius = def.radius * def.scale;
    this.hp = def.stats.maxHp;

    this.height = this.buildBody() * def.scale;
    this.body.scale.setScalar(def.scale);
    this.object.add(this.body);

    // 名稱
    const label = makeLabelSprite(this.displayName, { fontSize: 40, color: '#ffe9c2', bg: 'rgba(27,34,50,0.55)', scale: 0.85 });
    label.position.y = this.height + 0.75;
    this.object.add(label);

    // 血條（永遠面向鏡頭）
    this.hpBar = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.16), new THREE.MeshBasicMaterial({ color: 0x1b2433, depthTest: false, transparent: true, opacity: 0.85 }));
    this.hpFill = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.11), new THREE.MeshBasicMaterial({ color: 0xe5533d, depthTest: false }));
    this.hpFill.position.z = 0.001;
    this.hpFill.geometry.translate(0.72, 0, 0); // 錨點移到左邊，scale.x 即可表示比例
    this.hpFill.position.x = -0.72;
    bg.renderOrder = 20;
    this.hpFill.renderOrder = 21;
    this.hpBar.add(bg, this.hpFill);
    this.hpBar.position.y = this.height + 0.35;
    this.hpBar.visible = false;
    this.object.add(this.hpBar);

    this.object.position.set(this.pos.x, 0, this.pos.z);
  }

  get alive() {
    return this.state === 'alive';
  }

  /** 傷害數字與投射物瞄準點 */
  get aimY() {
    return this.height * 0.6;
  }

  applySlow(duration: number, mul: number) {
    this.slowTimer = Math.max(this.slowTimer, duration);
    this.slowMul = Math.min(this.slowMul === 1 ? mul : this.slowMul, mul);
  }

  /** 回傳是否因此死亡 */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.flash = 1;
    this.shake = 1;
    this.hpBarTimer = 4;
    if (this.hp <= 0) {
      this.state = 'dying';
      this.stateTimer = DYING_TIME;
      return true;
    }
    return false;
  }

  update(dt: number, camera: THREE.Camera) {
    if (this.state === 'dying') {
      this.stateTimer -= dt;
      const t = Math.max(0, this.stateTimer / DYING_TIME);
      this.body.scale.setScalar(this.def.scale * (0.2 + 0.8 * t));
      this.body.position.y = (1 - t) * 0.6;
      if (this.stateTimer <= 0) {
        this.state = 'dead';
        this.object.visible = false;
        this.stateTimer = this.spawn.respawn ?? this.def.respawn;
      }
    } else if (this.state === 'dead') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.respawn();
      return;
    }

    // 緩速
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowMul = 1;
    }
    // 受擊閃白；緩速時偏藍
    if (this.flash > 0 || this.slowTimer > 0 || this.tinted) {
      this.flash = Math.max(0, this.flash - dt * 6);
      const f = this.flash * 0.8;
      const slow = this.slowTimer > 0 ? 0.35 : 0;
      for (const m of this.materials) m.emissive.setRGB(f, f + slow * 0.4, f + slow);
      this.tinted = this.flash > 0 || slow > 0;
    }
    // 受擊晃動
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 5);
      this.body.rotation.z = Math.sin(this.shake * 30) * 0.15 * this.shake;
    }
    // 血條
    if (this.hpBarTimer > 0) {
      this.hpBarTimer -= dt;
      this.hpBar.visible = this.state === 'alive';
      this.hpFill.scale.x = Math.max(0.001, this.hp / this.def.stats.maxHp);
      this.hpBar.quaternion.copy(camera.quaternion);
    } else this.hpBar.visible = false;

    this.object.position.set(this.pos.x, 0, this.pos.z);
  }

  private respawn() {
    this.state = 'alive';
    this.hp = this.def.stats.maxHp;
    this.pos.x = this.spawn.x;
    this.pos.z = this.spawn.z;
    this.body.scale.setScalar(this.def.scale);
    this.body.position.y = 0;
    this.object.visible = true;
    this.hpBarTimer = 0;
    this.slowTimer = 0;
    this.slowMul = 1;
  }

  private m(color: number): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
    this.materials.push(mat);
    return mat;
  }

  private add(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, this.m(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.body.add(mesh);
    return mesh;
  }

  /** 依 shape 建模型，回傳模型高度（未縮放） */
  private buildBody(): number {
    const c = this.def.color;
    switch (this.def.shape) {
      case 'dummy': {
        this.add(new THREE.CylinderGeometry(0.12, 0.16, 1.9, 6), 0x7a5232, 0, 0.95);
        this.add(new THREE.BoxGeometry(1.3, 0.14, 0.14), 0x7a5232, 0, 1.35);
        this.add(new THREE.CylinderGeometry(0.42, 0.36, 0.9, 7), c, 0, 1.15);
        this.add(new THREE.IcosahedronGeometry(0.3, 0), 0xe0c27a, 0, 1.85);
        const target = this.add(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 12), 0xd84a3a, 0, 1.2, 0.38);
        target.rotation.x = Math.PI / 2;
        const inner = this.add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), 0xf4f1e8, 0, 1.2, 0.4);
        inner.rotation.x = Math.PI / 2;
        this.add(new THREE.CylinderGeometry(0.5, 0.6, 0.15, 8), 0x8a6a4a, 0, 0.07);
        return 2.1;
      }
      default: {
        // 其他造型在第 4 週補上，先用史萊姆
        const blob = this.add(new THREE.IcosahedronGeometry(0.6, 1), c, 0, 0.5);
        blob.scale.y = 0.75;
        this.add(new THREE.SphereGeometry(0.08, 6, 4), 0x1b2433, -0.2, 0.65, 0.5);
        this.add(new THREE.SphereGeometry(0.08, 6, 4), 0x1b2433, 0.2, 0.65, 0.5);
        return 1;
      }
    }
  }

  dispose() {
    this.object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = (mesh as { material?: THREE.Material }).material;
      if (mat) {
        (mat as THREE.SpriteMaterial).map?.dispose();
        mat.dispose();
      }
    });
    this.object.removeFromParent();
  }
}
