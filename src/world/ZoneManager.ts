import * as THREE from 'three';
import type { PortalDef, ZoneId } from '@/data/types';
import { ZONES } from '@/data/zones';
import { bus } from '@/core/EventBus';
import { Zone } from './Zone';

/**
 * ZoneManager：負責載入/卸載區域、更新場景氛圍（天空、霧）、偵測傳送點。
 */
export class ZoneManager {
  current: Zone | null = null;
  /** 剛抵達時站在傳送點上，要先離開才會再次觸發 */
  private portalArmed = new Set<PortalDef>();

  constructor(private scene: THREE.Scene) {}

  load(id: ZoneId): Zone {
    this.current?.dispose();
    const def = ZONES[id];
    const zone = new Zone(def);
    this.scene.add(zone.group);
    this.scene.background = new THREE.Color(def.skyColor);
    this.scene.fog = new THREE.Fog(def.fogColor, 60, 130);
    this.current = zone;
    this.portalArmed.clear();
    return zone;
  }

  /** 每幀檢查玩家是否踏入傳送點 */
  checkPortals(x: number, z: number) {
    const zone = this.current;
    if (!zone) return;
    for (const p of zone.def.portals) {
      const inside = Math.hypot(x - p.x, z - p.z) < p.radius;
      if (!inside) {
        this.portalArmed.add(p);
        continue;
      }
      if (!this.portalArmed.has(p)) continue;
      this.portalArmed.delete(p);
      if (p.style === 'stone') {
        bus.emit('menu:open', { tab: 'map' });
      } else {
        bus.emit('zone:request', { zoneId: p.to, arrive: p.arrive });
      }
    }
  }

  update(dt: number) {
    this.current?.update(dt);
  }
}
