// Outils de test (?dieu) : un panneau HTML à côté du jeu, hors du canevas, cliquable à la souris. Il n'existe pas sans
// ?dieu : main.ts ne charge ce fichier que dans ce cas. Il ne touche jamais à la partie lui-même : chaque bouton envoie
// une DieuCommand (events.ts), que WorldScene exécute par les fonctions de GameState, comme le reste du jeu.
import { clockLabel } from '../world/clock';
import { items, maps, piles, plans, props, stamina, strength, transforms, wood, work } from '../content';
import type { WoodLook, WoodPiece } from '../content/types';
import { woodOfLook } from '../world/woodShape';
import { heldMass } from '../content/mass';
import type { DieuCommand } from '../events';
import { game } from '../state';
import { SPEEDS, metresPerSec } from '../systems/speeds';
import { SIM_SPEEDS, simSpeed } from '../systems/simSpeed';

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

/**
 * Les longueurs qu'on peut choisir pour un objet de props.json, en cm : celles du rouleau (ou de celui que porte le billot), de
 * 50 cm à neuf, par demi-mètre ; undefined s'il n'a pas de longueur.
 */
function lengthDef(key: string | undefined): { start: number; min: number; max: number; step: number } | undefined {
  const d = key ? props[key] : undefined;
  const len = d?.length ?? (d?.bears?.prop ? props[d.bears.prop].length : undefined);
  return len && { start: len.start, min: 50, max: len.start, step: 50 };
}

/** Montre le champ de longueur seulement pour un objet qui en a une, rempli de sa longueur de départ. */
function syncLength(f: { input: HTMLInputElement; label: HTMLLabelElement }, key: string | undefined): void {
  const len = lengthDef(key);
  f.label.style.display = len ? '' : 'none';
  if (len) {
    f.input.min = String(len.min / 100);
    f.input.max = String(len.max / 100);
    f.input.step = String(len.step / 100);
    f.input.value = String(len.start / 100);
  }
}

/** La longueur choisie, en centimètres, pour l'objet `key` (undefined s'il n'en a pas), bornée et au pas de son champ. */
function lengthOf(f: { input: HTMLInputElement }, key: string): number | undefined {
  const len = lengthDef(key);
  if (!len) return undefined;
  const cm = Math.min(Math.max(len.min, Math.round((Number(f.input.value) * 100 || len.start) / len.step) * len.step), len.max);
  return Math.round(cm);
}

/** Ce qu'on choisit d'une pièce de bois : son aspect donne sa forme et ses coups de doloire (une face tous les `perFace`). */
function woodFrom(size: string, length: number, look: WoodLook, axis: 'ew' | 'ns'): WoodPiece {
  return woodOfLook(size, look, length, axis);
}

/** Monte le panneau à côté du jeu (dans #stage) ; `send` transmet une commande à la scène du monde. */
export function mountPanel(send: (cmd: DieuCommand) => void): void {
  document.head.append(el('style', { textContent: CSS }));

  // donner en main : les objets possédables, et les objets du monde qui se prennent (la bille)
  const give = select([
    ['Objets possédables', Object.entries(items).map(([k, d]) => [`item:${k}`, `${d.name} (${k})`])],
    ['Objets du monde à porter', Object.entries(props).filter(([, d]) => d.take && !d.wood).map(([k, d]) => [`prop:${k}`, `${d.name} (${k})`])],
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

  // mettre au sol devant Xéros l'objet choisi (un objet possédable au sol, un objet du monde posé), comme `supply`
  const giveGround = button('Au sol', () => send({ kind: 'supply', what: give.value.split(/:(.*)/)[1], count: 1 }));

  // les transformations de transforms.json : « Transformer » applique d'un coup celle qu'on choisit à ce que Xéros tient ou vise
  // (la transformation « magique » en attendant le geste ; celles qui ont déjà leur geste s'y essaient aussi)
  const transform = select([
    ['Geste à venir', Object.entries(transforms).filter(([, t]) => t.gesture === 'soon').map(([k, t]) => [k, `${t.name} (${k})`])],
    ['Geste réel', Object.entries(transforms).filter(([, t]) => t.gesture !== 'soon').map(([k, t]) => [k, `${t.name} (${k})`])],
  ]);
  const transformButton = button('Transformer', () => send({ kind: 'transform', id: transform.value }));

  // poser devant Xéros : tout objet du monde de props.json
  const prop = select([['Objets du monde', Object.entries(props).filter(([, d]) => !d.wood).map(([k, d]) => [k, `${d.name} (${k})`])]]);
  const propLength = lengthInput();
  const syncProp = () => syncLength(propLength, prop.value);
  prop.addEventListener('change', syncProp);
  syncProp();
  const propButton = button('Poser', () => send({ kind: 'prop', prop: prop.value, length: lengthOf(propLength, prop.value) }));

  // une pièce de bois : diamètre, longueur sur la grille (de la plus courte pièce à 7 m), aspect (forme, faces), sens
  const woodSize = select([['Diamètre', Object.entries(wood.sizes).map(([k, d]) => [k, `${d.name}, ${d.diameter} cm (${k})`])]]);
  const woodLength = el('input', { type: 'number', min: String(wood.min / 100), max: '7', step: String(wood.grid / 100), value: '1' });
  const woodLook = select([['État', []]]);
  const syncWood = () => {
    const looks = Object.keys(wood.sizes[woodSize.value].looks) as WoodLook[];
    woodLook.replaceChildren(...looks.map((l) => el('option', { value: l, textContent: `${wood.sizes[woodSize.value].looks[l]!.name} (${l})` })));
  };
  woodSize.addEventListener('change', syncWood);
  syncWood();
  const woodAxis = select([['Sens', [['ew', 'est-ouest'], ['ns', 'nord-sud']]]]);
  const chosenWood = (): WoodPiece => {
    const cm = Math.min(700, Math.max(wood.min, Math.round((Number(woodLength.value) * 100 || 100) / wood.grid) * wood.grid));
    woodLength.value = String(cm / 100);
    return woodFrom(woodSize.value, cm, woodLook.value as WoodLook, woodAxis.value as 'ew' | 'ns');
  };
  const woodPlace = button('Poser', () => send({ kind: 'wood', wood: chosenWood() }));
  const woodGive = button('Donner', () => send({ kind: 'give', held: { prop: 'wood-piece', wood: chosenWood() } }));
  // un tas de cette pièce (sa forme se calcule), de `woodCount` pièces, dans son sens ; refusé si elle ne va pas en tas (plus de 70 kg)
  const woodCount = el('input', { type: 'number', min: '1', max: '9', value: '6' });
  const woodPile = button('Poser en tas', () => {
    const w = chosenWood();
    const { axis, ...piece } = w;
    send({ kind: 'pile', wood: piece, count: Math.min(9, Math.max(1, Math.round(Number(woodCount.value) || 1))), turned: axis === 'ns', tie: false });
  });

  // un tas d'un genre écrit (piles.json : branches, fagots) : genre, nombre de pièces (au plus ses places), sens nord-sud si le genre se tourne
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

  // les vitesses de Xéros, en m/s, à calibrer en jouant (docs/CONCEPTION.md, « Le travail », § 8) : la marche et la course (chargé ou
  // fatigué, il marche à une part de la marche) ; retenues dans le navigateur ; « Par défaut » revient à celles de config.ts
  const speedInput = (px: number) => el('input', { type: 'number', min: '0.2', max: '20', step: '0.1', value: (Math.round(metresPerSec(px) * 100) / 100).toString() });
  const walkSpeed = speedInput(SPEEDS.walk);
  const runSpeed = speedInput(SPEEDS.run);
  const metres = (i: HTMLInputElement) => Math.min(20, Math.max(0.2, Number(i.value) || 1));
  const speedsButton = button('Appliquer', () => send({ kind: 'speeds', walk: metres(walkSpeed), run: metres(runSpeed) }));
  const speedsDefault = button('Par défaut', () => {
    send({ kind: 'speeds-default' });
    setTimeout(() => {
      walkSpeed.value = String(Math.round(metresPerSec(SPEEDS.walk) * 100) / 100);
      runSpeed.value = String(Math.round(metresPerSec(SPEEDS.run) * 100) / 100);
    }, 50);
  });

  // la vitesse de simulation : tout à l'écran plus vite (coups, pauses, marche), par pas de taille normale ; le palier en cours marqué
  const simLabel = el('span', { textContent: '' });
  const showSim = () => (simLabel.textContent = ` en ce moment : x${simSpeed()}`);
  const simButtons = SIM_SPEEDS.map((n) =>
    button(`x${n}`, () => {
      send({ kind: 'sim-speed', factor: n });
      setTimeout(showSim, 50);
    }),
  );
  showSim();
  setInterval(showSim, 300);

  // la force : un multiplicateur de tous les seuils (porter, marcher, rouler) et de la force des coups de travail (le couple de
  // strength.json `swing`) ; réglée pendant un travail, elle agit au coup suivant ; la masse portée se lit à côté
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
  // l'endurance en trois niveaux (souffle, plafond du jour, maximum) : les régler (points), la rendre infinie ; les valeurs lues sont
  // celles de GameState (écrites tous les quelques points)
  const level = (value: number) => el('input', { type: 'number', min: '0', max: String(stamina.max.cap), step: '5', value: String(value) });
  const energyBreath = level(stamina.max.start);
  const energyCeiling = level(stamina.max.start);
  const energyMax = level(stamina.max.start);
  const energyButton = button('Régler', () => {
    const max = Math.min(stamina.max.cap, Math.max(1, Number(energyMax.value) || 1));
    const ceiling = Math.min(max, Math.max(0, Number(energyCeiling.value) || 0));
    const breath = Math.min(ceiling, Math.max(0, Number(energyBreath.value) || 0));
    [energyMax.value, energyCeiling.value, energyBreath.value] = [max, ceiling, breath].map(String);
    send({ kind: 'stamina', breath, ceiling, max });
  });
  // l'horloge : aller à une heure (la prochaine fois qu'elle sonne), pour essayer la nuit et le lever
  const clockHour = el('input', { type: 'number', min: '0', max: '23.75', step: '0.5', value: '22' });
  const clockButton = button("Aller à l'heure", () => send({ kind: 'clock', hour: Math.min(23.75, Math.max(0, Number(clockHour.value) || 0)) }));
  const infinite = el('input', { type: 'checkbox' });
  infinite.addEventListener('change', () => {
    send({ kind: 'stamina-infinite', on: infinite.checked });
    infinite.blur();
  });
  const energyNow = el('div', { className: 'row' });
  const showEnergy = () => {
    const e = game.stamina;
    energyNow.textContent = `Souffle ${Math.round(e.breath)} · plafond ${Math.round(e.ceiling)} · maximum ${Math.round(e.max)} · ${clockLabel(game.clock)}`;
  };
  showEnergy();
  setInterval(showEnergy, 200);

  // l'implantation : apprendre un plan, avoir sous la main de quoi tracer et bâtir, effacer les chantiers de la carte
  const plan = select([['Plans', Object.entries(plans).map(([k, d]) => [k, `${d.name} (${k})`])]]);
  const known = el('div', { className: 'row' });
  const showKnown = () => {
    known.textContent = `Plans connus : ${game.knownPlans.length ? game.knownPlans.map((k) => plans[k]?.name ?? k).join(', ') : 'aucun'}`;
  };
  showKnown();
  setInterval(showKnown, 300);
  const supply = (what: string, count: number) => () => send({ kind: 'supply', what, count });
  const stakeOf = () => plans[plan.value].stake;

  const mapButtons = Object.entries(maps).map(([id, m]) => button(m.name, () => send({ kind: 'map', map: id })));

  const panel = el('aside', { id: 'dieu' }, [
    el('h2', { textContent: 'Outils de test' }),
    el('h3', { textContent: 'Donner en main' }),
    give,
    el('div', { className: 'row' }, [giveLength.label, giveButton, giveGround]),
    el('h3', { textContent: 'Matières : transformer' }),
    transform,
    transformButton,
    el('h3', { textContent: 'Poser devant Xéros' }),
    prop,
    el('div', { className: 'row' }, [propLength.label, propButton]),
    el('h3', { textContent: 'Pièce de bois' }),
    woodSize,
    woodLook,
    woodAxis,
    el('div', { className: 'row' }, [el('label', {}, [woodLength, 'm']), woodPlace, woodGive]),
    el('div', { className: 'row' }, [el('label', {}, [woodCount, 'pièces']), woodPile]),
    el('h3', { textContent: 'Tas devant Xéros' }),
    pile,
    el('div', { className: 'row' }, [count, el('span', { textContent: ' pièces ' }), turnedLabel, tieLabel]),
    pileButton,
    el('h3', { textContent: 'Vitesse de simulation' }),
    el('div', { className: 'row' }, [...simButtons, simLabel]),
    el('h3', { textContent: 'Vitesses (m/s)' }),
    el('div', { className: 'row' }, [el('label', {}, ['marche', walkSpeed]), el('label', {}, ['course', runSpeed])]),
    el('div', { className: 'row' }, [speedsButton, speedsDefault]),
    el('h3', { textContent: 'Force de Xéros' }),
    el('div', { className: 'row' }, [el('label', {}, ['force ×', force]), forceButton]),
    el('div', { className: 'row' }, [
      // la force du bûcheron fort (work.json, `references.strong`) rapportée à celle de Xéros (strength.json, `swing`)
      button(`bûcheron fort (×${(work.references.strong.torque / strength.swing.torque).toFixed(1).replace('.', ',')})`, () => {
        const m = work.references.strong.torque / strength.swing.torque;
        force.value = String(Math.round(m * 100) / 100);
        send({ kind: 'force', multiplier: m });
      }),
      button('Xéros (×1)', () => {
        force.value = '1';
        send({ kind: 'force', multiplier: 1 });
      }),
    ]),
    carried,
    el('h3', { textContent: 'Endurance' }),
    el('div', { className: 'row' }, [el('label', {}, ['souffle', energyBreath]), el('label', {}, ['plafond', energyCeiling])]),
    el('div', { className: 'row' }, [el('label', {}, ['maximum', energyMax]), energyButton]),
    el('div', { className: 'row' }, [button('Endurance de départ', () => send({ kind: 'stamina-start' }))]),
    el('div', { className: 'row' }, [el('label', {}, [infinite, 'endurance infinie'])]),
    el('div', { className: 'row' }, [el('label', {}, ['heure', clockHour]), clockButton]),
    el('div', { className: 'row' }, [button('Finir le travail', () => send({ kind: 'finish-work' }))]),
    energyNow,
    el('h3', { textContent: 'Implantation' }),
    plan,
    el('div', { className: 'row' }, [
      button('Apprendre le plan', () => send({ kind: 'learn-plan', plan: plan.value })),
      button('4 piquets au sol', () => supply(stakeOf(), 4)()),
      button('4 dalles au sol', supply('slab', 4)),
    ]),
    known,
    el('div', { className: 'row' }, [button('Sauter l\'étape du chantier', () => send({ kind: 'skip-step' })), confirmButton('Effacer les chantiers', () => send({ kind: 'erase-sites' }))]),
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
