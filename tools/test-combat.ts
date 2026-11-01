// Test de scénario du combat de base (docs/CONCEPTION.md, « Le combat »), dans le vrai jeu (voir tools/lib/playtest.ts), avec
// ?debug : le mannequin posé sur la ferme, frappé à la branche puis à l'épée de bois dans les quatre directions (il penche, ne casse
// pas, les dégâts s'écrivent au-dessus) ; la portée suit la longueur (à une distance où la branche touche, l'épée manque), les
// dégâts et le prix en endurance suivent la masse et sont ceux du calcul (world/strike.ts), l'épée fait environ 1,5 fois les dégâts
// par seconde de la branche (le rééquilibrage) ; un deuxième Espace enchaîne le coup
// d'en haut ; un coup dans le vide coûte aussi ; épuisé, rien ne part ; une ou deux branches en main ne changent rien ; la branche
// active et la hachette dans l'autre main taillent toujours (Espace n'attaque pas).
// Usage : npm run test:combat (lancé aussi par npm run test).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('combat', async ({ page, errors, load }) => {
  await load('?dieu&reset&debug');
  const r = (await page.evaluate(async () => {
    const sleep = (t: number) => new Promise((res) => setTimeout(res, t));
    const g = (window as any).game;
    const w = () => g.scene.getScene('world');
    // chemins dans une variable : ce sont des modules de la page (servis par Vite), pas du test
    const stateUrl = '/src/state/index.ts';
    const strikeUrl = '/src/world/strike.ts';
    const contentUrl = '/src/content/index.ts';
    const massUrl = '/src/content/mass.ts';
    const gs = await import(stateUrl);
    const strike = await import(strikeUrl);
    const content = await import(contentUrl);
    const mass = await import(massUrl);
    const notices: string[] = [];
    g.events.on('notice', (t: string) => notices.push(t));
    const send = async (c: unknown, ms = 150) => {
      g.events.emit('dieu', c);
      await sleep(ms);
    };
    const press = async (code: string) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      await sleep(40);
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    };
    const standAt = async (x: number, y: number, face: string) => {
      const a = w().player.actor;
      a.body.reset(Math.round(x), Math.round(y));
      a.face(face);
      await sleep(120);
    };
    // attend la fin du geste (et de l'enchaînement qu'il a pu lancer)
    const settle = async () => {
      for (let i = 0; i < 150 && (w().mode !== 'play' || w().combat.busy); i++) await sleep(20);
      await sleep(60);
    };
    const stamina = () => w().player.stamina.value;
    const log = () => w().combat.log;
    // les chiffres des dégâts écrits dans le monde (?debug)
    const damageTexts = () => w().children.list.filter((o: any) => o.type === 'Text' && /^\d+(,\d)?$/.test(o.text)).length;

    await send({ kind: 'map', map: 'ferme' }, 1500);
    // un coin dégagé de 140 × 140 px
    const m = w().map;
    let spot: [number, number] | undefined;
    for (let y = 96; y < m.height - 200 && !spot; y += 8) {
      for (let x = 96; x < m.width - 200 && !spot; x += 8) if (m.areaFree({ left: x, top: y, right: x + 140, bottom: y + 140 })) spot = [x, y];
    }
    if (!spot) throw new Error('pas de coin dégagé sur la ferme');
    await standAt(spot[0] + 70, spot[1] + 40, 'down');
    await send({ kind: 'prop', prop: 'training-dummy' }, 300);
    const dummy = w().map.props.find((p: any) => p.type === 'training-dummy');
    if (!dummy) throw new Error('le mannequin ne s’est pas posé');
    const box = strike.footprint(dummy.def.dims, dummy.baseX, dummy.baseY);
    // Xéros à `gap` px du bord de l'emprise du mannequin, tourné vers lui
    const facingDummy = async (dir: string, gap: number) => {
      const midY = (box.top + box.bottom) / 2;
      const at: Record<string, [number, number]> = {
        right: [box.left - gap, midY],
        left: [box.right + gap, midY],
        down: [dummy.baseX, box.top - gap],
        up: [dummy.baseX, box.bottom + gap],
      };
      await standAt(at[dir][0], at[dir][1], dir);
    };
    // un coup (Espace), seul : on laisse passer l'enchaînement d'avant ; rend l'entrée du journal, l'endurance dépensée, la plus grande
    // inclinaison du mannequin et le nombre de chiffres de dégâts écrits pendant le geste
    const strikeOnce = async () => {
      await sleep(400);
      const n = log().length;
      const before = stamina();
      await press('Space');
      let tilt = 0;
      let texts = 0;
      let played = false;
      for (let i = 0; i < 60 && (w().mode !== 'play' || w().combat.busy); i++) {
        played ||= w().mode === 'use' && w().player.tools.busy;
        tilt = Math.max(tilt, Math.abs(dummy.image.angle));
        texts = Math.max(texts, damageTexts());
        await sleep(15);
      }
      await settle();
      return { entry: log().length > n ? log()[log().length - 1] : undefined, spent: before - stamina(), tilt, texts, played };
    };
    const hit = (e: any) => !!e?.hits.some((h: any) => h.type === 'training-dummy');
    const give = async (item: string) => {
      await send({ kind: 'give', held: { item } });
    };

    await send({ kind: 'stamina', value: 100 });
    const out: Record<string, any> = { map: w().map.def.id, weapons: {} };
    for (const item of ['branch', 'wooden-sword']) {
      await give(item);
      const res: Record<string, any> = { near: {}, far: {} };
      for (const dir of ['down', 'up', 'right', 'left']) {
        await facingDummy(dir, 14);
        const near = await strikeOnce();
        res.near[dir] = { hit: hit(near.entry), attack: near.entry?.attack, damage: near.entry?.damage, spent: Math.round(near.spent * 1000) / 1000, tilt: near.tilt, texts: near.texts };
        await facingDummy(dir, 28);
        const far = await strikeOnce();
        res.far[dir] = { hit: hit(far.entry) };
      }
      const weapon = content.items[item].weapon;
      const kg = mass.itemMass(item);
      const slash = content.combat.attacks.slash;
      res.expect = {
        reach: strike.reachCm(content.combat.rules, weapon),
        damage: strike.damage(content.combat.rules, slash, weapon, kg),
        cost: Math.round(strike.attackCost(content.stamina.costs, slash, kg) * 1000) / 1000,
        cycle: strike.cycle(content.combat.rules, slash, weapon, kg),
        precision: strike.precision(content.combat.rules, weapon, kg),
      };
      res.reach = log()[log().length - 1].reach;
      out.weapons[item] = res;
    }

    // l'enchaînement : deux Espace, le second pendant le geste
    await give('wooden-sword');
    await facingDummy('right', 14);
    await sleep(400);
    let n = log().length;
    await press('Space');
    await sleep(120);
    await press('Space');
    await settle();
    out.chain = log().slice(n).map((e: any) => e.attack);

    // un coup dans le vide coûte aussi
    await facingDummy('left', 80);
    const air = await strikeOnce();
    out.air = { hits: air.entry?.hits.length, spent: Math.round(air.spent * 1000) / 1000, played: air.played };

    // l'arme dans la main qui n'est pas active, l'active vide : elle sert quand même, dans le vide
    await give('branch');
    gs.switchHand(gs.game);
    w().handsChanged();
    const other = await strikeOnce();
    out.otherHand = { active: gs.game.hands[gs.game.active]?.item ?? null, attack: other.entry?.attack, played: other.played, spent: Math.round(other.spent * 1000) / 1000 };

    // épuisé : rien ne part
    await send({ kind: 'stamina', value: 0 });
    n = log().length;
    notices.length = 0;
    await press('Space');
    await settle();
    out.exhausted = { attacks: log().length - n, notice: notices.join(' | ') };
    await send({ kind: 'stamina', value: 100 });

    // une ou deux branches : le même coup
    await give('branch');
    await facingDummy('down', 14);
    const one = await strikeOnce();
    gs.take(gs.game, { item: 'branch' }, 1);
    w().handsChanged();
    const both = [gs.game.hands[0]?.item, gs.game.hands[1]?.item];
    const two = await strikeOnce();
    const summary = (e: any) => ({ attack: e?.attack, damage: e?.damage, cost: e?.cost, hit: hit(e) });
    out.twoBranches = { both, one: summary(one.entry), two: summary(two.entry) };

    // la branche dans la main active, la hachette dans l'autre : Espace taille (ou frappe dans le vide à la hachette), n'attaque pas
    await give('branch');
    gs.take(gs.game, { item: 'hatchet' }, 1);
    w().handsChanged();
    await facingDummy('left', 80);
    n = log().length;
    await press('Space');
    await settle();
    out.whittle = { attacks: log().length - n, active: gs.game.hands[gs.game.active]?.item };

    // le mannequin ne casse jamais, et revient droit
    out.dummyLeft = w().map.props.filter((p: any) => p.type === 'training-dummy').length;
    out.dummyAngle = dummy.image.angle;
    return out;
  })) as Record<string, any>;
  console.log(JSON.stringify(r));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  for (const [item, res] of Object.entries(r.weapons) as [string, any][]) {
    for (const dir of ['down', 'up', 'right', 'left']) {
      const near = res.near[dir];
      assert.ok(near.hit, `${item} ${dir} : le mannequin à 14 px est touché`);
      assert.equal(near.attack, 'slash', `${item} ${dir} : le premier coup est la taille`);
      assert.equal(near.damage, res.expect.damage, `${item} ${dir} : les dégâts sont ceux du calcul`);
      assert.ok(Math.abs(near.spent - res.expect.cost) < 1e-3, `${item} ${dir} : l'endurance dépensée (${near.spent}) est le prix calculé (${res.expect.cost})`);
      assert.ok(near.tilt > 0, `${item} ${dir} : le mannequin penche sous le coup`);
      assert.ok(near.texts > 0, `${item} ${dir} : avec ?debug, les dégâts s'écrivent au-dessus du mannequin`);
    }
    assert.equal(res.reach, res.expect.reach, `${item} : la portée est bras + arme devant la main`);
  }
  const b = r.weapons.branch;
  const s = r.weapons['wooden-sword'];
  for (const dir of ['down', 'up', 'right', 'left']) {
    assert.ok(b.far[dir].hit, `branche ${dir} : à 28 px, la branche (portée ${b.reach} cm) touche encore`);
    assert.ok(!s.far[dir].hit, `épée ${dir} : à 28 px, l'épée (portée ${s.reach} cm) manque`);
  }
  assert.ok(b.reach > s.reach, 'la branche, plus longue, porte plus loin');
  assert.ok(b.expect.damage > s.expect.damage, 'la branche, plus lourde, frappe plus fort');
  assert.ok(b.expect.cost > s.expect.cost, 'la branche, plus lourde, coûte plus');
  // le rééquilibrage : l'épée, plus rapide et précise, fait environ 1,5 fois les dégâts par seconde de la branche
  const dps = (x: any) => x.expect.damage / x.expect.cycle;
  assert.ok(dps(s) / dps(b) > 1.3 && dps(s) / dps(b) < 1.7, `l'épée fait environ 1,5 fois les dégâts par seconde de la branche (${(dps(s) / dps(b)).toFixed(2)})`);
  assert.ok(s.expect.precision > 0.6 && b.expect.precision < 0.3, 'l’épée se contrôle, la branche est maladroite');
  assert.deepEqual(r.chain, ['slash', 'overhead'], 'un deuxième Espace pendant le geste enchaîne le coup d’en haut');
  assert.equal(r.air.hits, 0, 'dans le vide, rien n’est touché');
  assert.ok(r.air.spent > 0, 'un coup dans le vide coûte de l’endurance');
  assert.ok(r.air.played, 'dans le vide, le geste complet se joue');
  assert.equal(r.otherHand.active, null, 'la main active est vide, l’arme est dans l’autre');
  assert.equal(r.otherHand.attack, 'slash', 'l’arme de l’autre main attaque quand l’active est vide');
  assert.ok(r.otherHand.played && r.otherHand.spent > 0, 'avec son geste et son prix');
  assert.equal(r.exhausted.attacks, 0, 'épuisé, aucune attaque ne part');
  assert.match(r.exhausted.notice, /épuisé/, 'épuisé, on le dit');
  assert.deepEqual(r.twoBranches.both, ['branch', 'branch'], 'deux branches en main');
  assert.deepEqual(r.twoBranches.two, r.twoBranches.one, 'une ou deux branches : le même coup');
  assert.ok(r.twoBranches.one.hit, 'et il touche');
  assert.equal(r.whittle.attacks, 0, 'branche et hachette : Espace n’attaque pas');
  assert.equal(r.dummyLeft, 1, 'le mannequin ne casse pas');
  assert.equal(r.dummyAngle, 0, 'il revient droit');
  console.log('  ✓ combat : le mannequin frappé à la branche et à l’épée de bois dans les quatre directions, portée et dégâts selon la longueur et la masse, prix en endurance, enchaînement, coup dans le vide, épuisé, une ou deux branches, la hachette qui taille toujours');
});
