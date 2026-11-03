import * as THREE from 'three';
import type { RigInstance } from '@/assets/Assets';

/**
 * 角色動畫控制（玩家、骷髏 / 青蛙敵人共用）。v1.42 重寫成「自己管權重」的混合器，讓所有動作接得順：
 * - 循環層：idle / run / walk 之間依 fade 交叉淡入淡出；淡出的循環動作不會被重設，回來時接著播（不會從第 0 格跳起）。
 * - 單次層：攻擊、施法、受擊、閃避播一次；快播完時就開始淡回循環層（最後一格保持住，不會閃回骨架原始姿勢）。
 * - 同一個動作連續觸發（普攻連打）：兩份動作交替，舊的淡出、新的淡入，不會瞬間跳回第一格。
 * - 上下半身分層：移動中攻擊時，上半身（spine 以上）播攻擊、下半身繼續跑，不會腿僵住在地上滑。
 *   閃避、歡呼、死亡是全身動作（layer: false）。
 * - 權重總和永遠是 1（three.js 權重不足 1 會混入骨架的 T 字原始姿勢）。
 */

interface Slot {
  /** 全身版 */
  full: THREE.AnimationAction;
  /** 上半身版（單次動作）或下半身版（循環動作）；沒有分層骨架時是 null */
  part: THREE.AnimationAction | null;
  w: number;
  target: number;
  /** 權重變化速度（每秒） */
  rate: number;
}

interface Shot extends Slot {
  name: string;
  /** 這個單次動作能否只放在上半身（移動中） */
  layer: boolean;
  /** 已開始淡出（播完或被打斷） */
  ending: boolean;
  /** 收尾淡出秒數 */
  back: number;
  /** 死亡動作：不淡出 */
  hold: boolean;
}

/** 上半身骨頭：spine（含）以下的所有子骨頭 */
function upperBones(root: THREE.Object3D): Set<string> | null {
  let spine: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!spine && /^spine/i.test(o.name) && (o as THREE.Bone).isBone) spine = o;
  });
  if (!spine) return null;
  const set = new Set<string>();
  (spine as THREE.Object3D).traverse((o) => set.add(o.name));
  return set;
}

/** 分層用的子動畫（依動畫 + 上 / 下半身快取，同模型的實例共用） */
const splitCache = new WeakMap<THREE.AnimationClip, { upper: THREE.AnimationClip; lower: THREE.AnimationClip }>();
function split(clip: THREE.AnimationClip, upper: Set<string>) {
  let s = splitCache.get(clip);
  if (!s) {
    const isUpper = (t: THREE.KeyframeTrack) => upper.has(THREE.PropertyBinding.parseTrackName(t.name).nodeName);
    s = {
      upper: new THREE.AnimationClip(`${clip.name}#upper`, clip.duration, clip.tracks.filter(isUpper)),
      lower: new THREE.AnimationClip(`${clip.name}#lower`, clip.duration, clip.tracks.filter((t) => !isUpper(t))),
    };
    splitCache.set(clip, s);
  }
  return s;
}
/** 同一動作的第二份（交替用） */
const altCache = new WeakMap<THREE.AnimationClip, THREE.AnimationClip>();
function alt(clip: THREE.AnimationClip): THREE.AnimationClip {
  let c = altCache.get(clip);
  if (!c) altCache.set(clip, (c = clip.clone()));
  return c;
}

/** 名稱看起來是移動循環（上下半身分層只在移動時啟用；待機時攻擊用全身動作比較有架勢） */
const LOCOMOTION = /run|walk|jump|jog/i;

export class CharacterRig {
  readonly root: THREE.Object3D;
  readonly materials: THREE.MeshLambertMaterial[];
  private mixer: THREE.AnimationMixer;
  private actions: Map<string, THREE.AnimationAction>;
  private upper: Set<string> | null;
  private loops = new Map<string, Slot>();
  private loopName: string | null = null;
  private shots: Shot[] = [];
  private active: Shot | null = null;
  private dead = false;

  constructor(rig: RigInstance) {
    this.root = rig.root;
    this.mixer = rig.mixer;
    this.actions = rig.actions;
    this.materials = rig.materials;
    this.upper = upperBones(rig.root);
  }

  has(name: string) {
    return this.actions.has(name);
  }

  private clipOf(name: string): THREE.AnimationClip | null {
    return this.actions.get(name)?.getClip() ?? null;
  }

  /** 切換循環動作（已在播就只更新速度） */
  setLoop(name: string, fade = 0.2, timeScale = 1) {
    if (this.dead) return;
    const clip = this.clipOf(name);
    if (!clip) return;
    let slot = this.loops.get(name);
    if (!slot) {
      const full = this.actions.get(name)!;
      const part = this.upper ? this.mixer.clipAction(split(clip, this.upper).lower) : null;
      for (const a of part ? [full, part] : [full]) {
        a.reset().setLoop(THREE.LoopRepeat, Infinity).play();
        a.setEffectiveWeight(0);
      }
      slot = { full, part, w: 0, target: 0, rate: 1 };
      this.loops.set(name, slot);
    } else if (slot.w <= 0 && name !== this.loopName) {
      // 完全淡出過的循環動作：從頭開始（腳步節奏比較自然）
      slot.full.time = 0;
    }
    slot.full.timeScale = timeScale;
    if (slot.part) slot.part.timeScale = timeScale;
    if (name === this.loopName) return;
    const rate = 1 / Math.max(fade, 1e-4);
    for (const [n, s] of this.loops) {
      s.target = n === name ? 1 : 0;
      s.rate = rate;
    }
    this.loopName = name;
  }

  /**
   * 播一次（攻擊、受擊、施法、閃避）。
   * priority = true 時打斷目前的單次動作；layer = false 時一律全身播放（閃避、歡呼）。
   */
  playOnce(name: string, { timeScale = 1, fade = 0.08, priority = true, layer = true, back = 0.18 } = {}) {
    if (this.dead) return;
    if (this.active && !priority) return;
    const clip = this.clipOf(name);
    if (!clip) return;
    // 同一動作還在畫面上（淡出中）就用另一份，兩份交叉淡化；兩份都在用時，挑權重較低的那份重播
    const using = (c: THREE.AnimationClip) => this.shots.find((s) => s.full.getClip() === c);
    let base = clip;
    if (using(clip)) {
      const c2 = alt(clip);
      const a = using(clip)!;
      const b = using(c2);
      base = !b || b.w < a.w ? c2 : clip;
      const drop = using(base);
      if (drop) this.shots = this.shots.filter((s) => s !== drop);
    }
    this.startShot(name, base, { timeScale, fade, layer, back, hold: false });
  }

  private startShot(name: string, clip: THREE.AnimationClip, o: { timeScale: number; fade: number; layer: boolean; back: number; hold: boolean }) {
    const rate = 1 / Math.max(o.fade, 1e-4);
    for (const s of this.shots) {
      s.target = 0;
      s.ending = true;
      s.rate = rate;
    }
    const full = this.mixer.clipAction(clip);
    const part = this.upper && o.layer ? this.mixer.clipAction(split(clip, this.upper).upper) : null;
    for (const a of part ? [full, part] : [full]) {
      a.stop();
      a.reset().setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      a.timeScale = o.timeScale;
      a.play();
      a.setEffectiveWeight(0);
    }
    const shot: Shot = { name, full, part, w: 0, target: 1, rate, layer: !!part, ending: false, back: o.back, hold: o.hold };
    this.shots.push(shot);
    this.active = shot;
  }

  get busy() {
    return !!this.active;
  }

  die(name: string) {
    const clip = this.clipOf(name);
    this.active = null;
    if (!clip) {
      this.dead = true;
      return;
    }
    this.startShot(name, clip, { timeScale: 1, fade: 0.15, layer: false, back: 0, hold: true });
    this.active = null;
    this.dead = true;
  }

  revive(loopName: string) {
    this.dead = false;
    this.active = null;
    this.mixer.stopAllAction();
    this.shots = [];
    this.loops.clear();
    this.loopName = null;
    this.setLoop(loopName, 0);
  }

  update(dt: number) {
    // 單次動作快播完：開始淡回循環層
    for (const s of this.shots) {
      if (s.ending || s.hold) continue;
      const left = (s.full.getClip().duration - s.full.time) / Math.max(0.01, Math.abs(s.full.timeScale));
      if (left <= s.back) {
        s.ending = true;
        s.target = 0;
        s.rate = 1 / Math.max(s.back, 1e-4);
        if (this.active === s) this.active = null;
      }
    }
    const step = (s: Slot) => {
      const d = s.target - s.w;
      const m = s.rate * dt;
      s.w = Math.abs(d) <= m ? s.target : s.w + Math.sign(d) * m;
    };
    for (const s of this.loops.values()) step(s);
    for (const s of this.shots) step(s);
    // 淡出完的單次動作停掉
    this.shots = this.shots.filter((s) => {
      if (s.w > 0 || s.target > 0) return true;
      s.full.stop();
      s.part?.stop();
      return false;
    });

    // 權重正規化：循環層總和 1、單次層總和 ≤ 1
    let lsum = 0;
    let loco = 0;
    for (const [n, s] of this.loops) {
      lsum += s.w;
      if (LOCOMOTION.test(n)) loco += s.w;
    }
    const cur = this.loopName ? this.loops.get(this.loopName) : undefined;
    if (lsum <= 1e-4 && cur) {
      cur.w = 1;
      lsum = 1;
      if (LOCOMOTION.test(this.loopName!)) loco = 1;
    }
    const moving = lsum > 0 ? loco / lsum : 0;
    let ssum = 0;
    for (const s of this.shots) ssum += s.w;
    const sNorm = ssum > 1 ? 1 / ssum : 1;
    const shotTotal = Math.min(1, ssum);
    // 分層：移動中的單次動作放上半身，下半身由循環層的「下半身版」補上
    let lowerFill = 0;
    for (const s of this.shots) {
      const w = s.w * sNorm;
      const m = s.part ? moving : 0;
      s.full.setEffectiveWeight(w * (1 - m));
      s.part?.setEffectiveWeight(w * m);
      lowerFill += w * m;
    }
    for (const s of this.loops.values()) {
      const lw = lsum > 0 ? s.w / lsum : 0;
      s.full.setEffectiveWeight(lw * (1 - shotTotal));
      if (s.part) {
        s.part.setEffectiveWeight(lw * lowerFill);
        s.part.time = s.full.time; // 下半身版跟全身版同步
        s.part.timeScale = s.full.timeScale;
      }
    }
    for (const s of this.shots) {
      if (s.part) s.part.time = s.full.time;
    }
    this.mixer.update(dt);
    // 下半身版的時間在 mixer 裡也推進了，再對齊一次避免累積誤差
    for (const s of this.loops.values()) if (s.part) s.part.time = s.full.time;
    for (const s of this.shots) if (s.part) s.part.time = s.full.time;
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
