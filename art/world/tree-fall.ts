// La chute d'un arbre, commune à toutes les sortes : les planches `<image>-fall` (vers la droite) et `<image>-fall-left` (vers la
// gauche, dessinée, pas retournée), tirées de la géométrie (`tree` de props.json, `tree.fall`) et des dessins de l'arbre
// (art/world/tree-registry.ts). Cinq images :
// 1. et 2. le raccord (`leadIn` de art/world/felling.ts) : l'arbre de la dernière étape de l'abattage (`<image>-stage-7`, entaillé,
//    qui penche), dont le haut continue de basculer autour de la même charnière ;
// 3. le haut de l'arbre pivoté de 10° autour de la charnière (le bord de la coupe du côté où il tombe), sur la souche ;
// 4. pivoté de 45° (les copeaux de l'abattage encore au pied, sous 3 et 4) ;
// 5. l'arbre couché (`scene` de son dessin couché) : la souche et l'arbre couché exactement comme le jeu les pose, pour que
//    rien ne saute au remplacement.
//
// Les images ont la hauteur de l'arbre debout (le cadre de l'arbre couché en occupe le bas) et la largeur du cadre de l'arbre
// couché (recadrées à `tree.fall.crop` colonnes s'il le faut : du côté gauche du cadre pour la chute à droite, du côté droit pour
// la chute à gauche). L'arbre debout y est posé là où l'arbre couché le pose (`off`, `offLeft` de son dessin couché).
//
// En tombant, l'arbre passe de la vue de face (debout) à la vue de dessus (couché) : le houppier se raccourcit le long du tronc
// (de ses rangées debout à `tree.fall.crown` px couché) et s'aplatit en travers (jusqu'à `squash`), d'autant plus que l'arbre
// se couche ; la lumière nord-ouest de l'écran est ramenée dans le repère de l'arbre qui tourne. Ce qui tombe (`fall.source`) :
// - `body` : le dessin debout lui-même, le houppier raccourci au-delà du bas du feuillage (les gros) ;
// - `bark` : le houppier rééchantillonné, puis le tronc nu redessiné dans son écorce (`bareTrunk`), allongé de `ext` px
//   couché (l'arbre normal, dont le tronc nu couché est plus long que debout).
// Le bout scié du tronc qui tombe : la face de coupe commune (art/world/wood.ts), vue de biais, tournée vers le bas-gauche (vers
// la lumière) quand l'arbre tombe à droite, vers le bas-droite (dans l'ombre) quand il tombe à gauche.

import { Canvas, EMPTY } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import type { TreeDef } from '../../src/content/types';
import { world } from '../palette';
import { despeckle, groundShadow, shadedOutline } from './big-tree';
import { bark, faceTone } from './wood';
import { hingeOf, leadIn, withChips, type LeadSide, type Standing } from './felling';
import type { LyingArt, TreeArt, Vec } from './tree-registry';

type Shade = [number, number, number, number];

interface Pose {
  deg: number;
  /** Position à l'écran du centre de la coupe du tronc qui tombe. */
  base: Vec;
  /** Raccourcissement du houppier le long du tronc (1 = aucun). */
  along: number;
  /** Écrasement du houppier de part et d'autre du tronc (1 = aucun). */
  squash: number;
  /** Allongement du tronc nu (`bark`), en px. */
  ext: number;
}

/** Feuillage d'un arbre debout : première et dernière rangées. */
function crownRows(body: Canvas): { top: number; bottom: number } {
  const rows = body.px.map((r, y) => (r.some((q) => 'jLlk'.includes(q)) ? y : -1)).filter((y) => y >= 0);
  return { top: rows[0], bottom: rows[rows.length - 1] };
}

/** Ce qui tombe, pour un arbre : de quoi tirer, pour une pose, la source (un canevas) et la rangée lue à la distance h de la coupe. */
interface Faller {
  source: (light: Vec, p: Pose) => { src: Canvas; row: (h: number) => number };
}

/** `body` : le dessin debout tel quel ; au-delà du bas du feuillage, le houppier se raccourcit de `along`. */
function bodyFaller(t: TreeDef, art: TreeArt): Faller {
  const crown = crownRows(art.body());
  const cut = t.cut;
  const hc = cut - crown.bottom;
  return {
    source: (light, p) => ({ src: art.body(light), row: (h) => Math.floor(cut - (h <= hc ? h : hc + (h - hc) / p.along)) }),
  };
}

/**
 * `bark` : le houppier (au-dessus de la première rangée de tronc nu) rééchantillonné de `along`, puis le tronc nu redessiné : le
 * profil du tronc sous le houppier (rangée `bareTrunk.row`) dans l'écorce commune de sa matière, allongé de `ext` rangées.
 */
function barkFaller(t: TreeDef, art: TreeArt, what: string): Faller {
  const bt = art.bareTrunk;
  if (!bt) throw new Error(`chute : ${what}, une chute 'bark' demande le tronc nu de son dessin (bareTrunk)`);
  const cutY = t.cut;
  const body0 = art.body();
  // première rangée sous le houppier où l'arbre n'est plus que tronc : le tronc s'allonge à partir d'elle (lue sur le dessin)
  const trunkFrom = (() => {
    for (let y = bt.crownBottom; y < cutY; y++) {
      if (body0.px[y].every((q) => q === EMPTY || 'MmNK'.includes(q))) return y;
    }
    return bt.crownBottom + 2;
  })();
  return {
    source: (light, p) => {
      const body = art.body(light);
      const k = p.along;
      const crownH = Math.round(trunkFrom * k);
      const cut = crownH + (cutY - trunkFrom) + p.ext;
      const src = new Canvas(body.w, cut);
      for (let y = 0; y < crownH; y++) {
        const from = Math.max(0, Math.floor(trunkFrom - (crownH - y - 0.5) / k));
        for (let x = 0; x < body.w; x++) src.px[y][x] = body.get(x, from);
      }
      const profile = body.px[bt.row];
      for (let y = crownH; y < cut; y++) for (let x = 0; x < body.w; x++) {
        src.px[y][x] = profile[x] === EMPTY ? EMPTY : bark(y - crownH, (x - bt.x0 + 0.5) / bt.wood.diameter, bt.wood);
      }
      return { src, row: (h) => Math.floor(cut - h) };
    },
  };
}

/**
 * Dessine le haut de l'arbre selon `p` (tourné de `deg` degrés vers la droite, vers la gauche si `deg` < 0), la lumière nord-ouest
 * de l'écran ramenée dans le repère de l'arbre, puis le bout scié au pied du tronc.
 */
function drawFalling(c: Canvas, p: Pose, t: TreeDef, faller: Faller) {
  const th = (p.deg * Math.PI) / 180;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const S: Vec = [-Math.SQRT1_2, -Math.SQRT1_2];
  const { src, row } = faller.source([S[0] * cos + S[1] * sin, -S[0] * sin + S[1] * cos], p);
  const half = t.fall.half; // demi-largeur du tronc, jamais écrasée
  const inv = (g: number) => (Math.abs(g) <= half ? g : Math.sign(g) * (half + (Math.abs(g) - half) / p.squash));
  // calque à part : le bout scié ne se peint que sur le tronc qui tombe, jamais sur la souche
  const layer = new Canvas(c.w, c.h);
  // axe du tronc (vers la cime) : (sin, -cos) ; travers (côté droit de l'arbre) : (cos, sin)
  const local = (X: number, Y: number): Vec => {
    const U = X + 0.5 - p.base[0];
    const V = Y + 0.5 - p.base[1];
    return [U * sin - V * cos, U * cos + V * sin];
  };
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    const [h, g] = local(X, Y);
    if (h < 0) continue;
    const q = src.get(Math.floor(t.foot[0] + inv(g)), row(h));
    if (q !== EMPTY) layer.set(X, Y, q);
  }
  // bout scié : disque du tronc vu de biais, d'autant plus ouvert que l'arbre se couche
  const { dx, slant, rings } = t.fall.face;
  const minor = 0.9 + slant * Math.abs(sin);
  const rx = half + 0.1, ry = minor + 0.4;
  const inFace = (h: number, g: number) => h >= 1 && ((g + dx) / rx) ** 2 + ((h - 1) / ry) ** 2 <= 1;
  // la rangée du bas : bord d'écorce du disque, qui sépare le bout scié du dessus de la souche
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (layer.get(X, Y) !== EMPTY && local(X, Y)[0] < 1) layer.set(X, Y, 'N');
  }
  const paint: [number, number, string][] = [];
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (layer.get(X, Y) === EMPTY) continue;
    const [h, g] = local(X, Y);
    if (!inFace(h, g)) continue;
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ddx, ddy]) => {
      const [h2, g2] = local(X + ddx, Y + ddy);
      return layer.get(X + ddx, Y + ddy) === EMPTY || (!inFace(h2, g2) && h2 >= 1);
    });
    // u en travers du tronc, v le long (vers la cime) : la face regarde le bas de l'écran
    paint.push([X, Y, faceTone((g + dx) / rx, -(h - 1) / ry, rim, p.deg < 0, rings)]);
  }
  for (const [X, Y, k] of paint) layer.set(X, Y, k);
  c.stamp(layer.toGrid(), 0, 0);
}

/** Les deux planches de chute de l'arbre `s` (props.json `key`, géométrie `t`, dessins `art`, arbre couché `lying`). */
export function fallSheets(s: Standing, t: TreeDef, art: TreeArt, lying: LyingArt, names: { right: string; left: string }): SpriteSheetSource[] {
  const what = s.key;
  const faller = t.fall.source === 'body' ? bodyFaller(t, art) : barkFaller(t, art, what);
  const W = lying.w;
  const H = s.h;
  const dy = H - lying.h;
  if (dy < 0) throw new Error(`chute : ${what}, l'arbre couché (${lying.h} px) est plus haut que l'arbre debout (${H} px)`);
  const crown = crownRows(art.body());
  const rows = t.fall.crownRows ?? crown.bottom - crown.top + 1;
  const lyingRatio = t.fall.crown / rows;
  const stumpAt: Vec = [t.foot[0] - art.stumpFoot[0], t.foot[1] - art.stumpFoot[1]];

  /** Centre de la coupe (debout en (pied, coupe)) pivoté de `deg` degrés autour de la charnière `h`, l'arbre posé en `off`. */
  const cutCentre = (deg: number, h: Vec, off: number): Vec => {
    const th = (deg * Math.PI) / 180;
    const [u, v] = [t.foot[0] - h[0], t.cut - h[1]];
    return [h[0] + off + u * Math.cos(th) - v * Math.sin(th), h[1] + u * Math.sin(th) + v * Math.cos(th)];
  };
  const pose = (deg: number, left: boolean): Pose => {
    const sn = Math.abs(Math.sin((deg * Math.PI) / 180));
    const signed = left ? -deg : deg;
    return {
      deg: signed,
      base: cutCentre(signed, hingeOf(s, left), left ? lying.offLeft : lying.off),
      along: 1 - (1 - lyingRatio) * sn * sn,
      squash: 1 - (1 - t.fall.squash) * sn * sn,
      ext: Math.round(t.fall.ext * sn),
    };
  };
  /** Une image de la chute : la souche fixe, le haut de l'arbre dans la pose, contour, ombres portées (relatives au pied). */
  const frame = (p: Pose, shadows: Shade[], off: number): Canvas => {
    const c = new Canvas(W, H);
    c.stamp(art.stumpBody().toGrid(), stumpAt[0] + off, stumpAt[1]);
    drawFalling(c, p, t, faller);
    despeckle(c, 'K^');
    shadedOutline(c);
    const fx = t.foot[0] + off;
    for (const [x, y, rx, ry] of shadows) groundShadow(c, fx + x, t.foot[1] + y, rx, ry);
    return c;
  };
  const side = (left: boolean): Canvas[] => {
    const off = left ? lying.offLeft : lying.off;
    const sh = left ? t.fall.shadows.left : t.fall.shadows.right;
    const fx = t.foot[0] + off;
    const s10 = sh['10'][1];
    const lead: LeadSide = { w: W, off, shade10: [fx + s10[0], t.foot[1] + s10[1], s10[2], s10[3]], left };
    const frames = [
      ...leadIn(s, lead),
      withChips(frame(pose(10, left), sh['10'], off), s, lead),
      withChips(frame(pose(45, left), sh['45'], off), s, lead),
      new Canvas(W, H).stamp(lying.scene(left).toGrid(), 0, dy),
    ];
    const crop = t.fall.crop;
    if (!crop) return frames;
    const from = left ? W - crop : 0;
    return frames.map((c, i) => {
      const out = new Canvas(crop, c.h);
      for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
        const q = c.get(X, Y);
        if (q === EMPTY) continue;
        if (X < from || X >= from + crop) throw new Error(`chute : ${what}, l'image ${i + 1} de la chute ${left ? 'à gauche' : 'à droite'} déborde du cadre de ${crop} px en (${X}, ${Y})`);
        out.px[Y][X - from] = q;
      }
      return out;
    });
  };
  const sheet = (name: string, fs: Canvas[]): SpriteSheetSource => ({
    kind: 'spritesheet',
    name,
    frameW: fs[0].w,
    frameH: H,
    palette: world,
    animations: { fall: { frames: fs.map((f) => f.toGrid()), frameRate: 6, repeat: 0 } },
  });
  return [sheet(names.right, side(false)), sheet(names.left, side(true))];
}

/** Les décalages de la chute pour props.json (src/content/treeLayout.ts) : la planche de chaque côté, le pied. */
export function fallLayout(t: TreeDef, lying: LyingArt): { x: number; foot: number; left: { x: number } } {
  const crop = t.fall.crop;
  return { x: -lying.off, foot: t.foot[0], left: { x: -(lying.offLeft - (crop ? lying.w - crop : 0)) } };
}
