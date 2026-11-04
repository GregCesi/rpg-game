// ESSAI (hors jeu) : trois couvertures pour l'atelier de la forge, sur la charpente de la grange (CADRAGE-forge.md, section 0, essai 2).
// Planche : npx tsx tools/essai-forge.ts dehors écrit .art-preview/forge-dehors.png.
//
// Les mêmes pans que le toit de planches de la grange (`plank-roof-large`, 960 × 340 × 260 cm, `ground`) : deux pans de 9,60 m de long,
// 3,40 m de projection, de l'égout (z 342) au faîte (y 340, z 602), soit 37°. Ils sont faits ici en volumes (art/lib/volumes.ts), dans la
// projection du jeu (x, y − z) : le pan sud fait à l'écran 192 × (52 + 68) = 192 × 120 px, comme l'image du jeu ; le pan nord, vu du sud,
// n'en montre qu'une bande au-dessus du faîte. Le rendu de l'essai (art/proposals/maison-xeros.ts `render`) en tire le contour, et l'ombre
// portée (le décalage du jeu, src/config.ts `SHADOW`). Les conduits de la forge et du four percent le pan nord : ils passent devant lui,
// derrière le pan sud et le faîtage.
//
// Les matières se dessinent rang par rang depuis l'égout, à la distance le long du pan comptée à l'écran (1,4 px d'écran par px de pente) :
// a) TUILES PLATES de terre cuite : rangs de 3 px (11 cm de pureau), tuiles de 5 px (25 cm) à joints croisés ; brun-rouge chaud un peu
//    passé, quelques tuiles plus foncées, quelques-unes mousseuses ; le faîtage en tuiles canal scellées au mortier de chaux.
//    La terre cuite est une rampe nouvelle (à ajouter à art/palette.ts si elle entre au jeu) : la lumière glisse vers le jaune, l'ombre
//    vers le brun-violet. La tuile plate veut 45° ; la charpente de la grange est à 37° : gardé pour l'essai.
// b) BARDEAUX de chêne fendu : rangs de 4 px (14 cm de pureau), écailles de 2 à 4 px de large décalées, le bout de chaque bardeau au jour, son ombre sur le
//    rang du dessous ; le bois vieux (`woodAges.old`) ; faîtage en bardeaux croisés.
// c) LAUZES de calcaire : dalles irrégulières, les rangs diminuent de 6 px à l'égout à 3 px au faîte, bords inégaux ; la rampe du
//    calcaire (! + = ; ~) ; quelques lichens (y G) ; faîtage en lauzes.

import { woodAges, world } from '../palette';
import { box, hash, part, polyPrism, type Quad, type Tex } from '../lib/volumes';

/** La terre cuite des tuiles, de la plus claire à la plus sombre. */
export const TERRACOTTA = {
  light: '#c58c68', // tuile au soleil, passée (vers le jaune)
  base: '#a8664c', // la tuile
  mid: '#965843', // une tuile plus cuite, le coin arrondi
  shade: '#844b3c', // l'ombre sous le rang du dessus
  deep: '#5d3634', // le creux, la tuile la plus cuite (vers le brun-violet)
};
const TC = TERRACOTTA;
const OLD = woodAges.old;
const W = world as Record<string, string>;
const LIME = { bright: W['!'], light: W['+'], base: W['='], shade: W[';'], deep: W['~'] };

export type Cover = 'tiles' | 'shingles' | 'slates';
export const COVERS: { key: Cover; title: string; notes: string[] }[] = [
  { key: 'tiles', title: 'A) TUILES PLATES DE TERRE CUITE (RECOMMANDE)', notes: ['ne brulent pas : la couverture des metiers du feu ; brun-rouge chaud, un peu passe', 'faitage en tuiles canal scellees a la chaux ; ATTENTION : 37 DEG, LA TUILE PLATE EN VEUT 45'] },
  { key: 'shingles', title: 'B) BARDEAUX DE CHENE FENDU', notes: ['ecailles en rangs decales, le bois vieux gris-brun ; faitage en bardeaux croises', 'du bois au-dessus du feu (les escarbilles) ; il faut d abord les lattes'] },
  { key: 'slates', title: 'C) LAUZES DE CALCAIRE', notes: ['dalles irregulieres, rangs qui diminuent vers le faite ; faitage en lauzes', 'ne brulent pas, la pierre commune du jeu ; tres lourdes : charpente a renforcer'] },
];

/** Rapport entre la distance à l'écran et la distance le long du pan (le pan de l'atelier : 120 px d'écran pour 85,6 de pente). */
const K0 = 120 / Math.hypot(68, 52);

// ---------- les matières (des couleurs : le rendu accepte un « #rrggbb ») ----------

function tilesTex(K = K0): Tex {
  return (s, t) => {
    const d = t * K, r = Math.floor(d / 3), yy = d - r * 3;
    const off = (r % 2) * 3, col = Math.floor((s + off) / 5), xx = Math.floor(s + off) - col * 5;
    const h = hash(401, r, col);
    // le haut du rang : l'ombre portée par le bas des tuiles du rang au-dessus (le trait qui fait lire le toit)
    if (yy >= 2) return h < 0.12 ? TC.deep : TC.shade;
    // le bas de la tuile : le petit vide entre deux tuiles voisines, le coin arrondi
    if (yy < 1 && xx === 0) return TC.deep;
    if (yy < 1 && xx === 4) return TC.mid;
    if (h < 0.12) return TC.mid; // une tuile plus cuite
    if (h < 0.16) return hash(403, Math.floor(s), r) < 0.5 ? W.l : TC.mid; // mousse
    if (h < 0.34) return yy < 1 ? TC.base : TC.light;
    return yy >= 1 && xx === 1 && hash(404, r, col) < 0.5 ? TC.light : TC.base;
  };
}

/** Les bardeaux : chaque rang coupé en écailles de 2 à 4 px, le bout au jour, le fil en tirets, l'ombre sur le rang du dessous. */
function shinglesTex(K = K0): Tex {
  const edges = (r: number): number[] => {
    const out: number[] = [];
    let a = -Math.floor(hash(411, r) * 4);
    while (a < 200) { out.push(a); a += 2 + Math.floor(hash(412, r, a) * 3); }
    return out;
  };
  const cache = new Map<number, number[]>();
  return (s, t) => {
    const d = t * K, r = Math.floor(d / 4), yy = d - r * 4, i = Math.floor(s);
    if (!cache.has(r)) cache.set(r, edges(r));
    const es = cache.get(r)!, k = es.filter((a) => a <= i).length;
    const h = hash(413, r, k);
    if (yy >= 3) return OLD['&'];
    if (es.includes(i)) return yy < 1 ? OLD['&'] : OLD['%'];
    if (yy < 1) return h < 0.25 ? OLD['*'] : OLD['^']; // le bout du bardeau, au jour
    if (hash(414, i, r) < 0.25) return OLD['%']; // le fil
    return h < 0.2 ? OLD['%'] : OLD['*'];
  };
}

/** Les rangs des lauzes : du pureau de 6 px à l'égout à 3 px au faîte. */
const SLATE_ROWS: number[] = (() => {
  const out = [0];
  while (out[out.length - 1] < 125) {
    const d = out[out.length - 1];
    out.push(d + Math.max(3, Math.round(6 - (d / 120) * 3)));
  }
  return out;
})();
function slatesTex(K = K0): Tex {
  return (s, t) => {
    const d = t * K, i = Math.floor(s);
    let r = SLATE_ROWS.findIndex((a, n) => d >= a && d < SLATE_ROWS[n + 1]);
    if (r < 0) r = SLATE_ROWS.length - 2;
    const rh = SLATE_ROWS[r + 1] - SLATE_ROWS[r];
    // les joints montants, irréguliers : des dalles de 5 à 10 px
    let a = -Math.floor(hash(421, r) * 8), k = 0;
    while (a + 5 + Math.floor(hash(422, r, k) * 6) <= i) { a += 5 + Math.floor(hash(422, r, k) * 6); k++; }
    // le bas de la dalle, inégal : 0 ou 1 px de plus
    const ragged = hash(423, r, k, Math.floor(i / 2)) < 0.3 ? 1 : 0;
    const yy = d - SLATE_ROWS[r] - ragged;
    const h = hash(424, r, k);
    if (yy >= rh - 1) return LIME.deep; // l'ombre portée du rang du dessus
    if (i === a) return LIME.shade;
    if (yy < 0.9) return LIME.bright; // la tranche de la dalle, au jour
    if (h < 0.08 && hash(425, i, Math.floor(d)) < 0.5) return hash(426, i) < 0.5 ? W.y : W.G; // lichen
    if (h < 0.3) return yy > rh - 2 ? LIME.base : LIME.light; // une dalle plus claire
    if (h < 0.42) return LIME.shade; // une dalle plus sombre, plus vieille
    return yy > rh - 2 && hash(427, i, r) < 0.5 ? LIME.shade : LIME.base;
  };
}

const PAN_TEX: Record<Cover, (k?: number) => Tex> = { tiles: tilesTex, shingles: shinglesTex, slates: slatesTex };
const EAVE: Record<Cover, string> = { tiles: TC.deep, shingles: OLD['&'], slates: LIME.shade };
/** L'épaisseur de la couverture vue à l'égout (px). */
const EAVE_H: Record<Cover, number> = { tiles: 1.5, shingles: 1.5, slates: 2.5 };

// ---------- les faîtages ----------

function ridgeQuads(cover: Cover, x0: number, x1: number, y: number, z: number): Quad[] {
  const P = part('faîtage', 9, cover === 'tiles' ? TC.deep : cover === 'shingles' ? OLD['&'] : LIME.deep, 'full', { roof: true, cast: true });
  if (cover === 'tiles') {
    // les tuiles canal : un demi-rond de 25 cm, des tuiles de 40 cm (8 px) scellées à la chaux
    const r = 3.2, sec: [number, number][] = [];
    for (let k = 0; k <= 8; k++) { const a = Math.PI - (k / 8) * Math.PI; sec.push([y + r * Math.cos(a), z + r * Math.sin(a)]); }
    const tex: Tex = (s, _t, c) => {
      const j = Math.floor(s) % 8;
      if (j === 0) return LIME.bright; // le joint de chaux, bien blanc
      if (j === 7) return TC.deep;
      return c.n[2] > 0.85 ? TC.light : c.n[2] > 0.4 ? (c.n[1] > 0 ? TC.base : TC.light) : c.n[1] > 0 ? TC.mid : TC.shade;
    };
    return polyPrism(x0, x1, sec, P, tex);
  }
  if (cover === 'shingles') {
    // les bardeaux croisés : deux rangs qui se croisent au faîte, en chevrons
    const sec: [number, number][] = [[y - 3, z - 0.6], [y, z + 2.2], [y + 3, z - 0.6]];
    const tex: Tex = (s, t, c) => {
      const i = Math.floor(s), side = c.n[1] > 0 ? 1 : 0;
      if ((i + side * 2) % 4 === 0) return OLD['&'];
      return side ? (Math.floor(t) === 0 ? OLD['%'] : OLD['*']) : OLD['^'];
    };
    return polyPrism(x0, x1, sec, P, tex);
  }
  // les lauzes de faîtage : de grosses dalles posées à cheval, irrégulières
  const tex: Tex = (s, t, c) => {
    const i = Math.floor(s);
    let a = 0, k = 0;
    while (a + 7 + Math.floor(hash(431, k) * 5) <= i) { a += 7 + Math.floor(hash(431, k) * 5); k++; }
    if (i === a) return LIME.deep;
    if (c.face === 'top') return hash(432, k) < 0.3 ? LIME.base : LIME.light;
    return Math.floor(t) >= 2 ? LIME.bright : LIME.shade;
  };
  return box(x0, x1, y - 3, y + 3, z - 0.5, z + 2.5, P, tex);
}

/**
 * Le toit de l'atelier dans une couverture, posé sur la grange dont le coin nord-ouest est en o (px) : le pan sud, le pan nord,
 * l'épaisseur à l'égout sud, le faîtage. Les pans portent leur ombre ; ils sont « toit » (le jeu les efface quand Xéros est dessous).
 */
export function roofQuads(cover: Cover, o: [number, number]): Quad[] {
  const [ox, oy] = o, L = 192, zE = 68.4, zR = 120.4, yR = oy + 68;
  const P = part('pan', 8, EAVE[cover], 'full', { roof: true, cast: true });
  const tex = PAN_TEX[cover]();
  const Q: Quad[] = [
    { o: [ox, oy + 136, zE], u: [L, 0, 0], v: [0, -68, 52], n: [0, 0.6, 0.8], part: P, tex, face: 'slope' },
    { o: [ox, oy, zE], u: [L, 0, 0], v: [0, 68, 52], n: [0, -0.6, 0.8], part: P, tex, face: 'slope' },
    { o: [ox, oy + 136, zE - EAVE_H[cover]], u: [L, 0, 0], v: [0, 0, EAVE_H[cover]], n: [0, 1, 0], part: P, tex: () => EAVE[cover], face: 'S' },
  ];
  return [...Q, ...ridgeQuads(cover, ox, ox + L, yR, zR)];
}

/**
 * Un pan de toit à une pente (l'appentis de l'abri à charbon), dans une couverture : `o` le coin bas-ouest à l'égout, `u` le long de
 * l'égout, `v` de l'égout au haut du pan ; les rangs gardent leur pureau à l'écran (le rapport écran / pente se tire du pan).
 */
export function leanToQuads(cover: Cover, o: [number, number, number], u: [number, number, number], v: [number, number, number]): Quad[] {
  const k = (Math.abs(v[1]) + Math.abs(v[2])) / Math.hypot(v[0], v[1], v[2]);
  const P = part('pan', 8, EAVE[cover], 'full', { roof: true, cast: true });
  const len = Math.hypot(v[1], v[2]);
  return [
    { o, u, v, n: [0, (Math.abs(v[2]) / len) * -Math.sign(v[1] || -1), Math.abs(v[1]) / len], part: P, tex: PAN_TEX[cover](k), face: 'slope' },
    { o: [o[0], o[1], o[2] - EAVE_H[cover]], u, v: [0, 0, EAVE_H[cover]], n: [0, 1, 0], part: P, tex: () => EAVE[cover], face: 'S' },
  ];
}
