// La forge du village, pièce par pièce, dans l'ordre où le scénario la bâtit (tools/test-forge.ts ; CADRAGE-forge.md, décisions de
// Grégoire du 4 novembre 2026) : des données, sans navigateur.
//
// Repère : en cm, l'origine au coin nord-ouest de l'emprise (40 × 40, règle D) du poteau nord-ouest de l'atelier ; les poteaux de
// l'atelier en x 0, 280, 560, 840 et y 0, 280, 560 (la charpente de la grange, tools/test-grange.ts). Chaque pièce est donnée par
// l'emprise visée (coin nord-ouest, largeur, profondeur) et, quand l'aimant des bords la décale, la place attendue (`at`).
//
// - L'atelier : la charpente de la grange, en bois vieux (gris), **ouverte au sud** (ni bardage ni porte au sud : un abri ouvert, son
//   toit s'efface quand Xéros est dessous), relevée à 45° pour les bardeaux (poinçons de 3 m au lieu de 2,20, pignons
//   `board-gable-tall`, faîtage à 6,42 m, sous le faîte à 6,82 m) ; deux grands pans de bardeaux de chêne fendu, le pan nord percé pour le conduit ;
// - dedans (version A du cadrage, validée) : la forge contre le bardage nord (sa hotte, son conduit qui sort au-dessus du faîte, son
//   couronnement), le soufflet et sa perche à l'ouest, l'auge à droite du feu, l'enclume sur son billot à un pas et demi du feu, le
//   four dans la travée du milieu, l'établi et son étau contre le bardage est, le râtelier à barres, la meule près de l'ouverture, le
//   râtelier à outils, le coffre à charbon, la caisse de ferraille ;
// - à l'est : l'abri à charbon (un appentis de bardeaux sur quatre poteaux, nord 3 m, sud 1,60 m), ses sacs de charbon ; le puits.
// La place de la fonderie (au nord-est de la parcelle) reste vide : c'est une parcelle réservée de la carte, pas une pièce du plan.

import type { PieceStep, Ref, Step } from './maison-xeros';

/** Une poutre du normal équarrie (20 × 20 cm ; son emprise compte encore le contour : 30), de cette longueur, dans ce sens. */
export const beam = (axis: 'ew' | 'ns' | 'up', length: number): Ref => ({ wood: { size: 'normal', length, shape: 'round', hewn: 12, axis } });

/** Une étape de pièce, et ce que la forge y ajoute : une pierre naturelle à sa taille type (la dalle). */
export type ForgePiece = PieceStep & { natural?: { form: 0 | 1; size: number } };
export type ForgeStep = Exclude<Step, PieceStep> | ForgePiece;

/** Les poteaux de l'atelier (coin nord-ouest de leur emprise), du nord au sud. */
export const POSTS: [number, number][] = [[0, 0], [280, 0], [560, 0], [840, 0], [0, 280], [840, 280], [0, 560], [280, 560], [560, 560], [840, 560]];

/** La forge : son coin nord-ouest (la hotte, le conduit et le couronnement s'en tirent, comme dans la maison de Xéros). */
export const HEARTH: [number, number] = [120, 40];

/** L'abri à charbon : le coin nord-ouest de l'emprise de son poteau nord-ouest ; ses poteaux à 3 m d'est en ouest, 2 m du nord au sud. */
export const SHED: [number, number] = [1100, 200];

export function forgeSteps(): ForgeStep[] {
  const S: ForgeStep[] = [];
  const piece = (name: string, ref: Ref | string, x: number, y: number, w: number, d: number, o: Partial<ForgePiece> = {}) =>
    S.push({ kind: 'piece', name, ref: typeof ref === 'string' ? { prop: ref } : ref, x, y, w, d, ...o });
  const slab = (name: string, x: number, y: number) => piece(name, 'slab', x, y, 45, 40, { z: 0, natural: { form: 0, size: 100 } });
  const post = (name: string, length: number, x: number, y: number) => piece(name, beam('up', length), x, y, 40, 40, { z: 12 });
  const joint = (type: 'scarf' | 'mortise' | 'halving', a: string, b: string) => S.push({ kind: 'joint', type, a, b });
  const frame = (name: string) => S.push({ kind: 'frame', name });

  // ---- l'atelier ----
  // 1. les dalles, puis les poteaux de 3 m dessus, du nord au sud
  for (const [x, y] of POSTS) slab(`dalle ${x},${y}`, x, y);
  for (const [x, y] of POSTS) post(`poteau ${x},${y}`, 300, x, y);
  frame('les dalles et les poteaux');

  // 2. le bardage au nord, à l'ouest et à l'est, contre la face du dehors des poteaux ; le sud reste ouvert
  for (const x of [40, 160, 320, 440, 600, 720]) piece(`bardage nord ${x}`, 'board-wall', x, -20, 120, 20, { view: 2, z: 0 });
  for (const y of [40, 160, 320, 440]) piece(`bardage ouest ${y}`, 'board-wall', -20, y, 20, 120, { view: 1, z: 0 });
  for (const y of [40, 160, 320, 440]) piece(`bardage est ${y}`, 'board-wall', 880, y, 20, 120, { view: 3, z: 0 });
  frame('le bardage, ouvert au sud');

  // 3. dedans, avant les sablières et les entraits (la visée prend le plus haut dessus sous l'emprise : sous un entrait, elle
  // viserait l'entrait) : la forge contre le bardage nord, sa hotte (le conduit, après la charpente : sa tête cacherait la sablière nord à la visée)
  const [hx, hy] = HEARTH;
  piece('forge', 'forge-hearth', hx, hy, 220, 110, { z: 0 });
  piece('hotte', 'chimney-hood', hx, hy, 220, 80, { z: 160 });
  // le soufflet nord-sud contre le bardage ouest, sa buse vers la joue ouest de la forge ; l'auge à droite du feu
  piece('soufflet', 'forge-bellows', 40, 40, 75, 180, { view: 1, z: 0 });
  piece('auge', 'quench-trough', 360, 40, 120, 50, { z: 0 });
  // l'enclume sur son billot, à un pas et demi du feu
  piece("billot d'enclume", 'anvil-block', 200, 280, 60, 60, { z: 0 });
  piece('enclume', 'anvil', 200, 300, 70, 20, { z: 55 });
  // le four dans la travée du milieu, contre le bardage nord
  piece('four', 'forge-oven', 600, 40, 140, 140, { z: 0 });
  // contre le bardage ouest : le râtelier à outils, le coffre à charbon
  piece('râtelier à outils', 'tool-rack', 40, 320, 15, 120, { view: 1, z: 0 });
  piece('coffre à charbon', 'charcoal-bin', 40, 460, 100, 100, { z: 0 });
  // contre le bardage est : l'établi (nord-sud), son étau au bout sud, le râtelier à barres
  piece('établi', 'workbench', 760, 60, 70, 320, { view: 3, z: 0, at: [770, 60] });
  piece('étau', 'vise', 780, 340, 30, 20, { view: 3, z: 85, at: [770, 340] });
  piece('râtelier à barres', 'bar-rack', 800, 400, 40, 160, { view: 3, z: 0 });
  // près de l'ouverture, pour la lumière : la meule ; la caisse de ferraille
  piece('meule', 'grindstone', 640, 460, 100, 50, { z: 0 });
  piece('ferraille', 'scrap-crate', 520, 480, 60, 50, { z: 0 });
  frame("le mobilier de l'atelier");

  // 4. les sablières des longs murs (3 m et 5,80 m entées), au sud au ras du dehors des poteaux (visées à 580, aimantées à 570)
  for (const side of ['n', 's'] as const) {
    const y = side === 'n' ? 0 : 580;
    const ay = side === 'n' ? 0 : 570;
    const row = side === 'n' ? 0 : 560;
    piece(`sablière ${side} ouest`, beam('ew', 300), 0, y, 300, 30, { z: 312, at: [0, ay] });
    piece(`sablière ${side} est`, beam('ew', 580), 300, y, 580, 30, { z: 312, at: [300, ay] });
    joint('scarf', `sablière ${side} ouest`, `sablière ${side} est`);
    joint('mortise', `poteau 0,${row}`, `sablière ${side} ouest`);
    joint('mortise', `poteau 280,${row}`, `sablière ${side} ouest`);
    joint('mortise', `poteau 560,${row}`, `sablière ${side} est`);
    joint('mortise', `poteau 840,${row}`, `sablière ${side} est`);
  }
  // les sablières des murs de bout, posées sur les longues (3,42 m), à mi-bois aux angles : elles descendent à 3,12 m
  for (const side of ['w', 'e'] as const) {
    const x = side === 'w' ? 0 : 840;
    const long = side === 'w' ? 'ouest' : 'est';
    piece(`sablière ${side} nord`, beam('ns', 300), x, 0, 30, 300, { z: 332 });
    joint('halving', `sablière ${side} nord`, `sablière n ${long}`);
    piece(`sablière ${side} sud`, beam('ns', 300), x, 300, 30, 300, { z: 332 });
    joint('halving', `sablière ${side} sud`, `sablière s ${long}`);
    joint('scarf', `sablière ${side} nord`, `sablière ${side} sud`);
    joint('mortise', `poteau ${x},280`, `sablière ${side} nord`);
  }
  // les entraits, d'une sablière à l'autre (deux poutres de 3 m entées), à mi-bois
  for (const x of [280, 560]) {
    const long = x === 280 ? 'ouest' : 'est';
    piece(`entrait ${x} nord`, beam('ns', 300), x, 0, 30, 300, { z: 332 });
    joint('halving', `entrait ${x} nord`, `sablière n ${long}`);
    piece(`entrait ${x} sud`, beam('ns', 300), x, 300, 30, 300, { z: 332 });
    joint('halving', `entrait ${x} sud`, `sablière s ${long}`);
    joint('scarf', `entrait ${x} nord`, `entrait ${x} sud`);
  }
  frame("l'ossature : poteaux, sablières, entraits");

  // 5. les poinçons de 3 m (45°), les pignons à 45° sur les sablières des murs de bout, le faîtage sur les poinçons (6,42 m)
  for (const x of [280, 560]) {
    piece(`poinçon ${x}`, beam('up', 300), x, 280, 40, 40, { z: 332 });
    joint('mortise', `poinçon ${x}`, `entrait ${x} nord`);
  }
  piece('pignon ouest', 'board-gable-tall', 0, 40, 20, 520, { view: 1, z: 332 });
  piece('pignon est', 'board-gable-tall', 860, 40, 20, 520, { view: 3, z: 332 });
  piece('faîtage ouest', beam('ew', 300), 0, 280, 300, 30, { z: 632 });
  piece('faîtage est', beam('ew', 580), 300, 280, 580, 30, { z: 632 });
  joint('scarf', 'faîtage ouest', 'faîtage est');
  joint('mortise', 'poinçon 280', 'faîtage ouest');
  joint('mortise', 'poinçon 560', 'faîtage est');
  frame('les poinçons, les pignons, le faîtage');

  // 6. le premier tronçon du conduit, les deux grands pans de bardeaux (rive basse au sud : vue 0 ; au nord : R deux fois, le pan percé), puis le conduit jusqu'au-dessus
  // du faîte (7,60 m ; le faîte à 6,82 m) et son couronnement
  piece('conduit 1', 'chimney-flue', hx + 60, hy, 100, 80, { z: 260 });
  piece('pan sud', 'shingle-roof-large', -40, 300, 960, 340, { z: 332 });
  piece('pan nord', 'shingle-roof-large-pierced', -40, -40, 960, 340, { view: 2, z: 332 });
  for (let k = 1; k < 5; k++) piece(`conduit ${k + 1}`, 'chimney-flue', hx + 60, hy, 100, 80, { z: 260 + 100 * k });
  piece('couronnement', 'chimney-cap', hx + 40, hy - 10, 140, 100, { z: 760, at: [hx + 40, hy - 20] });
  frame("l'atelier fini");

  // ---- l'abri à charbon, à l'est ----
  const [sx, sy] = SHED;
  const SP: [number, number, number][] = [[sx, sy, 300], [sx + 300, sy, 300], [sx, sy + 200, 160], [sx + 300, sy + 200, 160]];
  for (const [x, y] of SP) slab(`dalle abri ${x - sx},${y - sy}`, x, y);
  for (const [x, y, l] of SP) post(`poteau abri ${x - sx},${y - sy}`, l, x, y);
  piece('sablière abri nord', beam('ew', 340), sx, sy, 340, 30, { z: 312 });
  piece('sablière abri sud', beam('ew', 340), sx, sy + 210, 340, 30, { z: 172 });
  joint('mortise', 'poteau abri 0,0', 'sablière abri nord');
  joint('mortise', 'poteau abri 300,0', 'sablière abri nord');
  joint('mortise', 'poteau abri 0,200', 'sablière abri sud');
  joint('mortise', 'poteau abri 300,200', 'sablière abri sud');
  // les sacs de charbon, à l'abri
  for (const k of [0, 1, 2]) piece(`sac de charbon ${k + 1}`, 'sack', sx + 40 + 50 * k, sy + 60, 50, 40, { z: 0 });
  piece('pan abri', 'shingle-shed-roof', sx - 20, sy - 40, 380, 320, {});
  // le puits, au sud de l'abri : l'auge s'y remplit à une dizaine de mètres
  piece('puits', 'well', sx + 20, 600, 235, 160, { z: 0 });
  frame("l'abri à charbon et le puits");
  return S;
}
