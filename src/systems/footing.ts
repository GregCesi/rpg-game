import type Phaser from 'phaser';
import { FEET } from '../config';
import { CM_PER_PX } from '../content/gabarit';
import type { MapData, Mobility } from '../content/types';
import type { Player } from '../entities/Player';
import { deckStep, decksNear, settleAt, type DeckField } from '../world/decks';
import { heightAt, refusalText, stepRefusal, type StepRefusal } from '../world/relief';

/**
 * Où Xéros peut poser le pied (chantier « relief ») : à chaque pas de la physique (`worldstep` d'Arcade, plusieurs par image quand le
 * jeu rame), le trajet de ses pieds depuis le pas d'avant passe par world/relief.ts (`stepRefusal` : une marche trop haute, un saut
 * trop grand, l'eau pour qui ne nage pas). Un pas refusé le ramène au dernier point permis, et il glisse le long de l'obstacle (le pas
 * sur un seul axe, s'il passe), comme contre un mur ; le jeu dit pourquoi (« Trop haute pour lui (5 m). », « Il ne sait pas nager. »),
 * une fois par appui. Le principe des franchissements (world/crossing.ts) : on teste le chemin depuis le pas d'avant, jamais la
 * position de l'instant.
 *
 * Dans une maison à étages (chantier « maison du coq », CONCEPTION « L'étage »), deux sols peuvent être au même point : près des
 * dessus qui se marchent (world/decks.ts), le pas part de la hauteur de Xéros (`mobility.z`) et arrive sur le plus haut dessus qu'il
 * atteint d'un pas ; `z` est tenu à chaque pas de la physique, si bien que rien de ce qui dépend de lui (le niveau affiché) ne peut
 * être sauté par une machine lente. Ailleurs, la règle du relief seule, et `z` est la hauteur du terrain.
 */
/**
 * Au-delà de cette distance entre deux pas de la physique (px), Xéros a été posé, il n'a pas marché : 64 px en 1/60 s, c'est 190 m/s,
 * dix fois au-dessus de toute course ; la règle du pas ne s'applique pas à une pose.
 */
const PLACED = 64;

export class Footing {
  private last?: { x: number; y: number };
  /** Le refus déjà dit pendant cet appui (rien de nouveau tant qu'il pousse contre la même chose). */
  private said?: string;
  private readonly onStep = () => this.step();

  constructor(
    scene: Phaser.Scene,
    private readonly map: MapData,
    private readonly player: Player,
    private readonly notice: (text: string) => void,
    /** Les dessus des pièces posées de la carte, tels qu'ils sont en ce moment (GameMap.decks). */
    private readonly decks: () => DeckField = () => ({ decks: [], empty: true, cells: new Map() }),
  ) {
    // le monde de la physique de cette scène (au redémarrage de la scène, il est refait : on se détache de celui-ci)
    const world = scene.physics.world;
    world.on('worldstep', this.onStep);
    scene.events.once('shutdown', () => world?.off('worldstep', this.onStep));
  }

  /** Un pas de la physique vient de se faire. */
  private step(): void {
    const a = this.player.actor;
    const mobility = this.player.mobility;
    const now = { x: a.x, y: a.y - FEET.point };
    const last = this.last;
    this.last = now;
    // une pose (l'arrivée sur la carte, un rechargement, ?dieu, un test : un saut qu'aucun pas de la physique ne fait) : il se pose sur
    // le sol le plus proche de sa hauteur
    if (!last || Math.hypot(now.x - last.x, now.y - last.y) > PLACED) {
      mobility.z = this.settle(now, last ? mobility.z : this.pending);
      this.pending = undefined;
      return;
    }
    if (last.x === now.x && last.y === now.y) return;
    const mob = mobility.def;
    const refused = this.refusal(last, now, mob);
    if (!refused) {
      mobility.z = this.zAfter(last, now, mob);
      return;
    }
    // glisser : le pas sur un seul axe, s'il passe
    const slides = [
      { x: now.x, y: last.y },
      { x: last.x, y: now.y },
    ].filter((p) => (p.x !== last.x || p.y !== last.y) && !this.refusal(last, p, mob));
    const to = slides[0] ?? last;
    const vx = a.body.velocity.x;
    const vy = a.body.velocity.y;
    a.body.reset(to.x, to.y + FEET.point);
    a.body.setVelocity(vx, vy);
    this.last = to;
    if (to !== last) mobility.z = this.zAfter(last, to, mob);
    const text = refusalText(refused);
    if (this.said !== text) {
      this.said = text;
      this.notice(text);
    }
  }

  /** La hauteur à donner à Xéros à sa prochaine pose (la sauvegarde la garde : la page rechargée en haut le retrouve en haut). */
  private pending?: number;

  /** À l'arrivée : la hauteur gardée (cm), sur laquelle il se posera au premier pas de la physique. */
  placeAt(z: number | undefined): void {
    this.pending = z;
    this.player.mobility.z = z ?? 0;
  }

  /** Les dessus comptent-ils pour un pas entre ces deux points (px) ? */
  private onDecks(a: { x: number; y: number }, b: { x: number; y: number }): DeckField | undefined {
    const f = this.decks();
    if (f.empty) return undefined;
    return decksNear(f, a.x * CM_PER_PX, a.y * CM_PER_PX) || decksNear(f, b.x * CM_PER_PX, b.y * CM_PER_PX) ? f : undefined;
  }

  private readonly ground = (x: number, y: number) => heightAt(this.map, x / CM_PER_PX, y / CM_PER_PX);

  /** Ce qui empêche le pas de `from` à `to` (px), s'il y a quelque chose. */
  private refusal(from: { x: number; y: number }, to: { x: number; y: number }, mob: Mobility): StepRefusal | undefined {
    const f = this.onDecks(from, to);
    if (!f) return stepRefusal(this.map, from, to, mob);
    return deckStep(f, this.ground, { x: from.x * CM_PER_PX, y: from.y * CM_PER_PX }, { x: to.x * CM_PER_PX, y: to.y * CM_PER_PX }, this.player.mobility.z, mob).refused;
  }

  /** Sa hauteur après le pas permis de `from` à `to` (px). */
  private zAfter(from: { x: number; y: number }, to: { x: number; y: number }, mob: Mobility): number {
    const f = this.onDecks(from, to);
    if (!f) return heightAt(this.map, to.x, to.y);
    return deckStep(f, this.ground, { x: from.x * CM_PER_PX, y: from.y * CM_PER_PX }, { x: to.x * CM_PER_PX, y: to.y * CM_PER_PX }, this.player.mobility.z, mob).z;
  }

  /** Posé en `at` (px) : le sol le plus proche de `z` (sans `z` : le plus bas). */
  private settle(at: { x: number; y: number }, z: number | undefined): number {
    const ground = heightAt(this.map, at.x, at.y);
    const f = this.onDecks(at, at);
    return f ? settleAt(f, ground, at.x * CM_PER_PX, at.y * CM_PER_PX, z) : ground;
  }

  /** À chaque image : un appui relâché (il ne pousse plus) permet de redire le refus. */
  update(): void {
    if (this.player.dir.lengthSq() === 0) this.said = undefined;
  }
}
