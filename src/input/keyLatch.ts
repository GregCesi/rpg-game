// Ce que le clavier a fait depuis la dernière lecture, sans Phaser (testé sans navigateur : tools/test-input.ts). Un appui (enfoncé puis
// relâché) n'est jamais perdu : même s'il tient entre deux images, ou si une image est longue (le jeu qui rame), il est gardé jusqu'à ce
// que le jeu le lise ; et sa durée est celle de l'appui vrai (les horodatages des événements), jamais le temps qu'a mis le jeu à le
// lire. Utilisé par src/input/PlayerInput.ts et src/systems/longPress.ts.

export class KeyLatch {
  /** Touches enfoncées en ce moment (codes). */
  readonly held = new Set<string>();
  /** Touches enfoncées depuis la dernière image lue (un appui plus court qu'une image compte une image de déplacement). */
  private readonly taps = new Set<string>();
  /** Touches pressées, pas encore lues (une fois par appui). */
  private readonly pressed = new Set<string>();
  /** Quand chaque touche enfoncée l'a été (horodatage de l'événement, ms). */
  private readonly downAt = new Map<string, number>();
  /** La durée du dernier appui fini de chaque touche (ms), jusqu'au prochain appui de cette touche. */
  private readonly lasted = new Map<string, number>();

  /** Une touche enfoncée (`repeat` : la répétition du clavier, qui n'est pas un nouvel appui) à l'instant `at` (ms). */
  down(code: string, at: number, repeat = false): void {
    this.held.add(code);
    if (repeat) return;
    this.pressed.add(code);
    this.taps.add(code);
    this.downAt.set(code, at);
    this.lasted.delete(code);
  }

  /** Une touche relâchée à l'instant `at` (ms). */
  up(code: string, at: number): void {
    this.held.delete(code);
    const from = this.downAt.get(code);
    if (from !== undefined) this.lasted.set(code, Math.max(0, at - from));
    this.downAt.delete(code);
  }

  /** La fenêtre quittée, ou un passage qui repart à l'arrêt : les touches enfoncées sont oubliées. */
  clear(): void {
    this.held.clear();
    this.taps.clear();
    this.downAt.clear();
    this.lasted.clear();
  }

  /** Une des touches `codes` a été pressée depuis la dernière fois : vrai une seule fois par appui. */
  take(codes: readonly string[]): boolean {
    let p = false;
    for (const c of codes) if (this.pressed.delete(c)) p = true;
    return p;
  }

  /** Une des touches `codes` est enfoncée en ce moment. */
  isDown(codes: readonly string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  /**
   * Une des touches `codes` est enfoncée, ou l'a été depuis la dernière image lue (un appui plus court qu'une image) : la plus brève
   * des pressions déplace d'une image au moins.
   */
  downOrTapped(codes: readonly string[]): boolean {
    return codes.some((c) => this.held.has(c) || this.taps.has(c));
  }

  /** L'image est lue : ses tapes sont oubliées (à appeler une fois par image, après `downOrTapped`). */
  forgetTaps(): void {
    this.taps.clear();
  }

  /**
   * La durée (ms) du dernier appui fini d'une des touches `codes` ; undefined si l'une est enfoncée (son appui n'est pas fini) ou si
   * aucun n'a fini. Gardée jusqu'au prochain appui : le jeu la lit quand il voit l'appui fini, même des images plus tard.
   */
  lastedFor(codes: readonly string[]): number | undefined {
    if (this.isDown(codes)) return undefined;
    let ms: number | undefined;
    for (const c of codes) {
      const d = this.lasted.get(c);
      if (d !== undefined) ms = Math.max(ms ?? 0, d);
    }
    return ms;
  }
}

/**
 * Un appui maintenu (E maintenu : nouer ; R maintenu : pivoter) qui se termine : `long` s'il a duré `ms`, sinon `short`. Encore enfoncé,
 * il est long dès que `ms` se sont écoulées en temps vrai depuis son début (`elapsed`, jamais le temps du jeu, qui va plus vite à x10) ; relâché, c'est la durée vraie de l'appui
 * qui décide (`lasted`, l'horodatage des événements), jamais le temps qu'a mis le jeu à le lire : une image longue ne fait pas d'un
 * appui court un appui long. Undefined : l'appui continue.
 */
export function pressEnd(down: boolean, elapsed: number, ms: number, lasted: number | undefined): 'long' | 'short' | undefined {
  if (down) return elapsed >= ms ? 'long' : undefined;
  return (lasted ?? elapsed) >= ms ? 'long' : 'short';
}
