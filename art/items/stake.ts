// Le piquet (fiche docs/objets/stake.md) : une branche de 100 cm, Ø 5 cm, taillée en pointe à un bout, la tête coupée
// plate à l'autre. Quatre images : couché au sol (`stake-ground`), planté (`planted-stake`, aussi montré en fantôme à
// moitié transparent), icône (`item-stake`) et tenu au poing (`held-stake`, posture `hand`).
//
// Matière : celle de la branche (art/items/branch.ts, NORMAL_WOOD) : le bois (M), une fente (m) ; le bois mis à nu par la hache en bois clair (U éclairé, u à l'ombre) : la tête coupée et les trois
// facettes de la pointe. Contour : N côté lumière (haut, gauche), OUTLINE (o) en bas et à droite.
//
// Gabarit (docs/STYLE.md, section 8) : 100 cm = 20 px de long, contour compris. Couché, la boîte 100 × 5 × 5 donne
// H + D/2 = 1 + 0,5 : une rangée de bois entre ses deux contours, 20 × 3. Planté (75 cm hors de terre), W = 1 px : une
// colonne de bois entre ses deux contours, 3 × 16. Partout la même épaisseur, celle de la branche sur le billot.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { centerIn, diagonal, finishBranch } from './branch';
import { BRANCH_FIST, fistGap, sheet } from './carried';
import { outline } from './lib';

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

/** Longueur du bois sans contour : 18 px (100 cm contour compris). */
const LEN = 18;

/**
 * Le piquet sans contour, couché est-ouest sur la rangée `row` d'une image w × h (une rangée : 5 cm). La tête (bout
 * coupé net, U) à `x0` ; la pointe à droite (ou à gauche, `pointLeft`) : ses facettes taillées en bois clair (U U u).
 * Une fente (m) au tiers de la tête.
 */
export function stakeBody(x0: number, w: number, h: number, row: number, pointLeft = false, len = LEN): Canvas {
  const c = new Canvas(w, h);
  const X = (i: number) => (pointLeft ? x0 + len - 1 - i : x0 + i);
  for (let i = 0; i < len; i++) {
    const k = i === 0 || i === len - 3 || i === len - 2 ? 'U' : i === len - 1 ? 'u' : i >= 4 && i <= 6 ? 'm' : 'M';
    c.set(X(i), row, k);
  }
  return c;
}

// ---------- Au sol ----------
// Couché est-ouest, la tête à gauche, la pointe à droite ; ombre sous lui, décalée d'un pixel vers la droite. Le bas de
// l'image est la rangée de l'ombre (comme branch-ground).

function stakeGround(): Canvas {
  return finishBranch(stakeBody(1, LEN + 3, 4, 1), 3);
}

// ---------- Planté ----------
// Debout, 75 cm hors de terre : la tête taillée plate en haut (U, le bois de bout dans la lumière), le corps (M) et sa
// fente (m), la pointe enfoncée dans l'herbe : on ne la voit pas, le bois entre dans le sol au bas de l'image. Une
// colonne de bois, contour N à gauche et en haut, o à droite et en bas. Ombre au pied, vers la droite.

function plantedStake(): Canvas {
  const c = new Canvas(5, 17);
  c.set(1, 1, 'U');
  for (let y = 2; y <= 14; y++) c.set(1, y, 'M');
  for (let y = 6; y <= 8; y++) c.set(1, y, 'm');
  outline(c, 'N');
  // ombre portée au pied, couchée vers la droite
  c.set(3, 14, 'x').set(3, 15, 'x');
  for (let x = 1; x <= 4; x++) c.set(x, 16, 'x');
  return c;
}

// ---------- Icône ----------
// En diagonale, pointe en bas à gauche, tête en haut à droite ; 15 px de bois (75 cm) pour tenir dans la case.

function itemStake(): Canvas {
  const c = diagonal(stakeBody(1, 16, 8, 5, true, 13));
  return finishBranch(centerIn(c, 16, 16));
}

// ---------- En main ----------
// Tenu au poing près de la tête, la pointe qui descend en avant vers le sol, le long de la jambe.
// - De profil : toute sa longueur (18 px de bois), la tête deux pixels derrière le poing, penchée d'un pixel tous les
//   trois : la pointe arrive près du sol devant ses pieds.
// - De face : il vient vers nous en descendant, raccourci : un trait court (11 px), la tête au-dessus du poing, la
//   pointe en bas.
// - De dos : il s'éloigne, caché par le corps (l'image passe dessous) ; on voit la tête sous le poing et ce qui
//   déborde de la silhouette.

const HELD_SIZE = 41;
const HC = Math.floor(HELD_SIZE / 2);

/** Penche : chaque colonne à droite de `from` descend d'un pixel tous les `step` pixels. */
function lean(c: Canvas, from: number, step: number): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let x = 0; x < c.w; x++) {
    const d = Math.max(0, Math.floor((x - from) / step));
    for (let y = 0; y < c.h; y++) if (c.px[y][x] !== EMPTY) out.set(x, y + d, c.px[y][x]);
  }
  return out;
}

/** Dressé, une colonne de bois en x = HC, de la rangée `from` à `to` : tête claire en haut, pointe claire en bas. */
function upright(from: number, to: number, head: boolean): Canvas {
  const c = new Canvas(HELD_SIZE, HELD_SIZE);
  for (let y = from; y <= to; y++) c.set(HC, y, 'M');
  if (head) c.set(HC, from, 'U');
  c.set(HC, to - 2, 'U').set(HC, to - 1, 'u').set(HC, to, 'u');
  return c;
}

function heldStakeView(view: 'down' | 'up' | 'right'): Grid {
  if (view === 'right') {
    // le bois sur la rangée du bas du poing (HC), la tête deux pixels derrière
    const body = lean(stakeBody(HC - 2, HELD_SIZE, HELD_SIZE, HC), HC, 3);
    return fistGap(finishBranch(body).toGrid(), HC, BRANCH_FIST);
  }
  if (view === 'down') return fistGap(finishBranch(upright(HC - 3, HC + 7, true)).toGrid(), HC, BRANCH_FIST);
  return finishBranch(upright(HC - 2, HC + 5, true)).toGrid();
}

const heldStake = (): SpriteSheetSource =>
  sheet('held-stake', HELD_SIZE, world, { down: heldStakeView('down'), up: heldStakeView('up'), right: heldStakeView('right') });

export default [img('stake-ground', stakeGround()), img('planted-stake', plantedStake()), img('item-stake', itemStake()), heldStake()];
