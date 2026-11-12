import * as THREE from 'three';
import type { Stats } from '@/data/types';
import { statsForLevel } from '@/data/player';
import type { CollisionWorld } from '@/world/Collision';
import { mat } from '@/world/Props';
import { Assets } from '@/assets/Assets';
import { CharacterRig } from './CharacterRig';
import { CLASSES, type HeroAnimSet } from '@/data/classes';
import { smoothByCrease } from './smoothShade';
import { BossLook } from './enemyShapes/bossLook';
import { DivineAura } from './DivineAura';
import type { DivineForm, OrnamentKind } from '@/data/divineForm';

/** 平滑後的模型幾何（同一職業模型共用，依 模型:網格序號）*/
const SMOOTH_CACHE = new Map<string, THREE.BufferGeometry>();

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
/** v1.108 普攻連段的間隔上限（秒）、出手後維持戰鬥姿勢的秒數 */
const COMBO_WINDOW = 1.2;
const COMBAT_STANCE = 4;

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

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
  /** 目前速度（公尺 / 秒）：起步、停下有很短的加減速，動作比較順 */
  readonly vel = { x: 0, z: 0 };
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
  /** 平滑著色職業的材質效果（高光、地面遮蔽、輪廓光） */
  private look: BossLook | null = null;
  private anims: HeroAnimSet;
  /** 模型的材質（v1.99 神裝形態換色用）與原本的貼圖、光暈 */
  private modelMats: THREE.MeshLambertMaterial[] = [];
  private baseLook = new Map<THREE.MeshLambertMaterial, { map: THREE.Texture | null; emissive: THREE.Color }>();
  private divineKey = '';
  private aura: DivineAura | null = null;

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
    // 職業光暈
    if (this.anims.tint !== undefined) {
      const c = new THREE.Color(this.anims.tint);
      for (const m of inst.materials) m.emissive.copy(c).multiplyScalar(0.22);
    }
    // 貼圖換色（召喚師：綠色布料 → 深紫，皮膚與皮革不變）
    if (this.anims.recolor) {
      const cache = new Map<THREE.Texture, THREE.Texture>();
      for (const m of inst.materials) {
        if (!m.map) continue;
        let t = cache.get(m.map);
        if (!t) cache.set(m.map, (t = recolorTexture(m.map, this.anims.recolor)));
        m.map = t;
        m.needsUpdate = true;
      }
    }
    this.modelMats = inst.materials as THREE.MeshLambertMaterial[];
    for (const m of this.modelMats) this.baseLook.set(m, { map: m.map, emissive: m.emissive.clone() });
    // 平滑著色（v1.50 訓獸師、v1.51 全職業）：依摺角重算法線，圓弧處不再一格一格、稜角保持銳利
    const crease = this.anims.smooth ?? 60;
    if (crease > 0) {
      let i = 0;
      inst.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const k = `${this.anims.model}:${i++}`;
        let g = SMOOTH_CACHE.get(k);
        if (!g) SMOOTH_CACHE.set(k, (g = smoothByCrease(m.geometry, crease)));
        m.geometry = g;
      });
      // 與野獸同一套質感：柔和高光、腳邊遮蔽、輪廓光
      this.look = new BossLook(0xf0d8a0);
      for (const m of inst.materials) this.look.apply(m);
    }
    // 手上的道具（召喚師的骷髏法杖）
    const prop = this.anims.prop;
    if (prop) {
      const bone = inst.root.getObjectByName(`handslot${prop.hand}`) ?? inst.root.getObjectByName(`hand${prop.hand}`);
      const w = prop.id === 'whip' ? buildWhip() : Assets.cloneStatic(prop.id);
      if (bone && w && prop.id === 'whip') {
        // 程式鞭子：握點就是原點，待機時在世界座標維持「握把朝上、鞭身垂下」
        const poseRig = new CharacterRig(inst);
        poseRig.setLoop(this.anims.idle, 0);
        poseRig.update(0.5);
        this.rig = poseRig;
        inst.root.updateMatrixWorld(true);
        const ws = new THREE.Vector3();
        bone.getWorldScale(ws);
        const bq = new THREE.Quaternion();
        bone.getWorldQuaternion(bq);
        w.quaternion.copy(bq.invert());
        w.scale.setScalar(1 / ws.x);
        bone.add(w);
      } else if (bone && w) {
        inst.root.updateMatrixWorld(true);
        const size = Assets.size(prop.id);
        const ws = new THREE.Vector3();
        bone.getWorldScale(ws);
        w.scale.setScalar(prop.length / Math.max(size.x, size.y, size.z) / ws.x);
        // 細長化：只壓縮橫向（模型沿 +y），長度不變
        if (prop.thin) {
          w.scale.x *= prop.thin;
          w.scale.z *= prop.thin;
        }
        // 待機姿勢下讓道具在世界座標「直立」（模型本身沿 +y），之後跟著手的動畫一起動
        const poseRig = new CharacterRig(inst);
        poseRig.setLoop(this.anims.idle, 0);
        poseRig.update(0.5);
        this.rig = poseRig;
        inst.root.updateMatrixWorld(true);
        const bq = new THREE.Quaternion();
        bone.getWorldQuaternion(bq);
        w.quaternion.copy(bq.invert());
        // 握點：沿世界 y 往下移 grip（預設 35%）長度（換算到骨頭座標）
        const down = new THREE.Vector3(0, -prop.length * (prop.grip ?? 0.35), 0).applyQuaternion(w.quaternion).divideScalar(ws.x);
        w.position.copy(down);
        w.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.castShadow = true;
          // 武器也平滑＋同一套質感（材質複製一份，不影響場景裡其他同模型的物件）
          if (crease > 0) {
            const k = `prop:${prop.id}:${m.geometry.uuid}`;
            let g = SMOOTH_CACHE.get(k);
            if (!g) SMOOTH_CACHE.set(k, (g = smoothByCrease(m.geometry, 50)));
            m.geometry = g;
            if (this.look) {
              const mat = (m.material as THREE.Material).clone();
              this.look.apply(mat);
              m.material = mat;
            }
          }
        });
        bone.add(w);
      }
    }
    // 忍者面罩：頭骨上掛一圈遮住口鼻的布（待機姿勢下讓它在世界座標保持水平）
    const mask = this.anims.mask;
    const head = mask ? inst.root.getObjectByName('head') : null;
    if (mask && head) {
      const poseRig = this.rig ?? new CharacterRig(inst);
      poseRig.setLoop(this.anims.idle, 0);
      poseRig.update(0.5);
      this.rig = poseRig;
      inst.root.updateMatrixWorld(true);
      const ws = new THREE.Vector3();
      head.getWorldScale(ws);
      const g = new THREE.CylinderGeometry(mask.r, mask.r * 0.92, mask.h, 20, 1, true, -Math.PI * 0.62, Math.PI * 1.24);
      const mat = new THREE.MeshLambertMaterial({ color: mask.color, side: THREE.DoubleSide });
      this.look?.apply(mat);
      const m = new THREE.Mesh(g, mat);
      const holder = new THREE.Group();
      const bq = new THREE.Quaternion();
      head.getWorldQuaternion(bq);
      holder.quaternion.copy(bq.invert());
      holder.scale.setScalar(1 / ws.x);
      m.position.set(0, mask.y, mask.z ?? 0);
      // 結：後腦勺兩條布尾
      for (const sx of [-1, 1]) {
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.03), mat);
        tail.position.set(sx * 0.08, mask.y - 0.12, -(mask.r + 0.02));
        tail.rotation.z = sx * 0.35;
        holder.add(tail);
      }
      holder.add(m);
      head.add(holder);
    }
    this.body.add(inst.root);
    // 法杖頂端改成隱形的定位點（投射物出生點、施法光效）
    this.staffTip.visible = false;
    this.staffTip.position.set(0.45, 1.6, 0.35);
    this.body.add(this.staffTip);
    this.rig ??= new CharacterRig(inst);
    this.rig.setLoop(this.anims.idle, 0);
    return true;
  }

  /** 大招施法（烈焰爆發）、閃避、歡呼：只有模型時有動作 */
  /** 播指定動畫（近戰技能用）；動畫不存在時改播 cast */
  act(anim: string | undefined, timeScale = 1.6) {
    const a = this.comboAnim(anim ?? this.anims.cast);
    this.combatT = COMBAT_STANCE;
    this.rig?.playOnce(a, { timeScale });
    this.echo(a, timeScale);
  }

  /** v1.108 普攻連段：這個動作是連段第一段（或 cast）時，1.2 秒內連續出手就依序換下一段 */
  private comboIdx = 0;
  private comboT = 0;
  private comboAnim(anim: string): string {
    const c = this.anims.combo;
    if (!c || c.length < 2 || (anim !== c[0] && anim !== this.anims.cast)) return anim;
    this.comboIdx = this.comboT > 0 ? (this.comboIdx + 1) % c.length : 0;
    this.comboT = COMBO_WINDOW;
    return c[this.comboIdx];
  }

  private prevFacing = 0;
  private bank = 0;
  private pitch = 0;
  /** v1.108 戰鬥姿勢剩餘秒數（出手 / 受傷後一段時間待機改成 combatIdle） */
  combatT = 0;
  private hitFlip = false;

  /** 守護剩餘秒數：期間受到的傷害降低 GUARD_REDUCTION */
  guardT = 0;
  /** 嗜血剩餘秒數：造成傷害的一部分回血 */
  bloodlustT = 0;
  /** 狂暴剩餘秒數：攻擊力提升、普攻變快 */
  berserkT = 0;
  /** 劍俠「人劍合一」剩餘秒數 */
  swordIntentT = 0;
  /** 訓獸師「野性咆哮」剩餘秒數（腳下橘色光圈、AUTO 判斷用；野獸本身的增益在 Minion.roarT） */
  wildRoarT = 0;
  /** 忍者「影分身之術」剩餘秒數（v1.88） */
  ninjaCloneT = 0;

  castBig() {
    this.rig?.playOnce(this.anims.castBig, { timeScale: 1.6 });
    this.echo(this.anims.castBig, 1.6);
  }

  dodge() {
    this.rig?.playOnce(this.anims.dodge, { timeScale: 1.4, layer: false });
    this.echo(this.anims.dodge, 1.4, false);
  }

  /* ---------- 忍者影分身（v1.89）：左右兩個半透明的紫色影子，跟著本體晚一拍出刀 ---------- */
  private clones: ShadowClone[] | null = null;
  private cloneFade = 0;
  private cloneT = 0;

  /** 本體出手 → 影子延遲一拍跟著做（左右兩個錯開一點，連段時換成另一個方向的斬擊） */
  private echo(anim: string, timeScale: number, layer = true) {
    if (!this.clones || this.ninjaCloneT <= 0) return;
    const swap: Record<string, string> = { Dualwield_Melee_Attack_Slice: 'Dualwield_Melee_Attack_Chop', Dualwield_Melee_Attack_Chop: 'Dualwield_Melee_Attack_Slice' };
    for (const c of this.clones) {
      const a = c.side > 0 && swap[anim] ? swap[anim] : anim;
      c.queue.push({ t: CLONE_DELAY + (c.side > 0 ? 0.05 : 0), anim: a, timeScale, layer });
    }
  }

  /** 第一次開影分身時才建模型（之後重複使用） */
  private buildClones(): ShadowClone[] | null {
    const sc = this.anims.shadowClone;
    if (!sc) return null;
    const list: ShadowClone[] = [];
    for (const side of [-1, 1]) {
      const inst = Assets.cloneRig(this.anims.model);
      if (!inst) return null;
      inst.root.scale.setScalar(HERO_HEIGHT / Assets.height(this.anims.model));
      const mat = new THREE.MeshLambertMaterial({ color: sc.color, emissive: sc.glow, transparent: true, opacity: 0 });
      let i = 0;
      inst.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const g = SMOOTH_CACHE.get(`${this.anims.model}:${i++}`);
        if (g) m.geometry = g;
        m.material = mat;
        m.castShadow = false;
        m.receiveShadow = false;
      });
      const holder = new THREE.Group();
      holder.add(inst.root);
      holder.visible = false;
      this.object.add(holder);
      // 紫色輪廓光，讓深色影子看得出身形
      const look = new BossLook(sc.rim);
      look.apply(mat);
      const rig = new CharacterRig(inst);
      rig.setLoop(this.anims.idle, 0);
      list.push({ holder, rig, mat, look, side, queue: [] });
    }
    return list;
  }

  private updateClones(dt: number, loop: string, loopFade: number, loopSpeed: number) {
    const on = this.ninjaCloneT > 0 && this.alive;
    if (on && !this.clones) this.clones = this.buildClones();
    if (!this.clones) return;
    const before = this.cloneFade;
    this.cloneFade = on ? Math.min(1, this.cloneFade + dt / 0.25) : Math.max(0, this.cloneFade - dt / 0.4);
    const f = this.cloneFade;
    if (f <= 0) {
      if (before > 0) for (const c of this.clones) (c.holder.visible = false), (c.queue.length = 0);
      return;
    }
    this.cloneT += dt;
    // 完全出現後是不透明的影子（半透明會看到模型內部的眼睛、腰帶），只有淡入淡出時才半透明
    const solid = f >= 1;
    for (const c of this.clones) {
      c.holder.visible = true;
      if (c.mat.transparent === solid) {
        c.mat.transparent = !solid;
        c.mat.needsUpdate = true;
      }
      c.mat.opacity = solid ? 1 : f * 0.8;
      // 從本體身上滑出來：出現時從中間往兩側散開，平常輕輕飄動
      const spread = 0.3 + 0.7 * easeOut(f);
      c.holder.position.set(c.side * CLONE_SIDE * spread, 0.05 + Math.sin(this.cloneT * 2.4 + c.side) * 0.05, CLONE_BACK * spread + Math.sin(this.cloneT * 1.7 + c.side * 2) * 0.08);
      c.holder.scale.setScalar(0.92 + 0.08 * f);
      for (let k = c.queue.length - 1; k >= 0; k--) {
        const q = c.queue[k];
        q.t -= dt;
        if (q.t > 0) continue;
        c.rig.playOnce(q.anim, { timeScale: q.timeScale, layer: q.layer });
        c.queue.splice(k, 1);
      }
      c.rig.setLoop(loop, loopFade, loopSpeed);
      c.rig.update(dt);
      c.look.update(this.object.position.y, HERO_HEIGHT);
    }
  }

  cheer() {
    this.rig?.playOnce(this.anims.cheer, { priority: false, layer: false });
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
    this.combatT = COMBAT_STANCE;
    if (this.hp <= 0) this.rig?.die(this.anims.death2 && Math.random() < 0.5 ? this.anims.death2 : this.anims.death);
    else if (this.rig && !this.rig.busy) {
      // v1.108 受擊兩套輪流，重擊（扣超過 12% 血）頓一下更明顯
      this.hitFlip = !this.hitFlip;
      const heavy = amount > this.stats.maxHp * 0.12;
      this.rig.playOnce(this.hitFlip && this.anims.hit2 ? this.anims.hit2 : this.anims.hit, { priority: false, timeScale: heavy ? 1.05 : 1.35 });
    }
    return amount;
  }

  /** 復活：滿血滿魔、短暫無敵 */
  revive() {
    this.guardT = 0;
    this.bloodlustT = 0;
    this.berserkT = 0;
    this.swordIntentT = 0;
    this.wildRoarT = 0;
    this.ninjaCloneT = 0;
    this.hp = this.stats.maxHp;
    this.mp = this.stats.maxMp;
    this.invulnerable = 2;
    this.sinceHurt = 99;
    this.object.visible = true;
    this.body.rotation.set(0, 0, 0);
    this.body.position.y = 0;
    this.vel.x = this.vel.z = 0;
    this.rig?.revive(this.anims.idle);
  }

  setLevel(level: number) {
    this.stats = statsForLevel(level);
    this.hp = Math.min(this.hp, this.stats.maxHp);
    this.mp = Math.min(this.mp, this.stats.maxMp);
  }

  teleport(x: number, z: number) {
    this.vel.x = this.vel.z = 0;
    this.pos.x = x;
    this.pos.z = z;
    this.object.position.set(x, this.groundY, z);
  }

  /**
   * v1.99 神裝形態（全身★神話裝，見 data/divineForm.ts）：衣服換成套裝配色、輪廓光、腳下法陣、職業飾物。
   * 傳 null 回到原本外觀。同樣的形態不會重建。回傳是否「剛變成」神裝形態（給 Game 放特效）。
   */
  setDivineForm(form: DivineForm | null, ornament: OrnamentKind): boolean {
    const key = form ? `${form.key}:${ornament}` : '';
    if (key === this.divineKey) return false;
    const wasOn = this.divineKey !== '';
    this.divineKey = key;
    // 先回到原本外觀
    for (const [m, b] of this.baseLook) {
      m.map = b.map;
      m.emissive.copy(b.emissive);
      m.needsUpdate = true;
    }
    this.look?.setRim(new THREE.Color(0xf0d8a0).lerp(new THREE.Color(0xfff4e0), 0.5).getHex(), 0.3);
    if (this.aura) {
      this.object.remove(this.aura.group);
      this.aura.dispose();
      this.aura = null;
    }
    if (!form) return false;
    const pal = form.palette;
    for (const [m, b] of this.baseLook) {
      if (b.map) {
        const k = `${b.map.uuid}:${form.tier}`;
        let tex = DIVINE_TEX.get(k);
        if (!tex) DIVINE_TEX.set(k, (tex = divineTexture(b.map, pal)));
        m.map = tex;
      }
      m.emissive.set(pal.glow).multiplyScalar(0.04);
      m.needsUpdate = true;
    }
    this.look?.setRim(pal.glow, 0.55);
    this.aura = new DivineAura(ornament, pal, form.full);
    this.object.add(this.aura.group);
    return !wasOn;
  }

  /** 施法：面向指定方向一小段時間並播放揮杖動畫 */
  cast(dirX: number, dirZ: number) {
    this.lockFacing = Math.atan2(dirX, dirZ);
    this.lockTimer = 0.35;
    this.castT = 0.22;
    this.combatT = COMBAT_STANCE;
    this.rig?.playOnce(this.comboAnim(this.anims.cast), { timeScale: 2.2 });
  }

  /** 法杖頂端的世界座標（投射物出生點） */
  staffTipWorld(out: THREE.Vector3): THREE.Vector3 {
    return this.staffTip.getWorldPosition(out);
  }

  /** move：世界方向向量，長度 0~1 */
  update(dt: number, move: { x: number; z: number }, collision: CollisionWorld, pushOut?: (pos: { x: number; z: number }, r: number) => void) {
    if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.guardT > 0) this.guardT = Math.max(0, this.guardT - dt);
    if (this.bloodlustT > 0) this.bloodlustT = Math.max(0, this.bloodlustT - dt);
    if (this.berserkT > 0) this.berserkT = Math.max(0, this.berserkT - dt);
    if (this.swordIntentT > 0) this.swordIntentT = Math.max(0, this.swordIntentT - dt);
    if (this.wildRoarT > 0) this.wildRoarT = Math.max(0, this.wildRoarT - dt);
    if (this.ninjaCloneT > 0) this.ninjaCloneT = Math.max(0, this.ninjaCloneT - dt);
    this.sinceHurt += dt;
    this.rig?.update(dt);
    this.look?.update(this.object.position.y, HERO_HEIGHT);
    this.aura?.update(dt, this.moveAmount > 0.3);
    if (!this.alive) {
      this.updateClones(dt, this.anims.idle, 0.22, 1);
      if (this.rig) return; // 模型播死亡動畫
      // 倒地動畫
      this.body.rotation.z += (Math.PI / 2 - this.body.rotation.z) * Math.min(1, dt * 8);
      this.body.position.y = Math.max(-0.3, this.body.position.y - dt);
      return;
    }
    const len = Math.hypot(move.x, move.z);
    // 加減速：約 0.1 秒到全速、0.07 秒停下（搖桿放開不會瞬間定格）
    const k = 1 - Math.exp(-dt * (len > 0.001 ? 22 : 32));
    this.vel.x += (move.x * this.stats.moveSpeed - this.vel.x) * k;
    this.vel.z += (move.z * this.stats.moveSpeed - this.vel.z) * k;
    if (len <= 0.001 && Math.hypot(this.vel.x, this.vel.z) < 0.05) this.vel.x = this.vel.z = 0;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    if (len > 0.001) {
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

    const speedNow = Math.hypot(this.vel.x, this.vel.z);
    this.moveAmount += ((len > 0.001 ? 1 : 0) - this.moveAmount) * Math.min(1, dt * 10);
    this.bobT += dt * (4 + this.moveAmount * 8);

    this.object.position.set(this.pos.x, this.groundY, this.pos.z);
    this.object.rotation.y = this.facing;
    this.object.visible = this.invulnerable > 0.05 ? Math.floor(this.invulnerable * 12) % 2 === 0 : true;
    if (this.rig) {
      // 有模型：跑步動畫速度跟著「目前」速度（加速中腳步也跟得上，不會滑步）
      const full = 0.8 + 0.4 * Math.min(1.5, this.stats.moveSpeed / 6.5);
      const ratio = Math.min(1, speedNow / Math.max(0.1, this.stats.moveSpeed));
      const running = this.moveAmount > 0.3 && speedNow > 0.4;
      const speed = full * (0.55 + 0.45 * ratio);
      this.comboT = Math.max(0, this.comboT - dt);
      this.combatT = Math.max(0, this.combatT - dt);
      const idle = this.combatT > 0 && this.anims.combatIdle ? this.anims.combatIdle : this.anims.idle;
      if (running) this.rig.setLoop(this.anims.run, 0.18, speed);
      else this.rig.setLoop(idle, 0.3);
      this.updateClones(dt, running ? this.anims.run : idle, running ? 0.18 : 0.3, running ? speed : 1);
      // v1.108 跑步時身體前傾、轉彎時往內側傾（有重量感）；停下時慢慢回正
      const turn = wrapAngle(this.facing - this.prevFacing) / Math.max(dt, 1e-3);
      this.prevFacing = this.facing;
      const lean = Math.min(1, ratio) * this.moveAmount;
      this.bank += (THREE.MathUtils.clamp(-turn * 0.035, -0.22, 0.22) * lean - this.bank) * Math.min(1, dt * 8);
      this.pitch += (0.1 * lean - this.pitch) * Math.min(1, dt * 6);
      this.body.rotation.set(this.pitch, 0, this.bank);
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

/** 影分身：延遲秒數（與 SkillSystem 的 NINJA.cloneDelay 對齊）、站位（本體左右、略後方） */
const CLONE_DELAY = 0.12;
const CLONE_SIDE = 1.3;
const CLONE_BACK = -0.55;

interface ShadowClone {
  holder: THREE.Group;
  rig: CharacterRig;
  mat: THREE.MeshLambertMaterial;
  look: BossLook;
  side: number;
  queue: { t: number; anim: string; timeScale: number; layer: boolean }[];
}

function easeOut(x: number) {
  return 1 - (1 - x) * (1 - x);
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** 訓獸師的鞭子：皮革握把＋往前甩、再垂到腳邊捲起的長鞭（握點在原點、+y 朝上、+z 朝前） */
function buildWhip(): THREE.Object3D {
  const g = new THREE.Group();
  const leather = new THREE.MeshPhongMaterial({ color: 0x5a3418, specular: 0x2a1a0c, shininess: 20 });
  const lash = new THREE.MeshPhongMaterial({ color: 0x8a5a2a, specular: 0x30200e, shininess: 24 });
  const gold = new THREE.MeshPhongMaterial({ color: 0xe0a83a, emissive: 0x3a2400, specular: 0x806030, shininess: 60 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.36, 16), leather);
  handle.position.y = 0.1;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10), gold);
  cap.position.y = -0.09;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.012, 8, 24), gold);
  ring.position.y = 0.28;
  ring.rotation.x = Math.PI / 2;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.28, 0),
    new THREE.Vector3(0.02, 0.36, 0.14),
    new THREE.Vector3(0.06, 0.18, 0.34),
    new THREE.Vector3(0.1, -0.25, 0.42),
    new THREE.Vector3(0.12, -0.62, 0.3),
    new THREE.Vector3(0.0, -0.74, 0.16),
    new THREE.Vector3(-0.14, -0.72, 0.24),
  ]);
  // 鞭身越往末端越細（逐段縮放管子的半徑）
  const tube = new THREE.TubeGeometry(curve, 72, 0.022, 8, false);
  const pos = tube.getAttribute('position');
  const segs = 73;
  const ring5 = 9;
  for (let i = 0; i < segs; i++) {
    const center = curve.getPointAt(i / (segs - 1));
    const k = 1 - (i / (segs - 1)) * 0.7;
    for (let j = 0; j < ring5; j++) {
      const idx = i * ring5 + j;
      if (idx >= pos.count) break;
      pos.setXYZ(idx, center.x + (pos.getX(idx) - center.x) * k, center.y + (pos.getY(idx) - center.y) * k, center.z + (pos.getZ(idx) - center.z) * k);
    }
  }
  tube.computeVertexNormals();
  const lashMesh = new THREE.Mesh(tube, lash);
  for (const m of [handle, cap, ring, lashMesh]) {
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

/** v1.99 神裝形態的貼圖（依貼圖＋階級快取） */
const DIVINE_TEX = new Map<string, THREE.Texture>();

/**
 * 神裝形態換色：有顏色的布料換成套裝色相（保留明暗），灰色的金屬往點綴色鍍一層，
 * 皮膚、皮革、頭髮（橘棕色系）與很暗的地方（眼睛、陰影）不動。
 */
function divineTexture(src: THREE.Texture, pal: { hue: number; sat: number; light: number; accent: number }): THREE.Texture {
  const img = src.image as CanvasImageSource & { width: number; height: number };
  if (!img || !img.width) return src;
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  const c = new THREE.Color();
  const acc = new THREE.Color(pal.accent);
  const hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < d.length; i += 4) {
    c.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    c.getHSL(hsl);
    const deg = hsl.h * 360;
    if (hsl.l < 0.1) continue;
    // 皮膚、皮革、頭髮（橘棕色系）保留——KayKit 貼圖裡皮膚和皮帶顏色很接近，分不開，就一起保留
    if (deg >= 8 && deg <= 45) continue;
    if (hsl.s < 0.15) {
      // 金屬、白布：鍍上一層點綴色
      if (hsl.l > 0.35) c.lerp(acc, 0.35);
    } else c.setHSL(pal.hue / 360, Math.min(1, hsl.s * pal.sat + 0.12), Math.min(0.92, hsl.l * pal.light));
    d[i] = c.r * 255;
    d[i + 1] = c.g * 255;
    d[i + 2] = c.b * 255;
  }
  ctx.putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.flipY = src.flipY;
  t.colorSpace = src.colorSpace;
  t.wrapS = src.wrapS;
  t.wrapT = src.wrapT;
  t.magFilter = src.magFilter;
  t.minFilter = src.minFilter;
  t.generateMipmaps = src.generateMipmaps;
  return t;
}

/** 貼圖換色：把指定色相範圍的像素轉成新色相（保留明暗與飽和度），回傳新的 CanvasTexture */
function recolorTexture(src: THREE.Texture, rc: { from: number; to: number; hue: number; light?: number; maxL?: number; sat?: number }): THREE.Texture {
  const img = src.image as CanvasImageSource & { width: number; height: number };
  if (!img || !img.width) return src;
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  const c = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < d.length; i += 4) {
    c.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    c.getHSL(hsl);
    const deg = hsl.h * 360;
    // maxL：太亮的不換（訓獸師：紅布換綠，但同色相、比較亮的皮膚不動）
    if (hsl.s < 0.18 || deg < rc.from || deg > rc.to || hsl.l > (rc.maxL ?? 1)) continue;
    c.setHSL(rc.hue / 360, Math.min(1, hsl.s * (rc.sat ?? 0.9)), hsl.l * (rc.light ?? 1));
    d[i] = c.r * 255;
    d[i + 1] = c.g * 255;
    d[i + 2] = c.b * 255;
  }
  ctx.putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.flipY = src.flipY;
  t.colorSpace = src.colorSpace;
  t.wrapS = src.wrapS;
  t.wrapT = src.wrapT;
  t.magFilter = src.magFilter;
  t.minFilter = src.minFilter;
  t.generateMipmaps = src.generateMipmaps;
  return t;
}
