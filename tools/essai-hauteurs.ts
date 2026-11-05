// Essai hors jeu (chantier « hauteurs », CADRAGE-hauteurs.md section 5) : la planche avant / après de la hauteur vraie de la pièce de
// bois couchée, .art-preview/hauteurs-avant-apres.png. Lancé par `npx tsx tools/essai-hauteurs.ts`. Rien ici n'entre dans le jeu.
//
// Les plans : « avant », les copies des plans du jeu (.art-preview/hauteurs/<plan>-avant.json) ; « après », les plans recalés par
// tools/recale-hauteurs.ts (.art-preview/hauteurs/<plan>.json). Lancer d'abord `npx tsx tools/recale-hauteurs.ts`.
//
// Méthode de tools/essai-forge-ensemble.ts (les pièces posées comme le jeu les monte, world/buildView.ts et GameMap.sortBuilds) :
// chaque pièce prend son image, sa place (le bas au bord sud de son emprise relevé de sa hauteur z, 5 cm par pixel), sa profondeur
// (le bord sud, puis ce qui la porte) et le décalage de ce qui la porte (GameMap.offsetOf) ; les murs de pierre par world/walls.ts,
// la pièce de bois par les opérations de world/woodShape.ts.
//
// « Après », le moteur du jeu compte encore l'ancienne hauteur (boxOf, woodDims) : l'essai prend une boîte locale (`boxM`) :
// - la pièce de bois couchée (ew, ns) : l'ancienne hauteur moins le contour (10 cm) ;
// - le solin (`rough-sill-wall`, `narrow-sill-wall`) 50 cm au lieu de 40, dessiné par art/proposals/walls-solin-50.ts (la face de
//   10 px au lieu de 8) ;
// - la porte en planches 210 au lieu de 200, dessinée par art/proposals/cabane-hauteurs.ts ; le volet de cabane 60 × 60 (variante B).
// Ce qui porte quoi (supports, profondeurs, décalages) se calcule avec ces hauteurs.
//
// Le recouvrement (section 5 de la planche) : une ombre de joint, calculée ici comme le jeu la calculerait (jamais peinte dans le
// dessin) : sous le bas de la silhouette d'une pièce couchée posée sur une autre pièce couchée, la rangée de la pièce du dessous est
// assombrie, colonne par colonne, là où elle se voit encore.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PNG } from 'pngjs';
import { props } from '../src/content';
import { CM_PER_PX, CONTOUR_CM } from '../src/content/gabarit';
import type { BuildPlaced, BuildPlan, PileWood, PropDef, WoodPiece } from '../src/content/types';
import { variantImage } from '../src/content/views';
import { wallPalette, wallStones } from '../src/generated/wallStones';
import { boxOf, overlaps, planPieces, swung, type Box3, type BuildPiece } from '../src/world/build';
import { formView } from '../src/world/natural';
import { roofShadow } from '../src/world/roofShadow';
import { runLayout, runPx, wallOf, wallRuns } from '../src/world/wallRuns';
import { wallKit, type WallKit } from '../src/world/walls';
import { wallKit as wallKit50 } from '../art/proposals/walls-solin-50';
import { proposals } from '../art/proposals/cabane-hauteurs';
import { agedKey, composeOps, lookDef, lookOf, sheetOf, upOf, woodBody, woodSize } from '../src/world/woodShape';
import { woodDims } from '../src/world/woodPiece';
import { world, woodAges } from '../art/palette';
import { blank, blit, rect, text, textWidth, toPng, type Img, type RGBA } from './lib/world-render';

const PX = CM_PER_PX; // 5 cm par pixel
export type Mode = 'avant' | 'apres';

// ---------------------------------------------------------------------------------------------------------------------------------
// Images

const pngCache = new Map<string, Img | null>();
function readImg(path: string): Img {
  const p = PNG.sync.read(readFileSync(path));
  return { w: p.width, h: p.height, data: new Uint8Array(p.data) };
}
export function png(key: string): Img | undefined {
  if (!pngCache.has(key)) pngCache.set(key, existsSync(`src/generated/${key}.png`) ? readImg(`src/generated/${key}.png`) : null);
  return pngCache.get(key) ?? undefined;
}
const has = (key: string) => existsSync(`src/generated/${key}.png`);

const SHEETS = new Map<string, { fw: number; fh: number; anims: Record<string, { frames: number[] }> }>();
for (const line of readFileSync('src/generated/assets.ts', 'utf8').split('\n')) {
  const m = /\{ key: '([^']+)', url: \w+, frameWidth: (\d+), frameHeight: (\d+), animations: (\{.*\}), silhouette/.exec(line);
  if (m) SHEETS.set(m[1], { fw: Number(m[2]), fh: Number(m[3]), anims: JSON.parse(m[4]) });
}

export function crop(src: Img, x: number, y: number, w: number, h: number): Img {
  const out = blank(w, h, [0, 0, 0, 0]);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const sx = x + i;
      const sy = y + j;
      if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
      out.data.set(src.data.subarray((sy * src.w + sx) * 4, (sy * src.w + sx) * 4 + 4), (j * w + i) * 4);
    }
  return out;
}
export function frameOf(sheet: string, n: number): Img {
  const s = SHEETS.get(sheet);
  const img = png(sheet);
  if (!s || !img) throw new Error(`essai-hauteurs : pas de planche « ${sheet} »`);
  const cols = Math.floor(img.w / s.fw);
  return crop(img, (n % cols) * s.fw, Math.floor(n / cols) * s.fh, s.fw, s.fh);
}
function over(dst: Img, x: number, y: number, c: ArrayLike<number>): void {
  if (x < 0 || y < 0 || x >= dst.w || y >= dst.h || !c[3]) return;
  const i = (y * dst.w + x) * 4;
  const sa = c[3] / 255;
  const da = dst.data[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  for (let k = 0; k < 3; k++) dst.data[i + k] = Math.round((c[k] * sa + dst.data[i + k] * da * (1 - sa)) / oa);
  dst.data[i + 3] = Math.round(oa * 255);
}
export function overImg(dst: Img, src: Img, x: number, y: number): void {
  for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) over(dst, x + i, y + j, src.data.subarray((j * src.w + i) * 4, (j * src.w + i) * 4 + 4));
}
export const hex = (h: string): RGBA => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), h.length === 9 ? parseInt(h.slice(7, 9), 16) : 255];
const opaque = (img: Img, x: number, y: number) => x >= 0 && y >= 0 && x < img.w && y < img.h && img.data[(y * img.w + x) * 4 + 3] > 0;

/** Une grille des dessins proposés en image, dans la rampe du bois à l'âge voulu. */
export function propoImg(key: string, age: 'new' | 'worn' | 'old' = 'new'): Img {
  const g = proposals[key];
  if (!g) throw new Error(`essai-hauteurs : pas de dessin proposé « ${key} »`);
  const pal: Record<string, string> = { ...world, ...woodAges[age] };
  const out = blank(g[0].length, g.length, [0, 0, 0, 0]);
  g.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.') out.data.set(hex(pal[ch]), (y * out.w + x) * 4);
  }));
  return out;
}

export function woodImg(piece: WoodPiece): Img {
  const { w, h } = woodSize(piece.size, lookOf(piece), piece.axis, piece.length);
  const out = blank(w, h, [0, 0, 0, 0]);
  const src = sheetOf(piece);
  const sheet = SHEETS.get(src);
  if (!sheet) throw new Error(`essai-hauteurs : pas de planche de bois « ${src} »`);
  for (const op of composeOps(piece, { frame: 0 })) {
    if (op.kind === 'clear') {
      for (let k = op.at; k < op.at + op.size; k++)
        for (let q = 0; q < (piece.axis === 'ew' ? h : w); q++) {
          const [x, y] = piece.axis === 'ew' ? [k, q] : [q, k];
          if (x >= 0 && y >= 0 && x < w && y < h) out.data.fill(0, (y * w + x) * 4, (y * w + x) * 4 + 4);
        }
      continue;
    }
    const f = frameOf(src, sheet.anims[op.anim].frames[op.frame]);
    const from = Math.max(op.at, op.clip?.[0] ?? -Infinity, 0);
    const to = Math.min(op.at + op.size, op.clip?.[1] ?? Infinity, piece.axis === 'ew' ? w : h);
    for (let k = from; k < to; k++) {
      if (piece.axis === 'ew') for (let y = 0; y < Math.min(h, f.h); y++) over(out, k, y, f.data.subarray((y * f.w + (k - op.at)) * 4, (y * f.w + (k - op.at)) * 4 + 4));
      else for (let x = 0; x < Math.min(w, f.w); x++) over(out, x, k, f.data.subarray(((k - op.at) * f.w + x) * 4, ((k - op.at) * f.w + x) * 4 + 4));
    }
  }
  return out;
}

const stone = (name: string) => {
  const g = wallStones[name];
  if (!g) throw new Error(`essai-hauteurs : pierre « ${name} » absente`);
  return g;
};
const KITS: Record<Mode, WallKit> = { avant: wallKit(stone), apres: wallKit50(stone) as unknown as WallKit };

function gridImg(grid: string[]): Img {
  const out = blank(grid[0].length, grid.length, [0, 0, 0, 0]);
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') out.data.set(hex(wallPalette[row[x]]), (y * out.w + x) * 4);
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Les hauteurs avant / après

/** Les hauteurs nouvelles des objets que le cadrage change (cm). */
const PROP_H: Record<string, number> = { 'rough-sill-wall': 50, 'narrow-sill-wall': 50, 'plank-door': 210 };

export interface Opts {
  mode: Mode;
  /** Variante B de la cabane : le volet de cabane de 60 × 60 à la place du volet de 40. */
  cabinShutter?: boolean;
  /** L'ombre de joint sous une pièce couchée posée sur une autre : aucune, douce (la teinte `x` de l'ombre), franche (le contour). */
  joint?: 'none' | 'soft' | 'hard';
  /** Sans toit (couvertures, pignons, faîtage, conduit) : pour voir les murs, la charpente, la fenêtre. */
  noRoof?: boolean;
  /** Coupe : les pièces posées à cette hauteur (cm) ou plus haut sont ôtées (la fenêtre du mur est, vue d'en haut). */
  cutAbove?: number;
  /** Les volets ouverts (world/build.ts `swung`) : pour la planche du volet de cabane (tools/essai-volet-cabane.ts). */
  openShutters?: boolean;
}

/** Une pièce de couverture ou ce qui la suit (pignon, faîtage, conduit de cheminée). */
const roofish = (p: BuildPlaced) => 'prop' in p.piece && (!!props[p.piece.prop].roof || /gable|ridge|chimney/.test(p.piece.prop));

const lyingWood = (p: BuildPlaced) => 'wood' in p.piece && p.piece.wood.axis !== 'up';

function hOf(p: BuildPlaced, o: Opts): number {
  const b = boxOf(p);
  if (o.mode === 'avant') return b.h;
  if ('prop' in p.piece) {
    if (o.cabinShutter && (p.piece.prop === 'plank-shutter' || p.piece.prop === 'plank-shutter-open')) return 60;
    return PROP_H[p.piece.prop] ?? b.h;
  }
  return lyingWood(p) ? b.h - CONTOUR_CM : b.h;
}
function boxM(p: BuildPlaced, o: Opts): Box3 {
  return { ...boxOf(p), h: hOf(p, o) };
}
/** Les pièces dont le dessus porte celle-ci (world/build.ts `supportsOf`, aux hauteurs du mode). */
function supportsM(pieces: readonly BuildPiece[], p: BuildPlaced, o: Opts): BuildPiece[] {
  const b = boxM(p, o);
  if (b.z === 0) return [];
  return pieces.filter((q) => q !== p && q.z + hOf(q, o) === b.z && overlaps(boxM(q, o), b));
}
/** Les profondeurs d'affichage (world/build.ts `depthsOf`, aux hauteurs du mode). */
function depthsM(pieces: readonly BuildPiece[], o: Opts): Map<number, number> {
  const out = new Map<number, number>();
  for (const p of [...pieces].sort((a, b) => a.z - b.z)) {
    const b = boxM(p, o);
    let d = (b.y + b.d) / PX + b.z / 100000;
    for (const s of supportsM(pieces, p, o)) d = Math.max(d, (out.get(s.id) ?? 0) + 0.001);
    out.set(p.id, d);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Les pièces posées

interface Sprite {
  img: Img;
  x: number;
  y: number;
  depth: number;
  /** La pièce couchée qui la porte, pour l'ombre de joint. */
  on?: number;
  id?: number;
}

function propImg(p: BuildPiece, o: Opts): Img | undefined {
  if (!('prop' in p.piece)) return undefined;
  const def = props[p.piece.prop];
  const suffix = p.view ? `-r${p.view}` : '';
  if (o.mode === 'apres' && p.piece.prop === 'plank-door') return propoImg(`plank-door${suffix}`, p.age ?? 'new');
  if (o.cabinShutter && (p.piece.prop === 'plank-shutter' || p.piece.prop === 'plank-shutter-open')) return propoImg(`cabin-shutter${suffix}`, p.age ?? 'new');
  let key = formView(variantImage(def.image, p.variant), def.views, p.view, p.natural, has);
  if (def.aged) key = agedKey(key, p.age);
  return SHEETS.has(key) ? frameOf(key, 0) : png(key);
}

export function pieceSprites(pieces: BuildPiece[], o: Opts): Sprite[] {
  const depths = depthsM(pieces, o);
  const look = new Map<number, { img: Img; x: number; y: number }>();
  for (const run of wallRuns(pieces)) {
    const img = gridImg(KITS[o.mode].run({ kind: run.kind, axis: run.axis, length: runPx(run), start: run.start, end: run.end, seed: run.seed, top: Math.round(run.thick / 10), ...(run.extra ? { extra: run.extra } : {}) }));
    const lay = runLayout(run, img.w, img.h);
    run.pieces.forEach((p, i) => {
      const c = lay.crops[i];
      look.set(p.id, { img: crop(img, c.x, c.y, c.w, c.h), x: lay.x + c.x, y: lay.y - img.h + c.y + c.h });
    });
  }
  for (const p of pieces) {
    if (look.has(p.id)) continue;
    const b = boxOf(p);
    let img: Img | undefined;
    let lift = 0;
    if ('wood' in p.piece) {
      img = woodImg(p.piece.wood);
      if (p.piece.wood.axis === 'up') lift = upOf(p.piece.wood.size, lookOf(p.piece.wood)).lift;
    } else img = propImg(p, o);
    if (!img) {
      console.warn(`essai-hauteurs : pas d'image pour ${JSON.stringify(p.piece)}`);
      continue;
    }
    look.set(p.id, { img, x: Math.round((b.x + b.w / 2) / PX - img.w / 2), y: Math.round((b.y + b.d - b.z) / PX) + lift });
  }
  // le décalage de ce qui porte (GameMap.offsetOf), aux hauteurs du mode
  const reglD = (p: BuildPiece) => ('wood' in p.piece ? p.piece.wood.axis === 'ns' : 'prop' in p.piece && !!props[p.piece.prop].lying && p.view % 2 === 1);
  const shown = new Map<number, { dx: number; down: number; on?: number }>();
  for (const p of [...pieces].sort((a, c) => a.z - c.z)) {
    const supports = supportsM(pieces, p, o);
    let off: { dx: number; down: number; on?: number } = { dx: 0, down: 0 };
    if (supports.length) {
      const pb = boxM(p, o);
      const area = (q: BuildPiece) => {
        const b = boxOf(q);
        return Math.max(0, Math.min(b.x + b.w, pb.x + pb.w) - Math.max(b.x, pb.x)) * Math.max(0, Math.min(b.y + b.d, pb.y + pb.d) - Math.max(b.y, pb.y));
      };
      const s = supports.filter((q) => overlaps(boxOf(q), pb)).sort((a, b) => area(b) - area(a) || Number(reglD(a)) - Number(reglD(b)))[0] ?? supports[0];
      const base = shown.get(s.id) ?? { dx: 0, down: 0 };
      off = { dx: base.dx, down: base.down };
      const l = look.get(s.id);
      const sb = boxM(s, o);
      if (l && reglD(s)) {
        const drawn = 'wood' in s.piece ? lookDef(s.piece.wood.size, lookOf(s.piece.wood)).ns.extra : wallOf(s) ? 1 : Math.max(0, l.img.h - Math.round(sb.d / PX));
        off.down += Math.round(sb.h / PX) - drawn;
      }
      // un mur nord-sud dont l'image n'est pas centrée sur son emprise (calée au ras d'un angle)
      if (l && wallOf(s) && s.view % 2) off.dx += l.x - Math.round((sb.x + sb.w / 2) / PX - l.img.w / 2);
      if (lyingWood(p) && supports.some(lyingWood)) off.on = supports.filter(lyingWood)[0].id;
    }
    shown.set(p.id, off);
  }
  const out: Sprite[] = [];
  for (const p of pieces) {
    const l = look.get(p.id);
    if (!l) continue;
    const off = shown.get(p.id)!;
    const floor = p.z === 0 && 'prop' in p.piece && props[p.piece.prop].layer === 'floor';
    out.push({ img: l.img, x: l.x + off.dx, y: l.y - l.img.h + off.down, depth: floor ? -1e9 : depths.get(p.id)!, on: off.on, id: p.id });
  }
  return out;
}

function roofShadows(pieces: BuildPiece[]): { x: number; y: number }[][] {
  const out: { x: number; y: number }[][] = [];
  for (const p of pieces) {
    if (!('prop' in p.piece)) continue;
    const def = props[p.piece.prop];
    if (!def.shadow) continue;
    const b = boxOf(p);
    const d: PropDef = { ...def, dims: { ...def.dims, w: p.view % 2 ? def.dims.d : def.dims.w, d: p.view % 2 ? def.dims.w : def.dims.d } };
    out.push(roofShadow(d, Math.round(b.x / PX), Math.round((b.y + b.d) / PX)));
  }
  return out;
}

function fillPoly(img: Img, pts: { x: number; y: number }[], c: RGBA): void {
  const ys = pts.map((p) => p.y);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a.y <= y + 0.5 && b.y > y + 0.5) || (b.y <= y + 0.5 && a.y > y + 0.5)) xs.push(a.x + ((y + 0.5 - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
      over(img, x, y, c);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Une scène : un plan posé à l'origine, Xéros à côté

export const GROUND: RGBA = hex(world.g);
const SHADOW: RGBA = [43, 26, 16, 64];
export const XEROS = frameOf('xeros', SHEETS.get('xeros')!.anims['idle-down'].frames[0]);

/** Une scène rendue : son image et le coin haut gauche de l'image en px du monde (le plan à l'origine). */
export interface Scene {
  img: Img;
  x0: number;
  y0: number;
  report: string[];
}

let nextId = 1;
const ided = (ps: BuildPlaced[]): BuildPiece[] => ps.map((p) => ({ ...p, id: nextId++ }));
const loadPlan = (name: string): BuildPlan => JSON.parse(readFileSync(`.art-preview/hauteurs/${name}.json`, 'utf8')) as BuildPlan;

/** Le joint assombri sous une pièce couchée posée sur une autre : la rangée sous le bas de sa silhouette, là où l'on voit celle du dessous. */
function jointShade(canvas: Img, s: Sprite, under: Sprite, x0: number, y0: number, kind: 'soft' | 'hard'): void {
  const c: RGBA = kind === 'soft' ? [43, 26, 16, 110] : hex(world.o);
  for (let i = 0; i < s.img.w; i++) {
    let yb = -1;
    for (let j = s.img.h - 1; j >= 0; j--) if (opaque(s.img, i, j)) { yb = j; break; }
    if (yb < 0) continue;
    const wx = s.x + i;
    const wy = s.y + yb + 1;
    if (!opaque(under.img, wx - under.x, wy - under.y)) continue;
    over(canvas, wx - x0, wy - y0, c);
  }
}

export function renderScene(pieces: BuildPiece[], o: Opts, xeros: { x: number; y: number } | undefined, pad = 12): Scene {
  const report: string[] = [];
  for (const p of pieces) if (p.z > 0 && !supportsM(pieces, p, o).length) report.push(`${o.mode} : pièce sans appui ${JSON.stringify(p.piece).slice(0, 80)} z ${p.z}`);
  const sprites = pieceSprites(pieces, o);
  if (xeros) sprites.push({ img: XEROS, x: xeros.x - 16, y: xeros.y - 45, depth: xeros.y });
  const x0 = Math.min(...sprites.map((s) => s.x)) - pad;
  const y0 = Math.min(...sprites.map((s) => s.y)) - pad;
  const x1 = Math.max(...sprites.map((s) => s.x + s.img.w)) + pad;
  const y1 = Math.max(...sprites.map((s) => s.y + s.img.h)) + pad;
  const img = blank(x1 - x0, y1 - y0, GROUND);
  for (const poly of roofShadows(pieces)) fillPoly(img, poly.map((p) => ({ x: p.x - x0, y: p.y - y0 })), SHADOW);
  sprites.sort((a, b) => a.depth - b.depth);
  const byId = new Map(sprites.filter((s) => s.id !== undefined).map((s) => [s.id!, s]));
  for (const s of sprites) {
    overImg(img, s.img, s.x - x0, s.y - y0);
    if (o.joint && o.joint !== 'none' && s.on !== undefined) jointShade(img, s, byId.get(s.on)!, x0, y0, o.joint);
  }
  return { img, x0, y0, report };
}

export function planScene(name: string, o: Opts, xeros?: { x: number; y: number }): Scene {
  const plan = loadPlan(o.mode === 'avant' ? `${name}-avant` : name);
  const all = ided(planPieces(plan, { x: 0, y: 0, z: 0 }).map((p) => (o.openShutters && 'prop' in p.piece && p.piece.prop === 'plank-shutter' ? swung(p) ?? p : p)));
  // sans toit : la couverture ôtée, et ce qui ne reposait que sur elle (la faîtière de la cabane sur ses pignons)
  const gone = new Set<number>();
  if (o.noRoof)
    for (const p of [...all].sort((a, b) => a.z - b.z)) {
      const sup = supportsM(all, p, o);
      if (roofish(p) || (sup.length && sup.every((q) => gone.has(q.id)))) gone.add(p.id);
    }
  const pieces = all.filter((p) => !gone.has(p.id) && !(o.cutAbove !== undefined && p.z >= o.cutAbove));
  const xs = xeros ?? { x: Math.round(plan.size.w / PX) + 14, y: Math.round(plan.size.d / PX) + 6 };
  return renderScene(pieces, o, xs);
}

/** Un recadrage d'une scène sur un rectangle en px du monde. */
export const cut = (s: Scene, r: { x: number; y: number; w: number; h: number }): Img => crop(s.img, r.x - s.x0, r.y - s.y0, r.w, r.h);
/** Le bord sud d'un plan (px du monde). */
export const southOf = (name: string) => Math.round(loadPlan(name).size.d / PX);
/** Un recadrage calé sur le bord sud : de `up` px au-dessus à `down` px au-dessous, de x à x + w. */
export const band = (name: string, x: number, w: number, up: number, down = 8) => ({ x, y: southOf(name) - up, w, h: up + down });

// ---------------------------------------------------------------------------------------------------------------------------------
// Les tas de bois : woodPlaces (world/woodPile.ts) au rapport voulu

function pileScene(w: PileWood, ratio: number, xeros = true): Img {
  const axis = 'ew' as const;
  const piece: WoodPiece = { ...w, axis };
  const look = lookOf(piece);
  const ew = woodBody(w.size, look, 'ew', w.length);
  const ROWS = new Set(['half', 'quarter', 'beam', 'plank', 'lath']);
  const rows = ROWS.has(look);
  const step = ew.h + 1;
  const lift = step * ratio * (rows ? 1 : Math.sqrt(3) / 2);
  const back = rows ? 0 : step / 2;
  type P = { layer: number; x: number; y: number };
  const place = (f: number, layer: number): P => ({ layer, x: 0, y: Math.round(-(2 - f) * step - layer * (lift - back)) });
  const places: P[] = [0, 1, 2].map((i) => place(i, 0));
  if (rows) for (let layer = 1; layer < 3; layer++) for (let i = 0; i < 3; i++) places.push(place(i, layer));
  else places.push(place(0.5, 1), place(1.5, 1), place(1, 2));
  const img = woodImg(piece);
  const sprites: Sprite[] = places.map((p, k) => ({ img, x: p.x, y: p.y - img.h, depth: p.layer * 1000 + k }));
  if (xeros) sprites.push({ img: XEROS, x: img.w + 6, y: -45, depth: 1e9 });
  return composeSprites(sprites);
}

function composeSprites(sprites: Sprite[], pad = 8): Img {
  const x0 = Math.min(...sprites.map((s) => s.x)) - pad;
  const y0 = Math.min(...sprites.map((s) => s.y)) - pad;
  const x1 = Math.max(...sprites.map((s) => s.x + s.img.w)) + pad;
  const y1 = Math.max(...sprites.map((s) => s.y + s.img.h)) + pad;
  const img = blank(x1 - x0, y1 - y0, GROUND);
  for (const s of [...sprites].sort((a, b) => a.depth - b.depth)) overImg(img, s.img, s.x - x0, s.y - y0);
  return img;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// La planche

const INK: RGBA = [250, 236, 200, 255];
const SOFT: RGBA = [210, 196, 160, 255];
const HOT: RGBA = [236, 160, 90, 255];
const BG: RGBA = [40, 31, 24, 255];

export function enlarge(src: Img, k: number): Img {
  const out = blank(src.w * k, src.h * k, [0, 0, 0, 0]);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const s = (Math.floor(y / k) * src.w + Math.floor(x / k)) * 4;
      out.data.set(src.data.subarray(s, s + 4), (y * out.w + x) * 4);
    }
  return out;
}
function frame(img: Img, x: number, y: number, w: number, h: number, c: RGBA): void {
  rect(img, x, y, w, 1, c);
  rect(img, x, y + h - 1, w, 1, c);
  rect(img, x, y, 1, h, c);
  rect(img, x + w - 1, y, 1, h, c);
}

/** Un panneau : une image agrandie `k` fois, son titre au-dessus (une ou deux lignes). */
interface Panel {
  img: Img;
  k: number;
  title: string[];
  hot?: boolean;
}

/** La planche avant / après (lancée seule : `npx tsx tools/essai-hauteurs.ts` ; importée par tools/essai-volet-cabane.ts, elle ne se fait pas). */
function main(): void {
const W = 2600;
const sheet = blank(W, 12000, BG);
let cy = 16;

function heading(s: string, sub: string[] = []): void {
  cy += 10;
  rect(sheet, 16, cy - 6, W - 32, 1, SOFT);
  text(sheet, s, 16, cy + 4, 3, INK);
  cy += 34;
  for (const l of sub) {
    text(sheet, l, 16, cy, 1, SOFT);
    cy += 12;
  }
  cy += 8;
}

/** Une rangée de panneaux, côte à côte. */
function row(panels: Panel[], gap = 28): void {
  let x = 16;
  const top = cy;
  let bottom = cy;
  for (const p of panels) {
    const big = enlarge(p.img, p.k);
    const tw = Math.max(...p.title.map((t) => textWidth(t, 1)));
    p.title.forEach((t, i) => text(sheet, t, x, top + i * 11, 1, p.hot ? HOT : INK));
    const iy = top + p.title.length * 11 + 4;
    blit(sheet, big, x, iy);
    frame(sheet, x - 1, iy - 1, big.w + 2, big.h + 2, SOFT);
    x += Math.max(big.w, tw) + gap;
    bottom = Math.max(bottom, iy + big.h);
  }
  if (x > W) console.warn(`essai-hauteurs : rangée trop large (${x} px)`);
  cy = bottom + 18;
}

const reports: string[] = [];
const keep = (s: Scene) => (reports.push(...s.report), s);

cy += 4;
text(sheet, 'HAUTEURS - LA PIECE DE BOIS COUCHEE A SA SECTION VRAIE (ESSAI HORS JEU)', 16, cy, 3, INK);
cy += 30;
text(sheet, 'AVANT - LES PLANS DU JEU, LA HAUTEUR DU BOIS COUCHE CONTOUR COMPRIS (BILLE DU NORMAL 40 CM, POUTRE 30). APRES - LES PLANS RECALES (TOOLS RECALE-HAUTEURS), LA SECTION VRAIE (30, 20),', 16, cy, 1, SOFT);
cy += 12;
text(sheet, 'LE DESSIN DES PIECES INCHANGE (IL GARDE SON CONTOUR) - DEUX PIECES POSEES L UNE SUR L AUTRE SE RECOUVRENT DE 2 PX. 1 PX DU JEU EGALE 5 CM. XEROS (1,60 M) A COTE POUR L ECHELLE.', 16, cy, 1, SOFT);
cy += 14;

// --- 1. La cabane ---
{
  heading('1. LA CABANE EN RONDINS', [
    'AVANT - 5 ASSISES DE 40 CM, PORTE DE 2 M, FENETRE D UNE ASSISE AVEC LE VOLET DE 40 CM (MUR EST, VU DE CHANT).',
    'APRES - 7 ASSISES DE 30 CM, LA MEME HAUTEUR DE MUR (2,52 M), LE MEME TOIT - PORTE DE 2,10 M (PROPOSEE, ART PROPOSALS CABANE-HAUTEURS) - FENETRE SUR DEUX ASSISES (60 X 60 CM).',
    'APRES A - LE VOLET ACTUEL (60 X 40) DANS L OUVERTURE DE 60 - UN JOUR DE 20 CM. APRES B - UN VOLET DE CABANE DE 60 X 60 (PROPOSE).',
  ]);
  const av = keep(planScene('cabane', { mode: 'avant' }));
  const apA = keep(planScene('cabane', { mode: 'apres' }));
  const apB = keep(planScene('cabane', { mode: 'apres', cabinShutter: true }));
  row([
    { img: av.img, k: 2, title: ['AVANT X2'] },
    { img: apA.img, k: 2, title: ['APRES A X2', 'VOLET DE 40, JOUR DE 20'], hot: true },
    { img: apB.img, k: 2, title: ['APRES B X2', 'VOLET DE CABANE 60 X 60'], hot: true },
  ]);
  // x4 : sans le toit (les murs, la porte, la fenetre du mur est, vue de chant en regle D)
  const nr = (o: Opts) => planScene('cabane', { ...o, noRoof: true }).img;
  row([
    { img: nr({ mode: 'avant' }), k: 4, title: ['AVANT X4 SANS TOIT', 'PORTE 2 M, VOLET 40 SUR UNE ASSISE'] },
    { img: nr({ mode: 'apres' }), k: 4, title: ['APRES A X4 SANS TOIT', 'PORTE 2,10 M, VOLET 40, JOUR DE 20'], hot: true },
    { img: nr({ mode: 'apres', cabinShutter: true }), k: 4, title: ['APRES B X4 SANS TOIT', 'PORTE 2,10 M, VOLET 60'], hot: true },
  ]);
  // la fenetre : coupe au-dessus de l'assise de la fenetre (le mur est en regle D, chaque assise ne monte que de 2 px a l'ecran : la
  // fenetre ne se voit pas du dehors, les assises du dessus la couvrent)
  const win = (o: Opts) => cut(planScene('cabane', { ...o, noRoof: true }), band('cabane', 54, 26, 100, 2));
  row([
    { img: win({ mode: 'avant', cutAbove: 152 }), k: 6, title: ['AVANT X6', 'COUPE A 1,52 M', 'MUR EST, VOLET 40'] },
    { img: win({ mode: 'apres', cutAbove: 177 }), k: 6, title: ['APRES A X6', 'COUPE A 1,77 M', 'VOLET 40, JOUR 20'], hot: true },
    { img: win({ mode: 'apres', cutAbove: 177, cabinShutter: true }), k: 6, title: ['APRES B X6', 'COUPE A 1,77 M', 'VOLET 60'], hot: true },
    { img: win({ mode: 'avant' }), k: 6, title: ['AVANT X6', 'MUR EST ENTIER'] },
    { img: win({ mode: 'apres', cabinShutter: true }), k: 6, title: ['APRES B X6', 'MUR EST ENTIER'], hot: true },
  ], 20);
  // les dessins proposes, seuls, x4 (neufs) a cote de l'actuel
  const now = (k: string) => png(k)!;
  row([
    { img: now('plank-door'), k: 4, title: ['PORTE ACTUELLE', '2 M - 20 X 42'] },
    { img: propoImg('plank-door'), k: 4, title: ['PORTE PROPOSEE', '2,10 M - 20 X 44'], hot: true },
    { img: propoImg('plank-door-r2'), k: 4, title: ['DEDANS'], hot: true },
    { img: propoImg('plank-door-r1'), k: 4, title: ['CHANT'], hot: true },
    { img: now('plank-shutter'), k: 4, title: ['VOLET ACTUEL', '60 X 40 - 13 X 8'] },
    { img: now('plank-shutter-r3'), k: 4, title: ['CHANT'] },
    { img: propoImg('cabin-shutter'), k: 4, title: ['VOLET DE CABANE', '60 X 60 - 13 X 12'], hot: true },
    { img: propoImg('cabin-shutter-r2'), k: 4, title: ['DEDANS'], hot: true },
    { img: propoImg('cabin-shutter-r3'), k: 4, title: ['CHANT'], hot: true },
    { img: XEROS, k: 4, title: ['XEROS'] },
  ], 20);
}

// --- 2. La maison de Xeros ---
{
  heading('2. LES POUTRES DE LA MAISON DE XEROS', [
    'AVANT - SOLIN DE 40 CM (FACE 8 PX), POUTRES COMPTEES 30 CM. APRES - SOLIN DE 50 CM (FACE 10 PX, DESSINE PAR LE MUR DU JEU REGLE A 50, ART PROPOSALS WALLS-SOLIN-50), POUTRES DE 20 CM.',
    'TRAVERSE BASSE DE 50 A 70 CM (AU LIEU DE 40 A 70), TOUT CE QUI EST AU-DESSUS GARDE SA HAUTEUR, LE TOIT DESCEND DE 10 CM.',
  ]);
  const av = keep(planScene('maison-xeros', { mode: 'avant' }));
  const ap = keep(planScene('maison-xeros', { mode: 'apres' }));
  row([
    { img: av.img, k: 2, title: ['AVANT X2'] },
    { img: ap.img, k: 2, title: ['APRES X2'], hot: true },
  ]);
  const avN = planScene('maison-xeros', { mode: 'avant', noRoof: true });
  const apN = planScene('maison-xeros', { mode: 'apres', noRoof: true });
  const r = band('maison-xeros', -12, 130, 125);
  const r2 = band('maison-xeros', 150, 130, 125);
  row([
    { img: cut(av, r), k: 4, title: ['AVANT X4', 'ANGLE SUD-OUEST'] },
    { img: cut(ap, r), k: 4, title: ['APRES X4', 'ANGLE SUD-OUEST'], hot: true },
    { img: cut(avN, r), k: 4, title: ['AVANT X4 SANS TOIT', 'SOLIN, TRAVERSE, POTEAUX, SABLIERE, ENTRAITS'] },
    { img: cut(apN, r), k: 4, title: ['APRES X4 SANS TOIT', 'SOLIN 50, POUTRES 20'], hot: true },
  ]);
  row([
    { img: cut(avN, r2), k: 4, title: ['AVANT X4 SANS TOIT', 'DEUX TRAVEES DU MUR SUD (FENETRE, PORTE)'] },
    { img: cut(apN, r2), k: 4, title: ['APRES X4 SANS TOIT', 'DEUX TRAVEES DU MUR SUD'], hot: true },
  ]);
}

// --- 3. Les tas ---
{
  heading('3. LES TAS DE BOIS', [
    'MONTEE D UNE COUCHE EGALE PAS X (HAUTEUR SUR LARGEUR DE LA SECTION). BILLES - 65 SUR 65 AVANT, 55 SUR 55 APRES - RAPPORT 1, LE TAS NE BOUGE PAS.',
    'DEMI-BILLES (LA DEMI-BILLE DU GROS, 55 CM - LE NORMAL N A PAS DE DEMI) - 38 SUR 65 AVANT (0,58), 28 SUR 55 APRES (0,51) - LES COUCHES SE SERRENT.',
  ]);
  const bille: PileWood = { size: 'big', shape: 'round', length: 100 };
  const demi: PileWood = { size: 'big', shape: 'half', length: 100 };
  const ratio = (w: PileWood, m: Mode) => {
    const d = woodDims({ ...w, axis: 'ew' } as WoodPiece);
    return m === 'avant' ? d.h / d.d : (d.h - CONTOUR_CM) / (d.d - CONTOUR_CM);
  };
  console.log(`rapports : bille ${ratio(bille, 'avant').toFixed(3)} -> ${ratio(bille, 'apres').toFixed(3)}, demi-bille ${ratio(demi, 'avant').toFixed(3)} -> ${ratio(demi, 'apres').toFixed(3)}`);
  const piles = (k: number) => [
    { img: pileScene(bille, ratio(bille, 'avant')), k, title: [`BILLES AVANT X${k}`] },
    { img: pileScene(bille, ratio(bille, 'apres')), k, title: [`BILLES APRES X${k}`], hot: true },
    { img: pileScene(demi, ratio(demi, 'avant')), k, title: [`DEMI-BILLES AVANT X${k}`, 'RAPPORT 0,58'] },
    { img: pileScene(demi, ratio(demi, 'apres')), k, title: [`DEMI-BILLES APRES X${k}`, 'RAPPORT 0,51'], hot: true },
  ];
  row([...piles(2), ...piles(4)]);
}

// --- 4. La forge ---
{
  heading('4. LA FORGE', ['APRES - LE TOIT, LES PIGNONS ET LES POINCONS DESCENDENT DE 10 CM (9 PIECES), SUR LES ENTRAITS ET LES SABLIERES DE 20 CM.']);
  const av = keep(planScene('forge', { mode: 'avant' }));
  const ap = keep(planScene('forge', { mode: 'apres' }));
  row([
    { img: av.img, k: 2, title: ['AVANT X2'] },
    { img: ap.img, k: 2, title: ['APRES X2'], hot: true },
  ]);
  const r = band('forge', -12, 150, 135, 4);
  const avN = planScene('forge', { mode: 'avant', noRoof: true });
  const apN = planScene('forge', { mode: 'apres', noRoof: true });
  row([
    { img: cut(av, r), k: 4, title: ['AVANT X4', 'LE COIN SUD-OUEST, L EGOUT DU TOIT'] },
    { img: cut(ap, r), k: 4, title: ['APRES X4', 'LE TOIT 10 CM PLUS BAS'], hot: true },
    { img: cut(avN, r), k: 4, title: ['AVANT X4 SANS TOIT', 'POTEAUX, SABLIERES, ENTRAITS'] },
    { img: cut(apN, r), k: 4, title: ['APRES X4 SANS TOIT'], hot: true },
  ]);
}

// --- 5. Le recouvrement ---
{
  heading('5. LE RECOUVREMENT DE 2 PX - TROIS FACONS DE LE LIRE', [
    'A - BRUT - LE RONDIN DU DESSUS COUVRE LE HAUT DE CELUI DU DESSOUS - IL NE RESTE ENTRE EUX QUE SON CONTOUR DU BAS (1 PX).',
    'B - OMBRE DE JOINT DOUCE - UNE RANGEE ASSOMBRIE (LA TEINTE D OMBRE X, TRANSLUCIDE) SUR LE RONDIN DU DESSOUS, SOUS CELUI DU DESSUS.',
    'C - OMBRE DE JOINT FRANCHE - LA MEME RANGEE AU CONTOUR (OUTLINE), OPAQUE - LE TRAIT DE 2 PX D AVANT, RETROUVE.',
    'L OMBRE B OU C SERAIT CALCULEE PAR LE JEU (A L AFFICHAGE, SOUS TOUTE PIECE COUCHEE POSEE SUR UNE AUTRE), JAMAIS PEINTE DANS LE DESSIN.',
  ]);
  const scenes = (['none', 'soft', 'hard'] as const).map((j) => keep(planScene('cabane', { mode: 'apres', cabinShutter: true, joint: j, noRoof: true })));
  const av = planScene('cabane', { mode: 'avant', noRoof: true });
  const r = band('cabane', -4, 44, 66, 4);
  row([
    { img: cut(av, r), k: 4, title: ['AVANT X4', 'CONTOURS QUI SE TOUCHENT'] },
    { img: cut(scenes[0], r), k: 4, title: ['A - BRUT X4'], hot: true },
    { img: cut(scenes[1], r), k: 4, title: ['B - OMBRE DOUCE X4'], hot: true },
    { img: cut(scenes[2], r), k: 4, title: ['C - OMBRE FRANCHE X4'], hot: true },
    { img: cut(av, r), k: 6, title: ['AVANT X6'] },
    { img: cut(scenes[0], r), k: 6, title: ['A X6'], hot: true },
    { img: cut(scenes[1], r), k: 6, title: ['B X6'], hot: true },
  ], 20);
  const ms = (['none', 'soft'] as const).map((j) => planScene('maison-xeros', { mode: 'apres', joint: j, noRoof: true }));
  const avm = planScene('maison-xeros', { mode: 'avant', noRoof: true });
  const r2 = band('maison-xeros', -12, 130, 125);
  row([
    { img: cut(avm, r2), k: 4, title: ['POUTRES AVANT X4'] },
    { img: cut(ms[0], r2), k: 4, title: ['POUTRES A - BRUT X4'], hot: true },
    { img: cut(ms[1], r2), k: 4, title: ['POUTRES B - OMBRE DOUCE X4'], hot: true },
  ]);
}

const out = crop(sheet, 0, 0, W, cy + 10);
mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/hauteurs-avant-apres.png', toPng(out));
console.log([...new Set(reports)].join('\n') || 'aucune pièce sans appui');
console.log(`.art-preview/hauteurs-avant-apres.png : ${W} x ${cy + 10}`);
}

if (/essai-hauteurs\.ts$/.test(process.argv[1] ?? '')) main();
