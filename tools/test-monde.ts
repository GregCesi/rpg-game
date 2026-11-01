// Le monde (chantier « monde », CONCEPTION « Le monde »), dans le vrai jeu (tools/lib/playtest.ts), au vrai clavier :
//   - Xéros se réveille dans son cagibi (partie neuve), sort de la chaumière, et marche (en courant, l'endurance infinie de ?dieu)
//     jusqu'à la place du village, en passant d'une zone à l'autre par leurs bords (ferme, chemin, village) ;
//   - de la place jusqu'au panneau de la route de la ville (zone route-de-la-ville), qu'il lit (E : dialogue signpost-town) ;
//   - au bord du monde, à l'est, il ne passe pas ;
//   - la page rechargée, la partie le retrouve à sa place (même zone, mêmes pieds) ;
//   - chaque passage de bord est mesuré (la scène qui redémarre sur la voisine) ; puis, dans la forêt profonde (la zone la plus
//     chargée), le temps d'une image, Xéros immobile puis en marche. Les mesures sont dites à la fin.
// Écrit aussi .art-preview/monde.png (tools/world-preview.ts). Usage : npm run test:monde.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { playtest } from './lib/playtest';

execFileSync('npx', ['tsx', 'tools/world-preview.ts'], { stdio: 'inherit' });

await playtest('monde', async ({ page, errors, load }) => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await load('?dieu&reset');
  const emit = (cmd: object) => page.evaluate((c) => (window as any).game.events.emit('dieu', c), cmd);
  /** Où est Xéros : la carte, ses pieds dans la carte et dans le monde, le mode de la scène. */
  const where = async (): Promise<{ id: string; x: number; y: number; wx: number; wy: number; mode: string; zone: boolean }> => {
    // pendant un rechargement de la page, le jeu n'est pas encore là : on attend
    for (let i = 0; ; i++) {
      const r = await look().catch(() => undefined);
      if (r) return r;
      if (i > 100) throw new Error('le jeu ne répond plus');
      await sleep(100);
    }
  };
  const look = () =>
    page.evaluate(() => {
      if (!(window as any).game?.scene?.getScene('world')?.player) return undefined;
      const w = (window as any).game.scene.getScene('world');
      const a = w.player.actor;
      const o = w.map.def.world ?? { x: 0, y: 0 };
      return { id: w.map.def.id as string, x: a.x as number, y: a.y as number, wx: (o.x + a.x) as number, wy: (o.y + a.y) as number, mode: w.mode as string, zone: !!w.map.def.world };
    });
  const until = async (ok: () => Promise<boolean>, ms: number, what: string) => {
    const t = Date.now();
    while (Date.now() - t < ms) {
      if (await ok()) return;
      await sleep(40);
    }
    throw new Error(`attente trop longue : ${what} (${JSON.stringify(await where())})`);
  };
  emit({ kind: 'stamina-infinite', on: true });

  // les passages de bord : la durée du redémarrage de la scène sur la voisine (de l'arrêt de l'une à la fin de la création de l'autre)
  await page.evaluate(() => {
    const g = (window as any).game;
    const w = g.scene.getScene('world');
    const log: { from: string; ms: number }[] = ((window as any).crossings = []);
    let t0 = 0;
    let from = '';
    w.events.on('shutdown', () => {
      // seulement un bord de zone (pas de fondu) : la scène part d'une zone et y arrive
      t0 = w.map.def.world ? performance.now() : 0;
      from = w.map.def.id;
    });
    w.events.on('create', () => {
      if (t0 && w.map.def.world) log.push({ from: `${from} -> ${w.map.def.id}`, ms: Math.round(performance.now() - t0) });
      t0 = 0;
    });
  });

  const held = new Set<string>();
  const press = async (keys: string[]) => {
    for (const k of [...held]) if (!keys.includes(k)) {
      await page.keyboard.up(k);
      held.delete(k);
    }
    for (const k of keys) if (!held.has(k)) {
      await page.keyboard.down(k);
      held.add(k);
    }
  };
  /**
   * Marche (en courant) jusqu'au point du monde (wx, wy) : d'abord le long d'un axe puis de l'autre (`first`), à 6 px près ; les
   * changements de zone se font en route. Renvoie quand il y est.
   */
  const goTo = async (wx: number, wy: number, first: 'x' | 'y', ms = 120000, tol = 6) => {
    const t = Date.now();
    let axis = first;
    let last = { wx: 0, wy: 0, at: Date.now() };
    const start = await where();
    while (Date.now() - t < ms) {
      const p = await where();
      // une sortie prise en route (la porte de la maison) : on est arrivé ailleurs
      if (!start.zone && p.id !== start.id) return press([]);
      if (p.mode !== 'play') {
        await sleep(20);
        continue;
      }
      const dx = wx - p.wx;
      const dy = wy - p.wy;
      if (Math.abs(dx) <= tol && Math.abs(dy) <= tol) return press([]);
      if (axis === 'x' && Math.abs(dx) <= tol) axis = 'y';
      if (axis === 'y' && Math.abs(dy) <= tol) axis = 'x';
      // de près, sans courir : il s'arrête plus juste
      const keys = tol < 6 ? [] : ['ShiftLeft'];
      if (axis === 'x') keys.push(dx > 0 ? 'KeyD' : 'KeyA');
      else keys.push(dy > 0 ? 'KeyS' : 'KeyW');
      const d = axis === 'x' ? Math.abs(dx) : Math.abs(dy);
      if (tol < 6 && d < 12) {
        // de très près : un appui bref (un ou deux pixels)
        await press([]);
        await page.keyboard.down(keys[0]);
        await sleep(16);
        await page.keyboard.up(keys[0]);
        await sleep(40);
      } else await press(keys);
      // bloqué : on le dit
      if (Math.hypot(p.wx - last.wx, p.wy - last.wy) > 2) last = { wx: p.wx, wy: p.wy, at: Date.now() };
      else if (Date.now() - last.at > 3000) throw new Error(`Xéros est bloqué en route vers (${wx}, ${wy}) : ${JSON.stringify(p)}`);
      await sleep(30);
    }
    throw new Error(`trop long pour aller en (${wx}, ${wy})`);
  };

  // 1. le réveil dans le cagibi, puis la sortie de la chaumière : un chemin calculé dans la maison (pas de 4 px, cases libres)
  let p = await where();
  assert.equal(p.id, 'maison', 'réveil dans la chaumière');
  const route: { x: number; y: number }[] = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    const exit = m.def.exits.find((e: any) => e.to === 'ferme' && e.spawn === 'porte');
    const S = 4;
    const free = (x: number, y: number) => m.areaFree({ left: x - 5, top: y - 8, right: x + 5, bottom: y }, []);
    const start = [Math.round(w.player.actor.x / S), Math.round(w.player.actor.y / S)];
    const goal = (x: number, y: number) => x * S >= exit.x + 8 && x * S < exit.x + exit.w - 8 && y * S - 3 >= exit.y + 4 && y * S - 3 < exit.y + exit.h;
    const prev = new Map<string, string>();
    const q = [start];
    prev.set(start.join(), '');
    let end: number[] | undefined;
    while (q.length) {
      const [x, y] = q.shift()!;
      if (goal(x, y)) {
        end = [x, y];
        break;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = [x + dx, y + dy];
        if (prev.has(n.join()) || !free(n[0] * S, n[1] * S)) continue;
        prev.set(n.join(), `${x},${y}`);
        q.push(n);
      }
    }
    const out: { x: number; y: number }[] = [];
    for (let k = end?.join(); k; k = prev.get(k)) {
      const [x, y] = k.split(',').map(Number);
      out.unshift({ x: x * S, y: y * S });
    }
    // seulement les coins
    return out.filter((_q, i) => i === 0 || i === out.length - 1 || (out[i - 1].x !== out[i + 1].x && out[i - 1].y !== out[i + 1].y));
  });
  assert.ok(route.length > 1, 'un chemin du cagibi à la porte');
  for (const c of route.slice(1)) {
    const now = await where();
    if (now.id !== 'maison') break;
    await goTo(c.x, c.y, Math.abs(c.x - now.x) > Math.abs(c.y - now.y) ? 'x' : 'y', 15000, 2);
  }
  // un pas vers le sud dans la sortie
  await press(['KeyS']);
  await until(async () => (await where()).id === 'ferme', 5000, 'sortir sur la ferme');
  await press([]);
  await until(async () => (await where()).mode === 'play', 5000, 'arrivé sur la ferme');

  // 2. la ferme : le chemin de la cour, puis le chemin nord-sud jusqu'au chemin du village ; le monde, en px du monde
  const def = (id: string) => page.evaluate((i) => {
    const w = (window as any).game.scene.getScene('world');
    return w.zones && w.map.def.id === i ? w.map.def : undefined;
  }, id);
  const ferme = await def('ferme');
  assert.ok(ferme?.world, 'la ferme est une zone du monde');
  const TILE = 32;
  const ROAD = 191 * TILE; // la limite entre les deux rangées du chemin (rangées 190-191 du monde)
  const farmPath = 125 * TILE + 3008; // le milieu du chemin nord-sud de la ferme
  p = await where();
  await goTo(farmPath, p.wy, 'x', 20000);
  await goTo(farmPath, ROAD, 'y', 20000);
  // 3. vers l'est, le long du chemin : la ferme, le chemin du village, le village ; jusqu'au milieu de la place
  const place = { x: 478.5 * TILE, y: 191.5 * TILE };
  await goTo(place.x, ROAD, 'x');
  p = await where();
  assert.equal(p.id, 'village', 'la place est dans la zone du village');
  assert.ok(Math.hypot(p.wx - place.x, p.wy - place.y) < 15 * 20, `sur la place (${p.wx}, ${p.wy})`);
  const zonesSeen = await page.evaluate(() => (window as any).crossings.map((c: any) => c.from));
  assert.deepEqual(zonesSeen, ['ferme -> chemin', 'chemin -> village'], 'ferme, chemin, village : deux bords passés');

  // 4. de la place au panneau : la route de la ville, jusqu'au bord du monde
  await goTo(615 * TILE, ROAD, 'x');
  p = await where();
  assert.equal(p.id, 'route-de-la-ville', 'la route de la ville');
  const post = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const o = w.map.props.find((q: any) => q.type === 'signpost');
    return o && { x: o.baseX + w.map.def.world.x, y: o.baseY + w.map.def.world.y };
  });
  assert.ok(post, 'le panneau est posé');
  // devant lui, au sud, tourné vers le nord
  await goTo(post.x, post.y + 22, 'x', 20000);
  await page.keyboard.down('KeyW');
  await sleep(60);
  await page.keyboard.up('KeyW');
  await sleep(150);
  await page.keyboard.press('KeyE');
  await until(() => page.evaluate(() => !!(window as any).game.scene.isActive('dialogue')), 3000, 'lire le panneau');
  const said = await page.evaluate(() => (window as any).game.scene.getScene('dialogue').def?.lines?.[0]?.text ?? (window as any).game.scene.getScene('dialogue').lines?.[0]?.text);
  for (let i = 0; i < 4 && (await page.evaluate(() => (window as any).game.scene.isActive('dialogue'))); i++) {
    await page.keyboard.press('KeyE');
    await sleep(300);
  }
  // 5. le bord du monde, à l'est : on ne passe pas
  p = await where();
  await press(['KeyD']);
  await sleep(1500);
  await press([]);
  const edge = await where();
  assert.equal(edge.id, 'route-de-la-ville', 'le bord du monde arrête Xéros');
  assert.ok(edge.x <= 125 * TILE, `toujours dans la zone (x = ${edge.x})`);
  // un pas en arrière, loin du poteau (collé à lui, sa collision le repousserait de quelques px à la reprise)
  await goTo(post.x, post.y + 48, 'x', 20000);
  await sleep(200);
  const before = await where();

  const crossings = await page.evaluate(() => (window as any).crossings);
  // 6. la page rechargée : la partie le retrouve là
  await sleep(300);
  await load('?dieu');
  const after = await where();
  assert.equal(after.id, before.id, 'la même zone après le rechargement');
  assert.ok(Math.abs(after.x - before.x) <= 1 && Math.abs(after.y - before.y) <= 1, `les mêmes pieds (${before.x}, ${before.y}) -> (${after.x}, ${after.y})`);

  // 7. la forêt profonde : le temps d'une image, immobile puis en marche (moyenne et pire sur 3 s)
  emit({ kind: 'map', map: 'foret-profonde' });
  await until(async () => (await where()).id === 'foret-profonde' && (await where()).mode === 'play', 15000, 'la forêt profonde');
  await sleep(800);
  const measure = () =>
    page.evaluate(
      () =>
        new Promise<{ mean: number; worst: number; objects: number; band: number }>((resolve) => {
          const g = (window as any).game;
          const w = g.scene.getScene('world');
          const ds: number[] = [];
          const start = performance.now();
          const step = () => {
            ds.push(g.loop.delta);
            if (performance.now() - start < 3000) requestAnimationFrame(step);
            else resolve({ mean: ds.reduce((a, b) => a + b, 0) / ds.length, worst: Math.max(...ds), objects: w.map.props.length, band: w.children.list.length });
          };
          requestAnimationFrame(step);
        }),
    );
  const still = await measure();
  await press(['KeyD']);
  const walking = await measure();
  await press([]);

  assert.deepEqual(errors, [], 'aucune erreur dans la page');
  assert.equal(said, 'Vers la ville. La route n’est pas encore pour moi.'.replace('’', "'"), 'le panneau se lit');
  console.log(`  ✓ monde : du cagibi à la place (${zonesSeen.join(', ')}), puis au panneau ; le bord du monde arrête ; rechargé à la même place`);
  console.log(`    passages de bord (redémarrage de la scène) : ${crossings.map((c: any) => `${c.from} ${c.ms} ms`).join(' ; ')}`);
  console.log(
    `    forêt profonde (${still.objects} objets, ${still.band} objets affichés avec la bande des voisines) : une image ${still.mean.toFixed(1)} ms en moyenne (pire ${still.worst.toFixed(0)} ms) immobile, ${walking.mean.toFixed(1)} ms (pire ${walking.worst.toFixed(0)} ms) en marche (Chromium sans écran, rendu logiciel)`,
  );
});
