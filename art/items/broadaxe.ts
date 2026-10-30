// La doloire (docs/objets/broadaxe.md), hache à équarrir : icône, image au sol, portée sur l'épaule (posture `shoulder`,
// comme la cognée et la masse) et les cinq dessins du geste (planche tool-broadaxe, art/items/held.ts). Même famille que
// la cognée et la hachette (art/items/tools.ts, hatchet.ts) : fer forgé presque noir (0) à fil clair (1), manche de bois
// (M m), poignée patinée (w), bout du manche en bois de bout (N). Échelle du jeu (5 cm par pixel), lumière en haut à
// gauche, contour d'un pixel (teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite).
//
// Ce qui la distingue de la cognée : un fer large et plat dont le fil est long et droit (pas en éventail), l'œil en haut
// du fer, la lame qui pend le long du manche vers les mains (la barbe), séparée de lui par un jour d'un pixel ; et un
// manche coudé, déporté d'un pixel sous le fer, pour que les mains ne frottent pas la face qu'on dresse.
//
// Manche de 60 cm : 12 px, du bout (sous la seconde main) au haut de l'œil ; deux mains, le bout à trois pixels derrière
// la prise, comme la cognée. Fer de 25 × 15 cm (25 cm de fil, 15 de l'œil au fil), grossi de 1,6 fois pour se lire
// (la cognée et la hachette : du double) : de profil, 8 px de fil, 5 de l'œil au fil ; par la tranche, une lame mince
// de 8 px le long du manche, l'œil en bloc plus large à son bout.

import { Canvas, type Grid } from '../lib/canvas';
import { GRIP, TOOL_SIZE, gripOf, orientedZones, type ToolArt } from '../lib/held';
import { lightUp } from '../lib/light';
import type { ArtSource, ImageSource, SpriteSheetSource } from '../lib/types';
import { FIST, behindHead, fistGap, sheet } from './carried';
import { darkest, outline } from './lib';
import { axeArt, toolPalette } from './tools';

/** Milieu de l'œil, le long du manche depuis la prise ; l'œil couvre deux rangées, le haut du fer une de plus. */
const EYE = 8;
/** Bout du manche, derrière la prise (sous la seconde main). */
const TAIL = -3;
/** Le coude : à partir d'ici (le long du manche), le manche et le fer sont déportés d'un pixel vers le tranchant. */
const BEND = 2;
/** Bas de la lame (la pointe de la barbe), le long du manche depuis le milieu de l'œil : 8 rangées de fil en tout. */
const TOE = -6;
/** Le fil, en travers depuis l'axe du manche : la lame va de 2 à FIL, sa dernière colonne est le fil. */
const FIL = 6;

/** Déport du coude en un point du manche : 0 sous le coude, 1 au-dessus. */
const sway = (a: number): number => (a >= BEND ? 1 : 0);

/**
 * La doloire de profil (la face du fer) en un point : `a` le long du manche depuis la prise, `b` en travers vers le
 * tranchant, `half` la demi-épaisseur du manche à l'écran. Œil (e) autour du manche sur deux rangées, talon court (4)
 * de l'autre côté ; la lame (4, peinte presque noir) de la rangée au-dessus de l'œil jusqu'à la barbe, collée à l'œil
 * par un collet d'une colonne, puis séparée du manche par un jour d'un pixel ; le bas de la barbe remonte en arrondi
 * vers le fil, qui reste droit (1) sur ses huit rangées.
 */
function side(a: number, b: number, half: number): string | null {
  const bb = b - sway(a); // le fer et le haut du manche sont déportés vers le tranchant
  const t = a - EYE;
  if (t >= -1 && t < 1) {
    if (Math.abs(bb) <= 1) return 'e'; // l'œil, autour du manche
    if (bb >= -2 && bb < -1) return '4'; // talon
    if (bb > 1 && bb < FIL) return bb > FIL - 1 ? '1' : '4'; // collet et lame
  }
  if (t >= TOE && t < 2) {
    // le dos de la lame : un jour d'un pixel le long du manche, puis il s'arrondit vers le fil sous la barbe
    const back = 2 + Math.max(0, -4 - t) * 1.5;
    if (bb >= back && bb < FIL) return bb > FIL - 1 ? '1' : '4';
  }
  if (Math.abs(bb) > half || a < TAIL || a >= EYE + 1) return null;
  if (a < TAIL + 1) return 'N'; // bout du manche, bois de bout
  return a < 1.5 ? 'w' : 'M'; // poignée patinée par les deux mains
}

/**
 * La doloire de profil, en zones, tête vers `deg` (90 = haut, 45 = haut à droite), tranchant du côté 'ccw'. L'axe du
 * manche passe par le coin bas droit du pixel tenu GRIP, comme pour la cognée ; en diagonale, le manche est l'escalier
 * de deux pixels, centré un demi-pixel plus bas.
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
    const k = deg === 45 ? side(a, b + 0.35, 0.72) : side(a, b, 1);
    if (k) c.set(x, y, k);
  }
  return c;
}

/**
 * La doloire par la tranche (coup vertical) en un point : `a` le long du manche depuis la prise, `across` en pixels en
 * travers (0 et 1 : le manche sous le coude ; négatif : côté tranchant). Au-dessus du coude, le manche passe un pixel
 * vers le tranchant. La lame, mince, est une colonne de fer le long du manche du côté du tranchant, sur toute la
 * longueur du fil ; l'œil, un bloc de cinq pixels en travers sur deux rangées ; le bout du manche dépasse au-dessus.
 */
function edge(a: number, across: number): string | null {
  const hx = -sway(a); // colonne gauche du manche
  const t = a - EYE;
  if (t >= -1 && t < 1 && across >= hx - 2 && across <= hx + 2) return 'f'; // l'œil
  if (t >= TOE && t < 2 && across === hx - 1) return 'f'; // la lame, vue par la tranche
  if (across !== hx && across !== hx + 1) return null;
  if (a >= EYE + 1 && a < EYE + 2) return 'N'; // bout du manche, qui dépasse de l'œil
  if (a < TAIL || a >= EYE + 1) return null;
  if (a < TAIL + 1) return 'N';
  return a < 1.5 ? 'w' : 'M';
}

/** La doloire par la tranche, tête vers l'est (0) ou le haut (90), tranchant côté 'ccw'. */
function edgeStraight(deg: 0 | 90): Canvas {
  const c = new Canvas(TOOL_SIZE, TOOL_SIZE);
  const [gx, gy] = GRIP;
  for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
    const a = deg === 90 ? gy + 1 - (y + 0.5) : x + 0.5 - gx;
    const across = deg === 90 ? x - gx : y - gy;
    const z = edge(a, across);
    if (z) c.set(x, y, z);
  }
  return c;
}

/**
 * La doloire par la tranche en diagonale, tête vers le haut à droite : manche en escalier de deux pixels à 45° (v = 0
 * et 1 en travers, u le long du manche, 2 par pas de diagonale, soit 1,4 px), déporté de deux valeurs de v (un pixel)
 * au-dessus du coude ; la lame, deux valeurs de v côté tranchant ; l'œil, six valeurs de v sur trois de u.
 */
function edgeDiag(): Canvas {
  const c = new Canvas(TOOL_SIZE, TOOL_SIZE);
  const [gx, gy] = GRIP;
  const along = (u: number) => u / Math.SQRT2; // u -> pixels le long du manche
  for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
    const u = x - y - (gx - gy), v = x + y - (gx + gy);
    const a = along(u) + 0.5;
    const hv = a >= BEND ? -2 : 0;
    const t = a - EYE;
    let z: string | null = null;
    if (t >= -1 && t < 1 && v >= hv - 3 && v <= hv + 2) z = 'f';
    else if (t >= TOE && t < 2 && (v === hv - 2 || v === hv - 1)) z = 'f';
    else if (v === hv || v === hv + 1) {
      if (a >= EYE + 1 && a < EYE + 2) z = 'N';
      else if (a >= TAIL && a < EYE + 1) z = a < TAIL + 1 ? 'N' : a < 1.5 ? 'w' : 'M';
    }
    if (z) c.set(x, y, z);
  }
  return c;
}

/** Matières : celles de la cognée (même fer, même bois). */
const materials = axeArt().materials;

/** La doloire en main : les cinq dessins des gestes, en zones, et leurs matières (art/lib/held.ts). */
export const broadaxeArt = (): ToolArt => ({
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

/** Prise de la main dans l'icône, et réduction de la doloire en main. */
const ICON_GRIP: [number, number] = [4, 12.5];
const ICON_SCALE = 1;

/**
 * Icône de la doloire, 16 × 16, pas à l'échelle : le même dessin qu'en main, réduit, en diagonale du bas à gauche vers
 * le haut à droite comme les autres manches ; la lame large pend du haut à droite le long du manche, son fil droit et
 * clair vers le haut à gauche ; le coude se voit sous la barbe.
 */
function icon(): Canvas {
  const c = new Canvas(S, S);
  const r = Math.SQRT1_2;
  const [ox, oy] = ICON_GRIP;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5 - ox, py = y + 0.5 - oy;
    const a = (px - py) * r / ICON_SCALE, b = (-px - py) * r / ICON_SCALE;
    const k = side(a, b + 0.35, 0.9);
    if (!k) continue;
    c.set(x, y, k === '1' ? '1' : k === '4' || k === 'e' ? '0' : k === 'w' ? 'm' : k);
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
 * La doloire couchée par terre, la lame à plat (`broadaxe-ground`, 60 × 25 × 6 cm : gabarit 12 × 3,7 px ; dessinée
 * 12 × 5, contour compris) : le manche à l'horizontale, le fer au bout droit, sa lame à plat au nord du manche, en
 * raccourci (deux rangées), son fil clair au bord nord, sur six pixels ; l'œil sur le manche, au bout.
 */
function ground(): Grid {
  const c = new Canvas(12, 5);
  c.set(1, 3, 'N'); // bout du manche
  for (let x = 2; x <= 8; x++) c.set(x, 3, x <= 3 ? 'm' : 'M');
  c.stamp(['111111', '000000'], 5, 1); // la lame à plat : le fil au nord
  c.stamp(['00'], 9, 3); // l'œil, au bout du manche
  return groundShadow(outline(c, dark));
}

// ---------- Sur l'épaule ----------
// Comme la cognée et la masse (held-axe, art/items/carried.ts ; held-maul) : le poing droit tient le manche près du
// bout, devant la poitrine ; le manche passe sur l'épaule ; le fer est derrière l'épaule, au-dessus. De face et de dos,
// on la voit par la tranche (la lame mince et l'œil) ; de profil, la face de la lame, le fil tourné vers le bas et la lame
// à plat contre le dos (le fil vers le haut, elle pendrait le long du manche, cachée derrière la tête).

const HELD = 33;
const C = Math.floor(HELD / 2);
/**
 * Sur l'épaule, le poing serre le manche plus bas qu'au geste, près du bout (qui dépasse encore d'un pixel) : le manche
 * est court, et tenu à la prise du geste, le fer resterait caché derrière la tête.
 */
const SHOULDER_HOLD = -2;

/**
 * La doloire par la tranche, manche presque debout qui penche vers le dehors (vers la gauche de l'image ; `mirror` :
 * vers la droite). `from` : première rangée dessinée, en pixels au-dessus de la prise (de dos, ce qui est sous l'épaule
 * est caché par le corps).
 */
function edgeZones(mirror: boolean, from = TAIL): Canvas {
  const c = new Canvas(HELD, HELD);
  const lean = 0.45; // pixels vers le dehors par rangée qui monte
  for (let up = Math.max(from, TAIL - SHOULDER_HOLD); up <= EYE + 1 - SHOULDER_HOLD; up++) {
    const off = Math.round(up * lean);
    const x0 = mirror ? C + off : C - off; // pixel gauche du manche sous le coude
    for (let across = -3; across <= 3; across++) {
      const z = edge(up + 0.5 + SHOULDER_HOLD, across);
      if (z) c.set(x0 + across, C - up, z);
    }
  }
  return c;
}

/** La doloire de profil, tête vers le haut à gauche (derrière son dos), tranchant vers le bas, contre le dos. */
function sideHeld(): Canvas {
  const zones = orientedZones(broadaxeArt(), 'nw', 'ccw');
  const [gx, gy] = gripOf('nw', 'ccw');
  // la prise descend vers le bout du manche : l'outil monte d'un pas de diagonale vers sa tête (haut à gauche)
  return new Canvas(HELD, HELD).stamp(zones, C - gx - 1, C - gy - 1);
}

const heldBroadaxe = (): SpriteSheetSource =>
  sheet('held-broadaxe', HELD, toolPalette, {
    down: behindHead(fistGap(lightUp(edgeZones(false).toGrid(), materials), C, FIST), 'down'),
    up: lightUp(edgeZones(true, 4).toGrid(), materials),
    right: behindHead(fistGap(lightUp(sideHeld().toGrid(), materials), C, FIST), 'right'),
  });

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: toolPalette, grid });

const sources: ArtSource[] = [img('item-broadaxe', icon().toGrid()), img('broadaxe-ground', ground()), heldBroadaxe()];

export default sources;
