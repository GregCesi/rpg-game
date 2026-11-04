// Essai « sangliers » (hors jeu, rien ne change dans le jeu) : les chiffres du cadrage (CADRAGE-sangliers.md), tirés du vrai moteur.
// Pour chaque objet que Xéros tient : l'énergie d'un coup (taille, coup d'en haut) et d'un lancer au plus loin, à sa force et au
// plafond humain ; puis ce que la peau et l'écu du sanglier en laissent passer (la règle proposée : les dégâts de l'énergie au-delà
// de ce qu'encaisse la bête), le nombre de coups pour le tuer ; enfin la charge (choc contre Xéros, contre un arbre).
// Lancer : npx tsx tools/essai-sangliers-chiffres.ts

import { combat, items, stamina, strength } from '../src/content';
import { combatPoses } from '../src/generated/combatPoses';
import { heftOf, improvisedStroke } from '../src/world/heft';
import { attackCost, impactDamage, strikeEnergy } from '../src/world/strike';
import { kinetic, maxRange, releaseOf } from '../src/world/throw';

// ---- les valeurs proposées (CADRAGE-sangliers.md) ----
const BOAR = { kg: 80, hp: 30, hide: 120, speed: 11, accel: 8 }; // hide : les joules qu'encaisse la peau et l'écu à chaque choc
const XEROS = { kg: 70, hp: 100 };
const TUSK = 0.15; // l'efficacité de la charge sur Xéros : la part du choc qui blesse (le reste le renverse)

const rules = combat.rules;
const base = strength.swing;
const human = { torque: base.humanMax, omegaMax: base.omegaMax, skill: base.skill };
const fmt = (n: number, d = 0) => n.toFixed(d).replace('.', ',');

type Who = { torque: number; omegaMax: number; skill: number };

function hit(item: string, who: Who) {
  const h = heftOf({ item });
  if (!h) return undefined;
  const energy = (key: string) => {
    const a = combat.attacks[key];
    const sweep = combat.sweeps[a.gesture];
    const frames = combatPoses[a.gesture].down;
    return h.improvised ? improvisedStroke(h, who).joules * a.power : strikeEnergy(rules, a, sweep, frames, h.weapon, h.kg);
  };
  return { h, cut: energy('cut'), overhead: energy('overhead') };
}

// la peau et l'écu encaissent `hide` J d'un choc sans tranchant ; un tranchant (`edge` de `work`, de 0 à 1) les coupe d'autant
const edgeOf = (item: string) => (item ? (items[item]?.work?.edge ?? 0) : 0);
const through = (j: number, eff: number, edge = 0) => impactDamage(rules, Math.max(0, j - BOAR.hide * (1 - edge)), eff);

console.log(`Coups et lancers contre le sanglier (${BOAR.kg} kg, ${BOAR.hp} points, la peau et l'écu encaissent ${BOAR.hide} J par choc)\n`);
console.log('objet | kg | force | taille J | dégâts lapin | dégâts sanglier | coups | coup d\'en haut J | sanglier | coups | lancer J | sanglier');
const rows: [string, string][] = [['poing', '']];
for (const k of ['branch', 'wooden-sword', 'stake', 'small-rough-stone', 'rough-stone', 'rubble-stone', 'big-rough-stone', 'axe', 'broadaxe', 'pickaxe', 'maul', 'spade']) rows.push([items[k].name, k]);
for (const [label, item] of rows) {
  for (const [wl, who] of [
    ['Xéros', base],
    ['humain max', human],
  ] as const) {
    let cut: number, over: number, eff: number, kg: number;
    if (!item) {
      const w = combat.unarmed;
      const jab = combat.attacks['jab-right'];
      cut = strikeEnergy(rules, jab, combat.sweeps[jab.gesture], combatPoses[jab.gesture].down, w, w.mass);
      over = cut;
      eff = w.efficiency;
      kg = w.mass;
      if (wl !== 'Xéros') continue;
    } else {
      const r = hit(item, who);
      if (!r) continue;
      cut = r.cut;
      over = r.overhead;
      eff = r.h.weapon.efficiency;
      kg = r.h.kg;
    }
    let thr = '';
    if (item) {
      const rel = releaseOf({ item }, who);
      const range = maxRange(rel.speed, combat.throw.height, combat.throw.gravity);
      const j = kinetic(kg, Math.sqrt(rel.speed ** 2 + 2 * combat.throw.gravity * combat.throw.height));
      thr = `${fmt(j)} (${fmt(range, 1)} m) | ${fmt(through(j, combat.throw.efficiency), 1)}`;
    }
    const n = (d: number) => (d > 0 ? String(Math.ceil(BOAR.hp / d)) : '∞');
    const dc = through(cut, eff, edgeOf(item));
    const dov = through(over, eff, edgeOf(item));
    console.log(
      `${label || 'poing'} | ${fmt(kg, 1)} | ${wl} | ${fmt(cut)} | ${fmt(impactDamage(rules, cut, eff), 1)} | ${fmt(dc, 1)} | ${n(dc)} | ${fmt(over)} | ${fmt(dov, 1)} | ${n(dov)} | ${thr}`,
    );
  }
}

// ---- la charge ----
console.log('\nLa charge');
for (const kg of [50, 80, 100]) {
  const v = BOAR.speed;
  const ke = kinetic(kg, v);
  // choc mou contre Xéros (il est emporté) : l'énergie perdue dans le choc, ½ μ v², μ la masse réduite
  const mu = (kg * XEROS.kg) / (kg + XEROS.kg);
  const lost = 0.5 * mu * v * v;
  const after = (kg * v) / (kg + XEROS.kg);
  const dmg = impactDamage(rules, lost, TUSK);
  const slide = (after * after) / (2 * 0.7 * 9.81); // Xéros glisse et roule, frottement 0,7
  console.log(
    `${kg} kg à ${fmt(v, 0)} m/s : ${fmt(ke)} J ; contre Xéros (${XEROS.kg} kg) : ${fmt(lost)} J perdus dans le choc, Xéros emporté à ${fmt(after, 1)} m/s, ${fmt(slide, 1)} m au sol, ${fmt(dmg, 1)} points sur ${XEROS.hp} (${Math.ceil(XEROS.hp / dmg)} charges)`,
  );
  console.log(`   contre un arbre : ${fmt(ke)} J dans la bête ; ce qui passe sa peau : ${fmt(ke - BOAR.hide)} J`);
}
const tAccel = BOAR.speed / BOAR.accel;
console.log(`\nDépart : ${fmt(tAccel, 2)} s pour atteindre ${BOAR.speed} m/s (${fmt((BOAR.speed * tAccel) / 2, 1)} m parcourus) à ${BOAR.accel} m/s²`);
for (const d of [6, 9, 12, 15]) {
  const accelD = (BOAR.speed * tAccel) / 2;
  const t = d <= accelD ? Math.sqrt((2 * d) / BOAR.accel) : tAccel + (d - accelD) / BOAR.speed;
  console.log(`   ${d} m : ${fmt(t, 2)} s ; à la course (2,5 m/s) Xéros fait ${fmt(2.5 * t, 1)} m de côté pendant ce temps`);
}
console.log(`\nPrix d'un coup (au joule, stamina.json) : taille à la hache ${JSON.stringify(attackCost(stamina.work, hit('axe', base)!.cut))}`);

// ---- la durée des coups (le temps qu'il faut pendant que la bête est sonnée) ----
console.log('\nDurée d\'un coup, à la force de Xéros');
for (const item of ['axe', 'branch', 'maul']) {
  const h = heftOf({ item })!;
  for (const key of ['cut', 'overhead']) {
    const a = combat.attacks[key];
    const frames = combatPoses[a.gesture].down;
    const slow = h.improvised ? Math.max(1, improvisedStroke(h, base).slow) : 1;
    const ms = frames.reduce((s, f) => s + f.ms, 0) * slow;
    console.log(`   ${items[item].name}, ${a.name} : ${fmt(ms)} ms${h.improvised ? '' : ' (poses de l\'arme, allongées par son inertie en jeu)'}`);
  }
}

// ---- une charge dans la vraie forêt profonde : rencontre-t-elle un tronc ? ----
import { readFileSync } from 'node:fs';
import { props } from '../src/content';
const zone = JSON.parse(readFileSync('tiled/maps/foret-profonde.tmj', 'utf8'));
type Box = { l: number; r: number; t: number; b: number };
const trunks: Box[] = [];
for (const L of zone.layers)
  if (L.type === 'objectgroup')
    for (const o of L.objects) {
      const p = props[o.type];
      if (!p?.body || !['big-tree', 'normal-tree'].includes(o.type)) continue;
      const cx = o.x + (o.width ?? 0) / 2;
      const bottom = o.y - (p.body.bottom ?? 0);
      trunks.push({ l: cx - p.body.w / 2, r: cx + p.body.w / 2, t: bottom - p.body.h, b: bottom });
    }
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const PX = 20; // px par mètre
const half = 4; // la moitié de la largeur du sanglier (40 cm = 8 px)
for (const len of [10, 15, 20]) {
  let hits = 0;
  let sum = 0;
  const N = 4000;
  for (let k = 0; k < N; k++) {
    const x0 = (10 + rnd() * 90) * PX;
    const y0 = (10 + rnd() * 180) * PX;
    if (trunks.some((t) => x0 > t.l - half && x0 < t.r + half && y0 > t.t - half && y0 < t.b + half)) {
      k--;
      continue;
    }
    const a = rnd() * 2 * Math.PI;
    for (let s = 1; s <= len * PX; s++) {
      const x = x0 + Math.cos(a) * s;
      const y = y0 + Math.sin(a) * s;
      if (trunks.some((t) => x > t.l - half && x < t.r + half && y > t.t - half && y < t.b + half)) {
        hits++;
        sum += s / PX;
        break;
      }
    }
  }
  console.log(`Charge de ${len} m dans la forêt profonde (${trunks.length} troncs) : un tronc l'arrête ${Math.round((100 * hits) / N)} % du temps, à ${fmt(sum / Math.max(1, hits), 1)} m en moyenne`);
}
