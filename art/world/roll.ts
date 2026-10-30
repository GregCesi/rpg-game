// Billes qui roulent : quatre planches d'une animation `roll` de 4 images, une par bille couchée
// (`big-felled-log`, `big-felled-log-ns`, `normal-felled-log`, `normal-felled-log-ns`). Chaque planche a le canevas,
// la silhouette, l'ancrage et l'ombre de son image fixe (art/world/big-felled.ts, art/world/normal-logs.ts) : seule
// la matière bouge.
//
// Règle de rotation : 4 images = un tour complet ; l'image k+1 montre la bille tournée d'un quart de tour de plus que
// l'image k (le jeu avance d'une image tous les π × Ø ÷ 4 de roulement : 8,6 px pour le gros, 4,7 px pour le normal).
// L'image avance quand la bille roule vers le sud (est-ouest) ou vers l'est (nord-sud) ; le jeu lit la planche à
// l'envers pour l'autre sens.
//
// - L'écorce : ses sillons (parallèles à l'axe) sont posés sur un anneau qui fait tout le tour du tronc, deux fois la
//   face visible (22 rangées de texture pour le gros, 12 pour le normal). La lumière, elle, ne tourne pas : la rampe
//   M m N K reste en place, seuls les sillons défilent, d'un quart d'anneau par image (vers le bas pour une bille
//   est-ouest qui roule vers le sud, vers la droite pour une bille nord-sud qui roule vers l'est). Les couloirs visibles
//   à l'image 0 sont exactement ceux de la matière commune (art/world/wood.ts) : l'image 0 est la bille fixe. Les
//   couloirs de la face cachée ont chacun leur rythme de tirets, pour qu'on suive un sillon d'une image à l'autre.
// - Les bouts d'une bille est-ouest ne bougent pas : la face de coupe tourne sur place, sans repère lisible à 5 px.
// - La face de coupe d'une bille nord-sud porte une fente, du cœur vers l'écorce, qui tourne d'un quart de tour par
//   image dans le sens des aiguilles d'une montre (vue du sud, le dessus part vers l'est).

import { Canvas, EMPTY } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { despeckle, shadedOutline } from './big-tree';
import { LOG_NS as BIG_NS } from './big-felled';
import { LOG_NS as NORMAL_NS } from './normal-logs';
import { BIG_WOOD, DARKER, NORMAL_WOOD, type Wood, barkTone, logEnd, paintFace } from './wood';
import bigFelled from './big-felled';
import normalLogs from './normal-logs';

/** Anneau d'écorce : nombre de rangées de texture sur tout le tour, couloirs de sillons (rangée, période, tiret, décalage). */
interface Ring { size: number; furrows: [number, number, number, number][] }

/**
 * Gros arbre : 22 rangées (deux fois les 11 de la face visible). Couloirs 2, 5, 8 (ceux de BIG_WOOD), puis 12, 15, 18 sur
 * la face cachée : écarts de 3 à 6, pour que les sillons ne retombent pas sur les mêmes rangées d'une image à l'autre.
 */
const BIG_RING: Ring = {
  size: 22,
  furrows: [
    ...BIG_WOOD.furrows,
    [12, 15, 6, 9],
    [15, 10, 4, 2],
    [18, 14, 6, 5],
  ],
};

/** Arbre normal : 12 rangées (deux fois les 6 visibles), couloirs 1 et 4 (ceux de NORMAL_WOOD), puis 7 et 10. */
const NORMAL_RING: Ring = {
  size: 12,
  furrows: [
    ...NORMAL_WOOD.furrows,
    [7, 9, 3, 4],
    [10, 15, 6, 9],
  ],
};

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Décalage de l'anneau à l'image k : un quart de tour par image, arrondi (5 ou 6 rangées pour le gros, 3 pour le normal). */
const shiftAt = (ring: Ring, k: number) => Math.round((k * ring.size) / 4);

/**
 * Écorce d'une bille tournée de `shift` rangées de texture : `s` en travers de la face visible (0 côté lumière), la
 * rangée visible r montre la rangée r − shift de l'anneau.
 */
function rolledBark(along: number, s: number, wood: Wood, ring: Ring, shift: number): string {
  const b = barkTone(s);
  const row = mod(Math.floor(s * wood.diameter) - shift, ring.size);
  const a = Math.floor(along);
  const furrow = ring.furrows.some(([r, p, n, ph]) => {
    const pos = mod(a + ph, p);
    if (pos >= n) return false;
    return row === mod(r + (pos >= Math.ceil(n / 2) ? 1 : 0), ring.size);
  });
  return furrow ? DARKER[b] : b;
}

/** Cadre des pixels peints d'un canevas. */
function bounds(c: Canvas) {
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (c.get(X, Y) === EMPTY) continue;
    x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
  }
  return { x0, y0, x1, y1 };
}

function crop(c: Canvas, x: number, y: number, w: number, h: number): Canvas {
  const out = new Canvas(w, h);
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) out.px[Y][X] = c.get(x + X, y + Y);
  return out;
}

// ---------- Billes est-ouest ----------

/**
 * Bille est-ouest à l'image k, construite comme `felledLog` (gros) ou `normalFelledLog` (normal) : écorce en travers,
 * bouts en ovale (face de coupe à gauche, écorce enroulée à droite), contour, ombre au sol sur deux rangées décalée vers
 * la droite ; puis découpée comme l'image fixe (largeur LOG_LEN + 3).
 */
function rollingLogEW(wood: Wood, ring: Ring, k: number): Canvas {
  const D = wood.diameter;
  const len = 17;
  const c = new Canvas(len + 4, D + 6);
  const shift = shiftAt(ring, k);
  for (let Y = 1; Y <= D; Y++) for (let X = 1; X <= len; X++) c.set(X, Y, rolledBark(X + 30, (Y - 1 + 0.5) / D, wood, ring, shift));
  const cy = 1 + D / 2;
  logEnd(c, 1, 'left', cy, true, D / 2, wood.endA);
  logEnd(c, len + 1, 'right', cy, false, D / 2, wood.endA);
  despeckle(c, 'KYTtN');
  shadedOutline(c);
  // ombre au sol : deux rangées pleines puis une plus courte pour le gros, une pleine et une courte pour le normal
  const bottom = D + 1;
  const full = wood === NORMAL_WOOD ? 1 : 2;
  for (let i = 1; i <= full; i++) for (let X = 2; X <= len + 1; X++) if (c.get(X, bottom + i) === EMPTY) c.set(X, bottom + i, 'x');
  for (let X = 4; X <= len; X++) if (c.get(X, bottom + full + 1) === EMPTY) c.set(X, bottom + full + 1, 'x');
  const b = bounds(c);
  return crop(c, b.x0, b.y0, len + 3, b.y1 - b.y0 + 1);
}

// ---------- Billes nord-sud ----------

/** Fente de la face de coupe : angle à l'image 0 (vers le haut à gauche, côté lumière), puis un quart de tour par image. */
const CRACK0 = (-3 * Math.PI) / 4;

/**
 * Bille nord-sud à l'image k, construite comme `logByTheEnd` + `felledLogNS` : dessus d'écorce du rond du fond à la face
 * de coupe, sillons dans le sens de la bille qui défilent vers la droite, face de coupe ovale avec sa fente tournante,
 * contour, ombre (le corps décalé d'un pixel à droite et de deux vers le bas).
 */
function rollingLogNS(
  dims: { w: number; h: number; cx: number; back: number; front: number; rx: number; ry: number },
  wood: Wood,
  ring: Ring,
  k: number,
  crack: { from: number; to: number },
): Canvas {
  const { w, h, cx, back, front, rx, ry } = dims;
  const shift = shiftAt(ring, k);
  const c = new Canvas(w, h);
  const inDisk = (X: number, Y: number, cy: number) => ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    const body = Math.abs(X + 0.5 - cx) <= rx && Y + 0.5 >= back && Y + 0.5 <= front;
    if (!body && !inDisk(X, Y, back)) continue;
    const s = (X + 0.5 - (cx - rx)) / (2 * rx);
    let q = rolledBark(Y * 1.2, s, wood, ring, shift);
    // bord du bout lointain : sans sillon (un sillon y laisserait un K seul quand il passe)
    if (Y + 0.5 < back && !inDisk(X, Y - 1.5, back)) q = barkTone(s) === 'K' ? 'K' : 'N';
    c.set(X, Y, q);
  }
  paintFace(c, cx, front, rx, ry, { all: true });
  // fente : du cœur jusqu'à l'écorce du bord (N, comme le cerne d'écorce qu'elle rejoint : jamais un pixel seul), la
  // même teinte dans les quatre positions pour qu'on la suive en tournant
  const th = CRACK0 + (k * Math.PI) / 2;
  for (let t = crack.from; t <= crack.to; t += 0.05) {
    const X = Math.floor(cx + t * rx * Math.cos(th));
    const Y = Math.floor(front + t * ry * Math.sin(th));
    if (((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - front) / ry) ** 2 <= 1) c.set(X, Y, 'N');
  }
  despeckle(c, 'KYTtN');
  shadedOutline(c);
  const solid = Canvas.from(c.toGrid());
  for (let Y = 0; Y < h; Y++) for (let X = 2; X < w; X++) {
    if (c.get(X, Y) !== EMPTY || solid.get(X - 1, Y - 2) === EMPTY) continue;
    if (Y < back + 2) continue;
    c.set(X, Y, 'x');
  }
  return c;
}

// ---------- Planches ----------

const FRAMES = [0, 1, 2, 3];

function sheet(name: string, frames: Canvas[]): SpriteSheetSource {
  return {
    kind: 'spritesheet',
    name,
    frameW: frames[0].w,
    frameH: frames[0].h,
    palette: world,
    animations: { roll: { frames: frames.map((f) => f.toGrid()), frameRate: 8, repeat: -1 } },
  };
}

const SHEETS: [string, Canvas[]][] = [
  ['big-felled-log', FRAMES.map((k) => rollingLogEW(BIG_WOOD, BIG_RING, k))],
  ['big-felled-log-ns', FRAMES.map((k) => rollingLogNS(BIG_NS, BIG_WOOD, BIG_RING, k, { from: 0.3, to: 0.95 }))],
  ['normal-felled-log', FRAMES.map((k) => rollingLogEW(NORMAL_WOOD, NORMAL_RING, k))],
  ['normal-felled-log-ns', FRAMES.map((k) => rollingLogNS(NORMAL_NS, NORMAL_WOOD, NORMAL_RING, k, { from: 0.3, to: 0.95 }))],
];

// Garde-fou : chaque image a le canevas et la silhouette exacts (ombre comprise) de l'image fixe de sa bille.
{
  const fixed = new Map<string, string[]>();
  for (const s of [...bigFelled, ...normalLogs]) if (s.kind === 'image') fixed.set(s.name, s.grid);
  for (const [name, frames] of SHEETS) {
    const ref = fixed.get(name);
    if (!ref) throw new Error(`roll : pas d'image fixe ${name}`);
    frames.forEach((f, k) => {
      const g = f.toGrid();
      if (g.length !== ref.length || g[0].length !== ref[0].length) {
        throw new Error(`roll : ${name}-roll image ${k} fait ${g[0].length} × ${g.length}, l'image fixe ${ref[0].length} × ${ref.length}`);
      }
      const kind = (q: string) => (q === EMPTY ? 0 : q === 'x' ? 1 : 2);
      g.forEach((row, Y) => [...row].forEach((q, X) => {
        if (kind(q) !== kind(ref[Y][X])) throw new Error(`roll : ${name}-roll image ${k} : silhouette différente en (${X}, ${Y})`);
      }));
    });
  }
}

export default SHEETS.map(([name, frames]) => sheet(`${name}-roll`, frames));
