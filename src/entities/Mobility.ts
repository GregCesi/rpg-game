import { mobility as base } from '../content';
import type { Mobility as MobilityDef } from '../content/types';

/**
 * Composant du joueur : ce que Xéros monte et descend d'un pas, ce dont il saute, la pente qu'il marche et s'il nage (mobility.json,
 * chantier « relief »). Des capacités du personnage, jamais une règle du monde : la falaise est « trop haute pour lui ». ?dieu
 * « escalade » les lève (`climber`), pour vérifier que seul le personnage limite. Ne sait rien du monde : world/relief.ts dit si un pas
 * passe avec ces capacités.
 */
export class Mobility {
  /** ?dieu « escalade » : il monte et descend toute hauteur. */
  climber = false;

  get def(): MobilityDef {
    return this.climber ? { ...base, step: Infinity, drop: Infinity, slope: Infinity } : base;
  }
}
