// Icônes d'objets 16×16 : outils de paysan et armes (inventaire, objet posé au sol).
// Pas d'ombre portée : le jeu l'ajoute quand l'objet est posé.
// Tous les manches vont en diagonale, du bas à gauche vers le haut à droite : l'inventaire se lit d'un coup d'œil.
// Contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite.

import { Canvas } from '../lib/canvas';
import { GRIP, TOOL_SIZE, type ToolArt } from '../lib/held';
import type { Material, Materials } from '../lib/light';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { darkest, outline } from './lib';
import { lyingView } from './lying';

const S = 16;

export const toolPalette = {
  ...world,
  // fer forgé, usé : dérivé de la pierre (R r z Z), refroidi d'un cran
  '1': '#d6d3c4', // fil de la lame, arête éclairée (R éclairci)
  '2': '#a7a69c', // fer clair
  '3': '#7d7e7a', // fer
  '4': '#504b46', // fer dans l'ombre, contour côté lumière (Z tiré vers le brun-violet)
  // fer forgé brut de la hache, presque noir (docs/references/hache-vue-de-cote.png) : un gris froid, tiré vers le
  // bleu-violet pour ne pas se fondre dans OUTLINE (brun chaud) ni dans le bois sombre du tronc (N K)
  '0': '#35343a',
  // rouille, comme le minerai de fer
  '5': '#a65a34',
  '6': '#7a4430',
  // cuir de la poignée, dérivé du bois sombre (N K) réchauffé
  '7': '#80523a',
  '8': '#5a3627',
  // bouchon de la ligne de pêche : rouge des fleurs (c) et son ombre
  '9': '#8a3f36',
};

/** Teinte la plus sombre de chaque matière, pour le contour côté lumière. */
const dark = darkest({
  M: 'K', m: 'K', N: 'K', K: 'K', U: 'N', u: 'N', n: 'N', e: 'K',
  '1': '4', '2': '4', '3': '4', '4': '4', '0': '0', '5': '6', '6': '6',
  '7': '8', '8': '8', c: '9', '9': '9', a: 'E', d: 'E',
}, 'o');

/** Peint en coordonnées locales : `a` le long du manche (vers le haut à droite), `b` en travers (vers le haut à gauche). */
function local(c: Canvas, ox: number, oy: number, paint: (a: number, b: number) => string | null) {
  const r = Math.SQRT1_2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5 - ox, py = y + 0.5 - oy;
    const a = (px - py) * r, b = (-px - py) * r;
    const k = paint(a, b);
    if (k) c.set(x, y, k);
  }
}

/**
 * Manche de deux pixels en escalier sur la diagonale x + y = s (pixel de gauche) :
 * de la ligne y0 (bas) à y1 (haut). `light` à gauche, `shade` à droite.
 */
function shaft(c: Canvas, s: number, y0: number, y1: number, light: string, shade: string) {
  for (let y = y1; y <= y0; y++) c.set(s - y, y, light).set(s - y + 1, y, shade);
}

/**
 * Garde : barre de deux pixels en escalier sur l'anti-diagonale, de (x, y) vers le bas à droite, `n` pixels de long.
 * `top` sur le flanc haut-droit (éclairé), `bottom` sur le flanc bas-gauche, `end` au bout côté ombre.
 */
function crossbar(c: Canvas, x: number, y: number, n: number, top: string, bottom: string, end: string) {
  for (let k = 0; k < n; k++) c.set(x + k, y + k, bottom).set(x + k + 1, y + k, top);
  c.set(x + n, y + n - 1, end);
}

// ---------- Hache ----------
// Hache de bûcheron, à deux mains : un seul fer, tranchant d'un côté, talon court et carré de l'autre, l'œil entre
// les deux (docs/references/hache-vue-de-cote.png). En main, elle est à l'échelle du jeu (5 cm par pixel) : le manche
// fait 18 px de la prise au fer (90 cm), et dépasse de deux pixels derrière, sous la seconde main. Le fer est grossi
// du double (40 cm du talon au fil) pour se lire. L'icône d'inventaire n'est pas à l'échelle.
// Le fer est presque noir (fer forgé brut, `0`), avec un fil clair (`1`) sur tout le tranchant.

/** De la prise (main la plus proche du fer) au milieu de l'œil, le long du manche, en pixels (bord du fer à 17). */
const AXE_EYE = 18.5;
/** Bout du manche, derrière la prise (sous la seconde main). */
const AXE_TAIL = -3;

/**
 * Le fer dessiné pixel à pixel, vu de profil (la face du fer), tête en haut et tranchant à gauche : fil (1), fer
 * presque noir (zone 4, peinte en 0), œil autour du manche (e, les deux colonnes du manche), talon (4, une colonne). Asymétrique : côté
 * tranchant, le fer s'évase en éventail (la pointe monte de deux pixels, la barbe descend de trois, un creux la sépare
 * du manche) ; côté talon, un bloc carré qui ne dépasse le manche que d'un pixel. 9 px du talon au fil, 8 de haut au
 * fil, 3 à l'œil.
 */
const AXE_IRON = [
  '14.......',
  '1444.....',
  '144444ee4',
  '144444ee4',
  '144444ee4',
  '1444.....',
  '144......',
  '1........',
];

/**
 * Le fer en un point, en coordonnées du fer : `t` le long du manche depuis le milieu de l'œil (vers la tête), `b` en
 * travers depuis l'axe du manche, vers le tranchant. Lu dans AXE_IRON (au plus proche) : debout, un pixel du dessin
 * est un pixel de l'image.
 */
function axeIron(t: number, b: number): string | null {
  const row = AXE_IRON[Math.round(3 - t)];
  const k = row?.[Math.round(6.5 - b)];
  return k && k !== '.' ? k : null;
}

/**
 * Zone de la hache en un point, en coordonnées du manche : `a` le long du manche depuis la prise (vers le fer),
 * `b` en travers vers le tranchant. `half` : demi-épaisseur du manche à l'écran. `withIron` : false pour le manche
 * seul (en diagonale, le fer vient de axeIronDiag).
 */
function axeAt(a: number, b: number, half = 1, withIron = true): string | null {
  const iron = withIron ? axeIron(a - AXE_EYE, b) : null;
  if (iron) return iron;
  if (Math.abs(b) > half || a < AXE_TAIL || a > AXE_EYE + 1.5) return null;
  if (a < AXE_TAIL + 1) return 'N'; // bout du manche, bois de bout
  return a < 1.5 ? 'w' : 'M'; // poignée patinée par les deux mains
}

/**
 * Le même fer que AXE_IRON, en contour continu, pour la vue de profil en diagonale : échantillonné pixel à pixel,
 * AXE_IRON s'y émiette en marches et en trous. `t` le long du manche depuis le milieu de l'œil, `b` en travers
 * vers le tranchant. Côté talon, un bloc carré de trois pixels qui dépasse à peine le manche ; côté tranchant, le fer
 * s'évase de l'œil au fil, un peu vers la tête, beaucoup vers la prise (la barbe).
 */
function axeIronDiag(t: number, b: number): string | null {
  if (b < -1.9 || b > 6.3) return null;
  if (b <= 1.1) return Math.abs(t) <= 1.5 ? (Math.abs(b) <= 1.1 ? 'e' : '4') : null; // œil et talon
  const f = (b - 1.1) / 5.2; // 0 au collet, 1 au fil
  if (t > 1.5 + 1.5 * f * f || t < -1.5 - 3.3 * f ** 1.4) return null;
  return b > 5.6 ? '1' : '4';
}
/**
 * La hache vue de profil (la face du fer), en zones, tête vers `deg` à l'écran (90 = haut, 45 = haut à droite),
 * tranchant du côté 'ccw' (à gauche de la tête). L'axe du manche passe par le coin bas droit du pixel tenu GRIP :
 * deux pixels d'épaisseur debout, un escalier de deux pixels en diagonale.
 */
function axeSideZones(deg: number): Canvas {
  const c = new Canvas(TOOL_SIZE, TOOL_SIZE);
  const t = (deg * Math.PI) / 180;
  const ux = Math.cos(t), uy = -Math.sin(t); // vers la tête, à l'écran
  const ox = GRIP[0] + 1, oy = GRIP[1] + 1;
  const diagonal = deg % 90 !== 0;
  for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
    const px = x + 0.5 - ox, py = y + 0.5 - oy;
    const a = px * ux + py * uy;
    const b = px * uy - py * ux; // à gauche de la tête
    // en diagonale, le manche est l'escalier x + y = s ou s + 1 : centré un demi-pixel plus bas
    const k = diagonal ? axeIronDiag(a - AXE_EYE, b + 0.35) ?? axeAt(a, b + 0.35, 0.72, false) : axeAt(a, b);
    if (k) c.set(x, y, k);
  }
  return c;
}

// Par la tranche (coup vertical, chop-*, docs/references/hache-vue-de-dessus.png) : on ne voit jamais la lame
// déployée. Le fer n'est qu'un bloc étroit et sombre au bout du manche, un pixel plus large que lui de chaque côté,
// d'où dépasse le bout du manche. Le pied du bloc pousse d'un pixel vers la prise du côté du tranchant (la pointe de la
// barbe, vue par la tranche). Le coup a lieu dans un plan vertical : rien n'est raccourci, le manche garde sa longueur.

/** Le bloc de fer vu par la tranche, le long du manche depuis la prise : du pied à la tête (5 px, 25 cm). */
const AXE_BLOCK: [number, number] = [15, 20];

/** Zone du manche ou du fer vu par la tranche, en `a` le long du manche, `side` en travers. */
function axeEdgeOn(a: number, side: 'shaft' | 'block' | 'toe' | 'out'): string | null {
  const [foot, top] = AXE_BLOCK;
  if (side === 'out' || a < AXE_TAIL) return null;
  if (a >= foot && a < top) return 'f';
  if (side === 'toe' && a >= foot - 1 && a < foot) return 'f'; // pied de la barbe, côté tranchant
  if (side !== 'shaft') return null;
  if (a >= top && a < top + 1) return 'N'; // bout du manche, qui dépasse du fer
  if (a >= top) return null;
  return a < AXE_TAIL + 1 ? 'N' : a < 1.5 ? 'w' : 'M';
}

/**
 * La hache par la tranche, pour un coup vertical (art/lib/held.ts) : tête vers l'est (0), le nord-est (45) ou le
 * haut (90) à l'écran, tranchant du côté 'ccw'. Le manche (2 px) et le bloc (4 px) gardent leur largeur à l'écran.
 * En diagonale, le manche est l'escalier de deux pixels à 45°, comme de profil. La main tient le manche au pixel GRIP.
 */
function axeFlatZones(deg: 0 | 45 | 90): Canvas {
  const c = new Canvas(TOOL_SIZE, TOOL_SIZE);
  const [gx, gy] = GRIP;
  if (deg === 45) {
    // escalier à 45° : v = x + y - (gx + gy) en travers (le manche sur v = 0 et 1, le tranchant vers les v petits),
    // u = x - y - (gx - gy) le long du manche (2 par pas de diagonale, soit 1,4 px). Le bloc est un rectangle tourné,
    // aux bouts d'équerre avec le manche : six valeurs de v (quatre pixels en travers, comme debout), huit de u.
    // Pas de pied de barbe ici : en escalier, il effilerait le bloc en pointe de lance.
    for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
      const u = x - y - (gx - gy), v = x + y - (gx + gy);
      const shaft = v === 0 || v === 1;
      let z: string | null = null;
      if (u >= 20 && u <= 27 && v >= -2 && v <= 3) z = 'f';
      else if (shaft && u >= 28 && u <= 29) z = 'N'; // bout du manche, au-dessus du fer
      else if (shaft && u >= -4 && u < 20) z = u <= -3 ? 'N' : u <= 2 ? 'w' : 'M';
      if (z) c.set(x, y, z);
    }
    return c;
  }
  // est : le manche sur les rangées gy et gy + 1, la tête vers les x croissants, le tranchant en haut ;
  // haut : le manche sur les colonnes gx et gx + 1, la tête vers le haut, le tranchant à gauche
  for (let y = 0; y < TOOL_SIZE; y++) for (let x = 0; x < TOOL_SIZE; x++) {
    const a = deg === 90 ? gy + 1 - (y + 0.5) : x + 0.5 - gx;
    const across = deg === 90 ? x - gx : y - gy; // 0 et 1 : le manche ; négatif : côté tranchant
    const side = across === 0 || across === 1 ? 'shaft' : across === -1 ? 'toe' : across === 2 ? 'block' : 'out';
    const z = axeEdgeOn(a, side);
    if (z) c.set(x, y, z);
  }
  return c;
}

/**
 * Icône de la hache, 16×16, pas à l'échelle : long manche en diagonale, fer de profil en haut à droite, presque noir,
 * tranchant évasé vers le haut à gauche avec son fil clair, talon court et carré vers le bas à droite.
 */
function axe(): Canvas {
  const c = new Canvas(S, S);
  shaft(c, 15, 14, 5, 'M', 'm');
  c.within('M', (c) => c.set(2, 13, 'm').set(3, 12, 'm')); // poignée patinée par la main
  c.set(1, 14, 'N').set(2, 14, 'N'); // bout du manche
  local(c, ICON_EYE[0], ICON_EYE[1], (a, b) => {
    // même fer qu'en main, ramené à l'icône
    const k = axeIronDiag(a / ICON_SCALE, b / ICON_SCALE);
    return k === 'e' || k === '4' ? '0' : k;
  });
  return outline(c, dark);
}

/** Milieu de l'œil du fer dans l'icône, et réduction du fer en main. */
const ICON_EYE: [number, number] = [11.5, 6];
const ICON_SCALE = 0.9;

/** Matières de la hache en main : chaque zone retrouve sa rampe, éclairée après rotation. */
const axeMaterials: Materials = (() => {
  // fer forgé brut, presque noir (0), à peine relevé (4) sur ce qui fait face à la lumière ; contour côté lumière en 0
  const iron: Material = { light: '4', base: '0', shade: '0', dark: '0' };
  const wood: Material = { light: 'M', base: 'M', shade: 'm', dark: 'K' };
  return {
    '1': { light: '1', base: '1', shade: '2', dark: '0' }, // fil de la lame, poli : un trait clair sur tout le tranchant
    '4': iron,
    M: wood, m: wood,
    w: { light: 'm', base: 'm', shade: 'N', dark: 'K' }, // bois patiné de la poignée
    N: { light: 'N', base: 'N', shade: 'N', dark: 'K' }, // bout du manche, bois de bout
    e: iron, // œil du fer, autour du manche
    f: iron, // fer vu par la tranche : bloc sombre
  };
})();

// ---------- Pioche ----------

/** Pioche : fer arqué à deux pointes, posé en travers au bout du manche. */
function pickaxe(): Canvas {
  const c = new Canvas(S, S);
  shaft(c, 15, 14, 4, 'M', 'm');
  c.within('M', (c) => c.set(2, 13, 'm').set(3, 12, 'm'));
  local(c, 11, 5, (a, b) => {
    const t = b / 6.2; // -1 .. 1 d'une pointe à l'autre
    if (Math.abs(t) > 1) return null;
    const mid = 1.6 * (1 - t * t) - 0.6; // l'arc se bombe vers le haut à droite
    const half = 1.2 * (1 - Math.abs(t) ** 1.6) + 0.15;
    const d = a - mid;
    if (Math.abs(d) > half) return null;
    if (d > half - 0.9) return Math.abs(t) > 0.75 ? '2' : '1';
    if (d < -half + 0.9 && half > 0.7) return '4';
    return '3';
  });
  return outline(c, dark);
}

// ---------- Houe ----------

/** Houe : lame plate qui pend à angle aigu au bout du manche, plus large au tranchant. */
function hoe(): Canvas {
  const c = new Canvas(S, S);
  shaft(c, 15, 14, 3, 'M', 'm');
  c.within('M', (c) => c.set(2, 13, 'm').set(3, 12, 'm'));
  // douille de fer qui coiffe le bout du manche
  c.set(13, 2, '3').set(14, 2, '4').set(13, 3, '4').set(14, 3, '4');
  // lame : trapèze vu de face, sous la douille
  c.stamp([
    '.23.',
    '.234',
    '.234',
    '2334',
    '1111',
  ], 11, 4);
  c.set(13, 5, '5').set(13, 6, '6').set(14, 6, '6'); // rouille
  return outline(c, dark);
}

// ---------- Faucille ----------

/** Faucille : court manche de bois, lame en croissant qui monte puis retombe vers la droite. */
function sickle(): Canvas {
  const c = new Canvas(S, S);
  // lame : croissant entre deux cercles
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5, py = y + 0.5;
    const outer = Math.hypot(px - 8.6, py - 8.2);
    const inner = Math.hypot(px - 9.8, py - 9.6);
    if (outer > 6.2 || inner < 4.9) continue;
    if (py > 9.6 && px < 9) continue; // le croissant s'ouvre en bas à gauche, vers le manche
    if (py > 12.5) continue;
    c.set(x, y, inner < 6.0 ? '1' : outer > 5.2 ? '3' : '2');
  }
  c.set(6, 7, '.');
  shaft(c, 15, 14, 9, 'M', 'm');
  c.set(5, 9, '4').set(6, 9, '4').set(6, 8, '4'); // virole
  return outline(c, dark);
}

// ---------- Arrosoir ----------

/** Arrosoir de fer cabossé : panse ronde à gauche, bec en diagonale vers le haut à droite, anse au-dessus. */
function wateringCan(): Canvas {
  const c = new Canvas(S, S);
  // bec : du bas de la panse vers le haut à droite, pomme au bout
  shaft(c, 19, 11, 7, '2', '3');
  c.stamp(['.12', '123', '.34'], 12, 3);
  // panse : dessus en ellipse (ouverture sombre), face avant claire à gauche, sombre à droite
  c.stamp([
    '.122223.',
    '22244233',
    '23333344',
    '21333344',
    '21333344',
    '21444344',
    '21322344',
    '21333344',
    '.665554.',
  ], 1, 6);
  const out = outline(c, dark);
  // anse en arc, tirée après le contour pour garder le jour dessous
  out.line(2, 4, 2, 4, '4').line(3, 3, 6, 3, '4').set(7, 4, '4');
  out.set(3, 2, '3').set(4, 2, '3').set(5, 2, '3').set(6, 2, '3').set(2, 3, '3').set(7, 3, '4').set(8, 4, 'o');
  return out;
}

// ---------- Canne à pêche ----------

/** Canne à pêche : perche de bois effilée, poignée entourée de ficelle, fil qui pend du bout avec son bouchon. */
function fishingRod(): Canvas {
  const c = new Canvas(S, S);
  shaft(c, 15, 14, 9, 'M', 'm');
  c.line(7, 7, 13, 1, 'm');
  c.within('Mm', (c) => c.set(2, 13, 'n').set(3, 12, 'n').set(3, 13, 'e').set(4, 12, 'e'));
  // bouchon
  c.rect(13, 8, 2, 2, 'c').set(14, 9, '9').set(13, 8, 'a');
  const out = outline(c, dark);
  // fil : sans contour, tiré après
  out.line(14, 1, 14, 7, 'd');
  return out;
}

// ---------- Épée ----------

/** Épée courte : lame de fer simple à arête claire, garde droite, poignée de cuir, pommeau rond. */
function sword(): Canvas {
  const c = new Canvas(S, S);
  // lame, pointe en haut à droite
  shaft(c, 15, 8, 2, '2', '3');
  for (let y = 3; y <= 8; y++) c.set(15 - y, y, '1');
  c.set(14, 1, '2');
  // poignée de cuir
  shaft(c, 15, 12, 9, '7', '8');
  // garde droite, en travers de la diagonale
  crossbar(c, 4, 6, 5, '2', '3', '4');
  // pommeau
  c.rect(2, 13, 2, 2, '3').set(2, 13, '2').set(3, 14, '4');
  return outline(c, dark);
}

// ---------- Épée de bois ----------

/** Épée d'entraînement : lame de bois épaisse au bout arrondi, garde clouée, poignée entourée de ficelle. */
function woodenSword(): Canvas {
  const c = new Canvas(S, S);
  for (let y = 3; y <= 9; y++) c.set(15 - y - 1, y, 'U').set(15 - y, y, 'u').set(15 - y + 1, y, 'n');
  c.set(11, 3, '.').set(13, 2, 'u').set(12, 2, 'U'); // bout arrondi
  // poignée entourée de ficelle : tours clairs et sombres
  shaft(c, 15, 13, 10, 'd', 'D');
  c.set(4, 11, 'E').set(5, 11, 'E').set(2, 13, 'E').set(3, 13, 'E');
  // garde : traverse clouée
  crossbar(c, 3, 7, 5, 'u', 'n', 'e');
  c.set(6, 9, 'e'); // clou
  return outline(c, dark);
}

/** Hache tenue en main : les cinq dessins du geste en zones, et leurs matières (art/lib/held.ts). */
export const axeArt = (): ToolArt => ({
  // de profil (la face du fer), pour un coup horizontal
  diag: axeSideZones(45).toGrid(),
  upright: axeSideZones(90).toGrid(),
  // par la tranche, pour un coup vertical
  flat: axeFlatZones(0).toGrid(),
  flatDiag: axeFlatZones(45).toGrid(),
  flatEnd: axeFlatZones(90).toGrid(),
  materials: axeMaterials,
});

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: toolPalette, grid: c.toGrid() });

// ---------- La cognée au sol ----------
// Couchée par terre (`axe-ground`, comme la hachette, art/items/hatchet.ts, et la doloire) : à l'échelle du jeu, sans le
// fer grossi de la main : manche de 90 cm (18 px du bout au haut de l'œil, contour compris), fer de 20 cm du fil à l'œil,
// couché à plat. On voit le manche (bout en bois de bout N, poignée patinée m, bois M), l'œil presque noir (0) au bout, et
// le fer qui s'évase de l'œil jusqu'au fil clair (1), tourné vers le nord quand la tête est à l'est. 18 × 5 px contour
// compris (une boîte de 90 × 20 × 6 cm : H + D/2 = 1,2 + 2 = 3,2 px, le fer à plat dessiné sur trois rangées, comme
// celui de la doloire) ; ses vues nord-sud 5 × 18 (règle D). Quatre vues, un quart de tour de plus à chaque fois dans le
// sens des aiguilles d'une montre : le fer suit la tête ; contour et ombre gardent la lumière en haut à gauche.

/** Contour côté lumière des vues au sol : comme la hachette (le fil bordé de fer noir). */
const groundDark = darkest({ M: 'K', m: 'K', N: 'K', K: 'K', '1': '0', '0': '0' }, 'o');

const AXE_GROUND: Record<'r0' | 'r1' | 'r2' | 'r3', string[]> = {
  // tête à l'est, le fil au nord
  r0: [
    '............1111',
    '.............00.',
    'NmmMMMMMMMMMM00.',
  ],
  // tête au sud, le fil à l'est
  r1: ['N..', 'm..', 'm..', ...Array(9).fill('M..'), 'M.1', '001', '001', '..1'],
  // tête à l'ouest, le fil au sud
  r2: [
    '.00MMMMMMMMMMmmN',
    '.00.............',
    '1111............',
  ],
  // tête au nord, le fil à l'ouest
  r3: ['1..', '100', '100', '1.M', ...Array(9).fill('..M'), '..m', '..m', '..N'],
};

const axeGround = (k: 0 | 1 | 2 | 3): ImageSource => ({
  kind: 'image',
  name: k ? `axe-ground-r${k}` : 'axe-ground',
  palette: toolPalette,
  grid: lyingView(AXE_GROUND[`r${k}`], groundDark, k % 2 === 1),
});

export default [
  img('item-axe', axe()),
  axeGround(0),
  axeGround(1),
  axeGround(2),
  axeGround(3),
  img('item-pickaxe', pickaxe()),
  img('item-hoe', hoe()),
  img('item-sickle', sickle()),
  img('item-watering-can', wateringCan()),
  img('item-fishing-rod', fishingRod()),
  img('item-sword', sword()),
  img('item-wooden-sword', woodenSword()),
];
