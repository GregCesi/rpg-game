import { STEP } from '../config';

/**
 * La durée d'un pas de jeu (ms) : `1000 × (1 / fps)`, écrit comme la physique d'Arcade calcule le sien (`_frameTimeMS` de son monde),
 * au même arrondi près : chaque pas de jeu fait alors exactement un pas de physique, jamais zéro ni deux.
 */
export const STEP_MS = 1000 * (1 / STEP.fps);

/**
 * Le pas de jeu fixe (docs/CONCEPTION.md, « Le temps » ; sans Phaser) : le jeu avance toujours par pas de `STEP_MS`, quelle que soit la
 * machine. Une image du navigateur arrive `réel` ms après la précédente ; à la vitesse `factor` (la vitesse de simulation,
 * systems/simSpeed.ts), elle doit faire avancer le jeu de `réel × factor` ms : autant de pas fixes que cela en contient (le reste attend
 * l'image suivante). Une machine lente fait donc plusieurs pas par image, une rapide un seul : le jeu, ses bêtes, ses gestes, ses
 * tirages au hasard voient exactement la même suite de pas, donc donnent le même résultat. Au-delà de `maxPerImage × factor` pas pour
 * une image (la page cachée, une machine à moins de 7,5 images par seconde), le jeu ralentit : le retard est abandonné, jamais rattrapé
 * d'un coup ni par un pas plus grand.
 */
export class TimeStep {
  /** Le temps à jouer (ms de jeu), pas encore fait ; jusqu'à `-slack` : un pas fait un peu en avance, sur une image un peu courte. */
  private owed = 0;
  /** L'instant de l'image précédente (ms, temps vrai). */
  private last?: number;
  /** L'horloge du jeu : l'instant du dernier pas (ms), croissant de `STEP_MS` à chaque pas, jamais en arrière. */
  private clock?: number;

  constructor(
    private readonly maxPerImage = STEP.maxPerImage,
    private readonly slack = STEP.slack,
  ) {}

  /** L'horloge du jeu (l'instant du dernier pas), undefined avant le premier. */
  get now(): number | undefined {
    return this.clock;
  }

  /**
   * Une image du navigateur à l'instant `time` (ms, temps vrai), à la vitesse `factor` : les instants des pas de jeu à faire, dans
   * l'ordre (chacun dure `STEP_MS`) ; une liste vide si cette image arrive trop tôt pour un pas.
   */
  image(time: number, factor: number): number[] {
    // la première image : un pas, l'horloge du jeu part du temps vrai
    if (this.last === undefined || this.clock === undefined) {
      this.last = time;
      this.clock = time;
      return [time];
    }
    const real = Math.max(0, time - this.last);
    this.last = time;
    this.owed += real * factor;
    let n = Math.floor((this.owed + this.slack) / STEP_MS);
    const max = this.maxPerImage * Math.max(1, factor);
    if (n > max) {
      n = max;
      this.owed = 0;
    } else this.owed -= n * STEP_MS;
    const steps: number[] = [];
    for (let i = 0; i < n; i++) steps.push((this.clock += STEP_MS));
    return steps;
  }
}
