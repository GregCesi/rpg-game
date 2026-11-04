// Ce que fera chaque touche et chaque clic, sans Phaser (docs/COMMANDES.md) : une seule fonction, lue par le jeu (WorldScene : ce que
// fait l'appui) et par l'affichage (systems/keyPrompts.ts : la touche au-dessus de ce qui est devant Xéros), jamais deux logiques.
// E agit sans outil sur ce qui est devant (parler, ouvrir, lire, prendre : la main droite, puis la gauche ; Maj + E, la gauche) ; E
// maintenu fait les gestes longs (nouer, dénouer, pivoter, appeler la mère) ; F travaille avec l'outil en main (abattre, couper,
// équarrir, planter le coin, fendre, tailler, casser, planter le piquet d'un plan connu) ; A (Q en QWERTY) pose ce que tient la main
// droite (sinon la gauche), Maj + A la main gauche ; la souris ne sert qu'au combat : clic gauche, la main droite frappe ; clic droit,
// la gauche ; clic maintenu, lancer. Le comportement vient des données (`does`, `kind`, le piquet d'un plan), jamais du nom d'un
// objet : un nouvel objet reçoit les commandes de sa sorte sans une ligne de code (tools/test-contrats.ts).

import { items, plans } from '../content';
import type { Held } from '../state/GameState';

/** Un bouton de la souris. */
export type Button = 'left' | 'right';
/** Une main : 0 la gauche, 1 la droite. */
export type HandIndex = 0 | 1;

/** La main de chaque bouton : le clic gauche est la main droite, le clic droit la main gauche. */
export const HAND_OF: Record<Button, HandIndex> = { left: 1, right: 0 };

/** Ce que E prend de ce qui est devant Xéros. */
export type TakeKind = 'take' | 'pile' | 'tie' | 'pickup' | 'unload' | 'stake' | 'harvest';
/** Ce que E fait sans les mains : parler (la paillasse aussi), ouvrir ou fermer, lire la planchette. */
export type UseKind = 'talk' | 'swing' | 'learn';
/** Le geste long de E maintenu sur ce qui est devant. */
export type HoldKind = 'knot' | 'unknot' | 'turn' | 'help';
/** Ce que fait un outil sur ce qui est devant : le genre de travail (`does` d'items.json), ou un coup simple sans matière (`hit`). */
export type WorkKind = 'fell' | 'limbs' | 'whittle' | 'break' | 'cut' | 'hew' | 'plant' | 'maul' | 'hit';

/** Ce qui est devant Xéros, tel que le voit chaque touche. La scène le calcule une fois par image ; le jeu et l'affichage le lisent. */
export interface Aimed {
  /** Ce que E prend : un objet, la pièce du dessus d'un tas, un lien, un piquet planté, ce que porte le billot, une récolte à la main. */
  take?: TakeKind;
  /** Ce que E fait sans les mains. */
  use?: UseKind;
  /** Le geste long de E maintenu. */
  hold?: HoldKind;
  /** Une place de chantier : `place`, A y pose la pièce tenue ; `help`, trop lourde pour Xéros (E dit ce qui manque). */
  site?: 'place' | 'help';
  /** Les mains dont l'objet se pose sur ce qui est devant (le rouleau sur le billot). */
  rest?: HandIndex[];
  /** Ce que l'outil de chaque main (gauche, droite) ferait sur ce qui est devant ; rien : il n'y a rien à travailler pour lui. */
  work?: [WorkKind | undefined, WorkKind | undefined];
}

/** Ce que fait l'appui court de E. */
export type EKind = TakeKind | UseKind | 'help-info' | 'full' | 'none';
/** Ce que fait F. */
export type FKind = 'work' | 'plant' | 'none';
/** Ce que fait A (ou Maj + A). */
export type AKind = 'put' | 'place' | 'rest' | 'none';
/** Ce que fait un clic. */
export type ClickKind = 'strike' | 'punch' | 'throw' | 'none';

export interface EPlan {
  /** L'appui court (`full` : il y a quelque chose à prendre, mais les mains sont pleines : la touche ne s'affiche pas). */
  short: EKind;
  /** L'appui maintenu (le seuil de `LONG_PRESS`), ou rien. */
  long: HoldKind | 'none';
}

export interface FPlan {
  kind: FKind;
  /** La main de l'outil (ou du piquet). */
  hand?: HandIndex;
  /** Pour `work` : le genre de travail. */
  work?: WorkKind;
}

export interface APlan {
  kind: AKind;
  /** La main qui pose (les deux mains : celle de droite, l'objet à deux mains). */
  hand?: HandIndex;
}

export interface Click {
  kind: ClickKind;
  /**
   * Pour `strike` à deux mains : le rang de l'attaque de départ dans l'enchaînement de sa posture (combat.json) : 0 au clic gauche (la
   * taille, le coup horizontal), 1 au clic droit (le coup suivant : d'en haut). Sinon l'enchaînement part du début.
   */
  from?: number;
}

/** Ce que font le clic court et le clic maintenu d'un bouton. */
export interface ClickPlan {
  /** La main du clic. */
  hand: HandIndex;
  short: Click;
  long: Click;
}

/** Ce que fera chaque touche et chaque clic à cette image. */
export interface ActionPlan {
  e: EPlan;
  f: FPlan;
  /** A : la main droite, sinon la gauche. */
  a: APlan;
  /** Maj + A : la main gauche, sinon la droite. */
  aLeft: APlan;
  clicks: Record<Button, ClickPlan>;
}

/** Les mains de Xéros (GameState : `hands`, `both`). */
export interface Hands {
  hands: readonly [Held | null, Held | null];
  both: Held | null;
}

/**
 * Ce qu'est ce qu'on tient, d'après sa sorte (`kind` d'items.json) : un outil, une arme, ou une ressource (tout objet du monde porté en
 * est une) ; et s'il est le piquet d'un plan.
 */
export function kitOf(h: Held): { tool: boolean; weapon: boolean; stake: boolean } {
  const it = 'item' in h ? items[h.item] : undefined;
  const item = 'item' in h ? h.item : undefined;
  const stake = !!item && Object.values(plans).some((p) => p.stake === item);
  return { tool: it?.kind === 'tool', weapon: it?.kind === 'weapon', stake };
}

/** Ce que tient la main `hand` (ou les deux mains). */
const heldBy = (hands: Hands, hand: HandIndex): Held | null => hands.both ?? hands.hands[hand];

/** La main `first` si elle tient quelque chose (les deux mains : la droite), sinon l'autre ; rien si les deux sont vides. */
export function putHand(hands: Hands, first: HandIndex): HandIndex | undefined {
  if (hands.both) return 1;
  if (hands.hands[first]) return first;
  const other = (1 - first) as HandIndex;
  return hands.hands[other] ? other : undefined;
}

/** La main où E prend : `first` si elle est libre, sinon l'autre ; rien si les deux sont prises. */
export function takeHand(hands: Hands, first: HandIndex): HandIndex | undefined {
  if (hands.both) return undefined;
  if (!hands.hands[first]) return first;
  const other = (1 - first) as HandIndex;
  return hands.hands[other] ? undefined : other;
}

/**
 * E : prendre ce qui est devant (s'il reste une main libre ; sinon `full`, la touche ne s'affiche pas), ou ce qui se fait sans les
 * mains ; une place trop lourde d'un chantier : dire ce qui manque. E maintenu : le geste long, les mains vides (nouer, dénouer,
 * pivoter ; appeler la mère, une main libre suffit).
 */
function ePlan(hands: Hands, aimed: Aimed): EPlan {
  const free = takeHand(hands, 1) !== undefined;
  const empty = !hands.both && !hands.hands[0] && !hands.hands[1];
  const short: EKind = aimed.use ?? (aimed.site === 'help' ? 'help-info' : aimed.take ? (free ? aimed.take : 'full') : 'none');
  const h = aimed.hold;
  const long = !h ? 'none' : h === 'help' ? (free ? h : 'none') : empty ? h : 'none';
  return { short, long };
}

/**
 * F : le travail de l'outil de la main droite s'il travaille ce qui est devant, sinon celui de la gauche ; le piquet d'un plan connu
 * se plante (F ; A le pose toujours). Un outil sans rien à travailler devant lui : rien.
 */
function fPlan(hands: Hands, aimed: Aimed, knowsPlan: boolean): FPlan {
  for (const hand of [1, 0] as const) {
    const held = heldBy(hands, hand);
    if (!held) continue;
    const kit = kitOf(held);
    const work = aimed.work?.[hand];
    if (kit.tool && work) return { kind: 'work', hand, work };
    if (kit.stake && knowsPlan) return { kind: 'plant', hand };
  }
  return { kind: 'none' };
}

/** A : poser ce que tient la main (`first` d'abord) : sur une place de chantier, sur ce qui l'accepte (le billot), sinon devant. */
function aPlan(hands: Hands, aimed: Aimed, first: HandIndex): APlan {
  const hand = putHand(hands, first);
  if (hand === undefined) return { kind: 'none' };
  if (aimed.site === 'place') return { kind: 'place', hand };
  if (!hands.both && aimed.rest?.includes(hand)) return { kind: 'rest', hand };
  return { kind: 'put', hand };
}

/**
 * Le clic du bouton `button` : la main du clic frappe avec ce qu'elle tient (le poing si elle est vide), toujours, même dans le vide
 * (une ressource aussi, payée comme un coup : décision de Grégoire) ; maintenu, la main pleine vise puis lance. Un objet à deux mains
 * répond aux deux clics ; le gauche donne la taille, le droit le coup d'en haut.
 */
export function clickPlan(button: Button, hands: Hands): ClickPlan {
  const hand = HAND_OF[button];
  const held = heldBy(hands, hand);
  if (!held) return { hand, short: { kind: 'punch' }, long: { kind: 'none' } };
  const from = hands.both ? (button === 'left' ? 0 : 1) : undefined;
  return { hand, short: from !== undefined ? { kind: 'strike', from } : { kind: 'strike' }, long: { kind: 'throw' } };
}

/**
 * Ce que feront E (court et maintenu), F, A, Maj + A et les deux clics, selon ce que tiennent les mains (`hands`), ce qui est devant
 * Xéros (`aimed`) et s'il connaît un plan (`knowsPlan` : le piquet se plante sur son tracé).
 */
export function actionPlan(hands: Hands, aimed: Aimed, knowsPlan: boolean): ActionPlan {
  return {
    e: ePlan(hands, aimed),
    f: fPlan(hands, aimed, knowsPlan),
    a: aPlan(hands, aimed, 1),
    aLeft: aPlan(hands, aimed, 0),
    clicks: { left: clickPlan('left', hands), right: clickPlan('right', hands) },
  };
}
