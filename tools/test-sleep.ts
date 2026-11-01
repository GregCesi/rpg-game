// Le sommeil et la veille (docs/CONCEPTION.md, « Le temps » ; src/world/sleep.ts, `sleep` de GameState), sans navigateur :
// le lever (6 h, ou au bout d'une nuit pleine), le plafond au réveil (épuisement du coucher, heures manquantes), le maximum qui monte
// avec l'entraînement, la veille de nuit qui use le plafond ; la journée type, trois jours d'entraînement, la nuit courte, le coucher à
// l'aube, la vraie nuit blanche ; une sauvegarde de la version 19 garde ses niveaux.
// Usage : tsx tools/test-sleep.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { stamina as def, time } from '../src/content';
import { newGame, sleep } from '../src/state/GameState';
import { upgrade } from '../src/state/save';
import { morning, nightMinutes, wakeTime } from '../src/world/sleep';

const H = 60;
const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-6, `${what} : ${b} attendu, ${a}`);
const wake = (day: number, hour: number) => wakeTime({ day, minute: hour * H }, time.wakeHour, def.sleep.hours);
const night = (hour: number, hours: number) => nightMinutes({ day: 1, minute: hour * H }, hours * H, def.sleep.nightFrom, time.wakeHour) / H;
const wear = (hours: number) => hours * def.sleep.nightAwakePerHour;

// le lever
assert.deepEqual(wake(1, 22), { day: 2, minute: 6 * H }, 'couché à 22 h : levé à 6 h');
assert.deepEqual(wake(2, 2), { day: 2, minute: 6 * H }, 'couché à 2 h : levé à 6 h (nuit courte)');
assert.deepEqual(wake(2, 6), { day: 2, minute: 14 * H }, 'couché à 6 h : levé à 14 h (huit heures)');
assert.deepEqual(wake(1, 14), { day: 1, minute: 22 * H }, 'couché à 14 h : huit heures, levé à 22 h');

// la nuit de veille : de 22 h au lever
near(night(21, 2), 1, 'de 21 h à 23 h, une heure de nuit');
near(night(22, 8), 8, 'de 22 h à 6 h, huit heures de nuit');
near(night(5, 3), 1, 'de 5 h à 8 h, une heure de nuit');
near(night(10, 24), 8, 'une journée entière, huit heures de nuit');

// la journée type : levé à 100, couché à 22 h à 15 (fatigué, pas épuisé) : la nuit ne coûte rien, le maximum monte de 1
const typical = morning(def, { ceiling: 15, max: 100, woke: 100 }, 8 * H);
near(typical.max, 101, 'journée type : maximum le lendemain');
near(typical.ceiling, 101, 'journée type : plafond au réveil');

// trois jours d'entraînement, la même journée (85 points dépensés), coucher 22 h, lever 6 h
let max = 100;
const days: number[] = [];
for (let d = 0; d < 3; d++) {
  const m = morning(def, { ceiling: max - 85, max, woke: max }, 8 * H);
  max = m.max;
  days.push(Math.round(max * 100) / 100);
}
assert.deepEqual(days, [101, 101.99, 102.97], 'trois jours : 101, 102, 103');
// une journée sans effort n'entraîne pas
near(morning(def, { ceiling: 90, max: 100, woke: 100 }, 8 * H).max, 100, 'une journée tranquille : le maximum ne bouge pas');

// couché épuisé (plafond à 0) : 6 points le lendemain (0,4 × 15) ; la journée a entraîné
const spent = morning(def, { ceiling: 0, max: 100, woke: 100 }, 8 * H);
near(spent.ceiling, 101 - 6, 'couché épuisé : 6 points de moins');

// nuit courte : couché à 2 h, levé à 6 h, 4 h de sommeil : 5 par heure manquante
const short = morning(def, { ceiling: 15, max: 100, woke: 15 }, 4 * H);
near(short.ceiling, 80, 'nuit courte, sans entraînement : 80');
near(morning(def, { ceiling: 15, max: 100, woke: 100 }, 4 * H).ceiling, 81, 'nuit courte après une journée qui entraîne : 81');

// coucher à l'aube : 15 à 22 h, 11 à 6 h (huit heures de veille), levé à 14 h : 1,6 de moins ; la journée a entraîné (+1)
const dawn = 15 - wear(night(22, 8));
near(dawn, 11, 'huit heures de veille : 15 devient 11');
near(morning(def, { ceiling: dawn, max: 100, woke: 100 }, 8 * H).ceiling, 101 - 1.6, 'coucher à l’aube : 99,4');

// la vraie nuit blanche : à 6 h, 11, fatigué (sous 15 % du maximum) ; le maximum ne monte pas sans nuit
assert.ok(dawn < def.tired * 100, 'nuit blanche : fatigué à 6 h');

// GameState : dormir à 22 h mène à 6 h le lendemain, le plafond au réveil devient la référence de la journée
const g = newGame();
g.clock = { day: 1, minute: 22 * H };
g.stamina = { breath: 10, ceiling: 15, max: 100, woke: 100 };
sleep(g);
assert.deepEqual(g.clock, { day: 2, minute: 6 * H }, 'dormir : le lendemain, 6 h');
near(g.stamina.max, 101, 'dormir : le maximum monte');
near(g.stamina.ceiling, 101, 'dormir : plafond plein');
near(g.stamina.breath, 101, 'dormir : souffle plein');
near(g.stamina.woke, 101, 'dormir : le plafond du réveil est retenu');

// la sauvegarde de la version 19
const v20 = upgrade({ version: 19, savedAt: '', where: {}, state: { stamina: { breath: 30, ceiling: 62, max: 104 }, clock: { day: 2, minute: 400 } } }) as {
  version: number;
  state: { stamina: unknown };
};
assert.deepEqual(v20.state.stamina, { breath: 30, ceiling: 62, max: 104, woke: 62 }, 'version 19 : le plafond du réveil est celui d’aujourd’hui');

console.log('✓ sommeil : le lever, la journée type, trois jours d’entraînement (101, 102, 103), épuisé, nuit courte, coucher à l’aube, nuit blanche, la version 19');
