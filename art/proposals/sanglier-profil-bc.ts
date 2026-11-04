// Quatrième essai du profil du sanglier (chantier « sangliers », hors jeu) : l'avant de B, l'arrière de C.
// Planche : npx tsx tools/essai-sangliers-profil-bc.ts (.art-preview/sangliers-profil-bc.png).
//
// Demande de Grégoire : ni B ni C seuls. De B (art/proposals/sanglier-profil-b.ts) : la tête et l'avant du corps (la tête un peu
// plus levée, le front moins pentu, la crinière fournie en deux rangées de touffes). De C (art/proposals/sanglier-profil-c.ts) :
// l'arrière, le dos qui descend du garrot vers une croupe plus basse. Deux versions : avec la joue grise de C, et sans.
//
// Gabarit (docs/STYLE.md, section 8 ; 140 × 40 × 80 cm, boîte, 5 cm par pixel) : de profil L × (H + D/2) = 28 × (16 + 4) =
// 28 × 20 px, contour compris, ombre exclue ; zones 26 × 18 (rangées 0 à 11 le corps, 11 à 17 les pattes, 17 les sabots).
//
// Méthode : celle des essais 2 et 3. Le corps est un tableau de zones (ici recousu : les colonnes 0 à 7 de C, les colonnes 8 à 25
// de B, la jonction sur la pente du dos, qui descend d'une rangée par une à trois colonnes sans palier ni marche), les pattes des
// traits posés par points ; tout est éclairé en haut à gauche et contouré par art/lib/light.ts, avec la palette et les matières
// de l'essai 3 (art/proposals/sanglier-c.ts : le liseré gris du dos, le groin clair), puis l'ombre `x`.
// Pour la comparaison, B et C passent par le même rendu et les mêmes poses : seul le corps change d'une colonne à l'autre.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import { lightUp } from '../lib/light';
import { palette, MATS, dab, SIDE, GY, FOOT, type Dab, type Leg, type P } from './sanglier-c';
import { body as bBody } from './sanglier-profil-b';
import { body as cBody } from './sanglier-profil-c';

export { palette, FOOT };

/** La colonne où l'avant de B prend le relais de l'arrière de C. */
const SEAM = 8;

/** L'arrière de C (colonnes 0 à 7), l'avant de B (colonnes 8 à 25). La touffe de B posée sur la couture (rangée 0, colonne 8)
 *  est ôtée : le dos monte de la croupe (rangée 5) au garrot (rangée 1) sans marche, puis la crinière s'élève en touffes. */
export const BC_BODY: string[] = cBody.map((c, y) => {
  let row = c.slice(0, SEAM) + bBody[y].slice(SEAM);
  if (y === 0) row = row.slice(0, SEAM) + '.' + row.slice(SEAM + 1);
  return row;
});

/** La joue grise de C, remontée d'une rangée avec la tête de B (sous l'œil, devant la défense). */
const CHEEK: P[] = [[18, 5], [19, 5], [20, 5], [17, 6], [18, 6], [19, 6], [20, 6], [18, 7], [19, 7], [20, 7]];
export const BC_CHEEK: string[] = BC_BODY.map((r, y) => [...r].map((z, x) => (CHEEK.some(([a, b]) => a === x && b === y) ? 'G' : z)).join(''));

export interface Pose {
  legs: Leg[];
  /** la tête baissée au bout du groin (px), depuis la colonne `headFrom` ; l'encolure baissée (0 à la colonne 8, tout à 16). */
  head?: number;
  headFrom?: number;
  neck?: number;
  /** tout l'animal monté (dy < 0 : en l'air) ; l'ombre raccourcie de `air` de chaque côté. */
  dy?: number;
  air?: number;
  tail?: 'down' | 'up';
  /** la crinière hérissée : les creux entre les touffes comblés. */
  bristle?: boolean;
  dabs?: Dab[];
}

function warp(p: Pose): (x: number) => number {
  const head = p.head ?? 0, from = p.headFrom ?? 17, neck = p.neck ?? 0;
  return (x) => {
    let d = 0;
    if (neck) d += Math.round(neck * Math.min(1, Math.max(0, (x - 8) / 8)));
    if (head && x >= from) d += Math.round((head * (x - from + 1)) / (26 - from));
    return d;
  };
}

function trace(pts: P[]): P[] {
  const out: P[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let k = 0; k <= n; k++) {
      const q: P = [Math.round(ax + ((bx - ax) * k) / n), Math.round(ay + ((by - ay) * k) / n)];
      const last = out[out.length - 1];
      if (!last || last[0] !== q[0] || last[1] !== q[1]) out.push(q);
    }
  }
  return out;
}

function drawLeg(c: Canvas, l: Leg, ox: number, oy: number, w: (x: number) => number) {
  const n = l.pts.length;
  const pts = l.pts.map(([x, y], i): P => [x, y + Math.round(w(l.pts[0][0]) * (1 - i / (n - 1)))]);
  const px = trace(pts);
  const thigh = l.thigh ?? 2;
  px.forEach(([x, y], i) => {
    const last = i === px.length - 1;
    const z = last ? 'H' : i < thigh ? (l.near ? 'B' : 'F') : l.near ? 'G' : 'J';
    c.set(ox + x, oy + y, z);
    if (l.near && (i < thigh + 1 || last)) c.set(ox + x + 1, oy + y, z);
  });
}

function zones(body: string[], p: Pose): Canvas {
  const c = new Canvas(SIDE.w, SIDE.h);
  const ox = SIDE.ox, oy = SIDE.oy + (p.dy ?? 0);
  const w = warp(p);
  for (const l of p.legs.filter((l) => !l.near)) drawLeg(c, l, ox, oy, w);
  // le corps sans sa queue (colonne 0), redessinée selon l'allure
  body.forEach((row, y) => [...row].forEach((z, x) => { if (z !== EMPTY && x > 0) c.set(ox + x, oy + y + w(x), z); }));
  if (p.bristle) {
    // les creux de la crinière comblés sur l'écu, au-dessus de la deuxième rangée de touffes
    for (let x = 9; x <= 17; x++) {
      const top = body.findIndex((r) => r[x] !== EMPTY);
      if (top > 0) c.set(ox + x, oy + top - 1 + w(x), 'C');
    }
  }
  // la queue : pendante le long de la croupe, ou dressée (la course)
  const t1 = body.findIndex((r) => r[1] !== EMPTY);
  const tail: P[] = (p.tail ?? 'down') === 'down' ? [[0, t1 + 1], [0, t1 + 2], [0, t1 + 3]] : [[0, t1], [0, t1 - 1], [0, t1 - 2]];
  for (const [x, y] of tail) c.set(ox + x, oy + y + w(1), 'C');
  for (const l of p.legs.filter((l) => l.near)) drawLeg(c, l, ox, oy, w);
  return c;
}

/** L'ombre sous un animal debout : une rangée sous le contour des sabots, sous le corps, décalée d'un pixel. */
function shadow(g: Grid, air: number, dy: number): Grid {
  const c = Canvas.from(g);
  let a = 1e9, b = -1;
  for (let y = SIDE.oy + 5 + dy; y <= SIDE.oy + 11 + dy; y++) for (let x = 0; x < g[0].length; x++) {
    if (g[y]?.[x] && g[y][x] !== EMPTY) { a = Math.min(a, x); b = Math.max(b, x); }
  }
  for (let x = a + 2 + air; x <= b - air; x++) if (c.get(x, GY + 2) === EMPTY) c.set(x, GY + 2, 'x');
  return c.toGrid();
}

export function render(body: string[], p: Pose): Grid {
  const lit = lightUp(zones(body, p).toGrid(), MATS);
  return dab(shadow(lit, p.air ?? 0, p.dy ?? 0), (p.dabs ?? []).map(([x, y, k]) => [SIDE.ox + x, SIDE.oy + y, k]));
}

const L = (near: boolean, ...pts: P[]): Leg => ({ pts, near });

/** Debout, les pattes d'aplomb (celles des essais 2 et 3). */
export const STAND: Leg[] = [L(false, [7, 11], [7, 17]), L(false, [12, 11], [12, 17]), L(true, [4, 11], [4, 13], [3, 15], [3, 17]), L(true, [15, 11], [15, 17])];

/**
 * Pleine charge, une image de galop en suspension étirée, tenue dans les 28 colonnes : les postérieurs tendus en arrière jusqu'à
 * la queue, les antérieurs lancés en avant sous la tête (le genou plié, le sabot sous la mâchoire), les deux paires écartées
 * pour que chaque patte se lise seule ; la tête baissée, l'encolure tendue, la crinière hérissée, la queue dressée. Sans poussière :
 * Grégoire juge ici les pattes seules.
 */
export const CHARGE_LEGS: Leg[] = [
  L(false, [7, 11], [6, 14], [4, 16]),
  L(false, [12, 11], [14, 14], [12, 16]),
  L(true, [4, 11], [2, 14], [0, 16]),
  L(true, [15, 11], [18, 14], [21, 16]),
];

export const STAND_POSE: Pose = { legs: STAND };
export const CHARGE_POSE: Pose = { legs: CHARGE_LEGS, head: 2, headFrom: 16, neck: 1, dy: -1, air: 2, tail: 'up', bristle: true };

export interface Entry { key: string; title: string; note: string; stand: Grid; charge: Grid }

const entry = (key: string, title: string, note: string, body: string[]): Entry => ({
  key, title, note, stand: render(body, STAND_POSE), charge: render(body, CHARGE_POSE),
});

export const entries: Entry[] = [
  entry('b', 'B (RAPPEL) : LA TETE PLUS LEVEE, LA CRINIERE EN DEUX RANGEES', 'le dos presque droit : la croupe a une rangee du garrot', bBody),
  entry('c', 'C (RAPPEL) : LA TETE EN COIN, LA JOUE GRISE, LA CROUPE BASSE', 'la tete un pixel plus bas que B, le front plus pentu', cBody),
  entry('bc-joue', 'NOUVEAU, AVEC LA JOUE : L AVANT DE B, L ARRIERE DE C, LA JOUE GRISE DE C',
    'colonnes 0 a 7 de C, 8 a 25 de B ; la joue grise remontee d une rangee avec la tete', BC_CHEEK),
  entry('bc', 'NOUVEAU, SANS LA JOUE : L AVANT DE B, L ARRIERE DE C', 'la tete toute brune, le groin clair et la defense seuls sur la tete', BC_BODY),
];
