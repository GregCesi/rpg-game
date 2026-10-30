// La hachette (docs/objets/hatchet.md) : icône, image au sol, tenue au poing (posture `hand`) et les cinq dessins du
// geste (planche tool-hatchet, art/items/held.ts). Même dessin que la hache de bûcheron (art/items/tools.ts), en petit :
// fer forgé presque noir (0) à fil clair (1), manche de bois (M m), poignée patinée (w), bout du manche en bois de bout (N).
// Échelle du jeu (5 cm par pixel), lumière en haut à gauche, contour d'un pixel (teinte la plus sombre de la matière en
// haut et à gauche, OUTLINE en bas et à droite).
//
// Manche de 40 cm : 8 px, du bout (sous le poing) au haut de l'œil. Une seule main : la prise est à un pixel du bout.
// Fer de 12 × 8 cm, grossi du double comme celui de la hache pour se lire : de profil, 5 px au fil sur 6 du fil au
// talon (la hache : 8 sur 9) ; par la tranche, un bloc de 4 × 3 px (la hache : 4 × 5).

import { Canvas, type Grid } from '../lib/canvas';
import { GRIP, TOOL_SIZE, type ToolArt } from '../lib/held';
import { lightUp } from '../lib/light';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { BRANCH_FIST, fistGap, sheet } from './carried';
import { darkest, outline } from './lib';
import { lyingView } from './lying';
import { axeArt, toolPalette } from './tools';

/** Milieu de l'œil, le long du manche depuis la prise ; l'œil couvre deux rangées, le manche s'arrête à son haut. */
const EYE = 6;
/** Bout du manche, derrière la prise (un pixel : une seule main). */
const TAIL = -1;

/**
 * Le fer de profil, tête en haut, tranchant à gauche : fil (1), fer (4, peint presque noir), œil autour du manche (e,
 * les deux colonnes du manche), talon (4, une colonne). La pointe monte d'un pixel au-dessus du manche, la barbe
 * descend de deux sous l'œil.
 */
const IRON: Grid = [
  '14....',
  '144ee4',
  '144ee4',
  '14....',
  '1.....',
];

/** Le fer en un point : `t` le long du manche depuis le milieu de l'œil, `b` en travers vers le tranchant. */
function iron(t: number, b: number): string | null {
  const k = IRON[Math.round(1.5 - t)]?.[Math.round(3.5 - b)];
  return k && k !== '.' ? k : null;
}

/**
 * Le même fer en diagonale, en contour continu (échantillonné pixel à pixel, IRON s'émietterait en marches) : côté
 * talon, un bloc qui dépasse à peine le manche ; côté tranchant, le fer s'évase de l'œil au fil, surtout vers la prise.
 */
function ironDiag(t: number, b: number): string | null {
  if (b < -1.6 || b > 4.6) return null;
  if (b <= 1.1) return Math.abs(t) <= 1.05 ? (Math.abs(b) <= 1.1 ? 'e' : '4') : null; // œil et talon
  const f = (b - 1.1) / 3.5; // 0 au collet, 1 au fil
  if (t > 1.05 + 1.2 * f * f || t < -1.05 - 2.6 * f ** 1.3) return null;
  return b > 3.8 ? '1' : '4';
}

/** Manche (sans fer) à `a` le long du manche depuis la prise ; `half` : demi-épaisseur à l'écran. */
function handle(a: number, b: number, half: number): string | null {
  if (Math.abs(b) > half || a < TAIL || a > EYE + 1) return null;
  if (a < TAIL + 1) return 'N'; // bout du manche, sous le poing
  return a < 1.5 ? 'w' : 'M'; // poignée patinée
}

/**
 * La hachette de profil, en zones, tête vers `deg` (90 = haut, 45 = haut à droite), tranchant du côté 'ccw'. L'axe du
 * manche passe par le coin bas droit du pixel tenu GRIP, comme pour la hache.
 */
function sideZones(deg: 45 | 90): Canvas {
  const c = new Canvas(TOOL_SIZE, TOOL_SIZE);
  const r = (deg * Math.PI) / 180;
  const ux = Math.cos(r), uy = -Math.sin(r);
  const ox = GRIP[0] + 1, oy = GRIP[1] + 1;
  for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
    const px = x + 0.5 - ox, py = y + 0.5 - oy;
    const a = px * ux + py * uy;
    const b = px * uy - py * ux;
    const k = deg === 45
      ? ironDiag(a - EYE, b + 0.35) ?? handle(a, b + 0.35, 0.72)
      : iron(a - EYE, b) ?? handle(a, b, 1);
    if (k) c.set(x, y, k);
  }
  return c;
}

/** Le bloc de fer par la tranche, le long du manche depuis la prise : [pied, haut[ (3 px), le haut au bout du manche. */
const BLOCK: [number, number] = [4, 7];

/**
 * La hachette par la tranche (coup vertical), en zones : tête vers l'est (0) ou le haut (90), tranchant côté 'ccw'.
 * Le bloc fait quatre pixels en travers (un de plus que le manche de chaque côté) ; son pied pousse d'un pixel vers la
 * prise du côté du tranchant.
 */
function edgeStraight(deg: 0 | 90): Canvas {
  const c = new Canvas(TOOL_SIZE, TOOL_SIZE);
  const [gx, gy] = GRIP;
  const [foot, top] = BLOCK;
  for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
    const a = deg === 90 ? gy + 1 - (y + 0.5) : x + 0.5 - gx;
    const across = deg === 90 ? x - gx : y - gy; // 0 et 1 : le manche ; négatif : côté tranchant
    let z: string | null = null;
    if (a >= foot && a < top && across >= -1 && across <= 2) z = 'f';
    else if (across === -1 && a >= foot - 1 && a < foot) z = 'f'; // pied de la barbe
    else if (across === 0 || across === 1) z = handle(a, 0, 1);
    if (z) c.set(x, y, z);
  }
  return c;
}

/**
 * La hachette par la tranche en diagonale, tête vers le haut à droite : le manche est l'escalier de deux pixels à 45°
 * (v = 0 et 1 en travers, u le long du manche, 2 par pas de diagonale), le bloc un rectangle tourné de six valeurs de v
 * (quatre pixels, comme debout) sur cinq de u.
 */
function edgeDiag(): Canvas {
  const c = new Canvas(TOOL_SIZE, TOOL_SIZE);
  const [gx, gy] = GRIP;
  for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
    const u = x - y - (gx - gy), v = x + y - (gx + gy);
    let z: string | null = null;
    if (u >= 6 && u <= 10 && v >= -2 && v <= 3) z = 'f';
    else if ((v === 0 || v === 1) && u >= -2 && u < 6) z = u <= -1 ? 'N' : u <= 1 ? 'w' : 'M';
    if (z) c.set(x, y, z);
  }
  return c;
}

/** Matières : celles de la hache (même fer, même bois). */
const materials = axeArt().materials;

/** La hachette en main : les cinq dessins des gestes, en zones, et leurs matières (art/lib/held.ts). */
export const hatchetArt = (): ToolArt => ({
  diag: sideZones(45).toGrid(),
  upright: sideZones(90).toGrid(),
  flat: edgeStraight(0).toGrid(),
  flatDiag: edgeDiag().toGrid(),
  flatEnd: edgeStraight(90).toGrid(),
  materials,
});

// ---------- Icône et image au sol ----------

const S = 16;

/** Teinte la plus sombre de chaque matière, pour le contour côté lumière. */
const dark = darkest({ M: 'K', m: 'K', N: 'K', K: 'K', '1': '0', '4': '0', '0': '0' }, 'o');

/**
 * Icône de la hachette, 16 × 16, pas à l'échelle, comme celle de la hache mais plus petite : manche court en diagonale
 * du bas à gauche vers le haut à droite, le fer de profil en haut à droite, presque noir, son fil clair vers le haut à
 * gauche, le talon court vers le bas à droite.
 */
function icon(): Canvas {
  const c = new Canvas(S, S);
  // manche de deux pixels en escalier sur x + y = 16, du bout (en bas à gauche) jusque sous le fer
  for (let y = 7; y <= 12; y++) c.set(16 - y, y, 'M').set(17 - y, y, 'm');
  c.set(4, 12, 'm').set(5, 11, 'm'); // poignée patinée
  c.set(3, 13, 'N').set(4, 13, 'N'); // bout du manche
  // le fer, le même qu'en main, un peu grossi
  const [ex, ey] = [10.5, 6.5];
  const r = Math.SQRT1_2, scale = 1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5 - ex, py = y + 0.5 - ey;
    const a = (px - py) * r, b = (-px - py) * r;
    const k = ironDiag(a / scale, b / scale);
    if (k) c.set(x, y, k === '1' ? '1' : '0');
  }
  return outline(c, dark);
}

/**
 * Ombre portée d'une image au sol : sous la rangée la plus basse de la silhouette, décalée d'un pixel vers la droite
 * (STYLE, section 2). Ajoute une rangée à l'image.
 */
function groundShadow(c: Canvas): Grid {
  const g = c.toGrid();
  const last = g[g.length - 1];
  return [...g, [...last].map((_, x) => (x > 0 && last[x - 1] !== '.' ? 'x' : '.')).join('')];
}

/**
 * La hachette couchée par terre (`hatchet-ground`, 40 × 12 × 5 cm : gabarit 8 × 2,2 px ; dessinée 8 × 4, contour
 * compris, le fer à plat sur deux rangées) : le manche à l'horizontale, le fer au bout droit, à plat, son fil clair
 * tourné vers le nord. Ombre dessous, décalée vers la droite.
 */
function ground(): Grid {
  const c = new Canvas(8, 4);
  c.set(1, 2, 'N'); // bout du manche
  for (let x = 2; x <= 4; x++) c.set(x, 2, 'M');
  c.stamp(['11', '00'], 5, 1); // le fer : le fil au nord, l'œil sur le manche
  return groundShadow(outline(c, dark));
}

/**
 * Les trois autres vues au sol (règle D : `-r1`, `-r3` nord-sud, 4 × 8 px ; `-r2` est-ouest, 8 × 4, contour compris),
 * chacune un quart de tour de plus dans le sens des aiguilles d'une montre : la lame à plat suit le fer (vers l'est quand
 * la tête est au sud, vers le sud quand elle est à l'ouest, vers l'ouest quand elle est au nord). Le contour et l'ombre
 * restent ceux d'une lumière en haut à gauche.
 */
const GROUND_VIEWS: Record<'r1' | 'r2' | 'r3', Grid> = {
  // tête au sud : le manche descend, le bout (N) au nord ; l'œil sur le manche, le fil à l'est
  r1: ['N.', 'M.', 'M.', 'M.', '01', '01'],
  // tête à l'ouest : l'œil au bout ouest du manche, le fil au sud, sous l'œil
  r2: ['00MMMN', '11....'],
  // tête au nord : le fil à l'ouest de l'œil, le manche descend vers son bout au sud
  r3: ['10', '10', '.M', '.M', '.M', '.N'],
};

// ---------- Tenue au poing ----------
// Posture `hand` : le poing (2 × 2, BRANCH_FIST) serre le manche près du bout, qui dépasse d'un pixel au-dessus ; la
// hachette pend le long de la jambe, le fer en bas, le tranchant vers l'avant. De face et de dos, on la voit par la
// tranche (le bloc au bas du manche) ; de profil, la face du fer, le tranchant tourné vers où il regarde.

const HELD = 17;
const C = Math.floor(HELD / 2);

/**
 * Un dessin de base (prise au pixel GRIP, tête en haut) retourné tête en bas (demi-tour), recadré dans l'image tenue :
 * les deux colonnes du manche sur celles du poing (C et C + 1), la poignée (a = 0,5 et 1,5) sur ses deux rangées, le bout
 * du manche juste au-dessus.
 */
function hanging(zones: Grid): Grid {
  const c = new Canvas(HELD, HELD);
  const [gx, gy] = GRIP;
  zones.forEach((row, y) => [...row].forEach((k, x) => {
    if (k === '.') return;
    // demi-tour : la colonne gx va en C + 1 (gx + 1 en C), la rangée de la prise gy en C - 1, le bout du manche en C - 2
    c.set(C + 1 - (x - gx), C - 1 - (y - gy), k);
  }));
  return c.toGrid();
}

function heldView(view: 'down' | 'up' | 'right'): Grid {
  const art = hatchetArt();
  const g = lightUp(hanging(view === 'right' ? art.upright : art.flatEnd), materials);
  return view === 'up' ? g : fistGap(g, C, BRANCH_FIST);
}

const heldHatchet = (): SpriteSheetSource =>
  sheet('held-hatchet', HELD, toolPalette, { down: heldView('down'), up: heldView('up'), right: heldView('right') });

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: toolPalette, grid });

export default [
  img('item-hatchet', icon().toGrid()),
  img('hatchet-ground', ground()),
  img('hatchet-ground-r1', lyingView(GROUND_VIEWS.r1, dark, true)),
  img('hatchet-ground-r2', lyingView(GROUND_VIEWS.r2, dark, false)),
  img('hatchet-ground-r3', lyingView(GROUND_VIEWS.r3, dark, true)),
  heldHatchet(),
];
