// Maquette de la chaumière (docs/maison-chaumiere.md) : la maison en données, sans Phaser ni dessin.
// Les pièces réelles couche par couche (en cm, sur la grille de 20), les éléments composés et leurs recettes, la nomenclature
// de toute la maison, ce qu'elle demande en arbres, en pierres et en heures de travail. Les masses viennent du jeu (mass.ts) ;
// les cotes, de art/proposals/chaumiere-geometry.ts. `npm run maquette` imprime tout cela ; le document en reprend les chiffres.
// Ne change pas le jeu : rien ici n'est lu par src/.

import { HOUSE } from '../../art/proposals/chaumiere-geometry';
import { itemMass, propMass, woodMass } from '../../src/content/mass';
import { partitionLengths, type Bay, type Plan } from './chaumiere-plans';

// ---------------------------------------------------------------- les briques

/** Ce qu'on compte : une brique du catalogue, une pièce de bois (forme et longueur), ou une brique qui manque encore. */
export type BrickKey = string;

/** L'état d'une brique : elle existe avec un vrai geste, avec un geste « à venir », ou elle manque. */
export type BrickState = 'geste réel' | 'geste à venir' | 'manque';

export interface Brick {
  name: string;
  /** Masse d'une unité (kg) : celle du jeu pour ce qui existe, celle du brouillon de fiche pour ce qui manque. */
  kg: number;
  state: BrickState;
  /** D'où elle vient, et par quel geste. */
  how: string;
  trade: string;
}

const beamKg = (length: number) => woodMass({ size: 'normal', shape: 'round', hewn: 12, axis: 'ew', length });
const poleKg = (length: number) => woodMass({ size: 'pole', shape: 'round', axis: 'ew', length });
const plankKg = (length: number) => woodMass({ size: 'big', shape: 'plank', axis: 'ew', length });

/** Les briques simples (une clé, une unité). Les pièces de bois se comptent à part, par forme et par longueur. */
export const BRICKS: Record<BrickKey, Brick> = {
  'big-rough-stone': { name: 'grosse pierre brute', kg: itemMass('big-rough-stone'), state: 'geste réel', how: 'ramassée et portée (E) ; la carrière ou le pierrier qui la fournit est à venir', trade: 'carrier' },
  'rubble-stone': { name: 'moellon', kg: itemMass('rubble-stone'), state: 'geste à venir', how: 'dégrossi au têtu dans une grosse pierre brute (dress-rubble)', trade: 'carrier' },
  ashlar: { name: 'pierre de taille', kg: itemMass('ashlar'), state: 'geste à venir', how: 'dressée au ciseau et au maillet dans un moellon (dress-ashlar)', trade: 'maçon' },
  'flat-stone': { name: 'pierre plate', kg: propMass('flat-stone'), state: 'geste réel', how: 'ramassée sur la berge de l’étang et portée (E)', trade: 'carrier' },
  'stone-chips': { name: 'éclats de taille (blocage)', kg: 1, state: 'geste à venir', how: 'le déchet de dress-rubble et dress-ashlar, laissé au sol', trade: 'carrier' },
  'clay-clod': { name: 'motte de terre', kg: itemMass('clay-clod'), state: 'geste à venir', how: 'creusée à la bêche au bord de l’étang (dig-clay)', trade: 'terrassier' },
  'bucket-water': { name: 'seau d’eau', kg: propMass('bucket-water'), state: 'geste à venir', how: 'puisé à l’étang (fill-bucket)', trade: 'paysan' },
  'earth-mortar': { name: 'gâchée de mortier de terre', kg: propMass('earth-mortar'), state: 'geste à venir', how: '2 mottes et un seau d’eau, gâchés à la bêche (mix-mortar)', trade: 'maçon' },
  cob: { name: 'motte de torchis', kg: itemMass('cob'), state: 'geste à venir', how: '3 mottes, une gerbe et un seau d’eau, foulés (mix-cob) : 3 mottes de torchis', trade: 'terrassier' },
  straw: { name: 'gerbe de paille', kg: itemMass('straw'), state: 'geste à venir', how: 'la paille de la moisson (aucun geste encore : achetée au paysan)', trade: 'paysan' },
  'thatch-bundle': { name: 'botte de chaume', kg: itemMass('thatch-bundle'), state: 'geste à venir', how: '3 gerbes peignées (comb-thatch)', trade: 'chaumier' },
  'wattle-rod': { name: 'baguette de clayonnage', kg: itemMass('wattle-rod'), state: 'geste à venir', how: 'parée dans une branche à la hachette (trim-rod) ; vraie source : le taillis, qui manque', trade: 'bûcheron' },
  peg: { name: 'cheville', kg: itemMass('peg'), state: 'geste réel', how: 'taillée dans un piquet sur le billot (whittle-peg), le piquet dans une branche', trade: 'charpentier' },
  'rope-tie': { name: 'lien de corde', kg: itemMass('rope-tie'), state: 'geste réel', how: 'coupé dans le rouleau sur le billot', trade: 'cordier' },
  // ce qui manque (brouillons de fiche dans le document)
  lath: { name: 'palançon', kg: 4.3, state: 'manque', how: 'fendu au coutre dans un quartier de 2 m : 12 par quartier', trade: 'fendeur' },
  withy: { name: 'hart', kg: 0.25, state: 'manque', how: 'une verge de noisetier de 1,50 m tordue à chaud ou à vert, pour lier', trade: 'bûcheron' },
  'strap-hinge': { name: 'penture et son gond', kg: 2, state: 'manque', how: 'forgée', trade: 'forgeron' },
  latch: { name: 'loquet de bois', kg: 0.3, state: 'manque', how: 'taillé au couteau (la mère)', trade: 'menuisier' },
  iris: { name: 'touffe d’iris', kg: 1, state: 'manque', how: 'arrachée au bord de l’étang, replantée sur le faîtage', trade: 'paysan' },
};

/** Une pièce de bois comptée : sa forme (poutre de 20 × 20, perche de Ø 12, planche de 3 × 25) et sa longueur. */
export type WoodKind = 'beam' | 'pole' | 'plank';
export const WOOD_NAMES: Record<WoodKind, string> = { beam: 'poutre 20 x 20', pole: 'perche 12', plank: 'planche 3 x 25' };
export const WOOD_STATE: Record<WoodKind, { state: BrickState; how: string; trade: string }> = {
  beam: { state: 'geste réel', how: 'arbre normal abattu, rondin coupé sur la grille, équarri à la doloire', trade: 'charpentier' },
  pole: { state: 'geste à venir', how: 'tirée de la flèche d’un arbre normal (pole-from-top, 3,60 m au plus) ; au-delà, le taillis qui manque', trade: 'bûcheron' },
  plank: { state: 'geste à venir', how: 'fendue au coutre dans un quartier de gros bois (rive-plank : 5 par quartier)', trade: 'fendeur' },
};
export const woodKg = (k: WoodKind, length: number) => (k === 'beam' ? beamKg(length) : k === 'pole' ? poleKg(length) : plankKg(length));

// ---------------------------------------------------------------- la recette

/** Une recette : des briques simples (clé -> nombre) et des pièces de bois (forme -> longueurs, une par pièce). */
export class Bill {
  readonly bricks = new Map<BrickKey, number>();
  readonly wood: Record<WoodKind, number[]> = { beam: [], pole: [], plank: [] };
  /** Ce qui n'est ni une brique ni une pièce : volumes et surfaces, pour les heures (m3 de maçonnerie, m2 de torchis...). */
  readonly work = new Map<string, number>();

  add(key: BrickKey, n: number): this {
    if (!BRICKS[key]) throw new Error(`maquette : brique inconnue ${key}`);
    if (n) this.bricks.set(key, (this.bricks.get(key) ?? 0) + n);
    return this;
  }
  pieces(kind: WoodKind, ...lengths: number[]): this {
    for (const l of lengths) {
      if (l % 20 || l < 60) throw new Error(`maquette : ${WOOD_NAMES[kind]} de ${l} cm hors de la grille`);
      this.wood[kind].push(l);
    }
    return this;
  }
  task(key: string, amount: number): this {
    if (amount) this.work.set(key, (this.work.get(key) ?? 0) + amount);
    return this;
  }
  merge(other: Bill, times = 1): this {
    for (const [k, n] of other.bricks) this.add(k, n * times);
    for (const k of Object.keys(this.wood) as WoodKind[]) for (let i = 0; i < times; i++) this.wood[k].push(...other.wood[k]);
    for (const [k, n] of other.work) this.task(k, n * times);
    return this;
  }
  /** Les briques et les pièces en lignes lisibles : « 6 palançon », « 2 poutre 20 x 20 de 2 m ». */
  lines(): string[] {
    const out = [...this.bricks].map(([k, n]) => (k === 'stone-chips' ? `${fmt(n)} kg d’${BRICKS[k].name}` : `${fmt(n)} ${BRICKS[k].name}`));
    for (const k of Object.keys(this.wood) as WoodKind[]) {
      const byLength = new Map<number, number>();
      for (const l of this.wood[k]) byLength.set(l, (byLength.get(l) ?? 0) + 1);
      for (const [l, n] of [...byLength].sort((a, b) => b[0] - a[0])) out.push(`${n} ${WOOD_NAMES[k]} de ${m(l)}`);
    }
    return out;
  }
}

/** Un nombre arrondi à l'unité au-dessus pour les pièces, au dixième pour le reste. */
export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace('.', ','));
export const m = (cm: number) => `${String(cm / 100).replace('.', ',')} m`;

// ---------------------------------------------------------------- règles de métier (chiffres de la maquette)

/** Volume d'une unité (m3) : le moellon (boîte), la motte (terre, torchis), une gâchée (sa matière), la botte de chaume. */
const MOELLON_BOX = 0.4 * 0.2 * 0.2;
const CLOD = 0.2 * 0.2 * 0.2;
const MORTAR_BATCH = propMass('earth-mortar') / 1900;
const BUNDLE = (Math.PI / 4) * 0.3 * 0.3 * 1.2;
/** Le moellon bosselé n'occupe que 85 % de sa boîte : le reste de l'assise est du mortier (fill de props.json). */
const MOELLON_FILL = 0.85;
/** Le blocage du milieu du solin : 60 % d'éclats, 40 % de mortier. */
const BLOCAGE_CHIPS = 0.6;
/** Remplissage : un palançon tous les 30 cm ; une baguette de 2 m tresse 1,80 m d'un rang de 2,5 cm ; torchis à 90 % du vide. */
const LATH_EVERY = 30;
const ROD_COVERS = 180 * 2.5;
const COB_FILL = 0.9;
/** Une cheminée de moellons : 75 % de pierre, 25 % de mortier. */
const MASONRY_STONE = 0.75;

/** Remplissage d'une surface de clayonnage (cm2) : palançons de 2 m, baguettes, torchis, et le travail (m2). */
function infill(area: number, b: Bill = new Bill()): Bill {
  const laths = Math.ceil(area / LATH_EVERY / 200);
  const rods = Math.ceil(area / ROD_COVERS);
  const cob = Math.ceil((area * HOUSE.wall * COB_FILL) / (CLOD * 1e6));
  return b.add('lath', laths).add('wattle-rod', rods).add('cob', cob).task('clayonnage m2', area / 1e4).task('torchis m2', area / 1e4);
}

// ---------------------------------------------------------------- les éléments composés

export interface ElementRecipe {
  key: string;
  name: string;
  /** Taille réelle (cm) : longueur le long du mur, épaisseur, hauteur. */
  size: string;
  bill: Bill;
  /** Où il se fait, et qui le fait. */
  station: string;
  trade: string;
  /** Masse finie (kg), pour dire ce que « posé d'un bloc » veut dire. */
  kg?: number;
}

/** Morceau de solin, par longueur (cm) : 4 assises dont 2 enterrées, deux parements de moellons, blocage. */
export function solin(length: number, courses = 4): Bill {
  const moellons = 2 * (length / 40) * courses;
  const parement = moellons * MOELLON_BOX;
  const blocage = 0.2 * (courses * 0.2) * (length / 100);
  const mortar = parement * (1 - MOELLON_FILL) + blocage * (1 - BLOCAGE_CHIPS);
  return new Bill()
    .add('rubble-stone', moellons)
    .add('stone-chips', Math.round(blocage * BLOCAGE_CHIPS * 2600))
    .add('earth-mortar', Math.ceil(mortar / MORTAR_BATCH))
    .task('maçonnerie m3', parement + blocage)
    .task('rigole m3', 0.6 * 0.4 * (length / 100));
}

/** Pan plein (travée d'axe en axe, cm) : un poteau (deux demis), ses deux bouts de sablière, le remplissage. */
export function panPlein(bay: number, brace = false): Bill {
  const clear = bay - 20;
  const area = clear * 200 - (brace ? Math.hypot(clear, 200) * 20 : 0);
  const b = new Bill().pieces('beam', 200).add('peg', 2).task('assemblages', 2);
  if (brace) b.pieces('beam', Math.ceil(Math.hypot(clear, 200) / 20) * 20).add('peg', 2).task('assemblages', 2);
  return infill(area, b);
}

/** Pan avec fenêtre (travée de 2 m) : montant, appui, linteau, fenêtre de 80 × 60, volet de planches. */
export function panFenetre(): Bill {
  const area = 180 * 200 - 80 * 60 - 20 * 200 - 2 * 80 * 20;
  const b = new Bill().pieces('beam', 200, 200, 100, 100).add('peg', 2 + 6).task('assemblages', 2 + 6);
  b.pieces('plank', 80, 80, 80, 80, 100, 100).add('peg', 8).add('strap-hinge', 2).task('volet', 1);
  return infill(area, b);
}

/** Pan avec porte (travée de 2 m) : huisserie, linteau, porte de 100 × 180 en planches, seuil de pierre de taille. */
export function panPorte(): Bill {
  const area = 60 * 200 + 100 * 40;
  const b = new Bill().pieces('beam', 200, 240, 120).add('peg', 2 + 4).task('assemblages', 2 + 4);
  b.pieces('plank', 180, 180, 180, 180, 100, 100, 140).add('peg', 12).add('strap-hinge', 2).add('latch', 1).task('porte', 1);
  // le seuil : 12 pierres de taille sur le solin abaissé (deux assises de moins sur 1,60 m, comptées par le solin)
  b.add('ashlar', 12).task('maçonnerie m3', 1.6 * 0.6 * 0.15);
  return infill(area, b);
}

/** Cloison intérieure (cm) : une sole couchée sur le sol, le remplissage jusqu'à l'entrait (2,40 m). */
export function cloison(length: number): Bill {
  const b = new Bill().pieces('beam', length <= 580 ? length : 580).add('peg', 2).task('assemblages', 2);
  return infill(length * 240, b);
}

/** Pignon : le triangle au-dessus de la sablière haute ; `chimney` : le conduit y passe (pas de poinçon, moins de torchis). */
export function pignon(chimney = false): Bill {
  const triangle = (580 * HOUSE.roof.rise) / 2;
  const potelet = 228;
  const b = new Bill().pieces('beam', 240, 240).add('peg', 4).task('assemblages', 4);
  let area = triangle - 2 * 20 * potelet;
  if (chimney) area -= HOUSE.chimney.flue * HOUSE.roof.rise;
  else {
    b.pieces('beam', 360).add('peg', 2).task('assemblages', 2);
    area -= 20 * 340;
  }
  return infill(area, b);
}

/** Couple de chevrons : deux perches de 5,60 m, l'entrait retroussé (sauf aux pignons), chevillés. */
export function couple(collar = true): Bill {
  const b = new Bill().pieces('pole', 560, 560).add('peg', collar ? 5 : 3).task('chevilles de charpente', collar ? 5 : 3);
  if (collar) b.pieces('pole', 240);
  return b;
}

/** Chaume sur une longueur de toit (cm) et un versant : lattes (baguettes), bottes, tringles (baguettes), harts. */
export function panDeToit(length: number): Bill {
  const slope = Math.hypot(HOUSE.roof.eave.y - HOUSE.roof.top.y, HOUSE.roof.top.z - HOUSE.roof.eave.zTop);
  const rows = Math.ceil(slope / 40);
  const rodsPerRow = Math.ceil(length / 180);
  const chevrons = Math.round(length / HOUSE.roof.spacing);
  const area = (length / 100) * (slope / 100);
  return new Bill()
    .add('wattle-rod', 2 * rows * rodsPerRow)
    .add('thatch-bundle', Math.ceil((area * HOUSE.roof.thatch) / 100 / BUNDLE))
    .add('withy', 2 * rows * chevrons)
    .task('lattes', rows * rodsPerRow)
    .task('chaume m2', area);
}

/** Faîtage de terre (cm) : un boudin de 2 gerbes de front, la terre (3/4 du demi-cylindre de 40 × 30), l'eau, les iris. */
export function faitage(length: number): Bill {
  const earth = 0.4 * 0.3 * 0.75 * (length / 100);
  const clods = Math.ceil(earth / CLOD);
  return new Bill()
    .add('straw', 2 * Math.ceil(length / 120))
    .add('clay-clod', clods)
    .add('bucket-water', Math.ceil(clods / 6))
    .add('iris', Math.round(length / 100))
    .task('faîtage m', length / 100);
}

/** La cheminée (plan A, au pignon est) : fondation, âtre en pierre de taille, sole de pierres plates, manteau, hotte, conduit. */
export function cheminee(): Bill {
  const c = HOUSE.chimney;
  const foot = (c.w / 100) * (c.d / 100);
  const hearth = (c.hearth.w / 100) * (c.hearth.d / 100);
  const volumes = {
    fondation: foot * 0.6,
    âtre: foot * 1.4 - hearth * 1.4,
    manteau: foot * 0.2 - 2 * 0.2 * 0.2 - hearth * 0.2,
    hotte: (1.4 * 1.0 - 0.8 * 0.5) * 1.2,
    conduit: (0.8 * 0.8 - 0.4 * 0.4) * (c.top - 300) / 100,
  };
  const masonry = Object.values(volumes).reduce((s, v) => s + v, 0);
  // parements de l'âtre en pierre de taille : les deux jambages (face et côté du feu) et le contre-cœur, 1,40 m de haut
  const ashlarFace = 2 * (0.4 + 0.6) * 1.4 + 1.2 * 1.4;
  const ashlars = Math.ceil(ashlarFace / (0.4 * 0.15));
  const stone = masonry * MASONRY_STONE - ashlars * 0.4 * 0.2 * 0.15;
  return new Bill()
    .add('rubble-stone', Math.ceil(stone / MOELLON_BOX))
    .add('ashlar', ashlars)
    .add('flat-stone', 6 + 1)
    .add('earth-mortar', Math.ceil((masonry * (1 - MASONRY_STONE)) / MORTAR_BATCH) + 2)
    .pieces('beam', 200)
    .task('maçonnerie m3', masonry)
    .task('rigole m3', foot * 0.4);
}

/** Le sol : 20 cm de terre battue sur 13,20 × 5,20 m ; la terre de la rigole d'abord, le reste en mottes d'argile. */
export function sol(spoil: number): Bill {
  const area = ((HOUSE.length - 120) / 100) * ((HOUSE.width - 120) / 100);
  const volume = area * 0.2;
  const clods = Math.ceil(Math.max(0, volume - spoil) / CLOD);
  return new Bill().add('clay-clod', clods).add('bucket-water', Math.ceil(clods / 10)).task('sol m2', area);
}

// ---------------------------------------------------------------- la maison couche par couche

export const BAYS_X = HOUSE.postsX.slice(1).map((x, i) => x - HOUSE.postsX[i]);
export const BAYS_Y = HOUSE.postsY.slice(1).map((y, i) => y - HOUSE.postsY[i]);

/** Longueur d'une pièce de bois au plus : la longueur utile de l'arbre normal. */
const TRUNK = 580;

/**
 * Les pièces d'une sablière longue (de x 20 à x 1420), coupée au droit des portes (`doors` : l'axe du poteau ouest de chaque
 * travée à porte ; la sablière basse s'arrête à sa face, reprend après l'huisserie, 130 cm plus loin). Une pièce de plus de
 * 5,80 m est coupée en deux au droit d'un poteau, avec une enture de 20 cm (10 de chaque côté de l'axe).
 */
export function plates(doors: number[] = []): number[] {
  const spans: [number, number][] = [];
  let from = 20;
  for (const d of [...doors].sort((p, q) => p - q)) {
    spans.push([from, d + 10]);
    from = d + 130;
  }
  spans.push([from, 1420]);
  const pieces: number[] = [];
  for (let [a, b] of spans) {
    while (b - a > TRUNK) {
      const post = Math.max(...HOUSE.postsX.filter((p) => p + 10 - a <= TRUNK && p > a));
      pieces.push(post + 10 - a);
      a = post - 10;
    }
    pieces.push(b - a);
  }
  return pieces;
}
/** Les sablières de pignon (de y 20 à y 620) : 4,20 m et 2 m, enturées au droit du poteau à y 430. */
export const GABLE_PLATES = [420, 200];

export interface Layer {
  name: string;
  bill: Bill;
}

/** Une travée de mur long d'après sa sorte. */
const panOf = (kind: Bay, bay: number) =>
  kind === 'angle' ? panPlein(bay, true) : kind === 'fenetre' ? panFenetre() : kind === 'porte' ? panPorte() : panPlein(bay);

/** Les couches d'un plan, du bas vers le haut. */
export function layers(plan: Plan): Layer[] {
  const perimeter = 2 * (HOUSE.length - HOUSE.solin.thick) + 2 * (HOUSE.width - HOUSE.solin.thick);
  const doorsOf = (bays: Bay[]) => bays.flatMap((k, i) => (k === 'porte' ? [HOUSE.postsX[i]] : []));
  const doors = [...doorsOf(plan.south), ...doorsOf(plan.north)];
  // solin : tout le tour, moins deux assises sur 1,60 m sous chaque porte (le seuil de pierre de taille y est posé)
  const solinBill = solin(perimeter);
  for (let i = 0; i < doors.length; i++) {
    const lowered = solin(160, 2);
    for (const [k, n] of lowered.bricks) solinBill.bricks.set(k, (solinBill.bricks.get(k) ?? 0) - n);
    solinBill.work.set('maçonnerie m3', solinBill.work.get('maçonnerie m3')! - lowered.work.get('maçonnerie m3')!);
  }

  // ossature : les quatre sablières longues (basses coupées aux portes), les quatre de pignon ; les poteaux et les décharges
  // sont comptés par les pans (un poteau par travée, la décharge dans les pans d'angle)
  const ossature = new Bill();
  const long = [plates(doorsOf(plan.south)), plates(doorsOf(plan.north)), plates(), plates()];
  for (const p of long) ossature.pieces('beam', ...p);
  for (let i = 0; i < 4; i++) ossature.pieces('beam', ...GABLE_PLATES);
  // une enture = 2 chevilles ; un mi-bois d'angle = 1 (8 : quatre angles, en bas et en haut)
  const scarfs = long.reduce((s, p) => s + p.length - 1, 0) - doors.length + 4 * (GABLE_PLATES.length - 1);
  ossature.add('peg', scarfs * 2 + 8).task('assemblages', scarfs + 8);

  const remplissage = new Bill();
  plan.south.forEach((k, i) => remplissage.merge(panOf(k, BAYS_X[i])));
  plan.north.forEach((k, i) => remplissage.merge(panOf(k, BAYS_X[i])));
  // pignon ouest : angle, plein (2,20 m), angle ; pignon est : de même, ou, plan A, la cheminée au milieu (son poteau compté)
  remplissage.merge(panPlein(BAYS_Y[0], true)).merge(panPlein(BAYS_Y[1])).merge(panPlein(BAYS_Y[2], true)).merge(pignon(false));
  remplissage.merge(panPlein(BAYS_Y[0], true)).merge(panPlein(BAYS_Y[2], true));
  if (plan.chimneyInGable) remplissage.merge(new Bill().pieces('beam', 200).add('peg', 2).task('assemblages', 2)).merge(pignon(true));
  else remplissage.merge(panPlein(BAYS_Y[1])).merge(pignon(false));

  const charpente = new Bill();
  charpente.pieces('beam', ...Array(6).fill(TRUNK)).add('peg', 12).task('assemblages', 12);
  for (let i = 0; i < HOUSE.roof.couples; i++) charpente.merge(couple(i > 0 && i < HOUSE.roof.couples - 1));
  charpente.pieces('pole', 560, 560, 400).add('peg', 4).task('chevilles de charpente', 4);
  // plan B : le conduit au faîtage coupe un couple, reporté sur ses voisins par un chevêtre (une perche de 1,20 m)
  if (!plan.chimneyInGable) charpente.pieces('pole', 120).add('peg', 2).task('chevilles de charpente', 2);

  const roofLength = HOUSE.roof.to - HOUSE.roof.from;
  const couverture = new Bill().merge(panDeToit(roofLength), 2).merge(faitage(roofLength));

  const partitions = new Bill();
  for (const l of partitionLengths(plan)) partitions.merge(cloison(l));

  const spoil = (solinBill.work.get('rigole m3') ?? 0) + 2.0 * 1.2 * 0.4;
  return [
    { name: 'solin', bill: solinBill },
    { name: 'ossature (sablières ; poteaux et décharges comptés dans les pans)', bill: ossature },
    { name: 'remplissage (pans, pignons, portes et fenêtres)', bill: remplissage },
    { name: 'charpente', bill: charpente },
    { name: 'couverture', bill: couverture },
    { name: 'cheminée', bill: cheminee() },
    { name: 'cloisons', bill: partitions },
    { name: 'sol', bill: sol(spoil) },
  ];
}

/** Les éléments composés à créer, avec leur recette (pour 1 élément). */
export function elementRecipes(): ElementRecipe[] {
  const mass = (b: Bill) => {
    let kg = 0;
    for (const [k, n] of b.bricks) if (k !== 'stone-chips') kg += BRICKS[k].kg * n;
    kg += b.bricks.get('stone-chips') ?? 0;
    for (const k of Object.keys(b.wood) as WoodKind[]) for (const l of b.wood[k]) kg += woodKg(k, l);
    return Math.round(kg);
  };
  const list: Omit<ElementRecipe, 'kg'>[] = [
    { key: 'solin', name: 'morceau de solin (2 m)', size: '200 x 60 x 80 (40 hors sol)', bill: solin(200), station: 'sur place, dans la rigole', trade: 'maçon (pierres du carrier)' },
    { key: 'pan-plein', name: 'pan de mur plein (2 m)', size: '200 x 20 x 240', bill: panPlein(200), station: 'l’aire de montage (le pan de bois à plat), levé, puis rempli en place', trade: 'charpentier, puis terrassier (torchis)' },
    { key: 'pan-angle', name: 'pan d’angle avec décharge (2 m)', size: '200 x 20 x 240', bill: panPlein(200, true), station: 'idem', trade: 'charpentier, puis terrassier' },
    { key: 'pan-fenetre', name: 'pan avec fenêtre (2 m)', size: '200 x 20 x 240, jour de 80 x 60', bill: panFenetre(), station: 'idem ; le volet à l’établi', trade: 'charpentier, menuisier (volet), forgeron (pentures)' },
    { key: 'pan-porte', name: 'pan avec porte (2 m)', size: '200 x 20 x 280, porte de 100 x 180', bill: panPorte(), station: 'idem ; la porte à l’établi', trade: 'charpentier, menuisier, maçon (seuil)' },
    { key: 'pignon', name: 'pan de pignon', size: '580 x 20 x 360 (triangle)', bill: pignon(false), station: 'en place, sur la sablière haute', trade: 'charpentier, puis terrassier' },
    { key: 'cloison', name: 'cloison (2 m)', size: '200 x 20 x 260', bill: cloison(200), station: 'en place, sous l’entrait', trade: 'terrassier' },
    { key: 'couple', name: 'couple de chevrons', size: '680 x 12 x 448 (pente de 50 degres)', bill: couple(true), station: 'à plat au sol, levé sur les sablières', trade: 'charpentier' },
    { key: 'pan-de-toit', name: 'pan de toit (2 m de long, un versant)', size: '200 x 565 (le long de la pente) x 40 de chaume', bill: panDeToit(200), station: 'sur le toit, à l’échelle', trade: 'chaumier' },
    { key: 'faitage', name: 'faîtage de terre (2 m)', size: '200 x 40 x 30', bill: faitage(200), station: 'sur le toit', trade: 'chaumier' },
    { key: 'cheminee', name: 'cheminée', size: '200 x 120 x 760 (âtre de 120 x 60 x 140)', bill: cheminee(), station: 'en place, sur sa fondation', trade: 'maçon' },
  ];
  return list.map((e) => ({ ...e, kg: mass(e.bill) }));
}

// ---------------------------------------------------------------- arbres, pierres, heures

/** Pièces de bois rangées dans des troncs de `stock` cm (le plus long d'abord) ; un reste de moins de 60 cm est perdu. */
export function pack(lengths: number[], stock: number): { trunks: number; waste: number } {
  const free: number[] = [];
  for (const l of [...lengths].sort((a, b) => b - a)) {
    const i = free.findIndex((f) => f >= l && (f - l === 0 || f - l >= 60));
    if (i >= 0) free[i] -= l;
    else free.push(stock - l);
  }
  return { trunks: free.length, waste: free.reduce((s, f) => s + f, 0) };
}

/** Ce que la maison demande à la nature, d'après sa nomenclature (`total`). */
export function resources(total: Bill) {
  const normal = pack(total.wood.beam, 580);
  // planches et palançons viennent de quartiers de gros bois de 2 m : 5 planches ou 12 palançons par quartier, 8 quartiers par gros arbre (4 m)
  const planks = pack(total.wood.plank, 200);
  const quarters = Math.ceil(planks.trunks / 5) + Math.ceil((total.bricks.get('lath') ?? 0) / 12);
  const big = Math.ceil(quarters / 8);
  // perches : une pousse de taillis de 6 m donne une perche de 5,60 m, ou deux de 2,40 m
  const poles = pack(total.wood.pole, 600);
  const rods = total.bricks.get('wattle-rod') ?? 0;
  const withies = total.bricks.get('withy') ?? 0;
  const pegs = total.bricks.get('peg') ?? 0;
  const moellons = total.bricks.get('rubble-stone') ?? 0;
  const ashlars = total.bricks.get('ashlar') ?? 0;
  const roughStones = moellons + ashlars;
  const chipsMade = roughStones * (BRICKS['big-rough-stone'].kg - BRICKS['rubble-stone'].kg) + ashlars * (BRICKS['rubble-stone'].kg - BRICKS.ashlar.kg);
  const cob = total.bricks.get('cob') ?? 0;
  const mortar = total.bricks.get('earth-mortar') ?? 0;
  const cobBatches = Math.ceil(cob / 3);
  const clods = (total.bricks.get('clay-clod') ?? 0) + 2 * mortar + 3 * cobBatches;
  const buckets = (total.bricks.get('bucket-water') ?? 0) + mortar + cobBatches;
  const bundles = total.bricks.get('thatch-bundle') ?? 0;
  const straw = (total.bricks.get('straw') ?? 0) + 3 * bundles + cobBatches;
  return {
    normal,
    planks,
    quarters,
    big,
    poles,
    rods,
    withies,
    pegs,
    branches: pegs + 0,
    roughStones,
    flatStones: total.bricks.get('flat-stone') ?? 0,
    chipsMade: Math.round(chipsMade),
    chipsNeeded: total.bricks.get('stone-chips') ?? 0,
    clods,
    buckets,
    cobBatches,
    mortar,
    bundles,
    straw,
  };
}

/**
 * Heures de travail d'un homme seul (ordre de grandeur, à corriger par Grégoire) : chaque ligne, son taux et ce qu'il compte.
 * Journée de 9 heures.
 */
export const RATES: { key: string; what: string; hours: number }[] = [
  { key: 'pierre', what: 'grosse pierre brute extraite ou ramassée, portée au chantier', hours: 0.5 },
  { key: 'moellon', what: 'moellon dégrossi au têtu', hours: 0.25 },
  { key: 'taille', what: 'pierre de taille dressée au ciseau', hours: 1.5 },
  { key: 'pierre plate', what: 'pierre plate portée', hours: 0.5 },
  { key: 'maçonnerie m3', what: 'm3 de maçonnerie montée (solin, cheminée)', hours: 8 },
  { key: 'rigole m3', what: 'm3 de rigole creusée à la bêche', hours: 2 },
  { key: 'motte', what: 'motte de terre creusée et portée', hours: 0.05 },
  { key: 'seau', what: 'seau puisé et porté', hours: 0.05 },
  { key: 'gâchée', what: 'gâchée de mortier', hours: 0.15 },
  { key: 'torchis', what: 'foulée de torchis (3 mottes)', hours: 0.25 },
  { key: 'arbre normal', what: 'arbre normal abattu, ébranché, roulé', hours: 4 },
  { key: 'équarrir m', what: 'mètre de poutre équarrie (4 faces)', hours: 1 },
  { key: 'assemblages', what: 'assemblage taillé, levé, chevillé (tenon, enture, mi-bois)', hours: 1 },
  { key: 'gros arbre', what: 'gros arbre abattu, coupé en billes de 2 m', hours: 6 },
  { key: 'quartier', what: 'quartier de 2 m fendu (coin et masse)', hours: 0.5 },
  { key: 'planche', what: 'planche fendue au coutre', hours: 0.5 },
  { key: 'palançon', what: 'palançon fendu au coutre', hours: 0.15 },
  { key: 'perche', what: 'perche de taillis coupée et parée', hours: 0.3 },
  { key: 'chevilles de charpente', what: 'cheville posée dans la charpente de perches', hours: 0.5 },
  { key: 'baguette', what: 'baguette coupée et parée', hours: 0.05 },
  { key: 'hart', what: 'hart coupée et tordue', hours: 0.05 },
  { key: 'cheville', what: 'cheville taillée (piquet, puis cheville)', hours: 0.2 },
  { key: 'gerbe', what: 'gerbe liée et portée (la paille vient de la moisson)', hours: 0.05 },
  { key: 'botte', what: 'botte de chaume peignée', hours: 0.3 },
  { key: 'clayonnage m2', what: 'm2 de clayonnage (palançons posés, baguettes tressées)', hours: 0.6 },
  { key: 'torchis m2', what: 'm2 de torchis posé des deux côtés, lissé', hours: 1.2 },
  { key: 'lattes', what: 'latte (baguette) liée sur les chevrons', hours: 0.1 },
  { key: 'chaume m2', what: 'm2 de chaume posé, battu, tringlé', hours: 1 },
  { key: 'faîtage m', what: 'mètre de faîtage de terre', hours: 1.5 },
  { key: 'porte', what: 'porte de planches', hours: 10 },
  { key: 'volet', what: 'volet de planches', hours: 5 },
  { key: 'sol m2', what: 'm2 de sol étalé, mouillé, damé', hours: 0.5 },
];
export const DAY = 9;

/** Les heures par ligne de RATES, d'après la nomenclature et ce qu'elle demande à la nature. */
export function hours(total: Bill): { key: string; what: string; count: number; hours: number }[] {
  const r = resources(total);
  const metres = total.wood.beam.reduce((s, l) => s + l, 0) / 100;
  const count: Record<string, number> = {
    pierre: r.roughStones,
    moellon: r.roughStones,
    taille: total.bricks.get('ashlar') ?? 0,
    'pierre plate': r.flatStones,
    motte: r.clods,
    seau: r.buckets,
    gâchée: r.mortar,
    torchis: r.cobBatches,
    'arbre normal': r.normal.trunks,
    'équarrir m': metres,
    'gros arbre': r.big,
    quartier: r.quarters,
    planche: r.planks.trunks,
    palançon: total.bricks.get('lath') ?? 0,
    perche: r.poles.trunks,
    baguette: r.rods,
    hart: r.withies,
    cheville: r.pegs,
    gerbe: r.straw,
    botte: r.bundles,
  };
  return RATES.map((rate) => {
    const n = count[rate.key] ?? total.work.get(rate.key) ?? 0;
    return { key: rate.key, what: rate.what, count: n, hours: n * rate.hours };
  });
}

/** La nomenclature de toute la maison pour un plan. */
export function nomenclature(plan: Plan): { layers: Layer[]; total: Bill } {
  const ls = layers(plan);
  const total = new Bill();
  for (const l of ls) total.merge(l.bill);
  return { layers: ls, total };
}
