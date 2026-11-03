// Une garenne, sans Phaser (docs/CONCEPTION.md, « Les créatures ») : une colonie de bêtes d'une espèce (creatures.json) et ses entrées
// de terrier, posées dans une carte Tiled (un rectangle `Warren` : l'espèce et la population ; les objets à `burrow` dedans). Deux
// moitiés :
// - ce que garde la partie (`WarrenState`, dans GameState) : qui vit (chaque membre, ses points de vie, le jour où il guérit s'il est
//   blessé), les naissances qui remettent la population à niveau (`births`), la guérison au jour `heal.days` après la blessure ;
// - la vie du moment (`WarrenLife`, jamais sauvegardée) : qui est dehors, qui rentre, qui sort du terrier, selon la part de la
//   population dehors à chaque heure (`schedule`) ; au retour sur la carte, les bêtes qui doivent être dehors y sont déjà.
// Le jeu (systems/creatures.ts) avance la vie par pas de jeu de taille normale, et écrit dans GameState ce que la partie garde.

import type { CreatureDef } from '../content/types';
import { MINUTES_PER_DAY, type Clock } from './clock';
import { between, emerge, grazeSpot, sendHome, step, type Creature, type CreatureEvent, type Point, type Surroundings } from './creature';

/** Une garenne posée dans une carte : son identifiant (l'objet Tiled), l'espèce, la population voulue, ses entrées (px). */
export interface WarrenSite {
  id: number;
  kind: string;
  population: number;
  holes: Point[];
}

/** Un membre de la garenne : son numéro (unique dans la garenne), ses points de vie, le jour où il guérit (blessé, il reste au terrier). */
export interface Member {
  n: number;
  hp: number;
  heal?: number;
}

/** Ce que la partie garde d'une garenne : ses membres vivants, le prochain numéro, la minute de la dernière naissance (minute absolue). */
export interface WarrenState {
  members: Member[];
  next: number;
  birthAt: number;
}

/** La minute absolue d'un moment de la partie (le jour 1 commence à 0). */
export const absMinute = (c: Clock): number => (c.day - 1) * MINUTES_PER_DAY + c.minute;

/** Une garenne à sa première visite : toute sa population, en bonne santé. */
export function seedWarren(site: WarrenSite, def: CreatureDef, clock: Clock): WarrenState {
  return { members: Array.from({ length: site.population }, (_, n) => ({ n, hp: def.target.hp })), next: site.population, birthAt: absMinute(clock) };
}

/** La part de la population dehors à la minute `minute` du jour : celle du dernier repère passé de `schedule` (la journée boucle). */
export function outShare(def: CreatureDef, minute: number): number {
  const h = (((minute / 60) % 24) + 24) % 24;
  const s = def.schedule;
  return ([...s].reverse().find((x) => x.hour <= h) ?? s[s.length - 1]).out;
}

/** Les membres qui peuvent sortir : tous sauf les blessés qui n'ont pas encore guéri. */
export const able = (w: WarrenState, clock: Clock): Member[] => w.members.filter((m) => m.heal === undefined || clock.day >= m.heal);

/** Combien de bêtes devraient être dehors en ce moment : la part de l'heure × celles qui peuvent sortir, arrondie. */
export const wantedOut = (w: WarrenState, def: CreatureDef, clock: Clock): number => Math.round(outShare(def, clock.minute) * able(w, clock).length);

/**
 * La garenne au moment `clock` : les blessés dont le jour est venu guérissent ; tant qu'il manque des bêtes, une naît toutes les
 * `births.hours` heures de jeu depuis la dernière naissance (ou depuis la mort qui a fait le premier manque : `killed`). Rend le même
 * objet si rien n'a changé (le jeu n'écrit GameState que pour un vrai changement).
 */
export function settle(w: WarrenState, site: WarrenSite, def: CreatureDef, clock: Clock): WarrenState {
  const now = absMinute(clock);
  let out = w;
  if (w.members.some((m) => m.heal !== undefined && clock.day >= m.heal))
    out = { ...out, members: out.members.map((m) => (m.heal !== undefined && clock.day >= m.heal ? { n: m.n, hp: def.target.hp } : m)) };
  const every = def.births.hours * 60;
  let { members, next, birthAt } = out;
  while (members.length < site.population && now - birthAt >= every) {
    members = [...members, { n: next, hp: def.target.hp }];
    next++;
    birthAt += every;
  }
  return members === out.members ? out : { members, next, birthAt };
}

/**
 * Un membre tué : il quitte la garenne (il devient un objet, ailleurs : la matière se conserve). Si la garenne était pleine, le compte
 * des naissances part de cette mort.
 */
export function killed(w: WarrenState, n: number, site: WarrenSite, clock: Clock): WarrenState {
  const full = w.members.length >= site.population;
  return { ...w, members: w.members.filter((m) => m.n !== n), birthAt: full ? absMinute(clock) : w.birthAt };
}

/** Un membre blessé : ses points de vie, et le jour où il guérit (`heal.days` après aujourd'hui) ; il reste au terrier jusque-là. */
export const wounded = (w: WarrenState, n: number, hp: number, def: CreatureDef, clock: Clock): WarrenState => ({
  ...w,
  members: w.members.map((m) => (m.n === n ? { n, hp, heal: clock.day + def.heal.days } : m)),
});

/** Le numéro d'un membre dans l'identifiant d'une bête (`<garenne>:<n>`). */
export const memberOf = (c: Creature): number => Number(c.id.slice(c.id.lastIndexOf(':') + 1));

/** Ce qu'a fait un pas de la garenne : les événements de chaque bête (le tambour : les voisines fuient, l'entrée au terrier). */
export type LifeEvent = CreatureEvent & { creature: Creature };

/**
 * La vie du moment d'une garenne : les bêtes dehors (`out`), le temps avant que chaque membre puisse ressortir du terrier (`den`, s :
 * après une fuite, `burrow.stay` minutes), le temps avant la prochaine sortie (`emergeIn`, s : elles sortent une à une).
 */
export class WarrenLife {
  readonly out: Creature[] = [];
  readonly den = new Map<number, number>();
  emergeIn = 0;

  constructor(
    readonly site: WarrenSite,
    readonly def: CreatureDef,
  ) {}

  private idOf(n: number): string {
    return `${this.site.id}:${n}`;
  }

  /** L'arrivée sur la carte : les bêtes qui doivent être dehors à cette heure y sont déjà, dispersées autour de la garenne. */
  populate(w: WarrenState, clock: Clock, s: Surroundings): void {
    const want = wantedOut(w, this.def, clock);
    for (const m of able(w, clock).slice(0, want)) {
      const at = grazeSpot(this.def, this.site.holes[0] ?? { x: 0, y: 0 }, s) ?? this.site.holes[Math.floor(s.rand() * this.site.holes.length)];
      if (!at) continue;
      const c = emerge(this.idOf(m.n), this.site.kind, this.def, at, m.hp);
      c.facing = (['down', 'up', 'left', 'right'] as const)[Math.floor(s.rand() * 4)];
      this.out.push(c);
    }
  }

  /** La bête du membre `n`, si elle est dehors. */
  find(n: number): Creature | undefined {
    return this.out.find((c) => memberOf(c) === n);
  }

  /** Une bête quitte la carte (tuée) : elle n'est plus dehors. */
  remove(c: Creature): void {
    const i = this.out.indexOf(c);
    if (i >= 0) this.out.splice(i, 1);
  }

  /**
   * Un pas de jeu de `dt` s : les membres tués disparaissent, une bête sort si la garenne en veut plus dehors (une à la fois, à une
   * entrée au hasard), une bête tranquille rentre si elle en veut moins, chaque bête dehors fait son pas ; une bête qui entre au
   * terrier y reste `burrow.stay` minutes de jeu après une fuite (blessée : jusqu'à sa guérison, `heal` de son membre).
   */
  step(w: WarrenState, clock: Clock, dt: number, around: (c: Creature) => Surroundings, rand: () => number): LifeEvent[] {
    const alive = new Set(w.members.map((m) => m.n));
    for (const c of [...this.out]) if (!alive.has(memberOf(c))) this.remove(c);
    for (const [n, t] of this.den) this.den.set(n, t - dt);
    this.emergeIn -= dt;
    const want = wantedOut(w, this.def, clock);
    const outside = this.out.filter((c) => c.mode !== 'home');
    if (outside.length < want && this.emergeIn <= 0 && this.site.holes.length) {
      const m = able(w, clock).find((x) => !this.find(x.n) && (this.den.get(x.n) ?? 0) <= 0);
      if (m) {
        const hole = this.site.holes[Math.floor(rand() * this.site.holes.length)];
        const c = emerge(this.idOf(m.n), this.site.kind, this.def, hole, m.hp);
        this.out.push(c);
        this.emergeIn = this.def.burrow.emerge;
      }
    } else if (outside.length > want) {
      const calm = outside.filter((c) => c.mode === 'calm');
      for (const c of calm.slice(0, outside.length - want)) sendHome(c, around(c));
    }
    const events: LifeEvent[] = [];
    for (const c of [...this.out]) {
      const fled = c.mode === 'flee' || c.mode === 'thump';
      for (const e of step(c, this.def, around(c), dt)) {
        events.push({ ...e, creature: c });
        if (e.kind === 'enter') {
          this.remove(c);
          if (fled) this.den.set(memberOf(c), between(rand, this.def.burrow.stay) * 60);
        }
      }
    }
    return events;
  }
}

/** Ce que laisse une bête tuée : un seul objet, l'objet qu'elle devient (`becomes`, de sa masse), là où elle meurt. */
export interface Remains {
  item: string;
  x: number;
  y: number;
}

/**
 * Une bête tuée : elle quitte sa garenne et devient un objet (`becomes`) à sa place ; un seul, de sa masse (validate.ts vérifie que
 * l'objet pèse ce que pesait la bête) : la matière se conserve.
 */
export function death(w: WarrenState, c: Creature, site: WarrenSite, def: CreatureDef, clock: Clock): { state: WarrenState; remains: Remains } {
  return { state: killed(w, memberOf(c), site, clock), remains: { item: def.becomes, x: c.x, y: c.y } };
}
