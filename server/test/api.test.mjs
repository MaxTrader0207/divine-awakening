// 整合測試：先 `npm run db:local && npm run dev`，再 `node test/api.test.mjs`（可用 API=https://... 指定）
const B = process.env.API ?? 'http://127.0.0.1:8787';
const r = async (m, p, body, tok) => { const res = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}), Origin: 'http://localhost:4173' }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await res.json(); } catch {} return { s: res.status, j, cors: res.headers.get('access-control-allow-origin') }; };
const out = {};
out.health = (await r('GET', '/api/health')).s;
out.badName = (await r('POST', '/api/register', { name: '' })).s;
const reg = await r('POST', '/api/register', { name: '小法師Max' }); out.reg = reg.s; out.cors = reg.cors;
const tok = reg.j.id + '.' + reg.j.token;
out.noAuth = (await r('GET', '/api/save')).s;
out.badAuth = (await r('GET', '/api/save', null, reg.j.id + '.' + 'f'.repeat(48))).s;
out.noSave = (await r('GET', '/api/save', null, tok)).s;
const p1 = await r('PUT', '/api/save', { data: { level: 5, gold: 100 } }, tok); out.put1 = p1.s;
out.tooFast = (await r('PUT', '/api/save', { data: { level: 6 } }, tok)).s;
await new Promise(res => setTimeout(res, 4200));
out.conflict = (await r('PUT', '/api/save', { data: { level: 6 }, baseUpdatedAt: p1.j.updatedAt - 1000 }, tok)).s;
out.put2 = (await r('PUT', '/api/save', { data: { level: 7 }, baseUpdatedAt: p1.j.updatedAt }, tok)).s;
out.get = (await r('GET', '/api/save', null, tok)).j.data;
out.score = (await r('POST', '/api/score', { level: 12, bosses: 2, kills: 300, playTime: 3600 }, tok)).j;
out.cheat = (await r('POST', '/api/score', { level: 60, bosses: 3, kills: 999999, playTime: 10 }, tok)).s;
const reg2 = await r('POST', '/api/register', { name: 'Bob' }); await r('POST', '/api/score', { level: 20, bosses: 4, kills: 900, playTime: 7200 }, reg2.j.id + '.' + reg2.j.token);
out.board = (await r('GET', '/api/leaderboard?by=level')).j.rows.map(x => `${x.name} Lv${x.level} k${x.kills}`);
out.big = (await r('PUT', '/api/save', { data: { x: 'a'.repeat(300000) } }, tok)).s;
console.log(JSON.stringify(out, null, 1));
const expect = { health: 200, badName: 400, reg: 201, noAuth: 401, badAuth: 401, noSave: 404, put1: 200, tooFast: 429, conflict: 409, put2: 200, cheat: 400, big: 413 };
const fails = Object.entries(expect).filter(([k, v]) => out[k] !== v);
if (fails.length) { console.error('失敗：', fails); process.exit(1); }
console.log('全部通過');
