// Plans de l'intérieur du tunnel (chantier « relief », CADRAGE.md section 13) : des SCHÉMAS en aplats, pas des dessins.
// Aucune matière, aucune texture : des aplats francs, des traits, des flèches et des légendes, comme un plan d'architecte.
// Planche : .art-preview/relief-plans.png (npx tsx tools/essai-relief-plans.ts). Rien de ce fichier n'entre dans le jeu.
//
// Trois parties :
//   1. les deux coupes nord-sud à l'échelle (côté ferme, case 52 ; sur la rivière, case 44,5), le nord à gauche, Xéros au milieu
//      du sol du couloir, la voûte, l'eau, les rayons parallèles de l'œil du joueur à 45° ;
//   2. pour chaque coupe, quatre écrans de 427 × 240 px (aujourd'hui, façons 1, 2 et 3), en bandes horizontales aux lignes du
//      tableau 13.2, les pieds de Xéros à la ligne 130 ; sous la façon 1, l'encart du voile qui s'éclaircit aux bouches ;
//   3. la maison pour comparer (dehors, dedans, la correspondance).
//
// La projection du jeu : un point à (y, h) cm (y vers le sud, h la hauteur) tombe à l'écran à la ligne (y − h) / 5 px.

export type Rgb = [number, number, number];

/** Ce que le schéma demande à la feuille (la `Sheet` de tools/lib/audit-preview.ts le fournit). */
export interface PlanSurface {
  readonly w: number;
  readonly h: number;
  dot(x: number, y: number, c: Rgb, a?: number): void;
  text(s: string, x: number, y: number, c: Rgb, k?: number): void;
}

export const PLAN_W = 1900;
export const PLAN_H = 1930;

// ---------- la palette commune (une seule pour toute la planche) ----------

const BG: Rgb = [40, 44, 36];
const WHITE: Rgb = [245, 245, 235];
const GREY: Rgb = [200, 200, 186];
const DIM: Rgb = [140, 140, 128];
const GOLD: Rgb = [245, 215, 120];
const RED: Rgb = [235, 70, 60];

const EARTH: Rgb = [128, 88, 52]; // terre pleine (talus, parois)
const CUT: Rgb = [96, 52, 34]; // terre en coupe (tranchée au ras du sol)
const CUT_LINE: Rgb = [170, 110, 70]; // hachures de la coupe
const FLOOR: Rgb = [236, 230, 212]; // sol du couloir
const XEROS: Rgb = [214, 60, 140]; // Xéros (aplat magenta, rien d'autre ne l'a)
const VEIL: Rgb = [30, 19, 12]; // voile du dehors (la terre profonde)
const WATER: Rgb = [58, 118, 196]; // eau
const LEAF: Rgb = [70, 150, 70]; // feuillage de la voûte
const OUTSIDE: Rgb = [176, 184, 92]; // champs et forêt du dehors
const GRASS: Rgb = [120, 200, 70]; // liseré d'herbe de la coupe
const ROOF: Rgb = [150, 76, 58]; // toit de la maison (partie 3 seulement)
const VOID: Rgb = [0, 0, 0]; // le vide autour d'une pièce (partie 3 seulement)

/** Ce qui est fantôme : son aplat à cette opacité, puis des hachures claires. */
const GHOST_A = 0.25;

// ---------- primitives ----------

let S: PlanSurface;

function rect(x: number, y: number, w: number, h: number, c: Rgb, a = 1): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) S.dot(x + i, y + j, c, a);
}
function frame(x: number, y: number, w: number, h: number, c: Rgb): void {
  for (let i = 0; i < w; i++) { S.dot(x + i, y, c); S.dot(x + i, y + h - 1, c); }
  for (let j = 0; j < h; j++) { S.dot(x, y + j, c); S.dot(x + w - 1, y + j, c); }
}
/** Hachures claires du fantôme, sur [x, x + w[ × [y, y + h[. */
function ghostHatch(x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((x + i + y + j) % 7 === 0) S.dot(x + i, y + j, WHITE, 0.45);
}
/** Hachures de la terre en coupe. */
function cutHatch(x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((x + i - (y + j) + 10000) % 6 === 0) S.dot(x + i, y + j, CUT_LINE, 0.7);
}
function line(x0: number, y0: number, x1: number, y1: number, c: Rgb, dash = 0, a = 1): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) {
    if (dash && Math.floor(k / dash) % 2 === 1) continue;
    S.dot(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), c, a);
  }
}
function thick(x0: number, y0: number, x1: number, y1: number, c: Rgb, dash = 0): void {
  line(x0, y0, x1, y1, c, dash);
  line(x0 + 1, y0, x1 + 1, y1, c, dash);
}
function arrowHead(x: number, y: number, dx: number, dy: number, c: Rgb, size = 7): void {
  const l = Math.hypot(dx, dy);
  const ux = dx / l;
  const uy = dy / l;
  for (const s of [1, -1]) {
    const ax = x - size * ux + s * size * 0.55 * -uy;
    const ay = y - size * uy + s * size * 0.55 * ux;
    thick(Math.round(ax), Math.round(ay), x, y, c);
  }
}
function arrow(x0: number, y0: number, x1: number, y1: number, c: Rgb): void {
  thick(x0, y0, x1, y1, c);
  arrowHead(x1, y1, x1 - x0, y1 - y0, c);
}
function disc(cx: number, cy: number, r: number, c: Rgb, a = 1): void {
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r) S.dot(cx + i, cy + j, c, a);
}
function cross(cx: number, cy: number, r: number, c: Rgb): void {
  thick(cx - r, cy - r, cx + r, cy + r, c);
  thick(cx - r, cy + r, cx + r, cy - r, c);
}
const tw = (s: string, k = 2) => s.length * 4 * k;
/** La police n'a ni point-virgule ni guillemets : on les remplace. */
const clean = (s: string) => s.replace(/ ;/g, ',').replace(/;/g, ',').replace(/"/g, "'");
function label(s: string, x: number, y: number, c: Rgb, k = 2): void {
  S.text(clean(s), x, y, c, k);
}
/** Une étiquette sur un fond (lisible sur n'importe quel aplat). */
function tag(s: string, x: number, y: number, c: Rgb = WHITE, k = 2, bg: Rgb = BG): void {
  rect(x - 2, y - 2, tw(s, k) + 3, 5 * k + 4, bg, 0.8);
  S.text(clean(s), x, y, c, k);
}
function fillPoly(pts: [number, number][], c: Rgb, a = 1, clip?: [number, number, number, number]): void {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.floor(Math.min(...ys));
  const y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + ((y + 0.5 - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) {
      if (clip && (x < clip[0] || y < clip[1] || x >= clip[2] || y >= clip[3])) continue;
      S.dot(x, y, c, a);
    }
  }
}
function inPoly(pts: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Une silhouette de Xéros en aplat (vue de face ou de côté), pieds en (cx, foot), haute de hPx. */
function xerosFlat(cx: number, foot: number, hPx: number): void {
  const head = Math.round(hPx * 0.22);
  const bw = Math.max(4, Math.round(hPx * 0.3));
  const hw = Math.max(3, Math.round(hPx * 0.22));
  rect(cx - Math.floor(bw / 2), foot - hPx + head, bw, hPx - head, XEROS);
  rect(cx - Math.floor(hw / 2), foot - hPx, hw, head, XEROS);
}

// ---------- la géométrie des deux coupes (cm, CADRAGE 13.2) ----------

interface Section {
  key: 'farm' | 'river';
  title: string;
  crest: number; // largeur de la crête
  flank: number; // largeur du flanc extérieur
  water: boolean;
}
const FLOOR_W = 250;
const WALL_W = 120;
const TOP_H = 500;
const XEROS_H = 170;
const SECTIONS: Section[] = [
  { key: 'farm', title: 'A) COTE FERME (CASE 52)', crest: 70, flank: 470, water: false },
  { key: 'river', title: 'B) SUR LA RIVIERE (CASE 44,5)', crest: 30, flank: 110, water: true },
];
/** Les points du profil du talus sud, du couloir au dehors (y, h). */
function southProfile(s: Section): [number, number][] {
  const a = FLOOR_W / 2;
  const b = a + WALL_W;
  const c = b + s.crest;
  const d = c + s.flank;
  return [[a, 0], [b, TOP_H], [c, TOP_H], [d, 0]];
}
const footOf = (s: Section) => FLOOR_W / 2 + WALL_W + s.crest + s.flank;
/** La ligne d'écran d'un point (y, h), en px depuis les pieds de Xéros (vers le bas positif). */
const screenRow = (y: number, h: number) => (y - h) / 5;
/** L'avancée de feuillage du sud (y, h) ; celle du nord en est le miroir. */
function southCanopy(s: Section): [number, number][] {
  const c = FLOOR_W / 2 + WALL_W + s.crest / 2;
  return [[c + 50, 500], [c + 20, 560], [c - 80, 580], [c - 190, 570], [-10, 520], [10, 470], [c - 160, 455], [c - 50, 470], [c + 10, 490]];
}
const mirror = (p: [number, number][]) => p.map(([y, h]) => [-y, h] as [number, number]);
const rowRange = (p: [number, number][]) => {
  const r = p.map(([y, h]) => screenRow(y, h));
  return [Math.round(Math.min(...r)), Math.round(Math.max(...r))] as [number, number];
};

// ---------- partie 1 : une coupe ----------

/** 1 px de la coupe = 2,5 cm (x2 du jeu). */
const CK = 2.5;
const H_TOP = 950;
const H_BOT = -150;

function drawSection(s: Section, ox: number, oy: number, halfW: number): { w: number; h: number } {
  const w = Math.round((2 * halfW) / CK);
  const h = Math.round((H_TOP - H_BOT) / CK);
  const X = (y: number) => ox + (y + halfW) / CK;
  const Y = (hh: number) => oy + (H_TOP - hh) / CK;
  const P = (p: [number, number][]) => p.map(([y, hh]) => [X(y), Y(hh)] as [number, number]);
  const clip: [number, number, number, number] = [ox, oy, ox + w, oy + h];
  frame(ox - 1, oy - 1, w + 2, h + 2, DIM);
  label(s.title, ox, oy - 34, GOLD, 3);

  const south = southProfile(s);
  const north = mirror(south).reverse();
  const foot = footOf(s);
  // la terre : le profil, fermé par le bas (le fond du lit sous l'eau)
  const bed = s.water ? -100 : 0;
  const earth: [number, number][] = [
    [-halfW, bed], [-foot, bed], ...(s.water ? [[-foot, 0] as [number, number]] : []), ...north, ...south,
    ...(s.water ? [[foot, bed] as [number, number]] : []), [halfW, bed], [halfW, H_BOT], [-halfW, H_BOT],
  ];
  const earthPx = P(earth);
  fillPoly(earthPx, EARTH, 1, clip);
  // le sous-sol sous le niveau 0 : un peu plus sombre, pour lire le niveau 0
  fillPoly(P([[-halfW, s.water ? -100 : 0], [halfW, s.water ? -100 : 0], [halfW, H_BOT], [-halfW, H_BOT]]), VEIL, 0.35, clip);
  // les champs ou l'eau, au-delà des pieds
  if (s.water) {
    for (const sg of [-1, 1]) {
      const a = sg < 0 ? -halfW : foot;
      const b = sg < 0 ? -foot : halfW;
      fillPoly(P([[a, 0], [b, 0], [b, -100], [a, -100]]), WATER, 1, clip);
    }
    label('EAU (1 M)', X(-halfW) + 6, Y(-20), WHITE, 2);
    label('EAU (1 M)', X(halfW) - tw('EAU (1 M)') - 6, Y(-20), WHITE, 2);
  } else {
    for (const sg of [-1, 1]) {
      const a = sg < 0 ? -halfW : foot;
      const b = sg < 0 ? -foot : halfW;
      fillPoly(P([[a, 0], [b, 0], [b, -20], [a, -20]]), OUTSIDE, 1, clip);
    }
    label('CHAMPS', X(-halfW) + 6, Y(-30), OUTSIDE, 2);
    label('CHAMPS', X(halfW) - tw('CHAMPS') - 6, Y(-30), OUTSIDE, 2);
  }
  // le sol du couloir
  fillPoly(P([[-FLOOR_W / 2, 0], [FLOOR_W / 2, 0], [FLOOR_W / 2, -12], [-FLOOR_W / 2, -12]]), FLOOR, 1, clip);
  // des arbres sur les crêtes (silhouettes, facultatif)
  for (const sg of [-1, 1]) {
    const c = sg * (FLOOR_W / 2 + WALL_W + s.crest / 2);
    fillPoly(P([[c - 15, 500], [c + 15, 500], [c + 15, 700], [c - 15, 700]]), [70, 50, 34], 1, clip);
    disc(Math.round(X(c)), Math.round(Y(780)), Math.round(110 / CK), [44, 96, 44], 1);
  }
  // la voûte : les avancées de feuillage des deux crêtes, vers 4,50 à 5,80 m
  const sc = southCanopy(s);
  for (const cpy of [mirror(sc), sc]) {
    const px = P(cpy);
    fillPoly(px, LEAF, 0.6, clip);
    const xs = px.map((p) => p[0]);
    const ys = px.map((p) => p[1]);
    const bx = Math.floor(Math.min(...xs));
    const by = Math.floor(Math.min(...ys));
    for (let y = by; y < Math.max(...ys); y++) for (let x = bx; x < Math.max(...xs); x++) if (inPoly(px, x + 0.5, y + 0.5) && (x + y) % 7 === 0) S.dot(x, y, WHITE, 0.35);
  }
  // Xéros au milieu du sol
  xerosFlat(Math.round(X(0)), Math.round(Y(0)), Math.round(XEROS_H / CK));

  // les cotes : largeurs sous le niveau 0, hauteurs à gauche
  const cy = Y(H_BOT) - 30;
  const marks = [-foot, -foot + s.flank, -FLOOR_W / 2 - WALL_W, -FLOOR_W / 2, FLOOR_W / 2, FLOOR_W / 2 + WALL_W, foot - s.flank, foot];
  line(X(-foot), cy, X(foot), cy, WHITE);
  marks.forEach((m) => line(X(m), cy - 4, X(m), cy + 4, WHITE));
  const widths = [s.flank, s.crest, WALL_W, FLOOR_W, WALL_W, s.crest, s.flank];
  widths.forEach((wd, i) => {
    const mid = (X(marks[i]) + X(marks[i + 1])) / 2;
    const t = String(wd);
    const up = wd / CK < tw(t) + 4 && i % 2 === 1;
    label(t, Math.round(mid - tw(t) / 2), up ? cy - 16 : cy + 8, WHITE, 2);
  });
  label('CM', X(foot) + 6, cy - 4, WHITE, 2);
  // hauteurs
  const hx = ox + 6;
  for (const hh of [0, 100, 200, 300, 400, 500]) {
    line(hx, Y(hh), hx + 8, Y(hh), WHITE);
    label(hh === 0 ? '0' : `${hh / 100} M`, hx + 12, Y(hh) - 4, WHITE, 2);
  }
  line(hx, Y(0), hx, Y(500), WHITE);
  label('N', ox + 6, oy + 6, GOLD, 3);
  label('S', ox + w - 18, oy + 6, GOLD, 3);
  label('SOL DU COULOIR A 0', Math.round(X(0) - tw('SOL DU COULOIR A 0') / 2), Math.round(Y(0)) + 10, FLOOR, 2);

  // ---------- les rayons de l'œil (parallèles, à 45°, venant d'en haut à droite) ----------
  const inEarth = (y: number, hh: number) => inPoly(earth, y, hh);
  /** Trace le rayon qui finit sur (y, h) ; rend le premier point de terre rencontré depuis l'œil, s'il y en a un. */
  const ray = (y: number, hh: number, c: Rgb, free = false): [number, number] | undefined => {
    // l'autre bout du rayon : là où il sort de la coupe, en haut ou à droite
    const t = Math.min(H_TOP - hh, halfW - y);
    const ey = y + t;
    const eh = hh + t;
    let hit: [number, number] | undefined;
    for (let k = 0; k <= t; k += 1) {
      const py = ey - k;
      const ph = eh - k;
      if (!free && k < t - 2 && inEarth(py, ph)) { hit = [py, ph]; break; }
    }
    if (!hit) {
      thick(Math.round(X(ey)), Math.round(Y(eh)), Math.round(X(y)), Math.round(Y(hh)), c);
      arrowHead(Math.round(X(y)), Math.round(Y(hh)), -1, 1, c);
      return undefined;
    }
    thick(Math.round(X(ey)), Math.round(Y(eh)), Math.round(X(hit[0])), Math.round(Y(hit[1])), c);
    line(Math.round(X(hit[0])), Math.round(Y(hit[1])), Math.round(X(y)), Math.round(Y(hh)), c, 3);
    cross(Math.round(X(hit[0])), Math.round(Y(hit[1])), 5, RED);
    return hit;
  };
  const RAY: Rgb = [255, 236, 120];
  const feet = ray(0, 0, RAY);
  const head = ray(0, XEROS_H, RAY);
  // le haut de la paroi nord
  ray(-FLOOR_W / 2 - WALL_W, TOP_H, [150, 230, 255]);
  // le rayon qui rase l'arête de la crête sud : sous lui, la paroi nord est cachée
  const ridge = FLOOR_W / 2 + WALL_W;
  const graze = (TOP_H - ridge - FLOOR_W / 2) / (1 + WALL_W / TOP_H); // h où ce rayon touche la paroi nord
  const grazeY = -FLOOR_W / 2 - (WALL_W * graze) / TOP_H;
  ray(grazeY, graze, [150, 230, 255], true);
  disc(Math.round(X(ridge)), Math.round(Y(TOP_H)), 3, [150, 230, 255]);
  let water: [number, number] | undefined;
  if (s.water) { ray(foot + 12, 0, [120, 200, 255]); water = [foot + 12, 0]; }

  // les rayons sont numérotés ; leurs explications sont dans la colonne de droite
  const num = (n: string, y: number, hh: number, c: Rgb, dx = 8, dy = -14) =>
    tag(n, Math.round(X(y)) + dx, Math.round(Y(hh)) + dy, c, 2, [20, 20, 20]);
  if (feet) num('1', feet[0], feet[1], RED);
  if (head) num('1', head[0], head[1], RED);
  num('2', -FLOOR_W / 2 - WALL_W, TOP_H, [150, 230, 255], -14, -14);
  num('3', grazeY, graze, [150, 230, 255], -14, -6);
  if (water) num('4', water[0], 0, [120, 200, 255], 4, -22);
  void water;
  tag('VOUTE', Math.round(X(0)) - tw('VOUTE') / 2, Math.round(Y(600)), LEAF);

  // l'œil du joueur, en haut à droite
  const ex = ox + w - 40;
  const ey = oy + 40;
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    S.dot(Math.round(ex + 16 * Math.cos(a)), Math.round(ey + 8 * Math.sin(a)), WHITE);
  }
  disc(ex, ey, 5, WHITE);
  disc(ex, ey, 2, BG);
  arrow(ex - 14, ey + 14, ex - 44, ey + 44, WHITE);
  const et = "L'OEIL DU JOUEUR, 45 DEGRES";
  tag(et, ox + w - tw(et) - 6, ey + 18, WHITE);
  return { w, h };
}

// ---------- partie 2 : les écrans ----------

const VW = 427;
const VH = 240;
const FEET = 130;

type Fill = 'flat' | 'ghost' | 'cut' | 'veil' | 'dark';
interface Band {
  from: number; // ligne d'écran depuis les pieds (vers le bas positif)
  to: number;
  fill: Fill;
  color: Rgb;
  alpha?: number;
  /** Bord inférieur festonné (le feuillage). */
  scallop?: boolean;
  text?: string;
  /** L'étiquette à gauche (sinon à droite). */
  left?: boolean;
}
interface Screen {
  title: string;
  bands: (Band | 'xeros')[];
  notes: string[];
  /** Les liserés : [ligne, couleur, épaisseur]. */
  edges?: [number, Rgb, number][];
}

function drawScreen(sc: Screen, ox: number, oy: number): void {
  rect(ox, oy, VW, VH, [60, 60, 60]);
  const row = (r: number) => oy + FEET + r;
  for (const b of sc.bands) {
    if (b === 'xeros') { xerosFlat(ox + Math.floor(VW / 2), row(0), 34); continue; }
    const y0 = Math.max(oy, row(b.from));
    const y1 = Math.min(oy + VH, row(b.to));
    for (let x = ox; x < ox + VW; x++) {
      const bottom = b.scallop ? y1 - Math.round(4 * Math.abs(Math.sin((x - ox) / 9))) : y1;
      for (let y = y0; y < bottom; y++) {
        if (b.fill === 'ghost') {
          S.dot(x, y, b.color, b.alpha ?? GHOST_A);
          if ((x + y) % 7 === 0) S.dot(x, y, WHITE, 0.45);
        } else if (b.fill === 'cut') {
          S.dot(x, y, CUT);
          if ((x - y + 10000) % 6 === 0) S.dot(x, y, CUT_LINE, 0.7);
        } else if (b.fill === 'veil') S.dot(x, y, VEIL, b.alpha ?? 0.85);
        else if (b.fill === 'dark') { S.dot(x, y, b.color); S.dot(x, y, VEIL, 0.6); }
        else S.dot(x, y, b.color, b.alpha ?? 1);
      }
    }
  }
  for (const [r, c, t] of sc.edges ?? []) if (row(r) >= oy && row(r) < oy + VH) rect(ox, row(r) - Math.floor(t / 2), VW, t, c);
  // étiquettes des bandes, à droite
  for (const b of sc.bands) {
    if (b === 'xeros' || !b.text) continue;
    const a = Math.max(row(b.from), oy);
    const z = Math.min(row(b.to), oy + VH);
    if (z - a < 12) continue;
    tag(b.text, b.left ? ox + 6 : ox + VW - tw(b.text) - 6, Math.round((a + z) / 2) - 5, WHITE, 2, [20, 20, 20]);
  }
  frame(ox - 1, oy - 1, VW + 2, VH + 2, GREY);
  // les pieds de Xéros : la ligne 130
  for (let x = ox - 8; x < ox; x++) S.dot(x, row(0), GOLD);
  label(sc.title, ox, oy - 16, GOLD, 2);
  sc.notes.forEach((n, i) => label(n, ox, oy + VH + 8 + i * 14, GREY, 2));
}

/** La règle des lignes à gauche d'une rangée d'écrans. */
function ruler(marks: number[], ox: number, oy: number): void {
  const used: number[] = [];
  for (const m of marks) {
    const y = oy + FEET + m;
    if (y < oy || y > oy + VH) continue;
    line(ox - 10, y, ox - 4, y, WHITE);
    const t = m > 0 ? `+${m}` : String(m);
    let ty = y - 4;
    while (used.some((u) => Math.abs(u - ty) < 11)) ty += 11;
    used.push(ty);
    label(t, ox - 12 - tw(t), ty, m === 0 ? GOLD : WHITE, 2);
  }
}

function screensFor(s: Section): Screen[] {
  const water = s.water;
  const crestTop = -51;
  const crestBot = water ? -45 : -37;
  const footRow = water ? 77 : 157;
  const [nTop, nBot] = rowRange(mirror(southCanopy(s)));
  const [sTop, sBot] = rowRange(southCanopy(s));
  const north: Band = { from: -200, to: -25, fill: 'flat', color: EARTH, text: 'PAROI NORD (FACE)', left: true };
  const floor: Band = { from: -25, to: 25, fill: 'flat', color: FLOOR };
  const leafN: Band = { from: nTop, to: nBot, fill: 'flat', color: LEAF, scallop: true, text: 'VOUTE NORD' };
  const leafS: Band = { from: sTop, to: sBot, fill: 'ghost', color: LEAF, alpha: 0.2, scallop: true, text: 'VOUTE SUD, FANTOME' };
  const below = 400;
  const today: Screen = water
    ? {
      title: '1. AUJOURD\'HUI',
      bands: [north, leafN, floor, 'xeros', leafS,
        { from: crestTop, to: 25, fill: 'ghost', color: EARTH, alpha: 0.2, text: 'TALUS SUD 0,2' },
        { from: 25, to: footRow, fill: 'flat', color: EARTH, text: 'FACE EXT. SUD' },
        { from: footRow, to: below, fill: 'flat', color: WATER, text: 'EAU' }],
      edges: [[crestBot, WHITE, 1]],
      notes: ['OPAQUE : PAROI NORD, FACE EXTERIEURE, EAU', 'FANTOME : CRETE SUD ET FACE SUR LE SOL (0,2)',
        'SE LIT COMME UN PONT : SOL = TABLIER,', 'EAU DESSOUS. LE DEHORS EN PLEINE LUMIERE'],
    }
    : {
      title: '1. AUJOURD\'HUI',
      bands: [north, leafN, floor, { from: 25, to: below, fill: 'flat', color: EARTH }, 'xeros', leafS,
        { from: crestTop, to: below, fill: 'ghost', color: EARTH, alpha: 0.2, text: 'TALUS SUD EN FANTOME 0,2' }],
      edges: [[crestBot, WHITE, 1]],
      notes: ['OPAQUE : PAROI NORD ; LE SOL ET XEROS SOUS', 'LE TALUS SUD EN FANTOME (CRETE ET FACE EXT.)',
        'DEHORS : HORS ECRAN (CRETE NORD -149, CHAMPS', '+157) MAIS EN PLEINE LUMIERE. NI DEDANS NI DEHORS'],
    };
  const coupe: Screen = {
    title: '2. FACON 1 : LA COUPE (COMME LA MAISON)',
    bands: [north, leafN, floor, 'xeros', leafS,
      { from: 25, to: footRow, fill: 'cut', color: CUT, text: water ? 'TALUS SUD EN COUPE' : 'TALUS SUD EN COUPE (JUSQU\'A +157)' },
      ...(water ? [{ from: footRow, to: below, fill: 'veil', color: VEIL, text: 'VOILE DU DEHORS' } as Band] : [])],
    edges: [[25, [60, 30, 20], 1], ...(water ? [[footRow - 1, GRASS, 3] as [number, Rgb, number]] : [])],
    notes: water
      ? ['OPAQUE : PAROI NORD ; NETS : SOL, XEROS', 'COUPE AU RAS DU SOL +25 A +77, HERBE AU PIED',
        'AU-DELA : LE VOILE. ON EST DANS LA TERRE,', "L'EAU NE SE VOIT PLUS"]
      : ['OPAQUE : PAROI NORD ; NETS : SOL, XEROS', 'COUPE AU RAS DU SOL DE +25 A +157 (HORS ECRAN :',
        'TOUT LE BAS ; HERBE AU PIED, A +157)', 'ON EST DANS LA TERRE'],
  };
  const tube: Screen = {
    title: '3. FACON 2 : LE TUBE TRANSPARENT',
    bands: [north, leafN, floor, 'xeros', leafS,
      { from: crestTop, to: 25, fill: 'ghost', color: EARTH, alpha: 0.25, text: 'TALUS SUD 0,25' },
      { from: 25, to: below, fill: 'veil', color: VEIL, text: 'VOILE (FACE EXT. ENLEVEE)' }],
    edges: [[crestBot, WHITE, 1]],
    notes: ['OPAQUE : PAROI NORD ; LE TALUS SUD ENTIER EN', 'FANTOME 0,25 SUR LE SOL ET XEROS ; SA FACE',
      'EXTERIEURE ENLEVEE, PUIS LE VOILE. XEROS', 'PARAIT ENTERRE, LE SOL SE BROUILLE'],
  };
  const veil: Screen = water
    ? {
      title: '4. FACON 3 : LE VOILE SEUL',
      bands: [north, leafN, floor, 'xeros', leafS,
        { from: crestTop, to: 25, fill: 'ghost', color: EARTH, alpha: 0.2, text: 'TALUS SUD 0,2' },
        { from: 25, to: footRow, fill: 'dark', color: EARTH, text: 'FACE EXT. ASSOMBRIE' },
        { from: footRow, to: below, fill: 'veil', color: VEIL, text: "VOILE (PLUS D'EAU)" }],
      edges: [[crestBot, WHITE, 1]],
      notes: ["COMME AUJOURD'HUI, FACE EXTERIEURE", "ASSOMBRIE ET L'EAU SOUS LE VOILE",
        'UN PONT DE NUIT'],
    }
    : {
      title: '4. FACON 3 : LE VOILE SEUL',
      bands: [north, leafN, floor, { from: 25, to: below, fill: 'dark', color: EARTH }, 'xeros', leafS,
        { from: crestTop, to: below, fill: 'ghost', color: EARTH, alpha: 0.2, text: 'TALUS SUD 0,2, FACE ASSOMBRIE' }],
      edges: [[crestBot, WHITE, 1]],
      notes: ["COMME AUJOURD'HUI, LA FACE EXTERIEURE", 'ASSOMBRIE ; LE DEHORS VOILE (HORS ECRAN ICI)',
        'UN PONT DE NUIT'],
    };
  return [today, coupe, tube, veil];
}

// ---------- l'encart : le voile vu d'en haut, la lumière au bout ----------

function drawMouths(ox: number, oy: number): void {
  const K = 20; // cm par px
  const len = 6000;
  const lenPx = len / K;
  const out = 30; // le dehors avant et après, en px
  const emp = 660 / K; // emprise d'un talus
  const fl = 250 / K;
  const total = Math.round(2 * emp + fl);
  const w = lenPx + 2 * out;
  const h = total + 40;
  label('ENCART (SOUS LA FACON 1) : LE TUNNEL VU D\'EN HAUT, 60 M, 1 PX = 20 CM', ox, oy - 16, GOLD, 2);
  // le dehors partout, puis le tunnel
  rect(ox, oy, w, h, OUTSIDE);
  const ty = oy + 20;
  const tx = ox + out;
  rect(tx, ty, lenPx, Math.round(emp), CUT);
  cutHatch(tx, ty, lenPx, Math.round(emp));
  rect(tx, ty + Math.round(emp), lenPx, Math.round(fl), FLOOR);
  rect(tx, ty + Math.round(emp + fl), lenPx, Math.round(emp), CUT);
  cutHatch(tx, ty + Math.round(emp + fl), lenPx, Math.round(emp));
  // le voile du dehors : 0,85 au milieu, de 0 à 0,85 sur les 3 premiers mètres à chaque bouche
  const ramp = 300 / K;
  for (let x = ox; x < ox + w; x++) {
    const d = Math.min(x - tx, tx + lenPx - x);
    const a = d <= 0 ? 0 : Math.min(1, d / ramp) * 0.85;
    if (a <= 0) continue;
    for (let y = oy; y < oy + h; y++) {
      if (y >= ty && y < ty + total) continue;
      S.dot(x, y, VEIL, a);
    }
  }
  frame(ox - 1, oy - 1, w + 2, h + 2, GREY);
  frame(tx, ty, lenPx, total, [60, 30, 20]);
  // les cotes des 3 m
  for (const x0 of [tx, tx + lenPx - ramp]) {
    line(x0, oy + h + 6, x0 + ramp, oy + h + 6, WHITE);
    line(x0, oy + h + 2, x0, oy + h + 10, WHITE);
    line(x0 + ramp, oy + h + 2, x0 + ramp, oy + h + 10, WHITE);
    label('3 M', Math.round(x0 + ramp / 2 - 12), oy + h + 14, WHITE, 2);
  }
  arrow(ox + 4, oy + h + 32, tx + 4, oy + h + 32, GOLD);
  arrow(ox + w - 4, oy + h + 32, tx + lenPx - 4, oy + h + 32, GOLD);
  label('LA LUMIERE AU BOUT', Math.round(ox + w / 2 - tw('LA LUMIERE AU BOUT') / 2), oy + h + 28, GOLD, 2);
  label('BOUCHE OUEST', ox, oy + h + 44, GREY, 2);
  label('BOUCHE EST', ox + w - tw('BOUCHE EST'), oy + h + 44, GREY, 2);
  tag('VOILE 0,85', Math.round(ox + w / 2 - tw('VOILE 0,85') / 2), oy + 5, WHITE, 2, VEIL);
  tag('SOL ET COUPE : NETS', Math.round(ox + w / 2 - tw('SOL ET COUPE : NETS') / 2), ty + Math.round(emp + fl / 2) - 5, WHITE, 2, [20, 20, 20]);
}

// ---------- partie 3 : la maison ----------

function drawHouse(ox: number, oy: number): void {
  const vw = 300;
  const vh = 170;
  // a) dehors : la maison, toit opaque
  rect(ox, oy, vw, vh, OUTSIDE);
  rect(ox + 90, oy + 80, 120, 50, EARTH); // façade sud
  fillPoly([[ox + 80, oy + 82], [ox + 220, oy + 82], [ox + 200, oy + 30], [ox + 100, oy + 30]], ROOF);
  rect(ox + 140, oy + 100, 18, 30, [60, 40, 30]);
  xerosFlat(ox + 230, oy + 140, 34);
  frame(ox - 1, oy - 1, vw + 2, vh + 2, GREY);
  label('A) DEHORS : LE TOIT OPAQUE', ox, oy - 16, GOLD, 2);
  label('LE DEHORS EN PLEINE LUMIERE', ox, oy + vh + 8, GREY, 2);

  // b) dedans : la pièce, le vide autour
  const bx = ox + vw + 40;
  rect(bx, oy, vw, vh, VOID);
  const rx = bx + 50;
  const ry = oy + 20;
  const rw = 200;
  rect(rx, ry, rw, 50, EARTH); // mur du fond, par sa face
  rect(rx, ry + 50, rw, 70, FLOOR); // terre battue
  rect(rx - 8, ry + 30, 8, 110, CUT); // murs de côté par leur tranche
  rect(rx + rw, ry + 30, 8, 110, CUT);
  rect(rx - 8, ry + 120, rw + 16, 14, CUT); // mur sud en coupe, au ras du sol
  cutHatch(rx - 8, ry + 120, rw + 16, 14);
  rect(rx - 8, ry + 120, rw + 16, 1, [60, 30, 20]);
  xerosFlat(rx + rw / 2, ry + 100, 34);
  frame(bx - 1, oy - 1, vw + 2, vh + 2, GREY);
  label('B) DEDANS : LA PIECE', bx, oy - 16, GOLD, 2);
  tag('MUR DU FOND (FACE)', rx + 4, ry + 4, WHITE, 2, [20, 20, 20]);
  tag('TERRE BATTUE', rx + 4, ry + 56, [40, 40, 40], 2, FLOOR);
  tag('MUR SUD EN COUPE', rx + 4, ry + 138, WHITE, 2, [20, 20, 20]);
  label('LE VIDE', bx + 4, oy + 4, GREY, 2);
  label('AUTOUR : LE VIDE, NOIR', bx, oy + vh + 8, GREY, 2);

  // c) la correspondance
  const cx = bx + vw + 40;
  label('C) LA CORRESPONDANCE (FACON 1)', cx, oy - 16, GOLD, 2);
  const pairs: [Rgb, string, Rgb, string, Fill?][] = [
    [EARTH, 'PAROI NORD', EARTH, 'MUR DU FOND'],
    [CUT, 'TALUS SUD EN COUPE', CUT, 'MUR SUD EN COUPE', 'cut'],
    [LEAF, 'VOUTE (FANTOME)', ROOF, 'TOIT (CACHE DEDANS)'],
    [VEIL, 'DEHORS (VOILE 0,85)', VOID, 'LE VIDE'],
    [FLOOR, 'SOL DU COULOIR', FLOOR, 'TERRE BATTUE'],
  ];
  label('TUNNEL', cx, oy + 2, WHITE, 2);
  label('MAISON', cx + 330, oy + 2, WHITE, 2);
  pairs.forEach(([c1, t1, c2, t2, f], i) => {
    const y = oy + 22 + i * 28;
    rect(cx, y, 22, 18, c1);
    if (f === 'cut') cutHatch(cx, y, 22, 18);
    frame(cx - 1, y - 1, 24, 20, DIM);
    label(t1, cx + 30, y + 4, WHITE, 2);
    label('=', cx + 300, y + 4, GOLD, 2);
    rect(cx + 330, y, 22, 18, c2);
    if (f === 'cut') cutHatch(cx + 330, y, 22, 18);
    frame(cx + 329, y - 1, 24, 20, DIM);
    label(t2, cx + 360, y + 4, WHITE, 2);
  });
  label('DIFFERENCES : PAS DE PORTE NI DE FONDU (LA VUE CHANGE SUR PLACE,', cx, oy + 166, GREY, 2);
  label('AU FRANCHISSEMENT DE LA BOUCHE) ; OUVERT AUX DEUX BOUTS (LA LUMIERE).', cx, oy + 180, GREY, 2);
}

// ---------- la légende ----------

function drawLegend(ox: number, oy: number): void {
  const items: [string, (x: number, y: number) => void][] = [
    ['TERRE PLEINE (TALUS, PAROI)', (x, y) => rect(x, y, 30, 20, EARTH)],
    ['TERRE EN COUPE (TRANCHEE)', (x, y) => { rect(x, y, 30, 20, CUT); cutHatch(x, y, 30, 20); rect(x, y, 30, 1, [60, 30, 20]); rect(x, y + 17, 30, 3, GRASS); }],
    ['SOL DU COULOIR', (x, y) => rect(x, y, 30, 20, FLOOR)],
    ['XEROS (1,70 M)', (x, y) => { rect(x, y, 30, 20, [60, 60, 60]); xerosFlat(x + 15, y + 19, 18); }],
    ['FANTOME (MEME TEINTE A 0,2-0,25)', (x, y) => {
      for (let j = 0; j < 20; j++) for (let i = 0; i < 30; i++) S.dot(x + i, y + j, ((i >> 2) + (j >> 2)) % 2 ? FLOOR : [60, 60, 60]);
      rect(x, y, 30, 20, EARTH, GHOST_A);
      ghostHatch(x, y, 30, 20);
    }],
    ['VOILE DU DEHORS (TERRE PROFONDE 0,85)', (x, y) => { rect(x, y, 15, 20, OUTSIDE); rect(x + 15, y, 15, 20, OUTSIDE); rect(x, y, 30, 20, VEIL, 0.85); }],
    ['EAU', (x, y) => rect(x, y, 30, 20, WATER)],
    ['FEUILLAGE DE LA VOUTE', (x, y) => rect(x, y, 30, 20, LEAF)],
    ['CHAMPS, FORET DU DEHORS', (x, y) => rect(x, y, 30, 20, OUTSIDE)],
    ['LISERE D\'HERBE DE LA COUPE', (x, y) => { rect(x, y, 30, 20, CUT); rect(x, y + 8, 30, 4, GRASS); }],
  ];
  label('LEGENDE (COMMUNE A TOUTE LA PLANCHE)', ox, oy, GOLD, 2);
  const colW = 370;
  items.forEach(([t, draw], i) => {
    const x = ox + (i % 5) * colW;
    const y = oy + 18 + Math.floor(i / 5) * 28;
    draw(x, y);
    frame(x - 1, y - 1, 32, 22, DIM);
    label(t, x + 38, y + 5, WHITE, 2);
  });
}

// ---------- la planche ----------

/** Dessine toute la planche sur la feuille (PLAN_W × PLAN_H, fond BG déjà posé). */
export function drawReliefPlans(surface: PlanSurface): void {
  S = surface;
  const PAD = 24;
  label('RELIEF : PLANS DE L\'INTERIEUR DU TUNNEL (SCHEMAS EN APLATS, PAS DES DESSINS)', PAD, 16, GOLD, 4);
  label('CADRAGE.MD SECTION 13. LE TUNNEL VA D\'EST EN OUEST ; LE JEU MONTRE TOUT DEPUIS LE SUD A 45 DEGRES : UN POINT A (Y, H) CM TOMBE A LA LIGNE (Y - H) / 5 PX.', PAD, 46, GREY, 2);
  drawLegend(PAD, 72);

  // partie 1
  const p1 = 150;
  label('1. LES DEUX COUPES NORD-SUD, A L\'ECHELLE : 1 PX = 2,5 CM (X2 DU JEU) ; NORD A GAUCHE, SUD A DROITE, HAUTEUR VERS LE HAUT', PAD, p1, GOLD, 3);
  const cTop = p1 + 70;
  const a = drawSection(SECTIONS[0], PAD, cTop, 900);
  const bx = PAD + a.w + 50;
  const b = drawSection(SECTIONS[1], bx, cTop, 560);
  // l'échelle
  const sx = bx + b.w + 40;
  label('ECHELLE', sx, cTop, GOLD, 2);
  rect(sx, cTop + 18, 40, 6, WHITE);
  rect(sx + 40, cTop + 18, 40, 6, DIM);
  label('0', sx, cTop + 30, WHITE, 2);
  label('1 M', sx + 34, cTop + 30, WHITE, 2);
  label('2 M', sx + 74, cTop + 30, WHITE, 2);
  const notes: [string, Rgb][] = [
    ['RAYONS DE L\'OEIL : PARALLELES,', GREY],
    ['DESCENDANT VERS LE NORD A 45', GREY],
    ['DEGRES. UN POINT EST VU SI SON', GREY],
    ['RAYON NE TRAVERSE PAS DE TERRE.', GREY],
    ['TRAIT PLEIN : A L\'AIR LIBRE,', GREY],
    ['POINTILLE : DANS LA TERRE.', GREY],
    ['', GREY],
    ['1 (CROIX ROUGES) : PIEDS ET TETE', RED],
    ['DE XEROS : LEURS RAYONS TOUCHENT', RED],
    ['LE TALUS SUD : XEROS CACHE PAR', RED],
    ['LE TALUS SUD (DE LA TETE AUX', RED],
    ['PIEDS).', RED],
    ['', GREY],
    ['2 : LE HAUT DE LA PAROI NORD,', [150, 230, 255]],
    ['VU. LA PAROI NORD SE VOIT...', [150, 230, 255]],
    ['3 : ...MAIS SEULEMENT AU-DESSUS', [150, 230, 255]],
    [`DE ${Math.round((TOP_H - FLOOR_W - WALL_W) / (1 + WALL_W / TOP_H))} CM : CE RAYON RASE LA`, [150, 230, 255]],
    ['CRETE SUD (POINT BLEU) ; SOUS', [150, 230, 255]],
    ['LUI, LA PAROI EST CACHEE.', [150, 230, 255]],
    ['(13.2 DIT : EN ENTIER)', GREY],
    ['', GREY],
    ['4 (RIVIERE) : L\'EAU JUSTE AU-', [120, 200, 255]],
    ['DELA DU PIED DU FLANC SUD :', [120, 200, 255]],
    ['VUE, SOUS XEROS A L\'ECRAN.', [120, 200, 255]],
    ['', GREY],
    ['XEROS : 1,70 M, AU MILIEU DU', GREY],
    ['SOL (125 CM DE CHAQUE PAROI).', GREY],
  ];
  notes.forEach(([n, c], i) => label(n, sx, cTop + 52 + i * 14, c, 2));

  // partie 2
  const p2 = cTop + a.h + 30;
  label('2. LES ECRANS : 427 X 240 PX (21 X 12 M), X1, PIEDS DE XEROS A LA LIGNE 130 (TRAIT JAUNE A GAUCHE) ; LIGNES COMPTEES DEPUIS LES PIEDS', PAD, p2, GOLD, 3);
  const gx = 72;
  const gap = 34;
  let y = p2 + 60;
  SECTIONS.forEach((s) => {
    label(s.title, PAD, y - 34, WHITE, 2);
    const sc = screensFor(s);
    sc.forEach((scr, i) => drawScreen(scr, gx + i * (VW + gap), y));
    const marks = s.water ? [-130, -51, -45, -25, 0, 25, 77, 110] : [-130, -51, -37, -25, 0, 25, 110];
    ruler(marks, gx, y);
    y += VH + 120;
  });
  // l'encart sous la façon 1
  drawMouths(gx + VW + gap, y - 10);

  // l'emplacement des avancées, calculé (pour le rendu)
  const [sTop, sBot] = rowRange(southCanopy(SECTIONS[0]));
  const [nTop, nBot] = rowRange(mirror(southCanopy(SECTIONS[0])));
  const vx = gx + 2 * (VW + gap) + 20;
  [
    'LA VOUTE A L\'ECRAN (PROJETEE DE LA COUPE) :',
    `AVANCEE SUD DE ${sTop} A ${sBot}, AVANCEE NORD DE ${nTop} A ${nBot}.`,
    'ELLES TOMBENT SUR LA PAROI NORD, AU-DESSUS DE',
    'LA TETE DE XEROS (-34), PAS SUR LUI.',
    '',
    'NON MONTRES : LES ARBRES DES CRETES (CACHES',
    'DEDANS EN FACON 1, QUESTION 28).',
  ].forEach((n, i) => label(n, vx, y - 10 + i * 14, GREY, 2));

  // partie 3
  const p3 = y + 160;
  label('3. LA MAISON, POUR COMPARER', PAD, p3, GOLD, 3);
  drawHouse(PAD, p3 + 50);
}
