// Le fagot (`faggot`, fiche docs/objets/faggot.md) : dix branches sèches serrées par un lien de chanvre.
//
// Gabarit : cylindre de 130 cm de long, Ø 50 cm, contour compris.
// - Est-ouest (`faggot`) : 26 px de long, 11 de haut (Ø × 1,12) ; bouts en ovales de 5 × 10.
// - Nord-sud (`faggot-ns`, tas tourné) : règle D (docs/STYLE.md section 8), la silhouette de l'est-ouest inversée, 13 × 27
//   (rameaux compris) : le faisceau couché du nord au sud dans toute sa longueur, la face des gros bouts en bande au sud
//   (11 × 5, Ø × Ø/2), les pointes au nord, les rameaux qui dépassent à l'ouest, le lien en travers au milieu.
//
// Matière : celle de la branche (art/items/branch.ts) : bois sec M m N K, bout cassé clair (U u). Le faisceau se lit en
// brins couchés dans le sens de la longueur : chaque rangée est une suite de branches (une fente sombre entre deux),
// éclairée en haut (M), dans l'ombre en bas (N K). Ce qui le distingue de la bille (écorce, cernes) : les gros bouts
// des branches au bout gauche (des points de bois clair dans le noir des interstices), les pointes et des rameaux qui
// dépassent au bout droit et sur le dessus, et le lien de corde (art/items/rope.ts) qui le serre et le pince au milieu.
// Contour : N côté lumière, comme la branche ; OUTLINE en bas et à droite.

import { Canvas, EMPTY, rng } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { darkest, outline } from '../items/lib';

/** Teinte du bois en travers du faisceau, `s` de 0 (bord éclairé) à 1 (bord dans l'ombre). */
const tone = (s: number) => (s < 0.25 ? 'M' : s < 0.66 ? 'm' : s < 0.88 ? 'N' : 'K');
/** Un cran plus sombre (fente entre deux branches). */
const DARKER: Record<string, string> = { M: 'm', m: 'N', N: 'K', K: 'K' };
/** Le lien en travers du faisceau : chanvre clair du côté de la lumière, sombre de l'autre. */
const rope = (s: number) => (s < 0.34 ? 'J' : s < 0.72 ? 'O' : 'C');
/** Contour côté lumière : la teinte la plus sombre de chaque matière. */
const DARK = darkest({ M: 'N', m: 'N', N: 'K', K: 'K', U: 'N', u: 'N', J: 'X', O: 'X', C: 'X' }, 'N');

/**
 * Face des gros bouts, ovale (centre cx, cy ; demi-axes rx, ry) : les bouts cassés des branches serrées, bois clair
 * (U côté lumière, u ailleurs), et entre eux les interstices, des points sombres en quinconce une rangée sur deux (N, K
 * dans l'ombre). Le bord de l'ovale, où les branches du dehors tournent, est un cran plus sombre (u, N).
 */
function buttEnds(c: Canvas, cx: number, cy: number, rx: number, ry: number) {
  const y0 = Math.floor(cy - ry);
  const inside = (X: number, Y: number) => ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  const out: [number, number, string][] = [];
  for (let Y = y0; Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
    if (!inside(X, Y) || c.get(X, Y) === EMPTY) continue;
    const u = (X + 0.5 - cx) / rx, v = (Y + 0.5 - cy) / ry;
    const lit = u + v < 0;
    const row = Y - y0;
    const gap = row % 2 === 1 && (X + (row % 4 === 1 ? 0 : 1)) % 2 === 0;
    const rim = !inside(X + 1, Y) || !inside(X, Y + 1);
    out.push([X, Y, gap || (rim && !lit) ? (lit ? 'N' : 'K') : rim ? 'u' : lit ? 'U' : 'u']);
  }
  for (const [X, Y, k] of out) c.set(X, Y, k);
}

/**
 * Le faisceau couché est-ouest, sans contour, dans `c` : intérieur de `len` × `dia` px à partir de (x0, y0).
 * Une rangée sur deux est une branche (bois de sa teinte, le gros bout cassé clair à gauche, la pointe plus sombre à
 * droite), l'autre l'interstice entre deux branches, plus sombre, par tirets. Les branches n'ont pas toutes la même
 * longueur : les bouts sont inégaux, dans l'enveloppe d'un ovale (5 px de large avec le contour).
 * `twigs` : colonnes (depuis x0) des rameaux qui dépassent du dessus, penchés vers les pointes (à droite).
 */
export function bundleEW(c: Canvas, x0: number, y0: number, len: number, dia: number, seed: number, twigs: number[] = []): Canvas {
  const r = rng(seed);
  const a = 2; // demi-largeur de l'ovale d'un bout, sans le contour
  const ry = dia / 2;
  // retrait de l'ovale à chaque rangée
  const inset = (j: number) => {
    const v = (j + 0.5 - ry) / ry;
    return Math.round(a * (1 - Math.sqrt(Math.max(0, 1 - v * v))));
  };
  for (let j = 0; j < dia; j++) {
    const Y = y0 + j;
    const s = (j + 0.5) / dia;
    const stick = j % 2 === 0;
    const from = x0 + inset(j) + (stick ? Math.floor(r() * 2) : 1);
    const to = x0 + len - 1 - inset(j) - Math.floor(r() * 2) + (stick && r() < 0.35 ? 1 : 0);
    // interstice : des tirets sombres de 3 à 7 px, coupés de 1 ou 2 px de la teinte de la branche
    let dash = from + Math.floor(r() * 2), gap = -1;
    for (let X = from; X <= to; X++) {
      let k = tone(s);
      if (!stick) {
        if (X === dash) gap = dash + 4 + Math.floor(r() * 6);
        if (X >= dash && X < gap) k = DARKER[k];
        else if (X === gap) dash = X + 1;
      }
      c.set(X, Y, k);
    }
    if (stick) {
      // gros bout cassé, bois clair ; pointe un cran plus sombre
      c.set(from, Y, s < 0.5 ? 'U' : 'u');
      c.set(to, Y, DARKER[tone(s)]);
    } else c.set(from, Y, 'K');
  }
  // rameaux sur le dessus : deux pixels qui montent vers la droite
  for (const t of twigs) c.set(x0 + t, y0 - 1, 'm').set(x0 + t + 1, y0 - 2, 'm');
  // le lien, au milieu : deux colonnes de chanvre, le faisceau pincé dessus et dessous
  const mid = x0 + Math.floor(len / 2) - 1;
  for (const X of [mid - 1, mid, mid + 1, mid + 2]) { c.set(X, y0, EMPTY); c.set(X, y0 + dia - 1, EMPTY); }
  for (const X of [mid, mid + 1]) for (let Y = y0 + 1; Y < y0 + dia - 1; Y++) {
    const s = (Y - y0 + 0.5) / dia;
    c.set(X, Y, X === mid + 1 && s >= 0.34 ? 'C' : rope(s));
  }
  return c;
}

/**
 * Le faisceau vu par le bout (couché nord-sud, ou porté de profil), sans contour : dessus qui fuit vers le haut de
 * l'écran (brins en long, éclairés à gauche), rond du fond en haut (centre `back`), face des gros bouts en bas (centre
 * `front`), ovales de rx × ry. Le lien passe en travers du dessus, à la rangée `tie`.
 */
export function bundleByTheEnd(c: Canvas, cx: number, back: number, front: number, rx: number, ry: number, tie: number, seed: number): Canvas {
  const r = rng(seed);
  const inDisk = (X: number, Y: number, cy: number) => ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    const body = Math.abs(X + 0.5 - cx) <= rx && Y + 0.5 >= back && Y + 0.5 <= front;
    if (!body && !inDisk(X, Y, back) && !inDisk(X, Y, front)) continue;
    c.set(X, Y, tone((X + 0.5 - (cx - rx)) / (2 * rx)));
  }
  // fentes entre les branches, en long (vers le haut de l'écran) : deux couloirs
  for (const col of [Math.floor(cx - rx * 0.35), Math.floor(cx + rx * 0.3)]) {
    let Y = Math.floor(back - ry) + 1 + Math.floor(r() * 2);
    while (Y < front - 1) {
      const n = 2 + Math.floor(r() * 3);
      for (let i = 0; i < n && Y + i < front - 1; i++) { const k = c.get(col, Y + i); if (k !== EMPTY) c.set(col, Y + i, DARKER[k] ?? k); }
      Y += n + 2 + Math.floor(r() * 2);
    }
  }
  // rond du fond : les pointes, ébouriffées (un pixel sur deux du bord haut manque)
  for (let X = 0; X < c.w; X++) {
    let top = 0;
    while (top < c.h && c.get(X, top) === EMPTY) top++;
    if (top < c.h && X % 3 === 1) c.set(X, top, EMPTY);
  }
  // le lien en travers du dessus, une rangée, pincé sur les flancs
  for (let X = 0; X < c.w; X++) {
    if (c.get(X, tie) === EMPTY) continue;
    const s = (X + 0.5 - (cx - rx)) / (2 * rx);
    c.set(X, tie, rope(s));
  }
  for (const X of [Math.floor(cx - rx), Math.ceil(cx + rx) - 1]) { c.set(X, tie, EMPTY); c.set(X, tie + 1, EMPTY); c.set(X, tie - 1, EMPTY); }
  for (const X of [Math.floor(cx - rx) + 1, Math.ceil(cx + rx) - 2]) c.set(X, tie, rope((X + 0.5 - (cx - rx)) / (2 * rx)));
  // face des gros bouts
  buttEnds(c, cx, front, rx + 0.2, ry + 0.2);
  return c;
}

/** Contour du faisceau (N côté lumière, OUTLINE en bas et à droite). */
export const outlineBundle = (c: Canvas): Canvas => outline(c, DARK);

/** Ombre au sol : le corps contourné, décalé d'un pixel vers la droite et de `down` vers le bas, sur le vide. */
function dropShadow(c: Canvas, down: number, fromY = 0) {
  const body = Canvas.from(c.toGrid());
  for (let Y = fromY; Y < c.h; Y++) for (let X = 1; X < c.w; X++) {
    if (c.get(X, Y) === EMPTY && body.get(X - 1, Y - down) !== EMPTY && body.get(X - 1, Y - down) !== 'x') c.set(X, Y, 'x');
  }
}

/** Le fagot est-ouest, sans ombre : 26 × 11 px de silhouette (et ses rameaux), dans une image de 27 × 14. */
export const FAGGOT_TWIGS = [6, 16];
export function faggotBody(): Canvas {
  const c = new Canvas(27, 14);
  // intérieur de 24 × 9, contour autour : 26 × 11 ; les rameaux montent de deux rangées au-dessus
  bundleEW(c, 1, 3, 24, 9, 81, FAGGOT_TWIGS);
  return outlineBundle(c);
}

/** Le fagot est-ouest au sol : ombre sur les trois rangées sous la silhouette, décalée vers la droite. */
function faggot(): Canvas {
  const body = faggotBody();
  // deux rangées d'ombre sous la silhouette
  const c = new Canvas(28, 17);
  c.stamp(body.toGrid(), 0, 0);
  dropShadow(c, 2, 9);
  return trimTop(c);
}

/** Retire les rangées vides du haut et du bas, et les colonnes vides de droite : le bas de l'image est la dernière rangée d'ombre. */
function trimTop(c: Canvas): Canvas {
  let top = 0;
  while (top < c.h && c.px[top].every((k) => k === EMPTY)) top++;
  let right = c.w;
  while (right > 0 && c.px.every((row) => row[right - 1] === EMPTY)) right--;
  let bottom = c.h;
  while (bottom > top && c.px[bottom - 1].every((k) => k === EMPTY)) bottom--;
  return Canvas.from(c.toGrid().slice(top, bottom).map((row) => row.slice(0, right)));
}

/**
 * Le faisceau couché nord-sud, sans contour, dans `c` : intérieur de `dia` × `len` px à partir de (x0, y0), dessiné pour ce
 * sens (le faisceau de l'est-ouest tourné d'un quart de tour, sens inverse des aiguilles d'une montre : les gros bouts, à
 * l'ouest en est-ouest, viennent au sud, où l'on voit leur face, comme on voit le bout ouest d'une pièce est-ouest). Une
 * colonne sur deux est une branche (bois de sa teinte, éclairé à l'ouest, dans l'ombre à l'est), l'autre l'interstice, plus
 * sombre, par tirets. Au nord, les pointes inégales dans l'enveloppe du rond du fond, un cran plus sombres. Au sud, la face
 * des gros bouts (`buttEnds`), un ovale de dia × dia/2. `twigs` : rangées (depuis les gros bouts, vers le nord) des rameaux
 * qui dépassent du flanc ouest (le dessus de l'est-ouest), penchés vers les pointes. Le lien en travers au milieu, sur deux
 * rangées, le faisceau pincé sur ses flancs.
 */
export function bundleNS(c: Canvas, x0: number, y0: number, len: number, dia: number, seed: number, twigs: number[] = []): Canvas {
  const r = rng(seed);
  const rx = dia / 2;
  const ry = dia / 4; // le rond d'un bout, vu de dessus en raccourci
  const inset = (i: number) => {
    const u = (i + 0.5 - rx) / rx;
    return Math.round(ry * (1 - Math.sqrt(Math.max(0, 1 - u * u))));
  };
  const bottom = y0 + len - 1;
  for (let i = 0; i < dia; i++) {
    const X = x0 + i;
    const s = (i + 0.5) / dia;
    const stick = i % 2 === 0;
    // une branche, la plus longue, dépasse d'un pixel au nord (comme une pointe à l'est en est-ouest)
    const from = y0 + inset(i) + Math.floor(r() * 2) - (stick && r() < 0.35 ? 1 : 0) - (i === 2 ? 1 : 0);
    let dash = from + Math.floor(r() * 2), gap = -1;
    for (let Y = from; Y <= bottom - inset(i); Y++) {
      let k = tone(s);
      if (!stick) {
        if (Y === dash) gap = dash + 4 + Math.floor(r() * 6);
        if (Y >= dash && Y < gap) k = DARKER[k];
        else if (Y === gap) dash = Y + 1;
      }
      c.set(X, Y, k);
    }
    // pointe : un cran plus sombre
    c.set(X, from, DARKER[tone(s)]);
  }
  // rameaux sur le flanc ouest : deux pixels qui s'écartent vers le nord-ouest
  for (const t of twigs) c.set(x0 - 1, bottom - t, 'm').set(x0 - 2, bottom - t - 1, 'm');
  // le lien, au milieu : deux rangées de chanvre, le faisceau pincé de chaque côté
  const mid = y0 + Math.floor(len / 2) - 1;
  for (const Y of [mid - 1, mid, mid + 1, mid + 2]) { c.set(x0, Y, EMPTY); c.set(x0 + dia - 1, Y, EMPTY); }
  for (const Y of [mid, mid + 1]) for (let X = x0 + 1; X < x0 + dia - 1; X++) {
    const s = (X - x0 + 0.5) / dia;
    c.set(X, Y, Y === mid + 1 && s >= 0.34 ? 'C' : rope(s));
  }
  // face des gros bouts, au sud
  buttEnds(c, x0 + rx, bottom + 1 - ry - 0.5, rx + 0.2, ry + 0.45);
  return c;
}

/** Le fagot nord-sud : 13 × 27 px de silhouette (l'est-ouest inversé, règle D), ombre décalée à l'est et vers le sud. */
function faggotNS(): Canvas {
  const c = new Canvas(16, 31);
  // intérieur de 9 × 24, contour autour : 11 × 26 ; les rameaux dépassent de deux colonnes à l'ouest
  outlineBundle(bundleNS(c, 3, 2, 24, 9, 82, FAGGOT_TWIGS));
  dropShadow(c, 2, 0);
  return trimTop(c);
}

/** Icône 16×16 : le fagot est-ouest réduit (14 px), son lien et ses gros bouts ; pas d'ombre. */
function faggotIcon(): Canvas {
  const c = new Canvas(16, 16);
  bundleEW(c, 1, 5, 13, 7, 83, [3, 9]);
  return outlineBundle(c);
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('faggot', faggot()), img('faggot-ns', faggotNS()), img('item-faggot', faggotIcon())];
