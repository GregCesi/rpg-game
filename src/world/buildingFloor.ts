// Ce qu'on voit d'un bâtiment par sa fenêtre ou sa porte ouverte, de dehors (chantier « maison-2 », Grégoire) : sa terre battue, posée
// sous chaque bâtiment détecté (ses pièces closes et le pied de ses cloisons) (world/interior.ts : la maison de Xéros comme une maison du joueur), refaite à
// chaque changement du bâtiment ; et sa pénombre, comme dedans (INTERIOR.ambient), toujours là : sous le toit opaque elle ne se voit
// pas, devant une fenêtre ouverte elle assombrit la pièce, pas Xéros qui regarde ni le mur sud.

import Phaser from 'phaser';
import { DEPTH, INTERIOR } from '../config';
import { CM_PER_PX } from '../content/gabarit';
import { tilesets } from '../generated/assets';
import type { Building, Rect } from './interior';
import { WALLS_SEEN } from './roofView';

/** La hauteur des murs au-dessus de la pièce que la pénombre couvre aussi à l'écran (cm) : celle qu'on voit par une fenêtre. */
const WALLS = WALLS_SEEN;

/** Hachage stable d'une case : la même terre battue au même endroit. */
const hash = (i: number, j: number) => {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

/** Les images posées pour les bâtiments (terre battue, pénombre), à retirer quand ils changent. */
export type BuildingInsides = Phaser.GameObjects.GameObject[];

/**
 * Pose la terre battue et la pénombre de chaque bâtiment ; rend ce qui est posé. La terre battue est faite des
 * tuiles `floor`… `floor4` du jeu de tuiles de l'intérieur, sur la grille de la carte, rognée à la pièce ; la pénombre, la teinte de
 * celle des intérieurs, couvre la pièce et ses murs à l'écran, à la profondeur juste sous son bord sud : tout ce qui est dans la
 * pièce et son mur du fond s'assombrissent, pas son mur sud ni ce qui est devant.
 */
export function drawInsides(scene: Phaser.Scene, buildings: readonly Building[]): BuildingInsides {
  const out: BuildingInsides = [];
  const ts = tilesets.find((t) => t.key === 'interior');
  const src = scene.textures.get('interior').getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const size = ts?.tileSize ?? 32;
  const cols = Math.max(1, Math.floor(src.width / size));
  const floors = ['floor', 'floor2', 'floor3', 'floor4'].map((k) => ts?.tiles[k]).filter((n): n is number => n !== undefined);
  for (const b of buildings) {
    // tout le dedans : les pièces et le pied des cloisons entre elles (le rectangle des pièces, entre les faces intérieures des murs)
    out.push(floorOf(scene, b.room, src, size, cols, floors));
    const q = b.room;
    const veil = scene.add
      .rectangle(q.x / CM_PER_PX, (q.y - WALLS) / CM_PER_PX, q.w / CM_PER_PX, (q.d + WALLS) / CM_PER_PX, INTERIOR.shade, INTERIOR.ambient)
      .setOrigin(0)
      .setDepth((q.y + q.d) / CM_PER_PX - 0.6);
    out.push(veil);
  }
  return out;
}

/** La terre battue d'une pièce : une texture calculée une fois par rectangle (la même pièce garde le même sol). */
function floorOf(scene: Phaser.Scene, r: Rect, src: HTMLImageElement | HTMLCanvasElement, size: number, cols: number, floors: number[]): Phaser.GameObjects.Image {
  const x0 = Math.round(r.x / CM_PER_PX);
  const y0 = Math.round(r.y / CM_PER_PX);
  const w = Math.max(1, Math.round((r.x + r.w) / CM_PER_PX) - x0);
  const h = Math.max(1, Math.round((r.y + r.d) / CM_PER_PX) - y0);
  const key = `floor:${x0},${y0},${w},${h}`;
  if (!scene.textures.exists(key) && floors.length) {
    const tex = scene.textures.createCanvas(key, w, h)!;
    const ctx = tex.getContext();
    for (let j = Math.floor(y0 / size); j * size < y0 + h; j++) {
      for (let i = Math.floor(x0 / size); i * size < x0 + w; i++) {
        const n = floors[hash(i, j) % floors.length];
        ctx.drawImage(src, (n % cols) * size, Math.floor(n / cols) * size, size, size, i * size - x0, j * size - y0, size, size);
      }
    }
    tex.refresh();
  }
  return scene.add.image(x0, y0, key).setOrigin(0).setDepth(DEPTH.floor - 0.05);
}
