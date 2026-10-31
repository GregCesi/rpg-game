// Le petit bois du chantier « briques » : la cheville (`peg`), le bardeau (`shingle`) et le coutre (`froe`). Pour chacun :
// ses quatre vues au sol (couché, vues `four`, règle D de docs/STYLE.md section 8 : `-r1` à `-r3`, un quart de tour de plus
// dans le sens des aiguilles d'une montre, dessinées et non tournées en pixels), son icône 16 × 16 et sa planche tenue au
// poing (`held-*`, posture `hand`, art/items/carried.ts).
//
// Gabarit (5 cm par pixel, silhouette contour compris, ombre exclue) :
// - cheville, 25 cm × Ø 3 : cylindre couché, 5 × 0,7 px ; plancher de lisibilité 6 px : dessinée 6 × 2 (une rangée de bois et
//   l'OUTLINE dessous : moins d'un pixel d'épaisseur réelle, pas de contour du haut) ; nord-sud 2 × 6.
// - bardeau, 40 × 10 × 1,5 cm à plat : boîte, 8 × (0,3 + 1) px : dessiné 8 × 3 (contour du haut, le dessus fendu sur une
//   rangée, l'OUTLINE dessous ; au gros bout, la tranche de 1,5 cm se voit à la place de l'OUTLINE) ; nord-sud 3 × 8.
// - coutre, 32 × 35 × 4 cm (la lame est-ouest, le manche vers le nord à son bout est) : boîte, 6,4 × (0,8 + 3,5) px :
//   dessiné 7 × 5 (la lame et l'œil sur une rangée, le manche sur deux, le contour autour) ; nord-sud 5 × 7.
//
// Matières : la cheville, du bois fraîchement taillé à la hachette, à facettes (U éclairée, u à l'ombre ; la tête coupée
// en bois de bout Y) : le bois mis à nu du piquet (art/items/stake.ts) ; le bardeau, du chêne fendu au coutre (Y t T, le
// bois de fente, le fil en tirets) ; le coutre, le fer forgé de la hachette (toolPalette : 0 l'œil, 3 et 4 le fer, 2 le dos
// éclairé, 1 le fil), le manche en bois (M m, le bout en bois de bout N).
// Choix (tranchés au plus réaliste, Grégoire dort) : la cheville a la tête à l'ouest et la pointe à l'est dans sa vue de
// base, comme le piquet ; le bardeau, le gros bout à l'ouest ; le coutre, la lame est-ouest, l'œil et le manche à l'est.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { BRANCH_FIST, fistGap, sheet } from './carried';
import { darkest, outline } from './lib';
import { lyingView } from './lying';
import { toolPalette } from './tools';

type View = 'down' | 'up' | 'right';
type Turn = 0 | 1 | 2 | 3;
const TURNS: Turn[] = [0, 1, 2, 3];
const suffix = (t: Turn) => (t === 0 ? '' : `-r${t}`);

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: toolPalette, grid });

/** Contour côté lumière : la teinte la plus sombre de chaque matière (bois : N ; fer : 4, presque noir à l'œil). */
const DARK = darkest({ Y: 'N', t: 'N', T: 'N', U: 'N', u: 'N', M: 'K', m: 'K', N: 'K', '0': '0', '1': '4', '2': '4', '3': '4', '4': '0' }, 'N');

/** Ombre portée au sol : la silhouette décalée d'un pixel vers l'est et le sud, sur le vide. */
function dropShadow(g: Grid): Grid {
  const body = Canvas.from(g);
  const c = new Canvas(body.w + 1, body.h + 1).stamp(g, 0, 0);
  for (let y = 1; y < c.h; y++) for (let x = 1; x < c.w; x++) {
    if (c.get(x, y) === EMPTY && body.get(x - 1, y - 1) !== EMPTY) c.set(x, y, 'x');
  }
  return c.toGrid();
}

/** Quart de tour dans le sens des aiguilles d'une montre d'une grille de matières (avant relighting par la vue). */
function turnCW(g: Grid): Grid {
  const h = g.length, w = g[0].length;
  return Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => g[h - 1 - x][y]).join(''));
}

// ---------- Cheville ----------
// Une rangée de bois et l'OUTLINE dessous (est-ouest) ou à l'est (nord-sud). Depuis la tête : le bois de bout de la tête
// coupée (Y, ou U quand il regarde le nord ou l'est), trois facettes éclairées (U), la pointe taillée (u, puis u au bout).
// Sous la pointe, plus d'OUTLINE : elle s'amincit.

const PEG = ['Y', 'U', 'U', 'U', 'u', 'u'];

function pegGround(turn: Turn): Grid {
  // la tête regarde l'ouest (0) ou le sud (3) : son bois de bout se voit dans la lumière ; sinon c'est une facette
  const wood = PEG.map((k, i) => (i === 0 && turn !== 0 && turn !== 3 ? 'U' : k));
  const n = wood.length;
  const along = (i: number) => (turn === 0 || turn === 1 ? i : n - 1 - i); // position depuis l'ouest ou le nord
  const crosswise = turn % 2 === 1;
  const c = new Canvas(crosswise ? 2 : n, crosswise ? n : 2);
  wood.forEach((k, i) => {
    const p = along(i);
    const tip = i === n - 1;
    if (crosswise) { c.set(0, p, k); if (!tip) c.set(1, p, 'o'); }
    else { c.set(p, 0, k); if (!tip) c.set(p, 1, 'o'); }
  });
  return dropShadow(c.toGrid());
}

// ---------- Bardeau ----------
// Le dessus fendu (une rangée) : fil du chêne en tirets Y t, plus sombre (T) au bout aminci ; contour N côté lumière,
// OUTLINE à l'ombre. Le gros bout : sa tranche de 1,5 cm (T) se voit sous le dessus, sur deux pixels, au lieu de l'OUTLINE.

/** Le dessus du bardeau depuis le gros bout (6 px entre les contours). */
const SHINGLE_TOP = ['Y', 'Y', 't', 'Y', 't', 'T'];

function shingleGround(turn: Turn): Grid {
  const n = SHINGLE_TOP.length;
  const crosswise = turn % 2 === 1;
  const c = new Canvas(crosswise ? 3 : n + 2, crosswise ? n + 2 : 3);
  const along = (i: number) => 1 + (turn === 0 || turn === 1 ? i : n - 1 - i);
  SHINGLE_TOP.forEach((k, i) => {
    const p = along(i);
    const edge = i <= 1 ? 'T' : 'o'; // la tranche du gros bout, ou le contour d'ombre
    if (crosswise) c.set(0, p, 'N').set(1, p, k).set(2, p, edge);
    else c.set(p, 0, 'N').set(p, 1, k).set(p, 2, edge);
  });
  // les bouts : contour N du côté de la lumière (ouest, nord), OUTLINE de l'autre
  if (crosswise) c.set(1, 0, 'N').set(1, n + 1, 'o');
  else c.set(0, 1, 'N').set(n + 1, 1, 'o');
  return dropShadow(c.toGrid());
}

// ---------- Coutre ----------
// Couché à plat : la lame (fer 3, la pointe en fer d'ombre 4) sur une rangée, l'œil (0) à son bout, le manche (M, le bout
// en bois de bout N) qui part de l'œil à angle droit. La base : lame est-ouest, œil à l'est, manche vers le nord. Chaque
// vue suivante tourne d'un quart de tour ; la matière reste éclairée en haut à gauche, le contour aussi (lyingView).

const FROE: Grid = [
  '....N',
  '....M',
  '4332' + '0',
];

function froeInner(turn: Turn): Grid {
  let g = FROE;
  for (let i = 0; i < turn; i++) g = turnCW(g);
  return g;
}

// ---------- Icônes ----------

/**
 * La cheville en diagonale, agrandie pour l'icône (10 px) : la pointe taillée en bas à gauche, trois facettes qui
 * s'affinent jusqu'à un pixel (u U), le corps à facettes (U éclairé, u à l'ombre), la tête coupée en haut à droite, son
 * bois de bout clair (Y).
 */
const PEG_ICON: Grid = [
  '......YY',
  '.....UUu',
  '....UUu.',
  '...UUu..',
  '..UUu...',
  '.UUu....',
  '.Uu.....',
  'u.......',
];

function pegIcon(): Canvas {
  return outline(new Canvas(16, 16).stamp(PEG_ICON, 4, 4), DARK);
}

/**
 * Le bardeau couché est-ouest, vu de dessus en trois quarts (comme au sol, plus grand) : le dessus fendu sur trois rangées,
 * le fil en tirets (Y t, T au bout aminci, à droite) ; sous lui, la tranche (T) épaisse au gros bout, à gauche, qui
 * s'amincit et disparaît vers l'autre bout. Une planchette, pas un bâton : elle se distingue de la cheville.
 */
const SHINGLE_ICON: Grid = [
  'YYYtYYYYtYYYtt',
  'tYYYtttYYYtttT',
  'YttYYYtYYtttTT',
  'TTTTTTTTT.....',
];

function shingleIcon(): Canvas {
  return outline(new Canvas(16, 16).stamp(SHINGLE_ICON, 1, 6), DARK);
}

/** Le coutre : la lame à l'horizontale en haut (dos éclairé 2, fer 3, fil 1 dessous), l'œil (0) à droite, le manche qui descend. */
function froeIcon(): Canvas {
  const c = new Canvas(16, 16);
  for (let x = 1; x <= 10; x++) c.set(x, 3, x === 1 ? '3' : '2').set(x, 4, '3').set(x, 5, '1');
  c.set(1, 5, EMPTY);
  c.rect(11, 2, 2, 4, '0'); // l'œil, roulé autour du manche
  for (let y = 6; y <= 13; y++) c.set(11, y, 'M').set(12, y, 'm');
  c.set(11, 14, 'N').set(12, 14, 'N'); // le bout du manche
  return outline(c, DARK);
}

// ---------- Tenues au poing ----------
// Le poing (2 × 2, BRANCH_FIST) au centre de l'image ; la main du corps se voit à travers (fistGap). De dos, l'objet passe
// sous le corps : pas de trou.

const PEG_HELD = 13;
const PC = Math.floor(PEG_HELD / 2);

/**
 * La cheville serrée au poing, la tête au-dessus, la pointe dessous. De profil, penchée vers l'avant (la pointe en avant) ;
 * de face et de dos, dressée. Une colonne de bois, l'OUTLINE à l'est (pas de contour côté lumière : moins d'un pixel).
 */
function heldPegView(view: View): Grid {
  const c = new Canvas(PEG_HELD, PEG_HELD);
  const wood = ['Y', 'U', 'U', 'U', 'u', 'u'];
  wood.forEach((k, i) => {
    const y = PC - 2 + i;
    const x = view === 'right' ? PC + Math.floor(i / 2) : PC;
    c.set(x, y, k);
    if (i < wood.length - 1) c.set(x + 1, y, 'o');
  });
  return view === 'up' ? c.toGrid() : fistGap(c.toGrid(), PC, BRANCH_FIST);
}

const SHINGLE_HELD = 15;
const BC = Math.floor(SHINGLE_HELD / 2);

/**
 * Le bardeau tenu par le gros bout, pendu le long de la jambe. De profil, on voit sa face fendue (10 cm × 40 : 2 × 8 px,
 * le fil en long) ; de face et de dos, sa tranche (1 px). Le gros bout dans le poing, le bout aminci en bas.
 */
function heldShingleView(view: View): Grid {
  const c = new Canvas(SHINGLE_HELD, SHINGLE_HELD);
  for (let i = 0; i < 8; i++) {
    const y = BC - 1 + i;
    if (view === 'right') c.set(BC, y, i % 4 === 2 ? 't' : 'Y').set(BC + 1, y, i >= 6 ? 'T' : i % 3 === 1 ? 'Y' : 't');
    else c.set(BC, y, i >= 6 ? 'T' : 't');
  }
  outline(c, DARK);
  return view === 'up' ? c.toGrid() : fistGap(c.toGrid(), BC, BRANCH_FIST);
}

const FROE_HELD = 19;
const FC = Math.floor(FROE_HELD / 2);

/**
 * Le coutre tenu par le manche, debout dans le poing (le bout du manche dépasse au-dessus), l'œil en bas, la lame à
 * l'horizontale qui part vers l'avant, le fil en bas. De profil : la lame entière (6 px), dos (2) et fil (1). De face, la
 * lame vient vers nous : on la voit par le bout, un pixel de fer sous l'œil ; de dos, de même, cachée en partie par le corps.
 */
function heldFroeView(view: View): Grid {
  const c = new Canvas(FROE_HELD, FROE_HELD);
  const hx = FC; // la colonne du manche, dans le poing
  c.set(hx, FC - 2, 'N');
  for (let y = FC - 1; y <= FC + 3; y++) c.set(hx, y, 'M');
  c.set(hx, FC + 4, '0').set(hx, FC + 5, '0'); // l'œil
  if (view === 'right') {
    for (let x = hx + 1; x <= hx + 6; x++) c.set(x, FC + 4, x === hx + 6 ? '3' : '2').set(x, FC + 5, '1');
  } else {
    c.set(hx + 1, FC + 4, '2').set(hx + 1, FC + 5, '1'); // la lame par le bout, vers nous
  }
  outline(c, DARK);
  return view === 'up' ? c.toGrid() : fistGap(c.toGrid(), FC, BRANCH_FIST);
}

const held = (name: string, size: number, f: (v: View) => Grid): SpriteSheetSource =>
  sheet(name, size, toolPalette, { down: f('down'), up: f('up'), right: f('right') });

const sources = [
  ...TURNS.map((t) => img(`peg-ground${suffix(t)}`, pegGround(t))),
  img('item-peg', pegIcon().toGrid()),
  held('held-peg', PEG_HELD, heldPegView),
  ...TURNS.map((t) => img(`shingle-ground${suffix(t)}`, shingleGround(t))),
  img('item-shingle', shingleIcon().toGrid()),
  held('held-shingle', SHINGLE_HELD, heldShingleView),
  ...TURNS.map((t) => img(`froe-ground${suffix(t)}`, lyingView(froeInner(t), DARK, t % 2 === 1))),
  img('item-froe', froeIcon().toGrid()),
  held('held-froe', FROE_HELD, heldFroeView),
];

export default sources;
