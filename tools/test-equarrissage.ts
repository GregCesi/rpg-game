// Test de scénario de l'équarrissage, dans le vrai jeu (voir tools/lib/playtest.ts) : abattre un arbre normal à la cognée,
// couper son houppier (le tronc ébranché devient un rondin de 5 m), couper le rondin à 3 m (la ligne « 3 m | 2 m » au-dessus
// de la coupe, l'encoche gardée dans GameState, deux rondins de 3 m et 2 m), rouler le rondin de 3 m, l'équarrir à la doloire
// (une face tous les trois coups, la poutre au douzième : sa masse, son prix d'endurance, elle ne roule plus et ne se porte
// pas), une bille de 95 cm qui se porte toujours et va toujours en tas ; puis la page rechargée : tout est retrouvé.
// Usage : npm run test:equarrissage (lancé aussi par npm run test).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('équarrissage', async ({ page, errors, load }) => {
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
      const press = async (code: string, ms = 60) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        await sleep(ms);
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
        await sleep(120);
      };
      const settled = async () => {
        for (let i = 0; i < 100 && w().mode !== 'play'; i++) await sleep(50);
        await sleep(300);
      };
      const give = async (item: string) => {
        emit({ kind: 'give', held: { item } });
        await sleep(120);
      };
      const props = (re: RegExp) => w().map.props.filter((p: any) => re.test(p.type));
      const spawned = () => gs.mapState(gs.game, w().map.def.id).spawned;
      const a = () => w().player.actor;
      // Xéros les pieds en (x, y), tourné vers `face`
      const standAt = async (x: number, y: number, face: string) => {
        a().body.reset(Math.round(x), Math.round(y));
        a().face(face);
        await sleep(160);
      };
      // écart entre les pieds de Xéros et le bas de sa collision
      const feet = () => a().body.bottom - a().y;
      // Xéros au nord d'une pièce couchée est-ouest, collé à son flanc, le fer (strike.down de chop : -1) sur la colonne `col` de son image
      const aboveAt = async (p: any, col: number) => {
        await standAt(p.x + col + 1, p.box.top - feet() - 0.5, 'down');
      };
      const out: Record<string, unknown> = {};

      // 1. à la ferme, un arbre normal : quatre coups de cognée depuis l'ouest, il tombe vers l'est
      emit({ kind: 'map', map: 'ferme' });
      await sleep(2200);
      emit({ kind: 'stamina-infinite', on: true });
      const tree = props(/^normal-tree$/)[0];
      await give('axe');
      await standAt(tree.box.left - 6, tree.box.bottom - 1, 'right');
      for (let i = 0; i < 4; i++) {
        await press('Space');
        await settled();
      }
      await sleep(2500);
      const felled = props(/^normal-felled-tree$/)[0];
      out.felled = !!felled;

      // 2. le houppier : trois coups, des branches, et le tronc ébranché devient un seul rondin de 5 m
      await standAt(felled.aimX, felled.aimY + 14, 'up');
      for (let i = 0; i < 3; i++) {
        await press('Space');
        await settled();
      }
      const logs = () => props(/^normal-felled-log$/);
      out.trunk = logs().map((p: any) => p.length);
      out.branches = gs.mapState(gs.game, w().map.def.id).ground.filter((q: any) => q.item === 'branch').length;
      const trunk = logs()[0];
      // les branches ramassées (sinon E les prendrait avant les rondins voisins)
      for (const gr of [...w().map.ground]) {
        gs.removeGroundItem(gs.game, w().map.def.id, gr.item.id);
        w().map.removeGround(gr);
      }
      out.trunkMass = Math.round(mass.propMass('normal-felled-log', trunk.length));

      // 3. la coupe à 3 m du bout scié : la ligne des deux longueurs, l'encoche notée, trois coups, deux rondins
      emit({ kind: 'stamina-infinite', on: false });
      emit({ kind: 'stamina', value: 100 });
      await give('axe');
      await aboveAt(trunk, 60);
      await sleep(100);
      out.label = w().timber.labelText;
      await press('Space');
      await settled();
      out.notch = JSON.stringify(spawned().find((q: any) => q.id === trunk.id)?.notch);
      for (let i = 0; i < 2; i++) {
        await aboveAt(logs().find((p: any) => p.id === trunk.id), 60);
        await press('Space');
        await settled();
      }
      out.cutCost = Math.round((100 - w().player.stamina.value) * 100) / 100;
      out.pieces = logs()
        .map((p: any) => p.length)
        .sort((x: number, y: number) => x - y);
      out.cutNotice = notices.at(-1);
      const three = () => logs().find((p: any) => p.length === 300);
      const two = logs().find((p: any) => p.length === 200);
      out.threeMass = Math.round(mass.propMass('normal-felled-log', 300));

      // le rondin de 2 m : trop lourd à porter, il se roule
      gs.emptyHands(gs.game);
      w().handsChanged();
      await standAt((two.box.left + two.box.right) / 2, two.box.bottom + 9, 'up');
      await press('KeyE');
      out.twoNotice = notices.at(-1);

      // 4. rouler le rondin de 3 m vers le sud : Xéros au nord, il marche contre lui
      gs.emptyHands(gs.game);
      w().handsChanged();
      const r = three();
      await standAt((r.box.left + r.box.right) / 2, r.box.top - feet() - 0.5, 'down');
      const y0 = r.y;
      await press('KeyS', 1800);
      await sleep(200);
      out.rolled = three().y - y0;
      out.rolledSaved = spawned().find((q: any) => q.id === three().id)?.y === three().y;

      // 5. l'équarrir à la doloire : douze coups, une face tous les trois, la poutre ; son prix d'endurance
      emit({ kind: 'stamina', value: 100 });
      await give('broadaxe');
      const faces: (string | undefined)[] = [];
      for (let i = 1; i <= 12; i++) {
        const target = three() ?? props(/^normal-beam$/)[0];
        await aboveAt(target, 30);
        await press('Space');
        await settled();
        if (i % 3 === 0) faces.push(notices.at(-1));
        if (i === 4) out.hewnKept = spawned().find((q: any) => q.id === target.id)?.hewn;
      }
      out.faces = faces;
      out.hewCost = Math.round((100 - w().player.stamina.value) * 10) / 10;
      const beam = props(/^normal-beam$/)[0];
      out.beam = beam && { length: beam.length, kg: Math.round(mass.propMass('normal-beam', beam.length) * 10) / 10 };
      out.shortBeamKg = Math.round(mass.propMass('normal-beam', 170) * 10) / 10;

      // la poutre ne roule pas, ne se porte pas (108 kg)
      gs.emptyHands(gs.game);
      w().handsChanged();
      await standAt((beam.box.left + beam.box.right) / 2, beam.box.top - feet() - 0.5, 'down');
      const by = beam.y;
      await press('KeyS', 900);
      out.beamRollNotice = notices.at(-1);
      out.beamMoved = props(/^normal-beam$/)[0].y - by;
      await standAt((beam.box.left + beam.box.right) / 2, beam.box.bottom + 9, 'up');
      await press('KeyE');
      out.beamTakeNotice = notices.at(-1);

      // 6. une bille de 95 cm : elle se porte (60 kg) et va en tas
      await standAt(a().x, a().y + 40, 'down');
      emit({ kind: 'prop', prop: 'normal-felled-log' });
      await sleep(200);
      const bille = logs().find((p: any) => p.length === 95);
      out.billeMass = Math.round(mass.propMass('normal-felled-log') * 10) / 10;
      await standAt((bille.box.left + bille.box.right) / 2, bille.box.top - feet() - 0.5, 'down');
      await press('KeyE');
      out.billeHeld = JSON.stringify(gs.game.both);
      await standAt(a().x, a().y + 30, 'down');
      await press('KeyQ');
      out.billePile = gs.mapState(gs.game, w().map.def.id)
        .piles.filter((p: any) => p.pile === 'normal-logs')
        .map((p: any) => p.places.length);
      out.handsEnd = JSON.stringify(gs.game.both);
      out.before = JSON.stringify({
        beam: props(/^normal-beam$/).map((p: any) => [p.x, p.y, p.length]),
        logs: logs()
          .map((p: any) => [p.x, p.y, p.length])
          .sort(),
      });
      await sleep(400);
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
  assert.equal(r.felled, true, "l'arbre normal est couché");
  assert.deepEqual(r.trunk, [500], 'ébranché, le tronc est un seul rondin de 5 m');
  assert.ok(r.branches >= 3, `le houppier donne des branches : ${r.branches}`);
  assert.ok(r.trunkMass > 300, `le tronc entier ne roule pas (${r.trunkMass} kg > 300)`);
  assert.equal(r.label, '3 m | 2 m', 'la coupe visée et les deux longueurs');
  assert.equal(r.notch, JSON.stringify({ at: 300, hits: 1 }), "l'encoche est notée dans GameState");
  assert.deepEqual(r.pieces, [200, 300], 'deux rondins, de 2 m et 3 m');
  assert.equal(r.cutNotice, 'Coupé : 3 m et 2 m.');
  assert.ok(Math.abs(r.cutCost - 2.4) < 0.01, `trois coups de cognée : 2,4 points (${r.cutCost})`);
  assert.equal(r.threeMass, 191, 'le rondin de 3 m pèse 191 kg');
  assert.equal(r.twoNotice, 'Trop lourd à porter. Pousse-le pour le faire rouler.', 'le rondin de 2 m (127 kg) se roule');
  assert.ok(r.rolled >= 3, `le rondin de 3 m roule vers le sud : ${r.rolled} px`);
  assert.equal(r.rolledSaved, true, 'sa position est notée');
  assert.equal(r.hewnKept, 4, 'les coups de doloire sont notés');
  assert.deepEqual(r.faces, ['Une face dressée (1 sur 4).', 'Une face dressée (2 sur 4).', 'Une face dressée (3 sur 4).', 'Poutre équarrie : 3 m.']);
  assert.ok(Math.abs(r.hewCost - 12) < 0.1, `équarrir un poteau de 3 m coûte environ 12 points : ${r.hewCost}`);
  assert.deepEqual(r.beam, { length: 300, kg: 108 }, 'la poutre de 3 m pèse 108 kg');
  assert.equal(r.shortBeamKg, 61.2, 'celle de 1,70 m, 61 kg');
  assert.equal(r.beamRollNotice, 'Elle ne roule pas : elle est carrée.');
  assert.equal(r.beamMoved, 0, 'la poutre ne bouge pas');
  assert.equal(r.beamTakeNotice, 'Trop lourde à porter.', 'la poutre de 3 m ne se porte pas');
  assert.equal(r.billeMass, 60.4, 'la bille de 95 cm pèse 60 kg');
  assert.match(r.billeHeld, /"prop":"normal-felled-log"/, 'la bille se porte');
  assert.deepEqual(r.billePile, [1], 'et va en tas');
  assert.equal(r.handsEnd, 'null');

  // 7. la page rechargée : la poutre, les rondins et le tas sont retrouvés
  await page.reload();
  await page.waitForFunction(() => !!(window as any).game?.scene.getScene('world')?.player, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const after = await page.evaluate(async () => {
    const stateUrl = '/src/state/index.ts';
    const gs = await import(stateUrl);
    const w = (window as any).game.scene.getScene('world');
    const props = (re: RegExp) => w.map.props.filter((p: any) => re.test(p.type));
    return {
      map: w.map.def.id,
      before: JSON.stringify({
        beam: props(/^normal-beam$/).map((p: any) => [p.x, p.y, p.length]),
        logs: props(/^normal-felled-log$/)
          .map((p: any) => [p.x, p.y, p.length])
          .sort(),
      }),
      piles: gs.mapState(gs.game, w.map.def.id).piles.filter((p: any) => p.pile === 'normal-logs').length,
    };
  });
  console.log(JSON.stringify(after));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(after.map, 'ferme');
  assert.equal(after.before, r.before, 'la poutre et les rondins sont retrouvés, à leur place et à leur longueur');
  assert.equal(after.piles, 1, 'le tas de billes aussi');
  console.log("  ✓ équarrissage : de l'arbre normal à la poutre de 3 m, et tout retrouvé après rechargement");
});
