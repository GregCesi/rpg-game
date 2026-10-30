import type Phaser from 'phaser';
import { DEPTH, HARVEST, WOOD_AIM } from '../config';
import { gestures, wood as W } from '../content';
import type { End, Facing, WoodPiece } from '../content/types';
import type { Player } from '../entities/Player';
import { changeObject, changeSpawned, game, setWood, spawnObject } from '../state';
import { footprint, stateOf, type Box, type GameMap, type PlacedProp } from '../world/GameMap';
import { capitalName, hewnFaces, WOOD_PIECE } from '../world/woodPiece';
import { cmAt, cutPixel, lengthPx, lookOf, metresLabel, sizeOf, splitHits, splitPieces, woodBody, woodSize } from '../world/woodShape';
import { woodTexture } from '../world/woodTexture';
import type { HarvestSystem } from './harvest';

/** Ce qu'un outil fait à une pièce de bois : la couper (cognée), l'équarrir (doloire), planter le coin, frapper le coin (masse). */
export type WoodWork = 'cut' | 'hew' | 'plant' | 'maul';

/**
 * Ce que l'outil en main ferait à la pièce de bois devant Xéros : `at`, pour une coupe, sa place en cm depuis le bout de départ
 * (ouest, nord) ; `end`, pour le coin et la masse, le bout où se tient Xéros ; (x, y) : où l'invite se pose. `refusal` : pourquoi
 * ce n'est pas possible (dit sans geste ni dépense).
 */
export interface WoodAim {
  prop: PlacedProp;
  piece: WoodPiece;
  work: WoodWork;
  at: number;
  end?: End;
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
 * - équarrir à la doloire : contre le flanc d'une pièce ronde ; une face tous les `perFace` coups, la poutre à 4 faces ;
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
    if (tool === W.cut.tool) return 'cut';
    if (tool === W.hew.tool) return 'hew';
    if (tool === W.split.wedge) return 'plant';
    if (tool === W.split.maul) return 'maul';
    return undefined;
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
      if (!p.wood || !p.box || !p.image.visible) continue;
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
    if (work === 'hew') return this.hewAim(p, along);
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
    const gesture = gestures.chop;
    const dir = f === 'left' ? 'right' : (f as 'down' | 'up' | 'right');
    const strike = (gesture.strike?.[dir] ?? gesture.poses[dir][gesture.impact].dx) * (f === 'left' ? -1 : 1);
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
    else if (piece.hewn) refusal = "On coupe avant d'équarrir.";
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

  /** Le coup de doloire visé : seulement sur une pièce ronde d'un diamètre qui fait des poutres, sans coupe en cours. */
  private hewAim(p: PlacedProp, along: number): WoodAim {
    const piece = p.wood!;
    let refusal: string | undefined;
    const size = sizeOf(piece.size);
    if (size.hew) refusal = size.hew;
    else if (piece.shape !== 'round') refusal = "On n'équarrit qu'une pièce ronde.";
    else if (piece.notch) refusal = "Finis d'abord la coupe.";
    else if (hewnFaces(piece).beam) refusal = 'Elle est déjà équarrie.';
    return { ...this.flankAim(p, along), work: 'hew', refusal };
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
    else if (!size.split[piece.shape as 'round' | 'half'] || piece.hewn) refusal = 'Trop mince pour le coin.';
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

  /** Prix du coup en endurance : la cognée, la doloire selon la longueur de la pièce, planter le coin, le coup de masse. */
  cost(player: Player, aim: WoodAim): number {
    const c = player.stamina.costs;
    if (aim.work === 'cut') return c.chop;
    if (aim.work === 'hew') return (c.hewPerM * aim.piece.length) / 100;
    return aim.work === 'plant' ? c.plant : c.maul;
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
   * Un coup porté avec `tool` (la cible est cherchée à nouveau : celle qui est devant Xéros à cet instant). Undefined : rien à
   * frapper (on a bougé, la pièce a disparu, ce n'est plus possible).
   */
  hit(player: Player, tool: string, facing: Facing): WoodHit | undefined {
    const aim = this.target(player, tool);
    if (!aim || aim.refusal) return undefined;
    if (aim.work !== 'plant') this.harvest.chipsAt(aim.x, aim.y + 3, aim.prop.y + 1, 'wood', facing);
    if (aim.work === 'cut') return this.cutHit(aim.prop, aim.at);
    if (aim.work === 'hew') return this.hewHit(aim.prop);
    if (aim.work === 'plant') return this.plant(aim.prop, aim.end!);
    return this.maulHit(aim.prop);
  }

  /** La pièce a de nouveaux réglages : notés dans GameState, et redessinée à sa place. */
  private update(p: PlacedProp, piece: WoodPiece): void {
    setWood(game, this.map.def.id, p.id, p.spawned, piece);
    const { id, type, x, y, spawned, chain } = p;
    this.map.removeProp(p);
    this.map.placeProp({ id, type, x, y }, { spawned, chain, wood: piece });
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
    const next = this.map.placeProp({ id: p.id, type: WOOD_PIECE, ...at }, { spawned: p.spawned, chain: p.chain, wood: piece });
    if (p.spawned) changeSpawned(game, this.map.def.id, p.id, stateOf(next));
    else changeObject(game, this.map.def.id, p.id, stateOf(next));
    return next;
  }

  /** Une pièce naît en (x, y). */
  private born(piece: WoodPiece, at: { x: number; y: number }): PlacedProp {
    const o = spawnObject(game, this.map.def.id, WOOD_PIECE, at.x, at.y, { wood: piece });
    return this.map.placeProp(o, { spawned: true, wood: piece });
  }

  private hewHit(p: PlacedProp): WoodHit {
    const piece = { ...p.wood!, hewn: (p.wood!.hewn ?? 0) + 1 };
    const before = hewnFaces(p.wood!).faces;
    const { faces, beam } = hewnFaces(piece);
    this.update(p, piece);
    if (beam) return { beam: { length: piece.length } };
    return faces > before ? { face: faces } : {};
  }

  /** Le coin se plante dans le bout `end` : il y reste, la main qui le tenait est libre. */
  private plant(p: PlacedProp, end: End): WoodHit {
    this.update(p, { ...p.wood!, wedge: { end, hits: 0 } });
    return { planted: true };
  }

  /** Où naissent les deux morceaux d'une pièce qui se fend (coin bas gauche de chacun) et ce qu'ils sont (`splitPieces`). */
  private halves(p: PlacedProp): { piece: WoodPiece; x: number; y: number }[] {
    return splitPieces(p.wood!).map(({ piece, dx, dy }) => ({ piece, x: p.x + dx, y: p.y + dy }));
  }

  /** Les deux morceaux tiendraient à leur place (carte, cases bloquantes, objets) : la collision de la pièce fendue ne compte pas. */
  private splitFree(p: PlacedProp): boolean {
    const own = p.parts.filter((q): q is Phaser.GameObjects.Zone => q.type === 'Zone');
    return this.halves(p).every(({ piece, x, y }) => {
      const look = lookOf(piece);
      const { w, h } = woodSize(piece.size, look, piece.axis, piece.length);
      const f = footprint({ ...p.def, body: woodBody(piece.size, look, piece.axis, piece.length), bodies: undefined }, w, h, false)!;
      const box: Box = { left: x + f.left, right: x + f.right, top: y - h + f.top, bottom: y - h + f.bottom };
      return this.map.areaFree(box, [], own);
    });
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
    const [first, second] = this.halves(p);
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
