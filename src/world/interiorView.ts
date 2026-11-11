// Ce que la vue d'un intérieur ajoute à sa carte (Phaser ; chantier « intérieurs ») : le vide autour de la pièce, la coupe du mur sud
// (le dessus du mur tranché au ras du sol, de la teinte de ses pièces : son âge suit), ses collisions, et les taches de lumière des
// portes et des volets ouverts, avec la pénombre qui va avec. Les murs eux-mêmes sont les pièces posées (GameMap, pièces fixes) :
// rien n'est dessiné à la main pour un bâtiment.

import Phaser from 'phaser';
import { DEPTH, INTERIOR } from '../config';
import { framePixels } from './alphaMask';
import { sunImages } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import { buildLook } from './buildView';
import type { GameMap } from './GameMap';
import { ambientOf, lightsOf, type InteriorLight, type InteriorMap } from './interiorMap';
import type { Rect, Window } from './interior';

/** Les angles de la tache de lumière (l'image `sunpatch` a son grand côté en bas, contre la fenêtre sud). */
const ANGLE = { south: 0, north: 180, east: -90, west: 90 } as const;

/** La teinte moyenne des pixels opaques d'une image (une pièce de mur) : la matière et l'âge de la coupe. Ses pixels lus une fois. */
function meanColor(scene: Phaser.Scene, key: string, frame?: string): Phaser.Display.Color {
  const p = framePixels(scene.textures, key, frame);
  let [r, g, b, n] = [0, 0, 0, 0];
  for (let y = 1; p && y < p.h; y += 2) {
    for (let x = 1; x < p.w; x += 2) {
      const i = (y * p.w + x) * 4;
      if (p.data[i + 3] < 200) continue;
      r += p.data[i];
      g += p.data[i + 1];
      b += p.data[i + 2];
      n++;
    }
  }
  return n ? new Phaser.Display.Color(r / n, g / n, b / n) : new Phaser.Display.Color(0x6a, 0x4d, 0x34);
}

export class InteriorView {
  /** Les taches de lumière en ce moment (le test les lit). */
  lights: InteriorLight[] = [];
  private glows: Phaser.GameObjects.Image[] = [];
  /** Les coupes du mur sud de chaque niveau (une maison à étages : systems/storeys.ts n'en montre qu'une). */
  readonly cuts: Phaser.GameObjects.Graphics[][] = [];
  /** Le niveau dont on montre la lumière (0 sans étage). */
  private storey = 0;
  private shutters: { id: number; open: boolean }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    private readonly interior: InteriorMap,
  ) {
    const southPieces = interior.southPieces;
    map.room = interior.room;
    const room = interior.room;
    const W = map.width;
    const H = map.height;
    const px = (v: number) => v / CM_PER_PX;
    // le vide autour de la pièce : sous les pièces posées, par-dessus le sol et ses détails
    const g = scene.add.graphics().setDepth(DEPTH.floor - 0.05).fillStyle(INTERIOR.void, 1);
    g.fillRect(0, 0, W, px(room.y));
    g.fillRect(0, px(room.y + room.d), W, H - px(room.y + room.d));
    g.fillRect(0, px(room.y), px(room.x), px(room.d));
    g.fillRect(px(room.x + room.w), px(room.y), W - px(room.x + room.w), px(room.d));
    // la coupe du mur sud, de la teinte de ses pièces, et sa collision
    const base = southPieces.length ? meanColor(scene, buildLook(scene, southPieces[0]).key, buildLook(scene, southPieces[0]).frame) : new Phaser.Display.Color(0x6a, 0x4d, 0x34);
    const tone = (k: number) => Phaser.Display.Color.GetColor(base.red * k, base.green * k, base.blue * k);
    const storeys = interior.storeys ?? [{ z: 0, south: interior.south }];
    storeys.forEach((st, k) => {
      // chaque niveau, sa coupe à la hauteur de son plancher (soulevée de z / 5 px), et sa collision à sa hauteur seulement
      const top = storeys[k + 1]?.z ?? Infinity;
      this.cuts.push(st.south.map((r) => this.cut(r, tone, st.z)));
      for (const r of st.south) {
        const zone = map.addBlock(r);
        if (interior.storeys) zone.setData('slice', [st.z, top]);
      }
    });
    this.shutters = (interior.storeys?.flatMap((st) => st.windows) ?? interior.windows).map((w) => ({ id: w.id, open: w.open }));
    this.refresh(this.shutters);
  }

  /** Le niveau où est Xéros : sa lumière et sa pénombre (systems/storeys.ts). */
  setStorey(k: number): void {
    if (k === this.storey) return;
    this.storey = k;
    this.refresh([]);
  }

  /** Une coupe de mur : le dessus tranché, son bord du dedans éclairé, son bord du dehors dans l'ombre. */
  private cut(r: Rect, tone: (k: number) => number, z = 0): Phaser.GameObjects.Graphics {
    const x = Math.round(r.x / CM_PER_PX);
    const lift = Math.round(z / CM_PER_PX);
    const y = Math.round(r.y / CM_PER_PX);
    const w = Math.max(1, Math.round((r.x + r.w) / CM_PER_PX) - x);
    const h = Math.max(2, Math.round((r.y + r.d) / CM_PER_PX) - y);
    return this.scene.add
      .graphics()
      .setY(-lift)
      .setDepth(y + h + z / 100000)
      .fillStyle(tone(0.55), 1)
      .fillRect(x, y, w, h)
      .fillStyle(tone(0.85), 1)
      .fillRect(x, y, w, 1)
      .fillStyle(tone(0.35), 1)
      .fillRect(x, y + h - 1, w, 1);
  }

  /**
   * Les volets ont changé (E, de dedans) : les taches de lumière des portes et des volets ouverts, et la pénombre, plus sombre quand
   * tous les volets sont fermés.
   */
  refresh(state: readonly { id: number; open: boolean }[]): void {
    const it = this.interior;
    for (const s of state) {
      const known = this.shutters.find((q) => q.id === s.id);
      if (known) known.open = s.open;
      else this.shutters.push({ ...s });
    }
    // dans une maison à étages, la lumière et la pénombre du niveau où est Xéros : ses fenêtres, et les portes du rez-de-chaussée
    const st = it.storeys?.[this.storey];
    const windows = (st?.windows ?? it.windows).map((w: Window) => ({ ...w, open: this.shutters.find((s) => s.id === w.id)?.open ?? w.open }));
    this.map.setAmbient(ambientOf(windows));
    const doors = this.storey === 0 ? it.lights.filter((l) => l.kind === 'door') : [];
    const open = windows.filter((w) => w.open).map((w) => ({ kind: 'window' as const, id: w.id, side: w.side, span: w.span }));
    const lift = Math.round((st?.z ?? 0) / CM_PER_PX);
    this.lights = [...doors, ...lightsOf(st?.room ?? it.room, open)].map((l) => ({ ...l, y: l.y - lift }));
    for (const g of this.glows) g.destroy();
    this.glows = this.lights.map((l) => {
      const k = INTERIOR.light[l.kind] * Math.sqrt(l.span / 100);
      return this.scene.add
        .image(l.x, l.y, sunImages[0])
        .setOrigin(0.5, 1)
        .setAngle(ANGLE[l.side])
        .setScale(k)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(INTERIOR.light.alpha)
        .setDepth(DEPTH.light);
    });
  }
}
