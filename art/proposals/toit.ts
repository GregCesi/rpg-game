// Maquette de la chaumière : PROPOSITIONS d'éléments composés du toit et de la cheminée (couple de chevrons, pan de toit en
// chaume, faîtage de terre, pan de pignon, cheminée). Pas déclaré dans art/index.ts : le jeu ne le charge pas ; seul l'aperçu
// des propositions le lit (tools/preview-proposals.ts).
//
// Contrat : art/proposals/chaumiere-geometry.ts (repère de la maison en cm, projection (x, y − z) à 5 cm/px, boîtes `BOXES`,
// taille d'image `imageSize`, point `pixel`, vues r0..r3). Chaque image fait exactement la taille de sa boîte.
//
// Méthode :
// - le pan de toit et la cheminée sont des solides à faces planes, en cm dans la boîte de l'élément ; chaque pixel prend la
//   face la plus proche (y + z le plus grand) au centre du pixel, et sa matière se peint d'après le point touché et la normale
//   de la face (lumière en haut à gauche). Les faces tournées vers l'est ou l'ouest ne se voient pas dans cette projection ;
// - le couple, le pignon et le faîtage sont dessinés directement (bandes de perche, triangle de torchis) ;
// - toute pièce de bois droite est la pièce de bois du jeu (`composeWood`) : l'entrait (perche couchée de 2,40 m), le poinçon
//   (poutre debout de 3,60 m), les potelets (2,40 m), la poutre de manteau (2 m). Les perches en pente (chevrons), que la pièce
//   de bois ne sait pas dessiner, reprennent ses couleurs (écorce S A B, contour K et OUTLINE) ;
// - contour d'un pixel pris dans la silhouette : OUTLINE en bas et à droite, la teinte la plus sombre de la matière en haut et
//   à gauche ; pas d'ombre portée (le compositeur la gère).
// Palette `world` seulement : chaume Y t T P, pierre R r z Z, torchis d D E, terre U u n e, bois M m N K, bois grisé S A B Q,
// feuillage j L l k, contour o.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import { composeWood } from '../world/wood-pieces';
import type { WoodPiece } from '../../src/content/types';
import { BOXES, imageSize, pixel, type ProposedElement, type View, type ViewBox } from './chaumiere-geometry';

// =====================================================================================================================
// Outils
// =====================================================================================================================

type V3 = [number, number, number];

/** Hachage déterministe de quelques entiers vers [0, 1[ : la « graine fixe » des variations. */
function H(...n: number[]): number {
  let h = 0x811c9dc5;
  for (const v of n) {
    h ^= Math.floor(v) + 0x9e3779b9;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
  }
  return (h >>> 0) / 4294967296;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** La matière d'un pixel, pour son contour côté lumière. */
type Mat = 'stone' | 'thatch' | 'torchis' | 'earth' | 'wood' | 'grey' | 'leaf';
const DARK: Record<Mat, string> = { stone: 'Z', thatch: 'P', torchis: 'E', earth: 'e', wood: 'N', grey: 'K', leaf: 'k' };

/** Une image en cours : les couleurs et la matière de chaque pixel. */
class Img {
  readonly c: Canvas;
  readonly m: (Mat | null)[][];
  constructor(readonly w: number, readonly h: number) {
    this.c = new Canvas(w, h);
    this.m = Array.from({ length: h }, () => Array<Mat | null>(w).fill(null));
  }
  static of(b: ViewBox): Img {
    const { w, h } = imageSize(b);
    return new Img(w, h);
  }
  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number) {
    return this.c.get(x, y);
  }
  set(x: number, y: number, ch: string, mat: Mat) {
    if (!this.inside(x, y)) return;
    this.c.px[y][x] = ch;
    this.m[y][x] = ch === EMPTY ? null : mat;
  }
  clear(x: number, y: number) {
    if (!this.inside(x, y)) return;
    this.c.px[y][x] = EMPTY;
    this.m[y][x] = null;
  }
  /** Pose une grille déjà finie (pièce de bois, détail), sans toucher aux pixels '.'. */
  stamp(g: Grid, ox: number, oy: number, mat: Mat) {
    g.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== EMPTY) this.set(ox + x, oy + y, ch, mat);
    }));
  }
  grid(): Grid {
    return this.c.toGrid();
  }
}

/**
 * Contour pris dans la silhouette (comme le toit de l'abri, building.ts) : un pixel plein qui touche le vide à droite ou en
 * bas devient OUTLINE ; sinon, s'il touche le vide à gauche ou en haut, la teinte la plus sombre de sa matière. `solid` dit
 * qu'une place hors silhouette compte comme pleine (un bout qui se raccorde à la pièce voisine : pas de trait).
 */
function contour(img: Img, solid?: (x: number, y: number) => boolean) {
  const full = (x: number, y: number) => (img.inside(x, y) && img.get(x, y) !== EMPTY) || (solid?.(x, y) ?? false);
  const out: [number, number, string][] = [];
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (img.get(x, y) === EMPTY) continue;
    if (!full(x + 1, y) || !full(x, y + 1)) out.push([x, y, 'o']);
    else if (!full(x - 1, y) || !full(x, y - 1)) out.push([x, y, DARK[img.m[y][x] ?? 'stone']]);
  }
  for (const [x, y, ch] of out) img.c.px[y][x] = ch;
}

/** Une pièce de bois du jeu, sans son ombre portée ni les rangées vides du dé sous un poteau. */
function woodGrid(piece: WoodPiece): Grid {
  const g = composeWood(piece).toGrid().map((r) => r.replace(/x/g, EMPTY));
  while (g.length && !/[^.]/.test(g[g.length - 1])) g.pop();
  return g;
}

// ---------- Perche en pente ----------

/** Écorce de la perche (art/world/wood-pieces.ts, `poleBark`) : S côté lumière, A, B ; un cran plus sombre par tirets. */
const POLE_DARKER: Record<string, string> = { S: 'A', A: 'B', B: 'Q' };

/**
 * Une perche en pente, de (x0, y0) à (x1, y1) en pixels (son axe), d'une demi-épaisseur `hw` px : écorce S du côté haut (la
 * lumière), A au milieu, B en bas, des tirets plus sombres le long du fil, coupée d'équerre aux deux bouts. `seed` : une
 * autre perche.
 */
function slopedPole(img: Img, x0: number, y0: number, x1: number, y1: number, hw: number, seed: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const dx = (x1 - x0) / len, dy = (y1 - y0) / len;
  // normale vers le haut de l'écran
  let nx = dy, ny = -dx;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const xs = [x0, x1], ys = [y0, y1];
  for (let y = Math.floor(Math.min(...ys) - hw - 1); y <= Math.ceil(Math.max(...ys) + hw + 1); y++) {
    for (let x = Math.floor(Math.min(...xs) - hw - 1); x <= Math.ceil(Math.max(...xs) + hw + 1); x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0;
      const along = px * dx + py * dy;
      const s = px * nx + py * ny;
      if (along < 0 || along > len || Math.abs(s) > hw) continue;
      let k = s > hw / 3 ? 'S' : s < -hw / 3 ? 'B' : 'A';
      // tirets de l'écorce : 3 px le long du fil, un tous les 7 à 11 px, jamais sur le bord bas
      const cell = Math.floor(along / 3);
      if (k !== 'B' && H(cell, seed, k === 'S' ? 1 : 2) < 0.22) k = POLE_DARKER[k];
      if (s < -hw + 1) k = 'Q';
      img.set(x, y, k, 'grey');
    }
  }
}

// =====================================================================================================================
// Projection de solides à faces planes
// =====================================================================================================================

interface Face {
  pts: V3[];
  /** Normale sortante, unitaire. */
  n: V3;
  tag: string;
  mat: string;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Les faces d'un solide convexe, normales tournées vers l'extérieur (depuis le centre de ses sommets). */
function solid(polys: { pts: V3[]; tag: string }[], mat: string): Face[] {
  const all = polys.flatMap((p) => p.pts);
  const c: V3 = [0, 1, 2].map((i) => all.reduce((s, p) => s + p[i], 0) / all.length) as V3;
  return polys.map(({ pts, tag }) => {
    let n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    const l = Math.hypot(...n);
    n = n.map((v) => v / l) as V3;
    if (dot(n, sub(pts[0], c)) < 0) n = n.map((v) => -v) as V3;
    return { pts, n, tag, mat };
  });
}

/** Tronc de pyramide (une boîte si `top` = `bot`) : rectangles [x0, x1, y0, y1] en bas (z0) et en haut (z1). */
function frustum(bot: number[], top: number[], z0: number, z1: number, mat: string): Face[] {
  const [a0, a1, b0, b1] = bot, [c0, c1, d0, d1] = top;
  const B: V3[] = [[a0, b0, z0], [a1, b0, z0], [a1, b1, z0], [a0, b1, z0]];
  const T: V3[] = [[c0, d0, z1], [c1, d0, z1], [c1, d1, z1], [c0, d1, z1]];
  return solid([
    { pts: B, tag: 'bottom' },
    { pts: T, tag: 'top' },
    { pts: [B[0], B[1], T[1], T[0]], tag: 'north' },
    { pts: [B[1], B[2], T[2], T[1]], tag: 'east' },
    { pts: [B[2], B[3], T[3], T[2]], tag: 'south' },
    { pts: [B[3], B[0], T[0], T[3]], tag: 'west' },
  ], mat);
}

const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: string) =>
  frustum([x0, x1, y0, y1], [x0, x1, y0, y1], z0, z1, mat);

/**
 * Prisme : une section (s, z) en cm, ses arêtes nommées (`tags[i]` : de la pointe i à la suivante), tirée le long de x
 * (s = y) ou de y (s = x) de a0 à a1 ; les deux bouts s'appellent `end0` et `end1`.
 */
function prism(section: [number, number][], tags: string[], along: 'x' | 'y', a0: number, a1: number, mat: string): Face[] {
  const at = (a: number, [s, z]: [number, number]): V3 => (along === 'x' ? [a, s, z] : [s, a, z]);
  const polys = section.map((p, i) => {
    const q = section[(i + 1) % section.length];
    return { pts: [at(a0, p), at(a1, p), at(a1, q), at(a0, q)], tag: tags[i] };
  });
  polys.push({ pts: section.map((p) => at(a0, p)), tag: 'end0' }, { pts: section.map((p) => at(a1, p)), tag: 'end1' });
  return solid(polys, mat);
}

/** Ce que voit un pixel : le point touché (cm, dans la boîte) et sa face. */
interface Hit {
  p: V3;
  face: Face;
}

/** Point dans un polygone (pair-impair), en coordonnées d'écran. */
function inPoly(px: number, py: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Projette les faces dans l'image de la boîte : au centre de chaque pixel, la face la plus proche du regard (y + z le plus
 * grand : on regarde depuis le sud et d'en haut). Une face de profil (tournée vers l'est ou l'ouest) ne couvre rien.
 */
function project(b: ViewBox, faces: Face[], keep: (p: V3) => boolean = () => true): (Hit | null)[][] {
  const { w, h } = imageSize(b);
  const hits: (Hit | null)[][] = Array.from({ length: h }, () => Array<Hit | null>(w).fill(null));
  const depth: number[][] = Array.from({ length: h }, () => Array<number>(w).fill(-Infinity));
  for (const f of faces) {
    const den = f.n[1] + f.n[2];
    if (Math.abs(den) < 1e-6) continue;
    const d = dot(f.n, f.pts[0]);
    const scr = f.pts.map((p) => pixel(b, p[0], p[1], p[2]));
    const xs = scr.map((p) => p[0]), ys = scr.map((p) => p[1]);
    for (let r = Math.max(0, Math.floor(Math.min(...ys))); r <= Math.min(h - 1, Math.ceil(Math.max(...ys))); r++) {
      for (let c = Math.max(0, Math.floor(Math.min(...xs))); c <= Math.min(w - 1, Math.ceil(Math.max(...xs))); c++) {
        if (!inPoly(c + 0.5, r + 0.5, scr)) continue;
        const x = (c + 0.5) * 5;
        const s = (r + 0.5) * 5 - b.h; // y − z
        const z = (d - f.n[0] * x - f.n[1] * s) / den;
        const p: V3 = [x, z + s, z];
        if (!keep(p)) continue;
        const dep = p[1] + p[2];
        if (dep > depth[r][c]) {
          depth[r][c] = dep;
          hits[r][c] = { p, face: f };
        }
      }
    }
  }
  return hits;
}

/** Peint les pixels touchés ; le peintre peut rendre '.' (un pixel laissé vide : un bord effrangé). */
function paint(img: Img, hits: (Hit | null)[][], painter: (hit: Hit, x: number, y: number) => [string, Mat]) {
  hits.forEach((row, y) => row.forEach((hit, x) => {
    if (!hit) return;
    const [ch, mat] = painter(hit, x, y);
    if (ch === EMPTY) img.clear(x, y);
    else img.set(x, y, ch, mat);
  }));
}

/** Retire `cuts[i]` pixels en bas (ou en haut) de la i-ième colonne pleine depuis un bord : un coin arrondi. */
function roundColumns(img: Img, cols: number[], cuts: number[], from: 'top' | 'bottom') {
  cols.forEach((x, i) => {
    const filled = [...Array(img.h).keys()].filter((y) => img.get(x, y) !== EMPTY);
    if (!filled.length) return;
    const list = from === 'bottom' ? filled.reverse() : filled;
    for (let k = 0; k < (cuts[i] ?? 0) && k < list.length; k++) img.clear(x, list[k]);
  });
}

// =====================================================================================================================
// 1. Couple de chevrons
// =====================================================================================================================
// Deux perches de Ø 12 cm (6 px, comme la perche du jeu) en A, du pied (z 232, 40 cm au-delà du mur) à la croisée (z 640),
// qu'elles dépassent jusqu'au haut de la boîte (z 680) ; l'entrait retroussé, une perche couchée de 2,40 m à z 520, chevillé
// sur leur face sud. Repère de la boîte : pied nord à y = −20, pied sud à y = 660 (ly = y + 20), lz = z − 232.

const COUPLE = {
  /** Pente des chevrons : 408 cm de montée pour 340 de course. */
  slope: 408 / 340,
  /** Hauteur de l'entrait au-dessus du pied, sa longueur. */
  tie: 520 - 232,
  tieLength: 240,
  /** Dépassement au-dessus de la croisée (lz du bout) et demi-épaisseur dessinée de la perche (px). */
  tip: 448,
  hw: 2.9,
};

/** r1 : le couple de face (dans un plan est-ouest), 136 × 96. */
function coupleFace(): Grid {
  const b = BOXES.couple('r1');
  const img = Img.of(b);
  const mid = 15; // le milieu de la boîte en profondeur
  const at = (lx: number, lz: number) => pixel(b, lx, mid, lz);
  const tipX = COUPLE.tip / COUPLE.slope;
  // la perche est (derrière), puis la perche ouest (devant) ; chacune part de sous le pied, rognée par la boîte
  const [ea, eb] = [at(680 + 12, -14), at(680 - tipX, COUPLE.tip)];
  const [wa, wb] = [at(-12, -14), at(tipX, COUPLE.tip)];
  slopedPole(img, ea[0], ea[1], eb[0], eb[1], COUPLE.hw, 7);
  slopedPole(img, wa[0], wa[1], wb[0], wb[1], COUPLE.hw, 3);
  contour(img);
  // l'entrait retroussé : la perche du jeu, couchée est-ouest, centrée, sa rangée d'écorce du milieu sur l'axe
  const tie = woodGrid({ size: 'pole', shape: 'round', axis: 'ew', length: COUPLE.tieLength });
  const [tx, ty] = at(340 - COUPLE.tieLength / 2, COUPLE.tie);
  img.stamp(tie, Math.round(tx), Math.round(ty) - 2, 'grey');
  return img.grid();
}

/**
 * r0 : le couple par la tranche (dans un plan nord-sud, comme dans notre maison), 6 × 226. On voit la perche sud de dessus,
 * en long, du pied sud (bas de l'image) jusqu'au bout qui dépasse la croisée ; la perche nord, qui redescend derrière, ne
 * dépasse que d'une colonne à droite (les deux perches sont chevillées côte à côte) ; le bout sud de l'entrait, qui dépasse
 * de 20 cm devant la perche sud, montre sa face de coupe.
 */
function coupleEdge(): Grid {
  const b = BOXES.couple('r0');
  const img = Img.of(b);
  const row = (ly: number, lz: number) => pixel(b, 0, ly, lz)[1];
  const tipY = 340 - (COUPLE.tip - 408) / COUPLE.slope; // bout de la perche sud au-delà de la croisée (vers le nord)
  const southTop = Math.round(row(tipY, COUPLE.tip));
  const southFoot = img.h - 1;
  const northTop = Math.round(row(680 - tipY, COUPLE.tip));
  const northFoot = Math.round(row(0, 0));
  // la perche nord, derrière : seule sa colonne de droite se verra
  for (let y = northTop; y <= northFoot; y++) for (let x = 2; x <= 5; x++) img.set(x, y, x < 4 ? 'B' : 'Q', 'grey');
  // la perche sud
  for (let y = southTop; y <= southFoot; y++) {
    const along = y - southTop;
    const tones = ['S', 'S', 'A', 'B', 'Q'];
    tones.forEach((k, x) => {
      let q = k;
      if ((x === 1 || x === 2) && H(Math.floor(along / 3), x, 11) < 0.25) q = POLE_DARKER[k];
      img.set(x, y, q, 'grey');
    });
  }
  // bout nord, lointain : coins arrondis, l'écorce un cran plus sombre
  img.clear(0, southTop);
  img.clear(4, southTop);
  for (let x = 1; x <= 3; x++) img.set(x, southTop + 1, POLE_DARKER[img.get(x, southTop + 1)] ?? 'B', 'grey');
  // pied sud : la coupe d'aplomb, tournée vers le sud (face de coupe 3 × 2, comme la perche nord-sud du jeu)
  img.clear(0, southFoot);
  img.clear(4, southFoot);
  contour(img);
  ['Y', 't', 'B'].forEach((k, i) => img.set(i + 1, southFoot - 2, k, 'wood'));
  ['t', 'T', 'B'].forEach((k, i) => img.set(i + 1, southFoot - 1, k, 'wood'));
  // le bout sud de l'entrait, devant la perche : écorce, face de coupe, contour
  const tieEnd = Math.round(row(340 + COUPLE.tieLength / 2, COUPLE.tie));
  ['K', 'S', 'A', 'B', 'o'].forEach((k, x) => img.set(x, tieEnd - 3, k, 'grey'));
  ['K', 'Y', 't', 'B', 'o'].forEach((k, x) => img.set(x, tieEnd - 2, k, 'wood'));
  ['K', 't', 'T', 'B', 'o'].forEach((k, x) => img.set(x, tieEnd - 1, k, 'wood'));
  ['o', 'o', 'o'].forEach((k, x) => img.set(x + 1, tieEnd, k, 'wood'));
  return img.grid();
}

// =====================================================================================================================
// 2. Pan de toit (chaume)
// =====================================================================================================================
// La couverture d'un versant : 40 cm de chaume en rangs de bottes de 1,20 m posées le gros bout en bas, qui se recouvrent.
// Repère de la boîte (r0) : ly = y − 320 (faîtage à 0, avant-toit à 360), lz = z − 220 (dessous de l'avant-toit à 0).
// Section du versant sud : dessus du faîtage (0, 500), dessus de l'avant-toit (360, 65), dessous (360, 0), dessous au
// faîtage (0, 435). La pente fait 565 cm de long.

const SLOPE = Math.hypot(360, 435);

type Light = 'lit' | 'sun' | 'shade';
/** Les teintes du chaume selon la lumière : clair, base, ombre, creux. */
const THATCH_RAMP: Record<Light, [string, string, string, string]> = {
  lit: ['Y', 't', 'T', 'P'],
  sun: ['Y', 't', 'T', 'P'],
  shade: ['t', 'T', 'P', 'P'],
};

/**
 * Le dessus du chaume en un point : `u` (cm le long de la pente depuis l'avant-toit), `ka` (la tranche le long du faîtage :
 * les variations à graine fixe), `dU` (cm de pente par pixel dans cette vue), `course` (le pas des rangs, en cm).
 * Chaque rang : en bas, les gros bouts qui prennent la lumière ; en haut, les pointes du rang du dessus qui pendent (T) et
 * l'ombre qu'elles portent (P) ; entre deux, la paille en long, brins clairs et sombres par tirets de 3 px.
 */
function thatchTop(u: number, ka: number, dU: number, course: number, light: Light, seed: number): string {
  const [hi, base, lo, deep] = THATCH_RAMP[light];
  const k = Math.floor(u / course);
  const w = (u - k * course) / dU; // px au-dessus des gros bouts de son rang
  const q = ((k + 1) * course - u) / dU; // px sous les gros bouts du rang du dessus
  const tipMax = course / dU > 6 ? 2 : 1;
  const tip = Math.min(tipMax, Math.floor(H(ka, k + 1, seed, 1) * 3.2));
  if (q < tip + 1) return q >= tip ? deep : lo;
  const s = H(ka, k, Math.floor(w / 3), seed);
  const narrow = course / dU < 7; // rangs vus en raccourci (r1, r3) : moins de brins, sinon le chaume grésille
  if (w < (narrow ? 1 : 2) && H(ka, k, seed, 5) < 0.55) return hi;
  const pHi = narrow ? 0.2 : light === 'lit' ? 0.24 : 0.16;
  if (s < pHi) return hi;
  if (s > (narrow ? 0.93 : 0.86)) return lo;
  return base;
}

/**
 * Les bouts de paille vus en bout (la tranche de l'avant-toit, une rive coupée) : `ka` la colonne, `j` la rangée depuis le
 * haut sur `rows`. Tirets verticaux de 3 px (t, T), points clairs en haut (la lumière), creux sombres en bas, quelques mèches
 * plus courtes d'un pixel (bord effrangé, '.').
 */
function strawEnds(ka: number, j: number, rows: number, light: Light, seed: number, ragged = true): string {
  const [hi, base, lo, deep] = THATCH_RAMP[light];
  if (ragged && j === rows - 1 && H(ka, seed, 11) < 0.35) return EMPTY;
  if (j >= rows - 3) return H(ka, Math.floor(j / 2), seed, 9) < 0.5 ? deep : lo;
  const lightCol = H(ka, seed, 3) < 0.4;
  if (j < 3) return lightCol ? hi : base;
  return H(ka, Math.floor((j - 3) / 3), seed, 4) < 0.35 ? base : lo;
}

/** Les sections des quatre vues du versant, dans la boîte de la vue. */
function roofFaces(view: View, length: number, extra = 0): Face[] {
  const a0 = -extra, a1 = length + extra;
  switch (view) {
    case 'r0':
      return prism([[0, 500], [360, 65], [360, 0], [0, 435]], ['top', 'eave', 'under', 'ridge'], 'x', a0, a1, 'thatch');
    case 'r2':
      return prism([[360, 500], [360, 435], [0, 0], [0, 65]], ['ridge', 'under', 'eave', 'top'], 'x', a0, a1, 'thatch');
    case 'r1':
      return prism([[0, 65], [360, 500], [360, 435], [0, 0]], ['top', 'ridge', 'under', 'eave'], 'y', a0, a1, 'thatch');
    case 'r3':
      return prism([[360, 65], [0, 500], [0, 435], [360, 0]], ['top', 'ridge', 'under', 'eave'], 'y', a0, a1, 'thatch');
  }
}

function roofPan(view: View, length: number, state = 'rives'): Grid {
  const b = BOXES.roof(view, length);
  const img = Img.of(b);
  const hits = project(b, roofFaces(view, length));
  const ew = view === 'r0' || view === 'r2';
  const seed = view === 'r2' ? 5 : 1;
  const rows = imageSize(b).h;
  paint(img, hits, ({ p, face }, x, y) => {
    const [lx, ly, lz] = p;
    switch (face.tag) {
      case 'top': {
        if (view === 'r0') return [thatchTop(((360 - ly) * SLOPE) / 360, Math.floor(lx / 5), SLOPE / (rows - 13), 30, 'lit', seed), 'thatch'];
        if (view === 'r1') return [thatchTop((lx * SLOPE) / 360, Math.floor(ly / 10), SLOPE / 72, 45, 'sun', seed), 'thatch'];
        if (view === 'r3') return [thatchTop(((360 - lx) * SLOPE) / 360, Math.floor(ly / 10), SLOPE / 72, 45, 'shade', seed), 'thatch'];
        return [thatchTop((ly * SLOPE) / 360, Math.floor(lx / 5), SLOPE / 15, 30, 'shade', seed), 'thatch'];
      }
      case 'eave':
        // la tranche de l'avant-toit, de 65 cm (13 rangées) : les gros bouts du premier rang
        return [strawEnds(Math.floor(lx / 5), Math.floor((65 - lz) / 5), 13, 'lit', seed), 'thatch'];
      case 'ridge':
        // le versant nord, coupé d'aplomb au faîtage (caché dans la maison par le faîtage et le versant sud)
        return [strawEnds(Math.floor(lx / 5), Math.floor((500 - lz) / 5), 13, 'shade', seed + 2, false), 'thatch'];
      case 'under': {
        // le dessous, dans l'ombre : la paille en long, quelques brins T sur le creux P
        const s = H(Math.floor(lx / 5), Math.floor(y / 3), seed, 6);
        return [s < 0.3 ? 'T' : 'P', 'thatch'];
      }
      case 'end1':
      case 'end0': {
        // vues r1, r3 : le bout sud du versant (la rive, ou la coupe qu'un pan voisin couvrira)
        const top = ew ? 0 : view === 'r1' ? 65 + (lx * 435) / 360 : 65 + ((360 - lx) * 435) / 360;
        const j = Math.floor((top - lz) / 5);
        const lt: Light = 'shade'; // la coupe, tournée vers le sud : un cran sous le dessus
        return [strawEnds(x, Math.max(0, j), 13, lt, seed + 4, state === 'rives'), 'thatch'];
      }
      default:
        return ['P', 'thatch'];
    }
  });
  if (state === 'rives') {
    if (ew) {
      // les rives au-dessus des pignons : le chaume coupé net, la tranche claire à l'ouest, sombre à l'est, coins arrondis
      const lit: Record<string, string> = { t: 'Y', T: 't', P: 'T' };
      const dark: Record<string, string> = { Y: 't', t: 'T', T: 'P' };
      for (let y = 0; y < img.h; y++) {
        for (const x of [1, 2]) {
          const k = img.get(x, y);
          if (lit[k] && (x === 1 || H(y >> 1, 21) < 0.6)) img.set(x, y, lit[k], 'thatch');
        }
        for (const x of [img.w - 3, img.w - 2]) {
          const k = img.get(x, y);
          if (dark[k] && (x === img.w - 2 || H(y >> 1, 22) < 0.6)) img.set(x, y, dark[k], 'thatch');
        }
      }
      const L = [0, 1, 2], R = [img.w - 1, img.w - 2, img.w - 3];
      const top = view === 'r0' ? [2, 1, 0] : [3, 1, 1];
      roundColumns(img, L, top, 'top');
      roundColumns(img, R, top, 'top');
      roundColumns(img, L, [4, 2, 1], 'bottom');
      roundColumns(img, R, [4, 2, 1], 'bottom');
    } else {
      // le bout sud du versant est la rive : coins arrondis, côté avant-toit plus fort
      const eaveSide = view === 'r1' ? [0, 1, 2] : [img.w - 1, img.w - 2, img.w - 3];
      const ridgeSide = view === 'r1' ? [img.w - 1, img.w - 2] : [0, 1];
      roundColumns(img, eaveSide, [4, 2, 1], 'bottom');
      roundColumns(img, ridgeSide, [2, 1], 'bottom');
      roundColumns(img, eaveSide, [2, 1], 'top');
    }
    contour(img);
  } else if (ew) {
    // sans rive : les bouts se raccordent au pan voisin, pas de trait à l'est ni à l'ouest
    contour(img, (x, y) => (x < 0 || x >= img.w) && y >= 0 && y < img.h && img.get(Math.min(Math.max(x, 0), img.w - 1), y) !== EMPTY);
  } else {
    // sans rive (r1, r3) : le bout nord se raccorde au pan du nord (qui passe derrière) : pas de trait de ce côté
    const ext = project(b, roofFaces(view, length, 60));
    contour(img, (x, y) => y >= 0 && y < img.h && x >= 0 && x < img.w && ext[y][x] !== null && (ext[y][x]!.p[1] < 0));
  }
  return img.grid();
}

// =====================================================================================================================
// 3. Faîtage de terre
// =====================================================================================================================
// Un boudin de paille couvert de terre lissée, 40 × 30 cm, à cheval sur le haut des deux versants (le faîtage « à la
// normande ») ; quelques touffes d'iris y poussent (feuilles vertes en éventail, sans fleur). Bouts laissés ouverts (pas de
// trait) : les morceaux se mettent bout à bout.

/** Touffes d'iris vues du sud (r0) : feuilles en éventail, claires à gauche ; le pied (dernière rangée) sur la terre. */
const IRIS_EW: Grid[] = [
  [
    '..j..',
    '.jL.l',
    '.jLlk',
    'jLLlk',
  ],
  [
    '.j.l.',
    'jjLlk',
    'jLLlk',
  ],
  [
    '..jl.',
    '.jL.l',
    'jLLlk',
    'jLLkk',
  ],
];

/** Touffes vues d'en haut (r1) : une étoile de feuilles. */
const IRIS_NS: Grid[] = [
  ['.j.', 'jLl', 'Llk'],
  ['jj.', 'jLl', '.lk'],
  ['.jl', 'jLk', 'Ll.'],
];

/** Où poussent les touffes, le long du faîtage (px), à graine fixe : une tous les 16 à 42 px, pas au ras des bouts. */
function tufts(n: number, seed: number): number[] {
  const out: number[] = [];
  for (let x = 6 + Math.floor(H(seed, 0) * 14); x < n - 6; x += 16 + Math.floor(H(seed, x) * 26)) out.push(x);
  return out;
}

/**
 * La terre lissée : par taches de 2 × 2 (jamais en long, sinon elle se lit comme du bois), un cran plus sombre ou plus clair ;
 * sur le dessus, quelques taches de mousse (l, L).
 */
function earthSpot(k: string, x: number, y: number, seed: number): string {
  const s = H(Math.floor((x + (Math.floor(y / 2) % 2)) / 2), Math.floor(y / 2), seed);
  if ((k === 'U' || k === 'u') && s < 0.05) return y % 2 ? 'l' : 'L';
  if (s > 0.86) return ({ U: 'u', u: 'n', n: 'e', e: 'e' } as Record<string, string>)[k] ?? k;
  if (s < 0.14 && k !== 'U') return ({ u: 'U', n: 'u', e: 'n' } as Record<string, string>)[k] ?? k;
  return k;
}

/** La terre du boudin en long : U au sommet (la lumière), u, n sur la face sud, e au pied ; tirets de lissage. */
const RIDGE_ROWS = ['U', 'U', 'U', 'u', 'u', 'u', 'n', 'n', 'n', 'n', 'e', 'e'];

function ridgeEW(length: number): Grid {
  const b = BOXES.ridge('r0', length);
  const img = Img.of(b);
  // la terre de la rangée 1 à la dernière : la rangée 0 est laissée aux touffes qui dépassent
  for (let x = 0; x < img.w; x++) {
    for (let y = 1; y < img.h; y++) {
      let k = RIDGE_ROWS[Math.min(RIDGE_ROWS.length - 1, y - 1)];
      k = earthSpot(k, x, y, 31);
      img.set(x, y, k, 'earth');
    }
  }
  contour(img, (x, y) => (x < 0 || x >= img.w) && y >= 1 && y < img.h);
  for (const [i, x] of tufts(img.w, length).entries()) {
    const g = IRIS_EW[i % IRIS_EW.length];
    img.stamp(g, x, 5 - g.length, 'leaf');
  }
  return img.grid();
}

/** Le bout sud du boudin (r1) : la terre en anneau autour du cœur de paille. 8 × 6, contour compris. */
const RIDGE_END: Grid = [
  'eUUuunno',
  'eutYtTeo',
  'enTtTPeo',
  'enTPPeeo',
  '.neeeeo.',
  '..oooo..',
];

function ridgeNS(length: number): Grid {
  const b = BOXES.ridge('r1', length);
  const img = Img.of(b);
  const cols = ['U', 'U', 'U', 'u', 'u', 'n', 'n', 'e'];
  const endAt = img.h - RIDGE_END.length;
  for (let y = 0; y < endAt; y++) {
    cols.forEach((k0, x) => {
      const k = earthSpot(k0, y, x, 37);
      img.set(x, y, k, 'earth');
    });
  }
  // bout nord arrondi
  img.clear(0, 0);
  img.clear(7, 0);
  contour(img, (x, y) => y >= endAt && y < img.h && x >= 0 && x < img.w);
  img.stamp(RIDGE_END, 0, endAt, 'earth');
  const ty = tufts(endAt, length + 1);
  ty.forEach((y, i) => {
    const g = IRIS_NS[i % IRIS_NS.length];
    img.stamp(g, i % 2 ? 4 : 2, Math.min(y, endAt - 4), 'leaf');
  });
  return img.grid();
}

// =====================================================================================================================
// 4. Pan de pignon
// =====================================================================================================================
// Le triangle au-dessus de la sablière haute : 580 cm d'axe en axe à la base, 360 de haut jusqu'à la croisée, bordé par le
// couple de rive (deux perches qui se croisent au sommet), le poinçon au milieu (poutre debout de 3,60 m), deux potelets
// (poutres debout de 2,40 m) à 110 cm de part et d'autre, et le torchis à fleur du bois entre eux. Repère de la boîte (r0) :
// lx = 0 à 620 (les axes des murs à 20 et 600), ly = 0 à 40 (le mur dessiné, face sud à 40), lz = z − 280.

const GABLE = {
  /** Axes des murs et sommet (lx), hauteur de la croisée (lz). */
  axes: [20, 600],
  apex: 310,
  rise: 360,
  /** Bout des perches au-dessus de la croisée. */
  tip: 380,
  /** Poteaux : axe (lx), longueur (cm). */
  posts: [[310, 360], [200, 240], [420, 240]] as [number, number][],
};

/** Torchis : d, taches D en tirets de 3 px, un cran plus sombre au pied ; E sous les perches (leur ombre). */
function torchis(x: number, y: number, seed: number): string {
  const dash = H(Math.floor(x / 3), y, seed) < 0.12;
  return dash ? 'D' : 'd';
}

function gableFront(): Grid {
  const b = BOXES.gable('r0');
  const img = Img.of(b);
  const slope = GABLE.rise / (GABLE.apex - GABLE.axes[0]);
  const front = (lx: number, lz: number) => pixel(b, lx, b.d, lz);
  const mid = (lx: number, lz: number) => pixel(b, lx, b.d / 2, lz);
  // le torchis, sur la face sud
  const tri = [front(GABLE.axes[0], 0), front(GABLE.apex, GABLE.rise), front(GABLE.axes[1], 0)];
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (!inPoly(x + 0.5, y + 0.5, tri)) continue;
    img.set(x, y, y >= img.h - 3 ? 'D' : torchis(x, y, 41), 'torchis');
  }
  // les poteaux : la pièce de bois du jeu, debout, le pied sur la sablière (bas de l'image)
  for (const [lx, length] of GABLE.posts) {
    // coupés sous les perches de rive : seul ce qui est dans le triangle (agrandi d'un pixel) reste, le reste est sous la perche
    const g = woodGrid({ size: 'normal', shape: 'round', hewn: 12, axis: 'up', length });
    const ox = Math.round(lx / 5 - g[0].length / 2), oy = img.h - g.length;
    const up = tri.map(([x, y]) => [x, y - 2] as [number, number]);
    g.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== EMPTY && inPoly(ox + x + 0.5, oy + y + 0.5, up)) img.set(ox + x, oy + y, ch, 'wood');
    }));
  }
  // l'ombre des perches sur le torchis et le haut des poteaux : deux rangées sous leur bord bas
  const under = (x: number, y: number) => {
    const ax = x + 0.5, ay = y + 0.5;
    for (const side of [1, -1]) {
      const lx = side > 0 ? ax * 5 : (img.w - ax) * 5;
      const edge = front(GABLE.axes[0] + 0, 0)[1] - (lx - GABLE.axes[0]) * slope / 5;
      if (ay > edge - 1 && ay < edge + 3.2) return true;
    }
    return false;
  };
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (img.m[y][x] === 'torchis' && under(x, y)) img.set(x, y, 'E', 'torchis');
  }
  // le couple de rive : la perche est (derrière), puis l'ouest, l'axe au milieu de l'épaisseur du mur
  const tipX = GABLE.apex + (GABLE.tip - GABLE.rise) / slope;
  const [wa, wb] = [mid(GABLE.axes[0] - 50, -50 * slope), mid(tipX, GABLE.tip)];
  const [ea, eb] = [mid(GABLE.axes[1] + 50, -50 * slope), mid(b.w - tipX, GABLE.tip)];
  slopedPole(img, ea[0], ea[1], eb[0], eb[1], COUPLE.hw, 17);
  slopedPole(img, wa[0], wa[1], wb[0], wb[1], COUPLE.hw, 13);
  contour(img);
  return img.grid();
}

/**
 * r1 : le pignon par la tranche (dans un plan nord-sud, sa face extérieure vers l'ouest), 8 × 200 : on voit le dessus du
 * mur le long du versant sud, du bout de la perche au-dessus de la croisée jusqu'au pied ; la perche de rive à l'ouest
 * (5 px, l'écorce éclairée), le torchis à fleur à l'est (3 px, D, E dans l'ombre de la perche). Le versant nord, qui
 * redescend derrière, est caché.
 */
function gableEdge(): Grid {
  const b = BOXES.gable('r1');
  const img = Img.of(b);
  const slope = GABLE.rise / (GABLE.apex - GABLE.axes[0]);
  const row = (ly: number, lz: number) => pixel(b, 0, ly, lz)[1];
  const top = Math.round(row(GABLE.apex - (GABLE.tip - GABLE.rise) / slope, GABLE.tip));
  const wallTop = Math.round(row(GABLE.apex, GABLE.rise));
  const wallFoot = Math.round(row(GABLE.axes[1], 0));
  for (let y = wallTop; y <= wallFoot; y++) {
    img.set(5, y, 'E', 'torchis');
    img.set(6, y, torchis(6, y, 43) === 'D' ? 'd' : 'D', 'torchis');
    img.set(7, y, 'D', 'torchis');
  }
  for (let y = top; y < img.h; y++) {
    ['S', 'S', 'A', 'B', 'Q'].forEach((k, x) => {
      let q = k;
      if ((x === 1 || x === 2) && H(Math.floor((y - top) / 3), x, 47) < 0.25) q = POLE_DARKER[k];
      img.set(x, y, q, 'grey');
    });
  }
  img.clear(0, top);
  img.clear(4, top);
  for (let x = 1; x <= 3; x++) img.set(x, top + 1, POLE_DARKER[img.get(x, top + 1)] ?? 'B', 'grey');
  contour(img);
  return img.grid();
}

// =====================================================================================================================
// 5. Cheminée
// =====================================================================================================================
// En pierre, dans le repère de r0 (l'âtre ouvert vers le sud) : lx 0..200, ly 0..120 (le dos au nord), lz 0..760.
// - jambages (lx 0..40, 160..200) et contre-cœur (lx 40..160, ly 0..60) en pierre de taille ; la sole en pierres plates ;
//   l'âtre : 120 de large, 140 de haut (z 20 à 160), 60 de profondeur, noir de suie au fond ;
// - la poutre de manteau (poutre de 2 m, z 160 à 180, sur le devant) ; derrière elle, des moellons ;
// - la hotte en moellons : de 200 × 100 (z 180) à 80 × 80 (z 300), la face sud d'aplomb sur la poutre ;
// - le conduit de 80 × 80 en moellons jusqu'à z 740, la dalle de couronnement (100 × 100, 20 cm) jusqu'à z 760, le trou du
//   conduit (40 × 40) dans la dalle.
// 'sur le toit' : ce qui sort du chaume (au-dessus de z 660), avec le solin de mortier de terre (z 650 à 680) qui le serre.

const CHIMNEY = {
  w: 200,
  d: 120,
  roofLine: 660,
};

function chimneySolids(state: string): Face[] {
  const f: Face[] = [
    ...box(0, 40, 0, 120, 0, 160, 'ashlar'),
    ...box(160, 200, 0, 120, 0, 160, 'ashlar'),
    ...box(40, 160, 0, 60, 20, 160, 'back'),
    ...box(40, 160, 0, 120, 0, 20, 'sole'),
    ...box(0, 200, 0, 100, 160, 180, 'rubble'),
    ...box(0, 200, 100, 120, 160, 180, 'beam'),
    ...frustum([0, 200, 0, 100], [60, 140, 20, 100], 180, 300, 'rubble'),
    ...box(60, 140, 20, 100, 300, 740, 'flue'),
    ...box(50, 150, 10, 110, 740, 760, 'slab'),
  ];
  if (state === 'sur le toit') f.push(...frustum([52, 148, 12, 108], [58, 142, 18, 102], 655, 685, 'mortar'));
  return f;
}

/** Le repère de r0 tourné vers une vue (un quart de tour de plus, sens des aiguilles d'une montre vu de dessus, à chaque fois). */
function turn(view: View, [x, y, z]: V3): V3 {
  const { w, d } = CHIMNEY;
  switch (view) {
    case 'r0': return [x, y, z];
    case 'r1': return [d - y, x, z];
    case 'r2': return [w - x, d - y, z];
    case 'r3': return [y, w - x, z];
  }
}

const turnFace = (view: View, f: Face): Face => {
  const pts = f.pts.map((p) => turn(view, p));
  const o = turn(view, [0, 0, 0]);
  const n = sub(turn(view, f.n), o);
  return { ...f, pts, n };
};

/** Les rampes de la pierre : 0 au soleil (R), 1 de face (r), 2 à l'ombre (z), 3 (Z). */
const STONE = ['R', 'r', 'z', 'Z'];
const st = (i: number) => STONE[Math.max(0, Math.min(3, i))];

/** Le rang de lumière d'une face, d'après sa normale : dessus et pentes vers l'ouest au soleil, est à l'ombre. */
function lightRank(n: V3): number {
  if (n[0] < -0.3) return 0;
  if (n[0] > 0.3) return 2;
  if (n[2] > 0.7) return 0;
  return 1;
}

/** Coordonnées sur la face (cm) : le long de l'horizontale de la face, et la hauteur (ou la profondeur pour un dessus). */
function faceUV(n: V3, p: V3): [number, number] {
  if (n[2] > 0.9) return [p[0], p[1]];
  const hl = Math.hypot(n[0], n[1]) || 1;
  return [(p[0] * -n[1] + p[1] * n[0]) / hl, p[2]];
}

/** Assises de moellons : hauteurs de 20 ou 25 cm, pierres de 25 à 55 cm, à graine fixe ; [début de l'assise, coupures]. */
const RUBBLE: { z0: number; z1: number; cuts: number[] }[] = (() => {
  const out: { z0: number; z1: number; cuts: number[] }[] = [];
  let z = 0;
  for (let i = 0; z < 800; i++) {
    const hgt = H(i, 51) < 0.5 ? 20 : 25;
    const cuts: number[] = [];
    for (let a = -300 - H(i, 52) * 40; a < 400; a += 25 + Math.floor(H(i, a, 53) * 6) * 5) cuts.push(a);
    out.push({ z0: z, z1: z + hgt, cuts });
    z += hgt;
  }
  return out;
})();

/** Une pierre de moellon au point (a, b) de la face : [rang de la pierre, joint ?, haut gauche de la pierre ?]. */
function rubbleAt(a: number, b: number, rank: number, seed: number): string {
  const course = RUBBLE.find((c) => b >= c.z0 && b < c.z1) ?? RUBBLE[0];
  const ci = RUBBLE.indexOf(course);
  let i = course.cuts.findIndex((c) => c > a) - 1;
  if (i < 0) i = 0;
  const a0 = course.cuts[i];
  const stone = H(ci, i, seed);
  // le joint du bas, qui ondule d'une pierre à l'autre (un pixel de plus sous certaines)
  const jointH = stone < 0.3 ? 9 : 5;
  if (b - course.z0 < jointH || a - a0 < 5) return st(rank + 2);
  const tone = stone > 0.72 ? rank + 1 : rank;
  // la lumière sur le haut et la gauche de la pierre : un tiret de deux ou trois pixels
  if (course.z1 - b <= 5 && a - a0 < 20 && stone < 0.6) return st(tone - 1);
  return st(tone);
}

/** Pierre de taille : assises de 20 cm, blocs de 40 cm en quinconce, joints fins, le lit du haut éclairé. */
function ashlarAt(a: number, b: number, rank: number, seed: number): string {
  const ci = Math.floor(b / 20);
  const off = ci % 2 ? 20 : 0;
  const bi = Math.floor((a + off) / 40);
  if (mod(b, 20) < 5 || mod(a + off, 40) < 5) return st(rank + 2);
  const s = H(ci, bi, seed);
  const tone = s > 0.8 ? rank + 1 : rank;
  if (mod(b, 20) >= 15 && s < 0.65) return st(tone - 1);
  return st(tone);
}

function chimney(view: View, state = 'entiere'): Grid {
  const b = BOXES.chimney(view);
  const img = Img.of(b);
  const roof = state === 'sur le toit';
  const faces = chimneySolids(state).map((f) => turnFace(view, f));
  const hits = project(b, faces, roof ? (p) => p[2] >= 655 : undefined);
  paint(img, hits, ({ p, face }) => {
    const { n, mat, tag } = face;
    const rank = lightRank(n);
    const [a, v] = faceUV(n, p);
    switch (mat) {
      case 'ashlar':
        return [ashlarAt(a, v, rank, 61), 'stone'];
      case 'rubble':
      case 'flue':
        return [rubbleAt(a, v, rank, mat === 'flue' ? 71 : 73), 'stone'];
      case 'back': {
        // le contre-cœur : sa face tournée vers l'âtre (sud dans le repère de r0) noire de suie, K et quelques joints Z ;
        // ses autres faces sont de la pierre de taille ordinaire (le dos de la cheminée en r2)
        if (tag !== 'south') return [ashlarAt(a, v, rank, 67), 'stone'];
        if (p[2] >= 80) return ['K', 'stone'];
        const k = ashlarAt(a, v, 2, 67);
        return [k === 'Z' ? 'K' : 'Z', 'stone'];
      }
      case 'sole': {
        // pierres plates : le dessus sous le manteau, dans l'ombre de l'âtre (z, joints Z, la cendre r devant) ; la tranche au sud
        if (tag !== 'top') return [mod(a, 35) < 5 ? 'Z' : 'z', 'stone'];
        const row = Math.floor(v / 30);
        const edge = mod(a + (row % 2) * 17, 34) < 5;
        if (edge) return ['Z', 'stone'];
        return [mod(v, 120) >= 100 ? 'r' : 'z', 'stone'];
      }
      case 'slab': {
        // la dalle de couronnement : une pierre plate taillée, dessus clair percé du conduit, tranche sombre
        if (tag === 'top') {
          const [x, y] = [p[0], p[1]];
          const hole = turn(view, [80, 40, 0]), hole2 = turn(view, [120, 80, 0]);
          const [hx0, hx1] = [Math.min(hole[0], hole2[0]), Math.max(hole[0], hole2[0])];
          const [hy0, hy1] = [Math.min(hole[1], hole2[1]), Math.max(hole[1], hole2[1])];
          if (x > hx0 && x < hx1 && y > hy0 && y < hy1) return [y < hy0 + 10 ? 'z' : 'K', 'stone'];
          return [H(Math.floor(x / 15), Math.floor(y / 10), 75) < 0.2 ? 'r' : 'R', 'stone'];
        }
        return [st(rank + 1), 'stone'];
      }
      case 'beam': {
        // la poutre de manteau, bois équarri (vues r1, r3 ; en r0 c'est la pièce de bois du jeu, posée par-dessus)
        if (tag === 'top') return [H(Math.floor(p[1] / 15), Math.floor(p[0] / 5), 77) < 0.3 ? 't' : 'Y', 'wood'];
        return [mod(p[0] + p[2], 20) < 10 ? 't' : 'T', 'wood'];
      }
      case 'mortar': {
        // le solin de mortier de terre, lissé à la main : U au soleil, u de face, n à l'ombre
        const k = ['U', 'u', 'n', 'e'][Math.min(3, rank)];
        return [H(Math.floor(a / 20), Math.floor(v / 5), 79) < 0.2 ? (k === 'U' ? 'u' : 'n') : k, 'earth'];
      }
      default:
        return ['z', 'stone'];
    }
  });
  contour(img);
  if (view === 'r0' && !roof) {
    // la poutre de manteau de r0 : la pièce de bois du jeu (poutre couchée est-ouest de 2 m), à sa place
    const beam = woodGrid({ size: 'normal', shape: 'round', hewn: 12, axis: 'ew', length: 200 });
    const [, by] = pixel(b, 0, 100, 180);
    img.stamp(beam, 0, Math.round(by), 'wood');
  }
  return img.grid();
}

// =====================================================================================================================
// Les éléments
// =====================================================================================================================

export const ELEMENTS: ProposedElement[] = [
  {
    key: 'couple',
    name: 'couple de chevrons',
    views: 'symmetric',
    box: (view) => BOXES.couple(view),
    draw: (view) => (view === 'r1' || view === 'r3' ? coupleFace() : coupleEdge()),
  },
  {
    key: 'pan-de-toit',
    name: 'pan de toit (chaume)',
    views: 'four',
    lengths: [200, 600],
    states: ['rives', 'milieu'],
    box: (view, length) => BOXES.roof(view, length),
    draw: (view, length, state) => roofPan(view, length, state),
  },
  {
    key: 'faitage',
    name: 'faîtage de terre',
    views: 'symmetric',
    lengths: [200, 600],
    box: (view, length) => BOXES.ridge(view, length),
    draw: (view, length) => (view === 'r0' || view === 'r2' ? ridgeEW(length) : ridgeNS(length)),
  },
  {
    key: 'pignon',
    name: 'pan de pignon',
    views: 'symmetric',
    box: (view) => BOXES.gable(view),
    draw: (view) => (view === 'r0' || view === 'r2' ? gableFront() : gableEdge()),
  },
  {
    key: 'cheminee',
    name: 'cheminée',
    views: 'four',
    states: ['entiere', 'sur le toit'],
    box: (view) => BOXES.chimney(view),
    draw: (view, _length, state) => chimney(view, state),
  },
];
