// Le mode construction (le bac à sable, ?construire) : caméra libre, une pièce du catalogue en fantôme sous la souris, accrochée sur
// le dessus de ce qu'il y a dessous ; clic gauche pose, clic droit retire (Maj : avec tout ce qui repose dessus) ; R tourne ; T et G
// montent et descendent d'un cran ; Ctrl+Z, Ctrl+Y ; une zone choisie s'enregistre comme plan, et un plan se pose d'un coup.
// Ni force, ni aide, ni ordre de chantier : on pose ce qu'on veut, où l'on veut. Tout passe par GameState (addBuildPieces,
// removeBuildPieces), donc tout est sauvegardé et se retrouve en jeu. Le calcul (boîtes, hauteur, porteurs) est dans world/build.ts.

import Phaser from 'phaser';
import { BUILD, DEPTH } from '../config';
import { items, props } from '../content';
import { buildPlans, putBuildPlan } from '../content/buildPlans';
import { CM_PER_PX } from '../content/gabarit';
import type { BuildPlaced, BuildRef, Natural } from '../content/types';
import type { BuildCommand, BuildStatus } from '../events';
import type { Player } from '../entities/Player';
import { addBuildPieces, game, mapState, removeBuildPieces, type BuildPiece } from '../state';
import { aimAt, boxOf, carriedBy, overlaps, planOf, planPieces, planSize, refName, sizeOf, turned, withAbove, type Area, type Box3 } from '../world/build';
import { buildLook } from '../world/buildView';
import type { GameMap } from '../world/GameMap';
import { drawNatural } from '../world/natural';
import { Ghosts } from './ghost';

/** Ce qu'on a en main : une pièce (avec son sens, ses réglages de forme naturelle et son tirage), un plan, ou l'outil de zone. */
type Tool =
  | { kind: 'piece'; piece: BuildRef; view: number; natural?: { form?: 0 | 1; size?: number }; drawn?: Natural; variant?: number }
  | { kind: 'plan'; plan: string; variants: (number | undefined)[] }
  | { kind: 'select' };

/** Un geste qu'on peut annuler : des pièces posées, ou retirées (elles reviennent avec leur identifiant). */
type Op = { kind: 'add' | 'remove'; pieces: BuildPiece[] };

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
  private aim?: { pieces: BuildPlaced[]; ok: boolean; why?: string };

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
    const point = (p: Phaser.Input.Pointer) => this.scene.cameras.main.getWorldPoint(p.x, p.y);
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
    this.ghosts.hideFrom(0);
    this.gfx.clear();
    this.dragFrom = undefined;
    this.clicks.length = 0;
    this.scene.cameras.main.startFollow(this.player.actor, true, 0.15, 0.15);
    this.status();
  }

  /** Une commande du catalogue (le mode est déjà ouvert). */
  command(cmd: BuildCommand): void {
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
        break;
      }
      case 'select':
        this.tool = { kind: 'select' };
        break;
      case 'none':
        this.tool = undefined;
        break;
      case 'save-plan':
        void this.savePlan(cmd.name);
        return;
      case 'undo':
        return this.undo();
      case 'redo':
        return this.redo();
      case 'toggle':
        return;
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
      const speed = (BUILD.camera * (input.shiftDown() ? BUILD.fast : 1) * delta) / 1000 / cam.zoom;
      cam.scrollX += dir.x * speed;
      cam.scrollY += dir.y * speed;
    }
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
    const at = cam.getWorldPoint(pointer.x, pointer.y);
    for (const c of this.clicks.splice(0)) {
      if (c.button === 'right') this.remove(c.x, c.y, c.shift);
      else {
        this.updateAim(c.x, c.y);
        this.place();
      }
    }
    this.updateAim(at.x, at.y);
    this.draw(at);
  }

  /** R : la pièce en main tourne d'un quart de tour (la pièce de bois : est-ouest, nord-sud, debout). */
  private turn(): void {
    const t = this.tool;
    if (t?.kind !== 'piece') return;
    const next = turned(t.piece, t.view);
    t.piece = next.ref;
    t.view = next.view;
    this.status();
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

  /** Où irait ce qu'on a en main, visé au point (px du monde) : la pièce ou le plan entier, accroché, et si la pose est permise. */
  private updateAim(px: number, py: number): void {
    const t = this.tool;
    this.aim = undefined;
    if (!t || t.kind === 'select') return;
    const cx = px * CM_PER_PX;
    const cy = py * CM_PER_PX;
    let list: BuildPlaced[];
    if (t.kind === 'piece') {
      const b = aimAt(this.pieces, sizeOf(t.piece, t.view), cx, cy, this.step);
      list = [{ piece: t.piece, x: b.x, y: b.y, z: b.z, view: t.view, ...(t.drawn ? { natural: t.drawn } : {}), ...(t.variant !== undefined ? { variant: t.variant } : {}) }];
    } else {
      const plan = buildPlans[t.plan];
      if (!plan) return;
      const b = aimAt(this.pieces, planSize(plan), cx, cy, this.step);
      list = planPieces(plan, b).map((p, i) => ({ ...p, ...(t.variants[i] !== undefined ? { variant: t.variants[i] } : {}) }));
    }
    const why = this.refusal(list);
    this.aim = { pieces: list, ok: !why, why };
  }

  /** Pourquoi on ne peut pas poser ces pièces : hors de la carte, dans une autre pièce, sur Xéros ; sinon rien. */
  private refusal(list: BuildPlaced[]): string | undefined {
    const W = this.map.width * CM_PER_PX;
    const H = this.map.height * CM_PER_PX;
    const others = this.pieces.map(boxOf);
    const body = this.player.actor.body as Phaser.Physics.Arcade.Body;
    const feet = { x: body.left * CM_PER_PX, y: body.top * CM_PER_PX, w: body.width * CM_PER_PX, d: body.height * CM_PER_PX };
    for (const p of list) {
      const b = boxOf(p);
      if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.d > H) return 'Hors de la carte.';
      if (others.some((o) => intersects(o, b))) return 'Une autre pièce est déjà là.';
      if (b.z < BUILD.high && overlaps(b, feet)) return 'Xéros est là.';
    }
    return undefined;
  }

  /** Clic gauche : pose la pièce (ou le plan) là où le montre le fantôme ; la prochaine pose tire une nouvelle forme, un nouveau tirage. */
  private place(): void {
    const a = this.aim;
    const t = this.tool;
    if (!a || !t || t.kind === 'select') return;
    if (!a.ok) return this.notice(a.why!);
    const added = addBuildPieces(game, this.map.def.id, a.pieces);
    for (const p of added) this.map.placeBuild(p);
    this.map.sortBuilds();
    this.push({ kind: 'add', pieces: structuredClone(added) });
    if (t.kind === 'piece') {
      t.drawn = this.natural(t);
      t.variant = drawVariant(t.piece);
    } else {
      const plan = buildPlans[t.plan];
      if (plan) t.variants = plan.pieces.map((p) => drawVariant(p.piece));
    }
    this.status();
  }

  /** La pièce visible sous le point (px du monde) : la plus en avant dont un pixel opaque est là. */
  pieceAt(px: number, py: number): BuildPiece | undefined {
    const sorted = [...this.map.builds].sort((a, b) => b.image.depth - a.image.depth);
    for (const b of sorted) {
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

  /** Clic droit : retire la pièce visée, refusé si elle en porte d'autres ; avec Maj, elle et tout ce qui repose dessus. */
  private remove(px: number, py: number, all: boolean): void {
    const p = this.pieceAt(px, py);
    if (!p) return;
    if (!all && carriedBy(this.pieces, p.id).length) return this.notice('Elle porte quelque chose : Maj + clic droit retire tout.');
    const gone = structuredClone(all ? withAbove(this.pieces, p.id) : [p]);
    this.drop(gone);
    this.push({ kind: 'remove', pieces: gone });
    this.status();
  }

  /** Retire ces pièces de la partie et de la carte. */
  private drop(pieces: BuildPiece[]): void {
    const ids = pieces.map((p) => p.id);
    removeBuildPieces(game, this.map.def.id, ids);
    for (const id of ids) this.map.removeBuild(id);
    this.map.sortBuilds();
  }

  /** Remet ces pièces (avec leur identifiant) dans la partie et sur la carte. */
  private restore(pieces: BuildPiece[]): void {
    for (const p of addBuildPieces(game, this.map.def.id, pieces)) this.map.placeBuild(p);
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
    if (op.kind === 'add') this.drop(op.pieces);
    else this.restore(op.pieces);
    this.redoStack.push(op);
    this.status();
  }

  /** Ctrl+Y : refait le dernier geste défait. */
  private redo(): void {
    const op = this.redoStack.pop();
    if (!op) return this.notice('Rien à refaire.');
    if (op.kind === 'add') this.restore(op.pieces);
    else this.drop(op.pieces);
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
    const plan = planOf(this.pieces, this.selection, label);
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
        this.ghosts.show(i, look.key, look.x, look.y, DEPTH.prompt - 3, a.ok ? BUILD.ghost : BUILD.refused, look.frame);
      });
      this.ghosts.hideFrom(a.pieces.length);
      // l'emprise de la base, à sa hauteur : où la pièce touche ce qui la porte
      g.lineStyle(1, a.ok ? 0xf3d9b0 : 0xd06040, 0.8);
      for (const p of a.pieces) {
        const b = boxOf(p);
        g.strokeRect(b.x / CM_PER_PX, (b.y - b.z) / CM_PER_PX, b.w / CM_PER_PX, b.d / CM_PER_PX);
      }
    } else this.ghosts.hideFrom(0);
    const sel = this.dragFrom ? this.areaOf(this.dragFrom, at) : this.selection;
    if (sel) {
      g.lineStyle(1, 0x9fd0ff, 0.9);
      g.strokeRect(sel.x / CM_PER_PX, sel.y / CM_PER_PX, sel.w / CM_PER_PX, sel.d / CM_PER_PX);
    }
  }

  /** Ce que le catalogue affiche. */
  status(): void {
    const t = this.tool;
    const tool = !t ? 'rien' : t.kind === 'select' ? 'choisir une zone' : t.kind === 'plan' ? `plan « ${buildPlans[t.plan]?.name ?? t.plan} »` : refName(t.piece);
    this.emit({ active: this.active, tool, step: this.step, selection: this.selection, count: this.pieces.length, undo: this.undoStack.length, redo: this.redoStack.length });
  }
}

/** Deux boîtes se recouvrent en volume (emprise et hauteur). */
function intersects(a: Box3, b: Box3): boolean {
  return overlaps(a, b) && a.z < b.z + b.h && b.z < a.z + a.h;
}

/** Le nom de fichier d'un plan, d'après son nom affiché : minuscules sans accent, tirets (« Mur d'essai » -> `mur-d-essai`). */
export function planKeyOf(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
