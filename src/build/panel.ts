// Le catalogue du mode construction (?construire) : un panneau HTML à gauche du jeu, hors du canevas, cliquable à la souris. Il
// n'existe pas sans ?construire : main.ts ne charge ce fichier que dans ce cas. Il ne touche jamais à la partie : chaque choix
// envoie une BuildCommand (events.ts) que WorldScene transmet au mode construction (systems/build.ts), et il affiche ce que la
// scène lui renvoie (BuildStatus). Vignettes : les images produites par build-art (src/generated/assets.ts).

import { wood } from '../content';
import { buildPlans, onBuildPlans } from '../content/buildPlans';
import type { WoodLook } from '../content/types';
import type { BuildCommand, BuildStatus } from '../events';
import { images, spritesheets } from '../generated/assets';
import { canStand, catalog, FAMILIES, looksOf, woodFrom, woodThumb, type CatalogEntry } from './catalog';

const CSS = `
#construire {
  width: 270px; flex: none; overflow-y: auto; box-sizing: border-box; padding: 10px 10px 16px;
  background: #1d1812; border-right: 1px solid #3a2f22; color: #e8dcc0;
  font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace;
}
#construire h2 { margin: 0 0 6px; font-size: 13px; color: #f3d9b0; }
#construire h3 { margin: 10px 0 4px; font-size: 11px; color: #b9a98a; text-transform: uppercase; letter-spacing: 0.05em; }
#construire input, #construire select { box-sizing: border-box; background: #14110d; color: #e8dcc0; border: 1px solid #5c4a33; font: inherit; }
#construire input[type=search], #construire input[type=text] { width: 100%; margin: 2px 0; padding: 2px 4px; }
#construire button { margin: 2px 4px 2px 0; padding: 2px 8px; background: #3a2f22; color: #e8dcc0; border: 1px solid #5c4a33; border-radius: 3px; font: inherit; cursor: pointer; }
#construire button:hover { background: #4a3c2a; }
#construire button.on { background: #6b5434; border-color: #c9a56b; }
#construire .tabs button { margin-right: 2px; }
#construire .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
#construire .tile { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 3px 2px; margin: 0; min-height: 64px; }
#construire .tile canvas { width: 44px; height: 44px; image-rendering: pixelated; }
#construire .tile span { font-size: 9px; line-height: 1.1; text-align: center; overflow-wrap: anywhere; }
#construire .row { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin: 2px 0; }
#construire .status { margin-top: 8px; padding: 6px; background: #14110d; border: 1px solid #3a2f22; white-space: pre-line; }
#construire .keys { margin-top: 8px; color: #b9a98a; }
#construire kbd { border: 1px solid #5c4a33; border-bottom-width: 2px; border-radius: 3px; padding: 0 3px; color: #e8dcc0; }
`;

/** Un élément HTML, ses propriétés et ses enfants. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, p: Record<string, unknown> = {}, children: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const e: HTMLElementTagNameMap[K] = document.createElement(tag);
  Object.assign(e, p);
  e.append(...children);
  return e;
}

/** Un bouton qui rend le clavier au jeu après le clic (ZQSD doit encore déplacer la caméra). */
function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', { type: 'button', textContent: text });
  b.addEventListener('click', () => {
    onClick();
    b.blur();
  });
  return b;
}

/** Une liste déroulante ; elle rend le clavier au jeu après un choix. */
function select(options: [string, string][], onChange: () => void): HTMLSelectElement {
  const s = el('select');
  for (const [value, text] of options) s.append(el('option', { value, textContent: text }));
  s.addEventListener('change', () => {
    onChange();
    s.blur();
  });
  return s;
}

/** Les images déjà chargées pour les vignettes, par adresse. */
const loaded = new Map<string, Promise<HTMLImageElement>>();
function load(url: string): Promise<HTMLImageElement> {
  let p = loaded.get(url);
  if (!p) {
    p = new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = ko;
      img.src = url;
    });
    loaded.set(url, p);
  }
  return p;
}

/** La vignette d'une image du jeu (la première image d'une planche), agrandie d'un nombre entier de fois pour tenir dans 44 px. */
function thumb(key: string): HTMLCanvasElement {
  const c = el('canvas', { width: 44, height: 44 });
  const im = images.find((i) => i.key === key);
  const sh = im ? undefined : spritesheets.find((s) => s.key === key);
  const src = im ? { url: im.url, w: im.width, h: im.height } : sh ? { url: sh.url, w: sh.frameWidth, h: sh.frameHeight } : undefined;
  if (!src) return c;
  void load(src.url).then((img) => {
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const k = Math.max(1, Math.floor(Math.min(44 / src.w, 44 / src.h)));
    const s = Math.min(k, 44 / Math.max(src.w, src.h));
    const w = src.w * s;
    const h = src.h * s;
    ctx.drawImage(img, 0, 0, src.w, src.h, (44 - w) / 2, (44 - h) / 2, w, h);
  });
  return c;
}

/** Sans accent ni majuscule, pour chercher. */
const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Monte le catalogue à gauche du jeu (dans #stage) ; `send` transmet une commande à la scène. Renvoie de quoi afficher l'état. */
export function mountBuildPanel(send: (cmd: BuildCommand) => void): { status: (s: BuildStatus) => void } {
  document.head.append(el('style', { textContent: CSS }));
  const entries = catalog();
  let tab: 'objects' | 'plans' = 'objects';
  let chosen: string | undefined;

  // les réglages de la pièce de bois : diamètre, aspect, longueur (grille de wood.json), sens
  const sizes = Object.keys(wood.sizes);
  const wSize = select(sizes.map((k) => [k, `${k} (${wood.sizes[k].diameter} cm)`]), () => {
    fillLooks();
    pickWood();
  });
  wSize.value = 'normal';
  const wLook = select([], () => pickWood());
  const wLen = el('input', { type: 'number', min: String(wood.min), max: '800', step: String(wood.grid), value: '200', style: 'width:64px' });
  wLen.addEventListener('change', () => {
    wLen.value = String(Math.max(wood.min, Math.round(Number(wLen.value) / wood.grid) * wood.grid || 200));
    pickWood();
    wLen.blur();
  });
  const wAxis = select([['ew', 'est-ouest'], ['ns', 'nord-sud'], ['up', 'debout']], () => pickWood());
  const fillLooks = () => {
    const names: Record<WoodLook, string> = { round: 'ronde', half: 'demi', quarter: 'quartier', f1: '1 face', f2: '2 faces', f3: '3 faces', beam: 'poutre', plank: 'planche' };
    wLook.replaceChildren(...looksOf(wSize.value).map((l) => el('option', { value: l, textContent: names[l] })));
    if (looksOf(wSize.value).includes('beam')) wLook.value = 'beam';
  };
  fillLooks();
  const woodBox = el('div', {}, [
    el('h3', { textContent: 'Pièce de bois' }),
    el('div', { className: 'row' }, ['diamètre', wSize]),
    el('div', { className: 'row' }, ['état', wLook, 'sens', wAxis]),
    el('div', { className: 'row' }, ['longueur', wLen, 'cm']),
  ]);
  const pickWood = () => {
    const look = wLook.value as WoodLook;
    const axis = wAxis.value as 'ew' | 'ns' | 'up';
    if (axis === 'up' && !canStand(wSize.value, look)) wAxis.value = 'ew';
    chosen = 'wood';
    send({ kind: 'pick', piece: { wood: woodFrom(wSize.value, Number(wLen.value), look, wAxis.value as 'ew' | 'ns' | 'up') } });
    render();
  };

  // les réglages d'une matière naturelle : forme et taille, au hasard par défaut
  const nForm = select([['', 'au hasard'], ['0', 'a'], ['1', 'b']], () => pickNatural());
  const nSize = el('input', { type: 'number', placeholder: 'au hasard', style: 'width:80px' });
  nSize.addEventListener('change', () => {
    pickNatural();
    nSize.blur();
  });
  const natBox = el('div', {}, [el('h3', { textContent: 'Matière naturelle' }), el('div', { className: 'row' }, ['forme', nForm, 'taille', nSize, '%'])]);
  let natEntry: CatalogEntry | undefined;
  const pickNatural = () => {
    const e = natEntry;
    if (!e?.natural) return;
    const size = Number(nSize.value);
    const lo = 100 - e.natural.vary;
    const hi = 100 + e.natural.vary;
    const nat = {
      ...(nForm.value && e.natural.forms === 2 ? { form: Number(nForm.value) as 0 | 1 } : {}),
      ...(nSize.value && size ? { size: Math.min(hi, Math.max(lo, Math.round(size))) } : {}),
    };
    send({ kind: 'pick', piece: e.ref, natural: nat });
  };

  const search = el('input', { type: 'search', placeholder: 'chercher…' });
  search.addEventListener('input', () => render());
  search.addEventListener('keydown', (e) => e.stopPropagation());
  const tabs = el('div', { className: 'tabs row' });
  const list = el('div');
  const settings = el('div');

  const pick = (e: CatalogEntry) => {
    chosen = e.id;
    if (e.wood) return pickWood();
    natEntry = e.natural ? e : undefined;
    if (e.natural) {
      nForm.value = '';
      nSize.value = '';
      nSize.placeholder = `${100 - e.natural.vary} à ${100 + e.natural.vary}`;
    }
    send({ kind: 'pick', piece: e.ref });
    render();
  };

  const tile = (name: string, image: HTMLCanvasElement, on: boolean, onClick: () => void) => {
    const b = button('', onClick);
    b.className = `tile${on ? ' on' : ''}`;
    b.title = name;
    b.append(image, el('span', { textContent: name }));
    return b;
  };

  const render = () => {
    tabs.replaceChildren(
      Object.assign(button('Objets', () => ((tab = 'objects'), render())), { className: tab === 'objects' ? 'on' : '' }),
      Object.assign(button(`Plans (${Object.keys(buildPlans).length})`, () => ((tab = 'plans'), render())), { className: tab === 'plans' ? 'on' : '' }),
    );
    const q = plain(search.value.trim());
    const nodes: Node[] = [];
    if (tab === 'objects') {
      for (const f of FAMILIES) {
        const these = entries.filter((e) => e.family === f && (!q || plain(e.name).includes(q) || plain(e.id).includes(q)));
        if (!these.length) continue;
        nodes.push(el('h3', { textContent: f }));
        const grid = el('div', { className: 'grid' });
        for (const e of these) {
          const img = e.wood ? thumb(woodThumb(wSize.value, (wLook.value || 'round') as WoodLook)) : thumb(e.thumb);
          grid.append(tile(e.name, img, chosen === e.id, () => pick(e)));
        }
        nodes.push(grid);
      }
    } else {
      const names = Object.keys(buildPlans).filter((k) => !q || plain(buildPlans[k].name).includes(q) || k.includes(q));
      if (!names.length) nodes.push(el('p', { textContent: 'Aucun plan : choisis une zone, puis « Enregistrer comme plan ».' }));
      for (const k of names) {
        const p = buildPlans[k];
        const b = button(`${p.name} — ${p.pieces.length} pièces, ${p.size.w / 100} × ${p.size.d / 100} m`, () => {
          chosen = `plan:${k}`;
          send({ kind: 'pick-plan', plan: k });
          render();
        });
        if (chosen === `plan:${k}`) b.className = 'on';
        nodes.push(el('div', {}, [b]));
      }
    }
    list.replaceChildren(...nodes);
    settings.replaceChildren(...(chosen === 'wood' ? [woodBox] : natEntry && chosen === natEntry.id ? [natBox] : []));
  };
  onBuildPlans(render);

  const statusBox = el('div', { className: 'status', textContent: '' });
  const toggle = button('Entrer (B)', () => send({ kind: 'toggle' }));
  const planName = el('input', { type: 'text', placeholder: 'nom du plan' });
  planName.addEventListener('keydown', (e) => e.stopPropagation());
  const tools = el('div', {}, [
    el('h3', { textContent: 'Outils' }),
    el('div', { className: 'row' }, [
      toggle,
      button('Rien en main', () => ((chosen = undefined), send({ kind: 'none' }), render())),
      button('Choisir une zone', () => ((chosen = undefined), send({ kind: 'select' }), render())),
    ]),
    el('div', { className: 'row' }, [button('Annuler', () => send({ kind: 'undo' })), button('Refaire', () => send({ kind: 'redo' }))]),
    planName,
    button('Enregistrer comme plan', () => send({ kind: 'save-plan', name: planName.value })),
  ]);
  const keys = el('div', { className: 'keys' });
  keys.innerHTML =
    '<kbd>B</kbd> entrer, sortir · <kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches : caméra (<kbd>Maj</kbd> plus vite) · molette : zoom<br>' +
    'clic gauche : poser · clic droit : retirer (<kbd>Maj</kbd> : avec ce qui est dessus)<br>' +
    '<kbd>R</kbd> tourner · <kbd>T</kbd> monter d’un cran · <kbd>G</kbd> descendre (20 cm)<br>' +
    '<kbd>Ctrl</kbd>+<kbd>Z</kbd> annuler · <kbd>Ctrl</kbd>+<kbd>Y</kbd> refaire';

  const panel = el('div', { id: 'construire' }, [el('h2', { textContent: 'Construire' }), tools, statusBox, settings, tabs, search, list, keys]);
  document.getElementById('stage')!.prepend(panel);
  render();

  return {
    status: (s) => {
      toggle.textContent = s.active ? 'Sortir (B)' : 'Entrer (B)';
      const sel = s.selection ? `zone ${s.selection.w / 100} × ${s.selection.d / 100} m` : 'aucune zone';
      statusBox.textContent = `${s.active ? 'Mode construction' : 'En jeu'}\nen main : ${s.tool}${s.step ? ` (${s.step > 0 ? '+' : ''}${s.step * 20} cm)` : ''}\n${s.count} pièces posées · ${sel}\nannuler : ${s.undo} · refaire : ${s.redo}`;
    },
  };
}
