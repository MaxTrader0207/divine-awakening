import { bus } from '@/core/EventBus';
import { VirtualJoystick } from './VirtualJoystick';

/**
 * InputManager：把「鍵盤 + 虛擬搖桿 + 技能按鈕」統一成遊戲用的輸入狀態。
 * 遊戲邏輯只讀 move / pressed，不直接碰 DOM 事件。
 *
 * 鍵位（電腦）：WASD / 方向鍵 = 移動；空白或 J = 普攻；
 * 技能 Q / F / E / R（畫面上的 W 技能因為 W 是移動，改用 F；U/I/O/P 也可以）；1/2 = 藥水；T = AUTO；M = 選單；Esc = 暫停 / 繼續
 *
 * 電腦鍵盤的可靠性（v1.47）：
 * - 按鍵碼先看 e.code；注音等輸入法開著、或舊瀏覽器拿不到 code 時，改用 keyCode / key 換算（normalizeKey）。
 * - 遊戲用到的鍵 preventDefault：方向鍵不會捲動頁面、空白鍵不會「按到」剛點過的按鈕。
 * - 正在輸入文字（輸入框）時不攔截。
 * - 點畫面任何地方都把鍵盤焦點拉回遊戲（嵌在 claude.ai 等網頁框架裡時特別重要）；
 *   電腦上失去焦點時畫面上方顯示「點一下遊戲畫面就能用鍵盤」。
 */
export type ActionKey = 'basic' | 'Q' | 'W' | 'E' | 'R' | 'potionHp' | 'potionMp' | 'auto' | 'menu' | 'pause';

const KEY_BINDINGS: Record<string, ActionKey> = {
  KeyJ: 'basic',
  Space: 'basic',
  KeyQ: 'Q',
  KeyF: 'W',
  KeyE: 'E',
  KeyR: 'R',
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

/** 電腦鍵盤上顯示在技能按鈕角落的鍵 */
export const KEY_LABELS: Partial<Record<ActionKey, string>> = { basic: '空白', Q: 'Q', W: 'F', E: 'E', R: 'R', potionHp: '1', potionMp: '2' };

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** keyCode → code（拿不到 e.code 時用；輸入法開著時 keyCode 可能是 229，那時只能靠 code） */
const KEYCODE: Record<number, string> = {
  87: 'KeyW', 65: 'KeyA', 83: 'KeyS', 68: 'KeyD', 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown',
  32: 'Space', 74: 'KeyJ', 81: 'KeyQ', 70: 'KeyF', 69: 'KeyE', 82: 'KeyR', 85: 'KeyU', 73: 'KeyI', 79: 'KeyO', 80: 'KeyP',
  49: 'Digit1', 50: 'Digit2', 97: 'Digit1', 98: 'Digit2', 84: 'KeyT', 77: 'KeyM', 27: 'Escape',
};

/** 把鍵盤事件換成統一的 code（KeyW、ArrowUp…）；換不出來回傳空字串 */
export function normalizeKey(e: { code?: string; key?: string; keyCode?: number }): string {
  if (e.code && e.code !== 'Unidentified') return e.code;
  if (e.keyCode && KEYCODE[e.keyCode]) return KEYCODE[e.keyCode];
  const k = e.key ?? '';
  if (/^[a-z]$/i.test(k)) return 'Key' + k.toUpperCase();
  if (/^[0-9]$/.test(k)) return 'Digit' + k;
  if (k === ' ' || k === 'Spacebar') return 'Space';
  if (k === 'Esc') return 'Escape';
  if (/^(Arrow)?(Up|Down|Left|Right)$/.test(k)) return 'Arrow' + k.replace('Arrow', '');
  return '';
}

/** 正在打字（名字、轉移碼）：不攔截鍵盤 */
function typing(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

/** 有實體滑鼠 / 觸控板的裝置（電腦） */
export const IS_DESKTOP = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

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
    window.addEventListener(
      'keydown',
      (e) => {
        if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
        const code = normalizeKey(e);
        if (!code) return;
        const action = KEY_BINDINGS[code];
        if (MOVE_KEYS.has(code) || action) e.preventDefault();
        if (e.repeat && this.keys.has(code)) return;
        this.keys.add(code);
        if (action) this.justPressed.add(action);
      },
      true,
    );
    window.addEventListener(
      'keyup',
      (e) => {
        const code = normalizeKey(e);
        if (code) this.keys.delete(code);
        // 輸入法有時候放開的鍵換不出 code：放開任何鍵都順便確認一次（沒有按著的話 keyup 之後就不會再有該鍵）
        if (!code || e.keyCode === 229) this.keys.clear();
      },
      true,
    );
    this.bindPinchZoom();
    const release = () => {
      this.keys.clear();
      this.uiHeld.clear();
    };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', () => document.hidden && release());
    // 點畫面就把鍵盤焦點拉回遊戲（嵌在網頁框架裡時，焦點可能還留在外面的聊天框）
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (typing(e.target)) return;
        const a = document.activeElement as HTMLElement | null;
        if (typing(a)) a!.blur();
        window.focus();
      },
      true,
    );
    if (IS_DESKTOP) this.focusHint(uiRoot);
  }

  /** 電腦：遊戲沒有鍵盤焦點時，在畫面上方提示「點一下」 */
  private focusHint(uiRoot: HTMLElement) {
    const el = document.createElement('div');
    el.className = 'kbd-hint';
    el.textContent = '⌨ 點一下遊戲畫面，就能用鍵盤 WASD 移動';
    uiRoot.appendChild(el);
    const check = () => el.classList.toggle('show', !document.hasFocus() && !document.hidden);
    window.addEventListener('focus', check);
    window.addEventListener('blur', check);
    setInterval(check, 800);
    check();
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
