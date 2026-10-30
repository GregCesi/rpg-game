import { SHADOW } from '../config';
import { CM_PER_PX } from '../content/gabarit';
import type { PropDef } from '../content/types';

/**
 * Ombre portée d'un toit (`shadow` de props.json), sans Phaser : le polygone qu'elle couvre au sol, dans le repère de la
 * carte, pour une pièce dont le coin bas gauche de l'image est en (x, y).
 *
 * L'emprise au sol du toit est un rectangle : largeur `dims.w`, profondeur `dims.d` (à l'échelle du sol, comme toute
 * pièce `ground`), bord sud au bas de l'image. Chaque bord tombe au sol décalé selon sa hauteur (`south`, `north`) et la
 * lumière (`SHADOW`) : le bord nord, plus haut, part plus loin vers le sud-est, et l'ombre d'un appentis est un
 * parallélogramme un peu plus court que le toit. Coins dans l'ordre : sud-ouest, sud-est, nord-est, nord-ouest.
 */
export function roofShadow(def: PropDef, x: number, y: number): { x: number; y: number }[] {
  if (!def.shadow) return [];
  const w = def.dims.w / CM_PER_PX;
  const d = def.dims.d / CM_PER_PX;
  const zs = def.shadow.south / CM_PER_PX;
  const zn = def.shadow.north / CM_PER_PX;
  const at = (gx: number, gy: number, z: number) => ({
    x: Math.round(gx + z * SHADOW.dx),
    y: Math.round(gy + z * SHADOW.dy),
  });
  return [at(x, y, zs), at(x + w, y, zs), at(x + w, y - d, zn), at(x, y - d, zn)];
}
