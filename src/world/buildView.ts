// L'image d'une pièce posée en mode construction (Phaser) : la clé de son image dans son sens, sa forme naturelle et son tirage, et
// où la poser à l'écran (world/build.ts dit la boîte, ici on la projette). Commun aux pièces posées (GameMap) et au fantôme
// (systems/build.ts).

import type Phaser from 'phaser';
import { items, props } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { BuildPlaced } from '../content/types';
import { variantImage } from '../content/views';
import { boxOf } from './build';
import { formView, naturalGround } from './natural';
import { lookOf, upOf } from './woodShape';
import { woodTexture } from './woodTexture';

/** L'image d'une pièce : sa texture (et son image dans une planche), et le coin bas gauche où la poser, en pixels du monde. */
export interface BuildLook {
  key: string;
  frame?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * L'image d'une pièce posée : un objet du monde dans sa vue (sa forme naturelle, son tirage), un objet possédable par son image au
 * sol, la pièce de bois assemblée à ses réglages. Le bas de l'image est au bord sud de l'emprise relevé de sa hauteur (y − z), et
 * l'image est centrée sur l'emprise en largeur ; la pièce de bois debout a sous son pied des rangées vides (le dé), qui descendent
 * d'autant.
 */
export function buildLook(scene: Phaser.Scene, p: BuildPlaced): BuildLook {
  const has = (k: string) => scene.textures.exists(k);
  let key: string;
  let frame: string | undefined;
  let lift = 0;
  if ('wood' in p.piece) {
    key = woodTexture(scene, p.piece.wood);
    frame = '0';
    if (p.piece.wood.axis === 'up') lift = upOf(p.piece.wood.size, lookOf(p.piece.wood)).lift;
  } else if ('item' in p.piece) {
    key = naturalGround(items[p.piece.item], p.view, p.natural, has);
  } else {
    const def = props[p.piece.prop];
    key = formView(variantImage(def.image, p.variant), def.views, p.view, p.natural, has);
  }
  // une planche (le feu qui brûle) : sa première image
  const t = scene.textures.get(key);
  if (frame === undefined && t.frameTotal > 2) frame = t.getFrameNames()[0];
  const f = scene.textures.getFrame(key, frame);
  const b = boxOf(p);
  const x = Math.round((b.x + b.w / 2) / CM_PER_PX - f.width / 2);
  const y = Math.round((b.y + b.d - b.z) / CM_PER_PX) + lift;
  return { key, frame, x, y, w: f.width, h: f.height };
}
