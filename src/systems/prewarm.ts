// Préparer d'avance les textures des pièces posées (chantier « corrections », DIAGNOSTIC.md : la première visite de la ferme du riche
// gelait 220 ms, celle de la ferme 170 ms, l'entrée dans la maison du coq 100 ms, à fabriquer les dessins des tronçons de mur et des
// pièces de bois) : pendant qu'on joue, quelques ms par image (`PREPARE`), les textures des pièces posées des intérieurs de la carte où
// est Xéros, puis des cartes voisines, puis des autres, sont fabriquées et gardées (leurs clés sont celles que la carte leur donnera :
// le dessin d'un tronçon ne dépend que de sa place, celui d'une pièce de bois de ses réglages). Arrivé sur la carte, tout est prêt.
// Rien n'est écrit dans la partie : une carte jamais vue garde ses plans hors de GameState (`seedMap` les y fera entrer à sa visite).

import type Phaser from 'phaser';
import { maps } from '../content';
import { buildPlans } from '../content/buildPlans';
import { CM_PER_PX } from '../content/gabarit';
import type { MapData } from '../content/types';
import { game } from '../state';
import { planPieces, type BuildPiece } from '../world/build';
import { buildLook } from '../world/buildView';
import { buildingsCached, interiorId, parseInteriorId } from '../world/interior';
import { reliefOf } from '../world/relief';
import { wallOf, wallRuns } from '../world/wallRuns';
import { wallTexture } from '../world/wallTexture';
import { resolveInterior } from './interiors';

/** Ce qui reste à préparer, dans l'ordre (un générateur : un pas = une texture). */
const queue: Generator<void, void, void>[] = [];
/** Les cartes et les intérieurs déjà mis en file (une fois par partie). */
const queued = new Set<string>();

/** Les pièces posées d'une carte : celles de la partie, et les plans de Tiled qui n'y sont pas encore (des identifiants à part). */
function piecesOf(def: MapData): BuildPiece[] {
  const st = game.maps[def.id];
  const out: BuildPiece[] = [...(st?.builds ?? [])];
  const seeded = new Set(st?.seeded ?? []);
  let id = -1;
  for (const p of def.plans) {
    if (seeded.has(p.id)) continue;
    const plan = buildPlans[p.plan];
    if (!plan) continue;
    const at = { x: Math.round(p.x * CM_PER_PX), y: Math.round(p.y * CM_PER_PX), z: 0 };
    for (const q of planPieces({ ...plan, ...(p.age ? { age: p.age } : {}) }, at)) out.push({ ...q, id: id-- });
  }
  return out;
}

/**
 * Ce qu'une carte calcule à l'arrivée : son relief (`reliefOf`, gardé par carte), ses bâtiments (`buildingsCached`, s'ils sont déjà
 * dans la partie), puis les textures de ses pièces.
 */
function* warmMap(scene: Phaser.Scene, def: MapData): Generator<void, void, void> {
  reliefOf(def);
  yield;
  const st = game.maps[def.id];
  if (st?.builds.length) {
    buildingsCached(def.id, st.builds);
    yield;
  }
  yield* warm(scene, () => piecesOf(def));
}

/** Les textures d'un ensemble de pièces : chaque tronçon de mur, chaque autre pièce (son dessin, son bois). */
function* warm(scene: Phaser.Scene, pieces: () => readonly BuildPiece[]): Generator<void, void, void> {
  const list = pieces();
  for (const run of wallRuns(list)) {
    wallTexture(scene, run);
    yield;
  }
  for (const p of list) {
    if (wallOf(p)) continue;
    buildLook(scene, p);
    yield;
  }
}

/**
 * Met en file ce qu'il faut préparer autour de la carte où l'on arrive : les intérieurs de ses bâtiments (dehors), puis les cartes
 * voisines, puis toutes les autres, des plus proches aux plus lointaines. Une carte ou un intérieur n'y entre qu'une fois.
 */
export function prepareAround(scene: Phaser.Scene, def: MapData, outside: boolean): void {
  const add = (key: string, g: () => Generator<void, void, void>) => {
    if (queued.has(key)) return;
    queued.add(key);
    queue.push(g());
  };
  // (les bâtiments se calculent dans la file, pas à l'arrivée)
  if (outside)
    add(`interieurs:${def.id}`, function* () {
      for (const b of buildingsCached(def.id, game.maps[def.id]?.builds ?? [])) {
        const id = interiorId(def.id, b.key);
        if (queued.has(id)) continue;
        queued.add(id);
        yield;
        yield* warm(scene, () => resolveInterior(id)?.shell ?? []);
      }
    });
  // dedans, la place de la carte qui l'accueille (au réveil, sa ferme d'abord)
  const host = parseInteriorId(def.id)?.host;
  const here = def.world ?? (host ? maps[host]?.world : undefined);
  const others = Object.values(maps)
    .filter((m) => m.world && m.id !== def.id && (m.plans.length || game.maps[m.id]?.builds.length || m.relief))
    .sort((a, b) => (here ? Math.hypot(a.world!.x - here.x, a.world!.y - here.y) - Math.hypot(b.world!.x - here.x, b.world!.y - here.y) : 0));
  for (const m of others) add(m.id, () => warmMap(scene, m));
}

/** Avance la préparation pendant `budgetMs` ms au plus (à appeler une fois par image dessinée). */
export function prepare(budgetMs: number): void {
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < budgetMs) {
    if (queue[0].next().done) queue.shift();
  }
}

/** Reste-t-il quelque chose à préparer (les tests de scénario attendent la fin pour mesurer une arrivée préparée) ? */
export const preparing = (): boolean => queue.length > 0;
