// Cinquième essai du sanglier, le profil B+C validé (chantier « sangliers », hors jeu) : npx tsx tools/essai-sangliers-bc.ts écrit
//   .art-preview/sangliers-bc-vues.png          profil, face, dos debout à côté de Xéros (x4, gabarit en liseré), le mort au sol
//                                                dans ses quatre vues, puis à la taille du jeu (x2) en forêt profonde ;
//   .art-preview/sangliers-bc-animations.png    toutes les animations, profil, face et dos, image par image (numéro, durée,
//                                                silhouette), puis à la taille du jeu (x2) sous la pénombre ;
//   .art-preview/sangliers-bc-mort.png          la mort dans les trois vues, le couché à la bauge à côté ;
//   .art-preview/sangliers-xeros-renverse-2.png Xéros renversé (profil, face, dos ; la glissade de 2,5 m en x2) ;
//   .art-preview/sangliers-bc-scene.png         la forêt profonde (x2) : une charge qui renverse Xéros, un sonné au pied d'un
//                                                tronc, un couché à la bauge, un mort.
// Dessins : art/proposals/sanglier-bc.ts, art/proposals/xeros-renverse-2.ts. Ne touche ni au jeu ni à src/generated/ (les
// arbres sont lus dans leurs PNG construits par npm run art).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { EMPTY, flipX, rng, type Grid, type Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import tileset from '../art/world/tiles';
import world from '../src/content/world.json';
import * as boar from '../art/proposals/sanglier-bc-annule/sanglier-bc';
import * as down from '../art/proposals/sanglier-bc-annule/xeros-renverse-2';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.art-preview');
const K = 4;
const PAD = 16;
const BG: Rgb = [72, 80, 69];
const CELL: Rgb = [64, 72, 62];
const WHITE: Rgb = [240, 236, 220];
const GREY: Rgb = [205, 205, 190];
const GOLD: Rgb = [245, 215, 120];
const YELLOW: Rgb = [255, 230, 60];
const RED: Rgb = [230, 80, 60];
const LINE: Rgb = [235, 220, 170];
type Clip = [number, number, number, number];

// ---------------------------------------------------------------- dessin

function silhouette(g: Grid): { x: number; y: number; w: number; h: number } {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  g.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === EMPTY || 'xdDy123'.includes(ch)) return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function blitGrid(s: Sheet, g: Grid, pal: Palette, ox: number, oy: number, k: number, alpha = 1, clip?: Clip) {
  g.forEach((line, y) => [...line].forEach((ch, x) => {
    if (ch === EMPTY) return;
    const hex = pal[ch].replace('#', '');
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    const a = (hex.length === 8 ? n(6) / 255 : 1) * alpha;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const px = ox + x * k + i, py = oy + y * k + j;
      if (clip && (px < clip[0] || py < clip[1] || px >= clip[0] + clip[2] || py >= clip[1] + clip[3])) continue;
      s.dot(px, py, [n(0), n(2), n(4)], a);
    }
  }));
}

type Img = { w: number; h: number; data: Buffer };
const readPng = (name: string): Img => {
  const p = PNG.sync.read(readFileSync(join(ROOT, 'src', 'generated', `${name}.png`)));
  return { w: p.width, h: p.height, data: p.data };
};
function blitPng(s: Sheet, img: Img, ox: number, oy: number, k: number, clip?: Clip, alpha = 1) {
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * 4;
    const a = (img.data[i + 3] / 255) * alpha;
    if (a <= 0) continue;
    for (let j = 0; j < k; j++) for (let q = 0; q < k; q++) {
      const px = ox + x * k + q, py = oy + y * k + j;
      if (clip && (px < clip[0] || py < clip[1] || px >= clip[0] + clip[2] || py >= clip[1] + clip[3])) continue;
      s.dot(px, py, [img.data[i], img.data[i + 1], img.data[i + 2]], a);
    }
  }
}
const bigTree = readPng('big-tree'); // pied (33, 153)
const normalTree = readPng('normal-tree'); // pied (24, 161)
const bush = readPng('bush'); // pied (16, 28)

function gloomAlpha(m: number): number {
  const st = world.gloom;
  if (m <= st[0].x) return st[0].alpha;
  for (let i = 1; i < st.length; i++) if (m <= st[i].x) return st[i - 1].alpha + ((st[i].alpha - st[i - 1].alpha) * (m - st[i - 1].x)) / (st[i].x - st[i - 1].x);
  return 0;
}
/** Le sol de la forêt profonde (tuiles tirées au hasard) sur un rectangle, en x`k`. */
function forestFloor(s: Sheet, x: number, y: number, w: number, h: number, k: number, seed: number) {
  const r = rng(seed);
  const names = ['deepwoods', 'deepwoods2', 'deepwoods3', 'deepwoods4'];
  for (let ty = 0; ty * 32 < h; ty++) for (let tx = 0; tx * 32 < w; tx++) {
    blitGrid(s, tileset.tiles[names[Math.floor(r() * 4)]], tileset.palette as Palette, x + tx * 32 * k, y + ty * 32 * k, k, 1, [x, y, w * k, h * k]);
  }
}
function gloom(s: Sheet, x: number, y: number, w: number, h: number) {
  const a = gloomAlpha(0);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.dot(x + i, y + j, [11, 22, 17], a);
}

// ---------------------------------------------------------------- cellules

type Cell = { w: number; h: number; draw: (s: Sheet, x: number, top: number) => void };
type Row = { title: string; note?: string; cells: Cell[] };

const XR: [number, number] = [12, 47];
const xf = (anim: string, i = 0) => xeros.animations[anim].frames[i];

function xerosCell(anim: string, label: string): Cell {
  const g = xf(anim).slice(XR[0], XR[1] + 1);
  const sil = silhouette(g);
  return {
    w: Math.max(g[0].length * K, textWidth(label, 2)) + PAD, h: g.length * K + 30,
    draw: (s, x, top) => {
      blitGrid(s, g, xeros.palette, x, top, K);
      s.text(label, x, top + g.length * K + 6, GREY, 2);
      s.text(`${sil.w}X${sil.h}`, x, top + g.length * K + 18, GREY, 2);
    },
  };
}

/** Une vue avec son liseré de gabarit, cadré sur le bas et le centre de la silhouette. */
function viewCell(g: Grid, label: string, want: [number, number], pal: Palette = boar.palette): Cell {
  const sil = silhouette(g);
  const t = `${sil.w}X${sil.h} (GABARIT ${want[0]}X${want[1]}) ECART`;
  return {
    w: Math.max(g[0].length * K, textWidth(label, 2), textWidth(t, 2)) + PAD, h: g.length * K + 30,
    draw: (s, x, top) => {
      blitGrid(s, g, pal, x, top, K);
      const cx = sil.x + sil.w / 2, bottom = sil.y + sil.h;
      s.outline(x + Math.round((cx - want[0] / 2) * K) - 1, top + (bottom - want[1]) * K - 1, want[0] * K + 2, want[1] * K + 2, YELLOW);
      s.text(label, x, top + g.length * K + 6, GREY, 2);
      const ok = Math.abs(sil.w - want[0]) <= 2 && Math.abs(sil.h - want[1]) <= 2;
      s.text(`${sil.w}X${sil.h} (GABARIT ${want[0]}X${want[1]}) ${ok ? 'OK' : 'ECART'}`, x, top + g.length * K + 18, ok ? GREY : RED, 2);
    },
  };
}

function rulerCell(): Cell {
  return {
    w: 20 * K + PAD + 40, h: 40,
    draw: (s, x, top) => {
      for (let i = 0; i < 20; i++) s.rect(x + i * K, top + 10, K, K, i % 4 < 2 ? WHITE : [40, 40, 40]);
      s.text('1 M = 20 PX', x, top + 22, WHITE, 2);
    },
  };
}

type Under = (s: Sheet, x: number, top: number, w: number, h: number, i: number) => void;
/** Les images d'une animation, numérotées, avec leur durée et la taille de leur silhouette. */
function animCell(frames: Grid[], ms: number[], label: string, o: { pal?: Palette; under?: Under; over?: Under; k?: number; size?: boolean } = {}): Cell {
  const k = o.k ?? K;
  const fw = frames[0][0].length, fh = frames[0].length;
  const gap = 3;
  const w = frames.length * (fw + gap) * k;
  return {
    w: Math.max(w, textWidth(label, 2)) + PAD, h: fh * k + 44,
    draw: (s, x, top) => {
      frames.forEach((g, i) => {
        const gx = x + i * (fw + gap) * k;
        s.rect(gx, top, fw * k, fh * k, CELL);
        const clip: Clip = [gx, top, fw * k, fh * k];
        o.under?.(s, gx, top, fw * k, fh * k, i);
        blitGrid(s, g, o.pal ?? boar.palette, gx, top, k, 1, clip);
        o.over?.(s, gx, top, fw * k, fh * k, i);
        s.text(`${i + 1}`, gx + 2, top + 2, WHITE, 2);
        s.text(`${ms[i]} MS`, gx, top + fh * k + 6, GREY, 2);
        if (o.size !== false) { const b = silhouette(g); s.text(`${b.w}X${b.h}`, gx, top + fh * k + 18, GREY, 2); }
      });
      s.text(label, x, top + fh * k + 30, GOLD, 2);
    },
  };
}

/** Le bas d'un gros arbre, son pied posé en (fx, fy) de la frame. */
const trunkAt = (fx: number, fy: number, k = K): Under => (s, x, top, w, h) =>
  blitPng(s, bigTree, x + (fx - 33) * k, top + (fy - 153) * k, k, [x, top, w, h]);

function layout(title: string, sub: string, rows: Row[]): Sheet {
  const width = Math.max(textWidth(title, 3) + 2 * PAD, ...rows.map((r) => Math.max(r.cells.reduce((a, c) => a + c.w, 0), textWidth(r.note ?? '', 2)) + 2 * PAD));
  const height = rows.reduce((a, r) => a + 24 + (r.note ? 12 : 0) + Math.max(...r.cells.map((c) => c.h)) + 18, 64);
  const s = new Sheet(width, height, BG);
  s.text(title, PAD, 12, GOLD, 3);
  s.text(sub, PAD, 34, GREY, 2);
  let y = 56;
  for (const r of rows) {
    s.text(r.title, PAD, y, WHITE, 2);
    if (r.note) s.text(r.note, PAD, y + 12, GREY, 2);
    y += 20 + (r.note ? 12 : 0);
    const h = Math.max(...r.cells.map((c) => c.h));
    let x = PAD;
    for (const c of r.cells) { c.draw(s, x, y + h - c.h); x += c.w; }
    y += h + 18;
    for (let i = PAD; i < s.w - PAD; i++) s.dot(i, y - 8, [96, 104, 92]);
  }
  return s;
}

// ---------------------------------------------------------------- scène x2 en bande (sprites posés sur un même sol)

/** Un sprite posé par ses pieds : grille, palette, la rangée et la colonne des pieds. */
interface Spr { g: Grid; pal: Palette; foot: number; fx?: number }
function strip2(sprites: Spr[], seed: number, gap = 8): Cell {
  const k = 2;
  const W = sprites.reduce((a, c) => a + c.g[0].length + gap, gap + 4);
  const above = Math.max(...sprites.map((c) => c.foot)) + 4;
  const below = Math.max(...sprites.map((c) => c.g.length - c.foot)) + 4;
  const H = above + below;
  return {
    w: W * k + PAD + 30, h: H * k + 10,
    draw: (s, x, top) => {
      forestFloor(s, x, top, W, H, k, seed);
      let cx = gap;
      for (const c of sprites) {
        blitGrid(s, c.g, c.pal, x + cx * k, top + (above - c.foot) * k, k, 1, [x, top, W * k, H * k]);
        cx += c.g[0].length + gap;
      }
      gloom(s, x, top, W * k, H * k);
      s.text('X2', x + W * k + 6, top + H * k - 12, GREY, 2);
    },
  };
}

const B = (g: Grid, foot = boar.FOOT): Spr => ({ g, pal: boar.palette, foot });
const BF = (g: Grid): Spr => ({ g, pal: boar.palette, foot: boar.FFOOT });
const X = (anim: string, i = 0): Spr => ({ g: xf(anim, i), pal: xeros.palette, foot: 46 });

// ---------------------------------------------------------------- planche 1 : les vues

/** Face et dos : le liseré jaune à 12 × 30 (l'affichage voulu), le gris au gabarit 8 × 30 (le corps physique). */
function wideCell(g: Grid, label: string): Cell {
  const sil = silhouette(g);
  const t1 = `${sil.w}X${sil.h} : ECART VOULU AU GABARIT 8X30`;
  const t2 = 'AFFICHAGE SEULEMENT (JAUNE 12X30 ; GRIS 8X30)';
  return {
    w: Math.max(g[0].length * K, textWidth(label, 2), textWidth(t1, 2), textWidth(t2, 2)) + PAD, h: g.length * K + 42,
    draw: (s, x, top) => {
      blitGrid(s, g, boar.palette, x, top, K);
      const cx = sil.x + sil.w / 2, bottom = sil.y + sil.h;
      s.outline(x + Math.round((cx - 6) * K) - 1, top + (bottom - 30) * K - 1, 12 * K + 2, 30 * K + 2, YELLOW);
      s.outline(x + Math.round((cx - 4) * K) - 1, top + (bottom - 30) * K - 1, 8 * K + 2, 30 * K + 2, GREY);
      s.text(label, x, top + g.length * K + 6, GREY, 2);
      s.text(t1, x, top + g.length * K + 18, sil.w === 12 && sil.h === 30 ? GREY : RED, 2);
      s.text(t2, x, top + g.length * K + 30, GREY, 2);
    },
  };
}

function sheetViews(): Sheet {
  const dv = boar.deadViews;
  const rows: Row[] = [
    {
      title: 'DEBOUT, A COTE DE XEROS (X4) ; PROFIL 28X20 AU GABARIT ; FACE ET DOS 12 X 30, ECART VOULU AU GABARIT 8 X 30, AFFICHAGE SEULEMENT',
      note: 'le corps physique reste de 40 cm de large ; face : la tete en coin, la joue grise, les defenses, la criniere au-dessus ; dos : epaules larges, croupe ronde, criniere qui deborde',
      cells: [
        xerosCell('idle-right', 'XEROS PROFIL'), viewCell(boar.stand, 'PROFIL (GAUCHE : MIROIR)', [28, 20]),
        xerosCell('idle-down', 'XEROS FACE'), wideCell(boar.front(), 'FACE'),
        xerosCell('idle-up', 'XEROS DOS'), wideCell(boar.back(), 'DOS'),
        rulerCell(),
      ],
    },
    {
      title: 'LE SANGLIER MORT AU SOL (L OBJET), SES QUATRE VUES : REGLE D, EST-OUEST 28 X 16, NORD-SUD 16 X 28',
      note: 'est : la derniere image de la mort de profil ; r1 tete au sud : la fin de la mort de face ; r3 tete au nord : la fin de la mort de dos',
      cells: [
        xerosCell('idle-down', 'XEROS'),
        viewCell(dv[0], 'EST (TETE A L EST)', [28, 16]),
        viewCell(dv[1], 'R1 (TETE AU SUD)', [16, 28]),
        viewCell(dv[2], 'R2 (TETE A L OUEST)', [28, 16]),
        viewCell(dv[3], 'R3 (TETE AU NORD)', [16, 28]),
      ],
    },
    {
      title: 'A LA TAILLE DU JEU (X2), EN FORET PROFONDE, SOUS LA PENOMBRE',
      cells: [strip2([
        X('idle-right'), B(boar.stand), X('idle-down'), BF(boar.front()), BF(boar.back()), X('idle-up'),
        { g: dv[0], pal: boar.palette, foot: dv[0].length - 1 }, { g: dv[1], pal: boar.palette, foot: dv[1].length - 1 },
        { g: dv[2], pal: boar.palette, foot: dv[2].length - 1 }, { g: dv[3], pal: boar.palette, foot: dv[3].length - 1 },
      ], 3)],
    },
  ];
  return layout('SANGLIER B+C : SES VUES (80 KG, 140 X 40 X 80 CM, 5 CM PAR PIXEL)', 'X4 AVEC LE LISERE DU GABARIT, PUIS A LA TAILLE DU JEU', rows);
}

// ---------------------------------------------------------------- planche 2 : les animations

function sheetAnims(): Sheet {
  const rows: Row[] = [];
  const dirName = { right: 'PROFIL', down: 'FACE', up: 'DOS' } as const;
  const dirs = ['right', 'down', 'up'] as const;
  const loopTag = (a: boar.Anim) => (a.loop ? ' (BOUCLE)' : '');
  const add = (name: string, set: Record<boar.Dir, boar.Anim>, extra: Partial<Record<boar.Dir, { under?: Under; over?: Under }>> = {}) => {
    rows.push({
      title: `${name} : ${set.right.note.toUpperCase()}`,
      cells: dirs.map((d) => animCell(set[d].frames, set[d].ms, `${name} ${dirName[d]}${loopTag(set[d])}`, extra[d] ?? {})),
    });
  };
  add('MARCHE', boar.walk);
  add('ANNONCE', boar.tell);
  add('CHARGE', boar.charge);
  const im = boar.impact;
  add('CHOC', im, {
    right: { under: trunkAt(im.right.trunk.x + 4, im.right.trunk.y) },
    down: { over: trunkAt(im.down.trunk.x + 6, im.down.trunk.y) },
    up: { under: trunkAt(im.up.trunk.x, im.up.trunk.y) },
  });
  add('SONNE', boar.dazed, { right: { under: trunkAt(im.right.trunk.x + 4, im.right.trunk.y) } });
  add('FOUILLE', boar.root);
  add('BAUGE', boar.bed);
  // le galop seul, en x2 sous la pénombre, image par image, pour juger les pattes à la taille du jeu
  rows.push({
    title: 'LE GALOP A LA TAILLE DU JEU (X2), SOUS LA PENOMBRE : LES QUATRE IMAGES, PUIS EN MIROIR',
    cells: [strip2([X('idle-right'), ...boar.charge.right.frames.map((g) => B(g)), ...boar.charge.right.frames.map((g) => B(flipX(g)))], 4, 4)],
  });
  const all = [boar.walk, boar.tell, boar.charge, boar.impact, boar.dazed, boar.root, boar.bed];
  rows.push({
    title: 'A LA TAILLE DU JEU (X2) : DE PROFIL CHAQUE ANIMATION A LA SUITE (MARCHE, ANNONCE, CHARGE, CHOC, SONNE, FOUILLE, BAUGE)',
    cells: [strip2([X('idle-right'), ...all.flatMap((a) => a.right.frames.map((g) => B(g)))], 5, 2)],
  });
  rows.push({
    title: 'DE FACE PUIS DE DOS, A LA SUITE',
    cells: [strip2([X('idle-down'), ...all.flatMap((a) => a.down.frames.map(BF)), X('idle-up'), ...all.flatMap((a) => a.up.frames.map(BF))], 6, 1)],
  });
  return layout('SANGLIER B+C : LES ANIMATIONS (X4)', 'CHAQUE IMAGE NUMEROTEE, SA DUREE EN MS ET SA SILHOUETTE ; LA GAUCHE EST LE MIROIR DU PROFIL ; LE CHOC FRAPPE LE BAS D UN GROS ARBRE', rows);
}

// ---------------------------------------------------------------- planche 3 : la mort et le couché

function sheetDeath(): Sheet {
  const d = boar.death;
  const rows: Row[] = [
    {
      title: `DE PROFIL : ${d.right.note.toUpperCase()}`,
      note: 'pattes en biais vers le haut ; tete a l endroit, oeil ferme, groin clair ; image 4 = la vue est du mort au sol',
      cells: [animCell(d.right.frames, d.right.ms, 'MORT PROFIL (GAUCHE : MIROIR)'), animCell(boar.bed.right.frames, boar.bed.right.ms, 'BAUGE PROFIL (BOUCLE)')],
    },
    {
      title: `DE FACE : ${d.down.note.toUpperCase()}`,
      cells: [animCell(d.down.frames, d.down.ms, 'MORT FACE'), animCell(boar.bed.down.frames, boar.bed.down.ms, 'BAUGE FACE (BOUCLE)')],
    },
    {
      title: `DE DOS : ${d.up.note.toUpperCase()}`,
      cells: [animCell(d.up.frames, d.up.ms, 'MORT DOS'), animCell(boar.bed.up.frames, boar.bed.up.ms, 'BAUGE DOS (BOUCLE)')],
    },
    {
      title: 'A LA TAILLE DU JEU (X2), SOUS LA PENOMBRE : CHAQUE MORT A LA SUITE, PUIS DEBOUT, BAUGE ET MORT COTE A COTE',
      cells: [strip2([
        X('idle-right'), ...d.right.frames.map((g) => B(g)), ...d.down.frames.map(BF), ...d.up.frames.map(BF),
        B(boar.stand), B(boar.bed.right.frames[0]), B(d.right.frames[3]),
      ], 9, 3)],
    },
  ];
  return layout('SANGLIER B+C : LA MORT ET LE COUCHE A LA BAUGE', 'X4 PUIS X2 ; CHAQUE IMAGE NUMEROTEE, SA DUREE EN MS ET SA SILHOUETTE', rows);
}

// ---------------------------------------------------------------- planche 4 : Xéros renversé

function sheetKnock(): Sheet {
  const kd = down.knockdown;
  const name = { right: 'PROFIL (GAUCHE : MIROIR)', down: 'DE FACE', up: 'DE DOS' } as const;
  const rows: Row[] = (['right', 'down', 'up'] as const).map((d) => ({
    title: `${name[d]} : ${kd[d].note.toUpperCase()}`,
    cells: [animCell(kd[d].frames, kd[d].ms, `RENVERSE ${d === 'right' ? 'PROFIL' : d === 'down' ? 'FACE' : 'DOS'}`, { pal: down.palette, k: 3, size: false })],
  }));
  const lanes = [0, 1, 2, 3, 4, 5, 6, 7];
  const k = 2, LH = 36, W = 64 + 60, H = lanes.length * LH + 6;
  const slide: Cell = {
    w: W * k + 260, h: H * k + 10,
    draw: (s, x, top) => {
      const a = kd.right;
      forestFloor(s, x, top, W, H, k, 21);
      lanes.forEach((i, n) => {
        const ox = 55 - a.slide[i];
        blitGrid(s, a.frames[i], down.palette, x + ox * k, top + (n * LH - 12) * k, k, 1, [x, top, W * k, H * k]);
      });
      gloom(s, x, top, W * k, H * k);
      for (let j = 0; j < H * k; j += 6) { s.rect(x + (55 + 32) * k, top + j, 2, 3, LINE); s.rect(x + (55 + 32 - 50) * k, top + j, 2, 3, LINE); }
      lanes.forEach((i, n) => s.text(`${i + 1}  ${a.ms[i]} MS  ${a.slide[i]} PX`, x + W * k + 10, top + (n * LH + 20) * k, GREY, 2));
    },
  };
  rows.push({ title: 'LA GLISSADE DE PROFIL (X2) : UNE IMAGE PAR LIGNE, A SA PLACE ; LE JEU POUSSE XEROS DE 50 PX (2,5 M) VERS L OUEST PENDANT LES IMAGES 2 A 4', note: 'traits : ou il etait debout, ou il s arrete', cells: [slide] });
  return layout('XEROS RENVERSE PAR LA CHARGE, ESSAI 2 (PROPOSITION, HORS JEU)', 'FRAME 64 X 48, LES PIEDS DEBOUT EN (32, 45) ; X3 ; LES PIECES ET COULEURS DE XEROS (ART/CHARACTERS/XEROS-BODY.TS)', rows);
}

// ---------------------------------------------------------------- planche 5 : la scène

const SW = 440, SH = 200, SK = 2;
type Thing = { y: number; draw: (s: Sheet, ox: number, oy: number, clip: Clip) => void };

function sheetScene(): Sheet {
  const W = SW * SK + 2 * PAD, Hh = SH * SK + 110;
  const s = new Sheet(W, Hh, [30, 34, 30]);
  s.text('LA FORET PROFONDE, A LA TAILLE DU JEU (X2), SOUS SA PENOMBRE : LE SANGLIER B+C', PAD, 10, GOLD, 2);
  s.text('1 LA CHARGE RENVERSE XEROS (FANTOME : D OU PART LA BETE) ; 2 SONNE AU PIED DU TRONC ; 3 BAUGE ; 4 MORT', PAD, 26, GREY, 2);
  const ox = PAD, oy = 46;
  const clip: Clip = [ox, oy, SW * SK, SH * SK];
  forestFloor(s, ox, oy, SW, SH, SK, 11);
  const tree = (img: Img, foot: [number, number], fx: number, fy: number): Thing => ({
    y: fy, draw: (sh, x, y, c) => blitPng(sh, img, x + (fx - foot[0]) * SK, y + (fy - foot[1]) * SK, SK, c),
  });
  const spr = (g: Grid, pal: Palette, anchor: [number, number], fx: number, fy: number, alpha = 1): Thing => ({
    y: fy, draw: (sh, x, y, c) => blitGrid(sh, g, pal, x + (fx - anchor[0]) * SK, y + (fy - anchor[1]) * SK, SK, alpha, c),
  });
  const BA: [number, number] = [boar.SIDE.ox + 13, boar.FOOT];
  const BAL: [number, number] = [boar.SIDE.w - 1 - (boar.SIDE.ox + 13), boar.FOOT];
  const KA: [number, number] = [32, 45];
  const things: Thing[] = [
    tree(normalTree, [24, 161], 30, 40),
    tree(bigTree, [33, 153], 205, 120),
    tree(normalTree, [24, 161], 300, 60),
    tree(bigTree, [33, 153], 120, 30),
    tree(normalTree, [24, 161], 330, 195),
    tree(bigTree, [33, 153], 410, 110),
    tree(normalTree, [24, 161], 380, 30),
    tree(bush, [16, 28], 250, 168), tree(bush, [16, 28], 272, 172),
    tree(bush, [16, 28], 15, 175),
  ];
  // 1 la charge : le sanglier (vers l'ouest, miroir) fonce ; Xéros (tourné vers l'est) est percuté et part vers l'ouest
  things.push(spr(flipX(boar.stand), boar.palette, BAL, 150, 150, 0.3));
  things.push(spr(flipX(boar.charge.right.frames[0]), boar.palette, BAL, 92, 150));
  things.push(spr(down.knockdown.right.frames[0], down.palette, KA, 70, 150));
  things.push(spr(down.knockdown.right.frames[4], down.palette, KA, 22, 150, 0.45));
  // 2 sonné au pied du gros arbre
  things.push(spr(boar.dazed.right.frames[1], boar.palette, BA, 181, 121));
  // 3 couché à la bauge, entre les buissons
  things.push(spr(boar.bed.right.frames[0], boar.palette, BA, 262, 176));
  // 4 un mort, plus loin
  things.push(spr(boar.dead, boar.palette, BA, 235, 62));
  things.sort((a, b) => a.y - b.y).forEach((t) => t.draw(s, ox, oy, clip));
  gloom(s, ox, oy, SW * SK, SH * SK);
  for (let x = 82; x <= 140; x++) if (Math.floor(x / 3) % 2 === 0) s.rect(ox + x * SK, oy + 152 * SK, SK, SK, LINE);
  const labels: [string, number, number][] = [['1 LA CHARGE', 60, 108], ['2 SONNE', 160, 92], ['3 LA BAUGE', 240, 186], ['4 MORT', 225, 70]];
  for (const [t, x, y] of labels) s.text(t, ox + x * SK, oy + y * SK, WHITE, 2);
  s.text('LA ROBE ECLAIRCIE SE LIT SOUS LA PENOMBRE ; LE LISERE DU DOS, LE GROIN CLAIR ET LA DEFENSE BLANCHE EN PLUS', PAD, oy + SH * SK + 12, GREY, 2);
  s.text('XEROS EN TRANSPARENCE : OU LA GLISSADE LE POSE (IMAGE 4) ; LA PENOMBRE EST CELLE DU JEU (GLOOM DE WORLD.JSON)', PAD, oy + SH * SK + 26, GREY, 2);
  return s;
}

// ---------------------------------------------------------------- sortie

function report() {
  const m = (g: Grid) => { const b = silhouette(g); return `${b.w}x${b.h}`; };
  console.log(`profil ${m(boar.stand)} ; face ${m(boar.front())} ; dos ${m(boar.back())}`);
  console.log(`charge ${boar.charge.right.frames.map(m).join(' ')} ; bauge ${m(boar.bed.right.frames[0])}`);
  for (const d of ['right', 'down', 'up'] as const) console.log(`mort ${d} ${boar.death[d].frames.map(m).join(' ')}`);
  console.log(`mort au sol ${boar.deadViews.map(m).join(' ')}`);
}

mkdirSync(OUT, { recursive: true });
const out: [string, Sheet][] = [
  ['sangliers-bc-vues.png', sheetViews()],
  ['sangliers-bc-animations.png', sheetAnims()],
  ['sangliers-bc-mort.png', sheetDeath()],
  ['sangliers-xeros-renverse-2.png', sheetKnock()],
  ['sangliers-bc-scene.png', sheetScene()],
];
for (const [name, sh] of out) writeFileSync(join(OUT, name), PNG.sync.write(sh.png));
report();
console.log(`essai-sangliers-bc -> ${out.map(([n]) => join(OUT, n)).join(', ')}`);
