// Les couleurs de la petite carte (docs/CONCEPTION.md, « La petite carte »), tirées des dessins par `npm run art`, après build-art :
// src/generated/minimap.json. Aucune couleur n'est écrite à la main : une tuile ou une pièce redessinée change sa couleur toute seule,
// et le jeu ne lit jamais de pixels.
//   - `tiles` : la couleur de chaque tuile du jeu `world` (par son numéro, art/tile-registry.json), celle de sa famille : son nom sans
//     numéro de raccord ni de variante (path-7 → path, grass3 → grass, field-ns2 → field ; bridge-* → bridge ; flowers → grass) ; la
//     couleur d'une famille est la teinte moyenne de ses tuiles (pour une famille à raccords, la seule tuile pleine `-15`, les autres
//     ont leur bord d'herbe), ramenée à la teinte la plus proche de la palette du monde (la teinte la plus fréquente rendait la route
//     empierrée presque noire, de la couleur de ses joints) ;
//   - `images` : la couleur de chaque image d'objet de props.json, à ses trois âges s'il est de bois (`aged`), par la même règle ;
//   - `tree` (les arbres debout : un point vert sombre), `bark` (la pièce de bois ronde avec son écorce), `wood` (le bois travaillé à
//     chaque âge, la rampe de `woodAges`).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PNG } from 'pngjs';
import { TILE } from '../src/config';
import propsJson from '../src/content/props.json';
import registry from '../art/tile-registry.json';
import { world as worldPalette, woodAges } from '../art/palette';

type Rgb = [number, number, number];

/** La famille d'une tuile : son nom sans le numéro de raccord (path-7 → path) ni le numéro de variante (grass3 → grass, field-ns2 → field). */
export function tileFamily(name: string): string {
  const base = name.replace(/-\d+$/, '').replace(/\d+$/, '');
  if (base.startsWith('bridge')) return 'bridge';
  if (base === 'field-ns') return 'field';
  if (base === 'flowers') return 'grass';
  return base;
}

const hexRgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const rgbHex = (c: Rgb): string => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

/** La palette du monde, sans les teintes translucides. */
const PALETTE: Rgb[] = Object.values(worldPalette as Record<string, string>)
  .filter((h) => h.length === 7)
  .map(hexRgb);

function nearest(c: Rgb): Rgb {
  let best = PALETTE[0];
  let bd = Infinity;
  for (const p of PALETTE) {
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/** Ajoute à `into` (r, g, b, nombre) les pixels opaques de `data` (RGBA). */
function sumColors(data: Uint8Array, into: number[] = [0, 0, 0, 0]): number[] {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    into[0] += data[i];
    into[1] += data[i + 1];
    into[2] += data[i + 2];
    into[3]++;
  }
  return into;
}

/** La teinte moyenne d'une somme, ramenée à la palette ; rien sans pixel opaque. */
const meanColor = (sum: number[]): string | undefined => (sum[3] ? rgbHex(nearest([sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]])) : undefined);

// les tuiles
const tileset = PNG.sync.read(readFileSync('tiled/tilesets/world.png'));
const cols = tileset.width / TILE;
const names = registry.world as string[];
const sums = new Map<string, number[]>();
names.forEach((name, n) => {
  if (/-\d+$/.test(name) && !name.endsWith('-15')) return;
  const data = new Uint8Array(TILE * TILE * 4);
  const sx = (n % cols) * TILE;
  const sy = Math.floor(n / cols) * TILE;
  for (let y = 0; y < TILE; y++) data.set(tileset.data.subarray(((sy + y) * tileset.width + sx) * 4, ((sy + y) * tileset.width + sx + TILE) * 4), y * TILE * 4);
  const fam = tileFamily(name);
  sums.set(fam, sumColors(data, sums.get(fam)));
});
const families = Object.fromEntries([...sums].map(([f, s]) => [f, meanColor(s)]));
const tiles = names.map((name) => families[tileFamily(name)] ?? null);
const missing = names.filter((_, n) => !tiles[n]);
if (missing.length) throw new Error(`build-minimap : tuiles sans couleur (${missing.join(', ')})`);

// les images des objets
const props = propsJson as unknown as Record<string, { image: string; aged?: boolean }>;
const images: Record<string, string> = {};
for (const def of Object.values(props)) {
  for (const key of [def.image, ...(def.aged ? [`${def.image}-worn`, `${def.image}-old`] : [])]) {
    if (key in images) continue;
    const path = `src/generated/${key}.png`;
    if (!existsSync(path)) continue;
    const c = meanColor(sumColors(PNG.sync.read(readFileSync(path)).data));
    if (c) images[key] = c;
  }
}

const out = {
  tiles,
  images,
  tree: worldPalette.k,
  bark: worldPalette.m,
  wood: { new: woodAges.new['*'], worn: woodAges.worn['*'], old: woodAges.old['*'] },
};
mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/minimap.json', JSON.stringify(out) + '\n');
console.log(`Petite carte : ${Object.keys(families).length} familles de tuiles, ${Object.keys(images).length} images d'objets → src/generated/minimap.json`);
