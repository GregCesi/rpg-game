import Phaser from 'phaser';
import { DEPTH, SHADOW, TILE } from '../config';
import { roofShadow } from './roofShadow';
import { items, piles as pileDefs, props as propDefs } from '../content';
import type { Corner, MapData, MapObject, PileDef, PropDef } from '../content/types';
import { drawOrder, pileBlocks, placeAim, shapeOf, tieImages, topPieces } from './pileShape';
import type { Chain, GroundItem, MapState, Pile } from '../state';
import type { Npc } from '../entities/Npc';
import { images, tilesets } from '../generated/assets';
import { CM_PER_PX } from '../content/gabarit';
import { woodShape } from '../content/mass';

/** Pièce de tronc couché : elle a une encoche, ou devient une pièce qui en a une (le houppier devient la tête). */
export function isTrunk(def: PropDef): boolean {
  const h = def.harvest;
  return !!h && (h.notch || (!!h.becomes && !!propDefs[h.becomes].harvest?.notch));
}

/** L'encoche du bout droit de cette pièce est coupée. */
export function notchCut(p: PlacedProp): boolean {
  return !!p.def.harvest?.notch && p.hits >= p.def.harvest.hits;
}

/** Haut de l'invite au-dessus d'un objet : sur le point visé s'il en a un, sinon au-dessus de l'image. */
export function promptTop(p: PlacedProp): number {
  return p.def.aim ? p.aimY - 2 : p.top;
}

/** Rectangle dans le repère d'une image (0,0 = coin haut gauche). */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Collision d'un objet de props.json dans le repère de son image (w × h), retournée pour sa version de gauche ;
 * undefined s'il ne bloque pas le passage. Mêmes règles que placeProp : `body` centré en bas, `bodies` libres.
 */
export function footprint(def: PropDef, w: number, h: number, flip: boolean): Box | undefined {
  const rects = def.body ? [{ x: (w - def.body.w) / 2, y: h - def.body.bottom - def.body.h, w: def.body.w, h: def.body.h }] : (def.bodies ?? []);
  if (!rects.length) return undefined;
  const fx = (x: number, rw: number) => (flip ? w - x - rw : x);
  return {
    left: Math.min(...rects.map((r) => fx(r.x, r.w))),
    right: Math.max(...rects.map((r) => fx(r.x, r.w) + r.w)),
    top: Math.min(...rects.map((r) => r.y)),
    bottom: Math.max(...rects.map((r) => r.y + r.h)),
  };
}

/** Milieu de l'emprise au sol de toutes les places au sol d'un tas (repère du tas) : où se vise et se centre le tas entier. */
export function groundCenter(def: PileDef): [number, number] {
  const b = groundBox(def);
  return [(b.left + b.right) / 2, (b.top + b.bottom) / 2];
}

/** Emprise au sol de toutes les places au sol d'un tas (repère du tas). */
export function groundBox(def: PileDef): Box {
  const bodies = Object.values(def.places).flatMap((q) => (q.body ? [q.body] : []));
  return {
    left: Math.min(...bodies.map((b) => b.x)),
    top: Math.min(...bodies.map((b) => b.y)),
    right: Math.max(...bodies.map((b) => b.x + b.w)),
    bottom: Math.max(...bodies.map((b) => b.y + b.h)),
  };
}

/** Hachage stable d'une position : la même case a toujours les mêmes détails au sol. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Un objet de props.json posé sur la carte, tel qu'il est maintenant (après les changements de GameState). */
export interface PlacedProp {
  /** Identifiant de l'objet dans Tiled (clé des changements dans GameState), ou de l'objet né si `spawned`. */
  id: number;
  /** Objet né pendant la partie (pièce de l'arbre couché) : ses changements vont dans la liste des objets nés. */
  spawned: boolean;
  /**
   * Couché vers la gauche : l'image est `<image>-left` (dessinée, jamais retournée), et sa géométrie est le miroir de la
   * version de droite : collisions, point visé, fumées et lueurs sont retournés dans l'image.
   */
  flip: boolean;
  /** Place dans la chaîne de ce qui est né avec lui (pièces du tronc couché) : choisit l'image « bout coupé ». */
  chain?: Chain;
  type: string;
  def: PropDef;
  /** Coin bas gauche de l'image. */
  x: number;
  y: number;
  /** Centre de sa base au sol, et haut de l'image. */
  baseX: number;
  baseY: number;
  top: number;
  /** Boîte de collision (réunion de ses boîtes), si l'objet bloque le passage. */
  box?: Box;
  /** Point visé (l'encoche, `aim` de props.json), sinon la base : Xéros vise ce point et l'invite s'y affiche. */
  aimX: number;
  aimY: number;
  image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  /** Ombre portée d'un toit (`shadow` de props.json), au sol ; elle suit l'opacité du toit. */
  shadow?: Phaser.GameObjects.Graphics;
  /** Tout ce qui a été créé pour lui (image, collisions, fumées, lueurs) : détruit quand il change. */
  parts: Phaser.GameObjects.GameObject[];
  /** Dialogue propre à cet exemplaire (propriété `interact` dans Tiled). */
  interact?: string;
  /** Coups déjà reçus (récolte en cours) ; repart de zéro quand on revient sur la carte. */
  hits: number;
  /**
   * Longueur restante (cm) de ce qu'il est (le rouleau, `length` de props.json) ou de ce qu'il porte (le billot et son
   * rouleau, `bears`) ; undefined pour le reste.
   */
  length?: number;
}

/** Un objet possédable posé au sol, affiché. */
export interface PlacedGround {
  item: GroundItem;
  image: Phaser.GameObjects.Image;
}

/** Un tas posé, affiché : son lien dessous, une image par pièce posée, à sa place, et la collision des pièces au sol. */
export interface PlacedPile {
  /** L'état du tas dans GameState (genre, point au sol, places prises, sens, lien). */
  pile: Pile;
  /** La forme du tas dans son sens (`shapeOf`) : ses places sont celles-ci. */
  def: PileDef;
  /** Collisions des pièces posées au sol (aucune tant que le tas a moins de `blockFrom` pièces). */
  zones: Phaser.GameObjects.Zone[];
  /** Profondeur d'affichage du tas : le bas de l'image de sa pièce la plus en avant. */
  depth: number;
  /** Images et collisions : détruites quand le tas change. */
  parts: Phaser.GameObjects.GameObject[];
}

/**
 * Ce que fait la touche E devant une cible. `rest` : poser ce qu'on tient sur l'objet (le rouleau, la branche sur le billot) ;
 * `unload` : reprendre ce qu'il porte ; `tie` : reprendre le lien d'un tas qui n'a plus de pièce ; `learn` : l'objet enseigne un
 * plan (la planchette) ; `stake` : reprendre un piquet planté ; `site-place` : poser ce qu'on tient à une place du chantier.
 */
export type Action =
  | { kind: 'talk'; dialogue: string; npc?: Npc }
  | { kind: 'harvest'; prop: PlacedProp }
  | { kind: 'pickup'; ground: PlacedGround }
  | { kind: 'take'; prop: PlacedProp }
  | { kind: 'pile'; pile: PlacedPile; place: string }
  | { kind: 'rest'; prop: PlacedProp }
  | { kind: 'unload'; prop: PlacedProp }
  | { kind: 'tie'; pile: PlacedPile }
  | { kind: 'turn'; prop: PlacedProp }
  | { kind: 'learn'; prop: PlacedProp; plan: string }
  | { kind: 'stake'; site: number; corner: Corner }
  | { kind: 'site-place'; site: number; place: string };

/** Longueur d'un objet neuf (posé dans Tiled) : celle de son `length`, ou de l'objet qu'il porte (`bears`). */
function startLength(def: PropDef): number | undefined {
  return def.length?.start ?? (def.bears?.prop ? propDefs[def.bears.prop].length?.start : undefined);
}

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
  readonly piles: PlacedPile[] = [];
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
      else if (c.type) this.placeProp({ id: o.id, type: c.type, x: c.x, y: c.y }, { flip: c.flip, length: c.length, hits: c.hits });
    }
    for (const o of changes.spawned) this.placeProp(o, { flip: o.flip, spawned: true, chain: o.chain, hits: o.hits, length: o.length });
    this.refreshTrunk();
    for (const g of changes.ground) this.placeGround(g);
    for (const pile of changes.piles) this.placePile(pile);

    // Pénombre (intérieurs) : les lueurs des feux sont posées par-dessus
    if (def.ambient) {
      scene.add.rectangle(0, 0, this.width, this.height, 0x1a0e06, def.ambient).setOrigin(0).setDepth(DEPTH.ambient);
    }
  }

  /**
   * Ce que E peut viser en ce moment : dialogues, récoltes à la main, objets à prendre, objets au sol, pièces de tas,
   * lien seul d'un tas, objets qui portent quelque chose ; et, `held` étant la clé de ce que tient la main active (le
   * rouleau, la branche), les objets sur lesquels le poser (`rest`).
   */
  interactables(held?: string): Interactable[] {
    const list: Interactable[] = [];
    for (const p of this.props) {
      const dialogue = p.interact ?? p.def.interact;
      if (held && p.def.rest?.[held]) list.push({ x: p.aimX, y: p.aimY, top: promptTop(p), action: { kind: 'rest', prop: p } });
      else if (dialogue) list.push({ x: p.baseX, y: p.baseY, top: p.top, action: { kind: 'talk', dialogue } });
      else if (p.def.teaches) list.push({ x: p.baseX, y: p.baseY, top: p.top, action: { kind: 'learn', prop: p, plan: p.def.teaches } });
      // ce qu'il porte se reprend avec E (le rouleau sur le billot) ; on le coupe avec l'outil (Espace)
      else if (p.def.bears) list.push({ x: p.aimX, y: p.aimY, top: promptTop(p), action: { kind: 'unload', prop: p } });
      else if (p.def.harvest && !p.def.harvest.tool) list.push({ x: p.aimX, y: p.aimY, top: promptTop(p), action: { kind: 'harvest', prop: p } });
      // un objet à prendre (la bille) se vise au centre de sa collision ; caché (il attend la fin d'une chute), il ne se prend pas
      else if (p.def.take && p.image.visible) {
        const x = p.box ? (p.box.left + p.box.right) / 2 : p.baseX;
        list.push({ x, y: p.baseY, top: p.top, action: { kind: 'take', prop: p } });
      }
    }
    // E reprend la pièce la plus haute d'un tas : chacune des plus hautes se vise à son point visé, au-dessus de son image
    for (const p of this.piles) {
      // le lien seul, sans pièce dessus : il se reprend, visé au milieu de l'emprise au sol du tas
      if (!p.pile.places.length) {
        const [ax, ay] = groundCenter(p.def);
        const alone = p.def.tie!.alone;
        list.push({ x: p.pile.x + ax, y: p.pile.y + ay, top: p.pile.y + alone.y - this.textureSize(alone.image).h, action: { kind: 'tie', pile: p } });
        continue;
      }
      for (const place of topPieces(p.def, p.pile.places)) {
        const [ax, ay] = placeAim(p.def, place);
        const q = p.def.places[place];
        const top = p.pile.y + q.y - this.textureSize(q.image).h;
        list.push({ x: p.pile.x + ax, y: p.pile.y + ay, top, action: { kind: 'pile', pile: p, place } });
      }
    }
    // un objet encore caché (il attend la fin d'une chute) ne se ramasse pas
    for (const g of this.ground) if (g.image.visible) list.push({ x: g.item.x, y: g.item.y - 4, top: g.image.y - g.image.height, action: { kind: 'pickup', ground: g } });
    return list;
  }

  /** La pièce de la même chaîne à `index`, si elle est posée. */
  chainPiece(group: number, index: number): PlacedProp | undefined {
    return this.props.find((p) => p.chain?.group === group && p.chain.index === index);
  }

  /**
   * Pièce séparée de sa voisine de gauche : première de sa chaîne (bout scié contre la souche), voisine partie,
   * devenue bille, ou encoche de la voisine coupée.
   */
  separatedLeft(p: PlacedProp): boolean {
    if (!p.chain || p.chain.index === 0) return true;
    const left = this.chainPiece(p.chain.group, p.chain.index - 1);
    return !left || !isTrunk(left.def) || notchCut(left);
  }

  /**
   * Images des pièces de tronc couché selon leur état : face de coupe à gauche si la voisine est séparée,
   * profondeur de l'encoche, encoche coupée (voir `notch` dans types.ts). À appeler quand une pièce change, naît ou est frappée.
   */
  refreshTrunk(): void {
    for (const p of this.props) {
      if (!p.chain || !isTrunk(p.def)) continue;
      const left = p.chain.index > 0 && this.separatedLeft(p) ? '-cut-left' : '';
      const max = p.def.harvest!.hits;
      const base = p.flip ? `${p.def.image}-left` : p.def.image;
      const image = !p.def.harvest!.notch ? `${base}${left}` : p.hits >= max ? `${base}-cut-right` : `${base}${left}${p.hits > 0 ? `-n${p.hits}` : ''}`;
      p.image.setTexture(image);
    }
  }

  /**
   * Le rectangle (repère de la carte) est libre : dans la carte, sur aucune case bloquante, sur aucune collision d'objet
   * ni sur l'un des corps `others` (les personnages). Les collisions de `ignore` ne comptent pas (le tas qui grandit).
   */
  areaFree(b: Box, others: Phaser.Physics.Arcade.Body[] = [], ignore: readonly Phaser.GameObjects.GameObject[] = []): boolean {
    if (b.left < 0 || b.top < 0 || b.right > this.width || b.bottom > this.height) return false;
    for (let ty = Math.floor(b.top / TILE); ty <= Math.floor((b.bottom - 0.01) / TILE); ty++) {
      for (let tx = Math.floor(b.left / TILE); tx <= Math.floor((b.right - 0.01) / TILE); tx++) {
        if (this.floor.getTileAt(tx, ty)?.collides) return false;
      }
    }
    const overlaps = (l: number, t: number, r: number, bo: number) => b.left < r && b.right > l && b.top < bo && b.bottom > t;
    const zones = (this.obstacles.getChildren() as Phaser.GameObjects.Zone[]).filter((z) => !ignore.includes(z));
    if (zones.some((z) => overlaps(z.x - z.width / 2, z.y - z.height / 2, z.x + z.width / 2, z.y + z.height / 2))) return false;
    return !others.some((o) => overlaps(o.left, o.top, o.right, o.bottom));
  }

  /**
   * Ce qui roule (`roll` de props.json) montre l'image de sa planche que donne sa position : un tour complet (π × diamètre
   * du tronc, au gabarit de 5 cm par pixel) = les 4 images, dans le sens où il avance ; à l'arrêt comme en route, donc l'écorce
   * tourne exactement du chemin parcouru. L'objet qui n'est pas encore l'ordinaire (`into`) garde son dessin.
   */
  rollFrame(p: PlacedProp): void {
    const r = p.def.roll;
    if (!r || r.into) return;
    const turn = (Math.PI * woodShape(p.def.dims).diameter) / CM_PER_PX;
    const at = r.axis === 'ew' ? p.y : p.x;
    const i = Math.min(3, Math.floor((((at % turn) + turn) % turn) / (turn / 4)));
    p.image.setTexture(r.sheet, this.scene.anims.get(`${r.sheet}-roll`).frames[i].frame.name);
  }

  /** Déplace un objet posé de (dx, dy) pixels : image, collisions et repères. L'état de la partie n'est pas touché. */
  moveProp(p: PlacedProp, dx: number, dy: number): void {
    p.x += dx;
    p.y += dy;
    p.baseX += dx;
    p.baseY += dy;
    p.top += dy;
    p.aimX += dx;
    p.aimY += dy;
    if (p.box) {
      p.box.left += dx;
      p.box.right += dx;
      p.box.top += dy;
      p.box.bottom += dy;
    }
    for (const part of p.parts) {
      const o = part as Phaser.GameObjects.GameObject & { x: number; y: number };
      o.x += dx;
      o.y += dy;
      if (part instanceof Phaser.GameObjects.Zone) (part.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    }
    if (p.def.layer !== 'floor') p.image.setDepth(p.y);
    this.rollFrame(p);
  }

  /**
   * L'objet `p` devient `type` (la pièce du tronc devient la bille ronde qui roule) en gardant sa silhouette au même endroit
   * (coin bas gauche de la silhouette). Renvoie le nouvel objet ; l'état de la partie n'est pas touché.
   */
  convertProp(p: PlacedProp, type: string): PlacedProp {
    const old = images.find((i) => i.key === (p.flip ? `${p.def.image}-left` : p.def.image))!;
    const next = images.find((i) => i.key === propDefs[type].image)!;
    const x = p.x + old.silhouette.x - next.silhouette.x;
    const y = p.y - old.height + old.silhouette.y + old.silhouette.h - (next.silhouette.y + next.silhouette.h) + next.height;
    this.removeProp(p);
    return this.placeProp({ id: p.id, type, x, y }, { spawned: p.spawned, chain: p.chain, length: p.length });
  }

  /** Retire un objet posé (image, collisions, fumées, lueurs). */
  removeProp(p: PlacedProp): void {
    this.scene.tweens.killTweensOf(p.parts);
    for (const part of p.parts) part.destroy();
    this.props.splice(this.props.indexOf(p), 1);
  }

  /** Affiche un objet possédable posé au sol : son image au sol (`ground`), sinon son icône, son point au sol en bas, au milieu. */
  placeGround(item: GroundItem): PlacedGround {
    const def = items[item.item];
    const image = this.scene.add.image(item.x, item.y, def.ground ?? def.icon).setOrigin(0.5, 1).setDepth(item.y);
    const g = { item, image };
    this.ground.push(g);
    return g;
  }

  removeGround(g: PlacedGround): void {
    g.image.destroy();
    this.ground.splice(this.ground.indexOf(g), 1);
  }

  /** Taille d'une image (une image de planche pour une planche). */
  textureSize(key: string): { w: number; h: number } {
    const f = this.scene.textures.getFrame(key);
    return { w: f.width, h: f.height };
  }

  /**
   * Affiche un tas : la pièce de chaque place prise, à sa place, dans l'ordre d'affichage du genre (`drawOrder`) ;
   * tout le tas est à la profondeur du bas de sa pièce la plus en avant. Chaque pièce au sol a sa collision, dès `blockFrom` pièces.
   */
  placePile(pile: Pile): PlacedPile {
    const def = shapeOf(pileDefs[pile.pile], !!pile.turned);
    const ground = pile.places.map((id) => def.places[id]).filter((q) => q.body);
    // le lien seul par terre a son propre dessin ; sous des pièces, on n'en voit que les deux bouts
    const ties = pile.tie ? tieImages(def, pile.places) : [];
    // le lien seul est à la profondeur de son propre bas
    const depth = Math.max(...pile.places.map((id) => pile.y + def.places[id].y), ...ties.map((t) => pile.y + t.y));
    const parts: Phaser.GameObjects.GameObject[] = drawOrder(def, pile.places).map((id, i) => {
      const q = def.places[id];
      return this.scene.add.image(pile.x + q.x, pile.y + q.y, q.image).setOrigin(0, 1).setDepth(depth + (i + 1) / 1000);
    });
    // le lien ceinture le tas par-dessous : sous toutes les pièces
    for (const t of ties) parts.push(this.scene.add.image(pile.x + t.x, pile.y + t.y, t.image).setOrigin(0, 1).setDepth(depth));
    const zones = pileBlocks(def, pile.places) ? ground.map((q) => this.addObstacle(pile.x + q.body!.x + q.body!.w / 2, pile.y + q.body!.y + q.body!.h / 2, q.body!.w, q.body!.h)) : [];
    parts.push(...zones);
    const placed = { pile, def, zones, depth, parts };
    this.piles.push(placed);
    return placed;
  }

  /** Retire un tas affiché (images et collisions). */
  removePile(p: PlacedPile): void {
    for (const part of p.parts) part.destroy();
    this.piles.splice(this.piles.indexOf(p), 1);
  }

  /** Le tas a changé (GameState) : il est redessiné avec ses pièces et ses collisions. */
  refreshPile(p: PlacedPile): PlacedPile {
    this.removePile(p);
    return this.placePile(p.pile);
  }

  /**
   * (o.x, o.y) = coin bas gauche de l'image : c'est aussi la profondeur d'affichage (y des pieds).
   * `flip` : version couchée vers la gauche (image `-left`) ; `spawned` : objet né pendant la partie (o.id est alors son identifiant d'objet né).
   */
  placeProp(o: MapObject, opts: { flip?: boolean; spawned?: boolean; chain?: Chain; hits?: number; length?: number } = {}): PlacedProp {
    const flip = !!opts.flip;
    const scene = this.scene;
    const p = propDefs[o.type];
    const ay = o.y;
    // ce qui se fend montre la fente déjà ouverte (coups notés dans GameState) ; la dernière image d'étape ne dure qu'un instant
    const stage = p.harvest?.staged && opts.hits ? `-n${Math.min(opts.hits, p.harvest.hits - 1)}` : '';
    const image = (flip ? `${p.image}-left` : p.image) + stage;
    const obj = p.anim ? scene.add.sprite(o.x, ay, image).play(`${image}-${p.anim}`) : scene.add.image(o.x, ay, image);
    obj.setOrigin(0, 1).setDepth(p.layer === 'floor' ? DEPTH.floor : ay);
    if (p.blend === 'add') obj.setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.light);
    const parts: Phaser.GameObjects.GameObject[] = [obj];
    // coin haut gauche de l'image, pour les coordonnées "dans l'image"
    const ox = o.x;
    const oy = ay - obj.height;
    // abscisse dans l'image, en miroir pour la version de gauche : un rectangle [x, x + w[ devient [W - x - w, W - x[
    const fx = (x: number, w = 1) => (flip ? obj.width - x - w : x);

    let baseY = ay - 8;
    if (p.body) {
      baseY = ay - p.body.bottom - p.body.h / 2;
      parts.push(this.addObstacle(ox + obj.width / 2, baseY, p.body.w, p.body.h));
    }
    for (const b of p.bodies ?? []) {
      parts.push(this.addObstacle(ox + fx(b.x, b.w) + b.w / 2, oy + b.y + b.h / 2, b.w, b.h));
      baseY = Math.max(baseY, oy + b.y + b.h / 2);
    }
    const zones = parts.filter((q): q is Phaser.GameObjects.Zone => q instanceof Phaser.GameObjects.Zone);
    const box = zones.length
      ? {
          left: Math.min(...zones.map((z) => z.x - z.width / 2)),
          right: Math.max(...zones.map((z) => z.x + z.width / 2)),
          top: Math.min(...zones.map((z) => z.y - z.height / 2)),
          bottom: Math.max(...zones.map((z) => z.y + z.height / 2)),
        }
      : undefined;
    const placed: PlacedProp = {
      id: o.id,
      spawned: !!opts.spawned,
      flip,
      chain: opts.chain,
      type: o.type,
      def: p,
      x: o.x,
      y: o.y,
      baseX: ox + obj.width / 2,
      baseY,
      top: oy,
      box,
      aimX: p.aim ? ox + fx(p.aim[0]) + 0.5 : ox + obj.width / 2,
      aimY: p.aim ? oy + p.aim[1] : baseY,
      image: obj,
      parts,
      hits: opts.hits ?? 0,
      interact: o.interact,
      length: opts.length ?? startLength(p),
    };
    this.props.push(placed);
    this.rollFrame(placed);

    for (const [sx, sy] of p.smoke ?? []) {
      const smoke = scene.add
        .particles(ox + fx(sx), oy + sy, 'smoke', {
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

    if (p.shadow) {
      // l'ombre du toit au sol, sous les poteaux et sous Xéros ; elle s'efface avec le toit (systems/roofs.ts)
      placed.shadow = scene.add
        .graphics()
        .fillStyle(SHADOW.color, SHADOW.alpha)
        .fillPoints(roofShadow(p, o.x, ay), true)
        .setDepth(DEPTH.shadow);
      parts.push(placed.shadow);
    }

    if (p.light) {
      const glow = scene.add
        .image(ox + fx(p.light.x), oy + p.light.y, 'glow')
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
