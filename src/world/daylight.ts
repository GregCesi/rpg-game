// La lumière qui suit l'heure, sans Phaser (docs/CONCEPTION.md, « Le temps ») : à chaque minute de la journée, la teinte et l'opacité
// du voile posé sur le monde, et la force du soleil, interpolées entre les repères de world.json (`daylight`), la journée bouclant de
// minuit à minuit. Le jeu (systems/daylight.ts) pose le voile ; le cadran du HUD montre le même moment.
import { world } from '../content';

/** La lumière d'un moment : la teinte du voile (0xrrggbb), son opacité, la force du soleil (0 à 1). */
export interface Light {
  color: number;
  alpha: number;
  sun: number;
}

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/** La lumière à la minute `minute` du jour (0 à 1 440). */
export function lightAt(minute: number, stops = world.daylight): Light {
  const h = (((minute / 60) % 24) + 24) % 24;
  // le repère d'avant et celui d'après, la journée bouclant
  let i = stops.findIndex((s) => s.hour > h);
  const b = i === -1 ? { ...stops[0], hour: stops[0].hour + 24 } : stops[i];
  const a = i <= 0 ? (i === 0 ? { ...stops[stops.length - 1], hour: stops[stops.length - 1].hour - 24 } : stops[stops.length - 1]) : stops[i - 1];
  const t = b.hour === a.hour ? 0 : (h - a.hour) / (b.hour - a.hour);
  const [ra, ga, ba] = rgb(a.color);
  const [rb, gb, bb] = rgb(b.color);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return { color: (mix(ra, rb) << 16) | (mix(ga, gb) << 8) | mix(ba, bb), alpha: a.alpha + (b.alpha - a.alpha) * t, sun: a.sun + (b.sun - a.sun) * t };
}

/** Le moment de la journée, pour le cadran : celui que nomme le dernier repère passé de `daylight` (`moment`), la journée bouclant. */
export type Moment = 'dawn' | 'day' | 'dusk' | 'night';
export function momentAt(minute: number, stops = world.daylight): Moment {
  const h = (((minute / 60) % 24) + 24) % 24;
  const named = stops.filter((s) => s.moment);
  const last = [...named].reverse().find((s) => s.hour <= h) ?? named[named.length - 1];
  return last.moment!;
}

/**
 * Le lever et le coucher du soleil, en minutes : là où sa force quitte 0 et y revient (les repères de `daylight` qui encadrent les
 * repères à soleil) ; l'astre du cadran suit ces heures, comme les rais de soleil du monde.
 */
export function sunSpan(stops = world.daylight): { rise: number; set: number } {
  const first = stops.findIndex((s) => s.sun > 0);
  const last = stops.length - 1 - [...stops].reverse().findIndex((s) => s.sun > 0);
  const rise = first > 0 ? stops[first - 1].hour : 0;
  const set = last < stops.length - 1 ? stops[last + 1].hour : 24;
  return { rise: rise * 60, set: set * 60 };
}
