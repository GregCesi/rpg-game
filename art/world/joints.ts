// Les marques d'assemblage (chantier « assemblages ») : posées PAR-DESSUS une pièce de bois (`wood-piece`, art/world/wood-
// pieces.ts), transparentes sauf leurs traits. Le jeu dessine deux pièces réunies par une enture comme une seule pièce de leur
// longueur totale et pose la marque à la jonction. Ce ne sont pas des objets (ni props.json, ni fiche, ni gabarit).
//
// 1. L'enture en trait de Jupiter (`joint-scarf-<diamètre>-<sens>`) : sur la face visible, le Z de l'enture (un trait sombre
//    K d'un pixel : l'about en travers du dessus, le biseau qui descend sur la face, l'about du bas), sa clé au milieu (le
//    biseau décroché d'une rangée, la clé vue en bout : un pixel clair Y au coin haut gauche du décroché) et les chevilles (le
//    bout vu : un pixel clair Y cerné de K en bas et à droite, côté ombre ; lumière en haut à gauche).
//    Le trait K et le clair Y se lisent sur les deux matières de la pièce : l'écorce M m N (le rond) et le bois équarri Y t T
//    (la poutre ; Y s'y fond, le cerne K porte la cheville), et sur la perche grisée S A B Q.
//    - Est-ouest (`-ew`) : hauteur = `ew.h` du diamètre (gros 16, normal 10, perche 6), largeur impaire (gros 19, normal 15,
//      perche 9). Ancrage : colonne du milieu (⌊largeur / 2⌋) sur la colonne de la jonction, bas de l'image sur le bas de
//      l'image de la pièce. Ne trace que dans les rangées de bois (dessus et face), jamais dans le contour ni l'ombre.
//    - Nord-sud (`-ns`) : la règle D (docs/STYLE.md, section 8) : l'est-ouest transposé (le dessus éclairé à l'ouest, la face à
//      l'est) ; largeur = `ns.w` (gros 14, normal 10, perche 6), hauteur = la largeur de l'est-ouest (19, 15, 9). Ancrage :
//      rangée du milieu sur la rangée de la jonction, colonne 0 sur la colonne 0 de l'image de la pièce.
//    - Debout (`joint-scarf-normal-up`, le poteau : seul le normal se dresse) : l'est-ouest du normal transposé, 8 × 15.
//      Ancrage : rangée du milieu (7) sur la rangée de la jonction, colonne 0 sur la colonne 0 de l'image du poteau.
// 2. Le tenon et mortaise (`joint-peg`, 3 × 3) : le bout d'une cheville vu de face, un pixel clair cerné (N en haut et à
//    gauche, K en bas et à droite). Ancrage : son pixel central (1, 1) au point choisi par le moteur.
//
// Aperçu : `npx tsx tools/joint-marks-preview.ts` → .art-preview/joint-marks.png (les pièces de 2 m, puis de 4 m avec la
// marque posée au milieu comme le moteur la pose, à côté de Xéros).

import { Canvas, type Grid } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

/** Rangées de bois d'une pièce est-ouest (d'après son image) : le dessus [top0, face0[ et la face [face0, face1]. */
interface Band {
  /** largeur de la marque (impaire) */
  w: number;
  /** hauteur de l'image est-ouest de la pièce (`ew.h`) */
  h: number;
  top0: number;
  face0: number;
  face1: number;
  /** largeur de l'image nord-sud (`ns.w`) */
  nsW: number;
}

// Relevé sur les pièces de 2 m (composeWood) : gros, rangée 0 contour, 1-3 dessus, 4-10 face, 11 dessous K, 12 contour ;
// normal (rond et poutre), 0 contour, 1-2 dessus, 3-6 face, 7 contour ; perche, 0 contour, 1 dessus, 2-3 face, 4 contour.
const BANDS: Record<string, Band> = {
  big: { w: 19, h: 16, top0: 1, face0: 4, face1: 10, nsW: 14 },
  normal: { w: 15, h: 10, top0: 1, face0: 3, face1: 6, nsW: 10 },
  pole: { w: 9, h: 6, top0: 1, face0: 2, face1: 3, nsW: 6 },
};

/** Une cheville vue en bout : le bois de bout clair, cerné côté ombre (bas et droite). */
function peg(c: Canvas, x: number, y: number): void {
  c.set(x, y, 'Y').set(x + 1, y, 'K').set(x, y + 1, 'K');
}

/** L'enture est-ouest d'un diamètre : le Z, la clé, les chevilles. */
function scarfEW(size: string): Canvas {
  const b = BANDS[size];
  const c = new Canvas(b.w, b.h);
  const mid = Math.floor(b.w / 2);
  const xl = 1; // about de gauche
  const xr = b.w - 2; // about de droite
  // l'about de gauche : en travers du dessus, puis le haut de la face
  for (let y = b.top0; y <= b.face0; y++) c.set(xl, y, 'K');
  if (size === 'pole') {
    // la perche : 2 rangées de face, le biseau en escalier d'une marche, la clé au milieu de la marche ; deux chevilles
    // plantées par le dessus (une rangée : le cerne à droite seulement)
    for (let x = xl; x < mid; x++) c.set(x, b.face0, 'K');
    c.set(mid, b.face0, 'Y').set(mid, b.face1, 'K');
    for (let x = mid; x <= xr; x++) c.set(x, b.face1, 'K');
    c.set(3, b.top0, 'Y').set(4, b.top0, 'K').set(b.w - 3, b.top0, 'Y').set(b.w - 2, b.top0, 'K');
    return c;
  }
  // le biseau en deux moitiés, la droite décrochée d'une rangée sous la gauche : la clé est dans le décroché. Il s'arrête
  // une rangée au-dessus du bas de la face : sur le rond, le bas de la face est déjà dans l'ombre (N K) et l'avalerait.
  const yA = b.face0; // haut du biseau gauche
  const yD = b.face1 - 1; // bas du biseau droit
  const yB = Math.floor((yA + yD) / 2); // bas du biseau gauche
  const yC = yB + 1; // haut du biseau droit
  c.line(xl, yA, mid - 1, yB, 'K');
  c.line(mid + 1, yC, xr, yD, 'K');
  // la clé : son bois de bout clair dans le décroché, cerné
  c.set(mid, yB, 'Y').set(mid, yC, 'K').set(mid + 1, yB, 'K');
  // l'about de droite : jusqu'au bas de la face (le dessous est caché)
  for (let y = yD; y <= b.face1; y++) c.set(xr, y, 'K');
  // les chevilles : plantées par le dessus, dans la longueur de l'enture (entre les deux abouts), sur le dessus éclairé où
  // elles se lisent ; gros : trois, à la rangée du milieu du dessus ; normal : deux, sur la première rangée
  const py = size === 'big' ? b.top0 + 1 : b.top0;
  const xs = size === 'big' ? [4, mid, b.w - 5] : [4, b.w - 5];
  for (const x of xs) peg(c, x, py);
  return c;
}

/** La même marque transposée (règle D : la colonne x devient la rangée x), coupée à `w` colonnes. */
function transpose(g: Grid, w: number): Canvas {
  const c = new Canvas(w, g[0].length);
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (y < w && g[y][x] !== '.') c.set(y, x, g[y][x]);
  return c;
}

/** Le bout d'une cheville vu de face (tenon et mortaise) : centre en (1, 1). */
function jointPeg(): Canvas {
  const c = new Canvas(3, 3);
  c.set(1, 1, 'Y').set(1, 0, 'N').set(0, 1, 'N').set(2, 1, 'K').set(1, 2, 'K');
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export const JOINT_SIZES = Object.keys(BANDS);

export default [
  ...Object.keys(BANDS).flatMap((size) => {
    const ew = scarfEW(size);
    return [img(`joint-scarf-${size}-ew`, ew), img(`joint-scarf-${size}-ns`, transpose(ew.toGrid(), BANDS[size].nsW))];
  }),
  // le poteau : 8 colonnes (`up.w`), les rangées de bois du normal couché tombent sur ses colonnes 1 à 6
  img('joint-scarf-normal-up', transpose(scarfEW('normal').toGrid(), 8)),
  img('joint-peg', jointPeg()),
];
