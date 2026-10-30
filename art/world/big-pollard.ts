// Têtard (trogne) : un deuxième gros arbre de la sorte `big`, court et touffu.
//
// Debout (`big-pollard`), c'est le dessin d'origine du gros arbre : `treeBody` de big-tree.ts (repère 64x96, pied en
// (33, 89)), tronc de 55 cm (le même que le gros arbre, donc la même souche), tête touffue juste au-dessus de la coupe.
// Il ne se retouche pas.
//
// Couché, il réutilise telles quelles les pièces du gros arbre (art/world/big-felled.ts) : `big-felled-section-1`,
// puis `big-felled-crown` posé bout à bout, deux sections (2 × SEC = 38 px) plus près du pied que chez le gros arbre.
// Deux pièces, donc deux billes (`big-felled-log-1`, puis la tête ébranchée `big-felled-head` donne `big-felled-log-4`).
// Sa longueur couchée, du pied au bout du houppier, est sa hauteur debout : 74 px (370 cm).
//
// Chutes (`big-pollard-fall`, `big-pollard-fall-left`) : même mécanique que celles du gros arbre (pivot autour de la
// charnière sur la souche, lumière ramenée au nord-ouest), mais tirées de `treeBody`. Première image : `big-pollard`
// posé ; dernière : la souche et les deux pièces, exactement comme le jeu les pose (props.json, `spawns`). Les images
// sont composées dans la frame 160x96 des pièces couchées, puis recadrées à POLLARD_W colonnes : côté gauche de la
// frame pour la chute à droite, côté droit pour la chute à gauche.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { FOOT, STUMP_AT, groundShadow, shadedOutline, stump, treeBody } from './big-tree';
import { FALL_H, FALL_W, FRAMES, OFF, OFF_L, PIECES, PIECES_L, SEC, type Faller, crownRows, fallFrame, pivot, pivotLeft } from './big-felled';

/** Le têtard debout, 64x96 : image `big-pollard` (le dessin d'origine du gros arbre). */
export function standingPollard(): Canvas {
  const c = shadedOutline(treeBody());
  groundShadow(c, 36, 89.5, 17, 4);
  return c;
}

/** Ce qui tombe : le haut de `treeBody`, coupé à la rangée 76 (comme le gros arbre, rangées du repère 64x96). */
const POLLARD: Faller = { body: treeBody, cut: 76, crown: crownRows(treeBody()) };

/** Décalage du houppier couché du têtard par rapport à celui du gros arbre : deux sections de moins. */
export const CROWN_SHIFT = -2 * SEC;

/** Largeur des images des chutes du têtard (recadrées dans la frame de 160) : tout l'arbre couché et son ombre. */
const POLLARD_W = 126;
/** Première colonne de la frame de 160 gardée par la chute à gauche. */
const LEFT_FROM = FALL_W - POLLARD_W;

/** Recadre une image de la frame (160 de large) aux colonnes [from, from + POLLARD_W), en vérifiant que rien n'est coupé. */
function crop(c: Canvas, from: number, what: string): Canvas {
  const out = new Canvas(POLLARD_W, c.h);
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    const p = c.get(X, Y);
    if (p === EMPTY) continue;
    if (X < from || X >= from + POLLARD_W) throw new Error(`big-pollard : ${what} déborde du cadre de ${POLLARD_W} px en (${X}, ${Y})`);
    out.px[Y][X - from] = p;
  }
  return out;
}

/** Dernière image : la souche, la section 1, puis le houppier décalé, posés comme le jeu les pose (même ordre). */
function lying(left: boolean): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  c.stamp(stump().toGrid(), STUMP_AT[0] + (left ? OFF_L : OFF), STUMP_AT[1]);
  const [section, crown] = left ? [PIECES_L[0], PIECES_L[3]] : [PIECES[0], PIECES[3]];
  const shift = left ? -CROWN_SHIFT : CROWN_SHIFT;
  for (const [p, dx] of [[section, 0], [crown, shift]] as const) {
    // garde-fou : une ombre translucide posée sur un pixel déjà peint donnerait en jeu un mélange que `stamp` ne rend pas
    for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
      const under = c.get(X + dx, Y);
      if (p.get(X, Y) === 'x' && under !== EMPTY) throw new Error(`big-pollard : ombre d'une pièce sur un pixel peint en (${X + dx}, ${Y})`);
    }
    c.stamp(p.toGrid(), dx, 0);
  }
  return c;
}

const FOOT_X = FOOT[0] + OFF;
const FOOT_XL = FOOT[0] + OFF_L;
const DY = 0; // les images de la chute ont la hauteur de l'arbre debout : la frame des pièces, sans décalage

const right = [
  new Canvas(FALL_W, FALL_H).stamp(standingPollard().toGrid(), OFF, 0),
  fallFrame(pivot(10, POLLARD, DY), [[FOOT_X + 3, 89.5, 17, 4], [FOOT_X + 9, 90, 16, 3.5]], OFF, POLLARD, FALL_H),
  fallFrame(pivot(45, POLLARD, DY), [[FOOT_X + 3, 89.5, 14, 3.5], [FOOT_X + 30, 90.5, 21, 4]], OFF, POLLARD, FALL_H),
  lying(false),
].map((c, i) => crop(c, 0, `image ${i + 1} de la chute à droite`));

const left = [
  new Canvas(FALL_W, FALL_H).stamp(standingPollard().toGrid(), OFF_L, 0),
  fallFrame(pivotLeft(10, POLLARD, DY), [[FOOT_XL + 3, 89.5, 17, 4], [FOOT_XL - 5, 90, 16, 3.5]], OFF_L, POLLARD, FALL_H),
  fallFrame(pivotLeft(45, POLLARD, DY), [[FOOT_XL + 3, 89.5, 14, 3.5], [FOOT_XL - 24, 90.5, 21, 4]], OFF_L, POLLARD, FALL_H),
  lying(true),
].map((c, i) => crop(c, LEFT_FROM, `image ${i + 1} de la chute à gauche`));

/**
 * Données pour props.json (repère : coin bas gauche de l'image `big-pollard` posée), calculées : décalage x de chaque
 * planche, place de la section 1 et du houppier (ceux du gros arbre, le houppier décalé de CROWN_SHIFT).
 */
export const POLLARD_LAYOUT = {
  fall: { x: -OFF, left: { x: -(OFF_L - LEFT_FROM) }, foot: FOOT[0] },
  section: { x: FRAMES[0].x - OFF, y: FRAMES[0].y + FRAMES[0].h - FALL_H },
  crown: { x: FRAMES[3].x - OFF + CROWN_SHIFT, y: FRAMES[3].y + FRAMES[3].h - FALL_H },
};

const sheet = (name: string, frames: Canvas[]): SpriteSheetSource => ({
  kind: 'spritesheet',
  name,
  frameW: POLLARD_W,
  frameH: FALL_H,
  palette: world,
  animations: { fall: { frames: frames.map((f) => f.toGrid()), frameRate: 6, repeat: 0 } },
});

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('big-pollard', standingPollard()),
  sheet('big-pollard-fall', right),
  sheet('big-pollard-fall-left', left),
];
