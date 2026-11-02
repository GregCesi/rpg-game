// Ce qu'on tient, vu comme une arme (docs/CONCEPTION.md, « Le combat » ; décidé par Grégoire le 2 novembre 2026 : tout objet tenu
// peut frapper), sans Phaser. Une arme déclarée (`weapon` d'items.json) est telle quelle ; tout autre objet portable (un outil, une
// pierre, un seau, une pièce de bois) est une arme improvisée, tirée de ses dimensions et de sa masse : sa longueur est sa plus grande
// dimension, la main le tient à `improvised.grip` de sa longueur depuis le bout, son équilibre et son efficacité sont ceux de
// `improvised` (combat.json). Sa portée et sa précision se calculent comme pour une arme (world/strike.ts) ; sa vitesse, son énergie
// (ses dégâts, son prix au joule) et la durée de son geste, par la physique des outils au travail (`improvisedStroke`, le couple du
// bras) : la doloire porte court, une perche porte loin et frappe lentement, une pierre lourde ne frappe jamais plus fort que le bras.

import { combat, items, props, work } from '../content';
import { heldMass, type Weighed } from '../content/mass';
import type { Dims } from '../content/gabarit';
import type { Swinger, Weapon } from '../content/types';
import { inertia } from './strike';
import { woodDims } from './woodPiece';

/** Une arme et sa masse : ce que frappe le coup. `improvised` : tirée des dimensions (pas de `weapon` déclaré). */
export interface Heft {
  weapon: Weapon;
  kg: number;
  improvised: boolean;
}

/** Les dimensions réelles de ce qu'on tient (cm) : celles de l'objet, ou de la pièce de bois dans ses réglages. */
export function heldDims(h: Weighed): Dims | undefined {
  if ('item' in h) return items[h.item]?.dims;
  if (h.wood) return woodDims(h.wood);
  return props[h.prop]?.dims;
}

/** L'arme improvisée d'un objet de dimensions `dims` (cm) : sa plus grande dimension, tenue au bout. */
export function improvised(dims: Dims): Weapon {
  const r = combat.rules.improvised;
  const length = Math.max(dims.w, dims.d, dims.h, 1);
  return { length, grip: Math.round(length * r.grip * 10) / 10, balance: r.balance, efficiency: r.efficiency, family: r.family };
}

/** Ce qu'on tient, comme arme : son `weapon` déclaré, sinon l'arme improvisée de ses dimensions (undefined : sans dimensions). */
export function heftOf(h: Weighed): Heft | undefined {
  const kg = heldMass(h);
  const declared = 'item' in h ? items[h.item]?.weapon : undefined;
  if (declared) return { weapon: declared, kg, improvised: false };
  const dims = heldDims(h);
  return dims ? { weapon: improvised(dims), kg, improvised: true } : undefined;
}

/**
 * Le coup d'une arme improvisée, par la physique des outils au travail (world/swing.ts) : le bras applique son couple `torque` sur
 * l'angle du coup de côté (`use` de work.json) ; l'objet arrive à ω = min(√(2 τ θ / I), ω du bras), avec l'énergie ½ I ω² (jamais plus
 * que le travail du bras, τ θ). Un objet compact et lourd (une pierre) part vite mais plafonne à ce travail ; un long (une perche) part
 * lentement : le geste s'allonge de ω du bras / ω (`slow`). Rend l'énergie (J) et ce facteur.
 */
export function improvisedStroke(h: Heft, who: Swinger): { joules: number; slow: number } {
  const I = Math.max(1e-6, inertia(h.weapon, h.kg));
  const angle = work.strokes.use.angle;
  const omega = Math.min(Math.sqrt((2 * who.torque * angle) / I), who.omegaMax);
  return { joules: 0.5 * I * omega * omega, slow: who.omegaMax / omega };
}
