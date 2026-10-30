// Test de scénario des tas, dans le vrai jeu (voir tools/lib/playtest.ts) : trois tas montés pièce par pièce avec E, chacun né
// d'une première pièce posée seule puis d'une pièce identique posée contre elle (des rondins de 80 cm en pyramide, des quartiers
// de 1,20 m nord-sud en rangées tête-bêche, des poutres de 1,80 m en rangées) ; leur forme (nombre de pièces, pièces par couche) ;
// le refus de mélanger (un rondin visé sur un tas de quartiers est posé seul, sans message) ; une pièce de plus de 70 kg (portée
// avec la force doublée) qui ne fait pas de tas contre sa jumelle ; la pose d'une pierre plate et d'une hachette à la place de leur
// fantôme ; puis la page rechargée : tout est retrouvé.
// Usage : npm run test:tas (lancé aussi par npm run test).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('tas', async ({ page, errors }) => {
  const r = (await page.evaluate(async () => {
    const sleep = (t: number) => new Promise((res) => setTimeout(res, t));
    const g = (window as any).game;
    const w = () => g.scene.getScene('world');
    // chemins dans une variable : ce sont des modules de la page (servis par Vite), pas du test
    const stateUrl = '/src/state/index.ts';
    const shapeUrl = '/src/world/pileShape.ts';
    const massUrl = '/src/content/mass.ts';
    const contentUrl = '/src/content/index.ts';
    const gs = await import(stateUrl);
    const ps = await import(shapeUrl);
    const mass = await import(massUrl);
    const content = await import(contentUrl);
    const emit = (c: unknown) => g.events.emit('dieu', c);
    const notices: string[] = [];
    g.events.on('notice', (t: string) => notices.push(t));
    const press = async (code: string) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
      await sleep(150);
    };
    const give = async (held: unknown) => {
      emit({ kind: 'give', held });
      await sleep(120);
    };
    const standAt = async (x: number, y: number, face: string) => {
      const a = w().player.actor;
      a.body.reset(Math.round(x), Math.round(y));
      a.face(face);
      await sleep(150);
    };
    // Xéros regarde le point (x, y) : ses pieds 10 px au nord (il regarde vers le bas), le point visé est alors (x, y)
    const lookAt = (x: number, y: number) => standAt(x, y - 10, 'down');
    const mapId = () => w().map.def.id;
    const piles = () => gs.mapState(gs.game, mapId()).piles;
    const free = (l: number, t: number, rr: number, b: number) => w().map.areaFree({ left: l, top: t, right: rr, bottom: b });
    // un coin dégagé de `width` × `height` px, loin de ceux déjà pris
    const used: [number, number, number, number][] = [];
    const find = (width: number, height: number) => {
      const m = w().map;
      for (let y = 64; y < m.height - height - 64; y += 8) {
        for (let x = 64; x < m.width - width - 64; x += 8) {
          const box: [number, number, number, number] = [x - 24, y - 24, x + width + 24, y + height + 24];
          if (used.some((b) => b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1])) continue;
          if (free(...box)) {
            used.push(box);
            return [x, y];
          }
        }
      }
      throw new Error(`pas de coin dégagé de ${width} × ${height}`);
    };
    const woodProps = (wood: any) =>
      w().map.props.filter((p: any) => p.wood && p.wood.size === wood.size && p.wood.shape === wood.shape && p.wood.length === wood.length && (p.wood.hewn ?? 0) === (wood.hewn ?? 0));
    const shape = (pile: any) => ps.shapeOf(ps.pileDefOf(ps.kindOf(pile)), !!pile.turned);
    const layersOf = (pile: any) => {
      const def = shape(pile);
      const n: number[] = [];
      for (const id of pile.places) n[def.places[id].layer] = (n[def.places[id].layer] ?? 0) + 1;
      return n;
    };
    const out: Record<string, unknown> = {};
    emit({ kind: 'map', map: 'ferme' });
    await sleep(2200);
    emit({ kind: 'stamina-infinite', on: true });

    /**
     * Monte un tas de `count` pièces `wood` dans le sens `axis` avec E : la première posée seule, la deuxième contre elle (le tas
     * naît), les autres à la place ouverte la plus basse du tas. Rend ce qui s'est passé à chaque étape.
     */
    const build = async (wood: any, axis: 'ew' | 'ns', count: number) => {
      const [x, y] = find(70, 70);
      const piece = { ...wood, axis };
      const pile = () => piles().find((p: any) => p.wood && ps.sameKind(ps.kindOf(p), { wood }));
      const steps: Record<string, unknown> = {};
      await give({ prop: 'wood-piece', wood: piece });
      await standAt(x + 35, y, 'down');
      await press('KeyE');
      steps.firstAlone = { lone: woodProps(wood).length, pile: !!pile(), both: gs.game.both };
      const lone = woodProps(wood).at(-1);
      // la deuxième contre la première : visée juste au sud d'elle (est-ouest) ou à l'est (nord-sud)
      await give({ prop: 'wood-piece', wood: piece });
      const b = lone.box;
      if (axis === 'ew') await lookAt((b.left + b.right) / 2, b.bottom + (b.bottom - b.top) / 2 + 1);
      else await lookAt(b.right + (b.right - b.left) / 2 + 1, (b.top + b.bottom) / 2);
      await press('KeyE');
      steps.born = { places: pile()?.places.length, lone: woodProps(wood).length, turned: !!pile()?.turned };
      for (let guard = 0; pile() && pile().places.length < count && guard < 20; guard++) {
        const p = pile();
        const def = shape(p);
        const next = ps.openPlaces(def, p.places).sort((a: string, c: string) => def.places[a].layer - def.places[c].layer)[0];
        if (!next) break;
        await give({ prop: 'wood-piece', wood: piece });
        const [ax, ay] = ps.placeAim(def, next);
        await lookAt(p.x + ax, p.y + ay);
        await press('KeyE');
      }
      steps.count = pile()?.places.length;
      steps.layers = pile() ? layersOf(pile()) : [];
      steps.max = pile() ? Object.keys(shape(pile()).places).length : 0;
      steps.handsEnd = gs.game.both;
      return steps;
    };

    // 1. trois tas : rondins de 80 cm (pyramide), quartiers de 1,20 m nord-sud (rangées tête-bêche), poutres de 1,80 m (rangées)
    const rondin = { size: 'normal', shape: 'round', length: 80 };
    const quartier = { size: 'big', shape: 'quarter', length: 120 };
    const poutre = { size: 'normal', shape: 'round', length: 180, hewn: 12 };
    out.masses = [rondin, quartier, poutre].map((p) => Math.round(mass.woodMass({ ...p, axis: 'ew' }) * 10) / 10);
    out.rondins = await build(rondin, 'ew', 6);
    out.quartiers = await build(quartier, 'ns', 9);
    out.poutres = await build(poutre, 'ew', 9);
    {
      const def = shape(piles().find((q: any) => q.wood?.shape === 'quarter'));
      out.headToTail = ['g0', 'g1', 'g2', 'l1-0', 'l1-1'].map((id) => def.places[id].wood.face);
    }

    // 2. ne pas mélanger : un rondin de 80 cm visé sur la place ouverte d'un tas de quartiers commencé est posé seul, sans message
    {
      const [x, y] = find(60, 60);
      const started = gs.addPile(gs.game, mapId(), { wood: quartier, x: x + 20, y: y + 40, places: ['g1'], turned: true });
      w().map.placePile(started);
      const def = shape(started);
      await give({ prop: 'wood-piece', wood: { ...rondin, axis: 'ew' } });
      const [ax, ay] = ps.placeAim(def, 'g2');
      await lookAt(started.x + ax, started.y + ay);
      const n0 = notices.length;
      const lonesBefore = woodProps(rondin).length;
      await press('KeyE');
      out.mixed = {
        started: JSON.stringify(piles().find((p: any) => p.id === started.id).places),
        rondinAlone: woodProps(rondin).length - lonesBefore,
        notices: notices.slice(n0),
        both: gs.game.both,
      };
    }

    // 3. plus de 70 kg : un rondin de 1,40 m (89 kg), porté avec la force doublée, posé contre son jumeau, reste seul
    {
      const lourd = { size: 'normal', shape: 'round', length: 140 };
      out.heavyMass = Math.round(mass.woodMass({ ...lourd, axis: 'ew' }) * 10) / 10;
      const [x, y] = find(60, 60);
      await standAt(x + 30, y, 'down');
      emit({ kind: 'wood', wood: { ...lourd, axis: 'ew' } });
      await sleep(200);
      emit({ kind: 'force', multiplier: 2 });
      await sleep(100);
      await give({ prop: 'wood-piece', wood: { ...lourd, axis: 'ew' } });
      const b = woodProps(lourd)[0].box;
      await lookAt((b.left + b.right) / 2, b.bottom + (b.bottom - b.top) / 2 + 1);
      const n0 = notices.length;
      await press('KeyE');
      out.heavy = { lone: woodProps(lourd).length, piles: piles().filter((p: any) => p.wood?.length === 140).length, notices: notices.slice(n0), both: gs.game.both };
      emit({ kind: 'force', multiplier: 1 });
      await sleep(100);
      // et ?dieu ne pose pas de tas d'une pièce trop lourde
      emit({ kind: 'pile', wood: lourd, count: 3, turned: false, tie: false });
      await sleep(150);
      out.heavyDieu = { notice: notices.at(-1), piles: piles().filter((p: any) => p.wood?.length === 140).length };
    }

    // 4. la pose avec fantôme d'une pierre plate (objet du monde) et d'une hachette (objet possédable)
    const ghost = () => {
      const i = w().handsSystem.ghost.images[0];
      return i && { visible: i.visible, key: i.texture.key, x: i.x, y: i.y, w: i.width };
    };
    {
      const [x, y] = find(60, 60);
      await give({ prop: 'flat-stone' });
      await standAt(x + 30, y, 'down');
      await sleep(100);
      const gh = ghost();
      await press('KeyE');
      const stone = w().map.props.find((p: any) => p.type === 'flat-stone' && p.spawned && p.x === gh.x && p.y === gh.y);
      out.stone = { ghost: gh.visible, key: gh.key, at: !!stone, hands: JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both) };
    }
    {
      const [x, y] = find(60, 60);
      await give({ item: 'hatchet' });
      await standAt(x + 30, y, 'right');
      await sleep(100);
      const gh = ghost();
      await press('KeyE');
      const def = content.items.hatchet;
      const tool = w().map.ground.find((q: any) => q.item.item === 'hatchet' && q.item.x === gh.x + gh.w / 2 && q.item.y === gh.y);
      out.tool = { ghost: gh.visible, key: gh.key, want: def.ground ?? def.icon, at: !!tool, hands: JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both) };
    }
    // sans rien en main, pas de fantôme
    await sleep(100);
    out.ghostEmpty = ghost()?.visible ?? false;
    out.piles = piles()
      .filter((p: any) => p.wood)
      .map((p: any) => [p.wood.shape, p.wood.length, p.wood.hewn ?? 0, !!p.turned, p.places.length].join(':'))
      .sort();
    await sleep(500);
    return out;
  })) as Record<string, any>;

  console.log(JSON.stringify(r));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.ok(r.masses.every((kg: number) => kg <= 70), `toutes portées : ${r.masses}`);
  for (const [name, s, count, layers] of [
    ['rondins de 80 cm', r.rondins, 6, [3, 2, 1]],
    ['quartiers de 1,20 m', r.quartiers, 9, [3, 3, 3]],
    ['poutres de 1,80 m', r.poutres, 9, [3, 3, 3]],
  ] as const) {
    assert.equal(s.firstAlone.pile, false, `${name} : la première pièce, seule, ne fait pas de tas`);
    assert.equal(s.firstAlone.both, null, `${name} : la première pièce est posée`);
    assert.equal(s.born.places, 2, `${name} : la deuxième contre la première fait naître le tas`);
    assert.equal(s.max, count, `${name} : ${count} places`);
    assert.equal(s.count, count, `${name} : tas plein`);
    assert.deepEqual(s.layers, layers, `${name} : pièces par couche`);
    assert.equal(s.handsEnd, null);
  }
  assert.equal(r.quartiers.born.turned, true, 'le tas de quartiers prend le sens de sa première pièce (nord-sud)');
  assert.deepEqual(r.headToTail, ['east', 'west', 'east', 'west', 'east'], 'les quartiers tête-bêche (nord-sud) : la face debout à l\'est, puis à l\'ouest');
  assert.equal(r.mixed.started, '["g1"]', 'le rondin ne va pas sur le tas de quartiers');
  assert.equal(r.mixed.rondinAlone, 1, 'il est posé seul à côté');
  assert.deepEqual(r.mixed.notices, [], 'sans message');
  assert.equal(r.mixed.both, null);
  assert.ok(r.heavyMass > 70, `le rondin de 1,40 m pèse plus de 70 kg : ${r.heavyMass}`);
  assert.equal(r.heavy.piles, 0, 'plus de 70 kg : pas de tas');
  assert.equal(r.heavy.lone, 2, 'posé seul à côté de son jumeau');
  assert.deepEqual(r.heavy.notices, []);
  assert.equal(r.heavyDieu.piles, 0);
  assert.equal(r.heavyDieu.notice, 'Trop lourde pour un tas : elle se pose seule.');
  assert.equal(r.stone.ghost, true, 'la pierre a son fantôme');
  assert.equal(r.stone.key, 'flat-stone');
  assert.equal(r.stone.at, true, 'posée à la place de son fantôme');
  assert.equal(r.stone.hands, '[null,null]null');
  assert.equal(r.tool.ghost, true, 'la hachette a son fantôme');
  assert.equal(r.tool.key, r.tool.want);
  assert.equal(r.tool.at, true, 'posée à la place de son fantôme');
  assert.equal(r.tool.hands, '[null,null]null');
  assert.equal(r.ghostEmpty, false, 'mains vides : pas de fantôme');

  // la page rechargée : les tas, leurs pièces, la pierre et la hachette sont retrouvés
  await page.reload();
  await page.waitForFunction(() => !!(window as any).game?.scene.getScene('world')?.player, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const after = (await page.evaluate(async () => {
    const stateUrl = '/src/state/index.ts';
    const gs = await import(stateUrl);
    const w = (window as any).game.scene.getScene('world');
    const piles = gs.mapState(gs.game, w.map.def.id).piles;
    return {
      map: w.map.def.id,
      piles: piles
        .filter((p: any) => p.wood)
        .map((p: any) => [p.wood.shape, p.wood.length, p.wood.hewn ?? 0, !!p.turned, p.places.length].join(':'))
        .sort(),
      shown: w.map.piles.filter((p: any) => p.pile.wood).reduce((n: number, p: any) => n + p.pile.places.length, 0),
      stone: w.map.props.some((p: any) => p.type === 'flat-stone' && p.spawned),
      tool: w.map.ground.some((q: any) => q.item.item === 'hatchet'),
    };
  })) as Record<string, any>;
  console.log(JSON.stringify(after));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(after.map, 'ferme');
  assert.deepEqual(after.piles, r.piles, 'les tas sont retrouvés, avec leurs pièces');
  assert.equal(after.shown, r.piles.reduce((n: number, p: string) => n + Number(p.split(':').at(-1)), 0), 'chaque pièce est affichée');
  assert.equal(after.stone, true, 'la pierre aussi');
  assert.equal(after.tool, true, 'et la hachette');
  console.log('  ✓ tas : rondins, quartiers tête-bêche et poutres en tas, refus de mélanger et du trop lourd, pierre et hachette posées à leur fantôme, tout retrouvé après rechargement');
});
