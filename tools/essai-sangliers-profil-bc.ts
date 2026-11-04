// Quatrième essai du profil du sanglier (chantier « sangliers », hors jeu) : npx tsx tools/essai-sangliers-profil-bc.ts écrit
// .art-preview/sangliers-profil-bc.png :
//   - une bande par profil (art/proposals/sanglier-profil-bc.ts) : B et C en rappel, puis le nouveau (l'avant de B, l'arrière de
//     C) avec la joue grise, et sans ; en x4, Xéros de profil, debout et en pleine charge (liseré jaune : le gabarit 28 × 20), une
//     règle de 1 m ; puis les mêmes à la taille du jeu (x2) sur le sol de la forêt profonde, sous sa pénombre ;
//   - en bas, les quatre côte à côte à la taille du jeu.
// Ne touche ni au jeu ni à src/generated/.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { EMPTY, rng, type Grid, type Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import tileset from '../art/world/tiles';
import world from '../src/content/world.json';
import { silhouette } from '../art/proposals/sanglier-profil-lib';
import { palette, FOOT, entries } from '../art/proposals/sanglier-profil-bc';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.art-preview');
const PAD = 16;
const BG: Rgb = [72, 80, 69];
const WHITE: Rgb = [240, 236, 220];
const GREY: Rgb = [205, 205, 190];
const GOLD: Rgb = [245, 215, 120];
const YELLOW: Rgb = [255, 230, 60];
const RED: Rgb = [230, 80, 60];

function blitGrid(s: Sheet, g: Grid, pal: Palette, ox: number, oy: number, k: number, clip?: [number, number, number, number]) {
  g.forEach((line, y) => [...line].forEach((ch, x) => {
    if (ch === EMPTY) return;
    const hex = pal[ch].replace('#', '');
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    const a = hex.length === 8 ? n(6) / 255 : 1;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const px = ox + x * k + i, py = oy + y * k + j;
      if (clip && (px < clip[0] || py < clip[1] || px >= clip[0] + clip[2] || py >= clip[1] + clip[3])) continue;
      s.dot(px, py, [n(0), n(2), n(4)], a);
    }
  }));
}

// ---------------------------------------------------------------- ce qu'on montre

/** Un sprite : sa grille, sa palette, la rangée de ses pieds (le sol), le gabarit attendu (ou rien). */
interface Spr { g: Grid; pal: Palette; foot: number; label: string; want?: [number, number]; ms?: number }

const XEROS = xeros.animations['idle-right'].frames[0];
const xerosSpr: Spr = { g: XEROS, pal: xeros.palette, foot: 45, label: 'XEROS PROFIL' };

/** Ne garde que les colonnes et rangées utiles (2 px de marge autour de la silhouette et de l'ombre). */
function crop(s: Spr): Spr {
  let x0 = 1e9, y0 = 1e9, x1 = -1;
  s.g.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== EMPTY) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); } }));
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2);
  const y1 = Math.min(s.g.length - 1, s.foot + 2);
  return { ...s, g: s.g.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 3)), foot: s.foot - y0 };
}

// ---------------------------------------------------------------- les bandes

/** Une rangée de sprites en xk, posés sur un même sol ; texte sous chacun ; renvoie la hauteur utilisée. */
function strip(s: Sheet, x: number, top: number, sprites: Spr[], k: number, measure = true): { w: number; h: number } {
  const cs = sprites.map(crop);
  const above = Math.max(...cs.map((c) => c.foot));
  const below = Math.max(...cs.map((c) => c.g.length - c.foot));
  const ground = top + above * k;
  let cx = x;
  for (const c of cs) {
    const oy = ground - c.foot * k;
    blitGrid(s, c.g, c.pal, cx, oy, k);
    const sil = silhouette(c.g);
    const ty = ground + below * k + 6;
    s.text(c.label, cx, ty, GREY, 2);
    let w = Math.max(c.g[0].length * k, textWidth(c.label, 2));
    if (measure) {
      if (c.want) {
        const [ww, wh] = c.want;
        const mid = sil.x + sil.w / 2, bottom = sil.y + sil.h;
        s.outline(cx + Math.round((mid - ww / 2) * k) - 1, oy + (bottom - wh) * k - 1, ww * k + 2, wh * k + 2, YELLOW);
        const ok = Math.abs(sil.w - ww) <= 2 && Math.abs(sil.h - wh) <= 2;
        const t = `${sil.w}X${sil.h} (GABARIT ${ww}X${wh}) ${ok ? 'OK' : 'ECART'}`;
        s.text(t, cx, ty + 12, ok ? GREY : RED, 2);
        w = Math.max(w, textWidth(t, 2));
      } else {
        s.text(`${sil.w}X${sil.h}`, cx, ty + 12, GREY, 2);
      }
      if (c.ms !== undefined) s.text(`${c.ms} MS`, cx, ty + 24, GOLD, 2);
    }
    cx += w + PAD;
  }
  return { w: cx - x, h: above * k + below * k + 6 + (measure ? 36 : 14) };
}

function ruler(s: Sheet, x: number, y: number, k: number) {
  for (let i = 0; i < 20; i++) s.rect(x + i * k, y, k, k, i % 4 < 2 ? WHITE : [40, 40, 40]);
  s.text('1 M', x, y + k + 4, WHITE, 2);
}

// ---------------------------------------------------------------- la scène x2 (forêt profonde)

function gloomAlpha(m: number): number {
  const st = world.gloom;
  if (m <= st[0].x) return st[0].alpha;
  for (let i = 1; i < st.length; i++) if (m <= st[i].x) return st[i - 1].alpha + ((st[i].alpha - st[i - 1].alpha) * (m - st[i - 1].x)) / (st[i].x - st[i - 1].x);
  return 0;
}

/** Les sprites posés côte à côte sur le sol de la forêt profonde, à l'échelle du jeu (x2), sous la pénombre. */
function scene(s: Sheet, x: number, top: number, sprites: Spr[], seed: number): { w: number; h: number } {
  const K = 2;
  const cs = sprites.map(crop);
  const W = cs.reduce((a, c) => a + c.g[0].length + 8, 16);
  const H = 64;
  const clip: [number, number, number, number] = [x, top, W * K, H * K];
  const r = rng(seed);
  const names = ['deepwoods', 'deepwoods2', 'deepwoods3', 'deepwoods4'];
  for (let ty = 0; ty * 32 < H; ty++) for (let tx = 0; tx * 32 < W; tx++) {
    blitGrid(s, tileset.tiles[names[Math.floor(r() * 4)]], tileset.palette as Palette, x + tx * 32 * K, top + ty * 32 * K, K, clip);
  }
  const ground = 50;
  let cx = 10;
  for (const c of cs) {
    blitGrid(s, c.g, c.pal, x + cx * K, top + (ground - c.foot) * K, K, clip);
    cx += c.g[0].length + 8;
  }
  const a = gloomAlpha(0);
  for (let j = 0; j < H * K; j++) for (let i = 0; i < W * K; i++) s.dot(x + i, top + j, [11, 22, 17], a);
  return { w: W * K, h: H * K };
}

// ---------------------------------------------------------------- la planche

const WANT: [number, number] = [28, 20];
const boar = (g: Grid, label: string, want?: [number, number], ms?: number): Spr => ({ g, pal: palette, foot: FOOT, label, want, ms });

type Band = { title: string; note?: string; big: Spr[]; small: Spr[] };
const bands: Band[] = entries.map((v): Band => ({
  title: v.title,
  note: v.note,
  big: [xerosSpr, boar(v.stand, 'DEBOUT', WANT), boar(v.charge, 'PLEINE CHARGE', WANT)],
  small: [xerosSpr, boar(v.stand, ''), boar(v.charge, '')],
}));
// en bas, les quatre cote a cote a la taille du jeu : Xeros, puis chaque profil debout et en charge
bands.push({
  title: 'COTE A COTE A LA TAILLE DU JEU (X2) : B, C, NOUVEAU AVEC JOUE, NOUVEAU SANS JOUE',
  note: 'chaque paire : debout puis pleine charge',
  big: [],
  small: [xerosSpr, ...entries.flatMap((v) => [boar(v.stand, ''), boar(v.charge, '')])],
});
function build(): Sheet {
  const K = 4;
  // première passe : mesurer (sur une feuille jetable)
  const scratch = new Sheet(4000, 4000, BG);
  let height = 50, width = 0;
  for (const b of bands) {
    height += 40;
    if (b.big.length) {
      const st = strip(scratch, PAD, 0, b.big, K);
      height += st.h + 10;
      width = Math.max(width, st.w + 20 * K + 3 * PAD);
    }
    width = Math.max(width, textWidth(b.note ?? '', 2) + 2 * PAD, textWidth(b.title, 2) + 2 * PAD);
    if (b.small.length) {
      const sc = scene(scratch, PAD, 0, b.small, 1);
      height += sc.h + 24;
      width = Math.max(width, sc.w + 60);
    }
  }
  const s = new Sheet(Math.max(width, textWidth('SANGLIER, QUATRIEME ESSAI DU PROFIL : L AVANT DE B, L ARRIERE DE C ; 80 KG, 140 X 40 X 80 CM ; 28 X 20 PX', 3) + 2 * PAD), height + 20, BG);
  s.text('SANGLIER, QUATRIEME ESSAI DU PROFIL : L AVANT DE B, L ARRIERE DE C ; 80 KG, 140 X 40 X 80 CM ; 28 X 20 PX', PAD, 12, GOLD, 3);
  s.text('EN X4 AVEC LE LISERE DU GABARIT, PUIS A LA TAILLE DU JEU (X2) EN FORET PROFONDE ; MEME RENDU ET MEMES POSES POUR LES QUATRE', PAD, 32, GREY, 2);
  let y = 54;
  bands.forEach((b, n) => {
    s.text(b.title, PAD, y, WHITE, 2);
    if (b.note) s.text(b.note, PAD, y + 12, GREY, 2);
    y += 30;
    if (b.big.length) {
      const st = strip(s, PAD, y, b.big, K);
      ruler(s, PAD + st.w, y + 20, K);
      y += st.h + 10;
    }
    if (b.small.length) {
      const sc = scene(s, PAD, y, b.small, 7 + n);
      s.text('X2', PAD + sc.w + 8, y + sc.h - 12, GREY, 2);
      y += sc.h + 24;
    }
    for (let i = PAD; i < s.w - PAD; i++) s.dot(i, y - 6, [96, 104, 92]);
    y += 10;
  });
  return s;
}

function report() {
  const m = (g: Grid) => { const b = silhouette(g); return `${b.w}x${b.h}`; };
  for (const v of entries) console.log(`${v.key} : debout ${m(v.stand)}, charge ${m(v.charge)}`);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'sangliers-profil-bc.png'), PNG.sync.write(build().png));
report();
console.log(`essai-sangliers-profil-bc -> ${join(OUT, 'sangliers-profil-bc.png')}`);
