import { bus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import { CloudError, type Cloud, type LeaderRow } from '@/net/Cloud';
import { h } from './dom';

/**
 * 設定頁的「雲端存檔」卡片，與「排行」分頁。
 * 所有網路呼叫都是非同步：先畫出卡片，結果回來再更新內容。
 */
export interface CloudContext {
  cloud: Cloud;
  state: GameState;
  /** 用雲端存檔取代本機（會重新載入頁面） */
  applyCloudSave(data: GameState): void;
  rerender(): void;
}

const toast = (text: string, duration = 2.2) => bus.emit('toast', { text, duration });

export function renderCloudCard(ctx: CloudContext): HTMLElement {
  const { cloud } = ctx;
  const status = h('p', { class: 'cloud-status' }, '檢查伺服器中…');
  void cloud.health().then((ok) => {
    status.textContent = ok ? `已連線：${cloud.base.replace(/^https?:\/\//, '')}` : '目前連不上雲端伺服器（離線，或伺服器尚未部署）。遊戲會繼續使用本機存檔。';
    status.classList.toggle('bad', !ok);
  });

  const card = h('div', { class: 'card cloud' }, [h('h4', {}, '☁ 雲端存檔'), status]);

  if (!cloud.loggedIn) {
    const name = h('input', { type: 'text', maxlength: 16, placeholder: '玩家名稱（排行榜顯示）', id: 'cloud-name', class: 'txt' });
    name.value = ctx.state.playerName;
    const code = h('input', { type: 'text', placeholder: '轉移碼（另一台裝置的設定頁可以複製）', id: 'cloud-code', class: 'txt' });
    card.append(
      h('p', {}, '建立雲端帳號後，可以把進度存到雲端、換手機繼續玩，並登上排行榜。不需要 email 或密碼。'),
      name,
      h('div', { class: 'card-row' }, [
        h('button', {
          class: 'go',
          onclick: async () => {
            try {
              await cloud.register(name.value.trim());
              await cloud.upload(ctx.state, true);
              await cloud.submitScore(ctx.state).catch(() => null);
              toast('雲端帳號建立完成，已上傳存檔');
            } catch (e) {
              toast((e as Error).message, 3);
            }
            ctx.rerender();
          },
        }, '建立雲端帳號'),
      ]),
      h('div', { class: 'section-title' }, '已經有帳號？'),
      code,
      h('div', { class: 'card-row' }, [
        h('button', {
          class: 'go ghost',
          onclick: async () => {
            if (!cloud.loginWithCode(code.value, ctx.state.playerName)) return toast('轉移碼格式不正確');
            try {
              const r = await cloud.download();
              toast(`找到雲端存檔（Lv.${r.data.level}），載入中…`);
              setTimeout(() => ctx.applyCloudSave(r.data), 800);
            } catch (e) {
              const err = e as CloudError;
              if (err.status === 404) toast('登入成功，雲端還沒有存檔');
              else {
                cloud.logout();
                toast(err.message, 3);
              }
              ctx.rerender();
            }
          },
        }, '用轉移碼登入並下載'),
      ]),
    );
    return card;
  }

  const acc = cloud.account!;
  const conflict = h('div', { class: 'conflict' });
  let confirmDl = false;
  const dlBtn = h('button', { class: 'go ghost' }, '下載雲端存檔');
  dlBtn.addEventListener('click', async () => {
    if (!confirmDl) {
      confirmDl = true;
      dlBtn.textContent = '再按一次：用雲端取代本機進度';
      setTimeout(() => {
        confirmDl = false;
        dlBtn.textContent = '下載雲端存檔';
      }, 3000);
      return;
    }
    try {
      const r = await cloud.download();
      toast(`下載完成（Lv.${r.data.level}），重新載入中…`);
      setTimeout(() => ctx.applyCloudSave(r.data), 800);
    } catch (e) {
      toast((e as Error).message, 3);
    }
  });

  const upload = async (force: boolean) => {
    try {
      await cloud.upload(ctx.state, force);
      const rank = await cloud.submitScore(ctx.state).catch(() => null);
      toast(rank ? `上傳完成・目前排名第 ${rank} 名` : '上傳完成');
      conflict.replaceChildren();
    } catch (e) {
      const err = e as CloudError;
      if (err.status === 409) {
        const server = (err.payload as { server?: { data: GameState; updatedAt: number } })?.server;
        conflict.replaceChildren(
          h('p', {}, `雲端有另一台裝置上傳的較新存檔（Lv.${server?.data.level ?? '?'}，${server ? new Date(server.updatedAt).toLocaleString('zh-TW') : ''}）。要用哪一份？`),
          h('div', { class: 'card-row' }, [
            h('button', { class: 'go ghost', onclick: () => server && ctx.applyCloudSave(server.data) }, '使用雲端的'),
            h('button', { class: 'go danger', onclick: () => upload(true) }, '用這台覆蓋雲端'),
          ]),
        );
      } else toast(err.message, 3);
    }
  };

  const auto = h('input', { type: 'checkbox', id: 'cloud-auto' });
  auto.checked = acc.auto !== false;
  auto.addEventListener('change', () => cloud.setAuto(auto.checked));

  const codeBox = h('code', { class: 'code' }, '••••••••（按「顯示」）');
  card.append(
    h('p', {}, `帳號：${acc.name}${acc.syncedAt ? `・上次同步 ${new Date(acc.syncedAt).toLocaleString('zh-TW')}` : ''}`),
    h('div', { class: 'card-row' }, [h('button', { class: 'go', onclick: () => upload(false) }, '上傳存檔'), dlBtn]),
    conflict,
    h('label', { class: 'set-row', for: 'cloud-auto' }, [h('span', {}, '自動上傳（每 5 分鐘、擊敗首領時）'), auto]),
    h('div', { class: 'section-title' }, '轉移碼（換裝置時在新裝置輸入；不要給別人）'),
    codeBox,
    h('div', { class: 'card-row' }, [
      h('button', { class: 'go ghost small', onclick: () => (codeBox.textContent = cloud.transferCode) }, '顯示'),
      h('button', {
        class: 'go ghost small',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(cloud.transferCode);
            toast('已複製轉移碼');
          } catch {
            codeBox.textContent = cloud.transferCode;
            toast('無法自動複製，請手動選取');
          }
        },
      }, '複製'),
      h('button', {
        class: 'go ghost small',
        onclick: () => {
          cloud.logout();
          toast('已登出（雲端資料仍保留，可用轉移碼登回）');
          ctx.rerender();
        },
      }, '登出'),
    ]),
  );
  return card;
}

/* ======================= 排行 ======================= */

let board: 'level' | 'kills' = 'level';

export function renderLeaderboard(ctx: CloudContext): HTMLElement[] {
  const { cloud } = ctx;
  const list = h('div', { class: 'card lb' }, [h('p', {}, '讀取中…')]);
  const seg = h('div', { class: 'seg seg2' }, [
    h('button', { class: `seg-btn${board === 'level' ? ' on' : ''}`, onclick: () => ((board = 'level'), ctx.rerender()) }, '等級榜'),
    h('button', { class: `seg-btn${board === 'kills' ? ' on' : ''}`, onclick: () => ((board = 'kills'), ctx.rerender()) }, '擊倒榜'),
  ]);
  void cloud
    .leaderboard(board)
    .then((rows: LeaderRow[]) => {
      if (!rows.length) return list.replaceChildren(h('p', {}, '還沒有人上榜，成為第一個吧！'));
      const me = cloud.account?.name;
      list.replaceChildren(
        ...rows.map((r, i) =>
          h('div', { class: `lb-row${r.name === me ? ' me' : ''}` }, [
            h('b', { class: `rank r${i + 1}` }, String(i + 1)),
            h('span', { class: 'lb-name' }, r.name),
            h('span', {}, board === 'level' ? `Lv.${r.level}・首領 ${r.bosses}` : `擊倒 ${r.kills.toLocaleString()}`),
          ]),
        ),
      );
    })
    .catch((e: Error) => list.replaceChildren(h('p', { class: 'cloud-status bad' }, e.message)));
  const out: HTMLElement[] = [seg, list];
  if (!cloud.loggedIn) out.unshift(h('div', { class: 'card' }, [h('p', {}, '到「設定 → 雲端存檔」建立帳號，你的成績就會出現在排行榜。')]));
  else
    out.unshift(
      h('div', { class: 'card-row' }, [
        h('button', {
          class: 'go small',
          onclick: async () => {
            try {
              const rank = await cloud.submitScore(ctx.state);
              toast(rank ? `成績已更新・第 ${rank} 名` : '成績已更新');
              ctx.rerender();
            } catch (e) {
              toast((e as Error).message, 3);
            }
          },
        }, '更新我的成績'),
      ]),
    );
  return out;
}
