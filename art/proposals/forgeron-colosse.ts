// Proposition : le forgeron du village, essai 3, « le colosse » (chantier « forgeron », CADRAGE-forgeron.md sections 2 à 4).
// Essai hors jeu : rien ici n'est déclaré dans art/index.ts. Planches : npx tsx tools/essai-forgeron.ts écrit
// .art-preview/forgeron-variantes.png (A, B, C de face) et .art-preview/forgeron-vues.png (A de face, de profil, de dos).
//
// Qui : le forgeron, une trentaine d'années, un colosse calme et bienveillant. Ce qui avait raté (art/proposals/forgeron.ts) :
// l'essai 1 féminin, l'essai 2 un bloc de 18 px de large, vieux et dur. Ici :
// - 1,95 m : 39 px de haut contour compris (y=7 à y=45 dans une frame de 32 × 48, pieds à y=45 comme Xéros et la mère).
// - La silhouette en V : les épaules débordent (deltoïdes ronds, 26 à 28 px d'un bout à l'autre, bras compris), la taille
//   rentre (le tablier aux hanches : 16 à 18 px), les jambes solides mais moins larges que le haut. Frame 32 × 48 : tout tient
//   dans 28 px.
// - Les bras décollés : une colonne de contour (le pli de l'aisselle, le flanc) entre le bras et le torse du deltoïde au
//   biceps, puis de l'air (une colonne d'herbe) au coude et le long de la taille ; avant-bras plus larges que le haut du bras,
//   brassards de cuir, poings de 4 px posés à l'écart des hanches.
// - Le cou de taureau, aussi large que la mâchoire, dans l'ombre du menton ; les trapèzes en pente jusqu'aux épaules.
// - La poitrine en tonneau : la bavette du tablier (8 px) plus étroite que la poitrine (16 px), les pectoraux nus de part et
//   d'autre, leur ombre dessous ; les flancs nus jusqu'à la lanière de la taille.
// - La grosse tête (14 px de large contour compris, Xéros 12) : visage de 10 px, carré, mâchoire dont l'angle se lit par
//   l'ombre du cou dessous, nez fort, paupières calmes (une rangée de paupière sur l'œil : un regard posé, jamais froncé),
//   moustache blonde ; aucune ride, aucune joue creuse.
// - Les cheveux blond doré, en mèches : chaque mèche a son reflet (Y), sa teinte et son ombre (d) qui la sépare de la voisine ;
//   ils tombent jusqu'aux épaules, les pointes ondulent sur les trapèzes et le haut de la poitrine.
//
// Construction : chaque vue est écrite à la main en matière seule (pas de contour), rangée par rangée, sous la forme [colonne
// de départ, pixels] ; le contour d'un pixel est ajouté autour (Canvas.outline), puis passé côté lumière dans la teinte la plus
// sombre de chaque matière (selOut, comme Xéros et la mère). Un vide d'un ou deux pixels entre deux volumes (bras et torse,
// les deux jambes) devient donc une ligne de contour ; trois pixels de vide laissent voir le sol entre deux lignes. La lumière
// vient d'en haut à gauche : la moitié droite et le côté droit de chaque volume sont dans l'ombre.
//
// Les couleurs nouvelles (`palette` ci-dessous : peau hâlée, blond doré, cuir du tablier, toile du pantalon, bottes) iront dans
// art/palette.ts, nommées, quand le forgeron sera intégré au jeu ; elles sont exportées aussi rampe par rampe (`ramps`), pour
// le portrait 64 px.

import { Canvas, selOut, type Grid } from '../lib/canvas';
import { OUTLINE } from '../palette';

export const W = 32;
export const H = 48;
/** Haut de la matière (le contour est une rangée au-dessus, y=7) ; les semelles sont à y=44, leur contour à y=45. */
const TOP = 8;

/**
 * Les rampes du forgeron, de la plus claire à la plus sombre. À l'intégration : art/palette.ts.
 * - `skin`, la peau hâlée (le feu et le soleil) : plus brune et plus chaude que celle de Xéros, la lumière vers le jaune, l'ombre
 *   vers le brun-violet ;
 * - `gold`, le blond doré des cheveux et de la moustache : plus chaud et plus orangé que le chaume (Y t T P) de l'essai 2, un
 *   reflet presque crème par mèche ;
 * - `leather`, le cuir épais du tablier et des brassards : un brun-roux sombre, nettement plus sombre que la peau ;
 * - `canvas`, la toile sombre du pantalon : un brun-gris, plus froid que le cuir pour qu'on lise où finit le tablier ;
 * - `boots`, les bottes de cuir (celles de Xéros, une teinte de plus pour la lumière).
 */
export const ramps = {
  skin: { light: '#f1c597', base: '#d69c6c', shade: '#ae7350', deep: '#7e4b37' },
  gold: { light: '#f6e2a0', base: '#e3b65c', shade: '#be8a36', deep: '#835a26' },
  leather: { light: '#a0653b', base: '#7d4a2b', shade: '#5c3420', deep: '#3e2218' },
  canvas: { light: '#5f5650', base: '#49423f', deep: '#332d2f' },
  boots: { light: '#6e4c34', base: '#4f3626', deep: '#35241b' },
} as const;

export const palette: Record<string, string> = {
  o: OUTLINE,
  // blond doré : Y reflet, H mèche au jour, h mèche, d ombre entre les mèches (et contour côté lumière)
  Y: ramps.gold.light,
  H: ramps.gold.base,
  h: ramps.gold.shade,
  d: ramps.gold.deep,
  // peau hâlée : w lumière, s peau, S ombre, D ombre profonde (dessous du menton, plis, contour côté lumière)
  w: ramps.skin.light,
  s: ramps.skin.base,
  S: ramps.skin.shade,
  D: ramps.skin.deep,
  // cuir du tablier et des brassards
  A: ramps.leather.light,
  a: ramps.leather.base,
  q: ramps.leather.shade,
  Q: ramps.leather.deep,
  // toile du pantalon
  p: ramps.canvas.light,
  P: ramps.canvas.base,
  n: ramps.canvas.deep,
  // bottes
  K: ramps.boots.light,
  k: ramps.boots.base,
  m: ramps.boots.deep,
  x: '#00000038', // ombre au sol (celle de Xéros)
};

/** Contour côté lumière : teinte la plus sombre de chaque matière. */
const DARK: Record<string, string> = {
  Y: 'd', H: 'd', h: 'd', d: 'd',
  w: 'D', s: 'D', S: 'D', D: 'D',
  A: 'Q', a: 'Q', q: 'Q', Q: 'Q',
  p: 'n', P: 'n', n: 'n',
  K: 'm', k: 'm', m: 'm',
};

export type Variant = 'A' | 'B' | 'C';
export type Facing = 'down' | 'up' | 'right';
export type Hair = 'loose' | 'tied';

/** Une rangée : [colonne de départ dans la frame, pixels]. Les rangées se suivent depuis y=TOP. */
type Spec = [number, string][];

// ---------- A, « le chêne » : de face ----------
// Matière de x=3 à x=28 (26 px, 28 contour compris). Tête x=10 à 21 (12 px, 14 contour compris), visage x=11 à 20, yeux en
// x=13 et 18 (y=16). Deltoïdes x=3-7 et 24-28, torse x=8 à 23 à la poitrine, x=10 à 21 à la taille ; poings x=3-6 et 25-28.


const A_FRONT_HEAD_LOOSE: Spec = [
  [12, 'HHdYHhhd'], // y=8 : les mèches partent de la raie (x=14), chacune avec son reflet allongé (Y)
  [11, 'HHHdYHhdhd'],
  [10, 'hHHHdYHhdhhd'],
  [10, 'hHHdHYHhhdhd'], // les traits d'ombre (d) entre les mèches, presque verticaux, glissent d'un pixel
  [10, 'hHdwsHYHhdhd'], // le front à gauche de la raie ; la grande mèche passe sur le front
  [10, 'hHswssHYhdhd'],
  [10, 'HsSSssshSSsd'], // sourcils doux ; la pointe de la mèche
  [10, 'YssDssssDsSd'], // paupières ; la longue mèche du côté gauche, au jour
  [10, 'YssoswSsoSSh'], // yeux ; l'arête du nez
  [9, 'hHswsssDsSSSdh'], // le bout du nez ; les cheveux s'écartent vers les épaules
  [9, 'hHsssHHhhsSSdh'], // la moustache blonde, nette
  [9, 'hYsshsSSsdSSdh'], // ses pointes ; la lèvre (S) : un air paisible
  [9, 'hHDssswssSSDdh'], // le menton rasé, clair ; une ombre d'un pixel sous chaque angle de la mâchoire
];

// Cheveux attachés (queue basse à la nuque) : le même dessus et la mèche du front ; sur les côtés, les cheveux tirés en arrière
// dégagent les oreilles (x=10 et 21) ; rien ne tombe sur les épaules.
const A_FRONT_HEAD_TIED: Spec = [
  ...A_FRONT_HEAD_LOOSE.slice(0, 6),
  [10, 'dsSSssshSSsd'],
  [10, 'SssDssssDsSD'], // oreilles
  [10, 'SssoswSsoSSD'],
  [11, 'swsssDsSSS'],
  [11, 'sssHHhhsSS'],
  [11, 'sshsSSsdSS'],
  [11, 'DssswssSSD'],
];

// Le corps : y=21 à 33 le haut (cou, épaules, poitrine, bras jusqu'aux poings), y=34 à 40 les jambes, y=41 à 44 les bottes.
const A_FRONT_BODY: Spec = [
  [7, 'hHhHSQsssSSSQSdhdh'], // y=21 : le cou de taureau, les lanières ; les pointes des cheveux sur les trapèzes
  [4, 'wwshHhHsQwsssSSQSdhdhSSD'], // les épaules
  [3, 'swwsDhYhsAAaaaaaqSdhdDSSSD'], // deltoïdes, le haut de la bavette, les pectoraux
  [3, 'swssoDhDDAaaaaaaqDDdDosSSD'], // l'aisselle, le dessous des pectoraux
  [3, 'ssSS..ssSAaaaaaaqSSD..SSSD'], // biceps ; les flancs nus
  [4, 'sSD....QAaaaaaaqQ....SSD'], // coudes : de l'air entre le bras et la taille ; la lanière de la taille
  [3, 'wssSS...AaaaaaaaqQ...sSSSD'], // avant-bras
  [3, 'aAaqQ...AaaaqaaaqQ...aaqqQ'], // brassards
  [3, 'sssSD..AaaaaqaaaaqQ..sSSSD'], // le tablier s'élargit aux hanches
  [3, '.sSD..AaaaaaqaaaaqqQ..SSD.'], // poignets
  [3, 'wssS..qqqqqqqqqqqqqQ..sSSD'], // poings ; l'ourlet, à mi-cuisse
  [3, 'sssS...ppppP..pPPPn...SSSD'], // pantalon
  [3, 'SSSD...ppppP..pPPPn...SDDD'],
  [10, 'ppppP..pPPPn'],
  [10, 'ppppP..pPPPn'],
  [10, 'ppppP..pPPPn'],
  [10, 'ppppP..pPPPn'],
  [10, 'pppPP..pPPnn'],
  [10, 'pppPP..PPPnn'],
  [10, 'pppPP..PPPnn'],
  [9, 'KKKKKk..KKKkkk'], // bottes
  [9, 'KKKkkk..KKkkkm'],
  [9, 'kkkkkk..kkkkmm'],
  [9, 'mmmmmm..mmmmmm'],
];

/** Le haut du corps sans les pointes des cheveux (cheveux attachés), rangées y=21 à 24. */
const A_FRONT_SHOULDERS_TIED: Spec = [
  [7, 'ssssSQsssSSSQSSSSS'],
  [4, 'wwssswssQwsssSSQSSSSSSSD'],
  [3, 'swwsDswswAAaaaaaqSSSSDSSSD'],
  [3, 'swssoDDDDAaaaaaaqDDDDosSSD'],
];

// ---------- A : de dos ----------
// La même silhouette. Cheveux lâchés : des mèches en bandes allongées, séparées par des traits d'ombre presque verticaux qui
// glissent d'un pixel tous les trois ou quatre rangs (une ondulation légère), un reflet allongé par mèche ; les pointes tombent
// sur le haut du dos. Le dos nu : les deux lanières du tablier passent sur les épaules et descendent en V jusqu'au nœud aux
// reins (x=15-16, y=26), dont les deux pans pendent ; le cuir revient sur les flancs, le fond du pantalon entre.

const A_BACK_HEAD_LOOSE: Spec = [
  [12, 'HYHHdhhd'],
  [11, 'HHYHdHYhdd'],
  [10, 'HHYhdHYhdhdd'],
  [10, 'HYhdHYhdhhdd'],
  [10, 'HYhdHYhdhhdd'],
  [10, 'HYhdHYhdhhdd'],
  [10, 'hHYhdHHhdhhd'], // les traits glissent d'un pixel : l'ondulation
  [10, 'hHYhdHHhdhhd'],
  [10, 'hHYhdHHhdhhd'],
  [9, 'hHYhdHHhdhhhdd'],
  [9, 'hHYhdHHhdhhhdd'],
  [9, 'hYhdHHhdhhdhdd'],
  [9, 'hYhdHHhdhhdhdd'],
];

// Cheveux attachés : tirés vers la nuque, les oreilles dégagées, le lien de cuir (y=19), la queue entre les omoplates (x=15-16).
const A_BACK_HEAD_TIED: Spec = [
  ...A_BACK_HEAD_LOOSE.slice(0, 5),
  [10, 'HYhdHYhdhhdd'],
  [10, 'hHYhdHHhdhhd'],
  [10, 'SHYhdHHhdhhD'], // oreilles
  [10, 'SHYhdHHhdhhD'],
  [11, 'hYhdHYhdhd'],
  [11, 'shhdHYhdhS'],
  [11, 'ssSQAqQSSD'], // le lien
  [11, 'sssSHdSSSD'], // la queue
];

const A_BACK_SHOULDERS_LOOSE: Spec = [
  [7, 'sshYhdHHhdhhdhddSS'],
  [4, 'wwssshYhdhHhdhhdhdSSSSSD'],
  [3, 'swwsDshhdshhdshdSdSSSDSSSD'], // les pointes, séparées
  [3, 'swssosshdQshdssdQSSSDosSSD'], // les lanières sortent dessous
];

const A_BACK_SHOULDERS_TIED: Spec = [
  [7, 'ssssssssHdSSSSSSSS'],
  [4, 'wwsssssQsssHdSSSQSSSSSSD'], // les lanières passent sur les épaules
  [3, 'swwsDsssQsssHdSSSQSSSDSSSD'],
  [3, 'swssosswsQsshdSSQSSSDosSSD'], // le bout de la queue
];

const A_BACK_BODY: Spec = [
  [3, 'ssSS..ssswQsSSSQSSSD..SSSD'], // y=25 : le V des lanières ; les flancs
  [4, 'sSD....QQQQAqQQQQ....SSD'], // le nœud aux reins
  [3, 'wssSS...aaqPqQPqqQ...sSSSD'], // les pans du nœud ; le fond du pantalon entre les bords du tablier
  [3, 'aAaqQ...aaqPqQPqqQ...aaqqQ'],
  [3, 'sssSD..aaaqPPPPqqqQ..sSSSD'],
  [3, '.sSD..aaaqPPPPPPqqqQ..SSD.'],
  [3, 'wssS..qqqqPPPPPPqqqQ..sSSD'],
  ...A_FRONT_BODY.slice(11),
];

// ---------- A : de profil (vers la droite) ----------
// Matière de x=8 à x=26 (21 px contour compris). Le tonneau de profil : les trapèzes épais du cou au dos (x=8-9), la poitrine
// bombée vers l'avant (la bavette en x=25-26), le ventre plat qui rentre sous la lanière. Le nez fort (x=25, y=17), l'œil en
// x=21, l'oreille en x=16-17, l'angle de la mâchoire en x=16 (y=20), le menton en x=23-24. Le bras côté spectateur (x=15 à 21),
// gros et porté vers l'avant, bordé d'ombre ; le tablier enveloppe la hanche ; jambes épaisses, la pointe des bottes devant.

const A_SIDE_HEAD_LOOSE: Spec = [
  [13, 'hHYHHHhd'], // y=8
  [12, 'hHYYHHHHhd'],
  [11, 'hHHYHHYHHHhd'],
  [10, 'hHHdHYHHhHHhd'],
  [10, 'hHdhHYHhdHHHhd'], // les mèches du front
  [10, 'hHdhHYhhdHhdws'],
  [10, 'hHdhHYhdswssss'], // la tempe ; les mèches tombent derrière l'oreille
  [9, 'hhHdhHYSDsssDsss'], // l'oreille, la paupière, l'arcade
  [9, 'hhHdhHYSDswsosss'], // l'œil
  [10, 'hHdhHhSSssssssss'], // le nez fort
  [10, 'hHdhHhsssSssHHh'], // la moustache
  [9, 'hhHdhHhSssSsshsS'], // sa pointe, la lèvre
  [9, 'hhHdhHhDsssssssD'], // la mâchoire, son angle (x=16), le menton
  [10, 'hHdhHhsSSSSD'], // le cou épais, l'ombre sous la mâchoire
];

const A_SIDE_HEAD_TIED: Spec = [
  ...A_SIDE_HEAD_LOOSE.slice(0, 6),
  [11, 'HdhHYhdswssss'],
  [10, 'hdhHYhSDsssDsss'],
  [9, 'hQhdhHhSDswsosss'], // le lien
  [9, 'hQdhdsSSsssssssss'],
  [9, 'Hd.sssssssSssHHh'], // la queue, derrière la nuque nue
  [9, 'hd.ssssSssSsshsS'],
  [9, 'Hd.ssssDsssssssD'],
  [9, 'hd.sssssSSSSD'],
];

const A_SIDE_BODY_LOOSE: Spec = [
  [8, 'hhHdhHhsssssSSQSSD'], // y=22 : les trapèzes épais ; les cheveux sur le haut du dos ; la lanière monte au cou
  [8, 'hdhHdhDwwwsssSDQSAq'], // le deltoïde, porté vers l'avant ; la poitrine bombée, la bavette devant
  [8, 'dhdhdsDwsssssSDssAq'], // les pointes des cheveux
];
const A_SIDE_BODY_TIED: Spec = [
  [9, 'Hd.ssssssssSSQSSD'],
  [9, 'hd.ssDwwwsssSDQSAq'],
  [10, 'd.ssDwsssssSDssAq'],
];

const A_SIDE_BODY: Spec = [
  [9, 'ssssSDwsssSSSDDDAq'], // y=25 : le dessous du pectoral
  [9, 'QQQQQDssssSSSDQQAq'], // le coude ; la lanière passe derrière le bras
  [9, 'aaaaqDwssssSSDqaAq'], // l'avant-bras ; le tablier enveloppe la hanche
  [9, 'aaaaqQaAaaaqqQqaAq'], // le brassard
  [9, 'aaaaqDssssSSSDqaAq'],
  [9, 'aaaaqqDsSSSDqqaaAq'], // le poignet
  [9, 'qqqqqqwsssSSDqqqqQ'], // le poing ; l'ourlet
  [12, 'pPPsssSSSDPn'],
  [12, 'pPPSSSSDDPPn'],
  [12, 'ppPnpppPPPn'], // jambes épaisses
  [12, 'ppPnpppPPPn'],
  [12, 'ppPnpppPPPn'],
  [12, 'ppPnpppPPPn'],
  [12, 'pPPnppPPPPn'],
  [12, 'pPPnppPPPPn'],
  [12, 'pPPnppPPPPn'],
  [12, 'KKKKKKKKKkk'], // bottes, la pointe devant
  [12, 'KKKKkkkkkkkm'],
  [12, 'kkkkkkkkkkkmm'],
  [12, 'mmmmmmmmmmmmm'],
];

// ---------- B, « le bœuf » : de face ----------
// Le plus trapu, le moins en V : le cou le plus large (x=10 à 21), la taille presque aussi large que la poitrine (x=8 à 23 à
// la lanière : le tonneau), les bras collés de plus près (une seule colonne d'ombre, pas d'air). La tête la plus large (14 px
// de matière), le visage de 12 px. Cheveux plus longs, passés les épaules (les pointes sur la poitrine, y=24) ; une mèche barre
// le front en biais jusqu'au sourcil droit.

const B_FRONT: Spec = [
  [11, 'HHYHdHhhhd'], // y=8
  [10, 'HHHYHdHYhhhd'],
  [9, 'hHHHYHdHYhhhdd'],
  [9, 'hHHYHHHdHYhhdd'],
  [9, 'hHwsHHYHHdhhdd'], // la mèche qui barre le front part de la gauche
  [9, 'hHswssHHYHhhdd'],
  [9, 'HssSSsssSHYssd'], // elle finit sur le sourcil droit
  [9, 'HsssDssssDsSSd'],
  [9, 'YsssoswSsoSSSd'],
  [8, 'hYswssssDsSSSSdh'], // les joues pleines
  [8, 'hHssssHHhhsSSSdh'], // la moustache
  [8, 'hYssshsSSsdSSSdh'],
  [8, 'hHDsssswssSSSDdh'], // le menton rasé
  [7, 'hHhSQsssssSSSQSdhd'], // y=21 : le cou le plus large
  [4, 'wwshHhsQwsssssSSQShhdSSD'],
  [3, 'swwsHhdsAAaaaaaaaqShHdSSSD'], // les cheveux passent les épaules
  [3, 'swsSoDhDAaaaaaaaaqDhDoSSSD'],
  [3, 'sSSD.ssSAaaaaaaaaqSSD.SSSD'],
  [4, 'sSD.QQAaaaaaaaaaaqQQ.SSD'], // la taille large
  [3, 'wssSS.AaaaaaaaaaaqqQ.sSSSD'],
  [3, 'aAaqQ.AaaaaaqaaaaqqQ.aaqqQ'],
  [3, 'sssSD.AaaaaaqaaaaqqQ.sSSSD'],
  [3, '.sSD..AaaaaaqaaaaqqQ..SSD.'],
  [3, 'wssS..qqqqqqqqqqqqqQ..sSSD'],
  [3, 'sssS..ppppPP..pPPPnn..SSSD'],
  [3, 'SSSD..ppppPP..pPPPnn..SDDD'],
  [9, 'ppppPP..pPPPnn'],
  [9, 'ppppPP..pPPPnn'],
  [9, 'ppppPP..pPPPnn'],
  [9, 'ppppPP..pPPPnn'],
  [9, 'pppPPP..PPPnnn'],
  [9, 'pppPPP..PPPnnn'],
  [9, 'pppPPP..PPPnnn'],
  [8, 'KKKKKKk..KKKkkkk'],
  [8, 'KKKkkkk..KKkkkkm'],
  [8, 'kkkkkkk..kkkkkmm'],
  [8, 'mmmmmmm..mmmmmmm'],
];

// ---------- C, « le géant tranquille » : de face ----------
// La tête la plus grosse (14 px de matière, 14 rangées), les cheveux rejetés en arrière : des mèches qui montent du front, deux
// mèches qui retombent devant les oreilles (x=10 et 21) jusqu'à la mâchoire. La poitrine haute (la bavette commence à y=23), les
// bras les plus gros (deltoïdes et avant-bras de 6 px, poings de 5).

const C_FRONT: Spec = [
  [11, 'HHYHdHHhhd'], // y=8 : les cheveux rejetés en arrière
  [10, 'hHHYHdHYhhhd'],
  [9, 'hHHHYHdHYhhhdd'],
  [9, 'hHHHYHdHYhhhdd'],
  [9, 'hHhHwsssssHhdd'], // le front dégagé
  [9, 'hHwsssssssSShd'],
  [9, 'dHsSSsssSSSShd'], // sourcils doux
  [9, 'dYssDssssDSShd'], // paupières ; les deux mèches devant les oreilles
  [9, 'dYssoswSsoSShd'], // yeux
  [9, 'dHswsssDsSSShd'], // le nez
  [9, 'dHssssSDsSSShd'],
  [9, 'dHsssHHhhsSShd'], // la moustache
  [9, 'dYsshsSSsdSShd'],
  [9, 'hdDssswssSSDdh'], // le menton rasé, la mâchoire
  [6, 'wsssSsQssssSSQSSSSSD'], // y=22 : le cou, les trapèzes
  [3, 'swwwssDwsAAaaaaaqSSDSSSSSD'], // deltoïdes de 6 px ; la poitrine haute
  [3, 'sssSSoDDDAaaaaaaqDDDoSSSSD'],
  [3, 'sssSS.ssSAaaaaaaqSSD.SSSSD'],
  [4, 'sSSD..QQAaaaaaaqQQ..SSSD'],
  [3, 'wsssSS.AaaaaaaaaqqQ.ssSSSD'], // avant-bras de 6 px
  [3, 'aAAaqQ.AaaaaqaaaqqQ.aaaqqQ'],
  [3, 'wsssSD.AaaaaqaaaqqQ.sSSSSD'],
  [3, '.sSSD.AaaaaaqaaaaqqQ.SSSD.'],
  [3, 'wsssS.qqqqqqqqqqqqqQ.ssSSD'],
  [3, 'ssssS..ppppP..pPPPn..sSSSD'],
  [3, 'SSSSD..ppppP..pPPPn..SDDDD'],
  ...A_FRONT_BODY.slice(13),
];

// ---------- Composition ----------

function grid(spec: Spec, top = TOP): Grid {
  const c = new Canvas(W, H);
  spec.forEach(([x, s], i) => c.stamp([s], x, top + i));
  return c.toGrid();
}

/** Contour d'un pixel autour de la matière, ombre portée sous les pieds, contour côté lumière. */
function finish(matter: Grid, shadowW: number): Grid {
  const c = Canvas.from(matter).outline('o');
  c.within('.', (cc) => cc.ellipse(16.5, 45.5, shadowW, 2, 'x'));
  return selOut(c.toGrid(), DARK);
}

function specA(facing: Facing, hair: Hair): Spec {
  const loose = hair === 'loose';
  if (facing === 'down') {
    return loose
      ? [...A_FRONT_HEAD_LOOSE, ...A_FRONT_BODY]
      : [...A_FRONT_HEAD_TIED, ...A_FRONT_SHOULDERS_TIED, ...A_FRONT_BODY.slice(4)];
  }
  if (facing === 'up') {
    return loose
      ? [...A_BACK_HEAD_LOOSE, ...A_BACK_SHOULDERS_LOOSE, ...A_BACK_BODY]
      : [...A_BACK_HEAD_TIED, ...A_BACK_SHOULDERS_TIED, ...A_BACK_BODY];
  }
  return loose
    ? [...A_SIDE_HEAD_LOOSE, ...A_SIDE_BODY_LOOSE, ...A_SIDE_BODY]
    : [...A_SIDE_HEAD_TIED, ...A_SIDE_BODY_TIED, ...A_SIDE_BODY];
}

/** Toutes les vues dessinées, pour vérifier qu'elles font bien 37 rangées de matière (y=8 à 44). */
export const SPECS: Record<string, Spec> = {
  'A-down-loose': specA('down', 'loose'),
  'A-down-tied': specA('down', 'tied'),
  'A-up-loose': specA('up', 'loose'),
  'A-up-tied': specA('up', 'tied'),
  'A-right-loose': specA('right', 'loose'),
  'A-right-tied': specA('right', 'tied'),
  'B-down-loose': B_FRONT,
  'C-down-loose': C_FRONT,
};

/**
 * Une image du forgeron, dans une frame de 32 × 48 (pieds à y=45). A : de face (`down`), de dos (`up`), de profil droit
 * (`right` ; le gauche est son miroir), cheveux lâchés ou attachés. B et C : de face, cheveux lâchés seulement.
 */
export function smith(variant: Variant, facing: Facing = 'down', hair: Hair = 'loose'): Grid {
  if (variant !== 'A' && (facing !== 'down' || hair !== 'loose')) {
    throw new Error(`forgeron-colosse : la variante ${variant} n'a que la vue de face, cheveux lâchés`);
  }
  const spec = variant === 'A' ? specA(facing, hair) : variant === 'B' ? B_FRONT : C_FRONT;
  return finish(grid(spec), facing === 'right' ? 6 : 9);
}
