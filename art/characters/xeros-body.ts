// Les pièces du corps de Xéros (tête, torse, jambes, bras par le coude, couches, contour), communes à ses animations de
// travail (xeros.ts) et à ses gestes de combat (xeros-combat.ts). Le reste du modèle est décrit dans l'en-tête de xeros.ts.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { Vec } from '../lib/held';
import { capsule } from '../items/lib';
import { OUTLINE } from '../palette';
import { palette as portrait } from '../portraits/xeros';

export const W = 32;
export const H = 48;
export const HEAD_Y = 14;
export const BODY_Y = HEAD_Y + 15;
/** Colonne gauche de la silhouette de face et de dos (12 px de large, centrée sur la frame). */
export const FRONT_X = 10;
/** Colonne gauche de la grille de profil (tête de 12 px, nez compris). */
export const SIDE_X = 10;

export const palette = {
  o: OUTLINE,
  // cheveux (portrait : h H j)
  h: portrait.h,
  H: portrait.H,
  d: portrait.j,
  // peau (portrait : s S D) ; D sert au contour côté lumière et au dessous de la mâchoire
  s: portrait.s,
  S: portrait.S,
  D: portrait.D,
  // tunique de lin (portrait : L t T Y)
  L: portrait.L,
  t: portrait.t,
  T: portrait.T,
  Y: portrait.Y,
  b: '#5a3a22', // ceinture de cuir
  p: '#6f5640', // pantalon
  P: '#57422f',
  k: '#3d2a1f', // bottes
  K: '#5c4130',
  x: '#00000038', // ombre au sol
};

// Contour côté lumière : teinte la plus sombre de chaque matière.
export const DARK: Record<string, string> = {
  h: 'd', H: 'd', d: 'd',
  s: 'D', S: 'D', D: 'D',
  L: 'Y', t: 'Y', T: 'Y', Y: 'Y',
  b: 'b',
  p: 'P', P: 'P',
  k: 'k', K: 'k',
};
// ---------- Tête ----------
// Crâne de 10 px contour compris, oreilles d'un pixel de chaque côté : 12 px.

// Face : le bord du bol s'arrête au-dessus des oreilles et la frange au-dessus des yeux, avec une mèche plus longue
// au milieu du front. Tempes rasées en peau, oreilles qui dépassent, un pixel d'œil de chaque côté (deux rangées),
// deux pixels de joue de part et d'autre, deux entre les yeux.
export const headFront: Grid = [
  '...oooooo...',
  '..ohHHhhho..',
  '.ohHHHhhhdo.',
  '.ohHHhhhhdo.',
  '.ohHhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhdhhhdo.', // mèches de la frange
  '.osddddddSo.', // bord du bol, tempes rasées
  '.osssddssSo.', // mèche plus longue au milieu du front
  'oSssossosSSo', // yeux, oreilles
  'oSssossosSSo',
  '.osssssssSo.',
  '..ossssSSo..',
  '...osssSo...',
  '....oooo....',
];

// Dos : le bol vu de derrière descend jusqu'aux oreilles ; dessous, l'arrière du crâne rasé garde la silhouette de la
// mâchoire vue de face, une seule rangée claire, le reste dans l'ombre de la tête.
export const headBack: Grid = [
  '...oooooo...',
  '..ohHHhhho..',
  '.ohHHHhhhdo.',
  '.ohHHhhhhdo.',
  '.ohHhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhhhhhdo.',
  'oSdhhhhhhdSo',
  'oSsddddddsSo',
  '.ossssssSSo.',
  '..osSSSSSo..',
  '...oSSSSo...',
  '....oooo....',
];

// ---------- Corps, face et dos ----------
// Torse de 6 px (x=13 à 18) entre deux bras de 2 px (manche claire, ombre) ; une colonne d'ombre du lin sépare le bras
// du torse, sans contour intérieur. Sous les mains, l'ourlet.

export const torsoFront: Grid = [
  '.osSo.', // cou
  'oosSoo', // épaules, encolure
  'LtTTtt', // fente de l'encolure
  'Lttttt',
  'YLttTY',
  'YLttTY',
  'YLttTY',
  'YbbbbY', // ceinture
  'YLttTY',
  'LttTTT', // l'ourlet, sous les mains
  'LtTTTT',
  'oooooo',
];

// Dos : pas d'encolure, un pli qui descend de l'omoplate droite et reprend sous la ceinture.
export const torsoBack: Grid = [
  '.osSo.',
  'oottoo',
  'LttTtT',
  'LttTtt',
  'YLtTtY',
  'YLttTY',
  'YLttTY',
  'YbbbbY',
  'YLtTtY',
  'LttTTT',
  'LtTTTT',
  'oooooo',
];

// Jambes fines, jointes (le contour de chacune les sépare) ; bottes de cuir.
export const legLeft: Grid = ['opPo', 'opPo', 'opPo', 'oKko', 'oKko', 'oooo'];
export const legRight: Grid = ['opPo', 'opPo', 'oPPo', 'oKko', 'okko', 'oooo'];
/** Colonnes des jambes de face, depuis FRONT_X. */
export const LEG_L = 2;
export const LEG_R = 6;

// ---------- Vue de profil (droite) ----------

// Le bol couvre le crâne et s'arrête au-dessus du front (une rangée de front dégagée devant) ; derrière, il descend
// plus bas, jusqu'à l'oreille, puis une petite bande rasée à la nuque. Oreille en C (S clair, creux D), œil, nez qui
// dépasse, mâchoire ombrée, cou court qui disparaît dans le col.
export const headSide: Grid = [
  '...ooooo....',
  '.oohHHhhoo..',
  '.ohHHHhhhho.',
  'ohHHhhhhhho.',
  'ohHhhhhhhho.',
  'ohhhhhhhhho.',
  'ohhhhhhdhdo.', // mèches de la frange
  'ohhhddddddo.', // bord du bol
  'ohhdsssssso.', // front dégagé ; derrière, le bol descend
  'ohdSsssosso.', // oreille, œil
  'ohsSDssossso', // le nez dépasse
  '.osSsssssSo.',
  '..ossssssSo.',
  '...ossDDSo..', // dessous de la mâchoire
  '....osDooo..', // cou
];

// Torse de profil : col montant autour du cou, poitrine en avant, ourlet qui s'évase sous la ceinture. Dos éclairé à
// gauche.
export const bodySide: Grid = [
  '...oLtTo....',
  '..oLLtttTo..',
  '..oLttttTTo.',
  '..oLttttTTo.',
  '...oLtttTo..',
  '...oLtttTo..',
  '...oLtttTo..',
  '...obbbbbo..',
  '...oLttttTo.',
  '..oLtttttTo.',
  '..oLttttttTo',
  '..oooooooooo',
];
export const legSide: Grid = [
  'opPo.',
  'opPo.',
  'opPo.',
  'oKkko',
  'okkko',
  'ooooo',
];
/** Colonnes des jambes de profil (fond, devant), depuis SIDE_X, jambes jointes. */
export const LEG_SIDE: [number, number] = [3, 5];

// La jambe du fond est plus sombre pour qu'on lise la profondeur.
export const backLeg = (g: Grid) => Canvas.from(g).recolor({ p: 'P', K: 'k' }).toGrid();

// ---------- Composition ----------

export function shadow(c: Canvas) {
  c.ellipse(16.5, 45.5, 5.5, 2, 'x');
}

/** Tout ce qui n'est ni vide, ni ombre au sol, ni contour. */
export const isMatter = (ch: string) => ch !== EMPTY && ch !== 'x' && ch !== 'o';

/** Contour d'un pixel autour de la matière (sur le vide et l'ombre au sol). */
export function rim(c: Canvas) {
  const add: Vec[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = c.get(x, y);
    if (ch !== EMPTY && ch !== 'x') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isMatter(c.get(x + dx, y + dy)))) add.push([x, y]);
  }
  for (const [x, y] of add) c.set(x, y, 'o');
}

/**
 * Bras de l'épaule à la main, par le coude : manche de lin, mains de peau jointes sur le manche.
 * Bordé de contour sur le vide, et de la teinte la plus sombre de ce qu'il recouvre ailleurs
 * (pas de contour intérieur).
 */
export function arm(c: Canvas, pts: Vec[], sleeve: string, sleeveLight: string) {
  const a = new Canvas(W, H);
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    capsule(a, x0 + 0.5, y0 + 0.5, x1 + 0.5, y1 + 0.5, 1.05, (_t, across) => (across < -0.2 ? sleeveLight : sleeve));
  }
  const [hx, hy] = pts[pts.length - 1];
  a.rect(hx - 1, hy - 1, 3, 3, 's').rect(hx + 1, hy - 1, 1, 3, 'S').set(hx - 1, hy + 1, 'S').set(hx, hy + 1, 'S');
  const border: [number, number, string][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (a.get(x, y) !== EMPTY) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => a.get(x + dx, y + dy) !== EMPTY)) continue;
    const under = c.get(x, y);
    border.push([x, y, isMatter(under) ? DARK[under] ?? 'o' : 'o']);
  }
  c.stamp(a.toGrid(), 0, 0);
  for (const [x, y, k] of border) c.set(x, y, k);
}

/** Torse sans bras pendants : seul le bord de l'épaule reste. */
export const bareTorso = (torso: Grid): Grid => torso.map((row) => '...' + row + '...');
