import type { GameState } from '@/core/GameState';

/**
 * 雲端存檔與排行榜用戶端（後端見 server/）
 * ------------------------------------------------------------
 * - API 位址：網址參數 ?api= > 建置變數 VITE_API_BASE > 預設（部署到 maxwei6699.workers.dev 後的網址）。
 * - 帳號：一台裝置一組 id + token，存在 localStorage；換裝置用「轉移碼」（id.token）。
 * - 所有呼叫都有逾時與錯誤處理；連不上時遊戲照常使用本機存檔。
 */
const DEFAULT_API = 'https://little-mage-api.maxwei6699.workers.dev';
const KEY = 'little-mage.cloud';
const TIMEOUT = 6000;

export interface CloudAccount {
  id: string;
  token: string;
  name: string;
  /** 上次同步時雲端的 updatedAt（用來偵測另一台裝置上傳過） */
  syncedAt?: number;
  auto?: boolean;
}

export interface LeaderRow {
  name: string;
  level: number;
  bosses: number;
  kills: number;
  playTime: number;
  /** v1.71 試煉塔：本週（週一日期）、本週最高層、歷史最高層 */
  towerWeek?: string;
  towerFloor?: number;
  towerBest?: number;
}

export class CloudError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
  }
}

export class Cloud {
  readonly base: string;
  account: CloudAccount | null = null;

  constructor() {
    const q = new URLSearchParams(location.search).get('api');
    this.base = (q || import.meta.env.VITE_API_BASE || DEFAULT_API).replace(/\/+$/, '');
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.account = JSON.parse(raw);
    } catch {
      this.account = null;
    }
  }

  get loggedIn() {
    return !!this.account;
  }

  /** 轉移碼：在另一台裝置輸入即可登入同一個帳號 */
  get transferCode(): string {
    return this.account ? `${this.account.id}.${this.account.token}` : '';
  }

  private saveAccount() {
    try {
      if (this.account) localStorage.setItem(KEY, JSON.stringify(this.account));
      else localStorage.removeItem(KEY);
    } catch {
      /* 無痕模式：本次有效 */
    }
  }

  private async req<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    let res: Response;
    try {
      res = await fetch(this.base + path, {
        method,
        signal: ctrl.signal,
        keepalive: method !== 'GET' && JSON.stringify(body ?? {}).length < 60000,
        headers: {
          'Content-Type': 'application/json',
          ...(auth && this.account ? { Authorization: `Bearer ${this.transferCode}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new CloudError(0, '無法連線到雲端伺服器（離線，或伺服器尚未部署）');
    } finally {
      clearTimeout(t);
    }
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* 非 JSON */
    }
    if (!res.ok) throw new CloudError(res.status, (data as { error?: string })?.error ?? `錯誤 ${res.status}`, data);
    return data as T;
  }

  async health(): Promise<boolean> {
    try {
      await this.req('GET', '/api/health', undefined, false);
      return true;
    } catch {
      return false;
    }
  }

  async register(name: string): Promise<CloudAccount> {
    const r = await this.req<{ id: string; token: string; name: string }>('POST', '/api/register', { name }, false);
    this.account = { ...r, auto: true };
    this.saveAccount();
    return this.account;
  }

  /** 用轉移碼登入（不會立刻下載，呼叫端再決定） */
  loginWithCode(code: string, name = '玩家'): boolean {
    const m = /^([0-9a-f-]{36})\.([0-9a-f]{48})$/.exec(code.trim());
    if (!m) return false;
    this.account = { id: m[1], token: m[2], name, auto: true };
    this.saveAccount();
    return true;
  }

  logout() {
    this.account = null;
    this.saveAccount();
  }

  setAuto(on: boolean) {
    if (!this.account) return;
    this.account.auto = on;
    this.saveAccount();
  }

  /** 上傳；雲端較新時丟出 409（payload.server 有雲端的存檔），force = 覆蓋 */
  async upload(state: GameState, force = false): Promise<number> {
    const r = await this.req<{ updatedAt: number }>('PUT', '/api/save', { data: state, baseUpdatedAt: this.account?.syncedAt, force });
    if (this.account) {
      this.account.syncedAt = r.updatedAt;
      this.saveAccount();
    }
    return r.updatedAt;
  }

  async download(): Promise<{ data: GameState; updatedAt: number }> {
    const r = await this.req<{ data: GameState; updatedAt: number }>('GET', '/api/save');
    if (this.account) {
      this.account.syncedAt = r.updatedAt;
      this.saveAccount();
    }
    return r;
  }

  async submitScore(state: GameState): Promise<number | null> {
    const r = await this.req<{ rank: number | null }>('POST', '/api/score', {
      level: state.level,
      bosses: state.bossesDefeated.length,
      kills: state.stats.kills,
      playTime: Math.round(state.stats.playTime),
      towerWeek: state.tower.week,
      towerFloor: state.tower.weekBest,
      towerBest: state.tower.best,
    });
    return r.rank;
  }

  async leaderboard(by: 'level' | 'kills' | 'tower', week = ''): Promise<LeaderRow[]> {
    const r = await this.req<{ rows: LeaderRow[] }>('GET', `/api/leaderboard?by=${by}&limit=50${by === 'tower' ? `&week=${week}` : ''}`, undefined, false);
    return r.rows;
  }
}
