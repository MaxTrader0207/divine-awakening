import { describe, expect, it } from 'vitest';
import { DUNGEON_ORDER, ENEMIES, STAGES, ZONES, bossOf, floorLabel, lootTierOf } from './stages';
import { BOSS_SKILLS } from './bossSkills';
import { ENEMY_SHAPES, RIG_ANIMS } from '@/entities/enemyShapes';
import { SONGS } from '@/audio/songs';
import { buildZoneCollision, reachable } from '@/world/zoneCollision';

/**
 * 內容一致性檢查：新增關卡、小怪、首領、招式後跑 `npm test`，這裡會抓出漏接的地方。
 * （每一條失敗訊息都說明要改哪裡）
 */
describe('內容一致性（關卡 / 小怪 / 首領 / 招式）', () => {
  it('關卡 id 不重複，ZONES 與 STAGES 一致', () => {
    const ids = STAGES.map((s) => s.zone.id);
    expect(new Set(ids).size, '關卡 id 重複').toBe(ids.length);
    expect(Object.keys(ZONES).sort()).toEqual([...ids].sort());
  });

  it('每個出生點都找得到敵人，每個敵人都有地方出生，而且在地圖範圍內', () => {
    const used = new Set<string>();
    for (const st of STAGES) {
      const { w, d } = st.zone.size;
      for (const sp of st.zone.spawns ?? []) {
        expect(ENEMIES[sp.enemy], `${st.zone.id} 的出生點用到不存在的敵人「${sp.enemy}」`).toBeTruthy();
        expect(Math.abs(sp.x) <= w / 2 && Math.abs(sp.z) <= d / 2, `${st.zone.id} 的 ${sp.enemy} 出生點在地圖外`).toBe(true);
        used.add(sp.enemy);
      }
      for (const id of Object.keys(st.enemies)) {
        expect(st.enemies[id].id, `敵人 key 與 id 不一致：${id}`).toBe(id);
        expect(used.has(id) || (st.zone.spawns ?? []).some((s) => s.enemy === id), `敵人「${id}」沒有出現在 ${st.zone.id} 的 spawns`).toBe(true);
      }
    }
  });

  it('敵人名稱不重複；造型與模型都有登記', () => {
    const names = Object.values(ENEMIES).map((e) => e.name);
    expect(new Set(names).size, '敵人名稱重複').toBe(names.length);
    for (const e of Object.values(ENEMIES)) {
      expect(ENEMY_SHAPES[e.shape], `「${e.name}」的 shape「${e.shape}」沒有在 entities/enemyShapes/index.ts 登記`).toBeTruthy();
      if (e.model) expect(RIG_ANIMS[e.model], `「${e.name}」的 model「${e.model}」沒有在 enemyShapes/rigs.ts 登記動畫`).toBeTruthy();
    }
  });

  it('每個副本剛好一個首領；首領的招式都在招式庫；小怪沒有招式', () => {
    for (const id of DUNGEON_ORDER) {
      const bosses = (ZONES[id].spawns ?? []).filter((s) => ENEMIES[s.enemy]?.boss);
      expect(bosses.length, `副本 ${id} 應該剛好有 1 個首領`).toBe(1);
    }
    for (const e of Object.values(ENEMIES)) {
      if (e.boss) {
        expect(e.bossSkills?.length, `首領「${e.name}」沒有招式`).toBeGreaterThan(0);
        for (const sk of e.bossSkills ?? []) expect(BOSS_SKILLS[sk], `首領「${e.name}」的招式「${sk}」不在 data/bossSkills.ts`).toBeTruthy();
      } else expect(e.bossSkills, `小怪「${e.name}」不該有首領招式`).toBeUndefined();
    }
  });

  it('副本層數從 1 連續；解鎖條件指向前一層；小怪防禦與地圖標示一致', () => {
    DUNGEON_ORDER.forEach((id, i) => {
      const dg = ZONES[id].dungeon!;
      expect(dg.floor, `${id} 的層數`).toBe(i + 1);
      if (i === 0) expect(dg.unlockAfter).toBeUndefined();
      else expect(dg.unlockAfter, `${id} 應該在擊敗 ${DUNGEON_ORDER[i - 1]} 後解鎖`).toBe(DUNGEON_ORDER[i - 1]);
      const st = STAGES.find((s) => s.zone.id === id)!;
      for (const e of Object.values(st.enemies)) expect(e.stats.def, `${id} 的「${e.name}」防禦應為 ${dg.enemyDefense}`).toBe(dg.enemyDefense);
    });
  });

  it('敵人等級落在關卡建議等級內（首領可以高 3 級）', () => {
    for (const st of STAGES) {
      const r = st.zone.levelRange;
      if (!r) continue;
      for (const e of Object.values(st.enemies)) {
        expect(e.level, `${st.zone.id}「${e.name}」等級太低`).toBeGreaterThanOrEqual(r[0]);
        expect(e.level, `${st.zone.id}「${e.name}」等級太高`).toBeLessThanOrEqual(r[1] + (e.boss ? 3 : 0));
      }
    }
  });

  it('傳送點目的地存在、抵達點在地圖內；背景音樂存在', () => {
    for (const st of STAGES) {
      for (const p of st.zone.portals) {
        const to = ZONES[p.to];
        expect(to, `${st.zone.id} 的傳送點通往不存在的 ${p.to}`).toBeTruthy();
        if (p.arrive) expect(Math.abs(p.arrive.x) <= to.size.w / 2 && Math.abs(p.arrive.z) <= to.size.d / 2, `${st.zone.id} → ${p.to} 的抵達點在地圖外`).toBe(true);
      }
      if (st.zone.music) expect(SONGS[st.zone.music as keyof typeof SONGS], `${st.zone.id} 的音樂「${st.zone.music}」不存在`).toBeTruthy();
    }
  });

  it('從入口走得到首領與每個傳送點（牆、水、高台不會把路堵死）', () => {
    for (const st of STAGES) {
      const col = buildZoneCollision(st.zone);
      const boss = (st.zone.spawns ?? []).find((sp) => ENEMIES[sp.enemy]?.boss);
      if (boss) expect(reachable(col, st.zone.spawn, boss, 0.55, 3.5), `${st.zone.id}：從入口走不到首領 ${boss.enemy}`).toBe(true);
      for (const p of st.zone.portals) expect(reachable(col, st.zone.spawn, p, 0.55, p.radius + 1), `${st.zone.id}：從入口走不到傳送點 ${p.label}`).toBe(true);
    }
  });

  it('首領查詢', () => {
    expect(bossOf('dungeon_1')?.name).toBe('巨蟹卡基諾斯');
    expect(bossOf('dungeon_22')?.name).toBe('塔爾塔洛斯獄龍坎佩');
    expect(bossOf('mistwood')?.name).toBe('龍牙將軍');
    expect(bossOf('town')).toBeUndefined();
    expect(DUNGEON_ORDER.map(lootTierOf)).toEqual([1, 2, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8]);
    expect(lootTierOf('mistwood')).toBe(4);
    expect([1, 10, 11, 12, 20, 25].map(floorLabel)).toEqual(['第一層', '第十層', '第十一層', '第十二層', '第二十層', '第二十五層']);
  });
});
