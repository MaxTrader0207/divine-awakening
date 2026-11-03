import type { GameState } from '@/core/GameState';
import { TUTORIAL_STEPS, rewardText } from '@/data/tutorial';
import { manualSections } from '@/data/manual';
import { progressText } from '@/systems/Tutorial';
import { h } from './dom';

/**
 * 選單「指引」分頁：
 * - 上半：新手指引的步驟清單（完成 ✓、目前這一步展開說明與進度）、顯示 / 隱藏、重新開始。
 * - 下半：遊戲說明（操作、戰鬥、職業技能、AUTO、裝備強化、商城、地圖副本、每日任務、存檔、小技巧），可展開。
 */
export interface GuideContext {
  state: GameState;
  setHidden(v: boolean): void;
  restart(): void;
  rerender(): void;
}

/** 說明文字的簡單標記：**粗體**、[按鍵] */
function rich(text: string): (HTMLElement | string)[] {
  const out: (HTMLElement | string)[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined ? h('b', {}, m[1]) : h('kbd', {}, m[2]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** 記住哪些說明區塊是打開的（重畫時保持） */
const openSections = new Set<string>(['操作方式']);

export function renderGuide(ctx: GuideContext): HTMLElement[] {
  const t = ctx.state.tutorial;
  const total = TUTORIAL_STEPS.length;
  const doneCount = t.done ? total : t.step;

  const head = h('div', { class: 'card' }, [
    h('h4', {}, t.done ? '📜 新手指引・全部完成！' : `📜 新手指引・${doneCount} / ${total}`),
    h('div', { class: 'guide-bar' }, [h('i', { style: `width:${(doneCount / total) * 100}%` })]),
    h('p', {}, t.done ? '你已經熟悉所有基本玩法了。想再看一次可以重新開始（獎勵不會重複發放）。' : '照著步驟玩，每完成一步都有獎勵。目前的目標會顯示在畫面左上角，地上的金色箭頭會帶你走到目的地。'),
    h('div', { class: 'card-row' }, [
      t.done
        ? h('button', { class: 'go', onclick: () => { ctx.restart(); ctx.rerender(); } }, '重新開始指引')
        : h('button', { class: 'go ghost', onclick: () => { ctx.setHidden(!t.hidden); ctx.rerender(); } }, t.hidden ? '在畫面上顯示指引' : '隱藏畫面上的指引'),
      !t.done && t.step > 0 ? h('button', { class: 'go ghost', onclick: () => { ctx.restart(); ctx.rerender(); } }, '從頭開始') : null,
    ]),
  ]);

  const steps = h(
    'div',
    { class: 'guide-steps' },
    TUTORIAL_STEPS.map((s, i) => {
      const done = t.done || i < t.step;
      const now = !t.done && i === t.step;
      const claimed = i < t.rewarded;
      const prog = now ? progressText(t) : '';
      return h('div', { class: `guide-step${done ? ' done' : ''}${now ? ' now' : ''}` }, [
        h('span', { class: 'gs-mark' }, done ? '✓' : String(i + 1)),
        h('div', {}, [h('b', {}, s.title), h('small', {}, prog ? `${s.text}（${prog}）` : s.text)]),
        h('span', { class: 'gs-reward' }, claimed && !now ? '已領取' : rewardText(s.reward)),
        now ? h('div', { class: 'gs-hint' }, `💡 ${s.hint}`) : null,
      ]);
    }),
  );

  const manual = h(
    'div',
    { class: 'manual' },
    manualSections(ctx.state.heroClass).map((sec) => {
      const d = h('details', {}, [
        h('summary', {}, [h('span', {}, sec.icon), sec.title]),
        h('div', { class: 'mbody' }, [h('ul', {}, sec.lines.map((l) => h('li', {}, rich(l))))]),
      ]) as HTMLDetailsElement;
      d.open = openSections.has(sec.title);
      d.addEventListener('toggle', () => (d.open ? openSections.add(sec.title) : openSections.delete(sec.title)));
      return d;
    }),
  );

  return [head, steps, h('div', { class: 'card' }, [h('h4', {}, '📖 遊戲說明'), h('p', {}, '點標題展開。')]), manual];
}
