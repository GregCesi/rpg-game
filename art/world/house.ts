// La chaumière de Xéros et de sa mère, vue de l'extérieur.
// Colombages et torchis sur un soubassement de pierre, toit de chaume épais et arrondi.
// À gauche, un petit porche avec la porte d'entrée (il mène au couloir).
// Derrière le faîte, la cheminée de pierre de la cuisine ; sur le pan droit, le conduit du poêle.
// L'image est ancrée en bas à gauche (voir props.json).

import { Canvas, EMPTY, rng } from '../lib/canvas';
import { orientedZones } from '../lib/held';
import { lightUp } from '../lib/light';
import { axeArt, toolPalette } from '../items/tools';
import { ROPE_COIL } from '../items/rope';
import { shadedOutline } from './trees';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

const COTTAGE = {
  w: 332,
  h: 204,
  /** Sommets des conduits, d'où sort la fumée (coordonnées dans l'image). */
  smoke: [
    [178, 2],
    [260, 72],
  ] as [number, number][],
};

/** Pierres irrégulières dans un rectangle. */
function stones(c: Canvas, x0: number, y0: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  c.rect(x0, y0, w, h, 'Z');
  let y = y0;
  let row = 0;
  while (y < y0 + h) {
    const sh = 4 + Math.floor(r() * 2);
    let x = x0 - (row % 2) * 4;
    while (x < x0 + w) {
      const sw = 6 + Math.floor(r() * 6);
      c.rect(Math.max(x, x0) + 1, y + 1, Math.min(sw - 1, x0 + w - Math.max(x, x0) - 1), sh - 1, r() < 0.3 ? 'z' : 'r');
      c.set(Math.max(x, x0) + 1, y + 1, 'R');
      x += sw;
    }
    y += sh;
    row++;
  }
}

/** Chaume : rangs de paille superposés aux pointes irrégulières, lumière à gauche, ombre en tramé à droite. Repris par la couverture de l'abri (building.ts). */
export function thatch(c: Canvas, x0: number, x1: number, y0: number, y1: number, seed: number) {
  const r = rng(seed);
  const span = x1 - x0;
  c.within('t', (c) => {
    // ombre douce vers la droite (tramé), avant la texture
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = (x - x0) / span;
      if (k > 0.62 && r() < (k - 0.62) * 2.2) c.set(x, y, 'T');
    }
  });
  c.within('tT', (c) => {
    // bas de chaque rang : pointes de paille de longueur variable
    for (let x = x0; x <= x1; x++) {
      const tip = (x * 7 + seed) % 5 === 0 ? 2 : (x * 3 + seed) % 4 === 0 ? 1 : 0;
      for (let y = y0 + 8; y <= y1; y += 9) {
        c.set(x, y + tip, 'P');
        if (tip) c.set(x, y + tip - 1, 'T');
      }
    }
    // brins clairs, plus nombreux à gauche (lumière)
    for (let i = 0; i < span * (y1 - y0) * 0.05; i++) {
      const x = x0 + Math.floor(r() * span);
      const y = y0 + Math.floor(r() * (y1 - y0));
      const leftness = 1 - (x - x0) / span;
      if (r() < 0.2 + leftness * 0.6) c.line(x, y, x, y + 2, 'Y');
    }
  });
}

/** Mur à colombages : torchis clair entre des poutres sombres. */
function timberWall(c: Canvas, x0: number, x1: number, y0: number, y1: number, posts: number[], braces: [number, number, number][]) {
  c.rect(x0, y0, x1 - x0, y1 - y0, 'd');
  c.within('d', (c) => {
    // torchis un peu taché, plus sombre en bas
    const r = rng(x0 * 31 + y0);
    for (let i = 0; i < (x1 - x0) * (y1 - y0) * 0.03; i++) c.set(x0 + Math.floor(r() * (x1 - x0)), y0 + Math.floor(r() * (y1 - y0)), 'D');
    c.rect(x0, y1 - 4, x1 - x0, 4, 'D');
  });
  // sablière basse et lisse intermédiaire
  c.rect(x0, y1 - 4, x1 - x0, 3, 'm').rect(x0, y1 - 2, x1 - x0, 1, 'N');
  const mid = Math.round((y0 + y1) / 2);
  c.rect(x0, mid, x1 - x0, 3, 'm').rect(x0, mid + 2, x1 - x0, 1, 'N');
  for (const [px0, px1, dir] of braces) {
    const top = dir > 0 ? [px0, y0 + 2] : [px1, y0 + 2];
    const bot = dir > 0 ? [px1, mid] : [px0, mid];
    c.line(top[0], top[1], bot[0], bot[1], 'm');
    c.line(top[0] + 1, top[1], bot[0] + 1, bot[1], 'N');
  }
  for (const x of posts) c.rect(x, y0, 4, y1 - y0, 'm').rect(x + 3, y0, 1, y1 - y0, 'N').rect(x, y0, 1, y1 - y0, 'M');
  // ombre portée de l'avant-toit
  c.within('dDmMN', (c) => c.rect(x0, y0, x1 - x0, 7, 'E'));
}

/** Fenêtre sans vitre, volets de bois ouverts. */
function window(c: Canvas, x: number, y: number) {
  c.rect(x - 7, y - 1, 6, 16, 'm').rect(x - 7, y - 1, 1, 16, 'M').rect(x - 2, y - 1, 1, 16, 'N');
  c.rect(x + 19, y - 1, 6, 16, 'm').rect(x + 19, y - 1, 1, 16, 'M').rect(x + 24, y - 1, 1, 16, 'N');
  c.rect(x - 1, y - 1, 20, 16, 'N');
  c.rect(x, y, 18, 14, 'K');
  c.rect(x, y, 18, 3, 'Z');
  c.rect(x - 2, y + 15, 22, 2, 'M');
}

/** Porte en planches avec pentures de fer. */
function door(c: Canvas, x: number, y: number, w: number, h: number) {
  c.rect(x - 2, y - 2, w + 4, h + 2, 'K');
  c.rect(x, y, w, h, 'm');
  for (let i = 4; i < w; i += 5) c.rect(x + i, y, 1, h, 'N');
  c.rect(x, y, 1, h, 'M');
  c.rect(x, y + 6, w, 2, 'Z').rect(x, y + h - 9, w, 2, 'Z');
  c.set(x + w - 4, y + Math.round(h / 2), 'R').set(x + w - 4, y + Math.round(h / 2) + 1, 'z');
}

function cottage(): Canvas {
  const { w, h } = COTTAGE;
  const c = new Canvas(w, h);

  // --- cheminée de la cuisine : adossée au mur du fond, elle dépasse du faîte ---
  // (au-dessus de la cheminée intérieure : même position relative dans la maison)
  c.rect(163, 6, 30, 56, 'r');
  stones(c, 163, 6, 30, 56, 3);
  c.rect(163, 6, 4, 56, 'R').rect(189, 6, 4, 56, 'Z');
  c.rect(159, 2, 38, 6, 'z').rect(159, 2, 38, 1, 'R').rect(159, 7, 38, 1, 'Z').rect(169, 2, 18, 2, 'K');

  // --- corps principal ---
  stones(c, 66, 186, 250, 10, 1);
  timberWall(c, 66, 316, 146, 187, [66, 97, 128, 159, 190, 221, 252, 283, 312], [[159, 190, 1], [221, 252, -1]]);
  window(c, 104, 156);
  window(c, 259, 156);

  // --- toit principal ---
  const roof: [number, number][] = [
    [54, 152], [56, 96], [62, 64], [76, 46], [96, 38], [292, 38], [312, 46], [324, 64], [330, 96], [331, 152],
  ];
  c.polygon(roof, 't');
  thatch(c, 54, 331, 47, 152, 7);
  // faîtage : pan nord sombre et bourrelet festonné
  c.within('tTYP', (c) => c.rect(0, 36, w, 10, 'T'));
  for (let x = 60; x <= 326; x++) {
    const scallop = Math.round(Math.abs(Math.sin((x / 11) * Math.PI)) * 3);
    c.within('tTYP', (c) => {
      c.set(x, 44 + scallop, 'P');
      for (let y = 44; y < 44 + scallop; y++) c.set(x, y, 'T');
    });
  }
  // avant-toit épais qui retombe en mèches
  c.within('tTYP', (c) => c.rect(0, 146, w, 6, 'T'));
  for (let x = 54; x <= 331; x++) {
    const drop = (x * 5) % 7 < 3 ? 2 : 1;
    for (let d = 0; d < drop; d++) c.set(x, 152 + d, x % 2 ? 'P' : 'T');
  }

  // ombre portée de la cheminée sur le faîte (lumière venant de la gauche)
  c.within('tTYP', (c) => c.polygon([[193, 36], [206, 36], [214, 52], [193, 52]], 'P'));

  // --- conduit du poêle sur le pan droit (au-dessus du poêle intérieur) ---
  c.rect(255, 74, 10, 18, 'z').rect(255, 74, 2, 18, 'R').rect(263, 74, 2, 18, 'Z');
  c.rect(254, 72, 12, 3, 'r').rect(257, 72, 6, 1, 'K');
  c.within('tTYP', (c) => c.polygon([[265, 80], [270, 80], [274, 92], [265, 92]], 'P'));

  // --- porche d'entrée à gauche ---
  stones(c, 4, 188, 58, 8, 2);
  timberWall(c, 4, 62, 152, 189, [4, 58], []);
  door(c, 8, 158, 22, 31);
  const porch: [number, number][] = [[0, 156], [2, 128], [10, 112], [64, 102], [70, 106], [72, 156]];
  c.polygon(porch, 't');
  thatch(c, 0, 72, 104, 156, 11);
  c.within('tTYP', (c) => c.rect(0, 151, 73, 5, 'T'));
  for (let x = 0; x <= 72; x++) c.set(x, 156, x % 2 ? 'P' : 'T');
  // marche de pierre devant la porte
  c.rect(5, 196, 28, 4, 'r').rect(5, 196, 28, 1, 'R');

  c.outline('o');
  // ombre au sol
  const s = new Canvas(w, h).rect(2, 197, w - 6, 5, 'x');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (s.get(x, y) === 'x' && c.get(x, y) === '.') c.set(x, y, 'x');
  return c;
}

/** Tas de bûches fendues, à adosser contre la cheminée. */
function woodpile(): Canvas {
  const c = new Canvas(48, 32);
  const logs: [number, number][] = [[8, 24], [17, 24], [26, 24], [35, 24], [12, 17], [21, 17], [30, 17], [17, 10], [26, 10]];
  for (const [x, y] of logs) {
    c.ellipse(x, y, 5, 4.4, 'N');
    c.ellipse(x - 0.5, y - 0.3, 3.8, 3.3, 'M');
    c.ellipse(x - 0.5, y - 0.3, 1.6, 1.4, 'm');
  }
  c.outline('o');
  for (let x = 2; x < 44; x++) if (c.get(x, 30) === '.') c.set(x, 30, 'x');
  return c;
}

// ---------- Billot ----------
// Une bille de chêne debout, à côté du tas de bois : on y fend les bûches. 32x32, base en y=27.
// Environ 80 cm de large pour 45 de haut (16 px sur 9 de face sud), plus bas et plus large qu'une souche,
// sans racines, la coupe du dessus marquée par la hache. Trois images de même taille : vide, hache plantée, rouleau de corde posé.

/** Ombre portée : ne remplit que les pixels encore vides. */
function groundShadow(c: Canvas, cx: number, cy: number, rx: number, ry: number) {
  const s = new Canvas(c.w, c.h).ellipse(cx, cy, rx, ry, 'x');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (s.get(x, y) !== EMPTY && c.get(x, y) === EMPTY) c.set(x, y, 'x');
  }
}

/** Centre et rayons de la coupe du dessus, base de la face sud. */
const BLOCK = { cx: 16, top: 18, rx: 8, ry: 3.5, base: 27 };

function blockBody(): Canvas {
  const c = new Canvas(32, 32);
  const { cx, top, rx, ry, base } = BLOCK;
  // face sud : écorce, claire à gauche, sombre à droite, ventre un peu bombé
  c.rect(cx - rx, top, rx * 2, base - top, 'm');
  c.ellipse(cx, base - 0.5, rx, 2, 'm');
  c.within('m', (c) => {
    c.rect(cx - rx, top, 3, base - top + 2, 'M');
    c.rect(cx + rx - 4, top, 4, base - top + 2, 'N');
    // fentes d'écorce
    c.line(cx - 2, top + 3, cx - 2, top + 6, 'N').line(cx + 2, top + 5, cx + 2, top + 8, 'N');
  });
  c.within('N', (c) => c.line(cx + rx - 2, top + 3, cx + rx - 2, top + 7, 'K'));
  // coupe du dessus : bois clair, cernes, entailles de la hache
  c.ellipse(cx, top, rx, ry, 'Y');
  c.within('Y', (c) => {
    c.ellipse(cx + 0.5, top + 0.3, rx - 2.2, ry - 1.2, 't');
    c.ellipse(cx + 0.5, top + 0.3, rx - 4.5, ry - 2.3, 'Y');
    c.line(cx - 5, top - 1, cx - 2, top + 1, 'T'); // entaille
    c.line(cx + 3, top + 2, cx + 6, top, 'T');
  });
  return c;
}

/** Billot vide. */
function choppingBlock(): Canvas {
  const c = shadedOutline(blockBody());
  groundShadow(c, 17.5, 28, 10, 2.4);
  return c;
}

/**
 * Billot, le rouleau de corde (art/items/rope.ts) posé à plat sur la coupe, au milieu : le billot nu tel quel, même
 * image (32×32), même base, même largeur, si bien que rien ne saute quand le rouleau arrive ou s'en va. Le rouleau
 * fait 6 px (30 cm) sur un billot de 18 : on voit la coupe tout autour. Son ombre de contact assombrit le bois (T)
 * à sa droite et sous lui.
 */
function choppingBlockRope(): Canvas {
  const c = choppingBlock();
  const ox = BLOCK.cx - 3, oy = BLOCK.top - 2;
  for (const [dx, dy] of [[5, 4], [6, 3], [6, 2], [2, 5], [3, 5], [4, 5], [5, 5]]) {
    if ('Yt'.includes(c.get(ox + dx, oy + dy))) c.set(ox + dx, oy + dy, 'T');
  }
  c.stamp(ROPE_COIL, ox, oy);
  return c;
}

/**
 * Billot, la hache plantée dans la coupe : tête vers le bas à gauche, tranchant vers le bas à droite, enfoncé dans le
 * bois près du bord avant ; le long manche monte vers le haut à droite. Seul le talon, l'œil et un liseré de la joue
 * dépassent : la partie enfouie est retirée avant l'éclairage, si bien que le contour ne court que là où la hache est en
 * l'air, et la fente sombre prend sa place à l'entrée du fer. Le fer est celui de la hache en main, de profil : presque
 * noir, talon court et carré ; le fil, enfoui, ne se voit pas.
 */
function choppingBlockAxe(): Canvas {
  const c = shadedOutline(blockBody());
  groundShadow(c, 17.5, 28, 10, 2.4);
  const art = axeArt();
  const zones = Canvas.from(orientedZones(art, 'sw', 'ccw'));
  // milieu de l'œil, dans le dessin orienté (moyenne des pixels d'œil), posé sur l'entrée du fer dans la coupe
  const eye: [number, number][] = [];
  for (let y = 0; y < zones.h; y++) for (let x = 0; x < zones.w; x++) if (zones.get(x, y) === 'e') eye.push([x, y]);
  const ex = eye.reduce((s, p) => s + p[0], 0) / eye.length;
  const ey = eye.reduce((s, p) => s + p[1], 0) / eye.length;
  const ENTRY = { x: 13, y: 18 };
  // la hache dans l'image du billot, avec un pixel de marge tout autour pour le contour
  const ox = Math.round(ENTRY.x - ex - 0.5) + 1, oy = Math.round(ENTRY.y - ey - 0.5) + 1;
  const visible = new Canvas(34, 34);
  const buried = new Canvas(34, 34);
  for (let y = 0; y < zones.h; y++) for (let x = 0; x < zones.w; x++) {
    const k = zones.get(x, y);
    if (k === EMPTY) continue;
    // profondeur vers le tranchant (bas à droite), depuis l'œil : au-delà de deux pixels, le fer est dans le bois
    const depth = (x - ex + (y - ey)) * Math.SQRT1_2;
    ('14'.includes(k) && depth > 2 ? buried : visible).set(x + ox, y + oy, k);
  }
  const lit = Canvas.from(lightUp(visible.toGrid(), art.materials));
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const k = lit.get(x + 1, y + 1);
    if (k === EMPTY) continue;
    const air = visible.get(x + 1, y + 1) !== EMPTY;
    // contour posé sur le bois, au ras du fer enfoui : c'est l'entrée de la fente, pas un bord de la hache en l'air
    const nearBuried = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => buried.get(x + 1 + dx, y + 1 + dy) !== EMPTY));
    if (!air && nearBuried && 'YtT'.includes(c.get(x, y))) {
      c.set(x, y, 'P');
      continue;
    }
    if (!air && buried.get(x + 1, y + 1) !== EMPTY) continue;
    // sous le fer, posé à ras de la coupe, pas de trait de contour (en bas, à droite) mais l'ombre du bois
    const ironBeside = [[-1, 0], [0, -1], [1, 0], [0, 1]].some(([dx, dy]) => '14e'.includes(visible.get(x + 1 + dx, y + 1 + dy)) && visible.get(x + 1 + dx, y + 1 + dy) !== EMPTY);
    if (!air && k === 'o' && ironBeside && 'YtT'.includes(c.get(x, y))) {
      c.set(x, y, 'T');
      continue;
    }
    c.set(x, y, k);
  }
  return c;
}

/** Bouffée de fumée (particule). */
function smoke(): Canvas {
  return Canvas.from([
    '..aa..',
    '.aaaa.',
    'aaaaaa',
    'aaaaaa',
    '.aaaa.',
    '..aa..',
  ]);
}

const smokePalette = { a: '#d9d2c6' };

export default [
  { kind: 'image', name: 'cottage', palette: world, grid: cottage().toGrid() },
  { kind: 'image', name: 'woodpile', palette: world, grid: woodpile().toGrid() },
  { kind: 'image', name: 'chopping-block', palette: world, grid: choppingBlock().toGrid() },
  { kind: 'image', name: 'chopping-block-rope', palette: world, grid: choppingBlockRope().toGrid() },
  { kind: 'image', name: 'chopping-block-axe', palette: toolPalette, grid: choppingBlockAxe().toGrid() },
  { kind: 'image', name: 'smoke', palette: smokePalette, grid: smoke().toGrid() },
] satisfies ImageSource[];
