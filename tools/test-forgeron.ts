// Le forgeron du village, dans le vrai jeu (tools/lib/playtest.ts), depuis une partie neuve (chantier « forgeron », décisions de
// Grégoire du 5 novembre 2026) :
//   - il est à sa place, déclarée dans le plan `forge` (`npcs`) : derrière l'enclume, tourné vers le sud, au travail (`work-down`) ;
//   - sa collision aux pieds est la sienne, 14 × 8 px (`feet` de characters.json), pas les 10 × 8 de tous ;
//   - Xéros vient du bord de la carte du village jusque devant l'enclume, à pied, par un chemin libre, se tourne vers lui et lui parle
//     (E) : le forgeron pose son marteau et se tourne vers lui (`talk-down`, Xéros est au sud), dit sa réplique (`smith-greeting`) avec le portrait
//     souriant ; à la fin du dialogue, il reprend le travail, tourné vers le sud ;
//   - il ne ferme pas le passage vers le feu : la visite de la forge (npm run test:forge-visite) le vérifie, de la maison au feu.
// Usage : npm run test:forgeron.

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';
import { walker } from './lib/walk';

await playtest('forgeron', async ({ page, errors, load }) => {
  await load('?dieu&reset');
  const { where, goTo, routeTo } = walker(page);
  const W = (fn: string) => page.evaluate(fn);
  await W(`window.__idle('le réveil')`);
  await W(`window.game.events.emit('dieu', { kind: 'stamina-infinite', on: true })`);
  // au village (la commande ?dieu `map` : à son premier point d'arrivée), le forgeron y est
  await W(`window.__restart({ kind: 'map', map: 'village' })`);
  await W(`window.__idle('au village')`);

  /** Le forgeron dans la scène : sa place, sa direction, son animation, sa collision. */
  const smith = () =>
    page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const a = w.children.list.find((o: any) => o.texture?.key === 'smith');
      return a && { x: a.x, y: a.y, facing: a.facing as string, anim: a.anims.currentAnim?.key as string, feet: { w: a.body.width, h: a.body.height } };
    });
  const s = await smith();
  assert.ok(s, 'le forgeron est au village');
  // sa place : derrière l'enclume (au nord de son billot), tourné vers le sud, au travail
  const anvil = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const b = w.map.builds.find((q: any) => q.piece.piece.prop === 'anvil-block');
    return b && { x: b.piece.x / 5, y: b.piece.y / 5 };
  });
  assert.ok(anvil, "l'enclume de la forge est posée");
  assert.ok(s.y <= anvil.y, `derrière l'enclume, au nord de son billot (forgeron y=${s.y}, billot y=${anvil.y})`);
  assert.ok(Math.abs(s.x - (anvil.x + 6)) <= 4, `au droit de l'enclume (forgeron x=${s.x}, milieu du billot ${anvil.x + 6})`);
  assert.equal(s.facing, 'down', 'tourné vers le sud');
  assert.equal(s.anim, 'smith-work-down', `au travail (${s.anim})`);
  assert.deepEqual(s.feet, { w: 14, h: 8 }, 'sa collision aux pieds : 14 × 8 px');

  // Xéros vient devant l'enclume, au sud, à pied par un chemin libre
  const p = await where();
  const o = { x: p.wx - p.x, y: p.wy - p.y };
  const front = { x: Math.round(s.x / 4) * 4, y: Math.round((anvil.y + 24) / 4) * 4 };
  const route = await routeTo(front);
  assert.ok(route.length > 1, `un chemin libre jusque devant l'enclume (${JSON.stringify(front)})`);
  for (const c of route.slice(1)) {
    const now = await where();
    await goTo(o.x + c.x, o.y + c.y, Math.abs(o.x + c.x - now.wx) > Math.abs(o.y + c.y - now.wy) ? 'x' : 'y', 2);
  }
  // tourné vers le nord, sans faire un pas, puis E : il lui parle
  await W(`window.__face('up')`);
  await W(`window.__frames(2)`);
  await page.keyboard.press('KeyE');
  await W(`window.__until(() => window.game.scene.isActive('dialogue'), 'parler au forgeron')`);
  const said = await page.evaluate(() => {
    const d = (window as any).game.scene.getScene('dialogue');
    const line = d.lines?.[0];
    return { speaker: line?.speaker, expression: line?.expression, text: line?.text, portrait: d.portrait?.anims?.currentAnim?.key };
  });
  assert.equal(said.speaker, 'smith', `c'est le forgeron qui parle (${JSON.stringify(said)})`);
  assert.match(said.text ?? '', /^Tiens, le petit de la ferme\./, 'sa réplique');
  assert.equal(said.portrait, 'portrait-smith-64-smile', 'avec le portrait souriant');
  const talking = await smith();
  assert.equal(talking!.anim, 'smith-talk-down', `il pose son marteau et se tourne vers Xéros (${talking!.anim})`);
  // la fin du dialogue : il reprend le travail, tourné vers le sud
  for (let i = 0; i < 6 && (await page.evaluate(() => (window as any).game.scene.isActive('dialogue'))); i++) {
    await page.keyboard.press('KeyE');
    await W(`window.__frames(2)`);
  }
  await W(`window.__until(() => !window.game.scene.isActive('dialogue'), 'la fin du dialogue')`);
  const after = await smith();
  assert.equal(after!.anim, 'smith-work-down', `il reprend le travail (${after!.anim})`);
  assert.equal(after!.facing, 'down', 'tourné vers le sud');
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  console.log(`  ✓ forgeron : à l'enclume (${s.x}, ${s.y}), au travail, collision 14 × 8 ; Xéros lui parle, il se tourne et pose son marteau, sa réplique au portrait souriant, puis reprend le travail`);
});
