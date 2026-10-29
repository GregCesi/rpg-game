// La partie en cours, en mémoire seulement (pas encore de sauvegarde).
// Les scènes la lisent et la modifient par les fonctions de GameState.ts ; le HUD est prévenu par GameEvent.HandsChanged.
import { newGame } from './GameState';

export * from './GameState';

export const game = newGame();
