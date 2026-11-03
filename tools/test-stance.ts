// Où se tient Xéros pour travailler, et où tombe le fer (src/world/workStance.ts, chantier « maison-2 ») : tirés de la portée de
// l'outil (items.json) et de la main à l'impact du geste (gestures.json), pas de nombres écrits pour un outil. Sans navigateur.
// Usage : npx tsx tools/test-stance.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { gestures, items, props, work } from '../src/content';
import { CM_PER_PX } from '../src/content/gabarit';
import { fellDistance, strikeOffset, toolReach } from '../src/world/workStance';

// la portée : de la main au tranchant, en px (5 cm par px)
assert.equal(toolReach('axe'), (items.axe.work!.length - items.axe.work!.grip) / CM_PER_PX);
assert.equal(toolReach(undefined), 0);
// le coup de haut en bas sur une pièce couchée : la cognée tombe où elle tombait (19 px), la doloire, plus courte, plus près ; la gauche
// en miroir ; vers le haut et le bas, à côté de la main, quel que soit l'outil
assert.equal(strikeOffset(gestures.chop, 'axe', 'right'), 19, 'la cognée, de côté : 19 px devant les pieds');
assert.equal(strikeOffset(gestures.chop, 'axe', 'left'), -19);
assert.ok(strikeOffset(gestures.chop, 'broadaxe', 'right') < 19, 'la doloire, plus courte, frappe plus près');
assert.equal(strikeOffset(gestures.chop, 'broadaxe', 'down'), strikeOffset(gestures.chop, 'axe', 'down'));
assert.equal(strikeOffset(gestures.maul, 'maul', 'right'), 16, 'la masse : 16 px');
// abattre : le fer frappe l'écorce du côté de Xéros, pour tout arbre qui s'abat et tout outil qui abat
for (const [key, p] of Object.entries(props)) {
  const fell = p.harvest?.work && 'fell' in p.harvest.work ? p.harvest.work.fell : undefined;
  if (!fell) continue;
  const tool = p.harvest!.tool!;
  const g = gestures[work.strokes[work.jobs.fell].gesture];
  const d = fellDistance(fell.diameter, g, tool);
  const hand = g.poses.right[g.impact].dx;
  const edge = d - hand - toolReach(tool); // où est le tranchant, depuis l'axe du tronc
  assert.ok(edge > 0 && edge <= fell.diameter / 2 / CM_PER_PX + 1, `${key} : le tranchant mord l'écorce du côté de Xéros (${edge} px de l'axe, rayon ${fell.diameter / 2 / CM_PER_PX})`);
}
assert.equal(work.strokes[work.jobs.fell].gesture, 'fell', 'abattre : le coup en écharpe propre à l\'abattage (gestures.json `fell`)');
assert.equal(fellDistance(30, gestures.fell, 'axe'), 23, 'tronc de 30 cm : 3 + 1 + 5 (main à l\'impact) + 15 (cognée) − 1');
assert.equal(fellDistance(55, gestures.fell, 'axe'), 25.5, 'tronc de 55 cm : 5,5 + 1 + 5 + 15 − 1');
console.log(`✓ position de travail : abattre à ${fellDistance(30, gestures.fell, 'axe')} px (tronc de 30 cm) et ${fellDistance(55, gestures.fell, 'axe')} px (55 cm) ; le fer de la cognée à 19 px, de la doloire à ${strikeOffset(gestures.chop, 'broadaxe', 'right')}, de la masse à 16`);
