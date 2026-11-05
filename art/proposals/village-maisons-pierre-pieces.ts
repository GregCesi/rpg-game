// PROPOSITION (hors jeu, jamais chargée par le jeu) : les pièces nouvelles des maisons de pierre du village (CADRAGE-village.md,
// section 3.2 : h2, h8, h9, h10), chacune son modèle en volumes (art/lib/volumes.ts), en px du jeu (5 cm), posée au sol de x 0 à W
// (est-ouest), y 0 à D (nord-sud), z 0 à H ; ses vues R0 à R3 en sont tirées (un quart de tour de plus dans le sens des aiguilles
// d'une montre à chaque fois, docs/STYLE.md section 8), rendues comme le jeu : un meuble avec le dessus raccourci de moitié et son
// ombre portée (`renderPiece`, k = ½), une pièce de bâtiment qui relie des appuis au sol avec sa profondeur à l'échelle du sol
// (`ground`, k = 1). Les maisons (art/proposals/village-maisons-pierre.ts) posent ces mêmes modèles dans leurs scènes.
//
// Copié de maison-coq:art/proposals/coq-catalogue-pierre.ts : `extrudeX` (un prisme de section quelconque, ses bouts au contour de
// la section) et ses aides (`inPoly`, `faceOf`, `masked`, `bboxOf`, `winding`). Copié de maison-coq:art/proposals/coq-maison.ts :
// le pétrin, la chaise à haut dossier, l'écritoire (le catalogue du coq, validé ; le meunier et le maquignon s'en servent), rendus
// tels quels (`kneadingTrough`, `highChair`, `writingDesk`), avec leurs matières (`panelWood`, et le bois des meubles).

import type { Grid } from '../lib/canvas';
import {
  box, daub, dash, hash, part, polyPrism, prism, renderPiece, rotQuads, timber, unit, withGroundShadow,
  type Face, type Part, type Quad, type Rot, type Tex, type V3,
} from '../lib/volumes';
import type { HouseId, Img, VillagePiece } from './village-types';
import {
  boards, furnWood, ironTex, laves, lavesRidge, limeMasonry, oiledCloth, palette, rendered, rubble, shingles,
} from './village-maisons-pierre-matieres';

// =====================================================================================================================
// La géométrie (copiée de coq-catalogue-pierre.ts)
// =====================================================================================================================

function inPoly(poly: [number, number][], a: number, b: number): boolean {
  let inside = false;
  for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
    const [xi, yi] = poly[i], [xk, yk] = poly[k];
    if ((yi > b) !== (yk > b) && a < ((xk - xi) * (b - yi)) / (yk - yi) + xi) inside = !inside;
  }
  return inside;
}
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
const winding = (poly: [number, number][]) => Math.sign(poly.reduce((s, [a, b], i) => { const [c, d] = poly[(i + 1) % poly.length]; return s + a * d - c * b; }, 0)) || 1;

/** Un prisme le long de x (de x0 à x1), de section [y, z] : ses faces nommées, et ses deux bouts (ouest, est). */
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

/** Des volumes déplacés ; leurs matières lisent toujours le point dans le repère d'origine. */
export function moved(qs: Quad[], [dx, dy, dz]: V3): Quad[] {
  return qs.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2] + dz] as V3, tex: (s, t, c) => q.tex(s, t, { ...c, p: [c.p[0] - dx, c.p[1] - dy, c.p[2] - dz] }) }));
}
/** Des volumes tournés d'un quart de tour `r` (sens du jeu : R1 un quart de tour dans le sens des aiguilles d'une montre) autour du centre de leur boîte w × d, puis reposés en (0, 0). */
export function turned(qs: Quad[], view: number, w: number, d: number): Quad[] {
  const r = VIEW_ROT[((view % 4) + 4) % 4];
  const rq = rotQuads(qs, r, [w / 2, d / 2]);
  // la boîte tournée : w × d ou d × w, recalée au coin (0, 0)
  const odd = view % 2 === 1, W = odd ? d : w, D = odd ? w : d;
  const dx = (W - w) / 2, dy = (D - d) / 2;
  return rq.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2]] as V3 }));
}

/** Les vues du jeu (r0 à r3) dans les rotations du modèle (art/proposals/forge.ts, art/world/chimney.ts). */
const VIEW_ROT: Rot[] = [0, 3, 2, 1];

// =====================================================================================================================
// Les pièces
// =====================================================================================================================

const P = (name: string, prio = 3, dark = 'K', outline: 'full' | 'thin' | 'none' = 'full') => part(name, prio, dark, outline);
const WOOD = (seed: number) => furnWood(seed);

/** Une pièce : son modèle (px, posée de 0 à w, 0 à d), sa boîte, ses vues, sa sorte (meuble ou pièce de bâtiment). */
export interface PieceModel {
  key: string;
  name: string;
  dims: { w: number; d: number; h: number };
  houses: HouseId[];
  /** 1 (ronde), 2 (symétrique : R0, R1) ou 4 vues. */
  views: 1 | 2 | 4;
  /** Pièce de bâtiment qui relie des appuis au sol (`ground` : la profondeur à l'échelle du sol, k = 1), sinon un meuble (k = ½). */
  ground: boolean;
  /** Ce que la planche écrit sous la pièce (matière, ce qui la distingue). */
  note: string;
  model(): Quad[];
}

// ---------- h2 : le châssis de toile huilée, le métier à tisser, le dévidoir ----------

/** Le châssis de toile huilée, 120 × 5 × 80 cm (24 × 1 × 16) : son cadre, ses six carreaux de toile ; le revers, la même toile. */
export const oiledClothModel = (): Quad[] => {
  const f = oiledCloth(24, 16);
  const tex: Tex = (s, t, c) => (c.face === 'S' ? f(s, t) : c.face === 'N' ? f(23.99 - s, t) : c.face === 'top' ? '^' : '%');
  return box(0, 24, 0, 1, 0, 16, P('châssis', 3, '&'), tex);
};

/**
 * Le métier à tisser à pédales, 180 × 150 × 160 cm (36 × 30 × 32) : quatre montants et le chapeau, l'ensouple de chaîne au nord,
 * la poitrinière et l'ensouple d'étoffe au sud, la chaîne tendue entre elles (des fils écrus et bleus), l'étoffe tissée (la guède
 * à carreaux), les lames de lisses au milieu, le battant pendu au chapeau, trois marches au sol ; le banc du tisserand au sud.
 */
export const loomModel = (): Quad[] => {
  const Q: Quad[] = [], w = WOOD(5);
  const post = P('montant', 4);
  for (const [x, y] of [[0, 0], [34, 0], [0, 22], [34, 22]]) Q.push(...box(x, x + 2, y, y + 2, 0, 32, post, w));
  // le chapeau : deux longerons et deux traverses
  for (const x of [0, 34]) Q.push(...box(x, x + 2, 0, 24, 30, 32, P('chapeau', 5), w));
  for (const y of [0, 11]) Q.push(...box(2, 34, y, y + 2, 30, 32, P('chapeau', 5), w));
  // l'ensouple de chaîne (au nord), la poitrinière (au sud), l'ensouple d'étoffe dessous, enroulée de toile bleue
  Q.push(...box(2, 34, 2, 5, 14, 17, P('ensouple', 4), (_s, t, c) => (c.face === 'top' ? 'a' : t > 1.5 ? 'd' : 'D')));
  Q.push(...box(2, 34, 21, 23, 16, 18, P('poitrinière', 4), w));
  Q.push(...box(2, 34, 20, 23, 7, 11, P('étoffe', 4), (s, t, c) => (c.face === 'top' ? 'α' : Math.floor(s) % 4 === 0 ? 'γ' : t > 2 ? 'α' : 'β')));
  // la chaîne : les fils tendus de l'ensouple aux lisses (écrus et bleus), l'étoffe déjà tissée des lisses à la poitrinière
  Q.push({
    o: [4, 5, 16.5], u: [28, 0, 0], v: [0, 16, 0], n: [0, 0, 1], part: P('chaîne', 2, 'D', 'none'), face: 'top',
    tex: (s, t) => {
      const i = Math.floor(s), j = Math.floor(t);
      if (j >= 9) return (i + j) % 4 < 2 ? 'β' : (j % 3 === 0 ? 'a' : 'α'); // l'étoffe tissée, à carreaux
      return i % 2 === 0 ? (i % 6 === 0 ? 'β' : 'a') : null;
    },
  });
  // les lames de lisses : deux cadres pendus, leurs fils
  Q.push(...box(4, 32, 9, 11, 14, 24, P('lisses', 5, 'D', 'thin'), (s, t, c) => (c.face === 'top' ? '^' : Math.floor(t) === 0 || Math.floor(t) >= 9 ? '*' : Math.floor(s) % 2 ? 'D' : null)));
  Q.push(...box(15, 21, 11, 13, 24, 30, P('poulie', 5), w));
  // le battant : la masse (sa barre du bas, le peigne), ses deux épées pendues au chapeau
  Q.push(...box(3, 33, 16, 18, 15, 18, P('battant', 6), w));
  for (const x of [3, 31]) Q.push(...box(x, x + 2, 16, 17, 18, 30, P('épée', 6), w));
  // les trois marches au sol
  for (const x of [13, 17, 21]) Q.push(...box(x, x + 2, 8, 22, 1, 2, P('marche', 2), w));
  // le banc du tisserand, au sud
  Q.push(...box(8, 28, 25, 30, 8, 9.5, P('banc', 4), w));
  for (const x of [9, 25]) Q.push(...box(x, x + 2, 26, 29, 0, 8, P('pied du banc', 3), w));
  return Q;
};

/** Le dévidoir, 50 × 50 × 110 cm (10 × 10 × 22) : le pied en croix, l'arbre, les quatre bras et leurs chevilles, l'écheveau écru. */
export const yarnWinderModel = (): Quad[] => {
  const Q: Quad[] = [], w = WOOD(9);
  Q.push(...box(0, 10, 4, 6, 0, 1.5, P('pied', 3), w), ...box(4, 6, 0, 10, 0, 1.5, P('pied', 3), w));
  Q.push(...box(4.3, 5.7, 4.3, 5.7, 1.5, 16, P('arbre', 4), w));
  Q.push(...box(0.5, 9.5, 4.5, 5.5, 15, 16, P('bras', 5), w), ...box(4.5, 5.5, 0.5, 9.5, 15, 16, P('bras', 5), w));
  const yarn = P('écheveau', 6, 'D', 'thin');
  const Y: Tex = (_s, t, c) => (c.face === 'top' ? 'a' : Math.floor(t) % 2 ? 'a' : 'd');
  for (const [x, y] of [[0.5, 4.5], [8.5, 4.5], [4.5, 0.5], [4.5, 8.5]]) Q.push(...box(x, x + 1, y, y + 1, 16, 21, P('cheville', 5), w));
  Q.push(...box(1, 9, 1, 1.6, 17, 20, yarn, Y), ...box(1, 9, 8.4, 9, 17, 20, yarn, Y));
  Q.push(...box(1, 1.6, 1.6, 8.4, 17, 20, yarn, Y), ...box(8.4, 9, 1.6, 8.4, 17, 20, yarn, Y));
  return Q;
};

// ---------- h8 : le mur enduit, l'escalier de bois, le porche, le mur de cour, l'écurie en appentis ----------

/** Un morceau de mur de moellons enduit à la chaux, 160 × 60 × 260 cm, ses deux têtes en pierre d'angle (le meunier). */
export const renderedWallModel = (): Quad[] => {
  const face = rendered(81, 32, ['left', 'right']), end = rendered(82, 12, ['left', 'right']);
  const tex: Tex = (s, t, c) => (c.face === 'top' ? (Math.floor(t) === Math.round(c.h) - 1 ? '!' : hash(3, Math.floor(s), Math.floor(t)) < 0.3 ? 'z' : 'r') : c.face === 'E' || c.face === 'W' ? end(s, t, c) : face(s, t, c));
  return box(0, 32, 0, 12, 0, 52, P('mur enduit', 2, '~'), tex);
};

/** L'escalier droit de bois, 90 × 300 × 285 cm (18 × 60 × 57) : deux limons, quatorze marches et leurs contremarches ouvertes ; il monte vers le nord. */
export const STAIR = { w: 18, d: 60, h: 57, n: 15 };
export const stairModel = (): Quad[] => {
  const Q: Quad[] = [], { w, d, h, n } = STAIR, run = d / n, rise = h / n, wood = WOOD(13);
  const ax = unit([0, -d, h]), e2 = unit([0, h, d]);
  for (const x of [1, w - 1]) Q.push(...prism([x, d, 1.5], [x, 0, h + 1.5], [1, 0, 0], e2, 2, 6, P('limon', 5), wood));
  void ax;
  for (let k = 1; k < n; k++) {
    const y1 = d - run * k + 0.5, z = rise * k;
    Q.push(...box(2, w - 2, y1 - run - 0.5, y1, z - 1, z, P('marche', 4), (s, t, c) => (c.face === 'top' ? (dash(13 + k, Math.floor(t), Math.floor(s), 0.3) ? '*' : '^') : c.face === 'S' ? '%' : '&')));
  }
  return Q;
};

/** Le porche charretier couvert de laves, 440 × 120 × 330 cm (88 × 24 × 66) : deux piles de pierre à la chaux, deux poutres, le toit de laves, deux battants. */
export const PORCH = { w: 88, d: 24, h: 66, pier: 10, open: 68, zBeam: 50 };
export const porchModel = (): Quad[] => {
  const Q: Quad[] = [], { w, d, pier, zBeam } = PORCH;
  const stone = P('pile', 2, '~');
  for (const x0 of [0, w - pier]) {
    const f = rubble(91 + x0, pier, zBeam, 'lime'), e = rubble(93 + x0, d, zBeam, 'lime');
    Q.push(...box(x0, x0 + pier, 0, d, 0, zBeam, stone, (s, t, c) => (c.face === 'top' ? '+' : c.face === 'E' || c.face === 'W' ? e(s, t, c) : f(s, t, c))));
  }
  for (const y of [1, d - 5]) Q.push(...box(0, w, y, y + 4, zBeam, zBeam + 4, P('poutre', 5), timber(7 + y)));
  // le toit de laves, deux pans au nord et au sud, faîte le long du porche
  const zE = zBeam + 4, run = d / 2 + 2, rise = PORCH.h - 2 - zE, s2 = 1 / Math.hypot(run, rise);
  const rp = part('laves', 9, '"', 'full', { roof: true });
  Q.push({ o: [-2, d + 2, zE], u: [w + 4, 0, 0], v: [0, -run, rise], n: [0, rise * s2, run * s2], part: rp, tex: laves(95), face: 'slope' });
  Q.push({ o: [-2, -2, zE], u: [w + 4, 0, 0], v: [0, run, rise], n: [0, -rise * s2, run * s2], part: rp, tex: laves(96), face: 'slope' });
  Q.push({ o: [-2, d + 2, zE - 2], u: [w + 4, 0, 0], v: [0, 0, 2], n: [0, 1, 0], part: rp, tex: laves(97), face: 'S' });
  Q.push({ o: [w + 2, -2, zE - 2], u: [-(w + 4), 0, 0], v: [0, 0, 2], n: [0, -1, 0], part: rp, tex: laves(98), face: 'N' });
  Q.push(...polyPrism(-2, w + 2, [[d / 2 + 3, zE + rise - 1], [d / 2 + 2, zE + rise + 2], [d / 2 - 2, zE + rise + 2], [d / 2 - 3, zE + rise - 1]], part('faîtage', 10, '~', 'full', { roof: true }), lavesRidge()));
  // les deux battants fermés : planches debout, deux traverses ; au revers, l'écharpe (la diagonale) qui les tient
  const leaf = (x0: number, x1: number, sd: number): Tex => {
    const front = boards(sd, 4, [8, 38]);
    return (s, t, c) => {
      if (c.face !== 'N') return front(s, t, c);
      const L = x1 - x0, k = (t - 8) / 30 * L;
      if (Math.abs(s - k) < 1.2 && t > 8 && t < 40) return '^';
      return front(s, t, c);
    };
  };
  const half = pier + PORCH.open / 2;
  Q.push(...box(pier, half, d / 2 - 0.5, d / 2 + 0.5, 1, zBeam - 2, P('battant', 4, '&'), leaf(pier, half, 31)));
  Q.push(...box(half, w - pier, d / 2 - 0.5, d / 2 + 0.5, 1, zBeam - 2, P('battant', 4, '&'), leaf(half, w - pier, 37)));
  return Q;
};

/** Un morceau de mur de cour, 160 × 50 × 220 cm (32 × 10 × 44) : pierre brute à la chaux, 2 m, le chaperon de laves en bâtière. */
export const courtyardWallModel = (L = 32, seed = 101): Quad[] => {
  const f = rubble(seed, L, 40, 'lime'), e = rubble(seed + 1, 10, 40, 'lime');
  const Q = box(0, L, 0, 10, 0, 40, P('mur de cour', 2, '~'), (s, t, c) => (c.face === 'top' ? '+' : c.face === 'E' || c.face === 'W' ? e(s, t, c) : f(s, t, c)));
  Q.push(...extrudeX(0, L, [[-1, 40], [11, 40], [11, 41], [5, 44], [-1, 41]], P('chaperon', 4, '"'), (s, t, c) => (c.face === 'slope' ? laves(seed + 3)(s, t, c) : c.face === 'S' || c.face === 'N' ? '?' : ')')));
  return Q;
};

/**
 * L'écurie en appentis contre le mur de cour, 640 × 350 × 420 cm (128 × 70 × 84) : son mur du fond monté plus haut que la cour
 * (4 m, la pierre de la cour), quatre poteaux sur leurs dés et la sablière au sud, le pan de bardeaux à 26°, ses joues de planches à
 * l'est et à l'ouest, la mangeoire et le râtelier le long du fond.
 */
export const LEAN = { w: 128, d: 70, h: 84, back: 80, front: 48 };
export const leanToModel = (): Quad[] => {
  const Q: Quad[] = [], { w, back, front } = LEAN, wood = WOOD(21);
  const f = rubble(111, w, back, 'lime');
  Q.push(...box(0, w, 0, 10, 0, back, P('mur du fond', 2, '~'), (s, t, c) => (c.face === 'top' ? '+' : f(s, t, c))));
  for (const x of [0, 41, 84, 125]) {
    Q.push(...box(x - 0.5, x + 3.5, 59, 65, 0, 2, P('dé', 3, '~'), (_s, t, c) => (c.face === 'top' ? '+' : t > 1 ? '=' : ';')));
    Q.push(...box(x, x + 3, 60, 64, 2, front, P('poteau', 5), timber(30 + x)));
  }
  Q.push(...box(0, w, 60, 64, front, front + 4, P('sablière', 6), timber(29)));
  // le pan de bardeaux, du haut du mur du fond à 50 cm au-delà de la sablière
  const zB = back + 4, zF = front + 2, run = 70, rise = zB - zF, s2 = 1 / Math.hypot(run, rise);
  const rp = part('bardeaux', 9, '&', 'full', { roof: true });
  Q.push({ o: [-2, 70, zF], u: [w + 4, 0, 0], v: [0, -run, rise], n: [0, rise * s2, run * s2], part: rp, tex: shingles((run + rise) / Math.hypot(run, rise), 431), face: 'slope' });
  Q.push({ o: [-2, 70, zF - 1.5], u: [w + 4, 0, 0], v: [0, 0, 1.5], n: [0, 1, 0], part: rp, tex: () => '&', face: 'S' });
  // les joues de planches à l'ouest et à l'est (sous le pan)
  const cheek = P('joue', 4, '&');
  for (const x of [0, w - 1]) Q.push(...box(x, x + 1, 10, 60, 2, front + 4, cheek, boards(40 + x, 4)));
  // la mangeoire et le râtelier, le long du mur du fond
  Q.push(...box(2, w - 2, 10, 18, 0, 18, P('mangeoire', 4), wood));
  Q.push(...box(2, w - 2, 10, 13, 22, 36, P('râtelier', 4, 'K', 'thin'), (s, t, c) => (c.face === 'top' ? '^' : Math.floor(s) % 3 === 0 || Math.floor(t) === 0 || Math.floor(t) >= 13 ? '*' : 'T')));
  return Q;
};

// ---------- h9 : la porte à pentures, la grille, la souche au pignon, l'anneau, le grattoir, la girouette, la cloison, la chaise ----------

/**
 * La porte à pentures de fer forgé, 90 × 5 × 180 cm (18 × 1 × 36) : quatre planches debout, deux pentures qui partent des gonds à
 * l'ouest et finissent en volutes (la réclame du forgeron), leurs clous, l'anneau de tirage et l'entrée de serrure ; au revers, les
 * traverses et l'écharpe.
 */
export function strapDoorTex(seed = 3): Tex {
  const front = boards(seed, 4, []);
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), w = Math.round(c.w), h = Math.round(c.h);
    if (c.face === 'N') {
      if (j >= 7 && j <= 8) return j === 8 ? '^' : '%';
      if (j >= h - 9 && j <= h - 8) return j === h - 8 ? '^' : '%';
      const k = 8 + ((w - 1 - i) / w) * (h - 17);
      if (Math.abs(j - k) < 1 && j > 8 && j < h - 9) return '^';
      return front(s, t, c);
    }
    if (c.face !== 'S') return front(s, t, c);
    for (const sj of [7, h - 8]) {
      const e = 12;
      if (j === sj && i < e) return i === 0 ? '-' : '_';
      if (j === sj + 1 && i < e - 1 && i % 3 === 1) return '-'; // le haut de la penture au jour, les clous
      // la volute : deux crosses qui reviennent vers les gonds
      if ((i === e && (j === sj + 1 || j === sj - 1)) || (i === e + 1 && (j === sj + 2 || j === sj - 2)) || (i === e + 2 && (j === sj + 1 || j === sj - 1)) || (i === e + 2 && j === sj)) return i === e + 2 && j === sj ? '_' : '-';
    }
    // l'anneau de tirage et l'entrée de serrure, à 1 m
    if (i >= w - 5 && i <= w - 3 && j >= 18 && j <= 20) return (i === w - 4 && j === 19) ? front(s, t, c) : (j === 20 || i === w - 5 ? '-' : '_');
    if (i === w - 4 && j === 15) return '@';
    return front(s, t, c);
  };
}
export const strapDoorModel = (): Quad[] => box(0, 18, 0, 1, 0, 36, P('porte', 3, '&'), strapDoorTex());

/** La grille de fer de la fenêtre, 60 × 3 × 40 cm (12 × 1 × 8) : trois barreaux debout, une traverse, leurs bouts scellés. */
export const grilleModel = (): Quad[] => {
  const Q: Quad[] = [], I = P('fer', 4, '_', 'thin');
  for (const x of [2, 5.5, 9]) Q.push(...box(x, x + 1, 0, 1, 0, 8, I, ironTex));
  Q.push(...box(0, 12, 0, 1, 3.5, 4.5, I, ironTex));
  return Q;
};

/**
 * La souche maçonnée au pignon, 120 × 70 × 730 cm (24 × 14 × 146) : en R0 adossée à un mur au nord et saillante vers le sud. Le pied
 * (l'âtre est derrière, dans le mur) plus large jusqu'à 2,80 m, son glacis, puis le fût de 100 × 60 cm jusqu'à 7,20 m, la dalle de
 * couronnement et le noir du conduit ; moellons à la chaux rejointoyés clair (la forge à côté).
 */
export const GABLE_CHIMNEY = { w: 24, d: 14, h: 146, foot: 56, shaft: [2, 22] as [number, number], shaftD: 12 };
export const gableChimneyModel = (): Quad[] => {
  const Q: Quad[] = [], G = GABLE_CHIMNEY, M = P('souche', 6, '~');
  const both = () => [true, true] as [boolean, boolean];
  Q.push(...box(0, G.w, 0, G.d, 0, G.foot, M, limeMasonry(61, both)));
  Q.push(...extrudeX(0, G.w, [[0, G.foot], [G.d, G.foot], [G.shaftD, G.foot + 4], [0, G.foot + 4]], M, (s, t, c) => (c.face === 'slope' ? (Math.floor(s) % 6 === 0 ? '=' : '+') : limeMasonry(61, both)(s, t, c))));
  Q.push(...box(G.shaft[0], G.shaft[1], 0, G.shaftD, G.foot, G.h - 2, M, limeMasonry(63, both)));
  Q.push(...box(G.shaft[0] - 1, G.shaft[1] + 1, -1, G.shaftD + 1, G.h - 2, G.h, P('couronnement', 7, '~'), (_s, t, c) => (c.face === 'top' ? '+' : t > 1 ? '!' : ';')));
  Q.push(...box(G.shaft[0] + 4, G.shaft[1] - 4, 2, G.shaftD - 3, G.h, G.h + 0.01, P('conduit', 8, 'o', 'none'), () => 'o'));
  return Q;
};

/** L'anneau scellé (pour attacher un cheval à ferrer), 15 × 10 × 20 cm, agrandi au plancher de lisibilité : 6 × 4 × 8 px. */
export const ringModel = (): Quad[] => {
  const ring = ['.--.', '-..-', '-..-', '_.._', '.__.'];
  const Q = box(2, 4, 0, 1, 6, 8, P('piton', 4, '_'), ironTex);
  Q.push({ o: [1, 1.5, 0], u: [4, 0, 0], v: [0, 0, 6], n: [0, 1, 0], part: P('anneau', 5, '_', 'thin'), face: 'S', tex: (s, t) => { const k = ring[5 - Math.min(5, Math.floor(t))]?.[Math.floor(s)]; return !k || k === '.' ? null : k; } });
  return Q;
};

/** Le grattoir à bottes devant le seuil, 40 × 20 × 25 cm (8 × 4 × 5) : une pierre, deux pattes de fer, la lame. */
export const scraperModel = (): Quad[] => [
  ...box(0, 8, 0, 4, 0, 1.5, P('pierre', 3, '~'), (_s, t, c) => (c.face === 'top' ? '+' : t > 0.8 ? '=' : ';')),
  ...box(1, 2, 1.5, 2.5, 1.5, 5, P('patte', 4, '_', 'thin'), ironTex),
  ...box(6, 7, 1.5, 2.5, 1.5, 5, P('patte', 4, '_', 'thin'), ironTex),
  ...box(1, 7, 1.5, 2.5, 3, 4, P('lame', 5, '_', 'thin'), ironTex),
];

/** La girouette du faîte, 60 × 10 × 90 cm (12 × 2 × 18) : la tige, la flèche, le drapeau découpé d'un fer à cheval (le forgeron). */
export const vaneModel = (): Quad[] => {
  const flag = [
    '......-------',
    '......-_____-',
    '......-_.._.-',
    '......-_...-.',
    '......-__.-..',
    '......----...',
  ];
  const Q = box(5.5, 6.5, 0.5, 1.5, 0, 18, P('tige', 4, '_', 'thin'), ironTex);
  Q.push(...box(1, 11, 0.5, 1.5, 8, 9, P('flèche', 5, '_', 'thin'), ironTex));
  Q.push({ o: [0, 1, 7], u: [12, 0, 0], v: [0, 0, 3], n: [0, 1, 0], part: P('pointe', 5, '_', 'thin'), face: 'S', tex: (s, t) => { const i = Math.floor(s), j = Math.floor(t); return (i < 2 && Math.abs(j - 1) <= 1 - i * 0.5) || (i > 9 && j !== 1) ? '_' : null; } });
  Q.push({ o: [0, 1.2, 12], u: [13, 0, 0], v: [0, 0, 6], n: [0, 1, 0], part: P('drapeau', 6, '_', 'thin'), face: 'S', tex: (s, t) => { const k = flag[5 - Math.floor(t)]?.[Math.floor(s)]; return !k || k === '.' ? null : k; } });
  return Q;
};

/** La cloison de planches, 140 × 5 × 240 cm (28 × 1 × 48) : planches debout de 20 cm, la lisse basse et la lisse haute. */
export const partitionModel = (L = 28): Quad[] => box(0, L, 0, 1, 0, 48, P('cloison', 3, '&'), boards(15, 4, [1, 44]));

/** La chaise, 45 × 45 × 90 cm (9 × 9 × 18) : quatre pieds, le siège de planches à 45 cm, le dossier à deux barreaux au nord. */
export const chairModel = (): Quad[] => {
  const Q: Quad[] = [], w = WOOD(43);
  for (const [x, y] of [[0, 7.5], [7.5, 7.5]]) Q.push(...box(x, x + 1.5, y, y + 1.5, 0, 9, P('pied', 3), w));
  for (const x of [0, 7.5]) Q.push(...box(x, x + 1.5, 0, 1.5, 0, 18, P('montant', 4), w));
  Q.push(...box(0, 9, 0, 9, 8.5, 9.5, P('siège', 4), w));
  for (const z of [12, 16]) Q.push(...box(1.5, 7.5, 0.2, 1.2, z, z + 1.5, P('barreau', 5), w));
  return Q;
};

// ---------- h10 : le remplissage du colombage serré, la solive en saillie, le coffre ferré, la stalle, l'abreuvoir ----------

/** Le remplissage étroit du colombage serré, 60 × 15 × 200 cm (12 × 3 × 40) : torchis sur palançons, chaulé (la chaux de Xéros). */
export const closeStudModel = (seed = 7): Quad[] => box(0, 12, 0, 3, 0, 40, P('remplissage', 1, ';', 'none'), daub(seed, true));

/** La solive en saillie de l'encorbellement, 20 × 120 × 20 cm (4 × 24 × 4) : la poutre du jeu, son bout sud mouluré en console (le quart de rond sous elle). */
export const jettyJoistModel = (): Quad[] => {
  const sec: [number, number][] = [[0, 0], [20, 0], [21.5, 0.4], [22.8, 1.4], [23.7, 2.6], [24, 4], [0, 4]];
  const T = timber(71);
  return extrudeX(0, 4, sec, P('solive', 4), (s, t, c) => {
    if (c.face === 'E' || c.face === 'W') return c.face === 'W' ? '*' : '%';
    if (c.face === 'slope' || c.face === 'under') return '%';
    return T(s, t, c);
  });
};

/** Le coffre ferré du comptoir, 100 × 55 × 60 cm (20 × 11 × 12) : les bandes de fer, la serrure à moraillon, les poignées. */
export const ironChestModel = (): Quad[] => {
  const w = WOOD(51);
  const band = (s: number, W: number) => [2, Math.floor(W / 2), W - 3].includes(Math.floor(s));
  const tex: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return band(s, c.w) ? '-' : w(s, t, c);
    if (c.face === 'S') {
      if (i >= 8 && i <= 11 && j >= 6 && j <= 9) return i === 9 && j === 7 ? '@' : j === 9 || i === 8 ? '-' : '_';
      if (band(s, c.w) || j === 0) return j === 0 ? '_' : '-';
    }
    if ((c.face === 'E' || c.face === 'W') && j === 8 && i > 3 && i < 8) return '_';
    return w(s, t, c);
  };
  return box(0, 20, 0, 11, 0, 12, P('coffre', 3), tex);
};

/**
 * La stalle d'écurie, 160 × 320 × 140 cm (32 × 64 × 28) : en R0 la croupe du cheval vers le sud (le joueur). Le bat-flanc de planches
 * à l'ouest, plus bas vers le sud, son poteau au bout ; au nord, la mangeoire de planches et le râtelier où sèche le foin.
 */
export const stallModel = (): Quad[] => {
  const Q: Quad[] = [], wood = WOOD(61);
  // le bat-flanc : haut au nord (1,40 m), 1,10 m au sud
  Q.push(...extrudeYBoards(0, 2, 0, 62, (y) => 28 - (y / 62) * 6));
  Q.push(...box(0, 2, 62, 64, 0, 28, P('poteau', 5), timber(63)));
  Q.push(...box(2, 32, 0, 10, 0, 18, P('mangeoire', 4), wood));
  Q.push(...box(2, 32, 0, 3, 20, 28, P('râtelier', 4, 'K', 'thin'), (s, t, c) => (c.face === 'top' ? '^' : Math.floor(s) % 3 === 0 || Math.floor(t) === 0 || Math.floor(t) >= 7 ? '*' : 'T')));
  return Q;
};
/** Un bat-flanc de planches couchées (x0-x1 d'épaisseur, y0-y1 de long), son haut à `top(y)` : des planches de 25 cm le long de y. */
function extrudeYBoards(x0: number, x1: number, y0: number, y1: number, top: (y: number) => number): Quad[] {
  const sec: [number, number][] = [];
  for (let k = 0; k <= 8; k++) { const y = y0 + ((y1 - y0) * k) / 8; sec.push([y, top(y)]); }
  sec.push([y1, 0], [y0, 0]);
  const tex: Tex = (s, t, c) => {
    if (c.face === 'slope' || c.face === 'top') return '^';
    const j = Math.floor(t);
    if (j % 5 === 4) return '@';
    return c.face === 'E' ? (dash(5, j, Math.floor(s), 0.3) ? '&' : '%') : dash(5, j, Math.floor(s), 0.3) ? '%' : '*';
  };
  // le prisme le long de x, de section (y, z)
  return extrudeX(x0, x1, sec, P('bat-flanc', 4, '&'), tex);
}

/** L'abreuvoir de pierre, 200 × 60 × 60 cm (40 × 12 × 12) : une auge taillée d'un bloc, l'eau au ras du bord. */
export const troughModel = (): Quad[] => box(0, 40, 0, 12, 0, 12, P('abreuvoir', 3, '~'), (s, t, c) => {
  const i = Math.floor(s), j = Math.floor(t);
  if (c.face === 'top') {
    const inner = i >= 2 && i < Math.round(c.w) - 2 && j >= 2 && j < Math.round(c.h) - 2;
    if (!inner) return j === Math.round(c.h) - 1 ? '!' : '+';
    return j === Math.round(c.h) - 3 ? 'q' : hash(5, i >> 1, j) < 0.15 ? 'W' : 'w';
  }
  if (j === Math.round(c.h) - 1) return c.face === 'E' ? '=' : '!';
  const base = c.face === 'W' ? '+' : c.face === 'E' || c.face === 'N' ? ';' : '=';
  return hash(9, i, j, 3) < 0.16 ? (base === '+' ? '=' : ';') : base;
});

// =====================================================================================================================
// Copié de maison-coq:art/proposals/coq-maison.ts : le pétrin, la chaise à haut dossier, l'écritoire (catalogue du coq)
// =====================================================================================================================

const F = (n: string, prio = 2) => part(n, prio, '&', 'full');
function panelWood(): Tex {
  return (s, t, c) => {
    if (c.face === 'top') return '^';
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    if (i === 0 || j === h - 1) return '^';
    if (i === 1 || j === h - 2) return '%';
    return '*';
  };
}
function coqWood(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return dash(seed, j, i, 0.35) ? '*' : '^';
    if (c.face === 'E' || c.face === 'edge') return '%';
    return dash(seed, i, j, 0.3) ? '%' : '*';
  };
}
function furniture(quads: Quad[]): Grid {
  const g = renderPiece(quads, { k: 0.5 });
  const rows = g.map((r) => r + '.');
  const last = rows[rows.length - 1];
  return [...rows, [...('.' + last.slice(0, -1))].map((c) => (c === '.' ? '.' : 'x')).join('')];
}
/** Le pétrin du coq (150 × 60 × 80 cm), copié : la huche à pâte sur ses pieds, son couvercle de planches. */
export function kneadingTrough(): Grid {
  const Q: Quad[] = [], wood = coqWood(61);
  for (const x of [1, 26]) Q.push(...box(x, x + 3, 1, 11, 0, 8, F('pied'), wood));
  Q.push(...box(0, 30, 0, 12, 8, 15, F('huche', 2), { top: () => '^', side: (s, t, c) => (c.face === 'S' ? (Math.floor(s) % 10 === 0 ? '@' : t > 6 ? '^' : '*') : '%') }));
  Q.push(...box(-0.5, 30.5, -0.5, 12.5, 15, 16, F('couvercle', 3), { top: (_s, t) => (Math.floor(t) % 4 === 3 ? '%' : '^'), side: () => '%' }));
  return furniture(Q);
}
/** La chaise à haut dossier du coq (55 × 50 × 130 cm), copiée, tournée vers l'est : le dossier à l'ouest, le coussin rouge. */
export function highChair(): Grid {
  const Q: Quad[] = [], wood = coqWood(51);
  for (const [x, y] of [[0, 0], [9, 0], [0, 8], [9, 8]]) Q.push(...box(x, x + 2, y, y + 2, 0, 9, F('pied'), wood));
  Q.push(...box(0, 11, 0, 10, 8, 9.5, F('siège', 2), wood));
  Q.push(...box(1, 10, 1, 9, 9.5, 10.5, F('coussin', 3), { top: () => 'ρ', side: () => 'σ' }));
  Q.push(...box(0, 2, 0, 10, 9, 26, F('dossier', 4), { top: () => '^', side: (s, t, c) => (c.face === 'S' ? (t > 15 ? '^' : '*') : panelWood()(s, t, c)) }));
  for (const y of [0, 8]) Q.push(...box(0, 11, y, y + 2, 14, 15, F('accoudoir', 4), wood));
  return furniture(Q);
}
/** L'écritoire du coq (90 × 60 × 75 cm), copiée : la table, le pupitre incliné, les livres ; ici le livre de comptes du maquignon. */
export function writingDesk(): Grid {
  const Q: Quad[] = [], wood = coqWood(71);
  for (const x of [0, 16]) Q.push(...box(x, x + 2, 0, 12, 0, 14, F('pied'), wood));
  Q.push(...box(0, 18, 0, 12, 14, 15, F('plateau', 2), wood));
  Q.push(...polyPrism(1, 11, [[2, 15], [2, 18], [11, 15]], F('pupitre', 3), (s, t, c) => (c.n[2] > 0.5 ? (hash(2, Math.floor(s), Math.floor(t)) < 0.15 ? '*' : '^') : '%')));
  Q.push({ o: [3, 6, 16.6], u: [6, 0, 0], v: [0, -3, 1.5], n: unit([0, 1, 2]), part: F('feuille', 4), tex: () => 'a', face: 'slope' });
  const book = (x: number, y: number, z: number, w: number, d: number, h: number, c: string, sd: string) => Q.push(...box(x, x + w, y, y + d, z, z + h, F('livre', 4), { top: () => 'a', side: (s) => (s < 0.8 ? c : sd) }));
  book(12, 2, 15, 5, 4, 2, 'σ', 'τ'); book(12.5, 2.5, 17, 4, 3, 1.5, 'm', 'N'); book(12, 7, 15, 5, 4, 1.5, 'β', 'γ');
  return furniture(Q);
}

// =====================================================================================================================
// Le catalogue
// =====================================================================================================================

export const PIECE_MODELS: PieceModel[] = [
  { key: 'oiled-cloth-window', name: 'Châssis de toile huilée', dims: { w: 120, d: 5, h: 80 }, houses: ['h2-tisserand'], views: 2, ground: true, note: 'cadre de bois patiné, six carreaux de toile (trois teintes nouvelles)', model: oiledClothModel },
  { key: 'loom', name: 'Métier à tisser', dims: { w: 180, d: 150, h: 160 }, houses: ['h2-tisserand'], views: 4, ground: false, note: 'à pédales, la chaîne écrue et bleue, le banc au sud', model: loomModel },
  { key: 'yarn-winder', name: 'Dévidoir', dims: { w: 50, d: 50, h: 110 }, houses: ['h2-tisserand'], views: 1, ground: false, note: 'pied en croix, quatre bras, l\'écheveau', model: yarnWinderModel },
  { key: 'rendered-wall', name: 'Mur de moellons enduit', dims: { w: 160, d: 60, h: 260 }, houses: ['h8-meunier'], views: 2, ground: true, note: 'enduit de chaux, têtes en pierres d\'angle du coq', model: renderedWallModel },
  { key: 'wooden-stair', name: 'Escalier droit de bois', dims: { w: 90, d: 300, h: 285 }, houses: ['h8-meunier', 'h10-maquignon'], views: 4, ground: true, note: 'deux limons, 14 marches de 19 cm ; monte vers le nord', model: stairModel },
  { key: 'porch-gate', name: 'Porche charretier', dims: { w: 440, d: 120, h: 330 }, houses: ['h8-meunier'], views: 4, ground: true, note: 'piles à la chaux, toit de laves, deux battants', model: porchModel },
  { key: 'courtyard-wall', name: 'Mur de cour', dims: { w: 160, d: 50, h: 220 }, houses: ['h8-meunier'], views: 2, ground: true, note: 'pierre brute à la chaux, 2 m, chaperon de laves', model: () => courtyardWallModel() },
  { key: 'lean-to-stable', name: 'Écurie en appentis', dims: { w: 640, d: 350, h: 420 }, houses: ['h8-meunier'], views: 4, ground: true, note: 'mur du fond de 4 m, bardeaux, mangeoire et râtelier', model: leanToModel },
  { key: 'strap-door', name: 'Porte à pentures', dims: { w: 90, d: 5, h: 180 }, houses: ['h9-forgeron'], views: 4, ground: true, note: 'pentures en volutes, anneau, serrure ; écharpe au revers', model: strapDoorModel },
  { key: 'window-grille', name: 'Grille de fenêtre', dims: { w: 60, d: 3, h: 40 }, houses: ['h9-forgeron'], views: 2, ground: false, note: 'trois barreaux, une traverse', model: grilleModel },
  { key: 'gable-chimney', name: 'Souche au pignon', dims: { w: 120, d: 70, h: 730 }, houses: ['h9-forgeron'], views: 4, ground: true, note: 'moellons à la chaux, du sol au-dessus du faîte', model: gableChimneyModel },
  { key: 'tether-ring', name: 'Anneau scellé', dims: { w: 15, d: 10, h: 20 }, houses: ['h9-forgeron'], views: 2, ground: false, note: 'agrandi au plancher de lisibilité (6 px)', model: ringModel },
  { key: 'boot-scraper', name: 'Grattoir à bottes', dims: { w: 40, d: 20, h: 25 }, houses: ['h9-forgeron'], views: 2, ground: false, note: 'une pierre, une lame de fer', model: scraperModel },
  { key: 'weathervane', name: 'Girouette', dims: { w: 60, d: 10, h: 90 }, houses: ['h9-forgeron'], views: 2, ground: false, note: 'le drapeau découpé d\'un fer à cheval', model: vaneModel },
  { key: 'plank-partition', name: 'Cloison de planches', dims: { w: 140, d: 5, h: 240 }, houses: ['h9-forgeron'], views: 2, ground: true, note: 'planches debout, deux lisses', model: () => partitionModel() },
  { key: 'chair', name: 'Chaise', dims: { w: 45, d: 45, h: 90 }, houses: ['h9-forgeron', 'h10-maquignon'], views: 4, ground: false, note: 'dossier à deux barreaux au nord', model: chairModel },
  { key: 'close-stud-panel', name: 'Remplissage de colombage serré', dims: { w: 60, d: 15, h: 200 }, houses: ['h10-maquignon'], views: 2, ground: true, note: 'torchis chaulé entre poteaux à 80 cm', model: () => closeStudModel() },
  { key: 'jetty-joist', name: 'Solive d\'encorbellement', dims: { w: 20, d: 120, h: 20 }, houses: ['h10-maquignon'], views: 4, ground: true, note: 'le bout sud mouluré en console, 40 cm de saillie', model: jettyJoistModel },
  { key: 'iron-bound-chest', name: 'Coffre ferré', dims: { w: 100, d: 55, h: 60 }, houses: ['h10-maquignon'], views: 4, ground: false, note: 'bandes de fer, serrure à moraillon', model: ironChestModel },
  { key: 'horse-stall', name: 'Stalle d\'écurie', dims: { w: 160, d: 320, h: 140 }, houses: ['h10-maquignon'], views: 4, ground: true, note: 'bat-flanc, poteau, mangeoire, râtelier', model: stallModel },
  { key: 'water-trough', name: 'Abreuvoir', dims: { w: 200, d: 60, h: 60 }, houses: ['h10-maquignon'], views: 2, ground: false, note: 'auge de calcaire taillée d\'un bloc', model: troughModel },
];

const viewCache = new Map<string, Grid>();
/** La vue v (0 à 3) d'une pièce, rendue comme le jeu (meuble : dessus à ½ et ombre portée ; bâtiment : k = 1). */
export function pieceGrid(m: PieceModel, v: number): Grid {
  const key = `${m.key}:${v}`;
  let g = viewCache.get(key);
  if (!g) {
    const r = renderPiece(rotQuads(m.model(), VIEW_ROT[v % 4], [0, 0]), { k: m.ground ? 1 : 0.5 });
    g = m.ground ? r : withGroundShadow(r);
    viewCache.set(key, g);
  }
  return g;
}

/** Les pièces nouvelles, selon l'interface commune (art/proposals/village-types.ts). */
export const PIECES: VillagePiece[] = PIECE_MODELS.map((m) => ({
  key: m.key,
  name: m.name,
  dims: m.dims,
  houses: m.houses,
  views: (): Img[] => Array.from({ length: m.views }, (_, v) => ({ grid: pieceGrid(m, v), pal: palette })),
}));

export const pieceModel = (key: string): PieceModel => {
  const m = PIECE_MODELS.find((p) => p.key === key);
  if (!m) throw new Error(`village-maisons-pierre : pas de pièce « ${key} »`);
  return m;
};
