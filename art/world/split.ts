// Le fendage : la grosse bille avec le coin planté et ses fentes, les demi-billes, les quartiers (docs/objets/big-wedged-log.md,
// big-half-log.md, big-quarter-log.md).
//
// - Bille coin planté (`big-wedged-log`, `-ns`) : la bille ordinaire elle-même (`big-felled-log-1`, `big-felled-log-ns`
//   de big-felled.ts), le coin planté au milieu du dessus, dans le sens de la longueur. Le coin (art/items/
//   splitting-tools.ts : fer de 7 cm de large, 4 d'épaisseur) n'en montre que la tête, 2 px de large (plancher de
//   lisibilité) ; la rampe du fer de tools.ts (2 3 0). À chaque coup (`-n1`, `-n2`, `-n3`) il s'enfonce d'un pixel et
//   la fente court plus loin sur le dessus, depuis le coin ; au troisième, elle traverse et descend la face de coupe,
//   le bois bâille (la lèvre de la fente montre le bois frais). Est-ouest, la tête dépasse du haut de la bille :
//   l'image a deux rangées de plus en haut (19 × 18 au lieu de 19 × 16), bas et coin gauche ceux de la bille.
// - Demi-bille (`big-half-log`, `-ns`) : couchée face plate en haut, boîte 95 × 65 × 33 cm (19 × 13 px de silhouette ;
//   nord-sud 13 × 16). Le dessus est le bois frais de la fente (Y t T, comme le bois de coupe de wood.ts) : fibres le
//   long de la bille, arrachées par endroits, pas de cerne (ce n'est pas un trait de scie) ; un liseré d'écorce sur son
//   bord. Est-ouest, sous le dessus, le dos arrondi d'écorce (la rampe M m N K, côté ombre de la bille) et le bout
//   gauche en demi-lune de bois de bout ; nord-sud, le bout coupé en demi-lune au sud, avec son cerne et son cœur en
//   haut, au milieu de la face plate.
// - Demi-bille coin planté (`big-wedged-half-log`, `-ns`) : la demi-bille, le coin planté au milieu de la face plate, la
//   fente sur la face plate, mêmes quatre états.
// - Quartier (`big-quarter-log`, `-ns`) : un quart de cylindre, boîte 95 × 33 × 33 cm (19 × 10 ; nord-sud 7 × 16) : le
//   dessus plat de bois frais, le dos d'écorce au sud (est-ouest), le bout en quart de disque, cœur dans l'angle
//   (nord-sud). Son icône et sa planche portée à deux mains (`item-big-quarter-log`, `held-big-quarter-log`).
// Lumière en haut à gauche, contour de big-tree.ts (`shadedOutline`), ombre portée décalée à droite comme les billes.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ArtSource, ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { toolPalette } from '../items/tools';
import felled from './big-felled';
import { despeckle, shadedOutline } from './big-tree';
import { DARKER, bark, faceTone } from './wood';

type Stage = 0 | 1 | 2 | 3;
const STAGES: Stage[] = [0, 1, 2, 3];
const suffix = (s: Stage) => (s === 0 ? '' : `-n${s}`);

/** Grille d'une image de big-felled.ts. */
function felledGrid(name: string): string[] {
  const src = (felled as ArtSource[]).find((s) => s.name === name);
  if (!src || src.kind !== 'image') throw new Error(`split : ${name} introuvable`);
  return src.grid;
}

// ---------- Le coin et la fente ----------

/**
 * Coin planté : sa tête, 2 px de large (colonnes x et x + 1), qui dépasse de `up` pixels au-dessus de la rangée `y` où il
 * entre dans le bois. Fer éclairé à gauche (3), ombre à droite (0), le dessus de la tête plus clair (2) ; la rangée
 * d'entrée est la fente qui le serre, sombre. Enfoncé à fond (`up` = 0), seule la tête affleure.
 */
function wedge(c: Canvas, x: number, y: number, up: number, across = true) {
  for (let r = 0; r <= up; r++) {
    const Y = y - r;
    const top = r === up;
    c.set(x, Y, top ? '2' : '3').set(x + 1, Y, top && up > 0 ? '3' : '0');
  }
  // l'entrée : la fente serre le fer, un pixel sombre de chaque côté (est-ouest : la fente court en travers de l'écran ;
  // nord-sud, elle court vers le haut et le bas, la fente elle-même le montre)
  if (up > 0 && across) c.set(x - 1, y, 'K').set(x + 2, y, 'K');
}

/**
 * Fente le long d'une ligne de pixels (dans l'ordre, depuis le coin vers un bout) : un trait sombre d'un pixel qui
 * zigzague (`jog` : décalage en travers, par pixel), `n` premiers pixels. `gape` : le bois bâille, la lèvre (le pixel
 * voisin, côté `lip`) montre le bois frais.
 */
function crack(c: Canvas, path: [number, number][], n: number, gape = false, lip: [number, number] = [0, 1]) {
  path.slice(0, n).forEach(([X, Y], i) => {
    if (c.get(X, Y) === EMPTY) return;
    c.set(X, Y, 'K');
    if (gape && i < 3 && c.get(X + lip[0], Y + lip[1]) !== EMPTY) c.set(X + lip[0], Y + lip[1], i === 0 ? 'T' : 't');
  });
}

/** Chemin horizontal de x0 vers x1 (pas ±1), sur la rangée y, qui monte ou descend d'un pixel selon `jog`. */
function hPath(x0: number, x1: number, y: number, jog: number[]): [number, number][] {
  const out: [number, number][] = [];
  const d = x1 >= x0 ? 1 : -1;
  for (let X = x0, i = 0; d > 0 ? X <= x1 : X >= x1; X += d, i++) out.push([X, y + jog[i % jog.length]]);
  return out;
}

/** Chemin vertical de y0 vers y1, sur la colonne x, qui s'écarte d'un pixel selon `jog`. */
function vPath(y0: number, y1: number, x: number, jog: number[]): [number, number][] {
  const out: [number, number][] = [];
  const d = y1 >= y0 ? 1 : -1;
  for (let Y = y0, i = 0; d > 0 ? Y <= y1 : Y >= y1; Y += d, i++) out.push([x + jog[i % jog.length], Y]);
  return out;
}

/** Hauteur de la tête du coin au-dessus de son entrée, à chaque étape : il s'enfonce d'un pixel par coup. */
const HEAD_UP: Record<Stage, number> = { 0: 2, 1: 1, 2: 0, 3: 0 };

/**
 * Une pièce coin planté : la fente part du coin vers les deux bouts. `west`/`east` (ou `north`/`south`) : les chemins
 * du coin vers chaque bout ; à l'étape 1 la fente fait `short` pixels de chaque côté, à l'étape 2 la moitié du
 * chemin, à l'étape 3 tout ; `face` : le prolongement sur la face de coupe à l'étape 3.
 */
interface Split { a: [number, number][]; b: [number, number][]; face?: [number, number][]; lip: [number, number] }

function splitStage(c: Canvas, sp: Split, s: Stage) {
  if (s === 0) return;
  const len = (p: [number, number][]) => (s === 1 ? 2 : s === 2 ? Math.ceil(p.length / 2) : p.length);
  crack(c, sp.a, len(sp.a), s === 3, sp.lip);
  crack(c, sp.b, len(sp.b), s === 3, sp.lip);
  if (s === 3 && sp.face) crack(c, sp.face, sp.face.length, true, [1, 0]);
}

// ---------- Bille coin planté ----------

/** Rangées ajoutées en haut de la bille est-ouest pour la tête du coin. */
const EW_UP = 2;

function wedgedLog(s: Stage): Canvas {
  const log = felledGrid('big-felled-log-1');
  const c = new Canvas(log[0].length, log.length + EW_UP);
  c.stamp(log, 0, EW_UP);
  // la crête du dessus est la première rangée d'écorce, sous le contour : le coin y entre et dépasse au-dessus de la
  // bille (EW_UP rangées au plus, d'un pixel de plus que sur une face plate) ; la fente court une rangée plus bas, sur
  // l'écorce éclairée, où elle se lit
  const y = EW_UP + 2;
  // fente : du coin (colonnes 9-10) vers le bout gauche (face de coupe, colonnes 1-4) et le bout droit
  splitStage(c, {
    a: hPath(8, 5, y, [0, 0, 0, 1]),
    b: hPath(11, 16, y, [0, 0, 1, 1, 1, 0]),
    // la fente descend la face de coupe du bout gauche, par son milieu
    face: vPath(y, EW_UP + 11, 3, [0, 0, 0, 0, 1, 1, 1, 0, 0, 0]),
    lip: [0, 1],
  }, s);
  wedge(c, 9, y - 1, HEAD_UP[s] + 1);
  return c;
}

function wedgedLogNS(s: Stage): Canvas {
  const c = Canvas.from(felledGrid('big-felled-log-ns'));
  // le dessus d'écorce court du rond du fond (rangée 2) au haut de la face de coupe (rangée 11), par la crête (colonne 6)
  const y = 7;
  splitStage(c, {
    a: vPath(y - 1, 2, 6, [0, 0, 1, 1, 0]),
    b: vPath(y + 1, 11, 6, [0, 1, 1, 0]),
    face: vPath(12, 16, 6, [0, 1, 1, 0, 0]),
    lip: [1, 0],
  }, s);
  wedge(c, 5, y, HEAD_UP[s], false);
  return c;
}

// ---------- Demi-bille ----------

/**
 * Bois frais de la fente, sur une face plate vue de dessus : `along` le long de la pièce, `across` en travers (0 côté
 * lumière). Fond t, le bord côté lumière en Y ; fibres : tirets Y (le bord éclairé d'une fibre) un couloir sur deux,
 * de périodes différentes, et çà et là une fibre arrachée (T) ; jamais de cerne.
 */
function splitWood(along: number, across: number): string {
  const a = Math.floor(along);
  if (across === 0) return 'Y';
  const lanes: [number, number, number][] = [[9, 5, 2], [13, 4, 8], [11, 6, 5], [12, 3, 0], [10, 5, 7]];
  const [p, n, ph] = lanes[across % lanes.length];
  const pos = (((a + ph) % p) + p) % p;
  // un couloir sur deux : une fibre éclairée (Y), plus loin une fibre arrachée (T)
  if (across % 2 === 1 && pos < n) return 'Y';
  if (across % 2 === 0 && pos === Math.floor(p / 2)) return 'T';
  return 't';
}

/** Ombre au sol d'une pièce est-ouest : sous le corps, décalée d'une colonne, la dernière rangée plus courte. */
function ewShadow(c: Canvas, x1: number, y: number, rows: number) {
  for (let X = 2; X <= x1; X++) for (let r = 0; r < rows - 1; r++) if (c.get(X, y + r) === EMPTY) c.set(X, y + r, 'x');
  for (let X = 4; X <= x1; X++) if (c.get(X, y + rows - 1) === EMPTY) c.set(X, y + rows - 1, 'x');
}

/** Ombre au sol d'une pièce nord-sud : le corps décalé d'une colonne vers la droite et de deux rangées vers le bas. */
function nsShadow(c: Canvas, fromRow: number) {
  const body = Canvas.from(c.toGrid());
  for (let Y = fromRow; Y < c.h; Y++) for (let X = 2; X < c.w; X++) {
    if (c.get(X, Y) === EMPTY && body.get(X - 1, Y - 2) !== EMPTY) c.set(X, Y, 'x');
  }
}

/**
 * Pièce couchée est-ouest, face plate en haut, dans une image `w` × `h` : bois de X = 1 à w − 3. Le dessus plat, rangées
 * 1 à `top` (la première est le liseré d'écorce du bord nord), sur toute la longueur ; dessous, le dos d'écorce
 * (rangées top + 1 à `bottom`), dont les bouts s'arrondissent : à gauche, vers la lumière, le bout en demi-lune de
 * bois de bout (`endA` de large, le cœur en haut, au bord de la face plate) ; à droite, l'écorce qui s'enroule.
 */
function flatEW(w: number, h: number, top: number, bottom: number, endA: number, endFace = false): Canvas {
  const c = new Canvas(w, h);
  const x1 = w - 3;
  const back = bottom - top; // rangées d'écorce
  for (let X = 1; X <= x1; X++) for (let Y = 1; Y <= bottom; Y++) {
    if (Y === 1) c.set(X, Y, 'M');
    else if (Y <= top) c.set(X, Y, splitWood(X + 3, Y - 2));
    // le dos d'écorce : la moitié ombrée de la bille, du flanc sud (m) au-dessous (K)
    else c.set(X, Y, bark(X + 30, 0.42 + (0.58 * (Y - top - 0.5)) / back));
  }
  // les bouts du dos : un demi-ovale sous la face plate (centre au bord de la face plate, demi-hauteur `back`)
  const ry = back + 0.5;
  const cy = top + 0.5;
  const inside = (X: number, Y: number, ox: number) => ((X + 0.5 - ox) / endA) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = top + 1; Y <= bottom; Y++) for (let X = 1; X <= x1; X++) {
    const left = X + 0.5 - 1 < endA, right = x1 + 1 - (X + 0.5) < endA;
    if (left && !inside(X, Y, 1 + endA)) c.px[Y][X] = EMPTY;
    else if (right && !inside(X, Y, x1 + 1 - endA)) c.px[Y][X] = EMPTY;
  }
  // bout gauche : un liseré de bois de bout (la demi-lune vue de biais), cerclé d'écorce, sous la face plate
  if (endFace) {
    const ox = 1 + endA;
    for (let Y = top + 1; Y <= bottom; Y++) for (let X = 1; X < 1 + 2 * endA; X++) {
      if (!inside(X, Y, ox) || c.get(X, Y) === EMPTY) continue;
      const rim = !inside(X - 1, Y, ox) || !inside(X, Y + 1, ox) || !inside(X + 1, Y, ox);
      c.set(X, Y, faceTone((X + 0.5 - ox) / endA, (Y + 0.5 - cy) / ry, rim, false, false));
    }
  }
  // bout droit : l'écorce qui s'enroule, un cran plus sombre sur son bord
  for (let Y = top + 1; Y <= bottom; Y++) {
    let X = x1;
    while (X > 0 && c.get(X, Y) === EMPTY) X--;
    if (X > 0) c.set(X, Y, DARKER[c.get(X, Y)] ?? c.get(X, Y));
  }
  despeckle(c, 'KYTtNM');
  shadedOutline(c);
  ewShadow(c, x1 + 1, bottom + 2, h - bottom - 2);
  return c;
}

/** Demi-bille est-ouest : 19 × 13 de silhouette (dessus 5 rangées, dos 6), image 19 × 16. */
const halfLog = () => flatEW(19, 16, 5, 11, 2.5);
/** Quartier est-ouest : 19 × 10 de silhouette (dessus 3 rangées, dos 5), image 19 × 12. */
const quarterLog = () => flatEW(19, 12, 3, 8, 1.75);

/**
 * Bout coupé tourné vers le sud d'une pièce nord-sud à face plate : la face de coupe (wood.ts), comme celle de la bille
 * nord-sud, son arête avec la face plate un cran plus sombre, dont le centre (le
 * cœur, au bord de la face plate) est en (cx, cy), demi-axes rx, ry ; seuls les pixels sous la face plate et que
 * `keep` garde (toute la largeur, ou le côté ouest de la fente pour un quartier) en font partie.
 */
function southEnd(c: Canvas, cx: number, cy: number, rx: number, ry: number, keep: (X: number) => boolean) {
  const inside = (X: number, Y: number) => keep(X) && ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = Math.floor(cy); Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
    if (!inside(X, Y)) continue;
    // bord : l'écorce qui cercle la face, sauf le long de la face plate (au-dessus) et de la fente (le côté coupé)
    const rim = !inside(X, Y + 1) || (!inside(X - 1, Y) && keep(X - 1)) || (!inside(X + 1, Y) && keep(X + 1));
    let k = faceTone((X + 0.5 - cx) / rx, (Y + 0.5 - cy) / ry, rim, false, true);
    // l'arête avec la face plate, au-dessus : un cran plus sombre, pour que la face de coupe se lise sous le dessus clair
    if (Y === Math.floor(cy)) k = ({ Y: 't', t: 'T' } as Record<string, string>)[k] ?? k;
    c.set(X, Y, k);
  }
}

/**
 * Bout d'un quartier nord-sud (5 px de bois de large), dessiné au pixel : un quart de disque, le cœur (T) dans l'angle
 * du haut à droite, contre la fente (à droite) et la face plate (au-dessus, l'arête un cran plus sombre) ; un cerne
 * autour du cœur, le bois de bout éclairé à gauche (Y), l'écorce (N) sur l'arc. `_HELD` : à hauteur de poitrine,
 * moins aplati.
 */
const QUARTER_END = ['NTttT', 'NYtTT', '.NYtT', '..NtT', '...NN'];
const QUARTER_END_HELD = ['NTttT', 'NYtTT', 'NYYtT', '.NYtT', '..NtT', '...NN'];

/**
 * Pièce couchée nord-sud, face plate en haut, image `w` × `h` : dessus plat de X = 1 à `x1`, rangées 1 à `y1`
 * (fibres en long, vers le nord ; liseré d'écorce sur les bords), puis le bout coupé au sud, `endH` rangées.
 * `quarter` : à droite, la fente, sans écorce ; le cœur est dans l'angle haut droit, la face est un quart de disque.
 */
function flatNS(w: number, h: number, x1: number, y1: number, endH: number, quarter: boolean): Canvas {
  const c = new Canvas(w, h);
  for (let Y = 1; Y <= y1; Y++) for (let X = 1; X <= x1; X++) {
    if (X === 1) c.set(X, Y, 'M');
    else if (X === x1 && !quarter) c.set(X, Y, 'm');
    else c.set(X, Y, splitWood(Y * 1.3 + 4, X - 2));
  }
  if (quarter) c.stamp(endH > 5 ? QUARTER_END_HELD : QUARTER_END, 1, y1 + 1);
  else southEnd(c, (x1 + 2) / 2, y1 + 1, x1 / 2, endH - 0.1, () => true);
  despeckle(c, 'KYTtNM');
  shadedOutline(c);
  nsShadow(c, 3);
  return c;
}

/** Demi-bille nord-sud : 13 × 16 de silhouette (dessus 9 rangées, demi-lune 6), image 14 × 18. */
const halfLogNS = () => flatNS(14, 18, 11, 9, 5.5, false);
/** Quartier nord-sud : 7 × 16 de silhouette, image 8 × 18. */
const quarterLogNS = () => flatNS(8, 18, 5, 9, 5.5, true);

// ---------- Demi-bille coin planté ----------

function wedgedHalf(s: Stage): Canvas {
  const c = halfLog();
  const y = 3; // milieu du dessus plat
  splitStage(c, {
    a: hPath(8, 1, y, [0, 0, 0, 1, 1, 0, 0, 0]),
    b: hPath(11, 17, y, [0, 0, -1, -1, 0, 0, 0]),
    lip: [0, 1],
  }, s);
  wedge(c, 9, y, HEAD_UP[s]);
  return c;
}

function wedgedHalfNS(s: Stage): Canvas {
  const c = halfLogNS();
  const y = 5;
  splitStage(c, {
    a: vPath(y - 1, 1, 6, [0, 0, 1, 1, 0]),
    b: vPath(y + 1, 9, 6, [0, 1, 1, 0]),
    face: vPath(10, 14, 6, [0, 1, 0]),
    lip: [1, 0],
  }, s);
  wedge(c, 5, y, HEAD_UP[s], false);
  return c;
}

// ---------- Icône et quartier porté ----------

/**
 * Icône (16 × 16), dessinée au pixel : le quartier de biais, comme l'icône des billes (resources.ts). Devant, en bas à
 * gauche, son bout en quart de disque : le cœur (T) dans l'angle du haut à gauche, un cerne en arc, le bois de bout (t),
 * l'écorce (N) sur l'arc. Le dessus plat, le plus clair (Y, fibres t en long), fuit vers le haut à droite ; le dos
 * d'écorce dessous, à droite, de m à K vers le bas.
 */
const QUARTER_ICON = [
  '................',
  '................',
  '........YYtYYY..',
  '.......YtYYYtm..',
  '.....YYYtYYmmN..',
  '....YYtYYYmmNN..',
  '..TTtTtNmmNNK...',
  '..TttTtNmNNK....',
  '..ttTtNNNNK.....',
  '..TTttNNK.......',
  '..ttNNK.........',
  '..NNN...........',
  '................',
  '................',
  '................',
  '................',
];

const quarterIcon = (): Canvas => shadedOutline(Canvas.from(QUARTER_ICON));

const HELD_SIZE = 25;
const HELD_C = Math.floor(HELD_SIZE / 2);

/** Ôte l'ombre au sol et recadre sur la silhouette. */
function body(c: Canvas): string[] {
  const g = c.toGrid().map((r) => r.replace(/x/g, EMPTY));
  const rows = g.filter((r) => /[^.]/.test(r));
  const x0 = Math.min(...rows.map((r) => r.search(/[^.]/)));
  const x1 = Math.max(...rows.map((r) => r.length - 1 - [...r].reverse().join('').search(/[^.]/)));
  return rows.map((r) => r.slice(x0, x1 + 1));
}

/** `g` centrée sur la prise d'une image HELD_SIZE × HELD_SIZE. */
function centered(g: string[]): string[] {
  const c = new Canvas(HELD_SIZE, HELD_SIZE);
  c.stamp(g, HELD_C - Math.floor(g[0].length / 2), HELD_C - Math.floor(g.length / 2));
  return c.toGrid();
}

/**
 * Par le bout (de profil) : le quartier nord-sud raccourci, à hauteur de poitrine : le dessus plat qui fuit derrière
 * (5 rangées au lieu de 9), le bout en quart de disque moins aplati qu'au sol.
 */
const quarterEnd = () => body(flatNS(8, 16, 5, 5, 6, true));

const heldQuarter = (): SpriteSheetSource => {
  const lengthwise = centered(body(quarterLog()));
  const views = { down: lengthwise, up: lengthwise, right: centered(quarterEnd()) };
  const animations: SpriteSheetSource['animations'] = {};
  for (const [v, g] of Object.entries(views)) animations[v] = { frames: [g], frameRate: 1, repeat: 0 };
  return { kind: 'spritesheet', name: 'held-big-quarter-log', frameW: HELD_SIZE, frameH: HELD_SIZE, palette: world, animations };
};

// ---------- Images ----------

const img = (name: string, c: Canvas, palette = world): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

/** Les quatre étapes d'une pièce coin planté, de la même taille. */
function stages(key: string, draw: (s: Stage) => Canvas): ImageSource[] {
  const out = STAGES.map((s) => img(`${key}${suffix(s)}`, draw(s), toolPalette));
  const [w, h] = [out[0].grid[0].length, out[0].grid.length];
  for (const o of out) if (o.grid[0].length !== w || o.grid.length !== h) throw new Error(`split : ${o.name} n'a pas la taille de ${key}`);
  return out;
}

const sources: ArtSource[] = [
  ...stages('big-wedged-log', wedgedLog),
  ...stages('big-wedged-log-ns', wedgedLogNS),
  img('big-half-log', halfLog()),
  img('big-half-log-ns', halfLogNS()),
  ...stages('big-wedged-half-log', wedgedHalf),
  ...stages('big-wedged-half-log-ns', wedgedHalfNS),
  img('big-quarter-log', quarterLog()),
  img('big-quarter-log-ns', quarterLogNS()),
  img('item-big-quarter-log', quarterIcon()),
  heldQuarter(),
];

export default sources;
