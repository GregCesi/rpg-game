// La forge du village, visitée dans le vrai jeu (tools/lib/playtest.ts), au vrai clavier, depuis une partie neuve (CADRAGE-forge.md,
// décisions de Grégoire du 4 novembre 2026) :
//   - Xéros se réveille dans la maison, sort sur la ferme, rejoint le chemin et le suit vers l'est (la ferme, le chemin du village, le
//     village), jusqu'à la forge, la première parcelle au nord de la rue, à l'entrée ouest ;
//   - la forge est le plan `forge` posé sur la carte du village (un rectangle `Plan` de village.tmj) : l'atelier ouvert au sud ;
//   - dehors, devant elle, son toit est opaque et la lueur du feu cachée dessous ;
//   - il entre dans l'atelier par le sud ouvert, sans fondu ni changement de carte, jusque devant la forge : les pans s'effacent, il
//     voit le feu (sa lueur) ; capture .art-preview/forge-jeu.png ;
//   - il ressort sur la rue : le toit revient, la lueur se cache.
// Jamais bloqué : la marche (tools/lib/walk.ts) échoue en disant où Xéros s'est arrêté. Rien n'est contourné : pas de téléportation.
// Usage : npm run test:forge-visite.

import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { playtest } from './lib/playtest';
import { walker } from './lib/walk';

await playtest('forge-visite', async ({ page, errors, load }) => {
  await load('?dieu&reset');
  const { where, goTo, routeTo } = walker(page);
  const W = (fn: string) => page.evaluate(fn);
  const TILE = 32;
  const ROAD = 191 * TILE; // la limite entre les deux rangées du chemin (rangées 190-191 du monde)
  const FARM_PATH = 125 * TILE + 3008; // le milieu du chemin nord-sud de la ferme

  // 1. la partie neuve : Xéros se réveille dans la maison ; il va jusqu'à la porte d'entrée et sort sur la ferme
  await W(`window.__idle('le réveil')`);
  await W(`window.game.events.emit('dieu', { kind: 'stamina-infinite', on: true })`);
  const start = await where();
  assert.match(start.id, /^interieur:ferme:/, `réveil dans la maison (${start.id})`);
  const route = await routeTo();
  assert.ok(route.length > 1, 'un chemin de son coin à la porte d’entrée');
  for (const c of route.slice(1)) {
    const now = await where();
    await goTo(now.wx - now.x + c.x, now.wy - now.y + c.y, Math.abs(c.x - now.x) > Math.abs(c.y - now.y) ? 'x' : 'y', 2);
    if (!c.open) continue;
    // une porte intérieure fermée en route : tourné vers elle, il l'ouvre (E)
    await W(`window.__face('${c.open}')`);
    await W(`window.__key('KeyE')`);
    await W(`window.__settle()`);
  }
  await W(`window.__face('down')`);
  await W(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))`);
  await W(`window.__until(() => window.game.scene.getScene('world').map?.def?.id === 'ferme', 'sortir sur la ferme')`);
  await W(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }))`);
  await W(`window.__idle('sur la ferme')`);

  // 2. la ferme : jusqu'au chemin nord-sud par un chemin libre, puis au sud jusqu'au chemin du village
  let p = await where();
  const o = { x: p.wx - p.x, y: p.wy - p.y };
  const farmRoute = await routeTo({ x: FARM_PATH - o.x, y: p.y + 64 });
  assert.ok(farmRoute.length > 1, 'un chemin libre de la porte au chemin nord-sud');
  for (const c of farmRoute.slice(1)) {
    const now = await where();
    await goTo(o.x + c.x, o.y + c.y, Math.abs(o.x + c.x - now.wx) > Math.abs(o.y + c.y - now.wy) ? 'x' : 'y', 2);
  }
  await goTo(FARM_PATH, ROAD, 'y', 2);

  // 3. vers l'est, le long du chemin, d'une zone à l'autre, jusque devant la forge
  const zones: string[] = [];
  const toVillage = async () => {
    for (let i = 0; i < 6; i++) {
      p = await where();
      if (!zones.includes(p.id)) zones.push(p.id);
      if (p.id === 'village') break;
      await goTo(p.wx + 4000, ROAD, 'x');
    }
    assert.equal(p.id, 'village', `Xéros est arrivé au village (${zones.join(', ')})`);
  };
  await toVillage();
  const forge = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const hearth = w.map.builds.find((b: any) => b.piece.piece.prop === 'forge-hearth');
    const roofs = w.map.builds.filter((b: any) => /^shingle-roof-large/.test(b.piece.piece.prop ?? '')).map((b: any) => b.piece.id);
    const box = hearth && { x: hearth.piece.x / 5, y: hearth.piece.y / 5, w: 44, d: 22 };
    return { hearth: hearth?.piece.id as number | undefined, box, roofs, world: w.map.def.world };
  });
  assert.ok(forge.hearth !== undefined, 'la forge est posée sur la carte du village (le plan `forge`)');
  assert.equal(forge.roofs.length, 2, `les deux pans de bardeaux de l'atelier (${forge.roofs})`);
  const ox = forge.world.x;
  const oy = forge.world.y;
  const front = { x: forge.box!.x + 22, y: forge.box!.y + forge.box!.d + 10 }; // devant le feu, au milieu de la forge (px de la carte)
  // dans la rue, au droit de la forge
  await goTo(ox + front.x, ROAD, 'x', 2);

  /** L'opacité des pans de l'atelier (la plus haute) et ce qu'on voit de la lueur de la forge (0 : cachée, 1 : entière). */
  const seen = () =>
    page.evaluate(([roofs, hearth]) => {
      const m = (window as any).game.scene.getScene('world').map;
      const at = (id: number) => m.builds.find((q: any) => q.piece.id === id);
      const glows = (at(hearth).parts ?? []).filter((q: any) => q.light).map((q: any) => q.obj.getData('cover') as number);
      return { roof: Math.max(...roofs.map((id: number) => at(id).image.alpha as number)), glow: glows.length ? Math.min(...glows) : -1 };
    }, [forge.roofs, forge.hearth!] as const);
  const settled = (what: string, faded: boolean) =>
    page.evaluate(
      ([roofs, faded, what]) => {
        const m = (window as any).game.scene.getScene('world').map;
        const a = (id: number) => m.builds.find((q: any) => q.piece.id === id).image.alpha as number;
        return (window as any).__until(() => roofs.every((id: number) => (faded ? a(id) < 0.6 : a(id) === 1)), what);
      },
      [forge.roofs, faded, what] as const,
    );
  // 4. dehors, dans la rue : le toit opaque, la lueur cachée dessous
  await settled('le toit opaque, Xéros dans la rue', false);
  const outside = await seen();
  assert.ok(outside.glow >= 0, 'la forge a sa lueur');
  assert.equal(outside.glow, 0, `dehors, la lueur de la forge est cachée sous le toit (${JSON.stringify(outside)})`);

  // 5. il entre par le sud ouvert, sans fondu ni changement de carte, jusque devant la forge
  const inRoute = await routeTo({ x: Math.round(front.x / 4) * 4, y: Math.round(front.y / 4) * 4 });
  assert.ok(inRoute.length > 1, `un chemin libre de la rue jusque devant le feu (${JSON.stringify(front)})`);
  for (const c of inRoute.slice(1)) {
    const now = await where();
    await goTo(ox + c.x, oy + c.y, Math.abs(ox + c.x - now.wx) > Math.abs(oy + c.y - now.wy) ? 'x' : 'y', 2);
  }
  await W(`window.__face('up')`);
  p = await where();
  assert.equal(p.id, 'village', 'dans l’atelier : la même carte (un abri ouvert, pas un intérieur)');
  assert.ok(Math.abs(p.x - front.x) < 8 && Math.abs(p.y - front.y) < 8, `devant le feu (${p.x}, ${p.y} ; attendu ${front.x}, ${front.y})`);
  await settled('les pans effacés, Xéros sous le toit', true);
  const under = await seen();
  assert.ok(under.glow > 0, `dessous, il voit le feu : la lueur de la forge (${JSON.stringify(under)})`);
  // .art-preview/forge-jeu.png : Xéros devant le feu, le toit effacé (la vue du jeu, sans l'interface)
  await W(`window.__frames(10)`);
  const shot = await page.screenshot();
  writeFileSync('.art-preview/forge-jeu.png', shot);

  // 6. il ressort sur la rue : le toit revient, la lueur se cache
  const outRoute = await routeTo({ x: Math.round(front.x / 4) * 4, y: Math.round((ROAD - oy) / 4) * 4 });
  assert.ok(outRoute.length > 1, 'un chemin libre du feu à la rue');
  for (const c of outRoute.slice(1)) {
    const now = await where();
    await goTo(ox + c.x, oy + c.y, Math.abs(ox + c.x - now.wx) > Math.abs(oy + c.y - now.wy) ? 'x' : 'y', 2);
  }
  await settled('le toit revenu, Xéros ressorti', false);
  const again = await seen();
  assert.equal(again.glow, 0, `ressorti, la lueur est de nouveau cachée (${JSON.stringify(again)})`);
  assert.deepEqual(zones, ['ferme', 'chemin', 'village'], 'ferme, chemin, village');
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  console.log(`  ✓ forge-visite : de la maison à la forge par le chemin (${zones.join(', ')}), entré dans l'atelier ouvert, le toit effacé et le feu vu, ressorti ; .art-preview/forge-jeu.png`);
});
