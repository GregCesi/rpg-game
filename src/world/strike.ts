// Le coup d'une arme, sans Phaser (docs/CONCEPTION.md, « Le combat ») : tout se calcule de l'arme (longueur, prise, équilibre,
// efficacité, masse), de l'attaque (combat.json) et des poses du geste (art/characters/xeros-combat.ts, `COMBAT_POSES`, tirées par
// build-art dans src/generated/combatPoses.ts) : la posture qui sert, la durée de chaque image, la vitesse de ce qui frappe, les
// dégâts, la précision et l'écart qu'elle laisse, le prix en endurance, et la zone de coup : la lame dessinée (de la main à la pointe ;
// pour le poing, de l'épaule au poing) à chaque image de frappe, et la surface qu'elle balaie depuis l'image d'avant. Une cible est
// touchée si ce balayage recoupe sa silhouette dessinée. systems/combat.ts le joue ; tools/test-combat.ts le vérifie.

import { CM_PER_PX, type Dims } from '../content/gabarit';
import type { Attack, CombatDef, Facing, StaminaDef, StanceDef, Weapon } from '../content/types';

type Rules = CombatDef['rules'];
export type Point = { x: number; y: number };
/** Une boîte, en px : gauche, haut (nord), droite, bas (sud). */
export type Box = { left: number; top: number; right: number; bottom: number };
/** Un segment : de la main (ou de l'épaule) à la pointe (ou au poing). */
export type Segment = { a: Point; b: Point };

/** Un point du corps depuis les pieds, à une image d'un geste (vers la gauche : dans le repère retourné, le jeu oppose dx). */
export interface PosePoint {
  dx: number;
  dy: number;
  behind?: boolean;
}

/** Une image d'un geste de combat (COMBAT_POSES) : sa durée, les mains et les épaules, l'arme, la traînée, l'éclat, la frappe. */
export interface CombatFrame {
  /** Nom du temps (garde, armer, frappe…), pour les aperçus. */
  name?: string;
  ms: number;
  right: PosePoint;
  left: PosePoint;
  shoulderRight: PosePoint;
  shoulderLeft: PosePoint;
  /** L'arme dans la main droite : l'angle de son dessin (0 = est, 90 = nord), derrière le corps ou non. */
  weapon?: { angle: number; behind: boolean };
  smear?: { image: string; dx: number; dy: number; behind: boolean };
  spark?: { image: string; dx: number; dy: number };
  /** L'arme ou le poing frappe à cette image : la lame y compte, et le balayage depuis l'image d'avant. */
  strike?: boolean;
}

/** Un geste de combat : ses images par direction (la gauche a les siennes, dessinées ; pas un miroir de la droite). */
export type CombatPoses = Record<Facing, CombatFrame[]>;

/** Les mains libres de Xéros pendant qu'il attaque (le poing), l'arme à deux mains, ce que tient l'autre main : pour choisir la posture. */
export interface Grip {
  other: 'empty' | 'weapon' | 'other';
  both: boolean;
  free: 'both' | 'right' | 'left' | 'none';
}

/** La posture de la famille qui sert : la première dont `when` convient à ce que tiennent les mains (validate.ts : la dernière convient à tout). */
export function stanceFor(def: CombatDef, family: string, grip: Grip): StanceDef {
  const stances = def.families[family].stances;
  const fits = (s: StanceDef) =>
    (s.when.both === undefined || s.when.both === grip.both) &&
    (s.when.other === undefined || s.when.other === 'any' || s.when.other === grip.other) &&
    (s.when.free === undefined || s.when.free === grip.free);
  return stances.find(fits) ?? stances[stances.length - 1];
}

/** Longueur de l'arme devant la main, en cm (le poing : le bras, de l'épaule au poing). */
export const ahead = (w: Weapon): number => w.length - w.grip;

/** Portée nominale d'une attaque avec cette arme, en cm, depuis les pieds : le bras, puis l'arme devant la main (le poing : le bras seul). */
export const reachCm = (rules: Rules, w: Weapon): number => (w.fist ? w.length : rules.armCm + ahead(w));

/**
 * Masse qui frappe, en kg : m × 2/3 × `balance` (une tige uniforme, `balance` 0,5, frappe de son tiers ; un gourdin lourd du bout,
 * davantage ; une épée équilibrée près de la garde, moins). Le moment d'inertie autour de la main en est tiré : cette masse × L².
 */
export const strikingMass = (w: Weapon, kg: number): number => (2 / 3) * w.balance * kg;

/** Moment d'inertie de l'arme autour de la main (kg·m²) : la masse qui frappe × L² (L, sa longueur devant la main). */
export function inertia(w: Weapon, kg: number): number {
  const l = ahead(w) / 100;
  return strikingMass(w, kg) * l * l;
}

/** Précision de l'arme, de 0 à 1 : 1 / (1 + I / `controlRef`) ; elle se contrôle d'autant mieux que son inertie est faible. */
export const precision = (rules: Rules, w: Weapon, kg: number): number => 1 / (1 + inertia(w, kg) / rules.controlRef);

/** Facteur d'allongement du geste : 1 jusqu'à `inertiaRef`, puis `inertiaSlow` de plus par kg·m². */
export const slowness = (rules: Rules, w: Weapon, kg: number): number => 1 + rules.inertiaSlow * Math.max(0, inertia(w, kg) - rules.inertiaRef);

/** Durée de chaque image du geste avec cette arme (ms) : celle des poses, allongée par l'inertie. Une seule source : les poses. */
export const frameDurations = (rules: Rules, frames: CombatFrame[], w: Weapon, kg: number): number[] => {
  const k = slowness(rules, w, kg);
  return frames.map((f) => Math.round(f.ms * k));
};

/** Durée d'un coup entier (garde comprise), en ms : la somme des images du geste avec cette arme. */
export const cycle = (rules: Rules, frames: CombatFrame[], w: Weapon, kg: number): number => frameDurations(rules, frames, w, kg).reduce((s, d) => s + d, 0);

/** Prix d'une attaque en endurance : `attackBase` + `attackPerKg` × la masse de l'arme, × `cost` de l'attaque (stamina.json). */
export const attackCost = (costs: StaminaDef['costs'], a: Attack, kg: number): number => (costs.attackBase + costs.attackPerKg * kg) * a.cost;

/** Un point de pose dans le monde : les pieds + (dx, dy), dx opposé vers la gauche (le jeu retourne l'image). */
const at = (feet: Point, p: PosePoint, left: boolean): Point => ({ x: feet.x + (left ? -p.dx : p.dx), y: feet.y + p.dy });

/**
 * La lame d'une image, dans le monde : pour une arme, de la main droite à la pointe, dans l'angle de son dessin, de sa longueur devant
 * la main (vers la gauche, l'angle est retourné : 180° − a) ; pour le poing (`hand`), de l'épaule au poing. `shift` : l'écart de la
 * précision, ajouté à toute la lame.
 */
export function bladeAt(f: CombatFrame, facing: Facing, feet: Point, w: Weapon, hand: 'right' | 'left', shift: Point = { x: 0, y: 0 }): Segment | undefined {
  const left = facing === 'left';
  const move = (p: Point) => ({ x: p.x + shift.x, y: p.y + shift.y });
  if (w.fist) {
    const fist = at(feet, hand === 'right' ? f.right : f.left, left);
    const shoulder = at(feet, hand === 'right' ? f.shoulderRight : f.shoulderLeft, left);
    return { a: move(shoulder), b: move(fist) };
  }
  if (!f.weapon) return undefined;
  const h = at(feet, f.right, left);
  const deg = left ? 180 - f.weapon.angle : f.weapon.angle;
  const r = ahead(w) / CM_PER_PX;
  const t = (deg * Math.PI) / 180;
  return { a: move(h), b: move({ x: h.x + Math.cos(t) * r, y: h.y - Math.sin(t) * r }) };
}

/** Angle d'un segment (rad, à l'écran : y vers le bas). */
const angleOf = (s: Segment) => Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x);

/**
 * La surface balayée par la lame de `from` à `to` : des lames intermédiaires, la base glissant en ligne droite et l'angle tournant
 * par le plus court (une image de frappe ne tourne jamais de plus d'un demi-tour), une tous les `step` px parcourus par la pointe.
 */
export function sweep(from: Segment, to: Segment, step = 1): Segment[] {
  const a0 = angleOf(from);
  let da = angleOf(to) - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const l0 = Math.hypot(from.b.x - from.a.x, from.b.y - from.a.y);
  const l1 = Math.hypot(to.b.x - to.a.x, to.b.y - to.a.y);
  const travel = Math.hypot(to.b.x - from.b.x, to.b.y - from.b.y) + Math.abs(da) * Math.max(l0, l1);
  const n = Math.max(1, Math.ceil(travel / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const base = { x: from.a.x + (to.a.x - from.a.x) * t, y: from.a.y + (to.a.y - from.a.y) * t };
    const ang = a0 + da * t;
    const len = l0 + (l1 - l0) * t;
    return { a: base, b: { x: base.x + Math.cos(ang) * len, y: base.y + Math.sin(ang) * len } };
  });
}

/**
 * Tout ce que balaie la lame pendant un geste, image de frappe par image de frappe : pour chaque image `strike`, la lame de l'image
 * d'avant jusqu'à la sienne. Rend, par image de frappe (son indice), ses lames.
 */
export function strikePath(frames: CombatFrame[], facing: Facing, feet: Point, w: Weapon, hand: 'right' | 'left', shift?: Point): { step: number; blades: Segment[] }[] {
  const out: { step: number; blades: Segment[] }[] = [];
  frames.forEach((f, i) => {
    if (!f.strike) return;
    const now = bladeAt(f, facing, feet, w, hand, shift);
    if (!now) return;
    const before = i > 0 ? bladeAt(frames[i - 1], facing, feet, w, hand, shift) : undefined;
    out.push({ step: i, blades: before ? sweep(before, now) : [now] });
  });
  return out;
}

/**
 * Vitesse de ce qui frappe (m/s) : le chemin de la pointe (du poing) de l'image d'avant la première frappe jusqu'à la dernière image de
 * frappe, sur la durée des images de frappe avec cette arme. Le geste le dit, pas un nombre recopié.
 */
export function tipSpeed(rules: Rules, frames: CombatFrame[], facing: Facing, w: Weapon, kg: number, hand: 'right' | 'left'): number {
  const ms = frameDurations(rules, frames, w, kg);
  const feet = { x: 0, y: 0 };
  let px = 0;
  let t = 0;
  frames.forEach((f, i) => {
    if (!f.strike || i === 0) return;
    const a = bladeAt(frames[i - 1], facing, feet, w, hand);
    const b = bladeAt(f, facing, feet, w, hand);
    if (!a || !b) return;
    // l'arc parcouru par la pointe, mesuré sur le balayage (une corde par lame intermédiaire)
    const path = sweep(a, b, 0.5);
    for (let k = 1; k < path.length; k++) px += Math.hypot(path[k].b.x - path[k - 1].b.x, path[k].b.y - path[k - 1].b.y);
    t += ms[i];
  });
  return t > 0 ? (px * CM_PER_PX) / 100 / (t / 1000) : 0;
}

/**
 * Dégâts d'un coup : l'énergie de ce qui frappe (½ × masse qui frappe × v², en joules) × `damagePerJoule` × `efficiency` de l'arme ×
 * `power` de l'attaque, au dixième. La vitesse vient des poses (de face, la direction de référence).
 */
export function damage(rules: Rules, a: Attack, frames: CombatFrame[], w: Weapon, kg: number): number {
  const v = tipSpeed(rules, frames, 'down', w, kg, a.hand);
  const joules = 0.5 * strikingMass(w, kg) * v * v;
  return Math.round(joules * rules.damagePerJoule * w.efficiency * a.power * 10) / 10;
}

/**
 * L'écart d'un coup, tiré à chaque fois : un point au hasard dans un disque de `missPx` × (1 − précision)² px (`rand` : un tirage
 * entre 0 et 1, Math.random en jeu, un tirage fixé dans les tests). Toute la lame passe à côté d'autant : l'arme se voit décalée.
 * Au carré, pour qu'une arme précise reste sûre (l'épée, 0,76 : moins de 2 px) et qu'une arme maladroite se voie (la branche, 0,18 :
 * jusqu'à 13 px).
 */
export function aimShift(rules: Rules, w: Weapon, kg: number, rand: () => number = Math.random): Point {
  const r = rules.missPx * (1 - precision(rules, w, kg)) ** 2 * Math.sqrt(rand());
  const t = rand() * 2 * Math.PI;
  return { x: Math.round(Math.cos(t) * r), y: Math.round(Math.sin(t) * r) };
}

/** Une silhouette dessinée : sa boîte dans le monde et ses pixels opaques (vrai si le pixel (x, y) du monde en fait partie). */
export interface Silhouette {
  box: Box;
  covers: (x: number, y: number) => boolean;
}

/** Une lame recoupe-t-elle la silhouette ? Le long du segment, tous les demi-pixels. */
export function bladeHits(s: Segment, sil: Silhouette): boolean {
  const { box } = sil;
  if (Math.max(s.a.x, s.b.x) < box.left || Math.min(s.a.x, s.b.x) > box.right || Math.max(s.a.y, s.b.y) < box.top || Math.min(s.a.y, s.b.y) > box.bottom) return false;
  const n = Math.max(1, Math.ceil(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) * 2));
  for (let i = 0; i <= n; i++) {
    const x = s.a.x + ((s.b.x - s.a.x) * i) / n;
    const y = s.a.y + ((s.b.y - s.a.y) * i) / n;
    if (sil.covers(Math.floor(x), Math.floor(y))) return true;
  }
  return false;
}

/** L'emprise au sol d'une cible debout, en px : ses `dims` (largeur, profondeur), centrée sur sa base, son bord sud à la base. */
export function footprint(dims: Dims, baseX: number, baseY: number): Box {
  const w = dims.w / CM_PER_PX;
  return { left: baseX - w / 2, right: baseX + w / 2, top: baseY - dims.d / CM_PER_PX, bottom: baseY };
}

const DIR: Record<Facing, Point> = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

/**
 * La cible est-elle devant Xéros, au sol, à portée ? Son emprise est du côté où il regarde (pas derrière lui, même si son image passe
 * derrière la lame à l'écran) et à moins de `reach` cm de ses pieds. Seule une cible devant lui peut être touchée par ce qu'il voit
 * passer sur elle.
 */
export function inFront(feet: Point, facing: Facing, foot: Box, reach: number): boolean {
  const d = DIR[facing];
  const cx = Math.max(foot.left, Math.min(feet.x, foot.right));
  const cy = Math.max(foot.top, Math.min(feet.y, foot.bottom));
  const ahead = (cx - feet.x) * d.x + (cy - feet.y) * d.y;
  const far = d.x !== 0 ? (d.x > 0 ? foot.right - feet.x : feet.x - foot.left) : d.y > 0 ? foot.bottom - feet.y : feet.y - foot.top;
  return far > 0 && ahead >= -1 && Math.hypot(cx - feet.x, cy - feet.y) <= reach / CM_PER_PX;
}

/** Nombre d'images d'une planche d'arme (`weapon-<…>`, animation `angles`) : un angle tous les 45°. */
export const WEAPON_ANGLES = 8;

/** Image de la planche d'une arme pour un angle (degrés, 0 = est, 90 = nord) : l'angle le plus proche des huit. */
export const weaponFrame = (deg: number): number => Math.round((((deg % 360) + 360) % 360) / 45) % WEAPON_ANGLES;
