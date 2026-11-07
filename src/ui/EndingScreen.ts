import { h } from './dom';
import { ENDING, ENDING_QUOTE } from '@/data/ending';
import { CLASS_CLEAR } from '@/data/stageClear';
import type { HeroClass } from '@/data/classes';

/**
 * 結局畫面（v1.76）：全螢幕星空，段落依序淡入 → 冒險紀錄 → 破關後開放的內容 → 製作名單。
 * 開著時 Game 用 showcaseFrame()（世界停住、只動鏡頭與角色），關閉時呼叫 onClose。
 */
export interface EndingInfo {
  heroClass: HeroClass;
  playerName: string;
  level: number;
  playTime: number;
  kills: number;
  deaths: number;
  bossKills: number;
  companions: number;
  mythics: number;
  towerBest: number;
}

export class EndingScreen {
  private root: HTMLElement;
  private box: HTMLElement;
  private onClose: (() => void) | null = null;
  visible = false;

  constructor(uiRoot: HTMLElement) {
    this.box = h('div', { class: 'end-box' });
    this.root = h('div', { class: 'ending', 'aria-hidden': 'true' }, [h('div', { class: 'end-stars' }), this.box]);
    uiRoot.appendChild(this.root);
  }

  show(info: EndingInfo, onClose?: () => void) {
    this.onClose = onClose ?? null;
    const cc = CLASS_CLEAR[info.heroClass];
    const fill = (t: string) => t.replace('{title}', cc.title).replace('{name}', info.playerName);
    const hrs = Math.floor(info.playTime / 3600);
    const mins = Math.floor((info.playTime % 3600) / 60);
    let i = 0;
    // 每段延遲淡入（--d 秒）
    const fade = (el: HTMLElement, step = 1.4) => {
      el.style.setProperty('--d', `${(i++ * step).toFixed(1)}s`);
      el.classList.add('end-fade');
      return el;
    };
    const stat = (label: string, v: string) => h('div', { class: 'end-stat' }, [h('small', {}, label), h('b', {}, v)]);
    this.box.replaceChildren(
      fade(h('div', { class: 'end-head', style: `--cc:${cc.color};--cg:${cc.glow}` }, [h('small', {}, ENDING.subtitle), h('h1', {}, ENDING.title)]), 0.8),
      ...ENDING.lines.map((t) => fade(h('p', { class: 'end-line' }, fill(t)))),
      fade(h('blockquote', { class: 'end-quote', style: `--cc:${cc.color}` }, [h('span', {}, `「${ENDING_QUOTE[info.heroClass] ?? '這不是結束，是神話的開始。'}」`), h('small', {}, `—— ${cc.title}・${info.playerName}`)])),
      fade(
        h('section', { class: 'end-sec' }, [
          h('h3', {}, '冒險紀錄'),
          h('div', { class: 'end-stats' }, [
            stat('等級', `Lv.${info.level}`),
            stat('遊戲時間', hrs ? `${hrs} 小時 ${mins} 分` : `${mins} 分`),
            stat('擊倒怪物', info.kills.toLocaleString()),
            stat('擊敗首領', info.bossKills.toLocaleString()),
            stat('收服夥伴', `${info.companions} 隻`),
            stat('★神話裝', `${info.mythics} 件`),
            stat('試煉塔最高', info.towerBest ? `第 ${info.towerBest} 層` : '—'),
            stat('倒下次數', info.deaths.toLocaleString()),
          ]),
        ]),
        0.6,
      ),
      fade(
        h('section', { class: 'end-sec' }, [
          h('h3', {}, '破關後開放'),
          ...ENDING.unlocks.map((u) => h('div', { class: 'end-unlock' }, [h('span', {}, u.icon), h('div', {}, [h('b', {}, u.name), h('small', {}, u.desc)])])),
        ]),
        0.6,
      ),
      fade(h('section', { class: 'end-sec end-credits' }, [h('h3', {}, '製作名單'), ...ENDING.credits.map(([k, v]) => h('div', { class: 'end-credit' }, [h('small', {}, k), h('b', {}, v)])), h('p', { class: 'end-thanks' }, ENDING.thanks)]), 0.6),
      fade(h('button', { class: 'ps-btn main end-btn', onclick: () => this.close() }, '繼續冒險'), 0.4),
    );
    // 跳過：還在淡入時點一下畫面 → 全部直接顯示
    this.root.onclick = (ev) => {
      if ((ev.target as HTMLElement).closest('button')) return;
      this.root.classList.add('skip');
    };
    this.root.classList.remove('skip');
    this.box.scrollTop = 0;
    this.visible = true;
    this.root.classList.add('show');
    this.root.setAttribute('aria-hidden', 'false');
  }

  close() {
    if (!this.visible) return;
    this.visible = false;
    this.root.classList.remove('show');
    this.root.setAttribute('aria-hidden', 'true');
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }
}
