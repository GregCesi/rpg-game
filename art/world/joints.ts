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

// 3. Le mi-bois (`joint-halving-normal-<aspect>-<dessus>-<masque>`, 10 × 10) : deux pièces du normal couchées, l'une est-ouest,
//    l'autre nord-sud, à la même hauteur, chacune entaillée sur la moitié de son épaisseur, l'une posée dans l'autre. Le jeu
//    dessine les deux pièces entières, puis pose cette image opaque au croisement : colonne 0 sur la colonne 0 de l'image de la
//    nord-sud, rangée 0 sur la rangée 0 de l'image de l'est-ouest. Dans l'image : la bande de l'est-ouest occupe les rangées 0 à
//    7 (0 contour ou joint, 1-2 dessus, 3-6 face, 7 contour), la nord-sud les colonnes 0 à 7 (0 contour, 1-6 bois, 7 contour) ;
//    les colonnes 8-9 sont l'est-ouest qui continue à l'est, les rangées 8-9 la nord-sud qui continue au sud.
//    - aspect : `beam` (la poutre) ou `round` (le rondin, et 1 à 3 faces) ; dessus : `ew` ou `ns`, la pièce entaillée par-dessous
//      qui traverse (son dessus passe d'un tenant, l'autre reprend de chaque côté à fleur, une ligne de joint) ;
//    - masque : de quels côtés une pièce continue (nord 1, est 2, sud 4, ouest 8). Un côté sans suite est un bout : au sud, la
//      face du croisement (la moitié haute à la pièce du dessus, la basse à celle du dessous : le bois de bout de la nord-sud) ;
//      à l'ouest, le bout de l'est-ouest (sa moitié en bois de bout) ; au nord et à l'est, le contour seul (comme les pièces).
//    - la cheville plantée par le dessus, au milieu de la nord-sud, dans la bande du dessus de l'est-ouest.

interface HalvingMat {
  /** une rangée de la nord-sud, colonnes 0 à 7 */
  ns: string;
  /** une colonne de l'est-ouest, rangées 0 à 7 */
  ew: string;
  /** la ligne de joint (à fleur) */
  joint: string;
  /** le bois de bout de la nord-sud vu au sud, colonnes 1 à 6, moitié haute puis moitié basse (deux rangées chacune) */
  endS: [string, string];
  /** le bois de bout de l'est-ouest vu à l'ouest, colonnes 1 et 2, trois rangées */
  endW: [string, string, string];
}

// relevé sur les pièces de 2 m (composeWood) : la rangée courante de la nord-sud, la colonne courante de l'est-ouest
const HALVING_MATS: Record<'beam' | 'round', HalvingMat> = {
  round: { ns: 'KMMmmNNo', ew: 'KMMmmNNo', joint: 'N', endS: ['NTTttN', 'NttTtN'], endW: ['Yt', 'Yt', 'tT'] },
  beam: { ns: 'NtYYYtTo', ew: 'KYYtttTo', joint: 'T', endS: ['YYYYtt', 'YttTtt'], endW: ['YY', 'Yt', 'tT'] },
};

export const HALVING_MASKS = Array.from({ length: 16 }, (_, i) => i);

/** Le croisement d'un mi-bois. */
export function halving(aspect: 'beam' | 'round', top: 'ew' | 'ns', mask: number): Canvas {
  const m = HALVING_MATS[aspect];
  const N = (mask & 1) !== 0;
  const E = (mask & 2) !== 0;
  const S = (mask & 4) !== 0;
  const W = (mask & 8) !== 0;
  const c = new Canvas(10, 10);
  const J = m.joint;
  // 1. l'est-ouest, comme s'il continuait : sa bande sur la nord-sud, et à l'est s'il continue
  for (let x = 0; x < (E ? 10 : 8); x++) for (let y = 0; y < 8; y++) c.set(x, y, m.ew[y]);
  // 2. la face sud du croisement quand la nord-sud s'arrête : moitié haute (3-4) à la pièce du dessus, basse (5-6) à l'autre ;
  //    le bois de bout de la nord-sud, l'est-ouest y garde sa face
  if (!S) {
    const rows = top === 'ns' ? [3, 4] : [5, 6];
    rows.forEach((y, k) => {
      for (let x = 1; x <= 6; x++) c.set(x, y, m.endS[k][x - 1]);
      c.set(0, y, W ? J : 'K');
      c.set(7, y, E ? J : 'o');
    });
  }
  // 3. le bout de l'est-ouest à l'ouest : sa moitié (haute s'il est dessus, basse sinon) en bois de bout, l'autre moitié est le
  //    flanc éclairé de la nord-sud
  if (!W) {
    const endRows = top === 'ew' ? [1, 2, 3] : [4, 5, 6];
    const flankRows = top === 'ew' ? [4, 5, 6] : [1, 2, 3];
    endRows.forEach((y, k) => c.set(1, y, m.endW[k][0]).set(2, y, m.endW[k][1]));
    for (const y of flankRows) c.set(1, y, m.ns[1]).set(2, y, m.ns[2]);
  }
  // 4. la pièce du dessus : la nord-sud passe d'un tenant (l'est-ouest reprend à fleur de part et d'autre), ou l'est-ouest passe
  //    (la nord-sud reprend au nord et au sud)
  if (top === 'ns') {
    for (let y = 0; y < 3; y++) for (let x = 0; x < 8; x++) c.set(x, y, m.ns[x]);
    for (let y = 1; y < 3; y++) c.set(0, y, W ? J : 'K').set(7, y, E ? J : 'o');
  } else if (N) {
    for (let x = 1; x <= 6; x++) c.set(x, 0, J);
    c.set(0, 0, m.ns[0]).set(7, 0, 'o');
  }
  // 5. la nord-sud qui continue au sud passe devant la face de l'est-ouest
  if (S) {
    for (let y = 3; y < 10; y++) for (let x = 0; x < 8; x++) c.set(x, y, m.ns[x]);
    if (top === 'ew') for (let x = 1; x <= 6; x++) c.set(x, 3, J);
  }
  // 6. les contours des côtés sans suite, coins arrondis d'un pixel
  if (!N) for (let x = 0; x < 8; x++) c.set(x, 0, 'K');
  // à l'ouest, le contour de l'est-ouest (K) ; où la nord-sud continue (au nord, au sud), le sien
  if (!W) for (let y = 0; y < (S ? 10 : 8); y++) c.set(0, y, (S && y >= 3) || (N && y === 0) ? m.ns[0] : 'K');
  if (!E) for (let y = 0; y < (S ? 10 : 8); y++) c.set(7, y, y === 0 && !N ? 'K' : 'o');
  if (!S) for (let x = 0; x < 8; x++) c.set(x, 7, x === 0 && !W ? 'K' : 'o');
  if (!S && E) c.set(7, 7, 'o');
  const clear = (x: number, y: number) => c.set(x, y, '.');
  if (!N && !W) clear(0, 0);
  if (!N && !E) clear(7, 0);
  if (!S && !W) clear(0, 7);
  if (!S && !E) clear(7, 7);
  // 7. la cheville, plantée par le dessus ; sur la poutre, le clair Y se fond dans le dessus : cernée aussi à gauche (T)
  peg(c, 4, 1);
  if (aspect === 'beam') c.set(3, 1, 'T');
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
  ...(['beam', 'round'] as const).flatMap((aspect) =>
    (['ew', 'ns'] as const).flatMap((top) => HALVING_MASKS.map((mask) => img(`joint-halving-normal-${aspect}-${top}-${mask}`, halving(aspect, top, mask)))),
  ),
];
