// Test de scénario de l'implantation, dans le vrai jeu (voir tools/lib/playtest.ts) : refus sans plan, lire la planchette chez la
// mère, tailler un piquet sur le billot, tracer l'emprise (un piquet refusé hors des coins, un tracé gêné par un rocher), le
// chantier qui naît, un objet refusé par une place, quatre pierres plates portées depuis la berge jusqu'aux quatre dés, le
// piquet arraché de chaque coin, la ligne d'état, les poteaux en fantôme, puis la page rechargée : le chantier est retrouvé.
// Usage : npm run test:implantation (lancé aussi par npm run test).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('implantation', async ({ page, errors, load }) => {
  // IMPLANTATION_SHOTS=1 : des captures du jeu aux moments clés, dans .art-preview/implantation-<nom>.png (à regarder)
  const shots = !!process.env.IMPLANTATION_SHOTS;
  await page.exposeFunction('shot', async (name: string) => {
    if (shots) await page.screenshot({ path: `.art-preview/implantation-${name}.png` });
  });
  const scenario = async () => {
    return page.evaluate(async () => {
      const sleep = (t: number) => new Promise((r) => setTimeout(r, t));
      const g = (window as any).game;
      const w = () => g.scene.getScene('world');
      // chemins dans une variable : ce sont des modules de la page (servis par Vite), pas du test
      const stateUrl = '/src/state/index.ts';
      const massUrl = '/src/content/mass.ts';
      const planUrl = '/src/world/sitePlan.ts';
      const contentUrl = '/src/content/index.ts';
      const gs = await import(stateUrl);
      const mass = await import(massUrl);
      const sp = await import(planUrl);
      const content = await import(contentUrl);
      const emit = (c: unknown) => g.events.emit('dieu', c);
      const notices: string[] = [];
      g.events.on('notice', (t: string) => notices.push(t));
      const press = async (code: string) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        await sleep(60);
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
        await sleep(120);
      };
      const give = async (what: { item: string } | { prop: string }) => {
        emit({ kind: 'give', held: what });
        await sleep(120);
      };
      const standAt = async (x: number, y: number, face: string) => {
        const a = w().player.actor;
        a.body.reset(Math.round(x), Math.round(y));
        a.face(face);
        await sleep(180);
      };
      // Xéros regarde le point (x, y) : ses pieds 10 px au nord (il regarde vers le bas), le point visé est alors (x, y)
      const lookAt = (x: number, y: number) => standAt(x, y - 10, 'down');
      const settled = async () => {
        for (let i = 0; i < 100 && w().mode !== 'play'; i++) await sleep(50);
        await sleep(500);
      };
      const mapId = () => w().map.def.id;
      const props = (re: RegExp) => w().map.props.filter((p: any) => re.test(p.type));
      const site = () => gs.mapState(gs.game, mapId()).sites[0];
      const ground = (item: string) => gs.mapState(gs.game, mapId()).ground.filter((q: any) => q.item === item).length;
      const hands = () => JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both);
      const statusText = () => w().site.texts.map((t: any) => t.text.text);
      const wait = async (map: string) => {
        emit({ kind: 'map', map });
        await sleep(2200);
      };
      const shot = (name: string) => (window as any).shot(name);
      const out: Record<string, unknown> = {};

      // 1. sans plan connu, un piquet ne se plante pas
      emit({ kind: 'stamina', value: 100 });
      await give({ item: 'stake' });
      await press('Space');
      out.noPlanNotice = notices.at(-1);
      out.noPlanSites = gs.mapState(gs.game, mapId()).sites.length;
      out.noPlanHands = hands();

      // 2. la planchette de la mère : E, le plan est appris, la planchette reste en place
      const tablet = props(/^plan-tablet$/)[0];
      out.tablet = !!tablet;
      await standAt(tablet.baseX, tablet.y + 6, 'up');
      await press('KeyE');
      await shot('1-planchette');
      out.learned = notices.at(-1);
      out.known = [...gs.game.knownPlans];
      await press('KeyE');
      out.alreadyKnown = notices.at(-1);
      out.tabletStays = props(/^plan-tablet$/).length;

      // 3. à la ferme : un coin dégagé pour le billot, puis pour le tracé
      await wait('ferme');
      const free = (l: number, t: number, r: number, b: number) => w().map.areaFree({ left: l, top: t, right: r, bottom: b });
      const find = (width: number, height: number, from = 0) => {
        const m = w().map;
        for (let y = 64 + from; y < m.height - height - 64; y += 8) {
          for (let x = 64; x < m.width - width - 64; x += 8) if (free(x - 24, y - 24, x + width + 24, y + height + 24)) return [x, y];
        }
        return undefined;
      };
      const berge = props(/^flat-stone$/);
      out.stonesOnMap = berge.length;
      out.stoneMass = mass.propMass('flat-stone');
      const block = find(32, 32)!;
      await standAt(block[0], block[1], 'down');
      emit({ kind: 'prop', prop: 'chopping-block' });
      await sleep(250);
      // la branche se pose sur le billot, se reprend, se repose
      await give({ item: 'branch' });
      await press('KeyE');
      out.rested = props(/^chopping-block-branch$/).length;
      out.restedHands = hands();
      await press('KeyE');
      out.unloadedHands = hands();
      await press('KeyE');
      out.restedAgain = props(/^chopping-block-branch$/).length;
      // un coup de hache taille le piquet : il tombe au sol, le billot redevient nu
      await give({ item: 'axe' });
      emit({ kind: 'stamina', value: 100 });
      await sleep(100);
      await press('Space');
      await settled();
      out.cutCost = 100 - w().player.stamina.value;
      out.stakesOnGround = ground('stake');
      out.blockBare = props(/^chopping-block$/).length;
      out.blockBranch = props(/^chopping-block-branch$/).length;

      // 4. tracer : le coin nord-ouest, un piquet refusé hors des coins, le nord-est (aimanté, repris, replanté), le sud-est
      const origin = find(61, 71, 90)!;
      const [ox, oy] = origin;
      const corner = { nw: [ox, oy], ne: [ox + 61, oy], se: [ox + 61, oy + 71], sw: [ox, oy + 71] };
      const stamina = () => w().player.stamina.value;
      emit({ kind: 'stamina', value: 100 });
      await give({ item: 'stake' });
      await lookAt(corner.nw[0], corner.nw[1]);
      await press('Space');
      out.plantCost = 100 - stamina();
      out.firstSite = JSON.stringify({ stakes: site()?.stakes, x: site()?.x, y: site()?.y, born: site()?.born });
      out.firstHands = hands();
      await give({ item: 'stake' });
      await lookAt(ox + 30, oy + 10);
      await press('Space');
      out.farNotice = notices.at(-1);
      out.farStakes = [...site().stakes];
      out.farHands = hands();
      await lookAt(corner.ne[0] + 3, corner.ne[1] - 2);
      await press('Space');
      out.neStakes = [...site().stakes];
      await shot('2-trace');
      await press('KeyE');
      out.neTaken = JSON.stringify({ stakes: site().stakes, hands: hands() });
      await press('Space');
      out.neAgain = [...site().stakes];
      await give({ item: 'stake' });
      await lookAt(corner.se[0], corner.se[1]);
      await press('Space');
      out.seStakes = [...site().stakes];

      // 5. une emprise gênée : le dernier piquet est refusé et reste en main ; dégagée, le chantier naît
      const rock = gs.spawnObject(gs.game, mapId(), 'rock', ox + 25, oy + 40, false);
      const placedRock = w().map.placeProp(rock, { spawned: true });
      await give({ item: 'stake' });
      await lookAt(corner.sw[0], corner.sw[1]);
      await press('Space');
      out.blockedNotice = notices.at(-1);
      out.blockedState = JSON.stringify({ stakes: site().stakes.length, born: site().born, hands: hands() });
      w().map.removeProp(placedRock);
      gs.changeSpawned(gs.game, mapId(), rock.id, { x: 0, y: 0 });
      await press('Space');
      out.born = JSON.stringify({ stakes: site().stakes.length, born: site().born, hands: hands() });
      out.statusStart = statusText();
      await shot('3-chantier');
      // les places de l'étape en cours se voient en fantôme : quatre dés
      const ghostKeys = () => w().site.ghosts.images.filter((i: any) => i.visible).map((i: any) => i.texture.key).sort();
      out.ghostsDice = ghostKeys();

      // 6. les dés : un objet qui n'est pas une pierre plate est refusé ; quatre pierres de la berge, portées une à une
      const plan = content.plans.woodshed;
      const places = Object.entries(plan.steps[0].places) as [string, any][];
      const aimOf = (id: string) => sp.placeGround(site(), plan.steps[0].places[id]);
      await give({ item: 'axe' });
      const nwAim = aimOf('footing-nw');
      await lookAt(nwAim.x, nwAim.y);
      await press('KeyE');
      out.wrongNotice = notices.at(-1);
      out.wrongPlaced = Object.keys(site().placed).length;
      // la hache lâchée (sinon E la reposerait au lieu de prendre une pierre), puis quatre pierres de la berge
      gs.emptyHands(gs.game);
      w().handsChanged();
      emit({ kind: 'stamina', value: 100 });
      const dice: unknown[] = [];
      for (const [i, [id, place]] of places.entries()) {
        const stone = props(/^flat-stone$/)[0];
        await standAt(stone.baseX, stone.y + 4, 'up');
        await press('KeyE');
        const carried = hands();
        const g2 = sp.placeGround(site(), place);
        await lookAt(g2.x, g2.y);
        await press('KeyE');
        dice.push({
          id,
          carried,
          after: hands(),
          placed: Object.keys(site().placed).length,
          footings: props(/^footing-stone$/).length,
          stakes: [...site().stakes],
          fallen: ground('stake'),
          status: statusText()[0],
        });
        if (i === 1) {
          out.statusHalf = statusText()[0];
          await shot('4-deux-des');
        }
      }
      out.dice = dice;
      out.statusDone = statusText()[0];
      out.ghostsPosts = ghostKeys();
      await shot('5-quatre-des');
      // les poteaux se voient mais ne se remplissent pas encore
      await give({ item: 'stake' });
      const post = sp.placeGround(site(), plan.steps[1].places['post-nw']);
      await lookAt(post.x, post.y);
      await press('KeyE');
      out.soonNotice = notices.at(-1);
      out.soonPlaced = Object.keys(site().placed).length;
      await sleep(400);
      out.stateKept = JSON.stringify(site());
      return out;
    });
  };
  const result = await scenario().catch(async (e: Error) => {
    if (!/context was destroyed|navigation/.test(e.message)) throw e;
    await load();
    return scenario();
  });

  console.log(JSON.stringify(result));
  const r = result as Record<string, any>;
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(r.noPlanNotice, 'Xéros ne sait pas encore quoi tracer.', 'sans plan connu : refusé, avec ce message');
  assert.equal(r.noPlanSites, 0, 'sans plan, aucun chantier');
  assert.equal(r.noPlanHands, '[null,{"item":"stake"}]null', 'le piquet reste en main');
  assert.equal(r.tablet, true, 'la planchette est chez la mère');
  assert.equal(r.learned, "Xéros connaît maintenant le plan de l'abri à bois.");
  assert.deepEqual(r.known, ['woodshed'], 'le plan est connu');
  assert.equal(r.alreadyKnown, 'Xéros connaît déjà ce plan.');
  assert.equal(r.tabletStays, 1, 'la planchette reste en place');
  assert.ok(r.stonesOnMap >= 6, `six pierres plates sur la berge : ${r.stonesOnMap}`);
  assert.ok(Math.abs(r.stoneMass - 35.1) < 0.2, `masse de la pierre plate : ${r.stoneMass}`);
  assert.equal(r.rested, 1, 'la branche est posée sur le billot');
  assert.equal(r.restedHands, '[null,null]null', 'la main est libre');
  assert.equal(r.unloadedHands, '[null,{"item":"branch"}]null', 'E reprend la branche');
  assert.equal(r.restedAgain, 1, 'et la repose');
  assert.ok(Math.abs(r.cutCost - 0.8) < 1e-6, `un coup de hache coûte 0,8 : ${r.cutCost}`);
  assert.equal(r.stakesOnGround, 1, 'le piquet tombe au sol');
  assert.equal(r.blockBare, 1, 'le billot redevient nu');
  assert.equal(r.blockBranch, 0, 'plus de branche dessus');
  assert.ok(Math.abs(r.plantCost - 0.5) < 1e-6, `planter un piquet coûte 0,5 : ${r.plantCost}`);
  assert.equal(r.firstSite, JSON.stringify({ stakes: ['nw'], x: JSON.parse(r.firstSite).x, y: JSON.parse(r.firstSite).y, born: false }), 'le premier piquet fixe le coin nord-ouest');
  assert.equal(r.firstHands, '[null,null]null');
  assert.equal(r.farNotice, 'Les piquets se plantent aux coins du tracé.', 'hors des coins : refusé');
  assert.deepEqual(r.farStakes, ['nw'], 'rien de planté hors des coins');
  assert.equal(r.farHands, '[null,{"item":"stake"}]null', 'le piquet refusé reste en main');
  assert.deepEqual(r.neStakes, ['nw', 'ne'], 'près d’un coin, le piquet s’aimante');
  assert.equal(JSON.parse(r.neTaken).hands, '[null,{"item":"stake"}]null', 'E reprend un piquet du tracé');
  assert.deepEqual(JSON.parse(r.neTaken).stakes, ['nw'], 'le coin est libre à nouveau');
  assert.deepEqual(r.neAgain, ['nw', 'ne'], 'et se replante');
  assert.deepEqual(r.seStakes, ['nw', 'ne', 'se']);
  assert.equal(r.blockedNotice, 'Il y a quelque chose dans le passage.', 'une emprise gênée refuse le dernier piquet');
  assert.equal(r.blockedState, JSON.stringify({ stakes: 3, born: false, hands: '[null,{"item":"stake"}]null' }), 'le 4e piquet reste en main');
  assert.equal(r.born, JSON.stringify({ stakes: 4, born: true, hands: '[null,null]null' }), 'dégagée, le chantier naît');
  assert.deepEqual(r.statusStart, ['Abri à bois : dés, 0 sur 4']);
  assert.deepEqual(r.ghostsDice, ['footing-stone', 'footing-stone', 'footing-stone', 'footing-stone'], 'les quatre dés en fantôme');
  assert.equal(r.wrongNotice, 'Il faut une pierre plate.', 'un autre objet est refusé');
  assert.equal(r.wrongPlaced, 0);
  for (const [i, d] of (r.dice as any[]).entries()) {
    assert.equal(d.carried, '[null,null]{"prop":"flat-stone"}', `pierre ${i + 1} portée à deux mains`);
    assert.equal(d.after, '[null,null]null', `pierre ${i + 1} posée : les mains sont libres`);
    assert.equal(d.placed, i + 1);
    assert.equal(d.footings, i + 1, 'un dé de plus sur la carte');
    assert.equal(d.stakes.length, 3 - i, 'le piquet de ce coin est arraché');
    assert.ok(d.fallen >= i + 2, `et retombe au sol, réutilisable : ${d.fallen}`);
  }
  assert.equal(r.statusHalf, 'Abri à bois : dés, 2 sur 4');
  assert.equal(r.statusDone, 'Abri à bois : poteaux, 0 sur 4');
  assert.deepEqual(r.ghostsPosts, ['shed-post-high', 'shed-post-high', 'shed-post-low', 'shed-post-low'], 'les poteaux en fantôme');
  assert.equal(r.soonNotice, 'Cette étape viendra plus tard.', 'les poteaux ne se remplissent pas encore');
  assert.equal(r.soonPlaced, 4);

  // 7. la page rechargée : le chantier est retrouvé (plan, pièces posées, ligne d'état)
  await page.reload();
  await page.waitForFunction(() => !!(window as any).game?.scene.getScene('world')?.player, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const after = await page.evaluate(async () => {
    const stateUrl = '/src/state/index.ts';
    const gs = await import(stateUrl);
    const w = (window as any).game.scene.getScene('world');
    const sites = gs.mapState(gs.game, w.map.def.id).sites;
    return {
      map: w.map.def.id,
      known: [...gs.game.knownPlans],
      sites: sites.length,
      placed: Object.keys(sites[0].placed).length,
      born: sites[0].born,
      footings: w.map.props.filter((p: any) => p.type === 'footing-stone').length,
      status: w.site.texts.map((t: any) => t.text.text),
    };
  });
  console.log(JSON.stringify(after));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(after.map, 'ferme');
  assert.deepEqual(after.known, ['woodshed'], 'le plan est toujours connu');
  assert.equal(after.sites, 1, 'le chantier est retrouvé');
  assert.equal(after.born, true);
  assert.equal(after.placed, 4, 'ses quatre dés');
  assert.equal(after.footings, 4, 'sont à leur place sur la carte');
  assert.deepEqual(after.status, ['Abri à bois : poteaux, 0 sur 4']);
  console.log('  ✓ implantation : de la planchette aux quatre dés, et le chantier retrouvé après rechargement');
});
