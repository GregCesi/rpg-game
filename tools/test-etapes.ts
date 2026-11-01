// Test de scénario des étapes visibles d'un travail (docs/CONCEPTION.md, « Le travail », § 6), dans le vrai jeu : l'arbre normal
// abattu au coup (lancé d'un appui sur Espace) passe par ses images d'étape dans l'ordre (l'entaille en trois temps, le trait d'abattage, le craquement, il penche),
// puis tombe ; arrêté à une étape, il la garde après rechargement ; l'arbre couché s'allège à l'ébranchage. Xéros est rendu aussi
// fort que le permet un humain un humain (?dieu « force », plafonnée), l'endurance infinie et la simulation à x20, pour que l'essai reste court.
// Usage : npm run test:etapes (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('etapes', async ({ page, errors, load }) => {
  // Espace devant la cible (le travail va seul) ; relève l'image de l'objet à chaque changement ; s'arrête (Échap) à l'image `until`
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
      // la force au plafond humain (×2,6) et la simulation à x20 : l'essai reste court, sans rien sauter
      await send({ kind: 'force', multiplier: 10 });
      await send({ kind: 'sim-speed', factor: 20 });
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
      // Échap : arrêté après le coup en cours (sinon, le travail lancé va seul jusqu'au bout)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', keyCode: 27 } as KeyboardEventInit));
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', keyCode: 27 } as KeyboardEventInit));
      for (let i = 0; i < 200 && w().mode !== 'play'; i++) await sleep(20);
      await send({ kind: 'sim-speed', factor: 1 });
      await sleep(300);
      return { keys, id: p.id, spawned: !!p.spawned, gone: !w().map.props.includes(p), now: w().map.props.includes(p) ? p.image.texture.key : null };
    }, args);

  // l'arbre normal, arrêté à l'entaille finie, retrouvé ainsi après rechargement ; Vite recharge parfois la page au premier lancement
  // (dépendances optimisées) : la première étape est alors rejouée une fois, sur une partie neuve
  const part = await run({ type: 'normal-tree', until: 'normal-tree-stage-3' }).catch(async (e: Error) => {
    if (!/context was destroyed|navigation/.test(e.message)) throw e;
    await load();
    return run({ type: 'normal-tree', until: 'normal-tree-stage-3' });
  });
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
