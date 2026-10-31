// Pan de toit en planches, à toutes les tailles : le pan de la cabane (`plank-roof`, 480 × 200 × 100 cm, art/world/cabin.ts) et
// le grand pan de la grange (`plank-roof-large`, 960 × 340 × 260 cm, art/world/barn.ts). Un même dessin, paramétré par les
// dimensions du pan en centimètres : `w` le long du faîtage, `d` la profondeur au sol de la rive basse au faîtage, `h` la montée.
//
// Pièce `ground` et `roof` (docs/STYLE.md, section 8) : profondeur à l'échelle du sol, projection (x, y, z) -> (x, y − z), 5 cm
// par pixel. Le bois travaillé de tout le jeu (rampe des âges ^ * % &, joints et chevilles @ ; art/palette.ts `woodAges`) : le pan
// prend l'âge du bâtiment (neuf, patiné, vieux, tirés au build), il n'a plus de gris à lui. Planches de 25 cm dans le sens
// de la pente, deux épaisseurs à joints croisés (une planche du dessus sur deux), chevilles, rive basse plus sombre, faîtage clair.
// Pas de rangées vides sous le pan côté rive basse, pas d'ombre peinte (le jeu la calcule).
// - r0 (rive basse au sud) : W × (H + D) px, le faîtage en haut (rangée 0), la rive basse en bas.
// - r2 (rive basse au nord) : le pan fuit vers le nord, raccourci : W × (D − H + 1) px de silhouette (la rive en haut, le
//   faîtage en bas), puis des rangées vides jusqu'au bord sud de l'emprise à la hauteur de la base : image W × D.
// - r1 (rive basse à l'ouest), r3 (à l'est) : un parallélogramme de D × (W + H) px.
// (W = w/5, D = d/5, H = h/5.) Les graines du hasard sont données par l'appelant : la cabane garde les siennes au pixel près.

import { Canvas, rng } from './canvas';

/** Dimensions d'un pan, en centimètres. */
export interface RoofDims { w: number; d: number; h: number }

const PX = 5;

/** Bois travaillé, du plus clair au plus sombre : lumière, bois, ombre, creux ; @ pour les joints et les têtes de chevilles. */
const WEATHERED = ['^', '*', '%', '&', '@'];
const tone = (i: number) => WEATHERED[Math.max(0, Math.min(WEATHERED.length - 1, i))];

/** Une planche de 25 cm : 5 px le long du faîtage. Deux épaisseurs à joints croisés : une planche du dessus sur deux. */
const BOARD = 5;

/** Une planche du pan : son fil (tirets [période, longueur, décalage] par colonne), un nœud, une teinte un peu plus vieille. */
interface Board { grain: [number, number, number][]; knot?: number; old: boolean }

function boardsOf(seed: number, count: number, slope: number): Board[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => ({
    grain: Array.from({ length: BOARD }, () => [9 + Math.floor(r() * 7), 3 + Math.floor(r() * 3), Math.floor(r() * 20)] as [number, number, number]),
    // un nœud sur une planche sur trois ; pas de nœud sur une vue trop raccourcie (moins de 18 rangées : ils s'y entasseraient)
    knot: r() < 0.35 && slope >= 18 ? 6 + Math.floor(r() * (slope - 14)) : undefined,
    old: r() < 0.25,
  }));
}

/** Nombre de planches à tirer pour couvrir `px` pixels le long du faîtage (20 au moins : la cabane en tire 20). */
const boardCount = (px: number) => Math.max(20, Math.ceil(px / BOARD) + 1);

/** Rangées du dessus du pan vu de face (r0) : la référence de la longueur des tirets du fil. */
const faceSlope = (r: RoofDims) => (r.d + r.h) / PX - 3;

/**
 * Les rangées de chevilles le long de la pente, de 0 (rive basse) à n − 1 (faîtage) : près de la rive (3) et près du faîtage
 * (n − 4), et, sur un pan long (plus de 3 m de pente réelle), une rangée sur chaque panne intermédiaire (aux tiers), tant que la
 * vue n'est pas trop raccourcie pour la porter.
 */
function pegRows(r: RoofDims, n: number): number[] {
  const rows = [3, n - 4];
  if (Math.hypot(r.d, r.h) > 300 && n >= 30) rows.push(Math.round(n / 3), Math.round((2 * n) / 3));
  return rows;
}

/**
 * Teinte d'un point du dessus du pan : `u` le long du faîtage (1 au premier pixel dans le contour), `a` le long de la pente
 * (0 au bas, à la rive basse ; n − 1 au faîtage). `lit` : le pan tourné vers l'ouest ou le nord, un peu plus clair. `ref` : les
 * rangées de la pente vue de face (les tirets du fil raccourcissent avec la vue). `pegs` : les rangées des chevilles.
 * - Les planches du dessus (une sur deux) : leur bord côté lumière clair, leur bord côté ombre (leur épaisseur) sombre ; celles
 *   du dessous, entre elles, un cran plus sombres, et l'ombre de la planche du dessus sur leur premier pixel au pan à l'ombre.
 * - La rive basse : ses deux dernières rangées un cran plus sombres (le bout des planches mouillé) ; le faîtage : l'arête claire.
 * - Les têtes de chevilles : une par planche, sur chaque rangée de `pegs`.
 */
function roofTone(u: number, a: number, n: number, ref: number, pegs: number[], lit: boolean, boards: Board[]): string {
  const i = Math.floor((u - 1) / BOARD);
  const p = (u - 1) % BOARD;
  const b = boards[i % boards.length];
  const upper = i % 2 === 0;
  if (pegs.includes(a) && p === 2) return '@';
  if (a === n - 1) return p === BOARD - 1 && upper ? tone(3) : tone(lit ? 0 : 1);
  const eave = a < 2 ? 1 : 0;
  let k: number;
  if (upper) {
    if (p === 0) k = lit ? 0 : 1;
    else if (p === BOARD - 1) k = lit ? 3 : 4;
    else k = 1 + (b.old ? 1 : 0);
  } else {
    k = p === 0 && !lit ? 3 : 2;
  }
  if (p > 0 && p < BOARD - 1) {
    // le fil : des tirets le long de la planche, plus courts sur une pente raccourcie, jamais d'un seul pixel
    const [per, len, ph] = b.grain[p];
    const dash = Math.max(2, Math.round((len * n) / ref));
    if ((a + ph) % per < dash && p % 2 === (upper ? 0 : 1)) k += 1;
    if (b.knot !== undefined && (a === b.knot || a === b.knot + 1) && (p === 1 || p === 2)) k = Math.max(k, (upper ? 2 : 3));
  }
  return tone(k + eave);
}

/** Les joints du bout des planches (la tranche de la rive basse) : @ entre deux planches, le bois de bout à l'ombre (&). */
const endTone = (u: number) => ((u - 1) % BOARD === BOARD - 1 ? '@' : '&');

/** Pan de toit, rive basse au sud (r0) ou au nord (r2) : planches nord-sud, en colonnes. */
export function roofNS(r: RoofDims, low: 'south' | 'north', seed: number): Canvas {
  const W = r.w / PX;
  const lit = low === 'north';
  const ref = faceSlope(r);
  // rangées du dessus : la pente vue de face (r0), ou raccourcie (r2)
  const SLOPE = low === 'south' ? ref : (r.d - r.h) / PX - 1;
  const pegs = pegRows(r, SLOPE);
  const boards = boardsOf(seed, boardCount(W), SLOPE);
  const c = new Canvas(W, low === 'south' ? (r.d + r.h) / PX : r.d / PX);
  if (low === 'south') {
    // rangée 0 : le contour du faîtage ; 1 à SLOPE : le dessus (a = 0 en bas) ; puis la tranche de la rive basse, le contour
    for (let x = 0; x < W; x++) {
      c.set(x, 0, x === W - 1 ? 'o' : 'K');
      for (let y = 1; y <= SLOPE; y++) c.set(x, y, x === 0 ? 'K' : x === W - 1 ? 'o' : roofTone(x, SLOPE - y, SLOPE, ref, pegs, lit, boards));
      c.set(x, SLOPE + 1, x === 0 ? 'K' : x === W - 1 ? 'o' : endTone(x));
      c.set(x, SLOPE + 2, 'o');
    }
  } else {
    // rangée 0 : le contour de la rive basse (au nord, loin) ; 1 à SLOPE : le dessus (a = 0 en haut) ; puis le faîtage, contour
    for (let x = 0; x < W; x++) {
      c.set(x, 0, x === W - 1 ? 'o' : 'K');
      for (let y = 1; y <= SLOPE; y++) c.set(x, y, x === 0 ? 'K' : x === W - 1 ? 'o' : roofTone(x, y - 1, SLOPE, ref, pegs, lit, boards));
      c.set(x, SLOPE + 1, 'o');
    }
  }
  return c;
}

/**
 * Pan de toit, rive basse à l'ouest (r1) ou à l'est (r3) : planches est-ouest, le long de la pente. Le dessus monte de H px
 * de la rive basse au faîtage : chaque colonne est décalée vers le haut de sa hauteur (`top`), un parallélogramme.
 * Colonne de la rive basse : le contour, puis le bout des planches (en raccourci, un pixel) ; colonne du faîtage : l'arête, puis
 * le contour. En haut, le contour du bord nord (K) ; en bas, celui du bord sud (o), la tranche de la dernière planche.
 */
export function roofEW(r: RoofDims, low: 'west' | 'east', seed: number): Canvas {
  const W = r.d / PX;
  const D = r.w / PX;
  const H = r.h / PX;
  const lit = low === 'west';
  const SLOPE = W - 3; // colonnes du dessus, entre la colonne de contour et celle du bout des planches à la rive, et le contour au faîtage
  const ref = faceSlope(r);
  const pegs = pegRows(r, SLOPE);
  const boards = boardsOf(seed, boardCount(D), SLOPE);
  const c = new Canvas(W, D + H);
  for (let x = 0; x < W; x++) {
    const fromLow = low === 'west' ? x : W - 1 - x; // 0 à la rive basse, W − 1 au faîtage
    const top = H - Math.round((H * fromLow) / (W - 1));
    for (let u = 0; u < D; u++) {
      const y = top + u;
      let k: string;
      if (x === 0) k = 'K';
      else if (x === W - 1) k = 'o';
      else if (u === 0) k = 'K';
      else if (u === D - 1) k = 'o';
      else if (fromLow === 1) k = endTone(u);
      else k = roofTone(u, fromLow - 2, SLOPE, ref, pegs, lit, boards);
      c.set(x, y, k);
    }
  }
  return c;
}
