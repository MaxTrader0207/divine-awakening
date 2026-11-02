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
    this.apply();
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    // 直式畫面視野較窄，稍微拉大 FOV
    this.camera.fov = aspect < 0.75 ? 50 : 42;
    this.camera.updateProjectionMatrix();
  }

  private apply() {
    const off = this.offset.clone().multiplyScalar(1 / this.zoom);
    this.camera.position.copy(this.current).add(off);
    this.camera.lookAt(this.current.x, this.current.y + 0.8, this.current.z);
  }
}
