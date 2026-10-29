// Pièces de bâtiment : dés, poteaux, sablières, chevrons, couvertures ; l'abri à bois d'abord.
// Chaque pièce suit le gabarit (docs/STYLE.md, section 8) ; sa silhouette est collée en haut à gauche de l'image
// (x = 0, y = 0), l'ombre portée `x` en dessous et à droite, hors silhouette.
// Lumière nord-ouest ; contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE (o) en bas
// et à droite.

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

const palette = { ...world };

// ---------- Dé de pierre ----------

/**
 * Dé de pierre (`footing-stone`), boîte de 30 × 30 × 15 cm : silhouette 6 × 6 px, dessus en 3 rangées (contour du
 * haut et deux rangées de pierre claire R r, où se pose le pied du poteau), face sud en 3 rangées (z Z, puis le
 * contour du bas). Coin nord-est émoussé. Ombre portée sous la base, décalée à droite.
 */
function footingStone(): Canvas {
  return Canvas.from([
    'ZZZZZ..',
    'ZRRRro.',
    'ZRRrro.',
    'ZzzzZox',
    'ZzzZZox',
    'oooooox',
    '.xxxxxx',
  ]);
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [img('footing-stone', footingStone())];
