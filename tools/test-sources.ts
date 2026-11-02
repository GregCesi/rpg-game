// Test rapide du chantier 4 de l'audit, « une seule source » (docs/AUDIT.md) : chaque réglage se lit à un seul endroit.
// Les moments du cadran et l'astre tirés des repères de lumière (world.json `daylight`) ; la force plafonnée partout comme la frappe
// (strength.json) ; l'attaque payée au joule comme le travail (stamina.json `work`) ; le rocher travaillé au coup ; le coup de chaque
// travail lu dans les données (work.json `jobs`, `work.strokes` de l'outil).
// Usage : npx tsx tools/test-sources.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { combat, items, props, stamina, strength, world } from '../src/content';
import { itemMass } from '../src/content/mass';
import { Strength } from '../src/entities/Strength';
import { combatPoses } from '../src/generated/combatPoses';
import { momentAt, sunSpan } from '../src/world/daylight';
import { attackCost, damage, strikeEnergy } from '../src/world/strike';
import { harvestJob, planOf, swingerOf, woodJob } from '../src/world/workPlan';

// les moments : ceux que nomment les repères ; l'astre se lève et se couche là où le soleil quitte 0 et y revient
for (const s of world.daylight) if (s.moment) assert.equal(momentAt(s.hour * 60), s.moment, `à ${s.hour} h commence « ${s.moment} »`);
const named = world.daylight.filter((s) => s.moment);
assert.equal(momentAt(named[named.length - 1].hour * 60 - 1), named[named.length - 2].moment, 'juste avant le dernier moment nommé : celui d’avant');
const { rise, set } = sunSpan();
const sunAt = (m: number) => world.daylight.find((s) => s.hour * 60 === m)?.sun;
assert.equal(sunAt(rise), 0, 'au lever, la force du soleil part de 0');
assert.equal(sunAt(set), 0, 'au coucher, elle y revient');
assert.ok(world.daylight.some((s) => s.hour * 60 > rise && s.hour * 60 < set && s.sun > 0), 'entre les deux, le soleil brille');

// la force : le multiplicateur de ?dieu plafonné au plus fort des humains, le même pour frapper, porter, marcher chargé et rouler
const f = new Strength();
f.multiplier = 10;
const human = strength.swing.humanMax / strength.swing.torque;
assert.equal(f.swinger.torque, strength.swing.humanMax, 'la frappe plafonne au couple humain');
assert.ok(Math.abs(f.carry - strength.carry * human) < 1e-9, `porter plafonne au même rapport (${f.carry.toFixed(0)} kg)`);
assert.ok(Math.abs(f.walk - strength.walk * human) < 1e-9, 'marcher chargé aussi');
assert.ok(Math.abs(f.roll - strength.roll * human) < 1e-9, `rouler aussi (${f.roll.toFixed(0)} kg)`);
f.multiplier = 2;
assert.equal(f.carry, strength.carry * 2, 'sous le plafond, la force multiplie tout');

// l'attaque au joule : son énergie fait ses dégâts et son prix, aux mêmes taux que le travail
for (const item of ['branch', 'wooden-sword']) {
  const w = items[item].weapon!;
  const kg = itemMass(item);
  const a = combat.attacks.cut;
  const J = strikeEnergy(combat.rules, a, combat.sweeps.cut, combatPoses.cut.down, w, kg);
  const c = attackCost(stamina.work, J);
  assert.ok(J > 0 && Math.abs(c.ceiling - J * stamina.work.ceilingPerJ) < 1e-12 && Math.abs(c.breath - J * stamina.work.breathPerJ) < 1e-12, `${item} : le prix au joule`);
  assert.equal(damage(combat.rules, a, combat.sweeps.cut, combatPoses.cut.down, w, kg), Math.round(J * combat.rules.damagePerJoule * w.efficiency * 10) / 10, `${item} : les dégâts de la même énergie`);
}
assert.ok(!('attackBase' in stamina.costs) && !('attackPerKg' in stamina.costs), 'plus de prix fixe d’attaque');

// le rocher au coup, à la pioche, sur la pierre ; la force y compte
const rock = props.rock.harvest!;
assert.ok(rock.work && 'break' in rock.work, 'le rocher a sa matière');
const job = harvestJob(rock.work!, rock.tool!);
assert.equal(job.matter, 'stone', 'il se casse comme de la pierre');
const weak = planOf(job, swingerOf('xeros').swinger, stamina.max.start);
const strong = planOf(job, swingerOf('strong').swinger, swingerOf('strong').max);
assert.ok(strong.seconds < weak.seconds * 0.7, `un homme fort le casse bien plus vite (${(strong.seconds / 60).toFixed(0)} min contre ${(weak.seconds / 60).toFixed(0)})`);

// le coup de chaque travail vient des données : la hachette taille au coup court, la cognée au coup commun
const block = props['chopping-block'].harvest!.work!;
assert.equal(harvestJob(block, 'hatchet').stroke, 'whittle', 'la hachette sur le billot : son coup propre (items.json work.strokes)');
assert.equal(harvestJob(block, 'axe').stroke, 'chop', 'la cognée sur le billot : le coup commun (work.json jobs)');
assert.throws(() => woodJob('cut', { size: 'inconnue', length: 100 }), /taille de bois inconnue/, 'une taille de bois inconnue est une erreur, pas 30 cm');

console.log('✓ une seule source : les moments et l’astre tirés de la lumière, la force plafonnée partout, l’attaque au joule, le rocher au coup, le coup dans les données');
