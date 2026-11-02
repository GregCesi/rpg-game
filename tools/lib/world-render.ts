// Rendu des cartes en PNG, sans navigateur (chantier « monde ») : le sol tuile par tuile, les objets à leur place, les pièces posées des
// plans de Tiled en aplat, à une échelle entière réduite (`shrink` : 1 = taille réelle, 8 = une tuile sur 4 px). Sert à l'aperçu du monde
// vu de très haut (.art-preview/monde.png) et à regarder une zone. Lit ce que npm run art et npm run maps ont produit.
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { TILE } from '../../src/config';
import type { MapData } from '../../src/content/types';

export type RGBA = [number, number, number, number];

/** Une image en mémoire : largeur, hauteur, pixels RGBA. */
export interface Img {
  w: number;
  h: number;
  data: Uint8Array;
}

function readPng(path: string): Img {
  const p = PNG.sync.read(readFileSync(path));
  return { w: p.width, h: p.height, data: p.data };
}

export function blank(w: number, h: number, c: RGBA = [0, 0, 0, 255]): Img {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(c, i * 4);
  return { w, h, data };
}

export function toPng(img: Img): Buffer {
  const p = new PNG({ width: img.w, height: img.h });
  p.data = Buffer.from(img.data);
  return PNG.sync.write(p);
}

/** Pose un pixel (mélange par l'alpha). */
export function put(img: Img, x: number, y: number, c: RGBA): void {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h || c[3] === 0) return;
  const i = (y * img.w + x) * 4;
  const a = c[3] / 255;
  for (let k = 0; k < 3; k++) img.data[i + k] = Math.round(c[k] * a + img.data[i + k] * (1 - a));
  img.data[i + 3] = 255;
}

export function rect(img: Img, x: number, y: number, w: number, h: number, c: RGBA): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(img, x + i, y + j, c);
}

/** Une image réduite d'un facteur entier : chaque pixel est la moyenne de son bloc (les pixels transparents ne comptent pas). */
function shrinkImg(src: Img, f: number, sx = 0, sy = 0, sw = src.w, sh = src.h): Img {
  const w = Math.max(1, Math.round(sw / f));
  const h = Math.max(1, Math.round(sh / f));
  const out = blank(w, h, [0, 0, 0, 0]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, n = 0, all = 0;
      for (let j = 0; j < f; j++) {
        for (let i = 0; i < f; i++) {
          const px = sx + x * f + i;
          const py = sy + y * f + j;
          if (px >= sx + sw || py >= sy + sh) continue;
          all++;
          const k = (py * src.w + px) * 4;
          if (src.data[k + 3] < 128) continue;
          r += src.data[k];
          g += src.data[k + 1];
          b += src.data[k + 2];
          n++;
        }
      }
      // un bloc à moitié vide reste transparent : la silhouette ne grossit pas
      if (n && n * 2 >= all) out.data.set([r / n, g / n, b / n, 255], (y * w + x) * 4);
    }
  }
  return out;
}

/** Colle `src` sur `dst` en (x, y). */
export function blit(dst: Img, src: Img, x: number, y: number): void {
  for (let j = 0; j < src.h; j++) {
    for (let i = 0; i < src.w; i++) {
      const k = (j * src.w + i) * 4;
      put(dst, x + i, y + j, [src.data[k], src.data[k + 1], src.data[k + 2], src.data[k + 3]]);
    }
  }
}

/** Le décor nécessaire au rendu : le jeu de tuiles `world` et les images des objets, réduits une fois pour toutes. */
export class RenderKit {
  private readonly tiles: Img;
  private readonly cols: number;
  private readonly tileCache = new Map<number, Img>();
  private readonly propCache = new Map<string, Img | null>();

  constructor(readonly shrink: number) {
    this.tiles = readPng('tiled/tilesets/world.png');
    this.cols = this.tiles.w / TILE;
  }

  tile(n: number): Img {
    let t = this.tileCache.get(n);
    if (!t) {
      t = shrinkImg(this.tiles, this.shrink, (n % this.cols) * TILE, Math.floor(n / this.cols) * TILE, TILE, TILE);
      this.tileCache.set(n, t);
    }
    return t;
  }

  /** L'image réduite d'un objet (clé d'image de src/generated), ou rien si elle n'existe pas. */
  image(key: string): Img | undefined {
    if (!this.propCache.has(key)) {
      try {
        this.propCache.set(key, shrinkImg(readPng(`src/generated/${key}.png`), this.shrink));
      } catch {
        this.propCache.set(key, null);
      }
    }
    return this.propCache.get(key) ?? undefined;
  }
}

/**
 * Dessine une carte (son sol, les plans de Tiled en aplat, puis ses objets triés par leur bas) dans `dst`, son coin haut gauche en
 * (ox, oy) pixels de `dst`. `imageOf` donne la clé d'image d'un objet de carte (ou rien pour ne pas le dessiner) ; `planBox` la taille
 * au sol d'un plan (cm).
 */
export function drawMap(
  dst: Img,
  kit: RenderKit,
  m: MapData,
  ox: number,
  oy: number,
  imageOf: (type: string, age?: string) => string | undefined,
  planBox?: (plan: string) => { w: number; d: number } | undefined,
): void {
  const f = kit.shrink;
  const ts = TILE / f;
  m.layers.ground.forEach((n, i) => {
    if (n < 0) return;
    blit(dst, kit.tile(n), ox + (i % m.width) * ts, oy + Math.floor(i / m.width) * ts);
  });
  for (const p of m.plans) {
    const b = planBox?.(p.plan);
    if (!b) continue;
    // 5 cm par pixel : la boîte du plan (cm) en px, puis réduite
    rect(dst, ox + Math.round(p.x / f), oy + Math.round(p.y / f), Math.max(1, Math.round(b.w / 5 / f)), Math.max(1, Math.round(b.d / 5 / f)), [120, 84, 52, 255]);
  }
  for (const o of [...m.objects].sort((a, b) => a.y - b.y)) {
    const key = imageOf(o.type, o.age);
    const img = key ? kit.image(key) : undefined;
    if (!img) continue;
    blit(dst, img, ox + Math.round(o.x / f), oy + Math.round(o.y / f) - img.h);
  }
}

// --- Une petite police 5 × 7 pour les noms des zones (majuscules sans accents, chiffres, tiret, espace) ---
const GLYPHS: Record<string, string> = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11100100101000110001100011001011100', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
  J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001100011100110101100111000110001', O: '01110100011000110001100011000101110',
  P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111', '-': '00000000000000011111000000000000000',
  ' ': '00000000000000000000000000000000000', '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110',
  '2': '01110100010000100010001000100011111', '3': '11111000100010000010000011000101110', '4': '00010001100101010010111110001000010',
  '5': '11111100001111000001000011000101110', '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000',
  '8': '01110100011000101110100011000101110', '9': '01110100011000101111000010001001100', "'": '00100001000000000000000000000000000',
  ',': '00000000000000000000000000110001000', '.': '00000000000000000000000000110001100', '(': '00010001000100001000010000010000010',
  ')': '01000001000001000010000100010001000',
};

/** Le texte en majuscules sans accents (la police n'a que ça). */
function plain(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

/** Écrit `s` en (x, y), lettres de 5 × 7 agrandies de `scale`, avec un liseré sombre pour se lire sur tout fond. */
export function text(dst: Img, s: string, x: number, y: number, scale: number, c: RGBA): void {
  const t = plain(s);
  const draw = (dx: number, dy: number, col: RGBA) => {
    [...t].forEach((ch, k) => {
      const g = GLYPHS[ch] ?? GLYPHS[' '];
      for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j * 5 + i] === '1') rect(dst, x + dx + (k * 6 + i) * scale, y + dy + j * scale, scale, scale, col);
    });
  };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) draw(dx * scale, dy * scale, [20, 14, 8, 255]);
  draw(0, 0, c);
}

/** La largeur d'un texte en px. */
export function textWidth(s: string, scale: number): number {
  return plain(s).length * 6 * scale;
}
