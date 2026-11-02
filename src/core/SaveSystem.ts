import { newGameState, SAVE_VERSION, type GameState } from './GameState';
import { ZONES } from '@/data/zones';

const KEY = 'little-mage.save.v1';

/**
 * 本機存檔（localStorage）
 * - 所有讀寫都包 try/catch：無痕模式或封鎖儲存時遊戲仍可正常遊玩（只是不保存）。
 * - 之後要雲端存檔：實作同樣介面的 CloudSave（Cloudflare Workers + D1）即可替換。
 */
export interface SaveBackend {
  load(): GameState | null;
  save(state: GameState): boolean;
  clear(): void;
}

export class LocalSave implements SaveBackend {
  load(): GameState | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  save(state: GameState): boolean {
    try {
      state.updatedAt = Date.now();
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

/** 舊版存檔遷移。新增欄位時以預設值補齊，避免舊存檔壞掉 */
function migrate(data: Partial<GameState>): GameState | null {
  if (!data || typeof data !== 'object') return null;
  const base = newGameState();
  const merged: GameState = {
    ...base,
    ...data,
    potions: { ...base.potions, ...(data.potions ?? {}) },
    settings: { ...base.settings, ...(data.settings ?? {}) },
    version: SAVE_VERSION,
  };
  if (!ZONES[merged.zoneId]) {
    merged.zoneId = 'town';
    merged.pos = { ...ZONES.town.spawn };
  }
  // 未來版本：if ((data.version ?? 0) < 2) { ... }
  return merged;
}
