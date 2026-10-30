// Test de scénario des poteaux de l'abri, dans le vrai jeu (voir tools/lib/playtest.ts) : on part des quatre dés posés ; une place
// refuse un rondin non équarri, une poutre de 2 m, autre chose qu'une poutre (rien ne se dépense, la pièce reste en main) ; les deux
// poteaux bas (1,80 m, 65 kg) se dressent portés, au prix de l'effort ; les deux poteaux hauts (3 m, 108 kg) ne se portent pas :
// sans poutre au pied du dé on le dit, avec elle E maintenu appelle la mère (fondu, « Ta mère vient t'aider. », la moitié de
// l'effort) ; les quatre poteaux posés, la ligne passe aux sablières ; la page rechargée les retrouve avec leur pièce d'origine.
// Un chantier montre les vraies pièces posées : un poteau dressé est la pièce de bois debout (même état, même longueur, même clé
// d'image que son fantôme), et sa silhouette a la taille au gabarit (une poutre de 1,80 m : 8 × 40 px ; de 3 m : 8 × 64), et sa largeur est l'épaisseur de la même poutre couchée (règle D étendue).
// Usage : npm run test:poteaux (lancé aussi par npm run test).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('poteaux', async ({ page, errors, load }) => {
  const shots = !!process.env.POTEAUX_SHOTS;
  await page.exposeFunction('shot', async (name: string) => {
    if (shots) await page.screenshot({ path: `.art-preview/poteaux-${name}.png` });
  });
  const scenario = async () => {
    return page.evaluate(async () => {
      const sleep = (t: number) => new Promise((r) => setTimeout(r, t));
      const g = (window as any).game;
      const w = () => g.scene.getScene('world');
      const stateUrl = '/src/state/index.ts';
      const planUrl = '/src/world/sitePlan.ts';
      const contentUrl = '/src/content/index.ts';
      const massUrl = '/src/content/mass.ts';
      const shapeUrl = '/src/world/woodShape.ts';
      const pieceUrl = '/src/world/woodPiece.ts';
      const gabaritUrl = '/src/content/gabarit.ts';
      const texUrl = '/src/world/woodTexture.ts';
      const gs = await import(stateUrl);
      const sp = await import(planUrl);
      const content = await import(contentUrl);
      const mass = await import(massUrl);
      const shape = await import(shapeUrl);
      const woodPiece = await import(pieceUrl);
      const gabarit = await import(gabaritUrl);
      const tex = await import(texUrl);
      const emit = (c: unknown) => g.events.emit('dieu', c);
      const notices: string[] = [];
      g.events.on('notice', (t: string) => notices.push(t));
      const press = async (code: string, hold = 60) => {
        // keyCode aussi : les touches de la scène des dialogues (Phaser) sont lues par leur code numérique
        const keyCode = code === 'KeyE' ? 69 : 0;
        window.dispatchEvent(new KeyboardEvent('keydown', { code, keyCode }));
        await sleep(hold);
        window.dispatchEvent(new KeyboardEvent('keyup', { code, keyCode }));
        await sleep(120);
      };
      const give = async (what: object) => {
        emit({ kind: 'give', held: what });
        await sleep(120);
      };
      const standAt = async (x: number, y: number, face: string) => {
        const a = w().player.actor;
        a.body.reset(Math.round(x), Math.round(y));
        a.face(face);
        await sleep(180);
      };
      // Xéros regarde le point (x, y) : ses pieds 10 px au nord (il regarde vers le bas)
      const lookAt = (x: number, y: number) => standAt(x, y - 10, 'down');
      const settled = async () => {
        for (let i = 0; i < 100 && w().mode !== 'play'; i++) await sleep(50);
        await sleep(400);
      };
      const mapId = () => w().map.def.id;
      const site = () => gs.mapState(gs.game, mapId()).sites[0];
      const plan = content.plans.woodshed;
      const hands = () => JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both);
      const statusText = () => w().site.texts.map((t: any) => t.text.text)[0];
      const stamina = () => w().player.stamina.value;
      const shot = (name: string) => (window as any).shot(name);
      const beam = (length: number, hewn = 12) => ({ prop: 'wood-piece', wood: { size: 'normal', length, shape: 'round', ...(hewn ? { hewn } : {}), axis: 'ew' } });
      const aim = (id: string) => sp.placeGround(site(), plan.steps[1].places[id], plan.steps[1]);
      // la pièce de bois dressée d'une poutre de `length` cm, sa clé d'image, ses poteaux sur la carte, sa silhouette dessinée
      const upright = (length: number) => ({ size: 'normal', length, shape: 'round', hewn: 12, axis: 'up' });
      const upKey = (length: number) => shape.woodKey(upright(length));
      const posts = (length?: number) => w().map.props.filter((p: any) => p.type === 'wood-piece' && p.wood?.axis === 'up' && (length === undefined || p.wood.length === length));
      // la silhouette d'une image : le cadre de ses pixels opaques (l'ombre translucide ne compte pas)
      const silOf = (texture: any, frame: any) => {
        const cv = texture.getSourceImage();
        const px = cv.getContext('2d').getImageData(frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight).data;
        let [x0, y0, x1, y1] = [frame.cutWidth, frame.cutHeight, -1, -1];
        for (let y = 0; y < frame.cutHeight; y++) for (let x = 0; x < frame.cutWidth; x++) if (px[(y * frame.cutWidth + x) * 4 + 3] === 255) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
        return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
      };
      const silhouette = (p: any) => silOf(p.image.texture, p.image.frame);
      // la même pièce couchée est-ouest (même état, même longueur) : son épaisseur à l'écran
      const lyingThickness = (length: number) => {
        const key = tex.woodTexture(w(), { size: 'normal', length, shape: 'round', hewn: 12, axis: 'ew' });
        const t = w().textures.get(key);
        return silOf(t, t.get('0')).h;
      };
      const lookOf = (length: number) => {
        const list = posts(length);
        const want = gabarit.expectedSize(woodPiece.woodDims(upright(length)));
        return { count: list.length, keys: [...new Set(list.map((p: any) => p.image.texture.key))], pieces: [...new Set(list.map((p: any) => JSON.stringify(p.wood)))], sil: list.map(silhouette), width: list.map((p: any) => p.image.width), height: list.map((p: any) => p.image.height), lying: lyingThickness(length), want: { w: want.w, h: want.h } };
      };
      const ghost = (key: string) => w().site.ghosts.images.filter((i: any) => i.visible && i.texture.key === key).map((i: any) => [i.x, i.y]);
      const out: Record<string, any> = {};

      // 0. de quoi partir : un chantier né sur un coin dégagé de la ferme, ses quatre dés posés
      emit({ kind: 'map', map: 'ferme' });
      await sleep(2200);
      const free = (l: number, t: number, r: number, b: number) => w().map.areaFree({ left: l, top: t, right: r, bottom: b });
      const find = () => {
        const m = w().map;
        for (let y = 154; y < m.height - 200; y += 8) {
          for (let x = 64; x < m.width - 200; x += 8) if (free(x - 40, y - 40, x + 61 + 40, y + 71 + 40)) return [x, y];
        }
        return undefined;
      };
      const [ox, oy] = find()!;
      const created = gs.startSite(gs.game, mapId(), 'woodshed', ox, oy);
      for (const c of ['ne', 'se', 'sw']) gs.plantSiteStake(gs.game, mapId(), created.id, c);
      emit({ kind: 'stamina', value: 100 });
      emit({ kind: 'skip-step' });
      await sleep(300);
      out.start = JSON.stringify({ placed: Object.keys(site().placed).length, status: statusText() });
      out.ghostsHigh = ghost(upKey(300));
      out.ghostsLow = ghost(upKey(180));
      out.upKeys = [upKey(300), upKey(180)];

      // 1. les refus, avec une force doublée pour pouvoir tenir une poutre de 2 m ou de 3 m : rien ne se dépense, la pièce reste en main
      emit({ kind: 'force', multiplier: 2 });
      const refusals: Record<string, string | undefined> = {};
      const refuse = async (name: string, what: object, place: string) => {
        gs.emptyHands(gs.game);
        await give(what);
        const before = hands();
        const cost0 = stamina();
        const a = aim(place);
        await lookAt(a.x, a.y);
        await press('KeyE');
        refusals[name] = JSON.stringify({ notice: notices.at(-1), kept: hands() === before, spent: cost0 - stamina(), placed: Object.keys(site().placed).length });
      };
      await refuse('rondin', beam(180, 0), 'post-sw');
      await refuse('demi-equarri', beam(180, 7), 'post-sw');
      await refuse('deux-metres-bas', beam(200), 'post-sw');
      await refuse('deux-metres-haut', beam(200), 'post-nw');
      await refuse('trois-metres-bas', beam(300), 'post-sw');
      await refuse('hache', { item: 'axe' }, 'post-sw');
      await refuse('pierre', { prop: 'flat-stone' }, 'post-nw');
      out.refusals = refusals;
      emit({ kind: 'force', multiplier: 1 });
      gs.emptyHands(gs.game);
      w().handsChanged();

      // 2. les poteaux bas, portés : une poutre de 1,80 m (65 kg), dressée sur son dé
      const low: any[] = [];
      for (const place of ['post-sw', 'post-se']) {
        emit({ kind: 'stamina', value: 100 });
        await give(beam(180));
        out.carried = hands();
        const a = aim(place);
        await lookAt(a.x, a.y);
        await press('KeyE');
        low.push({ place, hands: hands(), cost: 100 - stamina(), status: statusText(), notice: notices.at(-1) });
        await sleep(200);
      }
      out.low = low;
      out.postsLow = posts(180).length;
      out.lookLow = lookOf(180);
      out.massLow = mass.woodMass({ size: 'normal', length: 180, shape: 'round', hewn: 12, axis: 'ew' });
      out.kept = JSON.stringify(site().pieces);
      out.statusLow = statusText();
      // un poteau dressé est exactement où était son fantôme (la même image, le même coin)
      const placedAt = (length: number) => posts(length).map((p: any) => [p.image.x, p.image.y]).sort();
      out.lowAtGhost = JSON.stringify({ ghosts: out.ghostsLow.slice().sort(), posts: placedAt(180) });
      await shot('1-bas');

      // 3. les poteaux hauts : trop lourds à porter (la force ne suffit pas), on les équarrit sur place, la mère aide
      const nw = aim('post-nw');
      const beamAt = (x: number, y: number, piece: { wood: object } = beam(300)) => {
        const o = gs.spawnObject(gs.game, mapId(), 'wood-piece', x, y, { wood: piece.wood });
        return w().map.placeProp(o, { spawned: true, wood: piece.wood });
      };
      // 3a. rien au pied du dé : « Il faut d'abord une poutre de 3 m au pied du dé. »
      await lookAt(nw.x, nw.y);
      emit({ kind: 'stamina', value: 100 });
      await press('KeyE');
      out.shortNone = notices.at(-1);
      await press('KeyE', 700);
      out.noBeamNotice = notices.at(-1);
      out.noBeamMode = w().mode;
      // 3b. une poutre qui ne convient pas au pied du dé (un rondin de 3 m, une poutre de 2 m) : même message
      const wrong1 = beamAt(nw.x - 80, nw.y + 14, beam(300, 0));
      const wrong2 = beamAt(nw.x - 80, nw.y + 22, beam(200));
      await lookAt(nw.x, nw.y);
      await press('KeyE', 700);
      out.wrongBeamNotice = notices.at(-1);
      // 3c. une bonne poutre, mais loin (plus d'une case du dé)
      const far = beamAt(nw.x - 160, nw.y + 14);
      await lookAt(nw.x, nw.y);
      await press('KeyE', 700);
      out.farNotice = notices.at(-1);
      for (const p of [wrong1, wrong2, far]) {
        gs.changeSpawned(gs.game, mapId(), p.id, { x: 0, y: 0 });
        w().map.removeProp(p);
      }
      // 3d. la bonne, couchée à l'ouest du dé, son bout est-ouest à moins d'une case : E court dit comment faire, E maintenu appelle
      beamAt(nw.x - 56, nw.y + 8);
      await lookAt(nw.x, nw.y);
      emit({ kind: 'stamina', value: 100 });
      await press('KeyE');
      out.shortGood = notices.at(-1);
      out.shortMode = w().mode;
      await press('KeyE', 700);
      await sleep(400);
      out.askMode = w().mode;
      await shot('2-appeler-la-mere');
      await press('KeyE'); // la question s'affiche d'un coup
      await press('KeyE'); // « Oui »
      await sleep(900);
      out.fadeMode = w().mode;
      out.motherNotice = notices.at(-1);
      await shot('3-fondu');
      await settled();
      out.helped = JSON.stringify({ mode: w().mode, hands: hands(), posts: posts(300).length, status: statusText(), cost: 100 - stamina(), beamOnGround: w().map.props.filter((p: any) => p.type === 'wood-piece' && p.wood?.axis !== 'up').length });
      out.highPieces = JSON.stringify(site().pieces['post-nw']);
      out.massHigh = site().pieces['post-nw'] ? mass.woodMass(site().pieces['post-nw']) : -1;
      await shot('4-pose');

      // 3e. le second poteau haut, avec la poutre de ce côté (nord-sud) : même chose
      const ne = aim('post-ne');
      beamAt(ne.x + 8, ne.y + 50, { wood: { size: 'normal', length: 300, shape: 'round', hewn: 12, axis: 'ns' } });
      await lookAt(ne.x, ne.y);
      emit({ kind: 'stamina', value: 100 });
      await press('KeyE', 700);
      await sleep(400);
      await press('KeyE');
      await press('KeyE');
      await settled();
      out.secondHigh = JSON.stringify({ posts: posts(300).length, cost: 100 - stamina(), placed: Object.keys(site().placed).length });

      // 4. les quatre poteaux : la ligne passe aux sablières, dont les fantômes paraissent (étape encore « à venir »)
      out.status = statusText();
      out.ghostsPlates = w().site.ghosts.images.filter((i: any) => i.visible).map((i: any) => i.texture.key).sort();
      out.highAtGhost = JSON.stringify({ ghosts: out.ghostsHigh.slice().sort(), posts: placedAt(300) });
      out.lookHigh = lookOf(300);
      await give({ item: 'stake' });
      const plate = sp.placeGround(site(), plan.steps[2].places['plate-north']);
      await lookAt(plate.x, plate.y);
      await press('KeyE');
      out.plateNotice = notices.at(-1);
      out.pieces = JSON.stringify(site().pieces);
      await sleep(400);
      await shot('5-quatre-poteaux');
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
  assert.equal(r.start, JSON.stringify({ placed: 4, status: 'Abri à bois : poteaux, 0 sur 4' }), 'départ : quatre dés posés');
  assert.equal(r.ghostsHigh.length, 2, 'deux fantômes de poteau haut');
  assert.equal(r.ghostsLow.length, 2, 'deux fantômes de poteau bas');

  const refused = (key: string, notice: string) => {
    const d = JSON.parse(r.refusals[key]);
    assert.equal(d.notice, notice, `refus « ${key} »`);
    assert.equal(d.kept, true, `« ${key} » reste en main`);
    assert.equal(d.spent, 0, `« ${key} » ne coûte rien`);
    assert.equal(d.placed, 4, `« ${key} » : rien de posé`);
  };
  refused('rondin', "Il faut l'équarrir d'abord.");
  refused('demi-equarri', "Il faut l'équarrir d'abord.");
  refused('deux-metres-bas', 'Il faut une poutre de 1,80 m.');
  refused('deux-metres-haut', 'Il faut une poutre de 3 m.');
  refused('trois-metres-bas', 'Il faut une poutre de 1,80 m.');
  refused('hache', "Ce n'est pas une poutre.");
  refused('pierre', "Ce n'est pas une poutre.");

  assert.equal(r.carried, '[null,null]{"prop":"wood-piece","wood":{"size":"normal","length":180,"shape":"round","hewn":12,"axis":"ew"}}', 'la poutre de 1,80 m se porte à deux mains');
  assert.ok(Math.abs(r.massLow - 64.8) < 0.2, `poutre de 1,80 m : environ 65 kg (${r.massLow})`);
  for (const [i, d] of (r.low as any[]).entries()) {
    assert.equal(d.hands, '[null,null]null', `poteau bas ${i + 1} dressé : les mains sont libres`);
    assert.ok(Math.abs(d.cost - 0.06 * r.massLow) < 1e-6, `dresser une poutre coûte 0,06 par kg : ${d.cost}`);
    assert.equal(d.status, 'Abri à bois : poteaux, ' + (i + 1) + ' sur 4');
  }
  assert.equal(r.postsLow, 2, 'deux poteaux bas sur la carte');
  // ce qu'on pose est ce qu'on voit : le poteau est la pièce de bois debout, de même état et de même longueur que la poutre posée
  {
    const d = r.lookLow;
    assert.equal(d.count, 2);
    assert.deepEqual(d.pieces, ['{"size":"normal","length":180,"shape":"round","hewn":12,"axis":"up"}'], 'le poteau bas est la poutre de 1,80 m, équarrie, debout');
    assert.deepEqual(d.keys, [r.upKeys[1]], 'son image est celle de la pièce de bois debout (celle de son fantôme)');
    assert.ok(d.sil.every((s: any) => Math.abs(s.w - d.want.w) <= 2 && Math.abs(s.h - d.want.h) <= 2), `une poutre de 1,80 m dressée fait la taille au gabarit : ${JSON.stringify(d.sil)}, attendu ${JSON.stringify(d.want)}`);
    assert.deepEqual(d.want, { w: 8, h: 40 }, 'le gabarit : 8 × 40 px (1,80 m + la tête de 4 px)');
    assert.ok(d.sil.every((s: any) => Math.abs(s.w - d.lying) <= 1), `règle D étendue : debout, la largeur (${JSON.stringify(d.sil)}) est l'épaisseur de la même pièce couchée (${d.lying} px), à 1 px près`);
    assert.ok(d.height.every((h: number) => h === 40 + 3), 'son image : 40 rangées et les 3 du dé');
  }
  const kept = JSON.parse(r.kept);
  assert.deepEqual(Object.keys(kept).sort(), ['post-se', 'post-sw'], 'les poteaux posés gardent leur pièce d’origine');
  assert.deepEqual(kept['post-sw'], { size: 'normal', length: 180, shape: 'round', hewn: 12, axis: 'ew' });
  {
    const d = JSON.parse(r.lowAtGhost);
    assert.deepEqual(d.posts, d.ghosts, 'un poteau dressé est exactement là où était son fantôme');
  }

  assert.equal(r.shortNone, "Il faut d'abord une poutre de 3 m au pied du dé.", 'E court : ce qui manque');
  assert.equal(r.noBeamNotice, "Il faut d'abord une poutre de 3 m au pied du dé.");
  assert.equal(r.noBeamMode, 'play', 'sans poutre, pas de question');
  assert.equal(r.wrongBeamNotice, "Il faut d'abord une poutre de 3 m au pied du dé.", 'un rondin ou une poutre de 2 m ne comptent pas');
  assert.equal(r.farNotice, "Il faut d'abord une poutre de 3 m au pied du dé.", 'une poutre à plus d’une case ne compte pas');
  assert.equal(r.shortGood, 'Maintiens E pour appeler ta mère.');
  assert.equal(r.shortMode, 'play');
  assert.equal(r.askMode, 'dialogue', '« Appeler ta mère pour la dresser ? »');
  assert.equal(r.fadeMode, 'transition', 'fondu au noir');
  assert.equal(r.motherNotice, "Ta mère vient t'aider.");
  {
    const d = JSON.parse(r.helped);
    assert.equal(d.mode, 'play');
    assert.equal(d.hands, '[null,null]null', 'Xéros n’a rien porté');
    assert.equal(d.posts, 1, 'le poteau haut est debout sur le dé');
    assert.equal(d.beamOnGround, 0, 'la poutre couchée a disparu');
    assert.equal(d.status, 'Abri à bois : poteaux, 3 sur 4');
    assert.ok(Math.abs(d.cost - 0.5 * 0.06 * 108) < 1e-6, `la moitié de l’effort qu’il paierait seul : ${d.cost}`);
  }
  assert.ok(Math.abs(r.massHigh - 108) < 0.2, `poutre de 3 m : environ 108 kg (${r.massHigh})`);
  assert.equal(JSON.parse(r.highPieces).length, 300, 'la pièce d’origine du poteau haut est gardée');
  {
    const d = JSON.parse(r.secondHigh);
    assert.equal(d.posts, 2);
    assert.equal(d.placed, 8);
    assert.ok(Math.abs(d.cost - 0.5 * 0.06 * 108) < 1e-6, `deuxième poteau haut : ${d.cost}`);
  }
  {
    const d = r.lookHigh;
    assert.equal(d.count, 2);
    assert.deepEqual(d.pieces, ['{"size":"normal","length":300,"shape":"round","hewn":12,"axis":"up"}'], 'le poteau haut est la poutre de 3 m, équarrie, debout');
    assert.deepEqual(d.keys, [r.upKeys[0]], 'son image est celle de la pièce de bois debout');
    assert.ok(d.sil.every((s: any) => Math.abs(s.w - d.want.w) <= 2 && Math.abs(s.h - d.want.h) <= 2), `une poutre de 3 m dressée fait la taille au gabarit : ${JSON.stringify(d.sil)}, attendu ${JSON.stringify(d.want)}`);
    assert.ok(d.sil.every((s: any) => Math.abs(s.w - d.lying) <= 1), `la poutre de 3 m debout (${JSON.stringify(d.sil)}) a l'épaisseur de la même couchée (${d.lying} px)`);
  }
  assert.equal(r.status, 'Abri à bois : sablières, 0 sur 4', 'quatre poteaux : la ligne passe aux sablières');
  assert.equal(r.ghostsPlates.length, 4, 'les quatre sablières en fantôme');
  assert.ok(r.ghostsPlates.every((k: string) => k.startsWith('shed-plate')), `fantômes de sablière : ${r.ghostsPlates}`);
  {
    const d = JSON.parse(r.highAtGhost);
    assert.deepEqual(d.posts, d.ghosts, 'poteau haut exactement sur son fantôme');
  }
  assert.equal(r.plateNotice, 'Cette étape viendra plus tard.', 'les sablières ne se posent pas encore');

  // 5. la page rechargée : les quatre poteaux et la ligne « sablières » sont retrouvés
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
      placed: Object.keys(sites[0].placed).length,
      pieces: Object.fromEntries(Object.entries(sites[0].pieces).map(([k, v]: [string, any]) => [k, v.length])),
      posts: w.map.props.filter((p: any) => p.type === 'wood-piece' && p.wood?.axis === 'up').length,
      status: w.site.texts.map((t: any) => t.text.text),
    };
  });
  console.log(JSON.stringify(after));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(after.map, 'ferme');
  assert.equal(after.placed, 8, 'quatre dés et quatre poteaux');
  assert.deepEqual(after.pieces, { 'post-nw': 300, 'post-ne': 300, 'post-se': 180, 'post-sw': 180 }, 'les pièces d’origine sont retrouvées');
  assert.equal(after.posts, 4, 'les quatre poteaux sont sur la carte');
  assert.deepEqual(after.status, ['Abri à bois : sablières, 0 sur 4']);
  console.log('  ✓ poteaux : les refus, deux poteaux portés, deux dressés avec l’aide de la mère, les sablières en fantôme, et tout retrouvé après rechargement');
});
