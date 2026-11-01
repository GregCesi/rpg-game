// La jauge de progression d'un travail (abattre, couper, fendre, tailler…), posée dans le monde au-dessus de la tête de
// Xéros pendant qu'il répète son geste. Même facture que le cadre de la barre d'endurance (art/ui/stamina-bar.ts : bois
// o M m N K), en plus petit : elle reste discrète au zoom du monde. Deux pièces, à largeur fixe.
//
// CONTRAT DE POSE (px du jeu, coordonnées depuis le coin haut-gauche du cadre, (0, 0)) :
// - `ui-work-frame` : 20 × 6, image entière (contour, biseau M en haut et à gauche, ombre N en bas et à droite) ; le fond du
//   creux vide (bois sombre K, N) en fait partie.
// - Creux : coin (2, 2), 16 × 2 px.
// - `ui-work-fill` : 16 × 2, le creux entier rempli (paille claire a / ^), posé en (2, 2) par-dessus le cadre et rogné par la
//   droite : setCrop(0, 0, w, 2) avec w = round(p × 16), p de 0 à 1 (rien à poser à 0 ; 1 px dès 1/32).
// - Pose au-dessus de Xéros (sprite 32 × 48, origine (0,5 ; 1) : les pieds en (16, 48) de sa frame) : coin haut-gauche du
//   cadre à (−10, −68) des pieds, soit la jauge centrée sur lui (x de −10 à +9) et ses rangées de −68 à −63.
//   Pourquoi si haut : la tête est à −34, mais l'outil levé monte bien plus haut. `chop` vu de face, la hache au-dessus de la
//   tête atteint −58 (−59 vu de dos) ; `maul` (fendre) avec la hache, −61. La jauge garde 1 px d'air au-dessus du plus haut
//   (rangée −62 libre) pour tous les outils et toutes les directions. Mesuré d'après gestures.json et les planches tool-*
//   (prise au centre de l'image, comme ToolUse) : si un geste ou un outil plus haut arrive, remonter la jauge d'autant.
//   Elle ne bouge pas avec le geste (pas de rebond), et suit Xéros en arrondissant au px.
//
// Couleurs : cadre en bois (o M m N K), comme ui-slot et ui-bar-* ; remplissage en paille claire (a crème, ^ lumière du
// bois neuf) : franche sur l'herbe (g) comme sur la terre (u), et distincte du vert du souffle (j L l).

import { Canvas, type Palette } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

export const palette: Palette = { ...world };

/** Contrat de pose, en px (voir l'en-tête). */
export const WORK_BAR = {
  w: 20,
  h: 6,
  /** Le creux, depuis le coin du cadre. */
  inner: { x: 2, y: 2, w: 16, h: 2 },
  /** Coin haut-gauche du cadre depuis les pieds de Xéros. */
  offset: { x: -10, y: -68 },
} as const;

/** Le cadre : coins arrondis, biseau clair en haut et à gauche, ombre en bas et à droite, creux vide en bois sombre. */
function frame(): Canvas {
  const { w, h, inner } = WORK_BAR;
  const c = new Canvas(w, h);
  c.rect(1, 0, w - 2, 1, 'o').rect(1, h - 1, w - 2, 1, 'o');
  c.rect(0, 1, 1, h - 2, 'o').rect(w - 1, 1, 1, h - 2, 'o');
  // biseau : la lumière en haut et à gauche, l'ombre en bas et à droite
  c.rect(1, 1, w - 2, 1, 'M').rect(1, 1, 1, h - 2, 'M');
  c.rect(1, h - 2, w - 2, 1, 'N').rect(w - 2, 1, 1, h - 2, 'N');
  c.set(1, h - 2, 'm').set(w - 2, 1, 'm');
  // fond du creux : l'ombre du biseau K en haut, le bois sombre N dessous
  c.rect(inner.x, inner.y, inner.w, 1, 'K').rect(inner.x, inner.y + 1, inner.w, 1, 'N');
  return c;
}

/** Le remplissage : rangée du haut crème, rangée du bas à la lumière du bois neuf. */
function fill(): Canvas {
  const { inner } = WORK_BAR;
  return new Canvas(inner.w, inner.h).rect(0, 0, inner.w, 1, 'a').rect(0, 1, inner.w, 1, '^');
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [img('ui-work-frame', frame()), img('ui-work-fill', fill())] satisfies ImageSource[];
