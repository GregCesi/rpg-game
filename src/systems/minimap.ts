// La petite carte du HUD (docs/CONCEPTION.md, « La petite carte ») : en haut à gauche, ronde, nord en haut, centrée sur la case de
// Xéros. Le calcul est dans world/minimap.ts (sans Phaser) ; ici, la texture et sa pose selon le contrat de art/ui/minimap.ts : le
// disque de carte (une CanvasTexture de inner × ZOOM pixels, affichée à l'échelle 1 / ZOOM dans le HUD), le cadre de bois
// `ui-minimap-frame-<inner>` par-dessus, puis le point de Xéros `ui-minimap-dot-<sens>` au centre.
// - Au lancement : la grille du monde entière, depuis les cartes et la partie.
// - Quand la partie a changé (`revision` de GameState), au plus une fois par `MINIMAP.refreshMs` : les zones que la fenêtre touche
//   sont repeintes (un arbre abattu, un bâtiment posé, ce que le mode construction ajoute ou retire). Le moteur n'en sait rien.
// - Quand la case ou le sens de Xéros change (GameEvent.PlayerCell) : la fenêtre est retirée de la grille.
// - Un clic sur la carte (un clic d'interface, input/uiClicks.ts) passe au cran suivant de `MINIMAP.steps`, puis revient au premier ;
//   le cran choisi est retenu d'une session à l'autre (localStorage, comme le zoom de la caméra).
import Phaser from 'phaser';
import { MINIMAP, ZOOM } from '../config';
import type { PlayerCell } from '../events';
import { claimClicks, releaseClicks } from '../input/uiClicks';
import { buildPlans } from '../content/buildPlans';
import { game } from '../state';
import { revisionOf } from '../state/GameState';
import { drawWindow, emptyGrid, nextStep, packColor, paintZone, zonesAround, ZONES, type WorldGrid } from '../world/minimap';

/** Clé du cran choisi dans localStorage : un réglage du joueur, pas la partie. */
const STEP_KEY = 'xeros-minimap';
const TEXTURE = 'minimap-window';
const OUTSIDE = packColor(MINIMAP.outside);

function savedStep(): number {
  try {
    const raw = localStorage.getItem(STEP_KEY);
    const v = Number(raw);
    return raw !== null && Number.isInteger(v) && v >= 0 && v < MINIMAP.steps.length ? v : MINIMAP.start;
  } catch {
    return MINIMAP.start;
  }
}

function saveStep(step: number): void {
  try {
    localStorage.setItem(STEP_KEY, String(step));
  } catch {
    // stockage bloqué : le cran vaut pour cette session seulement
  }
}

export class Minimap {
  /** Tout ce qui se voit : le disque, le cadre, le point. */
  readonly view: Phaser.GameObjects.Container;
  private readonly grid: WorldGrid;
  private step = savedStep();
  private cell?: PlayerCell;
  private revision = revisionOf();
  private paintedAt = 0;
  private frame?: Phaser.GameObjects.Image;
  private dot?: Phaser.GameObjects.Image;
  private texture?: Phaser.Textures.CanvasTexture;
  private pixels?: { data: ImageData; view: Uint32Array };
  private dirty = true;
  /** Ce que montre la carte (« 312,180 down 1/3 » : la case de Xéros, son sens, le cran) : lu par les tests de scénario. */
  text = '';

  constructor(private readonly scene: Phaser.Scene) {
    this.view = scene.add.container(0, 0);
    this.grid = emptyGrid();
    for (const m of ZONES) paintZone(this.grid, m, game.maps[m.id], buildPlans);
    this.layout();
    claimClicks('minimap', { hit: (x, y) => this.hit(x, y), click: () => this.cycle() });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => releaseClicks('minimap'));
  }

  private get inner(): number {
    return MINIMAP.steps[this.step].inner;
  }

  /** La place du cran : la texture à sa taille, le cadre à son diamètre, le point au centre. */
  private layout(): void {
    const size = this.inner * ZOOM;
    this.view.removeAll(true);
    if (this.scene.textures.exists(TEXTURE)) this.scene.textures.remove(TEXTURE);
    this.texture = this.scene.textures.createCanvas(TEXTURE, size, size)!;
    const data = this.texture.context.createImageData(size, size);
    this.pixels = { data, view: new Uint32Array(data.data.buffer) };
    const frameKey = `ui-minimap-frame-${this.inner}`;
    const border = (this.scene.textures.get(frameKey).getSourceImage().width - this.inner) / 2;
    const at = MINIMAP.margin + border;
    const map = this.scene.add.image(at, at, TEXTURE).setOrigin(0).setScale(1 / ZOOM);
    this.frame = this.scene.add.image(MINIMAP.margin, MINIMAP.margin, frameKey).setOrigin(0);
    // le point (carré impair), centré sur le pixel du milieu de la fenêtre (inner impair)
    const mid = at + (this.inner - 1) / 2 + 0.5;
    this.dot = this.scene.add.image(mid, mid, `ui-minimap-dot-${this.cell?.facing ?? 'down'}`);
    this.view.add([map, this.frame, this.dot]);
    this.dirty = true;
  }

  /** Le point (px du HUD) est-il sur la carte, cadre compris ? Seulement quand elle se voit. */
  private hit(x: number, y: number): boolean {
    if (!this.view.visible || !this.frame) return false;
    const r = this.frame.width / 2;
    const c = MINIMAP.margin + r;
    return (x - c) ** 2 + (y - c) ** 2 <= r * r;
  }

  /** Le cran suivant, retenu. */
  private cycle(): void {
    this.step = nextStep(this.step, MINIMAP.steps.length);
    saveStep(this.step);
    this.layout();
  }

  /** Xéros a changé de case ou de sens (undefined : hors du monde, la carte se cache). */
  setCell(cell: PlayerCell | undefined): void {
    this.cell = cell;
    this.dirty = true;
  }

  /** À chaque image : repeint ce qui a changé, au plus une fois par `refreshMs`, et retire la fenêtre si besoin. */
  update(time: number, hidden: boolean): void {
    this.view.setVisible(!hidden && !!this.cell);
    const cell = this.cell;
    if (!cell) return;
    const { px } = MINIMAP.steps[this.step];
    const size = this.inner * ZOOM;
    const rev = revisionOf();
    if (rev !== this.revision && time - this.paintedAt >= MINIMAP.refreshMs) {
      this.revision = rev;
      this.paintedAt = time;
      for (const m of zonesAround(cell.x, cell.y, Math.ceil(size / px / 2) + 1)) paintZone(this.grid, m, game.maps[m.id], buildPlans);
      this.dirty = true;
    }
    if (!this.dirty || !this.texture || !this.pixels) return;
    this.dirty = false;
    drawWindow(this.grid, cell.x, cell.y, size, px, OUTSIDE, this.pixels.view);
    this.texture.context.putImageData(this.pixels.data, 0, 0);
    this.texture.refresh();
    this.dot?.setTexture(`ui-minimap-dot-${cell.facing}`);
    this.text = `${cell.x},${cell.y} ${cell.facing} ${this.step + 1}/${MINIMAP.steps.length}`;
  }
}
