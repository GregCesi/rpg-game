// PROPOSITION (hors jeu, jamais chargée par le jeu) : les bâtiments des quarts nord de la place du village et le panneau des nouvelles
// (CADRAGE-village.md, section 13) :
//   - p-ferme-riche (13.2) : la boutique de pierre de la ferme du riche sur la rue de l'ouest, l'étal luxueux, la réserve, la cour ;
//   - p-bucheron (13.3) : le magasin ouvert au sud et le chantier de vente ;
//   - p-menuisier (13.4) : la boutique abandonnée de l'ancien menuisier ;
//   - p-panneau (13.8) : le panneau des nouvelles.
// Planches de contrôle : npx tsx tools/essai-place-nord.ts (.art-preview/place-nord-dehors.png, place-nord-dedans.png,
// place-nord-pieces.png). L'outil commun (tools/essai-place.ts) monte toute la place d'après `BUILDINGS` et `PIECES`.
//
// Repère : tout est modelé dans les px de la zone village (5 cm par pixel, x vers l'est, y vers le sud, z vers le haut), à la place
// que lui donne le plan (art/proposals/village-plan-data.ts) ; `outside(o)` et `inside(o)` déplacent la scène pour que le coin
// nord-ouest de son emprise (`at`, débords et tout ce qui est posé compris) soit en `o`. Plusieurs bâtiments posés chacun à son `at`
// tiennent donc dans une seule scène.
//
// Ce qui vient d'ailleurs (rien n'est redessiné) : la pierre enduite, les angles et les encadrements de pierre de taille, les laves,
// le vitrail en losanges plombés, le dallage, l'enduit du dedans (village-maisons-pierre-matieres.ts, copiés du coq) ; la porte à
// pentures (village-maisons-pierre-pieces.ts) ; l'ossature de pan de bois, la chaux écaillée, les bardeaux, les vantaux, le solin, les
// appentis (village-maisons-bois-lib.ts) ; le chevalet (village-maisons-bois-pieces.ts) ; l'âtre (art/world/chimney.ts) ; les meubles,
// les dés, le seuil, les volets, les fagots, les tas de bois (calculés comme le jeu) : les images du jeu.

import { hearthModel } from '../world/chimney';
import { box, hash, part, timber, type Board, type Quad, type Scene, type Tex, type V3 } from '../lib/volumes';
import { PLACE_META, type PlaceBuilding, type PlaceBuildingId } from './place-types';
import { NOTICE_BOARD } from './village-plan-data';
import {
  PIECE_PAL, aged, boardsTex, foreign, frameQuads, gableRoof, leafTex, leanTo, solinBoards, toWorld,
  type HouseSpec,
} from './village-maisons-bois-lib';
import { pieceGrid as boisPiece } from './village-maisons-bois-pieces';
import { boards as plankBoards, flagstones, leaded, limePlaster, rendered, rubbleSection, withBays, type StoneBay } from './village-maisons-pierre-matieres';
import { strapDoorTex } from './village-maisons-pierre-pieces';
import {
  XPAL, darkBay, has, img, imgBoard, lavesRoof, moveBoard, moveScene, moved, onFace, pileBoards, prop, propImg, quad, sill, stack,
  stoneHex, wallRun, woodBoard, type Hole,
} from './place-nord-lib';
import { MENUISIER_ROOF, PIECES, PIECE_INFO, PIECE_USES, damagedShingles, hangingSign, pieceModel, pieceView } from './place-nord-pieces';

export { PIECES, PIECE_USES, PIECE_INFO, hangingSign, pieceView };

// =====================================================================================================================
// Outils communs
// =====================================================================================================================

/** Une pièce nouvelle posée comme le jeu la poserait : le coin nord-ouest de son emprise (px de la zone), sa vue, sa hauteur. */
function piece(key: string, x: number, y: number, v = 0, z = 0): Board {
  const p = PIECES.find((q) => q.key === key)!;
  const [w, d] = v % 2 ? [p.dims.d / 5, p.dims.w / 5] : [p.dims.w / 5, p.dims.d / 5];
  return imgBoard(pieceView(key, v), x, x + w, y + d, z);
}
/** Le chevalet du module de bois. */
function sawhorse(x: number, y: number, v = 0): Board {
  const g = boisPiece('sawhorse', v);
  const [w, d] = v % 2 ? [10, 20] : [20, 10];
  return imgBoard({ grid: g, pal: PIECE_PAL }, x, x + w, y + d);
}
/** Les faces de toit d'une scène (ce que la vue « dedans » efface). */
const noRoof = (qs: Quad[]) => qs.filter((q) => !q.part.roof);

interface Shell { x0: number; y0: number; W: number; D: number; t: number; z1: number; cut?: number; south: Tex; north: Tex; inner: Tex; top: Tex; holes: { S: Hole[]; N: Hole[]; W: Hole[]; E: Hole[] } }
/** Les quatre murs de pierre d'un bâtiment (copie de `shell` de village-maisons-pierre.ts), dans la zone ; le sud coupé à `cut`. */
function shell(Q: Quad[], s: Shell): void {
  const P = part('mur', 2, '~', 'full');
  const { x0, y0, W, D, t } = s, zs = s.cut ?? s.z1;
  const off = (h: Hole[], a: number) => h.map((o) => ({ ...o, a0: o.a0 + a, a1: o.a1 + a }));
  wallRun(Q, true, x0, x0 + W, y0 + D - t, y0 + D, 0, zs, off(s.holes.S, x0), P, { top: s.top, side: s.south });
  wallRun(Q, true, x0, x0 + W, y0, y0 + t, 0, s.z1, off(s.holes.N, x0), P, { top: s.top, side: s.north });
  wallRun(Q, false, y0 + t, y0 + D - t, x0, x0 + t, 0, s.z1, off(s.holes.W, y0), P, { top: s.top, side: s.inner });
  wallRun(Q, false, y0 + t, y0 + D - t, x0 + W - t, x0 + W, 0, s.z1, off(s.holes.E, y0), P, { top: s.top, side: s.inner });
}

/** Ce que l'emprise d'une scène couvre au sol (faces et images), px de la zone. */
function footprint(sc: Scene): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of sc.quads) for (const p of [q.o, [q.o[0] + q.u[0], q.o[1] + q.u[1]], [q.o[0] + q.v[0], q.o[1] + q.v[1]], [q.o[0] + q.u[0] + q.v[0], q.o[1] + q.u[1] + q.v[1]]]) {
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
  }
  for (const b of sc.boards) {
    const d = b.depth(b.grid.length - 1);
    x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x + b.grid[0].length); y1 = Math.max(y1, d); y0 = Math.min(y0, d - 1);
  }
  return [Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1)];
}

interface Def {
  id: PlaceBuildingId;
  pieces: string[];
  outside(frame: number): Scene;
  inside(frame: number): Scene;
  /** Où se tient Xéros pour l'échelle (px de la zone), dehors et dedans ; les cours de terre battue (px de la zone). */
  xeros: [number, number]; inXeros: [number, number]; yards: [number, number, number, number][];
}
/** Où chaque bâtiment met Xéros et ses cours (pour les planches). */
export const SHOW: Partial<Record<PlaceBuildingId, { xeros: [number, number]; inXeros: [number, number]; yards: [number, number, number, number][] }>> = {};

function building(def: Def): PlaceBuilding {
  const fp = footprint(def.outside(0));
  const at: [number, number] = [fp[0], fp[1]];
  SHOW[def.id] = { xeros: def.xeros, inXeros: def.inXeros, yards: def.yards };
  return {
    id: def.id,
    size: [fp[2] - fp[0], fp[3] - fp[1]],
    at,
    levels: 1,
    palette: XPAL,
    outside: (o, frame = 0) => moveScene(def.outside(frame), o[0] - at[0], o[1] - at[1]),
    inside: (o, _level = 0, frame = 0) => moveScene(def.inside(frame), o[0] - at[0], o[1] - at[1]),
    pieces: def.pieces,
  };
}

// =====================================================================================================================
// 13.2 La ferme du riche : la boutique, l'étal luxueux, la réserve, la cour
// =====================================================================================================================
//
// La boutique (x 2720-2944, y 1888-2048 : 11,20 × 8 m hors œuvre, 50 cm de mur) : moellons enduits à la chaux, angles et
// encadrements de pierre de taille, murs de 3 m, laves à 45° (faîte à 7,15 m), une souche au-dessus de l'âtre de la chambre. Au sud,
// sur la rue de l'ouest : le vitrail (1,20 × 1,20 m, la seule fenêtre vitrée de la place), la porte à pentures, une fenêtre à volet.
// Dedans : la boutique au sud (le comptoir sculpté, les étagères, le présentoir, une claie), une cloison de planches ; au nord la
// réserve fraîche (claies à fromages, jarres de miel, tonnelets) et la chambre du commis (lit, coffre, l'âtre du jeu).
// L'étal (x 2968-3064, y 1952-2032 : décalé de 40 cm vers l'est, pour que l'enseigne pende entre la boutique et l'auvent) : l'auvent
// de toile rayée, le comptoir sculpté, le présentoir à gradins, une jarre d'huile. La réserve au fond (x 2720-2912, y 1568-1696),
// pierre enduite et laves, porte charretière de planches ; la cour entre les deux.

const RB = { x: 2720, y: 1888, W: 224, D: 160, t: 10, T: 60 };
const RB_BAYS: (StoneBay & { kind: 'leaded' | 'door' | 'shutter' })[] = [
  { s0: 22, s1: 46, t0: 16, t1: 40, seed: 1, kind: 'leaded' },
  { s0: 92, s1: 110, t0: 0, t1: 40, seed: 2, kind: 'door' },
  { s0: 140, s1: 154, t0: 18, t1: 34, seed: 3, kind: 'shutter' },
];
// l'âtre de la chambre, dos au mur nord (tourné vers le sud : vu du jeu) ; son conduit, dévoyé dans le comble, sort au faîte : la
// souche à cheval sur le faîtage, 80 cm au-dessus (au mur nord, la projection la montrait cinq mètres au-dessus du faîte)
const RB_HEARTH: [number, number] = [RB.x + 136, RB.y + RB.t];
const RB_STACK: [number, number, number, number] = [RB.x + 148, RB.x + 164, RB.y + 73, RB.y + 87];
const RS = { x: 2720, y: 1568, W: 192, D: 128, t: 10, T: 52 };
const RS_DOOR = { a0: 80, a1: 112, z1: 44 };
const STALL = { x: 2968, y: 1952 };

function richShopWalls(Q: Quad[], cut?: number): void {
  const { x, y, W, D, t, T } = RB;
  const south = onFace(withBays(rendered(1301, W, ['left', 'right']), RB_BAYS), true, x, W, T);
  const plaster = limePlaster(1303);
  const inner: Tex = (_s, _t, c) => plaster(c.p[0] + c.p[1], c.p[2], c);
  const out = onFace(rendered(1305, W, ['left', 'right']), true, x, W, T);
  const side = onFace(rendered(1307, D, ['left', 'right']), false, y, D, T);
  shell(Q, {
    x0: x, y0: y, W, D, t, z1: T, cut, south, north: cut ? inner : out, inner: cut ? inner : side, top: rubbleSection(1309, 'lime'),
    holes: { S: RB_BAYS.map((b) => ({ a0: b.s0, a1: b.s1, z0: b.t0, z1: b.t1 })), N: [], W: [], E: [] },
  });
}

function richShopOutside(): { quads: Quad[]; boards: Board[] } {
  const Q: Quad[] = [], B: Board[] = [];
  const { x, y, D, T } = RB, yS = y + D;
  richShopWalls(Q);
  for (const b of RB_BAYS) {
    const x0 = x + b.s0, x1 = x + b.s1, ww = b.s1 - b.s0, hh = b.t1 - b.t0;
    if (b.kind === 'door') { Q.push(...box(x0, x1, yS - 4, yS - 3, 0, hh, part('porte', 3, '&', 'full'), strapDoorTex(7))); continue; }
    sill(Q, x0 - 2, x1 + 2, yS, b.t0);
    if (b.kind === 'leaded') {
      Q.push(...box(x0, x1, yS - 4, yS - 3, b.t0, b.t1, part('vitrail', 1, '`', 'none'), (s, t) => leaded(ww, hh, s, t)));
      // le meneau et la traverse de pierre : le vitrail en quatre jours
      const M = part('meneau', 2.5, '~', 'full');
      Q.push(...box(x0 + ww / 2 - 1, x0 + ww / 2 + 1, yS - 3, yS - 1, b.t0, b.t1, M, (_s, _t, c) => (c.face === 'S' ? '+' : c.face === 'top' ? '!' : '=')));
      Q.push(...box(x0, x1, yS - 3, yS - 1, b.t0 + 15, b.t0 + 17, M, (_s, _t, c) => (c.face === 'top' ? '!' : '+')));
    } else {
      darkBay(Q, x0, x1, yS - 3, b.t0, b.t1);
      const s = img('plank-shutter-r1-worn');
      B.push({ grid: s.grid, pal: s.pal, x: Math.round(x0 - 8), y: Math.round(yS + 1 - b.t0 - s.grid.length), depth: () => yS + 0.5 });
    }
  }
  // le seuil de pierre, l'anneau de la porte ; le toit de laves, la souche
  B.push(imgBoard(propImg('threshold-stone'), x + 89, x + 113, yS + 5));
  lavesRoof(Q, { a0: x, a1: x + RB.W, b0: y, b1: yS, z: T, pitch: 45, eave: 4, gable: [2, 2], thick: 3, seed: 1311, holes: [RB_STACK] });
  stack(Q, RB_STACK[0], RB_STACK[1], RB_STACK[2], RB_STACK[3], 120, 162, onFace(rendered(1313, 16, ['left', 'right']), true, RB_STACK[0], 16, 168));
  return { quads: Q, boards: B };
}

/** Les cloisons de planches du dedans : est-ouest entre la boutique et le fond, nord-sud entre la réserve fraîche et la chambre. */
function richShopPartitions(Q: Quad[], B: Board[]): void {
  const { x, y, T } = RB, pp = part('cloison', 3, '&', 'full');
  const bt = (sd: number) => plankBoards(sd, 4, [1, T - 6]);
  // est-ouest (y + 84 à 86), coupée à 70 cm comme le jeu coupe les cloisons est-ouest : la porte de la réserve (x + 40 à 58)
  for (const [a0, a1] of [[10, 40], [58, 214]] as const) Q.push(...box(x + a0, x + a1, y + 84, y + 86, 0, 14, pp, bt(1321 + a0)));
  void B;
  // la chambre s'ouvre sur la réserve fraîche (nord-sud, x + 128 à 130, porte de y + 30 à 48)
  Q.push(...box(x + 128, x + 130, y + 10, y + 30, 0, T, pp, bt(1325)), ...box(x + 128, x + 130, y + 48, y + 84, 0, T, pp, bt(1326)), ...box(x + 128, x + 130, y + 30, y + 48, 36, T, pp, bt(1328)));
  B.push(prop('inner-door', x + 128, y + 30, 1));
}

function richShopInside(frame: number): { quads: Quad[]; boards: Board[] } {
  const Q: Quad[] = [], B: Board[] = [];
  const { x, y, W, D, t } = RB;
  richShopWalls(Q, 14);
  richShopPartitions(Q, B);
  // le dallage de la boutique, la terre battue de la réserve fraîche et de la chambre
  Q.push(earthFloor(x + t, x + W - t, y + t, y + 84));
  Q.push(quad([x + t, y + 86, 0.02], [W - 2 * t, 0, 0], [0, D - t - 86, 0], [0, 0, 1], part('dalles', 0, '~', 'none', { cast: false }), flagstones(13), 'top'));
  // la chambre du commis : l'âtre du jeu contre le mur nord, son manteau, sa hotte enduite
  // la chambre du commis : l'âtre du jeu contre le mur nord, son manteau, sa hotte enduite jusqu'au plafond
  Q.push(...moved(hearthModel(frame)(), [RB_HEARTH[0], RB_HEARTH[1], 0]));
  Q.push(...box(RB_HEARTH[0] - 1, RB_HEARTH[0] + 45, y + t + 16, y + t + 22, 30, 34, part('manteau', 7, 'K', 'full'), timber(1331)));
  Q.push(...box(RB_HEARTH[0] + 2, RB_HEARTH[0] + 42, y + t, y + t + 16, 34, RB.T, part('hotte', 6, '~', 'full'), limePlaster(1333)));
  B.push(prop('bed', x + 182, y + 12, 0), prop('chest', x + 138, y + 62, 0), prop('stool', x + 162, y + 46), prop('candle', x + 146, y + 63, 0, 'worn', 11));
  // la réserve fraîche : deux claies à fromages, les jarres de miel, les tonnelets, un sac
  B.push(piece('cheese-rack', x + 12, y + 12), piece('cheese-rack', x + 38, y + 12), prop('jar', x + 66, y + 12), prop('jar', x + 76, y + 20),
    prop('barrel', x + 92, y + 12), prop('barrel', x + 106, y + 14), prop('sack', x + 14, y + 64), prop('crate', x + 96, y + 64));
  // la boutique : les étagères contre la cloison, le comptoir, le tabouret du commis, le présentoir devant le vitrail, une claie
  B.push(piece('shop-shelves', x + 62, y + 87), piece('shop-shelves', x + 134, y + 87), prop('stool', x + 90, y + 98));
  B.push(piece('luxury-counter', x + 66, y + 108));
  B.push(...counterGoods(x + 66, y + 108));
  B.push(piece('tiered-display', x + 20, y + 132), piece('cheese-rack', x + 186, y + 90), prop('barrel', x + 192, y + 128), prop('jar', x + 176, y + 132));
  return { quads: Q, boards: B };
}

/** Ce qui est posé sur un comptoir sculpté (48 × 14 px, coin nord-ouest en x, y) : pots de miel, pains de cire, boîtes, un fromage. */
function counterGoods(x: number, y: number): Board[] {
  const z = 19, out: Board[] = [];
  const at = (key: string, dx: number, dy: number) => out.push(piece(key, x + dx, y + dy, 0, z));
  at('honey-pot', 3, 5); at('honey-pot', 8, 6); at('honey-pot', 5, 9);
  at('wax-cake', 15, 6); at('wax-cake', 21, 7);
  at('spice-box', 29, 5); at('spice-box', 35, 6); at('spice-box', 31, 9);
  at('honey-pot', 42, 7);
  return out;
}

function richStall(roof: boolean): { quads: Quad[]; boards: Board[] } {
  const { x, y } = STALL;
  const aw = moved(pieceModel('striped-awning'), [x, y, 0]);
  const Q = stoneHex(roof ? aw : noRoof(aw));
  const B: Board[] = [
    piece('luxury-counter', x + 8, y + 40), ...counterGoods(x + 8, y + 40),
    piece('tiered-display', x + 62, y + 42), prop('jar', x + 86, y + 44), prop('crate', x + 70, y + 60), prop('barrel', x + 2, y + 62),
  ];
  return { quads: Q, boards: B };
}

function richStoreWalls(Q: Quad[], cut?: number): void {
  const { x, y, W, D, t, T } = RS;
  const bays: StoneBay[] = [{ s0: RS_DOOR.a0, s1: RS_DOOR.a1, t0: 0, t1: RS_DOOR.z1, seed: 4 }, { s0: 150, s1: 162, t0: 22, t1: 32, seed: 5 }];
  const south = onFace(withBays(rendered(1341, W, ['left', 'right']), bays), true, x, W, T);
  const plaster = limePlaster(1343);
  const inner: Tex = (_s, _t, c) => plaster(c.p[0] + c.p[1], c.p[2], c);
  const out = onFace(rendered(1345, W, ['left', 'right']), true, x, W, T);
  shell(Q, {
    x0: x, y0: y, W, D, t, z1: T, cut, south, north: cut ? inner : out, inner: cut ? inner : out, top: rubbleSection(1347, 'lime'),
    holes: { S: [{ a0: RS_DOOR.a0, a1: RS_DOOR.a1, z0: 0, z1: RS_DOOR.z1 }, { a0: 150, a1: 162, z0: 22, z1: 32 }], N: [], W: [], E: [] },
  });
}
function richStore(cut: boolean): { quads: Quad[]; boards: Board[] } {
  const Q: Quad[] = [], B: Board[] = [];
  const { x, y, W, D, T } = RS, yS = y + D;
  richStoreWalls(Q, cut ? 14 : undefined);
  if (!cut) {
    // la porte charretière de planches, deux vantaux ; la petite fenêtre grillée d'un volet
    const m = x + (RS_DOOR.a0 + RS_DOOR.a1) / 2, P = part('porte', 3, '&', 'full');
    Q.push(...box(x + RS_DOOR.a0, m, yS - 4, yS - 3, 0, RS_DOOR.z1, P, aged(leafTex(1351, 16, { latch: 'right' }), 'worn')));
    Q.push(...box(m, x + RS_DOOR.a1, yS - 4, yS - 3, 0, RS_DOOR.z1, part('porte', 3.1, '&', 'full'), aged(leafTex(1352, 16), 'worn')));
    sill(Q, x + 148, x + 164, yS, 22);
    darkBay(Q, x + 150, x + 162, yS - 3, 22, 32);
    for (let k = 0; k < 3; k++) Q.push(...box(x + 152 + k * 4, x + 153 + k * 4, yS - 2.5, yS - 1.5, 22, 32, part('barreau', 4, '#363343', 'thin'), () => '#50566a'));
    lavesRoof(Q, { a0: x, a1: x + W, b0: y, b1: yS, z: T, pitch: 45, eave: 4, gable: [2, 2], thick: 3, seed: 1355 });
  } else {
    Q.push(earthFloor(x + RS.t, x + W - RS.t, y + RS.t, yS - RS.t));
    // dedans : les tonneaux, les sacs, les caisses, les jarres, une claie
    B.push(
      prop('barrel', x + 14, y + 12), prop('barrel', x + 28, y + 12), prop('barrel', x + 42, y + 12), prop('barrel', x + 14, y + 28), prop('barrel', x + 28, y + 28),
      prop('sack', x + 64, y + 14), prop('sack', x + 76, y + 16), prop('sack', x + 88, y + 14), prop('sack', x + 70, y + 30),
      prop('crate', x + 120, y + 14), prop('crate', x + 134, y + 14), prop('crate', x + 120, y + 26, 0, 'worn'), prop('jar', x + 156, y + 14), prop('jar', x + 168, y + 16),
      piece('cheese-rack', x + 150, y + 60), prop('jar', x + 14, y + 90), prop('jar', x + 26, y + 96), prop('sack', x + 160, y + 100),
    );
  }
  return { quads: Q, boards: B };
}

/** Un sol de terre battue (la réserve, le fond de la boutique) : la terre des murs de torchis, tassée, quelques cailloux. */
function earthFloor(x0: number, x1: number, y0: number, y1: number): Quad {
  const tex: Tex = (_s, _t, c) => {
    const i = Math.floor(c.p[0]), j = Math.floor(c.p[1]), h = hash(1361, i >> 1, j >> 1), g = hash(1362, i, j);
    return g < 0.03 ? '=' : h < 0.25 ? 'n' : h < 0.85 ? 'u' : 'U';
  };
  return quad([x0, y0, 0.02], [x1 - x0, 0, 0], [0, y1 - y0, 0], [0, 0, 1], part('terre battue', 0, 'n', 'none', { cast: false }), tex, 'top');
}

/** La cour : quelques caisses et sacs déchargés devant la porte de la réserve, le seau. */
function richYard(): Board[] {
  return [prop('crate', 2850, 1702), prop('sack', 2864, 1708), prop('barrel', 2740, 1704), prop('bucket-water', 2756, 1714)];
}

const richSign = (): Board =>
  // l'enseigne au pot de miel et au coq, sur le pignon est de la boutique, au-dessus de la rue : le bras vers l'est (R0)
  imgBoard(pieceView('hanging-sign', 0), RB.x + RB.W, RB.x + RB.W + 20, RB.y + RB.D - 4, 40);

const fermeRiche: Def = {
  id: 'p-ferme-riche',
  pieces: ['luxury-counter', 'striped-awning', 'tiered-display', 'shop-shelves', 'cheese-rack', 'honey-pot', 'wax-cake', 'spice-box', 'hanging-sign'],
  xeros: [2990, 2066], inXeros: [2830, 2142],
  yards: [[2720, 1696, 3200, 1856]],
  outside: () => {
    const shop = richShopOutside(), stall = richStall(true), store = richStore(false);
    return { quads: [...stoneHex([...shop.quads, ...store.quads]), ...stall.quads], boards: [...shop.boards, ...stall.boards, ...store.boards, ...richYard(), richSign()] };
  },
  inside: (frame) => {
    const shop = richShopInside(frame), stall = richStall(false), store = richStore(true);
    const { x, y, W, D, t } = RB;
    return {
      quads: [...stoneHex([...shop.quads, ...store.quads]), ...stall.quads], boards: [...shop.boards, ...stall.boards, ...store.boards, ...richYard()],
      floor: [x + t, x + W - t, y + t, y + D - t],
    };
  },
};

// =====================================================================================================================
// 13.3 Le bûcheron : le magasin ouvert au sud, l'appentis des fagots, le chantier de vente
// =====================================================================================================================
//
// Le magasin (axes x 3392-3584, y 1536-1664 : 9,60 × 6,40 m) : poteaux de 20 × 20 tous les 3,20 m sur des dés, bardage de planches
// debout au nord, à l'ouest et à l'est, ouvert au sud ; sablière à 2,80 m, bardeaux à 40° (faîte à 5,70 m), pignons bardés. Dedans :
// deux râteliers de perches et de planches contre le bardage nord, les tas de bûches et de quartiers, le billot, le chevalet.
// L'appentis des fagots (x 3520-3648, y 1696-1760 : 6,40 × 3,20 m), bardé au nord, de 2 m à 1,50 m. Le chantier de vente (la cour,
// x 3392-3568, y 1696-1856) : les tas du jeu (quartiers, bûches d'1 m, perches de 3 m, planches de 2 m), le comptoir sur billots
// au bord de la place, un billot ; l'enseigne à la hache sur le poteau d'angle sud-ouest du magasin, le bras vers la rue du nord.

const MG = { x: 3392, y: 1536, L: 192, D: 128, T: 56 };
const MG_SPEC: HouseSpec = {
  L: MG.L, D: MG.D, T: MG.T, sill: 16, doorW: 18, innerDoorW: 16, walls: [], age: 'worn', fill: 'boards',
  roof: { cover: 'shingles', pitch: 40, over: [8, 8], eave: 12, gables: ['boards', 'boards'] },
};
const AP = { x: 3520, y: 1698, w: 128, d: 62, hi: 40, lo: 30 };

function magasin(roof: boolean): { quads: Quad[]; boards: Board[] } {
  const Q: Quad[] = [], B: Board[] = [];
  const { L, D, T } = MG, age = 'worn' as const;
  const Wd = (sd: number) => aged(timber(sd), age);
  const TP = part('bois', 5, 'K', 'full', { eave: true });
  const zs = 2.4;
  const posts: [number, number][] = [];
  for (const x of [0, 64, 128, 192]) posts.push([x, 0], [x, D]);
  for (const x of [0, L]) posts.push([x, 64]);
  for (const [px, py] of posts) {
    Q.push(...box(px - 2, px + 2, py - 2, py + 2, zs, T - 4, TP, Wd(1401 + px + py)));
    const g = propImg('footing-stone');
    B.push(imgBoard(g, MG.x + px - 4.5, MG.x + px + 4.5, MG.y + py + 3));
  }
  // les traverses basses (nord, ouest, est) et les sablières (tout le tour)
  Q.push(...box(-2, L + 2, -2, 2, zs, zs + 4, TP, Wd(1411)));
  for (const x of [0, L]) Q.push(...box(x - 2, x + 2, 2, D - 2, zs, zs + 4, TP, Wd(1412 + x)));
  Q.push(...box(-2, L + 2, -2, 2, T - 4, T, TP, Wd(1415)), ...box(-2, L + 2, D - 2, D + 2, T - 4, T, TP, Wd(1416)));
  for (const x of [0, L]) Q.push(...box(x - 2, x + 2, 2, D - 2, T - 4, T, TP, Wd(1417 + x)));
  // le bardage de planches debout, cloué au dehors (nord, ouest, est)
  const BP = part('bardage', 3, 'K', 'full', { eave: true });
  const bt = (sd: number) => aged(boardsTex(sd), age);
  Q.push(...box(-3.5, L + 3.5, -3.5, -2, zs, T - 4, BP, bt(1421)));
  Q.push(...box(-3.5, -2, -2, D + 2, zs, T - 4, BP, bt(1422)), ...box(L + 2, L + 3.5, -2, D + 2, zs, T - 4, BP, bt(1423)));
  if (roof) Q.push(...gableRoof(MG_SPEC));
  return { quads: foreign(moved(Q, [MG.x, MG.y, 0])), boards: B };
}

function appentis(roof: boolean): Quad[] {
  const { x, y, w, d, hi, lo } = AP;
  const Q: Quad[] = [];
  const Wd = aged(timber(1431), 'worn');
  const P = part('poteau', 5, 'K', 'full');
  // le bardage du fond (nord), ses poteaux ; les poteaux de devant, la sablière et le pan de bardeaux (leanTo du module de bois)
  for (const px of [x + 2, x + w / 2, x + w - 2]) Q.push(...box(px - 1.5, px + 1.5, y - 1.5, y + 1.5, 0, hi - 2, P, Wd));
  Q.push(...box(x, x + w, y - 3, y - 1.5, 0, hi - 2, part('bardage', 3, 'K', 'full', { eave: true }), aged(boardsTex(1433), 'worn')));
  const lt = leanTo([x - 2, y - 4, hi], [x - 2, y + d + 2, lo], [w + 4, 0, 0], [[x + 2, y + d - 2], [x + w / 2, y + d - 2], [x + w - 2, y + d - 2]], 'worn', 1435, 'shingles');
  Q.push(...(roof ? lt : noRoof(lt)));
  return foreign(Q);
}

/** Le chantier de vente : les tas, les fagots sous l'appentis, le comptoir, le billot, l'enseigne. */
function chantier(): Board[] {
  const B: Board[] = [];
  // sous l'appentis : deux rangs de quatre fagots, un rang dessus
  for (let row = 0; row < 2; row++) for (let k = 0; k < 4; k++) B.push(prop('faggot', AP.x + 4 + k * 30, AP.y + 6 + row * 14));
  for (let k = 0; k < 3; k++) {
    const b = prop('faggot', AP.x + 18 + k * 30, AP.y + 13, 0, 'worn', 8);
    B.push({ ...b, depth: () => AP.y + 23.5 });
  }
  // deux fagots déchargés devant, au jour
  B.push(prop('faggot', AP.x + 20, AP.y + AP.d + 4), prop('faggot', AP.x + 50, AP.y + AP.d + 6));
  // les tas du jeu : les quartiers (3 × 3), les bûches d'1 m (6), les perches de 3 m (6), les planches de 2 m (3 × 3)
  B.push(...pileBoards({ size: 'big', shape: 'quarter', length: 100 }, 3400, 1752));
  B.push(...pileBoards({ size: 'normal', shape: 'round', length: 100 }, 3430, 1752));
  B.push(...pileBoards({ size: 'pole', shape: 'round', length: 300 }, 3400, 1806));
  B.push(...pileBoards({ size: 'big', shape: 'plank', length: 200 }, 3470, 1806));
  // le comptoir sur billots au bord de la place, une bûche et un quartier dessus ; le billot et sa hache
  B.push(piece('plank-counter', 3400, 1834));
  B.push(woodBoard({ size: 'normal', shape: 'round', axis: 'ew', length: 60 }, 3406, 1842, 18));
  B.push(imgBoard(img(has('chopping-block-axe-worn') ? 'chopping-block-axe-worn' : 'chopping-block-axe'), 3530, 3541, 1821));

  // l'enseigne à la hache, sur le poteau d'angle sud-ouest du magasin, le bras vers l'ouest (R2)
  B.push(imgBoard(pieceView('hanging-sign-s1', 2), MG.x - 22, MG.x - 2, MG.y + MG.D + 1, 36));
  return B;
}

/** Dedans le magasin : deux râteliers, les tas de bûches et de quartiers, le billot, le chevalet et sa pièce. */
function magasinStock(): Board[] {
  const { x, y } = MG;
  return [
    piece('wood-rack', x + 6, y + 2), piece('wood-rack', x + 70, y + 2),
    ...pileBoards({ size: 'normal', shape: 'round', length: 100 }, x + 140, y + 60),
    ...pileBoards({ size: 'big', shape: 'quarter', length: 100 }, x + 166, y + 60),
    ...pileBoards({ size: 'normal', shape: 'round', length: 100 }, x + 140, y + 116, 3),
    prop('chopping-block', x + 30, y + 88), sawhorse(x + 60, y + 96),
    woodBoard({ size: 'normal', shape: 'round', axis: 'ew', length: 100 }, x + 60, y + 104, 15),
    ...pileBoards({ size: 'big', shape: 'plank', length: 200 }, x + 90, y + 118, 6),
  ];
}

const bucheron: Def = {
  id: 'p-bucheron',
  pieces: ['plank-counter', 'wood-rack', 'hanging-sign-s1'],
  xeros: [3450, 1866], inXeros: [3480, 1680],
  yards: [[3392, 1696, 3568, 1856], [3392, 1536, 3584, 1664]],
  outside: () => {
    const m = magasin(true);
    return { quads: [...m.quads, ...appentis(true)], boards: [...m.boards, ...magasinStock(), ...chantier()] };
  },
  inside: () => {
    const m = magasin(false);
    return { quads: [...m.quads, ...appentis(false)], boards: [...m.boards, ...magasinStock(), ...chantier()] };
  },
};

// =====================================================================================================================
// 13.4 Le menuisier : la boutique abandonnée
// =====================================================================================================================
//
// Le bâtiment (axes x 3680-3904, y 1904-2032 : 11,20 × 6,40 m) : le kit de la maison de Xéros au bois vieux, chaux écaillée,
// poteaux tous les 1,60 m, sablière à 2,60 m, bardeaux à 45° (faîte à 6 m) dont il manque des rangs (on voit les lattes et le noir du
// comble). Au sud, sur la rue de l'est : l'atelier (6,40 m) avec sa fenêtre clouée et sa porte à deux battants barrée d'une planche,
// le logis (4,80 m) avec sa fenêtre clouée et sa porte ; l'herbe haute contre le solin, l'enseigne tombée au pied du pignon est, sa
// potence vide au-dessus. Dedans : l'établi, la chaise pas finie, le chevalet, des planches, les copeaux ; le châlit, la table, le coffre.

const MN = { x: 3680, y: 1904 };
const steps = (n: number, k = 32) => Array.from({ length: n + 1 }, (_, i) => i * k);
const MN_SPEC: HouseSpec = {
  L: 224, D: 128, T: 52, sill: 16, doorW: 18, innerDoorW: 16, age: 'old', fill: 'flaking', trusses: [128],
  walls: [
    { side: 'S', ew: true, c: 128, posts: [0, 32, 64, 128, 160, 192, 224], out: 1, bays: ['window', 'plain', 'twin-door', 'plain', 'window', 'door'] },
    { side: 'N', ew: true, c: 0, posts: steps(7), out: -1, bays: ['plain', 'plain', 'plain', 'plain', 'plain', 'plain', 'plain'] },
    { side: 'W', ew: false, c: 0, posts: steps(4), out: -1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 224, posts: steps(4), out: 1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true] },
    { ew: false, c: 128, posts: steps(4), out: 1, bays: ['plain', 'plain', 'inner-door', 'plain'], ends: [true, true] },
  ],
  roof: { cover: 'shingles', pitch: MENUISIER_ROOF.pitch, over: [6, 6], eave: 10, gables: ['flaking', 'flaking'] },
};
/** Les trous de la couverture (pan sud) : [s0, s1, rang0, rang1], s en px depuis la rive ouest, les rangs de 4 px d'écran depuis l'égout. */
const MN_HOLES: [number, number, number, number][] = [[30, 54, 5, 7], [118, 134, 19, 20], [168, 198, 2, 4], [80, 92, 28, 29], [200, 214, 12, 12]];

function menuisierFrame(cut: boolean): { quads: Quad[]; boards: Board[] } {
  const W = toWorld(MN_SPEC, 0);
  const K = Math.sin(Math.PI / 4) + Math.cos(Math.PI / 4);
  const qs = W.quads(frameQuads(MN_SPEC, { cut, roof: !cut, rot: 0 })).map((q) =>
    q.part.name === 'bardeaux' && q.face === 'slope' && q.n[1] > 0 ? { ...q, tex: damagedShingles(q.tex, K, MN_HOLES) } : q);
  const Q: Quad[] = [...qs];
  if (!cut) {
    // la planche clouée en travers de la porte à deux battants
    Q.push(...box(66, 126, 129.6, 130.8, 17, 19.4, part('planche clouée', 4, '|', 'full'), aged(timber(1501), 'old')));
  }
  const boards = solinBoards(MN_SPEC, 0, 1503).map((b) => moveBoard(b, W.shift[0], W.shift[1]));
  return { quads: foreign(moved(Q, [MN.x, MN.y, 0])), boards: boards.map((b) => moveBoard(b, MN.x, MN.y)) };
}

/** Ce qui reste au sol dehors (vu aussi toit effacé) : l'herbe, l'enseigne tombée ; les volets et la potence sont au-dessus de la coupe. */
function menuisierGround(): Board[] {
  const { x, y } = MN, yS = y + 128;
  return [piece('fallen-sign', x + 228, yS - 2, 1), ...WEEDS.map(([dx, dy, v]) => piece('tall-weeds', x + dx, yS + dy, v))];
}
const WEEDS: [number, number, number][] = [[-8, 4, 0], [30, 6, 0], [130, 5, 0], [150, 4, 0], [206, 8, 0], [246, 8, 0], [-14, -30, 1]];
function menuisierOutside(): Board[] {
  const { x, y } = MN, yS = y + 128;
  const B: Board[] = [];
  // les volets cloués sur les deux fenêtres du sud
  for (const m of [16, 176]) B.push(imgBoard(pieceView('nailed-shutter', 0), x + m - 7, x + m + 7, yS + 4, MN_SPEC.sill - 2));
  // la potence vide sur le pignon est, l'enseigne tombée à son pied, sur l'herbe
  B.push(imgBoard(pieceView('sign-bracket', 0), x + 226, x + 246, yS - 3, 41));
  // l'enseigne tombée, l'herbe haute contre le solin et autour de l'enseigne
  return [...B, ...menuisierGround()];
}
function menuisierInside(): Board[] {
  const { x, y } = MN;
  return [
    // l'atelier : l'établi contre le mur nord, la chaise pas finie, le chevalet, des planches, une caisse
    prop('workbench', x + 8, y + 6, 0, 'old'), piece('unfinished-chair', x + 60, y + 58), sawhorse(x + 26, y + 78),
    woodBoard({ size: 'big', shape: 'plank', axis: 'ew', length: 200, age: 'old' }, x + 70, y + 92),
    woodBoard({ size: 'big', shape: 'plank', axis: 'ew', length: 200, age: 'old' }, x + 72, y + 100),
    woodBoard({ size: 'normal', shape: 'round', axis: 'ew', length: 100, hewn: 12, age: 'old' }, x + 20, y + 112),
    prop('crate', x + 104, y + 40, 0, 'old'), prop('stool', x + 90, y + 26, 0, 'old'),
    // le logis : le châlit, la table, le coffre, une caisse
    prop('bed', x + 186, y + 6, 0, 'old'), prop('table', x + 136, y + 72, 0, 'old'), prop('chest', x + 138, y + 8, 0, 'old'), prop('crate', x + 200, y + 96, 0, 'old'),
  ];
}
/** Les copeaux et la poussière sous l'établi (le sol de l'atelier). */
function shavings(): Quad[] {
  const { x, y } = MN, P = part('copeaux', 0.5, '{', 'none', { cast: false });
  const tex: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    // plus serrés au milieu de la plaque, clairsemés au bord ; des copeaux de 1 ou 2 px
    const edge = Math.min(i, j, Math.floor(c.w) - 1 - i, Math.floor(c.h) - 1 - j);
    const r = hash(1511, i >> (hash(1512, j, i >> 2) < 0.4 ? 1 : 0), j);
    return r < (edge < 2 ? 0.08 : 0.22) ? (hash(1513, i, j) < 0.6 ? '{' : '}') : null;
  };
  return [quad([x + 10, y + 22, 0.03], [56, 0, 0], [0, 10, 0], [0, 0, 1], P, tex, 'top'), quad([x + 20, y + 74, 0.03], [24, 0, 0], [0, 12, 0], [0, 0, 1], P, tex, 'top')];
}

const menuisier: Def = {
  id: 'p-menuisier',
  pieces: ['nailed-shutter', 'fallen-sign', 'sign-bracket', 'tall-weeds', 'shingle-roof-damaged', 'unfinished-chair'],
  xeros: [3760, 2070], inXeros: [3760, 2010],
  yards: [],
  outside: () => {
    const f = menuisierFrame(false);
    return { quads: f.quads, boards: [...f.boards, ...menuisierOutside()] };
  },
  inside: () => {
    const f = menuisierFrame(true);
    return { quads: [...f.quads, ...shavings()], boards: [...f.boards, ...menuisierInside(), ...menuisierGround()], floor: [MN.x + 2, MN.x + 222, MN.y + 2, MN.y + 126] };
  },
};

// =====================================================================================================================
// 13.8 Le panneau des nouvelles
// =====================================================================================================================
//
// Au milieu de la place, sur l'emprise du plan (`NOTICE_BOARD` : 1,60 × 0,30 m, x 3296-3328, y 2112-2118) : le panneau (pièce
// `notice-board`, posée comme le jeu pose un objet), la pierre au pied pour monter lire (le dé de pierre du jeu), un feuillet tombé.

const panneau: Def = {
  id: 'p-panneau',
  pieces: ['notice-board', 'notice-sheet'],
  xeros: [3290, 2140], inXeros: [3290, 2140],
  yards: [],
  outside: () => {
    const [x0, y0, x1, y1] = NOTICE_BOARD.rect;
    const B: Board[] = [imgBoard(pieceView('notice-board', 0), x0, x1, y1), imgBoard(propImg('footing-stone'), x0 + 9, x0 + 18, y1 + 9), piece('notice-sheet', x0 + 22, y1 + 4, 1)];
    void y0;
    return { quads: [], boards: B };
  },
  inside: () => panneau.outside(0),
};

// =====================================================================================================================
// Les exports
// =====================================================================================================================

const DEFS: Def[] = [fermeRiche, bucheron, menuisier, panneau];
export const BUILDINGS: PlaceBuilding[] = DEFS.map(building);
export { PLACE_META };
/** La palette des faces (celle de l'essai de la maison de Xéros) : les autres couleurs sont écrites en #rrggbb. */
export const palette = XPAL;
export type { V3 };
