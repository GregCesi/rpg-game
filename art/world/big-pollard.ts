// Têtard (trogne) : un deuxième gros arbre de la sorte `big`, court et touffu.
//
// Debout (`big-pollard`), c'est le dessin d'origine du gros arbre : `treeBody` de big-tree.ts (repère 64x96, pied en
// (33, 89)), tronc de 55 cm (le même que le gros arbre, donc la même souche), tête touffue juste au-dessus de la coupe.
// Il ne se retouche pas.
//
// Couché, il est d'un seul tenant (`big-pollard-felled-tree`, `-left`), comme le gros grand (`bigLyingArt` de
// art/world/big-felled.ts) : un tronc de sa longueur utile (`wood.length` de props.json, 2 m : une ancienne bille et la tête),
// au pixel près la pièce de bois `big` ronde que le jeu pose quand on a coupé le houppier, et le houppier du gros grand
// par-dessus, rapproché du pied de 2 m (CROWN_SHIFT).
//
// Ses étapes, ses chutes (recadrées à `tree.fall.crop` colonnes) et son ébranchage se tirent de ce dessin et de sa géométrie
// (`tree` de props.json) : art/world/trees.ts.

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { FOOT, STUMP_AT, groundShadow, shadedOutline, stump, stumpBody, treeBody } from './big-tree';
import { bigLyingArt } from './big-felled';
import { registerTree } from './tree-registry';

/** Le têtard debout, 64x96 : image `big-pollard` (le dessin d'origine du gros arbre). */
function standingPollard(): Canvas {
  const c = shadedOutline(treeBody());
  groundShadow(c, 36, 89.5, 17, 4);
  return c;
}

/** Décalage du houppier couché du têtard par rapport à celui du gros arbre : 2 m de tronc de moins (40 px). */
const CROWN_SHIFT = -40;

registerTree('big-pollard', {
  body: treeBody,
  stumpBody,
  stump,
  stumpFoot: [FOOT[0] - STUMP_AT[0], FOOT[1] - STUMP_AT[1]],
  lying: (cm, key) => bigLyingArt(cm, CROWN_SHIFT, key),
});

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('big-pollard', standingPollard())];
