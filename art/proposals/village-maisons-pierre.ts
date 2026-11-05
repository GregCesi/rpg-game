// PROPOSITION (hors jeu, jamais chargée par le jeu) : les quatre maisons de pierre du village (CADRAGE-village.md, travail 2,
// section 3.2) : h2 le tisserand, h8 le meunier (à étage, sa cour), h9 le forgeron, h10 le maquignon (à étage, en encorbellement).
// Planches : npx tsx tools/essai-village-pierre.ts écrit .art-preview/village-pierre-dehors.png, village-pierre-dedans.png et
// village-pierre-pieces.png ; tools/essai-village-maisons.ts (commun) montera les planches finales de ces exports.
//
// Le modèle est celui de la maison de Xéros (art/lib/volumes.ts, art/proposals/maison-xeros.ts) : des volumes dont chaque face a sa
// matière au pixel, projetés comme le jeu (un point (x, y, z) en (x, y − z), 5 cm par pixel, STYLE.md section 8, pièces `ground`).
// Les matières sont dans art/proposals/village-maisons-pierre-matieres.ts (la pierre du jeu, la forge, et ce qui est copié de la
// branche `maison-coq` : la lave, les pierres d'angle et de tableau, le vitrail) ; les pièces nouvelles dans
// art/proposals/village-maisons-pierre-pieces.ts ; les meubles du jeu sont ses images, posées comme le jeu les pose.
//
// Ce que la projection du jeu impose (et qui a changé le cadrage, voir le rendu de l'agent) : un mur nord-sud se voit par la tranche
// (son dessus seul, une bande) ; une baie, une porte, un pignon tournés vers l'est ou l'ouest ne se voient pas de la vue du jeu.
// Ce qui doit se voir de la rue va donc au sud : la grande baie du tisserand dans son pignon sud, les deux fenêtres vitrées du
// maquignon au sud de son étage.
//
// Repère de chaque maison : px du jeu, x vers l'est, y vers le sud, z vers le haut, l'origine des scènes au coin nord-ouest de
// l'emprise (débords de toit, souche et cour compris) ; les murs sont décrits dans leur repère, puis décalés (`AT`).

import type { Grid, Palette } from '../lib/canvas';
import { sources } from '../index';
import { hearthModel } from '../world/chimney';
import { box, daub, doorTex, part, polyPrism, timber, voidTex, type Board, type Part, type Quad, type Scene, type Tex, type V3 } from '../lib/volumes';
import propsJson from '../../src/content/props.json';
import { formView } from '../../src/world/natural';
import { variantImage } from '../../src/content/views';
import { HOUSE_META, type HouseId, type Img, type VillageHouse, type VillagePiece } from './village-types';
import {
  VOID, boards, dimmed, flagstones, furnWood, hexify, laves, lavesRidge, leaded, limeMasonry, limePlaster, palette,
  planks, rendered, rubble, rubbleSection, shingles, tiles, withBays, type FaceHole, type Mortar, type StoneBay,
} from './village-maisons-pierre-matieres';
import {
  GABLE_CHIMNEY, PIECES as PIECE_LIST, STAIR, courtyardWallModel, gableChimneyModel, grilleModel, highChair,
  jettyJoistModel, kneadingTrough, leanToModel, moved, oiledClothModel, pieceGrid, pieceModel, porchModel,
  ringModel, stairModel, stallModel, strapDoorTex, troughModel, turned, vaneModel, writingDesk,
} from './village-maisons-pierre-pieces';

export { palette } from './village-maisons-pierre-matieres';
export const PIECES: VillagePiece[] = PIECE_LIST;

// =====================================================================================================================
// Les images du jeu, posées comme le jeu les pose
// =====================================================================================================================

const byName = new Map(sources.map((s) => [s.name, s]));
const has = (k: string) => byName.has(k);
function img(name: string): Img {
  const s = byName.get(name);
  if (s?.kind === 'image') return { grid: s.grid, pal: s.palette };
  if (s?.kind === 'spritesheet') return { grid: Object.values(s.animations)[0].frames[0], pal: s.palette };
  throw new Error(`village-maisons-pierre : pas d'image « ${name} »`);
}
interface PropDef { image: string; views: never; aged?: boolean; dims: { w: number; d: number; h: number } }
const props = propsJson as unknown as Record<string, PropDef>;
/** L'image d'un objet de props.json dans sa vue, au bois patiné s'il prend l'âge (des maisons habitées). */
function propImg(key: string, view = 0): Img {
  const def = props[key];
  if (!def) throw new Error(`village-maisons-pierre : pas d'objet « ${key} »`);
  const k = formView(variantImage(def.image, undefined), def.views, view, undefined, has);
  return img(def.aged && has(`${k}-worn`) ? `${k}-worn` : k);
}
/** Une image centrée sur son emprise (x0–x1, px), son bas au bord sud y relevé de z ; profondeur : le bord sud. */
function placeImg(o: Img, x0: number, x1: number, ySouth: number, z = 0, depth = ySouth): Board {
  const w = o.grid[0].length;
  return { grid: o.grid, pal: o.pal, x: Math.round((x0 + x1) / 2 - w / 2), y: Math.round(ySouth - z) - o.grid.length, depth: () => depth };
}
/** Un objet de props.json, son emprise au coin nord-ouest (x, y) en px, dans sa vue, posé à la hauteur z (px). */
function prop(key: string, x: number, y: number, view = 0, z = 0): Board {
  const d = props[key].dims, [w, dd] = view % 2 ? [d.d / 5, d.w / 5] : [d.w / 5, d.d / 5];
  return placeImg(propImg(key, view), x, x + w, y + dd, z);
}
/** Une pièce nouvelle (meuble) posée comme un objet du jeu. */
function piece(key: string, x: number, y: number, view = 0, z = 0): Board {
  const m = pieceModel(key), [w, dd] = view % 2 ? [m.dims.d / 5, m.dims.w / 5] : [m.dims.w / 5, m.dims.d / 5];
  return placeImg({ grid: pieceGrid(m, view), pal: palette }, x, x + w, y + dd, z);
}
/** Un meuble du coq (sa vue du sud seulement), son emprise w × d en px. */
const coqBoard = (g: Grid, x: number, y: number, w: number, d: number, z = 0) => placeImg({ grid: g, pal: palette }, x, x + w, y + d, z);

const lift = (b: Board, z: number): Board => ({ ...b, y: b.y - z });
const moveBoard = (b: Board, dx: number, dy: number): Board => ({ ...b, x: b.x + dx, y: b.y + dy, depth: (r) => b.depth(r) + dy });

// =====================================================================================================================
// La géométrie commune
// =====================================================================================================================

/** Une ouverture dans un mur, le long de lui (a) et en hauteur (z). */
interface Hole { a0: number; a1: number; z0: number; z1: number }

/**
 * Un mur droit percé (copie de `wall` de maison-coq:art/proposals/coq-maison.ts) : le long de x (`ew`) ou de y, de a0 à a1,
 * épaisseur c0-c1, de z0 à z1 ; les trous le découpent en boîtes.
 */
function wallRun(Q: Quad[], ew: boolean, a0: number, a1: number, c0: number, c1: number, z0: number, z1: number, holes: Hole[], p: Part, tex: Tex | { top: Tex; side: Tex }): void {
  if (z1 - z0 < 0.01 || a1 - a0 < 0.01) return;
  const cuts = [...new Set([a0, a1, ...holes.flatMap((h) => [h.a0, h.a1]).filter((a) => a > a0 && a < a1)])].sort((x, y) => x - y);
  for (let k = 0; k + 1 < cuts.length; k++) {
    const p0 = cuts[k], p1 = cuts[k + 1], m = (p0 + p1) / 2;
    const hs = holes.filter((h) => h.a0 <= m && h.a1 >= m && h.z1 > z0 && h.z0 < z1).sort((x, y) => x.z0 - y.z0);
    let z = z0;
    const put = (za: number, zb: number) => {
      if (zb - za < 0.01) return;
      Q.push(...(ew ? box(p0, p1, c0, c1, za, zb, p, tex) : box(c0, c1, p0, p1, za, zb, p, tex)));
    };
    for (const h of hs) { put(z, Math.max(z, h.z0)); z = Math.max(z, h.z1); }
    put(z, z1);
  }
}

/** Une matière de face lue en coordonnées du mur (s = x − x0 ou y − y0, t = z − z0), pour que les pierres se suivent d'un morceau à l'autre. */
function onFace(tex: Tex, ew: boolean, a0: number, w: number, h: number, z0 = 0, top?: Tex): Tex {
  return (s, t, c) => {
    if (c.face === 'top' || c.face === 'under') return top ? top(s, t, c) : '+';
    // le bout d'un mur nord-sud (sa face sud, au-dessus de la coupe) : lu le long de x, pas sur une seule colonne
    if (!ew && (c.face === 'S' || c.face === 'N')) return tex(c.p[0] + c.p[1] * 0.37, c.p[2] - z0, { ...c, w, h });
    return tex((ew ? c.p[0] : c.p[1]) - a0, c.p[2] - z0, { ...c, w, h });
  };
}

const quad = (o: V3, u: V3, v: V3, n: V3, p: Part, tex: Tex, face: Quad['face'] = 'S'): Quad => ({ o, u, v, n, part: p, tex, face });

type Cover = 'tiles' | 'shingles' | 'laves';
interface RoofSpec {
  /** Le faîtage le long de x (est-ouest) ou de y (nord-sud). */
  axis: 'x' | 'y';
  /** Le long du faîtage : les nus des pignons ; en travers : les nus des murs gouttereaux. */
  a0: number; a1: number; b0: number; b1: number;
  /** Le haut des murs, au nu (le dessous de la couverture). */
  z: number;
  pitch: number;
  /** Débord à l'égout, aux pignons (px) ; épaisseur de la couverture (px, d'aplomb). */
  eave: number; gable: [number, number]; thick: number;
  cover: Cover; seed: number;
  /** Les percements (souches) : x0, x1, y0, y1. */
  holes?: [number, number, number, number][];
}
const RIDGE_P = (cover: Cover) => part('faîtage', 11, cover === 'tiles' ? 'π' : cover === 'shingles' ? '&' : '"', 'full', { roof: true });

/** La matière d'un pan, selon la couverture ; `K` : px d'écran par px de pente (le pureau garde sa taille à l'écran). */
function coverTex(cover: Cover, K: number, seed: number): Tex {
  return cover === 'tiles' ? tiles(K, seed) : cover === 'shingles' ? shingles(K, seed) : laves(seed);
}
const EAVE_EDGE: Record<Cover, Tex> = {
  tiles: (_s, t) => (t > 1 ? 'ν' : 'π'),
  shingles: (_s, t) => (t > 1 ? '%' : '&'),
  laves: laves(5),
};

/** Le toit à deux pans : les pans, l'épaisseur à l'égout (au sud), la rive au sud (faîtage nord-sud), le faîtage. */
function gableRoof(Q: Quad[], r: RoofSpec): void {
  const tan = Math.tan((r.pitch * Math.PI) / 180), H2 = (r.b1 - r.b0) / 2, mid = r.b0 + H2;
  const run = H2 + r.eave, zE = r.z + r.thick - r.eave * tan, zR = r.z + r.thick + H2 * tan;
  const len = Math.hypot(run, run * tan), sn = (run * tan) / len, cs = run / len;
  const P = part('pan', 9, r.cover === 'tiles' ? 'π' : r.cover === 'shingles' ? '&' : '"', 'full', { roof: true });
  const A0 = r.a0 - r.gable[0], A1 = r.a1 + r.gable[1];
  const pierce = (tex: Tex): Tex => (s, t, c) => {
    const [x, y] = c.p;
    if (r.holes?.some(([x0, x1, y0, y1]) => x > x0 - 0.3 && x < x1 + 0.3 && y > y0 - 0.3 && y < y1 + 0.3)) return null;
    return tex(s, t, c);
  };
  if (r.axis === 'x') {
    const Ks = cs + sn;
    Q.push(quad([A0, r.b1 + r.eave, zE], [A1 - A0, 0, 0], [0, -run, run * tan], [0, sn, cs], P, pierce(coverTex(r.cover, Ks, r.seed)), 'slope'));
    Q.push(quad([A0, r.b0 - r.eave, zE], [A1 - A0, 0, 0], [0, run, run * tan], [0, -sn, cs], P, pierce(coverTex(r.cover, Ks, r.seed + 1)), 'slope'));
    Q.push(quad([A0, r.b1 + r.eave, zE - r.thick], [A1 - A0, 0, 0], [0, 0, r.thick], [0, 1, 0], P, EAVE_EDGE[r.cover], 'S'));
    ridgeX(Q, r.cover, A0, A1, mid, zR, r.holes);
  } else {
    // les pans tournés vers l'ouest et l'est ; u le long du faîtage, du nord au sud
    Q.push(quad([r.b0 - r.eave, A0, zE], [0, A1 - A0, 0], [run, 0, run * tan], [-sn, 0, cs], P, pierce(coverTex(r.cover, 1, r.seed)), 'slope'));
    Q.push(quad([r.b1 + r.eave, A1, zE], [0, A0 - A1, 0], [-run, 0, run * tan], [sn, 0, cs], P, pierce(coverTex(r.cover, 1, r.seed + 1)), 'slope'));
    // la rive au sud : la tranche de la couverture le long des deux rampants
    for (const [x, dx] of [[r.b0 - r.eave, run], [r.b1 + r.eave, -run]] as const) {
      Q.push(quad([x, A1, zE - r.thick], [dx, 0, run * tan], [0, 0, r.thick], [0, 1, 0], P, EAVE_EDGE[r.cover], 'S'));
    }
    const rp = RIDGE_P(r.cover);
    Q.push(...box(mid - 2.5, mid + 2.5, A0 - 0.5, A1 + 0.5, zR - 1.5, zR + 1.5, rp, (s, t, c) => ridgeTex(r.cover)(c.face === 'top' ? t : s, t, c)));
  }
}
/** La matière du faîtage : tuiles canal scellées à la chaux, bardeaux croisés, faîtières de pierre. */
function ridgeTex(cover: Cover): Tex {
  if (cover === 'laves') return lavesRidge();
  if (cover === 'tiles') return (s, _t, c) => {
    const j = Math.floor(s) % 8;
    if (j === 0) return '!';
    if (j === 7) return 'π';
    return c.n[2] > 0.85 ? 'κ' : c.n[2] > 0.4 ? (c.n[1] > 0 ? 'μ' : 'κ') : c.n[1] > 0 ? 'ν' : 'ξ';
  };
  return (s, t, c) => {
    const i = Math.floor(s), side = c.n[1] > 0 ? 1 : 0;
    if ((i + side * 2) % 4 === 0) return '&';
    return side ? (Math.floor(t) === 0 ? '%' : '*') : '^';
  };
}
function ridgeX(Q: Quad[], cover: Cover, x0: number, x1: number, y: number, z: number, holes?: [number, number, number, number][]): void {
  const P = RIDGE_P(cover);
  const sec: [number, number][] = cover === 'tiles'
    ? Array.from({ length: 9 }, (_, k) => { const a = Math.PI - (k / 8) * Math.PI; return [y + 3.2 * Math.cos(a), z - 0.8 + 3.2 * Math.sin(a)] as [number, number]; })
    : cover === 'shingles' ? [[y - 3, z - 0.6], [y, z + 2.2], [y + 3, z - 0.6]]
      : [[y + 3, z - 1], [y + 2, z + 2], [y - 2, z + 2], [y - 3, z - 1]];
  const tex = ridgeTex(cover);
  const cut: Tex = (s, t, c) => (holes?.some(([a, b, y0, y1]) => c.p[0] > a - 0.3 && c.p[0] < b + 0.3 && y >= y0 - 3 && y <= y1 + 3) ? null : tex(s, t, c));
  Q.push(...polyPrism(x0, x1, sec, P, cut));
}

/** Une souche de cheminée : son fût (`tex`), la dalle de couronnement, le noir du conduit. */
function stack(Q: Quad[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, tex: Tex): void {
  Q.push(...box(x0, x1, y0, y1, z0, z1 - 2, part('souche', 12, '~', 'full'), tex));
  Q.push(...box(x0 - 1, x1 + 1, y0 - 1, y1 + 1, z1 - 2, z1, part('couronnement', 12.5, '~', 'full'), (_s, t, c) => (c.face === 'top' ? '+' : t > 1 ? '!' : ';')));
  Q.push(...box(x0 + 2, x1 - 2, y0 + 2, y1 - 2, z1, z1 + 0.01, part('conduit', 13, 'o', 'none'), () => 'o'));
}

/** Le jour d'une fenêtre vu du dehors : la pénombre du dedans, au fond de l'embrasure. */
function darkBay(Q: Quad[], x0: number, x1: number, y: number, z0: number, z1: number): void {
  Q.push(quad([x0, y, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0], [0, 1, 0], part('baie', 0, 'o', 'none', { cast: false }), voidTex));
}
/** L'appui d'une fenêtre : une pierre plate saillante. */
function sill(Q: Quad[], x0: number, x1: number, yFace: number, z: number, _depth = 6): void {
  // une pierre à peine saillante : plus profonde, son dessus monterait à l'écran et cacherait le bas du jour (40 cm à peine)
  Q.push(...box(x0, x1, yFace - 0.5, yFace + 0.7, z - 1.5, z, part('appui', 4, '~', 'full'), (_s, _t, c) => (c.face === 'top' ? '!' : '=')));
}
/** Un linteau de bois (le rondin du normal équarri) au-dessus d'une baie, au nu du mur. */
function woodLintel(Q: Quad[], x0: number, x1: number, y0: number, y1: number, z0: number, seed: number): void {
  Q.push(...box(x0, x1, y0, y1 + 0.02, z0, z0 + 4, part('linteau', 6, 'K', 'full'), timber(seed)));
}
/** Une porte de planches au fond de son embrasure (`tex` : la porte du jeu, ou les pentures du forgeron). */
function doorPlane(Q: Quad[], x0: number, x1: number, y: number, h: number, tex: Tex, z0 = 0): void {
  Q.push(...box(x0, x1, y - 1, y, z0, z0 + h, part('porte', 3, '&', 'full'), tex));
}
/** Le volet ouvert d'une fenêtre (l'image du jeu, `plank-shutter`, vue de chant), contre le tableau ouest, comme chez Xéros. */
function openShutter(x: number, yFace: number, z: number): Board {
  const s = img('plank-shutter-r1-worn');
  return { grid: s.grid, pal: s.pal, x: Math.round(x - 8), y: Math.round(yFace + 1 - z - s.grid.length), depth: () => yFace + 0.5 };
}
/** Un seuil de pierre (l'image du jeu `threshold-stone`, 120 × 50 cm) devant une porte du mur sud. */
function threshold(x0: number, x1: number, yFace: number): Board {
  return placeImg(propImg('threshold-stone'), x0, x1, yFace + 5);
}

/** Les volumes posés à leur place, leur matière lisant le repère d'origine. */
const at = (qs: Quad[], x: number, y: number, z = 0) => moved(qs, [x, y, z]);

interface Built { quads: Quad[]; boards: Board[]; floor?: [number, number, number, number] }
/** Une scène du repère de la maison posée à l'origine `o` (px) et à son décalage `AT` (le repère des murs dans l'emprise). */
function place(b: Built, AT: [number, number], o: [number, number]): Scene {
  const dx = o[0] + AT[0], dy = o[1] + AT[1];
  return {
    quads: hexify(moved(b.quads, [dx, dy, 0])),
    boards: b.boards.map((x) => moveBoard(x, dx, dy)),
    floor: b.floor ? [b.floor[0] + dx, b.floor[1] + dx, b.floor[2] + dy, b.floor[3] + dy] : undefined,
  };
}

/** Le dedans d'une pièce de pierre au rez : les quatre murs, le sud (et ce qu'on veut) coupé à `cut`. */
interface ShellSpec {
  W: number; D: number; t: number; z0: number; z1: number; cut?: number;
  south: Tex; north: Tex; inner: Tex; top: Tex;
  holes: { S: Hole[]; N: Hole[]; W: Hole[]; E: Hole[] };
  part: Part;
}
function shell(Q: Quad[], s: ShellSpec): void {
  const zs = s.cut ?? s.z1;
  wallRun(Q, true, 0, s.W, s.D - s.t, s.D, s.z0, zs, s.holes.S, s.part, { top: s.top, side: s.south });
  wallRun(Q, true, 0, s.W, 0, s.t, s.z0, s.z1, s.holes.N, s.part, { top: s.top, side: s.north });
  wallRun(Q, false, s.t, s.D - s.t, 0, s.t, s.z0, s.z1, s.holes.W, s.part, { top: s.top, side: s.inner });
  wallRun(Q, false, s.t, s.D - s.t, s.W - s.t, s.W, s.z0, s.z1, s.holes.E, s.part, { top: s.top, side: s.inner });
}

/** L'âtre du jeu (`stone-hearth`, art/world/chimney.ts) dans la vue `view` (0 : le dos au nord ; 3 : le dos à l'ouest), posé en (x, y). */
function hearth(frame: number, view: 0 | 3, x: number, y: number, z = 0): Quad[] {
  const q = hearthModel(frame)();
  return at(view === 0 ? q : turned(q, 3, 44, 22), x, y, z);
}

// =====================================================================================================================
// h2 : le tisserand. Maison-bloc de pierre brute à la terre, 6,40 × 7,20 m, faîtage nord-sud, bardeaux à 45°.
// =====================================================================================================================
//
// Murs (px) : x 0-128, y 0-144, 10 d'épais, 48 de haut (2,40 m) ; faîte à 112 (5,60 m), les bardeaux débordent de 30 cm à l'égout
// (est, ouest) et de 20 au pignon (nord, sud). Le pignon sud porte la grande baie (1,20 × 0,80, la toile huilée), à 90 cm du sol,
// sous un linteau de bois : c'est l'atelier, au sud (le cadrage le mettait au nord, sa baie à l'est sur la rue : un mur est ne se voit
// pas dans la vue du jeu). La porte (0,90 × 1,80) et une petite fenêtre à volet dans le mur est, sur la rue ; l'âtre contre le pignon
// nord, son conduit dans le mur, la souche au-dessus du faîte.

const H2 = { W: 128, D: 144, t: 10, h: 48, pitch: 45, AT: [6, 4] as [number, number] };
const H2_BAY = { s0: 52, s1: 76, t0: 18, t1: 34 };
const H2_GABLE_H = H2.h + H2.W / 2; // la pointe du pignon, sous la couverture : 112
const h2Apex = (s: number) => H2.h + Math.min(s, H2.W - s);
const h2FaceHoles: FaceHole[] = [
  { ...H2_BAY, kind: 'void' },
  { s0: H2_BAY.s0 - 4, s1: H2_BAY.s1 + 4, t0: H2_BAY.t1, t1: H2_BAY.t1 + 4, kind: 'lintel' },
];

function h2Outside(frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W, D, t, h } = H2;
  const stone = part('mur', 2, '~', 'full');
  const south = rubble(21, W, H2_GABLE_H, 'earth', h2FaceHoles);
  const sTex = onFace(south, true, 0, W, H2_GABLE_H);
  const sec = rubbleSection(23, 'earth');
  shell(Q, {
    W, D, t, z0: 0, z1: h, south: sTex, north: sTex, inner: sTex, top: sec, part: stone,
    holes: { S: [{ a0: H2_BAY.s0, a1: H2_BAY.s1, z0: H2_BAY.t0, z1: H2_BAY.t1 }], N: [], W: [], E: [{ a0: 64, a1: 82, z0: 0, z1: 36 }, { a0: 28, a1: 40, z0: 16, z1: 24 }] },
  });
  // le pignon sud : la même face de pierre jusqu'à la pointe, sous les rampants
  Q.push(quad([0, D, h], [W, 0, 0], [0, 0, H2_GABLE_H - h], [0, 1, 0], stone, (s, tt, c) => (tt + h >= h2Apex(s) ? null : south(s, tt + h, c))));
  Q.push(quad([W, 0, h], [-W, 0, 0], [0, 0, H2_GABLE_H - h], [0, -1, 0], stone, (s, tt) => (tt + h >= h2Apex(s) ? null : '=')));
  // la grande baie : le châssis de toile huilée dans l'embrasure, l'appui de pierre, le linteau de bois
  Q.push(...at(oiledClothModel(), H2_BAY.s0, D - 4, H2_BAY.t0));
  sill(Q, H2_BAY.s0 - 1, H2_BAY.s1 + 1, D, H2_BAY.t0, 6);
  woodLintel(Q, H2_BAY.s0 - 4, H2_BAY.s1 + 4, D - t, D, H2_BAY.t1, 37);
  // le toit de bardeaux, la souche du pignon nord (percée dans le faîtage)
  const st: [number, number, number, number] = [58, 70, -1, 11];
  gableRoof(Q, { axis: 'y', a0: 0, a1: D, b0: 0, b1: W, z: h, pitch: H2.pitch, eave: 6, gable: [4, 4], thick: 2, cover: 'shingles', seed: 211, holes: [st] });
  stack(Q, st[0], st[1], st[2], st[3], 96, 128, limeMasonry(25, () => [true, true]));
  // la porte du mur est (sur la rue) ne se voit pas d'ici : un mur nord-sud se voit par la tranche, sous le débord du toit
  void frame;
  return { quads: Q, boards: B };
}

function h2Inside(frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W, D, t, h } = H2;
  const stone = part('mur', 2, '~', 'full');
  const south = onFace(rubble(21, W, H2_GABLE_H, 'earth', h2FaceHoles), true, 0, W, H2_GABLE_H);
  const north = onFace(rubble(27, W, h, 'earth'), true, 0, W, h);
  const inner = onFace(rubble(29, D, h, 'earth'), false, 0, D, h);
  shell(Q, {
    W, D, t, z0: 0, z1: h, cut: 14, south, north, inner, top: rubbleSection(23, 'earth'), part: stone,
    holes: { S: [], N: [], W: [], E: [{ a0: 64, a1: 82, z0: 0, z1: 36 }, { a0: 28, a1: 40, z0: 16, z1: 24 }] },
  });
  // l'âtre contre le pignon nord, son manteau de bois, la hotte maçonnée jusqu'au plafond
  Q.push(...hearth(frame, 0, 42, t));
  Q.push(...box(41, 87, t + 16, t + 22, 30, 34, part('manteau', 7, 'K', 'full'), timber(41)));
  Q.push(...box(44, 84, t, t + 16, 34, h, part('hotte', 6, '~', 'full'), { top: rubbleSection(31, 'earth'), side: onFace(rubble(33, 40, h - 34, 'earth'), true, 44, 40, h - 34, 34) }));
  // la porte de la rue, vue de chant ; le volet de la fenêtre est, fermé
  B.push(prop('cottage-door', W - 6, 64, 1));
  // les meubles : la salle-chambre au nord, l'atelier au sud
  B.push(
    prop('bed', 12, 12), prop('chest', 12, 56, 1), prop('jar', 96, 12), prop('bucket-water', 32, 14),
    prop('table', 66, 42), prop('stool', 72, 62), prop('stool', 96, 62), prop('stool', 82, 34),
    piece('loom', 46, 98, 2), piece('yarn-winder', 18, 110), prop('stool', 30, 116), prop('sack', 14, 92), prop('sack', 25, 90),
  );
  return { quads: Q, boards: B, floor: [t, W - t, t, D - t] };
}

const h2: VillageHouse = {
  id: 'h2-tisserand', size: [W2(), 152], levels: 1, palette, pieces: ['oiled-cloth-window', 'loom', 'yarn-winder'],
  outside: (o, frame = 0) => place(h2Outside(frame), H2.AT, o),
  inside: (o, _level = 0, frame = 0) => place(h2Inside(frame), H2.AT, o),
};
function W2() { return H2.W + 12; }

// =====================================================================================================================
// h9 : le forgeron. Maison-bloc de moellons à la chaux, 8,80 × 7,20 m, faîtage est-ouest, tuiles plates à 45°, la souche au pignon ouest.
// =====================================================================================================================
//
// Murs (px) : x 0-176, y 0-144, 10 d'épais, 52 de haut (2,60 m) ; faîte à 124 (6,20 m), la souche jusqu'à 146 (7,30 m). Au sud, sur la
// rue : la fenêtre de la salle et sa grille, la porte à pentures, la fenêtre de la chambre ; l'anneau scellé, le grattoir, la girouette
// au faîte. Dedans : la salle (l'âtre contre le pignon ouest) et la chambre derrière une cloison de planches.

const H9 = { W: 176, D: 144, t: 10, h: 52, pitch: 45, AT: [14, 6] as [number, number] };
const H9_WIN: [number, number][] = [[22, 34], [128, 140]];
const H9_DOOR: [number, number] = [52, 70];
const h9Quoin = () => [true, true] as [boolean, boolean];

function h9Walls(Q: Quad[], cut?: number): void {
  const { W, D, t, h } = H9;
  const m = limeMasonry(91, h9Quoin);
  const south = onFace(m, true, 0, W, h);
  const plaster = limePlaster(93);
  const inner: Tex = (_s, _t, c) => plaster(c.p[0] + c.p[1], c.p[2], c);
  shell(Q, {
    W, D, t, z0: 0, z1: h, cut, south, north: cut ? inner : south, inner: cut ? inner : south, top: rubbleSection(95, 'lime'), part: part('mur', 2, '~', 'full'),
    holes: {
      S: [...H9_WIN.map(([a0, a1]) => ({ a0, a1, z0: 16, z1: 24 })), { a0: H9_DOOR[0], a1: H9_DOOR[1], z0: 0, z1: 36 }],
      N: [], W: [], E: [{ a0: 50, a1: 62, z0: 16, z1: 24 }],
    },
  });
}

function h9Outside(frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W, D, t, h } = H9;
  h9Walls(Q);
  for (const [a0, a1] of H9_WIN) {
    darkBay(Q, a0, a1, D - 2, 16, 24); sill(Q, a0 - 1, a1 + 1, D, 16, 6); woodLintel(Q, a0 - 3, a1 + 3, D - t, D, 24, 60 + a0);
    B.push(openShutter(a0, D, 16));
  }
  // la grille de fer de la fenêtre de la salle, scellée au nu du mur
  Q.push(...at(grilleModel(), H9_WIN[0][0], D - 1.5, 16));
  // la porte à pentures, son linteau, son seuil ; l'anneau et le grattoir
  doorPlane(Q, H9_DOOR[0], H9_DOOR[1], D - 2, 36, strapDoorTex(5));
  woodLintel(Q, H9_DOOR[0] - 3, H9_DOOR[1] + 3, D - t, D, 36, 77);
  B.push(threshold(H9_DOOR[0] - 3, H9_DOOR[1] + 3, D));
  Q.push(...at(ringModel(), 41, D, 18));
  B.push(piece('boot-scraper', 76, D + 1));
  // le toit de tuiles plates, percé à l'ouest pour la souche ; la girouette au faîte, à l'est
  const st: [number, number, number, number] = [-12, 0, 62, 82];
  gableRoof(Q, { axis: 'x', a0: 0, a1: W, b0: 0, b1: D, z: h, pitch: H9.pitch, eave: 6, gable: [4, 4], thick: 2, cover: 'tiles', seed: 901, holes: [st] });
  // la souche au pignon ouest (la pièce `gable-chimney`, vue R1 : adossée au pignon, saillante vers l'ouest)
  Q.push(...at(turned(gableChimneyModel(), 1, GABLE_CHIMNEY.w, GABLE_CHIMNEY.d), -GABLE_CHIMNEY.d, 60));
  Q.push(...at(vaneModel(), 150, 71, h + 72 + 4));
  void frame;
  return { quads: Q, boards: B };
}

function h9Inside(frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W, D, t, h } = H9;
  h9Walls(Q, 14);
  // l'âtre contre le pignon ouest (le dos à l'ouest), son manteau, sa hotte chaulée jusqu'au plafond
  Q.push(...hearth(frame, 3, t, 50));
  Q.push(...box(t + 16, t + 22, 49, 95, 30, 34, part('manteau', 7, 'K', 'full'), timber(43)));
  Q.push(...box(t, t + 16, 52, 92, 34, h, part('hotte', 6, '~', 'full'), limePlaster(97)));
  // la cloison de planches entre la salle et la chambre (x 98), sa porte
  const pp = part('cloison', 3, '&', 'full');
  for (const [y0, y1] of [[t, 70], [88, D - t]] as const) Q.push(...box(98, 100, y0, y1, 0, h, pp, boards(17 + y0, 4, [1, 44])));
  Q.push(...box(98, 100, 70, 88, 36, h, pp, boards(19, 4)));
  B.push(prop('inner-door', 98, 70, 1));
  // la salle : la table et le banc, la chaise, le tonneau, la jarre, le seau ; la chambre : le grand lit, le coffre, la lanterne
  B.push(
    prop('table', 40, 26), prop('bench', 41, 46), piece('chair', 84, 30, 1), prop('barrel', 14, 104), prop('jar', 28, 116),
    prop('bucket-water', 40, 120), prop('bed', 136, 12), prop('chest', 112, 12), prop('lantern', 120, 14, 0, 11), prop('crate', 150, 118),
  );
  return { quads: Q, boards: B, floor: [t, W - t, t, D - t] };
}

const h9: VillageHouse = {
  id: 'h9-forgeron', size: [H9.W + 18, H9.D + 12], levels: 1, palette,
  pieces: ['strap-door', 'window-grille', 'gable-chimney', 'tether-ring', 'boot-scraper', 'weathervane', 'plank-partition', 'chair'],
  outside: (o, frame = 0) => place(h9Outside(frame), H9.AT, o),
  inside: (o, _level = 0, frame = 0) => place(h9Inside(frame), H9.AT, o),
};

// =====================================================================================================================
// h8 : le meunier. Maison-bloc à étage, moellons enduits, pierre de taille aux angles et aux baies, laves ; la cour fermée.
// =====================================================================================================================
//
// Murs (px) : x 0-240 (12 m), y 0-152 (7,60 m), 12 d'épais (60 cm) ; le rez jusqu'à 52 (2,60 m sous les solives), le plancher de
// l'étage à 57 (2,85 m, comme le coq), les gouttereaux jusqu'à 105 (5,25 m), faîte à 181 (9,05 m ; le cadrage disait 8,20 m : à 45°
// sur 7,60 m de large, le faîte monte de 3,80 m au-dessus des murs). Refends x 96-104 et 140-148 (40 cm). La cour (22 × 13 m) au sud,
// fermée de murs de 2 m, l'écurie en appentis contre son mur nord, le porche charretier dans son mur est, sur la rue du nord.

const H8 = { W: 240, D: 152, t: 12, rez: 52, floor: 57, top: 105, pitch: 45, AT: [2, 4] as [number, number] };
const H8_YARD = { x0: 0, x1: 440, y0: 152, y1: 412 };
interface Win { a0: number; a1: number; z0: number; z1: number; kind: 'void' | 'leaded' | 'shut' | 'door' }
const H8_WINS: Win[] = [
  { a0: 36, a1: 52, z0: 18, z1: 38, kind: 'void' },
  { a0: 113, a1: 131, z0: 0, z1: 40, kind: 'door' },
  { a0: 160, a1: 176, z0: 18, z1: 38, kind: 'leaded' },
  { a0: 200, a1: 216, z0: 18, z1: 38, kind: 'shut' },
  { a0: 34, a1: 46, z0: 73, z1: 89, kind: 'shut' },
  { a0: 116, a1: 128, z0: 73, z1: 89, kind: 'void' },
  { a0: 190, a1: 202, z0: 73, z1: 89, kind: 'shut' },
];
const h8Bays = (): StoneBay[] => H8_WINS.map((w, i) => ({ s0: w.a0, s1: w.a1, t0: w.z0, t1: w.z1, seed: i }));
const h8South = () => withBays(rendered(81, H8.W, ['left', 'right']), h8Bays());
/** Un volet intérieur fermé (planches debout, deux pentures) au fond de l'embrasure (copie de `shutter` du coq). */
const shutterTex = (w: number, h: number): Tex => (s, t) => {
  const i = Math.floor(s), j = Math.floor(t);
  if (j === 3 || j === h - 4) return i < w - 1 ? (i === 0 ? '-' : '_') : '@';
  if (i % 3 === 2) return '@';
  return i % 3 === 0 ? '^' : j < 2 ? '%' : '*';
};

function h8Bay(Q: Quad[], w: Win, y: number): void {
  const ww = w.a1 - w.a0, hh = w.z1 - w.z0;
  if (w.kind === 'door') {
    doorPlane(Q, w.a0, w.a1, y - 3, hh, doorTex(9, ww));
    return;
  }
  sill(Q, w.a0 - 2, w.a1 + 2, y, w.z0, 6);
  if (w.kind === 'leaded') Q.push(...box(w.a0, w.a1, y - 4, y - 3, w.z0, w.z1, part('vitrail', 1, '`', 'none'), (s, t) => leaded(ww, hh, s, t)));
  else if (w.kind === 'shut') Q.push(...box(w.a0, w.a1, y - 4, y - 3, w.z0, w.z1, part('volet', 1, '&', 'none'), shutterTex(ww, hh)));
  else darkBay(Q, w.a0, w.a1, y - 3, w.z0, w.z1);
}

/** Les murs de la cour, l'écurie, le porche, le puits (dehors comme dedans). */
function h8Yard(Q: Quad[], B: Board[]): void {
  const Y = H8_YARD;
  Q.push(...at(courtyardWallModel(Y.x1 - Y.x0, 121), Y.x0, Y.y1 - 10));
  const ns = (y0: number, y1: number, x: number, seed: number) => Q.push(...at(turned(courtyardWallModel(y1 - y0, seed), 1, y1 - y0, 10), x, y0));
  ns(Y.y0, Y.y1 - 10, Y.x0, 123);
  ns(Y.y0, 230, Y.x1 - 10, 125);
  ns(318, Y.y1 - 10, Y.x1 - 10, 127);
  // le mur nord de la cour, de la maison à l'écurie et de l'écurie au porche
  Q.push(...at(courtyardWallModel(20, 129), 240, Y.y0), ...at(courtyardWallModel(32, 131), 388, Y.y0));
  Q.push(...at(leanToModel(), 260, Y.y0));
  // le porche charretier dans le mur est (vue R1 : son passage d'est en ouest)
  Q.push(...at(turned(porchModel(), 1, 88, 24), Y.x1 - 17, 230));
  B.push(prop('well', 300, 300), prop('barrel', 400, 236), prop('sack', 404, 250), prop('hay-bale', 274, 230));
}

function h8Outside(frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W, D, t, top } = H8;
  const P = part('mur', 2, '~', 'full');
  const south = onFace(h8South(), true, 0, W, top);
  shell(Q, {
    W, D, t, z0: 0, z1: top, south, north: south, inner: south, top: rubbleSection(83, 'lime'), part: P,
    holes: { S: H8_WINS.map(({ a0, a1, z0, z1 }) => ({ a0, a1, z0, z1 })), N: [], W: [], E: [] },
  });
  for (const w of H8_WINS) h8Bay(Q, w, D);
  B.push(threshold(110, 134, D));
  // le toit de laves, ses deux souches enduites aux angles de pierre de taille (le pignon ouest : la cuisine ; le mur nord : la salle)
  const st: [number, number, number, number][] = [[0, 16, 66, 86], [186, 202, -1, 13]];
  gableRoof(Q, { axis: 'x', a0: 0, a1: W, b0: 0, b1: D, z: top, pitch: H8.pitch, eave: 4, gable: [2, 2], thick: 3, cover: 'laves', seed: 801, holes: st });
  for (const [k, [x0, x1, y0, y1]] of st.entries()) stack(Q, x0, x1, y0, y1, 120, 200, onFace(rendered(85 + k, x1 - x0, ['left', 'right']), true, x0, x1 - x0, 200));
  h8Yard(Q, B);
  void frame;
  return { quads: Q, boards: B, floor: [H8_YARD.x0 + 10, H8_YARD.x1 - 10, H8_YARD.y0, H8_YARD.y1 - 10] };
}

/** Les murs du dedans du meunier, un niveau : enduits de chaux, le sud coupé à 70 cm au-dessus du plancher du niveau. */
function h8Shell(Q: Quad[], level: 0 | 1): void {
  const { W, D, t, rez, floor, top } = H8;
  const z0 = level ? rez : 0, z1 = level ? top : rez, cut = (level ? floor : 0) + 14;
  const plaster = limePlaster(87);
  const inner: Tex = (_s, _t, c) => plaster(c.p[0] + c.p[1], c.p[2], c);
  const P = part('mur', 2, '~', 'full');
  shell(Q, {
    W, D, t, z0, z1, cut, south: onFace(h8South(), true, 0, W, top), north: inner, inner, top: rubbleSection(83, 'lime'), part: P,
    holes: { S: H8_WINS.map(({ a0, a1, z0: a, z1: b }) => ({ a0, a1, z0: a, z1: b })), N: [], W: [], E: [] },
  });
  // les refends de 40 cm, enduits, leurs portes (au rez vers le sud, à l'étage vers le palier)
  for (const [x0, x1] of [[96, 104], [140, 148]] as const) {
    const doors: Hole[] = level ? [{ a0: 92, a1: 110, z0: floor, z1: floor + 36 }] : [{ a0: 100, a1: 118, z0: 0, z1: 36 }];
    wallRun(Q, false, t, D - t, x0, x1, z0, z1, doors, P, { top: rubbleSection(89, 'lime'), side: inner });
  }
}

function h8Inside(level: 0 | 1, frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], { W, D, t, floor } = H8;
  h8Shell(Q, level);
  const sx = 122, sy = 20; // l'escalier : x 122-140, du palier (y 20) au pied (y 80)
  if (level === 0) {
    // le dallage du passage et de la salle (la cuisine en terre battue)
    Q.push(quad([104, t, 0.02], [W - t - 104, 0, 0], [0, D - 2 * t, 0], [0, 0, 1], part('dalles', 0, '~', 'none', { cast: false }), flagstones(5), 'top'));
    Q.push(...at(stairModel(), sx, sy));
    // la cuisine : l'âtre au pignon ouest, sa hotte ; la salle : la cheminée du mur nord
    Q.push(...hearth(frame, 3, t, 50));
    Q.push(...box(t + 16, t + 22, 49, 95, 30, 34, part('manteau', 7, 'K', 'full'), timber(45)));
    Q.push(...box(t, t + 16, 52, 92, 34, H8.rez, part('hotte', 6, '~', 'full'), limePlaster(99)));
    Q.push(...hearth(frame + 1, 0, 166, t));
    Q.push(...box(165, 211, t + 16, t + 22, 30, 34, part('manteau', 7, 'K', 'full'), timber(47)));
    Q.push(...box(168, 208, t, t + 16, 34, H8.rez, part('hotte', 6, '~', 'full'), limePlaster(101)));
    B.push(
      coqBoard(kneadingTrough(), 40, 13, 30, 12), prop('table', 44, 58), prop('bench', 45, 78), prop('barrel', 14, 112),
      prop('jar', 82, 120), prop('jar', 74, 126), prop('sack', 84, 104), prop('bucket-water', 64, 16),
      prop('table', 166, 70), prop('bench', 167, 62), prop('bench', 167, 90), prop('chest', 150, 126), prop('stool', 214, 76),
      prop('inner-door', 96, 100, 1), prop('inner-door', 140, 100, 1), prop('lantern', 106, 128),
    );
    return { quads: Q, boards: B, floor: [t, 96, t, D - t] };
  }
  // l'étage : le plancher percé de la trémie, l'escalier dans la pénombre dessous, le vide sous la coupe du mur sud
  const pp = part('plancher', 1, '&', 'full'), pl = { top: planks(), side: planks() };
  const [wx0, wx1, wy0, wy1] = [sx, sx + STAIR.w, sy, sy + STAIR.d];
  Q.push(...box(t, W - t, t, wy0, H8.rez, floor, pp, pl), ...box(t, W - t, wy1, D - t, H8.rez, floor, pp, pl));
  Q.push(...box(t, wx0, wy0, wy1, H8.rez, floor, pp, pl), ...box(wx1, W - t, wy0, wy1, H8.rez, floor, pp, pl));
  Q.push(...box(0, W, D - t, D, 0, H8.rez, part('vide', 3, 'o', 'none', { cast: false }), () => VOID));
  Q.push(...dimmed(at(stairModel(), sx, sy)));
  Q.push(...dimmed([quad([wx0 - 2, wy0 - 2, 0.02], [STAIR.w + 4, 0, 0], [0, STAIR.d + 4, 0], [0, 0, 1], part('dalles', 0, '~', 'none'), flagstones(5), 'top')]));
  // le garde-corps de la trémie, côté ouest (le palier)
  const gp = part('garde-corps', 8, 'K', 'thin'), fw = furnWood(23);
  Q.push(...box(wx0 - 1, wx0 + 1, wy0, wy1, floor + 17, floor + 19, gp, fw));
  for (let y = wy0 + 2; y < wy1; y += 6) Q.push(...box(wx0 - 0.5, wx0 + 0.5, y, y + 1, floor, floor + 17, gp, fw));
  Q.push(...box(wx0 - 1, wx1, wy1 - 1, wy1 + 1, floor + 17, floor + 19, gp, fw));
  // le conduit de la salle qui monte dans le mur nord de la chambre des parents, celui de la cuisine dans le pignon
  Q.push(...box(176, 198, t, t + 8, floor, H8.top, part('conduit', 4, '~', 'full'), limePlaster(103)));
  Q.push(...box(t, t + 8, 58, 82, floor, H8.top, part('conduit', 4, '~', 'full'), limePlaster(105)));
  const up = (b: Board) => lift(b, floor);
  B.push(...[
    prop('bed', 26, 14), prop('bed', 60, 14), prop('chest', 30, 60), prop('chest', 66, 60),
    prop('bed', 106, 92), prop('stool', 108, 134),
    prop('bed', 206, 14), prop('chest', 150, 14), prop('chest', 150, 120, 1), prop('stool', 214, 60),
    prop('inner-door', 96, 92, 1), prop('inner-door', 140, 92, 1),
  ].map(up));
  return { quads: Q, boards: B };
}

const h8: VillageHouse = {
  id: 'h8-meunier', size: [H8_YARD.x1 + 10, H8_YARD.y1 + 6], levels: 2, palette,
  pieces: ['rendered-wall', 'wooden-stair', 'porch-gate', 'courtyard-wall', 'lean-to-stable'],
  outside: (o, frame = 0) => place(h8Outside(frame), H8.AT, o),
  inside: (o, level = 0, frame = 0) => place(h8Inside(level, frame), H8.AT, o),
};

// =====================================================================================================================
// h10 : le maquignon. Pignon sur rue (à l'est), rez de pierre brute à la chaux, étage de colombage serré chaulé en encorbellement de
// 40 cm sur la rue et au sud, tuiles plates à 50° ; l'écurie dans la cour, à l'ouest.
// =====================================================================================================================
//
// Le rez (px, repère de la maison) : x 0-256 (12,80 m), y 0-160 (8 m), 10 d'épais, 52 de haut ; les solives de l'étage z 52-56, en
// saillie de 8 au sud (y 160-168) et à l'est ; le plancher 56-57 ; l'étage de pan de bois : la sablière basse 57-61, les poteaux tous
// les 80 cm (16,25 px) jusqu'à 101, une entretoise à mi-hauteur, la sablière haute 101-105 ; x 0-264, y 0-168. Faîte à 205 (10,25 m ;
// le cadrage disait 9,60 : à 50° sur les 8,40 m de l'étage, le faîte monte de 5 m au-dessus de la sablière). La cour à l'ouest :
// l'écurie de quatre stalles sous un toit de tuiles, l'abreuvoir. Les deux fenêtres vitrées sont au sud de l'étage (la salle, à l'est).

const H10 = { W: 256, D: 160, t: 10, rez: 52, floor: 57, top: 105, jetty: 8, pitch: 50, X: 184, AT: [0, 6] as [number, number] };
const UW = H10.W + H10.jetty, UD = H10.D + H10.jetty; // l'étage : 264 × 168
const H10_REZ_HOLES: Hole[] = [{ a0: 40, a1: 52, z0: 16, z1: 24 }, { a0: 136, a1: 154, z0: 0, z1: 36 }, { a0: 200, a1: 212, z0: 16, z1: 24 }];
const h10RezFace = () => rubble(1001, H10.W, H10.rez, 'lime', [
  ...H10_REZ_HOLES.map((h) => ({ s0: h.a0, s1: h.a1, t0: h.z0, t1: h.z1, kind: 'void' as const })),
  ...H10_REZ_HOLES.map((h) => ({ s0: h.a0 - 3, s1: h.a1 + 3, t0: h.z1, t1: h.z1 + 4, kind: 'lintel' as const })),
]);
/** Les poteaux de l'étage, tous les 80 cm (bord ouest de chacun). */
const STUDS = Array.from({ length: 17 }, (_, k) => Math.round(k * 16.25));
/** Les fenêtres de l'étage, dans le panneau `k` (entre le poteau k et k + 1) : vitrées à la salle, à volet aux chambres. */
const UP_WINS: { k: number; z0: number; z1: number; kind: 'leaded' | 'shutter' }[] = [
  { k: 3, z0: 77, z1: 85, kind: 'shutter' }, { k: 7, z0: 77, z1: 85, kind: 'shutter' },
  { k: 12, z0: 71, z1: 87, kind: 'leaded' }, { k: 14, z0: 71, z1: 87, kind: 'leaded' },
];

/** La façade sud de l'étage, colombage serré : poteaux, sablières, entretoise, remplissages chaulés, fenêtres ; `cut` : coupée à z. */
function closeStudFace(Q: Quad[], B: Board[], y1: number, x0: number, x1: number, cut?: number): void {
  const z0 = H10.floor, top = cut ?? H10.top, T = (n: string, p = 6) => part(n, p, 'K', 'full', { eave: true });
  const y0 = y1 - 3;
  const clip = (a: number, b: number): [number, number] | undefined => (a >= top ? undefined : [a, Math.min(b, top)]);
  const put = (xa: number, xb: number, za: number, zb: number, p: Part, tex: Tex) => { const c = clip(za, zb); if (c) Q.push(...box(xa, xb, y0, y1, c[0], c[1], p, tex)); };
  put(x0, x1, z0, z0 + 4, T('sablière basse', 7), timber(1101));
  if (!cut) put(x0, x1, H10.top - 4, H10.top, T('sablière haute', 7), timber(1103));
  STUDS.forEach((sx, k) => { if (x0 + sx + 4 <= x1) put(x0 + sx, x0 + sx + 4, z0 + 4, H10.top - 4, T('poteau', 6), timber(1110 + k, [[1, 2], [2, 38]])); });
  STUDS.forEach((sx, k) => {
    const a = x0 + sx + 4, b = k + 1 < STUDS.length ? x0 + STUDS[k + 1] : x1;
    if (b - a < 1) return;
    const win = UP_WINS.find((w) => w.k === k);
    const panel = (za: number, zb: number, seed: number) => put(a, b, za, zb, part('torchis', 1, ';', 'none', { eave: true }), daub(seed, true));
    if (!win) {
      put(a, b, 79, 81, T('entretoise', 5), timber(1200 + k));
      panel(z0 + 4, 79, 1300 + k); panel(81, H10.top - 4, 1400 + k);
      return;
    }
    put(a, b, win.z0 - 2, win.z0, T('appui', 6), timber(1500 + k));
    put(a, b, win.z1, win.z1 + 2, T('linteau', 6), timber(1600 + k));
    panel(z0 + 4, win.z0 - 2, 1700 + k); panel(win.z1 + 2, H10.top - 4, 1800 + k);
    if (cut && win.z0 >= cut) return;
    if (win.kind === 'leaded') put(a, b, win.z0, win.z1, part('vitrail', 1, '`', 'none'), (s, t) => leaded(b - a, win.z1 - win.z0, s, t));
    else { darkBay(Q, a, b, y0 + 1, win.z0, win.z1); B.push(openShutter(a, y1, win.z0)); }
  });
}

/** Le rez de pierre, les solives en saillie et leur ombre, le plancher. */
function h10Rez(Q: Quad[], cut?: number): void {
  const { W, D, t, rez } = H10;
  const P = part('mur', 2, '~', 'full');
  const plaster = limePlaster(1005);
  const inner: Tex = (_s, _t, c) => plaster(c.p[0] + c.p[1], c.p[2], c);
  const south = onFace(h10RezFace(), true, 0, W, rez);
  shell(Q, {
    W, D, t, z0: 0, z1: rez, cut, south, north: cut !== undefined ? inner : south, inner: cut !== undefined ? inner : south, top: rubbleSection(1007, 'lime'), part: P,
    holes: { S: H10_REZ_HOLES, N: [], W: [], E: [{ a0: 70, a1: 88, z0: 0, z1: 36 }, { a0: 40, a1: 52, z0: 16, z1: 24 }, { a0: 106, a1: 118, z0: 16, z1: 24 }] },
  });
}

function h10Jetty(Q: Quad[]): void {
  const { W, D, rez, jetty } = H10;
  // l'ombre sous l'encorbellement (le dessous du plancher entre les solives)
  Q.push(quad([0, D + 0.5, rez], [UW, 0, 0], [0, 0, 4], [0, 1, 0], part('sous-face', 1, 'o', 'none', { cast: false }), () => '@'));
  for (let x = 2; x + 4 <= UW; x += 10) Q.push(...at(jettyJoistModel(), x, D + jetty - 24, rez));
  // le plancher, au-dessus des solives, jusqu'au nu de l'étage
  Q.push(...box(0, UW, 0, UD, rez + 4, H10.floor, part('plancher', 4, 'K', 'full'), (s, t, c) => (c.face === 'top' ? planks()(s, t, c) : '%')));
  void W;
}

function h10Stable(Q: Quad[], B: Board[], roof = true): void {
  // l'écurie de la cour : le mur du fond de pierre, quatre stalles, les poteaux, le toit de tuiles à deux pans
  const x0 = 8, x1 = 136, P = part('mur', 2, '~', 'full');
  const f = rubble(1031, x1 - x0, 48, 'lime');
  Q.push(...box(x0, x1, 0, 8, 0, 48, P, onFace(f, true, x0, x1 - x0, 48)));
  for (let k = 0; k < 4; k++) Q.push(...at(stallModel(), x0 + 32 * k, 9));
  for (const x of [x0, 50, 93, x1 - 3]) Q.push(...box(x, x + 3, 76, 80, 0, 48, part('poteau', 5, 'K', 'full'), timber(1040 + x)));
  Q.push(...box(x0, x1, 76, 80, 48, 52, part('sablière', 6, 'K', 'full'), timber(1039)));
  if (roof) gableRoof(Q, { axis: 'x', a0: x0, a1: x1, b0: 0, b1: 80, z: 52, pitch: 45, eave: 5, gable: [4, 4], thick: 2, cover: 'tiles', seed: 1051 });
  Q.push(...at(troughModel(), 60, 106));
  B.push(prop('hay-bale', 140, 30), prop('bucket-water', 104, 110), prop('sack', 146, 52));
}

function h10Outside(frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], X = H10.X, { D, t, top } = H10;
  const H: Quad[] = [];
  h10Rez(H);
  for (const [k, h] of H10_REZ_HOLES.entries()) {
    if (h.z0 === 0) { doorPlane(H, h.a0, h.a1, D - 2, 36, doorTex(13, h.a1 - h.a0)); B.push(threshold(X + h.a0 - 3, X + h.a1 + 3, D)); }
    else { darkBay(H, h.a0, h.a1, D - 2, h.z0, h.z1); sill(H, h.a0 - 1, h.a1 + 1, D, h.z0, 6); B.push(openShutter(X + h.a0, D, h.z0)); }
    woodLintel(H, h.a0 - 3, h.a1 + 3, D - t, D, h.z1, 1020 + k);
  }
  h10Jetty(H);
  const UB: Board[] = [];
  closeStudFace(H, UB, UD, 0, UW);
  // les murs de l'étage, au nord et aux pignons (la tranche seule se voit) : un pan de bois chaulé de 15 cm
  const wp = part('pan de bois', 3, 'K', 'full');
  H.push(...box(0, UW, 0, 3, H10.floor, top, wp, furnWood(1061)), ...box(0, 3, 3, UD - 3, H10.floor, top, wp, furnWood(1063)), ...box(UW - 3, UW, 3, UD - 3, H10.floor, top, wp, furnWood(1065)));
  const st: [number, number, number, number][] = [[0, 16, 76, 92], [220, 236, -1, 11]];
  gableRoof(H, { axis: 'x', a0: 0, a1: UW, b0: 0, b1: UD, z: top, pitch: H10.pitch, eave: 6, gable: [4, 4], thick: 2, cover: 'tiles', seed: 1071, holes: st });
  for (const [k, [x0, x1, y0, y1]] of st.entries()) stack(H, x0, x1, y0, y1, 140, 222, onFace(rubble(1081 + k, x1 - x0, 222, 'lime'), true, x0, x1 - x0, 222));
  Q.push(...at(H, X, 0));
  B.push(...UB.map((b) => moveBoard(b, X, 0)));
  h10Stable(Q, B);
  void frame;
  return { quads: Q, boards: B, floor: [0, X - 2, 0, UD] };
}

function h10Inside(level: 0 | 1, frame: number): Built {
  const Q: Quad[] = [], B: Board[] = [], X = H10.X, { W, D, t, floor } = H10;
  const H: Quad[] = [], HB: Board[] = [];
  const sx = 156, sy = 30; // l'escalier : x 156-174, du palier (y 30) au pied (y 90)
  const P = part('mur', 2, '~', 'full');
  const plaster = limePlaster(1009);
  const inner: Tex = (_s, _t, c) => plaster(c.p[0] + c.p[1], c.p[2], c);
  if (level === 0) {
    h10Rez(H, 14);
    for (const [x0, x1] of [[112, 120], [176, 184]] as const) wallRun(H, false, t, D - t, x0, x1, 0, H10.rez, [{ a0: 100, a1: 118, z0: 0, z1: 36 }], P, { top: rubbleSection(1011, 'lime'), side: inner });
    H.push(...at(stairModel(), sx, sy));
    H.push(quad([184, t, 0.02], [W - t - 184, 0, 0], [0, D - 2 * t, 0], [0, 0, 1], part('dalles', 0, '~', 'none', { cast: false }), flagstones(9), 'top'));
    H.push(...hearth(frame, 3, t, 60));
    H.push(...box(t + 16, t + 22, 59, 105, 30, 34, part('manteau', 7, 'K', 'full'), timber(49)));
    H.push(...box(t, t + 16, 62, 102, 34, H10.rez, part('hotte', 6, '~', 'full'), limePlaster(1013)));
    HB.push(
      prop('table', 40, 30), prop('bench', 41, 50), prop('barrel', 14, 116), prop('jar', 30, 128), prop('jar', 40, 132), prop('bucket-water', 60, 14),
      prop('inner-door', 112, 100, 1), prop('inner-door', 176, 100, 1), prop('cottage-door', W - 6, 70, 1), prop('sack', 124, 128),
      piece('iron-bound-chest', 222, 13), coqBoard(writingDesk(), 196, 56, 18, 12), coqBoard(highChair(), 198, 70, 11, 10), piece('chair', 228, 60, 1),
      prop('lantern', 200, 54, 0, 15), prop('chest', 190, 126),
    );
    Q.push(...at(H, X, 0));
    B.push(...HB.map((b) => moveBoard(b, X, 0)));
    h10Stable(Q, B, false);
    return { quads: Q, boards: B, floor: [X + t, X + 184, t, D - t] };
  }
  // l'étage : le plancher percé de la trémie, la façade sud coupée, les cloisons de pan de bois, le vide sous la coupe
  const pp = part('plancher', 1, '&', 'full'), pl = { top: planks(), side: planks() };
  const [wx0, wx1, wy0, wy1] = [sx, sx + STAIR.w, sy, sy + STAIR.d];
  H.push(...box(0, UW, 0, wy0, H10.rez, floor, pp, pl), ...box(0, UW, wy1, UD, H10.rez, floor, pp, pl));
  H.push(...box(0, wx0, wy0, wy1, H10.rez, floor, pp, pl), ...box(wx1, UW, wy0, wy1, H10.rez, floor, pp, pl));
  H.push(...box(0, UW, D - t, UD, 0, H10.rez, part('vide', 3, 'o', 'none', { cast: false }), () => VOID));
  H.push(...dimmed(at(stairModel(), sx, sy)));
  const UBs: Board[] = [];
  closeStudFace(H, UBs, UD, 0, UW, floor + 14);
  // le mur nord et les pignons de l'étage : colombage, le dedans chaulé ; les cloisons de pan de bois (x 112 et 176)
  const wallTex: Tex = (s, tt, c) => (c.face === 'top' ? '*' : (Math.floor(c.p[0] + c.p[1]) % 16 < 4 ? timber(1091)(s, tt, c) : plaster(c.p[0] + c.p[1], c.p[2], c)));
  H.push(...box(0, UW, 0, 3, floor, H10.top, part('pan de bois', 3, 'K', 'full'), wallTex));
  H.push(...box(0, 3, 3, UD - 3, floor, H10.top, part('pan de bois', 3, 'K', 'full'), wallTex), ...box(UW - 3, UW, 3, UD - 3, floor, H10.top, part('pan de bois', 3, 'K', 'full'), wallTex));
  for (const x of [112, 176]) wallRun(H, false, 3, UD - 3, x, x + 3, floor, H10.top, [{ a0: 100, a1: 118, z0: floor, z1: floor + 36 }], part('cloison', 3, 'K', 'full'), wallTex);
  // le garde-corps de la trémie
  const gp = part('garde-corps', 8, 'K', 'thin'), fw = furnWood(29);
  H.push(...box(wx0 - 1, wx0 + 1, wy0, wy1, floor + 17, floor + 19, gp, fw), ...box(wx0 - 1, wx1, wy1 - 1, wy1 + 1, floor + 17, floor + 19, gp, fw));
  for (let y = wy0 + 2; y < wy1; y += 6) H.push(...box(wx0 - 0.5, wx0 + 0.5, y, y + 1, floor, floor + 17, gp, fw));
  // la cheminée de la salle, au mur nord : deux jambages de pierre, le manteau, la hotte chaulée ; le conduit de la cuisine au pignon
  const fp = part('cheminée', 5, '~', 'full'), fs = limeMasonry(1093, () => [true, true]);
  for (const x of [214, 238]) H.push(...box(x, x + 4, 3, 13, floor, floor + 22, fp, fs));
  H.push(...box(213, 243, 3, 14, floor + 22, floor + 26, part('manteau', 6, 'K', 'full'), timber(1095)));
  H.push(...box(216, 240, 3, 11, floor + 26, H10.top, fp, limePlaster(1097)));
  H.push(quad([218, 3.5, floor], [20, 0, 0], [0, 0, 22], [0, 1, 0], part('contrecœur', 0.5, 'o', 'none'), (_s, tt) => (tt > 15 ? 'o' : '@')));
  H.push(...box(3, 11, 76, 100, floor, H10.top, part('conduit', 4, '~', 'full'), limePlaster(1099)));
  const up = (b: Board) => lift(b, floor);
  HB.push(...[
    prop('bed', 14, 12), prop('bed', 50, 12), prop('chest', 86, 12), prop('stool', 90, 60),
    prop('bed', 120, 12), prop('chest', 120, 108, 1),
    prop('table', 200, 70), prop('bench', 201, 90), piece('chair', 204, 60), piece('chair', 230, 60), prop('chest', 236, 128, 1),
    prop('inner-door', 112, 100, 1), prop('inner-door', 176, 100, 1),
  ].map(up), ...UBs);
  Q.push(...at(H, X, 0));
  B.push(...HB.map((b) => moveBoard(b, X, 0)));
  return { quads: Q, boards: B };
}

const h10: VillageHouse = {
  id: 'h10-maquignon', size: [H10.X + UW + 4, UD + 12], levels: 2, palette,
  pieces: ['close-stud-panel', 'jetty-joist', 'wooden-stair', 'iron-bound-chest', 'horse-stall', 'water-trough', 'chair'],
  outside: (o, frame = 0) => place(h10Outside(frame), H10.AT, o),
  inside: (o, level = 0, frame = 0) => place(h10Inside(level, frame), H10.AT, o),
};

// =====================================================================================================================
// Les exports
// =====================================================================================================================

export const HOUSES: VillageHouse[] = [h2, h8, h9, h10];

/** Ce que la planche écrit sous chaque maison (le foyer, la forme), et où Xéros se tient (px de la scène) pour l'échelle. */
export const HOUSE_NOTES: Record<string, { lines: string[]; xeros: [number, number]; frame: [number, number] }> = {
  'h2-tisserand': { lines: [HOUSE_META['h2-tisserand'].foyer, 'maison-bloc, pierre brute a la terre, bardeaux a 45 deg', 'la grande baie de toile huilee au pignon sud'], xeros: [150, 150], frame: [70, 80] },
  'h8-meunier': { lines: [HOUSE_META['h8-meunier'].foyer, 'maison-bloc a etage, moellons enduits, angles et baies en pierre de taille, laves', 'une seule fenetre vitree ; la cour fermee, l ecurie, le porche'], xeros: [200, 190], frame: [215, 90] },
  'h9-forgeron': { lines: [HOUSE_META['h9-forgeron'].foyer, 'moellons a la chaux, tuiles plates, la souche au pignon ouest', 'pentures, grille, anneau, grattoir, girouette'], xeros: [124, 160], frame: [100, 82] },
  'h10-maquignon': { lines: [HOUSE_META['h10-maquignon'].foyer, 'rez de pierre a la chaux, etage en colombage serre en encorbellement', 'deux fenetres vitrees, tuiles a 50 deg ; l ecurie a quatre stalles'], xeros: [176, 150], frame: [320, 106] },
};

export type { HouseId, Mortar, Palette };
