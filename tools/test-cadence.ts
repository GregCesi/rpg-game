// Le pas de jeu fixe (src/world/timeStep.ts, src/systems/simSpeed.ts ; docs/CONCEPTION.md, « Le temps »), sans navigateur : le jeu
// donne le même résultat quelle que soit la vitesse de la machine.
// - la boucle : chaque pas dure STEP_MS ; une machine à 60, 20 ou 7,5 images par seconde fait 1, 3 ou 8 pas par image et joue le même
//   temps de jeu ; un écran à 60 Hz qui tremble fait un pas par image ; plus lent que 5 images par seconde, le jeu ralentit, jamais
//   un pas plus grand ; à x10, dix fois plus de pas ;
// - le combat du sanglier, mené par cette boucle à 1, 3 et 8 pas par image : il voit Xéros, annonce, charge ; Xéros s'écarte ; la
//   charge s'écrase contre un tronc, sonnée au prorata de son énergie ; Xéros la frappe à la hache (la taille, puis le coup d'en haut,
//   au rythme de leurs images) jusqu'à la tuer : le même choc, la même durée sonnée, les mêmes coups aux mêmes pas, la même mort ;
// - la garenne des lapins, menée de même, Xéros qui marche vers elle : les mêmes bêtes aux mêmes places, dans les mêmes états ;
// - la cause du défaut d'avant (le scénario des sangliers qui échouait sous la charge) : un pas de la durée de l'image (l'ancienne
//   boucle) change le choc et la durée sonnée.
// Usage : npx tsx tools/test-cadence.ts (lancé par npm run test:fast).

import assert from 'node:assert/strict';
import { combat, creatures, items, strength } from '../src/content';
import type { CreatureDef } from '../src/content/types';
import { combatPoses } from '../src/generated/combatPoses';
import { PLAYER, STEP } from '../src/config';
import { gameMinutes, type Clock } from '../src/world/clock';
import { emerge, hurt, pixels, setXerosMass, step, type Creature, type CreatureEvent, type Surroundings } from '../src/world/creature';
import { rng } from '../src/world/gridCanvas';
import { heftOf, improvisedStroke } from '../src/world/heft';
import { stanceFor, throughHide } from '../src/world/strike';
import { STEP_MS, TimeStep } from '../src/world/timeStep';
import { settle, seedWarren, WarrenLife, type WarrenSite } from '../src/world/warren';

setXerosMass(strength.mass);

// ---------- la boucle ----------
/**
 * Les pas qu'une machine fait en `seconds` s de temps vrai, une image toutes les `image` ms : leur nombre par image ; `jitter` : l'instant
 * de chaque image tremble d'autant autour de la synchronisation de l'écran (le tremblement ne s'accumule pas).
 */
function machine(image: number, seconds: number, factor = 1, jitter = 0): number[] {
  const ts = new TimeStep();
  const rand = rng(7);
  ts.image(5000, factor);
  const per: number[] = [];
  for (let i = 1; i <= Math.round((seconds * 1000) / image); i++) per.push(ts.image(5000 + i * image + (rand() * 2 - 1) * jitter, factor).length);
  return per;
}
const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
assert.equal(STEP_MS, 1000 * (1 / STEP.fps), 'le pas de jeu, au même arrondi que celui de la physique d’Arcade');
for (const [fps, per] of [[60, 1], [20, 3], [7.5, 8]] as const) {
  const n = machine(1000 / fps, 10);
  assert.ok(n.every((k) => k === per), `${fps} images/s : ${per} pas par image (${[...new Set(n)].join(', ')})`);
  assert.ok(Math.abs(sum(n) - 600) <= 1, `${fps} images/s : 10 s de temps vrai, 600 pas (${sum(n)})`);
}
{
  const n = machine(1000 / 60, 10, 1, 0.8);
  assert.ok(n.every((k) => k === 1), `un écran à 60 Hz qui tremble de 0,8 ms : un pas par image (${[...new Set(n)].join(', ')})`);
  const slow = machine(250, 10);
  assert.ok(slow.every((k) => k === STEP.maxPerImage), `4 images/s (il en faudrait 15 par image) : au plus ${STEP.maxPerImage} pas par image, le jeu ralentit (${[...new Set(slow)].join(', ')})`);
  const x10 = machine(1000 / 60, 10, 10);
  assert.ok(Math.abs(sum(x10) - 6000) <= 10, `x10 : dix fois plus de pas (${sum(x10)})`);
  // x10 sur une machine à 20 images par seconde (il en faudrait 30 par image) : au plus max(maxPerImage, 10) pas par image, le temps
  // accéléré ralentit, il ne s'emballe pas
  const cap10 = Math.max(STEP.maxPerImage, 10);
  const x10slow = machine(50, 10, 10);
  assert.ok(x10slow.every((k) => k === cap10), `x10 à 20 images/s : ${cap10} pas par image (${[...new Set(x10slow)].join(', ')})`);
}
console.log('✓ boucle : des pas fixes ; 1, 3 ou 8 par image selon la machine, le même temps de jeu ; un pas par image à 60 Hz ; plus lente que 5 images/s, le jeu ralentit ; x10, au plus douze pas par image');

// ---------- un monde d'essai : un pré, un tronc, Xéros ----------
type Box = { x: number; y: number; w: number; h: number };
const inBox = (b: Box, x: number, y: number) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
const DT = STEP_MS / 1000;

/**
 * Mener un monde : `onStep(dt)` fait un pas de jeu ; des images de `per` pas fixes chacune, données par la vraie boucle (TimeStep), ou,
 * à l'ancienne (`variable`), un seul pas de la durée de l'image ; `done` arrête.
 */
function drive(per: number, variable: boolean, onStep: (dt: number) => void, done: () => boolean, images = 20000): void {
  const image = per * STEP_MS;
  if (variable) {
    for (let i = 0; i < images && !done(); i++) onStep(image / 1000);
    return;
  }
  const ts = new TimeStep();
  let t = 1000;
  for (const _ of ts.image(t, 1)) onStep(DT);
  for (let i = 0; i < images && !done(); i++) {
    t += image;
    for (const _ of ts.image(t, 1)) {
      if (done()) break;
      onStep(DT);
    }
  }
}

// ---------- le combat ----------
const BOAR = Object.entries(creatures).find(([, d]) => d.reaction === 'charge');
assert.ok(BOAR, 'creatures.json : une bête qui charge');
const [boarKind, boar] = BOAR as [string, CreatureDef];

/** La hache de Xéros, à la force du plus fort des humains (?dieu « force » plafonnée, comme le scénario) : ses coups enchaînés. */
const axe = (() => {
  const h = heftOf({ item: 'axe' });
  assert.ok(h, 'items.json : la hache');
  const who = { ...strength.swing, torque: strength.swing.humanMax };
  const chain = stanceFor(combat, h.weapon.family, { other: 'empty', both: true, free: 'none' }).chain;
  const edge = items.axe.work?.edge ?? 0;
  return chain.map((key) => {
    const a = combat.attacks[key];
    const frames = combatPoses[a.gesture].right;
    const stroke = h.improvised ? improvisedStroke(h, who) : undefined;
    const durations = frames.map((f) => Math.round(f.ms * Math.max(1, stroke?.slow ?? 1)));
    const joules = (stroke?.joules ?? 0) * a.power;
    // le coup porte au début de la première image active (`active` de sa zone : la frappe)
    const first = Math.min(...combat.sweeps[a.gesture].active);
    return { key, durations, impact: durations.slice(0, first).reduce((s, d) => s + d, 0), damage: throughHide(combat.rules, joules, h.weapon.efficiency, boar.target.hide, edge) };
  });
})();

/** Le combat, mené à `per` pas par image : ce qu'on en garde pour comparer. */
function fight(per: number, variable = false) {
  const trunk: Box = { x: 300, y: -20, w: 30, h: 40 };
  const ground = (x: number, y: number) => (inBox(trunk, x, y) ? ('solid' as const) : undefined);
  // Xéros devant le tronc, le sanglier à 7,5 m à l'ouest
  const me = { x: 280, y: 0 };
  const rand = rng(3);
  const c: Creature = emerge(`${boarKind}#0`, boarKind, boar, { x: me.x - pixels(7.5), y: 0 });
  c.mode = 'calm';
  const around = (): Surroundings => ({ threat: { x: me.x, y: me.y, gait: 'walk' }, blocked: (x, y) => inBox(trunk, x, y), ground, holes: [{ x: -2000, y: 0 }], rand });
  const out = { steps: 0, impact: undefined as undefined | { joules: number; stun: number; step: number }, hits: [] as { step: number; hp: number; mode: string }[], deadAt: undefined as number | undefined, gored: false };
  // Xéros : il s'écarte vers le nord dès que la charge part (un tiers de seconde à la course), puis attend ; sonnée, il court à elle
  // et frappe sans relâche (le clic suivant pendant le geste : l'attaque suivante part à sa fin)
  let dodge = -1;
  let swing: { k: number; t: number; landed: boolean } | undefined;
  let k = 0;
  drive(
    per,
    variable,
    (dt) => {
      out.steps++;
      const ev: CreatureEvent[] = step(c, boar, around(), dt);
      for (const e of ev) {
        if (e.kind === 'impact' && !out.impact) out.impact = { joules: Math.round(e.joules), stun: Math.round(e.stun * 1000) / 1000, step: out.steps };
        if (e.kind === 'gore') out.gored = true;
      }
      if (c.mode === 'charge' && dodge < 0) dodge = 0;
      if (dodge >= 0 && dodge < 0.34) {
        me.y -= pixels(PLAYER.run * dt);
        dodge += dt;
      }
      if (!out.impact || out.deadAt !== undefined) return;
      // à elle : il court jusqu'au nord de son flanc
      const goal = { x: c.x, y: c.y - 22 };
      const d = Math.hypot(goal.x - me.x, goal.y - me.y);
      if (d > 4 && !swing) {
        const s = Math.min(d, pixels(PLAYER.run * dt));
        me.x += ((goal.x - me.x) / d) * s;
        me.y += ((goal.y - me.y) / d) * s;
        return;
      }
      swing ??= { k: k++ % axe.length, t: 0, landed: false };
      const a = axe[swing.k];
      swing.t += dt * 1000;
      if (!swing.landed && swing.t >= a.impact) {
        swing.landed = true;
        const r = hurt(c, a.damage, around(), boar);
        out.hits.push({ step: out.steps, hp: Math.round(c.hp * 10) / 10, mode: c.mode });
        if (r === 'dead') out.deadAt = out.steps;
      }
      if (swing.t >= sum(a.durations)) swing = undefined;
    },
    // fini : morte, Xéros emporté, ou la bête relevée après un coup
    () => out.deadAt !== undefined || out.gored || (out.hits.length > 0 && c.mode !== 'stunned'),
  );
  return { ...out, mode: c.mode, hp: Math.round(c.hp * 10) / 10 };
}

const fights = [1, 3, 8].map((per) => ({ per, r: fight(per) }));
const ref = fights[0].r;
assert.ok(ref.impact, `${boarKind} : la charge s'écrase contre le tronc (${JSON.stringify(ref)})`);
assert.ok(!ref.gored, `${boarKind} : Xéros s'est écarté`);
assert.ok(ref.impact.stun > 0, `${boarKind} : sonnée (${ref.impact.joules} J)`);
assert.ok(ref.deadAt !== undefined && ref.hits.length >= 2, `${boarKind} : plusieurs coups de hache la tuent pendant qu'elle est sonnée (${JSON.stringify(ref.hits)}, ${ref.mode})`);
for (const { per, r } of fights) assert.deepEqual(r, ref, `${boarKind} : à ${per} pas par image, le même combat qu'à 1`);
console.log(
  `✓ combat : à 1, 3 et 8 pas par image, le même : le choc au pas ${ref.impact.step} (${ref.impact.joules} J, sonnée ${ref.impact.stun.toFixed(2)} s), ${ref.hits.length} coups de hache aux mêmes pas (${ref.hits.map((h) => h.hp).join(', ')}), morte au pas ${ref.deadAt}`,
);

// la cause du défaut : un pas de la durée de l'image (l'ancienne boucle de simSpeed.ts) change le choc et le temps où elle reste sonnée
{
  const old = [1, 3, 8].map((per) => fight(per, true));
  assert.deepEqual(old[0], ref, "à 60 images par seconde, l'ancienne boucle faisait déjà des pas de taille normale");
  const stuns = old.map((r) => r.impact?.stun);
  assert.ok(new Set(stuns).size > 1, `l'ancienne boucle : la durée sonnée change avec la machine (${stuns.join(', ')} s)`);
  console.log(`✓ la cause : avec un pas de la durée de l'image (l'ancienne boucle), sonnée ${stuns.map((s) => s?.toFixed(2)).join(', ')} s à 1, 3, 8 pas par image`);
}

// ---------- la garenne des lapins ----------
const RABBIT = Object.entries(creatures).find(([, d]) => d.den === 'burrow' && d.reaction !== 'charge');
assert.ok(RABBIT, 'creatures.json : une bête à terrier');
const [rabbitKind, rabbit] = RABBIT as [string, CreatureDef];
function warren(per: number) {
  const holes = [
    { x: 0, y: 0 },
    { x: pixels(4), y: pixels(1) },
    { x: pixels(1), y: pixels(5) },
  ];
  const site: WarrenSite = { id: 1, kind: rabbitKind, population: 8, holes };
  let clock: Clock = { day: 1, minute: 6 * 60 };
  let w = seedWarren(site, rabbit, clock);
  const rand = rng(11);
  const life = new WarrenLife(site, rabbit);
  // Xéros marche droit vers la garenne, de 20 m à l'est
  const me = { x: pixels(20), y: pixels(2) };
  const around = (): Surroundings => ({ threat: { x: me.x, y: me.y, gait: 'walk' }, blocked: () => false, holes, rand });
  life.populate(w, clock, around());
  const trace: string[] = [];
  let steps = 0;
  drive(
    per,
    false,
    (dt) => {
      steps++;
      clock = { day: clock.day, minute: clock.minute + gameMinutes(dt * 1000, 1) };
      w = settle(w, site, rabbit, clock);
      life.step(w, clock, dt, around, rand);
      if (me.x > pixels(1)) me.x -= pixels(PLAYER.walk * dt);
      if (steps % 30 === 0) trace.push(life.out.map((c) => `${c.id}:${c.mode}@${c.x.toFixed(3)},${c.y.toFixed(3)}`).join(' '));
    },
    () => steps >= 60 * 20,
  );
  return { trace, out: life.out.length, modes: [...new Set(life.out.map((c) => c.mode))].sort() };
}
const warrens = [1, 3, 8].map((per) => ({ per, r: warren(per) }));
assert.ok(warrens[0].r.trace.some((t) => /:(flee|home|burrow)@/.test(t)), `${rabbitKind} : Xéros qui marche vers la garenne les fait fuir`);
for (const { per, r } of warrens) assert.deepEqual(r, warrens[0].r, `${rabbitKind} : à ${per} pas par image, la même garenne qu'à 1`);
console.log(`✓ garenne : à 1, 3 et 8 pas par image, les mêmes bêtes (${rabbitKind}) aux mêmes places pendant 20 s, Xéros qui marche vers elles (${warrens[0].r.modes.join(', ')} à la fin)`);
