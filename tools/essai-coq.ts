// Essai de la maison du coq (CADRAGE-coq.md) : npx tsx tools/essai-coq.ts écrit dans .art-preview/ :
//   coq-dehors.png (x2)     les versions A, B, C vues du sud, sur la cour de terre battue, Xéros devant la porte, la fumée, l'ombre du
//                           toit, et le cadre de la vue au zoom de départ (427 × 240 px du jeu) centré sur Xéros ;
//   coq-niveaux.png (x2)    la version A sans toit : le rez-de-chaussée, puis l'étage soulevé de 57 px, les meubles, Xéros ;
//   coq-escalier.png (x4)   le passage et l'escalier : Xéros en bas, à la 7e et à la 8e marche (le niveau affiché change), en haut ;
//   coq-vue-joueur.png (x2) ce que voit le joueur au zoom de départ, au pied de l'escalier puis en haut.
// Hors jeu : la maison est dans art/proposals/coq-maison.ts ; la pierre, les baies et les tentures dans coq-pierre.ts, coq-baies.ts,
// coq-tentures.ts.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import { FIRE, BENCH } from '../art/proposals/maison-xeros';
import * as M from '../art/proposals/coq-maison';
import { hash } from '../art/lib/volumes';
import { silhouette } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.art-preview');
const T = 2;
const BG: Rgb = [58, 52, 44], WHITE: Rgb = [255, 255, 255], GREY: Rgb = [205, 200, 185], GOLD: Rgb = [245, 215, 120], FRAME: Rgb = [255, 236, 140];

// ---------- les images du jeu ----------
function img(name: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s) throw new Error(`essai-coq : pas d'image « ${name} »`);
  if (s.kind === 'image') return { grid: s.grid, pal: s.palette };
  if (s.kind === 'spritesheet') return { grid: Object.values(s.animations)[0].frames[0], pal: s.palette };
  throw new Error(`essai-coq : « ${name} » n'est pas une image`);
}
function frame(name: string, anim: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-coq : pas de planche « ${name} »`);
  return { grid: s.animations[anim].frames[0], pal: s.palette };
}
const own = (grid: Grid) => ({ grid, pal: M.PAL });
const tileHex = (set: { tiles: Record<string, Grid>; palette: Palette }, names: string[], seed: number) => (x: number, y: number) => {
  const t = set.tiles[names[Math.floor(hash(seed, Math.floor(x / 32), Math.floor(y / 32)) * names.length)]];
  return set.palette[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
};
const grass = tileHex(worldTiles, ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'], 5);
const yard = tileHex(worldTiles, ['yard-15'], 7);
const earth = tileHex(interiorTiles, ['floor', 'floor2', 'floor3', 'floor4'], 6);

/** Un objet posé au sol : silhouette calée à gauche sur x, son bas sur le bord sud y ; soulevé de `lift` (l'étage, un dessus de table). */
function at(o: { grid: Grid; pal: Palette }, x: number, y: number, lift = 0, depth = y): M.Board {
  const s = silhouette(o.grid, o.pal);
  return { grid: o.grid, pal: o.pal, x: Math.round(x - s.x), y: Math.round(y - lift - (s.y + s.h)), depth: () => depth };
}
/** Un personnage, les pieds au milieu en (x, y), soulevé de `lift`. */
function who(name: string, x: number, y: number, anim = 'idle-down', lift = 0): M.Board {
  const f = frame(name, anim), s = silhouette(f.grid, f.pal);
  return { grid: f.grid, pal: f.pal, x: Math.round(x - s.x - s.w / 2), y: Math.round(y - lift - (s.y + s.h)), depth: () => y + 0.5 };
}

// ---------- la fumée ----------
function smoke(l: M.Layer, x: number, y: number): void {
  const sm = img('smoke');
  for (let k = 0; k < 8; k++) {
    const px = x + k * 2.6 + (k % 2) - 3, py = y - 4 - k * 6, a = 0.55 - k * 0.055;
    sm.grid.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      const X = Math.round(px) + i - l.x, Y = Math.round(py) + j - l.y;
      if (X < 0 || Y < 0 || X >= l.w || Y >= l.h) return;
      const c = sm.pal[ch].replace('#', ''), q = (Y * l.w + X) * 4;
      for (let n = 0; n < 3; n++) l.rgba[q + n] = l.rgba[q + n] * (1 - a) + parseInt(c.slice(n * 2, n * 2 + 2), 16) * a;
    }));
  }
}

// ---------- la planche ----------
interface Block { title: string[]; w: number; h: number; draw: (sh: Sheet, x: number, y: number) => void; notes: string[] }
function blit(sheet: Sheet, l: M.Layer, ox: number, oy: number, k: number): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    sheet.rect(ox + x * k, oy + y * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2]]);
  }
}
/** Un rendu agrandi k fois, avec des cadres (rectangles du monde à l'écran) en liseré d'un pixel de la planche. */
function lay(l: M.Layer, k: number, frames: [number, number, number, number][] = []) {
  return {
    w: l.w * k, h: l.h * k,
    draw: (sh: Sheet, x: number, y: number) => {
      blit(sh, l, x, y, k);
      for (const [fx, fy, fw, fh] of frames) {
        sh.outline(x + (fx - l.x) * k - 1, y + (fy - l.y) * k - 1, fw * k + 2, fh * k + 2, [40, 30, 20]);
        sh.outline(x + (fx - l.x) * k, y + (fy - l.y) * k, fw * k, fh * k, FRAME);
      }
    },
  };
}
function sheetOf(rows: Block[][], head: string[]): Sheet {
  const PAD = 16, GAP = 28;
  const bw = (b: Block) => Math.max(b.w, ...[...b.title, ...b.notes].map((l) => textWidth(l, T)));
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.title.length * 12 + 8 + b.h + b.notes.length * 12 + 12)) + GAP);
  const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map((r) => r.reduce((s, b) => s + bw(b) + GAP, 0)));
  const height = PAD + head.length * 12 + 12 + rowH.reduce((a, b) => a + b, 0);
  const sheet = new Sheet(width, height, BG);
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));
  let y = PAD + head.length * 12 + 12;
  rows.forEach((r, ri) => {
    let x = PAD;
    const th = Math.max(...r.map((b) => b.title.length * 12 + 8)), ih = Math.max(...r.map((b) => b.h));
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
function save(name: string, sheet: Sheet): void {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), PNG.sync.write(sheet.png));
  console.log(`essai-coq -> .art-preview/${name} (${sheet.w} x ${sheet.h})`);
}

// ---------- la vue au zoom de départ ----------
/** Le palier 3 : 427 × 240 px du jeu (21,3 × 12 m), centré sur l'image de Xéros (le milieu de sa silhouette, soulevée s'il l'est). */
const VIEW_W = 427, VIEW_H = 240;
function viewOf(b: M.Board): [number, number, number, number] {
  const s = silhouette(b.grid, b.pal), cx = b.x + s.x + s.w / 2, cy = b.y + s.y + s.h / 2;
  return [Math.round(cx - VIEW_W / 2), Math.round(cy - VIEW_H / 2), VIEW_W, VIEW_H];
}
const union = (a: M.Bounds, f: [number, number, number, number], m = 6): M.Bounds =>
  [Math.min(a[0], f[0] - m), Math.min(a[1], f[1] - m), Math.max(a[2], f[0] + f[2] + m), Math.max(a[3], f[1] + f[3] + m)];

// =====================================================================================================================
// 1. Le dehors
// =====================================================================================================================

const H = M.HOUSE;
/** La cour de la ferme : terre battue devant la maison et autour, l'herbe au-delà. */
const outsideGround = (x: number, y: number) => (y > -60 && y < H.D + 150 && x > -70 && x < H.W + 70 ? yard(x, y) : grass(x, y));

const NAMES: Record<M.Version, [string, string, string]> = {
  A: ['A. L ESCALIER DEDANS (RECOMMANDEE)', '16,40 X 6,80 M, MURS A 5,45 M, FAITE A 9,15 M, SOUCHES A 10,20 M', 'PORTE EN ARC AU PASSAGE, ESCALIER DE PIERRE DERRIERE'],
  B: ['B. L ESCALIER DEHORS, LE BOLET', 'LE MEME CORPS, 16,40 X 6,80 M', 'CUISINE ET CELLIER EN BAS, LA FAMILLE EN HAUT PAR LE PALIER COUVERT'],
  C: ['C. LA TOUR D ESCALIER', 'CORPS 16,40 X 6,80, AILE 6 X 6 M, TOURELLE O 3 M A 12,60 M', 'L ESCALIER A VIS DANS L ANGLE, PLUS HAUT QUE LE FAITE'],
};
function outside(v: M.Version): Block {
  const quads = M.coqQuads({ kind: 'outside', version: v });
  const door = v === 'B' ? 89 : 125;
  const xeros = who('xeros', door, H.D + 10);
  const boards = [xeros];
  const sc = { quads, boards };
  const f = viewOf(xeros);
  const bd = union(M.bounds(sc, [10, 14, 10, 10]), f);
  const l = M.render(sc, bd, outsideGround);
  smoke(l, 8, 68 - H.stack);
  smoke(l, 207, 7 - H.stack);
  smoke(l, 215, 7 - H.stack);
  if (v === 'C') smoke(l, 60, -110 - 196);
  const [n, d, note] = NAMES[v];
  return {
    title: [n, d], ...lay(l, 2, [f]),
    notes: [note, `IMAGE ${l.w}X${l.h} PX ; LISERE : LA VUE AU ZOOM DE DEPART, 427 X 240 PX (21,3 X 12 M)`],
  };
}

// =====================================================================================================================
// 2. Le dedans, par niveau
// =====================================================================================================================

/** Les meubles du rez-de-chaussée (x à gauche, y le bord sud, en px du jeu ; cm / 5). */
function furnitureOf(level: 0 | 1): M.Board[] {
  const B: M.Board[] = [];
  const L = level ? H.floor : 0;
  const put = (o: { grid: Grid; pal: Palette }, x: number, y: number, z = 0, depth = y) => B.push(at(o, x, y, L + z, depth));
  const tablePal = { ...M.PAL, ...img('table').pal };
  const TOP = 16; // le dessus d'une table : 78 cm
  if (level === 0) {
    // la cuisine : l'âtre du jeu au pignon ouest, la table du ménage, son banc, les tabourets, le pétrin, le tonneau, les jarres, les sacs
    put(img('stone-hearth-r3'), 12, 72);
    put(img('table'), 40, 68); put({ grid: BENCH, pal: tablePal }, 41, 75);
    put(img('stool'), 48, 48); put(img('stool'), 70, 48);
    put(img('candle'), 60, 60, TOP, 68.2);
    put(own(M.kneadingTrough()), 62, 25);
    put(img('barrel'), 88, 112); put(img('jar'), 92, 98); put(img('jar'), 78, 121);
    put(img('sack'), 28, 122); put(img('sack'), 38, 121); put(img('bucket'), 58, 22);
    // la salle : le dressoir, la grande table (deux tables bout à bout), ses bancs, la chaise du coq, le coffre des comptes, le feu
    put(own(M.dresser()), 166, 22);
    put(img('table'), 214, 78); put(img('table'), 256, 78);
    put({ grid: BENCH, pal: tablePal }, 215, 58); put({ grid: BENCH, pal: tablePal }, 257, 58);
    put({ grid: BENCH, pal: tablePal }, 215, 85); put({ grid: BENCH, pal: tablePal }, 257, 85);
    put(own(M.highChair()), 201, 74);
    put(img('chest'), 296, 23);
    put(img('candle'), 240, 68, TOP, 78.2); put(img('candle'), 276, 68, TOP, 78.2);
    put(img('jar'), 300, 120);
    put(own(FIRE), 206, 23, 0, 24);
  } else {
    // la chambre des garçons : le lit de l'aîné (fait, vide) et son coffre, le lit du fainéant près du conduit, l'écritoire
    put(img('bed'), 26, 54); put(img('chest'), 30, 66);
    put(img('bed'), 28, 113);
    put(own(M.writingDesk()), 50, 121); put(img('stool'), 55, 106); put(img('candle'), 64, 112, 15, 121.2);
    // la chambre du coq et de sa femme : le lit à courtines, deux coffres, la tenture, le feu de la chambre
    put(own(M.fourPoster()), 226, 57); put(img('chest'), 170, 24); put(img('chest'), 232, 70);
    put(img('stool'), 190, 80);
    // la chambre de la fille : son lit, son coffre, la table de tailleuse sous la croisée, son tabouret
    put(img('bed'), 283, 54); put(img('chest'), 266, 24);
    put(own(M.tailorTable()), 275, 121); put(img('stool'), 284, 104);
    put(own(FIRE), 206, 22, 0, 23);
  }
  return B;
}
function inside(level: 0 | 1, xeros: M.Board[]): { l: M.Layer; sc: M.Scene } {
  const quads = M.coqQuads({ kind: 'inside', level });
  const sc = { quads, boards: [...furnitureOf(level), ...xeros] };
  return { l: M.render(sc, M.bounds(sc, [16, 16, 16, 16]), M.insideGround(level, { floor: earth })), sc };
}
function insideIn(level: 0 | 1, xeros: M.Board[], bd: M.Bounds): M.Layer {
  const quads = M.coqQuads({ kind: 'inside', level });
  return M.render({ quads, boards: [...furnitureOf(level), ...xeros] }, bd, M.insideGround(level, { floor: earth }));
}

const LEGEND0 = [
  'CUISINE 4,60 X 5,60 = 26 M2 : LA FEMME DU COQ ; ATRE, POTAGER, PETRIN, EVIER, TABLE DU MENAGE',
  'PASSAGE 2,20 X 5,60 : LA PORTE EN ARC, L ESCALIER DE PIERRE (1 M) SUR SON MUR D ECHIFFRE',
  'SALLE 7,60 X 5,60 = 43 M2 : LE COQ ; CHEMINEE A HOTTE, TAPISSERIE, DRESSOIR, GRANDE TABLE, CHAISE, COFFRE',
];
const LEGEND1 = [
  'GARCONS 4,60 X 5,60 = 26 M2 : LIT DE L AINE (VIDE) ET SON COFFRE, LIT DU FAINEANT, ECRITOIRE',
  'PALIER ET TREMIE 1 X 2,80 M, GARDE-CORPS DE CHENE ; UN JOUR AU SUD, UN AU NORD',
  'COQ ET SA FEMME 4,80 X 5,60 = 27 M2 : LIT A COURTINES, CHEMINEE, TENTURE, DEUX COFFRES',
  'FILLE 2,65 X 5,60 = 15 M2 (PAR LA CHAMBRE DES PARENTS) : LIT, COFFRE, TABLE DE TAILLEUSE',
];

// =====================================================================================================================
// 3 et 4. L'escalier, la vue du joueur
// =====================================================================================================================

const S = H.stair;
/** Xéros sur la marche k (0 : au pied ; 15 : sur le palier) : ses pieds au milieu du giron, soulevé de la hauteur de la marche. */
function onStep(k: number): { b: M.Board; z: number } {
  if (k === 0) return { b: who('xeros', 146, S.y0 + 6, 'idle-up'), z: 0 };
  if (k >= 15) return { b: who('xeros', 146, 24, 'idle-up', H.floor), z: H.floor };
  const z = S.rise * k, y = S.y0 - S.run * (k - 0.5);
  return { b: who('xeros', 146, y, 'idle-up', Math.round(z)), z };
}
/** Le niveau affiché : le plus haut plancher dont le dessus est au plus à une demi-hauteur d'étage au-dessus des pieds (285 − 142 cm). */
const levelAt = (zPx: number): 0 | 1 => (zPx * 5 >= 285 - 142 ? 1 : 0);

async function main() {
  const t0 = Date.now();
  const head = (t: string) => [t, 'PIERRE, BAIES ET TENTURES : ART/PROPOSALS/COQ-PIERRE.TS, COQ-BAIES.TS, COQ-TENTURES.TS (L AUTRE DESSINATEUR)'];

  // 1. dehors
  save('coq-dehors.png', sheetOf([(['A', 'B', 'C'] as const).map(outside)],
    head('LA MAISON DU COQ VUE DU SUD (X2, 5 CM PAR PIXEL, PROJECTION DU JEU (X, Y - Z)) : PIERRE DE TAILLE, LAVES A 45 DEGRES, PIGNONS DECOUVERTS')));

  // 2. les niveaux
  const x0 = who('xeros', 124, 100);
  const x1 = who('xeros', 124, 26, 'idle-down', H.floor);
  const n0 = inside(0, [x0]).l, n1 = inside(1, [x1]).l;
  save('coq-niveaux.png', sheetOf([
    [{ title: ['A. REZ-DE-CHAUSSEE (SOL A 0)', 'L ETAGE CACHE ; MUR SUD ET REFENDS COUPES A 70 CM'], ...lay(n0, 2), notes: LEGEND0 }],
    [{ title: ['B. ETAGE (PLANCHER A 2,85 M), SOULEVE DE 57 PX', 'MURS COUPES A 70 CM AU-DESSUS DU PLANCHER ; LE BAS CACHE SAUF PAR LA TREMIE'], ...lay(n1, 2), notes: LEGEND1 }],
  ], head('LA MAISON DU COQ, VERSION A, SANS TOIT : LES DEUX NIVEAUX COMME L INTERIEUR CALCULE DU JEU (X2)')));

  // 3. l'escalier
  const crop: M.Bounds = [98, -78, 182, 132];
  const steps: [number, string][] = [[0, 'EN BAS'], [7, '7E MARCHE'], [8, '8E MARCHE'], [15, 'EN HAUT, SUR LE PALIER']];
  const blocks = steps.map(([k, name]) => {
    const { b, z } = onStep(k), lv = levelAt(z);
    const l = insideIn(lv, [b], crop);
    const cm = Math.round(z * 5);
    return { title: [name, `PIEDS A ${(cm / 100).toFixed(2).replace('.', ',')} M, IMAGE SOULEVEE DE ${Math.round(z)} PX`], ...lay(l, 4),
      notes: [`NIVEAU AFFICHE : ${lv ? 'L ETAGE' : 'LE REZ-DE-CHAUSSEE'}`, k === 8 ? 'ICI LE NIVEAU CHANGE (Z >= 1,43 M)' : k === 7 ? 'ENCORE EN BAS (1,33 M)' : ''] };
  });
  save('coq-escalier.png', sheetOf([blocks], head('LE PASSAGE ET SON ESCALIER (X4) : 15 MARCHES DE 19 CM, 14 GIRONS DE 26 CM, 1 M DE LARGE, MONTANT VERS LE NORD')));

  // 4. la vue du joueur
  const views = ([[0, 'XEROS AU PIED DE L ESCALIER : LE REZ-DE-CHAUSSEE'], [15, 'XEROS EN HAUT : L ETAGE (LA CAMERA A GLISSE DE 57 PX)']] as const).map(([k, name]) => {
    const { b, z } = onStep(k), f = viewOf(b);
    const l = insideIn(levelAt(z), [b], [f[0], f[1], f[0] + f[2], f[1] + f[3]]);
    return { title: [name, 'LA VUE AU ZOOM DE DEPART, 427 X 240 PX DU JEU (21,3 X 12 M)'], ...lay(l, 2), notes: [''] };
  });
  save('coq-vue-joueur.png', sheetOf([views], head('CE QUE VOIT LE JOUEUR (X2), LA CAMERA CENTREE SUR L IMAGE DE XEROS')));
  console.log(`essai-coq : ${((Date.now() - t0) / 1000).toFixed(1)} s de rendu`);
}

await main();
