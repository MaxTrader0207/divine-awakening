import * as THREE from 'three';
import { Assets } from '@/assets/Assets';
import type { MinionDef } from '@/data/minions';
import type { Stats } from '@/data/types';
import { CharacterRig } from './CharacterRig';
import type { Enemy } from './Enemy';

/**
 * 召喚物（召喚師的骷髏）：外觀、HP、動畫。AI 在 systems/MinionManager.ts。
 * 召喚物有紫色靈光與綠色血條，和敵人的骷髏區分。
 */
const ANIM = { idle: 'Idle', walk: 'Walking_D_Skeletons', attack: '1H_Melee_Attack_Chop', cast: 'Spellcast_Shoot', hit: 'Hit_A', death: 'Death_C_Skeletons' };

export class Minion {
  readonly object = new THREE.Group();
  readonly pos = { x: 0, z: 0 };
  facing = 0;
  hp: number;
  maxHp: number;
  /** 依召喚師當下屬性計算（召喚時固定） */
  stats: Stats;
  life: number;
  target: Enemy | null = null;
  attackCd = 0;
  windup = 0;
  groundY = 0;
  moving = 0;
  /** 死亡後倒地淡出的計時（> 0 表示正在消失） */
  dying = 0;
  /** 召喚順序（跟隨站位用） */
  slot = 0;
  private rig: CharacterRig | null = null;
  private materials: THREE.MeshLambertMaterial[] = [];
  private hpBar = new THREE.Group();
  private hpFill: THREE.Mesh;
  private flash = 0;
  private spawnT = 0.35;

  constructor(readonly def: MinionDef, owner: Stats, x: number, z: number) {
    this.pos.x = x;
    this.pos.z = z;
    this.maxHp = Math.round(owner.maxHp * def.hpMul);
    this.hp = this.maxHp;
    this.life = def.life;
    this.stats = { ...owner, atk: owner.atk * def.atkMul, def: owner.def * def.defMul, maxHp: this.maxHp };

    const inst = Assets.cloneRig(def.model);
    if (inst) {
      inst.root.scale.setScalar(def.height / Assets.height(def.model));
      for (const m of inst.materials) {
        // 友軍：偏紫的骨頭顏色
        m.color.lerp(new THREE.Color(0xc9b6ff), 0.35);
        m.emissive.setRGB(def.glow * 0.7, def.glow * 0.2, def.glow);
      }
      this.materials = inst.materials;
      this.object.add(inst.root);
      inst.root.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).castShadow = true) : null));
      this.rig = new CharacterRig(inst);
      this.rig.setLoop(ANIM.idle, 0);
    } else {
      // 模型載入失敗：紫色膠囊
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(def.radius, def.height - def.radius * 2, 4, 8), new THREE.MeshLambertMaterial({ color: 0xb9a6ff }));
      m.position.y = def.height / 2;
      this.object.add(m);
    }

    const w = 1.1;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.12), new THREE.MeshBasicMaterial({ color: 0x1b2433, depthTest: false, transparent: true, opacity: 0.85 }));
    this.hpFill = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.05, 0.08), new THREE.MeshBasicMaterial({ color: 0x8ce06a, depthTest: false }));
    this.hpFill.geometry.translate((w - 0.05) / 2, 0, 0);
    this.hpFill.position.set(-(w - 0.05) / 2, 0, 0.001);
    bg.renderOrder = 20;
    this.hpFill.renderOrder = 21;
    this.hpBar.add(bg, this.hpFill);
    this.hpBar.position.y = def.height + 0.3;
    this.object.add(this.hpBar);
    this.object.position.set(x, 0, z);
    this.object.scale.setScalar(0.01);
  }

  get alive() {
    return this.hp > 0 && this.life > 0 && this.dying <= 0;
  }

  get radius() {
    return this.def.radius;
  }

  /** 受到傷害，回傳實際扣血量 */
  takeDamage(amount: number): number {
    if (!this.alive) return 0;
    const dealt = Math.min(this.hp, amount);
    this.hp -= dealt;
    this.flash = 0.4;
    if (this.hp <= 0) this.die();
    else if (this.rig && this.windup <= 0) this.rig.playOnce(ANIM.hit, { priority: false, timeScale: 1.4 });
    return dealt;
  }

  /** 倒下（時間到、被打死、白骨爆裂） */
  die() {
    if (this.dying > 0) return;
    this.dying = 1.2;
    this.hp = 0;
    this.target = null;
    this.windup = 0;
    this.rig?.die(ANIM.death);
    this.hpBar.visible = false;
  }

  /** 出手動畫 */
  swing() {
    this.rig?.playOnce(this.def.ranged ? ANIM.cast : ANIM.attack, { timeScale: 1.5 });
  }

  /** 每幀：動畫、外觀（AI 由 MinionManager 處理） */
  update(dt: number, camera: THREE.Camera) {
    if (this.dying > 0) {
      this.dying -= dt;
      this.object.position.y = this.groundY - Math.max(0, 0.4 - this.dying) * 1.5;
    } else {
      this.object.position.y = this.groundY;
    }
    this.object.position.x = this.pos.x;
    this.object.position.z = this.pos.z;
    this.object.rotation.y = this.facing;
    // 召喚出現：從地面長出來
    if (this.spawnT > 0) {
      this.spawnT = Math.max(0, this.spawnT - dt);
      this.object.scale.setScalar(1 - this.spawnT / 0.35);
    }
    if (this.rig) {
      if (this.alive) this.rig.setLoop(this.moving > 0.05 ? ANIM.walk : ANIM.idle, 0.15, 1.3);
      this.rig.update(dt);
    }
    this.moving = Math.max(0, this.moving - dt * 4);
    // 受擊閃白；快消失時閃爍
    if (this.flash > 0 || this.life < 3) {
      this.flash = Math.max(0, this.flash - dt * 5);
      const blink = this.life < 3 && this.alive ? (Math.sin(this.life * 14) > 0 ? 0.25 : 0) : 0;
      const g = this.def.glow;
      for (const m of this.materials) m.emissive.setRGB(g * 0.7 + this.flash + blink, g * 0.2 + this.flash + blink, g + this.flash + blink);
    }
    this.hpFill.scale.x = Math.max(0.001, this.hp / this.maxHp);
    // 滿血時不顯示血條（召喚物多時畫面比較乾淨）
    this.hpBar.visible = this.alive && this.hp < this.maxHp;
    this.hpBar.quaternion.copy(camera.quaternion);
  }

  dispose() {
    this.rig?.dispose();
    this.object.removeFromParent();
    this.object.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
