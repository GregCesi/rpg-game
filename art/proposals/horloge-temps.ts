// Proposition (chantier « le temps ») : l'horloge du HUD, en trois pistes. Hors jeu : rien ici ne se déclare dans art/index.ts ;
// l'outil tools/essai-interface-temps.ts les pose sur des captures d'écran simulées (.art-preview/essai-interface-temps.png).
//
// Tout est dans la facture du HUD : cadre en bois comme `ui-slot` et la barre d'endurance (contour o, biseau clair M en haut et à
// gauche, ombre N en bas et à droite, liseré du creux N en haut et à gauche, m en bas et à droite), signes comme `ui-digit-*`
// (3 × 5 px en parchemin a, cerclés d'un contour o diagonales comprises, contours voisins confondus). Les chiffres sont ceux du
// jeu (tirés de art/ui/dialog.ts) ; les lettres de « Jour », les deux-points et le point médian sont nouveaux, dans le même style
// (minuscules sur 3 px posées sur la ligne, comme le m de la longueur d'une corde).
//
// Le moment de la journée (le même découpage pour les trois pistes, `momentOf`) : aube de 5 h à 8 h, jour de 8 h à 18 h 30,
// crépuscule de 18 h 30 à 21 h 30, nuit de 21 h 30 à 5 h. Le soleil se lève à 6 h et se couche à 20 h (`SUN`), la lune fait le
// reste. Le ciel : deux bandes par moment (le haut, l'horizon), aplats francs, pas de dégradé.
//
// Les trois pistes :
// - A, « le cadran » (en haut à droite) : un médaillon rond de 23 px, une fenêtre de ciel où le soleil puis la lune passent sur
//   un arc, de l'est (à gauche) à l'ouest, au-dessus d'une colline ; à sa gauche, une plaquette « Jour 3 » sur « 14:20 ».
// - B, « la bande du jour » (en bas, avec la barre et les mains) : une plaquette de la facture de la barre d'endurance, « Jour 3 »,
//   puis la journée entière en bande de 48 px (2 px par heure, minuit à minuit, les couleurs du ciel heure par heure), où le
//   soleil ou la lune glisse à l'heure qu'il est, puis « 14:20 ». On voit d'un coup d'œil ce qui reste avant la nuit.
// - C, « le ciel de la plaquette » (en haut au centre) : une seule ligne « Jour 3 · 14:20 » sur un creux peint de la couleur du
//   ciel du moment, précédée d'une petite icône (soleil levant, soleil haut, soleil couchant, croissant et étoile).

import { Canvas, EMPTY, type Grid, type Palette } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import dialog from '../ui/dialog';

/**
 * Palette de l'horloge : celle du monde, plus les ciels (signes pris hors des lettres, libres) et la lumière du soleil.
 * Les ciels restent terreux comme le reste : la lumière glisse vers le jaune, l'ombre vers le brun-violet.
 */
export const palette: Palette = {
  ...world,
  // aube : haut mauve rosé, horizon pêche
  '(': '#a8838e',
  ')': '#ddb08a',
  // jour : haut bleu pâle grisé (l'eau W, éclaircie), horizon presque crème
  '<': '#9fb6b6',
  '>': '#c6cfbb',
  // crépuscule : haut lie-de-vin, horizon orange brique
  '?': '#8e5560',
  '/': '#cf7f4c',
  // nuit : haut indigo sombre, horizon indigo
  '-': '#2c3049',
  '_': '#434b68',
};

export type Moment = 'aube' | 'jour' | 'crepuscule' | 'nuit';
export const MOMENTS: { key: Moment; name: string }[] = [
  { key: 'aube', name: 'aube' },
  { key: 'jour', name: 'jour' },
  { key: 'crepuscule', name: 'crépuscule' },
  { key: 'nuit', name: 'nuit' },
];

/** Le ciel de chaque moment : [haut, horizon]. */
const SKY: Record<Moment, [string, string]> = {
  aube: ['(', ')'],
  jour: ['<', '>'],
  crepuscule: ['?', '/'],
  nuit: ['-', '_'],
};

/** Lever et coucher du soleil, en minutes depuis minuit. */
export const SUN = { rise: 6 * 60, set: 20 * 60 };

/** Le moment de la journée à `min` minutes depuis minuit. */
export function momentOf(min: number): Moment {
  const m = ((min % 1440) + 1440) % 1440;
  if (m >= 5 * 60 && m < 8 * 60) return 'aube';
  if (m >= 8 * 60 && m < 18 * 60 + 30) return 'jour';
  if (m >= 18 * 60 + 30 && m < 21 * 60 + 30) return 'crepuscule';
  return 'nuit';
}

/** L'astre visible et son avancée sur son arc, de 0 (lever, à l'est) à 1 (coucher, à l'ouest). */
function body(min: number): { sun: boolean; t: number } {
  const m = ((min % 1440) + 1440) % 1440;
  if (m >= SUN.rise && m <= SUN.set) return { sun: true, t: (m - SUN.rise) / (SUN.set - SUN.rise) };
  const night = 1440 - (SUN.set - SUN.rise);
  return { sun: false, t: (((m - SUN.set) + 1440) % 1440) / night };
}

// ---------------------------------------------------------------------------------------------------------------------
// Les signes
// ---------------------------------------------------------------------------------------------------------------------

/** Les chiffres du jeu (art/ui/dialog.ts, `ui-digit-<n>`) : le dessin de 3 × 5 dans leur image de 5 × 7. */
const DIGITS: Record<string, string[]> = Object.fromEntries(
  Array.from({ length: 10 }, (_, n) => {
    const src = (dialog as ImageSource[]).find((s) => s.name === `ui-digit-${n}`)!;
    const rows = src.grid.slice(1, 6).map((r) => [...r.slice(1, 4)].map((k) => (k === 'a' ? '#' : '.')).join(''));
    return [String(n), rows];
  }),
);

/** Les signes nouveaux, dans le style des chiffres : J capitale sur 5 px, o u r minuscules sur 3 px, deux-points, point médian. */
const LETTERS: Record<string, string[]> = {
  J: ['..#', '..#', '..#', '#.#', '##.'],
  o: ['...', '...', '###', '#.#', '###'],
  u: ['...', '...', '#.#', '#.#', '###'],
  r: ['...', '...', '###', '#..', '#..'],
  ':': ['.', '#', '.', '#', '.'],
  '·': ['.', '.', '#', '.', '.'],
  // les lettres des cases (le jeu les écrit en texte) : seulement pour la capture simulée
  G: ['###', '#..', '#.#', '#.#', '###'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
};

const GLYPHS: Record<string, string[]> = { ...DIGITS, ...LETTERS };

/**
 * Un texte en signes du HUD : chaque signe séparé du suivant d'une colonne (le contour commun), une espace en vaut deux de plus ;
 * le tout cerclé d'un contour o, diagonales comprises. Hauteur 7 px, comme `ui-digit-*`.
 */
export function text(s: string): Canvas {
  const cols: { rows: string[]; x: number }[] = [];
  let x = 1;
  for (const ch of s) {
    if (ch === ' ') { x += 2; continue; }
    const rows = GLYPHS[ch];
    if (!rows) throw new Error(`signe « ${ch} » absent de l'horloge`);
    cols.push({ rows, x });
    x += rows[0].length + 1;
  }
  const c = new Canvas(x, 7);
  for (const { rows, x: ox } of cols) rows.forEach((r, y) => [...r].forEach((k, i) => { if (k === '#') c.set(ox + i, y + 1, 'a'); }));
  return c.outline('o', true);
}

export const hhmm = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------------------------------------------------
// Les cadres
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Une plaquette de la facture de la barre d'endurance : bord de 3 px (contour, biseau M en haut et à gauche, N en bas et à
 * droite ; liseré du creux N en haut et à gauche, m en bas et à droite), coins arrondis ; le creux, en (3, 3), est en bois sombre K.
 */
export function plaque(w: number, h: number): Canvas {
  const c = new Canvas(w, h, 'o');
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) c.set(x, y, EMPTY);
  c.rect(1, 1, w - 2, h - 2, 'm');
  c.rect(1, 1, w - 2, 1, 'M').rect(1, 1, 1, h - 2, 'M');
  c.rect(1, h - 2, w - 2, 1, 'N').rect(w - 2, 1, 1, h - 2, 'N');
  c.set(1, h - 2, 'N').set(w - 2, 1, 'N');
  c.rect(2, 2, w - 4, 1, 'N').rect(2, 2, 1, h - 4, 'N');
  c.rect(3, h - 3, w - 5, 1, 'm').rect(w - 3, 3, 1, h - 5, 'm');
  c.rect(3, 3, w - 6, h - 6, 'K');
  return c;
}

// ---------------------------------------------------------------------------------------------------------------------
// Les astres
// ---------------------------------------------------------------------------------------------------------------------

/** Le soleil, 5 × 5 : lumière H en haut à gauche, h en bas à droite ; rougi (h, i) au crépuscule et à l'aube basse. */
function sun(low: boolean): Grid {
  const [l, b] = low ? ['h', 'i'] : ['H', 'h'];
  return ['.LLL.', 'LLLLB', 'LLLLB', 'LLLBB', '.BBB.'].map((r) => r.replace(/L/g, l).replace(/B/g, b));
}

/** La lune, un croissant de 5 × 5 tourné vers l'est (sa lumière vient du soleil couché), en parchemin a, ombré D aux cornes. */
const MOON: Grid = ['.aaa.', 'aaD..', 'aa...', 'aaD..', '.aaa.'];

/** Les étoiles de la nuit : quelques points de parchemin, voulus. */
function stars(c: Canvas, spots: [number, number][], skyTop: string, skyLow: string): void {
  for (const [x, y] of spots) if (c.get(x, y) === skyTop || c.get(x, y) === skyLow) c.set(x, y, 'a');
}

// ---------------------------------------------------------------------------------------------------------------------
// Piste A : le cadran
// ---------------------------------------------------------------------------------------------------------------------

/** Le médaillon, 23 × 23 : anneau de bois, ciel du moment, l'astre sur son arc, la colline au premier plan. */
export function dial(min: number): Canvas {
  const S = 23;
  const C = 11;
  const c = new Canvas(S, S);
  const moment = momentOf(min);
  const [top, low] = SKY[moment];
  const HY = 14; // première rangée de la colline (l'horizon)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - C, y - C);
    if (d > 11.4) continue;
    const ul = x + y < 2 * C; // côté lumière
    if (d > 10.4) c.set(x, y, 'o');
    else if (d > 8.6) c.set(x, y, ul ? 'M' : 'N');
    else if (d > 7.6) c.set(x, y, ul ? 'N' : 'm');
    else c.set(x, y, y < 8 ? top : low);
  }
  const sky = (x: number, y: number) => c.get(x, y) === top || c.get(x, y) === low;
  if (moment === 'nuit') stars(c, [[8, 5], [14, 4], [16, 8], [6, 9]], top, low);
  // l'astre : un arc de rayon 5 centré sur l'horizon, de l'est (gauche) à l'ouest (droite) ; à son lever et à son coucher,
  // il est à moitié dans la colline
  const b = body(min);
  const a = Math.PI * (1 - b.t);
  const bx = Math.round(C + 5 * Math.cos(a)) - 2;
  const by = Math.round(HY - 6 * Math.sin(a)) - 2;
  const g = b.sun ? sun(moment !== 'jour') : MOON;
  g.forEach((r, y) => [...r].forEach((k, x) => { if (k !== EMPTY && sky(bx + x, by + y)) c.set(bx + x, by + y, k); }));
  // la colline : un dos rond, plus haut à gauche ; herbe éclairée L sur le dessus, l dessous ; k la nuit
  const [crest, hill] = moment === 'nuit' ? ['l', 'k'] : ['L', 'l'];
  for (let x = 0; x < S; x++) {
    // un dos à peine bombé, qui descend d'un pixel vers l'ouest
    const ridge = HY + (x > 14 ? 1 : 0);
    for (let y = ridge; y < S; y++) {
      const k = c.get(x, y);
      if (k === top || k === low || k === 'a' || /[HhiD]/.test(k)) c.set(x, y, y === ridge ? crest : hill);
    }
  }
  return c;
}

/** Piste A entière : la plaquette « Jour n » sur l'heure, le médaillon posé sur son bout droit. */
export function clockA(day: number, min: number): Canvas {
  const l1 = text(`Jour ${day}`);
  const l2 = text(hhmm(min));
  const iw = Math.max(l1.w, l2.w) + 1;
  // creux de deux lignes (contours confondus) ; la plaquette s'arrête sous le médaillon
  const pw = iw + 6 + 9;
  const ph = 6 + 13;
  const p = plaque(pw, ph);
  const c = new Canvas(pw + 23 - 11, 23);
  const py = 2;
  c.stamp(p.toGrid(), 0, py);
  c.stamp(l1.toGrid(), 3 + Math.round((iw - l1.w) / 2), py + 3);
  c.stamp(l2.toGrid(), 3 + Math.round((iw - l2.w) / 2), py + 3 + 6);
  c.stamp(dial(min).toGrid(), pw - 11, 0);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------------
// Piste B : la bande du jour
// ---------------------------------------------------------------------------------------------------------------------

/** Px par heure de la bande. */
export const BAND_PX_PER_HOUR = 2;

/** La journée en bande, 48 × 7 : une colonne par demi-heure, le ciel de ce moment (haut sur 4 rangées, horizon sur 3). */
function band(min: number): Canvas {
  const w = 24 * BAND_PX_PER_HOUR;
  const c = new Canvas(w, 7);
  for (let x = 0; x < w; x++) {
    const [top, low] = SKY[momentOf(((x + 0.5) / BAND_PX_PER_HOUR) * 60)];
    c.rect(x, 0, 1, 4, top).rect(x, 4, 1, 3, low);
  }
  // l'heure qui passe : les colonnes déjà vécues aujourd'hui s'assombrissent d'un cran ? Non : la bande reste la carte du jour,
  // seul l'astre dit où l'on est (plus lisible, et le passé n'a pas à se lire).
  const b = body(min);
  const m = ((min % 1440) + 1440) % 1440;
  // l'astre reste entier dans la bande (près de minuit, il bute sur son bord)
  const cx = Math.min(w - 3, Math.max(2, Math.round((m / 60) * BAND_PX_PER_HOUR)));
  const g = b.sun ? sun(momentOf(min) !== 'jour') : MOON;
  // l'astre haut au milieu du jour, plus bas près de son lever et de son coucher
  const lift = Math.round(2 * Math.sin(Math.PI * b.t));
  const gy = 2 - lift;
  g.forEach((r, y) => [...r].forEach((k, x) => { if (k !== EMPTY) c.set(cx - 2 + x, gy + y, k); }));
  return c;
}

/** Piste B entière : « Jour n » | la bande | l'heure, dans une plaquette de 13 px de haut. */
export function clockB(day: number, min: number): Canvas {
  const l1 = text(`Jour ${day}`);
  const l2 = text(hhmm(min));
  const bd = band(min);
  const iw = l1.w + 1 + bd.w + 1 + l2.w;
  const p = plaque(iw + 6, 13);
  p.stamp(l1.toGrid(), 3, 3);
  // la bande, encadrée d'un liseré d'ombre N à gauche et m à droite, comme un creux dans le creux
  const bx = 3 + l1.w + 1;
  p.rect(bx - 1, 3, 1, 7, 'N').rect(bx + bd.w, 3, 1, 7, 'm');
  p.stamp(bd.toGrid(), bx, 3);
  p.stamp(l2.toGrid(), bx + bd.w + 1, 3);
  return p;
}

// ---------------------------------------------------------------------------------------------------------------------
// Piste C : le ciel de la plaquette
// ---------------------------------------------------------------------------------------------------------------------

/** L'icône du moment, 9 × 9, sur le ciel (transparente ailleurs). */
function icon(moment: Moment): Canvas {
  const c = new Canvas(9, 9);
  const put = (g: Grid, ox: number, oy: number) => c.stamp(g, ox, oy);
  if (moment === 'jour') {
    put(sun(false), 2, 2);
    // les rayons : quatre traits de lumière
    c.set(4, 0, 'H').set(0, 4, 'H').set(8, 4, 'h').set(4, 8, 'h');
  } else if (moment === 'aube' || moment === 'crepuscule') {
    // le soleil à moitié sous l'horizon, ses rayons au-dessus ; à l'aube encore jaune, au crépuscule rouge
    const g = sun(moment === 'crepuscule');
    put(g.slice(0, 3), 2, 4);
    const ray = moment === 'aube' ? 'H' : 'h';
    c.set(4, 1, ray).set(1, 3, ray).set(7, 3, ray);
    c.rect(0, 7, 9, 1, 'o');
  } else {
    put(MOON, 1, 2);
    c.set(7, 1, 'a').set(6, 6, 'a');
  }
  return c;
}

/** Piste C entière : une ligne, l'icône puis « Jour n · hh:mm », sur un creux peint du ciel du moment. */
export function clockC(day: number, min: number): Canvas {
  const moment = momentOf(min);
  const [top, low] = SKY[moment];
  const t = text(`Jour ${day} · ${hhmm(min)}`);
  const ic = icon(moment);
  const iw = 1 + ic.w + 2 + t.w + 1;
  const ih = 9;
  const p = plaque(iw + 6, ih + 6);
  p.rect(3, 3, iw, 5, top).rect(3, 8, iw, ih - 5, low);
  p.stamp(ic.toGrid(), 4, 3);
  p.stamp(t.toGrid(), 3 + 1 + ic.w + 2, 4);
  return p;
}

export const PISTES = [
  { key: 'A', name: 'A, le cadran', where: 'en haut à droite', draw: clockA },
  { key: 'B', name: 'B, la bande du jour', where: 'en bas, au-dessus de la barre', draw: clockB },
  { key: 'C', name: 'C, le ciel de la plaquette', where: 'en haut au centre', draw: clockC },
] as const;
