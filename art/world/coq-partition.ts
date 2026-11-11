// Dessin validé par Grégoire, passé au jeu (chantier « maison du coq », dessins d'intégration) : la cloison de l'étage en pan de bois chaulé (réponse 19 de
// Grégoire : entre la chambre du coq et celle de sa fille, x 1300, du plancher de l'étage à 2,65 m, sous la ferme de la salle).
// Planche : npx tsx tools/essai-coq-integration.ts (.art-preview/coq-integration-cloison.png).
//
// Faite des pièces qui existent (la maison de Xéros) : la sablière basse sur la solive doublée, les poteaux de 15 cm (`door-frame`),
// les remplissages chaulés de 1,80 m (`lime-panel`, 140 × 15 × 180), la porte intérieure (`inner-door`, 90 × 180), au-dessus une
// entretoise, un rang de remplissages de 40 cm et la sablière haute sous l'entrait. **Ce qui la rend lisible vue d'en haut** :
// l'entretoise (la lisse), à 1,95-2,10 m, est plus large que le pan (25 cm pour 15 : elle déborde de 5 cm de chaque côté) et
// chaulée comme lui ; c'est elle que la coupe de l'étage montre, une bande blanche de 5 px au lieu d'un trait de bois de 3 px.
//
// Repère (px du jeu) : x d'ouest en est (l'épaisseur : 0 à 3, la lisse de −1 à 4), y du nord au sud (0 : y 60 cm du plan, 112 :
// y 620), z depuis le plancher de l'étage. La porte : y 140 à 230 du plan (16 à 34 ici).

import { box, dash, daub, doorTex, hash, part, timber, type Quad, type Tex } from '../lib/volumes';

/** Les hauteurs (px) : sablière basse, porte et remplissages du bas, entretoise (la lisse), rang du haut, sablière haute. */
export const CLOISON = { len: 112, sill: 3, low: 39, rail: 42, high: 50, top: 53, door: [16, 34] as [number, number], posts: [0, 26, 52, 78, 109] };

const WOOD = part('bois', 3, '&', 'full');
const LIME = part('chaux', 2, ';', 'full');
const DOOR = part('porte', 2, '&', 'full');
const RAIL = part('lisse', 4, ';', 'full');

/** La lisse chaulée : le dessus blanc de chaux (son arête est au soleil), les faces chaulées, le bois qui paraît aux bouts. */
const railTex: Tex = (s, t, c) => {
  if (c.face === 'top') { const i = Math.floor(s), j = Math.floor(t); return i === 0 || j === 0 ? '+' : i === Math.round(c.w) - 1 || j === Math.round(c.h) - 1 ? '=' : '!'; }
  return Math.floor(t) === 0 ? '=' : '+';
};

/**
 * La cloison entière (`cut` : coupée au-dessus de la lisse, ce que montre la coupe de l'étage ; `narrow` : la lisse de 15 cm, comme
 * le reste du pan, pour comparer).
 */
export function cloisonQuads(o: { cut?: boolean; narrow?: boolean } = {}): Quad[] {
  const C = CLOISON, q: Quad[] = [], [d0, d1] = C.door;
  q.push(...box(0, 3, 0, C.len, 0, C.sill, WOOD, timber(11)));
  // les poteaux, et les deux poteaux de la porte (l'huisserie)
  const posts = [...C.posts, d0 - 3, d1];
  for (const y of posts) q.push(...box(0, 3, y, y + 3, C.sill, o.cut ? C.low : C.high, WOOD, timber(13 + y)));
  // les remplissages du bas, entre les poteaux, hors de la porte
  const cuts = [...new Set([...posts, ...posts.map((y) => y + 3)])].sort((a, b) => a - b);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i], b = cuts[i + 1];
    if (posts.includes(a) || b - a < 1) continue;
    if (a >= d0 && b <= d1) continue;
    q.push(...box(0, 3, a, b, C.sill, C.low, LIME, daub(30 + a, true)));
  }
  // la porte intérieure, fermée, dans le nu du pan
  q.push(...box(1, 2, d0, d1, C.sill, C.low, DOOR, doorTex(7)));
  // la lisse : plus large que le pan, chaulée
  const [x0, x1] = o.narrow ? [0, 3] : [-1, 4];
  // au-dessus de la porte, la lisse reste de bois (le linteau de la porte n'est pas chaulé) : d'en haut, la porte se lit
  if (o.narrow) q.push(...box(x0, x1, 0, C.len, C.low, C.rail, WOOD, timber(17)));
  else q.push(
    ...box(x0, x1, 0, d0 - 3, C.low, C.rail, RAIL, railTex),
    ...box(x0, x1, d0 - 3, d1 + 3, C.low, C.rail, WOOD, timber(17)),
    ...box(x0, x1, d1 + 3, C.len, C.low, C.rail, RAIL, railTex),
  );
  if (o.cut) return q;
  // le rang du haut, la sablière haute
  for (let i = 0; i + 1 < C.posts.length; i++) q.push(...box(0, 3, C.posts[i] + 3, C.posts[i + 1], C.rail, C.high, LIME, daub(50 + i, true)));
  q.push(...box(0, 3, 0, C.len, C.high, C.top, WOOD, timber(19)));
  return q;
}

/** Le plancher de l'étage autour (planches est-ouest de 25 cm, à plat). */
export function floorQuads(x0: number, x1: number, y0: number, y1: number): Quad[] {
  const P = part('plancher', 0, '&', 'none');
  const tex: Tex = (s, t) => {
    const j = Math.floor(t + y0 + 100), i = Math.floor(s), r = Math.floor(j / 5);
    if (j % 5 === 4) return '@';
    if ((i + Math.floor(hash(r, 3) * 80)) % 80 === 0) return '@'; // le bout des planches de 4 m
    return j % 5 === 0 ? '^' : dash(r, j % 5, i, 0.3) ? '%' : '*';
  };
  return box(x0, x1, y0, y1, -1, 0, P, tex).filter((q) => q.face === 'top');
}

/** Les pièces que la cloison consomme (à l'intégration : son plan, les pièces du catalogue). */
export const CLOISON_PIECES = [
  ['sablière basse (poutre du normal, 560 cm)', 1],
  ['poteaux (door-frame, 15 × 15, ici 2,35 m)', 7],
  ['remplissages chaulés (lime-panel, 140 × 180) et leurs recoupes', 4],
  ['porte intérieure (inner-door, 90 × 180)', 1],
  ['lisse chaulée (25 × 15, 560 cm, NOUVELLE pièce)', 1],
  ['remplissages du haut (40 cm, NOUVELLE pièce : lime-panel-low)', 4],
  ['sablière haute (poutre du normal, 560 cm)', 1],
] as const;
