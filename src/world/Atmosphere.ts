import * as THREE from 'three';

/**
 * 場景氛圍（v1.107）
 * ------------------------------------------------------------
 * 用 onBeforeCompile 在既有的 Lambert / Phong 材質上加幾個便宜的效果（不加後製、不多 draw call）：
 *   - 風（patchWind）：草、花、蘆葦、灌木、樹冠的頂點依世界座標的正弦波左右擺動，越高擺越多。
 *   - 雲影（patchCloud）：地面與散佈物上有大片慢慢飄過的雲的影子（世界座標雜訊）。
 *   - 水面波光（patchWater）：水面上流動的亮紋與細碎反光。
 * 參數共用 ATMOS.uniforms（每幀 Game 呼叫 updateAtmosphere(dt)），依地圖主題調整強度（setAtmosphere）。
 * 低畫質時關掉風與雲影（只改 uniform，不重新編譯）。
 */
export const ATMOS = {
  uniforms: {
    uTime: { value: 0 },
    /** 風的擺幅（公尺，草最高處） */
    uWind: { value: 0.12 },
    /** 風向（xz） */
    uWindDir: { value: new THREE.Vector2(0.8, 0.6) },
    /** 雲影強度（0 = 沒有） */
    uCloud: { value: 0.22 },
    /** 雲的大小（越小雲越大） */
    uCloudScale: { value: 0.045 },
    /** 雲影顏色（偏冷） */
    uCloudTint: { value: new THREE.Color(0.78, 0.84, 1.0) },
    /** 水面波光強度 */
    uShimmer: { value: 0.35 },
  },
};

/** v1.107 全場景的光：色調映射曝光、環境光 / 太陽倍率（乘在地圖主題的光線上） */
export const SCENE_LOOK = { exposure: 1.0, hemiMul: 0.72, sunMul: 1.22 };

export interface AtmosphereLook {
  wind: number;
  cloud: number;
  shimmer: number;
}

/** 依地圖主題：沙漠 / 雪原 / 熔岩 / 地底的風與雲不一樣 */
export const ATMOS_LOOKS: Record<string, AtmosphereLook> = {
  meadow: { wind: 0.14, cloud: 0.22, shimmer: 0.35 },
  forest: { wind: 0.1, cloud: 0.16, shimmer: 0.3 },
  coast: { wind: 0.16, cloud: 0.2, shimmer: 0.45 },
  desert: { wind: 0.08, cloud: 0.12, shimmer: 0.3 },
  mountain: { wind: 0.16, cloud: 0.24, shimmer: 0.35 },
  snow: { wind: 0.12, cloud: 0.1, shimmer: 0.4 },
  swamp: { wind: 0.06, cloud: 0.2, shimmer: 0.25 },
  volcanic: { wind: 0.04, cloud: 0.12, shimmer: 0.2 },
  cave: { wind: 0.0, cloud: 0.0, shimmer: 0.25 },
  underworld: { wind: 0.03, cloud: 0.08, shimmer: 0.2 },
  town: { wind: 0.1, cloud: 0.18, shimmer: 0.35 },
};

let enabled = true;
let look: AtmosphereLook = ATMOS_LOOKS.meadow;

export function setAtmosphere(id: string | undefined, on = enabled) {
  look = ATMOS_LOOKS[id ?? ''] ?? ATMOS_LOOKS.meadow;
  enabled = on;
  const u = ATMOS.uniforms;
  u.uWind.value = on ? look.wind : 0;
  u.uCloud.value = on ? look.cloud : 0;
  u.uShimmer.value = look.shimmer;
}

export function updateAtmosphere(dt: number) {
  ATMOS.uniforms.uTime.value += dt;
}

const NOISE = /* glsl */ `
  float atmosHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float atmosNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(atmosHash(i), atmosHash(i + vec2(1.0, 0.0)), u.x), mix(atmosHash(i + vec2(0.0, 1.0)), atmosHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float atmosFbm(vec2 p) { return atmosNoise(p) * 0.6 + atmosNoise(p * 2.1 + 7.3) * 0.3 + atmosNoise(p * 4.3 + 1.7) * 0.1; }
`;

type Shader = THREE.WebGLProgramParametersWithUniforms;

function chain(mat: THREE.Material, key: string, fn: (s: Shader) => void) {
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile = (s, r) => {
    prev?.call(mat, s, r);
    fn(s);
  };
  mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|${key}`;
  mat.needsUpdate = true;
}

/** 世界座標 varying（雲影、水面要用） */
function addWorldPos(s: Shader) {
  if (s.vertexShader.includes('vAtmosWorld')) return;
  s.vertexShader = s.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vAtmosWorld;')
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 aw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          aw = instanceMatrix * aw;
        #endif
        vAtmosWorld = (modelMatrix * aw).xyz;
      }`,
    );
  s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vAtmosWorld;');
}

/**
 * 風：本地座標 y（0～height）越高擺越多。InstancedMesh 會先用 instanceMatrix 算世界位置當相位，
 * 每株草擺動時間不同；amp 是這種東西的擺動倍率（草 1、灌木 0.4、樹冠 0.25）。
 */
export function patchWind(mat: THREE.Material, amp = 1, height = 1) {
  chain(mat, `wind${amp}:${height}`, (s) => {
    s.uniforms.uTime = ATMOS.uniforms.uTime;
    s.uniforms.uWind = ATMOS.uniforms.uWind;
    s.uniforms.uWindDir = ATMOS.uniforms.uWindDir;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;\nuniform vec2 uWindDir;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec4 base = vec4(0.0, 0.0, 0.0, 1.0);
          #ifdef USE_INSTANCING
            base = instanceMatrix * base;
          #endif
          base = modelMatrix * base;
          float k = clamp(position.y / ${height.toFixed(2)}, 0.0, 1.0);
          k = k * k;
          float ph = uTime * 1.6 + dot(base.xz, uWindDir) * 0.35;
          float gust = 0.6 + 0.4 * sin(uTime * 0.45 + base.x * 0.05);
          float sway = (sin(ph) * 0.7 + sin(ph * 2.3 + 1.3) * 0.3) * uWind * ${amp.toFixed(2)} * gust * k;
          transformed.x += sway * uWindDir.x;
          transformed.z += sway * uWindDir.y;
        }`,
      );
  });
}

/** 雲影：在最後的顏色上乘一層慢慢飄過的冷色影子 */
export function patchCloud(mat: THREE.Material) {
  chain(mat, 'cloud', (s) => {
    addWorldPos(s);
    s.uniforms.uTime = ATMOS.uniforms.uTime;
    s.uniforms.uCloud = ATMOS.uniforms.uCloud;
    s.uniforms.uCloudScale = ATMOS.uniforms.uCloudScale;
    s.uniforms.uCloudTint = ATMOS.uniforms.uCloudTint;
    s.uniforms.uWindDir = ATMOS.uniforms.uWindDir;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uCloud;\nuniform float uCloudScale;\nuniform vec3 uCloudTint;\nuniform vec2 uWindDir;\n${NOISE}`)
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        if (uCloud > 0.0) {
          vec2 cp = vAtmosWorld.xz * uCloudScale + uWindDir * uTime * 0.012;
          float c = smoothstep(0.45, 0.78, atmosFbm(cp));
          gl_FragColor.rgb *= mix(vec3(1.0), uCloudTint * (1.0 - uCloud * 0.6), c * min(1.0, uCloud * 4.0));
        }`,
      );
  });
}

/** 水面：流動的亮紋＋細碎反光（顏色取材質本身的顏色往亮處推） */
export function patchWater(mat: THREE.Material) {
  chain(mat, 'water', (s) => {
    addWorldPos(s);
    s.uniforms.uTime = ATMOS.uniforms.uTime;
    s.uniforms.uShimmer = ATMOS.uniforms.uShimmer;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uShimmer;\n${NOISE}`)
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        {
          vec2 p = vAtmosWorld.xz;
          float w1 = atmosNoise(p * 0.35 + vec2(uTime * 0.25, uTime * 0.12));
          float w2 = atmosNoise(p * 0.6 - vec2(uTime * 0.18, -uTime * 0.21));
          float band = smoothstep(0.62, 0.92, 1.0 - abs(w1 - w2) * 2.2);
          float glint = step(0.985, atmosHash(floor(p * 3.0) + floor(uTime * 2.0))) * 0.8;
          gl_FragColor.rgb += vec3(0.85, 0.95, 1.0) * (band * 0.35 + glint) * uShimmer;
          gl_FragColor.rgb *= 0.92 + 0.08 * w1;
        }`,
      );
  });
}
