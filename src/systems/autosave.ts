// Sauvegarde automatique : écrit la partie dans le navigateur dès qu'elle a changé (compteur de GameState), avec la
// carte et la position de Xéros. Appelée à chaque image par WorldScene.update ; aussi à l'arrivée sur une carte et
// quand la page se cache ou se ferme (rechargement compris), pour garder sa dernière position.
import type { Player } from '../entities/Player';
import { game, revisionOf, writeSave } from '../state';

export class AutoSave {
  /** Numéro du changement déjà écrit. */
  private saved = -1;

  constructor(
    private readonly mapId: string,
    private readonly player: Player,
  ) {}

  /** Écrit la partie si elle a changé depuis la dernière écriture, ou toujours avec `force`. */
  update(force = false): void {
    if (!force && revisionOf() === this.saved) return;
    const { x, y, facing } = this.player.actor;
    writeSave(game, { map: this.mapId, x: Math.round(x), y: Math.round(y), facing });
    this.saved = revisionOf();
  }
}
