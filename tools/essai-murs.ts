// Essai des murs de pierre (chantier « pierre ») : npx tsx tools/essai-murs.ts écrit .art-preview/essai-murs.png.
//
// Deux murs de 1,60 m de long sur 80 cm de haut (32 × 16 px de face, plus le dessus en trois quarts), montés par calcul à
// graine fixe avec les dessins mêmes des pierres du jeu (art/items/stones.ts, images au sol, ombre retirée), pour que
// Grégoire juge avant toute intégration. Rien ici n'entre dans le jeu.
//   1. le mur brut : les pierres brutes (manière C), grosses en bas, moyennes dans les vides, petites calées dans les joints,
//      posées sur leur lit (le dessous plat de chaque dessin), joints de mortier de terre larges et irréguliers ;
//   2. le mur taillé : les moellons (manière B) des trois longueurs mêlées, quelques boutisses (le bout du moellon, sa vue
//      nord-sud), assises à peu près régulières, joints décalés, joints fins (le contour seul, ou un pixel de mortier).
// Une pierre dans le mur montre sa face sud : le dessin du jeu sans les rangées de son dessus (sauf la dernière, l'arête
// éclairée). Les pierres de l'assise haute gardent leur dessin entier : leur dessus fait le dessus du mur.
// Planche agrandie x4, sur la grille des cases (32 px du jeu, 1,60 m), avec Xéros ; deux graines par mur, une par rangée.
// Au-dessus de chaque mur, les pierres qui le composent (images au sol du jeu, nom, nombre) ; dessous, comment il est monté.
// Ne touche ni au jeu ni à src/generated/.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { Canvas, EMPTY, flipX, rng, type Grid } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import stones, { stonePalette } from '../art/items/stones';
import { bodyOf, castShadow } from '../art/proposals/lib';
import { silhouette } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 4;
const PAD = 12;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const GRID: Rgb = [110, 120, 60];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];
const pal = stonePalette;

// ---------- le mur ----------

const W = 32; // 1,60 m
const FACE = 16; // 80 cm
const MORTAR = 'n'; // mortier de terre, sur la face
const MORTAR_TOP = 'u'; // le même au soleil, sur le dessus du mur
const MORTAR_DARK = 'e'; // contour du mortier côté lumière

/** Une image au sol du jeu, sans son ombre. */
function gameImage(name: string): Grid {
  const s = stones.find((x) => x.name === name);
  if (!s || s.kind !== 'image') throw new Error(`essai-murs : image ${name} absente d'art/items/stones.ts`);
  return s.grid;
}

/** Une pierre du jeu prête à maçonner : son image au sol (pour la planche), son dessin entier, sa face dans le mur. */
interface Piece {
  /** Libellé de la planche. */
  label: string;
  /** Image au sol du jeu (ombre comprise). */
  image: string;
  /** Le dessin sans ombre. */
  full: Grid;
  /** Rangée du dessin où commence ce qui se voit dans le mur (l'arête éclairée du dessus, puis la face sud). */
  crop: number;
  turned?: boolean;
}

const face = (p: Piece) => p.full.slice(p.crop);

/**
 * La pierre retournée bout pour bout (miroir est-ouest), rééclairée : la lumière reste en haut à gauche. Le contour qui
 * touche le vide en bas ou à droite redevient OUTLINE, celui de gauche ou du haut `~` ; l'ombre `;` passée à l'ouest
 * redevient face `=`, et la colonne de face qui touche le nouveau flanc est passe à l'ombre `;`.
 */
function turn(p: Piece): Piece {
  const g = flipX(p.full).map((r) => [...r]);
  const h = g.length, w = g[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? EMPTY : g[y][x]);
  const src = g.map((r) => [...r]);
  const was = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? EMPTY : src[y][x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = was(x, y);
    if (c === EMPTY) continue;
    const edgeR = was(x + 1, y) === EMPTY || was(x, y + 1) === EMPTY;
    const edgeL = was(x - 1, y) === EMPTY || was(x, y - 1) === EMPTY;
    if ((c === 'o' || c === '~') && (edgeR || edgeL)) g[y][x] = edgeR ? 'o' : '~';
    else if (c === ';') g[y][x] = '=';
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (src[y][x] === EMPTY || g[y][x] === 'o' || g[y][x] === '~') continue;
    // l'éclat blanc passé contre le flanc est (à l'ombre) s'y éteint aussi
    if (at(x + 1, y) === 'o' && '=DR!'.includes(g[y][x])) g[y][x] = ';';
  }
  return { ...p, full: g.map((r) => r.join('')), turned: true };
}

// Les pierres brutes : la face commence sous le dessus, à la dernière rangée claire (l'arête qui prend le jour).
const ROUGH: Piece[] = [
  { label: 'grosse a', image: 'big-rough-stone-ground', crop: 3 },
  { label: 'grosse b', image: 'big-rough-stone-ground-b', crop: 3 },
  { label: 'moyenne a', image: 'rough-stone-ground', crop: 2 },
  { label: 'moyenne b', image: 'rough-stone-ground-b', crop: 2 },
  { label: 'petite a', image: 'small-rough-stone-ground', crop: 1 },
  { label: 'petite b', image: 'small-rough-stone-ground-b', crop: 1 },
].map((p) => ({ ...p, full: bodyOf(gameImage(p.image)) }));
const BIG = ROUGH.slice(0, 2), MEDIUM = ROUGH.slice(2, 4), SMALL = ROUGH.slice(4, 6);

// Les moellons : couchés en long (panneresses : l'image est-ouest), ou en boutisse (le bout, l'image nord-sud du 40 cm).
const RUBBLE: Piece[] = [
  { label: 'moellon 30', image: 'short-rubble-stone-ground', crop: 2 },
  { label: 'moellon 40', image: 'rubble-stone-ground', crop: 2 },
  { label: 'moellon 50', image: 'long-rubble-stone-ground', crop: 2 },
].map((p) => ({ ...p, full: bodyOf(gameImage(p.image)) }));
const HEADER: Piece = (() => {
  const full = bodyOf(gameImage('rubble-stone-ground-ns'));
  return { label: 'boutisse 40', image: 'rubble-stone-ground-ns', full, crop: full.length - 4 };
})();

/** Ce qui a été posé, pour la planche. */
type Used = Map<string, { piece: Piece; n: number }>;
const count = (used: Used, p: Piece) => {
  const e = used.get(p.image) ?? { piece: { ...p, turned: false, full: bodyOf(gameImage(p.image)) }, n: 0 };
  e.n++;
  used.set(p.image, e);
};

/** Le mur en chantier : les pierres posées (et qui occupe chaque pixel), le mortier, le contour, l'ombre. */
class Wall {
  readonly top: number; // rangée du contour arrière du dessus
  readonly faceTop: number; // première rangée de la face
  readonly ground: number; // rangée du bas (le contour du pied)
  readonly c: Canvas;
  readonly owner: number[][];
  private n = 0;
  constructor(readonly topRows: number) {
    this.top = 0;
    this.faceTop = topRows;
    this.ground = topRows + FACE - 1;
    this.c = new Canvas(W, this.ground + 1);
    this.owner = Array.from({ length: this.c.h }, () => Array(W).fill(-1));
  }
  /** La grille posée en (x, y) tient-elle : dans le mur, sans toucher une autre pierre à moins de `gx` × `gy` pixels ? */
  fits(g: Grid, x: number, y: number, gx: number, gy: number, minY = this.top): boolean {
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[0].length; i++) {
      if (g[j][i] === EMPTY) continue;
      const px = x + i, py = y + j;
      if (px < 0 || px >= W || py < minY || py > this.ground) return false;
      for (let dy = -gy; dy <= gy; dy++) for (let dx = -gx; dx <= gx; dx++) {
        const o = this.owner[py + dy]?.[px + dx];
        if (o !== undefined && o >= 0) return false;
      }
    }
    return true;
  }
  put(g: Grid, x: number, y: number): void {
    const id = this.n++;
    g.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === EMPTY) return;
      this.c.set(x + i, y + j, ch);
      this.owner[y + j][x + i] = id;
    }));
  }
  /**
   * Le mortier dans tout ce qui reste du mur (x de 1 à W - 2, jusqu'à la rangée au-dessus du pied), clair sur le dessus du
   * mur (`u`), puis le contour autour du mortier seul (les pierres ont le leur) : `e` en haut et à gauche, OUTLINE en bas et à droite.
   */
  finish(): Grid {
    // le haut du mortier, colonne par colonne : pas au-dessus d'une pierre de l'assise haute (son dessus fait le dessus du
    // mur) ; entre deux pierres, un pixel sous la plus haute de ses voisines (à 3 colonnes près)
    const stoneTop = Array.from({ length: W }, (_, x) => {
      for (let y = 0; y <= this.faceTop + 2; y++) if (this.owner[y][x] >= 0) return y;
      return Infinity;
    });
    const mt = stoneTop.map((t, x) => {
      if (Number.isFinite(t)) return t;
      const near = Math.min(...stoneTop.slice(Math.max(0, x - 3), x + 4));
      return Number.isFinite(near) ? Math.max(this.top + 1, near + 1) : this.top + 1;
    });
    for (let x = 1; x < W - 1; x++) for (let y = mt[x]; y < this.ground; y++) {
      if (this.c.get(x, y) !== EMPTY) continue;
      this.c.set(x, y, y < this.faceTop ? MORTAR_TOP : MORTAR);
    }
    const isM = (x: number, y: number) => { const k = this.c.get(x, y); return k === MORTAR || k === MORTAR_TOP; };
    const add: [number, number, string][] = [];
    for (let y = 0; y < this.c.h; y++) for (let x = 0; x < W; x++) {
      if (this.c.get(x, y) !== EMPTY) continue;
      if (isM(x - 1, y) || isM(x, y - 1)) add.push([x, y, 'o']);
      else if (isM(x + 1, y) || isM(x, y + 1)) add.push([x, y, MORTAR_DARK]);
    }
    for (const [x, y, k] of add) this.c.set(x, y, k);
    return castShadow(this.c.toGrid());
  }
}

/** x permis pour une pierre de largeur w : collée à un bout du mur, ou assez loin pour que le mortier ferme le bord. */
const xsFor = (w: number) => Array.from({ length: W - w + 1 }, (_, x) => x).filter((x) => (x === 0 || x >= 2) && (x + w === W || x + w <= W - 2));

// ---------- le mur brut ----------

/**
 * Le mur brut, à graine fixe. Pas d'assise réglée : le pied et le dessus sont deux rangées de pierres de tailles mêlées, le
 * milieu se comble pierre à pierre, chacune là où elle est le plus serrée, à 1 pixel de mortier de ses voisines (2 ou 3 entre
 * deux pierres d'une rangée), joints de lit au contact.
 *   1. le pied : surtout des grosses, posées sur le sol par leur lit (le dessous plat de chaque dessin du jeu) ;
 *   2. l'assise haute : des pierres entières (dessin complet, leur dessus fait le dessus du mur), la face au ras de la face du
 *      mur, ou un pixel plus bas ;
 *   3. le milieu : une grosse si elle tient, puis les moyennes, puis les petites, de préférence à cheval sur deux pierres ;
 *   4. deux petites calées au contact dans ce qui reste de vide.
 * Une pierre sur trois environ est retournée bout pour bout (rééclairée) ; deux mêmes dessins ne se suivent pas dans une rangée.
 */
function roughWall(seed: number): { grid: Grid; used: Used } {
  const r = rng(Math.imul(seed, 0x9e3779b1) ^ 0x5bd1e995);
  const wall = new Wall(3);
  const used: Used = new Map();
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const vary = (p: Piece) => (r() < 0.35 ? turn(p) : p);

  /** Ce qui entoure la pierre posée en (x, y) à `d` pixels près : pierres, sol, bouts du mur. Plus c'est serré, mieux c'est. */
  const contact = (g: Grid, x: number, y: number, d: number) => {
    let n = 0;
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[0].length; i++) {
      if (g[j][i] === EMPTY) continue;
      for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
        const px = x + i + dx, py = y + j + dy;
        if (py > wall.ground || px < 0 || px >= W) n++;
        else if ((wall.owner[py]?.[px] ?? -1) >= 0) n++;
      }
    }
    return n;
  };
  const put = (p: Piece, g: Grid, x: number, y: number) => { wall.put(g, x, y); count(used, p); };

  /**
   * Une rangée de pierres d'un bout à l'autre du mur : tirées (grosses ou moyennes selon `bigShare`), retournées ou non,
   * avec 1 à 3 pixels de mortier entre elles, jusqu'à tomber juste sur la longueur du mur. `at(p, g)` donne la rangée du haut.
   */
  const joints: number[] = [];
  const row = (bigShare: number, grid: (p: Piece) => Grid, at: (p: Piece, g: Grid) => number) => {
    for (let tries = 0; tries < 2000; tries++) {
      const out: { p: Piece; g: Grid; x: number }[] = [];
      let x = 0;
      while (x < W) {
        // une petite de temps en temps, calée entre deux plus grosses
        const p = vary(pick(r() < 0.12 ? SMALL : r() < bigShare ? BIG : MEDIUM));
        const g = grid(p);
        if (x + g[0].length > W) break;
        out.push({ p, g, x });
        x += g[0].length + (r() < 0.75 ? 1 : 2);
      }
      const last = out.at(-1);
      // la dernière ferme le mur ; deux mêmes dessins ne se suivent pas
      if (!last || last.x + last.g[0].length !== W) continue;
      if (out.some((o, i) => i > 0 && o.p.image === out[i - 1].p.image && o.p.turned === out[i - 1].p.turned)) continue;
      // les joints de cette rangée tombent à 3 px au moins de ceux de l'autre rangée (le pied et le dessus ne s'alignent pas)
      const js = out.slice(1).map((o) => o.x);
      if (tries < 1500 && joints.length && !js.every((j) => joints.every((k) => Math.abs(j - k) >= 4))) continue;
      joints.push(...js);
      for (const o of out) put(o.p, o.g, o.x, at(o.p, o.g));
      return;
    }
  };
  // 1. le pied : surtout des grosses, posées sur le sol par leur lit
  row(0.75, face, (_, g) => wall.ground - g.length + 1);
  // 2. l'assise haute : dessin entier (le dessus de la pierre fait le dessus du mur), la face au ras de celle du mur ou un pixel
  // plus bas
  row(0.4, (p) => p.full, (p) => wall.faceTop - p.crop + (r() < 0.4 ? 1 : 0));
  // 3. les vides du milieu : moyennes (une grosse si elle tient), puis petites, chacune là où elle est le plus serrée, et de
  // préférence à cheval sur un joint du dessous (une pierre couvre le joint de deux autres)
  const straddle = (g: Grid, x: number, y: number) => {
    const below = new Set<number>(), above = new Set<number>();
    for (let i = 0; i < g[0].length; i++) {
      for (let dy = 1; dy <= 3; dy++) {
        const o = wall.owner[y + g.length - 1 + dy]?.[x + i] ?? -1;
        if (o >= 0) { below.add(o); break; }
      }
      for (let dy = 1; dy <= 3; dy++) {
        const o = wall.owner[y - dy]?.[x + i] ?? -1;
        if (o >= 0) { above.add(o); break; }
      }
    }
    return (below.size >= 2 ? 1 : 0) + (above.size >= 2 ? 1 : 0);
  };
  const fill = (from: Piece[], gx: number, gy: number, max: number) => {
    for (let k = 0; k < max; k++) {
      let out: { p: Piece; g: Grid; x: number; y: number; s: number } | undefined;
      for (const base of from) for (const p of [base, turn(base)]) {
        const g = face(p);
        for (const x of xsFor(g[0].length)) for (let y = wall.faceTop; y + g.length - 1 <= wall.ground; y++) {
          if (!wall.fits(g, x, y, gx, gy)) continue;
          const s = contact(g, x, y, gx + 1) / (g.length * g[0].length) + 0.8 * straddle(g, x, y) + r() * 0.4;
          if (!out || s > out.s) out = { p, g, x, y, s };
        }
      }
      if (!out) return;
      put(out.p, out.g, out.x, out.y);
    }
  };
  fill(BIG, 1, 0, 1);
  fill(MEDIUM, 1, 0, 3);
  fill(SMALL, 1, 0, 2);
  fill(MEDIUM, 1, 0, 12);
  fill(MEDIUM, 0, 0, 2);
  fill(SMALL, 1, 0, 12);
  // 4. les petites calées au contact, dans ce qui reste de vide
  fill(SMALL, 0, 0, 4);
  return { grid: wall.finish(), used };
}

// ---------- le mur taillé ----------

/**
 * La face d'un moellon dans le mur : ses coins abattus laissent voir le mortier (les quatre coins de la face, ou les deux du
 * bas dans l'assise haute), et une fois sur trois son contour du bas devient un pixel de mortier : le joint de lit n'est pas
 * un trait continu, comme dans la brique.
 */
function notch(g: Grid, r: () => number, o: { top: boolean; bottom: boolean; left: boolean; right: boolean }): Grid {
  const rows = g.map((row) => [...row]);
  const h = rows.length, w = rows[0].length;
  if (o.top && o.left) rows[0][0] = EMPTY;
  if (o.top && o.right) rows[0][w - 1] = EMPTY;
  if (o.bottom && o.left) rows[h - 1][0] = EMPTY;
  if (o.bottom && o.right) rows[h - 1][w - 1] = EMPTY;
  if (o.bottom && r() < 0.33) for (let x = 1; x < w - 1; x++) rows[h - 1][x] = MORTAR;
  return rows.map((row) => row.join(''));
}

const COURSE = 4; // 20 cm, la hauteur d'un moellon : l'assise, joint compris
const COURSES = FACE / COURSE;

/** Une assise : les pierres de gauche à droite (largeur de leur dessin) et le joint qui suit chacune (0 : contour commun, 1 : un pixel de mortier). */
interface Course { pieces: Piece[]; joints: number[]; xs: number[] }

function layout(pieces: Piece[], joints: number[]): number[] {
  const xs: number[] = [];
  let x = 0;
  pieces.forEach((p, i) => { xs.push(x); x += p.full[0].length - 1 + joints[i]; });
  return xs;
}
/** Abscisses des joints verticaux d'une assise (la colonne du contour commun, ou la colonne de mortier). */
const jointXs = (c: Course) => c.xs.slice(1).map((x, i) => x - (c.joints[i] === 1 ? 1 : 0));

function course(r: () => number, prev: Course | undefined, prev2: Course | undefined, first: boolean): Course {
  for (let tries = 0; ; tries++) {
    const pieces: Piece[] = [];
    const joints: number[] = [];
    let x = 0;
    // un bout du mur sur deux commence par une boutisse, en alternance d'une assise à l'autre (le chaînage des angles)
    const headerFirst = first ? r() < 0.5 : !(prev?.pieces[0] === HEADER);
    while (x < W) {
      const left = W - x;
      let p: Piece;
      if (pieces.length === 0 && headerFirst) p = HEADER;
      else {
        const opts = [...RUBBLE, ...RUBBLE, HEADER];
        p = opts[Math.floor(r() * opts.length)];
      }
      const w = p.full[0].length;
      if (w > left) break;
      pieces.push(p);
      const j = r() < 0.3 ? 1 : 0;
      joints.push(j);
      x += w - 1 + j;
      if (x + 1 === W) break; // la dernière pierre ferme le mur : son contour droit sur la dernière colonne
    }
    const end = layout(pieces, joints).at(-1)! + pieces.at(-1)!.full[0].length;
    if (end !== W) continue;
    const c: Course = { pieces, joints, xs: layout(pieces, joints) };
    const lens = new Set(pieces.map((p) => p.image));
    if (lens.size < 2 && tries < 500) continue;
    if (pieces.filter((p) => p === HEADER).length > 2 && tries < 500) continue;
    const j = jointXs(c);
    const near = prev ? jointXs(prev) : [];
    const far = prev2 ? jointXs(prev2) : [];
    if (tries < 2000 && !j.every((a) => near.every((b) => Math.abs(a - b) >= 2) && far.every((b) => Math.abs(a - b) >= 1))) continue;
    return c;
  }
}

/**
 * Le mur taillé, à graine fixe : quatre assises de 20 cm, de bas en haut. Dans chaque assise, les moellons des trois longueurs
 * mêlés et une ou deux boutisses ; un bout du mur sur deux commence par une boutisse, en alternance (le chaînage). Joint
 * vertical : le contour commun de deux pierres (une fois sur trois, un pixel de mortier), décalé d'au moins 10 cm de ceux de
 * l'assise du dessous. Joint de lit : le contour du bas de la pierre du dessus, posé sur l'arête éclairée de celle du dessous ;
 * une pierre sur quatre environ est plus basse d'un pixel (un pixel de mortier dessus). L'assise haute garde le dessin entier
 * (le dessus du moellon fait le dessus du mur). Puis quelques éclats (pris au dessin des éclats du jeu) calés là où le mortier
 * fait un vide.
 */
function dressedWall(seed: number): { grid: Grid; used: Used } {
  const r = rng(Math.imul(seed, 0x85ebca6b) ^ 0xc2b2ae35);
  const wall = new Wall(2);
  const used: Used = new Map();
  const cs: Course[] = [];
  for (let ci = 0; ci < COURSES; ci++) cs.push(course(r, cs[ci - 1], cs[ci - 2], ci === 0));
  // le haut de ce qui est posé, colonne par colonne : chaque pierre repose sur le plus haut de ce qu'elle couvre
  const sky = Array(W).fill(wall.ground + 1);
  cs.forEach((c, ci) => {
    const cap = ci === COURSES - 1;
    const target = wall.ground - COURSE * (ci + 1) + 1; // première rangée de l'assise, si tout était au cordeau
    const put: { x: number; y: number; g: Grid }[] = [];
    c.pieces.forEach((p0, i) => {
      const p = r() < 0.4 ? turn(p0) : p0;
      const x = c.xs[i], w = p.full[0].length;
      // elle repose sur le plus haut de ce qu'elle couvre ; une fois sur cinq, sur un lit de mortier d'un pixel, s'il reste la
      // place d'une face de 4 rangées
      let bottom = Math.min(...sky.slice(x, x + w)) - 1;
      if (ci > 0 && r() < 0.2 && bottom - 1 - target + 1 >= 4) bottom--;
      // hauteur de la face : ce qui ramène son haut à la ligne de l'assise (3 à 5 rangées, 4 d'ordinaire) ; une fois sur
      // cinq, un pixel plus basse (du mortier au-dessus, la pierre du dessus repose sur ses voisines)
      let h = Math.max(3, Math.min(5, bottom - target + 1));
      if (!cap && h > 3 && r() < 0.2) h--;
      if (cap) h = Math.min(h, bottom - 2 + 1); // le dessus de l'assise haute reste dans l'image
      const fc = p.full.slice(p.full.length - h);
      // l'assise haute : le contour arrière et la rangée de dessus du dessin, puis la face (la boutisse ne montre de son long
      // dessus que l'épaisseur du mur)
      // (ni au pied du mur ni à ses deux bouts, qui restent pleins)
      const g = notch(cap ? [p.full[0], p.full[1], ...fc] : fc, r, { top: !cap, bottom: ci > 0, left: x > 0, right: x + w < W });
      put.push({ x, y: bottom - g.length + 1, g });
      count(used, p);
    });
    // de droite à gauche : le contour de la pierre de gauche (OUTLINE, l'ombre) reste dans le joint commun
    for (let i = put.length - 1; i >= 0; i--) {
      const { x, y, g } = put[i];
      g.forEach((row, j) => [...row].forEach((ch, k) => {
        if (ch === EMPTY || y + j < 0) return;
        wall.c.set(x + k, y + j, ch);
        wall.owner[y + j][x + k] = ci * 100 + i;
        sky[x + k] = Math.min(sky[x + k], y + j);
      }));
    }
    // joints verticaux : le contour commun (OUTLINE), une fois sur quatre un pixel de mortier à sa place ; le joint ouvert
    // (une colonne de plus) garde le contour de la pierre de gauche et met un pixel de mortier à la place de celui de droite
    for (let i = 1; i < put.length; i++) {
      const open = c.joints[i - 1] === 1;
      if (!open && r() >= 0.25) continue;
      const jx = put[i].x;
      const y0 = Math.max(put[i].y, put[i - 1].y) + (cap ? 2 : 0), y1 = Math.min(put[i].y + put[i].g.length, put[i - 1].y + put[i - 1].g.length) - 1;
      for (let y = y0 + 1; y < y1; y++) if ('o~'.includes(wall.c.get(jx, y))) wall.c.set(jx, y, MORTAR);
    }
  });
  // éclats : fragments du dessin des éclats du jeu, là où le mortier fait un vide d'au moins leur taille
  const chips: Grid[] = [['!;'], ['+;'], ['.!', '!;']];
  const spots: [number, number, Grid][] = [];
  for (const g of chips) for (let y = wall.faceTop; y + g.length < wall.ground; y++) for (let x = 2; x + g[0].length < W - 2; x++) {
    let ok = true;
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[0].length; i++) if (g[j][i] !== EMPTY && wall.c.get(x + i, y + j) !== EMPTY) ok = false;
    if (ok) spots.push([x, y, g]);
  }
  const placed: [number, number][] = [];
  for (let n = 0; n < 60 && placed.length < 3 && spots.length; n++) {
    const [x, y, g] = spots[Math.floor(r() * spots.length)];
    if (placed.some(([px, py]) => Math.abs(px - x) < 6 && Math.abs(py - y) < 4)) continue;
    wall.c.stamp(g, x, y);
    placed.push([x, y]);
  }
  if (placed.length) {
    const chipsImage = bodyOf(gameImage('stone-chips'));
    used.set('stone-chips', { piece: { label: 'eclats', image: 'stone-chips', full: chipsImage, crop: 0 }, n: placed.length });
  }
  return { grid: wall.finish(), used };
}

// ---------- la planche ----------

const size = (g: Grid) => { const s = silhouette(g, pal); return `${s.w}X${s.h} PX`; };
const xg = xeros.animations['idle-down'].frames[0];
const xs = silhouette(xg, xeros.palette);

/**
 * Un bloc : le titre, les pierres du mur rangées par trois (image au sol du jeu, nom, nombre), une flèche, le mur, sa légende.
 * `right` : tout est calé à droite du bloc (le mur de gauche, contre Xéros).
 */
interface Block { w: number; h: number; ground: number; draw: (s: Sheet, x: number, y: number) => void }

const PER_ROW = 3;

function block(title: string[], wall: Grid, used: Used, lines: string[], right: boolean): Block {
  // dans l'ordre des pierres du jeu : grosses, moyennes, petites ; moellons du plus court au plus long, boutisse, éclats
  const order = [...ROUGH, ...RUBBLE, HEADER].map((p) => p.image).concat('stone-chips');
  const items = [...used.values()].sort((a, b) => order.indexOf(a.piece.image) - order.indexOf(b.piece.image));
  const cellW = Math.max(...items.map((it) => Math.max(gameImage(it.piece.image)[0].length * K, textWidth(it.piece.label, T)))) + 12;
  const imgH = Math.max(...items.map((it) => gameImage(it.piece.image).length)) * K;
  const cellH = imgH + 34;
  const nRows = Math.ceil(items.length / PER_ROW);
  const stonesW = Math.min(items.length, PER_ROW) * cellW - 12;
  const wallW = wall[0].length * K;
  const titleH = title.length * 12 + 6;
  const w = Math.max(stonesW, wallW, ...title.map((l) => textWidth(l, T)), ...lines.map((l) => textWidth(l, T)));
  const arrowY = titleH + nRows * cellH;
  const wallTop = arrowY + 18;
  const ground = wallTop + (wall.length - 1) * K; // la dernière rangée est l'ombre portée
  const at = (x: number, width: number) => (right ? x + w - width : x);
  return {
    w,
    h: ground + 14 + lines.length * 12,
    ground,
    draw: (s, x, y) => {
      title.forEach((l, i) => s.text(l, at(x, textWidth(l, T)), y + i * 12, i === 0 ? GOLD : WHITE, T));
      items.forEach((it, i) => {
        const g = gameImage(it.piece.image);
        const cx = at(x, stonesW) + (i % PER_ROW) * cellW;
        const cy = y + titleH + Math.floor(i / PER_ROW) * cellH;
        s.blit(g, pal, cx, cy + imgH - g.length * K, K);
        s.text(it.piece.label, cx, cy + imgH + 6, WHITE, T);
        s.text(`X ${it.n}`, cx, cy + imgH + 18, GOLD, T);
      });
      // la flèche : les pierres du dessus montent le mur du dessous
      s.text('V', at(x, wallW) + wallW / 2 - 4, y + arrowY, GOLD, T);
      s.blit(wall, pal, at(x, wallW), y + wallTop, K);
      lines.forEach((l, i) => s.text(l, at(x, textWidth(l, T)), y + ground + 10 + i * 12, i === 0 ? WHITE : GREY, T));
    },
  };
}

const GAP = 20;
const xerosW = xs.w * K + 2 * GAP;
const drawXeros = (s: Sheet, x: number, ground: number) => {
  s.blit(xg, xeros.palette, x + GAP - xs.x * K, ground - (xs.y + xs.h) * K, K);
  s.text('XEROS', x + GAP + (xs.w * K - textWidth('XEROS', T)) / 2, ground + 10, GOLD, T);
  s.text('1,60 M', x + GAP + (xs.w * K - textWidth('1,60 M', T)) / 2, ground + 22, GOLD, T);
};

const total = (u: Used) => [...u.values()].filter((e) => e.piece.image !== 'stone-chips').reduce((s, e) => s + e.n, 0);

function main() {
  const SEEDS = [1, 2];
  const rows = SEEDS.map((seed) => {
    const rough = roughWall(seed);
    const dressed = dressedWall(seed);
    return [
      block([`MUR BRUT, GRAINE ${seed}`, `${total(rough.used)} PIERRES BRUTES`], rough.grid, rough.used, [
        `1,60 X 0,80 M - ${size(rough.grid)}`,
        'GROSSES AU PIED, SUR LEUR LIT,',
        'MOYENNES DANS LES VIDES, PETITES',
        'CALEES - PAS D ASSISES - JOINTS',
        'DE TERRE LARGES ET IRREGULIERS',
      ], true),
      block([`MUR TAILLE, GRAINE ${seed}`, `${total(dressed.used)} MOELLONS`], dressed.grid, dressed.used, [
        `1,60 X 0,80 M - ${size(dressed.grid)}`,
        '4 ASSISES DE 20 CM A PEU PRES,',
        'LONGUEURS MELEES ET BOUTISSES,',
        'JOINTS DECALES ET FINS : CONTOUR',
        'SEUL OU 1 PX DE TERRE, ECLATS',
      ], false),
    ];
  });
  const HEAD = 'PIERRE BRUTE > MUR BRUT    MOELLON > MUR TAILLE    (X4, CASE 1,60 M)';
  const rowH = (bs: Block[]) => Math.max(...bs.map((b) => b.h)) + 36;
  const width = PAD * 2 + Math.max(textWidth(HEAD, T), ...rows.map(([a, b]) => a.w + xerosW + b.w));
  const height = 40 + rows.reduce((s, bs) => s + rowH(bs), 0);
  const sheet = new Sheet(width, height, GRASS);
  for (let x = 0; x < width; x += 32 * K) sheet.rect(x, 0, 1, height, GRID);
  for (let y = 0; y < height; y += 32 * K) sheet.rect(0, y, width, 1, GRID);
  sheet.text(HEAD, PAD, 12, GOLD, T);
  let y = 40;
  for (const [a, b] of rows) {
    // les deux murs sur la même ligne de sol, Xéros entre les deux
    const ground = Math.max(a.ground, b.ground);
    a.draw(sheet, PAD, y + ground - a.ground);
    drawXeros(sheet, PAD + a.w, y + ground);
    b.draw(sheet, PAD + a.w + xerosW, y + ground - b.ground);
    y += rowH([a, b]);
  }
  const out = join(ROOT, '.art-preview', 'essai-murs.png');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  if (process.env.MURS_DUMP) for (const seed of SEEDS) {
    console.log(`brut ${seed}\n${roughWall(seed).grid.join('\n')}\ntaille ${seed}\n${dressedWall(seed).grid.join('\n')}`);
  }
  console.log(`essai-murs -> ${out}`);
}

main();
