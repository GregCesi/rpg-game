// Le franchissement (src/world/crossing.ts), sans navigateur : une sortie de 4 px de large, franchie en un seul grand pas (un jeu qui
// rame), est prise ; à la position de l'instant seule, elle ne l'aurait pas été. Un saut de plus de MAX_STEP (Xéros reposé ailleurs)
// n'est pas un chemin. Usage : tsx tools/test-crossing.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import type { Exit } from '../src/content/types';
import { exitAt, exitCrossed } from '../src/systems/exits';
import { MAX_STEP, crossed } from '../src/world/crossing';

// une sortie de 4 px de large, de x 100 à 104, sur 40 px de haut ; les pieds testés 3 px au-dessus du point (comme le jeu)
const exit = { x: 100, y: 80, w: 4, h: 40, to: 'maison', spawn: 'porte' } as Exit;
const from = { x: 90, y: 100 };
const to = { x: 110, y: 100 };

assert.equal(exitAt(from.x, from.y, [exit]), undefined, 'avant le pas, hors de la sortie');
assert.equal(exitAt(to.x, to.y, [exit]), undefined, 'après le pas, hors de la sortie : la position de l’instant ne la voit pas');
assert.equal(exitCrossed(from, to, [exit]), exit, 'un pas de 20 px à travers une sortie de 4 px la franchit');
assert.equal(exitCrossed(from, { x: 98, y: 100 }, [exit]), undefined, 'un pas qui s’arrête avant ne la franchit pas');
assert.equal(exitCrossed(undefined, { x: 102, y: 100 }, [exit]), exit, 'sans image d’avant, la position de l’instant compte');
assert.equal(exitCrossed({ x: 102 - MAX_STEP - 20, y: 100 }, { x: 102 + MAX_STEP, y: 100 }, [exit]), undefined, 'un saut trop grand n’est pas un chemin : seule l’arrivée compte, hors de la sortie');
assert.equal(crossed({ x: 0, y: 0 }, { x: MAX_STEP + 10, y: 0 }, (x) => x > 5 && x < 8), false, 'un saut trop grand ne traverse rien');
assert.equal(crossed({ x: 0, y: 0 }, { x: 0, y: 0 }, (x) => x === 0), true, 'immobile dans la zone : dedans');
console.log('✓ franchissement : une sortie de 4 px franchie en un seul pas de 20 px est prise ; un saut n’est pas un chemin');
