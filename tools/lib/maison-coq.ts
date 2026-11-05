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
export const LEVEL = { ground: 240, wallplate: 240, joist: 260, deck: 280, floor: 283, cordon: 270, upper: 290, arase: 530, plate: 550, ridge: 920 } as const;
/** Les refends (x de leur face ouest, 40 cm d'épais). */
export const REFENDS = [520, 780] as const;
/** Le milieu du jour des baies du mur sud, au rez-de-chaussée et à l'étage. */
export const WINDOWS = [290, 1010, 1390] as const;
/** La porte d'entrée (son jour), l'arc au-dessus. */
export const DOOR = { x0: 615, x1: 725, arch: [580, 750] as [number, number] };
/** Les portes des refends (y du jour) : au rez-de-chaussée, la cuisine (ouest) et la salle (est) ; à l'étage, sur le palier. */
/** (La porte de la salle passe sous le palier et sous le haut de l'escalier : on y marche, la tête libre sous les marches hautes.) */
export const GROUND_DOORS: Record<number, [number, number]> = { 520: [300, 400], 780: [110, 210] };
export const UPPER_DOOR: [number, number] = [80, 180];
/** L'escalier : 14 marches de 19 cm (giron 26), de la 1re (y 480-510) à la 14e (y 142-172), dans la colonne x 680-780. */
export const STAIR = { x: 680, w: 100, steps: 14, rise: 19, tread: 26, first: 480 };
/** La trémie : le trou du plancher au-dessus de l'escalier. */
export const TREMIE = { x0: 680, x1: 780, y0: 145, y1: 425 };

export function coqSteps(): Step[] {
  const S: Step[] = [];
  const put = (name: string, ref: Ref, x: number, y: number, w: number, d: number, z: number, view = 0) =>
    S.push({ kind: 'piece', name, ref, x, y, w, d, z, ...(view ? { view } : {}) });
  const frame = (name: string) => S.push({ kind: 'frame', name });
  const P = (prop: string, length?: number): Ref => (length ? { prop, length } : { prop });
  /** Un pan est-ouest (de x0 à x1 sur la ligne y, d'épaisseur t) ; un pan nord-sud (de y0 à y1 sur la colonne x). */
  // le mur nord se voit par sa face du dedans (vue 2, enduite : réponse 31), le mur sud par celle du dehors (vue 0, la pierre)
  const ew = (name: string, prop: string, x0: number, x1: number, y: number, t: number, z: number) => {
    if (x1 - x0 >= 30) put(name, P(prop, x1 - x0), x0, y, x1 - x0, t, z, y === 0 ? 2 : 0);
  };
  const ns = (name: string, prop: string, y0: number, y1: number, x: number, t: number, z: number) => {
    if (y1 - y0 >= 30) put(name, P(prop, y1 - y0), x, y0, t, y1 - y0, z, 1);
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

  // ---------------------------------------------------------------------------------------------------------------------------
  // 1. Le rez-de-chaussée : 8 assises (0 à 240), murs de 60, refends de 40 ; les portes des refends (1,80 m) et leurs linteaux
  // ---------------------------------------------------------------------------------------------------------------------------
  for (let k = 0; k < 8; k++) {
    const z = 30 * k;
    run('ew', `mur nord ${k}`, 'ashlar-wall', 0, HOUSE.w, [], 0, 60, z);
    run('ns', `pignon ouest ${k}`, 'ashlar-wall', 60, 620, [], 0, 60, z);
    for (const x of REFENDS) {
      const [a, b] = GROUND_DOORS[x];
      // le linteau (1,45 m) déborde le jour de 20 et de 25 cm
      const holes: [number, number][] = k < 6 ? [[a, b]] : k === 6 ? [[a - 20, b + 25]] : [];
      run('ns', `refend ${x} ${k}`, 'ashlar-wall-40', 60, 620, holes, x, 40, z);
    }
    run('ns', `pignon est ${k}`, 'ashlar-wall', 60, 620, [], 1580, 60, z);
    const south: [number, number][] = [[DOOR.x0, DOOR.x1], ...(k >= 3 ? WINDOWS.map(jour) : [])];
    run('ew', `mur sud ${k}`, 'ashlar-wall', 0, HOUSE.w, south, 620, 60, z);
    if (k === 5) {
      // les linteaux des portes des refends, sur leurs tableaux, au haut de l'assise 5 (180)
      for (const x of REFENDS) {
        const [a, b] = GROUND_DOORS[x];
        put(`linteau refend ${x}`, P('window-lintel'), x, a - 20, 30, 145, 180, 1);
      }
    }
    if (k === 2) for (const cx of WINDOWS) put(`demi-croisée ${cx}`, P('half-cross-window'), cx - 50, 650, 100, 30, 90);
  }
  frame('le rez-de-chaussée');

  // ---------------------------------------------------------------------------------------------------------------------------
  // 2. Le plancher de l'étage : les muraillères sur la retraite (240), les solives (260), les planches (280 : le sol à 283)
  // ---------------------------------------------------------------------------------------------------------------------------
  const upperRow = (name: string, prop40: string, prop60: string, z: number, south: [number, number][]) => {
    run('ew', `mur nord ${name}`, prop40, 0, HOUSE.w, [], 0, 40, z);
    run('ns', `pignon ouest ${name}`, prop60, 40, 640, [], 0, 60, z);
    run('ns', `pignon est ${name}`, prop60, 40, 640, [], 1580, 60, z);
    run('ew', `mur sud ${name}`, prop40, 0, HOUSE.w, south, 640, 40, z);
  };
  upperRow('240', 'ashlar-wall-40', 'ashlar-wall', 240, [DOOR.arch, ...WINDOWS.map(lintelHole)]);
  const bays: [number, number][] = [
    [60, 520],
    [560, 780],
    [820, 1580],
  ];
  // les linteaux des demi-croisées, sur les tableaux, au haut de l'assise 7 (240)
  for (const cx of WINDOWS) put(`linteau demi-croisée ${cx}`, P('window-lintel'), cx - 70, 650, 145, 30, 240);
  // l'arc de la porte d'entrée, sur ses tableaux (240) : sa clef monte à 360
  put('arc de la porte', P('stone-arch'), DOOR.arch[0], 620, DOOR.arch[1] - DOOR.arch[0], 60, 240);
  for (const [a, b] of bays) {
    const len = b - a;
    const parts = len > 580 ? [a, a + len / 2, b] : [a, b];
    for (let i = 0; i + 1 < parts.length; i++) {
      put(`muraillère nord ${parts[i]}`, beam('ew', parts[i + 1] - parts[i]), parts[i], 40, parts[i + 1] - parts[i], 30, 240);
      // au sud, pas sur l'arc de la porte (la bande du passage n'a sa muraillère qu'au nord)
      if (a !== 560) put(`muraillère sud ${parts[i]}`, beam('ew', parts[i + 1] - parts[i]), parts[i], 610, parts[i + 1] - parts[i], 30, 240);
    }
  }
  const joists: number[] = [];
  for (let x = 60; x + 30 <= 520; x += 60) joists.push(x);
  joists.push(560, 600, 650);
  /** Les solives du passage s'arrêtent avant l'arc de la porte (y 610). */
  const passage = new Set([560, 600, 650]);
  for (let x = 820; x + 30 <= 1580; x += 60) joists.push(x);
  for (const x of joists) put(`solive ${x}`, beam('ns', passage.has(x) ? 560 : 580), x, 40, 30, passage.has(x) ? 560 : 580, 260);
  // les planches, tous les 35 cm, de la retraite nord (40) à la retraite sud (640) ; la trémie laissée ouverte
  for (let y = 40; y + 35 <= 640; y += 35) {
    put(`planche cuisine ${y}`, plank(460), 60, y, 460, 35, 280);
    // au-dessus de l'arc de la porte (y 600 à 640), pas de planche : l'arc monte jusqu'à 360
    if (y + 35 > 600) {
      // rien
    } else if (y + 35 <= TREMIE.y0 || y >= TREMIE.y1) put(`planche passage ${y}`, plank(220), 560, y, 220, 35, 280);
    else put(`planche passage ${y}`, plank(120), 560, y, 120, 35, 280);
    put(`planche salle ouest ${y}`, plank(380), 820, y, 380, 35, 280);
    put(`planche salle est ${y}`, plank(380), 1200, y, 380, 35, 280);
  }
  frame('le plancher');

  // ---------------------------------------------------------------------------------------------------------------------------
  // 3. L'étage : l'assise 240-270, le cordon, 8 assises (290-530) ; les refends en assises de 30 jusqu'à 540 ; les baies
  // ---------------------------------------------------------------------------------------------------------------------------
  // les refends de l'étage : de 240 à 540, la porte du palier (270 à 450) et son linteau (450)
  for (let z = 240; z < 540; z += 30) {
    for (const x of REFENDS) {
      const [a, b] = UPPER_DOOR;
      // la porte du palier : son seuil de dallage à 270, la porte de 278 à 458, le linteau à 480
      const holes: [number, number][] = z >= 270 && z < 480 ? [[a, b]] : z === 480 ? [[40, 185]] : [];
      run('ns', `refend ${x} ${z}`, 'ashlar-wall-40', 40, 640, holes, x, 40, z);
    }
    if (z === 240) for (const x of REFENDS) put(`seuil du palier ${x}`, P('flagstone-row', UPPER_DOOR[1] - UPPER_DOOR[0]), x, UPPER_DOOR[0], 40, UPPER_DOOR[1] - UPPER_DOOR[0], 270, 1);
    if (z === 450) for (const x of REFENDS) put(`linteau du palier ${x}`, P('window-lintel'), x, 40, 30, 145, 480, 1);
  }
  upperRow('cordon', 'string-course-wall-40', 'string-course-wall', 270, [DOOR.arch]);
  for (let c = 0; c < 8; c++) {
    const z = 290 + 30 * c;
    const holes: [number, number][] = [];
    if (c <= 2) holes.push(DOOR.arch);
    if (c >= 1 && c <= 6) holes.push(...WINDOWS.map(jour));
    if (c === 7) holes.push(...WINDOWS.map(lintelHole));
    upperRow(String(z), 'ashlar-wall-40', 'ashlar-wall', z, holes);
    if (c === 0) for (const cx of WINDOWS) put(`croisée ${cx}`, P('cross-window'), cx - 50, 650, 100, 30, 320);
    if (c === 6) for (const cx of WINDOWS) put(`linteau croisée ${cx}`, P('window-lintel'), cx - 70, 650, 145, 30, 500);
  }
  frame("l'étage");

  // ---------------------------------------------------------------------------------------------------------------------------
  // 4. Le toit : les sablières (530), les souches, les pignons découverts (530), les pans de laves (550), le faîtage (920)
  // ---------------------------------------------------------------------------------------------------------------------------
  for (const [x, len] of [
    [60, 560],
    [620, 560],
    [1180, 400],
  ] as const) {
    put(`sablière nord ${x}`, beam('ew', len), x, 0, len, 30, 530);
    put(`sablière sud ${x}`, beam('ew', len), x, 640, len, 30, 530);
  }
  for (const x of [0, 1580]) put(`pignon découvert ${x}`, P('ashlar-gable'), x, 0, 60, 680, 530, 1);
  // la souche de la salle et de la chambre, sur la sablière nord ; celle de la cuisine, sur le pignon ouest
  for (let i = 0; i < 4; i++) put(`conduit nord ${i}`, P('chimney-flue'), 1060, 0, 100, 80, 550 + 100 * i);
  put('couronnement nord', P('chimney-cap'), 1040, 0, 140, 100, 950);
  for (let i = 0; i < 2; i++) put(`conduit ouest ${i}`, P('chimney-flue'), 0, 290, 80, 100, 910 + 100 * i, 1);
  put('couronnement ouest', P('chimney-cap'), -10, 270, 100, 140, 1110, 1);
  put('pan sud', P('lave-roof'), 60, 340, 1520, 370, 550);
  put('pan nord', P('lave-roof-pierced'), 60, -30, 1520, 370, 550, 2);
  put('faîtage', P('lave-ridge'), 60, 310, 1520, 60, 920);
  frame('le toit');
  return S;
}

/** Ce qui se pose dedans : les sols, l'escalier, les portes, les cheminées, la cloison de l'étage, les meubles. */
export function coqInside(): Step[] {
  const S: Step[] = [];
  const put = (name: string, prop: string, x: number, y: number, w: number, d: number, z: number, view = 0, length?: number) =>
    S.push({ kind: 'piece', name, ref: length ? { prop, length } : { prop }, x, y, w, d, z, ...(view ? { view } : {}) });
  // le dallage de la salle (14 rangées de 7,60 m) et du passage (la bande à l'ouest de l'escalier, puis tout le passage au sud)
  for (let y = 60; y + 40 <= 620; y += 40) put(`dallage salle ${y}`, 'flagstone-row', 820, y, 760, 40, 0, 0, 760);
  for (let y = 60; y + 40 <= 540; y += 40) put(`dallage passage ${y}`, 'flagstone-row', 560, y, 120, 40, 0, 0, 120);
  for (const y of [540, 580]) put(`dallage passage sud ${y}`, 'flagstone-row', 560, y, 220, 40, 0, 0, 220);
  // l'escalier : chaque marche sur la précédente (4 cm de recouvrement)
  for (let i = 1; i <= STAIR.steps; i++) put(`marche ${i}`, 'stone-step', STAIR.x, STAIR.first - STAIR.tread * (i - 1), 100, 30, STAIR.rise * (i - 1));
  // les portes
  put('porte de la cuisine', 'inner-door', 537, GROUND_DOORS[520][0] + 5, 5, 90, 0, 1);
  put('porte de la salle', 'inner-door', 797, GROUND_DOORS[780][0] + 5, 5, 90, 0, 1);
  put("porte d'entrée", 'oak-arch-door', DOOR.x0, 646, 110, 8, 0);
  put('porte des garçons', 'inner-door', 537, UPPER_DOOR[0] + 5, 5, 90, 278, 1);
  put('porte du coq', 'inner-door', 797, UPPER_DOOR[0] + 5, 5, 90, 278, 1);
  // les volets (dedans, contre le jour) : deux par baie
  for (const cx of WINDOWS) {
    for (const [dx, z] of [
      [-50, 90],
      [5, 90],
      [-50, 320],
      [5, 320],
    ] as const)
      put(`volet ${cx} ${z} ${dx}`, 'casement-shutter', cx + dx, 647, 45, 3, z);
  }
  // la cheminée de la salle, au mur nord ; celle de la chambre du coq, au-dessus
  put('jambage ouest', 'fireplace-jamb', 1060, 60, 40, 50, 8);
  put('jambage est', 'fireplace-jamb', 1260, 60, 40, 50, 8);
  put('contrecœur', 'fireback', 1120, 60, 120, 10, 8);
  put('console ouest', 'fireplace-console', 1060, 60, 40, 60, 118);
  put('console est', 'fireplace-console', 1260, 60, 40, 60, 118);
  put('manteau', 'mantel-lintel', 1060, 60, 240, 40, 148);
  put('jambage de chambre ouest', 'small-fireplace-jamb', 1110, 40, 30, 40, 283);
  put('jambage de chambre est', 'small-fireplace-jamb', 1240, 40, 30, 40, 283);
  put('linteau de chambre', 'small-fireplace-lintel', 1110, 40, 160, 30, 383);
  // la cuisine
  put('âtre', 'stone-hearth', 60, 230, 110, 220, 0, 1);
  put('pétrin', 'kneading-trough', 250, 60, 150, 60, 0);
  put('table du ménage', 'table', 230, 380, 210, 90, 0);
  // la salle
  put('grande table ouest', 'table', 1000, 300, 210, 90, 8);
  put('grande table est', 'table', 1210, 300, 210, 90, 8);
  put('chaise du coq', 'high-chair', 1430, 320, 50, 55, 8, 3);
  put('dressoir', 'dresser', 1535, 150, 45, 100, 8, 3);
  put('coffre des comptes', 'chest', 860, 560, 90, 50, 8);
  put('verdure', 'verdure-tapestry', 1340, 60, 240, 5, 70);
  // la cloison de l'étage (x 1290-1305) : poteaux, remplissages, porte, lisse chaulée, remplissages hauts
  for (const y of [40, 195, 300, 455, 610]) put(`poteau de cloison ${y}`, 'door-frame', 1290, y, 15, 15, 283, 1);
  for (const y of [55, 315, 470]) put(`remplissage ${y}`, 'lime-panel', 1290, y, 15, 140, 283, 1);
  put('porte de la fille', 'inner-door', 1295, 210, 5, 90, 283, 1);
  put('lisse chaulée', 'lime-rail', 1285, 55, 25, 560, 463, 1);
  for (const y of [55, 315, 470]) put(`remplissage haut ${y}`, 'lime-panel-low', 1290, y, 15, 140, 478, 1);
  // le garde-corps de la trémie
  put('garde-corps', 'stair-railing', 670, 145, 10, 280, 283, 1);
  put('garde-corps court', 'stair-railing-short', 680, 425, 100, 10, 283);
  // les chambres
  put("lit de l'aîné", 'bed', 80, 60, 150, 200, 283);
  put('lit du fainéant', 'unmade-bed', 300, 60, 150, 200, 283);
  put("écritoire", 'writing-desk', 245, 575, 90, 60, 283);
  put('lit à courtines', 'canopy-bed', 860, 60, 160, 210, 283);
  put('coffre du linge', 'chest', 1060, 560, 90, 50, 283);
  put('tenture', 'wall-hanging', 825, 330, 5, 160, 400, 1);
  put('lit de la fille', 'bed', 1400, 60, 150, 200, 283);
  put('table de tailleuse', 'tailor-table', 1340, 560, 140, 70, 283);
  put("coupon d'étoffe", 'cloth-bolt', 1360, 580, 40, 30, 358);
  return S;
}
