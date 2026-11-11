// La maison du coq (chantier « maison du coq », CADRAGE-coq.md), les images du jeu : les dessins validés par Grégoire (les planches
// `coq-catalogue-*.png` et `coq-integration-*.png`, accord écrit du 5 novembre 2026) mis au jeu au pixel près, chaque pièce dans
// toutes ses vues (src/content/views.ts : `four` = `<clé>`, `-r1`, `-r2`, `-r3` ; `symmetric` = `<clé>`, `-ns` ; `round` = une vue).
//
// D'où vient chaque dessin :
// - les pierres qu'on porte : `STONE_PIECES` d'art/world/coq-stones.ts (le modèle en volumes de la planche-catalogue, rendu en objet,
//   k = ½, avec son ombre). Les vues suivent la convention du jeu (r1 : un quart de tour dans le sens des aiguilles d'une montre, la
//   face est vue au sud : la rotation 3 du modèle) ; la planche-catalogue nommait R1 la rotation 1 : ses R1 et R3 sont ici r3 et r1,
//   les mêmes dessins ;
// - le bois, le verre, le fer, les meubles, les tentures : `DRAWINGS` d'art/world/coq-woodwork.ts (ses vues sont déjà celles du jeu) ;
//   le bois travaillé y est dessiné dans les signes de `woodAges`, peint ici neuf (la planche le montrait patiné : c'est l'image
//   `-worn` que le build en tire, `aged` de props.json) ;
// - le garde-corps de la trémie : `railing` (coq-woodwork.ts), en deux pièces de 2,80 m et de 1 m ;
// - la cloison chaulée de l'étage : la lisse (`lime-rail`, la lisse chaulée de coq-partition.ts) et le remplissage bas (`lime-panel-low`,
//   le remplissage chaulé de la maison de Xéros, `fill` d'art/world/xeros-house.ts, haut de 40 cm) ;
// - le pan de mur et le pan de dallage du catalogue (`ashlar-wall`, `ashlar-wall-40`, `flagstone-row`) : un pan de 1,60 m, tel que
//   la planche d'intégration les montre (coq-wall.ts, coq-floor.ts) ; dans le jeu, le code des murs pose les pierres d'après
//   src/generated/ashlarStones.ts ;
// - la lave : `lave-roof`, `lave-roof-pierced`, `lave-ridge` (coq-lave.ts, `panImage` de forge-roofs.ts) ;
// - le pignon découvert `ashlar-gable` : les assises du mur validé (`courseFace`, l'enduit dedans), les blocs biais au bout des
//   assises sous les rampants, les dalles de rampant du catalogue (`gable-coping`) posées à 45°.

import type { Grid, Palette } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { woodAges } from '../palette';
import { box, hash, part, renderPiece, rotQuads, withGroundShadow, type Quad, type Rot, type Tex, type V3 } from '../lib/volumes';
import { COQ_PAL, limePlaster } from './coq-materials';
import { STONE_PIECES, archAssembly50, extrudeY, mantelAssembly, mirrorX, moved, placeAt, rotY } from './coq-stones';
import { crossWindow } from './coq-bays';
import { DRAWINGS, leadedPane, railing, type Drawing } from './coq-woodwork';
import { Paint, TONES, courseFace, courseImage, courseInner, courseNS, outline, shadowed, stoneFace, stringView, type CourseSpec } from './coq-wall';
import { flagColumn, flagRow } from './coq-floor';
import { laveRidgeModel } from './coq-lave';
import { panImage, ROOF_PAL, type PanDims, type PanHole } from './forge-roofs';
import { fill } from './xeros-house';
import { stonePalette } from '../items/stones';

/** Les vues du jeu (r0 à r3) dans les rotations du modèle en volumes. */
const VIEW_ROT: Rot[] = [0, 3, 2, 1];
type Views = 'four' | 'symmetric' | 'round';
const COUNT: Record<Views, number> = { four: 4, symmetric: 2, round: 1 };
/** Le nom de la vue v d'une image (src/content/views.ts). */
const viewName = (key: string, views: Views, v: number) => (v === 0 ? key : views === 'symmetric' ? `${key}-ns` : `${key}-r${v}`);

/** La palette de la pierre de taille : le calcaire et ses deux teintes de plus (θ, λ), les laves, le fer, le verre, les laines. */
const STONE_PAL: Palette = COQ_PAL;
/** La palette du bois travaillé : celle de la maison, le bois peint neuf (le build tire le patiné et le vieux). */
const WOOD_PAL: Palette = { ...COQ_PAL, ...woodAges.new };

const images = (key: string, views: Views, grid: (v: number) => Grid, palette: Palette): ImageSource[] =>
  Array.from({ length: COUNT[views] }, (_, v) => ({ kind: 'image', name: viewName(key, views, v), palette, grid: grid(v) }));

// =====================================================================================================================
// Les pierres qu'on porte (la planche-catalogue de la pierre)
// =====================================================================================================================

/** Les pierres de taille de la maison et leur symétrie (art/proposals/coq-catalogue-data.ts). */
const STONES: [string, Views][] = [
  ['ashlar-block-50', 'symmetric'], ['ashlar-block-70', 'symmetric'], ['ashlar-block-90', 'symmetric'], ['ashlar-header', 'symmetric'],
  ['ashlar-header-40', 'symmetric'], ['ashlar-quoin', 'four'], ['ashlar-jamb', 'four'], ['ashlar-string-course', 'four'], ['ashlar-corbel', 'four'],
  ['floor-flagstone', 'symmetric'], ['stone-step', 'four'], ['stair-stringer-block', 'four'],
  ['window-sill', 'four'], ['window-lintel', 'four'], ['mullion-low', 'symmetric'], ['mullion-high', 'symmetric'], ['transom', 'symmetric'],
  ['door-voussoir', 'four'], ['door-keystone', 'four'], ['door-springer', 'four'],
  ['fireplace-jamb', 'four'], ['fireplace-console', 'four'], ['mantel-voussoir', 'four'], ['fireback', 'symmetric'],
  ['small-fireplace-jamb', 'four'], ['small-fireplace-lintel', 'four'], ['stone-sink', 'four'], ['stove-slab', 'four'],
  ['stone-slate', 'symmetric'],
];

/** La vue v (du jeu) d'une pierre : le modèle tourné, rendu en objet (k = ½), avec son ombre portée. */
function stoneView(key: string, v: number): Grid {
  const p = STONE_PIECES[key];
  if (!p) throw new Error(`coq : pas de dessin de pierre pour « ${key} »`);
  return withGroundShadow(renderPiece(rotQuads(p.quads(), VIEW_ROT[v], [p.w / 2, p.d / 2]), { k: 0.5 }));
}

const stoneSources: ImageSource[] = STONES.flatMap(([key, views]) => images(key, views, (v) => stoneView(key, v), STONE_PAL));

// =====================================================================================================================
// Le bois, le verre, le fer, les meubles, les tentures (la planche-catalogue du bois)
// =====================================================================================================================

/** Les images d'un dessin du catalogue du bois, sous la clé du jeu. */
function drawn(key: string, views: Views, d: Drawing, palette: Palette = WOOD_PAL): ImageSource[] {
  return images(key, views, (v) => {
    const g = d.views[v as 0 | 1 | 2 | 3];
    if (!g) throw new Error(`coq : « ${key} » n'a pas de vue ${v}`);
    return g;
  }, palette);
}
const first = (k: string, i = 0): Drawing => DRAWINGS[k]()[i];

/** Le garde-corps de la trémie, vu comme un meuble (k = ½) dans ses quatre vues, avec son ombre. */
function railingViews(L: number): Drawing {
  const q = railing(L), views: Drawing['views'] = {};
  for (let v = 0; v < 4; v++) views[v as 0 | 1 | 2 | 3] = withGroundShadow(renderPiece(rotQuads(q, VIEW_ROT[v], [0, 0]), { k: 0.5 }));
  return { views, palette: WOOD_PAL, source: {} };
}

const woodSources: ImageSource[] = [
  ...drawn('leaded-glass', 'symmetric', first('leaded-glass'), STONE_PAL),
  // l'imposte vitrée de la demi-croisée : le même vitrail, 105 × 45 cm
  ...drawn('leaded-transom', 'symmetric', leadedPane(21, 9), STONE_PAL),
  ...drawn('casement-shutter', 'four', first('casement-shutter', 0)),
  ...drawn('window-bar', 'round', first('window-bar'), STONE_PAL),
  ...drawn('oak-arch-door', 'four', first('oak-arch-door', 0)),
  ...drawn('stair-railing', 'four', railingViews(56)),
  ...drawn('stair-railing-short', 'four', railingViews(20)),
  ...['canopy-bed', 'dresser', 'high-chair', 'kneading-trough', 'writing-desk', 'tailor-table'].flatMap((k) => drawn(k, 'four', first(k))),
  ...drawn('cloth-bolt', 'symmetric', first('cloth-bolt', 0), STONE_PAL),
  ...drawn('pewter', 'round', first('pewter'), STONE_PAL),
  // le lit défait : le bois de lit du lit de la mère (ses signes et sa palette)
  ...((): ImageSource[] => { const d = first('bed:unmade'); return drawn('unmade-bed', 'four', d, d.palette); })(),
  ...drawn('verdure-tapestry', 'four', first('verdure-tapestry'), STONE_PAL),
  ...drawn('wall-hanging', 'four', first('wall-hanging'), STONE_PAL),
  ...drawn('hanging-rod', 'symmetric', first('hanging-rod'), STONE_PAL),
];

// =====================================================================================================================
// La cloison chaulée de l'étage : la lisse et le remplissage bas
// =====================================================================================================================

/** Les quatre vues d'une pièce de bâtiment (`ground` : sa profondeur à l'échelle du sol, k = 1), sans ombre. */
const groundViews = (key: string, q: Quad[], palette: Palette): ImageSource[] =>
  images(key, 'four', (v) => renderPiece(rotQuads(q, VIEW_ROT[v], [0, 0]), { k: 1 }), palette);

/**
 * La lisse chaulée (560 × 25 × 15 cm) : plus large que le pan (25 cm pour 15), le dessus blanc de chaux (l'arête au soleil), les faces
 * chaulées ; la matière de la lisse de la cloison validée (`railTex` de coq-partition.ts), le long de l'est-ouest.
 */
const railTex: Tex = (s, t, c) => {
  if (c.face === 'top') { const i = Math.floor(s), j = Math.floor(t); return i === 0 || j === 0 ? '+' : i === Math.round(c.w) - 1 || j === Math.round(c.h) - 1 ? '=' : '!'; }
  return Math.floor(t) === 0 ? '=' : '+';
};
const limeRail = (): Quad[] => box(0, 112, -2.5, 2.5, 0, 3, part('lisse', 4, ';', 'full'), railTex);

/** Le remplissage chaulé bas (140 × 15 × 40 cm) : celui de la maison de Xéros (`lime-panel`), le rang du haut de la cloison. */
const limePanelLow = (): Quad[] => { const Q: Quad[] = []; fill(Q, 'lime', 537, 0, 28, 0, 8); return Q; };

const partitionSources: ImageSource[] = [
  ...groundViews('lime-rail', limeRail(), STONE_PAL),
  ...groundViews('lime-panel-low', limePanelLow(), stonePalette),
];

// =====================================================================================================================
// Le pan de mur et le pan de dallage du catalogue (1,60 m)
// =====================================================================================================================

/** Le contour et l'ombre d'un pan posé seul (comme la planche d'intégration). */
const pan = (g: Grid) => shadowed(outline(g));
/** Le pan du catalogue : 1,60 m, deux têtes de mur, l'assise paire. */
const WALL_SPEC: CourseSpec = { x0: 0, x1: 32, k: 0, start: 'head', end: 'head' };

/** Les vues d'un pan d'assise : r0 le parement du dehors ; r1, r3 nord-sud (la règle D) ; r2 la face du dedans, enduite (réponse 31). */
function wallViews(thick: number): (v: number) => Grid {
  return (v) => pan(v === 0 ? courseImage(WALL_SPEC, thick) : v === 2 ? courseInner(WALL_SPEC, true, thick) : courseNS(WALL_SPEC, thick, v === 3));
}

/**
 * Le pan de dallage nord-sud par la règle D (10 × 32 : l'est-ouest inversé) : le dessus des dalles tournées, 40 cm de large, la
 * rangée de 1,50 m et le chant au sud (`flagColumn`), et le chant du flanc est (2 colonnes), comme le chant sud de l'est-ouest.
 */
function flagRuleD(col: number): Grid {
  const g = flagColumn(0, 30, col), last = g.length - 2;
  return g.map((r, j) => r + (j >= last ? ';;' : '=;'));
}

const wallSources: ImageSource[] = [
  ...images('ashlar-wall', 'four', wallViews(60), STONE_PAL),
  ...images('ashlar-wall-40', 'four', wallViews(40), STONE_PAL),
  // le pan de dallage : une rangée de 1,60 m (la rangée paire), est-ouest et nord-sud
  // le pan de dallage, couché (un morceau `wall`) : r0 et r2 la rangée paire et l'impaire ; r1, r3 par la règle D (flagRule)
  ...images('flagstone-row', 'four', (v) => shadowed(outline(v % 2 ? flagRuleD(v >> 1) : flagRow(0, 32, v >> 1), '~')), STONE_PAL),
  // le pan de cordon (une assise de 20 cm), dans les deux épaisseurs
  ...images('string-course-wall', 'four', (v) => pan(stringView(0, 32, 60, v)), STONE_PAL),
  ...images('string-course-wall-40', 'four', (v) => pan(stringView(0, 32, 40, v)), STONE_PAL),
];

// =====================================================================================================================
// La lave de la maison : deux pans et le faîtage
// =====================================================================================================================

/** Un pan de la maison du coq : 15,20 m entre les pignons, 3,70 m de projection, 3,70 m de montée (45°). */
export const COQ_PAN: PanDims = { w: 1520, d: 370, h: 370 };

/**
 * La souche de la salle qui perce le pan nord (le pan percé posé en r2) : 140 cm de large, centrée à 1 040 cm du bout ouest du pan
 * posé (dans le monde), de 30 à 130 cm de projection depuis la rive basse ; elle monte à 100 cm au-dessus du haut du pan, son
 * couronnement (`chimney-cap`, 140 × 100 × 10) dessus, à son aplomb. À changer ici si le plan pose la souche ailleurs.
 */
export const COQ_STACK = { center: 1040, width: 140, from: 30, to: 130, above: 100, cap: 10 };

/** Le trou du pan percé dans le repère du modèle (r0, px) : le pan posé en r2 a tourné d'un demi-tour (son bout ouest est à l'est). */
function coqHole(dims: PanDims): PanHole {
  const W = dims.w / 5, D = dims.d / 5, H = dims.h / 5, S = COQ_STACK;
  const x0 = W - (S.center + S.width / 2) / 5, x1 = W - (S.center - S.width / 2) / 5;
  const y0 = D - S.to / 5, y1 = D - S.from / 5, top = H + S.above / 5;
  return { flue: { x0, x1, y0, y1, z0: -200, z1: top }, cap: { x0, x1, y0, y1, z0: top, z1: top + S.cap / 5 } };
}

const roofSources: ImageSource[] = [
  // les pans sans leur moitié de faîtage : le faîtage entier est une pièce à part (`lave-ridge`), qui les coiffe
  ...images('lave-roof', 'four', (v) => panImage('slates', COQ_PAN, v, false, false), ROOF_PAL),
  ...images('lave-roof-pierced', 'four', (v) => panImage('slates', COQ_PAN, v, coqHole(COQ_PAN), false), ROOF_PAL),
  ...images('lave-ridge', 'symmetric', (v) => renderPiece(rotQuads(laveRidgeModel(COQ_PAN.w), VIEW_ROT[v], [0, 0]), { k: 1 }), ROOF_PAL),
];

// =====================================================================================================================
// Le pignon découvert
// =====================================================================================================================

/**
 * Le pignon de pierre de taille d'un bout de la maison (`ashlar-gable`), posé sur l'arase à 5,50 m : 6,80 m hors œuvre (136 px), 60 cm
 * d'épaisseur (12 px), les rampants à 45° jusqu'au sommet à 3,40 m (68 px), couverts de dalles de rampant (`gable-coping`, 5 cm de
 * débord de chaque côté du mur) : 3,80 m en tout. Modèle : la face du dehors au sud (y = 12), comme le pignon de bardage de la forge.
 */
export const GABLE = { w: 136, d: 12, rise: 68, baseCourse: 18 };

/** La face du dehors du pignon, en assises de 30 cm (rangée 0 : le haut, au sommet) : les assises du mur, les blocs biais aux bouts. */
function gableFace(): Grid {
  const { w, rise, baseCourse } = GABLE, p = new Paint(w, rise);
  const tone = (x: number, k: number) => TONES[Math.floor(hash(x, k, 7) * 3)];
  for (let kk = 0; kk * 6 < rise; kk++) {
    const k = baseCourse + kk, z0 = kk * 6, L = z0, R = w - z0, y = rise - z0 - 6;
    const block = (x: number, bw: number, n: number) => p.put(stoneFace(bw, tone(x, k), hash(x, k, 3 + n) < 0.5, Math.floor(hash(x, k, 11 + n) * 1000)), x, y);
    if (R - L >= 30) {
      // le bloc biais de 60 cm à chaque bout, l'assise du mur entre eux
      block(L, 12, 0);
      p.put(courseFace({ x0: L + 12, x1: R - 12, k, start: 'abut', end: 'abut' }), L + 12, y);
      block(R - 12, 12, 1);
    } else if (R - L >= 24) {
      // les deux blocs biais se rejoignent au milieu
      const m = Math.round((L + R) / 2);
      block(L, m - L, 0);
      block(m, R - m, 1);
    } else block(L, R - L, 0); // la pierre du sommet
  }
  // le triangle : rien hors des rampants
  return p.grid().map((row, j) => [...row].map((ch, i) => (rise - j - 0.5 <= rise - Math.abs(i + 0.5 - w / 2) ? ch : '.')).join(''));
}

/** Le pignon en volumes : le triangle de pierre (la face du dehors, l'enduit du dedans), les dalles de rampant sur les deux rampants. */
function gableQuads(): Quad[] {
  const { w, d, rise } = GABLE, face = gableFace();
  const plaster = limePlaster(17);
  const tex: Tex = (s, t, c) => {
    const i = Math.floor(s), j = rise - 1 - Math.floor(t);
    if (c.face === 'S') { const ch = face[j]?.[i]; return ch && ch !== '.' ? ch : null; }
    // la face du dedans, enduite : vue du nord, l'est à gauche ; la hauteur comptée depuis le sol de la maison (l'arase à 5,50 m)
    if (c.face === 'N') return plaster(w - 1 - s, 110 + t, c);
    return Math.floor(t) % 2 ? '=' : '+';
  };
  const core = extrudeY(0, d, [[0, 0], [w, 0], [w / 2, rise]], part('pignon', 1, '~', 'full'), tex);
  // les dalles de rampant du catalogue (60 cm de long, 70 de large : 5 cm de débord de chaque côté), posées à 45° sur le rampant
  // ouest, bout à bout ; le rampant est, les mêmes retournées ; coupées d'aplomb au pied (sur l'angle du mur)
  const slab = STONE_PIECES['gable-coping'].quads();
  const rake = Math.hypot(w / 2, rise), n = Math.ceil(rake / 12);
  const west: Quad[] = [];
  for (let k = 0; k < n; k++) west.push(...rotY(moved(slab, [k * 12, -1, 0] as V3), Math.PI / 4, 0, 0).map((q) => ({ ...q, part: COPING })));
  const east = mirrorX(west, w);
  // chaque rampant s'arrête d'aplomb au sommet (les deux se rejoignent) et au pied (sur l'angle du mur)
  return [...core, ...clipX(west, (x) => x >= 0 && x <= w / 2), ...clipX(east, (x) => x >= w / 2 && x <= w)];
}

/** Des volumes coupés d'aplomb : seul ce dont l'abscisse (dans le modèle, avant toute rotation de vue) passe `keep` reste. */
function clipX(qs: Quad[], keep: (x: number) => boolean): Quad[] {
  return qs.map((q) => {
    const lu = Math.hypot(...q.u), lv = Math.hypot(...q.v);
    return { ...q, tex: (s, t, c) => (keep(q.o[0] + (q.u[0] * s) / lu + (q.v[0] * t) / lv) ? q.tex(s, t, c) : null) };
  });
}
const COPING = part('rampant', 3, '~', 'full');

const gableSources: ImageSource[] = images('ashlar-gable', 'four', (v) => withGroundShadow(renderPiece(rotQuads(gableQuads(), VIEW_ROT[v], [0, 0]), { k: 0.5 })), STONE_PAL);

// =====================================================================================================================
// Les pièces assemblées : la croisée, la demi-croisée, l'arc de la porte, la plate-bande du manteau
// =====================================================================================================================
//
// Le moteur ne sait pas encastrer une pièce dans une autre et les murs vont par assises de 30 cm : ces quatre pièces sont les
// assemblages validés (`crossAssembly`, `archAssembly50`, `mantelAssembly` de coq-stones.ts), recadrés sur ce qui se voit dans la
// baie (ce qui est noyé dans les tableaux est caché par les pans du mur), rendus comme leurs pièces (k = ½), sans ombre : ils se
// posent en hauteur, dans le mur.

/** Les quatre vues d'un assemblage (`model(v)` : ses volumes, la vue pouvant en changer : le noir du dedans vu du dehors seul). */
const assemblyViews = (key: string, model: (v: number) => Quad[]): ImageSource[] =>
  images(key, 'four', (v) => renderPiece(rotQuads(model(v), VIEW_ROT[v], [0, 0]), { k: 0.5 }), STONE_PAL);

/** Des volumes étirés en hauteur (le meneau du haut porté à la hauteur du jour). */
const stretchZ = (qs: Quad[], f: number): Quad[] => qs.map((q) => ({ ...q, o: [q.o[0], q.o[1], q.o[2] * f] as V3, u: [q.u[0], q.u[1], q.u[2] * f] as V3, v: [q.v[0], q.v[1], q.v[2] * f] as V3 }));
/** Le noir du dedans, derrière un jour (vu du dehors seulement). */
const dark = (x0: number, x1: number, y: number, z0: number, z1: number) => box(x0, x1, y - 1, y, z0, z1, part('fond', 0, 'o', 'none'), () => 'o');

/** Le jour des croisées dans le mur : 100 cm (20 px), de x 2 à 22 (la pierre, taillée pour 105, est recoupée de 5 cm à l'est) ; l'appui de 125 cm, pris dans les tableaux, coupé. */
const JOUR = { x0: 2, x1: 22 };
const inJour = (x: number) => x >= JOUR.x0 - 1e-6 && x <= JOUR.x1 + 1e-6;

/**
 * La croisée de l'étage (`cross-window`) : l'appui (15 cm), le jour de 165 cm (33 px : 5 cm de plus que les 160 validés, pour tomber
 * sur les assises ; ils vont au jour du haut, 60 cm), le meneau du bas (90), la traverse, le meneau du haut, les vitraux en losanges
 * dans les deux jours du haut ; les jours du bas ouverts (les volets sont des pièces à part), le noir du dedans derrière. Sans linteau.
 */
function crossWindowQuads(v: number): Quad[] {
  const X = JOUR.x0, low = 18, h = 33;
  const glass = crossWindow({ x: X, face: 12, z: 3, w: 21, h, kind: 'cross', low, open: true }).filter((q) => q.part.name === 'vitrail');
  const q: Quad[] = [
    ...placeAt('window-sill', X - 2, 7, 0), ...placeAt('mullion-low', X + 9, 8, 3), ...placeAt('transom', X, 8, 3 + low),
    ...moved(stretchZ(placeAt('mullion-high', 0, 0, 0), 12 / 11), [X + 9, 8, 3 + low + 3]),
    ...glass,
  ];
  if (v === 0) q.push(...dark(X, X + 9, 9, 3, 3 + low), ...dark(X + 12, X + 21, 9, 3, 3 + low));
  return clipX(q, inJour);
}

/**
 * La demi-croisée du rez-de-chaussée (`half-cross-window`) : l'appui (15 cm), le jour de 135 cm (27 px : 5 cm de moins que les 140
 * validés), le jour du bas de 75 cm et ses barreaux de fer (scellés dans l'appui et la traverse, une lisse au milieu), la traverse,
 * l'imposte vitrée de 45 cm (`leaded-transom`). Sans linteau.
 */
function halfCrossQuads(v: number): Quad[] {
  const X = JOUR.x0, low = 15, h = 27;
  const win = crossWindow({ x: X, face: 12, z: 3, w: 21, h, kind: 'half', low, open: true });
  const glass = win.filter((q) => q.part.name === 'vitrail');
  // les barreaux : seulement dans le jour du bas (ils s'arrêtent sous la traverse)
  const bars = win.filter((q) => q.part.name === 'fer').map((q) => ({ ...q, tex: (s: number, t: number, c: Parameters<Tex>[2]) => {
    const lv = Math.hypot(...q.v), z = q.o[2] + (q.v[2] * t) / (lv || 1);
    return z > 3 + low + 1e-6 ? null : q.tex(s, t, c);
  } }));
  const q: Quad[] = [...placeAt('window-sill', X - 2, 7, 0), ...placeAt('transom', X, 8, 3 + low), ...glass, ...bars];
  if (v === 0) q.push(...dark(X, X + 21, 9, 3, 3 + low));
  return clipX(q, inJour);
}

/**
 * L'arc de la porte (`stone-arch`) : les deux sommiers, les trois claveaux de chaque côté et la clef au coq de 50 cm, tels
 * qu'assemblés dans `archAssembly50` sur la baie de 110 cm ; sans les pierres de tableau ni le noir de la baie ; coupé d'aplomb à
 * 30 cm du jour de chaque côté (le reste des sommiers est pris dans le mur) : 170 cm.
 */
function stoneArchQuads(): Quad[] {
  const cx = 8 + 11, base = 5 * 6; // le centre de l'arc, la base des sommiers (sur la cinquième assise des tableaux)
  const top = (q: Quad) => Math.max(q.o[2], q.o[2] + q.u[2], q.o[2] + q.v[2], q.o[2] + q.u[2] + q.v[2]);
  const qs = archAssembly50().filter((q) => q.part.name !== 'fond' && !(q.part.name === 'mur' && top(q) <= base + 1e-6));
  return clipX(qs, (x) => x >= cx - 17 - 1e-6 && x <= cx + 17 + 1e-6);
}

/** La plate-bande du manteau de la salle (`mantel-lintel`) : les huit claveaux de `mantelAssembly`, d'un seul tenant (240 × 40 × 40). */
const mantelQuads = (): Quad[] => mantelAssembly().filter((q) => q.part.name.startsWith('claveau'));

const assemblySources: ImageSource[] = [
  ...assemblyViews('cross-window', crossWindowQuads),
  ...assemblyViews('half-cross-window', halfCrossQuads),
  ...assemblyViews('stone-arch', stoneArchQuads),
  ...assemblyViews('mantel-lintel', mantelQuads),
];

// =====================================================================================================================

const sources: ImageSource[] = [...stoneSources, ...woodSources, ...partitionSources, ...wallSources, ...roofSources, ...gableSources, ...assemblySources];

export default sources;
