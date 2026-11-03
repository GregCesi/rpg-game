// Les dessins du lapin : `buildRabbit` les tire d'une robe (une palette : teinte et contraste) et d'une largeur de vue de face et
// de dos (3, 4 ou 5 px). Le jeu prend la robe rousse et la face à 3 px (art/world/rabbit.ts) ; les propositions de l'essai
// (art/proposals/lapins-a.ts, -b.ts, -c.ts) en tirent les leurs. Le profil, à 8 px, est le même partout : la fiche fixe sa
// taille, et c'est là que la silhouette se joue (l'oreille, la tête plus haute que le dos, la queue).
//
// Signes des grilles (la palette de chaque proposition leur donne leurs teintes) : `l` robe au soleil, `b` robe, `s` robe à
// l'ombre, `k` le plus sombre de la robe (contour côté lumière, oreilles), `w` blanc (ventre, queue), `v` blanc à l'ombre, `i`
// l'œil, `o` OUTLINE (contour du bas et de la droite), `x` ombre portée ; la garenne prend la terre de `world`.

import { castShadow, type Grid } from '../lib/canvas';
import { lightUp } from '../lib/light';
import { ROBE, edit, frame, onGrip, posesOf, trim, type Frames } from './rabbit-lib';
import { HELD_SIZE, type RabbitDir, type RabbitPose, type RabbitArt } from './rabbit-types';

// ---------- De profil (la vue `right`, tête à droite) ----------
// Corps recadrés, contour compris, sans ombre ; `frame` les pose dans la frame de la planche.

// Tapi, tête levée : 8 × 7. La tête plus haute que le dos, l'oreille dressée en arrière du crâne, l'œil dans la tête (pas contre
// le contour : il s'y perdrait), la queue blanche au bas de la croupe.
const SIT_R = ['...k....', '...kk...', '....kkk.', '.kkklibo', 'klllbbbo', 'wbbsbbso', '.oosooo.'];
// Brouter : la croupe en bosse, la tête au ras de l'herbe, une oreille à demi levée ; puis l'oreille qui se couche.
const GRAZE_R = ['.kkk.k..', 'kllbkk..', 'klbbbbko', 'wbbbbibo', '.bsbbbso', '.oo.ooo.'];
const GRAZE_R2 = edit(GRAZE_R, [[5, 0, '.']]);
// Petit saut : ramassé, poussée (la patte arrière tendue), en l'air étiré, réception (l'avant au sol, la croupe haute).
const HOP_R = [
  ['....kk..', '.kkkkbk.', 'kllbbibo', 'wbbbbbbo', '.bsbbso.', '..oo.oo.'],
  ['.....kk..', '..kkkkbk.', 'wkllbbibo', '.lbbbbbo.', 'os..ooo..'],
  ['......kk.', '.kkkkkkbk', 'wllbbbbio', '.oosoooo.'],
  ['kk......', 'wlkk.kk.', '.lbbkkbk', '..bbbbio', '...sbbo.', '...ooso.'],
];
// Course : galop étiré, la queue relevée (le blanc en haut de la croupe) ; jusqu'à 10 × 4.
const RUN_R = [
  ['ww..kk..', 'wkkkkbk.', 'klbbbbio', '.bsbbbo.', '..oooo..'],
  ['w.....kk..', 'wkkkkkkbko', '.llbbbbbio', 'oo......oo'],
  ['ww....kk.', '.kkkkkbk.', '.lbbbbbio', '..bsbbbo.', '......oo.'],
  ['ww..kk..', 'wkkkkbk.', 'klbbbbio', '.bsbsbo.', '.oooooo.'],
];
// Aux aguets : dressé, les oreilles droites ; 6 × 9 ; puis l'oreille qui tourne.
const ALERT_R = ['...k..', '...ko.', '..kko.', '..klbo', '..libo', '.klbbo', 'klbbso', 'wbbbbo', '.ooso.'];
const ALERT_R2 = edit(ALERT_R, [[3, 0, '.'], [2, 0, 'k']]);
// Tambouriner : tapi, la queue relevée ; la patte arrière levée, puis frappée.
const THUMP_R = [
  ['w...kk..', 'wkkkkbk.', 'klbbbibo', 'sbbbbbbo', '.bsbbso.', '...o.oo.'],
  ['....kk..', 'wkkkkbk.', 'wlbbbibo', 'kbbbbbbo', '.bsbbso.', '.ooo.oo.'],
];

// ---------- De face et de dos ----------
// Une vue de face ou de dos est une pile de rangées types, rendues à la largeur de la proposition (contour compris) :
const ROWS: Record<string, Record<3 | 4 | 5, string>> = {
  E: { 3: 'k.o', 4: 'k..o', 5: '.k.o.' }, // les deux oreilles dressées (ou les deux pattes arrière, en main)
  T: { 3: '.k.', 4: '.kk.', 5: '.kkk.' }, // le haut arrondi (le dos, la croupe)
  H: { 3: 'klo', 4: 'klbo', 5: 'klbbo' }, // le haut de la tête, au soleil
  F: { 3: 'kbo', 4: 'ibbi', 5: 'kibio' }, // la face et ses yeux (à 3 px, il n'y a pas la place)
  N: { 3: 'kko', 4: 'kkbo', 5: 'klkbo' }, // les oreilles couchées sur la nuque
  M: { 3: 'kwo', 4: 'kwwo', 5: 'kbwbo' }, // le museau et le poitrail blancs
  L: { 3: 'klo', 4: 'kllo', 5: 'kllbo' }, // le dos au soleil
  B: { 3: 'kbo', 4: 'klbo', 5: 'klbbo' }, // le corps
  S: { 3: 'kso', 4: 'kbso', 5: 'klbso' }, // le corps à l'ombre, en bas
  W: { 3: 'kwo', 4: 'kbwo', 5: 'klwbo' }, // la queue blanche, vue de dos
  O: { 3: 'ooo', 4: 'oooo', 5: '.ooo.' }, // les pattes posées
  P: { 3: 'o.o', 4: 'o..o', 5: '.o.o.' }, // les pattes écartées, en l'air
};
export type FrontWidth = 3 | 4 | 5;
const front = (spec: string, w: FrontWidth): Grid => [...spec].map((r) => ROWS[r][w]);
/** L'oreille gauche de l'image qui tourne : son bout s'efface. */
const flick = (g: Grid): Grid => edit(g, [[g[0].indexOf('k'), 0, '.']]);

// De face (vers le bas) : les oreilles, la tête, la face, le museau ; en broutant, le dos et la nuque au-dessus de la tête basse ;
// les oreilles dressées au petit saut et au tambour, couchées dans la fuite.
// De dos (vers le haut) : la nuque, le dos, la queue blanche en bas de la croupe (ce qu'on voit d'un lapin qui s'en va).
const DOWN: Record<RabbitPose, [string, number][]> = {
  graze: [['TLBNHFMO', 0], ['TLBBNFMO', 0]],
  sit: [['EEHFMBSO', 0]],
  hop: [['EHFMBSO', 0], ['EHFMBBSP', 1], ['EHFMBSO', 2], ['EHFMSO', 0]],
  alert: [['EEEHFMBSO', 0], ['EEEHFMBSO', 0]],
  run: [['TLNFMSP', 1], ['TLBBNHFMP', 2], ['TLBNHFMO', 1], ['TLNFMSO', 0]],
  thump: [['EHFMBSO', 0], ['EHFMBSP', 0]],
};
const UP: Record<RabbitPose, [string, number][]> = {
  graze: [['TNLLBBWO', 0], ['TLNLBBWO', 0]],
  sit: [['EEHLBBWO', 0]],
  hop: [['EHLBBWO', 0], ['EHLLBBSWP', 1], ['EHLLBBWO', 2], ['EHLBSWO', 0]],
  alert: [['EEEHLBBWO', 0], ['EEEHLBBWO', 0]],
  run: [['TNLBSWP', 1], ['TNLLBBSWP', 2], ['TNLBBSWO', 1], ['TNLBSWO', 0]],
  thump: [['EHLBBSWO', 0], ['EHLBBSWP', 0]],
};

function poses(w: FrontWidth): Record<RabbitPose, Record<RabbitDir, Frames>> {
  const fr = (list: [string, number][], pose: RabbitPose): Frames =>
    list.map(([spec, lift], i) => {
      const g = front(spec, w);
      return [pose === 'alert' && i === 1 ? flick(g) : g, lift];
    });
  const side: Record<RabbitPose, Frames> = {
    graze: [[GRAZE_R], [GRAZE_R2]],
    sit: [[SIT_R]],
    hop: [[HOP_R[0]], [HOP_R[1], 1], [HOP_R[2], 2], [HOP_R[3]]],
    alert: [[ALERT_R], [ALERT_R2]],
    run: [[RUN_R[0], 1], [RUN_R[1], 2], [RUN_R[2], 1], [RUN_R[3]]],
    thump: [[THUMP_R[0]], [THUMP_R[1]]],
  };
  const out = {} as Record<RabbitPose, Record<RabbitDir, Frames>>;
  for (const pose of Object.keys(side) as RabbitPose[]) {
    out[pose] = { right: side[pose], down: fr(DOWN[pose], pose), up: fr(UP[pose], pose) };
  }
  return out;
}

// ---------- Le lapin mort ----------
// Au sol, couché sur le flanc, 9 × 4 en est-ouest, 4 × 9 en nord-sud (règle D), chaque vue dessinée (la lumière reste en haut
// à gauche) : la tête et son œil, l'oreille couchée le long du dos, le ventre blanc, les pattes arrière tendues, la queue.
// ground : tête à l'ouest (dos au nord) ; r1 : tête au nord (dos à l'est) ; r2 : tête à l'est (dos au sud) ; r3 : tête au sud
// (dos à l'ouest).
const DEAD: [Grid, Grid, Grid, Grid] = [
  ['.kkk.kk..', 'kilkkllkw', 'kbbwwwbbo', '.oo.oooo.'],
  ['.kk.', 'kiko', 'kbko', 'kwlo', 'kwbo', 'kwbo', 'kbbo', 'kbso', '.ow.'],
  ['..kkwwk..', 'wlbbbbbio', 'kbbbkkbbo', '..oooo.o.'],
  ['.kw.', 'klbo', 'klbo', 'klwo', 'klwo', 'kkwo', 'kkbo', 'kibo', '.oo.'],
];

// En main : pendu par les pattes arrière (dans le poing de Xéros, 2 × 2, qui les recouvre), la tête en bas, les oreilles qui
// pendent. De profil, le flanc (le dos à gauche, le ventre blanc à droite) ; de face, le ventre ; de dos, le dos et la queue.
const HELD_R = ['.kk.', '.kb.', '.lbo', 'klbbo', 'wlbbo', 'klbwo', '.lbwo', '.lbo', '.ibo', 'klbo', '.kk.', '.k.o'];
const HELD_D = 'EEBMMBBHFE';
const HELD_U = 'EEWLLBBBHE';

// Icône 16 × 16 : le lapin pendu, en grand, dessiné à la main : les pattes jointes en haut, la croupe et la queue blanche, le
// ventre blanc, la tête et son œil, le museau vers le bas, les oreilles qui pendent derrière la tête (côté dos).
const ICON: Grid = [
  '.......kk.......',
  '.......lbo......',
  '......klbo......',
  '.....klbbbo.....',
  '....wwlbbbso....',
  '....wklbbbso....',
  '....klbbbbso....',
  '....klbbbwso....',
  '.....lbbwwo.....',
  '.....klbwwo.....',
  '......kbbo......',
  '.....klbbbo.....',
  '....kllibbo.....',
  '....klbbbso.....',
  '....kl.bso......',
  '....ko..o.......',
];

// ---------- L'entrée de garenne ----------
// À plat, 10 × 8 : le trou sombre (3 × 2) au nord, sous une lèvre de terre ; la terre sortie en éventail vers le sud, claire et
// grattée ; deux crottes (e). Sans contour : une trace au sol, comme les détails de l'herbe.
const HOLE: Grid = [
  '...nenn...',
  '..ne53en..',
  '.nuU553Un.',
  '.uUuuUuun.',
  'nuUuunuUun',
  '.nuUueuuu.',
  '..nuuuune.',
  '...n..n...',
];

// ---------- Touffes de poil (fx-fur) ----------
// Quatre variantes d'une touffe de 2 à 4 px, en zones éclairées (art/lib/light.ts) : robe, blanc du ventre, mêlées.
const FUR: Grid[] = [
  ['........', '........', '........', '...ff...', '....ff..', '........', '........', '........'],
  ['........', '........', '........', '...ww...', '....w...', '........', '........', '........'],
  ['........', '........', '....f...', '...ff...', '..w.....', '........', '........', '........'],
  ['........', '........', '........', '..fw....', '...ww...', '........', '........', '........'],
];

/** Les dessins d'une robe, à la largeur de face et de dos donnée. */
export function buildRabbit(o: { id: string; title: string; note: string; palette: Record<string, string>; width: FrontWidth }): RabbitArt {
  const deadGround = DEAD.map(castShadow) as [Grid, Grid, Grid, Grid];
  const w = o.width;
  return {
    ...o,
    poses: posesOf(poses(w)),
    rates: { graze: 3, sit: 1, hop: 8, alert: 2, run: 12, thump: 6 },
    dead: frame(trim(DEAD[0])),
    deadGround,
    held: {
      right: onGrip(HELD_R, HELD_SIZE, 1, 2),
      down: onGrip(front(HELD_D, w), HELD_SIZE, Math.floor(w / 2) - 1, 1),
      up: onGrip(front(HELD_U, w), HELD_SIZE, Math.floor(w / 2), 1),
    },
    icon: ICON,
    hole: HOLE,
    fur: FUR.map((g) => lightUp(g, ROBE)),
  };
}

/** Le nom d'origine, pour les propositions de l'essai. */
export const buildProposal = buildRabbit;
