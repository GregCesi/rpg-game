// Intérieur de la chaumière : tuiles (sol de terre battue, murs) et mobilier.
// Volontairement presque vide : on l'habillera au fil du jeu.

import { Canvas, rng } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource, TilesetSource } from '../lib/types';
import { world } from '../palette';

const T = 32;
const palette = {
  ...world,
  s: '#7a5a3e', // terre battue (base)
  S: '#6a4d34',
  A: '#93704c',
  g: '#a3814f', // couverture de laine de la mère
  G: '#7d4a38',
  B: '#a85f45',
  q: '#d9b56a', // jour vu par une fenêtre
};

// ---------- Tuiles ----------

/** Terre battue : base calme. La variété vient des détails posés par-dessus (paille, taches...). */
function floor(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 's');
  for (let i = 0; i < 18; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'S' : 'A');
  return c;
}

/** Dessus d'un mur épais (mur extérieur vu d'en haut). */
function wallTop(): Canvas {
  const c = new Canvas(T, T, 'K');
  for (let x = 3; x < T; x += 8) c.rect(x, 0, 1, T, 'o');
  for (let i = 0; i < 12; i++) c.set((i * 13) % T, (i * 7) % T, 'N');
  return c;
}

/** Ouverture de porte dans un mur épais : seuil de bois, sol visible. */
function doorway(): Canvas {
  const c = wallTop();
  c.rect(5, 0, 22, T, 's');
  c.rect(5, 12, 22, 6, 'M').rect(5, 12, 22, 1, 'Y').rect(5, 17, 22, 1, 'N');
  c.rect(4, 0, 1, T, 'o').rect(27, 0, 1, T, 'o');
  return c;
}

/** Fenêtre dans le mur sud, vue d'en haut : appui de bois, jour qui entre. */
function southWindow(): Canvas {
  const c = wallTop();
  c.rect(8, 8, 16, 16, 'N');
  c.rect(9, 9, 14, 12, 'q');
  c.rect(9, 9, 14, 2, 'Y');
  c.rect(4, 8, 4, 16, 'm').rect(24, 8, 4, 16, 'm');
  c.rect(7, 21, 18, 3, 'M').rect(7, 21, 18, 1, 'Y');
  return c;
}

/**
 * Mur du fond (nord) : deux tuiles de haut, poteaux tous les 64 px, grands panneaux de torchis.
 * On dessine un bloc de 64x64 puis on le découpe en quatre tuiles. braced : écharpe en diagonale.
 */
function wallBlock(braced: boolean, seed: number): Canvas {
  const c = new Canvas(64, 64, 'd');
  const r = rng(seed);
  for (let i = 0; i < 70; i++) c.set(Math.floor(r() * 64), Math.floor(r() * 64), 'D');
  c.rect(0, 50, 64, 8, 'D');
  // sablière haute (sous le plafond) et son ombre
  c.rect(0, 0, 64, 5, 'N').rect(0, 5, 64, 1, 'K');
  c.within('dD', (c) => c.rect(0, 6, 64, 3, 'E'));
  // lisse intermédiaire
  c.rect(0, 30, 64, 4, 'm').rect(0, 30, 64, 1, 'M').rect(0, 33, 64, 1, 'N');
  if (braced) {
    c.line(7, 9, 62, 29, 'm').line(7, 10, 62, 30, 'm').line(7, 11, 62, 31, 'N');
  }
  // plinthe
  c.rect(0, 58, 64, 6, 'm').rect(0, 58, 64, 1, 'M').rect(0, 63, 64, 1, 'N');
  // poteau
  c.rect(0, 0, 6, 58, 'm').rect(0, 0, 1, 58, 'M').rect(5, 0, 1, 58, 'N');
  return c;
}

/** Découpe une tuile 32x32 dans un bloc. */
function cut(block: Canvas, x: number, y: number): Canvas {
  const c = new Canvas(T, T);
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) c.set(i, j, block.get(x + i, y + j));
  return c;
}

/** Porte de derrière dans le mur du fond : 1 tuile de large, 2 de haut. */
function backDoor(): Canvas {
  const c = new Canvas(T, 64, 'd');
  c.rect(0, 0, T, 5, 'N').rect(0, 5, T, 1, 'K');
  c.rect(0, 58, T, 6, 'm').rect(0, 58, T, 1, 'M');
  c.rect(3, 12, 26, 52, 'K');
  c.rect(5, 14, 22, 50, 'm');
  for (let x = 9; x < 27; x += 5) c.rect(x, 14, 1, 50, 'N');
  c.rect(5, 14, 1, 50, 'M');
  c.rect(5, 22, 22, 2, 'Z').rect(5, 50, 22, 2, 'Z');
  c.set(23, 38, 'R').set(23, 39, 'z');
  return c;
}

/** Fenêtre haute dans le mur du fond (atelier). */
function backWindow(): Canvas {
  const c = cut(wallBlock(false, 99), 32, 0);
  c.rect(5, 10, 22, 18, 'N');
  c.rect(6, 11, 20, 16, 'W');
  c.rect(6, 11, 20, 4, 'R');
  c.rect(15, 11, 2, 16, 'm');
  c.rect(4, 27, 24, 3, 'M');
  return c;
}

/** Cloison de bois fine, raccordée à ses voisines (masque N=1 E=2 S=4 O=8). */
function partition(mask: number, seed: number): Canvas {
  const c = floor(seed);
  const a = 11;
  const b = 21;
  const v = (y0: number, y1: number) => {
    c.rect(a, y0, b - a, y1 - y0, 'm');
    c.rect(a, y0, 1, y1 - y0, 'M');
    c.rect(b - 1, y0, 1, y1 - y0, 'N');
    c.rect(b, y0, 2, y1 - y0, 'S');
  };
  const h = (x0: number, x1: number) => {
    c.rect(x0, a - 2, x1 - x0, 6, 'm');
    c.rect(x0, a - 2, x1 - x0, 1, 'M');
    c.rect(x0, a + 4, x1 - x0, 7, 'D');
    c.rect(x0, b - 1, x1 - x0, 1, 'N');
    c.rect(x0, b, x1 - x0, 2, 'S');
  };
  if (mask & 8) h(0, 16);
  if (mask & 2) h(16, T);
  if (mask & 1) v(0, 16);
  if (mask & 4) v(16, T);
  // poteau de jonction
  c.rect(a, a - 2, b - a, 8, 'm').rect(a, a - 2, b - a, 1, 'M');
  return c;
}

function voidTile(): Canvas {
  return new Canvas(T, T, 'o');
}

const blockA = wallBlock(true, 7);
const blockB = wallBlock(false, 8);
const door = backDoor();

const tiles: TilesetSource['tiles'] = {
  floor: floor(1).toGrid(),
  floor2: floor(2).toGrid(),
  floor3: floor(3).toGrid(),
  floor4: floor(4).toGrid(),
  'wall-top': wallTop().toGrid(),
  doorway: doorway().toGrid(),
  'window-south': southWindow().toGrid(),
  'face-up-0': cut(blockA, 0, 0).toGrid(),
  'face-up-1': cut(blockA, 32, 0).toGrid(),
  'face-up-2': cut(blockB, 0, 0).toGrid(),
  'face-up-3': cut(blockB, 32, 0).toGrid(),
  'face-low-0': cut(blockA, 0, 32).toGrid(),
  'face-low-1': cut(blockA, 32, 32).toGrid(),
  'face-low-2': cut(blockB, 0, 32).toGrid(),
  'face-low-3': cut(blockB, 32, 32).toGrid(),
  'door-up': cut(door, 0, 0).toGrid(),
  'door-low': cut(door, 0, 32).toGrid(),
  'window-up': backWindow().toGrid(),
  void: voidTile().toGrid(),
};
for (let m = 0; m < 16; m++) tiles[`partition-${m}`] = partition(m, 10 + m).toGrid();

export const interiorTiles: TilesetSource = { kind: 'tileset', name: 'interior', tileSize: T, palette, tiles };

// ---------- Détails au sol (posés au hasard, ils cassent la répétition) ----------

function straw(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  for (let i = 0; i < 6; i++) {
    const x = 6 + Math.floor(r() * 18);
    const y = 8 + Math.floor(r() * 16);
    const dx = r() < 0.5 ? 3 : -3;
    c.line(x, y, x + dx, y + (r() < 0.5 ? 0 : 1), r() < 0.5 ? 't' : 'Y');
  }
  return c;
}

function stain(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T);
  // poussière plus claire, tramée
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const dx = (x - 16) / 12;
    const dy = (y - 16) / 6;
    const d = dx * dx + dy * dy;
    if (d < 1 && r() < 0.35 * (1 - d)) c.set(x, y, 'A');
  }
  return c;
}

function crack(): Canvas {
  return new Canvas(T, T).line(6, 14, 12, 16, 'S').line(12, 16, 18, 15, 'S').line(18, 15, 25, 19, 'S').line(12, 16, 14, 21, 'S');
}

/** Rai de lumière posé au sol sous une fenêtre du mur sud. */
function sunpatch(): Canvas {
  const c = new Canvas(40, 30);
  c.polygon([[10, 0], [30, 0], [38, 30], [2, 30]], 'J');
  c.polygon([[13, 0], [27, 0], [32, 22], [8, 22]], 'I');
  // bords et bas tramés : la lumière s'éteint en douceur
  for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) {
    if (c.get(x, y) === 'J' && (x + y) % 2 === 0) c.set(x, y, '.');
    if (c.get(x, y) === 'I' && y > 14 && (x + y) % 2 === 0) c.set(x, y, 'J');
  }
  return c;
}

// rai de lumière : couleurs ajoutées à l'image (mode additif), donc sombres ici
const decalPalette = { ...palette, J: '#241a0c', I: '#3a2a14' };
const decal = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: decalPalette, grid: c.toGrid() });

export const interiorDecals = [
  decal('decal-straw', straw(1)),
  decal('decal-straw2', straw(2)),
  decal('decal-stain', stain(3)),
  decal('decal-crack', crack()),
  decal('sunpatch', sunpatch()),
];

// ---------- Mobilier ----------

/** Flammes d'un feu, variante par image d'animation. */
function flames(c: Canvas, cx: number, base: number, width: number, frame: number) {
  const r = rng(100 + frame * 7);
  for (let i = 0; i < width; i++) {
    const x = cx - width / 2 + i;
    const hgt = Math.round((Math.sin((i / width) * Math.PI) * 0.8 + 0.2) * (width * 0.9) * (0.75 + r() * 0.4));
    c.line(x, base, x, base - hgt, 'i');
    if (hgt > 2) c.line(x, base, x, base - Math.round(hgt * 0.65), 'h');
    if (hgt > 4) c.line(x, base, x, base - Math.round(hgt * 0.3), 'H');
  }
}

/** Cheminée de la cuisine, adossée au mur du fond : toute la hauteur du mur, âtre au sol. 64x96. */
function fireplace(frame: number): Canvas {
  const c = new Canvas(64, 96);
  // massif de pierre, du plafond jusqu'au sol
  c.rect(2, 0, 60, 86, 'r');
  const r = rng(5);
  for (let y = 0; y < 86; y += 6) {
    let x = 2 + ((y / 6) % 2) * 5;
    while (x < 62) {
      const w = 8 + Math.floor(r() * 6);
      c.rect(x, y, 1, 6, 'Z').rect(x + 1, y, Math.min(w - 1, 62 - x - 1), 1, 'R');
      x += w;
    }
    c.rect(2, y + 5, 60, 1, 'z');
  }
  // manteau de bois
  c.rect(0, 40, 64, 7, 'm').rect(0, 40, 64, 1, 'M').rect(0, 46, 64, 1, 'N');
  // foyer
  c.rect(10, 48, 44, 38, 'o');
  c.rect(12, 50, 40, 36, 'K');
  c.ellipse(32, 82, 17, 5, 'N');
  // bûches
  c.rect(20, 81, 24, 3, 'm').rect(22, 79, 20, 2, 'N');
  flames(c, 32, 80, 20, frame);
  // crémaillère et chaudron
  c.line(32, 50, 32, 60, 'Z');
  c.ellipse(32, 66, 9, 6.5, 'o');
  c.ellipse(32, 65.5, 8, 5.5, 'Z');
  c.rect(24, 60, 17, 2, 'z');
  // dalle de l'âtre
  c.rect(3, 86, 58, 9, 'r').rect(3, 86, 58, 1, 'R').rect(3, 94, 58, 1, 'Z');
  c.outline('o');
  return c;
}

/**
 * Petit poêle paysan maçonné, bloc d'argile sur un socle de pierre, entre l'atelier et le lit de la mère (80 × 70 × 200 cm, conduit compris).
 * Gabarit : 16 × (40 + 7) = 16 × 47 px. Corps carré de 110 cm (socle compris), dessus plat (70 cm × ½), conduit de 20 cm
 * qui monte de l'arrière du dessus jusqu'à 2 m. Bouche voûtée au sud, le feu dedans. Image 18 × 49.
 */
function stove(frame: number): Canvas {
  const c = new Canvas(18, 49);
  // corps maçonné : bloc d'argile à angles presque droits, face sud rangées 25 à 40, éclairé à gauche
  c.rect(1, 18, 14, 23, 'n');
  c.rect(1, 25, 2, 16, 'u').rect(13, 25, 2, 16, 'e');
  // dessus plat (70 cm × ½ = 7 rangées), clair, coins à peine abattus, bord droit dans l'ombre
  c.rect(1, 18, 14, 7, 'U').rect(12, 18, 3, 7, 'u');
  c.set(1, 18, '.').set(14, 18, '.');
  c.rect(1, 24, 14, 1, 'u').rect(1, 25, 14, 1, 'e'); // chant du dessus et son ombre sur la face
  // quelques pierres prises dans l'argile de la face
  c.rect(3, 27, 3, 1, 'e').rect(10, 27, 3, 1, 'e');
  // conduit d'argile : part de l'arrière du dessus, deux bagues
  c.rect(6, 1, 4, 20, 'n').rect(6, 1, 1, 20, 'u').rect(9, 1, 1, 20, 'e');
  c.rect(5, 1, 6, 2, 'n').rect(5, 1, 6, 1, 'u').rect(10, 1, 1, 2, 'e');
  c.rect(6, 10, 4, 1, 'e');
  c.rect(5, 20, 6, 1, 'u').rect(10, 20, 1, 1, 'e'); // collet au pied du conduit, posé sur le dessus
  // bouche voûtée au sud, foyer sombre, feu
  roundRect(c, 4, 29, 8, 11, 3, 'e');
  roundRect(c, 5, 30, 6, 10, 2, 'K');
  flames(c, 8, 39, 5, frame);
  // socle de pierre, un rang plus large que rien : il porte le corps
  c.rect(1, 41, 14, 5, 'r').rect(1, 41, 14, 1, 'R').rect(1, 45, 14, 1, 'z').rect(12, 42, 3, 3, 'z');
  c.rect(5, 42, 1, 3, 'Z').rect(10, 43, 1, 2, 'Z');
  litOutline(c, 'e');
  groundShadow(c, 3, 47, 15, 2);
  return c;
}

/** Planche de cuisine posée sur deux tréteaux, couteau et oignons. 64x32. */
function worktable(): Canvas {
  const c = new Canvas(64, 32);
  c.rect(6, 18, 3, 12, 'N').rect(55, 18, 3, 12, 'N');
  c.rect(2, 10, 60, 8, 'M').rect(2, 10, 60, 1, 'Y').rect(2, 16, 60, 2, 'm');
  c.rect(10, 11, 14, 4, 'm').rect(10, 11, 14, 1, 'M');
  c.line(28, 12, 36, 12, 'R').rect(37, 11, 4, 2, 'N');
  c.ellipse(48, 11, 3, 2.5, 'a').ellipse(54, 12, 3, 2.5, 'D');
  c.outline('o');
  return c;
}

/**
 * Établi de la mère : grosse planche sur quatre pieds, gouge, maillet, une figurine commencée, copeaux
 * (320 × 70 × 85 cm). Gabarit : 64 × (17 + 7) = 64 × 24 px. Dessus de 7 rangées (70 cm × ½), chant de la planche,
 * pieds de 15 cm et traverse ; au sol, sous la planche, son ombre et des copeaux. Image 66 × 26.
 */
function workbench(): Canvas {
  const c = new Canvas(66, 26);
  // pieds (avant ; ceux de l'arrière sont cachés derrière) et traverse
  c.rect(2, 9, 3, 14, 'm').rect(2, 9, 1, 14, 'M').rect(4, 9, 1, 14, 'N');
  c.rect(59, 9, 3, 14, 'm').rect(59, 9, 1, 14, 'M').rect(61, 9, 1, 14, 'N');
  c.rect(5, 16, 54, 2, 'm').rect(5, 17, 54, 1, 'N');
  // dessus de la planche : bois clair, un joint, éclairé au nord
  c.rect(1, 1, 62, 6, 'M').rect(1, 1, 62, 1, 'Y').rect(1, 4, 62, 1, 'm');
  // chant de la planche, face sud
  c.rect(1, 7, 62, 1, 'm').rect(1, 8, 62, 1, 'N');
  // gouge : fer et manche
  c.rect(7, 3, 4, 1, 'R').rect(11, 2, 5, 2, 'N').rect(11, 2, 5, 1, 'm');
  // maillet couché : tête et manche
  c.rect(21, 2, 3, 3, 'm').rect(21, 2, 3, 1, 'M').rect(23, 3, 1, 2, 'N').rect(24, 3, 5, 1, 'N');
  // copeaux sur la planche
  c.rect(36, 2, 3, 1, 'Y').rect(37, 3, 3, 1, 't').rect(41, 5, 3, 1, 'Y');
  // figurine commencée, debout (20 cm) : tête, corps, ombre à droite
  c.rect(49, 1, 2, 2, 'Y').rect(48, 3, 3, 3, 'Y').rect(50, 3, 1, 3, 't').rect(51, 4, 1, 2, 'P');
  litOutline(c, 'K');
  // copeaux tombés au sol, sous la planche
  for (const [x, y] of [[10, 21], [27, 22], [43, 20], [52, 22]]) c.set(x, y, 'Y').set(x + 1, y, 't').set(x + 2, y, 'Y');
  // ombre de la planche au sol (sous elle, jusqu'à son bord sud) et ombre portée
  c.within('.', (k) => k.rect(5, 15, 54, 8, 'x'));
  groundShadow(c, 3, 24, 63, 1);
  return c;
}

/**
 * Contour d'un pixel selon le guide : `OUTLINE` en bas et à droite, `dark` (teinte la plus sombre
 * de la matière) en haut et à gauche, côté lumière.
 */
function litOutline(c: Canvas, dark: string): Canvas {
  const before = c.toGrid();
  const was = (i: number, j: number) => i >= 0 && j >= 0 && i < c.w && j < c.h && before[j][i] !== '.';
  c.outline('o');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (was(x, y) || c.get(x, y) !== 'o') continue;
    const top = !was(x, y - 1) && was(x, y + 1);
    const left = !was(x - 1, y) && was(x + 1, y) && was(x + 1, y + 1);
    if (top || left) c.set(x, y, dark);
  }
  return c;
}

/** Ombre portée translucide sous la base, décalée vers la droite, sans recouvrir l'objet. */
function groundShadow(c: Canvas, x: number, y: number, w: number, h: number): Canvas {
  return c.within('.', (c) => c.rect(x, y, w, h, 'x'));
}

/**
 * Lit de la mère, en bois, vu de trois quarts (150 × 200 × 80 cm, tête de lit comprise).
 * Gabarit : 30 × (16 + 20) = 30 × 36 px. Dessus de 20 rangées (200 cm × ½) : longs pans du cadre, oreiller au nord,
 * couverture de laine rouge ; tête de lit à montants au nord, qui dépasse le matelas de 30 cm ; face sud : traverse
 * du pied de lit sous la couverture qui retombe, deux pieds, le sol dans l'ombre sous le lit. Image 32 × 38.
 */
function bed(): Canvas {
  const c = new Canvas(32, 38);
  // longs pans du cadre (10 cm), vus de dessus
  c.rect(1, 5, 2, 21, 'M').rect(2, 5, 1, 21, 'm');
  c.rect(27, 5, 2, 21, 'm').rect(28, 5, 1, 21, 'N');
  // matelas : drap de lin, ombre à droite
  c.rect(3, 6, 24, 20, 'd').rect(25, 6, 2, 20, 'D');
  // oreiller au nord
  c.rect(5, 6, 19, 4, 'a').rect(5, 9, 19, 1, 'D').rect(21, 6, 3, 4, 'D').rect(5, 10, 19, 1, 'E');
  // couverture de laine : drap rabattu, corps rouge, ombre à droite, deux plis
  c.rect(3, 12, 24, 14, 'B');
  c.rect(3, 12, 24, 2, 'd').rect(24, 12, 3, 2, 'D').rect(3, 14, 24, 1, 'G');
  c.rect(23, 15, 4, 11, 'G');
  c.line(4, 18, 13, 20, 'G').line(5, 18, 13, 19, 'G');
  c.line(10, 23, 20, 21, 'G').line(11, 23, 20, 22, 'G');
  // tête de lit : deux montants et un panneau de planches, face sud
  c.rect(1, 1, 3, 6, 'm').rect(1, 1, 1, 6, 'M').rect(1, 1, 3, 1, 'M');
  c.rect(26, 1, 3, 6, 'm').rect(28, 1, 1, 6, 'N').rect(26, 1, 3, 1, 'M');
  c.rect(4, 2, 22, 4, 'm').rect(4, 2, 22, 1, 'M');
  for (const x of [9, 15, 20]) c.rect(x, 3, 1, 3, 'N');
  c.rect(4, 5, 22, 1, 'K');
  // face sud : traverse du pied de lit, couverture qui retombe dessus
  c.rect(4, 26, 22, 4, 'm').rect(4, 29, 22, 1, 'N');
  c.rect(3, 25, 24, 3, 'G').rect(3, 25, 20, 1, 'B');
  // pieds du lit (55 cm, ils dépassent un peu le cadre)
  c.rect(1, 24, 3, 11, 'm').rect(1, 24, 1, 11, 'M').rect(1, 24, 3, 1, 'M').rect(3, 25, 1, 10, 'N');
  c.rect(26, 24, 3, 11, 'm').rect(28, 24, 1, 11, 'N').rect(26, 24, 3, 1, 'M');
  litOutline(c, 'K');
  // le sol sous le lit, dans son ombre, et l'ombre portée
  c.within('.', (k) => k.rect(4, 30, 22, 5, 'x'));
  groundShadow(c, 2, 36, 30, 2);
  return c;
}

/** Arrondit un rectangle plein : retire les pixels de coin au-delà d'un rayon r. */
function roundRect(c: Canvas, x: number, y: number, w: number, h: number, r: number, col: string): Canvas {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = Math.max(0, r - i - 0.5, i + 0.5 - (w - r));
    const dy = Math.max(0, r - j - 0.5, j + 0.5 - (h - r));
    if (dx * dx + dy * dy <= r * r) c.set(x + i, y + j, col);
  }
  return c;
}

/**
 * Paillasse de Xéros : une couche de paille tassée sous une toile, à même le sol, sans cadre ni pieds, couchée
 * est-ouest (200 × 90 × 20 cm). Gabarit : 40 × (4 + 9) = 40 × 13 px : un dessus large et plat, une face sud de 20 cm.
 * Baluchon de lin à l'ouest (contre le mur), couverture brune rabattue sur la moitié est. Image 42 × 15.
 */
function pallet(): Canvas {
  const c = new Canvas(42, 15);
  const r = rng(21);
  // volume mou : coins arrondis, bord nord un peu creusé
  roundRect(c, 1, 1, 38, 11, 3, 'Y');
  for (let x = 14; x <= 18; x++) c.set(x, 1, '.');
  for (let x = 28; x <= 31; x++) c.set(x, 1, '.');
  // face sud (20 cm, 3 rangées) dans l'ombre, colonne par colonne sous le bord
  for (let x = 1; x <= 38; x++) {
    let y = 11;
    while (y > 0 && c.get(x, y) === '.') y--;
    c.set(x, y, 'P').set(x, y - 1, 'T').set(x, y - 2, 'T');
  }
  // bout est dans l'ombre
  c.within('Y', (k) => k.rect(37, 1, 2, 8, 't'));
  // texture de paille : brins de trois pixels sur la paille nue du dessus
  for (let i = 0; i < 30; i++) {
    const x = 2 + Math.floor(r() * 34);
    const y = 2 + Math.floor(r() * 6);
    const pts: [number, number][] = [[x, y], [x + 1, y], [x + 2, y + (r() < 0.5 ? 0 : 1)]];
    if (pts.every(([px, py]) => c.get(px, py) === 'Y' && c.get(px, py - 1) !== 't' && c.get(px, py + 1) !== 't')) {
      for (const [px, py] of pts) c.set(px, py, 't');
    }
  }
  // baluchon de lin à l'ouest
  roundRect(c, 3, 2, 7, 6, 2, 'd');
  c.rect(8, 3, 2, 4, 'D').rect(4, 7, 5, 1, 'D');
  c.within('Yt', (k) => k.rect(4, 8, 6, 1, 'T')); // son ombre sur la paille
  // couverture brune rabattue sur la moitié est, qui retombe sur la face sud
  c.within('YtT', (k) => k.polygon([[22, 1.5], [36, 1], [38, 3], [38, 11], [21, 11]], 'n'));
  c.within('n', (k) => {
    k.line(22, 2, 21, 10, 'u').line(23, 2, 22, 10, 'u'); // revers rabattu, côté lumière
    k.line(24, 2, 23, 10, 'e'); // ombre sous le revers
    k.line(28, 4, 34, 6, 'e');
    k.rect(21, 9, 18, 3, 'e'); // la part qui retombe sur la face sud, dans l'ombre
    k.rect(36, 1, 3, 8, 'e');
  });
  litOutline(c, 'P');
  groundShadow(c, 3, 13, 38, 1);
  return c;
}

/**
 * Sac de grain en toile de lin, lié au col, posé debout (50 × 40 × 70 cm). Gabarit : 10 × (14 + 4) = 10 × 18 px.
 * Tassé : épaules larges et affaissées, ventre large au pied, col court noué d'une cordelette de chanvre, toupet de toile. Image 12 × 20.
 */
function sack(): Canvas {
  const c = Canvas.from([
    '............',
    '..dD.DE.....',
    '..dDDDE.....',
    '...XCC......',
    '.ddddDDE....',
    '.daadDDDE...',
    '.daddDDDE...',
    '.ddddDDDE...',
    '.dDDDdDEE...',
    '.ddddDDEE...',
    '.dddDDDEE...',
    '.dDDDdDEE...',
    '.ddDDDEEE...',
    '.dDDDDEEE...',
    '.DDDDEEEE...',
    '.DDDEEEEE...',
    '..EEEEEE....',
    '............',
    '............',
    '............',
  ]);
  litOutline(c, 'E');
  groundShadow(c, 3, 18, 8, 1);
  return c;
}

/**
 * Jarre de terre cuite (Ø 45 cm, 60 cm de haut, cylindre debout). Gabarit : 9 × (12 + 4,5) = 9 × 16,5 px.
 * Lèvre et goulot sombre vus d'en haut, épaule, ventre éclairé à gauche, pied resserré. Image 11 × 19.
 */
function jar(): Canvas {
  const c = Canvas.from([
    '...........',
    '..uuUue....',
    '..uKKKe....',
    '...unn.....',
    '..uunne....',
    '.uUunnee...',
    '.uUunnee...',
    '.uunnnee...',
    '.uunnnee...',
    '.uunnnee...',
    '.unnnnee...',
    '.unnneee...',
    '..nneee....',
    '..nneee....',
    '...eee.....',
    '...........',
    '...........',
    '...........',
    '...........',
  ]);
  litOutline(c, 'e');
  groundShadow(c, 3, 16, 7, 1);
  return c;
}

const anim = (name: string, w: number, h: number, draw: (f: number) => Canvas): SpriteSheetSource => ({
  kind: 'spritesheet',
  name,
  frameW: w,
  frameH: h,
  palette,
  animations: { burn: { frames: [0, 1, 2].map((f) => draw(f).toGrid()), frameRate: 7, repeat: -1 } },
});

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export const furniture = [
  anim('fireplace', 64, 96, fireplace),
  anim('stove', 18, 49, stove),
  img('worktable', worktable()),
  img('workbench', workbench()),
  img('bed', bed()),
  img('pallet', pallet()),
  img('sack', sack()),
  img('jar', jar()),
];
