// Essai du solin de toute longueur (chantier « maison-2 ») : npx tsx tools/essai-solin-court.ts écrit .art-preview/solin-court.png.
//
// Le même calcul que le jeu (`wallKit().run` de src/world/walls.ts, nourri des pierres de src/generated/wallStones.ts, comme
// world/wallTexture.ts) : pour chaque manière (brut, taillé), chaque sens (est-ouest, nord-sud) et chaque épaisseur (50 cm : dessus
// de 5 rangées ; 30 cm : 3 rangées), les tronçons seuls de 40 à 310 cm, à deux têtes, agrandis x3, à côté de Xéros ; puis des
// morceaux de longueurs mêlées bout à bout (70 + 160 + 40, un seul tronçon comme en jeu, world/wallRuns.ts) et un angle avec un
// nord-sud court. Sous chaque tronçon, sa longueur et le temps du calcul. Le script vérifie aussi, pour toutes les longueurs de 40 à
// 310 cm par pas de 10 : la taille de l'image (rien ne dépasse), le bout du mur plein (pas de vide au bout), pas de trou de mortier
// plus large qu'un joint dans la face du mur taillé, et un calcul de moins de 200 ms ; il sort en erreur sinon.
// Ne touche ni au jeu ni à src/generated/.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import xeros from '../art/characters/xeros';
import type { Grid } from '../art/lib/canvas';
import { silhouette } from '../src/content/gabarit';
import { wallPalette, wallStones } from '../src/generated/wallStones';
import { depthsOf, type BuildPiece } from '../src/world/build';
import { runLayout, runPx, wallRuns, type WallRun } from '../src/world/wallRuns';
import { wallKit, type RunSpec, type WallKind } from '../src/world/walls';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 3;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const WHITE: Rgb = [255, 255, 255];
const GOLD: Rgb = [245, 215, 120];
const RED: Rgb = [230, 60, 50];
const LENGTHS = [40, 50, 60, 70, 80, 100, 120, 150, 160, 200, 270, 310];
const SILL_FACE = 8;

const kit = wallKit((name) => {
  const g = wallStones[name];
  if (!g) throw new Error(`essai-solin-court : pierre ${name} absente de src/generated/wallStones.ts`);
  return g;
});

/** Le tronçon, chronométré. */
function timed(spec: RunSpec): { grid: Grid; ms: number } {
  const t0 = performance.now();
  const grid = kit.run(spec);
  return { grid, ms: performance.now() - t0 };
}

/**
 * Ce qui ne va pas dans un tronçon seul à deux têtes : sa taille (L + 1 sur la hauteur attendue : une pierre qui dépasse l'agrandirait
 * ou serait coupée), le bout plein (la dernière colonne, ou la dernière rangée en nord-sud, sans vide sur la face), et dans le mur
 * taillé, pas de trou de mortier de plus de 2 pixels de large dans la face (une assise qui n'arrive pas au bout le laisse).
 */
function problems(spec: RunSpec, g: Grid): string[] {
  const out: string[] = [];
  const L = spec.length!;
  const top = spec.top ?? 5;
  const ew = spec.axis === 'ew';
  const w = ew ? L + 1 : top + SILL_FACE + 1, h = ew ? top + SILL_FACE + 1 : L + 1;
  if (g.length !== h || g.some((r) => r.length !== w)) return [`taille ${g[0].length}x${g.length} au lieu de ${w}x${h}`];
  // le mur vu le long de son axe : i le long (0 à L - 1), j en travers (0 à D - 1 : du nord au sol en est-ouest, d'ouest en est en nord-sud)
  const D = top + SILL_FACE;
  const A = (i: number, j: number) => (ew ? g[j]?.[i] : g[i]?.[j]) ?? '.';
  const empty = (i: number, j: number) => A(i, j) === '.' || A(i, j) === 'x';
  // 1. les deux bouts pleins : pas de vide de deux pixels de profondeur, ni de trois de haut (le brut, aux pierres arrondies :
  // pas de vide de trois pixels de profondeur)
  const rough = spec.kind === 'rough';
  for (const [e, inn, inn2] of [[0, 1, 2], [L - 1, L - 2, L - 3]]) {
    let run = 0;
    for (let j = 2; j < D - 2; j++) {
      if (empty(e, j) && empty(inn, j) && (!rough || empty(inn2, j))) out.push(`vide au bout ${e ? 'est/sud' : 'ouest/nord'} (${j})`);
      run = empty(e, j) ? run + 1 : 0;
      if (run === 3 && !rough) out.push(`vide au bout ${e ? 'est/sud' : 'ouest/nord'} sur 3 pixels (${j})`);
    }
  }
  // 2. le profil : le dessus du mur commence à la rangée 0 ou 1 (2 pour le brut), le pied va jusqu'au bout (rien ne dépasse, rien ne manque)
  const lim = spec.kind === 'rough' ? 2 : 1;
  for (let i = 2; i < L - 2; i++) {
    let j0 = 0;
    while (j0 < D && empty(i, j0)) j0++;
    if (j0 > lim) { out.push(`creux dans le dessus (${i} : ${j0})`); break; }
    let j1 = D - 1;
    while (j1 > 0 && empty(i, j1)) j1--;
    if (j1 < D - 1 - lim) { out.push(`creux au pied (${i} : ${j1})`); break; }
  }
  // 3. le mur taillé : pas de trou de mortier (une assise qui n'arrive pas au bout le laisse)
  if (spec.kind === 'dressed') {
    const m = (i: number, j: number) => A(i, j) === 'n' || A(i, j) === 'u';
    // (2 de large le long du mur, toute la hauteur d'une assise en travers ; le lit de mortier qui croise un joint ouvert, 2 ou 3
    // rangées au plus, est voulu)
    // (à l'écran : les assises sont des rangées, en est-ouest comme dans la bande du bout d'un nord-sud)
    const s = (x: number, y: number) => g[y]?.[x] === 'n' || g[y]?.[x] === 'u';
    outer: for (let y = 0; y + 3 < g.length; y++) for (let x = 0; x + 1 < g[0].length; x++) {
      if ([0, 1, 2, 3].every((dy) => s(x, y + dy) && s(x + 1, y + dy))) { out.push(`trou de mortier (${x}, ${y})`); break outer; }
    }
    // contre le bout, une colonne de mortier sur 3 rangées : l'assise s'arrête un pixel avant le bout (aucune pierre n'a moins de 3 colonnes)
    for (const i of [1, L - 2]) for (let j = 0; j + 2 < D; j++) if (m(i, j) && m(i, j + 1) && m(i, j + 2)) { out.push(`assise courte d'un pixel (${i}, ${j})`); break; }
  }
  // une tache de terre sur le dessus : du mortier de face (n) au-dessus de la face
  for (let y = 0; y < (ew ? top : L - SILL_FACE); y++) if ((g[y] ?? '').includes('n')) { out.push(`terre de face sur le dessus, rangée ${y}`); break; }
  return out;
}

// ---------- la vérification de toutes les longueurs ----------

const KINDS: WallKind[] = ['rough', 'dressed'];
const AXES = ['ew', 'ns'] as const;
const TOPS = [5, 3];
const NAME: Partial<Record<WallKind, string>> = { rough: 'BRUT', dressed: 'TAILLE' };
let worst = 0;
let worstAt = '';
const failures: string[] = [];
for (const kind of KINDS) for (const axis of AXES) for (const top of TOPS) for (let cm = 40; cm <= 310; cm += 10) for (const seed of [1, 2, 3, 4, 5]) {
  const spec: RunSpec = { kind, axis, length: cm / 5, start: 'head', end: 'head', seed: seed * 7919 + cm, top };
  const { grid, ms } = timed(spec);
  if (ms > worst) { worst = ms; worstAt = `${kind} ${axis} ${top} ${cm} cm`; }
  if (ms > 200) failures.push(`${kind} ${axis} dessus ${top}, ${cm} cm, graine ${spec.seed} : ${Math.round(ms)} ms`);
  for (const p of problems(spec, grid)) failures.push(`${kind} ${axis} dessus ${top}, ${cm} cm, graine ${spec.seed} : ${p}`);
}

// ---------- la planche ----------

const xg = xeros.animations['idle-down'].frames[0];
const xs = silhouette(xg, xeros.palette);
const GAP = 14;

interface Cell { w: number; h: number; draw: (s: Sheet, x: number, ground: number) => void }

/** Un tronçon seul à deux têtes, sa longueur et son temps dessous. */
function runCell(kind: WallKind, axis: 'ew' | 'ns', top: number, cm: number): Cell {
  const spec: RunSpec = { kind, axis, length: cm / 5, start: 'head', end: 'head', seed: 1000 + cm * 3 + top, top };
  const { grid, ms } = timed(spec);
  const bad = problems(spec, grid).length > 0;
  const l1 = `${cm}`, l2 = `${Math.round(ms)} MS`;
  const w = Math.max(grid[0].length * K, textWidth(l1, T), textWidth(l2, T));
  return {
    w,
    h: grid.length * K,
    draw: (s, x, ground) => {
      s.blit(grid, wallPalette, x, ground - grid.length * K, K);
      s.text(l1, x, ground + 8, bad ? RED : WHITE, T);
      s.text(l2, x, ground + 20, GOLD, T);
    },
  };
}

const xerosCell: Cell = {
  w: xs.w * K,
  h: (xs.y + xs.h) * K,
  draw: (s, x, ground) => {
    s.blit(xg, xeros.palette, x - xs.x * K, ground - (xs.y + xs.h) * K, K);
    s.text('XEROS', x, ground + 8, GOLD, T);
  },
};

/** Une rangée : un titre, Xéros, puis les cellules posées sur le même sol. */
interface Row { title: string; cells: Cell[] }
const rows: Row[] = [];
for (const kind of KINDS) for (const axis of AXES) for (const top of TOPS) {
  rows.push({
    title: `${NAME[kind]} - ${axis === 'ew' ? 'EST-OUEST' : 'NORD-SUD'} - ${top === 5 ? '50 CM (DESSUS 5)' : '30 CM (DESSUS 3)'} - DEUX TETES, X3`,
    cells: [xerosCell, ...LENGTHS.map((cm) => runCell(kind, axis, top, cm))],
  });
}

/**
 * Des morceaux posés comme en jeu (world/wallRuns.ts : le tronçon, ses bouts, sa graine ; chaque morceau à sa profondeur), dessinés
 * par le même calcul (`top` : l'épaisseur du mur, comme world/wallTexture.ts) : une cellule.
 */
function layoutCell(prop: string, pieces: BuildPiece[], label: string): Cell {
  const runs = wallRuns(pieces);
  const minX = Math.min(...pieces.map((p) => p.x)) / 5 - 2;
  const draws: { depth: number; draw: (s: Sheet, ox: number, oy: number) => void }[] = [];
  const depth = depthsOf(pieces);
  let maxX = 0, maxY = 0, minY = Infinity;
  let msAll = 0;
  for (const run of runs as WallRun[]) {
    const { grid, ms } = timed({ kind: run.kind, axis: run.axis, length: runPx(run), start: run.start, end: run.end, seed: run.seed, top: Math.round(run.thick / 10), ...(run.extra ? { extra: run.extra } : {}) });
    msAll = Math.max(msAll, ms);
    const lay = runLayout(run, grid[0].length, grid.length);
    maxX = Math.max(maxX, lay.x + grid[0].length);
    maxY = Math.max(maxY, lay.y);
    minY = Math.min(minY, lay.y - grid.length);
    run.pieces.forEach((p, i) => {
      const c = lay.crops[i];
      draws.push({
        depth: depth.get(p.id)!,
        draw: (s, ox, oy) => {
          const sub = grid.slice(c.y, c.y + c.h).map((r) => '.'.repeat(c.x) + r.slice(c.x, c.x + c.w));
          s.blit(sub, wallPalette, ox + (lay.x - minX) * K, oy + (lay.y - grid.length + c.y - minY) * K, K);
        },
      });
    });
  }
  const l2 = `${Math.round(msAll)} MS AU PLUS`;
  void prop;
  return {
    w: Math.max((maxX - minX) * K, textWidth(label, T), textWidth(l2, T)),
    h: (maxY - minY) * K,
    draw: (s, x, ground) => {
      const oy = ground - (maxY - minY) * K;
      for (const d of draws.sort((a, b) => a.depth - b.depth)) d.draw(s, x, oy);
      s.text(label, x, ground + 8, WHITE, T);
      s.text(l2, x, ground + 20, GOLD, T);
    },
  };
}

let id = 1;
const piece = (prop: string, x: number, y: number, view: number, length: number): BuildPiece => ({ id: id++, piece: { prop, length }, x, y, z: 0, view });
const mixed: Cell[] = [xerosCell];
for (const prop of ['rough-sill-wall', 'dressed-sill-wall', 'narrow-sill-wall']) {
  const d = prop === 'narrow-sill-wall' ? 30 : 50;
  // bout à bout, est-ouest : 70 + 160 + 40
  mixed.push(layoutCell(prop, [piece(prop, 0, 0, 0, 70), piece(prop, 70, 0, 0, 160), piece(prop, 230, 0, 0, 40)], `${prop.split('-')[0].toUpperCase()} 70+160+40`));
  // un angle : un est-ouest de 120 et un nord-sud court (60) qui part vers le sud, et un nord-sud de 40 bout à bout de 70
  mixed.push(layoutCell(prop, [piece(prop, 0, 0, 0, 120), piece(prop, 0, d, 1, 60)], `ANGLE 120 + NS 60`));
  mixed.push(layoutCell(prop, [piece(prop, 0, 0, 1, 40), piece(prop, 0, 40, 1, 70)], `NS 40+70`));
}
rows.push({ title: 'BOUT A BOUT (70 + 160 + 40), ANGLES, NORD-SUD MELES - BRUT, TAILLE, ETROIT', cells: mixed });

const PAD = 16;
const rowH = (r: Row) => Math.max(...r.cells.map((c) => c.h)) + 16 + 36;
const rowW = (r: Row) => r.cells.reduce((s, c) => s + c.w + GAP, 0) - GAP;
const width = Math.max(...rows.map(rowW)) + PAD * 2;
const height = rows.reduce((s, r) => s + rowH(r), 0) + PAD * 2 + 40;
const sheet = new Sheet(width, height, GRASS);
let y = PAD;
const head = `PIRE TEMPS ${Math.round(worst)} MS (${worstAt.toUpperCase()}) - ${failures.length} DEFAUT${failures.length > 1 ? 'S' : ''} SUR 40 A 310 CM, 5 GRAINES`;
sheet.text(head, PAD, y, failures.length ? RED : GOLD, T);
y += 28;
for (const r of rows) {
  sheet.text(r.title, PAD, y, GOLD, T);
  const ground = y + 16 + Math.max(...r.cells.map((c) => c.h));
  let x = PAD;
  for (const c of r.cells) { c.draw(sheet, x, ground); x += c.w + GAP; }
  y += rowH(r);
}
const out = join(ROOT, '.art-preview', 'solin-court.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-solin-court : ${out}`);
console.log(`pire temps : ${worst.toFixed(1)} ms (${worstAt})`);
if (failures.length) {
  console.log(`${failures.length} défaut(s) :`);
  for (const f of failures.slice(0, Number(process.env.MAX ?? 60))) console.log(`  ${f}`);
  process.exitCode = 1;
}
