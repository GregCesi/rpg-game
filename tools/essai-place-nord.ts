// Planches de contrôle des bâtiments des quarts nord de la place (chantier « village », hors jeu : rien ici n'entre dans le jeu) :
// npx tsx tools/essai-place-nord.ts [dehors|dedans|pieces] écrit (sans argument : tout)
//   .art-preview/place-nord-dehors.png  les quarts nord ensemble autour du rond (x2), puis chaque bâtiment dehors, toit posé, x2,
//                                        Xéros à côté, le titre, qui y vit et travaille dessous ;
//   .art-preview/place-nord-dedans.png  les mêmes, toit effacé, mur sud coupé comme le jeu, x2 (le rez, puis l'étage) ;
//   .art-preview/place-nord-pieces.png  chaque pièce nouvelle, toutes ses vues, x4, à côté de Xéros, le nom et les dimensions dessous,
//                                        la taille de chaque vue comparée au gabarit (docs/STYLE.md section 8).
// Rien n'est redessiné ici : l'outil monte les exports de art/proposals/place-nord.ts, rendus par le `render` de l'essai de la maison
// de Xéros (art/proposals/maison-xeros.ts) ; le texte par la police à accents des aperçus du village (village-plan-font.ts).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Grid, Palette } from '../art/lib/canvas';
import type { Board, Scene } from '../art/lib/volumes';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import { bounds, hash, render, type Bounds, type Layer } from '../art/proposals/maison-xeros';
import { BUILDINGS, FOOTPRINTS, NORD_YARDS, PIECES, PIECE_INFO, PIECE_USES, PLACE_META, ROND, SHOW, WHO } from '../art/proposals/place-nord';
import type { PlaceBuilding, PlaceBuildingId, VillagePiece } from '../art/proposals/place-types';
import { WAYS, type Rect } from '../art/proposals/village-plan-data';
import { fontWidth, write as writeText, wrap } from '../art/proposals/village-plan-font';
import { blank, rect, toPng, type Img, type RGBA } from './lib/world-render';
import { silhouette } from '../src/content/gabarit';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: RGBA = [58, 52, 44, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const GREY: RGBA = [205, 200, 185, 255];
const GOLD: RGBA = [245, 215, 120, 255];
const DIM: RGBA = [150, 142, 124, 255];
const RED: RGBA = [240, 120, 100, 255];

const byName = new Map(sources.map((s) => [s.name, s]));
function frameOf(name: string): { grid: Grid; pal: Palette } {
  const s = byName.get(name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-place-nord : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
const XEROS = frameOf('xeros');
const XS = silhouette(XEROS.grid, XEROS.pal);
function xerosAt(x: number, y: number): Board {
  return { grid: XEROS.grid, pal: XEROS.pal, x: Math.round(x - XS.x - XS.w / 2), y: Math.round(y - (XS.y + XS.h)), depth: () => y };
}

// =====================================================================================================================
// Le sol : l'herbe, la terre battue des voies, des cours et de la place (la tuile `yard` du jeu), le plancher dedans
// =====================================================================================================================

const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
const tileColor = (t: Grid, pal: Palette, x: number, y: number) => pal[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
function groundOf(yards: Rect[]): (x: number, y: number) => string {
  // le rond resserré de la section 14 (20 m), pas celui de village-plan-data.ts (30,40 m)
  const inPlace = (x: number, y: number) => Math.hypot(x - ROND.center[0], y - ROND.center[1]) < ROND.radius;
  const isYard = (cx: number, cy: number) => {
    const X = cx * 32 + 16, Y = cy * 32 + 16;
    return inPlace(X, Y) || yards.some((r) => X >= r[0] && X < r[2] && Y >= r[1] && Y < r[3]);
  };
  const cache = new Map<number, Grid>();
  return (x, y) => {
    const cx = Math.floor(x / 32), cy = Math.floor(y / 32), key = cx * 100003 + cy;
    let t = cache.get(key);
    if (!t) {
      if (isYard(cx, cy)) {
        const m = (isYard(cx, cy - 1) ? 1 : 0) | (isYard(cx + 1, cy) ? 2 : 0) | (isYard(cx, cy + 1) ? 4 : 0) | (isYard(cx - 1, cy) ? 8 : 0);
        t = worldTiles.tiles[`yard-${m}`];
      } else t = worldTiles.tiles[GRASS[Math.floor(hash(5, cx, cy) * GRASS.length)]];
      cache.set(key, t);
    }
    return tileColor(t, worldTiles.palette, x, y);
  };
}
const WAYS_RECTS: Rect[] = WAYS.filter((w) => w.zone === 'village').map((w) => w.rect);
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
    const a = h.length === 8 ? n(6) / 255 : 1;
    if (a >= 1) { rect(img, ox + x * k, oy + y * k, k, k, [n(0), n(2), n(4), 255]); return; }
    for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) {
      const X = ox + x * k + xx, Y = oy + y * k + yy, q = (Y * img.w + X) * 4;
      for (let c = 0; c < 3; c++) img.data[q + c] = img.data[q + c] * (1 - a) + n(c * 2) * a;
    }
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
  console.log(`essai-place-nord -> ${out} (${img.w} x ${img.h})`);
}
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

// =====================================================================================================================
// Dehors et dedans
// =====================================================================================================================

const ORDER: PlaceBuildingId[] = ['p-ferme-riche', 'p-bucheron', 'p-menuisier', 'p-panneau'];
const NOTES: Partial<Record<PlaceBuildingId, string>> = {
  'p-ferme-riche': 'La boutique au rond et le logis-réserve sur la rue de l’ouest, à étage : pierre enduite, pierre de taille, cordon, laves, deux vitraux ; l’étal sous l’auvent rayé guède et garance : deux comptoirs sculptés en équerre, présentoirs, claies, pots en pyramide, meules',
  'p-bucheron': 'La boutique au rond, à étage : rez de bardage, trois devantures à volet-tablette, avant-toit, râtelier d’outils ; étage de pan de bois chaulé (le neveu et sa femme) ; les tas qui débordent sur le recoin, le comptoir sur billots',
  'p-menuisier': 'Pan de bois vieux, chaux écaillée, bardeaux troués, volets cloués, enseigne tombée et potence vide, herbe haute, planches oubliées : la future menuiserie de la mère',
  'p-panneau': 'Deux poteaux, le tableau de planches, un toit de bardeaux, les feuillets ; la pierre au pied pour monter lire',
};
const of = (id: PlaceBuildingId): PlaceBuilding => BUILDINGS.find((b) => b.id === id)!;

/** Les quarts nord ensemble, chacun à sa place, autour du rond (la terre battue jusqu'aux façades) ; Xéros devant chaque boutique. */
function ensembleBlock(): Block {
  const K = 2;
  const scs = ORDER.map((id) => of(id).outside(of(id).at, 1));
  const xs = ORDER.map((id) => xerosAt(...SHOW[id]!.xeros));
  const sc: Scene = { quads: scs.flatMap((s) => s.quads), boards: [...scs.flatMap((s) => s.boards), ...xs] };
  const bd: Bounds = bounds(sc, [24, 16, 24, 90]);
  const g = groundOf([...WAYS_RECTS, ...NORD_YARDS]);
  const l = render(sc, bd, { grass: g, floor: g });
  const w = l.w * K;
  // le bord du rond, tracé en pointillé sur la planche (il n'existe pas dans le jeu : la terre battue continue jusqu'aux façades)
  const ring = (img: Img, ox: number, oy: number) => {
    for (let a = 0; a < 720; a++) {
      if (a % 6 > 2) continue;
      const t = (a / 720) * Math.PI * 2, X = ROND.center[0] + Math.cos(t) * ROND.radius - bd[0], Y = ROND.center[1] + Math.sin(t) * ROND.radius - bd[1];
      if (X >= 0 && Y >= 0 && X < l.w && Y < l.h) rect(img, ox + Math.round(X) * K, oy + Math.round(Y) * K, K, K, [240, 230, 200, 255]);
    }
  };
  const fp = Object.entries(FOOTPRINTS).map(([k, r]) => `${k} x ${r[0]}-${r[1]}, y ${r[2]}-${r[3]}`).join(' ; ');
  return {
    title: [{ s: 'Les quarts nord autour du rond (le centre et le sud se posent avec eux)', c: GOLD }, ...lines('Le pointillé : le bord du rond de 20 m (centre 3312, 2128) ; la terre battue va du rond aux façades', w, WHITE)],
    notes: [...lines(`Emprises hors œuvre (px de la zone village) : ${fp}`, w, DIM)],
    w, h: l.h * K,
    draw: (img, x, y) => { blitLayer(img, l, x, y, K); ring(img, x, y); },
  };
}

function sceneBlock(id: PlaceBuildingId, inside: boolean, level: 0 | 1 = 0): Block {
  const K = 2, b = of(id), meta = PLACE_META[id], show = SHOW[id]!;
  // la scène posée à sa place dans la zone (o = at) : le sol de la zone se lit tel quel
  const sc0 = inside ? b.inside(b.at, level, 1) : b.outside(b.at, 1);
  const xp = inside ? show.inXeros : show.xeros;
  const sc: Scene = { ...sc0, boards: [...sc0.boards, xerosAt(xp[0], level ? xp[1] - 57 : xp[1])] };
  const bd: Bounds = bounds(sc, [16, 16, 16, 16]);
  const g = groundOf([...WAYS_RECTS, ...show.yards]);
  const fl = sc.floor;
  const l = render(inside ? sc : { ...sc, floor: undefined }, bd, { grass: g, floor: (x, y) => (inside && fl && x >= fl[0] && x < fl[1] && y >= fl[2] && y < fl[3] ? floorTile(x, y) : g(x, y)) });
  const w = l.w * K;
  return {
    title: [{ s: `${meta.title}${inside ? (level ? ' : l’étage' : ' : le rez') : ''}`, c: GOLD }, ...lines(WHO[id] ?? meta.who, w, WHITE)],
    notes: [
      ...lines(inside ? 'Toit effacé, mur sud coupé à 70 cm comme le jeu ; l’étal et les abris : leur vue toit effacé' : NOTES[id] ?? '', w, GREY),
      ...lines(`emprise ${fmt(b.size[0] * 0.05)} x ${fmt(b.size[1] * 0.05)} m (tout ce qui est posé compris), à (${b.at[0]}, ${b.at[1]}) de la zone village ; parcelle ${meta.parcel}`, w, DIM),
    ],
    w, h: l.h * K,
    draw: (img, x, y) => blitLayer(img, l, x, y, K),
  };
}

// =====================================================================================================================
// Les pièces, et le gabarit de chaque vue
// =====================================================================================================================

/** La taille attendue d'une vue (px) d'après les dimensions et la forme (docs/STYLE.md section 8). */
function expected(p: VillagePiece, v: number): [number, number] | null {
  const info = PIECE_INFO[p.key], { w, d, h } = p.dims;
  const [W, D] = v % 2 ? [d / 5, w / 5] : [w / 5, d / 5], H = h / 5;
  if (info.form === 'pan') return null;
  if (info.form === 'flat') return [Math.round(W), Math.round(D + H)];
  if (info.k === 1) return [Math.round(W), Math.round(H + D)];
  return [Math.round(W), Math.round(H + D / 2)];
}

function pieceBlock(p: VillagePiece): Block {
  const K = 4, GAP = 6, views = p.views(), info = PIECE_INFO[p.key];
  const H = Math.max(XS.y + XS.h, ...views.map((v) => v.grid.length));
  const W = views.reduce((a, v) => a + v.grid[0].length + GAP, 0) + XS.w;
  const w = W * K, tw = Math.max(w, 520);
  const nv = views.length, sym = ['', 'une vue (ronde)', 'deux vues (symétrique)', '', 'quatre vues, R0 à R3'][nv] ?? `${nv} vues`;
  const checks = views.map((v, r) => {
    const s = silhouette(v.grid, v.pal), e = expected(p, r);
    const ok = !e || (Math.abs(s.w - e[0]) <= 2 && Math.abs(s.h - e[1]) <= 2);
    return { s: `R${r} ${s.w}x${s.h}${e ? ` (gabarit ${e[0]}x${e[1]})` : ''}`, ok };
  });
  const uses = (PIECE_USES[p.key] ?? []).map((id) => PLACE_META[id].title.replace(/^La |^Le /, '').toLowerCase());
  return {
    title: [...lines(p.name, tw, GOLD), { s: p.key, c: DIM }],
    notes: [
      ...lines(`${p.dims.w} x ${p.dims.d} x ${p.dims.h} cm ; ${sym}`, tw, WHITE),
      ...lines(info.note, tw, GREY),
      ...(uses.length ? lines(`Pour ${uses.join(', ')}`, tw, GREY) : lines('Pour la place du sud (place-sud.ts)', tw, GREY)),
      { s: checks.map((c) => c.s).join(', '), c: checks.every((c) => c.ok) ? DIM : RED },
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

function main(): void {
  const only = process.argv[2];
  if (!only || only === 'dehors') save(sheet([ensembleBlock(), ...ORDER.map((id) => sceneBlock(id, false))], [
    'La place du village, les quarts nord : dehors (essai hors jeu)',
    'x2 ; 5 cm par px, projection du jeu (x, y - z) ; chaque bâtiment à sa place de la zone village (la terre battue des voies, des cours et de la place autour) ; Xéros pour l’échelle',
  ], 3200), 'place-nord-dehors.png');
  if (!only || only === 'dedans') save(sheet(ORDER.flatMap((id) => (of(id).levels === 2 ? [sceneBlock(id, true, 0), sceneBlock(id, true, 1)] : [sceneBlock(id, true, 0)])), [
    'La place du village, les quarts nord : dedans (essai hors jeu)',
    'x2 ; toits effacés, mur sud coupé comme le jeu, meubles du jeu et pièces nouvelles à leur place ; Xéros pour l’échelle',
  ], 3000), 'place-nord-dedans.png');
  if (!only || only === 'pieces') save(sheet(PIECES.map(pieceBlock), [
    'La place du village, les quarts nord : les pièces nouvelles, x4 (essai hors jeu)',
    'Toutes leurs vues R0 à R3 selon leur symétrie, Xéros à droite (1,60 m) ; dessous : le nom, les dimensions (est-ouest x nord-sud x hauteur), la taille de chaque vue et celle du gabarit (rouge : plus de 2 px d’écart)',
  ], 2600), 'place-nord-pieces.png');
}
main();
