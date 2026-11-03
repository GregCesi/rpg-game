// Test de scénario du combat (docs/CONCEPTION.md, « Le combat »), dans le vrai jeu (voir tools/lib/playtest.ts), avec ?debug : le
// mannequin posé sur la ferme. La zone de coup est calculée au sol, dans le monde (world/strike.ts, `sweeps` de combat.json).
// - Au bord de la portée, droit devant, le coup porte ; 2 px plus loin, il ne porte pas (pour chaque arme, dans les quatre directions).
// - Une cible derrière Xéros, ou au-dessus de lui à l'écran sans être devant lui dans le monde, n'est jamais touchée.
// - Une cible que seul le début de la suite atteint (la taille : la dernière image active) est touchée, à cette image-là.
// - Une cible traversée par l'arc n'est touchée qu'une fois ; elle penche, ne casse pas ; ses dégâts s'envolent au-dessus d'elle.
// - Les dégâts et le prix d'endurance sont ceux du calcul ; l'épée fait environ 1,5 fois les dégâts par seconde de la branche.
// - La précision : sur un grand nombre de coups simulés au bord de sa portée (écart tiré à chaque coup), la branche touche nettement
//   moins souvent que l'épée au bord de la sienne ; un coup que l'écart fait manquer affiche « raté ».
// - Un coup dans le vide joue tout le geste et coûte ; le poing nu contre un arbre ne lui fait rien ; épuisé, rien ne part ; les poings
//   enchaînent le droit puis le gauche (clic gauche, clic droit) ; une pierre dans une main, le poing de l'autre ; une ou deux branches ne changent rien ; branche
//   et hachette taillent toujours.
// - Le mannequin posé par le catalogue du mode construction est une cible, et encore après rechargement.
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
    const send = async (c: unknown) => {
      g.events.emit('dieu', c);
      await (window as any).__settle();
    };
    // un clic, comme un joueur (tools/lib/playtest.ts) : le gauche est la main droite, le droit la main gauche ; le curseur devant Xéros,
    // ou sur `at` (sur le mannequin : une ressource frappe ce qui encaisse un coup, au lieu de se poser)
    const W = window as any;
    let aimAt: { x: number; y: number } | undefined;
    const click = async (button: 'left' | 'right' = 'left') => {
      const p = aimAt ?? W.__front();
      W.__aim(p.x, p.y);
      await W.__frames(1);
      W.__press(button);
      await sleep(40);
      W.__release(button);
      await W.__frames(2);
      W.__leave();
    };
    // un deuxième clic de `button` pendant le geste du premier (`first`) : guetté à chaque pas de jeu (à x10, sous la charge, un poing
    // passe en quelques pas), le clic fait dès que le geste se joue
    const during = async (button: 'left' | 'right', first: () => Promise<void>) => {
      const fired = new Promise<void>((done) => {
        const step = () => {
          if (w().mode !== 'use') return;
          w().events.off('postupdate', step);
          const f = W.__front();
          W.__aim(f.x, f.y);
          W.__press(button);
          W.__release(button);
          done();
        };
        w().events.on('postupdate', step);
      });
      await first();
      await fired;
      await W.__frames(2);
      W.__leave();
    };
    const standAt = async (x: number, y: number, face: string) => {
      const a = w().player.actor;
      a.body.reset(Math.round(x), Math.round(y));
      a.face(face);
      await (window as any).__frames(2);
    };
    // les attentes suivent l'état du jeu (le geste fini, l'enchaînement retombé), pas une durée : un jeu ralenti y arrive plus tard
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    const settle = async () => {
      while (w().mode !== 'play' || w().combat.busy) await frame();
      await frame();
    };
    /** Attend que l'enchaînement retombe : le coup suivant sera le premier de la suite. */
    const unchained = async () => {
      while (w().time.now <= (w().combat as any).comboUntil) await frame();
    };
    const stamina = () => w().player.stamina.ceiling;
    const log = () => w().combat.log;
    const give = (item: string) => send({ kind: 'give', held: { item } });
    // les textes qui s'envolent au-dessus des cibles (dégâts, « raté »)
    const floats = () => w().children.list.filter((o: any) => o.type === 'Text').map((o: any) => o.text);

    await (window as any).__restart({ kind: 'map', map: 'ferme' });
    const m = w().map;
    let spot: [number, number] | undefined;
    for (let y = 96; y < m.height - 200 && !spot; y += 8) {
      for (let x = 96; x < m.width - 200 && !spot; x += 8) if (m.areaFree({ left: x, top: y, right: x + 160, bottom: y + 160 })) spot = [x, y];
    }
    if (!spot) throw new Error('pas de coin dégagé sur la ferme');
    await standAt(spot[0] + 80, spot[1] + 50, 'down');
    await send({ kind: 'prop', prop: 'training-dummy' });
    const dummy = w().map.props.find((p: any) => p.type === 'training-dummy');
    if (!dummy) throw new Error('le mannequin ne s’est pas posé');
    const foot = strike.footprint(dummy.def.dims, dummy.baseX, dummy.baseY);
    const mid = { x: (foot.left + foot.right) / 2, y: (foot.top + foot.bottom) / 2 };
    // les pieds de Xéros à `gap` px du bord de l'emprise du mannequin, droit devant lui, tourné vers lui
    const feetAt = (dir: string, gap: number): [number, number] =>
      ({
        right: [foot.left - gap, Math.round(mid.y)],
        left: [foot.right + gap, Math.round(mid.y)],
        down: [Math.round(mid.x), foot.top - gap],
        up: [Math.round(mid.x), foot.bottom + gap],
      })[dir] as [number, number];
    const facingDummy = (dir: string, gap: number) => standAt(...feetAt(dir, gap), dir);
    const weaponOf = (item: string) => (item === 'fist' ? content.combat.unarmed : content.items[item].weapon);
    // ce que prévoit le calcul, au sol : la première image active qui touche le mannequin depuis ces pieds, ou −1
    const predicts = (item: string, gesture: string, dir: string, feet: [number, number], shift = strike.NO_SHIFT) =>
      strike.firstHit(content.combat.sweeps[gesture], weaponOf(item), dir, { x: Math.round(feet[0]), y: Math.round(feet[1]) }, foot, shift);
    const edgeOf = (item: string, gesture: string, dir: string) => {
      let best = -1;
      for (let gap = 0; gap <= 60; gap++) if (predicts(item, gesture, dir, feetAt(dir, gap)) >= 0) best = gap;
      return best;
    };
    // un coup (un clic), seul : on laisse passer l'enchaînement d'avant
    const strikeOnce = async (button: 'left' | 'right' = 'left') => {
      await unchained();
      const n = log().length;
      const before = stamina();
      const t0 = performance.now();
      // la durée du geste se mesure sur l'horloge du jeu : sous la charge, le temps réel d'une image ne suit pas celui du jeu
      const g0 = w().time.now;
      // le geste qui se joue, vu à chaque pas de jeu (à x10, sous la charge, il peut passer entre deux lectures du test)
      // et sa durée, du premier au dernier pas où il se joue (plus la durée d'un pas), sur l'horloge du jeu
      let played = false;
      let first: number | undefined;
      let last = 0;
      let step = 0;
      const texts = new Set<string>();
      const watch = (_t: number, delta: number) => {
        if (w().mode === 'use' && w().player.tools.busy) {
          played = true;
          first ??= w().time.now;
          last = w().time.now;
          step = delta;
        }
        for (const t of floats()) texts.add(t);
      };
      w().events.on('postupdate', watch);
      await click(button);
      // l'attaque a ramené le temps à x1 (règle du jeu, vérifiée par test-temps) : le coup se joue à la vitesse du scénario
      await (window as any).__resume();
      // le premier pas du geste, puis jusqu'à sa fin
      while (log().length === n && w().mode === 'play' && stamina() > 0 && performance.now() - t0 < 2000) await frame();
      while (w().mode !== 'play' || w().combat.busy) {
        for (const t of floats()) texts.add(t);
        await frame();
      }
      const ms = first === undefined ? w().time.now - g0 : last - first + step;
      await settle();
      w().events.off('postupdate', watch);
      for (const t of floats()) texts.add(t);
      const entry = log().length > n ? log()[log().length - 1] : undefined;
      const hits = entry ? entry.hits.filter((h: any) => h.type === 'training-dummy') : [];
      return { entry, spent: Math.round((before - stamina()) * 1000) / 1000, played, ms, hits: hits.length, steps: hits.map((h: any) => h.step), texts: [...texts] };
    };

    await send({ kind: 'stamina-infinite', on: false });
    await send({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
    const out: Record<string, any> = { weapons: {} };
    // pas d'écart pendant les mesures de portée : le coup va où le geste le dit
    w().combat.rand = () => 0;
    // les armes déclarées (`weapon` d'items.json), tirées des données
    for (const item of Object.keys(content.items).filter((k) => content.items[k].weapon)) {
      await give(item);
      // le curseur sur le mannequin, droit devant : la branche (une ressource) le frappe
      aimAt = mid;
      const res: Record<string, any> = { dirs: {} };
      for (const dir of ['down', 'up', 'right', 'left']) {
        const edge = edgeOf(item, 'cut', dir);
        await facingDummy(dir, edge);
        const at = await strikeOnce();
        await send({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
        await facingDummy(dir, edge + 2);
        const past = await strikeOnce();
        await send({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
        res.dirs[dir] = { edge, atHits: at.hits, pastHits: past.hits, attack: at.entry?.attack, damage: at.entry?.damage, spent: at.spent, texts: at.texts };
      }
      const wpn = weaponOf(item);
      const kg = mass.itemMass(item);
      const cut = content.combat.attacks.cut;
      const sweep = content.combat.sweeps.cut;
      res.expect = {
        damage: strike.damage(content.combat.rules, cut, sweep, combatPoses.cut.down, wpn, kg),
        cost: Math.round(strike.attackCost(content.stamina.work, strike.strikeEnergy(content.combat.rules, cut, sweep, combatPoses.cut.down, wpn, kg)).ceiling * 1000) / 1000,
        cycle: strike.cycle(content.combat.rules, combatPoses.cut.down, wpn, kg),
        reach: strike.reachCm(sweep, wpn),
      };
      // la précision : des coups simulés au bord de la portée (1 px en deçà), l'écart tiré à chaque coup
      let hits = 0;
      let tries = 0;
      for (const dir of ['down', 'up', 'right', 'left']) {
        const feet = feetAt(dir, res.dirs[dir].edge - 1);
        for (let k = 0; k < 250; k++, tries++) if (predicts(item, 'cut', dir, feet, strike.aimShift(content.combat.rules, wpn, kg)) >= 0) hits++;
      }
      res.rate = hits / tries;
      out.weapons[item] = res;
    }
    aimAt = undefined;

    // derrière Xéros, et au-dessus de lui à l'écran sans être devant lui dans le monde : jamais touché (l'épée, la taille et le coup
    // vertical ; le mannequin juste au nord de ses pieds)
    await give('wooden-sword');
    const north: [number, number] = [Math.round(mid.x), foot.bottom + 4];
    out.never = [];
    for (const [dir, gesture] of [['down', 'cut'], ['down', 'overhead'], ['right', 'cut'], ['left', 'cut'], ['right', 'overhead']]) {
      out.never.push({ dir, gesture, predicted: predicts('wooden-sword', gesture, dir, north) });
    }
    for (const dir of ['down', 'right', 'left']) {
      await standAt(...north, dir);
      const s0 = await strikeOnce();
      out.never.push({ dir, gesture: 'cut', game: s0.hits });
    }
    // une cible que seul le début de la suite atteint : la dernière image active de la taille
    const sweep = content.combat.sweeps.cut;
    const last = sweep.active[sweep.active.length - 1];
    let suite: [number, number] | undefined;
    for (let dy = -40; dy <= 40 && !suite; dy++) {
      for (let dx = -40; dx <= 40 && !suite; dx++) {
        const feet: [number, number] = [Math.round(mid.x + dx), Math.round(mid.y + dy)];
        if (predicts('wooden-sword', 'cut', 'down', feet) === last) suite = feet;
      }
    }
    out.suite = { found: !!suite };
    if (suite) {
      await standAt(...suite, 'down');
      const s1 = await strikeOnce();
      out.suite = { found: true, steps: s1.steps, last };
    }

    // « raté » : au bord de la portée de la branche, un écart tiré qui fait manquer (en long, vers Xéros)
    await give('branch');
    await facingDummy('down', out.weapons.branch.dirs.down.edge);
    w().combat.rand = (() => {
      const seq = [1, 0.75];
      let i = 0;
      return () => seq[i++ % seq.length];
    })();
    aimAt = mid;
    const miss = await strikeOnce();
    aimAt = undefined;
    out.miss = { hits: miss.hits, misses: miss.entry?.misses.length, texts: miss.texts };
    w().combat.rand = Math.random;

    // un coup dans le vide : tout le geste, et son prix
    await give('wooden-sword');
    await facingDummy('left', 90);
    const air = await strikeOnce();
    const swordMs = strike.cycle(content.combat.rules, combatPoses.cut.left, weaponOf('wooden-sword'), mass.itemMass('wooden-sword'));
    out.air = { hits: air.entry?.hits.length, spent: air.spent, played: air.played, ms: Math.round(air.ms), expected: swordMs };

    // tout objet tenu frappe (world/heft.ts) : la doloire (un outil, même dans le vide), une pierre, une perche de 2 m (des ressources :
    // contre ce qui encaisse un coup, le curseur sur le mannequin ; sans lui, elles se posent) ; portée, durée, prix
    out.improvised = {};
    for (const [name, held] of [
      ['broadaxe', { item: 'broadaxe' }],
      ['rough-stone', { item: 'rough-stone' }],
      ['pole', { prop: 'wood-piece', wood: { size: 'pole', length: 200, shape: 'round', axis: 'ew' } }],
    ] as const) {
      await send({ kind: 'give', held });
      await send({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
      await facingDummy('left', 30);
      aimAt = mid;
      const r = await strikeOnce();
      aimAt = undefined;
      out.improvised[name] = { played: r.played, spent: r.spent, ms: Math.round(r.ms), reach: r.entry?.reach, attack: r.entry?.attack, item: r.entry?.item };
    }

    // à deux mains (la perche) : le clic gauche donne la taille, le clic droit le coup d'en haut
    await facingDummy('right', 6);
    aimAt = mid;
    await unchained();
    const n2 = log().length;
    await click('left');
    await settle();
    await unchained();
    await click('right');
    await settle();
    aimAt = undefined;
    out.twoHands = log().slice(n2).map((e: any) => e.attack);

    // l'enchaînement à l'épée : la taille puis le coup d'en haut
    await give('wooden-sword');
    await facingDummy('right', 6);
    await unchained();
    let n = log().length;
    await during('left', () => click('left'));
    await settle();
    out.chain = log().slice(n).map((e: any) => e.attack);

    // les poings, mains vides : le clic gauche (le poing droit) puis, pendant le geste, le clic droit (le gauche) ; une pierre dans la
    // main gauche : le clic gauche, deux fois, le poing droit
    gs.emptyHands(gs.game);
    w().handsChanged();
    await facingDummy('down', 2);
    await unchained();
    n = log().length;
    await during('right', () => click('left'));
    await settle();
    out.fists = log().slice(n).map((e: any) => `${e.attack}:${e.hits.length}`);
    gs.emptyHands(gs.game);
    gs.game.hands[0] = { item: 'small-rough-stone', natural: { form: 0, size: 100 } };
    w().handsChanged();
    await unchained();
    n = log().length;
    await during('left', () => click('left'));
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
    await (window as any).__idle();
    out.tree = { attack: punch.entry?.attack, hits: punch.entry?.hits.length, same: w().map.props.includes(tree) && tree.type === treeType && tree.hits === treeHits };

    // épuisé : rien ne part
    await give('wooden-sword');
    await send({ kind: 'stamina', breath: 0, ceiling: 0 });
    n = log().length;
    notices.length = 0;
    await click('left');
    await settle();
    out.exhausted = { attacks: log().length - n, notice: notices.join(' | ') };
    await send({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });

    // une ou deux branches : le même coup
    await give('branch');
    await facingDummy('down', 4);
    aimAt = mid;
    const one = await strikeOnce();
    gs.take(gs.game, { item: 'branch' }, 1);
    w().handsChanged();
    const both = [gs.game.hands[0]?.item, gs.game.hands[1]?.item];
    const two = await strikeOnce();
    aimAt = undefined;
    const summary = (e: any) => ({ attack: e?.attack, damage: e?.damage, cost: e?.cost });
    out.twoBranches = { both, one: summary(one.entry), two: summary(two.entry) };

    // la branche dans la main droite, la hachette dans la gauche : le clic droit (la main de la hachette) frappe avec elle dans le vide
    // (sur le billot, elle taillerait), pas avec la branche
    await give('branch');
    gs.take(gs.game, { item: 'hatchet' }, 1);
    w().handsChanged();
    await facingDummy('left', 90);
    n = log().length;
    await click('right');
    await settle();
    out.whittle = log().length > n ? log()[log().length - 1].item : 'rien';

    out.dummyLeft = w().map.props.filter((p: any) => p.type === 'training-dummy').length;
    out.dummyAngle = dummy.image.angle;
    return out;
  })) as Record<string, any>;
  console.log(JSON.stringify(r));

  // le mannequin posé par le catalogue du mode construction (une pièce de `builds`, pas un objet de la carte) : il est une cible ;
  // et encore après rechargement (la sauvegarde)
  await load('?construire&dieu&reset');
  // les outils ?dieu ne servent qu'en mode jeu : sortir du mode construction (B), changer de carte, y revenir
  await page.keyboard.press('KeyB');
  await page.evaluate(() => (window as any).__until(() => (window as any).game.scene.getScene('world').mode === 'play', 'sortie du mode construction'));
  await page.evaluate(() => (window as any).__restart({ kind: 'map', map: 'ferme' }));
  if ((await page.evaluate(() => (window as any).game.scene.getScene('world').mode)) !== 'build') await page.keyboard.press('KeyB');
  await page.evaluate(() => (window as any).__until(() => (window as any).game.scene.getScene('world').mode === 'build', 'le mode construction sur la ferme'));
  assert.equal(await page.evaluate(() => (window as any).game.scene.getScene('world').map.def.id), 'ferme', 'le mannequin se pose sur la ferme');
  const spot = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    for (let y = 120; y < m.height - 120; y += 8) {
      for (let x = 80; x < m.width - 200; x += 8) {
        if (m.areaFree({ left: x - 60, top: y - 80, right: x + 60, bottom: y + 60 })) {
          w.cameras.main.centerOn(x, y);
          return { x, y };
        }
      }
    }
    return undefined;
  });
  assert.ok(spot, 'un coin dégagé sur la ferme');
  const frames = (n: number) => page.evaluate((n) => (window as any).__frames(n), n);
  await frames(2);
  const screen = (x: number, y: number) =>
    page.evaluate(([x, y]) => {
      const g = (window as any).game;
      const cam = g.scene.getScene('world').cameras.main;
      const rect = g.canvas.getBoundingClientRect();
      return { x: rect.left + (x - cam.worldView.x) * cam.zoom * (rect.width / g.scale.width), y: rect.top + (y - cam.worldView.y) * cam.zoom * (rect.height / g.scale.height) };
    }, [x, y] as const);
  await page.evaluate(() => (window as any).game.events.emit('build', { kind: 'pick', piece: { prop: 'training-dummy' } }));
  const at = await screen(spot!.x, spot!.y);
  await page.mouse.move(at.x, at.y);
  await frames(2);
  await page.mouse.click(at.x, at.y);
  await page.evaluate(() =>
    (window as any).__until(() => (window as any).game.scene.getScene('world').map.builds.some((b: any) => 'prop' in b.piece.piece && b.piece.piece.prop === 'training-dummy'), 'le mannequin posé'),
  );
  await page.keyboard.press('KeyB');
  await page.evaluate(() => (window as any).__idle('sorti du mode construction'));
  // frapper le mannequin posé : l'épée en main, droit devant lui, au sud ; rend les coups qui l'ont touché
  const hitBuilt = () =>
    page.evaluate(async () => {
      const sleep = (t: number) => new Promise((res) => setTimeout(res, t));
      const g = (window as any).game;
      const w = g.scene.getScene('world');
      const built = w.map.builds.find((b: any) => 'prop' in b.piece.piece && b.piece.piece.prop === 'training-dummy');
      if (!built) return { built: false };
      g.events.emit('dieu', { kind: 'give', held: { item: 'wooden-sword' } });
      g.events.emit('dieu', { kind: 'stamina', breath: 100, ceiling: 100, max: 100 });
      await (window as any).__frames(1);
      const t = w.combat.targets().find((q: any) => q.type === 'training-dummy');
      const a = w.player.actor;
      a.body.reset(Math.round((t.box.left + t.box.right) / 2), Math.round(t.box.bottom + 8));
      a.face('up');
      await (window as any).__frames(2);
      const n = w.combat.log.length;
      // le curseur devant lui, vers le mannequin (la souris de la construction est restée ailleurs sur le canevas)
      const W = window as any;
      const f = W.__front('up');
      W.__aim(f.x, f.y);
      await W.__frames(1);
      W.__press('left');
      await sleep(40);
      W.__release('left');
      await (window as any).__frames(2);
      await (window as any).__until(() => w.mode === 'play' && !w.combat.busy, 'le coup fini');
      const e = w.combat.log[n];
      return { built: true, facing: e?.facing, mode: w.mode, attack: e?.attack, hits: e ? e.hits.filter((h: any) => h.type === 'training-dummy').map((h: any) => h.key.split(':')[0]) : [] };
    });
  const built = await hitBuilt();
  await page.evaluate(() => (window as any).__idle());
  await load('?dieu');
  const reloaded = await hitBuilt();
  console.log(JSON.stringify({ built, reloaded }));
  assert.ok(built.built, 'le mannequin est posé par le catalogue du mode construction');
  assert.deepEqual(built.hits, ['build'], 'le mannequin posé par le catalogue est une cible : il est touché');
  assert.deepEqual(reloaded.hits, ['build'], 'et encore après rechargement (la sauvegarde)');
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  for (const [item, res] of Object.entries(r.weapons) as [string, any][]) {
    for (const [dir, d] of Object.entries(res.dirs) as [string, any][]) {
      assert.ok(d.edge >= 0, `${item} ${dir} : le calcul trouve une distance où le coup porte`);
      assert.equal(d.atHits, 1, `${item} ${dir} : au bord de sa portée (${d.edge} px devant), le mannequin est touché, une seule fois par coup`);
      assert.equal(d.pastHits, 0, `${item} ${dir} : 2 px plus loin, il ne l'est pas`);
      assert.equal(d.attack, 'cut', `${item} ${dir} : le premier coup est la taille`);
      assert.equal(d.damage, res.expect.damage, `${item} ${dir} : les dégâts sont ceux du calcul`);
      assert.ok(Math.abs(d.spent - res.expect.cost) < 1e-3, `${item} ${dir} : l'endurance dépensée (${d.spent}) est le prix calculé (${res.expect.cost})`);
      assert.ok(d.texts.includes(String(d.damage).replace('.', ',')), `${item} ${dir} : le chiffre des dégâts s'envole au-dessus du mannequin (${d.texts})`);
    }
  }
  const b = r.weapons.branch;
  const s = r.weapons['wooden-sword'];
  assert.ok(b.dirs.down.edge > s.dirs.down.edge, `la branche porte plus loin que l'épée (${b.dirs.down.edge} contre ${s.dirs.down.edge} px)`);
  const dps = (x: any) => x.expect.damage / x.expect.cycle;
  assert.ok(dps(s) / dps(b) > 1.3 && dps(s) / dps(b) < 1.7, `l'épée fait environ 1,5 fois les dégâts par seconde de la branche (${(dps(s) / dps(b)).toFixed(2)})`);
  assert.ok(s.expect.cost < b.expect.cost, 'l’épée coûte moins d’endurance');
  assert.ok(s.rate >= 0.85, `l'épée touche presque toujours au bord de sa portée (${(s.rate * 100).toFixed(0)} %)`);
  assert.ok(b.rate <= s.rate - 0.25, `la branche, imprécise, touche nettement moins souvent au bord de la sienne (${(b.rate * 100).toFixed(0)} % contre ${(s.rate * 100).toFixed(0)} %)`);
  for (const n of r.never) {
    if ('predicted' in n) assert.equal(n.predicted, -1, `${n.gesture} vers ${n.dir} : le mannequin au nord de ses pieds n'est jamais touché (calcul)`);
    else assert.equal(n.game, 0, `${n.gesture} vers ${n.dir} : le mannequin au nord de ses pieds n'est jamais touché (en jeu)`);
  }
  assert.ok(r.suite.found, 'il existe une place que seul le début de la suite atteint');
  assert.deepEqual(r.suite.steps, [r.suite.last], 'une cible atteinte seulement au début de la suite est touchée, à cette image');
  assert.equal(r.miss.hits, 0, 'l’écart fait manquer la cible au bord');
  assert.equal(r.miss.misses, 1, 'le coup manqué est noté');
  assert.ok(r.miss.texts.includes('raté'), `« raté » s'affiche au-dessus du mannequin (${r.miss.texts})`);
  assert.equal(r.air.hits, 0, 'dans le vide, rien n’est touché');
  assert.ok(r.air.played && r.air.spent > 0, 'dans le vide, le geste se joue et coûte');
  const imp = r.improvised;
  for (const [name, x] of Object.entries(imp) as [string, any][]) {
    assert.ok(x.played && x.spent > 0 && x.attack, `${name} : tenu, il frappe, et le coup coûte (${JSON.stringify(x)})`);
  }
  assert.ok(imp.broadaxe.reach < imp.pole.reach, `la doloire porte moins loin que la perche (${imp.broadaxe.reach} contre ${imp.pole.reach} cm)`);
  assert.ok(imp.pole.ms > imp.broadaxe.ms, `la perche frappe plus lentement que la doloire (${imp.pole.ms} contre ${imp.broadaxe.ms} ms)`);
  assert.ok(imp['rough-stone'].reach < imp.broadaxe.reach, `la pierre porte moins loin que la doloire (${imp['rough-stone'].reach} cm)`);
  assert.ok(r.air.ms >= r.air.expected - 60, `dans le vide, tout le geste se joue (${r.air.ms} ms pour ${r.air.expected})`);
  assert.deepEqual(r.twoHands, ['cut', 'overhead'], 'à deux mains, le clic gauche donne la taille, le droit le coup d’en haut');
  assert.deepEqual(r.chain, ['cut', 'overhead'], 'un deuxième clic pendant le geste enchaîne le coup d’en haut');
  assert.deepEqual(r.fists, ['jab-right:1', 'jab-left:1'], 'mains vides : le clic gauche donne le direct du droit, le clic droit celui du gauche, chacun touche');
  assert.deepEqual(r.oneFist, ['jab-right', 'jab-right'], 'une pierre dans la main gauche : le poing droit seul');
  assert.equal(r.tree.attack, 'jab-right', 'mains vides devant un arbre : un coup de poing');
  assert.equal(r.tree.hits, 0, 'le poing ne touche pas l’arbre comme une cible');
  assert.ok(r.tree.same, 'l’arbre est intact : ni coup de récolte, ni abattage');
  assert.equal(r.exhausted.attacks, 0, 'épuisé, aucune attaque ne part');
  assert.match(r.exhausted.notice, /épuisé/, 'épuisé, on le dit');
  assert.deepEqual(r.twoBranches.both, ['branch', 'branch'], 'deux branches en main');
  assert.deepEqual(r.twoBranches.two, r.twoBranches.one, 'une ou deux branches : le même coup');
  assert.equal(r.whittle, 'hatchet', 'branche et hachette : c’est la hachette qui sert (dans le vide, elle frappe), pas la branche');
  assert.equal(r.dummyLeft, 1, 'le mannequin ne casse pas');
  assert.equal(r.dummyAngle, 0, 'il revient droit');
  console.log(`  ✓ combat : zone au sol (touché au bord, manqué 2 px plus loin, jamais derrière ni au-dessus à l'écran, la suite compte) à la branche et à l’épée dans les quatre directions ; précision au bord : branche ${(b.rate * 100).toFixed(0)} %, épée ${(s.rate * 100).toFixed(0)} %, « raté » ; vide, enchaînements, poings, arbre, épuisé`);
});
