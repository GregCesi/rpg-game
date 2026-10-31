// Les marques d'assemblage (chantier « assemblages ») : posées PAR-DESSUS une pièce de bois (`wood-piece`, art/world/wood-
// pieces.ts), transparentes sauf leurs traits. Le jeu dessine deux pièces réunies par une enture comme une seule pièce de leur
// longueur totale et pose la marque à la jonction. Ce ne sont pas des objets (ni props.json, ni fiche, ni gabarit).
//
// 1. L'enture en trait de Jupiter (`joint-scarf-<diamètre>-<sens>`) : les deux pièces se fondent en une seule (le jeu dessine la
//    suite entée d'un seul tenant, composeWood de toute la longueur) ; la marque n'ajoute qu'une ligne fine et discrète, le Z de
//    l'enture (l'about en travers du dessus, le biseau décroché d'une rangée au milieu qui descend sur la face, l'about du bas),
//    d'un pixel du trait translucide `-` (un cran plus sombre que le bois qu'il traverse, jamais le contour K, pas de clé), et
//    les têtes rondes des chevilles plantées par le dessus (gros : trois, normal et perche : deux) : un rond de bois de bout
//    clair ^ cerné du même trait en losange. Le trait se lit sur l'écorce M m N, le bois travaillé (la rampe des âges ^ * % &,
//    art/palette.ts `woodAges` : les marques prennent l'âge des pièces au build) et la perche S A B Q.
//    - Est-ouest (`-ew`) : hauteur = `ew.h` du diamètre (gros 16, normal 10, perche 6), largeur impaire (gros 19, normal 15,
//      perche 9). Ancrage : colonne du milieu (⌊largeur / 2⌋) sur la colonne de la jonction, bas de l'image sur le bas de
//      l'image de la pièce. Ne trace que dans les rangées de bois (dessus et face), jamais dans le contour ni l'ombre.
//    - Nord-sud (`-ns`) : la règle D (docs/STYLE.md, section 8) : l'est-ouest transposé (le dessus éclairé à l'ouest, la face à
//      l'est) ; largeur = `ns.w` (gros 14, normal 10, perche 6), hauteur = la largeur de l'est-ouest (19, 15, 9). Ancrage :
//      rangée du milieu sur la rangée de la jonction, colonne 0 sur la colonne 0 de l'image de la pièce.
//    - Debout (`joint-scarf-normal-up`, le poteau : seul le normal se dresse) : l'est-ouest du normal transposé, 8 × 15.
//      Ancrage : rangée du milieu (7) sur la rangée de la jonction, colonne 0 sur la colonne 0 de l'image du poteau.
// 2. Le tenon et mortaise (`joint-peg`, 3 × 3) : la tête ronde d'une cheville vue de face, comme celles de l'enture (^ cerné
//    du trait translucide en losange). Ancrage : son pixel central (1, 1) au point choisi par le moteur.
//
// Aperçu : `npx tsx tools/joint-marks-preview.ts` → .art-preview/joint-marks.png (et -zoom), joint-halving*.png, joint-notch.png
// (et -zoom) ; joint-marks.png : les pièces de 2 m, puis de
// 4 m avec la marque posée au milieu comme le moteur la pose, à côté de Xéros.

import { Canvas, type Grid } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { composeWood } from './wood-pieces';

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

/**
 * Le trait de l'assemblage : `-`, l'ombre portée `x` de la palette plus appuyée (38 % au lieu de 25 %), translucide : posée sur
 * le bois, elle l'assombrit d'un cran, quel qu'il soit (écorce M → entre m et N, m → N ; bois équarri Y → t ; perche grisée
 * S → B) : une ligne fine et discrète, jamais le contour sombre K. À 25 %, elle se perdait dans les taches de l'écorce. Le jeu
 * et l'aperçu composent les marques avec leur transparence.
 */
const LINE = '-';
/** La palette des marques : celle du monde, et le trait translucide (dérivé de `x`). */
const markPalette = { ...world, '-': '#2b1a1060' };

/**
 * La tête d'une cheville vue en bout : un petit rond de bois de bout clair (Y), cerné d'un cran plus sombre (le trait `x` en
 * losange autour). `flat` : la perche n'a qu'une rangée de dessus, le cerne ne se met qu'à gauche et à droite.
 */
function peg(c: Canvas, x: number, y: number, flat = false): void {
  c.set(x, y, '^').set(x - 1, y, LINE).set(x + 1, y, LINE);
  if (!flat) c.set(x, y - 1, LINE).set(x, y + 1, LINE);
}

/** L'enture est-ouest d'un diamètre : le trait de Jupiter (l'about, le biseau décroché, l'about) et les têtes des chevilles. */
function scarfEW(size: string): Canvas {
  const b = BANDS[size];
  const c = new Canvas(b.w, b.h);
  const mid = Math.floor(b.w / 2);
  const xl = 1; // about de gauche
  const xr = b.w - 2; // about de droite
  // l'about de gauche : en travers du dessus, jusqu'au haut de la face
  for (let y = b.top0; y <= b.face0; y++) c.set(xl, y, LINE);
  if (size === 'pole') {
    // la perche : 2 rangées de face, le biseau en escalier d'une marche au milieu ; deux chevilles plantées par le dessus
    for (let x = xl; x <= mid; x++) c.set(x, b.face0, LINE);
    for (let x = mid; x <= xr; x++) c.set(x, b.face1, LINE);
    peg(c, 3, b.top0, true);
    peg(c, b.w - 4, b.top0, true);
    return c;
  }
  // le biseau en deux moitiés, la droite décrochée d'une rangée sous la gauche (le décroché de la clé, sans la clé). Il
  // s'arrête une rangée au-dessus du bas de la face : sur le rond, le bas de la face est déjà dans l'ombre (N K).
  const yA = b.face0; // haut du biseau gauche
  const yD = b.face1 - 1; // bas du biseau droit
  const yB = Math.floor((yA + yD) / 2); // bas du biseau gauche
  const yC = yB + 1; // haut du biseau droit
  c.line(xl, yA, mid, yB, LINE);
  c.set(mid, yC, LINE);
  c.line(mid + 1, yC, xr, yD, LINE);
  // l'about de droite : jusqu'au bas de la face (le dessous est caché)
  for (let y = yD; y <= b.face1; y++) c.set(xr, y, LINE);
  // les têtes des chevilles : plantées par le dessus, dans la longueur de l'enture, sur le dessus éclairé où elles se lisent ;
  // gros : trois, normal : deux
  const py = b.top0 + 1;
  const xs = size === 'big' ? [5, mid, b.w - 6] : [4, b.w - 5];
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
  peg(c, 1, 1);
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
  round: { ns: 'KMMmmNNo', ew: 'KMMmmNNo', joint: 'N', endS: ['N%%**N', 'N**%*N'], endW: ['^*', '^*', '*%'] },
  beam: { ns: 'K*^^^*%o', ew: 'K^^***%o', joint: '%', endS: ['^^^^**', '^**%**'], endW: ['^^', '^*', '*%'] },
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
  // 7. la cheville, plantée par le dessus ; sur la poutre, le clair ^ se fond dans le dessus : cernée aussi à gauche (%)
  // (le mi-bois garde sa cheville opaque, l'image recouvre les deux pièces : le clair cerné de @ côté ombre, le joint du bois)
  c.set(4, 1, '^').set(5, 1, '@').set(4, 2, '@');
  if (aspect === 'beam') c.set(3, 1, '%');
  return c;
}

// 4. L'encoche (`joint-notch-normal-<dessus>-<masque>`, 10 × 18) : la cabane en rondins. Deux rondins ronds du normal (Ø 40 cm
//    contour compris) se croisent à angle droit ; celui du dessus a une encoche en creux arrondi par-dessous et s'enfonce de la
//    moitié de son diamètre dans l'autre : sa base est 20 cm (4 px) plus haut. Le jeu dessine les deux rondins entiers, puis pose
//    cette image au croisement, opaque là où les deux rondins se recouvrent (et sur les détails de l'encoche), transparente
//    ailleurs : colonne 0 sur la colonne 0 de l'image du nord-sud, rangée 0 quatre rangées au-dessus de la rangée 0 de l'image de
//    l'est-ouest.
//    - dessus : `ew` ou `ns`, le rondin du dessus ; il passe d'un tenant sur l'autre (le jeu le pose aussi, mais l'ordre de
//      profondeur des deux pièces n'est pas sûr : l'image le redit). Sa face vue (la face sud de l'est-ouest, le flanc est du
//      nord-sud, règle D) montre l'encoche : une arche qui mange la moitié basse de la face, cernée d'un trait sombre (`o`), où
//      l'on voit entrer le rondin du dessous, d'un cran plus sombre (il est dans le creux). L'ombre portée du rondin du dessus
//      tombe sur celui du dessous (la couleur d'un cran plus sombre).
//    - masque : de quels côtés un rondin continue (nord 1, est 2, sud 4, ouest 8) ; un côté sans suite est un bout qui dépasse de
//      20 cm (le bois de bout rond, dessiné par le rondin lui-même, et par l'image où il recouvre l'autre).
//    Générée en composant les vrais rondins (composeWood) comme le jeu les pose, au caractère : le dessus gagne, son ombre `x`
//    assombrit d'un cran ce qu'elle couvre. Le rondin écorcé a les siennes (`joint-notch-normal-peeled-<dessus>-<masque>`) : les
//    mêmes, composées de deux rondins écorcés.

export const NOTCH_W = 10;
export const NOTCH_H = 18;
/** Un cran plus sombre (écorce, bois de bout) : l'ombre du rondin du dessus et le creux de l'encoche. */
const SHADE: Record<string, string> = { M: 'm', m: 'N', N: 'K', K: 'K', '^': '*', '*': '%', '%': '&', '&': '@', '@': '@', o: 'o' };

/** Le croisement d'une encoche ; `peeled` : deux rondins écorcés (la cabane, le bois mis à nu à la plane). */
export function notch(top: 'ew' | 'ns', mask: number, peeled = false): Canvas {
  const CM = 5;
  const D = 40; // l'emprise du rondin, contour compris
  const OVER = 20; // le bout qui dépasse
  const LONG = 100; // un rondin qui continue
  const N = (mask & 1) !== 0;
  const E = (mask & 2) !== 0;
  const S = (mask & 4) !== 0;
  const W = (mask & 8) !== 0;
  // emprises en cm : le nord-sud en x 0..40, l'est-ouest en y 0..40 ; le dessus 20 cm plus haut
  const ex0 = W ? -LONG : -OVER;
  const ex1 = D + (E ? LONG : OVER);
  const ny0 = N ? -LONG : -OVER;
  const ny1 = D + (S ? LONG : OVER);
  const zE = top === 'ew' ? 20 : 0;
  const zN = top === 'ns' ? 20 : 0;
  // posés comme le jeu (buildLook) : centrés sur l'emprise en largeur, le bas de l'image au bord sud relevé de z
  const place = (axis: 'ew' | 'ns', bx: number, by: number, bw: number, bd: number, z: number) => {
    const g = composeWood({ size: 'normal', shape: 'round', axis, length: axis === 'ew' ? bw : bd, ...(peeled ? { peeled: true as const } : {}) }).toGrid();
    const x = Math.round((bx + bw / 2) / CM - g[0].length / 2);
    const y = Math.round((by + bd - z) / CM) - g.length;
    return { g, x, y };
  };
  const ew = place('ew', ex0, 0, ex1 - ex0, D, zE);
  const ns = place('ns', 0, ny0, D, ny1 - ny0, zN);
  const ox = ns.x;
  const oy = ew.y - 4;
  const at = (q: typeof ew, X: number, Y: number) => {
    const r = q.g[Y - q.y];
    return r === undefined ? '.' : (r[X - q.x] ?? '.');
  };
  const up = top === 'ew' ? ew : ns;
  const low = top === 'ew' ? ns : ew;
  const opaque = (ch: string) => ch !== '.' && ch !== 'x';
  const c = new Canvas(NOTCH_W, NOTCH_H);
  for (let y = 0; y < NOTCH_H; y++) for (let x = 0; x < NOTCH_W; x++) {
    const a = at(up, ox + x, oy + y);
    const b = at(low, ox + x, oy + y);
    if (a === '.' || b === '.' || (!opaque(a) && !opaque(b))) continue;
    if (opaque(a)) c.set(x, y, a);
    else if (a === 'x') c.set(x, y, SHADE[b] ?? b);
    else c.set(x, y, b);
  }
  // l'arche de l'encoche sur la face vue du rondin du dessus : `k` rangée (ou colonne) le long du rondin du dessous, `d`
  // profondeur depuis le contour bas (ou est) du rondin du dessus ; dedans, le rondin du dessous d'un cran plus sombre, et le
  // bord de l'arche en `o`
  const ARCH = [2, 3, 3, 3, 3, 2]; // profondeur de l'arche à chaque pas, le long de la largeur du rondin du dessous (6 px de bois)
  const inside = (x: number, y: number) => {
    const ch = at(low, ox + x, oy + y);
    if (opaque(ch)) c.set(x, y, SHADE[ch] ?? ch);
  };
  if (top === 'ew') {
    const bottom = ew.y + 7 - oy; // le contour bas de l'est-ouest (rangée 7 de son image)
    ARCH.forEach((d, k) => {
      const x = 1 + k; // colonnes de bois du nord-sud
      for (let i = 0; i < d; i++) inside(x, bottom - i);
      c.set(x, bottom - d, 'o');
    });
  } else {
    const right = 7; // le contour est du nord-sud (colonne 7 de son image)
    const r0 = ew.y + 1 - oy; // la première rangée de bois de l'est-ouest
    ARCH.forEach((d, k) => {
      const y = r0 + k;
      for (let i = 0; i < d; i++) inside(right - i, y);
      c.set(right - d, y, 'o');
    });
  }
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: markPalette, grid: c.toGrid() });

export const JOINT_SIZES = Object.keys(BANDS);

export default [
  ...Object.keys(BANDS).flatMap((size) => {
    const ew = scarfEW(size);
    return [img(`joint-scarf-${size}-ew`, ew), img(`joint-scarf-${size}-ns`, transpose(ew.toGrid(), BANDS[size].nsW))];
  }),
  // le poteau : 8 colonnes (`up.w`), les rangées de bois du normal couché tombent sur ses colonnes 1 à 6
  img('joint-scarf-normal-up', transpose(scarfEW('normal').toGrid(), 8)),
  img('joint-peg', jointPeg()),
  ...(['ew', 'ns'] as const).flatMap((top) => HALVING_MASKS.map((mask) => img(`joint-notch-normal-${top}-${mask}`, notch(top, mask)))),
  // les mêmes, entre deux rondins écorcés
  ...(['ew', 'ns'] as const).flatMap((top) => HALVING_MASKS.map((mask) => img(`joint-notch-normal-peeled-${top}-${mask}`, notch(top, mask, true)))),
  ...(['beam', 'round'] as const).flatMap((aspect) =>
    (['ew', 'ns'] as const).flatMap((top) => HALVING_MASKS.map((mask) => img(`joint-halving-normal-${aspect}-${top}-${mask}`, halving(aspect, top, mask)))),
  ),
];
