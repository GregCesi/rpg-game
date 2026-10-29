// La branche sèche, dessin commun : pièces du tas (art/world/piles.ts), branche au sol (branch-ground), branche en main
// (held-branch, art/items/carried.ts) et icône (item-branch, art/items/resources.ts).
//
// Gros bout de 2 px (10 cm) : dessus clair (M), flanc (m), une fente sombre (N), le bout cassé net en bois clair (U u).
// Puis une tige d'1 px (m) vers la pointe, qui se relève d'un pixel sur ses quatre derniers, et des rameaux (m) qui
// partent de la tige vers la pointe. Contour : N côté lumière (haut, gauche), OUTLINE en bas et à droite.
//
// Le dessin se fait toujours couché est-ouest (`branchBody`), puis se tourne (`transpose`), se penche (`shearDown`) ou
// passe en diagonale (`diagonal`) avant le contour (`finishBranch`) : la branche garde ses matières et sa lumière.

import { Canvas, EMPTY, rng } from '../lib/canvas';
import { outline } from './lib';

/** Un rameau : départ (fraction de la longueur depuis le gros bout), vers le haut ou le bas de l'image, longueur. */
export interface Twig { at: number; up: boolean; len: number; fork?: boolean }
/** Une branche : longueur, côté du gros bout, longueur du gros bout, rameaux, graine des détails. */
export interface Branch { len: number; thickLeft: boolean; thick: number; twigs: Twig[]; seed: number }

/** Taille de l'image d'une pièce de tas, et rangée du contour du bas de son gros bout. */
export const BW = 32;
export const BH = 13;
export const BASE = 10;

/**
 * La branche sans contour, couchée est-ouest dans une image w × h, son gros bout à `x0` ou à `x0 + len - 1`. Gros
 * bout : rangées base-2 (M) et base-1 (m) ; tige fine : rangée base-1.
 */
export function branchBody(b: Branch, x0: number, w = BW, h = BH, base = BASE): Canvas {
  const c = new Canvas(w, h);
  const r = rng(b.seed);
  const dir = b.thickLeft ? 1 : -1;
  const start = b.thickLeft ? x0 : x0 + b.len - 1;
  const X = (i: number) => start + dir * i; // i : distance depuis le gros bout
  // rameaux d'abord, la tige passe par-dessus
  for (const t of b.twigs) {
    const sx = X(Math.round(t.at * b.len));
    const sy = base - 1;
    const dy = t.up ? -1 : 1;
    const rise = t.up ? Math.min(3, Math.ceil(t.len / 2)) : Math.min(2, Math.ceil(t.len / 3));
    const ex = sx + dir * t.len;
    const ey = sy + dy * rise;
    c.line(sx, sy, ex, ey, 'm');
    if (t.fork) c.line(ex - dir, ey, ex + dir, ey + dy, 'm');
  }
  // tige : gros bout sur 2 rangées, puis 1 rangée jusqu'à la pointe
  for (let i = 0; i < b.len; i++) {
    if (i < b.thick) c.set(X(i), base - 2, 'M').set(X(i), base - 1, 'm');
    // la pointe se relève d'un pixel sur ses quatre derniers
    else c.set(X(i), i >= b.len - 4 ? base - 2 : base - 1, 'm');
  }
  // une fente sombre sur le flanc du gros bout
  for (let i = 3; i < Math.min(b.thick - 2, 3 + 3 + Math.floor(r() * 3)); i++) c.set(X(i), base - 1, 'N');
  // bout cassé : bois clair, éclairé à gauche, dans l'ombre à droite
  c.set(X(0), base - 2, b.thickLeft ? 'U' : 'u').set(X(0), base - 1, 'u');
  return c;
}

/**
 * Contour, et, `shadowRow` donné, ombre au sol sur cette rangée : sous chaque pixel dessiné de la rangée du dessus,
 * décalée d'un pixel vers la droite.
 */
export function finishBranch(c: Canvas, shadowRow?: number): Canvas {
  outline(c, 'N');
  if (shadowRow !== undefined) {
    const y = shadowRow;
    for (let x = 1; x < c.w; x++) {
      if (c.get(x, y) === EMPTY && c.get(x - 1, y - 1) !== EMPTY && c.get(x - 1, y - 1) !== 'x') c.set(x, y, 'x');
    }
  }
  return c;
}

/** Une branche couchée est-ouest, avec son contour ; `ground` : posée au sol, avec son ombre. */
export function branch(b: Branch, x0: number, ground: boolean): Canvas {
  return finishBranch(branchBody(b, x0), ground ? BASE + 1 : undefined);
}

/**
 * La branche dressée : lignes et colonnes échangées. Le dessus clair (M) passe à gauche, le flanc (m) à droite : la
 * lumière reste en haut à gauche. Les rameaux « vers le haut » partent à gauche.
 */
export function transpose(c: Canvas): Canvas {
  const out = new Canvas(c.h, c.w);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) out.px[x][y] = c.px[y][x];
  return out;
}

/** Penche la branche : chaque colonne à droite de `from` descend d'un pixel tous les `step` pixels. */
export function shearDown(c: Canvas, from: number, step: number): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let x = 0; x < c.w; x++) {
    const d = Math.max(0, Math.floor((x - from) / step));
    for (let y = 0; y < c.h; y++) if (c.px[y][x] !== EMPTY) out.set(x, y + d, c.px[y][x]);
  }
  return out;
}

/** En diagonale, à 45° : chaque colonne monte d'un pixel par pixel vers la droite (gros bout en bas à gauche). */
export function diagonal(c: Canvas): Canvas {
  const out = new Canvas(c.w, c.h + c.w);
  for (let x = 0; x < c.w; x++) for (let y = 0; y < c.h; y++) if (c.px[y][x] !== EMPTY) out.set(x, y + c.w - x, c.px[y][x]);
  return out;
}

/** Recadre sur ce qui est dessiné, puis le centre dans une image w × h. */
export function centerIn(c: Canvas, w: number, h: number): Canvas {
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.px[y][x] !== EMPTY) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const out = new Canvas(w, h);
  const ox = Math.floor((w - (x1 - x0 + 1)) / 2) - x0, oy = Math.floor((h - (y1 - y0 + 1)) / 2) - y0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (c.px[y][x] !== EMPTY) out.set(x + ox, y + oy, c.px[y][x]);
  return out;
}
