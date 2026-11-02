// Le cadran du temps (chantier « le temps », piste A de l'essai art/proposals/horloge-temps.ts, choisie par Grégoire) : en haut à
// droite de l'écran, une plaquette de bois « Jour 3 » sur « 14:20 », et à sa droite un médaillon rond où le soleil puis la lune
// passent sur un arc au-dessus d'une colline. Le HUD l'assemble à partir des pièces de ce fichier, selon le contrat ci-dessous.
// Planche de contrôle : npx tsx tools/preview-module.ts art/ui/clock-preview.ts .art-preview → .art-preview/cadran.png.
//
// CONTRAT DE POSE (tout en px du jeu ; le HUD est au zoom ZOOM, sa caméra le fait ; aucune image n'est étirée, sauf la
// colonne du milieu de la plaquette, répétée)
//
// 1. Les pièces et leur taille
//    Plaquette : `ui-clock-plate-left` 3 × 19, `ui-clock-plate-mid` 1 × 19 (répétée, tileSprite), `ui-clock-plate-right` 3 × 19.
//    Signes (7 px de haut, comme `ui-digit-0..9`, réutilisés tels quels) : `ui-digit-J` 5 × 7, `ui-digit-o`, `-u`, `-r` 5 × 7
//      (minuscules de 3 px posées sur la ligne), `ui-digit-colon` 3 × 7, `ui-digit-x` 5 × 7 (minuscule, pour la vitesse).
//    Médaillon : toutes ses pièces font 23 × 23 et se posent au même point (son coin haut gauche), sauf les astres (5 × 5) :
//      `ui-clock-sky-dawn`, `-day`, `-dusk`, `-night` (le ciel du moment dans la fenêtre ronde ; les étoiles sont dans la nuit),
//      `ui-clock-sun` (jour), `ui-clock-sun-low` (rougi : aube et crépuscule), `ui-clock-moon` (le croissant),
//      `ui-clock-hill` (aube, jour, crépuscule), `ui-clock-hill-night`, puis `ui-clock-ring` (l'anneau de bois, fenêtre vide).
//    Vitesse : `ui-clock-speed-plate` 41 × 13 (une seule image, largeur fixe ; même facture que la plaquette, creux K de
//      x 3 à 37, y 3 à 9), `ui-clock-speed-on` et `ui-clock-speed-off` 3 × 5 (un cran : triangle ▶ de soleil, plein ; ou
//      entaille de bois, vide).
//
// 2. Un texte en signes : chaque image de signe se pose 1 px avant la fin de la précédente (contours confondus : avance = sa
//    largeur − 1) ; une espace ajoute 2 px à l'avance. Largeur d'un texte = 1 + Σ (largeur du signe − 1) + 2 × espaces.
//    « Jour n » = 19 + 4 × (chiffres de n) ; « hh:mm » = 19 ; « x5 » = 9, « x20 » = 13.
//
// 3. L'assemblage, dans la boîte du cadran (origine en haut à gauche) :
//    iw = max(largeur « Jour n », largeur « hh:mm ») + 1 ; pw = iw + 15 (largeur de la plaquette).
//    Plaquette en (0, 2) : left en x 0, mid de x 3 à pw − 4 (pw − 6 colonnes), right en x pw − 3 (cachée sous le médaillon).
//    « Jour n » en (3 + round((iw − w1) / 2), 5) ; « hh:mm » en (3 + round((iw − w2) / 2), 11) ; round = Math.round.
//    Médaillon en (pw − 11, 0). Boîte : (pw + 12) × 33 (23 sans l'indicateur de vitesse, qui est toujours là en jeu).
//    Indicateur de vitesse, toujours montré, x1 compris : paliers x1, x2, x5, x10, x20, de rang r = 1 à 5 (r crans pleins).
//      Sa plaquette en (sx, 20), sx = pw + 12 − 41 = pw − 29 : alignée à droite sur le médaillon, sa rangée de contour du
//      haut confondue avec celle du bas de la plaquette du jour (y 20) ; l'anneau, posé après, mord sur ses 3 rangées du haut.
//      Cran k (k = 0 à 4) en (sx + 4 + 4k, 24) : `ui-clock-speed-on` si k < r, sinon `ui-clock-speed-off` (x 4, 8, 12, 16, 20
//      dans la plaquette ; le dernier finit en x 22).
//      Chiffre « xN » (texte en signes, règle 2) centré dans une zone de 13 px qui commence en x 24 de la plaquette :
//      en (sx + 24 + round((13 − w) / 2), 23). x1, x2, x5 (w = 9) : x 26 à 34 de la plaquette ; x10, x20 (w = 13) : x 24 à 36.
//    Ordre de dessin : plaquette du jour, plaquette de vitesse, crans, chiffre de vitesse, textes, ciel, astre, colline, anneau.
//    (La plaquette de vitesse doit passer avant l'anneau ; avant ou après la plaquette du jour, le résultat est le même.)
//
// 4. À l'écran (la vue fait VIEW = 640 × 360) : marge de 4 px en haut et à droite. Le médaillon est fixe, en
//    (640 − 4 − 23, 4) = (613, 4) ; la plaquette grandit vers la gauche avec le nombre de chiffres du jour : boîte en
//    x = 613 − (pw − 11), y = 4. Jour 1 à 9 : pw = 39 ; 10 à 99 : 43 ; 100 à 999 : 47.
//    L'indicateur de vitesse est fixe lui aussi : plaquette en (595, 24), de x 595 à 635 et de y 24 à 36 ; crans en
//    (599 + 4k, 28) ; chiffre en (621, 27) pour x1, x2, x5 et en (619, 27) pour x10, x20.
//
// 5. Les moments (minutes depuis minuit, m = min mod 1440) : aube 5 h ≤ m < 8 h ; jour 8 h ≤ m < 18 h 30 ; crépuscule
//    18 h 30 ≤ m < 21 h 30 ; nuit sinon. Ils choisissent le ciel, la colline (nuit ou non) et le soleil (bas hors du jour).
//
// 6. L'astre : le soleil de 6 h à 20 h (m compris entre 360 et 1200, bornes comprises), t = (m − 360) / 840 ; la lune sinon,
//    t = ((m − 1200 + 1440) mod 1440) / 600. a = π (1 − t). Coin haut gauche de l'image 5 × 5, dans le médaillon :
//      x = round(11 + 5 cos a) − 2, y = round(14 − 6 sin a) − 2.
//    Une demi-ellipse de centre (11, 14) (le centre de l'astre), de demi-axes 5 en largeur et 6 en hauteur, de l'est (à gauche,
//    t = 0) à l'ouest (t = 1), haute à midi (y = 6). Le soleil à 6 h : (4, 12) ; à 13 h : (9, 6) ; à 20 h : (14, 12).
//    Ce qui passe derrière : la colline cache l'astre à partir de la rangée 14 (15 à droite de la colonne 14) ; à son lever et
//    à son coucher il est aux trois cinquièmes dessous. L'anneau, posé après, coupe tout ce qui sortirait de la fenêtre ronde
//    (elle va de x 4 à 18 au plus large) : pas de masque à faire.

import { Canvas, EMPTY, type Grid, type Palette } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { sky, world } from '../palette';
import { palette as hud } from './dialog';

/** Palette du médaillon : le monde (bois, herbe, soleil, parchemin) et les ciels. */
export const palette: Palette = { ...world, ...sky };

export type Moment = 'dawn' | 'day' | 'dusk' | 'night';

/** Le contrat de pose, en chiffres (voir l'en-tête). */
const CLOCK = {
  plate: { h: 19, end: 3, y: 2, line1: 5, line2: 11, extra: 15 },
  dial: { size: 23, overlap: 11, center: 11 },
  arc: { cx: 11, cy: 14, rx: 5, ry: 6, half: 2 },
  hill: { ridge: 14, step: 14 },
  speed: {
    steps: [1, 2, 5, 10, 20],
    plate: { w: 41, h: 13, y: 20 },
    notch: { x: 4, y: 4, step: 4, w: 3, h: 5 },
    digit: { x: 24, y: 3, zone: 13 },
  },
  sun: { rise: 6 * 60, set: 20 * 60 },
  moments: { dawn: 5 * 60, day: 8 * 60, dusk: 18 * 60 + 30, night: 21 * 60 + 30 },
  margin: 4,
} as const;

const SKY: Record<Moment, [string, string]> = {
  dawn: ['(', ')'],
  day: ['<', '>'],
  dusk: ['?', '/'],
  night: ['-', '_'],
};

/** Le moment de la journée à `min` minutes depuis minuit. */
export function momentOf(min: number): Moment {
  const m = ((min % 1440) + 1440) % 1440;
  const k = CLOCK.moments;
  if (m >= k.dawn && m < k.day) return 'dawn';
  if (m >= k.day && m < k.dusk) return 'day';
  if (m >= k.dusk && m < k.night) return 'dusk';
  return 'night';
}

/** L'astre visible et le coin haut gauche de son image dans le médaillon. */
export function bodyAt(min: number): { key: 'ui-clock-sun' | 'ui-clock-sun-low' | 'ui-clock-moon'; x: number; y: number } {
  const m = ((min % 1440) + 1440) % 1440;
  const { rise, set } = CLOCK.sun;
  const sun = m >= rise && m <= set;
  const t = sun ? (m - rise) / (set - rise) : (((m - set) + 1440) % 1440) / (1440 - (set - rise));
  const a = Math.PI * (1 - t);
  const { cx, cy, rx, ry, half } = CLOCK.arc;
  const key = !sun ? 'ui-clock-moon' : momentOf(m) === 'day' ? 'ui-clock-sun' : 'ui-clock-sun-low';
  return { key, x: Math.round(cx + rx * Math.cos(a)) - half, y: Math.round(cy - ry * Math.sin(a)) - half };
}

// ---------------------------------------------------------------------------------------------------------------------
// Les signes
// ---------------------------------------------------------------------------------------------------------------------

/** Les signes nouveaux, dans le style de `ui-digit-*` (3 px de large, parchemin a) : J capitale, o u r x minuscules, deux-points. */
const GLYPHS: Record<string, string[]> = {
  J: ['..#', '..#', '..#', '#.#', '##.'],
  o: ['...', '...', '###', '#.#', '###'],
  u: ['...', '...', '#.#', '#.#', '###'],
  r: ['...', '...', '###', '#..', '#..'],
  x: ['...', '...', '#.#', '.#.', '#.#'],
  colon: ['.', '#', '.', '#', '.'],
};

function glyph(rows: string[]): Canvas {
  const c = new Canvas(rows[0].length + 2, rows.length + 2);
  rows.forEach((row, y) => [...row].forEach((k, x) => { if (k === '#') c.set(x + 1, y + 1, 'a'); }));
  return c.outline('o', true);
}

/** La clé d'image d'un caractère du cadran. */
const glyphKey = (ch: string): string => `ui-digit-${ch === ':' ? 'colon' : ch}`;

// ---------------------------------------------------------------------------------------------------------------------
// La plaquette
// ---------------------------------------------------------------------------------------------------------------------

/**
 * La plaquette, de la facture de la barre d'endurance : bord de 3 px (contour, biseau M en haut et à gauche, N en bas et à
 * droite ; liseré du creux N en haut et à gauche, m en bas et à droite), coins arrondis ; le creux en bois sombre K.
 */
function plaque(w: number, h: number): Canvas {
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

const cut = (c: Canvas, x: number, w: number): Grid => c.toGrid().map((r) => r.slice(x, x + w));

// ---------------------------------------------------------------------------------------------------------------------
// Le médaillon
// ---------------------------------------------------------------------------------------------------------------------

const S = CLOCK.dial.size;
const C = CLOCK.dial.center;
const dist = (x: number, y: number) => Math.hypot(x - C, y - C);
/** La fenêtre de ciel : le disque de rayon 7,6. */
const inWindow = (x: number, y: number) => dist(x, y) <= 7.6;

/** L'anneau de bois : contour o, biseau M (côté lumière) ou N, liseré N ou m ; la fenêtre reste vide. */
function ring(): Canvas {
  const c = new Canvas(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = dist(x, y);
    if (d > 11.4 || d <= 7.6) continue;
    const ul = x + y < 2 * C;
    c.set(x, y, d > 10.4 ? 'o' : d > 8.6 ? (ul ? 'M' : 'N') : ul ? 'N' : 'm');
  }
  return c;
}

/** Les étoiles de la nuit : quelques points de parchemin, voulus. */
const STARS: [number, number][] = [[8, 5], [14, 4], [16, 8], [6, 9]];

/** Le ciel d'un moment dans la fenêtre : le haut jusqu'à la rangée 7, l'horizon dessous ; la nuit, ses étoiles. */
function skyOf(moment: Moment): Canvas {
  const [top, low] = SKY[moment];
  const c = new Canvas(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inWindow(x, y)) c.set(x, y, y < 8 ? top : low);
  if (moment === 'night') for (const [x, y] of STARS) c.set(x, y, 'a');
  return c;
}

/** La colline : un dos rond qui descend d'un pixel à l'ouest ; herbe éclairée sur la crête, l dessous (l et k la nuit). */
function hill(night: boolean): Canvas {
  const [crest, body] = night ? ['l', 'k'] : ['L', 'l'];
  const c = new Canvas(S, S);
  for (let x = 0; x < S; x++) {
    const ridge = CLOCK.hill.ridge + (x > CLOCK.hill.step ? 1 : 0);
    for (let y = ridge; y < S; y++) if (inWindow(x, y)) c.set(x, y, y === ridge ? crest : body);
  }
  return c;
}

/** Le soleil, 5 × 5 : lumière H en haut à gauche, h en bas à droite ; rougi (h, i) bas sur l'horizon. */
function sun(low: boolean): Grid {
  const [l, b] = low ? ['h', 'i'] : ['H', 'h'];
  return ['.LLL.', 'LLLLB', 'LLLLB', 'LLLBB', '.BBB.'].map((r) => r.replace(/L/g, l).replace(/B/g, b));
}

/** La lune, un croissant de 5 × 5 tourné vers l'est (sa lumière vient du soleil couché), en parchemin a, ombré D aux cornes. */
const MOON: Grid = ['.aaa.', 'aaD..', 'aa...', 'aaD..', '.aaa.'];

// ---------------------------------------------------------------------------------------------------------------------
// L'assemblage (le contrat, exécutable : la planche de contrôle s'en sert, le HUD fait de même)
// ---------------------------------------------------------------------------------------------------------------------

export interface Placed { key: string; x: number; y: number; repeat?: number }

/** Les signes d'un texte posés à partir de (x, y), et sa largeur. */
function layText(s: string, x: number, y: number, width: (key: string) => number): { parts: Placed[]; w: number } {
  const parts: Placed[] = [];
  let at = x;
  let last = 0;
  for (const ch of s) {
    if (ch === ' ') { at += 2; continue; }
    const key = glyphKey(ch);
    const w = width(key);
    parts.push({ key, x: at, y });
    at += w - 1;
    last = at + 1;
  }
  return { parts, w: last - x };
}

export const hhmm = (min: number): string => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Le rang du palier de vitesse (1 à 5) : le nombre de crans pleins ; une vitesse hors des paliers prend celui juste au-dessous. */
export const speedRank = (speed: number): number => Math.max(1, CLOCK.speed.steps.filter((s) => s <= speed).length);

/**
 * Toutes les pièces du cadran pour le jour `day`, l'heure `min` et la vitesse `speed`, dans la boîte du cadran ; `speed` null :
 * le cadran seul, sans l'indicateur de vitesse (pour le comparer à l'essai).
 */
export function clockLayout(day: number, min: number, speed: number | null, width: (key: string) => number): { parts: Placed[]; w: number; h: number } {
  const { plate, dial } = CLOCK;
  const w1 = layText(`Jour ${day}`, 0, 0, width).w;
  const w2 = layText(hhmm(min), 0, 0, width).w;
  const iw = Math.max(w1, w2) + 1;
  const pw = iw + plate.extra;
  const dx = pw - dial.overlap;
  const moment = momentOf(min);
  const b = bodyAt(min);
  const parts: Placed[] = [
    { key: 'ui-clock-plate-left', x: 0, y: plate.y },
    { key: 'ui-clock-plate-mid', x: plate.end, y: plate.y, repeat: pw - 2 * plate.end },
    { key: 'ui-clock-plate-right', x: pw - plate.end, y: plate.y },
    ...layText(`Jour ${day}`, plate.end + Math.round((iw - w1) / 2), plate.line1, width).parts,
    ...layText(hhmm(min), plate.end + Math.round((iw - w2) / 2), plate.line2, width).parts,
    { key: `ui-clock-sky-${moment}`, x: dx, y: 0 },
    { key: b.key, x: dx + b.x, y: b.y },
    { key: moment === 'night' ? 'ui-clock-hill-night' : 'ui-clock-hill', x: dx, y: 0 },
    { key: 'ui-clock-ring', x: dx, y: 0 },
  ];
  const w = pw + dial.size - dial.overlap;
  let h = dial.size;
  if (speed !== null) {
    const { plate: sp, notch, digit } = CLOCK.speed;
    const sx = w - sp.w;
    const rank = speedRank(speed);
    const s = `x${speed}`;
    const ws = layText(s, 0, 0, width).w;
    const tab: Placed[] = [
      { key: 'ui-clock-speed-plate', x: sx, y: sp.y },
      ...CLOCK.speed.steps.map((_, k) => ({ key: k < rank ? 'ui-clock-speed-on' : 'ui-clock-speed-off', x: sx + notch.x + k * notch.step, y: sp.y + notch.y })),
      ...layText(s, sx + digit.x + Math.round((digit.zone - ws) / 2), sp.y + digit.y, width).parts,
    ];
    // la plaquette de vitesse passe sous le cadran : juste après la plaquette du jour (ses trois pièces), avant les textes
    parts.splice(3, 0, ...tab);
    h = sp.y + sp.h;
  }
  return { parts, w, h };
}

// ---------------------------------------------------------------------------------------------------------------------
// Les images
// ---------------------------------------------------------------------------------------------------------------------

const img = (name: string, grid: Grid, pal: Palette = palette): ImageSource => ({ kind: 'image', name, palette: pal, grid });
const p7 = plaque(7, CLOCK.plate.h);

/**
 * Un cran de vitesse, 3 × 5, un triangle pointé vers l'est (▶, le temps qui file) ; plein, de soleil
 * (H éclairé en haut à gauche, h dessous et à droite) ; vide, une entaille de bois N dans le creux K.
 */
function notch(on: boolean): Grid {
  const [l, b] = on ? ['H', 'h'] : ['N', 'N'];
  return ['L..', 'LL.', 'LLB', 'LB.', 'B..'].map((r) => r.replace(/L/g, l).replace(/B/g, b));
}

const sources: ImageSource[] = [
  img('ui-clock-speed-plate', plaque(CLOCK.speed.plate.w, CLOCK.speed.plate.h).toGrid()),
  img('ui-clock-speed-on', notch(true)),
  img('ui-clock-speed-off', notch(false)),
  img('ui-clock-plate-left', cut(p7, 0, 3)),
  img('ui-clock-plate-mid', cut(p7, 3, 1)),
  img('ui-clock-plate-right', cut(p7, 4, 3)),
  ...Object.entries(GLYPHS).map(([k, rows]) => img(`ui-digit-${k}`, glyph(rows).toGrid(), hud)),
  img('ui-clock-ring', ring().toGrid()),
  ...(['dawn', 'day', 'dusk', 'night'] as Moment[]).map((m) => img(`ui-clock-sky-${m}`, skyOf(m).toGrid())),
  img('ui-clock-hill', hill(false).toGrid()),
  img('ui-clock-hill-night', hill(true).toGrid()),
  img('ui-clock-sun', sun(false)),
  img('ui-clock-sun-low', sun(true)),
  img('ui-clock-moon', MOON),
];

export default sources;
