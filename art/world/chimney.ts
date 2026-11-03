// La cheminée de pierre de la maison de Xéros (CONCEPTION « La maison de Xéros » ; retouche de Grégoire du 3 novembre 2026 : elle
// remplace le foyer central), adossée au mur nord de la salle commune, pièce par pièce pour le mode construction. Les matières et
// les couleurs sont celles de l'essai validé (art/proposals/cheminee.ts, dans le worktree de l'essai : moellons de calcaire montés
// au mortier de chaux, angles en pierre de taille, le dedans de l'âtre noirci de suie, le feu sur ses chenets).
//
// Le modèle en volumes de la maison (art/lib/volumes.ts), rendu pièce par pièce dans la projection du jeu. Ce sont des pièces
// posées les unes sur les autres, de profondeurs différentes (la hotte de 50 cm sur l'âtre de 80, le conduit sur la hotte, le
// couronnement qui déborde du conduit) : leur profondeur se voit à l'échelle du sol (`ground`, k = 1, comme les murs et le toit de
// la maison), sans quoi la hotte ne tomberait pas sur l'âtre au pixel près (le jeu les pose en (x, y − z), STYLE.md section 8).
//
// - `stone-hearth`, l'âtre (200 × 80 × 120 cm : 40 × 40 px) : le contrecœur et le dos (20 cm), deux jambages de pierre de taille
//   (30 cm), l'ouverture de 1,40 m × 1,10 m sous un linteau de pierre, la dalle et la cendre, le feu sur deux chenets (trois
//   images) ; quatre vues (le feu ne se voit que de face).
// - `chimney-hood`, la hotte (190 × 50 × 130 cm : 38 × 36 px) : moellons, un cordon de pierre de taille à 70 cm, la suie au bas ;
//   deux vues.
// - `chimney-flue`, un tronçon de conduit (100 × 50 × 100 cm : 20 × 30 px) : quatre assises de 25 cm, angles alternés long et court
//   (4 assises : l'alternance continue d'un tronçon à l'autre) ; le bas sans contour (le lit de mortier), le dessus, le noir du
//   conduit, n'est vu que sur le tronçon du haut : six empilés se lisent comme un seul conduit ; deux vues.
// - `chimney-cap`, le couronnement (110 × 60 × 10 cm : 22 × 14 px) : la dalle percée du conduit de fumée ; deux vues.
// Le pan de chaume percé (`thatch-roof-pierced`) est avec les autres pans, dans art/world/xeros-house.ts.

import { Canvas, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { stonePalette } from '../items/stones';
import { box, darker, hash, part, renderPiece, rotQuads, slabTex, type Quad, type Rot, type Tex } from '../lib/volumes';

const PAL = stonePalette;

/** Les vues du jeu (r0 à r3, un quart de tour de plus dans le sens des aiguilles d'une montre) dans les rotations du modèle. */
const VIEW_ROT: Rot[] = [0, 3, 2, 1];

// =====================================================================================================================
// La maçonnerie (l'essai, à l'identique)
// =====================================================================================================================

/** Les moellons d'une assise : leurs bords le long de la face (longueurs de 30 à 50 cm : 6 à 10 px), décalés d'une assise à l'autre. */
function joints(seed: number, course: number, w: number): number[] {
  const out: number[] = [];
  let a = -Math.floor(hash(seed, course, 1) * 8);
  while (a < w + 10) {
    out.push(a);
    a += 6 + Math.floor(hash(seed, course, a, 2) * 5);
  }
  return out;
}

interface MasonryOpts {
  /** Les angles en pierre de taille, aux deux bouts de la face ; leur longueur, longue et courte (px). */
  quoins?: boolean;
  quoinW?: [number, number];
  /** Le noir de suie, là où il est (le contrecœur). */
  soot?: (s: number, z: number, face: string) => boolean;
  /** La suie qui monte : sous cette hauteur, la pierre est assombrie par places (le bas de la hotte). */
  smoke?: number;
}

/**
 * Les assises de moellons de calcaire montés au mortier : 25 cm par assise (5 px : le joint de lit en bas, la pierre, son haut
 * éclairé) ; les joints montants décalés ; deux teintes de pierre tirées par moellon ; les angles en pierre de taille, alternés long
 * et court ; le dessus en dalles. Les assises suivent la hauteur z de la pièce, d'une face à l'autre.
 */
function masonry(seed: number, o: MasonryOpts = {}): Tex {
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
      const long = (course + seed) % 2 === 0, qw = (o.quoinW ?? [7, 4])[long ? 0 : 1];
      const inQuoin = o.quoins && (i < qw || i >= Math.floor(w) - qw);
      if (r < 1) k = 'E';
      else if (inQuoin) {
        const edge = i < qw ? i === qw - 1 : i === Math.floor(w) - qw;
        k = edge ? 'E' : r >= 4 ? '!' : r < 2 ? '=' : '+';
      } else {
        const js = joints(seed, course, w), stone = js.filter((a) => a <= i).length;
        // un moellon sur trois est moins haut que l'assise : son lit monte d'un pixel, le mortier le comble
        const low = hash(seed, course, stone, 7) < 0.33;
        if (js.includes(i) || (low && r < 2)) k = 'E';
        else {
          const light = hash(seed, course, stone, 5) < 0.28, dark = !light && hash(seed, course, stone, 8) < 0.3;
          k = r >= 4 ? (light ? '+' : '=') : r < (low ? 3 : 2) ? (dark ? '~' : ';') : light ? '=' : dark ? ';' : '=';
          if (k === '=' && r >= 2 && r < 4 && hash(seed, course, stone, 6) < 0.2 && i % 3 === 0) k = ';';
        }
      }
      if (o.smoke !== undefined && z < o.smoke && hash(seed, Math.floor(s / 2), Math.floor(z), 9) < 0.55 * (1 - z / o.smoke) + 0.15) k = darker(k);
    }
    if (o.soot?.(s, c.p[2], c.face)) k = k === 'E' ? 'o' : k === '!' || k === '+' ? ';' : '~';
    return k;
  };
}

/** La pierre de taille des jambages et du linteau : des blocs dressés de 30 cm de haut (6 px), joints fins, le haut éclairé. */
function ashlar(seed: number): Tex {
  return (s, _t, c) => {
    if (c.face === 'top') return Math.floor(c.p[1]) % 6 === 5 ? '=' : '+';
    const z = c.p[2], course = Math.floor(z / 6), r = z - course * 6, i = Math.floor(s);
    if (r < 1) return 'E';
    // un joint montant par assise sur une face large, décalé d'une assise à l'autre
    const cut = Math.floor(c.w / 2) + (course % 2 ? 3 : -3);
    if (c.w > 8 && i === cut) return 'E';
    if (r >= 5) return '!';
    return r < 2 ? (hash(seed, course, i >> 2) < 0.4 ? ';' : '=') : hash(seed, course, i, 3) < 0.12 ? '=' : '+';
  };
}

/** Le sol de l'âtre : la cendre (z r Z), des braises (i) vers le milieu, sous le feu ; le devant, la dalle. */
const ashTex: Tex = (_s, _t, c) => {
  const x = Math.floor(c.p[0]), y = Math.floor(c.p[1]);
  if (c.face !== 'top') return 'Z';
  return hash(31, x, y) < 0.1 ? 'i' : hash(32, x >> 1, y) < 0.4 ? 'r' : 'z';
};

// =====================================================================================================================
// Le feu de l'âtre (l'essai, à la hauteur de l'ouverture)
// =====================================================================================================================

const FIRE_W = 26;
const FIRE_H = 20;

/**
 * Le feu de l'âtre : deux chenets de fer (Z o), trois bûches de 1 m en écorce (M m N K) posées en travers, les braises, et les
 * flammes (i dehors, h, H au cœur), plus hautes et plus larges que celles du foyer rond. Trois images : les flammes vacillent.
 */
function hearthFire(frame: number): Grid {
  const W = FIRE_W, H = FIRE_H, c = new Canvas(W, H);
  for (let x = 3; x < W - 3; x++) {
    c.set(x, H - 3, hash(41, x, frame) < 0.5 ? 'i' : 'h');
    if (x > 4 && x < W - 5) c.set(x, H - 2, hash(42, x) < 0.35 ? 'i' : 'z');
  }
  // les chenets : un montant, une tête en boule, le pied
  for (const x of [5, 19]) {
    c.rect(x, H - 9, 2, 7, 'Z').rect(x + 1, H - 9, 1, 7, 'o');
    c.rect(x - 1, H - 10, 3, 2, 'Z').set(x + 1, H - 10, 'o');
    c.rect(x - 1, H - 2, 4, 1, 'o');
  }
  const log = (x0: number, x1: number, y: number) => {
    c.rect(x0, y, x1 - x0, 1, 'M').rect(x0, y + 1, x1 - x0, 1, 'm').rect(x0, y + 2, x1 - x0, 1, 'N');
    c.rect(x0 - 1, y, 1, 3, '*').set(x0 - 1, y, '^');
    c.set(x1, y, 'K').set(x1, y + 1, 'K').set(x1, y + 2, 'K');
    for (let x = x0 + 2; x < x1 - 1; x += 5) c.set(x + (y % 2), y + 1, 'N');
  };
  // la bûche de derrière, les flammes, puis les deux de devant
  log(4, 22, H - 8);
  for (let i = 0; i < 18; i++) {
    const x = 4 + i;
    const f = Math.sin(((i + 0.5) / 18) * Math.PI);
    const hgt = Math.round((f * 0.85 + 0.15) * 12 * (0.72 + hash(43, i, frame) * 0.4));
    const base = H - 7;
    c.line(x, base, x, base - hgt, 'i');
    if (hgt > 3) c.line(x, base, x, base - Math.round(hgt * 0.7), 'h');
    if (hgt > 6) c.line(x, base, x, base - Math.round(hgt * 0.38), 'H');
  }
  // des langues qui se détachent en haut
  for (const [x, y] of [[9, 1], [14, 0], [17, 2]] as const) c.set(x, y + (frame % 2), 'h').set(x, y + 1 + (frame % 2), 'i');
  log(2, 20, H - 6);
  log(6, 24, H - 4);
  return c.toGrid();
}

// =====================================================================================================================
// L'âtre
// =====================================================================================================================

/** L'âtre, en px (5 cm) : x de 0 à 40 (2 m), y de 0 (le mur nord) à 16 (80 cm), z de 0 à 24 (1,20 m). */
const HEARTH = {
  w: 40, d: 16, h: 24,
  /** Le dos et le contrecœur : 20 cm. */
  back: 4,
  /** Les jambages : 30 cm ; l'ouverture entre eux, 1,40 m. */
  jamb: 6,
  /** Le dessous du linteau (1,10 m) et sa profondeur (30 cm, au devant). */
  lintel: 22, lintelD: 6,
};

const hearthModel = (frame: number) => (): Quad[] => {
  const { w, d, h, back, jamb, lintel, lintelD } = HEARTH;
  const Q: Quad[] = [];
  const M = part('maçonnerie', 6, '~', 'full');
  const T = part('pierre de taille', 7, '~', 'full');
  // le dos, et sa face du dedans entre les jambages : le contrecœur, noirci
  const sooted = (s: number, z: number, face: string) => face === 'S' && s > jamb && s < w - jamb && z < lintel + 1;
  Q.push(...box(0, w, 0, back, 0, h, M, masonry(3, { quoins: true, soot: sooted })));
  // les jambages, en pierre de taille
  Q.push(...box(0, jamb, back, d, 0, h, T, ashlar(5)));
  Q.push(...box(w - jamb, w, back, d, 0, h, T, ashlar(6)));
  // le linteau sur les jambages, au devant
  Q.push(...box(jamb, w - jamb, d - lintelD, d, lintel, h, T, ashlar(7)));
  // l'avaloir : entre le contrecœur et le linteau, la gorge noircie où monte la fumée (la hotte posée dessus la couvre ; seul, l'âtre
  // ne montre pas sa cendre par le haut)
  Q.push({ o: [jamb, back, h - 0.5], u: [w - 2 * jamb, 0, 0], v: [0, d - lintelD - back, 0], n: [0, 0, 1], part: part('avaloir', 5, 'o', 'none'), tex: (_s, t) => (t < 1 ? '~' : 'o'), face: 'top' });
  // le sol de l'âtre : la cendre, et la dalle au devant
  Q.push(...box(jamb, w - jamb, back, d - 3, 0, 0.6, part('cendre', 2, 'Z', 'none'), ashTex));
  Q.push(...box(jamb, w - jamb, d - 3, d, 0, 1, part("dalle de l'âtre", 3, '~', 'full'), slabTex(9)));
  // le feu, dans l'ouverture : une face debout au milieu de sa profondeur, les bûches sur la cendre
  const fire = hearthFire(frame);
  const fx0 = (w - FIRE_W) / 2, fy = back + 5;
  const fireTex: Tex = (s, t) => {
    const ch = fire[FIRE_H - 1 - Math.floor(t)]?.[Math.floor(s)];
    return !ch || ch === '.' ? null : ch;
  };
  Q.push({ o: [fx0, fy, 0.6], u: [FIRE_W, 0, 0], v: [0, 0, FIRE_H], n: [0, 1, 0], part: part('feu', 4, 'o', 'none'), tex: fireTex, face: 'S' });
  return Q;
};

// =====================================================================================================================
// La hotte, le conduit, le couronnement
// =====================================================================================================================

/**
 * La hotte (38 × 10 × 26 px, 1,90 m × 50 cm × 1,30 m), d'une seule largeur (vue de côté, son dessus a la longueur de sa boîte) : le
 * bas en moellons noircis par la fumée qui lèche le manteau, un cordon de pierre de taille de 10 cm à 70 cm (le ressaut des
 * hottes de pays, marqué sans sortir de la boîte), le haut en moellons ; les angles alternés long et court.
 */
const hood = (): Quad[] => {
  const M = part('maçonnerie', 6, '~', 'full');
  return [
    ...box(0, 38, 0, 10, 0, 14, M, masonry(8, { quoins: true, smoke: 8 })),
    ...box(0, 38, 0, 10, 14, 16, part('cordon', 6, '~', 'full'), slabTex(5)),
    ...box(0, 38, 0, 10, 16, 26, M, masonry(9, { quoins: true })),
  ];
};

/** Le dessus du conduit (seul le tronçon du haut le montre) : le tour de pierre, le noir du conduit de fumée (70 × 20 cm), sa lèvre de suie. */
const flueTop: Tex = (s, t, c) => {
  const e = Math.min(s, t, c.w - s, c.h - t);
  if (e >= 3) return 'o';
  if (e >= 2) return '~';
  return hash(13, Math.floor(s), Math.floor(t)) < 0.25 ? '!' : '+';
};

/** Un tronçon de conduit (20 × 10 × 20 px) : quatre assises de 25 cm. */
const flue = (): Quad[] => box(0, 20, 0, 10, 0, 20, part('conduit', 6, '~', 'full'), { top: flueTop, side: masonry(10, { quoins: true, quoinW: [5, 3] }) });

/** La dalle de couronnement (22 × 12 × 2 px), percée du conduit de fumée au droit de celui du conduit. */
const capTex: Tex = (s, t, c) => {
  if (c.face === 'top' && s >= 4 && s < c.w - 4 && t >= 4 && t < c.h - 4) return s < 5 || t >= c.h - 5 ? '~' : 'o';
  return slabTex(17)(s, t, c);
};
const cap = (): Quad[] => box(0, 22, 0, 12, 0, 2, part('couronnement', 7, '~', 'full'), capTex);

// =====================================================================================================================
// Les images
// =====================================================================================================================

/**
 * Le bas d'un tronçon de conduit sans contour : le joint de lit (E) au lieu de l'OUTLINE, les deux coins gardés ; posé sur le
 * tronçon du dessous, il le continue sans couture (le contour du bas reste celui du conduit entier, sur la hotte).
 */
function seamless(g: Grid): Grid {
  const last = g[g.length - 1];
  const row = [...last].map((ch, i) => (ch === 'o' && i > 0 && i < last.length - 1 && g[g.length - 2][i] !== '.' ? 'E' : ch)).join('');
  return [...g.slice(0, -1), row];
}

const view = (model: () => Quad[], v: number) => renderPiece(rotQuads(model(), VIEW_ROT[v], [0, 0]), { k: 1 });

/** Une planche à une animation `burn` de trois images (le feu ne se voit que de face : de côté et de dos, trois fois la même). */
function burning(name: string, frames: Grid[]): SpriteSheetSource {
  const w = Math.max(...frames.map((g) => g[0].length)), h = Math.max(...frames.map((g) => g.length));
  return { kind: 'spritesheet', name, frameW: w, frameH: h, palette: PAL, animations: { burn: { frames, frameRate: 7, repeat: -1 } } };
}

const SUFFIX = ['', '-r1', '-r2', '-r3'];

const sources = [
  ...[0, 1, 2, 3].map((v) => burning(`stone-hearth${SUFFIX[v]}`, [0, 1, 2].map((f) => view(hearthModel(f), v)))),
  ...[0, 1].map((v) => ({ kind: 'image' as const, name: `chimney-hood${v ? '-ns' : ''}`, palette: PAL, grid: view(hood, v) })),
  ...[0, 1].map((v) => ({ kind: 'image' as const, name: `chimney-flue${v ? '-ns' : ''}`, palette: PAL, grid: seamless(view(flue, v)) })),
  ...[0, 1].map((v) => ({ kind: 'image' as const, name: `chimney-cap${v ? '-ns' : ''}`, palette: PAL, grid: view(cap, v) })),
];

export default sources;
