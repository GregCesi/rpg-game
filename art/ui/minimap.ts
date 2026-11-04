// La petite carte du HUD (chantier « petite carte », dessin de art/proposals/petite-carte-cadre.ts repris tel quel, accord écrit de
// Grégoire : « à intégrer tels quels, avec la flèche du nord et le fil du bois, sans éclaircir le biseau » ; en plus, un liseré
// clair autour du point de Xéros). Ronde, en haut à gauche de l'écran, nord en haut, calculée par le jeu (un pixel par case, ou
// plus selon le palier `MINIMAP.steps` de src/config.ts). Ce fichier ne dessine que le cadre et le point ; le disque de carte est
// calculé par le jeu. Planche de contrôle : npx tsx tools/essai-petite-carte-cadre.ts → .art-preview/petite-carte-cadre.png.
//
// CONTRAT DE POSE (tout en px du HUD ; aucune image n'est étirée)
//
// 1. Les pièces et leur taille
//    `ui-minimap-frame-<inner>` : le cadre de bois d'une fenêtre ronde de diamètre `inner` (impair), une image par diamètre
//      distinct de `MINIMAP.steps[].inner` (aujourd'hui `ui-minimap-frame-81`, 93 × 93, et `ui-minimap-frame-63`, 75 × 75) ;
//      carrée, de côté inner + 2 × FRAME_BORDER (FRAME_BORDER = 6). La fenêtre, le disque de diamètre inner centré, est vide ;
//      le cadre mord d'un pixel sur le bord de la carte : un disque de carte de diamètre inner s'y pose sans masque. Au nord,
//      une flèche de parchemin pointe vers la carte (le nord est toujours en haut).
//    `ui-minimap-dot-down`, `-up`, `-left`, `-right` : le point de Xéros, 9 × 9, centre en (4, 4) (la case de Xéros) ; corps rond
//      de parchemin, contour o, un cran du côté où il regarde, et tout autour un liseré clair d'un pixel (DOT_HALO), pour qu'il se
//      lise sur la forêt profonde comme sur le chaume.
//
// 2. L'assemblage, le cadre posé avec son coin haut gauche en (fx, fy) :
//    a. le disque de carte, de diamètre `inner`, centré dans le cadre : son coin haut gauche en (fx + FRAME_BORDER, fy + FRAME_BORDER) ;
//    b. le cadre `ui-minimap-frame-<inner>` par-dessus, en (fx, fy) ;
//    c. le point de Xéros centré sur le centre de la fenêtre : le centre de la fenêtre est
//       (fx + FRAME_BORDER + (inner − 1) / 2, fy + FRAME_BORDER + (inner − 1) / 2), le coin du point 4 px plus haut et plus à
//       gauche (DOT_CENTER). Ordre de dessin : carte, cadre, point.
//
// 3. Le dessin du cadre (un tore éclairé en haut à gauche, de la famille de l'anneau du cadran, `ring()` de art/ui/clock.ts) : le
//    bois d'écorce M m N K ; sa moitié extérieure claire au nord-ouest (biseau M) et sombre au sud-est (N), sa moitié intérieure
//    l'inverse (liseré N au nord-ouest, m au sud-est : la fenêtre est en creux) ; une lèvre K autour de la fenêtre, les joints des
//    douelles cintrées (comme un cercle de tamis), le fil du bois sur leur face, la flèche du nord en parchemin.

import { MINIMAP } from '../../src/config';
import { Canvas, EMPTY, type Palette } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

/** Les couleurs : la palette du monde (bois M m N K, parchemin a d, contour o). */
export const FRAME_PALETTE: Palette = { ...world };

/** L'épaisseur de l'anneau, en px du HUD, contour compris. */
export const FRAME_BORDER = 6;

/** La longueur d'une douelle, mesurée au milieu de l'anneau (px) : on en tire leur nombre, multiple de 4. */
const STAVE = 16;

/**
 * L'anneau de bois autour d'une fenêtre ronde de diamètre `inner` (impair).
 * Couches, depuis la fenêtre (t = distance au bord de la fenêtre, de 0 à FRAME_BORDER) :
 *   lèvre K (1 px) · liseré du creux N au nord-ouest, m au sud-est (1 px) · face de la douelle m, fil N (2 px) ·
 *   biseau M au nord-ouest, N au sud-est (1 px) · contour o (1 px).
 */
export function minimapFrame(inner: number): Canvas {
  if (inner % 2 !== 1) throw new Error(`minimapFrame : la fenêtre doit avoir un diamètre impair (${inner})`);
  const B = FRAME_BORDER;
  const size = inner + 2 * B;
  const c0 = (size - 1) / 2;
  const r0 = inner / 2 + 0.1; // le bord de la fenêtre (comme le 7,6 du cadran pour une fenêtre de 15)
  const rMid = r0 + B / 2;
  const n = Math.max(8, Math.round((2 * Math.PI * rMid) / STAVE / 4) * 4);
  const c = new Canvas(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - c0;
    const dy = y - c0;
    const d = Math.hypot(dx, dy);
    const t = d - r0;
    if (t <= 0 || t > B) continue;
    // la lumière vient du nord-ouest : lit > 0 du côté éclairé (dx, dy < 0)
    const lit = -(dx + dy) / (Math.SQRT2 * d);
    // l'angle depuis le nord, dans le sens des aiguilles d'une montre
    const a = Math.atan2(dx, -dy);
    // les joints : au milieu de l'anneau, un pixel de large ; le nord tombe au milieu d'une douelle
    const s = (((a / (2 * Math.PI)) * n + 0.5) % 1 + 1) % 1; // 0 au joint
    const arc = Math.min(s, 1 - s) * ((2 * Math.PI * rMid) / n);
    const joint = arc < 0.55;
    let k: string;
    if (t > B - 1) k = 'o';
    else if (t > B - 2) k = joint ? 'K' : lit > 0.2 ? 'M' : lit < -0.2 ? 'N' : 'm';
    else if (t > B - 3) k = joint ? 'K' : lit > 0.6 ? 'M' : lit < -0.6 ? 'N' : 'm';
    else if (t > 2) k = joint ? 'K' : 'm';
    else if (t > 1) k = joint ? 'K' : lit > 0.25 ? 'N' : 'm';
    else k = 'K';
    c.set(x, y, k);
  }
  grain(c, c0, r0, n);
  tidy(c);
  northMark(c, c0, r0);
  return c;
}

/** Pas de pixel isolé dans le modelé : un M, m ou N sans voisin de sa teinte prend la teinte la plus fréquente autour de lui. */
function tidy(c: Canvas): void {
  const ramp = 'MmN';
  const fix: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const k = c.get(x, y);
    if (!ramp.includes(k)) continue;
    const around: string[] = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) around.push(c.get(x + dx, y + dy));
    if (around.includes(k)) continue;
    const best = [...ramp].map((r) => [r, around.filter((a) => a === r).length] as const).sort((a, b) => b[1] - a[1])[0];
    if (best[1] > 0) fix.push([x, y, best[0]]);
  }
  for (const [x, y, k] of fix) c.set(x, y, k);
}

/**
 * Le fil du bois sur la face des douelles : dans chaque douelle, un trait N de quelques pixels le long de l'anneau, sur la rangée
 * intérieure ou extérieure de la face, en alternance ; sur le côté sombre (sud-est) il se fond dans l'ombre et on l'omet.
 */
function grain(c: Canvas, c0: number, r0: number, n: number): void {
  const step = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const mid = i * step; // le milieu de la douelle i (le nord est le milieu de la douelle 0)
    if (i === 0) continue; // la douelle du nord porte la flèche
    const row = i % 2 === 0 ? 2.5 : 3.5; // t de la rangée
    const r = r0 + row;
    const len = 3 + (i % 3); // 3 à 5 px
    const off = ((i * 7) % 5) - 2; // le trait n'est pas centré : -2 à 2 px
    for (let p = 0; p < len; p++) {
      const a = mid + (off + p - len / 2) / r;
      const x = Math.round(c0 + r * Math.sin(a));
      const y = Math.round(c0 - r * Math.cos(a));
      const lit = -(x - c0 + (y - c0)) / Math.SQRT2 / r;
      if (lit < -0.2) continue;
      if (c.get(x, y) === 'm') c.set(x, y, 'N');
    }
  }
}

/**
 * Le repère du nord : une petite flèche de parchemin a (ombrée d à droite), sur la face de la douelle du nord, pointe en bas,
 * vers la carte ; cernée de K comme une incrustation.
 */
function northMark(c: Canvas, c0: number, r0: number): void {
  const x0 = Math.round(c0);
  const yTop = Math.round(c0 - r0 - FRAME_BORDER) + 1; // la rangée du biseau
  // 7 de large, 4 de haut, du biseau à la lèvre : ▼ de parchemin (5, 3, 1 px), ombré d à droite, cerné de K
  const rows = ['KaaaadK', '.KaadK.', '..KaK..', '...K...'];
  rows.forEach((row, j) => [...row].forEach((k, i) => { if (k !== '.') c.set(x0 - 3 + i, yTop + j, k); }));
}

export type Facing = 'down' | 'up' | 'left' | 'right';

/** Le côté du point de Xéros, liseré compris, et son centre (la case de Xéros) : 9 × 9, centre en (4, 4). */
export const DOT_SIZE = 9;
export const DOT_CENTER = 4;

/**
 * Le liseré du point : `d`, le parchemin ombré (#d8c6a1). Plus clair que tous les sols où il passe (forêt profonde 4, eau w,
 * herbe g, chemin u, chaume t, le plus clair, #b8954f), il détache le contour o partout ; un cran sous le cœur a, le cœur reste
 * le plus clair et le point se lit comme un disque cerné, non comme une tache claire. Couleur chaude, de la famille du parchemin
 * du point et de la flèche du nord.
 */
export const DOT_HALO = 'd';

/** Le point de Xéros, 9 × 9 : corps rond de 5 px, cran d'un pixel du côté de `facing`, contour o, liseré clair DOT_HALO. */
export function playerDot(facing: Facing): Canvas {
  const c = new Canvas(DOT_SIZE, DOT_SIZE);
  const o = DOT_CENTER - 3; // le dessin d'origine, 7 × 7 centré sur (3, 3), décalé d'un pixel
  const set = (x: number, y: number, k: string): void => { c.set(x + o, y + o, k); };
  // le cœur : 3 × 3 au centre, et la pointe du cran
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) set(x, y, 'a');
  const tip: Record<Facing, [number, number]> = { up: [3, 1], down: [3, 5], left: [1, 3], right: [5, 3] };
  const [tx, ty] = tip[facing];
  set(tx, ty, 'a');
  // l'ombre du cœur, en bas à droite (trois pixels en équerre)
  for (const [x, y] of [[4, 3], [4, 4], [3, 4]] as [number, number][]) set(x, y, 'd');
  // contour o, sans les diagonales aux coins du corps (rond), mais avec elles autour de la pointe
  c.outline('o', false);
  const out: Record<Facing, [number, number][]> = {
    up: [[2, 1], [4, 1]],
    down: [[2, 5], [4, 5]],
    left: [[1, 2], [1, 4]],
    right: [[5, 2], [5, 4]],
  };
  for (const [x, y] of out[facing]) if (c.get(x + o, y + o) === EMPTY) set(x, y, 'o');
  // le liseré : un pixel tout autour du contour, cran compris (sans les diagonales : il reste rond)
  c.outline(DOT_HALO, false);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------------
// Les images
// ---------------------------------------------------------------------------------------------------------------------

const img = (name: string, cv: Canvas): ImageSource => ({ kind: 'image', name, palette: FRAME_PALETTE, grid: cv.toGrid() });

/** Les diamètres de fenêtre utilisés par le jeu (un cadre par diamètre distinct). */
export const FRAME_SIZES: number[] = [...new Set(MINIMAP.steps.map((s) => s.inner as number))].sort((a, b) => b - a);

const FACINGS: Facing[] = ['down', 'up', 'left', 'right'];

const sources: ImageSource[] = [
  ...FRAME_SIZES.map((inner) => img(`ui-minimap-frame-${inner}`, minimapFrame(inner))),
  ...FACINGS.map((f) => img(`ui-minimap-dot-${f}`, playerDot(f))),
];

export default sources;
