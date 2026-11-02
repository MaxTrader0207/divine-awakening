/**
 * 虛擬搖桿（觸控 / 滑鼠皆可）
 * 固定在左下角；按住拖曳，輸出 -1~1 的二維向量（x 右、y 下）。
 */
export class VirtualJoystick {
  readonly el: HTMLDivElement;
  private knob: HTMLDivElement;
  private pointerId: number | null = null;
  private center = { x: 0, y: 0 };
  private radius = 48;
  value = { x: 0, y: 0 };

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'joystick';
    this.el.innerHTML = '<div class="joy-arrows"><span>▲</span><span>▶</span><span>▼</span><span>◀</span></div>';
    this.knob = document.createElement('div');
    this.knob.className = 'joy-knob';
    this.el.appendChild(this.knob);
    parent.appendChild(this.el);

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
    this.center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    this.radius = r.width * 0.36;
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
    // 死區 0.12
    const m = Math.hypot(nx, ny);
    this.value = m < 0.12 ? { x: 0, y: 0 } : { x: nx, y: ny };
  }
}
