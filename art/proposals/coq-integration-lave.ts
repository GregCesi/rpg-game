// ESSAI (chantier « maison du coq », dessins d'intégration, hors jeu) : la lave, seule lauze du jeu (réponse 26 de Grégoire,
// CADRAGE-coq.md section 10). La couverture `slates` de art/world/forge-roofs.ts (`slatesTex`, le faîtage des lauzes, l'égout)
// refaite de NOS laves (`laves`, `lavesRidge` de coq-pierre.ts, validées) : quatre signes sombres, dalles plus étroites vers le
// faîte, pureau de 25 cm à l'égout à 15 au faîte (le long de la pente, en vrais centimètres : la lauze se dessine sur toute pente),
// mousse dans les creux, 3 px d'épaisseur à l'égout (des laves empilées), faîtières de pierre taillées en bâtière.
// Planche : npx tsx tools/essai-coq-integration.ts (.art-preview/coq-integration-lave.png).
//
// À l'intégration (pixel-artist) : les quatre signes vont dans art/palette.ts (`lave`, ci-dessous : les signes de coq-pierre.ts,
// `( ) ? "`, sont pris au jeu par le fer et la terre cuite) ; `slatesTex` devient `laveTex` (sans `K` : les rangs sont comptés le
// long de la pente), `EAVE_H.slates` passe à 3, le faîtage des lauzes devient `laveRidge`. Les clés `lauze-roof-large` et
// `lauze-roof-large-pierced` restent ; aucun plan ne les pose aujourd'hui.

import type { Grid, Palette } from '../lib/canvas';
import { stonePalette } from '../items/stones';
import { terracotta } from '../palette';
import { part, polyPrism, renderPiece, rotQuads, unit, type Quad, type Rot, type Tex, type V3 } from '../lib/volumes';
import { laves, lavesRidge, COQ_PAL } from './coq-pierre';

/**
 * La lave (à ajouter à art/palette.ts) : le calcaire des murs, plus gris et plus sombre, lavé par la pluie et la mousse ; les
 * teintes validées de coq-pierre.ts, sous des signes libres dans toute la palette du jeu (aucune lettre grecque n'y sert).
 */
export const lave = {
  'ε': COQ_PAL['('], // lave au soleil
  'ζ': COQ_PAL[')'], // lave
  'η': COQ_PAL['?'], // lave à l'ombre, chant d'une lave
  'κ': COQ_PAL['"'], // creux sous une lave, joint du faîtage, contour côté lumière
};
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

interface PanDims { w: number; d: number; h: number }
const VIEW_ROT: Rot[] = [0, 3, 2, 1];

/** Le dessous du pan : les lattes en travers, les laves entre elles, dans l'ombre (comme `underTex` des lauzes). */
const under: Tex = (_s, t) => (Math.floor(t) % 4 === 0 ? '%' : 'κ');

/**
 * Un pan de laves (le modèle de `panModel` de forge-roofs.ts, sans le trou) : la pente, l'égout et les rives (les chants des laves
 * empilées), le dessous, la moitié du faîtage en faîtières taillées.
 */
function lavePanModel(dims: PanDims, seed = 5): Quad[] {
  const W = dims.w / 5, D = dims.d / 5, H = dims.h / 5, Hs = H - CAP;
  const zs = (y: number) => EAVE + ((D - y) * (Hs - EAVE)) / D;
  const P = part('pan', 8, 'κ', 'full', { roof: true });
  const nrm = unit([0, Hs - EAVE, D]), slopeV: V3 = [0, -D, Hs - EAVE];
  const tex = laveTex(seed);
  const R = part('faîtage', 9, 'κ', 'full', { roof: true });
  return [
    { o: [0, D, EAVE], u: [W, 0, 0], v: slopeV, n: nrm, part: P, tex, face: 'slope' },
    { o: [0, D, 0], u: [W, 0, 0], v: [0, 0, EAVE], n: [0, 1, 0], part: P, tex, face: 'S' },
    { o: [0, D, 0], u: [W, 0, 0], v: slopeV, n: [0, -nrm[1], -nrm[2]], part: P, tex: under, face: 'under' },
    { o: [0, D, 0], u: slopeV, v: [0, 0, EAVE], n: [-1, 0, 0], part: P, tex, face: 'W' },
    { o: [W, D, 0], u: slopeV, v: [0, 0, EAVE], n: [1, 0, 0], part: P, tex, face: 'E' },
    // la moitié sud de la faîtière en bâtière : du faîte (y 0) à la pente, 3 px plus bas
    ...polyPrism(0, W, [[0, H], [1.2, H], [3.5, zs(3.5) - 0.3], [3.5, zs(3.5) - 1], [0, zs(0)]], R, laveRidgeTex()),
  ];
}

/** Un pan de laves dans la vue v (0 à 3, les vues du jeu), comme `panImage` de forge-roofs.ts. */
export function lavePanImage(dims: PanDims, v: number, seed = 5): Grid {
  return renderPiece(rotQuads(lavePanModel(dims, seed), VIEW_ROT[v], [0, 0]), { k: 1 });
}
