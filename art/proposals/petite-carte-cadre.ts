// Proposition (chantier « petite carte ») : le cadre de bois et le point de Xéros de la petite carte du HUD. Hors jeu : rien ici
// ne se déclare dans art/index.ts ; la planche de contrôle tools/essai-petite-carte-cadre.ts les pose sur un remplissage d'essai
// (.art-preview/petite-carte-cadre.png), à côté du cadran de l'heure et de Xéros.
//
// La petite carte : ronde, en haut à gauche de l'écran, nord en haut, calculée par le jeu (un pixel par case de 1,60 m). Le jeu
// pose le contenu de la carte centré, puis le cadre par-dessus (tout en px du HUD, 640 × 360, agrandi ×2 à l'écran).
//
// 1. Le cadre, `minimapFrame(inner)` : image carrée de côté inner + 2 × FRAME_BORDER (inner impair : 63, 81, 125) ; la fenêtre,
//    le disque de diamètre inner centré, reste vide (le cadre mord d'un pixel sur le bord de la carte : un disque de carte de
//    diamètre inner s'y pose sans masque). Il est de la famille de l'anneau du cadran (`ring()` de art/ui/clock.ts) : le bois
//    d'écorce M m N K, un tore éclairé en haut à gauche — sa moitié extérieure claire au nord-ouest (biseau M) et sombre au
//    sud-est (N), sa moitié intérieure l'inverse (liseré N au nord-ouest, m au sud-est : la fenêtre est en creux) — avec, en plus,
//    ce que permet sa taille : une lèvre K tout autour de la fenêtre, les joints des douelles (le cadre est fait de douelles
//    cintrées, comme un cercle de tamis), un fil du bois sur leur face, et au nord une flèche de parchemin qui pointe vers la carte.
//    Épaisseur : FRAME_BORDER = 6 px (le cadran en a 4 : la carte est trois à cinq fois plus grande).
//
// 2. Le point de Xéros, `playerDot(facing)` : 7 × 7, centré sur (3, 3) ; un corps rond de 5 px (cœur de parchemin a de 3 px, ombré
//    d en bas à droite, contour o) et un cran d'un pixel du côté où il regarde (le cœur qui s'allonge en pointe). Seul le cran tourne
//    ; l'ombre du cœur reste en bas à droite dans les quatre sens.

import { Canvas, EMPTY, type Palette } from '../lib/canvas';
import { world } from '../palette';

/** Les couleurs : la palette du monde (bois M m N K, parchemin a, contour o). */
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

/** Le point de Xéros, 7 × 7 : corps rond de 5 px, cran d'un pixel du côté de `facing`. */
export function playerDot(facing: Facing): Canvas {
  const c = new Canvas(7, 7);
  // le cœur : 3 × 3 au centre, et la pointe du cran
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) c.set(x, y, 'a');
  const tip: Record<Facing, [number, number]> = { up: [3, 1], down: [3, 5], left: [1, 3], right: [5, 3] };
  const [tx, ty] = tip[facing];
  c.set(tx, ty, 'a');
  // l'ombre du cœur, en bas à droite (trois pixels en équerre)
  for (const [x, y] of [[4, 3], [4, 4], [3, 4]] as [number, number][]) c.set(x, y, 'd');
  // contour o, sans les diagonales aux coins du corps (rond), mais avec elles autour de la pointe
  c.outline('o', false);
  const out: Record<Facing, [number, number][]> = {
    up: [[2, 1], [4, 1]],
    down: [[2, 5], [4, 5]],
    left: [[1, 2], [1, 4]],
    right: [[5, 2], [5, 4]],
  };
  for (const [x, y] of out[facing]) if (c.get(x, y) === EMPTY) c.set(x, y, 'o');
  return c;
}
