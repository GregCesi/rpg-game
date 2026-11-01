// Test de scénario de la partie neuve, dans le vrai jeu (voir tools/lib/playtest.ts) : une partie neuve remet le souffle, le plafond,
// le maximum et l'horloge aux valeurs de départ (stamina.json, time.json), par ?reset comme par ?dieu « Toute la partie », même quand
// Xéros vient de courir (l'endurance encore gardée par la scène, pas encore écrite, ne retombe pas dans la partie neuve) ; ?dieu
// « Endurance de départ » remet l'endurance seule.
// Usage : npm run test:reset (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('reset', async ({ page, errors, load }) => {
  // l'endurance et l'horloge loin du départ, et des points dépensés que la scène n'a pas encore écrits (une course de 0,8 s)
  const spend = () =>
    page.evaluate(async () => {
      const g = (window as any).game;
      g.events.emit('dieu', { kind: 'stamina', breath: 30, ceiling: 40, max: 150 });
      g.events.emit('dieu', { kind: 'clock', hour: 20 });
      await new Promise((r) => setTimeout(r, 300));
      g.scene.getScene('world').player.stamina.drain(0.5, 800, 2);
    });
  const read = () =>
    page.evaluate(async () => {
      const stateUrl = '/src/state/index.ts';
      const contentUrl = '/src/content/index.ts';
      const gs = await import(stateUrl);
      const content = await import(contentUrl);
      const s = (window as any).game.scene.getScene('world').player.stamina;
      const v = content.stamina.max.start;
      return {
        state: gs.game.stamina,
        live: { breath: s.breath, ceiling: s.ceiling, max: s.max },
        hour: Math.floor(gs.game.clock.minute / 60),
        day: gs.game.clock.day,
        start: { breath: v, ceiling: v, max: v, woke: v },
        wake: content.time.wakeHour,
      };
    });
  const fresh = (r: Awaited<ReturnType<typeof read>>, how: string) => {
    assert.deepEqual(r.state, r.start, `${how} : souffle, plafond, maximum de départ (${JSON.stringify(r.state)})`);
    assert.deepEqual(r.live, { breath: r.start.breath, ceiling: r.start.ceiling, max: r.start.max }, `${how} : Xéros repart avec eux`);
    assert.equal(r.day, 1, `${how} : jour 1`);
    assert.equal(r.hour, r.wake, `${how} : à l'heure du lever`);
  };

  // ?dieu « Toute la partie »
  await spend();
  await page.evaluate(async () => {
    (window as any).game.events.emit('dieu', { kind: 'reset-game' });
    const w = () => (window as any).game.scene.getScene('world');
    const t = performance.now();
    await new Promise((r) => setTimeout(r, 300));
    while ((w().mode !== 'play' || !w().player) && performance.now() - t < 8000) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 300));
  });
  fresh(await read(), 'recommencer depuis ?dieu');

  // ?reset
  await spend();
  await load('?dieu&reset');
  fresh(await read(), '?reset');

  // ?dieu « Endurance de départ » : l'endurance seule
  await spend();
  const hour = (await read()).hour;
  await page.evaluate(async () => {
    (window as any).game.events.emit('dieu', { kind: 'stamina-start' });
    await new Promise((r) => setTimeout(r, 300));
  });
  const r = await read();
  assert.deepEqual(r.state, r.start, `Endurance de départ : ${JSON.stringify(r.state)}`);
  assert.equal(r.live.ceiling, r.start.ceiling, 'Xéros repart avec');
  assert.equal(r.hour, hour, "l'horloge ne bouge pas");
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  console.log('  ✓ reset : une partie neuve (?reset, ?dieu) remet l’endurance et l’horloge de départ, même après une course ; « Endurance de départ »');
});
