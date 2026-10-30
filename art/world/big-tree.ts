// Arbre : dessin commun à l'arbre debout (`big-tree`, déclaré dans props.ts), à sa souche et à sa chute.
// L'arbre est décrit dans son repère propre (image 64x96, pied du tronc en (33, 89)) ; la chute
// (art/world/big-felled.ts) le ré-échantillonne au plus proche voisin, en recalculant la lumière pour qu'elle vienne toujours du nord-ouest.

import { Canvas, rng, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { bark, faceTone } from './wood';

export type Vec = [number, number];

/** Pied du tronc (bas du tronc, au centre) dans le repère de l'arbre debout. */
export const FOOT: Vec = [33, 89];

/** Teinte la plus sombre de chaque matière : contour côté lumière (STYLE.md, section 3). */
const DARKEST: Record<string, string> = { j: 'k', L: 'k', l: 'k', k: 'k', M: 'K', m: 'K', N: 'K', K: 'K', Y: 'N', t: 'N', T: 'N' };

/**
 * Contour d'un pixel : en haut et à gauche, la teinte la plus sombre de la matière voisine ;
 * en bas et à droite, OUTLINE.
 */
export function shadedOutline(c: Canvas): Canvas {
  const add: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== EMPTY) continue;
    let side = 0;
    let lit: string | null = null;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const n = c.get(x + dx, y + dy);
      if (n === EMPTY || n === 'x') continue;
      side += dx + dy;
      if (dx + dy > 0 && !lit) lit = n;
    }
    const any = [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => {
      const n = c.get(x + dx, y + dy);
      return n !== EMPTY && n !== 'x';
    });
    if (!any) continue;
    add.push([x, y, side > 0 && lit ? DARKEST[lit] ?? 'o' : 'o']);
  }
  for (const [x, y, col] of add) c.px[y][x] = col;
  return c;
}

/** Remplace les pixels isolés (aucun voisin de même couleur) par la couleur majoritaire autour. */
export function despeckle(c: Canvas, keep = ''): Canvas {
  const fix: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const p = c.get(x, y);
    if (p === EMPTY || keep.includes(p)) continue;
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
export function groundShadow(c: Canvas, cx: number, cy: number, rx: number, ry: number) {
  const s = new Canvas(c.w, c.h).ellipse(cx, cy, rx, ry, 'x');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (s.get(x, y) !== EMPTY && c.get(x, y) === EMPTY) c.set(x, y, 'x');
  }
}

/**
 * Tronc vertical : `shape` dessine sa silhouette (n'importe quelle couleur) ; chaque pixel prend l'écorce commune, avec
 * `s` mesuré en travers de sa rangée (0 au bord gauche, éclairé ; 1 au bord droit) et `along` le long du tronc
 * (rangée + `from`, pour que le tronc couché, qui reprend ces rangées, garde les mêmes sillons).
 */
function barkRows(c: Canvas, shape: (t: Canvas) => void, from = 0) {
  const t = new Canvas(c.w, c.h);
  shape(t);
  for (let y = 0; y < c.h; y++) {
    const xs = [...Array(c.w).keys()].filter((x) => t.get(x, y) !== EMPTY);
    if (!xs.length) continue;
    const x0 = xs[0];
    const w = xs[xs.length - 1] - x0 + 1;
    // au pied, la rangée s'élargit (évasement, racines) : la rampe s'étire avec elle
    for (const x of xs) c.set(x, y, bark(y + from, (x + 0.5 - x0) / w));
  }
}

/** Face de coupe commune peinte sur une forme ovale (`c` : ses pixels peints), centrée, de demi-axes rx, ry. */
function paintFaceOnMask(c: Canvas, rx: number, ry: number) {
  const cx = c.w / 2, cy = c.h / 2;
  const out: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) === EMPTY) continue;
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.get(x + dx, y + dy) === EMPTY);
    out.push([x, y, faceTone((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry, rim)]);
  }
  for (const [x, y, k] of out) c.px[y][x] = k;
}

interface Mass { cx: number; cy: number; rx: number; ry: number; seed: number; dim: number }

// Cinq masses de feuillage, de la plus lointaine (en haut) à la plus proche (en bas) : asymétriques.
const MASSES: Mass[] = [
  { cx: 37, cy: 21, rx: 10, ry: 9, seed: 11, dim: 0 },
  { cx: 26, cy: 31, rx: 16, ry: 14, seed: 12, dim: 0 },
  { cx: 44, cy: 39, rx: 14, ry: 12, seed: 13, dim: 0.1 },
  { cx: 19, cy: 50, rx: 13, ry: 10, seed: 14, dim: 0.15 },
  { cx: 38, cy: 56, rx: 15, ry: 9, seed: 15, dim: 0.25 },
];

/** Silhouette festonnée d'une masse de feuillage (dans le repère de l'arbre, de hauteur `h`). */
function massShape(m: Mass, h = 96): Canvas {
  const s = new Canvas(64, h);
  const r = rng(m.seed);
  s.ellipse(m.cx, m.cy, m.rx * 0.84, m.ry * 0.84, 'l');
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = ((i + r() * 0.5) / n) * Math.PI * 2;
    const b = Math.min(m.rx, m.ry) * (0.26 + r() * 0.1);
    s.ellipse(m.cx + Math.cos(a) * m.rx * 0.78, m.cy + Math.sin(a) * m.ry * 0.78, b, b * 0.85, 'l');
  }
  return s;
}

/** Feuillage : chaque masse est découpée en grappes (cellules de Voronoï), ombrées selon la lumière (vers la source). */
function paintFoliage(c: Canvas, masses: Mass[], light: Vec) {
  const [lx, ly] = light;
  for (const m of masses) {
    const shape = massShape(m, c.h);
    const r = rng(m.seed * 31);
    const sites: Vec[] = [];
    for (let gy = m.cy - m.ry - 3; gy <= m.cy + m.ry + 3; gy += 5.5) {
      for (let gx = m.cx - m.rx - 3; gx <= m.cx + m.rx + 3; gx += 6) {
        sites.push([gx + (r() - 0.5) * 3.5, gy + (r() - 0.5) * 3]);
      }
    }
    const ramp = ['k', 'l', 'L', 'j'];
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      if (shape.get(x, y) === EMPTY) continue;
      const px = x + 0.5;
      const py = y + 0.5;
      let best = sites[0];
      let bd = Infinity;
      for (const s of sites) {
        const d = (s[0] - px) ** 2 + (s[1] - py) ** 2;
        if (d < bd) { bd = d; best = s; }
      }
      // valeur de la grappe : position du centre de la grappe dans la masse, projetée sur la lumière
      const v = ((best[0] - m.cx) / m.rx) * lx + ((best[1] - m.cy) / m.ry) * ly - m.dim;
      let i = v > 0.38 ? 3 : v > 0.05 ? 2 : v > -0.45 ? 1 : 0;
      // bord de la grappe côté ombre : un cran plus sombre
      const local = (px - best[0]) * lx + (py - best[1]) * ly;
      if (local < -1.6 && i > 0) i--;
      c.set(x, y, ramp[i]);
    }
  }

}

/**
 * L'arbre dans son repère, sans contour ni ombre.
 * `light` : direction de la lumière dans ce repère (vers la source), pour garder le nord-ouest après rotation.
 */
export function treeBody(light: Vec = [-Math.SQRT1_2, -Math.SQRT1_2]): Canvas {
  const c = new Canvas(64, 96);

  // Tronc : légère courbe, évasé au pied, deux racines, une branche vers la masse de droite.
  // La branche garde son ombrage ; le tronc et les racines prennent l'écorce commune (art/world/wood.ts) : rampe en
  // travers de chaque rangée (lumière à gauche), sillons dans le sens du tronc.
  c.polygon([[36, 58], [44, 50], [46, 51], [37.5, 62]], 'm');
  c.within('m', (c) => c.polygon([[40, 52], [46, 51], [37.5, 62], [37, 58]], 'N'));
  barkRows(c, (t) => {
    t.polygon([[28, 54], [37, 54], [37.5, 70], [38, 80], [40.5, 85], [42, 89], [24, 89], [26, 85], [27.5, 79], [27.5, 68]], 'm');
    t.polygon([[38, 86], [44, 87.5], [45, 89], [39, 89]], 'm'); // racine droite
    t.polygon([[26, 86], [21, 88], [20.5, 89], [26, 89]], 'm'); // racine gauche
  });

  paintFoliage(c, MASSES, light);

  // Ombre du feuillage sur le haut du tronc.
  c.within('Mm', (c) => c.polygon([[26, 54], [40, 54], [40, 67], [33, 69], [26, 66]], 'N'));
  c.within('N', (c) => c.polygon([[33, 54], [40, 54], [40, 64], [33, 66]], 'K'));

  return despeckle(c, 'K');
}

// ---------- Arbre debout, à sa vraie hauteur ----------
// `treeBody` ci-dessus (64x96) reste le repère des pièces couchées (art/world/big-felled.ts : profil du tronc, houppier
// couché), qui ne bougent pas. L'arbre debout (`big-tree`) et sa chute prennent ce grand repère : même largeur, même
// pied (rangées décalées de TALL_DY), mais à sa vraie hauteur, 270 × 270 × 565 cm (boîte : 54 × 140 px). Sa longueur
// couchée fait foi : du sol à la coupe, la souche (13 px) ; de la coupe au bas du feuillage, le tronc nu des sections
// couchées jusqu'au houppier (environ 46 px) ; puis le feuillage, la longueur du houppier couché (52 px) plus son
// dessus vu en trois quarts (D/2 = 27 px).

/** Hauteur de l'image de l'arbre debout ; décalage de ses rangées par rapport au repère 64x96 (même bas d'image). */
export const TALL_H = 160;
export const TALL_DY = TALL_H - 96;

// Une masse de fond, puis cinq masses de la plus lointaine (en haut) à la plus proche (en bas) : asymétriques, éclairées en haut à gauche.
const TALL_MASSES: Mass[] = [
  { cx: 31, cy: 58, rx: 17, ry: 27, seed: 20, dim: 0.3 }, // masse du fond : bouche les jours entre les autres
  { cx: 35, cy: 28, rx: 13, ry: 13, seed: 21, dim: 0 },
  { cx: 24, cy: 45, rx: 15, ry: 14, seed: 22, dim: 0.05 },
  { cx: 43, cy: 54, rx: 14, ry: 13, seed: 23, dim: 0.1 },
  { cx: 19, cy: 69, rx: 13, ry: 12, seed: 24, dim: 0.15 },
  { cx: 38, cy: 81, rx: 16, ry: 11, seed: 25, dim: 0.25 },
];

/** L'arbre debout dans son grand repère (64 x TALL_H, pied en (33, 89 + TALL_DY)), sans contour ni ombre. */
export function tallTreeBody(light: Vec = [-Math.SQRT1_2, -Math.SQRT1_2]): Canvas {
  const c = new Canvas(64, TALL_H);
  const D = TALL_DY;
  const P = (pts: Vec[]): Vec[] => pts.map(([x, y]) => [x, y + D]);
  // Tronc : long fût presque droit, évasé au pied (le même pied que la souche), deux racines ; deux branches
  // montent dans les masses de droite et de gauche.
  c.polygon(P([[36, 26], [44, 16], [46, 17], [37.5, 30]]), 'm');
  c.within('m', (c) => c.polygon(P([[40, 20], [46, 17], [37.5, 30], [37, 26]]), 'N'));
  c.polygon(P([[29, 24], [22, 13], [20, 14], [28.5, 28]]), 'm');
  c.within('m', (c) => c.polygon(P([[24, 18], [20, 14], [28.5, 28], [28.5, 25]]), 'N'));
  barkRows(c, (t) => {
    t.polygon(P([[28, 14], [37, 14], [37.5, 40], [37.5, 70], [38, 80], [40.5, 85], [42, 89], [24, 89], [26, 85], [27.5, 79], [27.5, 40]]), 'm');
    t.polygon(P([[38, 86], [44, 87.5], [45, 89], [39, 89]]), 'm'); // racine droite
    t.polygon(P([[26, 86], [21, 88], [20.5, 89], [26, 89]]), 'm'); // racine gauche
  }, -D);

  paintFoliage(c, TALL_MASSES, light);

  // Ombre du feuillage sur le haut du tronc.
  c.within('Mm', (c) => c.polygon(P([[26, 28], [40, 28], [40, 38], [33, 40], [26, 37]]), 'N'));
  c.within('N', (c) => c.polygon(P([[33, 28], [40, 28], [40, 36], [33, 38]]), 'K'));

  return despeckle(c, 'K');
}

/** L'arbre debout, 64 x TALL_H : image `big-tree`. */
export function standingTree(): Canvas {
  const c = shadedOutline(tallTreeBody());
  groundShadow(c, 36, 89.5 + TALL_DY, 17, 4);
  return c;
}

// ---------- Souche ----------

/** Forme du dessus de la souche (10 × 6) : la face de coupe commune s'y peint (art/world/wood.ts). */
const CUT = [
  '..NNNNNN..',
  '.NYYYYYYN.',
  'NYYttttYYN',
  'NYtYTTYtYN',
  'NYYttttYYN',
  '.NYYYYYYN.',
];

/** Souche sans contour ni ombre, 32x32, pied du tronc en y=26 ; même tronc que l'arbre (10 px, évasé au pied). */
export function stumpBody(): Canvas {
  const c = new Canvas(32, 32);
  barkRows(c, (t) => {
    t.polygon([[11, 16], [21, 16], [21.5, 22], [23.5, 25], [25, 27], [7, 27], [8.5, 25], [10.5, 22]], 'm');
    t.polygon([[21, 24], [27, 25.5], [28, 27], [22, 27]], 'm'); // racine droite
    t.polygon([[10, 24.5], [5, 26], [4, 27], [10, 27]], 'm'); // racine gauche
  }, 70);
  // dessus : la face de coupe commune, sur la forme de CUT
  const face = Canvas.from(CUT.map((r) => r.replace(/[^.]/g, 'm')));
  paintFaceOnMask(face, 5, 3);
  c.stamp(face.toGrid(), 11, 13);
  return c;
}

export function stump(): Canvas {
  const c = shadedOutline(stumpBody());
  groundShadow(c, 18, 27.5, 11, 2.6);
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('big-tree-stump', stump())];
