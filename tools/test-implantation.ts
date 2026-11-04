// Test de scénario de l'implantation, dans le vrai jeu (voir tools/lib/playtest.ts), au clic : le piquet posé sans plan, lire la planchette chez la
// mère, tailler un piquet à la hachette (refus sans branche dans l'autre main), poser le rouleau de corde
// sur le billot et en couper un lien à la hachette puis à la cognée, tracer l'emprise (un piquet refusé hors des coins, un tracé gêné par un rocher), le
// chantier qui naît, un objet refusé par une place, quatre dalles portées depuis la berge jusqu'aux quatre dés, le
// piquet arraché de chaque coin, la ligne d'état, les poteaux en fantôme, puis la page rechargée : le chantier est retrouvé.
// Usage : npm run test:implantation (lancé aussi par npm run test:scenarios).

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
      const shapeUrl = '/src/world/woodShape.ts';
      const contentUrl = '/src/content/index.ts';
      const gs = await import(stateUrl);
      const mass = await import(massUrl);
      const sp = await import(planUrl);
      const shape = await import(shapeUrl);
      const content = await import(contentUrl);
      const emit = (c: unknown) => g.events.emit('dieu', c);
      const notices: string[] = [];
      g.events.on('notice', (t: string) => notices.push(t));
      const finishWork = async () => {
        const world = () => (window as any).game.scene.getScene('world');
        for (let i = 0; i < 20 && world().mode !== 'work' && world().mode !== 'rail'; i++) await new Promise((res) => requestAnimationFrame(res));
        if (world().mode === 'work' || world().mode === 'rail') (window as any).game.events.emit('dieu', { kind: 'finish-work' });
      };
      // `use` : F (l'outil ou le piquet en main) ; `hands` : E (prendre ; devant une place trop lourde, ce qui manque) ou A (poser, sur
      // une place de chantier, sur le billot) : comme un joueur qui lit les touches affichées (tools/lib/playtest.ts `__do`) ; sinon une
      // touche (E : la planchette ; A : poser)
      const press = async (code: string) => {
        if (code === 'use' || code === 'hands') {
          await (window as any).__do(code === 'use' ? ['work', 'plant', 'strike', 'punch'] : ['help-info', 'take', 'place', 'rest', 'put']);
          await (window as any).__settle();
          // un travail lancé dure son temps réel : il se finit d'un coup (?dieu « Finir le travail »), horloge, endurance et résultat compris
          if (code === 'use') await finishWork();
          return;
        }
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        await sleep(60);
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
        await (window as any).__settle();
      };
      const give = async (what: { item: string } | { prop: string }) => {
        emit({ kind: 'give', held: what });
        await (window as any).__settle();
      };
      const standAt = async (x: number, y: number, face: string) => {
        const a = w().player.actor;
        a.body.reset(Math.round(x), Math.round(y));
        a.face(face);
        await (window as any).__settle();
      };
      // Xéros regarde le point (x, y) : ses pieds 10 px au nord (il regarde vers le bas), le point visé est alors (x, y)
      const lookAt = (x: number, y: number) => standAt(x, y - 10, 'down');
      const settled = async () => {
        await (window as any).__idle('le geste fini');
      };
      const mapId = () => w().map.def.id;
      const props = (re: RegExp) => w().map.props.filter((p: any) => re.test(p.type));
      const site = () => gs.mapState(gs.game, mapId()).sites[0];
      const ground = (item: string) => gs.mapState(gs.game, mapId()).ground.filter((q: any) => q.item === item).length;
      const hands = () => JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both);
      const statusText = () => w().site.texts.map((t: any) => t.text.text);
      const wait = async (map: string) => {
        await (window as any).__restart({ kind: 'map', map });
      };
      const shot = (name: string) => (window as any).shot(name);
      const out: Record<string, unknown> = {};

      // 1. sans plan connu, un piquet ne se plante pas : c'est une ressource, F n'en fait rien, A le pose
      emit({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
      await give({ item: 'stake' });
      out.noPlanClick = JSON.stringify(w().keys?.f.kind === 'none' ? w().keys?.a.kind : 'plant');
      await press('hands');
      out.noPlanGround = ground('stake');
      for (const gr of w().map.ground.filter((q: any) => q.item.item === 'stake')) {
        gs.removeGroundItem(gs.game, mapId(), gr.item.id);
        w().map.removeGround(gr);
      }
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
      const berge = props(/^slab$/);
      out.stonesOnMap = berge.length;
      out.stoneMass = mass.propMass('slab');
      const block = find(32, 32)!;
      await standAt(block[0], block[1], 'down');
      emit({ kind: 'prop', prop: 'chopping-block' });
      await (window as any).__settle();
      // la hachette seule, face au billot : refusé, sans geste ni dépense
      emit({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
      await give({ item: 'hatchet' });
      await press('use');
      await (window as any).__settle();
      out.noBranchNotice = notices.at(-1);
      out.noBranchMode = w().mode;
      out.noBranchCost = 100 - w().player.stamina.ceiling;
      // la branche dans une main, la hachette dans l'autre : un coup, la branche devient un piquet dans la même main
      const twoHands = async (first: string, second: string) => {
        gs.emptyHands(gs.game);
        gs.take(gs.game, { item: first }, 1);
        gs.take(gs.game, { item: second }, 1);
        w().handsChanged();
        await (window as any).__settle();
      };
      await twoHands('hatchet', 'branch');
      out.beforeCut = hands();
      await press('use');
      await settled();
      out.afterCut = hands();
      out.cutCost = 100 - w().player.stamina.ceiling;
      out.blockBare = props(/^chopping-block$/).length;
      // et dans l'autre ordre : la branche dans la main droite, la hachette dans la gauche
      await twoHands('branch', 'hatchet');
      out.beforeCut2 = hands();
      await press('use');
      await settled();
      out.afterCut2 = hands();
      // deux objets en main (la branche à droite, la hachette à gauche) : A (Q en QWERTY) pose la main droite ; Maj + A, la gauche
      await twoHands('branch', 'hatchet');
      w().player.actor.face('up');
      await (window as any).__settle();
      await press('KeyQ');
      out.dropFollow = hands();
      await twoHands('branch', 'hatchet');
      await (window as any).__key('KeyQ', 0, true);
      await (window as any).__settle();
      out.dropLeft = hands();
      // la branche lâchée ôtée, Xéros de nouveau face au billot
      for (const gr of w().map.ground.filter((q: any) => q.item.item === 'branch')) {
        gs.removeGroundItem(gs.game, mapId(), gr.item.id);
        w().map.removeGround(gr);
      }
      for (const gr of w().map.ground.filter((q: any) => q.item.item === 'hatchet')) {
        gs.removeGroundItem(gs.game, mapId(), gr.item.id);
        w().map.removeGround(gr);
      }
      w().player.actor.face('down');
      await (window as any).__settle();
      // le rouleau de corde posé sur le billot (E), puis coupé à la hachette (un lien de 2 m, 0,4 point), puis à la cognée
      gs.emptyHands(gs.game);
      await give({ prop: 'rope-coil' });
      await press('hands');
      out.ropeRested = JSON.stringify({ hands: hands(), block: props(/^chopping-block-rope$/).length });
      const ropeLength = () => props(/^chopping-block-rope$/)[0]?.length;
      const ties = () => ground('rope-tie');
      emit({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
      await give({ item: 'hatchet' });
      await press('use');
      await settled();
      out.ropeHatchet = JSON.stringify({ length: ropeLength(), ties: ties(), notice: notices.at(-1) });
      out.ropeHatchetCost = 100 - w().player.stamina.ceiling;
      emit({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
      await give({ item: 'axe' });
      await press('use');
      await settled();
      out.ropeAxe = JSON.stringify({ length: ropeLength(), ties: ties(), notice: notices.at(-1) });
      out.ropeAxeCost = 100 - w().player.stamina.ceiling;

      // 4. tracer : le coin nord-ouest, un piquet refusé hors des coins, le nord-est (aimanté, repris, replanté), le sud-est
      const origin = find(61, 71, 90)!;
      const [ox, oy] = origin;
      const corner = { nw: [ox, oy], ne: [ox + 61, oy], se: [ox + 61, oy + 71], sw: [ox, oy + 71] };
      const stamina = () => w().player.stamina.ceiling;
      emit({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
      await give({ item: 'stake' });
      await lookAt(corner.nw[0], corner.nw[1]);
      await press('use');
      out.plantCost = 100 - stamina();
      out.firstSite = JSON.stringify({ stakes: site()?.stakes, x: site()?.x, y: site()?.y, born: site()?.born });
      out.firstHands = hands();
      await give({ item: 'stake' });
      await lookAt(ox + 30, oy + 10);
      await press('use');
      out.farNotice = notices.at(-1);
      out.farStakes = [...site().stakes];
      out.farHands = hands();
      await lookAt(corner.ne[0] + 3, corner.ne[1] - 2);
      await press('use');
      out.neStakes = [...site().stakes];
      await shot('2-trace');
      await press('hands');
      out.neTaken = JSON.stringify({ stakes: site().stakes, hands: hands() });
      await press('use');
      out.neAgain = [...site().stakes];
      // le piquet dans la main droite, une branche dans la gauche : le clic gauche le plante, la branche reste dans la gauche
      gs.emptyHands(gs.game);
      gs.take(gs.game, { item: 'stake' }, 1);
      gs.take(gs.game, { item: 'branch' }, 1);
      w().handsChanged();
      await lookAt(corner.se[0], corner.se[1]);
      await press('use');
      out.seStakes = [...site().stakes];
      out.plantFollow = hands();
      gs.emptyHands(gs.game);
      w().handsChanged();

      // 5. une emprise gênée : le dernier piquet est refusé et reste en main ; dégagée, le chantier naît
      const rock = gs.spawnObject(gs.game, mapId(), 'rock', ox + 25, oy + 40, false);
      const placedRock = w().map.placeProp(rock, { spawned: true });
      await give({ item: 'stake' });
      await lookAt(corner.sw[0], corner.sw[1]);
      await press('use');
      out.blockedNotice = notices.at(-1);
      out.blockedState = JSON.stringify({ stakes: site().stakes.length, born: site().born, hands: hands() });
      w().map.removeProp(placedRock);
      gs.changeSpawned(gs.game, mapId(), rock.id, { x: 0, y: 0 });
      await press('use');
      out.born = JSON.stringify({ stakes: site().stakes.length, born: site().born, hands: hands() });
      out.statusStart = statusText();
      await shot('3-chantier');
      // les places de l'étape en cours se voient en fantôme : quatre dés
      const ghostKeys = () => w().site.ghosts.images.filter((i: any) => i.visible).map((i: any) => i.texture.key).sort();
      out.ghostsDice = ghostKeys();

      // 6. les dés : un objet qui n'est pas une dalle (une branche) est refusé ; quatre pierres de la berge, portées une à une
      const plan = content.plans.woodshed;
      const places = Object.entries(plan.steps[0].places) as [string, any][];
      const aimOf = (id: string) => sp.placeGround(site(), plan.steps[0].places[id]);
      await give({ item: 'branch' });
      const nwAim = aimOf('footing-nw');
      await lookAt(nwAim.x, nwAim.y);
      await press('hands');
      out.wrongNotice = notices.at(-1);
      out.wrongPlaced = Object.keys(site().placed).length;
      // la branche ôtée des mains, puis quatre pierres de la berge
      gs.emptyHands(gs.game);
      w().handsChanged();
      emit({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
      const dice: unknown[] = [];
      for (const [i, [id, place]] of places.entries()) {
        const stone = props(/^slab$/)[0];
        await standAt(stone.baseX, stone.y + 4, 'up');
        await press('hands');
        const carried = hands();
        const g2 = sp.placeGround(site(), place);
        await lookAt(g2.x, g2.y);
        await press('hands');
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
      out.upKeys = [300, 180].map((length) => shape.woodKey({ size: 'normal', length, shape: 'round', hewn: 12, axis: 'up' }));
      await shot('5-quatre-des');
      // les poteaux sont ouverts ; le poteau haut ne se porte pas : le clic devant sa place dit ce qu'il faut (une poutre au pied du dé), un piquet en main ou non
      await give({ item: 'stake' });
      const post = sp.placeGround(site(), plan.steps[1].places['post-nw']);
      await lookAt(post.x, post.y);
      await press('hands');
      out.postNotice = notices.at(-1);
      out.postPlaced = Object.keys(site().placed).length;
      await (window as any).__settle();
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
  assert.equal(r.noPlanClick, '"put"', 'sans plan connu, F ne plante pas le piquet, A le pose');
  assert.equal(r.noPlanSites, 0, 'sans plan, aucun chantier');
  assert.equal(r.noPlanGround, 1, 'le piquet est posé au sol');
  assert.equal(r.noPlanHands, '[null,null]null', 'il a quitté la main');
  assert.equal(r.tablet, true, 'la planchette est chez la mère');
  assert.equal(r.learned, "Xéros connaît maintenant le plan de l'abri à bois.");
  assert.deepEqual(r.known, ['woodshed'], 'le plan est connu');
  assert.equal(r.alreadyKnown, 'Xéros connaît déjà ce plan.');
  assert.equal(r.tabletStays, 1, 'la planchette reste en place');
  assert.ok(r.stonesOnMap >= 6, `six dalles sur la berge : ${r.stonesOnMap}`);
  assert.ok(Math.abs(r.stoneMass - 38.88) < 0.2, `masse de la dalle à sa taille type (45 × 40 × 12 cm, 75 % de calcaire à 2 400 kg/m³) : ${r.stoneMass}`);
  assert.equal(r.noBranchNotice, "Tiens la branche ou le piquet debout sur le billot, de l'autre main.", 'sans branche dans l\'autre main : refusé');
  assert.equal(r.noBranchMode, 'play', 'refus sans geste');
  assert.equal(r.noBranchCost, 0, 'un refus ne coûte rien');
  assert.equal(r.beforeCut, '[{"item":"branch"},{"item":"hatchet"}]null');
  assert.equal(r.afterCut, '[{"item":"stake"},{"item":"hatchet"}]null', 'la branche devient un piquet, dans la même main');
  assert.ok(r.cutCost > 0.1 && r.cutCost < 0.6, `tailler se paie coup par coup, une fraction de point : ${r.cutCost}`);
  assert.equal(r.blockBare, 1, 'le billot ne change pas');
  assert.equal(r.afterCut2, '[{"item":"hatchet"},{"item":"stake"}]null', 'dans l\'autre ordre aussi : le piquet reste dans la main de la branche');
  assert.equal(r.dropFollow, '[{"item":"hatchet"},null]null', 'A pose ce que tient la main droite (la branche)');
  assert.equal(r.dropLeft, '[null,{"item":"branch"}]null', 'Maj + A pose ce que tient la main gauche (la hachette)');
  assert.equal(r.ropeRested, JSON.stringify({ hands: '[null,null]null', block: 1 }), 'le clic pose le rouleau sur le billot');
  assert.equal(r.ropeHatchet, JSON.stringify({ length: 800, ties: 1, notice: 'Rouleau de corde : 8 m restants.' }), 'la hachette coupe un lien de 2 m');
  assert.ok(Math.abs(r.ropeHatchetCost - 0.4) < 1e-6, `un coup de hachette coûte 0,4 : ${r.ropeHatchetCost}`);
  assert.equal(r.ropeAxe, JSON.stringify({ length: 600, ties: 2, notice: 'Rouleau de corde : 6 m restants.' }), 'la cognée aussi');
  assert.ok(Math.abs(r.ropeAxeCost - 0.5) < 1e-6, `un coup de cognée sur la corde coûte 0,5 : ${r.ropeAxeCost}`);
  assert.ok(Math.abs(r.plantCost - 0.5) < 1e-6, `planter un piquet coûte 0,5 : ${r.plantCost}`);
  assert.equal(r.firstSite, JSON.stringify({ stakes: ['nw'], x: JSON.parse(r.firstSite).x, y: JSON.parse(r.firstSite).y, born: false }), 'le premier piquet fixe le coin nord-ouest');
  assert.equal(r.firstHands, '[null,null]null');
  assert.equal(r.farNotice, 'Les piquets se plantent aux coins du tracé.', 'hors des coins : refusé');
  assert.deepEqual(r.farStakes, ['nw'], 'rien de planté hors des coins');
  assert.equal(r.farHands, '[null,{"item":"stake"}]null', 'le piquet refusé reste en main');
  assert.deepEqual(r.neStakes, ['nw', 'ne'], 'près d’un coin, le piquet s’aimante');
  assert.equal(JSON.parse(r.neTaken).hands, '[null,{"item":"stake"}]null', 'le clic d’une main vide reprend un piquet du tracé');
  assert.deepEqual(JSON.parse(r.neTaken).stakes, ['nw'], 'le coin est libre à nouveau');
  assert.deepEqual(r.neAgain, ['nw', 'ne'], 'et se replante');
  assert.deepEqual(r.seStakes, ['nw', 'ne', 'se']);
  assert.equal(r.plantFollow, '[{"item":"branch"},null]null', 'le piquet planté, la branche reste dans l’autre main');
  assert.equal(r.blockedNotice, 'Il y a quelque chose dans le passage.', 'une emprise gênée refuse le dernier piquet');
  assert.equal(r.blockedState, JSON.stringify({ stakes: 3, born: false, hands: '[null,{"item":"stake"}]null' }), 'le 4e piquet reste en main');
  assert.equal(r.born, JSON.stringify({ stakes: 4, born: true, hands: '[null,null]null' }), 'dégagée, le chantier naît');
  assert.deepEqual(r.statusStart, ['Abri à bois : dés, 0 sur 4']);
  assert.deepEqual(r.ghostsDice, ['footing-stone', 'footing-stone', 'footing-stone', 'footing-stone'], 'les quatre dés en fantôme');
  assert.equal(r.wrongNotice, 'Il faut une dalle.', 'un autre objet est refusé');
  assert.equal(r.wrongPlaced, 0);
  for (const [i, d] of (r.dice as any[]).entries()) {
    assert.match(d.carried, /^\[null,null\]\{"prop":"slab","natural":\{"form":[01],"size":\d+\}\}$/, `pierre ${i + 1} portée à deux mains, avec sa forme et sa taille`);
    assert.equal(d.after, '[null,null]null', `pierre ${i + 1} posée : les mains sont libres`);
    assert.equal(d.placed, i + 1);
    assert.equal(d.footings, i + 1, 'un dé de plus sur la carte');
    assert.equal(d.stakes.length, 3 - i, 'le piquet de ce coin est arraché');
    assert.ok(d.fallen >= i + 1, `et retombe au sol, réutilisable : ${d.fallen}`);
  }
  assert.equal(r.statusHalf, 'Abri à bois : dés, 2 sur 4');
  assert.equal(r.statusDone, 'Abri à bois : poteaux, 0 sur 4');
  assert.deepEqual(r.ghostsPosts, [r.upKeys[0], r.upKeys[0], r.upKeys[1], r.upKeys[1]].sort(), 'les poteaux en fantôme : la pièce de bois debout attendue (poutre de 3 m au nord, de 1,80 m au sud)');
  assert.equal(r.postNotice, "Il faut d'abord une poutre de 3 m au pied du dé.", 'le poteau haut demande de l’aide : une poutre au pied du dé');
  assert.equal(r.postPlaced, 4);

  // 7. la page rechargée : le chantier est retrouvé (plan, pièces posées, ligne d'état)
  await load('?dieu');
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
