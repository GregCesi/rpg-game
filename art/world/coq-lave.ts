// La lave, seule lauze du jeu (chantier « maison du coq », réponse 26 de Grégoire, CADRAGE-coq.md section 10 ; dessin d'intégration
// validé : .art-preview/coq-integration-lave.png). La couverture `slates` de art/world/forge-roofs.ts refaite de NOS laves (`laves`,
// `lavesRidge` de coq-materials.ts, validées) : quatre signes sombres (`lave` d'art/palette.ts), dalles plus étroites vers le faîte,
// pureau de 25 cm à l'égout à 15 au faîte (le long de la pente, en vrais centimètres : la lauze se dessine sur toute pente), mousse
// dans les creux, 3 px d'épaisseur à l'égout (des laves empilées), faîtières de pierre taillées en bâtière.
//
// Ici, le modèle d'un pan (`lavePanModel`, repris par `panImage` de forge-roofs.ts pour `lauze-roof-large`, et par les pans de la
// maison du coq, art/world/coq.ts) et le faîtage entier (`laveRidgeModel`, `lave-ridge`).

import type { Grid, Palette } from '../lib/canvas';
import { stonePalette } from '../items/stones';
import { lave, terracotta } from '../palette';
import { part, polyPrism, renderPiece, rotQuads, unit, type Quad, type Rot, type Tex, type V3 } from '../lib/volumes';
import { laves, lavesRidge } from './coq-materials';

const REMAP: Record<string, string> = { '(': 'ε', ')': 'ζ', '?': 'η', '"': 'κ' };
const remap = (t: Tex): Tex => (s, u, c) => { const v = t(s, u, c); return v === null ? null : REMAP[v] ?? v; };

/** La palette des pans de lauzes du jeu (celle de forge-roofs.ts) et la lave. */
export const LAVE_PAL: Palette = { ...stonePalette, ...terracotta, ...lave };

/** La matière d'un pan de laves (le remplaçant de `slatesTex`) : nos laves, rangs comptés le long de la pente. */
export const laveTex = (seed = 5): Tex => remap(laves(seed));
/** Les faîtières de pierre (le remplaçant des lauzes posées à cheval). */
export const laveRidgeTex = (): Tex => remap(lavesRidge());

/** L'épaisseur des laves vue à l'égout : 3 px (15 cm, des laves empilées ; celle de la forge : 2,5). */
export const EAVE = 3;
/** La moitié du faîtage au-dessus du pan : la faîtière de 20 cm. */
const CAP = 3;
/** Masse au mètre carré de toit (trois épaisseurs de laves de 4 cm, 0,8 de plein, et le recouvrement). */
export const KG_PER_M2 = 600;

export interface PanDims { w: number; d: number; h: number }
const VIEW_ROT: Rot[] = [0, 3, 2, 1];

/** Le dessous du pan : les lattes en travers, les laves entre elles, dans l'ombre (comme `underTex` des lauzes). */
const under: Tex = (_s, t) => (Math.floor(t) % 4 === 0 ? '%' : 'κ');

/**
 * Un pan de laves (le modèle de `panModel` de forge-roofs.ts) : la pente, l'égout et les rives (les chants des laves empilées), le
 * dessous, la moitié du faîtage en faîtières taillées (`ridge` : sans elle, la haute rive montre les chants des laves, comme
 * l'appentis : un pan que coiffe un faîtage à part, `lave-ridge`).
 */
export function lavePanModel(dims: PanDims, seed = 5, ridge = true): Quad[] {
  const W = dims.w / 5, D = dims.d / 5, H = dims.h / 5, Hs = H - (ridge ? CAP : 0);
  const zs = (y: number) => EAVE + ((D - y) * (Hs - EAVE)) / D;
  const P = part('pan', 8, 'κ', 'full', { roof: true });
  const nrm = unit([0, Hs - EAVE, D]), slopeV: V3 = [0, -D, Hs - EAVE];
  const tex = laveTex(seed);
  const R = part('faîtage', 9, 'κ', 'full', { roof: true });
  const Q: Quad[] = [
    { o: [0, D, EAVE], u: [W, 0, 0], v: slopeV, n: nrm, part: P, tex, face: 'slope' },
    { o: [0, D, 0], u: [W, 0, 0], v: [0, 0, EAVE], n: [0, 1, 0], part: P, tex, face: 'S' },
    { o: [0, D, 0], u: [W, 0, 0], v: slopeV, n: [0, -nrm[1], -nrm[2]], part: P, tex: under, face: 'under' },
    { o: [0, D, 0], u: slopeV, v: [0, 0, EAVE], n: [-1, 0, 0], part: P, tex, face: 'W' },
    { o: [W, D, 0], u: slopeV, v: [0, 0, EAVE], n: [1, 0, 0], part: P, tex, face: 'E' },
  ];
  // la moitié sud de la faîtière en bâtière : du faîte (y 0) à la pente, 3 px plus bas
  if (ridge) Q.push(...polyPrism(0, W, [[0, H], [1.2, H], [3.5, zs(3.5) - 0.3], [3.5, zs(3.5) - 1], [0, zs(0)]], R, laveRidgeTex()));
  else Q.push({ o: [W, 0, Hs - EAVE], u: [-W, 0, 0], v: [0, 0, EAVE], n: [0, -1, 0], part: P, tex, face: 'N' });
  return Q;
}

/** Un pan de laves dans la vue v (0 à 3, les vues du jeu), comme `panImage` de forge-roofs.ts. */
export function lavePanImage(dims: PanDims, v: number, seed = 5): Grid {
  return renderPiece(rotQuads(lavePanModel(dims, seed), VIEW_ROT[v], [0, 0]), { k: 1 });
}

/**
 * Le faîtage entier (`lave-ridge`) : les faîtières de pierre en bâtière posées à cheval sur les deux pans, de `w` cm de long, 60 cm
 * de large (12 px), 20 de haut (4 px), ses ailes de 10 cm sur les pans ; la même matière que la moitié de faîtage d'un pan (`laveRidgeTex`), le dessus plat de 10 cm.
 */
export function laveRidgeModel(w: number): Quad[] {
  const W = w / 5;
  return polyPrism(0, W, [[0, 0], [0, 2], [5.4, 4], [6.6, 4], [12, 2], [12, 0]], part('faîtage', 9, 'κ', 'full', { roof: true }), laveRidgeTex());
}
