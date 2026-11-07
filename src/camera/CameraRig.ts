import * as THREE from 'three';

/**
 * 斜俯視跟隨攝影機（類似影片中的 45~60° 俯角）
 * zoom：1 = 100%，數值越大越近；HUD 的 +/- 按鈕每次 ±10%。
 */
export const ZOOM_MIN = 0.8;
export const ZOOM_MAX = 1.5;

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  zoom = 1.1;
  private target = new THREE.Vector3();
  private current = new THREE.Vector3();
  /** 基準偏移（zoom = 1 時） */
  private readonly offset = new THREE.Vector3(0, 36, 25);
  /** 破關特寫：0 = 一般俯視，1 = 低角度繞到角色正面（cineTarget 決定往哪邊過渡） */
  private cine = 0;
  private cineTarget = 0;
  private cineAngle = 0;
  private tmp = new THREE.Vector3();
  /** 鏡頭震動（首領重擊）：強度，每秒衰減 */
  private shakeAmt = 0;
  private shakeT = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 220);
  }

  setZoom(z: number) {
    this.zoom = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 100) / 100;
  }

  snapTo(x: number, z: number) {
    this.target.set(x, 0, z);
    this.current.copy(this.target);
    this.apply();
  }

  update(dt: number, x: number, z: number, y = 0) {
    this.target.set(x, y, z);
    this.current.lerp(this.target, 1 - Math.exp(-dt * 8));
    this.cine += (this.cineTarget - this.cine) * (1 - Math.exp(-dt * 2.2));
    if (this.cineTarget === 0 && this.cine < 0.002) this.cine = 0;
    this.cineAngle += dt * 0.18; // 特寫時慢慢繞
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.6);
    this.shakeT += dt;
    this.apply();
  }

  /** 震一下（疊加取較大值，上限 1） */
  shake(power: number) {
    this.shakeAmt = Math.min(1, Math.max(this.shakeAmt, power));
  }

  /** 破關特寫：facing 是角色面向（弧度），鏡頭從角色正面偏一點的位置開始慢慢繞 */
  setCinematic(on: boolean, facing = 0) {
    if (on && this.cineTarget === 0) this.cineAngle = facing - 0.45;
    this.cineTarget = on ? 1 : 0;
  }

  get cinematic() {
    return this.cine > 0.01;
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    // 直式畫面視野較窄，稍微拉大 FOV
    this.camera.fov = aspect < 0.75 ? 50 : aspect > 1.4 ? 46 : 42;
    // 橫式（v1.74）：下方中央有角色面板，畫面往上推 6%，角色站低一點、前方看得比較遠
    if (aspect > 1.4) this.camera.setViewOffset(1000 * aspect, 1000, 0, -60, 1000 * aspect, 1000);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  private apply() {
    const off = this.offset.clone().multiplyScalar(1 / this.zoom);
    this.camera.position.copy(this.current).add(off);
    if (this.cine > 0) {
      // 特寫位置：角色前上方（前 11 公尺、高 7 公尺，高過石柱不會被擋）；看向角色腳下偏低處，讓角色出現在畫面上方（下方是破關卡片）
      const c = this.cine * this.cine * (3 - 2 * this.cine);
      this.tmp.set(this.current.x + Math.sin(this.cineAngle) * 11, this.current.y + 7, this.current.z + Math.cos(this.cineAngle) * 11);
      this.camera.position.lerp(this.tmp, c);
      this.camera.lookAt(this.current.x, this.current.y + 0.8 - c * 4.2, this.current.z);
      return;
    }
    this.camera.lookAt(this.current.x, this.current.y + 0.8, this.current.z);
    if (this.shakeAmt > 0) {
      // 低頻抖動（兩個不同頻率的正弦），比隨機亂跳順眼
      const a = this.shakeAmt * this.shakeAmt * 0.45;
      const t = this.shakeT;
      this.camera.position.x += Math.sin(t * 47) * a;
      this.camera.position.y += Math.sin(t * 61 + 1.3) * a * 0.6;
      this.camera.position.z += Math.sin(t * 53 + 2.1) * a * 0.5;
    }
  }
}
