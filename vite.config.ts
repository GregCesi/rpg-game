import { writeFileSync } from 'node:fs';
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
            writeFileSync(`src/content/plans/${key}.json`, `${JSON.stringify(plan, null, 2)}\n`);
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
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? Number.MAX_SAFE_INTEGER : 4096,
    chunkSizeWarningLimit: 2000,
  },
}));
