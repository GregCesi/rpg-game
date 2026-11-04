// Planches des dessins définitifs du chemin creux (chantier « relief », hors jeu, à valider par Grégoire) :
//   npx tsx tools/essai-relief-final.ts  écrit
//   .art-preview/relief-final-1-matieres.png  chaque matière et objet seul (tools/essai-relief-final-matieres.ts) ;
//   .art-preview/relief-final-2-entree.png    l'entrée côté ferme ;
//   .art-preview/relief-final-3-couloir.png   Xéros dans le couloir avant la rivière (le bord sud s'efface à 0,2) ;
//   .art-preview/relief-final-4-coupure.png   Xéros au-dessus de la rivière, et le détail de la coupure sud ;
//   .art-preview/relief-final-5-falaise.png   la falaise le long de la rivière, face en raccourci, lierre, ombre ;
//   .art-preview/relief-final-6-voute.png     la voûte : l'essai 4 à gauche, les dessins définitifs à droite, même cadrage.
// Scène : art/proposals/relief-final-scene.ts (le terrain de l'essai 4, les matières définitives) ; dessins :
// art/proposals/relief-final.ts. Les arbres, buissons, fougères et Xéros sont ceux du jeu (src/generated/).

import './essai-relief-final-matieres';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { world } from '../art/palette';
import { hood } from '../art/proposals/relief-creux3';
import * as old from '../art/proposals/relief-creux4-scene';
import * as fin from '../art/proposals/relief-final-scene';
import { Sheet, type Rgb } from './lib/audit-preview';

const { H, OY, RAKE, SH, TOP, W, XC, XE, XT, Z, axisY, floorZ, wallZ } = fin;
type Placed = fin.Placed;
type Rendered = fin.Rendered;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: Rgb = [40, 44, 36];
const GREY: Rgb = [215, 215, 200];
const GOLD: Rgb = [245, 215, 120];
const FADE = 0.2;
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
  } else if (fin.OBJECTS[key]) {
    const o = fin.OBJECTS[key];
    img = fromGrid(o.grid, world, Math.floor(o.grid[0].length / 2), o.root);
  } else {
    const file = join(ROOT, 'src', 'generated', `${key}.png`);
    if (!existsSync(file)) throw new Error(`essai-relief-final : ${file} manque (lancer npm run art)`);
    const png = PNG.sync.read(readFileSync(file));
    const [fx, fy] = FEET[key] ?? [Math.floor(png.width / 2), png.height - 1];
    img = { w: png.width, h: png.height, rgba: new Uint8Array(png.data), footX: fx, footY: fy };
  }
  images.set(key, img);
  return img;
}

const hexRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const PAL = new Map(Object.entries(world).map(([k, v]) => [k, hexRgb(v)]));

/** Une scène : le terrain complet, le terrain sans le bord sud, ce qui est posé. */
interface Scene { name: string; full: fin.Terrain; fullR: Rendered; cutR: Rendered; things: Placed[] }
const NEW: Scene = (() => { const full = fin.terrain(false); return { name: 'final', full, fullR: fin.render(full), cutR: fin.render(fin.terrain(true)), things: fin.plants(full) }; })();
const OLD: Scene = (() => { const full = old.terrain(false); return { name: 'essai4', full, fullR: old.render(full), cutR: old.render(old.terrain(true)), things: old.plants(full) }; })();

/** L'ombre des feuillages de la voûte sur le couloir (colonne par colonne), en plus de la pénombre : forte sous le rideau. */
function vaultShade(sc: Scene): Float32Array {
  const shade = new Float32Array(W);
  for (const p of sc.things) {
    const isHood = p.key.startsWith('hood:');
    if (!isHood && !fin.OBJECTS[p.key]) continue;
    const w = imageOf(p.key).w;
    const strong = p.x > 1740;
    for (let x = Math.round(p.x - w / 2 + 8); x < p.x + w / 2 - 8; x++) {
      if (x < 0 || x >= W) continue;
      const edge = Math.min(x - (p.x - w / 2 + 8), p.x + w / 2 - 8 - x);
      shade[x] = Math.max(shade[x], (strong ? 0.75 : 0.16) * Math.min(1, edge / 20));
    }
  }
  return shade;
}

interface Layer { sheet: Sheet; veil: Uint8Array; veg: Uint8Array }

function compose(sc: Scene, r: Rendered, xs: Placed[], fadeOn: boolean): Layer {
  const s = new Sheet(W, SH, BG);
  for (let y = 0; y < SH; y++) for (let x = 0; x < W; x++) {
    const ch = r.grid[y][x];
    if (ch !== '.') s.dot(x, y, PAL.get(ch) ?? [255, 0, 255]);
  }
  for (let i = 0; i < W * SH; i++) if (r.shadow[i]) s.dot(i % W, Math.floor(i / W), SHADOW, SHADOW_A);
  const veg = new Uint8Array(W * SH);
  const gl = Float32Array.from(r.gloom);
  const veil = new Uint8Array(W * SH * 4);
  const shade = vaultShade(sc);
  const xRects = xs.map((p) => ({ x0: p.x - 7, x1: p.x + 7, y0: p.y - p.z + OY - 33, y1: p.y - p.z + OY, foot: p.y }));
  for (const p of [...sc.things, ...xs].sort((a, b) => a.y - b.y || a.z - b.z)) {
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
        // ce qui pend (rideau, avancées) passe devant le terrain sous son point d'accroche ; le reste est caché par ce qui est devant
        // (les capuchons de l'essai 4, qui pendent de `hang`, passaient devant tout, comme dans l'essai)
        if (!p.hang && r.dep[k] > p.y) continue;
        if (faded) {
          if (a === 255) veil.set([img.rgba[o], img.rgba[o + 1], img.rgba[o + 2], 255], k * 4);
          continue;
        }
        s.dot(x, y, [img.rgba[o], img.rgba[o + 1], img.rgba[o + 2]], a / 255);
        if (a === 255) { veg[k] = isX ? 2 : 1; gl[k] = isX ? xg : 0; }
      }
    }
  }
  for (let k = 0; k < W * SH; k++) {
    if (veg[k] === 1 || gl[k] <= 0) continue;
    const x = k % W;
    s.dot(x, Math.floor(k / W), GLOOM, Math.min(0.85, GLOOM_MAX * Math.sqrt(gl[k]) + (veg[k] === 2 ? 0 : shade[x])));
  }
  return { sheet: s, veil, veg };
}

function shot(sc: Scene, poses: fin.Pose[]): Layer {
  const xs = poses.map((p) => fin.xerosAt(sc.full, p));
  const inside = xs.some((p) => p.x < XE - 30 && sc.full.zone[p.y * W + p.x] === Z.FLOOR);
  const piece = (x: number) => xs.some((p) => Math.abs(x - p.x) < VW / 2 + RAKE);
  const a = compose(sc, sc.fullR, xs, inside);
  if (inside) {
    const b = compose(sc, sc.cutR, xs, true);
    for (let k = 0; k < W * SH; k++) {
      const behind = sc.cutR.zone[k] === Z.FLOOR || sc.cutR.zone[k] === Z.NBANK;
      if (!(sc.fullR.dep[k] > sc.cutR.dep[k] + 1 && behind && piece(k % W))) continue;
      const o = k * 4;
      a.sheet.dot(k % W, Math.floor(k / W), [b.sheet.png.data[o], b.sheet.png.data[o + 1], b.sheet.png.data[o + 2]], 1 - FADE);
    }
  }
  for (let k = 0; k < W * SH; k++) if (a.veil[k * 4 + 3]) a.sheet.dot(k % W, Math.floor(k / W), [a.veil[k * 4], a.veil[k * 4 + 1], a.veil[k * 4 + 2]], FADE);
  return a;
}

function copy(src: Sheet, sx0: number, sy0: number, w: number, h: number, dst: Sheet, dx: number, dy: number, k: number) {
  const sx = Math.round(sx0);
  const sy = Math.round(sy0);
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
  console.log(`essai-relief-final -> ${out} (${sheet.w} x ${sheet.h})`);
};

// ---------- les vues, x2 et détail x4 ----------

interface View {
  file: string; title: string; pose?: fin.Pose; at?: [number, number]; dx: number; dy: number; detail: [number, number]; notes: string[];
  /** Un second détail x4 (la coupure sud), centré sur ce point de l'écran du monde. */
  cut?: boolean;
  /** Un Xéros posé pour l'échelle, hors du suivi de la caméra. */
  extra?: fin.Pose;
}
const DW = 212;
const DH = 106;
const K = 2;
const PAD = 24;
const VIEWS: View[] = [
  {
    file: 'relief-final-2-entree.png', title: '2 - l entree cote ferme', pose: { key: 'xeros-left', x: 1905, label: '' }, dx: -110, dy: -30, detail: [-60, -20],
    notes: [
      'xeros sur le chemin de la ferme, devant la bouche : le chemin (path) entre dans le sol clair par path-lane-w',
      'le rideau lane-curtain est pose sur le talus sud de l entree, a sa hauteur : il pend au-dessus de la bouche',
      'les talus plantes (bank) montent de 0 a 5 m vers l ouest ; leurs flancs vus du sud : relief-face-earth et sa levre',
      'aucun arbre penche : la voute, ce sont le rideau, les avancees et les arbres du jeu, debout',
    ],
  },
  {
    file: 'relief-final-3-couloir.png', title: '3 - dans le couloir, avant la riviere', pose: { key: 'xeros-left', x: 1640, label: '' }, dx: 0, dy: -20, detail: [0, 0],
    notes: [
      `xeros dans le couloir, case 51 : le bord sud et ce qui y est pose s effacent autour de lui (il en reste ${FADE})`,
      'au nord : la paroi (relief-face-earth, coupee par le haut selon sa hauteur) et sa levre (relief-lip)',
      'le sol : lane-14 en haut, lane-11 en bas (quatre variantes de chaque), pris par les deux bords de la bande de 2,5 m',
    ],
  },
  {
    file: 'relief-final-4-coupure.png', title: '4 - au-dessus de la riviere, dans le couloir', pose: { key: 'xeros-left', x: Math.round(44.5 * 32), label: '' }, dx: 0, dy: -16, detail: [0, 10], cut: true,
    notes: [
      'xeros case 44,5, sous la riviere : sol a 0 m entre les talus de 5 m. le bord sud s efface',
      'en bas : la coupure sud. le flanc exterieur du talus au-dessus de l eau (relief-face-wet : lierre jusqu a l eau, pied mouille),',
      'le lisere water-cut contre son pied, puis le miroitement shimmer (image 1 de 4) ; jamais d eau dans le couloir',
    ],
  },
  {
    file: 'relief-final-5-falaise.png', title: '5 - la falaise le long de la riviere', at: [XC + 10, 830], extra: { key: 'xeros-down', x: XC - 22, dy: 236, label: '' }, dx: 0, dy: 0, detail: [-20, -30],
    notes: [
      'la face est de la falaise (5 m), en raccourci : relief-face-raked, 12 px de face (de la levre au pied) + le lierre qui deborde sur l eau',
      'son ombre portee sur l eau : 25 px a l est et 10 au sud pour 5 m (shadow de src/config.ts, calculee par le jeu)',
      'xeros sur le plateau, au bord, pour l echelle',
    ],
  },
];

for (const v of VIEWS) {
  const poses = v.pose ? [v.pose] : v.extra ? [v.extra] : [];
  const lay = shot(NEW, poses);
  const s = lay.sheet;
  let cx: number;
  let cy: number;
  if (v.pose) { const xp = fin.xerosAt(NEW.full, v.pose); cx = xp.x; cy = xp.y - xp.z + OY; } else { [cx, cy] = v.at!; cy += OY - TOP; }
  const top = 70;
  const detailTop = top + VH * K + 40;
  const cutTop = detailTop + DH * 4 + 40;
  const notesTop = (v.cut ? cutTop + DH * 4 : detailTop + DH * 4) + 16;
  const sheet = new Sheet(PAD * 2 + Math.max(VW * K, DW * 4), notesTop + v.notes.length * 16 + 30, BG);
  sheet.text(v.title, PAD, 16, GOLD, 4);
  sheet.text('ecran de jeu 427 X 240 PX (21 X 12 M), X2', PAD, 46, GREY, 2);
  copy(s, Math.round(cx + v.dx - VW / 2), Math.round(cy + v.dy - VH / 2), VW, VH, sheet, PAD, top, K);
  sheet.text('detail X4 (xeros pour l echelle)', PAD, detailTop - 18, GOLD, 2);
  let ddx = cx + v.detail[0];
  let ddy = cy + v.detail[1];
  if (!v.pose && v.extra) { const xp = fin.xerosAt(NEW.full, v.extra); ddx = (xp.x + XC + 30) / 2 + v.detail[0]; ddy = xp.y - xp.z + OY + v.detail[1]; }
  copy(s, Math.round(ddx - DW / 2), Math.round(ddy - DH * 0.6), DW, DH, sheet, PAD, detailTop, 4);
  if (v.cut) {
    const xp = fin.xerosAt(NEW.full, v.pose!);
    let foot = xp.y;
    while (foot < H - 1 && NEW.full.zone[foot * W + xp.x] !== Z.RIVER) foot++;
    sheet.text('detail X4 : la coupure sud (flanc mouille, lisere, miroitement)', PAD, cutTop - 18, GOLD, 2);
    copy(s, Math.round(xp.x - DW / 2), Math.round(foot + OY - DH * 0.55), DW, DH, sheet, PAD, cutTop, 4);
  }
  v.notes.forEach((l, i) => sheet.text(l, PAD, notesTop + i * 16, GREY, 2));
  save(sheet, v.file);
}

// ---------- 6. la voûte : l'essai 4 contre les dessins définitifs ----------

/**
 * Combien la voûte referme le couloir, vu de loin (sans Xéros, rien ne s'efface) : sur les colonnes du couloir creusé (de la
 * case 6 à l'entrée), la part des pixels de l'écran où le terrain seul montrerait le sol du couloir ou la paroi nord, et que le
 * feuillage (arbres, rideau, avancées, capuchons de l'essai 4) recouvre.
 */
function closure(sc: Scene, lay: Layer, x0: number, x1: number) {
  let floor = 0, floorC = 0, wall = 0, wallC = 0;
  for (let y = 0; y < SH; y++) for (let x = x0; x < x1; x++) {
    const k = y * W + x;
    const z = sc.fullR.zone[k];
    if (z === Z.FLOOR && (x >= XC || wallZ(x) - floorZ(x) > 20)) { floor++; if (lay.veg[k] === 1) floorC++; }
    if (z === Z.NBANK) { wall++; if (lay.veg[k] === 1) wallC++; }
  }
  return { floor: floorC / Math.max(1, floor), wall: wallC / Math.max(1, wall), all: (floorC + wallC) / Math.max(1, floor + wall) };
}

{
  const a = shot(OLD, []);
  const b = shot(NEW, []);
  const x0 = 6 * 32;
  const x1 = XE;
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const segs: [string, number, number][] = [['tout le couloir', x0, x1], ['cote plateau (cases 6-42)', x0, XC], ['sur la riviere (42-47)', XC, 47 * 32], ['cote ferme (47-60)', 47 * 32, x1]];
  const lines = segs.map(([n, p, q]) => {
    const ca = closure(OLD, a, p, q);
    const cb = closure(NEW, b, p, q);
    return `${n} : sol couvert ${pct(ca.floor)} -> ${pct(cb.floor)} ; paroi nord couverte ${pct(ca.wall)} -> ${pct(cb.wall)} ; ensemble ${pct(ca.all)} -> ${pct(cb.all)}`;
  });
  console.log(lines.join('\n'));
  // le cadrage : la bande du couloir, à x1 en entier, puis trois écrans de jeu x2 côte à côte (même cadre de chaque côté)
  const cy = Math.round(axisY(1200)) + OY - 70;
  const bandH = 220;
  const frames: [string, number, number][] = [['cote ferme, case 53', 1700, cy + 10], ['sur la riviere, case 44', 1424, cy + 10], ['cote plateau, case 30', 960, cy + 30]];
  const top = 70;
  const fullW = W - 120;
  const sheetW = PAD * 2 + Math.max(fullW, VW * K * 2 + 40);
  const rowsTop = top + (bandH + 40) * 2 + 40;
  const sheet = new Sheet(sheetW, rowsTop + frames.length * (VH * K + 50) + lines.length * 16 + 60, BG);
  sheet.text('6 - la voute : essai 4 (arbres penches, capuchons) contre les dessins definitifs (arbres debout, rideau, avancees)', PAD, 16, GOLD, 3);
  sheet.text('vue de loin, sans xeros (rien ne s efface) ; meme cadrage des deux cotes', PAD, 46, GREY, 2);
  sheet.text('essai 4', PAD, top - 4, GOLD, 2);
  copy(a.sheet, 60, cy - bandH / 2, fullW, bandH, sheet, PAD, top + 12, 1);
  sheet.text('definitif', PAD, top + bandH + 36, GOLD, 2);
  copy(b.sheet, 60, cy - bandH / 2, fullW, bandH, sheet, PAD, top + bandH + 52, 1);
  frames.forEach(([n, fx, fy], i) => {
    const yy = rowsTop + i * (VH * K + 50);
    sheet.text(`${n} : essai 4 (a gauche), definitif (a droite), x2`, PAD, yy - 18, GOLD, 2);
    copy(a.sheet, fx - VW / 2, fy - VH / 2, VW, VH, sheet, PAD, yy, K);
    copy(b.sheet, fx - VW / 2, fy - VH / 2, VW, VH, sheet, PAD + VW * K + 40, yy, K);
  });
  const ly = rowsTop + frames.length * (VH * K + 50) + 10;
  sheet.text('part du couloir (sol visible et paroi nord) que le feuillage couvre, essai 4 -> definitif :', PAD, ly, GOLD, 2);
  lines.forEach((l, i) => sheet.text(l, PAD, ly + 18 + i * 16, GREY, 2));
  save(sheet, 'relief-final-6-voute.png');
}
void XT;
