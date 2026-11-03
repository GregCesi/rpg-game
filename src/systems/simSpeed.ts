import type Phaser from 'phaser';
import { time } from '../content';

/** Les vitesses de simulation proposées dans ?dieu : les paliers du joueur (time.json), et celui de ?dieu. */
export const SIM_SPEEDS: readonly number[] = [...time.speeds, time.dieuSpeed];

/** Le facteur en ce moment (1 : le jeu normal). */
let factor = 1;

/** Le facteur de simulation en ce moment. */
export const simSpeed = (): number => factor;

/**
 * La vitesse de simulation (docs/CONCEPTION.md, « Le temps » : à ne pas confondre avec la vitesse du temps, en pause à x1) : un outil
 * de ?dieu pour regarder un travail plus vite. À xN, chaque image du navigateur fait N pas de jeu complets, chacun de la durée normale
 * d'une image (la physique, les gestes, les pauses, la marche, l'horloge : tout avance d'autant), jamais un pas plus grand ; seul le
 * dernier est dessiné (Phaser `headlessStep` pour les autres). Rien n'est sauvegardé : la page rechargée repart à x1.
 */
export function setSimSpeed(game: Phaser.Game, n: number): void {
  factor = Math.max(1, Math.round(n));
  const loop = game.loop as Phaser.Core.TimeStep & { callback: (time: number, delta: number) => void };
  const g = game as Phaser.Game & { __simStep?: (time: number, delta: number) => void; __simAhead?: number };
  // la boucle d'origine, gardée une fois
  g.__simStep ??= loop.callback;
  g.__simAhead ??= 0;
  const step = g.__simStep;
  // l'horloge du jeu (le `time` de chaque pas, que Phaser recopie dans `time.now` de chaque scène : les verrous après une action, le
  // combat) avance de la durée de chaque pas, et reste croissante d'un pas à l'autre et d'une image à l'autre : les pas de plus d'une
  // image se placent après ceux de l'image d'avant, jamais avant (`__simAhead` : l'avance prise sur le temps vrai, gardée quand on
  // revient à x1, pour que l'horloge ne recule jamais)
  loop.callback = (time: number, delta: number) => {
    g.__simAhead! += (factor - 1) * delta;
    const now = time + g.__simAhead!;
    for (let i = factor - 1; i > 0; i--) game.headlessStep(now - i * delta, delta);
    step(now, delta);
  };
}
