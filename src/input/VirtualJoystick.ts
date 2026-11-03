/**
 * 虛擬搖桿（觸控 / 滑鼠皆可）—— 浮動式
 * ------------------------------------------------------------
 * - 畫面下半部的左側（左手模式時是右側）都是感應區：手指在哪裡按下，搖桿就出現在哪裡，不用對準。
 * - 放開後搖桿回到預設位置（半透明），當作「這裡可以移動」的提示。
 * - 輸出 -1~1 的二維向量（x 右、y 下）；死區 0.12。
 * 感應區比 HUD 先加入 uiRoot，所以藥水、技能等按鈕永遠在它上面，不會被搶走觸控。
 */
export class VirtualJoystick {
  readonly el: HTMLDivElement;
  /** 感應區（看不見） */
  readonly zone: HTMLDivElement;
  private knob: HTMLDivElement;
  private pointerId: number | null = null;
  private center = { x: 0, y: 0 };
  private radius = 48;
  value = { x: 0, y: 0 };

  constructor(parent: HTMLElement) {
    this.zone = document.createElement('div');
    this.zone.className = 'joy-zone';
    parent.appendChild(this.zone);
    this.el = document.createElement('div');
    this.el.className = 'joystick';
    this.el.innerHTML = '<div class="joy-arrows"><span>▲</span><span>▶</span><span>▼</span><span>◀</span></div>';
    this.knob = document.createElement('div');
    this.knob.className = 'joy-knob';
    this.el.appendChild(this.knob);
    parent.appendChild(this.el);

    this.zone.addEventListener('pointerdown', this.onDown);
    this.el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  private onDown = (e: PointerEvent) => {
    if (this.pointerId !== null) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    const r = this.el.getBoundingClientRect();
    const size = r.width;
    // 搖桿移到手指位置（整個圓留在畫面內）
    const parent = this.el.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const half = size / 2;
    const cx = Math.min(parent.left + parent.width - half, Math.max(parent.left + half, e.clientX));
    const cy = Math.min(parent.top + parent.height - half, Math.max(parent.top + half, e.clientY));
    if (e.currentTarget === this.zone) {
      // 用 transform 位移（不改 left/bottom），放開時清掉就回到預設位置
      this.el.style.transform = `translate(${cx - (r.left + half)}px, ${cy - (r.top + half)}px)`;
      this.center = { x: cx, y: cy };
    } else this.center = { x: r.left + half, y: r.top + half };
    this.radius = size * 0.36;
    this.el.classList.add('active');
    this.update(e.clientX, e.clientY);
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.update(e.clientX, e.clientY);
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.value = { x: 0, y: 0 };
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.el.style.transform = '';
    this.el.classList.remove('active');
  };

  private update(px: number, py: number) {
    let dx = px - this.center.x;
    let dy = py - this.center.y;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) {
      dx = (dx / len) * this.radius;
      dy = (dy / len) * this.radius;
    }
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / this.radius;
    const ny = dy / this.radius;
    const m = Math.hypot(nx, ny);
    this.value = m < 0.12 ? { x: 0, y: 0 } : { x: nx, y: ny };
  }
}
