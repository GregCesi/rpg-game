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

/** Petit poêle de pierre et d'argile entre l'atelier et le lit de la mère. 32x48. */
function stove(frame: number): Canvas {
  const c = new Canvas(32, 48);
  c.rect(14, 0, 5, 16, 'N').rect(14, 0, 1, 16, 'm');
  c.ellipse(16, 30, 11, 14, 'e');
  c.ellipse(15, 28, 9, 12, 'n');
  c.ellipse(13, 24, 4, 5, 'u');
  c.rect(11, 30, 10, 9, 'o');
  c.rect(12, 31, 8, 8, 'K');
  flames(c, 16, 38, 7, frame);
  c.rect(5, 42, 22, 4, 'Z').rect(5, 42, 22, 1, 'z');
  c.outline('o');
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

/** Établi de la mère : grosse planche, gouge, maillet, une figurine commencée, copeaux. 64x32. */
function workbench(): Canvas {
  const c = new Canvas(64, 32);
  c.rect(4, 18, 4, 12, 'N').rect(56, 18, 4, 12, 'N').rect(4, 24, 56, 2, 'N');
  c.rect(1, 8, 62, 10, 'm').rect(1, 8, 62, 2, 'M').rect(1, 16, 62, 2, 'N');
  c.line(10, 11, 20, 11, 'R').rect(21, 10, 5, 3, 'N');
  c.rect(30, 10, 8, 4, 'M').rect(33, 13, 2, 4, 'N');
  c.ellipse(50, 9, 3, 5, 'Y').ellipse(50, 5, 2, 2, 'Y');
  c.outline('o');
  for (const [x, y] of [[12, 29], [20, 30], [40, 28], [47, 30], [52, 29]]) c.set(x, y, 'Y').set(x + 1, y, 't');
  return c;
}

/** Lit de la mère : cadre de bois, paillasse, couverture de laine. 32x56. */
function bed(): Canvas {
  const c = new Canvas(32, 56);
  c.rect(2, 2, 28, 50, 'm').rect(2, 2, 28, 2, 'M');
  c.rect(5, 6, 22, 42, 't');
  c.rect(7, 8, 18, 8, 'a').rect(7, 15, 18, 1, 'D');
  c.rect(4, 20, 24, 28, 'g').rect(4, 20, 24, 2, 'B');
  for (let y = 24; y < 48; y += 4) c.rect(4, y, 24, 1, 'G');
  c.rect(2, 48, 28, 4, 'N');
  c.outline('o');
  return c;
}

/** Paillasse de Xéros, posée au sol, une couverture rêche. 32x48. */
function pallet(): Canvas {
  const c = new Canvas(32, 48);
  c.rect(3, 6, 26, 38, 't');
  for (let i = 0; i < 40; i++) c.set(3 + ((i * 7) % 26), 6 + ((i * 11) % 38), i % 2 ? 'Y' : 'T');
  c.rect(5, 8, 14, 7, 'D').rect(5, 14, 14, 1, 'E');
  c.rect(4, 20, 24, 22, 'D').rect(4, 20, 24, 1, 'd');
  for (let y = 24; y < 42; y += 5) c.rect(4, y, 24, 1, 'E');
  c.outline('o');
  return c;
}

function sack(): Canvas {
  const c = new Canvas(32, 32);
  c.ellipse(16, 21, 10, 9, 'D');
  c.ellipse(14, 19, 6, 6, 'd');
  c.rect(13, 8, 6, 6, 'D').rect(12, 12, 8, 2, 'N');
  c.outline('o');
  return c;
}

function jar(): Canvas {
  const c = new Canvas(32, 32);
  c.ellipse(16, 20, 8, 9, 'n');
  c.ellipse(14, 18, 4, 5, 'u');
  c.rect(12, 7, 8, 5, 'n').rect(11, 6, 10, 2, 'u');
  c.outline('o');
  return c;
}

/** Bille de bois qui attend d'être sculptée. 32x32. */
function log(): Canvas {
  const c = new Canvas(32, 32);
  c.rect(8, 10, 16, 16, 'm').rect(8, 10, 3, 16, 'M').rect(21, 10, 3, 16, 'N');
  c.ellipse(16, 10, 8, 3, 'Y');
  c.ellipse(16, 10, 4, 1.5, 'M');
  c.outline('o');
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
  anim('stove', 32, 48, stove),
  img('worktable', worktable()),
  img('workbench', workbench()),
  img('bed', bed()),
  img('pallet', pallet()),
  img('sack', sack()),
  img('jar', jar()),
  img('log', log()),
];
