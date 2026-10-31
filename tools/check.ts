// Vérifie tout le contenu d'un coup, sans lancer le jeu : formats JSON (Zod) et références croisées.
// Usage : npm run check   (lance d'abord npm run art, qui produit le catalogue des images, puis npm run maps, qui traduit les cartes Tiled)

import { readFileSync } from 'node:fs';

async function main() {
  let content;
  try {
    content = await import('../src/content/index');
  } catch (e) {
    console.error(`\n✗ ${(e as Error).message}\n`);
    process.exit(1);
  }
  const { catalogFrom, validateContent, viewsTodo } = await import('../src/content/validate');
  const manifest = JSON.parse(readFileSync('src/generated/manifest.json', 'utf8'));
  const cat = catalogFrom(manifest);
  const errors = validateContent(content, cat);
  // la rampe de chaque roche (rocks.json) est faite de couleurs de la palette commune (le jeu ne lit pas art/ : on le vérifie ici)
  const { world } = await import('../art/palette');
  for (const [k, r] of Object.entries(content.rocks)) {
    for (const ch of r.ramp) if (!(ch in world)) errors.push(`rocks.json '${k}' : couleur '${ch}' de sa rampe absente de la palette commune (art/palette.ts)`);
  }
  if (errors.length) {
    console.error(`\n✗ ${errors.length} problème(s) dans le contenu :`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error('');
    process.exit(1);
  }
  const n = (o: object) => Object.keys(o).length;
  console.log(
    `✓ contenu valide : ${n(content.maps)} cartes, ${n(content.props)} objets, ${n(content.items)} objets possédables, ${n(content.dialogues)} dialogues, ${n(content.characters)} personnages`,
  );
  // toutes les faces : ce qui reste à dessiner (VIEWS_TODO, validate.ts), redit à chaque vérification
  const todo = viewsTodo(content, cat);
  if (todo.objects.length) {
    console.log(`… vues à dessiner (VIEWS_TODO) : ${todo.objects.length} objets, ${todo.drawings} dessins`);
    for (const o of todo.objects) console.log(`    ${o.key} : ${o.missing.length} (${o.reason})`);
  }
}

main();
