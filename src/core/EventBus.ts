import type { ZoneId } from '@/data/types';

/**
 * 型別安全的事件匯流排
 * ------------------------------------------------------------
 * 規範：系統之間不直接互相呼叫，而是透過事件溝通。
 * 新事件一律在 GameEvents 介面登記，payload 用物件。
 */
export interface GameEvents {
  'zone:enter': { zoneId: ZoneId };
  'zone:request': { zoneId: ZoneId; arrive?: { x: number; z: number } };
  'player:changed': void;
  'wallet:changed': void;
  toast: { text: string; duration?: number };
  banner: { text: string };
  'menu:open': { tab?: MenuTab };
  /** HUD 暫停鈕 */
  'pause:toggle': void;
  'camera:zoom': { delta: number };
  'save:request': void;
  'save:written': void;
  /** 任何單位受到傷害（傷害數字、音效、統計會聽這個） */
  'combat:hit': { x: number; y: number; z: number; amount: number; crit: boolean; targetIsPlayer: boolean };
  'enemy:killed': { enemyId: string; name: string; x: number; z: number; level: number; exp: number; gold: [number, number]; gems: number; boss: boolean };
  /** 玩家受到傷害；source = 攻擊者（給自動反擊用） */
  'player:hurt': { amount: number; source: unknown };
  'player:died': void;
  'player:levelup': { level: number };
  'loot:picked': { name: string; rarity: string };
  'settings:changed': void;
  /** 強化一次（成功或失敗） */
  'enhance:done': { success: boolean };
  /** 每日任務變動（HUD 紅點） */
  'quests:changed': void;
  /** 首領開始施放技能（音效警告） */
  'boss:cast': { skill: string };
  'boss:defeated': { zoneId: ZoneId; first: boolean };
  /** 漂浮文字（+金幣、+經驗、升級） */
  'float:text': { x: number; y: number; z: number; text: string; kind: 'gold' | 'exp' | 'info' };
  /** 技能施放（音效、教學用） */
  'skill:cast': { slot: string; id?: string };
  /** AUTO 自動戰鬥開關（新手指引用） */
  'auto:changed': { on: boolean };
  /** 在背包換上裝備 */
  'item:equipped': void;
  /** 在商城買東西 */
  'shop:bought': void;
  /** 新手指引進度變動（HUD 卡片、選單重畫） */
  'tutorial:changed': void;
}

export type MenuTab = 'equip' | 'enhance' | 'shop' | 'quests' | 'guide' | 'rank' | 'map' | 'saves' | 'settings';

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<unknown>>>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(fn as Handler<unknown>);
    return () => set!.delete(fn as Handler<unknown>);
  }

  emit<K extends keyof GameEvents>(type: K, ...args: GameEvents[K] extends void ? [] : [GameEvents[K]]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) fn(args[0]);
  }
}

/** 全域單例 */
export const bus = new EventBus();
