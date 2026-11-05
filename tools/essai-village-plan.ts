// Essai hors jeu (chantier « village », CADRAGE-village.md section 2) : .art-preview/village-plan.png, le plan du village à l'échelle.
// Tout vient de art/proposals/village-plan-data.ts (zones, voies, place, parcelles, emprises, cours, ce qui est retiré) : cet outil
// n'écrit aucune coordonnée du plan, il ne fait que les dessiner. Le fond est le vrai sol des cartes (tools/lib/world-render.ts,
// comme .art-preview/monde.png), les arbres atténués.
//
// La planche : la vue d'ensemble (1 px = 20 cm), le zoom sur la place (1 px = 5 cm, la taille du jeu), « ce qui bouge »
// (1 px = 40 cm), la petite carte du monde avec les lieux hors du village (1 px = 1,60 m), la légende, la liste des parcelles.
// Lancer : npx tsx tools/essai-village-plan.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { TILE } from '../src/config';
import propsJson from '../src/content/props.json';
import type { MapData } from '../src/content/types';
import { maps } from '../src/generated/maps';
import { buildPlans } from './lib/build-plans';
import { blank, put, rect, RenderKit, toPng, type Img, type RGBA } from './lib/world-render';
import { fontWidth, lineHeight, wrap, write } from '../art/proposals/village-plan-font';
import {
  NOTICE_BOARD, PARCELS, PLACE, REMOVED, WAYS, world, type Kind, type Parcel, type Rect, type Shape, type ZoneId,
} from '../art/proposals/village-plan-data';

// ------------------------------------------------------------------ réglages de la planche (rien du plan)
const PX_M = 100 / 5; // px du jeu par mètre (5 cm par pixel)
const OUT_OF_VILLAGE_M = 150; // au-delà de cette distance de la place, un lieu est « hors du village » (encart du monde)
const MARGIN = 96; // marge autour de la vue d'ensemble (px du jeu : 3 cases)
const GAP = 28;
const BG: RGBA = [24, 18, 12, 255];
const INK: RGBA = [250, 236, 200, 255];
const DIM: RGBA = [190, 176, 146, 255];
const RED: RGBA = [236, 40, 36, 255];

const KIND: Record<Kind, { color: RGBA; name: string }> = {
  house: { color: [236, 186, 110, 255], name: "maison d'habitation" },
  rich: { color: [186, 112, 220, 255], name: 'maison aisée' },
  shop: { color: [72, 156, 236, 255], name: 'boutique, atelier' },
  public: { color: [238, 100, 44, 255], name: 'le sire, la taverne' },
  farm: { color: [168, 120, 70, 255], name: 'aux fermes, dehors' },
  smithy: { color: [150, 150, 164, 255], name: 'la forge (existe)' },
  garden: { color: [112, 196, 84, 255], name: 'jardin, verger' },
  free: { color: [244, 244, 244, 255], name: 'libre, à décider' },
};
const YARD: RGBA = [172, 134, 88, 255];
const WAY_KEPT: RGBA = [206, 180, 132, 255];
const WAY_NEW: RGBA = [244, 222, 168, 255];

const props = propsJson as Record<string, { image: string; family?: string }>;
const plans = buildPlans();
const zones = Object.values(maps).filter((m) => m.world) as MapData[];
const mapOf = (id: ZoneId) => zones.find((m) => m.id === id)!;

// ------------------------------------------------------------------ géométrie (px du monde)
type Pt = [number, number];
const shapePoly = (zone: ZoneId, s: Shape): Pt[] =>
  ('rect' in s ? rectPts(s.rect) : s.poly).map(([x, y]) => world(zone, x, y));
const rectPts = ([x0, y0, x1, y1]: Rect): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const rectW = (zone: ZoneId, r: Rect): Rect => {
  const [a, b] = world(zone, r[0], r[1]);
  const [c, d] = world(zone, r[2], r[3]);
  return [a, b, c, d];
};
const bbox = (pts: Pt[]): Rect => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
const union = (rs: Rect[]): Rect => [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))];
const centroid = (pts: Pt[]): Pt => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
function inside(pts: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const inRect = (r: Rect, x: number, y: number) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3];
const placeC = world(PLACE.zone, PLACE.center[0], PLACE.center[1]);
const meters = (px: number) => px / PX_M;
const fmt = (m: number) => (Math.round(m * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
const fmt2 = (m: number) => m.toFixed(2).replace('.', ',');
const parcelPoly = (p: Parcel) => shapePoly(p.zone, p.shape);
const distM = (p: Parcel) => {
  const [cx, cy] = centroid(parcelPoly(p));
  return meters(Math.hypot(cx - placeC[0], cy - placeC[1]));
};
const outside = PARCELS.filter((p) => distM(p) > OUT_OF_VILLAGE_M);
const inVillage = PARCELS.filter((p) => !outside.includes(p));
const houseTag = (p: Parcel) => (p.house ? p.house.split('-')[0] : '');

// ------------------------------------------------------------------ une vue : un rectangle du monde dessiné à 1/f dans la planche
interface View { x: number; y: number; w: number; h: number; wx: number; wy: number; f: number }
const view = (x: number, y: number, r: Rect, f: number): View => ({ x, y, w: Math.round((r[2] - r[0]) / f), h: Math.round((r[3] - r[1]) / f), wx: r[0], wy: r[1], f });
const dx = (v: View, wx: number) => v.x + (wx - v.wx) / v.f;
const dy = (v: View, wy: number) => v.y + (wy - v.wy) / v.f;
const inView = (v: View, x: number, y: number) => x >= v.x && y >= v.y && x < v.x + v.w && y < v.y + v.h;
function vput(img: Img, v: View, x: number, y: number, c: RGBA): void {
  if (inView(v, x, y)) put(img, x, y, c);
}
function vrect(img: Img, v: View, x: number, y: number, w: number, h: number, c: RGBA): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) vput(img, v, x + i, y + j, c);
}
const alpha = (c: RGBA, a: number): RGBA => [c[0], c[1], c[2], a];
const shade = (c: RGBA, k: number): RGBA => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k), c[3]];

/** Colle une image avec une opacité, coupée au cadre de la vue. */
function vblit(img: Img, v: View, src: Img, x: number, y: number, a = 1): void {
  for (let j = 0; j < src.h; j++) {
    for (let i = 0; i < src.w; i++) {
      const k = (j * src.w + i) * 4;
      if (src.data[k + 3] < 128) continue;
      vput(img, v, x + i, y + j, [src.data[k], src.data[k + 1], src.data[k + 2], Math.round(255 * a)]);
    }
  }
}

/** Le sol des cartes dans la vue, les plans de Tiled qui restent en aplat, les objets atténués (`objAlpha`, 0 : sans objets). */
function ground(img: Img, v: View, kit: RenderKit, objAlpha: number): void {
  const ts = TILE / v.f;
  for (const m of zones) {
    const zx = m.world!.x;
    const zy = m.world!.y;
    if (zx + m.width * TILE <= v.wx || zy + m.height * TILE <= v.wy || zx >= v.wx + v.w * v.f || zy >= v.wy + v.h * v.f) continue;
    m.layers.ground.forEach((n, i) => {
      if (n < 0) return;
      const tx = dx(v, zx + (i % m.width) * TILE);
      const ty = dy(v, zy + Math.floor(i / m.width) * TILE);
      if (tx + ts <= v.x || ty + ts <= v.y || tx >= v.x + v.w || ty >= v.y + v.h) return;
      vblit(img, v, kit.tile(n), Math.round(tx), Math.round(ty));
    });
    for (const p of m.plans) {
      const b = plans[p.plan]?.size;
      if (!b) continue;
      // un plan de Tiled que le plan du village retire (les étals) n'est pas dessiné
      if (REMOVED.some((r) => r.zone === m.id && r.rect[0] === p.x && r.rect[1] === p.y)) continue;
      vrect(img, v, Math.round(dx(v, zx + p.x)), Math.round(dy(v, zy + p.y)), Math.max(1, Math.round(b.w / 5 / v.f)), Math.max(1, Math.round(b.d / 5 / v.f)), [120, 84, 52, 255]);
    }
    if (!objAlpha) continue;
    for (const o of [...m.objects].sort((a, b) => a.y - b.y)) {
      const key = props[o.type]?.image;
      const im = key ? kit.image(key) : undefined;
      if (!im) continue;
      vblit(img, v, im, Math.round(dx(v, zx + o.x)), Math.round(dy(v, zy + o.y)) - im.h, objAlpha);
    }
  }
}

/** Remplit un polygone du monde. */
function fill(img: Img, v: View, pts: Pt[], c: RGBA): void {
  const [x0, y0, x1, y1] = bbox(pts);
  for (let y = Math.floor(dy(v, y0)); y <= Math.ceil(dy(v, y1)); y++) {
    for (let x = Math.floor(dx(v, x0)); x <= Math.ceil(dx(v, x1)); x++) {
      const wx = v.wx + (x - v.x + 0.5) * v.f;
      const wy = v.wy + (y - v.y + 0.5) * v.f;
      if (inside(pts, wx, wy)) vput(img, v, x, y, c);
    }
  }
}
/** Un segment de la planche, épaisseur `t`, pointillé `dash` (plein, vide ; 0 : plein). */
function seg(img: Img, v: View, ax: number, ay: number, bx: number, by: number, c: RGBA, t = 1, dash = 0): void {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
  for (let s = 0; s <= n; s++) {
    if (dash && Math.floor(s / dash) % 2 === 1) continue;
    const x = Math.round(ax + ((bx - ax) * s) / n);
    const y = Math.round(ay + ((by - ay) * s) / n);
    vrect(img, v, x - Math.floor((t - 1) / 2), y - Math.floor((t - 1) / 2), t, t, c);
  }
}
function stroke(img: Img, v: View, pts: Pt[], c: RGBA, t = 1, dash = 0): void {
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    seg(img, v, dx(v, p[0]), dy(v, p[1]), dx(v, q[0]), dy(v, q[1]), c, t, dash);
  });
}
function circle(img: Img, v: View, c: Pt, r: number, col: RGBA, filled: RGBA | null, t = 1): void {
  const cx = dx(v, c[0]);
  const cy = dy(v, c[1]);
  const rr = r / v.f;
  for (let y = Math.floor(cy - rr - t); y <= Math.ceil(cy + rr + t); y++) {
    for (let x = Math.floor(cx - rr - t); x <= Math.ceil(cx + rr + t); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (filled && d <= rr) vput(img, v, x, y, filled);
      if (Math.abs(d - rr) <= t / 2) vput(img, v, x, y, col);
    }
  }
}
function frame(img: Img, v: View, c: RGBA): void {
  rect(img, v.x - 1, v.y - 1, v.w + 2, 1, c);
  rect(img, v.x - 1, v.y + v.h, v.w + 2, 1, c);
  rect(img, v.x - 1, v.y - 1, 1, v.h + 2, c);
  rect(img, v.x + v.w, v.y - 1, 1, v.h + 2, c);
}
/** Un texte centré en (x, y). */
function center(img: Img, lines: string[], x: number, y: number, scale: number, c: RGBA): void {
  const lh = lineHeight(scale);
  lines.forEach((l, i) => write(img, l, Math.round(x - fontWidth(l, scale) / 2), Math.round(y - (lines.length * lh) / 2 + i * lh), scale, c));
}
/** Un texte écrit de bas en haut (pour une voie nord-sud), centré en (x, y). */
function vertical(img: Img, s: string, x: number, y: number, scale: number, c: RGBA): void {
  const w = fontWidth(s, scale) + 4 * scale;
  const h = lineHeight(scale) + 2 * scale;
  const t = blank(w, h, [0, 0, 0, 0]);
  write(t, s, 2 * scale, scale, scale, c);
  const ox = Math.round(x - h / 2);
  const oy = Math.round(y - w / 2);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4;
    if (t.data[k + 3]) put(img, ox + j, oy + (w - 1 - i), [t.data[k], t.data[k + 1], t.data[k + 2], 255]);
  }
}

// ------------------------------------------------------------------ ce qui est sous une maison ou une voie nouvelle
const imgSize = new Map<string, { w: number; h: number }>();
function sizeOf(key: string): { w: number; h: number } | undefined {
  if (!imgSize.has(key)) {
    try {
      const p = PNG.sync.read(readFileSync(`src/generated/${key}.png`));
      imgSize.set(key, { w: p.width, h: p.height });
    } catch {
      return undefined;
    }
  }
  return imgSize.get(key);
}
const blockers: Rect[] = [
  ...PARCELS.flatMap((p) => (p.buildings ?? []).map((b) => rectW(p.zone, b))),
  ...WAYS.filter((w) => w.fate === 'new').map((w) => rectW(w.zone, w.rect)),
];
/** Les arbres, têtards, buissons et rochers des cartes (famille « nature » ou « pierre ») dont le pied est sous une maison ou une ruelle. */
const crossed: Pt[] = [];
for (const m of zones) {
  for (const o of m.objects) {
    const def = props[o.type];
    if (!def || (def.family !== 'nature' && def.family !== 'pierre')) continue;
    const s = sizeOf(def.image);
    if (!s) continue;
    const fx = m.world!.x + o.x + s.w / 2;
    const fy = m.world!.y + o.y - 4;
    if (blockers.some((r) => inRect(r, fx, fy))) crossed.push([fx, fy]);
  }
}
function cross(img: Img, v: View, p: Pt, r: number): void {
  const x = Math.round(dx(v, p[0]));
  const y = Math.round(dy(v, p[1]));
  for (const t of [3, 1]) {
    const c: RGBA = t === 3 ? [30, 0, 0, 255] : RED;
    seg(img, v, x - r, y - r, x + r, y + r, c, t);
    seg(img, v, x - r, y + r, x + r, y - r, c, t);
  }
}

// ------------------------------------------------------------------ le dessin du plan dans une vue
interface PlanOpts { parcelA: number; labels: 'full' | 'none'; wayLabels: boolean; scale: number; crosses: boolean }
function drawPlan(img: Img, v: View, o: PlanOpts): void {
  // les voies
  for (const w of WAYS) {
    const pts = rectPts(rectW(w.zone, w.rect));
    if (w.fate === 'new') {
      fill(img, v, pts, alpha(WAY_NEW, 215));
      stroke(img, v, pts, [96, 70, 40, 255], 1, 3);
    } else fill(img, v, pts, alpha(WAY_KEPT, 110));
  }
  // les parcelles, puis la place par-dessus (elle mord leur coin), puis leurs cours et leurs bâtiments
  for (const p of inVillage.concat(outside)) {
    const pts = parcelPoly(p);
    const c = KIND[p.kind].color;
    fill(img, v, pts, alpha(c, o.parcelA));
    for (const y of p.yards ?? []) fill(img, v, rectPts(rectW(p.zone, y)), alpha(YARD, 220));
    stroke(img, v, pts, c, v.f <= 1 ? 3 : 1);
  }
  circle(img, v, placeC, PLACE.radius, INK, alpha(WAY_KEPT, 235), Math.max(1, 3 / v.f));
  for (const p of PARCELS) {
    for (const b of p.buildings ?? []) {
      const pts = rectPts(rectW(p.zone, b));
      fill(img, v, pts, shade(KIND[p.kind].color, 0.5));
      stroke(img, v, pts, [20, 14, 8, 255], 1);
    }
  }
  // les diagonales des quarts pris tout entiers (un seul occupant : pas de coupure, la diagonale en pointillé)
  for (const p of PARCELS) {
    if (!('rect' in p.shape)) continue;
    const pts = parcelPoly(p);
    const near = [...pts].sort((a, b) => Math.hypot(a[0] - placeC[0], a[1] - placeC[1]) - Math.hypot(b[0] - placeC[0], b[1] - placeC[1]));
    if (meters(Math.hypot(near[0][0] - placeC[0], near[0][1] - placeC[1])) > meters(PLACE.radius)) continue;
    const far = near[3];
    seg(img, v, dx(v, near[0][0]), dy(v, near[0][1]), dx(v, far[0]), dy(v, far[1]), alpha(INK, 160), 1, 4 / Math.max(1, v.f / 2));
  }
  // le panneau des nouvelles
  const nb = rectW(NOTICE_BOARD.zone, NOTICE_BOARD.rect);
  const [nx, ny] = [dx(v, (nb[0] + nb[2]) / 2), dy(v, (nb[1] + nb[3]) / 2)];
  const nw = Math.max(5, Math.round((nb[2] - nb[0]) / v.f));
  const nh = Math.max(3, Math.round((nb[3] - nb[1]) / v.f));
  vrect(img, v, Math.round(nx - nw / 2) - 1, Math.round(ny - nh / 2) - 1, nw + 2, nh + 2, [20, 14, 8, 255]);
  vrect(img, v, Math.round(nx - nw / 2), Math.round(ny - nh / 2), nw, nh, [255, 230, 90, 255]);
  if (o.crosses) for (const p of crossed) cross(img, v, p, Math.max(2, Math.round(24 / v.f)));
}

function wayLabels(img: Img, v: View, scale: number): void {
  for (const w of WAYS) {
    if (!w.label) continue;
    const [x0, y0, x1, y1] = rectW(w.zone, w.rect);
    // la partie de la voie qui est dans la vue
    const a = Math.max(dx(v, x0), v.x), b = Math.min(dx(v, x1), v.x + v.w);
    const c = Math.max(dy(v, y0), v.y), d = Math.min(dy(v, y1), v.y + v.h);
    if (a >= b || c >= d) continue;
    const col: RGBA = w.fate === 'new' ? [255, 246, 214, 255] : [232, 220, 186, 255];
    if (x1 - x0 >= y1 - y0) {
      if (fontWidth(w.label, scale) > b - a) continue;
      center(img, [w.label], (a + b) / 2, (c + d) / 2 + scale, scale, col);
    } else {
      if (fontWidth(w.label, scale) > d - c) continue;
      vertical(img, w.label, (a + b) / 2, (c + d) / 2, scale, col);
    }
  }
}

// ------------------------------------------------------------------ la mise en page
const viewRect = (ps: Parcel[], m: number): Rect => {
  const r = union(ps.map((p) => bbox(parcelPoly(p))));
  return [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
};
const F_ALL = 4;
const allR = viewRect(inVillage, MARGIN);
const nearPlace = PARCELS.filter((p) => {
  const [x0, y0, x1, y1] = bbox(parcelPoly(p));
  return Math.hypot(Math.max(x0 - placeC[0], 0, placeC[0] - x1), Math.max(y0 - placeC[1], 0, placeC[1] - y1)) < PLACE.radius;
});
const zoomR = viewRect(nearPlace, 0);
const movedR = union([allR, ...REMOVED.map((r) => rectW(r.zone, r.rect))].map((r) => r)).map((n, i) => n + (i < 2 ? -MARGIN : MARGIN)) as Rect;
const worldR: Rect = [0, 0, Math.max(...zones.map((m) => m.world!.x + m.width * TILE)), Math.max(...zones.map((m) => m.world!.y + m.height * TILE))];

const TOP = 70;
const HEAD = 34; // le titre de chaque vue
const vAll = view(GAP, TOP + HEAD, allR, F_ALL);
const vZoom = view(vAll.x + vAll.w + GAP, TOP + HEAD, zoomR, 1);
const row2 = Math.max(vAll.y + vAll.h, vZoom.y + vZoom.h) + GAP + HEAD;
const vMoved = view(GAP, row2, movedR, 8);
const vWorld = view(vMoved.x + vMoved.w + GAP, row2, worldR, 32);
const W = vZoom.x + vZoom.w + GAP;
const LIST_SCALE = 2;
// sous « ce qui bouge », ses groupes (une ligne de 24 px chacun, deux s'ils sont longs) ; sous le monde, ses lieux
const listTop = Math.max(vMoved.y + vMoved.h + 70 + new Set(REMOVED.map((r) => r.what)).size * 48, vWorld.y + vWorld.h + 300) + GAP + HEAD;
const H = listTop + PARCELS.length * lineHeight(LIST_SCALE) + GAP;
const img = blank(W, H, BG);
const t0 = Date.now();

function heading(v: { x: number; y: number }, s: string, sub = ''): void {
  write(img, s, v.x, v.y - HEAD + 4, 2, INK);
  if (sub) write(img, sub, v.x + fontWidth(s, 2) + 16, v.y - HEAD + 12, 1, DIM);
}
function scaleBar(v: View, x: number, y: number): void {
  let cx = x;
  for (const m of [10, 50]) {
    const len = Math.round((m * PX_M) / v.f);
    if (len > v.w / 2) continue;
    rect(img, cx - 1, y - 1, len + 2, 6, [20, 14, 8, 255]);
    for (let i = 0; i < len; i += Math.round((10 * PX_M) / v.f)) rect(img, cx + i, y, Math.min(Math.round((5 * PX_M) / v.f), len - i), 4, INK);
    rect(img, cx, y, len, 1, INK);
    write(img, `${m} m`, cx, y + 8, 1, INK);
    cx += len + 24;
  }
}
function north(x: number, y: number): void {
  for (let j = 0; j < 14; j++) rect(img, x - Math.floor(j / 2), y + j, Math.floor(j / 2) * 2 + 1, 1, INK);
  rect(img, x - 1, y + 14, 3, 10, INK);
  write(img, 'N', x - 2, y - 14, 1, INK);
}

// ---- 1. la vue d'ensemble
const kit4 = new RenderKit(F_ALL);
ground(img, vAll, kit4, 0.45);
drawPlan(img, vAll, { parcelA: 120, labels: 'full', wayLabels: true, scale: 1, crosses: true });
// les bords de zone et leurs noms
for (const m of zones) {
  const r: Rect = [m.world!.x, m.world!.y, m.world!.x + m.width * TILE, m.world!.y + m.height * TILE];
  const line: RGBA = [250, 240, 210, 200];
  seg(img, vAll, dx(vAll, r[0]), dy(vAll, r[1]), dx(vAll, r[2]), dy(vAll, r[1]), line, 1, 6);
  seg(img, vAll, dx(vAll, r[0]), dy(vAll, r[1]), dx(vAll, r[0]), dy(vAll, r[3]), line, 1, 6);
}
wayLabels(img, vAll, 1);
for (const m of zones) {
  const x = Math.max(dx(vAll, m.world!.x), vAll.x) + 4;
  const y = Math.max(dy(vAll, m.world!.y), vAll.y) + 4;
  if (x > vAll.x + vAll.w - 40 || y > vAll.y + vAll.h - 20 || dx(vAll, m.world!.x + m.width * TILE) < vAll.x + 40 || dy(vAll, m.world!.y + m.height * TILE) < vAll.y + 20) continue;
  write(img, m.name, Math.round(x), Math.round(y), 1, [255, 255, 255, 255], [60, 30, 90, 255]);
}
for (const p of inVillage) {
  const pts = parcelPoly(p);
  const r = bbox(pts);
  const w = (r[2] - r[0]) / F_ALL;
  const [cx, cy] = 'poly' in p.shape ? centroid(pts) : [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  const lines = wrap(p.label, Math.max(8, Math.floor((w - 6) / 6)));
  if (p.house) lines.push(`(${houseTag(p)})`);
  center(img, lines, dx(vAll, cx), dy(vAll, cy), 1, [255, 255, 255, 255]);
}
north(vAll.x + vAll.w - 24, vAll.y + 24);
scaleBar(vAll, vAll.x + 12, vAll.y + vAll.h - 24);
frame(img, vAll, DIM);
heading(vAll, "Le plan du village, à l'échelle", `1 px = 20 cm ; ${crossed.length} arbres, buissons à retirer (croix rouge)`);

// ---- 2. ce qui bouge
const kit8 = new RenderKit(8);
ground(img, vMoved, kit8, 0.3);
for (const w of WAYS) fill(img, vMoved, rectPts(rectW(w.zone, w.rect)), alpha(w.fate === 'new' ? WAY_NEW : WAY_KEPT, w.fate === 'new' ? 140 : 70));
for (const p of PARCELS) stroke(img, vMoved, parcelPoly(p), alpha(INK, 150), 1);
for (const r of REMOVED) {
  const pts = rectPts(rectW(r.zone, r.rect));
  fill(img, vMoved, pts, [236, 40, 36, 90]);
  stroke(img, vMoved, pts, [20, 14, 8, 255], 3, 4);
  stroke(img, vMoved, pts, [255, 70, 60, 255], 1, 4);
}
circle(img, vMoved, placeC, PLACE.radius, alpha(INK, 200), null, 1);
frame(img, vMoved, DIM);
heading(vMoved, 'Ce qui bouge', '1 px = 40 cm');
{
  // les groupes de ce qui est retiré, écrits sous le titre de la vue (dans la vue, en haut)
  const groups = new Map<string, number>();
  for (const r of REMOVED) groups.set(r.what, (groups.get(r.what) ?? 0) + 1);
  let y = vMoved.y + vMoved.h + 12;
  write(img, 'en rouge pointillé, ce qui sort :', vMoved.x, y, 2, INK);
  y += 28;
  for (const [what, n] of groups) {
    for (const l of wrap(`${n} × ${what}`, Math.floor(vMoved.w / 12))) {
      write(img, l, vMoved.x + 8, y, 2, [255, 150, 140, 255]);
      y += 24;
    }
  }
  write(img, 'en trait clair, le nouveau découpage', vMoved.x, y + 4, 2, DIM);
}

// ---- 3. le zoom sur la place
const kit1 = new RenderKit(1);
ground(img, vZoom, kit1, 0.35);
drawPlan(img, vZoom, { parcelA: 70, labels: 'full', wayLabels: true, scale: 2, crosses: true });
for (const p of nearPlace) {
  const pts = parcelPoly(p);
  const r = bbox(pts);
  const poly = 'poly' in p.shape;
  // un triangle : au centre de gravité ; un quart entier : entre son coin et la place, au large
  const [cx, cy] = poly ? centroid(pts) : [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  const width = poly ? (r[2] - r[0]) * 0.55 : (r[2] - r[0]) * 0.8;
  const who = wrap(p.who, Math.floor(width / 6));
  const title = wrap(p.label, Math.floor(width / 12));
  const lh1 = lineHeight(1);
  const lh2 = lineHeight(2);
  const total = title.length * lh2 + 6 + who.length * lh1;
  const top = dy(vZoom, cy) - total / 2;
  center(img, title, dx(vZoom, cx), top + (title.length * lh2) / 2, 2, [255, 255, 255, 255]);
  const dims = `${fmt(meters(r[2] - r[0]))} × ${fmt(meters(r[3] - r[1]))} m${poly ? ', triangle' : ', le quart entier'}`;
  center(img, [dims], dx(vZoom, cx), top + title.length * lh2 + 2 + lh1 / 2, 1, [255, 236, 150, 255]);
  center(img, who, dx(vZoom, cx), top + title.length * lh2 + 6 + lh1 + (who.length * lh1) / 2, 1, [236, 228, 210, 255]);
}
wayLabels(img, vZoom, 2);
{
  // le panneau, les cotes
  const nb = rectW(NOTICE_BOARD.zone, NOTICE_BOARD.rect);
  center(img, ['le panneau des nouvelles', `${fmt2(meters(nb[2] - nb[0]))} × ${fmt2(meters(nb[3] - nb[1]))} m`], dx(vZoom, (nb[0] + nb[2]) / 2), dy(vZoom, nb[3]) + 22, 1, [255, 230, 90, 255]);
  const d = PLACE.radius * 2;
  const py = dy(vZoom, placeC[1]) - 60;
  seg(img, vZoom, dx(vZoom, placeC[0] - PLACE.radius), py, dx(vZoom, placeC[0] + PLACE.radius), py, INK, 1, 0);
  for (const s of [-1, 1]) seg(img, vZoom, dx(vZoom, placeC[0] + s * PLACE.radius), py - 5, dx(vZoom, placeC[0] + s * PLACE.radius), py + 5, INK, 1);
  center(img, [`la place ronde : ${fmt2(meters(d))} m`], dx(vZoom, placeC[0]), py - 10, 1, INK);
  // la cote d'un quart : le premier quart rectangulaire, en haut et à gauche
  const q = nearPlace.find((p) => 'rect' in p.shape);
  if (q) {
    const [x0, y0, x1, y1] = bbox(parcelPoly(q));
    const yy = dy(vZoom, y0) + 14;
    seg(img, vZoom, dx(vZoom, x0), yy, dx(vZoom, x1), yy, INK, 1);
    for (const x of [x0, x1]) seg(img, vZoom, dx(vZoom, x), yy - 6, dx(vZoom, x), yy + 6, INK, 1);
    center(img, [`un quart : ${fmt2(meters(x1 - x0))} m`], dx(vZoom, (x0 + x1) / 2), yy + 12, 2, INK);
    const xx = dx(vZoom, x0) + 14;
    seg(img, vZoom, xx, dy(vZoom, y0), xx, dy(vZoom, y1), INK, 1);
    for (const y of [y0, y1]) seg(img, vZoom, xx - 6, dy(vZoom, y), xx + 6, dy(vZoom, y), INK, 1);
    vertical(img, `${fmt2(meters(y1 - y0))} m`, xx + 14, (dy(vZoom, y0) + dy(vZoom, y1)) / 2, 2, INK);
  }
}
north(vZoom.x + vZoom.w - 24, vZoom.y + 30);
scaleBar(vZoom, vZoom.x + vZoom.w - 260, vZoom.y + vZoom.h - 24);
frame(img, vZoom, DIM);
heading(vZoom, 'La place et ses huitièmes', '1 px = 5 cm (la taille du jeu) ; un quart coupé en diagonale fait deux huitièmes');

// ---- 4. le monde et les lieux hors du village
const kit32 = new RenderKit(32);
ground(img, vWorld, kit32, 0);
for (const m of zones) {
  const r: Rect = [m.world!.x, m.world!.y, m.world!.x + m.width * TILE, m.world!.y + m.height * TILE];
  stroke(img, vWorld, rectPts(r), [250, 240, 210, 120], 1);
  const lines = wrap(m.name, Math.floor((m.width * TILE) / vWorld.f / 6) - 1);
  lines.forEach((l, i) => write(img, l, Math.round(dx(vWorld, r[0])) + 3, Math.round(dy(vWorld, r[1])) + 3 + i * 12, 1, [236, 228, 210, 255]));
}
// le village (le cadre de la vue d'ensemble) et la place
stroke(img, vWorld, rectPts(allR), [255, 255, 255, 255], 1);
circle(img, vWorld, placeC, 4 * vWorld.f, [20, 14, 8, 255], [255, 230, 90, 255], 1);
const lieux = [...outside].sort((a, b) => distM(a) - distM(b));
lieux.forEach((p, i) => {
  const [cx, cy] = centroid(parcelPoly(p));
  const x = Math.round(dx(vWorld, cx));
  const y = Math.round(dy(vWorld, cy));
  rect(img, x - 6, y - 7, 12, 14, [20, 14, 8, 255]);
  rect(img, x - 5, y - 6, 10, 12, KIND[p.kind].color);
  write(img, String(i + 1), x - 2, y - 7, 1, [20, 14, 8, 255], null);
});
frame(img, vWorld, DIM);
heading(vWorld, 'Hors du village', '1 px = 1,60 m ; distances à vol d\'oiseau depuis la place');
{
  let y = vWorld.y + vWorld.h + 12;
  write(img, 'le jaune : la place ; le cadre blanc : la vue d\'ensemble', vWorld.x, y, 1, DIM);
  y += 18;
  lieux.forEach((p, i) => {
    const m = mapOf(p.zone);
    write(img, `${i + 1}. ${p.label}`, vWorld.x, y, 2, INK);
    write(img, `${Math.round(distM(p) / 10) * 10} m de la place, ${m.name.toLowerCase()}`, vWorld.x + 300, y + 6, 1, DIM);
    y += 26;
  });
}

// ---- la légende
{
  const x = vWorld.x + vWorld.w + GAP * 2;
  let y = row2;
  write(img, 'Légende', x, y - HEAD + 4, 2, INK);
  const swatch = (c: RGBA, s: string, edge: RGBA | null = null, dash = false) => {
    rect(img, x, y, 40, 20, c);
    if (edge) {
      for (let i = 0; i < 40; i++) if (!dash || Math.floor(i / 3) % 2 === 0) { put(img, x + i, y, edge); put(img, x + i, y + 19, edge); }
      for (let j = 0; j < 20; j++) if (!dash || Math.floor(j / 3) % 2 === 0) { put(img, x, y + j, edge); put(img, x + 39, y + j, edge); }
    }
    write(img, s, x + 52, y + 2, 2, INK);
    y += 30;
  };
  for (const k of Object.keys(KIND) as Kind[]) swatch(shade(KIND[k].color, 0.75), KIND[k].name, KIND[k].color);
  y += 8;
  swatch(shade(KIND.house.color, 0.5), 'un bâtiment (son emprise)', [20, 14, 8, 255]);
  swatch(YARD, 'une cour en terre battue');
  swatch(shade(WAY_KEPT, 0.8), 'une rue qui existe');
  swatch(WAY_NEW, 'une ruelle nouvelle (3,20 m)', [96, 70, 40, 255], true);
  swatch([60, 40, 26, 255], 'ce qui sort (vue « ce qui bouge »)', RED, true);
  {
    const cv: View = { x: 0, y: 0, w: W, h: H, wx: 0, wy: 0, f: 1 };
    cross(img, cv, [x + 20, y + 10], 6);
    write(img, 'un arbre ou un buisson à retirer', x + 52, y + 2, 2, INK);
    y += 30;
  }
  rect(img, x + 12, y + 6, 16, 6, [255, 230, 90, 255]);
  write(img, 'le panneau des nouvelles', x + 52, y + 2, 2, INK);
  y += 30;
  {
    const cv: View = { x: 0, y: 0, w: W, h: H, wx: 0, wy: 0, f: 1 };
    seg(img, cv, x, y + 18, x + 40, y, alpha(INK, 160), 1, 4);
    write(img, "la diagonale d'un quart pris entier", x + 52, y + 2, 2, INK);
    y += 30;
  }
  write(img, '(h1), (h6)… : la maison dessinée du travail 2', x, y + 6, 2, DIM);
  y += 30;
  write(img, 'les traits fins pointillés : les bords de zone', x, y + 6, 2, DIM);
}

// ---- 5. la liste des parcelles
{
  const v = { x: GAP, y: listTop };
  heading(v, 'Les parcelles', `${PARCELS.length} parcelles et lieux ; dimensions est-ouest × nord-sud (la boîte, pour un triangle)`);
  const ch = 6 * LIST_SCALE;
  const cols = [0, 17, 59, 74, 80];
  const maxWho = Math.floor((W - 2 * GAP) / ch) - cols[4];
  PARCELS.forEach((p, i) => {
    const y = listTop + i * lineHeight(LIST_SCALE);
    if (i % 2 === 0) rect(img, GAP - 4, y - 2, W - 2 * GAP + 8, lineHeight(LIST_SCALE), [36, 28, 20, 255]);
    const r = bbox(parcelPoly(p));
    const who = p.who.length > maxWho ? p.who.slice(0, maxWho - 1).replace(/[\s,;:]+\S*$/, '') + '…' : p.who;
    rect(img, GAP, y + 4, 10, 14, KIND[p.kind].color);
    write(img, p.id, GAP + 16, y, LIST_SCALE, INK, null);
    write(img, p.label + (p.house ? ` (${houseTag(p)})` : ''), GAP + cols[1] * ch, y, LIST_SCALE, [255, 255, 255, 255], null);
    write(img, `${fmt(meters(r[2] - r[0]))} × ${fmt(meters(r[3] - r[1]))} m`, GAP + cols[2] * ch, y, LIST_SCALE, [255, 236, 150, 255], null);
    write(img, p.fate, GAP + cols[3] * ch, y + 6, 1, DIM, null);
    write(img, who, GAP + cols[4] * ch, y, LIST_SCALE, [214, 204, 180, 255], null);
  });
}

// ---- le titre
write(img, 'Xéros : le plan du village (proposition, chantier « village », hors jeu)', GAP, 14, 3, INK);
write(img, 'source unique : art/proposals/village-plan-data.ts ; CADRAGE-village.md, section 2. Accents : é è ê à â ç ô î ù û ï ë.', GAP, 50, 1, DIM);

mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/village-plan.png', toPng(img));
console.log(`.art-preview/village-plan.png : ${W} × ${H} px (${Date.now() - t0} ms) ; ${crossed.length} objets sous une maison ou une ruelle`);
