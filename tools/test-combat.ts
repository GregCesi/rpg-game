// Test de scénario du combat (docs/CONCEPTION.md, « Le combat »), dans le vrai jeu (voir tools/lib/playtest.ts), avec ?debug : le
// mannequin posé sur la ferme.
// - La zone de coup est fidèle à ce qui est dessiné : pour chaque arme et chaque direction, la plus grande distance où la lame dessinée
//   (sans écart de précision) recoupe la silhouette du mannequin est calculée par world/strike.ts ; en jeu, à cette distance le coup
//   porte, et 2 px plus loin (une cible juste hors de portée) il ne porte pas.
// - Une cible traversée par l'arc (la taille a deux images de frappe) n'est touchée qu'une fois ; elle penche, ne casse pas.
// - Les dégâts et le prix d'endurance sont ceux du calcul ; l'épée fait environ 1,5 fois les dégâts par seconde de la branche.
// - La précision : sur un grand nombre de coups simulés au bord de sa portée (écart tiré à chaque coup), la branche touche nettement
//   moins souvent que l'épée au bord de la sienne.
// - Un coup dans le vide joue tout le geste et coûte ; le poing nu contre un arbre ne lui fait rien ; épuisé, rien ne part ; les poings enchaînent le droit puis le gauche ; une
//   pierre dans une main, le poing de l'autre ; une ou deux branches ne changent rien ; branche et hachette taillent toujours.
// Usage : npm run test:combat (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('combat', async ({ page, errors, load }) => {
  await load('?dieu&reset&debug');
  const r = (await page.evaluate(async () => {
    const sleep = (t: number) => new Promise((res) => setTimeout(res, t));
    const g = (window as any).game;
    const w = () => g.scene.getScene('world');
    // chemins dans une variable : ce sont des modules de la page (servis par Vite), pas du test
    const urls = { state: '/src/state/index.ts', strike: '/src/world/strike.ts', content: '/src/content/index.ts', mass: '/src/content/mass.ts', poses: '/src/generated/combatPoses.ts' };
    const gs = await import(urls.state);
    const strike = await import(urls.strike);
    const content = await import(urls.content);
    const mass = await import(urls.mass);
    const { combatPoses } = await import(urls.poses);
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
      await sleep(100);
    };
    const settle = async () => {
      for (let i = 0; i < 200 && (w().mode !== 'play' || w().combat.busy); i++) await sleep(20);
      await sleep(60);
    };
    const stamina = () => w().player.stamina.value;
    const log = () => w().combat.log;
    const give = (item: string) => send({ kind: 'give', held: { item } });

    await send({ kind: 'map', map: 'ferme' }, 1500);
    const m = w().map;
    let spot: [number, number] | undefined;
    for (let y = 96; y < m.height - 200 && !spot; y += 8) {
      for (let x = 96; x < m.width - 200 && !spot; x += 8) if (m.areaFree({ left: x, top: y, right: x + 160, bottom: y + 160 })) spot = [x, y];
    }
    if (!spot) throw new Error('pas de coin dégagé sur la ferme');
    await standAt(spot[0] + 80, spot[1] + 50, 'down');
    await send({ kind: 'prop', prop: 'training-dummy' }, 300);
    const dummy = w().map.props.find((p: any) => p.type === 'training-dummy');
    if (!dummy) throw new Error('le mannequin ne s’est pas posé');
    const foot = strike.footprint(dummy.def.dims, dummy.baseX, dummy.baseY);
    const sil = w().combat.silhouette(dummy);
    // les pieds de Xéros à `gap` px du bord de l'emprise du mannequin, tourné vers lui
    const feetAt = (dir: string, gap: number): [number, number] =>
      ({
        right: [foot.left - gap, Math.round((foot.top + foot.bottom) / 2)],
        left: [foot.right + gap, Math.round((foot.top + foot.bottom) / 2)],
        down: [Math.round(dummy.baseX), foot.top - gap],
        up: [Math.round(dummy.baseX), foot.bottom + gap],
      })[dir] as [number, number];
    const facingDummy = (dir: string, gap: number) => standAt(...feetAt(dir, gap), dir);
    // ce que prévoit le calcul : la lame dessinée d'une image de frappe recoupe-t-elle la silhouette ?
    const weaponOf = (item: string) => (item === 'fist' ? content.combat.unarmed : content.items[item].weapon);
    const predicts = (item: string, gesture: string, hand: string, dir: string, gap: number, shift = { x: 0, y: 0 }) => {
      const [x, y] = feetAt(dir, gap);
      const feet = { x: Math.round(x), y: Math.round(y) };
      const wpn = weaponOf(item);
      if (!strike.inFront(feet, dir, foot, strike.reachCm(content.combat.rules, wpn) + 30)) return false;
      return strike.strikePath(combatPoses[gesture][dir], dir, feet, wpn, hand, shift).some((s: any) => s.blades.some((b: any) => strike.bladeHits(b, sil)));
    };
    const edgeOf = (item: string, gesture: string, hand: string, dir: string) => {
      let best = -1;
      for (let gap = 0; gap <= 60; gap++) if (predicts(item, gesture, hand, dir, gap)) best = gap;
      return best;
    };
    // un coup (Espace), seul : on laisse passer l'enchaînement d'avant
    const strikeOnce = async () => {
      await sleep(400);
      const n = log().length;
      const before = stamina();
      const t0 = performance.now();
      await press('Space');
      let tilt = 0;
      let played = false;
      for (let i = 0; i < 120 && (w().mode !== 'play' || w().combat.busy); i++) {
        played ||= w().mode === 'use' && w().player.tools.busy;
        tilt = Math.max(tilt, Math.abs(dummy.image.angle));
        await sleep(15);
      }
      const ms = performance.now() - t0;
      await settle();
      const entry = log().length > n ? log()[log().length - 1] : undefined;
      return { entry, spent: Math.round((before - stamina()) * 1000) / 1000, tilt, played, ms, hits: entry ? entry.hits.filter((h: any) => h.type === 'training-dummy').length : 0 };
    };

    await send({ kind: 'stamina-infinite', on: false });
    await send({ kind: 'stamina', value: 100 });
    const out: Record<string, any> = { weapons: {} };
    // pas d'écart pendant les mesures de fidélité : la lame passe là où elle est dessinée
    w().combat.rand = () => 0;
    for (const item of ['branch', 'wooden-sword']) {
      await give(item);
      const res: Record<string, any> = { dirs: {} };
      for (const dir of ['down', 'up', 'right', 'left']) {
        const edge = edgeOf(item, 'cut', 'right', dir);
        await facingDummy(dir, edge);
        const at = await strikeOnce();
        await send({ kind: 'stamina', value: 100 });
        await facingDummy(dir, edge + 2);
        const past = await strikeOnce();
        await send({ kind: 'stamina', value: 100 });
        res.dirs[dir] = { edge, atHits: at.hits, pastHits: past.hits, attack: at.entry?.attack, damage: at.entry?.damage, spent: at.spent, tilt: at.tilt };
      }
      const wpn = weaponOf(item);
      const kg = mass.itemMass(item);
      const cut = content.combat.attacks.cut;
      res.expect = {
        damage: strike.damage(content.combat.rules, cut, combatPoses.cut.down, wpn, kg),
        cost: Math.round(strike.attackCost(content.stamina.costs, cut, kg) * 1000) / 1000,
        cycle: strike.cycle(content.combat.rules, combatPoses.cut.down, wpn, kg),
        precision: strike.precision(content.combat.rules, wpn, kg),
      };
      // la précision : des coups simulés au bord de la portée (1 px en deçà), l'écart tiré à chaque coup
      let hits = 0;
      let tries = 0;
      for (const dir of ['down', 'up', 'right', 'left']) {
        const edge = res.dirs[dir].edge - 1;
        for (let k = 0; k < 250; k++, tries++) if (predicts(item, 'cut', 'right', dir, edge, strike.aimShift(content.combat.rules, wpn, kg))) hits++;
      }
      res.rate = hits / tries;
      out.weapons[item] = res;
    }
    w().combat.rand = Math.random;

    // un coup dans le vide : tout le geste, et son prix
    await give('wooden-sword');
    await facingDummy('left', 90);
    const air = await strikeOnce();
    const swordMs = strike.cycle(content.combat.rules, combatPoses.cut.left, weaponOf('wooden-sword'), mass.itemMass('wooden-sword'));
    out.air = { hits: air.entry?.hits.length, spent: air.spent, played: air.played, ms: Math.round(air.ms), expected: swordMs };

    // l'enchaînement à l'épée : la taille puis le coup d'en haut
    await facingDummy('right', 6);
    await sleep(400);
    let n = log().length;
    await press('Space');
    await sleep(150);
    await press('Space');
    await settle();
    out.chain = log().slice(n).map((e: any) => e.attack);

    // les poings, mains vides : le droit puis le gauche ; une pierre dans la main gauche : le poing droit seul
    gs.emptyHands(gs.game);
    w().handsChanged();
    await facingDummy('down', 2);
    await sleep(400);
    n = log().length;
    await press('Space');
    await sleep(120);
    await press('Space');
    await settle();
    out.fists = log().slice(n).map((e: any) => `${e.attack}:${e.hits.length}`);
    gs.emptyHands(gs.game);
    gs.game.hands[0] = { item: 'small-rough-stone', natural: { form: 0, size: 100 } };
    gs.game.active = 1;
    w().handsChanged();
    await sleep(400);
    n = log().length;
    await press('Space');
    await sleep(120);
    await press('Space');
    await settle();
    out.oneFist = log().slice(n).map((e: any) => e.attack);

    // le poing nu contre un arbre debout : rien (pas de dégâts, pas un coup de récolte, pas d'abattage)
    gs.emptyHands(gs.game);
    w().handsChanged();
    const tree = w().map.props.find((p: any) => p.def.harvest?.fall && p.image.visible);
    if (!tree) throw new Error('pas d’arbre debout sur la ferme');
    const treeType = tree.type;
    const treeHits = tree.hits;
    await standAt(tree.aimX, tree.aimY + 12, 'up');
    const punch = await strikeOnce();
    await sleep(300);
    out.tree = {
      attack: punch.entry?.attack,
      hits: punch.entry?.hits.length,
      same: w().map.props.includes(tree) && tree.type === treeType && tree.hits === treeHits,
    };

    // épuisé : rien ne part
    await give('wooden-sword');
    await send({ kind: 'stamina', value: 0 });
    n = log().length;
    notices.length = 0;
    await press('Space');
    await settle();
    out.exhausted = { attacks: log().length - n, notice: notices.join(' | ') };
    await send({ kind: 'stamina', value: 100 });

    // une ou deux branches : le même coup
    await give('branch');
    await facingDummy('down', 4);
    const one = await strikeOnce();
    gs.take(gs.game, { item: 'branch' }, 1);
    w().handsChanged();
    const both = [gs.game.hands[0]?.item, gs.game.hands[1]?.item];
    const two = await strikeOnce();
    const summary = (e: any) => ({ attack: e?.attack, damage: e?.damage, cost: e?.cost });
    out.twoBranches = { both, one: summary(one.entry), two: summary(two.entry) };

    // la branche dans la main active, la hachette dans l'autre : Espace taille (ou frappe dans le vide à la hachette), n'attaque pas
    await give('branch');
    gs.take(gs.game, { item: 'hatchet' }, 1);
    w().handsChanged();
    await facingDummy('left', 90);
    n = log().length;
    await press('Space');
    await settle();
    out.whittle = log().length - n;

    out.dummyLeft = w().map.props.filter((p: any) => p.type === 'training-dummy').length;
    out.dummyAngle = dummy.image.angle;
    return out;
  })) as Record<string, any>;
  console.log(JSON.stringify(r));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  for (const [item, res] of Object.entries(r.weapons) as [string, any][]) {
    for (const [dir, d] of Object.entries(res.dirs) as [string, any][]) {
      assert.ok(d.edge >= 0, `${item} ${dir} : le calcul trouve une distance où la lame touche`);
      assert.equal(d.atHits, 1, `${item} ${dir} : au bord de sa portée (${d.edge} px), le mannequin est touché, une seule fois par coup`);
      assert.equal(d.pastHits, 0, `${item} ${dir} : 2 px plus loin, il ne l'est pas`);
      assert.equal(d.attack, 'cut', `${item} ${dir} : le premier coup est la taille`);
      assert.equal(d.damage, res.expect.damage, `${item} ${dir} : les dégâts sont ceux du calcul`);
      assert.ok(Math.abs(d.spent - res.expect.cost) < 1e-3, `${item} ${dir} : l'endurance dépensée (${d.spent}) est le prix calculé (${res.expect.cost})`);
      assert.ok(d.tilt > 0, `${item} ${dir} : le mannequin penche sous le coup`);
    }
  }
  const b = r.weapons.branch;
  const s = r.weapons['wooden-sword'];
  const dps = (x: any) => x.expect.damage / x.expect.cycle;
  assert.ok(dps(s) / dps(b) > 1.3 && dps(s) / dps(b) < 1.7, `l'épée fait environ 1,5 fois les dégâts par seconde de la branche (${(dps(s) / dps(b)).toFixed(2)})`);
  assert.ok(s.expect.cost < b.expect.cost, 'l’épée coûte moins d’endurance');
  assert.ok(s.rate >= 0.85, `l'épée touche presque toujours au bord de sa portée (${(s.rate * 100).toFixed(0)} %)`);
  assert.ok(b.rate <= s.rate - 0.25, `la branche, imprécise, touche nettement moins souvent au bord de la sienne (${(b.rate * 100).toFixed(0)} % contre ${(s.rate * 100).toFixed(0)} %)`);
  assert.equal(r.air.hits, 0, 'dans le vide, rien n’est touché');
  assert.ok(r.air.played && r.air.spent > 0, 'dans le vide, le geste se joue et coûte');
  assert.ok(r.air.ms >= r.air.expected - 60, `dans le vide, tout le geste se joue (${r.air.ms} ms pour ${r.air.expected})`);
  assert.deepEqual(r.chain, ['cut', 'overhead'], 'un deuxième Espace pendant le geste enchaîne le coup d’en haut');
  assert.deepEqual(r.fists, ['jab-right:1', 'jab-left:1'], 'mains vides : le direct du droit, puis du gauche, chacun touche');
  assert.deepEqual(r.oneFist, ['jab-right', 'jab-right'], 'une pierre dans la main gauche : le poing droit seul');
  assert.equal(r.tree.attack, 'jab-right', 'mains vides devant un arbre : un coup de poing');
  assert.equal(r.tree.hits, 0, 'le poing ne touche pas l’arbre comme une cible');
  assert.ok(r.tree.same, 'l’arbre est intact : ni coup de récolte, ni abattage');
  assert.equal(r.exhausted.attacks, 0, 'épuisé, aucune attaque ne part');
  assert.match(r.exhausted.notice, /épuisé/, 'épuisé, on le dit');
  assert.deepEqual(r.twoBranches.both, ['branch', 'branch'], 'deux branches en main');
  assert.deepEqual(r.twoBranches.two, r.twoBranches.one, 'une ou deux branches : le même coup');
  assert.equal(r.whittle, 0, 'branche et hachette : Espace n’attaque pas');
  assert.equal(r.dummyLeft, 1, 'le mannequin ne casse pas');
  assert.equal(r.dummyAngle, 0, 'il revient droit');
  console.log(`  ✓ combat : zone de coup fidèle au dessin (touché au bord, manqué 2 px plus loin, une fois par coup) à la branche et à l’épée dans les quatre directions ; précision au bord : branche ${(b.rate * 100).toFixed(0)} %, épée ${(s.rate * 100).toFixed(0)} % ; vide, enchaînements, poings, épuisé`);
});
