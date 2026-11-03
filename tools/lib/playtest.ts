// Pilote le vrai jeu dans un Chromium sans écran, servi par Vite, avec de vrais appuis de touches : le socle des tests de
// scénario (npm run test:fendage, npm run test:implantation). Il faut un Chromium : celui de Playwright
// (~/Library/Caches/ms-playwright, `npx playwright-core install chromium`), ou FENDAGE_CHROME=<exécutable>.
// Sans Chromium le test dit qu'il est ignoré (FENDAGE_REQUIRED=1 le rend obligatoire).

import { appendFileSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import { createServer, type ViteDevServer } from 'vite';

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

/** Les options de Chromium : jamais de page mise en veille (plusieurs scénarios à la fois chargent la machine). */
const CHROME_ARGS = [
  '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
  // plusieurs scénarios à la fois chargent la machine : Chromium ne doit jamais mettre une page en veille (plus d'images, plus de
  // minuteries), sinon le jeu s'arrête et le scénario attend sans fin
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
];

/** Un serveur Vite du jeu sur un port libre, son propre cache de dépendances (supprimé à la fermeture). */
async function startVite(): Promise<{ server: ViteDevServer; url: string; close: () => Promise<void> }> {
  // son propre cache des dépendances : les serveurs (et le npm run dev de Grégoire) ne se rechargent pas les uns les autres en
  // réoptimisant un cache commun
  const cacheDir = mkdtempSync(join(tmpdir(), 'xeros-vite-'));
  // les dépendances du jeu pré-assemblées au démarrage, sans découverte ensuite : sinon Vite, découvrant une dépendance en cours de
  // route sur un cache neuf, recharge la page en plein scénario (« Execution context was destroyed »)
  const server = await createServer({ logLevel: 'error', server: { port: 0 }, cacheDir, optimizeDeps: { include: ['phaser', 'zod'], noDiscovery: true } });
  await server.listen();
  return {
    server,
    url: server.resolvedUrls!.local[0],
    close: async () => {
      await server.close();
      rmSync(cacheDir, { recursive: true, force: true });
    },
  };
}

/**
 * Le banc partagé de tools/run-scenarios.ts : un serveur Vite et un Chromium pour tous les scénarios, chacun dans son propre contexte
 * de navigateur (sa sauvegarde, localStorage, est à lui). Les scénarios le trouvent par PLAYTEST_URL et PLAYTEST_WS.
 */
export async function sharedRig(): Promise<{ url: string; ws: string; close: () => Promise<void> }> {
  const chrome = findChrome();
  if (!chrome) throw new Error('aucun Chromium trouvé (FENDAGE_CHROME=<exécutable>)');
  const vite = await startVite();
  // le serveur d'un navigateur, auquel chaque scénario se connecte
  const server = await chromium.launchServer({ executablePath: chrome, args: CHROME_ARGS });
  return {
    url: vite.url,
    ws: server.wsEndpoint(),
    close: async () => {
      await server.close();
      await vite.close();
    },
  };
}

/** Ce que reçoit un test : la page, l'adresse du jeu, les erreurs de la page, et de quoi (re)charger le jeu. */
export interface Playtest {
  page: Page;
  url: string;
  errors: string[];
  /** Charge le jeu (`?dieu&reset` : partie neuve) et attend que le monde tourne. */
  load: (query?: string) => Promise<void>;
}

/**
 * Lance le jeu, exécute `body`, puis quitte avec le bon code (0 : réussi ou ignoré, 1 : échec). Une assertion qui échoue dans `body`
 * est un échec ; une erreur de la page aussi (le test le dit).
 */
export async function playtest(name: string, body: (t: Playtest) => Promise<void>, opts: { speed?: number } = {}): Promise<never> {
  // les temps de chaque phase (PLAYTEST_TIMES=<fichier> : une ligne JSON par scénario, pour tools/mesure-scenarios.ts)
  const T0 = performance.now();
  const times: Record<string, number> = {};
  const lap = (k: string, since: number) => (times[k] = Math.round(performance.now() - since));
  // les pauses fixes du scénario côté Node : les setTimeout de plus de 30 ms posés par le code du scénario (tools/test-…), comptés quand
  // ils s'écoulent (ceux de Playwright, posés puis annulés, ne comptent pas)
  let nodeSleeps = 0;
  const realSetTimeout = globalThis.setTimeout;
  if (process.env.PLAYTEST_TIMES) {
    globalThis.setTimeout = ((fn: (...a: unknown[]) => void, ms?: number, ...rest: unknown[]) => {
      const mine = (ms ?? 0) > 30 && /tools\/test-/.test(new Error().stack ?? '');
      return realSetTimeout((...a: unknown[]) => {
        if (mine) nodeSleeps += ms!;
        fn(...a);
      }, ms, ...rest);
    }) as typeof setTimeout;
  }
  const chrome = findChrome();
  if (!chrome) {
    console.log(`${name} : test ignoré (aucun Chromium trouvé ; FENDAGE_CHROME=<exécutable>).`);
    process.exit(process.env.FENDAGE_REQUIRED ? 1 : 0);
  }
  // le banc partagé (PLAYTEST_URL, PLAYTEST_WS : tools/run-scenarios.ts), sinon un serveur et un navigateur à soi (un scénario lancé seul)
  const shared = process.env.PLAYTEST_URL && process.env.PLAYTEST_WS ? { url: process.env.PLAYTEST_URL, ws: process.env.PLAYTEST_WS } : undefined;
  let t = performance.now();
  const vite = shared ? undefined : await startVite();
  const url = shared?.url ?? vite!.url;
  lap('vite', t);
  t = performance.now();
  const browser: Browser = shared ? await chromium.connect(shared.ws) : await chromium.launch({ executablePath: chrome, args: CHROME_ARGS });
  // un contexte à lui : sa sauvegarde (localStorage) n'est qu'à lui, même sur le navigateur partagé
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  lap('chromium', t);
  let failed = false;
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // tsx ajoute des appels à __name aux fonctions : la page doit le connaître pour exécuter le scénario
    await page.addInitScript('window.__name = (f) => f;');
    // les pauses fixes dans la page (setTimeout de plus de 30 ms, sauf celle de __until), en somme
    await page.addInitScript(`
      window.__sleeps = 0;
      const real = window.setTimeout;
      window.setTimeout = (fn, ms, ...rest) => {
        if (!(ms > 30) || fn.__until || typeof fn !== 'function') return real(fn, ms, ...rest);
        return real((...a) => { window.__sleeps += ms; fn(...a); }, ms, ...rest);
      };
    `);
    // attendre un état, jamais un délai (CLAUDE.md) : `__until(cond, label)` attend que `cond()` soit vrai, image après image, et lève une
    // erreur nommée au bout d'une minute ; `__restart(command)` envoie une commande ?dieu qui redémarre la scène (`map`, `reset-map`) et
    // attend la nouvelle carte, prête (le joueur posé, le mode jeu, ou construction sous ?construire)
    await page.addInitScript(`
      window.__until = async (cond, label, ms = 60000) => {
        const t = performance.now();
        while (!cond()) {
          if (performance.now() - t > ms) throw new Error('attente trop longue : ' + label);
          // une image, ou 50 ms si la page ne dessine plus (le délai compte toujours)
          await new Promise((r) => { r.__until = true; requestAnimationFrame(r); setTimeout(r, 50); });
        }
      };
      window.__restart = async (command) => {
        const g = window.game;
        const old = g.scene.getScene('world').map;
        g.events.emit('dieu', command);
        await window.__until(() => {
          const w = g.scene.getScene('world');
          return !!w && w.map && w.map !== old && (w.mode === 'play' || w.mode === 'build') && !!w.player;
        }, 'la carte ' + (command.map || command.kind));
      };
    `);
    // la vitesse de simulation (src/systems/simSpeed.ts : N pas de jeu de taille normale par image, jamais une image sautée) : x10
    // par défaut, PLAYTEST_SPEED=<n> sinon (run-scenarios.ts met x1 aux scénarios de SCENARIOS_X1) ; remise après chaque chargement
    // `opts.speed` : un scénario qui mesure la vitesse du temps elle-même (test-temps) part de la sienne
    const speed = opts.speed ?? Math.max(1, Number(process.env.PLAYTEST_SPEED) || 10);
    const setSpeed = (n: number) =>
      page.evaluate(async (n) => {
        const url = '/src/systems/simSpeed.ts';
        const sim = await import(url);
        sim.setSimSpeed((window as any).game, n);
      }, n);
    // une capture se fait à x1 (l'image montrée est celle d'un pas normal), puis le scénario reprend sa vitesse
    const shoot = page.screenshot.bind(page);
    page.screenshot = (async (opts?: Parameters<Page['screenshot']>[0]) => {
      if (speed === 1) return shoot(opts);
      await setSpeed(1);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const png = await shoot(opts);
      await setSpeed(speed);
      return png;
    }) as Page['screenshot'];
    const load = async (query = '?dieu&reset') => {
      await page.goto(`${url}${query}`);
      // jusqu'à ce que le monde tourne : un jeu qui démarre lentement (d'autres scénarios tournent en même temps) démarre plus tard,
      // dans une borne de deux minutes (un scénario lancé seul ne reste pas suspendu) ; une erreur de la page pendant le démarrage
      // arrête tout de suite (le jeu ne démarrera plus)
      const before = errors.length;
      const t0 = Date.now();
      for (;;) {
        if (errors.length > before) throw new Error(`le jeu ne démarre pas : ${errors.slice(before).join(' | ')}`);
        if (Date.now() - t0 > 120000) throw new Error(`le jeu ne démarre pas en deux minutes (${query})`);
        if (await page.evaluate(() => !!(window as any).game?.scene?.getScene?.('world')?.player).catch(() => false)) break;
        await new Promise((r) => realSetTimeout(r, 200));
      }
      // le temps de jeu simulé : la somme des pas (les images, et les pas de plus de la vitesse de simulation), gardée d'un
      // chargement à l'autre de la page par le test (PLAYTEST_TIMES)
      if (process.env.PLAYTEST_TIMES) {
        await page.evaluate(() => {
          const g = (window as any).game;
          (window as any).__sim ??= 0;
          const loop = g.loop;
          const cb = loop.callback;
          loop.callback = (t: number, d: number) => ((window as any).__sim += d, cb(t, d));
          const hs = g.headlessStep.bind(g);
          g.headlessStep = (t: number, d: number) => ((window as any).__sim += d, hs(t, d));
        });
      }
      if (speed > 1) await setSpeed(speed);
    };
    t = performance.now();
    await load();
    lap('load', t);
    t = performance.now();
    // le temps de jeu d'avant le scénario, et celui des pages rechargées en route (le compteur de la page repart à zéro)
    let sim = -(await page.evaluate(() => (window as any).__sim ?? 0).catch(() => 0));
    page.on('framenavigated', async (f) => {
      if (f === page.mainFrame()) sim += lastSim;
    });
    let lastSim = 0;
    const poll = setInterval(async () => (lastSim = await page.evaluate(() => (window as any).__sim ?? 0).catch(() => lastSim)), 500);
    await body({ page, url, errors, load });
    clearInterval(poll);
    lap('body', t);
    if (process.env.PLAYTEST_TIMES) {
      sim += await page.evaluate(() => (window as any).__sim ?? 0).catch(() => 0);
      times.game = Math.round(Math.max(0, sim));
      times.pageSleeps = Math.round(await page.evaluate(() => (window as any).__sleeps ?? 0).catch(() => 0));
    }
  } catch (e) {
    failed = true;
    console.error(`  ✗ ${name} : ${(e as Error).message}`);
  } finally {
    t = performance.now();
    await context.close();
    // le navigateur partagé reste ouvert pour les autres : on s'en déconnecte seulement
    await browser.close();
    await vite?.close();
    lap('close', t);
    if (process.env.PLAYTEST_TIMES) {
      times.nodeSleeps = nodeSleeps;
      lap('total', T0);
      appendFileSync(process.env.PLAYTEST_TIMES, `${JSON.stringify({ name, ok: !failed, ...times })}\n`);
    }
  }
  process.exit(failed ? 1 : 0);
}
