// Proposition B du chantier « pierre » : « masse patinée, lits de la roche ».
// Le contraire de A : contraste bas, la pierre est d'abord une masse claire patinée, gris crème ; les plans se distinguent à
// peine, par des valeurs voisines (dessus `+`, face sud `=`, l'ombre `;` seulement au flanc est et dans les lits) ; la roche se
// lit par ses lits : des strates fines un peu plus sombres sur la face sud, le calcaire qui s'ouvre selon ses lits (dessus et
// dessous plats, côtés cassés irréguliers, silhouettes trapues, plus larges que hautes). Presque pas de blanc de cassure : une
// seule cassure fraîche `!`, là où un coin a sauté (la grosse a). Arêtes adoucies par la patine : l'arête entre dessus et face
// passe par une rangée mêlée de `+` et de `=`, pas par un liseré ; la silhouette, elle, marche par lits (marches franches).
// Le moellon : faces bosselées en bandes (les lits), bouts cassés, aucun liseré clair en haut.
// Le muret : des pierres de valeurs différentes d'une pierre à l'autre (crème, grise, plus sombre), des lits placés à des
// hauteurs différentes, des coins abattus qui laissent voir la terre : ce sont les joints de terre qui dessinent le mur, pas des
// bandes claires.
// Couleurs : la rampe du calcaire (art/palette.ts, roche `limestone` : ! + = ; ~), OUTLINE, et la terre `n` pour le mortier.
// Contrat : art/proposals/types.ts. Planche : npx tsx tools/essai-pierre.ts.

import { EMPTY, rng, type Grid } from '../lib/canvas';
import { world } from '../palette';
import { castShadow } from './lib';
import { limestone } from './roches';
import { WALL_TOP_PX, type RubbleLength, type StoneProposal } from './types';

/** Contour côté lumière : le ton le plus sombre du calcaire. */
const DARK = '~';

/**
 * Une matière sans contour (toutes ses rangées de même largeur) reçoit son contour d'un pixel et son ombre portée. Contour à
 * coins pleins (voisinage de huit) : les lits de la roche font des marches franches, pas des bosses ; le coin nord-ouest prend
 * DARK, tout le reste du bas et de la droite OUTLINE (STYLE.md section 3). Une marche voulue s'écrit '.' dans la matière.
 */
function stone(inner: Grid): Grid {
  const w = inner[0].length, h = inner.length;
  inner.forEach((r, i) => { if (r.length !== w) throw new Error(`pierre-b : rangée ${i} de ${r.length} au lieu de ${w}`); });
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? inner[y][x] : EMPTY) !== EMPTY;
  const out: string[] = [];
  for (let y = -1; y <= h; y++) {
    let row = '';
    for (let x = -1; x <= w; x++) {
      if (at(x, y)) { row += inner[y][x]; continue; }
      if (at(x - 1, y) || at(x, y - 1)) row += 'o';
      else if (at(x + 1, y) || at(x, y + 1)) row += DARK;
      else if (at(x + 1, y + 1)) row += DARK;
      else if (at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1)) row += 'o';
      else row += EMPTY;
    }
    out.push(row);
  }
  return castShadow(out);
}

// ---------- Pierre brute de carrière ----------
// Matière sans contour ; le contour s'ajoute autour. Dessus `+` sur une ou deux rangées, l'arête avant adoucie (rangée mêlée),
// face sud `=` traversée d'un lit `;` interrompu, flanc est `;` d'un pixel. Les côtés cassés en marches, d'un lit à l'autre.
// Moyenne 26 × 22 × 19 cm : boîte 5,2 × 6 px ; dessinée 7 × 6 (a, couchée sur son lit) et 6 × 6 (b, un coin de lit qui penche).
// Grosse 45 × 34 × 27 cm : 9 × 9 px ; dessinée 10 × 8 (a, un bloc trapu dont l'angle nord-ouest a sauté : la seule cassure
// fraîche) et 11 × 7 (b, une dalle dont le bout est s'est ouvert selon un lit : une marche plus basse).

const MEDIUM: [Grid, Grid] = [
  // a : couchée sur son lit, dessus plat, le côté ouest cassé en biais
  [
    '.+++=',
    '++++;',
    ';;==;',
    '===;;',
  ],
  // b : le dessus qui penche vers l'est, une face plus haute à l'ouest
  [
    '++=.',
    '+++=',
    '=;;;',
    '.==;',
  ],
];

const BIG: [Grid, Grid] = [
  // a : un bloc trapu, dessus plat de lit, l'angle nord-ouest sauté (cassure fraîche `!`), deux lits sur la face
  [
    '..!+++=.',
    '.!++++=.',
    '=++++++=',
    ';;;====;',
    '======;;',
    '.=;;;==.',
  ],
  // b : une dalle longue ; à l'est, le lit du dessus s'est détaché : une marche plus basse, sa contremarche à l'ombre
  [
    '++++++...',
    '=+++++;++',
    '===+==;=+',
    ';;;;=====',
    '.==;;;==;',
  ],
];

// ---------- Moellon ----------
// Couché, 22 cm de profondeur, 20 cm d'assise. Est-ouest : 6, 8, 10 × 6 px : le dessus sur une rangée (et le contour), la face
// sud sur trois, bosselée en bandes : une bosse plus claire, un lit `;` interrompu, le bas patiné ; le bout est `;`. Les bouts
// cassés : la silhouette mord d'un pixel à un coin. Nord-sud (règle D) : 6 × 6, 8, 10 : le dessus long, l'arête est qui tombe
// à l'ombre, le bout sud en bande de deux rangées, avec son lit.

const RUBBLE_EW: Record<RubbleLength, Grid> = {
  30: [
    '.++=',
    '++==',
    ';;=;',
    '===;',
  ],
  40: [
    '.++++=',
    '=+++==',
    '==;;;;',
    ';===;.',
  ],
  50: [
    '.++++++=',
    '++==++==',
    '=;;;===;',
    '===;;=;.',
  ],
};

const RUBBLE_NS: Record<RubbleLength, Grid> = {
  30: [
    '+++=',
    '++==',
    '=;;;',
    '===;',
  ],
  40: [
    '+++.',
    '+++=',
    '++==',
    '+++=',
    ';;==',
    '==;;',
  ],
  50: [
    '+++=',
    '++==',
    '+++=',
    '=++=',
    '+++=',
    '++==',
    '==;;',
    ';;=;',
  ],
};

// ---------- Éclats ----------
// À plat, 40 × 30 cm : 8 × 6. Des éclats patinés vite, posés sur leur lit : le dessus `+`, leur tranche `;` au sud. Une seule
// tache de cassure fraîche. Pas d'ombre portée.

const CHIPS: Grid = [
  '.++.....',
  '.;;=.+=.',
  '.....;;.',
  '+=.....+',
  ';;..+=.;',
  '...;;;..',
];

// ---------- Muret ----------
// Chaque pierre a sa valeur : crème (`+`, lits `=`), grise (`=`, bosse `+`, lits `;`) ou plus sombre (`=`, lits et bas `;`),
// tirée de sa longueur et de son numéro, si bien que deux voisines diffèrent. Pas de liseré en haut : la bosse claire est à
// une hauteur tirée, le lit aussi ; coins abattus et entailles laissent voir la terre des joints.

type Tone = { base: string; light: string; shade: string };
const TONES: Tone[] = [
  { base: '=', light: '+', shade: ';' }, // grise
  { base: '+', light: '+', shade: '=' }, // crème
  { base: '=', light: '=', shade: ';' }, // plus sombre
];
const toneOf = (length: RubbleLength, variant: number) => TONES[(variant + length / 10) % 3];

function face(length: RubbleLength, height: 3 | 4, variant: number): Grid {
  const r = rng(length * 37 + height * 11 + variant * 131 + 7);
  const t = toneOf(length, variant);
  const w = length / 5 - 1;
  const rows: string[][] = Array.from({ length: height }, () => Array(w).fill(t.base));
  // une bosse claire (grappe de 3 à 4) dans le haut, à une place tirée
  if (t.light !== t.base) {
    const by = r() < 0.6 ? 0 : 1;
    const bl = 3 + Math.floor(r() * 2);
    const bx = Math.floor(r() * Math.max(1, w - bl - 1));
    for (let i = 0; i < bl && bx + i < w - 1; i++) rows[by][bx + i] = t.light;
  }
  // un lit, interrompu, à une hauteur tirée (jamais la rangée du haut)
  const ly = 1 + Math.floor(r() * (height - 1));
  const ll = Math.min(w - 2, 2 + Math.floor(r() * 3));
  const lx = Math.floor(r() * (w - ll));
  for (let i = 0; i < ll; i++) rows[ly][lx + i] = t.shade;
  // le bout est à l'ombre sur le bas
  rows[height - 1][w - 1] = t.shade;
  if (height === 4 || r() < 0.5) rows[height - 2][w - 1] = t.shade;
  // coins abattus, entaille dans l'arête : la terre se voit
  if (r() < 0.7) rows[0][0] = '.';
  if (r() < 0.5) rows[0][w - 1] = '.';
  if (r() < 0.4) rows[height - 1][0] = '.';
  if (r() < 0.6) rows[height - 1][w - 1] = '.';
  // arête bosselée : une entaille de deux pixels dans le haut ou le bas des longues pierres, le joint de terre ondule (d'un seul
  // pixel, elle ferait un trou isolé dans la pierre)
  if (w >= 7 && r() < 0.6) { const ny = r() < 0.5 ? 0 : height - 1, nx = 2 + Math.floor(r() * (w - 5)); rows[ny][nx] = '.'; rows[ny][nx + 1] = '.'; }
  return rows.map((x) => x.join(''));
}

function top(length: RubbleLength, variant: number): Grid {
  const r = rng(length * 17 + variant * 61 + 3);
  const t = toneOf(length, variant);
  const w = length / 5 - 1;
  // le dessus du mur, au soleil : `+` ; une pierre crème a le dessus à peine plus clair (une grappe `!`, rare), une sombre `=` au fond
  const rows: string[][] = Array.from({ length: WALL_TOP_PX }, () => Array(w).fill('+'));
  if (t === TONES[2]) for (let i = 0; i < w - 1; i++) if (r() < 0.6) rows[0][i] = '=';
  rows[WALL_TOP_PX - 1][w - 1] = '=';
  // bord arrière irrégulier
  if (r() < 0.6) rows[0][0] = '.';
  if (r() < 0.5) rows[0][w - 1] = '.';
  return rows.map((x) => x.join(''));
}

const proposal: StoneProposal = {
  id: 'B',
  stance: 'B : masse patinee, lits de la roche - contraste bas (dessus et face voisins, gris creme), strates fines sur la face sud, dessus et dessous plats, aretes adoucies, une seule cassure fraiche - muret de pierres de valeurs variees, joints de terre',
  rock: limestone,
  palette: world,
  rough: { medium: [stone(MEDIUM[0]), stone(MEDIUM[1])], big: [stone(BIG[0]), stone(BIG[1])] },
  rubble: {
    30: { ew: stone(RUBBLE_EW[30]), ns: stone(RUBBLE_NS[30]) },
    40: { ew: stone(RUBBLE_EW[40]), ns: stone(RUBBLE_NS[40]) },
    50: { ew: stone(RUBBLE_EW[50]), ns: stone(RUBBLE_NS[50]) },
  },
  chips: CHIPS,
  wall: { mortar: 'n', dark: DARK, face, top, chip: ['+='] },
};

export default proposal;
