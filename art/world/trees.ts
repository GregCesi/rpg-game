// Arbre : dessin commun à l'arbre debout (`tree`, déclaré dans props.ts), à sa souche et à sa chute.
// L'arbre est décrit dans son repère propre (image 64x96, pied du tronc en (33, 89)) ; la chute
// le ré-échantillonne au plus proche voisin, en recalculant la lumière pour qu'elle vienne toujours du nord-ouest.

import { Canvas, rng, EMPTY } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';

type Vec = [number, number];

/** Pied du tronc (bas du tronc, au centre) dans le repère de l'arbre debout. */
const FOOT: Vec = [33, 89];

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
function despeckle(c: Canvas, keep = ''): Canvas {
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
function groundShadow(c: Canvas, cx: number, cy: number, rx: number, ry: number) {
  const s = new Canvas(c.w, c.h).ellipse(cx, cy, rx, ry, 'x');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (s.get(x, y) !== EMPTY && c.get(x, y) === EMPTY) c.set(x, y, 'x');
  }
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

/** Silhouette festonnée d'une masse de feuillage (dans le repère de l'arbre). */
function massShape(m: Mass): Canvas {
  const s = new Canvas(64, 96);
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

/**
 * L'arbre dans son repère, sans contour ni ombre.
 * `light` : direction de la lumière dans ce repère (vers la source), pour garder le nord-ouest après rotation.
 */
export function treeBody(light: Vec = [-Math.SQRT1_2, -Math.SQRT1_2]): Canvas {
  const c = new Canvas(64, 96);
  const [lx, ly] = light;

  // Tronc : légère courbe, évasé au pied, deux racines.
  c.polygon([[28, 54], [37, 54], [37.5, 70], [38, 80], [40.5, 85], [42, 89], [24, 89], [26, 85], [27.5, 79], [27.5, 68]], 'm');
  c.polygon([[38, 86], [44, 87.5], [45, 89], [39, 89]], 'm'); // racine droite
  c.polygon([[26, 86], [21, 88], [20.5, 89], [26, 89]], 'm'); // racine gauche
  c.polygon([[36, 58], [44, 50], [46, 51], [37.5, 62]], 'm'); // branche vers la masse de droite
  c.within('m', (c) => {
    // côté éclairé (gauche) et côté ombre (droite)
    c.polygon([[28, 54], [30.5, 54], [30.5, 80], [27, 89], [24, 89], [26, 85], [27.5, 79], [27.5, 68]], 'M');
    c.polygon([[35, 54], [38, 54], [38, 80], [40.5, 85], [42, 89], [37, 89], [36, 80]], 'N');
    c.polygon([[38, 86], [44, 87.5], [45, 89], [39, 89]], 'N');
    c.polygon([[40, 52], [46, 51], [37.5, 62], [37, 58]], 'N');
    // écorce : quelques fentes verticales en teinte d'ombre
    c.line(32, 64, 32, 70, 'N').line(33, 71, 33, 74, 'N');
    c.line(31, 78, 31, 83, 'N');
    c.line(29, 60, 29, 63, 'm');
    c.line(29, 72, 29, 75, 'm');
  });
  c.within('N', (c) => {
    c.line(37, 66, 37, 83, 'K').line(38, 83, 40, 87, 'K').line(41, 88, 43, 88, 'K');
  });

  // Feuillage : chaque masse est découpée en grappes (cellules de Voronoï), ombrées selon la lumière.
  for (const m of MASSES) {
    const shape = massShape(m);
    const r = rng(m.seed * 31);
    const sites: Vec[] = [];
    for (let gy = m.cy - m.ry - 3; gy <= m.cy + m.ry + 3; gy += 5.5) {
      for (let gx = m.cx - m.rx - 3; gx <= m.cx + m.rx + 3; gx += 6) {
        sites.push([gx + (r() - 0.5) * 3.5, gy + (r() - 0.5) * 3]);
      }
    }
    const ramp = ['k', 'l', 'L', 'j'];
    for (let y = 0; y < 96; y++) for (let x = 0; x < 64; x++) {
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

  // Ombre du feuillage sur le haut du tronc.
  c.within('Mm', (c) => c.polygon([[26, 54], [40, 54], [40, 67], [33, 69], [26, 66]], 'N'));
  c.within('N', (c) => c.polygon([[33, 54], [40, 54], [40, 64], [33, 66]], 'K'));

  return despeckle(c, 'K');
}

/** L'arbre debout, 64x96 : image `tree`. */
export function standingTree(): Canvas {
  const c = shadedOutline(treeBody());
  groundShadow(c, 36, 89.5, 17, 4);
  return c;
}

// ---------- Souche ----------

/** Dessus de la souche : coupe nette, bois clair, un cerne et le cœur. */
const CUT = [
  '..NNNNNN..',
  '.NYYYYYYN.',
  'NYYttttYYN',
  'NYtYTTYtYN',
  'NYYttttYYN',
  '.NYYYYYYN.',
];

/** Souche sans contour ni ombre, 32x32, pied du tronc en y=26 ; même tronc que l'arbre (10 px, évasé au pied). */
function stumpBody(): Canvas {
  const c = new Canvas(32, 32);
  c.polygon([[11, 16], [21, 16], [21.5, 22], [23.5, 25], [25, 27], [7, 27], [8.5, 25], [10.5, 22]], 'm');
  c.polygon([[21, 24], [27, 25.5], [28, 27], [22, 27]], 'm'); // racine droite
  c.polygon([[10, 24.5], [5, 26], [4, 27], [10, 27]], 'm'); // racine gauche
  c.within('m', (c) => {
    c.polygon([[11, 16], [13.5, 16], [13.5, 23], [11, 27], [7, 27], [8.5, 25], [10.5, 22]], 'M');
    c.polygon([[18, 16], [21, 16], [21.5, 22], [23.5, 25], [25, 27], [20, 27], [18.5, 23]], 'N');
    c.polygon([[21, 24], [27, 25.5], [28, 27], [22, 27]], 'N');
    c.line(15, 20, 15, 23, 'N');
  });
  c.within('N', (c) => c.line(20, 19, 20, 23, 'K').line(21, 24, 23, 26, 'K'));
  c.stamp(CUT, 11, 13);
  return c;
}

function stump(): Canvas {
  const c = shadedOutline(stumpBody());
  groundShadow(c, 18, 27.5, 11, 2.6);
  return c;
}

// ---------- Chute ----------

const FALL_W = 160;
const FALL_H = 96;
/**
 * Décalage de l'arbre (64 de large) dans la frame : l'arbre debout est à gauche (pied en x = OFF + 33)
 * pour laisser au tronc couché, puis au houppier, la place de s'étendre vers la droite.
 */
const OFF = 14;
/** La souche se pose sous le tronc : décalage du repère de la souche dans celui de l'arbre. */
const STUMP_AT: Vec = [17, 62];
/** Hauteur de la coupe dans le repère de l'arbre : tout ce qui est au-dessus tombe. */
const CUT_Y = 76;
/** Charnière : bord droit de la coupe, côté où l'arbre tombe. */
const HINGE: Vec = [38, CUT_Y];
/** Rangée sous le houppier à partir de laquelle le tronc s'allonge quand il se couche. */
const TRUNK_FROM = 70;
/** Allongement du tronc couché : vu de dessus, il montre toute sa longueur (environ 34 px sous le houppier). */
const EXT = 24;

function withStump(c: Canvas): Canvas {
  c.stamp(stumpBody().toGrid(), STUMP_AT[0] + OFF, STUMP_AT[1]);
  return c;
}

/**
 * Le haut de l'arbre (au-dessus de la coupe), avec un tronc allongé de `ext` rangées.
 * Le tronc ajouté reprend le profil d'écorce de l'arbre (clair à gauche, sombre à droite) et quelques fentes.
 * Rend le canevas et la rangée de coupe dans ce canevas.
 */
function fallingPart(light: Vec, ext: number): { src: Canvas; cut: number } {
  const body = treeBody(light);
  const cut = CUT_Y + ext;
  const src = new Canvas(64, cut);
  for (let y = 0; y < TRUNK_FROM; y++) for (let x = 0; x < 64; x++) src.px[y][x] = body.get(x, y);
  // profil propre du tronc (sans fente), pris juste sous la coupe
  const profile = body.px[77];
  for (let y = TRUNK_FROM; y < cut; y++) for (let x = 0; x < 64; x++) src.px[y][x] = profile[x];
  src.within('m', (c) => {
    for (const [x, y0, n] of [[32, 0, 6], [33, 9, 4], [31, 15, 6], [33, 24, 4]] as const) {
      if (y0 + n <= cut - TRUNK_FROM - 2) c.line(x, TRUNK_FROM + y0, x, TRUNK_FROM + y0 + n - 1, 'N');
    }
  });
  src.within('M', (c) => {
    for (const [x, y0, n] of [[29, 3, 4], [29, 19, 4]] as const) {
      if (y0 + n <= cut - TRUNK_FROM - 2) c.line(x, TRUNK_FROM + y0, x, TRUNK_FROM + y0 + n - 1, 'm');
    }
  });
  return { src, cut };
}

interface Pose {
  deg: number;
  /** Position à l'écran du centre de la coupe du tronc qui tombe. */
  base: Vec;
  ext: number;
  /** Écrasement du houppier de part et d'autre du tronc (1 = aucun) : vu de dessus, il s'aplatit au sol. */
  squash: number;
}

/**
 * Dessine le haut de l'arbre selon `pose` (tourné de `deg` degrés vers la droite), avec la lumière
 * nord-ouest de l'écran ramenée dans le repère de l'arbre, puis le bout scié au pied du tronc.
 */
function drawFalling(c: Canvas, p: Pose) {
  const t = (p.deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const S: Vec = [-Math.SQRT1_2, -Math.SQRT1_2];
  const { src, cut } = fallingPart([S[0] * cos + S[1] * sin, -S[0] * sin + S[1] * cos], p.ext);
  const half = 5.5; // demi-largeur du tronc, jamais écrasée
  const inv = (g: number) => (Math.abs(g) <= half ? g : Math.sign(g) * (half + (Math.abs(g) - half) / p.squash));
  // calque à part : le bout scié ne se peint que sur le tronc qui tombe, jamais sur la souche
  const layer = new Canvas(FALL_W, FALL_H);
  // axe du tronc (vers la cime) : (sin, -cos) ; travers (côté droit de l'arbre) : (cos, sin)
  const local = (X: number, Y: number): Vec => {
    const U = X + 0.5 - p.base[0];
    const V = Y + 0.5 - p.base[1];
    return [U * sin - V * cos, U * cos + V * sin];
  };
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const [h, g] = local(X, Y);
    if (h < 0) continue;
    const q = src.get(Math.floor(FOOT[0] + inv(g)), Math.floor(cut - h));
    if (q !== EMPTY) layer.set(X, Y, q);
  }
  // bout scié : disque du tronc vu de biais, tourné vers le bas-gauche, donc vers la lumière
  const minor = 0.9 + 1.1 * sin;
  const face = (rx: number, ry: number, col: string) => {
    for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
      if (layer.get(X, Y) === EMPTY) continue;
      const [h, g] = local(X, Y);
      if (h < 1) continue;
      const a = (g + 0.3) / rx;
      const b = (h - 1) / ry;
      if (a * a + b * b <= 1) layer.set(X, Y, col);
    }
  };
  // la rangée du bas : bord d'écorce du disque, qui sépare le bout scié du dessus de la souche
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (layer.get(X, Y) !== EMPTY && local(X, Y)[0] < 1) layer.set(X, Y, 'N');
  }
  face(5.6, minor + 0.4, 'Y');
  if (minor > 1.5) face(2.4, minor * 0.6, 't');
  c.stamp(layer.toGrid(), 0, 0);
}

/** Image de la chute : souche fixe, haut de l'arbre dans la pose donnée, contour, ombres. */
function fallFrame(p: Pose, shadows: [number, number, number, number][]): Canvas {
  const c = withStump(new Canvas(FALL_W, FALL_H));
  drawFalling(c, p);
  despeckle(c, 'KY');
  shadedOutline(c);
  for (const [x, y, rx, ry] of shadows) groundShadow(c, x, y, rx, ry);
  return c;
}

/** Pose pivotée autour de la charnière (bord droit de la coupe), qui reste sur la souche. */
function pivot(deg: number): Pose {
  const t = (deg * Math.PI) / 180;
  const s = Math.sin(t);
  // centre de la coupe : 5 px à gauche de la charnière, dans le repère tourné
  const d = HINGE[0] - FOOT[0];
  return {
    deg,
    base: [HINGE[0] + OFF - d * Math.cos(t), HINGE[1] - d * s],
    ext: Math.round(EXT * s),
    squash: 1 - 0.64 * s * s,
  };
}

const FOOT_X = FOOT[0] + OFF;

const frames = [
  new Canvas(FALL_W, FALL_H).stamp(standingTree().toGrid(), OFF, 0),
  fallFrame(pivot(10), [[FOOT_X + 3, 89.5, 17, 4], [FOOT_X + 12, 90, 16, 3.5]]),
  fallFrame(pivot(45), [[FOOT_X + 3, 89.5, 14, 3.5], [FOOT_X + 46, 90.5, 26, 4]]),
  // couché : le bout scié contre la racine droite de la souche, l'axe du tronc à 6 px au-dessus du sol
  fallFrame({ deg: 90, base: [FOOT_X + 13, 81.5], ext: EXT, squash: 0.32 }, [[FOOT_X + 3, 89.5, 13, 3], [FOOT_X + 62, 91, 52, 3.5]]),
];

const treeFall: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'tree-fall',
  frameW: FALL_W,
  frameH: FALL_H,
  palette: world,
  animations: {
    fall: { frames: frames.map((f) => f.toGrid()), frameRate: 6, repeat: 0 },
  },
};

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('tree-stump', stump()), treeFall];
