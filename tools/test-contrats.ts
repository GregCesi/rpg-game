// Les contrats par sorte d'objet (docs/objets/README.md, « Les contrats ») : tout ce que sait faire chaque membre de la sorte, et tous
// ses dessins, vérifiés sur tous les membres, sans lancer le jeu (les données, les dessins tirés par npm run art, les calculs purs du
// jeu). Puis des membres d'essai, créés seulement par des données dans ce test (une hache, une épée : ils reprennent des dessins
// existants) : ils doivent remplir tout le contrat, du dessin à la pièce posée en tas avec son compteur. S'il fallait du code pour
// qu'un membre d'essai passe, c'est un trou.
// Usage : npm run test:contrats (après npm run art).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { combat, creatures, items, matters, props, rocks, stamina, strength, transforms, wood, work } from '../src/content';
import { itemMass, propMass, woodMass } from '../src/content/mass';
import { CreatureSchema, ItemDefSchema, type CreatureDef, type ItemDef, type WoodPiece } from '../src/content/types';
import { catalogFrom, CREATURES_TODO, DRAWINGS_TODO, validateContent, VIEWS_TODO } from '../src/content/validate';
import { perceive, pixels } from '../src/world/creature';
import { beast, blockedIn, drive, DT, field } from './lib/creature-trial';
import { viewImages } from '../src/content/views';
import { toolSheet, worksWith } from '../src/content';
import { catalog, looksOf } from '../src/build/catalog';
import { combatPoses } from '../src/generated/combatPoses';
import { heftOf, improvisedStroke } from '../src/world/heft';
import { damage, reachCm } from '../src/world/strike';
import { harvestKind, wields, woodWorkOf } from '../src/world/tools';
import { defOf, woodDims, WOOD_PIECE } from '../src/world/woodPiece';
import { pileWoodOf, woodPileDef } from '../src/world/woodPile';
import { agedKey, lookDef, sheetOf, shapeOfLook } from '../src/world/woodShape';
import { harvestJob, planOf, swingerOf, woodJob } from '../src/world/workPlan';
import { clickPlan } from '../src/world/actionPlan';
import type { Held } from '../src/state/GameState';

const manifest = JSON.parse(readFileSync('src/generated/manifest.json', 'utf8'));
const cat = catalogFrom(manifest);
const drawn = (k: string) => cat.textures.has(k);
const animated = (sheet: string, anim: string) => !!cat.animations.get(sheet)?.has(anim);
const xeros = swingerOf('xeros');
const DIRS = ['down', 'up', 'right'] as const;

/** Les manques d'un membre : `at` (le membre), la liste de ce qui manque. */
type Report = { at: string; missing: string[] };
const reports: Report[] = [];
const check = (at: string, f: (miss: (why: string) => void) => void) => {
  const missing: string[] = [];
  f((why) => missing.push(why));
  reports.push({ at, missing });
};

// ---------- les contrats ----------

/**
 * Les commandes (src/world/actionPlan.ts, docs/COMMANDES.md) : ce qu'on tient frappe au clic court de chaque bouton de sa main (même
 * dans le vide) et se lance au clic maintenu.
 */
function clicks(h: Held, hands: 1 | 2, miss: (w: string) => void): void {
  const held = { hands: [null, hands === 2 ? null : h] as [Held | null, Held | null], both: hands === 2 ? h : null };
  for (const b of hands === 2 ? (['left', 'right'] as const) : (['left'] as const)) {
    const p = clickPlan(b, held);
    if (p.short.kind !== 'strike') miss(`frapper au clic ${b} court`);
    if (p.long.kind !== 'throw') miss(`se lancer au clic ${b} maintenu`);
  }
}

/** Objet portable : il a une masse, des dimensions, ses mains, sa posture tenue dessinée, son image au sol et ses vues, frappe, et s'il s'empile, un tas qui compte. */
function portable(k: string, miss: (w: string) => void): void {
  const it = items[k];
  if (!(itemMass(k) > 0)) miss('une masse');
  if (!it.dims) miss('ses dimensions (dims)');
  if (!it.ground && !DRAWINGS_TODO[k]?.ground) miss('son image au sol');
  if (it.ground) for (const v of viewImages(it.ground, it.views, drawn)) if (!drawn(v) && !VIEWS_TODO[k]) miss(`sa vue ${v}`);
  if (it.hold?.image) for (const d of DIRS) if (!animated(it.hold.image, d)) miss(`sa posture tenue ${it.hold.image}-${d}`);
  if (!drawn(it.icon) && !DRAWINGS_TODO[k]?.carried) miss(`son icône ${it.icon}`);
  const heft = heftOf({ item: k });
  if (!heft) miss('frapper : pas d’arme (ni weapon, ni dims)');
  else if (heft.improvised && !(improvisedStroke(heft, xeros.swinger).joules > 0)) miss('frapper : énergie nulle');
  if (it.pile && !woodPileOk(undefined, it.pile)) miss(`son tas '${it.pile}' compte ses pièces`);
  if (!catalog().some((e) => e.id === `item:${k}`)) miss('sa place au catalogue');
  clicks({ item: k }, it.hands, miss);
}

/** Tas écrit de piles.json : il compte (count). */
function woodPileOk(_: unknown, genre: string): boolean {
  return !!(readPiles()[genre]?.count);
}
const readPiles = () => JSON.parse(readFileSync('src/content/piles.json', 'utf8')) as Record<string, { count?: boolean }>;

/** Outil : un objet portable qui fait un travail (`does`), avec sa planche en main pour chaque geste de ses travaux, et chacun de ses travaux se fait. */
function tool(k: string, miss: (w: string) => void): void {
  const it = items[k];
  const does = it.does ?? [];
  if (!does.length && !worksWith(k)) miss('un travail (does)');
  if (!worksWith(k)) miss('servir (worksWith)');
  for (const job of does) {
    if (job === 'plant') continue;
    if (!it.work) {
      miss(`ses données de coup (work) pour ${job}`);
      continue;
    }
    // le geste du coup de ce travail, dans sa planche en main, pour chaque direction
    const stroke = it.work.strokes?.[job] ?? work.jobs[job as keyof typeof work.jobs] ?? { cut: 'chop', hew: 'hew', maul: 'maul' }[job as string];
    const gesture = work.strokes[stroke]?.gesture;
    const sheet = toolSheet(k);
    if (!DRAWINGS_TODO[k]?.tool && gesture) for (const d of DIRS) if (!animated(sheet, `${gesture}-${d}`)) miss(`sa planche en main ${sheet}-${gesture}-${d}`);
    // le travail se fait, sur chaque cible de ce genre (récoltes) ou sur le bois
    if (['cut', 'hew', 'maul'].includes(job)) {
      if (woodWorkOf(k) === undefined) miss(`le bois le reconnaît (${job})`);
      const plan = planOf(woodJob(job as 'cut' | 'hew' | 'maul', { size: 'normal', length: 100 }, 100, k), xeros.swinger, xeros.max);
      if (!(plan.strokes > 0 && Number.isFinite(plan.seconds))) miss(`${job} sur une pièce normale : un travail fini`);
    } else {
      const targets = Object.entries(props).filter(([, p]) => p.harvest && harvestKind(p.harvest) === job);
      if (!targets.length) miss(`une cible qu'il ${job}`);
      for (const [t, p] of targets) {
        if (!wields(p.harvest!, k)) miss(`${t} l'accepte (${job})`);
        const plan = planOf(harvestJob(p.harvest!.work!, k), xeros.swinger, xeros.max);
        if (!(plan.strokes > 0 && Number.isFinite(plan.seconds))) miss(`${job} ${t} : un travail fini`);
      }
    }
  }
  portable(k, miss);
}

/** Arme : sa planche en huit angles, sa famille et ses attaques, des dégâts, une durée, une portée ; ses traînées ; et tout le contrat d'un objet portable. */
function weapon(k: string, miss: (w: string) => void): void {
  const w = items[k].weapon!;
  const image = w.image ?? `weapon-${k}`;
  if (!animated(image, 'angles')) miss(`sa planche ${image}-angles`);
  const fam = combat.families[w.family];
  if (!fam) miss(`sa famille ${w.family}`);
  const kg = itemMass(k);
  for (const s of fam?.stances ?? [])
    for (const key of s.chain) {
      const a = combat.attacks[key];
      const sw = combat.sweeps[a.gesture];
      if (!(damage(combat.rules, a, sw, combatPoses[a.gesture].down, w, kg) > 0)) miss(`des dégâts à « ${a.name} »`);
      if (!(reachCm(sw, w) > 0)) miss(`une portée à « ${a.name} »`);
      // les traînées tirées à sa longueur pour chaque image qui en a une (par npm run art, d'après items.json : pas pour un membre d'essai)
      if (!k.startsWith('essai-')) for (const f of combatPoses[a.gesture].down) if (f.smear && !drawn(`fx-smear-${k}-${f.smear.image}`)) miss(`sa traînée ${f.smear.image}`);
    }
  portable(k, miss);
}

/** Pièce de bois (un diamètre) : chaque aspect a ses planches à trois âges, ses dimensions, sa masse, se prend ou roule, pivote (R), se coupe, se fend, s'équarrit selon son aspect, se pose en tas qui compte, frappe. */
function woodSize(size: string, miss: (w: string) => void): void {
  const s = wood.sizes[size];
  for (const look of looksOf(size)) {
    const piece: WoodPiece = { size, length: 100, shape: shapeOfLook(look), axis: 'ew', ...(look === 'beam' ? { hewn: wood.hew.faces * wood.hew.perFace } : {}) } as WoodPiece;
    const at = `${look}`;
    for (const axis of ['ew', 'ns'] as const) for (const age of ['new', 'worn', 'old'] as const) if (!drawn(sheetOf({ size, axis, age }))) miss(`${at} : sa planche ${sheetOf({ size, axis, age })}`);
    const dims = woodDims(piece);
    if (!(dims.w > 0)) miss(`${at} : ses dimensions`);
    if (!(woodMass(piece) > 0)) miss(`${at} : sa masse`);
    const def = defOf(WOOD_PIECE, piece);
    if (!def.take) miss(`${at} : se prend`);
    if (!def.turn) miss(`${at} : pivote avec R (turn)`);
    if (def.roll && !drawn(def.roll.sheet)) miss(`${at} : roule (planche ${def.roll.sheet})`);
    // son tas (calculé pour toute pièce : une pyramide, des rangées, des triangles), qui compte ; Xéros n'y pose que ce qu'il porte
    // (`carry` de strength.json : une grosse bille d'un mètre, 214 kg, se roule, elle ne va pas en tas)
    const pile = woodPileDef({ size, shape: piece.shape, length: piece.length, ...(piece.hewn ? { hewn: piece.hewn } : {}) });
    if (!pile.count) miss(`${at} : son tas compte ses pièces`);
    if (!Object.keys(pile.places).length) miss(`${at} : son tas a des places`);
    if (woodMass(piece) <= strength.carry && !pileWoodOf(piece)) miss(`${at} : se pose en tas (Xéros la porte)`);
    if (!heftOf({ prop: WOOD_PIECE, wood: piece })) miss(`${at} : frappe`);
    if (def.take) clicks({ prop: WOOD_PIECE, wood: piece }, def.take.hands, (w) => miss(`${at} : ${w}`));
    for (const ageImg of [lookDef(size, look).icon]) if (!drawn(ageImg)) miss(`${at} : son icône ${ageImg}`);
  }
  // les travaux du bois : la coupe partout ; la fente et l'équarrissage là où le diamètre a ces aspects
  const plan = (kind: 'cut' | 'hew' | 'maul') => planOf(woodJob(kind, { size, length: 100 }), xeros.swinger, xeros.max);
  if (!(plan('cut').strokes > 0)) miss('se coupe');
  if (Object.keys(s.split).length && !(plan('maul').strokes > 0)) miss('se fend');
  if (looksOf(size).includes('beam') && !(plan('hew').strokes > 0)) miss("s'équarrit");
  void agedKey;
}

/** Matière : sa densité, des objets qui en sont faits ; une roche, sa rampe (vérifiée par check.ts) et sa densité. */
function matter(m: string, miss: (w: string) => void): void {
  const d = matters[m];
  // une pierre a la densité de sa roche (rocks.json)
  const density = d.density ?? (d.rock ? rocks[d.rock]?.density : undefined);
  if (!((density ?? 0) > 0)) miss('sa densité (la sienne, ou celle de sa roche)');
  const used = [...Object.values(props), ...Object.values(items)].some((o) => JSON.stringify(o.mass ?? '').includes(`"${m}"`) || o.mass === m);
  if (!used && m !== 'water') miss('un objet qui en est fait');
}

/** Meuble : son image et toutes ses vues, ses dimensions, son corps, sa masse, son métier, ses âges s'il est de bois, sa place au catalogue, son autre état s'il s'ouvre. */
function furniture(k: string, miss: (w: string) => void): void {
  const p = props[k];
  for (const v of viewImages(p.image, p.views, drawn)) if (!drawn(v) && !VIEWS_TODO[k]) miss(`sa vue ${v}`);
  if (!p.dims) miss('ses dimensions');
  // un corps qui barre le passage, sauf ce qui est au sol (layer) ou trop petit pour barrer (moins de 20 cm de côté au sol)
  if (!p.body && !p.bodies && p.layer !== 'floor' && (p.dims.w > 20 || p.dims.d > 20)) miss('son corps (body)');
  if (p.mass === undefined) miss('sa masse');
  if (p.aged) for (const age of ['worn', 'old'] as const) if (!drawn(agedKey(p.image, age))) miss(`son âge ${age}`);
  if (p.swing && !props[p.swing.into]) miss(`son autre état ${p.swing.into}`);
  if (!catalog().some((e) => e.id === `prop:${k}`)) miss('sa place au catalogue');
}

// ---------- tous les membres de chaque sorte ----------

const tools = Object.keys(items).filter((k) => items[k].does?.length || items[k].work);
const weapons = Object.keys(items).filter((k) => items[k].weapon);
const portables = Object.keys(items).filter((k) => !tools.includes(k) && !weapons.includes(k));
const furnitures = Object.keys(props).filter((k) => props[k].family === 'mobilier');
for (const k of tools) check(`outil ${k}`, (m) => tool(k, m));
for (const k of weapons) check(`arme ${k}`, (m) => weapon(k, m));
for (const k of portables) check(`portable ${k}`, (m) => portable(k, m));
for (const s of Object.keys(wood.sizes)) check(`pièce de bois ${s}`, (m) => woodSize(s, m));
for (const m of Object.keys(matters)) check(`matière ${m}`, (miss) => matter(m, miss));
for (const k of furnitures) check(`meuble ${k}`, (m) => furniture(k, m));
void transforms;
void stamina;
void strength;

// ---------- les membres d'essai : rien que des données ----------

/** Un objet d'essai : validé par le schéma, ajouté au contenu le temps du test. */
function addItem(key: string, def: unknown): ItemDef {
  const d = ItemDefSchema.parse(def);
  (items as Record<string, ItemDef>)[key] = d;
  return d;
}
// une hache d'essai : elle reprend les dessins de la cognée, fait ce que fait la cognée
addItem('essai-hache', {
  name: 'hache d’essai', family: 'outils', icon: 'item-axe', ground: 'axe-ground', views: 'four', lying: true, kind: 'tool', hands: 2,
  hold: { stance: 'shoulder', image: 'held-axe' }, mass: 2.2, trade: 'smith', dims: { w: 95, d: 22, h: 6, shape: 'box' },
  work: { length: 95, grip: 5, balance: 1.3, edge: 1, aim: 0.3, image: 'tool-axe' }, does: ['fell', 'limbs', 'cut'],
});
// une épée d'essai : elle reprend les dessins de l'épée de bois
addItem('essai-epee', {
  name: 'épée d’essai', family: 'outils', icon: 'item-wooden-sword', ground: 'wooden-sword-ground', views: 'four', lying: true, kind: 'weapon', hands: 1,
  hold: items['wooden-sword'].hold, mass: 1.1, trade: 'smith', dims: items['wooden-sword'].dims,
  weapon: { ...items['wooden-sword'].weapon!, length: 95, image: items['wooden-sword'].weapon!.image ?? 'weapon-wooden-sword' },
});
check('essai : hache', (m) => tool('essai-hache', m));
check('essai : épée', (m) => weapon('essai-epee', m));
// la hache d'essai, du coup à la pièce posée en tas : elle abat l'arbre normal, l'arbre couché s'ébranche, devient une pièce de bois qui va en tas
check('essai : hache, de l’arbre au tas', (miss) => {
  const trees = Object.entries(props).filter(([, p]) => p.harvest?.fall);
  if (!trees.length) miss('des arbres');
  for (const [t, p] of trees) {
    if (!wields(p.harvest!, 'essai-hache')) miss(`elle abat ${t}`);
    const felled = p.harvest!.spawns?.[0]?.type;
    const fh = felled ? props[felled]?.harvest : undefined;
    if (!fh || !wields(fh, 'essai-hache')) miss(`elle ébranche ${felled}`);
    if (fh?.becomes !== WOOD_PIECE || !fh.wood) miss(`${felled} devient une pièce de bois`);
    else {
      // la pièce de sa longueur utile se coupe (à la hache d'essai) en billes d'un mètre, qui vont en tas, compté (si Xéros les porte)
      if (woodWorkOf('essai-hache') !== 'cut') miss('elle coupe la pièce');
      const cut = planOf(woodJob('cut', fh.wood, fh.wood.length, 'essai-hache'), xeros.swinger, xeros.max);
      if (!(cut.strokes > 0)) miss(`elle coupe la pièce de ${felled}`);
      const bille = { shape: 'round', ...fh.wood, length: 100, axis: 'ew' } as WoodPiece;
      const pile = woodPileDef({ size: bille.size, shape: bille.shape, length: 100 });
      if (!pile.count) miss(`les billes de ${felled} vont en tas, compté`);
      if (woodMass(bille) <= strength.carry && !pileWoodOf(bille)) miss(`les billes de ${felled} se posent en tas`);
    }
  }
});
// le contenu, membres d'essai compris, passe validate.ts sans erreur qui les nomme
const content = await import('../src/content');
const { combatPoses: poses } = await import('../src/generated/combatPoses');
const { catalog: cat2, looksOf: lo } = await import('../src/build/catalog');
// les traînées d'une arme sont tirées par npm run art à sa longueur, d'après items.json (art/characters/xeros-combat.ts) : une vraie
// nouvelle arme les a sans rien dessiner ; un membre ajouté seulement ici, après le build, ne peut pas les avoir : on les laisse
const errs = validateContent({ ...content, combatPoses: poses, buildCatalog: { entries: cat2(), looksOf: lo } } as never, cat).filter(
  (e) => /essai-/.test(e) && !/traînée 'fx-smear-essai-/.test(e),
);
check('essai : validate.ts', (miss) => errs.forEach((e) => miss(e)));

// ---------- une créature d'essai : rien que des données ----------

// un lièvre d'essai : il reprend les dessins du lapin et l'objet qu'il devient, ses chiffres sont les siens (plus craintif, plus rapide,
// sans zigzag) ; le moteur commun (src/world/creature.ts) le fait vivre, percevoir, fuir à l'entrée en contournant un mur, tambouriner
const model = Object.entries(creatures)[0];
if (!model) throw new Error('creatures.json : aucune créature à prendre pour modèle');
const [modelKey, modelDef] = model;
const hare = CreatureSchema.parse({
  ...modelDef,
  name: 'lièvre d’essai',
  senses: { still: { alert: 9, near: 4 }, sneak: { alert: 14, near: 7 }, walk: { alert: 30, near: 18 }, run: { alert: 40, near: 30 } },
  flee: { speed: 14, zigzag: { every: 3, angle: 0 } },
  graze: { ...modelDef.graze, range: 40 },
});
(creatures as Record<string, CreatureDef>)['essai-lievre'] = hare;
check('essai : créature', (miss) => {
  if (perceive(hare, { x: 0, y: 0 }, { x: pixels(25), y: 0, gait: 'walk' }) !== 'alert') miss('à 25 m de Xéros qui marche, aux aguets');
  if (perceive(hare, { x: 0, y: 0 }, { x: pixels(25), y: 0, gait: 'sneak' }) !== undefined) miss('à 25 m de Xéros discret, rien');
  // elle vit : elle broute (elle bouge) sans Xéros
  const f = field([], [{ x: 0, y: 0 }], 4);
  const c = beast(hare, { x: pixels(5), y: 0 }, 'essai-lievre');
  let moved = 0;
  drive(c, hare, f, Math.ceil(30 / DT), undefined, (b) => (moved += b.from ? Math.hypot(b.x - b.from.x, b.y - b.from.y) : 0));
  if (c.mode !== 'calm' || moved < pixels(0.5)) miss(`elle broute en bougeant (${c.mode}, ${moved.toFixed(0)} px en 30 s)`);
  // elle fuit, contourne un mur et entre au terrier
  const wall = [{ x: pixels(4), y: -pixels(5), w: 3, h: pixels(10) }];
  const g = field(wall, [{ x: 0, y: 0 }], 9);
  const d = beast(hare, { x: pixels(10), y: 0 }, 'essai-lievre');
  g.threat = { x: pixels(20), y: 0, gait: 'walk' };
  const r = drive(d, hare, g, Math.ceil(30 / DT), (_, ev) => ev.some((e) => e.kind === 'enter'), (b) => {
    if (blockedIn(wall)(b.x, b.y)) miss('jamais dans le mur');
  });
  if (!r.events.some((e) => e.kind === 'thump')) miss('elle tambourine à l’entrée');
  if (d.mode !== 'burrow') miss(`elle entre au terrier (${d.mode})`);
});
const creatureErrs = validateContent({ ...content, creatures, combatPoses: poses, buildCatalog: { entries: cat2(), looksOf: lo } } as never, cat).filter(
  (e) => e.includes("'essai-lievre'") && !(CREATURES_TODO[modelKey] && /planche|becomes|fx-/.test(e)),
);
check('essai : créature, validate.ts', (miss) => creatureErrs.forEach((e) => miss(e)));

// ---------- le monde ne limite pas, seul Xéros limite (Grégoire) ----------
// À la force maximale (?dieu « force », plafonnée au plus fort des humains), toute pièce de bois (chaque diamètre, chaque aspect,
// chaque longueur de la grille) et tout objet qu'il soulève se prend, et ce qui s'empile forme un tas qui compte au moins 2 ; à la force
// de Xéros, ce qui dépasse sa force est refusé par un message qui dit que c'est trop lourd pour lui, jamais que c'est impossible.
{
  const { Strength } = await import('../src/entities/Strength');
  const { heavyNotice } = await import('../src/systems/weight');
  const { pileOf } = await import('../src/world/offer');
  const { pileDefOf } = await import('../src/world/pileShape');
  const strong = new Strength();
  strong.multiplier = 10;
  const base = new Strength();
  const refusalOk = (msg: string) => /Trop lourde? pour lui/.test(msg) && !/impossible|ne peut pas|jamais/i.test(msg);
  check('limites : la pièce de bois', (miss) => {
    for (const size of Object.keys(wood.sizes))
      for (const look of looksOf(size)) {
        const shape = shapeOfLook(look);
        for (let length = wood.min; length <= wood.max; length += wood.grid) {
          const piece = { size, length, shape, axis: 'ew', ...(look === 'beam' ? { hewn: wood.hew.faces * wood.hew.perFace } : {}) } as WoodPiece;
          const kg = woodMass(piece);
          const at = `${size} ${look} ${length} cm (${Math.round(kg)} kg)`;
          if (kg <= strong.carry + 1e-9) {
            if (!strong.canCarry(kg)) miss(`${at} : se prend à la force maximale`);
            const kind = pileOf({ prop: WOOD_PIECE, wood: piece });
            if (!kind) miss(`${at} : va en tas`);
            else {
              const def = pileDefOf(kind);
              if (!def.count || Object.keys(def.places).length < 2) miss(`${at} : un tas qui compte 2`);
            }
          }
          if (kg > base.carry + 1e-9) {
            if (base.canCarry(kg)) miss(`${at} : à la force de Xéros, refusé`);
            const msg = heavyNotice(defOf(WOOD_PIECE, piece), kg, base);
            if (!refusalOk(msg)) miss(`${at} : « ${msg} » doit dire trop lourd pour lui`);
          }
        }
      }
  });
  check('limites : les objets portables', (miss) => {
    for (const [k, it] of Object.entries(items)) {
      const kg = itemMass(k);
      if (kg <= strong.carry + 1e-9) {
        if (!strong.canCarry(kg)) miss(`${k} : se prend à la force maximale`);
        const kind = pileOf({ item: k });
        if (it.pile && (!kind || !pileDefOf(kind).count || Object.keys(pileDefOf(kind).places).length < 2)) miss(`${k} : un tas qui compte 2`);
      }
      if (kg > base.carry + 1e-9 && !refusalOk(heavyNotice(undefined, kg, base))) miss(`${k} : trop lourd pour lui`);
    }
    for (const [k, p] of Object.entries(props)) {
      if (!p.take || k === WOOD_PIECE) continue;
      const kg = propMass(k);
      if (kg <= strong.carry + 1e-9 && !strong.canCarry(kg)) miss(`${k} : se prend à la force maximale`);
      if (kg > base.carry + 1e-9 && !refusalOk(heavyNotice(p, kg, base))) miss(`${k} : trop lourd pour lui`);
    }
  });
}

// ---------- l'arbre : les trois arbres, puis un arbre d'essai ----------

/** Arbre : il s'abat au coup des deux côtés, devient sa souche et son arbre couché, qui s'ébranche en une pièce de bois qui va en tas, compté. */
function tree(k: string, miss: (w: string) => void, has: (img: string) => boolean = drawn, def = props[k]): void {
  const h = def.harvest!;
  const n = h.stages?.length ?? 0;
  if (!n) miss('ses étapes (stages)');
  for (let i = 1; i <= n; i++) for (const side of ['', '-left']) if (!has(`${def.image}${side}-stage-${i}`)) miss(`son étape ${def.image}${side}-stage-${i}`);
  for (const f of [h.fall!.image, h.fall!.left?.image]) if (!f || !has(f)) miss(`sa chute ${f}`);
  if (h.fall!.x === undefined || h.at === undefined || h.spawns?.[0]?.x === undefined) miss('ses décalages calculés (npm run art)');
  const fellers = Object.keys(items).filter((t) => wields(h, t));
  if (!fellers.length) miss("un outil qui l'abat");
  for (const t of fellers.filter((t) => items[t].work)) if (!(planOf(harvestJob(h.work!, t), xeros.swinger, xeros.max).strokes > 0)) miss(`l'abattre à ${t}`);
  if (!props[h.becomes!]) miss(`sa souche ${h.becomes}`);
  const fk = h.spawns?.[0]?.type;
  const f = fk ? props[fk] : undefined;
  if (!f) return miss('son arbre couché');
  const fh = f.harvest!;
  for (const side of ['', '-left']) if (!has(`${f.image}${side}`)) miss(`son arbre couché ${f.image}${side}`);
  for (let i = 1; i <= (fh.stages?.length ?? 0); i++) if (!has(`${f.image}-stage-${i}`)) miss(`son ébranchage ${f.image}-stage-${i}`);
  if (!Object.keys(items).some((t) => wields(fh, t))) miss("un outil qui l'ébranche");
  if (fh.becomes !== WOOD_PIECE || !fh.wood || !wood.sizes[fh.wood.size]) return miss('une pièce de bois de sa longueur utile');
  if (fh.wood.length % wood.grid) miss('sa pièce sur la grille');
  // la pièce : tout le contrat d'une pièce de bois (son diamètre), et ses billes d'un mètre en tas, compté
  if (!woodPileDef({ size: fh.wood.size, shape: 'round', length: 100 }).count) miss('ses billes en tas, compté');
}
const trees = Object.keys(props).filter((k) => props[k].harvest?.fall);
for (const k of trees) check(`arbre ${k}`, (m) => tree(k, m));

// l'arbre d'essai : rien que des données (il reprend le dessin de l'arbre normal, `tree.art`, et son arbre couché celui du normal) ;
// ses dessins tirés (étapes des deux côtés, chutes, arbre couché, ébranchage, son image debout) et ses décalages sortent du même calcul
// que les vrais (art/world/trees.ts), lancé ici sur props.json augmenté de lui
{
  const raw = (await import('../src/content/props.json')).default as unknown as Record<string, Record<string, unknown>>;
  const base = structuredClone(raw['normal-tree']) as Record<string, any>;
  const lying = structuredClone(raw['normal-felled-tree']) as Record<string, any>;
  raw['essai-arbre'] = {
    ...base,
    name: 'arbre d’essai',
    image: 'essai-arbre',
    harvest: { ...base.harvest, fall: { image: 'essai-arbre-fall', anim: 'fall', left: { image: 'essai-arbre-fall-left' } }, spawns: [{ type: 'essai-arbre-couche' }] },
    tree: { ...base.tree, art: 'normal-tree' },
  };
  raw['essai-arbre-couche'] = { ...lying, name: 'arbre d’essai couché', image: 'essai-arbre-couche' };
  const trees2 = await import('../art/world/trees');
  const made = new Set<string>(trees2.default.map((src: { name: string }) => src.name));
  const layouts = trees2.treeLayouts();
  const { withTreeLayout } = await import('../src/content/treeLayout');
  const { PropDefSchema } = await import('../src/content/types');
  const full = withTreeLayout({ 'essai-arbre': raw['essai-arbre'], 'essai-arbre-couche': raw['essai-arbre-couche'] }, layouts);
  for (const k of ['essai-arbre', 'essai-arbre-couche']) (props as Record<string, unknown>)[k] = PropDefSchema.parse(full[k]);
  check('essai : arbre', (m) => tree('essai-arbre', m, (img) => drawn(img) || made.has(img)));
  check('essai : arbre, ses décalages', (m) => {
    const a = layouts.standing['essai-arbre'];
    const b = layouts.standing['normal-tree'];
    if (!a) return m('ses décalages calculés');
    if (JSON.stringify(a.fall) !== JSON.stringify(b.fall) || JSON.stringify(a.at) !== JSON.stringify(b.at)) m('les décalages de l’arbre dont il reprend le dessin');
  });
}

// ---------- le rapport ----------

const bad = reports.filter((r) => r.missing.length);
const lines = bad.map((r) => `  ${r.at} :\n${r.missing.map((m) => `    - ${m}`).join('\n')}`);
assert.deepEqual(bad, [], `contrats non remplis :\n${lines.join('\n')}`);
const count = (p: string) => reports.filter((r) => r.at.startsWith(p)).length;
console.log(
  `✓ contrats : ${count('arbre')} arbres, ${count('outil')} outils, ${count('arme')} armes, ${count('portable')} objets portables, ${count('pièce de bois')} diamètres de bois, ${count('matière')} matières, ${count('meuble')} meubles ; membres d'essai (arbre, hache, épée, créature) : tout le contrat, du dessin à la pièce en tas comptée`,
);
