// Test de scénario du temps (docs/CONCEPTION.md, « Le temps »), dans le vrai jeu (voir tools/lib/playtest.ts) :
// - étape 1, l'horloge : elle avance à la vitesse du temps (x24 par défaut), V passe au palier suivant et le dit, Maj + V revient ;
//   l'heure s'affiche en haut à droite ;
// - étape 2, la durée des travaux : abattre un arbre normal (4 coups de cognée) avance l'horloge de ses 25 minutes de jeu (props.json),
//   le geste gardant sa durée ;
// - étape 3, l'endurance en trois niveaux : à bout de souffle, un coup de cognée attend sans message d'épuisement, avec un signe
//   visible (Xéros souffle, la part « revient » de la barre clignote), puis se fait quand le souffle est revenu ;
// - étape 4, le sommeil et la veille : éveillé la nuit (22 h), le plafond s'use de 0,5 par heure de jeu ; dormir mène au lever (6 h
//   le lendemain), avec le plafond et le maximum que donne la nuit (world/sleep.ts), et le dit.
// Usage : npm run test:temps (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('temps', async ({ page, errors }) => {
  const r = (await page.evaluate(async () => {
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
    const press = async (code: string, shift = false) => {
      if (shift) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', shiftKey: true }));
      // comme un vrai clavier : la touche pressée avec Maj porte `shiftKey`
      window.dispatchEvent(new KeyboardEvent('keydown', { code, shiftKey: shift }));
      // un appui d'au moins une image (Phaser lit les touches à chaque image ; un appui synthétique plus bref se perd avec Maj)
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code, shiftKey: shift }));
      if (shift) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
      await frame();
    };
    const minutes = () => gs.game.clock.day * 1440 + gs.game.clock.minute;
    const out: Record<string, any> = {};
    await send({ kind: 'map', map: 'ferme' }, 1500);
    await send({ kind: 'stamina-infinite', on: true });

    // 1. l'horloge à x24 : 2 s jouées font 0,8 minute de jeu
    ClockSystem.speed = content.time.default;
    const m0 = minutes();
    const t0 = performance.now();
    await sleep(2000);
    out.x24 = { game: minutes() - m0, real: performance.now() - t0 };
    // V : le palier suivant, Maj + V : le précédent ; le HUD écrit l'heure
    await press('KeyV');
    out.up = { speed: ClockSystem.speed, notice: notices.at(-1) };
    await sleep(300);
    await press('KeyV', true);
    out.down = { speed: ClockSystem.speed };
    // les textes du HUD, dans ses groupes compris
    const texts = (list: any[]): string[] => list.flatMap((o: any) => (o.type === 'Text' ? [o.text] : o.list ? texts(o.list) : []));
    out.hud = texts(g.scene.getScene('hud').children.list).find((t: string) => /^Jour \d+ · \d\d:\d\d/.test(t));

    // 2. abattre un arbre normal : l'horloge avance de la durée du travail (à x1, le temps qui passe en jouant compte à peine)
    ClockSystem.speed = 1;
    const tree = w().map.props.find((p: any) => p.type === 'normal-tree' && p.image.visible);
    if (!tree) throw new Error('pas d’arbre normal debout sur la ferme');
    await send({ kind: 'give', held: { item: 'axe' } });
    const a = w().player.actor;
    a.body.reset(Math.round(tree.aimX - 14), Math.round(tree.aimY));
    a.face('right');
    await sleep(200);
    const before = minutes();
    const tReal = performance.now();
    for (let i = 0; i < 12 && w().map.props.includes(tree); i++) {
      await press('Space');
      while (w().mode !== 'play') await frame();
    }
    out.felled = { gone: !w().map.props.includes(tree), game: minutes() - before, real: performance.now() - tReal, expect: content.props['normal-tree'].harvest.minutes };

    // 3. à bout de souffle : le coup attend, sans message, Xéros souffle et la barre clignote ; puis il se fait
    const other = w().map.props.find((p: any) => p.type === 'normal-tree' && p.image.visible && p !== tree);
    if (!other) throw new Error('pas de second arbre normal debout sur la ferme');
    a.body.reset(Math.round(other.aimX - 14), Math.round(other.aimY));
    a.face('right');
    await send({ kind: 'stamina-infinite', on: false });
    await send({ kind: 'stamina', breath: 0, ceiling: 80, max: 100 }, 50);
    const told = notices.length;
    const ceiling0 = gs.game.stamina.ceiling;
    await press('Space');
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
    // le souffle revient (délai, puis 30 % du plafond à 12 par seconde : un peu moins de 3 s)
    const t1 = performance.now();
    while (w().player.stamina.winded && performance.now() - t1 < 8000) await frame();
    const ms = performance.now() - t1;
    // la bouffée se cache à l'image suivante (Player.update)
    await frame();
    await frame();
    out.recovered = { ms, puff: puff.visible, blink: !!hud.blink };
    await press('Space');
    while (w().mode !== 'play') await frame();
    out.after = { ceiling: gs.game.stamina.ceiling - ceiling0, cost: content.stamina.costs.chop };

    // 4. la veille de nuit, puis dormir
    await send({ kind: 'clock', hour: 22 });
    await send({ kind: 'stamina', breath: 40, ceiling: 40, max: 100 });
    ClockSystem.speed = 360;
    const c0 = w().player.stamina.ceiling;
    const n0 = minutes();
    await sleep(2500);
    ClockSystem.speed = content.time.default;
    out.night = { minutes: minutes() - n0, worn: c0 - w().player.stamina.ceiling, perHour: content.stamina.sleep.nightAwakePerHour };
    w().player.stamina.flush();
    const sleepMod = await import(urls.sleep);
    const { between } = await import(urls.time);
    const bed = { ...gs.game.clock };
    const wakeAt = sleepMod.wakeTime(bed, content.time.wakeHour, content.stamina.sleep.hours);
    const expect = sleepMod.morning(content.stamina, gs.game.stamina, between(bed, wakeAt));
    const told2 = notices.length;
    w().onDialogueEnd('sleep');
    const t2 = performance.now();
    while ((gs.game.clock.day === bed.day + 0 || w().mode !== 'play') && performance.now() - t2 < 8000) await frame();
    await sleep(300);
    out.slept = { bed, clock: { ...gs.game.clock }, wakeAt, stamina: { ...gs.game.stamina }, expect, live: w().player.stamina.ceiling, notices: notices.slice(told2) };
    await send({ kind: 'stamina-infinite', on: true });
    return out;
  })) as Record<string, any>;
  console.log(JSON.stringify(r));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  const expected = (r.x24.real / 60000) * 24;
  assert.ok(Math.abs(r.x24.game - expected) < 0.2, `à x24, ${(r.x24.real / 1000).toFixed(1)} s jouées font ${expected.toFixed(2)} min de jeu (${r.x24.game.toFixed(2)})`);
  assert.equal(r.up.speed, 60, 'V : x60');
  assert.equal(r.up.notice, 'Le temps : x60', 'V le dit');
  assert.equal(r.down.speed, 24, 'Maj + V : de nouveau x24');
  assert.ok(r.hud, 'l’heure s’affiche en haut à droite');
  assert.ok(r.felled.gone, 'l’arbre est abattu');
  const played = r.felled.real / 60000;
  assert.ok(Math.abs(r.felled.game - (r.felled.expect + played)) < 0.5, `abattre un arbre normal avance l'horloge de ${r.felled.expect} min (${r.felled.game.toFixed(2)})`);
  assert.ok(r.winded.winded, 'à bout de souffle, Xéros est essoufflé');
  assert.ok(r.winded.puff, 'il souffle : la bouffée se voit');
  assert.ok(r.winded.blink, 'la part « revient » de la barre clignote');
  assert.deepEqual(r.winded.notices, [], 'aucun message (ni « épuisé »)');
  assert.equal(r.winded.ceiling, 0, 'le coup qui attend ne coûte rien');
  assert.ok(r.recovered.ms < 6000 && !r.recovered.puff && !r.recovered.blink, `le souffle revient en ${(r.recovered.ms / 1000).toFixed(1)} s, les signes s'éteignent`);
  assert.ok(Math.abs(r.after.ceiling + r.after.cost) < 0.01, `le coup se fait ensuite et coûte son prix (${r.after.ceiling.toFixed(2)})`);
  const nightExpected = (r.night.minutes / 60) * r.night.perHour;
  assert.ok(r.night.minutes > 5 && Math.abs(r.night.worn - nightExpected) < 0.02, `la nuit, ${r.night.minutes.toFixed(0)} min de veille usent ${nightExpected.toFixed(2)} (${r.night.worn.toFixed(3)})`);
  // à la minute près : l'horloge a repris depuis le lever
  assert.ok(r.slept.clock.day === r.slept.wakeAt.day && Math.floor(r.slept.clock.minute) === r.slept.wakeAt.minute, 'dormir mène au lever');
  assert.equal(r.slept.wakeAt.minute, 6 * 60, 'couché vers 22 h, levé à 6 h');
  assert.ok(Math.abs(r.slept.stamina.ceiling - r.slept.expect.ceiling) < 1e-6 && Math.abs(r.slept.stamina.max - r.slept.expect.max) < 1e-6, 'le plafond et le maximum que donne la nuit');
  assert.ok(Math.abs(r.slept.live - r.slept.expect.ceiling) < 1e-6, 'Xéros se lève avec ce plafond');
  assert.ok(r.slept.notices.includes(`Jour ${r.slept.clock.day} · 06:00`), `le réveil se dit (${r.slept.notices.join(' | ')})`);
  console.log(`  ✓ temps : l'horloge à x24, V et Maj + V, l'heure à l'écran ; un arbre normal abattu en ${(r.felled.real / 1000).toFixed(1)} s de gestes avance l'horloge de ${r.felled.expect} min ; à bout de souffle, le coup attend (Xéros souffle, la barre clignote), puis se fait ; la veille de nuit use le plafond, dormir mène au lever avec ce que rend la nuit`);
});
