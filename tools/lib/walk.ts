// Marcher comme un joueur, au vrai clavier, dans les scénarios (tools/lib/playtest.ts) : `goTo` conduit Xéros jusqu'à un point du
// monde, une touche de direction à la fois, au rythme du jeu ; `routeTo` cherche un chemin libre sur la carte en cours (une grille de
// 4 px) et marque, devant chaque porte fermée que le chemin traverse (ou devant la porte `target`), un arrêt pour l'ouvrir avec E.
// La même marche pour tous les scénarios qui marchent (test-monde, test-portes, test-forge-visite, test-forgeron). Rien n'y contourne le jeu : pas de téléportation, pas
// d'appui répété « au cas où » ; Xéros bloqué fait échouer le scénario en disant où.

import type { Page } from 'playwright-core';

/** Où est Xéros : la carte, ses pieds dans la carte et dans le monde, le mode de la scène. */
export interface Where {
  id: string;
  x: number;
  y: number;
  wx: number;
  wy: number;
  mode: string;
  zone: boolean;
}

/** Un coin du chemin (px de la carte) ; `open` : arrêt devant une porte, tourné dans cette direction. */
export interface Corner {
  x: number;
  y: number;
  open?: 'up' | 'down' | 'left' | 'right';
}

/** La zone d'une porte (centre, largeur, hauteur : le `zone` de Phaser d'une pièce posée qui bat). */
export interface DoorZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function walker(page: Page) {
  const where = async (): Promise<Where> => {
    for (let i = 0; ; i++) {
      const r = await page
        .evaluate(() => {
          const w = (window as any).game?.scene?.getScene('world');
          if (!w?.player || !w.map) return undefined;
          const a = w.player.actor;
          const o = w.map.def.world ?? { x: 0, y: 0 };
          return { id: w.map.def.id as string, x: a.x as number, y: a.y as number, wx: (o.x + a.x) as number, wy: (o.y + a.y) as number, mode: w.mode as string, zone: !!w.map.def.world };
        })
        .catch(() => undefined);
      if (r) return r;
      if (i > 100) throw new Error('le jeu ne répond plus');
      await new Promise((res) => setTimeout(res, 100));
    }
  };

  /**
   * Marche jusqu'au point du monde (wx, wy) : d'abord le long d'un axe puis de l'autre (`first`), à `tol` px près ; un passage (une
   * porte, un bord de zone) pris en route arrête la marche (on est arrivé ailleurs) ; `zones` : partie d'une zone, la marche passe
   * les bords et les portes sans s'arrêter (seule la sortie d'un intérieur arrête). La marche se conduit dans la page, à chaque pas de jeu (l'événement `poststep`
   * du jeu, qui survit aux changements de zone) : chaque décision suit l'état du jeu au pas même, jamais à l'image (à x10, une image
   * fait au moins dix pas de jeu, plus sous la charge : décidée à l'image, la marche dépasse le but d'autant et oscille autour). Elle
   * échoue (Xéros bloqué) en bornes de pas de jeu, jamais en durée.
   */
  const goTo = async (wx: number, wy: number, first: 'x' | 'y', tol = 6, zones = false): Promise<void> => {
    const r = await page.evaluate(
      async ({ wx, wy, first, tol, zones }) => {
        const g = (window as any).game;
        const world = () => g.scene.getScene('world');
        const key = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));
        const held = new Set<string>();
        const hold = (keys: string[]) => {
          for (const k of [...held]) if (!keys.includes(k)) (key('keyup', k), held.delete(k));
          for (const k of keys) if (!held.has(k)) (key('keydown', k), held.add(k));
        };
        const frame = () => new Promise((res) => requestAnimationFrame(res));
        const at = () => {
          const w = world();
          const a = w?.player?.actor;
          if (!a || !w.map) return undefined;
          const o = w.map.def.world ?? { x: 0, y: 0 };
          return { id: w.map.def.id as string, wx: o.x + a.x, wy: o.y + a.y, mode: w.mode as string, zone: !!w.map.def.world };
        };
        let start = at();
        while (!start) (await frame(), (start = at()));
        const from = start;
        let axis = first;
        // l'ancre : là où il était quand il a bougé de plus de 2 px pour la dernière fois ; `still` : les pas depuis
        let last = { wx: from.wx, wy: from.wy };
        let still = 0;
        // hors du mode `play` trop longtemps (un dialogue ouvert en route), ou plus aucun progrès vers le but (une approche qui
        // oscille) : le test échoue en le disant, au lieu d'attendre sans fin
        let away = 0;
        let best = Infinity;
        let stale = 0;
        // un pas de côté en cours (buté sur un coin, ou recalé sur l'autre axe tout près du but) : la touche, et les pas qu'il dure encore
        let side = 0;
        let sideKey = '';
        let prev = { wx: from.wx, wy: from.wy };
        let dead = 0;
        type Result = { ok: boolean; p: NonNullable<ReturnType<typeof at>>; why?: string };
        let done: (r: Result) => void = () => undefined;
        const result = new Promise<Result>((res) => (done = res));
        let over = false;
        const finish = (r: Result) => {
          over = true;
          g.events.off('poststep', decide);
          hold([]);
          done(r);
        };
        const decide = () => {
          if (over) return;
          const p = at();
          if (!p) return;
          // un passage pris en route (la porte de la maison, un bord de zone si `zones` ne le laisse pas passer) : on est arrivé ailleurs
          if (p.id !== from.id && (!zones || !from.zone)) return finish({ ok: true, p });
          if (p.mode !== 'play') {
            if (++away > 12000) finish({ ok: false, p, why: `mode ${p.mode} depuis 12000 pas` });
            return;
          }
          away = 0;
          const dx = wx - p.wx;
          const dy = wy - p.wy;
          const moved = Math.hypot(p.wx - prev.wx, p.wy - prev.wy);
          prev = { wx: p.wx, wy: p.wy };
          if (Math.abs(dx) <= tol && Math.abs(dy) <= tol) return finish({ ok: true, p });
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist < best - 1) (best = dist), (stale = 0);
          else if (++stale > 15000) return finish({ ok: false, p, why: `plus de progrès depuis 15000 pas (au plus près : ${best.toFixed(1)} px)` });
          if (side > 0) {
            side--;
            hold([sideKey]);
            return;
          }
          if (axis === 'x' && Math.abs(dx) <= tol) axis = 'y';
          if (axis === 'y' && Math.abs(dy) <= tol) axis = 'x';
          const dir = axis === 'x' ? (dx > 0 ? 'KeyD' : 'KeyA') : dy > 0 ? 'KeyS' : 'KeyW';
          const d = axis === 'x' ? Math.abs(dx) : Math.abs(dy);
          // de près, à la marche (moins d'un pixel par pas) ; de loin, en courant
          hold(tol < 6 || d < 24 ? [dir] : ['ShiftLeft', dir]);
          // tout près, buté sans bouger (contre un coin, un peu hors de l'axe du chemin) : un petit appui sur l'autre axe vers le but
          // (même dans la tolérance : c'est ce petit écart qui le fait buter), comme un joueur qui se recale
          if (d < 12 && moved < 0.05) {
            if (++dead >= 30) {
              dead = 0;
              const off = axis === 'x' ? dy : dx;
              if (Math.abs(off) > 0.2) {
                sideKey = axis === 'x' ? (off > 0 ? 'KeyS' : 'KeyW') : off > 0 ? 'KeyD' : 'KeyA';
                side = 3;
              }
            }
          } else dead = 0;
          // buté sur un coin de loin (un piquet de clôture, l'angle d'un mur) : un petit pas de côté, d'un côté puis de l'autre, et on
          // reprend ; bloqué pour de bon : des milliers de pas sans bouger
          if (Math.hypot(p.wx - last.wx, p.wy - last.wy) > 2) (last = { wx: p.wx, wy: p.wy }, (still = 0));
          else if (++still > 6000) finish({ ok: false, p });
          else if (still % 600 === 0 && d >= 12) {
            const s = (still / 600) % 2 === 1 ? 1 : -1;
            sideKey = axis === 'x' ? (s > 0 ? 'KeyS' : 'KeyW') : s > 0 ? 'KeyD' : 'KeyA';
            side = 60 * Math.ceil(still / 1200);
          }
        };
        g.events.on('poststep', decide);
        return await result;
      },
      { wx, wy, first, tol, zones },
    );
    if (!r.ok) throw new Error(`Xéros est bloqué en route vers (${wx}, ${wy}) : ${(r as any).why ?? 'il ne bouge plus'} ; ${JSON.stringify(r.p)}`);
  };

  /**
   * Un chemin sans obstacle sur la carte en cours (recherche en largeur sur une grille de 4 px, la place de ses pieds libre à chaque
   * pas, hors des personnages), de Xéros jusqu'au but : devant la porte d'entrée de la maison (la sortie de l'intérieur), ou le point `to` (px de la carte),
   * Les portes fermées ne barrent pas le chemin : devant chacune, un arrêt pour l'ouvrir (E) ; de même devant `target`, ouverte ou non.
   */
  const routeTo = (to?: { x: number; y: number }, target?: DoorZone): Promise<Corner[]> =>
    page.evaluate(
      ({ to, target }) => {
        const w = (window as any).game.scene.getScene('world');
        const m = w.map;
        const zone = w.interior?.exits[0]?.zone;
        const door = zone && { x: Math.round((zone.x + zone.w / 2) / 5), y: Math.round(zone.y / 5) - 6 };
        const S = 4;
        const closed = m.builds.filter((b: any) => b.zone && /door$/.test(b.piece.piece.prop ?? '')).map((b: any) => b.zone);
        let margin = w.interior ? 2 : 0;
        // les personnages (le forgeron à son enclume) barrent le passage par leur collision aux pieds, comme dans le jeu : on les contourne
        const people = w.children.list
          .filter((o: any) => o !== w.player.actor && o.skin && o.body?.immovable)
          .map((o: any) => ({ left: o.body.x, top: o.body.y, right: o.body.x + o.body.width, bottom: o.body.y + o.body.height }));
        const free = (x: number, y: number) => {
          // le corps de ses pieds, tel que la physique le pose (FEET de config.ts : 10 × 8, 2 px au-dessus du point des pieds)
          const box = { left: x - 5 - margin, top: y - 10 - margin, right: x + 5 + margin, bottom: y - 2 + margin };
          if (people.some((b: any) => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top)) return false;
          return m.areaFree(box, [], closed);
        };
        const start = [Math.round(w.player.actor.x / S), Math.round(w.player.actor.y / S)];
        const goal = to
          ? (x: number, y: number) => Math.abs(x * S - to.x) <= S / 2 && Math.abs(y * S - to.y) <= S / 2
          : (x: number, y: number) => Math.abs(x * S - door.x) <= S && Math.abs(y * S - door.y) <= S;
        const prev = new Map<string, string>();
        let end: number[] | undefined;
        const search = () => {
          prev.clear();
          const q = [start];
          prev.set(start.join(), '');
          while (q.length) {
            const [x, y] = q.shift()!;
            if (goal(x, y)) {
              end = [x, y];
              break;
            }
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const n = [x + dx, y + dy];
              if (prev.has(n.join()) || !free(n[0] * S, n[1] * S)) continue;
              prev.set(n.join(), `${x},${y}`);
              q.push(n);
            }
          }
        };
        search();
        if (!end) {
          margin = 0;
          search();
        }
        const out: { x: number; y: number }[] = [];
        for (let k = end?.join(); k; k = prev.get(k)) {
          const [x, y] = k.split(',').map(Number);
          out.unshift({ x: x * S, y: y * S });
        }
        const crosses = (q: { x: number; y: number }, z: any) => q.x + 5 > z.x - z.width / 2 && q.x - 5 < z.x + z.width / 2 && q.y > z.y - z.height / 2 && q.y - 8 < z.y + z.height / 2;
        const stops = new Map<number, string>();
        for (const z of [...closed, ...(target ? [target] : [])]) {
          const i = out.findIndex((q) => crosses(q, z));
          if (i < 1) continue;
          const j = Math.max(0, i - 3);
          const d = { x: out[i].x - out[i - 1].x, y: out[i].y - out[i - 1].y };
          stops.set(j, d.x > 0 ? 'right' : d.x < 0 ? 'left' : d.y > 0 ? 'down' : 'up');
        }
        return out
          .map((q, i) => ({ ...q, ...(stops.has(i) ? { open: stops.get(i) } : {}) }))
          .filter((_q, i) => i === 0 || i === out.length - 1 || stops.has(i) || (out[i - 1].x !== out[i + 1].x && out[i - 1].y !== out[i + 1].y));
      },
      { to, target },
    ) as Promise<Corner[]>;

  return { where, goTo, routeTo };
}
