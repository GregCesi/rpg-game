// La maison de Xéros, pièce par pièce, dans l'ordre où le scénario la bâtit (tools/test-maison.ts ; CONCEPTION « La maison de
// Xéros ») : des données, sans navigateur.
//
// Repère : en cm, l'origine sur l'axe du poteau nord-ouest ; les axes des poteaux tous les 1,60 m (x de 0 à 1280, y de 0 à 640).
// Chaque pièce est donnée par l'emprise visée (coin nord-ouest, largeur, profondeur ; sur la grille de 20 cm) et, quand l'aimant des
// bords ou l'affleurement au solin la déplace, la place attendue (`at`).
//
// Ce que le moteur impose, et que la liste suit :
// - le solin est fait de morceaux de 1,60 m : un mur de 13,20 m (12,80 entre axes et deux fois 20 cm) ou de 5,80 m entre deux murs
//   ne s'en remplit pas ; il reste des trous (40 cm au nord, que le solin de la cloison est comble ; 40 cm de part et d'autre du seuil ;
//   un mètre à l'ouest et à l'est), que la traverse basse enjambe ;
// - le solin a 50 cm d'épais : sa face du dehors est sur la grille au nord et à l'ouest, pas au sud ni à l'est, où l'aimant le colle
//   à un bord voisin (une dalle sert de cale au sud, retirée aussitôt) ;
// - tout ce qui se pose sur le solin s'affleure à sa face du dehors (alignOnWall) : à 20 cm de l'axe, le poteau dessiné sur 40 cm y
//   tombe juste ;
// - le remplissage de 1,40 m se pose entre deux poteaux, contre leur section réelle de 20 cm (solidOf) ; il se monte, couche après
//   couche, avant les sablières (la visée prend le plus haut dessus sous l'emprise : sous une sablière, elle viserait la sablière) ;
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
  /** `opening` : une baie sans porte (le cagibi), entre deux jambages, sous un linteau. */
  kind: 'panel' | 'window' | 'door' | 'inner' | 'opening';
  /** Le sens du remplissage (sa face du dehors). */
  view: number;
  /** La place du remplissage en travers du mur (y ou x de son emprise) : visée, et attendue après l'affleurement. */
  aim: number;
  across: number;
  /** Les jambages d'une travée de porte, s'ils ne sont pas à `across` (sans solin dessous, rien ne les affleure) : leur place en
   * travers ; et la visée en travers du second (`jambAim`), si elle diffère. */
  jambs?: [number, number];
  jambAim?: number;
  /** La place le long du mur du second jambage, s'il ne vient pas contre le poteau (la baie du cagibi : sur la grille). */
  jamb2At?: number;
  /** La porte : son sens (intérieure, elle s'ouvre vers la pièce qu'elle ferme), sa place en travers (visée, attendue). */
  door?: { view: number; aim: number; across: number };
  /** Le volet, à la face du dedans : son sens (sa face du dehors vers le dedans : il s'ouvre dans la pièce), sa place en travers. */
  shutter?: { view: number; aim: number; across: number };
}

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
    out.push({ ew: true, line: 640, from: x, kind, view: 0, aim: 640, across: 645, door: { view: 0, aim: 640, across: 640 }, jambs: [645, 640], shutter: { view: 2, aim: 640, across: 641 } });
  }
  for (let y = 0; y < 640; y += 160) out.push({ ew: false, line: 0, from: y, kind: 'panel', view: 1, aim: -20, across: -20 });
  for (let y = 0; y < 640; y += 160) {
    out.push({ ew: false, line: 1280, from: y, kind: y === 160 ? 'window' : 'panel', view: 3, aim: 1280, across: 1285, shutter: { view: 1, aim: 1280, across: 1281 } });
  }
  // les cloisons : le remplissage s'affleure à une face de leur solin (celle que choisit alignOnWall)
  for (let y = 0; y < 640; y += 160) {
    // la baie du cagibi (y = 160) : ses jambages de 25 cm, l'aimant les colle 5 cm à l'ouest de l'axe
    const jambs: [number, number] = y === 320 ? [320, 315] : y === 160 ? [315, 320] : [320, 320];
    out.push({ ew: false, line: 320, from: y, kind: y === 160 ? 'opening' : y === 320 ? 'inner' : 'panel', view: 1, aim: 320, across: 315, jambs, ...(y === 320 ? { jambAim: 300 } : {}), ...(y === 160 ? { jamb2At: 280 } : {}), door: { view: 1, aim: 320, across: 320 } });
  }
  for (let y = 0; y < 640; y += 160) {
    out.push({ ew: false, line: 960, from: y, kind: y === 320 ? 'inner' : 'panel', view: 3, aim: 960, across: 950, jambs: [960, 950], door: { view: 3, aim: 960, across: 960 } });
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

/** Les pièces d'une travée à une étape (`s`) : remplissage, ou jambages ; `prev` : l'étape d'avant (qu'elles remplacent). */
function bayStage(b: Bay, s: Stage, prev?: Stage): PieceStep[] {
  const a = b.from;
  const name = bayName(b);
  // un morceau : `n` son nom, visé à `aimAt` le long du mur et `aimAcross` en travers, attendu à `at`, `across` ; une couche qui en
  // recouvre une autre se vise là où est celle-ci (sur son dessus)
  const part = (n: string, prop: string, view: number, len: number, aimAt: number, aimAcross: number, at: number, across: number): PieceStep => ({
    kind: 'piece',
    name: `${s} ${n}`,
    ref: { prop },
    view,
    ...(prev ? along(b, at, len, 15, across) : along(b, aimAt, len, 15, aimAcross)),
    at: placed(b, at, across),
    z: 70,
    ...(prev ? { replaces: `${prev} ${n}` } : {}),
  });
  if (b.kind === 'panel' || b.kind === 'window') {
    return [part(`remplissage ${name}`, `${s}-${b.kind === 'window' ? 'window-' : ''}panel`, b.view, 140, a, b.aim, a + 10, b.across)];
  }
  // une travée de porte : jambage, porte, jambage (la porte est sa propre pièce) ; vu du dehors, le jambage de gauche est la vue r2 du
  // jambage, celui de droite r0 ; pour un mur nord-sud, le jambage au nord a son huisserie au sud (r3), au sud au nord (r1). La porte
  // d'entrée se pose avec la première couche, entre ses jambages (elle s'aimante au premier, le second à elle) ; les portes
  // intérieures, sur la grille, sont posées avec le solin.
  // la baie sans porte du cagibi : les jambages de 25 cm de la porte d'entrée, un passage de 85 cm (le second jambage sur la grille ;
  // une porte intérieure : jambages de 30 cm, 80 de passage)
  const wide = b.kind === 'door' || b.kind === 'opening';
  const [jw, dw] = wide ? [25, 90] : [30, 80];
  const jamb = `${s}-${wide ? '' : 'inner-'}jamb`;
  const [v1, v2] = b.ew ? [2, 0] : [3, 1];
  const far = a + 10 + jw + dw;
  const d = b.door!;
  const door: PieceStep[] =
    b.kind === 'door' && !prev ? [{ kind: 'piece', name: "porte d'entrée", ref: { prop: 'cottage-door' }, view: d.view, x: a + 40, y: d.aim, w: dw, d: 5, z: 20, at: [a + 10 + jw, d.across] }] : [];
  return [
    part(`jambage ${name} (1)`, jamb, v1, jw, a, b.aim, a + 10, b.jambs?.[0] ?? b.across),
    ...door,
    part(`jambage ${name} (2)`, jamb, v2, jw, b.kind === 'door' ? far - 5 : far, b.jambAim ?? b.aim, b.jamb2At ?? far, b.jambs?.[1] ?? b.across),
  ];
}

/** La maison, dans l'ordre du montage. */
export function maisonSteps(): Step[] {
  const S: Step[] = [];
  const piece = (name: string, ref: Ref, x: number, y: number, w: number, d: number, more: Partial<PieceStep> = {}) => S.push({ kind: 'piece', name, ref, x, y, w, d, ...more });
  const joint = (type: 'scarf' | 'mortise' | 'halving', a: string, b: string) => S.push({ kind: 'joint', type, a, b });
  const frame = (name: string) => S.push({ kind: 'frame', name });
  const sill = { prop: 'rough-sill-wall' };
  const narrow = { prop: 'narrow-sill-wall' };

  // Une pièce visée au sol juste au nord d'une pièce plus haute se poserait dessus (dans la projection, le point visé tombe sur son
  // dessus, à la hauteur où l'emprise glisse jusqu'à elle) : on monte du nord au sud, et chaque porte intérieure, au sol, avant ce qui
  // est au sud d'elle ; un poteau avant la porte qui est au sud de lui, sur son axe.
  const T = (name: string, axis: 'ew' | 'ns', len: number, x: number, y: number, more: Partial<PieceStep> = {}) =>
    piece(name, beam(axis, len), x, y, axis === 'ew' ? len : 30, axis === 'ew' ? 30 : len, { z: 40, ...more });
  const post = (x: number, y: number, under: string, aimX = 0) => {
    piece(`poteau ${x},${y}`, beam('up', 180), x - 20, y - 20, 40, 40, { z: 70, ...(aimX ? { aimX } : {}) });
    joint('mortise', `poteau ${x},${y}`, under);
  };
  const inner = { prop: 'inner-door' };

  // 1. le solin (50 cm, 40 de haut ; la face du dehors à 20 cm de l'axe), les murs est-ouest maîtres des angles. Le solin nord laisse
  // un vide de 30 cm à x = 320, que comble celui de la cloison (il part du nord), et un joint de 10 cm à l'est d'elle (l'aimant
  // l'y met : 13,20 m ne se font pas en morceaux de 1,60 m) ; tous sur la grille sauf celui-là.
  for (const x of [-20, 140]) piece(`solin nord ${x}`, sill, x, -20, 160, 50, { z: 0 });
  piece('solin cloison x=320 -20', narrow, 300, -20, 30, 160, { view: 1, z: 0 });
  for (const x of [500, 660, 820, 980, 1140]) piece(`solin nord ${x}`, sill, x, -20, 160, 50, { z: 0 });
  piece('solin nord 330', sill, 320, -20, 160, 50, { z: 0, at: [330, -20] });
  // l'est contre le bout du solin nord, puis de proche en proche ; l'ouest de même
  for (const y of [30, 190]) piece(`solin est ${y}`, sill, 1260, y, 50, 160, { view: 1, z: 0, at: [1250, y] });
  for (const y of [30, 190]) piece(`solin ouest ${y}`, sill, -20, y, 50, 160, { view: 1, z: 0 });
  piece('solin cloison x=960 30', narrow, 940, 40, 30, 160, { view: 1, z: 0, at: [950, 30] });
  // les portes intérieures, au sol (la terre battue passe dessous), dans le plan des jambages à venir ; elles s'ouvrent vers la pièce
  // qu'elles ferment (le cagibi et le coin de Xéros à l'ouest, l'atelier à l'est) ; entre celles de x = 320, la cloison y = 320 passe
  // sous le croisement
  piece('solin cloison y=320', narrow, 160, 300, 160, 30, { z: 0 });
  piece('porte cloison x=320 320', inner, 320, 360, 5, 80, { view: 1, z: 0 });
  piece('porte cloison x=960 320', inner, 960, 360, 5, 80, { view: 3, z: 0 });
  // la traverse nord, la cloison x = 960 et ses deux poteaux du nord (visé sur l'axe de la porte, le poteau du milieu tomberait sur
  // son dessus, 1,80 m plus au sud : la souris 5 cm à l'ouest)
  T('traverse nord 1', 'ew', 580, -20, -20);
  T('traverse nord 2', 'ew', 580, 560, -20);
  T('traverse nord 3', 'ew', 160, 1140, -20);
  joint('scarf', 'traverse nord 1', 'traverse nord 2');
  joint('scarf', 'traverse nord 2', 'traverse nord 3');
  T('traverse cloison x=960 nord', 'ns', 340, 940, 0, { at: [950, 10] });
  post(960, 160, 'traverse cloison x=960 nord');
  post(960, 320, 'traverse cloison x=960 nord', -5);
  // le bout sud des murs de bout et des cloisons, son bout sud à 610 cm, hors de la grille : un banc (ou un coffre) posé à côté sert
  // de cale (l'aimant colle le morceau à son bord sud), retiré aussitôt ; avant le solin sud
  const south: [string, { prop: string }, number, number, [number, number], { prop: string }][] = [
    ['solin ouest 450', sill, -20, 50, [-220, 580], { prop: 'bench' }],
    ['solin cloison x=320 450', narrow, 300, 30, [100, 580], { prop: 'bench' }],
    ['solin cloison x=960 450', narrow, 940, 30, [860, 560], { prop: 'chest' }],
    ['solin est 450', sill, 1260, 50, [1300, 580], { prop: 'bench' }],
  ];
  for (const [name, ref, x, w, [cx, cy], cale] of south) {
    const [cw, cd] = cale.prop === 'bench' ? [200, 30] : [90, 50];
    piece(`cale ${name}`, cale, cx, cy, cw, cd, { z: 0 });
    piece(name, ref, x, 460, w, 160, { view: 1, z: 0, at: [x === 1260 ? 1250 : x === 940 ? 950 : x, 450] });
    S.push({ kind: 'remove', name: `cale ${name}` });
  }
  // le solin sud contre le bout des murs de bout, puis de proche en proche ; il s'interrompt à la porte d'entrée
  for (const x of [-20, 140, 300, 1140, 980, 820, 660]) piece(`solin sud ${x}`, sill, x, 600, 160, 50, { z: 0, at: [x, 610] });
  // le seuil de pierre sous la porte d'entrée, contre un coffre de cale (son bord sud à 610 cm, la face du solin), retiré aussitôt
  piece('cale du seuil', { prop: 'chest' }, 460, 560, 90, 50, { z: 0 });
  piece('seuil', { prop: 'threshold-stone' }, 500, 600, 120, 50, { z: 0, at: [500, 610] });
  S.push({ kind: 'remove', name: 'cale du seuil' });
  frame('le solin, le seuil, les portes intérieures');

  // 2. les meubles, au sol, avant les murs (visés une fois les murs montés, ils se poseraient sur la sablière au sud d'eux) ; l'établi
  // de la mère, fait de nos pièces, avec ses assemblages
  S.push(...furnitureSteps());
  frame('les meubles');

  // 3. la traverse basse : des poutres couchées sur le solin, affleurées à sa face du dehors, entées ; coupée aux portes
  T('traverse ouest 1', 'ns', 240, -20, 0, { at: [-20, 10] });
  T('traverse ouest 2', 'ns', 380, -20, 240, { at: [-20, 250] });
  joint('scarf', 'traverse ouest 1', 'traverse ouest 2');
  T('traverse est 1', 'ns', 240, 1280, 0, { at: [1270, 10] });
  T('traverse est 2', 'ns', 380, 1280, 240, { at: [1270, 250] });
  joint('scarf', 'traverse est 1', 'traverse est 2');
  T('traverse cloison x=320 nord', 'ns', 180, 300, 0, { at: [300, 10] });
  // la cloison y = 320 jusqu'au croisement, la traverse de x = 320 posée dessus puis à mi-bois
  T('traverse cloison y=320', 'ew', 320, 0, 300, { at: [10, 300] });
  T('traverse cloison x=320 milieu', 'ns', 80, 300, 280, { z: 70 });
  joint('halving', 'traverse cloison x=320 milieu', 'traverse cloison y=320');
  T('traverse cloison x=320 sud', 'ns', 180, 300, 460, { at: [300, 450] });
  T('traverse cloison x=960 sud', 'ns', 180, 940, 460, { at: [950, 450] });
  T('traverse sud 1', 'ew', 520, -20, 620, { at: [-20, 630] });
  T('traverse sud 2', 'ew', 380, 620, 620, { at: [620, 630] });
  T('traverse sud 3', 'ew', 300, 1000, 620, { at: [1000, 630] });
  joint('scarf', 'traverse sud 2', 'traverse sud 3');
  frame('la traverse basse');

  // 4. les poteaux (poutres de 1,80 m dressées sur la traverse), tous les 1,60 m, chacun tenonné dans sa traverse, rang par rang du
  // nord au sud ; et, entre deux rangs, les palançons des murs nord-sud de la travée qui vient d'être fermée (le jambage sud d'une
  // travée de porte, visé une fois dressé le poteau du rang d'après, tomberait sur sa tête, juste au sud dans la projection)
  const all = bays();
  const shutter = (b: Bay) => {
    // le volet dans la baie, à la face du dedans, son bas à l'appui (80 cm du sol : la traverse, 70, et un cran), centré sur elle
    const sh = b.shutter!;
    const [x, y, w, dd] = b.ew ? [b.from + 40, sh.aim, 60, 4] : [sh.aim, b.from + 40, 4, 60];
    piece(`volet ${bayName(b)}`, { prop: 'plank-shutter' }, x, y, w, dd, { view: sh.view, z: 90, up: 1, at: placed(b, b.from + 50, sh.across) });
  };
  // le linteau de la baie sans porte : une poutre de 1,20 m contre la face du cagibi, posée sur la traverse basse (70 cm) et montée de six
  // crans, sa base à 1,90 m (au-dessus d'un homme, sous les 2,40 m d'un linteau : l'intérieur y voit un passage entre deux pièces,
  // CONCEPTION « Les intérieurs ») ; elle ne peut pas traverser les jambages (deux pièces ne se recouvrent pas)
  const lintel = (b: Bay) => piece(`linteau ${bayName(b)}`, beam('ns', 120), 280, b.from + 20, 30, 120, { z: 190, up: 6 });
  const staves = (list: Bay[]) => {
    for (const b of list) {
      S.push(...bayStage(b, 'staves'));
      if (b.kind === 'window') shutter(b);
      if (b.kind === 'opening') lintel(b);
    }
  };
  const nsBays = (from: number) => staves(all.filter((b) => !b.ew && b.from === from));
  for (let x = 0; x <= 1280; x += 160) post(x, 0, x < 560 ? 'traverse nord 1' : x < 1140 ? 'traverse nord 2' : 'traverse nord 3');
  for (const y of [160, 320, 480]) {
    post(0, y, y < 250 ? 'traverse ouest 1' : 'traverse ouest 2');
    if (y === 320) post(160, 320, 'traverse cloison y=320');
    post(320, y, y === 160 ? 'traverse cloison x=320 nord' : y === 320 ? 'traverse cloison x=320 milieu' : 'traverse cloison x=320 sud', y < 480 ? -5 : 0);
    if (y === 480) post(960, 480, 'traverse cloison x=960 sud');
    post(1280, y, y < 250 ? 'traverse est 1' : 'traverse est 2');
    nsBays(y - 160);
  }
  for (let x = 0; x <= 1280; x += 160) post(x, 640, x <= 480 ? 'traverse sud 1' : x < 1000 ? 'traverse sud 2' : 'traverse sud 3');
  nsBays(480);
  frame("l'ossature et les palançons des murs de bout et des cloisons");

  // 5. les palançons des murs est-ouest, la porte d'entrée, les volets ; puis les autres couches, chacune recouvrant la précédente
  // (elle la remplace)
  staves(all.filter((b) => b.ew));
  frame("les palançons, la porte d'entrée, les volets");
  for (const [i, s] of STAGES.entries()) {
    if (!i) continue;
    for (const b of all) S.push(...bayStage(b, s, STAGES[i - 1]));
    frame(['', 'le clayonnage', 'le torchis', 'la chaux'][i]);
  }

  // 5. les sablières sur les poteaux et les remplissages, entées ; tenonnées sur les poteaux
  const P = (name: string, axis: 'ew' | 'ns', len: number, x: number, y: number, at?: [number, number]) =>
    piece(name, beam(axis, len), x, y, axis === 'ew' ? len : 30, axis === 'ew' ? 30 : len, { z: 250, ...(at ? { at } : {}) });
  P('sablière nord 1', 'ew', 580, -20, -20);
  P('sablière nord 2', 'ew', 580, 560, -20);
  P('sablière nord 3', 'ew', 160, 1140, -20);
  joint('scarf', 'sablière nord 1', 'sablière nord 2');
  joint('scarf', 'sablière nord 2', 'sablière nord 3');
  P('sablière ouest 1', 'ns', 240, -20, 0, [-20, 10]);
  P('sablière ouest 2', 'ns', 380, -20, 240, [-20, 250]);
  joint('scarf', 'sablière ouest 1', 'sablière ouest 2');
  P('sablière est 1', 'ns', 240, 1280, 0, [1270, 10]);
  P('sablière est 2', 'ns', 380, 1280, 240, [1270, 250]);
  joint('scarf', 'sablière est 1', 'sablière est 2');
  P('sablière cloison x=320 1', 'ns', 240, 300, 0, [300, 10]);
  P('sablière cloison x=320 2', 'ns', 380, 300, 240, [300, 250]);
  joint('scarf', 'sablière cloison x=320 1', 'sablière cloison x=320 2');
  P('sablière cloison x=960 1', 'ns', 240, 940, 0, [940, 10]);
  P('sablière cloison x=960 2', 'ns', 380, 940, 240, [940, 250]);
  joint('scarf', 'sablière cloison x=960 1', 'sablière cloison x=960 2');
  P('sablière cloison y=320', 'ew', 280, 0, 300, [10, 300]);
  P('sablière sud 1', 'ew', 580, -20, 620, [-20, 630]);
  P('sablière sud 2', 'ew', 580, 560, 620, [560, 630]);
  P('sablière sud 3', 'ew', 160, 1140, 620, [1140, 630]);
  joint('scarf', 'sablière sud 1', 'sablière sud 2');
  joint('scarf', 'sablière sud 2', 'sablière sud 3');
  const plate = (x: number, row: string) => `sablière ${row} ${x < 560 ? 1 : x < 1140 ? 2 : 3}`;
  for (const x of [0, 320, 960, 1280]) joint('mortise', `poteau ${x},0`, plate(x, 'nord'));
  for (const x of [0, 320, 960, 1280]) joint('mortise', `poteau ${x},640`, plate(x, 'sud'));
  for (const y of [160, 320, 480]) {
    const k = y < 250 ? 1 : 2;
    joint('mortise', `poteau 0,${y}`, `sablière ouest ${k}`);
    joint('mortise', `poteau 1280,${y}`, `sablière est ${k}`);
    joint('mortise', `poteau 320,${y}`, `sablière cloison x=320 ${k}`);
    joint('mortise', `poteau 960,${y}`, `sablière cloison x=960 ${k}`);
  }
  joint('mortise', 'poteau 160,320', 'sablière cloison y=320');
  frame('les sablières');

  // 6. les fermes des cloisons : un entrait (deux poutres entées) sur la sablière de chaque cloison, entre les sablières des longs
  // murs (au-delà, le pan de toit s'y poserait)
  for (const x of [300, 940]) {
    piece(`entrait ${x} nord`, beam('ns', 240), x, 0, 30, 240, { z: 280, at: [x, 10] });
    piece(`entrait ${x} sud`, beam('ns', 380), x, 240, 30, 380, { z: 280, at: [x, 250] });
    joint('scarf', `entrait ${x} nord`, `entrait ${x} sud`);
  }
  frame('les fermes des cloisons');

  // 7. le toit : deux pans (sud, puis nord en r2) sur les sablières, chevronnés ; puis les pignons sur les sablières des murs de bout
  // (le trou de fumée à l'ouest ; l'aimant les tire de 5 cm au nord, au ras des remplissages : posés avant les pans, ils toucheraient la
  // rive basse du pan nord, qui se poserait sur eux) ; puis le demi couvert et le plein, chacun remplaçant le précédent ; le faîtage
  const roof = [
    ['pan sud', 0, 300],
    ['pan nord', 2, -60],
  ] as const;
  const layers = ['thatch-roof-frame', 'thatch-roof-half', 'thatch-roof'];
  for (const [i, prop] of layers.entries()) {
    for (const [n, view, y] of roof) {
      piece(`${prop} ${n}`, { prop }, -40, y, 1380, prop === 'thatch-roof' ? 390 : 410, { view, z: 280, ...(i ? { replaces: `${layers[i - 1]} ${n}` } : {}) });
    }
    if (i === 0) {
      piece('pignon ouest', { prop: 'lime-gable-smoke' }, -20, 0, 15, 640, { view: 1, z: 280, at: [-20, -5] });
      piece('pignon est', { prop: 'lime-gable' }, 1280, 0, 15, 640, { view: 3, z: 280, at: [1285, -5] });
    }
    frame(['le chevronnage et le lattis, les pignons', 'le chaume à demi', 'le chaume'][i]);
  }
  piece('faîtage', { prop: 'earth-ridge' }, -40, 300, 1385, 50, { z: 725 });
  frame('le faîtage : la maison finie');
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
  piece('foyer', 'hearth', 600, 280, 100, 100);
  piece('table', 'table', 540, 20, 210, 90, { at: [540, 30] });
  piece('banc', 'bench', 540, 120, 200, 30);
  piece('jarre', 'jar', 880, 20, 45, 45, { at: [880, 30] });
  piece('sac 1', 'sack', 40, 40, 50, 40, { at: [30, 30] });
  piece('sac 2', 'sack', 80, 40, 50, 40, { at: [80, 30] });
  piece('lit', 'bed', 980, 40, 150, 200, { at: [980, 30] });
  piece('coffre', 'chest', 1160, 40, 90, 50, { at: [1160, 30] });
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
