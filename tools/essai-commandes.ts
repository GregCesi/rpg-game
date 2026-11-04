// Essai des touches du chantier « commandes v2 » : npx tsx tools/essai-commandes.ts écrit .art-preview/commandes-touches.png.
//
// Hors combat, Xéros agit sur ce qui est devant lui, et la touche à presser s'affiche au-dessus de l'objet visé. La planche
// pose les propositions de art/proposals/commandes-touches.ts (rien n'est intégré au jeu) :
//   1. les touches seules, x6 : E (celle du jeu), F, A, Q, le signe « poser » ; E maintenu de trois façons (la jauge du jeu
//      dessous, une jauge à la largeur de la touche, la touche qui se remplit), chaque étape ;
//   2. la touche E « qu'on peut aussi maintenir », sans texte (quatre marques) ;
//   3. deux touches à la fois (E prend, F travaille) : quatre dispositions ;
//   4. des scènes à l'échelle du jeu, x2 puis x3, sur l'herbe : Xéros face au coin, au tas de branches, à l'arbre (touche
//      au-dessus du houppier ou à hauteur du tronc), à la porte, à la mère ; la hache en main devant une bille (deux
//      touches) ; E maintenable au-dessus d'un tas lié et d'une bille ; A au-dessus du fantôme de pose ; sur fond sombre.
// Les objets du jeu sont lus dans src/generated/ (PNG et manifest), Xéros dans art/characters/xeros.ts.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { rng, type Grid, type Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import {
  FILL_STEPS, heldFill, heldGaugeNarrow, heldGaugeWide, holdMarks, key, pairs, palette, smallKey,
} from '../art/proposals/commandes-touches';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = join(ROOT, 'src', 'generated');
const K = 6;
const PAD = 16;
const T = 2;
const BG: Rgb = [70, 66, 52];
const BAND: Rgb = [52, 48, 38];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];

// ---------- images du jeu ----------

const manifest = JSON.parse(readFileSync(join(GEN, 'manifest.json'), 'utf8')) as {
  spritesheets: { key: string; frameWidth: number; frameHeight: number; animations: Record<string, { frames: number[] }> }[];
  tilesets: { key: string; tiles: Record<string, number> }[];
};
const pngs = new Map<string, PNG>();
const png = (name: string) => {
  if (!pngs.has(name)) pngs.set(name, PNG.sync.read(readFileSync(join(GEN, `${name}.png`))));
  return pngs.get(name)!;
};

/** Un morceau d'image RGBA. */
interface Pic { w: number; h: number; at(x: number, y: number): [number, number, number, number] }

function pngPic(name: string, sx = 0, sy = 0, w?: number, h?: number): Pic {
  const p = png(name);
  const W = w ?? p.width, H = h ?? p.height;
  return {
    w: W, h: H,
    at: (x, y) => { const i = ((sy + y) * p.width + sx + x) * 4; return [p.data[i], p.data[i + 1], p.data[i + 2], p.data[i + 3]]; },
  };
}
/** Image d'une planche du jeu, par animation (première image). */
function frame(sheet: string, anim: string): Pic {
  const s = manifest.spritesheets.find((x) => x.key === sheet)!;
  const n = s.animations[anim].frames[0];
  const cols = png(sheet).width / s.frameWidth;
  return pngPic(sheet, (n % cols) * s.frameWidth, Math.floor(n / cols) * s.frameHeight, s.frameWidth, s.frameHeight);
}
function tile(set: string, name: string): Pic {
  const n = manifest.tilesets.find((t) => t.key === set)!.tiles[name];
  const cols = png(set).width / 32;
  return pngPic(set, (n % cols) * 32, Math.floor(n / cols) * 32, 32, 32);
}
function gridPic(g: Grid, pal: Palette): Pic {
  return {
    w: g[0].length, h: g.length,
    at: (x, y) => {
      const ch = g[y][x];
      if (ch === '.') return [0, 0, 0, 0];
      const h = pal[ch].replace('#', '');
      const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
      return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
    },
  };
}
const xerosPic = (anim: string) => gridPic(xeros.animations[anim].frames[0], xeros.palette);
const keyPic = (g: Grid) => gridPic(g, palette);

/** Haut de la silhouette opaque d'une image (sans l'ombre translucide). */
function topOf(p: Pic): number {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.at(x, y)[3] > 200) return y;
  return 0;
}

// ---------- une scène, en pixels du jeu ----------

class Scene {
  data: Float32Array;
  constructor(readonly w: number, readonly h: number) { this.data = new Float32Array(w * h * 3); }
  put(p: Pic, ox: number, oy: number, alpha = 1): this {
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const [r, g, b, a0] = p.at(x, y);
      const a = (a0 / 255) * alpha, X = ox + x, Y = oy + y;
      if (!a || X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
      const i = (Y * this.w + X) * 3;
      this.data[i] = r * a + this.data[i] * (1 - a);
      this.data[i + 1] = g * a + this.data[i + 1] * (1 - a);
      this.data[i + 2] = b * a + this.data[i + 2] * (1 - a);
    }
    return this;
  }
  /** Le sol : des tuiles de 32 px. */
  ground(tiles: Pic[]): this {
    const r = rng(this.w * 7 + this.h);
    for (let y = 0; y < this.h; y += 32) for (let x = 0; x < this.w; x += 32) this.put(tiles[Math.floor(r() * tiles.length)], x, y);
    return this;
  }
  /** Voile de la pénombre (le jeu le pose sur le monde, sous l'interface) : assombrit et bleuit. */
  veil(k: number): this {
    for (let i = 0; i < this.data.length; i += 3) {
      this.data[i] *= k * 0.9; this.data[i + 1] *= k * 0.95; this.data[i + 2] *= k * 1.1;
    }
    return this;
  }
  draw(s: Sheet, ox: number, oy: number, k: number): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 3;
      s.rect(ox + x * k, oy + y * k, k, k, [Math.min(255, this.data[i]), Math.min(255, this.data[i + 1]), Math.min(255, this.data[i + 2])].map(Math.round) as Rgb);
    }
  }
}

const GRASS = () => ['grass', 'grass2', 'grass3', 'grass4'].map((n) => tile('world', n));
const WOODS = () => ['deepwoods', 'deepwoods2', 'deepwoods3', 'deepwoods4'].map((n) => tile('world', n));
const FLOOR = () => ['floor', 'floor2', 'floor3', 'floor4'].map((n) => tile('interior', n));

/** Xéros posé par ses pieds (x au milieu de la frame, y au sol) ; renvoie la frame posée. */
function putXeros(sc: Scene, anim: string, fx: number, fy: number): { left: number; top: number } {
  const left = fx - 16, top = fy - 48 + 2; // pieds à la rangée 45 : le bas (46) au sol
  sc.put(xerosPic(anim), left, top);
  return { left, top };
}
/** Ce que tient Xéros (planche held-…), au point d'accroche de hold.json (actor.x, actor.y = milieu, bas de la frame). */
function putHeld(sc: Scene, sheet: string, dir: string, actor: { x: number; y: number }, p: { dx: number; dy: number }): void {
  const f = frame(sheet, dir);
  sc.put(f, actor.x + p.dx - Math.floor(f.w / 2), actor.y + p.dy - Math.floor(f.h / 2));
}
/** Un objet posé par son coin bas-gauche (setOrigin(0, 1) du jeu). */
function putObj(sc: Scene, p: Pic, x: number, bottom: number, alpha = 1) {
  sc.put(p, x, bottom - p.h, alpha);
  return { x, top: bottom - p.h + topOf(p), w: p.w };
}
/** Une touche centrée sur `cx`, son bas 2 px au-dessus de `top`. */
function putKey(sc: Scene, g: Grid, cx: number, top: number) {
  sc.put(keyPic(g), Math.round(cx - g[0].length / 2), top - 2 - g.length);
}

/** Le tas de branches plein du jeu (piles.json, branches), noué ou non : les places de l'arrière vers l'avant, les liens dessus. */
function branchPile(sc: Scene, x: number, y: number, tied: boolean) {
  const places: [string, number, number][] = [
    ['g0', 0, -9], ['g1', 0, -6], ['g2', 0, -3], ['g3', 0, 0], ['g4', 0, 3],
    ['l1-0', 0, -11], ['l1-1', 0, -8], ['l1-2', 0, -5], ['l1-3', 0, -2],
    ['l2-0', 0, -13], ['l2-1', 0, -10], ['l3-0', 0, -15],
  ];
  let top = Infinity;
  for (const [img, dx, dy] of places) {
    const p = pngPic(`pile-branch-${img}`);
    sc.put(p, x + dx, y + dy - p.h);
    top = Math.min(top, y + dy - p.h + topOf(p));
  }
  if (tied) {
    // tieImages : nord au bord nord des places au sol (body.y min −14), sud au bord sud (−2 + 3) + 7
    const n = pngPic('pile-branch-tie-north'), s = pngPic('pile-branch-tie-south');
    sc.put(n, x + 11, y - 14 - n.h);
    sc.put(s, x + 11, y + 8 - s.h);
  }
  return { x, top, w: 32 };
}

type Vignette = { title: string; scene: Scene };

/** Xéros face à droite, un objet à sa droite, la touche au-dessus de l'objet. */
function facing(title: string, w: number, h: number, ground: Pic[], obj: (sc: Scene, x: number, y: number) => { x: number; top: number; w: number }, keyGrid: Grid | null, opts: { anim?: string; held?: string; veil?: number } = {}): Vignette {
  const sc = new Scene(w + 8, h).ground(ground);
  const fy = h - 8;
  const fx = 20;
  putXeros(sc, opts.anim ?? 'idle-right', fx, fy);
  if (opts.held) putHeld(sc, opts.held, 'right', { x: fx, y: fy + 2 }, opts.held === 'held-axe' ? { dx: 0, dy: -14 } : { dx: 5, dy: -12 });
  const o = obj(sc, fx + 12, fy + 1);
  if (opts.veil) sc.veil(opts.veil);
  if (keyGrid) putKey(sc, keyGrid, o.x + o.w / 2, o.top);
  return { title, scene: sc };
}

function scenes(): Vignette[][] {
  const wedge = pngPic('splitting-wedge-ground');
  const log = pngPic('wood-normal-round-100');
  const E = key('E');
  const rows: Vignette[][] = [];

  // les objets seuls, E au-dessus
  const tree = pngPic('normal-tree');
  const treeScene = (title: string, onTrunk: boolean): Vignette => {
    const H = 196, W = 76;
    const sc = new Scene(W, H).ground(GRASS());
    const fy = H - 10;
    putXeros(sc, 'idle-right', 18, fy);
    // pied de l'arbre (tree.foot de props.json : 24, 161) posé à 8 px à droite de Xéros
    const tx = 42 - 24, ty = fy - 161;
    sc.put(tree, tx, ty);
    if (onTrunk) putKey(sc, E, 42, fy - 30 + 2); // le bas de la touche à 1,5 m (30 px) du sol
    else putKey(sc, E, tx + 24, ty + topOf(tree));
    return { title, scene: sc };
  };
  const door = (): Vignette => {
    const sc = new Scene(56, 92).ground(GRASS());
    const d = pngPic('plank-door');
    const o = putObj(sc, d, 18, 62);
    putXeros(sc, 'idle-up', 28, 82);
    putKey(sc, E, o.x + o.w / 2, o.top);
    return { title: 'porte (de dos)', scene: sc };
  };
  const mother = (): Vignette => {
    const sc = new Scene(64, 72).ground(GRASS());
    putXeros(sc, 'idle-right', 14, 64);
    const m = frame('mother', 'idle-left');
    sc.put(m, 34 - 16, 64 - 46);
    putKey(sc, E, 34, 64 - 46 + topOf(m));
    return { title: 'la mere', scene: sc };
  };
  rows.push([
    facing('le coin', 48, 64, GRASS(), (sc, x, y) => putObj(sc, wedge, x + 2, y), E),
    facing('tas de branches', 68, 64, GRASS(), (sc, x, y) => branchPile(sc, x + 2, y - 3, false), E),
    treeScene('arbre : au-dessus du houppier', false),
    treeScene('arbre : a 1,5 m, sur le tronc', true),
    door(),
    mother(),
  ]);

  // deux touches : la hache sur l'épaule devant la bille, une vignette par disposition
  rows.push(pairs.map((p) => facing(`bille : ${p.title}`, 64, 72, GRASS(), (sc, x, y) => putObj(sc, log, x + 4, y), p.grid, { anim: 'shoulder-idle-right', held: 'held-axe' })));

  // E qu'on peut aussi maintenir : au-dessus d'un tas de branches lié, puis d'une bille
  rows.push([
    ...holdMarks.map((m) => facing(`tas lie : ${m.title}`, 68, 76, GRASS(), (sc, x, y) => branchPile(sc, x + 2, y - 3, true), m.grid)),
    ...holdMarks.map((m) => facing(`bille : ${m.title}`, 56, 64, GRASS(), (sc, x, y) => putObj(sc, log, x + 2, y), m.grid)),
  ]);

  // A au-dessus du fantôme de pose : la bille portée, la bille en transparence devant Xéros
  const ghost = (title: string, g: Grid | null): Vignette =>
    facing(title, 64, 64, GRASS(), (sc, x, y) => putObj(sc, log, x + 6, y, 0.5), g, { anim: 'carry-idle-right', held: 'held-wood-normal-round' });
  rows.push([ghost('fantome : A', key('A')), ghost('fantome : signe poser', key('down')), ghost('fantome : sans touche', null)]);

  // fond sombre : plancher, sous-bois, sous-bois au crépuscule (voile du jeu sur le monde, la touche au-dessus)
  const chest = pngPic('chest');
  rows.push([
    facing('plancher : coffre', 60, 64, FLOOR(), (sc, x, y) => putObj(sc, chest, x + 2, y), E),
    facing('sous-bois : coin', 48, 64, WOODS(), (sc, x, y) => putObj(sc, wedge, x + 2, y), E),
    facing('sous-bois : deux touches', 64, 72, WOODS(), (sc, x, y) => putObj(sc, log, x + 4, y), pairs[0].grid, { anim: 'shoulder-idle-right', held: 'held-axe' }),
    facing('sous-bois au soir : E', 48, 64, WOODS(), (sc, x, y) => putObj(sc, wedge, x + 2, y), E, { veil: 0.45 }),
    facing('sous-bois au soir : E F', 64, 72, WOODS(), (sc, x, y) => putObj(sc, log, x + 4, y), pairs[0].grid, { anim: 'shoulder-idle-right', held: 'held-axe', veil: 0.45 }),
  ]);
  return rows;
}

// ---------- la planche ----------

type Cell = { w: number; h: number; draw: (s: Sheet, x: number, top: number) => void };

function images(gs: Grid[], label: string, k = K, gap = 2): Cell {
  const artW = gs.reduce((s, g) => s + g[0].length, 0) * k + (gs.length - 1) * gap * k;
  const artH = Math.max(...gs.map((g) => g.length)) * k;
  return {
    w: Math.max(artW, textWidth(label, T)) + PAD, h: artH + 22,
    draw: (s, x, top) => {
      let gx = x;
      for (const g of gs) { s.blit(g, palette, gx, top + artH - g.length * k, k); gx += (g[0].length + gap) * k; }
      s.text(label, x, top + artH + 6, GREY, T);
    },
  };
}
function sceneCell(v: Vignette, k: number): Cell {
  return {
    w: Math.max(v.scene.w * k, textWidth(v.title, T)) + PAD, h: v.scene.h * k + 22,
    draw: (s, x, top) => { v.scene.draw(s, x, top, k); s.text(v.title, x, top + v.scene.h * k + 6, GREY, T); },
  };
}

type Row = { title: string; cells: Cell[] };

const MAX = 2400;
function wrap(title: string, cells: Cell[]): Row[] {
  const out: Row[] = [{ title, cells: [] }];
  let w = 0;
  for (const c of cells) {
    if (w + c.w > MAX && out[out.length - 1].cells.length) { out.push({ title: '', cells: [] }); w = 0; }
    out[out.length - 1].cells.push(c);
    w += c.w;
  }
  return out;
}

function main() {
  const steps = Array.from({ length: FILL_STEPS }, (_, k) => k);
  const bands: { title: string; note: string; rows: Row[] }[] = [];

  bands.push({
    title: '1. Les touches seules (x6)',
    note: 'meme facture que ui-key-e : 11 X 10, parchemin a, ombre A, contour et lettre o. A et Q : la meme place du clavier',
    rows: [
      ...wrap('les touches', [
        images([key('E')], 'E agir (le jeu)'), images([key('F')], 'F travailler'), images([key('A')], 'A poser'),
        images([key('Q')], 'Q (qwerty)'), images([key('down')], 'signe poser'),
        images([key('E'), key('F'), key('A'), key('down')], 'x2', 2, 2), images([key('E'), key('F'), key('A'), key('down')], 'x3', 3, 2),
      ]),
      ...wrap('E maintenu (a) : la jauge du jeu (ui-gauge 14 X 4) 1 px sous la touche', steps.filter((k) => k % 2 === 0).map((k) => images([heldGaugeWide(k)], `${k}/8`))),
      ...wrap('E maintenu (a2) : une jauge de meme facture, a la largeur de la touche (11 X 4)', steps.filter((k) => k % 2 === 0).map((k) => images([heldGaugeNarrow(k)], `${k}/8`))),
      ...wrap('E maintenu (b) : la touche se remplit de bas en haut, une rangee par etape (9 images, l or de la jauge)', steps.map((k) => images([heldFill(k)], `${k}/8`))),
    ],
  });
  bands.push({
    title: '2. E qu on peut aussi maintenir (sans texte)',
    note: 'nouer ou denouer un tas lie, pivoter une bille : la touche dit qu un appui long fait autre chose',
    rows: wrap('quatre marques', [...holdMarks.map((m) => images([m.grid], m.title)), images(holdMarks.map((m) => m.grid), 'x2', 2, 3), images(holdMarks.map((m) => m.grid), 'x3', 3, 3)]),
  });
  bands.push({
    title: '3. Deux touches (E prend la bille, F la coupe)',
    note: 'recommande : 1, cote a cote, ordre fixe E puis F',
    rows: wrap('dispositions', [...pairs.map((p) => images([p.grid], p.title)), images(pairs.map((p) => p.grid), 'x2', 2, 4), images(pairs.map((p) => p.grid), 'x3', 3, 4), images([smallKey('E'), smallKey('F')], 'petites 7 X 9')]),
  });
  const sc = scenes();
  const names = ['objets', 'deux touches, la hache sur l epaule', 'E maintenable', 'A au-dessus du fantome de pose', 'fond sombre'];
  for (const k of [2, 3]) {
    bands.push({
      title: `4. Scenes a l echelle du jeu x${k}`,
      note: 'tuiles et objets du jeu (src/generated), Xeros d art/characters/xeros.ts',
      rows: sc.flatMap((r, i) => wrap(names[i], r.map((v) => sceneCell(v, k)))),
    });
  }

  const rowH = (r: Row) => Math.max(...r.cells.map((c) => c.h));
  const rowW = (r: Row) => r.cells.reduce((s, c) => s + c.w, 0);
  const width = Math.max(...bands.flatMap((b) => b.rows.map(rowW)), ...bands.map((b) => textWidth(b.note, T))) + 2 * PAD;
  const height = bands.reduce((s, b) => s + 60 + b.rows.reduce((t, r) => t + rowH(r) + 26, 0) + 20, 10);
  const sheet = new Sheet(width, height, BG);
  let y = 10;
  for (const b of bands) {
    sheet.text(b.title, PAD, y, GOLD, 4);
    sheet.text(b.note, PAD, y + 28, GOLD, T);
    y += 56;
    for (const r of b.rows) {
      if (r.title) sheet.text(r.title, PAD, y, WHITE, T);
      y += 18;
      let x = PAD;
      const h = rowH(r);
      for (const c of r.cells) { c.draw(sheet, x, y + h - c.h); x += c.w; }
      y += h + 8;
    }
    sheet.rect(0, y + 6, width, 3, BAND);
    y += 20;
  }
  const out = join(ROOT, '.art-preview', 'commandes-touches.png');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-commandes -> ${out} (${width} X ${height})`);
}

main();
