// Ce que fera chaque clic, sans Phaser (docs/COMMANDES.md, « La souris ») : une seule fonction, lue par le jeu (WorldScene : ce que fait
// le clic) et par l'affichage (HudScene : le mot au-dessus de chaque main), jamais deux logiques. Le clic gauche est la main droite, le
// clic droit la main gauche ; chaque clic est court (il agit au relâchement) ou maintenu (le geste long). Ce que fait le clic dépend de
// ce que tient sa main, de ce que tient l'autre et de ce qui est visé (calculé une fois par image par la scène : `Aimed`). Le
// comportement vient des données (`worksWith`, `weapon`, le piquet d'un plan), jamais du nom d'un objet : un nouvel objet reçoit les
// commandes de sa sorte sans une ligne de code (tools/test-contrats.ts).

import { items, plans } from '../content';
import type { Held } from '../state/GameState';

/** Un bouton de la souris. */
export type Button = 'left' | 'right';
/** Une main : 0 la gauche, 1 la droite. */
export type HandIndex = 0 | 1;

/** La main de chaque bouton : le clic gauche est la main droite, le clic droit la main gauche. */
export const HAND_OF: Record<Button, HandIndex> = { left: 1, right: 0 };

/** Ce qu'une main vide prend de ce qui est visé. */
export type TakeKind = 'take' | 'pile' | 'tie' | 'pickup' | 'unload' | 'stake' | 'harvest';
/** Le geste long d'une main vide sur ce qui est visé. */
export type HoldKind = 'knot' | 'unknot' | 'turn' | 'help';
/** Ce que fait un outil sur ce qui est visé : le genre de travail (`does` d'items.json), ou un coup simple sans matière (`hit`). */
export type WorkKind = 'fell' | 'limbs' | 'whittle' | 'break' | 'cut' | 'hew' | 'plant' | 'maul' | 'hit';

/**
 * Ce qui est visé (sous le curseur s'il est à portée, sinon dans sa direction : src/world/aim.ts), tel que le voit chaque clic. La scène
 * le calcule une fois par image ; le jeu et l'affichage le lisent.
 */
export interface Aimed {
  /** Ce qu'une main vide prend : un objet, la pièce du dessus d'un tas, un lien, un piquet planté, ce que porte le billot, une récolte à la main. */
  take?: TakeKind;
  /** Le geste long d'une main vide : nouer, dénouer, pivoter une bille, appeler la mère. */
  hold?: HoldKind;
  /** Une place de chantier : `place`, la pièce tenue s'y pose ; `help`, trop lourde pour Xéros (le clic court dit ce qui manque). */
  site?: 'place' | 'help';
  /** Les mains dont l'objet se pose sur ce qui est visé (le rouleau sur le billot). */
  rest?: HandIndex[];
  /** Ce qui est visé encaisse un coup (`target` de props.json : le mannequin ; plus tard les créatures). */
  target?: boolean;
  /** Ce que l'outil de chaque main (gauche, droite) ferait sur ce qui est visé ; rien : il n'y a rien à travailler pour lui. */
  work?: [WorkKind | undefined, WorkKind | undefined];
}

/** Ce que fait un clic. */
export type ClickKind =
  | 'take' // prendre ce qui est visé
  | 'punch' // un coup de poing (la main vide, rien à prendre)
  | 'work' // le travail de l'outil sur ce qui est visé
  | 'strike' // frapper avec ce qu'on tient (une arme, un outil sans travail, une ressource contre ce qui encaisse)
  | 'plant' // planter le piquet sur le tracé d'un plan connu
  | 'put' // poser ce qu'on tient, là où le montre le fantôme
  | 'place' // poser la pièce tenue sur une place de chantier
  | 'rest' // poser sur ce qui l'accepte (le rouleau sur le billot)
  | 'help-info' // une place trop lourde : dire ce qui manque, ou comment appeler la mère
  | 'throw' // viser, puis lancer au relâchement
  | 'knot' // nouer un tas en fagot
  | 'unknot' // dénouer un fagot
  | 'turn' // faire pivoter une bille au sol
  | 'help' // appeler la mère pour une pièce trop lourde
  | 'none'; // rien

export interface Click {
  kind: ClickKind;
  /** Le mot montré au-dessus de la case de la main (vide pour `none`). */
  label: string;
  /**
   * Pour `strike` à deux mains : le rang de l'attaque de départ dans l'enchaînement de sa posture (combat.json) : 0 au clic gauche (la
   * taille, le coup horizontal), 1 au clic droit (le coup suivant : d'en haut). Sinon l'enchaînement part du début.
   */
  from?: number;
  /** Pour `work` : le genre de travail. */
  work?: WorkKind;
}

/** Ce que font le clic court et le clic maintenu d'un bouton. */
export interface ClickPlan {
  /** La main du clic. */
  hand: HandIndex;
  short: Click;
  long: Click;
}

/** Les mains de Xéros (GameState : `hands`, `both`). */
export interface Hands {
  hands: readonly [Held | null, Held | null];
  both: Held | null;
}

/** Le mot de chaque travail. */
const WORK_LABEL: Record<WorkKind, string> = {
  fell: 'abattre',
  limbs: 'ébrancher',
  whittle: 'tailler',
  break: 'casser',
  cut: 'couper',
  hew: 'équarrir',
  plant: 'planter',
  maul: 'fendre',
  hit: 'couper',
};

const TAKE_LABEL: Record<TakeKind, string> = { take: 'prendre', pile: 'prendre', tie: 'prendre', pickup: 'prendre', unload: 'prendre', stake: 'arracher', harvest: 'récolter' };
const HOLD_LABEL: Record<HoldKind, string> = { knot: 'nouer', unknot: 'dénouer', turn: 'pivoter', help: 'appeler' };

/**
 * Ce qu'est ce qu'on tient, pour les clics, d'après sa sorte (`kind` d'items.json) : un outil, une arme, ou une ressource (tout objet du
 * monde porté en est une) ; et s'il est le piquet d'un plan. Une ressource qui frappe bien (la branche : `weapon`) reste une ressource :
 * c'est la cible qui décide (décision de Grégoire : on se défend avec une pierre, on se bat avec une épée).
 */
export function kitOf(h: Held): { tool: boolean; weapon: boolean; stake: boolean } {
  const it = 'item' in h ? items[h.item] : undefined;
  const item = 'item' in h ? h.item : undefined;
  const stake = !!item && Object.values(plans).some((p) => p.stake === item);
  return { tool: it?.kind === 'tool', weapon: it?.kind === 'weapon', stake };
}

const click = (kind: ClickKind, label: string, extra: Partial<Click> = {}): Click => ({ kind, label, ...extra });
const NONE: Click = { kind: 'none', label: '' };

/**
 * Ce que feront le clic court et le clic maintenu du bouton `button`, selon ce que tiennent les mains (`hands`), ce qui est visé
 * (`aimed`) et si Xéros connaît un plan (`knowsPlan` : le piquet se plante sur son tracé).
 *
 * Clic court, selon ce que tient la main du clic :
 * - rien : prendre ce qui est visé ; une place trop lourde : dire ce qui manque ; sinon un coup de poing ;
 * - un outil devant ce qu'il sait travailler : le travail ;
 * - le piquet d'un plan connu : le planter ;
 * - une arme (`kind: weapon`), un outil sans rien à travailler : frapper avec ;
 * - une ressource : frapper si ce qui est visé encaisse un coup ; sinon la poser (sur une place de chantier, sur ce qui l'accepte, ou
 *   là où le montre le fantôme).
 * Un objet à deux mains répond aux deux clics ; en frappe, le gauche donne la taille, le droit le coup d'en haut.
 *
 * Clic maintenu : main vide, le geste long de ce qui est visé (nouer, dénouer, pivoter, appeler la mère), sinon rien ; main qui tient
 * un objet, viser puis lancer.
 */
export function clickPlan(button: Button, hands: Hands, aimed: Aimed, knowsPlan: boolean): ClickPlan {
  const hand = HAND_OF[button];
  const held = hands.both ?? hands.hands[hand];
  const two = !!hands.both;
  const from = two ? (button === 'left' ? 0 : 1) : undefined;
  const strike = () => click('strike', 'frapper', from !== undefined ? { from } : {});
  if (!held) {
    const short = aimed.take
      ? click('take', TAKE_LABEL[aimed.take])
      : aimed.site === 'help'
        ? click('help-info', 'dresser')
        : click('punch', 'frapper');
    const long = aimed.hold ? click(aimed.hold, HOLD_LABEL[aimed.hold]) : NONE;
    return { hand, short, long };
  }
  const long = click('throw', 'lancer');
  const kit = kitOf(held);
  const work = aimed.work?.[hand];
  if (kit.tool && work) return { hand, short: click('work', WORK_LABEL[work], { work }), long };
  if (kit.stake && knowsPlan) return { hand, short: click('plant', 'planter'), long };
  if (kit.weapon || kit.tool) return { hand, short: strike(), long };
  // une ressource : on se défend avec une pierre (contre ce qui encaisse), sinon elle se pose
  if (aimed.target) return { hand, short: strike(), long };
  if (aimed.site === 'place') return { hand, short: click('place', 'poser'), long };
  if (aimed.rest?.includes(hand)) return { hand, short: click('rest', 'poser'), long };
  return { hand, short: click('put', 'poser'), long };
}
