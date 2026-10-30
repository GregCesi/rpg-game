// Test de scénario du fendage, dans le vrai jeu : un Chromium sans écran pilote le jeu servi par Vite, avec de vrais
// appuis de touches (Espace, R), comme le joueur. De la grosse bille posée par ?dieu jusqu'aux quatre quartiers :
// refus (hache, masse sans coin), planter le coin, trois coups de masse, demi-billes, coin lâché, quartiers, masses,
// endurance, coups gardés dans GameState, quartier tourné et tas de quartiers.
// Usage : npm run test:fendage (lancé aussi par npm run test). Le Chromium et le serveur : tools/lib/playtest.ts.

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('fendage', async ({ page, errors, load }) => {
  // Tout ce qui suit s'exécute dans la page : les touches sont de vrais KeyboardEvent sur window, lus par leur place.
  // Vite recharge parfois la page au premier lancement (dépendances optimisées) : le scénario est alors rejoué une fois
  const scenario = async () => {
    return page.evaluate(async () => {
    const sleep = (t: number) => new Promise((r) => setTimeout(r, t));
    const g = (window as any).game;
    const w = () => g.scene.getScene('world');
    // chemins dans une variable : ce sont des modules de la page (servis par Vite), pas du test
    const stateUrl = '/src/state/index.ts';
    const massUrl = '/src/content/mass.ts';
    const gs = await import(stateUrl);
    const mass = await import(massUrl);
    const emit = (c: unknown) => g.events.emit('dieu', c);
    const notices: string[] = [];
    g.events.on('notice', (t: string) => notices.push(t));
    const press = async (code: string) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    };
    // le geste fini, et la fente ouverte un instant avant que les morceaux paraissent
    const settled = async () => {
      for (let i = 0; i < 100 && w().mode !== 'play'; i++) await sleep(50);
      await sleep(600);
    };
    const props = (re: RegExp) => w().map.props.filter((p: any) => re.test(p.type));
    const spawned = () => gs.mapState(gs.game, w().map.def.id).spawned;
    // Xéros à un bout du morceau, tourné vers sa face coupée, collé à sa collision : le coin et la masse s'y donnent
    const standAt = async (p: any, end: string) => {
      const a = w().player.actor;
      const cx = Math.round((p.box.left + p.box.right) / 2);
      const cy = Math.round((p.box.top + p.box.bottom) / 2);
      const spots: Record<string, [number, number, string]> = {
        west: [Math.round(p.box.left - 7), cy + 3, 'right'],
        east: [Math.round(p.box.right + 7), cy + 3, 'left'],
        north: [cx, Math.round(p.box.top - 4), 'down'],
        south: [cx, Math.round(p.box.bottom + 11), 'up'],
      };
      const [x, y, face] = spots[end];
      a.body.reset(x, y);
      a.face(face);
      await sleep(150);
    };
    const stand = (p: any) => standAt(p, 'west');
    // Xéros au nord du morceau, tourné vers son flanc
    const standFlank = async (p: any) => {
      const a = w().player.actor;
      a.body.reset(Math.round((p.box.left + p.box.right) / 2), Math.round(p.box.top - 4));
      a.face('down');
      await sleep(150);
    };
    const give = async (item: string) => {
      emit({ kind: 'give', held: { item } });
      await sleep(120);
    };
    const out: Record<string, unknown> = {};

    emit({ kind: 'stamina', value: 100 });
    // une grosse bille posée devant Xéros, comme avec ?dieu
    emit({ kind: 'prop', prop: 'big-felled-log-2' });
    await sleep(200);
    await stand(props(/^big-felled-log-2$/).at(-1));

    // 1. refus : la hache, puis la masse sans coin ; ni geste ni dépense
    await give('axe');
    await press('Space');
    await sleep(300);
    out.axeNotice = notices.at(-1);
    out.axeMode = w().mode;
    await give('maul');
    await press('Space');
    await sleep(300);
    out.maulNotice = notices.at(-1);
    out.refusedCost = 100 - w().player.stamina.value;

    // 2. depuis le flanc, le coin ne se plante pas (la bille reste) ; depuis le bout, face à la coupe, si
    await give('splitting-wedge');
    await standFlank(props(/^big-felled-log-2$/).at(-1));
    await press('Space');
    await sleep(300);
    out.flankNotice = notices.at(-1);
    out.flankPlanted = props(/wedged/).length;
    out.flankHands = JSON.stringify(gs.game.hands);
    await stand(props(/^big-felled-log-2$/).at(-1));
    await press('Space');
    await sleep(300);
    out.planted = props(/wedged/).map((p: any) => p.type);
    out.handsAfterPlant = JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both);
    out.plantCost = 100 - w().player.stamina.value;

    // 3. trois coups de masse ; le premier est noté dans GameState
    await give('maul');
    const hitCosts: number[] = [];
    for (let i = 1; i <= 3; i++) {
      await stand(props(/^big-wedged-log$/)[0]);
      const s = w().player.stamina.value;
      await press('Space');
      await settled();
      hitCosts.push(s - w().player.stamina.value);
      if (i === 1) out.hitsKept = spawned().find((q: any) => q.type === 'big-wedged-log')?.hits;
    }
    out.hitCosts = hitCosts;
    out.halves = props(/^big-half-log$/).length;
    out.wedgeOnGround = gs.mapState(gs.game, w().map.def.id).ground.filter((q: any) => q.item === 'splitting-wedge').length;
    out.halfMass = mass.propMass('big-half-log');

    // 4. chaque moitié : le coin, puis trois coups de masse
    for (let k = 0; k < 2; k++) {
      await give('splitting-wedge');
      await stand(props(/^big-half-log$/)[0]);
      await press('Space');
      await sleep(300);
      await give('maul');
      for (let i = 0; i < 3; i++) {
        await stand(props(/^big-wedged-half-log$/)[0]);
        await press('Space');
        await settled();
      }
    }
    out.quarters = props(/^big-quarter-log$/).length;
    out.quarterMass = mass.propMass('big-quarter-log');
    out.stamina = w().player.stamina.value;
    out.noRoom = notices.filter((n) => /Pas la place/.test(n));

    // 4 bis. le coin se plante depuis chacun des quatre bouts : la bille qui en naît est celle de ce bout, les coups
    // ne se donnent que depuis lui (depuis l'autre bout : le message), et trois coups fendent en deux demi-billes
    const ENDS = [
      ['big-felled-log-2', 'west', 'big-wedged-log', 'east'],
      ['big-felled-log-2', 'east', 'big-wedged-log-east', 'west'],
      ['big-felled-log-ns', 'south', 'big-wedged-log-ns', 'north'],
      ['big-felled-log-ns', 'north', 'big-wedged-log-ns-north', 'south'],
    ];
    const ends: unknown[] = [];
    for (const [logType, end, want, other] of ENDS) {
      emit({ kind: 'reset-map' });
      await sleep(1700);
      emit({ kind: 'stamina', value: 100 });
      emit({ kind: 'prop', prop: logType });
      await sleep(200);
      await give('splitting-wedge');
      await standAt(props(new RegExp(`^${logType}$`)).at(-1), end);
      await press('Space');
      await sleep(300);
      const planted = props(/wedged/).map((p: any) => p.type);
      await give('maul');
      await standAt(props(/wedged/)[0], other);
      notices.length = 0;
      await press('Space');
      await sleep(300);
      const wrongNotice = notices.at(-1);
      const hitsWrong = spawned().find((o: any) => /wedged/.test(o.type))?.hits;
      for (let i = 0; i < 3; i++) {
        await standAt(props(/wedged/)[0], end);
        await press('Space');
        await settled();
      }
      ends.push({ end, want, planted, wrongNotice, hitsWrong, halves: props(/half-log/).length });
    }
    out.ends = ends;

    // 5. un quartier tenu se tourne (R) et s'empile : un tas plein de six (dehors, à la ferme : de la place devant Xéros)
    emit({ kind: 'map', map: 'ferme' });
    await sleep(2200);
    // un coin dégagé de la carte, où le tas tient tout entier devant Xéros
    {
      const m = w().map;
      let spot: number[] | undefined;
      for (let y = 80; y < m.height - 80 && !spot; y += 16) {
        for (let x = 80; x < m.width - 80 && !spot; x += 16) if (m.areaFree({ left: x - 40, right: x + 40, top: y - 40, bottom: y + 40 })) spot = [x, y];
      }
      w().player.actor.body.reset(spot![0], spot![1]);
      w().player.actor.face('down');
      await sleep(150);
    }
    emit({ kind: 'give', held: { prop: 'big-quarter-log' } });
    await sleep(150);
    await press('KeyR');
    await sleep(150);
    out.turned = JSON.stringify(gs.game.both);
    emit({ kind: 'pile', pile: 'big-quarters', count: 6, turned: false, tie: false });
    await sleep(300);
    out.pile = gs.mapState(gs.game, w().map.def.id).piles.map((p: any) => `${p.pile}:${p.places.length}`);
    out.pileNotices = notices.slice(-3);
    out.at = [Math.round(w().player.actor.x), Math.round(w().player.actor.y), w().map.def.id];
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
  assert.equal(r.axeNotice, 'Trop grosse pour la hache. Il faut le coin et la masse.', 'la hache est refusée');
  assert.equal(r.axeMode, 'play', 'refus sans geste');
  assert.equal(r.maulNotice, "Il faut d'abord un coin.");
  assert.equal(r.refusedCost, 0, 'un refus ne coûte rien');
  assert.equal(r.flankNotice, 'Le coin se plante dans le bout, là où on voit les cernes.', 'depuis le flanc : refusé, avec ce message');
  assert.equal(r.flankPlanted, 0, 'depuis le flanc, rien n\'est planté');
  assert.equal(r.flankHands, '[null,{"item":"splitting-wedge"}]', 'le coin reste en main');
  assert.deepEqual(r.planted, ['big-wedged-log'], 'Espace plante le coin depuis le bout');
  assert.equal(r.handsAfterPlant, '[null,null]null', 'la main est libérée');
  assert.ok(Math.abs(r.plantCost - 1) < 1e-6, `coût du plantage : ${r.plantCost}`);
  assert.equal(r.hitsKept, 1, 'le premier coup est noté dans GameState');
  assert.ok(r.hitCosts.every((c: number) => Math.abs(c - 0.8) < 1e-6), `coût des coups : ${r.hitCosts}`);
  assert.equal(r.halves, 2, 'deux demi-billes');
  assert.ok(r.wedgeOnGround >= 1, 'le coin tombe au sol');
  assert.ok(Math.abs(r.halfMass - 101.5) < 1, `masse d'une demi-bille : ${r.halfMass}`);
  assert.equal(r.quarters, 4, 'quatre quartiers');
  assert.ok(Math.abs(r.quarterMass - 50.8) < 1, `masse d'un quartier : ${r.quarterMass}`);
  assert.deepEqual(r.noRoom, [], 'la place ne manque pas');
  for (const e of r.ends) {
    assert.deepEqual(e.planted, [e.want], `planté depuis ${e.end} : ${e.want}`);
    assert.equal(e.wrongNotice, 'Les coups se donnent sur le bout, là où le coin est planté.', `coups depuis l'autre bout de ${e.end} : refusés`);
    assert.equal(e.hitsWrong, undefined, 'aucun coup noté depuis l\'autre bout');
    assert.equal(e.halves, 2, `trois coups depuis ${e.end} : deux demi-billes`);
  }
  assert.equal(r.turned, '{"prop":"big-quarter-log","turned":true}', 'R tourne le quartier tenu');
  assert.ok(r.pile.includes('big-quarters:6'), `tas de quartiers : ${r.pile}`);
  console.log('  ✓ fendage : de la grosse bille aux quatre quartiers');
});
