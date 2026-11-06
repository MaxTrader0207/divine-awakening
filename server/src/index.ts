/**
 * 小法師 雲端 API（Cloudflare Workers + D1）
 * ------------------------------------------------------------
 *  POST /api/register            { name }                 → { id, token, name }
 *  GET  /api/save                （需登入）                → { data, updatedAt } | 404
 *  PUT  /api/save                { data, baseUpdatedAt? } → { updatedAt } | 409 衝突
 *  POST /api/score               { level, bosses, kills, playTime, towerWeek?, towerFloor?, towerBest? } → { rank }
 *  GET  /api/leaderboard?by=level|kills&limit=50          → { rows }
 *  GET  /api/leaderboard?by=tower&week=YYYY-MM-DD&limit=50 → { rows }（無盡試煉塔本週排行，v1.71）
 *  GET  /api/health                                       → { ok }
 *
 * 登入：Authorization: Bearer <id>.<token>。token 只在註冊時回傳一次，資料庫只存 SHA-256。
 * 沒有密碼與 email：一台裝置一個帳號；換裝置時用「轉移碼」（就是 id.token）。
 */

export interface Env {
  DB: D1Database;
  /** 允許的網頁來源，逗號分隔；* 代表全部 */
  ALLOWED_ORIGINS: string;
}

const MAX_SAVE_BYTES = 256 * 1024;
const MIN_SAVE_INTERVAL_MS = 4000;
const NAME_RE = /^[\p{L}\p{N}_\- ]{1,16}$/u;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin') ?? '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(req, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const msg = e instanceof HttpError ? e.message : '伺服器錯誤';
      if (!(e instanceof HttpError)) console.error(e);
      return json({ error: msg }, status, cors);
    }
  },
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (path === '/api/health') return json({ ok: true, time: Date.now() });
  if (path === '/api/register' && req.method === 'POST') return register(req, env);
  if (path === '/api/save' && req.method === 'GET') return getSave(req, env);
  if (path === '/api/save' && req.method === 'PUT') return putSave(req, env);
  if (path === '/api/score' && req.method === 'POST') return postScore(req, env);
  if (path === '/api/leaderboard' && req.method === 'GET') return leaderboard(url, env);
  throw new HttpError(404, '找不到這個 API');
}

/* ---------------- 帳號 ---------------- */

async function register(req: Request, env: Env): Promise<Response> {
  const body = await readJson<{ name?: string }>(req, 1024);
  const name = (body.name ?? '').trim();
  if (!NAME_RE.test(name)) throw new HttpError(400, '名稱需為 1~16 個字（中英文、數字、空白、_ -）');
  const id = crypto.randomUUID();
  const token = randomHex(24);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO players (id, token_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(id, await sha256(token), name, now, now).run();
  return json({ id, token, name }, 201);
}

async function auth(req: Request, env: Env): Promise<{ id: string; name: string; updated_at: number }> {
  const h = req.headers.get('Authorization') ?? '';
  const m = /^Bearer ([0-9a-f-]{36})\.([0-9a-f]{48})$/.exec(h);
  if (!m) throw new HttpError(401, '需要登入');
  const row = await env.DB.prepare('SELECT id, name, token_hash, updated_at FROM players WHERE id = ?').bind(m[1]).first<{ id: string; name: string; token_hash: string; updated_at: number }>();
  if (!row || row.token_hash !== (await sha256(m[2]))) throw new HttpError(401, '登入資訊錯誤');
  return row;
}

/* ---------------- 存檔 ---------------- */

async function getSave(req: Request, env: Env): Promise<Response> {
  const p = await auth(req, env);
  const row = await env.DB.prepare('SELECT data, updated_at FROM saves WHERE player_id = ?').bind(p.id).first<{ data: string; updated_at: number }>();
  if (!row) throw new HttpError(404, '雲端還沒有存檔');
  return json({ data: JSON.parse(row.data), updatedAt: row.updated_at });
}

async function putSave(req: Request, env: Env): Promise<Response> {
  const p = await auth(req, env);
  const body = await readJson<{ data?: unknown; baseUpdatedAt?: number; force?: boolean }>(req, MAX_SAVE_BYTES);
  if (!body.data || typeof body.data !== 'object') throw new HttpError(400, '存檔格式錯誤');
  const now = Date.now();
  const cur = await env.DB.prepare('SELECT data, updated_at FROM saves WHERE player_id = ?').bind(p.id).first<{ data: string; updated_at: number }>();
  if (cur) {
    if (now - cur.updated_at < MIN_SAVE_INTERVAL_MS) throw new HttpError(429, '上傳太頻繁，請稍後再試');
    // 衝突：雲端比這台裝置上次同步的版本還新（另一台裝置上傳過）
    if (!body.force && body.baseUpdatedAt !== undefined && cur.updated_at > body.baseUpdatedAt) {
      return json({ error: '雲端有較新的存檔', server: { data: JSON.parse(cur.data), updatedAt: cur.updated_at } }, 409);
    }
  }
  const data = JSON.stringify(body.data);
  await env.DB.prepare('INSERT INTO saves (player_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(player_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at').bind(p.id, data, now).run();
  return json({ updatedAt: now });
}

/* ---------------- 排行榜 ---------------- */

/** 遊戲數值上限（v1.71：最高等級 110、主線 22 層＋野外菁英＋支線守護者） */
const MAX_LEVEL = 110;
const MAX_BOSSES = 60;
const MAX_TOWER = 2000;
const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

async function postScore(req: Request, env: Env): Promise<Response> {
  const p = await auth(req, env);
  const b = await readJson<{ level?: number; bosses?: number; kills?: number; playTime?: number; towerWeek?: string; towerFloor?: number; towerBest?: number }>(req, 2048);
  const level = int(b.level, 1, MAX_LEVEL);
  const bosses = int(b.bosses, 0, MAX_BOSSES);
  const kills = int(b.kills, 0, 10_000_000);
  const playTime = Math.max(0, Math.min(1e8, Number(b.playTime) || 0));
  // 簡單的合理性檢查：擊倒數不可能比遊戲秒數多太多
  if (kills > playTime * 3 + 50) throw new HttpError(400, '數據不合理');
  const towerWeek = typeof b.towerWeek === 'string' && WEEK_RE.test(b.towerWeek) ? b.towerWeek : '';
  const towerFloor = towerWeek ? int(b.towerFloor, 0, MAX_TOWER) : 0;
  const towerBest = Math.max(towerFloor, int(b.towerBest, 0, MAX_TOWER));
  // 試煉塔每層至少要十幾秒：層數不可能比遊戲時間還多
  if (towerBest > playTime / 8 + 5) throw new HttpError(400, '數據不合理');
  const now = Date.now();
  // 本週層數：同一週取較高；新的一週直接換掉；舊的週不覆蓋
  await env.DB.prepare(
    `INSERT INTO scores (player_id, name, level, bosses, kills, play_time, updated_at, tower_week, tower_floor, tower_best) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET name = excluded.name, level = MAX(scores.level, excluded.level), bosses = MAX(scores.bosses, excluded.bosses),
     kills = MAX(scores.kills, excluded.kills), play_time = MAX(scores.play_time, excluded.play_time), updated_at = excluded.updated_at,
     tower_floor = CASE WHEN excluded.tower_week = scores.tower_week THEN MAX(scores.tower_floor, excluded.tower_floor)
                        WHEN excluded.tower_week > scores.tower_week THEN excluded.tower_floor ELSE scores.tower_floor END,
     tower_week = CASE WHEN excluded.tower_week > scores.tower_week THEN excluded.tower_week ELSE scores.tower_week END,
     tower_best = MAX(scores.tower_best, excluded.tower_best)`,
  ).bind(p.id, p.name, level, bosses, kills, playTime, now, towerWeek, towerFloor, towerBest).run();
  const rank = await env.DB.prepare('SELECT COUNT(*) + 1 AS r FROM scores WHERE level > ? OR (level = ? AND kills > ?)').bind(level, level, kills).first<{ r: number }>();
  return json({ rank: rank?.r ?? null });
}

async function leaderboard(url: URL, env: Env): Promise<Response> {
  const q = url.searchParams.get('by');
  const by = q === 'kills' || q === 'tower' ? q : 'level';
  const limit = int(url.searchParams.get('limit') ?? 50, 1, 100);
  const cols = 'name, level, bosses, kills, play_time AS playTime, updated_at AS updatedAt, tower_week AS towerWeek, tower_floor AS towerFloor, tower_best AS towerBest';
  if (by === 'tower') {
    const week = url.searchParams.get('week') ?? '';
    if (!WEEK_RE.test(week)) throw new HttpError(400, '週別格式錯誤');
    const { results } = await env.DB.prepare(`SELECT ${cols} FROM scores WHERE tower_week = ? AND tower_floor > 0 ORDER BY tower_floor DESC, level ASC, updated_at ASC LIMIT ?`).bind(week, limit).all();
    return json({ by, week, rows: results });
  }
  const order = by === 'kills' ? 'kills DESC, level DESC' : 'level DESC, bosses DESC, kills DESC';
  const { results } = await env.DB.prepare(`SELECT ${cols} FROM scores ORDER BY ${order} LIMIT ?`).bind(limit).all();
  return json({ by, rows: results });
}

/* ---------------- 工具 ---------------- */

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

async function readJson<T>(req: Request, maxBytes: number): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, '資料太大');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, 'JSON 格式錯誤');
  }
}

function corsHeaders(origin: string, allowed: string): Record<string, string> {
  const list = (allowed || '*').split(',').map((s) => s.trim());
  const ok = list.includes('*') || list.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin || '*' : list[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function int(v: unknown, lo: number, hi: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
