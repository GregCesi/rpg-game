// Vérifie tout le contenu d'un coup, sans lancer le jeu : formats JSON (Zod) et références croisées.
// Usage : npm run check   (lance d'abord npm run art, qui produit le catalogue des images)

import { readFileSync } from 'node:fs';

async function main() {
  let content;
  try {
    content = await import('../src/content/index');
  } catch (e) {
    console.error(`\n✗ ${(e as Error).message}\n`);
    process.exit(1);
  }
  const { catalogFrom, validateContent, validateMaps, validateTilesCatalog } = await import('../src/content/validate');
  const { maps: tiledMaps } = await import('../src/generated/maps');
  const manifest = JSON.parse(readFileSync('src/generated/manifest.json', 'utf8'));
  const catalog = catalogFrom(manifest);
  // le type d'un objet de carte est le nom de l'objet dans props.json
  const propsByType = Object.fromEntries(Object.values(content.props).map((p) => [p.name, p]));
  const errors = [
    ...validateContent(content, catalog),
    ...validateTilesCatalog(content.tilesCatalog, catalog),
    ...validateMaps(tiledMaps, propsByType, content.dialogues, catalog),
  ];
  if (errors.length) {
    console.error(`\n✗ ${errors.length} problème(s) dans le contenu :`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error('');
    process.exit(1);
  }
  const n = (o: object) => Object.keys(o).length;
  console.log(
    `✓ contenu valide : ${n(content.maps)} cartes, ${n(content.props)} objets, ${n(content.dialogues)} dialogues, ${n(content.characters)} personnages`,
  );
}

main();
