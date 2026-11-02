// Rocher (que Xéros cassera), ses éclats au sol, buisson et buisson de baies. Images 32x32, ancrage en bas au centre.
// Lumière nord-ouest ; contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

type Vec = [number, number];

const palette = {
  ...world,
  // rouges des baies : les mêmes que l'icône item-berries (dérivés des fleurs c et des braises i)
  '6': '#d27a52', // rouge éclairé (c tiré vers le jaune)
  '7': '#a8453a', // rouge franc
  '8': '#74303a', // rouge d'ombre (vers le brun-violet)
};

/** Teinte la plus sombre de chaque matière : contour côté lumière (STYLE.md, section 3). */
const DARKEST: Record<string, string> = {
  R: 'Z', r: 'Z', z: 'Z', Z: 'Z',
  j: 'k', L: 'k', l: 'k', k: 'k',
  '6': '8', '7': '8', '8': '8',
};

/** Contour d'un pixel : côté haut-gauche, la teinte la plus sombre de la matière voisine ; côté bas-droite, OUTLINE. */
function shadedOutline(c: Canvas): Canvas {
  const add: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== EMPTY) continue;
    let side = 0;
    let lit: string | null = null;
    let any = false;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const n = c.get(x + dx, y + dy);
      if (n === EMPTY || n === 'x') continue;
      any = true;
      side += dx + dy;
      if (dx + dy > 0 && !lit) lit = n;
    }
    if (!any) continue;
    add.push([x, y, side > 0 && lit ? DARKEST[lit] ?? 'o' : 'o']);
  }
  for (const [x, y, col] of add) c.px[y][x] = col;
  return c;
}

/** Remplace les pixels isolés (aucun voisin de même couleur) par la couleur majoritaire autour. */
function despeckle(c: Canvas): Canvas {
  const fix: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const p = c.get(x, y);
    if (p === EMPTY) continue;
    const ns = [c.get(x + 1, y), c.get(x - 1, y), c.get(x, y + 1), c.get(x, y - 1)];
    if (ns.includes(p) || ns.includes(EMPTY)) continue;
    const count: Record<string, number> = {};
    for (const n of ns) count[n] = (count[n] ?? 0) + 1;
    fix.push([x, y, Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]]);
  }
  for (const [x, y, col] of fix) c.px[y][x] = col;
  return c;
}

/** Ombre portée : ne remplit que les pixels encore vides. */
function groundShadow(c: Canvas, cx: number, cy: number, rx: number, ry: number) {
  const s = new Canvas(c.w, c.h).ellipse(cx, cy, rx, ry, 'x');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (s.get(x, y) !== EMPTY && c.get(x, y) === EMPTY) c.set(x, y, 'x');
  }
}

// ---------- Rocher ----------

/** Rocher sans contour : un bloc à facettes, dessus clair, face sud sombre. */
function rockBody(): Canvas {
  const c = new Canvas(32, 32);
  // silhouette : plus haute à gauche, épaule tombante à droite
  const outer: Vec[] = [[4, 25], [5, 19], [8, 14], [13, 10.5], [19, 10], [23, 12], [26.5, 16], [28, 21], [27.5, 25], [25, 28], [7, 28]];
  c.polygon(outer, 'z');
  // dessus : la tranche haute de la silhouette, en pierre moyenne (pente ouest)
  c.within('z', (c) => c.polygon([[3, 20], [5, 19], [8, 14], [13, 10.5], [19, 10], [23, 12], [26.5, 16], [28, 19], [21, 20.5], [13, 21.5], [5, 21]], 'r'));
  // plateau du sommet, face au ciel : le plus clair
  c.within('r', (c) => c.polygon([[7.5, 15], [12.5, 11], [19, 10.5], [21.5, 12.5], [18.5, 16.5], [10.5, 17.5]], 'R'));
  // pente est, détournée de la lumière
  c.within('r', (c) => c.polygon([[21.5, 12.5], [23, 12], [26.5, 16], [28, 19.5], [20, 21], [18.5, 16.5]], 'z'));
  // face sud : ombre plus dense vers la droite et au pied
  c.within('z', (c) => {
    c.polygon([[18, 21.5], [28, 20], [28, 25], [25, 28], [16, 28]], 'Z');
    c.polygon([[4, 26], [26, 26], [25, 28], [7, 28]], 'Z');
  });
  // fissure sur la face sud
  c.within('zZ', (c) => c.line(11, 22, 12, 25, 'Z'));
  return despeckle(c);
}

function rock(): Canvas {
  const c = shadedOutline(rockBody());
  groundShadow(c, 17.5, 28.6, 12.5, 2.6);
  return c;
}

// ---------- Éclats de pierre ----------

/** Un éclat posé à plat : dessus clair bordé de lumière en haut à gauche, tranche sud sombre. */
function chip(c: Canvas, pts: Vec[], ridge: number) {
  const ys = pts.map((p) => p[1]);
  const top = Math.min(...ys);
  const bot = Math.max(...ys);
  const own = new Canvas(c.w, c.h).polygon(pts, 'z');
  own.within('z', (o) => o.polygon(pts.map(([x, y]) => [x, Math.min(y, top + (bot - top) * ridge)] as Vec), 'r'));
  const lit: [number, number][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (own.get(x, y) === 'r' && (own.get(x - 1, y) === EMPTY || own.get(x, y - 1) === EMPTY)) lit.push([x, y]);
  }
  for (const [x, y] of lit) own.set(x, y, 'R');
  c.stamp(own.toGrid(), 0, 0);
}

function rubble(): Canvas {
  const c = new Canvas(32, 32);
  chip(c, [[7, 22], [11, 19.5], [16, 20], [18, 23.5], [15, 27], [9, 26.5]], 0.55); // le plus gros, à gauche
  chip(c, [[19.5, 23], [23, 21.5], [26, 23], [25.5, 26.5], [20, 26.5]], 0.5);
  chip(c, [[3.5, 26], [6.5, 25], [8, 27], [6.5, 28.5], [3.5, 28]], 0.45);
  chip(c, [[19, 17.5], [21.5, 17], [22.5, 19.5], [19, 19.8]], 0.55);
  chip(c, [[12, 28], [15.5, 27.8], [16.5, 29.5], [12.5, 29.6]], 0.45);
  shadedOutline(c);
  // gravillons : grains d'un pixel sans contour, voulus
  c.set(27, 20, 'z').set(10, 18, 'z').set(28, 27, 'z');
  groundShadow(c, 16.5, 28.5, 13, 2.2);
  return c;
}

// ---------- Buisson ----------

/** Touffes de feuilles (centre, rayon), de l'arrière vers l'avant : asymétriques, la masse haute à gauche. */
const PUFFS: [number, number, number][] = [
  [10.5, 11.5, 4.4], [16.5, 12.5, 3.5], [21.5, 15.5, 3.6],
  [7, 16, 3.8], [13.5, 16, 4.4], [19.5, 18.5, 4.2], [24.5, 19.5, 3.4],
  [8.5, 21.5, 4], [14.5, 22, 4.4], [20.5, 23, 4], [25, 23, 2.8],
];

/**
 * Feuillage en touffes rondes, comme les masses de l'arbre : chaque touffe a son côté éclairé en haut à gauche
 * et un liseré d'ombre en bas à droite qui la détache de la suivante. Les touffes du bas et de droite sont plus sombres.
 */
function bushBody(): Canvas {
  const c = new Canvas(32, 32);
  const ramp = ['k', 'l', 'L', 'j'];
  for (const [cx, cy, r] of PUFFS) {
    // position dans le buisson, projetée sur la lumière nord-ouest : 1 éclairé, 0 dans l'ombre
    const v = (-(cx - 16) / 10 - (cy - 17) / 6) * 0.5;
    const base = v > 0.25 ? 1 : v > -0.45 ? 1 : 0;
    const top = v > 0.25 ? 3 : v > -0.45 ? 2 : 1;
    const own = new Canvas(32, 32).ellipse(cx, cy, r, r * 0.85, ramp[base]);
    own.within(ramp[base], (o) => o.ellipse(cx - 0.9, cy - 1, r * 0.62, r * 0.52, ramp[top]));
    if (top === 3) own.within('j', (o) => o.ellipse(cx + 0.6, cy + 0.4, r * 0.5, r * 0.42, 'L'));
    // liseré d'ombre en bas à droite de la touffe
    const rim: [number, number][] = [];
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (own.get(x, y) !== EMPTY && (own.get(x + 1, y) === EMPTY || own.get(x, y + 1) === EMPTY)) rim.push([x, y]);
    }
    for (const [x, y] of rim) own.set(x, y, ramp[Math.max(0, ramp.indexOf(own.get(x, y)) - 1)]);
    c.stamp(own.toGrid(), 0, 0);
  }
  return despeckle(c);
}

function bush(): Canvas {
  const c = shadedOutline(bushBody());
  groundShadow(c, 17.5, 27.6, 12, 2.6);
  return c;
}

// ---------- Buisson de baies ----------

/** Grappes de baies posées sur le feuillage : chaque baie a son reflet, son rouge franc et son ombre. */
const BERRIES: Vec[][] = [
  [[9, 13], [11, 14], [9, 15]],
  [[17, 11], [19, 12]],
  [[22, 16], [24, 17], [22, 18]],
  [[13, 19], [15, 20]],
  [[8, 20], [10, 21], [8, 22]],
  [[19, 22], [21, 23], [19, 24]],
];

function berryBush(): Canvas {
  const c = bushBody();
  for (const cluster of BERRIES) {
    for (const [x, y] of cluster) {
      // baie de 2x2 : reflet en haut à gauche, ombre en bas à droite
      c.set(x, y, '6').set(x + 1, y, '7').set(x, y + 1, '7').set(x + 1, y + 1, '8');
    }
  }
  shadedOutline(c);
  groundShadow(c, 17.5, 27.6, 12, 2.6);
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [img('rock', rock()), img('rock-rubble', rubble()), img('bush', bush()), img('bush-berries', berryBush())];
