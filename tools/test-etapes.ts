// Test de scénario des étapes visibles d'un travail (docs/CONCEPTION.md, « Le travail », § 6), dans le vrai jeu : l'arbre normal
// abattu au coup passe par ses images d'étape dans l'ordre (l'entaille en trois temps, le trait d'abattage, le craquement, il penche),
// puis tombe ; arrêté à une étape, il la garde après rechargement ; l'arbre couché s'allège à l'ébranchage. Xéros est rendu trente
// fois plus fort (?dieu « force ») et l'endurance infinie, pour que l'essai reste court.
// Usage : npm run test:etapes (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('etapes', async ({ page, errors, load }) => {
  // Espace maintenu devant la cible ; relève l'image de l'objet à chaque changement ; s'arrête (Espace relâché) à l'image `until`
  const run = (args: { type: string; until?: string }) =>
    page.evaluate(async ({ type, until }) => {
      const sleep = (t: number) => new Promise((r) => setTimeout(r, t));
      const g = (window as any).game;
      const w = () => g.scene.getScene('world');
      const send = async (c: unknown) => {
        g.events.emit('dieu', c);
        await sleep(150);
      };
      if (w().map.def.id !== 'ferme') {
        await send({ kind: 'map', map: 'ferme' });
        await sleep(2000);
      }
      await send({ kind: 'stamina-infinite', on: true });
      await send({ kind: 'force', multiplier: 30 });
      await send({ kind: 'give', held: { item: 'axe' } });
      const p = w().map.props.find((q: any) => q.type === type && q.image.visible);
      if (!p) throw new Error(`pas de ${type} sur la ferme`);
      const a = w().player.actor;
      if (type === 'normal-tree') {
        a.body.reset(Math.round(p.aimX - 14), Math.round(p.aimY));
        a.face('right');
      } else {
        a.body.reset(Math.round(p.aimX), Math.round(p.aimY + 14));
        a.face('up');
      }
      await sleep(200);
      const keys: string[] = [p.image.texture.key];
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', keyCode: 32 } as KeyboardEventInit));
      const t0 = performance.now();
      while (w().map.props.includes(p) && performance.now() - t0 < 120000) {
        const k = p.image.texture.key;
        if (k !== keys.at(-1)) keys.push(k);
        if (until && k === until) break;
        await sleep(20);
      }
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', keyCode: 32 } as KeyboardEventInit));
      for (let i = 0; i < 200 && w().mode !== 'play'; i++) await sleep(20);
      await sleep(300);
      return { keys, id: p.id, spawned: !!p.spawned, gone: !w().map.props.includes(p), now: w().map.props.includes(p) ? p.image.texture.key : null };
    }, args);

  // l'arbre normal, arrêté à l'entaille finie, retrouvé ainsi après rechargement
  const part = await run({ type: 'normal-tree', until: 'normal-tree-stage-3' });
  await load('?dieu');
  const after = await page.evaluate((id: number) => {
    const p = (window as any).game.scene.getScene('world').map.props.find((q: any) => q.id === id && !q.spawned);
    return p?.image.texture.key;
  }, part.id);
  // puis jusqu'au bout
  const rest = await run({ type: 'normal-tree' });
  await page.waitForTimeout(2500);
  const limbs = await run({ type: 'normal-felled-tree' });
  console.log(JSON.stringify({ part, after, rest, limbs }));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  const stages = (base: string, n: number) => Array.from({ length: n }, (_, i) => `${base}-stage-${i + 1}`);
  assert.deepEqual(part.keys, ['normal-tree', ...stages('normal-tree', 3)], `l'entaille se creuse en trois temps (${part.keys.join(', ')})`);
  assert.equal(part.now, 'normal-tree-stage-3', 'arrêté, l’arbre garde son entaille');
  assert.equal(after, 'normal-tree-stage-3', 'l’entaille est retrouvée après rechargement');
  assert.deepEqual(rest.keys.slice(0, 5), stages('normal-tree', 7).slice(2), `puis le trait d'abattage, le craquement, il penche (${rest.keys.join(', ')})`);
  assert.ok(rest.gone, 'puis il tombe');
  assert.ok(limbs.keys.length >= 4 && limbs.keys.slice(1, 4).every((k: string, i: number) => k.endsWith(`-stage-${i + 1}`)), `l'ébranchage allège le houppier en trois temps (${limbs.keys.join(', ')})`);
  assert.ok(limbs.gone, 'ébranché, l’arbre couché devient une pièce de bois');
  console.log('  ✓ étapes : l’entaille en trois temps, gardée après rechargement, le trait, le craquement, l’arbre qui penche puis tombe ; l’ébranchage en trois temps');
});
