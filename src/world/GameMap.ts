import Phaser from 'phaser';
import { TILE } from '../config';
import { props as propDefs, tiles as tileDefs } from '../content';
import type { MapDef } from '../content/types';
import { tilesets } from '../generated/assets';

/** Hachage stable d'une position : la même case a toujours la même variante de tuile. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Construit une carte jouable à partir d'une MapDef : sol (tilemap), collisions, objets posés.
 * Ne connaît ni le joueur ni les PNJ.
 */
export class GameMap {
  readonly ground: Phaser.Tilemaps.TilemapLayer;
  /** Boîtes de collision des objets posés. */
  readonly obstacles: Phaser.Physics.Arcade.StaticGroup;
  readonly width: number;
  readonly height: number;

  constructor(scene: Phaser.Scene, readonly def: MapDef) {
    const rows = def.ground.length;
    const cols = def.ground[0].length;
    this.validate(rows, cols);
    this.width = cols * TILE;
    this.height = rows * TILE;

    const tileset = tilesets.find((t) => t.key === 'world')!;
    const indexOf = (name: string) => {
      const i = tileset.tiles[name];
      if (i === undefined) throw new Error(`Tuile inconnue dans le tileset : ${name}`);
      return i;
    };

    // Sol
    const solid = new Set<number>();
    const data = def.ground.map((row, y) =>
      [...row].map((ch, x) => {
        const t = tileDefs[ch];
        let name: string;
        if (t.autotile) {
          const same = (dx: number, dy: number) => def.ground[y + dy]?.[x + dx] === ch;
          const mask = (same(0, -1) ? 1 : 0) | (same(1, 0) ? 2 : 0) | (same(0, 1) ? 4 : 0) | (same(-1, 0) ? 8 : 0);
          name = `${t.autotile}-${mask}`;
        } else {
          name = t.tiles[hash(x, y) % t.tiles.length];
        }
        const index = indexOf(name);
        if (t.solid) solid.add(index);
        return index;
      }),
    );
    const map = scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage(tileset.key, tileset.key, TILE, TILE, 0, 0)!;
    this.ground = map.createLayer(0, ts, 0, 0)!;
    this.ground.setDepth(-1);
    this.ground.setCollision([...solid]);

    // Objets posés
    this.obstacles = scene.physics.add.staticGroup();
    def.props.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        const p = propDefs[ch];
        const px = x * TILE + TILE / 2;
        const py = y * TILE + TILE;
        scene.add.image(px, py, p.image).setOrigin(0.5, 1).setDepth(py);
        if (p.body) {
          const zone = scene.add.zone(px, py - p.body.bottom - p.body.h / 2, p.body.w, p.body.h);
          this.obstacles.add(zone);
        }
      }),
    );
  }

  /** Erreurs lisibles plutôt qu'un plantage obscur quand une carte est mal saisie. */
  private validate(rows: number, cols: number) {
    const { id, ground, props } = this.def;
    ground.forEach((row, y) => {
      if (row.length !== cols) throw new Error(`Carte ${id} : ligne ${y} du sol fait ${row.length} cases au lieu de ${cols}`);
      [...row].forEach((ch, x) => {
        if (!tileDefs[ch]) throw new Error(`Carte ${id} : caractère de sol '${ch}' inconnu en (${x}, ${y})`);
      });
    });
    if (props.length !== rows) throw new Error(`Carte ${id} : la couche objets fait ${props.length} lignes au lieu de ${rows}`);
    props.forEach((row, y) => {
      if (row.length !== cols) throw new Error(`Carte ${id} : ligne ${y} des objets fait ${row.length} cases au lieu de ${cols}`);
      [...row].forEach((ch, x) => {
        if (ch !== '.' && !propDefs[ch]) throw new Error(`Carte ${id} : objet '${ch}' inconnu en (${x}, ${y})`);
      });
    });
  }
}
