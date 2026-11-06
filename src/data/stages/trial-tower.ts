import type { StageDef, ZoneDef } from '../types';
import { pillarRing } from './helpers';

/**
 * 無盡試煉塔（v1.70）
 * 奧林帕斯山腳下的試煉之塔，傳說海克力斯的十二試煉就是從這裡開始。
 * 地圖本身沒有固定的怪：每一層的敵人由 systems/TrialTower.ts 依層數產生，Game 的 tower 流程負責生成與結算。
 * 從地圖頁「無盡試煉塔」進入（擊敗第三層首領後開放），不列在野外清單。
 */
const zone: ZoneDef = {
  id: 'trial_tower',
  kind: 'dungeon',
  music: 'titan',
  bossMusic: 'boss',
  name: '無盡試煉塔',
  subtitle: '無盡試煉塔・層層變強',
  region: '奧林帕斯山腳',
  safe: false,
  tower: true,
  size: { w: 46, d: 50 },
  groundColor: 0x6a6070,
  skyColor: 0x2a2440,
  fogColor: 0x3a3050,
  fogRange: [34, 80],
  patches: [
    { x: 0, z: 0, w: 26, d: 26, color: 0x8a8090 },
    { x: 0, z: 17, w: 5, d: 10, color: 0x9a90a0 },
  ],
  props: [
    { kind: 'stonering', x: 0, z: 0, w: 30, d: 30, color: 0xb0a8c0 },
    ...pillarRing(0, 0, 16, 14, 0xd8d0e8),
    { kind: 'crystal', x: -12, z: -12, color: 0xb48cff },
    { kind: 'crystal', x: 12, z: -12, color: 0xb48cff },
    { kind: 'crystal', x: -13, z: 9, color: 0x8fe3ff },
    { kind: 'crystal', x: 13, z: 9, color: 0x8fe3ff },
    { kind: 'statue', x: -6, z: -18, rot: 0 },
    { kind: 'statue', x: 6, z: -18, rot: 0 },
    { kind: 'decor', x: -3, z: 20, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3, z: 20, h: 1.6, model: 'torch', solid: false },
  ],
  portals: [{ x: 0, z: 24, radius: 2.2, to: 'town', arrive: { x: 0, z: 4 }, label: '離開試煉塔', style: 'edge' }],
  spawn: { x: 0, z: 12 },
  tips: [
    '無盡試煉塔：每層打倒全部敵人就上樓，每 5 層有首領',
    '每層有時間限制，時間到或倒下就結算；在塔裡倒下不會掉金幣',
    '每 10 層是檢查點，下次可以從最高的檢查點開始',
    '每週一 00:00 重置本週紀錄，本週第一次打到新的首領層會拿到鑽石',
  ],
  spawns: [],
};

export const trialTower: StageDef = { zone, enemies: {} };
