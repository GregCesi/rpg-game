// Test de scénario du temps (docs/CONCEPTION.md, « Le temps »), dans le vrai jeu (voir tools/lib/playtest.ts) :
// - l'horloge à x1 : l'accélération du temps est en pause (time.json, `accelerate`) ; V ne fait rien, l'heure s'affiche sans vitesse ;
// - les travaux en temps réel : abattre un arbre normal se lance d'un appui, Xéros répète son geste, une jauge se remplit au-dessus de
//   lui, l'endurance se paie au fil des coups et l'horloge avance au rythme réel (pas de saut) ; un pas l'arrête, la part faite est
//   gardée (sauvegarde comprise : retrouvée après rechargement) et le travail repris continue de là ; ?dieu « Finir le travail » le
//   termine d'un coup : l'arbre tombe, l'horloge avance de ce qui manquait, l'endurance paie le reste ;
// - à bout de souffle, le travail attend sans message d'épuisement, avec un signe visible (Xéros souffle, la part « revient » de la
//   barre clignote), puis reprend ;
// - le sommeil et la veille : éveillé la nuit (22 h), le plafond s'use de 0,5 par heure de jeu ; dormir mène au lever (6 h le
//   lendemain), avec le plafond et le maximum que donne la nuit (world/sleep.ts), et le dit.
// Usage : npm run test:temps (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('temps', async ({ page, errors, load }) => {
  // 1 et 2 : l'horloge, l'abattage commencé puis arrêté
  const first = (await page.evaluate(async () => {
    const sleep = (t: number) => new Promise((res) => setTimeout(res, t));
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    const g = (window as any).game;
    const w = () => g.scene.getScene('world');
    const urls = { state: '/src/state/index.ts', clock: '/src/systems/clock.ts', content: '/src/content/index.ts' };
    const gs = await import(urls.state);
    const { ClockSystem } = await import(urls.clock);
    const content = await import(urls.content);
    const notices: string[] = [];
    g.events.on('notice', (t: string) => notices.push(t));
    const send = async (c: unknown, ms = 150) => {
      g.events.emit('dieu', c);
      await sleep(ms);
    };
    // de vrais keyCode : Phaser tient pour doublon deux appuis de même keyCode au même instant
    const KEY_CODES: Record<string, number> = { KeyV: 86, Space: 32, KeyD: 68 };
    const press = async (code: string) => {
      const keyCode = KEY_CODES[code] ?? 0;
      window.dispatchEvent(new KeyboardEvent('keydown', { code, keyCode } as KeyboardEventInit));
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code, keyCode } as KeyboardEventInit));
      await frame();
    };
    const minutes = () => gs.game.clock.day * 1440 + gs.game.clock.minute;
    const out: Record<string, any> = {};
    await send({ kind: 'map', map: 'ferme' }, 1500);
    await send({ kind: 'stamina', breath: 100, ceiling: 100, max: 100 });

    // 1. l'horloge à x1 : 2 s jouées font 2 s de jeu ; V ne change rien ; l'heure sans vitesse
    out.accelerate = content.time.accelerate;
    const m0 = minutes();
    const t0 = performance.now();
    await sleep(2000);
    out.x1 = { game: minutes() - m0, real: performance.now() - t0, speed: ClockSystem.speed };
    const told = notices.length;
    await press('KeyV');
    await sleep(300);
    out.v = { speed: ClockSystem.speed, notices: notices.slice(told) };
    const texts = (list: any[]): string[] => list.flatMap((o: any) => (o.type === 'Text' ? [o.text] : o.list ? texts(o.list) : []));
    out.hud = texts(g.scene.getScene('hud').children.list).find((t: string) => /^Jour \d+ · \d\d:\d\d/.test(t));

    // 2. abattre un arbre normal : un appui lance le travail, Xéros frappe tant qu'on ne l'arrête pas
    const tree = w().map.props.find((p: any) => p.type === 'normal-tree' && p.image.visible);
    if (!tree) throw new Error('pas d’arbre normal debout sur la ferme');
    await send({ kind: 'give', held: { item: 'axe' } });
    const a = w().player.actor;
    a.body.reset(Math.round(tree.aimX - 14), Math.round(tree.aimY));
    a.face('right');
    await sleep(200);
    const c0 = w().player.stamina.ceiling;
    const before = minutes();
    const tReal = performance.now();
    await press('Space');
    await sleep(3000);
    out.working = {
      mode: w().mode,
      busy: w().player.tools.busy,
      bar: w().works.bar.frame.visible,
      fill: w().works.bar.fill.visible,
      game: minutes() - before,
      real: performance.now() - tReal,
      paid: c0 - w().player.stamina.ceiling,
      standing: w().map.props.includes(tree),
    };
    // un pas l'arrête : ce qui est fait reste, gardé dans GameState
    await press('KeyD');
    await sleep(300);
    const kept = gs.mapState(gs.game, 'ferme').work[`o${tree.id}`];
    out.stopped = { mode: w().mode, bar: w().works.bar.frame.visible, kept, standing: w().map.props.includes(tree) };
    out.tree = { id: tree.id, x: Math.round(tree.aimX - 14), y: Math.round(tree.aimY) };
    out.cost = content.stamina.costs.chop * content.props['normal-tree'].harvest.hits;
    return out;
  })) as Record<string, any>;
  console.log(JSON.stringify(first));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(first.accelerate, false, 'l’accélération du temps est en pause (time.json)');
  assert.equal(first.x1.speed, 1, 'le temps va à x1');
  assert.ok(Math.abs(first.x1.game - first.x1.real / 60000) < 0.01, `à x1, ${(first.x1.real / 1000).toFixed(1)} s jouées font autant de jeu (${(first.x1.game * 60).toFixed(1)} s)`);
  assert.equal(first.v.speed, 1, 'V ne change pas la vitesse');
  assert.deepEqual(first.v.notices, [], 'V ne dit rien');
  assert.ok(first.hud && !/x\d/.test(first.hud), `l’heure s’affiche, sans vitesse (${first.hud})`);
  assert.equal(first.working.mode, 'work', 'Espace devant l’arbre lance le travail');
  assert.ok(first.working.busy, 'Xéros frappe');
  // sur 25 min, un pixel de jauge (16 px) vaut un peu plus d'une minute et demie : après 3 s, le remplissage n'a pas encore paru
  assert.ok(first.working.bar, 'la jauge se voit au-dessus de Xéros');
  assert.ok(first.working.standing, 'l’arbre tient encore après 3 s (25 min de travail)');
  assert.ok(Math.abs(first.working.game - first.working.real / 60000) < 0.01, `l’horloge avance au rythme réel, sans saut (${(first.working.game * 60).toFixed(1)} s)`);
  assert.ok(first.working.paid > 0 && first.working.paid < first.cost / 10, `l’endurance se paie au fil des coups (${first.working.paid.toFixed(4)})`);
  assert.equal(first.stopped.mode, 'play', 'un pas arrête le travail');
  assert.equal(first.stopped.bar, false, 'la jauge disparaît');
  assert.ok(first.stopped.standing, 'l’arbre entamé reste debout');
  assert.ok(first.stopped.kept?.work === 'harvest' && first.stopped.kept.minutes > 0, `la part faite est gardée (${JSON.stringify(first.stopped.kept)})`);

  // 3. la page rechargée (sans effacer la sauvegarde) : la part faite est retrouvée, le travail repris continue de là, puis « Finir »
  await load('?dieu');
  const second = (await page.evaluate(async (t: any) => {
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    const g = (window as any).game;
    const w = () => g.scene.getScene('world');
    const urls = { state: '/src/state/index.ts', content: '/src/content/index.ts' };
    const gs = await import(urls.state);
    const content = await import(urls.content);
    const notices: string[] = [];
    g.events.on('notice', (n: string) => notices.push(n));
    const send = async (c: unknown, ms = 150) => {
      g.events.emit('dieu', c);
      await sleep(ms);
    };
    const press = async (code: string) => {
      const keyCode = code === 'Space' ? 32 : 0;
      window.dispatchEvent(new KeyboardEvent('keydown', { code, keyCode } as KeyboardEventInit));
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code, keyCode } as KeyboardEventInit));
      await frame();
    };
    const minutes = () => gs.game.clock.day * 1440 + gs.game.clock.minute;
    const out: Record<string, any> = {};
    const h = content.props['normal-tree'].harvest;
    out.reloaded = { map: w().map.def.id, kept: gs.mapState(gs.game, 'ferme').work[`o${t.id}`] };
    const tree = w().map.props.find((p: any) => p.id === t.id && !p.spawned);
    const a = w().player.actor;
    a.body.reset(t.x, t.y);
    a.face('right');
    await sleep(200);
    await press('Space');
    await sleep(300);
    out.resumed = { mode: w().mode, done: w().works.done };
    const c1 = w().player.stamina.ceiling;
    const m1 = minutes();
    const done = w().works.done;
    const paidBefore = w().works.paid;
    await send({ kind: 'finish-work' }, 3000);
    out.finished = {
      gone: !w().map.props.includes(tree),
      felled: w().map.props.some((p: any) => p.type === 'normal-felled-tree'),
      mode: w().mode,
      jump: minutes() - m1,
      expectJump: h.minutes - done,
      paid: c1 - w().player.stamina.ceiling,
      expectPaid: (content.stamina.costs.chop * h.hits * (h.minutes - paidBefore)) / h.minutes,
      work: Object.keys(gs.mapState(gs.game, 'ferme').work).length,
    };

    // 4. à bout de souffle : le travail attend, sans message, Xéros souffle et la barre clignote ; puis il reprend
    const other = w().map.props.find((p: any) => p.type === 'normal-tree' && p.image.visible && p !== tree);
    if (!other) throw new Error('pas de second arbre normal debout sur la ferme');
    a.body.reset(Math.round(other.aimX - 14), Math.round(other.aimY));
    a.face('right');
    await send({ kind: 'stamina', breath: 0, ceiling: 80, max: 100 }, 50);
    const told = notices.length;
    const ceiling0 = gs.game.stamina.ceiling;
    await press('Space');
    const t3 = performance.now();
    while (!w().player.stamina.winded && performance.now() - t3 < 3000) await frame();
    await frame();
    await frame();
    const hud = g.scene.getScene('hud');
    const puff = w().player.breath.puff;
    out.winded = {
      winded: w().player.stamina.winded,
      puff: puff.visible && puff.anims.isPlaying,
      blink: hud.blink?.isPlaying() ?? false,
      notices: notices.slice(told),
      ceiling: gs.game.stamina.ceiling - ceiling0,
      mode: w().mode,
    };
    // le souffle revient (délai, puis 30 % du plafond à 12 par seconde : un peu moins de 3 s), le travail reprend
    const t1 = performance.now();
    while (w().player.stamina.winded && performance.now() - t1 < 8000) await frame();
    const ms = performance.now() - t1;
    await sleep(1500);
    out.recovered = { ms, puff: puff.visible, blink: !!hud.blink, mode: w().mode, busy: w().player.tools.busy };
    await send({ kind: 'finish-work' }, 2500);
    out.secondFelled = !w().map.props.includes(other);
    return out;
  }, first.tree)) as Record<string, any>;
  console.log(JSON.stringify(second));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.deepEqual(second.reloaded.kept, first.stopped.kept, 'la part faite est retrouvée après rechargement');
  assert.equal(second.resumed.mode, 'work', 'Espace reprend le travail');
  assert.ok(second.resumed.done >= first.stopped.kept.minutes, `il reprend là où il s’était arrêté (${second.resumed.done} ≥ ${first.stopped.kept.minutes})`);
  assert.ok(second.finished.gone && second.finished.felled, '« Finir le travail » : l’arbre est abattu');
  assert.equal(second.finished.mode, 'play', 'le travail fini rend la main');
  assert.ok(Math.abs(second.finished.jump - second.finished.expectJump) < 0.15, `l’horloge avance de ce qui manquait (${second.finished.jump.toFixed(2)} min)`);
  assert.ok(Math.abs(second.finished.paid - second.finished.expectPaid) < 0.01, `l’endurance paie le reste (${second.finished.paid.toFixed(3)} ; ${second.finished.expectPaid.toFixed(3)} attendu)`);
  assert.equal(second.finished.work, 0, 'le travail fini ne laisse rien dans GameState');
  assert.ok(second.winded.winded, 'à bout de souffle, Xéros est essoufflé');
  assert.ok(second.winded.puff, 'il souffle : la bouffée se voit');
  assert.ok(second.winded.blink, 'la part « revient » de la barre clignote');
  assert.deepEqual(second.winded.notices, [], 'aucun message (ni « épuisé »)');
  assert.equal(second.winded.ceiling, 0, 'le coup qui attend ne coûte rien');
  assert.equal(second.winded.mode, 'work', 'le travail attend, il ne s’arrête pas');
  assert.ok(second.recovered.ms < 6000 && !second.recovered.puff && !second.recovered.blink, `le souffle revient en ${(second.recovered.ms / 1000).toFixed(1)} s, les signes s'éteignent`);
  assert.ok(second.recovered.mode === 'work' && second.recovered.busy, 'le travail a repris');
  assert.ok(second.secondFelled, 'puis « Finir le travail » l’achève');

  // 5. la veille de nuit, puis dormir
  const third = (await page.evaluate(async () => {
    const sleep = (t: number) => new Promise((res) => setTimeout(res, t));
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    const g = (window as any).game;
    const w = () => g.scene.getScene('world');
    const urls = { state: '/src/state/index.ts', clock: '/src/systems/clock.ts', content: '/src/content/index.ts', sleep: '/src/world/sleep.ts', time: '/src/world/clock.ts' };
    const gs = await import(urls.state);
    const { ClockSystem } = await import(urls.clock);
    const content = await import(urls.content);
    const notices: string[] = [];
    g.events.on('notice', (t: string) => notices.push(t));
    const send = async (c: unknown, ms = 150) => {
      g.events.emit('dieu', c);
      await sleep(ms);
    };
    const minutes = () => gs.game.clock.day * 1440 + gs.game.clock.minute;
    const out: Record<string, any> = {};
    await send({ kind: 'clock', hour: 22 });
    await send({ kind: 'stamina', breath: 40, ceiling: 40, max: 100 });
    // pour l'essai, le temps va plus vite (l'accélération est en pause pour le joueur, pas pour le test)
    ClockSystem.speed = 360;
    const c0 = w().player.stamina.ceiling;
    const n0 = minutes();
    await sleep(2500);
    ClockSystem.speed = 1;
    out.night = { minutes: minutes() - n0, worn: c0 - w().player.stamina.ceiling, perHour: content.stamina.sleep.nightAwakePerHour };
    w().player.stamina.flush();
    const sleepMod = await import(urls.sleep);
    const { between } = await import(urls.time);
    const bed = { ...gs.game.clock };
    const wakeAt = sleepMod.wakeTime(bed, content.time.wakeHour, content.stamina.sleep.hours);
    const expect = sleepMod.morning(content.stamina, gs.game.stamina, between(bed, wakeAt));
    const told = notices.length;
    w().onDialogueEnd('sleep');
    const t2 = performance.now();
    while ((gs.game.clock.day === bed.day || w().mode !== 'play') && performance.now() - t2 < 8000) await frame();
    await sleep(300);
    out.slept = { bed, clock: { ...gs.game.clock }, wakeAt, stamina: { ...gs.game.stamina }, expect, live: w().player.stamina.ceiling, notices: notices.slice(told) };
    return out;
  })) as Record<string, any>;
  console.log(JSON.stringify(third));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  const nightExpected = (third.night.minutes / 60) * third.night.perHour;
  assert.ok(third.night.minutes > 5 && Math.abs(third.night.worn - nightExpected) < 0.02, `la nuit, ${third.night.minutes.toFixed(0)} min de veille usent ${nightExpected.toFixed(2)} (${third.night.worn.toFixed(3)})`);
  // à la minute près : l'horloge a repris depuis le lever
  assert.ok(third.slept.clock.day === third.slept.wakeAt.day && Math.floor(third.slept.clock.minute) === third.slept.wakeAt.minute, 'dormir mène au lever');
  assert.equal(third.slept.wakeAt.minute, 6 * 60, 'couché vers 22 h, levé à 6 h');
  assert.ok(Math.abs(third.slept.stamina.ceiling - third.slept.expect.ceiling) < 1e-6 && Math.abs(third.slept.stamina.max - third.slept.expect.max) < 1e-6, 'le plafond et le maximum que donne la nuit');
  assert.ok(Math.abs(third.slept.live - third.slept.expect.ceiling) < 1e-6, 'Xéros se lève avec ce plafond');
  assert.ok(third.slept.notices.includes(`Jour ${third.slept.clock.day} · 06:00`), `le réveil se dit (${third.slept.notices.join(' | ')})`);
  console.log(
    "  ✓ temps : l'horloge à x1, V sans effet ; abattre en temps réel (jauge, endurance au fil des coups, pas de saut d'horloge), arrêté d'un pas, repris après rechargement, fini d'un coup ; à bout de souffle le travail attend puis reprend ; la veille de nuit, dormir",
  );
});
