// Gabarit : la règle commune de dimensions et de perspective (docs/STYLE.md, section « Gabarit »).
// Tirée des billes (big-felled-log, big-felled-log-ns, art/world/big-felled.ts), vérifiée sur Xéros, la mère et les cases du sol.
//
// - 5 cm par pixel, sur les trois axes : largeur (est-ouest), hauteur (verticale), profondeur au sol (nord-sud).
// - Le sol se voit à plat : une case de 32 px fait 1,60 m sur 1,60 m ; empreinte, collisions, écarts entre objets
//   se comptent au sol à 5 cm par pixel (deux billes voisines d'un tas sont à 11 px l'une de l'autre).
// - Une face tournée vers le sud se voit en vraie grandeur (largeur × hauteur).
// - Un dessus (face horizontale) et une face vue en raccourci (est ou ouest, le bout d'une bille est-ouest) se
//   dessinent à la moitié de leur profondeur : RACCOURCI.
// - Ancrage : le bas de la silhouette (hors ombre portée) est le bord sud de l'objet au sol ; l'ombre `x` est en dessous.
// - Une taille à l'écran se mesure sur la silhouette, contour compris, ombre portée et lueurs exclues ; les dimensions
//   réelles aussi se comptent contour compris (la bille : 95 cm de long, 65 de diamètre).
// - La face de coupe d'un cylindre couché nord-sud se dessine aplatie, pour qu'on lise l'objet couché : FACE_NS.
// - Plancher de lisibilité : un objet de moins de LISIBLE px de large peut être agrandi jusqu'à LISIBLE px, pas au-delà
//   (en gardant ses proportions). Les personnages gardent leur largeur stylisée : seule leur hauteur suit le gabarit.
// - Pièce de bâtiment qui relie des appuis posés au sol (sablière nord-sud, chevron, couverture : `ground`) : sa
//   profondeur se voit à l'échelle du sol, sans raccourci, pour qu'elle rejoigne ses poteaux posés à leur place.
//
// Mesures des références (silhouette, contour compris) :
// - big-felled-log (est-ouest, 95 × 65 cm) : 19 × 13 ; bouts ovales de 5 px de large pour 11 de haut (≈ 11 × ½).
// - big-felled-log-ns (nord-sud) : 13 × 19 ; dessus d'écorce de 10 px entre les deux ronds (95 cm × ½ = 9,5) ; face de
//   coupe en ovale de 11 × 7 (FACE_NS = 7/11).
// - Xéros : 32 px de haut (1,60 m) ; la mère : 34 px (1,70 m).

import type { Grid, Palette } from '../../art/lib/canvas';

/** Centimètres par pixel, sur les trois axes. */
export const CM_PER_PX = 5;

/** Coefficient des dessus et des faces vues en raccourci (est, ouest) : la moitié de leur profondeur. */
export const RACCOURCI = 0.5;

/** Aplatissement de la face de coupe d'un cylindre couché nord-sud (celle des billes : ovale de 11 × 7 px). */
export const FACE_NS = 7 / 11;

/** Plancher de lisibilité : largeur à l'écran jusqu'à laquelle un objet plus étroit peut être agrandi, en pixels. */
export const LISIBLE = 6;

/** Écart toléré entre la taille attendue et la taille dessinée, en pixels (au-delà : refusé par validate.ts). */
export const TOLERANCE = 2;

/**
 * Formes de base. `box` : une boîte. `cylinder` : couché est-ouest (`axis: 'ew'`, w = longueur, d = h = diamètre),
 * couché nord-sud (`'ns'`, d = longueur, w = h = diamètre) ou debout (`'up'`, w = d = diamètre, h = hauteur).
 * `flat` : posé à plat sur le sol (tache, éclats), vu comme le sol, sans raccourci.
 */
export type Shape = 'box' | 'cylinder' | 'flat';
export type Axis = 'ew' | 'ns' | 'up';

/** Dimensions réelles d'un objet, en centimètres : largeur (est-ouest), profondeur (nord-sud), hauteur. */
export interface Dims { w: number; d: number; h: number; shape: Shape; axis?: Axis; ground?: boolean }

/**
 * Taille attendue de la silhouette à l'écran, en pixels (non arrondie) : `w` × `h` à la taille réelle, jusqu'à
 * `wMax` × `hMax` pour un objet étroit agrandi jusqu'au plancher de lisibilité (sinon, les mêmes).
 */
export function expectedSize(dims: Dims): { w: number; h: number; wMax: number; hMax: number } {
  const real = realSize(dims);
  const k = Math.max(1, LISIBLE / real.w);
  return { ...real, wMax: real.w * k, hMax: real.h * k };
}

/** Taille à l'écran à la taille réelle, en pixels. */
function realSize(dims: Dims): { w: number; h: number } {
  const W = dims.w / CM_PER_PX;
  const D = dims.d / CM_PER_PX;
  const H = dims.h / CM_PER_PX;
  if (dims.shape === 'flat') return { w: W, h: D };
  // couché est-ouest : le rond du bout, de diamètre H, cisaillé par le dessus raccourci : √(1 + ¼) ≈ 1,12
  if (dims.shape === 'cylinder' && dims.axis === 'ew') return { w: W, h: H * Math.hypot(1, RACCOURCI) };
  // couché nord-sud : la face de coupe au sud, aplatie, et le dessus qui fuit vers le nord, raccourci de moitié
  if (dims.shape === 'cylinder' && dims.axis === 'ns') return { w: W, h: H * FACE_NS + D * RACCOURCI };
  // pièce de bâtiment qui relie des appuis posés au sol : sa profondeur à l'échelle du sol, comme les cases
  if (dims.ground) return { w: W, h: H + D };
  // boîte, cylindre debout (dessus en ovale D × D/2) : la face sud en vraie grandeur, le dessus raccourci de moitié
  return { w: W, h: H + D * RACCOURCI };
}

/** Une couleur est-elle translucide (ombre portée `x`, lueur) ? Elle ne compte pas dans la silhouette. */
function translucent(hex: string): boolean {
  return hex.length === 9 && parseInt(hex.slice(7), 16) < 255;
}

/** Silhouette d'une image : le cadre de ses pixels opaques (contour compris, ombre et lueurs exclues). */
export function silhouette(grid: Grid, palette: Palette): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || translucent(palette[ch])) return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  return x1 < 0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
