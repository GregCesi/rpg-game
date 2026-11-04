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
// Les matières des faces sont provisoires (des couleurs de la palette) en attendant les dessins du pixel-artist.

import Phaser from 'phaser';
import { DEPTH, GLOOM, RELIEF, SHADOW, TILE } from '../config';
import { maps } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { MapData } from '../content/types';
import { tilesets } from '../generated/assets';
import { heightAt, reliefOf } from './relief';

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
/** Les faces, provisoires (terre très sombre, racines, mousse en haut) : à remplacer par les dessins du pixel-artist. */
const EARTH: Rgb[] = [rgb(0x2b1d14), rgb(0x3b2a1c), rgb(0x241811), rgb(0x33251a)];
const MOSS: Rgb = rgb(0x3d4a22);
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** La couleur d'une face de terre à `k` px sous son bord haut, en (x, y) du monde. */
function faceColor(x: number, y: number, k: number): Rgb {
  if (k <= 2 + Math.floor(hash(x, 7) * 3)) return mix(MOSS, EARTH[0], hash(x, y) * 0.4);
  const c = EARTH[Math.floor(hash(x >> 1, (y + k) >> 2) * EARTH.length)];
  return hash(x, y + k * 31) < 0.06 ? mix(c, MOSS, 0.5) : c;
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
    for (const c of painted) this.paint(tileset.key, c.cx, c.cy, Math.min(px1, c.cx + CHUNK), Math.min(py1, c.cy + CHUNK), Math.max(px0, c.cx), Math.max(py0, c.cy), L, max);
  }

  /** Un morceau peint : sa texture (gardée), son image au sol et ses bandes de ce qui passe devant. */
  private paint(key: string, _cx: number, _cy: number, x1: number, y1: number, x0: number, y0: number, L: (x: number, y: number) => number, max: number): void {
    const scene = this.scene;
    const base = `terrain:${this.def.id}:${x0},${y0}`;
    const meta = scene.registry.get(base) as { top: number; h: number; bands: { key: string; x: number; y: number; depth: number }[] } | undefined;
    const made = meta ?? this.render(key, base, x0, y0, x1, y1, L, max);
    if (!meta) scene.registry.set(base, made);
    this.parts.push(scene.add.image(this.ox + x0, this.oy + made.top, base).setOrigin(0, 0).setDepth(DEPTH.ground).setData('noLift', true));
    for (const b of made.bands) this.parts.push(scene.add.image(this.ox + b.x, this.oy + b.y, b.key).setOrigin(0, 0).setDepth(this.oy + b.depth).setData('noLift', true));
  }

  private render(key: string, base: string, x0: number, y0: number, x1: number, y1: number, Lw: (x: number, y: number) => number, max: number) {
    const scene = this.scene;
    // les hauteurs du morceau et de ses abords, lues une fois (px d'écran, au pixel près)
    const gx0 = x0 - Math.ceil(SHADOW.dx * max) - 2;
    const gy0 = y0 - Math.max(64, Math.ceil(SHADOW.dy * max)) - 2;
    const gx1 = x1 + 2;
    const gy1 = y1 + 64;
    const gw = gx1 - gx0;
    const grid = new Float32Array(gw * (gy1 - gy0));
    for (let y = gy0; y < gy1; y++) for (let x = gx0; x < gx1; x++) grid[(y - gy0) * gw + (x - gx0)] = Lw(x, y);
    const L = (x: number, y: number) => {
      const ix = Math.round(x) - gx0;
      const iy = Math.round(y) - gy0;
      return ix >= 0 && iy >= 0 && ix < gw && iy < gy1 - gy0 ? grid[iy * gw + ix] : Lw(x, y);
    };
    const def = this.def;
    const src = pixelsOf(scene, key);
    const cols = Math.floor(src.w / TILE);
    const W = x1 - x0;
    // l'image va du plus haut (le sol le plus soulevé, au nord) au plus bas (le sol à 0, au sud, et les faces)
    const top = y0 - max - 2;
    const H = y1 - top + 2;
    const out = new Uint8ClampedArray(W * H * 4);
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
    const ground = (x: number, y: number): Rgb => {
      const tx = Math.max(0, Math.min(def.width - 1, Math.floor(x / TILE)));
      const ty = Math.max(0, Math.min(def.height - 1, Math.floor(y / TILE)));
      const n = def.layers.ground[ty * def.width + tx];
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
    for (let x = x0; x < x1; x++) {
      const lx = x - x0;
      let prev = y0 - 1 - L(x, y0 - 1);
      let lowest = prev;
      for (let y = y0; y < y1; y++) {
        const h = L(x, y);
        const sy = Math.round(y - h);
        // une face tournée vers le sud : le trou entre le sol d'avant et celui-ci
        for (let fy = Math.round(prev) + 1, k = 1; fy < sy; fy++, k++) {
          const iy = fy - top;
          if (iy >= 0 && iy < H) put(out, W, lx, iy, shade(x, y, h, faceColor(x, y, k)));
        }
        const c = shade(x, y, h, ground(x, y));
        if (sy < lowest - 0.5) {
          // plus au sud et plus haut que ce qui est déjà peint ici : il passe devant, dans la bande de son rang
          const b = Math.floor((y - y0) / BAND);
          let buf = bands.get(b);
          if (!buf) bands.set(b, (buf = new Uint8ClampedArray(W * bandH * 4)));
          const iy = sy - bandTop(b);
          if (iy >= 0 && iy < bandH) put(buf, W, lx, iy, c);
        } else {
          const iy = sy - top;
          if (iy >= 0 && iy < H) put(out, W, lx, iy, c);
        }
        prev = sy;
        if (sy > lowest) lowest = sy;
      }
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
          for (let k = 0; k < w; k++) {
            const lx = x + dir * k - x0;
            if (lx < 0 || lx >= W || iy < 0 || iy >= H) continue;
            put(out, W, lx, iy, faceColor(x, y, Math.round((k / w) * drop) + 3));
          }
        }
      }
    }
    const canvas = scene.textures.createCanvas(base, W, H)!;
    canvas.context.putImageData(new ImageData(out, W, H), 0, 0);
    canvas.refresh();
    const made: { top: number; h: number; bands: { key: string; x: number; y: number; depth: number }[] } = { top, h: H, bands: [] };
    for (const [b, buf] of bands) {
      const k = `${base}:b${b}`;
      const t = scene.textures.createCanvas(k, W, bandH)!;
      t.context.putImageData(new ImageData(buf, W, bandH), 0, 0);
      t.refresh();
      made.bands.push({ key: k, x: x0, y: bandTop(b), depth: y0 + b * BAND - 0.5 });
    }
    return made;
  }
}
