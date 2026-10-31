// Aperçu de l'audit des tailles (docs/audit-tailles.md) : .art-preview/audit-tailles.png.
// Pour chaque objet de props.json hors gabarit (écart de plus de TOLERANCE px, ou nommé dans EXCEPTIONS), son image
// à l'échelle x3 (x2 si elle est grande), à côté de Xéros (image 0 de idle-down, rangées 14 à 45 : 32 px) à la même échelle,
// avec par-dessus, en liseré d'un pixel :
//   - jaune : la taille attendue d'après les dimensions déclarées dans props.json (celle que contrôle validate.ts) ;
//   - cyan : la taille attendue d'après les dimensions réelles proposées par l'audit (PROPOSED), quand elles diffèrent.
// Les liserés sont cadrés sur le bas de la silhouette (les pieds, le bord sud au sol) et centrés sur elle.
// Ne dessine rien dans art/ et ne change aucune dimension : c'est un outil de lecture.

import { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource } from '../../art/lib/types';
import type { PropDef } from '../../src/content/types';
import { TOLERANCE, expectedSize, silhouette } from '../../src/content/gabarit';
import type { Dims } from '../../src/content/gabarit';
import { EXCEPTIONS } from '../../src/content/validate';

/**
 * Dimensions réelles proposées par l'audit pour les objets dont les dimensions déclarées ne sont pas plausibles
 * (objets paysans médiévaux, en centimètres). Elles ne remplacent rien : props.json fait foi.
 */
export const PROPOSED: Record<string, Dims> = {
  // âtre de ferme : 2 m de large, manteau et hotte jusqu'à 2,5 m (déclaré : 3,20 m de large, 4,15 m de haut)
  fireplace: { w: 200, d: 90, h: 250, shape: 'box' },
  // table de travail et établi : environ 2 m (déclaré : 3,10 m et 3,20 m)
  worktable: { w: 200, d: 65, h: 85, shape: 'box' },
  workbench: { w: 200, d: 60, h: 85, shape: 'box' },
  // puits de ferme : margelle et potence, 2,15 m sous le chevron (déclaré : 2,50 m)
  well: { w: 235, d: 160, h: 215, shape: 'box' },
};

// ---------- petite police 3 x 5 (majuscules), pour la légende ----------

const GLYPHS: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110', '4': '101101111001001',
  '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  '-': '000000111000000', '/': '001001010100100', ',': '000000000010100', '.': '000000000000010', ':': '000010000010000',
  '(': '001010010010001', ')': '100010010010100', '+': '000010111010000', ' ': '000000000000000',
  '>': '100010001010100', '=': '000111000111000', '%': '101001010100101', "'": '010010000000000',
};

export type Rgb = [number, number, number];

export class Sheet {
  readonly png: PNG;
  constructor(readonly w: number, readonly h: number, bg: Rgb) {
    this.png = new PNG({ width: w, height: h });
    for (let i = 0; i < w * h; i++) this.png.data.set([...bg, 255], i * 4);
  }
  dot(x: number, y: number, c: Rgb, a = 1): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    for (let k = 0; k < 3; k++) this.png.data[i + k] = Math.round(c[k] * a + this.png.data[i + k] * (1 - a));
  }
  rect(x: number, y: number, w: number, h: number, c: Rgb): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.dot(x + i, y + j, c);
  }
  /** Liseré d'un pixel (de l'écran, pas du jeu) autour de [x, x + w[ × [y, y + h[. */
  outline(x: number, y: number, w: number, h: number, c: Rgb): void {
    for (let i = 0; i < w; i++) { this.dot(x + i, y, c); this.dot(x + i, y + h - 1, c); }
    for (let j = 0; j < h; j++) { this.dot(x, y + j, c); this.dot(x + w - 1, y + j, c); }
  }
  /** Une image du jeu, agrandie de k ; `rows` limite les rangées posées (Xéros : 14 à 45). */
  blit(grid: Grid, palette: Palette, ox: number, oy: number, k: number, rows?: [number, number]): void {
    grid.forEach((line, y) => {
      if (rows && (y < rows[0] || y > rows[1])) return;
      [...line].forEach((ch, x) => {
        if (ch === '.') return;
        const hex = palette[ch].replace('#', '');
        const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
        const a = hex.length === 8 ? n(6) / 255 : 1;
        for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) this.dot(ox + x * k + i, oy + y * k + j, [n(0), n(2), n(4)], a);
      });
    });
  }
  text(s: string, x: number, y: number, c: Rgb, k = 2): void {
    // la police n'a que les majuscules sans accent : « Pierre de taille, 31,2 kg » s'écrit PIERRE DE TAILLE, 31,2 KG
    [...s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/×/g, 'X').toUpperCase()].forEach((ch, n) => {
      const g = GLYPHS[ch] ?? GLYPHS[' '];
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') this.rect(x + (n * 4 + i) * k, y + j * k, k, k, c);
    });
  }
}

export const textWidth = (s: string, k = 2) => s.length * 4 * k;
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const range = (lo: number, hi: number) => (hi - lo > 0.05 ? `${fmt(lo)}-${fmt(hi)}` : fmt(lo));

interface Entry {
  key: string;
  grid: Grid;
  palette: Palette;
  sil: { x: number; y: number; w: number; h: number };
  lines: string[];
  declared: { w: number; h: number };
  proposed?: { w: number; h: number };
}

/** Rectangle attendu : taille réelle, ou agrandie jusqu'au plancher de lisibilité au plus près du dessin. */
function box(dims: Dims, drawnW: number): { w: number; h: number; text: string } {
  const e = expectedSize(dims);
  const k = Math.min(Math.max(drawnW / e.w, 1), e.wMax / e.w);
  return { w: e.w * k, h: e.h * k, text: `${range(e.w, e.wMax)}X${range(e.h, e.hMax)}` };
}

/** La planche : les objets hors gabarit, chacun à côté de Xéros ; undefined si Xéros n'est pas dessiné. */
export function auditPreview(sources: ArtSource[], props: Record<string, PropDef>): PNG | undefined {
  const body = sources.find((s) => s.kind === 'spritesheet' && s.name === 'xeros');
  if (body?.kind !== 'spritesheet') return undefined;
  const xerosGrid = body.animations['idle-down'].frames[0];
  const xerosSil = silhouette(xerosGrid, body.palette);

  const entries: Entry[] = [];
  for (const [key, p] of Object.entries(props)) {
    const s = sources.find((x) => x.name === p.image);
    const grid = s?.kind === 'image' ? s.grid : s?.kind === 'spritesheet' ? Object.values(s.animations)[0].frames[0] : undefined;
    if (!s || !grid || s.kind === 'tileset') continue;
    const sil = silhouette(grid, s.palette);
    const within = (n: number, lo: number, hi: number) => n >= lo - TOLERANCE && n <= hi + TOLERANCE;
    const fits = (dims: Dims) => {
      const e = expectedSize(dims);
      return within(sil.w, e.w, e.wMax) && within(sil.h, e.h, e.hMax);
    };
    const proposed = PROPOSED[key];
    const off = !fits(p.dims) || (proposed && !fits(proposed)) || key in EXCEPTIONS;
    if (!off) continue;
    const d = box(p.dims, sil.w);
    const lines = [key, `DESSINE ${sil.w}X${sil.h} / ATTENDU ${d.text}`];
    let prop: { w: number; h: number } | undefined;
    if (proposed) {
      const q = box(proposed, sil.w);
      lines.push(`PROPOSE ${proposed.w}X${proposed.d}X${proposed.h} CM : ${q.text}`);
      prop = q;
    }
    entries.push({ key, grid, palette: s.palette, sil, lines, declared: d, proposed: prop });
  }
  if (!entries.length) return undefined;

  // mise en page : étagères de MAX px de large au plus ; x3, ou x2 pour une image de plus de 200 px à l'écran
  const MAX = 1900;
  const PAD = 14;
  const T = 2;
  const cells = entries.map((e) => {
    const k = Math.max(e.sil.w, e.sil.h) * 3 > 200 ? 2 : 3;
    const art = Math.max(e.sil.h, e.declared.h, e.proposed?.h ?? 0, 32) * k + 6;
    const textW = Math.max(...e.lines.map((l) => textWidth(l, T)));
    const artW = (18 + 4) * k + Math.max(e.sil.w, e.declared.w, e.proposed?.w ?? 0) * k + 8;
    return { e, k, w: Math.max(textW, artW) + 2 * PAD, h: art + e.lines.length * 12 + 2 * PAD, art };
  });
  const rows: (typeof cells)[] = [[]];
  let rowW = 0;
  for (const c of cells) {
    if (rowW + c.w > MAX && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
    rows[rows.length - 1].push(c);
    rowW += c.w;
  }
  const width = Math.max(...rows.map((r) => r.reduce((a, c) => a + c.w, 0)));
  const height = rows.reduce((a, r) => a + Math.max(...r.map((c) => c.h)), 0) + 30;
  const sheet = new Sheet(width, height, [46, 52, 40]);
  sheet.text('AUDIT DES TAILLES - JAUNE : ATTENDU (DIMS DECLAREES) - CYAN : ATTENDU (DIMS PROPOSEES) - XEROS 32 PX = 1,60 M', 8, 8, [235, 225, 190]);

  let y0 = 30;
  for (const r of rows) {
    const rowH = Math.max(...r.map((c) => c.h));
    let x0 = 0;
    for (const c of r) {
      const { e, k } = c;
      const ground = y0 + PAD + c.art - 3; // ligne de sol : sous le bas des silhouettes
      // Xéros : rangées 14 à 45, bas de la rangée 45 sur la ligne de sol
      const xx = x0 + PAD + 2 * k - xerosSil.x * k;
      sheet.blit(xerosGrid, body.palette, xx, ground - 46 * k, k, [14, 45]);
      // l'objet, son bas sur la même ligne de sol
      const ox0 = x0 + PAD + (18 + 4) * k + 2 * k;
      sheet.rect(ox0 - 4, ground, e.sil.w * k + 8, 1, [90, 98, 80]);
      sheet.blit(e.grid, e.palette, ox0 - e.sil.x * k, ground - (e.sil.y + e.sil.h) * k, k);
      const outline = (b: { w: number; h: number }, col: Rgb) => {
        const w = Math.round(b.w * k);
        const h = Math.round(b.h * k);
        sheet.outline(ox0 + Math.round((e.sil.w * k - w) / 2) - 1, ground - h - 1, w + 2, h + 2, col);
      };
      outline(e.declared, [255, 214, 40]);
      if (e.proposed) outline(e.proposed, [40, 230, 255]);
      e.lines.forEach((l, i) => sheet.text(l, x0 + PAD, ground + 8 + i * 12, i === 0 ? [255, 255, 255] : i === 1 ? [220, 220, 220] : [40, 230, 255], T));
      x0 += c.w;
    }
    y0 += rowH;
  }
  return sheet.png;
}
