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
  /**
   * Sa hauteur (cm) : celle du sol sous ses pieds, suivie pas de physique par pas de physique (systems/footing.ts). Sur le relief, la
   * hauteur du terrain ; dans une maison à étages, le dessus où il est (le plancher de l'étage, une marche : world/decks.ts), car deux
   * sols peuvent être au même point (CONCEPTION « L'étage »).
   */
  z = 0;

  get def(): MobilityDef {
    return this.climber ? { ...base, step: Infinity, drop: Infinity, slope: Infinity } : base;
  }
}
