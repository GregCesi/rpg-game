// PROPOSITION (hors jeu, jamais chargée par le jeu) : les quarts nord de la place resserrée autour du rond (CADRAGE-village.md,
// section 14 ; la première place, section 13, est dans l'historique git de ce fichier) :
//   - p-ferme-riche : la boutique de la ferme du riche au rond (à étage), son logis-réserve le long de la rue de l'ouest (à étage :
//     le commis et sa femme), l'étal luxueux sur le rond devant la boutique (l'auvent rayé guède et garance, deux comptoirs sculptés
//     en équerre, présentoirs, claies, pots en pyramide, meules) ;
//   - p-bucheron : la boutique du bûcheron au rond (à étage : son neveu et sa femme), ses trois devantures à volet-tablette, l'avant-toit,
//     le râtelier d'outils du bois, les tas qui débordent sur le recoin, le comptoir sur billots ;
//   - p-menuisier : la boutique abandonnée le long de la rue de l'est (la future menuiserie de la mère, 14.1) ;
//   - p-panneau : le panneau des nouvelles, à poser à côté du grand arbre (le centre est fait par place-centre.ts).
// Planches de contrôle : npx tsx tools/essai-place-nord.ts (.art-preview/place-nord-dehors.png, place-nord-dedans.png,
// place-nord-pieces.png). L'outil commun (tools/essai-place.ts) monte toute la place d'après `BUILDINGS` et `PIECES`.
//
// Repère : tout est modelé dans les px de la zone village (5 cm par pixel, x vers l'est, y vers le sud, z vers le haut) ;
// `outside(o)` et `inside(o)` déplacent la scène pour que le coin nord-ouest de son emprise (`at`, débords et tout ce qui est posé
// compris) soit en `o`. Posés chacun à son `at`, les bâtiments se composent dans une seule scène, avec ceux du sud et du centre.
//
// La règle des faces sud (CADRAGE 8.1, 14.2) commande les emprises : la boutique du riche et celle du bûcheron, au nord, ont leur
// façade sur le rond ; le logis du riche et la boutique abandonnée, plus au sud, cachent les 32 px de façade qui sont derrière eux (on
// n'y a mis qu'un mur plein). L'étal du riche est assez loin de la boutique (2,80 m) pour que son auvent ne cache pas la porte.
//
// Ce qui vient d'ailleurs (rien n'est redessiné) : la pierre enduite, les angles et encadrements de pierre de taille, les laves, le
// vitrail, le dallage (village-maisons-pierre-matieres.ts) ; la porte à pentures, l'escalier (village-maisons-pierre-pieces.ts) ;
// l'ossature de pan de bois, le bardage, la chaux, les bardeaux, l'appentis, le solin (village-maisons-bois-lib.ts) ; le chevalet
// (village-maisons-bois-pieces.ts) ; les meubles, les volets, les fagots, les tas de bois (calculés comme le jeu) : les images du jeu.

import { box, hash, part, timber, voidTex, type Board, type Quad, type Scene, type Tex, type V3 } from '../lib/volumes';
import { PLACE_META, type PlaceBuilding, type PlaceBuildingId } from './place-types';
import {
  PIECE_PAL, aged, fillTex, foreign, frameQuads, leafTex, leanTo, solinBoards,
  type HouseSpec, type Wall,
} from './village-maisons-bois-lib';
import { pieceGrid as boisPiece } from './village-maisons-bois-pieces';
import { flagstones, leaded, limePlaster, planks, rendered, rubbleSection, withBays, type StoneBay, VOID } from './village-maisons-pierre-matieres';
import { STAIR, stairModel, strapDoorTex } from './village-maisons-pierre-pieces';
import {
  XPAL, C, darkBay, has, img, imgBoard, lavesRoof, moveBoard, moveScene, moved, onFace, pileBoards, prop, propImg, quad, sill, stack,
  stoneHex, wallRun, woodBoard, type Hole,
} from './place-nord-lib';
import { MENUISIER_ROOF, PIECES, PIECE_INFO, PIECE_USES, damagedShingles, hangingSign, ladenCounter, pieceModel, pieceView } from './place-nord-pieces';

export { PIECES, PIECE_USES, PIECE_INFO, hangingSign, pieceView };

/** Le rond de la place (14.1) : 20 m de diamètre autour de C. */
export const ROND = { center: [3312, 2128] as [number, number], radius: 200 };
/** La terre battue du côté nord : du rond aux façades, la rue du nord jusqu'au rond, le devant du logis du riche (px de la zone). */
export const NORD_YARDS: [number, number, number, number][] = [[3008, 1928, 3616, 2080], [3264, 1700, 3360, 1928], [2784, 2064, 3008, 2080]];
/** Le panneau des nouvelles : à côté du grand arbre, au nord-ouest de son tronc (le centre le déplacera s'il le faut). */
export const PANNEAU: [number, number, number, number] = [3232, 2064, 3264, 2070];

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
/** Une image relevée de z (meubles d'étage). */
const lift = (b: Board, z: number): Board => ({ ...b, y: b.y - z });

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

/** Un sol de terre battue (la réserve, l'arrière-boutique) : la terre tassée, quelques cailloux. */
function earthFloor(x0: number, x1: number, y0: number, y1: number, z = 0.02): Quad {
  const tex: Tex = (_s, _t, c) => {
    const i = Math.floor(c.p[0]), j = Math.floor(c.p[1]), h = hash(1361, i >> 1, j >> 1), g = hash(1362, i, j);
    return g < 0.03 ? '=' : h < 0.25 ? 'n' : h < 0.85 ? 'u' : 'U';
  };
  return quad([x0, y0, z], [x1 - x0, 0, 0], [0, y1 - y0, 0], [0, 0, 1], part('terre battue', 0, 'n', 'none', { cast: false }), tex, 'top');
}

interface Def {
  id: PlaceBuildingId;
  levels: 1 | 2;
  pieces: string[];
  outside(frame: number): Scene;
  inside(level: 0 | 1, frame: number): Scene;
  /** Où se tient Xéros pour l'échelle (px de la zone), dehors et dedans ; la terre battue autour (px de la zone). */
  xeros: [number, number]; inXeros: [number, number]; yards: [number, number, number, number][];
}
/** Où chaque bâtiment met Xéros et sa terre battue (pour les planches). */
export const SHOW: Partial<Record<PlaceBuildingId, { xeros: [number, number]; inXeros: [number, number]; yards: [number, number, number, number][] }>> = {};

function building(def: Def): PlaceBuilding {
  const fp = footprint(def.outside(0));
  const at: [number, number] = [fp[0], fp[1]];
  SHOW[def.id] = { xeros: def.xeros, inXeros: def.inXeros, yards: def.yards };
  return {
    id: def.id,
    size: [fp[2] - fp[0], fp[3] - fp[1]],
    at,
    levels: def.levels,
    palette: XPAL,
    outside: (o, frame = 0) => moveScene(def.outside(frame), o[0] - at[0], o[1] - at[1]),
    inside: (o, level = 0, frame = 0) => moveScene(def.inside(level, frame), o[0] - at[0], o[1] - at[1]),
    pieces: def.pieces,
  };
}

// =====================================================================================================================
// La maison de pierre à étage du riche (la boutique, le logis-réserve) : un modèle commun
// =====================================================================================================================
//
// Moellons enduits à la chaux, angles et encadrements de pierre de taille, laves à 45° (le coq en plus simple, le meunier h8 pour
// l'étage) : murs de 50 cm, le rez sous les solives à 2,60 m, le plancher à 2,85 m, les gouttereaux à 5,25 m ; un cordon de pierre
// de taille à l'étage, le seul luxe de la façade avec les vitraux. Les baies se décrivent sur la face sud (s depuis l'angle ouest).

type BayKind = 'door' | 'leaded' | 'shutter' | 'shut' | 'cart' | 'grille' | 'blind';
interface SBay { s0: number; s1: number; z0: number; z1: number; kind: BayKind; pot?: boolean; laundry?: boolean }
interface StoneSpec {
  x: number; y: number; W: number; D: number; seed: number; bays: SBay[];
  /** Les souches (px de la zone : x0, x1, y0, y1), au faîte. */
  stacks: [number, number, number, number][];
}
const ST = { t: 10, rez: 52, floor: 57, top: 105, pitch: 45 };

function stoneWalls(Q: Quad[], s: StoneSpec, z0: number, z1: number, cut?: number): void {
  const { x, y, W, D } = s, { t } = ST;
  const P = part('mur', 2, '~', 'full');
  const bays: StoneBay[] = s.bays.filter((b) => b.kind !== 'blind').map((b, i) => ({ s0: b.s0, s1: b.s1, t0: b.z0, t1: b.z1, seed: i }));
  const south = onFace(withBays(rendered(s.seed, W, ['left', 'right']), bays), true, x, W, ST.top);
  const plaster = limePlaster(s.seed + 2);
  const inner: Tex = (_s, _t, c) => plaster(c.p[0] + c.p[1], c.p[2], c);
  const out = onFace(rendered(s.seed + 4, W, ['left', 'right']), true, x, W, ST.top);
  const side = onFace(rendered(s.seed + 6, D, ['left', 'right']), false, y, D, ST.top);
  const top = rubbleSection(s.seed + 8, 'lime');
  const holes: Hole[] = s.bays.filter((b) => b.kind !== 'blind').map((b) => ({ a0: x + b.s0, a1: x + b.s1, z0: b.z0, z1: b.z1 }));
  wallRun(Q, true, x, x + W, y + D - t, y + D, z0, cut ?? z1, holes, P, { top, side: south });
  wallRun(Q, true, x, x + W, y, y + t, z0, z1, [], P, { top, side: cut !== undefined ? inner : out });
  wallRun(Q, false, y + t, y + D - t, x, x + t, z0, z1, [], P, { top, side: cut !== undefined ? inner : side });
  wallRun(Q, false, y + t, y + D - t, x + W - t, x + W, z0, z1, [], P, { top, side: cut !== undefined ? inner : side });
}

/** Un volet intérieur fermé au fond de l'embrasure : planches debout, deux pentures. */
const shutTex = (w: number, h: number): Tex => (s, t) => {
  const i = Math.floor(s), j = Math.floor(t);
  if (j === 3 || j === h - 4) return i < w - 1 ? (i === 0 ? '-' : '_') : '@';
  if (i % 3 === 2) return '@';
  return i % 3 === 0 ? '^' : j < 2 ? '%' : '*';
};

function stoneOutside(s: StoneSpec): { quads: Quad[]; boards: Board[] } {
  const Q: Quad[] = [], B: Board[] = [];
  const { x, y, W, D } = s, yS = y + D;
  stoneWalls(Q, s, 0, ST.top);
  // le cordon de pierre de taille sous l'étage
  Q.push(...box(x - 0.5, x + W + 0.5, yS - 0.5, yS + 1, ST.floor - 2.5, ST.floor, part('cordon', 4, '~', 'full'), (_s, _t, c) => (c.face === 'top' ? '!' : '+')));
  for (const b of s.bays) {
    const x0 = x + b.s0, x1 = x + b.s1, ww = b.s1 - b.s0, hh = b.z1 - b.z0, m = (x0 + x1) / 2;
    if (b.kind === 'blind') continue;
    if (b.kind === 'door') {
      Q.push(...box(x0, x1, yS - 4, yS - 3, 0, hh, part('porte', 3, '&', 'full'), strapDoorTex(7 + b.s0)));
      B.push(imgBoard(propImg('threshold-stone'), m - 12, m + 12, yS + 5));
      continue;
    }
    if (b.kind === 'cart') {
      const P = part('porte', 3, '&', 'full');
      Q.push(...box(x0, m, yS - 4, yS - 3, 0, hh, P, aged(leafTex(s.seed + b.s0, m - x0, { latch: 'right' }), 'worn')));
      Q.push(...box(m, x1, yS - 4, yS - 3, 0, hh, part('porte', 3.1, '&', 'full'), aged(leafTex(s.seed + b.s0 + 1, x1 - m), 'worn')));
      continue;
    }
    sill(Q, x0 - 2, x1 + 2, yS, b.z0);
    if (b.kind === 'leaded') {
      Q.push(...box(x0, x1, yS - 4, yS - 3, b.z0, b.z1, part('vitrail', 1, '`', 'none'), (ss, tt) => leaded(ww, hh, ss, tt)));
      // le meneau et la traverse de pierre : le vitrail en quatre jours (deux meneaux au-delà de 1,40 m)
      const M = part('meneau', 2.5, '~', 'full');
      const mul = ww > 28 ? [x0 + ww / 3, x0 + (2 * ww) / 3] : [m];
      for (const mx of mul) Q.push(...box(mx - 1, mx + 1, yS - 3, yS - 1, b.z0, b.z1, M, (_s, _t, c) => (c.face === 'S' ? '+' : c.face === 'top' ? '!' : '=')));
      const tz = b.z0 + Math.round(hh * 0.62);
      Q.push(...box(x0, x1, yS - 3, yS - 1, tz, tz + 2, M, (_s, _t, c) => (c.face === 'top' ? '!' : '+')));
    } else if (b.kind === 'shut') {
      Q.push(...box(x0, x1, yS - 4, yS - 3, b.z0, b.z1, part('volet', 1, '&', 'none'), shutTex(ww, hh)));
    } else {
      darkBay(Q, x0, x1, yS - 3, b.z0, b.z1);
      if (b.kind === 'grille') for (let k = x0 + 2; k < x1 - 1; k += 4) Q.push(...box(k, k + 1, yS - 2.5, yS - 1.5, b.z0, b.z1, part('barreau', 4, '#363343', 'thin'), () => '#50566a'));
      if (b.kind === 'shutter') {
        // le volet ouvert, rabattu contre le mur à l'ouest de la baie (l'image du jeu, vue de côté)
        const sh = img('plank-shutter-r1-worn');
        B.push({ grid: sh.grid, pal: sh.pal, x: Math.round(x0 - 8), y: Math.round(yS + 1 - b.z0 - sh.grid.length), depth: () => yS + 0.5 });
      }
    }
    if (b.pot) B.push({ ...piece('flower-box', m - 6, yS - 1, 0, b.z0), depth: () => yS + 1.5 });
    if (b.laundry) B.push({ ...piece('window-laundry', m - 12, yS - 1, 0, b.z0 - 12), depth: () => yS + 1.6 });
  }
  lavesRoof(Q, { a0: x, a1: x + W, b0: y, b1: yS, z: ST.top, pitch: ST.pitch, eave: 4, gable: [2, 2], thick: 3, seed: s.seed + 10, holes: s.stacks });
  for (const [k, [a, b, c, d]] of s.stacks.entries()) {
    const zr = ST.top + 3 + ((D / 2) - Math.abs((c + d) / 2 - (y + D / 2))) * Math.tan((ST.pitch * Math.PI) / 180);
    stack(Q, a, b, c, d, zr - 30, zr + 14, onFace(rendered(s.seed + 12 + k, b - a, ['left', 'right']), true, a, b - a, zr + 14));
  }
  return { quads: Q, boards: B };
}

/** Le dedans d'une maison de pierre à un niveau : 0 le rez (sol `floor`), 1 l'étage (plancher, le vide sous la coupe du mur sud). */
function stoneInside(s: StoneSpec, level: 0 | 1, floor: 'flags' | 'earth'): Quad[] {
  const Q: Quad[] = [];
  const { x, y, W, D } = s, { t, rez } = ST;
  if (level === 0) {
    stoneWalls(Q, s, 0, rez, 14);
    Q.push(floor === 'flags'
      ? quad([x + t, y + t, 0.02], [W - 2 * t, 0, 0], [0, D - 2 * t, 0], [0, 0, 1], part('dalles', 0, '~', 'none', { cast: false }), flagstones(s.seed), 'top')
      : earthFloor(x + t, x + W - t, y + t, y + D - t));
    return Q;
  }
  stoneWalls(Q, s, rez, ST.top, ST.floor + 14);
  const pp = part('plancher', 1, '&', 'full');
  Q.push(...box(x + t, x + W - t, y + t, y + D - t, rez, ST.floor, pp, { top: planks(), side: planks() }));
  Q.push(...box(x, x + W, y + D - t, y + D, 0, rez, part('vide', 3, 'o', 'none', { cast: false }), () => VOID));
  return Q;
}

// =====================================================================================================================
// La ferme du riche : la boutique au rond, le logis-réserve sur la rue de l'ouest, l'étal luxueux sur le rond
// =====================================================================================================================
//
// La boutique (x 3040-3256, y 1744-1928 : 10,80 × 9,20 m hors œuvre) : façade sud sur le rond ; au rez deux grands vitraux de 1,70 m
// à deux meneaux de part et d'autre de la porte à pentures (la seule vitrine de la place), une fenêtre à volet ; à l'étage (la réserve
// fraîche, les claies à fromages) quatre fenêtres, deux jardinières. Les 32 px de l'ouest sont derrière le logis : mur plein.
// Le logis-réserve (x 2784-3072, y 1936-2064 : 14,40 × 6,40 m) : au rez la réserve (la porte charretière, un soupirail grillé) et
// l'entrée du logis au bout est, tournée vers le rond ; à l'étage le logis du commis et de sa femme (jardinières, linge, l'échelle).
// L'étal (x 3088-3224, y 1984-2064) : l'auvent rayé de 6,40 × 3 m (six poteaux tournés), sous lui la réserve de l'étal (étagères,
// claies, tonneau), devant les deux comptoirs sculptés en équerre chargés, le présentoir à gradins, et à terre devant le client la
// pyramide de pots, les piles de meules, les pains de cire.

const RB: StoneSpec = {
  x: 3040, y: 1744, W: 216, D: 184, seed: 1301,
  bays: [
    { s0: 0, s1: 32, z0: 0, z1: 0, kind: 'blind' },
    { s0: 42, s1: 76, z0: 12, z1: 40, kind: 'leaded' },
    { s0: 96, s1: 116, z0: 0, z1: 42, kind: 'door' },
    { s0: 136, s1: 170, z0: 12, z1: 40, kind: 'leaded' },
    { s0: 188, s1: 202, z0: 16, z1: 34, kind: 'shutter' },
    { s0: 50, s1: 64, z0: 70, z1: 90, kind: 'shutter', pot: true },
    { s0: 99, s1: 113, z0: 70, z1: 90, kind: 'leaded' },
    { s0: 146, s1: 160, z0: 70, z1: 90, kind: 'shutter', pot: true },
    { s0: 188, s1: 202, z0: 70, z1: 90, kind: 'shut' },
  ],
  stacks: [[3040 + 150, 3040 + 166, 1744 + 85, 1744 + 99]],
};
const RL: StoneSpec = {
  x: 2784, y: 1936, W: 288, D: 128, seed: 1341,
  bays: [
    { s0: 24, s1: 64, z0: 0, z1: 46, kind: 'cart' },
    { s0: 84, s1: 98, z0: 20, z1: 32, kind: 'grille' },
    { s0: 150, s1: 164, z0: 16, z1: 34, kind: 'shutter' },
    { s0: 196, s1: 210, z0: 16, z1: 34, kind: 'shutter' },
    { s0: 238, s1: 256, z0: 0, z1: 40, kind: 'door' },
    { s0: 32, s1: 46, z0: 70, z1: 90, kind: 'shutter', pot: true },
    { s0: 98, s1: 112, z0: 70, z1: 90, kind: 'shutter', laundry: true },
    { s0: 160, s1: 174, z0: 70, z1: 90, kind: 'shutter', pot: true },
    { s0: 220, s1: 234, z0: 70, z1: 90, kind: 'shutter', pot: true },
    { s0: 260, s1: 274, z0: 70, z1: 90, kind: 'shut' },
  ],
  stacks: [[2784 + 124, 2784 + 140, 1936 + 57, 1936 + 71]],
};
const STALL = { x: 3092, y: 1984 };

function richStall(roof: boolean): { quads: Quad[]; boards: Board[] } {
  const { x, y } = STALL;
  const aw = moved(pieceModel('striped-awning'), [x, y, 0]);
  const Q = stoneHex(roof ? aw : noRoof(aw));
  const counter = (v: number, x0: number, y0: number) => {
    const im = ladenCounter(v), [w, d] = v % 2 ? [14, 48] : [48, 14];
    return imgBoard(im, x0, x0 + w, y0 + d);
  };
  const B: Board[] = [
    // sous l'auvent, au fond : la réserve de l'étal (cachée par la toile, sauf quand Xéros entre dessous)
    piece('shop-shelves', x + 4, y + 2), piece('cheese-rack', x + 50, y + 2), prop('barrel', x + 78, y + 2), piece('cheese-rack', x + 96, y + 2),
    // le présentoir derrière le comptoir, les jarres d'huile
    piece('tiered-display', x + 56, y + 22), prop('jar', x + 92, y + 24),
    // devant : le présentoir à l'ouest, les deux comptoirs chargés en équerre
    piece('tiered-display', x + 4, y + 40), counter(0, x + 58, y + 46), counter(1, x + 112, y + 20),
    // à terre devant le client : la pyramide de pots, les meules, les pains de cire, un tonneau de miel, une caisse de pots
    piece('honey-pyramid', x + 8, y + 62), piece('cheese-stack', x + 34, y + 60), piece('cheese-stack', x + 44, y + 66), piece('wax-stack', x + 60, y + 64),
    piece('honey-pyramid', x + 76, y + 64, 0), prop('barrel', x - 16, y + 50), prop('crate', x - 18, y + 30), prop('jar', x - 12, y + 16),
    prop('crate', x + 96, y + 64), piece('wax-stack', x + 97, y + 64, 0, 10), prop('sack', x - 8, y + 66),
    // les bottes de cierges pendues à la traverse de devant, entre les poteaux
    ...[10, 26, 42, 78, 94].map((dx) => ({ ...piece('candle-bunch', x + dx, y + 57, 0, 34), depth: () => y + 59.5 })),
  ];
  return { quads: Q, boards: B };
}

/** Devant le logis : la réserve qui déborde sur la rue (tonneaux, caisses, sacs), l'échelle, le banc près de l'entrée. */
function richLogisFront(): Board[] {
  const { x, y, D } = RL, yS = y + D;
  return [
    prop('barrel', x + 6, yS + 2), prop('barrel', x + 70, yS + 1), prop('barrel', x + 70, yS + 1, 0, 'worn', 18),
    prop('crate', x + 100, yS + 3), prop('crate', x + 112, yS + 4), prop('crate', x + 104, yS + 2, 0, 'worn', 10), prop('sack', x + 124, yS + 4),
    piece('leaning-ladder', x + 116, yS - 2), prop('bench', x + 186, yS + 2), prop('bucket-water', x + 260, yS + 3),
  ];
}
/** L'enseigne au pot de miel et au coq, sur le pignon est de la boutique, au-dessus de la rue du nord : le bras vers l'est (R0). */
const richSign = (): Board => imgBoard(pieceView('hanging-sign', 0), RB.x + RB.W, RB.x + RB.W + 20, RB.y + RB.D - 4, 46);

function richInsideBoards(level: 0 | 1): Board[] {
  const b = RB, l = RL;
  if (level === 0) return [
    // la boutique : les étagères contre le mur nord et le refend, le comptoir sculpté chargé, le présentoir, l'escalier au fond
    piece('shop-shelves', b.x + 40, b.y + 12), piece('shop-shelves', b.x + 90, b.y + 12), piece('cheese-rack', b.x + 150, b.y + 12),
    imgBoard(ladenCounter(0), b.x + 76, b.x + 124, b.y + 120), prop('stool', b.x + 96, b.y + 92),
    piece('tiered-display', b.x + 24, b.y + 140), piece('honey-pyramid', b.x + 150, b.y + 150), piece('cheese-stack', b.x + 180, b.y + 140),
    prop('barrel', b.x + 190, b.y + 60), prop('jar', b.x + 176, b.y + 70),
    // la réserve du logis : tonneaux, sacs, caisses, jarres ; l'entrée du logis à l'est
    prop('barrel', l.x + 14, l.y + 12), prop('barrel', l.x + 28, l.y + 12), prop('barrel', l.x + 42, l.y + 12), prop('barrel', l.x + 14, l.y + 28),
    prop('sack', l.x + 64, l.y + 14), prop('sack', l.x + 76, l.y + 16), prop('sack', l.x + 88, l.y + 14), prop('sack', l.x + 70, l.y + 30),
    prop('crate', l.x + 120, l.y + 14), prop('crate', l.x + 134, l.y + 14), prop('jar', l.x + 156, l.y + 14), prop('jar', l.x + 168, l.y + 16),
    piece('cheese-rack', l.x + 110, l.y + 70), piece('wax-stack', l.x + 150, l.y + 80), prop('table', l.x + 230, l.y + 60), prop('bench', l.x + 226, l.y + 82),
  ];
  const F = ST.floor;
  return [
    // l'étage de la boutique : la réserve fraîche, les claies
    piece('cheese-rack', b.x + 20, b.y + 14), piece('cheese-rack', b.x + 50, b.y + 14), piece('cheese-rack', b.x + 80, b.y + 14), prop('jar', b.x + 120, b.y + 16), prop('barrel', b.x + 140, b.y + 14),
    // l'étage du logis : la chambre du commis et de sa femme, la salle
    prop('bed', l.x + 20, l.y + 14), prop('chest', l.x + 22, l.y + 60), prop('table', l.x + 120, l.y + 50), prop('bench', l.x + 121, l.y + 40), prop('stool', l.x + 150, l.y + 54),
    prop('chest', l.x + 200, l.y + 14), prop('bed', l.x + 240, l.y + 14),
  ].map((bd) => lift(bd, F));
}

const fermeRiche: Def = {
  id: 'p-ferme-riche', levels: 2,
  pieces: ['luxury-counter', 'striped-awning', 'tiered-display', 'shop-shelves', 'cheese-rack', 'honey-pyramid', 'cheese-stack', 'wax-stack', 'candle-bunch', 'flower-box', 'window-laundry', 'leaning-ladder', 'hanging-sign'],
  xeros: [3150, 2100], inXeros: [3140, 1900],
  yards: [[3008, 1928, 3264, 2080]],
  outside: () => {
    const a = stoneOutside(RB), b = stoneOutside(RL), stall = richStall(true);
    return { quads: [...stoneHex([...a.quads, ...b.quads]), ...stall.quads], boards: [...a.boards, ...b.boards, ...stall.boards, ...richLogisFront(), richSign()] };
  },
  inside: (level) => {
    const stall = richStall(false);
    const Q = [...stoneInside(RB, level, 'flags'), ...stoneInside(RL, level, 'earth')];
    if (level === 0) Q.push(...moved(stairModel(), [RB.x + 196 - STAIR.w, RB.y + 30, 0]));
    return { quads: [...stoneHex(Q), ...stall.quads], boards: [...richInsideBoards(level), ...stall.boards, ...richLogisFront()] };
  },
};

// =====================================================================================================================
// Le bûcheron : la boutique au rond, à étage
// =====================================================================================================================
//
// La boutique (axes x 3368-3584, y 1744-1928 : 10,80 × 9,20 m) : au rez (sablière à 3 m) le magasin, en bardage de planches debout
// sur un solin, ouvert au sud par trois devantures : un mur d'appui de pierre, le volet du bas rabattu en tablette sur deux consoles,
// chargé (coins de fer, maillets, bottes de bardeaux), le noir du magasin derrière ; la porte au milieu. Un avant-toit de bardeaux de
// 70 cm sur toute la façade, au niveau du plancher, abrite le râtelier d'outils. À l'étage (2,40 m), le logis du neveu et de sa femme :
// pan de bois chaulé, quatre fenêtres à volet, deux jardinières, du linge ; bardeaux à 45° (faîte à 9,70 m), égout court (30 cm).
// Le recoin devant, jusqu'au rond : les tas du jeu qui débordent (quartiers, bûches, perches, planches), les fagots, le comptoir sur
// billots devant la devanture de l'est, le billot et sa hache ; l'enseigne à la hache au pignon ouest, sur la rue du nord.

const BU = { x: 3368, y: 1744, L: 216, D: 184, T: 60, U: 48 };
const BU_NS = [0, 46, 92, 138, 184];
const BU_S = [0, 44, 84, 124, 148, 188, 216];
const BU_UP = [0, 36, 72, 108, 144, 180, 216];
/** Les devantures : les travées ouvertes du rez (posts de BU_S). */
const SHOPFRONTS: [number, number][] = [[44, 84], [84, 124], [148, 188]];
const buWalls = (south: Wall['bays'], sPosts: number[], base?: number): Wall[] => [
  { side: 'S', ew: true, c: BU.D, posts: sPosts, out: 1, bays: south, base },
  { side: 'N', ew: true, c: 0, posts: BU_UP, out: -1, bays: BU_UP.slice(1).map(() => 'plain' as const), base },
  { side: 'W', ew: false, c: 0, posts: BU_NS, out: -1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true], base },
  { side: 'E', ew: false, c: BU.L, posts: BU_NS, out: 1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true], base },
];
const BU_REZ: HouseSpec = {
  L: BU.L, D: BU.D, T: BU.T, sill: 16, doorW: 18, innerDoorW: 16, doorH: 40, age: 'worn', fill: 'boards', threshold: false,
  walls: buWalls(['plain', 'open', 'open', 'door', 'open', 'plain'], BU_S),
  roof: { cover: 'shingles', pitch: 45, over: [8, 8], eave: 6, gables: ['lime', 'lime'] },
};
const BU_UP_SPEC: HouseSpec = {
  L: BU.L, D: BU.D, T: BU.U, sill: 18, doorW: 18, innerDoorW: 16, age: 'worn', fill: 'lime',
  walls: buWalls(['plain', 'window', 'plain', 'window', 'window', 'window'], BU_UP, 0).map((w) => (w.side === 'S' ? { ...w, fills: [undefined, undefined, 'cross', undefined, undefined, undefined] } : w)),
  roof: { cover: 'shingles', pitch: 45, over: [8, 8], eave: 6, gables: ['lime', 'lime'] },
};

/** Les devantures du rez : le mur d'appui, le noir du magasin, le linteau et le bardage au-dessus, la tablette et ce qu'elle porte. */
function shopfronts(): Quad[] {
  const Q: Quad[] = [], D = BU.D;
  const Wd = (sd: number) => aged(timber(sd), 'worn');
  for (const [k, [p0, p1]] of SHOPFRONTS.entries()) {
    const a0 = p0 + 2, a1 = p1 - 2;
    Q.push(...box(a0, a1, D - 2, D + 2, 0, 14, part('appui', 3, '~', 'full', { eave: true }), fillTex('stone', 1601 + k, 'worn')));
    Q.push(quad([a0, D - 1.5, 14], [a1 - a0, 0, 0], [0, 0, 26], [0, 1, 0], part('noir', 0, 'o', 'none', { cast: false }), voidTex));
    Q.push(...box(a0, a1, D - 2, D + 2, 40, 43, part('linteau', 6, 'K', 'full', { eave: true }), Wd(1611 + k)));
    Q.push(...box(a0, a1, D - 2, D + 2, 43, BU.T - 4, part('bardage', 1, 'K', 'full', { eave: true }), fillTex('boards', 1621 + k, 'worn')));
    // la tablette : le volet du bas rabattu, ses deux consoles
    Q.push(...box(a0 - 1, a1 + 1, D + 2, D + 10, 13, 14.6, part('tablette', 4, '&', 'full'), Wd(1631 + k)));
    for (const cx of [a0 + 3, a1 - 4]) Q.push(...box(cx, cx + 1.4, D + 2, D + 8, 9, 13, part('console', 4.5, '&', 'full'), Wd(1641 + cx)));
    // la marchandise : des coins de fer, des maillets, des bottes de bardeaux, des piquets en botte, selon la devanture
    const z = 14.6, I = part('fer', 6, C.ironDeep, 'full');
    const ir: Tex = (_s, _t, c) => (c.face === 'top' || c.face === 'W' ? C.ironLight : c.face === 'S' ? C.iron : C.ironShade);
    const wd: Tex = (_s, _t, c) => (c.face === 'top' || c.face === 'W' ? '^' : c.face === 'S' ? '*' : '%');
    const bk: Tex = (_s, t, c) => (c.face === 'top' ? (Math.floor(t) % 2 ? '*' : '^') : c.face === 'W' ? 'm' : c.face === 'S' ? 'M' : 'N');
    if (k === 0) {
      for (let i = 0; i < 6; i++) Q.push(...box(a0 + 2 + i * 3, a0 + 3.6 + i * 3, D + 4, D + 7, z, z + 1.6, I, ir));
      for (let i = 0; i < 2; i++) Q.push(...box(a0 + 22 + i * 7, a0 + 25 + i * 7, D + 3, D + 6, z, z + 2.4, part('maillet', 5.5, 'K', 'full'), bk), ...box(a0 + 25 + i * 7, a0 + 28 + i * 7, D + 4, D + 5, z, z + 0.8, part('manche', 5.4, '&', 'full'), wd));
    } else if (k === 1) {
      for (let i = 0; i < 3; i++) Q.push(...box(a0 + 1 + i * 11, a0 + 11 + i * 11, D + 3, D + 8, z, z + 3, part('bardeaux', 5, '&', 'full'), wd), ...box(a0 + 3 + i * 11, a0 + 4 + i * 11, D + 2.9, D + 8.1, z, z + 3.1, part('hart', 5.1, 'Q', 'thin'), () => 'Q'));
      for (let i = 0; i < 2; i++) Q.push(...box(a0 + 6 + i * 11, a0 + 12 + i * 11, D + 4, D + 7, z + 3, z + 5.6, part('bardeaux', 5.2, '&', 'full'), wd));
    } else {
      // des piquets appointés couchés, en tas, la pointe vers l'est
      for (let i = 0; i < 9; i++) {
        const r = i < 5 ? 0 : 1, j = r ? i - 5 : i;
        Q.push(...box(a0 + 2 + r, a1 - 5 + r, D + 3 + j * 1.2 + r * 0.6, D + 4.1 + j * 1.2 + r * 0.6, z + r * 1.1, z + 1.1 + r * 1.1, part('piquet', 5 + i * 0.01, 'K', 'full'), bk));
      }
    }
  }
  return Q;
}

function bucheronHouse(roof: boolean, cut: 0 | 1 | null): { quads: Quad[]; boards: Board[] } {
  const Q: Quad[] = [], B: Board[] = [];
  const { x, y, T } = BU;
  if (cut === null || cut === 0) Q.push(...frameQuads(BU_REZ, { cut: cut === 0, roof: false }));
  if (cut === null) {
    Q.push(...shopfronts());
    Q.push(...moved(frameQuads(BU_UP_SPEC, { roof }), [0, 0, T]));
    // l'avant-toit de bardeaux sur toute la façade, au niveau du plancher, sur des aisseliers
    const lt = leanTo([-6, BU.D + 2, T + 1], [-6, BU.D + 15, T - 5], [BU.L + 12, 0, 0], [], 'worn', 1651, 'shingles');
    Q.push(...(roof ? lt : noRoof(lt)));
  }
  if (cut === 1) {
    Q.push(...moved(frameQuads(BU_UP_SPEC, { cut: true, roof: false }), [0, 0, T]));
    Q.push(...box(2, BU.L - 2, 2, BU.D - 2, T - 4, T, part('plancher', 1, '&', 'full'), { top: planks(), side: planks() }));
    Q.push(...box(-2, BU.L + 2, BU.D - 2, BU.D + 2, 0, T - 4, part('vide', 3, 'o', 'none', { cast: false }), () => VOID));
  }
  if (cut !== 1) B.push(...solinBoards(BU_REZ, 0, 1655));
  return { quads: foreign(moved(Q, [x, y, 0])), boards: B.map((b) => moveBoard(b, x, y)) };
}

/** Les volets ouverts, les jardinières et le linge des fenêtres de l'étage (dehors). */
function bucheronWindows(): Board[] {
  const B: Board[] = [];
  const zs = BU.T + BU_UP_SPEC.sill, Y = BU.y + BU.D;
  BU_UP_SPEC.walls[0].bays.forEach((b, k) => {
    if (b !== 'window') return;
    const X = BU.x + (BU_UP[k] + BU_UP[k + 1]) / 2;
    const s = propImg('plank-shutter', 1, 'worn');
    B.push({ grid: s.grid, pal: s.pal, x: Math.round(X - 8), y: Math.round(Y + 15 - zs - s.grid.length), depth: () => Y + 14 });
    if (k === 1 || k === 4) B.push({ ...piece('flower-box', X - 6, Y + 1, 0, zs - 2), depth: () => Y + 3 });
    if (k === 5) B.push({ ...piece('window-laundry', X - 12, Y + 1, 0, zs - 13), depth: () => Y + 3.2 });
  });
  return B;
}

/** Le recoin devant la boutique : les tas qui débordent, les fagots, le comptoir, le billot, le râtelier d'outils, l'enseigne. */
function bucheronYard(): Board[] {
  const B: Board[] = [];
  const { x, y, D } = BU, yS = y + D;
  // sous l'avant-toit, contre la travée pleine de l'ouest : le râtelier d'outils ; une botte de bardeaux à son pied
  B.push(piece('tool-rack', x + 3, yS + 2));
  B.push(piece('shingle-bundle', x + 196, yS + 4), piece('shingle-bundle', x + 196, yS + 4, 0, 6), piece('shingle-bundle', x + 204, yS + 9));
  // les fagots contre le pignon ouest, sur la rue du nord : trois au sol, deux dessus
  for (let k = 0; k < 3; k++) B.push(prop('faggot', x - 30, yS - 44 + k * 11, 1));
  for (let k = 0; k < 2; k++) { const b = prop('faggot', x - 30, yS - 39 + k * 11, 1, 'worn', 8); B.push({ ...b, depth: () => yS - 22 + k * 11 }); }
  // les tas du jeu : quartiers, bûches d'1 m, planches de 2 m, perches de 3 m, qui débordent sur le recoin jusqu'au rond
  B.push(...pileBoards({ size: 'big', shape: 'quarter', length: 100 }, x + 6, yS + 30));
  B.push(...pileBoards({ size: 'normal', shape: 'round', length: 100 }, x + 32, yS + 30));
  B.push(...pileBoards({ size: 'big', shape: 'plank', length: 200 }, x + 60, yS + 34));
  B.push(...pileBoards({ size: 'pole', shape: 'round', length: 300 }, x + 2, yS + 56));
  B.push(...pileBoards({ size: 'normal', shape: 'round', length: 100 }, x + 66, yS + 62, 4));
  B.push(...pileBoards({ size: 'big', shape: 'quarter', length: 100 }, x + 164, yS + 40));
  B.push(...pileBoards({ size: 'normal', shape: 'round', length: 100 }, x + 166, yS + 64, 5));
  // ce qui déborde jusque sur le rond : un second tas de perches, des fagots couchés, des bûches de 60 en vrac, une botte de piquets
  B.push(...pileBoards({ size: 'pole', shape: 'round', length: 300 }, x + 30, yS + 84, 3));
  for (const [dx, dy] of [[100, 80], [128, 82], [112, 92]] as const) B.push(prop('faggot', x + dx, yS + dy - 10));
  for (const [dx, dy] of [[150, 82], [160, 88], [146, 92], [172, 80]] as const) B.push(woodBoard({ size: 'normal', shape: 'round', axis: (dx + dy) % 3 ? 'ew' : 'ns', length: 60 }, x + dx, yS + dy));
  B.push(...pileBoards({ size: 'big', shape: 'plank', length: 200 }, x + 6, yS + 108, 5));
  // le comptoir sur billots devant la devanture de l'est, une bûche et un quartier dessus ; le billot et sa hache
  B.push(piece('plank-counter', x + 148, yS + 14));
  B.push(woodBoard({ size: 'normal', shape: 'round', axis: 'ew', length: 60 }, x + 152, yS + 22, 18));
  B.push(woodBoard({ size: 'big', shape: 'quarter', axis: 'ew', length: 60 }, x + 168, yS + 22, 18));
  B.push(imgBoard(img(has('chopping-block-axe-worn') ? 'chopping-block-axe-worn' : 'chopping-block-axe'), x + 120, x + 131, yS + 44));
  B.push(sawhorse(x + 104, yS + 56), woodBoard({ size: 'normal', shape: 'round', axis: 'ew', length: 100 }, x + 104, yS + 64, 15));
  // l'enseigne à la hache, au pignon ouest, le bras vers l'ouest (R2), au-dessus de la rue du nord
  B.push(imgBoard(pieceView('hanging-sign-s1', 2), x - 22, x - 2, yS - 6, 48));
  return B;
}

function bucheronStock(level: 0 | 1): Board[] {
  const { x, y } = BU;
  if (level === 1) return [
    prop('bed', x + 16, y + 14), prop('chest', x + 18, y + 64), prop('table', x + 100, y + 70), prop('bench', x + 101, y + 60), prop('stool', x + 130, y + 76),
    prop('chest', x + 170, y + 14), prop('barrel', x + 190, y + 120),
  ].map((b) => lift(b, BU.T));
  return [
    piece('wood-rack', x + 6, y + 4), piece('wood-rack', x + 76, y + 4), piece('tool-rack', x + 150, y + 10),
    ...pileBoards({ size: 'normal', shape: 'round', length: 100 }, x + 10, y + 120),
    ...pileBoards({ size: 'big', shape: 'quarter', length: 100 }, x + 40, y + 120),
    ...pileBoards({ size: 'big', shape: 'plank', length: 200 }, x + 120, y + 110, 6),
    prop('chopping-block', x + 90, y + 90), sawhorse(x + 150, y + 80),
    prop('table', x + 170, y + 150), prop('stool', x + 186, y + 140),
  ];
}

const bucheron: Def = {
  id: 'p-bucheron', levels: 2,
  pieces: ['plank-counter', 'wood-rack', 'tool-rack', 'shingle-bundle', 'flower-box', 'window-laundry', 'hanging-sign-s1'],
  xeros: [3540, 2010], inXeros: [3480, 1900],
  yards: [[3264, 1928, 3616, 2080], [3264, 1700, 3360, 1928]],
  outside: () => {
    const h = bucheronHouse(true, null);
    return { quads: h.quads, boards: [...h.boards, ...bucheronWindows(), ...bucheronYard()] };
  },
  inside: (level) => {
    const h = bucheronHouse(false, level);
    const q = level === 0 ? [earthFloor(BU.x + 2, BU.x + BU.L - 2, BU.y + 2, BU.y + BU.D - 2), ...h.quads] : h.quads;
    return { quads: q, boards: [...h.boards, ...bucheronStock(level), ...bucheronYard()] };
  },
};

// =====================================================================================================================
// Le menuisier : la boutique abandonnée, le long de la rue de l'est
// =====================================================================================================================
//
// Le bâtiment (axes x 3576-3864, y 1936-2064 : 14,40 × 6,40 m), de plain-pied : le kit de la maison de Xéros au bois vieux, chaux
// écaillée, poteaux tous les 1,60 m, sablière à 2,60 m, bardeaux à 45° dont il manque des rangs. Au sud, sur la rue de l'est :
// l'atelier (8 m : deux fenêtres clouées, la porte à deux battants barrée d'une planche) et le logis (6,40 m : la porte, deux fenêtres
// clouées). L'herbe haute contre le solin, des planches oubliées contre le mur, l'enseigne tombée au pied du pignon est, la potence
// vide au-dessus. C'est la boutique que la mère rachètera pour sa menuiserie (14.1).

const MN = { x: 3576, y: 1936 };
const steps = (n: number, k = 32) => Array.from({ length: n + 1 }, (_, i) => i * k);
const MN_SPEC: HouseSpec = {
  L: 288, D: 128, T: 52, sill: 16, doorW: 18, innerDoorW: 16, age: 'old', fill: 'flaking', trusses: [160],
  walls: [
    { side: 'S', ew: true, c: 128, posts: [0, 32, 64, 128, 160, 192, 224, 256, 288], out: 1, bays: ['window', 'plain', 'twin-door', 'window', 'plain', 'door', 'plain', 'window'] },
    { side: 'N', ew: true, c: 0, posts: steps(9), out: -1, bays: steps(8).map(() => 'plain' as const) },
    { side: 'W', ew: false, c: 0, posts: steps(4), out: -1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 288, posts: steps(4), out: 1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true] },
    { ew: false, c: 160, posts: steps(4), out: 1, bays: ['plain', 'plain', 'inner-door', 'plain'], ends: [true, true] },
  ],
  roof: { cover: 'shingles', pitch: MENUISIER_ROOF.pitch, over: [6, 6], eave: 8, gables: ['flaking', 'flaking'] },
};
/** Les trous de la couverture (pan sud) : [s0, s1, rang0, rang1], s en px depuis la rive ouest, les rangs de 4 px d'écran depuis l'égout. */
const MN_HOLES: [number, number, number, number][] = [[30, 54, 5, 7], [118, 134, 19, 20], [168, 198, 2, 4], [80, 92, 28, 29], [236, 262, 12, 13], [270, 284, 24, 25]];
const MN_WINDOWS = [16, 144, 272];

function menuisierFrame(cut: boolean): { quads: Quad[]; boards: Board[] } {
  const K = Math.sin(Math.PI / 4) + Math.cos(Math.PI / 4);
  const qs = frameQuads(MN_SPEC, { cut, roof: !cut }).map((q) =>
    q.part.name === 'bardeaux' && q.face === 'slope' && q.n[1] > 0 ? { ...q, tex: damagedShingles(q.tex, K, MN_HOLES) } : q);
  const Q: Quad[] = [...qs];
  // la planche clouée en travers de la porte à deux battants
  if (!cut) Q.push(...box(66, 126, 129.6, 130.8, 17, 19.4, part('planche clouée', 4, '|', 'full'), aged(timber(1501), 'old')));
  return { quads: foreign(moved(Q, [MN.x, MN.y, 0])), boards: solinBoards(MN_SPEC, 0, 1503).map((b) => moveBoard(b, MN.x, MN.y)) };
}

const WEEDS: [number, number, number][] = [[-8, 4, 0], [30, 6, 0], [130, 5, 0], [180, 4, 0], [236, 8, 0], [292, 8, 0], [-14, -30, 1]];
/** Ce qui reste au sol dehors (vu aussi toit effacé) : l'herbe, l'enseigne tombée, les planches oubliées. */
function menuisierGround(): Board[] {
  const { x, y } = MN, yS = y + 128;
  return [
    piece('fallen-sign', x + 292, yS - 2, 1),
    woodBoard({ size: 'big', shape: 'plank', axis: 'ew', length: 200, age: 'old' }, x + 196, yS + 10),
    woodBoard({ size: 'big', shape: 'plank', axis: 'ew', length: 200, age: 'old' }, x + 200, yS + 14),
    ...WEEDS.map(([dx, dy, v]) => piece('tall-weeds', x + dx, yS + dy, v)),
  ];
}
function menuisierOutside(): Board[] {
  const { x, y } = MN, yS = y + 128;
  const B: Board[] = [];
  for (const m of MN_WINDOWS) B.push(imgBoard(pieceView('nailed-shutter', 0), x + m - 7, x + m + 7, yS + 4, MN_SPEC.sill - 2));
  B.push(imgBoard(pieceView('sign-bracket', 0), x + 290, x + 310, yS - 3, 41));
  return [...B, ...menuisierGround()];
}
function menuisierInside(): Board[] {
  const { x, y } = MN;
  return [
    prop('workbench', x + 8, y + 6, 0, 'old'), piece('unfinished-chair', x + 70, y + 58), sawhorse(x + 26, y + 78),
    woodBoard({ size: 'big', shape: 'plank', axis: 'ew', length: 200, age: 'old' }, x + 80, y + 92),
    woodBoard({ size: 'normal', shape: 'round', axis: 'ew', length: 100, hewn: 12, age: 'old' }, x + 20, y + 112),
    prop('crate', x + 120, y + 40, 0, 'old'), prop('stool', x + 100, y + 26, 0, 'old'),
    prop('bed', x + 246, y + 6, 0, 'old'), prop('table', x + 190, y + 72, 0, 'old'), prop('chest', x + 180, y + 8, 0, 'old'), prop('crate', x + 260, y + 96, 0, 'old'),
  ];
}
function shavings(): Quad[] {
  const { x, y } = MN, P = part('copeaux', 0.5, '{', 'none', { cast: false });
  const tex: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    const edge = Math.min(i, j, Math.floor(c.w) - 1 - i, Math.floor(c.h) - 1 - j);
    const r = hash(1511, i >> (hash(1512, j, i >> 2) < 0.4 ? 1 : 0), j);
    return r < (edge < 2 ? 0.08 : 0.22) ? (hash(1513, i, j) < 0.6 ? '{' : '}') : null;
  };
  return [quad([x + 10, y + 22, 0.03], [56, 0, 0], [0, 10, 0], [0, 0, 1], P, tex, 'top'), quad([x + 20, y + 74, 0.03], [24, 0, 0], [0, 12, 0], [0, 0, 1], P, tex, 'top')];
}

const menuisier: Def = {
  id: 'p-menuisier', levels: 1,
  pieces: ['nailed-shutter', 'fallen-sign', 'sign-bracket', 'tall-weeds', 'shingle-roof-damaged', 'unfinished-chair'],
  xeros: [3724, 2104], inXeros: [3724, 2040],
  yards: [[3576, 2064, 3616, 2080]],
  outside: () => {
    const f = menuisierFrame(false);
    return { quads: f.quads, boards: [...f.boards, ...menuisierOutside()] };
  },
  inside: () => {
    const f = menuisierFrame(true);
    return { quads: [...f.quads, ...shavings()], boards: [...f.boards, ...menuisierInside(), ...menuisierGround()], floor: [MN.x + 2, MN.x + 286, MN.y + 2, MN.y + 126] };
  },
};

// =====================================================================================================================
// Le panneau des nouvelles (13.8), à poser à côté du grand arbre
// =====================================================================================================================

const panneau: Def = {
  id: 'p-panneau', levels: 1,
  pieces: ['notice-board', 'notice-sheet'],
  xeros: [3226, 2086], inXeros: [3226, 2086],
  yards: [],
  outside: () => {
    const [x0, , x1, y1] = PANNEAU;
    return { quads: [], boards: [imgBoard(pieceView('notice-board', 0), x0, x1, y1), imgBoard(propImg('footing-stone'), x0 + 9, x0 + 18, y1 + 9), piece('notice-sheet', x0 + 22, y1 + 4, 1)] };
  },
  inside: () => panneau.outside(0),
};

// =====================================================================================================================
// Les exports
// =====================================================================================================================

const DEFS: Def[] = [fermeRiche, bucheron, menuisier, panneau];
export const BUILDINGS: PlaceBuilding[] = DEFS.map(building);
export { PLACE_META };
/** Qui y vit et travaille, d'après la section 14.3 (PLACE_META de place-types.ts garde le texte de la section 13 : à mettre à jour au montage). */
export const WHO: Partial<Record<PlaceBuildingId, string>> = {
  'p-ferme-riche': 'Le commis de la ferme du riche et sa femme tiennent la boutique et l’étal ; ils logent à l’étage du logis',
  'p-bucheron': 'Le neveu du bûcheron et sa femme tiennent la boutique et logent à l’étage ; le bûcheron vit dans sa cabane',
  'p-menuisier': 'Personne : fermée depuis la mort du menuisier ; la mère la rachètera pour sa menuiserie',
};
/** La palette des faces (celle de l'essai de la maison de Xéros) : les autres couleurs sont écrites en #rrggbb. */
export const palette = XPAL;
export type { V3 };
/** Les emprises hors œuvre des bâtiments (px de la zone : x0, x1, y0, y1), pour le montage et le rendu. */
export const FOOTPRINTS = {
  'boutique du riche': [RB.x, RB.x + RB.W, RB.y, RB.y + RB.D],
  'logis-réserve du riche': [RL.x, RL.x + RL.W, RL.y, RL.y + RL.D],
  'étal luxueux': [STALL.x - 4, STALL.x + 132, STALL.y, STALL.y + 80],
  'boutique du bûcheron': [BU.x, BU.x + BU.L, BU.y, BU.y + BU.D],
  'boutique abandonnée': [MN.x, MN.x + MN_SPEC.L, MN.y, MN.y + MN_SPEC.D],
  'panneau des nouvelles': [PANNEAU[0], PANNEAU[2], PANNEAU[1], PANNEAU[3]],
} as const;
