import type Phaser from 'phaser';
import { DEPTH, HARVEST, HEW_PASS, SPLIT, WOOD_AIM } from '../config';
import { gestures, wood as W, work } from '../content';
import { woodWorkOf } from '../world/tools';
import { CM_PER_PX } from '../content/gabarit';
import type { End, Facing, WoodPiece } from '../content/types';
import type { Player } from '../entities/Player';
import { changeObject, changeSpawned, game, setWood, spawnObject } from '../state';
import { footprint, stateOf, type Box, type GameMap, type PlacedProp } from '../world/GameMap';
import { capitalName, hewnFaces, WOOD_PIECE } from '../world/woodPiece';
import { cmAt, cutPixel, lengthPx, lookOf, metresLabel, sizeOf, splitHits, splitPieces, woodBody, woodSize } from '../world/woodShape';
import { woodTexture } from '../world/woodTexture';
import type { HarvestSystem } from './harvest';
import type { RailEnd, RailPass } from './rail';

/** Ce qu'un outil fait à une pièce de bois : la couper (cognée), l'équarrir (doloire), planter le coin, frapper le coin (masse). */
export type WoodWork = 'cut' | 'hew' | 'plant' | 'maul';


/**
 * Ce que l'outil en main ferait à la pièce de bois devant Xéros : `at`, pour une coupe, sa place en cm depuis le bout de départ
 * (ouest, nord), pour une passe de doloire, l'endroit où elle commence ; `end`, pour le coin et la masse, le bout où se tient
 * Xéros ; `from`, pour une passe, le bout d'où part la face (elle va vers l'autre) ; (x, y) : où l'invite se pose. `refusal` :
 * pourquoi ce n'est pas possible (dit sans geste ni dépense).
 */
export interface WoodAim {
  prop: PlacedProp;
  piece: WoodPiece;
  work: WoodWork;
  at: number;
  end?: End;
  from?: 'start' | 'end';
  x: number;
  y: number;
  refusal?: string;
}

/**
 * Ce qu'a donné un coup : la pièce coupée en deux (`split`, les deux longueurs), une face finie (`face`), la poutre (`beam`), le
 * coin planté (`planted` : la main qui le tenait est libre), la pièce fendue en deux (`halves` : le nom de ses morceaux).
 */
export interface WoodHit {
  split?: [number, number];
  face?: number;
  beam?: { length: number };
  planted?: boolean;
  halves?: string;
}

/** Le bout d'où frappe celui qui regarde dans cette direction (vers la droite : il est à l'ouest). */
const END_OF_FACING: Record<Facing, End> = { right: 'west', left: 'east', down: 'north', up: 'south' };

/**
 * La pièce de bois à l'outil (wood.json), sans code par diamètre :
 * - couper à la cognée : contre le flanc, le point où tombe le fer (`strike` du geste `chop`) dit où se fait la coupe, aimantée
 *   tous les `grid` cm depuis le bout le plus proche de Xéros ; aucun morceau de moins de `min` cm (« Le bout serait trop court. ») ;
 *   la ligne au-dessus de la coupe visée donne les deux longueurs (« 3 m | 2,6 m ») ; `cut.hits` coups, et deux pièces ;
 * - équarrir à la doloire : une passe par face (le dessus, le sud, le nord, le dessous), sur le rail (systems/rail.ts) : Xéros
 *   part d'un bout de la pièce, contre son flanc, et la longe tout seul en frappant en rythme ; la face se dresse derrière lui
 *   (`dressed` : sa longueur, notée à chaque coup) ; Échap l'arrête, une nouvelle passe reprend là ; au bout, la face est finie et
 *   la pièce retournée d'un quart de tour ; la poutre à 4 faces ;
 * - fendre : le coin se plante d'un coup, sans geste, dans le bois de bout où se tient Xéros (une pièce qui se fend : `split` de son
 *   diamètre) ; la masse frappe depuis ce même bout, `split.hits` coups par mètre commencé (la fente court sur la longueur, le coin
 *   s'enfonce), et la pièce devient deux
 *   morceaux (`split` : demi-billes, puis quartiers), le coin retombe au sol.
 * Chaque coup est noté dans GameState (les réglages de la pièce). Ne lit pas le clavier.
 */
export class WoodSystem {
  /** Invite « Espace » sur la coupe visée, et la ligne des deux longueurs au-dessus. */
  private readonly prompt: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Container;
  /** Texte de la ligne affichée (pour ne la refaire que quand elle change). */
  private shown = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    private readonly harvest: HarvestSystem,
  ) {
    this.prompt = scene.add.image(0, 0, 'ui-key-space').setOrigin(0.5, 1).setDepth(DEPTH.prompt).setVisible(false);
    this.label = scene.add.container(0, 0).setDepth(DEPTH.prompt).setVisible(false);
  }

  /** Ce que fait cet outil à une pièce de bois, s'il y fait quelque chose. */
  static workOf(tool: string | undefined): WoodWork | undefined {
    // ce que l'outil déclare faire au bois (`does` d'items.json), jamais son nom
    return woodWorkOf(tool);
  }

  /** Le geste d'un travail : de haut en bas pour la cognée et la doloire, le coup de masse ; le coin se plante sans geste. */
  static gestureOf(aim: WoodAim): string | undefined {
    return aim.work === 'maul' ? 'maul' : aim.work === 'plant' ? undefined : 'chop';
  }

  /**
   * La pièce que l'outil `tool` travaillerait, et ce qu'il y ferait : contre son flanc (couper, équarrir) ou à un de ses bouts
   * (le coin, la masse ; contre le flanc, ils sont refusés : ils se donnent dans le bout). Quand plusieurs pièces se touchent (les
   * deux demi-billes côte à côte), celle où le travail est possible l'emporte ; sinon le refus de la pièce coin planté pour la masse,
   * ou de la première. Rien si Xéros n'est collé à aucune pièce.
   */
  target(player: Player, tool: string | undefined): WoodAim | undefined {
    const work = WoodSystem.workOf(tool);
    if (!work) return undefined;
    let refused: WoodAim | undefined;
    for (const p of this.map.props) {
      // une pièce dressée (un poteau de chantier) porte le bâtiment : ni coupe, ni doloire, ni coin
      if (!p.wood || p.wood.axis === 'up' || !p.box || !p.image.visible) continue;
      const aim = this.aimAt(player, p, work);
      if (aim && !aim.refusal) return aim;
      // la masse : le refus de la pièce où le coin est planté (« Pas la place pour la fendre. ») passe avant celui d'une voisine
      if (aim && (!refused || (work === 'maul' && p.wood.wedge))) refused = aim;
    }
    return refused;
  }

  /** Ce que le travail `work` ferait à la pièce `p`, si Xéros y est collé. */
  private aimAt(player: Player, p: PlacedProp, work: WoodWork): WoodAim | undefined {
    if (work === 'plant' || work === 'maul') {
      const end = this.endOf(player, p);
      if (end) return work === 'plant' ? this.plantAim(p, end) : this.maulAim(p, end);
    }
    const along = this.flank(player, p);
    if (along === undefined) return undefined;
    if (work === 'cut') return this.cutAim(p, along);
    if (work === 'hew') return this.hewAim(player, p, along);
    const why = work === 'plant' ? 'Le coin se plante dans le bout, là où on voit les cernes.' : 'Les coups se donnent sur le bout, là où le coin est planté.';
    return { ...this.flankAim(p, along), work, refusal: why };
  }

  /**
   * Contre le flanc de la pièce, tourné vers elle : au nord ou au sud d'une pièce est-ouest (la colonne de l'image où tombe le fer),
   * à l'ouest ou à l'est d'une pièce nord-sud (la rangée de ses pieds). Undefined sinon.
   */
  private flank(player: Player, p: PlacedProp): number | undefined {
    const { actor } = player;
    const b = actor.body;
    const box = p.box!;
    const f = actor.facing;
    const strike = this.strikeX(player);
    const { w, h } = this.sizeOf(p);
    if (p.wood!.axis === 'ew') {
      const above = f === 'down' && Math.abs(box.top - b.bottom) <= WOOD_AIM.gap;
      const below = f === 'up' && Math.abs(b.top - box.bottom) <= WOOD_AIM.gap;
      const along = actor.x + strike - p.x;
      return (above || below) && along >= 0 && along <= w - 1 ? along : undefined;
    }
    const west = f === 'right' && Math.abs(box.left - b.right) <= WOOD_AIM.gap;
    const east = f === 'left' && Math.abs(b.left - box.right) <= WOOD_AIM.gap;
    return (west || east) && b.center.y >= box.top && b.center.y <= box.bottom ? b.center.y - (p.y - h) : undefined;
  }

  /** Où tombe le fer du geste `chop` en x, par rapport aux pieds de Xéros (`strike` de gestures.json, retourné vers la gauche). */
  private strikeX(player: Player): number {
    const f = player.actor.facing;
    const gesture = gestures.chop;
    const dir = f === 'left' ? 'right' : (f as 'down' | 'up' | 'right');
    return (gesture.strike?.[dir] ?? gesture.poses[dir][gesture.impact].dx) * (f === 'left' ? -1 : 1);
  }

  /**
   * Le bout de la pièce où se tient Xéros, tourné vers sa face coupée : à l'ouest ou à l'est d'une pièce est-ouest, au nord ou au
   * sud d'une pièce nord-sud, collé à elle, à hauteur de sa collision.
   */
  private endOf(player: Player, p: PlacedProp): End | undefined {
    const box = p.box!;
    const b = player.actor.body;
    const end = END_OF_FACING[player.actor.facing];
    if (p.wood!.axis === 'ew') {
      if (!(b.bottom > box.top && b.top < box.bottom)) return undefined;
      if (end === 'west' && Math.abs(box.left - b.right) <= WOOD_AIM.end) return 'west';
      if (end === 'east' && Math.abs(b.left - box.right) <= WOOD_AIM.end) return 'east';
      return undefined;
    }
    if (!(b.right > box.left && b.left < box.right)) return undefined;
    if (end === 'north' && Math.abs(box.top - b.bottom) <= WOOD_AIM.end) return 'north';
    if (end === 'south' && Math.abs(b.top - box.bottom) <= WOOD_AIM.end) return 'south';
    return undefined;
  }

  private sizeOf(p: PlacedProp): { w: number; h: number } {
    const w = p.wood!;
    return woodSize(w.size, lookOf(w), w.axis, w.length);
  }

  /** L'invite d'un coup sur le flanc, à `along` px de l'image : sur le haut de la pièce. */
  private flankAim(p: PlacedProp, along: number): Omit<WoodAim, 'work'> {
    const piece = p.wood!;
    const top = p.y - this.sizeOf(p).h;
    const [x, y] = piece.axis === 'ew' ? [p.x + Math.round(along), top + 1] : [p.x + 4, top + Math.round(along)];
    return { prop: p, piece, at: Math.round(cmAt(piece.size, lookOf(piece), piece.axis, along)), x, y };
  }

  /**
   * La coupe visée à `along` px de l'image : aimantée tous les `grid` cm depuis le bout le plus proche, ou l'encoche déjà
   * commencée ; refusée si un morceau ferait moins de `min` cm, sur ce qui n'est plus rond, ou sur un coin planté.
   */
  private cutAim(p: PlacedProp, along: number): WoodAim {
    const piece = p.wood!;
    const look = lookOf(piece);
    const len = piece.length;
    const cm = cmAt(piece.size, look, piece.axis, along);
    const fromStart = cm <= len / 2;
    const near = Math.round((fromStart ? cm : len - cm) / W.grid) * W.grid;
    let at = fromStart ? near : len - near;
    let refusal: string | undefined;
    if (piece.shape !== 'round') refusal = 'On coupe avant de fendre.';
    else if (piece.hewn || piece.dressed) refusal = "On coupe avant d'équarrir.";
    else if (piece.wedge) refusal = 'Le coin est planté : finis de la fendre.';
    else if (len < 2 * W.min) refusal = 'Trop court pour être recoupé.';
    else if (piece.notch) {
      // une seule coupe à la fois : le fer retombe dans l'encoche commencée, si on en est près
      if (Math.abs(at - piece.notch.at) <= 3 * W.grid) at = piece.notch.at;
      else refusal = "Finis d'abord l'entaille commencée.";
    } else if (at < W.min || len - at < W.min) refusal = 'Le bout serait trop court.';
    const px = cutPixel(piece.size, look, piece.axis, Math.min(len, Math.max(0, at)));
    const top = p.y - this.sizeOf(p).h;
    const [x, y] = piece.axis === 'ew' ? [p.x + px, top + 1] : [p.x + 4, top + px];
    return { prop: p, piece, work: 'cut', at, x, y, refusal };
  }

  /**
   * La passe de doloire visée : sur une pièce ronde d'un diamètre qui fait des poutres, sans coupe en cours, pas encore poutre ;
   * Xéros contre son flanc, à `HEW_PASS.reach` px au plus d'un bout (la face part de là vers l'autre) ou, si la face en cours
   * s'est arrêtée (`dressed`), de là où elle s'est arrêtée (elle reprend là, dans le même sens) ; et la place de longer la pièce
   * jusqu'au bout. L'invite se pose là où la passe commence.
   */
  private hewAim(player: Player, p: PlacedProp, along: number): WoodAim {
    const piece = p.wood!;
    const flank = { ...this.flankAim(p, along), work: 'hew' as const };
    const size = sizeOf(piece.size);
    if (size.hew) return { ...flank, refusal: size.hew };
    if (piece.shape !== 'round') return { ...flank, refusal: "On n'équarrit qu'une pièce ronde." };
    if (piece.notch) return { ...flank, refusal: "Finis d'abord la coupe." };
    if (hewnFaces(piece).beam) return { ...flank, refusal: 'Elle est déjà équarrie.' };
    const px = (cm: number) => cutPixel(piece.size, lookOf(piece), piece.axis, cm);
    const near = (cm: number) => Math.abs(along - px(cm)) <= HEW_PASS.reach;
    const d = piece.dressed;
    let start: { from: 'start' | 'end'; at: number };
    if (d) {
      start = { from: d.from, at: d.from === 'start' ? d.length : piece.length - d.length };
      if (!near(start.at)) return { ...flank, refusal: "Reprends la face là où tu l'as laissée." };
    } else if (near(0)) start = { from: 'start', at: 0 };
    else if (near(piece.length)) start = { from: 'end', at: piece.length };
    else return { ...flank, refusal: 'Mets-toi à un bout de la pièce pour commencer la face.' };
    const { x, y } = this.flankAim(p, px(start.at));
    const aim: WoodAim = { ...flank, ...start, x, y };
    return this.railFree(player, p, aim) ? aim : { ...aim, refusal: 'Pas la place de longer la pièce.' };
  }

  /**
   * Le rail d'une passe de doloire : les pieds de Xéros au début de la passe (le fer, `strike` du geste `chop`, sur la colonne ou la
   * rangée de son début) et à l'autre bout ; `startPx` et `sign` : où est le fer après `done` px (`startPx + sign × done`).
   */
  private railOf(player: Player, p: PlacedProp, aim: WoodAim): { from: { x: number; y: number }; to: { x: number; y: number }; startPx: number; sign: 1 | -1 } {
    const piece = p.wood!;
    const { actor } = player;
    const px = (cm: number) => cutPixel(piece.size, lookOf(piece), piece.axis, cm);
    const startPx = px(aim.at);
    const endPx = px(aim.from === 'start' ? piece.length : 0);
    const feet = (at: number) => {
      if (piece.axis === 'ew') return { x: p.x + at - this.strikeX(player), y: actor.y };
      const top = p.y - this.sizeOf(p).h;
      return { x: actor.x, y: actor.y + (top + at - actor.body.center.y) };
    };
    return { from: feet(startPx), to: feet(endPx), startPx, sign: endPx >= startPx ? 1 : -1 };
  }

  /** Xéros a la place de longer la pièce d'un bout de la passe à l'autre (sa collision balayée ; la pièce elle-même ne compte pas). */
  private railFree(player: Player, p: PlacedProp, aim: WoodAim): boolean {
    const { from, to } = this.railOf(player, p, aim);
    const { actor } = player;
    const b = actor.body;
    const own = p.parts.filter((q): q is Phaser.GameObjects.Zone => q.type === 'Zone');
    const box: Box = {
      left: Math.min(from.x, to.x) + (b.left - actor.x),
      right: Math.max(from.x, to.x) + (b.right - actor.x),
      top: Math.min(from.y, to.y) + (b.top - actor.y),
      bottom: Math.max(from.y, to.y) + (b.bottom - actor.y),
    };
    return this.map.areaFree(box, [], own);
  }

  /** La pièce de bois `id` de la carte (née pendant la partie ou de la carte), telle qu'elle est à l'écran maintenant. */
  private find(id: number, spawned: boolean | undefined): PlacedProp | undefined {
    return this.map.props.find((q) => q.id === id && !!q.spawned === !!spawned && !!q.wood);
  }

  /**
   * La passe de doloire de `aim` (une visée `hewAim` sans refus), à lancer sur le rail : Xéros longe la pièce du début de la passe vers
   * l'autre bout, au coup (docs/CONCEPTION.md, « Le travail ») : chaque coup avance la face de `stroke.cm` (ce qu'il lève, rapporté à la
   * section de la face), se paie par `pay` (refusé : la passe s'arrête ; `wait` : Xéros souffle), et la face en cours s'allonge jusqu'au
   * fer (notée dans GameState), des copeaux tombent. Au bout, la face est finie, et, si ce n'est pas la poutre, la pièce est retournée
   * d'un quart de tour. `settle` (?dieu) reçoit ce qui reste à dresser (cm) quand la passe est finie d'un coup ; `end` reçoit ce qu'a
   * donné la passe (la face, la poutre, ou rien : arrêtée) et pourquoi elle s'est terminée.
   */
  hewPass(
    player: Player,
    aim: WoodAim,
    stroke: { cm: number; durations?: number[]; tool?: string },
    pay: () => boolean | 'wait',
    settle: (cm: number) => void,
    end: (hit: WoodHit, why: RailEnd) => void,
  ): RailPass {
    const { id, spawned } = aim.prop;
    const piece = aim.piece;
    const from = aim.from!;
    const len = piece.length;
    const look = lookOf(piece);
    const rail = this.railOf(player, aim.prop, aim);
    const facing = player.actor.facing;
    const fer = (done: number) => rail.startPx + rail.sign * done;
    // la longueur dressée quand le fer est à `done` px du début de la passe
    const dressedAt = (done: number) => {
      const cm = Math.min(len, Math.max(0, cmAt(piece.size, look, piece.axis, fer(done))));
      return Math.round(from === 'start' ? cm : len - cm);
    };
    const start = from === 'start' ? aim.at : len - aim.at;
    return {
      from: rail.from,
      to: rail.to,
      gesture: work.strokes.hew.gesture,
      tool: stroke.tool ?? W.hew.tool,
      durations: stroke.durations,
      // le fer avance de ce que lève un coup (une fraction de pixel : la face monte lentement, comme en vrai)
      advance: stroke.cm / CM_PER_PX,
      onStroke: (done) => {
        const p = this.find(id, spawned);
        if (!p) return false;
        const r = pay();
        if (r !== true) return r;
        const cm = dressedAt(done);
        const top = p.y - this.sizeOf(p).h;
        const [x, y] = piece.axis === 'ew' ? [p.x + Math.round(fer(done)), top + 1] : [p.x + 4, top + Math.round(fer(done))];
        this.harvest.chipsAt(x, y + 3, p.y + 1, 'wood', facing);
        if (cm > 0 && cm < len && cm > (p.wood!.dressed?.length ?? 0)) this.update(p, { ...p.wood!, dressed: { from, length: cm } });
        return true;
      },
      settle: (left) => settle((len - start) * (rail.from === rail.to ? 1 : left / Math.max(1e-6, Math.hypot(rail.to.x - rail.from.x, rail.to.y - rail.from.y)))),
      onEnd: (why) => {
        const p = this.find(id, spawned);
        if (!p || why !== 'end') return end({}, why);
        if (hewnFaces(p.wood!).faces + 1 >= W.hew.faces) return end(this.finishFace(p), why);
        this.turnOver(p, (q) => end(this.finishFace(q), why));
      },
    };
  }

  /** La face en cours est finie : elle passe dans `hewn` (une face de plus, `perFace` au compte) ; la poutre à la quatrième. */
  private finishFace(p: PlacedProp): WoodHit {
    const { dressed: _d, ...rest } = p.wood!;
    const faces = hewnFaces(p.wood!).faces + 1;
    const piece: WoodPiece = { ...rest, hewn: faces * W.hew.perFace };
    this.update(p, piece);
    return faces >= W.hew.faces ? { beam: { length: piece.length } } : { face: faces };
  }

  /**
   * Le quart de tour entre deux faces : la pièce se soulève de `HEW_PASS.hop` px, et, en haut, `turn` la change (sa face suivante
   * tournée vers le haut : la pièce redessinée) ; elle retombe en s'écrasant un peu.
   */
  private turnOver(p: PlacedProp, turn: (p: PlacedProp) => void): void {
    const { id, spawned } = p;
    const ms = HEW_PASS.turnMs;
    this.scene.tweens.add({
      targets: p.image,
      y: p.y - HEW_PASS.hop,
      duration: ms * 0.4,
      ease: 'Quad.easeOut',
      onComplete: () => {
        const q = this.find(id, spawned);
        if (!q) return;
        turn(q);
        const next = this.find(id, spawned);
        if (!next) return;
        const img = next.image;
        img.y = next.y - HEW_PASS.hop;
        this.scene.tweens.add({
          targets: img,
          y: next.y,
          duration: ms * 0.35,
          ease: 'Quad.easeIn',
          onComplete: () => {
            img.setScale(1, 0.85);
            this.scene.tweens.add({ targets: img, scaleY: 1, duration: ms * 0.25, ease: 'Back.easeOut' });
          },
        });
      },
    });
  }

  /** L'invite au bout `end` de la pièce : sur le haut du bout. */
  private endAim(p: PlacedProp, end: End): { x: number; y: number } {
    const { w, h } = this.sizeOf(p);
    const top = p.y - h;
    if (end === 'west') return { x: p.x + 2, y: top + 1 };
    if (end === 'east') return { x: p.x + w - 3, y: top + 1 };
    if (end === 'north') return { x: p.x + Math.floor(w / 2), y: top + 1 };
    return { x: p.x + Math.floor(w / 2), y: p.y - 6 };
  }

  /** Planter le coin au bout `end` : une pièce qui se fend, sans coupe en cours, sans coin déjà planté, de toute longueur. */
  private plantAim(p: PlacedProp, end: End): WoodAim {
    const piece = p.wood!;
    const size = sizeOf(piece.size);
    let refusal: string | undefined;
    if (!Object.keys(size.split).length) refusal = "Ce bois ne se fend pas : il se coupe et s'équarrit.";
    else if (!size.split[piece.shape as 'round' | 'half'] || piece.hewn || piece.dressed) refusal = 'Trop mince pour le coin.';
    else if (piece.notch) refusal = "Finis d'abord la coupe.";
    else if (piece.wedge) refusal = 'Le coin est déjà planté.';
    return { prop: p, piece, work: 'plant', at: 0, end, ...this.endAim(p, end), refusal };
  }

  /** Frapper le coin depuis le bout `end` : celui où il est planté ; au dernier coup, il faut la place des deux morceaux. */
  private maulAim(p: PlacedProp, end: End): WoodAim {
    const piece = p.wood!;
    let refusal: string | undefined;
    if (!piece.wedge) refusal = "Il faut d'abord un coin.";
    else if (piece.wedge.end !== end) refusal = 'Les coups se donnent sur le bout, là où le coin est planté.';
    else if (piece.wedge.hits >= splitHits(piece) - 1 && !this.splitFree(p)) refusal = 'Pas la place pour la fendre.';
    return { prop: p, piece, work: 'maul', at: 0, end, ...this.endAim(p, end), refusal };
  }


  /**
   * À appeler à chaque image : l'invite « Espace » sur la coupe visée, et au-dessus les deux longueurs qu'elle donnerait (dans
   * l'ordre de l'écran : ouest | est, nord | sud) ; ailleurs, l'invite seule. `active` = false pendant un geste, un dialogue ou un
   * changement de carte.
   */
  updatePrompt(time: number, player: Player, tool: string | undefined, active: boolean): void {
    const aim = active ? this.target(player, tool) : undefined;
    const ok = !!aim && !aim.refusal;
    this.prompt.setVisible(ok);
    this.label.setVisible(ok && aim.work === 'cut');
    if (!ok) return;
    const bob = Math.round((Math.sin(time / 220) + 1) / 2) * 2;
    this.prompt.setPosition(aim.x, aim.y + 3 - bob);
    if (aim.work !== 'cut') return;
    const text = `${metresLabel(aim.at)} | ${metresLabel(aim.piece.length - aim.at)}`;
    if (text !== this.shown) this.drawLabel(text);
    this.label.setPosition(Math.round(aim.x), Math.round(aim.y - this.prompt.height - 3));
  }

  /** La ligne affichée au-dessus de la coupe visée (« 3 m | 2,6 m »), pour les tests. */
  get labelText(): string | undefined {
    return this.label.visible ? this.shown : undefined;
  }

  /** La ligne « 3 m | 2,6 m » en petits signes (`ui-digit-<signe>`), centrée sur la coupe ; la barre est un trait d'un pixel. */
  private drawLabel(text: string): void {
    this.shown = text;
    this.label.removeAll(true);
    const glyphs = (s: string) =>
      s
        .replace(' ', '')
        .split('')
        .map((c) => (c === ',' ? 'comma' : c));
    const parts: (Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle)[] = [];
    let x = 0;
    const word = (s: string) => {
      for (const g of glyphs(s)) {
        const img = this.scene.add.image(x, 0, `ui-digit-${g}`).setOrigin(0, 1);
        parts.push(img);
        x += img.width + (g === 'm' ? 0 : 1);
      }
    };
    const [a, b] = text.split(' | ');
    word(a);
    x += 2;
    const height = this.scene.textures.getFrame('ui-digit-0').height;
    parts.push(this.scene.add.rectangle(x, 1, 1, height + 2, 0x2a1a10).setOrigin(0, 1));
    x += 3;
    word(b);
    for (const q of parts) q.x -= Math.round(x / 2);
    this.label.add(parts);
  }

  /**
   * Un coup porté avec `tool` (la cible est cherchée à nouveau : celle qui est devant Xéros à cet instant) : la cognée, le coin, la
   * masse (la doloire passe par `hewPass`). Undefined : rien à frapper (on a bougé, la pièce a disparu, ce n'est plus possible).
   */
  hit(player: Player, tool: string, facing: Facing): WoodHit | undefined {
    const aim = this.target(player, tool);
    if (!aim || aim.refusal || aim.work === 'hew') return undefined;
    if (aim.work !== 'plant') this.harvest.chipsAt(aim.x, aim.y + 3, aim.prop.y + 1, 'wood', facing);
    if (aim.work === 'cut') return this.cutHit(aim.prop, aim.at);
    if (aim.work === 'plant') return this.plant(aim.prop, aim.end!);
    return this.maulHit(aim.prop);
  }

  /** La pièce a de nouveaux réglages : notés dans GameState, et redessinée à sa place. */
  private update(p: PlacedProp, piece: WoodPiece): void {
    setWood(game, this.map.def.id, p.id, p.spawned, piece);
    const { id, type, x, y, spawned } = p;
    this.map.removeProp(p);
    this.map.placeProp({ id, type, x, y }, { spawned, wood: piece });
  }

  private cutHit(p: PlacedProp, at: number): WoodHit {
    const piece = p.wood!;
    const notch = piece.notch ? { at: piece.notch.at, hits: piece.notch.hits + 1 } : { at, hits: 1 };
    if (notch.hits < W.cut.hits) {
      this.update(p, { ...piece, notch });
      return {};
    }
    return { split: this.cutApart(p, notch.at) };
  }

  /**
   * La pièce coupée à `at` cm : deux pièces, la première (ouest, nord) garde son identifiant, la seconde naît. Est-ouest, la seconde
   * commence à la colonne de la coupe ; nord-sud, la seconde garde le bas de l'image (la face sud), la première se pose juste au
   * nord de sa collision. Renvoie les deux longueurs.
   */
  private cutApart(p: PlacedProp, at: number): [number, number] {
    const { notch: _n, ...rest } = p.wood!;
    const first: WoodPiece = { ...rest, length: at };
    const second: WoodPiece = { ...rest, length: rest.length - at };
    const { x, y } = p;
    const [a, b] =
      rest.axis === 'ew'
        ? [{ x, y }, { x: x + lengthPx(at), y }]
        : [{ x, y: y - woodBody(rest.size, lookOf(second), 'ns', second.length).h }, { x, y }];
    this.replace(p, first, a);
    this.born(second, b);
    return [first.length, second.length];
  }

  /** La pièce `p` devient `piece` en (x, y), sous son identifiant : à l'écran et dans GameState. */
  private replace(p: PlacedProp, piece: WoodPiece, at: { x: number; y: number }): PlacedProp {
    this.map.removeProp(p);
    const next = this.map.placeProp({ id: p.id, type: WOOD_PIECE, ...at }, { spawned: p.spawned, wood: piece });
    if (p.spawned) changeSpawned(game, this.map.def.id, p.id, stateOf(next));
    else changeObject(game, this.map.def.id, p.id, stateOf(next));
    return next;
  }

  /** Une pièce naît en (x, y). */
  private born(piece: WoodPiece, at: { x: number; y: number }): PlacedProp {
    const o = spawnObject(game, this.map.def.id, WOOD_PIECE, at.x, at.y, { wood: piece });
    return this.map.placeProp(o, { spawned: true, wood: piece });
  }

  /** Le coin se plante dans le bout `end` : il y reste, la main qui le tenait est libre. */
  private plant(p: PlacedProp, end: End): WoodHit {
    this.update(p, { ...p.wood!, wedge: { end, hits: 0 } });
    return { planted: true };
  }

  /** Où naîtraient les deux morceaux d'une pièce qui se fend, décalés ensemble de `slide` px en travers (`splitPieces`). */
  private placed(p: PlacedProp, slide: number): { piece: WoodPiece; x: number; y: number }[] {
    const [sx, sy] = p.wood!.axis === 'ns' ? [slide, 0] : [0, slide];
    return splitPieces(p.wood!).map(({ piece, dx, dy }) => ({ piece, x: p.x + dx + sx, y: p.y + dy + sy }));
  }

  /**
   * Où naissent les deux morceaux : à leur place, sinon écartés ensemble en travers, de plus en plus loin, de part et d'autre
   * (`SPLIT.slide`), là où ils tiennent (carte, cases bloquantes, objets ; la collision de la pièce fendue ne compte pas). Rien :
   * pas la place.
   */
  private halves(p: PlacedProp): { piece: WoodPiece; x: number; y: number }[] | undefined {
    const own = p.parts.filter((q): q is Phaser.GameObjects.Zone => q.type === 'Zone');
    const fits = (parts: { piece: WoodPiece; x: number; y: number }[]) => parts.every(({ piece, x, y }) => {
      const look = lookOf(piece);
      const { w, h } = woodSize(piece.size, look, piece.axis, piece.length);
      const f = footprint({ ...p.def, body: woodBody(piece.size, look, piece.axis, piece.length), bodies: undefined }, w, h, false)!;
      const box: Box = { left: x + f.left, right: x + f.right, top: y - h + f.top, bottom: y - h + f.bottom };
      return this.map.areaFree(box, [], own);
    });
    for (let d = 0; d <= SPLIT.slide; d++) {
      for (const s of d === 0 ? [0] : [-d, d]) {
        const parts = this.placed(p, s);
        if (fits(parts)) return parts;
      }
    }
    return undefined;
  }

  /** Les deux morceaux tiendraient quelque part (`halves`). */
  private splitFree(p: PlacedProp): boolean {
    return this.halves(p) !== undefined;
  }

  /**
   * Un coup de masse sur le coin : la fente court sur la longueur (notée dans GameState). Au dernier, le bois grand ouvert se voit un
   * instant, puis les deux morceaux paraissent à leur place et le coin tombe au sol à côté.
   */
  private maulHit(p: PlacedProp): WoodHit {
    const piece = p.wood!;
    const hits = piece.wedge!.hits + 1;
    if (hits < splitHits(piece)) {
      this.update(p, { ...piece, wedge: { ...piece.wedge!, hits } });
      return {};
    }
    const [first, second] = this.halves(p) ?? this.placed(p, 0);
    const open = this.scene.add.image(p.x, p.y, woodTexture(this.scene, piece, { open: true }), '0').setOrigin(0, 1).setDepth(p.y);
    const [cx, cy] = [p.x + Math.floor(open.width / 2), p.y - 4];
    const a = this.replace(p, first.piece, first);
    const b = this.born(second.piece, second);
    for (const q of [a, b]) q.image.setVisible(false);
    // le coin tombe au sol près de la pièce : noté tout de suite, montré quand le bois s'ouvre
    const { dropped } = this.harvest.dropAll([{ item: W.split.wedge, min: 1, max: 1, give: false }], cx, cy);
    this.scene.time.delayedCall(HARVEST.splitMs, () => {
      for (const q of [a, b]) if (this.map.props.includes(q)) q.image.setVisible(true);
      open.destroy();
      for (const g of dropped) this.harvest.pop(g, cx, cy);
    });
    return { halves: capitalName(first.piece) };
  }
}
