// Le mode construction (le bac à sable), sans Phaser : la boîte de chaque pièce posée, la hauteur où se pose une pièce visée (elle
// s'accroche sur le dessus de ce qu'il y a dessous), ce qu'une pièce porte, l'ordre d'affichage, et le passage d'un groupe de pièces
// à un plan et retour. Tout est en centimètres : l'emprise sur la grille de BUILD.grid (20 cm) ; la hauteur est celle du dessus qui
// porte la pièce (une dalle de 12 cm), plus des crans de la même grille.
//
// Projection (docs/STYLE.md, section 8) : un point au sol (x, y) à la hauteur z se voit à l'écran en (x, y − z), à 5 cm par pixel.
// Une pièce a pour boîte son emprise au sol (x, y : coin nord-ouest ; w, d) et sa hauteur (z : sa base ; h) ; son image a le bas
// au bord sud de son emprise, relevé de z, et elle est centrée sur son emprise en largeur.

import { BUILD } from '../config';
import { items, props, wood as woodContent } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { BuildPlaced, BuildPlan, BuildRef, JointType, WoodAge, WoodPiece } from '../content/types';
import { viewCount } from '../content/views';
import { woodDims } from './woodPiece';
import { WALL_PIECE, wallMin } from './walls';
import { lookDef, lookOf, turnedWood, upOf } from './woodShape';

/** Une pièce posée en mode construction, telle que GameState la garde : son identifiant propre, et ce que dit `BuildPlaced`. */
export type BuildPiece = BuildPlaced & { id: number };

/** Dimensions d'une pièce dans son sens, en cm : largeur (est-ouest), profondeur (nord-sud), hauteur. */
export interface Size3 {
  w: number;
  d: number;
  h: number;
}

/** Boîte d'une pièce posée, en cm : coin nord-ouest de l'emprise (x, y), base (z), et ses dimensions. */
export interface Box3 extends Size3 {
  x: number;
  y: number;
  z: number;
}

/** Un objet possédable sans `dims` (les baies, l'épée...) : une petite boîte, faute de mieux. */
const ITEM_FALLBACK: Size3 = { w: 20, d: 20, h: 10 };

/** Le cran de la grille le plus proche. */
const onGrid = (cm: number) => Math.round(cm / BUILD.grid) * BUILD.grid + 0;

/** Ce que nomme une pièce existe encore dans le contenu (objet, objet possédable, diamètre et aspect de bois) ; sinon le dire. */
export function refMissing(ref: BuildRef): string | undefined {
  if ('prop' in ref) return props[ref.prop] ? undefined : `l'objet « ${ref.prop} »`;
  if ('item' in ref) return items[ref.item] ? undefined : `l'objet « ${ref.item} »`;
  const size = woodContent.sizes[ref.wood.size];
  if (!size) return `le bois « ${ref.wood.size} »`;
  const look = size.looks[lookOf(ref.wood)];
  if (!look) return `la forme « ${lookOf(ref.wood)} » du bois « ${ref.wood.size} »`;
  return ref.wood.axis === 'up' && !look.up ? `la forme « ${lookOf(ref.wood)} » du bois « ${ref.wood.size} » debout` : undefined;
}

/** Le nom d'une pièce, en français : celui du contenu, ou celui de l'aspect de la pièce de bois (« poutre », « rondin »). */
export function refName(ref: BuildRef): string {
  if ('prop' in ref) return props[ref.prop].name;
  if ('item' in ref) return items[ref.item].name;
  const look = lookDef(ref.wood.size, lookOf(ref.wood));
  return ref.wood.axis === 'up' && look.up ? look.up.name : look.name;
}

/** La pièce prend-elle l'âge du bois : la pièce de bois, ou un objet de bois (`aged` de props.json ou items.json). */
function ageable(ref: BuildRef): boolean {
  if ('wood' in ref) return true;
  return 'prop' in ref ? !!props[ref.prop]?.aged : !!items[ref.item]?.aged;
}

/** L'âge d'une pièce posée qui le prend (la pièce de bois : `wood.age` ; un objet de bois : `age`), neuf par défaut ; rien sinon. */
export function ageOf(p: BuildPlaced): WoodAge | undefined {
  if (!ageable(p.piece)) return undefined;
  return ('wood' in p.piece ? p.piece.wood.age : p.age) ?? 'new';
}

/** La pièce à cet âge, si elle le prend (neuf : le réglage est ôté) ; une pièce qui ne le prend pas ne change pas. */
export function withAge<P extends BuildPlaced>(p: P, age: WoodAge): P {
  if (!ageable(p.piece)) return p;
  if ('wood' in p.piece) {
    const { age: _a, ...wood } = p.piece.wood;
    return { ...p, piece: { wood: age === 'new' ? wood : { ...wood, age } } };
  }
  const { age: _b, ...rest } = p;
  return (age === 'new' ? rest : { ...rest, age }) as P;
}

/** Le nombre de vues (de sens) d'une pièce : celles de sa symétrie ; la pièce de bois tourne par son `axis` (une seule vue). */
function viewsOf(ref: BuildRef): number {
  if ('prop' in ref) return viewCount(props[ref.prop].views);
  if ('item' in ref) return viewCount(items[ref.item].views);
  return 1;
}

/** Dimensions d'une pièce dans son sens : `dims` de l'objet (largeur et profondeur échangées un quart de tour sur deux), ou celles de la pièce de bois. */
export function sizeOf(ref: BuildRef, view = 0): Size3 {
  if ('wood' in ref) {
    const d = woodDims(ref.wood);
    return { w: d.w, d: d.d, h: d.h };
  }
  const dims = 'prop' in ref ? props[ref.prop].dims : items[ref.item].dims;
  // un morceau de mur de toute longueur (le solin) : sa longueur réglée remplace celle de `dims`
  const long = 'prop' in ref && ref.length && props[ref.prop].wall ? ref.length : undefined;
  const s = dims ? { w: long ?? dims.w, d: dims.d, h: dims.h } : ITEM_FALLBACK;
  return view % 2 === 1 && viewsOf(ref) > 1 ? { w: s.d, d: s.w, h: s.h } : s;
}

/** La boîte d'une pièce posée. */
export function boxOf(p: BuildPlaced): Box3 {
  return { x: p.x, y: p.y, z: p.z, ...sizeOf(p.piece, p.view) };
}

/**
 * Ce qu'une pièce posée occupe vraiment, pour porter, se heurter et s'aimanter : sa boîte, sauf la pièce de bois debout, dessinée plus
 * large que sa section (règle D étendue, STYLE.md section 8 : le poteau de la poutre du normal, 20 cm, dessiné sur 40) : sa section
 * réelle (le `body` de son aspect debout, wood.json), au milieu de son emprise. Le remplissage de 1,40 m de la maison de Xéros se pose
 * ainsi entre deux poteaux de la travée de 1,60 m, contre leurs faces (CONCEPTION « La maison de Xéros »).
 */
export function solidOf(p: BuildPlaced): Box3 {
  const b = boxOf(p);
  if (!('wood' in p.piece) || p.piece.wood.axis !== 'up') return b;
  const body = upOf(p.piece.wood.size, lookOf(p.piece.wood)).body;
  const w = Math.min(b.w, body.w * CM_PER_PX);
  const d = Math.min(b.d, body.h * CM_PER_PX);
  return { ...b, x: b.x + (b.w - w) / 2, y: b.y + (b.d - d) / 2, w, d };
}

/**
 * Une pièce qui se vise sur la grille, sans l'aimant des bords : le poteau (la pièce de bois debout), qui fait la travée ; le bout
 * d'une traverse sous lui, à 10 cm de son bord, le tirerait hors de sa place.
 */
export function aimOnGrid(ref: BuildRef): boolean {
  return 'wood' in ref && ref.wood.axis === 'up';
}

/** Les emprises au sol de deux boîtes se recouvrent (le simple contact d'un bord ne compte pas). */
export function overlaps(a: { x: number; y: number; w: number; d: number }, b: { x: number; y: number; w: number; d: number }): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
}

/** Une pièce qui pend à ses gonds (une porte, un volet : `swing` de props.json) : elle ne porte rien. */
export function hangs(p: BuildPlaced): boolean {
  return 'prop' in p.piece && !!props[p.piece.prop]?.swing;
}

/** Le dessus d'une boîte (cm). */
const topOf = (b: Box3) => b.z + b.h;

/** La plus grande hauteur de dessus des pièces que recoupe l'emprise (0 : le sol) ; un poteau, par sa section réelle (`solidOf`). */
export function supportAt(pieces: readonly BuildPlaced[], foot: { x: number; y: number; w: number; d: number }): number {
  let top = 0;
  for (const p of pieces) {
    const b = solidOf(p);
    if (overlaps(b, foot)) top = Math.max(top, topOf(b));
  }
  return top;
}

/**
 * Où se pose une pièce de dimensions `size` visée au point (cx, cy) de l'écran (en cm, à 5 cm par pixel) : son emprise centrée sur
 * le point, sur la grille, et sa base sur le dessus de ce qu'il y a dessous. Le point visé est vu à la hauteur où la pièce se
 * poserait (y écran = y sol − z) : on essaie chaque hauteur de dessus, de la plus haute à la plus basse, et l'on garde la première
 * qui se tient (la pièce visée à cette hauteur tomberait bien sur un dessus à cette hauteur) ; à défaut, le sol. `step` : les crans
 * ajoutés (monter, descendre), d'une grille chacun, jamais sous le sol. `grid` : la pièce reste sur la grille, sans aimant (le poteau,
 * `aimOnGrid`).
 */
export function aimAt(all: readonly BuildPlaced[], size: Size3, cx: number, cy: number, step = 0, grid = false, ref?: BuildRef, view = 0): Box3 {
  // une marche visée juste après une marche pareille (`stair` de props.json : l'escalier de la maison du coq) : sur elle, un giron plus
  // loin dans le sens où monte l'escalier, quelle que soit la grille (un giron de 26 cm recouvre de 4 cm une marche de 30)
  const flight = ref && 'prop' in ref ? props[ref.prop]?.stair : undefined;
  if (flight && ref && 'prop' in ref) {
    const [dx, dy] = STAIR_UP[view % 4];
    const next = all
      .filter((p) => 'prop' in p.piece && p.piece.prop === ref.prop && (p.view ?? 0) % 4 === view % 4)
      .map((p) => {
        const b = boxOf(p);
        return { x: b.x + dx * flight.tread, y: b.y + dy * flight.tread, z: topOf(b) };
      })
      .filter((b) => cx >= b.x && cx < b.x + size.w && cy + b.z >= b.y && cy + b.z < b.y + size.d)
      .sort((a, b) => b.z - a.z)[0];
    if (next) return { ...next, z: Math.max(0, next.z + step * BUILD.grid), ...size };
  }
  // une porte, un volet pendent à leurs gonds : ils ne portent rien (le rondin au-dessus de la fenêtre de la cabane ne vise pas le haut
  // du volet de 60 cm qui le dépasse ; chantier « hauteurs »)
  const pieces = all.filter((p) => !hangs(p));
  const tops = [...new Set(pieces.map((p) => topOf(boxOf(p))))].sort((a, b) => b - a);
  const at = (t: number) => {
    const f = { x: onGrid(cx - size.w / 2), y: onGrid(cy + t - size.d / 2), w: size.w, d: size.d };
    // l'aimant prend tous les bords, une porte aussi (le remplissage contre l'huisserie et la porte de la maison)
    // l'aimant ne fait pas tomber de ce qui la porte la pièce qui y est déjà, de plus que sa hauteur (la muraillère sur la retraite du
    // mur, à 2,40 m) ; d'une dalle de 12 cm, elle descend au sol contre le poteau (l'étal) ; il ne cherche pas d'appui à une pièce qui
    // n'en a pas à cette hauteur (la planche de bardage visée devant la sablière)
    const held = t > size.h && supportAt(pieces, f) === t;
    if (grid) return f;
    // d'abord les seules pièces à sa hauteur ; si elle ne tient pas ainsi à cette hauteur, tous les bords, comme avant (la traverse
    // amenée sur le solin, le pan de toit, visé au dessus du pignon, aligné sur les sablières)
    const keep = held ? (g: typeof f) => supportAt(pieces, g) >= t - size.h : undefined;
    // un pan de toit est visé au-dessus de son pignon, pas à sa hauteur (sa base vient de sa rive basse, systems/build.ts) : l'aimant
    // de toujours
    if (ref && 'prop' in ref && props[ref.prop]?.pitch) return magnet(all, f, t, size.h, keep, false);
    const levelled = magnet(all, f, t, size.h, keep, true, ref && kindOf(ref));
    return supportAt(pieces, levelled) === t ? levelled : magnet(all, f, t, size.h, keep, false);
  };
  // le point visé, vu à la hauteur t, est-il sur un dessus à cette hauteur (on le voit sur ce dessus) ?
  const seenOn = (t: number) => pieces.some((p) => {
    const b = solidOf(p);
    return topOf(b) === t && cx >= b.x && cx < b.x + b.w && cy + t >= b.y && cy + t < b.y + b.d;
  });
  let base: { x: number; y: number; z: number } | undefined;
  let first: { x: number; y: number; z: number } | undefined;
  for (const t of tops) {
    const f = at(t);
    if (supportAt(pieces, f) === t) {
      first ??= { x: f.x, y: f.y, z: t };
      // de plusieurs hauteurs qui se tiennent, celle dont le dessus est sous le point visé : le remplissage visé sur la traverse, entre
      // deux poteaux, ne monte pas sur la tête du poteau suivant (à sa hauteur, l'emprise glisse jusqu'à lui) ; sinon la plus haute (la
      // sablière visée entre deux poteaux)
      if (seenOn(t)) {
        base = { x: f.x, y: f.y, z: t };
        break;
      }
    }
  }
  base ??= first;
  if (!base) {
    const f = at(0);
    base = { x: f.x, y: f.y, z: supportAt(pieces, f) };
  }
  // posée sur une seule pièce de la même emprise (un poteau sur un poteau, une pierre sur une pierre pareille) : exactement dessus
  if (base.z > 0) {
    const same = pieces.map(boxOf).filter((b) => topOf(b) === base!.z && b.w === size.w && b.d === size.d && overlaps(b, { ...base!, w: size.w, d: size.d }));
    if (same.length === 1) base = { x: same[0].x, y: same[0].y, z: base.z };
  }
  return { ...base, z: Math.max(0, base.z + step * BUILD.grid), ...size };
}

/** Le sens où monte un escalier, par vue (R0 : vu du sud, il monte vers le nord ; un quart de tour de plus à chaque vue). */
const STAIR_UP: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/**
 * L'emprise aimantée aux bords de ses voisines : un bord à moins d'une demi-grille (10 cm) d'un bord d'une pièce proche (bout à bout,
 * ou alignés) s'y colle, en x puis en y. Ce qui n'est pas sur la grille (le morceau de solin, 50 cm d'épaisseur) se joint ainsi
 * exactement, en angle comme en long. Un poteau aimante par sa boîte et par sa section réelle (`solidOf`) : le remplissage vient
 * contre sa face.
 * L'aimant ne colle pas la pièce (posée à `z`, haute de `h`) là où elle heurterait une autre pièce : il prend
 * le bord le plus proche où elle tient (le jambage d'une porte contre son poteau, pas sur lui), en x puis en y ; à défaut, comme sans
 * heurt.
 */
/** La sorte d'une pièce, pour l'aimant : l'objet, ou le bois par sa grosseur et sa forme (deux planches du gros sont pareilles). */
function kindOf(ref: BuildRef): string {
  return 'prop' in ref ? ref.prop : 'wood' in ref ? `wood:${ref.wood.size}:${ref.wood.shape ?? ''}` : `item:${ref.item}`;
}

function magnet<F extends { x: number; y: number; w: number; d: number }>(pieces: readonly BuildPlaced[], f: F, z = 0, h = 0, keep?: (f: F) => boolean, levelled = true, kind?: string): F {
  const reach = BUILD.grid / 2;
  // ce qui heurte : la section réelle ; les bords qui aimantent : la boîte et, pour un poteau, sa section aussi
  const boxes = pieces.map(solidOf);
  // seulement ce qui est à la hauteur de la pièce (son dessus au moins à sa base, sa base au plus à son dessus) : une solive posée à
  // 2,60 m ne colle pas au bord de la table qui est dessous (chantier « maison du coq ») ; ce qui est au plus `BUILD.under` sous elle
  // compte encore (la sablière posée sur une autre s'aligne sur le poteau dessous : la grange) ; sans hauteur, tout
  // ni le sol sur lequel on la pose (le plancher, le dallage : on ne s'aligne pas sur le joint de deux planches)
  // les planchers (un dessus qui se marche, la planche couchée) : ce qui est dessous est caché à ce qu'on pose dessus
  const floors = pieces.filter((p) => ('prop' in p.piece && props[p.piece.prop]?.walk && !props[p.piece.prop]?.wall) || ('wood' in p.piece && p.piece.wood.shape === 'plank')).map(boxOf);
  // 'at' : elle aimante ; 'low' : plus basse, elle ne fait que retenir (écart nul) quand aucune voisine à sa hauteur n'est à portée (le
  // couronnement centré sur son conduit) ; rien : ni le plancher dessous, ni ce qu'il cache
  const level = (p: BuildPlaced): 'at' | 'low' | undefined => {
    const b = boxOf(p);
    if (h <= 0 || !levelled) return 'at';
    if (b.z + b.h === z && 'prop' in p.piece && props[p.piece.prop]?.walk && !props[p.piece.prop]?.wall) return undefined;
    if (b.z + b.h === z && 'wood' in p.piece && p.piece.wood.shape === 'plank') return undefined;
    // ce qui est à peine sous elle (au plus `BUILD.under`) compte encore : sous un objet, toute pièce (le pignon aligné sur le
    // remplissage du mur, dessous) ; sous une pièce de bois, un poteau dressé (la sablière sur le poteau)
    // ce qu'un plancher cache (entre elle et lui) ne compte jamais : le meuble de l'étage ne voit pas la solive sous le plancher
    const hidden = floors.some((o) => o.z + o.h <= z && o.z + o.h >= b.z + b.h && overlaps(o, f));
    const post = !hidden && b.z + b.h >= z - BUILD.under && (!kind?.startsWith('wood:') || ('wood' in p.piece && p.piece.wood.axis === 'up'));
    // une pièce de bois plus basse juste sous une pièce de bois, dans le même sens (la poutre nord-sud sous l'entrait nord-sud : on aligne
    // une charpente sur ce qu'elle surmonte ; jamais la table sous la solive, ni la solive sous les planches qui la croisent), sauf ce
    // qu'un plancher cache
    const under =
      !!kind &&
      kind.startsWith('wood:') &&
      'wood' in p.piece &&
      b.w !== b.d &&
      (b.w > b.d) === (f.w > f.d) &&
      overlaps(b, f) &&
      !hidden;
    if (b.z > z + h) return undefined;
    if (b.z + b.h >= z || post || under) return 'at';
    return hidden ? undefined : 'low';
  };
  // les bords, chacun avec sa priorité : à égalité de distance, d'abord ceux d'une pareille voisine à sa hauteur (la planche s'aligne sur
  // la rangée voisine plutôt que sur le bout d'une solive dessous ; chantier « maison du coq »), puis les autres dans l'ordre de pose
  const edges = pieces.flatMap((p) => {
    const lv = level(p);
    if (!lv) return [];
    const [b, s] = [boxOf(p), solidOf(p)];
    const below = kind && b.z + b.h > z && kindOf(p.piece) === kind ? 0 : 1;
    // une voisine : à sa hauteur, ou à sa base à côté d'elle, ou, pour du bois, le bois qui la porte (la solive suit le joint de la
    // muraillère) ; pas ce qui porte un objet, dessous (le conduit sous le couronnement)
    const beside = lv === 'at' && h > 0 && (b.z + b.h > z || !overlaps(b, f) || (!!kind?.startsWith('wood:') && 'wood' in p.piece));
    return (s.w === b.w && s.d === b.d ? [b] : [b, s]).map((e) => ({ ...e, below, low: lv === 'low', beside }));
  });
  // les écarts vers les bords d'un axe : ceux qui aimantent ; un bord plus bas, seulement nul et sans voisine à portée
  const deltas = (list: { d: number[]; below: number; low: boolean; beside: boolean }[]): [number, number][] => {
    const near = list.some((o) => o.beside && o.d.some((d) => Math.abs(d) <= reach));
    return list.flatMap((o) => (o.low ? (near ? [] : o.d.filter((d) => d === 0)) : o.d).map((d) => [d, o.below] as [number, number]));
  };
  const hits = (b: { x: number; y: number; w: number; d: number }) => h > 0 && boxes.some((o) => overlaps(o, b) && o.z < z + h && z < o.z + o.h);
  // les décalages possibles, du plus petit au plus grand (à égalité, la voisine d'abord) ; sans bord à portée, aucun
  const nearest = (deltas: [number, number][]) => {
    const near = deltas.filter(([d]) => Math.abs(d) <= reach).sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]) || a[1] - b[1]);
    return near.length ? near.map(([d]) => d) : [0];
  };
  // en x : les pièces à moins d'une grille en y ; puis en y : à moins d'une grille en x, une fois décalée en x
  const xs = nearest(
    deltas(
      edges
        .filter((o) => o.y < f.y + f.d + BUILD.grid && f.y < o.y + o.d + BUILD.grid)
        .map((o) => ({ ...o, d: [o.x + o.w - f.x, o.x - (f.x + f.w), o.x - f.x, o.x + o.w - (f.x + f.w)] })),
    ),
  );
  const ys = (g: F) =>
    nearest(
      deltas(
        edges
          .filter((o) => o.x < g.x + g.w + BUILD.grid && g.x < o.x + o.w + BUILD.grid)
          .map((o) => ({ ...o, d: [o.y + o.d - g.y, o.y - (g.y + g.d), o.y - g.y, o.y + o.d - (g.y + g.d)] })),
      ),
    );
  const at = (dx: number, dy: number) => ({ ...f, x: f.x + dx, y: f.y + dy });
  const ysAt = (dx: number) => ys({ ...f, x: f.x + dx });
  // l'aimant ne décroche pas la pièce de ce qui la porte (`keep` : la muraillère sur la retraite du mur, pas collée au bord d'à côté)
  let first = at(xs[0], ysAt(xs[0])[0]);
  if (keep && !keep(first)) {
    const held = xs.flatMap((dx) => ysAt(dx).map((dy) => at(dx, dy))).find((c) => keep(c) && !hits(c));
    if (held) first = held;
  }
  if (!hits(first)) return first;
  // une pièce trapue (la bande de 10 cm entre un poteau et une huisserie, chantier « maison-2 ») : la place qui tient la moins éloignée,
  // dans un sens ou dans l'autre, de préférence encore portée à la hauteur visée (glisser hors de ce qui la porte la ferait tomber)
  if (Math.max(f.w, f.d) < 2 * Math.min(f.w, f.d)) {
    let best: F | undefined;
    let cost = Infinity;
    for (const dx of [...xs, 0]) {
      for (const dy of [...ysAt(dx), 0]) {
        const c = at(dx, dy);
        const m = Math.abs(dx) + Math.abs(dy) + (z > 0 && supportAt(pieces, c) !== z ? 1000 : 0);
        if (m < cost && !hits(c)) [best, cost] = [c, m];
      }
    }
    return best ?? first;
  }
  // la place la plus proche qui tient : d'abord en glissant le long de la pièce (un remplissage nord-sud entre ses poteaux, en y),
  // puis par tous les couples de bords
  if (f.d > f.w) {
    for (const dy of [...ysAt(xs[0]), 0]) if (!hits(at(xs[0], dy))) return at(xs[0], dy);
  } else {
    for (const dx of [...xs, 0]) if (!hits(at(dx, ysAt(dx)[0]))) return at(dx, ysAt(dx)[0]);
  }
  for (const dx of [...xs, 0]) for (const dy of [...ysAt(dx), 0]) if (!hits(at(dx, dy))) return at(dx, dy);
  return first;
}

/**
 * Une pièce mince posée contre la face d'une pièce plus large (même hauteur) se centre sur elle, le long de cette face : le volet
 * contre le remplissage à fenêtre, dont la baie est au milieu de la travée (hors de la grille de 20 cm). Sinon telle quelle.
 */
export function centerOnFace<B extends Box3>(pieces: readonly BuildPlaced[], b: B): B {
  const ew = b.w >= b.d;
  for (const p of pieces) {
    const o = solidOf(p);
    if (!(o.z < b.z + b.h && b.z < o.z + o.h)) continue;
    if (ew && (o.y === b.y + b.d || o.y + o.d === b.y) && o.w > b.w && b.x < o.x + o.w && o.x < b.x + b.w) return { ...b, x: Math.round(o.x + (o.w - b.w) / 2) };
    if (!ew && (o.x === b.x + b.w || o.x + o.w === b.x) && o.d > b.d && b.y < o.y + o.d && o.y < b.y + b.d) return { ...b, y: Math.round(o.y + (o.d - b.d) / 2) };
  }
  return b;
}

/** Les pièces sur lesquelles repose celle-ci : leur dessus est à sa base et leurs emprises se recouvrent. */
export function supportsOf(pieces: readonly BuildPiece[], p: BuildPlaced): BuildPiece[] {
  const b = boxOf(p);
  if (b.z === 0) return [];
  return pieces.filter((q) => q !== p && topOf(boxOf(q)) === b.z && overlaps(boxOf(q), b));
}

/** Les pièces qui reposent directement sur celle-ci. */
export function carriedBy(pieces: readonly BuildPiece[], id: number): BuildPiece[] {
  const p = pieces.find((q) => q.id === id);
  if (!p) return [];
  const b = boxOf(p);
  return pieces.filter((q) => q.id !== id && q.z === topOf(b) && overlaps(boxOf(q), b));
}

/** La pièce et tout ce qui repose dessus, de proche en proche (retirer une pile entière). */
export function withAbove(pieces: readonly BuildPiece[], id: number): BuildPiece[] {
  const out = new Map<number, BuildPiece>();
  const todo = [id];
  while (todo.length) {
    const i = todo.pop()!;
    const p = pieces.find((q) => q.id === i);
    if (!p || out.has(i)) continue;
    out.set(i, p);
    for (const q of carriedBy(pieces, i)) todo.push(q.id);
  }
  return [...out.values()];
}

/**
 * Profondeur d'affichage de chaque pièce (px) : le bord sud de son emprise au sol (comme les pieds d'un personnage), puis la hauteur
 * pour départager deux pièces au même bord sud ; une pièce est toujours dessinée après celles qui la portent (une pierre posée au
 * fond d'une dalle passe devant la dalle).
 *
 * `caps` (px, par identifiant) : le mur du fond d'une pièce close (`backCaps` de world/interior.ts) ne passe jamais devant ce qui est
 * dans la pièce, quoi qui le porte (règle de Grégoire, CONCEPTION « Les intérieurs ») : une pièce plafonnée qui dépasse son plafond y
 * est ramenée, juste derrière la face intérieure du mur, en gardant l'ordre de ce qui porte et de ce qui est porté (la profondeur
 * relevée ne fait plus que départager, au dix-millième).
 */
export function depthsOf(pieces: readonly BuildPiece[], caps?: ReadonlyMap<number, number>): Map<number, number> {
  const out = new Map<number, number>();
  const sorted = [...pieces].sort((a, b) => a.z - b.z);
  for (const p of sorted) {
    const b = boxOf(p);
    let d = (b.y + b.d) / CM_PER_PX + b.z / 100000;
    for (const s of supportsOf(pieces, p)) d = Math.max(d, (out.get(s.id) ?? 0) + 0.001);
    out.set(p.id, d);
  }
  if (caps?.size) {
    for (const [id, d] of out) {
      const cap = caps.get(id);
      if (cap !== undefined && d > cap) out.set(id, cap + d / 10000);
    }
  }
  return out;
}

/**
 * Une pièce a un corps : un objet du monde qui a une collision (ou une pièce de bois), sauf un dessus qui se marche (la planche du
 * plancher, la dalle, la marche : on le franchit par la règle du pas, world/decks.ts). Son corps ne bloque qu'à sa hauteur, de sa base
 * à son dessus (`sliceOf`, `sliceHits`) : le lit de l'étage ne barre pas la salle dessous (chantier « maison du coq »).
 */
export function blocks(p: BuildPlaced): boolean {
  if ('item' in p.piece) return false;
  if ('wood' in p.piece) return !(p.piece.wood.axis !== 'up' && lookDef(p.piece.wood.size, lookOf(p.piece.wood)).walk);
  const def = props[p.piece.prop];
  return !!(def.body || def.bodies) && def.layer !== 'floor' && (!def.walk || !!def.wall);
}

/** La tranche de hauteur où une pièce bloque (cm) : de sa base à son dessus. */
export function sliceOf(p: BuildPlaced): [number, number] {
  const b = solidOf(p);
  return [b.z, b.z + b.h];
}

/** Une tranche [base, dessus] croise-t-elle le corps de qui a les pieds à `z` (cm) et `height` de haut ? */
export function sliceHits(slice: readonly [number, number] | undefined, z: number, height = BUILD.head): boolean {
  return !slice || (slice[0] < z + height && z < slice[1]);
}

/** Une pièce s'efface au-dessus de Xéros : sa base au-dessus de sa tête (BUILD.head) et son emprise, à `margin` cm près, sur ses pieds. */
export function overHead(p: BuildPlaced, feetX: number, feetY: number, margin = 0): boolean {
  const b = boxOf(p);
  return b.z >= BUILD.head && feetX >= b.x - margin && feetX <= b.x + b.w + margin && feetY >= b.y - margin && feetY <= b.y + b.d + margin;
}

/**
 * Le sens suivant d'une pièce (R) : un quart de tour de plus dans sa symétrie ; la pièce de bois couchée passe d'est-ouest à
 * nord-sud, puis debout si son aspect se dresse, puis revient est-ouest.
 */
export function turned(ref: BuildRef, view: number): { ref: BuildRef; view: number } {
  if (!('wood' in ref)) return { ref, view: (view + 1) % viewsOf(ref) };
  const w = ref.wood;
  if (w.axis === 'ew') return { ref: { wood: turnedWood(w) }, view: 0 };
  if (w.axis === 'ns') {
    const look = lookDef(w.size, lookOf(w));
    if (look.up && w.shape === 'round') {
      return { ref: { wood: { ...w, axis: 'up' } }, view: 0 };
    }
    return { ref: { wood: turnedWood(w) }, view: 0 };
  }
  return { ref: { wood: { ...w, axis: 'ew' } as WoodPiece }, view: 0 };
}

/** Le côté du dehors d'une pièce dans sa vue : sud dans la vue 0, puis un quart de tour dans le sens des aiguilles d'une montre. */
export const OUTWARD: readonly [number, number][] = [
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 0],
];

/** Un point tourné d'un quart autour de (cx, cy), dans le sens des aiguilles d'une montre à l'écran (`cw`) ou dans l'autre. */
function quarter(x: number, y: number, cx: number, cy: number, cw: boolean): [number, number] {
  const dx = x - cx;
  const dy = y - cy;
  return cw ? [cx - dy, cy + dx] : [cx + dy, cy - dx];
}

/** Le coin nord-ouest d'un rectangle au sol tourné d'un quart autour d'un point. */
function quarterBox(b: { x: number; y: number; w: number; d: number }, cx: number, cy: number, cw: boolean): { x: number; y: number } {
  const a = quarter(b.x, b.y, cx, cy, cw);
  const c = quarter(b.x + b.w, b.y + b.d, cx, cy, cw);
  return { x: Math.min(a[0], c[0]), y: Math.min(a[1], c[1]) };
}

/**
 * Ce qui s'ouvre et se ferme (`swing` de props.json : le volet, le volet d'étal) : sa place dans son autre état, ou rien si la pièce
 * ne bat pas. `side` : le bord gauche de sa face du dehors, vu du dehors, est le gond ; ouvrir, c'est tourner d'un quart vers le
 * dehors autour de lui (la vue suivante), fermer le tour inverse (le gond est le coin de la boîte ouverte qui, refermé puis rouvert,
 * la redonne). `bottom` : le bas de sa face du dehors est le gond ; ouvert, l'objet est contre sa face du dehors, centré, son dessus à
 * la hauteur de la base du fermé ; fermé, le fermé est contre le bord du dedans de l'ouvert, sa base sur le dessus de l'ouvert.
 */
export function swung(p: BuildPlaced): BuildPlaced | undefined {
  if (!('prop' in p.piece)) return undefined;
  const s = props[p.piece.prop].swing;
  if (!s || !props[s.into]) return undefined;
  const into = { prop: s.into };
  const n = viewsOf(p.piece);
  const b = boxOf(p);
  if (s.hinge === 'side') {
    const open = (q: BuildPlaced): BuildPlaced => {
      const qb = boxOf(q);
      const [qx, qy] = OUTWARD[q.view % 4];
      // le gond : au bout gauche de la face du dehors (vu du dehors, la gauche est (−qy, qx))
      const fx = qb.x + qb.w / 2 + (qx * qb.w) / 2;
      const fy = qb.y + qb.d / 2 + (qy * qb.d) / 2;
      const half = qx ? qb.d / 2 : qb.w / 2;
      return { ...q, ...quarterBox(qb, fx - qy * half, fy + qx * half, true), view: (q.view + 1) % n };
    };
    if (!s.open) return { ...open(p), piece: into };
    // fermer : le coin de la boîte ouverte autour duquel elle se referme
    for (const [cx, cy] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.d], [b.x + b.w, b.y + b.d]]) {
      const closed: BuildPlaced = { ...p, piece: into, ...quarterBox(b, cx, cy, false), view: (p.view + n - 1) % n };
      const again = open({ ...closed, piece: p.piece });
      if (again.x === p.x && again.y === p.y) return closed;
    }
    return undefined;
  }
  const [ox, oy] = OUTWARD[p.view % 4];
  const t = sizeOf(into, p.view);
  // `double` : les deux battants ouverts sortent de la face du dehors ; la boîte ouverte est contre elle, de la même largeur, et le
  // fermé revient contre le bord du dedans de l'ouvert, à la même hauteur
  if (s.hinge === 'double') {
    const x = ox > 0 ? (s.open ? b.x - t.w : b.x + b.w) : ox < 0 ? (s.open ? b.x + b.w : b.x - t.w) : b.x;
    const y = oy > 0 ? (s.open ? b.y - t.d : b.y + b.d) : oy < 0 ? (s.open ? b.y + b.d : b.y - t.d) : b.y;
    return { ...p, piece: into, x, y };
  }
  // `bottom` : rabattu contre la face du dehors (centré le long de la face)
  if (!s.open) {
    const x = ox > 0 ? b.x + b.w : ox < 0 ? b.x - t.w : b.x + Math.round((b.w - t.w) / 2);
    const y = oy > 0 ? b.y + b.d : oy < 0 ? b.y - t.d : b.y + Math.round((b.d - t.d) / 2);
    return { ...p, piece: into, x, y, z: Math.max(0, b.z - t.h) };
  }
  const x = ox > 0 ? b.x - t.w : ox < 0 ? b.x + b.w : b.x + Math.round((b.w - t.w) / 2);
  const y = oy > 0 ? b.y - t.d : oy < 0 ? b.y + b.d : b.y + Math.round((b.d - t.d) / 2);
  return { ...p, piece: into, x, y, z: b.z + b.h };
}

/** Une zone choisie au sol, en cm : coin nord-ouest et dimensions. */
export interface Area {
  x: number;
  y: number;
  w: number;
  d: number;
}

/**
 * Le plan d'un groupe de pièces : celles dont l'emprise recoupe la zone, placées depuis le coin nord-ouest de leur ensemble (sur la
 * grille) et la base de la plus basse ; un tirage d'élément calculé n'est pas gardé (chaque pose en tire un nouveau). Undefined
 * si la zone est vide.
 */
export function planOf(pieces: readonly BuildPiece[], area: Area, name: string, joints: readonly { type: JointType; a: number; b: number; top?: number }[] = []): BuildPlan | undefined {
  const inside = pieces.filter((p) => overlaps(boxOf(p), area));
  if (!inside.length) return undefined;
  const boxes = inside.map(boxOf);
  const ox = Math.min(...boxes.map((b) => b.x));
  const oy = Math.min(...boxes.map((b) => b.y));
  const oz = Math.min(...boxes.map((b) => b.z));
  const w = Math.max(...boxes.map((b) => b.x + b.w)) - ox;
  const d = Math.max(...boxes.map((b) => b.y + b.d)) - oy;
  // de bas en haut, puis du nord au sud : l'ordre où on les reposera
  const order = inside.map((p, i) => ({ p, b: boxes[i] })).sort((a, b) => a.b.z - b.b.z || a.b.y - b.b.y || a.b.x - b.b.x);
  // les assemblages dont les deux pièces sont dans la zone, par le rang de leurs pièces dans le plan
  const rank = new Map(order.map(({ p }, i) => [p.id, i]));
  const kept = joints
    .filter((j) => rank.has(j.a) && rank.has(j.b))
    .map((j) => ({ type: j.type, a: rank.get(j.a)!, b: rank.get(j.b)!, ...(j.top !== undefined ? { top: rank.get(j.top)! } : {}) }));
  // un seul âge pour tout son bois : le plan le fixe, ses pièces ne le répètent pas ; sinon chacune garde le sien
  const ages = new Set(inside.map(ageOf).filter((a) => a !== undefined));
  const one = ages.size === 1 ? [...ages][0] : undefined;
  return {
    name,
    size: { w, d },
    ...(one ? { age: one } : {}),
    ...(kept.length ? { joints: kept } : {}),
    pieces: order.map(({ p }) => {
      const q: BuildPlaced = {
        piece: structuredClone(p.piece),
        x: p.x - ox,
        y: p.y - oy,
        z: p.z - oz,
        view: p.view,
        ...(p.natural ? { natural: { ...p.natural } } : {}),
        ...(p.age ? { age: p.age } : {}),
      };
      return one ? withAge(q, 'new') : q;
    }),
  };
}

/** La boîte englobante d'un plan, posée au sol en (0, 0, 0) : son emprise et la hauteur de son plus haut dessus. */
export function planSize(plan: BuildPlan): Size3 {
  return { w: plan.size.w, d: plan.size.d, h: Math.max(...plan.pieces.map((p) => topOf(boxOf(p)))) };
}

/** Les pièces d'un plan posé avec son coin nord-ouest en (x, y) et sa base à la hauteur z. */
export function planPieces(plan: BuildPlan, at: { x: number; y: number; z: number }): BuildPlaced[] {
  return plan.pieces.map((p) => {
    const q = { ...structuredClone(p), x: p.x + at.x, y: p.y + at.y, z: p.z + at.z };
    // l'âge du plan l'emporte sur celui de chaque pièce : un bâtiment d'un seul âge
    return plan.age ? withAge(q, plan.age) : q;
  });
}

/**
 * Ce qui ne va pas dans un plan du bac à sable (pièces disparues du contenu, sens impossibles), décrit en français. Les positions ne
 * sont pas forcément sur la grille : une pièce aimantée au bord d'une voisine (le solin de 50 cm d'épaisseur) en sort.
 */
export function planProblems(plan: BuildPlan): string[] {
  const out: string[] = [];
  for (const j of plan.joints ?? []) if (!plan.pieces[j.a] || !plan.pieces[j.b] || j.a === j.b) out.push(`assemblage ${j.type} : pièces ${j.a} et ${j.b} introuvables`);
  plan.pieces.forEach((p, i) => {
    const at = `pièce ${i + 1}`;
    const missing = refMissing(p.piece);
    if (missing) return out.push(`${at} : ${missing} n'existe pas`);
    if (p.view >= viewsOf(p.piece)) out.push(`${at} : sens ${p.view}, l'objet n'en a que ${viewsOf(p.piece)}`);
    if ('prop' in p.piece && p.variant !== undefined && p.variant >= (props[p.piece.prop].variants ?? 1)) out.push(`${at} : tirage ${p.variant} inconnu`);
    if (p.age && !('wood' in p.piece) && !ageable(p.piece)) out.push(`${at} : un âge (${p.age}), mais ce n'est pas un objet de bois (\`aged\`)`);
    if ('wood' in p.piece && p.age) out.push(`${at} : la pièce de bois garde son âge dans \`wood.age\`, pas dans \`age\``);
    if ('prop' in p.piece && p.piece.length !== undefined) {
      const { grid } = WALL_PIECE;
      const min = wallMin(props[p.piece.prop].wall ?? '');
      if (!props[p.piece.prop].wall) out.push(`${at} : une longueur (${p.piece.length} cm), mais ce n'est pas un morceau de mur (\`wall\`)`);
      else if (p.piece.length % grid || p.piece.length < min) out.push(`${at} : un morceau de mur de ${p.piece.length} cm, hors de la grille (multiple de ${grid}, au moins ${min})`);
    }
  });
  return out;
}
