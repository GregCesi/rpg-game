// Planches du chemin creux (chantier « relief », essai hors jeu) : npx tsx tools/essai-relief-creux.ts écrit
//   .art-preview/relief-creux-1-ensemble.png  la vue d'ensemble (x1) et le plan des hauteurs ;
//   .art-preview/relief-creux-2-entree.png    l'entrée vue de la ferme ;
//   .art-preview/relief-creux-3-couloir.png   à mi-pente, dans le couloir ;
//   .art-preview/relief-creux-4-sortie.png    la sortie sur le plateau.
// Chaque vue de jeu est cadrée sur l'écran par défaut (427 × 240 px, ≈ 21 × 12 m), montrée x2, trois variantes côte à côte
// (V1, V2, V3), chacune avec son détail x4 autour de Xéros. La scène : art/proposals/relief-creux-scene.ts (un seul modèle de
// hauteur) ; les matières : art/proposals/relief-creux.ts. Les arbres, buissons et fougères sont ceux du jeu (src/generated/,
// lus sans y toucher), Xéros aussi (art/characters/xeros.ts). Ne touche ni au jeu ni à src/generated/.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { world } from '../art/palette';
import { foliageMass } from '../art/proposals/relief-creux';
import {
  L, OY, depthAt, SH, TOP, VARIANTS, W, X_NORTH, X_SOUTH, Y_DRY1, Y_FACE, Z, axisAt, heightOf, plants, render, terrain, vault,
  xerosAt, type Placed, type Pose, type Terrain, type Variant,
} from '../art/proposals/relief-creux-scene';
import { Sheet, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: Rgb = [40, 44, 36];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [215, 215, 200];
const GOLD: Rgb = [245, 215, 120];
/** ROOF.alpha (src/config.ts) : l'opacité d'un toit quand Xéros est dessous. */
const VAULT_ALPHA = 0.35;
/** GLOOM.color (src/config.ts), et SHADOW (couleur, opacité). */
const GLOOM: Rgb = [0x0b, 0x16, 0x11];
const SHADOW: Rgb = [0x2b, 0x1a, 0x10];
const SHADOW_A = 0x40 / 255;
/** L'écran par défaut (palier 3 du zoom : 21,3 × 12 m). */
const VW = 427;
const VH = 240;

// ---------- les images ----------

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

/** Le pied de chaque image du jeu dans son image (props.json : `tree.foot`, le bas du `body`). */
const FEET: Record<string, [number, number]> = {
  'big-tree': [33, 153], 'normal-tree': [24, 161], bush: [16, 28], 'bush-berries': [16, 28], 'decal-fern': [16, 16], 'decal-moss': [16, 16], 'decal-tufts': [16, 16],
};

const images = new Map<string, Img>();
function imageOf(key: string): Img {
  if (images.has(key)) return images.get(key)!;
  let img: Img;
  if (key.startsWith('xeros-')) {
    img = fromGrid(xeros.animations[`idle-${key.slice(6)}`].frames[0], xeros.palette, 16, 45);
  } else if (key.startsWith('mass:')) {
    const [, seed, w, h] = key.split(':').map(Number);
    const g = foliageMass(w, h, seed, 7).toGrid();
    img = fromGrid(g, world, Math.floor(w / 2), h - 1);
  } else {
    const file = join(ROOT, 'src', 'generated', `${key}.png`);
    if (!existsSync(file)) throw new Error(`essai-relief-creux : ${file} manque (lancer npm run art)`);
    const png = PNG.sync.read(readFileSync(file));
    const [fx, fy] = FEET[key] ?? [Math.floor(png.width / 2), png.height - 1];
    img = { w: png.width, h: png.height, rgba: new Uint8Array(png.data), footX: fx, footY: fy };
  }
  images.set(key, img);
  return img;
}

// ---------- la composition ----------

const hexRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const PAL = new Map(Object.entries(world).map(([k, v]) => [k, hexRgb(v)]));

interface Shot { sheet: Sheet; xeros: Placed[] }

/** La scène entière (W × SH) d'une variante, avec Xéros aux poses données. */
function compose(t: Terrain, poses: Pose[]): Shot {
  const v = t.variant;
  const r = render(t);
  const s = new Sheet(W, SH, BG);
  for (let y = 0; y < SH; y++) for (let x = 0; x < W; x++) {
    const ch = r.grid[y][x];
    if (ch === '.') continue;
    s.dot(x, y, PAL.get(ch) ?? [255, 0, 255]);
  }
  for (let i = 0; i < W * SH; i++) if (r.shadow[i]) s.dot(i % W, Math.floor(i / W), SHADOW, SHADOW_A);
  // 0 : le terrain ; 1 : Xéros ; 2 : la végétation (au-dessus de la pénombre)
  const top = new Uint8Array(W * SH);
  // ce qui s'efface au-dessus de Xéros se peint à part, opaque, puis se pose d'un seul voile (comme un toit : ROOF.alpha)
  const veil = new Uint8Array(W * SH * 4);
  const gloomDepth = Float32Array.from(r.depth);
  const xs = poses.map((p) => xerosAt(t, p));
  const things = [...plants(t), ...vault(t), ...xs].sort((a, b) => a.y - b.y || a.z - b.z);
  const xRects = xs.map((p) => ({ x0: p.x - 6, x1: p.x + 6, y0: p.y - p.z + OY - 32, y1: p.y - p.z + OY, foot: p.y }));
  for (const p of things) {
    const img = imageOf(p.key);
    const isX = p.key.startsWith('xeros');
    const sx0 = p.x - img.footX;
    const sy0 = p.y - p.z + OY - img.footY + (p.hang ?? 0);
    const sx1 = sx0 + img.w;
    const sy1 = sy0 + img.h;
    const faded = p.vault && xRects.some((q) => q.foot < p.y && q.x1 > sx0 + Math.min(0, p.lean ?? 0) && q.x0 < sx1 + Math.max(0, p.lean ?? 0) && q.y1 > sy0 && q.y0 < sy1);
    const xD = isX ? depthAt(t, Math.round(p.y) * W + Math.round(p.x)) : 0;
    for (let j = 0; j < img.h; j++) {
      // le pied reste droit, le houppier penche (courbe)
      const lean = p.lean ? Math.round(p.lean * (Math.max(0, img.footY - j) / img.footY) ** 1.6) : 0;
      for (let i = 0; i < img.w; i++) {
        const o = (j * img.w + i) * 4;
        const a = img.rgba[o + 3];
        if (!a) continue;
        const x = sx0 + i + lean;
        const y = sy0 + j;
        if (x < 0 || y < 0 || x >= W || y >= SH) continue;
        const k = y * W + x;
        if (!p.hang && r.dep[k] > p.y) continue; // le terrain est devant
        if (faded) {
          if (a === 255) veil.set([img.rgba[o], img.rgba[o + 1], img.rgba[o + 2], 255], k * 4);
          continue;
        }
        s.dot(x, y, [img.rgba[o], img.rgba[o + 1], img.rgba[o + 2]], a / 255);
        if (a === 255 && !faded) {
          top[k] = isX ? 1 : 2;
          gloomDepth[k] = isX ? xD : 0;
        }
        if (isX && a === 255) gloomDepth[k] = xD;
      }
    }
  }
  // la pénombre du couloir : comme celle du sous-bois, plus forte au fond, et sous la voûte
  for (let k = 0; k < W * SH; k++) {
    if (top[k] === 2) continue;
    const D = gloomDepth[k];
    if (D <= 0 && top[k] !== 1) continue;
    const cx = k % W;
    const a = Math.min(0.72, v.gloom * Math.sqrt(Math.max(0, D) / TOP) + (D > 0 ? 0.1 * v.vault : 0));
    if (a > 0) s.dot(cx, Math.floor(k / W), GLOOM, a);
  }
  for (let k = 0; k < W * SH; k++) if (veil[k * 4 + 3]) s.dot(k % W, Math.floor(k / W), [veil[k * 4], veil[k * 4 + 1], veil[k * 4 + 2]], VAULT_ALPHA);
  return { sheet: s, xeros: xs };
}

/** Copie agrandie d'un morceau d'une planche dans une autre (hors de la source : le fond). */
function copy(src: Sheet, sx: number, sy: number, w: number, h: number, dst: Sheet, dx: number, dy: number, k: number) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ax = sx + x;
    const ay = sy + y;
    const c: Rgb = ax < 0 || ay < 0 || ax >= src.w || ay >= src.h ? BG : (() => { const i = (ay * src.w + ax) * 4; return [src.png.data[i], src.png.data[i + 1], src.png.data[i + 2]] as Rgb; })();
    dst.rect(dx + x * k, dy + y * k, k, k, c);
  }
}

const save = (sheet: Sheet, name: string) => {
  const out = join(ROOT, '.art-preview', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-relief-creux -> ${out} (${sheet.w} x ${sheet.h})`);
};

const terrains = new Map<string, Terrain>(VARIANTS.map((v) => [v.key, terrain(v)]));

// ---------- les trois vues de jeu ----------

interface View {
  file: string;
  title: string;
  poses: Pose[];
  /** Le centre de l'écran, en px de l'écran de la scène, d'après Xéros. */
  center: (x: Placed) => [number, number];
  /** Le détail x4 : son coin, d'après Xéros, et sa taille. */
  detail: (x: Placed) => [number, number];
  notes: string[];
}

const DW = 212;
const DH = 106;

const VIEWS: View[] = [
  {
    file: 'relief-creux-2-entree.png',
    title: '2 - l entree vue de la ferme',
    poses: [{ key: 'xeros-up', s: -36, dx: 6, label: 'devant la bouche' }],
    center: (x) => [x.x - 30, x.y - x.z + OY - 98],
    detail: (x) => [x.x - DW / 2 + 0, x.y - x.z + OY - DH + 10],
    notes: [
      'xeros sur le lit sec (0 m), face a la bouche',
      'la face du promontoire regarde la ferme : 5 m = 100 px en vraie grandeur',
      'le sol clair monte dans la bouche et se perd sous les feuillages',
    ],
  },
  {
    file: 'relief-creux-3-couloir.png',
    title: '3 - a mi-pente, dans le couloir',
    poses: [{ key: 'xeros-up', s: 600, dx: 2, label: 'a mi-pente' }],
    center: (x) => [x.x, x.y - x.z + OY - 20],
    detail: (x) => [x.x - DW / 2, x.y - x.z + OY - DH + 24],
    notes: [
      'xeros a 30 m de la bouche : sol a 2,5 m, parois de 2,5 m',
      'les feuillages au-dessus de lui deviennent transparents (alpha 0,35, comme un toit)',
      'penombre du couloir (couleur de gloom), plus forte sous la voute',
    ],
  },
  {
    file: 'relief-creux-4-sortie.png',
    title: '4 - la sortie sur le plateau',
    poses: [{ key: 'xeros-left', s: 1150, dx: 0, label: 'a la sortie' }],
    center: (x) => [x.x + 60, x.y - x.z + OY + 40],
    detail: (x) => [x.x - DW / 2 + 40, x.y - x.z + OY - DH + 30],
    notes: [
      'le couloir a tourne vers l ouest : il n a plus que 1 m de fond',
      'la levre sud cache une partie du sol (est-ouest), sans gene a ce fond',
      'xeros sort a 5 m : le sentier reprend sur le plateau',
    ],
  },
];

const K = 2;
const PAD = 24;
const COLW = VW * K + PAD;

for (const view of VIEWS) {
  const colsTop = 70;
  const labelH = 26;
  const detailTop = colsTop + labelH + VH * K + 16;
  const notesTop = detailTop + DH * 4 + 16;
  const sheet = new Sheet(PAD + VARIANTS.length * COLW, notesTop + view.notes.length * 16 + 50, BG);
  sheet.text(view.title, PAD, 16, GOLD, 4);
  sheet.text('ecran par defaut 427 X 240 px (21 X 12 M), x2 ; dessous, detail x4 autour de xeros', PAD, 46, GREY, 2);
  VARIANTS.forEach((v: Variant, n) => {
    const t = terrains.get(v.key)!;
    const shot = compose(t, view.poses);
    const xp = shot.xeros[0];
    const [cx, cy] = view.center(xp);
    const ox = PAD + n * COLW;
    sheet.text(v.label, ox, colsTop, n === 1 ? GOLD : WHITE, 2);
    copy(shot.sheet, Math.round(cx - VW / 2), Math.round(cy - VH / 2), VW, VH, sheet, ox, colsTop + labelH, K);
    const [dx, dy] = view.detail(xp);
    copy(shot.sheet, Math.round(dx), Math.round(dy), DW, DH, sheet, ox + (VW * K - DW * 4) / 2, detailTop, 4);
  });
  view.notes.forEach((l, i) => sheet.text(l, PAD, notesTop + i * 16, GREY, 2));
  save(sheet, view.file);
}

// ---------- la vue d'ensemble ----------

{
  const v = VARIANTS[1];
  const t = terrains.get(v.key)!;
  const poses: Pose[] = VIEWS.flatMap((w) => w.poses);
  const shot = compose(t, poses);
  const planK = 4; // le plan des hauteurs, une case de 4 px du monde par pixel
  const PW = Math.ceil(W / planK);
  const PH = Math.ceil((SH - OY) / planK);
  const top = 90;
  const legend = [
    'le trace : la riviere est coupee sur 3 m et reprend decalee de 7 m vers l ouest. au nord de la coupure le plateau avance',
    '(un promontoire) ; sa face sud regarde la ferme, en vraie grandeur (5 m = 100 px) : la bouche s ouvre dedans, tournee au sud.',
    'le couloir monte vers le nord en ondulant (son sol clair se voit entre ses talus), puis tourne a l ouest quand il n a plus que',
    '1,3 m de fond, et sort sur le plateau. 60 m de long, 2,5 m de sol, de 0 a 5 m (8,3 %).',
    'le long de la riviere, la falaise regarde l est : vue de dessus, elle n a pas de largeur. on la lit a la levre (broussailles),',
    'au pied mouille et a son ombre portee sur l eau (25 px a l est pour 5 m). rectangles : les trois vues (ecran par defaut).',
  ];
  const sheet = new Sheet(PAD + W + PAD + PW * 2 + PAD, top + SH - 200 + 30 + legend.length * 16 + 30, BG);
  sheet.text('1 - vue d ensemble (V2, x1)', PAD, 16, GOLD, 4);
  sheet.text(`${W / 20} X ${(SH - OY) / 20} M ; a droite, le plan des hauteurs (1 PX = 10 CM, courbes tous les 1 M)`, PAD, 50, GREY, 2);
  copy(shot.sheet, 0, OY, W, SH - 2 * OY, sheet, PAD, top, 1);
  // les cadres des vues
  VIEWS.forEach((view, n) => {
    const xp = shot.xeros[n];
    const [cx, cy] = view.center(xp);
    const ry = top + Math.round(cy - VH / 2) - OY;
    sheet.outline(PAD + Math.round(cx - VW / 2), ry, VW, VH, GOLD);
    sheet.outline(PAD + Math.round(cx - VW / 2) + 1, ry + 1, VW - 2, VH - 2, GOLD);
    sheet.text(String(n + 2), PAD + Math.round(cx - VW / 2) + 6, ry + 6, GOLD, 3);
  });
  // le plan des hauteurs, x2
  const px0 = PAD + W + PAD;
  for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
    const x = px * planK;
    const y = py * planK;
    const k = y * W + x;
    const h = t.h[k];
    const z = t.zone[k];
    let c: Rgb = z === Z.RIVER ? [70, 110, 140] : z === Z.DRY ? [200, 180, 140] : z === Z.FLOOR ? [235, 228, 205] : z === Z.BANK ? [70, 52, 40] : h >= TOP ? [70, 100, 60] : [140, 150, 80];
    if (z === Z.PATH || z === Z.TRAIL) c = [170, 135, 90];
    const hn = (a: number, b: number) => Math.floor(heightOf(t, a, b) / 20);
    if (z === Z.FLOOR && (hn(x + planK, y) !== hn(x, y) || hn(x, y + planK) !== hn(x, y))) c = [150, 60, 40];
    sheet.rect(px0 + px * 2, top + py * 2, 2, 2, c);
  }
  // la falaise en rouge sur le plan
  for (let y = 0; y < SH - OY; y += 2) {
    const xc = y < Y_FACE ? X_NORTH : X_SOUTH;
    sheet.rect(px0 + Math.floor(xc / planK) * 2 - 1, top + Math.floor(y / planK) * 2, 2, 2, [200, 50, 40]);
  }
  for (let x = X_SOUTH; x < X_NORTH; x += 2) sheet.rect(px0 + Math.floor(x / planK) * 2, top + Math.floor(Y_FACE / planK) * 2 - 1, 2, 2, [200, 50, 40]);
  const marks: [number, string][] = [[0, '0 M'], [L / 4, '1,25'], [L / 2, '2,5'], [(3 * L) / 4, '3,75'], [L, '5 M']];
  for (const [s, label] of marks) {
    const a = axisAt(s);
    sheet.text(label, px0 + Math.floor(a.x / planK) * 2 + 14, top + Math.floor(a.y / planK) * 2 - 4, WHITE, 2);
  }
  sheet.text('ferme 0 m', px0 + Math.floor(960 / planK) * 2, top + Math.floor(1060 / planK) * 2, WHITE, 2);
  sheet.text('plateau 5 m', px0 + 20, top + Math.floor(700 / planK) * 2, WHITE, 2);
  sheet.text('lit sec', px0 + Math.floor(820 / planK) * 2, top + Math.floor((Y_FACE + 20) / planK) * 2 + 10, WHITE, 2);
  legend.forEach((l, i) => sheet.text(l, PAD, top + SH - 200 + 30 + i * 16, GREY, 2));
  void Y_DRY1;
  save(sheet, 'relief-creux-1-ensemble.png');
}
