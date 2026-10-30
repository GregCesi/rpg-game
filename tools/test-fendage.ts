// Test de scénario du fendage, dans le vrai jeu : un Chromium sans écran pilote le jeu servi par Vite, avec de vrais
// appuis de touches (Espace, R), comme le joueur. De la grosse bille de 1 m posée par ?dieu (une pièce de bois `big`, ronde)
// jusqu'aux quatre quartiers : refus (cognée sur une pièce trop courte pour être recoupée, masse sans coin), planter le coin,
// trois coups de masse, demi-billes, coin lâché, quartiers, masses, endurance, coups gardés dans GameState (les réglages de la
// pièce), une bille de 2 m (un seul coin, 6 coups), quartier tourné et tas de quartiers.
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
    // les pièces de bois posées, d'une forme donnée, et celles où un coin est planté
    const pieces = (shape: string) => w().map.props.filter((p: any) => p.wood?.shape === shape && !p.wood.wedge);
    const wedged = () => w().map.props.filter((p: any) => p.wood?.wedge);
    const wood = (shape: string, axis = 'ew') => ({ size: 'big', length: 100, shape, axis });
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
    // Xéros au nord du morceau, collé à son flanc, tourné vers lui
    const standFlank = async (p: any) => {
      const a = w().player.actor;
      // collé au flanc : le bas de sa collision touche le haut de celle du morceau
      a.body.reset(Math.round((p.box.left + p.box.right) / 2), Math.round(p.box.top - (a.body.bottom - a.y) - 0.5));
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
    emit({ kind: 'wood', wood: wood('round') });
    await sleep(200);
    await stand(pieces('round').at(-1));

    // 1. refus : la cognée contre le flanc (1 m ne se recoupe pas : deux bouts de moins de 60 cm), puis la masse sans coin ; ni
    // geste ni dépense
    await give('axe');
    await standFlank(pieces('round').at(-1));
    await press('Space');
    await sleep(300);
    out.axeNotice = notices.at(-1);
    out.axeMode = w().mode;
    await give('maul');
    await stand(pieces('round').at(-1));
    await press('Space');
    await sleep(300);
    out.maulNotice = notices.at(-1);
    out.refusedCost = 100 - w().player.stamina.value;

    // 2. depuis le flanc, le coin ne se plante pas (la bille reste) ; depuis le bout, face à la coupe, si
    await give('splitting-wedge');
    await standFlank(pieces('round').at(-1));
    await press('Space');
    await sleep(300);
    out.flankNotice = notices.at(-1);
    out.flankPlanted = wedged().length;
    out.flankHands = JSON.stringify(gs.game.hands);
    await stand(pieces('round').at(-1));
    await press('Space');
    await sleep(300);
    out.planted = wedged().map((p: any) => p.wood.wedge.end);
    out.handsAfterPlant = JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both);
    out.plantCost = 100 - w().player.stamina.value;

    // 3. trois coups de masse ; le premier est noté dans GameState
    await give('maul');
    const hitCosts: number[] = [];
    for (let i = 1; i <= 3; i++) {
      await stand(wedged()[0]);
      const s = w().player.stamina.value;
      await press('Space');
      await settled();
      hitCosts.push(s - w().player.stamina.value);
      if (i === 1) out.hitsKept = spawned().find((q: any) => q.wood?.wedge)?.wood.wedge.hits;
    }
    out.hitCosts = hitCosts;
    out.halves = pieces('half').length;
    out.wedgeOnGround = gs.mapState(gs.game, w().map.def.id).ground.filter((q: any) => q.item === 'splitting-wedge').length;
    out.halfMass = mass.woodMass(wood('half'));

    // 4. chaque moitié : le coin, puis trois coups de masse
    const before4 = notices.length;
    for (let k = 0; k < 2; k++) {
      await give('splitting-wedge');
      await stand(pieces('half')[0]);
      await press('Space');
      await sleep(300);
      await give('maul');
      for (let i = 0; i < 3; i++) {
        await stand(wedged()[0]);
        await press('Space');
        await settled();
      }
    }
    out.quarters = pieces('quarter').length;
    out.splitNotices = notices.slice(before4);
    out.quarterFaces = pieces('quarter').map((p: any) => p.wood.face).sort();
    out.quarterMass = mass.woodMass(wood('quarter'));
    // le quartier ne se refend pas ici
    await give('splitting-wedge');
    await stand(pieces('quarter')[0]);
    await press('Space');
    await sleep(300);
    out.quarterWedge = notices.at(-1);
    out.stamina = w().player.stamina.value;
    out.noRoom = notices.filter((n) => /Pas la place/.test(n));

    // 4 bis. le coin se plante depuis chacun des quatre bouts : la pièce garde ce bout, les coups ne se donnent que depuis lui
    // (depuis l'autre bout : le message), et trois coups fendent en deux demi-billes
    const ENDS = [
      ['ew', 'west', 'east'],
      ['ew', 'east', 'west'],
      ['ns', 'south', 'north'],
      ['ns', 'north', 'south'],
    ];
    const ends: unknown[] = [];
    for (const [axis, end, other] of ENDS) {
      emit({ kind: 'reset-map' });
      await sleep(1700);
      emit({ kind: 'stamina', value: 100 });
      emit({ kind: 'wood', wood: wood('round', axis) });
      await sleep(200);
      await give('splitting-wedge');
      await standAt(pieces('round').at(-1), end);
      await press('Space');
      await sleep(300);
      const planted = wedged().map((p: any) => p.wood.wedge.end);
      await give('maul');
      await standAt(wedged()[0], other);
      notices.length = 0;
      await press('Space');
      await sleep(300);
      const wrongNotice = notices.at(-1);
      const hitsWrong = spawned().find((o: any) => o.wood?.wedge)?.wood.wedge.hits;
      for (let i = 0; i < 3; i++) {
        await standAt(wedged()[0], end);
        await press('Space');
        await settled();
      }
      ends.push({ end, planted, wrongNotice, hitsWrong, halves: pieces('half').length });
    }
    out.ends = ends;

    // 4 ter. une bille de 2 m : un seul coin dans le bout, 6 coups de masse (3 par mètre), la fente court et le coin s'enfonce
    {
      emit({ kind: 'reset-map' });
      await sleep(1700);
      emit({ kind: 'stamina', value: 100 });
      emit({ kind: 'wood', wood: { ...wood('round'), length: 200 } });
      await sleep(200);
      await give('splitting-wedge');
      notices.length = 0;
      await standAt(pieces('round').at(-1), 'west');
      await press('Space');
      await sleep(300);
      const planted = wedged().length;
      await give('maul');
      const hits: number[] = [];
      const images: string[] = [];
      for (let i = 0; i < 6; i++) {
        await standAt(wedged()[0], 'west');
        await press('Space');
        await settled();
        const p = wedged()[0];
        hits.push(p ? p.wood.wedge.hits : -1);
        if (p) images.push(p.image.texture.key);
      }
      const halves = pieces('half');
      out.long = {
        planted,
        hits,
        images: new Set(images).size,
        halves: halves.length,
        lengths: halves.map((p: any) => p.wood.length),
        notices: [...notices],
        cost: Math.round((100 - w().player.stamina.value) * 10) / 10,
      };
    }

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
    emit({ kind: 'give', held: { prop: 'wood-piece', wood: wood('quarter') } });
    await sleep(150);
    await press('KeyR');
    await sleep(150);
    out.turned = JSON.stringify(gs.game.both);
    // un tour complet : face debout au nord, puis R quatre fois (est, sud, ouest, nord), un quart de tour dans le sens des aiguilles
    // d'une montre à chaque fois, et le quartier revient comme au départ
    {
      const start = { ...wood('quarter'), face: 'north' };
      emit({ kind: 'give', held: { prop: 'wood-piece', wood: start } });
      await sleep(150);
      const tour: string[] = [];
      for (let i = 0; i < 4; i++) {
        await press('KeyR');
        await sleep(150);
        tour.push(`${gs.game.both.wood.axis}:${gs.game.both.wood.face}`);
      }
      out.tour = { tour, back: JSON.stringify(gs.game.both.wood) === JSON.stringify(start) };
    }
    emit({ kind: 'pile', wood: { size: 'big', shape: 'quarter', length: 100 }, count: 6, turned: false, tie: false });
    await sleep(300);
    out.pile = gs.mapState(gs.game, w().map.def.id).piles.map((p: any) => `${p.pile ?? `${p.wood.shape}-${p.wood.length}`}:${p.places.length}`);
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
  assert.equal(r.axeNotice, 'Trop court pour être recoupé.', 'la cognée ne recoupe pas une bille de 1 m');
  assert.equal(r.axeMode, 'play', 'refus sans geste');
  assert.equal(r.maulNotice, "Il faut d'abord un coin.");
  assert.equal(r.refusedCost, 0, 'un refus ne coûte rien');
  assert.equal(r.flankNotice, 'Le coin se plante dans le bout, là où on voit les cernes.', 'depuis le flanc : refusé, avec ce message');
  assert.equal(r.flankPlanted, 0, 'depuis le flanc, rien n\'est planté');
  assert.equal(r.flankHands, '[null,{"item":"splitting-wedge"}]', 'le coin reste en main');
  assert.deepEqual(r.planted, ['west'], 'Espace plante le coin depuis le bout');
  assert.equal(r.handsAfterPlant, '[null,null]null', 'la main est libérée');
  assert.ok(Math.abs(r.plantCost - 1) < 1e-6, `coût du plantage : ${r.plantCost}`);
  assert.equal(r.hitsKept, 1, 'le premier coup est noté dans GameState');
  assert.ok(r.hitCosts.every((c: number) => Math.abs(c - 0.8) < 1e-6), `coût des coups : ${r.hitCosts}`);
  assert.equal(r.halves, 2, 'deux demi-billes');
  assert.ok(r.wedgeOnGround >= 1, 'le coin tombe au sol');
  assert.ok(Math.abs(r.halfMass - 106.9) < 0.1, `masse d'une demi-bille de 1 m : ${r.halfMass}`);
  assert.equal(r.quarters, 4, 'quatre quartiers');
  assert.ok(Math.abs(r.quarterMass - 53.5) < 0.1, `masse d'un quartier de 1 m : ${r.quarterMass}`);
  assert.equal(r.quarterWedge, 'Trop mince pour le coin.', 'le quartier ne se refend pas au coin');
  assert.deepEqual(r.noRoom, [], 'la place ne manque pas');
  for (const e of r.ends) {
    assert.deepEqual(e.planted, [e.end], `planté depuis ${e.end}`);
    assert.equal(e.wrongNotice, 'Les coups se donnent sur le bout, là où le coin est planté.', `coups depuis l'autre bout de ${e.end} : refusés`);
    assert.equal(e.hitsWrong, 0, 'aucun coup noté depuis l\'autre bout');
    assert.equal(e.halves, 2, `trois coups depuis ${e.end} : deux demi-billes`);
  }
  assert.equal(r.turned, '{"prop":"wood-piece","wood":{"size":"big","length":100,"shape":"quarter","axis":"ns","face":"west"}}', 'R tourne le quartier tenu (face au sud par défaut, puis à l\'ouest)');
  assert.deepEqual(r.tour.tour, ['ns:east', 'ew:south', 'ns:west', 'ew:north'], 'R : la face debout suit, nord -> est -> sud -> ouest -> nord');
  assert.equal(r.tour.back, true, 'un tour complet revient au départ');
  assert.deepEqual(r.quarterFaces, ['north', 'north', 'south', 'south'], 'les deux quartiers d\'une demi-bille naissent faces debout opposées');
  assert.ok(r.pile.includes('quarter-100:6'), `tas de quartiers : ${r.pile}`);
  assert.equal(r.long.planted, 1, 'le coin se plante dans une bille de 2 m');
  assert.deepEqual(r.long.hits, [1, 2, 3, 4, 5, -1], '6 coups de masse pour 2 m : la fente court à chaque coup, le 6e la fend');
  assert.equal(r.long.images, 5, "chaque coup change l'image (la fente s'allonge, le coin s'enfonce)");
  assert.equal(r.long.halves, 2, 'deux demi-billes');
  assert.deepEqual(r.long.lengths, [200, 200], 'de 2 m');
  assert.ok(!r.long.notices.some((n: string) => /Trop longue/.test(n)), `plus de « Trop longue pour un seul coin. » : ${r.long.notices}`);
  assert.equal(r.long.cost, 5.8, `planter (1) et 6 coups (0,8) : ${r.long.cost}`);
  console.log('  ✓ fendage : de la grosse bille aux quatre quartiers');
});
