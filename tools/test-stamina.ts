// L'endurance en trois niveaux (docs/CONCEPTION.md, « Le temps » ; src/entities/Stamina.ts), sans navigateur :
// - la course : partie à plein souffle, elle dure `max.start / breath.perSec.run` secondes (100 / 5 = 20 s, 165 m à 165 px/s et 5 cm par
//   px), puis Xéros est essoufflé ; le plafond n'a baissé que du prix de la course ;
// - un effort qui manque de souffle attend : refusé sans toucher au plafond, Xéros essoufflé jusqu'à ce que le souffle revienne à
//   `recovered` du plafond, `regenDelayMs` après le dernier effort ;
// - plafond vide : épuisé ; sous `tired` du maximum : fatigué, plus de course ;
// - une sauvegarde de la version 18 (une seule jauge) devient les trois niveaux.
// Usage : tsx tools/test-stamina.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { PLAYER } from '../src/config';
import { stamina as def } from '../src/content';
import { Stamina } from '../src/entities/Stamina';
import { upgrade } from '../src/state/save';

const FRAME = 1000 / 60;
const full = () => {
  const s = new Stamina();
  s.reset({ breath: def.max.start, ceiling: def.max.start, max: def.max.start });
  return s;
};

// la course
const run = full();
let ms = 0;
while (run.canRun() && ms < 120000) {
  run.drain(run.costs.runPerSec, FRAME, run.runBreath);
  run.recover(FRAME);
  ms += FRAME;
}
const seconds = ms / 1000;
const metres = (PLAYER.runSpeed * seconds * 5) / 100;
const expected = def.max.start / def.breath.perSec.run;
assert.ok(Math.abs(seconds - expected) < 0.2, `la course dure ${expected} s (${seconds.toFixed(2)} s)`);
assert.ok(run.winded, 'à bout de souffle, Xéros est essoufflé');
assert.ok(Math.abs(run.ceiling - (def.max.start - def.costs.runPerSec * seconds)) < 0.01, 'le plafond ne baisse que du prix de la course');
// le souffle revient au repos, après le délai, et l'essoufflement cesse à `recovered` du plafond
let back = 0;
while (run.winded && back < 60000) {
  run.recover(FRAME);
  back += FRAME;
}
const backExpected = def.breath.regenDelayMs + (def.breath.recovered * run.ceiling * 1000) / def.breath.regenPerSec;
assert.ok(Math.abs(back - backExpected) < 50, `l'essoufflement cesse en ${(backExpected / 1000).toFixed(1)} s (${(back / 1000).toFixed(1)} s)`);

// un effort qui manque de souffle attend, sans rien coûter
const chop = full();
chop.reset({ breath: 1 });
const ceiling = chop.ceiling;
assert.equal(chop.spend(def.costs.chop), 'winded', 'le coup attend son souffle');
assert.equal(chop.ceiling, ceiling, 'le coup refusé ne coûte rien');
assert.ok(chop.winded, 'Xéros est essoufflé');
for (let t = 0; t < 10000 && chop.winded; t += FRAME) chop.recover(FRAME);
assert.equal(chop.spend(def.costs.chop), 'done', 'son souffle revenu, le coup se fait');
assert.ok(Math.abs(chop.ceiling - (ceiling - def.costs.chop)) < 1e-9, 'le coup coûte son prix au plafond');

// épuisé, fatigué
const tired = full();
tired.reset({ ceiling: def.tired * def.max.start - 1 });
assert.ok(tired.tired && !tired.canRun(), 'sous le seuil, fatigué : plus de course');
assert.equal(tired.walkFactor(), def.tiredWalk, 'fatigué, il marche moins vite');
tired.reset({ ceiling: 0 });
assert.equal(tired.spend(def.costs.chop), 'exhausted', 'plafond vide : épuisé');

// la sauvegarde de la version 18
const v19 = upgrade({ version: 18, savedAt: '', where: {}, state: { stamina: 62, clock: { day: 2, minute: 400 }, hands: [null, null] } }) as {
  state: { stamina: unknown };
};
assert.deepEqual(v19.state.stamina, { breath: 62, ceiling: 62, max: def.max.start, woke: 62 }, 'la jauge devient souffle et plafond, le maximum de départ');

console.log(
  `✓ endurance : la course dure ${seconds.toFixed(1)} s (${Math.round(metres)} m), l'effort attend son souffle, épuisé, fatigué, la sauvegarde de la version 18`,
);
