// Transforme dist-single/index.html (build autonome) en page publiable comme artefact claude.ai :
// sans doctype ni html/head/body, styles et script inline, script en fin de page.
// Usage : npm run build:single && tsx tools/make-artifact.ts

import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist-single/index.html', 'utf8');
const script = src.match(/<script type="module"[^>]*>([\s\S]*?)<\/script>/)?.[1];
const style = src.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const body = src.match(/<body>([\s\S]*?)<\/body>/)?.[1];
if (!script || !style || !body) throw new Error('dist-single/index.html inattendu : lancer npm run build:single');

const page = `<title>Xéros</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root { color-scheme: dark; }
${style}
body {
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  box-sizing: border-box;
}
</style>
${body.replace(/<script[\s\S]*?<\/script>/g, '').trim()}
<script type="module">${script}</script>
`;
writeFileSync('dist-single/artifact.html', page);
console.log(`dist-single/artifact.html (${Math.round(page.length / 1024)} Ko)`);
