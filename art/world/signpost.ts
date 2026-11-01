// Le panneau « vers la ville » (`signpost`, fiche docs/objets/signpost.md) : le poteau indicateur planté au bord de la route
// officielle, à l'est du village. Un poteau équarri de 12 × 12 cm, 1,90 m hors sol ; une planche de 80 × 20 cm (3 cm
// d'épaisseur) clouée sur sa face, en haut, son bout taillé en flèche ; une pierre de calage au pied, du côté de la flèche
// (le poteau est planté et calé : la pierre, 25 × 25 × 10 cm, dépasse du sol). Boîte : 85 × 12 × 190 cm.
//
// Gabarit (docs/STYLE.md, section 8), 5 cm par pixel, lumière nord-ouest, contour d'un pixel (la teinte la plus sombre de la
// matière en haut et à gauche, OUTLINE en bas et à droite). Bois travaillé : la rampe des âges (^ * % & @, `woodAges` de
// art/palette.ts) ; le build tire le patiné et le vieux (`aged` de props.json). La pierre de calage garde la rampe de la pierre
// grise (R r z Z), à tout âge.
//
// - Le poteau : 4 px de large (12 cm, 2,4 px à la taille réelle, agrandi sous le plancher de lisibilité comme la planche du
//   volet de l'étal), 39 rangées : le contour, le bois de bout (une rangée), la face, le bas mouillé.
// - La planche, vue de face : 6 rangées (le dessus de la planche au soleil, la face, le bas à l'ombre), 30 cm au lieu de 23
//   pour que l'inscription se lise comme une inscription : des traits sombres (`@`) sur la face, pas de lettres.
// - Quatre vues, un quart de tour de plus à chaque fois dans le sens des aiguilles d'une montre :
//   r0 (`signpost`) la flèche à l'est, la face écrite vers nous, la planche devant le poteau : 17 × 39 (85 / 5 ; 190 / 5 + 12 / 10) ;
//   r1 la flèche au sud, vers nous : la planche par la tranche, à l'ouest du poteau, qui descend vers nous (son dessus en
//   raccourci, puis le bout taillé) ; la pierre de calage devant le pied : 6 × 45 ;
//   r2 la flèche à l'ouest, le dos de la planche, le poteau devant elle : 17 × 39 ;
//   r3 la flèche au nord, fuyante : la planche par la tranche, à l'est du poteau, qui monte en s'éloignant (son bout carré vers
//   nous, puis son dessus) ; la pierre derrière le poteau, cachée : 6 × 45.
//   Les vues de côté suivent la boîte vue de côté (12 / 5 de large, agrandi à 6 ; 190 / 5 + 85 / 10 = 46,5 de haut, à 2 px près).

import { BOARD_WOOD, outline } from '../lib/board-wall';
import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

const { hi, mid, lo, deep, joint } = BOARD_WOOD;

/** Une forme : un masque de pixels, à peindre puis à contourer. */
type Mask = (x: number, y: number) => boolean;

/** Peint l'intérieur d'un masque avec `paint`, puis pose son contour par-dessus (la pièce passe devant ce qui est déjà là). */
function part(c: Canvas, mask: Mask, paint: (x: number, y: number) => string, edge: string = BOARD_WOOD.edge): void {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (mask(x, y)) c.set(x, y, paint(x, y));
  outline(c, mask, edge);
}

const box = (x0: number, y0: number, x1: number, y1: number): Mask => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

/** Le début des tirets du fil du poteau, depuis son haut. */
const GRAIN = [11, 17, 26, 31];

/**
 * Le poteau, de face, colonnes `x0` à `x0 + 3`, rangées `top` à `top + 38` : le contour, le bois de bout au soleil, la face
 * (son arête ouest au soleil, le bois et son fil), les deux dernières rangées mouillées.
 */
function post(c: Canvas, x0: number, top: number, rows = 39): void {
  const bottom = top + rows - 1;
  part(c, box(x0, top, x0 + 3, bottom), (x, y) => {
    const lit = x === x0 + 1;
    if (y === top + 1) return hi; // le bois de bout, vu de dessus
    if (y >= bottom - 2) return lit ? lo : deep; // le bas mouillé
    if (lit) return hi;
    // le fil : des tirets de 3 rangées, irréguliers, dans la colonne du bois
    return GRAIN.some((g) => y - top >= g && y - top < g + 3) ? lo : mid;
  });
}

/**
 * La pierre de calage : `top` rangées de dessus (au soleil à gauche, `R`, puis `r`), puis sa face (`r` à gauche, `z`), le
 * contour Z côté lumière, OUTLINE à l'ombre.
 */
function stone(c: Canvas, mask: Mask, x0: number, y0: number, top: number, split: number): void {
  part(c, mask, (x, y) => (y - y0 <= top ? (x - x0 <= split ? 'R' : 'r') : x - x0 <= split - 1 ? 'r' : 'z'), 'Z');
}

// =====================================================================================================================
// De face : r0 (la face écrite, la flèche à l'est) et r2 (le dos, la flèche à l'ouest)
// =====================================================================================================================

const W = 17;
/** Les rangées de la planche, contour compris. */
const P0 = 2;
const P1 = 7;

/** La planche fléchée : 17 colonnes, la pointe à l'est (`east`) ou à l'ouest, sur les rangées P0 à P1. */
const plankMask = (east: boolean): Mask => (x, y) => {
  if (y < P0 || y > P1) return false;
  const k = Math.min(y - P0, P1 - y); // 0 au bord, 2 au milieu
  const reach = W - 3 + k; // la flèche : 14, 15, 16 depuis le bout carré
  const u = east ? x : W - 1 - x;
  return u >= 0 && u <= reach;
};

/** Teinte de la planche : le dessus au soleil, la face, le bas à l'ombre, le fil ; les traits de l'inscription sur la face. */
function plankTone(x: number, y: number, east: boolean, written: boolean): string {
  const u = east ? x : W - 1 - x;
  if (y === P0 + 1) return hi;
  if (y === P1 - 1) return (u + 2) % 7 < 2 ? mid : lo;
  if (written && y === P0 + 3) {
    // l'inscription : trois traits de longueurs inégales, entre le poteau et la flèche
    if ((u >= 6 && u <= 7) || (u >= 9 && u <= 11) || (u >= 13 && u <= 14)) return joint;
  }
  if (!written && y === P0 + 2 && (u + 4) % 9 < 3) return lo; // le dos : le fil
  return mid;
}

function face(east: boolean): Canvas {
  const c = new Canvas(W, 40);
  const px = east ? 1 : W - 6; // le poteau, du côté du bout carré (le bout carré dépasse de 5 cm devant, de 10 derrière : son contour seul ne se lirait pas)
  const sx = east ? px + 4 : px - 5; // la pierre de calage, du côté de la flèche
  // la pierre, à côté du pied : 25 cm (5 px), 4 rangées (son dessus, sa face)
  stone(c, (x, y) => x >= sx && x <= sx + 4 && y >= 35 && y <= 38 && !(y === 35 && (x === sx || x === sx + 4)), sx, 35, 1, 2);
  if (east) {
    // la face écrite : la planche clouée devant le poteau
    post(c, px, 0);
    part(c, plankMask(true), (x, y) => plankTone(x, y, true, true));
    // deux clous dans le poteau, l'ombre portée de la planche sur le poteau
    c.set(px + 1, P0 + 2, joint).set(px + 2, P0 + 4, joint);
    c.set(px + 1, P1 + 1, deep).set(px + 2, P1 + 1, deep);
  } else {
    // le dos : la planche derrière, le poteau devant
    part(c, plankMask(false), (x, y) => plankTone(x, y, false, false));
    post(c, px, 0);
  }
  // l'ombre portée, au pied, un peu à droite
  for (let x = Math.min(px, sx) + 1; x <= Math.max(px + 3, sx + 4) + 1 && x < W; x++) c.set(x, 39, 'x');
  return c;
}

// =====================================================================================================================
// De côté : r1 (la flèche vers nous) et r3 (la flèche fuyante)
// =====================================================================================================================

const SW = 6;
const SH = 46;

/**
 * La flèche au sud, vers nous (r1) : la planche par la tranche, à l'ouest du poteau (colonnes 0 à 2), rangées 1 à 13 : son
 * dessus en raccourci (le bord qui prend le soleil) qui descend vers nous, puis son bout taillé en pointe, vu de face, à
 * l'ombre. Le poteau (colonnes 2 à 5) a 40 rangées (sa profondeur ajoute une rangée de dessus) ; la pierre de calage devant
 * son pied, 25 cm au sud (rangées 37 à 44).
 */
function sideSouth(): Canvas {
  const c = new Canvas(SW, SH);
  post(c, 2, 0, 40);
  // la pointe vers nous : la dernière rangée, un pixel
  part(c, (x, y) => box(0, 1, 2, 12)(x, y) || (x === 1 && y === 13), (_x, y) => (y <= 7 ? hi : y <= 10 ? mid : lo));
  stone(c, (x, y) => x >= 1 && x <= 5 && y >= 37 && y <= 44 && !((y === 37 || y === 44) && (x === 1 || x === 5)), 1, 37, 4, 2);
  for (let x = 2; x < SW; x++) c.set(x, SH - 1, 'x');
  c.set(SW - 1, SH - 2, 'x');
  return c;
}

/**
 * La flèche au nord, fuyante (r3) : la planche par la tranche, à l'est du poteau (colonnes 3 à 5), rangées 0 à 13 : son bout
 * carré vers nous (rangées 7 à 13, le bois de bout : la teinte du bois, le bas à l'ombre), puis son dessus qui monte en
 * s'éloignant (rangées 0 à 6, au soleil). Le poteau (colonnes 0 à 3), rangées 6 à 44 ; la pierre de calage derrière lui.
 */
function sideNorth(): Canvas {
  const c = new Canvas(SW, SH);
  post(c, 0, 6);
  part(c, box(3, 0, 5, 13), (_x, y) => (y <= 6 ? hi : y <= 11 ? mid : lo));
  for (let x = 1; x < SW; x++) c.set(x, SH - 1, 'x');
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('signpost', face(true)),
  img('signpost-r1', sideSouth()),
  img('signpost-r2', face(false)),
  img('signpost-r3', sideNorth()),
];
