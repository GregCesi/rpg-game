// Le cadran du temps, sans Phaser (docs/CONCEPTION.md, « Le temps » ; le contrat de pose de art/ui/clock.ts, dessiné par le
// pixel-artist) : en haut à droite, une plaquette de bois « Jour 3 » sur « 14:20 », et un médaillon rond où le soleil puis la lune passent
// sur un arc au-dessus d'une colline, au ciel du moment ; dessous, toujours (x1 compris), la vitesse du temps : un cran par palier (time.json, cinq au plus), autant de
// pleins que le rang du palier, et le chiffre.
// Rend la liste des images à poser, dans l'ordre de dessin, en px de l'écran du HUD (avant le zoom) ; HudScene les pose.
import { time } from '../content';
import { MINUTES_PER_DAY, hhmm, type Clock } from './clock';
import { momentAt, sunSpan, type Moment } from './daylight';

/** Une image à poser : sa clé, son coin haut gauche ; `repeat` : la colonne répétée sur cette largeur (le milieu de la plaquette). */
export interface FacePiece {
  key: string;
  x: number;
  y: number;
  repeat?: number;
}

/** Le contrat de pose, en chiffres (art/ui/clock.ts). */
const FACE = {
  plate: { end: 3, y: 2, line1: 5, line2: 11, extra: 15 },
  dial: { size: 23, overlap: 11 },
  arc: { cx: 11, cy: 14, rx: 5, ry: 6, half: 2 },
  speed: { plate: 29, y: 20, notch: { x: 4, step: 4, y: 24 }, digit: { x: 24, box: 13, y: 23 } },
  margin: 4,
  space: 2,
} as const;

/** Les signes d'un texte (images `ui-digit-<signe>`) : chiffres, J o u r, deux-points, x ; l'espace à part. */
const glyphsOf = (text: string): string[] => [...text].map((c) => (c === ':' ? 'colon' : c === ' ' ? ' ' : c));

/** La largeur d'un texte en signes (contours confondus : chaque signe avance de sa largeur − 1 ; une espace, de 2 de plus). */
function textWidth(glyphs: string[], width: (key: string) => number): number {
  return 1 + glyphs.reduce((s, g) => s + (g === ' ' ? FACE.space : width(`ui-digit-${g}`) - 1), 0);
}

/** Les images d'un texte posé en (x, y). */
function textPieces(glyphs: string[], x: number, y: number, width: (key: string) => number): FacePiece[] {
  const out: FacePiece[] = [];
  let cx = x;
  for (const g of glyphs) {
    if (g === ' ') {
      cx += FACE.space;
      continue;
    }
    out.push({ key: `ui-digit-${g}`, x: cx, y });
    cx += width(`ui-digit-${g}`) - 1;
  }
  return out;
}

/**
 * Le nombre de crans pleins d'une vitesse : son rang parmi les paliers du joueur (time.json : x1 → 1, x20 → 5) ; hors des paliers (x50
 * de ?dieu), celui du palier juste au-dessous.
 */
export function speedRank(speed: number, speeds: readonly number[] = time.speeds): number {
  return Math.max(1, speeds.filter((s) => s <= speed).length);
}

/** L'astre du moment et son coin haut gauche dans le médaillon : le soleil de son lever à son coucher (`sunSpan`, d'après `daylight`), la lune sinon. */
export function bodyAt(minute: number, moment: Moment): { key: string; x: number; y: number } {
  const D = MINUTES_PER_DAY;
  const { rise, set } = sunSpan();
  const m = ((minute % D) + D) % D;
  const sun = m >= rise && m <= set;
  const t = sun ? (m - rise) / (set - rise) : ((m - set + D) % D) / (D - (set - rise));
  const a = Math.PI * (1 - t);
  const { cx, cy, rx, ry, half } = FACE.arc;
  const key = sun ? (moment === 'day' ? 'ui-clock-sun' : 'ui-clock-sun-low') : 'ui-clock-moon';
  return { key, x: Math.round(cx + rx * Math.cos(a)) - half, y: Math.round(cy - ry * Math.sin(a)) - half };
}

/**
 * Le cadran de `clock` à la vitesse `speed`, sur un écran de `viewWidth` px : les images dans l'ordre de dessin (plaquette, textes, ciel,
 * astre, colline, anneau, vitesse). `width(key)` : la largeur d'une image de signe.
 */
export function clockFace(clock: Clock, speed: number, viewWidth: number, width: (key: string) => number): FacePiece[] {
  const day = glyphsOf(`Jour ${clock.day}`);
  const hour = glyphsOf(hhmm(clock));
  const w1 = textWidth(day, width);
  const w2 = textWidth(hour, width);
  const iw = Math.max(w1, w2) + 1;
  const pw = iw + FACE.plate.extra;
  // le médaillon est fixe, à la marge du bord ; la plaquette grandit vers la gauche
  const dialX = viewWidth - FACE.margin - FACE.dial.size;
  const ox = dialX - (pw - FACE.dial.overlap);
  const oy = FACE.margin;
  const p = FACE.plate;
  const moment = momentAt(clock.minute);
  const body = bodyAt(clock.minute, moment);
  const pieces: FacePiece[] = [
    { key: 'ui-clock-plate-left', x: ox, y: oy + p.y },
    { key: 'ui-clock-plate-mid', x: ox + p.end, y: oy + p.y, repeat: pw - 2 * p.end },
    { key: 'ui-clock-plate-right', x: ox + pw - p.end, y: oy + p.y },
    ...textPieces(day, ox + 3 + Math.round((iw - w1) / 2), oy + p.line1, width),
    ...textPieces(hour, ox + 3 + Math.round((iw - w2) / 2), oy + p.line2, width),
    { key: `ui-clock-sky-${moment}`, x: dialX, y: oy },
    { key: body.key, x: dialX + body.x, y: oy + body.y },
    { key: moment === 'night' ? 'ui-clock-hill-night' : 'ui-clock-hill', x: dialX, y: oy },
    { key: 'ui-clock-ring', x: dialX, y: oy },
  ];
  // la vitesse du temps, toujours : la plaquette sous le médaillon (avant l'anneau, qui mord sur son haut), les crans, le chiffre
  const sp = FACE.speed;
  const sx = ox + pw - sp.plate;
  const rank = speedRank(speed);
  const label = glyphsOf(`x${speed}`);
  const lw = textWidth(label, width);
  const ring = pieces.pop()!;
  pieces.push(
    { key: 'ui-clock-speed-plate', x: sx, y: oy + sp.y },
    ...Array.from({ length: time.speeds.length }, (_, k) => ({ key: k < rank ? 'ui-clock-speed-on' : 'ui-clock-speed-off', x: sx + sp.notch.x + sp.notch.step * k, y: oy + sp.notch.y })),
    ...textPieces(label, sx + sp.digit.x + Math.round((sp.digit.box - lw) / 2), oy + sp.digit.y, width),
    ring,
  );
  return pieces;
}
