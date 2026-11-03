import Phaser from 'phaser';
import { MINUTES_PER_DAY, clockLabel, nextSpeed } from '../world/clock';
import { nightMinutes } from '../world/sleep';
import { stateImage } from '../world/pileShape';
import { CONSTRUIRE, DEPTH, FEET, FELL, HELP, INTERACT, LOCKS, HUD, START, VIEW, ZONES } from '../config';
import { gestures, items, maps, props, stamina, time, time as timeDef, transforms, work, worksWith } from '../content';
import { heldMass, itemMass, pieceMass, propMass } from '../content/mass';
import type { DialogueAction, Exit, Facing, Stance } from '../content/types';
import type { Look } from '../entities/Hold';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { forgetHeldKeys } from '../input/PlayerInput';
import { GameEvent, type BuildCommand, type BuildStatus, type DieuCommand } from '../events';
import { BuildSystem } from '../systems/build';
import { ClockSystem } from '../systems/clock';
import { CombatSystem, type AttackPlan } from '../systems/combat';
import { AutoSave } from '../systems/autosave';
import { EffortSystem } from '../systems/effort';
import { findExit } from '../systems/exits';
import { ZoneCrossing } from '../systems/zones';
import { Parcels } from '../systems/parcels';
import { Interiors, resolveInterior } from '../systems/interiors';
import { HarvestSystem, effortOf, wields, type HitResult } from '../systems/harvest';
import { HandsSystem } from '../systems/hands';
import { InteractionSystem } from '../systems/InteractionSystem';
import { KnotSystem } from '../systems/knot';
import { LongPress, subject } from '../systems/longPress';
import { clickPlan, HAND_OF, type Aimed, type Button, type Click, type ClickPlan, type TakeKind, type WorkKind } from '../world/clickAction';
import { harvestKind } from '../world/tools';
import { PileCount } from '../systems/pileCount';
import { Roofs } from '../systems/roofs';
import { RollSystem } from '../systems/roll';
import { Rail } from '../systems/rail';
import { SiteSystem } from '../systems/site';
import { WoodSystem, type WoodAim } from '../systems/wood';
import { WorkSystem, type WorkJob } from '../systems/work';
import { harvestJob, jobStroke, perStroke, planOf, strokeCost, woodJob } from '../world/workPlan';
import { frameMs, type Phase } from '../world/swing';
import { kinetic, throwPlan } from '../world/throw';
import { FACING_VECTOR } from '../world/aim';
import { crossed } from '../world/crossing';
import { attackCost } from '../world/strike';
import { pxPerSec, setSpeeds, SPEEDS } from '../systems/speeds';
import { setSimSpeed, simSpeed } from '../systems/simSpeed';
import { Daylight } from '../systems/daylight';
import { WorkBar } from '../entities/WorkBar';
import { splitHits } from '../world/woodShape';
import { wood as W } from '../content';
import { TransformSystem } from '../systems/transform';
import { ZoomControl } from '../systems/zoom';
import { TurnSystem } from '../systems/turnLog';
import { carriedMass, heavyNotice } from '../systems/weight';
import {
  addBuildPieces,
  canTake,
  clearHeld,
  clearSave,
  emptyHands,
  game,
  mapState,
  newGame,
  release,
  removeGroundItem,
  revisionOf,
  replaceState,
  resetMap,
  setClock,
  resetStamina,
  setWork,
  workKey,
  sleep,
  take,
  type Hand,
  type Held,
} from '../state';
import { blocks, boxOf, overlaps, swung } from '../world/build';
import { CM_PER_PX } from '../content/gabarit';
import { GameMap } from '../world/GameMap';
import { buildingsOf, interiorId, parseInteriorId } from '../world/interior';
import type { InteriorMap } from '../world/interiorMap';
import { InteriorView } from '../world/interiorView';
import { ZoneBand } from '../world/zoneBand';
import { drawGloom } from '../world/gloom';
import { seedMap } from '../world/mapPlans';
import { defOf, WOOD_PIECE } from '../world/woodPiece';
import { heldWoodTexture } from '../world/woodTexture';
import { pileWoodOf } from '../world/woodPile';
import { naturalFor } from '../world/natural';
import type { Interactable, PlacedGround, PlacedProp, Talker } from '../world/GameMap';

/**
 * Ce que fait le monde en ce moment. Une seule valeur à la fois : le joueur ne peut pas
 * marcher pendant un dialogue, ni ouvrir un dialogue pendant qu'il change de carte.
 * `use` : Xéros fait un geste (outil ou mains), il ne marche pas et ne prend pas de sortie.
 * `build` : le mode construction (?construire, systems/build.ts) : Xéros attend, la caméra est libre, la souris pose et retire.
 * `rail` : une passe sur un rail (systems/rail.ts, la doloire le long d'une pièce) : Xéros avance tout seul en frappant ; seule
 * Échap compte, elle l'arrête là où il est.
 * `aim` : un clic maintenu vise un lancer (world/throw.ts) : Xéros se tourne vers le curseur, le repère montre où l'objet tombera ;
 * relâché, il lance ; Échap annule.
 */
type Mode = 'play' | 'use' | 'dialogue' | 'transition' | 'build' | 'rail' | 'work' | 'aim';

/** Un objet lancé en vol (world/throw.ts) : déjà posé au sol dans GameState (la matière se conserve), son image cachée jusqu'à la fin. */
interface Flight {
  /** Ce qui vole, à l'écran. */
  sprite: Phaser.GameObjects.Image;
  /** Les points du vol : au sol (px), la hauteur (px), le temps (s). */
  points: { x: number; y: number; z: number; t: number }[];
  /** Le temps écoulé depuis le lâcher (s). */
  t: number;
  /** La cible touchée en chemin, à quel moment, avec quelle énergie (J). */
  hit?: { key: string; t: number; joules: number };
  item: string;
  facing: Facing;
  /** L'objet posé là où il est retombé : son image, montrée à la fin du vol. */
  landed?: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
}

/** Ce que reçoit la scène à son lancement : la carte, et le point d'apparition ou la position exacte (`at`, sauvegarde). */
export type WorldStart = {
  mapId: string;
  spawn?: string;
  at?: { x: number; y: number; facing: Facing };
  wake?: boolean;
  /**
   * On arrive en passant le bord d'une zone (systems/zones.ts) : pas de fondu (la voisine était déjà à l'écran, world/zoneBand.ts), et
   * la caméra reprend où elle était par rapport à Xéros (`view` : le milieu de la vue moins ses pieds).
   */
  edge?: { view: { dx: number; dy: number } };
};

/**
 * Comment un objet tenu se voit sur Xéros : son `hold` (items.json, ou `take` de props.json ; la pièce de bois, sa vue portée
 * assemblée à sa longueur), sinon son icône à la main.
 */
function holdOf(scene: Phaser.Scene, h: Held): { stance: Stance; look: Look } {
  if ('prop' in h) {
    const t = defOf(h.prop, h.wood).take!;
    const texture = h.wood ? heldWoodTexture(scene, h.wood) : undefined;
    // un objet à plusieurs états (le fagot et son nombre de branches) : ses vues portées et son icône suivent l'état
    const image = t.hold.image && stateImage(t.hold.image, h.prop, h.bundle);
    return { stance: t.hold.stance, look: { image, icon: stateImage(t.icon, h.prop, h.bundle), ...(texture ? { texture } : {}) } };
  }
  const it = items[h.item];
  const stance = it.hold?.stance ?? (it.hands === 2 ? 'carry' : 'hand');
  return { stance, look: { image: it.hold?.image, icon: it.icon } };
}

/** Pixels par mètre, au sol (5 cm par pixel, content/gabarit.ts). */
const PX_PER_M = 100 / CM_PER_PX;

/** Une longueur en centimètres, dite en mètres : « 8 m », « 1,5 m ». */
function metres(cm: number): string {
  return `${String(Math.round(cm) / 100).replace('.', ',')} m`;
}

/**
 * Une carte avec le joueur dedans. La scène assemble et arbitre : chaque système fait une chose
 * (repérer un objet, trouver une sortie...) et c'est ici qu'on décide quoi en faire selon le mode.
 */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private map!: GameMap;
  private interaction!: InteractionSystem;
  private harvest!: HarvestSystem;
  private combat!: CombatSystem;
  /** L'horloge (docs/CONCEPTION.md, « Le temps ») : une pour toutes les cartes, le palier est partagé (ClockSystem.speed). */
  private readonly clock = new ClockSystem();
  private handsSystem!: HandsSystem;
  private knots!: KnotSystem;
  /** Chaque bouton de la souris : son clic qui attend sa fin (court au relâchement, ou maintenu). */
  private presses!: Record<Button, LongPress>;
  /** La main du dernier clic : A lâche ce qu'elle tient (l'autre si elle est vide), R tourne ce qu'elle tient, le fantôme la suit. */
  private lastHand: Hand = 1;
  /** Ce que feraient les deux clics sur ce qui est visé à cette image (world/clickAction.ts) : le jeu et l'affichage le lisent. */
  private plans: Record<Button, ClickPlan> | undefined;
  /** Ce que vise un clic à cette image (prendre, poser sur, une place de chantier) ; la bille qu'un clic maintenu ferait pivoter. */
  private handTarget?: Interactable;
  private turnTarget?: Interactable;
  /** Le lancer qu'on vise (mode `aim`) : la main, le bouton tenu ; le repère au sol où l'objet tombera ; les objets en vol. */
  private aiming?: { hand: Hand; button: Button };
  private clickButton: Button = 'left';
  private mark?: Phaser.GameObjects.Image;
  private flights: Flight[] = [];
  private pileCount!: PileCount;
  private roofs!: Roofs;
  private roll!: RollSystem;
  private effort!: EffortSystem;
  /** Le travail en cours (abattre, couper, fendre, tailler) : il dure son temps réel (systems/work.ts). */
  private works!: WorkSystem;
  /** La lumière qui suit l'heure (systems/daylight.ts). */
  private daylight!: Daylight;
  private turns!: TurnSystem;
  private site!: SiteSystem;
  private wood!: WoodSystem;
  /** Les passes de Xéros le long d'une pièce (la doloire). */
  private rail!: Rail;
  /** La transformation « magique » des outils de test (?dieu). */
  private transformer!: TransformSystem;
  /** Le mode construction (?construire). */
  private builder!: BuildSystem;
  /** Le mode construction était ouvert : il le reste d'une carte à l'autre (et ?construire l'ouvre au lancement). */
  private building = CONSTRUIRE;
  /** Champ « force » des outils de test (?dieu) : garde sa valeur d'une carte à l'autre. */
  private force = 1;
  /** Case « endurance infinie » des outils de test (?dieu) : garde sa valeur d'une carte à l'autre. */
  private infinite = false;
  private autosave!: AutoSave;
  /** Le zoom de la caméra du monde, par paliers entiers. */
  private zoom!: ZoomControl;
  /** Le personnage à qui Xéros parle en ce moment (mode dialogue). */
  private talking?: Talker;
  private mode: Mode = 'play';
  /** Les clics ignorés jusque-là : le clic qui ferme un dialogue ne doit pas lancer un geste. */
  private useLockedUntil = 0;
  private mapId = START.map;
  private spawn = START.spawn;
  /** Position exacte où reprendre (sauvegarde) ; sinon le point d'apparition. */
  private at?: WorldStart['at'];
  /** On arrive d'une nuit de sommeil : le jour est dit à l'écran. */
  private wake = false;
  /** Entrer dans les bâtiments posés, en sortir (systems/interiors.ts). */
  private interiors!: Interiors;
  /** L'intérieur où l'on est (sa carte calculée, ce que la vue y ajoute), ou rien dehors. */
  private interior?: InteriorMap;
  private inside?: InteriorView;
  /** Le passage d'une zone du monde à sa voisine (systems/zones.ts). */
  private zones!: ZoneCrossing;
  /** Arrivée par le bord d'une zone : pas de fondu, la caméra reprend sa place. */
  private edge?: WorldStart['edge'];
  /** Les parcelles réservées, montrées en mode construction et avec ?debug. */
  private parcels!: Parcels;

  constructor() {
    super('world');
  }

  init(data: Partial<WorldStart>): void {
    if (data.mapId) this.mapId = data.mapId;
    if (data.spawn) this.spawn = data.spawn;
    this.at = data.at;
    this.wake = !!data.wake;
    this.edge = data.edge;
    this.mode = 'play';
    this.talking = undefined;
  }

  create(): void {
    // un point d'apparition « dedans » (le réveil de Xéros chez lui) : dans l'intérieur du bâtiment posé où il est
    const hostSpawn = !this.at && maps[this.mapId]?.spawns[this.spawn];
    if (hostSpawn && hostSpawn.inside) {
      seedMap(maps[this.mapId]);
      const b = buildingsOf(mapState(game, this.mapId).builds).find((q) => {
        const x = hostSpawn.x * CM_PER_PX;
        const y = hostSpawn.y * CM_PER_PX;
        return x >= q.room.x && x < q.room.x + q.room.w && y >= q.room.y && y < q.room.y + q.room.d;
      });
      if (b) this.mapId = interiorId(this.mapId, b.key);
    }
    // une carte de Tiled, ou l'intérieur d'un bâtiment posé, calculé de ses pièces ; un bâtiment qui n'est plus là ramène dehors
    this.interior = maps[this.mapId] ? undefined : resolveInterior(this.mapId);
    let lost = false;
    if (!maps[this.mapId] && !this.interior) {
      const host = parseInteriorId(this.mapId)?.host;
      if (!host || !maps[host]) throw new Error(`Carte inconnue : ${this.mapId}`);
      this.mapId = host;
      this.spawn = Object.keys(maps[host].spawns)[0];
      this.at = undefined;
      lost = true;
    }
    const def = this.interior?.def ?? maps[this.mapId];
    const sp = this.at ?? def.spawns[this.spawn];
    if (!sp) throw new Error(`Carte ${def.id} : point d'apparition '${this.spawn}' inconnu`);

    // les plans posés depuis Tiled (la cabane, les étals, les granges) entrent dans la partie à la première visite
    if (!this.interior) seedMap(def);
    // la carte telle que la partie l'a laissée : objets récoltés, objets au sol
    this.map = new GameMap(this, def, mapState(game, def.id), this.interior && { pieces: this.interior.shell, joints: this.interior.joints });
    this.inside = this.interior && new InteriorView(this, this.map, this.interior);
    this.interiors = new Interiors(this.map, this.interior);
    // une zone du monde : ses voisines se voient par-delà le bord, et les pieds de Xéros passent un bord ouvert
    this.zones = new ZoneCrossing(def);
    if (this.zones.isZone) new ZoneBand(this, def);
    const walk = this.zones.walkBounds;
    this.physics.world.setBounds(walk.x, walk.y, walk.w, walk.h);
    const view = this.zones.cameraBounds;
    if (def.world) drawGloom(this, def.world.x, { x0: view.x, y0: view.y, x1: view.x + view.w, y1: view.y + view.h });
    // la lumière qui suit l'heure : un voile sur tout ce qu'on voit (dedans comme dehors), les rais de soleil selon le soleil
    this.daylight = new Daylight(this, { x: view.x - VIEW.width, y: view.y - VIEW.height, w: view.w + 2 * VIEW.width, h: view.h + 2 * VIEW.height });
    this.parcels = new Parcels(this, def);

    const arrival = this.edge ? this.freeArrival(sp.x, sp.y) : sp;
    this.player = new Player(this, arrival.x, arrival.y);
    if (sp.facing) this.player.actor.face(sp.facing);
    this.physics.add.collider(this.player.actor, this.map.floor);
    this.physics.add.collider(this.player.actor, this.map.obstacles);

    // dehors, ceux qui sont dans un bâtiment (`inside`) n'y sont pas : ils sont dans son intérieur calculé
    const npcs = def.npcs.filter((n) => !n.inside).map((n) => new Npc(this, n));
    for (const n of npcs) this.physics.add.collider(this.player.actor, n.actor);
    const talkable: Interactable[] = npcs.map((n) => ({
      x: n.actor.x,
      y: n.actor.y - 4, // au centre de la collision des pieds
      top: n.actor.y - n.actor.height,
      action: { kind: 'talk', dialogue: n.dialogue, npc: n },
    }));
    // les deux mains prises par un seul objet : rien à prendre, seulement parler, ouvrir ou poser sur une place ; un objet du monde
    // dans une main (le rouleau) peut se poser sur ce qui l'accepte (le billot)
    this.interaction = new InteractionSystem(this, this.player, () => {
      // un chantier offre ses piquets à reprendre et, avec une pièce en main (même à deux mains : la pierre), ses places à remplir
      if (game.both) return [...talkable, ...this.site.interactables(), ...this.map.interactables().filter((i) => i.action.kind === 'swing' || i.action.kind === 'talk' || i.action.kind === 'learn')];
      const held = game.hands.flatMap((h) => (h && 'prop' in h ? [h.prop] : []));
      return [...this.map.interactables(held), ...this.site.interactables(), ...talkable];
    });
    this.harvest = new HarvestSystem(this, this.map);
    this.combat = new CombatSystem(this, this.map, this.harvest);
    this.wood = new WoodSystem(this, this.map, this.harvest);
    const bar = new WorkBar(this);
    this.rail = new Rail(this.player, bar);
    this.handsSystem = new HandsSystem(this, this.map, npcs.map((n) => n.actor.body));
    this.transformer = new TransformSystem(this.map, this.handsSystem);
    this.site = new SiteSystem(this, this.map, npcs.map((n) => n.actor.body), this.player.strength);
    this.knots = new KnotSystem(this.map, this.handsSystem);
    this.presses = { left: new LongPress(this), right: new LongPress(this) };
    this.pileCount = new PileCount(this, this.map);
    this.roofs = new Roofs(this.map);
    this.effort = new EffortSystem((t) => this.notice(t), () => this.game.events.emit(GameEvent.StaminaDenied));
    this.works = new WorkSystem(this.player, this.effort, bar, (m) => this.clock.work(m));
    this.roll = new RollSystem(this.map, npcs.map((n) => n.actor.body), (t) => this.notice(t), () => this.effort.exhausted());
    this.turns = new TurnSystem(this.map, this.roll, npcs.map((n) => n.actor.body), this);
    this.builder = new BuildSystem(this, this.map, this.player, (t) => this.notice(t), (st: BuildStatus) => this.game.events.emit(GameEvent.BuildStatus, st));
    this.player.strength.multiplier = this.force;
    this.player.stamina.infinite = this.infinite;
    // éveillé la nuit, Xéros s'use : la veille se paie (stamina.json, `sleep`)
    const night = stamina.sleep;
    this.clock.onAdvance = (from, minutes) =>
      this.player.stamina.wear((nightMinutes(from, minutes, night.nightFrom, time.wakeHour) / 60) * night.nightAwakePerHour);
    this.player.stamina.onChange = () => this.game.events.emit(GameEvent.Stamina, this.player.stamina.levels());
    // les travaux commencés : l'étape visible de ce qui est entamé (l'arbre à moitié entaillé, retrouvé tel quel)
    for (const [key, w] of Object.entries(mapState(game, this.map.def.id).work)) {
      const p = w.work === 'harvest' ? this.map.props.find((q) => workKey(q.id, q.spawned) === key) : undefined;
      if (p) this.harvest.showStage(p, w.done, w.side);
    }
    this.dropHeavy();
    // ce qu'il portait sur la carte d'avant
    this.handsChanged();
    this.game.events.emit(GameEvent.Stamina, this.player.stamina.levels());
    if (this.wake) this.game.events.emit(GameEvent.Notice, clockLabel(game.clock), HUD.longNoticeMs / 2);
    if (lost) this.notice("Le bâtiment n'est plus là.");

    const cam = this.cameras.main;
    // un intérieur plus petit que la vue : la caméra le montre au milieu du vide, au même zoom que dehors ; une zone du monde : la carte
    // et la bande de ses voisines
    if (this.interior) {
      const bw = Math.max(this.map.width, VIEW.width);
      const bh = Math.max(this.map.height, VIEW.height);
      cam.setBounds((this.map.width - bw) / 2, (this.map.height - bh) / 2, bw, bh);
      this.zoom = new ZoomControl(cam, bw, bh);
    } else {
      cam.setBounds(view.x, view.y, view.w, view.h);
      this.zoom = new ZoomControl(cam, view.w, view.h);
    }
    cam.startFollow(this.player.actor, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    // passé le bord d'une zone : la vue reprend où elle était, sans fondu (la voisine était déjà là)
    if (this.edge) cam.centerOn(this.player.actor.x + this.edge.view.dx, this.player.actor.y + this.edge.view.dy);
    else cam.fadeIn(LOCKS.fadeIn, 20, 14, 8);
    if (CONSTRUIRE && this.building) this.enterBuild();

    // la partie est écrite à l'arrivée sur la carte, puis à chaque changement, et quand la page se cache ou se ferme
    this.autosave = new AutoSave(def, this.player);
    this.autosave.update(true);
    const saveNow = () => {
      this.roll.flush();
      this.player.stamina.flush();
      this.autosave.update(true);
    };
    const saveIfHidden = () => document.visibilityState === 'hidden' && saveNow();
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', saveIfHidden);

    this.game.events.on(GameEvent.DialogueEnd, this.onDialogueEnd, this);
    this.game.events.on(GameEvent.Dieu, this.dieu, this);
    this.game.events.on(GameEvent.Build, this.buildCommand, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvent.DialogueEnd, this.onDialogueEnd, this);
      this.game.events.off(GameEvent.Dieu, this.dieu, this);
      this.game.events.off(GameEvent.Build, this.buildCommand, this);
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', saveIfHidden);
    });
  }

  update(time: number, delta: number): void {
    // ce qui a changé à l'image d'avant (un coup porté, un objet posé...) est écrit maintenant
    this.autosave.update();
    // le curseur oriente Xéros et dit ce qu'il vise (src/world/aim.ts) ; pas en mode construction, où la souris pose les pièces
    this.player.cursor = this.mode === 'build' ? undefined : this.player.input.cursor(this.cameras.main);
    this.player.update(this.mode === 'play');
    // courir et porter puisent dans l'endurance
    this.effort.update(this.player, delta, this.mode === 'play');
    // pousser une bille : après le clavier, il reprend la main sur la vitesse et la posture de Xéros
    this.roll.update(this.player, delta, this.mode === 'play');
    // le toit sous lequel (ou derrière lequel) est Xéros s'efface, dans tous les modes ; en mode construction, rien ne s'efface
    this.roofs.update(this.player, delta, this.mode !== 'build' && !this.interior);
    if (this.mode === 'play') {
      // le bord d'une zone du monde : la voisine prend le relais, au même point du monde
      const cross = this.interior ? undefined : this.zones.update(this.player);
      if (cross) return this.crossTo(cross);
      const exit = findExit(this.player, this.map.def.exits);
      if (exit) this.travel(exit);
      // la porte ouverte d'un bâtiment posé : on entre, ou, dedans, on ressort devant elle
      const passage = exit ? undefined : this.interiors.update(this.player);
      if (passage) this.fadeTo(passage);
    }
    // les clics, A et R toujours lus, comme E : sinon un appui fait pendant un geste ressortirait juste après ; pendant un dialogue, E,
    // les clics et Z/S sont à lui (DialogueScene les lit par PlayerInput)
    const { input } = this.player;
    const talking = this.mode === 'dialogue';
    const clicked = { left: !talking && input.clickPressed('left'), right: !talking && input.clickPressed('right') };
    const drop = input.dropPressed();
    const turn = input.turnPressed();
    // Échap, ou un pas (une flèche, ZQSD) : arrête un travail ou une passe sur un rail, ce qui est fait reste fait
    const stop = input.stopPressed();
    const moved = !talking && input.movePressed();
    if (this.mode === 'rail') this.rail.update(delta, { stop: stop || moved });
    // un travail au coup : lancé d'un clic, Xéros frappe seul jusqu'au résultat ; un pas ou Échap l'arrête après le coup en cours
    if (this.mode === 'work') this.works.update({ stop: stop || moved });
    // le zoom change dans tous les modes (même pendant un dialogue : seule la caméra du monde bouge)
    const zoom = input.zoomPressed();
    if (zoom) this.zoom.step(zoom);
    // l'horloge avance (pas pendant un dialogue, un fondu, le mode construction) ; V change la vitesse du temps (en boucle)
    this.clock.update(delta, this.mode === 'play' || this.mode === 'use' || this.mode === 'rail' || this.mode === 'work' || this.mode === 'aim');
    // les objets lancés volent dans tous les modes (le temps du jeu)
    this.updateFlights(delta);
    this.daylight.update();
    // V : la vitesse du temps du joueur, la vitesse de simulation (tout le jeu plus vite), au palier suivant, en boucle
    if (input.speedPressed() && timeDef.accelerate && (this.mode === 'play' || this.mode === 'work' || this.mode === 'rail')) {
      const n = nextSpeed(timeDef.speeds, timeDef.speeds.includes(simSpeed()) ? simSpeed() : timeDef.default);
      setSimSpeed(this.game, n);
      this.notice(`Le temps : x${n}`);
    }
    // B (?construire) : entrer dans le mode construction, ou en sortir
    if (input.buildPressed() && CONSTRUIRE && (this.mode === 'play' || this.mode === 'build')) {
      if (this.mode === 'build') this.exitBuild();
      else this.enterBuild();
    }
    const e = talking ? { pressed: false, target: undefined } : this.interaction.update(time, this.mode === 'play');
    // ce que vise chaque clic, et ce qu'il ferait (world/clickAction.ts) : lu par le jeu et par l'affichage
    this.refreshAim();
    // la coupe visée sur une pièce de bois et ses deux longueurs, la face qu'on dresse, le bout où planter ou frapper le coin
    this.wood.updatePrompt(time, this.player, this.mode === 'play' ? this.toolOf(this.lastHand) ?? this.toolOf((1 - this.lastHand) as Hand) : undefined, this.mode === 'play');
    // ce qu'on tient, en transparence, là où le poserait le clic (ou A) de la main qui pose
    const ghost = this.ghostHand();
    this.handsSystem.updatePreview(this.player, this.mode === 'play' && ghost !== undefined, ghost ?? this.lastHand);
    // les chantiers : piquets, places à remplir en fantôme, ligne d'état
    this.site.update(this.player, this.mode === 'play');
    this.pileCount.update(this.player, this.mode === 'play');
    if (this.mode === 'build') this.builder.update(delta, turn);
    // un clic pendant une attaque : la suivante de l'enchaînement partira à sa fin (à deux mains, celle du bouton)
    if (this.mode === 'use')
      for (const b of ['left', 'right'] as const) if (clicked[b]) this.combat.queue(game.both ? this.plans?.[b].short.from : undefined);
    // un lancer qu'on vise : le repère suit le curseur ; relâché, il part ; Échap l'annule
    if (this.mode === 'aim') this.updateAim(stop);
    if (this.mode !== 'play') {
      this.presses.left.cancel();
      this.presses.right.cancel();
      return;
    }
    const locked = this.interaction.locked || time < this.useLockedUntil;
    // un clic qui attend sa fin : court au relâchement, maintenu au bout du seuil (un seul seuil et une seule jauge : LONG_PRESS)
    // (un clic se mesure en temps vrai, celui des événements de la souris, jamais au temps du jeu : à x10, un clic court reste court)
    const now = performance.now();
    for (const b of ['left', 'right'] as const) {
      const press = this.presses[b];
      const end = press.update(now, input.clickDown(b), this.pressKey(b), this.player, input.clickLasted(b));
      if (end) return this.endClick(b, end);
      if (press.pending) continue;
      if (clicked[b] && !locked) {
        this.lastHand = HAND_OF[b];
        press.begin(this.pressKey(b), now, this.plans![b].long.kind !== 'none');
      }
    }
    if (this.presses.left.pending || this.presses.right.pending) return;
    // R : ce que tient la main du dernier clic tourne (l'autre si elle est vide) ; le fantôme suit à l'image suivante
    if (turn) this.handsSystem.turn(this.handOf(this.lastHand));
    // E : parler, ouvrir ou fermer, lire la planchette (sans les mains)
    if (e.pressed && e.target) this.eAction(e.target);
    // A (Q en QWERTY) : lâcher ce que tient la main du dernier clic, là où le montre le fantôme ; si elle est vide, l'autre main
    else if (drop) this.putDown(this.handOf(this.lastHand));
  }

  /** La main `hand` si elle tient quelque chose (ou les deux mains), sinon l'autre. */
  private handOf(hand: Hand): Hand {
    return game.both || game.hands[hand] ? hand : ((1 - hand) as Hand);
  }

  /** L'outil (un objet qui travaille, `worksWith`) que tient la main `hand`, ou les deux mains. */
  private toolOf(hand: Hand): string | undefined {
    const h = game.both ?? game.hands[hand];
    return h && 'item' in h && worksWith(h.item) ? h.item : undefined;
  }

  /** La main dont le clic poserait ce qu'elle tient (le fantôme la montre) : celle du dernier clic d'abord. */
  private ghostHand(): Hand | undefined {
    const plans = this.plans;
    if (!plans) return undefined;
    const button = (h: Hand): Button => (h === 1 ? 'left' : 'right');
    return [this.lastHand, (1 - this.lastHand) as Hand].find((h) => plans[button(h)].short.kind === 'put');
  }

  /**
   * Ce que vise chaque clic à cette image (world/clickAction.ts : `Aimed`) et ce que feraient les deux boutons, une fois pour le jeu et
   * l'affichage : ce que prennent les mains vides, leur geste long, une place de chantier, ce qui accepte un objet tenu, ce qui encaisse
   * un coup, ce que l'outil de chaque main travaillerait.
   */
  private refreshAim(): void {
    if (this.mode !== 'play') {
      this.handTarget = this.turnTarget = undefined;
      this.plans = undefined;
      this.game.events.emit(GameEvent.ClickPlans, undefined);
      return;
    }
    const t = this.interaction.handTarget();
    const a = t?.action;
    const aimed: Aimed = {};
    const takes: readonly string[] = ['take', 'pile', 'tie', 'pickup', 'unload', 'stake', 'harvest'];
    if (a && takes.includes(a.kind)) aimed.take = a.kind as TakeKind;
    if (a?.kind === 'site-place') aimed.site = 'place';
    if (a?.kind === 'site-help') {
      aimed.site = 'help';
      aimed.hold = 'help';
    }
    if (a?.kind === 'rest') {
      const prop = a.prop;
      aimed.rest = ([0, 1] as const).filter((h) => {
        const x = game.both ? undefined : game.hands[h];
        return !!x && 'prop' in x && !!prop.def.rest?.[x.prop];
      });
    }
    if (a && this.knots.holds(a)) aimed.hold = (a.kind === 'pile' || a.kind === 'tie') && a.pile.def.tie ? 'knot' : 'unknot';
    this.turnTarget = this.turns.target(this.player);
    if (!aimed.hold && this.turnTarget) aimed.hold = 'turn';
    aimed.target = this.combat.aimedAt(this.player.probe(INTERACT.reach), INTERACT.radius);
    aimed.work = [this.workOf(0), this.workOf(1)];
    this.handTarget = t;
    const knows = game.knownPlans.length > 0;
    this.plans = { left: clickPlan('left', game, aimed, knows), right: clickPlan('right', game, aimed, knows) };
    this.game.events.emit(GameEvent.ClickPlans, this.plans);
  }

  /**
   * Ce que l'outil de la main `hand` ferait sur ce qui est visé : le travail du bois (couper, équarrir, planter le coin, fendre), la
   * récolte au coup (abattre, ébrancher, tailler, casser) ou le coup simple (couper un lien du rouleau) ; un refus (la hache sur une
   * grosse bille) compte aussi, le clic dira pourquoi. Rien : il n'y a rien à travailler pour lui.
   */
  private workOf(hand: Hand): WorkKind | undefined {
    const tool = this.toolOf(hand);
    if (!tool) return undefined;
    const aim = this.wood.target(this.player, tool);
    if (aim) return aim.work;
    const target = this.harvest.target(this.player, tool);
    const h = target?.def.harvest;
    if (!target || !h) return undefined;
    if (!wields(h, tool) && !this.harvest.refusal(target, tool)) return undefined;
    return (h.work && harvestKind(h)) || 'hit';
  }

  /** Ce que vise le clic du bouton `b`, pour savoir s'il vise toujours la même chose à son relâchement. */
  private pressKey(b: Button): unknown {
    const plan = this.plans?.[b];
    if (!plan) return undefined;
    const t = plan.long.kind === 'turn' ? this.turnTarget : this.handTarget;
    return t ? subject(t.action) : plan.short.kind;
  }

  /** La fin d'un clic : court (relâché avant le seuil), ou maintenu (tenu jusqu'au bout). Xéros se tourne vers le curseur avant d'agir. */
  private endClick(b: Button, end: 'short' | 'long'): void {
    this.player.faceCursor();
    this.refreshAim();
    const plan = this.plans![b];
    this.clickButton = b;
    this.act(plan.hand, end === 'short' ? plan.short : plan.long);
  }

  /** Ce que fait un clic (world/clickAction.ts), de la main `hand`. */
  private act(hand: Hand, c: Click): void {
    const t = this.handTarget;
    const held = game.both ?? game.hands[hand];
    switch (c.kind) {
      case 'take':
        if (t) this.takeAt(t, hand);
        return;
      case 'punch':
        return this.attack(this.combat.plan({ fist: true, hand }, this.player.actor.facing, this.time.now, this.player.strength.swinger));
      case 'strike':
        if (held) this.attack(this.combat.plan({ held, hand }, this.player.actor.facing, this.time.now, this.player.strength.swinger, c.from));
        return;
      case 'work': {
        const tool = this.toolOf(hand);
        if (tool) this.useTool(tool, hand);
        return;
      }
      case 'plant':
        if (held && 'item' in held) this.plantStake(held.item);
        return;
      case 'put':
        return this.putDown(hand);
      case 'place':
        if (t?.action.kind === 'site-place') this.placeOnSite(t.action, hand);
        return;
      case 'rest':
        if (t?.action.kind === 'rest' && this.handsSystem.rest(t.action.prop, hand)) this.handsChanged();
        return;
      case 'help-info':
        if (t?.action.kind === 'site-help') {
          const r = this.site.help(t.action.site, t.action.place);
          if (r) this.notice(r.ok ? 'Maintiens le clic pour appeler ta mère.' : r.message);
        }
        return;
      default:
        return this.longAct(hand, c);
    }
  }

  /** Le geste long d'un clic maintenu, mains vides : nouer, dénouer, pivoter une bille, appeler la mère ; ou, la main pleine, lancer. */
  private longAct(hand: Hand, c: Click): void {
    const t = this.handTarget;
    if ((c.kind === 'knot' || c.kind === 'unknot') && t) return this.knot(t);
    if (c.kind === 'turn' && this.turnTarget) return this.turnLog(this.turnTarget);
    if (c.kind === 'help' && t?.action.kind === 'site-help') return this.callMother(t.action);
    if (c.kind === 'throw') return this.beginThrow(hand);
  }

  /**
   * Le clic maintenu d'une main qui tient un objet (un objet à deux mains : l'un ou l'autre clic) : viser, puis lancer au relâchement
   * (world/throw.ts). Xéros ne marche plus, il se tourne vers le curseur ; le repère au sol montre où l'objet tombera.
   */
  private beginThrow(hand: Hand): void {
    if (!(game.both ?? game.hands[hand])) return;
    this.aiming = { hand, button: this.clickButton };
    this.mode = 'aim';
    if (!this.mark && this.textures.exists('ui-throw-mark')) this.mark = this.add.image(0, 0, 'ui-throw-mark').setOrigin(0.5, 0.5).setDepth(DEPTH.shadow + 0.02);
  }

  /** Où le lancer en cours tomberait : la direction et la distance du curseur (sans curseur, devant Xéros, le plus loin possible). */
  private throwAim(h: Held): { ux: number; uy: number; plan: ReturnType<typeof throwPlan> } {
    const a = this.player.actor;
    const c = this.player.cursor;
    const f = FACING_VECTOR[a.facing];
    const dx = c ? c.x - a.x : f.x;
    const dy = c ? c.y - a.y : f.y;
    const n = Math.hypot(dx, dy) || 1;
    const d = c ? n / PX_PER_M : Infinity;
    return { ux: dx / n, uy: dy / n, plan: throwPlan(h, this.player.strength.swinger, d) };
  }

  /** La visée d'un lancer, à chaque image : le repère suit le curseur (au bout de la portée s'il est plus loin) ; relâché, il part. */
  private updateAim(stop: boolean): void {
    const aim = this.aiming;
    const held = aim && (game.both ?? game.hands[aim.hand]);
    if (!aim || !held || stop) return this.endAim(stop ? 'Lancer annulé.' : undefined);
    this.player.faceCursor();
    const { ux, uy, plan } = this.throwAim(held);
    const a = this.player.actor;
    const px = plan.range * PX_PER_M;
    if (this.mark) {
      this.mark.setPosition(Math.round(a.x + ux * px), Math.round(a.y + uy * px)).setVisible(true);
      this.mark.setAlpha(0.65 + 0.35 * Math.sin(this.time.now / 120));
    }
    // relâché (même entre deux images : le verrou garde le relâchement) : il part
    if (!this.player.input.clickDown(aim.button)) this.launch(aim.hand, held, ux, uy, plan);
  }

  private endAim(message?: string): void {
    this.aiming = undefined;
    this.mark?.setVisible(false);
    if (this.mode === 'aim') this.mode = 'play';
    if (message) this.notice(message);
  }

  /**
   * Le lâcher (docs/CONCEPTION.md, « Le lancer ») : le temps revient à x1 (comme une attaque) ; le travail du bras se paie au joule ;
   * l'objet quitte la main et vole. Sa trajectoire est suivie pas à pas (`step` de combat.json) : la première cible dont l'emprise est
   * franchie entre deux pas, à une hauteur où elle est (world/crossing.ts), est touchée de l'énergie de l'objet à cet instant (world/strike.ts) ;
   * un obstacle l'arrête ; sinon il tombe au bout. Il est posé au sol tout de suite (GameState), à la place libre la plus proche de là où
   * il retombe, son image cachée jusqu'à la fin du vol.
   */
  private launch(hand: Hand, what: Held, ux: number, uy: number, plan: ReturnType<typeof throwPlan>): void {
    this.endAim();
    if (simSpeed() !== timeDef.default) {
      setSimSpeed(this.game, timeDef.default);
      this.notice(`Le temps : x${timeDef.default}`);
    }
    if (!this.effort.affordStroke(this.player, attackCost(stamina.work, plan.release.joules))) return;
    const a = this.player.actor;
    const origin = { x: a.x, y: a.y };
    const pts = plan.path.map((p) => ({ x: origin.x + ux * p.d * PX_PER_M, y: origin.y + uy * p.d * PX_PER_M, z: p.z * PX_PER_M, t: p.t, v: p.v }));
    const targets = this.combat.throwTargets();
    let end = pts.length - 1;
    let hit: Flight['hit'];
    for (let i = 1; i < pts.length && !hit; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const z = p1.z / PX_PER_M;
      const q = targets.find((t) => z <= t.height && crossed(p0, p1, (x, y) => x >= t.box.left && x <= t.box.right && y >= t.box.top && y <= t.box.bottom));
      if (q) {
        hit = { key: q.key, t: p1.t, joules: kinetic(plan.release.kg, p1.v) };
        end = i;
        break;
      }
      // un obstacle (un tronc, un mur, une bille couchée) l'arrête : il tombe devant
      if (crossed(p0, p1, (x, y) => !this.map.areaFree({ left: x - 0.5, top: y - 0.5, right: x + 0.5, bottom: y + 0.5 }))) {
        end = i - 1;
        break;
      }
    }
    const path = pts.slice(0, end + 1);
    const last = path[path.length - 1];
    release(game, hand);
    this.handsChanged();
    // la matière se conserve : l'objet est au sol dès le lâcher (GameState), là où il retombe ; caché pendant le vol
    const landed = this.handsSystem.layNear(this.player, what, last.x, last.y);
    landed?.setVisible(false);
    const look = this.handsSystem.lookOf(what);
    const sprite = this.add.image(origin.x, origin.y, look.key, look.frame).setOrigin(0.5, 0.5);
    const item = 'item' in what ? what.item : what.prop;
    this.flights.push({ sprite, points: path.map(({ x, y, z, t }) => ({ x, y, z, t })), t: 0, hit, item, facing: a.facing, landed });
  }

  /** Les objets en vol avancent du temps du jeu ; la cible touchée réagit à l'instant du choc ; au sol, l'objet posé se montre. */
  private updateFlights(delta: number): void {
    for (const f of [...this.flights]) {
      f.t += delta / 1000;
      if (f.hit && f.t >= f.hit.t) {
        this.combat.thrownHit(f.hit.key, f.item, f.hit.joules, f.facing);
        f.hit = undefined;
      }
      const pts = f.points;
      const i = pts.findIndex((p) => p.t >= f.t);
      if (i < 0) {
        f.sprite.destroy();
        f.landed?.setVisible(true);
        this.flights.splice(this.flights.indexOf(f), 1);
        continue;
      }
      const p1 = pts[i];
      const p0 = pts[Math.max(0, i - 1)];
      const k = p1.t > p0.t ? (f.t - p0.t) / (p1.t - p0.t) : 1;
      const x = p0.x + (p1.x - p0.x) * k;
      const y = p0.y + (p1.y - p0.y) * k;
      const z = p0.z + (p1.z - p0.z) * k;
      f.sprite.setPosition(Math.round(x), Math.round(y - z)).setDepth(y);
    }
  }

  /** E devant une cible, sans les mains : parler (la paillasse : « Dormir ? »), ouvrir ou fermer, lire la planchette. */
  private eAction(target: Interactable): void {
    const a = target.action;
    this.player.faceCursor();
    if (a.kind === 'talk') {
      this.talking = a.npc;
      this.talking?.faceToward(this.player.actor.x, this.player.actor.y);
      this.openDialogue(a.dialogue);
    } else if (a.kind === 'learn') {
      this.notice(this.site.learn(a.plan));
    } else if (a.kind === 'swing') {
      this.swing(a.id);
    }
  }

  /**
   * Le clic d'une main vide sur ce qu'elle prend : récolter à la main, prendre un objet du monde, reprendre d'un tas ou son lien,
   * reprendre ce que porte le billot, ramasser, arracher un piquet planté. Ce qui va dans une seule main va dans celle du clic.
   */
  private takeAt(target: Interactable, hand: Hand): void {
    const a = target.action;
    if (a.kind === 'harvest') {
      // ce qui va directement dans les mains (la hache du billot) : il faut les mains libres avant le geste
      const gives = a.prop.def.harvest!.drops.filter((d) => d.give);
      if (gives.some((d) => !canTake(game, items[d.item].hands))) return this.notice('Les mains pleines.');
      this.gesture(a.prop.def.harvest!.gesture, undefined, () => this.report(this.harvest.hit(a.prop, undefined, this.player.actor.facing, hand)));
    } else if (a.kind === 'take') {
      if (a.prop.wood?.notch) return this.notice("Finis d'abord la coupe.");
      if (a.prop.wood?.wedge) return this.notice('Le coin est planté : finis de la fendre.');
      const kg = propMass(a.prop.type, a.prop.length, undefined, a.prop.wood, a.prop.natural, a.prop.bundle);
      if (!this.player.strength.canCarry(kg)) return this.notice(heavyNotice(a.prop.def, kg, this.player.strength));
      if (!this.canLift(kg)) return this.effort.exhausted();
      if (!this.handsSystem.takeProp(a.prop, hand)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else if (a.kind === 'pile') {
      const piece = a.pile.def.piece;
      // un fagot du tas : la masse de son nombre de branches
      const kg = 'prop' in piece && a.pile.pile.bundle ? propMass(piece.prop, undefined, undefined, undefined, undefined, a.pile.pile.bundle) : pieceMass(piece);
      const def = 'wood' in piece ? defOf(WOOD_PIECE, { ...piece.wood, axis: 'ew' }) : 'prop' in piece ? props[piece.prop] : undefined;
      if (!this.player.strength.canCarry(kg)) return this.notice(heavyNotice(def, kg, this.player.strength));
      if (!this.canLift(kg)) return this.effort.exhausted();
      if (!this.handsSystem.takeFromPile(a.pile, a.place, hand)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else if (a.kind === 'tie') {
      if (!this.handsSystem.takeTie(a.pile, hand)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else if (a.kind === 'unload') {
      if (!this.handsSystem.unload(a.prop, hand)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else if (a.kind === 'pickup') {
      this.pickUp(a.ground, hand);
    } else if (a.kind === 'stake') {
      if (!this.site.takeStake(a.site, a.corner, hand)) return this.notice('Les mains pleines.');
      this.handsChanged();
    }
  }

  /** Le clic d'une main qui tient la pièce d'une place de chantier : la poser (une poutre à dresser se paie selon sa masse). */
  private placeOnSite(a: Extract<Interactable['action'], { kind: 'site-place' }>, hand: Hand): void {
    const r = this.site.tryPlace(a.site, a.place, hand);
    if (!r) return;
    if (!r.ok) return this.notice(r.message);
    // dresser une poutre se paie selon sa masse ; une pierre qu'on pose, rien
    if (r.kg > 0 && !this.effort.afford(this.player, this.player.stamina.raiseCost(r.kg))) return;
    r.commit();
    this.handsChanged();
  }

  /**
   * E sur ce qui s'ouvre et se ferme parmi les pièces posées en mode construction (le volet) : il bat sur son gond (`swung`,
   * world/build.ts), GameState le note dans son autre état, et la carte le redessine. Refusé si, ouvert, il bloquerait Xéros.
   */
  private swing(id: number): void {
    // dedans, une pièce du bâtiment (le volet) : elle est à la carte du dehors, vue ici décalée
    const it = this.interior;
    const fixed = !!it && this.map.builds.some((b) => b.piece.id === id && b.fixed);
    const owner = fixed ? it!.host : this.map.def.id;
    const shift = fixed ? it!.shift : { x: 0, y: 0 };
    const p = mapState(game, owner).builds.find((q) => q.id === id);
    const next = p && swung(p);
    if (!p || !next) return;
    const here = { ...next, x: next.x + shift.x, y: next.y + shift.y };
    const body = this.player.actor.body as Phaser.Physics.Arcade.Body;
    const feet = { x: body.left * CM_PER_PX, y: body.top * CM_PER_PX, w: body.width * CM_PER_PX, d: body.height * CM_PER_PX };
    if (blocks(here) && overlaps(boxOf(here), feet)) return this.notice('Xéros est dans le passage.');
    const [piece] = addBuildPieces(game, owner, [{ ...next, id }]);
    this.map.removeBuild(id);
    this.map.placeBuild({ ...piece, x: piece.x + shift.x, y: piece.y + shift.y }, fixed);
    this.map.sortBuilds();
    // un volet ouvert fait entrer la lumière, fermé la pénombre
    if (fixed) this.inside?.refresh(mapState(game, owner).builds.flatMap((q) => ('prop' in q.piece ? [{ id: q.id, open: !!props[q.piece.prop].swing?.open }] : [])));
  }

  /** La place dont Xéros demande l'aide à sa mère (le dialogue « Appeler ta mère pour la dresser ? » est ouvert). */
  private helpAt?: { site: number; place: string };

  /** E maintenu devant une place trop lourde pour Xéros : sans poutre qui convienne au pied de la place, on le dit ; sinon on demande s'il appelle sa mère. */
  private callMother(a: Extract<Interactable['action'], { kind: 'site-help' }>): void {
    const r = this.site.help(a.site, a.place);
    if (!r) return;
    if (!r.ok) return this.notice(r.message);
    if (this.player.stamina.empty) return this.effort.exhausted();
    this.helpAt = { site: a.site, place: a.place };
    this.openDialogue('call-mother');
  }

  /**
   * « Oui » : fondu au noir, « Ta mère vient t'aider. », et au retour la poutre est dressée sur son appui. Xéros paie la moitié de
   * l'effort qu'il aurait fait seul. La mère n'est pas montrée : elle vient et repart pendant que l'écran est noir (plus tard, elle
   * marchera jusqu'au chantier).
   */
  private helpNow(): void {
    const at = this.helpAt;
    this.helpAt = undefined;
    const r = at && this.site.help(at.site, at.place);
    if (!r) return;
    if (!r.ok) return this.notice(r.message);
    if (!this.effort.afford(this.player, this.player.stamina.raiseCost(r.kg, true))) return;
    this.mode = 'transition';
    const cam = this.cameras.main;
    cam.fadeOut(HELP.fade, 20, 14, 8);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.notice("Ta mère vient t'aider.");
      this.time.delayedCall(HELP.hold, () => {
        r.commit();
        cam.fadeIn(HELP.fade, 20, 14, 8);
        cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
          this.mode = 'play';
          this.interaction.lock(LOCKS.lock);
          this.useLockedUntil = this.time.now + LOCKS.lock;
        });
      });
    });
  }

  /** Le clic d'une main qui tient un piquet : le planter au tracé d'un plan connu (rien n'est dépensé tant qu'il est refusé). */
  private plantStake(item: string): void {
    const r = this.site.plantStake(this.player, item);
    if (!r.ok) return this.notice(r.message);
    if (!this.effort.afford(this.player, this.player.stamina.costs.stake)) return;
    r.commit();
    this.handsChanged();
  }

  /** Le clic maintenu jusqu'au bout, mains vides, devant une bille : elle pivote (si elle a la place), et cela coûte de l'endurance selon sa masse. */
  private turnLog(target: Interactable): void {
    const a = target.action;
    if (a.kind !== 'turn') return;
    const kg = this.turns.mass(a.prop);
    const cost = this.player.stamina.turnCost(kg);
    if (!this.effort.allows(this.player, cost)) return;
    const why = this.turns.act(this.player, a.prop);
    if (why) return this.notice(why);
    this.player.stamina.spend(cost);
  }

  /** Le clic maintenu, mains vides, devant un tas ou un fagot : nouer ou dénouer ; sinon, ce qui manque se dit. */
  private knot(target: Interactable): void {
    if (!this.effort.allows(this.player, this.player.stamina.costs.knot)) return;
    const why = this.knots.act(target.action);
    if (why) this.notice(why);
    else {
      this.player.stamina.spend(this.player.stamina.costs.knot);
    }
  }

  /** A, ou le clic d'une main qui tient une ressource : pose ce que tient la main `hand`, là où le montre le fantôme (HandsSystem.putDown), s'il y a la place. */
  private putDown(hand: Hand): void {
    this.player.faceCursor();
    const r = this.handsSystem.putDown(this.player, hand);
    if (r === 'blocked') this.notice('Pas la place ici.');
    if (r === 'done') this.handsChanged();
  }

  /** Une sauvegarde où Xéros tient plus qu'il ne porte (d'avant les masses) : le plus lourd est posé au sol devant lui, la partie continue. */
  private dropHeavy(): void {
    const slots = (): { slot: 'both' | 0 | 1; held: Held }[] =>
      [{ slot: 'both' as const, held: game.both }, { slot: 0 as const, held: game.hands[0] }, { slot: 1 as const, held: game.hands[1] }].filter(
        (s): s is { slot: 'both' | 0 | 1; held: Held } => !!s.held,
      );
    while (carriedMass(game) > this.player.strength.carry + 1e-9) {
      const heaviest = slots().sort((a, b) => heldMass(b.held) - heldMass(a.held))[0];
      this.handsSystem.layDown(this.player, heaviest.held);
      clearHeld(game, heaviest.slot);
      this.notice('Trop lourd pour lui maintenant : posé devant toi.');
    }
  }

  /** Les mains ont changé : le HUD se redessine, ce que tient Xéros se voit sur lui. */
  private handsChanged(): void {
    this.player.strength.load = carriedMass(game);
    const [l, r] = game.hands;
    if (game.both) {
      const { stance, look } = holdOf(this, game.both);
      // à deux mains, la posture est `shoulder` ou `carry` (validate.ts)
      this.player.hold.set({ both: look, stance: stance as 'shoulder' | 'carry' });
    } else this.player.hold.set({ left: l ? holdOf(this, l).look : undefined, right: r ? holdOf(this, r).look : undefined });
    this.game.events.emit(GameEvent.HandsChanged);
  }

  private notice(text: string): void {
    this.game.events.emit(GameEvent.Notice, text);
  }

  /**
   * Le clic d'une main qui tient un outil, devant ce qu'il travaille (world/clickAction.ts) : le travail, lancé d'un clic ; un outil qui
   * n'a rien à travailler devant lui frappe, comme tout objet tenu (décidé par Grégoire, world/heft.ts).
   */
  private useTool(tool: string, hand: Hand): void {
    const strike = () => {
      const held = game.both ?? game.hands[hand];
      if (held) this.attack(this.combat.plan({ held, hand }, this.player.actor.facing, this.time.now, this.player.strength.swinger));
    };
    // une pièce de bois : la cognée la coupe où l'on vise, la doloire en dresse une face d'une passe le long de la pièce ; le
    // coin se plante dans le bout, d'un coup, sans geste ; la masse frappe le coin depuis ce bout
    const aim = this.wood.target(this.player, tool);
    if (aim) {
      if (aim.refusal) return this.notice(aim.refusal);
      if (aim.work === 'hew') return this.hewPass(aim, tool);
      if (aim.work === 'plant') {
        // le coin se plante d'un coup, sans geste
        if (!this.effort.afford(this.player, this.player.stamina.costs.plant)) return;
        return this.woodHit(tool);
      }
      return this.woodWork(aim, tool);
    }
    // le coin sans bout de bille où se planter : il frappe, comme tout objet tenu
    if (WoodSystem.workOf(tool) === 'plant') return strike();
    // le geste dépend de la cible : de côté sur ce qui est debout, de haut en bas sur ce qui est couché ; dans le vide, de côté
    const target = this.harvest.target(this.player, tool);
    const h = target?.def.harvest;
    const gesture = h?.gesture ?? 'use';
    // un outil que la cible écarte (la hache sur une grosse bille) ou une fente sans la place de s'ouvrir : on le dit, sans geste ni dépense
    const why = target && this.harvest.refusal(target, tool);
    if (why) return this.notice(why);
    // une récolte au coup (sa matière, `work`) : un clic lance tout le travail, Xéros frappe seul jusqu'au résultat
    if (target && h?.work && wields(h, tool)) return this.harvestWork(target, tool);
    // un coup qui porte coûte de l'endurance (le lien du billot un peu moins qu'un arbre) ; dans le vide ou sans le bon outil, rien
    const costs = this.player.stamina.costs;
    if (h && wields(h, tool) && !this.effort.afford(this.player, costs[effortOf(h, tool, !!target!.def.bears?.prop)])) return;
    // un outil sans rien à travailler devant lui : il frappe, comme tout objet tenu
    if (!h || !wields(h, tool)) return strike();
    // la cible est cherchée au moment du coup : celle qui est devant Xéros à l'impact
    this.gesture(gesture, tool, () => {
      const t = this.harvest.target(this.player, tool);
      this.report(this.harvest.hit(t, tool, this.player.actor.facing, hand));
    });
  }

  /**
   * Une attaque (systems/combat.ts) : elle se paie au départ, même dans le vide (c'est le geste qui fatigue) ; le geste de combat du
   * corps avec l'arme dans la main droite (ou le poing), à chaque image de frappe la lame et ce qu'elle balaie ; un clic pendant le
   * geste enchaîne la suivante.
   */
  private attack(p: AttackPlan): void {
    // le combat ramène le temps à son palier de départ (time.json `default`, x1)
    if (simSpeed() !== timeDef.default) {
      setSimSpeed(this.game, timeDef.default);
      this.notice(`Le temps : x${timeDef.default}`);
    }
    if (!this.effort.affordStroke(this.player, p.cost)) return;
    this.combat.begin(p);
    this.mode = 'use';
    const striker = p.striker;
    this.player.tools.fight(p.attack.gesture, {
      frames: p.frames,
      durations: p.durations,
      weapon: p.weapon.image,
      held: p.improvised && 'held' in striker ? striker.held : undefined,
      grip: p.weapon.grip,
      shift: p.drawShift,
      active: p.sweep.active,
      onStrike: (step) => this.combat.strike(this.player, p, step),
      onDone: () => {
        const chain = this.combat.end(p, this.time.now);
        if (this.mode === 'use') this.mode = 'play';
        // un clic pendant le geste : la suivante, avec la même arme (ou le même poing) si elle sert toujours
        const same = 'held' in striker ? [game.both, ...game.hands].includes(striker.held) : !game.both && !game.hands[striker.hand];
        const from = this.combat.takeQueuedFrom();
        if (chain && this.mode === 'play' && same) this.attack(this.combat.plan(striker, this.player.actor.facing, this.time.now, this.player.strength.swinger, from));
      },
    });
  }


  /**
   * Une passe de doloire (un clic contre le flanc, à un bout de la pièce ou là où la face s'est arrêtée) : Xéros longe la pièce sur
   * le rail, chaque coup payé au fil de ce qu'il dresse ; à la fin, la face finie (et le quart de tour), la poutre, ou, arrêtée
   * par Échap ou par la fatigue, la face entamée qui attend la passe suivante.
   */
  private hewPass(aim: WoodAim, tool: string): void {
    if (this.player.stamina.empty) return this.effort.exhausted();
    this.mode = 'rail';
    // un coup de doloire (world/swing.ts, la force de Xéros) : ce qu'il lève, rapporté à la section d'une face, et ses temps
    const who = this.player.strength.swinger;
    const unit = woodJob('hew', aim.piece, 1, tool);
    const stroke = jobStroke(unit, who);
    const cost = strokeCost(stroke);
    const phases = gestures[work.strokes.hew.gesture]?.phases as Phase[] | undefined;
    // chaque coup se paie ; à bout de souffle, Xéros souffle sur place puis reprend ; plafond vide, la passe s'arrête
    const pay = (): boolean | 'wait' => {
      const r = this.player.stamina.spendStroke(cost.ceiling, cost.breath);
      if (r === 'exhausted') this.effort.exhausted();
      return r === 'done' ? true : r === 'winded' ? 'wait' : false;
    };
    // ?dieu « Finir le travail » : ce qui reste à dresser, d'un coup (l'horloge et le plafond de ses coups)
    const settle = (cm: number) => {
      const plan = planOf(woodJob('hew', aim.piece, cm, tool), who, this.player.stamina.max);
      this.clock.work(plan.seconds / 60);
      this.player.stamina.force(plan.ceiling, plan.breath);
    };
    this.rail.start(
      this.wood.hewPass(this.player, aim, { cm: perStroke(unit, stroke) / unit.amount, durations: phases ? frameMs(stroke, phases) : undefined, tool }, pay, settle, (r, why) => {
        if (r.face) this.notice(`Une face dressée (${r.face} sur 4).`);
        if (r.beam) this.notice(`Poutre équarrie : ${metres(r.beam.length)}.`);
        if (why === 'stopped') this.notice('Arrêté : la face reprendra là.');
        this.player.stamina.flush();
        if (this.mode === 'rail') this.mode = 'play';
        // l'appui sur Échap ou le clic d'avant ne relance rien
        this.useLockedUntil = this.time.now + LOCKS.afterWork;
      }),
    );
  }

  /**
   * L'impact d'un coup sur une pièce de bois : la coupe se creuse ou s'achève, une face se dresse, la poutre est finie, le coin est
   * planté (la main qui le tenait est libre), la fente s'allonge ou la pièce s'ouvre en deux.
   */
  private woodHit(tool: string): void {
    const r = this.wood.hit(this.player, tool, this.player.actor.facing);
    if (r?.split) this.notice(`Coupé : ${metres(r.split[0])} et ${metres(r.split[1])}.`);
    if (r?.planted) {
      // le coin est resté dans le bois : la main qui le tenait (l'active, ou l'autre) est libre
      const slot = game.both && 'item' in game.both && game.both.item === tool ? 'both' : ([0, 1] as const).find((i) => { const x = game.hands[i]; return !!x && 'item' in x && x.item === tool; });
      if (slot !== undefined) clearHeld(game, slot);
      this.handsChanged();
    }
    // les morceaux qui débordent (les demi-billes, la pièce nord-sud coupée) repoussent Xéros s'ils le recouvrent
    this.harvest.settle(this.player);
  }

  private gesture(gesture: string, item: string | undefined, onImpact: () => void): void {
    this.mode = 'use';
    this.player.tools.swing(gesture, item, onImpact, () => {
      if (this.mode === 'use') this.mode = 'play';
    });
  }

  /**
   * Une récolte au coup (props.json : `harvest.work`, la matière ; docs/CONCEPTION.md, « Le travail ») : chaque coup en enlève une part,
   * les `hits` étapes tombent en chemin (l'arbre tremble), le résultat au bout ; tailler sur le billot est une seule étape. Reprise là où
   * elle s'était arrêtée (`work` de la carte, GameState).
   */
  private harvestWork(prop: PlacedProp, tool: string): void {
    const h = prop.def.harvest!;
    const mapId = this.map.def.id;
    const key = workKey(prop.id, prop.spawned);
    const kind = h.convert ? 'whittle' : 'harvest';
    const saved = mapState(game, mapId).work[key];
    const done = saved?.work === kind ? saved.done : 0;
    const steps = h.convert ? 1 : h.hits;
    // les étapes déjà faites (l'arbre entamé, repris après un rechargement)
    if (steps > 1) prop.hits = Math.min(steps - 1, Math.floor(done * steps + 1e-9));
    // un arbre debout (une chute) : le côté de l'entaille, celui où Xéros frappe (gardé avec le travail commencé) ; Xéros se met lui-même
    // en place de ce côté, le fer sur l'entaille : la hache frappe toujours au même endroit, et l'arbre tombera de ce côté
    const side = h.fall ? (saved?.side ?? (this.player.actor.x < prop.baseX ? 'left' : 'right')) : undefined;
    if (side) this.standToFell(prop, side);
    const facing = this.player.actor.facing;
    this.startWork({
      def: harvestJob(h.work!, tool),
      done,
      steps,
      step: () => this.report(this.harvest.hit(prop, tool, facing)),
      strike: () => this.harvest.strike(prop, facing),
      progress: (d) => this.harvest.showStage(prop, d, side),
      save: (d) => setWork(game, mapId, key, d === undefined ? undefined : { work: kind, done: d, ...(side ? { side } : {}) }),
      valid: () => this.map.props.includes(prop),
    });
  }

  /**
   * Xéros se met en place pour abattre (docs/CONCEPTION.md, « Le travail ») : du côté `side` de l'arbre, tourné vers lui, ses pieds à
   * `FELL.reach` px du point visé, à sa hauteur ; si la place est prise, il frappe d'où il est, tourné vers l'arbre.
   */
  private standToFell(prop: PlacedProp, side: 'left' | 'right'): void {
    const a = this.player.actor;
    const x = Math.round(prop.aimX + (side === 'left' ? -FELL.reach : FELL.reach));
    const y = Math.round(prop.aimY);
    const b = a.body;
    const dx = x - a.x;
    const dy = y - a.y;
    if (this.map.areaFree({ left: b.left + dx, right: b.right + dx, top: b.top + dy, bottom: b.bottom + dy })) b.reset(x, y);
    a.face(side === 'left' ? 'right' : 'left');
  }

  /**
   * Couper une pièce de bois à la cognée, ou la fendre à la masse (wood.json ; docs/CONCEPTION.md, « Le travail ») : un travail au coup
   * dont la matière vient du diamètre (et de la longueur, pour fendre) ; la coupe se creuse, la fente s'allonge à chaque étape (notées
   * dans les réglages de la pièce), la pièce s'ouvre au bout.
   */
  private woodWork(aim: WoodAim, tool: string): void {
    const work = aim.work as 'cut' | 'maul';
    const { id, spawned } = aim.prop;
    const piece = aim.piece;
    const mapId = this.map.def.id;
    const key = workKey(id, spawned);
    const steps = work === 'cut' ? W.cut.hits : splitHits(piece);
    const before = work === 'cut' ? (piece.notch?.hits ?? 0) : (piece.wedge?.hits ?? 0);
    // les étapes faites sont dans la pièce ; la part de l'étape en cours, dans GameState
    const saved = mapState(game, mapId).work[key];
    const done = Math.max(before / steps, saved?.work === work ? Math.min(saved.done, (before + 0.999) / steps) : 0);
    this.startWork({
      def: woodJob(work, piece, piece.length, tool),
      done,
      steps,
      step: () => this.woodHit(tool),
      strike: () => this.harvest.chipsAt(aim.x, aim.y + 3, aim.prop.y + 1, 'wood', this.player.actor.facing),
      save: (d) => setWork(game, mapId, key, d === undefined ? undefined : { work, done: d }),
      valid: () => this.map.props.some((q) => q.id === id && !!q.spawned === !!spawned && !!q.wood),
    });
  }

  /** Lance un travail (systems/work.ts) : le mode `work` jusqu'à sa fin ; un pas déjà pressé ne l'arrête pas. */
  private startWork(job: Omit<WorkJob, 'end'>): void {
    this.player.input.movePressed();
    this.mode = 'work';
    const ok = this.works.start({
      ...job,
      end: () => {
        if (this.mode === 'work') this.mode = 'play';
        // le clic d'avant ou l'appui qui l'a arrêté ne relance rien
        this.useLockedUntil = this.time.now + LOCKS.afterWork;
        this.interaction.lock(LOCKS.afterWork);
      },
    });
    if (!ok) this.mode = 'play';
  }

  private report(r: HitResult): void {
    if (r.kind === 'missing') this.game.events.emit(GameEvent.Notice, `Sans ${items[r.tool].name}, rien à faire.`);
    if (r.kind === 'refused') this.notice(r.message);
    if (r.kind !== 'hit') return;
    if (r.given) this.handsChanged();
    if (r.overflow) this.game.events.emit(GameEvent.Notice, 'Les mains pleines.');
    // ce qui reste de ce qu'on vient de couper (le rouleau sur le billot)
    if (r.cut) {
      const name = props[r.cut.prop].name;
      const label = name[0].toUpperCase() + name.slice(1);
      this.notice(r.cut.remaining > 0 ? `${label} : ${metres(r.cut.remaining)} restants.` : `${label} : vide.`);
    }
  }

  /** Épuisé, Xéros ne prend pas ce qui l'obligerait à porter au-delà de ce qu'il porte sans peine : porter coûte à chaque pas. */
  private canLift(kg: number): boolean {
    const s = this.player.strength;
    return !this.player.stamina.empty || s.load + kg <= s.walk + 1e-9;
  }

  /** Prend un objet au sol dans la main du clic, ou l'autre si elle est prise (les deux s'il le demande). */
  private pickUp(g: PlacedGround, hand: Hand): void {
    const kg = itemMass(g.item.item, undefined, g.item.natural);
    if (!this.player.strength.canCarry(kg)) return this.notice(heavyNotice(undefined, kg, this.player.strength));
    if (!this.canLift(kg)) return this.effort.exhausted();
    // il garde le sens où il était couché : reposé, il le retrouve (R le tourne) ; et, naturel, sa forme et sa taille
    const what = { item: g.item.item, ...(g.item.view ? { view: g.item.view } : {}), ...(g.item.natural ? { natural: g.item.natural } : {}) };
    if (!take(game, what, items[g.item.item].hands, hand)) return this.notice('Les mains pleines.');
    removeGroundItem(game, this.map.def.id, g.item.id);
    this.map.removeGround(g);
    this.handsChanged();
  }

  /**
   * Xéros passe le bord de la zone : la scène redémarre sur la voisine, ses pieds au même point du monde, sans fondu ; la vue garde son
   * décalage par rapport à lui (la caméra le suit avec un peu de retard). La partie s'écrit à l'arrivée, comme pour une sortie.
   */
  private crossTo(c: { map: { id: string }; x: number; y: number }): void {
    this.mode = 'transition';
    this.roll.flush();
    this.player.stamina.flush();
    const cam = this.cameras.main;
    const { x, y, facing } = this.player.actor;
    this.scene.restart({ mapId: c.map.id, at: { x: c.x, y: c.y, facing }, edge: { view: { dx: cam.midPoint.x - x, dy: cam.midPoint.y - y } } } satisfies WorldStart);
  }

  /**
   * Où poser Xéros qui arrive par le bord : ses pieds là où ils étaient dans le monde, ou, si un objet de la voisine les y recouvre (un
   * arbre au ras du bord), au plus près le long du bord, là où ils sont libres.
   */
  private freeArrival(x: number, y: number): { x: number; y: number } {
    const W = this.map.width;
    const H = this.map.height;
    const box = (px: number, py: number) => ({
      left: Math.max(0, px - FEET.w / 2),
      right: Math.min(W, px + FEET.w / 2),
      top: Math.max(0, py - FEET.h),
      bottom: Math.min(H, py),
    });
    // arrivé par le bord ouest ou est, on glisse du nord au sud ; par le nord ou le sud, d'ouest en est
    const near = ZONES.edge + 2;
    const along = x < near || x > W - near ? 'y' : 'x';
    for (let d = 0; d <= 96; d += 2) {
      for (const s of d ? [d, -d] : [0]) {
        const px = along === 'x' ? x + s : x;
        const py = along === 'y' ? y + s : y;
        if (px < 0 || px > W || py < 0 || py > H) continue;
        if (this.map.areaFree(box(px, py))) return { x: px, y: py };
      }
    }
    return { x, y };
  }

  /** Une sortie est prise : la carte d'arrivée, à son point d'apparition. */
  private travel(exit: Exit): void {
    this.fadeTo({ mapId: exit.to, spawn: exit.spawn });
  }

  /** Les taches de lumière de l'intérieur où l'on est (pour les tests de scénario). */
  get interiorLights() {
    return this.inside?.lights ?? [];
  }

  /** Fondu au noir, puis la scène redémarre sur `start`. */
  private fadeTo(start: WorldStart, ms = LOCKS.fade): void {
    this.mode = 'transition';
    this.player.stamina.flush();
    const cam = this.cameras.main;
    cam.fadeOut(ms, 20, 14, 8);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // seul le bord d'une zone garde la marche en cours (crossTo) ; après un fondu, Xéros repart à l'arrêt
      forgetHeldKeys();
      this.scene.restart(start);
    });
  }

  /**
   * Outils de test (?dieu, GameEvent.Dieu) : tout passe par GameState, donc tout est sauvegardé comme le reste. Hors du
   * mode `play` (geste, dialogue, changement de carte), la commande est refusée, sauf « Finir le travail » pendant un travail ou une passe.
   */
  private dieu(cmd: DieuCommand): void {
    if (cmd.kind === 'finish-work' && (this.mode === 'work' || this.mode === 'rail')) {
      // le travail en cours, ou la passe de doloire, se termine comme s'il avait duré son temps
      if (this.mode === 'work') this.works.finish();
      else this.rail.finishNow();
      return;
    }
    // la force et la vitesse de simulation se règlent à tout moment : pendant un travail, elles agissent au coup suivant
    if (cmd.kind === 'force') {
      this.force = cmd.multiplier;
      this.player.strength.multiplier = cmd.multiplier;
      return;
    }
    if (cmd.kind === 'sim-speed') return setSimSpeed(this.game, cmd.factor);
    if (this.mode !== 'play') return this.notice('Pas pendant un geste ou un dialogue.');
    const mapId = this.map.def.id;
    const { x, y, facing } = this.player.actor;
    switch (cmd.kind) {
      case 'give': {
        // une matière naturelle donnée a sa forme et sa taille, tirées comme à l'apparition
        const natural = naturalFor('item' in cmd.held ? items[cmd.held.item] : props[cmd.held.prop], cmd.held.natural);
        const h: Held = { ...cmd.held, ...(natural ? { natural } : {}) };
        const def = 'prop' in h ? defOf(h.prop, h.wood) : undefined;
        if (heldMass(h) > this.player.strength.carry) return this.notice(heavyNotice(def, heldMass(h), this.player.strength));
        emptyHands(game);
        take(game, h, 'item' in h ? items[h.item].hands : def!.take!.hands);
        this.handsChanged();
        break;
      }
      case 'prop':
        if (!this.handsSystem.placeInFront(this.player, cmd.prop, cmd.length)) this.notice('Pas la place ici.');
        break;
      case 'wood':
        if (!this.handsSystem.placeInFront(this.player, WOOD_PIECE, undefined, cmd.wood)) this.notice('Pas la place ici.');
        break;
      case 'pile': {
        // un tas de bois : seulement d'une pièce qui va en tas (ni coupe, ni coin, ni face entamée) ; sa masse ne compte pas
        if (cmd.wood && !pileWoodOf({ ...cmd.wood, axis: 'ew' })) {
          this.notice('Une pièce entamée ne va pas en tas : elle se pose seule.');
          break;
        }
        const n = this.handsSystem.pileInFront(this.player, cmd.wood ? { wood: cmd.wood } : { pile: cmd.pile! }, cmd.count, cmd.turned, cmd.tie);
        if (n < 0) this.notice('Pas la place ici.');
        else if (n < cmd.count) this.notice(`Place pour ${n} seulement.`);
        break;
      }
      case 'learn-plan':
        this.notice(this.site.learn(cmd.plan));
        break;
      case 'supply':
        if (this.handsSystem.supplyAround(this.player, cmd.what, cmd.count) < cmd.count) this.notice('Pas toute la place ici.');
        break;
      case 'erase-sites':
        this.site.erase();
        break;
      case 'transform': {
        const before = revisionOf();
        this.notice(this.transformer.apply(this.player, cmd.id));
        // une transformation faite (la partie a changé) prend sa durée réaliste (transforms.json)
        if (revisionOf() !== before) this.clock.work(transforms[cmd.id].minutes);
        this.handsChanged();
        break;
      }
      case 'skip-step': {
        const why = this.site.skipStep();
        if (why) this.notice(why);
        break;
      }
      case 'stamina':
        this.player.stamina.reset(cmd);
        break;
      case 'finish-work':
        this.notice('Aucun travail en cours.');
        break;
      case 'clock': {
        // la prochaine fois que l'horloge sonne cette heure (le jour même, ou le lendemain si elle est passée)
        const at = Math.max(0, Math.min(24, cmd.hour)) * 60;
        const c = game.clock;
        setClock(game, { day: c.day + (at <= c.minute ? 1 : 0), minute: at % MINUTES_PER_DAY });
        break;
      }
      case 'stamina-infinite':
        this.infinite = cmd.on;
        this.player.stamina.infinite = cmd.on;
        break;
      case 'map':
        this.fadeTo({ mapId: cmd.map, spawn: Object.keys(maps[cmd.map].spawns)[0] });
        break;
      case 'reset-map':
        resetMap(game, mapId);
        this.fadeTo({ mapId, at: { x, y, facing } });
        break;
      case 'speeds':
        // les vitesses à calibrer en jouant (systems/speeds.ts), retenues dans le navigateur
        setSpeeds({ walk: pxPerSec(cmd.walk), run: pxPerSec(cmd.run), sneak: cmd.sneak ?? SPEEDS.sneak });
        this.notice(`Vitesses : marche ${cmd.walk} m/s, course ${cmd.run} m/s, discrète ${String(SPEEDS.sneak).replace('.', ',')} de la marche.`);
        break;
      case 'speeds-default':
        setSpeeds(undefined);
        this.notice('Vitesses par défaut.');
        break;
      case 'stamina-start':
        resetStamina(game);
        this.player.stamina.reset(game.stamina);
        break;
      case 'reset-game':
        // ce que la scène garde encore (l'endurance d'une course, la bille poussée) s'écrit dans l'ancienne partie, pas dans la neuve :
        // le fondu ne le réécrira pas par-dessus
        this.player.stamina.flush();
        this.roll.flush();
        clearSave();
        replaceState(game, newGame());
        // pendant le fondu, la scène tourne encore (le souffle revient) : elle repart de l'endurance neuve, sinon elle réécrirait celle
        // de l'ancienne partie dans la nouvelle
        this.player.stamina.reset(game.stamina);
        this.fadeTo({ mapId: START.map, spawn: START.spawn });
        break;
    }
  }

  /** Ouvre le mode construction : Xéros attend, la caméra est libre (systems/build.ts). */
  private enterBuild(): void {
    this.mode = 'build';
    this.building = true;
    this.builder.enter();
    this.parcels.show(true);
  }

  /** Ferme le mode construction : on rejoue, la caméra reprend Xéros. */
  private exitBuild(): void {
    this.mode = 'play';
    this.building = false;
    this.builder.exit();
    this.parcels.show(false);
    this.interaction.lock(LOCKS.lock);
  }

  /**
   * Une commande du catalogue du mode construction (GameEvent.Build) : `toggle` entre ou sort ; une autre ouvre le mode s'il ne
   * l'est pas (on choisit une pièce, on la pose), sauf pendant un geste, un dialogue ou un changement de carte.
   */
  private buildCommand(cmd: BuildCommand): void {
    if (!CONSTRUIRE) return;
    if (this.mode !== 'play' && this.mode !== 'build') return this.notice('Pas pendant un geste ou un dialogue.');
    if (cmd.kind === 'toggle') return this.mode === 'build' ? this.exitBuild() : this.enterBuild();
    if (this.mode !== 'build') this.enterBuild();
    this.builder.command(cmd);
  }

  private openDialogue(id: string): void {
    this.mode = 'dialogue';
    this.scene.launch('dialogue', { id });
  }

  /** « Dormir ? » -> Oui : fondu au noir, l'horloge au lever, ce que rend la nuit (`sleep` de GameState), réveil dans le cagibi (la partie s'écrit à l'arrivée). */
  private sleepNow(): void {
    this.talking = undefined;
    this.player.stamina.flush();
    sleep(game);
    this.fadeTo({ mapId: START.map, spawn: START.spawn, wake: true }, 1400);
  }

  private onDialogueEnd(action?: DialogueAction): void {
    this.mode = 'play';
    if (action === 'sleep') return this.sleepNow();
    if (action === 'help') return this.helpNow();
    this.talking?.resume();
    this.talking = undefined;
    this.interaction.lock(LOCKS.lock);
    this.useLockedUntil = this.time.now + LOCKS.lock;
  }
}
