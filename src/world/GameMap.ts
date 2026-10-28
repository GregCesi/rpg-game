import Phaser from 'phaser';
import { TILE } from '../config';
import { dialogues, maps, props as propDefs, tiles as tilesBySet } from '../content';
import type { MapDef, PropDef, TileDef } from '../content/types';
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

/** Profondeur de la pénombre et des lueurs : au-dessus de tout le monde, sous l'interface. */
const AMBIENT_DEPTH = 90000;

/**
 * Construit une carte jouable à partir d'une MapDef : sol (tilemap), collisions, objets posés,
 * fumées, lueurs et pénombre. Ne connaît ni le joueur ni les PNJ.
 */
export class GameMap {
  readonly ground: Phaser.Tilemaps.TilemapLayer;
  /** Boîtes de collision des objets posés. */
  readonly obstacles: Phaser.Physics.Arcade.StaticGroup;
  readonly interactables: Interactable[] = [];
  readonly width: number;
  readonly height: number;

  private readonly tileDefs: Record<string, TileDef>;

  constructor(scene: Phaser.Scene, readonly def: MapDef) {
    const setKey = def.tileset ?? 'world';
    const tileDefs = tilesBySet[setKey];
    if (!tileDefs) throw new Error(`Carte ${def.id} : jeu de tuiles '${setKey}' absent de tiles.json`);
    this.tileDefs = tileDefs;
    const rows = def.ground.length;
    const cols = def.ground[0].length;
    this.validate(rows, cols);
    this.width = cols * TILE;
    this.height = rows * TILE;

    const tileset = tilesets.find((t) => t.key === setKey);
    if (!tileset) throw new Error(`Carte ${def.id} : aucune image de tuiles '${setKey}' générée (art/)`);
    const indexOf = (name: string) => {
      const i = tileset.tiles[name];
      if (i === undefined) throw new Error(`Tuile '${name}' absente du jeu de tuiles '${setKey}'`);
      return i;
    };

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
            return n === undefined || n === ch;
          };
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
        if (ch !== '.') this.placeProp(scene, propDefs[ch], x, y);
      }),
    );

    // Pénombre (intérieurs) : les lueurs des feux sont posées par-dessus
    if (def.ambient) {
      scene.add.rectangle(0, 0, this.width, this.height, 0x1a0e06, def.ambient).setOrigin(0).setDepth(AMBIENT_DEPTH);
    }
  }

  private placeProp(scene: Phaser.Scene, p: PropDef, x: number, y: number) {
    const left = p.align === 'left';
    const ax = left ? x * TILE : x * TILE + TILE / 2;
    const ay = y * TILE + TILE;
    const obj = p.anim
      ? scene.add.sprite(ax, ay, p.image).play(`${p.image}-${p.anim}`)
      : scene.add.image(ax, ay, p.image);
    obj.setOrigin(left ? 0 : 0.5, 1).setDepth(ay);
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
        .setDepth(AMBIENT_DEPTH + 1);
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

  /** Erreurs lisibles plutôt qu'un plantage obscur quand une carte est mal saisie. */
  private validate(rows: number, cols: number) {
    const { id, ground, props } = this.def;
    const tileDefs = this.tileDefs;
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
        const dialogue = propDefs[ch]?.interact;
        if (dialogue && !dialogues[dialogue]) throw new Error(`Objet '${ch}' : dialogue '${dialogue}' introuvable dans dialogues.json`);
      });
    });
    for (const e of this.def.exits ?? []) {
      const target = maps[e.to];
      if (!target) throw new Error(`Carte ${id} : la sortie en (${e.x}, ${e.y}) mène à une carte inconnue '${e.to}'`);
      if (!target.spawns[e.spawn]) throw new Error(`Carte ${id} : la sortie en (${e.x}, ${e.y}) vise le point '${e.spawn}', absent de la carte ${e.to}`);
    }
  }
}
