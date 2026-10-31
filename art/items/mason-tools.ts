// Les outils du tailleur de pierre (chantier « briques ») : le têtu (`stone-hammer`, marteau de maçon à tête de fer à deux
// pans carrés), le ciseau de tailleur (`stone-chisel`, barre de fer à tranchant plat) et le maillet de bois (`mallet`).
// Pour chacun : l'icône 16 × 16, ses quatre vues couchées au sol (`<nom>-ground`, est-ouest, puis `-r1`, `-r2`, `-r3`, un
// quart de tour de plus à chaque fois dans le sens des aiguilles d'une montre : règle D, docs/STYLE.md section 8) et la
// planche tenue au poing `held-<nom>` (posture `hand`, comme la hachette, art/items/hatchet.ts).
//
// Matières : fer forgé de la palette des outils (2 clair, 3 fer, 4 dans l'ombre, 1 le fil du tranchant), plus gris que le
// fer presque noir de la hachette (0) : le têtu et le ciseau sont du fer trempé, poli par la pierre ; bois du manche M m,
// bout du manche en bois de bout N ; tête du maillet en bois dur M m N, son bout en bois de bout Y t T.
// Échelle du jeu (5 cm par pixel), lumière en haut à gauche, contour d'un pixel (teinte la plus sombre de la matière en
// haut et à gauche, OUTLINE en bas et à droite), ombre portée au sol.
//
// Gabarit au sol (boîte W × (H + D/2), contour compris) :
// - têtu, 40 × 15 × 6 cm : 8 × 2,7 ; dessiné 8 × 4 (la tête en travers sur deux rangées, comme le fer de la hachette) ;
// - ciseau, 25 × 4 × 3 cm : 5 × 1 ; plancher de lisibilité, 6 × 3 (une rangée de fer entre ses deux contours) ;
// - maillet, 40 × 25 × 12 cm : 8 × 4,9 ; dessiné 8 × 5.

import { BRANCH_FIST, fistGap, sheet } from './carried';
import { Canvas, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { capsule, darkest, outline } from './lib';
import { lyingView } from './lying';
import { toolPalette } from './tools';

/** Teinte la plus sombre de chaque matière, pour le contour côté lumière. */
const dark = darkest({ M: 'K', m: 'K', N: 'K', K: 'K', Y: 'N', t: 'N', T: 'N', '1': '4', '2': '4', '3': '4', '4': '4' }, 'o');

type Views = Record<'r0' | 'r1' | 'r2' | 'r3', Grid>;

// ---------- Au sol ----------
// Les matières de chaque vue, sans contour (lyingView ajoute contour et ombre) ; `r0` : la tête à l'est.

const GROUND: Record<'stone-hammer' | 'stone-chisel' | 'mallet', Views> = {
  // Têtu : manche de 35 cm (bout N, poignée m, bois M), la tête de fer en travers au bout, qui déborde au nord du manche ;
  // son dessus clair (2) au nord, son flanc (3) au sud.
  'stone-hammer': {
    r0: ['.....2', 'NmMMM3'],
    r1: ['N.', 'm.', 'M.', 'M.', 'M.', '23'],
    r2: ['2MMMmN', '3.....'],
    r3: ['23', '.M', '.M', '.M', '.m', '.N'],
  },
  // Ciseau : la tête refoulée par les coups (4, sombre), la barre (3), le tranchant plat (1).
  'stone-chisel': {
    r0: ['4331'],
    r1: ['4', '3', '3', '1'],
    r2: ['1334'],
    r3: ['1', '3', '3', '4'],
  },
  // Maillet : manche de 30 cm (bout N, bois m), la tête de bois en travers, couchée nord-sud : son flanc (M éclairé, m) et
  // son bout sud en bois de bout (t T), en bande comme le bout d'une bille nord-sud.
  mallet: {
    r0: ['....Mm', 'NmmmMm', '....tT'],
    r1: ['.N.', '.m.', '.m.', '.m.', 'tMm', 'tmN'],
    r2: ['Mm....', 'MmmmmN', 'tT....'],
    r3: ['tMm', 'tmN', '.m.', '.m.', '.m.', '.N.'],
  },
};

// ---------- Icônes ----------
// 16 × 16, pas à l'échelle : le manche en diagonale du bas à gauche vers le haut à droite, la tête en haut à droite.

/** Manche en diagonale, du bout (x0, y0) à (x1, y1) : bois éclairé M au-dessus, m dessous, le bout en N. */
function handle(c: Canvas, x0: number, y0: number, x1: number, y1: number) {
  capsule(c, x0, y0, x1, y1, 0.85, (a, b) => (a < 0.12 ? 'N' : b < 0 ? 'M' : 'm'));
}

function iconHammer(): Canvas {
  const c = new Canvas(16, 16);
  handle(c, 3, 13, 10, 6);
  // la tête : une barre de fer en travers du manche, deux pans carrés aux bouts
  capsule(c, 7.5, 2.5, 14, 9, 1.5, (a, b) => (a < 0.12 || a > 0.88 ? (b < 0 ? '2' : '4') : b < -0.2 ? '2' : b < 0.5 ? '3' : '4'));
  return outline(c, dark);
}

function iconChisel(): Canvas {
  const c = new Canvas(16, 16);
  capsule(c, 3, 13, 12.5, 3.5, 1.05, (a, b) => (a < 0.14 ? '1' : a > 0.86 ? '4' : b < 0 ? '2' : '3'));
  return outline(c, dark);
}

function iconMallet(): Canvas {
  const c = new Canvas(16, 16);
  handle(c, 3, 13, 9.5, 6.5);
  // la tête de bois : un cylindre en travers, son bout nord-ouest en bois de bout
  capsule(c, 7, 3, 13, 9, 2.4, (a, b) => (a < 0.16 ? (b < 0 ? 'Y' : 't') : a > 0.9 ? 'N' : b < -0.35 ? 'M' : b < 0.45 ? 'm' : 'N'));
  return outline(c, dark);
}

// ---------- Tenue au poing ----------
// Posture `hand`, comme la hachette : le poing (BRANCH_FIST, effacé de face et de profil : la main du corps se voit à
// travers) serre le manche près du bout, qui dépasse au-dessus ; l'outil pend le long de la jambe, la tête en bas.
// De face et de dos, la tête vient vers nous : on la voit par son bout ; de profil, en long.

const HELD = 17;
const C = Math.floor(HELD / 2);

/** Une vue tenue : les matières par rangée depuis la rangée 6 (le bout du manche), contour ajouté. */
function heldGrid(rows: string[]): Grid {
  const c = new Canvas(HELD, HELD);
  c.stamp(rows, 0, 6);
  return outline(c, dark).toGrid();
}

const HELD_VIEWS: Record<'stone-hammer' | 'stone-chisel' | 'mallet', Record<'down' | 'right', string[]>> = {
  'stone-hammer': {
    // la tête par le bout : un pan carré, le manche qui y entre
    down: [
      '........NN',
      '........Mm',
      '........Mm',
      '........Mm',
      '........Mm',
      '.......2233',
      '.......2333',
      '.......3334',
    ],
    // la tête en long : une barre de fer à deux pans, le manche au milieu
    right: [
      '........NN',
      '........Mm',
      '........Mm',
      '........Mm',
      '........Mm',
      '.....2222223',
      '.....3333334',
    ],
  },
  'stone-chisel': {
    // la barre dans le poing, la tête refoulée au-dessus, le tranchant en bas : de face, la largeur du fil
    down: [
      '........44',
      '........23',
      '........23',
      '........23',
      '........23',
      '........11',
    ],
    // de profil, le biseau s'amincit vers le fil
    right: [
      '........44',
      '........23',
      '........23',
      '........23',
      '........23',
      '........1.',
    ],
  },
  mallet: {
    // la tête par le bout : son flanc au-dessus, le bois de bout rond vers nous
    down: [
      '........NN',
      '........mm',
      '........mm',
      '........mm',
      '.......MMmm',
      '.......YttT',
      '.......tTTT',
    ],
    // la tête en long : un cylindre de bois, ses deux bouts en bois de bout
    right: [
      '........NN',
      '........mm',
      '........mm',
      '........mm',
      '......YMMmT',
      '......tmmmT',
      '......tNNNT',
    ],
  },
};

function held(name: 'stone-hammer' | 'stone-chisel' | 'mallet'): SpriteSheetSource {
  const v = HELD_VIEWS[name];
  const down = heldGrid(v.down);
  return sheet(`held-${name}`, HELD, toolPalette, {
    down: fistGap(down, C, BRANCH_FIST),
    up: down,
    right: fistGap(heldGrid(v.right), C, BRANCH_FIST),
  });
}

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: toolPalette, grid });

function tool(name: 'stone-hammer' | 'stone-chisel' | 'mallet', icon: Canvas) {
  const g = GROUND[name];
  return [
    img(`item-${name}`, icon.toGrid()),
    img(`${name}-ground`, lyingView(g.r0, dark, false)),
    img(`${name}-ground-r1`, lyingView(g.r1, dark, true)),
    img(`${name}-ground-r2`, lyingView(g.r2, dark, false)),
    img(`${name}-ground-r3`, lyingView(g.r3, dark, true)),
    held(name),
  ];
}

const sources = [
  ...tool('stone-hammer', iconHammer()),
  ...tool('stone-chisel', iconChisel()),
  ...tool('mallet', iconMallet()),
];

export default sources;
