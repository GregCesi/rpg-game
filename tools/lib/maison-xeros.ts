// La maison de Xéros, pièce par pièce, dans l'ordre où le scénario la bâtit (tools/test-maison.ts ; CONCEPTION « La maison de
// Xéros ») : des données, sans navigateur.
//
// Repère : en cm, l'origine sur l'axe du poteau nord-ouest ; les axes des poteaux tous les 1,60 m (x de 0 à 1280, y de 0 à 640).
// Chaque pièce est donnée par l'emprise visée (coin nord-ouest, largeur, profondeur ; sur la grille de 20 cm) et, quand l'aimant des
// bords ou l'affleurement au solin la déplace, la place attendue (`at`).
//
// Ce que le moteur impose, et que la liste suit :
// - le solin se pose de toute longueur sur la grille de 10 cm (chantier « maison-2 ») : continu partout où il n'y a pas d'ouverture,
//   coupé exactement à la largeur de chaque seuil ;
// - le solin a 50 cm d'épais : sa face du dehors est sur la grille au nord et à l'ouest, pas au sud ni à l'est, où l'aimant le colle
//   au bout du mur voisin ;
// - tout ce qui se pose sur le solin s'affleure à sa face du dehors (alignOnWall) : à 20 cm de l'axe, le poteau dessiné sur 40 cm y
//   tombe juste ;
// - le remplissage de 1,40 m se pose entre deux poteaux, contre leur section réelle de 20 cm (solidOf) ; il se monte, couche après
//   couche, avant les sablières (la visée prend le plus haut dessus sous l'emprise : sous une sablière, elle viserait la sablière) ;
// - une baie (l'essai validé par Grégoire) : le seuil de 120 cm, les huisseries de 15 cm posées dessus jusqu'à 2 m, la porte de 90 cm
//   entre elles, la tête de baie sur les huisseries jusqu'à la sablière, des bandes de 10 cm de remplissage entre poteau et huisserie ;
// - les cloisons sont sur la grille : leur solin de 30 cm est à 5 cm à l'ouest (au nord) de leur axe.

/** Une pièce du catalogue : un objet de props.json, ou la pièce de bois. */
export type Ref = { prop: string } | { wood: { size: string; length: number; shape: 'round' | 'half'; hewn?: number; axis: 'ew' | 'ns' | 'up' } };

export type PieceStep = {
  kind: 'piece';
  /** Le nom de la pièce, pour les assemblages et les messages. */
  name: string;
  ref: Ref;
  /** Le sens (R) : la vue de l'objet. */
  view?: number;
  /** L'emprise visée (repère des axes). */
  x: number;
  y: number;
  w: number;
  d: number;
  /** La hauteur attendue (cm). */
  z?: number;
  /** La place attendue si l'aimant ou l'affleurement la décale (repère des axes). */
  at?: [number, number];
  /** Le décalage de la souris en x (cm) par rapport au milieu de l'emprise visée. */
  aimX?: number;
  /** Crans montés (T) avant la pose. */
  up?: number;
  /** Crans descendus (G) avant la pose. */
  down?: number;
  /** La pièce (son nom) que celle-ci recouvre et remplace (`over` de props.json). */
  replaces?: string;
};

export type Step =
  | PieceStep
  | { kind: 'joint'; type: 'scarf' | 'mortise' | 'halving'; a: string; b: string }
  /** Retirer une pièce posée (clic droit) : une cale. */
  | { kind: 'remove'; name: string }
  | { kind: 'frame'; name: string };

/** Une poutre du normal équarrie (20 × 20 cm, 30 avec son contour), de cette longueur, dans ce sens. */
export const beam = (axis: 'ew' | 'ns' | 'up', length: number): Ref => ({ wood: { size: 'normal', length, shape: 'round', hewn: 12, axis } });

/** Les étapes d'un remplissage, de la première couche à la chaux. */
export const STAGES = ['staves', 'wattle', 'daub', 'lime'] as const;
type Stage = (typeof STAGES)[number];

/** Le coin nord-ouest du solin, dans le repère des axes. */
export const SILL_NW: [number, number] = [-20, -20];

/** Une travée d'un mur ou d'une cloison. */
interface Bay {
  /** Un mur est-ouest (sinon nord-sud). */
  ew: boolean;
  /** L'axe du mur (y pour un mur est-ouest, x pour un nord-sud). */
  line: number;
  /** L'axe du poteau qui commence la travée (x ou y). */
  from: number;
  /** `door` : la porte d'entrée ; `inner` : une porte intérieure ; `opening` : la baie sans porte du cagibi. */
  kind: 'panel' | 'window' | 'door' | 'inner' | 'opening';
  /** Le sens du remplissage (sa face du dehors). */
  view: number;
  /** La place du remplissage en travers du mur (y ou x de son emprise) : visée, et attendue après l'affleurement. */
  aim: number;
  across: number;
  /**
   * Une baie (chantier « maison-2 », l'essai validé par Grégoire) : de poteau à poteau, ses morceaux le long du mur : `band`, une
   * bande de remplissage de 10 cm sur la traverse ; `frame`, une huisserie de 15 cm debout sur le seuil ; `door`, la porte de 90 cm
   * sur le seuil ; `gap`, le passage de 90 cm d'une baie sans porte. Le seuil va de la première huisserie à la dernière, la tête de
   * baie aussi, posée sur elles.
   */
  layout?: ('band' | 'frame' | 'door' | 'gap')[];
  /** Une bande de la baie (par son rang) que l'aimant ne met pas dans le plan du remplissage (`across`) : sa place en travers. */
  bandAcross?: Record<number, number>;
  /** La tête de baie, si l'aimant ne la met pas dans le plan du remplissage : sa place en travers. */
  headAcross?: number;
  /** Le seuil : sa clé, sa place en travers (y ou x de son emprise) et son épaisseur. */
  sill?: { prop: string; across: number; t: number };
  /** La porte : son sens (intérieure, elle s'ouvre vers la pièce qu'elle ferme), sa place en travers (visée, attendue). */
  door?: { view: number; aim: number; across: number };
  /** Le volet, à la face du dedans : son sens (sa face du dehors vers le dedans : il s'ouvre dans la pièce), sa place en travers. */
  shutter?: { view: number; aim: number; across: number };
}

/** Les longueurs le long du mur des morceaux d'une baie (cm). */
const PART: Record<NonNullable<Bay['layout']>[number], number> = { band: 10, frame: 15, door: 90, gap: 90 };
/** La baie de 1,40 m entre deux poteaux : bande, huisserie, porte, huisserie, bande. */
const BAY: Bay['layout'] = ['band', 'frame', 'door', 'frame', 'band'];

/** Les fenêtres : au nord (cagibi, salle, atelier), au sud (coin de Xéros, salle, salle), à l'est (atelier). */
const WINDOWS_N = [160, 480, 960];
const WINDOWS_S = [0, 320, 800];

/** Toutes les travées : le tour (nord, sud, ouest, est), puis les cloisons (x = 320, x = 960, y = 320). */
function bays(): Bay[] {
  const out: Bay[] = [];
  for (let x = 0; x < 1280; x += 160) {
    out.push({ ew: true, line: 0, from: x, kind: WINDOWS_N.includes(x) ? 'window' : 'panel', view: 2, aim: -20, across: -20, shutter: { view: 0, aim: 0, across: -5 } });
  }
  for (let x = 0; x < 1280; x += 160) {
    const kind = x === 480 ? 'door' : WINDOWS_S.includes(x) ? 'window' : 'panel';
    out.push({
      ew: true, line: 640, from: x, kind, view: 0, aim: 640, across: 645,
      ...(kind === 'door' ? { layout: BAY, sill: { prop: 'threshold-stone', across: 610, t: 50 }, door: { view: 0, aim: 640, across: 640 }, bandAcross: { 1: 640, 2: 640 }, headAcross: 640 } : {}),
      shutter: { view: 2, aim: 640, across: 641 },
    });
  }
  for (let y = 0; y < 640; y += 160) out.push({ ew: false, line: 0, from: y, kind: 'panel', view: 1, aim: -20, across: -20 });
  for (let y = 0; y < 640; y += 160) {
    out.push({ ew: false, line: 1280, from: y, kind: y === 160 ? 'window' : 'panel', view: 3, aim: 1280, across: 1285, shutter: { view: 1, aim: 1280, across: 1281 } });
  }
  // les cloisons : le remplissage s'affleure à une face de leur solin (celle que choisit alignOnWall) ; à x = 320, la baie du cagibi
  // (y = 160) a sa bande au nord, au sud le remplissage de la cloison y = 320 vient jusqu'au poteau du croisement ; la porte du coin de Xéros (y = 320) commence au poteau du croisement (la traverse de la cloison
  // y = 320 n'a pas de quoi porter une bande au sud de lui) : ses deux bandes de 10 cm sont du côté sud
  const inner = (across: number) => ({ prop: 'inner-threshold-stone', across, t: 30 });
  for (let y = 0; y < 640; y += 160) {
    const kind = y === 160 ? 'opening' : y === 320 ? 'inner' : 'panel';
    const layout: Bay['layout'] = y === 160 ? ['band', 'frame', 'gap', 'frame'] : y === 320 ? ['frame', 'door', 'frame', 'band', 'band'] : undefined;
    out.push({ ew: false, line: 320, from: y, kind, view: 1, aim: 320, across: 300, ...(layout ? { layout, sill: inner(300) } : {}), door: { view: 1, aim: 300, across: 300 } });
  }
  for (let y = 0; y < 640; y += 160) {
    const kind = y === 320 ? 'inner' : 'panel';
    out.push({ ew: false, line: 960, from: y, kind, view: 3, aim: 960, across: 955, ...(kind === 'inner' ? { layout: BAY, sill: inner(940), bandAcross: { 1: 960 } } : {}), door: { view: 3, aim: 940, across: 940 } });
  }
  for (let x = 0; x < 320; x += 160) out.push({ ew: true, line: 320, from: x, kind: 'panel', view: 0, aim: 300, across: 300 });
  return out;
}

/** L'emprise d'un morceau de travée : `at` le long du mur, `len` sa longueur, `t` son épaisseur, `across` sa place en travers. */
function along(b: Bay, at: number, len: number, t: number, across: number): { x: number; y: number; w: number; d: number } {
  return b.ew ? { x: at, y: across, w: len, d: t } : { x: across, y: at, w: t, d: len };
}

/** La place attendue d'un morceau de travée (repère des axes). */
function placed(b: Bay, at: number, across: number): [number, number] {
  return b.ew ? [at, across] : [across, at];
}

/** Le nom d'une travée. */
const bayName = (b: Bay) =>
  `${b.ew ? (b.line === 0 ? 'nord' : b.line === 640 ? 'sud' : 'cloison y=320') : b.line === 0 ? 'ouest' : b.line === 1280 ? 'est' : `cloison x=${b.line}`} ${b.from}`;

/** Les morceaux d'une baie le long du mur, de poteau à poteau : leur genre, leur début, leur longueur. */
function bayParts(b: Bay): { kind: NonNullable<Bay['layout']>[number]; at: number; len: number; k: number }[] {
  let at = b.from + 10;
  const count: Record<string, number> = {};
  return b.layout!.map((kind) => {
    const part = { kind, at, len: PART[kind], k: (count[kind] = (count[kind] ?? 0) + 1) };
    at += PART[kind];
    return part;
  });
}

/** Le seuil d'une baie : de sa première huisserie à la dernière. */
function baySpan(b: Bay): [number, number] {
  const frames = bayParts(b).filter((p) => p.kind === 'frame');
  return [frames[0].at, frames.at(-1)!.at + frames.at(-1)!.len];
}

/** Le seuil d'une baie, posé avec le solin (il en est la suite). */
function baySill(b: Bay): PieceStep {
  const [from, to] = baySpan(b);
  const s = b.sill!;
  return { kind: 'piece', name: `seuil ${bayName(b)}`, ref: { prop: s.prop }, view: b.ew ? 0 : 1, ...along(b, from, to - from, s.t, s.across), z: 0 };
}

/**
 * Les pièces d'une travée à une étape (`s`) : remplissage ; ou, dans une baie, ses bandes, ses huisseries, sa porte et sa tête ;
 * `prev` : l'étape d'avant (qu'elles remplacent ; les huisseries et la porte, de bois, sont posées une fois, au lattis).
 */
function bayStage(b: Bay, s: Stage, prev?: Stage, only?: 'frame' | 'band'): PieceStep[] {
  const a = b.from;
  const name = bayName(b);
  // un morceau : `n` son nom, visé à `aimAt` le long du mur et `aimAcross` en travers, attendu à `at`, `across` ; une couche qui en
  // recouvre une autre se vise là où est celle-ci (sur son dessus)
  const part = (n: string, prop: string, view: number, len: number, aimAt: number, aimAcross: number, at: number, across: number, z = 70): PieceStep => ({
    kind: 'piece',
    name: `${s} ${n}`,
    ref: { prop },
    view,
    ...(prev ? along(b, at, len, 15, across) : along(b, aimAt, len, 15, aimAcross)),
    at: placed(b, at, across),
    z,
    ...(prev ? { replaces: `${prev} ${n}` } : {}),
  });
  if (b.kind === 'panel' || b.kind === 'window') {
    return [part(`remplissage ${name}`, `${s}-${b.kind === 'window' ? 'window-' : ''}panel`, b.view, 140, a, b.aim, a + 10, b.across)];
  }
  // une baie : ses bandes de remplissage sur la traverse ; au lattis, ses huisseries sur le seuil et sa porte entre elles ; puis la
  // tête de baie sur les huisseries (le linteau à 2 m, le remplissage jusqu'à la sablière), de la même couche que les bandes
  const out: PieceStep[] = [];
  const [from, to] = baySpan(b);
  // au lattis, d'abord les huisseries et la porte sur le seuil ; puis les bandes dans les 10 cm qui restent entre le poteau et
  // l'huisserie ; la tête de baie en dernier ; chaque morceau visé à sa place (l'aimant part du point visé)
  const near = (v: number) => v;
  const parts = bayParts(b);
  if (!prev && only !== 'band') {
    // les huisseries d'abord, la porte ensuite, entre elles
    for (const p of [...parts.filter((q) => q.kind === 'frame'), ...parts.filter((q) => q.kind !== 'frame')]) {
      if (p.kind === 'frame' && b.kind === 'inner' && p.k === 2) continue; // posée avec le seuil (innerFrame)
      if (p.kind === 'frame') out.push({ kind: 'piece', name: `huisserie ${name} (${p.k})`, ref: { prop: 'door-frame' }, view: b.view, ...along(b, near(p.at), p.len, 15, b.across), at: placed(b, p.at, b.across), z: 20 });
      if (p.kind === 'door') {
        const d = b.door!;
        out.push({ kind: 'piece', name: b.kind === 'door' ? "porte d'entrée" : `porte ${name}`, ref: { prop: b.kind === 'door' ? 'cottage-door' : 'inner-door' }, view: d.view, ...along(b, near(p.at), p.len, 5, d.aim), at: placed(b, p.at, d.across), z: 20 });
      }
    }
  }
  if (only !== 'frame') for (const p of [...parts].reverse()) if (p.kind === 'band') out.push(part(`bande ${name} (${p.k})`, `${s}-jamb`, b.view, p.len, near(p.at), b.bandAcross?.[p.k] ?? b.across, p.at, b.bandAcross?.[p.k] ?? b.across));
  // la tête de baie, sur les huisseries (au lattis, posée avec elles : avant les poteaux du rang suivant, qui offriraient leur tête à
  // la visée au-dessus du vide de la baie)
  if (prev ? true : only !== 'band') out.push(part(`tête ${name}`, `${s}-door-head`, b.view, to - from, near(from), b.headAcross ?? b.across, from, b.headAcross ?? b.across, 200));
  return out;
}

/**
 * L'huisserie sud d'une porte intérieure, posée avant la traverse qui suit son seuil : visée plus tard, la tête de cette traverse,
 * juste au sud, prendrait la visée.
 */
function innerFrame(b: Bay): PieceStep {
  const p = bayParts(b).filter((q) => q.kind === 'frame')[1];
  return { kind: 'piece', name: `huisserie ${bayName(b)} (2)`, ref: { prop: 'door-frame' }, view: b.view, ...along(b, p.at, p.len, 15, b.across), at: placed(b, p.at, b.across), z: 20 };
}

/** La maison, dans l'ordre du montage. */
export function maisonSteps(): Step[] {
  const S: Step[] = [];
  const piece = (name: string, ref: Ref, x: number, y: number, w: number, d: number, more: Partial<PieceStep> = {}) => S.push({ kind: 'piece', name, ref, x, y, w, d, ...more });
  const joint = (type: 'scarf' | 'mortise' | 'halving', a: string, b: string) => S.push({ kind: 'joint', type, a, b });
  const frame = (name: string) => S.push({ kind: 'frame', name });
  /** Un morceau de solin de cette longueur (chantier « maison-2 » : toute longueur sur la grille de 10 cm). */
  const sill = (length: number) => ({ prop: 'rough-sill-wall', length }) as Ref;
  const narrow = (length: number) => ({ prop: 'narrow-sill-wall', length }) as Ref;
  const all = bays();
  const bay = (line: number, from: number, ew = false) => all.find((b) => b.ew === ew && b.line === line && b.from === from)!;

  // Une pièce visée au sol juste au nord d'une pièce plus haute se poserait dessus (dans la projection, le point visé tombe sur son
  // dessus, à la hauteur où l'emprise glisse jusqu'à elle) : on monte du nord au sud, et chaque porte intérieure, au sol, avant ce qui
  // est au sud d'elle ; un poteau avant la porte qui est au sud de lui, sur son axe.
  const T = (name: string, axis: 'ew' | 'ns', len: number, x: number, y: number, more: Partial<PieceStep> = {}) =>
    piece(name, beam(axis, len), x, y, axis === 'ew' ? len : 30, axis === 'ew' ? 30 : len, { z: 40, ...more });
  const post = (x: number, y: number, under: string, aimX = 0) => {
    piece(`poteau ${x},${y}`, beam('up', 180), x - 20, y - 20, 40, 40, { z: 70, ...(aimX ? { aimX } : {}) });
    joint('mortise', `poteau ${x},${y}`, under);
  };

  // 1. le solin (chantier « maison-2 ») : continu partout où il n'y a pas d'ouverture, de toute longueur (grille de 10 cm), coupé
  // exactement à la largeur de chaque seuil ; 50 cm d'épais au tour (la face du dehors à 20 cm de l'axe), 30 aux cloisons. Les murs
  // est-ouest tiennent les angles ; les murs de bout et les cloisons viennent contre leur face intérieure (y 30), le solin de la cloison
  // y = 320 contre celui du mur ouest et à travers le croisement de x = 320.
  for (const x of [-20, 300, 620, 940]) piece(`solin nord ${x}`, sill(x === 940 ? 360 : 320), x, -20, x === 940 ? 360 : 320, 50, { z: 0 });
  for (const [y, len] of [[30, 300], [330, 280]]) piece(`solin ouest ${y}`, sill(len), -20, y, 50, len, { view: 1, z: 0 });
  for (const [y, len] of [[30, 300], [330, 280]]) piece(`solin est ${y}`, sill(len), 1260, y, 50, len, { view: 1, z: 0, at: [1250, y] });
  // la cloison x = 320 : du mur nord à la baie du cagibi, son seuil ; la cloison y = 320 à travers le croisement ; le seuil de la porte
  // du coin de Xéros, puis le solin jusqu'au mur sud
  piece('solin cloison x=320 nord', narrow(150), 300, 30, 30, 150, { view: 1, z: 0 });
  S.push(baySill(bay(320, 160)));
  piece('solin cloison y=320', narrow(300), 30, 300, 300, 30, { z: 0 });
  S.push(baySill(bay(320, 320)), innerFrame(bay(320, 320)));
  piece('solin cloison x=320 sud', narrow(160), 300, 450, 30, 160, { view: 1, z: 0 });
  // la cloison x = 960 : du mur nord au seuil de la porte de l'atelier, puis jusqu'au mur sud
  piece('solin cloison x=960 nord', narrow(310), 940, 30, 30, 310, { view: 1, z: 0 });
  // la traverse nord et celle de la cloison x = 960, avant la porte de l'atelier (la tête de son huisserie sud, à 2 m, prendrait la
  // visée de la traverse de la cloison, juste au nord d'elle)
  T('traverse nord 1', 'ew', 580, -20, -20);
  T('traverse nord 2', 'ew', 580, 560, -20);
  T('traverse nord 3', 'ew', 160, 1140, -20);
  joint('scarf', 'traverse nord 1', 'traverse nord 2');
  joint('scarf', 'traverse nord 2', 'traverse nord 3');
  T('traverse cloison x=960 nord', 'ns', 340, 940, 0, { z: 70 });
  joint('halving', 'traverse cloison x=960 nord', 'traverse nord 2');
  S.push(baySill(bay(960, 320)), innerFrame(bay(960, 320)));
  piece('solin cloison x=960 sud', narrow(150), 940, 460, 30, 150, { view: 1, z: 0 });
  // le mur sud, contre le bout des murs de bout ; coupé au seuil de la porte d'entrée
  // d'ouest en est, chaque morceau contre le précédent (l'aimant des bords), le seuil de la porte d'entrée à sa place dans la file
  for (const [x, len] of [[-20, 260], [240, 260]]) piece(`solin sud ${x}`, sill(len), x, 600, len, 50, { z: 0, at: [x, 610] });
  S.push({ ...baySill(bay(640, 480, true)), y: 600, at: [500, 610] });
  for (const [x, len] of [[620, 320], [940, 360]]) piece(`solin sud ${x}`, sill(len), x, 600, len, 50, { z: 0, at: [x, 610] });
  // les portes intérieures sur leur seuil, avant ce qui est au sud d'elles (dans le plan des huisseries à venir) ; elles s'ouvrent
  // vers la pièce qu'elles ferment (le coin de Xéros à l'ouest, l'atelier à l'est)
  frame('le solin, les seuils');

  // 2. les meubles, au sol, avant les murs (visés une fois les murs montés, ils se poseraient sur la sablière au sud d'eux) ; l'établi
  // de la mère, fait de nos pièces, avec ses assemblages
  S.push(...furnitureSteps());
  frame('les meubles');

  // 3. la traverse basse : des poutres couchées sur le solin, affleurées à sa face du dehors, entées ; coupée aux seuils (la traverse
  // nord est posée avec le solin)
  T('traverse ouest 1', 'ns', 240, -20, 0, { at: [-20, 10] });
  T('traverse ouest 2', 'ns', 380, -20, 240, { at: [-20, 250] });
  joint('scarf', 'traverse ouest 1', 'traverse ouest 2');
  T('traverse est 1', 'ns', 240, 1280, 0, { at: [1270, 10] });
  T('traverse est 2', 'ns', 380, 1280, 240, { at: [1270, 250] });
  joint('scarf', 'traverse est 1', 'traverse est 2');
  // les traverses des cloisons partent du mur nord : posées sur sa traverse, puis assemblées à mi-bois avec elle
  T('traverse cloison x=320 nord', 'ns', 180, 300, 0, { z: 70 });
  joint('halving', 'traverse cloison x=320 nord', 'traverse nord 1');
  T('traverse cloison y=320', 'ew', 320, 0, 300, { at: [10, 300] });
  T('traverse cloison x=320 sud', 'ns', 180, 300, 460, { at: [300, 450] });
  // la cloison x = 960 commence au seuil de la porte de l'atelier et va jusqu'à la face du dehors du mur sud ; la traverse sud passe
  // dessus, puis s'assemble à mi-bois avec elle
  T('traverse cloison x=960 sud', 'ns', 180, 940, 460);
  T('traverse sud 1', 'ew', 520, -20, 620, { at: [-20, 630] });
  T('traverse sud 2', 'ew', 380, 620, 620, { z: 70, at: [620, 630] });
  joint('halving', 'traverse sud 2', 'traverse cloison x=960 sud');
  T('traverse sud 3', 'ew', 300, 1000, 620, { at: [1000, 630] });
  joint('scarf', 'traverse sud 2', 'traverse sud 3');
  frame('la traverse basse');

  // 4. les poteaux (poutres de 1,80 m dressées sur la traverse), tous les 1,60 m, chacun tenonné dans sa traverse, rang par rang du
  // nord au sud ; et, entre deux rangs, le lattis des murs nord-sud de la travée qui vient d'être fermée
  const shutter = (b: Bay) => {
    // le volet dans la baie, à la face du dedans, son bas à l'appui (1 m du sol, retouche de Grégoire : la traverse, 70, et deux crans,
    // 1,10 m), centré sur elle
    const sh = b.shutter!;
    const [x, y, w, dd] = b.ew ? [b.from + 40, sh.aim, 60, 4] : [sh.aim, b.from + 40, 4, 60];
    piece(`volet ${bayName(b)}`, { prop: 'plank-shutter' }, x, y, w, dd, { view: sh.view, z: 110, up: 2, at: placed(b, b.from + 50, sh.across) });
  };
  const staves = (list: Bay[], only?: 'band') => {
    for (const b of list) {
      S.push(...bayStage(b, 'staves', undefined, b.layout ? only : undefined));
      if (b.kind === 'window') shutter(b);
    }
  };
  // les baies nord-sud : huisseries, porte et tête avant les poteaux du rang qui ferme leur travée ; le reste après
  const nsFrames = (from: number) => {
    for (const b of all.filter((q) => !q.ew && q.from === from && q.layout)) S.push(...bayStage(b, 'staves', undefined, 'frame'));
  };
  const nsBays = (from: number) => staves(all.filter((b) => !b.ew && b.from === from), 'band');
  for (let x = 0; x <= 1280; x += 160) post(x, 0, x < 560 ? 'traverse nord 1' : x < 1140 ? 'traverse nord 2' : 'traverse nord 3');
  for (const y of [160, 320, 480]) {
    nsFrames(y - 160);
    post(0, y, y < 250 ? 'traverse ouest 1' : 'traverse ouest 2');
    if (y === 320) post(160, 320, 'traverse cloison y=320');
    post(320, y, y === 160 ? 'traverse cloison x=320 nord' : y === 320 ? 'traverse cloison y=320' : 'traverse cloison x=320 sud', y < 480 ? -5 : 0);
    post(960, y, y < 480 ? 'traverse cloison x=960 nord' : 'traverse cloison x=960 sud', y === 320 ? -5 : 0);
    post(1280, y, y < 250 ? 'traverse est 1' : 'traverse est 2');
    nsBays(y - 160);
  }
  for (let x = 0; x <= 1280; x += 160) post(x, 640, x <= 480 ? 'traverse sud 1' : x < 1000 ? 'traverse sud 2' : 'traverse sud 3');
  nsBays(480);
  frame("l'ossature et le lattis des murs de bout et des cloisons");

  // 5. le lattis des murs est-ouest, la porte d'entrée, les volets ; puis les autres couches, chacune recouvrant la précédente
  staves(all.filter((b) => b.ew));
  frame("le lattis, la porte d'entrée, les volets");
  for (const [i, s] of STAGES.entries()) {
    if (!i) continue;
    for (const b of all) S.push(...bayStage(b, s, STAGES[i - 1]));
    frame(['', 'le clayonnage', 'le torchis', 'la chaux'][i]);
  }

  // 6. les sablières sur les poteaux et les remplissages, entées sur un poteau (chantier « maison-2 ») ; tenonnées sur les poteaux
  const P = (name: string, axis: 'ew' | 'ns', len: number, x: number, y: number, at?: [number, number]) =>
    piece(name, beam(axis, len), x, y, axis === 'ew' ? len : 30, axis === 'ew' ? 30 : len, { z: 250, ...(at ? { at } : {}) });
  // nord et sud : entées au milieu des poteaux de 480 et de 960
  for (const [row, y, at] of [['nord', -20, undefined], ['sud', 620, 630]] as const) {
    P(`sablière ${row} 1`, 'ew', 500, -20, y, at ? [-20, at] : undefined);
    P(`sablière ${row} 2`, 'ew', 480, 480, y, at ? [480, at] : undefined);
    P(`sablière ${row} 3`, 'ew', 340, 960, y, at ? [960, at] : undefined);
    joint('scarf', `sablière ${row} 1`, `sablière ${row} 2`);
    joint('scarf', `sablière ${row} 2`, `sablière ${row} 3`);
  }
  // les murs de bout et les cloisons : entés sur le poteau de 320
  for (const [n, x, ax] of [['ouest', -20, -20], ['est', 1280, 1270], ['cloison x=320', 300, 300], ['cloison x=960', 940, 940]] as const) {
    P(`sablière ${n} 1`, 'ns', 320, x, 0, [ax, 10]);
    P(`sablière ${n} 2`, 'ns', 300, x, 330, [ax, 330]);
    joint('scarf', `sablière ${n} 1`, `sablière ${n} 2`);
  }
  P('sablière cloison y=320', 'ew', 280, 0, 300, [10, 300]);
  const plate = (x: number, row: string) => `sablière ${row} ${x < 480 ? 1 : x < 960 ? 2 : 3}`;
  for (const x of [0, 320, 960, 1280]) joint('mortise', `poteau ${x},0`, plate(x, 'nord'));
  for (const x of [0, 320, 960, 1280]) joint('mortise', `poteau ${x},640`, plate(x, 'sud'));
  for (const y of [160, 320, 480]) {
    const k = y < 330 ? 1 : 2;
    joint('mortise', `poteau 0,${y}`, `sablière ouest ${k}`);
    joint('mortise', `poteau 1280,${y}`, `sablière est ${k}`);
    joint('mortise', `poteau 320,${y}`, `sablière cloison x=320 ${k}`);
    joint('mortise', `poteau 960,${y}`, `sablière cloison x=960 ${k}`);
  }
  joint('mortise', 'poteau 160,320', 'sablière cloison y=320');
  frame('les sablières');

  // 7. les fermes des cloisons : un entrait (deux poutres entées) sur la sablière de chaque cloison, entre les sablières des longs
  // murs (au-delà, le pan de toit s'y poserait)
  for (const x of [300, 940]) {
    piece(`entrait ${x} nord`, beam('ns', 240), x, 0, 30, 240, { z: 280 });
    piece(`entrait ${x} sud`, beam('ns', 380), x, 240, 30, 380, { z: 280 });
    joint('scarf', `entrait ${x} nord`, `entrait ${x} sud`);
  }
  frame('les fermes des cloisons');

  // 8. le toit : deux pans (sud, puis nord en r2) sur les sablières, chevronnés ; puis les pignons sur les sablières des murs de bout ;
  // puis le demi couvert et le plein, chacun remplaçant le précédent ; le faîtage
  const roof = [
    ['pan sud', 0, 300],
    ['pan nord', 2, -60],
  ] as const;
  const layers = ['thatch-roof-frame', 'thatch-roof-half', 'thatch-roof'];
  for (const [i, prop] of layers.entries()) {
    for (const [n, view, y] of roof) {
      // le chaume plein du pan nord : percé pour le conduit de la cheminée
      const key = prop === 'thatch-roof' && n === 'pan nord' ? 'thatch-roof-pierced' : prop;
      const was = (k: number) => `${layers[k]} ${n}`;
      // le pan nord : l'aimant le tire de 5 cm au nord (le bord de la porte du coin de Xéros, au sol, est à portée de son bord sud)
      piece(`${prop} ${n}`, { prop: key }, -40, y, 1380, prop === 'thatch-roof' ? 390 : 410, { view, z: 280, ...(n === 'pan nord' ? { at: [-40, -65] } : {}), ...(i ? { replaces: was(i - 1) } : {}) });
    }
    if (i === 0) {
      piece('pignon ouest', { prop: 'lime-gable' }, -20, 0, 15, 640, { view: 1, z: 280, at: [-20, -5] });
      piece('pignon est', { prop: 'lime-gable' }, 1280, 0, 15, 640, { view: 3, z: 280, at: [1285, -5] });
    }
    frame(['le chevronnage et le lattis, les pignons', 'le chaume à demi', 'le chaume'][i]);
  }
  piece('faîtage', { prop: 'earth-ridge' }, -40, 300, 1385, 50, { z: 725 });
  frame('le faîtage');

  // 9. la cheminée paysanne où l'on cuisine, adossée au mur nord de la salle, centrée en x = 770 (son axe d'avant, 780, n'est pas sur la
  // grille de 20 cm pour une emprise de 2,20 m, ni pour un conduit d'un mètre centré sur elle ; chantier « maison-2 »,
  // accord de Grégoire) : l'âtre (ouverture de 1,60 m, 1,50 m sous le manteau, 0,90 m de profond) ; le manteau, une poutre de 2,20 m
  // posée sur l'âtre à l'avant, linteau de l'ouverture ; la hotte de torchis sur l'âtre à 1,50 m, sa face contre le dos du manteau ; le
  // conduit (passage de 60 × 40) en cinq tronçons centrés sur la hotte, par le pan nord percé ; le couronnement, la souche à 1 m
  // au-dessus du faîte. Posée après le toit : visée, elle passe sous les pans (le mode construction ne vise pas à travers un toit).
  piece('âtre', { prop: 'stone-hearth' }, 660, 30, 220, 110, { z: 0 });
  piece('manteau', beam('ew', 220), 660, 110, 220, 30, { z: 150 });
  piece('hotte', { prop: 'chimney-hood' }, 660, 30, 220, 80, { z: 150 });
  for (let k = 0; k < 5; k++) piece(`conduit ${k + 1}`, { prop: 'chimney-flue' }, 720, 30, 100, 80, { z: 250 + 100 * k });
  piece('couronnement', { prop: 'chimney-cap' }, 700, 20, 140, 100, { z: 750 });
  // la jarre à l'est de l'âtre (posée avant lui, elle l'aimanterait de 5 cm)
  S.push({ kind: 'piece', name: 'jarre', ref: { prop: 'jar' }, x: 880, y: 30, w: 45, d: 45, z: 0 });
  frame('la cheminée : la maison finie');
  return S;
}

/** Une perche ronde (12 cm), de cette longueur, dans ce sens. */
export const pole = (axis: 'ew' | 'ns' | 'up', length: number): Ref => ({ wood: { size: 'pole', length, shape: 'round', axis } });
/** Une demi-bille du gros bois (55 cm fendu en deux), de cette longueur, dans ce sens : écorce en bas, face plane en l'air. */
export const halfLog = (axis: 'ew' | 'ns', length: number): Ref => ({ wood: { size: 'big', length, shape: 'half', axis } });

/**
 * Les meubles : dans la salle, l'atelier et la chambre de la mère ; deux sacs au cagibi. Le reste se pose sur la carte (Tiled).
 * L'établi de la mère est un meuble de nos pièces, comme un bâtiment (retouche de Grégoire) : un établi paysan, une demi-bille de 2 m,
 * face plane en haut, sur quatre pieds en perche de 60 cm emmanchés dans ses trous (le tenon et mortaise : la tête du pied sous la
 * pièce couchée) ; son plateau à un peu moins d'un mètre.
 */
export function furnitureSteps(): Step[] {
  const S: Step[] = [];
  const piece = (name: string, prop: string, x: number, y: number, w: number, d: number, more: Partial<PieceStep> = {}) =>
    S.push({ kind: 'piece', name, ref: { prop }, x, y, w, d, z: 0, ...more });
  // la table et le banc sous la fenêtre du nord (l'âtre de la cheminée, contre le mur nord de la salle, se pose avec elle, à la fin ;
  // le foyer central n'est plus) ; la jarre à l'est de l'âtre est posée avec la cheminée
  piece('table', 'table', 380, 30, 210, 90);
  piece('banc', 'bench', 380, 120, 200, 30);
  piece('sac 1', 'sack', 30, 30, 50, 40);
  piece('sac 2', 'sack', 80, 30, 50, 40);
  piece('lit', 'bed', 1000, 30, 150, 200);
  piece('coffre', 'chest', 1160, 30, 90, 50);
  const legs: [number, number][] = [
    [1180, 300],
    [1220, 300],
    [1180, 440],
    [1220, 440],
  ];
  for (const [i, [x, y]] of legs.entries()) S.push({ kind: 'piece', name: `pied d'établi ${i + 1}`, ref: pole('up', 60), x, y, w: 25, d: 25, z: 0 });
  S.push({ kind: 'piece', name: "plateau d'établi", ref: halfLog('ns', 200), x: 1180, y: 280, w: 65, d: 200, z: 60 });
  for (let i = 1; i <= 4; i++) S.push({ kind: 'joint', type: 'mortise', a: `pied d'établi ${i}`, b: "plateau d'établi" });
  return S;
}
