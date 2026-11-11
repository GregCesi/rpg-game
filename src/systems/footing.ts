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
      const before = mobility.z;
      mobility.z = this.zAfter(last, now, mob);
      // une marche montée (sur les dessus d'une maison : le relief garde son allure, ses pentes se marchent)
      if (mobility.z > before && this.onDecks(last, now)) this.risen += mobility.z - before;
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

  /** Ce qu'il a monté sur des marches depuis la dernière lecture (cm) : le souffle de qui monte chargé (systems/effort.ts). */
  private risen = 0;
  /** Il vient de monter une marche (à la dernière image) : la marche d'alors × PLAYER.climb. */
  climbing = false;

  /** Ce qu'il a monté depuis la dernière lecture (cm), remis à zéro. */
  takeRisen(): number {
    const r = this.risen;
    this.risen = 0;
    return r;
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

  /** La hauteur du terrain sous un point (px) : les pièces posées ont leur hauteur au-dessus de lui (le mode construction). */
  private terrain(p: { x: number; y: number }): number {
    return heightAt(this.map, p.x, p.y);
  }

  /** Ce qui empêche le pas de `from` à `to` (px), s'il y a quelque chose. */
  private refusal(from: { x: number; y: number }, to: { x: number; y: number }, mob: Mobility): StepRefusal | undefined {
    const f = this.onDecks(from, to);
    if (!f) return stepRefusal(this.map, from, to, mob);
    // les dessus sont posés au-dessus du terrain (une maison se bâtit sur un sol plat) : le pas se juge au-dessus de lui
    const rel = this.player.mobility.z - this.terrain(from);
    return deckStep(f, () => 0, { x: from.x * CM_PER_PX, y: from.y * CM_PER_PX }, { x: to.x * CM_PER_PX, y: to.y * CM_PER_PX }, rel, mob).refused;
  }

  /** Sa hauteur après le pas permis de `from` à `to` (px). */
  private zAfter(from: { x: number; y: number }, to: { x: number; y: number }, mob: Mobility): number {
    const f = this.onDecks(from, to);
    if (!f) return heightAt(this.map, to.x, to.y);
    const rel = this.player.mobility.z - this.terrain(from);
    return this.terrain(to) + deckStep(f, () => 0, { x: from.x * CM_PER_PX, y: from.y * CM_PER_PX }, { x: to.x * CM_PER_PX, y: to.y * CM_PER_PX }, rel, mob).z;
  }

  /** Posé en `at` (px) : le sol le plus proche de `z` (sans `z` : le plus bas). */
  private settle(at: { x: number; y: number }, z: number | undefined): number {
    const ground = this.terrain(at);
    const f = this.onDecks(at, at);
    return f ? ground + settleAt(f, 0, at.x * CM_PER_PX, at.y * CM_PER_PX, z === undefined ? undefined : z - ground) : ground;
  }

  /** À chaque image : un appui relâché (il ne pousse plus) permet de redire le refus. */
  update(): void {
    if (this.player.dir.lengthSq() === 0) this.said = undefined;
    this.climbing = this.risen > 0;
  }
}
