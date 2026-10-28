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
};

// ---------- Tuiles ----------

function floor(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 's');
  for (let i = 0; i < 40; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'S' : 'A');
  // brins de paille éparpillés
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * (T - 3));
    const y = Math.floor(r() * T);
    if (r() < 0.5) c.line(x, y, x + 2, y + (r() < 0.5 ? 0 : 1), 't');
    else c.set(x, y, 'Y');
  }
  return c;
}

/** Bord du mur nord vu de dessus (haut de la cloison, sous le toit). */
function wallTop(): Canvas {
  const c = new Canvas(T, T, 'K');
  for (let y = 4; y < T; y += 7) c.rect(0, y, T, 1, 'o');
  c.rect(0, T - 3, T, 3, 'N');
  return c;
}

/** Face du mur nord : torchis, un poteau, plinthe. variant : 'plain' | 'door' | 'window'. */
function wallFace(variant: 'plain' | 'door' | 'window'): Canvas {
  const c = new Canvas(T, T, 'd');
  const r = rng(variant.length * 17);
  for (let i = 0; i < 25; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), 'D');
  c.rect(0, 0, T, 4, 'N').rect(0, 3, T, 1, 'K');
  c.rect(0, T - 4, T, 4, 'm').rect(0, T - 4, T, 1, 'M').rect(0, T - 1, T, 1, 'N');
  c.rect(0, 0, 4, T - 4, 'm').rect(3, 0, 1, T - 4, 'N').rect(0, 0, 1, T - 4, 'M');
  if (variant === 'door') {
    c.rect(7, 5, 20, 27, 'K');
    c.rect(9, 7, 16, 25, 'm');
    for (let x = 12; x < 25; x += 4) c.rect(x, 7, 1, 25, 'N');
    c.rect(9, 11, 16, 2, 'Z').rect(9, 25, 16, 2, 'Z');
    c.set(22, 19, 'R');
  }
  if (variant === 'window') {
    c.rect(8, 7, 18, 14, 'N');
    c.rect(9, 8, 16, 12, 'W');
    c.rect(9, 8, 16, 3, 'R');
    c.rect(16, 8, 2, 12, 'm');
    c.rect(7, 21, 20, 2, 'M');
  }
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

const tiles: TilesetSource['tiles'] = {
  floor: floor(1).toGrid(),
  floor2: floor(2).toGrid(),
  floor3: floor(3).toGrid(),
  'wall-top': wallTop().toGrid(),
  'wall-face': wallFace('plain').toGrid(),
  'wall-door': wallFace('door').toGrid(),
  'wall-window': wallFace('window').toGrid(),
  void: voidTile().toGrid(),
};
for (let m = 0; m < 16; m++) tiles[`partition-${m}`] = partition(m, 10 + m).toGrid();

export const interiorTiles: TilesetSource = { kind: 'tileset', name: 'interior', tileSize: T, palette, tiles };

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

/** Cheminée de la cuisine, encastrée dans le mur nord : manteau, âtre, chaudron, feu animé. 64x64. */
function fireplace(frame: number): Canvas {
  const c = new Canvas(64, 64);
  // massif de pierre
  c.rect(2, 4, 60, 50, 'r');
  const r = rng(5);
  for (let y = 4; y < 54; y += 5) {
    let x = 2 + ((y / 5) % 2) * 4;
    while (x < 62) {
      const w = 7 + Math.floor(r() * 5);
      c.rect(x, y, 1, 5, 'Z').rect(x + 1, y, Math.min(w - 1, 62 - x - 1), 1, 'R');
      x += w;
    }
    c.rect(2, y + 4, 60, 1, 'z');
  }
  // manteau de bois
  c.rect(0, 14, 64, 6, 'm').rect(0, 14, 64, 1, 'M').rect(0, 19, 64, 1, 'N');
  // foyer
  c.rect(12, 21, 40, 33, 'o');
  c.rect(14, 23, 36, 31, 'K');
  c.ellipse(32, 50, 16, 5, 'N');
  // bûches
  c.rect(20, 49, 24, 3, 'm').rect(22, 47, 20, 2, 'N');
  flames(c, 32, 48, 18, frame);
  // chaudron suspendu
  c.line(32, 23, 32, 31, 'Z');
  c.ellipse(32, 37, 8, 6, 'o');
  c.ellipse(32, 36.5, 7, 5, 'Z');
  c.rect(25, 31, 15, 2, 'z');
  // dalle de l'âtre
  c.rect(4, 54, 56, 9, 'r').rect(4, 54, 56, 1, 'R').rect(4, 62, 56, 1, 'Z');
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
  anim('fireplace', 64, 64, fireplace),
  anim('stove', 32, 48, stove),
  img('worktable', worktable()),
  img('workbench', workbench()),
  img('bed', bed()),
  img('pallet', pallet()),
  img('sack', sack()),
  img('jar', jar()),
  img('log', log()),
];
