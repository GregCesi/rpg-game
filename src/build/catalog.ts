// Le catalogue du mode construction, sans Phaser : tout ce qui existe dans le contenu (props.json, items.json, la pièce de bois de
// tous réglages), rangé par famille, jamais d'objet inventé. La famille est celle que déclare l'objet (`family` de props.json et
// d'items.json), jamais devinée à sa clé.

import { items, props, wood } from '../content';
import type { BuildRef, JointType, NaturalDef, WoodLook, WoodPiece } from '../content/types';
import { WOOD_PIECE } from '../world/woodPiece';
import { shapeOfLook, woodOfLook } from '../world/woodShape';

import { FAMILIES } from '../content/types';

/** Les familles, dans l'ordre du catalogue (déclarées avec le contenu : types.ts). */
export { FAMILIES };
export type Family = (typeof FAMILIES)[number];

/** Une entrée du catalogue : son nom, sa famille, ce qu'elle pose, son image (vignette), sa matière naturelle, si c'est le bois. */
export interface CatalogEntry {
  id: string;
  name: string;
  family: Family;
  ref: BuildRef;
  thumb: string;
  natural?: NaturalDef;
  /** Une pièce de bois : son diamètre et son aspect (wood.json), dressée pour un poteau ; la longueur et le sens se règlent à part. */
  wood?: { size: string; look: WoodLook; up?: true };
  /** Un assemblage (famille « assemblages ») : il se pose sur la jonction de deux pièces, pas comme une pièce. */
  joint?: JointType;
  /** Du bois qui prend l'âge (la pièce de bois, un objet `aged`) : sa vignette a ses trois âges. */
  aged?: true;
}

/** Tout le catalogue : la pièce de bois d'abord (une vignette par diamètre et par aspect ; longueur et sens se règlent à part), puis chaque objet du monde et chaque objet possédable. */
export function catalog(): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  const base = props[WOOD_PIECE];
  // les assemblages de charpente (CONCEPTION, « Les assemblages ») : pas des objets, des jonctions entre deux pièces de bois
  out.push({ id: 'joint:scarf', name: 'enture en trait de Jupiter', family: 'assemblages', ref: { wood: structuredClone(base.wood!) }, thumb: 'joint-scarf-normal-ew', joint: 'scarf' });
  out.push({ id: 'joint:mortise', name: 'tenon et mortaise', family: 'assemblages', ref: { wood: structuredClone(base.wood!) }, thumb: 'joint-peg', joint: 'mortise' });
  out.push({ id: 'joint:notch', name: 'encoche', family: 'assemblages', ref: { wood: structuredClone(base.wood!) }, thumb: 'joint-notch-normal-ew-3', joint: 'notch' });
  out.push({ id: 'joint:halving', name: 'mi-bois', family: 'assemblages', ref: { wood: structuredClone(base.wood!) }, thumb: 'joint-halving-normal-beam-ew-3', joint: 'halving' });
  // la pièce de bois, une vignette par diamètre et par aspect de wood.json (et le poteau, l'aspect qui se dresse)
  const faces: Partial<Record<WoodLook, string>> = { f1: ' 1 face', f2: ' 2 faces', f3: ' 3 faces' };
  for (const [size, s] of Object.entries(wood.sizes)) {
    for (const look of looksOf(size)) {
      const l = s.looks[look]!;
      const ref = { wood: woodFrom(size, 200, look, 'ew') };
      out.push({ id: `wood:${size}:${look}`, name: `${l.name}${faces[look] ?? ''} (${s.diameter} cm)`, family: 'bois', ref, thumb: l.icon, wood: { size, look }, aged: true });
      if (canStand(size, look) && look === 'round') {
        const up = { wood: woodFrom(size, 200, look, 'up') };
        out.push({ id: `wood:${size}:${look}:up`, name: `${l.up!.name} (${s.diameter} cm)`, family: 'bois', ref: up, thumb: l.icon, wood: { size, look, up: true }, aged: true });
      }
    }
  }
  for (const [key, d] of Object.entries(props)) {
    if (d.wood) continue;
    out.push({ id: `prop:${key}`, name: d.name, family: d.family, ref: { prop: key }, thumb: d.image, ...(d.natural ? { natural: d.natural } : {}), ...(d.aged ? { aged: true as const } : {}) });
  }
  for (const [key, d] of Object.entries(items)) {
    out.push({ id: `item:${key}`, name: d.name, family: d.family, ref: { item: key }, thumb: d.ground ?? d.icon, ...(d.natural ? { natural: d.natural } : {}), ...(d.aged ? { aged: true as const } : {}) });
  }
  return out;
}

/** Les aspects d'un diamètre de bois (wood.json), dans l'ordre de wood.json. */
export function looksOf(size: string): WoodLook[] {
  return Object.keys(wood.sizes[size]?.looks ?? {}) as WoodLook[];
}

/** L'aspect se dresse-t-il (un poteau) ? */
export function canStand(size: string, look: WoodLook): boolean {
  return !!wood.sizes[size]?.looks[look]?.up && shapeOfLook(look) === 'round';
}

/** La pièce de bois de ces réglages : son aspect donne sa forme, ses coups de doloire (une face tous les `perFace`), son écorce ôtée. */
export function woodFrom(size: string, length: number, look: WoodLook, axis: 'ew' | 'ns' | 'up'): WoodPiece {
  const up = axis === 'up' && canStand(size, look);
  return woodOfLook(size, look, length, up ? 'up' : axis === 'up' ? 'ew' : axis);
}

