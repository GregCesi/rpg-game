// La physique d'un coup de travail (docs/CONCEPTION.md, « Le travail » ; src/world/swing.ts), sans navigateur : l'énergie vient du
// couple sur l'angle de frappe, plafonnée par la vitesse du bras (la hachette ne frappe jamais fort) ; un outil lourd prend toute la
// force et part lentement ; plus fort, Xéros frappe plus fort et plus vite ; la cognée compte surtout sur la force, la doloire sur la
// précision ; les durées des images d'un geste font la durée du coup.
// Usage : tsx tools/test-swing.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { combat, items, strength, work } from '../src/content';
import { frameMs, strokeOf, type Phase } from '../src/world/swing';

const tool = (k: string) => ({ def: items[k].work!, kg: items[k].mass as number });
const hit = (who: typeof strength.swing, k: string, stroke: string) => strokeOf(who, tool(k).def, tool(k).kg, work.strokes[stroke], combat.rules);
const xeros = strength.swing;
const strong = work.references.strong;

for (const k of ['axe', 'hatchet', 'maul', 'broadaxe']) assert.ok(items[k].work && typeof items[k].mass === 'number', `${k} : un outil au travail, avec sa masse`);
assert.equal(items.axe.mass, 1.8, 'la cognée à sa vraie masse (une hache de ferme : 1,8 kg)');

const axe = hit(xeros, 'axe', 'use');
const hatchet = hit(xeros, 'hatchet', 'use');
const maul = hit(xeros, 'maul', 'maul');
// la cognée prend toute la force : E = τ θ ; la hachette plafonne à la vitesse du bras
assert.ok(Math.abs(axe.joules - xeros.torque * work.strokes.use.angle) < 1e-6, `cognée : toute la force (${axe.joules.toFixed(1)} J)`);
assert.equal(hatchet.omega, xeros.omegaMax, 'hachette : la vitesse du bras la limite');
assert.ok(hatchet.joules < axe.joules / 2, `la hachette frappe moins fort (${hatchet.joules.toFixed(0)} J contre ${axe.joules.toFixed(0)})`);
assert.ok(maul.cycle > axe.cycle && axe.cycle > hatchet.cycle, 'plus lourd, plus lent');
// plus fort : plus d'énergie, un coup plus court
const axeStrong = hit(strong, 'axe', 'use');
assert.ok(axeStrong.joules > axe.joules && axeStrong.cycle < axe.cycle, 'plus fort, il frappe plus fort et plus vite');
// ce qui compte : la cognée, la force ; la doloire, la précision
const hew = hit(xeros, 'broadaxe', 'hew');
assert.ok(1 - axe.quality < 1 - hew.quality, 'une imprécision coûte plus à la doloire qu’à la cognée');
// les images d'un geste en cinq temps font la durée du coup, à l'arrondi près
const phases: Phase[] = ['arm', 'arm', 'hold', 'down', 'down', 'impact', 'free', 'free'];
const ms = frameMs(axe, phases);
assert.ok(Math.abs(ms.reduce((s, v) => s + v, 0) - axe.cycle * 1000) <= phases.length, `les images font le coup (${ms.join(' · ')} ms)`);

console.log(
  `✓ coup de travail : cognée ${axe.joules.toFixed(0)} J en ${axe.cycle.toFixed(2)} s, hachette ${hatchet.joules.toFixed(0)} J en ${hatchet.cycle.toFixed(2)} s, masse ${maul.joules.toFixed(0)} J en ${maul.cycle.toFixed(2)} s ; le bûcheron fort ${axeStrong.joules.toFixed(0)} J en ${axeStrong.cycle.toFixed(2)} s`,
);
