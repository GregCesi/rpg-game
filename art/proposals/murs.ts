// Maquette de la chaumière : PROPOSITIONS des éléments composés du mur (solin, pans de colombage, cloison). Ce module n'est pas
// déclaré dans art/index.ts : le jeu ne le charge pas ; seul l'aperçu le lit
// (`npx tsx tools/preview-proposals.ts art/proposals/murs.ts .art-preview/proposals-murs.png`).
//
// Contrat : art/proposals/chaumiere-geometry.ts (repère de la maison en cm, projection (x, y − z) à 5 cm par pixel, boîtes
// `BOXES`, ancrage au coin bas gauche, vues r0..r3). Chaque image fait exactement `imageSize(box(view, length))`.
//
// Le mur (docs/maison-chaumiere.md) : un solin de 60 cm (deux parements de moellons, un blocage d'éclats noyés dans le mortier
// de terre au milieu), dessus à z 40 ; une sablière basse de 20 × 20 (z 40 à 60), des poteaux de 2 m (z 60 à 260), une
// sablière haute (z 260 à 280) ; entre les poteaux, des palançons verticaux tous les 30 cm, des baguettes de clayonnage
// tressées, puis le torchis à fleur du bois, des deux côtés.
//
// Le bois est la vraie pièce de bois du jeu (`composeWood`, art/world/wood-pieces.ts) : la poutre (normal, 12 coups de
// doloire) debout pour les poteaux, le montant, l'huisserie (8 px de large, la tête et les 3 rangées du dé retirées) ;
// couchée est-ouest pour les sablières, l'appui, le linteau, la sole (le dessus et la face) ; couchée nord-sud pour le dessus
// d'une sablière vue par la tranche (r1, r3), et son bout (le bois de bout, la bande au sud).
// Les rangées d'une pièce couchée est-ouest : 0 le contour du haut, 1 et 2 le dessus, 3 à 6 la face, 7 le contour du bas.
// Le mur est dessiné sur 8 px d'épaisseur (`HOUSE.drawnWall`, 40 cm) : le dessus de la sablière haute y prend 8 rangées (le
// contour et les deux rangées du dessus de la poutre, puis des rangées du même dessus prises plus loin sur une poutre longue,
// pour que le fil ne se répète pas), sa face les 4 rangées des 20 cm (rangées 3, 5, 6 et 7 de la poutre).
//
// Choix (Grégoire dort) :
// - Le bois garde les teintes de la pièce du jeu (bois équarri frais Y t T, contour K N et OUTLINE) : c'est la règle « le bois
//   dessiné est la vraie pièce ». Les planches de la porte et du volet, elles, sont du bois grisé (S A B Q), comme le bois brut
//   des bâtiments : elles se distinguent ainsi des poteaux.
// - Les joints du solin sont en mortier de terre (n, e ; u pour le mortier éclairé du blocage), pas de chaux.
// - Le fond de l'appui de fenêtre et du seuil : dans l'ouverture, on voit le dessus de l'appui sur 4 rangées (les 20 cm réels du
//   mur), pas les 8 du mur dessiné : à 8, l'appui mangeait les deux tiers de la fenêtre et elle ne se lisait plus comme une
//   ouverture.
// - La porte est posée en retrait de 10 cm de la face extérieure (2 rangées du dessus du seuil devant elle) ; vue de
//   l'intérieur, en retrait de 20 cm (4 rangées). Le seuil fait 15 cm (z 5 à 20, son dessus au niveau du sol intérieur) sur le
//   solin abaissé, dont il ne reste visible que le contour du bas.
// - Sous les deux poteaux du pan de porte, la sablière basse s'arrête à leur face (moignons de 8 px) ; le solin dessous
//   (z 0 à 40) reste vide dans l'image : c'est l'élément `solin`, posé à côté.
// - Par la tranche (r1, r3), le volet ne peut pas dépasser de la boîte (8 px imposés) : son chant prend la colonne extérieure,
//   sur les rangées où il se projette.
// - Le pan d'angle, la fenêtre et la porte vus par la tranche ne montrent que le mur (sablière, bout de poteau) : le reste est
//   caché dans l'épaisseur.

import { Canvas, EMPTY, rng, type Grid } from '../lib/canvas';
import { composeWood } from '../world/wood-pieces';
import { BOXES, imageSize, type ProposedElement, type View, type ViewBox } from './chaumiere-geometry';

// =====================================================================================================================
// Le bois : la poutre du jeu
// =====================================================================================================================

type Axis = 'ew' | 'ns' | 'up';
const woodCache = new Map<string, Grid>();
/** La poutre de 20 × 20 (normal, 12 coups de doloire), sans son ombre portée. */
function beam(axis: Axis, length: number): Grid {
  const key = `${axis}-${length}`;
  let g = woodCache.get(key);
  if (!g) {
    g = composeWood({ size: 'normal', shape: 'round', hewn: 12, axis, length }).toGrid().map((r) => r.replace(/x/g, EMPTY));
    woodCache.set(key, g);
  }
  return g;
}

/** Le corps d'une poutre debout de `cm` (8 × cm / 5), sans la tête ni les rangées du dé ; son contour du bas devient du bois. */
function postBody(cm: number): Grid {
  const n = cm / 5;
  const rows = beam('up', cm).slice(4, 4 + n).map((r) => r.slice(0, 8));
  rows[n - 1] = rows[n - 2];
  return rows;
}

/** Une rangée du dessus d'une poutre est-ouest de `w` px, prise à `shift` px du bout sur une poutre longue. */
function topRow(w: number, row: 1 | 2, shift: number): string {
  const long = beam('ew', 5 * (w + 60))[row];
  return 'K' + long.slice(1 + shift, 1 + shift + w - 3) + 'To';
}

/** Une poutre est-ouest de `w` px, ses rangées `rows` (0 contour, 1-2 dessus, 3-6 face, 7 contour du bas). */
function ewRows(w: number, rows: number[]): Grid {
  const g = beam('ew', 5 * w);
  return rows.map((r) => g[r].slice(0, w));
}

/** La sablière haute vue de face (r0, r2) : 12 rangées, le dessus sur 8 (40 cm dessinés), la face sur 4. */
function plateHigh(w: number): Grid {
  const g = ewRows(w, [0, 1, 2]);
  return [...g, topRow(w, 1, 9), topRow(w, 2, 9), topRow(w, 1, 17), topRow(w, 2, 17), topRow(w, 1, 4), ...ewRows(w, [3, 5, 6, 7])];
}

/** La face seule d'une poutre est-ouest (sablière basse, appui, linteau, sole) : 4 rangées, le contour du bas compris. */
const beamFace = (w: number, inWall = false): Grid =>
  ewRows(w, [3, 5, 6, 7]).map((r) => (inWall ? r.replace(/^\./, 'o').replace(/\.$/, 'o') : r));

/** Le dessus d'une poutre nord-sud de `n` rangées (8 px de large), sans son bout. */
function nsTop(n: number): Grid {
  return beam('ns', 5 * n + 40).slice(0, n).map((r) => r.slice(0, 8));
}

/** Le bout d'une poutre nord-sud (le bois de bout au sud) : 4 rangées de bois et le contour du bas. */
function nsEnd(): Grid {
  const g = beam('ns', 100);
  return g.slice(15, 20).map((r) => r.slice(0, 8));
}

// =====================================================================================================================
// Outils de dessin
// =====================================================================================================================

/** Teinte la plus sombre de chaque matière non boisée, pour le contour côté lumière. */
const DARK: Record<string, string> = {
  d: 'E', D: 'E', E: 'E', t: 'E', // torchis et sa paille
  R: 'Z', r: 'Z', z: 'Z', Z: 'Z', // pierre
  u: 'e', U: 'e', n: 'e', e: 'e', // mortier de terre
  S: 'Q', A: 'Q', B: 'Q', Q: 'Q', // planches grisées
};

/**
 * Contour d'un pixel des matières non boisées (le bois a déjà le sien) : au bord de la silhouette, OUTLINE en bas et à droite,
 * la teinte la plus sombre de la matière en haut et à gauche.
 */
function edges(c: Canvas): Canvas {
  const empty = (x: number, y: number) => c.get(x, y) === EMPTY;
  const set: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const k = c.get(x, y);
    if (k === EMPTY || !(k in DARK)) continue;
    if (empty(x + 1, y) || empty(x, y + 1)) set.push([x, y, 'o']);
    else if (empty(x - 1, y) || empty(x, y - 1)) set.push([x, y, DARK[k]]);
  }
  for (const [x, y, k] of set) c.set(x, y, k);
  return c;
}

/** Une petite grappe de 3 ou 4 pixels (jamais un pixel seul). */
function blob(c: Canvas, x: number, y: number, k: string, r: () => number) {
  c.set(x, y, k).set(x + 1, y, k);
  const v = r();
  if (v < 0.35) c.set(x, y + 1, k);
  else if (v < 0.7) c.set(x + 1, y + 1, k);
  else c.set(x + 2, y, k);
  if (r() < 0.3) c.set(x + 1, y + 1, k);
}

/** Vérifie la taille d'une image contre sa boîte (le contrat). */
function sized(c: Canvas, b: ViewBox, what: string): string[] {
  const s = imageSize(b);
  if (c.w !== s.w || c.h !== s.h) throw new Error(`murs : ${what} fait ${c.w} × ${c.h}, attendu ${s.w} × ${s.h}`);
  return c.toGrid();
}

// =====================================================================================================================
// Torchis et clayonnage
// =====================================================================================================================

/**
 * Torchis (terre et paille) dans un rectangle : clair (d), taché par grappes (D), quelques brins de paille (t), plus sombre
 * en bas (les rejaillissements de la pluie : D puis des grappes de E).
 */
function daub(c: Canvas, x0: number, y0: number, w: number, h: number, seed: number) {
  if (w <= 0 || h <= 0) return;
  const r = rng(seed);
  c.rect(x0, y0, w, h, 'd');
  c.within('d', (c) => {
    const n = Math.round(w * h * 0.022);
    for (let i = 0; i < n; i++) blob(c, x0 + Math.floor(r() * w), y0 + Math.floor(r() * Math.max(1, h - 4)), 'D', r);
    const straw = Math.round(w * h * 0.004);
    for (let i = 0; i < straw; i++) {
      const x = x0 + Math.floor(r() * (w - 2)), y = y0 + Math.floor(r() * Math.max(1, h - 5));
      c.set(x, y, 't').set(x + 1, y, 't').set(x + 2, y + (r() < 0.5 ? 0 : -1), 't');
    }
  });
  // le bas : rangée par rangée, des tronçons de 2 à 4 px de plus en plus sombres
  const dark = [0.15, 0.45, 0.8, 1];
  for (let k = 0; k < 4 && k < h; k++) {
    const y = y0 + h - 4 + k;
    let x = x0;
    while (x < x0 + w) {
      const run = 2 + Math.floor(r() * 3);
      const col = r() < dark[k] ? 'D' : null;
      if (col) for (let i = x; i < Math.min(x + run, x0 + w); i++) c.set(i, y, col);
      x += run;
    }
  }
  c.within('D', (c) => {
    for (let i = 0; i < Math.max(1, w / 6); i++) blob(c, x0 + Math.floor(r() * (w - 1)), y0 + h - 2, 'E', r);
  });
}

/** Le dessus d'un mur de torchis (cloison) : plus clair, peu taché. */
function daubTop(c: Canvas, x0: number, y0: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  c.rect(x0, y0, w, h, 'd');
  c.within('d', (c) => {
    for (let i = 0; i < Math.round(w * h * 0.015); i++) blob(c, x0 + Math.floor(r() * w), y0 + Math.floor(r() * h), 'D', r);
  });
}

/**
 * Clayonnage sans torchis : des palançons (lattes fendues de 6 cm, 1 px, bois frais t) tous les 30 cm, et des baguettes de
 * noisetier (écorce A B Q) tressées à l'horizontale, une par rangée : devant un palançon, derrière le suivant, et l'inverse à
 * la baguette d'après ; là où elle passe derrière, l'écorce s'enfonce dans l'ombre (Q) et le palançon se voit.
 */
function wattle(c: Canvas, x0: number, y0: number, w: number, h: number) {
  const stakes: number[] = [];
  for (let k = 1; x0 + 6 * k - 1 < x0 + w - 2; k++) stakes.push(x0 + 6 * k - 1);
  // les appuis de la baguette : les poteaux (bords) et les palançons ; devant l'appui p si (rangée + p) est pair
  const anchors = [x0 - 1, ...stakes, x0 + w];
  for (let y = y0; y < y0 + h; y++) {
    const front = (p: number) => (y + p) % 2 === 0;
    for (let s = 0; s < anchors.length - 1; s++) {
      const a = anchors[s], b = anchors[s + 1];
      for (let x = a + 1; x < b; x++) {
        // 0 contre l'appui de gauche, 1 contre celui de droite : la baguette sort de derrière (ombre) vers devant (lumière)
        const u = (x - a) / (b - a);
        const depth = front(s) ? u : 1 - u; // 0 devant, 1 derrière
        c.set(x, y, depth < 0.4 ? 'A' : depth < 0.75 ? 'B' : 'Q');
      }
    }
    stakes.forEach((sx, i) => c.set(sx, y, front(i + 1) ? 'A' : 't'));
  }
  // le haut et le bas des palançons, plantés dans les sablières : une rangée de plus du bois clair
  for (const sx of stakes) { c.set(sx, y0, 't'); c.set(sx, y0 + h - 1, 'T'); }
}

/**
 * Décharge : poutre de 20 cm (6 px en travers, contour compris) en diagonale dans le rectangle, du haut à gauche (ou à
 * droite) au pied de l'autre côté, coupée par les bords (elle s'assemble dans les angles du cadre). Contour continu : la
 * rive du haut en N, celle du bas en OUTLINE ; juste dedans, une rangée éclairée (Y) en haut et d'ombre (T) en bas.
 */
function brace(c: Canvas, x0: number, y0: number, w: number, h: number, fromLeft: boolean) {
  const half = 3;
  // distance signée à l'axe de la décharge (positive vers le bas de l'image)
  const ax = fromLeft ? x0 : x0 + w, ay = y0, bx = fromLeft ? x0 + w : x0, by = y0 + h;
  const len = Math.hypot(bx - ax, by - ay);
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  const sgn = ny > 0 ? 1 : -1;
  const dist = (x: number, y: number) => sgn * ((x + 0.5 - ax) * nx + (y + 0.5 - ay) * ny);
  const inB = (x: number, y: number) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h && Math.abs(dist(x, y)) <= half;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (!inB(x, y)) continue;
    const d = dist(x, y);
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const X = x + dx, Y = y + dy;
      return X >= x0 && X < x0 + w && Y >= y0 && Y < y0 + h && !inB(X, Y);
    });
    const k = edge ? (d < 0 ? 'N' : 'o') : d < -half + 2 ? 'Y' : d > half - 2 ? 'T' : (x * 3 + y) % 11 < 2 ? 'T' : 't';
    c.set(x, y, k);
  }
}

// =====================================================================================================================
// Planches : porte et volet
// =====================================================================================================================

/**
 * Un vantail de planches verticales de 25 cm (5 px : chant clair S, A, joint Q), grain en traits B. `face` : `out` (le côté
 * des pentures), `in` (traverses et écharpe), `shutter` (le volet ouvert : traverses et pentures). `hinge` : côté des gonds.
 */
function leaf(c: Canvas, x0: number, y0: number, w: number, h: number, face: 'out' | 'in' | 'shutter', hinge: 'left' | 'right', seed: number) {
  const r = rng(seed);
  for (let x = 0; x < w; x++) {
    const i = x % 5;
    const k = i === 0 ? 'S' : i === 4 ? 'Q' : 'A';
    for (let y = 0; y < h; y++) c.set(x0 + x, y0 + y, k);
  }
  // grain : traits de 3 à 5 px en B sur les planches
  for (let i = 0; i < (w * h) / 22; i++) {
    const x = x0 + Math.floor(r() * w);
    if ((x - x0) % 5 === 0 || (x - x0) % 5 === 4) continue;
    const y = y0 + Math.floor(r() * (h - 4)), len = 3 + Math.floor(r() * 3);
    for (let j = 0; j < len; j++) c.set(x, y + j, 'B');
  }
  const bars = face === 'shutter' ? [2, h - 5] : [4, h - 7];
  if (face !== 'out') {
    for (const b of bars) {
      for (let x = x0; x < x0 + w; x++) c.set(x, y0 + b, 'S').set(x, y0 + b + 1, 'A').set(x, y0 + b + 2, 'Q');
    }
  }
  if (face === 'in') {
    // écharpe : du pied côté gonds au haut côté loquet, entre les deux traverses
    const ya = y0 + bars[1], yb = y0 + bars[0] + 3;
    for (let x = x0 + 1; x < x0 + w - 1; x++) {
      const u = (x - x0 - 1) / (w - 3);
      const yc = Math.round(hinge === 'left' ? ya + (yb - ya) * u : yb + (ya - yb) * u);
      c.set(x, yc - 1, 'S').set(x, yc, 'A').set(x, yc + 1, 'Q');
    }
  }
  if (face !== 'in') {
    // pentures de fer : sur les traverses (ou à leur hauteur), du côté des gonds aux trois quarts du vantail
    const len = Math.round(w * 0.75);
    for (const b of bars) {
      const y = y0 + b + (face === 'shutter' ? 1 : 0);
      for (let i = 0; i < len; i++) {
        const x = hinge === 'left' ? x0 + i : x0 + w - 1 - i;
        c.set(x, y, 'z').set(x, y + 1, 'Z');
      }
      // le bout arrondi de la penture, et le nœud du gond
      const tip = hinge === 'left' ? x0 + len : x0 + w - 1 - len;
      c.set(tip, y + 1, 'Z');
      const knuckle = hinge === 'left' ? x0 : x0 + w - 1;
      c.set(knuckle, y - 1, 'Z');
    }
  }
  if (face === 'out') {
    // le loquet : un anneau de fer côté opposé aux gonds
    const lx = hinge === 'left' ? x0 + w - 4 : x0 + 2;
    const ly = y0 + Math.round(h / 2);
    c.set(lx, ly, 'z').set(lx + 1, ly, 'Z').set(lx, ly + 1, 'Z').set(lx + 1, ly + 1, 'Z');
  }
}

// =====================================================================================================================
// Pierre : moellons, éclats, pierre de taille
// =====================================================================================================================

/** Coupe une rangée de `w` px en moellons de longueurs irrégulières (moyenne 8 px, 40 cm), sans bout de moins de 3 px. */
function stonesAlong(w: number, phase: number): [number, number][] {
  const SEQ = [8, 7, 9, 8, 9, 7, 8, 6, 10];
  const out: [number, number][] = [];
  let x = -phase, i = phase;
  while (x < w) {
    const len = SEQ[i++ % SEQ.length];
    const a = Math.max(0, x), b = Math.min(w, x + len);
    out.push([a, b - a]);
    x += len;
  }
  if (out.length > 1 && out[0][1] < 3) { out[1] = [0, out[1][1] + out[0][1]]; out.shift(); }
  const n = out.length;
  if (n > 1 && out[n - 1][1] < 3) { out[n - 2][1] += out[n - 1][1]; out.pop(); }
  return out;
}

/** Face sud d'un moellon (bosselée) : arête éclairée R, corps r et z, pied et droite dans l'ombre Z ; coins cassés. */
function stoneFace(c: Canvas, x: number, y: number, w: number, h: number, joint: string, r: () => number) {
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    // la face est sous le dessus éclairé : r en haut (R seulement au coin gauche, côté lumière), z, Z au pied et à droite
    const k = j === 0 ? (i < 2 ? 'R' : i === w - 1 ? 'z' : 'r') : j === h - 1 ? (i >= w - 3 ? 'Z' : 'z') : i === w - 1 ? 'Z' : i < w * 0.5 ? 'r' : 'z';
    c.set(x + i, y + j, k);
  }
  if (w >= 5 && h >= 3) {
    const bx = x + 1 + Math.floor(r() * (w - 4));
    c.set(bx, y + 1, 'z').set(bx + 1, y + 1, 'z').set(bx + 1, y + 2, 'z');
  }
  if (r() < 0.6) c.set(x + w - 1, y, joint);
  if (r() < 0.5) c.set(x, y + h - 1, joint);
}

/** Dessus d'un moellon (vu d'en haut, éclairé) : R, la droite et le bas en r, une bosse r ; coins cassés. */
function stoneTop(c: Canvas, x: number, y: number, w: number, h: number, joint: string, r: () => number) {
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    c.set(x + i, y + j, i === w - 1 || j === h - 1 ? 'r' : 'R');
  }
  if (w >= 4 && h >= 3) {
    const bx = x + 1 + Math.floor(r() * (w - 3)), by = y + Math.floor(r() * (h - 2));
    c.set(bx, by, 'r').set(bx + 1, by, 'r').set(bx + 1, by + 1, 'r');
  }
  if (r() < 0.6) c.set(x + w - 1, y, joint);
  if (r() < 0.5) c.set(x, y + h - 1, joint);
}

/** Blocage : éclats de taille (grappes de 3 à 4 px, R r z) noyés dans le mortier de terre (n, éclairé en u). */
function rubbleFill(c: Canvas, x0: number, y0: number, w: number, h: number, r: () => number) {
  c.rect(x0, y0, w, h, 'n');
  c.within('n', (c) => {
    for (let i = 0; i < (w * h) / 10; i++) blob(c, x0 + Math.floor(r() * w), y0 + Math.floor(r() * h), 'u', r);
  });
  c.within('nu', (c) => {
    for (let i = 0; i < (w * h) / 3.5; i++) {
      const x = x0 + Math.floor(r() * (w - 1)), y = y0 + Math.floor(r() * (h - 1));
      // un éclat : une grappe de 3 px d'une seule teinte (la face éclairée R, r, ou dans l'ombre z)
      const v = r(), k = v < 0.3 ? 'R' : v < 0.7 ? 'r' : 'z';
      c.set(x, y, k).set(x + 1, y, k).set(x + (v < 0.5 ? 1 : 0), y + 1, k);
    }
  });
}

/** Pierre de taille, face sud (régulière, arêtes vives) : R en haut, r, z en bas ; joint n à droite. */
function ashlarFace(c: Canvas, x: number, y: number, w: number, h: number) {
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    const k = i === w - 1 ? 'n' : j === 0 ? 'R' : j === h - 1 ? 'z' : 'r';
    c.set(x + i, y + j, k);
  }
}

// =====================================================================================================================
// 1. Solin
// =====================================================================================================================

/**
 * r0 : w = L / 5, 20 rangées. Dessus (12 rangées) : parement nord (rangées 0 à 3), blocage (4 à 7), parement sud (8 à 11) ;
 * face sud (8 rangées) : deux assises de 4 rangées (3 de pierre, un joint), la seconde finie par le contour du bas. Les
 * moellons du parement sud sont les mêmes que ceux de la première assise : leurs joints tombent au même endroit.
 */
function solinEW(view: View, length: number): string[] {
  const b = BOXES.solin(view, length);
  const { w, h } = imageSize(b);
  const c = new Canvas(w, h);
  const r = rng(101 + length);
  const north = stonesAlong(w, 5), south = stonesAlong(w, 0), low = stonesAlong(w, 4);
  c.rect(0, 0, w, 4, 'n');
  for (const [x, l] of north) stoneTop(c, x, 0, l - 1, 3, 'n', r);
  rubbleFill(c, 0, 4, w, 4, r);
  c.rect(0, 8, w, 4, 'n');
  for (const [x, l] of south) stoneTop(c, x, 9, l - 1, 3, 'n', r);
  // assises de la face : joints verticaux n, joint horizontal e
  c.rect(0, 12, w, 8, 'n').rect(0, 15, w, 1, 'e');
  for (const [x, l] of south) stoneFace(c, x, 12, l - 1, 3, 'n', r);
  for (const [x, l] of low) stoneFace(c, x, 16, l - 1, 3, 'n', r);
  // le dernier moellon touche le bord : pas de joint au bout
  for (const y of [0, 1, 2, 9, 10, 11, 12, 13, 14, 16, 17, 18]) if (c.get(w - 1, y) === 'n') c.set(w - 1, y, c.get(w - 2, y));
  return sized(edges(c), b, `solin ${view} ${length}`);
}

/**
 * r1 : 12 px de large (60 cm), L / 5 rangées de dessus (parement ouest, blocage, parement est, en long), puis le bout sud
 * (8 rangées, deux assises : un moellon de 40 et une boutisse de 20, alternés).
 */
function solinNS(view: View, length: number): string[] {
  const b = BOXES.solin(view, length);
  const { w, h } = imageSize(b);
  const n = length / 5;
  const c = new Canvas(w, h);
  const r = rng(202 + length);
  c.rect(0, 0, 4, n, 'n').rect(8, 0, 4, n, 'n');
  for (const [y, l] of stonesAlong(n, 3)) stoneTop(c, 0, y, 3, l - 1, 'n', r);
  for (const [y, l] of stonesAlong(n, 6)) stoneTop(c, 8, y, 4, l - 1, 'n', r);
  rubbleFill(c, 4, 0, 4, n, r);
  // le bout sud
  c.rect(0, n, w, 8, 'n').rect(0, n + 3, w, 1, 'e');
  stoneFace(c, 0, n, 7, 3, 'n', r);
  stoneFace(c, 8, n, 4, 3, 'n', r);
  stoneFace(c, 0, n + 4, 3, 3, 'n', r);
  stoneFace(c, 4, n + 4, 8, 3, 'n', r);
  return sized(edges(c), b, `solin ${view} ${length}`);
}

// =====================================================================================================================
// 2 à 5. Pans de colombage
// =====================================================================================================================

/** Rangée de la face sud (vue r0 / r2) d'une hauteur z (cm), dans une boîte de hauteur `hBox` posée sur z = zBase. */
const rowOf = (z: number, hBox: number, zBase: number) => (40 + hBox - (z - zBase)) / 5;

/**
 * Le cadre d'un pan vu de face : la sablière haute (rangées 0 à 11), les deux poteaux (8 px, centrés sur les axes), et la
 * sablière basse (4 rangées sous les poteaux) sur `basse` (toute la largeur, ou seulement sous les poteaux).
 */
function frame(c: Canvas, w: number, basseRow: number, basse: 'full' | 'posts') {
  const post = postBody(200);
  c.stamp(post, 0, 12).stamp(post, w - 8, 12);
  if (basse === 'full') c.stamp(beamFace(w), 0, basseRow);
  else {
    const g = beamFace(8);
    c.stamp(g, 0, basseRow).stamp(g, w - 8, basseRow);
  }
  c.stamp(plateHigh(w), 0, 0);
}

type PanKind = 'plain' | 'angle-left' | 'angle-right';

/** Pan plein (ou d'angle) vu de face : r0 la face extérieure, r2 l'intérieure (même dessin, la décharge en miroir). */
function panFace(view: View, length: number, state: string, kind: PanKind): string[] {
  const b = BOXES.pan(view, length);
  const { w, h } = imageSize(b);
  const c = new Canvas(w, h);
  const seed = length * 7 + (view === 'r2' ? 3 : 0) + kind.length;
  const ix = 8, iw = w - 16, iy = 12, ih = 40;
  if (state === 'clayonnage') wattle(c, ix, iy, iw, ih);
  else daub(c, ix, iy, iw, ih, seed);
  if (kind !== 'plain') {
    // la décharge part du haut du poteau d'angle ; vue de l'intérieur (r2), il passe de l'autre côté
    const left = (kind === 'angle-left') !== (view === 'r2');
    brace(c, ix, iy, iw, ih, left);
  }
  frame(c, w, 52, 'full');
  return sized(c, b, `pan ${view} ${length}`);
}

/**
 * Un pan par la tranche (r1, r3) : 8 px de large ; le dessus de la sablière haute sur toute la longueur du pan (poteaux
 * compris), puis le bout sud : le bois de bout de la sablière haute, la face du poteau, le bout de la sablière basse, et
 * `below` rangées vides sous elle (le solin, posé à part, du pan de porte).
 */
function panEdge(b: ViewBox, below: number, what: string): Canvas {
  const { w, h } = imageSize(b);
  const n = (b.d) / 5;
  const c = new Canvas(w, h);
  c.stamp(nsTop(n), 0, 0);
  const end = nsEnd();
  c.stamp(end.slice(0, 4), 0, n);
  c.stamp(postBody(200), 0, n + 4);
  c.stamp(end.slice(1, 5), 0, n + 44);
  if (h !== n + 48 + below) throw new Error(`murs : ${what}, tranche de ${h} rangées, attendu ${n + 48 + below}`);
  return c;
}

const panEdgeView = (view: View, length: number) => sized(panEdge(BOXES.pan(view, length), 0, 'pan'), BOXES.pan(view, length), `pan ${view} ${length}`);

// ---------- Fenêtre ----------

/**
 * Pan avec fenêtre (2 m) vu de face. Fenêtre de 80 × 60 (16 × 12 px), son bord ouest à la face du poteau gauche ; appui
 * (poutre de 1 m, z 100 à 120) et linteau (z 180 à 200) ; le montant (poutre debout de 2 m) contre la fenêtre, à l'est ;
 * dans l'ouverture, le noir de l'intérieur (K) et le dessus de l'appui. r0 : le volet ouvert, rabattu sur le montant et le
 * torchis à l'est (le côté de ses traverses et de ses pentures, celui qui regarde la fenêtre quand il est fermé). r2 : la face
 * intérieure, tout en miroir (la fenêtre à droite), sans volet.
 */
function windowFace(view: View, length: number): string[] {
  const b = BOXES.pan(view, length);
  const { w, h } = imageSize(b);
  const c = new Canvas(w, h);
  const inside = view === 'r2';
  /** Une place (x depuis l'ouest, en r0) dans l'image : en miroir à l'intérieur. */
  const X = (x: number, ww: number) => (inside ? w - x - ww : x);
  const row = (z: number) => rowOf(z, 240, 40);
  const seed = 900 + (inside ? 1 : 0);
  const ix = 8, iw = w - 16;
  // torchis : au-dessus du linteau, sous l'appui, et à l'est du montant
  daub(c, X(ix, 16), 12, 16, row(200) - 12, seed);
  daub(c, X(ix, 16), row(100), 16, 52 - row(100), seed + 1);
  daub(c, X(32, iw - 24), 12, iw - 24, 40, seed + 2);
  // l'ouverture : le noir de l'intérieur, et le dessus de l'appui sur 4 rangées (le fond plus sombre)
  c.rect(X(ix, 16), row(180), 16, row(120) - row(180), 'K');
  // le dessus de l'appui : au fond, l'ombre sous l'intérieur (T), puis le bois du dessus de la poutre
  const sillTop = [beam('ew', 200)[1], beam('ew', 200)[2], beam('ew', 200)[1]].map((r) => r.slice(3, 19));
  // dans l'embrasure, le dessus de l'appui est à l'ombre du linteau : un cran plus sombre (Y -> t, t -> T)
  const shaded = sillTop.map((r) => r.replace(/t/g, 'T').replace(/Y/g, 't'));
  c.stamp(['T'.repeat(16), ...shaded], X(ix, 16), row(120) - 4);
  // appui et linteau (poutres de 1 m : 20 px, la fin sous le montant)
  c.stamp(beamFace(20, true), X(ix, 20), row(120));
  c.stamp(beamFace(20, true), X(ix, 20), row(200));
  // le montant, puis le cadre
  c.stamp(postBody(200), X(24, 8), 12);
  frame(c, w, 52, 'full');
  if (!inside) leaf(c, 24, row(190), 20, 16, 'shutter', 'left', 77);
  return sized(shutterEdges(c, inside ? null : [24, row(190), 20, 16]), b, `fenêtre ${view}`);
}

/** Contour du volet posé sur le mur : Q en haut et à gauche, OUTLINE en bas et à droite. */
function shutterEdges(c: Canvas, r: [number, number, number, number] | null): Canvas {
  if (!r) return c;
  const [x0, y0, w, h] = r;
  for (let x = x0; x < x0 + w; x++) { c.set(x, y0, x === x0 + w - 1 ? 'o' : 'Q'); c.set(x, y0 + h - 1, 'o'); }
  for (let y = y0; y < y0 + h; y++) { c.set(x0, y, y === y0 + h - 1 ? 'o' : 'Q'); c.set(x0 + w - 1, y, 'o'); }
  return c;
}

/**
 * Le pan avec fenêtre par la tranche : le mur, et le chant du volet (planches grisées) dans la colonne extérieure, sur les
 * rangées où il se projette (le long du mur de 120 à 220 cm depuis l'ouest de r0, de z 110 à 190).
 */
function windowEdge(view: View, length: number): string[] {
  const b = BOXES.pan(view, length);
  const c = panEdge(b, 0, 'fenêtre');
  const L = length + 40;
  const col = view === 'r1' ? 0 : 7;
  // r1 : l'ouest de r0 au nord (le long = y) ; r3 : l'ouest de r0 au sud
  const rows: number[] = [];
  for (let a = 120; a < 220; a += 5) for (let z = 110; z < 190; z += 5) {
    const ly = view === 'r1' ? a : L - a - 5;
    rows.push(Math.floor((ly + 240 - (z - 40)) / 5));
  }
  const y0 = Math.min(...rows), y1 = Math.max(...rows);
  for (let y = y0; y <= y1; y++) c.set(col, y, y === y0 ? 'S' : y === y1 ? 'o' : (y - y0) % 7 < 5 ? 'A' : 'B');
  return sized(c, b, `fenêtre ${view}`);
}

// ---------- Porte ----------

/**
 * Pan avec porte (2 m), boîte de z 0 à 280 (64 rangées). Porte de 100 × 180 (20 × 36 px), son bord ouest à la face du poteau
 * gauche ; seuil de pierre de taille (4 pierres de 40 cm, z 5 à 20) sur le solin abaissé, entre les faces des poteaux ;
 * l'huisserie (poutre debout de 2,40 m, z 20 à 260) contre la porte à l'est ; le linteau (poutre de 1,20 m, z 200 à 220) ; un
 * petit pan de torchis au-dessus du linteau, un étroit à l'est de l'huisserie (jusqu'au seuil). La sablière basse s'arrête
 * à la face des poteaux ; sous eux, le solin est l'élément `solin`, laissé vide ici. r0 : la porte fermée, pentures et
 * loquet ; r2 : l'intérieur en miroir, traverses et écharpe en Z.
 */
function doorFace(view: View, length: number): string[] {
  const b = BOXES.door(view, length);
  const { w, h } = imageSize(b);
  const c = new Canvas(w, h);
  const inside = view === 'r2';
  const X = (x: number, ww: number) => (inside ? w - x - ww : x);
  const row = (z: number) => rowOf(z, 280, 0);
  const seed = 500 + (inside ? 1 : 0);
  // torchis au-dessus du linteau et à l'est de l'huisserie
  daub(c, X(8, 20), 12, 20, row(220) - 12, seed);
  daub(c, X(36, w - 44), 12, w - 44, row(20) - 12, seed + 1);
  // seuil : face de la pierre de taille (z 20 à 5), le contour du bas (le solin abaissé), et son dessus devant la porte
  for (let i = 0; i < (w - 16) / 8; i++) ashlarFace(c, 8 + 8 * i, row(20), 8, 3);
  c.rect(8, row(5), w - 16, 1, 'n');
  const back = inside ? 4 : 2;
  c.rect(X(8, 20), row(20) - back, 20, back, 'R');
  c.rect(X(8, 20), row(20) - back, 20, 1, 'z');
  for (let x = 0; x < 20; x += 8) c.set(X(8, 20) + (inside ? 19 - x : x) + (inside ? -7 : 7), row(20) - 1, 'r');
  // le vantail
  leaf(c, X(8, 20), row(200), 20, row(20) - back - row(200), inside ? 'in' : 'out', inside ? 'right' : 'left', seed + 7);
  // linteau, huisserie, cadre (la sablière basse seulement sous les poteaux)
  c.stamp(beamFace(24, true), X(8, 24), row(220));
  c.stamp(postBody(240), X(28, 8), 12);
  frame(c, w, row(60), 'posts');
  return sized(edges(c), b, `porte ${view}`);
}

const doorEdge = (view: View, length: number) =>
  sized(panEdge(BOXES.door(view, length), 8, 'porte'), BOXES.door(view, length), `porte ${view}`);

// =====================================================================================================================
// 6. Cloison
// =====================================================================================================================

/**
 * Cloison intérieure (z 20 à 280), sans poteau : le dessus du torchis (8 rangées, sous l'entrait), la face de torchis (48
 * rangées, sur palançons et clayonnage cachés), la sole (poutre couchée sur le sol intérieur, 4 rangées).
 */
function partitionFace(view: View, length: number): string[] {
  const b = BOXES.partition(view, length);
  const { w, h } = imageSize(b);
  const c = new Canvas(w, h);
  daubTop(c, 0, 0, w, 8, 300 + length);
  daub(c, 0, 8, w, 48, 301 + length);
  // l'arête du dessus : une rangée d'ombre par tronçons
  const r = rng(302 + length);
  for (let x = 0; x < w; x += 2 + Math.floor(r() * 3)) c.set(x, 8, 'D').set(x + 1, 8, 'D').set(x + 2, 8, 'D');
  c.stamp(beamFace(w), 0, 56);
  return sized(edges(c), b, `cloison ${view} ${length}`);
}

function partitionEdge(view: View, length: number): string[] {
  const b = BOXES.partition(view, length);
  const { w, h } = imageSize(b);
  const n = length / 5;
  const c = new Canvas(w, h);
  daubTop(c, 0, 0, w, n, 400 + length);
  daub(c, 0, n, w, 48, 401 + length);
  c.set(1, n, 'D').set(2, n, 'D').set(3, n, 'D').set(5, n, 'D').set(6, n, 'D');
  c.stamp(nsEnd().slice(1, 5), 0, n + 48);
  return sized(edges(c), b, `cloison ${view} ${length}`);
}

// =====================================================================================================================
// Les éléments
// =====================================================================================================================

const edgeView = (v: View) => v === 'r1' || v === 'r3';

export const ELEMENTS: ProposedElement[] = [
  {
    key: 'solin',
    name: 'morceau de solin',
    views: 'symmetric',
    lengths: [200, 520],
    box: BOXES.solin,
    draw: (view, length) => (edgeView(view) ? solinNS(view, length) : solinEW(view, length)),
  },
  {
    key: 'pan-plein',
    name: 'pan de mur plein',
    views: 'symmetric',
    lengths: [180, 200, 220],
    states: ['clayonnage', 'torchis'],
    box: BOXES.pan,
    draw: (view, length, state) => (edgeView(view) ? panEdgeView(view, length) : panFace(view, length, state ?? 'torchis', 'plain')),
  },
  {
    key: 'pan-angle',
    name: 'pan d\'angle (avec décharge)',
    views: 'four',
    lengths: [180, 200],
    states: ['gauche', 'droite'],
    box: BOXES.pan,
    draw: (view, length, state) =>
      edgeView(view) ? panEdgeView(view, length) : panFace(view, length, 'torchis', state === 'droite' ? 'angle-right' : 'angle-left'),
  },
  {
    key: 'pan-fenetre',
    name: 'pan avec fenêtre',
    views: 'four',
    lengths: [200],
    box: BOXES.pan,
    draw: (view, length) => (edgeView(view) ? windowEdge(view, length) : windowFace(view, length)),
  },
  {
    key: 'pan-porte',
    name: 'pan avec porte',
    views: 'four',
    lengths: [200],
    box: BOXES.door,
    draw: (view, length) => (edgeView(view) ? doorEdge(view, length) : doorFace(view, length)),
  },
  {
    key: 'cloison',
    name: 'cloison intérieure',
    views: 'symmetric',
    lengths: [200, 460],
    box: BOXES.partition,
    draw: (view, length) => (edgeView(view) ? partitionEdge(view, length) : partitionFace(view, length)),
  },
];
