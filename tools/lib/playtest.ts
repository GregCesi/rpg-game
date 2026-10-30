// Pilote le vrai jeu dans un Chromium sans écran, servi par Vite, avec de vrais appuis de touches : le socle des tests de
// scénario (npm run test:fendage, npm run test:implantation). Il faut un Chromium : celui de Playwright
// (~/Library/Caches/ms-playwright, `npx playwright-core install chromium`), ou FENDAGE_CHROME=<exécutable>.
// Sans Chromium le test dit qu'il est ignoré (FENDAGE_REQUIRED=1 le rend obligatoire).

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
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
    const load = async (query = '?dieu&reset') => {
      await page.goto(`${url}${query}`);
      await page.waitForFunction(() => !!(window as any).game?.scene.getScene('world')?.player, null, { timeout: 30000 });
    };
    await load();
    await body({ page, url, errors, load });
  } catch (e) {
    failed = true;
    console.error(`  ✗ ${name} : ${(e as Error).message}`);
  } finally {
    await browser.close();
    await server.close();
  }
  process.exit(failed ? 1 : 0);
}
