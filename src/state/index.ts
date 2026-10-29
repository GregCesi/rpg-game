// La partie en cours. Les scènes la lisent et la modifient par les fonctions de GameState.ts ; le HUD est prévenu par
// GameEvent.HandsChanged. Elle est sauvegardée dans le navigateur à chaque changement (systems/autosave.ts, save.ts).
import { RESET } from '../config';
import { newGame, replaceState } from './GameState';
import { clearSave, readSave, type Where } from './save';

export * from './GameState';
export * from './save';

export const game = newGame();

/**
 * Au lancement : reprend la partie sauvegardée, s'il y en a une de lisible. Renvoie où remettre Xéros, et le message à
 * afficher si la sauvegarde a été refusée (la partie est alors neuve). Avec ?reset, la sauvegarde est effacée et la
 * partie repart du réveil ; le mot est retiré de l'adresse, pour qu'un rechargement reprenne la nouvelle partie.
 */
export function resumeGame(): { where?: Where; notice?: string } {
  if (RESET) {
    clearSave();
    // à la main plutôt que par URLSearchParams, qui réécrirait ?dieu en ?dieu=
    const rest = location.search.slice(1).split('&').filter((p) => p && p.split('=')[0] !== 'reset');
    history.replaceState(null, '', `${location.pathname}${rest.length ? `?${rest.join('&')}` : ''}${location.hash}`);
    return { notice: 'Sauvegarde effacée : nouvelle partie.' };
  }
  const r = readSave();
  if ('problem' in r) return { notice: r.problem };
  if ('none' in r) return {};
  replaceState(game, r.save.state);
  return { where: r.save.where };
}
