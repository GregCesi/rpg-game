// Planches de contrôle du centre de la place (chantier « village », CADRAGE-village.md section 14 ; hors jeu : rien ici n'entre dans le
// jeu) : npx tsx tools/essai-place-centre.ts écrit
//   .art-preview/place-centre.png         le rond de 20 m en terre battue (la tuile `yard` du jeu, jusqu'aux façades), les emprises des
//                                         bâtiments de la section 14.1 en contours gris (sans les dessiner), le centre composé dessus
//                                         (`CENTRE` de art/proposals/place-centre.ts), en x2, Xéros au milieu ; le panneau des nouvelles
//                                         et les passages réservés en pointillé ;
//   .art-preview/place-centre-pieces.png  chaque pièce nouvelle (`PIECES`), toutes ses vues, x4, à côté de Xéros, nom, dimensions, taille
//                                         dessinée et gabarit (docs/STYLE.md section 8).
//
// Rien n'est dessiné ici : l'outil monte les exports du module, rendus par le `render` de l'essai de la maison de Xéros
// (art/proposals/maison-xeros.ts), le texte avec la police à accents (art/proposals/village-plan-font.ts).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Grid, Palette } from '../art/lib/canvas';
import type { Board } from '../art/lib/volumes';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { render, type Bounds } from '../art/proposals/maison-xeros';
import { CENTRE, MODELS, PIECES, PIECE_NOTES, PLAN, RESERVED, centreScene } from '../art/proposals/place-centre';
import { fontWidth, write as writeText, wrap } from '../art/proposals/village-plan-font';
import { blank, put, rect, toPng, type Img, type RGBA } from './lib/world-render';
import { expectedSize, silhouette, TOLERANCE, type Dims } from '../src/content/gabarit';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: RGBA = [58, 52, 44, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const GREY: RGBA = [205, 200, 185, 255];
const GOLD: RGBA = [245, 215, 120, 255];
const DIM: RGBA = [150, 142, 124, 255];
const RED: RGBA = [230, 120, 100, 255];
const GREEN: RGBA = [150, 210, 130, 255];
const LINE: RGBA = [120, 116, 108, 255];

const byName = new Map(sources.map((s) => [s.name, s]));
function frameOf(name: string): { grid: Grid; pal: Palette } {
  const s = byName.get(name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-place-centre : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
const XEROS = frameOf('xeros');
const XS = silhouette(XEROS.grid, XEROS.pal);
function xerosAt(x: number, y: number): Board {
  return { grid: XEROS.grid, pal: XEROS.pal, x: Math.round(x - XS.x - XS.w / 2), y: Math.round(y - (XS.y + XS.h)), depth: () => y };
}
const yard15 = worldTiles.tiles['yard-15'];
const yardAt = (x: number, y: number) => worldTiles.palette[yard15[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];

function save(img: Img, name: string): void {
  const out = join(ROOT, '.art-preview', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, toPng(img));
  console.log(`essai-place-centre -> ${out} (${img.w} x ${img.h})`);
}
const hexRGBA = (h: string): RGBA => {
  const s = h.replace('#', ''), n = (i: number) => parseInt(s.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), s.length === 8 ? n(6) : 255];
};
function blitGrid(img: Img, grid: Grid, pal: Palette, ox: number, oy: number, k: number): void {
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    rect(img, ox + x * k, oy + y * k, k, k, hexRGBA(pal[ch]));
  }));
}
function dashed(img: Img, x: number, y: number, w: number, h: number, c: RGBA, t = 2, step = 10): void {
  const on = Math.ceil(step / 2);
  for (let n = 0; n < w; n += step) { rect(img, x + n, y, Math.min(on, w - n), t, c); rect(img, x + n, y + h - t, Math.min(on, w - n), t, c); }
  for (let n = 0; n < h; n += step) { rect(img, x, y + n, t, Math.min(on, h - n), c); rect(img, x + w - t, y + n, t, Math.min(on, h - n), c); }
}
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

// =====================================================================================================================
// 1. Le centre composé, x2
// =====================================================================================================================

function centreSheet(): Img {
  const S = 2;
  const F: Bounds = [2980, 1880, 3660, 2430];
  const sc = centreScene();
  sc.boards.push(xerosAt(3296, 2196));
  const layer = render(sc, F, { grass: yardAt, floor: yardAt });
  const head = [
    'Le centre de la place (essai, section 14.1) : le rond de 20 m en terre battue, les emprises des bâtiments en gris (sans les dessiner), x2',
    'Au milieu le tilleul (fût de 90 cm, 7,50 m) et son ombre, le banc rond ; le panneau des nouvelles réservé au sud-ouest de l’arbre (pointillé or).',
    'Libres : les quatre bouches de rue sur 4 m (pointillé gris) et le tour du banc ; on remplit les secteurs entre elles.',
    'En orange : ce que les autres modules posent dehors (l’étal du riche, le recoin du bûcheron, l’étal de la ferme rivale). NE : charrette de bûches, corde à linge, caisses, banc. SO : charrette à bras, paille, tonneaux, cageots, jarres, banc. SE : abreuvoir, seaux, tonneaux, cageots, paille, bancs.',
  ];
  const PAD = 24, LH = 24;
  const lines = head.flatMap((h) => wrap(h, 112));
  const W = layer.w * S + 2 * PAD, H = PAD + lines.length * LH + 12 + layer.h * S + PAD;
  const img = blank(W, H, BG);
  lines.forEach((l, i) => writeText(img, l, PAD, PAD + i * LH, 2, i < wrap(head[0], 112).length ? GOLD : GREY, null));
  const ox = PAD, oy = PAD + lines.length * LH + 12;
  for (let y = 0; y < layer.h; y++) for (let x = 0; x < layer.w; x++) {
    const q = (y * layer.w + x) * 4;
    rect(img, ox + x * S, oy + y * S, S, S, [layer.rgba[q], layer.rgba[q + 1], layer.rgba[q + 2], 255]);
  }
  const X = (x: number) => ox + (x - F[0]) * S, Y = (y: number) => oy + (y - F[1]) * S;
  const clip = (x: number, y: number, c: RGBA) => { if (x >= ox && y >= oy && x < ox + layer.w * S && y < oy + layer.h * S) put(img, x, y, c); };
  // les emprises des bâtiments : un contour gris, leur nom
  for (const b of PLAN.buildings) {
    const [x0, y0, x1, y1] = b.rect;
    for (let x = X(x0); x < X(x1); x++) for (const y of [Y(y0), Y(y0) + 1, Y(y1) - 2, Y(y1) - 1]) clip(x, y, LINE);
    for (let y = Y(y0); y < Y(y1); y++) for (const x of [X(x0), X(x0) + 1, X(x1) - 2, X(x1) - 1]) clip(x, y, LINE);
    const lx = Math.max(X(x0) + 6, ox + 6), ly = Math.max(Y(y0) + 6, oy + 6);
    if (Y(y1) > oy + 20 && X(x1) > ox + 20 && lx < ox + layer.w * S - 40 && ly < oy + layer.h * S - 20) writeText(img, b.name, lx, Math.min(ly, Y(y1) - 30), 1, GREY);
  }
  // le rond
  for (let a = 0; a < 2400; a++) {
    if (a % 16 > 9) continue;
    const t = (a / 2400) * Math.PI * 2;
    const px = Math.round(X(PLAN.C[0] + Math.cos(t) * PLAN.R)), py = Math.round(Y(PLAN.C[1] + Math.sin(t) * PLAN.R));
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) clip(px + dx, py + dy, [250, 240, 210, 230]);
  }
  // ce que les autres modules posent dehors
  for (const r of PLAN.others) {
    const [x0, y0, x1, y1] = r.rect;
    const cx0 = Math.max(X(x0), ox), cy0 = Math.max(Y(y0), oy), cx1 = Math.min(X(x1), ox + layer.w * S), cy1 = Math.min(Y(y1), oy + layer.h * S);
    if (cx1 <= cx0 || cy1 <= cy0) continue;
    dashed(img, cx0, cy0, cx1 - cx0, cy1 - cy0, [235, 150, 70, 255], 2, 8);
    writeText(img, r.name, cx0 + 4, cy0 + 4, 1, [235, 150, 70, 255]);
  }
  // le réservé : le panneau (or), les passages (gris)
  RESERVED.forEach((r, i) => {
    const [x0, y0, x1, y1] = r.rect;
    const cx0 = Math.max(X(x0), ox), cy0 = Math.max(Y(y0), oy), cx1 = Math.min(X(x1), ox + layer.w * S), cy1 = Math.min(Y(y1), oy + layer.h * S);
    dashed(img, cx0, cy0, cx1 - cx0, cy1 - cy0, i === 0 ? GOLD : [235, 230, 215, 150], 2, 12);
    if (i === 0) writeText(img, 'panneau', X(x0), Y(y1) + 4, 1, GOLD);
  });
  // les petits noms
  for (const c of CENTRE) if (c.label) writeText(img, c.label, X(c.at[0]), Y(c.at[1]) - 14, 1, WHITE);
  return img;
}

// =====================================================================================================================
// 2. Les pièces, x4
// =====================================================================================================================

const SHAPES: Record<string, Partial<Dims>> = {
  'flower-pot': { shape: 'cylinder', axis: 'up' },
  'flower-pot-yellow': { shape: 'cylinder', axis: 'up' },
};
function expected(key: string, d: { w: number; d: number; h: number }, v: number) {
  if (key === 'barrel-lying') return expectedSize(v % 2 ? { w: d.d, d: d.w, h: d.h, shape: 'cylinder', axis: 'ns' } : { ...d, shape: 'cylinder', axis: 'ew' });
  const dd = v % 2 ? { w: d.d, d: d.w, h: d.h } : d;
  return expectedSize({ ...dd, shape: 'box', ...SHAPES[key] } as Dims);
}

function piecesSheet(): Img {
  const S = 4, PAD = 24, GAP = 40, LH = 24, MAXW = 3000;
  interface Block { w: number; h: number; title: string[]; notes: { s: string; c: RGBA }[]; draw: (img: Img, x: number, y: number) => void }
  const blocks: Block[] = PIECES.map((p) => {
    const views = p.views();
    const xw = (XS.w + 2) * S;
    const vw = views.map((v) => v.grid[0].length * S);
    const vh = Math.max(XS.y + XS.h + 2, ...views.map((v) => v.grid.length)) * S;
    const w = xw + 16 + vw.reduce((a, b) => a + b + 16, 0);
    const notes: { s: string; c: RGBA }[] = [];
    notes.push({ s: `${p.key} — ${p.dims.w} × ${p.dims.d} × ${p.dims.h} cm (est-ouest × nord-sud × haut), ${views.length} vue${views.length > 1 ? 's' : ''}`, c: GREY });
    views.forEach((v, i) => {
      const s = silhouette(v.grid, v.pal), e = expected(p.key, p.dims, i);
      const ok = Math.abs(s.w - e.w) <= TOLERANCE + 0.5 && Math.abs(s.h - e.h) <= TOLERANCE + 0.5;
      const free = ['laundry-line-high', 'hand-cart', 'two-wheel-cart', 'leaning-ladder'].includes(p.key) && i > 0 || p.key === 'laundry-line-high' || (p.key === 'hand-cart' && i === 0);
      notes.push({ s: `R${i} : dessiné ${s.w} × ${s.h} px, gabarit ${fmt(e.w)} × ${fmt(e.h)}${ok ? '' : free ? ' (voir la note)' : ' : ÉCART'}`, c: ok ? GREEN : free ? GOLD : RED });
    });
    for (const l of wrap(PIECE_NOTES[p.key] ?? '', Math.max(40, Math.floor(Math.max(w, 520) / 12)))) notes.push({ s: l, c: DIM });
    return {
      w: Math.max(w, 520), h: vh, title: [p.name], notes,
      draw: (img, x, y) => {
        blitGrid(img, XEROS.grid, XEROS.pal, x - XS.x * S + S, y + vh - (XS.y + XS.h + 1) * S, S);
        let cx = x + xw + 16;
        views.forEach((v, i) => {
          blitGrid(img, v.grid, v.pal, cx, y + vh - v.grid.length * S, S);
          writeText(img, `R${i}`, cx, y + vh + 4, 1, DIM, null);
          cx += vw[i] + 16;
        });
        // le sol commun : un trait sous Xéros et les vues
        rect(img, x, y + vh, cx - x - 16, 1, [90, 84, 74, 255]);
      },
    };
  });
  const head = [
    'Les pièces nouvelles du centre de la place, x4, à côté de Xéros (1,60 m) : toutes leurs vues (R0 du sud, puis un quart de tour par vue)',
    'Taille dessinée = la silhouette, contour compris, ombre exclue ; gabarit = docs/STYLE.md section 8 (boîte : W × H + D/2 ; tonneau couché : le cylindre et la règle D).',
    'En or : un écart de la vraie projection, pas de taille (une charrette de côté est plus basse que sa boîte, l’échelle vue du nord penche vers nous, le linge en hauteur garde du vide dessous).',
    `Réutilisées du jeu (non redessinées) : ${['bench', 'hay-bale', 'sack', 'barrel', 'crate', 'bucket-water', 'stool'].join(', ')}.`,
  ];
  const rows: Block[][] = [];
  for (const b of blocks) {
    const r = rows[rows.length - 1];
    const bw = (x: Block) => Math.max(x.w, ...x.notes.map((n) => fontWidth(n.s, 2)), fontWidth(x.title[0], 2));
    if (r && r.reduce((s, x) => s + bw(x) + GAP, 0) + bw(b) <= MAXW - 2 * PAD) r.push(b);
    else rows.push([b]);
  }
  const bw = (x: Block) => Math.max(x.w, ...x.notes.map((n) => fontWidth(n.s, 2)), fontWidth(x.title[0], 2));
  const hl = head.flatMap((h) => wrap(h, 230));
  const rowH = rows.map((r) => LH + 8 + Math.max(...r.map((b) => b.h)) + 26 + Math.max(...r.map((b) => b.notes.length)) * LH + GAP);
  const W = Math.max(...rows.map((r) => PAD * 2 + r.reduce((s, b) => s + bw(b) + GAP, 0) - GAP), ...hl.map((l) => PAD * 2 + fontWidth(l, 2)));
  const H = PAD + hl.length * LH + 16 + rowH.reduce((a, b) => a + b, 0);
  const img = blank(W, H, BG);
  hl.forEach((l, i) => writeText(img, l, PAD, PAD + i * LH, 2, i === 0 ? GOLD : GREY, null));
  let y = PAD + hl.length * LH + 16;
  rows.forEach((r, ri) => {
    let x = PAD;
    const ih = Math.max(...r.map((b) => b.h));
    for (const b of r) {
      writeText(img, b.title[0], x, y, 2, WHITE, null);
      b.draw(img, x, y + LH + 8 + ih - b.h);
      b.notes.forEach((l, i) => writeText(img, l.s, x, y + LH + 8 + ih + 26 + i * LH, 2, l.c, null));
      x += bw(b) + GAP;
    }
    y += rowH[ri];
  });
  return img;
}

void MODELS;
save(centreSheet(), 'place-centre.png');
save(piecesSheet(), 'place-centre-pieces.png');
