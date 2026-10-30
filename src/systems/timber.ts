import type Phaser from 'phaser';
import { DEPTH, NOTCH_AIM } from '../config';
import { gestures } from '../content';
import { woodShape } from '../content/mass';
import type { Facing } from '../content/types';
import type { Player } from '../entities/Player';
import { changeObject, changeSpawned, game, setTimber, spawnObject, type Notch } from '../state';
import { stateOf, timberLength, type GameMap, type PlacedProp } from '../world/GameMap';
import { cmAt, cutPixel, lengthPx, metresLabel, timberBody, timberSize } from '../world/timberShape';
import type { HarvestSystem } from './harvest';

/**
 * Ce que l'outil en main ferait au bois d'œuvre devant Xéros : couper le rondin à `at` cm de son bout de départ (ouest, nord),
 * ou en dresser une face ; (x, y) : où l'invite se pose (le haut de la pièce, au-dessus de la coupe ou du coup). `refusal` :
 * pourquoi ce n'est pas possible (dit sans geste ni dépense).
 */
export interface TimberAim {
  prop: PlacedProp;
  kind: 'cut' | 'hew';
  at: number;
  x: number;
  y: number;
  refusal?: string;
}

/** Ce qu'a donné un coup : la pièce coupée en deux (`split`, les deux longueurs), une face finie (`face`), la poutre finie (`beam`). */
export interface TimberHit {
  split?: [number, number];
  face?: number;
  beam?: { length: number };
}

/**
 * Le bois d'œuvre à l'outil (`timber` de props.json) : couper un rondin où l'on veut à la cognée, l'équarrir à la doloire.
 * Xéros se tient contre le flanc de la pièce (au nord ou au sud d'un rondin est-ouest, à l'est ou à l'ouest d'un rondin
 * nord-sud), tourné vers elle ; le point où tombe le fer à l'impact (`strike` du geste `chop`) dit où se fait la coupe,
 * arrondie au pas du contenu (`cut.step`), jamais à moins de `cut.min` d'un bout. Une invite montre la coupe visée et les
 * deux longueurs qu'elle donnerait (« 2,9 m | 2,4 m »). Chaque coup est noté dans GameState (encoche et ses coups, coups de
 * doloire) ; au dernier, le rondin devient deux rondins, ou la poutre. Ne lit pas le clavier.
 */
export class TimberSystem {
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

  /**
   * La pièce que l'outil `tool` frapperait, contre son flanc, et ce qu'il y ferait. Rien si Xéros n'est pas collé au flanc
   * d'une pièce que cet outil travaille.
   */
  target(player: Player, tool: string | undefined): TimberAim | undefined {
    if (!tool) return undefined;
    const { actor } = player;
    const b = actor.body;
    const f = actor.facing;
    const gesture = gestures.chop;
    const dir = f === 'left' ? 'right' : (f as 'down' | 'up' | 'right');
    const strike = (gesture.strike?.[dir] ?? gesture.poses[dir][gesture.impact].dx) * (f === 'left' ? -1 : 1);
    for (const p of this.map.props) {
      const t = p.def.timber;
      const box = p.box;
      if (!t || !box || !p.image.visible) continue;
      const kind = t.cut?.tool === tool ? 'cut' : t.hew?.tool === tool ? 'hew' : undefined;
      if (!kind) continue;
      const { w, h } = timberSize(t.axis, timberLength(p.def, p.length));
      const top = p.y - h;
      // le long de la pièce, dans son image : la colonne où tombe le fer (est-ouest), la rangée de ses pieds (nord-sud)
      let along: number;
      if (t.axis === 'ew') {
        const above = f === 'down' && Math.abs(box.top - b.bottom) <= NOTCH_AIM.gap;
        const below = f === 'up' && Math.abs(b.top - box.bottom) <= NOTCH_AIM.gap;
        along = actor.x + strike - p.x;
        if (!(above || below) || along < 0 || along > w - 1) continue;
      } else {
        const west = f === 'right' && Math.abs(box.left - b.right) <= NOTCH_AIM.gap;
        const east = f === 'left' && Math.abs(b.left - box.right) <= NOTCH_AIM.gap;
        along = b.center.y - top;
        if (!(west || east) || b.center.y < box.top || b.center.y > box.bottom) continue;
      }
      return kind === 'cut' ? this.cutAim(p, along, top) : this.hewAim(p, along, top);
    }
    return undefined;
  }

  /** La coupe visée à `along` px de l'image : au pas du contenu, à `min` cm des bouts au moins, ou l'encoche déjà commencée. */
  private cutAim(p: PlacedProp, along: number, top: number): TimberAim {
    const t = p.def.timber!;
    const cut = t.cut!;
    const length = timberLength(p.def, p.length);
    let at = Math.min(length - cut.min, Math.max(cut.min, Math.round(cmAt(t.axis, along) / cut.step) * cut.step));
    let refusal: string | undefined;
    if (length < 2 * cut.min) refusal = 'Trop court pour être recoupé.';
    else if (p.hewn) refusal = "On coupe le rondin avant de l'équarrir.";
    else if (p.notch) {
      // une seule coupe à la fois : le fer retombe dans l'encoche commencée, si on en est près
      if (Math.abs(at - p.notch.at) <= 3 * cut.step) at = p.notch.at;
      else refusal = "Finis d'abord l'entaille commencée.";
    }
    const px = cutPixel(t.axis, at);
    const [x, y] = t.axis === 'ew' ? [p.x + px, top + 1] : [p.x + 4, top + px];
    return { prop: p, kind: 'cut', at, x, y, refusal };
  }

  /** Le coup de doloire visé : refusé sur un rondin entaillé, ou trop mince pour qu'une poutre y tienne. */
  private hewAim(p: PlacedProp, along: number, top: number): TimberAim {
    const t = p.def.timber!;
    const hew = t.hew!;
    let refusal: string | undefined;
    if (p.notch) refusal = "Finis d'abord la coupe.";
    else if (woodShape(p.def.dims).diameter < hew.min) refusal = 'Trop mince pour une poutre.';
    const [x, y] = t.axis === 'ew' ? [p.x + Math.round(along), top + 1] : [p.x + 4, top + Math.round(along)];
    return { prop: p, kind: 'hew', at: Math.round(cmAt(t.axis, along)), x, y, refusal };
  }

  /** Prix du coup en endurance : un coup de cognée ; un coup de doloire, selon la longueur de la pièce. */
  cost(player: Player, aim: TimberAim): number {
    const c = player.stamina.costs;
    return aim.kind === 'cut' ? c.chop : (c.hewPerM * timberLength(aim.prop.def, aim.prop.length)) / 100;
  }

  /**
   * À appeler à chaque image : l'invite « Espace » sur la coupe visée, et au-dessus les deux longueurs qu'elle donnerait ; sur
   * la face qu'on dresse, l'invite seule. `active` = false pendant un geste, un dialogue ou un changement de carte.
   */
  updatePrompt(time: number, player: Player, tool: string | undefined, active: boolean): void {
    const aim = active ? this.target(player, tool) : undefined;
    const ok = !!aim && !aim.refusal;
    this.prompt.setVisible(ok);
    this.label.setVisible(ok && aim.kind === 'cut');
    if (!ok) return;
    const bob = Math.round((Math.sin(time / 220) + 1) / 2) * 2;
    this.prompt.setPosition(aim.x, aim.y + 3 - bob);
    if (aim.kind !== 'cut') return;
    const length = timberLength(aim.prop.def, aim.prop.length);
    const text = `${metresLabel(aim.at)} | ${metresLabel(length - aim.at)}`;
    if (text !== this.shown) this.drawLabel(text);
    this.label.setPosition(Math.round(aim.x), Math.round(aim.y - this.prompt.height - 3));
  }

  /** La ligne affichée au-dessus de la coupe visée (« 2,9 m | 2,4 m »), pour les tests. */
  get labelText(): string | undefined {
    return this.label.visible ? this.shown : undefined;
  }

  /** La ligne « 2,9 m | 2,4 m » en petits signes (`ui-digit-<signe>`), centrée sur la coupe ; la barre est un trait d'un pixel. */
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
   * Un coup porté avec `tool` au moment de l'impact (la cible est cherchée à nouveau : celle qui est devant Xéros à cet instant).
   * Coupe : l'encoche se creuse, au dernier coup le rondin devient deux rondins. Doloire : une face de plus tous les `perFace`
   * coups, la dernière fait la poutre. Undefined : rien à frapper (on a bougé, la pièce a disparu).
   */
  hit(player: Player, tool: string, facing: Facing): TimberHit | undefined {
    const aim = this.target(player, tool);
    if (!aim || aim.refusal) return undefined;
    this.harvest.chipsAt(aim.x, aim.y + 3, aim.prop.y + 1, 'wood', facing);
    return aim.kind === 'cut' ? this.cutHit(aim.prop, aim.at) : this.hewHit(aim.prop);
  }

  private cutHit(p: PlacedProp, at: number): TimberHit {
    const cut = p.def.timber!.cut!;
    const notch: Notch = p.notch ? { at: p.notch.at, hits: p.notch.hits + 1 } : { at, hits: 1 };
    if (notch.hits < cut.hits) {
      setTimber(game, this.map.def.id, p.id, p.spawned, notch, p.hewn);
      this.redraw(p, notch, p.hewn);
      return {};
    }
    return { split: this.split(p, notch.at) };
  }

  private hewHit(p: PlacedProp): TimberHit {
    const hew = p.def.timber!.hew!;
    const hewn = p.hewn + 1;
    const length = timberLength(p.def, p.length);
    if (hewn >= hew.perFace * hew.faces) {
      // la dernière face : la poutre, même sens, même longueur, au même endroit
      const { id, x, y, spawned } = p;
      this.map.removeProp(p);
      const beam = this.map.placeProp({ id, type: hew.into, x, y }, { spawned, length });
      if (spawned) changeSpawned(game, this.map.def.id, id, stateOf(beam));
      else changeObject(game, this.map.def.id, id, stateOf(beam));
      return { beam: { length } };
    }
    setTimber(game, this.map.def.id, p.id, p.spawned, undefined, hewn);
    this.redraw(p, undefined, hewn);
    return hewn % hew.perFace === 0 ? { face: hewn / hew.perFace } : {};
  }

  /**
   * Le rondin coupé à `at` cm : deux rondins, le premier (ouest, nord) garde son identifiant, le second naît. Est-ouest, le
   * second commence à la colonne de la coupe ; nord-sud, le second garde le bas de l'image (la face sud), le premier se pose
   * juste au nord de sa collision. Renvoie les deux longueurs.
   */
  private split(p: PlacedProp, at: number): [number, number] {
    const length = timberLength(p.def, p.length);
    const rest = length - at;
    const mapId = this.map.def.id;
    const { x, y } = p;
    const [first, second] = p.def.timber!.axis === 'ew' ? [{ x, y }, { x: x + lengthPx(at), y }] : [{ x, y: y - timberBody('ns', rest).h }, { x, y }];
    this.map.removeProp(p);
    const a = this.map.placeProp({ id: p.id, type: p.type, ...first }, { spawned: p.spawned, length: at });
    if (p.spawned) changeSpawned(game, mapId, p.id, stateOf(a));
    else changeObject(game, mapId, p.id, stateOf(a));
    const o = spawnObject(game, mapId, p.type, second.x, second.y, false, undefined, rest);
    this.map.placeProp(o, { spawned: true, length: rest });
    return [at, rest];
  }

  /** La pièce redessinée à sa place, avec son encoche et ses faces (GameState est déjà à jour). */
  private redraw(p: PlacedProp, notch: Notch | undefined, hewn: number): void {
    const { id, type, x, y, spawned, length } = p;
    this.map.removeProp(p);
    this.map.placeProp({ id, type, x, y }, { spawned, length, notch, hewn });
  }
}
