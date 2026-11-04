// Le moteur des créatures (src/world/creature.ts), sans navigateur : les états selon la distance et l'allure de Xéros, le calme quand
// Xéros s'arrête ou recule, la fuite qui ne traverse jamais un obstacle (même mince) et atteint l'entrée, le zigzag, l'alerte du
// tambour qui gagne les voisines, les coups qui blessent ou tuent. Pour chaque créature de creatures.json.
// Usage : tsx tools/test-creatures.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { PLAYER, VIEW, ZOOM, ZOOM_STEPS } from '../src/config';
import { CM_PER_PX } from '../src/content/gabarit';
import { creatures } from '../src/content';
import type { CreatureDef, Gait } from '../src/content/types';
import { alarm, clear, hurt, metres, perceive, pixels, type Creature } from '../src/world/creature';
import { around, beast, blockedIn, drive, DT, field, type Box } from './lib/creature-trial';

const GAITS: Gait[] = ['still', 'sneak', 'walk', 'run'];

// les bêtes qui fuient (le lapin) ; celles qui chargent (le sanglier) ont leur banc : tools/test-charge.ts
const FLEERS = Object.entries(creatures).filter(([, d]) => d.reaction === 'flee');
for (const [kind, def] of FLEERS) {
  // ---------- les états selon la distance et l'allure ----------
  const at = { x: 0, y: 0 };
  for (const g of GAITS) {
    const s = def.senses[g];
    const xeros = (m: number) => ({ x: pixels(m), y: 0, gait: g });
    assert.equal(perceive(def, at, xeros(s.near - 0.1)), 'near', `${kind}, ${g} : en deçà de ${s.near} m, elle fuit`);
    assert.equal(perceive(def, at, xeros(s.alert - 0.1)), s.alert - 0.1 < s.near ? 'near' : 'alert', `${kind}, ${g} : en deçà de ${s.alert} m, aux aguets`);
    assert.equal(perceive(def, at, xeros(s.alert + 0.1)), undefined, `${kind}, ${g} : au-delà de ${s.alert} m, rien`);
  }
  // plus Xéros va vite, plus elle le perçoit de loin
  for (let i = 1; i < GAITS.length; i++) {
    const a = def.senses[GAITS[i - 1]];
    const b = def.senses[GAITS[i]];
    assert.ok(a.alert <= b.alert && a.near <= b.near, `${kind} : ${GAITS[i - 1]} se perçoit moins loin que ${GAITS[i]}`);
  }
  // ses distances d'alerte tiennent dans le champ visible au zoom de départ, de part et d'autre de Xéros, avec une marge d'un mètre
  // (Grégoire, chantier « correctifs » : on voit la bête qui se dresse)
  const half = (((VIEW.width * ZOOM) / ZOOM_STEPS.start / 2) * CM_PER_PX) / 100;
  for (const g of GAITS) assert.ok(def.senses[g].alert <= half - 1, `${kind}, ${g} : alerte à ${def.senses[g].alert} m, au-delà de la demi-vue au zoom de départ moins 1 m (${(half - 1).toFixed(1)} m)`);
  // Xéros à la course ne la rattrape jamais en fuite (voulu)
  assert.ok(def.flee!.speed > PLAYER.run, `${kind} : sa fuite (${def.flee!.speed} m/s) est plus rapide que la course de Xéros (${PLAYER.run} m/s)`);

  calmTest(kind, def);
  fleeTests(kind, def);
  alarmTest(kind, def);
  hurtTest(kind, def);
}

/** Aux aguets quand Xéros marche à portée d'alerte ; calmée quand il s'arrête ; toujours aux aguets tant qu'il approche ; calmée quand il recule. */
function calmTest(kind: string, def: CreatureDef): void {
  const s = def.senses.walk;
  const f = field([], [{ x: -pixels(200), y: 0 }]);
  const c = beast(def, { x: 0, y: 0 });
  const mid = (s.alert + s.near) / 2;
  f.threat = { x: pixels(mid), y: 0, gait: 'walk' };
  drive(c, def, f, 1);
  assert.equal(c.mode, 'alert', `${kind} : Xéros qui marche à ${mid} m, elle est aux aguets`);
  assert.equal(c.pose, 'alert', `${kind} : dressée`);
  assert.equal(c.facing, 'right', `${kind} : elle le regarde`);
  // Xéros s'arrête : elle se calme après `calm` secondes
  f.threat = { ...f.threat, gait: 'still' };
  const calmSteps = Math.ceil(def.calm / DT) + 2;
  const r = drive(c, def, f, calmSteps * 2, (b) => b.mode === 'calm');
  assert.equal(c.mode, 'calm', `${kind} : Xéros arrêté, elle se calme`);
  assert.ok(r.steps * DT >= def.calm - DT, `${kind} : pas avant ${def.calm} s (${(r.steps * DT).toFixed(2)} s)`);
  // il approche, lentement, sans entrer dans la distance de fuite : elle reste aux aguets
  const c2 = beast(def, { x: 0, y: 0 });
  const steps = Math.ceil((def.calm * 2) / DT);
  const from = s.alert - 0.05;
  const by = (from - s.near - 0.05) / steps;
  let x = from;
  f.threat = { x: pixels(x), y: 0, gait: 'walk' };
  drive(c2, def, f, steps, undefined, () => {
    x -= by;
    f.threat = { x: pixels(x), y: 0, gait: 'walk' };
  });
  assert.equal(c2.mode, 'alert', `${kind} : Xéros qui approche sans cesse, elle reste aux aguets (${def.calm * 2} s)`);
  // il recule : elle se calme
  drive(c2, def, f, calmSteps, (b) => b.mode === 'calm', () => {
    x += 1 * DT;
    f.threat = { x: pixels(x), y: 0, gait: 'walk' };
  });
  assert.equal(c2.mode, 'calm', `${kind} : Xéros qui recule, elle se calme`);
}

/** La fuite : atteint l'entrée, ne traverse jamais un obstacle (un mur de 2 px compris), zigzague en terrain libre, à sa vitesse. */
function fleeTests(kind: string, def: CreatureDef): void {
  const hole = { x: 0, y: 0 };
  const layouts: { name: string; boxes: Box[]; start: { x: number; y: number } }[] = [
    { name: 'un pré libre', boxes: [], start: { x: pixels(20), y: 0 } },
    { name: 'un mur mince (2 px) entre elle et l’entrée', boxes: [{ x: pixels(5), y: -pixels(8), w: 2, h: pixels(16) }], start: { x: pixels(12), y: 0 } },
    {
      name: 'une haie en U ouverte du mauvais côté',
      boxes: [
        { x: pixels(4), y: -pixels(6), w: 4, h: pixels(12) },
        { x: pixels(4), y: -pixels(6), w: pixels(10), h: 4 },
        { x: pixels(4), y: pixels(6) - 4, w: pixels(10), h: 4 },
      ],
      start: { x: pixels(8), y: 0 },
    },
    {
      name: 'des troncs épars',
      boxes: Array.from({ length: 30 }, (_, i) => ({ x: pixels(2 + (i % 6) * 2.5), y: pixels(-6 + Math.floor(i / 6) * 3) + (i % 2) * 9, w: 8, h: 6 })),
      start: { x: pixels(17), y: pixels(1) },
    },
  ];
  for (const L of layouts)
    for (let seed = 1; seed <= 12; seed++) {
      const f = field(L.boxes, [hole], seed);
      const blocked = blockedIn(L.boxes);
      const c = beast(def, L.start);
      f.threat = { x: L.start.x + pixels(def.senses.walk.near / 2), y: L.start.y, gait: 'walk' };
      const r = drive(
        c,
        def,
        f,
        Math.ceil(60 / DT),
        (_, ev) => ev.some((e) => e.kind === 'enter'),
        (b) => {
          assert.ok(!blocked(b.x, b.y), `${kind}, ${L.name}, graine ${seed} : jamais dans un obstacle (${b.x.toFixed(1)}, ${b.y.toFixed(1)})`);
          assert.ok(!b.from || clear(b.from, b, blocked), `${kind}, ${L.name}, graine ${seed} : jamais à travers un obstacle`);
        },
      );
      assert.ok(r.events.some((e) => e.kind === 'thump'), `${kind}, ${L.name}, graine ${seed} : elle tambourine à l’entrée`);
      assert.ok(r.events.some((e) => e.kind === 'enter'), `${kind}, ${L.name}, graine ${seed} : elle entre au terrier (${c.mode} à ${metres(Math.hypot(c.x, c.y)).toFixed(1)} m)`);
      assert.equal(c.mode, 'burrow', `${kind}, ${L.name} : au terrier`);
    }
  // en terrain libre : à sa vitesse (le zigzag allonge un peu), et elle zigzague
  const f = field([], [hole], 7);
  const c = beast(def, { x: pixels(20), y: 0 });
  f.threat = { x: pixels(22), y: 0, gait: 'run' };
  let side = 0;
  const r = drive(c, def, f, Math.ceil(30 / DT), (b) => b.mode === 'thump', (b) => (side = Math.max(side, Math.abs(b.y))));
  const t = r.steps * DT;
  const ideal = 20 / def.flee!.speed;
  assert.ok(t >= ideal * 0.98 && t <= ideal * 1.4, `${kind} : 20 m de fuite en ${t.toFixed(2)} s (en ligne droite : ${ideal.toFixed(2)} s)`);
  if (def.flee!.zigzag.angle > 0) assert.ok(side >= 3, `${kind} : elle zigzague (écart de ${side.toFixed(1)} px)`);
}

/** Le tambour à l'entrée fait fuir les voisines dans son rayon, pas les autres. */
function alarmTest(kind: string, def: CreatureDef): void {
  const hole = { x: 0, y: 0 };
  const f = field([], [hole], 3);
  const near = beast(def, { x: pixels(def.thump!.radius * 0.6), y: 0 });
  const far = beast(def, { x: 0, y: pixels(def.thump!.radius + 10) });
  near.id = `${kind}#1`;
  far.id = `${kind}#2`;
  const all: Creature[] = [near, far];
  alarm(all, def, hole, 'essai', () => around(f));
  assert.equal(near.mode, 'flee', `${kind} : à ${def.thump!.radius * 0.6} m du tambour, elle fuit`);
  assert.equal(far.mode, 'calm', `${kind} : à ${def.thump!.radius + 10} m, elle broute encore`);
}

/** Un coup qui ne tue pas : blessée, elle fuit ; un coup qui dépasse ses points de vie : morte. */
function hurtTest(kind: string, def: CreatureDef): void {
  const f = field([], [{ x: 0, y: 0 }], 5);
  const c = beast(def, { x: pixels(10), y: 0 });
  assert.equal(hurt(c, def.target.hp / 3, around(f)), 'wounded', `${kind} : un tiers de ses points de vie, blessée`);
  assert.equal(c.mode, 'flee', `${kind} : blessée, elle fuit`);
  assert.equal(hurt(c, def.target.hp, around(f)), 'dead', `${kind} : un gros coup, morte`);
}

console.log(
  `✓ créatures qui fuient (${FLEERS.map(([k]) => k).join(', ')}) : les états selon la distance et l'allure, le calme quand Xéros s'arrête ou recule, la fuite qui atteint l'entrée sans jamais traverser un obstacle (4 terrains × 12 graines), le zigzag, le tambour qui fait fuir les voisines, blessée ou tuée`,
);
