// Regarder une zone (ou une carte) en PNG, sans lancer le jeu : npx tsx tools/render-zone.ts <carte> [réduction] [sortie.png]
import { writeFileSync } from 'node:fs';
import { TILE } from '../src/config';
import propsJson from '../src/content/props.json';
import { maps } from '../src/generated/maps';
import { blank, drawMap, RenderKit, toPng } from './lib/world-render';
import { buildPlans } from './lib/build-plans';

const [id, f = '1', out = `.art-preview/zone-${process.argv[2]}.png`] = process.argv.slice(2);
const m = maps[id];
if (!m) throw new Error(`carte inconnue : ${id}`);
const kit = new RenderKit(Number(f));
const img = blank((m.width * TILE) / kit.shrink, (m.height * TILE) / kit.shrink);
const props = propsJson as Record<string, { image: string; aged?: boolean }>;
drawMap(img, kit, m, 0, 0, (t, age) => (props[t] ? props[t].image + (age && age !== 'new' && props[t].aged ? `-${age}` : '') : undefined), (p) => buildPlans()[p]?.size);
writeFileSync(out, toPng(img));
console.log(`${out} écrit`);
