// Outils de test (?dieu) : un panneau HTML à côté du jeu, hors du canevas, cliquable à la souris. Il n'existe pas sans
// ?dieu : main.ts ne charge ce fichier que dans ce cas. Il ne touche jamais à la partie lui-même : chaque bouton envoie
// une DieuCommand (events.ts), que WorldScene exécute par les fonctions de GameState, comme le reste du jeu.
import { items, maps, piles, props } from '../content';
import type { DieuCommand } from '../events';

const CSS = `
#dieu {
  width: 250px; flex: none; overflow-y: auto; box-sizing: border-box; padding: 10px 12px;
  background: #1d1812; border-left: 1px solid #3a2f22; color: #e8dcc0;
  font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace;
}
#dieu h2 { margin: 0 0 8px; font-size: 13px; color: #f3d9b0; }
#dieu h3 { margin: 12px 0 4px; font-size: 11px; color: #b9a98a; text-transform: uppercase; letter-spacing: 0.05em; }
#dieu select, #dieu input[type=number] { width: 100%; box-sizing: border-box; margin: 2px 0; background: #14110d; color: #e8dcc0; border: 1px solid #5c4a33; font: inherit; }
#dieu input[type=number] { width: 64px; }
#dieu label { display: inline-flex; align-items: center; gap: 4px; margin-right: 8px; }
#dieu button { margin: 2px 4px 2px 0; padding: 2px 8px; background: #3a2f22; color: #e8dcc0; border: 1px solid #5c4a33; border-radius: 3px; font: inherit; cursor: pointer; }
#dieu button:hover { background: #4a3c2a; }
#dieu .row { display: flex; align-items: center; flex-wrap: wrap; }
`;

/** Un élément HTML, ses propriétés (`textContent`, `type`...) et ses enfants. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, children: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const e: HTMLElementTagNameMap[K] = document.createElement(tag);
  Object.assign(e, props);
  e.append(...children);
  return e;
}

/** Un bouton qui rend le clavier au jeu après le clic (sinon Espace le recliquerait, et ZQSD ne ferait plus marcher Xéros). */
function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', { type: 'button', textContent: text });
  b.addEventListener('click', () => {
    onClick();
    b.blur();
  });
  return b;
}

/** Délai (ms) pendant lequel un bouton à confirmer attend son second clic, avant de reprendre son texte. */
const CONFIRM_MS = 3000;

/** Un bouton à confirmer : le premier clic le change en « Vraiment ? », le second agit ; sans second clic, il revient. */
function confirmButton(text: string, onConfirm: () => void): HTMLButtonElement {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reset = () => {
    clearTimeout(timer);
    timer = undefined;
    b.textContent = text;
  };
  const b = button(text, () => {
    if (!timer) {
      b.textContent = 'Vraiment ?';
      timer = setTimeout(reset, CONFIRM_MS);
      return;
    }
    reset();
    onConfirm();
  });
  return b;
}

/** Une liste déroulante, rangée par groupes ; elle rend aussi le clavier au jeu après un choix. */
function select(groups: [string, [string, string][]][]): HTMLSelectElement {
  const s = el('select');
  for (const [label, options] of groups) {
    const g = el('optgroup', { label });
    for (const [value, text] of options) g.append(el('option', { value, textContent: text }));
    s.append(g);
  }
  s.addEventListener('change', () => s.blur());
  return s;
}

/** Monte le panneau à côté du jeu (dans #stage) ; `send` transmet une commande à la scène du monde. */
export function mountPanel(send: (cmd: DieuCommand) => void): void {
  document.head.append(el('style', { textContent: CSS }));

  // donner en main : les objets possédables, et les objets du monde qui se prennent (la bille)
  const give = select([
    ['Objets possédables', Object.entries(items).map(([k, d]) => [`item:${k}`, `${d.name} (${k})`])],
    ['Objets du monde à porter', Object.entries(props).filter(([, d]) => d.take).map(([k, d]) => [`prop:${k}`, `${d.name} (${k})`])],
  ]);
  const giveButton = button('Donner', () => {
    const [kind, key] = give.value.split(/:(.*)/);
    send({ kind: 'give', held: kind === 'item' ? { item: key } : { prop: key } });
  });

  // poser devant Xéros : tout objet du monde de props.json
  const prop = select([['Objets du monde', Object.entries(props).map(([k, d]) => [k, `${d.name} (${k})`])]]);
  const propButton = button('Poser', () => send({ kind: 'prop', prop: prop.value }));

  // un tas : genre, nombre de pièces (au plus ses places), sens nord-sud si le genre se tourne
  const pile = select([['Genres de tas', Object.entries(piles).map(([k, d]) => [k, `${d.name} (${k})`])]]);
  const count = el('input', { type: 'number', min: '1', value: '5' });
  const turned = el('input', { type: 'checkbox' });
  const turnedLabel = el('label', {}, [turned, 'nord-sud']);
  const syncPile = () => {
    const def = piles[pile.value];
    count.max = String(Object.keys(def.places).length);
    turned.disabled = !def.turned;
    if (!def.turned) turned.checked = false;
  };
  pile.addEventListener('change', syncPile);
  syncPile();
  const pileButton = button('Poser le tas', () => {
    const max = Number(count.max);
    const n = Math.min(Math.max(1, Math.round(Number(count.value) || 1)), max);
    count.value = String(n);
    send({ kind: 'pile', pile: pile.value, count: n, turned: turned.checked });
  });

  const mapButtons = Object.entries(maps).map(([id, m]) => button(m.name, () => send({ kind: 'map', map: id })));

  const panel = el('aside', { id: 'dieu' }, [
    el('h2', { textContent: 'Outils de test' }),
    el('h3', { textContent: 'Donner en main' }),
    give,
    giveButton,
    el('h3', { textContent: 'Poser devant Xéros' }),
    prop,
    propButton,
    el('h3', { textContent: 'Tas devant Xéros' }),
    pile,
    el('div', { className: 'row' }, [count, el('span', { textContent: ' pièces ' }), turnedLabel]),
    pileButton,
    el('h3', { textContent: 'Aller sur une carte' }),
    el('div', { className: 'row' }, mapButtons),
    el('h3', { textContent: 'Remettre à zéro' }),
    el('div', { className: 'row' }, [
      button('Cette carte', () => send({ kind: 'reset-map' })),
      confirmButton('Toute la partie', () => send({ kind: 'reset-game' })),
    ]),
  ]);
  document.getElementById('stage')!.append(panel);
}
