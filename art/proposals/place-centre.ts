// PROPOSITION (hors jeu, jamais chargée par le jeu) : le centre de la place du village et tout ce qui la remplit (CADRAGE-village.md,
// section 14.1 : « Le milieu », « Ce qui remplit »). Planche de contrôle : npx tsx tools/essai-place-centre.ts
// (.art-preview/place-centre.png, .art-preview/place-centre-pieces.png).
//
// Ce que le module exporte, pour que l'outil de montage (tools/essai-place.ts, plus tard) pose le centre dans la même scène que les
// bâtiments des deux autres modules :
//   - `PIECES: VillagePiece[]` : les pièces nouvelles, toutes leurs vues (art/proposals/place-centre-pieces.ts) ;
//   - `CENTRE: CentreItem[]` : chaque chose posée. `at` : le coin nord-ouest de son emprise, en px de la zone village ; `view` : sa vue
//     (0 à 3) ; `scene(o)` : sa scène (images et volumes, couleurs en signes de la palette de l'essai `XPAL` ou en `#rrggbb`, comme
//     place-nord-lib.ts), l'emprise posée en `o` (px de la scène). Pour la poser à sa place : `item.scene(item.at)`. Les scènes se
//     fusionnent avec celles des bâtiments et se rendent par le `render` de art/proposals/maison-xeros.ts. **L'ordre compte** : la
//     première est l'ombre du houppier, une image d'ombre (`x`) qui n'assombrit que le sol et doit passer avant toutes les autres
//     images (une image posée après elle l'efface sous elle) ;
//   - `RESERVED` : ce que le centre laisse aux autres (la place du panneau des nouvelles, dessiné par place-nord.ts `p-panneau`, et les
//     passages de 3 m au moins vers chaque rue et le tour de l'arbre) ;
//   - `PLAN` : le centre de la place, le rond, les emprises des bâtiments de la section 14.1, telles que ce module les a prises.
//
// La composition (C = (3312, 2128), le rond de 20 m, rayon 200 px) :
//   - au milieu, le tilleul (fût de 90 cm), son ombre au sud-est, le banc rond autour du tronc ; l'échelle appuyée au tronc côté sud,
//     le panier de la cueillette à son pied ; deux pots et un tabouret au pied du banc ;
//   - le panneau des nouvelles au sud-ouest de l'arbre, face au sud (réservé : x 3234-3266, y 2172-2178) ;
//   - les quatre bouches de rue restent libres sur 4 m (|dx| < 40 au nord et au sud, |dy| < 40 à l'est et à l'ouest), et un tour de 3 m
//     autour du banc ; on remplit ce qui reste entre ces passages et ce que les bâtiments posent devant eux (`PLAN.others`) ;
//   - nord-ouest : rien du centre (l'étal du riche le remplit, 3088-3224 × 1984-2064) ;
//   - nord-est (devant le bûcheron, sous ses tas) : la charrette à deux roues dételée, chargée de bûches, brancards vers le rond ; la
//     corde à linge sur ses poteaux, un panier ; deux caisses, un banc, des sacs ;
//   - sud-ouest (devant l'aile du cuir) : la charrette à bras chargée, bras vers l'ouest ; trois bottes de paille, des sacs, des
//     cageots, un tas de tonneaux couchés, des jarres, un banc ;
//   - sud-est (le recoin entre le rond, la mercière et la ferme rivale), posé à la main (`fixed`) : l'abreuvoir de pierre au bord de la
//     rue du sud, deux seaux ; un banc tourné vers l'arbre, le tas de tonneaux couchés, deux piles de cageots, des sacs, des tonneaux
//     debout, la paille, des caisses, des pots.

import type { Scene } from '../lib/volumes';
import { placeImg, pieceBoard, prop, sceneOf, type Img } from './place-centre-lib';
import { LINDEN_FOOT, MODELS, PIECES, PIECE_NOTES, lindenShade, model, roundBenchHalves, viewImg } from './place-centre-pieces';

export { PIECES, PIECE_NOTES, MODELS };

type Rect = [number, number, number, number];

// =====================================================================================================================
// Le plan (section 14.1)
// =====================================================================================================================

export const PLAN = {
  /** Le centre de la place, px de la zone village. */
  C: [3312, 2128] as [number, number],
  /** Le rayon du rond (20 m de diamètre). */
  R: 200,
  /**
   * Les emprises des bâtiments (hors œuvre, x0, y0, x1, y1 exclus) : celles du nord telles que place-nord.ts les a ajustées
   * (`FOOTPRINTS`, 5 novembre), celles du sud telles que la section 14.1 les propose (place-sud.ts se refait).
   */
  buildings: [
    { name: 'ferme du riche (boutique)', rect: [3040, 1744, 3256, 1928] as Rect },
    { name: 'ferme du riche (logis)', rect: [2784, 1936, 3072, 2064] as Rect },
    { name: 'bûcheron', rect: [3368, 1744, 3584, 1928] as Rect },
    { name: 'boutique abandonnée', rect: [3576, 1936, 3864, 2064] as Rect },
    { name: 'tailleuse (aile ouest)', rect: [2720, 2192, 3104, 2432] as Rect },
    { name: 'frère du forgeron (aile sud)', rect: [3008, 2320, 3248, 2704] as Rect },
    { name: 'mercière', rect: [3536, 2252, 3872, 2400] as Rect },
    { name: 'ferme rivale', rect: [3376, 2400, 3584, 2672] as Rect },
  ],
  /** Ce que les autres modules posent dehors, devant leurs façades (place-nord.ts `FOOTPRINTS`, `bucheronYard` ; place-sud.ts). */
  others: [
    { name: 'étal du riche', rect: [3088, 1984, 3224, 2064] as Rect },
    { name: 'recoin du bûcheron', rect: [3336, 1928, 3593, 2037] as Rect },
    { name: 'étal de la ferme rivale', rect: [3392, 2400, 3520, 2448] as Rect },
  ],
};
const [CX, CY] = PLAN.C;

/** Ce que le centre laisse libre ou aux autres modules. */
export const RESERVED: { name: string; rect: Rect }[] = [
  // place-nord.ts le proposait au nord-ouest du tronc (3232-3264 × 2064-2070) : le houppier le cachait (il est derrière le tronc) ;
  // au sud-ouest, il se voit de toute la place et de la rue du sud, on le lit le dos à l'arbre
  { name: 'panneau des nouvelles (place-nord.ts, p-panneau)', rect: [3234, 2172, 3266, 2178] },
  { name: 'rue du nord', rect: [CX - 40, CY - PLAN.R, CX + 40, CY - 60] },
  { name: 'rue du sud', rect: [CX - 40, CY + 60, CX + 40, CY + PLAN.R + 40] },
  { name: 'rue de l’ouest', rect: [CX - PLAN.R - 40, CY - 40, CX - 60, CY + 40] },
  { name: 'rue de l’est', rect: [CX + 60, CY - 40, CX + PLAN.R + 40, CY + 40] },
];

// =====================================================================================================================
// Les choses posées
// =====================================================================================================================

export interface CentreItem {
  /** La pièce (`PIECES` de ce module, ou un objet de src/content/props.json), ou un nom de ce qui n'est pas une pièce. */
  key: string;
  /** Le coin nord-ouest de son emprise, px de la zone village. */
  at: [number, number];
  view?: number;
  /** Le petit nom écrit sur la planche. */
  label?: string;
  scene(o: [number, number]): Scene;
  /** Posé à la main à sa place définitive : le montage (tools/essai-place.ts) ne le pousse pas. */
  fixed?: boolean;
}

/** L'emprise au sol d'une pièce de ce module dans sa vue (px). */
function foot(key: string, view = 0): [number, number] {
  const d = model(key).dims;
  return view % 2 ? [d.d / 5, d.w / 5] : [d.w / 5, d.d / 5];
}
/** Une pièce de ce module posée (vue, hauteur z, `dz` : à profondeur égale, ce qui passe devant). */
function piece(key: string, at: [number, number], view = 0, label?: string, z = 0, dz = 0): CentreItem {
  const m = model(key);
  return {
    key, at, view, label,
    scene: (o) => {
      const im = viewImg(m, view), [w, d] = foot(key, view);
      return sceneOf([m.quads ? pieceBoard(im, o[0], o[1], d, 0.5, dz, z) : placeImg(im as Img, o[0], w, o[1] + d, z, dz)]);
    },
  };
}
/** Des choses posées à la main : le montage les laisse où elles sont. */
const hand = (items: CentreItem[]): CentreItem[] => items.map((it) => ({ ...it, fixed: true }));
/** Un objet du jeu (props.json) posé. */
function game(key: string, at: [number, number], view = 0, label?: string, z = 0, dz = 0): CentreItem {
  return { key, at, view, label, scene: (o) => sceneOf([prop(key, o[0], o[1], view, z, dz)]) };
}

// le tilleul, son ombre, le banc rond (en deux moitiés, derrière et devant le tronc)
const SHADE = lindenShade();
const HALVES = roundBenchHalves();
const special = (key: string, at: [number, number], label: string, make: (o: [number, number]) => Scene): CentreItem => ({ key, at, label, scene: make });

const TREE_AT: [number, number] = [CX - 65, CY - 65];
const BENCH_AT: [number, number] = [CX - 25, CY - 25];

/**
 * Le tas de tonneaux couchés nord-sud (leur fond au sud, règle D) : trois au sol côte à côte d'est en ouest, deux dans les creux, un au
 * sommet ; emprise 39 × 18 px (1,95 × 0,90 m), 1,60 m de haut.
 */
function barrelPile(at: [number, number], label: string): CentreItem {
  const places: [number, number, number][] = [[0, 0, 0], [13, 0, 0], [26, 0, 0], [6.5, 11, 1], [19.5, 11, 1], [13, 22, 2]];
  return {
    key: 'barrel-lying', at, view: 1, label,
    scene: (o) => sceneOf(places.map(([x, z, k]) => placeImg(viewImg(model('barrel-lying'), 1) as Img, o[0] + x, 13, o[1] + 18, z, k * 0.1))),
  };
}
/** Une pile de cageots (le dernier : `top`). */
function cageotStack(at: [number, number], n: number, top: 'cageot' | 'cageot-apples', label?: string): CentreItem {
  return {
    key: 'cageot', at, view: 0, label,
    scene: (o) => sceneOf(Array.from({ length: n }, (_, i) => {
      const key = i === n - 1 ? top : 'cageot';
      return pieceBoard(viewImg(model(key), 0), o[0], o[1], 7, 0.5, i * 0.1, i * 5);
    })),
  };
}
/** Trois bottes de paille : deux au sol, une dessus. */
function hayStack(at: [number, number], label: string): CentreItem {
  return {
    key: 'hay-bale', at, view: 0, label,
    scene: (o) => sceneOf([prop('hay-bale', o[0], o[1]), prop('hay-bale', o[0] + 18, o[1]), prop('hay-bale', o[0] + 9, o[1] + 1, 0, 7, 0.2)]),
  };
}

export const CENTRE: CentreItem[] = [
  // l'ombre du houppier : la première (voir l'en-tête)
  special('linden-shade', [CX - SHADE.foot[0], CY - SHADE.foot[1]], '', (o) => sceneOf([{ grid: SHADE.grid, pal: SHADE.pal, x: o[0], y: o[1], depth: () => o[1] + SHADE.foot[1] + 80 }])),
  // le tilleul : posé par le pied de son tronc, au centre
  special('linden-tree', TREE_AT, 'tilleul', (o) => {
    const im = viewImg(model('linden-tree'), 0);
    const fx = o[0] + 65, fy = o[1] + 65;
    return sceneOf([{ grid: im.grid, pal: im.pal, x: fx - LINDEN_FOOT[0], y: fy - LINDEN_FOOT[1], depth: () => fy }]);
  }),
  // le banc rond : la moitié nord derrière le tronc, la moitié sud devant
  special('round-bench', BENCH_AT, 'banc rond', (o) => sceneOf([
    pieceBoard(HALVES.north, o[0], o[1], 50, 0.5, -26),
    pieceBoard(HALVES.south, o[0], o[1], 50, 0.5, 0),
  ])),
  // l'échelle appuyée au tronc côté sud (la cueillette de la fleur de tilleul), le panier à son pied ; deux pots au pied du banc
  piece('leaning-ladder', [CX - 5, CY + 8], 0, 'échelle'),
  piece('basket', [CX + 8, CY + 34], 0),
  piece('flower-pot', [CX - 33, CY + 16], 0),
  piece('flower-pot-yellow', [CX + 27, CY + 15], 0),
  game('stool', [CX + 30, CY + 26], 0),

  // nord-est, posé à la main (`fixed`) : entre les tas du bûcheron (jusqu'en y 2037) et la rue de l'est ; la charrette de bûches,
  // brancards vers le rond ; deux caisses, des sacs, un panier, un pot. Le chemin de la porte du bûcheron (x 3490-3514) reste libre
  // jusqu'au rond ; le banc et la corde à linge n'y sont plus (le linge des bâtiments suffit).
  ...hand([
    piece('two-wheel-cart', [3366, 2044], 0, 'charrette de bûches'),
    game('crate', [3456, 2056], 0),
    game('crate', [3456, 2056], 0, undefined, 10, 0.2),
    game('sack', [3470, 2060], 0),
    piece('flower-pot-yellow', [3452, 2070], 0),
    game('sack', [3540, 2040], 0),
    piece('basket', [3552, 2042], 0),
  ]),

  // sud-ouest : entre le panneau et l'aile du cuir (à 1 m de ses façades, x 3104 et y 2320)
  piece('hand-cart', [3150, 2172], 0, 'charrette à bras'),
  hayStack([3128, 2210], 'paille'),
  game('sack', [3198, 2184], 0),
  game('sack', [3206, 2192], 0),
  cageotStack([3170, 2204], 3, 'cageot-apples', 'cageots'),
  piece('basket', [3216, 2198], 1),
  game('barrel', [3190, 2210], 0),
  game('bench', [3132, 2236], 0, 'banc'),
  piece('flower-pot', [3174, 2236], 0),
  barrelPile([3222, 2240], 'tonneaux'),
  cageotStack([3200, 2258], 2, 'cageot'),
  cageotStack([3188, 2266], 3, 'cageot-apples'),
  game('sack', [3204, 2282], 0),
  game('jar', [3150, 2262], 0),
  game('jar', [3160, 2270], 0),

  // sud-est, posé à la main (le montage ne le déplace pas, `fixed`) : le recoin entre le rond, la mercière et la ferme rivale, dans
  // x 3360-3466 × y 2172-2252 ; ce qu'il laisse libre : la bouche de la rue du sud (x < 3352, 4 m) et celle de la rue de l'est
  // (y < 2168), le tour de 3 m du banc rond, 1,10 m devant les deux étals de la ferme rivale (y > 2252 au sud, x > 3468 à l'est) pour
  // les clients, le chemin de la porte de la ferme rivale (par la rue du sud, à l'ouest de son étal) et celui de la mercière (par le
  // bout est de son étal). De l'arbre vers l'étal : le banc tourné vers l'arbre, puis le tas de tonneaux couchés, les cageots, les
  // tonneaux debout et les sacs, la paille ; l'abreuvoir à part, au bord de la rue du sud, à 1 m du tas de tonneaux, ses deux seaux.
  ...hand([
    game('bench', [3398, 2176], 1, 'banc'),
    piece('flower-pot', [3408, 2172], 0),
    game('crate', [3376, 2200], 0),
    game('crate', [3376, 2200], 0, undefined, 10, 0.2),
    barrelPile([3414, 2190], 'tonneaux'),
    cageotStack([3456, 2190], 4, 'cageot-apples', 'cageots'),
    cageotStack([3456, 2200], 2, 'cageot'),
    piece('flower-pot-yellow', [3459, 2211], 0),
    game('barrel', [3412, 2212], 0),
    game('barrel', [3426, 2214], 0),
    game('sack', [3442, 2213], 0),
    game('sack', [3453, 2219], 0),
    piece('basket', [3442, 2224], 1),
    hayStack([3428, 2234], 'paille'),
    piece('stone-trough', [3360, 2228], 0, 'abreuvoir'),
    game('bucket-water', [3366, 2248], 0),
    game('bucket', [3376, 2250], 0),
  ]),
];

/** Toute la composition en une scène (dans l'ordre de `CENTRE`). */
export function centreScene(): Scene {
  const scenes = CENTRE.map((c) => c.scene(c.at));
  return { quads: scenes.flatMap((s) => s.quads), boards: scenes.flatMap((s) => s.boards) };
}
