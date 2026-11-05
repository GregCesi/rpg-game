// Planches de contrôle des quarts sud de la place resserrée (chantier « village », CADRAGE-village.md section 14 ; hors jeu : rien ici
// n'entre dans le jeu) : npx tsx tools/essai-place-sud.ts [dehors|dedans|pieces] écrit (sans argument : tout)
//   .art-preview/place-sud-dehors.png  d'abord les trois bâtiments ensemble à leur place autour du rond (x1 : la solution 1 à gauche,
//                                      la solution 2 à droite) ; puis chaque bâtiment en x2 : la solution 1 (l'appentis et les étals),
//                                      la solution 2 toit plein, la solution 2 devant la porte (la boutique fondue à 0,35 comme le jeu),
//                                      Xéros à côté, le titre et qui y vit et travaille dessous ;
//   .art-preview/place-sud-dedans.png  toit effacé, mur sud coupé comme le jeu, x2 ; la mercière et la tailleuse : le rez et l'étage côte
//                                      à côte ;
//   .art-preview/place-sud-pieces.png  chaque pièce nouvelle, toutes ses vues, x4, à côté de Xéros, nom, dimensions et gabarit dessous.
//
// Rien n'est dessiné ici : l'outil monte les exports de art/proposals/place-sud.ts (et place-sud-pieces.ts), rendus par le `render` de
// l'essai de la maison de Xéros (art/proposals/maison-xeros.ts), le texte avec la police à accents (art/proposals/village-plan-font.ts).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Grid, Palette } from '../art/lib/canvas';
import type { Board, Scene } from '../art/lib/volumes';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import { bounds, hash, render, type Bounds, type Layer } from '../art/proposals/maison-xeros';
import { BUILDINGS, BUILDINGS_S2, FOOTPRINTS, NOTES, PLACE_RADIUS, PLACE_SUD_DIRT, S2_SHOPS, fadeHoles, s2Reveal } from '../art/proposals/place-sud';
import { PIECES, PIECE_MODELS, PIECE_USERS } from '../art/proposals/place-sud-pieces';
import { PLACE_META, type PlaceBuildingId } from '../art/proposals/place-types';
import { PLACE, WAYS, type Rect } from '../art/proposals/village-plan-data';
import type { PlaceBuilding } from '../art/proposals/place-types';
import { fontWidth, write as writeText, wrap } from '../art/proposals/village-plan-font';
import { blank, rect, toPng, type Img, type RGBA } from './lib/world-render';
import { expectedSize, silhouette, TOLERANCE } from '../src/content/gabarit';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: RGBA = [58, 52, 44, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const GREY: RGBA = [205, 200, 185, 255];
const GOLD: RGBA = [245, 215, 120, 255];
const DIM: RGBA = [150, 142, 124, 255];
const RED: RGBA = [230, 120, 100, 255];
const GREEN: RGBA = [150, 210, 130, 255];

// =====================================================================================================================
// Les images du jeu, le sol
// =====================================================================================================================

const byName = new Map(sources.map((s) => [s.name, s]));
function frameOf(name: string): { grid: Grid; pal: Palette } {
  const s = byName.get(name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-place-sud : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
const XEROS = frameOf('xeros');
const XS = silhouette(XEROS.grid, XEROS.pal);
function xerosAt(x: number, y: number): Board {
  return { grid: XEROS.grid, pal: XEROS.pal, x: Math.round(x - XS.x - XS.w / 2), y: Math.round(y - (XS.y + XS.h)), depth: () => y };
}
const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
const tileColor = (t: Grid, pal: Palette, x: number, y: number) => pal[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
const yard15 = worldTiles.tiles['yard-15'];

/**
 * Le sol autour d'un bâtiment posé à `at` (px de la zone village) : la terre battue de la place (le disque), des rues et des ruelles,
 * des cours du bâtiment ; l'herbe ailleurs. Au pixel, comme les cours des maisons de pierre.
 */
function groundAround(at: [number, number], yards: Rect[]): (x: number, y: number) => string {
  const ways = WAYS.filter((w) => w.zone === 'village').map((w) => w.rect);
  const [cx, cy] = PLACE.center;
  return (x, y) => {
    const zx = x + at[0], zy = y + at[1];
    const dirt = Math.hypot(zx - cx, zy - cy) <= PLACE_RADIUS || ways.some((r) => zx >= r[0] && zx < r[2] && zy >= r[1] && zy < r[3])
      || PLACE_SUD_DIRT.some((r) => zx >= r[0] && zx < r[2] && zy >= r[1] && zy < r[3])
      || yards.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3]);
    if (dirt) return tileColor(yard15, worldTiles.palette, x + at[0], y + at[1]);
    const tx = Math.floor((x + at[0]) / 32), ty = Math.floor((y + at[1]) / 32);
    return tileColor(worldTiles.tiles[GRASS[Math.floor(hash(5, tx, ty) * GRASS.length)]], worldTiles.palette, x + at[0], y + at[1]);
  };
}
function floorTile(x: number, y: number): string {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  return tileColor(interiorTiles.tiles[FLOOR[Math.floor(hash(6, cx, cy) * FLOOR.length)]], interiorTiles.palette, x, y);
}

// =====================================================================================================================
// La planche : des blocs rangés en lignes (comme tools/essai-village-maisons.ts)
// =====================================================================================================================

const S = 2, LH = 24;
interface Line { s: string; c: RGBA }
interface Block { title: Line[]; notes: Line[]; w: number; h: number; draw: (img: Img, x: number, y: number) => void }

function blitLayer(img: Img, l: Layer, ox: number, oy: number, k: number): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    rect(img, ox + x * k, oy + y * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2], 255]);
  }
}
function blitGrid(img: Img, grid: Grid, pal: Palette, ox: number, oy: number, k: number): void {
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    const h = pal[ch].replace('#', '');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    rect(img, ox + x * k, oy + y * k, k, k, [n(0), n(2), n(4), h.length === 8 ? n(6) : 255]);
  }));
}
function lines(s: string, w: number, c: RGBA): Line[] {
  return wrap(s, Math.max(20, Math.floor(w / (6 * S)))).map((x) => ({ s: x, c }));
}
function sheet(blocks: Block[], head: string[], maxW: number): Img {
  const PAD = 24, GAP = 40;
  const bw = (b: Block) => Math.max(b.w, ...[...b.title, ...b.notes].map((l) => fontWidth(l.s, S)));
  const rows: Block[][] = [];
  for (const b of blocks) {
    const r = rows[rows.length - 1];
    if (r && r.reduce((s, x) => s + bw(x) + GAP, 0) + bw(b) <= maxW - 2 * PAD) r.push(b);
    else rows.push([b]);
  }
  const hl = head.flatMap((h, i) => lines(h, maxW - 2 * PAD, i === 0 ? GOLD : GREY));
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.title.length)) * LH + 8 + Math.max(...r.map((b) => b.h)) + 10 + Math.max(...r.map((b) => b.notes.length)) * LH + GAP);
  const W = Math.max(...rows.map((r) => PAD * 2 + r.reduce((s, b) => s + bw(b) + GAP, 0) - GAP), ...hl.map((l) => PAD * 2 + fontWidth(l.s, S)));
  const H = PAD + hl.length * LH + 16 + rowH.reduce((a, b) => a + b, 0);
  const img = blank(W, H, BG);
  hl.forEach((l, i) => writeText(img, l.s, PAD, PAD + i * LH, S, l.c, null));
  let y = PAD + hl.length * LH + 16;
  rows.forEach((r, ri) => {
    let x = PAD;
    const th = Math.max(...r.map((b) => b.title.length)) * LH + 8, ih = Math.max(...r.map((b) => b.h));
    for (const b of r) {
      b.title.forEach((l, i) => writeText(img, l.s, x, y + i * LH, S, l.c, null));
      b.draw(img, x, y + th + ih - b.h);
      b.notes.forEach((l, i) => writeText(img, l.s, x, y + th + ih + 10 + i * LH, S, l.c, null));
      x += bw(b) + GAP;
    }
    y += rowH[ri];
  });
  return img;
}
function save(img: Img, name: string): void {
  const out = join(ROOT, '.art-preview', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, toPng(img));
  console.log(`essai-place-sud -> ${out} (${img.w} x ${img.h})`);
}
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

// =====================================================================================================================
// 1. Dehors
// =====================================================================================================================

const O: [number, number] = [0, 0];
const byId = (id: PlaceBuildingId) => BUILDINGS.find((b) => b.id === id)!;
const byId2 = (id: PlaceBuildingId) => BUILDINGS_S2.find((b) => b.id === id)!;

/** Une scène rendue sur son sol, dans un cadre qui couvre au moins l'emprise ; `extra` : des scènes de plus (la vue nue du fondu). */
function frameOf2(b: PlaceBuilding, scene: Scene): Bounds {
  const bb = bounds(scene, [16, 16, 16, 16]);
  return [Math.min(bb[0], -16), Math.min(bb[1], -16), Math.max(bb[2], b.size[0] + 16), Math.max(bb[3], b.size[1] + 16)];
}
function withXeros(sc: Scene, xs: [number, number][]): Scene {
  return { ...sc, boards: [...sc.boards, ...xs.map(([x, y]) => xerosAt(x, y))], floor: undefined };
}
type View = 's1' | 's2' | 's2-fondu';
function viewLayer(id: PlaceBuildingId, v: View): { l: Layer; bd: Bounds } {
  const n = NOTES[id]!, b = byId(id);
  const g = groundAround(b.at, n.yards);
  if (v === 's1') {
    const sc = withXeros(b.outside(O, 0), n.xeros);
    const bd = frameOf2(b, sc);
    return { l: render(sc, bd, { grass: g, floor: g }), bd };
  }
  const shops = S2_SHOPS[id]!;
  if (v === 's2') {
    const sc = withXeros(byId2(id).outside(O, 0), n.xeros);
    const bd = frameOf2(b, sc);
    return { l: render(sc, bd, { grass: g, floor: g }), bd };
  }
  const r = s2Reveal(id, O, 0), xs = shops.map((s) => s.door);
  const full = withXeros(r.full, xs), bare = withXeros(r.bare, xs);
  const bd = frameOf2(b, full);
  const lf = render(full, bd, { grass: g, floor: g });
  const inB = (x: number, y: number) => FOOTPRINTS[id]!.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3]);
  const fl = (x: number, y: number) => (inB(x, y) ? floorTile(x, y) : g(x, y));
  const lb = render(bare, bd, { grass: fl, floor: fl });
  return { l: fadeHoles(lf, lb, r.holes), bd };
}

function outsideBlock(id: PlaceBuildingId): Block {
  const K = 2, b = byId(id), meta = PLACE_META[id], n = NOTES[id]!;
  const vs: View[] = ['s1', 's2', 's2-fondu'];
  const ls = vs.map((v) => viewLayer(id, v).l);
  const GAP = 24;
  const w = ls.reduce((s, l) => s + l.w * K + GAP, 0) - GAP, hh = Math.max(...ls.map((l) => l.h * K));
  const cap = ['Solution 1 : l’appentis, les étals devant', 'Solution 2 : toit plein', 'Solution 2 : Xéros devant la porte, la boutique fondue à 0,35'];
  return {
    title: [{ s: n.title, c: GOLD }, ...lines(n.who, w, WHITE)],
    notes: [
      ...n.lines.flatMap((s) => lines(s, w, GREY)),
      ...n.s2.flatMap((s) => lines(s, w, GREY)),
      ...lines(`Emprise ${fmt(b.size[0] * 0.05)} x ${fmt(b.size[1] * 0.05)} m (étals et cour compris) ; posé en (${b.at[0]}, ${b.at[1]}) de la zone village ; parcelle ${meta.parcel}`, w, DIM),
    ],
    w, h: hh + LH,
    draw: (img, x, y) => {
      let cx = x;
      ls.forEach((l, i) => {
        writeText(img, cap[i], cx, y, S, GOLD, null);
        blitLayer(img, l, cx, y + LH + hh - l.h * K, K);
        cx += l.w * K + GAP;
      });
    },
  };
}

/** Les trois bâtiments ensemble à leur place autour du rond, une solution ; le rond pointillé. */
function ensembleLayer(sol: 1 | 2): Layer {
  const OX = 2640, OY = 1900, list = sol === 1 ? BUILDINGS : BUILDINGS_S2;
  const quads: Scene['quads'] = [], boards: Scene['boards'] = [];
  const yards: Rect[] = [];
  for (const b of list) {
    const o: [number, number] = [b.at[0] - OX, b.at[1] - OY];
    const sc = b.outside(o, 0);
    quads.push(...sc.quads); boards.push(...sc.boards);
    for (const r of NOTES[b.id]!.yards) yards.push([r[0] + o[0], r[1] + o[1], r[2] + o[0], r[3] + o[1]]);
    const xs = sol === 1 ? NOTES[b.id]!.xeros.slice(0, 1) : S2_SHOPS[b.id]!.map((s) => s.door);
    boards.push(...xs.map(([x, y]) => xerosAt(x + o[0], y + o[1])));
  }
  const g = groundAround([OX, OY], yards);
  const l = render({ quads, boards }, [-10, -10, 1310, 870], { grass: g, floor: g });
  // le rond (rayon 10 m), en pointillé
  const [cx, cy] = [PLACE.center[0] - OX + 10, PLACE.center[1] - OY + 10];
  for (let a = 0; a < 720; a++) {
    if (a % 6 > 2) continue;
    const X = Math.round(cx + Math.cos((a / 720) * Math.PI * 2) * PLACE_RADIUS), Y = Math.round(cy + Math.sin((a / 720) * Math.PI * 2) * PLACE_RADIUS);
    if (X >= 0 && Y >= 0 && X < l.w && Y < l.h) l.rgba.set([245, 215, 120, 255], (Y * l.w + X) * 4);
  }
  return l;
}
function ensembleBlock(): Block {
  const ls = [ensembleLayer(1), ensembleLayer(2)], GAP = 24;
  const w = ls.reduce((s, l) => s + l.w + GAP, 0) - GAP, hh = Math.max(...ls.map((l) => l.h));
  return {
    title: [{ s: 'Les quarts sud en place autour du rond (x1) : à gauche la solution 1, à droite la solution 2', c: GOLD }],
    notes: lines('Le rond de 20 m en pointillé (le grand arbre, les bancs, le panneau, l’abreuvoir : place-centre.ts) ; la terre battue jusqu’aux façades ; la tailleuse au sud-ouest, la ferme rivale et la mercière au sud-est. Xéros : à gauche devant les étals, à droite devant chaque porte de boutique (cachée sous le toit).', w, GREY),
    w, h: hh,
    draw: (img, x, y) => { let cx = x; for (const l of ls) { blitLayer(img, l, cx, y, 1); cx += l.w + GAP; } },
  };
}

// =====================================================================================================================
// 2. Dedans
// =====================================================================================================================

function insideLayer(id: PlaceBuildingId, level: 0 | 1): Layer {
  const b = byId(id), n = NOTES[id]!;
  const sc0 = b.inside(O, level, 0);
  const xs = level ? n.inXeros1 : n.inXeros0;
  // à l'étage, Xéros se tient sur le plancher (2,85 m : 57 px), relevé comme tout ce qui y est posé
  const xb = xs ? [{ ...xerosAt(xs[0], xs[1]), y: xerosAt(xs[0], xs[1]).y - (level ? 57 : 0) }] : [];
  const sc: Scene = { ...sc0, boards: [...sc0.boards, ...xb] };
  const bd = bounds(sc, [12, 12, 12, 12]);
  const g = groundAround(b.at, n.yards);
  const fl = (x: number, y: number) => (FOOTPRINTS[id]!.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3]) ? floorTile(x, y) : g(x, y));
  return render(sc, bd, { grass: fl, floor: fl });
}

function insideBlock(id: PlaceBuildingId): Block {
  const K = 2, b = byId(id), n = NOTES[id]!;
  const levels: (0 | 1)[] = b.levels === 2 ? [0, 1] : [0];
  const ls = levels.map((lv) => insideLayer(id, lv));
  const GAP = 24;
  const w = ls.reduce((s, l) => s + l.w * K + GAP, 0) - GAP;
  const hh = Math.max(...ls.map((l) => l.h * K));
  return {
    title: [{ s: `${n.title} : le dedans`, c: GOLD }, ...lines(n.who, w, WHITE)],
    notes: [
      ...(b.levels === 2 ? [{ s: 'à gauche le rez-de-chaussée, à droite l’étage (le rez omis, l’escalier dans la pénombre sous la trémie)', c: GREY }] : []),
      ...n.inside.flatMap((s) => lines(s, w, GREY)),
      ...lines('Toit effacé, mur sud coupé à 70 cm comme le jeu ; Xéros dedans pour l’échelle', w, DIM),
    ],
    w, h: hh,
    draw: (img, x, y) => {
      let cx = x;
      for (const l of ls) { blitLayer(img, l, cx, y + hh - l.h * K, K); cx += l.w * K + GAP; }
    },
  };
}

// =====================================================================================================================
// 3. Les pièces
// =====================================================================================================================

const BUILDING_NAME: Record<string, string> = { 'p-ferme-rivale': 'la ferme rivale', 'p-merciere': 'la mercière', 'p-tailleuse': 'la tailleuse' };

function pieceBlock(k: number): Block {
  const p = PIECES[k], m = PIECE_MODELS[k], K = 4, GAP = 6;
  const views = p.views();
  const H = Math.max(XS.y + XS.h, ...views.map((v) => v.grid.length));
  const W = views.reduce((a, v) => a + v.grid[0].length + GAP, 0) + XS.w;
  const w = W * K, tw = Math.max(w, 520);
  const dims = { ...p.dims, shape: 'box' as const, ground: m.ground };
  const checks = views.map((v, r) => {
    const s = silhouette(v.grid, v.pal);
    const d = r % 2 ? { ...dims, w: p.dims.d, d: p.dims.w } : dims;
    const e = expectedSize(d);
    const ok = Math.abs(s.w - e.w) <= TOLERANCE + (e.wMax - e.w) && Math.abs(s.h - e.h) <= TOLERANCE + (e.hMax - e.h);
    return { s, e, ok };
  });
  const sym = ['', 'une vue (ronde)', 'deux vues (symétrique)', '', 'quatre vues, R0 à R3'][views.length];
  return {
    title: [...lines(p.name, tw, GOLD), { s: p.key, c: DIM }],
    notes: [
      ...lines(`${p.dims.w} x ${p.dims.d} x ${p.dims.h} cm ; ${sym}${m.ground ? ' ; pièce de bâtiment (profondeur à l’échelle du sol)' : ''}`, tw, WHITE),
      ...lines(m.note, tw, GREY),
      ...lines(`Pour ${(PIECE_USERS[p.key] ?? []).map((u) => BUILDING_NAME[u] ?? u).join(', ')}`, tw, GREY),
      ...checks.map((c, r) => ({ s: `R${r} ${c.s.w}x${c.s.h} px, gabarit ${Math.round(c.e.w)}x${Math.round(c.e.h)} : ${c.ok ? 'juste' : m.form ? 'la forme (ci-dessous)' : 'HORS'}`, c: c.ok ? GREEN : m.form ? GOLD : RED })),
      ...(m.form && checks.some((c) => !c.ok) ? lines(`Forme : ${m.form}`, tw, GOLD) : []),
    ],
    w: tw, h: H * K + 4,
    draw: (img, x, y) => {
      let cx = x;
      for (const v of views) { blitGrid(img, v.grid, v.pal, cx, y + (H - v.grid.length) * K, K); cx += (v.grid[0].length + GAP) * K; }
      blitGrid(img, XEROS.grid, XEROS.pal, cx - XS.x * K, y + (H - (XS.y + XS.h)) * K, K);
      rect(img, x, y + H * K + 2, w, 2, [110, 104, 90, 255]);
    },
  };
}

// =====================================================================================================================

function main(): void {
  const only = process.argv[2];
  const ids: PlaceBuildingId[] = ['p-ferme-rivale', 'p-merciere', 'p-tailleuse'];
  if (!only || only === 'pieces') save(sheet(PIECES.map((_, k) => pieceBlock(k)), [
    'La place du village, quarts sud : les pièces nouvelles, x4 (essai hors jeu)',
    'Toutes leurs vues R0 à R3 selon leur symétrie, Xéros à droite (1,60 m) ; dessous : le nom, les dimensions (est-ouest x nord-sud x hauteur), ce qui la distingue, qui s’en sert, le gabarit de chaque vue (docs/STYLE.md section 8, tolérance 2 px)',
  ], 2600), 'place-sud-pieces.png');
  if (!only || only === 'dehors') save(sheet([ensembleBlock(), ...ids.map(outsideBlock)], [
    'La place resserrée, quarts sud, dehors : les deux solutions de 14.2 (essai hors jeu)',
    'x1 puis x2 ; 5 cm par px, projection du jeu (x, y - z) ; chaque bâtiment à sa place de la zone village : le rond, les rues et les cours en terre battue autour ; Xéros pour l’échelle',
  ], 3000), 'place-sud-dehors.png');
  if (!only || only === 'dedans') save(sheet(ids.map(insideBlock), [
    'La place du village, quarts sud, dedans (essai hors jeu)',
    'x2 ; toits effacés, mur sud coupé comme le jeu, meubles du jeu et pièces nouvelles à leur place',
  ], 2600), 'place-sud-dedans.png');
}
main();
