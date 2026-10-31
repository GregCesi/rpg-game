// Le groupe pierre (chantiers « briques » puis « pierre ») : la pierre brute de carrière en trois tailles, le moellon (la
// grosse pierre dégrossie au têtu) en trois longueurs, la pierre de taille (le moellon dressé au ciseau) et les éclats de
// taille qui restent au sol. Pour chacune : l'image au sol, l'icône 16 × 16 et la planche tenue `held-*` (la petite pierre
// dans la main, posture `hand` ; les autres à deux mains devant le ventre, posture `carry`, comme la dalle
// d'art/world/implantation.ts). La dalle (la plaque de calcaire, dé des poteaux) est dans implantation.ts.
//
// La roche est le calcaire de la carrière (rampe `! + = ; ~` d'art/palette.ts : cassure fraîche, au soleil, patiné, à
// l'ombre, fissure). Deux manières, choisies par Grégoire sur l'essai .art-preview/essai-pierre.png (tools/essai-pierre.ts) :
// - pierre brute : le dessin C, « cassures et taches » (art/proposals/pierre-c.ts) : silhouette cabossée (un coin parti, un
//   creux, une bosse : contour dessiné à la main, `~` en haut et à gauche, OUTLINE en bas et à droite), le blanc `!` seulement
//   là où la pierre a sauté, une fissure `~` qui traverse une face, des taches de patine grise (`R`) ou ocre de lichen (`D`)
//   de même valeur que la face, contraste moyen (dessus `+`, face `=`, flanc est `;`) ; deux formes par taille (`-b` : une
//   autre cassure, pas la même retournée) ;
// - moellon : le dessin B, « masse patinée » (art/proposals/pierre-b.ts), dégrossi, plus plat et plus calme : dessus plat de
//   lit `+`, face `=` traversée d'un lit `;`, bout est à l'ombre ; le travail du têtu se lit aux coins abattus (marches du
//   contour) et à un éclat frais `!` au coin de la face où l'outil a mordu.
// La pierre de taille garde la pierre grise du jeu (R r z Z) et sa pierre fraîche `1`, telle que dessinée au chantier
// « briques » : elle attend son propre essai.
//
// Échelle du jeu (5 cm par pixel, gabarit de docs/STYLE.md section 8 : boîte W × (H + D/2), contour compris, ombre
// exclue), lumière en haut à gauche, ombre portée `x` décalée d'un pixel vers le sud-est, hors silhouette.

import { Canvas, EMPTY, castShadow, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { BRANCH_FIST, fistGap, sheet } from './carried';

/**
 * Palette du groupe pierre : celle du monde (avec la rampe du calcaire), plus la pierre grise fraîchement taillée de la
 * pierre de taille (la face dressée au ciseau, pas encore grisée par le temps) : R éclairci et tiré vers le jaune.
 */
export const stonePalette = {
  ...world,
  '1': '#cec6b1', // pierre fraîche, au soleil (R éclairci vers le jaune)
};

/** Contour côté lumière du calcaire : la fissure, son ton le plus sombre. */
const LIME_DARK = '~';
/** Contour côté lumière de la pierre grise (pierre de taille). */
const GREY_DARK = 'Z';

/** Vérifie qu'une grille dessinée à la main est rectangulaire (une faute de frappe décale tout le dessin). */
function rect(name: string, g: Grid): Grid {
  g.forEach((r, i) => { if (r.length !== g[0].length) throw new Error(`stones : ${name}, rangée ${i} de ${r.length} au lieu de ${g[0].length}`); });
  return g;
}

/** Ombre portée (src/world/gridCanvas.ts, partagée avec les murs du jeu) : la silhouette décalée d'un pixel vers le sud-est. */
export { castShadow };

/**
 * Le contour du moellon (manière B) : une matière sans contour (rangées de même largeur) reçoit son contour d'un pixel, à
 * coins pleins (voisinage de huit) : les coins abattus au têtu font des marches franches, pas des bosses. Le coin nord-ouest
 * et le côté lumière prennent `~`, le bas et la droite OUTLINE (STYLE.md section 3). Un coin abattu s'écrit '.' dans la matière.
 */
function dressed(name: string, inner: Grid): Grid {
  rect(name, inner);
  const w = inner[0].length, h = inner.length;
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? inner[y][x] : EMPTY) !== EMPTY;
  const out: string[] = [];
  for (let y = -1; y <= h; y++) {
    let row = '';
    for (let x = -1; x <= w; x++) {
      if (at(x, y)) { row += inner[y][x]; continue; }
      if (at(x - 1, y) || at(x, y - 1)) row += 'o';
      else if (at(x + 1, y) || at(x, y + 1)) row += LIME_DARK;
      else if (at(x + 1, y + 1)) row += LIME_DARK;
      else if (at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1)) row += 'o';
      else row += EMPTY;
    }
    out.push(row);
  }
  return out;
}

/**
 * Une pierre taillée de pierre grise, arêtes vives : contour d'un pixel jusqu'aux coins (Z en haut et à gauche, OUTLINE en
 * bas et à droite ; le coin haut droit et le coin bas gauche en OUTLINE).
 */
function squared(inner: Grid): Grid {
  const w = inner[0].length + 2, h = inner.length + 2;
  const c = new Canvas(w, h).stamp(inner, 1, 1);
  for (let x = 0; x < w; x++) { c.set(x, 0, x === w - 1 ? 'o' : GREY_DARK); c.set(x, h - 1, 'o'); }
  for (let y = 1; y < h - 1; y++) { c.set(0, y, GREY_DARK); c.set(w - 1, y, 'o'); }
  return c.toGrid();
}

// ---------- Pierre brute de carrière (manière C) ----------
// Grilles complètes, contour compris, dessinées à la main (le contour automatique arrondit tout et efface les cassures).
// Petite, 17 × 15 × 13 cm (≈ 4,5 kg, d'une main) : gabarit 3,4 × 4,1 px, agrandie au plancher de lisibilité : a 5 × 5, b 6 × 5.
// Moyenne, 26 × 22 × 19 cm : gabarit 5,2 × 6 px (plancher : 6 × 6,9) : a 6 × 7, b 7 × 6 (couchée plus large).
// Grosse, 45 × 34 × 27 cm : gabarit 9 × 8,8 px : a 9 × 9, b 10 × 8 (plus basse et plus large).

const SMALL: [Grid, Grid] = [
  // a : un caillou trapu ; le coin nord-est a sauté (éclat blanc), le pied ouest rentre, une tache grise sur la face
  rect('petite a', [
    '.~~o.',
    '~+!!o',
    '~+R;o',
    '~RR;o',
    '.ooo.',
  ]),
  // b : une galette ; le bout ouest est cassé frais (blanc), une fissure entame le dessus, du lichen ocre au pied
  rect('petite b', [
    '..~~o.',
    '.~++~o',
    '~!+=;o',
    '~!D;;o',
    '.oooo.',
  ]),
];

const MEDIUM: [Grid, Grid] = [
  // a : un bloc trapu ; le coin nord-est a sauté (éclat blanc), un creux au flanc ouest, une fissure, une tache grise au pied
  rect('moyenne a', [
    '.~~o..',
    '~++!o.',
    '~+!!;o',
    '.~=~;o',
    '~R=~;o',
    '~RR;;o',
    '.oooo.',
  ]),
  // b : une galette couchée ; le pied ouest est parti (cassure blanche, encoche dans le contour), du lichen ocre sur le dessus
  rect('moyenne b', [
    '..~~~o.',
    '.~+DD;o',
    '~+++D;o',
    '~!!==;o',
    '.~!=;;o',
    '..oooo.',
  ]),
];

const BIG: [Grid, Grid] = [
  // a : un gros bloc ; l'arête sud-est a sauté (grand éclat blanc, encoche dans le flanc est), une courte fissure en biais sur
  // la face, patine grise sur le dessus, lichen ocre au pied de la face
  rect('grosse a', [
    '...~~~o..',
    '.~~++R;o.',
    '~+++RR;;o',
    '~+++!!!;o',
    '~+==!!;o.',
    '~=~==;;;o',
    '~=D~==;;o',
    '~=DD=;;o.',
    '.ooooooo.',
  ]),
  // b : une dalle basse ; un creux au milieu du dessus d'où part une fissure en biais, le bout ouest cassé frais (grande
  // cassure blanche), patine grise au dessus, lichen ocre sur la face
  rect('grosse b', [
    '..~~~.~~o.',
    '.~++R~++;o',
    '~!+RR+~+;o',
    '~!!+++~;;o',
    '~!!====;;o',
    '~!=DD=;;;o',
    '.~=D==;;o.',
    '..ooooooo.',
  ]),
];

// ---------- Moellon (manière B) ----------
// Couché, 22 cm de profondeur, 20 cm d'assise ; trois longueurs (30, 40, 50 cm). Est-ouest : 6, 8, 10 × 6 px (gabarit W ×
// (4 + 2,2)) : le dessus plat de lit sur deux rangées (le contour du haut et une rangée de `+`, la seconde mêlée : l'arête
// adoucie par la patine), la face sud sur deux, traversée d'un lit `;` interrompu, le bout est `;`. Nord-sud (règle D) : 6 ×
// 6, 8, 10 : le dessus long, l'arête est qui tombe à l'ombre, le bout sud en bande de deux rangées, avec son lit. Le têtu :
// coins abattus (marches du contour) et un éclat frais `!` au coin de la face où il a mordu.

type RubbleLength = 30 | 40 | 50;
const LENGTHS: RubbleLength[] = [30, 40, 50];

const RUBBLE_EW: Record<RubbleLength, Grid> = {
  30: [
    '.++=',
    '!+==',
    '!;=;',
    '===;',
  ],
  40: [
    '.++++=',
    '!+++==',
    '!=;;;;',
    ';===;.',
  ],
  50: [
    '.++++++=',
    '!+==++==',
    '!;;;===;',
    '===;;=;.',
  ],
};

const RUBBLE_NS: Record<RubbleLength, Grid> = {
  30: [
    '+++=',
    '!+==',
    '!;;;',
    '===;',
  ],
  40: [
    '+++.',
    '+++=',
    '++==',
    '!++=',
    '!;==',
    '==;;',
  ],
  50: [
    '+++=',
    '++==',
    '+++=',
    '=++=',
    '+++=',
    '!+==',
    '!=;;',
    ';;=;',
  ],
};

// ---------- Pierre de taille ----------
// 40 × 20 × 15 cm, couchée : est-ouest 8 × 5 (dessus de pierre fraîche, une rangée ; face sud de deux, layage), nord-sud
// 5 × 8 (dessus de quatre rangées, le bout de deux). Rectangle net, coins pleins.

const ASHLAR_EW: Grid = squared([
  '11111R',
  'RrRrRr',
  'rrrrrz',
]);

const ASHLAR_NS: Grid = squared([
  '111',
  '111',
  '11R',
  '1RR',
  'RrR',
  'rrz',
]);

// ---------- Éclats de taille ----------
// À plat sur le sol (40 × 30 cm : 8 × 6), sous les personnages, sans ombre portée : des écailles de calcaire de tailles
// inégales ; la plupart montrent leur cassure fraîche (`!`, `+`), deux leur ancienne face patinée (`=`), chacune son ombre
// (`;`) au sud ou à l'est (manière C).

const CHIPS: Grid = rect('éclats', [
  '.!!....!',
  '!+;..=+;',
  '.;..=;;.',
  '...!!...',
  '=!.+;;.!',
  ';;.....;',
]);

// ---------- Icônes ----------
// Plus grandes que sur la carte, pour la case : la même pierre, mêmes cassures, sans ombre (le jeu l'ajoute). Les trois
// pierres brutes et les trois moellons se distinguent d'abord par leur taille.

const ICON_ROUGH: Record<'small' | 'medium' | 'big', Grid> = {
  small: rect('icône petite', [
    '..~~~o.',
    '.~++!!o',
    '~+++!;o',
    '~+R=~;o',
    '~RR=;;o',
    '.~==;o.',
    '..ooo..',
  ]),
  medium: rect('icône moyenne', [
    '.~~~~o....',
    '~+++R;o...',
    '~++RR;~~o.',
    '~+++!!++;o',
    '~=+=!!+;;o',
    '.~==~==;;o',
    '~RR==~=;;o',
    '~RRR===;o.',
    '.ooooooo..',
  ]),
  big: rect('icône grosse', [
    '.~~~~~~~o....',
    '~+++RR++;o...',
    '~++++RRR+;o..',
    '~+++++++++;o.',
    '~++++++!!!;;o',
    '~=+===!!!!;o.',
    '.~==~===!;;;o',
    '~==~====;;;;o',
    '~=D==~==;;;o.',
    '~=DDD===;;;o.',
    '.ooooooooooo.',
  ]),
};

const ICON_RUBBLE: Record<RubbleLength, Grid> = {
  30: [
    '.+++++=',
    '+++++==',
    '!;;;==;',
    '===;;=;',
    '.====;.',
  ],
  40: [
    '.++++++++=',
    '++++==+++=',
    '!=;;;;===;',
    '=====;;==;',
    '.=======;.',
  ],
  50: [
    '.+++++++++++=',
    '+++==++++++==',
    '!;;;;====;;=;',
    '====;;;=====;',
    '.==========;.',
  ],
};

const ASHLAR_ICON: Grid = squared([
  '11111111111',
  '1111111111R',
  'RrRrRrRrRrR',
  'RrRrRrRrRrR',
  'rrrrrrrrrrz',
]);

/** Une icône 16 × 16 : le dessin centré, un peu bas (la pierre est posée). */
function icon(g: Grid): Grid {
  const c = new Canvas(16, 16);
  c.stamp(g, Math.floor((16 - g[0].length) / 2), 16 - 3 - g.length);
  return c.toGrid();
}

// ---------- Tenue à deux mains (posture `carry`) ----------
// À deux mains devant le ventre (CARRY_HANDS de art/characters/xeros.ts) : le jeu pose le centre de l'image sur les mains ;
// les mains tiennent la pierre par-dessous, sa dernière rangée sous la prise (comme la dalle). Une pierre brute se voit
// pareille de tous côtés ; le moellon et la pierre de taille, portés en travers du ventre, montrent leur long de face et de
// dos, leur bout de profil (leur vue nord-sud). De dos, le corps la cache.

const HELD = 15;
const HC = Math.floor(HELD / 2);

function carried(g: Grid): Grid {
  const c = new Canvas(HELD, HELD);
  c.stamp(g, HC - Math.floor(g[0].length / 2), HC + 2 - g.length);
  return c.toGrid();
}

const held = (name: string, front: Grid, side: Grid): SpriteSheetSource =>
  sheet(name, HELD, stonePalette, { down: carried(front), up: carried(front), right: carried(side) });

// ---------- Tenue dans la main (posture `hand`) ----------
// La petite pierre se tient d'une main, bras pendant, comme un outil court : le poing (BRANCH_FIST, 2 × 2 au centre de
// l'image) la serre par le haut, la pierre pend dessous. De face et de profil, le poing est effacé (la main du corps se voit
// à travers et serre la pierre) ; de dos, la pierre passe derrière la main (hold.json : `behind`), on la voit entière.

const HAND = 11;
const HAND_C = Math.floor(HAND / 2);

function inHand(g: Grid, view: 'down' | 'up' | 'right'): Grid {
  const c = new Canvas(HAND, HAND);
  // le poing sur le haut de la pierre, un peu à gauche de son milieu : la pierre pend sous les doigts
  c.stamp(g, HAND_C - 1, HAND_C - 1);
  return view === 'up' ? c.toGrid() : fistGap(c.toGrid(), HAND_C, BRANCH_FIST);
}

const heldInHand = (name: string, front: Grid, side: Grid): SpriteSheetSource =>
  sheet(name, HAND, stonePalette, { down: inHand(front, 'down'), up: inHand(front, 'up'), right: inHand(side, 'right') });

// ---------- Les images ----------

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: stonePalette, grid });

/** Une taille de pierre brute : ses deux formes au sol, son icône, sa planche tenue. */
function rough(prefix: string, forms: [Grid, Grid], iconGrid: Grid, inHandToo = false): (ImageSource | SpriteSheetSource)[] {
  const [a, b] = forms;
  return [
    img(`${prefix}-ground`, castShadow(a)),
    img(`${prefix}-ground-b`, castShadow(b)),
    img(`item-${prefix}`, icon(iconGrid)),
    inHandToo ? heldInHand(`held-${prefix}`, a, b) : held(`held-${prefix}`, a, a),
  ];
}

/** Clé du moellon de chaque longueur. */
const RUBBLE_KEY: Record<RubbleLength, string> = { 30: 'short-rubble-stone', 40: 'rubble-stone', 50: 'long-rubble-stone' };

function rubble(length: RubbleLength): (ImageSource | SpriteSheetSource)[] {
  const key = RUBBLE_KEY[length];
  const ew = dressed(`${key} est-ouest`, RUBBLE_EW[length]);
  const ns = dressed(`${key} nord-sud`, RUBBLE_NS[length]);
  return [
    img(`${key}-ground`, castShadow(ew)),
    img(`${key}-ground-ns`, castShadow(ns)),
    img(`item-${key}`, icon(dressed(`icône ${key}`, ICON_RUBBLE[length]))),
    held(`held-${key}`, ew, ns),
  ];
}

const sources = [
  ...rough('small-rough-stone', SMALL, ICON_ROUGH.small, true),
  ...rough('rough-stone', MEDIUM, ICON_ROUGH.medium),
  ...rough('big-rough-stone', BIG, ICON_ROUGH.big),
  ...LENGTHS.flatMap(rubble),
  img('ashlar-ground', castShadow(ASHLAR_EW)),
  img('ashlar-ground-ns', castShadow(ASHLAR_NS)),
  img('item-ashlar', icon(ASHLAR_ICON)),
  held('held-ashlar', ASHLAR_EW, ASHLAR_NS),
  img('stone-chips', CHIPS),
];

export default sources;
