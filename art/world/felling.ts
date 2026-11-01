// L'abattage d'un arbre debout : ses étapes (`<arbre>-stage-1` à `-7`, art/world/work-stages.ts) et le raccord de la
// dernière étape à la chute (les premières images des planches `<arbre>-fall` et `-fall-left`).
//
// Sorti de work-stages.ts pour que les chutes (art/world/normal-fall.ts, big-felled.ts, big-pollard.ts) partent du même
// dessin que les étapes, sans import circulaire (work-stages.ts importe les arbres couchés de big-felled.ts).
//
// Deux jeux d'étapes : `<image>-stage-<n>` pour un arbre qui tombe vers la droite (l'entaille à droite), et
// `<image>-left-stage-<n>` pour la gauche (Xéros frappe depuis la droite) : dessinées, pas retournées. L'arbre reste le même,
// éclairé en haut à gauche, racines à leur place ; l'entaille passe au bord gauche, le trait d'abattage au bord droit, la
// penche vers la gauche autour du bord gauche de l'écorce (le miroir de la charnière de droite).
//
// Le raccord (`leadIn`) : deux images, l'arbre de la dernière étape (même entaille, même trait, même fente, mêmes copeaux,
// même pied) dont le haut continue de pivoter autour de la même charnière, de l'angle de la dernière étape vers les 10° de
// la première image dessinée de la chute. La chute pivote autour de cette même charnière (`HINGE`) : rien ne saute au pied.

import { Canvas, EMPTY, rng } from '../lib/canvas';
import { despeckle, groundShadow, shadedOutline, standingTree as bigStanding, tallTreeBody, treeBody as bigBody, TALL_DY, type Vec } from './big-tree';
import { treeBody as normalBody } from './normal-tree';
import { FOOT as NORMAL_FOOT, TREE_H, TREE_W } from './normal-geometry';

/** Une entaille : profondeur (colonnes depuis le bord droit de l'écorce) et ouverture (rangées au-dessus du plancher). */
interface Notch { depth: number; open: number }

/** Un arbre debout à abattre. */
export interface Standing {
  key: string;
  /** Le corps de l'arbre debout (sans contour ni ombre), dans le repère de son image. */
  body: () => Canvas;
  w: number;
  h: number;
  /** Pied du tronc (centre du bas), dans l'image. */
  foot: Vec;
  /** Ombre portée de l'arbre debout (celle de son image). */
  shadow: [number, number, number, number];
  /** Rangée du plancher de l'entaille : juste sous la coupe de la chute. */
  floor: number;
  /** L'entaille à 1/3, 2/3, 3/3. */
  notch: [Notch, Notch, Notch];
  /** Longueur de la saignée du trait d'abattage, puis au craquement. */
  back: [number, number];
  /** Fente du craquement, [dx depuis le bord gauche, dy depuis le plancher]. */
  crack: Vec[];
  /** Angles de la penche (degrés). */
  lean: [number, number];
  /** Ombre du haut qui penche : [dx depuis le pied, rx]. */
  leanShadow: [number, number];
  /** Copeaux : écart au pied du premier, nombre côté entaille puis côté trait à chaque étape (0 à 7). */
  chips: { gap: number; right: number[]; left: number[] };
  /** Éclats du craquement, [dx depuis le bord gauche, dy depuis le plancher]. */
  splinters: [number, number, string][];
}

/** Colonnes d'écorce [gauche, droite] de la rangée `y`. */
function barkSpan(c: Canvas, y: number): [number, number] {
  const xs = [...Array(c.w).keys()].filter((x) => 'MmNK'.includes(c.get(x, y)));
  if (!xs.length) throw new Error(`étapes : pas d'écorce à la rangée ${y}`);
  return [xs[0], xs[xs.length - 1]];
}

/**
 * Creuse l'entaille de direction (côté droit) : V à plancher horizontal (méthode de l'essai). Le bord du tronc s'échancre ;
 * dans le V, le creux à l'ombre (`@`, `&`) ; la face haute en pente (`%`) ; le plancher au soleil (`^`), qui dépasse d'un
 * pixel à gauche du V (la face sud de l'entaille, qui s'enroule autour du tronc).
 */
function notch(c: Canvas, edge: number, floor: number, n: Notch, dir: 1 | -1 = 1) {
  // dir 1 : entaille au bord droit, creusée vers la gauche ; −1 : au bord gauche, creusée vers la droite (chute à gauche).
  // À gauche, la face haute en pente regarde le haut-gauche, vers la lumière : `*` au lieu de `%`.
  const at = (k: number) => edge - dir * k;
  const slope = dir === 1 ? '%' : '*';
  const top = floor - n.open;
  for (let y = top; y < floor; y++) {
    const d = Math.max(1, Math.round((n.depth * (y - top + 1)) / n.open));
    for (let k = 0; k < d; k++) {
      c.px[y][at(k)] = d === 1 ? '&' : k === 0 ? EMPTY : k === d - 1 ? slope : y === floor - 1 ? '&' : '@';
    }
  }
  for (let k = 0; k <= n.depth; k++) c.px[floor][at(k)] = k === n.depth ? '*' : '^';
  c.px[floor - 1][at(n.depth)] = '^';
}

/** Le trait d'abattage (côté gauche, une rangée au-dessus du plancher) : une morsure et la saignée, `reach` px de long. */
function backCut(c: Canvas, edge: number, floor: number, reach: number, open: boolean, dir: 1 | -1 = 1) {
  // dir 1 : depuis le bord gauche ; −1 : depuis le bord droit (chute à gauche)
  const at = (k: number) => edge + dir * k;
  const y = floor - 1;
  c.px[y][at(0)] = EMPTY;
  c.px[y - 1][at(0)] = EMPTY;
  c.px[y + 1][at(0)] = '^';
  for (let k = 1; k < reach; k++) c.px[y][at(k)] = '@';
  c.px[y - 1][at(1)] = '%';
  if (open) {
    // la saignée s'ouvre en coin : le haut du tronc a commencé à basculer
    c.px[y - 1][at(1)] = '&';
    c.px[y - 2][at(0)] = EMPTY;
  }
}

/**
 * Le haut de l'arbre (au-dessus du plancher) pivoté de `deg` degrés vers la droite autour de la charnière ; le pied ne
 * bouge pas. Refuse un houppier qui sortirait de l'image.
 */
function leanTop(body: Canvas, hinge: Vec, floor: number, deg: number, what: string): Canvas {
  // `deg` négatif : vers la gauche. Le canevas de travail déborde de `pad` colonnes de chaque côté.
  const pad = 24;
  const out = new Canvas(body.w + 2 * pad, body.h);
  const t = (deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  for (let y = floor - 1; y < body.h; y++) for (let x = 0; x < body.w; x++) out.px[y][x + pad] = body.px[y][x];
  for (let y = 0; y < body.h; y++) for (let X = 0; X < out.w; X++) {
    const x = X - pad;
    const u = x + 0.5 - hinge[0];
    const v = y + 0.5 - hinge[1];
    const sx = Math.floor(hinge[0] + u * cos + v * sin);
    const sy = Math.floor(hinge[1] - u * sin + v * cos);
    if (sy >= floor - 1 || sx < 0 || sx >= body.w || sy < 0) continue;
    const p = body.px[sy][sx];
    if (p !== EMPTY) out.px[y][X] = p;
  }
  // garde-fou : rien ne sort de l'image (contour compris : une colonne de marge de chaque côté)
  for (let y = 0; y < out.h; y++) for (let X = 0; X < out.w; X++) {
    const x = X - pad;
    if ((x < 1 || x >= body.w - 1) && out.px[y][X] !== EMPTY) throw new Error(`étapes : ${what}, la penche de ${deg}° sort de l'image en (${x}, ${y})`);
  }
  return Canvas.from(out.toGrid().map((r) => r.slice(pad, pad + body.w)));
}

/** Copeaux au sol : [dx, dy, forme] depuis le pied ; forme 0 : un point, 1 : deux en long, 2 : deux en travers. */
function chipsFor(t: Standing, stage: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const r = rng(77);
  const nr = t.chips.right[t.chips.right.length - 1];
  const nl = t.chips.left[t.chips.left.length - 1];
  const spot = (side: 1 | -1, i: number): [number, number, number] => {
    const d = t.chips.gap + Math.floor(i * 0.45 + r() * 3);
    return [side * d, -1 + Math.floor(r() * 3), Math.floor(r() * 3)];
  };
  for (let i = 0; i < nr; i++) {
    const c = spot(1, i);
    if (i < t.chips.right[stage]) out.push(c);
  }
  for (let i = 0; i < nl; i++) {
    const c = spot(-1, i);
    if (i < t.chips.left[stage]) out.push([c[0] - 1, c[1], c[2]]);
  }
  return out;
}

/** Les copeaux de l'étape, autour du pied décalé de `off` colonnes ; `free` : seulement sur le vide et l'ombre. */
function drawChips(c: Canvas, t: Standing, stage: number, off = 0, free = false, dir: 1 | -1 = 1) {
  const [fx, fy] = [t.foot[0] + off, t.foot[1] + 1];
  const put = (x: number, y: number, k: string) => {
    if (!free || c.get(x, y) === EMPTY || c.get(x, y) === 'x') c.set(x, y, k);
  };
  for (const [ddx, dy, form] of chipsFor(t, stage)) {
    // vers la gauche : les copeaux de l'entaille à gauche, ceux du trait à droite (le miroir autour du pied, sans les formes)
    const dx = dir === 1 ? ddx : -ddx - 1;
    const x = fx + dx;
    const y = fy + dy;
    if (form === 1) { put(x, y, '^'); put(x + 1, y, '*'); }
    else if (form === 2) { put(x, y, '^'); put(x, y + 1, '%'); }
    else put(x, y, '^');
  }
}

/** Charnière de la penche, dans l'image de l'arbre debout : le bord droit de l'écorce, au plancher de l'entaille. */
export function hingeOf(t: Standing, left = false): Vec {
  const [l, right] = barkSpan(t.body(), t.floor - 1);
  // vers la gauche : le bord gauche de l'écorce, au même plancher (le miroir de la charnière de droite)
  return left ? [l + 1 + 0.5, t.floor] : [right - 1 + 0.5, t.floor];
}

/** Pose d'une image penchée hors de l'image de l'arbre : angle, largeur du canevas, place de l'arbre, ombre du haut. */
interface Lean { deg: number; w: number; off: number; shade: [number, number, number, number] }

/**
 * Une étape de l'abattage (1 à 7), dans l'image de l'arbre debout ; ou, avec `lean`, l'arbre de cette étape penché d'un
 * autre angle, dans un canevas plus large (le raccord à la chute) : à l'angle de l'étape, c'est l'étape, décalée.
 */
export function fellingStage(t: Standing, stage: number, lean?: Lean, toLeft = false): Canvas {
  // vers la gauche (`<image>-left-stage-<n>`) : le même arbre, éclairé comme toujours, l'entaille au bord gauche, le trait
  // d'abattage et la fente depuis le bord droit, la penche vers la gauche ; rien n'est retourné
  const dir: 1 | -1 = toLeft ? -1 : 1;
  let body = t.body();
  const [left, right] = barkSpan(body, t.floor - 1);
  const [front, back] = toLeft ? [left, right] : [right, left];
  if (stage >= 1) notch(body, front, t.floor, t.notch[Math.min(stage, 3) - 1], dir);
  if (stage >= 4) backCut(body, back, t.floor, t.back[stage >= 5 ? 1 : 0], stage >= 6, dir);
  if (stage >= 5) for (const [dx, dy] of t.crack) body.px[t.floor + dy][back + dir * dx] = '&';
  const off = lean?.off ?? 0;
  if (lean) body = new Canvas(lean.w, t.h).stamp(body.toGrid(), off, 0);
  if (stage >= 6) {
    const deg = lean?.deg ?? t.lean[stage - 6];
    const [hx, hy] = hingeOf(t, toLeft);
    body = leanTop(body, [off + hx, hy], t.floor, dir * deg, `${t.key}${toLeft ? '-left' : ''}-stage-${stage}`);
  }
  despeckle(body, 'K^*%&@');
  const c = shadedOutline(body);
  const [sx, sy, srx, sry] = t.shadow;
  groundShadow(c, sx + off, sy, srx, sry);
  if (lean) groundShadow(c, ...lean.shade);
  else if (stage >= 6) groundShadow(c, t.foot[0] + dir * t.leanShadow[0], t.foot[1] + 1, t.leanShadow[1], t.shadow[3]);
  drawChips(c, t, stage, off, false, dir);
  if (stage === 5) for (const [dx, dy, k] of t.splinters) c.set(back + dir * dx, t.floor + dy, k);
  if (!lean && (c.w !== t.w || c.h !== t.h)) throw new Error(`étapes : ${t.key}, image de ${c.w} × ${c.h} au lieu de ${t.w} × ${t.h}`);
  return c;
}

// Les gros (tronc de 55 cm, 10 à 11 colonnes d'écorce) : l'entaille va jusqu'à 5 px (0,45 D), la saignée jusqu'à la
// charnière, la fente monte plus haut, davantage de copeaux, plus loin (au-delà des racines, ± 12 px).
const BIG_NOTCH: [Notch, Notch, Notch] = [{ depth: 3, open: 4 }, { depth: 4, open: 6 }, { depth: 5, open: 8 }];
const BIG_CRACK: Vec[] = [[5, -2], [5, -3], [4, -4], [4, -5], [4, -6], [3, -7], [3, -8]];
const BIG_CHIPS = { gap: 13, right: [0, 6, 11, 16, 18, 18, 18, 18], left: [0, 0, 0, 0, 5, 8, 8, 8] };
const BIG_SPLINTERS: [number, number, string][] = [
  [-3, -3, '^'], [-4, -3, '*'], [-6, -6, '^'], [-3, -9, '^'], [-2, -9, '*'], [-8, -4, '^'], [-5, -11, '^'],
];

export const NORMAL: Standing = {
  key: 'normal-tree',
  body: () => normalBody(),
  w: TREE_W,
  h: TREE_H,
  foot: NORMAL_FOOT,
  shadow: [NORMAL_FOOT[0] + 2, NORMAL_FOOT[1] + 0.5, 9, 2.4],
  // la coupe de la chute est à la rangée 148 (normal-fall.ts) ; le plancher juste dessous
  floor: 149,
  notch: [{ depth: 2, open: 3 }, { depth: 3, open: 4 }, { depth: 3, open: 6 }],
  back: [3, 4],
  crack: [[3, -2], [3, -3], [2, -4], [2, -5], [2, -6]],
  lean: [1.5, 2.5],
  leanShadow: [8, 11],
  chips: { gap: 4, right: [0, 4, 8, 12, 13, 13, 13, 13], left: [0, 0, 0, 0, 4, 6, 6, 6] },
  splinters: [[-3, -3, '^'], [-4, -3, '*'], [-6, -6, '^'], [-3, -8, '^'], [-2, -8, '*']],
};

export const BIG: Standing = {
  key: 'big-tree',
  body: () => tallTreeBody(),
  w: 64,
  h: 160,
  foot: [33, 89 + TALL_DY],
  shadow: [36, 89.5 + TALL_DY, 17, 4],
  // la coupe de la chute est à la rangée 76 du repère 64 × 96 (big-felled.ts) ; le plancher deux rangées dessous
  floor: 78 + TALL_DY,
  notch: BIG_NOTCH,
  back: [4, 6],
  crack: BIG_CRACK,
  lean: [1.5, 3],
  leanShadow: [8, 18],
  chips: BIG_CHIPS,
  splinters: BIG_SPLINTERS,
};

export const POLLARD: Standing = {
  ...BIG,
  key: 'big-pollard',
  body: () => bigBody(),
  h: 96,
  foot: [33, 89],
  shadow: [36, 89.5, 17, 4],
  floor: 78,
  lean: [2, 5],
};

// garde-fou : l'étape 0 (rien de fait) est, au pixel près, l'image de l'arbre debout
{
  const ga = fellingStage(BIG, 0).toGrid();
  const gb = bigStanding().toGrid();
  if (ga.join('\n') !== gb.join('\n')) throw new Error(`étapes : big-tree, l'étape 0 diffère de l'arbre debout`);
}

// =====================================================================================================================
// Le raccord à la chute
// =====================================================================================================================

/** Dernière étape de l'abattage : celle que la chute remplace. */
export const LAST_STAGE = 7;
/** Angle de la première image dessinée de la chute (10°), que le raccord rejoint. */
export const FALL_FIRST_DEG = 10;
/** Les angles du raccord, en part du chemin de la dernière étape à 10° : l'arbre accélère en basculant. */
const LEAD = [0.3, 0.65];

/** Le raccord d'un côté : la planche de chute (largeur, place de l'arbre debout) et l'ombre du haut à 10°. */
export interface LeadSide {
  /** Largeur des images de la chute (avant recadrage éventuel). */
  w: number;
  /** Colonne de la planche où est posé le coin gauche de l'image de l'arbre debout (OFF, ou OFF_L à gauche). */
  off: number;
  /** Ombre du haut de l'arbre à 10° (cx, cy, rx, ry), dans la planche ; dans le sens de droite pour `left`. */
  shade10: [number, number, number, number];
  left: boolean;
}

/**
 * Les images du raccord, dans la planche de chute : l'arbre de la dernière étape, le haut penché de plus en plus, de
 * l'angle de cette étape vers 10°. Vers la gauche, depuis `<image>-left-stage-7` (dessinée, éclairée en haut à gauche).
 */
export function leadIn(t: Standing, side: LeadSide): Canvas[] {
  const from = t.lean[1];
  const dir = side.left ? -1 : 1;
  const off = side.off;
  const leanShade = (s: number): [number, number, number, number] => {
    const a: [number, number, number, number] = [t.foot[0] + off + dir * t.leanShadow[0], t.foot[1] + 1, t.leanShadow[1], t.shadow[3]];
    const b = side.shade10;
    return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s, a[3] + (b[3] - a[3]) * s];
  };
  return LEAD.map((s) => fellingStage(t, LAST_STAGE, { deg: from + (FALL_FIRST_DEG - from) * s, w: side.w, off, shade: leanShade(s) }, side.left));
}

/** L'arbre de la dernière étape tel que le jeu le montre, posé dans la planche (`-left-stage-7` vers la gauche). */
export function lastStageIn(t: Standing, side: LeadSide): Canvas {
  return new Canvas(side.w, t.h).stamp(fellingStage(t, LAST_STAGE, undefined, side.left).toGrid(), side.off, 0);
}

/**
 * Les copeaux de la dernière étape posés sur une image de la chute (sur le vide et l'ombre seulement) : ils restent au pied
 * jusqu'à ce que l'arbre couché et la souche remplacent la chute. Vers la gauche, ceux de `-left-stage-7`.
 */
export function withChips(c: Canvas, t: Standing, side: LeadSide, dy = 0): Canvas {
  const layer = new Canvas(t.w, t.h);
  drawChips(layer, t, LAST_STAGE, 0, false, side.left ? -1 : 1);
  const g = layer.toGrid();
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
    const k = g[y][x];
    if (k === EMPTY) continue;
    const X = side.off + x;
    const Y = y + dy;
    if (c.get(X, Y) === EMPTY || c.get(X, Y) === 'x') c.set(X, Y, k);
  }
  return c;
}
