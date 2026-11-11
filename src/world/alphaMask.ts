// Les pixels et l'opacité d'une image de pièce, lus une seule fois (chantier « corrections », DIAGNOSTIC.md étape 1) : un seul
// getImageData pour tout le cadre, gardé par clé de texture et de cadre, jamais un pixel à la fois (le getPixelAlpha de Phaser relit le
// canevas à chaque appel : 28 000 lectures, 13 s, pour les ombres de joint de la maison du coq). Les textures du jeu ne changent pas de
// contenu sous une même clé (les dessins calculés, murs et bois, sont nommés par leur contenu) ; une texture retirée oublie son masque.

import type Phaser from 'phaser';

/** L'opacité (0-255) de chaque pixel d'un cadre, rangée par rangées. */
export interface AlphaMask {
  w: number;
  h: number;
  a: Uint8Array;
}

/** Les pixels d'un cadre (RGBA, rangée par rangée), lus une fois. */
export interface FramePixels {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

const pixels = new Map<string, FramePixels>();
const masks = new Map<string, AlphaMask>();
const watched = new WeakSet<Phaser.Textures.TextureManager>();
let reads = 0;
let scratch: CanvasRenderingContext2D | undefined;

/** Le nombre de lectures de cadre faites depuis le chargement (les tests vérifient qu'il n'y en a qu'une par cadre). */
export const alphaReads = (): number => reads;

/** Les cadres lus et gardés (les tests vérifient qu'aucune lecture ne se refait). */
export const alphaMasksKept = (): number => pixels.size;

/** Les pixels du cadre `frame` de la texture `key` (RGBA), lus au premier appel (un seul getImageData) puis gardés. */
export function framePixels(textures: Phaser.Textures.TextureManager, key: string, frame?: string | number): FramePixels | undefined {
  const id = `${key}|${frame ?? '__BASE'}`;
  const kept = pixels.get(id);
  if (kept) return kept;
  const f = textures.getFrame(key, frame);
  if (!f) return undefined;
  if (!watched.has(textures)) {
    watched.add(textures);
    // une texture retirée (une clé réutilisée pour un autre contenu) : ce qu'on en a lu est oublié
    textures.on('removetexture', (k: string) => {
      for (const m of [...pixels.keys()]) if (m.startsWith(`${k}|`)) pixels.delete(m);
      for (const m of [...masks.keys()]) if (m.startsWith(`${k}|`)) masks.delete(m);
    });
  }
  // la part de la source que montre le cadre (`data.cut` de Phaser, absent de ses types)
  const cut = (f as unknown as { data: { cut: { x: number; y: number; w: number; h: number } } }).data.cut;
  const src = f.source.image as HTMLImageElement | HTMLCanvasElement;
  let data: Uint8ClampedArray;
  const own = src instanceof HTMLCanvasElement ? src.getContext('2d', { willReadFrequently: true }) : null;
  if (own) data = own.getImageData(cut.x, cut.y, cut.w, cut.h).data;
  else {
    scratch ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const c = scratch.canvas;
    if (c.width < cut.w || c.height < cut.h) {
      c.width = Math.max(c.width, cut.w);
      c.height = Math.max(c.height, cut.h);
    }
    scratch.clearRect(0, 0, cut.w, cut.h);
    scratch.drawImage(src, cut.x, cut.y, cut.w, cut.h, 0, 0, cut.w, cut.h);
    data = scratch.getImageData(0, 0, cut.w, cut.h).data;
  }
  reads++;
  const p = { w: cut.w, h: cut.h, data };
  pixels.set(id, p);
  return p;
}

/** Le masque d'opacité du cadre `frame` de la texture `key`, tiré de ses pixels lus une fois ; undefined si le cadre n'existe pas. */
export function alphaMask(textures: Phaser.Textures.TextureManager, key: string, frame?: string | number): AlphaMask | undefined {
  const id = `${key}|${frame ?? '__BASE'}`;
  const kept = masks.get(id);
  if (kept) return kept;
  const p = framePixels(textures, key, frame);
  if (!p) return undefined;
  const a = new Uint8Array(p.w * p.h);
  for (let i = 0; i < a.length; i++) a[i] = p.data[i * 4 + 3];
  const m = { w: p.w, h: p.h, a };
  masks.set(id, m);
  return m;
}

/** L'opacité du pixel (x, y) du cadre (coordonnées dans le cadre), 0 hors du cadre. */
export function alphaAt(textures: Phaser.Textures.TextureManager, key: string, frame: string | number | undefined, x: number, y: number): number {
  const m = alphaMask(textures, key, frame);
  if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h) return 0;
  return m.a[y * m.w + x];
}
