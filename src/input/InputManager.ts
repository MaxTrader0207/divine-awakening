import { bus } from '@/core/EventBus';
import { VirtualJoystick } from './VirtualJoystick';

/**
 * InputManager：把「鍵盤 + 虛擬搖桿 + 技能按鈕」統一成遊戲用的輸入狀態。
 * 遊戲邏輯只讀 move / pressed，不直接碰 DOM 事件。
 *
 * 鍵位（電腦測試用）：WASD / 方向鍵 = 移動；J 或空白 = 普攻；
 * 技能 Q/W/E/R 因為 W 與移動衝突，鍵盤改用 U/I/O/P；1/2 = 藥水；T = AUTO；M = 選單；Esc = 暫停 / 繼續
 */
export type ActionKey = 'basic' | 'Q' | 'W' | 'E' | 'R' | 'potionHp' | 'potionMp' | 'auto' | 'menu' | 'pause';

const KEY_BINDINGS: Record<string, ActionKey> = {
  KeyJ: 'basic',
  Space: 'basic',
  KeyU: 'Q',
  KeyI: 'W',
  KeyO: 'E',
  KeyP: 'R',
  Digit1: 'potionHp',
  Digit2: 'potionMp',
  KeyT: 'auto',
  Escape: 'pause',
  KeyM: 'menu',
};

export class InputManager {
  readonly joystick: VirtualJoystick;
  private keys = new Set<string>();
  private justPressed = new Set<ActionKey>();
  /** UI 按鈕目前按住的動作 */
  private uiHeld = new Set<ActionKey>();
  /** 世界移動向量（x 東、z 南），長度 0~1 */
  readonly move = { x: 0, z: 0 };

  constructor(uiRoot: HTMLElement) {
    this.joystick = new VirtualJoystick(uiRoot);
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      const action = KEY_BINDINGS[e.code];
      if (action) this.justPressed.add(action);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    this.bindPinchZoom();
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.uiHeld.clear();
    });
  }

  /**
   * 鏡頭遠近：手機雙指開合、電腦滑鼠滾輪（取代原本常駐在畫面上的 − / + 按鈕）。
   * 只在 3D 畫面本身（canvas）上觸發，不會跟搖桿、技能按鈕搶觸控。
   */
  private bindPinchZoom() {
    const pts = new Map<number, { x: number; y: number }>();
    let lastDist = 0;
    const canvas = () => document.getElementById('game-canvas');
    window.addEventListener('pointerdown', (e) => {
      if (e.target !== canvas()) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        lastDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    window.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size !== 2 || lastDist <= 0) return;
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      // 每開合 60px 約變 0.1
      const delta = (d - lastDist) / 600;
      if (Math.abs(delta) >= 0.01) {
        bus.emit('camera:zoom', { delta });
        lastDist = d;
      }
    });
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) lastDist = 0;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener(
      'wheel',
      (e) => {
        if (e.target !== canvas()) return;
        bus.emit('camera:zoom', { delta: e.deltaY > 0 ? -0.05 : 0.05 });
      },
      { passive: true },
    );
  }

  /** UI 按鈕呼叫，等同按下一次動作鍵 */
  trigger(action: ActionKey) {
    this.justPressed.add(action);
  }

  /** UI 按鈕按住 / 放開（支援按住普攻連續攻擊） */
  setHeld(action: ActionKey, down: boolean) {
    if (down) {
      this.uiHeld.add(action);
      this.justPressed.add(action);
    } else this.uiHeld.delete(action);
  }

  /** 動作鍵目前是否按住（鍵盤或 UI） */
  held(action: ActionKey): boolean {
    if (this.uiHeld.has(action)) return true;
    for (const [code, a] of Object.entries(KEY_BINDINGS)) if (a === action && this.keys.has(code)) return true;
    return false;
  }

  /** 清掉還沒處理的按鍵（暫停 / 繼續時用，避免恢復後誤觸） */
  clearPressed() {
    this.justPressed.clear();
    this.uiHeld.clear();
  }

  /** 本幀是否按下（讀取後清除） */
  consume(action: ActionKey): boolean {
    return this.justPressed.delete(action);
  }

  /** 每幀開頭呼叫 */
  update() {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    const kl = Math.hypot(x, z);
    if (kl > 0) {
      this.move.x = x / kl;
      this.move.z = z / kl;
      return;
    }
    // 攝影機固定朝北，因此搖桿的「上」直接對應世界 -z
    const j = this.joystick.value;
    const jl = Math.min(1, Math.hypot(j.x, j.y));
    if (jl > 0) {
      const n = Math.hypot(j.x, j.y);
      this.move.x = (j.x / n) * jl;
      this.move.z = (j.y / n) * jl;
    } else {
      this.move.x = 0;
      this.move.z = 0;
    }
  }

  /** 每幀結尾呼叫：清掉沒被讀取的按鍵，避免殘留 */
  endFrame() {
    this.justPressed.clear();
  }
}
