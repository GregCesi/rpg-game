// Le coup d'une arme, sans Phaser (docs/CONCEPTION.md, « Le combat ») : tout se calcule de l'arme (longueur, prise, masse) et de
// l'attaque (combat.json) : la posture qui sert, la durée de chaque temps du geste, la vitesse de la pointe, les dégâts, le prix en
// endurance, la zone de coup au sol et ce qu'elle touche. systems/combat.ts le joue ; tools/test-combat.ts le vérifie.

import { CM_PER_PX, type Dims } from '../content/gabarit';
import type { Attack, AttackZone, CombatDef, Facing, StaminaDef, StanceDef, Weapon } from '../content/types';

type Rules = CombatDef['rules'];
type Point = { x: number; y: number };
/** Une boîte au sol, en px : gauche, haut (nord), droite, bas (sud). */
export type Box = { left: number; top: number; right: number; bottom: number };

/** Ce que tiennent les mains de Xéros pendant qu'il attaque, pour choisir la posture : l'autre main, et l'arme à deux mains. */
export interface Grip {
  other: 'empty' | 'weapon' | 'other';
  both: boolean;
}

/** La posture de la famille qui sert : la première dont `when` convient à ce que tiennent les mains (validate.ts : la dernière convient à tout). */
export function stanceFor(def: CombatDef, family: string, grip: Grip): StanceDef {
  const stances = def.families[family].stances;
  const fits = (s: StanceDef) =>
    (s.when.both === undefined || s.when.both === grip.both) &&
    (s.when.other === undefined || s.when.other === 'any' || s.when.other === grip.other);
  return stances.find(fits) ?? stances[stances.length - 1];
}

/** Longueur de l'arme devant la main, en cm. */
export const ahead = (w: Weapon): number => w.length - w.grip;

/** Portée d'une attaque avec cette arme, en cm, depuis les pieds : le bras, puis l'arme devant la main. */
export const reachCm = (rules: Rules, w: Weapon): number => rules.armCm + ahead(w);

/**
 * Moment d'inertie de l'arme autour de la main (kg·m²) : m L² × 2/3 × `balance` (L, sa longueur devant la main) ; un bâton uniforme
 * (`balance` 0,5) donne m L² / 3. C'est lui qui fait qu'un long gourdin lourd du bout se balance plus lentement, et se tient moins
 * bien, qu'une épée équilibrée près de la garde.
 */
export function inertia(w: Weapon, kg: number): number {
  const l = ahead(w) / 100;
  return (2 / 3) * w.balance * kg * l * l;
}

/** Précision de l'arme, de 0 à 1 : 1 / (1 + I / `controlRef`) ; elle se contrôle d'autant mieux que son inertie est faible. */
export const precision = (rules: Rules, w: Weapon, kg: number): number => 1 / (1 + inertia(w, kg) / rules.controlRef);

/** Facteur d'allongement du geste : 1 jusqu'à `inertiaRef`, puis `inertiaSlow` de plus par kg·m². */
export const slowness = (rules: Rules, w: Weapon, kg: number): number => 1 + rules.inertiaSlow * Math.max(0, inertia(w, kg) - rules.inertiaRef);

/** Durées des trois temps d'une attaque avec cette arme, en ms : armer, frapper (l'image d'impact), récupérer. */
export function timing(rules: Rules, a: Attack, w: Weapon, kg: number): { windup: number; strike: number; recover: number } {
  const k = slowness(rules, w, kg);
  return { windup: a.windup * k, strike: a.strike * k, recover: a.recover * k };
}

/**
 * Durée de chaque image du geste (ms), pour un geste de `frames` images qui frappe à l'image `impact` : les images d'avant se
 * partagent l'armé, l'image d'impact dure le coup, celles d'après se partagent la récupération.
 */
export function frameDurations(frames: number, impact: number, t: { windup: number; strike: number; recover: number }): number[] {
  const after = frames - impact - 1;
  return Array.from({ length: frames }, (_, i) =>
    Math.max(1, Math.round(i < impact ? t.windup / impact : i === impact ? t.strike : t.recover / Math.max(1, after))),
  );
}

/** Vitesse angulaire de l'arme pendant le coup (rad/s) : la pointe parcourt `sweep` degrés pendant le coup. */
export const angularSpeed = (rules: Rules, a: Attack, w: Weapon, kg: number): number =>
  ((a.sweep * Math.PI) / 180) / (timing(rules, a, w, kg).strike / 1000);

/** Vitesse de la pointe pendant le coup (m/s). */
export const tipSpeed = (rules: Rules, a: Attack, w: Weapon, kg: number): number => (angularSpeed(rules, a, w, kg) * ahead(w)) / 100;

/** Énergie de l'arme au coup, en joules : ½ I ω². */
export function energy(rules: Rules, a: Attack, w: Weapon, kg: number): number {
  const omega = angularSpeed(rules, a, w, kg);
  return 0.5 * inertia(w, kg) * omega * omega;
}

/**
 * Dégâts d'un coup : l'énergie de l'arme au coup × `damagePerJoule` × `efficiency` de l'arme (la part qui fait des dégâts : le fil
 * la concentre, les rameaux l'amortissent) × `power` de l'attaque, au dixième.
 */
export const damage = (rules: Rules, a: Attack, w: Weapon, kg: number): number =>
  Math.round(energy(rules, a, w, kg) * rules.damagePerJoule * w.efficiency * a.power * 10) / 10;

/** Durée d'un coup entier (armer, frapper, revenir), en ms. */
export function cycle(rules: Rules, a: Attack, w: Weapon, kg: number): number {
  const t = timing(rules, a, w, kg);
  return t.windup + t.strike + t.recover;
}

/** Prix d'une attaque en endurance : `attackBase` + `attackPerKg` × la masse de l'arme, × `cost` de l'attaque (stamina.json). */
export const attackCost = (costs: StaminaDef['costs'], a: Attack, kg: number): number => (costs.attackBase + costs.attackPerKg * kg) * a.cost;

const DIR: Record<Facing, Point> = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

/**
 * La zone de coup au sol, en px, depuis les pieds (`origin`) vers où regarde Xéros, de `reach` cm : un polygone convexe (secteur
 * découpé tous les 10° au plus, ou bande).
 */
export function zonePolygon(zone: AttackZone, origin: Point, facing: Facing, reach: number): Point[] {
  const r = reach / CM_PER_PX;
  const d = DIR[facing];
  if ('line' in zone) {
    const half = zone.line / CM_PER_PX / 2;
    const n = { x: -d.y, y: d.x };
    return [
      { x: origin.x + n.x * half, y: origin.y + n.y * half },
      { x: origin.x + n.x * half + d.x * r, y: origin.y + n.y * half + d.y * r },
      { x: origin.x - n.x * half + d.x * r, y: origin.y - n.y * half + d.y * r },
      { x: origin.x - n.x * half, y: origin.y - n.y * half },
    ];
  }
  const mid = Math.atan2(d.y, d.x);
  const half = (zone.arc * Math.PI) / 360;
  const steps = Math.max(2, Math.ceil(zone.arc / 10));
  const pts: Point[] = [{ ...origin }];
  for (let i = 0; i <= steps; i++) {
    const t = mid - half + (2 * half * i) / steps;
    pts.push({ x: origin.x + Math.cos(t) * r, y: origin.y + Math.sin(t) * r });
  }
  return pts;
}

/** L'emprise au sol d'une cible debout, en px : ses `dims` (largeur, profondeur), centrée sur sa base, son bord sud à la base. */
export function footprint(dims: Dims, baseX: number, baseY: number): Box {
  const w = dims.w / CM_PER_PX;
  return { left: baseX - w / 2, right: baseX + w / 2, top: baseY - dims.d / CM_PER_PX, bottom: baseY };
}

/** Le polygone convexe touche-t-il la boîte ? (séparation des axes : ceux de la boîte, puis les normales des côtés du polygone.) */
export function hitsBox(poly: Point[], b: Box): boolean {
  const corners = [{ x: b.left, y: b.top }, { x: b.right, y: b.top }, { x: b.right, y: b.bottom }, { x: b.left, y: b.bottom }];
  const apart = (ax: number, ay: number) => {
    const p = poly.map((q) => q.x * ax + q.y * ay);
    const c = corners.map((q) => q.x * ax + q.y * ay);
    return Math.max(...p) < Math.min(...c) || Math.max(...c) < Math.min(...p);
  };
  if (apart(1, 0) || apart(0, 1)) return false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const c = poly[(i + 1) % poly.length];
    if (apart(-(c.y - a.y), c.x - a.x)) return false;
  }
  return true;
}

/** Nombre d'images d'une planche d'arme (`weapon-<…>`, animation `angles`) : un angle tous les 45°. */
export const WEAPON_ANGLES = 8;

/** Image de la planche d'une arme pour un angle de gestures.json (degrés, 0 = est, 90 = nord) : l'angle le plus proche des huit. */
export const weaponFrame = (deg: number): number => Math.round((((deg % 360) + 360) % 360) / 45) % WEAPON_ANGLES;
