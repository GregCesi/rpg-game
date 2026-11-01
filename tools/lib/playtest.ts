// Pilote le vrai jeu dans un Chromium sans écran, servi par Vite, avec de vrais appuis de touches : le socle des tests de
// scénario (npm run test:fendage, npm run test:implantation). Il faut un Chromium : celui de Playwright
// (~/Library/Caches/ms-playwright, `npx playwright-core install chromium`), ou FENDAGE_CHROME=<exécutable>.
// Sans Chromium le test dit qu'il est ignoré (FENDAGE_REQUIRED=1 le rend obligatoire).

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright-core';
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
export async function playtest(name: string, body: (t: Playtest) => Promise<void>): Promise<never> {
  const chrome = findChrome();
  if (!chrome) {
    console.log(`${name} : test ignoré (aucun Chromium trouvé ; FENDAGE_CHROME=<exécutable>).`);
    process.exit(process.env.FENDAGE_REQUIRED ? 1 : 0);
  }
  // son propre cache des dépendances : les serveurs des scénarios parallèles (et le npm run dev de Grégoire) ne se rechargent pas les
  // uns les autres en réoptimisant un cache commun
  const cacheDir = mkdtempSync(join(tmpdir(), 'xeros-vite-'));
  const server = await createServer({ logLevel: 'error', server: { port: 0 }, cacheDir });
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
    // attendre un état, jamais un délai (CLAUDE.md) : `__until(cond, label)` attend que `cond()` soit vrai, image après image, et lève une
    // erreur nommée au bout d'une minute ; `__restart(command)` envoie une commande ?dieu qui redémarre la scène (`map`, `reset-map`) et
    // attend la nouvelle carte, prête (le joueur posé, le mode jeu)
    await page.addInitScript(`
      window.__until = async (cond, label, ms = 60000) => {
        const t = performance.now();
        while (!cond()) {
          if (performance.now() - t > ms) throw new Error('attente trop longue : ' + label);
          await new Promise((r) => requestAnimationFrame(r));
        }
      };
      window.__restart = async (command) => {
        const g = window.game;
        const old = g.scene.getScene('world').map;
        g.events.emit('dieu', command);
        await window.__until(() => {
          const w = g.scene.getScene('world');
          return !!w && w.map && w.map !== old && w.mode === 'play' && !!w.player;
        }, 'la carte ' + (command.map || command.kind));
      };
    `);
    const load = async (query = '?dieu&reset') => {
      await page.goto(`${url}${query}`);
      // jusqu'à ce que le monde tourne, sans durée : un jeu qui démarre lentement (d'autres scénarios tournent en même temps) démarre
      // plus tard ; mais une erreur de la page pendant le démarrage arrête tout de suite (le jeu ne démarrera plus) ; le lanceur des
      // scénarios (tools/run-scenarios.ts) arrête celui qui ne finirait jamais
      const before = errors.length;
      for (;;) {
        if (errors.length > before) throw new Error(`le jeu ne démarre pas : ${errors.slice(before).join(' | ')}`);
        if (await page.evaluate(() => !!(window as any).game?.scene?.getScene?.('world')?.player).catch(() => false)) break;
        await new Promise((r) => setTimeout(r, 200));
      }
    };
    await load();
    await body({ page, url, errors, load });
  } catch (e) {
    failed = true;
    console.error(`  ✗ ${name} : ${(e as Error).message}`);
  } finally {
    await browser.close();
    await server.close();
    rmSync(cacheDir, { recursive: true, force: true });
  }
  process.exit(failed ? 1 : 0);
}
