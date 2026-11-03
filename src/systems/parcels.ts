// Les parcelles réservées du village (objets `Parcel` des cartes, chantier « monde ») : invisibles en jeu ; en mode construction et
// avec ?debug, chacune se montre par son rectangle, de la couleur de sa destination (parcels.json), avec son nom et sa taille, pour
// qu'on y bâtisse ce qu'elle attend (une maison du quartier, la mairie…).
import type Phaser from 'phaser';
import { DEBUG, DEPTH, UI, RENDER, ZOOM_STEPS } from '../config';
import { parcelUses } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { MapData } from '../content/types';

/** Une longueur en px du monde, dite en mètres (« 12 m », « 7,5 m »). */
function metres(px: number): string {
  const m = Math.round((px * CM_PER_PX) / 50) / 2;
  return `${String(m).replace('.', ',')} m`;
}

export class Parcels {
  private readonly parts: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, def: MapData) {
    if (!def.parcels.length) return;
    const g = scene.add.graphics().setDepth(DEPTH.prompt - 2);
    this.parts.push(g);
    for (const p of def.parcels) {
      const use = parcelUses[p.use];
      const color = parseInt(use.color.slice(1), 16);
      g.fillStyle(color, 0.12).fillRect(p.x, p.y, p.w, p.h);
      g.lineStyle(1, color, 0.9).strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
      const label = `${p.name ?? use.name}\n${metres(p.w)} × ${metres(p.h)}`;
      const t = scene.add
        .text(p.x + 3, p.y + 2, label, { fontFamily: UI.font, fontSize: '8px', color: use.color, stroke: '#1a120a', strokeThickness: 2 })
        .setResolution(ZOOM_STEPS.max * RENDER)
        .setDepth(DEPTH.prompt - 1);
      this.parts.push(t);
    }
    this.show(DEBUG);
  }

  /** Montre ou cache les parcelles (le mode construction les montre ; ?debug toujours). */
  show(on: boolean): void {
    for (const p of this.parts) (p as Phaser.GameObjects.Graphics).setVisible(on || DEBUG);
  }
}
