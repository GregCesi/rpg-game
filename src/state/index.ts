// La partie en cours. Les scènes la lisent et la modifient par les fonctions de GameState.ts ; le HUD est prévenu par
// GameEvent.HandsChanged. Elle est sauvegardée dans le navigateur à chaque changement (systems/autosave.ts, save.ts).
import { newGame, replaceState } from './GameState';
import { readSave, type Where } from './save';

export * from './GameState';
export * from './save';

export const game = newGame();

/**
 * Au lancement : reprend la partie sauvegardée, s'il y en a une de lisible. Renvoie où remettre Xéros, et le message à
 * afficher si la sauvegarde a été refusée (la partie est alors neuve).
 */
export function resumeGame(): { where?: Where; notice?: string } {
  const r = readSave();
  if ('problem' in r) return { notice: r.problem };
  if ('none' in r) return {};
  replaceState(game, r.save.state);
  return { where: r.save.where };
}
