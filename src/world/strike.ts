// Le coup d'une arme, sans Phaser (docs/CONCEPTION.md, « Le combat ») : tout se calcule de l'arme (longueur, prise, équilibre,
// efficacité, masse), de l'attaque et de son geste (combat.json : `attacks`, `sweeps`) et des poses dessinées (COMBAT_POSES,
// src/generated/combatPoses.ts : les durées des images, l'image seulement). La zone de coup se calcule DANS LE MONDE, AU SOL : à
// chaque image active du geste, l'arme balaie, depuis l'image d'avant, un secteur devant Xéros (l'angle de chaque image par rapport à
// où il regarde, la part de la portée atteinte), de la largeur de ce qui frappe ; une cible est touchée si son emprise au sol y entre.
// La lame dessinée ne sert qu'à l'image : à l'écran, la hauteur se mêle à la profondeur (y − z), et une lame levée au-dessus de la tête
// y est dessinée là où serait ce qui est devant Xéros vers le nord. systems/combat.ts le joue ; tools/test-combat.ts et
// tools/carte-touche.ts le vérifient.

import { CM_PER_PX, type Dims } from '../content/gabarit';
import type { Attack, CombatDef, Facing, StaminaDef, StanceDef, SweepDef, Weapon } from '../content/types';

type Rules = CombatDef['rules'];
export type Point = { x: number; y: number };
/** Une boîte, en px : gauche, haut (nord), droite, bas (sud). */
export type Box = { left: number; top: number; right: number; bottom: number };
/** Un segment, en px du monde au sol : des pieds de Xéros à la pointe de ce qui frappe. */
export type Segment = { a: Point; b: Point };

/** Un point du corps depuis les pieds, à une image d'un geste (vers la gauche : dans le repère retourné, le jeu oppose dx). */
interface PosePoint {
  dx: number;
  dy: number;
  behind?: boolean;
}

/** Une image d'un geste de combat (COMBAT_POSES) : sa durée et ce qui se dessine (mains, épaules, arme, traînée, main par-dessus, éclat). */
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
  /** La traînée : le suffixe de son image (`<geste>-<direction>-<n>`), tirée pour chaque arme à sa longueur : `fx-smear-<arme>-<suffixe>`. */
  smear?: { image: string; dx: number; dy: number; behind: boolean };
  /** L'arme est derrière le corps et la main qui la tient serait cachée : l'image de la main, posée par-dessus le corps. */
  grip?: { image: string; dx: number; dy: number };
  spark?: { image: string; dx: number; dy: number };
  /** Image de frappe du dessin (la traînée, l'éclat) ; les images où le coup compte sont `active` de `sweeps` (combat.json). */
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

/** Portée d'un geste avec cette arme, en cm, depuis les pieds : la main tendue (`hand` du geste), puis l'arme devant la main. */
export const reachCm = (s: SweepDef, w: Weapon): number => s.hand + ahead(w);

/**
 * Masse qui frappe, en kg : m × 2/3 × `balance` (une tige uniforme, `balance` 0,5, frappe de son tiers ; un gourdin lourd du bout,
 * davantage ; une épée équilibrée près de la garde, moins). Le moment d'inertie autour de la main en est tiré : cette masse × L².
 */
const strikingMass = (w: Weapon, kg: number): number => (2 / 3) * w.balance * kg;

/** Moment d'inertie de l'arme autour de la main (kg·m²) : la masse qui frappe × L² (L, sa longueur devant la main). */
export function inertia(w: Weapon, kg: number): number {
  const l = ahead(w) / 100;
  return strikingMass(w, kg) * l * l;
}

/** Précision de l'arme, de 0 à 1 : 1 / (1 + I / `controlRef`) ; elle se contrôle d'autant mieux que son inertie est faible. */
export const precision = (rules: Rules, w: Weapon, kg: number): number => 1 / (1 + inertia(w, kg) / rules.controlRef);

/** Facteur d'allongement du geste : 1 jusqu'à `inertiaRef`, puis `inertiaSlow` de plus par kg·m². */
const slowness = (rules: Rules, w: Weapon, kg: number): number => 1 + rules.inertiaSlow * Math.max(0, inertia(w, kg) - rules.inertiaRef);

/** Durée de chaque image du geste avec cette arme (ms) : celle des poses, allongée par l'inertie. Une seule source : les poses. */
export const frameDurations = (rules: Rules, frames: CombatFrame[], w: Weapon, kg: number): number[] => {
  const k = slowness(rules, w, kg);
  return frames.map((f) => Math.round(f.ms * k));
};

/** Durée d'un coup entier (garde comprise), en ms : la somme des images du geste avec cette arme. */
export const cycle = (rules: Rules, frames: CombatFrame[], w: Weapon, kg: number): number => frameDurations(rules, frames, w, kg).reduce((s, d) => s + d, 0);

/**
 * Prix d'une attaque en endurance, comme un coup de travail (une seule physique pour les outils et les armes) : son énergie (`strikeEnergy`)
 * × `ceilingPerJ` au plafond, × `breathPerJ` au souffle (stamina.json, `work`) ; même dans le vide : c'est le geste qui fatigue.
 */
export const attackCost = (perJ: StaminaDef['work'], joules: number): { ceiling: number; breath: number } => ({
  ceiling: joules * perJ.ceilingPerJ,
  breath: joules * perJ.breathPerJ,
});

const FACE: Record<Facing, Point> = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

/**
 * La direction au sol d'un angle du geste (degrés : 0 droit devant, + vers la droite de Xéros, − vers sa gauche). Sa droite est la
 * direction où il regarde tournée d'un quart dans le sens des aiguilles d'une montre, vue du dessus (y vers le bas) : tourné vers le
 * sud, sa droite est l'ouest ; vers l'est, le sud.
 */
export function directionOf(facing: Facing, deg: number): Point {
  const f = FACE[facing];
  const r = { x: -f.y, y: f.x };
  const t = (deg * Math.PI) / 180;
  return { x: f.x * Math.cos(t) + r.x * Math.sin(t), y: f.y * Math.cos(t) + r.y * Math.sin(t) };
}

/** L'écart d'un coup, au sol : vers la droite de Xéros (`side`, px) et en portée (`far`, px ; + plus loin). */
export type Shift = { side: number; far: number };
export const NO_SHIFT: Shift = { side: 0, far: 0 };

/**
 * L'écart d'un coup, tiré à chaque fois : un point au hasard dans un disque de `missPx` × (1 − précision)² px (`rand` : un tirage
 * entre 0 et 1, Math.random en jeu, un tirage fixé dans les tests), en travers (il tourne la zone d'autant d'angle, vu à la portée) et
 * en long (il allonge ou raccourcit la portée). Au carré, pour qu'une arme précise reste sûre (l'épée, 0,76 : moins de 2 px) et qu'une
 * arme maladroite se voie (la branche, 0,18 : jusqu'à 13 px).
 */
export function aimShift(rules: Rules, w: Weapon, kg: number, rand: () => number = Math.random): Shift {
  const r = rules.missPx * (1 - precision(rules, w, kg)) ** 2 * Math.sqrt(rand());
  const t = rand() * 2 * Math.PI;
  return { side: Math.cos(t) * r, far: Math.sin(t) * r };
}

/** La pointe de ce qui frappe à une image du geste, au sol, depuis les pieds (px), avec l'écart du coup. */
function tipAt(s: SweepDef, w: Weapon, facing: Facing, feet: Point, f: { a: number; r: number }, shift: Shift): Point {
  const reach = (reachCm(s, w) / CM_PER_PX) * f.r + shift.far;
  // l'écart en travers tourne l'arme d'autant, vu à la pleine portée
  const deg = f.a + (Math.atan2(shift.side, Math.max(1, reachCm(s, w) / CM_PER_PX)) * 180) / Math.PI;
  const d = directionOf(facing, deg);
  return { x: feet.x + d.x * Math.max(0, reach), y: feet.y + d.y * Math.max(0, reach) };
}

/**
 * Ce que balaie l'arme à l'image active `step` (depuis l'image d'avant), au sol : des lames des pieds à la pointe, l'angle et la portée
 * glissant d'une image à l'autre, une tous les 2° et tous les 2 px.
 */
export function sweepAt(s: SweepDef, w: Weapon, facing: Facing, feet: Point, step: number, shift: Shift = NO_SHIFT): Segment[] {
  const f0 = s.frames[step - 1];
  const f1 = s.frames[step];
  const reach = reachCm(s, w) / CM_PER_PX;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(f1.a - f0.a) / 2, (Math.abs(f1.r - f0.r) * reach) / 2)));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return { a: feet, b: tipAt(s, w, facing, feet, { a: f0.a + (f1.a - f0.a) * t, r: f0.r + (f1.r - f0.r) * t }, shift) };
  });
}

/** Une lame de largeur `width` (cm) touche-t-elle la boîte ? Le long du segment, tous les demi-pixels, à une demi-largeur près. */
function bladeHits(b: Segment, width: number, box: Box): boolean {
  const h = width / CM_PER_PX / 2;
  const n = Math.max(1, Math.ceil(Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y) * 2));
  for (let i = 0; i <= n; i++) {
    const x = b.a.x + ((b.b.x - b.a.x) * i) / n;
    const y = b.a.y + ((b.b.y - b.a.y) * i) / n;
    if (x >= box.left - h && x <= box.right + h && y >= box.top - h && y <= box.bottom + h) return true;
  }
  return false;
}

/** Le plus grand angle, depuis la direction où regarde Xéros, auquel une cible peut être touchée : au-delà, elle est à côté de lui. */
const FRONT_DEG = 80;

/**
 * La cible est-elle hors de devant Xéros ? Le centre de son emprise est derrière ses pieds, ou à côté de lui (à plus de FRONT_DEG de
 * son regard) : au-dessus de lui à l'écran n'est pas devant lui dans le monde.
 */
export function outside(facing: Facing, feet: Point, box: Box): boolean {
  const f = FACE[facing];
  const cx = (box.left + box.right) / 2 - feet.x;
  const cy = (box.top + box.bottom) / 2 - feet.y;
  const fwd = cx * f.x + cy * f.y;
  const side = Math.abs(cx * -f.y + cy * f.x);
  return fwd <= 0 || (Math.atan2(side, fwd) * 180) / Math.PI > FRONT_DEG;
}

/**
 * La zone de l'image active `step` touche-t-elle la boîte (l'emprise au sol d'une cible) ? Jamais une cible derrière Xéros ni à côté
 * de lui (la lame part de ses pieds et a une largeur : sans cela, une cible collée dans son dos ou à son flanc serait effleurée).
 */
export const zoneHits = (s: SweepDef, w: Weapon, facing: Facing, feet: Point, step: number, box: Box, shift: Shift = NO_SHIFT): boolean =>
  !outside(facing, feet, box) && sweepAt(s, w, facing, feet, step, shift).some((b) => bladeHits(b, s.width, box));

/** La première image active qui touche la boîte, ou −1 (le coup entier, sans écart sauf `shift`). */
export const firstHit = (s: SweepDef, w: Weapon, facing: Facing, feet: Point, box: Box, shift: Shift = NO_SHIFT): number =>
  s.active.find((step) => zoneHits(s, w, facing, feet, step, box, shift)) ?? -1;

/**
 * Vitesse de ce qui frappe (m/s) : celle de l'image active la plus rapide, le chemin de la pointe dans l'espace (au sol, et en
 * hauteur : `z`) depuis l'image d'avant, sur sa durée avec cette arme (celle des poses, allongée par l'inertie).
 */
function tipSpeed(rules: Rules, s: SweepDef, frames: CombatFrame[], w: Weapon, kg: number): number {
  const ms = frameDurations(rules, frames, w, kg);
  const feet = { x: 0, y: 0 };
  let px = 0;
  let t = 0;
  const reach = reachCm(s, w) / CM_PER_PX;
  let best = 0;
  for (const step of s.active) {
    px = 0;
    // la pointe dans l'espace : au sol (l'angle, la part de la portée), et en hauteur (`z`) : un coup d'en haut tombe
    const f0 = s.frames[step - 1];
    const f1 = s.frames[step];
    const n = 24;
    let prev: [number, number, number] | undefined;
    for (let i = 0; i <= n; i++) {
      const t0 = i / n;
      const f = { a: f0.a + (f1.a - f0.a) * t0, r: f0.r + (f1.r - f0.r) * t0 };
      const tip = tipAt(s, w, 'down', feet, f, NO_SHIFT);
      const p: [number, number, number] = [tip.x, tip.y, (f0.z + (f1.z - f0.z) * t0) * reach];
      if (prev) px += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
      prev = p;
    }
    t = ms[step] ?? 0;
    if (t > 0) best = Math.max(best, (px * CM_PER_PX) / 100 / (t / 1000));
  }
  return best;
}

/**
 * L'énergie d'une attaque, en joules : celle de ce qui frappe (½ × masse qui frappe × v²) × `power` de l'attaque (la part du corps qui
 * s'y met : le coup d'en haut, plus). Elle fait les dégâts et se paie en endurance.
 */
export function strikeEnergy(rules: Rules, a: Attack, s: SweepDef, frames: CombatFrame[], w: Weapon, kg: number): number {
  const v = tipSpeed(rules, s, frames, w, kg);
  return 0.5 * strikingMass(w, kg) * v * v * a.power;
}

/** Dégâts d'un coup : son énergie (`strikeEnergy`) × `damagePerJoule` × `efficiency` de l'arme, au dixième. */
export function damage(rules: Rules, a: Attack, s: SweepDef, frames: CombatFrame[], w: Weapon, kg: number): number {
  return Math.round(strikeEnergy(rules, a, s, frames, w, kg) * rules.damagePerJoule * w.efficiency * 10) / 10;
}

/** L'emprise au sol d'une cible debout, en px : ses `dims` (largeur, profondeur), centrée sur sa base, son bord sud à la base. */
export function footprint(dims: Dims, baseX: number, baseY: number): Box {
  const w = dims.w / CM_PER_PX;
  return { left: baseX - w / 2, right: baseX + w / 2, top: baseY - dims.d / CM_PER_PX, bottom: baseY };
}

/** Nombre d'images d'une planche d'arme (`weapon-<…>`, animation `angles`) : un angle tous les 45°. */
export const WEAPON_ANGLES = 8;

/** Image de la planche d'une arme pour un angle (degrés, 0 = est, 90 = nord) : l'angle le plus proche des huit. */
export const weaponFrame = (deg: number): number => Math.round((((deg % 360) + 360) % 360) / 45) % WEAPON_ANGLES;
