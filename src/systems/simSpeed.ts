import type Phaser from 'phaser';
import { time } from '../content';
import { STEP_MS, TimeStep } from '../world/timeStep';

/** Les vitesses de simulation proposées dans ?dieu : les paliers du joueur (time.json), et celui de ?dieu. */
export const SIM_SPEEDS: readonly number[] = [...time.speeds, time.dieuSpeed];

/** Le facteur en ce moment (1 : le jeu normal). */
let factor = 1;

/** Le facteur de simulation en ce moment. */
export const simSpeed = (): number => factor;

type Looping = Phaser.Game & { __simStep?: (time: number, delta: number) => void; __timeStep?: TimeStep };

/**
 * Le pas de jeu fixe (world/timeStep.ts, docs/CONCEPTION.md « Le temps ») : la boucle de Phaser donne à chaque pas le temps vrai de
 * l'image (lissé), plus long sur une machine lente ; elle est remplacée, une fois, par une boucle qui fait à chaque image autant de pas
 * de `STEP_MS` que le temps vrai écoulé (× la vitesse de simulation) en demande, jamais un pas plus grand. Tout ce qui avance au pas de
 * jeu (la physique, les bêtes et leurs tirages au hasard, les gestes et leurs animations, les délais, l'horloge) voit donc la même suite
 * de pas sur toutes les machines : un jeu qui rame en fait plusieurs par image. Seul le dernier pas d'une image est dessiné (Phaser
 * `headlessStep` pour les autres). L'horloge des pas (le `time` de chaque pas, que Phaser recopie dans `time.now` de chaque scène : les
 * verrous après une action, le combat) avance de `STEP_MS` à chaque pas, jamais en arrière.
 */
export function startTimeStep(game: Phaser.Game): void {
  const g = game as Looping;
  if (g.__simStep) return;
  const loop = game.loop as Phaser.Core.TimeStep & { callback: (time: number, delta: number) => void };
  // la boucle d'origine, gardée une fois
  const step = (g.__simStep = loop.callback);
  const steps = (g.__timeStep = new TimeStep());
  loop.callback = (time: number) => {
    const at = steps.image(time, factor);
    for (let i = 0; i < at.length - 1; i++) game.headlessStep(at[i], STEP_MS);
    // une image trop tôt pour un pas : rien ne bouge, rien n'est redessiné
    if (at.length) step(at[at.length - 1], STEP_MS);
  };
}

/**
 * La vitesse de simulation (docs/CONCEPTION.md, « Le temps » : à ne pas confondre avec la vitesse du temps, en pause à x1) : à xN, le
 * jeu avance de N fois le temps vrai, en pas de jeu de durée normale (startTimeStep : N fois plus de pas par image, jamais un pas plus
 * grand). Rien n'est sauvegardé : la page rechargée repart à x1.
 */
export function setSimSpeed(game: Phaser.Game, n: number): void {
  factor = Math.max(1, Math.round(n));
  startTimeStep(game);
}
