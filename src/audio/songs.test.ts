import { describe, expect, it } from 'vitest';
import { SONGS } from './songs';
import { compile, noteToMidi, parseChord } from './Music';

describe('背景音樂曲譜', () => {
  it('音名與和弦解析', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('F#5')).toBe(78);
    expect(noteToMidi('Bb4')).toBe(70);
    expect(parseChord('Em')).toEqual({ root: 4, tones: [0, 3, 7] });
    expect(parseChord('G7').tones).toEqual([0, 4, 7, 10]);
    expect(() => parseChord('Hm')).toThrow();
  });

  it('每首曲子都能展開，格數與小節數正確', () => {
    for (const def of Object.values(SONGS)) {
      const c = compile(def);
      expect(c.bars.length, def.id).toBeGreaterThan(0);
      expect(def.bass.pattern, def.id).toHaveLength(16);
      for (const p of [def.drums, def.phase2Drums, ...Object.values(def.sections).flatMap((s) => [s.drums, s.first, s.fill])])
        for (const v of Object.values(p ?? {})) expect(v, def.id).toHaveLength(16);
    }
  });

  it('探險曲輕快、魔王曲比較快且有二階段聲部', () => {
    for (const id of ['town', 'grassland', 'forest', 'dungeon', 'sea', 'inferno', 'wild'] as const) expect(SONGS[id].bpm).toBeGreaterThanOrEqual(90);
    for (const id of ['boss', 'titan', 'final'] as const) {
      expect(SONGS[id].bossFight, id).toBe(true);
      expect(SONGS[id].bpm, id).toBeGreaterThan(Math.max(SONGS.grassland.bpm, SONGS.dungeon.bpm, SONGS.wild.bpm));
      expect(SONGS[id].phase2Drums, id).toBeTruthy();
    }
    expect(SONGS.victory.loop).toBe(false);
  });

  it('強拍上的旋律音大多是和弦音（避免不和諧）', () => {
    for (const def of Object.values(SONGS)) {
      const c = compile(def);
      let total = 0;
      let inChord = 0;
      for (const bar of c.bars)
        for (const [step, ev] of bar.melody) {
          if (step % 8) continue;
          const ch = [...bar.chords].reverse().find((x) => x.step <= step)!;
          total++;
          if (ch.tones.some((t) => (ch.root + t) % 12 === ev.midi % 12)) inChord++;
        }
      expect(inChord / total, def.id).toBeGreaterThan(0.8);
    }
  });
});
