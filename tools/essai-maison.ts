// Essai de la petite maison de pierre (chantier « bâtiments ») : npx tsx tools/essai-maison.ts écrit .art-preview/essai-maison.png.
//
// Rien ici n'entre dans le jeu : des propositions côte à côte, pour que Grégoire juge le mur haut avant toute intégration.
// Les murs sont montés par l'algorithme des murs (src/world/walls.ts), dans sa copie d'essai art/proposals/walls-high.ts (qui
// ajoute les têtes aux deux bouts, les ouvertures et le dessus en vraie grandeur), avec les dessins mêmes des pierres du jeu
// (art/items/stones.ts) ; le linteau est l'image du jeu de la pièce de bois (art/world/wood-pieces.ts, `composeWood` : le rondin
// du normal à deux faces dressées). Mur de 50 cm d'épaisseur, 2,40 m de face (48 rangées), deux manières : le brut (pierres
// brutes, joints de terre) et le taillé (moellons hourdés au mortier, en assises).
//
// La perspective, deux propositions (la question de l'essai) :
//   A. le dessus de l'est-ouest en raccourci (5 rangées pour 50 cm, comme le solin) ;
//   B. le dessus en vraie grandeur (10 rangées : la règle des pièces de bâtiment au sol, H + D, STYLE.md section 8), celle qui
//      raccorde sans tricher le nord-sud en bande mince (projection (x, y − z) du mode construction).
// Le nord-sud est toujours la bande mince : son dessus, 10 px de large, sur toute sa longueur au sol, décalé de 48 rangées vers
// le haut ; son bout sud, s'il est libre, est sa tête vue de face (10 × 48).
// Planches x4 sur de l'herbe, grille des cases (32 px du jeu, 1,60 m).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { stonePalette } from '../art/items/stones';
import { gameImage } from '../art/lib/walls';
import { wallKit, type Hole, type WallKind } from '../art/proposals/walls-high';
import { composeWood } from '../art/world/wood-pieces';
import { silhouette } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 4;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const GRID: Rgb = [110, 120, 60];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];
const pal = stonePalette;
const kit = wallKit(gameImage);

const FACE = 48; // 2,40 m
const THICK = 10; // 50 cm au sol
const TOP_A = 5; // dessus en raccourci
const TOP_B = 10; // dessus en vraie grandeur
const EMPTY = '.';

// ---------- les pièces ----------

/** Le linteau : le rondin du normal à deux faces dressées (hewn 6 : 3 coups par face), sa silhouette (8 rangées, 40 cm). */
function lintel(cm: number): Grid {
  const g = composeWood({ size: 'normal', shape: 'round', axis: 'ew', length: cm, hewn: 6 }).toGrid();
  const s = silhouette(g, pal);
  return g.slice(s.y, s.y + s.h).map((r) => r.slice(s.x, s.x + s.w));
}

/** Colle `g` dans `dst` en (x, y) ; `fill` : ce qui remplace ses pixels vides (les coins arrondis du rondin). */
function paste(dst: string[][], g: Grid, x: number, y: number, fill?: string): void {
  g.forEach((row, j) => [...row].forEach((ch, i) => {
    if (dst[y + j]?.[x + i] === undefined) return;
    if (ch !== EMPTY) dst[y + j][x + i] = ch;
    else if (fill) dst[y + j][x + i] = fill;
  }));
}

interface Opening {
  /** Baie : colonnes x0 à x1 exclu ; bas de la baie à `sill` rangées du sol (0 : une porte), hauteur `h` (rangées). */
  x0: number; x1: number; sill: number; h: number;
  /** Linteau : longueur en cm (porté de 20 cm de chaque côté). */
  lintelCm: number;
}

/**
 * Un mur est-ouest de `W` px, face de 48, dessus `top`, ses deux têtes finies, ses ouvertures : la baie et la place du linteau
 * sont des obstacles pour l'algorithme, le linteau se colle ensuite ; une fenêtre reçoit son appui (le dessus de l'allège, une
 * bande de dessus de moellons, de la profondeur du dessus du mur).
 */
function ewWall(kind: WallKind, seed: number, W: number, top: number, openings: Opening[] = []): Grid {
  const ground = top + FACE - 1;
  const holes: Hole[] = [];
  for (const o of openings) {
    const lw = o.lintelCm / 5, lx = o.x0 - (lw - (o.x1 - o.x0)) / 2;
    const y1 = o.sill === 0 ? ground + 1 : ground - o.sill + 1;
    const y0 = y1 - o.h;
    holes.push({ x0: o.x0, x1: o.x1, y0, y1, kind: 'void' });
    holes.push({ x0: lx, x1: lx + lw, y0: y0 - 8, y1: y0, kind: 'lintel' });
  }
  const g = kit.highWall(kind, seed, { length: W, face: FACE, top }, { left: 'head', right: 'head', holes }).map((r) => [...r]);
  openings.forEach((o, i) => {
    const l = holes[i * 2 + 1];
    paste(g, lintel(o.lintelCm), l.x0, l.y0, 'o');
    if (o.sill > 0) {
      // l'appui : une pierre d'appui d'un seul morceau, son dessus vu par la fenêtre (`top` rangées, comme le dessus du mur) :
      // le fond (contre le dedans) dans l'ombre, le dessus clair, l'arête sud au soleil, le bout est à l'ombre
      const w = o.x1 - o.x0, d = Math.min(top, o.h - 4), y = holes[i * 2].y1 - d;
      for (let j = 0; j < d; j++) for (let k = 0; k < w; k++) {
        g[y + j][o.x0 + k] = j === 0 ? '~' : j === d - 1 ? '!' : k === w - 1 ? '=' : '+';
      }
    }
  });
  return g.map((r) => r.join(''));
}

/**
 * La bande nord-sud : le dessus du mur (10 px de large) sur `rows` rangées, contour arrière au nord ; la colonne d'ombre à l'est.
 * Avec `head`, la tête du bout sud vue de face (10 × 48) au bas de la bande.
 */
function nsBand(kind: WallKind, seed: number, rows: number, head: boolean): Grid {
  const g = kit.highWall(kind, seed, { length: THICK, face: head ? FACE : 4, top: rows + 4, axis: 'ns' }, { left: 'head', right: 'head' });
  return head ? g : g.slice(0, rows);
}

// ---------- la planche ----------

type Item = { grid: Grid; x: number; y: number; palette?: Record<string, string> };
interface Block { title: string[]; items: Item[]; notes: string[] }

const xg = xeros.animations['idle-down'].frames[0];
const xs = silhouette(xg, xeros.palette);
/** Xéros, les pieds au sol `ground` (rangée du jeu), à l'abscisse x. */
const xerosAt = (x: number, ground: number): Item => ({ grid: xg, x: x - xs.x, y: ground - (xs.y + xs.h) + 1, palette: xeros.palette });

const size = (g: Grid) => { const s = silhouette(g, pal); return `${s.w}X${s.h} PX = ${s.w * 5}X${s.h * 5} CM`; };

function render(blocks: Block[][], head: string): PNG {
  const PAD = 16, GAP = 24;
  const measure = (b: Block) => {
    const w = Math.max(...b.items.map((i) => i.x + i.grid[0].length)) * K;
    const h = Math.max(...b.items.map((i) => i.y + i.grid.length)) * K;
    const tw = Math.max(...[...b.title, ...b.notes].map((l) => textWidth(l, T)));
    return { w: Math.max(w, tw), h, imgW: w, th: b.title.length * 12 + 8, nh: b.notes.length * 12 + 10 };
  };
  const rows = blocks.map((r) => r.map((b) => ({ b, m: measure(b) })));
  const rowH = rows.map((r) => Math.max(...r.map(({ m }) => m.th + m.h + m.nh)) + GAP);
  const width = PAD * 2 + Math.max(textWidth(head, T), ...rows.map((r) => r.reduce((s, { m }) => s + m.w + GAP * 2, 0)));
  const height = 36 + rowH.reduce((a, b) => a + b, 0);
  const sheet = new Sheet(width, height, GRASS);
  for (let x = 0; x < width; x += 32 * K) sheet.rect(x, 0, 1, height, GRID);
  for (let y = 0; y < height; y += 32 * K) sheet.rect(0, y, width, 1, GRID);
  sheet.text(head, PAD, 12, GOLD, T);
  let y = 36;
  rows.forEach((r, ri) => {
    let x = PAD;
    const maxTh = Math.max(...r.map(({ m }) => m.th));
    const maxH = Math.max(...r.map(({ m }) => m.h));
    for (const { b, m } of r) {
      b.title.forEach((l, i) => sheet.text(l, x, y + i * 12, i === 0 ? GOLD : WHITE, T));
      const oy = y + maxTh + maxH - m.h; // les images d'une rangée sur le même bas
      for (const it of b.items) sheet.blit(it.grid, it.palette ?? pal, x + it.x * K, oy + it.y * K, K);
      b.notes.forEach((l, i) => sheet.text(l, x, y + maxTh + maxH + 8 + i * 12, i === 0 ? WHITE : GREY, T));
      x += m.w + GAP * 2;
    }
    y += rowH[ri];
  });
  return sheet.png;
}

// ---------- les propositions ----------

const KINDS: [WallKind, string][] = [['dressed', 'TAILLE (MOELLONS HOURDES)'], ['rough', 'BRUT (PIERRES BRUTES)']];

/** 1. Le mur plein de 3,20 × 2,40 m, ses deux têtes. */
function plain(kind: WallKind, label: string, seed: number): Block {
  const g = ewWall(kind, seed, 64, TOP_A);
  return {
    title: [`1. MUR PLEIN, ${label}`, '3,20 X 2,40 M, DESSUS 5 RANGEES (A)'],
    items: [{ grid: g, x: 0, y: 0 }, xerosAt(70, g.length - 2)],
    notes: [size(g), 'TETE CHAINEE AUX DEUX BOUTS'],
  };
}

/** 2. La porte : 1 m de large, 2 m (ou 1,80 m) de haut, linteau de 1,40 m. */
function door(kind: WallKind, label: string, seed: number, h: number): Block {
  const g = ewWall(kind, seed, 64, TOP_A, [{ x0: 22, x1: 42, sill: 0, h, lintelCm: 140 }]);
  const above = (FACE - h - 8) * 5;
  return {
    title: [`2. PORTE ${h * 5 / 100} M, ${label}`, `1 X ${String(h * 5 / 100).replace('.', ',')} M, LINTEAU 1,40 M`],
    items: [{ grid: g, x: 0, y: 0 }, xerosAt(70, g.length - 2)],
    notes: [size(g), above > 0 ? `${above} CM DE MACONNERIE SUR LE LINTEAU` : 'RIEN SUR LE LINTEAU : 2 + 0,40 = 2,40 M'],
  };
}

/** 3. La fenêtre : 60 × 80 cm, allège de 80 cm, linteau de 1 m. */
function windowWall(kind: WallKind, label: string, seed: number): Block {
  const g = ewWall(kind, seed, 64, TOP_A, [{ x0: 26, x1: 38, sill: 16, h: 16, lintelCm: 100 }]);
  return {
    title: [`3. FENETRE, ${label}`, '0,60 X 0,80 M, ALLEGE 0,80, LINTEAU 1 M'],
    items: [{ grid: g, x: 0, y: 0 }, xerosAt(70, g.length - 2)],
    notes: [size(g), '40 CM DE MACONNERIE SUR LE LINTEAU', 'APPUI : LE DESSUS DE L ALLEGE'],
  };
}

/**
 * 4. L'angle sud-ouest vu du sud : l'est-ouest de 3,20 m, le nord-sud de 3,20 m (angle compris) qui part vers le nord, en bande.
 * La bande va du bord nord du nord-sud (projeté) au haut de la face de l'est-ouest : elle couvre le carré d'angle.
 */
function corner(kind: WallKind, label: string, seed: number, top: number): Block {
  const ew = ewWall(kind, seed, 64, top);
  const G = 64; // longueur au sol du nord-sud, carré d'angle compris
  const rows = G - (THICK - top); // B : 64 ; A : 59 (la bande raccourcie de ce que le dessus a perdu)
  const band = nsBand(kind, seed + 5, rows, false);
  const ewY = rows - top; // le haut de la face de l'est-ouest = le bas de la bande
  return {
    title: [`4${top === TOP_A ? 'A' : 'B'}. ANGLE SUD-OUEST, ${label}`, top === TOP_A ? 'DESSUS RACCOURCI (5)' : 'DESSUS EN VRAIE GRANDEUR (10)'],
    items: [{ grid: ew, x: 0, y: ewY }, { grid: band, x: 0, y: 0 }, xerosAt(72, ewY + top + FACE - 1)],
    notes: [`EST-OUEST ${size(ew)}`, `BANDE NORD-SUD ${silhouette(band, pal).w}X${silhouette(band, pal).h} PX`,
      top === TOP_A ? 'BANDE DECALEE DE 5 RANGEES' : 'RACCORD EXACT, SANS TRICHE'],
  };
}

/**
 * 5. La maison entière sans toit, 6,40 (est-ouest) × 5,80 m (nord-sud) hors oeuvre, vue comme le jeu la montre : le mur nord,
 * les deux bandes nord-sud (qui couvrent les carrés d'angle du nord), le mur sud (porte de 2 m et fenêtre) devant, Xéros à côté.
 */
function house(kind: WallKind, label: string, seed: number, top: number): Block {
  const W = 128, D = 116;
  const north = ewWall(kind, seed, W, top);
  const south = ewWall(kind, seed + 1, W, top, [
    { x0: 30, x1: 50, sill: 0, h: 40, lintelCm: 140 },
    { x0: 84, x1: 96, sill: 16, h: 16, lintelCm: 100 },
  ]);
  const rows = D - (THICK - top);
  // au sol : le mur nord de 0 à 10, le mur sud de D - 10 à D ; à l'écran, y − 48
  const southFace = D - FACE; // haut de la face sud, rangée de l'écran, origine au bord nord au sol
  const northY = THICK - FACE - top; // haut de l'image du mur nord
  const bandY = southFace - rows;
  const o = -Math.min(northY, bandY); // décalage pour que tout soit dans l'image
  const items: Item[] = [
    { grid: north, x: 0, y: northY + o },
    { grid: nsBand(kind, seed + 2, rows, false), x: 0, y: bandY + o },
    { grid: nsBand(kind, seed + 3, rows, false), x: W - THICK, y: bandY + o },
    { grid: south, x: 0, y: southFace - top + o },
    xerosAt(W + 8, D - 1 + o),
  ];
  return {
    title: [`5${top === TOP_A ? 'A' : 'B'}. LA MAISON, ${label}`, `6,40 X 5,80 M, MURS DE 2,40 M, ${top === TOP_A ? 'DESSUS RACCOURCI' : 'DESSUS VRAIE GRANDEUR'}`],
    items,
    notes: [`EMPRISE ${W}X${D} PX AU SOL, IMAGE ${W}X${D + FACE - (THICK - top)} PX`, 'PORTE 1 X 2 M, FENETRE 0,60 X 0,80 AU SUD'],
  };
}

/**
 * 6. La souche de cheminée : 60 × 60 cm, 80 cm hors du toit (12 × 16 de face), le conduit (30 × 30 cm) noir sur le dessus ;
 * avec ou sans dalle de couronnement (un débord de 5 cm). Posée sur un pan de chaume esquissé (aplat de la rampe du chaume).
 */
function chimney(kind: WallKind, label: string, seed: number, cap: boolean, top: number): Block {
  const g = kit.highWall(kind, seed, { length: 12, face: 16, top }, { left: 'head', right: 'head' }).map((r) => [...r]);
  // le conduit : 6 × 3 (raccourci) ou 6 × 6, au milieu du dessus ; sa paroi nord, vue de haut, à l'ombre
  const fd = top === TOP_A + 1 ? 3 : 6, fy = Math.floor((top - fd) / 2) + 0;
  let out = g;
  if (cap) {
    // la dalle : 14 × (2 de face + le dessus), débord d'un pixel ; posée sur la souche
    const cw = 14, ch = top + 2;
    const slab: string[][] = Array.from({ length: ch }, (_, j) => Array.from({ length: cw }, (_, i) =>
      (j === ch - 1 || i === cw - 1 ? 'o' : j === 0 || i === 0 ? '~' : j >= top ? '=' : (i + j) % 7 === 3 ? '=' : '+')));
    for (let i = 1; i < cw - 1; i++) slab[top - 1][i] = '!'; // l'arête au soleil
    for (let j = top; j < ch - 1; j++) slab[j][cw - 2] = ';';
    const H = g.length + 2;
    out = Array.from({ length: H }, () => Array(cw + 1).fill(EMPTY));
    // la souche sous la dalle : la face de la souche commence sous la dalle
    g.slice(top).forEach((row, j) => row.forEach((c, i) => { if (c !== EMPTY) out[ch + j - 2 + 2][i + 1] = c; }));
    slab.forEach((row, j) => row.forEach((c, i) => { out[j][i] = c; }));
    for (let i = 4; i < 10; i++) for (let j = fy; j < fy + fd; j++) out[j][i] = j === fy ? ';' : 'o';
  } else {
    for (let i = 3; i < 9; i++) for (let j = fy; j < fy + fd; j++) out[j][i] = j === fy ? ';' : 'o';
  }
  const stack = out.map((r) => r.join(''));
  // le pan de chaume esquissé : 40 × 14, rangées de la rampe, la souche plantée dedans (son pied caché de 3 rangées)
  const roof: Grid = Array.from({ length: 14 }, (_, j) => Array.from({ length: 40 }, (_, i) =>
    j === 0 ? 'P' : (i * 3 + j * 5) % 11 < 2 ? 'T' : j < 4 ? 'Y' : j < 9 ? 't' : 'T').join(''));
  const sx = 14, sy = 0;
  const roofY = stack.length - 4;
  return {
    title: [`6${cap ? 'B' : 'A'}. SOUCHE DE CHEMINEE, ${label}`, `60 X 60 CM, 80 CM HORS DU TOIT${cap ? ', DALLE' : ''}`],
    items: [{ grid: stack, x: sx, y: sy }, { grid: roof, x: 0, y: roofY }, { grid: stack.slice(roofY - sy), x: sx, y: roofY }],
    notes: [size(stack), 'TOIT : ESQUISSE EN APLAT'],
  };
}

function main() {
  const head = 'ESSAI : LA PETITE MAISON DE PIERRE (X4, CASE 1,60 M) - MUR DE 50 CM, 2,40 M DE FACE (48 RANGEES)';
  const sheets: Record<string, Block[][]> = {
    'essai-maison': [
      KINDS.map(([k, l], i) => plain(k, l, 11 + i)),
      [...KINDS.map(([k, l], i) => door(k, l, 21 + i, 40)), ...KINDS.map(([k, l], i) => door(k, l, 23 + i, 36))],
      KINDS.map(([k, l], i) => windowWall(k, l, 31 + i)),
      [...KINDS.map(([k, l], i) => corner(k, l, 41 + i, TOP_A)), ...KINDS.map(([k, l], i) => corner(k, l, 41 + i, TOP_B))],
      [house('dressed', 'TAILLE', 51, TOP_B), house('rough', 'BRUT', 52, TOP_B)],
      [house('dressed', 'TAILLE', 51, TOP_A)],
      [chimney('dressed', 'TAILLE', 61, false, 6), chimney('dressed', 'TAILLE', 61, true, 6), chimney('rough', 'BRUT', 62, true, 6),
        chimney('dressed', 'TAILLE', 63, true, 12)],
    ],
  };
  for (const [name, blocks] of Object.entries(sheets)) {
    const out = join(ROOT, '.art-preview', `${name}.png`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, PNG.sync.write(render(blocks, head)));
    console.log(`${name} -> ${out}`);
  }
}

main();
