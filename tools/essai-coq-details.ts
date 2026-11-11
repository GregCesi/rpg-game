// Essai (chantier « maison du coq », hors jeu) : la planche de détail de la pierre taillée, des baies, du toit de laves et des
// tentures. npx tsx tools/essai-coq-details.ts écrit .art-preview/coq-pierre-tapisserie.png (x4, chaque élément à côté de Xéros).
//
// Rien ici n'entre dans le jeu. Les matières sont celles d'art/proposals/coq-pierre.ts (que la maison entière reprend,
// art/proposals/coq-maison.ts), les baies celles d'art/proposals/coq-baies.ts, les tentures d'art/proposals/coq-tentures.ts ;
// le tout rendu par le modèle en volumes du jeu (art/lib/volumes.ts, `renderPiece` : la projection des pièces de bâtiment,
// (x, y − z), le dessus en vraie grandeur, docs/STYLE.md section 8). Pour comparer : le petit appareil fait avec l'image du jeu
// de la pierre de taille (`ashlar-ground`, 40 × 20 × 15 cm) et le morceau de solin brut de la maison de Xéros (`rough-sill-wall`).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { gameImage } from '../art/lib/walls';
import { box, part, polyPrism, renderPiece, withGroundShadow, add, type Quad, type Tex, type V3 } from '../art/lib/volumes';
import { COQ_PAL, ashlarWall, stringCourse, laves, lavesRidge, flagstones, limePlaster } from '../art/proposals/coq-pierre';
import { withBays, crossWindow, archDoor, type Bay } from '../art/proposals/coq-baies';
import { verdure, tenture } from '../art/proposals/coq-tentures';
import { sillGrid } from '../art/world/sill-walls';
import { silhouette } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 4;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const DUSK: Rgb = [58, 48, 40];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];
const pal = COQ_PAL;

// ---------- rendu ----------

/** Une scène rendue : sa grille et la place (à l'écran du jeu) de son coin haut-gauche. */
interface Shot { grid: Grid; ox: number; oy: number }
function shoot(quads: Quad[]): Shot {
  let x0 = Infinity, y0 = Infinity;
  for (const q of quads) for (const p of [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)] as V3[]) {
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1] - p[2]);
  }
  return { grid: renderPiece(quads), ox: Math.floor(x0), oy: Math.floor(y0) };
}

type Item = { grid: Grid; x: number; y: number; palette?: Palette };
interface Block { title: string[]; items: Item[]; notes: string[]; bg?: Rgb }

const xg = xeros.animations['idle-down'].frames[0];
const xs = silhouette(xg, xeros.palette);
/** Xéros, les pieds sur la rangée `ground` (de l'image du bloc), à l'abscisse x. */
const xerosAt = (x: number, ground: number): Item => ({ grid: xg, x: x - xs.x, y: ground - (xs.y + xs.h) + 1, palette: xeros.palette });

/** Une scène posée dans un bloc, son sol sud (y = `south`, z = 0) sur la rangée renvoyée. */
function place(s: Shot, x: number, y: number, south: number): { item: Item; ground: number } {
  return { item: { grid: s.grid, x, y }, ground: y + (south - s.oy) - 1 };
}

// ---------- 1. les murs ----------

const W1 = 48, FACE1 = 60, THICK = 12;
const WALL = part('mur', 1, '~', 'full');
const CORDON = part('cordon', 2, '~', 'thin');

/** Le parement en moyen appareil : 2,40 m de long, 3 m de haut, l'angle ouest en harpe, le cordon à 2,70-2,90 m. */
function moyenAppareil(): Block {
  const q = [
    ...box(0, W1, 0, THICK, 0, FACE1, WALL, ashlarWall(31, { quoins: ['left'] })),
    ...box(0, W1, THICK, THICK + 1, 54, 58, CORDON, stringCourse()),
  ];
  const s = shoot(q);
  const p = place(s, 0, 0, THICK + 1);
  return {
    title: ['1A. MOYEN APPAREIL (PROPOSE)', '2,40 X 3 M, MUR DE 60 CM'],
    items: [{ ...p.item, grid: withGroundShadow(p.item.grid) }, xerosAt(W1 + 6, p.ground)],
    notes: ['ASSISES DE 30 CM, BLOCS 50 A 90 CM', 'CHAINE D ANGLE EN HARPE A L OUEST', 'CORDON A 2,70-2,90 M'],
  };
}

/** Le petit appareil : le même mur avec l'image du jeu de la pierre de taille (assises de 15 cm, pierres de 40 cm). */
function petitAppareil(): Block {
  const img = gameImage('ashlar-ground'); // 9 × 6 : la pierre 8 × 5 (contour compris), l'ombre en plus
  const face = [img[2], img[3], img[4]].map((r) => r.slice(0, 8)); // la face sud : 2 rangées, et le contour du bas (le joint)
  const top = [img[0], img[1], img[1], img[1]].map((r) => r.slice(0, 8)); // le dessus d'une pierre de 20 cm de lit
  const tex: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') { const r = Math.floor(j / 4); return top[j % 4][(i + (r % 2) * 4) % 8]; }
    const k = Math.floor(j / 3);
    return face[2 - (j % 3)][(i + (k % 2) * 4) % 8];
  };
  const q = [...box(0, W1, 0, THICK, 0, FACE1, WALL, tex), ...box(0, W1, THICK, THICK + 1, 54, 58, CORDON, stringCourse())];
  const s = shoot(q);
  const p = place(s, 0, 0, THICK + 1);
  return {
    title: ['1B. PETIT APPAREIL (LA PIERRE DE TAILLE DU JEU)', '2,40 X 3 M, MEME CORDON'],
    items: [{ ...p.item, grid: withGroundShadow(p.item.grid) }, xerosAt(W1 + 6, p.ground)],
    notes: ['ASHLAR 40 X 20 X 15 CM : ASSISES DE 15 CM', 'LE RISQUE : SE LIRE COMME DE LA BRIQUE'],
  };
}

/** Le morceau de solin brut de la maison de Xéros, l'image du jeu, pour le contraste. */
function solinBrut(): Block {
  const g = sillGrid('rough-sill-wall', 0, 0);
  const sil = silhouette(g, pal);
  return {
    title: ['1C. LA PIERRE BRUTE (MAISON DE XEROS)', 'SOLIN 1,60 X 0,40 M (IMAGE DU JEU)'],
    items: [{ grid: g, x: 0, y: 40 }, xerosAt(sil.w + 6, 40 + sil.y + sil.h - 1)],
    notes: ['PIERRES BRUTES, JOINTS DE TERRE'],
  };
}

// ---------- 2. les fenêtres ----------

/** Un pan de mur de l'étage percé d'une croisée (1 × 1,60 m, appui à 90 cm) ou du rez-de-chaussée (demi-croisée 1 × 1,40 m). */
function fenetre(kind: 'cross' | 'half', open: boolean, seed: number): Block {
  const W = 40, H = 56, x = 10, w = 20, sill = 18, h = kind === 'cross' ? 32 : 28, low = kind === 'cross' ? 17 : 18;
  const bay: Bay = { s0: x, s1: x + w, t0: sill, t1: sill + h, seed };
  const q = [
    ...box(0, W, 0, THICK, 0, H, WALL, withBays(ashlarWall(seed), [bay])),
    ...crossWindow({ x, face: THICK, z: sill, w, h, kind, low, open }),
  ];
  const s = shoot(q);
  const p = place(s, 0, 0, THICK + 1);
  const name = kind === 'cross' ? 'CROISEE DE L ETAGE' : 'DEMI-CROISEE DU REZ-DE-CHAUSSEE';
  return {
    title: [`2${kind === 'cross' ? 'A' : 'B'}. ${name}`, `${kind === 'cross' ? '1 X 1,60 M' : '1 X 1,40 M'}, APPUI A 0,90, ${open ? 'VOLETS OUVERTS' : 'VOLETS FERMES'}`],
    items: [{ ...p.item, grid: withGroundShadow(p.item.grid) }, xerosAt(W + 6, p.ground)],
    notes: kind === 'cross'
      ? ['MENEAU ET TRAVERSE DE 15 CM', 'EN HAUT : LOSANGES PLOMBES', 'EN BAS : VOLETS DU DEDANS']
      : ['UNE TRAVERSE, BARREAUX DE FER', 'EN HAUT : LOSANGES PLOMBES', 'EN BAS : VOLETS DU DEDANS'],
  };
}

// ---------- 3. la porte ----------

function porte(): Block {
  const W = 50, H = 60, w = 22, x = 14, h = 44;
  const bay: Bay = { s0: x, s1: x + w, t0: 0, t1: h, arch: true, seed: 2 };
  const q = [
    ...box(0, W, 0, THICK, 0, H, WALL, withBays(ashlarWall(47, { quoins: ['right'] }), [bay])),
    ...box(0, W, THICK, THICK + 1, 54, 58, CORDON, stringCourse()),
    ...archDoor({ x, face: THICK, w, h }),
  ];
  const s = shoot(q);
  const p = place(s, 0, 0, THICK + 1);
  return {
    title: ['3. LA PORTE D ENTREE EN ARC', '1,10 X 2,20 M, PLEIN CINTRE'],
    items: [{ ...p.item, grid: withGroundShadow(p.item.grid) }, xerosAt(W + 6, p.ground)],
    notes: ['CLAVEAUX CHANFREINES', 'UN COQ SCULPTE SUR LA CLEF', 'CHENE CLOUTE, HEURTOIR'],
  };
}

// ---------- 4. le toit ----------

const ROOF = part('laves', 2, '"', 'full');
const RIDGE = part('faitage', 3, '?', 'full');

/** Un morceau de pan en laves, 2 m de large, 1,50 m le long de la pente, à 45°, et le faîtage de pierre au-dessus. */
function toit(): Block {
  const W = 40, L = 30, d = L / Math.SQRT2;
  const Y0 = 40, Z0 = 4; // l'égout
  const Yr = Y0 - d, Zr = Z0 + d;
  const slope: Quad = { o: [0, Y0, Z0], u: [W, 0, 0], v: [0, -d, d], n: [0, Math.SQRT1_2, Math.SQRT1_2], part: ROOF, tex: laves(5), face: 'slope' };
  const eave: Quad = { o: [0, Y0, Z0 - 3], u: [W, 0, 0], v: [0, 0, 3], n: [0, 1, 0], part: ROOF, tex: laves(5), face: 'edge' };
  const ridge = polyPrism(0, W, [[Yr + 2.5, Zr - 2.5], [Yr + 1.5, Zr + 1.5], [Yr - 1.5, Zr + 1.5], [Yr - 2.5, Zr - 2.5]], RIDGE, lavesRidge());
  const s = shoot([slope, eave, ...ridge]);
  const p = place(s, 0, 0, Y0);
  return {
    title: ['4. LE TOIT EN LAVES', 'PAN 2 X 1,50 M A 45 DEGRES'],
    items: [p.item, xerosAt(W + 6, p.ground)],
    notes: ['LAUZES DE CALCAIRE A SEC', 'RANGS DE 15 A 25 CM, MOUSSE', 'FAITAGE DE PIERRE'],
  };
}

// ---------- 5. les tentures ----------

const ROD = part('tringle', 5, '_', 'none');
const CLOTH = part('laine', 4, 'K', 'none');

/** Une image pendue au mur, devant sa face sud (y = `face`), son bas à z0. */
function hung(g: Grid, x: number, face: number, z0: number): Quad[] {
  const w = g[0].length, h = g.length;
  const tex: Tex = (s, t, c) => {
    if (c.face === 'top') return null;
    const ch = g[h - 1 - Math.floor(t)]?.[Math.floor(s)];
    return !ch || ch === '.' ? null : ch;
  };
  // la tringle de fer, un pixel au-dessus, qui dépasse de 10 cm de chaque côté, ses deux pattes scellées ; les anneaux
  const rod: Tex = (_s, _t, c) => (c.face === 'top' ? '-' : '_');
  const q: Quad[] = [...box(x, x + w, face, face + 1, z0, z0 + h, CLOTH, tex), ...box(x - 2, x + w + 2, face, face + 1, z0 + h + 1, z0 + h + 2, ROD, rod)];
  for (let i = 1; i < w; i += 8) q.push(...box(x + i, x + i + 2, face, face + 1, z0 + h, z0 + h + 1, ROD, () => '-'));
  for (const bx of [x - 2, x + w + 1]) q.push(...box(bx, bx + 1, face, face + 1, z0 + h, z0 + h + 2, ROD, () => '_'));
  return q;
}

const PLASTER = part('enduit', 1, '=', 'full');
const FLOOR = part('sol', 0, ';', 'none');

/** Le mur nord de la salle, vu de dedans (sa face sud, enduite), la verdure pendue, le dallage devant. */
function salle(): Block {
  const W = 64, H = 52, Y = THICK, F = 22, tap = verdure();
  const q = [
    ...box(0, W, 0, Y, 0, H, PLASTER, limePlaster(3)),
    ...box(0, W, Y, Y + F, -1, 0, FLOOR, flagstones(9)),
    ...hung(tap, 8, Y, 14),
  ];
  const s = shoot(q);
  const p = place(s, 0, 0, Y + F);
  return {
    title: ['5A. LA VERDURE DE LA SALLE', 'TAPISSERIE 2,40 X 1,60 M, MUR NORD'],
    items: [p.item, xerosAt(W - 18, p.ground - 6)],
    notes: ['LAINE : FEUILLAGES, BORDURE, LE COQ', 'TRINGLE DE FER, ANNEAUX', 'ENDUIT DE CHAUX, DALLAGE'],
    bg: DUSK,
  };
}

/** Le plancher de l'étage : des planches de 25 cm d'est en ouest, joints, bouts décalés. */
const planks: Tex = (s, t) => {
  const i = Math.floor(s), j = Math.floor(t), r = Math.floor(j / 5);
  if (j % 5 === 4) return '@';
  const off = (r * 17) % 40;
  if ((i + off) % 40 === 0) return '@';
  return j % 5 === 0 ? '^' : (i + r * 3) % 9 < 3 ? '%' : '*';
};

/** Le mur nord de la chambre, la tenture pendue, le plancher devant. */
function chambre(): Block {
  const W = 48, H = 52, Y = THICK, F = 22;
  const q = [
    ...box(0, W, 0, Y, 0, H, PLASTER, limePlaster(5)),
    ...box(0, W, Y, Y + F, -1, 0, FLOOR, planks),
    ...hung(tenture(), 8, Y, 18),
  ];
  const s = shoot(q);
  const p = place(s, 0, 0, Y + F);
  return {
    title: ['5B. LA TENTURE DE LA CHAMBRE', '1,60 X 1,20 M, MUR NORD'],
    items: [p.item, xerosAt(W - 14, p.ground - 6)],
    notes: ['LAINE A LA GARANCE, BORDURE BLEUE', 'PLANCHER DE L ETAGE'],
    bg: DUSK,
  };
}

// ---------- la planche ----------

function render(rows: Block[][], head: string[]): PNG {
  const PAD = 16, GAP = 20;
  const measure = (b: Block) => {
    const w = Math.max(...b.items.map((i) => i.x + i.grid[0].length)) * K;
    const h = Math.max(...b.items.map((i) => i.y + i.grid.length)) * K;
    const tw = Math.max(...[...b.title, ...b.notes].map((l) => textWidth(l, T)));
    return { w: Math.max(w, tw), h, imgW: w, th: b.title.length * 12 + 8, nh: b.notes.length * 12 + 10 };
  };
  const ms = rows.map((r) => r.map((b) => ({ b, m: measure(b) })));
  const rowH = ms.map((r) => Math.max(...r.map(({ m }) => m.th)) + Math.max(...r.map(({ m }) => m.h)) + Math.max(...r.map(({ m }) => m.nh)) + GAP);
  const width = PAD * 2 + Math.max(...head.map((l) => textWidth(l, T)), ...ms.map((r) => r.reduce((s, { m }) => s + m.w + GAP * 2, 0)));
  const height = 16 + head.length * 12 + 8 + rowH.reduce((a, b) => a + b, 0);
  const sheet = new Sheet(width, height, GRASS);
  head.forEach((l, i) => sheet.text(l, PAD, 12 + i * 12, i ? WHITE : GOLD, T));
  let y = 16 + head.length * 12 + 8;
  ms.forEach((r, ri) => {
    let x = PAD;
    const maxTh = Math.max(...r.map(({ m }) => m.th));
    const maxH = Math.max(...r.map(({ m }) => m.h));
    for (const { b, m } of r) {
      b.title.forEach((l, i) => sheet.text(l, x, y + i * 12, i === 0 ? GOLD : WHITE, T));
      const oy = y + maxTh + maxH - m.h;
      if (b.bg) sheet.rect(x - 4, oy - 4, b.items[0].grid[0].length * K + 8, m.h + 8, b.bg);
      for (const it of b.items) sheet.blit(it.grid, it.palette ?? pal, x + it.x * K, oy + it.y * K, K);
      b.notes.forEach((l, i) => sheet.text(l, x, y + maxTh + maxH + 8 + i * 12, i === 0 ? WHITE : GREY, T));
      x += m.w + GAP * 2;
    }
    y += rowH[ri];
  });
  return sheet.png;
}

function main() {
  const head = [
    'MAISON DU COQ : LA PIERRE TAILLEE, LES BAIES, LES LAVES, LES TENTURES (X4, 5 CM PAR PIXEL)',
    'VUS COMME LE JEU : FACE SUD EN VRAIE GRANDEUR, DESSUS EN VRAIE GRANDEUR AU-DESSUS (PIECES DE BATIMENT). XEROS : 1,60 M',
  ];
  const rows: Block[][] = [
    [moyenAppareil(), petitAppareil(), solinBrut()],
    [fenetre('cross', false, 11), fenetre('cross', true, 12), fenetre('half', false, 13), fenetre('half', true, 14)],
    [porte(), toit(), salle(), chambre()],
  ];
  const out = join(ROOT, '.art-preview', 'coq-pierre-tapisserie.png');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(render(rows, head)));
  console.log(`coq-pierre-tapisserie -> ${out}`);
}

main();
