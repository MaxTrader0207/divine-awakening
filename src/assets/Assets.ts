import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 素材庫（KayKit CC0 模型，見 CREDITS.md）
 * ------------------------------------------------------------
 * - 啟動時一次載入模型（由 scripts/build-assets.mjs 產生）：
 *   一般版用 src/assets/models/（meshopt 壓縮，需要 WebAssembly 解壓）；
 *   單一 HTML 版（vite --mode single）用 src/assets/models-plain/（只量化、不需要 WebAssembly），
 *   因為 claude.ai Artifact 這類禁止 WebAssembly 的頁面，meshopt 模型會全部載入失敗。
 *   `@models` 這個路徑別名在 vite.config.ts 依模式指向其中一個資料夾。
 * - 材質統一換成 Lambert（跟程式產生的物件光影一致、手機上較便宜），並標記為共用，
 *   讓 Zone.mergeStatic() 可以依材質合併、切換區域時不被釋放。
 * - 任何一個模型載入失敗都不影響遊戲：呼叫端用 has() 判斷，沒有就用原本的程式模型。
 */
const URLS = import.meta.glob('@models/*.glb', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
/** 單一 HTML 版的模型沒有 meshopt 壓縮，不載入解壓器（避免在禁止 WebAssembly 的頁面報錯） */
const NEEDS_MESHOPT = import.meta.env.MODE !== 'single';

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
    if (NEEDS_MESHOPT) {
      try {
        const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
        loader.setMeshoptDecoder(MeshoptDecoder);
      } catch (e) {
        console.warn('[Assets] meshopt 解壓器無法載入', e);
      }
    }
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
  // 依「材質、骨頭順序、bindMatrix」分組
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
    const parts: THREE.SkinnedMesh[] = [];
    const geos: THREE.BufferGeometry[] = [];
    for (const m of list) {
      // 素材管線量化時，每個蒙皮網格的位置縮放 / 位移被折進「自己的」骨架反綁定矩陣：
      //   boneInverse(m)_i = boneInverse(first)_i × M（所有骨頭共用同一個 M）
      // 先把頂點換算到 first 的空間（v' = B⁻¹·M·B·v）才能共用 first 的骨架。
      // 只比骨頭名稱就直接合併的話，身體、腿、手臂會錯位或縮到看不見（v1.20 前的 bug）。
      const corr = m === first ? new THREE.Matrix4() : correction(first, m);
      if (!corr) continue; // 不是同一個 M（不是量化造成的差異）：不合併，保留原網格
      const g = new THREE.BufferGeometry();
      const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
      for (const n of names) {
        const a = src.getAttribute(n) as THREE.BufferAttribute | undefined;
        if (a) g.setAttribute(n, toFloat(a));
      }
      if (m !== first) g.applyMatrix4(corr);
      parts.push(m);
      geos.push(g);
    }
    if (parts.length < 2) continue;
    const sig = (g: THREE.BufferGeometry) => Object.keys(g.attributes).sort().join();
    if (geos.some((g) => sig(g) !== sig(geos[0]))) continue;
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.SkinnedMesh(merged, first.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    first.parent!.add(mesh);
    mesh.bind(first.skeleton, first.bindMatrix);
    for (const m of parts) m.removeFromParent();
  }
}

/** 把 m 的頂點換算到 first 骨架空間的矩陣；各骨頭算出來不一致時回傳 null（不能合併） */
function correction(first: THREE.SkinnedMesh, m: THREE.SkinnedMesh): THREE.Matrix4 | null {
  const A = first.skeleton.boneInverses;
  const Bm = m.skeleton.boneInverses;
  let M: THREE.Matrix4 | null = null;
  for (let i = 0; i < A.length; i++) {
    const inv = A[i].clone();
    if (Math.abs(inv.determinant()) < 1e-12) continue;
    const Mi = inv.invert().multiply(Bm[i]);
    if (!M) {
      M = Mi;
      continue;
    }
    // 檢查每根骨頭的 M 都一樣（容許誤差）
    const scale = Math.max(1e-6, ...M.elements.map(Math.abs));
    for (let k = 0; k < 16; k++) if (Math.abs(Mi.elements[k] - M.elements[k]) > scale * 2e-3) return null;
  }
  if (!M) return null;
  const B = first.bindMatrix;
  return B.clone().invert().multiply(M).multiply(B);
}

function toFloat(a: THREE.BufferAttribute): THREE.BufferAttribute {
  const n = a.count;
  const s = a.itemSize;
  const out = new Float32Array(n * s);
  for (let i = 0; i < n; i++) for (let c = 0; c < s; c++) out[i * s + c] = a.getComponent(i, c);
  return new THREE.BufferAttribute(out, s);
}

export const Assets = new AssetLibrary();
