// Le terrain en projection A (chantier « relief », CADRAGE.md section 12.4) : ce qui est à une hauteur h se dessine h / 5 cm plus haut.
// Le sol de la carte (ses tuiles, telles que Tiled les a peintes) est découpé en morceaux de CHUNK px :
// - un morceau où la hauteur ne varie pas (avec une marge autour : ce qui est au sud monte dans son image) est dessiné par un calque de
//   tuiles posé plus haut de sa hauteur, un calque par hauteur (la ferme à 0, le plateau à 5 m) ;
// - un morceau où elle varie (le bord de la falaise, le chemin creux, les talus) est peint pixel par pixel, colonne par colonne, du nord
//   au sud, chaque point du sol à y − h/5 : une face tournée vers le sud remplit le trou qu'elle laisse (en vraie grandeur) ; une face
//   tournée vers l'est ou l'ouest se montre en raccourci (FACE.raked px pour 5 m) ; l'ombre de ce qui est plus haut tombe comme celle
//   des toits (SHADOW, fixe) ; la pénombre d'un creux suit sa profondeur (RELIEF.gloom à 5 m), cuite dans le terrain, jamais sur Xéros ;
//   ce qui, plus au sud et plus haut, se dessine par-dessus le sol plus au nord (le bord sud du chemin creux, le flanc nord d'un talus)
//   va dans des bandes de 8 px du monde, chacune à la profondeur de son bord nord : Xéros passe derrière elles.
// Les matières des faces sont les dessins du pixel-artist (art/world/relief.ts : MATTER ci-dessous).

import Phaser from 'phaser';
import { DEPTH, GLOOM, RELIEF, SHADOW, TILE } from '../config';
import { maps, props } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { MapData } from '../content/types';
import { tilesets } from '../generated/assets';
import { deepAt, heightAt, reliefOf, stepsAt, type StepPlace } from './relief';

/** La taille d'un morceau du terrain (px du monde). */
const CHUNK = 256;
/** La hauteur d'une bande de ce qui passe devant (px du monde). */
const BAND = 8;
/** Une face est ou ouest vue en raccourci : sa largeur à l'écran pour 5 m (px). */
const FACE = { raked: 12, full: 100 };

/** La hauteur (cm) au point (x, y) d'une carte, ou de la zone voisine au-delà de son bord (0 hors du monde). */
export function worldHeight(def: MapData, x: number, y: number): number {
  const W = def.width * TILE;
  const H = def.height * TILE;
  if ((x >= 0 && y >= 0 && x < W && y < H) || !def.world) return heightAt(def, Math.max(0, Math.min(W - 0.01, x)), Math.max(0, Math.min(H - 0.01, y)));
  const wx = def.world.x + x;
  const wy = def.world.y + y;
  for (const m of Object.values(maps)) {
    if (!m.world || m === def) continue;
    const lx = wx - m.world.x;
    const ly = wy - m.world.y;
    if (lx >= 0 && ly >= 0 && lx < m.width * TILE && ly < m.height * TILE) return heightAt(m, lx, ly);
  }
  return 0;
}

/** La carte a-t-elle du relief à dessiner (une hauteur autre que 0 quelque part) ? */
export function hasRelief(def: MapData): boolean {
  const f = reliefOf(def);
  return !f.flat || f.base !== 0;
}

/** Les pixels d'un jeu de tuiles (son image, lue une fois). */
const tilePixels = new Map<string, { data: Uint8ClampedArray; w: number }>();
function pixelsOf(scene: Phaser.Scene, key: string): { data: Uint8ClampedArray; w: number } {
  let p = tilePixels.get(key);
  if (!p) {
    const img = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    p = { data: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width };
    tilePixels.set(key, p);
  }
  return p;
}

type Rgb = [number, number, number];
const rgb = (n: number): Rgb => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const SHADE = rgb(SHADOW.color);
const DARK = rgb(GLOOM.color);
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * Les matières des faces (art/world/relief.ts, dessinées par le pixel-artist) : la face sud de terre (`relief-face-earth-*`, 64 × 100,
 * la rangée 99 au pied, coupée par le haut pour une face plus basse), la même au-dessus de l'eau (`relief-face-wet-*`), la lèvre
 * (`relief-lip-*`, 64 × 12, sa rangée LIP.crest sur l'arête), les faces est et ouest en raccourci (`relief-face-raked-*`, 24 × 64 :
 * 12 colonnes de la lèvre au pied, puis le lierre qui déborde ; `relief-face-raked-west-*`, 12 × 64, la lèvre à droite).
 */
const MATTER = {
  /** Les parois en gradins (CADRAGE 13.0) : le dessus d'un gradin (64 × 10), la marche (64 × 25), la terre en coupe (32 × 32). */
  tread: [0, 1, 2, 3, 4, 5].map((k) => `relief-tread-${k}`),
  riser: [0, 1, 2, 3].map((k) => `relief-riser-${k}`),
  /** Les racines d'un arbre des gradins (`roots` de props.json), 14 × 25, posées sur la marche sous lui, centrées sur son pied. */
  roots: [0, 1, 2, 3].map((k) => `relief-roots-${k}`),
  cut: [0, 1, 2, 3, 4, 5, 6, 7].map((k) => `relief-cut-${k}`),
  earth: ['relief-face-earth-0', 'relief-face-earth-1', 'relief-face-earth-2'],
  wet: ['relief-face-wet-0', 'relief-face-wet-1'],
  lip: ['relief-lip-0', 'relief-lip-1'],
  east: ['relief-face-raked-0', 'relief-face-raked-1'],
  west: ['relief-face-raked-west-0', 'relief-face-raked-west-1'],
};
const FACE_W = 64;
const FACE_H = 100;
const LIP = { h: 12, crest: 4 };
const TREAD = { w: 64, h: 10 };
const RISER = { w: 64, h: 25 };
const CUT = 32;
const ROOTS = { w: 14, half: 7 };
const RAKE = { w: 12, h: 64 };
type Matter = { data: Uint8ClampedArray; w: number };
/**
 * La variante de la terre en coupe d'une case de 32 px (à l'écran), tirée de sa place (règle du pixel-artist, CADRAGE 13.0) : son tirage,
 * décalé tant qu'il vaut le tirage brut de la case à l'ouest ou au nord (toutes les variantes se raccordent par leur bord commun).
 */
function cutVariant(tx: number, ty: number): number {
  const n = MATTER.cut.length;
  const raw = (i: number, j: number) => Math.floor(hash(i * 7 + 3, j * 13 + 5) * n);
  let v = raw(tx, ty);
  for (let k = 0; k < n && (v === raw(tx - 1, ty) || v === raw(tx, ty - 1)); k++) v = (v + 1) % n;
  return v;
}
const choose = (list: string[], k: number) => list[Math.floor(hash(k, 3) * list.length)];
/** Le pixel (x, y) d'une image, ou undefined s'il est transparent. */
function at(m: Matter, x: number, y: number): Rgb | undefined {
  const i = (y * m.w + x) * 4;
  return m.data[i + 3] < 128 ? undefined : [m.data[i], m.data[i + 1], m.data[i + 2]];
}

/**
 * Les morceaux du terrain à peindre (chantier « corrections », DIAGNOSTIC.md : la ferme gelait 1,2 s à sa première visite, une forêt
 * jusqu'à 0,9 s) : chacun sa peinture en cours, ceux qui l'attendent, sa place (le plus près de la caméra d'abord). La file survit aux
 * changements de scène : les textures et le registre sont au jeu.
 */
interface PaintJob {
  steps: Generator<void, Made, void>;
  done: ((made: Made) => void)[];
  at: { x: number; y: number };
  registry: Phaser.Data.DataManager;
}
const jobs = new Map<string, PaintJob>();

/**
 * Avance la peinture des morceaux en attente pendant `budgetMs` ms au plus (le plus proche de `focus` d'abord, px de la scène) ; un
 * morceau fini est gardé et posé là où on l'attend. À appeler une fois par image dessinée (WorldScene.update).
 */
export function paintTerrain(budgetMs: number, focus: { x: number; y: number }): void {
  const t0 = performance.now();
  while (jobs.size && performance.now() - t0 < budgetMs) {
    let best: [string, PaintJob] | undefined;
    let d = Infinity;
    for (const e of jobs) {
      const dd = (e[1].at.x - focus.x) ** 2 + (e[1].at.y - focus.y) ** 2;
      if (dd < d) [d, best] = [dd, e];
    }
    const [base, job] = best!;
    // un pas, puis le temps est relu : un pas ne dure qu'une colonne ou une rangée
    for (let k = 0; k < 8; k++) {
      const r = job.steps.next();
      if (!r.done) continue;
      jobs.delete(base);
      job.registry.set(base, r.value);
      for (const f of job.done) f(r.value);
      break;
    }
  }
}

/** Des morceaux attendent-ils d'être peints dans ce rectangle (px de la scène) ? Sans rectangle : où que ce soit. */
export function terrainPending(r?: { x: number; y: number; w: number; h: number }): boolean {
  for (const j of jobs.values()) if (!r || (j.at.x > r.x - CHUNK && j.at.x < r.x + r.w + CHUNK && j.at.y > r.y - CHUNK && j.at.y < r.y + r.h + CHUNK)) return true;
  return false;
}

/** Ce qu'un morceau peint a produit (gardé dans le registre : une fois par carte). */
type Made = { top: number; h: number; bands: { key: string; x: number; y: number; depth: number }[]; cut?: { key: string; x: number; y: number } };

/** Le rectangle des pixels peints (alpha non nul) d'une image, ou undefined si elle est vide. */
function paintedBox(buf: Uint8ClampedArray, w: number, h: number): { x: number; y: number; w: number; h: number } | undefined {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (buf[(y * w + x) * 4 + 3] !== 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? undefined : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Le terrain d'une carte (ou de la part d'une voisine qu'on voit dans la bande, posée à (ox, oy)), cases [x0, x1[ × [y0, y1[. Les
 * textures des morceaux peints se gardent d'une scène à l'autre (le terrain ne dépend que de la carte).
 */
export class TerrainView {
  readonly parts: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly def: MapData,
    private readonly ox: number,
    private readonly oy: number,
    r: { x0: number; y0: number; x1: number; y1: number },
  ) {
    const tileset = tilesets.find((t) => t.key === def.tileset)!;
    const max = Math.ceil(Math.max(reliefOf(def).max, 500) / CM_PER_PX);
    const px0 = r.x0 * TILE;
    const py0 = r.y0 * TILE;
    const px1 = r.x1 * TILE;
    const py1 = r.y1 * TILE;
    const L = (x: number, y: number) => worldHeight(def, x, y) / CM_PER_PX;
    // les morceaux : constants (une hauteur) ou à peindre
    const constant = new Map<string, number>();
    const painted: { cx: number; cy: number }[] = [];
    for (let cy = Math.floor(py0 / CHUNK) * CHUNK; cy < py1; cy += CHUNK)
      for (let cx = Math.floor(px0 / CHUNK) * CHUNK; cx < px1; cx += CHUNK) {
        let lo = Infinity;
        let hi = -Infinity;
        for (let y = cy - BAND; y <= cy + CHUNK + max + BAND; y += BAND)
          for (let x = cx - BAND; x <= cx + CHUNK + BAND; x += BAND) {
            const h = L(x, y);
            if (h < lo) lo = h;
            if (h > hi) hi = h;
          }
        if (hi - lo < 0.5) constant.set(`${cx},${cy}`, Math.round(lo));
        else painted.push({ cx, cy });
      }
    // les calques de tuiles, un par hauteur, posés plus haut d'autant
    const heights = [...new Set(constant.values())].sort((a, b) => a - b);
    for (const h of heights) {
      const data: number[][] = [];
      for (let ty = r.y0; ty < r.y1; ty++) {
        const row: number[] = [];
        for (let tx = r.x0; tx < r.x1; tx++) {
          const key = `${Math.floor((tx * TILE) / CHUNK) * CHUNK},${Math.floor((ty * TILE) / CHUNK) * CHUNK}`;
          row.push(constant.get(key) === h ? def.layers.ground[ty * def.width + tx] : -1);
        }
        data.push(row);
      }
      const tm = scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
      const ts = tm.addTilesetImage(tileset.key, tileset.key, TILE, TILE, 0, 0)!;
      const layer = tm.createLayer(0, ts, ox + px0, oy + py0 - h)!;
      layer.setDepth(DEPTH.ground);
      this.parts.push(layer);
    }
    // les morceaux peints, du nord au sud (ce qui est au sud passe par-dessus)
    painted.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
    // (un morceau entier, borné à la carte : le même pour la carte et pour la bande d'une voisine, peint une seule fois)
    const mw = def.width * TILE;
    const mh = def.height * TILE;
    for (const c of painted) this.paint(tileset.key, c.cx, c.cy, Math.min(mw, c.cx + CHUNK), Math.min(mh, c.cy + CHUNK), Math.max(0, c.cx), Math.max(0, c.cy), L, max);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.alive = false));
  }

  /** La scène qui montre ce terrain tourne encore (un morceau peint plus tard n'est posé que dans une scène vivante). */
  private alive = true;

  /**
   * Un morceau peint : sa texture (gardée), son image au sol et ses bandes de ce qui passe devant. Déjà peint (une visite d'avant, la
   * bande d'une voisine) : posé tout de suite ; sinon confié à la file des morceaux à peindre (`paintTerrain`, quelques ms par image,
   * jamais d'un coup : chantier « corrections »), et posé quand il est prêt, si la scène tourne encore.
   */
  private paint(key: string, _cx: number, _cy: number, x1: number, y1: number, x0: number, y0: number, L: (x: number, y: number) => number, max: number): void {
    const scene = this.scene;
    const base = `terrain:${this.def.id}:${x0},${y0}`;
    const meta = scene.registry.get(base) as Made | undefined;
    if (meta) return this.place(base, meta, x0);
    const at = { x: this.ox + (x0 + x1) / 2, y: this.oy + (y0 + y1) / 2 };
    let job = jobs.get(base);
    if (!job) jobs.set(base, (job = { steps: this.renderSteps(key, base, x0, y0, x1, y1, L, max), done: [], at, registry: scene.registry }));
    job.at = at;
    job.done.push((made) => this.alive && this.place(base, made, x0));
  }

  /** Les images d'un morceau peint : le sol, la terre en coupe, les bandes de ce qui passe devant. */
  private place(base: string, made: Made, x0: number): void {
    const scene = this.scene;
    this.parts.push(scene.add.image(this.ox + x0, this.oy + made.top, base).setOrigin(0, 0).setDepth(DEPTH.ground).setData('noLift', true));
    // la terre en coupe, cachée tant que Xéros n'est pas sous la voûte (systems/laneFade.ts la montre)
    if (made.cut) this.parts.push(scene.add.image(this.ox + made.cut.x, this.oy + made.cut.y, made.cut.key).setOrigin(0, 0).setDepth(DEPTH.ground + 0.05).setAlpha(0).setData('noLift', true).setData('cut', true));
    for (const b of made.bands) this.parts.push(scene.add.image(this.ox + b.x, this.oy + b.y, b.key).setOrigin(0, 0).setDepth(this.oy + b.depth).setData('noLift', true));
  }

  /**
   * La peinture d'un morceau, par petits pas (un générateur : il rend la main après chaque rangée de la grille des hauteurs, chaque
   * colonne, chaque image produite), pour qu'aucune image du jeu n'attende tout le morceau ; son résultat : ce qui a été produit.
   */
  private *renderSteps(key: string, base: string, x0: number, y0: number, x1: number, y1: number, Lw: (x: number, y: number) => number, max: number): Generator<void, Made, void> {
    const scene = this.scene;
    // les hauteurs du morceau et de ses abords, lues une fois (px d'écran, au pixel près)
    const gx0 = x0 - Math.ceil(SHADOW.dx * max) - 2;
    const gy0 = y0 - Math.max(64, Math.ceil(SHADOW.dy * max)) - 2;
    const gx1 = x1 + 2;
    const gy1 = y1 + 64;
    const gw = gx1 - gx0;
    const grid = new Float32Array(gw * (gy1 - gy0));
    for (let y = gy0; y < gy1; y++) {
      for (let x = gx0; x < gx1; x++) grid[(y - gy0) * gw + (x - gx0)] = Lw(x, y);
      yield;
    }
    const L = (x: number, y: number) => {
      const ix = Math.round(x) - gx0;
      const iy = Math.round(y) - gy0;
      return ix >= 0 && iy >= 0 && ix < gw && iy < gy1 - gy0 ? grid[iy * gw + ix] : Lw(x, y);
    };
    const def = this.def;
    const src = pixelsOf(scene, key);
    const matter = (k: string): Matter => pixelsOf(scene, k);
    /**
     * Le pixel d'une face sud à la colonne x du monde, `up` px d'écran au-dessus de son pied, `fromTop` px sous son arête (la lèvre ;
     * Infinity : sans lèvre), au-dessus de l'eau ou non.
     */
    const face = (x: number, up: number, fromTop: number, wet: boolean): Rgb => {
      const seg = Math.floor(x / FACE_W);
      const cx = ((x % FACE_W) + FACE_W) % FACE_W;
      if (fromTop + LIP.crest < LIP.h) {
        const l = at(matter(choose(MATTER.lip, seg * 7 + 1)), cx, fromTop + LIP.crest);
        if (l) return l;
      }
      const m = matter(choose(wet ? MATTER.wet : MATTER.earth, seg));
      const row = Math.max(0, Math.min(FACE_H - 1, FACE_H - 1 - Math.round(up)));
      return at(m, cx, row) ?? at(m, cx, FACE_H - 1) ?? [0, 0, 0];
    };
    const cols = Math.floor(src.w / TILE);
    const W = x1 - x0;
    // l'image va du plus haut (le sol le plus soulevé, au nord) au plus bas (le sol à 0, au sud, et les faces)
    const top = y0 - max - 2;
    const H = y1 - top + 2;
    const out = new Uint8ClampedArray(W * H * 4);
    // la terre en coupe : allouée au premier point (la plupart des morceaux n'en ont pas)
    let cutBuf: Uint8ClampedArray<ArrayBuffer> | undefined;
    const bands = new Map<number, Uint8ClampedArray<ArrayBuffer>>();
    const bandTop = (b: number) => y0 + b * BAND - max - 2;
    const bandH = BAND + max + 4;
    const put = (buf: Uint8ClampedArray<ArrayBuffer>, w: number, x: number, y: number, c: Rgb) => {
      const i = (y * w + x) * 4;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = 255;
    };
    // le dessus d'un talus posé sur l'eau (le flanc au-dessus de la rivière : ses cases restent de l'eau sous lui) : `bank-*`
    const named = tilesets.find((t) => t.key === key)?.tiles ?? {};
    const banks = [0, 1, 2, 3].map((k) => named[`bank-${k}`]).filter((n) => n !== undefined);
    // les parois en gradins : où en est le point (le gradin, la marche), lu une fois par point
    const field = reliefOf(def);
    // trois points de travail, remplis à chaque appel (un par usage : le sol, la marche, la coupe), jamais gardés d'un pixel à l'autre
    const scratch = { ground: {} as StepPlace, riser: {} as StepPlace, cut: {} as StepPlace, plant: {} as StepPlace };
    const place = (x: number, y: number, out: StepPlace): StepPlace | undefined => stepsAt(field, x, y, out);
    // les arbres des gradins dont les racines descendent la marche sous eux (`roots` de props.json) : leur pied et leur gradin
    const rooted: { x: number; k: number; m: Matter }[] = [];
    for (const o of def.objects) {
      if (!props[o.type]?.roots || o.x < x0 - 64 || o.x > x1 + 64) continue;
      const fx = o.x + scene.textures.get(props[o.type].image).getSourceImage().width / 2;
      const sp = place(fx, o.y - 1, scratch.plant);
      if (sp && sp.side < 0 && sp.k >= 1) rooted.push({ x: fx, k: sp.k, m: matter(choose(MATTER.roots, o.id)) });
    }
    /** Le dessus d'un gradin : sa rangée 0 contre la marche du dessus, sa rangée 9 sur l'arête au-dessus de la marche du dessous. */
    const treadAt = (x: number, sp: StepPlace): Rgb | undefined => {
      const m = matter(choose(MATTER.tread, Math.floor(x / TREAD.w) * 13 + sp.k * 5 + (sp.side > 0 ? 101 : 0)));
      const row = Math.max(0, Math.min(TREAD.h - 1, Math.floor((sp.k * sp.steps.tread - sp.e) / CM_PER_PX)));
      return at(m, ((x % TREAD.w) + TREAD.w) % TREAD.w, row);
    };
    const ground = (x: number, y: number): Rgb => {
      const sp = place(x, y, scratch.ground);
      if (sp && sp.k >= 1 && sp.k < sp.steps.count && L(x, y) * CM_PER_PX > sp.floor + 1) {
        const c = treadAt(x, sp);
        if (c) return c;
      }
      const tx = Math.max(0, Math.min(def.width - 1, Math.floor(x / TILE)));
      const ty = Math.max(0, Math.min(def.height - 1, Math.floor(y / TILE)));
      let n = def.layers.ground[ty * def.width + tx];
      if (banks.length && L(x, y) > 2 && deepAt(def, x, y)) n = banks[Math.floor(hash(tx, ty) * banks.length)];
      const sx = (n % cols) * TILE + (x - tx * TILE);
      const sy = Math.floor(n / cols) * TILE + (y - ty * TILE);
      const i = (Math.max(0, sy) * src.w + Math.max(0, Math.min(src.w - 1, sx))) * 4;
      return [src.data[i], src.data[i + 1], src.data[i + 2]];
    };
    // l'ombre portée (SHADOW : ce qui est à z px de haut tombe z × dx à l'est et z × dy au sud) et la pénombre du creux
    const shade = (x: number, y: number, h: number, c: Rgb): Rgb => {
      let s = 0;
      for (let k = 4; k <= max; k += 4) if (L(x - SHADOW.dx * k, y - SHADOW.dy * k) - h >= k) {
        s = SHADOW.alpha;
        break;
      }
      const depth = Math.min(L(x, y - 60), L(x, y + 60)) - h;
      const g = depth > 0 ? RELIEF.gloom * Math.min(1, depth / (500 / CM_PER_PX)) : 0;
      return mix(mix(c, SHADE, s), DARK, g);
    };
    // le pied de la face où tombe chaque rangée d'une colonne (sa rangée d'écran, et s'il est dans l'eau), tiré du sud vers le nord :
    // tant que le sol descend vers le sud de plus d'1 px par px, on est sur la même face
    const REACH = 128;
    const footSy = new Float32Array(y1 - y0 + 1);
    const footWet = new Uint8Array(y1 - y0 + 1);
    for (let x = x0; x < x1; x++) {
      const lx = x - x0;
      {
        let fs = 0;
        let fw = 0;
        let next = L(x, y1 + REACH);
        for (let y = y1 + REACH - 1; y >= y0; y--) {
          const h = L(x, y);
          if (!(h - next > 1) || y === y1 + REACH - 1) {
            fs = y - h;
            fw = deepAt(def, x, y) ? 1 : 0;
          }
          if (y <= y1) {
            footSy[y - y0] = fs;
            footWet[y - y0] = fw;
          }
          next = h;
        }
      }
      let prev = y0 - 1 - L(x, y0 - 1);
      let lowest = prev;
      // la rangée d'écran de l'arête de la face en cours (sa lèvre se pose dessous, une fois)
      let faceTop = Math.round(prev);
      let onFace = false;
      for (let y = y0; y < y1; y++) {
        const h = L(x, y);
        const sy = Math.round(y - h);
        // (plus raide que 2 px de trou par rangée, le sol lui-même est de la face : pas de liseré de sol à chaque rangée)
        const steepFace = sy - Math.round(prev) - 1 > 2;
        if (steepFace && !onFace) faceTop = Math.round(prev);
        onFace = steepFace;
        const wet = footWet[y - y0] === 1;
        // (au pied d'une marche des gradins, le point reste le sol : la marche se peint au-dessus de lui)
        const atRiser = (sp0: StepPlace | undefined) => !!sp0 && sp0.side < 0 && sp0.e < sp0.steps.count * sp0.steps.tread;
        const c = shade(x, y, h, steepFace && !atRiser(place(x, y, scratch.riser)) ? face(x, footSy[y - y0] - sy, sy - faceTop - 1, wet) : ground(x, y));
        // le trou entre le sol d'avant et celui-ci : une pente tournée vers le sud (un trou de 1 ou 2 px : le sol s'étire), ou une face
        // (plus raide : la terre de la face)
        const gap = sy - Math.round(prev) - 1;
        // un point peint à la rangée d'écran `fy` : plus haut que ce qui est déjà peint dans cette colonne (au nord), il passe devant et va
        // dans la bande de son rang (Xéros, plus au nord, passe derrière) ; sinon dans l'image du sol
        const paint = (fy: number, col: Rgb) => {
          if (fy < lowest - 1.5) {
            const b = Math.floor((y - y0) / BAND);
            let buf = bands.get(b);
            if (!buf) bands.set(b, (buf = new Uint8ClampedArray(W * bandH * 4)));
            const iy = fy - bandTop(b);
            if (iy >= 0 && iy < bandH) put(buf, W, lx, iy, col);
          } else {
            const iy = fy - top;
            if (iy >= 0 && iy < H) put(out, W, lx, iy, col);
          }
        };
        // une marche des gradins (tournée vers le sud, au nord du chemin) : sa matière, accrochée par le haut (une marche enterrée
        // à moitié garde ce qui pend du gradin du dessus)
        const sp = gap > 2 ? place(x, y, scratch.riser) : undefined;
        const riser = sp && atRiser(sp) ? matter(choose(MATTER.riser, Math.floor(x / RISER.w) * 7 + sp.k)) : undefined;
        for (let fy = Math.round(prev) + 1; fy < sy; fy++) {
          const row = Math.min(RISER.h - 1, fy - Math.round(prev) - 1);
          // les racines d'un arbre du gradin du dessus, s'il y en a un à l'aplomb, par-dessus la marche
          let r: Rgb | undefined;
          if (riser && sp)
            for (const t of rooted) {
              const cx = Math.round(x - t.x) + ROOTS.half;
              if (t.k === sp.k + 1 && cx >= 0 && cx < ROOTS.w && (r = at(t.m, cx, row))) break;
            }
          r ??= riser ? at(riser, ((x % RISER.w) + RISER.w) % RISER.w, row) : undefined;
          paint(fy, gap <= 2 ? c : shade(x, y, h, r ?? face(x, footSy[y - y0] - fy, gap > 2 && fy - faceTop - 1 >= 0 ? fy - faceTop - 1 : Infinity, wet)));
        }
        paint(sy, c);
        // la terre en coupe : la masse au sud d'un chemin en gradins, tranchée au ras de son sol (ce que voit Xéros sous la voûte)
        const cp = place(x, y, scratch.cut);
        if (cp && cp.side > 0 && h * CM_PER_PX > cp.floor + 2) {
          const fy = Math.round(y - cp.floor / CM_PER_PX);
          const iy = fy - top;
          if (iy >= 0 && iy < H) {
            const m = matter(MATTER.cut[cutVariant(Math.floor(x / CUT), Math.floor(fy / CUT))]);
            const cc = at(m, ((x % CUT) + CUT) % CUT, ((fy % CUT) + CUT) % CUT);
            if (cc) {
              cutBuf ??= new Uint8ClampedArray(W * H * 4);
              put(cutBuf, W, lx, iy, cc);
            }
          }
        }
        prev = sy;
        if (sy > lowest) lowest = sy;
      }
      yield;
    }
    // les faces est et ouest, en raccourci : au pied d'un bord (la hauteur tombe de plus de 20 px sur une case de la grille, puis ne
    // tombe plus), une bande sombre du côté bas, de FACE.raked px pour 5 m
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const here = L(x, y);
        for (const dir of [1, -1]) {
          const drop = L(x - dir * 8, y) - here;
          if (drop < 20 || L(x - dir, y) - here < 0.5 || Math.abs(L(x + dir, y) - here) > 0.5) continue;
          const w = Math.max(1, Math.round((FACE.raked * drop) / FACE.full));
          const iy = Math.round(y - here) - top;
          // la matière en raccourci : sa colonne de la lèvre (0) au pied (RAKE.w − 1), puis, à l'est, le lierre qui déborde
          const m = matter(choose(dir > 0 ? MATTER.east : MATTER.west, Math.floor(y / RAKE.h) * 5 + 2));
          const row = (((iy + top) % RAKE.h) + RAKE.h) % RAKE.h;
          const over = dir > 0 ? RAKE.w : 0;
          for (let k = 0; k < w + over; k++) {
            const lx = x + dir * k - x0;
            if (lx < 0 || lx >= W || iy < 0 || iy >= H) continue;
            const col = k < w ? Math.min(RAKE.w - 1, Math.floor((k * RAKE.w) / w)) : RAKE.w + (k - w);
            const c = at(m, dir > 0 ? col : RAKE.w - 1 - col, row);
            if (c) put(out, W, lx, iy, shade(x + dir * k, y, here, c));
          }
        }
      }
      yield;
    }
    const canvas = scene.textures.createCanvas(base, W, H)!;
    canvas.context.putImageData(new ImageData(out, W, H), 0, 0);
    canvas.refresh();
    const made: Made = { top, h: H, bands: [] };
    // chaque image recadrée sur ses pixels peints (une bande est surtout transparente : la mémoire de la page reste basse)
    const texture = (k: string, buf: Uint8ClampedArray<ArrayBuffer>, w: number, h: number): { x: number; y: number } | undefined => {
      const box = paintedBox(buf, w, h);
      if (!box) return undefined;
      const data = new Uint8ClampedArray(box.w * box.h * 4);
      for (let y = 0; y < box.h; y++) data.set(buf.subarray(((box.y + y) * w + box.x) * 4, ((box.y + y) * w + box.x + box.w) * 4), y * box.w * 4);
      const t = scene.textures.createCanvas(k, box.w, box.h)!;
      t.context.putImageData(new ImageData(data, box.w, box.h), 0, 0);
      t.refresh();
      return { x: box.x, y: box.y };
    };
    yield;
    if (cutBuf) {
      const at0 = texture(`${base}:cut`, cutBuf, W, H);
      if (at0) made.cut = { key: `${base}:cut`, x: x0 + at0.x, y: top + at0.y };
    }
    for (const [b, buf] of bands) {
      const k = `${base}:b${b}`;
      const at0 = texture(k, buf, W, bandH);
      if (at0) made.bands.push({ key: k, x: x0 + at0.x, y: bandTop(b) + at0.y, depth: y0 + b * BAND - 0.5 });
      yield;
    }
    return made;
  }
}
