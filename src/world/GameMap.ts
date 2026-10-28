import Phaser from 'phaser';
import { DEPTH, TILE } from '../config';
import { props as propDefs, tiles as tilesBySet } from '../content';
import type { MapDef, PropDef } from '../content/types';
import { tilesets } from '../generated/assets';

/** Hachage stable d'une position : la même case a toujours la même variante de tuile. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Objet avec lequel le joueur peut interagir. (x, y) = centre de sa base au sol ; top = haut de l'image. */
export interface Interactable {
  x: number;
  y: number;
  top: number;
  dialogue: string;
}

/**
 * Construit une carte jouable à partir d'une MapDef : sol (tilemap), collisions, objets posés,
 * fumées, lueurs et pénombre. Ne connaît ni le joueur ni les PNJ.
 * Le contenu est supposé valide : il est vérifié au démarrage (content/validate.ts).
 */
export class GameMap {
  readonly ground: Phaser.Tilemaps.TilemapLayer;
  /** Boîtes de collision des objets posés. */
  readonly obstacles: Phaser.Physics.Arcade.StaticGroup;
  readonly interactables: Interactable[] = [];
  readonly width: number;
  readonly height: number;

  constructor(scene: Phaser.Scene, readonly def: MapDef) {
    const setKey = def.tileset ?? 'world';
    const tileDefs = tilesBySet[setKey];
    const tileset = tilesets.find((t) => t.key === setKey)!;
    this.width = def.ground[0].length * TILE;
    this.height = def.ground.length * TILE;

    // Sol
    const solid = new Set<number>();
    const data = def.ground.map((row, y) =>
      [...row].map((ch, x) => {
        const t = tileDefs[ch];
        let name: string;
        if (t.autotile) {
          // hors de la carte compte comme identique : un chemin qui sort de l'écran n'a pas de bordure
          const same = (dx: number, dy: number) => {
            const n = def.ground[y + dy]?.[x + dx];
            return n === undefined || n === ch || (t.connects ?? '').includes(n);
          };
          const mask = (same(0, -1) ? 1 : 0) | (same(1, 0) ? 2 : 0) | (same(0, 1) ? 4 : 0) | (same(-1, 0) ? 8 : 0);
          name = `${t.autotile}-${mask}`;
        } else if (t.cycle) {
          name = t.tiles[x % t.tiles.length];
        } else {
          name = t.tiles[hash(x, y) % t.tiles.length];
        }
        const index = tileset.tiles[name];
        if (t.solid) solid.add(index);
        return index;
      }),
    );
    const map = scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage(tileset.key, tileset.key, TILE, TILE, 0, 0)!;
    this.ground = map.createLayer(0, ts, 0, 0)!;
    this.ground.setDepth(DEPTH.ground);
    this.ground.setCollision([...solid]);

    // Détails au sol, posés de façon stable (même carte = mêmes détails)
    def.ground.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const d = tileDefs[ch].decals;
        if (!d) return;
        const h = hash(x * 3 + 7, y * 5 + 11);
        if ((h % 1000) / 1000 >= d.chance) return;
        const img = d.images[(h >>> 10) % d.images.length];
        const ox = ((h >>> 4) % 17) - 8;
        const oy = ((h >>> 8) % 13) - 6;
        scene.add.image(x * TILE + TILE / 2 + ox, y * TILE + TILE / 2 + oy, img).setDepth(DEPTH.decal).setFlipX(((h >>> 14) & 1) === 1);
      }),
    );

    // Objets posés
    this.obstacles = scene.physics.add.staticGroup();
    def.props.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== '.') this.placeProp(scene, propDefs[ch], x, y);
      }),
    );

    // Pénombre (intérieurs) : les lueurs des feux sont posées par-dessus
    if (def.ambient) {
      scene.add.rectangle(0, 0, this.width, this.height, 0x1a0e06, def.ambient).setOrigin(0).setDepth(DEPTH.ambient);
    }
  }

  private placeProp(scene: Phaser.Scene, p: PropDef, x: number, y: number) {
    const left = p.align === 'left';
    const ax = left ? x * TILE : x * TILE + TILE / 2;
    const ay = y * TILE + TILE;
    const obj = p.anim
      ? scene.add.sprite(ax, ay, p.image).play(`${p.image}-${p.anim}`)
      : scene.add.image(ax, ay, p.image);
    obj.setOrigin(left ? 0 : 0.5, 1).setDepth(p.layer === 'floor' ? DEPTH.floor : ay);
    if (p.blend === 'add') obj.setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.light);
    // coin haut gauche de l'image, pour les coordonnées "dans l'image"
    const ox = left ? ax : ax - obj.width / 2;
    const oy = ay - obj.height;

    let baseY = ay - 8;
    if (p.body) {
      baseY = ay - p.body.bottom - p.body.h / 2;
      this.obstacles.add(scene.add.zone(ox + obj.width / 2, baseY, p.body.w, p.body.h));
    }
    for (const b of p.bodies ?? []) {
      this.obstacles.add(scene.add.zone(ox + b.x + b.w / 2, oy + b.y + b.h / 2, b.w, b.h));
      baseY = Math.max(baseY, oy + b.y + b.h / 2);
    }
    if (p.interact) this.interactables.push({ x: ox + obj.width / 2, y: baseY, top: oy, dialogue: p.interact });

    for (const [sx, sy] of p.smoke ?? []) {
      scene.add
        .particles(ox + sx, oy + sy, 'smoke', {
          speedY: { min: -18, max: -10 },
          speedX: { min: -2, max: 7 },
          lifespan: 3000,
          scale: { start: 0.8, end: 2 },
          alpha: { start: 0.7, end: 0 },
          frequency: 220,
        })
        .setDepth(ay + 1);
    }

    if (p.light) {
      const glow = scene.add
        .image(ox + p.light.x, oy + p.light.y, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xffa040)
        .setScale(p.light.radius / 64)
        .setAlpha(0.32)
        .setDepth(DEPTH.light);
      scene.tweens.add({
        targets: glow,
        alpha: { from: 0.26, to: 0.4 },
        scale: { from: (p.light.radius / 64) * 0.95, to: (p.light.radius / 64) * 1.04 },
        duration: 180 + Math.random() * 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }
}
