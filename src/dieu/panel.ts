// Outils de test (?dieu) : un panneau HTML à côté du jeu, hors du canevas, cliquable à la souris. Il n'existe pas sans
// ?dieu : main.ts ne charge ce fichier que dans ce cas. Il ne touche jamais à la partie lui-même : chaque bouton envoie
// une DieuCommand (events.ts), que WorldScene exécute par les fonctions de GameState, comme le reste du jeu.
import { items, maps, piles, props, stamina, strength } from '../content';
import { heldMass } from '../content/mass';
import type { DieuCommand } from '../events';
import { game } from '../state';

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

/** Champ de longueur, en mètres, pour un objet qui en a une (`length` de props.json, ou celui qu'il porte). */
function lengthInput(): { input: HTMLInputElement; label: HTMLLabelElement } {
  const input = el('input', { type: 'number', min: '0.5', step: '0.5' });
  return { input, label: el('label', {}, [input, 'm']) };
}

/** La longueur d'un objet de props.json : la sienne (le rouleau) ou celle de ce qu'il porte (le billot et son rouleau). */
function lengthDef(key: string | undefined) {
  const d = key ? props[key] : undefined;
  return d?.length ?? (d?.bears ? props[d.bears.prop].length : undefined);
}

/** Montre le champ de longueur seulement pour un objet qui en a une, rempli de sa longueur neuve. */
function syncLength(f: { input: HTMLInputElement; label: HTMLLabelElement }, key: string | undefined): void {
  const len = lengthDef(key);
  f.label.style.display = len ? '' : 'none';
  if (len) {
    f.input.max = String(len.start / 100);
    f.input.value = String(len.start / 100);
  }
}

/** La longueur choisie, en centimètres, pour l'objet `key` (undefined s'il n'en a pas), entre 50 cm et la longueur neuve. */
function lengthOf(f: { input: HTMLInputElement }, key: string): number | undefined {
  const len = lengthDef(key);
  if (!len) return undefined;
  const m = Math.min(Math.max(0.5, Number(f.input.value) || len.start / 100), len.start / 100);
  return Math.round(m * 100);
}

/** Monte le panneau à côté du jeu (dans #stage) ; `send` transmet une commande à la scène du monde. */
export function mountPanel(send: (cmd: DieuCommand) => void): void {
  document.head.append(el('style', { textContent: CSS }));

  // donner en main : les objets possédables, et les objets du monde qui se prennent (la bille)
  const give = select([
    ['Objets possédables', Object.entries(items).map(([k, d]) => [`item:${k}`, `${d.name} (${k})`])],
    ['Objets du monde à porter', Object.entries(props).filter(([, d]) => d.take).map(([k, d]) => [`prop:${k}`, `${d.name} (${k})`])],
  ]);
  // la longueur d'un objet qui en a une (le rouleau de corde, en mètres), pour le donner ou le poser
  const giveLength = lengthInput();
  const syncGive = () => syncLength(giveLength, give.value.startsWith('prop:') ? give.value.slice(5) : undefined);
  give.addEventListener('change', syncGive);
  syncGive();
  const giveButton = button('Donner', () => {
    const [kind, key] = give.value.split(/:(.*)/);
    const length = lengthOf(giveLength, key);
    send({ kind: 'give', held: kind === 'item' ? { item: key } : { prop: key, ...(length !== undefined ? { length } : {}) } });
  });

  // poser devant Xéros : tout objet du monde de props.json
  const prop = select([['Objets du monde', Object.entries(props).map(([k, d]) => [k, `${d.name} (${k})`])]]);
  const propLength = lengthInput();
  const syncProp = () => syncLength(propLength, prop.value);
  prop.addEventListener('change', syncProp);
  syncProp();
  const propButton = button('Poser', () => send({ kind: 'prop', prop: prop.value, length: lengthOf(propLength, prop.value) }));

  // un tas : genre, nombre de pièces (au plus ses places), sens nord-sud si le genre se tourne
  const pile = select([['Genres de tas', Object.entries(piles).map(([k, d]) => [k, `${d.name} (${k})`])]]);
  // avec son lien dessous, si le genre en a un (les branches) : 0 pièce = le lien seul
  const count = el('input', { type: 'number', min: '1', value: '5' });
  const turned = el('input', { type: 'checkbox' });
  const turnedLabel = el('label', {}, [turned, 'nord-sud']);
  const tie = el('input', { type: 'checkbox' });
  const tieLabel = el('label', {}, [tie, 'avec lien']);
  const syncPile = () => {
    const def = piles[pile.value];
    count.max = String(Object.keys(def.places).length);
    turned.disabled = !def.turned;
    if (!def.turned) turned.checked = false;
    tie.disabled = !def.tie;
    if (!def.tie) tie.checked = false;
    count.min = tie.checked ? '0' : '1';
  };
  pile.addEventListener('change', syncPile);
  tie.addEventListener('change', syncPile);
  syncPile();
  const pileButton = button('Poser le tas', () => {
    const max = Number(count.max);
    const min = Number(count.min);
    const n = Math.min(Math.max(min, Math.round(Number(count.value) || 0)), max);
    count.value = String(n);
    send({ kind: 'pile', pile: pile.value, count: n, turned: turned.checked, tie: tie.checked });
  });

  // la force : un multiplicateur de tous les seuils (porter, marcher, rouler) ; la masse portée se lit à côté
  const force = el('input', { type: 'number', min: '0.1', step: '0.5', value: '1' });
  const forceButton = button('Appliquer', () => {
    const m = Math.max(0.1, Number(force.value) || 1);
    force.value = String(m);
    send({ kind: 'force', multiplier: m });
  });
  const carried = el('div', { className: 'row' });
  const showCarried = () => {
    const [l, r] = game.hands;
    const kg = game.both ? heldMass(game.both) : heldMass(l) + heldMass(r);
    const limit = strength.carry * (Math.max(0.1, Number(force.value) || 1));
    carried.textContent = `Masse portée : ${(Math.round(kg * 10) / 10).toString().replace('.', ',')} kg (jusqu'à ${Math.round(limit)} kg)`;
  };
  showCarried();
  setInterval(showCarried, 200);

  // l'endurance : la régler (points), la rendre infinie ; la valeur lue est celle de GameState (écrite tous les points)
  const energy = el('input', { type: 'number', min: '0', max: String(stamina.max), step: '5', value: String(stamina.max) });
  const energyButton = button('Régler', () => {
    const v = Math.min(stamina.max, Math.max(0, Number(energy.value) || 0));
    energy.value = String(v);
    send({ kind: 'stamina', value: v });
  });
  const infinite = el('input', { type: 'checkbox' });
  infinite.addEventListener('change', () => {
    send({ kind: 'stamina-infinite', on: infinite.checked });
    infinite.blur();
  });
  const energyNow = el('div', { className: 'row' });
  const showEnergy = () => {
    energyNow.textContent = `Endurance : ${Math.round(game.stamina)} / ${stamina.max} · Jour ${game.day}`;
  };
  showEnergy();
  setInterval(showEnergy, 200);

  const mapButtons = Object.entries(maps).map(([id, m]) => button(m.name, () => send({ kind: 'map', map: id })));

  const panel = el('aside', { id: 'dieu' }, [
    el('h2', { textContent: 'Outils de test' }),
    el('h3', { textContent: 'Donner en main' }),
    give,
    el('div', { className: 'row' }, [giveLength.label, giveButton]),
    el('h3', { textContent: 'Poser devant Xéros' }),
    prop,
    el('div', { className: 'row' }, [propLength.label, propButton]),
    el('h3', { textContent: 'Tas devant Xéros' }),
    pile,
    el('div', { className: 'row' }, [count, el('span', { textContent: ' pièces ' }), turnedLabel, tieLabel]),
    pileButton,
    el('h3', { textContent: 'Force de Xéros' }),
    el('div', { className: 'row' }, [el('label', {}, ['force ×', force]), forceButton]),
    carried,
    el('h3', { textContent: 'Endurance' }),
    el('div', { className: 'row' }, [el('label', {}, [energy, 'points']), energyButton]),
    el('div', { className: 'row' }, [el('label', {}, [infinite, 'endurance infinie'])]),
    energyNow,
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
