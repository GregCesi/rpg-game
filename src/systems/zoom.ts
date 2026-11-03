import type Phaser from 'phaser';
import { RENDER, ZOOM_STEPS } from '../config';

/**
 * Clé du cran choisi dans localStorage : un réglage du joueur, pas la partie (il n'est pas dans la sauvegarde). Nouvelle clé depuis les
 * crans d'un quart de palier (chantier « correctifs ») : chacun repart une fois de `ZOOM_STEPS.start`.
 */
const ZOOM_KEY = 'xeros-zoom-2';

/** Le cran le plus proche d'une valeur, dans les bornes. */
export function snapZoom(z: number, lowest: number = ZOOM_STEPS.min): number {
  const s = Math.round(z / ZOOM_STEPS.step) * ZOOM_STEPS.step;
  return Math.min(ZOOM_STEPS.max, Math.max(lowest, s));
}

/** Le cran retenu d'une session à l'autre, s'il y en a un lisible ; un stockage bloqué ne plante pas le jeu. */
function savedZoom(): number | undefined {
  try {
    const raw = localStorage.getItem(ZOOM_KEY);
    const v = Number(raw);
    return raw !== null && Number.isFinite(v) && v > 0 ? snapZoom(v) : undefined;
  } catch {
    return undefined;
  }
}

function saveZoom(z: number): void {
  try {
    localStorage.setItem(ZOOM_KEY, String(z));
  } catch {
    // stockage bloqué : le cran vaut pour cette session seulement
  }
}

/**
 * Le zoom de la caméra du monde, par crans d'un quart de palier (`ZOOM_STEPS.step`), de `ZOOM_STEPS.min` (la vue la plus large) à
 * `ZOOM_STEPS.max`, mais jamais assez loin pour montrer le vide hors de la carte (une carte trop petite relève le cran le plus bas). La
 * première fois, `ZOOM_STEPS.start` ; ensuite le cran choisi est retenu (localStorage). Molette, + et −. L'interface (HUD, dialogues) a
 * ses propres caméras : elle ne change pas. La caméra zoome de palier × RENDER (la définition du canevas, config.ts). La caméra suit toujours Xéros, centrée sur lui.
 */
export class ZoomControl {
  /** Le cran que le joueur a choisi ; celui de la caméra peut être plus haut sur une petite carte. */
  private wanted: number;

  constructor(
    private readonly cam: Phaser.Cameras.Scene2D.Camera,
    /** Taille de la carte, en pixels du monde. */
    private readonly mapW: number,
    private readonly mapH: number,
  ) {
    this.wanted = savedZoom() ?? ZOOM_STEPS.start;
    this.apply();
  }

  /** Le plus petit cran qui ne montre pas le vide : la vue (canevas ÷ zoom de la caméra) tient dans la carte. */
  get lowest(): number {
    const fit = Math.max(this.cam.width / this.mapW, this.cam.height / this.mapH) / RENDER;
    const up = Math.ceil(fit / ZOOM_STEPS.step - 1e-9) * ZOOM_STEPS.step;
    return Math.min(ZOOM_STEPS.max, Math.max(ZOOM_STEPS.min, up));
  }

  /** Le cran de la caméra en ce moment (en paliers : la caméra zoome de palier × RENDER). */
  get level(): number {
    return this.cam.zoom / RENDER;
  }

  /** Un cran de plus (`+1`, on s'approche) ou de moins (`-1`), dans les bornes ; le choix est retenu. */
  step(dir: 1 | -1): void {
    const next = snapZoom(this.level + dir * ZOOM_STEPS.step, this.lowest);
    if (next === this.level) return;
    this.wanted = next;
    saveZoom(next);
    this.apply();
  }

  private apply(): void {
    this.cam.setZoom(snapZoom(this.wanted, this.lowest) * RENDER);
  }
}
