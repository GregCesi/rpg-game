import Phaser from 'phaser';
import { DEPTH, TILE } from '../config';
import { items, props as propDefs } from '../content';
import type { MapData, MapObject, PropDef } from '../content/types';
import type { GroundItem, MapState } from '../state';
import type { Npc } from '../entities/Npc';
import { tilesets } from '../generated/assets';

/** Hachage stable d'une position : la même case a toujours les mêmes détails au sol. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Un objet de props.json posé sur la carte, tel qu'il est maintenant (après les changements de GameState). */
export interface PlacedProp {
  /** Identifiant de l'objet dans Tiled : clé des changements dans GameState. */
  id: number;
  type: string;
  def: PropDef;
  /** Coin bas gauche de l'image. */
  x: number;
  y: number;
  /** Centre de sa base au sol, et haut de l'image. */
  baseX: number;
  baseY: number;
  top: number;
  image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  /** Tout ce qui a été créé pour lui (image, collisions, fumées, lueurs) : détruit quand il change. */
  parts: Phaser.GameObjects.GameObject[];
  /** Dialogue propre à cet exemplaire (propriété `interact` dans Tiled). */
  interact?: string;
  /** Coups déjà reçus (récolte en cours) ; repart de zéro quand on revient sur la carte. */
  hits: number;
}

/** Un objet possédable posé au sol, affiché. */
export interface PlacedGround {
  item: GroundItem;
  image: Phaser.GameObjects.Image;
}

/** Ce que fait la touche E devant une cible. */
export type Action =
  | { kind: 'talk'; dialogue: string; npc?: Npc }
  | { kind: 'harvest'; prop: PlacedProp }
  | { kind: 'pickup'; ground: PlacedGround };

/** Ce avec quoi le joueur peut interagir avec E. (x, y) = centre de sa base au sol ; top = haut de l'image. */
export interface Interactable {
  x: number;
  y: number;
  top: number;
  action: Action;
}

/**
 * Construit une carte jouable à partir d'une MapData : sol (tilemap), collisions, objets posés,
 * fumées, lueurs et pénombre, objets au sol. Ne connaît ni le joueur ni les PNJ.
 * Les changements de la carte notés dans GameState (objet devenu un autre, objets au sol) sont appliqués à la construction.
 * Les tuiles du sol sont affichées telles que Tiled les a peintes ; seuls les détails au hasard sont calculés ici.
 * Le contenu est supposé valide : il est vérifié au démarrage (content/validate.ts).
 */
export class GameMap {
  readonly floor: Phaser.Tilemaps.TilemapLayer;
  /** Boîtes de collision des objets posés. */
  readonly obstacles: Phaser.Physics.Arcade.StaticGroup;
  readonly props: PlacedProp[] = [];
  readonly ground: PlacedGround[] = [];
  readonly width: number;
  readonly height: number;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: MapData,
    changes: MapState,
  ) {
    const tileset = tilesets.find((t) => t.key === def.tileset)!;
    this.width = def.width * TILE;
    this.height = def.height * TILE;

    // Sol : une ligne de tuiles par rangée
    const cells = def.layers.ground;
    const data = Array.from({ length: def.height }, (_, y) => cells.slice(y * def.width, (y + 1) * def.width));
    const map = scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage(tileset.key, tileset.key, TILE, TILE, 0, 0)!;
    this.floor = map.createLayer(0, ts, 0, 0)!;
    this.floor.setDepth(DEPTH.ground);
    this.floor.setCollision(tileset.solid);

    // Détails au sol, posés de façon stable (même carte = mêmes détails)
    cells.forEach((tile, i) => {
      const d = tileset.decals[tile];
      if (!d) return;
      const x = i % def.width;
      const y = Math.floor(i / def.width);
      const h = hash(x * 3 + 7, y * 5 + 11);
      if ((h % 1000) / 1000 >= d.chance) return;
      const img = d.images[(h >>> 10) % d.images.length];
      const ox = ((h >>> 4) % 17) - 8;
      const oy = ((h >>> 8) % 13) - 6;
      scene.add.image(x * TILE + TILE / 2 + ox, y * TILE + TILE / 2 + oy, img).setDepth(DEPTH.decal).setFlipX(((h >>> 14) & 1) === 1);
    });

    // Objets posés
    this.obstacles = scene.physics.add.staticGroup();
    for (const o of def.objects) {
      const c = changes.changes[o.id];
      if (!c) this.placeProp(o);
      else if (c.type) this.placeProp({ id: o.id, type: c.type, x: c.x, y: c.y });
    }
    for (const g of changes.ground) this.placeGround(g);

    // Pénombre (intérieurs) : les lueurs des feux sont posées par-dessus
    if (def.ambient) {
      scene.add.rectangle(0, 0, this.width, this.height, 0x1a0e06, def.ambient).setOrigin(0).setDepth(DEPTH.ambient);
    }
  }

  /** Ce que E peut viser en ce moment : dialogues, récoltes à la main, objets au sol. */
  interactables(): Interactable[] {
    const list: Interactable[] = [];
    for (const p of this.props) {
      const dialogue = p.interact ?? p.def.interact;
      if (dialogue) list.push({ x: p.baseX, y: p.baseY, top: p.top, action: { kind: 'talk', dialogue } });
      else if (p.def.harvest && !p.def.harvest.tool) list.push({ x: p.baseX, y: p.baseY, top: p.top, action: { kind: 'harvest', prop: p } });
    }
    // un objet encore caché (il attend la fin d'une chute) ne se ramasse pas
    for (const g of this.ground) if (g.image.visible) list.push({ x: g.item.x, y: g.item.y - 4, top: g.image.y - g.image.height, action: { kind: 'pickup', ground: g } });
    return list;
  }

  /** Retire un objet posé (image, collisions, fumées, lueurs). */
  removeProp(p: PlacedProp): void {
    this.scene.tweens.killTweensOf(p.parts);
    for (const part of p.parts) part.destroy();
    this.props.splice(this.props.indexOf(p), 1);
  }

  /** Affiche un objet possédable posé au sol (son point au sol en bas de l'icône). */
  placeGround(item: GroundItem): PlacedGround {
    const icon = items[item.item].icon;
    const image = this.scene.add.image(item.x, item.y, icon).setOrigin(0.5, 1).setDepth(item.y);
    const g = { item, image };
    this.ground.push(g);
    return g;
  }

  removeGround(g: PlacedGround): void {
    g.image.destroy();
    this.ground.splice(this.ground.indexOf(g), 1);
  }

  /** (o.x, o.y) = coin bas gauche de l'image : c'est aussi la profondeur d'affichage (y des pieds). */
  placeProp(o: MapObject): PlacedProp {
    const scene = this.scene;
    const p = propDefs[o.type];
    const ay = o.y;
    const obj = p.anim ? scene.add.sprite(o.x, ay, p.image).play(`${p.image}-${p.anim}`) : scene.add.image(o.x, ay, p.image);
    obj.setOrigin(0, 1).setDepth(p.layer === 'floor' ? DEPTH.floor : ay);
    if (p.blend === 'add') obj.setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.light);
    const parts: Phaser.GameObjects.GameObject[] = [obj];
    // coin haut gauche de l'image, pour les coordonnées "dans l'image"
    const ox = o.x;
    const oy = ay - obj.height;

    let baseY = ay - 8;
    if (p.body) {
      baseY = ay - p.body.bottom - p.body.h / 2;
      parts.push(this.addObstacle(ox + obj.width / 2, baseY, p.body.w, p.body.h));
    }
    for (const b of p.bodies ?? []) {
      parts.push(this.addObstacle(ox + b.x + b.w / 2, oy + b.y + b.h / 2, b.w, b.h));
      baseY = Math.max(baseY, oy + b.y + b.h / 2);
    }
    const placed: PlacedProp = {
      id: o.id,
      type: o.type,
      def: p,
      x: o.x,
      y: o.y,
      baseX: ox + obj.width / 2,
      baseY,
      top: oy,
      image: obj,
      parts,
      hits: 0,
      interact: o.interact,
    };
    this.props.push(placed);

    for (const [sx, sy] of p.smoke ?? []) {
      const smoke = scene.add
        .particles(ox + sx, oy + sy, 'smoke', {
          speedY: { min: -18, max: -10 },
          speedX: { min: -2, max: 7 },
          lifespan: 3000,
          scale: { start: 0.8, end: 2 },
          alpha: { start: 0.7, end: 0 },
          frequency: 220,
        })
        .setDepth(ay + 1);
      parts.push(smoke);
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
      parts.push(glow);
    }
    return placed;
  }

  private addObstacle(x: number, y: number, w: number, h: number): Phaser.GameObjects.Zone {
    const zone = this.scene.add.zone(x, y, w, h);
    this.obstacles.add(zone);
    return zone;
  }
}
