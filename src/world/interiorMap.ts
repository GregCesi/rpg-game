// La carte d'un intérieur (chantier « intérieurs »), sans Phaser : la pièce d'un bâtiment (world/interior.ts) devient une carte du
// jeu, calculée à l'entrée, la même pour le même bâtiment. Même échelle que dehors (5 cm par pixel) ; le repère de l'intérieur est
// celui du dehors décalé pour que le coin nord-ouest de la pièce tombe à INTERIOR.margin du coin de la carte (décalage sur la grille du
// mode construction : les meubles posés dedans restent sur la grille des murs). Les meubles de l'intérieur sont rangés dans GameState
// sous l'identifiant de la carte (`interiorId`), dans ce repère.

import { BUILD, INTERIOR, TILE } from '../config';
import type { Facing, MapData } from '../content/types';
import { CM_PER_PX } from '../content/gabarit';
import type { BuildPiece, Joint } from '../state';
import { BACK, interiorId, type Building, type Rect, type Side, type Window } from './interior';

/** Une sortie de l'intérieur : la zone de passage (repère de l'intérieur), la direction de Xéros qui sort, où il arrive dehors. */
interface InteriorExit {
  zone: Rect;
  facing: Facing;
  to: { x: number; y: number; facing: Facing };
}

/** Une tache de lumière au sol (px de l'intérieur) : au bord de la pièce, au milieu de son ouverture, tournée vers le dedans. */
export interface InteriorLight {
  kind: 'door' | 'window';
  /** La pièce qui la laisse entrer (porte, volet), s'il y en a une. */
  id?: number;
  side: Side;
  x: number;
  y: number;
  /** Largeur de l'ouverture (cm). */
  span: number;
}

/** Un intérieur prêt à jouer : sa carte, et ce qui vient du bâtiment, dans le repère de l'intérieur. */
export interface InteriorMap {
  def: MapData;
  host: string;
  key: string;
  /** Du repère du dehors à celui de l'intérieur (cm). */
  shift: { x: number; y: number };
  /** L'emprise de la pièce (cm, repère de l'intérieur). */
  room: Rect;
  /** Les pièces du bâtiment qu'on voit dedans, et leurs assemblages (repère de l'intérieur). */
  shell: BuildPiece[];
  joints: Joint[];
  /** La coupe du mur sud (cm, repère de l'intérieur). */
  south: Rect[];
  /** Les pièces du mur sud, pour la teinte de la coupe (repère de l'intérieur). */
  southPieces: BuildPiece[];
  exits: InteriorExit[];
  windows: Window[];
  lights: InteriorLight[];
  /** Où l'on arrive par chaque entrée (pieds, px), par identifiant de porte ou par rang. */
  arrivals: { x: number; y: number; facing: Facing }[];
}

/** Un nombre de cm ramené au cran de la grille du mode construction en dessous. */
const floorGrid = (cm: number) => Math.floor(cm / BUILD.grid) * BUILD.grid;

/** Hachage stable d'une case : le même bâtiment a toujours le même sol. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Un rectangle décalé. */
const moved = (r: Rect, s: { x: number; y: number }): Rect => ({ x: r.x + s.x, y: r.y + s.y, w: r.w, d: r.d });

/** La pénombre d'un intérieur : celle de la chaumière quand un volet est ouvert, plus sombre quand tous sont fermés. */
export function ambientOf(windows: readonly Window[]): number {
  return windows.some((w) => w.open) ? INTERIOR.ambient : INTERIOR.dark;
}

/** Les taches de lumière d'une pièce (repère de l'intérieur) : chaque entrée ouverte, chaque volet ouvert. */
export function lightsOf(room: Rect, openings: readonly { kind: 'door' | 'window'; id?: number; side: Side; span: [number, number] }[]): InteriorLight[] {
  return openings.map((o) => {
    const mid = (o.span[0] + o.span[1]) / 2 / CM_PER_PX;
    const at =
      o.side === 'south'
        ? { x: mid, y: (room.y + room.d) / CM_PER_PX }
        : o.side === 'north'
          ? { x: mid, y: room.y / CM_PER_PX }
          : o.side === 'east'
            ? { x: (room.x + room.w) / CM_PER_PX, y: mid }
            : { x: room.x / CM_PER_PX, y: mid };
    return { kind: o.kind, ...(o.id !== undefined ? { id: o.id } : {}), side: o.side, ...at, span: o.span[1] - o.span[0] };
  });
}

/**
 * L'intérieur d'un bâtiment de la carte `host` : sa carte (sol de terre battue dans la pièce, vide autour ; pénombre), ses pièces et
 * assemblages vus dedans, la coupe du mur sud, ses sorties, ses fenêtres et ses taches de lumière, dans le repère de l'intérieur.
 * `tiles` : les numéros des tuiles du jeu de tuiles de l'intérieur (terre battue, vide).
 */
export function interiorOf(host: string, b: Building, joints: readonly Joint[], tiles: { floor: number[]; void: number }): InteriorMap {
  const m = INTERIOR.margin;
  const shift = { x: m.side * CM_PER_PX - floorGrid(b.room.x), y: m.top * CM_PER_PX - floorGrid(b.room.y) };
  const room = moved(b.room, shift);
  const south = b.south.map((r) => moved(r, shift));
  const shell = b.shell.map((p) => ({ ...p, x: p.x + shift.x, y: p.y + shift.y }));
  const ids = new Set(shell.map((p) => p.id));
  // la carte : la pièce et ses marges, la coupe du mur sud comprise
  const bottom = Math.max(room.y + room.d, ...south.map((r) => r.y + r.d)) / CM_PER_PX + m.bottom;
  const width = Math.ceil(((room.x + room.w) / CM_PER_PX + m.side) / TILE);
  const height = Math.ceil(bottom / TILE);
  const px = { x0: room.x / CM_PER_PX, y0: room.y / CM_PER_PX, x1: (room.x + room.w) / CM_PER_PX, y1: (room.y + room.d) / CM_PER_PX };
  const ground: number[] = [];
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const inRoom = i * TILE < px.x1 && (i + 1) * TILE > px.x0 && j * TILE < px.y1 && (j + 1) * TILE > px.y0;
      ground.push(inRoom ? tiles.floor[hash(i, j) % tiles.floor.length] : tiles.void);
    }
  }
  const exits: InteriorExit[] = b.entrances.map((e) => ({
    zone: moved(e.zone, shift),
    facing: BACK[e.facing],
    to: { x: Math.round(e.outside.x / CM_PER_PX), y: Math.round(e.outside.y / CM_PER_PX), facing: BACK[e.facing] },
  }));
  const arrivals = b.entrances.map((e) => ({ x: Math.round((e.inside.x + shift.x) / CM_PER_PX), y: Math.round((e.inside.y + shift.y) / CM_PER_PX), facing: e.facing }));
  const windows = b.windows.map((w) => ({ ...w, span: w.span.map((v) => v + (w.side === 'north' || w.side === 'south' ? shift.x : shift.y)) as [number, number] }));
  const openings = [
    ...b.entrances.filter((e) => e.open).map((e) => ({ kind: 'door' as const, id: e.door, side: e.side, span: e.span.map((v) => v + (e.side === 'north' || e.side === 'south' ? shift.x : shift.y)) as [number, number] })),
    ...windows.filter((w) => w.open).map((w) => ({ kind: 'window' as const, id: w.id, side: w.side, span: w.span })),
  ];
  const id = interiorId(host, b.key);
  const def: MapData = {
    id,
    name: 'Intérieur',
    tileset: 'interior',
    ambient: ambientOf(windows),
    width,
    height,
    layers: { ground },
    objects: [],
    spawns: Object.fromEntries(arrivals.map((a, i) => [`entree-${i}`, a])),
    exits: [],
    npcs: [],
    parcels: [],
    plans: [],
  };
  return {
    def,
    host,
    key: b.key,
    shift,
    room,
    shell,
    joints: joints.filter((j) => ids.has(j.a) && ids.has(j.b)),
    south,
    southPieces: b.southPieces.map((p) => ({ ...p, x: p.x + shift.x, y: p.y + shift.y })),
    exits,
    windows,
    lights: lightsOf(room, openings),
    arrivals,
  };
}
