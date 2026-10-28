import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode single` produit un seul fichier HTML autonome (code + images intégrés).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? Number.MAX_SAFE_INTEGER : 4096,
    chunkSizeWarningLimit: 2000,
  },
}));
