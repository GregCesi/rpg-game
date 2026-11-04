// Planche des pièces de la forge, telles qu'elles sont dans le jeu (chantier « forge ») : npx tsx tools/essai-forge-pieces.ts écrit
// .art-preview/forge-pieces.png :
//   1. chaque pièce de l'atelier (art/world/forge.ts) dans toutes ses vues, x3, Xéros à gauche pour l'échelle, la taille dessinée
//      et celle du gabarit sous chacune ; le bois au vieux (celui de l'atelier) ;
//   2. les trois couvertures (art/world/forge-roofs.ts) sur la charpente de la grange (src/content/plans/grange.json, mur sud ouvert),
//      x2 : le pan sud (r0), le pan nord percé (r2) au droit du conduit de la forge, les pignons à la pente, la forge, sa hotte, son
//      conduit et son couronnement ; les poinçons et le faîtage relevés sous le faîte (45° : poinçons de 3 m, faîtage à 6,40 m ; 55° :
//      4,40 m, 7,80 m) ;
//   3. les pans seuls dans leurs quatre vues (x1), et l'abri à charbon (l'appentis de bardeaux sur ses poteaux de 3 m et 1,60 m).
// Les images sont celles du jeu (`sources` d'art/index.ts), posées comme le jeu les pose (src/world/build.ts : l'image centrée sur
// l'emprise, son bas au bord sud relevé de sa hauteur ; profondeur `depthsOf`).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import { agedPalette } from '../art/world/wood';
import { composeWood } from '../art/world/wood-pieces';
import { world } from '../art/palette';
import type { Board, Scene } from '../art/lib/volumes';
import { render, type Layer } from '../art/proposals/maison-xeros';
import { expectedSize, silhouette, type Dims } from '../src/content/gabarit';
import { formView } from '../src/world/natural';
import { variantImage } from '../src/content/views';
import { depthsOf, boxOf, type BuildPiece } from '../src/world/build';
import { upOf, lookOf } from '../src/world/woodShape';
import propsJson from '../src/content/props.json';
import grangeJson from '../src/content/plans/grange.json';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const GOLD: Rgb = [245, 215, 120];
const RED: Rgb = [235, 110, 90];

type Img = { grid: Grid; pal: Palette };
const byName = new Map(sources.map((s) => [s.name, s]));
const has = (k: string) => byName.has(k);
function img(name: string): Img {
  const s = byName.get(name);
  if (s?.kind === 'image') return { grid: s.grid, pal: s.palette };
  if (s?.kind === 'spritesheet') return { grid: Object.values(s.animations)[0].frames[0], pal: s.palette };
  throw new Error(`essai-forge-pieces : pas d'image « ${name} »`);
}
function frames(name: string): Img[] {
  const s = byName.get(name);
  if (s?.kind !== 'spritesheet') return [img(name)];
  return Object.values(s.animations)[0].frames.map((grid) => ({ grid, pal: s.palette }));
}
const xeros = (): Img => {
  const s = byName.get('xeros');
  if (s?.kind !== 'spritesheet') throw new Error('xeros');
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
};
const OLD = agedPalette(world, 'old');
type Def = { image: string; views: 'four' | 'symmetric' | 'round'; aged?: boolean; dims: Dims };
const props = propsJson as unknown as Record<string, Def>;

/** L'image d'une vue d'un objet, au vieux s'il prend l'âge. */
function propImg(key: string, v = 0): Img {
  const def = props[key];
  if (!def) throw new Error(`essai-forge-pieces : pas d'objet « ${key} »`);
  const k = formView(variantImage(def.image, undefined), def.views as never, v, undefined, has);
  return img(def.aged && has(`${k}-old`) ? `${k}-old` : k);
}
const viewKeys = (key: string): number[] => (props[key].views === 'four' ? [0, 1, 2, 3] : props[key].views === 'symmetric' ? [0, 1] : [0]);

// =====================================================================================================================
// La planche
// =====================================================================================================================

interface Block { title: string[]; w: number; h: number; draw: (sh: Sheet, x: number, y: number) => void; notes: { text: string; bad?: boolean }[] }

function blitLayer(sheet: Sheet, l: Layer, ox: number, oy: number, k: number): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    sheet.rect(ox + x * k, oy + y * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2]]);
  }
}

function sheetOf(rows: Block[][], head: string[]): Sheet {
  const PAD = 16, GAP = 28;
  const bw = (b: Block) => Math.max(b.w, ...[...b.title, ...b.notes.map((n) => n.text)].map((l) => textWidth(l, T)));
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
      b.notes.forEach((l, i) => sheet.text(l.text, x, y + th + ih + 6 + i * 12, l.bad ? RED : GREY, T));
      x += bw(b) + GAP;
    }
    y += rowH[ri];
  });
  return sheet;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const REPORT: string[] = [];

/** La taille dessinée d'une vue contre celle du gabarit (une vue de côté : largeur et profondeur échangées). */
function gauge(name: string, g: Img, d: Dims, v: number): { text: string; bad?: boolean } {
  const s = silhouette(g.grid, g.pal);
  const e = expectedSize(v % 2 ? { ...d, w: d.d, d: d.w } : d);
  const ok = s.w >= e.w - 2 && s.w <= e.wMax + 2 && s.h >= e.h - 2 && s.h <= e.hMax + 2;
  const want = `${fmt(e.w)}${e.wMax > e.w ? `-${fmt(e.wMax)}` : ''}X${fmt(e.h)}${e.hMax > e.h ? `-${fmt(e.hMax)}` : ''}`;
  const line = `${name.toUpperCase()} : ${s.w}X${s.h} (GABARIT ${want})${v === 2 ? ' DOS' : ok ? '' : ' HORS'}`;
  REPORT.push(line);
  return { text: line, bad: !ok && v !== 2 };
}

/** Une pièce dans toutes ses vues, sur une ligne de sol, x k, Xéros à gauche. */
function pieceBlock(key: string, k: number): Block {
  const def = props[key];
  const vs = viewKeys(key);
  const imgs = vs.map((v) => propImg(key, v));
  const extra = key === 'forge-hearth' ? frames(def.image).slice(1).map((f) => ({ ...f, pal: f.pal })) : [];
  const all = [xeros(), ...imgs, ...extra];
  const gap = 5;
  const w = all.reduce((s, it) => s + (it.grid[0].length + gap) * k, 0);
  const h = Math.max(...all.map((it) => it.grid.length)) * k;
  const names = vs.map((v) => (v === 0 ? def.image : def.views === 'symmetric' ? `${def.image}-ns` : `${def.image}-r${v}`));
  return {
    title: [`${key.toUpperCase()} (${def.dims.w}X${def.dims.d}X${def.dims.h} CM${def.dims.ground ? ', GROUND' : ''})`, `${def.views.toUpperCase()}${extra.length ? ' ; PUIS LES IMAGES 2 ET 3 DU FEU' : ''}`],
    notes: vs.map((v, i) => gauge(names[i], imgs[i], def.dims, v)),
    w, h: h + 2,
    draw: (sh, x, y) => {
      let cx = x;
      for (const it of all) {
        sh.blit(it.grid, it.pal, cx, y + h - it.grid.length * k, k);
        cx += (it.grid[0].length + gap) * k;
      }
      sh.rect(x, y + h + 1, w - gap * k, 1, [110, 104, 90]);
    },
  };
}

// =====================================================================================================================
// Les scènes : pièces posées comme dans le jeu
// =====================================================================================================================

type Raw = Omit<BuildPiece, 'id'>;
const beam = (length: number, axis: 'up' | 'ew' | 'ns') => ({ wood: { size: 'normal', length, shape: 'round', hewn: 12, axis } }) as unknown as BuildPiece['piece'];
const P = (prop: string, x: number, y: number, z: number, view = 0): Raw => ({ piece: { prop } as BuildPiece['piece'], x, y, z, view } as Raw);

function boardsOf(raw: Raw[], o: [number, number]): Board[] {
  const pieces: BuildPiece[] = raw.map((p, id) => ({ ...p, id }) as BuildPiece);
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

/**
 * L'atelier sous une couverture : la grange du plan (sans son mur sud ni ses pans de planches ni ses pignons), les poinçons et le
 * faîtage relevés sous le faîte, les deux pans (le nord percé, en r2), les pignons à la pente, la forge et sa souche.
 */
function atelier(cover: 'shingle' | 'tile' | 'lauze', south = true): Raw[] {
  const steep = cover === 'lauze';
  const king = steep ? 440 : 300, ridgeZ = 342 + king;
  const raw = ((grangeJson as unknown as { pieces: Raw[] }).pieces).filter((p) => {
    const ref = p.piece as { prop?: string };
    return !(ref.prop === 'cart-door' || (ref.prop === 'board-wall' && p.y === 640) || ref.prop === 'plank-roof-large' || ref.prop === 'board-gable');
  }).map((p) => {
    const w = (p.piece as { wood?: { length: number; axis: string } }).wood;
    // les poinçons (debout sur les entraits, à 3,42 m) et le faîtage (sur eux) relevés
    if (w && w.axis === 'up' && p.z === 342) return { ...p, piece: beam(king, 'up') };
    if (w && w.axis === 'ew' && p.z === 562) return { ...p, z: ridgeZ };
    return p;
  });
  const gable = steep ? 'board-gable-steep' : 'board-gable-tall';
  const flues = steep ? 6 : 5;
  const forge: Raw[] = [
    // la forge contre le bardage nord, au droit du trou (repère de la grange : celui de l'atelier + 40 cm)
    P('forge-hearth', 160, 80, 0), P('chimney-hood', 160, 80, 160),
    ...Array.from({ length: flues }, (_, k) => P('chimney-flue', 220, 80, 260 + 100 * k)),
    P('chimney-cap', 200, 70, 260 + 100 * flues),
  ];
  return [
    ...raw, ...forge,
    P(gable, 40, 80, 342, 1), P(gable, 900, 80, 342, 3),
    P(`${cover}-roof-large-pierced`, 0, 0, 342, 2), ...(south ? [P(`${cover}-roof-large`, 0, 340, 342, 0)] : []),
  ];
}

/** L'abri à charbon : poteaux en x 0 et 300, y 0 et 200 (3 m au nord, 1,60 m au sud, sur des dalles), sablières, le pan d'appentis. */
function shed(): Raw[] {
  const out: Raw[] = [];
  for (const [x, y, l] of [[0, 0, 300], [300, 0, 300], [0, 200, 160], [300, 200, 160]] as const) {
    out.push(P('slab', x - 2, y, 0), { piece: beam(l, 'up'), x, y, z: 12, view: 0 } as Raw);
  }
  out.push({ piece: beam(340, 'ew'), x: 0, y: 5, z: 312, view: 0 } as Raw, { piece: beam(340, 'ew'), x: 0, y: 205, z: 172, view: 0 } as Raw);
  out.push(P('shingle-shed-roof', -20, -40, 172, 0));
  return out;
}

function sceneBlock(title: string[], notes: string[], raw: Raw[], k: number, xer: [number, number], margin: [number, number, number, number]): Block {
  const o: [number, number] = [0, 0];
  const boards = boardsOf(raw, o);
  const xg = xeros(), xs = silhouette(xg.grid, xg.pal);
  boards.push({ grid: xg.grid, pal: xg.pal, x: Math.round(xer[0] - xs.x - xs.w / 2), y: Math.round(xer[1] - (xs.y + xs.h)), depth: () => xer[1] });
  const sc: Scene = { quads: [], boards };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of boards) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.grid[0].length); y1 = Math.max(y1, b.y + b.grid.length); }
  const bd: [number, number, number, number] = [x0 - margin[0], y0 - margin[1], x1 + margin[2], y1 + margin[3]];
  const l = render(sc, bd, { grass: (x, y) => ((x * 7 + y * 13) % 11 === 0 ? 'G' : 'g'), floor: () => 'I' });
  return { title, notes: notes.map((text) => ({ text })), w: l.w * k, h: l.h * k, draw: (sh, x, y) => blitLayer(sh, l, x, y, k) };
}

/** Les quatre vues d'un pan ou d'un pignon, x1. */
function viewsBlock(key: string): Block {
  const def = props[key];
  const imgs = viewKeys(key).map((v) => propImg(key, v));
  const gap = 8;
  const w = imgs.reduce((s, it) => s + it.grid[0].length + gap, 0), h = Math.max(...imgs.map((i) => i.grid.length));
  return {
    title: [`${key.toUpperCase()} (${def.dims.w}X${def.dims.d}X${def.dims.h})`, 'R0 R1 R2 R3, X1'],
    notes: viewKeys(key).filter((v) => v !== 2).map((v) => gauge(v ? `${def.image}-r${v}` : def.image, imgs[v], def.dims, v)),
    w, h,
    draw: (sh, x, y) => {
      let cx = x;
      for (const it of imgs) { sh.blit(it.grid, it.pal, cx, y + h - it.grid.length, 1); cx += it.grid[0].length + gap; }
    },
  };
}

// =====================================================================================================================

function main(): void {
  const furniture = ['forge-hearth', 'forge-oven', 'forge-bellows', 'anvil', 'anvil-block', 'quench-trough', 'charcoal-bin', 'tool-rack', 'bar-rack', 'grindstone', 'vise', 'scrap-crate'];
  const K = 3;
  const rows: Block[][] = [
    [pieceBlock('forge-hearth', K), pieceBlock('forge-oven', K)],
    [pieceBlock('forge-bellows', K), pieceBlock('anvil', K), pieceBlock('anvil-block', K), pieceBlock('quench-trough', K)],
    [pieceBlock('charcoal-bin', K), pieceBlock('tool-rack', K), pieceBlock('bar-rack', K)],
    [pieceBlock('grindstone', K), pieceBlock('vise', K), pieceBlock('scrap-crate', K)],
  ];
  void furniture;
  const covers = [
    ['shingle', 'BARDEAUX DE CHENE FENDU, 45 DEG (LE CHOIX DE GREGOIRE), BOIS VIEUX'],
    ['tile', 'TUILES PLATES DE TERRE CUITE, 45 DEG'],
    ['lauze', 'LAUZES DE CALCAIRE, 55 DEG'],
  ] as const;
  rows.push(covers.map(([c, t]) => sceneBlock([`L ATELIER : ${t}`, 'PAN SUD R0, PAN NORD PERCE R2, PIGNONS, FORGE, HOTTE, CONDUIT, X2'],
    [c === 'lauze' ? 'poincons 4,40 m, faitage a 7,82 m ; faite des pans a 8,28 m' : 'poincons 3 m, faitage a 6,42 m ; faite des pans a 6,82 m'], atelier(c), 2, [100, 200], [24, 16, 24, 40])));
  rows.push((['shingle', 'lauze'] as const).map((c) => sceneBlock([`SANS LE PAN SUD : ${c === 'lauze' ? 'LAUZES, 55 DEG' : 'BARDEAUX, 45 DEG'}`, 'LE PAN NORD PERCE (R2, VU PAR LA TRANCHE OU PAR DESSOUS), LES PIGNONS, LA SOUCHE, X2'],
    ['le pan nord, vu du sud, ne montre que sa tranche (45 deg) ou son dessous (55 deg)'], atelier(c, false), 2, [100, 200], [24, 16, 24, 40])));
  rows.push([
    sceneBlock(['L ABRI A CHARBON : L APPENTIS DE BARDEAUX', 'POTEAUX 3 M ET 1,60 M SUR DALLES, SABLIERES, PAN A Z 1,72 M, X3'], ['pan de x -20 a 360, y -40 a 280'], shed(), 3, [96, 70], [20, 16, 30, 24]),
    viewsBlock('board-gable-tall'), viewsBlock('board-gable-steep'),
  ]);
  rows.push([viewsBlock('shingle-roof-large'), viewsBlock('shingle-roof-large-pierced')]);
  rows.push([viewsBlock('tile-roof-large'), viewsBlock('tile-roof-large-pierced')]);
  rows.push([viewsBlock('lauze-roof-large'), viewsBlock('lauze-roof-large-pierced'), viewsBlock('shingle-shed-roof')]);
  const sheet = sheetOf(rows, [
    'LA FORGE : LES PIECES DU JEU (ART/WORLD/FORGE.TS, ART/WORLD/FORGE-ROOFS.TS)',
    '5 cm par px ; meubles : gabarit W X (H + D/2) ; pieces de batiment (ground) : W X (H + D) ; silhouette contour compris, ombre exclue',
    'le bois au vieux (celui de l atelier) ; R2 (le dos) n est pas contraint par le gabarit',
  ]);
  const out = join(ROOT, '.art-preview', 'forge-pieces.png');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-forge-pieces -> ${out}`);
  for (const l of REPORT) console.log(`  ${l}`);
}
main();
