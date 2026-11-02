// Les étapes visibles du travail (CONCEPTION, « Le travail », § 6 : ce qu'on voit avancer), d'après l'essai validé
// (art/proposals/essai-abattage.ts, .art-preview/essai-abattage-3.png). Des variantes d'image d'objets existants, pas de
// nouveaux objets : chaque étape a la taille et l'origine de l'image qu'elle remplace (le jeu change l'image à la volée).
//
// 1. L'ABATTAGE (`<arbre>-stage-1` à `-7`, arbres debout `normal-tree`, `big-tree`, `big-pollard`, vue unique : `round`) :
//    entaille 1/3, 2/3, 3/3, trait d'abattage, craquement, penche 1, penche 2. Dessinées pour un arbre qui tombe vers la
//    droite (l'entaille à droite) ; quand Xéros frappe depuis la droite, l'arbre tombe à gauche et le jeu montre
//    `<arbre>-left-stage-1` à `-7`, dessinées (pas retournées) : l'entaille à gauche, l'arbre éclairé comme toujours.
//    - L'entaille de direction se creuse côté droit, à la hauteur de la coupe de la chute : un V à plancher horizontal (le
//      plancher au soleil, bois neuf `^`, la face haute en pente dans l'ombre `%`, le creux `@ &`) ; le bord du tronc
//      s'échancre.
//    - Le trait d'abattage, côté gauche, une rangée au-dessus du plancher : une morsure et la saignée `@`.
//    - Le craquement : la saignée rejoint presque l'entaille (la charnière), une fente monte dans le tronc, des éclats sautent.
//    - La penche : le haut pivote autour de la charnière ; le trait d'abattage s'ouvre à gauche. L'angle est borné par la
//      largeur de l'image (le houppier ne doit pas en sortir) : voir `lean` de chaque arbre.
//    - Les copeaux (bois neuf `^ * %`, éclats de 1 à 2 px) s'accumulent au pied : côté entaille d'abord, puis côté trait.
//    Mêmes règles pour les gros (tronc de 55 cm, 11 px) à leur échelle : entaille plus profonde, plus de copeaux.
//
// 2. L'ÉBRANCHAGE (`<image couchée>-stage-1` à `-3`, une par vue existante : `<clé>` et `<clé>-left`) : le houppier
//    s'allège depuis le pied vers la cime, une branche après l'autre (le houppier est partagé en autant de branches que
//    `limbs.count` de props.json, chacune une cellule le long du tronc) ; chaque branche coupée laisse une cicatrice claire
//    sur le tronc et tombe au sol à côté de lui (au nord ou au sud, du côté où elle était), feuillage et tige. Étape 1 : 30 %
//    du houppier, 2 : 60 %, 3 : 85 % ; il reste la touffe de la cime (le jeu pose ensuite la pièce de bois et les branches).
//    Le front de la coupe recule du pied vers la cime, festonné ; les branches tombées gardent leur place d'une étape à
//    l'autre.

import { Canvas, EMPTY, rng } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { despeckle, shadedOutline, type Vec } from './big-tree';
import { NORMAL_LYING } from './normal-felled';
import { BIG_FELLED, BIG_TREE_CM, bigLying } from './big-felled';
import { CROWN_SHIFT, POLLARD_CM, POLLARD_FELLED } from './big-pollard';
// 1. L'abattage : le dessin des étapes est dans art/world/felling.ts (les chutes en partent aussi, pour le raccord)
import { BIG, NORMAL, POLLARD, fellingStage } from './felling';

// =====================================================================================================================
// 2. L'ébranchage
// =====================================================================================================================

interface Frame { x: number; y: number; w: number; h: number }

/** Un arbre couché à ébrancher (repère : la frame de sa chute). */
interface Lying {
  w: number;
  buttX: number;
  axisY: number;
  /** Première et dernière rangées d'écorce du tronc. */
  barkTop: number;
  barkBottom: number;
  /** Longueur du tronc depuis le bout scié (px). */
  trunkLen: number;
  frame: (left: boolean) => Frame;
  compose: (left: boolean, keep: (h: number, g: number) => boolean) => Canvas;
}

interface Felled {
  key: string;
  lying: Lying;
  /** Nombre de branches (`limbs.count` de props.json). */
  limbs: number;
}

/** Part des branches tombées à chaque étape. */
const LIMBED = [0.3, 0.6, 0.85];

/** Une branche coupée : sa place (h le long du tronc, g en travers : son côté). */
interface Limb { h: number; g: number }

/** L'étendue du houppier de l'arbre entier, en distance au pied (h), et sa plus grande demi-largeur. */
function crownExtent(f: Felled): { h0: number; h1: number; gMax: number } {
  const all = f.lying.compose(false, () => true);
  const bare = f.lying.compose(false, () => false);
  let h0 = Infinity, h1 = -Infinity, gMax = 0;
  for (let Y = 0; Y < all.h; Y++) for (let X = 0; X < all.w; X++) {
    const q = all.get(X, Y);
    if (q === EMPTY || !'jLlk'.includes(q) || bare.get(X, Y) === q) continue;
    const h = X + 0.5 - f.lying.buttX;
    h0 = Math.min(h0, h); h1 = Math.max(h1, h); gMax = Math.max(gMax, Math.abs(Y + 0.5 - f.lying.axisY));
  }
  return { h0, h1, gMax };
}

/**
 * Le front de l'ébranchage à chaque étape : on coupe du pied vers la cime, le houppier ne garde que ce qui est au-delà du
 * front. Le front n'est pas droit : festonné en travers (des branches plus ou moins longues). À la dernière étape, la
 * touffe de la cime touche encore le bout du tronc (chez les gros, elle couvre le bout scié de la pièce de bois).
 */
function frontsOf(f: Felled) {
  const { h0, h1, gMax } = crownExtent(f);
  // la touffe qui reste touche encore le bout du tronc : sans cela elle flotterait au-delà, comme un buisson à part
  const last = Math.min(h0 + LIMBED[2] * (h1 - h0), f.lying.trunkLen - 3);
  const fronts = LIMBED.map((p) => h0 + (p / LIMBED[2]) * (last - h0));
  const r = rng(f.limbs * 7 + 1);
  const ph = [r() * 6, r() * 6];
  const wave = (g: number) => 2.2 * Math.sin(g * 0.8 + ph[0]) + 1.4 * Math.sin(g * 1.9 + ph[1]) + 0.12 * Math.abs(g) * 2;
  return { h0, h1, gMax, fronts, keep: (front: number) => (h: number, g: number) => h > front + wave(g) };
}

/**
 * Les branches coupées à une étape : autant que la part du houppier passée sous le front (`limbs` en tout), en quinconce de
 * part et d'autre du tronc, placées irrégulièrement dans la partie coupée.
 */
function limbsAt(f: Felled, h0: number, last: number, gMax: number, share: number): Limb[] {
  const n = Math.round(f.limbs * share);
  const r = rng(f.limbs * 13 + 5);
  const out: Limb[] = [];
  for (let i = 0; i < f.limbs; i++) {
    const t = (i + 0.3 + r() * 0.4) / f.limbs;
    // place fixe d'une étape à l'autre : la branche i tombe à la même place, quelle que soit l'étape
    const h = h0 - 4 + (t / LIMBED[2]) * (last - h0 + 4);
    const side = (i + (r() < 0.25 ? 1 : 0)) % 2 === 0 ? -1 : 1;
    const g = side * gMax * (0.35 + r() * 0.25);
    if (i < n) out.push({ h: Math.min(h, last - 2), g });
  }
  return out;
}

/**
 * Une branche coupée, couchée au sol, vue de dessus : une tige (écorce, dessus clair) qui part près du tronc vers la cime en
 * s'en écartant, et des touffes de feuillage irrégulières le long d'elle, éclairées en haut à gauche. `dir` : sens de la cime
 * (+1 à droite), `side` : −1 au nord du tronc, +1 au sud. Peinte dans `c` (sans contour), base en (x, y).
 */
function fallenBranch(c: Canvas, x: number, y: number, dir: number, side: number, seed: number) {
  const r = rng(seed);
  const len = 7 + Math.floor(r() * 5);
  const rise = 1 + r() * 2.5;
  const at = (t: number): Vec => [x + dir * len * t, y + side * rise * t];
  // la tige : deux pixels d'épaisseur au pied (le dessus clair), un au bout
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const [px, py] = at(t);
    c.set(Math.round(px), Math.round(py), 'N');
    if (t < 0.45) c.set(Math.round(px), Math.round(py) - 1, 'm');
  }
  // les touffes : deux à quatre, de tailles inégales, dans la moitié du bout, un peu de part et d'autre de la tige
  const n = 2 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const t = 0.45 + r() * 0.55;
    const [cx0, cy0] = at(t);
    const rx = 1.6 + r() * 1.4;
    const ry = 1.1 + r() * 0.8;
    const cx = cx0 + (r() - 0.5) * 2;
    const cy = cy0 + (r() - 0.5) * 2.5;
    for (let yy = Math.floor(cy - ry - 1); yy <= Math.ceil(cy + ry + 1); yy++) {
      for (let xx = Math.floor(cx - rx - 1); xx <= Math.ceil(cx + rx + 1); xx++) {
        const u = (xx + 0.5 - cx) / rx;
        const v = (yy + 0.5 - cy) / ry;
        if (u * u + v * v > 1) continue;
        const lit = -(u + v) * 0.7;
        c.set(xx, yy, lit > 0.5 ? 'j' : lit > -0.05 ? 'L' : lit > -0.6 ? 'l' : 'k');
      }
    }
  }
}

/** Une étape de l'ébranchage (1 à 3) de l'arbre couché, dans sa vue (`left` : la vue `-left`), recadrée sur son cadre. */
function limbingStage(f: Felled, stage: number, left: boolean): Canvas {
  const L = f.lying;
  const { h0, gMax, fronts, keep } = frontsOf(f);
  const front = fronts[stage - 1];
  const limbs = limbsAt(f, h0, fronts[2], gMax, LIMBED[stage - 1]);
  const c = L.compose(left, keep(front));
  const X = (h: number) => Math.round(left ? L.w - 1 - (L.buttX + h) : L.buttX + h);
  const frame = L.frame(left);

  // les cicatrices : deux pixels de bois neuf sur l'écorce, au nord ou au sud du tronc, là où la branche partait
  for (const l of limbs) {
    if (l.h < 2 || l.h > L.trunkLen - 2) continue;
    const y = l.g < 0 ? L.barkTop + 1 : L.barkBottom - 1;
    const x = X(l.h);
    if ('MmNK'.includes(c.get(x, y)) && 'MmNK'.includes(c.get(x + 1, y))) { c.set(x, y, '^'); c.set(x + 1, y, '^'); }
  }

  // les branches tombées : au sol, du côté où elles étaient, contre le tronc, sous tout le reste
  const layer = new Canvas(c.w, c.h);
  const half = (L.barkBottom - L.barkTop + 1) / 2 + 1;
  limbs.forEach((l, i) => {
    const side = l.g < 0 ? -1 : 1;
    const dir = left ? -1 : 1;
    // au sol le long du tronc, jamais au-delà de son bout
    const h = Math.max(2, Math.min(l.h - 5, L.trunkLen - 14));
    const y = Math.round(L.axisY + side * (half + 1.5 + (i % 3 === 1 ? 1 : 0)));
    fallenBranch(layer, X(h), y, dir, side, 300 + i * 17);
  });
  despeckle(layer);
  shadedOutline(layer);
  // ne garder que ce qui tient dans le cadre (contour compris), au-dessus de son bord du bas
  for (let Y = 0; Y < c.h; Y++) for (let Xx = 0; Xx < c.w; Xx++) {
    const q = layer.get(Xx, Y);
    if (q === EMPTY) continue;
    if (Xx < frame.x || Xx >= frame.x + frame.w || Y < frame.y || Y >= frame.y + frame.h - 1) continue;
    const under = c.get(Xx, Y);
    if (under === EMPTY || under === 'x') c.set(Xx, Y, q);
  }
  // leur ombre : un pixel sous chacun, décalé vers la droite, sur le vide
  for (let Y = c.h - 1; Y >= 1; Y--) for (let Xx = c.w - 1; Xx >= 1; Xx--) {
    if (c.get(Xx, Y) !== EMPTY || layer.get(Xx - 1, Y - 1) === EMPTY || layer.get(Xx, Y) !== EMPTY) continue;
    if (Xx < frame.x || Xx >= frame.x + frame.w || Y >= frame.y + frame.h) continue;
    c.set(Xx, Y, 'x');
  }

  const out = new Canvas(frame.w, frame.h);
  for (let Y = 0; Y < frame.h; Y++) for (let Xx = 0; Xx < frame.w; Xx++) out.px[Y][Xx] = c.get(frame.x + Xx, frame.y + Y);
  return out;
}

const FELLED: Felled[] = [
  { key: 'normal-felled-tree', lying: NORMAL_LYING, limbs: 12 },
  { key: 'big-felled-tree', lying: bigLying(BIG_FELLED, BIG_TREE_CM, 0), limbs: 16 },
  { key: 'big-pollard-felled-tree', lying: bigLying(POLLARD_FELLED, POLLARD_CM, CROWN_SHIFT), limbs: 10 },
];

// =====================================================================================================================
// Les images
// =====================================================================================================================

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

/** Les étapes, par objet et par vue, dans l'ordre : pour la planche de contrôle (art/world/work-stages-preview.ts). */
export const STAGE_GROUPS: { base: string; stages: ImageSource[] }[] = [
  ...[NORMAL, BIG, POLLARD].map((t) => ({
    base: t.key,
    stages: [1, 2, 3, 4, 5, 6, 7].map((s) => img(`${t.key}-stage-${s}`, fellingStage(t, s))),
  })),
  // vers la gauche (Xéros frappe depuis la droite) : dessinées, pas retournées (art/world/felling.ts)
  ...[NORMAL, BIG, POLLARD].map((t) => ({
    base: t.key,
    stages: [1, 2, 3, 4, 5, 6, 7].map((s) => img(`${t.key}-left-stage-${s}`, fellingStage(t, s, undefined, true))),
  })),
  ...FELLED.flatMap((f) => [false, true].map((left) => {
    const base = left ? `${f.key}-left` : f.key;
    return { base, stages: [1, 2, 3].map((s) => img(`${base}-stage-${s}`, limbingStage(f, s, left))) };
  })),
];

export default STAGE_GROUPS.flatMap((g) => g.stages);
