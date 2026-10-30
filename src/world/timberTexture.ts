// L'image d'un rondin ou d'une poutre de longueur quelconque, assemblée à la volée dans une texture de Phaser à partir des
// parties dessinées (planches `<sheet>` et `<sheet>-ns`, art/world/timber.ts), selon les placements de `timberShape.ts`
// (les mêmes que pour les images de 95 cm tirées au build). Une texture par pièce différente (sens, aspect, longueur,
// encoche), gardée tant que le jeu tourne ; l'aspect rond a ses 4 images de roulement, nommées '0' à '3'.

import type Phaser from 'phaser';
import { EW, NS, framesOf, notchPixel, placements, timberSize, type TimberAxis, type TimberLook } from './timberShape';

/** Encoche dessinée : sa place (cm depuis le bout de départ) et sa profondeur (1 : un tiers, 2 : deux tiers). */
export interface NotchLook {
  cm: number;
  depth: number;
}

/** Clé de la texture d'une pièce, assemblée au premier besoin. Ses images : '0' (et '1' à '3' pour le rond). */
export function timberTexture(scene: Phaser.Scene, sheet: string, axis: TimberAxis, look: TimberLook, cm: number, notch?: NotchLook): string {
  const key = `timber:${sheet}:${axis}:${look}:${cm}${notch ? `:n${notch.depth}@${notch.cm}` : ''}`;
  if (scene.textures.exists(key)) return key;
  const src = axis === 'ew' ? sheet : `${sheet}-ns`;
  const { w, h } = timberSize(axis, cm);
  const count = framesOf(look);
  const tex = scene.textures.createCanvas(key, w * count, h)!;
  const ctx = tex.getContext();
  const part = (anim: string, k: number) => scene.anims.get(`${src}-${anim}`).frames[k].frame;
  const draw = (f: Phaser.Textures.Frame, dx: number, dy: number, sw: number, sh: number) =>
    ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, sw, sh, dx, dy, sw, sh);
  for (let k = 0; k < count; k++) {
    const ox = k * w;
    for (const pl of placements(axis, cm)) {
      const f = part(`${look}-${pl.part}`, k);
      if (axis === 'ew') draw(f, ox + pl.at, 0, pl.size, Math.min(h, f.cutHeight));
      else draw(f, ox, pl.at, Math.min(w, f.cutWidth), pl.size);
    }
    if (notch) {
      // la bande d'encoche remplace les colonnes (rangées) qu'elle couvre : le bois retiré y reste transparent
      const f = part(`notch${notch.depth}`, k);
      const at = notchPixel(axis, notch.cm);
      if (axis === 'ew') {
        const from = Math.max(0, at);
        const to = Math.min(w, at + EW.notch.w);
        ctx.clearRect(ox + from, 0, to - from, h);
        ctx.drawImage(f.source.image as CanvasImageSource, f.cutX + (from - at), f.cutY, to - from, h, ox + from, 0, to - from, h);
      } else {
        const from = Math.max(0, at);
        const to = Math.min(h, at + NS.notch.h);
        ctx.clearRect(ox, from, w, to - from);
        ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY + (from - at), w, to - from, ox, from, w, to - from);
      }
    }
    tex.add(String(k), 0, ox, 0, w, h);
  }
  tex.refresh();
  return key;
}
