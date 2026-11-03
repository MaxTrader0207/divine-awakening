import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 首領材質（v1.41）：在 Lambert / Phong 的光影上再加三層，讓程式模型看起來更立體、更細緻。
 * 1. 高光：程式模型改用 Phong（低光澤），圓滑的身體會有柔和的反光點。
 * 2. 地面遮蔽（假 AO）：越靠近腳底越暗（依世界高度，相對首領腳下與身高），肚子、腿內側不再平平一片亮。
 * 3. 邊緣光（rim light）：輪廓邊緣微微發亮（取首領亮色），在暗的地圖上也看得清楚剪影。
 * 只用 onBeforeCompile 插幾行 shader，所有首領共用同一支程式（customProgramCacheKey），受擊閃白、前搖泛紅（emissive）照常運作。
 */
export class BossLook {
  readonly uniforms = {
    uBaseY: { value: 0 },
    uHeight: { value: 2 },
    uRim: { value: new THREE.Color(0xffffff) },
  };

  constructor(rimColor: number) {
    // 邊緣光：首領亮色往白色靠一點，強度在 shader 裡調
    this.uniforms.uRim.value.set(rimColor).lerp(new THREE.Color(0xfff4e0), 0.5);
  }

  /** 每幀更新腳底高度與身高（高台、跳躍時 AO 跟著走） */
  update(baseY: number, height: number) {
    this.uniforms.uBaseY.value = baseY;
    this.uniforms.uHeight.value = Math.max(0.5, height);
  }

  /** 程式模型零件的材質 */
  material(params: { color?: number; vertexColors?: boolean }): THREE.MeshPhongMaterial {
    const mat = new THREE.MeshPhongMaterial({
      ...params,
      specular: 0x2c2a28,
      shininess: 24,
      flatShading: false,
    });
    this.apply(mat);
    return mat;
  }

  /** 套用到既有材質（外部模型，例如堤豐巨蛙） */
  apply(mat: THREE.Material) {
    const u = this.uniforms;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uBaseY = u.uBaseY;
      sh.uniforms.uHeight = u.uHeight;
      sh.uniforms.uRim = u.uRim;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vBossWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvBossWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vBossWorld;\nuniform float uBaseY;\nuniform float uHeight;\nuniform vec3 uRim;')
        .replace(
          '#include <opaque_fragment>',
          `{
            float hB = clamp((vBossWorld.y - uBaseY) / uHeight, 0.0, 1.0);
            outgoingLight *= mix(0.6, 1.0, smoothstep(0.0, 0.5, hB));
            float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
            outgoingLight += uRim * pow(fr, 3.0) * 0.3 * (0.5 + 0.5 * hB);
          }
          #include <opaque_fragment>`,
        );
    };
    mat.customProgramCacheKey = () => 'bossLook';
    mat.needsUpdate = true;
  }
}

/** 外部模型（平面著色的 glb）重算平滑法線：同位置的頂點合併後再算法線 */
export function smoothNormals(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.clone();
  g.deleteAttribute('normal');
  const merged = mergeVertices(g, 1e-4);
  merged.computeVertexNormals();
  return merged;
}
