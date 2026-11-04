// Les trois couvertures de la forge (chantier « forge », CADRAGE-forge.md section 0), pièces du jeu : bardeaux de chêne fendu (choisis
// par Grégoire pour l'atelier et l'abri à charbon), tuiles plates de terre cuite, lauzes de calcaire ; d'autres maisons du village
// prendront les deux autres. Matières de l'essai validé (art/proposals/forge-toits.ts), à l'identique, peintes de la palette du jeu.
//
// Chaque pan est un modèle en volumes (art/lib/volumes.ts) rendu dans ses quatre vues par `renderPiece`, pièce `ground` et `roof`
// (STYLE.md section 8 : projection (x, y − z), gabarit W × (H + D)), comme le grand pan de planches de la grange (`plank-roof-large`,
// art/world/barn.ts) dont ils reprennent l'emprise : 9,60 m le long du faîte, 3,40 m de projection, posés sur les sablières à 3,42 m.
// Le modèle est le pan sud (r0) : l'égout au sud (y = D), le faîte au nord (y = 0), en haut de sa boîte. Pentes réalistes (connaissance
// générale, non sourcée) : bardeaux et tuiles plates à 45° (montée de 3,40 m : faîte à 6,82 m), lauzes à 55° (4,86 m : faîte à
// 8,28 m). Sur la tranche de l'égout, l'épaisseur de la couverture (7,5 cm, 12,5 pour les lauzes) ; au faîte, la moitié du faîtage de
// la couverture (tuiles canal scellées à la chaux, bardeaux croisés, lauzes à cheval) : les deux pans dos à dos font le faîtage
// entier. Dessous, la face qu'on ne voit que du nord sous un pan de 55° (r2) : les lattes.
//
// Les matières se dessinent rang par rang depuis l'égout, à la distance le long du pan comptée à l'écran (`K` : px d'écran par px de
// pente, selon la vue), pour que le pureau garde sa taille à l'écran :
// - tuiles plates : rangs de 3 px, tuiles de 5 px à joints croisés, quelques-unes plus cuites, un peu de mousse ; la rampe `terracotta` ;
// - bardeaux : rangs de 4 px, écailles de 2 à 4 px décalées, le bout au jour, l'ombre sur le rang du dessous ; le bois travaillé
//   (`woodAges`, dessiné neuf : le build tire le patiné et le vieux, gris, celui de l'atelier) ;
// - lauzes : dalles irrégulières, rangs de 6 px à l'égout à 3 au faîte, bords inégaux, lichens ; la rampe du calcaire (! + = ; ~).
//
// Le pan percé (`<couverture>-roof-large-pierced`) : le pan nord de l'atelier, posé en r2, emprise x −40…920, y −40…300 (cm, repère de
// l'atelier : x = 0, y = 0 au coin nord-ouest de l'emprise du poteau nord-ouest), percé au droit du conduit de la forge (`chimney-flue`,
// x 180–280, y 40–120), bordé d'un solin de mortier de chaux, comme le chaume percé de la maison de Xéros (art/world/xeros-house.ts).
// Tout ce que la souche cache dans la vue est vide, pour que la souche posée derrière se voie au-dessus du pan. La place du trou :
// `HOLE` et `PIERCED_PAN_AT` ci-dessous.
//
// Le pan d'appentis (`shingle-shed-roof`, l'abri à charbon) : 3,80 × 3,20 m, une pente vers le sud de 35°, sans faîtage : la
// haute rive au nord montre la tranche des bardeaux. Les pignons en bardage (`board-gable-tall` à 45°, `board-gable-steep` à 55°) : le dessin de
// `board-gable` (art/lib/board-wall.ts), coupé à la pente de leur pan.

import { Canvas, type Grid, type Palette } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { stonePalette } from '../items/stones';
import { terracotta, world } from '../palette';
import { boardsInside, boardsOutside, edgeView, type Edge, type Panel } from '../lib/board-wall';
import { box, hash, part, polyPrism, renderPiece, rotP, rotQuads, rotRect, unit, type Quad, type Rot, type Tex, type V3 } from '../lib/volumes';

const PAL: Palette = { ...stonePalette, ...terracotta };

/** Les vues du jeu (r0 à r3) dans les rotations du modèle. */
const VIEW_ROT: Rot[] = [0, 3, 2, 1];
const suffix = (v: number) => (v ? `-r${v}` : '');

export type Cover = 'tiles' | 'shingles' | 'slates';

// =====================================================================================================================
// Les mesures
// =====================================================================================================================

/** Un pan : `w` le long de l'égout, `d` la profondeur au sol de l'égout au faîte, `h` la montée (cm, la boîte de props.json). */
interface PanDims { w: number; d: number; h: number }
export const LARGE_45: PanDims = { w: 960, d: 340, h: 340 };
export const LARGE_55: PanDims = { w: 960, d: 340, h: 486 };
export const SHED: PanDims = { w: 380, d: 320, h: 232 };

/**
 * Le trou du pan percé, dans le repère de l'atelier (cm) : le conduit de la forge (`chimney-flue`, 100 × 80) ; le pan nord posé en r2,
 * le coin nord-ouest de son emprise en `PIERCED_PAN_AT`. À déplacer ici si le montage pose le conduit ou le pan ailleurs.
 */
export const HOLE = { x0: 180, x1: 280, y0: 40, y1: 120 };
export const PIERCED_PAN_AT = { x: -40, y: -40 };
/** La souche au-dessus du faîte (cm) : le haut du conduit, puis le couronnement (`chimney-cap`, 140 × 100 × 10) qui déborde. */
export const STACK_ABOVE_RIDGE = 100;
const CAP_OVER = { x: 20, y: 10, h: 10 };

/** L'épaisseur de la couverture vue à l'égout (px). */
const EAVE_H: Record<Cover, number> = { tiles: 1.5, shingles: 1.5, slates: 2.5 };
/** Le contour côté lumière de la couverture. */
const DARK: Record<Cover, string> = { tiles: '?', shingles: '@', slates: '~' };

// =====================================================================================================================
// Les matières (des signes de la palette)
// =====================================================================================================================

function tilesTex(K: number): Tex {
  return (s, t) => {
    const d = t * K, r = Math.floor(d / 3), yy = d - r * 3;
    const off = (r % 2) * 3, col = Math.floor((s + off) / 5), xx = Math.floor(s + off) - col * 5;
    const h = hash(401, r, col);
    // le haut du rang : l'ombre portée par le bas des tuiles du rang au-dessus (le trait qui fait lire le toit)
    if (yy >= 2) return h < 0.12 ? '?' : '\\';
    // le bas de la tuile : le petit vide entre deux tuiles voisines, le coin arrondi
    if (yy < 1 && xx === 0) return '?';
    if (yy < 1 && xx === 4) return '`';
    if (h < 0.12) return '`'; // une tuile plus cuite
    if (h < 0.16) return hash(403, Math.floor(s), r) < 0.5 ? 'l' : '`'; // mousse
    if (h < 0.34) return yy < 1 ? '"' : "'";
    return yy >= 1 && xx === 1 && hash(404, r, col) < 0.5 ? "'" : '"';
  };
}

function shinglesTex(K: number): Tex {
  const edges = (r: number): number[] => {
    const out: number[] = [];
    let a = -Math.floor(hash(411, r) * 4);
    while (a < 260) { out.push(a); a += 2 + Math.floor(hash(412, r, a) * 3); }
    return out;
  };
  const cache = new Map<number, number[]>();
  return (s, t) => {
    const d = t * K, r = Math.floor(d / 4), yy = d - r * 4, i = Math.floor(s);
    if (!cache.has(r)) cache.set(r, edges(r));
    const es = cache.get(r)!, k = es.filter((a) => a <= i).length;
    const h = hash(413, r, k);
    if (yy >= 3) return '&';
    if (es.includes(i)) return yy < 1 ? '&' : '%';
    if (yy < 1) return h < 0.25 ? '*' : '^'; // le bout du bardeau, au jour
    if (hash(414, i, r) < 0.25) return '%'; // le fil
    return h < 0.2 ? '%' : '*';
  };
}

/** Les rangs des lauzes : du pureau de 6 px à l'égout à 3 px au faîte (à l'écran). */
const SLATE_ROWS: number[] = (() => {
  const out = [0];
  while (out[out.length - 1] < 400) {
    const d = out[out.length - 1];
    out.push(d + Math.max(3, Math.round(6 - (d / 120) * 3)));
  }
  return out;
})();
function slatesTex(K: number): Tex {
  return (s, t) => {
    const d = t * K, i = Math.floor(s);
    let r = SLATE_ROWS.findIndex((a, n) => d >= a && d < SLATE_ROWS[n + 1]);
    if (r < 0) r = SLATE_ROWS.length - 2;
    const rh = SLATE_ROWS[r + 1] - SLATE_ROWS[r];
    let a = -Math.floor(hash(421, r) * 8), k = 0;
    while (a + 5 + Math.floor(hash(422, r, k) * 6) <= i) { a += 5 + Math.floor(hash(422, r, k) * 6); k++; }
    const ragged = hash(423, r, k, Math.floor(i / 2)) < 0.3 ? 1 : 0;
    const yy = d - SLATE_ROWS[r] - ragged;
    const h = hash(424, r, k);
    if (yy >= rh - 1) return '~'; // l'ombre portée du rang du dessus
    if (i === a) return ';';
    if (yy < 0.9) return '!'; // la tranche de la dalle, au jour
    if (h < 0.08 && hash(425, i, Math.floor(d)) < 0.5) return hash(426, i) < 0.5 ? 'y' : 'G'; // lichen
    if (h < 0.3) return yy > rh - 2 ? '=' : '+';
    if (h < 0.42) return ';';
    return yy > rh - 2 && hash(427, i, r) < 0.5 ? ';' : '=';
  };
}

const PAN_TEX: Record<Cover, (K: number) => Tex> = { tiles: tilesTex, shingles: shinglesTex, slates: slatesTex };

/** La tranche de l'égout et des rives : le bout des tuiles, des bardeaux, des lauzes. */
function edgeTex(cover: Cover): Tex {
  return (s, t) => {
    const i = Math.floor(s);
    if (cover === 'tiles') return i % 5 === 4 ? '?' : '\\';
    if (cover === 'shingles') return hash(431, i) < 0.3 ? '@' : '&';
    return t < 1 ? '=' : hash(432, i >> 1) < 0.3 ? '~' : ';';
  };
}

/** Le dessous du pan : les lattes en travers, la couverture entre elles, dans l'ombre. */
function underTex(cover: Cover): Tex {
  const [lath, back] = cover === 'tiles' ? ['%', '?'] : cover === 'shingles' ? ['%', '@'] : ['%', '~'];
  return (_s, t) => (Math.floor(t) % 4 === 0 ? lath : back);
}

// =====================================================================================================================
// Le faîtage (la moitié de son pan)
// =====================================================================================================================

/** La hauteur de la moitié de faîtage au-dessus du pan (px) : la pente s'arrête dessous, au faîte, à H − CAP_H. */
const CAP_H: Record<Cover, number> = { tiles: 3.2, shingles: 2.2, slates: 2.5 };

function ridgeQuads(cover: Cover, W: number, H: number, zs: (y: number) => number): Quad[] {
  const P = part('faîtage', 9, DARK[cover], 'full', { roof: true });
  if (cover === 'tiles') {
    // la tuile canal : un quart de rond de 16 cm de rayon, des tuiles de 40 cm (8 px) scellées à la chaux
    const r = CAP_H.tiles, sec: [number, number][] = [];
    for (let k = 0; k <= 4; k++) { const a = Math.PI / 2 - (k / 4) * (Math.PI / 2); sec.push([r * Math.cos(a), H - r + r * Math.sin(a)]); }
    sec.push([r, zs(r)], [0, zs(0)]);
    const tex: Tex = (s, _t, c) => {
      const j = Math.floor(s) % 8;
      if (j === 0) return '!'; // le joint de chaux, bien blanc
      if (j === 7) return '?';
      return c.n[2] > 0.85 ? "'" : c.n[2] > 0.4 ? '"' : '`';
    };
    return polyPrism(0, W, sec, P, tex);
  }
  if (cover === 'shingles') {
    // les bardeaux croisés : le rang du faîte, en chevrons
    const sec: [number, number][] = [[0, H], [3, H - 2.8], [3, zs(3)], [0, zs(0)]];
    const tex: Tex = (s, t) => {
      const i = Math.floor(s);
      if (i % 4 === 0) return '&';
      return Math.floor(t) === 0 ? '%' : '*';
    };
    return polyPrism(0, W, sec, P, tex);
  }
  // les lauzes de faîtage : de grosses dalles posées à cheval, irrégulières
  const tex: Tex = (s, t, c) => {
    const i = Math.floor(s);
    let a = 0, k = 0;
    while (a + 7 + Math.floor(hash(431, k) * 5) <= i) { a += 7 + Math.floor(hash(431, k) * 5); k++; }
    if (i === a) return '~';
    if (c.face === 'top') return hash(432, k) < 0.3 ? '=' : '+';
    return Math.floor(t) >= 2 ? '!' : ';';
  };
  return box(0, W, 0, 3, zs(3) - 0.5, H, P, tex).filter((q) => q.face !== 'N');
}

// =====================================================================================================================
// Le pan
// =====================================================================================================================

interface Stack { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }

/** Le trou dans le repère du modèle (r0, px) : le pan nord posé en r2 a tourné d'un demi-tour. */
export function holeInPan(dims: PanDims): { flue: Stack; cap: Stack } {
  const W = dims.w / 5, D = dims.d / 5, H = dims.h / 5;
  const px = (cm: number) => cm / 5;
  const toPan = (x: number, y: number): [number, number] => [W - (px(x) - px(PIERCED_PAN_AT.x)), D - (px(y) - px(PIERCED_PAN_AT.y))];
  const [a, b] = toPan(HOLE.x1, HOLE.y1), [c, d] = toPan(HOLE.x0, HOLE.y0);
  const top = H + px(STACK_ABOVE_RIDGE);
  return {
    flue: { x0: a, x1: c, y0: b, y1: d, z0: -200, z1: top },
    cap: { x0: a - px(CAP_OVER.x), x1: c + px(CAP_OVER.x), y0: b - px(CAP_OVER.y), y1: d + px(CAP_OVER.y), z0: top, z1: top + px(CAP_OVER.h) },
  };
}

/**
 * Un pan dans une couverture, dans la vue v (la vue choisit le rapport écran / pente des rangs) : la pente, l'égout, les rives, le
 * dessous, la moitié du faîtage (`ridge` : non pour l'appentis, dont la haute rive prend un rang de bardeaux croisés quand même).
 */
function panModel(cover: Cover, dims: PanDims, v: number, pierced: boolean, ridge = true): Quad[] {
  const W = dims.w / 5, D = dims.d / 5, H = dims.h / 5, Eh = EAVE_H[cover], capH = ridge ? CAP_H[cover] : 0;
  const Hs = H - capH;
  const zs = (y: number) => Eh + ((D - y) * (Hs - Eh)) / D; // le dessus du pan à la profondeur y
  const L = Math.hypot(D, Hs - Eh);
  const K = v % 2 ? 1 : (D + Hs - Eh) / L;
  const P = part('pan', 8, DARK[cover], 'full', { roof: true });
  const nrm = unit([0, Hs - Eh, D]);
  const slopeV: V3 = [0, -D, Hs - Eh];
  const Q: Quad[] = [
    { o: [0, D, Eh], u: [W, 0, 0], v: slopeV, n: nrm, part: P, tex: PAN_TEX[cover](K), face: 'slope' },
    { o: [0, D, 0], u: [W, 0, 0], v: [0, 0, Eh], n: [0, 1, 0], part: P, tex: edgeTex(cover), face: 'S' },
    { o: [0, D, 0], u: [W, 0, 0], v: slopeV, n: [0, -nrm[1], -nrm[2]], part: P, tex: underTex(cover), face: 'under' },
    { o: [0, D, 0], u: slopeV, v: [0, 0, Eh], n: [-1, 0, 0], part: P, tex: edgeTex(cover), face: 'W' },
    { o: [W, D, 0], u: slopeV, v: [0, 0, Eh], n: [1, 0, 0], part: P, tex: edgeTex(cover), face: 'E' },
    ...(ridge ? ridgeQuads(cover, W, H, zs) : [{ o: [W, 0, Hs - Eh], u: [-W, 0, 0], v: [0, 0, Eh], n: [0, -1, 0], part: P, tex: edgeTex(cover), face: 'N' } as Quad]),
  ];
  if (!pierced) return Q;
  // le pan percé : tout ce que la souche cache, dans la vue, est vide ; le solin de mortier autour du conduit
  const r = VIEW_ROT[v];
  const { flue, cap } = holeInPan(dims);
  const boxes = [flue, cap].map((b) => {
    const [x0, x1, y0, y1] = rotRect([b.x0, b.x1, b.y0, b.y1], r, [0, 0]);
    return { x0, x1, y0, y1, z0: b.z0, z1: b.z1 };
  });
  const E = 0.4;
  const hidden = (p: V3) => boxes.some((b) => {
    if (p[0] <= b.x0 - E || p[0] >= b.x1 + E) return false;
    const y = Math.max(b.y0 - E, p[1]);
    return y <= b.y1 + E && y - p[1] + p[2] <= b.z1 && b.y1 + E - p[1] + p[2] >= b.z0;
  });
  const back = ((4 - r) % 4) as Rot;
  return Q.map((q) => ({
    ...q,
    tex: (s: number, t: number, c: Parameters<Tex>[2]) => {
      if (hidden(c.p)) return null;
      const k = q.tex(s, t, c);
      if (k === null || q.face !== 'slope' || q.part.name !== 'pan') return k;
      const [x, y] = rotP(c.p, back, [0, 0]);
      if (x > flue.x0 - 2.1 && x < flue.x1 + 2.1 && y > flue.y0 - 2.1 && y < flue.y1 + 2.1) return x < flue.x0 + 0.5 || y < flue.y0 ? 'd' : 'D';
      return k;
    },
  }));
}

/** Un pan dans la vue v (`ridge` : sa moitié de faîtage ; l'appentis n'en a pas, sa haute rive montre la tranche des bardeaux). */
export function panImage(cover: Cover, dims: PanDims, v: number, pierced = false, ridge = true): Grid {
  return renderPiece(rotQuads(panModel(cover, dims, v, pierced, ridge), VIEW_ROT[v], [0, 0]), { k: 1 });
}

function panViews(name: string, cover: Cover, dims: PanDims, pierced = false, ridge = true): ImageSource[] {
  return [0, 1, 2, 3].map((v) => ({ kind: 'image', name: `${name}${suffix(v)}`, palette: PAL, grid: panImage(cover, dims, v, pierced, ridge) }));
}
export const ROOF_PAL = PAL;

// =====================================================================================================================
// Les pignons en bardage, coupés à la pente de leur pan
// =====================================================================================================================

/** Un pignon de 5,20 m (104 px) : `h` rangées, ses deux petits côtés de `end` rangées aux bouts, puis les rampants jusqu'au sommet. */
function gable(h: number, end: number, rails: [number, number][], seed: number): { out: Canvas; inside: Canvas; edge: Edge } {
  const W = 104, peak = h - 1;
  const top = (x: number) => h - 1 - Math.round(end + (peak - end) * (1 - Math.abs(x + 0.5 - W / 2) / (W / 2)));
  const panel: Panel = { w: W, h, inside: (x, y) => x >= 0 && x < W && y < h && y >= top(x), rails, wet: 0, seed };
  const edge: Edge = { rows: h + 52, depth: 52, outer: [1, h + 52 - 2], inner: rails.map(([a, b]) => [a + 52, b + 52]), shadow: false };
  return { out: boardsOutside(panel), inside: boardsInside(panel), edge };
}

function gableViews(name: string, g: ReturnType<typeof gable>): ImageSource[] {
  const img = (n: string, c: Canvas): ImageSource => ({ kind: 'image', name: n, palette: world, grid: c.toGrid() });
  return [img(name, g.out), img(`${name}-r1`, edgeView(g.edge, true)), img(`${name}-r2`, g.inside), img(`${name}-r3`, edgeView(g.edge, false))];
}

/** 45° : 3 m (60 rangées), les bouts de 35 cm, les rampants montent de 2,60 m sur 2,60 m ; le faîtage pose sur son sommet. */
const TALL = gable(60, 7, [[28, 30], [46, 48]], 27);
/** 55° : 4,40 m (90 rangées, dessus de la boîte et sommet arrondi au pixel compris), les bouts de 75 cm, les rampants montent de 3,70 m sur 2,60 m ; le faîtage pose sur son sommet. */
const STEEP = gable(90, 15, [[46, 48], [70, 72]], 29);

// =====================================================================================================================
// Les images
// =====================================================================================================================

const sources: ImageSource[] = [
  ...panViews('shingle-roof-large', 'shingles', LARGE_45),
  ...panViews('shingle-roof-large-pierced', 'shingles', LARGE_45, true),
  ...panViews('tile-roof-large', 'tiles', LARGE_45),
  ...panViews('tile-roof-large-pierced', 'tiles', LARGE_45, true),
  ...panViews('lauze-roof-large', 'slates', LARGE_55),
  ...panViews('lauze-roof-large-pierced', 'slates', LARGE_55, true),
  ...panViews('shingle-shed-roof', 'shingles', SHED, false, false),
  ...gableViews('board-gable-tall', TALL),
  ...gableViews('board-gable-steep', STEEP),
];

export default sources;
