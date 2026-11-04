// ESSAI (chantier « maison du coq », hors jeu, jamais chargé par le jeu) : les pièces DE PIERRE de la maison du coq, une par une,
// pour la planche-catalogue que Grégoire valide avant tout (retour du 4 novembre 2026). Les pièces de bois, de fer, de verre, les
// meubles et les tentures sont dans art/proposals/coq-catalogue-bois*.ts (un autre dessinateur).
//
// Refaire les planches : npx tsx tools/essai-coq-catalogue-pierre.ts écrit .art-preview/coq-catalogue-pierre-1.png, -2, -3, -4
// et .art-preview/coq-catalogue-pierre.json (le gabarit de chaque vue : attendu, mesuré, OK).
//
// La source unique des pièces (clés, dimensions, masses, vues) : art/proposals/coq-catalogue-data.ts. Ici, rien que les dessins :
//   - `STONE_PIECES` : pour chaque clé, ses volumes (art/lib/volumes.ts) en px du jeu, la pièce posée au sol de x 0 à w (est-ouest),
//     y 0 à d (nord-sud), z 0 à h ; `pieceView(clé, r)` en tire la vue R0 à R3 (tournée d'un quart de tour à chaque fois, `rotQuads`)
//     rendue en objet (`renderPiece`, k = ½ : la face sud en vraie grandeur, le dessus raccourci de moitié ; docs/STYLE.md section 8),
//     avec son ombre portée ;
//   - les assemblages, vus comme le jeu montre un bâtiment (k = 1) : `wallSample` (le morceau de mur, cinq assises), `archAssembly`
//     (l'arc de la porte sur ses tableaux), `mantelAssembly` (le manteau de la cheminée de salle), `crossAssembly` (la croisée sans
//     vitrail ni volet) ;
//   - la lave : `lavePan` (un morceau de pan, nos laves de coq-pierre.ts à 45°) ; la lave seule est dans STONE_PIECES.
//
// Les matières : la palette et les teintes du calcaire taillé de art/proposals/coq-pierre.ts (COQ_PAL : ! + θ = λ ; ~), le même
// bloc que le moyen appareil validé (`ashlarWall`) : la face vue layée (stries du marteau taillant, une colonne sur trois, debout
// ou en biais selon le bloc), la ciselure (l'arête du haut et de gauche, un cran plus claire), le joint de chaux mince (;) dans les
// assemblages ; les lits et le dos, noyés dans le mur, plus bruts (le piqué de la pointe). Chaque face prend son ton de sa normale
// (la lumière en haut à gauche) : dessus +, face sud =, face tournée vers l'ouest θ, vers l'est λ. Le parement autour de l'arc et
// le pan de laves sont les fonctions validées elles-mêmes (`ashlarWall`, `laves`, `lavesRidge`), importées, jamais recopiées.

import type { Grid } from '../lib/canvas';
import {
  add, box, dash, dot, hash, part, polyPrism, renderPiece, rotQuads, unit, withGroundShadow,
  type Face, type Part, type Quad, type Rot, type Tex, type V3,
} from '../lib/volumes';
import { COQ_PAL, COURSE, laves, lavesRidge } from './coq-pierre';
import { withBays, type Bay } from './coq-baies';

export const PAL = COQ_PAL;

// =====================================================================================================================
// Les tons du calcaire taillé
// =====================================================================================================================

/** La rampe du calcaire taillé, du plus clair au plus sombre (COQ_PAL : θ et λ entre les crans de la rampe du monde). */
const RAMP = ['!', '+', 'θ', '=', 'λ', ';', '~'];
const shift = (k: string, n: number) => RAMP[Math.max(0, Math.min(RAMP.length - 1, RAMP.indexOf(k) + n))] ?? k;

/** La lumière, en haut à gauche (nord-ouest, au-dessus). */
const LIGHT = unit([-0.55, -0.45, 1]);

/** Le ton d'une face d'après sa normale (dans la vue) : dessus +, tournée vers l'ouest ou en pente au sud θ, face sud =, vers l'est λ. */
function toneOf(n: V3): string {
  const v = dot(n, LIGHT);
  return v >= 0.7 ? '+' : v >= 0 ? 'θ' : v >= -0.42 ? '=' : v >= -0.65 ? 'λ' : ';';
}

/**
 * La taille d'une face : `dressed` la face vue (layée, ciselée), `layed` layée sans ciselure (une face du dedans, un lit vu),
 * `joint` un joint montant (dressé, piqué fin), `bed` un lit (le dessus, piqué, l'arête sud au soleil), `rough` le dos noyé dans le
 * mur (dégrossi à la pointe : des plages plus sombres).
 */
export type Finish = 'dressed' | 'layed' | 'joint' | 'bed' | 'rough';

export interface StoneOpts {
  seed: number;
  /** La taille de chaque face, par son nom d'origine (avant rotation) ; les autres faces : `joint`. */
  finish?: Partial<Record<Face, Finish>>;
  /** Décalage du ton du bloc (−1 : un bloc plus clair, comme les blocs d'angle mieux dressés ; +1 : plus sombre). */
  tint?: number;
  /** Dans un assemblage : le joint de chaux (;) au bas et à droite de chaque face vue, au lieu du contour de l'objet. */
  wall?: boolean;
  /** Un détail par-dessus (le coq de la clef, la cuvette de l'évier) : un signe, ou undefined. */
  mark?: (i: number, j: number, c: { w: number; h: number; face: Face; n: V3 }) => string | undefined;
}

/** La matière d'une pierre taillée, face par face. */
export function stoneTex(o: StoneOpts): Tex {
  const seed = o.seed;
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), w = Math.round(c.w), h = Math.round(c.h);
    const m = o.mark?.(i, j, c);
    if (m) return m;
    const fin: Finish = o.finish?.[c.face] ?? (c.face === 'top' ? 'bed' : 'joint');
    let base = shift(toneOf(c.n), o.tint ?? 0);
    const vertical = Math.abs(c.n[2]) < 0.3;
    if (o.wall && vertical && (j === 0 || i === w - 1)) return ';';
    if (fin === 'bed') {
      if (c.face === 'top' && j === h - 1 && h > 1) return shift(base, -1);
      return dash(seed + 5, j, i, 0.3) ? shift(base, 1) : base;
    }
    if (fin === 'rough') {
      const r = hash(seed, i >> 1, j >> 1, 17);
      return r < 0.28 ? shift(base, 2) : r < 0.6 ? shift(base, 1) : base;
    }
    if (fin === 'joint') return dash(seed + 9, i, j, 0.3) ? shift(base, 1) : base;
    // dressed, layed : la ciselure (l'arête du haut et de gauche, un cran plus claire), le layage (des stries une colonne sur trois)
    const left = o.wall ? 0 : 1;
    if (fin === 'dressed' && (j === h - 1 || i === left) && w > 3) return shift(base, -1);
    const slant = hash(seed, 3) < 0.5;
    const lane = slant ? i + j : i;
    if (lane % 3 === 1 && dash(seed + 11, lane, j, 0.8)) base = shift(base, 1);
    return base;
  };
}

// =====================================================================================================================
// La géométrie : boîtes, prismes à section quelconque (faces nommées d'après leur normale), bouchons masqués
// =====================================================================================================================

/** Le point (a, b) est-il dans le polygone ? */
function inPoly(poly: [number, number][], a: number, b: number): boolean {
  let inside = false;
  for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
    const [xi, yi] = poly[i], [xk, yk] = poly[k];
    if ((yi > b) !== (yk > b) && a < ((xk - xi) * (b - yi)) / (yk - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Le nom d'une face d'après sa normale : top, S, N, E, W, ou `slope` (une pente), `edge` (un chanfrein debout), `under`. */
function faceOf(n: V3): Face {
  if (n[2] > 0.95) return 'top';
  if (n[2] < -0.95) return 'under';
  if (Math.abs(n[2]) < 0.05) {
    if (n[1] > 0.95) return 'S';
    if (n[1] < -0.95) return 'N';
    if (n[0] > 0.95) return 'E';
    if (n[0] < -0.95) return 'W';
    return 'edge';
  }
  return n[2] > 0 ? 'slope' : 'under';
}

const masked = (tex: Tex, inside: (s: number, t: number) => boolean): Tex => (s, t, c) => (inside(s, t) ? tex(s, t, c) : null);
const bboxOf = (pts: [number, number][]) => {
  const a = pts.map((p) => p[0]), b = pts.map((p) => p[1]);
  return { a0: Math.min(...a), a1: Math.max(...a), b0: Math.min(...b), b1: Math.max(...b) };
};

/** Le sens d'un polygone (aire signée > 0 : sens trigonométrique dans son plan (a, b)). */
const winding = (poly: [number, number][]) => Math.sign(poly.reduce((s, [a, b], i) => { const [c, d] = poly[(i + 1) % poly.length]; return s + a * d - c * b; }, 0)) || 1;

/** Un prisme le long de x (de x0 à x1), de section [y, z] : ses faces nommées, et ses deux bouts (ouest, est) au contour de la section. */
export function extrudeX(x0: number, x1: number, sec: [number, number][], p: Part, tex: Tex): Quad[] {
  const sg = winding(sec), out: Quad[] = [];
  for (let i = 0; i < sec.length; i++) {
    const [ya, za] = sec[i], [yb, zb] = sec[(i + 1) % sec.length];
    const n = unit([0, sg * (zb - za), -sg * (yb - ya)]);
    out.push({ o: [x0, ya, za], u: [x1 - x0, 0, 0], v: [0, yb - ya, zb - za], n, part: p, tex, face: faceOf(n) });
  }
  const { a0: y0, a1: y1, b0: z0, b1: z1 } = bboxOf(sec);
  out.push({ o: [x0, y0, z0], u: [0, y1 - y0, 0], v: [0, 0, z1 - z0], n: [-1, 0, 0], part: p, face: 'W', tex: masked(tex, (s, t) => inPoly(sec, y0 + s, z0 + t)) });
  out.push({ o: [x1, y1, z0], u: [0, y0 - y1, 0], v: [0, 0, z1 - z0], n: [1, 0, 0], part: p, face: 'E', tex: masked(tex, (s, t) => inPoly(sec, y1 - s, z0 + t)) });
  return out;
}

/** Un prisme le long de y (de y0 au nord à y1 au sud), de section [x, z] : ses faces nommées, et ses bouts nord et sud. */
export function extrudeY(y0: number, y1: number, sec: [number, number][], p: Part, tex: Tex): Quad[] {
  const sg = winding(sec), out: Quad[] = [];
  for (let i = 0; i < sec.length; i++) {
    const [xa, za] = sec[i], [xb, zb] = sec[(i + 1) % sec.length];
    const n = unit([sg * (zb - za), 0, -sg * (xb - xa)]);
    out.push({ o: [xa, y0, za], u: [xb - xa, 0, zb - za], v: [0, y1 - y0, 0], n, part: p, tex, face: faceOf(n) });
  }
  const { a0: x0, a1: x1, b0: z0, b1: z1 } = bboxOf(sec);
  out.push({ o: [x0, y1, z0], u: [x1 - x0, 0, 0], v: [0, 0, z1 - z0], n: [0, 1, 0], part: p, face: 'S', tex: masked(tex, (s, t) => inPoly(sec, x0 + s, z0 + t)) });
  out.push({ o: [x1, y0, z0], u: [x0 - x1, 0, 0], v: [0, 0, z1 - z0], n: [0, -1, 0], part: p, face: 'N', tex: masked(tex, (s, t) => inPoly(sec, x1 - s, z0 + t)) });
  return out;
}

/** Un prisme debout (de z0 à z1), d'empreinte [x, y] : ses faces debout (s de gauche à droite vu du dehors) et son dessus masqué. */
export function extrudeZ(z0: number, z1: number, poly: [number, number][], p: Part, tex: Tex): Quad[] {
  const sg = winding(poly), out: Quad[] = [];
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i], b = poly[(i + 1) % poly.length];
    const n = unit([sg * (b[1] - a[1]), -sg * (b[0] - a[0]), 0]);
    // s de gauche à droite vu du dehors : le long de n × z
    const right: V3 = [n[1], -n[0], 0];
    if ((b[0] - a[0]) * right[0] + (b[1] - a[1]) * right[1] < 0) [a, b] = [b, a];
    out.push({ o: [a[0], a[1], z0], u: [b[0] - a[0], b[1] - a[1], 0], v: [0, 0, z1 - z0], n, part: p, tex, face: faceOf(n) });
  }
  const { a0: x0, a1: x1, b0: y0, b1: y1 } = bboxOf(poly);
  out.push({ o: [x0, y0, z1], u: [x1 - x0, 0, 0], v: [0, y1 - y0, 0], n: [0, 0, 1], part: p, face: 'top', tex: masked(tex, (s, t) => inPoly(poly, x0 + s, y0 + t)) });
  return out;
}

/** Des volumes retournés d'est en ouest autour de x = m / 2 (la pièce de [0, m] reste en [0, m]) : la même pierre posée retournée. */
export const mirrorX = (qs: Quad[], m: number): Quad[] =>
  qs.map((q) => ({ ...q, o: [m - q.o[0], q.o[1], q.o[2]] as V3, u: [-q.u[0], q.u[1], q.u[2]] as V3, v: [-q.v[0], q.v[1], q.v[2]] as V3, n: [-q.n[0], q.n[1], q.n[2]] as V3 }));

/** Le coin nord-ouest-bas de la boîte de volumes. */
function minCorner(qs: Quad[]): V3 {
  const m: V3 = [Infinity, Infinity, Infinity];
  for (const q of qs) for (const p of [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)]) for (let k = 0; k < 3; k++) m[k] = Math.min(m[k], p[k]);
  return m;
}

/** Une pièce du catalogue posée dans un assemblage : tournée (r), retournée (`flip`), son coin nord-ouest-bas en (x, y, z). */
export function placeAt(key: string, x: number, y: number, z: number, r: Rot = 0, flip = false): Quad[] {
  const p = STONE_PIECES[key];
  let qs = p.quads({ wall: true });
  if (flip) qs = mirrorX(qs, p.w);
  qs = rotQuads(qs, r, [p.w / 2, p.d / 2]);
  const m = minCorner(qs);
  return moved(qs, [x - m[0], y - m[1], z - m[2]]);
}

/** Des volumes déplacés. */
export const moved = (qs: Quad[], d: V3): Quad[] => qs.map((q) => ({ ...q, o: add(q.o, d) }));

/** Des volumes tournés d'un angle `a` (radians) autour de l'axe nord-sud passant par (cx, cz) : un claveau à sa place dans l'arc. */
export function rotY(qs: Quad[], a: number, cx: number, cz: number): Quad[] {
  const c = Math.cos(a), s = Math.sin(a);
  const v = (p: V3): V3 => [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
  const pt = (p: V3): V3 => { const r = v([p[0] - cx, p[1], p[2] - cz]); return [r[0] + cx, r[1], r[2] + cz]; };
  return qs.map((q) => {
    const n = v(q.n);
    return { ...q, o: pt(q.o), u: v(q.u), v: v(q.v), n, face: q.face === 'S' || q.face === 'N' ? q.face : faceOf(n) };
  });
}

// =====================================================================================================================
// Les pièces
// =====================================================================================================================

/** Une pièce de pierre : sa part (le contour de l'objet : la teinte la plus sombre du calcaire en haut et à gauche). */
const P = (name: string) => part(name, 3, '~', 'full');

/** Une pièce : ses volumes (px du jeu), sa boîte (w, d : le centre des rotations), la matière à écrire sous elle. */
export interface StonePiece { quads: (o?: { wall?: boolean }) => Quad[]; w: number; d: number; matter: string }

const F_BLOCK = { S: 'dressed', N: 'rough', E: 'joint', W: 'joint', top: 'bed' } as const;
const F_THROUGH = { S: 'dressed', N: 'dressed', E: 'rough', W: 'rough', top: 'bed' } as const;

/** Un carreau de parement : la face sud layée et ciselée, le dos brut, les joints montants dressés. */
const carreau = (L: number, seed: number): StonePiece => ({
  w: L, d: 4, matter: 'calcaire layé et ciselé, lits et dos bruts',
  quads: (o) => box(0, L, 0, 4, 0, 6, P('carreau'), stoneTex({ seed, finish: F_BLOCK, wall: o?.wall })),
});

/** Le coq de la clef, en petit (4 × 4 px : la clef de 30 cm n'a que 4 px de face entre ses arêtes), tourné vers l'ouest. */
const COQ_SMALL = [
  '.+..',
  '!+.!',
  '.+!+',
  '.+.+',
];

/** La cuvette de l'évier vue de dessus (t du nord au sud) : le bord, le fond, les parois, la rigole du déversoir vers le nord. */
function sinkMark(i: number, j: number, c: { w: number; h: number; face: Face }): string | undefined {
  const w = Math.round(c.w), h = Math.round(c.h);
  if (c.face === 'top') {
    const inBasin = i >= 3 && i < w - 3 && j >= 3 && j < h - 2;
    const inSpout = i >= Math.floor(w / 2) - 1 && i <= Math.floor(w / 2) && j < 3;
    if (inSpout) return j === 0 ? '~' : ';';
    if (!inBasin) return undefined;
    // la paroi nord et ouest dans l'ombre (la lumière vient de là, elle éclaire la paroi d'en face), la paroi sud et est au jour
    if (j === 3 || i === 3) return ';';
    if (j === h - 3 || i === w - 4) return '+';
    return (i + j) % 5 === 0 ? 'λ' : '=';
  }
  if (c.face === 'N' && i >= Math.floor(w / 2) - 1 && i <= Math.floor(w / 2) && j >= Math.round(c.h) - 1) return '~';
  return undefined;
}

/** Le potager vu de dessus : deux réchauds (des trous de 20 cm, une grille de fer, la braise), vers le nord. */
function stoveMark(i: number, j: number, c: { w: number; h: number; face: Face }): string | undefined {
  if (c.face !== 'top') return undefined;
  for (const x0 of [4, 14]) {
    if (i >= x0 && i < x0 + 5 && j >= 2 && j < 6) {
      const e = i === x0 || i === x0 + 4 || j === 2 || j === 5;
      if (e) return j === 2 || i === x0 ? '~' : ';';
      return (i - x0) % 2 === 1 ? '_' : '"';
    }
  }
  return undefined;
}

/** La section du cordon (y du nord au sud, z) : 20 cm sur le mur, 10 cm de débord, le glacis dessus, le larmier dessous. */
const CORDON_SEC: [number, number][] = [[0, 0], [0, 4], [4, 4], [6, 3], [6, 1.6], [5, 1.6], [5, 0.8], [4.2, 0.8], [4.2, 0]];

/** Le quart de rond du corbeau : 20 cm dans le mur, 20 cm dehors, la console en ellipse sous le dessus. */
const CORBEL_SEC: [number, number][] = (() => {
  const out: [number, number][] = [[0, 0], [4, 0]];
  for (let k = 1; k <= 8; k++) { const a = (Math.PI / 2) * (1 - k / 8); out.push([4 + 4 * Math.cos(a), 6 - 6 * Math.sin(a)]); }
  out.push([8, 6], [0, 6]);
  return out;
})();

/** La console de hotte : 30 cm de haut, la gorge (un cavet) sous le dessus, le listel devant. */
const CONSOLE_SEC: [number, number][] = (() => {
  const out: [number, number][] = [[0, 0], [5, 0]];
  for (let k = 1; k <= 8; k++) { const a = Math.PI - (Math.PI / 2) * (k / 8); out.push([12 + 7 * Math.cos(a), 4.2 * Math.sin(a)]); }
  out.push([12, 6], [0, 6]);
  return out;
})();

/** L'arc de la porte : rayon de l'intrados (55 cm), épaisseur des claveaux (30 cm), l'angle du sommier, neuf pièces au-dessus. */
export const ARCH = { r: 11, ring: 6, springer: (10 * Math.PI) / 180, pieces: 9 };
const ARCH_STEP = (Math.PI - 2 * ARCH.springer) / ARCH.pieces;

/** La section d'un claveau (x, z), centrée, de l'intrados (z = r) à l'extrados ; `extra` : la clef, plus haute. */
function voussoirSec(extra = 0): [number, number][] {
  const h = ARCH_STEP / 2, { r, ring } = ARCH, R = r + ring;
  return [[-r * Math.sin(h), r * Math.cos(h)], [r * Math.sin(h), r * Math.cos(h)], [R * Math.sin(h), R * Math.cos(h) + extra], [-R * Math.sin(h), R * Math.cos(h) + extra]];
}
/** Un claveau posé au sol, son intrados en bas (z = 0) : la section relevée. */
const grounded = (sec: [number, number][]): [number, number][] => {
  const { a0, b0 } = bboxOf(sec);
  return sec.map(([x, z]) => [x - a0, z - b0]);
};

/** La section du sommier ouest (x, z) dans le repère de l'arc (centre en 0, naissance en z 0) : 6 px de haut, le lit du dessus en biais. */
function springerSec(): [number, number][] {
  const { r, ring, springer: a } = ARCH, R = r + ring;
  return [[-r - 8, -3], [-r, -3], [-r, 0], [-r * Math.cos(a), r * Math.sin(a)], [-R * Math.cos(a), R * Math.sin(a)], [-r - 8, R * Math.sin(a)]];
}

/** Le chanfrein de l'intrados d'un claveau (sur la face sud, la rangée du bas) : à l'ombre, tourné vers le bas. */
const intradosMark = (i: number, j: number, c: { w: number; h: number; face: Face }) => (c.face === 'S' && j === 1 && i > 0 && i < Math.round(c.w) - 1 ? ';' : undefined);

/** Le coq sur la face sud de la clef. */
function keyMark(i: number, j: number, c: { w: number; h: number; face: Face }): string | undefined {
  if (c.face !== 'S') return undefined;
  const h = Math.round(c.h), w = Math.round(c.w);
  const gx = i - Math.floor((w - 4) / 2), gy = h - 2 - j;
  const ch = COQ_SMALL[gy]?.[gx];
  if (ch && ch !== '.') return ch;
  if (gx >= 0 && gx < 4 && gy >= 0 && gy < 4) return ';';
  return intradosMark(i, j, c);
}

/** Le chanfrein le long du bas de la face sud d'un linteau, entre ses portées : une rangée au jour. */
const lintelMark = (bear: number) => (i: number, j: number, c: { w: number; h: number; face: Face }) =>
  c.face === 'S' && j === 1 && i >= bear && i < Math.round(c.w) - bear ? ';' : undefined;

/** Les pièces de pierre, par clé (art/proposals/coq-catalogue-data.ts). */
export const STONE_PIECES: Record<string, StonePiece> = {
  // ---------------- la pierre ----------------
  'ashlar-block-40': carreau(8, 41),
  'ashlar-block-60': carreau(12, 61),
  'ashlar-block-80': carreau(16, 81),
  'ashlar-header': {
    w: 6, d: 12, matter: 'calcaire layé et ciselé sur ses deux bouts',
    quads: (o) => box(0, 6, 0, 12, 0, 6, P('boutisse'), stoneTex({ seed: 31, finish: F_THROUGH, wall: o?.wall })),
  },
  'ashlar-quoin': {
    w: 12, d: 8, matter: 'calcaire layé et ciselé sur deux faces',
    quads: (o) => box(0, 12, 0, 8, 0, 6, P('angle'), stoneTex({ seed: 7, tint: -1, finish: { S: 'dressed', W: 'dressed', N: 'rough', E: 'joint', top: 'bed' }, wall: o?.wall })),
  },
  'ashlar-jamb': {
    w: 8, d: 12, matter: 'calcaire layé, ciselé, chanfreiné',
    // l'empreinte : le chanfrein de 5 cm à l'arête sud-est (dehors), la feuillure du volet (5 × 15 cm) à l'arête nord-est (dedans)
    quads: (o) => extrudeZ(0, 6, [[0, 0], [7, 0], [7, 3], [8, 3], [8, 11], [7, 12], [0, 12]], P('tableau'),
      stoneTex({ seed: 13, tint: -1, finish: { S: 'dressed', E: 'dressed', edge: 'layed', N: 'layed', W: 'joint', top: 'bed' }, wall: o?.wall })),
  },
  'ashlar-string-course': {
    w: 12, d: 6, matter: 'calcaire mouluré (glacis, larmier)',
    quads: () => extrudeX(0, 12, CORDON_SEC, P('cordon'), stoneTex({ seed: 23, finish: { S: 'dressed', slope: 'layed', N: 'rough', top: 'bed' } })),
  },
  'ashlar-corbel': {
    w: 6, d: 8, matter: 'calcaire taillé en quart de rond',
    quads: () => extrudeX(0, 6, CORBEL_SEC, P('corbeau'), stoneTex({ seed: 29, finish: { S: 'layed', under: 'layed', N: 'rough', top: 'bed' } })),
  },
  'ashlar-slope-block': {
    w: 12, d: 4, matter: 'calcaire layé, taillé à 45 degrés',
    quads: () => extrudeY(0, 4, [[0, 0], [12, 0], [12, 6], [6, 6]], P('biais'), stoneTex({ seed: 37, finish: { S: 'dressed', N: 'rough', slope: 'bed', E: 'joint', top: 'bed' } })),
  },
  'gable-coping': {
    w: 12, d: 14, matter: 'calcaire layé, larmiers dessous',
    // la dalle en dos d'âne, 5 cm de débord de chaque côté (le larmier : le petit ressaut dessous) ; à l'ouest, la feuillure où se
    // pose la dalle du dessus (le recouvrement) : la pièce n'est pas la même vue de l'est ou de l'ouest
    quads: () => {
      const sec = (dz: number): [number, number][] => [[0, 1], [0, 2 + dz], [7, 3 + dz], [14, 2 + dz], [14, 1], [13, 1], [13, 0], [1, 0], [1, 1]];
      const tex = stoneTex({ seed: 43, finish: { slope: 'layed', S: 'dressed', N: 'dressed', top: 'bed' } });
      return [...extrudeX(2, 12, sec(0), P('rampant'), tex), ...extrudeX(0, 2, sec(-1), P('rampant'), tex)];
    },
  },

  // ---------------- les sols ----------------
  'floor-flagstone': {
    w: 12, d: 8, matter: 'calcaire scié et layé',
    quads: () => box(0, 12, 0, 8, 0, 1.6, P('dalle'), stoneTex({ seed: 53, finish: { top: 'layed', S: 'joint' } })),
  },

  // ---------------- le toit ----------------
  'stone-slate': {
    w: 8, d: 10, matter: 'calcaire en dalle naturelle (lave), à sec',
    // une dalle irrégulière de 4 cm, percée près du haut (le nord) du trou de sa cheville ; les teintes des laves de coq-pierre.ts
    quads: () => {
      const outline: [number, number][] = [[0.6, 0.4], [3.2, 0], [6.6, 0.5], [8, 2.4], [7.6, 6.5], [8, 9.3], [5.2, 10], [2.1, 9.6], [0, 8.8], [0.4, 4.8], [0, 2.2]];
      const tex: Tex = (s, t, c) => {
        const i = Math.floor(s), j = Math.floor(t);
        if (c.face !== 'top') return j === 0 ? '?' : ')';
        if (i >= 3 && i <= 4 && j >= 1 && j <= 2) return '"'; // le trou de la cheville
        if (j >= Math.round(c.h) - 1) return '(';
        const r = hash(61, i >> 1, j >> 1);
        return r < 0.25 ? '?' : r < 0.55 ? ')' : '(';
      };
      return extrudeZ(0, 0.8, outline, part('lave', 3, '"', 'full'), tex);
    },
  },
  'ridge-stone': {
    w: 8, d: 12, matter: 'calcaire taillé en bâtière, layé',
    quads: () => extrudeX(0, 8, [[0, 0], [6, 4], [12, 0], [10, 0], [6, 2.6], [2, 0]], P('faitiere'), stoneTex({ seed: 67, finish: { slope: 'layed', top: 'bed' } })),
  },
  'dormer-pediment': {
    w: 24, d: 6, matter: 'calcaire layé, rampants moulurés',
    // le tympan triangulaire monolithe ; devant (au sud), les deux rampants en saillie de 5 cm, moulurés
    quads: () => {
      const core = extrudeY(0, 5, [[0, 0], [24, 0], [12, 14]], P('fronton'), stoneTex({ seed: 71, finish: { S: 'dressed', N: 'layed', slope: 'bed' } }));
      const band = extrudeY(5, 6, [[0, 0], [12, 14], [24, 0], [21, 0], [12, 10.5], [3, 0]], P('fronton'), stoneTex({ seed: 72, tint: -1, finish: { S: 'layed', slope: 'bed' } }));
      return [...core, ...band];
    },
  },

  // ---------------- l'escalier ----------------
  'stone-step': {
    w: 20, d: 6, matter: 'calcaire layé, nez arrondi',
    // le giron layé (on y marche), le nez arrondi au sud ; le bout ouest brut (pris dans le mur), le bout est dressé (il se voit)
    quads: () => extrudeX(0, 20, [[0, 0], [0, 3.8], [4.8, 3.8], [5.6, 3.4], [6, 2.6], [6, 0]], P('marche'),
      stoneTex({ seed: 79, finish: { top: 'layed', S: 'dressed', slope: 'layed', edge: 'layed', N: 'rough', W: 'rough', E: 'dressed' } })),
  },
  'stair-stringer-block': {
    w: 12, d: 4, matter: 'calcaire layé, entaillé en crémaillère',
    quads: () => extrudeY(0, 4, [[0, 0], [12, 0], [12, 3], [7, 3], [7, 6], [0, 6]], P('echiffre'), stoneTex({ seed: 83, finish: { S: 'dressed', N: 'rough', top: 'bed', E: 'joint', W: 'joint' } })),
  },

  // ---------------- les baies ----------------
  'window-sill': {
    w: 25, d: 6, matter: 'calcaire layé, glacis et larmier',
    // les portées (10 cm de chaque côté) à plat, prises dans les tableaux ; entre elles, le glacis et le larmier dessous
    quads: () => {
      const tex = stoneTex({ seed: 89, finish: { S: 'dressed', slope: 'layed', N: 'rough', top: 'bed' } });
      const sec: [number, number][] = [[0, 0], [0, 3], [1, 3], [6, 2.2], [6, 0.9], [5.2, 0.9], [5.2, 0]];
      return [...box(0, 2, 0, 6, 0, 3, P('appui'), tex), ...extrudeX(2, 23, sec, P('appui'), tex), ...box(23, 25, 0, 6, 0, 3, P('appui'), tex)];
    },
  },
  'window-lintel': {
    w: 29, d: 6, matter: 'calcaire layé et ciselé, chanfreiné',
    quads: (o) => box(0, 29, 0, 6, 0, 6, P('linteau'), stoneTex({ seed: 97, tint: -1, finish: { S: 'dressed', N: 'rough', top: 'bed' }, wall: o?.wall, mark: lintelMark(4) })),
  },
  'mullion-low': {
    w: 3, d: 4, matter: 'calcaire layé, chanfreiné',
    quads: () => box(0, 3, 0, 4, 0, 18, P('meneau'), stoneTex({ seed: 101, tint: -1, finish: { S: 'layed', N: 'layed', top: 'bed' } })),
  },
  'mullion-high': {
    w: 3, d: 4, matter: 'calcaire layé, chanfreiné',
    quads: () => box(0, 3, 0, 4, 0, 11, P('meneau'), stoneTex({ seed: 103, tint: -1, finish: { S: 'layed', N: 'layed', top: 'bed' } })),
  },
  transom: {
    w: 21, d: 4, matter: 'calcaire layé, chanfreiné',
    quads: () => box(0, 21, 0, 4, 0, 3, P('traverse'), stoneTex({ seed: 107, tint: -1, finish: { S: 'layed', N: 'layed', top: 'bed' }, mark: lintelMark(0) })),
  },
  'door-voussoir': {
    w: 6, d: 12, matter: 'calcaire layé, taillé en coin, chanfreiné',
    quads: (o) => extrudeY(0, 12, grounded(voussoirSec()), P('claveau'), stoneTex({ seed: 109, tint: -1, finish: { S: 'dressed', N: 'layed', top: 'bed' }, wall: o?.wall, mark: intradosMark })),
  },
  'door-keystone': {
    w: 6, d: 12, matter: 'calcaire layé, le coq sculpté en relief',
    quads: (o) => extrudeY(0, 12, grounded(voussoirSec(1)), P('clef'), stoneTex({ seed: 113, tint: -1, finish: { S: 'dressed', N: 'layed', top: 'bed' }, wall: o?.wall, mark: keyMark })),
  },
  'door-springer': {
    w: 8, d: 12, matter: 'calcaire layé, le premier lit en biais',
    quads: (o) => extrudeY(0, 12, grounded(springerSec()), P('sommier'), stoneTex({ seed: 127, tint: -1, finish: { S: 'dressed', N: 'layed', slope: 'bed', top: 'bed' }, wall: o?.wall })),
  },

  // ---------------- les refends ----------------
  'ashlar-header-40': {
    w: 6, d: 8, matter: 'calcaire layé et ciselé sur ses deux bouts',
    quads: (o) => box(0, 6, 0, 8, 0, 6, P('boutisse'), stoneTex({ seed: 131, finish: F_THROUGH, wall: o?.wall })),
  },

  // ---------------- les cheminées ----------------
  'fireplace-jamb': {
    w: 8, d: 10, matter: 'calcaire mouluré (chanfrein, socle)',
    // le fût chanfreiné à l'arête sud-est (vers le foyer), sur son socle de 15 cm à arêtes vives
    quads: (o) => {
      const tex = stoneTex({ seed: 137, tint: -1, finish: { S: 'dressed', E: 'layed', edge: 'layed', N: 'rough', W: 'layed', top: 'bed' }, wall: o?.wall });
      return [...box(0, 8, 0, 10, 0, 3, P('jambage'), tex), ...extrudeZ(3, 22, [[0, 0], [8, 0], [8, 8.4], [6.4, 10], [0, 10]], P('jambage'), tex)];
    },
  },
  'fireplace-console': {
    w: 8, d: 12, matter: 'calcaire mouluré (gorge, listel)',
    quads: (o) => extrudeX(0, 8, CONSOLE_SEC, P('console'), stoneTex({ seed: 139, tint: -1, finish: { S: 'dressed', under: 'layed', N: 'rough', top: 'bed' }, wall: o?.wall })),
  },
  'mantel-voussoir': {
    w: 6, d: 8, matter: 'calcaire layé, joints rayonnants',
    quads: (o) => extrudeY(0, 8, [[0.6, 0], [5.4, 0], [6, 8], [0, 8]], P('claveau'), stoneTex({ seed: 149, tint: -1, finish: { S: 'dressed', N: 'rough', top: 'bed' }, wall: o?.wall, mark: intradosMark })),
  },
  fireback: {
    w: 24, d: 2, matter: 'calcaire plein, layé (prend le feu)',
    quads: () => box(0, 24, 0, 2, 0, 20, P('contrecoeur'), stoneTex({ seed: 151, finish: { S: 'layed', N: 'rough', top: 'bed' } })),
  },
  'small-fireplace-jamb': {
    w: 6, d: 8, matter: 'calcaire layé, chanfreiné',
    quads: (o) => extrudeZ(0, 20, [[0, 0], [6, 0], [6, 6.8], [4.8, 8], [0, 8]], P('jambage'),
      stoneTex({ seed: 157, tint: -1, finish: { S: 'dressed', E: 'layed', edge: 'layed', N: 'rough', W: 'layed', top: 'bed' }, wall: o?.wall })),
  },
  'small-fireplace-lintel': {
    w: 32, d: 6, matter: 'calcaire layé et ciselé, chanfreiné',
    quads: (o) => box(0, 32, 0, 6, 0, 6, P('linteau'), stoneTex({ seed: 163, tint: -1, finish: { S: 'dressed', N: 'rough', top: 'bed' }, wall: o?.wall, mark: lintelMark(6) })),
  },
  'stone-sink': {
    w: 16, d: 10, matter: 'calcaire creusé en cuvette, layé',
    quads: () => box(0, 16, 0, 10, 0, 3, P('evier'), stoneTex({ seed: 167, finish: { S: 'dressed', N: 'rough', top: 'layed' }, mark: sinkMark })),
  },
  'stove-slab': {
    w: 24, d: 12, matter: 'calcaire layé, percé de deux réchauds',
    quads: () => box(0, 24, 0, 12, 0, 2.4, P('potager'), stoneTex({ seed: 173, finish: { S: 'dressed', N: 'rough', top: 'layed' }, mark: stoveMark })),
  },
};

/** La vue R0 à R3 d'une pièce, rendue en objet (k = ½), avec son ombre portée. */
export function pieceView(key: string, r: Rot): Grid {
  const p = STONE_PIECES[key];
  if (!p) throw new Error(`coq-catalogue-pierre : pas de dessin pour « ${key} »`);
  return withGroundShadow(renderPiece(rotQuads(p.quads(), r, [p.w / 2, p.d / 2]), { k: 0.5 }));
}

/**
 * La variante de la clef à la taille de la planche validée (coq-pierre-tapisserie.png : une clef de 50 × 50 cm où le coq de 40 ×
 * 30 cm tient) : la face sud est celle de l'arc validé (`withBays`, le coq de coq-baies.ts), prise à l'endroit de sa clef.
 */
export function keystoneWide(): Grid {
  const r = 11, bay: Bay = { s0: 0, s1: 2 * r, t0: 0, t1: 40, arch: true };
  const spring = 40 - r;
  const face = withBays(() => '=', [bay]);
  const plain = stoneTex({ seed: 113, tint: -1, finish: { S: 'dressed', N: 'layed', top: 'bed' } });
  const tex: Tex = (s, t, c) => {
    if (c.face !== 'S') return plain(s, t, c);
    const v = face(s + r - 5, t + spring + r - 1, { ...c, face: 'S' });
    return v ?? plain(s, t, c);
  };
  return withGroundShadow(renderPiece(box(0, 10, 0, 12, 0, 10, P('clef'), tex), { k: 0.5 }));
}

// =====================================================================================================================
// Les assemblages (vus comme le jeu montre un bâtiment : k = 1, la profondeur à l'échelle du sol)
// =====================================================================================================================

/** Une même part pour tout un assemblage : pas de contour entre les pièces, le joint de chaux (;) les sépare comme dans le mur. */
const WALL = part('mur', 1, '~', 'full');
const one = (qs: Quad[], p: Part = WALL): Quad[] => qs.map((q) => ({ ...q, part: p }));

/** Les assises du morceau de mur, du bas vers le haut : ce que chaque bloc est et la largeur de sa face (px). */
export type WallBlock = 'Q' | 'B' | 'C40' | 'C60' | 'C80' | 'T' | 'T60';
/**
 * Cinq assises de 30 cm sur 2,30 m : à l'ouest la chaîne d'angle en harpe (la pierre d'angle, 60 et 40 cm de face d'une assise à
 * l'autre), à l'est le bord d'une baie (la pierre de tableau, 40 et 60 cm de face : la même pierre tournée d'un quart de tour),
 * entre elles les carreaux de 40, 60 et 80 cm et une boutisse par assise (une tous les 1,20 m environ). Les joints debout sont
 * écartés de 20 cm au moins d'une assise à l'autre, sauf un de 10 cm (le système 30-40-60-80 ne permet pas mieux, voir le rapport).
 */
export const WALL_COURSES: WallBlock[][] = [
  ['Q', 'C40', 'B', 'C80', 'T'],
  ['Q', 'C80', 'B', 'T60'],
  ['Q', 'C40', 'B', 'C80', 'T'],
  ['Q', 'C80', 'B', 'T60'],
  ['Q', 'C60', 'B', 'C60', 'T'],
];
const FACE_W: Record<WallBlock, number> = { Q: 0, B: 6, C40: 8, C60: 12, C80: 16, T: 8, T60: 12 };
/** La pierre d'angle d'une assise : 60 cm de face (12) une assise sur deux, 40 (8) l'autre. */
const quoinW = (k: number) => (k % 2 === 0 ? 8 : 12);
export const WALL_W = 46, WALL_T = 12;

/** Ce que chaque bloc du morceau de mur occupe (x, largeur, assise), pour la légende posée par-dessus. */
export function wallLayout(): { kind: WallBlock; x: number; w: number; k: number }[] {
  const out: { kind: WallBlock; x: number; w: number; k: number }[] = [];
  WALL_COURSES.forEach((row, k) => {
    let x = 0;
    for (const b of row) { const w = b === 'Q' ? quoinW(k) : FACE_W[b]; out.push({ kind: b, x, w, k }); x += w; }
    if (x !== WALL_W) throw new Error(`coq-catalogue-pierre : l'assise ${k} fait ${x} px, pas ${WALL_W}`);
  });
  return out;
}

/** La fourrure (le blocage entre les deux parements, sur l'arase) : des moellons et du mortier. */
const fill: Tex = (s, t) => {
  const r = hash(211, Math.floor(s / 2), Math.floor(t / 2));
  return r < 0.3 ? ';' : r < 0.7 ? '=' : 'λ';
};

/**
 * Le morceau de mur : chaque bloc est la pièce du catalogue (sa matière, ses volumes) posée à sa place, une assise sur l'autre ;
 * l'arase montre la profondeur : la boutisse et la pierre de tableau traversent le mur, les carreaux n'en prennent que 20 cm,
 * de chaque côté, la fourrure entre eux. La pierre d'angle et la pierre de tableau d'une assise sur deux sont la même pierre
 * retournée (lit pour lit) et tournée d'un quart de tour : c'est ce qui met la grande face où était la petite.
 */
export function wallSample(): Quad[] {
  const q: Quad[] = [];
  for (const b of wallLayout()) {
    const z = b.k * COURSE, front = WALL_T - 4;
    if (b.kind === 'Q') {
      if (b.w === 12) {
        // 60 de face, 40 de retour à l'ouest ; derrière, un carreau de 60 du parement du dedans
        q.push(...placeAt('ashlar-quoin', 0, WALL_T - 8, z), ...placeAt('ashlar-block-60', 0, 0, z, 2));
      } else q.push(...placeAt('ashlar-quoin', 0, 0, z, 3, true)); // 40 de face, 60 de retour
      continue;
    }
    if (b.kind === 'B') { q.push(...placeAt('ashlar-header', b.x, 0, z)); continue; }
    if (b.kind === 'T') { q.push(...placeAt('ashlar-jamb', b.x, 0, z)); continue; }
    if (b.kind === 'T60') {
      // la pierre de tableau tournée : 60 de face, 40 de tableau ; derrière elle, un carreau de 60 du dedans
      q.push(...placeAt('ashlar-jamb', b.x, WALL_T - 8, z, 1, true), ...placeAt('ashlar-block-60', b.x, 0, z, 2));
      continue;
    }
    const key = { C40: 'ashlar-block-40', C60: 'ashlar-block-60', C80: 'ashlar-block-80' }[b.kind];
    q.push(...placeAt(key, b.x, front, z));
    // le parement du dedans (le dos du mur) et la fourrure entre les deux
    q.push(...placeAt(key, b.x, 0, z, 2));
    q.push(...box(b.x, b.x + b.w, 4, front, z, z + COURSE - 0.5, WALL, fill));
  }
  return one(q);
}

/** Le fond d'une baie, dans la pénombre (vu par le jour). */
const FOND = part('fond', 0, 'o', 'none');
const back = (x0: number, x1: number, y: number, z0: number, z1: number) => box(x0, x1, y - 1, y, z0, z1, FOND, () => 'o');

/** L'arc de la porte sur ses tableaux : cinq assises de pierres de tableau, les deux sommiers, huit claveaux et la clef au coq. */
export function archAssembly(): Quad[] {
  const { r } = ARCH, cx = 8 + r, spring = 5 * COURSE + 3, q: Quad[] = [], v: Quad[] = [];
  for (let k = 0; k < 5; k++) {
    // le tableau ouest (le chanfrein et la feuillure à l'est, vers le jour) et le tableau est (la même pierre, retournée)
    q.push(...placeAt('ashlar-jamb', cx - r - 8, 0, k * COURSE));
    q.push(...placeAt('ashlar-jamb', cx + r, 0, k * COURSE, 0, true));
  }
  const sp = extrudeY(0, 12, springerSec(), P('sommier'), stoneTex({ seed: 127, tint: -1, finish: { S: 'dressed', N: 'layed', slope: 'bed', top: 'bed' }, wall: true }));
  q.push(...moved(sp, [cx, 0, spring]), ...moved(mirrorX(sp, 0), [cx, 0, spring]));
  for (let n = 0; n < ARCH.pieces; n++) {
    const key = n === Math.floor(ARCH.pieces / 2);
    const tex = stoneTex({ seed: 109 + n, tint: -1, finish: { S: 'dressed', N: 'layed', top: 'bed' }, wall: true, mark: key ? keyMark : intradosMark });
    const a = Math.PI / 2 - ARCH.springer - (n + 0.5) * ARCH_STEP;
    v.push(...rotY(moved(extrudeY(0, 12, voussoirSec(key ? 1 : 0), part(`claveau-${n}`, 3 + (n % 2), ';', 'full'), tex), [cx, 0, spring]), a, cx, spring));
  }
  // les claveaux gardent chacun leur part (une priorité sur deux) : leurs joints rayonnants se voient comme un contour mince
  return [...one(q), ...v, ...back(cx - r, cx + r, 0, 0, spring + r)];
}

/** Le manteau de la cheminée de salle : deux jambages, leurs consoles, les huit claveaux en plate-bande, le contrecœur au fond. */
export function mantelAssembly(): Quad[] {
  const q: Quad[] = [
    ...placeAt('fireplace-jamb', 0, 2, 0), ...placeAt('fireplace-jamb', 40, 2, 0, 0, true),
    ...placeAt('fireplace-console', 0, 0, 22), ...placeAt('fireplace-console', 40, 0, 22),
    ...placeAt('fireback', 12, 0, 0),
  ];
  // la plate-bande : les joints rayonnent vers un point sous le manteau ; les deux bouts debout, sur les consoles
  const cx = 24, top = 8, z0 = 28, k = 0.82, v: Quad[] = [];
  for (let n = 0; n < 8; n++) {
    const xt0 = n * 6, xt1 = (n + 1) * 6;
    const xb0 = n === 0 ? 0 : cx + (xt0 - cx) * k, xb1 = n === 7 ? 48 : cx + (xt1 - cx) * k;
    const sec: [number, number][] = [[xb0, 0], [xb1, 0], [xt1, top], [xt0, top]];
    const tex = stoneTex({ seed: 149 + n, tint: -1, finish: { S: 'dressed', N: 'rough', top: 'bed' }, wall: true, mark: intradosMark });
    v.push(...moved(extrudeY(4, 12, sec, part(`claveau-${n}`, 3 + (n % 2), ';', 'full'), tex), [0, 0, z0]));
  }
  return [...one(q), ...v, ...back(8, 40, 0, 0, 28)];
}

/** La croisée sans vitrail ni volet : l'appui, les meneaux, la traverse, le linteau, sur deux piles de tableaux. */
export function crossAssembly(): Quad[] {
  const X = 8, q: Quad[] = []; // X : le bord ouest du jour
  for (let k = 0; k < 6; k++) {
    q.push(...placeAt('ashlar-jamb', X - 8, 0, k * COURSE - 1), ...placeAt('ashlar-jamb', X + 21, 0, k * COURSE - 1, 0, true));
  }
  q.push(
    ...placeAt('window-sill', X - 2, 7, 0), ...placeAt('mullion-low', X + 9, 8, 3), ...placeAt('transom', X, 8, 21),
    ...placeAt('mullion-high', X + 9, 8, 24), ...placeAt('window-lintel', X - 4, 6, 35),
  );
  return [...one(q), ...back(X, X + 21, 6, 3, 35)];
}

// =====================================================================================================================
// La lave
// =====================================================================================================================

const ROOF = part('laves', 2, '"', 'full');
const RIDGE = part('faitage', 3, '?', 'full');

/** Un morceau de pan de NOS laves (coq-pierre.ts), 2 m de large, 1,50 m le long de la pente, à 45°, et son faîtage de pierre. */
export function lavePan(): Quad[] {
  const W = 40, L = 30, d = L / Math.SQRT2, Y0 = 40, Z0 = 4, Yr = Y0 - d, Zr = Z0 + d;
  const slope: Quad = { o: [0, Y0, Z0], u: [W, 0, 0], v: [0, -d, d], n: [0, Math.SQRT1_2, Math.SQRT1_2], part: ROOF, tex: laves(5), face: 'slope' };
  const eave: Quad = { o: [0, Y0, Z0 - 3], u: [W, 0, 0], v: [0, 0, 3], n: [0, 1, 0], part: ROOF, tex: laves(5), face: 'edge' };
  const ridge = polyPrism(0, W, [[Yr + 2.5, Zr - 2.5], [Yr + 1.5, Zr + 1.5], [Yr - 1.5, Zr + 1.5], [Yr - 2.5, Zr - 2.5]], RIDGE, lavesRidge());
  return [slope, eave, ...ridge];
}
