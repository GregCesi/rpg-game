// Test de scénario des matières (chantier « briques »), dans le vrai jeu (voir tools/lib/playtest.ts) : une grosse pierre brute donnée
// (sa forme et sa taille tirées), transformée en moellon par ?dieu (« Transformer » : la masse baisse, les éclats restent au sol),
// puis deux moellons posés l'un contre l'autre : un tas naît ; de même la terre mêlée en torchis (trois mottes, une gerbe de paille
// et un seau d'eau au sol : trois mottes de torchis et le seau vide), mise en tas, la branche parée en baguette, mise en tas, un quartier fendu en cinq planches et deux perches en tas ; une
// transformation à qui il manque une entrée ne change rien ; puis la page rechargée : tout est retrouvé, la pierre posée seule avec
// sa forme et sa taille.
// Usage : npm run test:briques (lancé aussi par npm run test).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('briques', async ({ page, errors }) => {
  const r = (await page.evaluate(async () => {
    const sleep = (t: number) => new Promise((res) => setTimeout(res, t));
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
      await sleep(150);
    };
    const send = async (c: unknown, ms = 150) => {
      emit(c);
      await sleep(ms);
    };
    const standAt = async (x: number, y: number, face: string) => {
      const a = w().player.actor;
      a.body.reset(Math.round(x), Math.round(y));
      a.face(face);
      await sleep(150);
    };
    const mapId = () => w().map.def.id;
    const ms = () => gs.mapState(gs.game, mapId());
    const carried = () => (gs.game.both ? mass.heldMass(gs.game.both) : mass.heldMass(gs.game.hands[0]) + mass.heldMass(gs.game.hands[1]));
    const held = () => JSON.parse(JSON.stringify(gs.game.both ?? gs.game.hands[gs.game.active] ?? null));
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
    // deux pièces de `what` posées l'une devant l'autre (Q, lâcher : le même chemin de pose que E dans le vide ; E, une main libre,
    // reprendrait la pièce au sol) : la seconde, contre la première seule au sol, fait naître un tas
    const pileOf = async (what: unknown) => {
      const [x, y] = find(70, 70);
      await standAt(x + 30, y, 'down');
      await send({ kind: 'give', held: what });
      await press('KeyQ');
      await send({ kind: 'give', held: what });
      await press('KeyQ');
      return ms().piles.map((p: any) => `${p.pile ?? `${p.wood.size}-${p.wood.shape}-${p.wood.length}`}:${p.places.length}`);
    };

    await send({ kind: 'stamina-infinite', on: true });
    await send({ kind: 'map', map: 'ferme' }, 1500);
    const out: Record<string, unknown> = { map: mapId() };

    // 1. la pierre : une grosse pierre brute donnée, dégrossie en moellon ; les éclats restent au sol
    {
      const [x, y] = find(80, 80);
      await standAt(x + 40, y + 20, 'down');
      await send({ kind: 'give', held: { item: 'big-rough-stone' } });
      const stone = held();
      const before = carried();
      const chips = ms().spawned.filter((o: any) => o.type === 'stone-chips').length;
      notices.length = 0;
      await send({ kind: 'transform', id: 'dress-rubble' });
      out.stone = { stone, before, after: carried(), held: held(), chips: ms().spawned.filter((o: any) => o.type === 'stone-chips').length - chips, notice: notices.at(-1) };
      // une transformation à qui il manque son entrée : rien ne change
      notices.length = 0;
      const was = JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both);
      await send({ kind: 'transform', id: 'dress-rubble' });
      out.missing = { notice: notices.at(-1), same: JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both) === was };
      // la pierre de taille, du moellon qu'il tient
      await send({ kind: 'transform', id: 'dress-ashlar' });
      out.ashlar = { held: held(), kg: carried() };
      // la grosse pierre posée seule : sa forme et sa taille la suivent au sol
      await send({ kind: 'give', held: { item: 'big-rough-stone' } });
      out.lone = held();
      const [lx, ly] = find(60, 60);
      await standAt(lx + 30, ly, 'down');
      await press('KeyE');
      out.loneGround = ms().ground.filter((q: any) => q.item === 'big-rough-stone').map((q: any) => q.natural);
    }
    out.rubblePiles = await pileOf({ item: 'rubble-stone' });

    // 2. la terre : trois mottes, une gerbe de paille et un seau d'eau au sol, mêlés en torchis
    {
      const [x, y] = find(90, 90);
      await standAt(x + 45, y + 10, 'down');
      await send({ kind: 'supply', what: 'clay-clod', count: 3 }, 250);
      await send({ kind: 'supply', what: 'straw', count: 1 }, 250);
      await send({ kind: 'prop', prop: 'bucket-water' }, 250);
      const ground = () => ms().ground.map((q: any) => q.item);
      const props = () => ms().spawned.map((o: any) => o.type);
      const clods = ground().filter((k: string) => k === 'clay-clod').length;
      notices.length = 0;
      await send({ kind: 'transform', id: 'mix-cob' }, 300);
      out.cob = {
        clodsBefore: clods,
        clodsAfter: ground().filter((k: string) => k === 'clay-clod').length,
        cob: ground().filter((k: string) => k === 'cob').length + (held()?.item === 'cob' ? 1 : 0),
        straw: ground().filter((k: string) => k === 'straw').length,
        full: props().filter((k: string) => k === 'bucket-water').length,
        empty: props().filter((k: string) => k === 'bucket').length,
        notice: notices.at(-1),
      };
    }
    out.cobPiles = await pileOf({ item: 'cob' });

    // 3. les fibres : la branche parée en baguette, dans la main qui la tenait
    {
      await send({ kind: 'give', held: { item: 'branch' } });
      const before = carried();
      await send({ kind: 'transform', id: 'trim-rod' });
      out.rod = { before, after: carried(), held: held() };
    }
    out.rodPiles = await pileOf({ item: 'wattle-rod' });

    // 4. le bois travaillé : un quartier de 1 m fendu au coutre en cinq planches (au sol, à côté), une perche de 2 m mise en tas
    {
      const [x, y] = find(110, 90);
      await standAt(x + 55, y + 10, 'down');
      await send({ kind: 'give', held: { prop: 'wood-piece', wood: { size: 'big', shape: 'quarter', length: 100, axis: 'ew' } } });
      const before = carried();
      const planks = () => ms().spawned.filter((o: any) => o.type === 'wood-piece' && o.wood?.shape === 'plank');
      const n = planks().length;
      await send({ kind: 'transform', id: 'rive-plank' }, 300);
      const kinds = planks().slice(n).map((o: any) => `${o.wood.size}:${o.wood.length}`);
      out.planks = { before, kinds, inHand: held()?.wood?.shape ?? null };
    }
    out.polePiles = await pileOf({ prop: 'wood-piece', wood: { size: 'pole', shape: 'round', length: 200, axis: 'ew' } });
    out.piles = ms().piles.map((p: any) => `${p.pile ?? `${p.wood.size}-${p.wood.shape}-${p.wood.length}`}:${p.places.length}`).sort();
    out.chipsTotal = ms().spawned.filter((o: any) => o.type === 'stone-chips').length;
    out.notices = notices;
    return out;
  })) as Record<string, any>;
  console.log(JSON.stringify(r));

  assert.equal(r.map, 'ferme');
  // la pierre
  assert.equal(r.stone.stone.item, 'big-rough-stone');
  assert.ok(r.stone.stone.natural && r.stone.stone.natural.size >= 93 && r.stone.stone.natural.size <= 107, `la pierre a sa forme et sa taille : ${JSON.stringify(r.stone.stone.natural)}`);
  assert.equal(r.stone.held.item, 'rubble-stone', 'le moellon est dans les mains qui tenaient la pierre');
  assert.ok(r.stone.after < r.stone.before, `le moellon pèse moins que la pierre : ${r.stone.after} < ${r.stone.before}`);
  assert.ok(Math.abs(r.stone.after - 35.36) < 0.1, `moellon : 35,4 kg (${r.stone.after})`);
  assert.equal(r.stone.chips, 1, 'les éclats restent au sol');
  assert.match(r.stone.notice, /^Moellon : 35 kg ; éclats de pierre : [\d,]+ kg, au sol\.$/);
  assert.equal(r.missing.notice, 'Il manque : grosse pierre brute.');
  assert.equal(r.missing.same, true, 'sans son entrée, rien ne change');
  assert.equal(r.ashlar.held.item, 'ashlar');
  assert.ok(Math.abs(r.ashlar.kg - 31.2) < 0.1, `pierre de taille : 31,2 kg (${r.ashlar.kg})`);
  assert.deepEqual(r.loneGround, [r.lone.natural], 'posée seule, la pierre garde sa forme et sa taille');
  assert.ok(r.rubblePiles.includes('rubble-stones:2'), `deux moellons font un tas : ${r.rubblePiles}`);
  // la terre
  assert.equal(r.cob.clodsAfter, r.cob.clodsBefore - 3, 'les trois mottes de terre sont mêlées');
  assert.equal(r.cob.cob, 3, 'trois mottes de torchis');
  assert.equal(r.cob.straw, 0, 'la gerbe de paille y est passée');
  assert.equal(r.cob.full, 0, "le seau d'eau est vidé");
  assert.ok(r.cob.empty >= 1, 'le seau vide reste');
  assert.match(r.cob.notice, /^3 × motte de torchis, seau : [\d,]+ kg ; eau et paille en trop : [\d,]+ kg\.$/);
  assert.ok(r.cobPiles.includes('cob-clods:2'), `deux mottes de torchis font un tas : ${r.cobPiles}`);
  // les fibres
  assert.equal(r.rod.held.item, 'wattle-rod', 'la baguette reste dans la main qui tenait la branche');
  assert.ok(r.rod.after < r.rod.before, `la baguette pèse moins que la branche : ${r.rod.after} < ${r.rod.before}`);
  assert.ok(r.rodPiles.includes('wattle-rods:2'), `deux baguettes font un tas : ${r.rodPiles}`);

  // le bois travaillé
  assert.ok(Math.abs(r.planks.before - 53.46) < 0.1, `le quartier de 1 m pèse 53,5 kg (${r.planks.before})`);
  const handPlank = r.planks.inHand === 'plank' ? 1 : 0;
  assert.equal(r.planks.kinds.length + handPlank, 5, `cinq planches : ${r.planks.kinds}`);
  assert.ok(r.planks.kinds.every((k: string) => k === 'big:100'), 'de la longueur du quartier');
  assert.ok(r.polePiles.includes('pole-round-200:2'), `deux perches font un tas : ${r.polePiles}`);

  // la page rechargée : les tas, les éclats et la pierre posée seule sont retrouvés
  await page.reload();
  await page.waitForFunction(() => !!(window as any).game?.scene.getScene('world')?.player, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const after = (await page.evaluate(async () => {
    const stateUrl = '/src/state/index.ts';
    const gs = await import(stateUrl);
    const w = (window as any).game.scene.getScene('world');
    const ms = gs.mapState(gs.game, w.map.def.id);
    return {
      map: w.map.def.id,
      piles: ms.piles.map((p: any) => `${p.pile ?? `${p.wood.size}-${p.wood.shape}-${p.wood.length}`}:${p.places.length}`).sort(),
      shown: w.map.piles.reduce((n: number, p: any) => n + p.pile.places.length, 0),
      chips: w.map.props.filter((p: any) => p.type === 'stone-chips').length,
      lone: w.map.ground.filter((q: any) => q.item.item === 'big-rough-stone').map((q: any) => q.item.natural),
      loneImage: w.map.ground.filter((q: any) => q.item.item === 'big-rough-stone').map((q: any) => q.image.texture.key),
    };
  })) as Record<string, any>;
  console.log(JSON.stringify(after));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(after.map, 'ferme');
  assert.deepEqual(after.piles, r.piles, 'les tas sont retrouvés, avec leurs pièces');
  assert.equal(after.shown, r.piles.reduce((n: number, p: string) => n + Number(p.split(':').at(-1)), 0), 'chaque pièce est affichée');
  assert.equal(after.chips, r.chipsTotal, 'les éclats aussi');
  assert.deepEqual(after.lone, r.loneGround, 'la pierre seule, avec sa forme et sa taille');
  assert.deepEqual(after.loneImage, r.loneGround.map((n: any) => (n.form ? 'big-rough-stone-ground-b' : 'big-rough-stone-ground')), 'dessinée dans sa forme');
  console.log('  ✓ briques : pierre brute dégrossie en moellon (éclats au sol) puis en pierre de taille, terre mêlée en torchis, branche parée en baguette, quartier fendu en planches, perches, chacun en tas, la forme et la taille d\'une pierre gardées, tout retrouvé après rechargement');
});
