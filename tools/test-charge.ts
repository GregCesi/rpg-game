// Le moteur des bêtes qui chargent (src/world/creature.ts, src/world/charge.ts, la bauge de src/world/warren.ts), sans navigateur, pour
// chaque créature de creatures.json dont la réaction est la charge (le sanglier) : la perception (couchée, à moitié), l'annonce, la
// ligne visée une fois, la charge qui emporte Xéros (le choc mou : l'énergie perdue, la vitesse commune, la glissade, les dégâts), le
// choc contre un tronc (sonnée au prorata de l'énergie), la ligne barrée (pas de charge), le buisson traversé, jamais à travers un
// obstacle dur, blessée (elle charge ; sonnée, elle le reste), la bauge (couchées le jour, debout la nuit), la peau (les dégâts d'un
// coup selon son tranchant).
// Usage : tsx tools/test-charge.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { combat, creatures, health, strength } from '../src/content';
import type { CreatureDef } from '../src/content/types';
import { goreXeros, kineticJ, stunSeconds, type Ground } from '../src/world/charge';
import { hurt, metres, perceive, pixels, setXerosMass, step, type Creature, type CreatureEvent, type Surroundings } from '../src/world/creature';
import { impactDamage, throughHide } from '../src/world/strike';
import { rng } from '../src/world/gridCanvas';
import { WarrenLife, seedWarren, type WarrenSite } from '../src/world/warren';
import { beast, DT, type Box } from './lib/creature-trial';

const CHARGERS = Object.entries(creatures).filter(([, d]) => d.reaction === 'charge');
assert.ok(CHARGERS.length > 0, 'creatures.json : au moins une bête qui charge (le sanglier)');
setXerosMass(strength.mass);

/** Un terrain : des boîtes dures, des boîtes molles (des buissons), Xéros. */
interface Terrain {
  solid: Box[];
  soft: Box[];
  threat?: Surroundings['threat'];
  rand: () => number;
}
const inBox = (b: Box, x: number, y: number) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
const ground = (t: Terrain) => (x: number, y: number): Ground => (t.solid.some((b) => inBox(b, x, y)) ? 'solid' : t.soft.some((b) => inBox(b, x, y)) ? 'soft' : undefined);
const around = (t: Terrain): Surroundings => ({ threat: t.threat, blocked: (x, y) => t.solid.some((b) => inBox(b, x, y)), ground: ground(t), holes: [{ x: -pixels(300), y: 0 }], rand: t.rand });

/** Mener la bête jusqu'à `until` (au plus `n` pas) ; `each` à chaque pas ; rend les événements. */
function run(c: Creature, def: CreatureDef, t: Terrain, n: number, until?: (c: Creature, ev: CreatureEvent[]) => boolean, each?: (c: Creature) => void): CreatureEvent[] {
  const all: CreatureEvent[] = [];
  for (let i = 0; i < n; i++) {
    const ev = step(c, def, around(t), DT);
    all.push(...ev);
    each?.(c);
    if (until?.(c, ev)) break;
  }
  return all;
}

for (const [kind, def] of CHARGERS) {
  const ch = def.charge!;
  const terrain = (seed = 1): Terrain => ({ solid: [], soft: [], rand: rng(seed) });

  // ---------- la perception : couchée, à moitié ----------
  for (const g of ['still', 'sneak', 'walk', 'run'] as const) {
    const s = def.senses[g];
    assert.equal(perceive(def, { x: 0, y: 0 }, { x: pixels(s.near - 0.1), y: 0, gait: g }), 'near', `${kind}, ${g} : en deçà de ${s.near} m, elle réagit`);
    assert.equal(perceive(def, { x: 0, y: 0 }, { x: pixels(s.alert - 0.1), y: 0, gait: g }, def.asleep), def.asleep < 1 ? undefined : 'alert', `${kind}, ${g} : couchée, à ${s.alert - 0.1} m, rien`);
  }

  // ---------- la charge qui emporte Xéros ----------
  {
    const t = terrain();
    const c = beast(def, { x: 0, y: 0 }, kind);
    const d = (def.senses.walk.near + def.senses.walk.alert) / 2;
    t.threat = { x: pixels(d), y: 0, gait: 'walk' };
    // à mi-chemin de l'alerte et de la réaction : aux aguets, pas de charge
    run(c, def, t, 3);
    assert.equal(c.mode, 'alert', `${kind} : Xéros qui marche à ${d} m, aux aguets`);
    // il approche à la distance de réaction : l'annonce, puis la charge
    t.threat = { x: pixels(def.senses.walk.near - 1), y: 0, gait: 'walk' };
    run(c, def, t, 2);
    assert.equal(c.mode, 'tell', `${kind} : Xéros à ${def.senses.walk.near - 1} m, ligne libre : l'annonce`);
    let told = 0;
    run(c, def, t, 200, (b) => b.mode !== 'tell', () => (told += DT));
    assert.ok(Math.abs(told - ch.tell) <= 2 * DT, `${kind} : l'annonce dure ${ch.tell} s (${told.toFixed(2)})`);
    assert.equal(c.mode, 'charge', `${kind} : puis la charge`);
    const ev = run(c, def, t, 600, (_, e) => e.some((x) => x.kind === 'gore'));
    const gore = ev.find((x) => x.kind === 'gore') as Extract<CreatureEvent, { kind: 'gore' }> | undefined;
    assert.ok(gore, `${kind} : elle emporte Xéros`);
    const dist = def.senses.walk.near - 1 - metres(def.dims.w / 5 / 2) - 0.25;
    const expected = Math.min(ch.speed, Math.sqrt(2 * ch.accel * dist));
    assert.ok(Math.abs(gore.speed - expected) < 0.6, `${kind} : à ${expected.toFixed(1)} m/s au choc (${gore.speed.toFixed(1)})`);
    assert.ok(gore.dir.x > 0.99, `${kind} : droit vers Xéros`);
    // elle freine, souffle, et peut recharger
    run(c, def, t, 600, (b) => b.mode === 'alert');
    assert.equal(c.mode, 'alert', `${kind} : arrêtée, elle souffle aux aguets`);
    assert.ok(c.wait > 0, `${kind} : son souffle de ${ch.breath} s`);
  }

  // ---------- le choc mou : les nombres du cadrage ----------
  {
    const r = goreXeros(def.mass, ch.speed, strength.mass, health.knockdown.friction, combat.throw.gravity);
    const dmg = impactDamage(combat.rules, r.lost, ch.tusk);
    assert.ok(Math.abs(r.lost - 2259) < 5, `${kind} : à pleine vitesse, 2 259 J perdus dans le choc (${r.lost.toFixed(0)})`);
    assert.ok(Math.abs(r.after - 5.87) < 0.02, `${kind} : Xéros emporté à 5,9 m/s (${r.after.toFixed(2)})`);
    assert.ok(Math.abs(r.slide - 2.5) < 0.05, `${kind} : il glisse 2,5 m (${r.slide.toFixed(2)})`);
    assert.equal(Math.ceil(health.max / dmg), 3, `${kind} : trois charges pleines l'évanouissent (${dmg} points par charge)`);
  }

  // ---------- la ligne visée une fois : Xéros s'écarte, le tronc derrière l'arrête ----------
  {
    const t = terrain(2);
    const trunk: Box = { x: pixels(12), y: -6, w: 10, h: 12 };
    t.solid.push(trunk);
    const c = beast(def, { x: 0, y: 0 }, kind);
    t.threat = { x: pixels(def.senses.walk.near - 1), y: 0, gait: 'walk' };
    run(c, def, t, 200, (b) => b.mode === 'charge');
    assert.equal(c.mode, 'charge', `${kind} : elle charge vers Xéros, devant le tronc`);
    // Xéros s'écarte de 2 m : la ligne ne suit pas
    t.threat = { x: pixels(def.senses.walk.near - 1), y: pixels(2), gait: 'walk' };
    const ev = run(c, def, t, 600, (_, e) => e.some((x) => x.kind === 'impact'), (b) => assert.ok(!t.solid.some((x) => inBox(x, b.x, b.y)), `${kind} : jamais dans le tronc`));
    assert.ok(!ev.some((x) => x.kind === 'gore'), `${kind} : Xéros écarté n'est pas touché`);
    const hit = ev.find((x) => x.kind === 'impact') as Extract<CreatureEvent, { kind: 'impact' }> | undefined;
    assert.ok(hit, `${kind} : elle heurte le tronc derrière Xéros`);
    assert.ok(Math.abs(c.y) < 1e-6, `${kind} : en ligne droite (la ligne jamais corrigée)`);
    assert.equal(c.mode, 'stunned', `${kind} : sonnée`);
    assert.ok(Math.abs(hit.stun - stunSeconds(def, hit.joules)) < 1e-9 && hit.joules > 0.8 * kineticJ(def.mass, ch.speed), `${kind} : presque à pleine vitesse (${hit.joules.toFixed(0)} J), sonnée au prorata, ${hit.stun.toFixed(1)} s`);
    assert.ok(hit.stun > 0 && hit.stun <= def.stun!.seconds + 1e-9, `${kind} : au plus ${def.stun!.seconds} s`);
    // frappée pendant qu'elle est sonnée : elle le reste jusqu'au bout ; puis, blessée, elle charge aussitôt
    t.threat = { x: pixels(10), y: 0, gait: 'still' };
    assert.equal(hurt(c, 5, around(t), def), 'wounded');
    assert.equal(c.mode, 'stunned', `${kind} : frappée sonnée, elle le reste`);
    const left = c.wait;
    let stunned = 0;
    run(c, def, t, 2000, (b) => b.mode !== 'stunned', () => (stunned += DT));
    assert.ok(Math.abs(stunned - left) <= 2 * DT, `${kind} : sonnée jusqu'au bout (${stunned.toFixed(2)} s sur ${left.toFixed(2)})`);
    assert.equal(c.mode, 'tell', `${kind} : blessée, elle charge aussitôt`);
  }

  // ---------- s'écarter d'un pas suffit, d'un côté comme de l'autre ----------
  for (const side of [-1, 1]) {
    const t = terrain(7);
    const c = beast(def, { x: 0, y: 0 }, kind);
    t.threat = { x: pixels(def.senses.walk.near - 1), y: 0, gait: 'walk' };
    run(c, def, t, 200, (b) => b.mode === 'charge');
    t.threat = { x: t.threat.x, y: side * pixels(0.6), gait: 'walk' };
    const ev = run(c, def, t, 600, (b) => b.mode === 'alert');
    assert.ok(!ev.some((x) => x.kind === 'gore'), `${kind} : Xéros écarté de 60 cm vers le ${side < 0 ? 'nord' : 'sud'}, la charge le manque`);
    const t2 = terrain(7);
    const c2 = beast(def, { x: 0, y: 0 }, kind);
    t2.threat = { x: pixels(def.senses.walk.near - 1), y: 0, gait: 'walk' };
    run(c2, def, t2, 200, (b) => b.mode === 'charge');
    t2.threat = { x: t2.threat.x, y: side * pixels(0.25), gait: 'walk' };
    const ev2 = run(c2, def, t2, 600, (b) => b.mode === 'alert');
    assert.ok(ev2.some((x) => x.kind === 'gore'), `${kind} : écarté de 25 cm vers le ${side < 0 ? 'nord' : 'sud'}, elle l'emporte encore`);
  }

  // ---------- un choc trop doux ne sonne pas ----------
  assert.equal(stunSeconds(def, def.stun!.from - 1), 0, `${kind} : sous ${def.stun!.from} J, pas sonnée`);

  // ---------- la ligne barrée : pas de charge ----------
  {
    const t = terrain(3);
    t.solid.push({ x: pixels(3), y: -20, w: 10, h: 40 });
    const c = beast(def, { x: 0, y: 0 }, kind);
    t.threat = { x: pixels(def.senses.walk.near - 1), y: 0, gait: 'walk' };
    run(c, def, t, 120);
    assert.equal(c.mode, 'alert', `${kind} : un tronc entre elle et Xéros, aux aguets sans charger`);
  }

  // ---------- le buisson : traversé, secoué ----------
  {
    const t = terrain(4);
    t.soft.push({ x: pixels(3), y: -10, w: 22, h: 20 });
    const c = beast(def, { x: 0, y: 0 }, kind);
    t.threat = { x: pixels(def.senses.walk.near - 1), y: 0, gait: 'walk' };
    const ev = run(c, def, t, 600, (_, e) => e.some((x) => x.kind === 'gore'));
    assert.ok(ev.some((x) => x.kind === 'brush'), `${kind} : elle traverse le buisson en le secouant`);
    assert.ok(ev.some((x) => x.kind === 'gore'), `${kind} : et emporte Xéros derrière`);
  }

  // ---------- blessée tranquille : elle charge aussitôt ----------
  {
    const t = terrain(5);
    const c = beast(def, { x: 0, y: 0 }, kind);
    t.threat = { x: pixels(6), y: 0, gait: 'still' };
    assert.equal(hurt(c, 1, around(t), def), 'wounded');
    assert.equal(c.mode, 'tell', `${kind} : un coup, et elle charge`);
    assert.equal(hurt(c, def.target.hp, around(t), def), 'dead', `${kind} : un coup qui dépasse sa vie la tue`);
  }

  // ---------- la peau : un tranchant la coupe, un coup sans tranchant y reste ----------
  {
    const hide = def.target.hide;
    assert.equal(throughHide(combat.rules, hide, 1, hide, 0), 0, `${kind} : ${hide} J sans tranchant, aucun dégât`);
    assert.equal(throughHide(combat.rules, hide, 1, hide, 1), impactDamage(combat.rules, hide, 1), `${kind} : le tranchant de la hache passe la peau`);
    assert.equal(throughHide(combat.rules, 500, 1, 0, 0), impactDamage(combat.rules, 500, 1), `sans peau, la règle des coups`);
  }

  // ---------- la bauge : couchées le jour, debout la nuit, de retour le matin ----------
  {
    const site: WarrenSite = { id: 1, kind, population: 3, holes: [{ x: 0, y: 0 }] };
    const rand = rng(6);
    const noon = { day: 1, minute: 12 * 60 };
    const w = seedWarren(site, def, noon);
    const day = new WarrenLife(site, def);
    const t = terrain(6);
    day.populate(w, noon, around(t));
    assert.equal(day.out.length, 3, `${kind} : à la bauge, les trois sont là (visibles)`);
    assert.ok(day.out.every((c) => c.mode === 'rest'), `${kind} : à midi, couchées (${day.out.map((c) => c.mode).join(', ')})`);
    const night = { day: 1, minute: 23 * 60 };
    const life = new WarrenLife(site, def);
    life.populate(w, night, around(t));
    assert.ok(life.out.every((c) => c.mode === 'calm'), `${kind} : la nuit, debout`);
    // le matin : elles rentrent se coucher
    let clock = { day: 2, minute: 7 * 60 + 1 };
    for (let i = 0; i < Math.ceil(600 / DT) && life.out.some((c) => c.mode !== 'rest'); i++) {
      life.step(w, clock, DT, () => around(t), rand);
      clock = { ...clock, minute: clock.minute + DT / 60 };
    }
    assert.ok(life.out.every((c) => c.mode === 'rest'), `${kind} : au matin, couchées à la bauge (${life.out.map((c) => c.mode).join(', ')})`);
  }
}

console.log(
  `✓ bêtes qui chargent (${CHARGERS.map(([k]) => k).join(', ')}) : couchées, elles perçoivent à moitié ; l'annonce, la ligne visée une fois, la charge qui emporte Xéros (2 259 J, 5,9 m/s, 2,5 m, trois charges), le tronc derrière Xéros écarté (sonnée au prorata), la ligne barrée, le buisson traversé, blessée elle charge, sonnée elle le reste, la peau et le tranchant, la bauge le jour et la nuit`,
);
