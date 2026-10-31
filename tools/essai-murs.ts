// Essai des murs de pierre (chantier « pierre ») : npx tsx tools/essai-murs.ts écrit .art-preview/essai-murs.png.
//
// Deux murs de 1,60 m de long sur 80 cm de haut (32 × 16 px de face, plus le dessus en trois quarts), montés par calcul à
// graine fixe avec les dessins mêmes des pierres du jeu (art/items/stones.ts, images au sol, ombre retirée), pour que
// Grégoire juge. Rien ici n'entre dans le jeu.
//   1. le mur brut : les pierres brutes (manière C) serrées, la pierre couvre l'essentiel de la face : grosses au pied (à plat
//      sur leur lit ou dressées sur deux hauteurs), moyennes à plat, de travers ou en biais, petites entières ou rognées et
//      éclats dans les vides ; joints de 1 à 2 px contours compris, la terre seulement dans les joints ;
//   2. le mur taillé : les moellons (manière B) des trois longueurs mêlées, quelques boutisses (le bout du moellon, sa vue
//      nord-sud), assises à peu près régulières, joints décalés, joints fins (le contour seul, ou un pixel de mortier).
// Une pierre dans le mur montre sa face sud : le dessin du jeu sans les rangées de son dessus (sauf la dernière, l'arête
// éclairée). Les pierres de l'assise haute gardent leur dessin entier : leur dessus fait le dessus du mur.
// Planche agrandie x4, sur la grille des cases (32 px du jeu, 1,60 m), avec Xéros ; deux graines par mur, une par rangée.
// Au-dessus de chaque mur, les pierres qui le composent (images au sol du jeu, nom, nombre) ; dessous, comment il est monté.
// Le calcul des murs est dans art/lib/walls.ts (partagé avec le morceau de solin du jeu, art/world/sill-walls.ts).
// Ne touche ni au jeu ni à src/generated/.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { stonePalette } from '../art/items/stones';
import { HEADER, ROUGH, RUBBLE, dressedWall, gameImage, roughWall, walls, type RunSpec, type Used } from '../art/lib/walls';
import { SILL_KEYS, VARIANTS, sillGrid, sillImage } from '../art/world/sill-walls';
import { silhouette } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 4;
const PAD = 12;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const GRID: Rgb = [110, 120, 60];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];
const pal = stonePalette;

// ---------- la planche ----------

const size = (g: Grid) => { const s = silhouette(g, pal); return `${s.w}X${s.h} PX`; };
const xg = xeros.animations['idle-down'].frames[0];
const xs = silhouette(xg, xeros.palette);

/**
 * Un bloc : le titre, les pierres du mur rangées par trois (image au sol du jeu, nom, nombre), une flèche, le mur, sa légende.
 * `right` : tout est calé à droite du bloc (le mur de gauche, contre Xéros).
 */
interface Block { w: number; h: number; ground: number; draw: (s: Sheet, x: number, y: number) => void }

const PER_ROW = 3;

function block(title: string[], wall: Grid, used: Used, lines: string[], right: boolean): Block {
  // dans l'ordre des pierres du jeu : grosses, moyennes, petites ; moellons du plus court au plus long, boutisse, éclats
  const order = [...ROUGH, ...RUBBLE, HEADER].map((p) => p.image).concat('stone-chips');
  const items = [...used.values()].sort((a, b) => order.indexOf(a.piece.image) - order.indexOf(b.piece.image));
  const cellW = Math.max(...items.map((it) => Math.max(gameImage(it.piece.image)[0].length * K, textWidth(it.piece.label, T)))) + 12;
  const imgH = Math.max(...items.map((it) => gameImage(it.piece.image).length)) * K;
  const cellH = imgH + 34;
  const nRows = Math.ceil(items.length / PER_ROW);
  const stonesW = Math.min(items.length, PER_ROW) * cellW - 12;
  const wallW = wall[0].length * K;
  const titleH = title.length * 12 + 6;
  const w = Math.max(stonesW, wallW, ...title.map((l) => textWidth(l, T)), ...lines.map((l) => textWidth(l, T)));
  const arrowY = titleH + nRows * cellH;
  const wallTop = arrowY + 18;
  const ground = wallTop + (wall.length - 1) * K; // la dernière rangée est l'ombre portée
  const at = (x: number, width: number) => (right ? x + w - width : x);
  return {
    w,
    h: ground + 14 + lines.length * 12,
    ground,
    draw: (s, x, y) => {
      title.forEach((l, i) => s.text(l, at(x, textWidth(l, T)), y + i * 12, i === 0 ? GOLD : WHITE, T));
      items.forEach((it, i) => {
        const g = gameImage(it.piece.image);
        const cx = at(x, stonesW) + (i % PER_ROW) * cellW;
        const cy = y + titleH + Math.floor(i / PER_ROW) * cellH;
        s.blit(g, pal, cx, cy + imgH - g.length * K, K);
        s.text(it.piece.label, cx, cy + imgH + 6, WHITE, T);
        s.text(`X ${it.n}`, cx, cy + imgH + 18, GOLD, T);
      });
      // la flèche : les pierres du dessus montent le mur du dessous
      s.text('V', at(x, wallW) + wallW / 2 - 4, y + arrowY, GOLD, T);
      s.blit(wall, pal, at(x, wallW), y + wallTop, K);
      lines.forEach((l, i) => s.text(l, at(x, textWidth(l, T)), y + ground + 10 + i * 12, i === 0 ? WHITE : GREY, T));
    },
  };
}

const GAP = 20;
const xerosW = xs.w * K + 2 * GAP;
const drawXeros = (s: Sheet, x: number, ground: number) => {
  s.blit(xg, xeros.palette, x + GAP - xs.x * K, ground - (xs.y + xs.h) * K, K);
  s.text('XEROS', x + GAP + (xs.w * K - textWidth('XEROS', T)) / 2, ground + 10, GOLD, T);
  s.text('1,60 M', x + GAP + (xs.w * K - textWidth('1,60 M', T)) / 2, ground + 22, GOLD, T);
};

const total = (u: Used) => [...u.values()].filter((e) => e.piece.image !== 'stone-chips').reduce((s, e) => s + e.n, 0);

function main() {
  const SEEDS = [1, 2];
  const rows = SEEDS.map((seed) => {
    const rough = roughWall(seed);
    const rs = rough.stats;
    const dressed = dressedWall(seed);
    return [
      block([`MUR BRUT, GRAINE ${seed}`,
        `${rs.big} GROSSES, ${rs.medium} MOYENNES`,
        `${rs.small + rs.trimmed} PETITES (${rs.trimmed} ROGNEES)`,
        `${rs.chips} ECLATS`], rough.grid, rough.used, [
        `1,60 X 0,80 M - ${size(rough.grid)}`,
        `PIERRE ${Math.round(rs.cover * 100)} %, TERRE ${100 - Math.round(rs.cover * 100)} %`,
        `GROSSES AU PIED, ${rs.upright} DEBOUT,`,
        `MOYENNES A PLAT, ${rs.across} DE TRAVERS,`,
        `${rs.tilted} EN BIAIS - PETITES ET ECLATS`,
        'CALES DANS LES VIDES - JOINTS DE',
        '1 A 2 PX, CONTOURS COMPRIS',
      ], true),
      block([`MUR TAILLE, GRAINE ${seed}`, `${total(dressed.used)} MOELLONS`], dressed.grid, dressed.used, [
        `1,60 X 0,80 M - ${size(dressed.grid)}`,
        '4 ASSISES DE 20 CM A PEU PRES,',
        'LONGUEURS MELEES ET BOUTISSES,',
        'JOINTS DECALES ET FINS : CONTOUR',
        'SEUL OU 1 PX DE TERRE, ECLATS',
      ], false),
    ];
  });
  const HEAD = 'PIERRE BRUTE > MUR BRUT    MOELLON > MUR TAILLE    (X4, CASE 1,60 M)';
  const rowH = (bs: Block[]) => Math.max(...bs.map((b) => b.h)) + 36;
  const width = PAD * 2 + Math.max(textWidth(HEAD, T), ...rows.map(([a, b]) => a.w + xerosW + b.w));
  const height = 40 + rows.reduce((s, bs) => s + rowH(bs), 0);
  const sheet = new Sheet(width, height, GRASS);
  for (let x = 0; x < width; x += 32 * K) sheet.rect(x, 0, 1, height, GRID);
  for (let y = 0; y < height; y += 32 * K) sheet.rect(0, y, width, 1, GRID);
  sheet.text(HEAD, PAD, 12, GOLD, T);
  let y = 40;
  for (const [a, b] of rows) {
    // les deux murs sur la même ligne de sol, Xéros entre les deux
    const ground = Math.max(a.ground, b.ground);
    a.draw(sheet, PAD, y + ground - a.ground);
    drawXeros(sheet, PAD + a.w, y + ground);
    b.draw(sheet, PAD + a.w + xerosW, y + ground - b.ground);
    y += rowH([a, b]);
  }
  const out = join(ROOT, '.art-preview', 'essai-murs.png');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  if (process.env.MURS_DUMP) for (const seed of SEEDS) {
    console.log(`brut ${seed}\n${roughWall(seed).grid.join('\n')}\ntaille ${seed}\n${dressedWall(seed).grid.join('\n')}`);
  }
  console.log(`essai-murs -> ${out}`);
  sills();
  enclosure();
}

/**
 * La planche des morceaux de solin du jeu (art/world/sill-walls.ts) : .art-preview/solins.png. Pour chaque solin, une rangée
 * par tirage (les VARIANTS), ses quatre vues côte à côte (r0, r1, r2, r3) sur la même ligne de sol, Xéros au bout de la
 * rangée ; au-dessus de chaque vue, sa taille mesurée (silhouette, ombre exclue).
 */
function sills() {
  const views = [0, 1, 2, 3];
  const wide = (v: number) => Math.max((v % 2 ? 13 : 32) * K, textWidth('R1 13X32', T)) + 20;
  const rowW = views.reduce((s, v) => s + wide(v), 0) + xerosW;
  const rowH = 32 * K + 56;
  const width = PAD * 2 + rowW * 2 + 40;
  const height = 60 + VARIANTS * rowH + 20;
  const sheet = new Sheet(width, Math.max(height, 200), GRASS);
  for (let x = 0; x < width; x += 32 * K) sheet.rect(x, 0, 1, sheet.h, GRID);
  for (let y = 0; y < sheet.h; y += 32 * K) sheet.rect(0, y, width, 1, GRID);
  sheet.text('MORCEAUX DE SOLIN : BRUT (GAUCHE), TAILLE (DROITE) - R0 R1 R2 R3 PAR TIRAGE (X4)', PAD, 12, GOLD, T);
  SILL_KEYS.forEach((key, ki) => {
    for (let k = 0; k < VARIANTS; k++) {
      const ground = 70 + k * rowH + 32 * K + 14;
      let x = PAD + ki * (rowW + 40);
      for (const v of views) {
        const g = sillGrid(key, k, v);
        const s = silhouette(g, pal);
        sheet.blit(g, pal, x, ground - (s.y + s.h) * K, K);
        sheet.text(`R${v} ${s.w}X${s.h}`, x, ground + 6, WHITE, T);
        if (v === 0) sheet.text(sillImage(key, k, 0).toUpperCase(), x, ground - 32 * K - 4, GREY, T);
        x += wide(v);
      }
      drawXeros(sheet, x - GAP, ground);
    }
  });
  const out = join(ROOT, '.art-preview', 'solins.png');
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`solins -> ${out}`);
}

/**
 * L'enceinte de solin (.art-preview/solin-enceinte.png) : les tronçons montés d'un seul tenant (src/world/walls.ts, `run`), posés
 * comme le jeu les pose (5 cm par pixel au sol ; un est-ouest a le bas de son image, ombre comprise, à son bord sud ; un
 * nord-sud a le haut de son image à son bout nord, règle D). Pour chaque manière : un rectangle de 4 × 3 morceaux (est-ouest
 * de 4 au nord et au sud, qui possèdent les quatre angles ; nord-sud de 3 entre eux, `abut` aux deux bouts, calés au ras du bord
 * extérieur), une porte au sud (un morceau absent : deux têtes) ; un angle tenu par le nord-sud (son bout sud) ; un tronçon
 * droit de 3 morceaux ; un morceau seul ; Xéros à côté. Agrandi x4.
 */
function enclosure() {
  type Place = { spec: Omit<RunSpec, 'kind' | 'seed'>; x: number; y: number }; // x, y : coin haut gauche de l'image, en px du jeu
  const ew = (pieces: number, start: RunSpec['start'], end: RunSpec['end'], x: number, south: number): Place =>
    ({ spec: { axis: 'ew', pieces, start, end }, x, y: south - 14 });
  const ns = (pieces: number, start: RunSpec['start'], end: RunSpec['end'], x: number, north: number): Place =>
    ({ spec: { axis: 'ns', pieces, start, end }, x, y: north });
  // l'enceinte : 6,40 × 5,80 m, coin nord-ouest en (0, 0) ; puis l'angle tenu par le nord-sud, le droit, le seul
  const scene: Place[] = [
    ew(4, 'corner-s', 'corner-s', 0, 10),
    ns(3, 'abut', 'abut', 0, 10),
    ns(3, 'abut', 'abut', 128 - 13, 10),
    ew(2, 'corner-n', 'head', 0, 116),
    ew(1, 'head', 'corner-n', 96, 116),
    ns(2, 'head', 'corner-e', 150, 0),
    ew(2, 'abut', 'head', 160, 64),
    ew(3, 'head', 'head', 150, 100),
    ew(1, 'head', 'head', 150, 140),
  ];
  const groundW = 260, groundH = 150;
  const ox = 8, oy = 10; // marge en px du jeu
  const kinds: RunSpec['kind'][] = ['rough', 'dressed'];
  const blockH = (groundH + oy + 12) * K;
  const sheet = new Sheet((groundW + ox * 2) * K + 40, 40 + kinds.length * blockH, GRASS);
  for (let x = 0; x < sheet.w; x += 32 * K) sheet.rect(x, 0, 1, sheet.h, GRID);
  for (let y = 0; y < sheet.h; y += 32 * K) sheet.rect(0, y, sheet.w, 1, GRID);
  sheet.text('ENCEINTE DE SOLIN : TRONCONS D UN SEUL TENANT - BRUT (HAUT), TAILLE (BAS) (X4)', PAD, 12, GOLD, T);
  kinds.forEach((kind, ki) => {
    const top = 40 + ki * blockH;
    const at = (x: number, y: number): [number, number] => [(ox + x) * K, top + (oy + y) * K];
    // de la plus au nord à la plus au sud (le bas de l'image), comme le jeu les trie
    const placed = scene.map((p, i) => ({ ...p, grid: walls.run({ ...p.spec, kind, seed: 1000 * (ki + 1) + i * 17 }) }));
    placed.sort((a, b) => a.y + a.grid.length - (b.y + b.grid.length));
    for (const p of placed) { const [x, y] = at(p.x, p.y); sheet.blit(p.grid, pal, x, y, K); }
    // Xéros dans l'enceinte, et à côté du morceau seul
    for (const [gx, gy] of [[40, 70], [190, 152]] as const) {
      const [x, y] = at(gx, gy);
      sheet.blit(xg, xeros.palette, x - xs.x * K, y - (xs.y + xs.h) * K, K);
    }
  });
  const out = join(ROOT, '.art-preview', 'solin-enceinte.png');
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`solin-enceinte -> ${out}`);
}

main();
