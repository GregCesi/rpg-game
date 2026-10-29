// Sauvegarde automatique : écrit la partie dans le navigateur dès qu'elle a changé (compteur de GameState), avec la
// carte et la position de Xéros. Appelée à chaque image par WorldScene.update ; aussi à l'arrivée sur une carte et
// quand la page se cache ou se ferme (rechargement compris), pour garder sa dernière position.
import { maps } from '../content';
import type { MapData } from '../content/types';
import type { Player } from '../entities/Player';
import { game, revisionOf, writeSave, type Where } from '../state';
import { exitAt } from './exits';

export class AutoSave {
  /** Numéro du changement déjà écrit. */
  private saved = -1;

  constructor(
    private readonly map: MapData,
    private readonly player: Player,
  ) {}

  /** Écrit la partie si elle a changé depuis la dernière écriture, ou toujours avec `force`. */
  update(force = false): void {
    if (!force && revisionOf() === this.saved) return;
    writeSave(game, this.where());
    this.saved = revisionOf();
  }

  /**
   * Où reprendre : la position de Xéros, sauf dans une zone de sortie (il la prenait, ou la page s'est fermée pendant le
   * fondu) : on reprend alors au point d'arrivée de cette sortie, sur sa carte, sans qu'il change de carte tout seul.
   */
  private where(): Where {
    const { x, y, facing } = this.player.actor;
    const exit = exitAt(x, y, this.map.exits);
    const arrival = exit && maps[exit.to]?.spawns[exit.spawn];
    // validate.ts garantit la carte et le point d'arrivée ; sans eux, on garde la position telle quelle
    if (exit && arrival) return { map: exit.to, x: arrival.x, y: arrival.y, facing: arrival.facing ?? 'down' };
    return { map: this.map.id, x: Math.round(x), y: Math.round(y), facing };
  }
}
