import type Phaser from 'phaser';
import { ZOOM, ZOOM_STEPS } from '../config';

/** Clé du palier choisi dans localStorage : un réglage du joueur, pas la partie (il n'est pas dans la sauvegarde). */
const ZOOM_KEY = 'xeros-zoom';

/** Le palier retenu d'une session à l'autre, s'il y en a un lisible ; un stockage bloqué ne plante pas le jeu. */
function savedZoom(): number | undefined {
  try {
    const v = Number(localStorage.getItem(ZOOM_KEY));
    return Number.isInteger(v) && v > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

function saveZoom(z: number): void {
  try {
    localStorage.setItem(ZOOM_KEY, String(z));
  } catch {
    // stockage bloqué : le palier vaut pour cette session seulement
  }
}

/**
 * Le zoom de la caméra du monde, par paliers entiers seulement (un palier fractionnaire rendrait les pixels inégaux et ferait
 * scintiller le pixel art) : de `ZOOM_STEPS.min` à `ZOOM_STEPS.max`, mais jamais assez loin pour montrer le vide hors de la carte
 * (une carte trop petite borne le palier le plus bas). Molette, + et − ; le palier choisi est retenu (localStorage). L'interface
 * (HUD, dialogues) a ses propres caméras : elle ne change pas. La caméra suit toujours Xéros, centrée sur lui.
 */
export class ZoomControl {
  /** Le palier que le joueur a choisi ; celui de la caméra peut être plus haut sur une petite carte. */
  private wanted: number;

  constructor(
    private readonly cam: Phaser.Cameras.Scene2D.Camera,
    /** Taille de la carte, en pixels du monde. */
    private readonly mapW: number,
    private readonly mapH: number,
  ) {
    this.wanted = savedZoom() ?? ZOOM;
    this.apply();
  }

  /** Le plus petit palier qui ne montre pas le vide : la vue (canevas ÷ palier) tient dans la carte. */
  get lowest(): number {
    const fit = Math.max(Math.ceil(this.cam.width / this.mapW), Math.ceil(this.cam.height / this.mapH));
    return Math.min(ZOOM_STEPS.max, Math.max(ZOOM_STEPS.min, fit));
  }

  /** Le palier de la caméra en ce moment. */
  get level(): number {
    return this.cam.zoom;
  }

  /** Un cran de plus (`+1`, on s'approche) ou de moins (`-1`), dans les bornes ; le choix est retenu. */
  step(dir: 1 | -1): void {
    const next = Math.min(ZOOM_STEPS.max, Math.max(this.lowest, this.level + dir));
    if (next === this.level) return;
    this.wanted = next;
    saveZoom(next);
    this.apply();
  }

  private apply(): void {
    this.cam.setZoom(Math.min(ZOOM_STEPS.max, Math.max(this.lowest, this.wanted)));
  }
}
