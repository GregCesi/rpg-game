// Bois d'œuvre de longueur quelconque (le rondin de l'arbre normal, la poutre équarrie) : comment son image s'assemble, où
// est sa collision, où tombe une coupe. Sans Phaser. Les dessins (art/world/timber.ts : les pièces, et les images de 95 cm
// tirées d'elles) et le jeu (GameMap, qui assemble l'image d'une longueur à la volée) suivent les mêmes placements.
//
// Une image de rondin ou de poutre s'assemble en trois parties prises dans une planche par sens (`<planche>` est-ouest,
// `<planche>-ns` nord-sud) : le bout de départ (ouest ou nord), le milieu répété autant qu'il faut (le dernier exemplaire
// coupé), le bout d'arrivée (est ou sud) ; quand l'image est plus courte que ses deux bouts (30 cm), le bout d'arrivée se
// pose par-dessus celui de départ. Chaque aspect (`round`, `f1`, `f2`, `f3`, `beam` : rond, une, deux, trois faces dressées,
// poutre) a ses trois parties ; l'aspect rond a 4 images par partie (le roulement : 4 images = un tour, comme les billes).
// L'encoche d'une coupe en cours est une bande (`notch1`, `notch2` : un tiers, deux tiers, 4 images comme le rond) qui
// remplace, à sa place, les colonnes (est-ouest) ou les rangées (nord-sud) de l'image.
//
// Dans la planche, chaque partie est calée en haut à gauche de son image (cadre commun, assez grand pour la plus grande) ;
// les animations sont nommées `<aspect>-start`, `<aspect>-mid`, `<aspect>-end`, `notch1`, `notch2`.

import { CM_PER_PX } from '../content/gabarit';

export type TimberAxis = 'ew' | 'ns';
/** Aspect : rond (le rondin), une à trois faces dressées, la poutre finie. */
export type TimberLook = 'round' | 'f1' | 'f2' | 'f3' | 'beam';
export const LOOKS: readonly TimberLook[] = ['round', 'f1', 'f2', 'f3', 'beam'];
/** Images d'un aspect : 4 pour le rond (il roule), 1 pour les autres. */
export const framesOf = (look: TimberLook) => (look === 'round' ? 4 : 1);

/**
 * Est-ouest. Image de `n + 1` colonnes sur H rangées, n étant la longueur en pixels (contour compris : 95 cm = 19 px) ; la
 * colonne de plus porte le bout de l'ombre. Rangées 0 à 7 : le corps, contour compris (le bas du corps, au sol, en rangée 7) ;
 * rangées 8 et 9 : l'ombre au sol. Bouts : START colonnes à gauche, END à droite (ombre comprise), milieu de TILE colonnes.
 * Encoche : bande de NOTCH.w colonnes, dont la colonne NOTCH.at est la première à l'est de la coupe.
 */
export const EW = { h: 10, start: 5, end: 4, tile: 24, notch: { w: 5, at: 4 } } as const;

/**
 * Nord-sud. Image de W colonnes (8 de corps, contour compris, et une d'ombre) sur `nsHeight(n)` rangées (17 pour 95 cm :
 * le rond du fond, le dessus d'écorce à ½, la face de coupe aplatie, l'ombre). Bouts : START rangées en haut (le rond du
 * fond), END en bas (la face de coupe, le contour, l'ombre), milieu de TILE rangées. Le long de la pièce, 1 px de l'écran =
 * 10 cm (raccourci ½) ; la rangée BACK est celle du bout nord (0 cm). Encoche : bande de NOTCH.h rangées, dont la rangée
 * NOTCH.at est la première au sud de la coupe.
 */
export const NS = { w: 9, start: 5, end: 8, tile: 24, back: 3, notch: { h: 3, at: 2 } } as const;

/** Longueur en pixels (contour compris) d'une pièce de `cm` centimètres. */
export const lengthPx = (cm: number) => Math.round(cm / CM_PER_PX);

/** Hauteur de l'image nord-sud d'une pièce de n pixels de long : 17 pour 19 px (95 cm), 1 px de plus tous les 2 px. */
export const nsHeight = (n: number) => 17 + Math.round((n - 19) / 2);

/** Taille de l'image d'une pièce de `cm` centimètres couchée dans le sens `axis`. */
export function timberSize(axis: TimberAxis, cm: number): { w: number; h: number } {
  const n = lengthPx(cm);
  return axis === 'ew' ? { w: n + 1, h: EW.h } : { w: NS.w, h: nsHeight(n) };
}

/**
 * Collision au sol (format `body` de props.json : centrée en bas de l'image, `bottom` px au-dessus du bas) : est-ouest, la
 * longueur moins un pixel sur 6 de profondeur (30 cm) ; nord-sud, 6 de large sur la moitié de la longueur plus 3 (le dessus
 * vu à ½ et la face). Ce sont les collisions des billes de 95 cm (18 × 6, 6 × 13).
 */
export function timberBody(axis: TimberAxis, cm: number): { w: number; h: number; bottom: number } {
  const n = lengthPx(cm);
  return axis === 'ew' ? { w: Math.max(1, n - 1), h: 6, bottom: 2 } : { w: 6, h: Math.round(n / 2) + 3, bottom: 2 };
}

/** Une partie posée dans l'image : laquelle, où (colonne est-ouest, rangée nord-sud), et combien de pixels on en garde. */
export interface Placement {
  part: 'start' | 'mid' | 'end';
  at: number;
  size: number;
}

/** Les parties d'une image de `cm` centimètres, dans l'ordre où on les pose (le bout d'arrivée en dernier). */
export function placements(axis: TimberAxis, cm: number): Placement[] {
  const g = axis === 'ew' ? EW : NS;
  const { w, h } = timberSize(axis, cm);
  const total = axis === 'ew' ? w : h;
  const out: Placement[] = [{ part: 'start', at: 0, size: Math.min(g.start, total) }];
  for (let at = g.start; at < total - g.end; at += g.tile) out.push({ part: 'mid', at, size: Math.min(g.tile, total - g.end - at) });
  const end = Math.max(0, total - g.end);
  out.push({ part: 'end', at: end, size: total - end });
  return out;
}

/**
 * Où tombe dans l'image une coupe à `cm` centimètres du bout de départ (ouest, nord) : la colonne (est-ouest) ou la rangée
 * (nord-sud) qui suit la coupe.
 */
export function cutPixel(axis: TimberAxis, cm: number): number {
  return axis === 'ew' ? lengthPx(cm) : NS.back + Math.round(cm / (2 * CM_PER_PX));
}

/** Première colonne (est-ouest) ou rangée (nord-sud) de la bande d'encoche d'une coupe à `cm` du bout de départ. */
export function notchPixel(axis: TimberAxis, cm: number): number {
  return cutPixel(axis, cm) - (axis === 'ew' ? EW.notch.at : NS.notch.at);
}

/** L'inverse de `cutPixel` : la distance (cm) au bout de départ d'un point de l'image (colonne ou rangée, fractionnaire). */
export function cmAt(axis: TimberAxis, px: number): number {
  return axis === 'ew' ? px * CM_PER_PX : (px - NS.back) * 2 * CM_PER_PX;
}

/** L'aspect après `hewn` coups de doloire (`perFace` coups par face, `faces` faces) : rond, puis une face de plus par série. */
export function lookOf(hewn: number, perFace: number, faces = 4): TimberLook {
  const done = Math.min(faces, Math.floor(hewn / perFace));
  return LOOKS[Math.round((done * 4) / faces)];
}

/** Une longueur dite en mètres, au décimètre : « 2,9 m », « 3 m ». */
export function metresLabel(cm: number): string {
  return `${String(Math.round(cm / 10) / 10).replace('.', ',')} m`;
}
