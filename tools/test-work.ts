// La matière de chaque travail et le travail entier (docs/CONCEPTION.md, « Le travail » ; src/world/workPlan.ts), sans navigateur : les
// deux points de calage tiennent (l'arbre normal à la cognée, 25 min pour Xéros ; la poutre de 3 m, 2 h pour le bûcheron fort) ; la
// durée découle des coups et des pauses ; plus fort, on va plus vite sans toucher aux données ; le gros bois suit la loi du volume ;
// chaque coup coûte du souffle et du plafond ; une part déjà faite raccourcit le reste.
// Usage : tsx tools/test-work.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { props, work } from '../src/content';
import { calibrationJob, fellVolume, harvestJob, planOf, swingerOf, woodJob } from '../src/world/workPlan';

const xeros = swingerOf('xeros');
const adult = swingerOf('adult');
const strong = swingerOf('strong');
const minutes = (job: ReturnType<typeof harvestJob>, who = xeros) => planOf(job, who.swinger, who.max).seconds / 60;

// les points de calage
for (const c of work.calibration) {
  const who = swingerOf(c.who);
  const m = planOf(calibrationJob(c), who.swinger, who.max).seconds / 60;
  assert.ok(Math.abs(m - c.minutes) <= c.minutes * work.tolerance, `calage « ${c.name} » : ${m.toFixed(1)} min pour ${c.minutes}`);
}
// la durée = les coups + les pauses
const fell = harvestJob(props['normal-tree'].harvest!.work!, 'axe');
const p = planOf(fell, xeros.swinger, xeros.max);
assert.ok(Math.abs(p.seconds - (p.strokes * p.stroke.cycle + p.pauses * p.pause)) < 1e-6, 'la durée, ce sont les coups et les pauses');
assert.ok(p.pauses > 0 && p.bout > 10, `des pauses de souffle (${p.pauses}, une tous les ${p.bout} coups)`);
// plus fort, plus vite
assert.ok(minutes(fell, strong) < minutes(fell, adult) && minutes(fell, adult) < minutes(fell), 'plus fort, il abat plus vite');
// la loi du volume : le gros arbre, cinq à six fois plus de bois
assert.ok(Math.abs(fellVolume(55) / fellVolume(30) - (55 / 30) ** 3) < 1e-9, 'le volume suit le cube du diamètre');
const big = harvestJob(props['big-tree'].harvest!.work!, 'axe');
assert.ok(minutes(big) > 4 * minutes(fell), `le gros arbre est long à la cognée (${minutes(big).toFixed(0)} min)`);
// la force du bûcheron fort (le couple de strength.json multiplié, comme ?dieu « force ») : nettement moins de coups
const mul = work.references.strong.torque / xeros.swinger.torque;
const strongForce = planOf(fell, { ...xeros.swinger, torque: xeros.swinger.torque * mul }, xeros.max);
assert.ok(strongForce.strokes < p.strokes / 2, `la force du bûcheron fort : ${strongForce.strokes} coups au lieu de ${p.strokes}`);
// une part déjà faite
const half = planOf(fell, xeros.swinger, xeros.max, 0.5);
assert.ok(Math.abs(half.strokes - p.strokes / 2) <= 1, 'à moitié fait, la moitié des coups');
// fendre, couper, équarrir : du bois
assert.ok(minutes(woodJob('maul', { size: 'big', length: 100 })) < 5, 'fendre une bille est rapide');
assert.ok(p.ceiling > 5 && p.ceiling < 15, `abattre l'arbre normal coûte ${p.ceiling.toFixed(1)} points du plafond`);
console.log(
  `✓ travail : l'arbre normal en ${minutes(fell).toFixed(1)} min pour Xéros (${p.strokes} coups, ${p.pauses} pauses), ${minutes(fell, adult).toFixed(1)} pour un adulte, ${minutes(fell, strong).toFixed(1)} pour un bûcheron fort ; les points de calage tiennent`,
);
