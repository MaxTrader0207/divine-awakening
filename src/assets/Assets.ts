import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 素材庫（KayKit CC0 模型，見 CREDITS.md）
 * ------------------------------------------------------------
 * - 啟動時一次載入 src/assets/models/*.glb（由 scripts/build-assets.mjs 產生）。
 * - 材質統一換成 Lambert（跟程式產生的物件光影一致、手機上較便宜），並標記為共用，
 *   讓 Zone.mergeStatic() 可以依材質合併、切換區域時不被釋放。
 * - 任何一個模型載入失敗都不影響遊戲：呼叫端用 has() 判斷，沒有就用原本的程式模型。
 */
const URLS = import.meta.glob('./models/*.glb', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

export interface RigInstance {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  /** 換成每隻獨立的材質（受擊閃白用） */
  materials: THREE.MeshLambertMaterial[];
}

class AssetLibrary {
  private gltfs = new Map<string, GLTF>();
  private matCache = new Map<THREE.Material, THREE.MeshLambertMaterial>();
  /** 模型原始高度（公尺），用來自動縮放 */
  private heights = new Map<string, number>();
  private sizes = new Map<string, THREE.Vector3>();
  loaded = false;

  get ids(): string[] {
    return [...this.gltfs.keys()];
  }

  has(id: string): boolean {
    return this.gltfs.has(id);
  }

  async loadAll(onProgress?: (done: number, total: number) => void): Promise<void> {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const entries = Object.entries(URLS);
    let done = 0;
    await Promise.all(
      entries.map(async ([path, url]) => {
        const id = path.split('/').pop()!.replace('.glb', '');
        try {
          const gltf = await loader.loadAsync(url);
          this.prepare(gltf);
          this.gltfs.set(id, gltf);
          const box = new THREE.Box3().setFromObject(gltf.scene);
          this.heights.set(id, box.max.y - box.min.y);
          this.sizes.set(id, box.getSize(new THREE.Vector3()));
          // 靜態模型：底部對齊地面、水平置中
          if (!gltf.animations.length) {
            const c = box.getCenter(new THREE.Vector3());
            gltf.scene.position.set(-c.x, -box.min.y, -c.z);
            const wrap = new THREE.Group();
            wrap.add(gltf.scene);
            gltf.scene = wrap;
          }
        } catch (e) {
          console.warn(`[Assets] 模型載入失敗，改用程式模型：${id}`, e);
        }
        onProgress?.(++done, entries.length);
      }),
    );
    this.loaded = true;
  }

  height(id: string): number {
    return this.heights.get(id) ?? 1;
  }

  size(id: string): THREE.Vector3 {
    return this.sizes.get(id) ?? new THREE.Vector3(1, 1, 1);
  }

  /** 換材質、開陰影、標記共用 */
  private prepare(gltf: GLTF) {
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const src = m.material as THREE.MeshStandardMaterial;
      let lam = this.matCache.get(src);
      if (!lam) {
        lam = new THREE.MeshLambertMaterial({ map: src.map ?? null, color: src.color?.clone() ?? new THREE.Color(0xffffff) });
        if (lam.map) lam.map.colorSpace = THREE.SRGBColorSpace;
        lam.name = src.name; // 保留材質名稱（青蛙依名稱換身體顏色）
        lam.userData.shared = true;
        this.matCache.set(src, lam);
        src.dispose();
      }
      m.material = lam;
      m.geometry.userData.shared = true;
    });
  }

  /** 靜態物件：共用幾何與材質（不要對回傳物件做 dispose） */
  cloneStatic(id: string): THREE.Object3D | null {
    const g = this.gltfs.get(id);
    return g ? g.scene.clone(true) : null;
  }

  /**
   * 會動的角色：骨架獨立複製、材質每隻一份、建立動畫混合器。
   * 共用同一副骨架的蒙皮零件會合併成一個網格（一隻角色的 draw call 從 9 個降到 2~3 個）。
   */
  cloneRig(id: string): RigInstance | null {
    const g = this.gltfs.get(id);
    if (!g) return null;
    const root = cloneSkinned(g.scene);
    const materials: THREE.MeshLambertMaterial[] = [];
    const perInstance = new Map<THREE.Material, THREE.MeshLambertMaterial>();
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const src = m.material as THREE.MeshLambertMaterial;
      let mat = perInstance.get(src);
      if (!mat) {
        mat = src.clone();
        mat.userData = {};
        perInstance.set(src, mat);
        materials.push(mat);
      }
      m.material = mat;
    });
    mergeSkinned(root);
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of g.animations) actions.set(clip.name, mixer.clipAction(clip));
    return { root, mixer, actions, materials };
  }
}

/** 合併同骨架、同材質、同 bindMatrix 的蒙皮網格 */
function mergeSkinned(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const groups = new Map<string, THREE.SkinnedMesh[]>();
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    const key = `${(m.material as THREE.Material).uuid}|${m.skeleton.bones.map((b) => b.name).join(',')}|${m.bindMatrix.elements.map((v) => v.toFixed(4)).join(',')}`;
    let list = groups.get(key);
    if (!list) groups.set(key, (list = []));
    list.push(m);
  });
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const first = list[0];
    const names = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];
    const geos = list.map((m) => {
      const g = new THREE.BufferGeometry();
      const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
      for (const n of names) {
        const a = src.getAttribute(n) as THREE.BufferAttribute | undefined;
        if (a) g.setAttribute(n, toFloat(a));
      }
      return g;
    });
    const sig = (g: THREE.BufferGeometry) => Object.keys(g.attributes).sort().join();
    if (geos.some((g) => sig(g) !== sig(geos[0]))) continue;
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.SkinnedMesh(merged, first.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    first.parent!.add(mesh);
    mesh.bind(first.skeleton, first.bindMatrix);
    for (const m of list) m.removeFromParent();
  }
}

/** 量化（Int16 / normalized）屬性轉回 Float32，合併時型別才一致 */
function toFloat(a: THREE.BufferAttribute): THREE.BufferAttribute {
  const n = a.count;
  const s = a.itemSize;
  const out = new Float32Array(n * s);
  for (let i = 0; i < n; i++) for (let c = 0; c < s; c++) out[i * s + c] = a.getComponent(i, c);
  return new THREE.BufferAttribute(out, s);
}

export const Assets = new AssetLibrary();
