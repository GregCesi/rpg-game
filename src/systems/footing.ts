import type Phaser from 'phaser';
import { FEET } from '../config';
import type { MapData } from '../content/types';
import type { Player } from '../entities/Player';
import { refusalText, stepRefusal } from '../world/relief';

/**
 * Où Xéros peut poser le pied (chantier « relief ») : à chaque pas de la physique (`worldstep` d'Arcade, plusieurs par image quand le
 * jeu rame), le trajet de ses pieds depuis le pas d'avant passe par world/relief.ts (`stepRefusal` : une marche trop haute, un saut
 * trop grand, l'eau pour qui ne nage pas). Un pas refusé le ramène au dernier point permis, et il glisse le long de l'obstacle (le pas
 * sur un seul axe, s'il passe), comme contre un mur ; le jeu dit pourquoi (« Trop haute pour lui (5 m). », « Il ne sait pas nager. »),
 * une fois par appui. Le principe des franchissements (world/crossing.ts) : on teste le chemin depuis le pas d'avant, jamais la
 * position de l'instant.
 */
export class Footing {
  private last?: { x: number; y: number };
  /** Le refus déjà dit pendant cet appui (rien de nouveau tant qu'il pousse contre la même chose). */
  private said?: string;
  private readonly onStep = () => this.step();

  constructor(
    scene: Phaser.Scene,
    private readonly map: MapData,
    private readonly player: Player,
    private readonly notice: (text: string) => void,
  ) {
    // le monde de la physique de cette scène (au redémarrage de la scène, il est refait : on se détache de celui-ci)
    const world = scene.physics.world;
    world.on('worldstep', this.onStep);
    scene.events.once('shutdown', () => world?.off('worldstep', this.onStep));
  }

  /** Un pas de la physique vient de se faire. */
  private step(): void {
    const a = this.player.actor;
    const now = { x: a.x, y: a.y - FEET.point };
    const last = this.last;
    this.last = now;
    if (!last || (last.x === now.x && last.y === now.y)) return;
    const mob = this.player.mobility.def;
    const refused = stepRefusal(this.map, last, now, mob);
    if (!refused) return;
    // glisser : le pas sur un seul axe, s'il passe
    const slides = [
      { x: now.x, y: last.y },
      { x: last.x, y: now.y },
    ].filter((p) => (p.x !== last.x || p.y !== last.y) && !stepRefusal(this.map, last, p, mob));
    const to = slides[0] ?? last;
    const vx = a.body.velocity.x;
    const vy = a.body.velocity.y;
    a.body.reset(to.x, to.y + FEET.point);
    a.body.setVelocity(vx, vy);
    this.last = to;
    const text = refusalText(refused);
    if (this.said !== text) {
      this.said = text;
      this.notice(text);
    }
  }

  /** À chaque image : un appui relâché (il ne pousse plus) permet de redire le refus. */
  update(): void {
    if (this.player.dir.lengthSq() === 0) this.said = undefined;
  }
}
