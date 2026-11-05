// Planches de contrôle des maisons de pierre du village (chantier « village », hors jeu : rien ici n'entre dans le jeu) :
// npx tsx tools/essai-village-pierre.ts écrit
//   .art-preview/village-pierre-dehors.png  chaque maison dehors, toit posé, x2, le cadre de la vue de départ du jeu (427 × 240 px du
//                                           monde) tracé en or, Xéros à côté, le foyer écrit dessous ;
//   .art-preview/village-pierre-dedans.png  chaque intérieur, toit effacé, mur sud coupé comme le jeu, meubles en place, x2 ; le rez
//                                           puis l'étage (le rez omis) pour le meunier et le maquignon ;
//   .art-preview/village-pierre-pieces.png  chaque pièce nouvelle, toutes ses vues, x4, à côté de Xéros, son nom, ses dimensions et
//                                           son gabarit (src/content/gabarit.ts) dessous.
// Les maisons sont dans art/proposals/village-maisons-pierre.ts ; le rendu est celui de l'essai de la maison de Xéros
// (art/proposals/maison-xeros.ts `render`), celui que l'outil commun (tools/essai-village-maisons.ts) emploiera.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import { bounds, hash, render, type Board, type Layer, type Scene } from '../art/proposals/maison-xeros';
import { HOUSES, HOUSE_NOTES, PIECES } from '../art/proposals/village-maisons-pierre';
import { PIECE_MODELS } from '../art/proposals/village-maisons-pierre-pieces';
import { expectedSize, silhouette, TOLERANCE } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const GOLD: Rgb = [245, 215, 120];
const RED: Rgb = [235, 110, 90];
const GREEN: Rgb = [150, 210, 120];

// ---------- le sol, Xéros ----------

const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
const tileAt = (set: { tiles: Record<string, Grid>; palette: Palette }, names: string[], seed: number) => (x: number, y: number) => {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  const t = set.tiles[names[Math.floor(hash(seed, cx, cy) * names.length)]];
  return set.palette[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
};
const grass = tileAt(worldTiles, GRASS, 5);
const yard = tileAt(worldTiles, ['yard-15'], 7);
const floor = tileAt(interiorTiles, FLOOR, 6);

const byName = new Map(sources.map((s) => [s.name, s]));
function frameOf(name: string): { grid: Grid; pal: Palette } {
  const s = byName.get(name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-village-pierre : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
const XEROS = frameOf('xeros');
/** Xéros, les pieds au milieu en (x, y) de la scène. */
function xerosAt(x: number, y: number): Board {
  const s = silhouette(XEROS.grid, XEROS.pal);
  return { grid: XEROS.grid, pal: XEROS.pal, x: Math.round(x - s.x - s.w / 2), y: Math.round(y - (s.y + s.h)), depth: () => y };
}

// ---------- la planche ----------

interface Block { title: string[]; w: number; h: number; draw: (sh: Sheet, x: number, y: number) => void; notes: string[] }

function blitLayer(sheet: Sheet, l: Layer, ox: number, oy: number, k: number): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    sheet.rect(ox + x * k, oy + y * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2]]);
  }
}

function sheetOf(rows: Block[][], head: string[]): Sheet {
  const PAD = 16, GAP = 28;
  const bw = (b: Block) => Math.max(b.w, ...[...b.title, ...b.notes].map((l) => textWidth(l, T)));
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.title.length * 12 + 8)) + Math.max(...r.map((b) => b.h)) + Math.max(...r.map((b) => b.notes.length * 12)) + 12 + GAP);
  const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map((r) => r.reduce((s, b) => s + bw(b) + GAP, 0)));
  const height = PAD + head.length * 12 + 12 + rowH.reduce((a, b) => a + b, 0);
  const sheet = new Sheet(width, height, BG);
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));
  let y = PAD + head.length * 12 + 12;
  rows.forEach((r, ri) => {
    let x = PAD;
    const th = Math.max(...r.map((b) => b.title.length * 12 + 8)), ih = Math.max(...r.map((b) => b.h));
    for (const b of r) {
      b.title.forEach((l, i) => sheet.text(l, x, y + i * 12, i === 0 ? GOLD : WHITE, T));
      b.draw(sheet, x, y + th + ih - b.h);
      b.notes.forEach((l, i) => sheet.text(l, x, y + th + ih + 6 + i * 12, i === 0 ? WHITE : GREY, T));
      x += bw(b) + GAP;
    }
    y += rowH[ri];
  });
  return sheet;
}

function write(name: string, sheet: Sheet): void {
  const out = join(ROOT, '.art-preview', `${name}.png`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`${name} -> ${out}`);
}

const VIEW_W = 427, VIEW_H = 240;

/** Une maison dehors : la scène rendue, le cadre de la vue de départ (or), Xéros. */
function outsideBlock(i: number): Block {
  const H = HOUSES[i], N = HOUSE_NOTES[H.id], K = 2;
  const sc = H.outside([0, 0], 0);
  const scene: Scene = { ...sc, boards: [...sc.boards, xerosAt(N.xeros[0], N.xeros[1])] };
  const fx0 = Math.round(N.frame[0] - VIEW_W / 2), fy0 = Math.round(N.frame[1] - VIEW_H / 2);
  const bd = bounds(scene, [12, 12, 12, 12]);
  bd[0] = Math.min(bd[0], fx0 - 4); bd[1] = Math.min(bd[1], fy0 - 4); bd[2] = Math.max(bd[2], fx0 + VIEW_W + 4); bd[3] = Math.max(bd[3], fy0 + VIEW_H + 4);
  const fl = scene.floor;
  const l = render(scene, bd, { grass, floor: (x, y) => (fl && x >= fl[0] && x < fl[1] && y >= fl[2] && y < fl[3] ? yard(x, y) : grass(x, y)) });
  const t0 = Date.now();
  void t0;
  return {
    title: [`${H.id.toUpperCase()} - DEHORS`, `EMPRISE ${H.size[0] * 5 / 100} X ${H.size[1] * 5 / 100} M (DEBORDS ET COUR COMPRIS)`],
    w: l.w * K, h: l.h * K,
    draw: (sh, x, y) => {
      blitLayer(sh, l, x, y, K);
      sh.outline(x + (fx0 - l.x) * K, y + (fy0 - l.y) * K, VIEW_W * K, VIEW_H * K, GOLD);
      sh.outline(x + (fx0 - l.x) * K + 1, y + (fy0 - l.y) * K + 1, VIEW_W * K - 2, VIEW_H * K - 2, GOLD);
    },
    notes: N.lines,
  };
}

function insideBlock(i: number, level: 0 | 1): Block {
  const H = HOUSES[i], K = 2;
  const sc = H.inside([0, 0], level, 0);
  const bd = bounds(sc, [8, 8, 8, 8]);
  const fl = sc.floor;
  const l = render(sc, bd, { grass, floor: (x, y) => (fl && x >= fl[0] && x < fl[1] && y >= fl[2] && y < fl[3] ? floor(x, y) : grass(x, y)) });
  return {
    title: [`${H.id.toUpperCase()} - ${level ? 'ETAGE (LE REZ OMIS)' : H.levels === 2 ? 'REZ-DE-CHAUSSEE' : 'DEDANS'}`],
    w: l.w * K, h: l.h * K,
    draw: (sh, x, y) => blitLayer(sh, l, x, y, K),
    notes: [level ? 'plancher, tremie, escalier dans la penombre' : 'toit efface, mur sud coupe a 70 cm'],
  };
}

function pieceBlock(k: number): Block {
  const p = PIECES[k], m = PIECE_MODELS[k], K = 4, GAP = 6;
  const views = p.views();
  const xs = silhouette(XEROS.grid, XEROS.pal);
  const dims = { ...p.dims, shape: 'box' as const, ground: m.ground };
  const checks = views.map((v, r) => {
    const s = silhouette(v.grid, v.pal);
    const d = r % 2 ? { ...dims, w: p.dims.d, d: p.dims.w } : dims;
    const e = expectedSize(d);
    const ok = Math.abs(s.w - e.w) <= TOLERANCE + (e.wMax - e.w) && Math.abs(s.h - e.h) <= TOLERANCE + (e.hMax - e.h);
    return { s, e, ok };
  });
  const H = Math.max(xs.h, ...views.map((v) => v.grid.length));
  const W = views.reduce((a, v) => a + v.grid[0].length + GAP, 0) + xs.w + GAP;
  return {
    title: [p.name.toUpperCase(), `${p.key}  ${p.dims.w} X ${p.dims.d} X ${p.dims.h} CM, ${views.length} VUE${views.length > 1 ? 'S' : ''}${m.ground ? ', PIECE DE BATIMENT' : ''}`],
    w: W * K, h: H * K,
    draw: (sh, x, y) => {
      let cx = x;
      for (const v of views) { sh.blit(v.grid, v.pal, cx, y + (H - v.grid.length) * K, K); cx += (v.grid[0].length + GAP) * K; }
      sh.blit(XEROS.grid, XEROS.pal, cx - xs.x * K, y + (H - (xs.y + xs.h)) * K, K, [xs.y, xs.y + xs.h - 1]);
    },
    notes: [
      m.note,
      ...checks.map((c, r) => `R${r} ${c.s.w}X${c.s.h} PX, ATTENDU ${Math.round(c.e.w)}X${Math.round(c.e.h)} ${c.ok ? 'OK' : 'HORS'}`),
    ],
  };
}

function main(): void {
  const which = process.argv[2];
  if (!which || which === 'pieces') {
    const blocks = PIECES.map((_, k) => pieceBlock(k));
    const rows: Block[][] = [];
    for (let k = 0; k < blocks.length; k += 4) rows.push(blocks.slice(k, k + 4));
    write('village-pierre-pieces', sheetOf(rows, ['VILLAGE : LES PIECES NOUVELLES DES MAISONS DE PIERRE (X4)', 'R0 A R3 SELON LEUR SYMETRIE, XEROS A DROITE ; LE GABARIT SOUS CHAQUE VUE (TOLERANCE 2 PX)']));
    void RED; void GREEN;
  }
  if (!which || which === 'dehors') {
    const blocks = HOUSES.map((_, i) => outsideBlock(i));
    write('village-pierre-dehors', sheetOf([[blocks[0], blocks[2]], [blocks[1]], [blocks[3]]], ['VILLAGE : LES MAISONS DE PIERRE, DEHORS (X2)', 'LE CADRE D OR : LA VUE DE DEPART DU JEU, 427 X 240 PX DU MONDE (21,3 X 12 M)']));
  }
  if (!which || which === 'dedans') {
    const b = (i: number, l: 0 | 1) => insideBlock(i, l);
    write('village-pierre-dedans', sheetOf([[b(0, 0), b(2, 0)], [b(1, 0), b(1, 1)], [b(3, 0), b(3, 1)]], ['VILLAGE : LES MAISONS DE PIERRE, DEDANS (X2)', 'TOIT EFFACE, MUR SUD COUPE COMME LE JEU ; LE REZ PUIS L ETAGE']));
  }
}

main();
