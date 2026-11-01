// Les armes du combat de base (docs/CONCEPTION.md, « Le combat ») : la branche sèche et l'épée de bois.
//
// - En attaque, planches `weapon-branch` et `weapon-wooden-sword` (art/lib/weapon.ts) : un seul dessin chacune, couché vers
//   l'est, la main sur WEAPON_GRIP (32, 32), en zones de matière sans ombre ni contour ; huit angles par rotation, éclairés
//   après coup en haut à gauche (art/lib/light.ts).
// - L'épée de bois au sol (`wooden-sword-ground`, `-r1` à `-r3`, règle D de docs/STYLE.md section 8) et tenue au poing
//   (`held-wooden-sword`, posture `hand`, comme `held-stake`). Fiche : docs/objets/wooden-sword.md.
//
// Échelle : 5 cm par pixel.
// - La branche : 125 cm = 25 px ; la main à 10 cm du gros bout (2 px derrière la main, 23 devant) ; le gros bout de 2 px,
//   son bout cassé en bois clair (U u), puis la tige d'un pixel, deux rameaux courts. Matières de la branche du tas
//   (art/items/branch.ts) : l'écorce M m N, contour N côté lumière.
// - L'épée : 80 cm = 16 px du pommeau à la pointe (fiche) : pommeau et poignée sur 3 px (x 30 à 32, la main sur le dernier),
//   la garde d'un pixel (x 33) qui déborde d'un pixel de part et d'autre de la lame (15 cm au lieu de 10, pour qu'elle se lise
//   une fois tournée), la lame plate d'un pixel, 12 px (60 cm), qui s'arrondit au bout (le contour n'y met pas de coin).
//   Bois travaillé : la rampe des âges (`woodAges`, art/palette.ts) ; la lame claire (^), la garde et la poignée plus
//   sombres (% &). Contour côté lumière : & (le creux, la teinte la plus sombre du bois après le joint, qui n'est jamais un
//   contour).
//
// Au sol, l'épée (boîte 80 × 5 × 2,5 cm, gabarit 16 × 1 px) est dessinée 16 × 3 au plancher de lisibilité, comme la
// cheville (art/items/wood-small.ts) : une rangée de bois et l'OUTLINE au sud (moins d'un pixel d'épaisseur : pas de contour
// au nord) ; la garde déborde d'un pixel au nord et au sud. Nord-sud : 3 × 16 (une colonne de bois, l'OUTLINE à l'est).
// L'image au sol prend l'âge au build (`aged` de items.json) : elle n'a que les signes de la rampe et l'OUTLINE.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import { lightUp, type Materials } from '../lib/light';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { WEAPON_GRIP, WEAPON_SIZE, weaponSheet, type WeaponArt } from '../lib/weapon';
import { world } from '../palette';
import { BRANCH_FIST, fistGap, sheet } from './carried';

const [GX, GY] = WEAPON_GRIP;

// =====================================================================================================================
// La branche en arme
// =====================================================================================================================

/** L'écorce de la branche (art/items/branch.ts) : M au jour, m le flanc, N l'ombre et le contour côté lumière. */
const bark = { light: 'M', base: 'm', shade: 'N', dark: 'N' };

const branchMaterials: Materials = {
  b: bark,
  // le bout cassé, bois clair (U au jour, u à l'ombre)
  c: { light: 'U', base: 'u', shade: 'u', dark: 'N' },
};

/**
 * La branche couchée vers l'est, en zones : le bout cassé (c) deux pixels derrière la main, le gros bout sur deux rangées
 * (GY − 1 et GY) jusqu'à 6 px devant la main, puis la tige d'un pixel sur la rangée de la main, qui se relève d'un pixel sur
 * ses quatre derniers ; un rameau qui monte vers la pointe, un autre, plus court, qui descend.
 */
function branchBase(): Grid {
  const c = new Canvas(WEAPON_SIZE, WEAPON_SIZE);
  const x0 = GX - 2; // le bout cassé
  const x1 = GX + 22; // la pointe (25 px en tout)
  for (let x = x0; x <= x1; x++) {
    if (x <= GX + 5) c.set(x, GY - 1, 'b').set(x, GY, 'b');
    else c.set(x, x >= x1 - 3 ? GY - 1 : GY, 'b');
  }
  c.set(x0, GY - 1, 'c').set(x0, GY, 'c');
  // un rameau qui monte vers la pointe, fourchu au bout
  c.set(GX + 10, GY - 1, 'b').set(GX + 11, GY - 2, 'b').set(GX + 12, GY - 2, 'b').set(GX + 13, GY - 3, 'b');
  // un rameau court qui descend
  c.set(GX + 15, GY + 1, 'b').set(GX + 16, GY + 2, 'b');
  return c.toGrid();
}

export const branchWeapon = (): WeaponArt => ({ base: branchBase(), materials: branchMaterials });

// =====================================================================================================================
// L'épée de bois en arme
// =====================================================================================================================

/** La lame : le bois neuf au jour (^), son fil (*) quand elle tourne le dos à la lumière. */
const blade = { light: '^', base: '^', shade: '*', dark: '&' };
/** La poignée, la garde et le pommeau : le même bois, plus sombre (taillé, poli par la main). */
const hilt = { light: '*', base: '%', shade: '&', dark: '&' };

const swordMaterials: Materials = { l: blade, h: hilt };

/** Longueur de la lame (60 cm) et position de la garde, le long de l'arme depuis la main. */
const BLADE = 12;
const GUARD = 1;

/** L'épée couchée vers l'est, en zones : pommeau et poignée (h) de GX − 2 à GX, la garde en travers, la lame (l). */
function swordBase(): Grid {
  const c = new Canvas(WEAPON_SIZE, WEAPON_SIZE);
  for (let x = GX - 2; x <= GX; x++) c.set(x, GY, 'h');
  for (let y = GY - 1; y <= GY + 1; y++) c.set(GX + GUARD, y, 'h');
  for (let i = 1; i <= BLADE; i++) c.set(GX + GUARD + i, GY, 'l');
  return c.toGrid();
}

/**
 * Une diagonale reprise à la main : l'épée tournée de k × 45° (k impair), tracée pixel à pixel le long de sa direction
 * (dx, dy), pour une ligne d'un seul tenant, sans le zigzag de la rotation au plus proche voisin ; la garde en travers
 * (−dy, dx) d'un pixel de part et d'autre : une petite diagonale qui croise la lame.
 */
function swordDiag(dx: number, dy: number): Grid {
  const c = new Canvas(WEAPON_SIZE, WEAPON_SIZE);
  // le long de la diagonale, un pas vaut 1,41 px : 16 px de long font 11 pas
  const along = (n: number) => [GX + dx * n, GY + dy * n] as const;
  for (let n = -1; n <= 0; n++) c.set(...along(n), 'h'); // pommeau et poignée
  const [hx, hy] = along(1); // la garde
  c.set(hx, hy, 'h');
  c.set(hx - dy, hy + dx, 'h').set(hx + dy, hy - dx, 'h');
  for (let n = 2; n <= 9; n++) c.set(...along(n), 'l');
  return c.toGrid();
}

/** Directions de la pointe pour les angles impairs (sens trigonométrique à l'écran : 45° = haut à droite). */
const DIAG: Record<1 | 3 | 5 | 7, [number, number]> = { 1: [1, -1], 3: [-1, -1], 5: [-1, 1], 7: [1, 1] };

export const swordWeapon = (): WeaponArt => ({
  base: swordBase(),
  materials: swordMaterials,
  retouch: Object.fromEntries(Object.entries(DIAG).map(([k, [dx, dy]]) => [Number(k), swordDiag(dx, dy)])),
});

// =====================================================================================================================
// L'épée de bois au sol
// =====================================================================================================================

type Turn = 0 | 1 | 2 | 3;
const TURNS: Turn[] = [0, 1, 2, 3];
const suffix = (t: Turn) => (t === 0 ? '' : `-r${t}`);

/**
 * Le bois de l'épée depuis le pommeau (16 px) : le pommeau (&), la poignée (%), la garde (*, le dessus de la traverse), la
 * lame au jour (^) et son fil en tirets (*), la pointe arrondie un cran plus sombre (*).
 */
const SWORD = ['&', '%', '%', '*', '^', '^', '*', '^', '^', '^', '*', '^', '^', '*', '^', '*'];
const GUARD_AT = 3;

/** Ombre portée au sol : la silhouette décalée d'un pixel vers l'est et le sud, sur le vide. */
function dropShadow(g: Grid): Grid {
  const body = Canvas.from(g);
  const c = new Canvas(body.w + 1, body.h + 1).stamp(g, 0, 0);
  for (let y = 1; y < c.h; y++) for (let x = 1; x < c.w; x++) {
    if (c.get(x, y) === EMPTY && body.get(x - 1, y - 1) !== EMPTY) c.set(x, y, 'x');
  }
  return c.toGrid();
}

/**
 * L'épée couchée, un quart de tour de plus dans le sens des aiguilles d'une montre à chaque vue : la pointe à l'est (0), au
 * sud (1), à l'ouest (2), au nord (3). Une rangée (ou une colonne) de bois, l'OUTLINE au sud (ou à l'est) sauf sous la
 * pointe ; la garde déborde d'un pixel de chaque côté : au nord (ou à l'ouest), au jour (^) ; au sud (ou à l'est), dans
 * l'ombre (&).
 */
function swordGround(turn: Turn): Grid {
  const n = SWORD.length;
  const crosswise = turn % 2 === 1;
  const c = new Canvas(crosswise ? 3 : n, crosswise ? n : 3);
  const along = (i: number) => (turn === 0 || turn === 1 ? i : n - 1 - i); // depuis l'ouest ou le nord
  SWORD.forEach((k, i) => {
    const p = along(i);
    const tip = i === n - 1;
    const guard = i === GUARD_AT;
    const set = (across: number, v: string) => (crosswise ? c.set(across, p, v) : c.set(p, across, v));
    set(1, guard ? '%' : k);
    if (guard) { set(0, '^'); set(2, '&'); } else if (!tip) set(2, 'o');
  });
  return dropShadow(c.toGrid());
}

// =====================================================================================================================
// L'épée de bois tenue au poing
// =====================================================================================================================
// Posture `hand`, comme le piquet (art/items/stake.ts) : le poing (2 × 2, BRANCH_FIST) serre la poignée, le pommeau dépasse
// d'un pixel au-dessus, la lame pend le long de la jambe, la pointe en bas, près du sol. Le fil de la lame regarde l'avant :
// de profil, on voit le plat, la garde en travers (un pixel devant, un derrière), la lame un peu penchée vers l'avant ; de
// face et de dos, on la voit par la tranche : une colonne droite, la garde réduite à son épaisseur. De dos, l'épée passe sous
// le corps (pas de trou pour le poing).

const HELD = 35;
const HC = Math.floor(HELD / 2);

/** L'épée pendue, en zones : `lean`, la lame avance d'un pixel tous les `lean` pixels (0 : droite) ; `guard` : la garde de profil. */
function hangingZones(lean: number, guard: boolean): Grid {
  const c = new Canvas(HELD, HELD);
  // le pommeau au-dessus du poing, la poignée dans le poing (rangées HC − 1 et HC), sur la colonne du poing côté corps
  for (let y = HC - 2; y <= HC; y++) c.set(HC, y, 'h');
  const gy = HC + 1;
  c.set(HC, gy, 'h');
  if (guard) c.set(HC - 1, gy, 'h').set(HC + 1, gy, 'h');
  for (let i = 1; i <= BLADE; i++) c.set(HC + (lean ? Math.floor(i / lean) : 0), gy + i, 'l');
  return c.toGrid();
}

function heldSwordView(view: 'down' | 'up' | 'right'): Grid {
  const g = lightUp(hangingZones(view === 'right' ? 5 : 0, view === 'right'), swordMaterials);
  return view === 'up' ? g : fistGap(g, HC, BRANCH_FIST);
}

const heldSword = (): SpriteSheetSource =>
  sheet('held-wooden-sword', HELD, world, { down: heldSwordView('down'), up: heldSwordView('up'), right: heldSwordView('right') });

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: world, grid });

export default [
  weaponSheet('branch', branchWeapon(), world),
  weaponSheet('wooden-sword', swordWeapon(), world),
  ...TURNS.map((t) => img(`wooden-sword-ground${suffix(t)}`, swordGround(t))),
  heldSword(),
];
