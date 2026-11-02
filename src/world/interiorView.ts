// Ce que la vue d'un intérieur ajoute à sa carte (Phaser ; chantier « intérieurs ») : le vide autour de la pièce, la coupe du mur sud
// (le dessus du mur tranché au ras du sol, de la teinte de ses pièces : son âge suit), ses collisions, et les taches de lumière des
// portes et des volets ouverts, avec la pénombre qui va avec. Les murs eux-mêmes sont les pièces posées (GameMap, pièces fixes) :
// rien n'est dessiné à la main pour un bâtiment.

import Phaser from 'phaser';
import { DEPTH, INTERIOR } from '../config';
import { sunImages } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import { buildLook } from './buildView';
import type { GameMap } from './GameMap';
import { ambientOf, lightsOf, type InteriorLight, type InteriorMap } from './interiorMap';
import type { Rect } from './interior';

/** Les angles de la tache de lumière (l'image `sunpatch` a son grand côté en bas, contre la fenêtre sud). */
const ANGLE = { south: 0, north: 180, east: -90, west: 90 } as const;

/** La teinte moyenne des pixels opaques d'une image (une pièce de mur) : la matière et l'âge de la coupe. */
function meanColor(scene: Phaser.Scene, key: string, frame?: string): Phaser.Display.Color {
  const f = scene.textures.getFrame(key, frame);
  let [r, g, b, n] = [0, 0, 0, 0];
  for (let y = 1; y < f.height; y += 2) {
    for (let x = 1; x < f.width; x += 2) {
      const c = scene.textures.getPixel(x, y, key, frame);
      if (!c || c.alpha < 200) continue;
      r += c.red;
      g += c.green;
      b += c.blue;
      n++;
    }
  }
  return n ? new Phaser.Display.Color(r / n, g / n, b / n) : new Phaser.Display.Color(0x6a, 0x4d, 0x34);
}

export class InteriorView {
  /** Les taches de lumière en ce moment (le test les lit). */
  lights: InteriorLight[] = [];
  private glows: Phaser.GameObjects.Image[] = [];

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
    for (const r of interior.south) this.cut(r, tone);
    for (const r of interior.south) map.addBlock(r);
    this.refresh(interior.windows.map((w) => ({ id: w.id, open: w.open })));
  }

  /** Une coupe de mur : le dessus tranché, son bord du dedans éclairé, son bord du dehors dans l'ombre. */
  private cut(r: Rect, tone: (k: number) => number): void {
    const x = Math.round(r.x / CM_PER_PX);
    const y = Math.round(r.y / CM_PER_PX);
    const w = Math.max(1, Math.round((r.x + r.w) / CM_PER_PX) - x);
    const h = Math.max(2, Math.round((r.y + r.d) / CM_PER_PX) - y);
    this.scene.add
      .graphics()
      .setDepth(y + h)
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
    const windows = it.windows.map((w) => ({ ...w, open: state.find((s) => s.id === w.id)?.open ?? w.open }));
    this.map.setAmbient(ambientOf(windows));
    const doors = it.lights.filter((l) => l.kind === 'door');
    const open = windows.filter((w) => w.open).map((w) => ({ kind: 'window' as const, id: w.id, side: w.side, span: w.span }));
    this.lights = [...doors, ...lightsOf(it.room, open)];
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
