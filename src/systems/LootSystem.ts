import * as THREE from 'three';
import { bus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { Rarity } from '@/data/types';
import { RARITY } from '@/data/items';
import type { Player } from '@/entities/Player';
import { makeLabelSprite } from '@/world/Label';
import { addItem, itemName } from './Inventory';
import { POTION_DROP_CHANCE, rollDrop } from './LootTable';
import type { Effects } from './Effects';

/**
 * 地上掉落物
 * - 敵人死亡時依 LootTable 擲骰，掉在屍體旁邊，有稀有度顏色的光柱與名稱。
 * - 玩家靠近 1.8m 自動撿起（手機上不必再按鍵）；AUTO 會主動走過來撿。
 * - 60 秒沒撿會消失；切換區域時全部清除。
 */
type DropKind = { type: 'item'; base: string; rarity: Rarity } | { type: 'potion'; potion: 'hp' | 'mp'; count: number };

interface Drop {
  kind: DropKind;
  object: THREE.Group;
  x: number;
  z: number;
  t: number;
  life: number;
  bob: THREE.Object3D;
}

const PICKUP_RANGE = 1.8;
const DESPAWN = 60;

export class LootSystem {
  drops: Drop[] = [];
  private fullWarned = 0;

  constructor(
    private scene: THREE.Scene,
    private state: GameState,
    private player: Player,
    private effects: Effects,
    /** 目前區域的裝備階級 */
    private zoneTier: () => number,
    /** 撿到裝備後（重算屬性、存檔） */
    private onInventoryChanged: () => void,
    private heightAt: (x: number, z: number) => number = () => 0,
  ) {
    bus.on('enemy:killed', (k) => {
      const tier = this.zoneTier();
      const n = k.boss ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const d = rollDrop(tier, k.boss);
        if (d) this.spawn({ type: 'item', ...d }, k.x, k.z);
      }
      if (!k.boss && k.gold[1] > 0 && Math.random() < POTION_DROP_CHANCE) {
        this.spawn({ type: 'potion', potion: Math.random() < 0.6 ? 'hp' : 'mp', count: 1 }, k.x, k.z);
      }
      if (k.boss) this.spawn({ type: 'potion', potion: 'hp', count: 5 }, k.x, k.z);
    });
  }

  spawn(kind: DropKind, x: number, z: number) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.6 + Math.random() * 0.9;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    const g = new THREE.Group();
    g.position.set(px, this.heightAt(px, pz), pz);
    const color = kind.type === 'item' ? new THREE.Color(RARITY[kind.rarity].color).getHex() : kind.potion === 'hp' ? 0xff6a55 : 0x5cb2ff;
    const bob = new THREE.Group();
    g.add(bob);
    if (kind.type === 'item') {
      // 小寶箱
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.4), new THREE.MeshLambertMaterial({ color: 0x9a6a3a, flatShading: true }));
      box.position.y = 0.25;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.43), new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35, flatShading: true }));
      lid.position.y = 0.5;
      box.castShadow = lid.castShadow = true;
      bob.add(box, lid);
    } else {
      const flask = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.4 }));
      flask.position.y = 0.35;
      bob.add(flask);
    }
    // 光柱：稀有度越高越亮
    const strength = kind.type === 'item' ? ['common', 'fine', 'rare', 'epic'].indexOf(kind.rarity) : 0;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.3, 2.4 + strength * 0.8, 10, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 + strength * 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    beam.position.y = (2.4 + strength * 0.8) / 2;
    g.add(beam);
    if (kind.type === 'item') {
      const label = makeLabelSprite(`${RARITY[kind.rarity].name}・裝備`, { fontSize: 34, color: RARITY[kind.rarity].color, bg: 'rgba(20,24,36,0.7)', scale: 0.55 });
      label.position.y = 1.3;
      g.add(label);
    }
    this.scene.add(g);
    this.drops.push({ kind, object: g, x: px, z: pz, t: Math.random() * 6, life: DESPAWN, bob });
  }

  /** 最近的掉落物（AUTO 用；背包滿時忽略裝備） */
  nearest(maxRange = 14): { x: number; z: number } | null {
    const p = this.player.pos;
    const full = this.state.inventory.length >= 40;
    let best: Drop | null = null;
    let bd = maxRange;
    for (const d of this.drops) {
      if (full && d.kind.type === 'item') continue;
      const dist = Math.hypot(d.x - p.x, d.z - p.z);
      if (dist < bd) {
        bd = dist;
        best = d;
      }
    }
    return best ? { x: best.x, z: best.z } : null;
  }

  update(dt: number) {
    this.fullWarned = Math.max(0, this.fullWarned - dt);
    const p = this.player;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.t += dt;
      d.life -= dt;
      d.bob.position.y = Math.sin(d.t * 3) * 0.08;
      d.bob.rotation.y += dt;
      if (d.life <= 0) {
        this.remove(i);
        continue;
      }
      if (!p.alive || Math.hypot(d.x - p.pos.x, d.z - p.pos.z) > PICKUP_RANGE) continue;
      if (this.pickup(d)) this.remove(i);
    }
  }

  private pickup(d: Drop): boolean {
    const k = d.kind;
    if (k.type === 'potion') {
      this.state.potions[k.potion] += k.count;
      bus.emit('float:text', { x: d.x, y: 1.4, z: d.z, text: `+${k.count} ${k.potion === 'hp' ? '紅藥水' : '藍藥水'}`, kind: 'info' });
      bus.emit('player:changed');
      return true;
    }
    const it = addItem(this.state, k.base, k.rarity);
    if (!it) {
      if (this.fullWarned <= 0) {
        bus.emit('toast', { text: '背包已滿，請到選單「裝備」賣出不需要的裝備' });
        this.fullWarned = 5;
      }
      return false;
    }
    const color = new THREE.Color(RARITY[k.rarity].color).getHex();
    if (k.rarity !== 'common') this.effects.pillar(d.x, d.z, 0.6, color, 0.7);
    bus.emit('loot:picked', { name: itemName(it), rarity: k.rarity });
    this.onInventoryChanged();
    return true;
  }

  private remove(i: number) {
    const d = this.drops[i];
    d.object.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = (m as { material?: THREE.Material }).material;
      if (mat) {
        (mat as THREE.SpriteMaterial).map?.dispose();
        mat.dispose();
      }
    });
    d.object.removeFromParent();
    this.drops.splice(i, 1);
  }

  clear() {
    for (let i = this.drops.length - 1; i >= 0; i--) this.remove(i);
  }
}
