// Le lancer, sans Phaser (docs/CONCEPTION.md, « Le lancer ») : tout objet tenu se lance, c'est la physique qui dit jusqu'où. Le bras de
// Xéros applique son couple (`swing` de strength.json, plafonné à `humanMax` par entities/Strength.ts) sur l'angle du lancer, comme pour
// un coup (world/swing.ts, world/heft.ts) : l'inertie est celle du bras, plus l'objet dans la main au bout du bras, plus l'objet autour
// de la main (world/strike.ts `inertia`, de ses dimensions) ; la main arrive à ω = min(√(2 τ θ / I), ω du bras) et lâche l'objet à
// v = ω × la longueur du bras. Un caillou part vite et loin (la vitesse du bras plafonne) ; une hache, lourde, part lentement et pas
// loin ; une bûche de 65 kg tombe à ses pieds. Ensuite, une vraie trajectoire : la hauteur de la main au lâcher, la pesanteur ; l'angle
// est celui qui atteint le point visé s'il est à portée, sinon celui de la portée la plus grande. Le prix est le travail du bras
// (½ I ω²), payé au joule comme un coup ; l'impact vaut l'énergie de l'objet à l'arrivée (½ m v²).

import { combat } from '../content';
import { heldMass, type Weighed } from '../content/mass';
import type { Swinger } from '../content/types';
import { heftOf } from './heft';
import { inertia } from './strike';

/** Le lâcher : la masse (kg), l'inertie de tout ce que le bras met en mouvement (kg·m²), sa vitesse angulaire (rad/s), la vitesse de l'objet (m/s), le travail du bras (J). */
export interface Release {
  kg: number;
  inertia: number;
  omega: number;
  speed: number;
  /** Le travail du bras, ½ I ω² (J) : ce que paie l'endurance, comme un coup. */
  joules: number;
}

/** Le lâcher de `h` par `who` (le couple et la vitesse du bras de Xéros). */
export function releaseOf(h: Weighed, who: Swinger): Release {
  const t = combat.throw;
  const kg = heldMass(h);
  const heft = heftOf(h);
  // le bras, l'objet au bout du bras, l'objet autour de la main (une hache tenue au manche tourne aussi sur elle-même)
  const I = t.armInertia + kg * t.arm * t.arm + (heft ? inertia(heft.weapon, kg) : 0);
  const omega = Math.min(Math.sqrt((2 * who.torque * t.angle) / I), who.omegaMax);
  return { kg, inertia: I, omega, speed: omega * t.arm, joules: 0.5 * I * omega * omega };
}

/** La portée au sol (m) d'un objet lancé à `v` m/s sous l'angle `a` (rad, au-dessus de l'horizontale), depuis `h` m, sous `g`. */
export function rangeAt(v: number, a: number, h: number, g: number): number {
  const vx = v * Math.cos(a);
  const vy = v * Math.sin(a);
  return (vx * (vy + Math.sqrt(vy * vy + 2 * g * h))) / g;
}

/** L'angle de la portée la plus grande depuis la hauteur `h` : atan(v / √(v² + 2 g h)). */
export const bestAngle = (v: number, h: number, g: number): number => Math.atan(v / Math.sqrt(v * v + 2 * g * h));

/** La portée la plus grande (m). */
export const maxRange = (v: number, h: number, g: number): number => rangeAt(v, bestAngle(v, h, g), h, g);

/**
 * L'angle qui fait tomber l'objet à `d` m : la trajectoire basse (la plus directe) s'il est à portée, sinon l'angle de la portée la plus
 * grande. La portée croît de l'angle le plus bas (lancé vers le sol, à ses pieds) jusqu'à l'angle de la plus grande : on cherche entre.
 */
export function angleFor(d: number, v: number, h: number, g: number): number {
  const best = bestAngle(v, h, g);
  if (d >= rangeAt(v, best, h, g)) return best;
  let lo = -Math.PI / 2 + 1e-3;
  let hi = best;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (rangeAt(v, mid, h, g) < d) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Un point de la trajectoire : `t` s après le lâcher, `d` m parcourus au sol, à `z` m de haut, à `v` m/s. */
export interface FlightPoint {
  t: number;
  d: number;
  z: number;
  v: number;
}

/**
 * La trajectoire, pas à pas (`step` s, combat.json `throw`), du lâcher jusqu'au sol (le dernier point est au sol, z = 0) ; avec `below`
 * (m), elle continue sous ce sol jusqu'à z = −below : le relief (un lancer du haut de la falaise) dit où elle retombe vraiment
 * (`landing`).
 */
export function flight(v: number, a: number, h: number, g: number, step = combat.throw.step, below = 0): FlightPoint[] {
  const vx = v * Math.cos(a);
  const vy = v * Math.sin(a);
  const tEnd = (vy + Math.sqrt(vy * vy + 2 * g * (h + below))) / g;
  const out: FlightPoint[] = [];
  const at = (t: number): FlightPoint => ({ t, d: vx * t, z: Math.max(-below, h + vy * t - (g * t * t) / 2), v: Math.hypot(vx, vy - g * t) });
  for (let t = 0; t < tEnd; t += step) out.push(at(t));
  out.push(at(tEnd));
  return out;
}

/** L'énergie de l'objet de `kg` kg à `v` m/s (J) : ce que vaut l'impact. */
export const kinetic = (kg: number, v: number): number => 0.5 * kg * v * v;

/**
 * Le lancer vers un point à `d` m, depuis la main au lâcher : son lâcher, l'angle, la trajectoire, où il tombe (m), et l'énergie à
 * l'arrivée au sol (J).
 */
export function throwPlan(h: Weighed, who: Swinger, d: number, rise = 0, below = 0): { release: Release; angle: number; path: FlightPoint[]; range: number; landing: number } {
  const t = combat.throw;
  const release = releaseOf(h, who);
  // le point visé est `rise` m plus haut (ou plus bas) que le sol de Xéros : la main est d'autant moins haut au-dessus de lui ; plus haut
  // que la main, on vise juste sous elle, et le relief arrête l'objet là où il rencontre le sol (`landing`)
  const above = Math.max(0.1, t.height - rise);
  const angle = angleFor(Math.max(0, d), release.speed, above, t.gravity);
  const path = flight(release.speed, angle, above, t.gravity, t.step, below);
  const last = path[path.length - 1];
  return { release, angle, path, range: last.d, landing: kinetic(release.kg, last.v) };
}

/**
 * Où s'arrête un vol au-dessus du relief (chantier « relief ») : `z(i)`, la hauteur de l'objet au point `i` (m, absolue), `ground(i)`
 * celle du sol sous lui. Il retombe au premier point où il passe sous le sol ; si le sol y a monté d'un coup plus haut que lui (une
 * face, une falaise), il s'arrête contre elle et tombe à son pied, au point d'avant. Rend l'indice du dernier point du vol.
 */
export function landing(n: number, z: (i: number) => number, ground: (i: number) => number, wall = 0.5): number {
  for (let i = 1; i < n; i++) {
    if (z(i) > ground(i)) continue;
    return ground(i) - ground(i - 1) > wall && z(i - 1) > ground(i - 1) ? i - 1 : i;
  }
  return n - 1;
}
