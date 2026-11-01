// L'horloge du jeu, sans Phaser (docs/CONCEPTION.md, « Le temps ») : une seule horloge de 24 h, un jour et une minute (de 0 à 1 440,
// avec des fractions). Elle avance à la vitesse du temps choisie par le joueur (un palier de time.json : à x1, une minute réelle fait une
// minute de jeu ; à x24, une journée dure une heure), et des minutes de travail pendant un geste (CONCEPTION : un travail garde la
// durée de son geste, l'horloge avance de sa durée réaliste). Elle ne fait avancer que l'heure : la marche, les gestes, le souffle
// vivent sur la simulation (les secondes jouées).

/** Un moment de la partie : le jour (1 au départ) et la minute du jour (de 0 à 1 440, avec des fractions). */
export interface Clock {
  day: number;
  minute: number;
}

export const MINUTES_PER_DAY = 24 * 60;

/** Le moment `minutes` minutes de jeu plus tard (le jour change à minuit). */
export function later(c: Clock, minutes: number): Clock {
  const total = c.minute + Math.max(0, minutes);
  return { day: c.day + Math.floor(total / MINUTES_PER_DAY), minute: total % MINUTES_PER_DAY };
}

/** Minutes de jeu qui passent pendant `realMs` millisecondes jouées à la vitesse `speed` (x1 : une minute réelle, une minute de jeu). */
export const gameMinutes = (realMs: number, speed: number): number => (realMs / 60000) * speed;

/** Minutes écoulées de `a` à `b` (b après a). */
export const between = (a: Clock, b: Clock): number => (b.day - a.day) * MINUTES_PER_DAY + (b.minute - a.minute);

/** L'heure, « 14:05 ». */
export function hhmm(c: Clock): string {
  const m = Math.floor(c.minute);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Ce qu'affiche l'écran : « Jour 3 · 14:05 ». */
export const clockLabel = (c: Clock): string => `Jour ${c.day} · ${hhmm(c)}`;

/** Le palier voisin dans la liste (`dir` +1 : plus vite, −1 : moins vite), en boucle (V après x20 : x1 ; Maj + V après x1 : x20). */
export function nextSpeed(speeds: readonly number[], current: number, dir: 1 | -1): number {
  const i = Math.max(0, speeds.indexOf(current));
  // en boucle : après le dernier, le premier ; avant le premier, le dernier
  return speeds[(i + dir + speeds.length) % speeds.length];
}
