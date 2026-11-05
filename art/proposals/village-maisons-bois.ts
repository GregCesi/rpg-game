// PROPOSITION (hors jeu, jamais chargée par le jeu) : les sept maisons de pan de bois, de torchis et de planches du village
// (CADRAGE-village.md, section 3.2) : h1 le couvreur, h3 les vieux, h4 le berger, h5 les journaliers, h6 le vannier (ex-charpentier), h7 le
// laboureur, h11 la guérisseuse. Planches : npx tsx tools/essai-village-bois.ts (.art-preview/village-bois-dehors.png,
// village-bois-dedans.png, village-bois-pieces.png).
//
// Le modèle est celui de la maison de Xéros (art/proposals/maison-xeros.ts) généralisé dans art/proposals/village-maisons-bois-lib.ts :
// des volumes dont chaque face a sa matière au pixel, projetés comme le jeu (x, y − z), 5 cm par pixel. Les images du jeu (meubles,
// foyer, âtre et cheminée, portes, volets, dés, pierres du solin) sont reprises telles quelles, à leur place ; les pièces nouvelles
// (art/proposals/village-maisons-bois-pieces.ts) sont posées comme le jeu les poserait.
//
// Repères : chaque maison se décrit dans le repère de ses axes (l'origine sur l'axe du poteau nord-ouest, x vers l'est, y vers le sud,
// px de 5 cm ; une maison au faîtage nord-sud, h1, se modèle couchée puis tourne d'un quart de tour). `outside(o)` et `inside(o)`
// rendent une `Scene` posée de sorte que le coin nord-ouest de son emprise (débords de toit et appentis compris, `size`) soit en `o` :
// plusieurs maisons tiennent dans la même scène (la rue du sud), il suffit de concaténer leurs faces et leurs images (`mergeScenes`).
//
// Palette : toutes les faces sont en signes de `palette` (celle de l'essai de la maison de Xéros : le monde, le bois patiné) ; le bois
// vieux des vieux (h3) prend les signes `{ } [ ] |` (la rampe `woodAges.old`, déjà dans la palette du monde), le fer passe en couleur.
// Deux maisons d'âges différents se rendent donc ensemble avec la seule `palette` ; les images posées portent chacune la leur.

import type { Grid } from '../lib/canvas';
import { AT as CH_AT, capModel, flueModel, hearthModel, hoodModel } from '../world/chimney';
import { mantel } from './cheminee-2';
import { HOUSE_META, type HouseId, type VillageHouse } from './village-types';
import {
  PAL, PIECE_PAL, agedGrid, box, foreign, frameScene, leanTo, masonry, mergeScenes, moveQuads, moveScene, part,
  pieceBoard, placed, propDims, prop, timber, toWorld, aged, boardsTex, leafTex, face, img, propImg, placeImg,
  type Age, type Board, type HouseSpec,
} from './village-maisons-bois-lib';
import { PIECES, SHED_LOW, pieceGrid } from './village-maisons-bois-pieces';
import type { Quad, Rot, Scene, Tex, V3 } from '../lib/volumes';

export { PIECES };
/** La palette de toutes les faces des maisons de bois (le bois patiné ; le vieux par ses propres signes). */
export const palette = PAL;
/** La palette des pièces nouvelles dessinées seules (avec le fer et la terre cuite). */
export const piecePalette = PIECE_PAL;

const steps = (n: number, k = 32, a = 0) => Array.from({ length: n + 1 }, (_, i) => a + i * k);

// =====================================================================================================================
// Outils communs
// =====================================================================================================================

/** Une pièce nouvelle posée en cm (x0, y0 : coin nord-ouest de son emprise dans la vue v), au bois de la maison. */
function piece(key: string, x0: number, y0: number, v = 0, age: Age = 'worn', z = 0): Board {
  const g = agedGrid(pieceGrid(key, v), age);
  const p = PIECES.find((q) => q.key === key)!;
  const [w, d] = v % 2 ? [p.dims.d, p.dims.w] : [p.dims.w, p.dims.d];
  return pieceBoard(g, x0 / 5, (x0 + w) / 5, (y0 + d) / 5, z / 5);
}
/** Le foyer au sol du jeu (`hearth`, Ø 1 m, le feu à l'image `frame`), son coin nord-ouest en cm. */
const hearth = (x: number, y: number, frame: number) => prop('hearth', x, y, 0, 'worn', 0, frame);

/** La cheminée du jeu (âtre, hotte, conduit, couronnement) contre le mur nord, l'âtre à partir de x (px) ; le pan percé au droit du conduit. */
function chimney(x: number, roof: boolean, frame: number, flues: number): { quads: Quad[]; boards: Board[]; pierce: (q: Quad[], name: string) => Quad[] } {
  const dx = x - CH_AT.hearth[0];
  // la cheminée du jeu (art/world/chimney.ts `chimneyQuads`), son conduit de `flues` tronçons : la souche à 1 m au-dessus du faîte
  const upTo = roof ? Infinity : 52;
  const local = (qs: Quad[], at: V3): Quad[] => moveQuads(qs, at);
  const parts: Quad[] = [...local(hearthModel(frame)(), CH_AT.hearth), ...local(hoodModel(), CH_AT.hood)];
  for (let k = 0; k < flues && CH_AT.flue(k)[2] < upTo; k++) {
    const f = local(flueModel(), CH_AT.flue(k));
    parts.push(...(k < flues - 1 ? f.filter((q) => q.face !== 'top') : f));
  }
  const capZ = CH_AT.flue(flues)[2];
  if (capZ < upTo) parts.push(...local(capModel(), [CH_AT.cap[0], CH_AT.cap[1], capZ]));
  const quads = moveQuads(parts, [dx, 0, 0]);
  const m = mantel('ew');
  const boards: Board[] = [{ grid: m.grid, pal: m.pal, x: CH_AT.mantel[0] + dx, y: Math.round(28 - 30 - m.grid.length), depth: () => 28 }];
  const x0 = CH_AT.flue(0)[0] + dx, y0 = CH_AT.flue(0)[1], x1 = x0 + 20, y1 = y0 + 16;
  const pierce = (qs: Quad[], name: string): Quad[] => qs.map((q) => {
    if (q.part.name !== name) return q;
    const tex: Tex = (s, t, cx) => {
      const [px, py] = cx.p;
      if (px > x0 - 0.3 && px < x1 + 0.3 && py > y0 - 0.3 && py < y1 + 0.3) return null;
      const k = q.tex(s, t, cx);
      if (k === null || cx.face !== 'slope') return k;
      if (px > x0 - 2.1 && px < x1 + 2.1 && py > y0 - 2.1 && py < y1 + 2.1) return px < x0 + 0.5 || py < y0 ? 'd' : 'D';
      return k;
    };
    return { ...q, tex };
  });
  return { quads, boards, pierce };
}

interface Built { scene: Scene; smoke: V3[] }
/**
 * Une maison : sa description, son quart de tour, et ce qui s'ajoute au modèle (appentis, mur de refend, meubles, objets du dehors),
 * dans le repère de ses axes ; `local` : des faces dans le repère de la maison avant le quart de tour (l'appentis de h1).
 */
interface HouseDef {
  id: HouseId;
  spec: HouseSpec;
  rot: Rot;
  extra?: (o: { cut: boolean; frame: number }) => { quads?: Quad[]; local?: Quad[]; boards?: Board[]; pierce?: (q: Quad[]) => Quad[] };
  inside: (frame: number) => Board[];
  outside?: (frame: number) => Board[];
  smoke: V3[];
  pieces: string[];
}

function build(def: HouseDef, cut: boolean, frame: number): Built {
  const base = frameScene(def.spec, { cut, roof: !cut, rot: def.rot });
  const ex = def.extra?.({ cut, frame }) ?? {};
  let quads = base.quads;
  if (ex.pierce && !cut) quads = ex.pierce(quads);
  const W = toWorld(def.spec, def.rot);
  const more: Quad[] = [...(ex.quads ?? []), ...(ex.local ? W.quads(ex.local) : [])].filter((q) => !(cut && q.part.roof));
  const boards = [...base.boards, ...(ex.boards ?? []), ...(cut ? def.inside(frame) : []), ...(def.outside?.(frame) ?? [])];
  return { scene: { quads: [...quads, ...foreign(more)], boards, floor: base.floor }, smoke: def.smoke };
}

/** L'emprise au sol d'une scène (ses faces, sans hauteur) : le coin nord-ouest et la taille. */
function footprint(sc: Scene): { x0: number; y0: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of sc.quads) for (const p of [q.o, [q.o[0] + q.u[0], q.o[1] + q.u[1]], [q.o[0] + q.v[0], q.o[1] + q.v[1]], [q.o[0] + q.u[0] + q.v[0], q.o[1] + q.u[1] + q.v[1]]]) {
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
  }
  return { x0: Math.floor(x0), y0: Math.floor(y0), w: Math.ceil(x1) - Math.floor(x0), h: Math.ceil(y1) - Math.floor(y0) };
}

/** La fumée d'une maison : les points de sortie (trous de fumée, conduits) à l'écran, maison posée en o. */
export const SMOKE: Partial<Record<HouseId, (o: [number, number]) => [number, number][]>> = {};

function house(def: HouseDef): VillageHouse {
  const fp = footprint(build(def, false, 0).scene);
  const at = (o: [number, number]) => [o[0] - fp.x0, o[1] - fp.y0] as const;
  SMOKE[def.id] = (o) => { const [dx, dy] = at(o); return def.smoke.map((p) => [p[0] + dx, p[1] + dy - p[2]] as [number, number]); };
  return {
    id: def.id,
    size: [fp.w, fp.h],
    levels: 1,
    palette: PAL,
    outside: (o, frame = 0) => { const [dx, dy] = at(o); return moveScene(build(def, false, frame).scene, dx, dy); },
    inside: (o, _level = 0, frame = 0) => { const [dx, dy] = at(o); return moveScene(build(def, true, frame).scene, dx, dy); },
    pieces: def.pieces,
  };
}

/** Le repère des axes d'une maison dans sa scène posée en o (pour poser Xéros, une étiquette). */
export function axesOrigin(id: HouseId, o: [number, number]): [number, number] {
  const def = DEFS.find((d) => d.id === id)!;
  const fp = footprint(build(def, false, 0).scene);
  return [o[0] - fp.x0, o[1] - fp.y0];
}

// =====================================================================================================================
// h1. Le couvreur : la longue maison, faîtage nord-sud le long de la rue (à l'ouest), l'appentis à l'est, le foyer au sol
// =====================================================================================================================

// Repère de la maison (avant le quart de tour) : x le long du faîtage, du nord (x = 0) au sud (x = 224) ; le mur « sud » de la maison
// (y = 96) est la façade sur la rue, à l'ouest du monde ; le mur « nord » (y = 0) est le mur de derrière, à l'est, contre l'appentis.
const H1: HouseSpec = {
  L: 224, D: 96, T: 52, sill: 16, doorW: 18, innerDoorW: 16, age: 'worn', fill: 'lime', trusses: [64, 192],
  walls: [
    { side: 'S', ew: true, c: 96, posts: steps(7), out: 1, bays: ['plain', 'plain', 'window', 'door', 'plain', 'window', 'plain'] },
    { side: 'N', ew: true, c: 0, posts: steps(7), out: -1, bays: ['plain', 'plain', 'plain', 'plain', 'plain', 'plain', 'plain'] },
    { side: 'W', ew: false, c: 0, posts: steps(3), out: -1, bays: ['plain', 'plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 224, posts: steps(3), out: 1, bays: ['plain', 'window', 'plain'], ends: [true, true] },
    { ew: false, c: 64, posts: steps(3), out: 1, bays: ['plain', 'inner-door', 'plain'], ends: [true, true] },
    { ew: false, c: 192, posts: steps(3), out: 1, bays: ['plain', 'inner-door', 'plain'], ends: [true, true] },
  ],
  roof: { cover: 'thatch', pitch: 50, smoke: [128], gables: ['lime', 'lime'] },
};
const h1: HouseDef = {
  id: 'h1-couvreur', spec: H1, rot: 3,
  pieces: ['thatch-smoke-hole', 'cradle', 'thatch-bundle-stack', 'ladder'],
  // le trou de fumée au faîte, au-dessus du foyer (repère du monde : x = 48, y = 128)
  smoke: [[48, 128, 128]],
  extra: () => ({
    // l'appentis de planches contre le mur de derrière (est du monde) : 8 m sur 2,40 m, sous l'égout du chaume, de 1,90 m à 1,40 m
    local: leanTo([64, -6, 38], [64, -50, 28], [160, 0, 0], [[66, -46], [144, -46], [222, -46]], 'worn', 17),
  }),
  inside: (frame) => [
    // la chambre (nord) : le lit des parents, celui de la grand-mère, le coffre, le berceau
    prop('bed', 30, 30), prop('bed', 190, 30), prop('chest', 360, 30, 0), piece('cradle', 360, 220),
    // la salle : le foyer au milieu, la table et ses deux bancs du côté de la rue, les paillasses contre le mur est, la jarre, le tonneau
    hearth(190, 590, frame),
    prop('table', 40, 400, 1), prop('bench', 155, 405, 1), prop('stool', 50, 640),
    prop('pallet', 360, 360, 1), prop('pallet', 360, 690, 1), prop('jar', 290, 380), prop('barrel', 30, 860), prop('bucket-water', 300, 880),
    // la réserve (sud) : sacs, jarres, tonneau
    prop('sack', 40, 1000), prop('sack', 100, 1010), prop('jar', 170, 1000), prop('jar', 220, 1010), prop('barrel', 380, 990), prop('crate', 290, 1000),
    // sous l'appentis (on ne le voit que toit effacé, comme le jeu) : les bottes de chaume, l'échelle couchée
    piece('thatch-bundle-stack', 535, 400, 1), piece('thatch-bundle-stack', 535, 600, 1), piece('ladder', 640, 360, 1),
  ],
};

// =====================================================================================================================
// h3. Les vieux : la chaumière minuscule, le bois vieux, la chaux écaillée, le chaume moussu, le bûcher, le banc au soleil
// =====================================================================================================================

const H3: HouseSpec = {
  L: 96, D: 64, T: 48, sill: 16, doorW: 18, innerDoorW: 16, age: 'old', fill: 'flaking',
  walls: [
    { side: 'S', ew: true, c: 64, posts: steps(3), out: 1, bays: ['window', 'door', 'plain'] },
    { side: 'N', ew: true, c: 0, posts: steps(3), out: -1, bays: ['plain', 'window', 'plain'] },
    { side: 'W', ew: false, c: 0, posts: steps(2), out: -1, bays: ['plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 96, posts: steps(2), out: 1, bays: ['plain', 'plain'], ends: [true, true] },
  ],
  roof: { cover: 'thatch-mossy', pitch: 50, over: [12, 12], gables: ['flaking', 'flaking'], gableHole: true },
};
const h3: HouseDef = {
  id: 'h3-vieux', spec: H3, rot: 0,
  pieces: ['lime-panel-flaking', 'thatch-roof-mossy', 'spinning-wheel', 'small-table'],
  smoke: [[-2, 34, 72]],
  extra: () => ({
    // le bûcher : un appentis de planches vieilles contre le pignon ouest, 1,20 m sur 3,20 m, de 1,70 m à 1,30 m
    quads: leanTo([-6, -4, 34], [-28, -4, 26], [0, 72, 0], [[-25, 0], [-25, 64]], 'old', 23),
  }),
  inside: (frame) => [
    hearth(30, 100, frame),
    prop('bed', 250, 30, 1, 'old'), prop('chest', 150, 30, 0, 'old'),
    piece('spinning-wheel', 300, 220, 0, 'old'), piece('small-table', 150, 180, 0, 'old'),
    prop('stool', 240, 200, 0, 'old'), prop('stool', 130, 250, 0, 'old'), prop('bucket', 40, 250, 0, 'old'),
  ],
  outside: () => [
    // le bois menu sous le bûcher, le banc contre la façade, au soleil
    prop('faggot', -120, 20, 1), prop('faggot', -122, 150, 1), prop('chopping-block', -112, 250, 0, 'old'),
    prop('bench', 270, 345, 0, 'old'),
  ],
};

// =====================================================================================================================
// h4. Le berger : la cabane de planches sous un appentis de bardeaux, sur des dés ; le parc à claies, la niche
// =====================================================================================================================

/** La cabane : 3,20 × 2,40 m entre les axes, poteaux sur dés, bardage de planches, le mur sud à 1,65 m, le nord à 2,75 m. */
const CAB = { L: 64, D: 48, zS: 33, zN: 55, sole: [2.4, 5] as [number, number] };
function cabinQuads(cut: boolean): Quad[] {
  const Q: Quad[] = [], age: Age = 'worn';
  const W = (sd: number) => aged(timber(sd), age);
  const top = (y: number) => CAB.zS + ((CAB.zN - CAB.zS) * (CAB.D - y)) / CAB.D;
  const T = part('bois', 5, 'K', 'full', { eave: true });
  const cz = (z: number, south: boolean) => (cut && south ? Math.min(z, 14) : z);
  // les traverses basses sur les dés
  Q.push(...box(-2, CAB.L + 2, -2, 2, CAB.sole[0], CAB.sole[1], T, W(601)));
  Q.push(...box(-2, CAB.L + 2, CAB.D - 2, CAB.D + 2, CAB.sole[0], CAB.sole[1], T, W(602)));
  for (const x of [0, CAB.L]) Q.push(...box(x - 2, x + 2, 2, CAB.D - 2, CAB.sole[0], CAB.sole[1], T, W(603 + x)));
  // les poteaux
  for (const [x, y] of [[0, 0], [32, 0], [64, 0], [0, 48], [32, 48], [64, 48]]) Q.push(...box(x - 1.5, x + 1.5, y - 1.5, y + 1.5, CAB.sole[1], cz(top(y) - 2, y === 48), T, W(610 + x + y)));
  // les sablières
  if (!cut) Q.push(...box(-2, CAB.L + 2, CAB.D - 1.5, CAB.D + 1.5, CAB.zS - 3, CAB.zS, T, W(620)));
  Q.push(...box(-2, CAB.L + 2, -1.5, 1.5, CAB.zN - 3, CAB.zN, T, W(621)));
  // le bardage : planches debout clouées sur l'extérieur (1,5 px) ; le sud avec la porte et la fenêtre
  const B = part('bardage', 3, 'K', 'full', { eave: true });
  const bt = (sd: number) => aged(boardsTex(sd), age);
  const z0 = CAB.sole[0];
  // le nord
  Q.push(...box(-1.5, CAB.L + 1.5, -3, -1.5, z0, CAB.zN, B, bt(631)));
  // l'est et l'ouest, coupés à la pente
  for (const [x0, x1, sd] of [[-3, -1.5, 632], [CAB.L + 1.5, CAB.L + 3, 633]] as const) {
    const base = bt(sd);
    const tex: Tex = (s, t, c) => {
      if (c.face === 'top') return null;
      const y = c.face === 'W' ? -3 + s : c.face === 'E' ? CAB.D + 3 - s : c.face === 'N' ? -3 : CAB.D + 3;
      if (z0 + t > top(Math.max(0, Math.min(CAB.D, y))) - 1) return null;
      return base(s, t, c);
    };
    Q.push(...box(x0, x1, -3, CAB.D + 3, z0, CAB.zN, B, tex));
  }
  // le sud : la porte de planches (0,90 × 1,50) dans la première travée, la fenêtre dans la seconde
  const south = (a0: number, a1: number, b0: number, b1: number, sd: number) => {
    if (a1 - a0 < 0.5 || b1 - b0 < 0.5) return;
    const zz1 = cut ? Math.min(b1, 14) : b1;
    if (zz1 > b0) Q.push(...box(a0, a1, CAB.D + 1.5, CAB.D + 3, b0, zz1, B, bt(sd)));
  };
  south(-3, 7, z0, CAB.zS, 640); south(25, CAB.L + 3, z0, 15, 641); south(25, 38, 15, CAB.zS, 642); south(50, CAB.L + 3, 15, CAB.zS, 643);
  south(7, 25, 33 - 3, CAB.zS, 644); south(38, 50, 23, CAB.zS, 645);
  if (!cut) {
    Q.push(...box(7, 25, CAB.D + 1, CAB.D + 2, z0, 30, part('porte', 3, 'K', 'full', { eave: true }), aged(leafTex(646, 18, { latch: 'right' }), age)));
    Q.push(...box(38, 50, CAB.D + 1, CAB.D + 1.5, 15, 23, part('baie', 0, 'o', 'none'), () => 'o'));
  }
  // le tuyau du poêle : il sort par le mur est, puis monte au-dessus du pan
  const I = part('tuyau', 6, '>', 'full');
  Q.push(...box(CAB.L, CAB.L + 6, 34, 37, 26, 29, I, (_s, t, c) => (c.face === 'top' ? '(' : t > 1.5 ? ')' : '<')));
  if (!cut) Q.push(...box(CAB.L + 4, CAB.L + 7, 34, 37, 26, 64, I, (_s, _t, c) => (c.face === 'top' ? '>' : c.face === 'W' ? ')' : '<')));
  if (!cut) Q.push(...box(CAB.L + 3.5, CAB.L + 7.5, 33.5, 37.5, 63, 65, I, (_s, _t, c) => (c.face === 'top' ? '>' : ')')));
  return Q;
}
const H4: HouseSpec = { L: 64, D: 48, T: 33, sill: 15, doorW: 18, innerDoorW: 16, age: 'worn', fill: 'boards', walls: [], roof: { cover: 'shingles', pitch: 25 } };
const h4: HouseDef = {
  id: 'h4-berger', spec: H4, rot: 0,
  pieces: ['board-wall-low', 'shingle-shed-roof-low', 'hurdle', 'dog-kennel'],
  smoke: [[69.5, 35.5, 66]],
  extra: ({ cut }) => ({
    quads: [
      ...cabinQuads(cut),
      ...(cut ? [] : leanTo([-6, -8, SHED_LOW.hi], [-6, SHED_LOW.d - 8, SHED_LOW.lo], [SHED_LOW.w, 0, 0], [], 'worn', 531, 'shingles')),
    ],
    boards: [0, 32, 64].flatMap((x) => [0, 48].map((y) => { const g = propImg('footing-stone'); return placeImg(g, x - 4.5, x + 4.5, y + 3); })),
  }),
  inside: () => [
    prop('pallet', 20, 15), prop('chest', 225, 15, 0), prop('stool', 120, 150), prop('stove', 240, 150, 0),
  ],
  outside: () => [
    // le parc à claies devant la cabane, au sud-est ; la niche à l'est
    ...[0, 1, 2, 3].map((k) => piece('hurdle', 160 * k, 640)),
    ...[0, 1].map((k) => piece('hurdle', -10, 320 + 160 * k, 1)), ...[0, 1].map((k) => piece('hurdle', 630, 320 + 160 * k, 1)),
    piece('dog-kennel', 400, 120),
  ],
};
// la cabane n'a pas de mur du modèle : frameScene n'en dessine rien ; ses dés sont des images du jeu (plus haut)

// =====================================================================================================================
// h5. Les journaliers : la maison double, torchis brut sans chaux, chaume en une couche, deux foyers contre la cloison
// =====================================================================================================================

const H5: HouseSpec = {
  L: 192, D: 64, T: 48, sill: 16, doorW: 18, innerDoorW: 16, age: 'worn', fill: 'daub', threshold: false, trusses: [96],
  walls: [
    { side: 'S', ew: true, c: 64, posts: steps(6), out: 1, bays: ['window', 'door', 'plain', 'plain', 'door', 'window'] },
    { side: 'N', ew: true, c: 0, posts: steps(6), out: -1, bays: ['plain', 'plain', 'plain', 'plain', 'plain', 'plain'] },
    { side: 'W', ew: false, c: 0, posts: steps(2), out: -1, bays: ['plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 192, posts: steps(2), out: 1, bays: ['plain', 'plain'], ends: [true, true] },
    { ew: false, c: 96, posts: steps(2), out: 1, bays: ['plain', 'plain'], ends: [true, true] },
  ],
  roof: { cover: 'thatch-thin', pitch: 50, smoke: [80, 112], gables: ['daub', 'daub'] },
};
const h5: HouseDef = {
  id: 'h5-journaliers', spec: H5, rot: 0,
  pieces: ['daub-gable', 'thatch-smoke-hole'],
  smoke: [[80, 32, 88], [112, 32, 88]],
  inside: (frame) => [
    // à l'ouest, le journalier, sa femme, trois petits ; à l'est, la veuve et son grand fils
    hearth(345, 40, frame), hearth(515, 40, frame + 1),
    prop('pallet', 25, 25), prop('pallet', 25, 115), prop('pallet', 25, 205), prop('chest', 250, 235, 0), prop('bucket', 300, 160),
    prop('pallet', 735, 25), prop('pallet', 735, 115), prop('chest', 520, 235, 0), prop('bucket', 640, 160),
    prop('table', 720, 205, 0), prop('stool', 660, 230),
  ],
};

// =====================================================================================================================
// h6. Le vannier (dessinée pour un charpentier, qui n'existe pas au village : la maison reste, le foyer change) : le pignon sur la rue (à l'est), les croix de Saint-André, la porte d'atelier, les bardeaux
// =====================================================================================================================

const H6: HouseSpec = {
  L: 192, D: 96, T: 52, sill: 16, doorW: 18, innerDoorW: 16, age: 'worn', fill: 'lime', trusses: [64, 128],
  walls: [
    { side: 'S', ew: true, c: 96, posts: [0, 32, 64, 96, 128, 192], out: 1, bays: ['plain', 'window', 'door', 'window', 'twin-door'], fills: ['cross'] },
    { side: 'N', ew: true, c: 0, posts: steps(6), out: -1, bays: ['plain', 'window', 'plain', 'plain', 'plain', 'window'] },
    { side: 'W', ew: false, c: 0, posts: steps(3), out: -1, bays: ['plain', 'plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 192, posts: steps(3), out: 1, bays: ['plain', 'plain', 'plain'], ends: [true, true], fill: 'cross' },
    { ew: false, c: 64, posts: steps(3), out: 1, bays: ['plain', 'inner-door', 'plain'], ends: [true, true] },
    { ew: false, c: 128, posts: steps(3), out: 1, bays: ['plain', 'inner-door', 'plain'], ends: [true, true] },
  ],
  roof: { cover: 'shingles', pitch: 45, over: [6, 16], eave: 10, gables: ['lime', 'cross'] },
};
const H6_HEARTH = 74;
const h6: HouseDef = {
  id: 'h6-vannier', spec: H6, rot: 0,
  pieces: ['lime-cross-panel', 'lime-gable-cross', 'twin-plank-door', 'sawhorse'],
  smoke: [[H6_HEARTH + 22, 14, 134]],
  extra: ({ cut, frame }) => {
    const ch = chimney(H6_HEARTH, !cut, frame, 4);
    return { quads: ch.quads, boards: ch.boards, pierce: (q) => ch.pierce(q, 'bardeaux') };
  },
  inside: () => [
    // la chambre : le lit, la paillasse des enfants, le coffre
    prop('bed', 30, 30), prop('pallet', 30, 360), prop('chest', 200, 30, 0),
    // la salle : la table, le banc, un tabouret
    prop('table', 375, 210), prop('bench', 380, 305), prop('stool', 600, 240),
    // l'atelier : l'établi contre le mur est, le chevalet, le billot, une pièce de bois
    prop('workbench', 855, 40, 1), piece('sawhorse', 700, 250), prop('chopping-block', 700, 60), prop('crate', 700, 380),
  ],
};

// =====================================================================================================================
// h7. Le laboureur : la longère, le logis et l'étable sous un toit, l'étable en pierre brute jusqu'à 1,20 m, la gerbière
// =====================================================================================================================

const STABLE_BASE = 24;
const H7: HouseSpec = {
  L: 320, D: 128, T: 52, sill: 16, doorW: 18, innerDoorW: 16, age: 'worn', fill: 'lime', trusses: [64, 128, 224],
  walls: [
    { side: 'S', ew: true, c: 128, posts: steps(4), out: 1, bays: ['window', 'plain', 'plain', 'door'] },
    { side: 'S', ew: true, c: 128, posts: [128, 160, 224, 256, 288, 320], out: 1, bays: ['plain', 'stable-door', 'plain', 'plain', 'plain'], ends: [true, false], base: STABLE_BASE },
    { side: 'N', ew: true, c: 0, posts: steps(4), out: -1, bays: ['window', 'plain', 'plain', 'window'] },
    { side: 'N', ew: true, c: 0, posts: steps(6, 32, 128), out: -1, bays: ['plain', 'plain', 'plain', 'plain', 'plain', 'plain'], ends: [true, false], base: STABLE_BASE },
    { side: 'W', ew: false, c: 0, posts: steps(4), out: -1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 320, posts: steps(4), out: 1, bays: ['plain', 'plain', 'plain', 'plain'], ends: [true, true], base: STABLE_BASE },
    { ew: false, c: 64, posts: steps(4), out: 1, bays: ['plain', 'inner-door', 'plain', 'plain'], ends: [true, true] },
  ],
  roof: { cover: 'thatch', pitch: 45, gables: ['lime', 'loft'] },
};
const H7_HEARTH = 76;
/** Le refend de pierre entre le logis et l'étable (x = 128) : 50 cm de moellons jusqu'à la sablière, sa porte (y 84–106). */
function refend(cut: boolean): Quad[] {
  const P = part('refend', 5, '~', 'full', { eave: true });
  const z1 = 48;
  const Q: Quad[] = [];
  Q.push(...box(123, 133, 2, 84, 0, z1, P, masonry(711)), ...box(123, 133, 106, 126, 0, z1, P, masonry(712)));
  if (!cut) Q.push(...box(123, 133, 84, 106, 37, z1, P, masonry(713)), ...box(122.5, 133.5, 84, 106, 36, 39, part('linteau', 6, 'K', 'full'), timber(714)));
  return Q;
}
const h7: HouseDef = {
  id: 'h7-laboureur', spec: H7, rot: 0,
  pieces: ['manger', 'stable-door', 'dung-heap', 'lime-gable-loft', 'plough'],
  smoke: [[H7_HEARTH + 22, 14, 154]],
  extra: ({ cut, frame }) => {
    const ch = chimney(H7_HEARTH, !cut, frame, 5);
    return { quads: [...ch.quads, ...refend(cut)], boards: ch.boards, pierce: (q) => ch.pierce(q, 'chaume') };
  },
  inside: () => [
    // la chambre : deux lits, le coffre
    prop('bed', 30, 30), prop('bed', 30, 300), prop('chest', 195, 30, 0),
    // la salle : la table, le banc, la jarre, le tonneau
    prop('table', 360, 260), prop('bench', 365, 355), prop('jar', 560, 520), prop('barrel', 360, 520), prop('bucket-water', 470, 540),
    // l'étable : la mangeoire et le râtelier contre le mur nord, la litière, le foin, le seau, le fagot
    piece('manger', 700, 40), piece('manger', 980, 40), prop('hay-bale', 1300, 60), prop('hay-bale', 1300, 120, 1),
    prop('bucket-water', 1250, 460), prop('faggot', 720, 520),
  ],
  outside: () => [
    // la cour, au sud : le tas de fumier devant l'étable, la charrue sous l'avant-toit du logis
    piece('dung-heap', 1180, 790), piece('plough', 60, 690, 0),
  ],
};

// =====================================================================================================================
// h11. La guérisseuse : la chaumière basse à croupes sur perches, les herbes qui sèchent, le plessis, les ruches
// =====================================================================================================================

const H11: HouseSpec = {
  L: 96, D: 64, T: 40, sill: 14, doorW: 18, innerDoorW: 16, doorH: 30, age: 'worn', fill: 'daub', posts: 'pole', threshold: false,
  walls: [
    { side: 'S', ew: true, c: 64, posts: steps(3), out: 1, bays: ['window', 'door', 'plain'] },
    { side: 'N', ew: true, c: 0, posts: steps(3), out: -1, bays: ['plain', 'window', 'plain'] },
    { side: 'W', ew: false, c: 0, posts: steps(2), out: -1, bays: ['plain', 'plain'], ends: [true, true] },
    { side: 'E', ew: false, c: 96, posts: steps(2), out: 1, bays: ['plain', 'plain'], ends: [true, true] },
  ],
  roof: { cover: 'thatch', pitch: 50, hip: true, eave: 24, notch: [6, 62] },
};
const h11: HouseDef = {
  id: 'h11-guerisseuse', spec: H11, rot: 0,
  pieces: ['thatch-hip-roof', 'pole-post', 'pot-hook', 'cauldron', 'herb-shelf', 'mortar', 'herb-bundles', 'plessis', 'skep'],
  smoke: [[48, 32, 92]],
  inside: (frame) => [
    prop('pallet', 25, 25), piece('herb-shelf', 250, 25), prop('chest', 25, 230, 0),
    hearth(190, 120, frame), piece('cauldron', 215, 145), piece('pot-hook', 185, 120),
    piece('small-table', 340, 215), piece('mortar', 365, 215, 0, 'worn', 75), prop('candle', 395, 225, 0, 'worn', 75),
    prop('jar', 400, 30), prop('jar', 400, 90), prop('stool', 290, 230), prop('bucket-water', 120, 250),
  ],
  outside: () => {
    const z = 125;
    return [
      // les bouquets d'herbes pendus sous l'avant-toit, de part et d'autre de la porte
      piece('herb-bundles', 0, 335, 0, 'worn', z), piece('herb-bundles', 330, 335, 0, 'worn', z),
      // le jardin de simples, clos d'un plessis, au sud-ouest ; deux ruches à l'est
      ...[0, 1, 2].map((k) => piece('plessis', -200 + 160 * k, 840)), ...[0, 1].map((k) => piece('plessis', -210, 520 + 160 * k, 1)),
      piece('skep', 560, 520), piece('skep', 620, 560),
    ];
  },
};

// =====================================================================================================================
// Les maisons
// =====================================================================================================================

const DEFS: HouseDef[] = [h1, h3, h4, h5, h6, h7, h11];
export const HOUSES: VillageHouse[] = DEFS.map(house);
export { HOUSE_META, mergeScenes, moveScene, img, propDims, placed, face };
export type { Grid };
