import { ROLL } from '../config';
import { strength as base } from '../content';

/**
 * Composant du joueur : la force de Xéros. Les seuils (strength.json : ce qu'il porte, ce avec quoi il marche normalement,
 * ce qu'il fait rouler) viennent du contenu ; `multiplier` (1, ou le champ « force » des outils de test) les multiplie tous.
 * `load` est la masse qu'il porte en ce moment (la somme de ses deux mains, mise à jour par la scène à chaque changement
 * des mains). Ne sait rien du monde : il répond seulement « puis-je ? » et « à quelle vitesse ? ».
 */
export class Strength {
  multiplier = 1;
  /** Masse portée, en kg. */
  load = 0;

  get carry(): number {
    return base.carry * this.multiplier;
  }

  get walk(): number {
    return base.walk * this.multiplier;
  }

  get roll(): number {
    return base.roll * this.multiplier;
  }

  /** Peut-il porter `kg` de plus en plus de ce qu'il tient ? (les deux mains ensemble : `carry`) */
  canCarry(kg: number): boolean {
    return this.load + kg <= this.carry + 1e-9;
  }

  /** Court-il encore ? Pas au-delà de `walk` porté. */
  canRun(): boolean {
    return this.load <= this.walk + 1e-9;
  }

  /** Sa marche en part de la normale : 1 jusqu'à `walk`, puis de moins en moins, jusqu'à `slowest` à `carry`. */
  walkFactor(): number {
    if (this.load <= this.walk) return 1;
    const t = Math.min(1, (this.load - this.walk) / (this.carry - this.walk));
    return 1 - (1 - base.slowest) * t;
  }

  /** Fait-il rouler `kg` ? C'est ce calcul qui décide : au-delà de `roll`, rien ne bouge. */
  canRoll(kg: number): boolean {
    return kg <= this.roll + 1e-9;
  }

  /** Vitesse d'une bille de `kg` qui roule, en part de la marche normale : 1 − kg / roll, entre `ROLL.minFactor` et `ROLL.maxFactor`. */
  rollFactor(kg: number): number {
    return Math.min(ROLL.maxFactor, Math.max(ROLL.minFactor, 1 - kg / this.roll));
  }
}
