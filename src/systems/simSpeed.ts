import Phaser from 'phaser';

/** Les vitesses de simulation proposées dans ?dieu. */
export const SIM_SPEEDS = [1, 2, 5, 10] as const;

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
  const g = game as Phaser.Game & { __simStep?: (time: number, delta: number) => void };
  // la boucle d'origine, gardée une fois
  g.__simStep ??= loop.callback;
  const step = g.__simStep;
  loop.callback =
    factor === 1
      ? step
      : (time: number, delta: number) => {
          for (let i = factor - 1; i > 0; i--) game.headlessStep(time - i * delta, delta);
          step(time, delta);
        };
}
