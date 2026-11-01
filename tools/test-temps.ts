// Test de scénario du temps (docs/CONCEPTION.md, « Le temps »), dans le vrai jeu (voir tools/lib/playtest.ts) :
// - étape 1, l'horloge : elle avance à la vitesse du temps (x24 par défaut), V passe au palier suivant et le dit, Maj + V revient ;
//   l'heure s'affiche en haut à droite ;
// - étape 2, la durée des travaux : abattre un arbre normal (4 coups de cognée) avance l'horloge de ses 25 minutes de jeu (props.json),
//   le geste gardant sa durée.
// Usage : npm run test:temps (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('temps', async ({ page, errors }) => {
  const r = (await page.evaluate(async () => {
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
    const press = async (code: string, shift = false) => {
      if (shift) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      // un appui d'au moins une image (Phaser lit les touches à chaque image ; un appui synthétique plus bref se perd avec Maj)
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
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
  console.log(`  ✓ temps : l'horloge à x24, V et Maj + V, l'heure à l'écran ; un arbre normal abattu en ${(r.felled.real / 1000).toFixed(1)} s de gestes avance l'horloge de ${r.felled.expect} min`);
});
