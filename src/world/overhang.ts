// Le porte-à-faux (chantier « maison-2 », Grégoire : aucune pièce posée au-dessus du vide) : chaque pièce posée au-dessus du sol est
// portée, sans Phaser. Le moteur pose une pièce sur le plus haut dessus que recoupe son emprise (`aimAt`, `supportAt` de build.ts) : il
// accepte un poteau dont seul le bout d'une traverse est dessous ; ce contrôle le signale, sur tous les plans du dépôt (validate.ts).
//  A. en l'air : au-dessus du sol, rien dessous (un volet, accroché contre une face, ne compte pas) ;
//  B. une pièce rigide (tout ce qui n'enjambe pas) est portée sur toute sa longueur (à `GAP` cm près) ; ce qui pivote (une porte, un
//     volet) pend à ses gonds et n'a qu'à toucher ce qui le porte ;
//  C. une pièce qui enjambe (le bois couché ; les pentes des toits sont laissées au moteur) a un appui à chacun de ses bouts (à
//     max(`END` cm, ¼ de sa longueur) près) ; des pièces entées comptent pour une seule ;
//  D. une charge sur un vide : une pièce rigide posée sur une pièce de bois qui enjambe et qui repose sur de la maçonnerie (la traverse
//     basse sur le solin) a un appui sous elle, au droit de la charge (le poteau au-dessus d'un trou du solin) ; une pièce de pierre qui
//     enjambe (l'arc, le linteau de pierre) porte ce qu'on pose dessus ;
//  E. l'enture d'une pièce portée par plus de deux poteaux (la sablière, le long d'un mur) tombe sur un poteau ;
//  F. ce qui est fixé au mur (`mount: "wall"` : une tenture, une console scellée) est porté par la maçonnerie dont il touche la face.

import { props } from '../content';
import type { BuildPlan } from '../content/types';
import { solidOf, type Box3, type BuildPiece } from './build';

/** Un vide plus petit ne compte pas (cm) : le contour des pièces, les arrondis de la grille. */
const GAP = 5;
/** La part d'une pièce qui enjambe qu'on laisse dépasser de son dernier appui (cm, au moins) : l'about d'une poutre. */
const END = 30;

type Joint = NonNullable<BuildPlan['joints']>[number];

const top = (b: Box3) => b.z + b.h;
const cross = (a: Box3, b: Box3) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
const propOf = (p: BuildPiece) => ('prop' in p.piece ? props[p.piece.prop] : undefined);
const isRoof = (p: BuildPiece) => !!(propOf(p)?.roof || propOf(p)?.pitch);
/** Une pièce qui enjambe ce qui la porte : le bois couché, ou ce qui franchit un vide (`spans` de props.json : la tête de baie). */
const spans = (p: BuildPiece) => ('wood' in p.piece && p.piece.wood.axis !== 'up') || !!propOf(p)?.spans;
const isPost = (p: BuildPiece) => 'wood' in p.piece && p.piece.wood.axis === 'up';
/** La maçonnerie (le solin, une dalle, un seuil) : une pièce de pierre. */
const masonry = (p: BuildPiece) => {
  const d = propOf(p);
  const m = d?.mass;
  return !!d && (!!d.wall || m === 'stone' || (typeof m === 'object' && 'matter' in m && m.matter === 'stone'));
};

/** Les intervalles de [lo, hi[ que la liste ne couvre pas. */
function holes(lo: number, hi: number, cover: readonly [number, number][]): [number, number][] {
  const c = cover.map(([a, b]) => [Math.max(lo, a), Math.min(hi, b)] as [number, number]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  let x = lo;
  for (const [a, b] of c) {
    if (a > x) out.push([x, a]);
    x = Math.max(x, b);
  }
  if (x < hi) out.push([x, hi]);
  return out;
}

/** Le nom d'une pièce, pour un message. */
export function pieceName(p: BuildPiece): string {
  if ('prop' in p.piece) return p.piece.prop;
  if ('item' in p.piece) return p.piece.item;
  const w = p.piece.wood;
  return `bois ${w.size} ${w.hewn ? 'équarri' : w.shape} ${w.axis} ${w.length} cm`;
}

/** Ce qui est posé au-dessus du vide dans ces pièces (et leurs assemblages, par rang), un message par défaut ; vide si tout est porté. */
export function overhangs(pieces: readonly BuildPiece[], joints: readonly Joint[] = []): string[] {
  const S = pieces.map(solidOf);
  const at = (i: number) => `n° ${i} ${pieceName(pieces[i])} (x ${S[i].x}–${S[i].x + S[i].w}, y ${S[i].y}–${S[i].y + S[i].d}, z ${S[i].z})`;
  // un assemblage (tenon, mi-bois, encoche) porte la pièce du dessus dans celle du dessous
  const partners = new Map<number, number[]>();
  for (const j of joints) {
    if (j.type === 'scarf' || !S[j.a] || !S[j.b]) continue;
    const hi = S[j.a].z >= S[j.b].z ? j.a : j.b;
    const lo = hi === j.a ? j.b : j.a;
    partners.set(hi, [...(partners.get(hi) ?? []), lo]);
  }
  const supportsOf = (i: number) => [...new Set([...S.map((_, j) => j).filter((j) => j !== i && top(S[j]) === S[i].z && cross(S[j], S[i])), ...(partners.get(i) ?? [])])];
  /** Accrochée contre une face : ce qui bat sans être une porte (le volet), contre la face d'une pièce à sa hauteur. */
  const hangs = (i: number) => {
    const sw = propOf(pieces[i])?.swing;
    if (!sw || sw.passage) return false;
    const b = S[i];
    return S.some((o, j) => j !== i && o.z < b.z + b.h && b.z < o.z + o.h && (((o.y === b.y + b.d || o.y + o.d === b.y) && o.x < b.x + b.w && b.x < o.x + o.w) || ((o.x === b.x + b.w || o.x + o.w === b.x) && o.y < b.y + b.d && b.y < o.y + o.d)));
  };
  /** Fixée au mur (`mount` de props.json) : sa face contre la face d'une maçonnerie, à sa hauteur (à GAP cm près). */
  const mounted = (i: number) => {
    if (propOf(pieces[i])?.mount !== 'wall') return false;
    const b = S[i];
    const near = (a: number, c: number) => Math.abs(a - c) <= GAP;
    return S.some((o, j) => {
      if (j === i || !masonry(pieces[j]) || !(o.z < b.z + b.h && b.z < o.z + o.h)) return false;
      const alongX = o.x < b.x + b.w && b.x < o.x + o.w;
      const alongY = o.y < b.y + b.d && b.y < o.y + o.d;
      return (alongX && (near(o.y + o.d, b.y) || near(o.y, b.y + b.d))) || (alongY && (near(o.x + o.w, b.x) || near(o.x, b.x + b.w)));
    });
  };
  const chainOf = (i: number) => {
    const chain = [i];
    for (let k = 0; k < chain.length; k++) for (const j of joints) if (j.type === 'scarf') for (const [a, c] of [[j.a, j.b], [j.b, j.a]]) if (a === chain[k] && !chain.includes(c)) chain.push(c);
    return chain;
  };
  const out: string[] = [];
  pieces.forEach((p, i) => {
    const b = S[i];
    if (b.z === 0 || mounted(i)) return;
    const sup = supportsOf(i);
    if (!sup.length) {
      if (!hangs(i)) out.push(`${at(i)} : en l'air, rien dessous`);
      return;
    }
    // un toit : sa pente est laissée au moteur ; ce qui pivote (porte, volet) pend à ses gonds, il n'a pas à reposer sur toute sa largeur
    if (isRoof(p) || propOf(p)?.swing) return;
    const ew = b.w >= b.d;
    const proj = (j: number, alongEw = ew): [number, number] => (alongEw ? [S[j].x, S[j].x + S[j].w] : [S[j].y, S[j].y + S[j].d]);
    if (spans(p)) {
      const chain = chainOf(i);
      if (Math.min(...chain) !== i) return;
      const lo = Math.min(...chain.map((k) => proj(k)[0]));
      const hi = Math.max(...chain.map((k) => proj(k)[1]));
      const cov = chain.flatMap((k) => supportsOf(k)).map((j) => proj(j));
      const reach = Math.max(END, (hi - lo) / 4);
      const start = cov.some(([a]) => a <= lo + reach);
      const end = cov.some(([, c]) => c >= hi - reach);
      if (!start || !end) out.push(`${at(i)} : ${[!start && 'son bout ouest ou nord', !end && 'son bout est ou sud'].filter(Boolean).join(' et ')} dans le vide`);
      return;
    }
    const [lo, hi] = ew ? [b.x, b.x + b.w] : [b.y, b.y + b.d];
    // un débord voulu aux bouts (`ledge` de props.json : le larmier du couronnement) n'est pas un vide
    const ledge = propOf(p)?.ledge ?? 0;
    const h = holes(lo, hi, sup.map((j) => proj(j))).filter(([a, c]) => c - a > GAP && !(ledge && c - a <= ledge && (a === lo || c === hi)));
    if (h.length) out.push(`${at(i)} : au-dessus du vide en ${h.map(([a, c]) => `${a}–${c}`).join(', ')} (${ew ? 'x' : 'y'})`);
    // une charge sur une pièce qui enjambe et repose sur de la maçonnerie : un appui sous elle, au droit de la charge
    // (une pièce de pierre qui enjambe, l'arc de la porte, le linteau de pierre d'une baie, porte ce qu'on pose dessus : c'est son office)
    for (const j of sup.filter((k) => spans(pieces[k]) && !masonry(pieces[k]) && supportsOf(k).length > 0 && supportsOf(k).every((m) => masonry(pieces[m])))) {
      const sEw = S[j].w >= S[j].d;
      const [l3, h3] = sEw ? [Math.max(b.x, S[j].x), Math.min(b.x + b.w, S[j].x + S[j].w)] : [Math.max(b.y, S[j].y), Math.min(b.y + b.d, S[j].y + S[j].d)];
      const hv = holes(l3, h3, supportsOf(j).map((k) => proj(k, sEw))).filter(([a, c]) => c - a > GAP);
      if (hv.length) out.push(`${at(i)} : posée sur ${at(j)}, qui n'a rien dessous en ${hv.map(([a, c]) => `${a}–${c}`).join(', ')} (${sEw ? 'x' : 'y'})`);
    }
  });
  // les entures en hauteur : sur ce qui les porte ; sur un poteau, si la pièce entée est portée par des poteaux (la sablière)
  for (const j of joints) {
    if (j.type !== 'scarf' || !S[j.a] || !S[j.b]) continue;
    const [p, q] = [S[j.a], S[j.b]];
    if (p.z === 0) continue;
    const ew = p.w >= p.d && q.w >= q.d;
    const x = ew ? (p.x + p.w === q.x ? q.x : p.x) : p.y + p.d === q.y ? q.y : p.y;
    const under = S.map((_, k) => k).filter((k) => top(S[k]) === p.z && (ew ? S[k].x <= x && x <= S[k].x + S[k].w && S[k].y < p.y + p.d && p.y < S[k].y + S[k].d : S[k].y <= x && x <= S[k].y + S[k].d && S[k].x < p.x + p.w && p.x < S[k].x + S[k].w));
    // seulement une pièce entée portée par des poteaux sur sa longueur, plus de deux (la sablière, le long d'un mur) : un entrait,
    // posé d'un mur à l'autre sur un poteau à chaque bout, est une autre affaire (la grange)
    const posts = new Set(chainOf(j.a).flatMap((k) => supportsOf(k).filter((m) => isPost(pieces[m]))));
    const onPosts = posts.size > 2;
    if (!onPosts) continue;
    if (!under.length) out.push(`enture de ${at(j.a)} et n° ${j.b} à ${ew ? 'x' : 'y'} ${x} : rien dessous`);
    else if (onPosts && !under.some((k) => isPost(pieces[k]))) out.push(`enture de ${at(j.a)} et n° ${j.b} à ${ew ? 'x' : 'y'} ${x} : entre deux poteaux, sur ${under.map((k) => pieceName(pieces[k])).join(', ')}`);
  }
  return out;
}
