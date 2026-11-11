// Le mode construction (le bac à sable, ?construire) : caméra libre, une pièce du catalogue en fantôme sous la souris, accrochée sur
// le dessus de ce qu'il y a dessous ; clic gauche pose, clic droit retire (Maj : avec tout ce qui repose dessus) ; R tourne ; T et G
// montent et descendent d'un cran ; Ctrl+Z, Ctrl+Y ; une zone choisie s'enregistre comme plan, et un plan se pose d'un coup.
// Ni force, ni aide, ni ordre de chantier : on pose ce qu'on veut, où l'on veut. Tout passe par GameState (addBuildPieces,
// removeBuildPieces), donc tout est sauvegardé et se retrouve en jeu. Le calcul (boîtes, hauteur, porteurs) est dans world/build.ts.

import Phaser from 'phaser';
import { BUILD, DEPTH, INTERIOR, RENDER } from '../config';
import { items, mobility, props } from '../content';
import { openDecks, storeyHeights } from '../world/decks';
import { buildPlans, putBuildPlan } from '../content/buildPlans';
import { CM_PER_PX } from '../content/gabarit';
import type { BuildPlaced, BuildRef, JointType, Natural, WoodAge } from '../content/types';
import type { BuildCommand, BuildStatus } from '../events';
import type { Player } from '../entities/Player';
import { drawnStep } from './simSpeed';
import { addBuildPieces, addJoints, game, mapState, moveBuildPiece, removeBuildPieces, removeJoints, revisionOf, type BuildPiece, type Joint } from '../state';
import { aimAt, aimOnGrid, centerOnFace, supportAt, solidOf, boxOf, carriedBy, overlaps, sliceHits, planOf, planPieces, planSize, refName, sizeOf, turned, withAbove, withAge, type Area, type Box3 } from '../world/build';
import { buildLook } from '../world/buildView';
import { viewDrawn } from '../content/views';
import { alignOnWall } from '../world/wallRuns';
import { JOINT_NAMES, jointGroup, jointPoint, junctionAt, refusal as jointRefusal, type Junction } from '../world/joints';
import type { GameMap } from '../world/GameMap';
import { drawNatural } from '../world/natural';
import { Ghosts } from './ghost';
import { pick } from '../world/relief';

/** Ce qu'on a en main : une pièce (avec son sens, ses réglages de forme naturelle et son tirage), un plan, ou l'outil de zone. */
type Tool =
  | { kind: 'piece'; piece: BuildRef; view: number; natural?: { form?: 0 | 1; size?: number }; drawn?: Natural; variant?: number }
  | { kind: 'plan'; plan: string; variants: (number | undefined)[] }
  | { kind: 'select' }
  | { kind: 'joint'; type: JointType };

/** Un geste qu'on peut annuler : des pièces et des assemblages posés, ou retirés (ils reviennent avec leur identifiant). */
type Op = { kind: 'add' | 'remove'; pieces: BuildPiece[]; joints: Joint[]; moves?: Move[]; replaced?: BuildPiece[] };

/** Une pièce qui change de hauteur avec un geste (le mi-bois descend la pièce du dessus au niveau de l'autre). */
type Move = { id: number; from: number; to: number };

/** Un clic de la souris, en attente de la prochaine image : le bouton, Maj, et le point visé (px du monde). */
interface Click {
  button: 'left' | 'right';
  shift: boolean;
  x: number;
  y: number;
}

/** Un tirage au hasard parmi les `variants` d'un élément calculé (le morceau de solin), ou rien. */
function drawVariant(piece: BuildRef): number | undefined {
  if (!('prop' in piece)) return undefined;
  const n = props[piece.prop].variants;
  return n ? Math.floor(Math.random() * n) : undefined;
}

/** La définition de matière naturelle d'une pièce (la dalle, la pierre brute), s'il en a une. */
function naturalDef(piece: BuildRef) {
  if ('prop' in piece) return props[piece.prop].natural;
  if ('item' in piece) return items[piece.item].natural;
  return undefined;
}

export class BuildSystem {
  /** Le mode est ouvert : la caméra est libre, Xéros attend. */
  active = false;
  private tool?: Tool;
  /** Crans de hauteur ajoutés à la hauteur accrochée (T, G). */
  private step = 0;
  private readonly ghosts: Ghosts;
  /** La zone choisie (en cm), son contour, l'emprise du fantôme. */
  private readonly gfx: Phaser.GameObjects.Graphics;
  private selection?: Area;
  /** Le point (px du monde) où le glisser de la zone a commencé. */
  private dragFrom?: { x: number; y: number };
  private readonly clicks: Click[] = [];
  private readonly undoStack: Op[] = [];
  private readonly redoStack: Op[] = [];
  /** La boîte où se poserait la pièce (ou le plan) en main, et si la pose est permise ; mis à jour à chaque image. */
  private aim?: { pieces: BuildPlaced[]; ok: boolean; why?: string; replaces?: BuildPiece };
  /** La jonction visée avec un assemblage en main, et pourquoi il ne va pas (rien : il va). */
  private jointAim?: { junction?: Junction; why?: string };
  /**
   * L'âge du bois des pièces qu'on pose (réglé au catalogue) : la pièce de bois et les objets de bois le prennent, un plan aussi (tout
   * son bois) ; prendre un plan règle l'âge sur le sien.
   */
  private age: WoodAge = 'new';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    private readonly player: Player,
    private readonly notice: (text: string) => void,
    private readonly emit: (status: BuildStatus) => void,
  ) {
    this.ghosts = new Ghosts(scene, BUILD.ghost);
    this.gfx = scene.add.graphics().setDepth(DEPTH.prompt - 2);
    const input = scene.input;
    input.mouse?.disableContextMenu();
    // le point du monde qu'on voit sous la souris (le relief soulève ce qui est en hauteur : world/relief.ts `pick`)
    const point = (p: Phaser.Input.Pointer) => {
      const w = this.scene.cameras.main.getWorldPoint(p.x, p.y);
      return this.seenAt(w.x, w.y);
    };
    const down = (p: Phaser.Input.Pointer) => {
      if (!this.active) return;
      const w = point(p);
      if (p.rightButtonDown()) this.clicks.push({ button: 'right', shift: this.player.input.shiftDown(), x: w.x, y: w.y });
      else if (this.tool?.kind === 'select') this.dragFrom = { x: w.x, y: w.y };
      else this.clicks.push({ button: 'left', shift: false, x: w.x, y: w.y });
    };
    const up = (p: Phaser.Input.Pointer) => {
      if (!this.active || !this.dragFrom) return;
      const w = point(p);
      this.selection = this.areaOf(this.dragFrom, w);
      this.dragFrom = undefined;
      this.status();
    };
    input.on('pointerdown', down);
    input.on('pointerup', up);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      input.off('pointerdown', down);
      input.off('pointerup', up);
    });
  }

  /** Entre dans le mode : la caméra ne suit plus Xéros. */
  enter(): void {
    this.active = true;
    this.scene.cameras.main.stopFollow();
    this.status();
  }

  /** Sort du mode : plus de fantôme ni de zone, la caméra reprend Xéros. */
  exit(): void {
    this.active = false;
    this.showLevel();
    this.ghosts.hideFrom(0);
    this.gfx.clear();
    this.dragFrom = undefined;
    this.clicks.length = 0;
    this.scene.cameras.main.startFollow(this.player.actor, true, 0.15, 0.15);
    this.status();
  }

  /** Une commande du catalogue (le mode est déjà ouvert). */
  command(cmd: BuildCommand): void {
    // les clics faits avant la commande se jouent d'abord, avec l'outil qu'on avait en main en cliquant (un jeu qui rame les garde en
    // file jusqu'à l'image suivante : changer d'outil entre-temps ne doit pas changer ce qu'ils posent)
    this.flushClicks();
    switch (cmd.kind) {
      case 'pick': {
        this.tool = { kind: 'piece', piece: structuredClone(cmd.piece), view: cmd.view ?? 0, natural: cmd.natural, variant: drawVariant(cmd.piece) };
        this.tool.drawn = this.natural(this.tool);
        break;
      }
      case 'pick-plan': {
        const plan = buildPlans[cmd.plan];
        if (!plan) return this.notice(`Plan « ${cmd.plan} » introuvable.`);
        this.tool = { kind: 'plan', plan: cmd.plan, variants: plan.pieces.map((p) => drawVariant(p.piece)) };
        // l'âge du plan devient l'âge choisi (les boutons du catalogue le montrent) ; on peut le changer avant de poser
        if (plan.age) this.age = plan.age;
        break;
      }
      case 'select':
        this.tool = { kind: 'select' };
        break;
      case 'pick-joint':
        this.tool = { kind: 'joint', type: cmd.joint };
        break;
      case 'none':
        this.tool = undefined;
        break;
      case 'age':
        this.age = cmd.age;
        return this.status();
      case 'save-plan':
        void this.savePlan(cmd.name);
        return;
      case 'undo':
        return this.undo();
      case 'redo':
        return this.redo();
      case 'toggle':
        return;
      case 'level':
        return this.nextLevel();
    }
    this.step = 0;
    this.status();
  }

  /** Une image du mode : la caméra, les crans, R (`turn` : lu par la scène avec les autres touches), annuler et refaire, les clics, le fantôme. */
  update(delta: number, turn: boolean): void {
    const input = this.player.input;
    const cam = this.scene.cameras.main;
    const { dir } = input.read();
    if (dir.lengthSq()) {
      const speed = (BUILD.camera * (input.shiftDown() ? BUILD.fast : 1) * delta) / 1000 / (cam.zoom / RENDER);
      cam.scrollX += dir.x * speed;
      cam.scrollY += dir.y * speed;
    }
    if (input.levelPressed()) this.nextLevel();
    const step = input.stepPressed();
    if (step) {
      this.step += step;
      this.status();
    }
    if (turn) this.turn();
    const h = input.historyPressed();
    if (h === 'undo') this.undo();
    if (h === 'redo') this.redo();

    const pointer = this.scene.input.activePointer;
    const seen = cam.getWorldPoint(pointer.x, pointer.y);
    const at = this.seenAt(seen.x, seen.y);
    const clicked = this.clicks.length > 0;
    this.flushClicks();
    // la visée (l'accrochage parmi toutes les pièces posées) et le fantôme ne dépendent que du point visé, de l'outil, du cran, de
    // l'âge, de la sélection et de la partie (son compteur de changements) : recalculés seulement quand l'un d'eux change, et au pas
    // qui sera dessiné (une machine lente fait plusieurs pas par image, world/timeStep.ts : le fantôme ne se voit qu'à celui-là ; un
    // clic, lui, vise toujours à son point, flushClicks)
    const key = [at.x, at.y, this.step, this.age, this.level, revisionOf(), JSON.stringify(this.tool), JSON.stringify(this.selection), this.dragFrom?.x, this.dragFrom?.y].join('|');
    if (!clicked && (key === this.aimedFor || !drawnStep())) return;
    this.aimedFor = key;
    this.updateAim(at.x, at.y);
    this.draw(at);
  }

  /** Ce que visaient la dernière visée et le dernier fantôme (update). */
  private aimedFor?: string;

  /** Les clics en file, joués dans l'ordre avec l'outil en main (pose au clic gauche, retrait au clic droit). */
  private flushClicks(): void {
    for (const c of this.clicks.splice(0)) {
      if (c.button === 'right') this.remove(c.x, c.y, c.shift);
      else {
        this.updateAim(c.x, c.y);
        this.place();
      }
    }
  }

  /** R : la pièce en main tourne d'un quart de tour (la pièce de bois : est-ouest, nord-sud, debout). */
  private turn(): void {
    const t = this.tool;
    if (t?.kind !== 'piece') return;
    // un quart de tour, en sautant les vues pas encore dessinées (VIEWS_TODO) : l'image et l'emprise restent d'accord
    let next = turned(t.piece, t.view);
    for (let i = 0; i < 4 && !this.drawn(next.ref, next.view); i++) next = turned(next.ref, next.view);
    t.piece = next.ref;
    t.view = next.view;
    this.status();
  }

  /** La vue `view` de cette pièce est-elle dessinée ? (la pièce de bois se calcule : toujours) */
  private drawn(ref: BuildRef, view: number): boolean {
    const has = (k: string) => this.scene.textures.exists(k);
    if ('prop' in ref) return viewDrawn(props[ref.prop].image, props[ref.prop].views, view, has);
    if ('item' in ref) {
      const def = items[ref.item];
      return !def.ground || viewDrawn(def.ground, def.views, view, has);
    }
    return true;
  }

  /** La forme et la taille naturelles de la prochaine pose : celles choisies au catalogue, sinon au hasard. */
  private natural(t: Extract<Tool, { kind: 'piece' }>): Natural | undefined {
    const def = naturalDef(t.piece);
    if (!def) return undefined;
    const r = drawNatural(def);
    return { form: t.natural?.form ?? r.form, size: t.natural?.size ?? r.size };
  }

  /** Les pièces posées sur la carte (GameState). */
  private get pieces(): BuildPiece[] {
    return mapState(game, this.map.def.id).builds;
  }

  /**
   * Tout ce qui est posé sous les yeux : les pièces de la carte et, dans un intérieur, celles du bâtiment (fixes, à la carte du
   * dehors) : on vise sur elles et on ne pose pas dedans.
   */
  private get shown(): BuildPiece[] {
    return this.map.builds.map((b) => b.piece);
  }

  /** Les assemblages posés sur la carte (GameState). */
  private get joints(): Joint[] {
    return mapState(game, this.map.def.id).joints;
  }

  /** Où irait ce qu'on a en main, visé au point (px du monde) : la pièce ou le plan entier, accroché, et si la pose est permise. */
  private updateAim(px: number, py: number): void {
    const t = this.tool;
    this.aim = undefined;
    const sign = (j?: { junction?: Junction; why?: string }) => `${j?.junction ? 1 : 0}|${j?.why ?? ''}`;
    const before = sign(this.jointAim);
    this.jointAim = undefined;
    if (t?.kind === 'joint') {
      // une jonction déjà assemblée passe après celle qui reste à faire (deux croisements de rondins à un pixel l'un de l'autre)
      const joined = this.joints;
      const open = (j: Junction) => !joined.some((k) => (k.a === j.a.id && k.b === j.b.id) || (k.a === j.b.id && k.b === j.a.id));
      const junction = junctionAt(this.pieces, px, py, 8, (q) => this.map.shownOffset(q), open);
      this.jointAim = { junction, why: jointRefusal(junction, t.type, this.joints) };
      if (sign(this.jointAim) !== before) this.status();
      return;
    }
    if (!t || t.kind === 'select') return;
    const cx = px * CM_PER_PX;
    const cy = py * CM_PER_PX;
    let list: BuildPlaced[];
    if (t.kind === 'piece') {
      // un pan de toit ne porte rien : on vise sans les pièces de toit ; sauf pour le faîtage (une pièce de toit sans pente), qui se
      // pose sur le faîte des pans (et se dessine après eux)
      const pitch = 'prop' in t.piece && props[t.piece.prop].pitch;
      const ridge = 'prop' in t.piece && !!props[t.piece.prop].roof && !pitch;
      let b = aimAt(this.shown.filter((q) => (ridge || !isRoof(q)) && this.belowCeiling(q)), sizeOf(t.piece, t.view), cx, cy, this.step, aimOnGrid(t.piece), t.piece, t.view);
      // un pan de toit : sa base est le dessus de ce qui porte sa rive basse (une bande de 60 cm le long du côté bas)
      if (pitch) {
        const low = (['south', 'west', 'north', 'east'] as const)[t.view % 4];
        const band = 60;
        const strip = low === 'south' ? { ...b, y: b.y + b.d - band, d: band } : low === 'north' ? { ...b, d: band } : low === 'west' ? { ...b, w: band } : { ...b, x: b.x + b.w - band, w: band };
        b = { ...b, z: Math.max(0, supportAt(this.shown.filter((q) => !isRoof(q)), strip) + this.step * BUILD.grid) };
      }
      // sur un mur (le solin), une pièce couchée affleure sa face extérieure, et reste sur ce qui la porte
      if (b.z > 0) {
        const a = alignOnWall(this.shown, b);
        if (a !== b && supportAt(this.shown, a) === supportAt(this.shown, b)) b = a;
      }
      // un volet contre la face d'un remplissage se centre sur lui (la baie est au milieu de la travée)
      const swing = 'prop' in t.piece ? props[t.piece.prop].swing : undefined;
      if (swing && !swing.passage) b = centerOnFace(this.shown.filter((q) => !isRoof(q)), b);
      // un élément à couches (`over` de props.json : le clayonnage sur les palançons) posé sur la pièce qu'il recouvre : à sa place, il
      // la remplace
      const under = this.underAt(t.piece, t.view, cx, cy) ?? this.underOf(t.piece, t.view, b);
      if (under) b = { ...b, x: under.x, y: under.y, z: under.z };
      list = [withAge({ piece: t.piece, x: b.x, y: b.y, z: b.z, view: t.view, ...(t.drawn ? { natural: t.drawn } : {}), ...(t.variant !== undefined ? { variant: t.variant } : {}) }, this.age)];
      if (under) {
        const why = this.refusal(list, under.id);
        this.aim = { pieces: list, ok: !why, why, replaces: under };
        return;
      }
    } else {
      const plan = buildPlans[t.plan];
      if (!plan) return;
      const b = aimAt(this.shown, planSize(plan), cx, cy, this.step);
      // tout le bois du plan prend l'âge choisi
      list = planPieces({ ...plan, age: this.age }, b).map((p, i) => ({ ...p, ...(t.variants[i] !== undefined ? { variant: t.variants[i] } : {}) }));
    }
    const why = this.refusal(list);
    this.aim = { pieces: list, ok: !why, why };
  }

  /**
   * La pièce qu'un élément à couches recouvre à l'emprise visée `b` : celle dont la clé est son `over`, dans le même sens, dont l'emprise
   * touche la visée (la plus proche).
   */
  /**
   * La pièce qu'un élément à couches recouvre, sous la souris (cm, au point de l'écran (cx, cy)) : celle dont la clé est son `over`,
   * dans le même sens, dont on voit la boîte là (de son dessus au bas de sa face, `y − z − h` à `y + d − z`), la plus en avant. Le
   * clayonnage se pose en visant les palançons qu'il recouvre, même là où la visée d'une pièce neuve prendrait un autre dessus.
   */
  private underAt(piece: BuildPlaced['piece'], view: number, cx: number, cy: number): BuildPiece | undefined {
    const over = 'prop' in piece ? props[piece.prop].over : undefined;
    if (!over) return undefined;
    const cands = this.shown.filter((q): q is BuildPiece => {
      if (!('id' in q) || !('prop' in q.piece) || q.piece.prop !== over || (q.view ?? 0) !== view) return false;
      const b = boxOf(q);
      return cx >= b.x && cx < b.x + b.w && cy >= b.y - b.z - b.h && cy < b.y + b.d - b.z;
    });
    return cands.sort((p, q) => boxOf(q).y + boxOf(q).d - (boxOf(p).y + boxOf(p).d))[0];
  }

  private underOf(piece: BuildPlaced['piece'], view: number, b: { x: number; y: number; w: number; d: number }): BuildPiece | undefined {
    const over = 'prop' in piece ? props[piece.prop].over : undefined;
    if (!over) return undefined;
    const cands = this.shown.filter((q): q is BuildPiece => 'id' in q && 'prop' in q.piece && q.piece.prop === over && (q.view ?? 0) === view && overlaps(boxOf(q), b));
    const d = (q: BuildPiece) => Math.hypot(q.x - b.x, q.y - b.y);
    return cands.sort((p, q) => d(p) - d(q))[0];
  }

  /** Pourquoi on ne peut pas poser ces pièces : hors de la carte, dans une autre pièce, sur Xéros, à cheval sur une marche, dans l'eau ; sinon rien. `replacing` : la pièce que la pose remplace (elle ne gêne pas). */
  private refusal(list: BuildPlaced[], replacing?: number): string | undefined {
    const W = this.map.width * CM_PER_PX;
    const H = this.map.height * CM_PER_PX;
    // un pan de toit ne se heurte pas à ce qui est sous sa pente, ni rien à lui
    // (un poteau, par sa section réelle : le remplissage vient contre lui)
    const others = this.shown.filter((q) => !isRoof(q) && !('id' in q && q.id === replacing)).map(solidOf);
    // dans un intérieur : rien hors de la pièce (dans les murs, dehors)
    const room = this.map.room;
    const body = this.player.actor.body as Phaser.Physics.Arcade.Body;
    const feet = { x: body.left * CM_PER_PX, y: body.top * CM_PER_PX, w: body.width * CM_PER_PX, d: body.height * CM_PER_PX };
    for (const p of list) {
      const b = boxOf(p);
      if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.d > H) return 'Hors de la carte.';
      if (room && (b.x < room.x || b.y < room.y || b.x + b.w > room.x + room.w || b.y + b.d > room.y + room.d)) return 'Hors de la pièce.';
      if (!isRoof(p) && others.some((o) => intersects(o, solidOf(p)))) return 'Une autre pièce est déjà là.';
      if (sliceHits([b.z, b.z + b.h], this.map.standZ) && overlaps(b, feet)) return 'Xéros est là.';
      // le relief : une pièce au sol tient sur un seul niveau ; dans l'eau profonde, rien ne se pose
      const box = { left: b.x / CM_PER_PX, top: b.y / CM_PER_PX, right: (b.x + b.w) / CM_PER_PX, bottom: (b.y + b.d) / CM_PER_PX };
      if (b.z === 0 && !this.map.level(box)) return 'À cheval sur une marche.';
      if (b.z === 0 && this.map.inWater(box)) return "Dans l'eau.";
    }
    return undefined;
  }

  /** Clic gauche : pose la pièce (ou le plan) là où le montre le fantôme ; la prochaine pose tire une nouvelle forme, un nouveau tirage. */
  private place(): void {
    const a = this.aim;
    const t = this.tool;
    if (t?.kind === 'joint') return this.placeJoint(t.type);
    if (!a || !t || t.kind === 'select') return;
    if (!a.ok) return this.notice(a.why!);
    // un élément à couches remplace la pièce qu'il recouvre (elle revient si l'on défait)
    const replaced = a.replaces ? [structuredClone(a.replaces)] : [];
    if (replaced.length) this.drop(replaced, []);
    const added = addBuildPieces(game, this.map.def.id, a.pieces);
    for (const p of added) this.map.placeBuild(p);
    // un plan : ses assemblages, entre les pièces qu'on vient de poser
    const planJoints = t.kind === 'plan' ? (buildPlans[t.plan]?.joints ?? []) : [];
    const joints = planJoints.length ? addJoints(game, this.map.def.id, planJoints.map((j) => ({ type: j.type, a: added[j.a].id, b: added[j.b].id, ...(j.top !== undefined ? { top: added[j.top].id } : {}) }))) : [];
    this.map.sortBuilds();
    this.push({ kind: 'add', pieces: structuredClone(added), joints: structuredClone(joints), ...(replaced.length ? { replaced } : {}) });
    if (t.kind === 'piece') {
      t.drawn = this.natural(t);
      t.variant = drawVariant(t.piece);
    } else {
      const plan = buildPlans[t.plan];
      if (plan) t.variants = plan.pieces.map((p) => drawVariant(p.piece));
    }
    this.status();
  }

  /** Clic gauche avec un assemblage : il se pose à la jonction visée, si les deux pièces vont ensemble ; sinon on dit pourquoi. */
  private placeJoint(type: JointType): void {
    const a = this.jointAim;
    if (!a?.junction || a.why) return this.notice(a?.why ?? jointRefusal(undefined, type, this.joints)!);
    const { a: pa, b: pb } = a.junction;
    // le mi-bois : la pièce du dessus (la plus haute ; à hauteur égale, la nord-sud) descend dans celle du dessous, entaillées chacune
    // de la moitié ; rien ne doit reposer sur elle
    let moves: Move[] = [];
    let top: number | undefined;
    // l'encoche : le rondin du dessus s'enfonce de la moitié de son diamètre (s'il ne l'est pas déjà, par une autre encoche)
    if (type === 'halving' || type === 'notch') {
      const [upper, lower] = pa.z > pb.z || (pa.z === pb.z && 'wood' in pa.piece && pa.piece.wood.axis === 'ns') ? [pa, pb] : [pb, pa];
      const to = type === 'halving' ? lower.z : lower.z + boxOf(lower).h / 2;
      if (upper.z !== to && carriedBy(this.pieces, upper.id).length) return this.notice("Retire d'abord ce qui repose sur elle.");
      top = upper.id;
      if (upper.z !== to) moves = [{ id: upper.id, from: upper.z, to }];
      this.move(moves, true);
    }
    const added = addJoints(game, this.map.def.id, [{ type, a: pa.id, b: pb.id, ...(top !== undefined ? { top } : {}) }]);
    this.map.sortBuilds();
    this.push({ kind: 'add', pieces: [], joints: structuredClone(added), moves });
    this.notice(`${JOINT_NAMES[type][0].toUpperCase()}${JOINT_NAMES[type].slice(1)} posé${type === 'scarf' ? 'e' : ''}.`);
    this.status();
  }

  /** L'assemblage dont la jonction est sous le point (px du monde), à moins de 5 px. */
  jointAt(px: number, py: number): Joint | undefined {
    let best: Joint | undefined;
    let d = 5;
    for (const j of this.joints) {
      const pt = jointPoint(this.pieces, j, (q) => this.map.shownOffset(q));
      const dd = pt ? Math.hypot(pt.x - px, pt.y - py) : Infinity;
      if (dd <= d) {
        d = dd;
        best = j;
      }
    }
    return best;
  }

  /** La pièce visible sous le point (px du monde) : la plus en avant dont un pixel opaque est là. */
  pieceAt(px: number, py: number): BuildPiece | undefined {
    const sorted = [...this.map.builds].sort((a, b) => b.image.depth - a.image.depth);
    for (const b of sorted) {
      // une pièce du bâtiment vue de dedans ne se retire pas d'ici
      if (b.fixed) continue;
      const img = b.image;
      const lx = Math.floor(px - img.x);
      const ly = Math.floor(py - (img.y - img.height));
      if (lx < 0 || ly < 0 || lx >= img.width || ly >= img.height) continue;
      // un morceau de mur ne montre que sa part du tronçon
      const c = b.crop;
      if (c && (lx < c.x || ly < c.y || lx >= c.x + c.w || ly >= c.y + c.h)) continue;
      const alpha = this.scene.textures.getPixelAlpha(lx, ly, img.texture.key, img.frame.name);
      if (alpha && alpha > 0) return b.piece;
    }
    return undefined;
  }

  /**
   * Clic droit : sur la jonction d'un assemblage, il est retiré (les pièces restent) ; sur une pièce, elle est retirée, refusé si elle
   * est assemblée ou porte quelque chose. Avec Maj : la pièce, tout ce qui lui est assemblé et tout ce qui repose dessus.
   */
  private remove(px: number, py: number, all: boolean): void {
    const joint = all ? undefined : this.jointAt(px, py);
    if (joint) {
      // le mi-bois retiré : la pièce du dessus remonte sur l'autre, s'il ne repose rien sur le croisement
      let moves: Move[] = [];
      // (l'encoche : seulement si le rondin ne tient pas encore par une autre encoche, qui le garde enfoncé)
      const held = joint.type === 'notch' && this.joints.some((q) => q !== joint && q.type === 'notch' && q.top === joint.top);
      if ((joint.type === 'halving' || joint.type === 'notch') && joint.top !== undefined && !held) {
        const upper = this.pieces.find((q) => q.id === joint.top);
        const lower = this.pieces.find((q) => q.id === (joint.a === joint.top ? joint.b : joint.a));
        if (upper && lower) {
          if (carriedBy(this.pieces, upper.id).length || carriedBy(this.pieces, lower.id).some((q) => overlaps(boxOf(q), boxOf(upper)))) {
            return this.notice("Retire d'abord ce qui repose sur le croisement.");
          }
          moves = [{ id: upper.id, from: upper.z, to: lower.z + boxOf(lower).h }];
        }
      }
      this.drop([], [joint]);
      this.move(moves, true);
      this.push({ kind: 'remove', pieces: [], joints: [structuredClone(joint)], moves });
      return this.status();
    }
    const p = this.pieceAt(px, py);
    if (!p) return;
    if (!all && this.joints.some((j) => j.a === p.id || j.b === p.id)) return this.notice("Retire d'abord l'assemblage (clic droit sur la jonction), ou Maj + clic droit pour tout l'ensemble.");
    if (!all && carriedBy(this.pieces, p.id).length) return this.notice('Elle porte quelque chose : Maj + clic droit retire tout.');
    // avec Maj : de proche en proche, ce qui est assemblé et ce qui repose dessus
    const ids = new Set([p.id]);
    if (all) {
      for (let grew = true; grew; ) {
        grew = false;
        for (const id of [...ids]) {
          for (const q of [...jointGroup(this.joints, id), ...withAbove(this.pieces, id).map((x) => x.id)]) {
            if (!ids.has(q)) {
              ids.add(q);
              grew = true;
            }
          }
        }
      }
    }
    const gone = structuredClone(this.pieces.filter((q) => ids.has(q.id)));
    const goneJoints = structuredClone(this.joints.filter((j) => ids.has(j.a) || ids.has(j.b)));
    this.drop(gone, goneJoints);
    this.push({ kind: 'remove', pieces: gone, joints: goneJoints });
    this.status();
  }

  /** Retire ces assemblages et ces pièces de la partie et de la carte. */
  private drop(pieces: BuildPiece[], joints: Joint[] = []): void {
    if (joints.length) removeJoints(game, this.map.def.id, joints.map((j) => j.id));
    const ids = pieces.map((p) => p.id);
    if (ids.length) removeBuildPieces(game, this.map.def.id, ids);
    for (const id of ids) this.map.removeBuild(id);
    this.map.sortBuilds();
  }

  /** Remet ces pièces et ces assemblages (avec leur identifiant) dans la partie et sur la carte. */
  private restore(pieces: BuildPiece[], joints: Joint[] = []): void {
    for (const p of addBuildPieces(game, this.map.def.id, pieces)) this.map.placeBuild(p);
    if (joints.length) addJoints(game, this.map.def.id, joints);
    this.map.sortBuilds();
  }

  /** Change la hauteur des pièces d'un geste (dans son sens, ou à rebours pour annuler). */
  private move(moves: Move[] | undefined, forward: boolean): void {
    if (!moves?.length) return;
    for (const m of moves) moveBuildPiece(game, this.map.def.id, m.id, forward ? m.to : m.from);
    this.map.sortBuilds();
  }

  private push(op: Op): void {
    this.undoStack.push(op);
    this.redoStack.length = 0;
  }

  /** Ctrl+Z : défait le dernier geste. */
  private undo(): void {
    const op = this.undoStack.pop();
    if (!op) return this.notice('Rien à annuler.');
    if (op.kind === 'add') {
      this.drop(op.pieces, op.joints);
      this.move(op.moves, false);
      if (op.replaced) this.restore(op.replaced, []);
    } else {
      this.move(op.moves, false);
      this.restore(op.pieces, op.joints);
    }
    this.redoStack.push(op);
    this.status();
  }

  /** Ctrl+Y : refait le dernier geste défait. */
  private redo(): void {
    const op = this.redoStack.pop();
    if (!op) return this.notice('Rien à refaire.');
    if (op.kind === 'add') {
      if (op.replaced) this.drop(op.replaced, []);
      this.move(op.moves, true);
      this.restore(op.pieces, op.joints);
    } else {
      this.drop(op.pieces, op.joints);
      this.move(op.moves, true);
    }
    this.undoStack.push(op);
    this.status();
  }

  /** La zone (cm, sur la grille) entre deux points du monde (px), au sol. */
  private areaOf(a: { x: number; y: number }, b: { x: number; y: number }): Area {
    const g = BUILD.grid;
    const x0 = Math.floor((Math.min(a.x, b.x) * CM_PER_PX) / g) * g;
    const y0 = Math.floor((Math.min(a.y, b.y) * CM_PER_PX) / g) * g;
    const x1 = Math.ceil((Math.max(a.x, b.x) * CM_PER_PX) / g) * g;
    const y1 = Math.ceil((Math.max(a.y, b.y) * CM_PER_PX) / g) * g;
    return { x: x0, y: y0, w: Math.max(g, x1 - x0), d: Math.max(g, y1 - y0) };
  }

  /**
   * « Enregistrer comme plan » : les pièces de la zone choisie deviennent un plan (world/build.ts `planOf`), écrit dans
   * src/content/plans/<nom>.json par le serveur de développement (vite.config.ts) ; il entre aussitôt au catalogue. Sans serveur
   * (le jeu construit), il ne vaut que pour cette session, et on le dit. Renvoie le nom du fichier du plan, s'il est fait.
   */
  async savePlan(name: string): Promise<string | undefined> {
    const label = name.trim();
    if (!label) return this.say('Donne un nom au plan.');
    if (!this.selection) return this.say("Choisis d'abord une zone.");
    const plan = planOf(this.pieces, this.selection, label, this.joints);
    if (!plan) return this.say('Rien dans cette zone.');
    const key = planKeyOf(label);
    if (!key) return this.say('Ce nom ne fait pas un nom de fichier.');
    putBuildPlan(key, plan);
    try {
      const r = await fetch('/__construire/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, plan }) });
      if (!r.ok) throw new Error(await r.text());
      return this.say(`Plan « ${label} » enregistré (${plan.pieces.length} pièces).`, key);
    } catch {
      return this.say(`Plan « ${label} » gardé pour cette session seulement (pas de serveur de développement).`, key);
    }
  }

  private say(text: string, key?: string): string | undefined {
    this.notice(text);
    this.status();
    return key;
  }

  /** Le fantôme (ce qu'on a en main, en transparence, plus pâle si la pose est refusée), son emprise, la zone choisie. */
  private draw(at: { x: number; y: number }): void {
    const g = this.gfx.clear();
    const a = this.aim;
    if (a) {
      a.pieces.forEach((p, i) => {
        const look = buildLook(this.scene, p);
        // calé comme il le sera, sur le dessus dessiné de ce qui le porte
        const o = this.map.offsetOf(p);
        this.ghosts.show(i, look.key, look.x + o.dx, look.y + o.down, DEPTH.prompt - 3, a.ok ? BUILD.ghost : BUILD.refused, look.frame);
      });
      this.ghosts.hideFrom(a.pieces.length);
      // l'emprise de la base, à sa hauteur : où la pièce touche ce qui la porte
      g.lineStyle(1, a.ok ? 0xf3d9b0 : 0xd06040, 0.8);
      for (const p of a.pieces) {
        const b = boxOf(p);
        g.strokeRect(b.x / CM_PER_PX, (b.y - b.z) / CM_PER_PX, b.w / CM_PER_PX, b.d / CM_PER_PX);
      }
    } else this.ghosts.hideFrom(0);
    // la jonction visée avec un assemblage : un cercle clair si les pièces vont ensemble, rouge sinon
    const ja = this.jointAim?.junction;
    if (ja) {
      g.lineStyle(1, this.jointAim!.why ? 0xd06040 : 0x9fe07a, 1);
      g.strokeCircle(ja.x, ja.y, 3);
    }
    const sel = this.dragFrom ? this.areaOf(this.dragFrom, at) : this.selection;
    if (sel) {
      g.lineStyle(1, 0x9fd0ff, 0.9);
      g.strokeRect(sel.x / CM_PER_PX, sel.y / CM_PER_PX, sel.w / CM_PER_PX, sel.d / CM_PER_PX);
    }
  }

  // --- le niveau affiché d'une maison à étages (N ; chantier « maison du coq », CONCEPTION « L'étage ») ---

  /** Le niveau affiché : son rang dans `levels()`, ou rien (tout). */
  private level?: number;

  /** Les niveaux des pièces posées (les planchers : world/decks.ts). */
  private levels(): number[] {
    return storeyHeights(openDecks(this.shown), INTERIOR.storey, mobility.step);
  }

  /** N : tout, puis chaque niveau, puis tout. Une maison d'un seul niveau : toujours tout. */
  private nextLevel(): void {
    const n = this.levels().length;
    this.level = n < 2 ? undefined : this.level === undefined ? 0 : this.level + 1 < n ? this.level + 1 : undefined;
    this.showLevel();
    this.status();
  }

  /** Le plancher du niveau affiché et celui du niveau d'au-dessus (cm). */
  private span(): { floor: number; ceiling: number } | undefined {
    if (this.level === undefined) return undefined;
    const lv = this.levels();
    return { floor: lv[this.level] ?? 0, ceiling: lv[this.level + 1] ?? Infinity };
  }

  /** Une pièce est du niveau affiché (la règle des intérieurs : elle monte jusqu'à son plancher et commence sous celui d'au-dessus). */
  private ofLevel(q: BuildPlaced): boolean {
    const s = this.span();
    if (!s) return true;
    const b = boxOf(q);
    return (s.floor === 0 || b.z + b.h >= s.floor) && b.z < s.ceiling;
  }

  /** On ne vise que sous le plancher du niveau d'au-dessus : une table posée « à l'étage » tombe sur le plancher, pas sur le toit. */
  private belowCeiling(q: BuildPlaced): boolean {
    const s = this.span();
    return !s || boxOf(q).z < s.ceiling;
  }

  /** Le point du monde vu à l'écran : au niveau affiché, ce qui est à la hauteur de son plancher (soulevé de floor / 5 px). */
  private seenAt(x: number, y: number): { x: number; y: number } {
    const at = pick(this.map.def, x, y);
    const s = this.span();
    return s ? { x: at.x, y: at.y + s.floor / CM_PER_PX } : at;
  }

  /** Les pièces du niveau affiché en entier, les autres presque effacées ; tout, hors du mode. */
  showLevel(): void {
    for (const b of this.map.builds) {
      const a = !this.active || this.ofLevel(b.piece) ? 1 : BUILD.otherLevel;
      for (const o of [b.image, ...(b.slices ?? [])]) o.setAlpha(a);
    }
  }

  /** Ce que le catalogue affiche. */
  status(): void {
    this.showLevel();
    const t = this.tool;
    const tool = !t ? 'rien' : t.kind === 'select' ? 'choisir une zone' : t.kind === 'joint' ? JOINT_NAMES[t.type] : t.kind === 'plan' ? `plan « ${buildPlans[t.plan]?.name ?? t.plan} »` : refName(t.piece);
    const hint = t?.kind === 'joint' ? (this.jointAim?.junction ? (this.jointAim.why ?? 'Elles vont ensemble : clic gauche.') : 'Vise une jonction.') : undefined;
    const level = this.level === undefined ? 'Tout' : this.level === 0 ? 'Rez-de-chaussée' : `Étage ${this.level}`;
    this.emit({ active: this.active, tool, age: this.age, step: this.step, selection: this.selection, count: this.pieces.length, undo: this.undoStack.length, redo: this.redoStack.length, level, ...(hint ? { hint } : {}) });
  }
}

/** Une pièce de toit (le pan de toit) : elle ne se heurte à rien. */
function isRoof(p: BuildPlaced): boolean {
  return 'prop' in p.piece && !!props[p.piece.prop].roof;
}

/** Deux boîtes se recouvrent en volume (emprise et hauteur). */
function intersects(a: Box3, b: Box3): boolean {
  return overlaps(a, b) && a.z < b.z + b.h && b.z < a.z + a.h;
}

/** Le nom de fichier d'un plan, d'après son nom affiché : minuscules sans accent, tirets (« Mur d'essai » -> `mur-d-essai`). */
function planKeyOf(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
