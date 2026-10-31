// Proposition A du chantier « pierre » : « blocs à facettes nettes ».
// Silhouettes polygonales anguleuses ; trois plans bien lisibles : dessus clair (+), face sud moyenne (=), flanc est sombre (;) ;
// arêtes vives soulignées d'un liseré de cassure fraîche blanche (!), quelques fissures sombres (~) ; contraste fort.
// Le moellon : un parallélépipède franc, faces planes mais pas lisses (traces de têtu), coins abattus, arêtes blanches.
// Le muret : assises nettes, pierres à faces planes, joints de terre brune bien marqués (un pixel de mortier `n`).
// Couleurs : la rampe du calcaire (art/palette.ts, roche `limestone`), OUTLINE et la terre `n` pour le mortier.
// Contrat : art/proposals/types.ts. Planche : npx tsx tools/essai-pierre.ts.

import { rng, type Grid } from '../lib/canvas';
import { world } from '../palette';
import { castShadow } from './lib';
import { limestone } from './roches';
import { WALL_TOP_PX, type RubbleLength, type StoneProposal } from './types';

/** Contour côté lumière : la fissure, le ton le plus sombre du calcaire. */
const DARK = '~';

// ---------- Pierre brute de carrière ----------
// Grilles complètes, contour dessiné à la main pour garder des coins vifs (le contour automatique les arrondit) : `~` en haut
// et à gauche, `o` en bas et à droite, droites et pentes franches. Trois plans : dessus `+` bordé de cassure `!` à l'ouest et
// sur l'arête avant, face sud `=`, flanc est `;` ; une fissure `~`.
// Moyenne 26 × 22 × 19 cm : boîte 5,2 × (3,8 + 2,2) = 5 × 6, plancher de lisibilité : 6 × 7 (a) et 6 × 6 (b) contour compris.
// Grosse 45 × 34 × 27 cm : 9 × (5,4 + 3,4) = 9 × 9 ; la forme b plus basse et plus large (10 × 8).

const MEDIUM: [Grid, Grid] = [
  // a : un bloc trapu, plus haut que large, l'angle nord-ouest abattu
  [
    '..~~o.',
    '.~!+;o',
    '~!++;o',
    '~!!=;o',
    '~=~=;o',
    '~==;;o',
    'ooooo.',
  ],
  // b : un coin bas, le dessus qui tombe vers l'est
  [
    '.~~o..',
    '~!++o.',
    '~!!+;o',
    '~==~;o',
    '~=;;;o',
    'oooooo',
  ],
];

const BIG: [Grid, Grid] = [
  // a : un gros bloc à trois plans, dessus large, flanc est profond
  [
    '...~~~o..',
    '.~~!++;o.',
    '~!+++++;o',
    '~!++++;;o',
    '~!!!=~;;o',
    '~===~=;;o',
    '~=====;;o',
    '~==;;=;o.',
    'oooooooo.',
  ],
  // b : une dalle basse et large, cassée en biais, une fissure qui court du dessus à la face
  [
    '....~~~o..',
    '..~~!++;o.',
    '.~!++++;;o',
    '~!+++~+;;o',
    '~!!!==~;;o',
    '~======;;o',
    '~==~==;;o.',
    'oooooooo..',
  ],
];

const rough = (g: Grid) => castShadow(g);

// ---------- Moellon ----------
// Couché, 22 cm de profondeur, 20 cm d'assise. Est-ouest : 6, 8, 10 × 6 px (dessus de deux rangées : le fond au soleil, l'arête
// avant en cassure fraîche ; face sud de deux rangées) ; nord-sud (règle D) : 6 × 6, 8, 10, le dessus long, le bout en bande de
// deux rangées au sud. Un parallélépipède franc : contour droit à coins vifs, deux coins abattus ; traces de têtu, une fissure.

type Corner = 'tl' | 'tr' | 'bl' | 'br';

/** Une pierre équarrie : la matière, son contour droit (coins vifs), et des coins abattus (le coin du contour s'en va). */
function boxed(inner: string[][], cuts: Corner[]): Grid {
  const iw = inner[0].length, ih = inner.length;
  const w = iw + 2, h = ih + 2;
  const g: string[][] = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1) return inner[y - 1][x - 1];
    if (y === h - 1 || x === w - 1) return 'o';
    return DARK;
  }));
  const at: Record<Corner, [number, number, number, number, string]> = {
    tl: [0, 0, 1, 1, DARK], tr: [w - 1, 0, w - 2, 1, 'o'], bl: [0, h - 1, 1, h - 2, 'o'], br: [w - 1, h - 1, w - 2, h - 2, 'o'],
  };
  for (const k of cuts) { const [x, y, ix, iy, c] = at[k]; g[y][x] = '.'; g[iy][ix] = c; }
  return g.map((r) => r.join(''));
}

function rubbleEW(len: RubbleLength): Grid {
  const r = rng(len * 7 + 1);
  const iw = len / 5 - 2;
  const lit = Math.ceil(iw * 0.6);
  const rows = [
    '+'.repeat(iw),
    '!'.repeat(lit) + '+'.repeat(iw - lit - 1) + ';',
    '!' + '='.repeat(iw - 2) + ';',
    '='.repeat(iw - 1) + ';',
  ].map((s) => [...s]);
  // traces de têtu : une bosse sombre de deux pixels sur la face, une sur le dessus
  const t = 1 + Math.floor(r() * (iw - 3));
  rows[3][t] = ';'; rows[3][t + 1] = ';';
  if (iw >= 6) { const f = Math.min(iw - 2, t + 3); rows[2][f] = '~'; rows[3][f] = '~'; }
  if (iw >= 8) { const b = 2 + Math.floor(r() * (iw - 5)); rows[0][b] = '='; rows[0][b + 1] = '='; }
  return castShadow(boxed(rows.map((x) => x.join('').split('')), len === 50 ? ['tl', 'tr', 'br'] : ['tl', 'br']));
}

function rubbleNS(len: RubbleLength): Grid {
  const ih = len / 5 - 2;
  const rows: string[][] = [];
  for (let y = 0; y < ih - 3; y++) rows.push([...'!++=']);
  rows.push([...'!!!;']);
  rows.push([...'!==;']);
  rows.push([...'=;;;']);
  // traces de têtu sur le dessus long et sur l'arête du plus long
  if (ih >= 6) { rows[1][2] = '='; rows[2][2] = '='; }
  if (ih >= 8) { rows[ih - 3][2] = '='; rows[ih - 3][3] = '='; }
  return castShadow(boxed(rows, len === 50 ? ['tl', 'tr', 'br'] : ['tl', 'br']));
}

// ---------- Éclats ----------
// À plat, 40 × 30 cm : 8 × 6. Chaque éclat : la cassure fraîche au-dessus, son ombre (;) au sud. Pas d'ombre portée.

const CHIPS: Grid = [
  '.!!.....',
  '.;;.!+..',
  '....;;.!',
  '!+.....;',
  ';;..!!..',
  '...;;;..',
];

// ---------- Muret ----------

function face(length: RubbleLength, height: 3 | 4, variant: number): Grid {
  const r = rng(length * 31 + height * 7 + variant * 101);
  const w = length / 5 - 1;
  const lit = Math.max(2, Math.ceil(w * (0.4 + r() * 0.3)));
  const rows: string[][] = [];
  // l'arête du haut en cassure fraîche sur une partie de sa longueur seulement
  rows.push([...('!'.repeat(lit) + '='.repeat(w - lit - 1) + ';')]);
  for (let y = 1; y < height; y++) rows.push([...('='.repeat(w - 1) + ';')]);
  rows[1][0] = '!';
  // traces de têtu sur la face : deux pixels sombres en bas
  const t = 1 + Math.floor(r() * (w - 3));
  rows[height - 1][t] = ';'; rows[height - 1][t + 1] = ';';
  // fissure sur les longues pierres hautes (deux pixels : d'un seul, elle ferait un trou)
  if (w >= 7 && height === 4 && r() < 0.7) { const f = 2 + Math.floor(r() * (w - 4)); rows[1][f] = '~'; rows[2][f] = '~'; }
  // coins abattus : le mortier se voit
  if (r() < 0.6) rows[0][0] = '.';
  if (r() < 0.6) rows[0][w - 1] = '.';
  if (r() < 0.5) rows[height - 1][w - 1] = '.';
  return rows.map((x) => x.join(''));
}

function top(length: RubbleLength, variant: number): Grid {
  const r = rng(length * 13 + variant * 57);
  const w = length / 5 - 1;
  const rows: string[][] = [];
  for (let y = 0; y < WALL_TOP_PX; y++) rows.push([...('+'.repeat(w - 1) + '=')]);
  rows[WALL_TOP_PX - 1][0] = '!';
  // une bosse de têtu
  const b = 1 + Math.floor(r() * (w - 3));
  rows[0][b] = '='; rows[0][b + 1] = '=';
  return rows.map((x) => x.join(''));
}

const proposal: StoneProposal = {
  id: 'A',
  stance: 'A : blocs a facettes nettes - trois plans francs (dessus clair, face moyenne, flanc est sombre), aretes en cassure blanche, fissures, contraste fort - joints de terre d un pixel',
  rock: limestone,
  palette: world,
  rough: { medium: [rough(MEDIUM[0]), rough(MEDIUM[1])], big: [rough(BIG[0]), rough(BIG[1])] },
  rubble: {
    30: { ew: rubbleEW(30), ns: rubbleNS(30) },
    40: { ew: rubbleEW(40), ns: rubbleNS(40) },
    50: { ew: rubbleEW(50), ns: rubbleNS(50) },
  },
  chips: CHIPS,
  wall: { mortar: 'n', dark: DARK, face, top, chip: ['!+'] },
};

export default proposal;
