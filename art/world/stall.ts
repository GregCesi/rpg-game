// L'étal de la place du village (chantier « bâtiments ») : une petite échoppe de bois de 2,40 × 1,60 m, fermable, la face des
// clients au sud. Les quatre poteaux et leurs sablières sont les pièces de bois du jeu (wood-pieces.ts) : rien ici. Ici, ce qui
// les habille : le fond, les côtés, le devant bas, le volet (fermé, puis rabattu en comptoir) et l'auvent.
//
// Le bardage est celui de la grange (art/lib/board-wall.ts) : même bois travaillé (la rampe des âges), mêmes planches debout
// à couvre-joints, mêmes lisses chevillées au dedans, même ombre portée, même chant. Les planches de 30 cm (6 px) ne tombent pas
// juste sur 1,60 m (32 px) ni sur 80 cm (16 px) : quelques planches de 25 ou 35 cm. Gabarit (docs/STYLE.md, section 8),
// 5 cm par pixel, lumière nord-ouest. Quatre vues chacun : r0 la face du dehors au sud, r1 le dehors à l'ouest (de chant),
// r2 le dedans (vu depuis le sud), r3 le dehors à l'est.
//
// - Le fond (`stall-back`, 160 × 20 × 252 cm) : de face 32 × 52 px, deux lisses au dedans (à 1 m et à 2,20 m). De chant
//   5 × 66 (le dessus de 1,60 m en raccourci, 16 rangées, sur les 50 rangées du chant).
// - Le côté (`stall-side`, 80 × 20 × 192 cm) : de face 16 × 40 px, trois planches, deux lisses (à 1 m et à 1,70 m). De chant
//   5 × 46.
// - Le devant bas (`stall-front`, 160 × 20 × 100 cm) : de face 32 × 22 px, une lisse (à 50 cm) ; le haut fini par une planche
//   de rive posée à plat (le rebord où le volet s'appuie et tourne) : son dessus clair, sa tranche, son ombre sur les planches.
//   De chant 5 × 36 (la rive, vue de dessus sur toute sa longueur, puis le chant).
// - Le volet fermé (`stall-shutter`, 160 × 4 × 90 cm) : de face 32 × 18 px (17 rangées de volet, les gonds dessous). Cinq
//   planches debout jointives (sans couvre-joints : c'est de la menuiserie), deux traverses au dedans, chevillées (les têtes
//   des chevilles se voient du dehors) ; deux gros gonds de bois en bas, qui tournent sur le rebord du devant ; un loquet de
//   bois en haut au milieu (un taquet qui pivote). Pas d'ombre portée : il est en l'air, sur le devant. De chant 5 × 34.
// - Le volet rabattu en comptoir (`stall-shutter-open`, 160 × 90 × 4 cm) : le même, couché à plat vers les clients. Vu de
//   dessus : r0 et r2 32 × 10 (le dessus, 90 cm en raccourci, ses planches qui courent du nord au sud ; sa tranche, un pixel,
//   au sud) ; r1 et r3 18 × 17 (le dessus tourné : les planches en travers). Le dessus d'une planche couchée prend la
//   lumière : un cran plus clair que la face debout. Pas d'ombre peinte.
// - L'auvent (`plank-awning`, 280 × 220 × 80 cm, pièce `ground` et `roof`, rive basse au sud) : le pan de toit en planches
//   (art/lib/plank-roof.ts) à ses dimensions : r0 56 × 60, r2 56 × 29 de silhouette dans une image de 56 × 44, r1 et r3
//   44 × 72.

import { BOARD_WOOD, boardsInside, boardsOutside, edgeView, outline, withShadow, type Edge, type Panel } from '../lib/board-wall';
import { Canvas, rng } from '../lib/canvas';
import { roofEW, roofNS, type RoofDims } from '../lib/plank-roof';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

const { hi, mid, lo, joint } = BOARD_WOOD;

/** Le pixel est-il plein (ni vide ni ombre) ? */
const solid = (c: Canvas) => (x: number, y: number) => x >= 0 && y >= 0 && x < c.w && y < c.h && c.get(x, y) !== '.' && c.get(x, y) !== 'x';

// =====================================================================================================================
// Les parois : fond, côté, devant
// =====================================================================================================================

/** Planches de 1,60 m : cinq, de 30, 30, 35, 35 et 30 cm. */
const WIDE: number[] = [6, 6, 7, 7, 6];
/** Planches de 80 cm : trois, de 25, 25 et 30 cm. */
const NARROW: number[] = [5, 5, 6];

/** La rangée du milieu d'une lisse à `z` cm du sol, dans un panneau de `h` rangées : la lisse fait 15 cm (3 rangées). */
const railAt = (h: number, z: number): [number, number] => {
  const m = h - 1 - Math.round(z / 5);
  return [m - 1, m + 1];
};

interface Wall { w: number; h: number; widths: number[]; rails: [number, number][]; seed: number; cap?: boolean }

const panel = (s: Wall): Panel => ({
  w: s.w, h: s.h, inside: (x, y) => x >= 0 && x < s.w && y >= 0 && y < s.h, rails: s.rails, wet: 2, seed: s.seed, widths: s.widths,
});

/**
 * La planche de rive du devant, posée à plat sur le haut des planches, vue de face (du dehors ou du dedans) : rangées 1 et 2
 * son dessus au soleil (le fil en tirets), rangée 3 sa tranche, rangée 4 son ombre sur les planches.
 */
function capFace(c: Canvas, seed: number): Canvas {
  const r = rng(seed);
  const dash: [number, number][] = Array.from({ length: 2 }, () => [7 + Math.floor(r() * 5), Math.floor(r() * 9)]);
  for (let x = 1; x < c.w - 1; x++) {
    c.set(x, 1, hi);
    c.set(x, 2, (x + dash[0][1]) % dash[0][0] < 3 ? mid : hi);
    c.set(x, 3, (x + dash[1][1]) % dash[1][0] < 2 ? lo : mid);
    c.set(x, 4, joint);
  }
  return c;
}

const wallFace = (s: Wall, inside: boolean): Canvas => {
  const c = inside ? boardsInside(panel(s)) : boardsOutside(panel(s));
  if (s.cap) capFace(c, s.seed + (inside ? 7 : 3));
  return withShadow(c);
};

/**
 * De chant : le dessus de la paroi en raccourci (W/10 rangées) sur le chant (H/5 rangées), comme le bardage de la grange ; les
 * lisses en travers du dedans. Le devant (`cap`) : sa planche de rive, plus large que le bardage, couvre tout le dessus (son
 * bois clair, le fil le long de la planche), puis sa tranche au sud.
 */
function wallEdge(s: Wall, depth: number, outsideWest: boolean): Canvas {
  const rows = s.h - 2 + depth;
  const e: Edge = { rows, depth, outer: [0, rows - 3], inner: s.rails.map(([a, b]) => [a, b + depth - 2]), shadow: true };
  const c = edgeView(e, outsideWest);
  if (!s.cap) return c;
  for (let y = 0; y <= depth; y++) for (let x = 0; x < 5; x++) {
    if (y === depth) c.set(x, y, x === 2 ? lo : mid); // la tranche du bout de la rive
    else c.set(x, y, x === 2 && y % 7 >= 3 && y % 7 <= 4 ? mid : hi);
  }
  for (let y = 0; y <= depth; y++) c.set(5, y, '.');
  outline(c, (x, y) => x < 5 && solid(c)(x, y));
  // l'ombre de la rive sur le bardage, sous elle
  for (let x = 1; x < 4; x++) if (c.get(x, depth + 1) !== 'o') c.set(x, depth + 1, joint);
  return c;
}

const BACK: Wall = { w: 32, h: 52, widths: WIDE, rails: [railAt(52, 220), railAt(52, 100)], seed: 41 };
const SIDE: Wall = { w: 16, h: 40, widths: NARROW, rails: [railAt(40, 170), railAt(40, 100)], seed: 47 };
const FRONT: Wall = { w: 32, h: 22, widths: [6, 7, 6, 7, 6], rails: [railAt(22, 50)], seed: 53, cap: true };

// =====================================================================================================================
// Le volet
// =====================================================================================================================

const SW = 32;
/** Le volet : rangées 0 à 16 ; les gonds dépassent dessous, rangée 17. */
const SH = 17;
/** Joints des cinq planches (colonnes du dehors). */
const S_JOINTS = [6, 13, 19, 26];
/** Les traverses du dedans, 15 cm chacune. */
const S_RAILS: [number, number][] = [[2, 4], [11, 13]];
/** Les gonds : deux rouleaux de bois de 20 cm, au bas, à 25 cm des bords (colonnes du dehors). */
const S_HINGES = [4, 24];
/** Le loquet : un taquet de 30 cm, au milieu du haut. */
const S_LATCH: [number, number] = [13, 18];

/** Le fil des planches du volet : par planche, deux colonnes de tirets [colonne dans la planche, période, longueur, décalage]. */
function shutterGrain(seed: number): [number, number, number, number][][] {
  const r = rng(seed);
  return Array.from({ length: 5 }, () => [0, 1].map((k) => [2 + k * 2, 8 + Math.floor(r() * 5), 2 + Math.floor(r() * 2), Math.floor(r() * 12)] as [number, number, number, number]));
}

/** Teinte d'une planche du volet à la colonne du dehors `src` : le joint, le bord ouest au soleil, le bois et son fil. */
function shutterTone(src: number, y: number, inside: boolean, grain: [number, number, number, number][][]): string {
  if (S_JOINTS.includes(src)) return joint;
  // le bord au soleil : à gauche à l'écran (à l'ouest du dehors, à l'est du dedans, qui est retourné)
  if (S_JOINTS.includes(src + (inside ? 1 : -1))) return hi;
  const i = S_JOINTS.filter((j) => src > j).length;
  const start = i === 0 ? 0 : S_JOINTS[i - 1] + 1;
  const local = src - start;
  for (const [gx, per, len, ph] of grain[i]) if (local === gx && (y + ph) % per < len) return lo;
  return mid;
}

/** Les gonds : un rouleau de bois sur le bas du volet (rangée 16) qui dépasse dessous (rangée 17), 4 px de large. */
function hinges(c: Canvas, at: number[]): void {
  for (const hx of at) {
    c.set(hx, SH - 1, hi).set(hx + 1, SH - 1, hi).set(hx + 2, SH - 1, mid).set(hx + 3, SH - 1, lo);
    c.set(hx - 1, SH - 1, joint);
    for (let x = hx; x < hx + 4; x++) c.set(x, SH, 'o');
    c.set(hx + 4, SH - 1, 'o');
  }
}

/** Le loquet : un taquet de bois sur le haut, son bord du haut au soleil, sa cheville au milieu, son ombre dessous. */
function latch(c: Canvas): void {
  const [a, b] = S_LATCH;
  for (let x = a; x <= b; x++) {
    c.set(x, 1, x === a ? joint : hi);
    c.set(x, 2, x === a ? joint : x === b ? 'o' : mid);
    c.set(x, 3, x === a ? joint : 'o');
  }
  c.set(b, 1, 'o');
  c.set((a + b) >> 1, 2, joint);
  for (let x = a + 1; x <= b + 1; x++) if (c.get(x, 4) !== joint) c.set(x, 4, lo);
}

function shutterFace(inside: boolean): Canvas {
  const c = new Canvas(SW, SH + 1);
  const grain = shutterGrain(inside ? 67 : 61);
  for (let x = 1; x < SW - 1; x++) {
    const src = inside ? SW - 1 - x : x;
    for (let y = 1; y < SH - 1; y++) c.set(x, y, shutterTone(src, y, inside, grain));
  }
  const planks: [number, number][] = [[1, 5], [7, 12], [14, 18], [20, 25], [27, 30]];
  if (!inside) {
    // les têtes des chevilles des traverses du dedans, une par planche
    for (const [a, b] of planks) for (const [r0, r1] of S_RAILS) c.set((a + b + 1) >> 1, (r0 + r1) >> 1, joint);
  } else {
    // les traverses : le bord du haut au soleil, le bas à l'ombre, leur ombre portée sur les planches ; une cheville par planche
    for (const [r0, r1] of S_RAILS) {
      for (let x = 1; x < SW - 1; x++) {
        c.set(x, r0, hi);
        for (let y = r0 + 1; y < r1; y++) c.set(x, y, mid);
        c.set(x, r1, lo);
        if (c.get(x, r1 + 1) !== joint) c.set(x, r1 + 1, lo);
      }
      for (const [a, b] of planks) c.set(SW - 1 - ((a + b + 1) >> 1), (r0 + r1) >> 1, joint);
    }
  }
  outline(c, (x, y) => x >= 0 && x < SW && y >= 0 && y < SH);
  hinges(c, inside ? S_HINGES.map((h) => SW - 4 - h) : S_HINGES);
  latch(c);
  return c;
}

/**
 * Le volet de chant : 34 rangées, le dessus (1,60 m) en raccourci sur 16, le chant sur 18. La planche (4 cm, agrandie au
 * plancher de lisibilité), les traverses du dedans sur presque toute la hauteur, le gond qui dépasse du dehors en bas.
 */
const SHUTTER_EDGE: Edge = { rows: 34, depth: 16, outer: [30, 32], inner: [[S_RAILS[0][0], S_RAILS[1][1] + 16]], shadow: false };

// =====================================================================================================================
// Le volet rabattu : le comptoir
// =====================================================================================================================

/**
 * Le volet rabattu vers les clients tourne sa face du dedans vers le haut : le comptoir montre les planches du dedans et les
 * deux traverses chevillées, en relief, comme `stall-shutter-r2` couché à plat. La traverse proche des gonds est à 10-25 cm
 * du bord des gonds, l'autre à 65-80 cm.
 *
 * Vu de dessus, les planches du nord au sud (r0, r2) : 32 × 10. Rangée 0 le contour, 1 à 7 le dessus (90 cm en raccourci),
 * 8 la tranche du bord sud, 9 le contour. Les planches : le bois m, le bord ouest à l'écran au soleil (M), les joints K. Les
 * traverses courent d'ouest en est : leur dessus au soleil (M), leur flanc (m) avec une cheville par planche (K), leur ombre
 * au sud sur les planches (N). r0 (dehors au sud) : les gonds au bord nord, deux rouleaux sur la rangée 1 ; r2 (dehors au
 * nord, le comptoir au nord du devant, la vue retournée) : les gonds au bord sud, sur la tranche.
 */
function counterNS(north: boolean): Canvas {
  const c = new Canvas(SW, 10);
  const planks: [number, number][] = [[1, 5], [7, 12], [14, 18], [20, 25], [27, 30]];
  const xOf = (src: number) => (north ? SW - 1 - src : src);
  for (let x = 1; x < SW - 1; x++) {
    const src = xOf(x);
    const isJoint = S_JOINTS.includes(src);
    const first = S_JOINTS.includes(src + (north ? 1 : -1)) || x === 1;
    for (let y = 1; y <= 7; y++) c.set(x, y, isJoint ? joint : first ? hi : mid);
    c.set(x, 8, isJoint ? joint : lo);
  }
  // les traverses : rangées 2-3 et 6-7 (le dessus, le flanc), l'ombre dessous (la seconde la porte sur la tranche)
  for (const t of [2, 6]) {
    for (let x = 1; x < SW - 1; x++) {
      c.set(x, t, hi).set(x, t + 1, mid);
      if (t + 2 <= 7 && c.get(x, t + 2) !== joint) c.set(x, t + 2, lo);
    }
    for (const [pa, pb] of planks) c.set(xOf((pa + pb + 1) >> 1), t + 1, joint);
  }
  outline(c, (x, y) => x >= 0 && x < SW && y >= 0 && y < 10);
  // les gonds : deux rouleaux de bois de 20 cm, au bord des gonds
  const row = north ? 8 : 1;
  for (const h of S_HINGES) {
    const hx = north ? SW - 4 - h : h;
    c.set(hx, row, hi).set(hx + 1, row, hi).set(hx + 2, row, mid).set(hx + 3, row, lo);
    if (!north) c.set(hx + 4, row, joint);
  }
  return c;
}

/**
 * Le comptoir tourné (r1 : au couchant du devant, les gonds à l'est ; r3 : au levant, les gonds à l'ouest) : 18 × 17. Les
 * planches courent d'est en ouest : des bandes de 3 rangées (30 cm en raccourci), leur bord nord au soleil, les joints K. Les
 * traverses courent du nord au sud, 3 px de large (15 cm, sans raccourci) : le bord ouest au soleil, le bois, une cheville par
 * planche, l'ombre à l'est sur les planches. Rangée 0 le contour, 1 à 14 le dessus, 15 la tranche de la dernière planche (son
 * flanc, au sud), 16 le contour. Les deux rouleaux des gonds le long du bord des gonds.
 */
function counterEW(west: boolean): Canvas {
  const W = 18;
  const H = 17;
  const c = new Canvas(W, H);
  const JOINTS = [4, 7, 10, 13];
  for (let y = 1; y <= 14; y++) for (let x = 1; x < W - 1; x++) {
    c.set(x, y, JOINTS.includes(y) ? joint : y === 1 || JOINTS.includes(y - 1) ? hi : mid);
  }
  for (let x = 1; x < W - 1; x++) c.set(x, 15, (x + 3) % 8 < 2 ? lo : mid);
  // les traverses : r1 à 65-80 cm (colonnes 2-4) et 10-25 cm (12-14) des gonds à l'est ; r3, à l'ouest : 3-5 et 13-15
  for (const a of west ? [2, 12] : [3, 13]) {
    for (let y = 1; y <= 14; y++) {
      c.set(a, y, hi).set(a + 1, y, mid).set(a + 2, y, mid);
      if (c.get(a + 3, y) !== joint) c.set(a + 3, y, lo);
    }
    for (const y of [2, 5, 8, 11, 14]) c.set(a + 1, y, joint);
  }
  outline(c, (x, y) => x >= 0 && x < W && y >= 0 && y < H);
  // les gonds : deux rouleaux de 20 cm (2 rangées en raccourci), à 25 cm des bouts, contre le bord des gonds
  const hx = west ? W - 2 : 1;
  for (const y0 of [3, 11]) c.set(hx, y0, hi).set(hx, y0 + 1, mid);
  return c;
}

// =====================================================================================================================
// L'auvent
// =====================================================================================================================

const AWNING: RoofDims = { w: 280, d: 220, h: 80 };

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('stall-back', wallFace(BACK, false)),
  img('stall-back-r1', wallEdge(BACK, 16, true)),
  img('stall-back-r2', wallFace(BACK, true)),
  img('stall-back-r3', wallEdge(BACK, 16, false)),
  img('stall-side', wallFace(SIDE, false)),
  img('stall-side-r1', wallEdge(SIDE, 8, true)),
  img('stall-side-r2', wallFace(SIDE, true)),
  img('stall-side-r3', wallEdge(SIDE, 8, false)),
  img('stall-front', wallFace(FRONT, false)),
  img('stall-front-r1', wallEdge(FRONT, 16, true)),
  img('stall-front-r2', wallFace(FRONT, true)),
  img('stall-front-r3', wallEdge(FRONT, 16, false)),
  img('stall-shutter', shutterFace(false)),
  img('stall-shutter-r1', edgeView(SHUTTER_EDGE, true)),
  img('stall-shutter-r2', shutterFace(true)),
  img('stall-shutter-r3', edgeView(SHUTTER_EDGE, false)),
  img('stall-shutter-open', counterNS(false)),
  img('stall-shutter-open-r1', counterEW(true)),
  img('stall-shutter-open-r2', counterNS(true)),
  img('stall-shutter-open-r3', counterEW(false)),
  img('plank-awning', roofNS(AWNING, 'south', 181)),
  img('plank-awning-r1', roofEW(AWNING, 'west', 191)),
  img('plank-awning-r2', roofNS(AWNING, 'north', 187)),
  img('plank-awning-r3', roofEW(AWNING, 'east', 193)),
];
