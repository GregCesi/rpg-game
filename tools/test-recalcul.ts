// Les corrections du diagnostic, dans le vrai jeu (tools/lib/playtest.ts ; chantier « corrections », DIAGNOSTIC.md), depuis une
// partie neuve :
// 1. les ombres de joint lisent chaque image une seule fois (world/alphaMask.ts), et donnent les mêmes pixels que la lecture pixel par
//    pixel de Phaser (getPixelAlpha) sur un échantillon de paires ;
// 2. le décalage d'affichage n'est plus compté deux fois : sur toutes les cartes qui ont des bâtiments, et dans la maison du coq, chaque
//    pièce posée est dessinée à sa place (à 4 px près : le calage, une seule fois, d'un tronçon au ras d'un angle ; doublé à chaque
//    assise, il faisait 8, 16… 256 px) ;
// 3. ouvrir la porte en arc ne reclasse que la porte (pas toute la carte : `fullSorts`, `lastSorted` de GameMap), et le résultat est
//    exactement celui d'un reclassement complet (place, profondeur, texture, découpe, tranches, ombres de chaque pièce) ; de même pour une
//    pièce posée puis retirée sur un mur de la maison (ses alentours seulement) ;
// 4. dedans, au rez-de-chaussée, l'étage reste invisible (ses pièces, leurs tranches, leurs ombres de joint) même une seconde après
//    l'entrée : un seul système en décide (systems/storeys.ts) ;
// 5. le plancher de l'étage : les planches jointives ont leur joint (texture `#joined`), sans pixel translucide entre elles.
// Usage : npm run test:recalcul.

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';
import { walker } from './lib/walk';

await playtest('recalcul', async ({ page, errors, load }) => {
  // un module du jeu, importé par son adresse dans la page (une chaîne : TypeScript ne le cherche pas dans tools/)
  await page.addInitScript('window.__mod = (u) => u;');
  await load('?dieu&reset');
  const { where, goTo } = walker(page);
  const W = (fn: string) => page.evaluate(fn);
  await W(`window.__idle('le réveil')`);
  await W(`window.game.events.emit('dieu', { kind: 'stamina-infinite', on: true })`);

  /** Ce qu'on voit de chaque pièce posée de la carte en cours : de quoi comparer deux reclassements. */
  const snapshot = () =>
    page.evaluate(() => {
      const m = (window as any).game.scene.getScene('world').map;
      const r = (v: number) => Math.round(v * 10000) / 10000;
      const pieces = m.builds
        .map((b: any) => ({
          id: b.piece.id,
          // (un objet animé, l'âtre : son image change d'elle-même, seule sa texture compte)
          tex: b.image.type === 'Sprite' ? b.image.texture.key : `${b.image.texture.key}|${b.image.frame.name}`,
          x: r(b.image.x),
          y: r(b.image.y),
          depth: r(b.image.depth),
          crop: b.image.isCropped ? [b.image._crop.x, b.image._crop.y, b.image._crop.width, b.image._crop.height] : null,
          slices: (b.slices ?? []).map((s: any) => [r(s.depth), s._crop.y, s._crop.height]),
          shown: m.shownOffset(b.piece),
        }))
        .sort((a: any, b: any) => a.id - b.id);
      const shades = m.shades.map((g: any) => `${g.getData('piece')}@${r(g.x)},${r(g.y)}:${r(g.depth)}:${g.commandBuffer.length}`).sort();
      return { pieces, shades, buildings: JSON.stringify(m.buildings) };
    });
  /** Les deux images doivent être les mêmes, pièce par pièce (le premier écart est nommé). */
  const same = (a: Awaited<ReturnType<typeof snapshot>>, b: Awaited<ReturnType<typeof snapshot>>, what: string) => {
    assert.equal(a.pieces.length, b.pieces.length, `${what} : le nombre de pièces`);
    for (let i = 0; i < a.pieces.length; i++) assert.deepEqual(a.pieces[i], b.pieces[i], `${what} : la pièce ${a.pieces[i].id}`);
    assert.deepEqual(a.shades, b.shades, `${what} : les ombres de joint`);
    assert.equal(a.buildings, b.buildings, `${what} : les bâtiments`);
  };
  /** Le reclassement complet de la carte en cours (aucune pièce marquée : `sortBuilds` refait tout). */
  const fullSort = () => W(`window.game.scene.getScene('world').map.sortBuilds()`);
  /** Les pièces dessinées loin de leur place : plus de 4 px de décalage de côté (un calage au ras d'un angle en fait 1 à 3). */
  const misplaced = () =>
    page.evaluate(() => {
      const m = (window as any).game.scene.getScene('world').map;
      const out: string[] = [];
      for (const b of m.builds) {
        const o = m.shownOffset(b.piece);
        if (Math.abs(o.dx) > 4) out.push(`${b.piece.piece.prop ?? 'bois'} (${b.piece.id}, vue ${b.piece.view}, z ${b.piece.z}) décalé de ${o.dx} px`);
      }
      return out;
    });

  // 2. toutes les cartes qui ont des bâtiments (des plans de Tiled) : chaque pièce à sa place
  const withPlans = (await page.evaluate(async () => {
    const c = await import(/* @vite-ignore */ (window as any).__mod('/src/content/index.ts'));
    return Object.values(c.maps as Record<string, any>).filter((m) => m.plans?.length).map((m) => m.id as string);
  })) as string[];
  assert.ok(withPlans.includes('ferme-du-riche') && withPlans.length >= 3, `des cartes à bâtiments (${withPlans.join(', ')})`);
  for (const id of withPlans) {
    await W(`window.__restart({ kind: 'map', map: '${id}' })`);
    await W(`window.__idle('${id}')`);
    assert.deepEqual(await misplaced(), [], `${id} : des pièces loin de leur place`);
  }
  console.log(`  ✓ décalages : chaque pièce posée à sa place sur ${withPlans.join(', ')}`);

  // la ferme du riche, la maison du coq
  await W(`window.__restart({ kind: 'map', map: 'ferme-du-riche' })`);
  await W(`window.__idle('la ferme du riche')`);

  // 1. les ombres de joint : chaque image lue une fois ; les mêmes pixels que getPixelAlpha (un échantillon de paires)
  const shades = await page.evaluate(async () => {
    const am = await import(/* @vite-ignore */ (window as any).__mod('/src/world/alphaMask.ts'));
    const js = await import(/* @vite-ignore */ (window as any).__mod('/src/world/jointShade.ts'));
    const g = (window as any).game;
    const m = g.scene.getScene('world').map;
    const tx = g.textures;
    const byId = new Map(m.builds.map((b: any) => [b.piece.id, b]));
    const shown = (b: any, opaque: (k: string, f: string, x: number, y: number) => boolean) => ({
      x: b.image.x - b.image.displayOriginX,
      y: b.image.y - b.image.displayOriginY,
      w: b.image.frame.width,
      h: b.image.frame.height,
      opaque: (x: number, y: number) => opaque(b.image.texture.key, b.image.frame.name, x, y),
    });
    const pairs = js.shadedPairs(m.builds.map((b: any) => b.piece));
    let compared = 0;
    const diff: string[] = [];
    for (const [u, d] of pairs.filter((_: unknown, i: number) => i % Math.max(1, Math.floor(pairs.length / 30)) === 0)) {
      const a = byId.get(u.id) as any;
      const b = byId.get(d.id) as any;
      // la lecture de Phaser n'est juste que pour un cadre au coin de sa source : comparer ceux-là
      if (a.image.frame.cutX || a.image.frame.cutY || b.image.frame.cutX || b.image.frame.cutY) continue;
      const mine = js.shadePixels(shown(a, (k, f, x, y) => am.alphaAt(tx, k, f, x, y) > 0), shown(b, (k, f, x, y) => am.alphaAt(tx, k, f, x, y) > 0));
      const old = js.shadePixels(shown(a, (k, f, x, y) => (tx.getPixelAlpha(x, y, k, f) ?? 0) > 0), shown(b, (k, f, x, y) => (tx.getPixelAlpha(x, y, k, f) ?? 0) > 0));
      if (JSON.stringify(mine) !== JSON.stringify(old)) diff.push(`${u.id}>${d.id}`);
      compared++;
    }
    return { pairs: pairs.length, compared, diff, reads: am.alphaReads(), kept: am.alphaMasksKept() };
  });
  assert.ok(shades.pairs > 400 && shades.compared >= 10, `des paires d'ombre à comparer (${shades.pairs}, ${shades.compared} comparées)`);
  assert.deepEqual(shades.diff, [], 'les ombres de joint : les mêmes pixels que getPixelAlpha');
  // au plus une lecture par image gardée (une planche jointive dépose ses pixels sans lecture) : aucune image n'est relue
  assert.ok(shades.reads <= shades.kept, `chaque image lue une seule fois (${shades.reads} lectures, ${shades.kept} images)`);
  console.log(`  ✓ ombres de joint : ${shades.pairs} paires, ${shades.compared} comparées pixel pour pixel, ${shades.reads} lectures pour ${shades.kept} images`);

  // 3. la porte en arc : ouverte par E, elle seule est reclassée ; le résultat est celui d'un reclassement complet
  const house = () =>
    page.evaluate(() => {
      const w = (window as any).game.scene.getScene('world');
      const door = w.map.builds.find((b: any) => /^oak-arch-door/.test(b.piece.piece.prop ?? ''));
      return door ? { x: (door.piece.x - 610) / 5, y: (door.piece.y - 640) / 5, open: /open/.test(door.piece.piece.prop) } : undefined;
    });
  const out = (await house())!;
  await page.evaluate(([x, y]) => {
    const w = (window as any).game.scene.getScene('world');
    w.player.actor.body.reset(x, y);
    w.player.actor.face('up');
  }, [Math.round(out.x + 134), Math.round(out.y + 136 + 30)] as const);
  await W(`window.__idle('devant la porte')`);
  await goTo((await where()).wx, (await where()).wy - 16, 'y', 2);
  await W(`window.__face('up')`);
  const sorts0 = (await W(`window.game.scene.getScene('world').map.fullSorts`)) as number;
  await W(`window.__key('KeyE')`);
  await W(`window.__until(() => /open/.test(window.game.scene.getScene('world').map.builds.find((b) => /^oak-arch-door/.test(b.piece.piece.prop ?? ''))?.piece.piece.prop ?? ''), 'E ouvre la porte en arc')`);
  const after = (await W(`({ full: window.game.scene.getScene('world').map.fullSorts, last: window.game.scene.getScene('world').map.lastSorted })`)) as { full: number; last: number };
  assert.equal(after.full, sorts0, 'ouvrir la porte ne reclasse pas toute la carte');
  assert.ok(after.last <= 2, `ouvrir la porte ne reclasse qu'elle (${after.last} pièces)`);
  const partial = await snapshot();
  await fullSort();
  same(partial, await snapshot(), 'la porte ouverte');
  console.log(`  ✓ porte en arc : ${after.last} pièce reclassée, le même résultat qu'un reclassement complet`);

  // une pièce posée sur un mur de la maison, puis retirée : ses alentours seulement, le même résultat que tout refaire
  const placed = await page.evaluate(async () => {
    const st = await import(/* @vite-ignore */ (window as any).__mod('/src/state/index.ts'));
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    // le dessus d'un morceau de mur (le plus haut du mur ouest de la maison)
    const wall = m.builds
      .filter((b: any) => b.piece.piece.prop === 'ashlar-wall' && b.piece.view === 1)
      .sort((a: any, b: any) => b.piece.z - a.piece.z)[0].piece;
    const top = wall.z + 30;
    const [p] = st.addBuildPieces(st.game, m.def.id, [{ piece: { prop: 'barrel' }, x: wall.x, y: wall.y + 40, z: top, view: 0 }]);
    m.placeBuild(p);
    const full = m.fullSorts;
    m.sortBuilds();
    return { id: p.id, full: m.fullSorts - full, last: m.lastSorted, all: m.builds.length };
  });
  assert.equal(placed.full, 0, 'poser une pièce ne reclasse pas toute la carte');
  assert.ok(placed.last < placed.all / 4, `poser une pièce ne reclasse que ses alentours (${placed.last} sur ${placed.all})`);
  const partial2 = await snapshot();
  await fullSort();
  same(partial2, await snapshot(), 'une pièce posée sur le mur');
  const removed = await page.evaluate(async (id) => {
    const st = await import(/* @vite-ignore */ (window as any).__mod('/src/state/index.ts'));
    const m = (window as any).game.scene.getScene('world').map;
    st.removeBuildPieces(st.game, m.def.id, [id]);
    m.removeBuild(id);
    const full = m.fullSorts;
    m.sortBuilds();
    return { full: m.fullSorts - full, last: m.lastSorted };
  }, placed.id);
  assert.equal(removed.full, 0, 'retirer une pièce ne reclasse pas toute la carte');
  const partial3 = await snapshot();
  await fullSort();
  same(partial3, await snapshot(), 'la pièce retirée');
  console.log(`  ✓ poser puis retirer une pièce : ${placed.last} puis ${removed.last} pièces reclassées sur ${placed.all}, le même résultat qu'un reclassement complet`);

  // 4. dedans : l'étage invisible au rez-de-chaussée, même une seconde après l'entrée
  await W(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))`);
  await W(`window.__until(() => window.game.scene.getScene('world').map.def.id.startsWith('interieur:'), 'entrer dans la maison')`);
  await W(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))`);
  await W(`window.__idle('dedans')`);
  // une seconde de jeu : le temps que les toits remettaient l'étage à l'opaque (250 ms de fondu)
  await W(`window.__steps(60)`);
  const seen = await page.evaluate(() => {
    const w = (window as any).game.scene.getScene('world');
    const m = w.map;
    const up = m.builds.filter((b: any) => w.storeys && !w.storeys['storeysOf'](b).includes(0));
    const visible = up.filter((b: any) => b.image.alpha > 0 || (b.slices ?? []).some((s: any) => s.alpha > 0)).map((b: any) => b.piece.piece.prop ?? 'bois');
    const upIds = new Set(up.map((b: any) => b.piece.id));
    const shades = m.shades.filter((g: any) => upIds.has(g.getData('piece')) && g.alpha > 0).length;
    return { storey: w.storeys?.current, up: up.length, visible: [...new Set(visible)], shades };
  });
  assert.equal(seen.storey, 0, 'en entrant : le rez-de-chaussée');
  assert.ok(seen.up > 100, `les pièces de l'étage (${seen.up})`);
  assert.deepEqual(seen.visible, [], "au rez-de-chaussée, aucune pièce de l'étage ne se voit");
  assert.equal(seen.shades, 0, "au rez-de-chaussée, aucune ombre de joint de l'étage ne se voit");
  assert.deepEqual(await misplaced(), [], 'dans la maison du coq : des pièces loin de leur place');
  console.log(`  ✓ dedans : les ${seen.up} pièces de l'étage invisibles au rez-de-chaussée, ombres comprises ; chaque pièce à sa place`);

  // 5. le plancher de l'étage : ses planches jointives ont leur joint, sans pixel translucide
  const floor = await page.evaluate(async () => {
    const am = await import(/* @vite-ignore */ (window as any).__mod('/src/world/alphaMask.ts'));
    const g = (window as any).game;
    const m = g.scene.getScene('world').map;
    const planks = m.builds.filter((b: any) => b.piece.piece.wood?.shape === 'plank');
    const joined = planks.filter((b: any) => /#joined:/.test(b.image.texture.key));
    // dans chaque planche jointive, la colonne du milieu : aucun pixel translucide sous l'arête
    let translucent = 0;
    for (const b of joined) {
      const mk = am.alphaMask(g.textures, b.image.texture.key, b.image.frame.name)!;
      const x = Math.floor(mk.w / 2);
      for (let y = 0; y < mk.h; y++) {
        const a = mk.a[y * mk.w + x];
        if (a > 0 && a < 255) translucent++;
      }
    }
    return { planks: planks.length, joined: joined.length, translucent };
  });
  assert.ok(floor.planks >= 60 && floor.joined >= floor.planks - 8, `les planches jointives (${floor.joined} sur ${floor.planks})`);
  assert.equal(floor.translucent, 0, 'aucun pixel translucide entre deux planches jointives');
  console.log(`  ✓ plancher : ${floor.joined} planches jointives sur ${floor.planks}, sans jour entre elles`);

  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
});
