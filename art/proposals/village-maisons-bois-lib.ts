// PROPOSITION (hors jeu, jamais chargée par le jeu) : la boîte à outils des maisons de bois du village (CADRAGE-village.md, travail
// 2 : h1, h3, h4, h5, h6, h7, h11). Elle généralise le modèle en volumes de la maison de Xéros (art/proposals/maison-xeros.ts,
// `houseQuads`, validé par Grégoire : « parfait, j'adore ») sans le changer : même solin de pierres brutes du jeu, même ossature
// (traverse basse, poteaux 20 × 20 tous les 1,60 m, sablières), mêmes remplissages (art/lib/volumes.ts : torchis, chaux), même chaume,
// même faîtage de terre, mêmes portes ; ce qui s'ajoute :
//   - la hauteur des murs (`T`, le dessus de la sablière), l'âge du bois (patiné ou vieux), les poteaux ronds (des perches) ;
//   - d'autres remplissages : torchis brut, chaux écaillée, croix de Saint-André, bardage de planches, pierre (le bas de l'étable) ;
//   - d'autres baies : la porte d'atelier à deux battants, la porte d'étable coupée en deux ;
//   - d'autres toits : chaume mince (une couche), chaume vieux et moussu, bardeaux, croupes (quatre pans), le trou de fumée au faîte,
//     un débord de pignon réglable (l'avancée sur la rue), les appentis de planches ;
//   - d'autres pignons : torchis brut, chaux écaillée, à croix, à gerbière.
// La maison se modèle dans son repère (le faîtage est-ouest, x vers l'est, y vers le sud, l'origine sur l'axe du poteau nord-ouest),
// puis se tourne dans le monde (un quart de tour pour un faîtage nord-sud) et se pose où l'on veut : `placeScene`.
//
// Les couleurs : uniquement des signes de la palette du monde (art/palette.ts) : le bois patiné `^ * % & @` (la palette de la maison de
// Xéros, `PAL`), le bois vieux `{ } [ ] |` (la rampe `woodAges.old`, déjà dans la palette du monde pour le pont) ; le fer (`iron`)
// et la terre cuite (`terracotta`) n'existent que dans la palette des pièces (`PIECE_PAL`) : dans les faces d'une maison, ils passent
// en « #rrggbb » (`foreign`), que le rendu de l'essai (`render` de maison-xeros.ts) accepte. Ainsi une scène se rend avec n'importe
// quelle maison à côté (la rue du sud) : chaque face porte sa couleur.

import type { Grid, Palette } from '../lib/canvas';
import { sources } from '../index';
import { stonePalette } from '../items/stones';
import { gameImage } from '../lib/walls';
import { iron, terracotta, woodAges } from '../palette';
import {
  add, box, crop, darker, dash, daub, doorTex, earthRidge, gableTex, hash, len, lumps, mul, part, polyPrism, prism, renderPiece,
  rotP, rotQuads, rotRect, rotV, slabTex, sub, thatchEave, thatchSlope, timber, unit, voidTex, withGroundShadow,
  type Board, type Outline, type Part, type Quad, type Rot, type Scene, type Tex, type V3,
} from '../lib/volumes';
export type { Board };
import { wallKit } from './walls-high';
import { masonry } from './forge';
import { PAL as XPAL } from './maison-xeros';
import { formView } from '../../src/world/natural';
import { variantImage } from '../../src/content/views';
import propsJson from '../../src/content/props.json';

export { masonry };

// =====================================================================================================================
// Les palettes, l'âge du bois
// =====================================================================================================================

/** La palette des faces des maisons : celle de l'essai de la maison de Xéros (le monde, la pierre fraîche, le bois patiné). */
export const PAL: Palette = XPAL;
/** La palette des pièces nouvelles dessinées seules : celle des maisons, le fer et la terre cuite en plus. */
export const PIECE_PAL: Palette = { ...stonePalette, ...woodAges.worn, ...iron, ...terracotta };

export type Age = 'worn' | 'old';
/** Le bois vieux : les signes de la rampe `woodAges.old` dans la palette du monde (le pont de bois, art/palette.ts). */
const OLD_SIGN: Record<string, string> = { '^': '{', '*': '}', '%': '[', '&': ']', '@': '|' };
/** Une texture de bois travaillé à un âge : le patiné tel quel, le vieux par ses signes. */
export function aged(tex: Tex, age: Age): Tex {
  if (age === 'worn') return tex;
  return (s, t, c) => {
    const k = tex(s, t, c);
    return k !== null && OLD_SIGN[k] ? OLD_SIGN[k] : k;
  };
}
/** Une grille au bois vieux. */
export const agedGrid = (g: Grid, age: Age): Grid => (age === 'worn' ? g : g.map((r) => [...r].map((c) => OLD_SIGN[c] ?? c).join('')));

/** Les signes que la palette des maisons n'a pas (le fer, la terre cuite) passent en couleur. */
export function foreign(quads: Quad[]): Quad[] {
  const hexOf = (k: string) => (!k.startsWith('#') && PAL[k] === undefined && PIECE_PAL[k] ? PIECE_PAL[k] : k);
  return quads.map((q) => ({
    ...q,
    part: q.part.dark && hexOf(q.part.dark) !== q.part.dark ? { ...q.part, dark: hexOf(q.part.dark) } : q.part,
    tex: (s, t, c) => {
      const k = q.tex(s, t, c);
      return k !== null && !k.startsWith('#') && PAL[k] === undefined && PIECE_PAL[k] ? PIECE_PAL[k] : k;
    },
  }));
}

// =====================================================================================================================
// Les images du jeu
// =====================================================================================================================

export type Img = { grid: Grid; pal: Palette };
const byName = new Map(sources.map((s) => [s.name, s]));
export const has = (k: string) => byName.has(k);
/** Une image du jeu (la `frame`-ième image d'une planche). */
export function img(name: string, frame = 0): Img {
  const s = byName.get(name);
  if (s?.kind === 'image') return { grid: s.grid, pal: s.palette };
  if (s?.kind === 'spritesheet') {
    const fr = Object.values(s.animations)[0].frames;
    return { grid: fr[frame % fr.length], pal: s.palette };
  }
  throw new Error(`village-maisons-bois : pas d'image « ${name} »`);
}
type PropDef = { image: string; views: never; aged?: boolean; dims: { w: number; d: number; h: number } };
const props = propsJson as unknown as Record<string, PropDef>;
/** L'image du jeu d'un objet dans sa vue, à l'âge de la maison s'il prend l'âge. */
export function propImg(key: string, view = 0, age: Age = 'worn', frame = 0): Img {
  const def = props[key];
  if (!def) throw new Error(`village-maisons-bois : pas d'objet « ${key} »`);
  const k = formView(variantImage(def.image, undefined), def.views, view, undefined, has);
  return img(def.aged && has(`${k}-${age}`) ? `${k}-${age}` : k, frame);
}
/** Une image posée comme le jeu pose un objet : centrée sur son emprise (x0–x1, px), son bas au bord sud y relevé de z ; profondeur y. */
export function placeImg(o: Img, x0: number, x1: number, ySouth: number, z = 0, depth = ySouth): Board {
  const w = o.grid[0].length;
  return { grid: o.grid, pal: o.pal, x: Math.round((x0 + x1) / 2 - w / 2), y: Math.round(ySouth - z) - o.grid.length, depth: () => depth };
}
/** Un objet de props.json posé en cm (x0, y0 : le coin nord-ouest de son emprise dans sa vue), dans le repère de la maison. */
export function prop(key: string, x0: number, y0: number, view = 0, age: Age = 'worn', z = 0, frame = 0): Board {
  const d = props[key].dims, [w, dd] = view % 2 ? [d.d, d.w] : [d.w, d.d];
  return placeImg(propImg(key, view, age, frame), x0 / 5, (x0 + w) / 5, (y0 + dd) / 5, z / 5);
}
/** Les dimensions d'un objet du jeu (cm). */
export const propDims = (key: string) => props[key].dims;

// =====================================================================================================================
// Géométrie
// =====================================================================================================================

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Une face plane (parallélogramme o, u, v), sa normale tournée vers le haut (ou vers le sud si elle est debout). */
export function face(o: V3, u: V3, v: V3, p: Part, tex: Tex, f: Quad['face'] = 'slope'): Quad {
  let n = unit(cross(u, v));
  if (n[2] < -1e-6 || (Math.abs(n[2]) < 1e-6 && n[1] < 0)) n = mul(n, -1);
  return { o, u, v, n, part: p, tex, face: f };
}
/** Un cylindre le long de a → b, rayon r, `n` pans ; les bouts en disques (le carré masqué). */
export function cylinder(a: V3, b: V3, r: number, p: Part, side: Tex, cap: Tex, n = 10): Quad[] {
  const ax = sub(b, a), A = unit(ax);
  const ref: V3 = Math.abs(A[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const e1 = unit(cross(A, ref)), e2 = cross(A, e1);
  const Q: Quad[] = [];
  const w = 2 * r * Math.tan(Math.PI / n);
  for (let k = 0; k < n; k++) {
    const ang = ((k + 0.5) / n) * Math.PI * 2;
    const nr = add(mul(e1, Math.cos(ang)), mul(e2, Math.sin(ang)));
    const tg = add(mul(e1, -Math.sin(ang)), mul(e2, Math.cos(ang)));
    const c0 = add(add(a, mul(nr, r * Math.cos(Math.PI / n))), mul(tg, -w / 2));
    Q.push({ o: c0, u: ax, v: mul(tg, w), n: nr, part: p, tex: side, face: 'edge' });
  }
  for (const [c, nn] of [[a, mul(A, -1)], [b, A]] as [V3, V3][]) {
    const o = add(add(c, mul(e1, -r)), mul(e2, -r));
    const capT: Tex = (s, t, cx) => (Math.hypot(s - r, t - r) > r ? null : cap(s, t, cx));
    Q.push({ o, u: mul(e1, 2 * r), v: mul(e2, 2 * r), n: nn, part: p, tex: capT, face: 'cap' });
  }
  return Q;
}
/** Des faces déplacées ; leurs textures lisent toujours leur point dans le repère d'avant (comme forge-logis.ts). */
export const moveQuads = (qs: Quad[], [dx, dy, dz]: V3): Quad[] =>
  qs.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2] + dz] as V3, tex: (s, t, c) => q.tex(s, t, { ...c, p: [c.p[0] - dx, c.p[1] - dy, c.p[2] - dz] }) }));
export const moveBoard = (b: Board, dx: number, dy: number): Board => ({ ...b, x: b.x + dx, y: b.y + dy, depth: (r) => b.depth(r) + dy });

/** Les quatre vues d'une pièce (r0 à r3, un quart de tour de plus dans le sens des aiguilles d'une montre), comme le jeu les tire. */
export const VIEW_ROT: Rot[] = [0, 3, 2, 1];
/** Une pièce rendue seule dans sa vue : `k` 1 pour une pièce de bâtiment (`ground`), ½ pour un meuble (son ombre portée dessous). */
export function pieceView(model: (v: number) => Quad[], v: number, k: 1 | 0.5): Grid {
  const g = renderPiece(rotQuads(model(v), VIEW_ROT[v], [0, 0]), { k });
  return k === 1 ? g : withGroundShadow(g);
}
export { crop };

// =====================================================================================================================
// Matières nouvelles (des signes de la palette)
// =====================================================================================================================

/** Le bois rond des perches (poteaux de la guérisseuse) : l'écorce, le clair à gauche, l'ombre à droite ; la coupe en bois de bout. */
export function bark(seed: number): Tex {
  return (s, t, c) => {
    if (c.face === 'top' || c.face === 'cap') return c.w < 6 ? '*' : '%';
    const across = c.h > c.w ? s / c.w : t / c.h, along = c.h > c.w ? t : s;
    const k = across < 0.4 ? 'M' : across < 0.8 ? 'm' : 'N';
    return dash(seed, Math.floor(across * 4), Math.floor(along), 0.35) ? darker(k) : k;
  };
}

/** Le bardage de planches debout (la grange, art/lib/board-wall.ts) : planches de 30 cm, couvre-joint clair, joint, fil, bas mouillé. */
export function boardsTex(seed: number, pitch = 6): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return '%';
    const col = ((i % pitch) + pitch) % pitch, plank = Math.floor(i / pitch);
    let k: string;
    if (col === 0) k = '@';
    else if (col === 1) k = '^';
    else if (col === 2) k = '%';
    else k = dash(seed + plank, col, j, 0.45) ? '%' : '*';
    if (hash(seed, plank, 3) < 0.25 && col > 2 && j === 6 + Math.floor(hash(seed, plank, 4) * Math.max(1, c.h - 12))) k = '&'; // un nœud
    if (j < 2) k = darker(k);
    return k;
  };
}

/** La chaux écaillée : le badigeon tombé par plaques, le torchis qui se voit dessous, le bord de la chaux d'un trait d'ombre. */
export function flakingTex(seed: number): Tex {
  const lime = daub(seed, true), raw = daub(seed + 1, false);
  return (s, t, c) => {
    if (c.face === 'top') return lime(s, t, c);
    // des plaques : trois ou quatre centres par pan, de 3 à 6 px, bords dentelés
    let inside = false, rim = false;
    for (let k = 0; k < 4; k++) {
      if (hash(seed, k, 9) < 0.25) continue;
      const cx = hash(seed, k, 1) * c.w, cy = 3 + hash(seed, k, 2) * Math.max(1, c.h - 6), r = 2.5 + hash(seed, k, 3) * 3.5;
      const d = Math.hypot((s - cx) * 1.1, t - cy) + (hash(seed, Math.floor(s), Math.floor(t), k) - 0.5) * 1.6;
      if (d < r) inside = true;
      else if (d < r + 0.9) rim = true;
    }
    if (inside) return raw(s, t, c);
    const k = lime(s, t, c);
    return rim && k !== null ? ';' : k;
  };
}

/**
 * Le remplissage chaulé à croix de Saint-André : deux écharpes de bois (20 × 15 cm) d'angle en angle, posées avant les palançons,
 * la chaux dans les quatre triangles. Le bois de l'écharpe : le bord du haut éclairé, le bas à l'ombre.
 */
export function crossTex(seed: number, age: Age): Tex {
  const lime = daub(seed, true);
  const wood = aged((s, t, c) => {
    const L = Math.hypot(c.w, c.h);
    const d1 = (t * c.w - s * c.h) / L, d2 = (t * c.w - (c.w - s) * c.h) / L;
    const d = Math.abs(d1) < Math.abs(d2) ? d1 : d2;
    if (d > 0.9) return '^';
    if (d < -0.9) return '%';
    return dash(seed, 0, Math.floor(s + t), 0.4) ? '%' : '*';
  }, age);
  return (s, t, c) => {
    if (c.face === 'top') return lime(s, t, c);
    const L = Math.hypot(c.w, c.h);
    const d1 = Math.abs(t * c.w - s * c.h) / L, d2 = Math.abs(t * c.w - (c.w - s) * c.h) / L;
    if (Math.min(d1, d2) < 1.6) return wood(s, t, c);
    if (Math.min(d1, d2) < 2.4) return ';'; // l'ombre de l'écharpe sur la chaux
    return lime(s, t, c);
  };
}

/** Le chaume vieux et moussu : la paille grisée (torchis, pierre), des plaques de mousse vert sombre, plus nombreuses vers le bas. */
export function mossyThatch(seed: number): Tex {
  const base = thatchSlope(seed);
  const GREY: Record<string, string> = { Y: 'D', t: 'E', T: 'z', P: 'Z' };
  return (s, t, c) => {
    const k = base(s, t, c);
    if (k === null) return k;
    // la mousse : de petites touffes posées au bas des rangs (là où l'eau reste), plus nombreuses vers l'égout et au nord
    const m = lumps(seed + 40, s / 1.4, t / 1.1);
    const wet = 0.12 + 0.16 * (1 - Math.min(1, t / Math.max(1, c.h)));
    if (m.id < wet && m.e > 0.45 && (k === 'T' || k === 'P' || m.id < wet * 0.5)) return k === 'P' ? 'k' : m.dy > 0.3 ? 'L' : 'l';
    // la paille grisée : un grand voile, par plaques douces (le vieux chaume n'est plus jaune)
    const g = lumps(seed + 60, s / 5, t / 4);
    if (g.id < 0.86 && k !== 'Y') return GREY[k] ?? k;
    return k === 'Y' && hash(seed, Math.floor(s), Math.floor(t), 2) < 0.6 ? 'D' : k;
  };
}
/** L'égout du chaume vieux : la tranche grisée, effilochée. */
export function mossyEave(seed: number): Tex {
  const base = thatchEave(seed);
  const GREY: Record<string, string> = { t: 'E', T: 'z', P: 'Z' };
  return (s, t, c) => {
    const k = base(s, t, c);
    return k === null ? k : hash(seed, Math.floor(s / 3)) < 0.6 ? GREY[k] ?? k : k;
  };
}
/** Le faîtage de terre vieux : l'herbe partout, une touffe de joubarbe (rosettes vert clair, cœur rouge). */
export function mossyRidge(seed: number): Tex {
  const base = earthRidge(seed);
  return (s, t, c) => {
    const k = base(s, t, c);
    if (k === null) return k;
    const i = Math.floor(s), nz = c.n[2];
    // les rosettes de joubarbe : deux touffes
    for (const x0 of [Math.floor(c.w * 0.3), Math.floor(c.w * 0.72)]) {
      const dx = i - x0;
      if (Math.abs(dx) <= 1 && nz > 0.9) return dx === 0 ? 'c' : 'j';
      if (dx === 0 && nz > 0.6) return 'L';
    }
    if (nz > 0.9 && hash(seed, i >> 1, 7) < 0.35) return hash(seed, i, 8) < 0.4 ? 'g' : 'v';
    return k;
  };
}

/** Le chaume en une couche (journaliers) : rangs plus clairsemés, la latte qui se devine entre deux rangs. */
export function thinThatch(seed: number): Tex {
  const base = thatchSlope(seed);
  return (s, t, c) => {
    const k = base(s, t, c);
    if (k === 'P' && hash(seed, Math.floor(s / 2), Math.floor(t)) < 0.35) return 'N';
    // la paille d'une seule couche, mal peignée : moins de lumière, plus d'ombre entre les brins
    if (k === 'Y' && hash(seed, Math.floor(s), Math.floor(t), 3) < 0.6) return 't';
    if (k === 't' && hash(seed, Math.floor(s), Math.floor(t), 4) < 0.25) return 'T';
    return k;
  };
}

/** Les bardeaux de chêne fendu (art/world/forge-roofs.ts, à l'identique, en signes du bois) ; `K` : px d'écran par px de pente. */
export function shinglesTex(K: number): Tex {
  const edges = (r: number): number[] => {
    const out: number[] = [];
    let a = -Math.floor(hash(411, r) * 4);
    while (a < 400) { out.push(a); a += 2 + Math.floor(hash(412, r, a) * 3); }
    return out;
  };
  const cache = new Map<number, number[]>();
  return (s, t) => {
    const d = t * K, r = Math.floor(d / 4), yy = d - r * 4, i = Math.floor(s);
    if (!cache.has(r)) cache.set(r, edges(r));
    const es = cache.get(r)!, k = es.filter((a) => a <= i).length;
    const h = hash(413, r, k);
    if (yy >= 3) return '&';
    if (es.includes(i)) return yy < 1 ? '&' : '%';
    if (yy < 1) return h < 0.25 ? '*' : '^';
    if (hash(414, i, r) < 0.25) return '%';
    return h < 0.2 ? '%' : '*';
  };
}

/** Les planches d'un pan d'appentis (couvre-joints de 25 cm), dans le sens de la pente. */
export function planksRoof(seed: number): Tex {
  return (s, t, c) => {
    if (c.face !== 'slope') return '%';
    const i = Math.floor(s), j = Math.floor(t);
    if (i % 5 === 0) return '@';
    if (i % 5 === 1) return '^';
    return hash(seed, i, Math.floor(j / 4)) < 0.15 ? '%' : '*';
  };
}

/**
 * Un vantail de planches (porte d'atelier, d'étable) : planches debout de 20 à 25 cm, joints, les chevilles de deux traverses,
 * le bas mouillé ; `split` : la porte coupée en deux à cette hauteur (un trait sombre, le loquet du haut) ; `latch` : le loquet.
 */
export function leafTex(seed: number, w: number, opts: { split?: number; latch?: 'left' | 'right' } = {}): Tex {
  const joints: number[] = [];
  for (let x = 4; x < w - 1; x += hash(seed, x) < 0.5 ? 4 : 5) joints.push(x);
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    if (c.face === 'top') return '^';
    if (joints.includes(i)) return '@';
    let k = joints.includes(i - 1) || i === 0 ? '^' : '*';
    if (k === '*' && dash(seed, i, j, 0.6)) k = '%';
    if (opts.split !== undefined && (j === opts.split || j === opts.split - 1)) return j === opts.split ? '@' : '&';
    const rails = opts.split !== undefined ? [5, opts.split - 5, opts.split + 4, h - 6] : [6, h - 8];
    if (rails.includes(j) && i % 4 === 2) k = '@';
    if (opts.latch) {
      const lx = opts.latch === 'right' ? w - 4 : 2, ly = opts.split !== undefined ? opts.split + 3 : 17;
      if ((i === lx || i === lx + 1) && j === ly) k = '&';
    }
    return j < 2 ? darker(k) : k;
  };
}

/** Le dedans d'un vantail : les planches, deux traverses et l'écharpe. */
export function leafInsideTex(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), h = c.h, w = c.w;
    if (c.face === 'top') return '^';
    const rail = (y: number) => Math.abs(t - y) < 1.5;
    if (rail(5) || rail(h - 7)) return Math.abs(t - (rail(5) ? 5 : h - 7)) < 0.5 ? '^' : '%';
    const diag = Math.abs((t - 6) - ((s / w) * (h - 13))) < 1.3;
    if (diag) return '*';
    return i % 5 === 0 ? '@' : dash(seed, i, j, 0.5) ? '%' : '&';
  };
}

/** Le fer (art/proposals/forge.ts), en signes de la palette des pièces : le dessus poli, l'ouest au jour, l'est à l'ombre. */
export const ironTex: Tex = (_s, t, c) => {
  if (c.face === 'top' || c.face === 'cap') return '(';
  if (c.face === 'W') return ')';
  if (c.face === 'S' || c.face === 'slope') return t < c.h * 0.45 ? '<' : ')';
  if (c.face === 'edge') return c.n[0] < -0.2 || c.n[2] > 0.5 ? ')' : '<';
  return '<';
};

// =====================================================================================================================
// La maison en pan de bois, paramétrée
// =====================================================================================================================

export type Fill = 'lime' | 'daub' | 'flaking' | 'cross' | 'boards' | 'stone';
export type Bay = 'plain' | 'door' | 'window' | 'inner-door' | 'twin-door' | 'stable-door' | 'open';
export type Side = 'S' | 'N' | 'E' | 'W';
/**
 * Un pan de mur (comme `WallLine` de maison-xeros.ts) : est-ouest ou nord-sud (`ew`), sur l'axe `c`, ses poteaux, ses travées, le
 * côté du dehors ; `fill` : son remplissage (sinon celui de la maison) ; `fills` : travée par travée ; `base` : un mur de pierre sous
 * la traverse basse jusqu'à cette hauteur (px), au lieu du solin de 40 cm ; `nofill` : une cloison sans remplissage (la pierre la fait).
 */
export interface Wall {
  side?: Side; ew: boolean; c: number; posts: number[]; bays: Bay[]; out: 1 | -1; ends?: [boolean, boolean];
  fill?: Fill; fills?: (Fill | undefined)[]; base?: number;
}
export type Cover = 'thatch' | 'thatch-thin' | 'thatch-mossy' | 'shingles';
export type GableKind = Fill | 'loft' | 'none';
export interface RoofSpec {
  cover: Cover;
  pitch: number;
  /** Les croupes : quatre pans, sans pignon. */
  hip?: boolean;
  /** Le débord des rives au-delà des pignons, ouest et est (px) ; celui de l'égout au-delà de l'axe des murs. */
  over?: [number, number];
  eave?: number;
  /** Les pignons, ouest et est. */
  gables?: [GableKind, GableKind];
  /** Les trous de fumée au faîte (x des axes) ; `gableHole` : le trou du pignon ouest (celui de la maison de Xéros). */
  smoke?: number[];
  gableHole?: boolean;
  /** Le chaume relevé au-dessus de la porte (croupes) : de x0 à x1 l'égout sud remonte jusqu'au mur. */
  notch?: [number, number];
}
export interface HouseSpec {
  L: number; D: number;
  /** Le dessus de la sablière (px) : 52 chez Xéros (2,60 m). */
  T: number;
  sill: number; doorW: number; innerDoorW: number;
  /** La hauteur de la porte d'entrée (px) : 36, 1,80 m. */
  doorH?: number;
  walls: Wall[];
  age: Age;
  fill: Fill;
  posts?: 'timber' | 'pole';
  /** Le seuil de calcaire devant la porte d'entrée (pas chez les journaliers). */
  threshold?: boolean;
  /** Les fermes intérieures (entraits retroussés au droit des cloisons). */
  trusses?: number[];
  roof: RoofSpec;
}

/** Les baies d'une maison : le mur, le milieu, la demi-largeur avec les huisseries, la sorte. */
export function openings(h: HouseSpec): { w: Wall; m: number; half: number; kind: Bay; k: number }[] {
  const out: { w: Wall; m: number; half: number; kind: Bay; k: number }[] = [];
  for (const w of h.walls) w.bays.forEach((b, k) => {
    if (b === 'plain' || b === 'window') return;
    const m = (w.posts[k] + w.posts[k + 1]) / 2;
    const dw = b === 'door' ? h.doorW : b === 'inner-door' ? h.innerDoorW : b === 'twin-door' ? 32 : b === 'stable-door' ? 28 : w.posts[k + 1] - w.posts[k] - 4;
    out.push({ w, m, half: dw / 2 + (b === 'open' ? 0 : 3), kind: b, k });
  });
  return out;
}

/** Le côté du monde d'un mur, une fois la maison tournée de `rot`. */
export function worldSide(side: Side, rot: Rot): Side {
  const n: V3 = side === 'S' ? [0, 1, 0] : side === 'N' ? [0, -1, 0] : side === 'E' ? [1, 0, 0] : [-1, 0, 0];
  const r = rotV(n, rot);
  return r[1] > 0.5 ? 'S' : r[1] < -0.5 ? 'N' : r[0] > 0.5 ? 'E' : 'W';
}

/** La géométrie d'un toit à deux pans (celle de la maison de Xéros, la sablière à T). */
export function roofGeom(h: HouseSpec) {
  const RAD = (h.roof.pitch * Math.PI) / 180, TAN = Math.tan(RAD), SIN = Math.sin(RAD), COS = Math.cos(RAD), H2 = h.D / 2;
  const zU = (d: number) => h.T + (H2 - d) * TAN;
  const slopePt = (side: 1 | -1, x: number, d: number, k: number): V3 => [x, H2 + side * (d + k * SIN), zU(d) + k * COS];
  const holeZ = Math.round(zU(0) - 13.2);
  return { RAD, TAN, SIN, COS, H2, zU, slopePt, holeZ };
}
/** L'épaisseur de la couverture, du dessous des chevrons : chaume plein 3–11, une couche 3–7, bardeaux 2,5–4. */
export const THICK: Record<Cover, [number, number]> = { thatch: [3, 11], 'thatch-mossy': [3, 11], 'thatch-thin': [3, 7], shingles: [2.5, 4] };

/** Le remplissage d'un pan. */
export function fillTex(kind: Fill, seed: number, age: Age): Tex {
  if (kind === 'daub') return daub(seed, false);
  if (kind === 'flaking') return flakingTex(seed);
  if (kind === 'cross') return crossTex(seed, age);
  if (kind === 'boards') return aged(boardsTex(seed), age);
  if (kind === 'stone') return masonry(seed);
  return daub(seed, true);
}

export interface FrameOpts { cut?: boolean; roof?: boolean; rot?: Rot }

/**
 * Les faces de la maison, dans son repère (la maison de Xéros généralisée, `houseQuads` de maison-xeros.ts) : ossature, remplissages,
 * baies, portes ; le toit et les pignons si `roof`. `cut` : le mur sud du monde et les cloisons est-ouest du monde coupés à 70 cm.
 */
export function frameQuads(h: HouseSpec, o: FrameOpts): Quad[] {
  const { T, sill, age } = h, rot = o.rot ?? 0;
  const Q: Quad[] = [];
  const cutZ = o.cut ? 14 : Infinity;
  const W_ = (tex: Tex) => aged(tex, age);
  const woodTex = (seed: number, pegs: [number, number][] = []) => (h.posts === 'pole' ? bark(seed) : W_(timber(seed, pegs)));
  const timberP = (name: string, prio: number) => part(name, prio, 'K', 'full', { eave: true });
  const cutW = (w: Wall) => {
    if (w.side) return worldSide(w.side, rot) === 'S';
    return w.ew === (rot % 2 === 0);
  };
  const wb = (w: Wall, a0: number, a1: number, k0: number, k1: number, z0: number, z1: number, p: Part, tex: Tex | { top: Tex; side: Tex }) => {
    if (o.cut && cutW(w) && z0 >= cutZ) return;
    if (o.cut && cutW(w)) z1 = Math.min(z1, cutZ);
    const b0 = w.c + w.out * k0, b1 = w.c + w.out * k1;
    const [c0, c1] = [Math.min(b0, b1), Math.max(b0, b1)];
    Q.push(...(w.ew ? box(a0, a1, c0, c1, z0, z1, p, tex) : box(c0, c1, a0, a1, z0, z1, p, tex)));
  };
  let seed = 100;
  const fill = (w: Wall, a0: number, a1: number, z0: number, z1: number, kind: Fill) => {
    if (a1 - a0 < 1 || z1 - z0 < 1) return;
    const sd = seed++;
    const p = part(kind === 'boards' ? 'bardage' : 'torchis', 1, kind === 'boards' ? 'K' : ';', kind === 'boards' ? 'full' : 'none', { eave: true });
    wb(w, a0, a1, -2, 2, z0, z1, p, fillTex(kind, sd, age));
  };
  const ops = openings(h);
  const doorH = h.doorH ?? 36;

  for (const w of h.walls) {
    const outer = !!w.side, last = w.posts[w.posts.length - 1];
    const start = w.ends ? w.posts[0] + 2 : w.posts[0] - 2, end = w.ends ? last - 2 : last + 2;
    const zs = w.base ?? 8, zp = zs + 4;
    const cuts = ops.filter((d) => d.w === w).map((d) => [d.m - d.half, d.m + d.half]);
    // le mur de pierre sous la traverse (l'étable), coupé aux portes
    if (w.base) {
      const S = part('mur de pierre', 3, '~', 'full', { eave: true });
      let a = start - 3, n = 0;
      for (const [g0, g1] of [...cuts, [end + 3, end + 3]]) {
        if (g0 - a > 1) wb(w, a, g0, -6, 6, 0, zs, S, masonry(500 + w.c + n++ * 7));
        a = g1;
      }
    }
    // la traverse basse, coupée aux portes
    const sole = timberP('traverse basse', 4);
    {
      let a = start, n = 0;
      for (const [g0, g1] of [...cuts, [end, end]]) { if (g0 - a > 0.5) wb(w, a, g0, -2, 2, zs, zp, sole, woodTex(11 + n++ + w.c)); a = g1; }
    }
    if (!o.cut || !cutW(w)) {
      const pegs: [number, number][] = w.posts.map((p) => [p - start, 1] as [number, number]);
      wb(w, start, end, -2, 2, T - 4, T, timberP('sablière', 7), woodTex(21 + w.c + (outer ? 0 : 500), pegs));
    }
    w.posts.forEach((p, i) => {
      if (w.ends && (i === 0 || i === w.posts.length - 1)) return;
      wb(w, p - 2, p + 2, -2, 2, zp, T - 4, timberP('poteau', 5), woodTex(31 + p + (outer ? 0 : 7 * w.c), [[2, T - 19], [1, 2]]));
    });
    w.bays.forEach((bay, b) => {
      const a0 = w.posts[b] + 2, a1 = w.posts[b + 1] - 2, m = (w.posts[b] + w.posts[b + 1]) / 2;
      const kind: Fill = w.fills?.[b] ?? w.fill ?? h.fill;
      const plainKind: Fill = kind === 'cross' ? 'lime' : kind;
      if (bay === 'plain') fill(w, a0, a1, zp, T - 4, kind);
      else if (bay === 'open') { /* une baie ouverte : rien */ }
      else if (bay === 'window') {
        const Tm = timberP('fenêtre', 6);
        wb(w, a0, a1, -2, 2, sill - 2, sill, Tm, woodTex(51 + m));
        wb(w, a0, a1, -2, 2, sill + 8, sill + 10, Tm, woodTex(52 + m));
        wb(w, m - 7, m - 5, -2, 2, sill, sill + 8, part('montant', 6, 'K', 'thin', { eave: true }), woodTex(53 + m));
        wb(w, m + 5, m + 7, -2, 2, sill, sill + 8, part('montant', 6, 'K', 'thin', { eave: true }), woodTex(54 + m));
        fill(w, a0, a1, zp, sill - 2, plainKind); fill(w, a0, a1, sill + 10, T - 4, plainKind);
        fill(w, a0, m - 7, sill, sill + 8, plainKind); fill(w, m + 7, a1, sill, sill + 8, plainKind);
        if (!o.cut) wb(w, m - 5, m + 5, -2.4, -2, sill, sill + 8, part('baie', 0, 'o', 'none'), voidTex);
      } else {
        const op = ops.find((d) => d.w === w && d.k === b)!;
        const entry = bay !== 'inner-door';
        const zb = bay === 'door' ? (h.threshold === false ? 0 : 4) : bay === 'inner-door' ? 0 : bay === 'stable-door' ? 1 : 2;
        const dh = bay === 'twin-door' ? 38 : bay === 'door' ? doorH : 36;
        const hw = op.half - 3, d0 = m - hw, d1 = m + hw;
        const top = Math.min(zb + dh, T - 7);
        for (const [j0, j1] of [[d0 - 3, d0], [d1, d1 + 3]]) wb(w, j0, j1, -2, 2, zb, T - 4, timberP('huisserie', 6), woodTex(41 + j0, [[1, T - 12], [1, 3]]));
        fill(w, a0, d0 - 3, zp, T - 4, plainKind); fill(w, d1 + 3, a1, zp, T - 4, plainKind);
        if (!o.cut || !cutW(w)) {
          wb(w, d0, d1, -2, 2, top, top + 3, timberP('linteau', 6), woodTex(45 + m));
          fill(w, d0, d1, top + 3, T - 4, plainKind);
          const P = part('porte', 3, 'K', 'full', { eave: true });
          const k0 = -1, k1 = 0;
          if (bay === 'door' || bay === 'inner-door') wb(w, d0, d1, k0, k1, zb, top, P, W_(doorTex(7 + m, d1 - d0)));
          else if (bay === 'twin-door') {
            wb(w, d0, m, k0, k1, zb, top, P, W_(leafTex(7 + m, m - d0, { latch: 'right' })));
            wb(w, m, d1, k0, k1, zb, top, part('porte', 3.1, 'K', 'full', { eave: true }), W_(leafTex(9 + m, d1 - m)));
          } else if (bay === 'stable-door') wb(w, d0, d1, k0, k1, zb, top, P, W_(leafTex(7 + m, d1 - d0, { split: 16, latch: 'right' })));
        }
        if (entry && bay === 'door' && h.threshold !== false && w.side) {
          const yo = w.c + w.out * 5;
          if (w.ew) Q.push(...box(d0 - 3, d1 + 3, Math.min(w.c, yo) - 0, Math.max(w.c, yo) + 0, 0, 4, part('seuil', 3, '~', 'full'), slabTex(3)));
          else Q.push(...box(Math.min(w.c, yo), Math.max(w.c, yo), d0 - 3, d1 + 3, 0, 4, part('seuil', 3, '~', 'full'), slabTex(3)));
        }
      }
    });
  }

  // les entraits des fermes intérieures, au droit des cloisons (on les voit sans le toit : ils portent le comble)
  if (o.roof === false || o.cut) return Q;
  return [...Q, ...(h.roof.hip ? hipRoof(h) : gableRoof(h))];
}

/** Le toit à deux pans et ses pignons (la maison de Xéros : chaume, rives, faîtage de terre ; ou bardeaux). */
export function gableRoof(h: HouseSpec): Quad[] {
  const { L, D, T, age } = h, R = h.roof;
  const Q: Quad[] = [];
  const { TAN, SIN, COS, H2, zU, slopePt, holeZ } = roofGeom(h);
  const [ovW, ovE] = R.over ?? [6, 6];
  const RX0 = -ovW, RX1 = L + ovE;
  const EAVE = H2 + (R.eave ?? 14);
  const [TH_LO, TH_HI] = THICK[R.cover];
  const dAt = (y: number, k: number) => y - k * SIN;
  const roofP = (name: string, prio: number, dark: string, outline: Outline = 'full') => part(name, prio, dark, outline, { roof: true });
  const holes = R.smoke ?? [];
  const K = SIN + COS;
  for (const side of [1, -1] as const) {
    const nrm: V3 = [0, side * SIN, COS];
    const y = H2 + side * EAVE;
    const dHi = dAt(EAVE, TH_HI), dLo = dAt(EAVE, TH_LO);
    const dTop = -TH_HI * SIN;
    const A = slopePt(side, RX0, dHi, TH_HI), B = slopePt(side, RX0, dTop, TH_HI);
    const slopeLen = len(sub(B, A));
    const isShingle = R.cover === 'shingles';
    const P = roofP(isShingle ? 'bardeaux' : 'chaume', 10, isShingle ? (age === 'old' ? '|' : '@') : 'P');
    let base: Tex = R.cover === 'thatch-mossy' ? mossyThatch(side > 0 ? 5 : 6) : R.cover === 'thatch-thin' ? thinThatch(side > 0 ? 5 : 6)
      : isShingle ? aged(shinglesTex(K), age) : thatchSlope(side > 0 ? 5 : 6);
    if (holes.length) {
      const inner = base;
      base = (s, t, c) => {
        const x = RX0 + s, top = slopeLen - t;
        for (const hx of holes) {
          const dx = Math.abs(x - hx);
          if (dx < 3.5 && top < 7) return dx > 2.5 || top > 6 ? 'P' : top < 1.2 ? 'e' : 'o';
        }
        return inner(s, t, c);
      };
    }
    Q.push({ o: A, u: [RX1 - RX0, 0, 0], v: sub(B, A), n: nrm, part: P, tex: base, face: 'slope' });
    const E0: V3 = [RX0, y, zU(dLo) + TH_LO * COS];
    const eaveTex: Tex = R.cover === 'thatch-mossy' ? mossyEave(side > 0 ? 8 : 9) : isShingle ? aged((s) => (hash(431, Math.floor(s)) < 0.3 ? '@' : '&'), age) : thatchEave(side > 0 ? 8 : 9);
    Q.push({ o: E0, u: [RX1 - RX0, 0, 0], v: [0, 0, (TH_HI - TH_LO) / COS], n: [0, side, 0], part: P, tex: eaveTex, face: 'S' });
    for (const [x, nx] of [[RX0, -1], [RX1, 1]] as const) {
      const lo = slopePt(side, x, dLo, TH_LO), hi = slopePt(side, x, dTop, TH_LO);
      Q.push({ o: lo, u: sub(hi, lo), v: mul(nrm, TH_HI - TH_LO), n: [nx, 0, 0], part: P, tex: eaveTex, face: 'edge' });
    }
  }
  // le faîtage : de terre (chaume), vieux et herbu (chaume moussu), ou de bardeaux croisés ; interrompu aux trous de fumée
  const top = zU(-TH_HI * SIN) + TH_HI * COS;
  const spans: [number, number][] = [];
  {
    let a = RX0 - 0.5;
    for (const hx of [...holes].sort((p, q) => p - q)) { spans.push([a, hx - 4]); a = hx + 4; }
    spans.push([a, RX1 + 0.5]);
  }
  for (const [x0, x1] of spans) {
    if (R.cover === 'shingles') {
      const sec: [number, number][] = [[H2 - 3.5, top - 3.5], [H2, top + 1.2], [H2 + 3.5, top - 3.5]];
      const tex: Tex = aged((s, t, c) => {
        const i = Math.floor(s), sd = c.n[1] > 0 ? 1 : 0;
        if ((i + sd * 2) % 4 === 0) return '&';
        return sd ? (Math.floor(t) === 0 ? '%' : '*') : '^';
      }, age);
      Q.push(...polyPrism(x0, x1, sec, roofP('faîtage', 11, age === 'old' ? '|' : '@'), tex));
    } else {
      const prof: [number, number][] = [[6, -6 * TAN + 0.4], [5, -3.6], [3.8, -1.2], [2.4, 0.7], [0.8, 1.7], [-0.8, 1.7], [-2.4, 0.7], [-3.8, -1.2], [-5, -3.6], [-6, -6 * TAN + 0.4]];
      const sc = R.cover === 'thatch-thin' ? 0.7 : 1;
      Q.push(...polyPrism(x0, x1, prof.map(([dy, dz]) => [H2 + dy * sc, top - (R.cover === 'thatch-thin' ? 2 : 0) + dz * sc]), roofP('faîtage', 11, 'e'), R.cover === 'thatch-mossy' ? mossyRidge(31) : earthRidge(31)));
    }
  }
  // les pignons
  const HOLE_H = 8, HOLE_W = 5;
  const inHole = (s: number, t: number) => t >= holeZ - T && Math.abs(s - (H2 + 2)) < (holeZ - T + HOLE_H - t) * (HOLE_W / HOLE_H);
  const gh = Math.round(H2 * TAN) + 5;
  const [gW, gE] = R.gables ?? ['lime', 'lime'];
  for (const [x, nx, kind] of [[-2, -1, gW], [L + 2, 1, gE]] as const) {
    if (kind === 'none') continue;
    const apex = (s: number) => zU(Math.abs(s - 2 - H2)) - T;
    const inner = gableFill(kind, 90 + x, D + 4, gh, age);
    const p = part('pignon', 1, ';', 'none');
    if (nx < 0) Q.push({ o: [x, -2, T], u: [0, D + 4, 0], v: [0, 0, gh], n: [-1, 0, 0], part: p, tex: gableTex(inner, apex, R.gableHole ? inHole : undefined), face: 'W' });
    else Q.push({ o: [x, D + 2, T], u: [0, -(D + 4), 0], v: [0, 0, gh], n: [1, 0, 0], part: p, tex: gableTex(inner, (s) => apex(D + 4 - s)), face: 'E' });
  }
  // les entraits retroussés à 1,40 m au-dessus de la sablière, aux pignons et aux fermes
  const dC = H2 - 29 / TAN;
  const eZ = T + 26;
  for (const [x0, x1, sd] of [[-2, 2, 59], [L - 2, L + 2, 61 + L], ...(h.trusses ?? []).map((x) => [x - 2, x + 2, 300 + x])]) {
    if (dC > 2) Q.push(...box(x0, x1, H2 - dC + 1, H2 + dC - 1, eZ, eZ + 3, part('entrait', 6, 'K', 'full'), aged(timber(sd), age)));
  }
  if (R.gableHole) {
    Q.push(...box(-2, 2, H2 - HOLE_W - 2, H2 + HOLE_W + 2, holeZ - 2, holeZ, part('chevêtre', 6, 'K', 'full'), aged(timber(71), age)));
    Q.push({ o: [3, H2 - 12, holeZ - 2], u: [0, 24, 0], v: [0, 0, 14], n: [-1, 0, 0], part: part('comble', 0, 'o', 'none'), tex: voidTex, face: 'W' });
  }
  return Q;
}

/**
 * Le remplissage d'un pignon (vu de face, s le long du mur, t vers le haut depuis la sablière) : à croix (deux croix de Saint-André
 * de part et d'autre du poinçon, sous l'entrait), à gerbière (la porte haute du fenil au milieu, 80 × 100 cm, en planches).
 */
export function gableFill(kind: GableKind, seed: number, w: number, gh: number, age: Age): Tex {
  if (kind === 'cross') {
    const lime = daub(seed, true), x = crossTex(seed, age);
    const W_ = aged(timber(seed + 3), age);
    return (s, t, c) => {
      // le poinçon au milieu, l'entrait à 26 px : sous l'entrait, deux panneaux à croix
      if (Math.abs(s - w / 2) < 2) return W_(s, t, { ...c, w: 4, h: gh });
      if (t > 25.5 && t < 29) return t > 28 ? '%' : '*';
      if (t < 25.5) {
        const left = s < w / 2, s0 = left ? 3 : w / 2 + 2, s1 = left ? w / 2 - 2 : w - 3;
        if (s >= s0 && s < s1) return x(s - s0, t, { ...c, w: s1 - s0, h: 25.5 });
      }
      return lime(s, t, c);
    };
  }
  if (kind === 'loft') {
    const lime = daub(seed, true), door = aged(leafTex(seed, 16, { latch: 'left' }), age), frame = aged(timber(seed + 1), age);
    return (s, t, c) => {
      const x0 = w / 2 - 9, x1 = w / 2 + 9, z0 = 4, z1 = 26;
      if (s >= x0 && s < x1 && t >= z0 && t < z1) {
        if (s < x0 + 1 || s >= x1 - 1 || t >= z1 - 1.5 || t < z0 + 1) return frame(s - x0, t - z0, { ...c, w: 18, h: 22 });
        return door(s - x0 - 1, t - z0 - 1, { ...c, w: 16, h: 20 });
      }
      return lime(s, t, c);
    };
  }
  return fillTex(kind as Fill, seed, age);
}

/**
 * Le toit à croupes (la guérisseuse) : quatre pans de chaume à la même pente, le faîtage court au milieu, l'égout tout autour à
 * `eave` px au-delà de l'axe des murs ; `notch` : l'égout sud relevé au-dessus de la porte (de x0 à x1, jusqu'à 2 px du mur).
 */
export function hipRoof(h: HouseSpec): Quad[] {
  const { L, D, T } = h, R = h.roof;
  const RAD = (R.pitch * Math.PI) / 180, TAN = Math.tan(RAD), COS = Math.cos(RAD), SIN = Math.sin(RAD);
  const ov = R.eave ?? 14, [, TH] = THICK[R.cover];
  // le dessus du chaume : z = zA + TAN · (distance à l'intérieur depuis l'axe du mur), zA au droit des murs
  const zA = T + TH / COS + 1;
  const half = D / 2 + ov, Lr = L + 2 * ov, rise = half * TAN;
  const zE = zA - ov * TAN;
  const P = part('chaume', 10, 'P', 'full', { roof: true });
  const Q: Quad[] = [];
  const notch = R.notch;
  // sud et nord : des trapèzes ; est et ouest : des triangles (les arêtiers à 45° en plan)
  for (const side of [1, -1] as const) {
    const o: V3 = side > 0 ? [-ov, D + ov, zE] : [L + ov, -ov, zE];
    const u: V3 = [side * Lr, 0, 0], v: V3 = [0, -side * half, rise];
    const sl = len(v), base = thatchSlope(side > 0 ? 5 : 6);
    const tex: Tex = (s, t, c) => {
      const q = t / sl, m = q * half;
      if (s < m - 0.3 || s > Lr - m + 0.3) return null;
      if (side > 0 && notch) {
        const x = -ov + s, de = q * half; // la distance horizontale depuis l'égout
        if (x > notch[0] && x < notch[1] && de < ov - 2) return null;
      }
      return base(s, t, c);
    };
    Q.push({ o, u, v, n: [0, side * SIN, COS], part: P, tex, face: 'slope' });
    // l'égout
    const eo: V3 = side > 0 ? [-ov, D + ov, zE - TH / COS * 0.7] : [L + ov, -ov, zE - TH / COS * 0.7];
    const eaveT = thatchEave(side > 0 ? 8 : 9);
    Q.push({
      o: eo, u, v: [0, 0, (TH / COS) * 0.7], n: [0, side, 0], part: P, face: 'S',
      tex: (s, t, c) => {
        if (side > 0 && notch) { const x = -ov + s; if (x > notch[0] && x < notch[1]) return null; }
        return eaveT(s, t, c);
      },
    });
  }
  for (const side of [1, -1] as const) {
    const o: V3 = side < 0 ? [-ov, -ov, zE] : [L + ov, D + ov, zE];
    const u: V3 = [0, -side * (D + 2 * ov), 0], v: V3 = [-side * half, 0, rise];
    const sl = len(v), base = thatchSlope(side > 0 ? 15 : 16), Dr = D + 2 * ov;
    Q.push({
      o, u, v, n: [side * SIN, 0, COS], part: P, face: 'slope',
      tex: (s, t, c) => { const m = (t / sl) * half; return s < m - 0.3 || s > Dr - m + 0.3 ? null : base(s, t, c); },
    });
  }
  // le relevé au-dessus de la porte : la tranche du chaume coupé, d'aplomb, et sa sous-face
  if (notch) {
    // la tranche du chaume coupé d'aplomb à 10 cm devant le mur : toute son épaisseur, du dessous au dessus
    const zTop = zA - 2 * TAN, zLow = zTop - TH / COS;
    Q.push({ o: [notch[0], D + 2, zLow], u: [notch[1] - notch[0], 0, 0], v: [0, 0, zTop - zLow], n: [0, 1, 0], part: P, tex: thatchEave(19), face: 'S' });
  }
  // le faîtage de terre, court
  const top = zA + (D / 2) * TAN;
  const prof: [number, number][] = [[5, -4], [3.8, -1.2], [2.4, 0.7], [0.8, 1.7], [-0.8, 1.7], [-2.4, 0.7], [-3.8, -1.2], [-5, -4]];
  const x0 = D / 2 - 2, x1 = L - D / 2 + 2;
  if (x1 > x0) Q.push(...polyPrism(x0, x1, prof.map(([dy, dz]) => [D / 2 + dy, top + dz]), part('faîtage', 11, 'e', 'full', { roof: true }), earthRidge(33)));
  return Q;
}

/** Le dessus du chaume d'un toit à croupes à la verticale d'un point (pour poser ce qui pend sous l'égout). */
export function hipEaveZ(h: HouseSpec): number {
  const RAD = (h.roof.pitch * Math.PI) / 180, [, TH] = THICK[h.roof.cover];
  return h.T + TH / Math.cos(RAD) + 1 - (h.roof.eave ?? 14) * Math.tan(RAD) - TH / Math.cos(RAD) * 0.7;
}

/**
 * Un appentis de planches : le pan (de la haute rive `hi` à l'égout `lo`, deux points à l'ouest du pan, et sa longueur `u`), sa
 * tranche, ses poteaux (des points au sol, jusqu'au dessous du pan), sa sablière basse.
 */
export function leanTo(hi: V3, lo: V3, u: V3, posts: [number, number][], age: Age, seed = 7, cover: 'planks' | 'shingles' = 'planks'): Quad[] {
  const v = sub(hi, lo);
  const K = (Math.abs(v[1]) + Math.abs(v[2])) / len(v);
  const tex = cover === 'planks' ? aged(planksRoof(seed), age) : aged(shinglesTex(K), age);
  const P = part('pan d appentis', 8, age === 'old' ? '|' : '&', 'full', { roof: true });
  const Q: Quad[] = [face(lo, u, v, P, tex)];
  Q.push(face(sub(lo, [0, 0, 1.5]), u, [0, 0, 1.5], P, aged(() => '%', age), 'S'));
  // les poteaux et la sablière basse, sous l'égout
  const zAt = (x: number, y: number) => {
    // le dessous du pan au-dessus de (x, y) : la droite de lo à hi, projetée
    const dir = unit([v[0], v[1], 0]);
    const along = (x - lo[0]) * dir[0] + (y - lo[1]) * dir[1];
    const hz = Math.hypot(v[0], v[1]);
    return lo[2] - 1.5 + (v[2] * along) / hz;
  };
  const W_ = aged(timber(seed + 20), age);
  for (const [x, y] of posts) Q.push(...box(x - 1.5, x + 1.5, y - 1.5, y + 1.5, 0, zAt(x, y) - 2, part('poteau', 5, 'K', 'full'), W_));
  if (posts.length >= 2) {
    const [a, b] = [posts[0], posts[posts.length - 1]];
    const z = Math.min(zAt(a[0], a[1]), zAt(b[0], b[1]));
    Q.push(...box(Math.min(a[0], b[0]) - 2, Math.max(a[0], b[0]) + 2, Math.min(a[1], b[1]) - 2, Math.max(a[1], b[1]) + 2, z - 4, z - 1.5, part('sablière', 6, 'K', 'full'), W_));
  }
  return Q;
}

// =====================================================================================================================
// Le solin de pierres brutes du jeu (maison-xeros.ts `solinBoards`, à l'identique, pour les baies de toute largeur)
// =====================================================================================================================

const kit = wallKit(gameImage);
const SOLIN = part('solin', 2, 'o', 'none');

/** Le solin dans la vue `r` (repère de la maison tournée autour de son milieu) ; `skip` : des rectangles du monde sans solin. */
export function solinBoards(h: HouseSpec, r: Rot, seed: number): Board[] {
  const L = h.L, D = h.D, c: [number, number] = [L / 2, D / 2];
  const out: Board[] = [];
  const run = (x0: number, x1: number, y0: number, sd: number) => {
    if (x1 - x0 < 4) return;
    const g = kit.highWall('rough', sd, { length: x1 - x0, face: 8, top: 10 }, { left: 'head', right: 'head' });
    out.push({ grid: g, pal: PAL, x: x0, y: y0 - 8, depth: (row) => (row < 10 ? y0 + row + 0.5 : y0 + 10), part: SOLIN });
  };
  const band = (x0: number, y0: number, y1: number, sd: number, head = false) => {
    if (y1 - y0 < 2) return;
    const rows = y1 - y0;
    const g = head
      ? kit.highWall('rough', sd, { length: 10, face: 8, top: rows - 8, axis: 'ns' }, { left: 'head', right: 'head' })
      : kit.highWall('rough', sd, { length: 10, face: 4, top: rows + 4, axis: 'ns' }, { left: 'head', right: 'head' }).slice(0, rows);
    const top = head ? rows - 8 : rows;
    out.push({ grid: g, pal: PAL, x: x0, y: y0 - 8, depth: (row) => (row < top ? y0 + row + 0.5 : y1), part: SOLIN });
  };
  const piece = (rect: [number, number, number, number], gaps: [number, number, number, number][], sd: number, alongView: 'x' | 'y' | 'auto') => {
    const R = rotRect(rect, r, c), G = gaps.map((g) => rotRect(g, r, c));
    const ewView = alongView === 'auto' ? R[1] - R[0] > R[3] - R[2] : alongView === 'x';
    if (ewView) {
      let a = R[0], k = 0;
      for (const g of [...G].sort((p, q) => p[0] - q[0])) { run(a, g[0], R[2], sd + 7 * k++); a = g[1]; }
      run(a, R[1], R[2], sd + 7 * k);
    } else {
      let a = R[2], k = 0;
      for (const g of [...G].sort((p, q) => p[2] - q[2])) { band(R[0], a, g[2], sd + 7 * k++, true); a = g[3]; }
      band(R[0], a, R[3], sd + 7 * k);
    }
  };
  const ring = rotRect([-5, L + 5, -5, D + 5], r, c);
  const [X0, X1, Y0, Y1] = ring;
  const ops = openings(h).filter((d) => d.kind !== 'open' || true);
  const gapWorld = (d: (typeof ops)[number]): [number, number, number, number] =>
    d.w.ew ? [d.m - d.half, d.m + d.half, d.w.c - 5, d.w.c + 5] : [d.w.c - 5, d.w.c + 5, d.m - d.half, d.m + d.half];
  const gaps = ops.map(gapWorld).map((g) => rotRect(g, r, c));
  const inRect = (g: number[], x0: number, x1: number, y0: number, y1: number) => g[0] >= x0 - 0.5 && g[1] <= x1 + 0.5 && g[2] >= y0 - 0.5 && g[3] <= y1 + 0.5;
  const unrot = (v: [number, number, number, number]): [number, number, number, number] => rotRect(v, ((4 - r) % 4) as Rot, c);
  // les murs de pierre (`base`) n'ont pas de solin : leur emprise, dans la vue
  const based = h.walls.filter((w) => w.base).map((w) => rotRect(w.ew ? [w.posts[0] - 6, w.posts[w.posts.length - 1] + 6, w.c - 6, w.c + 6] : [w.c - 6, w.c + 6, w.posts[0] - 6, w.posts[w.posts.length - 1] + 6], r, c));
  const ringPieces: [[number, number, number, number], 'x' | 'y', number][] = [
    [[X0, X1, Y1 - 10, Y1], 'x', seed], [[X0, X1, Y0, Y0 + 10], 'x', seed + 1],
    [[X0, X0 + 10, Y0 + 10, Y1 - 10], 'y', seed + 2], [[X1 - 10, X1, Y0 + 10, Y1 - 10], 'y', seed + 3],
  ];
  for (const [v, along, sd] of ringPieces) {
    // un tronçon du tour recouvert par un mur de pierre se raccourcit jusqu'à lui
    let rr = v;
    for (const b of based) {
      if (along === 'x' && b[2] <= rr[2] + 1 && b[3] >= rr[3] - 1) {
        if (b[0] <= rr[0] + 1 && b[1] > rr[0]) rr = [b[1] - 6, rr[1], rr[2], rr[3]];
        else if (b[1] >= rr[1] - 1 && b[0] < rr[1]) rr = [rr[0], b[0] + 6, rr[2], rr[3]];
      }
      if (along === 'y' && b[0] <= rr[0] + 1 && b[1] >= rr[1] - 1 && b[2] <= rr[2] + 1 && b[3] >= rr[3] - 1) rr = [0, 0, 0, 0];
    }
    if (rr[1] - rr[0] < 2) continue;
    const gs = gaps.filter((g) => inRect(g, rr[0], rr[1], rr[2], rr[3]));
    piece(unrot(rr), gs.map(unrot), sd, along);
  }
  h.walls.filter((w) => !w.side && !w.base).forEach((w, i) => {
    const p0 = w.posts[0] + 5, p1 = w.posts[w.posts.length - 1] - 5;
    const rect: [number, number, number, number] = w.ew ? [p0, p1, w.c - 5, w.c + 5] : [w.c - 5, w.c + 5, p0, p1];
    piece(rect, ops.filter((d) => d.w === w).map(gapWorld), seed + 20 + 9 * i, 'auto');
  });
  return out;
}

// =====================================================================================================================
// La maison posée dans le monde
// =====================================================================================================================

/** Une image posée au sol dans le repère des axes du monde : son bas sur y, sa gauche sur x, à la hauteur z ; profondeur y. */
export function placed(grid: Grid, pal: Palette, x: number, y: number, z = 0, depth = y): Board {
  return { grid, pal, x: Math.round(x), y: Math.round(y - z - grid.length), depth: () => depth };
}

/**
 * Le passage du repère de la maison (faîtage est-ouest) au repère des axes du monde (l'origine sur l'axe du poteau nord-ouest du
 * monde) : `rot` 0, rien ; 3, le quart de tour qui met le mur sud de la maison à l'ouest (faîtage nord-sud, façade sur une rue à
 * l'ouest) ; 1, à l'est.
 */
export function toWorld(h: HouseSpec, rot: Rot): { quads: (q: Quad[]) => Quad[]; shift: [number, number]; size: [number, number] } {
  const c: [number, number] = [h.L / 2, h.D / 2];
  const odd = rot % 2 === 1;
  const size: [number, number] = odd ? [h.D, h.L] : [h.L, h.D];
  // le coin nord-ouest des axes, une fois tourné autour du milieu
  const r = rotRect([0, h.L, 0, h.D], rot, c);
  const shift: [number, number] = [-r[0], -r[2]];
  return { quads: (q) => moveQuads(rotQuads(q, rot, c), [shift[0], shift[1], 0]), shift, size };
}

/** La maison (ossature, remplissages, toit, solin, volets du côté vu) dans le repère des axes du monde. */
export function frameScene(h: HouseSpec, o: FrameOpts): Scene {
  const rot = o.rot ?? 0;
  const W = toWorld(h, rot);
  // une maison sans mur du modèle (la cabane du berger) : ni ossature, ni toit, ni solin
  const bare = h.walls.length === 0;
  const quads = bare ? [] : W.quads(frameQuads(h, o));
  const boards = bare ? [] : solinBoards(h, rot, 41).map((b) => moveBoard(b, W.shift[0], W.shift[1]));
  if (!o.cut) {
    const c: [number, number] = [h.L / 2, h.D / 2];
    for (const w of h.walls) w.bays.forEach((b, k) => {
      if (b !== 'window' || !w.side || worldSide(w.side, rot) !== 'S') return;
      const m = (w.posts[k] + w.posts[k + 1]) / 2;
      // le milieu de la baie sur l'axe du mur, dans le monde
      const p = rotP(w.ew ? [m, w.c, 0] : [w.c, m, 0], rot, c);
      const X = p[0] + W.shift[0], Y = p[1] + W.shift[1];
      const s = propImg('plank-shutter', 1, h.age);
      boards.push(placed(s.grid, s.pal, X - 8, Y + 15, h.sill, Y + 14));
    });
  }
  const [sx, sy] = W.size;
  return { quads: foreign(quads), boards, floor: [5, sx - 5, 5, sy - 5] };
}

/** Une scène déplacée (faces et images). */
export function moveScene(sc: Scene, dx: number, dy: number): Scene {
  return {
    quads: moveQuads(sc.quads, [dx, dy, 0]),
    boards: sc.boards.map((b) => moveBoard(b, dx, dy)),
    floor: sc.floor ? [sc.floor[0] + dx, sc.floor[1] + dx, sc.floor[2] + dy, sc.floor[3] + dy] : undefined,
  };
}
/** Plusieurs scènes en une (le sol de terre battue : celui de la première). */
export function mergeScenes(...scs: Scene[]): Scene {
  return { quads: scs.flatMap((s) => s.quads), boards: scs.flatMap((s) => s.boards), floor: scs.find((s) => s.floor)?.floor };
}

/** Une image de pièce nouvelle posée en cm comme le jeu la poserait (emprise x0–x1 px, bord sud y px). */
export function pieceBoard(grid: Grid, x0: number, x1: number, ySouth: number, z = 0, depth = ySouth): Board {
  return placeImg({ grid, pal: PIECE_PAL }, x0, x1, ySouth, z, depth);
}

export { hash, part, box, prism, timber, daub, rotQuads };
