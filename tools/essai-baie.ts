// Planche de la baie de porte (proposition validée par Grégoire, intégrée au jeu) : npx tsx tools/essai-baie.ts écrit .art-preview/baie-porte.png.
// Les pièces sont les images du jeu (art/world/xeros-house.ts) ; la travée montée, art/proposals/baie-porte.ts, des mêmes modèles.
//
//   1. chaque pièce nouvelle ou modifiée (l'huisserie, la tête de baie et la bande de 10 cm dans leurs quatre étapes, le seuil
//      intérieur), ses vues r0..r3 (le seuil : est-ouest et nord-sud), le bois dans ses trois âges, Xéros à côté (x3) ; sous chaque
//      vue, la taille attendue par le gabarit (src/content/gabarit.ts) et la taille dessinée (silhouette, ombre exclue) ;
//   2. la travée de la porte d'entrée montée à ses vraies hauteurs (x2) : de face, porte fermée et ouverte ; de côté (de l'est),
//      coupée au milieu de la baie, fermée et ouverte ; de côté entière (de l'ouest) ;
//   3. la travée d'une porte intérieure (seuil intérieur, porte de 90) et la baie du cagibi sans porte (x2) ;
//   4. la travée d'entrée agrandie x4.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import { rotP, hash, renderPiece, type Quad, type Rot } from '../art/lib/volumes';
import { PAL as HOUSE_PAL, bounds, render, type Board, type Layer, type Scene } from '../art/proposals/maison-xeros';
import { wallKit } from '../art/proposals/walls-high';
import { gameImage } from '../art/lib/walls';
import { AGES, BAY_CENTER, M, bayFloor, bayQuads, pieces, rotateBay, type BayKind, type BayOpts } from '../art/proposals/baie-porte';
import { expectedSize, silhouette, type Dims } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const PANEL: Rgb = [123, 133, 68];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const GOLD: Rgb = [245, 215, 120];
const RED: Rgb = [235, 120, 100];

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

// ---------- les tuiles du sol (herbe, terre battue) ----------

const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
const tiles = {
  grass: (x: number, y: number) => {
    const t = worldTiles.tiles[GRASS[Math.floor(hash(5, Math.floor(x / 32), Math.floor(y / 32)) * GRASS.length)]];
    return worldTiles.palette[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
  },
  floor: (x: number, y: number) => {
    const t = interiorTiles.tiles[FLOOR[Math.floor(hash(6, Math.floor(x / 32), Math.floor(y / 32)) * FLOOR.length)]];
    return interiorTiles.palette[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
  },
};

// ---------- Xéros ----------

const XG = xeros.animations['idle-down'].frames[0];
const XS = silhouette(XG, xeros.palette);
/** Xéros, les pieds au milieu en (x, y) du monde, dans la vue r. */
function xerosAt(x: number, y: number, r: Rot): Board {
  const [X, Y] = rotP([x, y, 0], r, BAY_CENTER);
  return { grid: XG, pal: xeros.palette, x: Math.round(X - XS.x - XS.w / 2), y: Math.round(Y - (XS.y + XS.h)), depth: () => Y };
}

// ---------- le solin de face : les pierres du jeu ----------

const kit = wallKit(gameImage);
/** Les deux bouts de solin de la vue de face (de x −8 au seuil, du seuil à x 40), le dessus de leur épaisseur, la tête au seuil. */
function solinBoards(kind: BayKind): Board[] {
  const sd = kind === 'entry' ? 5 : 3, top = 2 * sd;
  return [[-8, 4, 61], [28, 40, 62]].map(([x0, x1, seed]) => {
    const g = kit.highWall('rough', seed, { length: x1 - x0, face: M.solin, top }, { left: 'head', right: 'head' });
    return { grid: g, pal: HOUSE_PAL, x: x0, y: -sd - M.solin, depth: (row: number) => (row < top ? -sd + row + 0.5 : sd) };
  });
}

// ---------- les vues de la travée ----------

function bayLayer(o: BayOpts, r: Rot, who: [number, number] | null): Layer {
  const front = r === 0;
  const quads: Quad[] = rotateBay(bayQuads({ ...o, solinBox: !front }), r);
  const boards: Board[] = front ? solinBoards(o.kind) : [];
  if (who) boards.push(xerosAt(who[0], who[1], r));
  const fl = bayFloor(o.kind);
  const a = rotP([fl[0], fl[2], 0], r, BAY_CENTER), b = rotP([fl[1], fl[3], 0], r, BAY_CENTER);
  const sc: Scene = { quads, boards, floor: [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])] };
  return render(sc, bounds(sc, [6, 6, 6, 12]), tiles);
}

/**
 * La coupe en élévation (hors projection du jeu, pour lire les hauteurs) : la travée coupée au milieu de la baie (x = 16), vue de
 * l'est en vraie grandeur, sans dessus (renderPiece à k = 0 : (x, −z)) ; le dehors à gauche. Xéros dehors, à 1 m du mur.
 */
function elevBlock(o: BayOpts, k: number, title: string[], notes: string[] = []): Block {
  const g = renderPiece(rotateBay(bayQuads({ ...o, clipX: 16, solinBox: true }), 3), { k: 0 });
  const xw = XG[0].length, gap = 8, m = 6;
  const w = (m + xw + gap + g[0].length + m) * k, artH = Math.max(g.length, XS.y + XS.h) + m;
  return {
    title, notes, w, h: (artH + 3) * k,
    draw: (sh, ox, oy) => {
      const ground = oy + artH * k;
      sh.rect(ox, oy, w, (artH + 3) * k, [150, 170, 175]);
      sh.rect(ox, ground, w, 3 * k, [110, 92, 64]);
      for (let z = 0; z <= 56; z += 4) sh.rect(ox, ground - z * k - 1, z % 8 ? 2 * k : 4 * k, 2, z % 8 ? GREY : WHITE);
      sh.blit(XG, xeros.palette, ox + m * k, ground - (XS.y + XS.h) * k, k);
      sh.blit(g, HOUSE_PAL, ox + (m + xw + gap) * k, ground - g.length * k, k);
    },
  };
}

// ---------- la planche ----------

interface Block { title: string[]; w: number; h: number; draw: (sh: Sheet, x: number, y: number) => void; notes: string[]; bg?: boolean }

function blitLayer(sheet: Sheet, l: Layer, ox: number, oy: number, k: number): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    sheet.rect(ox + x * k, oy + y * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2]]);
  }
}
const layerBlock = (l: Layer, k: number, title: string[], notes: string[] = []): Block => ({ title, notes, w: l.w * k, h: l.h * k, draw: (sh, x, y) => blitLayer(sh, l, x, y, k) });

const sizeText = (g: Grid, p: Palette) => { const s = silhouette(g, p); return `${s.w}X${s.h}`; };
const expText = (d: Dims) => { const e = expectedSize(d); return `${fmt(e.w)}X${fmt(e.h)}`; };
const swapped = (d: Dims): Dims => ({ ...d, w: d.d, d: d.w });

/** Une rangée de pièces : Xéros, puis pour chaque âge les vues côte à côte, posées sur une même ligne de sol. */
function pieceBlock(p: ReturnType<typeof pieces>[number], k: number): Block {
  const ages = p.aged ? (['neuf', 'patine', 'vieux'] as const) : (['neuf'] as const);
  const GAPA = 36, SLOT = 46;
  const vw = p.views.map((g) => g[0].length * k);
  const ageW = vw.reduce((s, w) => s + Math.max(w + 10, SLOT), 0);
  const xw = XG[0].length * k;
  const artH = Math.max(XS.y + XS.h, ...p.views.map((g) => g.length)) * k;
  const labels = p.views.map((g, v) => {
    const d = v % 2 ? swapped(p.dims) : p.dims;
    const e = expectedSize(d), s = silhouette(g, AGES.neuf);
    const ok = Math.abs(s.w - e.w) <= 2 && Math.abs(s.h - e.h) <= 2;
    return { name: p.views.length === 2 ? (v ? 'NS' : 'EO') : `R${v}`, exp: expText(d), got: sizeText(g, AGES.neuf), ok };
  });
  const w = xw + 24 + ages.length * (ageW + GAPA);
  const h = artH + 16 + 3 * 12;
  return {
    title: [`${p.key}  (${p.status})`, `${p.name}, ${p.dims.w}X${p.dims.d}X${p.dims.h} CM${p.dims.ground ? ', GROUND' : ''}${p.aged ? ', BOIS : 3 AGES' : ''}`],
    notes: [],
    w, h,
    draw: (sh, ox, oy) => {
      const ground = oy + artH;
      sh.rect(ox - 4, oy - 4, w + 8, artH + 8, PANEL);
      sh.blit(XG, xeros.palette, ox, ground - (XS.y + XS.h) * k, k);
      let x = ox + xw + 24;
      for (const age of ages) {
        let vx = x;
        p.views.forEach((g, v) => {
          sh.blit(g, AGES[age], vx, ground - g.length * k, k);
          const L = labels[v];
          sh.text(L.name, vx, ground + 8, WHITE, T);
          if (age === 'neuf') {
            sh.text(L.exp, vx, ground + 20, GREY, T);
            sh.text(L.got, vx, ground + 32, L.ok ? GREY : RED, T);
          }
          vx += Math.max(vw[v] + 10, SLOT);
        });
        sh.text(age.toUpperCase(), x, oy - 2 - 10, GOLD, T);
        x += ageW + GAPA;
      }
    },
  };
}

function sheetOf(rows: Block[][], head: string[]): Sheet {
  const PAD = 16, GAP = 28;
  const bw = (b: Block) => Math.max(b.w, ...[...b.title, ...b.notes].map((l) => textWidth(l, T)));
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.title.length * 12 + 22)) + Math.max(...r.map((b) => b.h)) + Math.max(...r.map((b) => b.notes.length * 12 + 12)) + GAP);
  const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map((r) => r.reduce((s, b) => s + bw(b) + GAP, 0)));
  const height = PAD + head.length * 12 + 12 + rowH.reduce((a, b) => a + b, 0);
  const sheet = new Sheet(width, height, BG);
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));
  let y = PAD + head.length * 12 + 12;
  rows.forEach((r, ri) => {
    let x = PAD;
    const th = Math.max(...r.map((b) => b.title.length * 12 + 22)), ih = Math.max(...r.map((b) => b.h));
    for (const b of r) {
      b.title.forEach((l, i) => sheet.text(l, x, y + i * 12, i === 0 ? GOLD : WHITE, T));
      b.draw(sheet, x, y + th + ih - b.h);
      b.notes.forEach((l, i) => sheet.text(l, x, y + th + ih + 6 + i * 12, i === 0 ? WHITE : GREY, T));
      x += bw(b) + GAP;
    }
    y += rowH[ri];
  });
  return sheet;
}

// ---------- les rangées ----------

const P = pieces();
const pieceRows: Block[][] = P.map((p) => [pieceBlock(p, 3)]);

const HEIGHTS = ['solin 0-40, traverse 40-70, poteaux 70-250, sablière 250-280', 'seuil 0-20, huisseries et porte 20-200, tete 200-250'];
const K2 = 2;
const entry: Block[] = [
  layerBlock(bayLayer({ kind: 'entry' }, 0, [50, 10]), K2, ['ENTREE, DE FACE', 'porte fermee'], HEIGHTS),
  layerBlock(bayLayer({ kind: 'entry', open: true }, 0, [50, 10]), K2, ['ENTREE, DE FACE', 'porte ouverte (cottage-door-open : r1)']),
  layerBlock(bayLayer({ kind: 'entry' }, 1, [16, 14]), K2, ['ENTREE, DE L OUEST', 'entiere (projection du jeu)']),
  elevBlock({ kind: 'entry' }, 4, ['ENTREE, COUPE (ELEVATION)', 'au milieu de la baie, vue de l est', 'dehors a gauche, fermee'], ['graduation : 20 cm (blanc : 40 cm)']),
  elevBlock({ kind: 'entry', open: true }, 4, ['ENTREE, COUPE', 'ouverte (vers le dehors)']),
];
const inner: Block[] = [
  layerBlock(bayLayer({ kind: 'inner' }, 0, [50, 10]), K2, ['PORTE INTERIEURE, DE FACE', 'seuil interieur, porte de 90']),
  layerBlock(bayLayer({ kind: 'inner', open: true }, 0, [50, 10]), K2, ['PORTE INTERIEURE', 'ouverte']),
  elevBlock({ kind: 'inner' }, 4, ['PORTE INTERIEURE, COUPE', 'fermee']),
  layerBlock(bayLayer({ kind: 'passage' }, 0, [16, -6]), K2, ['BAIE DU CAGIBI, DE FACE', 'sans porte, Xeros dans la baie, au nord']),
  layerBlock(bayLayer({ kind: 'passage' }, 0, [50, 10]), K2, ['BAIE DU CAGIBI, DE FACE', 'sans porte']),
  elevBlock({ kind: 'passage' }, 4, ['BAIE DU CAGIBI, COUPE']),
];
const zoom: Block[] = [
  layerBlock(bayLayer({ kind: 'entry' }, 0, [50, 10]), 4, ['ENTREE AGRANDIE X4', 'porte fermee']),
  layerBlock(bayLayer({ kind: 'entry', open: true }, 0, [50, 10]), 4, ['ENTREE AGRANDIE X4', 'porte ouverte']),
];

const head = [
  'LA BAIE DE PORTE DE LA MAISON EN PAN DE BOIS, INTEGREE AU JEU (pieces : images du jeu, art/world/xeros-house.ts)',
  'pieces x3 sur l herbe, Xeros a cote ; sous chaque vue : attendu par le gabarit, puis dessine (silhouette, ombre exclue ; rouge : hors tolerance 2 px)',
  'travees x2 (le bois a l age patine, comme l essai), puis l entree x4. Les bandes, la tete et les remplissages : etape chaux ; les autres etapes sont dans les pieces.',
];
const sheet = sheetOf([...pieceRows, entry, inner, zoom], head);
const out = join(ROOT, '.art-preview', 'baie-porte.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-baie : ${out} (${sheet.w} x ${sheet.h})`);
for (const p of P) console.log(`  ${p.key} : ${p.views.map((g, v) => `${v % 2 && p.views.length === 4 ? 'r' + v : p.views.length === 2 ? (v ? 'ns' : 'eo') : 'r' + v} ${g[0].length}x${g.length}`).join(', ')}`);
