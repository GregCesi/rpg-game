// Planches de la forge du village (chantier « forge », hors jeu : rien ici n'entre dans le jeu) : npx tsx tools/essai-forge.ts écrit
//   .art-preview/forge-dehors.png     les trois versions (A « la cour », B « en long », C « l'appentis », CADRAGE-forge.md section 2)
//                                     vues de dehors depuis la rue, toits posés, x2 ; le cadre du jeu (427 × 240, palier 3) en clair,
//                                     le reste de la parcelle assombri autour ;
//   .art-preview/forge-interieur.png  la version A sans ses toits ni sa charpente haute, le mur sud du logis coupé bas, x2 ;
//   .art-preview/forge-detail.png     les pièces nouvelles (art/proposals/forge.ts) x4, dans leurs vues, Xéros à côté.
//
// Les pièces existantes sont les images du jeu (`sources` d'art/index.ts) : la charpente, le bardage et le toit de l'atelier pièce par
// pièce depuis le plan src/content/plans/grange.json, au bois vieux, posés comme le jeu les pose (src/world/buildView.ts : l'image
// centrée sur l'emprise, son bas au bord sud relevé de sa hauteur, y − z ; profondeur de src/world/build.ts `depthsOf`) ; l'abri à
// charbon depuis le plan de l'abri à bois (src/content/plans.json) ; la hotte, le conduit, le couronnement de la cheminée ; les meubles.
// Le logis est le modèle en volumes de la maison de Xéros (art/proposals/maison-xeros.ts) raccourci à 8 × 6,40 m, avec la cheminée du
// jeu (art/world/chimney.ts) contre son mur nord. Projection des bâtiments : (x, y − z), STYLE.md section 8.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { agedPalette } from '../art/world/wood';
import { composeWood } from '../art/world/wood-pieces';
import { world } from '../art/palette';
import { chimneyQuads, AT as CH_AT } from '../art/world/chimney';
import { box, part, prism, timber, pole, type Quad, type Tex, type V3, type Board, type Scene } from '../art/lib/volumes';
import { hash, houseScene, render, type Bounds, type Layer, type Plan } from '../art/proposals/maison-xeros';
import { mantel } from '../art/proposals/cheminee-2';
import { interiorTiles } from '../art/interior/house';
import {
  PAL, PIECES, SCRAP, VISE, forgeFrames, ovenFlueModel, pieceImage, view, masonry, iron,
} from '../art/proposals/forge';
import { expectedSize, silhouette, type Dims } from '../src/content/gabarit';
import { formView } from '../src/world/natural';
import { variantImage } from '../src/content/views';
import { depthsOf, boxOf, type BuildPiece } from '../src/world/build';
import { upOf, lookOf, beamPiece } from '../src/world/woodShape';
import propsJson from '../src/content/props.json';
import plansJson from '../src/content/plans.json';
import grangeJson from '../src/content/plans/grange.json';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const GOLD: Rgb = [245, 215, 120];

// =====================================================================================================================
// Les images du jeu
// =====================================================================================================================

type Img = { grid: Grid; pal: Palette };
const byName = new Map(sources.map((s) => [s.name, s]));
const has = (k: string) => byName.has(k);
function img(name: string): Img {
  const s = byName.get(name);
  if (s?.kind === 'image') return { grid: s.grid, pal: s.palette };
  if (s?.kind === 'spritesheet') return { grid: Object.values(s.animations)[0].frames[0], pal: s.palette };
  throw new Error(`essai-forge : pas d'image « ${name} »`);
}
function frame(name: string): Img {
  const s = byName.get(name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forge : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
const OLD = agedPalette(world, 'old');
const props = propsJson as unknown as Record<string, { image: string; views: never; aged?: boolean; dims: { w: number; d: number; h: number } }>;

// ---------- le sol : l'herbe, la terre battue (yard, raccordée à l'herbe par ses bords) ----------

const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
type GroundKind = 'grass' | 'yard';
/** Le sol d'une scène : la sorte de chaque case (32 px, alignée sur la grille du monde) ; terre battue raccordée par son masque. */
function groundOf(kind: (cx: number, cy: number) => GroundKind): (x: number, y: number) => string {
  return (x, y) => {
    const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
    const lx = ((x % 32) + 32) % 32, ly = ((y % 32) + 32) % 32;
    let t: Grid;
    if (kind(cx, cy) === 'yard') {
      const m = (kind(cx, cy - 1) === 'yard' ? 1 : 0) | (kind(cx + 1, cy) === 'yard' ? 2 : 0) | (kind(cx, cy + 1) === 'yard' ? 4 : 0) | (kind(cx - 1, cy) === 'yard' ? 8 : 0);
      t = worldTiles.tiles[`yard-${m}`];
    } else t = worldTiles.tiles[GRASS[Math.floor(hash(5, cx, cy) * GRASS.length)]];
    return worldTiles.palette[t[ly][lx]];
  };
}

// ---------- un objet, un personnage ----------

/** Une image posée comme le jeu pose un objet : centrée sur son emprise (x0–x1, px), son bas au bord sud y relevé de z ; profondeur y. */
function placeImg(o: Img, x0: number, x1: number, ySouth: number, z = 0, depth = ySouth): Board {
  const w = o.grid[0].length;
  return { grid: o.grid, pal: o.pal, x: Math.round((x0 + x1) / 2 - w / 2), y: Math.round(ySouth - z) - o.grid.length, depth: () => depth };
}
/** Un personnage, les pieds au milieu en (x, y). */
function who(name: string, x: number, y: number): Board {
  const f = frame(name), s = silhouette(f.grid, f.pal);
  return { grid: f.grid, pal: f.pal, x: Math.round(x - s.x - s.w / 2), y: Math.round(y - (s.y + s.h)), depth: () => y };
}
const moveBoard = (b: Board, dx: number, dy: number): Board => ({ ...b, x: b.x + dx, y: b.y + dy, depth: (r) => b.depth(r) + dy });
const moveQuads = (qs: Quad[], [dx, dy, dz]: V3): Quad[] =>
  qs.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2] + dz] as V3, tex: (s, t, c) => q.tex(s, t, { ...c, p: [c.p[0] - dx, c.p[1] - dy, c.p[2] - dz] }) }));

// =====================================================================================================================
// La planche
// =====================================================================================================================

interface Block { title: string[]; w: number; h: number; draw: (sh: Sheet, x: number, y: number) => void; notes: string[] }

function blitLayer(sheet: Sheet, l: Layer, ox: number, oy: number, k: number, dim?: (X: number, Y: number) => boolean): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    const f = dim?.(x + l.x, y + l.y) ? 0.45 : 1;
    sheet.rect(ox + x * k, oy + y * k, k, k, [l.rgba[q] * f, l.rgba[q + 1] * f, l.rgba[q + 2] * f]);
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
function write(sheet: Sheet, name: string): void {
  const out = join(ROOT, '.art-preview', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-forge -> ${out}`);
}

// =====================================================================================================================
// 3. Le détail : les pièces nouvelles x4, Xéros à côté
// =====================================================================================================================

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const swap = (d: Dims): Dims => ({ ...d, w: d.d, d: d.w });
const REPORT: string[] = [];
function gauge(name: string, g: Grid, d: Dims): string[] {
  const s = silhouette(g, PAL);
  const e = expectedSize(d), ok = Math.abs(s.w - e.w) <= 2 && Math.abs(s.h - e.h) <= 2;
  const okFloor = !ok && e.wMax > e.w && s.w <= e.wMax + 2 && Math.abs(s.h / s.w - e.h / e.w) < 0.6;
  REPORT.push(`${name} : ${d.w}x${d.d}x${d.h} cm, attendu ${fmt(e.w)}x${fmt(e.h)}, dessiné ${s.w}x${s.h} ${ok ? 'ok' : okFloor ? 'plancher de lisibilité' : 'HORS TOLÉRANCE'}`);
  return [`${d.w}X${d.d}X${d.h} CM`, `ATTENDU ${fmt(e.w)}X${fmt(e.h)}, DESSINE ${s.w}X${s.h}`, ok ? 'GABARIT : OK' : okFloor ? 'PLANCHER DE LISIBILITE' : 'HORS TOLERANCE'];
}
/** Une ou plusieurs images côte à côte sur une ligne de sol, agrandies k fois, Xéros à gauche. */
function lineup(items: { g: Grid; pal: Palette }[], k: number, title: string[], notes: string[], withXeros = true): Block {
  const xg = frame('xeros');
  const all = withXeros ? [{ g: xg.grid, pal: xg.pal }, ...items] : items;
  const gap = 6;
  const w = all.reduce((s, it) => s + it.g[0].length * k + gap * k, 0);
  const h = Math.max(...all.map((it) => it.g.length)) * k;
  return {
    title, notes, w, h: h + 4,
    draw: (sh, x, y) => {
      let cx = x;
      for (const it of all) {
        sh.blit(it.g, it.pal, cx, y + h - it.g.length * k, k);
        cx += it.g[0].length * k + gap * k;
      }
      sh.rect(x, y + h + 1, w - gap * k, 1, [110, 104, 90]);
    },
  };
}
const SUFFIX = ['R0 (DEVANT)', 'R1', 'R2 (DOS)', 'R3'];

function detailSheet(): Sheet {
  const K = 4;
  const rows: Block[][] = [];
  // la forge : ses trois images de feu, ses quatre vues ; la hotte du jeu posée dessus (à 1,60 m) et la vue de côté
  const fr = forgeFrames(0);
  const forgeDims = PIECES[0].dims as Dims;
  rows.push([
    lineup(fr.map((g) => ({ g, pal: PAL })), K, ['FORGE MACONNEE (FORGE-HEARTH), LE FEU EN 3 IMAGES', 'TABLE A 80 CM, JOUES ET CONTRECOEUR A 1,60 M'], gauge('forge-hearth', fr[0], forgeDims)),
    lineup([1, 2, 3].map((v) => ({ g: pieceImage('forge-hearth', v), pal: PAL })), K, ['FORGE : R1, R2, R3', 'LA TUYERE DANS LA JOUE OUEST'], gauge('forge-hearth-r1', pieceImage('forge-hearth', 1), swap(forgeDims))),
  ]);
  rows.push([forgeMounted(K, 0), forgeMounted(K, 1), forgeMounted(K, 0, true)]);
  // le soufflet
  const bel = PIECES.find((p) => p.key === 'forge-bellows')!;
  rows.push([
    lineup([0, 1, 2, 3].map((v) => ({ g: pieceImage('forge-bellows', v), pal: PAL })), K, ['SOUFFLET DOUBLE SUR SON BATI (FORGE-BELLOWS) : R0 R1 R2 R3', 'R0 COUCHE EST-OUEST, LA BUSE A L EST ; DANS L ATELIER : R3, BUSE AU NORD'],
      [...gauge('forge-bellows', pieceImage('forge-bellows', 0), bel.dims as Dims), ...gauge('forge-bellows-r1', pieceImage('forge-bellows', 1), swap(bel.dims as Dims)).slice(1)]),
    cornerBlock(K),
  ]);
  // l'enclume, son billot, l'auge, le four
  const anvil = PIECES.find((p) => p.key === 'anvil')!, block = PIECES.find((p) => p.key === 'anvil-block')!;
  rows.push([
    lineup([{ g: pieceImage('anvil', 0), pal: PAL }, { g: pieceImage('anvil', 1), pal: PAL }, { g: pieceImage('anvil-block'), pal: PAL }, { g: anvilOnBlock(0), pal: PAL }, { g: anvilOnBlock(1), pal: PAL }], K,
      ['ENCLUME (ANVIL) FACE ET COTE, BILLOT, L ENCLUME SUR SON BILLOT', 'DESSUS DE LA TABLE A 85 CM'],
      [...gauge('anvil', pieceImage('anvil', 0), anvil.dims as Dims), ...gauge('anvil-ns', pieceImage('anvil', 1), swap(anvil.dims as Dims)).slice(1), ...gauge('anvil-block', pieceImage('anvil-block'), block.dims as Dims).slice(1)]),
    ...['quench-trough', 'forge-oven'].map((key) => {
      const p = PIECES.find((x) => x.key === key)!;
      const vs = p.views;
      return lineup(vs.map((v) => ({ g: pieceImage(key, v), pal: PAL })), K, [`${p.label} (${key.toUpperCase()})`, vs.map((v) => SUFFIX[v].split(' ')[0]).join(' ')],
        [...gauge(key, pieceImage(key, 0), p.dims as Dims), ...gauge(`${key}-r1`, pieceImage(key, 1), swap(p.dims as Dims)).slice(1)]);
    }),
  ]);
  rows.push(['charcoal-bin', 'tool-rack', 'bar-rack', 'grindstone'].map((key) => {
    const p = PIECES.find((x) => x.key === key)!;
    return lineup(p.views.map((v) => ({ g: pieceImage(key, v), pal: PAL })), K, [`${p.label} (${key.toUpperCase()})`, 'R0 R1 R2 R3'],
      [...gauge(key, pieceImage(key, 0), p.dims as Dims), ...gauge(`${key}-r1`, pieceImage(key, 1), swap(p.dims as Dims)).slice(1)]);
  }));
  rows.push([
    lineup([{ g: VISE, pal: PAL }, { g: crateFull(), pal: PAL }], K, ['ETAU (VISE), LA FERRAILLE DANS LA CAISSE DU JEU', 'ETAU AGRANDI AU PLANCHER DE LISIBILITE (6 PX)'], ['etau 20x30x40 cm : 4x11 reel, dessine 7x8 (sur l etabli, la jambe cachee)']),
  ]);
  return sheetOf(rows, [
    'LA FORGE DU VILLAGE : LES PIECES NOUVELLES, X4 (ESSAI HORS JEU, ART/PROPOSALS/FORGE.TS)',
    '5 cm par px ; pieces maconnees (forge, four) : pieces de batiment (ground), gabarit W X (H + D) ; meubles : W X (H + D/2), ombre exclue',
    'fer : une rampe nouvelle ( ( ) < > ) gris bleu, a ajouter a la palette si la forge entre au jeu ; tout le reste vient de art/palette.ts',
  ]);
}

function anvilOnBlock(v: number): Grid {
  // l'enclume posée sur le billot comme le jeu la poserait : deux images, le dessus du billot à 55 cm (11 px)
  const b = pieceImage('anvil-block'), a = pieceImage('anvil', v);
  const bs = silhouette(b, PAL), as = silhouette(a, PAL);
  const W = Math.max(b[0].length, a[0].length) + 2, top = 11 + (as.y + as.h) - (bs.y + bs.h) + b.length;
  const H = Math.max(b.length, top);
  const rows = Array.from({ length: H }, () => [...'.'.repeat(W)]);
  const stamp = (g: Grid, ox: number, oy: number, skipShadow = false) => g.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.' || (skipShadow && ch === 'x')) return;
    if (rows[oy + y]?.[ox + x] === undefined) return;
    rows[oy + y][ox + x] = ch;
  }));
  const bx = Math.round((W - b[0].length) / 2), ax = Math.round((W - a[0].length) / 2) - (v === 0 ? 0 : 0);
  stamp(b, bx, H - b.length);
  // le bas de la silhouette de l'enclume (pieds) au milieu du dessus du billot : 11 px au-dessus du bas du billot, 3 px au nord du bord sud
  const baseY = H - (b.length - (bs.y + bs.h)) - 11 - 2;
  stamp(a, ax, baseY - (as.y + as.h), true);
  return rows.map((r) => r.join(''));
}
function crateFull(): Grid {
  const c = img('crate-old' in Object.fromEntries(byName) ? 'crate-old' : 'crate');
  const g = c.grid.map((r) => r);
  const s = silhouette(g, c.pal);
  const W = Math.max(g[0].length, SCRAP[0].length), H = g.length + 2;
  const rows = Array.from({ length: H }, () => [...'.'.repeat(W)]);
  g.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') rows[y + 2][x] = ch; }));
  SCRAP.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') rows[s.y + y][x + Math.round((s.w - SCRAP[0].length) / 2) + s.x] = ch; }));
  return rows.map((r) => r.join(''));
}

/** La forge montée : la hotte du jeu (à 1,60 m) et deux tronçons de conduit, rendus à la projection du jeu ; vue de face, ou de côté (r1). */
function forgeMounted(k: number, v: 0 | 1, glow = false): Block {
  const fg = forgeFrames(v)[1];
  const hood = img(v === 0 ? 'chimney-hood' : 'chimney-hood-r1'), flue = img(v === 0 ? 'chimney-flue' : 'chimney-flue-ns');
  // la forge : emprise x 0–44 (r0) ou 0–22 (r1), son bord sud y = 22 (r0) ou 44 (r1)
  const W = v === 0 ? 44 : 22, D = v === 0 ? 22 : 44;
  // la hotte : 44 × 16 posée sur les joues (r0 : y 0–16 ; r1 : vue de côté, le mur au… est, la hotte x 6–22)
  const boards: Board[] = [
    { grid: fg, pal: PAL, x: 0, y: D - fg.length, depth: () => D },
    v === 0 ? placeImg(hood, 0, 44, 16, 32, 16) : placeImg(hood, W - 16, W, 44, 32, 44.1),
    v === 0 ? placeImg(flue, 12, 32, 16, 52, 16.1) : placeImg(flue, W - 16, W, 32, 52, 44.2),
    v === 0 ? placeImg(flue, 12, 32, 16, 72, 16.2) : placeImg(flue, W - 16, W, 32, 72, 44.3),
    who('xeros', v === 0 ? 52 : 34, D + 14),
  ];
  const sc: Scene = { quads: [], boards };
  const bd: Bounds = [-4, -100, W + 26, D + 18];
  let l = render(sc, bd, { grass: groundOf(() => 'yard'), floor: groundOf(() => 'yard') });
  if (glow) l = withGlow(l, [[22, 12, 30]]);
  return {
    title: [v === 0 ? 'LA FORGE MONTEE, DE FACE' : 'LA FORGE MONTEE, DE COTE (R1, VUE DE L OUEST)', glow ? 'AVEC LA LUEUR (LE JEU LA PEINT : PAS DANS L IMAGE)' : 'HOTTE DU JEU A 1,60 M, DEUX TRONCONS DE CONDUIT'],
    notes: [v === 0 ? 'la hotte (chimney-hood) pose sur les joues et le contrecoeur' : 'de cote : la tuyere, le creuset, la hotte au-dessus', 'xeros devant (1,60 m)'],
    w: l.w * k, h: l.h * k, draw: (sh, x, y) => blitLayer(sh, l, x, y, k),
  };
}

/** La lueur d'un feu, à la manière du jeu : un halo chaud additif autour de chaque (x, y, rayon) de l'écran. */
function withGlow(l: Layer, fires: [number, number, number][]): Layer {
  const rgba = l.rgba.slice();
  for (let Y = 0; Y < l.h; Y++) for (let X = 0; X < l.w; X++) {
    let a = 0;
    for (const [fx, fy, r] of fires) {
      const d = Math.hypot(X + l.x - fx, (Y + l.y - fy) * 1.3) / r;
      if (d < 1) a = Math.max(a, (1 - d) * (1 - d) * 0.55);
    }
    if (!a) continue;
    const q = (Y * l.w + X) * 4;
    rgba[q] = Math.min(255, rgba[q] + 233 * a * 0.6);
    rgba[q + 1] = Math.min(255, rgba[q + 1] + 162 * a * 0.5);
    rgba[q + 2] = Math.min(255, rgba[q + 2] + 59 * a * 0.25);
  }
  return { ...l, rgba };
}


let cornerBlock: (k: number) => Block = () => ({ title: [], notes: [], w: 0, h: 0, draw: () => undefined });

// =====================================================================================================================
// Les bâtiments, pièce par pièce
// =====================================================================================================================

/** L'image du jeu d'un objet dans sa vue, au bois vieux s'il prend l'âge. */
function propImg(key: string, viewK = 0): Img {
  const def = props[key];
  if (!def) throw new Error(`essai-forge : pas d'objet « ${key} »`);
  const k = formView(variantImage(def.image, undefined), def.views, viewK, undefined, has);
  return img(def.aged && has(`${k}-old`) ? `${k}-old` : k);
}
/** Un objet de props.json posé en cm (x0, y0 : coin nord-ouest de son emprise dans sa vue), comme le jeu le pose ; offset en px. */
function prop(key: string, x0: number, y0: number, viewK = 0, z = 0, o: [number, number] = [0, 0], depth?: number): Board {
  const d = props[key].dims, [w, dd] = viewK % 2 ? [d.d, d.w] : [d.w, d.d];
  const b = placeImg(propImg(key, viewK), o[0] + x0 / 5, o[0] + (x0 + w) / 5, o[1] + (y0 + dd) / 5, z / 5);
  return depth === undefined ? b : { ...b, depth: () => depth };
}
/** Une pièce nouvelle (art/proposals/forge.ts), posée en cm comme le jeu la poserait. */
function piece(key: string, x0: number, x1: number, ySouth: number, viewK = 0, z = 0, o: [number, number] = [0, 0], grid?: Grid): Board {
  return placeImg({ grid: grid ?? pieceImage(key, viewK), pal: PAL }, o[0] + x0 / 5, o[0] + x1 / 5, o[1] + ySouth / 5, z / 5);
}

interface GrangeOpts { roof: boolean; eastWall: boolean }
/**
 * L'atelier : la grange de src/content/plans/grange.json pièce par pièce, au bois vieux, son mur sud ouvert (ni bardage ni porte
 * charretière) ; sans `roof`, ni toit, ni pignons, ni charpente haute (sablières, entraits, poinçons, faîtage : z ≥ 312) ; sans
 * `eastWall`, sans le bardage est (la version B : le mur mitoyen de pierre).
 */
function grangeBoards(o: [number, number], opt: GrangeOpts): Board[] {
  const raw = (grangeJson as unknown as { pieces: Omit<BuildPiece, 'id'>[] }).pieces;
  const pieces: BuildPiece[] = raw.map((p, id) => ({ ...p, id }) as BuildPiece).filter((p) => {
    const ref = p.piece as { prop?: string };
    if (ref.prop === 'cart-door') return false;
    if (ref.prop === 'board-wall' && p.y === 640) return false;
    if (!opt.eastWall && ref.prop === 'board-wall' && p.x === 920) return false;
    if (!opt.eastWall && ref.prop === 'board-gable' && p.x === 900) return false;
    if (!opt.roof && p.z >= 312) return false;
    return true;
  });
  const depth = depthsOf(pieces);
  return pieces.map((p) => {
    const b = boxOf(p);
    let g: Img, lift = 0;
    if ('wood' in p.piece) {
      const w = p.piece.wood;
      g = { grid: composeWood(w).toGrid(), pal: OLD };
      if (w.axis === 'up') lift = upOf(w.size, lookOf(w)).lift;
    } else g = propImg((p.piece as { prop: string }).prop, p.view);
    const w = g.grid[0].length;
    const x = Math.round((b.x + b.w / 2) / 5 - w / 2) + o[0];
    const y = Math.round((b.y + b.d - b.z) / 5) + lift + o[1];
    const d = depth.get(p.id)! + o[1];
    return { grid: g.grid, pal: g.pal, x, y: y - g.grid.length, depth: () => d };
  });
}
/** L'ombre portée du toit de l'atelier : deux pans invisibles qui ne font que porter leur ombre (src/config.ts `SHADOW`). */
function grangeRoofShadow(o: [number, number]): Quad[] {
  const P = part('ombre du toit', 0, 'o', 'none', { cast: true });
  const none: Tex = () => null;
  return [
    { o: [o[0], o[1] + 68, 120.4], u: [192, 0, 0], v: [0, 68, -52], n: [0, 0.6, 0.8], part: P, tex: none, face: 'slope' },
    { o: [o[0], o[1], 68.4], u: [192, 0, 0], v: [0, 68, 52], n: [0, -0.6, 0.8], part: P, tex: none, face: 'slope' },
  ];
}

/** L'abri à charbon : l'abri à bois du jeu (src/content/plans.json `woodshed`), place par place, au bois vieux. */
function shedBoards(o: [number, number], roof: boolean): Board[] {
  const plan = (plansJson as unknown as Record<string, { steps: { places: Record<string, { piece: string; at: [number, number]; accepts?: { wood?: { length: number } } }> }[] }>).woodshed;
  const out: Board[] = [];
  plan.steps.forEach((st, si) => {
    for (const pl of Object.values(st.places)) {
      if (!roof && (pl.piece === 'shed-roof' || pl.piece === 'shed-rafter')) continue;
      let g: Img;
      if (pl.piece === 'wood-piece') g = { grid: composeWood(beamPiece(pl.accepts!.wood!.length, 'up')).toGrid(), pal: OLD };
      else g = has(`${pl.piece}-old`) ? img(`${pl.piece}-old`) : img(pl.piece);
      const x = o[0] + pl.at[0] / 5, y = o[1] + pl.at[1] / 5;
      const d = y + si * 0.01;
      out.push({ grid: g.grid, pal: g.pal, x: Math.round(x), y: Math.round(y) - g.grid.length, depth: () => d });
    }
  });
  return out;
}

/** Le logis : la maison de Xéros raccourcie, 8 × 6,40 m entre les axes, cinq travées sur quatre, la salle et la chambre. */
const LOGIS: Plan = {
  L: 160, D: 128, pitch: 45, sill: 16, doorW: 18, innerDoorW: 16, trusses: [96],
  walls: [
    { side: 'S', ew: true, c: 128, posts: [0, 32, 64, 96, 128, 160], out: 1, bays: ['plain', 'window', 'door', 'plain', 'window'] },
    { side: 'N', ew: true, c: 0, posts: [0, 32, 64, 96, 128, 160], out: -1, bays: ['plain', 'plain', 'window', 'plain', 'plain'] },
    { side: 'W', ew: false, c: 0, posts: [0, 32, 64, 96, 128], out: -1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 160, posts: [0, 32, 64, 96, 128], out: 1, bays: ['plain', 'window', 'plain', 'plain'], ends: [true, true] },
    { ew: false, c: 96, posts: [0, 32, 64, 96, 128], out: 1, bays: ['plain', 'plain', 'inner-door', 'plain'], ends: [true, true] },
  ],
};
/** La cheminée du jeu dans le logis : l'âtre en x 10–54 px (contre le mur nord de la salle). */
const CH_DX = 10 - CH_AT.hearth[0];

/** Le chaume percé au droit du conduit (repère de la maison). */
function pierce(quads: Quad[]): Quad[] {
  const x0 = CH_AT.flue(0)[0] + CH_DX, y0 = CH_AT.flue(0)[1], x1 = x0 + 20, y1 = y0 + 16;
  return quads.map((q) => {
    if (q.part.name !== 'chaume' && q.part.name !== 'latte' && q.part.name !== 'chevron') return q;
    const tex: Tex = (s, t, cx) => {
      const [x, y] = cx.p;
      if (x > x0 - 0.3 && x < x1 + 0.3 && y > y0 - 0.3 && y < y1 + 0.3) return null;
      const k = q.tex(s, t, cx);
      if (k === null || q.part.name !== 'chaume' || cx.face !== 'slope') return k;
      if (x > x0 - 2.1 && x < x1 + 2.1 && y > y0 - 2.1 && y < y1 + 2.1) return x < x0 + 0.5 || y < y0 ? 'd' : 'D';
      return k;
    };
    return { ...q, tex };
  });
}

/** Le logis dans la scène, à l'origine o (px, l'axe du poteau nord-ouest) ; toit posé ou non (le mur sud et la cloison coupés bas). */
function logisScene(o: [number, number], roof: boolean, frame = 0): { quads: Quad[]; boards: Board[]; floor: [number, number, number, number] } {
  const house = houseScene(roof ? { rot: 0, wall: 4, roof: 5, plan: LOGIS } : { rot: 0, wall: 4, roof: 0, cut: true, plan: LOGIS }, img);
  let quads = house.quads;
  if (roof) quads = pierce(quads);
  const chim = moveQuads(chimneyQuads(frame, roof ? Infinity : 52), [CH_DX, 0, 0]);
  const m = mantel('ew');
  const mb: Board = { grid: m.grid, pal: m.pal, x: CH_AT.mantel[0] + CH_DX, y: Math.round(28 - 30 - m.grid.length), depth: () => 28 };
  return {
    quads: moveQuads([...quads, ...chim], [o[0], o[1], 0]),
    boards: [...house.boards, mb].map((b) => moveBoard(b, o[0], o[1])),
    floor: [o[0] + 5, o[0] + 155, o[1] + 5, o[1] + 123],
  };
}

/** Les meubles du logis (repère du logis, px) : la salle et la chambre. */
function logisFurniture(o: [number, number]): Board[] {
  const at = (key: string, x: number, y: number, v = 0) => prop(key, x * 5, y * 5, v, 0, o);
  return [
    at('table', 28, 58), at('bench', 29, 77), at('stool', 34, 50), at('stool', 58, 50),
    at('barrel', 7, 90), at('jar', 8, 106), at('bucket-water', 58, 12), at('chest', 6, 38, 1),
    at('bed', 122, 6), at('chest', 102, 6), at('crate', 140, 108),
  ];
}

// ---------- l'atelier meublé (repère de l'atelier, cm ; plan de la grange : poteaux en x 40, 320, 600, 880 et y 40, 320, 600) ----------

/** Les places des meubles de l'atelier, en cm (décalées des poteaux du plan de la grange : voir le rendu). */
const SHOP = {
  forge: [160, 380, 60, 170] as const,
  oven: [560, 700, 60, 200] as const,
  bellows: [75, 150, 60, 240] as const,
  trough: [395, 515, 75, 125] as const,
  block: [240, 300, 270, 330] as const,
  toolRack: [60, 75, 340, 460] as const,
  bin: [50, 150, 470, 570] as const,
  bench: [780, 850, 120, 440] as const,
  barRack: [880, 920, 400, 560] as const,
  grind: [690, 790, 500, 550] as const,
  scrap: [790, 850, 560, 610] as const,
};

/** Le mobilier de l'atelier (version A) et ce qui va avec la forge : la hotte, le conduit, la perche du soufflet. */
function shopFurniture(o: [number, number], roof: boolean, frame = 0): { boards: Board[]; quads: Quad[] } {
  const B: Board[] = [];
  const [fx0, fx1, fy0, fy1] = SHOP.forge;
  B.push(piece('forge-hearth', fx0, fx1, fy1, 0, 0, o, forgeFrames(0)[frame]));
  // la hotte du jeu sur les joues et le contrecœur (y 60–140, z 160) ; le conduit au droit du passage, quatre tronçons et le couronnement
  B.push(prop('chimney-hood', fx0, fy0, 0, 160, o));
  const north = o[1] + 68.5; // la profondeur du pan nord percé : le conduit passe devant lui, derrière le pan sud
  const tops = roof ? [260, 360, 460, 560] : [260];
  tops.forEach((z, k) => B.push(prop('chimney-flue', fx0 + 60, fy0, 0, z, o, roof ? north + k * 0.01 : o[1] + (fy0 + 80) / 5 + k * 0.01)));
  if (roof) B.push(prop('chimney-cap', fx0 + 40, fy0 - 10, 0, 660, o, north + 0.1));
  // le four, son petit conduit de pierre jusqu'au-dessus du faîte
  const [ox0, ox1, , oy1] = SHOP.oven;
  B.push(piece('forge-oven', ox0, ox1, oy1, 0, 0, o));
  const fl = view(ovenFlueModel(roof ? 106 : 42), 0, true);
  B.push({ ...placeImg({ grid: fl, pal: PAL }, o[0] + (ox0 + 55) / 5, o[0] + (ox0 + 85) / 5, o[1] + (oy1 - 100) / 5, 26), depth: () => (roof ? north + 0.2 : o[1] + (oy1 - 100) / 5) });
  const [bx0, bx1, , by1] = SHOP.bellows;
  B.push(piece('forge-bellows', bx0, bx1, by1, 3, 0, o));
  B.push(piece('quench-trough', SHOP.trough[0], SHOP.trough[1], SHOP.trough[3], 0, 0, o));
  B.push(piece('anvil-block', SHOP.block[0], SHOP.block[1], SHOP.block[3], 0, 0, o));
  B.push({ ...piece('anvil', 235, 305, 310, 0, 55, o), depth: () => o[1] + SHOP.block[3] / 5 + 0.01 });
  B.push(piece('tool-rack', SHOP.toolRack[0], SHOP.toolRack[1], SHOP.toolRack[3], 3, 0, o));
  B.push(piece('charcoal-bin', SHOP.bin[0], SHOP.bin[1], SHOP.bin[3], 0, 0, o));
  B.push(prop('workbench', SHOP.bench[0], SHOP.bench[2], 1, 0, o));
  B.push({ ...placeImg({ grid: VISE, pal: PAL }, o[0] + 800 / 5, o[0] + 830 / 5, o[1] + 432 / 5, 85 / 5), depth: () => o[1] + 441 / 5 });
  B.push(piece('bar-rack', SHOP.barRack[0], SHOP.barRack[1], SHOP.barRack[3], 1, 0, o));
  B.push(piece('grindstone', SHOP.grind[0], SHOP.grind[1], SHOP.grind[3], 0, 0, o));
  B.push(placeImg({ grid: crateFull(), pal: PAL }, o[0] + SHOP.scrap[0] / 5, o[0] + SHOP.scrap[1] / 5, o[1] + SHOP.scrap[3] / 5));
  B.push(prop('bucket-water', 525, 95, 0, 0, o));
  B.push(prop('sack', 160, 480, 0, 0, o));
  // la perche du soufflet : sur un poteau-pivot à l'est du soufflet, la chaîne au-dessus du dos du soufflet, la poignée devant la forge
  const Q: Quad[] = [];
  const A: V3 = [o[0] + 112 / 5, o[1] + 205 / 5, 40], Z: V3 = [o[0] + 305 / 5, o[1] + 192 / 5, 33];
  Q.push(...prism(A, Z, [0, 1, 0], [0, 0, 1], 1.6, 1.6, part('perche', 7, 'K', 'full'), pole(91)));
  Q.push(...box(o[0] + 158 / 5, o[0] + 158 / 5 + 3, o[1] + 196 / 5, o[1] + 196 / 5 + 3, 0, 38.5, part('pivot', 6, '&', 'full'), timber(92)));
  Q.push(...box(A[0] + 0.5, A[0] + 1.5, A[1] - 0.5, A[1] + 0.5, 22, 40, part('chaîne', 8, '>', 'thin'), iron));
  return { boards: B, quads: Q };
}

// ---------- le sol et les étiquettes ----------

type Rect = [number, number, number, number]; // x0, x1, y0, y1 (px)
const inR = (r: Rect, x: number, y: number) => x >= r[0] && x < r[1] && y >= r[2] && y < r[3];
/** La rue (rangées 65 à 67 du village : y 544–640 de la parcelle), les terres battues d'une version, l'herbe ailleurs. */
function groundFor(yards: Rect[], floors: Rect[]): (x: number, y: number) => string {
  const kind = (cx: number, cy: number): GroundKind => {
    const x = cx * 32 + 16, y = cy * 32 + 16;
    if (y >= 544 && y < 640) return 'yard';
    return yards.some((r) => inR(r, x, y)) ? 'yard' : 'grass';
  };
  const g = groundOf(kind);
  return (x, y) => (floors.some((r) => inR(r, x, y)) ? floorTile(x, y) : g(x, y));
}
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
function floorTile(x: number, y: number): string {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  const t = interiorTiles.tiles[FLOOR[Math.floor(hash(6, cx, cy) * FLOOR.length)]];
  return interiorTiles.palette[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
}

// =====================================================================================================================
// Les trois versions
// =====================================================================================================================

interface Version { key: string; title: string; notes: string[]; scene: Scene; ground: (x: number, y: number) => string; frameX: number; fires: [number, number, number][] }

/** A, « la cour » : l'atelier au sud sur la rue, le logis derrière une cour de 5 m, l'abri à charbon à l'est, le puits. */
function versionA(roof: boolean, frame = 0): Version {
  const shop: [number, number] = [60, 300], logis: [number, number] = [60, 50], shed: [number, number] = [280, 320];
  const L = logisScene(logis, roof, frame);
  const F = shopFurniture(shop, roof, frame);
  const boards = [
    ...grangeBoards(shop, { roof, eastWall: true }), ...F.boards, ...L.boards, ...shedBoards(shed, roof),
    prop('well', 0, 0, 0, 0, [150, 204]),
    prop('sack', 0, 0, 0, 0, [290, 335]), prop('sack', 0, 0, 0, 0, [302, 337]), prop('sack', 0, 0, 0, 0, [314, 334]),
  ];
  if (!roof) boards.push(...logisFurniture(logis));
  const yards: Rect[] = [[60, 252, 184, 480], [128, 192, 480, 544], [270, 350, 300, 400]];
  return {
    key: 'A', title: 'A, LA COUR (RECOMMANDEE)',
    notes: ['l atelier (la charpente de la grange, bois vieux) ouvert au sud sur la rue ; le logis derriere une cour de 5 m', 'le feu est a 5 m du chaume ; l abri a charbon a l est ; le puits dans la cour'],
    scene: { quads: [...L.quads, ...F.quads, ...(roof ? grangeRoofShadow(shop) : [])], boards },
    ground: groundFor(yards, [L.floor]), frameX: -12,
    fires: [[shop[0] + 54, shop[1] + 22, 26]],
  };
}

/** B, « en long » : l'atelier à l'ouest, le logis à l'est, côte à côte sur la rue, un mur mitoyen de pierre entre les deux. */
function versionB(): Version {
  const shop: [number, number] = [40, 300], logis: [number, number] = [244, 308];
  const L = logisScene(logis, true);
  const boards = [...grangeBoards(shop, { roof: true, eastWall: false }), ...L.boards];
  // le mur mitoyen : 50 cm de moellons, de la dalle nord à la dalle sud, jusque sous le toit (3,42 m)
  const wx = shop[0] + 184;
  const quads: Quad[] = [...L.quads, ...grangeRoofShadow(shop), ...box(wx, wx + 10, shop[1] + 2, shop[1] + 134, 0, 68, part('mur mitoyen', 6, '~', 'full'), masonry(201, (f) => (f === 'S' ? [true, true] : [false, false])))];
  // la forge adossée au mur, de côté (r1 : son feu regarde l'ouest), la hotte et le conduit qui perce le pan sud
  const o = shop;
  boards.push(piece('forge-hearth', 810, 920, 580, 1, 0, o, forgeFrames(1)[0]));
  boards.push(prop('chimney-hood', 840, 360, 1, 160, o));
  for (const z of [490, 590]) boards.push(prop('chimney-flue', 840, 420, 1, z, o, o[1] + 140));
  boards.push(prop('chimney-cap', 830, 400, 1, 690, o, o[1] + 140.1));
  boards.push(piece('anvil-block', 620, 680, 500, 0, 0, o), { ...piece('anvil', 615, 685, 490, 0, 55, o), depth: () => o[1] + 100.01 });
  boards.push(piece('quench-trough', 650, 750, 360, 1, 0, o));
  boards.push(piece('forge-bellows', 840, 915, 340, 3, 0, o));
  boards.push(prop('workbench', 60, 120, 1, 0, o), piece('charcoal-bin', 120, 220, 560, 0, 0, o));
  return {
    key: 'B', title: 'B, EN LONG',
    notes: ['l atelier a l ouest (cote chemin), le logis a l est, sous deux toits ; facade de 18,50 m', 'un mur mitoyen de pierre coupe-feu ; la forge adossee a lui, son conduit perce le pan sud'],
    scene: { quads, boards }, ground: groundFor([[40, 232, 300, 480], [100, 164, 480, 544], [300, 340, 436, 544]], [L.floor]), frameX: 18,
    fires: [[o[0] + 173, o[1] + 94, 22]],
  };
}

/** C, « l'appentis » : le logis seul sur la rue, un appentis ouvert contre son pignon ouest maçonné, la forge adossée au pignon. */
function versionC(): Version {
  const lx = 220, ly = 308;
  const L = logisScene([lx, ly], true);
  const quads: Quad[] = [...L.quads];
  // le pignon ouest maçonné : 45 cm de moellons contre le pan de bois, jusqu'au faîte, par assises en gradins
  const S = part('pignon de pierre', 6, '~', 'full'), mas = masonry(301, (f) => (f === 'S' ? [true, true] : [false, false]));
  quads.push(...box(lx - 14, lx - 5, ly - 4, ly + 132, 0, 52, S, mas));
  for (let k = 0; k < 16; k++) {
    const d = 66 - k * 4, z0 = 52 + k * 4;
    quads.push(...box(lx - 14, lx - 5, ly + 64 - d, ly + 64 + d, z0, z0 + 4, S, mas));
  }
  // l'appentis : 4 m sur 6,40 m, trois poteaux à l'ouest, une sablière, un pan de planches de 2,80 m (contre le pignon) à 2,20 m
  const W0 = lx - 94, T = part('appentis', 6, 'K', 'full');
  for (const y of [ly + 2, ly + 62, ly + 124]) quads.push(...box(W0, W0 + 4, y, y + 4, 0, 44, T, timber(310 + y)));
  quads.push(...box(W0 - 1, W0 + 5, ly, ly + 130, 44, 47, T, timber(320)));
  const planks: Tex = (s, t, c) => {
    if (c.face !== 'slope') return '%';
    const i = Math.floor(s), j = Math.floor(t);
    if (i % 5 === 0) return '@';
    return hash(330, i, Math.floor(j / 4)) < 0.15 ? '%' : i % 5 === 1 ? '^' : '*';
  };
  const slope: Quad = { o: [W0 - 4, ly - 4, 44], u: [0, 140, 0], v: [W0 + 4 - (W0 - 4) + (lx - 14 - W0), 0, 13], n: [-0.27, 0, 0.96], part: part('pan d appentis', 8, '&', 'full', { roof: true, cast: true }), tex: planks, face: 'slope' };
  quads.push(slope);
  quads.push(...box(W0 - 4, lx - 14, ly + 136, ly + 137, 44, 57, part('rive', 8, '&', 'full'), (_s, t, c) => (c.face === 'top' ? '^' : t > c.h - 1 ? '^' : '%')));
  const boards = [...L.boards];
  // la forge contre le pignon, sous l'appentis : de la rue, le pan la cache (le jeu ne l'efface que quand Xéros est dessous) ; seul son
  // conduit sort du pan, le long du pignon, jusqu'au-dessus du faîte (la vue sans toit : planche de l'intérieur, version A seulement)
  for (let k = 0; k < 6; k++) boards.push(prop('chimney-flue', (lx - 30) * 5, (ly + 52) * 5, 1, 300 + k * 100, [0, 0], ly + 140 + k * 0.01));
  boards.push(prop('chimney-cap', (lx - 32) * 5, (ly + 48) * 5, 1, 900, [0, 0], ly + 140.1));
  return {
    key: 'C', title: 'C, L APPENTIS',
    notes: ['le logis seul sur la rue ; un appentis ouvert de 4 X 6,40 m contre son pignon ouest, maconne', 'la forge adossee au pignon de pierre, son conduit le long de lui ; la plus petite, la plus paysanne'],
    scene: { quads, boards }, ground: groundFor([[lx - 100, lx - 10, ly - 4, 480], [lx - 70, lx - 30, 480, 544], [lx + 64, lx + 96, ly + 128, 544]], [L.floor]), frameX: 20,
    fires: [[lx - 25, ly + 46, 20]],
  };
}

/** Xéros dans la rue. */
const XEROS_STREET: Record<string, [number, number]> = { A: [180, 588], B: [200, 588], C: [170, 588] };

function outsideBlock(v: Version): Block {
  const k = 2;
  const [x0, y0, x1, y1] = [v.frameX, -112, v.frameX + 427, 648];
  const sc: Scene = { ...v.scene, boards: [...v.scene.boards, who('xeros', ...XEROS_STREET[v.key])] };
  const l = render(sc, [x0, y0, x1, y1], { grass: v.ground, floor: v.ground });
  const inFrame = (X: number, Y: number) => X >= x0 && X < x1 && Y >= 400 && Y < 640;
  return {
    title: [v.title, 'CADRE DU JEU (427 X 240 PX, 21 X 12 M) EN CLAIR, LA RUE EN BAS ; AU-DESSUS, ASSOMBRI : LA SUITE DE LA PARCELLE'],
    notes: v.notes,
    w: l.w * k, h: l.h * k,
    draw: (sh, x, y) => {
      blitLayer(sh, l, x, y, k, (X, Y) => !inFrame(X, Y));
      const fy = y + (400 - y0) * k, fh = 240 * k;
      for (let i = 0; i < l.w * k; i += 8) { sh.rect(x + i, fy, 4, 2, GOLD); sh.rect(x + i, fy + fh - 2, 4, 2, GOLD); }
      sh.text('CADRE DU JEU', x + 6, fy + 6, GOLD, T);
    },
  };
}

// =====================================================================================================================
// L'intérieur de la version A
// =====================================================================================================================

function interiorBlock(): Block {
  const k = 2, frame = 1;
  const v = versionA(false, frame);
  const bd: Bounds = [-16, -40, 496, 648];
  const sc: Scene = { ...v.scene, boards: [...v.scene.boards, who('xeros', 60 + 64, 300 + 70), who('xeros', 60 + 70, 50 + 100)] };
  let l = render(sc, bd, { grass: v.ground, floor: v.ground });
  l = withGlow(l, [[60 + 54, 300 + 22, 30], [60 + 30, 50 + 14, 22]]);
  const labels: [string, number, number][] = [
    ['FORGE ET HOTTE', 60 + 30, 300 + 38], ['SOUFFLET', 60 + 14, 300 + 50], ['AUGE', 60 + 80, 300 + 30], ['ENCLUME', 60 + 46, 300 + 70],
    ['FOUR', 60 + 112, 300 + 44], ['RATELIER', 60 + 2, 300 + 96], ['COFFRE A CHARBON', 60 + 2, 300 + 118], ['ETABLI ET ETAU', 60 + 136, 300 + 92],
    ['BARRES', 60 + 168, 300 + 116], ['MEULE', 60 + 138, 300 + 114], ['FERRAILLE', 60 + 152, 300 + 126], ['PUITS', 160, 238],
    ['COUR', 120, 210], ['SALLE', 60 + 30, 50 + 40], ['CHAMBRE', 60 + 104, 50 + 56], ['CHEMINEE', 60 + 12, 50 + 2],
    ['ABRI A CHARBON', 280, 318], ['PLACE DE LA FONDERIE (RESERVEE)', 304, 56], ['LA RUE', 200, 600],
  ];
  return {
    title: ['A, LA COUR : TOITS ET CHARPENTE HAUTE EFFACES, LE MUR SUD DU LOGIS COUPE BAS, X2', 'LA PARCELLE DE 24 X 24 M (POINTILLE BLANC), LA RUE EN BAS'],
    notes: [
      'atelier : le plan de la grange (poteaux, bardage nord, ouest, est, dalles), bois vieux, ouvert au sud ; la lueur des feux comme le jeu la peindrait',
      'xeros dans l atelier, pres de l enclume, et dans la salle du logis ; le conduit coupe au niveau des sablieres',
    ],
    w: l.w * k, h: l.h * k,
    draw: (sh, x, y) => {
      blitLayer(sh, l, x, y, k);
      const P = (X: number, Y: number): [number, number] => [x + (X - bd[0]) * k, y + (Y - bd[1]) * k];
      const dashed = (r: Rect, c: Rgb) => {
        const [a, b] = P(r[0], r[2]), [cc, d] = P(r[1], r[3]);
        for (let i = a; i < cc; i += 10) { sh.rect(i, b, 5, 2, c); sh.rect(i, d, 5, 2, c); }
        for (let j = b; j < d; j += 10) { sh.rect(a, j, 2, 5, c); sh.rect(cc, j, 2, 5, c); }
      };
      dashed([0, 480, 0, 480], [235, 235, 225]);
      dashed([300, 460, 50, 200], GOLD);
      for (const [s, X, Y] of labels) {
        const [px, py] = P(X, Y), w = textWidth(s, 1) + 3;
        for (let j = 0; j < 8; j++) for (let i = 0; i < w; i++) sh.dot(px - 1 + i, py - 1 + j, [30, 26, 22], 0.55);
        sh.text(s, px, py, [250, 240, 210], 1);
      }
    },
  };
}

// ---------- le coin du feu, comme le jeu le montre (x4) ----------

cornerBlock = (k: number): Block => {
  const v = versionA(false, 1);
  const bd: Bounds = [60 - 2, 300 - 40, 60 + 110, 300 + 80];
  const sc: Scene = { ...v.scene, boards: [...v.scene.boards, who('xeros', 60 + 60, 300 + 46)] };
  const l = withGlow(render(sc, bd, { grass: v.ground, floor: v.ground }), [[60 + 54, 300 + 22, 30]]);
  return {
    title: ['LE COIN DU FEU, DANS LE JEU (X4)', 'SOUFFLET R3 (BUSE AU NORD), PERCHE SUR SON PIVOT, FORGE, AUGE, ENCLUME'],
    notes: ['la perche (2,50 m) : la chaine au-dessus du dos du soufflet, la poignee devant la forge', 'xeros a la place du forgeron, entre le feu et l enclume'],
    w: l.w * k, h: l.h * k, draw: (sh, x, y) => blitLayer(sh, l, x, y, k),
  };
};

// =====================================================================================================================
// Écriture
// =====================================================================================================================

function main(): void {
  const only = process.argv[2];
  if (!only || only === 'detail') write(detailSheet(), 'forge-detail.png');
  if (!only || only === 'dehors') write(sheetOf([[outsideBlock(versionA(true)), outsideBlock(versionB()), outsideBlock(versionC())]], [
    'LA FORGE DU VILLAGE, VUE DE LA RUE : TROIS VERSIONS (ESSAI HORS JEU)',
    'x2 ; la rue de terre battue (3 cases, 4,80 m) en bas, xeros dedans ; images du jeu (grange, abri, hotte, conduit) et pieces nouvelles',
    'le cadre du jeu au palier 3 (427 X 240 px du monde) en clair : debout dans la rue, on ne voit que le bas du batiment',
  ]), 'forge-dehors.png');
  if (!only || only === 'interieur') write(sheetOf([[interiorBlock()]], [
    'LA FORGE DU VILLAGE, VERSION A, SANS SES TOITS (ESSAI HORS JEU)',
    'atelier, cour et puits, logis (salle, chambre, cheminee), abri a charbon, place de la fonderie reservee (pointille or)',
  ]), 'forge-interieur.png');
  for (const l of REPORT) console.log(`  ${l}`);
}
main();
