// Test de scénario du temps (docs/CONCEPTION.md, « Le temps »), dans le vrai jeu (voir tools/lib/playtest.ts) :
// - l'horloge à x1 : l'accélération du temps est en pause (time.json, `accelerate`) ; V ne fait rien, l'heure s'affiche sans vitesse ;
// - le travail au coup (docs/CONCEPTION.md, « Le travail ») : devant un arbre normal, un appui sur Espace donne un coup, qui enlève sa
//   part de la matière (world/workPlan.ts) ; Espace maintenu enchaîne les coups au rythme du modèle (la durée d'un coup, world/swing.ts),
//   chaque coup payé au plafond ; une jauge au-dessus de Xéros ; relâcher arrête, la part enlevée est gardée (sauvegarde comprise :
//   retrouvée après rechargement) et le travail repris continue de là ; ?dieu « Finir le travail » fait les coups qui restent d'un coup
//   (l'horloge avance de leur durée, pauses comprises, le plafond en paie le prix) ; à bout de souffle, Xéros s'arrête et souffle sans
//   message d'épuisement (la bouffée, la barre qui clignote), puis reprend tout seul si Espace est tenu ;
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
    const urls = { state: '/src/state/index.ts', clock: '/src/systems/clock.ts', content: '/src/content/index.ts', plan: '/src/world/workPlan.ts' };
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

    // 2. le travail au coup, devant un arbre normal
    const tree = w().map.props.find((p: any) => p.type === 'normal-tree' && p.image.visible);
    if (!tree) throw new Error('pas d’arbre normal debout sur la ferme');
    await send({ kind: 'give', held: { item: 'axe' } });
    const a = w().player.actor;
    a.body.reset(Math.round(tree.aimX - 14), Math.round(tree.aimY));
    a.face('right');
    await sleep(200);
    const plan = await import(urls.plan);
    const job = plan.harvestJob(content.props['normal-tree'].harvest.work, 'axe');
    const stroke = plan.jobStroke(job, content.strength.swing);
    out.model = { per: plan.perStroke(job, stroke) / job.amount, cycle: stroke.cycle, ceiling: plan.strokeCost(stroke).ceiling };
    // un appui : un coup
    const c0 = w().player.stamina.ceiling;
    await press('Space');
    while (w().mode !== 'play') await frame();
    await sleep(300);
    out.one = { done: gs.mapState(gs.game, 'ferme').work[`o${tree.id}`]?.done ?? 0, kept: gs.mapState(gs.game, 'ferme').work[`o${tree.id}`], paid: c0 - w().player.stamina.ceiling };
    // Espace maintenu : les coups s'enchaînent ; on relève la part enlevée à chaque coup
    const marks: { t: number; done: number }[] = [];
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', keyCode: 32 } as KeyboardEventInit));
    const t1 = performance.now();
    let seenWork = false;
    while (performance.now() - t1 < 7000) {
      if (w().mode === 'work') seenWork = true;
      const d = w().works.active ? w().works.done : -1;
      if (d >= 0 && d !== marks.at(-1)?.done) marks.push({ t: performance.now(), done: d });
      await frame();
    }
    out.held = { seenWork, bar: w().works.bar.frame.visible, mode: w().mode };
    // relâché : le coup en cours s'achève, puis le travail s'arrête
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', keyCode: 32 } as KeyboardEventInit));
    const t2 = performance.now();
    while (w().mode !== 'play' && performance.now() - t2 < 4000) await frame();
    await sleep(200);
    const kept = gs.mapState(gs.game, 'ferme').work[`o${tree.id}`];
    out.marks = marks.map((m) => ({ t: Math.round(m.t), done: m.done }));
    out.stopped = { mode: w().mode, bar: w().works.bar.frame.visible, kept, standing: w().map.props.includes(tree), paid: c0 - w().player.stamina.ceiling };
    out.tree = { id: tree.id, x: Math.round(tree.aimX - 14), y: Math.round(tree.aimY) };
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
  const m = first.model;
  assert.ok(Math.abs(first.one.done - m.per) < 1e-6, `un appui, un coup : ${first.one.done} de la matière enlevée (${m.per} par coup)`);
  assert.ok(Math.abs(first.one.paid - m.ceiling) < 1e-6, `un coup se paie au plafond (${first.one.paid})`);
  assert.equal(first.one.kept?.work, 'harvest', 'la part enlevée est gardée dans GameState');
  assert.ok(first.held.seenWork && first.held.bar, 'Espace maintenu : le travail, et sa jauge');
  // le premier relevé est le départ (le premier impact vient après armer, le temps en haut et abattre) : d'un impact au suivant
  const hits = first.marks.slice(1);
  const steps = hits.slice(1).map((x: any, i: number) => ({ dt: x.t - hits[i].t, dd: x.done - hits[i].done }));
  assert.ok(steps.length >= 2, `plusieurs coups enchaînés (${steps.length + 1})`);
  for (const st of steps) {
    assert.ok(Math.abs(st.dd - m.per) < 1e-6, `chaque coup enlève sa part (${st.dd})`);
    assert.ok(Math.abs(st.dt / 1000 - m.cycle) < 0.25 * m.cycle, `au rythme du modèle : ${(st.dt / 1000).toFixed(2)} s pour ${m.cycle.toFixed(2)} s`);
  }
  assert.equal(first.stopped.mode, 'play', 'Espace relâché : le travail s’arrête');
  assert.equal(first.stopped.bar, false, 'la jauge disparaît');
  assert.ok(first.stopped.standing, 'l’arbre entamé reste debout');
  assert.ok(first.stopped.kept?.work === 'harvest' && first.stopped.kept.done > m.per * 2, `la part faite est gardée (${JSON.stringify(first.stopped.kept)})`);

  // 3. la page rechargée (sans effacer la sauvegarde) : la part faite est retrouvée, le travail repris continue de là, puis « Finir »
  await load('?dieu');
  const second = (await page.evaluate(async (t: any) => {
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    const g = (window as any).game;
    const w = () => g.scene.getScene('world');
    const urls = { state: '/src/state/index.ts', content: '/src/content/index.ts', plan: '/src/world/workPlan.ts' };
    const gs = await import(urls.state);
    const content = await import(urls.content);
    const plan = await import(urls.plan);
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
    const job = plan.harvestJob(content.props['normal-tree'].harvest.work, 'axe');
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
    const left = plan.planOf(job, content.strength.swing, w().player.stamina.max, w().works.done);
    await send({ kind: 'finish-work' }, 3000);
    out.finished = {
      gone: !w().map.props.includes(tree),
      felled: w().map.props.some((p: any) => p.type === 'normal-felled-tree'),
      mode: w().mode,
      jump: minutes() - m1,
      expectJump: left.seconds / 60,
      paid: c1 - w().player.stamina.ceiling,
      expectPaid: left.ceiling,
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
    // Espace maintenu : le premier coup trouve le souffle vide, Xéros s'arrête et souffle
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', keyCode: 32 } as KeyboardEventInit));
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
    // le souffle revient (délai, puis 90 % du plafond à 12 par seconde : 7 s environ), le travail reprend, Espace toujours tenu
    const t1 = performance.now();
    while (w().player.stamina.winded && performance.now() - t1 < 15000) await frame();
    const ms = performance.now() - t1;
    await sleep(1500);
    out.recovered = { ms, puff: puff.visible, blink: !!hud.blink, mode: w().mode, busy: w().player.tools.busy };
    await send({ kind: 'finish-work' }, 2500);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', keyCode: 32 } as KeyboardEventInit));
    out.secondFelled = !w().map.props.includes(other);
    return out;
  }, first.tree)) as Record<string, any>;
  console.log(JSON.stringify(second));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.deepEqual(second.reloaded.kept, first.stopped.kept, 'la part faite est retrouvée après rechargement');
  assert.equal(second.resumed.mode, 'work', 'Espace reprend le travail');
  assert.ok(second.resumed.done >= first.stopped.kept.done, `il reprend là où il s’était arrêté (${second.resumed.done} ≥ ${first.stopped.kept.done})`);
  assert.ok(second.finished.gone && second.finished.felled, '« Finir le travail » : l’arbre est abattu');
  assert.equal(second.finished.mode, 'play', 'le travail fini rend la main');
  assert.ok(Math.abs(second.finished.jump - second.finished.expectJump) < 0.2, `l’horloge avance de ce qui manquait (${second.finished.jump.toFixed(2)} min)`);
  assert.ok(Math.abs(second.finished.paid - second.finished.expectPaid) < 0.01, `l’endurance paie le reste (${second.finished.paid.toFixed(3)} ; ${second.finished.expectPaid.toFixed(3)} attendu)`);
  assert.equal(second.finished.work, 0, 'le travail fini ne laisse rien dans GameState');
  assert.ok(second.winded.winded, 'à bout de souffle, Xéros est essoufflé');
  assert.ok(second.winded.puff, 'il souffle : la bouffée se voit');
  assert.ok(second.winded.blink, 'la part « revient » de la barre clignote');
  assert.deepEqual(second.winded.notices, [], 'aucun message (ni « épuisé »)');
  assert.equal(second.winded.ceiling, 0, 'le coup qui attend ne coûte rien');
  assert.equal(second.winded.mode, 'work', 'le travail attend son souffle, il ne s’arrête pas');
  assert.ok(second.recovered.ms < 12000 && !second.recovered.puff && !second.recovered.blink, `le souffle revient en ${(second.recovered.ms / 1000).toFixed(1)} s, les signes s'éteignent`);
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
    "  ✓ temps : l'horloge à x1, V sans effet ; le travail au coup (un appui un coup, maintenu au rythme du modèle, relâché il s'arrête), repris après rechargement, fini d'un coup ; à bout de souffle il souffle puis reprend ; la veille de nuit, dormir",
  );
});
