// Test de scénario de l'équarrissage, dans le vrai jeu (voir tools/lib/playtest.ts) : abattre un arbre normal à la cognée,
// couper son houppier (le tronc ébranché devient une seule pièce de bois ronde de 5,8 m), refuser une coupe qui laisserait un
// bout de moins de 60 cm, couper à 3 m sur la grille de 20 cm (la ligne « 3 m | 2,8 m » au-dessus de la coupe, l'encoche gardée
// dans GameState, deux pièces), recouper la pièce de 2,8 m en 1,8 m et 1 m, rouler la pièce de 3 m, l'équarrir à la doloire par
// passes sur le rail (refusée au milieu ; à un bout, Espace lance la passe : Xéros longe la pièce tout seul, sourd aux autres
// touches ; Échap l'arrête, la longueur dressée est gardée dans GameState à la position du fer, la pièce entamée ne roule plus ;
// reprise ailleurs refusée, reprise là où elle s'est arrêtée ; puis une passe par face, aller et retour, la poutre à la quatrième :
// sa masse, son prix d'endurance proportionnel à la longueur, elle ne roule plus et ne se porte pas), la
// pièce de 1 m qui se porte et va en tas ; le gros arbre et le têtard abattus, ébranchés (une pièce ronde de 4 m, de 2 m) et coupés
// à 1 m ; puis la page rechargée : tout est retrouvé.
// Usage : npm run test:equarrissage (lancé aussi par npm run test:scenarios).

import assert from 'node:assert/strict';
import { playtest } from './lib/playtest';

await playtest('équarrissage', async ({ page, errors, load }) => {
  const scenario = async () => {
    return page.evaluate(async () => {
      const sleep = (t: number) => new Promise((r) => setTimeout(r, t));
      const g = (window as any).game;
      const w = () => g.scene.getScene('world');
      // chemins dans une variable : ce sont des modules de la page (servis par Vite), pas du test
      const stateUrl = '/src/state/index.ts';
      const massUrl = '/src/content/mass.ts';
      const gs = await import(stateUrl);
      const mass = await import(massUrl);
      const emit = (c: unknown) => g.events.emit('dieu', c);
      const notices: string[] = [];
      g.events.on('notice', (t: string) => notices.push(t));
      const press = async (code: string, ms = 60) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        await sleep(ms);
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
        await sleep(120);
      };
      const settled = async () => {
        for (let i = 0; i < 100 && w().mode !== 'play'; i++) await sleep(50);
        await sleep(300);
      };
      // une passe de doloire entière : Xéros longe la pièce (près de 9 s pour 3 m), puis le quart de tour
      const passed = async () => {
        for (let i = 0; i < 1000 && w().mode !== 'play'; i++) await sleep(50);
        await sleep(300);
      };
      const give = async (item: string) => {
        emit({ kind: 'give', held: { item } });
        await sleep(120);
      };
      const props = (re: RegExp) => w().map.props.filter((p: any) => re.test(p.type));
      // les pièces de bois d'un diamètre, et leurs longueurs
      const logs = (size = 'normal') => w().map.props.filter((p: any) => p.wood?.size === size && !p.wood.hewn);
      const beams = () => w().map.props.filter((p: any) => p.wood?.hewn >= 12);
      const lengths = (size: string) => logs(size).map((p: any) => p.wood.length).sort((x: number, y: number) => x - y);
      const kg = (wood: object) => Math.round(mass.woodMass(wood) * 10) / 10;
      const spawned = () => gs.mapState(gs.game, w().map.def.id).spawned;
      const a = () => w().player.actor;
      // Xéros les pieds en (x, y), tourné vers `face`
      const standAt = async (x: number, y: number, face: string) => {
        a().body.reset(Math.round(x), Math.round(y));
        a().face(face);
        await sleep(160);
      };
      // écart entre les pieds de Xéros et le bas de sa collision
      const feet = () => a().body.bottom - a().y;
      // Xéros au nord d'une pièce couchée est-ouest, collé à son flanc, le fer (strike.down de chop : -1) sur la colonne `col` de son image
      const aboveAt = async (p: any, col: number) => {
        await standAt(p.x + col + 1, p.box.top - feet() - 0.5, 'down');
      };
      const out: Record<string, unknown> = {};

      // 1. à la ferme, un arbre normal : quatre coups de cognée depuis l'ouest, il tombe vers l'est
      emit({ kind: 'map', map: 'ferme' });
      await sleep(2200);
      emit({ kind: 'stamina-infinite', on: true });
      const tree = props(/^normal-tree$/)[0];
      await give('axe');
      await standAt(tree.box.left - 6, tree.box.bottom - 1, 'right');
      for (let i = 0; i < 4; i++) {
        await press('Space');
        await settled();
      }
      await sleep(2500);
      const felled = props(/^normal-felled-tree$/)[0];
      out.felled = !!felled;

      // 2. le houppier : trois coups, des branches, et le tronc ébranché devient une seule pièce ronde de 5,8 m
      await standAt(felled.aimX, felled.aimY + 14, 'up');
      for (let i = 0; i < 3; i++) {
        await press('Space');
        await settled();
      }
      out.trunk = lengths('normal');
      out.branches = gs.mapState(gs.game, w().map.def.id).ground.filter((q: any) => q.item === 'branch').length;
      const trunk = logs()[0];
      // les branches ramassées (sinon E les prendrait avant les rondins voisins)
      for (const gr of [...w().map.ground]) {
        gs.removeGroundItem(gs.game, w().map.def.id, gr.item.id);
        w().map.removeGround(gr);
      }
      out.trunkMass = Math.round(mass.woodMass(trunk.wood));

      // 3. une coupe à 40 cm du bout scié : refusée (un bout de moins de 60 cm), sans geste ni dépense, et sans ligne
      emit({ kind: 'stamina-infinite', on: false });
      emit({ kind: 'stamina', value: 100 });
      await give('axe');
      await aboveAt(trunk, 8);
      await sleep(100);
      out.shortLabel = w().wood.labelText ?? null;
      await press('Space');
      await sleep(300);
      out.shortNotice = notices.at(-1);
      out.shortMode = w().mode;
      out.shortCost = 100 - w().player.stamina.value;

      // la coupe à 3 m du bout scié, aimantée à la grille : la ligne des deux longueurs, l'encoche notée, trois coups, deux pièces
      await aboveAt(trunk, 59);
      await sleep(100);
      out.label = w().wood.labelText;
      await press('Space');
      await settled();
      out.notch = JSON.stringify(spawned().find((q: any) => q.id === trunk.id)?.wood.notch);
      for (let i = 0; i < 2; i++) {
        await aboveAt(logs().find((p: any) => p.id === trunk.id), 60);
        await press('Space');
        await settled();
      }
      out.cutCost = Math.round((100 - w().player.stamina.value) * 100) / 100;
      out.pieces = lengths('normal');
      out.cutNotice = notices.at(-1);
      const three = () => logs().find((p: any) => p.wood.length === 300);
      out.threeMass = Math.round(mass.woodMass({ size: 'normal', length: 300, shape: 'round', axis: 'ew' }));

      // la pièce de 2,8 m : trop lourde à porter, elle se roule ; puis recoupée à 1,8 m de son bout ouest : le poteau bas et une bille de 1 m
      gs.emptyHands(gs.game);
      w().handsChanged();
      const rest = logs().find((p: any) => p.wood.length === 280);
      await standAt((rest.box.left + rest.box.right) / 2, rest.box.bottom + 9, 'up');
      await press('KeyE');
      out.restNotice = notices.at(-1);
      emit({ kind: 'stamina-infinite', on: true });
      await give('axe');
      for (let i = 0; i < 3; i++) {
        await aboveAt(logs().find((p: any) => p.id === rest.id) ?? rest, 36);
        if (i === 0) out.restLabel = w().wood.labelText;
        await press('Space');
        await settled();
      }
      emit({ kind: 'stamina-infinite', on: false });
      out.pieces2 = lengths('normal');

      // 4. rouler le rondin de 3 m vers le sud : Xéros au nord, il marche contre lui
      gs.emptyHands(gs.game);
      w().handsChanged();
      const r = three();
      await standAt((r.box.left + r.box.right) / 2, r.box.top - feet() - 0.5, 'down');
      const y0 = r.y;
      await press('KeyS', 1800);
      await sleep(200);
      out.rolled = three().y - y0;
      out.rolledSaved = spawned().find((q: any) => q.id === three().id)?.y === three().y;

      // 5. l'équarrir à la doloire, par passes sur le rail
      emit({ kind: 'stamina', value: 100 });
      await give('broadaxe');
      const faces: (string | undefined)[] = [];
      const hewnId = three().id;
      const hewing = () => w().map.props.find((p: any) => p.id === hewnId && p.spawned);
      // au milieu de la pièce : refusé, sans geste ni dépense
      await aboveAt(hewing(), 30);
      await press('Space');
      await sleep(200);
      out.middleNotice = notices.at(-1);
      out.middleMode = w().mode;
      out.middleCost = 100 - w().player.stamina.value;
      // au bout ouest : Espace lance la passe, Xéros avance tout seul vers l'est en frappant
      await aboveAt(hewing(), 2);
      const [hx0, hy0] = [a().x, a().y];
      await press('Space');
      out.passMode = w().mode;
      await sleep(1500);
      // les autres touches ne font rien pendant la passe
      await press('KeyS', 300);
      await press('KeyE');
      out.passY = a().y - hy0;
      await sleep(1500);
      out.walked = a().x - hx0;
      out.passAnim = a().anims.currentAnim?.key;
      // Échap : arrêtée là où il est ; la face entamée est gardée dans GameState, jusqu'au fer
      await press('Escape');
      await sleep(150);
      out.stopMode = w().mode;
      out.stopNotice = notices.at(-1);
      const stopX = a().x;
      await sleep(600);
      out.stopStill = a().x === stopX;
      const dressed = spawned().find((q: any) => q.id === hewnId)?.wood.dressed;
      out.dressed = dressed;
      // le fer (strike.down de chop : -1) est sur la colonne x + strike de l'image ; 5 cm par pixel
      out.dressedVsFer = dressed && dressed.length - (stopX - 1 - hewing().x) * 5;
      out.dressedTexture = hewing().image.texture.key;
      // la pièce entamée ne roule plus
      gs.emptyHands(gs.game);
      w().handsChanged();
      await standAt(stopX, hy0, "down");
      await press('KeyS', 900);
      out.dressedRoll = notices.at(-1);
      await give('broadaxe');
      // reprendre ailleurs : refusé ; reprendre là où elle s'est arrêtée : la passe va jusqu'au bout est
      await aboveAt(hewing(), 50);
      await press('Space');
      await sleep(200);
      out.resumeElsewhere = notices.at(-1);
      await standAt(stopX, hy0, "down");
      await press('Space');
      out.resumeMode = w().mode;
      await passed();
      faces.push(notices.at(-1));
      out.endX = a().x - hx0;
      out.afterFace = spawned().find((q: any) => q.id === hewnId)?.wood;
      // les trois autres faces : depuis le bout où il est, aller et retour
      for (let i = 2; i <= 4; i++) {
        await press('Space');
        await passed();
        faces.push(notices.at(-1));
      }
      out.faces = faces;
      out.hewCost = Math.round((100 - w().player.stamina.value) * 10) / 10;
      const beam = beams()[0];
      out.beam = beam && { length: beam.wood.length, kg: kg(beam.wood) };
      out.shortBeamKg = kg({ size: 'normal', length: 180, shape: 'round', axis: 'ew', hewn: 12 });

      // la poutre ne roule pas, ne se porte pas (108 kg)
      gs.emptyHands(gs.game);
      w().handsChanged();
      await standAt((beam.box.left + beam.box.right) / 2, beam.box.top - feet() - 0.5, 'down');
      const by = beam.y;
      await press('KeyS', 900);
      out.beamRollNotice = notices.at(-1);
      out.beamMoved = beams()[0].y - by;
      await standAt((beam.box.left + beam.box.right) / 2, beam.box.bottom + 9, 'up');
      await press('KeyE');
      out.beamTakeNotice = notices.at(-1);

      // 6. la bille de 1 m tirée du tronc : elle se porte (64 kg) et va en tas
      const bille = logs().find((p: any) => p.wood.length === 100);
      out.billeMass = kg(bille.wood);
      await standAt((bille.box.left + bille.box.right) / 2, bille.box.top - feet() - 0.5, 'down');
      await press('KeyE');
      out.billeHeld = JSON.stringify(gs.game.both);
      await standAt(a().x, a().y + 30, 'down');
      await press('KeyQ');
      // seule : un tas ne naît que contre une pièce identique déjà au sol
      out.billePile = gs.mapState(gs.game, w().map.def.id).piles.filter((p: any) => p.wood).length;
      out.billeLaid = logs().filter((p: any) => p.wood.length === 100 && p.wood.size === 'normal').length;
      out.handsEnd = JSON.stringify(gs.game.both);

      // 7. le gros arbre et le têtard : abattus, ébranchés (une seule pièce ronde du gros diamètre, de leur longueur utile), coupés à 1 m
      emit({ kind: 'stamina-infinite', on: true });
      const big: Record<string, unknown> = {};
      for (const [tree, lying] of [['big-tree', 'big-felled-tree'], ['big-pollard', 'big-pollard-felled-tree']]) {
        const before = new Set(logs('big').map((p: any) => p.id));
        const t = props(new RegExp(`^${tree}$`))[0];
        await give('axe');
        await standAt(t.box.left - 6, t.box.bottom - 1, 'right');
        for (let i = 0; i < 4; i++) {
          await press('Space');
          await settled();
        }
        await sleep(2500);
        const f = props(new RegExp(`^${lying}$`)).at(-1);
        await standAt(f.aimX, f.aimY + 14, 'up');
        for (let i = 0; i < 3; i++) {
          await press('Space');
          await settled();
        }
        const piece = logs('big').find((p: any) => !before.has(p.id));
        const trunk = { length: piece?.wood.length, kg: piece && Math.round(mass.woodMass(piece.wood)) };
        for (const gr of [...w().map.ground]) {
          gs.removeGroundItem(gs.game, w().map.def.id, gr.item.id);
          w().map.removeGround(gr);
        }
        // la coupe à 1 m du bout scié (ouest : l'arbre est tombé vers l'est)
        let label: string | undefined;
        for (let i = 0; i < 3; i++) {
          await aboveAt(w().map.props.find((p: any) => p.id === piece.id && p.spawned), 20);
          if (i === 0) label = w().wood.labelText;
          await press('Space');
          await settled();
        }
        const cut = logs('big')
          .filter((p: any) => !before.has(p.id))
          .map((p: any) => p.wood.length)
          .sort((x: number, y: number) => x - y);
        big[tree] = { trunk, label, cut };
      }
      out.big = big;
      emit({ kind: 'stamina-infinite', on: false });

      out.before = JSON.stringify({
        beam: beams().map((p: any) => [p.x, p.y, p.wood.length]),
        logs: w()
          .map.props.filter((p: any) => p.wood && !p.wood.hewn)
          .map((p: any) => [p.x, p.y, p.wood.size, p.wood.length])
          .sort(),
      });
      await sleep(400);
      return out;
    });
  };
  const result = await scenario().catch(async (e: Error) => {
    if (!/context was destroyed|navigation/.test(e.message)) throw e;
    await load();
    return scenario();
  });
  console.log(JSON.stringify(result));
  const r = result as Record<string, any>;
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(r.felled, true, "l'arbre normal est couché");
  assert.deepEqual(r.trunk, [580], 'ébranché, le tronc est une seule pièce ronde de 5,8 m');
  assert.ok(r.branches >= 3, `le houppier donne des branches : ${r.branches}`);
  assert.ok(r.trunkMass > 300, `le tronc entier ne roule pas (${r.trunkMass} kg > 300)`);
  assert.equal(r.shortLabel, null, 'pas de ligne sur une coupe refusée');
  assert.equal(r.shortNotice, 'Le bout serait trop court.', 'une coupe à 40 cm du bout est refusée');
  assert.equal(r.shortMode, 'play', 'refus sans geste');
  assert.equal(r.shortCost, 0, 'un refus ne coûte rien');
  assert.equal(r.label, '3 m | 2,8 m', 'la coupe visée, aimantée à 3 m, et les deux longueurs');
  assert.equal(r.notch, JSON.stringify({ at: 300, hits: 1 }), "l'encoche est notée dans GameState");
  assert.deepEqual(r.pieces, [280, 300], 'deux pièces, de 2,8 m et 3 m');
  assert.equal(r.cutNotice, 'Coupé : 3 m et 2,8 m.');
  assert.ok(Math.abs(r.cutCost - 2.4) < 0.01, `trois coups de cognée : 2,4 points (${r.cutCost})`);
  assert.equal(r.threeMass, 191, 'le rondin de 3 m pèse 191 kg');
  assert.equal(r.restNotice, 'Trop lourd à porter. Pousse-le pour le faire rouler.', 'le rondin de 2,8 m (178 kg) se roule');
  assert.equal(r.restLabel, '1,8 m | 1 m', 'la coupe du poteau bas : 1,8 m et une bille de 1 m');
  assert.deepEqual(r.pieces2, [100, 180, 300], 'le tronc donne 3 m, 1,8 m et 1 m, sans chute');
  assert.ok(r.rolled >= 3, `le rondin de 3 m roule vers le sud : ${r.rolled} px`);
  assert.equal(r.rolledSaved, true, 'sa position est notée');
  assert.equal(r.middleNotice, 'Mets-toi à un bout de la pièce pour commencer la face.', 'la passe commence à un bout');
  assert.equal(r.middleMode, 'play', 'refus sans geste');
  assert.equal(r.middleCost, 0, 'un refus ne coûte rien');
  assert.equal(r.passMode, 'rail', 'Espace au bout lance la passe');
  assert.equal(r.passY, 0, 'pendant la passe, les touches de marche ne font rien');
  assert.ok(r.walked > 10, `Xéros longe la pièce tout seul : ${r.walked} px`);
  assert.match(r.passAnim ?? '', /chop-down/, 'en frappant (le geste chop)');
  assert.equal(r.stopMode, 'play', 'Échap arrête la passe');
  assert.equal(r.stopNotice, 'Arrêté : la face reprendra là.');
  assert.equal(r.stopStill, true, 'arrêté, il ne bouge plus');
  assert.equal(r.dressed?.from, 'start', 'la face part du bout ouest');
  assert.ok(r.dressed?.length > 0 && r.dressed.length < 300, `la longueur dressée est gardée : ${JSON.stringify(r.dressed)}`);
  assert.ok(Math.abs(r.dressedVsFer) <= 20, `dressée jusqu'à la position du fer, à un coup près : ${r.dressedVsFer} cm`);
  assert.match(r.dressedTexture, /:dstart\d+:/, 'son image montre la face entamée');
  assert.equal(r.dressedRoll, 'Il ne roule plus : une face est entamée.');
  assert.equal(r.resumeElsewhere, "Reprends la face là où tu l'as laissée.");
  assert.equal(r.resumeMode, 'rail', 'la passe reprend là où elle s’était arrêtée');
  assert.ok(r.endX > 55, `elle va jusqu'au bout est : ${r.endX} px`);
  assert.ok(r.afterFace?.hewn === 3 && !r.afterFace.dressed, `la face finie passe dans hewn, sans face entamée : ${JSON.stringify(r.afterFace)}`);
  assert.deepEqual(r.faces, ['Une face dressée (1 sur 4).', 'Une face dressée (2 sur 4).', 'Une face dressée (3 sur 4).', 'Poutre équarrie : 3 m.']);
  assert.ok(Math.abs(r.hewCost - 12) < 0.1, `équarrir un poteau de 3 m coûte environ 12 points, proportionnel à sa longueur : ${r.hewCost}`);
  assert.deepEqual(r.beam, { length: 300, kg: 108 }, 'la poutre de 3 m pèse 108 kg');
  assert.equal(r.shortBeamKg, 64.8, 'celle de 1,80 m, 65 kg (elle se porte)');
  assert.equal(r.beamRollNotice, 'Elle ne roule pas : elle est carrée.');
  assert.equal(r.beamMoved, 0, 'la poutre ne bouge pas');
  assert.equal(r.beamTakeNotice, 'Trop lourde à porter.', 'la poutre de 3 m ne se porte pas');
  assert.equal(r.billeMass, 63.6, 'la bille de 1 m pèse 64 kg');
  assert.match(r.billeHeld, /"prop":"wood-piece","wood":\{"size":"normal","length":100/, 'la bille se porte');
  assert.equal(r.billePile, 0, 'posée seule : pas de tas sans une pièce identique à côté');
  assert.equal(r.billeLaid, 1, 'elle est au sol, seule');
  assert.equal(r.handsEnd, 'null');
  assert.deepEqual(r.big['big-tree'], { trunk: { length: 400, kg: 855 }, label: '1 m | 3 m', cut: [100, 300] }, 'le gros arbre : 4 m, 855 kg, coupé à 1 m');
  assert.deepEqual(r.big['big-pollard'], { trunk: { length: 200, kg: 428 }, label: '1 m | 1 m', cut: [100, 100] }, 'le têtard : 2 m, coupé à 1 m');

  // 7. la page rechargée : la poutre, les rondins et le tas sont retrouvés
  await page.reload();
  await page.waitForFunction(() => !!(window as any).game?.scene.getScene('world')?.player, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const after = await page.evaluate(async () => {
    const stateUrl = '/src/state/index.ts';
    const gs = await import(stateUrl);
    const w = (window as any).game.scene.getScene('world');
    return {
      map: w.map.def.id,
      before: JSON.stringify({
        beam: w.map.props.filter((p: any) => p.wood?.hewn >= 12).map((p: any) => [p.x, p.y, p.wood.length]),
        logs: w.map.props
          .filter((p: any) => p.wood && !p.wood.hewn)
          .map((p: any) => [p.x, p.y, p.wood.size, p.wood.length])
          .sort(),
      }),
      piles: gs.mapState(gs.game, w.map.def.id).piles.filter((p: any) => p.wood).length,
    };
  });
  console.log(JSON.stringify(after));
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(after.map, 'ferme');
  assert.equal(after.before, r.before, 'la poutre et les rondins sont retrouvés, à leur place et à leur longueur');
  assert.equal(after.piles, 0, 'toujours pas de tas');
  console.log("  ✓ équarrissage : de l'arbre normal à la poutre de 3 m, le gros arbre et le têtard coupés à 1 m, et tout retrouvé après rechargement");
});
