// L'image d'une pièce de bois, assemblée à la volée dans une texture de Phaser à partir des parties dessinées (planches
// `<sheet>` et `<sheet>-ns` de son diamètre, art/world/wood-pieces.ts), par les opérations de `woodShape.ts` (`composeOps`, les
// mêmes que pour les images de 1 m tirées au build). Une texture par pièce différente (diamètre, aspect, sens, longueur, encoche,
// coin et fente), gardée tant que le jeu tourne ; le rond a ses 4 images de roulement, nommées '0' à '3'. Et la pièce portée :
// par le bout de face et de dos (sa planche `held-…`), en long de profil, assemblée à sa longueur.

import type Phaser from 'phaser';
import type { WoodPiece } from '../content/types';
import { composeOps, framesOf, lookDef, lookOf, sizeOf, woodSize, type ComposeOpts } from './woodShape';

/** Couleur de l'ombre au sol (`x` de la palette `world`) : ôtée de la pièce portée, qui ne touche pas le sol. */
const SHADOW_RGBA = [0x2b, 0x1a, 0x10, 0x40] as const;

/** Clé décrivant une pièce et ce qu'on en montre : la même pièce donne la même texture. */
function keyOf(piece: WoodPiece, open: boolean): string {
  const { size, length, axis, notch, wedge } = piece;
  return [
    'wood',
    size,
    lookOf(piece),
    axis,
    length,
    notch ? `n${notch.hits}@${notch.at}` : '',
    wedge ? `w${wedge.end}${wedge.hits}` : '',
    open ? 'open' : '',
  ].join(':');
}

/** Dessine les opérations d'une pièce dans `ctx`, décalées de `ox` (l'image de roulement `frame`). */
function paint(scene: Phaser.Scene, ctx: CanvasRenderingContext2D, piece: WoodPiece, ox: number, opts: ComposeOpts): void {
  const { axis } = piece;
  const src = axis === 'ew' ? sizeOf(piece.size).sheet : `${sizeOf(piece.size).sheet}-ns`;
  const { w, h } = woodSize(piece.size, lookOf(piece), axis, piece.length);
  for (const op of composeOps(piece, opts)) {
    if (op.kind === 'clear') {
      if (axis === 'ew') ctx.clearRect(ox + op.at, 0, op.size, h);
      else ctx.clearRect(ox, op.at, w, op.size);
      continue;
    }
    const f = scene.anims.get(`${src}-${op.anim}`).frames[op.frame].frame;
    // la part de la partie posée : [0, size[ le long de la pièce, rognée par `clip` (la fente déjà ouverte) et par l'image
    const from = Math.max(op.at, op.clip?.[0] ?? -Infinity, 0);
    const to = Math.min(op.at + op.size, op.clip?.[1] ?? Infinity, axis === 'ew' ? w : h);
    if (to <= from) continue;
    const image = f.source.image as CanvasImageSource;
    if (axis === 'ew') ctx.drawImage(image, f.cutX + (from - op.at), f.cutY, to - from, Math.min(h, f.cutHeight), ox + from, 0, to - from, Math.min(h, f.cutHeight));
    else ctx.drawImage(image, f.cutX, f.cutY + (from - op.at), Math.min(w, f.cutWidth), to - from, ox, from, Math.min(w, f.cutWidth), to - from);
  }
}

/**
 * Clé de la texture d'une pièce posée, assemblée au premier besoin. Ses images : '0' (et '1' à '3' pour le rond qui peut rouler).
 * `open` : le bois grand ouvert du dernier coup de masse (une image).
 */
export function woodTexture(scene: Phaser.Scene, piece: WoodPiece, open = false): string {
  const key = keyOf(piece, open);
  if (scene.textures.exists(key)) return key;
  const { w, h } = woodSize(piece.size, lookOf(piece), piece.axis, piece.length);
  const count = piece.wedge || open ? 1 : framesOf(lookOf(piece));
  const tex = scene.textures.createCanvas(key, w * count, h)!;
  const ctx = tex.getContext();
  for (let k = 0; k < count; k++) {
    paint(scene, ctx, piece, k * w, { frame: k, open });
    tex.add(String(k), 0, k * w, 0, w, h);
  }
  tex.refresh();
  return key;
}

/**
 * Clé de la texture d'une pièce portée devant Xéros, dans le sens de la marche : `down` et `up`, par le bout (les vues de la
 * planche `held` de son aspect, qui ne dépendent pas de la longueur) ; `right`, en long, la pièce est-ouest assemblée à sa
 * longueur, sans son ombre au sol, rognée à son corps (son centre est la prise).
 */
export function heldWoodTexture(scene: Phaser.Scene, wood: WoodPiece): string {
  const piece: WoodPiece = { size: wood.size, length: wood.length, shape: wood.shape, axis: 'ew', ...(wood.hewn ? { hewn: wood.hewn } : {}) };
  const key = `held:${keyOf(piece, false)}`;
  if (scene.textures.exists(key)) return key;
  const held = lookDef(piece.size, lookOf(piece)).held;
  const view = (dir: string) => scene.anims.get(`${held}-${dir}`).frames[0].frame;
  const down = view('down');
  const up = view('up');
  // la pièce en long, sur un brouillon : on ôte l'ombre, puis on rogne aux pixels du corps
  const { w, h } = woodSize(piece.size, lookOf(piece), 'ew', piece.length);
  const draft = document.createElement('canvas');
  draft.width = w;
  draft.height = h;
  const dctx = draft.getContext('2d')!;
  paint(scene, dctx, piece, 0, {});
  const data = dctx.getImageData(0, 0, w, h);
  let [x0, y0, x1, y1] = [w, h, -1, -1];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const px = data.data;
    if (px[i] === SHADOW_RGBA[0] && px[i + 1] === SHADOW_RGBA[1] && px[i + 2] === SHADOW_RGBA[2] && Math.abs(px[i + 3] - SHADOW_RGBA[3]) <= 1) px[i + 3] = 0;
    if (px[i + 3] === 0) continue;
    [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  }
  dctx.putImageData(data, 0, 0);
  const rw = x1 - x0 + 1;
  const rh = y1 - y0 + 1;
  const tex = scene.textures.createCanvas(key, down.cutWidth + up.cutWidth + rw, Math.max(down.cutHeight, up.cutHeight, rh))!;
  const ctx = tex.getContext();
  ctx.drawImage(down.source.image as CanvasImageSource, down.cutX, down.cutY, down.cutWidth, down.cutHeight, 0, 0, down.cutWidth, down.cutHeight);
  ctx.drawImage(up.source.image as CanvasImageSource, up.cutX, up.cutY, up.cutWidth, up.cutHeight, down.cutWidth, 0, up.cutWidth, up.cutHeight);
  ctx.drawImage(draft, x0, y0, rw, rh, down.cutWidth + up.cutWidth, 0, rw, rh);
  tex.add('down', 0, 0, 0, down.cutWidth, down.cutHeight);
  tex.add('up', 0, down.cutWidth, 0, up.cutWidth, up.cutHeight);
  tex.add('right', 0, down.cutWidth + up.cutWidth, 0, rw, rh);
  tex.refresh();
  return key;
}
