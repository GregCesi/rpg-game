// Ce qu'on voit des zones voisines par-delà le bord de la carte (chantier « monde ») : leur sol, leurs détails au sol, leurs objets tels
// que la partie les a laissés (un arbre abattu reste abattu), leurs pièces posées. Rien n'y bloque ni ne s'y prend : c'est un décor. La
// caméra peut donc s'approcher du bord sans montrer le vide, et quand Xéros passe le bord, la voisine qu'on charge est déjà à l'écran,
// à la même place : le passage ne se voit presque pas (systems/zones.ts).
import Phaser from 'phaser';
import { DEPTH, TILE, ZONES } from '../config';
import { maps, props as propDefs } from '../content';
import type { MapData, MapObject, Natural, WoodPiece } from '../content/types';
import { tilesets } from '../generated/assets';
import { game } from '../state';
import { depthsOf, type BuildPiece } from './build';
import { buildLook } from './buildView';
import { drawDecals } from './GameMap';
import { formImage, stableNatural } from './natural';
import { wallOf } from './wallRuns';
import { woodDef, woodOf } from './woodPiece';
import { woodTexture } from './woodTexture';
import { agedKey } from './woodShape';
import { neighborsOf } from './zones';
import { seedMap } from './mapPlans';

/** Ce qui est dessiné des voisines : détruit avec la scène. */
export class ZoneBand {
  readonly parts: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    map: MapData,
  ) {
    const bx = ZONES.band.x * TILE;
    const by = ZONES.band.y * TILE;
    for (const nb of neighborsOf(maps, map, Math.max(bx, by))) {
      // la part de la voisine qui tombe dans la bande autour de la carte, en cases de la voisine
      const W = map.width * TILE;
      const H = map.height * TILE;
      const x0 = Math.max(0, Math.floor((-bx - nb.dx) / TILE));
      const y0 = Math.max(0, Math.floor((-by - nb.dy) / TILE));
      const x1 = Math.min(nb.map.width, Math.ceil((W + bx - nb.dx) / TILE));
      const y1 = Math.min(nb.map.height, Math.ceil((H + by - nb.dy) / TILE));
      if (x1 <= x0 || y1 <= y0) continue;
      // ses plans de Tiled sont posés dès qu'on la voit, comme à la première visite
      seedMap(nb.map);
      this.ground(nb.map, nb.dx, nb.dy, { x0, y0, x1, y1 });
      // les objets un peu au-delà : un arbre planté plus bas dépasse vers le haut dans la bande
      const reach = ZONES.reach * TILE;
      const inside = (x: number, y: number) =>
        x >= x0 * TILE - reach && x < x1 * TILE + reach && y >= y0 * TILE && y < y1 * TILE + reach;
      this.objects(nb.map, nb.dx, nb.dy, inside);
    }
  }

  /** Le sol de la voisine, cases [x0, x1[ × [y0, y1[, posé à sa place (son coin haut gauche en (dx, dy)), et ses détails. */
  private ground(def: MapData, dx: number, dy: number, r: { x0: number; y0: number; x1: number; y1: number }): void {
    const tileset = tilesets.find((t) => t.key === def.tileset)!;
    const cells = def.layers.ground;
    const data = Array.from({ length: r.y1 - r.y0 }, (_, j) => cells.slice((r.y0 + j) * def.width + r.x0, (r.y0 + j) * def.width + r.x1));
    const tm = this.scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = tm.addTilesetImage(tileset.key, tileset.key, TILE, TILE, 0, 0)!;
    const layer = tm.createLayer(0, ts, dx + r.x0 * TILE, dy + r.y0 * TILE)!;
    layer.setDepth(DEPTH.ground);
    this.parts.push(layer, ...drawDecals(this.scene, def, dx, dy, r));
  }

  /** Les objets de la voisine tels que la partie les a laissés (objets de Tiled changés, objets nés), et ses pièces posées. */
  private objects(def: MapData, dx: number, dy: number, inside: (x: number, y: number) => boolean): void {
    const st = game.maps[def.id];
    for (const o of def.objects) {
      const c = st?.changes[o.id];
      if (!c) this.prop(o, dx, dy, inside, { natural: undefined, seed: o.id });
      else if (c.type) this.prop({ ...o, type: c.type, x: c.x, y: c.y }, dx, dy, inside, { flip: c.flip, wood: c.wood, natural: c.natural });
    }
    for (const o of st?.spawned ?? []) this.prop(o, dx, dy, inside, { flip: o.flip, wood: o.wood, natural: o.natural });
    const pieces: BuildPiece[] = (st?.builds ?? []).filter((b) => !wallOf(b));
    const depths = depthsOf(pieces);
    for (const b of pieces) {
      const look = buildLook(this.scene, b);
      if (!inside(look.x, look.y)) continue;
      this.parts.push(this.scene.add.image(dx + look.x, dy + look.y, look.key, look.frame).setOrigin(0, 1).setDepth(dy + (depths.get(b.id) ?? look.y)));
    }
  }

  /** Un objet de la voisine, à sa place dans le repère de la carte : son image (la pièce de bois assemblée), rien d'autre. */
  private prop(
    o: MapObject,
    dx: number,
    dy: number,
    inside: (x: number, y: number) => boolean,
    opts: { flip?: boolean; wood?: WoodPiece; natural?: Natural; seed?: number },
  ): void {
    if (!inside(o.x, o.y)) return;
    const base = propDefs[o.type];
    if (!base) return;
    const wood = base.wood ? woodOf(base, opts.wood ?? o.wood) : undefined;
    const p = wood ? woodDef(base, wood) : base;
    const natural = p.natural ? (opts.natural ?? (opts.seed !== undefined ? stableNatural(p.natural, opts.seed) : undefined)) : undefined;
    const key = wood ? woodTexture(this.scene, wood) : opts.flip ? `${p.image}-left` : agedKey(formImage(p.image, natural), p.aged ? o.age : undefined);
    // un objet animé (le feu) montre sa première image
    const img = this.scene.add.image(dx + o.x, dy + o.y, key, wood ? '0' : p.anim ? 0 : undefined).setOrigin(0, 1);
    img.setDepth(p.layer === 'floor' ? DEPTH.floor : dy + o.y);
    if (p.blend === 'add') img.setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.light);
    this.parts.push(img);
  }
}
