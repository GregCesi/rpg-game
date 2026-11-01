// L'horloge (docs/CONCEPTION.md, « Le temps » ; src/world/clock.ts), sans navigateur : à chaque palier, une minute réelle fait le bon
// nombre de minutes de jeu (à x24, une journée en une heure) ; le jour change à minuit ; les paliers se suivent sans sortir des bouts ;
// une sauvegarde de la version 17 (le compteur de jours) devient l'horloge, le même jour, à l'heure du lever.
// Usage : tsx tools/test-clock.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { time } from '../src/content';
import { upgrade } from '../src/state/save';
import { clockLabel, gameMinutes, later, nextSpeed } from '../src/world/clock';

for (const speed of time.speeds) assert.equal(gameMinutes(60000, speed), speed, `x${speed} : une minute réelle fait ${speed} minutes de jeu`);

assert.deepEqual(time.speeds, [1, 2, 5, 10, 20], 'les paliers de la vitesse du temps : x1 à x20 (x50 réservé à ?dieu)');
assert.equal(time.default, 1, 'x1 par défaut');
assert.deepEqual(later({ day: 1, minute: 23 * 60 + 30 }, 45), { day: 2, minute: 15 }, 'le jour change à minuit');
assert.deepEqual(later({ day: 3, minute: 600 }, 3 * 1440), { day: 6, minute: 600 }, 'trois jours plus tard, la même heure');
assert.equal(clockLabel({ day: 3, minute: 14 * 60 + 5.7 }), 'Jour 3 · 14:05', 'l’heure s’écrit à la minute');
assert.equal(nextSpeed(time.speeds, 5, 1), 10, 'V : le palier suivant');
assert.equal(nextSpeed(time.speeds, 5, -1), 2, 'Maj + V : le palier précédent');
assert.equal(nextSpeed(time.speeds, time.speeds[time.speeds.length - 1], 1), time.speeds[0], 'V tourne en boucle : après x20, x1');
assert.equal(nextSpeed(time.speeds, time.speeds[0], -1), time.speeds[time.speeds.length - 1], 'Maj + V tourne en boucle : avant x1, x20');
const v17 = { version: 17, savedAt: '', where: {}, state: { stamina: 80, day: 4, hands: [null, null] } };
const v18 = upgrade(v17) as { version: number; state: Record<string, unknown> };
assert.ok(v18.version >= 18, 'une sauvegarde de la version 17 passe aux suivantes');
assert.deepEqual(v18.state.clock, { day: 4, minute: time.wakeHour * 60 }, 'le compteur de jours devient l’horloge, au lever du même jour');
assert.equal('day' in v18.state, false, 'le compteur de jours disparaît');
console.log('✓ horloge : les paliers, minuit, l’écriture de l’heure, V et Maj + V, la sauvegarde de la version 17');
