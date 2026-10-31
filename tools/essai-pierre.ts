// Essai de la pierre (chantier « pierre ») : npx tsx tools/essai-pierre.ts écrit .art-preview/essai-pierre.png.
//
// Pose côte à côte les propositions de dessin de la pierre (art/proposals/pierre-a.ts, pierre-b.ts, pierre-c.ts : celles qui
// existent), pour que Grégoire choisisse avant toute intégration. Agrandi x4, sur la grille des cases (32 px du jeu, 1,60 m),
// avec Xéros pour l'échelle. Une bande par proposition, son titre (« A », « B », « C ») :
//   1. la pierre brute de carrière, ses deux tailles et ses deux formes par taille (mesures et masse dessous), puis un petit
//      pierrier de 7 pierres composé à partir de ces dessins (les pierres du dessus calées dans les creux) ;
//   2. la chaîne du moellon : la grosse pierre brute > les trois moellons (est-ouest et nord-sud) + les éclats ;
//   3. un muret d'essai de 1,60 m sur 60 cm (25 cm d'épaisseur), monté par calcul à partir des faces de moellon du module
//      (`wall`), à graine fixe : longueurs mélangées dans chaque assise, joints décalés d'au moins 10 cm d'une assise à
//      l'autre, joints de mortier de terre d'un pixel, éclats calés dans les joints, dessus de l'assise haute visible ;
//   4. sous la bande, la ligne du parti pris.
// Le contrat d'un module est dans art/proposals/types.ts. Ajouter une proposition : créer art/proposals/pierre-<x>.ts et ajouter
// <x> à PROPOSALS ci-dessous (les fichiers absents sont sautés). Ne touche ni au jeu ni à src/generated/.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { Canvas, EMPTY, rng, type Grid, type Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import rocks from '../art/world/rocks-bushes';
import { outline } from '../art/items/lib';
import { bodyOf, castShadow } from '../art/proposals/lib';
import { COURSE_PX, OBJECTS, RUBBLE_LENGTHS, WALL_TOP_PX, type RubbleLength, type StoneProposal } from '../art/proposals/types';
import { silhouette } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

/** Les propositions, dans l'ordre de la planche : art/proposals/pierre-<x>.ts. */
const PROPOSALS = ['a', 'b', 'c'];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 4;
const PAD = 12;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const GRID: Rgb = [110, 120, 60];
const BAND: Rgb = [104, 113, 58];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

// ---------- le pierrier ----------

/** Plus haut pixel plein de chaque colonne (la surface du tas), ou Infinity. */
function surface(c: Canvas): number[] {
  return Array.from({ length: c.w }, (_, x) => {
    for (let y = 0; y < c.h; y++) if (c.get(x, y) !== EMPTY) return y;
    return Infinity;
  });
}

/** Plus bas pixel plein de chaque colonne d'une grille, ou -1. */
function bottom(g: Grid): number[] {
  return Array.from({ length: g[0].length }, (_, x) => {
    for (let y = g.length - 1; y >= 0; y--) if (g[y][x] !== EMPTY) return y;
    return -1;
  });
}

/**
 * Un petit pierrier de 7 pierres : au fond deux pierres, devant trois au sol, deux au-dessus calées dans les creux (chacune
 * sur la jonction de deux pierres du dessous, enfoncée de 2 px dans le creux), une moyenne roulée au pied, devant. Les ombres des pierres sont
 * retirées, le tas a son ombre à lui.
 */
function pile(p: StoneProposal): Grid {
  const [ma, mb] = p.rough.medium.map(bodyOf);
  const [ba, bb] = p.rough.big.map(bodyOf);
  const W = 44, H = 34, GROUND = H - 1;
  const c = new Canvas(W, H);
  const put = (g: Grid, x: number, y: number) => c.stamp(g, x, y);
  // posée au sol, son bas sur la ligne de sol décalée de `back` vers le nord
  const ground = (g: Grid, x: number, back = 0) => { put(g, x, GROUND - back - g.length + 1); return x + g[0].length; };
  // calée : centrée sur `cx`, descendue jusqu'à toucher la surface, puis enfoncée de `sink`
  const rest = (g: Grid, cx: number, sink = 2) => {
    const s = surface(c), b = bottom(g);
    const x0 = Math.round(cx - g[0].length / 2);
    let off = Infinity;
    b.forEach((by, i) => { if (by >= 0 && Number.isFinite(s[x0 + i])) off = Math.min(off, s[x0 + i] - 1 - by + sink); });
    put(g, x0, off);
  };
  // au fond
  const backX = 6;
  ground(ma, backX, 4);
  ground(bb, backX + ma[0].length - 1, 3);
  // devant
  const x1 = ground(ba, 3) - 1;
  const x2 = ground(mb, x1) - 1;
  const x3 = ground(bb, x2);
  // au-dessus, sur les jonctions
  rest(mb, x1 - 1, 3);
  rest(ba, x2 + 1, 2);
  // une moyenne roulée au pied du tas, devant la grosse de l'est
  ground(ma, x3 - 3);
  return castShadow(bodyOf(c.toGrid()));
}

// ---------- le muret ----------

const WALL_PX = 32; // 1,60 m
const COURSES = 3; // 60 cm

/** Une assise : longueurs en pixels (joint compris), au moins deux longueurs différentes, somme WALL_PX. */
function course(r: () => number): number[] {
  for (;;) {
    const out: number[] = [];
    let sum = 0;
    while (sum < WALL_PX) {
      const fits = RUBBLE_LENGTHS.map((l) => l / 5).filter((l) => sum + l <= WALL_PX && (WALL_PX - sum - l === 0 || WALL_PX - sum - l >= 6));
      if (!fits.length) break;
      const l = fits[Math.floor(r() * fits.length)];
      out.push(l);
      sum += l;
    }
    if (sum === WALL_PX && new Set(out).size >= 2) return out;
  }
}

const jointsOf = (lens: number[]) => lens.slice(0, -1).map((_, i) => lens.slice(0, i + 1).reduce((a, b) => a + b, 0));

/**
 * Les assises du muret, de haut en bas : chaque joint vertical à au moins 2 px (10 cm) de tout joint de l'assise voisine,
 * et jamais aligné avec un joint de l'assise d'après (deux assises plus bas).
 */
function courses(seed: number): number[][] {
  const r = rng(seed);
  const out: number[][] = [];
  while (out.length < COURSES) {
    const c = course(r);
    const j = jointsOf(c);
    const near = out.length ? jointsOf(out[out.length - 1]) : [];
    const far = out.length > 1 ? jointsOf(out[out.length - 2]) : [];
    if (j.every((a) => near.every((b) => Math.abs(a - b) >= 2) && !far.includes(a))) out.push(c);
  }
  return out;
}

/**
 * Le muret monté : le mortier au fond, les faces des moellons posées par assise (hauteur 3 ou 4, tirée), le dessus des pierres
 * de l'assise haute au-dessus de leur face (le mortier des joints aussi sur le dessus), des éclats calés dans les joints,
 * puis le contour et l'ombre du mur entier.
 */
function wall(p: StoneProposal, seed: number): Grid {
  const r = rng(seed * 977 + 13);
  const kit = p.wall;
  const y0 = WALL_TOP_PX + 1;
  const c = new Canvas(WALL_PX - 1, y0 + COURSES * COURSE_PX);
  c.rect(0, y0, c.w, COURSES * COURSE_PX, kit.mortar);
  const variants: Record<number, number> = { 30: 0, 40: 0, 50: 0 };
  courses(seed).forEach((lens, ci) => {
    const band = y0 + ci * COURSE_PX;
    let x = 0;
    const tops: { x: number; w: number; y: number }[] = [];
    for (const lp of lens) {
      const len = (lp * 5) as RubbleLength;
      // l'assise du bas pose au sol ; les autres laissent leur joint dessous, parfois dessus (assise pas tirée au cordeau) ;
      // dans l'assise haute, une pierre sur deux environ est plus basse d'un pixel : le dessus du mur n'est pas une règle
      const low = ci === 0 ? (tops.length % 2 === 1) !== (r() < 0.25) : r() < 0.3;
      const h: 3 | 4 = low || r() < 0.5 ? 3 : 4;
      const y = h === 4 ? band : ci === COURSES - 1 || low ? band + 1 : band;
      const v = variants[len]++;
      c.stamp(kit.face(len, h, v), x, y);
      if (ci === 0) {
        const t = kit.top(len, v);
        c.stamp(t, x, y - t.length);
        tops.push({ x, w: lp - 1, y: y - t.length });
      }
      x += lp;
    }
    // le joint vertical se voit aussi sur le dessus, entre deux pierres voisines
    for (let i = 0; i + 1 < tops.length; i++) {
      const jx = tops[i].x + tops[i].w;
      for (let y = Math.max(tops[i].y, tops[i + 1].y); y < y0; y++) c.set(jx, y, kit.mortar);
    }
  });
  // éclats calés dans les joints : là où l'éclat ne couvre que du mortier, loin des autres
  const spots: [number, number][] = [];
  const cw = kit.chip[0].length, ch = kit.chip.length;
  for (let y = y0; y + ch <= c.h; y++) for (let x = 1; x + cw < c.w; x++) {
    let ok = true;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) if (kit.chip[j][i] !== EMPTY && c.get(x + i, y + j) !== kit.mortar) ok = false;
    if (ok) spots.push([x, y]);
  }
  const placed: [number, number][] = [];
  for (let n = 0; n < 40 && placed.length < 5 && spots.length; n++) {
    const [x, y] = spots[Math.floor(r() * spots.length)];
    if (placed.some(([px, py]) => Math.abs(px - x) < 6 && Math.abs(py - y) < 3)) continue;
    c.stamp(kit.chip, x, y);
    placed.push([x, y]);
  }
  const framed = new Canvas(c.w + 2, c.h + 2).stamp(c.toGrid(), 1, 1);
  return castShadow(bodyOf(outline(framed, kit.dark).toGrid()));
}

// ---------- la planche ----------

type Cell = { w: number; art: number; below: number; draw: (s: Sheet, x: number, ground: number) => void };

function imageCell(images: Grid[], palette: Palette, lines: string[], gap = 3): Cell {
  const artW = images.reduce((s, g) => s + g[0].length, 0) * K + (images.length - 1) * gap * K;
  const artH = Math.max(...images.map((g) => g.length)) * K;
  const textW = Math.max(0, ...lines.map((l) => textWidth(l, T)));
  return {
    w: Math.max(artW, textW) + 2 * PAD,
    art: artH,
    below: lines.length * 12 + 10,
    draw: (s, x, ground) => {
      let gx = x + PAD;
      for (const g of images) {
        s.blit(g, palette, gx, ground - g.length * K, K);
        gx += (g[0].length + gap) * K;
      }
      lines.forEach((l, i) => s.text(l, x + PAD, ground + 8 + i * 12, i === 0 ? WHITE : GREY, T));
    },
  };
}

const sign = (t: string): Cell => ({
  w: textWidth(t, 4) + PAD,
  art: 0,
  below: 0,
  draw: (s, x, ground) => s.text(t, x, ground - 30, GOLD, 4),
});

const size = (g: Grid, p: Palette) => { const s = silhouette(g, p); return `${s.w}X${s.h} px`; };

const xg = xeros.animations['idle-down'].frames[0];
const xs = silhouette(xg, xeros.palette);
const xerosCell: Cell = {
  w: Math.max(xs.w * K, textWidth('xeros 1,60 m', T)) + 2 * PAD,
  art: xs.h * K,
  below: 24,
  draw: (s, x, ground) => {
    s.blit(xg, xeros.palette, x + PAD - xs.x * K, ground - (xs.y + xs.h) * K, K);
    s.text('xeros 1,60 m', x + PAD, ground + 8, GOLD, T);
  },
};

// la pierre grise actuelle du jeu (le rocher, rampe R r z Z), pour juger la rampe du calcaire à côté
const rockSrc = rocks.find((s) => s.name === 'rock');
const refCell: Cell = rockSrc?.kind === 'image'
  ? (() => { const g = bodyOf(rockSrc.grid); return imageCell([g], rockSrc.palette, ['reference :', 'rocher gris du jeu']); })()
  : { w: 0, art: 0, below: 0, draw: () => {} };

type Row = { title?: string; cells: Cell[]; note?: string };

function band(p: StoneProposal): Row[] {
  const pal = p.palette;
  const m = OBJECTS.medium, b = OBJECTS.big;
  const roughCell = (g: Grid, o: typeof m | typeof b, form: string) =>
    imageCell([g], pal, [`${o.name} ${form}`, `${o.w}X${o.d}X${o.h} cm`, `${fmt(o.kg)} kg`, size(g, pal)]);
  const pg = pile(p);
  const row1: Row = {
    title: p.id,
    cells: [
      xerosCell,
      roughCell(p.rough.medium[0], m, 'a'),
      roughCell(p.rough.medium[1], m, 'b'),
      roughCell(p.rough.big[0], b, 'a'),
      roughCell(p.rough.big[1], b, 'b'),
      imageCell([pg], pal, ['pierrier', '7 pierres', size(pg, pal)]),
      refCell,
    ],
  };
  const row2: Row = {
    title: 'la chaine du moellon',
    cells: [
      imageCell([p.rough.big[0]], pal, [b.name, `${fmt(b.kg)} kg`]),
      sign('>'),
      ...RUBBLE_LENGTHS.map((l) => {
        const o = OBJECTS.rubble[l];
        const { ew, ns } = p.rubble[l];
        return imageCell([ew, ns], pal, [o.name, `${o.w}X${o.d}X${o.h} cm`, `${fmt(o.kg)} kg`, `${size(ew, pal)} / ${size(ns, pal)}`], 2);
      }),
      sign('+'),
      imageCell([p.chips], pal, [OBJECTS.chips.name, `${OBJECTS.chips.w}X${OBJECTS.chips.d} cm`, `${fmt(OBJECTS.chips.kg)} kg (40 cm)`]),
    ],
  };
  const wg = wall(p, 1);
  const wg2 = wall(p, 2);
  const row3: Row = {
    title: 'muret d essai, monte par calcul (deux graines)',
    cells: [
      imageCell([wg, wg2], pal, ['muret 1,60 X 0,60 m', 'epaisseur 25 cm', size(wg, pal)], 6),
      xerosCell,
    ],
    note: p.stance,
  };
  return [row1, row2, row3];
}

async function main() {
  const proposals: StoneProposal[] = [];
  for (const id of PROPOSALS) {
    const file = join(ROOT, 'art', 'proposals', `pierre-${id}.ts`);
    if (!existsSync(file)) continue;
    proposals.push((await import(pathToFileURL(file).href)).default as StoneProposal);
  }
  if (!proposals.length) throw new Error('essai-pierre : aucune proposition dans art/proposals/ (pierre-a.ts, pierre-b.ts…)');

  const bands = proposals.map(band);
  const rows = bands.flat();
  const art = (r: Row) => Math.max(...r.cells.map((c) => c.art));
  const below = (r: Row) => Math.max(...r.cells.map((c) => c.below));
  const rowH = (r: Row) => (r.title ? 24 : 6) + art(r) + below(r) + (r.note ? 26 : 10);
  const width = Math.max(...rows.map((r) => r.cells.reduce((s, c) => s + c.w, 0)), ...rows.map((r) => textWidth(r.note ?? '', T))) + 3 * PAD;
  const height = rows.reduce((s, r) => s + rowH(r), 10) + bands.length * 20;
  const sheet = new Sheet(width, height, GRASS);
  for (let x = 0; x < width; x += 32 * K) sheet.rect(x, 0, 1, height, GRID);
  for (let y = 0; y < height; y += 32 * K) sheet.rect(0, y, width, 1, GRID);
  let y = 10;
  for (const rs of bands) {
    rs.forEach((r, i) => {
      if (r.title) sheet.text(r.title, PAD, y, i === 0 ? GOLD : WHITE, i === 0 ? 4 : T);
      const ground = y + (r.title ? 24 : 6) + art(r);
      let x = PAD;
      for (const c of r.cells) { c.draw(sheet, x, ground); x += c.w; }
      if (r.note) sheet.text(r.note, PAD, ground + below(r) + 4, GOLD, T);
      y += rowH(r);
    });
    sheet.rect(0, y + 8, width, 2, BAND);
    y += 20;
  }
  const out = join(ROOT, '.art-preview', 'essai-pierre.png');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-pierre : ${proposals.map((p) => p.id).join(', ')} -> ${out}`);
}

await main();
