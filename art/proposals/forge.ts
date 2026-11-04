// ESSAI (hors jeu, jamais chargé par le jeu) : les pièces nouvelles de la forge du village (CADRAGE-forge.md, section 3).
// Planches : npx tsx tools/essai-forge.ts écrit .art-preview/forge-dehors.png, forge-interieur.png, forge-detail.png.
//
// Chaque pièce est un petit modèle en volumes (art/lib/volumes.ts, comme l'âtre du jeu, art/world/chimney.ts), rendu dans ses vues
// par `renderPiece` : les pièces de bâtiment maçonnées (la forge, le four : `ground`, gabarit W × (H + D), k = 1 : elles portent
// la hotte et le conduit du jeu, posés dessus au pixel près) ; les meubles (gabarit W × (H + D/2), k = ½), avec leur ombre portée.
// Repère local (px du jeu, 5 cm) : x vers l'est, y vers le sud, z vers le haut, l'origine au coin nord-ouest de la boîte.
//
// Dimensions (cm) et taille à l'écran (gabarit) :
// - forge maçonnée `forge-hearth` 220 × 110 × 160, table à 80, `ground` : 44 × (32 + 22) = 44 × 54 ; vue de côté 22 × 76 ;
// - four `forge-oven` 140 × 140 × 130, `ground` : 28 × (26 + 28) = 28 × 54 ;
// - soufflet `forge-bellows` 180 × 75 × 110 (r0 couché est-ouest, buse à l'est) : 36 × (22 + 7,5) = 36 × 29,5 ; de côté 15 × 40 ;
// - enclume `anvil` 70 × 20 × 30 : 14 × (6 + 2) = 14 × 8 ; de côté 4 × 13 (dessinée 5 de large) ;
// - billot d'enclume `anvil-block` Ø 60 × 55 : 12 × (11 + 6) = 12 × 17 ;
// - auge `quench-trough` 120 × 50 × 50 : 24 × 15 ; de côté 10 × 22 ;
// - coffre à charbon `charcoal-bin` 100 × 100 × 70 : 20 × 24 ;
// - râtelier à outils `tool-rack` 120 × 15 × 100 : 24 × 21,5 ; de côté 3 × 32 (les outils pendus dépassent de 2 px) ;
// - râtelier à barres `bar-rack` 160 × 40 × 120 : 32 × 28 ; de côté 8 × 40 ;
// - meule `grindstone` bâti 100 × 50 × 90 : 20 × 23 ;
// - étau `vise` 20 × 30 × 40 (sur l'établi) : 4 × 11, agrandi au plancher de lisibilité : 6 × 16 au plus.
//
// Matières (toutes de art/palette.ts, sauf le fer) : pierre de la forge et de l'auge, la rampe du calcaire (! + = ; ~) en moellons
// comme la cheminée du jeu ; bois, la rampe du bois travaillé à l'âge vieux (`woodAges.old`, ^ * % & @) ; cuir du soufflet,
// l'écorce (M m N K) ; terre du four, le chemin (U u n e) ; grès de la meule, la terre battue (# I $) ; charbon, l'humus et la
// litière (5 3 9) ; braises et flammes, les lueurs (H h i) ; eau, l'eau (q w) sur l'humus.
// FER : une rampe nouvelle, à ajouter à art/palette.ts si la forge entre au jeu (signes libres dans toute la palette du monde) :
// un gris bleu sombre, la lumière glissant vers le jaune-gris, l'ombre vers le brun-violet.

import { Canvas, type Grid, type Palette } from '../lib/canvas';
import { stonePalette } from '../items/stones';
import { woodAges } from '../palette';
import { box, hash, part, renderPiece, rotQuads, timber, unit, withGroundShadow, type Part, type Quad, type Tex, type V3, type Rot } from '../lib/volumes';

/** Le fer forgé (enclume, buse, outils, barres, tôle) : du plus clair au plus sombre. */
export const IRON = {
  '(': '#a9a99d', // fer poli au soleil : la table de l'enclume, l'arête d'une barre (glisse vers le jaune-gris)
  ')': '#727980', // fer : la face, gris bleu
  '<': '#50566a', // fer à l'ombre (bleu vers le violet)
  '>': '#363343', // fer au plus sombre, contour côté lumière (brun-violet)
};
/** La palette de l'essai : le monde, la pierre, le bois à l'âge vieux, le fer. */
export const PAL: Palette = { ...stonePalette, ...woodAges.old, ...IRON };

/** Les vues du jeu (r0 à r3, un quart de tour de plus dans le sens des aiguilles d'une montre) dans les rotations du modèle. */
const VIEW_ROT: Rot[] = [0, 3, 2, 1];

/** Une vue d'un modèle : k = 1 pour une pièce de bâtiment (`ground`), ½ pour un meuble (avec son ombre portée). */
export function view(model: () => Quad[], v: number, ground: boolean): Grid {
  const g = renderPiece(rotQuads(model(), VIEW_ROT[v], [0, 0]), { k: ground ? 1 : 0.5 });
  return ground ? g : withGroundShadow(g);
}

// =====================================================================================================================
// Les matières
// =====================================================================================================================

/** Les moellons d'une assise : leurs bords le long de la face (6 à 10 px), décalés d'une assise à l'autre. */
function joints(seed: number, course: number, w: number): number[] {
  const out: number[] = [];
  let a = -Math.floor(hash(seed, course, 1) * 8);
  while (a < w + 10) {
    out.push(a);
    a += 6 + Math.floor(hash(seed, course, a, 2) * 5);
  }
  return out;
}

/**
 * Les moellons de calcaire au mortier de chaux, comme la cheminée du jeu : assises de 25 cm (5 px : le joint de lit, la pierre, son
 * haut éclairé), joints montants décalés, deux teintes par moellon ; `quoin` : les angles en pierre de taille (début, fin de la face) ;
 * `soot` : la part noircie d'un point (0 à 1).
 */
export function masonry(seed: number, quoin?: (face: string) => [boolean, boolean], soot?: (s: number, z: number, face: string, w: number) => number): Tex {
  return (s, _t, c) => {
    const z = c.p[2];
    let k: string;
    if (c.face === 'top') {
      const i = Math.floor(c.p[0]), j = Math.floor(c.p[1]);
      const row = Math.floor((j + 100) / 4), jt = joints(seed + 9, row, 400).some((a) => a === i + 100);
      k = (j + 100) % 4 === 3 || jt ? 'E' : hash(seed, row, Math.floor(i / 7)) < 0.3 ? '!' : '+';
    } else {
      const course = Math.floor(z / 5), r = z - course * 5;
      const w = c.w, i = Math.floor(s);
      const long = (course + seed) % 2 === 0, qw = long ? 7 : 4;
      const [qa, qb] = quoin?.(c.face) ?? [false, false];
      const inQuoin = (qa && i < qw) || (qb && i >= Math.floor(w) - qw);
      if (r < 1) k = 'E';
      else if (inQuoin) {
        const edge = qa && i < qw ? i === qw - 1 : i === Math.floor(w) - qw;
        k = edge ? 'E' : r >= 4 ? '!' : r < 2 ? '=' : '+';
      } else {
        const js = joints(seed, course, w), stone = js.filter((a) => a <= i).length;
        const low = hash(seed, course, stone, 7) < 0.33;
        if (js.includes(i) || (low && r < 2)) k = 'E';
        else {
          const light = hash(seed, course, stone, 5) < 0.28, dark = !light && hash(seed, course, stone, 8) < 0.3;
          k = r >= 4 ? (light ? '+' : '=') : r < (low ? 3 : 2) ? (dark ? '~' : ';') : light ? '=' : dark ? ';' : '=';
        }
      }
      // la face à l'ombre (l'est) un cran plus sombre
      if (c.face === 'E' && k === '+') k = '=';
      else if (c.face === 'E' && k === '=') k = ';';
    }
    const f = soot?.(s, z, c.face, c.w) ?? 0;
    if (f > 0 && hash(seed + 77, Math.floor(s / 2), Math.floor(z / 2)) < f) k = k === 'E' ? 'o' : k === '!' || k === '+' ? ';' : '~';
    return k;
  };
}

/** Le fer : le dessus poli, la face ouest au jour, le sud mi-ombre, l'est et le nord à l'ombre. */
export const iron: Tex = (_s, t, c) => {
  if (c.face === 'top') return '(';
  if (c.face === 'W') return ')';
  if (c.face === 'S' || c.face === 'slope') return t < c.h * 0.45 ? '<' : ')';
  return '<';
};
const IRON_P = (name: string, prio = 6) => part(name, prio, '>', 'full');

/** Une pierre d'un seul bloc taillée au pic (l'auge) : le dessus clair, les faces piquetées. */
function cutStone(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return hash(seed, i, j) < 0.15 ? '=' : '+';
    const base = c.face === 'W' ? '+' : c.face === 'E' || c.face === 'N' ? ';' : '=';
    if (j === Math.floor(c.h) - 1) return c.face === 'E' ? '=' : '!';
    return hash(seed, i, j, 3) < 0.16 ? (base === '+' ? '=' : ';') : base;
  };
}

/** Des planches (le coffre, le râtelier) : planches couchées de 25 cm (5 px), joint sombre, fil en tirets ; le bois de bout. */
function boards(seed: number, upright = false): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return hash(seed, i, j) < 0.25 ? '*' : '^';
    const shade = c.face === 'E' || c.face === 'N';
    const a = upright ? i : j, b = upright ? j : i;
    if (a % 5 === 0 && a > 0) return '@';
    const base = shade ? '%' : c.face === 'W' ? '^' : a % 5 === 4 ? '^' : '*';
    return hash(seed, a, Math.floor(b / 3)) < 0.18 ? (shade ? '&' : '%') : base;
  };
}

/** Le cuir du soufflet : des plis en bandes, le haut de chaque pli au jour. */
const leather: Tex = (s, t, c) => {
  const j = Math.floor(t), i = Math.floor(s);
  const lit = c.face === 'W' || (c.face !== 'E' && c.face !== 'N' && c.n[0] < 0.2);
  const fold = j % 2 === 1;
  if (c.face === 'top') return 'm';
  if (!lit) return fold ? 'N' : 'K';
  return fold ? (hash(3, i, j) < 0.2 ? 'm' : 'M') : 'N';
};

/** La terre du four : la voûte lissée à la main, des fentes de retrait ; la suie au-dessus de la bouche. */
function clay(seed: number): Tex {
  return (s, t, c) => {
    const lx = c.n[0], lz = c.n[2];
    let k = lz > 0.7 ? 'U' : lx < -0.3 ? 'U' : lx > 0.45 ? 'n' : lz > 0.2 ? 'u' : 'u';
    if (c.face === 'S' || c.face === 'N') k = c.face === 'S' ? 'u' : 'n';
    const i = Math.floor(c.p[0] * 1.3 + c.p[1] * 0.7), j = Math.floor(c.p[2] + c.p[1] * 0.4);
    if (hash(seed, i >> 2, j) < 0.07 && hash(seed + 1, i, j) < 0.6) k = 'e';
    void s; void t;
    return k;
  };
}

// =====================================================================================================================
// Le feu de la forge
// =====================================================================================================================

/** Le feu de la forge (12 × 9 px) : le charbon en tas, les braises, de petites flammes (jusqu'à 40 cm) ; trois images. */
export function forgeFire(frame: number): Grid {
  const W = 12, H = 9, c = new Canvas(W, H);
  for (let x = 1; x < W - 1; x++) {
    const hump = Math.round(2 - Math.abs(x - 5.5) / 3);
    for (let y = H - 1 - hump; y < H; y++) c.set(x, y, hash(51, x, y, frame) < 0.4 ? 'i' : hash(52, x, y) < 0.5 ? '5' : 'h');
  }
  for (let i = 0; i < 8; i++) {
    const x = 2 + i, f = Math.sin(((i + 0.5) / 8) * Math.PI);
    const hgt = Math.round(f * 6 * (0.6 + hash(53, i, frame) * 0.5));
    const base = H - 3;
    if (hgt > 0) c.line(x, base, x, base - hgt, 'i');
    if (hgt > 2) c.line(x, base, x, base - Math.round(hgt * 0.6), 'h');
    if (hgt > 4) c.line(x, base, x, base - Math.round(hgt * 0.3), 'H');
  }
  return c.toGrid();
}

// =====================================================================================================================
// La forge maçonnée (forge-hearth), 220 × 110 × 160 : 44 × 22 × 32
// =====================================================================================================================

export const FORGE = { w: 44, d: 22, table: 16, h: 32, cheek: 6, back: 3, cheekD: 16 };

/** Le dessus de la table entre les joues : terre battue et poussier de charbon, le creuset du feu au milieu, ses braises. */
const forgeBed = (frame: number): Tex => (s0, t0) => {
  const x = s0, y = t0, i = Math.floor(x), j = Math.floor(y);
  const d = Math.hypot((x - 22) / 7.5, (y - 9.5) / 4.5);
  if (d < 0.55) return hash(61, i, j, frame) < 0.45 ? 'H' : 'h';
  if (d < 0.85) return hash(62, i, j, frame) < 0.5 ? 'i' : 'h';
  if (d < 1.15) return hash(63, i, j) < 0.55 ? '5' : '3';
  // le bord de la table : une lèvre de pierre à l'avant (la dernière rangée, y 21)
  if (j >= FORGE.d - 1) return '+';
  if (j >= FORGE.d - 2) return hash(64, i) < 0.5 ? '=' : '+';
  // le poussier : la terre battue (I $) piquée de charbon (5 3 9), plus noire près du feu
  const near = Math.max(0, 1 - (d - 1.15) / 2.2);
  const h = hash(65, i, j);
  if (h < 0.18 + near * 0.45) return h < 0.1 ? '5' : '3';
  return hash(66, i, j) < 0.3 ? '9' : hash(67, i >> 1, j) < 0.5 ? '$' : 'I';
};

export const forgeModel = (frame: number) => (): Quad[] => {
  const { w, d, table, h, cheek, back, cheekD } = FORGE;
  const Q: Quad[] = [];
  const M = part('maçonnerie', 6, '~', 'full');
  // la table : moellons, les deux angles du devant en pierre de taille ; le dessus, la terre et le charbon
  const quoins = (face: string): [boolean, boolean] => (face === 'S' ? [true, true] : face === 'W' ? [false, true] : face === 'E' ? [true, false] : [false, false]);
  const tableSide = masonry(11, quoins);
  const bed = forgeBed(frame);
  Q.push(...box(0, w, 0, d, 0, table, M, { top: (s, t, c) => (s < cheek || s > w - cheek ? (t > cheekD ? bed(s, t, c) : '+') : bed(s, t, c)), side: tableSide }));
  // le contrecœur : sa face du devant noircie au-dessus du feu
  const backSoot = (s: number, z: number, face: string, fw: number) => (face === 'S' ? Math.max(0, 0.9 - Math.abs(s - fw / 2) / 12) * Math.min(1, (z - table) / 8 + 0.4) : 0);
  const B = part('contrecœur', 7, '~', 'full');
  Q.push(...box(cheek, w - cheek, 0, back, table, h, B, { top: masonry(13), side: masonry(13, undefined, backSoot) }));
  // les joues : jusqu'à 1,60 m, la hotte pose dessus ; leur face du dedans un peu noircie
  const cheekSoot = (west: boolean) => (s: number, z: number, face: string) => (face === (west ? 'E' : 'W') ? 0.25 + 0.2 * Math.min(1, (z - table) / 10) - s * 0 : 0);
  const J = part('joue', 7, '~', 'full');
  Q.push(...box(0, cheek, 0, cheekD, table, h, J, { top: masonry(15), side: masonry(15, (f) => (f === 'S' ? [true, false] : [false, false]), cheekSoot(true)) }));
  Q.push(...box(w - cheek, w, 0, cheekD, table, h, J, { top: masonry(17), side: masonry(17, (f) => (f === 'S' ? [false, true] : [false, false]), cheekSoot(false)) }));
  // la tuyère : le bout de fer qui sort de la joue ouest vers le feu, à 10 cm au-dessus de la table
  Q.push(...box(cheek, cheek + 2, 8, 10, table + 1, table + 3, IRON_P('tuyère', 8), iron));
  // le feu : une face debout au droit du creuset
  const fire = forgeFire(frame);
  const fireTex: Tex = (s, t) => {
    const ch = fire[fire.length - 1 - Math.floor(t)]?.[Math.floor(s)];
    return !ch || ch === '.' ? null : ch;
  };
  Q.push({ o: [16, 10, table], u: [12, 0, 0], v: [0, 0, 9], n: [0, 1, 0], part: part('feu', 5, 'o', 'none'), tex: fireTex, face: 'S' });
  return Q;
};

// =====================================================================================================================
// Le four à chauffer (forge-oven), 140 × 140 × 130 : 28 × 28 × 26
// =====================================================================================================================

export const OVEN = { w: 28, d: 28, socle: 12, h: 26, r: 13, mouthW: 10, mouthH: 7 };

/** Une voûte en berceau le long de y, de rayon r autour de x = cx, posée à z = zb : n facettes, de l'ouest à l'est. */
function vaultY(cx: number, y0: number, y1: number, zb: number, r: number, P: Part, tex: Tex, n = 14): Quad[] {
  const Q: Quad[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI - (i / n) * Math.PI, a1 = Math.PI - ((i + 1) / n) * Math.PI, am = (a0 + a1) / 2;
    const p0: V3 = [cx + r * Math.cos(a0), y0, zb + r * Math.sin(a0)], p1: V3 = [cx + r * Math.cos(a1), y0, zb + r * Math.sin(a1)];
    Q.push({ o: p0, u: [0, y1 - y0, 0], v: [p1[0] - p0[0], 0, p1[2] - p0[2]], n: unit([Math.cos(am), 0, Math.sin(am)]), part: P, tex, face: 'slope' });
  }
  return Q;
}

export const ovenModel = (): Quad[] => {
  const { w, d, socle, r, mouthW, mouthH } = OVEN;
  const Q: Quad[] = [];
  const M = part('socle', 6, '~', 'full');
  Q.push(...box(0, w, 0, d, 0, socle, M, masonry(21, (f) => (f === 'S' ? [true, true] : [false, false]))));
  const V = part('voûte', 7, 'e', 'full');
  const cx = w / 2;
  Q.push(...vaultY(cx, 1, d - 1, socle, r, V, clay(23)));
  // les deux pignons de la voûte : des demi-disques ; au sud, la bouche en arc fermée par sa porte de tôle, la suie au-dessus
  const inArch = (s: number, t: number) => Math.hypot(s - r, t) <= r;
  const mouth = (s: number, t: number) => Math.abs(s - r) <= mouthW / 2 && (t <= mouthH - 2 || Math.hypot((s - r) / (mouthW / 2), (t - (mouthH - 2)) / 2) <= 1);
  const front: Tex = (s, t, c) => {
    if (!inArch(s, t)) return null;
    if (mouth(s, t)) {
      // la porte : la tôle, sa poignée, ses rivets
      const i = Math.floor(s - (r - mouthW / 2)), j = Math.floor(t);
      if (i === 0 || j === mouthH - 1) return '>';
      if ((i === 2 || i === mouthW - 3) && j % 3 === 1) return '(';
      if (i === Math.floor(mouthW / 2) && j === 3) return '(';
      return j > mouthH - 3 ? ')' : '<';
    }
    if (Math.abs(s - r) <= mouthW / 2 + 1.5 && t <= mouthH + 1.5) return t > mouthH ? '~' : 'e';
    // la suie qui lèche la voûte au-dessus de la bouche
    if (Math.abs(s - r) < 5 && t < mouthH + 5 && hash(25, Math.floor(s), Math.floor(t)) < 0.55) return '3';
    return clay(24)(s, t, c);
  };
  Q.push({ o: [cx - r, d - 1, socle], u: [2 * r, 0, 0], v: [0, 0, r], n: [0, 1, 0], part: V, tex: front, face: 'S' });
  Q.push({ o: [cx + r, 1, socle], u: [-2 * r, 0, 0], v: [0, 0, r], n: [0, -1, 0], part: V, tex: (s, t, c) => (inArch(s, t) ? clay(26)(s, t, c) : null), face: 'N' });
  // le départ du conduit, au dos de la voûte (30 × 30 cm de pierre) ; le reste du conduit est dans la scène
  Q.push(...box(cx - 3, cx + 3, 2, 8, socle + r - 3, OVEN.h, part('conduit', 8, '~', 'full'), masonry(27, () => [true, true])));
  return Q;
};

/** Un tronçon du petit conduit du four (30 × 30 × `h` px de pierre), pour la scène. */
export const ovenFlueModel = (h: number) => (): Quad[] => box(0, 6, 0, 6, 0, h, part('conduit', 8, '~', 'full'), masonry(28, () => [true, true]));

// =====================================================================================================================
// L'enclume (anvil) 70 × 20 × 30 et son billot (anvil-block) Ø 60 × 55
// =====================================================================================================================

/** L'enclume : la bigorne à l'ouest, la table, le talon, la taille et les pieds ; 14 × 4 × 6. */
export const anvilModel = (): Quad[] => {
  const Q: Quad[] = [];
  const P = IRON_P('enclume');
  Q.push(...box(4, 13, 0, 4, 0, 1.5, P, iron)); // les pieds
  Q.push(...box(6, 11, 1, 3, 1.5, 4, P, iron)); // la taille
  Q.push(...box(4, 14, 0.4, 3.6, 4, 6, P, iron)); // la table et le talon
  Q.push(...box(2.5, 4, 0.9, 3.1, 4.4, 6, P, iron)); // la bigorne, qui s'effile vers l'ouest
  Q.push(...box(1, 2.5, 1.4, 2.6, 5, 6, P, iron));
  Q.push(...box(0, 1, 1.7, 2.3, 5.4, 6, P, iron));
  return Q;
};

/** Un cylindre debout (n facettes) : le flanc, le dessus en disque. */
function cylinder(cx: number, cy: number, r: number, z0: number, z1: number, P: Part, side: Tex, top: Tex, n = 20): Quad[] {
  const Q: Quad[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI, am = (a0 + a1) / 2;
    const p0: V3 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0), z0], p1: V3 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1), z0];
    Q.push({ o: p0, u: [p1[0] - p0[0], p1[1] - p0[1], 0], v: [0, 0, z1 - z0], n: [Math.cos(am), Math.sin(am), 0], part: P, tex: side, face: 'S' });
  }
  Q.push({ o: [cx - r, cy - r, z1], u: [2 * r, 0, 0], v: [0, 2 * r, 0], n: [0, 0, 1], part: P, face: 'top', tex: (s, t, c) => (Math.hypot(s - r, t - r) > r ? null : top(s, t, c)) });
  return Q;
}

/** Le billot : un tronçon du gros, son écorce (sillons montants), le bois de bout et ses cernes sur le dessus. */
export const anvilBlockModel = (): Quad[] => {
  const bark: Tex = (_s, t, c) => {
    const nx = c.n[0], lit = nx < -0.35, dark = nx > 0.5;
    const i = Math.floor(c.p[0] * 1.6 + c.p[1]);
    const furrow = hash(71, i) < 0.35;
    if (Math.floor(t) === 0) return 'K';
    return dark ? (furrow ? 'K' : 'N') : lit ? (furrow ? 'm' : 'M') : furrow ? 'N' : 'm';
  };
  const grain: Tex = (s, t) => {
    const d = Math.hypot(s - 6, t - 6);
    if (d > 5.2) return '%';
    return Math.floor(d * 0.9) % 2 === 1 ? '*' : '^';
  };
  return cylinder(6, 6, 6, 0, 11, part('billot', 5, 'K', 'full'), bark, grain);
};

/** L'enclume sur son billot, d'une pièce (pour la planche de détail) : le dessus du billot à 55 cm. */
export const anvilOnBlockModel = (): Quad[] => [
  ...anvilBlockModel(),
  ...anvilModel().map((q) => ({ ...q, o: [q.o[0] - 1, q.o[1] + 4, q.o[2] + 11] as V3 })),
];

// =====================================================================================================================
// L'auge (quench-trough), 120 × 50 × 50 : 24 × 10 × 10
// =====================================================================================================================

export const troughModel = (): Quad[] => {
  const water: Tex = (s, t, c) => {
    const x = s, y = t, i = Math.floor(x), j = Math.floor(y);
    // le rebord de pierre : 10 cm (2 px) tout autour
    if (x < 2 || x > 22 || y < 2 || y > 8) return cutStone(31)(s, t, c);
    // l'eau noire, un reflet du ciel au nord
    if (j === 2) return i % 5 === 1 ? 'w' : 'q';
    return hash(32, i, j) < 0.08 ? 'q' : '5';
  };
  return box(0, 24, 0, 10, 0, 10, part('auge', 6, '~', 'full'), { top: water, side: cutStone(33) });
};

// =====================================================================================================================
// Le coffre à charbon (charcoal-bin), 100 × 100 × 70 : 20 × 20 × 14
// =====================================================================================================================

export const binModel = (): Quad[] => {
  const Q: Quad[] = [];
  const P = part('coffre', 6, '&', 'full');
  const coal: Tex = (s, t) => {
    const x = s, y = t, i = Math.floor(x), j = Math.floor(y);
    if (x < 1 || x > 19 || y < 1 || y > 19) return '^';
    const h = hash(41, i, j);
    return h < 0.12 ? ')' : h < 0.55 ? '5' : h < 0.85 ? '3' : '9';
  };
  Q.push(...box(0, 20, 0, 20, 0, 14, P, { top: coal, side: boards(43) }));
  // les montants d'angle, cloués
  for (const [x0, y0] of [[0, 19], [19, 19]]) Q.push(...box(x0, x0 + 1, y0, y0 + 1.2, 0, 14, part('montant', 7, '&', 'full'), timber(44 + x0)));
  return Q;
};

// =====================================================================================================================
// Le râtelier à outils (tool-rack), 120 × 15 × 100 : 24 × 3 × 20 ; les pinces et les marteaux pendus
// =====================================================================================================================

export const toolRackModel = (): Quad[] => {
  const Q: Quad[] = [];
  const W = part('râtelier', 5, '&', 'full');
  Q.push(...box(0, 2, 0, 3, 0, 20, W, timber(51)));
  Q.push(...box(22, 24, 0, 3, 0, 20, W, timber(52)));
  Q.push(...box(2, 22, 0.5, 2.5, 17, 19, W, timber(53)));
  Q.push(...box(2, 22, 0.5, 2.5, 4, 5.5, W, timber(54)));
  const T = IRON_P('outil', 7);
  const H = part('manche', 7, '&', 'full');
  // deux pinces (longues mâchoires), trois marteaux (manche, tête), une masse
  for (const x of [4, 6.5]) {
    Q.push(...box(x, x + 0.8, 3, 4, 6.5, 17, T, iron));
    Q.push(...box(x + 0.8, x + 1.6, 3, 4, 6.5, 15.5, T, iron));
  }
  for (const [x, len] of [[11, 7], [14, 6], [17, 8]] as const) {
    Q.push(...box(x, x + 0.9, 3, 4, 17 - len, 17, H, timber(55 + x)));
    Q.push(...box(x - 1, x + 2, 3, 4.5, 17 - len - 1.5, 17 - len, T, iron));
  }
  Q.push(...box(19.6, 20.6, 3, 4, 7, 17, H, timber(59)));
  Q.push(...box(18.3, 22, 3, 5, 5.2, 7.2, T, iron));
  return Q;
};

// =====================================================================================================================
// Le râtelier à barres (bar-rack), 160 × 40 × 120 : 32 × 8 × 24
// =====================================================================================================================

export const barRackModel = (): Quad[] => {
  const Q: Quad[] = [];
  const W = part('bâti', 5, '&', 'full');
  // le bac du bas, où reposent les bouts des barres ; les deux montants ; la traverse du haut, percée
  Q.push(...box(0, 32, 0, 8, 0, 3, W, boards(61)));
  Q.push(...box(0, 2, 2, 5, 3, 24, W, timber(62)));
  Q.push(...box(30, 32, 2, 5, 3, 24, W, timber(63)));
  Q.push(...box(2, 30, 2.5, 4.5, 19, 21, W, timber(64)));
  // les barres, debout, de trois épaisseurs, de hauteurs inégales
  const B = IRON_P('barre', 6);
  for (let k = 0; k < 11; k++) {
    const x = 3 + k * 2.4, top = 21 + Math.floor(hash(65, k) * 4);
    const y = 2 + (k % 3) * 1.6;
    Q.push(...box(x, x + (k % 4 === 0 ? 1.4 : 1), y, y + 1, 2, top, B, iron));
  }
  return Q;
};

// =====================================================================================================================
// La meule (grindstone), bâti 100 × 50 × 90 : 20 × 10 × 18 ; la pierre de Ø 80
// =====================================================================================================================

export const grindstoneModel = (): Quad[] => {
  const Q: Quad[] = [];
  const W = part('bâti', 5, '&', 'full');
  // quatre pieds, deux longerons, l'auge d'eau sous la pierre
  for (const [x, y] of [[0, 0], [18, 0], [0, 8], [18, 8]]) Q.push(...box(x, x + 2, y, y + 2, 0, 9, W, timber(70 + x + y)));
  Q.push(...box(0, 20, 0, 2, 7, 9, W, timber(78)));
  Q.push(...box(0, 20, 8, 10, 7, 9, W, timber(79)));
  Q.push(...box(6, 14, 2, 8, 0, 4, part('auge', 4, '&', 'full'), { top: (s, t) => (s < 1 || t < 1 || s > 7 || t > 5 ? '^' : '5'), side: boards(80) }));
  // la pierre : un disque de grès debout, l'axe nord-sud ; sa face sud au jour, sa tranche
  const r = 8, cx = 10, cz = 10, y0 = 4, y1 = 6;
  const grit: Tex = (s, t, c) => {
    const d = Math.hypot(s - r, t - r);
    if (d > r) return null;
    const i = Math.floor(c.p[0]), j = Math.floor(c.p[2]);
    if (Math.abs(d - 1.6) < 0.6) return '$'; // le moyeu
    if (d < 1.1) return '>';
    return (s < r && t > r) ? (hash(81, i, j) < 0.2 ? '$' : '#') : hash(82, i, j) < 0.25 ? 'I' : d > r - 1.2 ? '$' : 'I';
  };
  const G = part('meule', 6, '$', 'full');
  Q.push({ o: [cx - r, y1, cz - r], u: [2 * r, 0, 0], v: [0, 0, 2 * r], n: [0, 1, 0], part: G, tex: grit, face: 'S' });
  Q.push({ o: [cx + r, y0, cz - r], u: [-2 * r, 0, 0], v: [0, 0, 2 * r], n: [0, -1, 0], part: G, tex: grit, face: 'N' });
  // la tranche (la bande d'usure), en facettes
  const n = 24;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI, am = (a0 + a1) / 2;
    const p0: V3 = [cx + r * Math.cos(a0), y0, cz + r * Math.sin(a0)];
    Q.push({ o: p0, u: [0, y1 - y0, 0], v: [r * (Math.cos(a1) - Math.cos(a0)), 0, r * (Math.sin(a1) - Math.sin(a0))], n: [Math.cos(am), 0, Math.sin(am)], part: G, tex: (_s, _t, c) => (c.n[2] > 0.3 ? '#' : c.n[0] > 0.3 ? '$' : 'I'), face: 'slope' });
  }
  // l'axe de fer et la manivelle, au sud
  Q.push(...box(cx - 0.5, cx + 0.5, 0, 10, cz - 0.5, cz + 0.5, IRON_P('axe', 7), iron));
  Q.push(...box(cx - 0.5, cx + 3.5, 10, 11, cz - 0.5, cz + 0.5, IRON_P('manivelle', 7), iron));
  Q.push(...box(cx + 3, cx + 4, 10, 12.5, cz - 0.5, cz + 0.5, part('poignée', 7, '&', 'full'), timber(83)));
  return Q;
};

// =====================================================================================================================
// Le soufflet double (forge-bellows) sur son bâti, 180 × 75 × 110 : 36 × 15 × 22 (r0 : couché est-ouest, la buse à l'est)
// =====================================================================================================================

export const BELLOWS = { w: 36, d: 15, h: 22 };

/** La demi-largeur du soufflet à x (px depuis le dos) : le dos arrondi, puis la poire qui s'effile jusqu'à la buse. */
function bellowsHalf(x: number): number {
  if (x < 6) return 7.8 - ((6 - x) * (6 - x)) / 14;
  return Math.max(1.6, 7.8 - (x - 6) * (6.2 / 24));
}

export const bellowsModel = (): Quad[] => {
  const Q: Quad[] = [];
  const cy = 7.5;
  const F = part('bâti', 5, '&', 'full');
  // le bâti : quatre pieds, deux longerons, deux traverses
  for (const [x, y] of [[2, 1], [2, 12], [26, 3], [26, 10]]) Q.push(...box(x, x + 2, y, y + 2, 0, 11, F, timber(90 + x + y)));
  Q.push(...box(1, 29, 2, 3.5, 9.5, 11, F, timber(95)));
  Q.push(...box(1, 29, 11.5, 13, 9.5, 11, F, timber(96)));
  // le corps, tranche par tranche (1 px) : planche du bas, cuir du bas, planche du milieu, cuir du haut, planche du dessus
  const B1 = part('planche du bas', 6, '&', 'full'), L1 = part('cuir', 6, 'K', 'full'), B2 = part('planche du milieu', 7, '&', 'full');
  const L2 = part('cuir du haut', 7, 'K', 'full'), B3 = part('planche du dessus', 8, '&', 'full');
  const plank: Tex = (_s, _t, c) => (c.face === 'top' ? (hash(97, Math.floor(c.p[0] / 3), Math.floor(c.p[1])) < 0.2 ? '*' : '^') : c.face === 'E' || c.face === 'N' ? '%' : '*');
  for (let x = 0; x < 30; x++) {
    const h = bellowsHalf(x + 0.5), hl = Math.max(1.2, h - 0.6);
    Q.push(...box(x, x + 1, cy - h, cy + h, 11, 12, B1, plank));
    Q.push(...box(x, x + 1, cy - hl, cy + hl, 12, 15.5, L1, leather));
    Q.push(...box(x, x + 1, cy - h, cy + h, 15.5, 16.5, B2, plank));
    Q.push(...box(x, x + 1, cy - hl, cy + hl, 16.5, 21, L2, leather));
    Q.push(...box(x, x + 1, cy - h, cy + h, 21, 22, B3, plank));
  }
  // la buse de fer, et l'anneau de la chaîne sur la planche du dessus
  Q.push(...box(30, 36, cy - 1, cy + 1, 13, 15, IRON_P('buse', 8), iron));
  Q.push(...box(8, 10, cy - 1, cy + 1, 22, 23, IRON_P('anneau', 9), iron));
  return Q;
};

// =====================================================================================================================
// L'étau à pied (vise), 20 × 30 × 40 : sur l'établi, sa jambe jusqu'au sol
// =====================================================================================================================

/** L'étau vu du sud, à la taille du plancher de lisibilité (6 px) : les mâchoires, la vis et sa barre, la jambe. */
export const VISE: Grid = [
  '.>>>>.',
  '>((((o',
  '>)<<)o',
  '>))))o',
  '.>)<o.',
  '<(((((o',
  '..>)o..',
  '..>)o..',
];

// =====================================================================================================================
// La ferraille : un tas de fer à refondre, posé sur la caisse du jeu (crate) pleine
// =====================================================================================================================

export const SCRAP: Grid = [
  '...>(>..>>.',
  '.>()<>()<>.',
  '>(<)>(()<)o',
  '.<)<o<)<oo.',
];

// =====================================================================================================================
// Les images (les vues du jeu)
// =====================================================================================================================

export interface Piece {
  key: string;
  label: string;
  dims: { w: number; d: number; h: number; shape: 'box' | 'cylinder'; axis?: 'up'; ground?: boolean };
  ground: boolean;
  model: () => Quad[];
  views: number[];
}

export const PIECES: Piece[] = [
  { key: 'forge-hearth', label: 'FORGE MACONNEE', dims: { w: 220, d: 110, h: 160, shape: 'box', ground: true }, ground: true, model: forgeModel(0), views: [0, 1, 2, 3] },
  { key: 'forge-oven', label: 'FOUR A CHAUFFER', dims: { w: 140, d: 140, h: 130, shape: 'box', ground: true }, ground: true, model: ovenModel, views: [0, 1, 2, 3] },
  { key: 'forge-bellows', label: 'SOUFFLET DOUBLE', dims: { w: 180, d: 75, h: 110, shape: 'box' }, ground: false, model: bellowsModel, views: [0, 1, 2, 3] },
  { key: 'anvil', label: 'ENCLUME', dims: { w: 70, d: 20, h: 30, shape: 'box' }, ground: false, model: anvilModel, views: [0, 1] },
  { key: 'anvil-block', label: 'BILLOT D ENCLUME', dims: { w: 60, d: 60, h: 55, shape: 'cylinder', axis: 'up' }, ground: false, model: anvilBlockModel, views: [0] },
  { key: 'quench-trough', label: 'AUGE', dims: { w: 120, d: 50, h: 50, shape: 'box' }, ground: false, model: troughModel, views: [0, 1] },
  { key: 'charcoal-bin', label: 'COFFRE A CHARBON', dims: { w: 100, d: 100, h: 70, shape: 'box' }, ground: false, model: binModel, views: [0, 1, 2, 3] },
  { key: 'tool-rack', label: 'RATELIER A OUTILS', dims: { w: 120, d: 15, h: 100, shape: 'box' }, ground: false, model: toolRackModel, views: [0, 1, 2, 3] },
  { key: 'bar-rack', label: 'RATELIER A BARRES', dims: { w: 160, d: 40, h: 120, shape: 'box' }, ground: false, model: barRackModel, views: [0, 1, 2, 3] },
  { key: 'grindstone', label: 'MEULE', dims: { w: 100, d: 50, h: 90, shape: 'box' }, ground: false, model: grindstoneModel, views: [0, 1, 2, 3] },
];

/** L'image d'une pièce dans une vue (r0 à r3). */
export function pieceImage(key: string, v = 0): Grid {
  const p = PIECES.find((x) => x.key === key);
  if (!p) throw new Error(`forge : pas de pièce « ${key} »`);
  return view(p.model, v, p.ground);
}

/** Les trois images du feu de la forge, dans une vue. */
export function forgeFrames(v = 0): Grid[] {
  return [0, 1, 2].map((f) => view(forgeModel(f), v, true));
}
