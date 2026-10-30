// Arbre normal debout (`normal-tree`) et sa souche (`normal-tree-stump`).
// Même méthode que le gros (art/world/big-tree.ts) : tronc en écorce commune (art/world/wood.ts, NORMAL_WOOD : 6 px,
// deux couloirs de sillons), feuillage en masses festonnées découpées en grappes ombrées (rampe k l L j), lumière en
// haut à gauche. Mais un autre arbre : élancé, 7 m pour 1,90 m de houppier, tronc nu sur 3 m, droit et vertical (c'est
// l'arbre de la charpente : aucune courbe, aucun coude), sept masses empilées en quinconce en une silhouette étroite et
// haute, centrée sur le tronc ; une seule branche sort du flanc droit vers la masse du bas.
// Géométrie partagée avec la chute et l'arbre couché : art/world/normal-geometry.ts (FOOT, TRUNK_X0, CROWN_*, TRUNK_ROW,
// STUMP_*). Le pied (FOOT) est la rangée du contour sous le tronc ; l'écorce s'arrête la rangée au-dessus.
//
// Gabarit (dims de props.json : 190 × 190 × 700 cm, boîte) : 38 × 159 px, contour compris, du haut du houppier
// (rangée 3) au pied (rangée 161). Souche : le pied évasé coupé à 40 cm, racines comprises, boîte de 60 × 55 × 40 cm :
// 12 × 13,5 px (dessinée 12 × 14).

import { Canvas, rng, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { shadedOutline, despeckle, groundShadow, slantedCut, type Vec } from './big-tree';
import { bark, NORMAL_WOOD } from './wood';
import { CROWN_BOTTOM, FOOT, STUMP_FOOT, STUMP_SIZE, TREE_H, TREE_W, TRUNK_X0 } from './normal-geometry';

const [FX, FY] = FOOT;
/** Dernière colonne d'écorce du tronc nu (6 colonnes à partir de TRUNK_X0). */
const TRUNK_X1 = TRUNK_X0 + NORMAL_WOOD.diameter - 1;
/** Le tronc monte jusque sous la dernière masse du houppier (plus haut, il percerait entre les masses en points isolés). */
const TRUNK_TOP = 88;

/**
 * Pied du tronc : pour les rangées du bas (0 = la dernière rangée d'écorce, au-dessus du pied), l'écart des bords
 * gauche et droit à ceux du tronc (TRUNK_X0, TRUNK_X1). Évasé, une racine courte de chaque côté, plus longue à droite.
 * Partagé par l'arbre et la souche, pour que la souche soit le pied de l'arbre.
 */
const FLARE: [number, number][] = [
  [-2, 2], // racines
  [-1, 2],
  [-1, 1],
  [0, 1],
  [0, 1],
];

/** Bords [gauche, droite] de l'écorce à la rangée `y` du repère de l'arbre (null : pas de tronc). */
function trunkSpan(y: number): [number, number] | null {
  if (y < TRUNK_TOP || y > FY - 1) return null;
  const k = FY - 1 - y;
  const [dl, dr] = FLARE[k] ?? [0, 0];
  return [TRUNK_X0 + dl, TRUNK_X1 + dr];
}

/**
 * Écorce par rangées : `span(y)` donne les bords de la rangée ; `s` va de 0 (bord gauche, éclairé) à 1, la rampe
 * s'étire avec l'évasement ; `along` = rangée + `from` (la souche reprend les rangées de l'arbre, mêmes sillons).
 */
function barkRows(c: Canvas, span: (y: number) => [number, number] | null, from = 0) {
  for (let y = 0; y < c.h; y++) {
    const sp = span(y);
    if (!sp) continue;
    const [x0, x1] = sp;
    const w = x1 - x0 + 1;
    for (let x = x0; x <= x1; x++) c.set(x, y, bark(y + from, (x + 0.5 - x0) / w, NORMAL_WOOD));
  }
}

/**
 * Bouche les trous fermés (vides qu'on n'atteint pas depuis le bord de l'image) : un creux entre deux masses.
 * Seulement au-dessus de la rangée `below`.
 */
function fillHoles(c: Canvas, col: string, below = c.h) {
  const out = new Set<number>();
  const stack: Vec[] = [];
  for (let x = 0; x < c.w; x++) stack.push([x, 0], [x, c.h - 1]);
  for (let y = 0; y < c.h; y++) stack.push([0, y], [c.w - 1, y]);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= c.w || y >= c.h || c.get(x, y) !== EMPTY || out.has(y * c.w + x)) continue;
    out.add(y * c.w + x);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  for (let y = 0; y < below; y++) for (let x = 0; x < c.w; x++) if (c.get(x, y) === EMPTY && !out.has(y * c.w + x)) c.set(x, y, col);
}

interface Mass { cx: number; cy: number; rx: number; ry: number; seed: number; dim: number }

// Sept masses, de la plus haute (la plus lointaine) à la plus basse (la plus proche), en quinconce : la silhouette
// s'élargit un peu vers le bas, la cime est un peu à droite (le houppier reste asymétrique ; le tronc, lui, est droit).
// Graines propres à l'arbre normal.
const MASSES: Mass[] = [
  { cx: 27, cy: 14, rx: 8, ry: 10, seed: 41, dim: 0 },
  { cx: 21, cy: 27, rx: 10, ry: 10, seed: 42, dim: 0 },
  { cx: 32, cy: 38, rx: 10, ry: 11, seed: 43, dim: 0.03 },
  { cx: 15, cy: 48, rx: 9, ry: 10, seed: 44, dim: 0.05 },
  { cx: 26, cy: 61, rx: 14, ry: 13, seed: 45, dim: 0.06 },
  { cx: 18, cy: 81, rx: 11, ry: 10, seed: 46, dim: 0.1 },
  { cx: 29, cy: 87, rx: 11, ry: 10, seed: 47, dim: 0.15 },
];

/** Centre et demi-axes du houppier entier : l'éclairage d'ensemble. */
const CROWN_C: Vec = [24, 52];
const CROWN_R: Vec = [18, 30];

/** Silhouette festonnée d'une masse de feuillage (dans le repère de l'arbre). */
function massShape(m: Mass): Canvas {
  const s = new Canvas(TREE_W, TREE_H);
  const r = rng(m.seed);
  s.ellipse(m.cx, m.cy, m.rx * 0.84, m.ry * 0.84, 'l');
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = ((i + r() * 0.5) / n) * Math.PI * 2;
    const b = Math.min(m.rx, m.ry) * (0.28 + r() * 0.1);
    s.ellipse(m.cx + Math.cos(a) * m.rx * 0.76, m.cy + Math.sin(a) * m.ry * 0.76, b, b * 0.85, 'l');
  }
  return s;
}

/**
 * L'arbre dans son repère (TREE_W × TREE_H), sans contour ni ombre.
 * `light` : direction de la lumière dans ce repère (vers la source), pour garder le nord-ouest après rotation.
 */
export function treeBody(light: Vec = [-Math.SQRT1_2, -Math.SQRT1_2]): Canvas {
  const c = new Canvas(TREE_W, TREE_H);
  const [lx, ly] = light;

  // Branche : du flanc droit du tronc vers la masse du bas, dessus éclairé (m), dessous dans l'ombre (N).
  c.polygon([[26.5, 110], [33, 96], [35, 96.5], [28, 113]], 'm');
  c.within('m', (c) => c.polygon([[29.5, 105], [35, 96.5], [28, 113], [27.5, 110]], 'N'));
  barkRows(c, trunkSpan);

  // Feuillage : chaque masse découpée en grappes (cellules de Voronoï), ombrées selon la lumière.
  for (const m of MASSES) {
    const shape = massShape(m);
    const r = rng(m.seed * 31);
    const sites: Vec[] = [];
    for (let gy = m.cy - m.ry - 3; gy <= m.cy + m.ry + 3; gy += 5) {
      for (let gx = m.cx - m.rx - 3; gx <= m.cx + m.rx + 3; gx += 5.5) {
        sites.push([gx + (r() - 0.5) * 3, gy + (r() - 0.5) * 2.5]);
      }
    }
    const ramp = ['k', 'l', 'L', 'j'];
    for (let y = 0; y < TREE_H; y++) for (let x = 0; x < TREE_W; x++) {
      if (shape.get(x, y) === EMPTY) continue;
      const px = x + 0.5;
      const py = y + 0.5;
      let best = sites[0];
      let bd = Infinity;
      for (const s of sites) {
        const d = (s[0] - px) ** 2 + (s[1] - py) ** 2;
        if (d < bd) { bd = d; best = s; }
      }
      // valeur de la grappe : sa place dans la masse et, pour moitié, dans le houppier entier (un seul volume)
      const vm = ((best[0] - m.cx) / m.rx) * lx + ((best[1] - m.cy) / m.ry) * ly;
      const vc = ((best[0] - CROWN_C[0]) / CROWN_R[0]) * lx + ((best[1] - CROWN_C[1]) / CROWN_R[1]) * ly;
      const v = 0.6 * vm + 0.35 * vc - m.dim;
      let i = v > 0.38 ? 3 : v > 0.05 ? 2 : v > -0.45 ? 1 : 0;
      const local = (px - best[0]) * lx + (py - best[1]) * ly;
      if (local < -1.5 && i > 0) i--;
      c.set(x, y, ramp[i]);
    }
  }

  // Creux fermés : dans le houppier, du feuillage sombre (l'arbre couché de normal-felled.ts reprend ces rangées : ne
  // pas les changer) ; dessous, le creux entre le tronc et la branche prend le trait du contour (le V de la fourche),
  // pas du feuillage qui collait au tronc un coin sombre.
  fillHoles(c, 'k', CROWN_BOTTOM + 1);
  fillHoles(c, 'o');

  // Ombre du feuillage sur le haut du tronc nu.
  c.within('Mm', (c) => c.polygon([[20, CROWN_BOTTOM - 6], [29, CROWN_BOTTOM - 4], [29, CROWN_BOTTOM + 6], [25, CROWN_BOTTOM + 5], [20, CROWN_BOTTOM + 2]], 'N'));
  c.within('N', (c) => c.polygon([[25, CROWN_BOTTOM - 4], [29, CROWN_BOTTOM - 4], [29, CROWN_BOTTOM + 3], [25, CROWN_BOTTOM + 2]], 'K'));

  return despeckleEdges(despeckle(c, 'K'), 'K');
}

/**
 * Comme `despeckle`, mais aussi au bord de la silhouette (que `despeckle` laisse) : un pixel sans voisin de sa couleur
 * prend la couleur majoritaire de ses voisins peints. Sans cela, le contour posé ensuite enfermerait ces points.
 */
function despeckleEdges(c: Canvas, keep = ''): Canvas {
  const fix: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const p = c.get(x, y);
    if (p === EMPTY || keep.includes(p)) continue;
    const ns = [c.get(x + 1, y), c.get(x - 1, y), c.get(x, y + 1), c.get(x, y - 1)].filter((n) => n !== EMPTY);
    if (!ns.length || ns.includes(p)) continue;
    const count: Record<string, number> = {};
    for (const n of ns) count[n] = (count[n] ?? 0) + 1;
    fix.push([x, y, Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]]);
  }
  for (const [x, y, col] of fix) c.px[y][x] = col;
  return c;
}

/** L'arbre debout, TREE_W × TREE_H : image `normal-tree`. */
export function standingTree(): Canvas {
  const c = shadedOutline(treeBody());
  groundShadow(c, FX + 2, FY + 0.5, 9, 2.4);
  return c;
}

// ---------- Souche ----------

/** Décalage du repère de l'arbre à celui de la souche (pied sur pied). */
const SDX = FX - STUMP_FOOT[0];
const SDY = FY - STUMP_FOOT[1];
/**
 * Coupe en biais, comme celle du gros (`slantedCut` de big-tree.ts) : ovale de 6 colonnes (l'écorce du tronc) sur 5
 * rangées, plus bas à gauche (trait d'abattage, côté lumière), plus haut à droite (charnière), centré à la rangée
 * CUT_CY ; trop petit pour des cernes.
 */
const CUT_CY = 9.3;
const CUT_RY = 2.4;
const CUT_SLOPE = 0.15;

/** Souche sans contour ni ombre, STUMP_SIZE, pied en STUMP_FOOT : le pied de l'arbre, coupé à 40 cm. */
export function stumpBody(): Canvas {
  const c = new Canvas(STUMP_SIZE[0], STUMP_SIZE[1]);
  barkRows(c, (y) => {
    if (y < CUT_CY - CUT_RY - 1) return null;
    const sp = trunkSpan(y + SDY);
    return sp && [sp[0] - SDX, sp[1] - SDX];
  }, SDY);
  const cx = TRUNK_X0 - SDX + NORMAL_WOOD.diameter / 2;
  return slantedCut(c, cx, CUT_CY, NORMAL_WOOD.diameter / 2 + 0.1, CUT_RY, CUT_SLOPE, false);
}

/** La souche, avec contour et ombre : image `normal-tree-stump`. */
export function stump(): Canvas {
  const c = shadedOutline(stumpBody());
  groundShadow(c, STUMP_FOOT[0] + 1.5, STUMP_FOOT[1] + 0.5, 6.5, 1.8);
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('normal-tree', standingTree()), img('normal-tree-stump', stump())];
