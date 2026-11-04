// Deuxième essai du profil du sanglier (chantier « sangliers », hors jeu). Module commun aux variantes
// art/proposals/sanglier-profil-a.ts, -b.ts, -c.ts ; planche : npx tsx tools/essai-sangliers-profil.ts.
//
// Retour de Grégoire sur le premier essai (art/proposals/sanglier.ts) : la tête de profil tombait trop bas et pendait sous la
// ligne du corps. Ici, le corps et la tête sont dessinés à la main, pixel par pixel, en zones de matière (un tableau de lignes par
// variante) : le coin de la tête prolonge le dos, sa mâchoire reste à la hauteur du ventre. Les pattes sont des traits posés par
// des points (courtes et fines : 1 px, 2 px à la cuisse pour celles du côté vu). Puis tout est éclairé en haut à gauche et
// contouré par art/lib/light.ts, et reçoit son ombre `x`.
//
// Gabarit (docs/STYLE.md, section 8) : 140 × 40 × 80 cm, de profil L × (H + D/2) = 28 × (16 + 4) = 28 × 20 px, contour compris,
// ombre exclue. Les zones d'un profil debout tiennent donc dans 26 × 18 (le contour ajoute un pixel de chaque côté) : rangées 0 à
// 12 pour le corps (soies comprises), 13 à 17 pour les pattes, la rangée 17 est celle des sabots.
//
// Zones : B robe (côté vu), U dessus du dos (vers le ciel, plus clair), C soies de la crinière, oreille, queue (le plus sombre),
// F robe du côté caché, G pattes du côté vu et joue grise, J pattes du fond, S disque du groin, H sabots, W défense, E œil,
// V ventre (plus clair, montré par la bête morte).

import { Canvas, EMPTY, type Grid, type Palette } from '../lib/canvas';
import { lightUp, type Materials } from '../lib/light';
import { palette as first } from './sanglier';

/** La palette du premier essai (tirée de l'écorce, de la pierre sombre et de l'humus), plus le ventre clair. */
export const palette: Palette = {
  ...first,
  b: '#a39279', // ventre au soleil : la terre u mêlée à la pierre z (les soies du ventre, plus claires et clairsemées)
};

export const MATS: Materials = {
  B: { light: 'q', base: 'r', shade: 's', dark: 't' },
  U: { light: 'q', base: 'q', shade: 'r', dark: 't' },
  F: { light: 'r', base: 's', shade: 's', dark: 't' },
  C: { light: 's', base: 't', shade: 't', dark: 't' },
  G: { light: 'g', base: 'h', shade: 'i', dark: 't' },
  J: { light: 'h', base: 'i', shade: 'i', dark: 't' },
  S: { light: 'g', base: 'g', shade: 'h', dark: 't' },
  H: { light: 't', base: 't', shade: 't', dark: 't' },
  W: { light: 'w', base: 'w', shade: 'v', dark: 't' },
  E: { light: 'e', base: 'e', shade: 'e', dark: 't' },
  V: { light: 'b', base: 'b', shade: 'g', dark: 't' },
};

/** Frame de profil : le point (0, 0) des zones est posé en (OX, OY) ; les sabots (rangée 17) sur GY ; ombre sur GY + 2. */
export const FRAME = { w: 46, h: 30, ox: 10, oy: 4 } as const;
export const GY = FRAME.oy + 17;
/** La rangée du sol dans la frame : celle du contour sous les sabots (le pied d'un sprite, pour le poser dans une scène). */
export const FOOT = GY + 1;

export type P = [number, number];
/** Une patte : ses points (le premier à la hanche ou à l'épaule, le dernier au sabot), côté vu ou non. */
export interface Leg { pts: P[]; near: boolean; /** pixels de cuisse (robe) avant le canon ; 2 par défaut. */ thigh?: number }

/** Les pixels d'une ligne brisée, sans doublon. */
function trace(pts: P[]): P[] {
  const out: P[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let k = 0; k <= n; k++) {
      const p: P = [Math.round(ax + ((bx - ax) * k) / n), Math.round(ay + ((by - ay) * k) / n)];
      const last = out[out.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
    }
  }
  return out;
}

function drawLeg(c: Canvas, l: Leg, ox: number, oy: number) {
  const px = trace(l.pts);
  const thigh = l.thigh ?? 2;
  px.forEach(([x, y], i) => {
    const last = i === px.length - 1;
    const z = last ? 'H' : i < thigh ? (l.near ? 'B' : 'F') : l.near ? 'G' : 'J';
    c.set(ox + x, oy + y, z);
    // côté vu : la cuisse et le sabot font 2 px
    if (l.near && (i < thigh + 1 || last)) c.set(ox + x + 1, oy + y, z);
  });
}

/** Pose un corps (zones) et ses pattes dans la frame : pattes du fond, corps, pattes du côté vu. */
export function zones(body: string[], legs: Leg[], dx = 0, dy = 0): Canvas {
  const c = new Canvas(FRAME.w, FRAME.h);
  const ox = FRAME.ox + dx, oy = FRAME.oy + dy;
  for (const l of legs.filter((l) => !l.near)) drawLeg(c, l, ox, oy);
  body.forEach((row, y) => [...row].forEach((z, x) => { if (z !== EMPTY) c.set(ox + x, oy + y, z); }));
  for (const l of legs.filter((l) => l.near)) drawLeg(c, l, ox, oy);
  return c;
}

/** Décale vers le bas (dy > 0) les colonnes du corps à partir de `from` : la tête baissée, sans toucher au reste. */
export function lowerFrom(body: string[], steps: [number, number][]): string[] {
  const shift = (x: number) => steps.reduce((s, [from, dy]) => (x >= from ? dy : s), 0);
  const extra = Math.max(...steps.map((s) => s[1]));
  const h = body.length + extra, w = body[0].length;
  const out = Array.from({ length: h }, () => Array(w).fill(EMPTY));
  body.forEach((row, y) => [...row].forEach((z, x) => { if (z !== EMPTY) out[y + shift(x)][x] = z; }));
  return out.map((r) => r.join(''));
}

/** L'ombre sous un animal debout : une rangée sous le contour des sabots, sous le corps, décalée d'un pixel ; plus courte en l'air. */
function standShadow(g: Grid, air: number): Grid {
  const c = Canvas.from(g);
  let a = 1e9, b = -1;
  // l'étendue du corps : les rangées du ventre (sans les pattes lancées)
  for (let y = FRAME.oy + 5; y <= FRAME.oy + 11; y++) for (let x = 0; x < g[0].length; x++) {
    if (g[y][x] !== EMPTY) { a = Math.min(a, x); b = Math.max(b, x); }
  }
  for (let x = a + 2 + air; x <= b - air; x++) if (c.get(x, GY + 2) === EMPTY) c.set(x, GY + 2, 'x');
  return c.toGrid();
}

/** Une image debout (ou lancée) : zones éclairées, contour, ombre. `air` : en l'air, l'ombre raccourcit d'autant de chaque côté. */
export function standing(body: string[], legs: Leg[], o: { dx?: number; dy?: number; air?: number } = {}): Grid {
  return standShadow(lightUp(zones(body, legs, o.dx, o.dy).toGrid(), MATS), o.air ?? 0);
}

/** Ombre d'un corps à plat : un pixel au sud-est de toute la silhouette. */
function flatShadow(g: Grid): Grid {
  const c = Canvas.from(g);
  for (let y = 1; y < g.length; y++) for (let x = 1; x < g[0].length; x++) {
    if (g[y][x] === EMPTY && g[y - 1][x - 1] !== EMPTY && g[y - 1][x - 1] !== 'x') c.set(x, y, 'x');
  }
  return c.toGrid();
}

/** Une image couchée (mort, bauge) : zones dont la dernière rangée touche le sol (GY), éclairées, ombre à plat. */
export function lying(body: string[], legs: Leg[], dx = 0): Grid {
  // le plus bas du dessin (corps ou pattes) touche le sol
  const low = Math.max(body.length - 1, ...legs.flatMap((l) => l.pts.map((p) => p[1])));
  const dy = 17 - low;
  return flatShadow(lightUp(zones(body, legs, dx, dy).toGrid(), MATS));
}

/**
 * Couché sur le flanc, les pattes en l'air : le dessin est fait pattes en bas (le dos en haut, le ventre dessous), puis retourné de
 * haut en bas avant l'éclairage. Le ventre clair passe au nord (en haut), les pattes raides pointent hors du corps vers le haut, le
 * dos et sa crinière bordent le bas. Le plus bas du dessin retourné touche le sol (GY).
 */
export function flipped(body: string[], legs: Leg[], dx = 0): Grid {
  const z = zones(body, legs, dx, 0).toGrid().slice().reverse();
  let low = 0;
  z.forEach((r, y) => { if (/[^.]/.test(r)) low = y; });
  const c = new Canvas(FRAME.w, FRAME.h).stamp(z, 0, GY - low);
  return flatShadow(lightUp(c.toGrid(), MATS));
}

export interface Anim { frames: Grid[]; ms: number[]; note: string }

/** Une variante du profil : debout et en pleine charge (pattes en extension). */
export interface Variant {
  key: string;
  title: string;
  note: string;
  stand: Grid;
  charge: Grid;
}

/** Boîte de la silhouette : pixels opaques hors ombre `x` et hors poussière. */
export function silhouette(g: Grid): { x: number; y: number; w: number; h: number } {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  g.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === EMPTY || 'xdDy'.includes(ch)) return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
