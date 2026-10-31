import Phaser from 'phaser';
import { DEPTH, INTERACT, SITE, TILE, UI, ZOOM_STEPS } from '../config';
import { items, plans, props, wood } from '../content';
import { heldMass, woodMass } from '../content/mass';
import type { Corner, Natural, PlanDef, WoodPiece } from '../content/types';
import type { Player } from '../entities/Player';
import type { Strength } from '../entities/Strength';
import {
  changeObject,
  changeSpawned,
  clearHeld,
  dropItem,
  game,
  held,
  learnPlan,
  mapState,
  placeSitePiece,
  plantSiteStake,
  pullSiteStake,
  release,
  removeSite,
  spawnObject,
  startSite,
  take,
  type Site,
} from '../state';
import type { Box, GameMap, Interactable, PlacedProp } from '../world/GameMap';
import { offerOf } from '../world/offer';
import { beamLength, beamRefusal, refusal, type Accepts, type BeamRule } from '../world/places';
import { acceptOf, cornerPoint, footprintBox, openSlots, placeCorner, placeGround, progress, statusLine, type PlanSlot } from '../world/sitePlan';
import { uprightOf, WOOD_PIECE } from '../world/woodPiece';
import { BEAM_SIZE } from '../world/woodShape';
import { woodTexture } from '../world/woodTexture';
import { Ghosts } from './ghost';

const CORNERS: Corner[] = ['nw', 'ne', 'se', 'sw'];

const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Ce qu'a donné l'essai de planter un piquet : refusé (avec le message), ou possible (`commit` le fait, une fois l'effort payé). */
export type PlantResult = { ok: false; message: string } | { ok: true; commit: () => void };

/** Ce qu'a donné l'essai de poser une pièce : refusé (avec le message), ou possible (`kg` : la masse à dresser, 0 si rien à soulever ; `commit` le fait). */
export type PlaceResult = { ok: false; message: string } | { ok: true; kg: number; commit: () => void };

/** Ce qu'a donné l'essai de dresser une pièce avec de l'aide : refusé, ou possible (`kg` : la masse de la poutre ; `commit` la dresse). */
export type HelpResult = { ok: false; message: string } | { ok: true; kg: number; commit: () => void };

/**
 * Les chantiers : tracer l'emprise d'un plan avec des piquets, puis y poser les pièces, étape par étape. Tout le plan est dans
 * plans.json (en cm) ; l'état est dans GameState (`sites` de la carte). Les places du plan sont celles du moteur commun
 * (world/places.ts) : l'étape en cours montre ses places en fantôme, la place visée est mise en avant quand ce qu'on tient lui
 * convient, et une pièce qui ne convient pas est refusée avec le message du plan (« Il faut une pierre plate. »).
 * Une place dont la pièce est une poutre (`accepts.wood`) vérifie les réglages de la pièce en main. Si cette poutre pèse plus que
 * Xéros ne porte, la place accepte l'aide de la mère : la poutre couchée au sol près de la place (son bout à moins d'une case)
 * est dressée sans être portée (`help`). La règle est celle du plan, pas d'une pièce : toute place trop lourde pour Xéros.
 * Ne lit pas le clavier : la scène dit quand.
 */
export class SiteSystem {
  private readonly ghosts: Ghosts;
  /** Images des piquets plantés. */
  private parts: Phaser.GameObjects.GameObject[] = [];
  /** Une ligne d'état par chantier. */
  private texts: { site: Site; plan: PlanDef; text: Phaser.GameObjects.Text }[] = [];
  /** Ce qui a servi à dessiner : les chantiers de la carte et la place visée. Changé, tout est redessiné. */
  private drawn = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    /** Corps où l'on ne trace rien (les personnages). */
    private readonly others: Phaser.Physics.Arcade.Body[],
    /** La force de Xéros : ce qu'il porte décide des places qui se remplissent avec de l'aide. */
    private readonly strength: Strength,
  ) {
    this.ghosts = new Ghosts(scene, SITE.ghost);
  }

  private get sites(): Site[] {
    return mapState(game, this.map.def.id).sites;
  }

  /** Ce piquet (objet possédable) trace-t-il un plan ? */
  static traces(item: string): boolean {
    return Object.values(plans).some((p) => p.stake === item);
  }

  /** À appeler à chaque image : redessine les chantiers quand ils ont changé, montre la ligne d'état de celui qui est tout près. */
  update(player: Player, active: boolean): void {
    const aimed = active ? this.aimed(player) : undefined;
    const key = `${JSON.stringify(this.sites)}|${aimed ? `${aimed.site.id}:${aimed.slot.id}` : ''}`;
    if (key !== this.drawn) {
      this.drawn = key;
      this.draw(aimed);
    }
    for (const { site, plan, text } of this.texts) {
      const b = footprintBox(site, plan);
      const d = Math.hypot(Math.max(b.left - player.actor.x, 0, player.actor.x - b.right), Math.max(b.top - player.actor.y, 0, player.actor.y - b.bottom));
      text.setVisible(d < SITE.near);
    }
  }

  /** Ce que E peut viser : les piquets d'un tracé qu'on reprend, et, avec une pièce en main, les places à remplir de l'étape en cours. */
  interactables(): Interactable[] {
    const list: Interactable[] = [];
    const holding = !!held(game);
    for (const site of this.sites) {
      const plan = plans[site.plan];
      if (!site.born) {
        for (const corner of site.stakes) {
          const p = cornerPoint(site, plan, corner);
          list.push({ x: p.x, y: p.y - 2, top: p.y - this.map.textureSize(props[plan.planted].image).h, action: { kind: 'stake', site: site.id, corner } });
        }
      } else {
        for (const slot of openSlots(site, plan)) {
          const g = placeGround(site, slot.place, plan.steps[slot.step]);
          // trop lourd pour Xéros : E maintenu appelle la mère, quoi qu'il tienne ; sinon la pièce se pose si on la tient
          if (this.needsHelp(plan, slot)) list.push({ x: g.x, y: g.y, top: g.y - 12, action: { kind: 'site-help', site: site.id, place: slot.id } });
          else if (holding) list.push({ x: g.x, y: g.y, top: g.y - 12, action: { kind: 'site-place', site: site.id, place: slot.id } });
        }
      }
    }
    return list;
  }

  /**
   * Le chantier et la place de l'étape en cours (jouable) que vise Xéros, si cela lui convient : avec ce qu'il tient, ou, pour
   * une place qui se dresse avec de l'aide, quand une poutre qui convient est couchée près d'elle.
   */
  private aimed(player: Player): { site: Site; slot: PlanSlot } | undefined {
    const what = held(game);
    const probe = player.probe(INTERACT.reach);
    let best: { site: Site; slot: PlanSlot } | undefined;
    let bestD: number = INTERACT.radius;
    for (const site of this.sites) {
      if (!site.born) continue;
      const plan = plans[site.plan];
      for (const slot of openSlots(site, plan)) {
        const g = placeGround(site, slot.place, plan.steps[slot.step]);
        const d = Math.hypot(g.x - probe.x, g.y - probe.y);
        if (d >= bestD) continue;
        const ok = this.needsHelp(plan, slot) ? !!this.beamNear(site, plan, slot) : !!what && !this.refusalOf(plan, slot, what);
        if (!ok) continue;
        best = { site, slot };
        bestD = d;
      }
    }
    return best;
  }

  /** Pourquoi cette place refuse ce qu'on tient (son message), ou undefined si elle l'accepte (étape à venir : refusée aussi). */
  private refusalOf(plan: PlanDef, slot: PlanSlot, what: NonNullable<ReturnType<typeof held>>): string | undefined {
    const step = plan.steps[slot.step];
    if (step.soon) return 'Cette étape viendra plus tard.';
    const rule = acceptOf(step, slot.place)!;
    return refusal(rule as Accepts & { refuse: string }, offerOf(what));
  }

  /** Redessine : piquets plantés, coins du tracé en fantôme, places de l'étape en cours en fantôme, lignes d'état. */
  private draw(aimed: { site: Site; slot: PlanSlot } | undefined): void {
    for (const p of this.parts) p.destroy();
    for (const t of this.texts) t.text.destroy();
    this.parts = [];
    this.texts = [];
    let n = 0;
    for (const site of this.sites) {
      const plan = plans[site.plan];
      const planted = props[plan.planted].image;
      const stake = this.map.textureSize(planted);
      for (const corner of CORNERS) {
        const p = cornerPoint(site, plan, corner);
        if (site.stakes.includes(corner)) {
          this.parts.push(this.scene.add.image(p.x, p.y, planted).setOrigin(0.5, 1).setDepth(p.y));
        } else if (!site.born) {
          this.ghosts.show(n++, planted, p.x - stake.w / 2, p.y, p.y);
        }
      }
      if (!site.born) continue;
      for (const slot of openSlots(site, plan)) {
        const def = props[slot.place.piece];
        const c = placeCorner(site, slot.place);
        const alpha = aimed?.site.id === site.id && aimed.slot.id === slot.id ? SITE.aimed : SITE.ghost;
        // une place qui demande une poutre montre la pièce attendue, dessinée comme la pièce de bois dressée ; les autres, leur objet
        const rule = this.ruleOf(plan, slot);
        if (rule) this.ghosts.show(n++, woodTexture(this.scene, this.beamOf(rule, 'up')), c.x, c.y, c.y, alpha, '0');
        else this.ghosts.show(n++, def.image, c.x, c.y, def.layer === 'floor' ? DEPTH.floor + 0.01 : c.y, alpha);
      }
      // la ligne d'état, sous le chantier
      const bottom = site.y + Math.max(...Object.values(plan.steps).flatMap((s) => Object.values(s.places).map((p) => p.at[1]))) / 5;
      const text = this.scene.add
        .text(site.x + plan.footprint.w / 10, bottom + 12, statusLine(site, plan), { fontFamily: UI.font, fontSize: '8px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 })
        .setOrigin(0.5, 0)
        // net au palier de zoom le plus proche
        .setResolution(ZOOM_STEPS.max)
        .setDepth(DEPTH.prompt - 3)
        .setVisible(false);
      this.texts.push({ site, plan, text });
    }
    this.ghosts.hideFrom(n);
  }

  // --- planter les piquets ---

  /** Le plan que trace ce piquet, parmi ceux que Xéros connaît. */
  private knownPlan(item: string): string | undefined {
    return Object.keys(plans).find((k) => plans[k].stake === item && game.knownPlans.includes(k));
  }

  /**
   * Espace avec un piquet en main : le planter. Le premier fixe le coin nord-ouest du tracé, au point que regarde Xéros ; les
   * suivants ne se plantent qu'aux coins en fantôme (le plus près, à `SITE.snap` px). Au quatrième, le chantier naît si toute
   * l'emprise est libre, sinon le piquet reste en main. Sans plan connu, Xéros ne sait pas quoi tracer.
   */
  plantStake(player: Player, item: string): PlantResult {
    const key = this.knownPlan(item);
    if (!key) return { ok: false, message: 'Xéros ne sait pas encore quoi tracer.' };
    const plan = plans[key];
    const probe = player.probe(INTERACT.reach);
    const mapId = this.map.def.id;
    const tracing = this.sites.find((s) => !s.born && s.plan === key);
    if (tracing) {
      const corner = CORNERS.filter((c) => !tracing.stakes.includes(c))
        .map((c) => ({ c, d: Math.hypot(cornerPoint(tracing, plan, c).x - probe.x, cornerPoint(tracing, plan, c).y - probe.y) }))
        .filter((q) => q.d < SITE.snap)
        .sort((a, b) => a.d - b.d)[0]?.c;
      if (!corner) return { ok: false, message: 'Les piquets se plantent aux coins du tracé.' };
      // le dernier piquet fait naître le chantier : toute l'emprise doit être libre
      if (tracing.stakes.length === 3 && !this.empriseFree(tracing, plan)) return { ok: false, message: 'Il y a quelque chose dans le passage.' };
      return { ok: true, commit: () => this.spend(item, () => plantSiteStake(game, mapId, tracing.id, corner)) };
    }
    const x = Math.round(probe.x);
    const y = Math.round(probe.y);
    if (this.sites.some((s) => overlaps({ left: x, right: x + 1, top: y, bottom: y + 1 }, grow(footprintBox(s, plans[s.plan]), 8)))) return { ok: false, message: 'Il y a déjà un chantier ici.' };
    if (!this.clear({ left: x - 2, right: x + 2, top: y - 3, bottom: y }, false)) return { ok: false, message: 'Pas la place ici.' };
    return { ok: true, commit: () => this.spend(item, () => startSite(game, mapId, key, x, y)) };
  }

  /** Le piquet quitte la main qui le tient, puis le chantier change. */
  private spend(item: string, change: () => void): void {
    if (game.both && 'item' in game.both && game.both.item === item) clearHeld(game, 'both');
    else {
      const slot = [game.active, 1 - game.active].find((i) => { const h = game.hands[i]; return !!h && 'item' in h && h.item === item; });
      if (slot !== undefined) clearHeld(game, slot as 0 | 1);
    }
    change();
  }

  /** Toute l'emprise du chantier est libre : carte, cases bloquantes (eau, mur), objets, tas, objets au sol, personnages. Xéros ne compte pas. */
  private empriseFree(site: Site, plan: PlanDef): boolean {
    return this.clear(footprintBox(site, plan), true);
  }

  /** Le rectangle est libre pour un tracé : rien de bloquant, pas de tas, ni d'objet posé dessus. */
  private clear(box: Box, wide: boolean): boolean {
    if (!this.map.areaFree(box, wide ? this.others : [])) return false;
    for (const p of this.map.piles) {
      for (const id of p.pile.places) {
        const b = p.def.places[id].body;
        if (b && overlaps(box, { left: p.pile.x + b.x, top: p.pile.y + b.y, right: p.pile.x + b.x + b.w, bottom: p.pile.y + b.y + b.h })) return false;
      }
    }
    if (this.map.ground.some((g) => g.item.x >= box.left && g.item.x <= box.right && g.item.y >= box.top && g.item.y <= box.bottom + 4)) return false;
    // un objet sans collision, posé là (une pierre plate, une planchette) : pas à plat sur le sol, c'est un objet
    return !this.map.props.some((p) => p.def.layer !== 'floor' && !p.box && overlaps(box, { left: p.x, top: p.y - p.image.height, right: p.x + p.image.width, bottom: p.y }));
  }

  /** E sur un piquet d'un tracé : le reprendre. Renvoie false si les mains sont pleines. */
  takeStake(siteId: number, corner: Corner): boolean {
    const site = this.sites.find((s) => s.id === siteId);
    if (!site || site.born) return true;
    const item = plans[site.plan].stake;
    if (!take(game, { item }, items[item].hands)) return false;
    pullSiteStake(game, this.map.def.id, siteId, corner);
    return true;
  }

  // --- poser les pièces ---

  /**
   * E sur une place du chantier avec ce qu'on tient : refusée avec le message du plan (rien ne change, la pièce reste en main), ou
   * possible. `commit` pose la pièce (un objet né à la place du plan) ; si la place est celle d'un coin, le piquet de ce coin est
   * arraché et retombe au sol à côté, réutilisable. `kg` : la masse d'une poutre à dresser (la scène fait payer l'effort), sinon 0.
   */
  tryPlace(siteId: number, placeId: string): PlaceResult | undefined {
    const site = this.sites.find((s) => s.id === siteId);
    const what = held(game);
    if (!site || !what) return undefined;
    const plan = plans[site.plan];
    const slot = openSlots(site, plan).find((s) => s.id === placeId);
    if (!slot) return undefined;
    const why = this.refusalOf(plan, slot, what);
    if (why) return { ok: false, message: why };
    const beam = !!acceptOf(plan.steps[slot.step], slot.place)?.wood;
    return {
      ok: true,
      kg: beam ? heldMass(what) : 0,
      commit: () => {
        release(game);
        this.lay(site, plan, slot, beam && 'wood' in what ? what.wood : undefined, what.natural);
      },
    };
  }

  /**
   * La pièce de la place est née sur la carte, notée dans le chantier avec la pièce de bois d'où elle vient (`from`, si c'en est
   * une). Une poutre est la pièce de bois elle-même, dressée : ce qu'on voit est ce qu'on a posé.
   */
  private lay(site: Site, plan: PlanDef, slot: PlanSlot, from?: WoodPiece, stone?: Natural): void {
    const mapId = this.map.def.id;
    const c = placeCorner(site, slot.place);
    // une pierre naturelle posée garde sa forme et sa taille : le dé est la même pierre
    const natural = props[slot.place.piece]?.natural ? (stone ?? { form: 0, size: 100 }) : undefined;
    const o = from ? spawnObject(game, mapId, WOOD_PIECE, c.x, c.y, { wood: uprightOf(from) }) : spawnObject(game, mapId, slot.place.piece, c.x, c.y, { natural });
    this.map.placeProp(o, { spawned: true, natural: o.natural });
    placeSitePiece(game, mapId, site.id, slot.id, o.id, from);
    const corner = slot.place.corner;
    if (corner && site.stakes.includes(corner)) {
      pullSiteStake(game, mapId, site.id, corner);
      // le piquet arraché retombe à côté, sur le sol
      const p = cornerPoint(site, plan, corner);
      this.map.placeGround(dropItem(game, mapId, plan.stake, Math.round(p.x + 7), Math.round(p.y + 4)));
    }
  }

  // --- dresser avec de l'aide ---

  /** La poutre qu'une place demande, en pièce de bois (diamètre du normal ; couchée pour l'exemple, la masse ne dépend pas du sens ; `up` pour la montrer dressée). */
  private beamOf(rule: BeamRule, axis: WoodPiece['axis'] = 'ew'): WoodPiece {
    return { size: BEAM_SIZE, length: rule.length, shape: 'round', hewn: wood.hew.faces * wood.hew.perFace, axis };
  }

  /** La poutre demandée par une place jouable de l'étape en cours, ou undefined (une autre pièce, ou une étape « à venir »). */
  private ruleOf(plan: PlanDef, slot: PlanSlot): BeamRule | undefined {
    const step = plan.steps[slot.step];
    return step.soon ? undefined : acceptOf(step, slot.place)?.wood;
  }

  /** La place demande une poutre plus lourde que ce que Xéros porte : elle se dresse avec de l'aide (règle commune à toutes les places). */
  private needsHelp(plan: PlanDef, slot: PlanSlot): boolean {
    const rule = this.ruleOf(plan, slot);
    return !!rule && woodMass(this.beamOf(rule)) > this.strength.carry + 1e-9;
  }

  /** Les deux bouts d'une pièce couchée, au sol (px) : les extrémités de son image le long de son axe, sur la ligne de sa base. */
  private endsOf(p: PlacedProp): { x: number; y: number }[] {
    const { width, height } = p.image;
    return p.def.wood!.axis === 'ew'
      ? [{ x: p.x, y: p.baseY }, { x: p.x + width, y: p.baseY }]
      : [{ x: p.baseX, y: p.y - height }, { x: p.baseX, y: p.y }];
  }

  /** La poutre qui convient à la place, couchée au sol, dont un bout est à moins d'une case de la place (la plus proche), s'il y en a une. */
  private beamNear(site: Site, plan: PlanDef, slot: PlanSlot): PlacedProp | undefined {
    const rule = this.ruleOf(plan, slot);
    if (!rule) return undefined;
    const g = placeGround(site, slot.place, plan.steps[slot.step]);
    let best: PlacedProp | undefined;
    let bestD: number = TILE;
    for (const p of this.map.props) {
      if (p.type !== WOOD_PIECE || !p.image.visible || beamRefusal(rule, '', p.def.wood)) continue;
      const d = Math.min(...this.endsOf(p).map((e) => Math.hypot(e.x - g.x, e.y - g.y)));
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  /**
   * E maintenu devant une place qui se dresse avec de l'aide : refusé sans poutre qui convienne au pied de la place (le message dit
   * laquelle), sinon possible. `commit` ôte la poutre couchée et dresse le poteau à sa place, avec la pièce d'origine notée.
   */
  help(siteId: number, placeId: string): HelpResult | undefined {
    const site = this.sites.find((s) => s.id === siteId);
    if (!site) return undefined;
    const plan = plans[site.plan];
    const slot = openSlots(site, plan).find((s) => s.id === placeId);
    const rule = slot && this.ruleOf(plan, slot);
    if (!slot || !rule) return undefined;
    const beam = this.beamNear(site, plan, slot);
    if (!beam) return { ok: false, message: `Il faut d'abord une poutre de ${beamLength(rule.length)} au pied du dé.` };
    const piece = structuredClone(beam.def.wood!);
    const mapId = this.map.def.id;
    return {
      ok: true,
      kg: woodMass(piece),
      commit: () => {
        if (beam.spawned) changeSpawned(game, mapId, beam.id, { x: beam.x, y: beam.y });
        else changeObject(game, mapId, beam.id, { x: beam.x, y: beam.y });
        this.map.removeProp(beam);
        this.lay(site, plan, slot, piece);
      },
    };
  }

  /**
   * Outils de test (?dieu) : remplit d'un coup l'étape en cours (jouable) de chaque chantier né, sans rien porter. Une poutre
   * demandée est posée avec les réglages du plan. Renvoie ce qu'on dit si rien ne s'est fait.
   */
  skipStep(): string | undefined {
    let done = false;
    for (const site of this.sites) {
      if (!site.born) continue;
      const plan = plans[site.plan];
      const p = progress(site, plan);
      if (p.step < 0) continue;
      if (plan.steps[p.step].soon) return 'Cette étape viendra plus tard.';
      for (const slot of openSlots(site, plan)) {
        const rule = this.ruleOf(plan, slot);
        this.lay(site, plan, slot, rule && this.beamOf(rule));
        done = true;
      }
    }
    return done ? undefined : 'Aucune étape à sauter.';
  }

  // --- le plan ---

  /** E sur la planchette : Xéros apprend le plan. Renvoie ce qu'on dit. */
  learn(planKey: string): string {
    return learnPlan(game, planKey) ? plans[planKey].learned : 'Xéros connaît déjà ce plan.';
  }

  /** Progression du chantier le plus avancé de la carte (tests, outils de test). */
  progressOf(siteId: number) {
    const site = this.sites.find((s) => s.id === siteId);
    return site ? progress(site, plans[site.plan]) : undefined;
  }

  /** Outils de test (?dieu) : efface les chantiers de la carte, leurs pièces posées comprises. Les piquets plantés disparaissent. */
  erase(): void {
    const mapId = this.map.def.id;
    for (const site of [...this.sites]) {
      for (const spawnId of Object.values(site.placed)) {
        const prop = this.map.props.find((p) => p.spawned && p.id === spawnId);
        if (prop) this.map.removeProp(prop);
        changeSpawned(game, mapId, spawnId, { x: 0, y: 0 });
      }
      removeSite(game, mapId, site.id);
    }
  }
}

/** Le rectangle agrandi de `by` px de chaque côté. */
function grow(b: Box, by: number): Box {
  return { left: b.left - by, top: b.top - by, right: b.right + by, bottom: b.bottom + by };
}
