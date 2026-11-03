// La garenne et le temps (src/world/warren.ts), sans navigateur, pour chaque créature de creatures.json : à chaque heure, combien de
// bêtes sont dehors (la vie menée pas à pas, comme le jeu) ; le soir, elles rentrent ; une bête qui a fui ressort quelques minutes plus
// tard ; une population qui se reforme par les naissances, au rythme des données, pas avant ; un blessé reste au terrier et guérit le
// lendemain ; la matière : une bête tuée donne un seul objet, celui qu'elle devient, de sa masse.
// Usage : tsx tools/test-garenne.ts (lancé par npm run test:fast, donc par npm run build).

import assert from 'node:assert/strict';
import { creatures, items } from '../src/content';
import { CREATURES_TODO } from '../src/content/validate';
import type { Clock } from '../src/world/clock';
import { metres, pixels, type Surroundings } from '../src/world/creature';
import { rng } from '../src/world/gridCanvas';
import { able, absMinute, death, outShare, seedWarren, settle, wantedOut, wounded, WarrenLife, type WarrenSite, type WarrenState } from '../src/world/warren';
import { DT } from './lib/creature-trial';

const POP = 7;
const holes = [
  { x: 0, y: 0 },
  { x: pixels(4), y: pixels(1) },
  { x: pixels(1), y: pixels(5) },
];

/** Mener la garenne `minutes` minutes de jeu depuis `clock` (l'horloge avance avec les pas), Xéros en `threat` s'il est là. */
function live(life: WarrenLife, w: WarrenState, clock: Clock, minutes: number, rand: () => number, threat?: Surroundings['threat']): { clock: Clock; w: WarrenState } {
  const around = (): Surroundings => ({ threat, blocked: () => false, holes, rand });
  let c = { ...clock };
  const n = Math.round((minutes * 60) / DT);
  for (let i = 0; i < n; i++) {
    c = { day: c.day + Math.floor((c.minute + DT / 60) / 1440), minute: (c.minute + DT / 60) % 1440 };
    w = settle(w, life.site, life.def, c);
    life.step(w, c, DT, around, rand);
  }
  return { clock: c, w };
}

const outside = (life: WarrenLife) => life.out.filter((c) => c.mode !== 'home').length;
const at = (h: number, m = 0): Clock => ({ day: 1, minute: h * 60 + m });

for (const [kind, def] of Object.entries(creatures)) {
  const site: WarrenSite = { id: 1, kind, population: POP, holes };

  // ---------- à chaque heure, combien dehors ----------
  const counts: string[] = [];
  for (let h = 0; h < 24; h++) {
    const rand = rng(100 + h);
    const w = seedWarren(site, def, at(h));
    const life = new WarrenLife(site, def);
    life.populate(w, at(h), { blocked: () => false, holes, rand });
    const want = Math.round(outShare(def, h * 60) * POP);
    assert.equal(outside(life), want, `${kind}, ${h} h : à l'arrivée, ${want} dehors (${outside(life)})`);
    // vingt minutes plus tard, toujours ce que veut l'heure
    const r = live(life, w, at(h), 20, rand);
    const want2 = wantedOut(r.w, def, r.clock);
    assert.equal(outside(life), want2, `${kind}, ${h} h 20 : ${want2} dehors (${outside(life)})`);
    counts.push(`${h} h : ${outside(life)}`);
  }
  // le rythme décidé : la nuit aucune, à l'aube et au soir beaucoup, en journée deux ou trois
  const n = (h: number) => Math.round(outShare(def, h * 60) * POP);
  if (kind === 'rabbit') {
    assert.equal(n(2), 0, 'la nuit, tous au terrier');
    assert.ok(n(6) >= 5 && n(19) >= 5, `à l'aube et au soir, beaucoup dehors (${n(6)}, ${n(19)})`);
    assert.ok(n(13) >= 2 && n(13) <= 3, `en journée, deux ou trois (${n(13)})`);
  }

  // ---------- le soir, elles rentrent ; le matin, elles sortent une à une ----------
  {
    const rand = rng(7);
    const nightStart = def.schedule.find((s, i) => i > 0 && s.out === 0)?.hour;
    if (nightStart !== undefined) {
      const t0: Clock = { day: 1, minute: (nightStart - 1) * 60 };
      const w = seedWarren(site, def, t0);
      const life = new WarrenLife(site, def);
      life.populate(w, t0, { blocked: () => false, holes, rand });
      assert.ok(outside(life) > 0, `${kind} : une heure avant la nuit, des bêtes dehors`);
      live(life, w, t0, 60 + 15, rand);
      assert.equal(life.out.length, 0, `${kind} : un quart d'heure après la tombée de la nuit, toutes au terrier (${life.out.length} dehors)`);
    }
    const dawn = def.schedule.find((s) => s.out > 0)!;
    const before: Clock = { day: 1, minute: (dawn.hour - 1) * 60 };
    const w1 = seedWarren(site, def, before);
    const life1 = new WarrenLife(site, def);
    life1.populate(w1, before, { blocked: () => false, holes, rand });
    assert.equal(life1.out.length, 0, `${kind} : avant l'aube, personne dehors`);
    const r = live(life1, w1, before, 60 + 10, rand);
    assert.equal(outside(life1), wantedOut(w1, def, r.clock), `${kind} : dix minutes après l'aube, elles sont sorties une à une`);
  }

  // ---------- une bête qui a fui ressort quelques minutes plus tard ----------
  {
    const rand = rng(11);
    const t = at(6);
    const w = seedWarren(site, def, t);
    const life = new WarrenLife(site, def);
    life.populate(w, t, { blocked: () => false, holes, rand });
    const before = outside(life);
    // Xéros arrive en courant au milieu de la garenne : celles à portée de fuite (`senses.run.flee`) rentrent au terrier ; celles à portée
    // d'alerte restent aux aguets ; les plus loin ne s'en soucient pas (sans le tambour, qui est du jeu : systems/creatures.ts)
    const xeros = { x: pixels(2), y: pixels(2) };
    const away = (c: { x: number; y: number }) => metres(Math.hypot(c.x - xeros.x, c.y - xeros.y));
    const ids = new Set(life.out.map((c) => c.id));
    const near = life.out.filter((c) => away(c) < def.senses.run.flee).map((c) => c.id);
    assert.ok(near.length >= 1, `${kind} : au moins une bête à portée de fuite de Xéros (${def.senses.run.flee} m)`);
    const r = live(life, w, t, 0.5, rand, { ...xeros, gait: 'run' });
    const fled = [...ids].filter((id) => !life.out.some((c) => c.id === id));
    assert.ok(near.every((id) => fled.includes(id)), `${kind} : Xéros qui court au milieu de la garenne, celles à moins de ${def.senses.run.flee} m au terrier en 30 s (${fled.length} sur ${before}, ${near.length} à portée)`);
    for (const c of life.out) {
      if (away(c) < def.senses.run.alert - 0.5) assert.equal(c.mode, 'alert', `${kind} : celle à ${away(c).toFixed(1)} m reste aux aguets`);
      assert.notEqual(c.mode, 'flee', `${kind} : celle à ${away(c).toFixed(1)} m ne fuit plus`);
    }
    // il s'en va : celles qui ont fui ne ressortent pas avant `burrow.stay[0]` minutes
    const r2 = live(life, r.w, r.clock, def.burrow.stay[0] - 0.6, rand);
    assert.ok(!life.out.some((c) => fled.includes(c.id)), `${kind} : pas avant ${def.burrow.stay[0]} minutes`);
    live(life, r2.w, r2.clock, def.burrow.stay[1] - def.burrow.stay[0] + 0.6 + (POP * def.burrow.emerge) / 60, rand);
    assert.equal(outside(life), before, `${kind} : après ${def.burrow.stay[1]} minutes, elles sont ressorties`);
  }

  // ---------- les naissances ----------
  {
    const t = at(12);
    let w = seedWarren(site, def, t);
    for (const m of w.members.slice(0, 3)) w = death(w, { id: `1:${m.n}`, x: 0, y: 0 } as never, site, def, t).state;
    assert.equal(w.members.length, POP - 3, `${kind} : trois bêtes tuées`);
    const every = def.births.hours * 60;
    const later = (min: number): Clock => ({ day: 1 + Math.floor((absMinute(t) + min) / 1440), minute: (absMinute(t) + min) % 1440 });
    assert.equal(settle(w, site, def, later(every - 1)).members.length, POP - 3, `${kind} : pas de naissance avant ${def.births.hours} h`);
    const w1 = settle(w, site, def, later(every));
    assert.equal(w1.members.length, POP - 2, `${kind} : une naissance après ${def.births.hours} h`);
    const w3 = settle(w1, site, def, later(every * 3 + 5));
    assert.equal(w3.members.length, POP, `${kind} : la population se reforme après ${def.births.hours * 3} h`);
    assert.equal(settle(w3, site, def, later(every * 10)).members.length, POP, `${kind} : pas au-delà de sa population`);
    assert.equal(new Set(w3.members.map((m) => m.n)).size, POP, `${kind} : chaque bête a son numéro`);
  }

  // ---------- un blessé reste au terrier et guérit le lendemain ----------
  {
    const t = at(19);
    let w = seedWarren(site, def, t);
    const n0 = w.members[0].n;
    w = wounded(w, n0, def.target.hp / 2, def, t);
    assert.equal(able(w, t).length, POP - 1, `${kind} : blessé, il ne sort pas`);
    assert.equal(settle(w, site, def, { day: t.day, minute: 23 * 60 }).members.find((m) => m.n === n0)?.heal, t.day + def.heal.days, `${kind} : pas guéri le soir même`);
    const tomorrow = { day: t.day + def.heal.days, minute: 5 * 60 };
    const healed = settle(w, site, def, tomorrow);
    assert.equal(healed.members.find((m) => m.n === n0)?.hp, def.target.hp, `${kind} : guéri au jour ${tomorrow.day}`);
    assert.equal(able(healed, tomorrow).length, POP, `${kind} : guéri, il sort de nouveau`);
  }

  // ---------- la matière : une bête tuée, un seul objet de sa masse ----------
  {
    const t = at(7);
    const w = seedWarren(site, def, t);
    const victim = { id: `1:${w.members[2].n}`, x: 37, y: 42 };
    const { state, remains } = death(w, victim as never, site, def, t);
    assert.equal(state.members.length, w.members.length - 1, `${kind} : la bête tuée quitte la garenne`);
    assert.deepEqual(remains, { item: def.becomes, x: 37, y: 42 }, `${kind} : un seul objet, '${def.becomes}', là où elle meurt`);
    if (!CREATURES_TODO[kind]) {
      const item = items[def.becomes];
      assert.ok(item, `${kind} : '${def.becomes}' est dans items.json`);
      const before = w.members.length * def.mass;
      const after = state.members.length * def.mass + (item.mass as number);
      assert.equal(after, before, `${kind} : la masse se conserve (${before} kg avant, ${after} kg après)`);
    }
  }
  console.log(`  ${kind}, dehors heure par heure (population ${POP}) : ${counts.join(', ')}`);
}

console.log(
  `✓ garenne (${Object.keys(creatures).join(', ')}) : le nombre dehors à chaque heure, le soir au terrier, la sortie de l'aube une à une, la fuite puis la ressortie après quelques minutes, les naissances qui reforment la population, le blessé guéri le lendemain, la bête tuée qui devient un seul objet${Object.keys(CREATURES_TODO).length ? ` (sa masse vérifiée quand l'objet existera : ${Object.keys(CREATURES_TODO).join(', ')})` : ' de sa masse'}`,
);
