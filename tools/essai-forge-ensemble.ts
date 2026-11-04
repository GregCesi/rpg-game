// Essai hors jeu (chantier « forge », CADRAGE-forge.md, section 1 et plan annoté de la section 2) : la vue d'ensemble de l'emplacement
// de la forge, .art-preview/forge-ensemble.png. Lancé par `npx tsx tools/essai-forge-ensemble.ts`. Rien ici n'entre dans le jeu.
//
// 1. Une bande réduite 4 fois (1 px de la planche = 4 px du monde = 20 cm) du monde de x 330 à 790 m et y 240 à 340 m : la maison de
//    Xéros, le chemin, la rue, la place et ses étals, les parcelles des abords en contour, la forge à l'emplacement A, l'emplacement B
//    en pointillé, les distances, le nord, une échelle de 50 m, les noms.
// 2. L'entrée du village à la taille du jeu (1 px = 5 cm), agrandie 2 fois : de la fin du chemin à la deuxième parcelle des abords,
//    avec les vraies tuiles et les vrais objets des cartes, et la forge A posée sur sa parcelle selon le plan annoté.
//
// Méthode reprise de tools/world-preview.ts (tools/lib/world-render.ts : le sol tuile par tuile, les objets à leur place) ; les
// bâtiments sont montés comme le jeu monte les pièces posées (world/buildView.ts, GameMap.sortBuilds) : chaque pièce d'un plan prend
// son image, sa place (le bas au bord sud de son emprise relevé de sa hauteur), sa profondeur (depthsOf) et le décalage de ce qui la
// porte ; les murs de pierre se montent par world/walls.ts, la pièce de bois par les opérations de world/woodShape.ts, comme
// world/woodTexture.ts. Les bâtiments de la forge sont des plans du jeu repris :
// - l'atelier : le plan de la grange (src/content/plans/grange.json), mur sud ôté (bardage et porte charretière), bois vieux ;
// - le logis : la maison de Xéros (src/content/plans/maison-xeros.json) raccourcie de trois travées (8 m au lieu de 12,80 m) : la
//   salle garde l'âtre, la travée de la porte est reprise sur la salle ; le chaume, le faîtage et le pan nord sont rognés d'autant ;
// - l'abri à charbon : l'abri à bois du jeu (plans.json), ses dés, ses poteaux et son toit de planches ;
// - le puits du jeu dans la cour. Ce sont des silhouettes de toits : le dessin propre de la forge est l'affaire d'une autre planche.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PNG } from 'pngjs';
import { TILE } from '../src/config';
import { props } from '../src/content';
import { CM_PER_PX } from '../src/content/gabarit';
import type { BuildPlaced, MapData, PropDef, WoodPiece } from '../src/content/types';
import { variantImage } from '../src/content/views';
import { maps } from '../src/generated/maps';
import { wallPalette, wallStones } from '../src/generated/wallStones';
import { boxOf, depthsOf, overlaps, planPieces, supportsOf, type BuildPiece } from '../src/world/build';
import { formView } from '../src/world/natural';
import { roofShadow } from '../src/world/roofShadow';
import { runLayout, runPx, wallOf, wallRuns } from '../src/world/wallRuns';
import { wallKit, type WallKit } from '../src/world/walls';
import { agedKey, composeOps, lookDef, lookOf, sheetOf, upOf, woodSize } from '../src/world/woodShape';
import { buildPlans } from './lib/build-plans';
import { blank, blit, drawMap, put, rect, RenderKit, text, textWidth, toPng, type Img, type RGBA } from './lib/world-render';

const PX = CM_PER_PX; // 5 cm par pixel
const M = 100 / PX; // pixels du monde par mètre (20)

// ---------------------------------------------------------------------------------------------------------------------------------
// Images

const pngCache = new Map<string, Img | null>();
function readImg(path: string): Img {
  const p = PNG.sync.read(readFileSync(path));
  return { w: p.width, h: p.height, data: new Uint8Array(p.data) };
}
/** L'image du jeu `src/generated/<clé>.png`, ou rien. */
function png(key: string): Img | undefined {
  if (!pngCache.has(key)) pngCache.set(key, existsSync(`src/generated/${key}.png`) ? readImg(`src/generated/${key}.png`) : null);
  return pngCache.get(key) ?? undefined;
}
const has = (key: string) => existsSync(`src/generated/${key}.png`);

/** Les planches du jeu (src/generated/assets.ts) : taille d'une image et animations, lues dans le texte (le module importe des PNG). */
const SHEETS = new Map<string, { fw: number; fh: number; anims: Record<string, { frames: number[] }> }>();
for (const line of readFileSync('src/generated/assets.ts', 'utf8').split('\n')) {
  const m = /\{ key: '([^']+)', url: \w+, frameWidth: (\d+), frameHeight: (\d+), animations: (\{.*\}), silhouette/.exec(line);
  if (m) SHEETS.set(m[1], { fw: Number(m[2]), fh: Number(m[3]), anims: JSON.parse(m[4]) });
}

function crop(src: Img, x: number, y: number, w: number, h: number): Img {
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

/** L'image `n` d'une planche du jeu. */
function frameOf(sheet: string, n: number): Img {
  const s = SHEETS.get(sheet);
  const img = png(sheet);
  if (!s || !img) throw new Error(`essai-forge-ensemble : pas de planche « ${sheet} »`);
  const cols = Math.floor(img.w / s.fw);
  return crop(img, (n % cols) * s.fw, Math.floor(n / cols) * s.fh, s.fw, s.fh);
}

/** Pose un pixel sur une image qui a de la transparence (composition « par-dessus »). */
function over(dst: Img, x: number, y: number, c: ArrayLike<number>): void {
  if (x < 0 || y < 0 || x >= dst.w || y >= dst.h || !c[3]) return;
  const i = (y * dst.w + x) * 4;
  const sa = c[3] / 255;
  const da = dst.data[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  for (let k = 0; k < 3; k++) dst.data[i + k] = Math.round((c[k] * sa + dst.data[i + k] * da * (1 - sa)) / oa);
  dst.data[i + 3] = Math.round(oa * 255);
}
function overImg(dst: Img, src: Img, x: number, y: number): void {
  for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) over(dst, x + i, y + j, src.data.subarray((j * src.w + i) * 4, (j * src.w + i) * 4 + 4));
}

/** Réduite d'un facteur entier, comme tools/lib/world-render.ts : la moyenne d'un bloc, vide s'il est à moitié vide. */
function shrink(src: Img, f: number, phaseX = 0, phaseY = 0): Img {
  if (f === 1) return src;
  // le bloc suit la grille du monde : `phase` est la position de l'image modulo f
  const w = Math.ceil((src.w + phaseX) / f);
  const h = Math.ceil((src.h + phaseY) / f);
  const out = blank(w, h, [0, 0, 0, 0]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, n = 0, all = 0;
      for (let j = 0; j < f; j++)
        for (let i = 0; i < f; i++) {
          const px = x * f + i - phaseX;
          const py = y * f + j - phaseY;
          all++;
          if (px < 0 || py < 0 || px >= src.w || py >= src.h) continue;
          const k = (py * src.w + px) * 4;
          if (src.data[k + 3] < 128) continue;
          r += src.data[k];
          g += src.data[k + 1];
          b += src.data[k + 2];
          n++;
        }
      if (n && n * 2 >= all) out.data.set([r / n, g / n, b / n, 255], (y * w + x) * 4);
    }
  return out;
}

const hex = (h: string): RGBA => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), h.length === 9 ? parseInt(h.slice(7, 9), 16) : 255];

// ---------------------------------------------------------------------------------------------------------------------------------
// Les pièces posées, comme le jeu les montre

/** Une image posée dans le monde : coin haut gauche en px du monde, et sa profondeur (le bas qui trie l'affichage). */
interface Sprite {
  img: Img;
  x: number;
  y: number;
  depth: number;
}

/** Une pièce de plan, avec ce que l'essai lui fait : des tranches de son image déplacées (le chaume rogné du logis). */
type Piece = BuildPiece & { slices?: { from: number; to: number; dx: number }[] };

/** L'image d'une pièce de bois, assemblée par les opérations de woodShape.ts comme world/woodTexture.ts (image de roulement 0). */
function woodImg(piece: WoodPiece): Img {
  const { w, h } = woodSize(piece.size, lookOf(piece), piece.axis, piece.length);
  const out = blank(w, h, [0, 0, 0, 0]);
  const src = sheetOf(piece);
  const sheet = SHEETS.get(src);
  if (!sheet) throw new Error(`essai-forge-ensemble : pas de planche de bois « ${src} »`);
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

let kitW: WallKit | undefined;
const theWallKit = () =>
  (kitW ??= wallKit((name) => {
    const g = wallStones[name];
    if (!g) throw new Error(`essai-forge-ensemble : pierre « ${name} » absente`);
    return g;
  }));

/** Une grille de caractères des murs en image. */
function gridImg(grid: string[]): Img {
  const out = blank(grid[0].length, grid.length, [0, 0, 0, 0]);
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') out.data.set(hex(wallPalette[row[x]]), (y * out.w + x) * 4);
  });
  return out;
}

/**
 * L'image d'une pièce qui n'est ni du bois ni un mur, et le décalage de son bord ouest (px) par rapport à l'endroit où le jeu la pose
 * (buildLook) : une pièce en tranches (le chaume rogné du logis) a ses tranches rapprochées.
 */
function propImg(p: Piece): { img: Img; dx: number; w0: number } | undefined {
  if (!('prop' in p.piece)) return undefined;
  const def = props[p.piece.prop];
  let key = formView(variantImage(def.image, p.variant), def.views, p.view, p.natural, has);
  if (def.aged) key = agedKey(key, p.age);
  const img = SHEETS.has(key) ? frameOf(key, 0) : png(key);
  if (!img) return undefined;
  if (!p.slices) return { img, dx: 0, w0: img.w };
  // tranches de l'image (colonnes, en cm depuis le bord ouest de l'emprise) déplacées de dx
  const b = boxOf(p);
  const left = Math.round((b.x + b.w / 2) / PX - img.w / 2) - Math.round(b.x / PX);
  const cols = p.slices
    .map((s) => {
      const c0 = Math.max(0, Math.round(s.from / PX) - left);
      const c1 = Math.min(img.w, Math.round(s.to / PX) - left);
      return { c0, c1, to: c0 + Math.round(s.dx / PX) };
    })
    .filter((c) => c.c1 > c.c0);
  const min = Math.min(...cols.map((c) => c.to));
  const max = Math.max(...cols.map((c) => c.to + c.c1 - c.c0));
  const out = blank(max - min, img.h, [0, 0, 0, 0]);
  for (const c of cols) overImg(out, crop(img, c.c0, 0, c.c1 - c.c0, img.h), c.to - min, 0);
  return { img: out, dx: min, w0: img.w };
}

/**
 * Les images des pièces d'un ou plusieurs plans posés (cm du monde), triées comme le jeu les trie : les murs par tronçon, chaque
 * morceau sa part ; le bois assemblé ; le reste par son image ; puis le décalage de ce qui porte une pièce (GameMap.offsetOf).
 */
function pieceSprites(pieces: Piece[]): Sprite[] {
  const depths = depthsOf(pieces);
  const look = new Map<number, { img: Img; x: number; y: number }>(); // y : le bas de l'image
  for (const run of wallRuns(pieces)) {
    const img = gridImg(theWallKit().run({ kind: run.kind, axis: run.axis, length: runPx(run), start: run.start, end: run.end, seed: run.seed, top: Math.round(run.thick / 10), ...(run.extra ? { extra: run.extra } : {}) }));
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
    let shift = 0;
    let w0 = 0;
    if ('wood' in p.piece) {
      img = woodImg(p.piece.wood);
      if (p.piece.wood.axis === 'up') lift = upOf(p.piece.wood.size, lookOf(p.piece.wood)).lift;
    } else {
      const r = propImg(p);
      img = r?.img;
      shift = r?.dx ?? 0;
      w0 = r?.w0 ?? 0;
    }
    if (!img) {
      console.warn(`essai-forge-ensemble : pas d'image pour ${JSON.stringify(p.piece)}`);
      continue;
    }
    look.set(p.id, { img, x: Math.round((b.x + b.w / 2) / PX - (w0 || img.w) / 2) + shift, y: Math.round((b.y + b.d - b.z) / PX) + lift });
  }
  // le décalage de ce qui porte (GameMap.offsetOf) : une pièce posée sur une pièce nord-sud dessinée en règle D descend avec elle
  const reglD = (p: Piece) => ('wood' in p.piece ? p.piece.wood.axis === 'ns' : 'prop' in p.piece && !!props[p.piece.prop].lying && p.view % 2 === 1);
  const shown = new Map<number, { dx: number; down: number }>();
  for (const p of [...pieces].sort((a, c) => a.z - c.z)) {
    const supports = supportsOf(pieces, p) as Piece[];
    let o = { dx: 0, down: 0 };
    if (supports.length) {
      const pb = boxOf(p);
      const area = (q: Piece) => {
        const b = boxOf(q);
        return Math.max(0, Math.min(b.x + b.w, pb.x + pb.w) - Math.max(b.x, pb.x)) * Math.max(0, Math.min(b.y + b.d, pb.y + pb.d) - Math.max(b.y, pb.y));
      };
      const s = supports.filter((q) => overlaps(boxOf(q), pb)).sort((a, b) => area(b) - area(a) || Number(reglD(a)) - Number(reglD(b)))[0] ?? supports[0];
      const base = shown.get(s.id) ?? { dx: 0, down: 0 };
      o = { ...base };
      const l = look.get(s.id);
      if (l && reglD(s)) {
        const sb = boxOf(s);
        const drawn = 'wood' in s.piece ? lookDef(s.piece.wood.size, lookOf(s.piece.wood)).ns.extra : wallOf(s) ? 1 : Math.max(0, l.img.h - Math.round(sb.d / PX));
        o.down += Math.round(sb.h / PX) - drawn;
      }
    }
    shown.set(p.id, o);
  }
  const out: Sprite[] = [];
  for (const p of pieces) {
    const l = look.get(p.id);
    if (!l) continue;
    const o = shown.get(p.id)!;
    const floor = p.z === 0 && 'prop' in p.piece && props[p.piece.prop].layer === 'floor';
    out.push({ img: l.img, x: l.x + o.dx, y: l.y - l.img.h + o.down, depth: floor ? -1e9 : depths.get(p.id)! });
  }
  return out;
}

/** Les ombres portées des couvertures (`shadow` de props.json, world/roofShadow.ts), en px du monde. */
function roofShadows(pieces: Piece[]): { x: number; y: number }[][] {
  const out: { x: number; y: number }[][] = [];
  for (const p of pieces) {
    if (!('prop' in p.piece)) continue;
    const def = props[p.piece.prop];
    if (!def.shadow) continue;
    const b = boxOf(p);
    // le chaume rogné : son ombre aussi
    const cut = p.slices ? p.slices.reduce((s, x) => s + x.to - x.from, 0) : b.w;
    const d: PropDef = { ...def, dims: { ...def.dims, w: p.view % 2 ? def.dims.d : cut, d: p.view % 2 ? def.dims.w : def.dims.d } };
    out.push(roofShadow(d, Math.round(b.x / PX), Math.round((b.y + b.d) / PX)));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// La forge, version A, sur la parcelle nord-ouest des abords (CADRAGE-forge.md, section 2 ; cm depuis le coin nord-ouest de la parcelle)

const village = maps['village'];
const zoneCm = (m: MapData) => ({ x: m.world!.x * PX, y: m.world!.y * PX });
const PARCEL_A = village.parcels.find((p) => p.x === 1024 && p.y === 1536);
if (!PARCEL_A) throw new Error("essai-forge-ensemble : la parcelle nord-ouest des abords (village.tmj x 1024, y 1536) n'est plus là");
const PA = { x: zoneCm(village).x + PARCEL_A.x * PX, y: zoneCm(village).y + PARCEL_A.y * PX }; // coin nord-ouest, cm du monde

const plans = buildPlans();
let nextId = 1;
const ided = (ps: BuildPlaced[]): Piece[] => ps.map((p) => ({ ...p, id: nextId++ }));

/** L'atelier : la grange, son mur sud ôté (ouvert sur la rue), en bois vieux. Place sur la parcelle : x 300–1260, y 1500–2180. */
function atelier(): Piece[] {
  const g = { ...plans['grange'], age: 'old' as const };
  const open = g.pieces.filter((p) => !('prop' in p.piece && ((p.piece.prop === 'board-wall' && p.y >= 600) || p.piece.prop === 'cart-door')));
  return ided(planPieces({ ...g, pieces: open }, { x: PA.x + 300, y: PA.y + 1500, z: 0 }));
}

/**
 * Le logis : la maison de Xéros raccourcie de trois travées. Ses poteaux sont en x 20, 180, … 1300 (cm du plan, huit travées de
 * 1,60 m) ; on ôte la bande [180, 660) (le bout est de la petite pièce, la cloison et la moitié ouest de la salle), et le mur sud
 * perd aussi [660, 820) pour reprendre à sa place la travée de la porte [500, 660), déplacée en [180, 340). Le logis garde : la
 * salle (x 20–500 après coup, l'âtre contre le mur nord), la cloison, la chambre (x 500–820). Les pièces longues (solin, sablières,
 * chaume, faîtage) sont coupées en morceaux.
 */
function logis(): Piece[] {
  const house = plans['maison-xeros'];
  const cut: BuildPlaced[] = [];
  const keepOf = (south: boolean): { from: number; to: number; dx: number }[] =>
    south
      ? [
          { from: -1e6, to: 180, dx: 0 },
          { from: 500, to: 660, dx: -320 },
          { from: 820, to: 1e6, dx: -480 },
        ]
      : [
          { from: -1e6, to: 180, dx: 0 },
          { from: 660, to: 1e6, dx: -480 },
        ];
  for (const p of house.pieces) {
    const b = boxOf(p);
    const south = b.y >= 600;
    const keep = keepOf(south);
    const long = b.w > 60 && !(p.view % 2 === 1 && 'prop' in p.piece);
    if (!long) {
      const k = keep.find((s) => b.x >= s.from && b.x < s.to);
      if (k) cut.push({ ...p, x: p.x + k.dx });
      continue;
    }
    const parts = keep.map((s) => ({ ...s, a: Math.max(b.x, s.from), z: Math.min(b.x + b.w, s.to) })).filter((s) => s.z > s.a);
    if ('wood' in p.piece || ('prop' in p.piece && props[p.piece.prop].wall)) {
      // une pièce de toute longueur : un morceau par part gardée
      for (const s of parts) {
        const len = s.z - s.a;
        if ('wood' in p.piece) cut.push({ ...p, x: s.a + s.dx, piece: { wood: { ...p.piece.wood, length: len } } });
        else cut.push({ ...p, x: s.a + s.dx, piece: { ...p.piece, length: len } });
      }
      continue;
    }
    // une image d'un seul tenant tout entière dans une part gardée : déplacée
    if (parts.length === 1 && parts[0].a === b.x && parts[0].z === b.x + b.w) {
      cut.push({ ...p, x: p.x + parts[0].dx });
      continue;
    }
    if (!parts.length) continue;
    // une image d'un seul tenant (le chaume, le faîtage) : ses tranches, rapprochées
    cut.push({ ...p, slices: parts.map((s) => ({ from: s.a - b.x, to: s.z - b.x, dx: s.dx })) } as BuildPlaced);
  }
  // axes du logis : x 300–1100, y 250–890 de la parcelle ; ceux de la maison commencent en x 20, y 45
  return ided(planPieces({ ...house, pieces: cut }, { x: PA.x + 280, y: PA.y + 205, z: 0 })).map((p, i) => {
    const s = (cut[i] as Piece).slices;
    return s ? { ...p, slices: s } : p;
  });
}

/** L'abri à charbon et à bois : l'abri à bois du jeu (plans.json, 3,05 × 3,55 m), en x 1400–1705, y 1600–1955 de la parcelle. */
function abri(): Piece[] {
  const o = { x: PA.x + 1400, y: PA.y + 1600 };
  const post = (length: number): BuildPlaced['piece'] => ({ wood: { size: 'normal', length, shape: 'round', hewn: 12, axis: 'up', age: 'worn' } });
  const ps: BuildPlaced[] = [];
  for (const [x, y, len] of [[-20, -20, 300], [285, -20, 300], [-20, 335, 180], [285, 335, 180]] as const) {
    ps.push({ piece: { prop: 'footing-stone' }, x: o.x + x, y: o.y + y, z: 0, view: 0 });
    ps.push({ piece: post(len), x: o.x + x + 3, y: o.y + y, z: 12, view: 0 });
  }
  ps.push({ piece: { prop: 'shed-roof' }, x: o.x - 30, y: o.y + 400 - 445, z: 0, view: 0, age: 'worn' });
  return ided(ps);
}

/** Le puits, dans la cour, à 6 m de l'auge. */
function puits(): Piece[] {
  return ided([{ piece: { prop: 'well' }, x: PA.x + 960, y: PA.y + 1150, z: 0, view: 0 }]);
}

const FORGE = [...atelier(), ...logis(), ...abri(), ...puits()];

/** Les rectangles de terre battue de la forge (cm de la parcelle) : la cour, le sol de l'atelier, la cour de devant ; l'abri. */
const YARD_CM = [
  { x: 300, y: 920, w: 960, h: 1480 },
  { x: 1380, y: 1580, w: 345, h: 395 },
];

// ---------------------------------------------------------------------------------------------------------------------------------
// Rendu d'une région du monde

const ZONES = ['ferme', 'chemin', 'village'].map((id) => maps[id]).filter((m) => m?.world);
const imageOfObj = (t: string, age?: string) => {
  const def = props[t];
  return def ? def.image + (age && age !== 'new' && def.aged ? `-${age}` : '') : undefined;
};

/** Le carreau de terre battue du jeu : celui du milieu de la rue (village, rangée 66, colonne 40). */
const YARD_TILE = village.layers.ground[66 * village.width + 40];

/** Les pièces des plans posés dans les cartes (la maison de Xéros, les étals), en cm du monde. */
function mapPlanPieces(m: MapData): Piece[] {
  const z = zoneCm(m);
  return m.plans.flatMap((p) => (plans[p.plan] ? ided(planPieces(plans[p.plan], { x: z.x + p.x * PX, y: z.y + p.y * PX, z: 0 })) : []));
}
const PLACED = ZONES.flatMap(mapPlanPieces);

/** Un polygone plein (px de `img`), mêlé par l'alpha. */
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
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) put(img, x, y, c);
  }
}

/**
 * La région (px du monde : x, y, largeur, hauteur, tous multiples de `f`) réduite `f` fois : le sol des zones, la terre battue de
 * la forge, les ombres des toits, puis les objets des cartes et les pièces des bâtiments triés par leur bas.
 */
function renderRegion(rx: number, ry: number, rw: number, rh: number, f: number): Img {
  const img = blank(rw / f, rh / f, [24, 18, 12, 255]);
  const kit = new RenderKit(f);
  for (const m of ZONES) {
    if (m.world!.x + m.width * TILE < rx || m.world!.x > rx + rw) continue;
    drawMap(img, kit, { ...m, objects: [], plans: [] }, (m.world!.x - rx) / f, (m.world!.y - ry) / f, () => undefined);
  }
  // la terre battue de la forge : le carreau de la rue, posé à la grille du monde
  const tile = kit.tile(YARD_TILE);
  const ts = TILE / f;
  for (const r of YARD_CM) {
    const x0 = Math.round((PA.x + r.x) / PX / f) - rx / f;
    const y0 = Math.round((PA.y + r.y) / PX / f) - ry / f;
    const w = Math.round(r.w / PX / f);
    const h = Math.round(r.h / PX / f);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const wx = ((x0 + i + rx / f) % ts + ts) % ts;
        const wy = ((y0 + j + ry / f) % ts + ts) % ts;
        const k = (wy * tile.w + wx) * 4;
        put(img, x0 + i, y0 + j, [tile.data[k], tile.data[k + 1], tile.data[k + 2], 255]);
      }
  }
  // la pénombre sous les toits ouverts (l'atelier, l'abri), que le jeu pose sur la terre battue d'un bâtiment (world/buildingFloor.ts)
  for (const r of [{ x: 300, y: 1500, w: 960, h: 680 }, { x: 1400, y: 1600, w: 305, h: 355 }])
    rect(img, Math.round((PA.x + r.x) / PX / f) - rx / f, Math.round((PA.y + r.y) / PX / f) - ry / f, Math.round(r.w / PX / f), Math.round(r.h / PX / f), [26, 14, 6, 90]);
  // les ombres portées des toits (couleur `x` de la palette, SHADOW de config.ts)
  for (const poly of roofShadows([...PLACED, ...FORGE])) fillPoly(img, poly.map((p) => ({ x: (p.x - rx) / f, y: (p.y - ry) / f })), [43, 26, 16, 64]);
  // les objets et les bâtiments, du nord au sud
  const sprites: Sprite[] = [];
  for (const m of ZONES) {
    for (const o of m.objects) {
      const key = imageOfObj(o.type, o.age);
      const im = key ? png(key) : undefined;
      if (!im) continue;
      const x = m.world!.x + o.x;
      const y = m.world!.y + o.y;
      if (x + im.w < rx || x > rx + rw || y < ry || y - im.h > ry + rh) continue;
      sprites.push({ img: im, x, y: y - im.h, depth: y });
    }
  }
  for (const s of pieceSprites([...PLACED, ...FORGE])) if (!(s.x + s.img.w < rx || s.x > rx + rw || s.y + s.img.h < ry || s.y > ry + rh)) sprites.push(s);
  sprites.sort((a, b) => a.depth - b.depth);
  for (const s of sprites) {
    const px = ((s.x % f) + f) % f;
    const py = ((s.y % f) + f) % f;
    blit(img, shrink(s.img, f, px, py), Math.floor((s.x - rx) / f), Math.floor((s.y - ry) / f));
  }
  return img;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// La planche

const INK: RGBA = [250, 236, 200, 255];
const SOFT: RGBA = [210, 196, 160, 255];
const A_COL: RGBA = [236, 120, 52, 255]; // la forge A, ses distances
const B_COL: RGBA = [120, 196, 230, 255]; // l'emplacement B
const BG: RGBA = [40, 31, 24, 255];

/** Un trait en pointillé de (x0, y0) à (x1, y1), `on` px pleins, `off` px vides, épaisseur `t`. */
function dashed(img: Img, x0: number, y0: number, x1: number, y1: number, c: RGBA, on = 6, off = 4, t = 1): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 0; k <= n; k++) {
    if (k % (on + off) >= on) continue;
    const x = Math.round(x0 + ((x1 - x0) * k) / n);
    const y = Math.round(y0 + ((y1 - y0) * k) / n);
    rect(img, x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
  }
}
function dashedRect(img: Img, x: number, y: number, w: number, h: number, c: RGBA, on = 6, off = 4, t = 1): void {
  dashed(img, x, y, x + w - 1, y, c, on, off, t);
  dashed(img, x, y + h - 1, x + w - 1, y + h - 1, c, on, off, t);
  dashed(img, x, y, x, y + h - 1, c, on, off, t);
  dashed(img, x + w - 1, y, x + w - 1, y + h - 1, c, on, off, t);
}
function frame(img: Img, x: number, y: number, w: number, h: number, c: RGBA, t = 1): void {
  rect(img, x, y, w, t, c);
  rect(img, x, y + h - t, w, t, c);
  rect(img, x, y, t, h, c);
  rect(img, x + w - t, y, t, h, c);
}
/** Agrandie `k` fois (plus proche voisin). */
function enlarge(src: Img, k: number): Img {
  const out = blank(src.w * k, src.h * k, [0, 0, 0, 0]);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const s = (Math.floor(y / k) * src.w + Math.floor(x / k)) * 4;
      out.data.set(src.data.subarray(s, s + 4), (y * out.w + x) * 4);
    }
  return out;
}
/** Un texte centré sur x. */
const centered = (img: Img, s: string, x: number, y: number, k: number, c: RGBA) => text(img, s, Math.round(x - textWidth(s, k) / 2), y, k, c);

/** La flèche du nord. */
function north(img: Img, x: number, y: number): void {
  for (let j = 0; j < 18; j++) rect(img, x - Math.floor(j / 3), y + 10 + j, 2 * Math.floor(j / 3) + 1, 1, INK);
  rect(img, x, y + 28, 1, 12, INK);
  centered(img, 'N', x + 1, y - 6, 2, INK);
}

/** Une échelle graphique de `metres` m à `pxPerM` px par mètre, en tranches de 10 m. */
function scaleBar(img: Img, x: number, y: number, metres: number, pxPerM: number, step: number): void {
  const w = Math.round(metres * pxPerM);
  for (let k = 0; k < metres / step; k++) rect(img, x + Math.round(k * step * pxPerM), y, Math.round(step * pxPerM), 6, k % 2 ? [40, 31, 24, 255] : INK);
  frame(img, x - 1, y - 1, w + 2, 8, INK);
  text(img, '0', x - 3, y + 12, 1, INK);
  text(img, `${metres} M`, x + w - textWidth(`${metres} M`, 1) / 2, y + 12, 1, INK);
}

// --- 1. La bande réduite ---
const F = 4;
const BAND = { x: 330 * M, y: 240 * M, w: 460 * M, h: 100 * M }; // px du monde
const W = 2440;
const BX = Math.round((W - BAND.w / F) / 2);
const BY = 70;
const band = renderRegion(BAND.x, BAND.y, BAND.w, BAND.h, F);

const sheet = blank(W, 2600, BG);
blit(sheet, band, BX, BY);
frame(sheet, BX - 1, BY - 1, band.w + 2, band.h + 2, SOFT);
/** px du monde → px de la planche, dans la bande. */
const bx = (wx: number) => BX + Math.round((wx - BAND.x) / F);
const by = (wy: number) => BY + Math.round((wy - BAND.y) / F);

centered(sheet, 'LA FORGE - VUE D ENSEMBLE DE L EMPLACEMENT (ESSAI HORS JEU)', W / 2, 14, 3, INK);
text(sheet, 'LE MONDE DE X 330 A 790 M, Y 240 A 340 M, REDUIT 4 FOIS (1 PX = 20 CM). VRAIES TUILES ET VRAIS OBJETS DES CARTES FERME, CHEMIN, VILLAGE.', BX, 48, 1, SOFT);

// les limites des zones et leurs noms
for (const m of ZONES) {
  const x = bx(m.world!.x);
  if (x > BX && x < BX + band.w) dashed(sheet, x, BY, x, BY + band.h - 1, [250, 240, 210, 140], 3, 5);
  text(sheet, m.name, Math.max(BX + 6, x + 6), BY + 6, 1, [250, 236, 200, 220]);
}

// les parcelles des abords et des autres quartiers, en contour
for (const p of village.parcels) {
  const x = bx(village.world!.x + p.x);
  const y = by(village.world!.y + p.y);
  const w = Math.round(p.w / F);
  const h = Math.round(p.h / F);
  if (x > BX + band.w || y > BY + band.h || y + h < BY) continue;
  if (p === PARCEL_A) continue;
  dashedRect(sheet, x, Math.max(BY, y), w, Math.min(BY + band.h, y + h) - Math.max(BY, y), [240, 226, 180, 200], 4, 3);
}
// la parcelle A, en plein
{
  const x = bx(PA.x / PX);
  const y = by(PA.y / PX);
  frame(sheet, x, y, 120, 120, A_COL, 2);
}
// l'emplacement B, en pointillé (village.tmj x 300–1000, y 1500–2016)
const B_BOX = { x: village.world!.x + 300, y: village.world!.y + 1500, w: 700, h: 516 };
dashedRect(sheet, bx(B_BOX.x), by(B_BOX.y), Math.round(B_BOX.w / F), Math.round(B_BOX.h / F), B_COL, 5, 4, 2);

// les centres et les distances (à vol d'oiseau)
const maisonPlan = maps['ferme'].plans.find((p) => p.plan === 'maison-xeros')!;
const C_HOUSE = { x: maps['ferme'].world!.x + maisonPlan.x + plans['maison-xeros'].size.w / PX / 2, y: maps['ferme'].world!.y + maisonPlan.y + plans['maison-xeros'].size.d / PX / 2 };
const C_A = { x: PA.x / PX + PARCEL_A.w / 2, y: PA.y / PX + PARCEL_A.h / 2 };
const C_B = { x: B_BOX.x + B_BOX.w / 2, y: B_BOX.y + B_BOX.h / 2 };
const C_PLACE = { x: 765.6 * M, y: 306.4 * M }; // le milieu du rond de la place (CADRAGE-forge.md)
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.round(Math.hypot(a.x - b.x, a.y - b.y) / M);
const D = { houseA: dist(C_HOUSE, C_A), aPlace: dist(C_A, C_PLACE), houseB: dist(C_HOUSE, C_B), bPlace: dist(C_B, C_PLACE) };
console.log(`distances : maison-A ${D.houseA} m, A-place ${D.aPlace} m, maison-B ${D.houseB} m, B-place ${D.bPlace} m`);
console.log(`centres (m) : maison (${(C_HOUSE.x / M).toFixed(1)} ; ${(C_HOUSE.y / M).toFixed(1)}), A (${(C_A.x / M).toFixed(1)} ; ${(C_A.y / M).toFixed(1)}), B (${(C_B.x / M).toFixed(1)} ; ${(C_B.y / M).toFixed(1)})`);

const dot = (p: { x: number; y: number }, c: RGBA) => rect(sheet, bx(p.x) - 2, by(p.y) - 2, 5, 5, c);
dashed(sheet, bx(C_HOUSE.x), by(C_HOUSE.y) - 2, bx(C_A.x), by(C_A.y) - 2, A_COL, 8, 4, 2);
dashed(sheet, bx(C_A.x), by(C_A.y) - 2, bx(C_PLACE.x), by(C_PLACE.y) - 2, A_COL, 8, 4, 2);
dashed(sheet, bx(C_HOUSE.x), by(C_HOUSE.y) + 3, bx(C_B.x), by(C_B.y) + 3, B_COL, 4, 4, 1);
dashed(sheet, bx(C_B.x), by(C_B.y) + 3, bx(C_PLACE.x), by(C_PLACE.y) + 3, B_COL, 4, 4, 1);
for (const [p, c] of [[C_HOUSE, INK], [C_A, A_COL], [C_B, B_COL], [C_PLACE, INK]] as const) dot(p, c);

/** Une étiquette sur un fond sombre. */
function label(s: string, x: number, y: number, k: number, c: RGBA, center = true): void {
  const w = textWidth(s, k);
  const x0 = center ? Math.round(x - w / 2) : x;
  rect(sheet, x0 - 4, y - 3, w + 6, 7 * k + 6, [30, 22, 16, 200]);
  text(sheet, s, x0, y, k, c);
}
// distances : A au-dessus du trait, B au-dessous
label(`${D.houseA} M`, bx((C_HOUSE.x + C_A.x) / 2), by((C_HOUSE.y + C_A.y) / 2) - 26, 2, A_COL);
label(`${D.aPlace} M`, bx((C_A.x + C_PLACE.x) / 2), by((C_A.y + C_PLACE.y) / 2) - 26, 2, A_COL);
label(`${D.houseB} M (B)`, bx((C_HOUSE.x + C_B.x) / 2), by((C_HOUSE.y + C_B.y) / 2) + 12, 1, B_COL);
label(`${D.bPlace} M (B)`, bx((C_B.x + C_PLACE.x) / 2) + 10, by((C_B.y + C_PLACE.y) / 2) + 40, 1, B_COL);

// les noms
label('MAISON DE XEROS', bx(C_HOUSE.x), by(C_HOUSE.y) - 64, 2, INK);
label('CHEMIN DE TERRE', bx(500 * M), by(6 * M + 4000 + 65 * TILE) + 14, 2, INK);
label('LA RUE', bx(700 * M), by(4000 + 65 * TILE) + 18, 2, INK);
label('LA PLACE ET SES HUIT ETALS', bx(C_PLACE.x), by(C_PLACE.y) + 66, 2, INK);
label('FORGE A', bx(C_A.x), by(PA.y / PX) - 22, 2, A_COL);
label('B', bx(B_BOX.x) + 10, by(B_BOX.y) + 6, 2, B_COL, false);
label('ABORDS (MAISONS)', bx(village.world!.x + 1568 + 240), by(village.world!.y + 1536) - 16, 1, SOFT);
label('ABORDS', bx(village.world!.x + 1568 + 240), by(village.world!.y + 2240) + 6, 1, SOFT);
label('QUARTIER RICHE', bx(village.world!.x + 2592 + 320), by(village.world!.y + 1760) - 18, 1, SOFT);
label('QUARTIER SUD', bx(village.world!.x + 2848 + 400), by(village.world!.y + 2528) + 8, 1, SOFT);
north(sheet, BX + band.w - 30, BY + 20);
scaleBar(sheet, BX + 20, BY + band.h - 32, 50, M / F, 10);

// légende de la bande
const LY = BY + band.h + 12;
text(sheet, `FORGE A (RECOMMANDEE) - PARCELLE NORD-OUEST DES ABORDS, VILLAGE X 1024-1504, Y 1536-2016 - A ${D.houseA} M DE LA MAISON (2 MIN 30 A PIED), ${D.aPlace} M DE LA PLACE (50 S)`, BX, LY, 1, A_COL);
text(sheet, `B (EN POINTILLE) - DANS LE PRE, AVANT LA RUE, VILLAGE X 300-1000, Y 1500-2016 - ${D.houseB} M DE LA MAISON (2 MIN 15), ${D.bPlace} M DE LA PLACE (1 MIN 05)`, BX, LY + 14, 1, B_COL);
text(sheet, 'DISTANCES A VOL D OISEAU, DE MILIEU A MILIEU. PARCELLES EN CONTOUR PONCTUE. LES BATIMENTS SONT LES PLANS DU JEU POSES (MAISON, ETALS) ET LA FORGE DE L ESSAI.', BX, LY + 28, 1, SOFT);

// --- 2. L'entrée du village, à la taille du jeu, x2 ---
const K = 2;
const ZR = { x: village.world!.x + 860, y: village.world!.y + 1400, w: 1200, h: 880 }; // px du monde
const zoom = renderRegion(ZR.x, ZR.y, ZR.w, ZR.h, 1);
// Xéros sur le chemin, qui va vers le village (image « walk-right » 1 de sa planche)
{
  const xs = SHEETS.get('xeros')!;
  const fr = frameOf('xeros', xs.anims['walk-right'].frames[1]);
  const feet = { x: village.world!.x + 930, y: village.world!.y + 2122 };
  overImg(zoom, fr, feet.x - 16 - ZR.x, feet.y - 45 - ZR.y);
}
const ZX = Math.round((W - ZR.w * K) / 2);
const ZY = LY + 64;
centered(sheet, `L ENTREE DU VILLAGE, A LA TAILLE DU JEU (1 PX = 5 CM), AGRANDIE 2 FOIS - LA FORGE A SUR SA PARCELLE (24 X 24 M)`, W / 2, ZY - 22, 2, INK);
blit(sheet, enlarge(zoom, K), ZX, ZY);
frame(sheet, ZX - 1, ZY - 1, ZR.w * K + 2, ZR.h * K + 2, SOFT);
/** px du monde → px de la planche, dans l'agrandissement. */
const zx = (wx: number) => ZX + (wx - ZR.x) * K;
const zy = (wy: number) => ZY + (wy - ZR.y) * K;
// les parcelles, en contour
for (const p of village.parcels) {
  const x = zx(village.world!.x + p.x);
  const y = zy(village.world!.y + p.y);
  if (x > ZX + ZR.w * K || y > ZY + ZR.h * K) continue;
  const x0 = Math.max(ZX, x);
  const y0 = Math.max(ZY, y);
  const x1 = Math.min(ZX + ZR.w * K, x + p.w * K);
  const y1 = Math.min(ZY + ZR.h * K, y + p.h * K);
  if (x1 > x0 && y1 > y0) dashedRect(sheet, x0, y0, x1 - x0, y1 - y0, p === PARCEL_A ? A_COL : [240, 226, 180, 220], 10, 6, 2);
}
// la place réservée de la fonderie (x 1500–2300, y 250–1000 de la parcelle)
const pc = (cx: number, cy: number) => ({ x: zx(PA.x / PX + cx / PX), y: zy(PA.y / PX + cy / PX) });
{
  const a = pc(1500, 250);
  const b = pc(2300, 1000);
  dashedRect(sheet, a.x, a.y, b.x - a.x, b.y - a.y, [236, 160, 90, 255], 6, 6, 2);
  label('FONDERIE', (a.x + b.x) / 2, a.y + 40, 2, [236, 160, 90, 255]);
  label('(RESERVEE, VIDE)', (a.x + b.x) / 2, a.y + 64, 1, [236, 160, 90, 255]);
}
{
  const l = pc(700, 890);
  label('LOGIS 8 X 6,40 M (CHAUME)', l.x, l.y + 30, 2, INK);
  const c = pc(420, 1090);
  label('COUR (5 M, CACHEE PAR LE TOIT DE L ATELIER)', c.x, c.y, 1, INK);
  const at = pc(780, 2180);
  label('ATELIER 9,60 X 6,80 M, OUVERT AU SUD (PLANCHES, BOIS VIEUX)', at.x, at.y + 12, 1, INK);
  const ab = pc(1550, 1955);
  label('ABRI A CHARBON', ab.x, ab.y + 12, 1, INK);
  const pu = pc(1200, 1120);
  label('PUITS', pu.x + 8, pu.y, 1, INK, false);
}
label('LE CHEMIN DEVIENT LA RUE', zx(village.world!.x + 1000), zy(village.world!.y + 2176) + 14, 1, INK);
label('XEROS (1,60 M)', zx(village.world!.x + 930), zy(village.world!.y + 2122) + 14, 1, INK);
label('2E PARCELLE DES ABORDS', zx(village.world!.x + 1568 + 240), zy(village.world!.y + 1536) + 14, 1, SOFT);
label('VERS LA PLACE (100 M)', ZX + ZR.w * K - 110, zy(village.world!.y + 2176) + 14, 1, INK);
north(sheet, ZX + ZR.w * K - 40, ZY + 20);
scaleBar(sheet, ZX + 20, ZY + ZR.h * K - 34, 10, M * K, 2);
const NY = ZY + ZR.h * K + 14;
text(sheet, 'LA FORGE ICI N EST QU UNE SILHOUETTE MONTEE AVEC LES PIECES DU JEU : ATELIER = LA GRANGE SANS SON MUR SUD, BOIS VIEUX ; LOGIS = LA MAISON DE XEROS', ZX, NY, 1, SOFT);
text(sheet, 'RACCOURCIE DE 3 TRAVEES (SALLE ET ATRE, CHAMBRE) ; ABRI = L ABRI A BOIS DU JEU ; LE PUITS DU JEU. LE DESSIN PROPRE DE LA FORGE EST SUR LES AUTRES PLANCHES.', ZX, NY + 12, 1, SOFT);

const H = NY + 34;
const out = crop(sheet, 0, 0, W, H);
mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/forge-ensemble.png', toPng(out));
console.log(`.art-preview/forge-ensemble.png : ${W} x ${H}`);
