// Le lancer (src/world/throw.ts ; docs/CONCEPTION.md, « Le lancer »), sans navigateur :
// - plus l'objet est lourd, moins il part vite (le couple du bras), jamais plus vite que le bras (ω plafonné) ;
// - l'angle choisi fait tomber l'objet au point visé s'il est à portée, sinon c'est l'angle de la plus grande portée ;
// - l'énergie à l'arrivée est celle du lâcher plus la chute depuis la main (la matière et l'énergie se tiennent) ;
// - la bûche de 65 kg tombe à ses pieds ; la force (?dieu) fait porter plus loin, plafonnée au plus fort des humains.
// Usage : npx tsx tools/test-lancer.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { combat, props, strength } from '../src/content';
import { angleFor, bestAngle, kinetic, maxRange, rangeAt, releaseOf, throwPlan } from '../src/world/throw';

const who = { torque: strength.swing.torque, omegaMax: strength.swing.omegaMax, skill: strength.swing.skill };
const t = combat.throw;
const log = (length: number) => ({ prop: 'wood-piece', wood: { ...props['normal-felled-tree'].harvest!.wood!, length, shape: 'round' as const, axis: 'ew' as const } });

// plus lourd, moins vite ; jamais plus vite que le bras
const speeds = [10, 50, 100, 200].map((l) => releaseOf(log(l), who).speed);
for (let i = 1; i < speeds.length; i++) assert.ok(speeds[i] < speeds[i - 1], `une bille plus longue part moins vite : ${speeds}`);
const light = releaseOf({ item: 'small-rough-stone', natural: { form: 0, size: 100 } }, who);
assert.ok(light.omega <= who.omegaMax + 1e-9, 'jamais plus vite que le bras');

// l'angle qui touche le point visé ; au-delà, la plus grande portée
const v = 8;
for (const d of [0.5, 2, 5]) assert.ok(Math.abs(rangeAt(v, angleFor(d, v, t.height, t.gravity), t.height, t.gravity) - d) < 1e-3, `il tombe à ${d} m`);
assert.equal(angleFor(1000, v, t.height, t.gravity), bestAngle(v, t.height, t.gravity), 'hors de portée : l’angle de la plus grande portée');

// l'énergie à l'arrivée : celle du lâcher et la chute depuis la main
const p = throwPlan({ item: 'small-rough-stone', natural: { form: 0, size: 100 } }, who, 3);
assert.ok(Math.abs(p.landing - (kinetic(p.release.kg, p.release.speed) + p.release.kg * t.gravity * t.height)) < 0.5, 'l’énergie se conserve en vol');
assert.ok(Math.abs(p.range - 3) < 0.05, 'la pierre tombe où on vise');

// la bûche de 65 kg : à ses pieds ; plus fort, plus loin, plafonné au plus fort des humains
const heavy = throwPlan(log(100), who, 1e9);
assert.ok(heavy.range < 1.5, `la bille d'un mètre tombe à ses pieds (${heavy.range.toFixed(2)} m)`);
const strong = { ...who, torque: who.torque * strength.swing.humanMax / who.torque };
assert.ok(maxRange(releaseOf(log(100), strong).speed, t.height, t.gravity) > heavy.range, 'plus fort, plus loin');
console.log(`✓ lancer : la pierre à ${maxRange(light.speed, t.height, t.gravity).toFixed(1)} m, la bille d’un mètre à ${heavy.range.toFixed(1)} m ; l’angle vise juste ; l’énergie se conserve`);
