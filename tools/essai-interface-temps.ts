// Essai de l'interface du temps (hors jeu, chantier « temps ») : npx tsx tools/essai-interface-temps.ts écrit
// .art-preview/essai-interface-temps.png, d'après les dessins de art/proposals/horloge-temps.ts.
//
// La planche : chaque piste de l'horloge en ligne, à quatre moments en colonnes (6 h, aube ; 13 h, jour ; 19 h 30, crépuscule ;
// 23 h, nuit), chacun sur une capture d'écran simulée de la vue du jeu (640 × 360 px du jeu, VIEW de src/config.ts, à l'échelle 1 :
// le jeu l'affiche à x2) : de l'herbe, un arbre normal, un buisson, Xéros au centre ; le HUD en place (les deux cases, la hache dans
// la main droite active, la barre d'endurance au-dessus, posées comme HudScene) et l'horloge à la place de sa piste. La lumière du
// monde qui suit l'heure (une teinte multipliée, qui ne touche pas le HUD) est simulée ici : le jeu ne l'a pas encore (étape 6).
// En dessous : l'horloge seule, x4, avec un peu du fond autour, pour chaque piste et chaque moment.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import tiles from '../art/world/tiles';
import { MOMENTS, PISTES, palette as clockPalette, text as hudText, type Moment } from '../art/proposals/horloge-temps';
import { STAMINA_BAR, VIEW } from '../src/config';
import { Sheet, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = join(ROOT, 'src/generated');

// ---------------------------------------------------------------------------------------------------------------------
// Un tampon RGBA à l'échelle du jeu
// ---------------------------------------------------------------------------------------------------------------------

class Buf {
  readonly data: Float64Array;
  constructor(readonly w: number, readonly h: number) { this.data = new Float64Array(w * h * 4); }
  dot(X: number, Y: number, r: number, g: number, b: number, a: number) {
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h || a <= 0) return;
    const i = (Y * this.w + X) * 4;
    const ba = this.data[i + 3];
    const oa = a + ba * (1 - a);
    this.data[i] = (r * a + this.data[i] * ba * (1 - a)) / oa;
    this.data[i + 1] = (g * a + this.data[i + 1] * ba * (1 - a)) / oa;
    this.data[i + 2] = (b * a + this.data[i + 2] * ba * (1 - a)) / oa;
    this.data[i + 3] = oa;
  }
  grid(grid: Grid, pal: Palette, ox: number, oy: number) {
    grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const hex = pal[ch]?.replace('#', '');
      if (!hex) throw new Error(`couleur « ${ch} » absente de la palette`);
      const n = (k: number) => parseInt(hex.slice(k, k + 2), 16);
      this.dot(ox + x, oy + y, n(0), n(2), n(4), hex.length === 8 ? n(6) / 255 : 1);
    }));
  }
  png(img: PNG, ox: number, oy: number, sx = 0, sy = 0, sw = img.width, sh = img.height) {
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = ((sy + y) * img.width + sx + x) * 4;
      this.dot(ox + x, oy + y, img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3] / 255);
    }
  }
  /** Multiplie chaque pixel par une teinte (la lumière du monde). */
  tint([r, g, b]: [number, number, number]) {
    for (let i = 0; i < this.w * this.h; i++) {
      this.data[i * 4] *= r;
      this.data[i * 4 + 1] *= g;
      this.data[i * 4 + 2] *= b;
    }
  }
  copy(): Buf {
    const b = new Buf(this.w, this.h);
    b.data.set(this.data);
    return b;
  }
  into(s: Sheet, sx: number, sy: number, k: number, cx = 0, cy = 0, cw = this.w, ch = this.h) {
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = ((cy + y) * this.w + cx + x) * 4;
      const a = this.data[i + 3];
      if (!a) continue;
      const c: Rgb = [Math.round(this.data[i]), Math.round(this.data[i + 1]), Math.round(this.data[i + 2])];
      s.rect(sx + x * k, sy + y * k, k, k, c);
    }
  }
}

const load = (key: string) => PNG.sync.read(readFileSync(join(GEN, `${key}.png`)));

// ---------------------------------------------------------------------------------------------------------------------
// La scène : le monde, puis le HUD
// ---------------------------------------------------------------------------------------------------------------------

const W = VIEW.width;
const H = VIEW.height;

/** La lumière du monde à chaque moment (simulée) : un facteur par canal. */
const LIGHT: Record<Moment, [number, number, number]> = {
  aube: [0.95, 0.82, 0.78],
  jour: [1, 1, 1],
  crepuscule: [0.92, 0.66, 0.5],
  nuit: [0.32, 0.38, 0.58],
};

/** L'endurance à chaque moment (la journée type de docs/CONCEPTION.md) : souffle, plafond, maximum. */
const ENERGY: Record<Moment, [number, number, number]> = {
  aube: [100, 100, 100],
  jour: [48, 62, 100],
  crepuscule: [30, 34, 100],
  nuit: [12, 14, 100],
};

/** Les quatre heures de la planche, en minutes, et le jour. */
const TIMES: { min: number; label: string; moment: Moment }[] = [
  { min: 6 * 60, label: '6:00', moment: 'aube' },
  { min: 13 * 60, label: '13:00', moment: 'jour' },
  { min: 19 * 60 + 30, label: '19:30', moment: 'crepuscule' },
  { min: 23 * 60, label: '23:00', moment: 'nuit' },
];
const DAY = 3;

function world(): Buf {
  const b = new Buf(W, H);
  const names = ['grass', 'grass2', 'grass3', 'grass', 'grass4', 'grass5', 'grass', 'grass6'];
  let k = 0;
  for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) {
    const name = names[(k++ * 5 + y) % names.length] as keyof typeof tiles.tiles;
    b.grid(tiles.tiles[name] as Grid, tiles.palette as Palette, x, y);
  }
  for (const [x, y] of [[96, 96], [480, 256], [544, 32]]) b.grid(tiles.tiles.flowers as Grid, tiles.palette as Palette, x, y);
  // un arbre normal au nord-est de Xéros, un buisson au sud-ouest, Xéros au centre (la caméra le suit)
  const tree = load('normal-tree');
  b.png(tree, 372, 196 - tree.height);
  const bush = load('bush');
  b.png(bush, 236, 232 - bush.height);
  const x = load('xeros');
  b.png(x, W / 2 - 16, 196 - 45 - 1, 0, 0, 32, 48);
  return b;
}

/** Le HUD de HudScene : les deux cases (la hache dans la main droite, active), leurs lettres, la barre d'endurance au-dessus. */
function hud(b: Buf, [breath, ceiling, max]: [number, number, number]) {
  const slot = load('ui-slot');
  const active = load('ui-slot-active');
  const size = slot.width;
  const GAP = 4;
  const BOTTOM = 10;
  const x0 = Math.round((W - (2 * size + GAP)) / 2);
  const y0 = H - BOTTOM - size;
  [[slot, 'ui-hand-left', 'G'], [active, 'item-axe', 'D']].forEach(([s, icon, name], i) => {
    const x = x0 + i * (size + GAP);
    b.png(s as PNG, x, y0);
    const ic = load(icon as string);
    b.png(ic, x + size / 2 - ic.width / 2, y0 + size / 2 - ic.height / 2);
    // la lettre de la case (le jeu l'écrit en texte, Pixelify 8 px cerclé) : ici en signes du HUD, à la même place
    const t = hudText(name as string);
    b.grid(t.toGrid(), clockPalette, x + size / 2 - Math.floor(t.w / 2), y0 + size);
  });
  // la barre d'endurance, comme HudScene.makeEnergy et showEnergy
  const { pxPerPoint, inner, end, height, gap } = STAMINA_BAR;
  const px = (v: number) => (v <= 0 ? 0 : Math.max(1, Math.round(v * pxPerPoint)));
  const iw = Math.max(1, Math.round(max * pxPerPoint));
  const pc = Math.min(px(ceiling), iw);
  const pb = Math.min(px(breath), pc);
  const bx = Math.round(W / 2 - (iw + 2 * end) / 2);
  const by = y0 - gap - height;
  b.png(load('ui-bar-left'), bx, by);
  const mid = load('ui-bar-mid');
  for (let i = 0; i < iw; i++) b.png(mid, bx + end + i, by);
  b.png(load('ui-bar-right'), bx + end + iw, by);
  const lost = load('ui-bar-lost');
  for (let i = 0; i < iw; i++) b.png(lost, bx + inner + i, by + inner, i % 3, 0, 1, 4);
  const part = (edgeKey: string, bodyKey: string, from: number, width: number) => {
    if (width <= 0) return;
    b.png(load(edgeKey), bx + inner + from, by + inner);
    const body = load(bodyKey);
    for (let i = 1; i < width; i++) b.png(body, bx + inner + from + i, by + inner);
  };
  part('ui-bar-back-edge', 'ui-bar-back', pb, pc - pb);
  const low = ceiling < 0.15 * max;
  part(low ? 'ui-bar-breath-low-edge' : 'ui-bar-breath-edge', low ? 'ui-bar-breath-low' : 'ui-bar-breath', 0, pb);
  return { barTop: by };
}

/** Une capture : le monde à la lumière du moment, le HUD, l'horloge de la piste. Renvoie aussi le cadre de l'horloge. */
function shot(base: Buf, piste: (typeof PISTES)[number], t: (typeof TIMES)[number]) {
  const b = base.copy();
  b.tint(LIGHT[t.moment]);
  const { barTop } = hud(b, ENERGY[t.moment]);
  const clock = piste.draw(DAY, t.min);
  const M = 4;
  const at =
    piste.key === 'A' ? { x: W - M - clock.w, y: M }
    : piste.key === 'B' ? { x: Math.round((W - clock.w) / 2), y: barTop - 3 - clock.h }
    : { x: Math.round((W - clock.w) / 2), y: M };
  b.grid(clock.toGrid(), clockPalette, at.x, at.y);
  return { b, box: { ...at, w: clock.w, h: clock.h } };
}

// ---------------------------------------------------------------------------------------------------------------------
// La planche
// ---------------------------------------------------------------------------------------------------------------------

const PAD = 16;
const TITLE = 28;
const ZOOM = 4;
const ZPAD = 6; // fond autour de l'horloge agrandie, en px du jeu
const base = world();
const shots = PISTES.map((p) => TIMES.map((t) => shot(base, p, t)));

const zoomW = Math.max(...shots.flat().map((s) => (s.box.w + 2 * ZPAD) * ZOOM));
const zoomH = (p: number) => Math.max(...shots[p].map((s) => (s.box.h + 2 * ZPAD) * ZOOM));
const SW = Math.max(4 * W + 5 * PAD, 4 * zoomW + 5 * PAD + 220);
const zoomBlock = PISTES.reduce((n, _, p) => n + TITLE + zoomH(p) + PAD, 0);
const SH = PAD + TITLE + PISTES.length * (TITLE + H + PAD) + TITLE + zoomBlock + PAD;
const sheet = new Sheet(SW, SH, [36, 32, 26]);
const ink: Rgb = [236, 223, 189];
const dim: Rgb = [170, 155, 125];

let y = PAD;
sheet.text('INTERFACE DU TEMPS : TROIS PISTES, QUATRE MOMENTS (CAPTURES 640 X 360, ECHELLE 1 ; LE JEU LES AFFICHE A X2)', PAD, y, ink, 3);
y += TITLE;
PISTES.forEach((p, pi) => {
  sheet.text(`${p.name} (${p.where})`, PAD, y, ink, 3);
  y += TITLE - 6;
  TIMES.forEach((t, ti) => {
    const x = PAD + ti * (W + PAD);
    sheet.text(`${t.label}  ${MOMENTS.find((m) => m.key === t.moment)!.name}`, x, y - 2, dim, 2);
    shots[pi][ti].b.into(sheet, x, y + 12, 1);
  });
  y += H + PAD + 6 + 12;
});
sheet.text(`L'HORLOGE SEULE, X${ZOOM}, AVEC SON FOND`, PAD, y, ink, 3);
y += TITLE;
PISTES.forEach((p, pi) => {
  sheet.text(p.name, PAD, y + 8, ink, 2);
  TIMES.forEach((t, ti) => {
    const s = shots[pi][ti];
    const x = PAD + 220 + ti * (zoomW + PAD);
    sheet.text(`${t.label}  ${MOMENTS.find((m) => m.key === t.moment)!.name}`, x, y, dim, 2);
    const cx = Math.max(0, s.box.x - ZPAD);
    const cy = Math.max(0, s.box.y - ZPAD);
    const cw = Math.min(W - cx, s.box.w + 2 * ZPAD);
    const ch = Math.min(H - cy, s.box.h + 2 * ZPAD);
    s.b.into(sheet, x, y + 14, ZOOM, cx, cy, cw, ch);
  });
  y += TITLE + zoomH(pi) + PAD;
});

mkdirSync(join(ROOT, '.art-preview'), { recursive: true });
const out = join(ROOT, '.art-preview/essai-interface-temps.png');
writeFileSync(out, PNG.sync.write(sheet.png));
// une capture par piste au jour, x2 comme à l'écran, pour regarder de près
PISTES.forEach((p, pi) => TIMES.forEach((t, ti) => {
  const s = new Sheet(W * 2, H * 2, [0, 0, 0]);
  shots[pi][ti].b.into(s, 0, 0, 2);
  writeFileSync(join(ROOT, `.art-preview/essai-interface-temps-${p.key}-${t.moment}.png`), PNG.sync.write(s.png));
}));
console.log(`écrit ${out} (${SW} × ${SH}) et les captures x2 essai-interface-temps-<piste>-<moment>.png`);
