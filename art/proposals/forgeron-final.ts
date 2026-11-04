// Proposition : le forgeron du village, le dessin final (chantier « forgeron », essai hors jeu ; rien ici n'est déclaré dans
// art/index.ts). Planche : npx tsx tools/essai-forgeron-final.ts écrit .art-preview/forgeron-final.png.
//
// Ce qu'il assemble (décisions de Grégoire) :
// - le corps et les cheveux de la variante C, « le géant » (art/proposals/forgeron-colosse.ts) : cheveux blonds lâchés, rejetés
//   en arrière, rasé avec la moustache blonde, tablier de cuir sur le torse nu, brassards de cuir aux deux avant-bras ;
// - la tête T1, « le rectangle », avec le menton M2, « en avant » (art/proposals/forgeron-tetes.ts) ;
// - le portrait 64 px : `portrait('T1', 'M2')` (art/proposals/forgeron-tetes-portraits.ts), tel quel.
//
// Les trois vues, frame 32 × 48, pieds à y=45 (semelles à y=44, leur contour à y=45), comme Xéros et la mère :
// - de face (`down`) : `head('T1', 'down', 'M2')` tel quel (le corps de C sous la tête). 39 px de haut (y=7 à 45, 1,95 m),
//   28 px de large contour compris (x=2 à 29 : deltoïdes et poings), 15 px la tête ;
// - de profil (`right` ; la gauche est son miroir) : NEUF. La tête T1/M2 de profil (rangées de forgeron-tetes.ts, recopiées
//   ici, le fichier ne les exporte pas), sur un corps de profil refait à la carrure de C à partir de celui de A : le bras côté
//   spectateur plus épais d'un pixel (8 px de matière du deltoïde à l'avant-bras, poing de 8 px), le deltoïde qui monte jusqu'aux
//   trapèzes (y=23), la poitrine haute qui pousse la bavette d'un pixel en avant (y=24-25) puis rentre sous le pectoral, la
//   lanière de la taille à y=26 comme de face. 39 px de haut, 21 px de large contour compris (x=8 à 28) ;
// - de dos (`up`) : NEUF. La silhouette exacte de face (tête T1, deltoïdes, bras, poings et brassards de C), les cheveux de C vus
//   de dos (des mèches rejetées en arrière, séparées par des traits d'ombre qui glissent d'un pixel : l'ondulation ; elles
//   couvrent la nuque et s'étalent en pointes sur les trapèzes, y=22-24), le dos nu, les deux lanières du tablier en V jusqu'au
//   nœud aux reins (y=26), les pans du nœud, le fond du pantalon entre les bords du tablier (repris de A, élargi d'un pixel de
//   chaque côté à la taille de C). 39 px de haut, 28 px de large contour compris (x=2 à 29).
// Toutes les vues tiennent dans 30 px de large (frame de 32). La collision visée : 14 × 8 px aux pieds (70 × 40 cm), centrée
// sous lui (x=9 à 22, y=38 à 45 de la frame), comme les bottes de face (x=8 à 23 contour compris).
//
// Les couleurs sont celles de l'essai 3 (`palette`, rampes `ramps` de forgeron-colosse.ts) : aucune teinte nouvelle.

import { Canvas, selOut, type Grid } from '../lib/canvas';
import { SPECS, W, H, palette as smithPalette } from './forgeron-colosse';
import { head } from './forgeron-tetes';
import { portrait } from './forgeron-tetes-portraits';

export const palette: Record<string, string> = smithPalette;

export type Facing = 'down' | 'up' | 'right';

type Spec = [number, string][];
/** Haut de la matière (le contour du sommet est à y=7). */
const TOP = 8;

const DARK: Record<string, string> = {
  Y: 'd', H: 'd', h: 'd', d: 'd',
  w: 'D', s: 'D', S: 'D', D: 'D',
  A: 'Q', a: 'Q', q: 'Q', Q: 'Q',
  p: 'n', P: 'n', n: 'n',
  K: 'm', k: 'm', m: 'm',
};

/** Les jambes et les bottes de face et de dos (y=34 à 44), celles de A et de C. */
const LEGS_FRONT: Spec = SPECS['C-down-loose'].slice(26);
/** Les jambes et les bottes de profil (y=34 à 44), celles de A. */
const LEGS_SIDE: Spec = SPECS['A-right-loose'].slice(26);

// ---------- De dos ----------
// La tête a la silhouette de T1 de face (matière x=11 à 19, puis 10 à 20, puis 9 à 21 jusqu'au menton) ; de dos, tout est
// cheveux. Les mèches, rejetées en arrière, descendent de la couronne : un reflet (Y) par mèche, des traits d'ombre (d) presque
// verticaux qui glissent d'une colonne tous les trois ou quatre rangs, comme de face et de profil.
const BACK_HEAD: Spec = [
  [11, 'HHYHHdHhd'], // y=8 : la couronne
  [10, 'hHHYHHdHYhd'],
  [9, 'hHHYHHdHHYhdd'],
  [9, 'hHYHHdhHHYhdd'], // y=11
  [9, 'hHYHdhHHYhhdd'],
  [9, 'hHYHdhHYhhdhd'],
  [9, 'hHYhdHHYhhdhd'], // les traits glissent d'un pixel : l'ondulation
  [9, 'hYHhdHHYhdhhd'],
  [9, 'hYHhdHYhhdhhd'],
  [9, 'hYhdHHYhhdhhd'], // y=17
  [9, 'hHYhdHYhhdhdd'],
  [9, 'hHYhdHYhhdhdd'],
  [9, 'dhHYhdHYhdhhd'], // y=20 : la nuque, sous les cheveux
  [10, 'hHYhdHHYhdh'], // y=21 : les cheveux se resserrent sur la nuque (une encoche de contour de chaque côté, comme sous la mâchoire de face)
];

const BACK_BODY: Spec = [
  [6, 'wsshHYhdHHYhdhHhdSSD'], // y=22 : les cheveux s'étalent sur les trapèzes (x=9 à 22)
  [3, 'swwwsshdHhdshYhdshhdSSSSSD'], // y=23 : les deltoïdes de C ; les pointes, séparées par la peau
  [3, 'sssSSoshdQshhdsdQSSSoSSSSD'], // y=24 : les dernières pointes ; les lanières sortent dessous (x=12 et 19)
  [3, 'sssSS.ssswQsSSSQSSSD.SSSSD'], // y=25 : le V des lanières ; les flancs ; un pixel d'air aux aisselles, comme de face
  [4, 'sSSD..QQQQQAqQQQQQ..SSSD'], // y=26 : le nœud aux reins, sur la lanière de la taille (x=10 à 21)
  [3, 'wsssSS.aaaqPqQPqqqQ.ssSSSD'], // les pans du nœud ; le fond du pantalon entre les bords du tablier
  [3, 'aAAaqQ.aaaqPqQPqqqQ.aaaqqQ'], // y=28 : les brassards, aux deux avant-bras
  [3, 'wsssSD.aaaqPPPPqqqQ.sSSSSD'],
  [3, '.sSSD.aaaqPPPPPPqqqQ.SSSD.'], // les poignets
  [3, 'wsssS.qqqqPPPPPPqqqQ.ssSSD'], // y=31 : les poings ; l'ourlet
  ...SPECS['C-down-loose'].slice(24, 26), // y=32-33 : les poings, le haut du pantalon (le même de dos)
];

// ---------- De profil (vers la droite) ----------
// La tête T1 avec le menton M2 : rangées y=8 à 22 de forgeron-tetes.ts (SIDE_TOP, T1_SIDE, CHIN_ROWS.M2.right), recopiées.
const SIDE_HEAD: Spec = [
  [15, 'hHYYHHd'], // y=8
  [14, 'hHYHHYHHd'],
  [13, 'hHYHdHHYHHd'],
  [13, 'hYhdHYHHhws'], // y=11 : la racine haute, le front droit
  [12, 'hYhdHHHYhwss'],
  [12, 'hHhdhHhdshhs'], // le sourcil droit ; la mèche devant l'oreille
  [13, 'dYhSShhsSsss'], // l'oreille ; la paupière ; l'arête du nez
  [13, 'hdYsDhhsossw'], // l'œil
  [12, 'hYhdSShdwssssS'], // y=16 : la pommette ; le nez fort
  [13, 'dHYDsdsssssSD'], // le dessous du nez ; le bord arrière de la mâchoire
  [14, 'hYDsssssHHh'], // la moustache courte
  [13, 'dhYDssssssSs'],
  [12, 'hYhdDssssswsD'], // y=20 : le creux sous la lèvre (M2)
  [13, 'dYhDSSSSssswS'], // y=21 : la bosse du menton avance (M2)
  [10, 'hYhdhsSSDDDQSSS'], // y=22 : le dessous du menton ; son ombre portée sur le cou
];

// Le corps de profil à la carrure de C. Colonnes : x=9 à 12 le dos (et les pointes des cheveux en haut), x=13 le bord arrière
// du bras (ombre D), x=14 à 21 le bras côté spectateur (8 px : le deltoïde, le biceps, l'avant-bras et son brassard), x=22 son
// bord avant, x=23-24 la poitrine, x=25 à 27 la bavette du tablier.
const SIDE_BODY: Spec = [
  [9, 'dhYhDwwwwsssSQQQAq'], // y=23 : le haut du deltoïde, rond, jusqu'aux trapèzes ; l'ombre du menton sur la poitrine
  [9, 'hdssDwwsssssSDssAAq'], // y=24 : la poitrine haute pousse la bavette en avant (x=27)
  [9, 'sssSDwssssSSSDSSAAq'], // le pectoral, son ombre dessous
  [9, 'QQQQDwsssSSSSDDDAq'], // y=26 : la lanière de la taille passe derrière le bras ; le ventre rentre sous le pectoral
  [9, 'aaaqDwssssssSDqaAq'], // l'avant-bras de 8 px ; le tablier enveloppe la hanche
  [9, 'aaaqQaAAaaaqqQqaAq'], // y=28 : le brassard
  [9, 'aaaqDssssssSSDqaAq'],
  [9, 'aaaqqDsssSSSDqqaAq'], // le poignet
  [9, 'qqqqqDwssssSSDqqqQ'], // y=31 : le poing ; l'ourlet
  [12, 'pDssssSSSSDn'], // y=32 : le poing, gros, devant la cuisse
  [12, 'pPSSSSSSDDPn'],
];

function rows(facing: Exclude<Facing, 'down'>): Spec {
  const all = facing === 'up' ? [...BACK_HEAD, ...BACK_BODY, ...LEGS_FRONT] : [...SIDE_HEAD, ...SIDE_BODY, ...LEGS_SIDE];
  if (all.length !== 37) throw new Error(`forgeron-final : la vue ${facing} a ${all.length} rangées, il en faut 37 (y=8 à 44)`);
  return all;
}

function finish(s: Spec, shadowW: number): Grid {
  const c = new Canvas(W, H);
  s.forEach(([x, row], i) => c.stamp([row], x, TOP + i));
  c.outline('o');
  c.within('.', (cc) => cc.ellipse(16.5, 45.5, shadowW, 2, 'x'));
  return selOut(c.toGrid(), DARK);
}

/** Le forgeron, frame 32 × 48, pieds à y=45 : de face, de dos, de profil droit (la gauche est son miroir). */
export function smithFinal(facing: Facing): Grid {
  if (facing === 'down') return head('T1', 'down', 'M2');
  return finish(rows(facing), facing === 'right' ? 6 : 9);
}

/** Le portrait 64 px du forgeron : tête T1, menton M2, les cheveux de C. */
export function portraitFinal(): { grid: Grid; pal: Record<string, string> } {
  return portrait('T1', 'M2');
}

/** La silhouette d'une vue (hors ombre portée) : première et dernière colonne, première et dernière rangée. */
export function bounds(g: Grid): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  g.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === 'x') return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  return { x0, x1, y0, y1 };
}
