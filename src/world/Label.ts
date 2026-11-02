import * as THREE from 'three';

export interface LabelOptions {
  fontSize?: number;
  color?: string;
  bg?: string;
  /** 世界單位高度（公尺） */
  scale?: number;
  bold?: boolean;
}

/** 用 Canvas 畫文字，做成永遠面向鏡頭的 Sprite（招牌、傳送點名稱） */
export function makeLabelSprite(text: string, opts: LabelOptions = {}): THREE.Sprite {
  const fontSize = opts.fontSize ?? 40;
  const pad = fontSize * 0.4;
  const font = `${opts.bold === false ? '' : 'bold '}${fontSize}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  const tw = Math.ceil(ctx.measureText(text).width);
  canvas.width = tw + pad * 2;
  canvas.height = fontSize + pad * 2;
  ctx.font = font;
  if (opts.bg && opts.bg !== 'rgba(0,0,0,0)') {
    ctx.fillStyle = opts.bg;
    const r = canvas.height / 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, r);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = fontSize * 0.14;
  ctx.strokeStyle = 'rgba(20,24,36,0.85)';
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + 2);
  ctx.fillStyle = opts.color ?? '#ffffff';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  const s = opts.scale ?? 1;
  sprite.scale.set((canvas.width / canvas.height) * s, s, 1);
  sprite.renderOrder = 10;
  return sprite;
}
