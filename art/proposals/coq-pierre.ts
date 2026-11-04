// ESSAI (chantier « maison du coq », hors jeu, jamais chargé par le jeu) : les matières de la pierre taillée de la maison du
// coq, pour le modèle en volumes (art/lib/volumes.ts) : des fonctions qui rendent un `Tex` (s vers la droite, t vers le haut sur
// la face, en px du jeu, 5 cm par pixel). Planche de détail : npx tsx tools/essai-coq-details.ts écrit
// .art-preview/coq-pierre-tapisserie.png.
//
// Le contrat (CADRAGE-coq.md section 4, la maison entière se bâtit dans art/proposals/coq-maison.ts) :
//   COQ_PAL, ashlarWall(seed), quoinWall(seed), stringCourse(), laves(seed), lavesRidge(), flagstones(seed), limePlaster(seed).
//
// Le parement en moyen appareil n'est pas de la brique : des assises réglées de 30 cm (6 px), des blocs de 50 à 90 cm (10 à 18 px)
// aux longueurs inégales, joints décalés d'au moins 15 cm d'une assise à l'autre, joints de chaux minces (1 px, l'ombre
// légère `;`, jamais la fissure `~`), la face layée (des stries de 1 px dans une teinte à peine plus sombre que la face, le sens
// change d'un bloc à l'autre), la ciselure (l'arête du haut et de gauche de chaque bloc, éclairée) et des blocs de valeurs
// voisines mais différentes (le calcaire d'une même carrière n'est jamais d'un seul ton).

import type { Palette } from '../lib/canvas';
import { hash, dash, type Ctx, type Tex } from '../lib/volumes';
import { stonePalette } from '../items/stones';
import { woad, woodAges } from '../palette';

/**
 * La palette de la maison du coq : le calcaire (`! + = ; ~`) et le monde (`stonePalette`), le bois travaillé à l'âge patiné
 * (la porte de chêne, les volets : `woodAges.worn`, le build tirerait les autres âges), et quelques signes propres à la maison,
 * libres dans cette palette (les signes du ciel `( ) < > ? / - _` ne servent qu'au cadran du temps ; les lettres grecques ne
 * servent nulle part ailleurs) :
 */
export const COQ_PAL: Palette = {
  ...stonePalette,
  ...woodAges.worn,
  // le calcaire taillé : deux teintes entre celles de la rampe, pour que les blocs varient sans sauter d'un cran entier
  'θ': '#cbc1aa', // bloc clair : entre + et = (un bloc pris plus haut dans le banc de la carrière)
  'λ': '#ada290', // layage : les stries du marteau taillant, entre = et ;, à peine visibles
  // les laves (lauzes de calcaire posées à sec) : le même calcaire, plus gris et plus sombre, lavé par la pluie et la mousse ;
  // la lumière glisse vers le jaune, l'ombre vers le brun-violet, comme la rampe du calcaire
  '(': '#a8a194', // lave au soleil
  ')': '#8a8379', // lave
  '?': '#6a625b', // lave à l'ombre, chant d'une lave
  '"': '#463d3e', // creux sous une lave, joint du faîtage
  // les vitraux : le plomb des losanges et le verre vert pâle du temps, vu du dehors (sombre, un reflet du ciel)
  '`': '#3f3c48', // plomb
  '>': '#61766f', // verre
  '<': '#a9bab0', // reflet du ciel sur le verre
  // le fer forgé (barreaux, heurtoir, clous, tringle) : un gris-brun froid, plus sombre que la pierre à l'ombre
  '-': '#6c6468', // fer éclairé
  '_': '#3a3239', // fer
  // la laine de la tapisserie et de la tenture : la guède délavée de la robe de la mère (art/palette.ts, `woad`)
  'α': woad.light,
  'β': woad.base,
  'γ': woad.shade,
  'δ': woad.deep,
  // la garance passée (le rouge de laine de la tenture, la crête du coq) : le rouge des fleurs `c`, éteint vers le brun
  'ρ': '#a5614f', // garance au jour
  'σ': '#7e4a40', // garance à l'ombre
  'τ': '#5a3631', // garance au creux du pli
};

/** Hauteur d'une assise de moyen appareil : 30 cm. */
export const COURSE = 6;
/** Longueurs des blocs : 50 à 90 cm. */
const BLOCK_MIN = 10, BLOCK_MAX = 18;
/** Écart minimal entre deux joints debout de deux assises voisines (15 cm). */
const STAGGER = 3;

const memo = new Map<string, number[]>();

/** Un cran plus clair, un cran plus sombre, dans la rampe du calcaire taillé (! + θ = λ ;). */
const LIGHTER: Record<string, string> = { '+': '!', 'θ': '+', '=': 'θ', 'λ': '=' };
const DARKER: Record<string, string> = { '+': 'θ', 'θ': '=', '=': 'λ', 'λ': ';' };

/**
 * Les joints debout de l'assise `k` (colonnes de mortier) sur une face de `w` px, de −20 à w + 20 : des blocs de 10 à 18 px, le
 * premier joint tiré au hasard (la face commence au milieu d'un bloc), chaque joint écarté de ceux de l'assise du dessous.
 */
function courseJoints(seed: number, k: number, w: number): number[] {
  const key = `${seed}:${k}:${w}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const below = k > 0 ? courseJoints(seed, k - 1, w) : [];
  const out: number[] = [];
  let x = -1 - Math.floor(hash(seed, k, 0) * BLOCK_MAX);
  for (let n = 0; x < w + 20; n++) {
    let L = BLOCK_MIN + Math.floor(hash(seed, k, n, 1) * (BLOCK_MAX - BLOCK_MIN + 1));
    for (let tries = 0; tries < 6 && below.some((b) => Math.abs(x + L - b) < STAGGER); tries++) L = L + 2 > BLOCK_MAX ? BLOCK_MIN + tries : L + 2;
    x += L;
    out.push(x);
  }
  memo.set(key, out);
  return out;
}

export interface AshlarOpts {
  /** Les angles de la face tenus par une chaîne d'angle en harpe (`left` : s = 0, `right` : s = w). */
  quoins?: ('left' | 'right')[];
  /** Longueur du bloc long de la chaîne (90 cm par défaut) et du bloc court (50 cm). */
  quoinLong?: number;
  quoinShort?: number;
}

/** Ce qu'un pixel de parement est : un joint, ou un point d'un bloc (sa colonne et sa rangée dans le bloc, sa longueur, s'il est d'angle). */
interface At { joint: boolean; bx: number; by: number; len: number; id: number; quoin: boolean }

/**
 * Le pixel (i, j) d'un parement de `w` px : assise, joints, bloc. La chaîne d'angle alterne bloc long et bloc court d'une assise
 * à l'autre, et d'une face à l'autre (une face est-ouest ou ouest prend l'autre parité : là où le sud montre le bloc long, la
 * face d'à côté montre son bout).
 */
function locate(seed: number, i: number, j: number, w: number, face: Ctx['face'], o: AshlarOpts): At {
  const k = Math.floor(j / COURSE), jj = j - k * COURSE;
  const side = face === 'E' || face === 'W' ? 1 : 0;
  const long = (k + side) % 2 === 0;
  const qLong = o.quoinLong ?? 18, qShort = o.quoinShort ?? 10;
  const ql = o.quoins?.includes('left') ? (long ? qLong : qShort) : 0;
  const qr = o.quoins?.includes('right') ? (long ? qLong : qShort) : 0;
  if (jj === 0) return { joint: true, bx: 0, by: 0, len: 0, id: 0, quoin: false };
  // les joints de l'assise : ceux du tirage, hors des chaînes et à 5 px au moins de leur bord, plus les joints des chaînes
  let J = courseJoints(seed, k, w).filter((x) => x > ql + 4 && x < w - qr - 5);
  if (ql) J = [ql - 1, ...J];
  if (qr) J = [...J, w - qr];
  let prev = -40, next = w + 40, n = 0;
  for (const x of J) {
    if (x === i) return { joint: true, bx: 0, by: 0, len: 0, id: 0, quoin: false };
    if (x < i) { prev = x; n++; } else { next = x; break; }
  }
  const quoin = (ql > 0 && i < ql) || (qr > 0 && i > w - qr);
  return { joint: false, bx: i - prev - 1, by: jj - 1, len: next - prev - 1, id: Math.floor(hash(seed, k, n, 7) * 1000), quoin };
}

/**
 * Le parement de moyen appareil (faces debout) et l'arase (le dessus du mur, `top` : les blocs vus de dessus, la ciselure de
 * l'arête sud au soleil). Les faces se raccordent : deux faces voisines de même graine et de même base ont les mêmes assises.
 */
export function ashlarWall(seed: number, opts: AshlarOpts = {}): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top' || c.face === 'under') return arase(seed, i, j, c);
    const a = locate(seed, i, j, Math.round(c.w), c.face, opts);
    if (a.joint) return ';';
    const r = a.id / 1000;
    const base = a.quoin ? '+' : r < 0.3 ? 'θ' : r < 0.85 ? '=' : 'λ';
    // la ciselure : l'arête du haut et de gauche du bloc, un cran plus claire que lui (le bloc d'angle, mieux dressé, plus clair)
    if (a.by === COURSE - 2 || a.bx === 0) return LIGHTER[base];
    // le layage : des stries du marteau, debout ou en biais selon le bloc, une colonne sur trois, interrompues
    const slant = hash(seed, a.id, 3) < 0.5;
    const stria = ((slant ? a.bx + a.by : a.bx) % 3 === 1) && dash(seed + a.id, slant ? a.bx + a.by : a.bx, a.by, 0.8);
    return stria ? DARKER[base] : base;
  };
}

/** L'arase : des blocs vus de dessus (deux files si le mur est épais), joints de chaux, l'arête sud éclairée. */
function arase(seed: number, i: number, j: number, c: Ctx): string {
  const w = Math.round(c.w), h = Math.round(c.h);
  if (j === h - 1) return '!';
  const files = h >= 10 ? 2 : 1, fh = Math.floor(h / files), f = Math.min(files - 1, Math.floor(j / fh));
  if (files === 2 && j === fh) return '=';
  const J = courseJoints(seed + 991, f, w);
  if (J.includes(i)) return '=';
  const n = J.filter((x) => x < i).length;
  return hash(seed, f, n, 5) < 0.3 ? 'θ' : '+';
}

/**
 * La chaîne d'angle en harpe, seule (une bande de 60 à 90 cm de large, au coin d'un mur) : un bloc long de toute la bande, puis
 * un bloc court tenu au coin, le reste de l'assise en parement ordinaire ; la face voisine (est ou ouest) prend l'autre parité.
 * `corner` : le côté de la bande où est l'arête du coin (sur la face sud, `left` à l'ouest ; sur la face est, `left` au sud).
 */
export function quoinWall(seed: number, corner: 'left' | 'right' = 'left'): Tex {
  return (s, t, c) => ashlarWall(seed, { quoins: [corner], quoinLong: Math.round(c.w), quoinShort: Math.max(6, Math.round(c.w * 0.55)) })(s, t, c);
}

/**
 * Le cordon mouluré (20 cm, 4 px de haut, saillant d'un pixel) : de haut en bas l'arête au soleil, le listel, la gorge dans
 * l'ombre, le bas de la gorge ; des joints tous les 1,10 m (les pierres du cordon sont longues).
 */
export function stringCourse(): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), h = Math.round(c.h);
    if (c.face === 'top') return '+';
    if (c.face !== 'S' && c.face !== 'N' && c.face !== 'E' && c.face !== 'W') return ';';
    const row = h - 1 - j; // 0 en haut
    if (i % 22 === 21 && row > 0) return row >= 2 ? '~' : ';';
    return row === 0 ? '!' : row === 1 ? '+' : row === 2 ? '~' : ';';
  };
}

/**
 * Les bornes (depuis t = 0) des rangs de laves, en rangs décroissants comme les posaient les couvreurs : 5 px le long de la pente
 * à l'égout (25 cm d'apparence), 3 au faîte (15 cm) ; `total` : la longueur du pan.
 */
function lavesRows(seed: number, upto: number, total: number): number[] {
  const out = [0];
  for (let r = 0; out[out.length - 1] <= upto + 6; r++) {
    const f = Math.min(1, out[out.length - 1] / Math.max(1, total));
    out.push(out[out.length - 1] + Math.round(5 - 2 * f + (hash(seed, r, 41) - 0.5) * 0.9));
  }
  return out;
}

/** Les joints debout d'un rang de laves : des laves de 35 à 80 cm à l'égout, plus étroites vers le faîte (`f` de 0 à 1). */
function lavesJoints(seed: number, r: number, w: number, f = 0): number[] {
  const out: number[] = [];
  let x = -Math.floor(hash(seed, r, 51) * 12) - 1;
  for (let n = 0; x < w + 16; n++) { x += Math.round((7 + Math.floor(hash(seed, r, n, 52) * 9)) * (1 - 0.35 * f)); out.push(x); }
  return out;
}

/**
 * Le pan de toit en laves (faces `slope`, t le long de la pente depuis l'égout) : des rangs de 15 à 20 cm posés de bas en haut,
 * chaque rang recouvrant le haut du précédent. De bas en haut dans un rang : le chant de la lave (son épaisseur, à l'ombre), son
 * arête au soleil, le dos de la lave, puis le creux d'ombre sous le chant du rang du dessus. Le bas de chaque lave inégal (un
 * ou deux pixels, par lave et par endroits), les coins arrondis, des laves de tons voisins, la mousse dans les creux, par
 * plaques ; le chant (`edge`, `cap` : l'égout, la rive) montre l'épaisseur des laves empilées.
 */
export function laves(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), w = Math.round(c.w);
    if (c.face === 'edge' || c.face === 'cap' || c.face === 'under' || c.face === 'S' || c.face === 'E' || c.face === 'W') {
      const j = Math.floor(t), h = Math.round(c.h);
      // les chants des laves empilées : une ligne claire par lave, de longueurs inégales, le creux entre elles
      const L = lavesJoints(seed + 7, j, w), n = L.filter((b) => b < i).length;
      if (j === h - 1) return '(';
      return (j + (hash(seed, n, j, 58) < 0.5 ? 0 : 1)) % 2 === 0 ? '?' : ')';
    }
    const rows = lavesRows(seed, t, c.h);
    const fr = (r: number) => Math.min(1, rows[r] / Math.max(1, c.h));
    // le bas de la lave : un pixel plus bas sur une lave sur deux, les coins arrondis
    const lip = (r: number, x: number) => {
      const J = lavesJoints(seed, r, w, fr(r));
      const n = J.filter((b) => b < x).length, a = n ? J[n - 1] : -20, b = J[n] ?? w + 20;
      if (x - a <= 1 || b - x <= 1) return 0;
      return hash(seed, r, n, 53) < 0.5 ? 1 : 0;
    };
    let r = Math.max(0, rows.findIndex((b, q) => q + 1 < rows.length && t >= b && t < rows[q + 1]));
    if (r + 1 < rows.length && t >= rows[r + 1] - lip(r + 1, i)) r++;
    const f = t - (rows[r] - lip(r, i)), H = rows[r + 1] - rows[r] + lip(r, i) - lip(r + 1, i);
    const J = lavesJoints(seed, r, w, fr(r));
    const n = J.filter((b) => b < i).length;
    const mossy = hash(seed, i >> 2, r, 55) < 0.1;
    // le creux sous le chant du rang du dessus (la mousse s'y loge)
    if (f >= H - 1) return mossy ? 'l' : '"';
    // le joint entre deux laves d'un rang : la lave de droite chevauche un peu celle de gauche, un creux à l'ombre
    if (J.includes(i)) return f < 1 ? ')' : '?';
    // le chant de la lave, au jour
    if (f < 1) return mossy && hash(seed, i, r, 56) < 0.6 ? 'L' : '(';
    // le dos de la lave : son ton, marbré de plages plus claires
    const tone = hash(seed, r, n, 54);
    if (tone > 0.88) return '?';
    return smooth(seed + r, s, t * 3, 4) > 0.72 ? '(' : ')';
  };
}

/** Le faîtage de pierre : des faîtières de calcaire de 40 cm, le dessus au soleil, les joues dans l'ombre, les joints creux. */
export function lavesRidge(): Tex {
  return (s, _t, c) => {
    const i = Math.floor(s), nz = c.n[2];
    if (c.face === 'cap') return ';';
    if (i % 8 === 7) return '"';
    if (i % 8 === 0 && nz > 0.5) return '!';
    return nz > 0.9 ? '+' : nz > 0.3 ? '=' : nz > 0 ? ';' : '?';
  };
}

/** Les bornes des rangs de dalles (8 à 12 px) depuis 0. */
function slabRows(seed: number, upto: number): number[] {
  const out = [0];
  for (let r = 0; out[out.length - 1] <= upto + 12; r++) out.push(out[out.length - 1] + 8 + Math.floor(hash(seed, r, 61) * 5));
  return out;
}

/** Le dallage de calcaire d'un sol (le dessus) : des dalles de 40 à 60 cm, joints de 1 px, les veines du calcaire, l'usure. */
export function flagstones(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face !== 'top') return j === Math.round(c.h) - 1 ? '+' : '=';
    const rows = slabRows(seed, j);
    const r = rows.findIndex((b, q) => j >= b && j < rows[q + 1]);
    if (j === rows[r]) return ';';
    let x = -Math.floor(hash(seed, r, 62) * 10) - 1, n = 0;
    while (x < i) { x += 8 + Math.floor(hash(seed, r, n, 63) * 5); n++; }
    if (x === i) return ';';
    const tone = hash(seed, r, n, 64);
    const base = tone < 0.4 ? '+' : tone < 0.85 ? 'θ' : '=';
    // une veine du calcaire, en tirets le long de la dalle
    if (dash(seed + n * 7 + r, j, i, 0.25)) return base === '+' ? 'θ' : '=';
    return base;
  };
}

/** Bruit de valeur lissé (cellules de `cell` px), dans [0, 1). */
function smooth(seed: number, s: number, t: number, cell: number): number {
  const x = s / cell, y = t / cell, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const v = (a: number, b: number) => hash(seed, a, b, 71);
  const e = (u: number) => u * u * (3 - 2 * u);
  const top = v(x0, y0) * (1 - e(fx)) + v(x0 + 1, y0) * e(fx);
  const bot = v(x0, y0 + 1) * (1 - e(fx)) + v(x0 + 1, y0 + 1) * e(fx);
  return top * (1 - e(fy)) + bot * e(fy);
}

/**
 * L'enduit de chaux des murs du dedans : blanc cassé chaud, très calme ; de larges plages un peu plus crème (la chaux passée à
 * la brosse, inégale), un peu de salissure au pied du mur. Le dessus (le mur coupé) : l'enduit en liseré, la pierre dedans.
 */
export function limePlaster(seed: number): Tex {
  return (s, t, c) => {
    if (c.face === 'top') return Math.floor(t) === Math.round(c.h) - 1 ? '!' : '=';
    const n = smooth(seed, s, t, 14);
    if (t < 2 && hash(seed, Math.floor(s / 3), 72) < 0.6) return t < 1 ? '=' : '+';
    return n > 0.78 ? '+' : '!';
  };
}
