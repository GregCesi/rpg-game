// L'ombre de joint (chantier « hauteurs », CADRAGE-hauteurs.md, choix B de Grégoire), sans Phaser : sous une pièce de bois couchée
// posée sur une autre pièce de bois couchée, une rangée assombrie sur celle du dessous, juste sous le bas de la silhouette de celle du
// dessus, colonne par colonne, là seulement où celle du dessous se voit. Calculée à l'affichage, jamais peinte dans un dessin
// (GameMap.sortBuilds ; teinte et opacité : `JOINT_SHADE` de config.ts).

import { CM_PER_PX } from '../content/gabarit';
import type { BuildPiece } from './build';
import { boxOf, SupportIndex } from './build';

/** Une image affichée : son coin haut gauche à l'écran (px du monde), sa taille, et l'opacité de ses pixels (dans son cadre). */
export interface ShownImage {
  x: number;
  y: number;
  w: number;
  h: number;
  opaque: (x: number, y: number) => boolean;
}

/** Une pièce de bois couchée (est-ouest ou nord-sud). */
export function lyingWood(p: BuildPiece): boolean {
  return 'wood' in p.piece && p.piece.wood.axis !== 'up';
}

/** Les paires (dessus, dessous) qui prennent une ombre de joint : deux pièces de bois couchées, l'une posée sur l'autre. */
export function shadedPairs(pieces: readonly BuildPiece[], index: SupportIndex = new SupportIndex(pieces)): [BuildPiece, BuildPiece][] {
  const out: [BuildPiece, BuildPiece][] = [];
  for (const p of pieces) {
    if (!lyingWood(p)) continue;
    for (const s of index.supportsOf(p)) if (lyingWood(s)) out.push([p, s]);
  }
  return out;
}

/**
 * Les pixels (px du monde) de l'ombre de joint de `upper` sur `under` : pour chaque colonne de `upper`, le pixel juste sous le bas de
 * sa silhouette, s'il tombe sur un pixel opaque de `under`.
 */
export function shadePixels(upper: ShownImage, under: ShownImage): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < upper.w; i++) {
    let bottom = -1;
    for (let j = upper.h - 1; j >= 0; j--) {
      if (upper.opaque(i, j)) {
        bottom = j;
        break;
      }
    }
    if (bottom < 0) continue;
    const x = upper.x + i;
    const y = upper.y + bottom + 1;
    const ux = x - under.x;
    const uy = y - under.y;
    if (ux < 0 || uy < 0 || ux >= under.w || uy >= under.h || !under.opaque(ux, uy)) continue;
    out.push({ x, y });
  }
  return out;
}

/**
 * Les planches jointives (chantier « corrections », DIAGNOSTIC.md 2.2) : une planche couchée est-ouest dont une autre planche
 * est-ouest, à la même hauteur, touche le bord sud. Sous ces colonnes (px depuis le bord ouest de son image, [début, fin[), son ombre au
 * sol ne se voit pas : la rangée d'ombre devient le joint des deux planches, de la couleur de son contour (jointView.ts, `joined`).
 * Seuls les planchers est-ouest existent (l'étage du coq) ; le nord-sud attendra d'en avoir un.
 */
export function jointiveSpans(p: BuildPiece, pieces: readonly BuildPiece[]): [number, number][] {
  const plankEw = (q: BuildPiece) => 'wood' in q.piece && q.piece.wood.shape === 'plank' && q.piece.wood.axis === 'ew';
  if (!plankEw(p)) return [];
  const b = boxOf(p);
  const out: [number, number][] = [];
  for (const q of pieces) {
    if (q === p || q.z !== p.z || !plankEw(q)) continue;
    const c = boxOf(q);
    if (c.y !== b.y + b.d) continue;
    const x0 = Math.max(b.x, c.x);
    const x1 = Math.min(b.x + b.w, c.x + c.w);
    if (x1 > x0) out.push([Math.round((x0 - b.x) / CM_PER_PX), Math.round((x1 - b.x) / CM_PER_PX)]);
  }
  return out.sort((a, c) => a[0] - c[0]);
}
