// Le mur de pierre de taille, le cordon et le dallage de la maison du coq (chantier « maison du coq ») : le jeu les dessine avec son
// propre code (src/world/ashlarWalls.ts, qui ne lit jamais art/) ; ce test vérifie, pixel pour pixel, qu'il dessine exactement ce que
// dessine le dessinateur (art/world/coq-wall.ts, coq-floor.ts), sur des pans de toutes longueurs, places, parités et bouts : une
// seule façon de poser les pierres. L'enduit du dedans est comparé dans la tuile (src/generated/ashlarStones.ts), seule source du jeu.
// Usage : npx tsx tools/test-murs-coq.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import * as art from '../art/world/coq-wall';
import * as artFloor from '../art/world/coq-floor';
import * as game from '../src/world/ashlarWalls';

const ends = ['corner', 'head', 'jamb', 'abut', 'lintel'] as const;
let n = 0;
for (const x0 of [0, 7, 33, 144, 301]) {
  for (const len of [32, 57, 120, 304]) {
    for (const k of [0, 1, 8, 9, 17]) {
      const start = ends[(x0 + len) % ends.length];
      const end = ends[(x0 + k) % ends.length];
      const spec = { x0, x1: x0 + len, k, start, end };
      for (const thick of [60, 40]) {
        assert.deepEqual(game.courseImage(spec, thick), art.courseImage(spec, thick), `assise ${JSON.stringify(spec)} ${thick}`);
        assert.deepEqual(game.courseNS(spec, thick), art.courseNS(spec, thick), `assise nord-sud ${JSON.stringify(spec)} ${thick}`);
        assert.deepEqual(game.courseNS(spec, thick, true), art.courseNS(spec, thick, true), `assise r3 ${JSON.stringify(spec)} ${thick}`);
        for (const v of [0, 1, 3]) assert.deepEqual(game.stringView(x0, x0 + Math.max(len, 12), thick, v), art.stringView(x0, x0 + Math.max(len, 12), thick, v), `cordon ${x0} ${len} ${thick} ${v}`);
        n += 6;
      }
      assert.deepEqual(game.courseFace(spec, 'in', false), art.courseFace(spec, 'in', false), `face du dedans nue ${JSON.stringify(spec)}`);
      assert.deepEqual(game.flagRow(x0, x0 + len, k), artFloor.flagRow(x0, x0 + len, k), `dallage ${x0} ${len} ${k}`);
      assert.deepEqual(game.flagColumn(x0, x0 + len, k), artFloor.flagColumn(x0, x0 + len, k), `dallage nord-sud ${x0} ${len} ${k}`);
      n += 3;
    }
  }
}
// un trumeau trop court pour ses deux pierres de bout : le jeu le pose de pierres recoupées, sans planter
for (const len of [6, 8, 12, 20]) for (const k of [0, 1]) assert.equal(game.courseImage({ x0: 3, x1: 3 + len, k, start: 'corner', end: 'jamb' }).length, 12, `trumeau de ${len} px`);
console.log(`test-murs-coq : ${n} pans dessinés pareil par le jeu et par le dessinateur`);
