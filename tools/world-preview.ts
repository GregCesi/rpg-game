// .art-preview/monde.png : tout le monde vu de très haut (chantier « monde »), les zones assemblées à leur place (tiled/maps/monde.world),
// réduites 8 fois (une case = 4 px), leurs bords en trait fin, leur nom et leur identifiant, les parcelles en couleur de leur
// destination, les plans posés en aplat. Lancé par npm run art:monde (et par test:monde).
import { mkdirSync, writeFileSync } from 'node:fs';
import { TILE } from '../src/config';
import parcelsJson from '../src/content/parcels.json';
import propsJson from '../src/content/props.json';
import { maps } from '../src/generated/maps';
import { buildPlans } from './lib/build-plans';
import { blank, drawMap, rect, RenderKit, text, textWidth, toPng, type RGBA } from './lib/world-render';

const F = 8;
const zones = Object.values(maps).filter((m) => m.world);
if (!zones.length) throw new Error("aucune zone du monde (tiled/maps/monde.world) : lancer npm run maps");
const W = Math.max(...zones.map((m) => m.world!.x + m.width * TILE)) / F;
const H = Math.max(...zones.map((m) => m.world!.y + m.height * TILE)) / F;
const TOP = 40;
const img = blank(W, H + TOP, [24, 18, 12, 255]);
const kit = new RenderKit(F);
const props = propsJson as Record<string, { image: string; aged?: boolean }>;
const plans = buildPlans();
const t0 = Date.now();
for (const m of zones) {
  const ox = m.world!.x / F;
  const oy = TOP + m.world!.y / F;
  drawMap(img, kit, m, ox, oy, (t, age) => (props[t] ? props[t].image + (age && age !== 'new' && props[t].aged ? `-${age}` : '') : undefined), (p) => plans[p]?.size);
  for (const p of m.parcels) {
    const hex = (parcelsJson as Record<string, { color: string }>)[p.use].color;
    const c: RGBA = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
    const x = ox + Math.round(p.x / F);
    const y = oy + Math.round(p.y / F);
    const w = Math.round(p.w / F);
    const h = Math.round(p.h / F);
    rect(img, x, y, w, h, [c[0], c[1], c[2], 60]);
    rect(img, x, y, w, 1, c);
    rect(img, x, y + h - 1, w, 1, c);
    rect(img, x, y, 1, h, c);
    rect(img, x + w - 1, y, 1, h, c);
  }
}
// les bords des zones, puis leurs noms (par-dessus tout)
for (const m of zones) {
  const ox = m.world!.x / F;
  const oy = TOP + m.world!.y / F;
  const w = (m.width * TILE) / F;
  const h = (m.height * TILE) / F;
  const line: RGBA = [250, 240, 210, 150];
  rect(img, ox, oy, w, 1, line);
  rect(img, ox, oy, 1, h, line);
  text(img, m.name, ox + 6, oy + 6, 2, [250, 236, 200, 255]);
  text(img, m.id, ox + 6, oy + 24, 1, [200, 190, 160, 255]);
}
const title = `Le monde de Xeros : ${Math.round((W * F * 5) / 100)} x ${Math.round((H * F * 5) / 100)} m, ${zones.length} zones de 200 x 200 m`;
text(img, title, Math.round((W - textWidth(title, 2)) / 2), 12, 2, [250, 236, 200, 255]);
mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/monde.png', toPng(img));
console.log(`.art-preview/monde.png : ${W} × ${H + TOP} px (${Date.now() - t0} ms)`);
