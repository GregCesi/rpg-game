// Pièces de bâtiment : dés, sablières, chevrons, couvertures ; l'abri à bois d'abord. Les poteaux sont la pièce de bois dressée
// (wood-pieces.ts) : un chantier montre les vraies pièces posées ; les sablières, chevrons et le toit, « à venir », gardent ici leurs
// dessins (fantômes) jusqu'à leur chantier, où ils deviendront des pièces de bois (plans.json, `note`).
//
// L'abri à bois (fiches docs/objets/footing-stone.md, shed-*.md) : appentis à environ 20°, toit de planches. Repère
// commun, en pixels de la carte (5 cm par pixel), projection (x, y, z) -> (x, y - z) pour poser les pièces :
// - poteaux de 20 × 20 cm, sur des dés de 15 cm ; rang nord 3 m hors dé (tête à 3,15 m, 63 px), rang sud 1,80 m (tête
//   à 1,95 m, 39 px : le bois se coupe sur une grille de 20 cm, src/content/wood.json) ; 71 px (3,55 m) d'entraxe
//   nord-sud : chute de 1,20 m, pente atan(24 / 71) = 18,7° ;
// - sablières de 15 × 15 cm sur la tête des poteaux (dessus à 66 px au nord, 42 px au sud) ;
// - chevrons de 10 × 10 cm sur les sablières, du bord nord au bord sud du toit ; planches de 5 cm dessus ;
// - toit : 73 × 89 px au sol (débord de 20 cm à l'est et à l'ouest, 35 cm au nord et au sud des poteaux), dessus à
//   3,60 m au bord nord, 2,10 m au bord sud (chute de 30 px sur 89).
// Chaque pièce suit le gabarit (docs/STYLE.md, section 8) ; sa silhouette est collée en haut à gauche de l'image
// (x = 0, y = 0), l'ombre portée `x` en dessous et à droite, hors silhouette.
// Lumière nord-ouest ; contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE (o) en bas
// et à droite.

import { Canvas, rng } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { hewnTone } from './wood';


// ---------- Dé de pierre ----------

/**
 * Dé de pierre (`footing-stone`), boîte de 30 × 30 × 15 cm : silhouette 6 × 6 px, dessus en 3 rangées (contour du
 * haut et deux rangées de pierre claire R r, où se pose le pied du poteau), face sud en 3 rangées (z Z, puis le
 * contour du bas). Coin nord-est émoussé. Ombre portée sous la base, décalée à droite.
 */
export function footingStone(): Canvas {
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

// ---------- Poteaux ----------
// Les poteaux ne sont plus dessinés ici : un poteau est la pièce de bois dressée (art/world/wood-pieces.ts, `axis: 'up'`).

/** Bois équarri d'un dessus, tourné vers la lumière : un cran plus clair que la face (t -> Y, T -> t), écorce gardée. */
const LIGHTER: Record<string, string> = { t: 'Y', T: 't' };
const topTone = (along: number, wane?: 'lit' | 'shade') => {
  const k = hewnTone(along, 0, 1, wane);
  return LIGHTER[k] ?? k;
};

// ---------- Sablières ----------

/**
 * Sablière est-ouest (`shed-plate-north`, `shed-plate-south`), boîte de 325 × 15 × 15 cm : silhouette 65 × 5 px collée
 * en haut de l'image, `below` rangées vides dessous (la hauteur qui la sépare du sol, bas de l'image au sol). Rangée 0 :
 * le contour du haut (N) ; rangée 1 : le dessus, bois clair (Y, fil en t) ; rangées 2 et 3 : la face sud (t, fil en T),
 * l'écorce de l'arête du haut par endroits ; rangée 4 : le contour du bas. Contour gauche N, droit OUTLINE ; aux bouts,
 * rien (ils sont sur les poteaux). `phase` : une autre pièce du même bois.
 */
function shedPlateEW(below: number, phase: number): Canvas {
  const W = 65;
  const c = new Canvas(W, 5 + below);
  for (let x = 0; x < W; x++) {
    const a = x + phase;
    const edge = x === 0 ? 'N' : x === W - 1 ? 'o' : null;
    c.set(x, 0, x === W - 1 ? 'o' : 'N');
    c.set(x, 1, edge ?? topTone(a));
    c.set(x, 2, edge ?? hewnTone(a + 17, 0, 1, 'lit'));
    c.set(x, 3, edge ?? hewnTone(a + 41, 0, 1));
    c.set(x, 4, 'o');
  }
  return c;
}

/** Sablière de côté : silhouette (75 px au sol + 24 de pente + 3 d'épaisseur) et rangées vides dessous. */
const SIDE_SIL = 102;
const SIDE_BELOW = 40;

/**
 * Sablière de côté (`shed-plate-side`), 20 × 15 cm, nord-sud, en pente de la tête d'un poteau haut à celle d'un poteau
 * bas : pièce `ground`, silhouette 4 × SIDE_SIL px (la largeur du poteau, qu'elle couvre exactement : pas de contour
 * doublé), puis SIDE_BELOW rangées vides. Rangée 0 : le contour du haut ; puis le dessus, deux colonnes de bois
 * (la gauche un cran plus claire, flache par endroits ; fil vertical) entre le contour gauche N et OUTLINE ; l'arête
 * du bout ; deux rangées de face de coupe au sud (bois de bout, plus sombre que le dessus) ; le contour du bas.
 */
function shedPlateSide(): Canvas {
  const sil = SIDE_SIL;
  const c = new Canvas(4, sil + SIDE_BELOW);
  c.set(0, 0, 'N').set(1, 0, 'N').set(2, 0, 'N').set(3, 0, 'o');
  for (let y = 1; y < sil - 4; y++) {
    c.set(0, y, 'N').set(1, y, topTone(y + 5, 'lit')).set(2, y, topTone(y + 29)).set(3, y, 'o');
  }
  c.set(0, sil - 4, 'N').set(1, sil - 4, 'T').set(2, sil - 4, 'T').set(3, sil - 4, 'o');
  c.set(0, sil - 3, 'N').set(1, sil - 3, 't').set(2, sil - 3, 't').set(3, sil - 3, 'o');
  c.set(0, sil - 2, 'N').set(1, sil - 2, 't').set(2, sil - 2, 'T').set(3, sil - 2, 'o');
  for (let x = 0; x < 4; x++) c.set(x, sil - 1, 'o');
  return c;
}

// ---------- Chevrons ----------

/** Chevron : silhouette (89 px au sol + 32 de pente et d'épaisseur) et rangées vides dessous. */
const RAFTER_SIL = 121;
const RAFTER_BELOW = 40;

/**
 * Chevron de l'abri (`shed-rafter`), 10 × 10 cm, nord-sud sur les deux sablières est-ouest, en pente, du bord nord au
 * bord sud du toit : pièce `ground`, silhouette 2 × RAFTER_SIL px, puis RAFTER_BELOW rangées vides (bas de l'image au
 * sol, un pixel au sud de son bout). À 2 px, un contour complet ne laisserait pas de bois : on garde le côté ombre, et
 * la lumière fait le côté gauche. Colonne 0 : le dessus, bois clair au fil vertical (flache par endroits) ; colonne 1 :
 * OUTLINE. Rangée 0 : le contour du bout nord ; les trois dernières : l'arête du bout sud, puis la face de coupe (bois
 * de bout t, T, plus sombre que le dessus comme toute face sud), à l'ombre en bas à droite. Sous le toit, on n'en voit que ce bout, juste sous la tranche des planches.
 */
function shedRafter(): Canvas {
  const sil = RAFTER_SIL;
  const c = new Canvas(2, sil + RAFTER_BELOW);
  c.set(0, 0, 'N').set(1, 0, 'o');
  for (let y = 1; y < sil - 3; y++) c.set(0, y, topTone(y + 5, 'lit')).set(1, y, 'o');
  c.set(0, sil - 3, 'T').set(1, sil - 3, 'o');
  c.set(0, sil - 2, 't').set(1, sil - 2, 'T');
  c.set(0, sil - 1, 'T').set(1, sil - 1, 'o');
  return c;
}

// ---------- Toit de planches ----------

/** Toit : largeur (365 cm), silhouette (89 px au sol + 30 de pente et d'épaisseur), rangées vides dessous. */
const ROOF_W = 73;
const ROOF_SIL = 119;
const ROOF_BELOW = 43;

/** Bois grisé, du plus clair au plus sombre ; K (le bois le plus sombre) pour les joints, en ombre. */
const WEATHERED = ['S', 'A', 'B', 'Q', 'K'];
/** Rangées des clous : les planches sont clouées sur quatre liteaux est-ouest, posés en travers des chevrons. */
const NAILS = [9, 39, 69, 99];
/** Rangées où le toit change de bande (la pente) : le haut, un cran plus clair ; le bas, vers l'avant-toit, un cran plus sombre. */
const BANDS = [40, 94];
/** La tranche de l'avant-toit : ses trois rangées, en bas de la silhouette. */
const EAVE = 3;

/**
 * Toit de planches de l'abri (`shed-roof`), appentis de 365 × 445 cm au sol, côté haut au nord : pièce `ground`,
 * silhouette ROOF_W × ROOF_SIL px collée en haut de l'image, puis ROOF_BELOW rangées vides (bas de l'image au sol, un
 * pixel au sud de l'avant-toit). Pas d'ombre peinte : le jeu calcule celle du toit.
 * - Bois brut grisé (rampe WEATHERED, dérivée du bois et de la pierre de la palette), nettement moins jaune que le
 *   chaume de la chaumière et que la charpente équarrie.
 * - Planches de 20 à 25 cm (4 ou 5 px, joint compris) dans le sens de la pente : joints verticaux en ombre (K), fil le
 *   long de la planche (tirets un cran plus sombres), quelques nœuds ; chaque planche sa teinte (claire, ordinaire),
 *   les claires plutôt à l'ouest, côté lumière ; une planche sur trois environ plus courte d'un pixel au nord ; un clou
 *   par planche sur chacun des quatre liteaux.
 * - La pente : trois bandes est-ouest (BANDS, la limite décalée d'une planche à l'autre), le haut au nord un cran plus
 *   clair, le bas vers l'avant-toit un cran plus sombre.
 * - Les rives est et ouest : une planche de rive de 2 px sur toute la longueur, sans joint, posée de chant (claire à
 *   l'ouest, côté lumière ; sombre à l'est).
 * - L'avant-toit : une tranche de EAVE rangées sur toute la largeur, droite et sombre (le bout des planches Q, joints
 *   K, puis K et le contour du bas) ; les bouts des chevrons (leurs images) dépassent juste dessous.
 * Contour d'un pixel pris dans la silhouette : K en haut et à gauche, OUTLINE en bas et à droite.
 */
function shedRoof(): Canvas {
  const W = ROOF_W;
  const SIL = ROOF_SIL;
  const TOP = SIL - EAVE; // rangées du dessus
  const c = new Canvas(W, SIL + ROOF_BELOW);
  const r = rng(41);
  // les planches entre les deux rives (colonnes 0 à 2 et W - 3 à W - 1 : contour et rive)
  type Board = { x0: number; x1: number; n: number; base: number; old: boolean; bands: number[]; grain: number[][] };
  const boards: Board[] = [];
  const L = 3;
  const R = W - 3;
  for (let x = L; x < R; ) {
    let w = r() < 0.5 ? 4 : 5;
    if (R - x - w < 4) w = R - x;
    const k = x / W;
    const lit = r() < 0.3 - k * 0.2;
    boards.push({
      x0: x,
      x1: x + w - 1,
      n: r() < 0.3 ? 1 : 0,
      base: lit ? 1 : 2,
      old: !lit && r() < 0.25,
      bands: BANDS.map((b) => b + Math.floor(r() * 7) - 3),
      grain: Array.from({ length: w }, () => [13 + Math.floor(r() * 10), 4 + Math.floor(r() * 4), Math.floor(r() * 30)]),
    });
    x += w;
  }
  const north = (x: number) => boards.find((b) => x >= b.x0 && x <= b.x1)?.n ?? 0;
  const inside = (x: number, y: number) => x >= 0 && x < W && y >= north(x) && y < SIL;
  const shift = (b: Board, y: number) => (y < b.bands[0] ? -1 : y < b.bands[1] ? 0 : 1);
  const tone = (i: number) => WEATHERED[Math.max(0, Math.min(WEATHERED.length - 1, i))];
  // le dessus
  for (const b of boards) {
    for (let x = b.x0; x <= b.x1; x++) {
      const i = x - b.x0;
      const joint = x === b.x1;
      for (let y = b.n; y < TOP; y++) {
        const base = b.base + shift(b, y);
        let k: string;
        if (joint) k = 'K';
        else if (NAILS.includes(y) && i === 1) k = 'K'; // un clou par planche, sur chaque liteau
        else {
          const [p, n, ph] = b.grain[i];
          const pos = (y + ph) % p;
          // le fil, une colonne sur deux (toutes sur une vieille planche), jamais contre le joint
          const g = pos < n && (i % 2 === 1 || b.old) && x < b.x1 - 1 && i > 0;
          k = tone(base + (g ? 1 : 0));
        }
        c.set(x, y, k);
      }
    }
    // un nœud par endroits : 2 × 2 un cran plus sombre, entouré de bois
    if (b.x1 - b.x0 >= 4 && r() < 0.5) {
      const kx = b.x0 + 1 + Math.floor(r() * (b.x1 - b.x0 - 2));
      const ky = 10 + Math.floor(r() * (TOP - 30));
      const k = tone(b.base + shift(b, ky) + 1);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) c.set(kx + dx, ky + dy, k);
    }
  }
  // les rives : planches de chant, sur toute la longueur ; à l'ouest, côté lumière, la claire, à l'est la sombre
  for (let y = 0; y < TOP; y++) {
    const band = y < BANDS[0] ? -1 : y < BANDS[1] ? 0 : 1;
    c.set(1, y, tone(1 + band)).set(2, y, tone(2 + band));
    c.set(W - 3, y, tone(2 + band)).set(W - 2, y, tone(3 + band));
  }
  // l'avant-toit : le bout des planches (Q, un joint K à chaque planche), puis K, puis le contour du bas
  for (let x = 0; x < W; x++) {
    const joint = boards.some((b) => b.x1 === x) || x === 2 || x === W - 4;
    c.set(x, TOP, joint ? 'K' : 'Q');
    c.set(x, TOP + 1, 'K');
    c.set(x, TOP + 2, 'o');
  }
  // contour pris dans la silhouette : K côté lumière (haut, gauche), OUTLINE côté ombre (bas, droite)
  const out: [number, number, string][] = [];
  for (let y = 0; y < SIL; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x + 1, y) || !inside(x, y + 1)) out.push([x, y, 'o']);
    else if (!inside(x - 1, y) || !inside(x, y - 1)) out.push([x, y, 'K']);
  }
  for (const [x, y, col] of out) c.px[y][x] = col;
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('footing-stone', footingStone()),
  img('shed-plate-north', shedPlateEW(64, 0)),
  img('shed-plate-south', shedPlateEW(41, 23)),
  img('shed-plate-side', shedPlateSide()),
  img('shed-rafter', shedRafter()),
  img('shed-roof', shedRoof()),
];
