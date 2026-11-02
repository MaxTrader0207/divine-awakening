import * as THREE from 'three';
import type { RigInstance } from '@/assets/Assets';

/**
 * 角色動畫控制（玩家、骷髏敵人共用）
 * - 一個「循環層」：idle / run / walk 之間淡入淡出。
 * - 一個「單次層」：攻擊、受擊、施法播一次，播完自動回到循環層。
 * - 死亡：播完停在最後一格。
 */
export class CharacterRig {
  readonly root: THREE.Object3D;
  readonly materials: THREE.MeshLambertMaterial[];
  private mixer: THREE.AnimationMixer;
  private actions: Map<string, THREE.AnimationAction>;
  private loop: THREE.AnimationAction | null = null;
  private oneShot: THREE.AnimationAction | null = null;
  private dead = false;

  constructor(rig: RigInstance) {
    this.root = rig.root;
    this.mixer = rig.mixer;
    this.actions = rig.actions;
    this.materials = rig.materials;
    this.mixer.addEventListener('finished', (e) => {
      const a = (e as unknown as { action: THREE.AnimationAction }).action;
      if (a === this.oneShot && !this.dead) {
        this.oneShot = null;
        a.fadeOut(0.15);
        this.loop?.reset().fadeIn(0.15).play();
      }
    });
  }

  has(name: string) {
    return this.actions.has(name);
  }

  /** 切換循環動作（已在播就不動） */
  setLoop(name: string, fade = 0.2, timeScale = 1) {
    const a = this.actions.get(name);
    if (!a || this.dead) return;
    a.timeScale = timeScale;
    if (a === this.loop) return;
    a.reset().setLoop(THREE.LoopRepeat, Infinity);
    if (!this.oneShot) a.fadeIn(fade).play();
    else a.play().setEffectiveWeight(0);
    this.loop?.fadeOut(fade);
    this.loop = a;
  }

  /** 播一次（攻擊、受擊）。priority = true 時打斷目前的單次動作 */
  playOnce(name: string, { timeScale = 1, fade = 0.08, priority = true } = {}) {
    const a = this.actions.get(name);
    if (!a || this.dead) return;
    if (this.oneShot && !priority) return;
    this.oneShot?.fadeOut(fade);
    a.reset().setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = false;
    a.timeScale = timeScale;
    a.fadeIn(fade).play();
    this.loop?.fadeOut(fade);
    this.oneShot = a;
  }

  get busy() {
    return !!this.oneShot;
  }

  die(name: string) {
    const a = this.actions.get(name);
    this.dead = true;
    this.mixer.stopAllAction();
    if (!a) return;
    a.reset().setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.play();
  }

  revive(loopName: string) {
    this.dead = false;
    this.oneShot = null;
    this.mixer.stopAllAction();
    this.loop = null;
    this.setLoop(loopName, 0);
  }

  update(dt: number) {
    this.mixer.update(dt);
  }

  /** 受擊閃白、緩速藍、前搖紅 */
  tint(r: number, g: number, b: number) {
    for (const m of this.materials) m.emissive.setRGB(r, g, b);
  }

  dispose() {
    this.mixer.stopAllAction();
    for (const m of this.materials) m.dispose();
  }
}
