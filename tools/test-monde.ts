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
  const goTo = async (wx: number, wy: number, first: 'x' | 'y', tol = 6) => {
    await press([]);
    // la marche se conduit dans la page, au rythme du jeu : chaque décision suit l'état du jeu à l'image même (ses pieds, son mode),
    // si bien qu'un jeu ralenti (les scénarios tournent à plusieurs) ne fait ni dépasser le but ni échouer sur une durée ; de très
    // près, un appui ne dure qu'un pas de la physique (un ou deux pixels)
    const r = await page.evaluate(
      async ({ wx, wy, first, tol }) => {
        const g = (window as any).game;
        const world = () => g.scene.getScene('world');
        const key = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));
        const held = new Set<string>();
        const hold = (keys: string[]) => {
          for (const k of [...held]) if (!keys.includes(k)) (key('keyup', k), held.delete(k));
          for (const k of keys) if (!held.has(k)) (key('keydown', k), held.add(k));
        };
        const frame = () => new Promise((res) => requestAnimationFrame(res));
        /**
         * Attend `n` pas de la physique du monde (une image peut en contenir plusieurs), image après image ; un bord de zone passé en
         * route redémarre la scène, dont l'ancien monde physique ne fera plus de pas : l'attente s'arrête alors (on est arrivé ailleurs).
         */
        const steps = async (n: number) => {
          const pw = world()?.physics?.world;
          if (!pw) return;
          let k = 0;
          const tick = () => void k++;
          pw.on('worldstep', tick);
          while (k < n && world()?.physics?.world === pw) await frame();
          pw.off('worldstep', tick);
        };
        const at = () => {
          const w = world();
          const a = w?.player?.actor;
          if (!a || !w.map) return undefined;
          const o = w.map.def.world ?? { x: 0, y: 0 };
          return { id: w.map.def.id as string, wx: o.x + a.x, wy: o.y + a.y, mode: w.mode as string, zone: !!w.map.def.world };
        };
        let start = at();
        while (!start) (await frame(), (start = at()));
        let axis = first;
        let last = { wx: start.wx, wy: start.wy };
        let still = 0;
        // bornes en images, jamais en durée : hors du mode `play` trop longtemps (un dialogue ouvert en route), ou plus aucun progrès
        // vers le but (une approche qui oscille) ; le test échoue alors en le disant, au lieu d'attendre sans fin
        let away = 0;
        let best = Infinity;
        let stale = 0;
        for (;;) {
          await frame();
          const p = at();
          if (!p) continue;
          // une sortie prise en route (la porte de la maison) : on est arrivé ailleurs
          if (!start.zone && p.id !== start.id) return (hold([]), { ok: true, p });
          if (p.mode !== 'play') {
            if (++away > 1200) return (hold([]), { ok: false, p, why: `mode ${p.mode} depuis 1200 images` });
            continue;
          }
          away = 0;
          const dx = wx - p.wx;
          const dy = wy - p.wy;
          if (Math.abs(dx) <= tol && Math.abs(dy) <= tol) return (hold([]), { ok: true, p });
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist < best - 1) (best = dist), (stale = 0);
          else if (++stale > 1500) return (hold([]), { ok: false, p, why: `plus de progrès depuis 1500 images (au plus près : ${best.toFixed(1)} px)` });
          if (axis === 'x' && Math.abs(dx) <= tol) axis = 'y';
          if (axis === 'y' && Math.abs(dy) <= tol) axis = 'x';
          const dir = axis === 'x' ? (dx > 0 ? 'KeyD' : 'KeyA') : dy > 0 ? 'KeyS' : 'KeyW';
          const d = axis === 'x' ? Math.abs(dx) : Math.abs(dy);
          if (d < 12) {
            // de très près, au pas de la physique : appuyer le temps d'un pas, relâcher, laisser s'arrêter
            hold([]);
            hold([dir]);
            await steps(2);
            hold([]);
            await steps(3);
          } else hold(tol < 6 || d < 24 ? [dir] : ['ShiftLeft', dir]);
          // buté sur un coin (un piquet de clôture, l'angle d'un mur) : un petit pas de côté, d'un côté puis de l'autre, et on reprend ;
          // bloqué pour de bon : des centaines d'images sans bouger (et non une durée)
          if (Math.hypot(p.wx - last.wx, p.wy - last.wy) > 2) (last = { wx: p.wx, wy: p.wy }, (still = 0));
          else if (++still > 600) return (hold([]), { ok: false, p });
          else if (still % 60 === 0 && d >= 12) {
            const side = (still / 60) % 2 === 1 ? 1 : -1;
            const across = axis === 'x' ? (side > 0 ? 'KeyS' : 'KeyW') : side > 0 ? 'KeyD' : 'KeyA';
            hold([across]);
            await steps(6 * Math.ceil(still / 120));
            hold([]);
          }
        }
      },
      { wx, wy, first, tol },
    );
    if (!r.ok) throw new Error(`Xéros est bloqué en route vers (${wx}, ${wy}) : ${(r as any).why ?? 'il ne bouge plus'} ; ${JSON.stringify(r.p)}`);
  };

  // 1. le réveil dans son coin de la maison (l'intérieur calculé de la maison bâtie sur la ferme), puis la sortie : un chemin calculé
  // dans la maison (pas de 4 px, cases libres) jusque devant la porte d'entrée, qu'il ouvre (E)
  let p = await where();
  assert.ok(p.id.startsWith('interieur:ferme:'), `réveil dans la maison (${p.id})`);
  /**
   * Un chemin sans obstacle sur la carte en cours, de Xéros jusqu'au but (une recherche en largeur sur une grille de 4 px, la place de
   * ses pieds libre à chaque pas) : devant la porte d'entrée de la maison (la sortie de l'intérieur, en cm), ou un point de la carte
   * (`to`, en px de la carte). Rend ses coins, en px de la carte.
   */
  const routeTo = (to?: { x: number; y: number }): Promise<{ x: number; y: number; open?: string }[]> =>
    page.evaluate((to) => {
      const w = (window as any).game.scene.getScene('world');
      const m = w.map;
      const zone = w.interior?.exits[0]?.zone;
      const door = zone && { x: Math.round((zone.x + zone.w / 2) / 5), y: Math.round(zone.y / 5) - 6 };
      const S = 4;
      // les portes fermées de la maison (les portes intérieures) ne barrent pas le chemin : Xéros les ouvre en route (E)
      const doors = m.builds.filter((b: any) => b.zone && /door$/.test(b.piece.piece.prop ?? '')).map((b: any) => b.zone);
      // dans la maison, comme un joueur, par le milieu des passages : 2 px de marge autour du corps quand il y a la place (une porte de
      // 90 cm laisse 18 px à un corps de 10 : collé à une huisserie, le moindre écart sous la charge l'y arrête) ; sinon au plus juste
      let margin = w.interior ? 2 : 0;
      const free = (x: number, y: number) => m.areaFree({ left: x - 5 - margin, top: y - 8 - margin, right: x + 5 + margin, bottom: y + margin }, [], doors);
      const start = [Math.round(w.player.actor.x / S), Math.round(w.player.actor.y / S)];
      const goal = to
        ? (x: number, y: number) => Math.abs(x * S - to.x) <= S / 2 && Math.abs(y * S - to.y) <= S / 2
        : (x: number, y: number) => Math.abs(x * S - door.x) <= S && Math.abs(y * S - door.y) <= S;
      const prev = new Map<string, string>();
      let end: number[] | undefined;
      const search = () => {
      prev.clear();
      const q = [start];
      prev.set(start.join(), '');
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
      };
      search();
      if (!end) {
        margin = 0;
        search();
      }
      const out: { x: number; y: number }[] = [];
      for (let k = end?.join(); k; k = prev.get(k)) {
        const [x, y] = k.split(',').map(Number);
        out.unshift({ x: x * S, y: y * S });
      }
      // seulement les coins, et, devant chaque porte fermée que le chemin traverse, un arrêt pour l'ouvrir (`open` : tourné vers elle)
      const crosses = (q: { x: number; y: number }, z: any) => q.x + 5 > z.x - z.width / 2 && q.x - 5 < z.x + z.width / 2 && q.y > z.y - z.height / 2 && q.y - 8 < z.y + z.height / 2;
      const stops = new Map<number, string>();
      for (const z of doors) {
        const i = out.findIndex((q) => crosses(q, z));
        if (i < 1) continue;
        const j = Math.max(0, i - 3);
        const d = { x: out[i].x - out[i - 1].x, y: out[i].y - out[i - 1].y };
        stops.set(j, d.x > 0 ? 'right' : d.x < 0 ? 'left' : d.y > 0 ? 'down' : 'up');
      }
      return out
        .map((q, i) => ({ ...q, ...(stops.has(i) ? { open: stops.get(i) } : {}) }))
        .filter((_q, i) => i === 0 || i === out.length - 1 || stops.has(i) || (out[i - 1].x !== out[i + 1].x && out[i - 1].y !== out[i + 1].y));
    }, to) as Promise<{ x: number; y: number; open?: string }[]>;
  const route = await routeTo();
  assert.ok(route.length > 1, 'un chemin de son coin à la porte');
  for (const c of route.slice(1)) {
    const now = await where();
    const axis = Math.abs(c.x - now.x) > Math.abs(c.y - now.y) ? 'x' : 'y';
    // à un pas de la grille de la route (4 px) : sous la charge, une image longue contient plusieurs pas de la physique et le plus petit
    // déplacement (une image d'appui, environ 4 px en marchant) sauterait par-dessus une fenêtre plus étroite (chantier « maison-2 »)
    await goTo(c.x, c.y, axis, 2);
    if (!c.open) continue;
    // devant une porte intérieure fermée : tourné vers elle, il l'ouvre (E) ; elle ne barre plus le passage
    // (une porte qui s'ouvre change de pièce : `swing`, ses deux états)
    const doorsNow = () => page.evaluate(() => (window as any).game.scene.getScene('world').map.builds.map((b: any) => b.piece.piece.prop).filter((p: string) => /door/.test(p ?? '')).sort().join());
    const before = await doorsNow();
    await page.evaluate((f) => (window as any).game.scene.getScene('world').player.actor.face(f), c.open);
    await page.keyboard.press('KeyE');
    await until(async () => (await doorsNow()) !== before, 5000, `ouvrir la porte (${c.open})`);
  }
  // tourné vers la porte, il l'ouvre (E), puis passe vers le sud
  await page.evaluate(() => (window as any).game.scene.getScene('world').player.actor.face('down'));
  await page.keyboard.press('KeyE');
  await press(['KeyS']);
  await until(async () => (await where()).id === 'ferme', 5000, 'sortir sur la ferme');
  await press([]);
  await until(async () => (await where()).mode === 'play', 5000, 'arrivé sur la ferme');
  // dehors, le chaume couvre l'âtre : sa lueur ne se voit pas (ce qui est caché ne se voit pas, lumière comprise : systems/roofs.ts)
  const glows = await page.evaluate(() =>
    (window as any).game.scene
      .getScene('world')
      .map.builds.flatMap((b: any) => (b.parts ?? []).filter((q: any) => q.light).map((q: any) => ({ prop: b.piece.piece.prop, visible: q.obj.visible, alpha: q.obj.alpha }))),
  );
  assert.ok(glows.some((g: any) => g.prop === 'stone-hearth'), `la lueur de l'âtre existe (${JSON.stringify(glows)})`);
  assert.ok(glows.every((g: any) => !g.visible || g.alpha < 0.01), `dehors, sous le toit, la lueur de l'âtre est cachée (${JSON.stringify(glows)})`);
  // la tempête : les branches de Tiled sont entrées au sol de la partie, comme des branches lâchées (seedMap)
  const fallen = await page.evaluate(async () => {
    const stateUrl = '/src/state/index.ts';
    const gs = await import(stateUrl);
    return gs.game.maps.ferme.ground.filter((g: any) => g.item === 'branch').length;
  });
  assert.ok(fallen >= 30, `les branches de la tempête au sol de la ferme (${fallen})`);

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
  // jusqu'au chemin nord-sud par un chemin libre (la sortie de la chaumière ne pose pas Xéros toujours au même pixel, et la cour a
  // ses obstacles), puis droit au sud, sur l'axe du chemin
  p = await where();
  const o = ferme!.world!;
  const onPath = { x: farmPath - o.x, y: p.y + 64 };
  const farmRoute = await routeTo(onPath);
  assert.ok(farmRoute.length > 1, 'un chemin libre de la porte au chemin nord-sud');
  for (const c of farmRoute.slice(1)) {
    const now = await where();
    await goTo(o.x + c.x, o.y + c.y, Math.abs(o.x + c.x - now.wx) > Math.abs(o.y + c.y - now.wy) ? 'x' : 'y', 2);
  }
  await goTo(farmPath, ROAD, 'y', 2);
  // 3. vers l'est, le long du chemin : la ferme, le chemin du village, le village ; jusqu'au milieu de la place
  const place = { x: 478.5 * TILE, y: 191.5 * TILE };
  await goTo(place.x, ROAD, 'x');
  p = await where();
  assert.equal(p.id, 'village', 'la place est dans la zone du village');
  assert.ok(Math.hypot(p.wx - place.x, p.wy - place.y) < 15 * 20, `sur la place (${p.wx}, ${p.wy})`);
  const zonesSeen = await page.evaluate(() => (window as any).crossings.map((c: any) => c.from));
  assert.deepEqual(zonesSeen, ['ferme -> chemin', 'chemin -> village'], 'ferme, chemin, village : deux bords passés');

  // 3 bis. vers le nord, comme un joueur : de la place, droit au nord jusqu'à la zone voisine, puis retour à la place (le bord nord
  // arrêtait Xéros : le passage testait le bas de ses pieds, que le corps empêchait d'atteindre le bord ; tools/test-zones.ts)
  // un chemin libre de la place au bord nord (une recherche en largeur sur une grille de 8 px, la place des pieds libre à chaque pas),
  // en px du monde ; puis, au bord, droit au nord
  const northRoute = (await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    const o = m.def.world;
    const S = 8;
    const W = Math.floor(m.width / S);
    const H = Math.floor(m.height / S);
    const free = (x: number, y: number) => m.areaFree({ left: x - 6, top: y - 9, right: x + 6, bottom: y });
    const start = Math.round(w.player.actor.y / S) * W + Math.round(w.player.actor.x / S);
    const prev = new Int32Array(W * H).fill(-2);
    prev[start] = -1;
    const q = [start];
    let end = -1;
    for (let k = 0; k < q.length; k++) {
      const i = q[k];
      const x = i % W;
      const y = Math.floor(i / W);
      // le bord nord, à deux cases de la grille (16 px) : plus près, la boîte des pieds sortirait de la carte (areaFree la refuse)
      if (y <= 2) {
        end = i;
        break;
      }
      for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const n = ny * W + nx;
        if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1 || prev[n] !== -2 || !free(nx * S, ny * S)) continue;
        prev[n] = i;
        q.push(n);
      }
    }
    if (end < 0) return [];
    const out: { x: number; y: number }[] = [];
    for (let i = end; i >= 0; i = prev[i]) out.unshift({ x: (i % W) * S + o.x, y: Math.floor(i / W) * S + o.y });
    // seulement les coins
    return out.filter((_q, i) => i === 0 || i === out.length - 1 || out[i - 1].x !== out[i + 1].x && out[i - 1].y !== out[i + 1].y);
  })) as { x: number; y: number }[];
  assert.ok(northRoute.length > 1, 'un chemin libre de la place au bord nord du village');
  for (const c of northRoute.slice(1)) {
    const now = await where();
    await goTo(c.x, c.y, Math.abs(c.x - now.wx) > Math.abs(c.y - now.wy) ? 'x' : 'y', 2);
  }
  const lane = { x: northRoute[northRoute.length - 1].x, top: (await where()).wy - ((await where()).y) };
  await goTo(lane.x, lane.top - 48, 'y');
  const north = await where();
  assert.notEqual(north.id, 'village', `passé au nord du village (${north.id})`);
  assert.ok(north.wy < lane.top, `dans la zone au nord (y du monde ${north.wy})`);
  // et retour : vers le sud, dans le village, puis sur la place par le même chemin
  await goTo(lane.x, lane.top + 48, 'y');
  assert.equal((await where()).id, 'village', 'revenu au village par le sud');
  for (const c of [...northRoute].reverse().slice(1)) {
    const now = await where();
    await goTo(c.x, c.y, Math.abs(c.x - now.wx) > Math.abs(c.y - now.wy) ? 'x' : 'y', 2);
  }

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
  await goTo(post.x, post.y + 22, 'x');
  // tourné vers le nord, sans faire un pas (un appui de W, sous la charge, le ferait marcher plusieurs images avant d'être relâché)
  await page.evaluate(() => (window as any).game.scene.getScene('world').player.actor.face('up'));
  await page.evaluate(() => (window as any).__frames(2));
  await page.keyboard.press('KeyE');
  await until(() => page.evaluate(() => !!(window as any).game.scene.isActive('dialogue')), 3000, 'lire le panneau');
  const said = await page.evaluate(() => (window as any).game.scene.getScene('dialogue').def?.lines?.[0]?.text ?? (window as any).game.scene.getScene('dialogue').lines?.[0]?.text);
  for (let i = 0; i < 4 && (await page.evaluate(() => (window as any).game.scene.isActive('dialogue'))); i++) {
    await page.keyboard.press('KeyE');
    await page.evaluate(() => (window as any).__frames(2));
  }
  // 5. le bord du monde, à l'est : on ne passe pas
  p = await where();
  await press(['KeyD']);
  // jusqu'à ce qu'il ne bouge plus : dix images de suite au même endroit, contre le bord
  await page.evaluate(() => {
    const a = (window as any).game.scene.getScene('world').player.actor;
    let last = NaN;
    let still = 0;
    return (window as any).__until(() => {
      still = Math.abs(a.x - last) < 0.01 ? still + 1 : 0;
      last = a.x;
      return still >= 10;
    }, 'arrêté au bord du monde');
  });
  await press([]);
  const edge = await where();
  assert.equal(edge.id, 'route-de-la-ville', 'le bord du monde arrête Xéros');
  assert.ok(edge.x <= 125 * TILE, `toujours dans la zone (x = ${edge.x})`);
  // un pas en arrière, loin du poteau (collé à lui, sa collision le repousserait de quelques px à la reprise)
  await goTo(post.x, post.y + 48, 'x');
  await page.evaluate(() => (window as any).__idle());
  const before = await where();

  const crossings = await page.evaluate(() => (window as any).crossings);
  // 6. la page rechargée : la partie le retrouve là
  await load('?dieu');
  const after = await where();
  assert.equal(after.id, before.id, 'la même zone après le rechargement');
  assert.ok(Math.abs(after.x - before.x) <= 1 && Math.abs(after.y - before.y) <= 1, `les mêmes pieds (${before.x}, ${before.y}) -> (${after.x}, ${after.y})`);

  // 7. la forêt profonde : le temps d'une image, immobile puis en marche (moyenne et pire sur 1,5 s), à x1 (l'image d'un joueur, pas
  // celle de dix pas de jeu)
  emit({ kind: 'map', map: 'foret-profonde' });
  await until(async () => (await where()).id === 'foret-profonde' && (await where()).mode === 'play', 15000, 'la forêt profonde');
  await page.evaluate(() => (window as any).__idle());
  await emit({ kind: 'sim-speed', factor: 1 });
  await page.evaluate(() => (window as any).__frames(10));
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
            if (performance.now() - start < 1500) requestAnimationFrame(step);
            else resolve({ mean: ds.reduce((a, b) => a + b, 0) / ds.length, worst: Math.max(...ds), objects: w.map.props.length, band: w.children.list.length });
          };
          requestAnimationFrame(step);
        }),
    );
  const still = await measure();
  await press(['KeyD']);
  const walking = await measure();
  await press([]);
  await page.evaluate(() => (window as any).__resume());

  assert.deepEqual(errors, [], 'aucune erreur dans la page');
  assert.equal(said, 'Vers la ville. La route n’est pas encore pour moi.'.replace('’', "'"), 'le panneau se lit');
  console.log(`  ✓ monde : du cagibi à la place (${zonesSeen.join(", ")}), au nord du village et retour, puis au panneau ; le bord du monde arrête ; rechargé à la même place`);
  console.log(`    passages de bord (redémarrage de la scène) : ${crossings.map((c: any) => `${c.from} ${c.ms} ms`).join(' ; ')}`);
  console.log(
    `    forêt profonde (${still.objects} objets, ${still.band} objets affichés avec la bande des voisines) : une image ${still.mean.toFixed(1)} ms en moyenne (pire ${still.worst.toFixed(0)} ms) immobile, ${walking.mean.toFixed(1)} ms (pire ${walking.worst.toFixed(0)} ms) en marche (Chromium sans écran, rendu logiciel)`,
  );
});
