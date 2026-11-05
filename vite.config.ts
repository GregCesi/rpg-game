import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Mode construction (?construire), en développement seulement : « Enregistrer comme plan » envoie le plan ici (POST
 * /__construire/plan, `{ key, plan }`), qui l'écrit dans src/content/plans/<key>.json. Le jeu le reçoit à chaud
 * (src/content/buildPlans.ts) ; `npm run check` le vérifie (validate.ts). Le nom doit être en kebab-case : rien d'autre ne s'écrit.
 */
function buildPlanWriter(): Plugin {
  return {
    name: 'xeros-build-plans',
    configureServer(server) {
      server.middlewares.use('/__construire/plan', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { key, plan } = JSON.parse(body) as { key: string; plan: { name: string; pieces: unknown[] } };
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key) || !plan?.name || !Array.isArray(plan.pieces)) throw new Error('plan ou nom invalide');
            // écrit à côté puis renommé : un autre serveur (les scénarios tournent en parallèle) ne lit jamais un plan à moitié écrit
            // les scénarios écrivent leurs plans dans un dossier temporaire (XEROS_PLANS_OUT), jamais par-dessus le contenu commité
            const file = `${process.env.XEROS_PLANS_OUT ?? 'src/content/plans'}/${key}.json`;
            // les personnages d'un plan (`npcs` : le forgeron) ne se posent pas en mode construction : un plan réenregistré garde ceux
            // du plan du même nom
            const before = `src/content/plans/${key}.json`;
            const npcs = existsSync(before) ? (JSON.parse(readFileSync(before, 'utf8')) as { npcs?: unknown[] }).npcs : undefined;
            if (npcs && !('npcs' in plan)) Object.assign(plan, { npcs });
            writeFileSync(`${file}.tmp`, `${JSON.stringify(plan, null, 2)}\n`);
            renameSync(`${file}.tmp`, file);
            res.statusCode = 200;
            res.end('ok');
          } catch (e) {
            res.statusCode = 400;
            res.end((e as Error).message);
          }
        });
      });
    },
  };
}

// `vite build --mode single` produit un seul fichier HTML autonome (code + images intégrés).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [buildPlanWriter()],
  // les worktrees des agents (.claude/worktrees, dans le dépôt) et les aperçus ne sont pas le jeu : les surveiller rechargerait les
  // pages (le npm run dev de Grégoire, les scénarios) à chaque fichier qu'ils écrivent
  server: { watch: { ignored: ['**/.claude/**', '**/.art-preview/**', '**/dist/**', '**/dist-single/**'] } },
  optimizeDeps: { entries: ['index.html'] },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? Number.MAX_SAFE_INTEGER : 4096,
    chunkSizeWarningLimit: 2000,
  },
}));
