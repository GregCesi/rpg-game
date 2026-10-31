// Proposition C du chantier « pierre » : « cassures et taches ».
// La voie la plus rustique, entre A (facettes nettes, liseré blanc, contraste fort) et B (masse patinée, contraste bas, lits) :
// - silhouettes cabossées : pas de polygone net ; chaque pierre a un coin cassé, un creux, une bosse dans son contour ;
// - la forme se lit par la silhouette et par les cassures : un éclat blanc (`!`) net là où la pierre a sauté (jamais un liseré le
//   long d'une arête), une fissure sombre (`~`) qui traverse une face ;
// - la face patinée n'est pas unie : taches de patine grise (`R`, `r`) ou ocre de lichen (`D`, `E`), en grappes de 3 px au moins ;
//   contraste moyen : dessus `+`, face `=`, flanc est `;`.
// Le moellon : bossage (la face bombée au centre, plus claire), arêtes ébréchées au têtu (coins abattus, éclat blanc au coin),
// traces d'outil en petites marques, formes un peu trapézoïdales ; mêmes taches et mêmes cassures que la grosse pierre dont il sort.
// Le muret : moellons de silhouettes inégales (coins abattus : vides triangulaires de mortier, où les éclats se calent), valeurs
// qui changent d'une pierre à l'autre (quatre « humeurs » de la pierre), jamais de bande blanche en haut de chaque pierre.
// Couleurs : la rampe du calcaire `! + = ; ~` (art/palette.ts, roche `limestone`) ; pour les taches, la pierre grise du jeu
// (`R` #b8b09f, `r` #9a9384 : patine grise) et le torchis (`D` #baa47f, `E` #9a8664 : patine ocre, lichen sec), de même valeur
// que la face, pour tacher sans modeler ; OUTLINE ; la terre `n` pour le mortier. Aucune couleur nouvelle.
// Contrat : art/proposals/types.ts. Planche : npx tsx tools/essai-pierre.ts.

import { rng, type Grid } from '../lib/canvas';
import { world } from '../palette';
import { castShadow } from './lib';
import { limestone } from './roches';
import { WALL_TOP_PX, type RubbleLength, type StoneProposal } from './types';

/** Contour côté lumière : la fissure, le ton le plus sombre du calcaire. */
const DARK = '~';

// ---------- Pierre brute de carrière ----------
// Grilles complètes, contour dessiné à la main (le contour automatique arrondit tout) : `~` en haut et à gauche, `o` en bas et à
// droite. Le contour fait des marches : un coin parti, un creux, une bosse. Derrière un coin parti, la cassure fraîche `!`.
// Moyenne 26 × 22 × 19 cm : boîte 5,2 × 6 px, plancher de lisibilité : a 6 × 7, b 7 × 6 (couchée plus large, dans les 2 px).
// Grosse 45 × 34 × 27 cm : 9 × 9 px ; a 9 × 9, b 10 × 8 (plus basse et plus large).

const MEDIUM: [Grid, Grid] = [
  // a : un bloc trapu ; le coin nord-est a sauté (éclat blanc), un creux au flanc ouest, une fissure, une tache grise au pied
  [
    '.~~o..',
    '~++!o.',
    '~+!!;o',
    '.~=~;o',
    '~R=~;o',
    '~RR;;o',
    '.oooo.',
  ],
  // b : une galette couchée ; le pied ouest est parti (cassure blanche, encoche dans le contour), du lichen ocre sur le dessus
  [
    '..~~~o.',
    '.~+DD;o',
    '~+++D;o',
    '~!!==;o',
    '.~!=;;o',
    '..oooo.',
  ],
];

const BIG: [Grid, Grid] = [
  // a : un gros bloc ; l'arête sud-est a sauté (grand éclat blanc, encoche dans le flanc est), une courte fissure en biais sur
  // la face, patine grise sur le dessus, lichen ocre au pied de la face
  [
    '...~~~o..',
    '.~~++R;o.',
    '~+++RR;;o',
    '~+++!!!;o',
    '~+==!!;o.',
    '~=~==;;;o',
    '~=D~==;;o',
    '~=DD=;;o.',
    '.ooooooo.',
  ],
  // b : une dalle basse ; un creux au milieu du dessus d'où part une fissure en biais qui s'arrête avant la face, le bout ouest cassé
  // frais (grande cassure blanche), patine grise au dessus, lichen ocre sur la face
  [
    '..~~~.~~o.',
    '.~++R~++;o',
    '~!+RR+~+;o',
    '~!!+++~;;o',
    '~!!====;;o',
    '~!=DD=;;;o',
    '.~=D==;;o.',
    '..ooooooo.',
  ],
];

const rough = (g: Grid) => castShadow(g);

// ---------- Moellon ----------
// Couché, 22 cm de profondeur, 20 cm d'assise. Est-ouest : 6, 8, 10 × 6 px (dessus de deux rangées, face sud de deux rangées,
// bout est en `;`) ; nord-sud (règle D) : 6 × 6, 8, 10 (dessus long, le bout en bande de deux rangées au sud). Pas un pavé :
// le contour a des marches (coins abattus au têtu), la face est bombée (le centre plus clair `+`), un éclat blanc au coin
// ébréché, des marques d'outil `;;`, et les taches de la grosse pierre (grise `R`, ocre `D`) ; une encoche au flanc du plus long.

const RUBBLE: Record<RubbleLength, { ew: Grid; ns: Grid }> = {
  30: {
    ew: [
      '.~~~o.',
      '~++R;o',
      '~!RR;o',
      '~!+=;o',
      '.~==;o',
      '..ooo.',
    ],
    ns: [
      '..~~o.',
      '.~+R;o',
      '~+RR;o',
      '~!!+;o',
      '~!+=;o',
      '.oooo.',
    ],
  },
  40: {
    ew: [
      '..~~~~o.',
      '.~++DD;o',
      '~!+++D;o',
      '~!=++=;o',
      '~==;;=;o',
      '.oooooo.',
    ],
    ns: [
      '.~~~o.',
      '~+DD;o',
      '~++D;o',
      '~+==;o',
      '~!!+;o',
      '~!=+;o',
      '.~;=;o',
      '..ooo.',
    ],
  },
  50: {
    ew: [
      '..~~~~~o..',
      '.~++R+++;o',
      '~!++RR+~;o',
      '~!==+++~;o',
      '.~=;;==;;o',
      '..ooooooo.',
    ],
    ns: [
      '..~~o.',
      '.~++;o',
      '~+RR;o',
      '~++R;o',
      '~+++o.',
      '~++=;o',
      '~+==;o',
      '~!!+;o',
      '~!=+;o',
      '.oooo.',
    ],
  },
};

// ---------- Éclats ----------
// À plat, 40 × 30 cm : 8 × 6. Des écailles de tailles inégales : la plupart montrent leur cassure fraîche (`!`, `+`), deux leur
// ancienne face patinée (`=`), chacune son ombre (`;`) au sud ou à l'est. Pas d'ombre portée.

const CHIPS: Grid = [
  '.!!....!',
  '!+;..=+;',
  '.;..=;;.',
  '...!!...',
  '=!.+;;.!',
  ';;.....;',
];

// ---------- Muret ----------
// Chaque pierre a son « humeur » (sa valeur), tirée par sa variante : la plupart calcaire commun, certaines plus grises, plus
// ocre ou fraîchement taillées. La face est bombée : le centre clair en haut à gauche, le bas et le bout est sombres. Coins
// abattus tirés pour chaque pierre (un ou deux pixels : vides triangulaires de mortier) ; un éclat blanc seulement au bord d'un
// coin abattu (la pierre a sauté là), jamais tout le long du haut.

type Mood = { hi: string; mid: string; lo: string; spot: string };
const MOODS: Mood[] = [
  { hi: '+', mid: '=', lo: ';', spot: 'R' }, // calcaire commun
  { hi: '+', mid: '=', lo: ';', spot: 'D' }, // calcaire commun, lichen ocre
  { hi: 'R', mid: 'r', lo: ';', spot: '=' }, // pierre grise, plus sombre
  { hi: '=', mid: 'D', lo: 'E', spot: '+' }, // pierre ocre (rouillée)
  { hi: '!', mid: '+', lo: '=', spot: 'R' }, // pierre fraîche, plus claire
];
/** Tirage des humeurs : le calcaire commun domine. */
const MOOD_DRAW = [0, 1, 0, 2, 1, 3, 0, 4, 2, 1];

function moodOf(length: RubbleLength, variant: number): Mood {
  return MOODS[MOOD_DRAW[(variant * 3 + length / 10) % MOOD_DRAW.length]];
}

function face(length: RubbleLength, height: 3 | 4, variant: number): Grid {
  const r = rng(length * 37 + height * 11 + variant * 131 + 5);
  const m = moodOf(length, variant);
  const w = length / 5 - 1;
  const h = height;
  const g: string[][] = Array.from({ length: h }, () => Array(w).fill(m.mid));
  // bossage : une bosse centrale, claire en haut à gauche ; le bout est et le bas dans l'ombre
  const cx = (w - 1) / 2 - 0.5, cy = (h - 1) / 2 - 0.3;
  const rx = Math.max(1.2, w / 2 - 1.2), ry = Math.max(0.9, h / 2 - 0.9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 && (x - cx) + (y - cy) * 1.5 < 0.8) g[y][x] = m.hi;
    if (x === w - 1 || (y === h - 1 && x > w / 2 - 1)) g[y][x] = m.lo;
  }
  // tache de patine : une grappe de trois pixels en équerre, sur les pierres assez longues
  if (w >= 7 && r() < 0.6) {
    const tx = 1 + Math.floor(r() * (w - 4)), ty = h === 4 ? 1 + Math.floor(r() * 2) : 1;
    const ny = ty + 1 < h - 1 && r() < 0.5 ? ty + 1 : ty - 1;
    g[ty][tx] = m.spot; g[ty][tx + 1] = m.spot; g[ny][tx] = m.spot;
  }
  // marque d'outil : deux pixels sombres dans le bas de la face
  if (r() < 0.55) { const t = 1 + Math.floor(r() * (w - 3)); g[h - 1][t] = m.lo; g[h - 1][t + 1] = m.lo; }
  // pas de fissure dans le mur : à cette taille, deux pixels sombres s'y lisent comme des trous
  // coins abattus : le mortier se voit ; un ou deux pixels (le long du grand côté) ; au moins un par pierre
  const cuts: [number, number, number][] = [[0, 0, 1], [w - 1, 0, -1], [0, h - 1, 1], [w - 1, h - 1, -1]];
  const odds = [0.65, 0.5, 0.4, 0.55];
  let any = false;
  cuts.forEach(([x, y, dx], i) => {
    if (r() >= odds[i] && !(i === 3 && !any)) return;
    any = true;
    g[y][x] = '.';
    if (w >= 7 && r() < 0.45) g[y][x + dx] = '.';
    else if (h === 4 && r() < 0.3) g[y === 0 ? 1 : h - 2][x] = '.';
    // éclat frais au bord du coin abattu du haut à gauche (la lumière le prend), une fois sur deux
    if (i === 0 && r() < 0.5) {
      const ex = g[0][1] === '.' ? 2 : 1;
      g[0][ex] = '!'; g[1][ex - 1] === '.' ? (g[1][ex] = '!') : (g[1][ex - 1] = '!');
    }
  });
  return g.map((row) => row.join(''));
}

function top(length: RubbleLength, variant: number): Grid {
  const r = rng(length * 17 + variant * 59 + 3);
  const m = moodOf(length, variant);
  const w = length / 5 - 1;
  // le dessus prend la lumière : un cran plus clair que la face de la même pierre
  const hi = m.hi === '!' ? '!' : '+';
  const mid = m.hi;
  const g: string[][] = Array.from({ length: WALL_TOP_PX }, (_, y) => Array.from({ length: w }, (_, x) => (x === w - 1 ? m.mid : y === 0 ? mid : hi)));
  // bord arrière irrégulier : un ou deux pixels manquent aux bouts
  if (r() < 0.7) g[0][0] = '.';
  if (r() < 0.6) g[0][w - 1] = '.';
  if (w >= 7 && r() < 0.5) g[0][1 + Math.floor(r() * (w - 2))] = '.';
  // une tache sur le dessus
  if (w >= 7 && r() < 0.6) { const t = 1 + Math.floor(r() * (w - 4)); g[1][t] = m.spot; g[1][t + 1] = m.spot; if (g[0][t + 1] !== '.') g[0][t + 1] = m.spot; }
  return g.map((row) => row.join(''));
}

const proposal: StoneProposal = {
  id: 'C',
  stance: 'C : cassures et taches - silhouettes cabossees, eclats blancs ou la pierre a saute, fissures, taches de patine grise et ocre, contraste moyen - moellons bombes, muret aux coins abattus',
  rock: limestone,
  palette: world,
  rough: { medium: [rough(MEDIUM[0]), rough(MEDIUM[1])], big: [rough(BIG[0]), rough(BIG[1])] },
  rubble: {
    30: { ew: castShadow(RUBBLE[30].ew), ns: castShadow(RUBBLE[30].ns) },
    40: { ew: castShadow(RUBBLE[40].ew), ns: castShadow(RUBBLE[40].ns) },
    50: { ew: castShadow(RUBBLE[50].ew), ns: castShadow(RUBBLE[50].ns) },
  },
  chips: CHIPS,
  wall: { mortar: 'n', dark: DARK, face, top, chip: ['!', ';'] },
};

export default proposal;
