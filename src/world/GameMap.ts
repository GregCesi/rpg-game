import Phaser from 'phaser';
import { DEPTH, GLOW, INTERIOR, SHADOW, TILE } from '../config';
import { roofShadow } from './roofShadow';
import { items, props as propDefs } from '../content';
import type { Corner, MapData, MapObject, PropDef } from '../content/types';
import { drawOrder, stateImage, kindOf, pileBlocks, pileDefOf, placeAim, shapeOf, tieImages, topPieces, type PileShape, type ShapePlace } from './pileShape';
import { formImage, naturalGround, stableNatural } from './natural';
import type { GroundItem, Joint, MapState, Pile, WorldChange } from '../state';
import { tilesets } from '../generated/assets';
import { CM_PER_PX } from '../content/gabarit';
import type { Natural, WoodPiece } from '../content/types';
import { woodDef, woodOf } from './woodPiece';
import { agedKey, lookOf, sizeOf, woodBody, woodSize } from './woodShape';
import { woodTexture } from './woodTexture';
import { blocks, boxOf, depthsOf, overlaps, solidOf, supportsOf, type BuildPiece } from './build';
import type { BuildPlaced } from '../content/types';
import { lookDef, lookOf as woodLookOf } from './woodShape';
import { buildLook } from './buildView';
import { runLayout, wallOf, wallRuns } from './wallRuns';
import { wallTexture } from './wallTexture';
import { drawJoints, halvingOverlays } from './jointView';
import { backCaps, buildingsOf, type Building, type Rect } from './interior';

/**
 * Taille de l'image d'un objet de props.json : celle de son image dessinée, ou, pour une pièce de bois, celle de ses réglages
 * (`wood`, sinon ceux de sa définition).
 */
export function propSize(scene: Phaser.Scene, def: PropDef, opts: { flip?: boolean; wood?: WoodPiece } = {}): { w: number; h: number } {
  if (def.wood) {
    const w = opts.wood ?? def.wood;
    return woodSize(w.size, lookOf(w), w.axis, w.length);
  }
  const f = scene.textures.getFrame(opts.flip ? `${def.image}-left` : def.image);
  return { w: f.width, h: f.height };
}

/** Collision d'un objet dans le repère de son image (voir `footprint`), selon ses réglages pour une pièce de bois. */
export function propFootprint(scene: Phaser.Scene, def: PropDef, opts: { flip?: boolean; wood?: WoodPiece } = {}): Box | undefined {
  const { w, h } = propSize(scene, def, opts);
  const piece = def.wood ? (opts.wood ?? def.wood) : undefined;
  const body = piece ? woodBody(piece.size, lookOf(piece), piece.axis, piece.length) : def.body;
  return footprint({ ...def, body, ...(piece ? { bodies: undefined } : {}) }, w, h, !!opts.flip);
}

/** Ce qu'il faut noter dans GameState d'un objet posé pour le retrouver tel quel (type, place, longueur, réglages de bois). */
export function stateOf(p: PlacedProp): WorldChange {
  return {
    type: p.type,
    x: p.x,
    y: p.y,
    ...(p.flip ? { flip: true } : {}),
    ...(p.length !== undefined ? { length: p.length } : {}),
    ...(p.wood ? { wood: structuredClone(p.wood) } : {}),
    ...(p.natural ? { natural: { ...p.natural } } : {}),
  };
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
export function groundCenter(def: PileShape): [number, number] {
  const b = groundBox(def);
  return [(b.left + b.right) / 2, (b.top + b.bottom) / 2];
}

/** Emprise au sol de toutes les places au sol d'un tas (repère du tas). */
export function groundBox(def: PileShape): Box {
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

/**
 * Les détails au hasard du sol d'une carte, posés de façon stable (même case = mêmes détails), pour les cases [x0, x1[ × [y0, y1[ ;
 * (ox, oy) : où tombe le coin haut gauche de la carte (la zone voisine vue par-delà le bord, world/zoneBand.ts).
 */
export function drawDecals(scene: Phaser.Scene, def: MapData, ox: number, oy: number, r: { x0: number; y0: number; x1: number; y1: number }): Phaser.GameObjects.Image[] {
  const tileset = tilesets.find((t) => t.key === def.tileset)!;
  const cells = def.layers.ground;
  const out: Phaser.GameObjects.Image[] = [];
  for (let y = r.y0; y < r.y1; y++) {
    for (let x = r.x0; x < r.x1; x++) {
      const d = tileset.decals[cells[y * def.width + x]];
      if (!d) continue;
      const h = hash(x * 3 + 7, y * 5 + 11);
      if ((h % 1000) / 1000 >= d.chance) continue;
      const img = d.images[(h >>> 10) % d.images.length];
      const dx = ((h >>> 4) % 17) - 8;
      const dy = ((h >>> 8) % 13) - 6;
      out.push(scene.add.image(ox + x * TILE + TILE / 2 + dx, oy + y * TILE + TILE / 2 + dy, img).setDepth(DEPTH.decal).setFlipX(((h >>> 14) & 1) === 1));
    }
  }
  return out;
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
  /** La lueur de son feu (`light` de props.json) : cachée sous un toit opaque (systems/roofs.ts). */
  glow?: Phaser.GameObjects.Image;
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
  /** Pièce de bois : ses réglages (diamètre, longueur, forme, faces, sens, coupe commencée, coin planté). */
  wood?: WoodPiece;
  /** Matière naturelle (la dalle) : sa forme et sa taille (GameState, ou tirées de son identifiant Tiled). */
  natural?: Natural;
  /** Un fagot posé seul : son nombre de branches (absent : le fagot plein). */
  bundle?: number;
}

/** Une pièce posée en mode construction, affichée : son état (GameState), son image, sa collision si elle bloque. */
export interface PlacedBuild {
  piece: BuildPiece;
  image: Phaser.GameObjects.Image;
  zone?: Phaser.GameObjects.Zone;
  /** Un morceau de mur dans un tronçon : la part de l'image du tronçon qu'il montre (repère de l'image). */
  crop?: { x: number; y: number; w: number; h: number };
  /**
   * Une pièce du bâtiment vue dans son intérieur (chantier « intérieurs ») : elle appartient à la carte du dehors, on ne la retire pas
   * d'ici (le mode construction l'ignore au clic droit).
   */
  fixed?: boolean;
  /**
   * Ce que la pièce porte en plus de son image (ce que `anim`, `light`, `smoke` de props.json font d'un objet posé depuis Tiled) : la
   * lueur de l'âtre, la fumée du couronnement de la cheminée ; chacune à sa place dans l'image (`at`, px depuis son coin haut gauche).
   */
  parts?: { obj: Phaser.GameObjects.Image | Phaser.GameObjects.Particles.ParticleEmitter; at: [number, number]; above?: boolean; light?: boolean }[];
  /**
   * Une pièce longue nord-sud (un mur de côté, une poutre, un plateau) : les tranches de son image après la première (que montre
   * `image`, rognée), chacune à la profondeur de l'endroit du sol qu'elle montre (`sideSlices`, chantier « maison-2 »). Elles suivent
   * l'opacité de `image` (systems/roofs.ts).
   */
  slices?: Phaser.GameObjects.Image[];
}

/** La hauteur d'une tranche d'une pièce longue nord-sud (px) : assez fine pour qu'un personnage soit devant ou derrière d'un seul tenant. */
const SLICE = 2;

/**
 * La lueur d'un feu (`light` de props.json) : l'image `glow`, additive, qui vacille. Son opacité est celle du vacillement multipliée
 * par sa part visible (`setGlowCover` : 0 sous un toit opaque, 1 à découvert ; systems/roofs.ts) : ce qui est caché ne se voit pas,
 * lumière comprise.
 */
export function glowAt(scene: Phaser.Scene, x: number, y: number, radius: number): Phaser.GameObjects.Image {
  const r = radius / GLOW.image;
  const glow = scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(GLOW.tint).setScale(r).setAlpha(GLOW.alpha).setDepth(DEPTH.light);
  glow.setData('cover', 1);
  const flicker = { a: GLOW.alpha, s: r };
  scene.tweens.add({
    targets: flicker,
    a: { from: GLOW.from, to: GLOW.to },
    s: { from: r * GLOW.scale[0], to: r * GLOW.scale[1] },
    duration: GLOW.ms + Math.random() * GLOW.jitter,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
    onUpdate: () => {
      if (!glow.active) return;
      glow.setAlpha(flicker.a * (glow.getData('cover') as number)).setScale(flicker.s);
    },
  });
  return glow;
}

/** La part visible d'une lueur (0 : cachée sous un toit opaque, 1 : à découvert), appliquée tout de suite. */
export function setGlowCover(glow: Phaser.GameObjects.Image, cover: number): void {
  const was = glow.getData('cover') as number;
  if (was === cover) return;
  glow.setData('cover', cover);
  glow.setVisible(cover > 0.001);
  if (was > 0) glow.setAlpha((glow.alpha / was) * cover);
  else glow.setAlpha(GLOW.alpha * cover);
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
  def: PileShape;
  /** Collisions des pièces posées au sol (aucune tant que le tas a moins de `blockFrom` pièces). */
  zones: Phaser.GameObjects.Zone[];
  /** Profondeur d'affichage du tas : le bas de l'image de sa pièce la plus en avant. */
  depth: number;
  /** Images et collisions : détruites quand le tas change. */
  parts: Phaser.GameObjects.GameObject[];
}

/** Celui à qui l'on parle (entities/Npc.ts) : il se tourne vers Xéros, puis reprend sa direction ; le modèle ne connaît que cela. */
export interface Talker {
  faceToward(x: number, y: number): void;
  resume(): void;
}

/**
 * Ce que fait la touche E devant une cible. `rest` : poser ce qu'on tient sur l'objet (le rouleau, la branche sur le billot) ;
 * `unload` : reprendre ce qu'il porte ; `tie` : reprendre le lien d'un tas qui n'a plus de pièce ; `learn` : l'objet enseigne un
 * plan (la planchette) ; `stake` : reprendre un piquet planté ; `site-place` : poser ce qu'on tient à une place du chantier ; `site-help` : une place dont la pièce est trop lourde à porter, qu'on dresse avec l'aide de la mère.
 */
export type Action =
  | { kind: 'talk'; dialogue: string; npc?: Talker }
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
  | { kind: 'site-place'; site: number; place: string }
  | { kind: 'site-help'; site: number; place: string }
  | { kind: 'swing'; id: number };

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
  /** Les pièces posées en mode construction. */
  readonly builds: PlacedBuild[] = [];
  /** Les croisements des mi-bois, posés par-dessus leurs deux pièces (redessinés à chaque changement). */
  private overlays: Phaser.GameObjects.Image[] = [];
  /**
   * Le décalage d'affichage de chaque pièce posée (px) : une pièce se cale sur le dessus *dessiné* de ce qui la porte. En règle D, une
   * pièce couchée nord-sud (le solin, la poutre) n'est pas relevée de sa hauteur à l'écran : ce qui repose dessus descend d'autant
   * (`down`) ; un tronçon de mur nord-sud calé au ras d'un angle décale ce qui repose dessus d'autant (`dx`).
   */
  private readonly shown = new Map<number, { dx: number; down: number }>();
  /** Les assemblages des pièces fixes (le bâtiment vu de son intérieur), qui appartiennent à la carte du dehors. */
  private readonly shellJoints: Joint[] = [];
  /** Les pièces closes d'un intérieur (cm), données par la vue de dedans ; rien dehors, où elles se calculent des pièces posées. */
  private readonly shellRooms?: readonly Rect[];
  /** Les bâtiments où l'on entre de cette carte (dehors), recalculés à chaque pose ou retrait de pièce (`sortBuilds`). */
  buildings: Building[] = [];
  /** La pénombre (intérieurs), si la carte en a une. */
  private shade?: Phaser.GameObjects.Rectangle;
  /** Augmente à chaque pose ou retrait de pièce (`sortBuilds`) : ce qui se calcule des pièces posées sait quand recommencer. */
  buildsVersion = 0;
  /** L'emprise de la pièce d'un intérieur (cm) : le mode construction n'y pose rien au-dehors. */
  room?: { x: number; y: number; w: number; d: number };
  readonly width: number;
  readonly height: number;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: MapData,
    private readonly changes: MapState,
    /** Les pièces d'un bâtiment vues de son intérieur, et leurs assemblages (fixes : elles sont à la carte du dehors). */
    shell?: { pieces: readonly BuildPiece[]; joints: readonly Joint[]; rooms: readonly Rect[] },
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
    drawDecals(scene, def, 0, 0, { x0: 0, y0: 0, x1: def.width, y1: def.height });

    // Objets posés
    this.obstacles = scene.physics.add.staticGroup();
    for (const o of def.objects) {
      // dans un bâtiment posé (`inside`) : seulement dans son intérieur calculé
      if (o.inside) continue;
      const c = changes.changes[o.id];
      if (!c) this.placeProp(o);
      else if (c.type) this.placeProp({ id: o.id, type: c.type, x: c.x, y: c.y }, { flip: c.flip, length: c.length, wood: c.wood, natural: c.natural });
    }
    for (const o of changes.spawned) this.placeProp(o, { flip: o.flip, spawned: true, length: o.length, wood: o.wood, natural: o.natural, bundle: o.bundle });
    for (const g of changes.ground) this.placeGround(g);
    for (const pile of changes.piles) this.placePile(pile);
    for (const p of shell?.pieces ?? []) this.placeBuild(p, true);
    this.shellJoints.push(...(shell?.joints ?? []));
    this.shellRooms = shell?.rooms;
    for (const b of changes.builds) this.placeBuild(b);
    this.sortBuilds();

    // Pénombre (intérieurs) : les lueurs des feux sont posées par-dessus
    if (def.ambient) {
      this.shade = scene.add.rectangle(0, 0, this.width, this.height, INTERIOR.shade, def.ambient).setOrigin(0).setDepth(DEPTH.ambient);
    }
  }

  /**
   * Ce que E et les clics peuvent viser en ce moment : dialogues, récoltes à la main, objets à prendre, objets au sol, pièces de tas,
   * lien seul d'un tas, objets qui portent quelque chose ; et, `held` étant les clés de ce que tiennent les mains (le
   * rouleau, la branche), les objets sur lesquels le poser (`rest`).
   */
  interactables(held: readonly string[] = []): Interactable[] {
    const list: Interactable[] = [];
    for (const p of this.props) {
      const dialogue = p.interact ?? p.def.interact;
      if (held.some((h) => p.def.rest?.[h])) list.push({ x: p.aimX, y: p.aimY, top: promptTop(p), action: { kind: 'rest', prop: p } });
      else if (dialogue) list.push({ x: p.baseX, y: p.baseY, top: p.top, action: { kind: 'talk', dialogue } });
      else if (p.def.teaches) list.push({ x: p.baseX, y: p.baseY, top: p.top, action: { kind: 'learn', prop: p, plan: p.def.teaches } });
      // ce qu'il porte se reprend par E (le rouleau sur le billot) ; on le coupe par F, l'outil en main
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
    // ce qui s'ouvre et se ferme parmi les pièces posées en mode construction (le volet) : visé au milieu de son emprise au sol
    for (const b of this.builds) {
      if (!('prop' in b.piece.piece) || !propDefs[b.piece.piece.prop].swing) continue;
      const box = boxOf(b.piece);
      list.push({ x: (box.x + box.w / 2) / CM_PER_PX, y: (box.y + box.d / 2) / CM_PER_PX, top: b.image.y - b.image.displayHeight, action: { kind: 'swing', id: b.piece.id } });
    }
    // un objet encore caché (il attend la fin d'une chute) ne se ramasse pas
    for (const g of this.ground) if (g.image.visible) list.push({ x: g.item.x, y: g.item.y - 4, top: g.image.y - g.image.height, action: { kind: 'pickup', ground: g } });
    return list;
  }

  /**
   * Le rectangle (repère de la carte) est libre  /**
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
    // les obstacles proches seulement, par l'arbre des collisions fixes (une forêt en a des milliers), puis le contrôle exact
    const near = this.scene.physics.overlapRect(b.left - 1, b.top - 1, b.right - b.left + 2, b.bottom - b.top + 2, false, true) as Phaser.Physics.Arcade.StaticBody[];
    const zones = near
      .map((body) => body.gameObject as Phaser.GameObjects.Zone)
      .filter((z) => z && this.obstacles.contains(z) && !ignore.includes(z));
    if (zones.some((z) => overlaps(z.x - z.width / 2, z.y - z.height / 2, z.x + z.width / 2, z.y + z.height / 2))) return false;
    return !others.some((o) => overlaps(o.left, o.top, o.right, o.bottom));
  }

  /**
   * La pièce de bois qui roule montre l'image de sa texture que donne sa position : un tour complet (π × diamètre du tronc, au
   * gabarit de 5 cm par pixel) = les 4 images, dans le sens où elle avance ; à l'arrêt comme en route, donc l'écorce tourne
   * exactement du chemin parcouru. Une pièce qui ne roule pas (dressée, demi, quart, coin planté) garde son image.
   */
  rollFrame(p: PlacedProp): void {
    const r = p.def.roll;
    if (!r || !p.wood || p.wood.wedge) return;
    const turn = (Math.PI * sizeOf(p.wood.size).diameter) / CM_PER_PX;
    const at = r.axis === 'ew' ? p.y : p.x;
    const i = Math.min(3, Math.floor((((at % turn) + turn) % turn) / (turn / 4)));
    p.image.setFrame(String(i));
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

  /** Retire un objet posé (image, collisions, fumées, lueurs). */
  removeProp(p: PlacedProp): void {
    this.scene.tweens.killTweensOf(p.parts);
    for (const part of p.parts) part.destroy();
    this.props.splice(this.props.indexOf(p), 1);
  }

  /**
   * Affiche un objet possédable posé au sol : son image au sol (`ground`) dans sa vue, sinon son icône, son point au sol en bas,
   * au milieu.
   */
  placeGround(item: GroundItem): PlacedGround {
    const key = naturalGround(items[item.item], item.view, item.natural, (k) => this.scene.textures.exists(k));
    const image = this.scene.add.image(item.x, item.y, key).setOrigin(0.5, 1).setDepth(item.y);
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
    const def = shapeOf(pileDefOf(kindOf(pile)), !!pile.turned);
    const ground = pile.places.map((id) => def.places[id]).filter((q) => q.body);
    // le lien seul par terre a son propre dessin ; sous des pièces, on n'en voit que les deux bouts
    const ties = pile.tie ? tieImages(def, pile.places, !!pile.turned, (k) => this.scene.textures.getFrame(k).width) : [];
    // le lien seul est à la profondeur de son propre bas
    const depth = Math.max(...pile.places.map((id) => pile.y + def.places[id].y), ...ties.map((t) => pile.y + t.y));
    const parts: Phaser.GameObjects.GameObject[] = drawOrder(def, pile.places).map((id, i) => {
      const q = def.places[id];
      return this.scene.add.image(pile.x + q.x, pile.y + q.y, this.placeImage(q), q.wood ? '0' : undefined).setOrigin(0, 1).setDepth(depth + (i + 1) / 1000);
    });
    // le lien ceinture le tas par-dessous : sous toutes les pièces
    for (const t of ties) parts.push(this.scene.add.image(pile.x + t.x, pile.y + t.y, t.image).setOrigin(0, 1).setDepth(depth));
    const zones = pileBlocks(def, pile.places) ? ground.map((q) => this.addObstacle(pile.x + q.body!.x + q.body!.w / 2, pile.y + q.body!.y + q.body!.h / 2, q.body!.w, q.body!.h)) : [];
    parts.push(...zones);
    const placed = { pile, def, zones, depth, parts };
    this.piles.push(placed);
    return placed;
  }

  /** Clé de l'image d'une place de tas : celle de piles.json, ou la pièce de bois assemblée à sa longueur (image '0'). */
  placeImage(q: ShapePlace): string {
    return q.wood ? woodTexture(this.scene, q.wood) : q.image;
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
  placeProp(o: MapObject, opts: { flip?: boolean; spawned?: boolean; length?: number; wood?: WoodPiece; open?: boolean; natural?: Natural; bundle?: number } = {}): PlacedProp {
    const scene = this.scene;
    const base = propDefs[o.type];
    // la pièce de bois : sa définition et son image assemblée tirées de ses réglages (GameState, Tiled, sinon props.json) ; jamais retournée
    const wood = base.wood ? woodOf(base, opts.wood ?? o.wood) : undefined;
    const p: PropDef = wood ? woodDef(base, wood) : base;
    const flip = !!opts.flip && !wood;
    const ay = o.y;
    // une matière naturelle : sa forme et sa taille, ou, posée dans Tiled et jamais bougée, celles que donne son identifiant
    const natural = p.natural ? (opts.natural ?? (opts.spawned ? undefined : stableNatural(p.natural, o.id))) : undefined;
    // un objet de bois travaillé posé dans Tiled à son âge (le panneau, vieux)
    // un fagot posé seul : le dessin de son nombre de branches (`<image>-n<n>`)
    const bundle = opts.bundle;
    const drawn = stateImage(p.image, o.type, bundle);
    const image = flip ? `${drawn}-left` : agedKey(formImage(drawn, natural), p.aged ? o.age : undefined);
    const obj = wood
      ? scene.add.image(o.x, ay, woodTexture(scene, wood, { open: opts.open }), '0')
      : p.anim
        ? scene.add.sprite(o.x, ay, image).play(`${image}-${p.anim}`)
        : scene.add.image(o.x, ay, image);
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
      hits: 0,
      interact: o.interact,
      length: opts.length ?? startLength(p),
      wood,
      ...(natural ? { natural } : {}),
      ...(bundle ? { bundle } : {}),
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
      placed.glow = glowAt(scene, ox + fx(p.light.x), oy + p.light.y, p.light.radius);
      parts.push(placed.glow);
    }
    return placed;
  }

  /**
   * Affiche une pièce posée en mode construction : son image (relevée de sa hauteur), et sa collision, son emprise au sol en vraie
   * grandeur, si elle bloque (posée sous BUILD.high). Appeler `sortBuilds` ensuite pour l'ordre d'affichage.
   */
  placeBuild(piece: BuildPiece, fixed = false): PlacedBuild {
    const look = buildLook(this.scene, piece);
    const def = 'prop' in piece.piece ? propDefs[piece.piece.prop] : undefined;
    // une pièce qui s'anime (le feu de l'âtre) : sa planche jouée, comme un objet posé depuis Tiled
    const anim = def?.anim && this.scene.anims.exists(`${look.key}-${def.anim}`) ? `${look.key}-${def.anim}` : undefined;
    const image = (anim ? this.scene.add.sprite(look.x, look.y, look.key).play(anim) : this.scene.add.image(look.x, look.y, look.key, look.frame)).setOrigin(0, 1);
    let zone: Phaser.GameObjects.Zone | undefined;
    if (blocks(piece)) {
      const b = boxOf(piece);
      zone = this.addObstacle((b.x + b.w / 2) / CM_PER_PX, (b.y + b.d / 2) / CM_PER_PX, b.w / CM_PER_PX, b.d / CM_PER_PX);
    }
    const placed: PlacedBuild = { piece, image, zone, ...(fixed ? { fixed } : {}) };
    if (def) placed.parts = this.buildParts(def, piece.view ?? 0, image);
    this.builds.push(placed);
    return placed;
  }

  /**
   * La lueur et la fumée d'une pièce posée (`light`, `smoke` de props.json, en px de sa vue de base ; dans une autre vue, au milieu de
   * l'image), placées par `placeParts`.
   */
  private buildParts(def: (typeof propDefs)[string], view: number, image: Phaser.GameObjects.Image): NonNullable<PlacedBuild['parts']> {
    const scene = this.scene;
    const parts: NonNullable<PlacedBuild['parts']> = [];
    const at = (x: number, y: number): [number, number] => (view === 0 ? [x, y] : [Math.round(image.width / 2), y]);
    for (const [sx, sy] of def.smoke ?? []) {
      const obj = scene.add.particles(0, 0, 'smoke', {
        speedY: { min: -18, max: -10 },
        speedX: { min: -2, max: 7 },
        lifespan: 3000,
        scale: { start: 0.8, end: 2 },
        alpha: { start: 0.7, end: 0 },
        frequency: 220,
      });
      parts.push({ obj, at: at(sx, sy), above: true });
    }
    if (def.light) parts.push({ obj: glowAt(scene, 0, 0, def.light.radius), at: at(def.light.x, def.light.y), light: true });
    return parts;
  }

  /** La lueur et la fumée d'une pièce posée suivent son image (après un reclassement : sa place et sa profondeur). */
  private placeParts(b: PlacedBuild): void {
    for (const p of b.parts ?? []) {
      p.obj.setPosition(b.image.x + p.at[0], b.image.y - b.image.height + p.at[1]);
      if (p.above) p.obj.setDepth(b.image.depth + 1);
    }
  }

  /**
   * Les murs de côté (Grégoire, chantier « maison-2 » : rien du mur ne passe devant ce qui est à côté de lui) : une pièce longue
   * nord-sud n'a pas une seule profondeur, son bord sud, qui la ferait passer devant tout ce qui la longe. Son image est découpée en
   * tranches de `SLICE` rangées ; chaque tranche montre le point le plus au sud de la pièce sur ses rangées (vue de trois quarts :
   * y à l'écran = y au sol − hauteur, le point vu est au plus haut, dans l'emprise) et prend la profondeur de ce point, jamais plus
   * que celle de la pièce entière (son plafond du mur du fond, l'ordre de ce qui la porte). Un personnage qui longe le mur est derrière
   * ce qui est au sud de lui, devant ce qui est au nord.
   */
  private sideSlices(b: PlacedBuild): void {
    for (const s of b.slices ?? []) s.destroy();
    b.slices = undefined;
    const img = b.image;
    const full = { x: 0, y: 0, w: img.frame.width, h: img.frame.height };
    const base = b.crop ?? full;
    img.setCrop(base.x, base.y, base.w, base.h);
    const box = solidOf(b.piece);
    if (box.d <= box.w || box.d < 60 || img instanceof Phaser.GameObjects.Sprite) return;
    const depth = img.depth;
    const top = img.y - img.displayOriginY;
    const topZ = (box.z + box.h) / CM_PER_PX;
    const south = (box.y + box.d) / CM_PER_PX;
    const at = (r1: number) => Math.min(depth, Math.min(top + r1 + topZ, south) + box.z / 100000);
    const rows: [number, number][] = [];
    for (let r = base.y; r < base.y + base.h; r += SLICE) rows.push([r, Math.min(base.y + base.h, r + SLICE)]);
    if (rows.length < 2) return;
    const [r0, r1] = rows[0];
    img.setCrop(base.x, r0, base.w, r1 - r0).setDepth(at(r1));
    b.slices = rows.slice(1).map(([a, c]) =>
      this.scene.add.image(img.x, img.y, img.texture.key, img.frame.name).setOrigin(img.originX, img.originY).setCrop(base.x, a, base.w, c - a).setDepth(at(c)).setAlpha(img.alpha),
    );
  }

  /** Retire une pièce posée en mode construction (image et collision). */
  removeBuild(id: number): void {
    const i = this.builds.findIndex((b) => b.piece.id === id);
    if (i < 0) return;
    for (const s of this.builds[i].slices ?? []) s.destroy();
    this.builds[i].image.destroy();
    this.builds[i].zone?.destroy();
    for (const p of this.builds[i].parts ?? []) p.obj.destroy();
    this.builds.splice(i, 1);
  }

  /**
   * Après une pose ou un retrait : les tronçons de mur sont recalculés (chaque morceau montre sa part du dessin de son tronçon :
   * world/wallRuns.ts), puis chaque pièce posée est remise à sa profondeur (bord sud, puis hauteur, et toujours après ce qui la
   * porte : world/build.ts).
   */
  sortBuilds(): void {
    // chaque pièce reprend sa place calculée (les murs et le bois sont replacés par leur dessin commun), puis son calage
    for (const b of this.builds) {
      if ('wood' in b.piece.piece || wallOf(b.piece)) continue;
      const look = buildLook(this.scene, b.piece);
      b.image.setPosition(look.x, look.y);
    }
    this.buildsVersion++;
    const joints = [...this.shellJoints, ...this.changes.joints];
    this.drawWalls();
    drawJoints(this.scene, this.builds, joints);
    this.shown.clear();
    for (const b of [...this.builds].sort((a, c) => a.piece.z - c.piece.z)) {
      const o = this.offsetOf(b.piece);
      this.shown.set(b.piece.id, o);
      if (o.dx || o.down) b.image.setPosition(b.image.x + o.dx, b.image.y + o.down);
    }
    // le mur du fond de chaque pièce close reste derrière ce qui est dans la pièce, dedans comme dehors (world/interior.ts)
    const pieces = this.builds.map((b) => b.piece);
    this.buildings = this.shellRooms ? [] : buildingsOf(pieces);
    const rooms = this.shellRooms ?? this.buildings.flatMap((q) => q.rooms);
    const depths = depthsOf(pieces, rooms.length ? backCaps(pieces, rooms) : undefined);
    for (const b of this.builds) {
      const floor = b.piece.z === 0 && 'prop' in b.piece.piece && propDefs[b.piece.piece.prop].layer === 'floor';
      b.image.setDepth(floor ? DEPTH.floor : depths.get(b.piece.id)!);
      this.placeParts(b);
      if (!floor) this.sideSlices(b);
    }
    for (const o of this.overlays) o.destroy();
    this.overlays = halvingOverlays(this.scene, this.builds, joints).map((o) =>
      this.scene.add.image(o.x, o.y, o.key).setOrigin(0, 0).setDepth(o.depth).setAlpha(1),
    );
  }

  /**
   * Le décalage d'affichage d'une pièce (posée, ou en fantôme) : celui de la pièce qui la porte (celle dont l'emprise recoupe le plus
   * la sienne), plus ce que son dessin corrige : un dessus nord-sud en règle D dessiné plus bas que sa hauteur, un mur nord-sud calé
   * au ras d'un angle.
   */
  offsetOf(p: BuildPlaced): { dx: number; down: number } {
    const pieces = this.builds.map((b) => b.piece);
    const supports = supportsOf(pieces, p);
    if (!supports.length) return { dx: 0, down: 0 };
    const pb = boxOf(p);
    const area = (q: BuildPiece) => {
      const b = boxOf(q);
      return Math.max(0, Math.min(b.x + b.w, pb.x + pb.w) - Math.max(b.x, pb.x)) * Math.max(0, Math.min(b.y + b.d, pb.y + pb.d) - Math.max(b.y, pb.y));
    };
    // à recouvrement égal (le poteau d'angle sur un croisement), celle qui est dessinée à sa hauteur (pas en règle D)
    const s = supports.filter((q) => overlaps(boxOf(q), pb)).sort((a, b) => area(b) - area(a) || Number(this.reglD(a)) - Number(this.reglD(b)))[0] ?? supports[0];
    const placed = this.builds.find((b) => b.piece.id === s.id);
    const base = this.shown.get(s.id) ?? { dx: 0, down: 0 };
    if (!placed) return base;
    const sb = boxOf(s);
    let dx = base.dx;
    let down = base.down;
    if (this.reglD(s)) {
      // le dessus dessiné d'une pièce nord-sud : quelques rangées au-dessus de son emprise, au lieu de sa hauteur
      const drawn = 'wood' in s.piece ? lookDef(s.piece.wood.size, woodLookOf(s.piece.wood)).ns.extra : wallOf(s) ? 1 : Math.max(0, placed.image.height - Math.round(sb.d / CM_PER_PX));
      down += Math.round(sb.h / CM_PER_PX) - drawn;
    }
    // un mur nord-sud dont l'image n'est pas centrée sur son emprise (calée au ras d'un angle)
    if (wallOf(s) && s.view % 2) dx += placed.image.x - Math.round((sb.x + sb.w / 2) / CM_PER_PX - placed.image.width / 2);
    return { dx, down };
  }

  /** Le décalage d'affichage d'une pièce posée (calculé au dernier `sortBuilds`). */
  shownOffset(p: BuildPiece): { dx: number; down: number } {
    return this.shown.get(p.id) ?? { dx: 0, down: 0 };
  }

  /** Une pièce couchée nord-sud dessinée en règle D (pas relevée de sa hauteur) : le bois nord-sud, un objet couché tourné d'un quart. */
  private reglD(p: BuildPiece): boolean {
    if ('wood' in p.piece) return p.piece.wood.axis === 'ns';
    const def = 'prop' in p.piece ? propDefs[p.piece.prop] : items[p.piece.item];
    return !!def.lying && p.view % 2 === 1;
  }

  /** Les tronçons de mur : chaque morceau prend l'image de son tronçon, placée pour le tronçon, rognée à sa part. */
  private drawWalls(): void {
    const byId = new Map(this.builds.map((b) => [b.piece.id, b]));
    for (const run of wallRuns(this.builds.map((b) => b.piece))) {
      const key = wallTexture(this.scene, run);
      const f = this.scene.textures.getFrame(key);
      const lay = runLayout(run, f.width, f.height);
      run.pieces.forEach((p, i) => {
        const b = byId.get(p.id)!;
        const c = lay.crops[i];
        b.image.setTexture(key).setPosition(lay.x, lay.y).setCrop(c.x, c.y, c.w, c.h);
        b.crop = c;
      });
    }
  }

  /** Change la pénombre d'un intérieur (un volet ouvert, fermé). */
  setAmbient(alpha: number): void {
    this.shade?.setFillStyle(0x1a0e06, alpha);
  }

  /** Une collision de plus, un rectangle au sol en cm (la coupe du mur sud d'un intérieur). */
  addBlock(r: { x: number; y: number; w: number; d: number }): Phaser.GameObjects.Zone {
    return this.addObstacle((r.x + r.w / 2) / CM_PER_PX, (r.y + r.d / 2) / CM_PER_PX, r.w / CM_PER_PX, r.d / CM_PER_PX);
  }

  private addObstacle(x: number, y: number, w: number, h: number): Phaser.GameObjects.Zone {
    const zone = this.scene.add.zone(x, y, w, h);
    this.obstacles.add(zone);
    return zone;
  }
}
