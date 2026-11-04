// Planches du troisième essai du chemin creux (chantier « relief », hors jeu) : npx tsx tools/essai-relief-creux3.ts écrit
//   .art-preview/relief-creux3-1-ensemble.png   la vue d'ensemble et le plan des hauteurs ;
//   .art-preview/relief-creux3-2-entree.png     l'entrée côté ferme ;
//   .art-preview/relief-creux3-3-avant.png      Xéros dans le couloir avant la rivière (le bord sud s'efface) ;
//   .art-preview/relief-creux3-4-coupure.png    Xéros à la coupure de l'eau ;
//   .art-preview/relief-creux3-5-sortie.png     la sortie sur le plateau.
// Chaque vue est l'écran de départ (427 × 240 px), x2, avec un détail x4 autour de Xéros. Le tracé suit le chemin d'aujourd'hui
// (rangées 65-66 de la ferme). Scène : art/proposals/relief-creux3-scene.ts ; matières : relief-creux.ts, relief-creux3.ts.
// Les arbres, buissons et fougères sont ceux du jeu (src/generated/, lus sans y toucher), Xéros aussi.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { world } from '../art/palette';
import { hood } from '../art/proposals/relief-creux3';
import {
  COLS, H, OY, RAKE, ROW0, SH, T, TOP, W, XC, XE, XR, XT, Z, axisY, floorZ, heightOf, plants, render, terrain, wallZ, xerosAt,
  type Placed, type Pose, type Rendered,
} from '../art/proposals/relief-creux3-scene';
import { Sheet, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: Rgb = [40, 44, 36];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [215, 215, 200];
const GOLD: Rgb = [245, 215, 120];
/** Ce qui s'efface au-dessus de Xéros (le bord sud, ses feuillages) : l'opacité qui reste. */
const FADE = 0.2;
/** Pénombre du couloir au plus profond (GLOOM.color de src/config.ts). */
const GLOOM_MAX = 0.3;
const GLOOM: Rgb = [0x0b, 0x16, 0x11];
const SHADOW: Rgb = [0x2b, 0x1a, 0x10];
const SHADOW_A = 0x40 / 255;
const VW = 427;
const VH = 240;

interface Img { w: number; h: number; rgba: Uint8Array; footX: number; footY: number }

function fromGrid(grid: Grid, palette: Palette, footX: number, footY: number): Img {
  const h = grid.length;
  const w = grid[0].length;
  const rgba = new Uint8Array(w * h * 4);
  grid.forEach((line, y) => [...line].forEach((ch, x) => {
    if (ch === '.') return;
    const hex = palette[ch].replace('#', '');
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    rgba.set([n(0), n(2), n(4), hex.length === 8 ? n(6) : 255], (y * w + x) * 4);
  }));
  return { w, h, rgba, footX, footY };
}

const FEET: Record<string, [number, number]> = {
  'big-tree': [33, 153], 'normal-tree': [24, 161], bush: [16, 28], 'bush-berries': [16, 28], 'decal-fern': [16, 16], 'decal-tufts': [16, 16],
};
const images = new Map<string, Img>();
function imageOf(key: string): Img {
  if (images.has(key)) return images.get(key)!;
  let img: Img;
  if (key.startsWith('xeros-')) img = fromGrid(xeros.animations[`idle-${key.slice(6)}`].frames[0], xeros.palette, 16, 45);
  else if (key.startsWith('hood:')) {
    const [, seed, w, h, body] = key.split(':').map(Number);
    img = fromGrid(hood(w, h, body, seed).toGrid(), world, Math.floor(w / 2), h - 1);
  } else {
    const file = join(ROOT, 'src', 'generated', `${key}.png`);
    if (!existsSync(file)) throw new Error(`essai-relief-creux3 : ${file} manque (lancer npm run art)`);
    const png = PNG.sync.read(readFileSync(file));
    const [fx, fy] = FEET[key] ?? [Math.floor(png.width / 2), png.height - 1];
    img = { w: png.width, h: png.height, rgba: new Uint8Array(png.data), footX: fx, footY: fy };
  }
  images.set(key, img);
  return img;
}

const hexRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const PAL = new Map(Object.entries(world).map(([k, v]) => [k, hexRgb(v)]));

const full = terrain(false);
const cut = terrain(true);
const fullR = render(full);
const cutR = render(cut);
const THINGS = plants(full);

interface Layer { sheet: Sheet; veil: Uint8Array }

/**
 * L'ombre des capuchons de feuillage sur le couloir, colonne par colonne (en plus de la pénombre) : forte sous le rideau de
 * l'entrée (la bouche sombre vue de la ferme), légère sous les autres.
 */
const HOOD_SHADE = new Float32Array(W);
for (const p of THINGS) {
  if (!p.key.startsWith('hood:')) continue;
  const w = Number(p.key.split(':')[2]);
  const strong = p.x > 1740;
  for (let x = Math.round(p.x - w / 2 + 8); x < p.x + w / 2 - 8; x++) {
    if (x < 0 || x >= W) continue;
    const edge = Math.min(x - (p.x - w / 2 + 8), p.x + w / 2 - 8 - x);
    HOOD_SHADE[x] = Math.max(HOOD_SHADE[x], (strong ? 0.42 : 0.14) * Math.min(1, edge / 20));
  }
}

/** Une composition : le terrain rendu, son ombre, ce qui est posé (devant ou derrière au pixel près), la pénombre. */
function compose(r: Rendered, xs: Placed[], fadeOn: boolean): Layer {
  const s = new Sheet(W, SH, BG);
  for (let y = 0; y < SH; y++) for (let x = 0; x < W; x++) {
    const ch = r.grid[y][x];
    if (ch !== '.') s.dot(x, y, PAL.get(ch) ?? [255, 0, 255]);
  }
  for (let i = 0; i < W * SH; i++) if (r.shadow[i]) s.dot(i % W, Math.floor(i / W), SHADOW, SHADOW_A);
  const veg = new Uint8Array(W * SH);
  const gl = Float32Array.from(r.gloom);
  const veil = new Uint8Array(W * SH * 4);
  const xRects = xs.map((p) => ({ x0: p.x - 7, x1: p.x + 7, y0: p.y - p.z + OY - 33, y1: p.y - p.z + OY, foot: p.y }));
  for (const p of [...THINGS, ...xs].sort((a, b) => a.y - b.y || a.z - b.z)) {
    const img = imageOf(p.key);
    const isX = p.key.startsWith('xeros');
    const sx0 = Math.round(p.x) - img.footX;
    const sy0 = Math.round(p.y) - p.z + OY - img.footY + (p.hang ?? 0);
    const lx = p.lx ?? 0;
    const ly = p.ly ?? 0;
    const faded = fadeOn && p.vault && xRects.some((q) => q.foot < p.y && q.x1 > sx0 + Math.min(0, lx) && q.x0 < sx0 + img.w + Math.max(0, lx) && q.y1 > sy0 && q.y0 < sy0 + img.h + Math.max(0, ly));
    const xg = isX ? Math.max(0, wallZ(p.x) - floorZ(p.x)) / TOP : 0;
    for (let j = 0; j < img.h; j++) {
      const f = img.footY ? (Math.max(0, img.footY - j) / img.footY) ** 1.6 : 0;
      const ox = Math.round(lx * f);
      const oy = Math.round(ly * f);
      for (let i = 0; i < img.w; i++) {
        const o = (j * img.w + i) * 4;
        const a = img.rgba[o + 3];
        if (!a) continue;
        const x = sx0 + i + ox;
        const y = sy0 + j + oy;
        if (x < 0 || y < 0 || x >= W || y >= SH) continue;
        const k = y * W + x;
        if (!p.hang && r.dep[k] > p.y) continue;
        if (faded) {
          if (a === 255) veil.set([img.rgba[o], img.rgba[o + 1], img.rgba[o + 2], 255], k * 4);
          continue;
        }
        s.dot(x, y, [img.rgba[o], img.rgba[o + 1], img.rgba[o + 2]], a / 255);
        if (a === 255) { veg[k] = isX ? 2 : 1; gl[k] = isX ? (p.x >= XC && p.x < XR ? 0.35 : xg) : 0; }
      }
    }
  }
  for (let k = 0; k < W * SH; k++) {
    if (veg[k] === 1 || gl[k] <= 0) continue;
    const x = k % W;
    // Xéros reste net : la pénombre seule, sans l'ombre des feuillages
    s.dot(x, Math.floor(k / W), GLOOM, Math.min(0.7, GLOOM_MAX * Math.sqrt(gl[k]) + (veg[k] === 2 ? 0 : HOOD_SHADE[x])));
  }
  return { sheet: s, veil };
}

/**
 * La scène avec Xéros. S'il est dans le couloir, le bord sud s'efface comme un toit : là où le bord sud (rendu complet) cache ce
 * qui est derrière lui (rendu sans le bord sud : le sol, la paroi nord, Xéros), il ne reste que FADE de lui ; ses feuillages
 * s'effacent aussi.
 */
function shot(poses: Pose[]): Sheet {
  const xs = poses.map((p) => xerosAt(full, p));
  // le bord sud s'efface par tronçon, comme un toit : celui du plateau ou celui de la ferme, selon où est Xéros ; sur l'eau, rien
  // ne le cache, rien ne s'efface
  const inside = xs.some((p) => p.x < XE - 30 && (p.x < XC || p.x >= XR) && full.zone[p.y * W + p.x] === Z.FLOOR);
  const piece = (x: number) => xs.some((p) => (p.x < XC ? x < XC + RAKE : x >= XR - RAKE));
  const a = compose(fullR, xs, inside);
  if (inside) {
    const b = compose(cutR, xs, true);
    for (let k = 0; k < W * SH; k++) {
      const behind = cutR.zone[k] === Z.FLOOR || cutR.zone[k] === Z.NBANK;
      if (!(fullR.dep[k] > cutR.dep[k] + 1 && behind && piece(k % W))) continue;
      const o = k * 4;
      const c: Rgb = [b.sheet.png.data[o], b.sheet.png.data[o + 1], b.sheet.png.data[o + 2]];
      a.sheet.dot(k % W, Math.floor(k / W), c, 1 - FADE);
    }
  }
  for (let k = 0; k < W * SH; k++) if (a.veil[k * 4 + 3]) a.sheet.dot(k % W, Math.floor(k / W), [a.veil[k * 4], a.veil[k * 4 + 1], a.veil[k * 4 + 2]], FADE);
  return a.sheet;
}

function copy(src: Sheet, sx: number, sy: number, w: number, h: number, dst: Sheet, dx: number, dy: number, k: number) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ax = sx + x;
    const ay = sy + y;
    let c: Rgb = BG;
    if (ax >= 0 && ay >= 0 && ax < src.w && ay < src.h) { const i = (ay * src.w + ax) * 4; c = [src.png.data[i], src.png.data[i + 1], src.png.data[i + 2]]; }
    dst.rect(dx + x * k, dy + y * k, k, k, c);
  }
}

const save = (sheet: Sheet, name: string) => {
  const out = join(ROOT, '.art-preview', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-relief-creux3 -> ${out} (${sheet.w} x ${sheet.h})`);
};

const m = (px: number) => String(Math.round((px / 20) * 10) / 10).replace('.', ',');
const caseOf = (x: number) => String(Math.round((x / T) * 10) / 10).replace('.', ',');

// ---------- les vues ----------

interface View { file: string; title: string; pose: Pose; dx: number; dy: number; ddx: number; ddy: number; notes: string[] }

const DW = 212;
const DH = 106;
const VIEWS: View[] = [
  {
    file: 'relief-creux3-2-entree.png', title: '2 - l entree cote ferme', pose: { key: 'xeros-left', x: 1990, label: '' }, dx: -180, dy: -40, ddx: -170, ddy: -20,
    notes: [
      `xeros sur le chemin de la ferme (case ${caseOf(1990)}, 0 m), face a l entree (case 60)`,
      'les talus plantes montent de 0 a 5 m en 21 m ; le rideau de feuillage deborde sur eux, ses lianes pendent devant la bouche',
      'le bord sud monte et cache le sol : on ne voit plus que la paroi nord, sombre, sous la voute',
    ],
  },
  {
    file: 'relief-creux3-3-avant.png', title: '3 - dans le couloir, avant la riviere', pose: { key: 'xeros-left', x: 1600, label: '' }, dx: 0, dy: -10, ddx: 0, ddy: 10,
    notes: [
      `xeros case ${caseOf(1600)} : sol a 0 m, talus de ${m(wallZ(1600))} m`,
      `il est dans le couloir : le bord sud et ses feuillages s effacent comme un toit (il en reste ${FADE}), on le voit sur le sol clair`,
      `penombre du couloir : ${GLOOM_MAX} au plus profond (couleur de gloom)`,
    ],
  },
  {
    file: 'relief-creux3-4-coupure.png', title: '4 - a la coupure de l eau', pose: { key: 'xeros-left', x: 1430, label: '' }, dx: 0, dy: -20, ddx: 0, ddy: 10,
    notes: [
      'xeros au milieu de la riviere, sur le sol sec (0 m) : l eau s arrete net des deux cotes, liseres et miroitement',
      'a ciel ouvert : pas de parois sur l eau, les arbres des deux rives se penchent et ferment la voute',
      'la falaise : sa face est en raccourci (bande sombre de 12 px pour 5 m), le lierre pend sur l eau',
    ],
  },
  {
    file: 'relief-creux3-5-sortie.png', title: '5 - la sortie sur le plateau', pose: { key: 'xeros-left', x: 236, label: '' }, dx: 70, dy: 30, ddx: 40, ddy: 20,
    notes: [
      `xeros case ${caseOf(236)} : sol a ${m(floorZ(236))} m, parois de ${m(TOP - floorZ(236))} m`,
      'le sol clair se fond dans le sentier du plateau ; foret plus claire autour de la sortie',
    ],
  },
];

const K = 2;
const PAD = 24;
for (const v of VIEWS) {
  const s = shot([v.pose]);
  const xp = xerosAt(full, v.pose);
  const sx = xp.x;
  const sy = xp.y - xp.z + OY;
  const top = 70;
  const detailTop = top + VH * K + 20;
  const notesTop = detailTop + DH * 4 + 16;
  const sheet = new Sheet(PAD * 2 + Math.max(VW * K, DW * 4), notesTop + v.notes.length * 16 + 30, BG);
  sheet.text(v.title, PAD, 16, GOLD, 4);
  sheet.text('ecran de depart 427 X 240 PX (21 X 12 M), X2 ; dessous, detail X4 autour de xeros', PAD, 46, GREY, 2);
  copy(s, Math.round(sx + v.dx - VW / 2), Math.round(sy + v.dy - VH / 2), VW, VH, sheet, PAD, top, K);
  copy(s, Math.round(sx + v.ddx - DW / 2), Math.round(sy + v.ddy - DH * 0.7), DW, DH, sheet, PAD, detailTop, 4);
  v.notes.forEach((l, i) => sheet.text(l, PAD, notesTop + i * 16, GREY, 2));
  save(sheet, v.file);
}

// ---------- la vue d'ensemble ----------

{
  const s = shot([]);
  const planK = 2; // le plan : 1 px pour 2 px du monde (10 cm)
  const PW = Math.ceil(W / planK);
  const PH = Math.ceil(H / planK);
  const top = 80;
  const CROP = OY;
  const planTop = top + H - CROP + 40;
  const legend = [
    `le couloir suit le chemin d aujourd hui (rangees 65-66). cote ferme, cases 60 -> 47 (${m(XE - XR)} m) : sol a 0 m, talus plantes de 0 a 5 m.`,
    `riviere, cases 47 -> 42 (${m(XR - XC)} m) : sol a 0 m, l eau coupee net, a ciel ouvert sous les arbres penches. plateau, cases 42 -> 4,5`,
    `(${m(XC - XT)} m) : le sol monte de 0 a 5 m (8,3 %), les parois baissent de 5 m a 0. en tout ${m(XE - XT)} m ; sol de 2,5 m qui ondule.`,
    'de loin, le bord sud cache le sol : on voit la paroi nord (face au sud, vraie grandeur) et les feuillages. la falaise et le bout du',
    'talus de la ferme sont montres en raccourci (bande sombre de 12 px pour 5 m, lierre sur l eau). en bas : le plan des hauteurs.',
  ];
  const sheet = new Sheet(PAD * 2 + W, planTop + PH + 40 + legend.length * 16 + 30, BG);
  sheet.text('1 - vue d ensemble (x1)', PAD, 16, GOLD, 4);
  sheet.text(`cases 0 a ${COLS - 1}, rangees ${ROW0} a ${ROW0 + H / T - 1} de la ferme (${m(W)} X ${m(H)} M) ; cadres : les quatre vues`, PAD, 52, GREY, 2);
  copy(s, 0, CROP, W, H - CROP, sheet, PAD, top, 1);
  VIEWS.forEach((v, n) => {
    const xp = xerosAt(full, v.pose);
    const x0 = PAD + Math.round(xp.x + v.dx - VW / 2);
    const y0 = top - CROP + Math.round(xp.y - xp.z + OY + v.dy - VH / 2);
    sheet.outline(x0, y0, VW, VH, GOLD);
    sheet.outline(x0 + 1, y0 + 1, VW - 2, VH - 2, GOLD);
    sheet.text(String(n + 2), x0 + 6, y0 + 6, GOLD, 3);

  });
  // le plan des hauteurs : le sol, les parois, l'eau ; les cotes
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
    const x = px * planK;
    const y = py * planK;
    const k = y * W + x;
    const z = full.zone[k];
    const h = full.h[k];
    const g = Math.round(60 + (h / TOP) * 70);
    let c: Rgb = [g, g + 20, g - 10];
    if (z === Z.RIVER) c = [70, 110, 140];
    else if (z === Z.FLOOR) { const f = Math.round(170 + (h / TOP) * 70); c = [f, f - 8, f - 30]; }
    else if (z === Z.NBANK || z === Z.SBANK) c = [90 - Math.round(h / 4), 60, 45];
    else if (z === Z.BERM) c = [70, Math.round(80 + h / 2), 50];
    else if (z === Z.PATH || z === Z.TRAIL) c = [170, 135, 90];
    const hn = (a: number, b: number) => Math.floor(heightOf(full, a, b) / 20);
    if (hn(x + planK, y) !== hn(x, y) || hn(x, y + planK) !== hn(x, y)) c = [30, 30, 30];
    sheet.dot(PAD + px, planTop + py, c);
  }
  for (let c = 0; c <= COLS; c += 5) sheet.text(String(c), PAD + (c * T) / planK, planTop + PH + 6, GREY, 2);
  const cotes: [number, string][] = [
    [XE, 'case 60 : sol 0, talus 0'], [1700, `talus ${m(wallZ(1700))} m`], [XR, 'case 47 : talus 5 m'], [XC, 'case 42 : sol 0, falaise 5 m'],
    [XC - 300, `sol ${m(floorZ(XC - 300))} m, parois ${m(TOP - floorZ(XC - 300))} m`], [XC - 600, `sol ${m(floorZ(XC - 600))} m`],
    [XC - 900, `sol ${m(floorZ(XC - 900))} m`], [XT, 'case 4,5 : sol 5 m'],
  ];
  cotes.forEach(([x, label], i) => {
    const px = PAD + Math.round(x / planK);
    const py = planTop + Math.round(axisY(x) / planK);
    sheet.rect(px - 1, py - 1, 3, 3, [230, 60, 40]);
    const ly = [12, PH - 28, 34, PH - 50][i % 4];
    sheet.text(label, px - 10, planTop + ly, WHITE, 2);
    const [ya, yb] = ly < PH / 2 ? [ly + 12, py - planTop - 2] : [py - planTop + 4, ly - 2];
    for (let yy = ya; yy < yb; yy += 2) sheet.dot(px, planTop + yy, WHITE);
  });
  sheet.text('plan des hauteurs : 1 px = 10 cm, courbes tous les 1 m ; sol clair, parois brunes, talus de la ferme verts', PAD, planTop - 18, GOLD, 2);
  legend.forEach((l, i) => sheet.text(l, PAD, planTop + PH + 40 + i * 16, GREY, 2));
  save(sheet, 'relief-creux3-1-ensemble.png');
}
