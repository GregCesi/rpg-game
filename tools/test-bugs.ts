// Les bugs visibles relevés par l'audit (docs/AUDIT.md), sans navigateur :
// - une vue pas encore dessinée (VIEWS_TODO) ne donne jamais une image manquante : l'image de départ (ou la vue -left pour le
//   demi-tour) ; `viewDrawn` dit lesquelles existent (le mode construction ne fait tourner que vers elles) ; la liste des vues attendues
//   (validate.ts) reste stricte ;
// - V passe au palier suivant, en boucle, et rien d'autre (Maj + V n'existe plus : V pendant une course accélère) ;
// - la bille poussée suit la fatigue, comme la marche ;
// - la teinte de chaque âge du mode construction vient de la palette (src/generated/woodAgeSwatch.ts, tiré par npm run art).
// Usage : tsx tools/test-bugs.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { woodAges } from '../art/palette';
import { stamina, time } from '../src/content';
import { viewDrawn, viewImage, viewImages } from '../src/content/views';
import { WOOD_AGE_SWATCH } from '../src/generated/woodAgeSwatch';
import { pushSpeed, SPEEDS } from '../src/systems/speeds';
import { nextSpeed } from '../src/world/clock';

const drawn = new Set(['chest', 'log', 'log-left']);
const has = (k: string) => drawn.has(k);
assert.equal(viewImage('chest', 'four', 1, has), 'chest', 'une vue pas dessinée : l’image de départ, pas une image manquante');
assert.equal(viewImage('log', 'four', 2, has), 'log-left', 'le demi-tour pas dessiné : la vue -left');
assert.equal(viewDrawn('chest', 'four', 1, has), false, 'la vue -r1 du coffre n’est pas dessinée');
assert.equal(viewDrawn('chest', 'four', 0, has), true, 'la vue de départ l’est toujours');
assert.deepEqual(viewImages('chest', 'four', has), ['chest', 'chest-r1', 'chest-r2', 'chest-r3'], 'les vues attendues restent strictes (validate.ts)');

assert.equal(nextSpeed(time.speeds, 20), 1, 'V après x20 : x1');
assert.equal(nextSpeed(time.speeds, 1), 2, 'V après x1 : x2');

assert.ok(Math.abs(pushSpeed(0.6, stamina.tiredWalk) - SPEEDS.walk * 0.6 * stamina.tiredWalk) < 1e-9, 'fatigué, la bille va moins vite');
assert.ok(pushSpeed(0.6, stamina.tiredWalk) < SPEEDS.walk * stamina.tiredWalk, 'fatigué, il ne pousse jamais plus vite qu’il ne marche');

for (const [age, ramp] of Object.entries(woodAges)) assert.equal(WOOD_AGE_SWATCH[age as keyof typeof WOOD_AGE_SWATCH], ramp['*'], `la teinte « ${age} » vient de la palette`);
console.log('✓ bugs de l’audit : les vues pas dessinées, V en boucle, la bille fatiguée, la teinte des âges');
