// Fige le forgeron validé par Grégoire dans le jeu (chantier « forgeron ») : ses images, dessinées par le pixel-artist dans les essais
// (art/proposals/forgeron-anim.ts, forgeron-final.ts, construits sur forgeron-colosse.ts et forgeron-tetes.ts), écrites image par
// image dans art/characters/smith.ts (la planche `smith`) et art/portraits/smith.ts (`portrait-smith-64`, neutre et souriant). Chaque
// signe de couleur y est nommé par la palette du jeu (art/palette.ts : `smith`, `iron`, `woodAges.new`, `world`, OUTLINE) : une
// couleur qui n'y est pas arrête l'outil. Ensuite, le dessin se retouche dans ces deux fichiers (pixel-artist), plus dans les essais.
// Usage : npx tsx tools/essai-forgeron-bake.ts (une fois, à l'intégration ; le relancer écrase les deux fichiers).

import { writeFileSync } from 'node:fs';
import type { Grid } from '../art/lib/canvas';
import { flipX } from '../art/lib/canvas';
import { iron, OUTLINE, smith, woodAges, world } from '../art/palette';
import { animations, palette as spritePalette } from '../art/proposals/forgeron-anim';
import { portraitFinal } from '../art/proposals/forgeron-final';

/** Le nom, dans art/palette.ts, de chaque couleur du forgeron (la première trouvée, dans cet ordre). */
const NAMES: [string, string][] = [
  [OUTLINE, 'OUTLINE'],
  ['#00000038', "'#00000038'"], // l'ombre au sol, celle de la mère (art/characters/mother.ts)
  ...Object.entries(smith).flatMap(([ramp, tones]) => Object.entries(tones).map(([tone, hex]) => [hex, `smith.${ramp}.${tone}`] as [string, string])),
  ...Object.entries(iron).map(([k, hex]) => [hex, `iron['${k}']`] as [string, string]),
  ...Object.entries(woodAges.new).map(([k, hex]) => [hex, `woodAges.new['${k}']`] as [string, string]),
  ...(['h', 'H', 'i'] as const).map((k) => [world[k], `world.${k}`] as [string, string]),
  ['#22140c', 'xerosPortrait.p'], // la pupille, celle de Xéros
  ['#fff6ea', 'xerosPortrait.q'], // le reflet de l'œil, celui de Xéros
];

function named(hex: string): string {
  const n = NAMES.find(([h]) => h.toLowerCase() === hex.toLowerCase());
  if (!n) throw new Error(`couleur ${hex} absente de art/palette.ts : la nommer d'abord`);
  return n[1];
}

/** La palette réduite aux signes employés, chaque couleur par son nom. */
function paletteSource(pal: Record<string, string>, grids: Grid[]): string {
  const used = new Set(grids.flatMap((g) => [...g.join('')]));
  return Object.entries(pal)
    .filter(([k]) => used.has(k))
    .map(([k, hex]) => `  ${/^[A-Za-z_]$/.test(k) ? k : `'${k}'`}: ${named(hex)},`)
    .join('\n');
}

const gridSource = (g: Grid, indent: string) => `[\n${g.map((r) => `${indent}  '${r}',`).join('\n')}\n${indent}]`;
const camel = (k: string) => k.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

// --- le sprite : chaque animation, sauf la gauche, qui est la droite retournée ---
const anims = animations!;
const own = Object.entries(anims).filter(([k]) => !k.endsWith('-left'));
for (const [k, a] of Object.entries(anims).filter(([k]) => k.endsWith('-left'))) {
  const right = anims[k.replace(/-left$/, '-right')];
  const same = right && right.frames.length === a.frames.length && right.frames.every((f, i) => flipX(f).join('\n') === a.frames[i].join('\n'));
  if (!same) throw new Error(`${k} n'est pas ${k.replace(/-left$/, '-right')} retournée : l'écrire à part`);
}
const all = own.flatMap(([, a]) => a.frames);
const sprite = `// Le forgeron du village (chantier « forgeron », validé par Grégoire) : la planche \`smith\`, frames de 32 × 48, pieds à y=45.
// Dessiné par le pixel-artist dans les essais (art/proposals/forgeron-*.ts : le corps et les cheveux de la variante C « le géant »,
// la tête T1 « le rectangle », le menton M2, la carrure affinée), figé ici image par image (tools/essai-forgeron-bake.ts) : désormais,
// il se retouche ici. Un colosse de 1,95 m (39 px), plus large que le gabarit des personnages (écart voulu, docs/STYLE.md section 8) ;
// sa collision aux pieds, 14 × 8 px, est dans characters.json (\`feet\`).
// Animations : le repos (deux images de respiration), la marche (quatre images, un pas lourd), la pose de dialogue (le marteau posé),
// le travail à l'enclume de face (\`work-down\` : le marteau levé, l'abattu, le coup et son étincelle, le rebond, le retour ; la pince et
// le fer rouge à hauteur de la table de l'enclume, quand il se tient juste au nord de son billot). La gauche est la droite retournée.
// Couleurs : la rampe \`smith\` de art/palette.ts ; ses outils, le fer (\`iron\`) et le bois neuf ; le fer rouge et l'étincelle, le feu.

import { flipX, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { iron, OUTLINE, smith, woodAges, world } from '../palette';

export const palette = {
${paletteSource(spritePalette, all)}
};

${own.map(([k, a]) => `const ${camel(k)}: Grid[] = [\n${a.frames.map((f) => `  ${gridSource(f, '  ')},`).join('\n')}\n];`).join('\n\n')}

const sheet: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'smith',
  frameW: 32,
  frameH: 48,
  palette,
  animations: {
${Object.entries(anims)
  .map(([k, a]) => {
    const v = k.endsWith('-left') ? `${camel(k.replace(/-left$/, '-right'))}.map(flipX)` : camel(k);
    const d = (a as { durations?: number[] }).durations;
    return `    '${k}': { frames: ${v}, frameRate: ${a.frameRate}, repeat: ${a.repeat}${d ? `, durations: [${d.join(', ')}]` : ''} },`;
  })
  .join('\n')}
  },
};

export default sheet;
`;
writeFileSync('art/characters/smith.ts', sprite);

// --- le portrait : neutre et souriant, sur une même palette ---
const neutral = portraitFinal('neutral');
const smile = portraitFinal('smile');
for (const [k, hex] of Object.entries(smile.pal)) if (neutral.pal[k] !== undefined && neutral.pal[k] !== hex) throw new Error(`signe ${k} : deux couleurs entre les deux portraits`);
const ppal = { ...smile.pal, ...neutral.pal };
const portrait = `// Le portrait de dialogue du forgeron (chantier « forgeron », validé par Grégoire) : buste de face, 64 px. Dessiné par le
// pixel-artist dans les essais (art/proposals/forgeron-tetes-portraits.ts : la tête T1 « le rectangle », le menton M2 ;
// art/proposals/forgeron-final.ts : le sourire), figé ici (tools/essai-forgeron-bake.ts) : désormais, il se retouche ici.
// Une animation = une expression : \`neutral\`, \`smile\` (la moustache et les coins de la bouche qui montent, les yeux un peu plissés).

import type { Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { OUTLINE, smith } from '../palette';
import { palette as xerosPortrait } from './xeros';

const palette = {
${paletteSource(ppal, [neutral.grid, smile.grid])}
};

const neutral: Grid = ${gridSource(neutral.grid, '')};

const smile: Grid = ${gridSource(smile.grid, '')};

const portrait: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'portrait-smith-64',
  frameW: 64,
  frameH: 64,
  palette,
  animations: {
    neutral: { frames: [neutral], frameRate: 1, repeat: 0 },
    smile: { frames: [smile], frameRate: 1, repeat: 0 },
  },
};

export default portrait;
`;
writeFileSync('art/portraits/smith.ts', portrait);
console.log(`  ✓ art/characters/smith.ts (${Object.keys(anims).length} animations, ${all.length} images écrites) et art/portraits/smith.ts (neutre, souriant)`);
