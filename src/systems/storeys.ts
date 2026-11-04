// Un seul niveau affiché à la fois (chantier « maison du coq », CONCEPTION « L'étage ») : dans l'intérieur d'une maison à étages, on
// voit le niveau où est Xéros. Il change sur la marche du milieu de l'escalier (`storeyIndex` de world/interior.ts, lu de sa hauteur,
// tenue pas de physique par pas de physique : une machine lente ne la saute pas), par un fondu de ROOF.fadeMs, sans changer de carte
// ni d'écran noir, sans rien verrouiller : Xéros continue de marcher. En haut, le niveau d'en dessous ne se voit que par les trous du
// plancher (la trémie), dans l'ombre ; ailleurs, sous le plancher, le vide de l'intérieur cache le sol du rez-de-chaussée.

import Phaser from 'phaser';
import { DEPTH, INTERIOR, ROOF } from '../config';
import { CM_PER_PX } from '../content/gabarit';
import type { Player } from '../entities/Player';
import type { GameMap, PlacedBuild } from '../world/GameMap';
import { storeyIndex } from '../world/interior';
import type { InteriorMap } from '../world/interiorMap';
import type { InteriorView } from '../world/interiorView';

/** La teinte du niveau d'en dessous vu par la trémie : dans l'ombre. */
const BELOW_TINT = 0x8a8078;

export class Storeys {
  /** Le niveau affiché (0 : le rez-de-chaussée). */
  current = 0;
  /** L'opacité de chaque niveau en ce moment (le test la lit). */
  readonly shown: number[];
  private readonly ids: Set<number>[];
  private readonly masks: (Phaser.Display.Masks.GeometryMask | undefined)[];
  private readonly underlays: (Phaser.GameObjects.Graphics | undefined)[];
  private tween?: Phaser.Tweens.Tween;
  /** La version des pièces posées déjà mises à leur niveau (une pose, un retrait, un volet : GameMap.buildsVersion). */
  private version = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    private readonly interior: InteriorMap,
    private readonly view: InteriorView | undefined,
    z: number,
  ) {
    const st = interior.storeys ?? [];
    this.ids = st.map((s) => new Set(s.shell.map((p) => p.id)));
    this.shown = st.map(() => 0);
    const px = (v: number) => v / CM_PER_PX;
    // les trous de chaque plancher (vus à sa hauteur, soulevés) : le masque du niveau d'en dessous, et le vide partout ailleurs
    this.masks = st.map((s) => {
      if (!s.holes.length) return undefined;
      const g = scene.make.graphics({}, false).fillStyle(0xffffff, 1);
      for (const h of s.holes) g.fillRect(px(h.x), px(h.y - s.z), px(h.w), px(h.d));
      return g.createGeometryMask();
    });
    this.underlays = st.map((s, k) => {
      if (k === 0) return undefined;
      const g = scene.add.graphics().setDepth(DEPTH.floor - 0.04).fillStyle(INTERIOR.void, 1);
      const r = interior.room;
      // le vide sur toute la pièce, moins les trous du plancher : rangée par rangée
      const holes = s.holes.map((h) => ({ x: px(h.x), y: px(h.y - s.z), w: px(h.w), h: px(h.d) }));
      const x0 = px(r.x) - 40;
      const x1 = px(r.x + r.w) + 40;
      const y0 = Math.floor(px(r.y - s.z)) - 40;
      const y1 = px(r.y + r.d) + 40;
      for (let y = y0; y < y1; y++) {
        const row = holes.filter((h) => y >= h.y && y < h.y + h.h).sort((a, b) => a.x - b.x);
        let x = x0;
        for (const h of row) {
          if (h.x > x) g.fillRect(x, y, h.x - x, 1);
          x = Math.max(x, h.x + h.w);
        }
        if (x < x1) g.fillRect(x, y, x1 - x, 1);
      }
      return g;
    });
    this.current = storeyIndex(interior, z);
    this.shown[this.current] = 1;
    this.apply();
    view?.setStorey(this.current);
  }

  /** Les niveaux d'une pièce posée : ceux dont elle est (une pièce du bâtiment), sinon celui de sa base (un meuble posé dedans). */
  private storeysOf(b: PlacedBuild): number[] {
    if (b.fixed) return this.ids.flatMap((s, k) => (s.has(b.piece.id) ? [k] : []));
    return [storeyIndex(this.interior, b.piece.z)];
  }

  /** À chaque image : le niveau de Xéros ; s'il a changé, le fondu commence. */
  update(player: Player): void {
    const k = storeyIndex(this.interior, player.mobility.z);
    if (k === this.current) {
      if (this.version !== this.map.buildsVersion) this.apply();
      return;
    }
    this.current = k;
    this.view?.setStorey(k);
    this.tween?.stop();
    const start = [...this.shown];
    const state = { t: 0 };
    this.tween = this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: ROOF.fadeMs,
      onUpdate: () => {
        for (let i = 0; i < this.shown.length; i++) this.shown[i] = start[i] + ((i === k ? 1 : 0) - start[i]) * state.t;
        this.apply();
      },
      onComplete: () => {
        for (let i = 0; i < this.shown.length; i++) this.shown[i] = i === k ? 1 : 0;
        this.apply();
      },
    });
  }

  /** Chaque pièce posée à l'opacité de son niveau ; le niveau juste en dessous de celui affiché, par les trous de son plancher. */
  apply(): void {
    this.version = this.map.buildsVersion;
    const k = this.current;
    const mask = this.masks[k];
    for (const b of this.map.builds) {
      const mine = this.storeysOf(b);
      const below = k > 0 && !!mask && mine.includes(k - 1) && !mine.includes(k);
      const alpha = below ? 1 : Math.max(0, ...mine.map((i) => this.shown[i] ?? 0));
      for (const o of [b.image, ...(b.slices ?? []), ...(b.parts ?? []).map((p) => p.obj)]) {
        const img = o as Phaser.GameObjects.Image;
        img.setAlpha?.(alpha);
        if (below) {
          img.setMask?.(mask!);
          img.setTint?.(BELOW_TINT);
        } else if (img.mask) {
          img.clearMask?.();
          img.clearTint?.();
        }
      }
    }
    this.view?.cuts.forEach((list, i) => list.forEach((g) => g.setAlpha(this.shown[i] ?? 0)));
    this.underlays.forEach((g, i) => g?.setAlpha(this.shown[i] ?? 0));
  }
}
