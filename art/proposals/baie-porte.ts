// La baie de porte de la maison en pan de bois : proposition validée par Grégoire, INTÉGRÉE au jeu. Les pièces et leurs matières
// sont désormais celles du jeu (art/world/xeros-house.ts : `door-frame`, `<étape>-door-head`, `<étape>-jamb`, `inner-threshold-stone`,
// `inner-door` à 90 cm) ; ce fichier ne garde que la scène de vérification (la travée montée), tirée des mêmes modèles.
// Planche : npx tsx tools/essai-baie.ts écrit .art-preview/baie-porte.png.
//
// Ce que Grégoire a décidé (la baie de son essai validé, art/proposals/maison-xeros.ts, à ses vraies hauteurs) :
// - le seuil de pierre `threshold-stone` (120 × 50 × 20) sous la porte d'entrée ; la porte (90 × 5 × 180) part du seuil (z 20 → 200) ;
// - `door-frame`, l'huisserie : un montant de bois équarri 15 × 15 × 180, posé sur le seuil (z 20 → 200), un de chaque côté de la
//   porte ; bois travaillé (trois âges) ; vues `four` ;
// - `<étape>-door-head`, la tête de baie : 120 × 15 × 50, posée sur les deux huisseries (z 200 → 250, jusque sous la sablière) : le
//   linteau (15 cm, à 2 m) entre les deux huisseries prolongées jusqu'à la sablière, le remplissage au-dessus du linteau, dans les
//   quatre étapes des remplissages ; vues `four` ;
// - `<étape>-jamb` : la bande de remplissage entre le poteau et l'huisserie, 10 × 15 × 180, quatre étapes, vues `four` ; les
//   `*-inner-jamb` (30) ne servent plus à la maison : les portes intérieures font aussi 90 cm ;
// - `inner-threshold-stone` : le seuil intérieur, 120 × 30 × 20, sur le solin des cloisons (30 cm d'épais) ; vues `symmetric`.
// Hauteurs de la maison : solin 0-40, traverse basse 40-70, poteaux 70-250, sablière 250-280 ; la traverse et le solin s'arrêtent
// aux bords du seuil.

import type { Grid, Palette } from '../lib/canvas';
import { stonePalette } from '../items/stones';
import { woodAges } from '../palette';
import { box, doorTex, part, rotQuads, slabTex, timber, type Quad, type Rot, type Tex } from '../lib/volumes';
import type { Dims } from '../../src/content/gabarit';
import xerosHouse, { DOOR_BAY, FT, SEEDS, STAGES, doorBack, fill, framePart, frameTex, type Stage } from '../world/xeros-house';

/** Les mesures de la baie (celles du jeu) et les hauteurs de la maison, en px (5 cm). */
export const M = {
  ...DOOR_BAY,
  solin: 8, // 0-40 cm
  sole: 14, // la traverse basse : 40-70 cm
  plate: 50, // le haut des poteaux, le dessous de la sablière : 250 cm
  plateTop: 56, // le dessus de la sablière : 280 cm
  sill: 4, // le dessus du seuil : 20 cm
} as const;

export { STAGES, SEEDS, type Stage };
export const STAGE_NAMES: Record<Stage, string> = { staves: 'lattis (palancons)', wattle: 'clayonnage', daub: 'torchis', lime: 'chaux' };

/** Une porte : la face du dehors au sud (`front`), le dos au nord (`back`) ; ses chants, le bois de bout. */
function doorFaces(front: Tex, back: Tex, frontFace: string, backFace: string): Tex {
  return (s, t, c) => (c.face === frontFace ? front(s, t, c) : c.face === backFace ? back(s, t, c) : c.face === 'top' ? '^' : Math.floor(t) < 2 ? '&' : '%');
}

// =====================================================================================================================
// Les pièces : les images du jeu
// =====================================================================================================================

export const PAL: Palette = stonePalette;
export const AGES = { neuf: { ...stonePalette, ...woodAges.new }, patine: { ...stonePalette, ...woodAges.worn }, vieux: { ...stonePalette, ...woodAges.old } } as const;

export interface PieceViews { key: string; name: string; dims: Dims; aged: boolean; views: Grid[]; status: 'nouveau' | 'modifie' | 'existant' }

/** Les images du jeu d'une pièce (art/world/xeros-house.ts), par nom. */
function gameViews(names: string[]): Grid[] {
  return names.map((n) => {
    const s = xerosHouse.find((x) => x.name === n);
    if (!s || s.kind !== 'image') throw new Error(`baie-porte : pas d'image du jeu « ${n} »`);
    return s.grid;
  });
}
const four = (k: string) => gameViews([k, `${k}-r1`, `${k}-r2`, `${k}-r3`]);

/** Toutes les pièces nouvelles ou modifiées, avec leurs vues du jeu (r0..r3, ou est-ouest et nord-sud pour le seuil). */
export function pieces(): PieceViews[] {
  const out: PieceViews[] = [];
  out.push({ key: 'door-frame', name: 'huisserie', dims: { w: 15, d: 15, h: 180, shape: 'box', ground: true }, aged: true, views: four('door-frame'), status: 'nouveau' });
  for (const s of STAGES) out.push({ key: `${s}-door-head`, name: `tete de baie, ${STAGE_NAMES[s]}`, dims: { w: 120, d: 15, h: 50, shape: 'box', ground: true }, aged: true, views: four(`${s}-door-head`), status: 'nouveau' });
  for (const s of STAGES) out.push({ key: `${s}-jamb`, name: `bande de 10 cm, ${STAGE_NAMES[s]}`, dims: { w: 10, d: 15, h: 180, shape: 'box', ground: true }, aged: s === 'staves' || s === 'wattle', views: four(`${s}-jamb`), status: 'modifie' });
  out.push({ key: 'inner-threshold-stone', name: 'seuil interieur', dims: { w: 120, d: 30, h: 20, shape: 'box' }, aged: false, views: gameViews(['inner-threshold-stone', 'inner-threshold-stone-ns']), status: 'nouveau' });
  out.push({ key: 'inner-door', name: 'porte interieure, 90 cm', dims: { w: 90, d: 5, h: 180, shape: 'box', ground: true }, aged: true, views: four('inner-door'), status: 'modifie' });
  return out;
}

// =====================================================================================================================
// La travée montée (scène pour le rendu de art/proposals/maison-xeros.ts : faces dans la projection (x, y − z))
// =====================================================================================================================

export type BayKind = 'entry' | 'inner' | 'passage';
export interface BayOpts { kind: BayKind; stage?: Stage; open?: boolean; clipX?: number; solinBox?: boolean }

/** La pierre brute du solin vue en simple volume (les vues de côté) : des blocs gris, joints de terre. */
const stoneTex: Tex = (s, t, c) => {
  const i = Math.floor(s), j = Math.floor(t);
  if (c.face === 'top') return (i + j * 3) % 7 === 0 ? 'n' : (i >> 2) % 2 ? 'r' : 'R';
  const course = Math.floor(j / 4), off = course % 2 ? 2 : 0;
  if (j % 4 === 3 || (i + off) % 5 === 4) return 'n';
  return j % 4 === 0 ? 'z' : 'r';
};

/**
 * La travée d'une porte, montée à ses vraies hauteurs, avec les modèles du jeu : les poteaux (axes en x = 0 et 32), un bout de la
 * travée voisine de chaque côté (jusqu'à x −8 et 40), le solin (sauf `solinBox` absent : la vue de face le pose en images de
 * pierres), la traverse basse et la sablière, les deux bandes de 10 cm, le seuil, les deux huisseries, la porte (fermée, ouverte, ou
 * aucune pour la baie du cagibi), la tête de baie. Le mur sur y = 0, le dehors vers +y. `clipX` : la scène coupée à cet x.
 */
export function bayQuads(o: BayOpts): Quad[] {
  const Q: Quad[] = [];
  const stage = o.stage ?? 'lime';
  const cx = o.clipX ?? Infinity;
  const B = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, p: ReturnType<typeof part>, tex: Tex) => {
    if (x0 >= cx) return;
    Q.push(...box(x0, Math.min(x1, cx), y0, y1, z0, z1, p, tex));
  };
  const F = (a0: number, a1: number, z0: number, z1: number, seed: number, raised = false) => {
    if (a0 >= cx) return;
    fill(Q, stage, seed, a0, Math.min(a1, cx), z0, z1, raised);
  };
  const entry = o.kind === 'entry';
  const sd = entry ? 5 : 3; // le demi-solin : 50 cm (le tour) ou 30 cm (les cloisons)
  const L0 = -8, L1 = 40, o0 = 4, o1 = 28; // la scène, l'ouverture (seuil, huisseries)
  const T = (n: string, prio: number) => part(n, prio, 'K', 'full');
  if (o.solinBox) for (const [a, b] of [[L0, o0], [o1, L1]]) B(a, b, -sd, sd, 0, M.solin, part('solin', 2, 'Z', 'full'), stoneTex);
  B(L0, o0, -2, 2, M.solin, M.sole, T('traverse basse', 4), timber(11));
  B(o1, L1, -2, 2, M.solin, M.sole, T('traverse basse', 4), timber(12));
  B(L0, L1, -2, 2, M.plate, M.plateTop, T('sablière', 7), timber(21, [[8, 2], [40, 2]]));
  for (const x of [0, 32]) B(x - 2, x + 2, -2, 2, M.sole, M.plate, T('poteau', 5), timber(31 + x, [[2, 33], [1, 2]]));
  F(L0, -2, M.sole, M.plate, SEEDS[stage] + 7);
  F(34, L1, M.sole, M.plate, SEEDS[stage] + 8);
  F(2, 4, M.sole, M.plate, SEEDS[stage] + 200);
  F(28, 30, M.sole, M.plate, SEEDS[stage] + 201);
  B(o0, o1, -sd, sd, 0, M.sill, part('seuil', 3, '~', 'full'), slabTex(entry ? 3 : 5));
  for (const x of [o0, o1 - M.frame]) {
    B(x, x + M.frame, -FT, FT, M.sill, M.sill + M.frameH, framePart(), frameTex(41, 0));
    B(x, x + M.frame, -FT, FT, M.sill + M.frameH, M.plate, framePart(), frameTex(41, M.frameH));
  }
  const d0 = o0 + M.frame, d1 = o1 - M.frame, zl = M.sill + M.frameH;
  B(d0, d1, -FT, FT, zl, zl + M.lintel, part('linteau', 6, 'K', 'full'), timber(SEEDS[stage] + 445));
  F(d0, d1, zl + M.lintel, M.plate, SEEDS[stage] + 400, true);
  if (o.kind !== 'passage') {
    const seed = entry ? 7 : 9;
    const p = part('porte', 3, 'K', 'full');
    if (!o.open) B(d0, d1, -0.5, 0.5, M.sill, zl, p, doorFaces(doorTex(seed, M.door), doorBack(seed, M.door), 'S', 'N'));
    // ouverte : d'un quart de tour vers le dehors autour de son gond (le bord ouest de sa face du dehors, `swung` de src/world/build.ts)
    else B(d0, d0 + 1, 0.5, 0.5 + M.door, M.sill, zl, p, doorFaces(doorTex(seed, M.door), doorBack(seed, M.door), 'W', 'E'));
  }
  return Q;
}

/** Le dedans d'une travée (la terre battue) : au nord du mur ; pour une porte intérieure ou la baie du cagibi, des deux côtés. */
export function bayFloor(kind: BayKind): [number, number, number, number] {
  return kind === 'entry' ? [-8, 40, -40, -2] : [-40, 72, -40, 40];
}

/** La rotation d'une vue de la travée (0 du sud, 1 de l'ouest, 3 de l'est) autour du milieu de la baie. */
export const BAY_CENTER: [number, number] = [16, 0];
export const rotateBay = (Q: Quad[], r: Rot) => rotQuads(Q, r, BAY_CENTER);
