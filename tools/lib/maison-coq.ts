// La maison du coq, pièce par pièce, dans l'ordre où le scénario la bâtit (tools/test-maison-coq.ts ; CONCEPTION « La maison du coq »,
// CADRAGE-coq.md sections 2, 3 et 12) : des données, sans navigateur.
//
// Repère : en cm, l'origine au coin nord-ouest hors œuvre ; la maison fait 1 640 × 680 (est-ouest × nord-sud). Chaque pièce est donnée
// par son emprise attendue (coin nord-ouest, largeur, profondeur) et sa hauteur ; le scénario la vise au milieu de cette emprise.
//
// Ce que le moteur impose, et que la liste suit (CADRAGE-coq.md 12.17) :
// - un mur de pierre de taille se monte assise par assise (30 cm, réponse 29), chaque assise en pans de toute longueur (grille de
//   10 cm) : au rez-de-chaussée, 8 assises de 60 cm d'épais (0 à 240) ; au-dessus, les murs nord et sud n'ont plus que 40 cm (la
//   retraite de 20 cm porte les muraillères, puis les solives et le plancher : 240-260, 260-280, 280-283), les pignons gardent 60 ;
//   l'assise 240-270, le cordon de 20 cm (270-290), 8 assises (290-530), la sablière (530-550 : réponse 28) ; les refends, 40 cm, en
//   assises de 30 de 0 à 540 ;
// - les baies sont des trous dans les assises : le jour entre deux pans (leurs bouts font les tableaux), la baie assemblée posée dans le
//   jour sur l'assise d'en dessous, le linteau posé sur les deux tableaux, les pans de son assise arrêtés à ses bouts ; une porte de
//   l'étage a sous elle un pan de dallage (on y marche, à 278) ;
// - le bois couché compte encore son contour en largeur (une planche fait 35 cm de large, une poutre 30) : les planches vont tous les
//   35 cm ; les poutres posées sur la retraite la débordent de 10 cm.

/** Une pièce du catalogue : un objet de props.json (un pan de toute longueur : `length`), ou la pièce de bois. */
export type Ref =
  | { prop: string; length?: number }
  | { wood: { size: string; length: number; shape: 'round' | 'plank'; hewn?: number; axis: 'ew' | 'ns' | 'up' } };

export type PieceStep = { kind: 'piece'; name: string; ref: Ref; view?: number; x: number; y: number; w: number; d: number; z: number };
export type Step = PieceStep | { kind: 'frame'; name: string };

/** Une poutre du normal équarrie, de cette longueur, dans ce sens (30 cm de large avec son contour, 20 de haut). */
export const beam = (axis: 'ew' | 'ns', length: number): Ref => ({ wood: { size: 'normal', length, shape: 'round', hewn: 12, axis } });
/** Une planche du gros (35 cm de large avec son contour, 3 de haut), de cette longueur, est-ouest. */
export const plank = (length: number): Ref => ({ wood: { size: 'big', length, shape: 'plank', axis: 'ew' } });

/** La maison : ses dimensions hors œuvre (cm). */
export const HOUSE = { w: 1640, d: 680 };
/** Les hauteurs (cm). */
export const LEVEL = { ground: 240, joist: 260, deck: 280, floor: 283, cordon: 270, upper: 290, arase: 530, plate: 550, ridge: 920 } as const;
/** Les refends (x de leur face ouest, 40 cm d'épais). */
export const REFENDS = [520, 780] as const;
/** Le milieu du jour des baies du mur sud, au rez-de-chaussée et à l'étage. */
export const WINDOWS = [290, 1010, 1390] as const;
/** La porte d'entrée (son jour), l'arc au-dessus (posé à 240 sur ses tableaux). */
export const DOOR = { x0: 615, x1: 725, arch: [580, 750] as [number, number] };
/**
 * Les portes des refends (y du jour) : au rez-de-chaussée, la cuisine (ouest) et la salle (est : sous le palier, la tête libre sous
 * les marches hautes) ; à l'étage, sur le palier.
 */
export const GROUND_DOORS: Record<number, [number, number]> = { 520: [300, 400], 780: [100, 200] };
/** Leurs linteaux de pierre (1,45 m), sur la grille : du nord au sud (celui de la salle contre le mur nord). */
const GROUND_LINTELS: Record<number, number> = { 520: 280, 780: 60 };
export const UPPER_DOOR: [number, number] = [100, 200];
/** L'escalier : 14 marches de 19 cm (giron 26), de la 1re (y 470-500) à la 14e (y 132-162), dans la colonne x 680-780. */
export const STAIR = { x: 680, w: 100, steps: 14, rise: 19, tread: 26, first: 470 };
/** La trémie : le trou du plancher au-dessus de l'escalier, bordé au nord et au sud par ses chevêtres. */
export const TREMIE = { x0: 680, x1: 780, y0: 145, y1: 420 };
/**
 * Les poutres du passage, posées à 240 sur les refends (une poche dans l'assise 240-270 de chaque refend) : les deux chevêtres de la
 * trémie et la poutre de rive au-dessus de l'arc de la porte, qui porte le bout sud des solives du passage.
 */
export const PASSAGE_BEAMS = [100, 420, 590] as const;

export function coqSteps(): Step[] {
  const S: Step[] = [];
  const put = (name: string, ref: Ref, x: number, y: number, w: number, d: number, z: number, view = 0) =>
    S.push({ kind: 'piece', name, ref, x, y, w, d, z, ...(view ? { view } : {}) });
  const frame = (name: string) => S.push({ kind: 'frame', name });
  const P = (prop: string, length?: number): Ref => (length ? { prop, length } : { prop });
  // le mur nord se voit par sa face du dedans (vue 2, enduite : réponse 31), le mur sud par celle du dehors (vue 0, la pierre)
  const ew = (name: string, prop: string, x0: number, x1: number, y: number, t: number, z: number) => {
    if (x1 - x0 >= 30) put(name, P(prop, x1 - x0), x0, y, x1 - x0, t, z, y === 0 ? 2 : 0);
  };
  const ns = (name: string, prop: string, y0: number, y1: number, x: number, t: number, z: number) => {
    if (y1 - y0 >= (prop.startsWith('string') ? 20 : 30)) put(name, P(prop, y1 - y0), x, y0, t, y1 - y0, z, 1);
  };
  /** Une ligne de pans coupée par des trous [a, b[. */
  const run = (along: 'ew' | 'ns', name: string, prop: string, from: number, to: number, holes: [number, number][], line: number, t: number, z: number) => {
    let a = from;
    for (const [p, q] of [...holes].sort((m, n) => m[0] - n[0])) {
      if (p > a) (along === 'ew' ? ew : ns)(`${name} ${a}`, prop, a, Math.min(p, to), line, t, z);
      a = Math.max(a, q);
    }
    if (to > a) (along === 'ew' ? ew : ns)(`${name} ${a}`, prop, a, to, line, t, z);
  };
  const jour = (cx: number): [number, number] => [cx - 50, cx + 50];
  const lintelHole = (cx: number): [number, number] => [cx - 70, cx + 75];
  const inside = (list: Step[]) => S.push(...list);

  // 1. Les murs du rez-de-chaussée : 8 assises (0 à 240), murs de 60, refends de 40 ; les portes des refends (1,80 m) et leurs
  // linteaux ; les demi-croisées dans leur jour ; la porte d'entrée. Le dedans se meuble après la première assise : une fois les murs
  // montés, la visée au sol tomberait sur leur arase ; avant elle, le premier pan du mur nord tomberait sur les meubles hauts
  for (let k = 0; k < 8; k++) {
    if (k === 0) inside(groundFloors());
    if (k === 1) {
      inside(groundInside());
      frame('le rez-de-chaussée meublé');
    }
    const z = 30 * k;
    run('ew', `mur nord ${k}`, 'ashlar-wall', 0, HOUSE.w, [], 0, 60, z);
    run('ns', `pignon ouest ${k}`, 'ashlar-wall', 60, 620, [], 0, 60, z);
    for (const x of REFENDS) {
      const [a, b] = GROUND_DOORS[x];
      // le linteau (1,45 m) déborde le jour de 20 et de 25 cm
      const holes: [number, number][] = k < 6 ? [[a, b]] : k === 6 ? [[GROUND_LINTELS[x], GROUND_LINTELS[x] + 145]] : [];
      // le linteau de la porte, posé sur ses tableaux (le haut de l'assise 5), avant les pans de son assise
      if (k === 6) put(`linteau refend ${x}`, P('window-lintel'), x, GROUND_LINTELS[x], 30, 145, 180, 1);
      run('ns', `refend ${x} ${k}`, 'ashlar-wall-40', 60, 620, holes.map(([p, q]) => [Math.max(60, p), Math.min(620, q)] as [number, number]), x, 40, z);
    }
    run('ns', `pignon est ${k}`, 'ashlar-wall', 60, 620, [], 1580, 60, z);
    const south: [number, number][] = [[DOOR.x0, DOOR.x1], ...(k >= 3 ? WINDOWS.map(jour) : [])];
    run('ew', `mur sud ${k}`, 'ashlar-wall', 0, HOUSE.w, south, 620, 60, z);
    if (k === 2) for (const cx of WINDOWS) put(`demi-croisée ${cx}`, P('half-cross-window'), cx - 50, 650, 100, 30, 90);
  }
  put("porte d'entrée", P('oak-arch-door'), DOOR.x0, 640, 110, 8, 0);
  // les volets des demi-croisées (dedans, contre le jour, pendus aux tableaux), avant le plancher qui les cacherait à la visée
  for (const cx of WINDOWS) for (const dx of [-50, 5]) put(`volet bas ${cx} ${dx}`, P('casement-shutter'), cx + dx, dx < 0 ? 647 : 644, 45, 3, 90);
  frame('le rez-de-chaussée');

  // 3. Le plancher : les linteaux et l'arc sur les tableaux (240) ; l'assise 240-270 de l'étage (les murs nord et sud de 40 : la
  // retraite) ; les muraillères sur la retraite, les poutres du passage sur les refends ; les solives (260) ; les planches (280)
  const upperRow = (name: string, prop40: string, prop60: string, z: number, south: [number, number][]) => {
    run('ew', `mur nord ${name}`, prop40, 0, HOUSE.w, [], 0, 40, z);
    run('ns', `pignon ouest ${name}`, prop60, 40, 640, [], 0, 60, z);
    run('ns', `pignon est ${name}`, prop60, 40, 640, [], 1580, 60, z);
    run('ew', `mur sud ${name}`, prop40, 0, HOUSE.w, south, 640, 40, z);
  };
  // les refends : à 240, une assise de 20 cm (le pan de cordon de 40), et les poches des poutres du passage, que les poutres remplissent
  const pockets: [number, number][] = PASSAGE_BEAMS.map((y) => [y, y + 30]);
  for (const y of PASSAGE_BEAMS) put(`poutre du passage ${y}`, beam('ew', 280), 540, y, 280, 30, 240);
  for (const x of REFENDS) run('ns', `refend ${x} 240`, 'string-course-wall-40', 40, 640, pockets, x, 40, 240);
  for (const parts of [
    [60, 520],
    [560, 780],
    [820, 1200, 1580],
  ]) {
    for (let i = 0; i + 1 < parts.length; i++) put(`muraillère nord ${parts[i]}`, beam('ew', parts[i + 1] - parts[i]), parts[i], 40, parts[i + 1] - parts[i], 30, 240);
  }
  // au sud, coupées pour qu'aucune ne soit visée au-dessus du jour d'une baie ; au sud du passage, la poutre de rive (l'arc de la
  // porte occupe la retraite)
  // chacune s'aligne sur une voisine déjà posée (la poutre de rive du passage, puis la muraillère d'à côté) : sans elle, l'aimant la
  // garderait contre le mur, hors de la retraite ; dans la cuisine de l'est à l'ouest, dans la salle de l'ouest à l'est
  for (const [a, b] of [
    [280, 520],
    [60, 280],
    [820, 1080],
    [1080, 1330],
    [1330, 1580],
  ])
    put(`muraillère sud ${a}`, beam('ew', b - a), a, 610, b - a, 30, 240);
  for (const cx of WINDOWS) put(`linteau demi-croisée ${cx}`, P('window-lintel'), cx - 70, 650, 145, 30, 240);
  upperRow('240', 'ashlar-wall-40', 'ashlar-wall', 240, [DOOR.arch, ...WINDOWS.map(lintelHole)]);
  // une solive sous le milieu de chaque planche (on la vise là) : la cuisine de 100 à 460, la planche de 4,60 m portée à moins d'un
  // quart de sa longueur de ses bouts
  for (let x = 100; x + 30 <= 520; x += 60) put(`solive ${x}`, beam('ns', 580), x, 40, 30, 580, 260);
  for (const x of [560, 620, 650]) put(`solive du passage ${x}`, beam('ns', 570), x, 40, 30, 570, 260);
  // le long du refend est, de part et d'autre de la trémie : du nord au chevêtre nord, du chevêtre sud à la poutre de rive
  put('solive du palier', beam('ns', 80), 750, 40, 30, 80, 260);
  put('solive au sud de la trémie', beam('ns', 190), 750, 420, 30, 190, 260);
  // (la solive de 1170 contre le joint des muraillères à 1200, la dernière contre le pignon)
  for (let x = 820; x + 30 <= 1580; x += 60) {
    const at = x === 1180 ? 1170 : x === 1540 ? 1550 : x === 1060 ? 1050 : x;
    put(`solive ${at}`, beam('ns', 580), at, 40, 30, 580, 260);
  }
  for (let y = 40; y + 35 <= 640; y += 35) {
    put(`planche cuisine ${y}`, plank(460), 60, y, 460, 35, 280);
    // au-dessus de l'arc de la porte (au sud de 600), pas de planche : l'arc monte jusqu'à 360
    if (y + 35 <= 600) {
      if (y + 35 <= TREMIE.y0 || y >= TREMIE.y1) put(`planche passage ${y}`, plank(220), 560, y, 220, 35, 280);
      else put(`planche passage ${y}`, plank(120), 560, y, 120, 35, 280);
    }
    put(`planche salle ouest ${y}`, plank(360), 820, y, 360, 35, 280);
    put(`planche salle est ${y}`, plank(400), 1180, y, 400, 35, 280);
  }
  // l'arc de la porte, sur ses tableaux (240), une fois les solives du passage posées (visées avant lui) : sa clef monte à 360
  put('arc de la porte', P('stone-arch'), DOOR.arch[0], 620, DOOR.arch[1] - DOOR.arch[0], 60, 240);
  // l'escalier, de la 2e à la 14e marche : chacune visée juste après la précédente (`stair.tread`), sous la trémie
  for (let i = 2; i <= STAIR.steps; i++) put(`marche ${i}`, P('stone-step'), STAIR.x, STAIR.first - STAIR.tread * (i - 1), 100, 30, STAIR.rise * (i - 1));
  frame('le plancher');

  // 4. Dedans, à l'étage, avant ses murs
  inside(upperInside());
  frame("l'étage meublé");

  // 5. Les murs de l'étage : le cordon, 8 assises (290-530) ; les refends en assises de 30 jusqu'à 540 ; les portes du palier ; les
  // croisées
  upperRow('cordon', 'string-course-wall-40', 'string-course-wall', 270, [DOOR.arch]);
  // les refends de l'étage : 9 assises de 260 à 530 ; la porte du palier sur l'assise de cordon (on marche sur son dessus, à 260 : le
  // seuil), de 260 à 440, son linteau de pierre sur elle et sur les tableaux, à 440
  for (let z = 260; z < 530; z += 30) {
    for (const x of REFENDS) {
      const [a, b] = UPPER_DOOR;
      const holes: [number, number][] = z < 440 ? [[a, b]] : z === 440 ? [[a - 20, b + 25]] : [];
      if (z === 440) {
        // le pan du nord, le linteau, puis le pan du sud (visé sur le linteau, chacun tomberait sur l'autre)
        ns(`refend ${x} ${z} 40`, 'ashlar-wall-40', 40, a - 20, x, 40, z);
        put(`linteau du palier ${x}`, P('window-lintel'), x, a - 20, 30, 145, 440, 1);
        ns(`refend ${x} ${z} ${b + 25}`, 'ashlar-wall-40', b + 25, 640, x, 40, z);
      } else run('ns', `refend ${x} ${z}`, 'ashlar-wall-40', 40, 640, holes, x, 40, z);
      if (z === 260) put(`porte du palier ${x}`, P('inner-door'), x + 20, a, 5, 90, 260, 1);
    }
  }
  for (let c = 0; c < 8; c++) {
    const z = 290 + 30 * c;
    const holes: [number, number][] = [];
    if (c <= 2) holes.push(DOOR.arch);
    if (c >= 1 && c <= 6) holes.push(...WINDOWS.map(jour));
    if (c === 7) holes.push(...WINDOWS.map(lintelHole));
    upperRow(String(z), 'ashlar-wall-40', 'ashlar-wall', z, holes);
    // sur la clef de l'arc (360), un pan de cordon de 20 cm referme l'assise 350-380
    if (c === 2) put("cordon sur l'arc", P('string-course-wall-40', DOOR.arch[1] - DOOR.arch[0]), DOOR.arch[0], 640, DOOR.arch[1] - DOOR.arch[0], 40, 360);
    if (c === 0) for (const cx of WINDOWS) put(`croisée ${cx}`, P('cross-window'), cx - 50, 650, 100, 30, 320);
    if (c === 6) for (const cx of WINDOWS) put(`linteau croisée ${cx}`, P('window-lintel'), cx - 70, 650, 145, 30, 500);
  }
  // les volets des croisées (dedans, contre le jour)
  for (const cx of WINDOWS) for (const dx of [-50, 5]) put(`volet haut ${cx} ${dx}`, P('casement-shutter'), cx + dx, 640, 45, 3, 320);
  frame("l'étage");

  // 6. Le toit : les sablières (530), les souches, les pignons découverts (530), les pans de laves (550), le faîtage (920)
  for (const [x, len] of [
    [60, 560],
    [620, 560],
    [1180, 400],
  ] as const) {
    put(`sablière nord ${x}`, beam('ew', len), x, 0, len, 30, 530);
    put(`sablière sud ${x}`, beam('ew', len), x, 640, len, 30, 530);
  }
  for (const x of [0, 1580]) put(`pignon découvert ${x}`, P('ashlar-gable'), x, 0, 60, 680, 530, 1);
  for (let i = 0; i < 4; i++) put(`conduit nord ${i}`, P('chimney-flue'), 1060, 0, 100, 80, 550 + 100 * i);
  put('couronnement nord', P('chimney-cap'), 1040, 0, 140, 100, 950);
  for (let i = 0; i < 2; i++) put(`conduit ouest ${i}`, P('chimney-flue'), 0, 300, 80, 100, 890 + 100 * i, 1);
  put('couronnement ouest', P('chimney-cap'), 0, 280, 100, 140, 1090, 1);
  put('pan sud', P('lave-roof'), 60, 340, 1520, 370, 550);
  put('pan nord', P('lave-roof-pierced'), 60, -30, 1520, 370, 550, 2);
  put('faîtage', P('lave-ridge'), 60, 310, 1520, 60, 920);
  frame('le toit');
  return S;
}

type Put = (name: string, prop: string, x: number, y: number, w: number, d: number, z: number, view?: number, length?: number) => void;
const putter = (S: Step[]): Put => (name, prop, x, y, w, d, z, view = 0, length) =>
  S.push({ kind: 'piece', name, ref: length ? { prop, length } : { prop }, x, y, w, d, z, ...(view ? { view } : {}) });

/** Le rez-de-chaussée, avant ses murs : les sols, la 1re marche, les portes des refends. */
export function groundFloors(): Step[] {
  const S: Step[] = [];
  const put = putter(S);
  // le dallage de la salle (14 rangées de 7,60 m) et du passage (la bande à l'ouest de l'escalier, puis tout le passage au sud)
  for (let y = 60; y + 40 <= 620; y += 40) put(`dallage salle ${y}`, 'flagstone-row', 820, y, 760, 40, 0, 0, 760);
  for (let y = 60; y + 40 <= 540; y += 40) put(`dallage passage ${y}`, 'flagstone-row', 560, y, 120, 40, 0, 0, 120);
  for (const y of [540, 580]) put(`dallage passage sud ${y}`, 'flagstone-row', 560, y, 220, 40, 0, 0, 220);
  // l'escalier : chaque marche sur la précédente (4 cm de recouvrement : `stair.tread`)
  // la 1re marche ; les autres après le plancher (coqSteps)
  put('marche 1', 'stone-step', STAIR.x, STAIR.first, 100, 30, 0);
  put('porte de la cuisine', 'inner-door', 540, GROUND_DOORS[520][0], 5, 90, 0, 1);
  put('porte de la salle', 'inner-door', 800, GROUND_DOORS[780][0], 5, 90, 0, 1);
  return S;
}

/** Le rez-de-chaussée meublé, après la première assise : les cheminées, les meubles. */
export function groundInside(): Step[] {
  const S: Step[] = [];
  const put = putter(S);
  // la cheminée de la salle, au mur nord
  put('jambage ouest', 'fireplace-jamb', 1060, 60, 40, 50, 8);
  put('jambage est', 'fireplace-jamb', 1260, 60, 40, 50, 8);
  put('contrecœur', 'fireback', 1120, 60, 120, 10, 8);
  put('console ouest', 'fireplace-console', 1060, 60, 40, 60, 118);
  put('console est', 'fireplace-console', 1260, 60, 40, 60, 118);
  put('manteau', 'mantel-lintel', 1060, 60, 240, 40, 148);
  // la cuisine
  put('âtre', 'stone-hearth', 60, 220, 110, 220, 0, 1);
  put('pétrin', 'kneading-trough', 260, 60, 150, 60, 0);
  put('table du ménage', 'table', 240, 380, 210, 90, 0);
  // la salle
  put('grande table ouest', 'table', 1000, 300, 210, 90, 8);
  put('grande table est', 'table', 1210, 300, 210, 90, 8);
  put('chaise du coq', 'high-chair', 1440, 325, 50, 55, 8, 3);
  put('dressoir', 'dresser', 1535, 140, 45, 100, 8, 3);
  put('coffre des comptes', 'chest', 860, 570, 90, 50, 8);
  put('verdure', 'verdure-tapestry', 1340, 60, 240, 5, 68);
  return S;
}

/** L'étage meublé : la cheminée de la chambre, la cloison, le garde-corps, les meubles. */
export function upperInside(): Step[] {
  const S: Step[] = [];
  const put = putter(S);
  put('jambage de chambre ouest', 'small-fireplace-jamb', 1100, 40, 30, 40, 283);
  put('jambage de chambre est', 'small-fireplace-jamb', 1240, 40, 30, 40, 283);
  put('linteau de chambre', 'small-fireplace-lintel', 1100, 40, 160, 30, 383);
  // la cloison de l'étage (x 1300-1315, sur la solive de 1300) : poteaux, remplissages, porte, lisse chaulée, remplissages hauts
  for (const [post, panel] of [
    [40, 55],
    [195, undefined],
    [300, 315],
    [455, 470],
    [610, undefined],
  ] as const) {
    put(`poteau de cloison ${post}`, 'door-frame', 1300, post, 15, 15, 283, 1);
    if (panel) put(`remplissage ${panel}`, 'lime-panel', 1300, panel, 15, 140, 283, 1);
  }
  put('porte de la fille', 'inner-door', 1300, 210, 5, 90, 283, 1);
  put('lisse chaulée', 'lime-rail', 1300, 55, 25, 560, 463, 1);
  for (const y of [55, 320, 460]) put(`remplissage haut ${y}`, 'lime-panel-low', 1300, y, 15, 140, 478, 1);
  put('garde-corps', 'stair-railing', 660, 140, 10, 280, 283, 1);
  put('garde-corps court', 'stair-railing-short', 670, 420, 100, 10, 283);
  put("lit de l'aîné", 'bed', 80, 40, 150, 200, 283);
  put('lit du fainéant', 'unmade-bed', 300, 40, 150, 200, 283);
  put('écritoire', 'writing-desk', 240, 580, 90, 60, 283);
  put('lit à courtines', 'canopy-bed', 860, 60, 160, 210, 283);
  put('coffre du linge', 'chest', 1060, 560, 90, 50, 283);
  put('tenture', 'wall-hanging', 820, 320, 5, 160, 403, 1);
  put('lit de la fille', 'bed', 1400, 40, 150, 200, 283);
  put('table de tailleuse', 'tailor-table', 1340, 560, 140, 70, 283);
  put("coupon d'étoffe", 'cloth-bolt', 1360, 580, 40, 30, 358);
  return S;
}
