// La cheminée paysanne où l'on cuisine, dans la maison de Xéros (CONCEPTION « La maison de Xéros »), adossée au mur nord de la salle
// commune, pièce par pièce pour le mode construction. Dessins de la proposition validée par Grégoire (art/proposals/cheminee-2.ts,
// planche .art-preview/cheminee-2.png), avec sa retouche : « la hotte descendue à 1,50 m, posée sur le manteau, sans vide derrière ».
// Le mode construction pose une pièce sur le plus haut dessus que recoupe son emprise : la hotte (y 30–110) ne recoupe pas le
// manteau (y 110–140) et se pose donc sur les jambages et le contrecœur, à 1,50 m, sa face sud contre le dos du manteau, ses 20 cm
// du bas cachés derrière lui.
//
// Repère (cm, la maison) : x vers l'est, y vers le sud, z vers le haut, l'origine sur l'axe du poteau nord-ouest ; la face intérieure
// du solin nord à y = 30. Le modèle en volumes de la maison (art/lib/volumes.ts), rendu pièce par pièce dans la projection des pièces
// de bâtiment (`ground`, STYLE.md section 8 : (x, y − z), la profondeur à l'échelle du sol) : les pièces posées les unes sur les
// autres tombent au pixel près. Gabarit `ground` : largeur W, hauteur H + D.
//
// - `stone-hearth`, l'âtre, 220 × 110 × 150 cm (x 660–880, y 30–140, z 0–150) : deux jambages de moellons de 30 cm aux angles en
//   pierre de taille, le contrecœur de moellons de 20 cm au fond, noirci ; l'ouverture de 1,60 m de large, 1,50 m de haut, 0,90 m
//   de profond ; la sole en dalles au ras du sol, les cendres ; le feu au milieu (deux chenets, trois bûches, trois images). Quatre
//   vues. Rien d'autre : la place de la crémaillère, des landiers et du potager reste libre (docs/objets/stone-hearth.md).
// - Le manteau : la poutre équarrie du jeu (la pièce de bois, normal, 20 × 20, 2,20 m, est-ouest) sur les jambages, z 150–170, au
//   devant (y 110–140). Pas dessinée ici : le dessin du jeu (`composeWood`).
// - `chimney-hood`, la hotte droite, 220 × 80 × 100 cm (y 30–110, z 150–250) : torchis sur clayonnage chaulé, parois de 15 cm,
//   posée sur les jambages et le contrecœur ; noircie au bas par la fumée qui lèche le manteau ; les murs jusqu'à 90 cm, puis un
//   glacis de 10 cm à l'est et à l'ouest jusqu'au plat du dessus, au droit du conduit (le nord et le sud montent jusqu'à lui).
//   Quatre vues (le devant noirci, le dos contre le mur).
// - `chimney-flue`, un tronçon de conduit, 100 × 80 × 100 cm hors tout (passage de 60 × 40, parois de pierre de 20), centré sur la
//   hotte (x 720–820, y 30–110) ; cinq tronçons de z 250 à 750. Deux vues.
// - `chimney-cap`, le couronnement, 140 × 100 × 10 cm (x 700–840, y 20–120), z 750–760 : il déborde du conduit de 20 cm à l'est et à
//   l'ouest, de 10 au nord et au sud ; la souche à 1 m au-dessus du faîte (658). Deux vues.
// Les places sont celles de la maison rebâtie en mode construction (grille de 20 cm, tools/lib/maison-xeros.ts) : la cheminée 10 cm
// plus à l'ouest que dans la proposition (x 660 au lieu de 670).
// Le pan de chaume percé (`thatch-roof-pierced`) est avec les autres pans, dans art/world/xeros-house.ts : son trou se tire de
// `PAN_STACK` ci-dessous.

import { Canvas, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { stonePalette } from '../items/stones';
import { box, hash, lumps, part, renderPiece, rotQuads, slabTex, unit, type Quad, type Rot, type Tex, type V3 } from '../lib/volumes';

export const PAL = stonePalette;

/** Les vues du jeu (r0 à r3, un quart de tour de plus dans le sens des aiguilles d'une montre) dans les rotations du modèle. */
export const VIEW_ROT: Rot[] = [0, 3, 2, 1];

// =====================================================================================================================
// Les mesures (px du jeu, 5 cm)
// =====================================================================================================================

/** L'âtre : 44 × 22 × 30 ; les jambages de 6, le contrecœur de 4 ; l'ouverture 32 × 18 × 30. */
export const HEARTH = { w: 44, d: 22, h: 30, jamb: 6, back: 4 };
/**
 * La hotte : 44 × 16 × 20 ; parois de 3 ; les murs jusqu'à 18, le glacis de 18 à 20 à l'est et à l'ouest ; le plat du dessus au
 * droit du conduit (x 12 à 32), sur toute la profondeur.
 */
export const HOOD = { w: 44, d: 16, h: 20, wall: 3, eaves: 18, flat: [12, 32] as [number, number], hidden: 4 };
/** Un tronçon de conduit : 20 × 16 × 20, parois de 4 (passage 12 × 8). */
export const FLUE = { w: 20, d: 16, h: 20, wall: 4 };
/** Le couronnement : 28 × 20 × 2, percé au droit du passage. */
export const CAP = { w: 28, d: 20, h: 2 };
export const FLUE_COUNT = 5;

/** Les places dans la maison : coin nord-ouest de la boîte (x, y) et le bas (z), en px. */
export const AT = {
  hearth: [132, 6, 0] as V3,
  mantel: [132, 22, 30] as V3,
  hood: [132, 6, 30] as V3,
  flue: (k: number): V3 => [144, 6, 50 + 20 * k],
  cap: [140, 4, 150] as V3,
};

/**
 * Du repère de la maison (px) au repère du pan, quand le pan percé sert de pan nord (vue r2, posé à x = −40, y = −65 cm : l'aimant du
 * mode construction le tire de 5 cm au nord, tools/lib/maison-xeros.ts) : le demi-tour autour du faîte, (x, y) → (268 − x, 129 − y)
 * (la relation de la proposition, (268 − x, 130 − y) pour le pan à y = −60, avancée d'un pixel au nord avec lui).
 */
export const toPan = (x: number, y: number): [number, number] => [268 - x, 129 - y];
const panBox = (x0: number, x1: number, y0: number, y1: number) => {
  const [a, b] = toPan(x1, y1), [c, d] = toPan(x0, y0);
  return { x0: a, x1: c, y0: b, y1: d };
};
/** La souche (le conduit, puis le couronnement) dans le repère du pan, avec ses hauteurs (px). */
export const PAN_STACK = [
  { ...panBox(AT.flue(0)[0], AT.flue(0)[0] + FLUE.w, AT.flue(0)[1], AT.flue(0)[1] + FLUE.d), z0: AT.flue(0)[2], z1: AT.cap[2] },
  { ...panBox(AT.cap[0], AT.cap[0] + CAP.w, AT.cap[1], AT.cap[1] + CAP.d), z0: AT.cap[2], z1: AT.cap[2] + CAP.h },
];

// =====================================================================================================================
// La maçonnerie : moellons de calcaire au mortier de chaux, pierre de taille aux angles
// =====================================================================================================================

/** Les moellons d'une assise : leurs bords le long de la face (30 à 50 cm : 6 à 10 px), décalés d'une assise à l'autre. */
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
  /** Les angles en pierre de taille : à quel bout de chaque face (début, fin : le sens u de la face). */
  quoins?: (face: string) => [boolean, boolean];
  quoinW?: [number, number];
  /** La suie : la part assombrie (0 à 1) d'un point de la face. */
  soot?: (s: number, z: number, face: string, w: number) => number;
}

/** Les assises de 25 cm (5 px : le joint de lit, la pierre, son haut éclairé), joints montants décalés, deux teintes par moellon. */
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
      const [qa, qb] = o.quoins?.(c.face) ?? [false, false];
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
          if (k === '=' && r >= 2 && r < 4 && hash(seed, course, stone, 6) < 0.2 && i % 3 === 0) k = ';';
        }
      }
    }
    const f = o.soot?.(s, z, c.face, c.w) ?? 0;
    // la suie par plaques de 2 × 2 px : le mortier devient noir, la pierre brun-gris
    if (f > 0 && hash(seed + 77, Math.floor(s / 2), Math.floor(z / 2)) < f) k = k === 'E' ? 'o' : k === '!' || k === '+' ? ';' : '~';
    return k;
  };
}

/** La pierre de taille (le devant des jambages) : blocs dressés de 30 cm (6 px), le haut éclairé. */
function ashlar(seed: number): Tex {
  return (s, _t, c) => {
    if (c.face === 'top') return Math.floor(c.p[1]) % 6 === 5 ? '=' : '+';
    const z = c.p[2], course = Math.floor(z / 6), r = z - course * 6, i = Math.floor(s);
    if (r < 1) return 'E';
    if (r >= 5) return '!';
    return r < 2 ? (hash(seed, course, i >> 2) < 0.4 ? ';' : '=') : hash(seed, course, i, 3) < 0.12 ? '=' : '+';
  };
}

/** Le dessus des jambages et du contrecœur : la dernière assise arasée, de grandes pierres plates. */
const arase: Tex = (_s, _t, c) => {
  const i = Math.floor(c.p[0]), j = Math.floor(c.p[1]);
  return j % 7 === 6 || (i + (j > 10 ? 3 : 0)) % 9 === 0 ? 'E' : hash(19, i >> 2, j >> 2) < 0.3 ? '!' : '+';
};

// =====================================================================================================================
// La sole et le feu
// =====================================================================================================================

/** La sole : des dalles de calcaire au ras du sol (joints au mortier), la cendre sous le feu, quelques braises. */
const soleTex: Tex = (s, t, c) => {
  if (c.face !== 'top') return '=';
  // (s, t) sur le dessus : depuis le coin nord-ouest de la sole (x = jambage, y = contrecœur)
  const x = s + HEARTH.jamb, y = t + HEARTH.back;
  const i = Math.floor(x), j = Math.floor(y);
  // la cendre : une nappe autour du feu, plus large que lui, au bord mangé
  const d = Math.hypot((x - HEARTH.w / 2) / 14, (y - 13) / 5.5);
  if (d < 1 - hash(33, i, j) * 0.25) return hash(31, i, j) < 0.07 ? 'i' : hash(32, i >> 1, j) < 0.45 ? 'r' : 'z';
  // les dalles : 40 × 30 cm environ, les rangs décalés
  const row = Math.floor((j - 4) / 6), off = row % 2 ? 4 : 0;
  if ((j - 4) % 6 === 5 || (i + off) % 8 === 0) return 'E';
  return hash(34, row, Math.floor((i + off) / 8)) < 0.3 ? '=' : hash(35, i, j) < 0.1 ? ';' : '+';
};

export const FIRE_W = 30;
export const FIRE_H = 22;

/**
 * Le feu (30 × 22 px, 1,50 × 1,10 m) : deux chenets de fer (Z o) à 90 cm l'un de l'autre, trois bûches de 1,10 m en écorce (M m N K)
 * posées en travers, les braises, et les flammes (i dehors, h, H au cœur), jusqu'à 70 cm. Trois images : les flammes vacillent.
 */
export function hearthFire(frame: number): Grid {
  const W = FIRE_W, H = FIRE_H, c = new Canvas(W, H);
  for (let x = 3; x < W - 3; x++) {
    c.set(x, H - 3, hash(41, x, frame) < 0.5 ? 'i' : 'h');
    if (x > 4 && x < W - 5) c.set(x, H - 2, hash(42, x) < 0.35 ? 'i' : 'z');
  }
  // les chenets : un montant, une tête en boule, le pied
  for (const x of [5, 23]) {
    c.rect(x, H - 10, 2, 8, 'Z').rect(x + 1, H - 10, 1, 8, 'o');
    c.rect(x - 1, H - 11, 3, 2, 'Z').set(x + 1, H - 11, 'o');
    c.rect(x - 1, H - 2, 4, 1, 'o');
  }
  const log = (x0: number, x1: number, y: number) => {
    c.rect(x0, y, x1 - x0, 1, 'M').rect(x0, y + 1, x1 - x0, 1, 'm').rect(x0, y + 2, x1 - x0, 1, 'N');
    c.rect(x0 - 1, y, 1, 3, '*').set(x0 - 1, y, '^');
    c.set(x1, y, 'K').set(x1, y + 1, 'K').set(x1, y + 2, 'K');
    for (let x = x0 + 2; x < x1 - 1; x += 5) c.set(x + (y % 2), y + 1, 'N');
  };
  // la bûche de derrière, les flammes, puis les deux de devant
  log(4, 26, H - 9);
  const n = 22;
  for (let i = 0; i < n; i++) {
    const x = 4 + i;
    const f = Math.sin(((i + 0.5) / n) * Math.PI);
    const hgt = Math.round((f * 0.85 + 0.15) * 14 * (0.72 + hash(43, i, frame) * 0.4));
    const base = H - 8;
    c.line(x, base, x, base - hgt, 'i');
    if (hgt > 3) c.line(x, base, x, base - Math.round(hgt * 0.7), 'h');
    if (hgt > 6) c.line(x, base, x, base - Math.round(hgt * 0.38), 'H');
  }
  // des langues qui se détachent en haut
  for (const [x, y] of [[10, 1], [15, 0], [20, 2]] as const) c.set(x, y + (frame % 2), 'h').set(x, y + 1 + (frame % 2), 'i');
  log(2, 24, H - 7);
  log(6, 28, H - 5);
  return c.toGrid();
}

// =====================================================================================================================
// L'âtre
// =====================================================================================================================

/** L'âtre en local (x 0–44, y 0–22, z 0–30), à l'image `frame` du feu. */
export const hearthModel = (frame: number) => (): Quad[] => {
  const { w, d, h, jamb, back } = HEARTH;
  const Q: Quad[] = [];
  const M = part('maçonnerie', 6, '~', 'full');
  // le contrecœur : sa face du dedans noircie, plus fort au milieu et en haut (la fumée monte contre lui)
  const backSoot = (s: number, z: number, face: string, fw: number) => (face === 'S' ? 0.55 + 0.45 * (1 - Math.abs(s - fw / 2) / (fw / 2)) * Math.min(1, z / 12) : 0);
  Q.push(...box(jamb, w - jamb, 0, back, 0, h, M, { top: arase, side: masonry(3, { soot: backSoot }) }));
  // les jambages : moellons, l'angle du devant en pierre de taille ; leur face du dedans noircie vers le fond
  const inner = (west: boolean) => (s: number, z: number, face: string, fw: number) => {
    if (face !== (west ? 'E' : 'W')) return 0;
    const fromBack = west ? s / fw : 1 - s / fw; // 1 au contrecœur, 0 au devant (la face E part du sud, la face W du nord)
    return Math.max(0, fromBack * 0.9 - 0.15) * (0.5 + 0.5 * Math.min(1, z / 14));
  };
  // la face du devant (S) toute en pierre de taille ; les flancs : l'angle du devant (le bout sud de la face)
  const jambTex = (west: boolean, seed: number): Tex => {
    const m = masonry(seed, {
      quoins: (face) => (face === 'W' ? [false, true] : face === 'E' ? [true, false] : face === 'N' ? (west ? [false, true] : [true, false]) : [false, false]),
      soot: inner(west),
    });
    const a = ashlar(seed + 1);
    return (s, t, c) => (c.face === 'top' ? arase(s, t, c) : c.face === 'S' ? a(s, t, c) : m(s, t, c));
  };
  Q.push(...box(0, jamb, 0, d, 0, h, part('jambage', 7, '~', 'full'), jambTex(true, 5)));
  Q.push(...box(w - jamb, w, 0, d, 0, h, part('jambage', 7, '~', 'full'), jambTex(false, 6)));
  // l'avaloir : entre les jambages, la gorge noircie où monte la fumée (la hotte et le manteau la couvrent ; seul, l'âtre ne laisse
  // pas voir à travers lui)
  Q.push({ o: [jamb, back, h - 0.5], u: [w - 2 * jamb, 0, 0], v: [0, d - back, 0], n: [0, 0, 1], part: part('avaloir', 5, 'o', 'none'), tex: (_s, t) => (t < 1 ? '~' : 'o'), face: 'top' });
  // la sole, au ras du sol
  Q.push(...box(jamb, w - jamb, back, d, 0, 0.6, part('sole', 2, '~', 'none'), soleTex));
  // le feu : une face debout au milieu de l'ouverture, les bûches sur la cendre
  const fire = hearthFire(frame);
  const fx0 = (w - FIRE_W) / 2, fy = back + 9;
  const fireTex: Tex = (s, t) => {
    const ch = fire[FIRE_H - 1 - Math.floor(t)]?.[Math.floor(s)];
    return !ch || ch === '.' ? null : ch;
  };
  Q.push({ o: [fx0, fy, 0.6], u: [FIRE_W, 0, 0], v: [0, 0, FIRE_H], n: [0, 1, 0], part: part('feu', 4, 'o', 'none'), tex: fireTex, face: 'S' });
  return Q;
};

// =====================================================================================================================
// La hotte
// =====================================================================================================================

/** La chaux sur le torchis (les mottes de art/lib/volumes.ts `daub`, sans la terre rejaillie au pied : la hotte est en l'air). */
function limeTex(seed: number): Tex {
  return (s, t) => {
    const L = lumps(seed, s, t);
    if (L.e < 0.35 && L.id < 0.12 && L.dx - L.dy > 0) return ';';
    if (L.e < 0.6 && L.dx - L.dy > 0.8 && L.id < 0.6) return '=';
    if (-L.dx + L.dy > 1.8 && L.id > 0.45) return '!';
    return '+';
  };
}

/**
 * La suie au bas de la hotte : `strength` au milieu de la face, moins sur les côtés ; pleine jusqu'à `from` px au-dessus du bas
 * (caché derrière le manteau, sur le devant), puis qui s'éteint jusqu'à `top`.
 */
function sooted(inner: Tex, seed: number, strength: number, top: number, from = 0): Tex {
  return (s, t, c) => {
    let k = inner(s, t, c);
    if (k === null) return k;
    const z = c.p[2], mid = 1 - Math.abs(s - c.w / 2) / (c.w / 2);
    const f = strength * Math.min(1, 1 - (z - from) / (top - from)) * (0.45 + 0.55 * mid);
    // par plaques de 2 px, des coulures qui montent : la chaux grise (= ;), noire au ras du manteau (~ E o)
    const h = hash(seed, Math.floor(s / 2), Math.floor(z / 2));
    if (z < top && h < f) k = f > 0.7 ? (h < f * 0.5 ? 'o' : '~') : f > 0.4 ? (h < f * 0.5 ? '~' : ';') : ';';
    return k;
  };
}

/** Le dessus plat de la hotte au droit du conduit : la chaux autour, le passage du conduit (60 × 40) noir, sa lèvre de suie. */
const hoodTopTex: Tex = (s, t) => {
  // (s, t) depuis le coin nord-ouest du plat (le conduit pose dessus, bord à bord) ; le passage à 4 px de ses côtés
  const px = s - FLUE.wall, py = t - FLUE.wall;
  if (px >= 0 && px < FLUE.w - 2 * FLUE.wall && py >= 0 && py < FLUE.d - 2 * FLUE.wall) return px < 1 || py < 1 ? '~' : 'o';
  return hash(23, Math.floor(s), Math.floor(t)) < 0.2 ? '=' : '+';
};

/**
 * La hotte en local (x 0–44, y 0–16, z 0–20) : une boîte de torchis chaulé de 15 cm d'épaisseur (le creux ne se voit pas d'en haut),
 * les murs jusqu'à 90 cm (18 px), puis le glacis de 10 cm à l'est et à l'ouest, jusqu'au plat du dessus au droit du conduit ; au
 * nord (contre le mur) et au sud (au-dessus du manteau), la face monte jusqu'au plat, son haut suivant le glacis aux deux bouts.
 * Le bas du devant (20 cm) est derrière le manteau : la suie y est pleine, et s'éteint au-dessus.
 */
export const hoodModel = (): Quad[] => {
  const { w, d, h, eaves, flat, hidden } = HOOD;
  const [fx0, fx1] = flat;
  const P = part('hotte', 6, ';', 'full');
  const front = sooted(limeTex(62), 63, 1, hidden + 11, hidden);
  const walls = box(0, w, 0, d, 0, eaves, P, {
    top: limeTex(61),
    side: (s, t, c) => (c.face === 'S' ? front(s, t, c) : c.face === 'N' ? limeTex(64)(s, t, c) : sooted(limeTex(65), 66, 0.45, 8)(s, t, c)),
  }).filter((q) => q.face !== 'top');
  const rise = h - eaves;
  // le haut d'une face nord ou sud au-dessus des murs : un trapèze qui suit le glacis aux deux bouts (x depuis l'ouest)
  const gableTop = (x: number, t: number) => t <= rise * Math.min(1, x / fx0, (w - x) / (w - fx1)) + 0.01;
  const backLime = limeTex(64), frontLime = limeTex(62);
  const backWall = box(0, w, 0, 0.01, eaves, h, P, (s, t, c) => (gableTop(w - s, t) ? backLime(s, t + eaves, c) : null)).filter((q) => q.face === 'N');
  const frontWall = box(0, w, d - 0.01, d, eaves, h, P, (s, t, c) => (gableTop(s, t) ? frontLime(s, t + eaves, c) : null)).filter((q) => q.face === 'S');
  const glacis = (o: V3, u: V3, v: V3, n: V3, seed: number): Quad => ({ o, u, v, n: unit(n), part: P, face: 'slope', tex: limeTex(seed) });
  const Q: Quad[] = [...walls, ...backWall, ...frontWall];
  // l'ouest : de x = 0 (z 18) à x = fx0 (z 20), sur toute la profondeur
  Q.push(glacis([0, 0, eaves], [0, d, 0], [fx0, 0, rise], [-rise, 0, fx0], 72));
  // l'est
  Q.push(glacis([w, d, eaves], [0, -d, 0], [-(w - fx1), 0, rise], [rise, 0, w - fx1], 73));
  // le plat, au droit du conduit, sur toute la profondeur
  Q.push({ o: [fx0, 0, h], u: [fx1 - fx0, 0, 0], v: [0, d, 0], n: [0, 0, 1], part: P, face: 'top', tex: hoodTopTex });
  return Q;
};

// =====================================================================================================================
// Le conduit, le couronnement
// =====================================================================================================================

/** Le dessus du conduit (seul le tronçon du haut le montre) : le tour de pierre de 20 cm, le noir du passage (60 × 40), sa lèvre. */
const flueTop: Tex = (s, t, c) => {
  const e = Math.min(s, t, c.w - s, c.h - t);
  if (e >= FLUE.wall) return 'o';
  if (e >= FLUE.wall - 1) return '~';
  return hash(13, Math.floor(s), Math.floor(t)) < 0.25 ? '!' : '+';
};
const BOTH = (): [boolean, boolean] => [true, true];
/** Un tronçon de conduit en local (20 × 16 × 20) : quatre assises de 25 cm, angles alternés long et court. */
export const flueModel = (): Quad[] => box(0, FLUE.w, 0, FLUE.d, 0, FLUE.h, part('conduit', 6, '~', 'full'), { top: flueTop, side: masonry(10, { quoins: BOTH, quoinW: [5, 3] }) });

/** Le trou du couronnement, au droit du passage du conduit (12 × 8) : son coin nord-ouest dans la dalle (8 px de l'ouest, 6 du nord). */
export const CAP_HOLE = { x: AT.flue(0)[0] + FLUE.wall - AT.cap[0], y: AT.flue(0)[1] + FLUE.wall - AT.cap[1], w: FLUE.w - 2 * FLUE.wall, d: FLUE.d - 2 * FLUE.wall };
/** La dalle de couronnement, percée au droit du passage. */
const capTex: Tex = (s, t, c) => {
  if (c.face === 'top') {
    const x = s - CAP_HOLE.x, y = t - CAP_HOLE.y; // sur le dessus, t va du nord au sud
    if (x >= 0 && x < CAP_HOLE.w && y >= 0 && y < CAP_HOLE.d) return x < 1 || y < 1 ? '~' : 'o';
  }
  return slabTex(17)(s, t, c);
};
export const capModel = (): Quad[] => box(0, CAP.w, 0, CAP.d, 0, CAP.h, part('couronnement', 7, '~', 'full'), capTex);

// =====================================================================================================================
// La cheminée montée, dans le repère de la maison (pour les planches de vérification)
// =====================================================================================================================

const moved = (qs: Quad[], [dx, dy, dz]: V3): Quad[] => qs.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2] + dz] as V3 }));

/**
 * Toutes les faces de la cheminée posée dans la maison (sans le manteau, qui est une image du jeu) : l'âtre à l'image `frame` du feu,
 * la hotte, les cinq tronçons, le couronnement. Les textures lisent leur point dans le repère local (on les décale).
 */
export function chimneyQuads(frame = 0, upTo = Infinity): Quad[] {
  const local = (qs: Quad[], at: V3): Quad[] => moved(qs, at).map((q) => ({ ...q, tex: (s, t, c) => q.tex(s, t, { ...c, p: [c.p[0] - at[0], c.p[1] - at[1], c.p[2] - at[2]] }) }));
  const Q: Quad[] = [...local(hearthModel(frame)(), AT.hearth), ...local(hoodModel(), AT.hood)];
  for (let k = 0; k < FLUE_COUNT && AT.flue(k)[2] < upTo; k++) {
    const f = local(flueModel(), AT.flue(k));
    // seul le tronçon du haut montre son dessus
    Q.push(...(k < FLUE_COUNT - 1 ? f.filter((q) => q.face !== 'top') : f));
  }
  if (AT.cap[2] < upTo) Q.push(...local(capModel(), AT.cap));
  return Q;
}

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

export const view = (model: () => Quad[], v: number) => renderPiece(rotQuads(model(), VIEW_ROT[v], [0, 0]), { k: 1 });

/** Une planche à une animation `burn` de trois images (le feu ne se voit que de face : de côté et de dos, trois fois la même). */
function burning(name: string, frames: Grid[]): SpriteSheetSource {
  const w = Math.max(...frames.map((g) => g[0].length)), h = Math.max(...frames.map((g) => g.length));
  return { kind: 'spritesheet', name, frameW: w, frameH: h, palette: PAL, animations: { burn: { frames, frameRate: 7, repeat: -1 } } };
}

const SUFFIX = ['', '-r1', '-r2', '-r3'];

const sources = [
  ...[0, 1, 2, 3].map((v) => burning(`stone-hearth${SUFFIX[v]}`, [0, 1, 2].map((f) => view(hearthModel(f), v)))),
  ...[0, 1, 2, 3].map((v) => ({ kind: 'image' as const, name: `chimney-hood${SUFFIX[v]}`, palette: PAL, grid: view(hoodModel, v) })),
  ...[0, 1].map((v) => ({ kind: 'image' as const, name: `chimney-flue${v ? '-ns' : ''}`, palette: PAL, grid: seamless(view(flueModel, v)) })),
  ...[0, 1].map((v) => ({ kind: 'image' as const, name: `chimney-cap${v ? '-ns' : ''}`, palette: PAL, grid: view(capModel, v) })),
];

export default sources;
