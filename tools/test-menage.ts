// Test rapide du chantier 5 de l'audit, « le ménage de l'obsolète » (docs/AUDIT.md) : ce qui a été retiré ne revient pas, ce qui a
// été gardé est là, et ce qui a changé de forme se relit.
// Usage : npx tsx tools/test-menage.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { items, props, stamina, time, wood } from '../src/content';
import { Stamina } from '../src/entities/Stamina';
import { SAVE_VERSION, upgrade } from '../src/state/save';
import { harvestJob, planOf, swingerOf } from '../src/world/workPlan';

// les prix et champs morts : retirés du contenu (le schéma, strict, refuserait leur retour)
for (const k of ['hewPerM', 'maul', 'attackBase', 'attackPerKg']) assert.ok(!(k in stamina.costs), `stamina.json costs : plus de '${k}'`);
assert.ok(!('work' in time), 'time.json : plus de minutes des petits gestes');
assert.ok(!('stroke' in wood.hew), 'wood.json hew : plus de pas de passe en cm');
for (const [k, p] of Object.entries(props)) assert.ok(!(p.harvest && 'effort' in p.harvest), `props.json '${k}' : plus de 'effort'`);

// le ménage retire le code mort et les dessins inutilisés, jamais un objet (décidé par Grégoire le 2 novembre 2026) : les objets
// sans chaîne prévue sont restés, avec leurs dessins
for (const k of ['wheat', 'seeds', 'berries', 'mushroom', 'egg', 'apple', 'wool', 'hoe', 'sickle', 'watering-can', 'fishing-rod', 'sword', 'iron-ore', 'stone', 'pickaxe', 'wooden-sword']) assert.ok(items[k], `items.json : '${k}' gardé`);
for (const k of ['barrel', 'bush-berries', 'well', 'lantern', 'candle', 'rock-rubble']) assert.ok(props[k], `props.json : '${k}' gardé`);

// la sauvegarde : relue depuis la version 17 ; la « chaîne » des objets nés disparaît ; une partie plus ancienne reste refusée
assert.ok(SAVE_VERSION >= 24, 'la sauvegarde relue depuis 17');
const v23 = { version: 23, savedAt: '', where: {}, state: { maps: { ferme: { spawned: [{ id: 1, type: 'normal-felled-tree', x: 3, y: 4, chain: { group: 1, index: 0, size: 1 } }] } } } };
const v24 = upgrade(v23) as { version: number; state: { maps: Record<string, { spawned: object[] }> } };
assert.equal(v24.version, Math.min(SAVE_VERSION, 29), '23 -> 24, puis jusqu’à la 29 (la 30 refait la maison : partie neuve)');
assert.deepEqual(v24.state.maps.ferme.spawned[0], { id: 1, type: 'normal-felled-tree', x: 3, y: 4 }, 'la chaîne retirée, le reste intact');
assert.equal((upgrade({ version: 16, state: {} }) as { version: number }).version, 16, 'une partie de la version 16 n’est plus convertie (refusée, partie neuve)');

// « Finir le travail » paie le souffle au joule : celui de tous les coups qui restent
const plan = planOf(harvestJob(props['normal-tree'].harvest!.work!, 'axe'), swingerOf('xeros').swinger, stamina.max.start);
assert.ok(Math.abs(plan.breath - plan.strokes * plan.stroke.joules * stamina.work.breathPerJ) < 1e-6, 'le souffle d’un travail entier, au joule');
const s = new Stamina();
s.max = 100;
s.breath = 100;
s.ceiling = 100;
const before = s.levels();
s.force(1, 30);
const after = s.levels();
assert.ok(Math.abs(before.ceiling - after.ceiling - 1) < 1e-9 && Math.abs(before.breath - after.breath - 30) < 1e-9, `« Finir le travail » : le plafond et le souffle de ses coups (${JSON.stringify({ before, after })})`);

console.log('✓ ménage : les prix et champs morts retirés, tous les objets gardés, la sauvegarde relue depuis 17 sans chaîne, « Finir le travail » au joule');
