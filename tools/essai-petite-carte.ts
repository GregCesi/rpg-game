// Essai de la petite carte du HUD (chantier « petite carte », préparation de nuit : hors jeu, rien n'entre dans le jeu) :
// npx tsx tools/essai-petite-carte.ts (après npm run art et npm run maps). Le calcul : art/proposals/petite-carte.ts ; le cadre et le
// point de Xéros : art/proposals/petite-carte-cadre.ts (pixel-artist).
//
// Planches écrites dans .art-preview/ :
//   petite-carte-lieux.png   la petite carte calculée depuis les vraies cartes, à trois endroits (devant la maison de Xéros, sur le
//                            chemin du village, sur la place du village), en trois tailles : A (1 px d'écran par case, 125 cases),
//                            B (2 × 2 px d'écran par case, 125 cases), C (2 × 2 px, 81 cases : 130 m) ; ronde dans son cadre ; agrandie ×2
//                            pour la lecture (un pixel du canevas = 2 × 2 px de la planche)
//   petite-carte-hud-a.png   une vue du jeu à l'échelle de l'écran (1 280 × 720, le palier de zoom de départ), avec le HUD
//   petite-carte-hud-b.png   (cadran, mains, endurance) et la petite carte en haut à gauche, dans les tailles A, B et C
//   petite-carte-hud-c.png
//   petite-carte-options.png les choix à trancher, à la ferme : arbres seuls ou avec troncs couchés et tas ; dedans (la maison)
//   petite-carte-couleurs.png les couleurs tirées des tuiles, famille par famille, et celles des toits
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { TILE, VIEW, ZOOM, ZOOM_STEPS, STAMINA_BAR } from '../src/config';
import propsJson from '../src/content/props.json';
import registry from '../art/tile-registry.json';
import { world as worldPalette, woodAges } from '../art/palette';
import { maps } from '../src/generated/maps';
import type { BuildPlaced, MapData } from '../src/content/types';
import { ageOf, boxOf, planPieces } from '../src/world/build';
import { clockFace } from '../src/world/clockFace';
import { buildPlans } from './lib/build-plans';
import { blank, blit, drawMap, put, rect, RenderKit, text, textWidth, toPng, type Img, type RGBA } from './lib/world-render';
import { countColors, dominant, hexRgb, meanColor, minimapWindow, nearest, paintZone, sumColors, tileFamily, WorldGrid, type Rgb, type ZoneInput } from '../art/proposals/petite-carte';
import * as frameArt from '../art/proposals/petite-carte-cadre';

const props = propsJson as unknown as Record<string, { image: string; aged?: boolean; tree?: unknown; dims?: { w: number; d: number; h: number }; wood?: unknown }>;
const plans = buildPlans();
const OUT = '.art-preview';
mkdirSync(OUT, { recursive: true });

function readPng(path: string): Img {
  const p = PNG.sync.read(readFileSync(path));
  return { w: p.width, h: p.height, data: p.data };
}

// ---------------------------------------------------------------------------------------------------------------------------
// 1. Les couleurs : la palette du monde (sans les translucides), les familles de tuiles, les pièces posées
// ---------------------------------------------------------------------------------------------------------------------------
const PALETTE: Rgb[] = Object.values(worldPalette as Record<string, string>)
  .filter((h) => h.length === 7)
  .map(hexRgb);
const TREE: Rgb = hexRgb(worldPalette.k);
const OUTSIDE: Rgb = hexRgb('#2c292d');

const tileset = readPng('tiled/tilesets/world.png');
const cols = tileset.w / TILE;
const tileNames = registry.world as string[];
// deux règles comparées sur la planche des couleurs : la teinte la plus fréquente (`DOMINANT`), et la teinte moyenne ramenée à la
// palette (`FAMILIES`, retenue : la route empierrée, faite de pierres de cinq teintes, sortait sinon de la couleur de ses joints).
// Pour une famille à raccords (path-0…15), seule la tuile pleine (-15) compte : les autres ont leur bord d'herbe.
const familyCounts = new Map<string, Map<string, { c: Rgb; n: number }>>();
const familySums = new Map<string, number[]>();
tileNames.forEach((name, n) => {
  const fam = tileFamily(name);
  if (/-\d+$/.test(name) && !name.endsWith('-15')) return;
  const data = new Uint8Array(TILE * TILE * 4);
  const sx = (n % cols) * TILE;
  const sy = Math.floor(n / cols) * TILE;
  for (let y = 0; y < TILE; y++) data.set(tileset.data.subarray(((sy + y) * tileset.w + sx) * 4, ((sy + y) * tileset.w + sx + TILE) * 4), y * TILE * 4);
  familyCounts.set(fam, countColors(data, PALETTE, familyCounts.get(fam)));
  familySums.set(fam, sumColors(data, familySums.get(fam)));
});
const DOMINANT: Record<string, Rgb> = Object.fromEntries([...familyCounts].map(([f, c]) => [f, dominant(c)!]));
const FAMILIES: Record<string, Rgb> = Object.fromEntries([...familySums].map(([f, a]) => [f, meanColor(a, PALETTE)!]));

const imageColor = new Map<string, Rgb | undefined>();
function colorOfImage(key: string): Rgb | undefined {
  if (!imageColor.has(key)) {
    try {
      imageColor.set(key, meanColor(sumColors(readPng(`src/generated/${key}.png`).data), PALETTE));
    } catch {
      imageColor.set(key, undefined);
    }
  }
  return imageColor.get(key);
}

/** La teinte d'une pièce posée : celle de son image à son âge ; la pièce de bois, écorce ou bois travaillé à son âge. */
function colorOfPiece(p: BuildPlaced): Rgb | undefined {
  const age = ageOf(p) ?? 'new';
  if ('wood' in p.piece) {
    const w = p.piece.wood as { shape?: string; hewn?: number; peeled?: boolean };
    if (w.shape === 'round' && !w.hewn && !w.peeled) return hexRgb(worldPalette.m);
    return hexRgb(woodAges[age]['*']);
  }
  if (!('prop' in p.piece)) return undefined;
  const def = props[p.piece.prop];
  return colorOfImage(def.image + (def.aged && age !== 'new' ? `-${age}` : ''));
}

// ---------------------------------------------------------------------------------------------------------------------------
// 2. La grille du monde
// ---------------------------------------------------------------------------------------------------------------------------
const zones = Object.values(maps).filter((m) => m.world) as MapData[];
const W = Math.max(...zones.map((m) => m.world!.x / TILE + m.width));
const H = Math.max(...zones.map((m) => m.world!.y / TILE + m.height));

/** Ce que voit la petite carte d'une zone. `extra` : les troncs couchés, souches et tas (option). */
function zoneInput(m: MapData, extra: boolean, noRoofs = false): ZoneInput {
  const trees = m.objects.filter((o) => props[o.type]?.tree).map((o) => ({ x: o.x + (props[o.type].dims!.w / 5) / 2, y: o.y - 2 }));
  const pieces: ZoneInput['pieces'] = [];
  for (const pl of m.plans) {
    const plan = plans[pl.plan];
    if (!plan) continue;
    const at = { x: Math.round(pl.x * 5), y: Math.round(pl.y * 5), z: 0 };
    for (const p of planPieces({ ...plan, ...(pl.age ? { age: pl.age } : {}) }, at)) {
      const b = boxOf(p);
      const color = colorOfPiece(p);
      if (noRoofs && 'prop' in p.piece && (propsJson as Record<string, { roof?: boolean }>)[p.piece.prop].roof) continue;
      if (color) pieces.push({ x: b.x, y: b.y, w: b.w, d: b.d, top: b.z + b.h, color });
    }
  }
  if (extra) {
    // les arbres couchés, chicots, souches, galettes et pièces de bois de Tiled : leur emprise au sol (dims), en écorce sombre
    const lying = ['normal-felled-tree', 'normal-snag', 'normal-snag-top', 'root-plate', 'normal-tree-stump', 'big-tree-stump', 'wood-piece'];
    for (const o of m.objects.filter((o) => lying.includes(o.type))) {
      const d = props[o.type].dims ?? { w: 100, d: 100, h: 0 };
      pieces.push({ x: o.x * 5, y: o.y * 5 - d.d, w: Math.max(d.w, 160), d: Math.max(d.d, 160), top: 0, color: hexRgb(worldPalette.N) });
    }
    for (const p of m.piles) pieces.push({ x: p.x * 5 - 80, y: p.y * 5 - 160, w: 160, d: 160, top: 0, color: hexRgb(worldPalette.N) });
  }
  return { cx: m.world!.x / TILE, cy: m.world!.y / TILE, width: m.width, height: m.height, ground: m.layers.ground.map((n) => (n >= 0 ? tileNames[n] : undefined)), trees, pieces };
}

function worldGrid(extra: boolean, noRoofs = false): WorldGrid {
  const g = new WorldGrid(W, H);
  for (const m of zones) paintZone(g, zoneInput(m, extra, noRoofs), FAMILIES, TREE);
  return g;
}
const t0 = performance.now();
const GRID = worldGrid(false);
const tGrid = performance.now() - t0;
const GRID_EXTRA = worldGrid(true);
const GRID_NOROOF = worldGrid(false, true);
// le coût : repeindre une zone (ce que fera le jeu quand la partie change), et tirer la fenêtre (quand Xéros change de case)
const N = 50;
let t1 = performance.now();
const ferme = zoneInput(maps.ferme as MapData, false);
for (let k = 0; k < N; k++) paintZone(GRID_EXTRA, ferme, FAMILIES, TREE);
const tZone = (performance.now() - t1) / N;
t1 = performance.now();
for (let k = 0; k < N * 10; k++) minimapWindow(GRID, 225, 178, 125, OUTSIDE);
const tWin = (performance.now() - t1) / (N * 10);
paintZone(GRID_EXTRA, zoneInput(maps.ferme as MapData, true), FAMILIES, TREE);

// ---------------------------------------------------------------------------------------------------------------------------
// 3. Le cadre et le point (pixel-artist), rendus en couleurs
// ---------------------------------------------------------------------------------------------------------------------------
type Facing = 'down' | 'up' | 'left' | 'right';
const FRAME_PAL: Record<string, string> = { ...(worldPalette as Record<string, string>), ...((frameArt as { FRAME_PALETTE?: Record<string, string> }).FRAME_PALETTE ?? {}) };

function gridImg(g: string[], scale = 1): Img {
  const img = blank(g[0].length * scale, g.length * scale, [0, 0, 0, 0]);
  g.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const hex = FRAME_PAL[ch];
      if (!hex || ch === '.') return;
      const c = hexRgb(hex);
      const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) : 255;
      for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) img.data.set([c[0], c[1], c[2], a], ((y * scale + j) * img.w + x * scale + i) * 4);
    }),
  );
  return img;
}

/** Colle `src` agrandie `k` fois (plus proche voisin). */
function blitScaled(dst: Img, src: Img, x: number, y: number, k: number): void {
  for (let j = 0; j < src.h * k; j++)
    for (let i = 0; i < src.w * k; i++) {
      const s = (Math.floor(j / k) * src.w + Math.floor(i / k)) * 4;
      put(dst, x + i, y + j, [src.data[s], src.data[s + 1], src.data[s + 2], src.data[s + 3]]);
    }
}

// ---------------------------------------------------------------------------------------------------------------------------
// 4. La petite carte, en px du canevas (1 280 × 720 : le HUD × 2)
// ---------------------------------------------------------------------------------------------------------------------------
/** Une taille : `cells` cases de côté, `px` px du canevas par case. */
interface Size {
  id: string;
  label: string;
  cells: number;
  px: number;
}
const SIZES: Size[] = [
  { id: 'a', label: 'A : 1 px par case, 125 cases (200 m)', cells: 125, px: 1 },
  { id: 'b', label: 'B : 2 px par case, 125 cases (200 m)', cells: 125, px: 2 },
  { id: 'c', label: 'C : 2 px par case, 81 cases (130 m)', cells: 81, px: 2 },
];

/**
 * La petite carte finie, en px du canevas : la fenêtre ronde, le cadre (px du HUD, donc × 2) par-dessus, le point de Xéros au centre.
 * `cx`, `cy` : la case du monde où est Xéros.
 */
function minimap(grid: WorldGrid, cx: number, cy: number, s: Size, facing: Facing): Img {
  const inner = Math.round((s.cells * s.px) / ZOOM) | 1; // diamètre de la fenêtre en px du HUD, impair
  const frame = gridImg(frameArt.minimapFrame(inner).toGrid());
  const side = frame.w * ZOOM;
  const img = blank(side, side, [0, 0, 0, 0]);
  const win = minimapWindow(grid, cx, cy, s.cells, OUTSIDE);
  const off = Math.round((side - s.cells * s.px) / 2);
  win.forEach((c, k) => {
    if (!c) return;
    rect(img, off + (k % s.cells) * s.px, off + Math.floor(k / s.cells) * s.px, s.px, s.px, [c[0], c[1], c[2], 255]);
  });
  blitScaled(img, frame, 0, 0, ZOOM);
  const dot = gridImg(frameArt.playerDot(facing).toGrid());
  // le centre de la case de Xéros
  const mid = off + Math.floor(s.cells / 2) * s.px + s.px / 2;
  blitScaled(img, dot, Math.round(mid - (dot.w * ZOOM) / 2), Math.round(mid - (dot.h * ZOOM) / 2), ZOOM);
  return img;
}

// ---------------------------------------------------------------------------------------------------------------------------
// 5. Les trois lieux
// ---------------------------------------------------------------------------------------------------------------------------
/** Le pied sur le chemin le plus proche de (x, y), en descendant puis en montant d'une case à la fois (px de la zone). */
function onPath(map: string, x: number, y: number): number {
  const m = maps[map];
  const i = Math.floor(x / TILE);
  for (let d = 0; d < 30; d++)
    for (const j of [Math.floor(y / TILE) + d, Math.floor(y / TILE) - d])
      if (tileFamily(tileNames[m.layers.ground[j * m.width + i]] ?? '') === 'path') return j * TILE + TILE / 2 + 6;
  return y;
}
const CHEMIN_Y = onPath('chemin', 2000, 2012);
const cellOf = (map: string, x: number, y: number) => ({ cx: Math.floor((maps[map].world!.x + x) / TILE), cy: Math.floor((maps[map].world!.y + y) / TILE) });
const PLACES = [
  { name: 'Devant la maison de Xeros', ...cellOf('ferme', 3200, 1700), facing: 'down' as Facing },
  { name: 'Sur le chemin du village', ...cellOf('chemin', 2000, CHEMIN_Y), facing: 'right' as Facing },
  { name: 'Sur la place du village', ...cellOf('village', 3290, 2300), facing: 'up' as Facing },
];
const INK: RGBA = [250, 236, 200, 255];
const BG: RGBA = [40, 31, 24, 255];

{
  const K = 2; // la planche agrandie ×2 : un pixel du canevas = 2 × 2
  const maps_ = PLACES.map((p) => SIZES.map((s) => minimap(GRID, p.cx, p.cy, s, p.facing)));
  const colW = SIZES.map((_, i) => Math.max(...maps_.map((r) => r[i].w)) * K + 30);
  const rowH = Math.max(...maps_.flat().map((m) => m.h)) * K + 40;
  const img = blank(colW.reduce((a, b) => a + b, 0) + 220, rowH * PLACES.length + 60, BG);
  text(img, 'Petite carte calculee depuis les cartes (planche agrandie x2 : 1 px du canevas = 2 x 2)', 10, 10, 2, INK);
  let x = 220;
  SIZES.forEach((s, i) => {
    text(img, s.label, x, 36, 1, INK);
    x += colW[i];
  });
  PLACES.forEach((p, r) => {
    const y = 60 + r * rowH;
    text(img, p.name, 10, y + 20, 1, INK);
    text(img, `case ${p.cx}, ${p.cy}`, 10, y + 34, 1, [200, 190, 160, 255]);
    let x = 220;
    SIZES.forEach((_, i) => {
      blitScaled(img, maps_[r][i], x, y, K);
      x += colW[i];
    });
  });
  writeFileSync(`${OUT}/petite-carte-lieux.png`, toPng(img));
}

// ---------------------------------------------------------------------------------------------------------------------------
// 6. La vue du jeu à l'échelle de l'écran, avec le HUD
// ---------------------------------------------------------------------------------------------------------------------------
/** Une vue du monde au palier de zoom de départ, centrée sur les pieds de Xéros (px du monde), en px du canevas (1 280 × 720). */
function gameView(map: string, fx: number, fy: number): Img {
  const zoom = ZOOM_STEPS.start; // px du canevas par px du monde
  const vw = Math.ceil((VIEW.width * ZOOM) / zoom);
  const vh = Math.ceil((VIEW.height * ZOOM) / zoom);
  const m = maps[map];
  const wx0 = Math.round(fx - vw / 2);
  const wy0 = Math.round(fy - 24 - vh / 2);
  const world = blank(vw, vh, [0, 0, 0, 255]);
  const kit = new RenderKit(1);
  // la zone et ses voisines, à leur place
  for (const z of zones) {
    const dx = z.world!.x - m.world!.x;
    const dy = z.world!.y - m.world!.y;
    if (dx + z.width * TILE < wx0 || dx > wx0 + vw || dy + z.height * TILE < wy0 || dy > wy0 + vh + 300) continue;
    drawMapWindow(world, kit, z, dx - wx0, dy - wy0);
  }
  // Xéros, première image de sa planche (32 × 48), pieds en (fx, fy)
  const xeros = readPng('src/generated/xeros.png');
  const fr = blank(32, 48, [0, 0, 0, 0]);
  for (let y = 0; y < 48; y++) fr.data.set(xeros.data.subarray(y * xeros.w * 4, (y * xeros.w + 32) * 4), y * 32 * 4);
  blit(world, fr, Math.round(fx - wx0 - 16), Math.round(fy - wy0 - 46));
  const out = blank(VIEW.width * ZOOM, VIEW.height * ZOOM, [0, 0, 0, 255]);
  blitScaled(out, world, 0, 0, zoom);
  return out;
}

/** drawMap, mais seulement les tuiles et objets qui tombent dans l'image (la zone entière ferait 16 millions de pixels). */
function drawMapWindow(dst: Img, kit: RenderKit, m: MapData, ox: number, oy: number): void {
  const i0 = Math.max(0, Math.floor(-ox / TILE));
  const j0 = Math.max(0, Math.floor(-oy / TILE));
  const i1 = Math.min(m.width, Math.ceil((dst.w - ox) / TILE));
  const j1 = Math.min(m.height, Math.ceil((dst.h - oy + 400) / TILE));
  const sub: MapData = {
    ...m,
    layers: { ...m.layers, ground: m.layers.ground.map((n, k) => ((k % m.width) >= i0 && (k % m.width) < i1 && Math.floor(k / m.width) >= j0 && Math.floor(k / m.width) < j1 ? n : -1)) },
    objects: m.objects.filter((o) => o.x + ox > -400 && o.x + ox < dst.w + 100 && o.y + oy > -10 && o.y + oy < dst.h + 400),
    plans: m.plans.filter((p) => p.x + ox > -1000 && p.x + ox < dst.w + 100 && p.y + oy > -1000 && p.y + oy < dst.h + 100),
  };
  drawMap(dst, kit, sub, ox, oy, (t, age) => (props[t] ? props[t].image + (age && age !== 'new' && props[t].aged ? `-${age}` : '') : undefined), (p) => plans[p]?.size);
}

/** Le HUD par-dessus la vue : le cadran (Jour 1, 7 h 40), les deux mains vides, la barre d'endurance pleine ; en px du HUD × 2. */
function drawHud(out: Img): void {
  const png = (k: string) => readPng(`src/generated/${k}.png`);
  const width = (k: string) => png(k).w;
  const at = (k: string, x: number, y: number, repeat?: number) => {
    const src = png(k);
    if (repeat) for (let i = 0; i < repeat; i++) blitScaled(out, { w: 1, h: src.h, data: column(src, 0) }, (x + i) * ZOOM, y * ZOOM, ZOOM);
    else blitScaled(out, src, x * ZOOM, y * ZOOM, ZOOM);
  };
  for (const p of clockFace({ day: 1, minute: 7 * 60 + 40 }, 1, VIEW.width, width)) at(p.key, p.x, p.y, p.repeat);
  const size = png('ui-slot').w;
  const x0 = VIEW.width - 4 - (2 * size + 4);
  const y0 = VIEW.height - 10 - size;
  ['ui-hand-left', 'ui-hand-right'].forEach((h, i) => {
    const x = x0 + i * (size + 4);
    at('ui-slot', x, y0);
    const icon = png(h);
    blitScaled(out, icon, (x + size / 2 - icon.w / 2) * ZOOM, (y0 + size / 2 - icon.h / 2) * ZOOM, ZOOM);
  });
  // la barre d'endurance pleine (100 points), bord droit à 636, bas au-dessus des mots des clics
  const iw = 100 * STAMINA_BAR.pxPerPoint;
  const bottom = y0 - 9 - STAMINA_BAR.gap;
  const bx = VIEW.width - 4 - (iw + 2 * STAMINA_BAR.end);
  const by = bottom - STAMINA_BAR.height;
  at('ui-bar-left', bx, by);
  at('ui-bar-mid', bx + STAMINA_BAR.end, by, iw);
  at('ui-bar-right', bx + STAMINA_BAR.end + iw, by);
  at('ui-bar-breath-edge', bx + STAMINA_BAR.inner, by + STAMINA_BAR.inner);
  at('ui-bar-breath', bx + STAMINA_BAR.inner + 1, by + STAMINA_BAR.inner, iw - 1);
}
function column(src: Img, x: number): Uint8Array {
  const d = new Uint8Array(src.h * 4);
  for (let y = 0; y < src.h; y++) d.set(src.data.subarray((y * src.w + x) * 4, (y * src.w + x + 1) * 4), y * 4);
  return d;
}

{
  // sur le chemin du village : la vue du jeu n'a pas de bâtiment, que l'aperçu ne sait pas dessiner (il les met en aplat)
  const p = PLACES[1];
  const fx = 2000;
  const fy = CHEMIN_Y;
  const view = gameView('chemin', fx, fy);
  for (const s of SIZES) {
    const img = blank(view.w, view.h, [0, 0, 0, 255]);
    img.data.set(view.data);
    drawHud(img);
    const mm = minimap(GRID, p.cx, p.cy, s, p.facing);
    // marge de 4 px du HUD en haut et à gauche, comme le cadran à droite
    blit(img, mm, 4 * ZOOM, 4 * ZOOM);
    text(img, s.label, 4 * ZOOM, 4 * ZOOM + mm.h + 8, 1, INK);
    writeFileSync(`${OUT}/petite-carte-hud-${s.id}.png`, toPng(img));
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// 7. Les options, et les couleurs
// ---------------------------------------------------------------------------------------------------------------------------
{
  const s = SIZES[1];
  const K = 2;
  const p = cellOf('ferme', 3000, 2300);
  const a = minimap(GRID, p.cx, p.cy, s, 'down');
  const b = minimap(GRID_EXTRA, p.cx, p.cy, s, 'down');
  // dedans : Xéros dans la pièce commune de la maison (sa place dehors : la position dans l'intérieur + le décalage de l'intérieur)
  const inside = cellOf('ferme', 3200, 1600);
  const c = minimap(GRID, inside.cx, inside.cy, s, 'left');
  const d = minimap(GRID_NOROOF, inside.cx, inside.cy, s, 'left');
  const img = blank(a.w * K * 2 + 90, a.h * K * 2 + 160, BG);
  text(img, 'Ferme, au sud de la maison (taille B, x2)', 10, 10, 2, INK);
  text(img, 'Arbres debout seuls', 30, 40, 1, INK);
  text(img, 'Avec arbres couches, chicots, souches, tas', 60 + a.w * K, 40, 1, INK);
  blitScaled(img, a, 30, 60, K);
  blitScaled(img, b, 60 + a.w * K, 60, K);
  const y2 = 100 + a.h * K;
  text(img, 'Dedans (1) : la carte du dehors, le toit garde', 30, y2, 1, INK);
  text(img, 'Dedans (2) : le toit enleve, les murs dessous', 60 + a.w * K, y2, 1, INK);
  blitScaled(img, c, 30, y2 + 20, K);
  blitScaled(img, d, 60 + a.w * K, y2 + 20, K);
  writeFileSync(`${OUT}/petite-carte-options.png`, toPng(img));
}
{
  const fams = Object.entries(FAMILIES);
  const sign = (c: Rgb) => Object.entries(worldPalette as Record<string, string>).find(([, h]) => h.length === 7 && hexRgb(h).join() === c.join())?.[0] ?? '?';
  const roofs = ['thatch-roof', 'plank-awning', 'plank-roof'].map((k) => [k, colorOfImage(props[k].image)!] as const);
  const img = blank(620, 60 + (fams.length + roofs.length) * 22 + 40, BG);
  text(img, 'Couleurs tirees des dessins', 10, 8, 2, INK);
  text(img, 'moyenne (retenue)   la plus frequente', 10, 34, 1, INK);
  fams.forEach(([f, c], i) => {
    const dm = DOMINANT[f];
    rect(img, 10, 54 + i * 22, 40, 18, [c[0], c[1], c[2], 255]);
    rect(img, 140, 54 + i * 22, 40, 18, [dm[0], dm[1], dm[2], 255]);
    text(img, `${f}  (${sign(c)} / ${sign(dm)})`, 260, 58 + i * 22, 1, INK);
  });
  roofs.forEach(([k, c], i) => {
    const y = 54 + (fams.length + i) * 22 + 10;
    rect(img, 10, y, 40, 18, [c[0], c[1], c[2], 255]);
    text(img, `${k}  (${sign(c)})`, 260, y + 4, 1, INK);
  });
  writeFileSync(`${OUT}/petite-carte-couleurs.png`, toPng(img));
  console.log('familles :', fams.map(([f, c]) => `${f}=${Object.entries(worldPalette as Record<string, string>).find(([, h]) => h.length === 7 && hexRgb(h).join() === c.join())?.[0]}`).join(' '));
}
console.log(`grille du monde : ${W} × ${H} cases, calculée en ${tGrid.toFixed(0)} ms (Node, images lues comprises) ; une zone repeinte : ${tZone.toFixed(2)} ms ; la fenêtre de 125 cases : ${tWin.toFixed(2)} ms`);
void nearest;
void textWidth;
