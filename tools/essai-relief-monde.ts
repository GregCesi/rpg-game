// Vue d'ensemble du chantier « relief » (cadrage, rien du jeu ne change) : npx tsx tools/essai-relief-monde.ts écrit
// .art-preview/relief-monde.png.
//
// Les colonnes 0-600 m du monde, réduites 8 fois (une case = 4 px), dessinées comme l'aperçu du monde (tools/lib/world-render.ts),
// avec par-dessus : le plateau (+3 m, teinté), la ligne de la falaise (le bord ouest de l'eau, rangée par rangée, lu dans les cartes),
// le lit sec proposé (sur la ligne du chemin, à la place du pont), les deux coupures de l'eau ; à droite, le détail du lit sec dans la
// zone de la ferme, réduit 2 fois (une case = 16 px), avec la pente de 0 à 3 m. Ne touche ni au jeu ni à src/generated/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { TILE } from '../src/config';
import propsJson from '../src/content/props.json';
import type { MapData } from '../src/content/types';
import { maps } from '../src/generated/maps';
import registry from '../art/tile-registry.json';
import { buildPlans } from './lib/build-plans';
import { blank, blit, drawMap, rect, RenderKit, text, textWidth, toPng, type Img, type RGBA } from './lib/world-render';

/** Le lit sec proposé, en cases de la zone de la ferme : rangées [BED.y0, BED.y1], du haut de la pente (3 m) à la rive est. */
const BED = { map: 'ferme', y0: 63, y1: 68, top: 23, foot: 42, east: 47 };

const props = propsJson as Record<string, { image: string; aged?: boolean }>;
const plans = buildPlans();
const imageOf = (t: string, age?: string) => (props[t] ? props[t].image + (age && age !== 'new' && props[t].aged ? `-${age}` : '') : undefined);
const planBox = (p: string) => plans[p]?.size;

/** La première case d'eau de la rangée `y` (le pied de la falaise), dans les colonnes 0-70, ou -1. */
function cliffCol(m: MapData, y: number, isWater: (n: number) => boolean): number {
  for (let x = 0; x < 70; x++) if (isWater(m.layers.ground[y * m.width + x])) return x;
  return -1;
}

const zones = Object.values(maps).filter((m) => m.world && m.world.x < 600 * 20);
// l'eau : les numéros de tuile dont le nom commence par water (registre de art/tile-registry.json)
const names = (registry as { world: string[] }).world;
const isWater = (n: number) => n >= 0 && /^water/.test(names[n] ?? '');

const F = 8;
const TOP = 60;
const LEFT_W = (600 * 20) / F; // 600 m = 12 000 px du jeu
const H = (800 * 20) / F;
const kit = new RenderKit(F);
const DETAIL = { x0: 8, x1: 64, y0: 52, y1: 80, f: 2 };
const DW = ((DETAIL.x1 - DETAIL.x0) * TILE) / DETAIL.f;
const DH = ((DETAIL.y1 - DETAIL.y0) * TILE) / DETAIL.f;
const img = blank(LEFT_W + 40 + DW + 20, H + TOP + 10, [24, 18, 12, 255]);

const PLATEAU: RGBA = [255, 196, 90, 70];
const CLIFF: RGBA = [190, 40, 30, 255];
const BEDC: RGBA = [236, 214, 160, 220];
const SHIMMER: RGBA = [160, 240, 255, 255];
const WHITE: RGBA = [250, 236, 200, 255];
const GREY: RGBA = [200, 190, 160, 255];

const table: string[] = [];
for (const m of zones) {
  const ox = m.world!.x / F;
  const oy = TOP + m.world!.y / F;
  drawMap(img, kit, m, ox, oy, imageOf, planBox);
  if (m.world!.x !== 4000) continue;
  // la colonne de la rivière : le plateau à l'ouest de la falaise, rangée par rangée
  let runStart = 0;
  let runCol = -2;
  for (let y = 0; y <= m.height; y++) {
    const inBed = m.id === BED.map && y >= BED.y0 && y <= BED.y1;
    let c = y < m.height ? cliffCol(m, y, isWater) : -3;
    if (inBed || (m.id === BED.map && y >= 65 && y <= 66)) c = BED.foot; // le pont, puis le lit sec : la falaise suit la rive
    if (y < m.height) {
      rect(img, m.world!.x / F - 4000 / F, oy + y * 4, 4000 / F + c * 4, 4, PLATEAU);
      rect(img, ox + c * 4 - 1, oy + y * 4, 2, 4, CLIFF);
    }
    if (c !== runCol) {
      if (runCol >= 0) table.push(`${m.id} rangées ${runStart}-${y - 1} : falaise à la case ${runCol} (${(200 + runCol * 1.6).toFixed(1)} m)`);
      runStart = y;
      runCol = c;
    }
  }
}

// le lit sec et les coupures, sur la vue d'ensemble
const ferme = maps[BED.map];
const fx = ferme.world!.x / F;
const fy = TOP + ferme.world!.y / F;
rect(img, fx + BED.top * 4, fy + BED.y0 * 4, (BED.east - BED.top + 1) * 4, (BED.y1 - BED.y0 + 1) * 4, BEDC);
rect(img, fx + BED.foot * 4, fy + BED.y0 * 4 - 1, 5 * 4, 1, SHIMMER);
rect(img, fx + BED.foot * 4, fy + (BED.y1 + 1) * 4, 5 * 4, 1, SHIMMER);

// bords et noms des zones
for (const m of zones) {
  const ox = m.world!.x / F;
  const oy = TOP + m.world!.y / F;
  rect(img, ox, oy, 4000 / F, 1, [250, 240, 210, 150]);
  rect(img, ox, oy, 1, 4000 / F, [250, 240, 210, 150]);
  text(img, m.id, ox + 6, oy + 6, 1, WHITE);
}
text(img, 'plateau a 3 m', 40, TOP + 980, 2, [255, 210, 120, 255]);
text(img, 'ferme 0 m', 4000 / F + 200, TOP + 1030, 2, WHITE);
const title = 'Relief : le plateau (3 m plus haut), la falaise (rouge), le lit sec (sable) ; 0-600 m';
text(img, title, 10, 12, 2, WHITE);
text(img, 'falaise = bord ouest de la riviere, rangee par rangee ; coupures de l eau en bleu clair', 10, 36, 1, GREY);

// le détail du lit sec, dans la zone de la ferme
const DX = LEFT_W + 40;
const DY = TOP + 40;
const dkit = new RenderKit(DETAIL.f);
const sub: MapData = {
  ...ferme,
  width: DETAIL.x1 - DETAIL.x0,
  height: DETAIL.y1 - DETAIL.y0,
  layers: {
    ...ferme.layers,
    ground: Array.from({ length: (DETAIL.y1 - DETAIL.y0) * (DETAIL.x1 - DETAIL.x0) }, (_, i) => {
      const x = DETAIL.x0 + (i % (DETAIL.x1 - DETAIL.x0));
      const y = DETAIL.y0 + Math.floor(i / (DETAIL.x1 - DETAIL.x0));
      return ferme.layers.ground[y * ferme.width + x];
    }),
  },
  objects: ferme.objects
    .filter((o) => o.x >= DETAIL.x0 * TILE && o.x < DETAIL.x1 * TILE && o.y > DETAIL.y0 * TILE && o.y <= DETAIL.y1 * TILE)
    .map((o) => ({ ...o, x: o.x - DETAIL.x0 * TILE, y: o.y - DETAIL.y0 * TILE })),
  decals: [],
  parcels: [],
  plans: [],
} as MapData;
const det: Img = blank(DW, DH, [0, 0, 0, 255]);
drawMap(det, dkit, sub, 0, 0, imageOf, planBox);
blit(img, det, DX, DY);
const S = TILE / DETAIL.f; // 16 px par case
const cx = (c: number) => DX + (c - DETAIL.x0) * S;
const cy = (r: number) => DY + (r - DETAIL.y0) * S;
// le plateau, la falaise
for (let r = DETAIL.y0; r < DETAIL.y1; r++) {
  let c = cliffCol(ferme, r, isWater);
  if (r >= BED.y0 && r <= BED.y1) c = BED.foot;
  rect(img, DX, cy(r), (c - DETAIL.x0) * S, S, PLATEAU);
  rect(img, cx(c) - 2, cy(r), 4, S, CLIFF);
}
// le lit sec : la pente, colonne par colonne, de 3 m (haut) à 0 m (pied de la falaise), puis à plat jusqu'à la rive est
for (let c = BED.top; c <= BED.east; c++) {
  const z = c >= BED.foot ? 0 : Math.min(3, (BED.foot - c) * 1.6 * 0.1);
  const a = 120 + Math.round(z * 40);
  rect(img, cx(c), cy(BED.y0), S, (BED.y1 - BED.y0 + 1) * S, [236 - Math.round(z * 20), 214 - Math.round(z * 20), 160, a]);
}
rect(img, cx(BED.top), cy(BED.y0), (BED.east - BED.top + 1) * S, 1, CLIFF);
rect(img, cx(BED.top), cy(BED.y1 + 1), (BED.east - BED.top + 1) * S, 1, CLIFF);
// les coupures
rect(img, cx(BED.foot), cy(BED.y0) - 2, 5 * S, 3, SHIMMER);
rect(img, cx(BED.foot), cy(BED.y1 + 1) - 1, 5 * S, 3, SHIMMER);
// le pont d'aujourd'hui (rangées 65-66, cases 41-47) : barré
for (let i = 0; i < 7 * S; i++) {
  rect(img, cx(41) + i, cy(65) + Math.round((i * 2 * S) / (7 * S)), 2, 2, [255, 255, 255, 230]);
  rect(img, cx(41) + i, cy(67) - Math.round((i * 2 * S) / (7 * S)), 2, 2, [255, 255, 255, 230]);
}
// les mesures
for (const [c, s] of [[BED.top, '3 m'], [32, '1,5 m'], [BED.foot, '0 m']] as const) {
  rect(img, cx(c), cy(BED.y1 + 1) + 2, 1, 10, WHITE);
  text(img, s, cx(c) - Math.round(textWidth(s, 1) / 2), cy(BED.y1 + 1) + 14, 1, WHITE);
}
text(img, 'Le lit sec (zone ferme, rangees 63-68, 9,60 m de large)', DX, DY - 34, 2, WHITE);
text(img, 'pente 10 % : 3 m sur 30 m (cases 23 a 42) ; le pont (barre) disparait ; une case = 16 px', DX, DY - 14, 1, GREY);
text(img, 'plateau', cx(12), cy(56), 2, [255, 210, 120, 255]);
text(img, 'ferme', cx(52), cy(56), 2, WHITE);

mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/relief-monde.png', toPng(img));
console.log(table.join('\n'));
console.log(`.art-preview/relief-monde.png : ${img.w} × ${img.h} px`);
