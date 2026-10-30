// Test de scénario du fendage, dans le vrai jeu : un Chromium sans écran pilote le jeu servi par Vite, avec de vrais
// appuis de touches (Espace, R), comme le joueur. De la grosse bille posée par ?dieu jusqu'aux quatre quartiers :
// refus (hache, masse sans coin), planter le coin, trois coups de masse, demi-billes, coin lâché, quartiers, masses,
// endurance, coups gardés dans GameState, quartier tourné et tas de quartiers.
// Usage : npm run test:fendage (lancé aussi par npm run test). Il faut un Chromium : celui de Playwright
// (~/Library/Caches/ms-playwright, `npx playwright-core install chromium`), ou FENDAGE_CHROME=<exécutable>.
// Sans Chromium le test dit qu'il est ignoré (FENDAGE_REQUIRED=1 le rend obligatoire).

import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

function findChrome(): string | undefined {
  if (process.env.FENDAGE_CHROME) return process.env.FENDAGE_CHROME;
  const root = join(homedir(), 'Library/Caches/ms-playwright'); // macOS ; ailleurs : FENDAGE_CHROME
  if (!existsSync(root)) return undefined;
  for (const dir of readdirSync(root).filter((d) => d.startsWith('chromium'))) {
    for (const sub of readdirSync(join(root, dir))) {
      for (const exe of ['chrome-headless-shell', 'Chromium.app/Contents/MacOS/Chromium', 'chrome']) {
        const p = join(root, dir, sub, exe);
        if (existsSync(p)) return p;
      }
    }
  }
  return undefined;
}

const chrome = findChrome();
if (!chrome) {
  console.log('fendage : test ignoré (aucun Chromium trouvé ; FENDAGE_CHROME=<exécutable>).');
  process.exit(process.env.FENDAGE_REQUIRED ? 1 : 0);
}

const server = await createServer({ logLevel: 'error', server: { port: 0 } });
await server.listen();
const url = server.resolvedUrls!.local[0];
const browser = await chromium.launch({ executablePath: chrome, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // tsx ajoute des appels à __name aux fonctions : la page doit le connaître pour exécuter le scénario
  await page.addInitScript('window.__name = (f) => f;');
  await page.goto(`${url}?dieu&reset`);
  await page.waitForFunction(() => !!(window as any).game?.scene.getScene('world')?.player, null, { timeout: 30000 });

  // Tout ce qui suit s'exécute dans la page : les touches sont de vrais KeyboardEvent sur window, lus par leur place.
  const result = await page.evaluate(async () => {
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
    const press = async (code: string) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      await sleep(60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    };
    // le geste fini, et la fente ouverte un instant avant que les morceaux paraissent
    const settled = async () => {
      for (let i = 0; i < 100 && w().mode !== 'play'; i++) await sleep(50);
      await sleep(600);
    };
    const props = (re: RegExp) => w().map.props.filter((p: any) => re.test(p.type));
    const spawned = () => gs.mapState(gs.game, w().map.def.id).spawned;
    // Xéros au nord du morceau, tourné vers lui, collé à sa collision
    const stand = async (p: any) => {
      const a = w().player.actor;
      a.body.reset(Math.round((p.box.left + p.box.right) / 2), Math.round(p.box.top - 4));
      a.face('down');
      await sleep(150);
    };
    const give = async (item: string) => {
      emit({ kind: 'give', held: { item } });
      await sleep(120);
    };
    const out: Record<string, unknown> = {};

    emit({ kind: 'stamina', value: 100 });
    // une grosse bille posée devant Xéros, comme avec ?dieu
    emit({ kind: 'prop', prop: 'big-felled-log-2' });
    await sleep(200);
    await stand(props(/^big-felled-log-2$/).at(-1));

    // 1. refus : la hache, puis la masse sans coin ; ni geste ni dépense
    await give('axe');
    await press('Space');
    await sleep(300);
    out.axeNotice = notices.at(-1);
    out.axeMode = w().mode;
    await give('maul');
    await press('Space');
    await sleep(300);
    out.maulNotice = notices.at(-1);
    out.refusedCost = 100 - w().player.stamina.value;

    // 2. planter le coin : Espace, le coin dans la main active
    await give('splitting-wedge');
    await press('Space');
    await sleep(300);
    out.planted = props(/wedged/).map((p: any) => p.type);
    out.handsAfterPlant = JSON.stringify(gs.game.hands) + JSON.stringify(gs.game.both);
    out.plantCost = 100 - w().player.stamina.value;

    // 3. trois coups de masse ; le premier est noté dans GameState
    await give('maul');
    const hitCosts: number[] = [];
    for (let i = 1; i <= 3; i++) {
      await stand(props(/^big-wedged-log$/)[0]);
      const s = w().player.stamina.value;
      await press('Space');
      await settled();
      hitCosts.push(s - w().player.stamina.value);
      if (i === 1) out.hitsKept = spawned().find((q: any) => q.type === 'big-wedged-log')?.hits;
    }
    out.hitCosts = hitCosts;
    out.halves = props(/^big-half-log$/).length;
    out.wedgeOnGround = gs.mapState(gs.game, w().map.def.id).ground.filter((q: any) => q.item === 'splitting-wedge').length;
    out.halfMass = mass.propMass('big-half-log');

    // 4. chaque moitié : le coin, puis trois coups de masse
    for (let k = 0; k < 2; k++) {
      await give('splitting-wedge');
      await stand(props(/^big-half-log$/)[0]);
      await press('Space');
      await sleep(300);
      await give('maul');
      for (let i = 0; i < 3; i++) {
        await stand(props(/^big-wedged-half-log$/)[0]);
        await press('Space');
        await settled();
      }
    }
    out.quarters = props(/^big-quarter-log$/).length;
    out.quarterMass = mass.propMass('big-quarter-log');
    out.stamina = w().player.stamina.value;
    out.noRoom = notices.filter((n) => /Pas la place/.test(n));

    // 5. un quartier tenu se tourne (R) et s'empile : un tas plein de six (dehors, à la ferme : de la place devant Xéros)
    emit({ kind: 'map', map: 'ferme' });
    await sleep(2200);
    // un coin dégagé de la carte, où le tas tient tout entier devant Xéros
    {
      const m = w().map;
      let spot: number[] | undefined;
      for (let y = 80; y < m.height - 80 && !spot; y += 16) {
        for (let x = 80; x < m.width - 80 && !spot; x += 16) if (m.areaFree({ left: x - 40, right: x + 40, top: y - 40, bottom: y + 40 })) spot = [x, y];
      }
      w().player.actor.body.reset(spot![0], spot![1]);
      w().player.actor.face('down');
      await sleep(150);
    }
    emit({ kind: 'give', held: { prop: 'big-quarter-log' } });
    await sleep(150);
    await press('KeyR');
    await sleep(150);
    out.turned = JSON.stringify(gs.game.both);
    emit({ kind: 'pile', pile: 'big-quarters', count: 6, turned: false, tie: false });
    await sleep(300);
    out.pile = gs.mapState(gs.game, w().map.def.id).piles.map((p: any) => `${p.pile}:${p.places.length}`);
    out.pileNotices = notices.slice(-3);
    out.at = [Math.round(w().player.actor.x), Math.round(w().player.actor.y), w().map.def.id];
    return out;
  });

  console.log(JSON.stringify(result));
  const r = result as Record<string, any>;
  assert.deepEqual(errors, [], `erreurs de la page : ${errors.join(' | ')}`);
  assert.equal(r.axeNotice, 'Trop grosse pour la hache. Il faut le coin et la masse.', 'la hache est refusée');
  assert.equal(r.axeMode, 'play', 'refus sans geste');
  assert.equal(r.maulNotice, "Il faut d'abord un coin.");
  assert.equal(r.refusedCost, 0, 'un refus ne coûte rien');
  assert.deepEqual(r.planted, ['big-wedged-log'], 'Espace plante le coin');
  assert.equal(r.handsAfterPlant, '[null,null]null', 'la main est libérée');
  assert.ok(Math.abs(r.plantCost - 1) < 1e-6, `coût du plantage : ${r.plantCost}`);
  assert.equal(r.hitsKept, 1, 'le premier coup est noté dans GameState');
  assert.ok(r.hitCosts.every((c: number) => Math.abs(c - 0.8) < 1e-6), `coût des coups : ${r.hitCosts}`);
  assert.equal(r.halves, 2, 'deux demi-billes');
  assert.ok(r.wedgeOnGround >= 1, 'le coin tombe au sol');
  assert.ok(Math.abs(r.halfMass - 101.5) < 1, `masse d'une demi-bille : ${r.halfMass}`);
  assert.equal(r.quarters, 4, 'quatre quartiers');
  assert.ok(Math.abs(r.quarterMass - 50.8) < 1, `masse d'un quartier : ${r.quarterMass}`);
  assert.deepEqual(r.noRoom, [], 'la place ne manque pas');
  assert.equal(r.turned, '{"prop":"big-quarter-log","turned":true}', 'R tourne le quartier tenu');
  assert.ok(r.pile.includes('big-quarters:6'), `tas de quartiers : ${r.pile}`);
  console.log('  ✓ fendage : de la grosse bille aux quatre quartiers');
} catch (e) {
  failed = true;
  console.error(`  ✗ fendage : ${(e as Error).message}`);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
