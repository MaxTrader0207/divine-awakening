import { describe, expect, it } from 'vitest';
import { normalizeKey } from './InputManager';

describe('normalizeKey', () => {
  it('優先用 e.code', () => {
    expect(normalizeKey({ code: 'KeyW', key: 'ㄊ', keyCode: 229 })).toBe('KeyW');
    expect(normalizeKey({ code: 'ArrowUp' })).toBe('ArrowUp');
  });
  it('拿不到 code 時用 keyCode', () => {
    expect(normalizeKey({ code: '', keyCode: 87 })).toBe('KeyW');
    expect(normalizeKey({ code: 'Unidentified', keyCode: 37 })).toBe('ArrowLeft');
  });
  it('最後用 key', () => {
    expect(normalizeKey({ key: 'd' })).toBe('KeyD');
    expect(normalizeKey({ key: 'S' })).toBe('KeyS');
    expect(normalizeKey({ key: 'Up' })).toBe('ArrowUp');
    expect(normalizeKey({ key: ' ' })).toBe('Space');
  });
  it('輸入法組字中又沒有 code：換不出來', () => {
    expect(normalizeKey({ code: '', key: 'Process', keyCode: 229 })).toBe('');
  });
});
