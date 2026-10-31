// Le catalogue du mode construction, sans Phaser : tout ce qui existe dans le contenu (props.json, items.json, la pièce de bois de
// tous réglages), rangé par famille, jamais d'objet inventé. La famille se tire du contenu (élément calculé, bois, matière, métier,
// genre d'objet) ; ce qui ne se range nulle part va dans « divers ».

import { items, props, wood } from '../content';
import type { BuildRef, ItemDef, JointType, NaturalDef, PropDef, WoodLook, WoodPiece } from '../content/types';
import { shapeOfLook } from '../world/woodShape';

/** Les familles, dans l'ordre du catalogue. */
export const FAMILIES = ['éléments', 'assemblages', 'bois', 'pierre', 'terre', 'fibres', 'outils', 'mobilier', 'chantier', 'nature', 'divers'] as const;
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
}

/** La matière d'un objet, d'après sa masse (`{ matter }`, ou `"stone"`). */
function matterOf(mass: PropDef['mass'] | ItemDef['mass']): string | undefined {
  if (mass === 'stone') return 'stone';
  return mass && typeof mass === 'object' && 'matter' in mass ? mass.matter : undefined;
}

/** La famille d'un objet du monde. */
function propFamily(key: string, d: PropDef): Family {
  const matter = matterOf(d.mass);
  if (d.variants || d.pitch || /door/.test(key)) return 'éléments';
  if (d.wood) return 'bois';
  if (/tree|pollard|bush|stump/.test(key)) return 'nature';
  if (matter === 'stone' || /rock|stone-chips/.test(key)) return 'pierre';
  if (matter === 'earth' || matter === 'cob' || matter === 'mortar' || d.trade === 'digger') return 'terre';
  if (matter === 'straw' || /rope|faggot|hay|thatch|straw/.test(key)) return 'fibres';
  if (/-ground$/.test(key)) return 'outils';
  if (/^shed-|stake|plan-tablet|woodpile|footing/.test(key)) return 'chantier';
  if (key === 'cottage' || d.blend) return 'divers';
  return 'mobilier';
}

/** La famille d'un objet possédable. */
function itemFamily(key: string, d: ItemDef): Family {
  const matter = matterOf(d.mass);
  if (d.kind !== 'resource') return 'outils';
  if (matter === 'stone' || d.trade === 'quarryman' || d.trade === 'mason') return 'pierre';
  if (matter === 'earth' || matter === 'cob' || d.trade === 'digger') return 'terre';
  if (matter === 'straw' || /rope|straw|thatch/.test(key)) return 'fibres';
  if (matter === 'wood' || ['woodcutter', 'carpenter', 'splitter', 'joiner'].includes(d.trade ?? '')) return 'bois';
  return 'divers';
}

/** Tout le catalogue : la pièce de bois d'abord (une vignette par diamètre et par aspect ; longueur et sens se règlent à part), puis chaque objet du monde et chaque objet possédable. */
export function catalog(): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  const base = props['wood-piece'];
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
      out.push({ id: `wood:${size}:${look}`, name: `${l.name}${faces[look] ?? ''} (${s.diameter} cm)`, family: 'bois', ref, thumb: l.icon, wood: { size, look } });
      if (canStand(size, look) && look === 'round') {
        const up = { wood: woodFrom(size, 200, look, 'up') };
        out.push({ id: `wood:${size}:${look}:up`, name: `${l.up!.name} (${s.diameter} cm)`, family: 'bois', ref: up, thumb: l.icon, wood: { size, look, up: true } });
      }
    }
  }
  for (const [key, d] of Object.entries(props)) {
    if (d.wood) continue;
    out.push({ id: `prop:${key}`, name: d.name, family: propFamily(key, d), ref: { prop: key }, thumb: d.image, ...(d.natural ? { natural: d.natural } : {}) });
  }
  for (const [key, d] of Object.entries(items)) {
    out.push({ id: `item:${key}`, name: d.name, family: itemFamily(key, d), ref: { item: key }, thumb: d.ground ?? d.icon, ...(d.natural ? { natural: d.natural } : {}) });
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

/** La pièce de bois de ces réglages : son aspect donne sa forme et ses coups de doloire (une face tous les `perFace`). */
export function woodFrom(size: string, length: number, look: WoodLook, axis: 'ew' | 'ns' | 'up'): WoodPiece {
  const faces = { round: 0, half: 0, quarter: 0, plank: 0, f1: 1, f2: 2, f3: 3, beam: 4 }[look];
  const up = axis === 'up' && canStand(size, look);
  return { size, length, shape: shapeOfLook(look), axis: up ? 'up' : axis === 'up' ? 'ew' : axis, ...(faces ? { hewn: faces * wood.hew.perFace } : {}) };
}

/** La vignette d'une pièce de bois de cet aspect : son icône (wood.json). */
export function woodThumb(size: string, look: WoodLook): string {
  return wood.sizes[size].looks[look]!.icon;
}
