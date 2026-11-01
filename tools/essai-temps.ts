// Essai du temps et de l'endurance (chantier « temps », étape de conception ; docs/CONCEPTION.md, « Le temps ») : npx tsx
// tools/essai-temps.ts écrit .art-preview/temps-endurance.png et imprime les tableaux de la conception. Rien n'est branché au jeu :
// le modèle proposé est ici, en petit (PROPOSE, à mettre dans stamina.json à l'implémentation).
// - La journée type, heure par heure (6 h à 22 h) : le plafond du jour qui descend avec le travail, le souffle au plus bas de chaque
//   heure (il se vide pendant un effort et revient en quelques secondes : il vit sur la simulation), le maximum.
// - Trois jours d'entraînement : le maximum qui monte. Une nuit blanche, une nuit courte : le malus du lendemain.
// L'image : en haut, la courbe de la journée (maximum, plafond, souffle au plus bas de chaque heure) ; en dessous, la barre à trois
// teintes (art/proposals/barre-endurance.ts, la proposition du pixel-artist) à plusieurs moments.

import { existsSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

/** Le modèle proposé (stamina.json, à remplacer à l'implémentation). */
export const PROPOSE = {
  // le maximum : 100 au départ, au plus `cap` ; à chaque nuit, si la journée a entamé le plafond d'au moins `trainFrom` du maximum,
  // il monte de `gain` × (1 − max / cap) : vite au début, de moins en moins
  max: { start: 100, cap: 200, gain: 2, trainFrom: 0.4 },
  // le souffle : il revient vers le plafond de `regenPerSec` points par seconde jouée, `regenDelayMs` après le dernier effort
  breath: { regenPerSec: 12, regenDelayMs: 800 },
  // chaque effort coûte au souffle `breathPerCost` fois son prix, et au plafond son prix (les prix de stamina.json d'aujourd'hui : le
  // budget d'une journée ne change pas) ; les efforts continus ont leur prix en souffle par seconde (`breathPerSec`)
  breathPerCost: 3,
  breathPerSec: { run: 5, carryPerKg: 0.1, pushPerKg: 0.05 },
  // fatigué sous `tired` du maximum (le plafond) : plus de course, marche à `tiredWalk`
  tired: 0.15,
  tiredWalk: 0.85,
  // la nuit : lever à `wakeHour` après `sleepHours` de sommeil ; un coucher tardif fait se lever plus tard (au plus tôt coucher +
  // sleepHours) ; au réveil, plafond = maximum − `exhaustedPenalty` × ce qui manquait sous `exhaustedBelow` (le seuil « fatigué ») du maximum la veille −
  // `missingHourPenalty` par heure de sommeil manquante ; veiller la nuit (22 h – 6 h) use le plafond de `nightAwakePerHour`
  sleep: { wakeHour: 6, sleepHours: 8, exhaustedBelow: 0.15, exhaustedPenalty: 0.4, missingHourPenalty: 5, nightAwakePerHour: 0.5 },
};

/** La journée type : ce que fait Xéros, ce que coûtent ces heures au plafond (les prix d'aujourd'hui), son souffle au plus bas (part du plafond). */
export const DAY: { from: number; to: number; what: string; ceiling: number; breathLow: number }[] = [
  { from: 6, to: 7, what: 'lever, puiser l’eau, bois du feu', ceiling: 3, breathLow: 0.85 },
  { from: 7, to: 8, what: 'abattre un arbre normal, l’ébrancher', ceiling: 15, breathLow: 0.25 },
  { from: 8, to: 10, what: 'couper en billes, porter', ceiling: 10, breathLow: 0.55 },
  { from: 10, to: 12, what: 'équarrir une poutre de 3 m', ceiling: 12, breathLow: 0.4 },
  { from: 12, to: 13, what: 'repas', ceiling: 0, breathLow: 1 },
  { from: 13, to: 15, what: 'fendre deux billes', ceiling: 8, breathLow: 0.35 },
  { from: 15, to: 16, what: 'mettre en tas', ceiling: 6, breathLow: 0.6 },
  { from: 16, to: 17, what: 'course (20 min), mannequin (30 coups d’épée)', ceiling: 29, breathLow: 0.1 },
  { from: 17, to: 21, what: 'soirée, petits travaux', ceiling: 2, breathLow: 0.9 },
  { from: 21, to: 22, what: 'coucher à 22 h', ceiling: 0, breathLow: 1 },
];

const P = PROPOSE;
/** Le plafond au réveil après une nuit : la fatigue de la veille, le sommeil manquant. */
export function morning(max: number, ceilingAtBed: number, slept: number): number {
  const exhausted = Math.max(0, P.sleep.exhaustedBelow * max - ceilingAtBed) * P.sleep.exhaustedPenalty;
  const missing = Math.max(0, P.sleep.sleepHours - slept) * P.sleep.missingHourPenalty;
  return Math.max(0, max - exhausted - missing);
}
/** Le maximum après une nuit : l'entraînement de la journée. */
export function trained(max: number, ceilingAtBed: number, ceilingAtWake: number): number {
  const spent = (ceilingAtWake - ceilingAtBed) / max;
  return spent >= P.max.trainFrom ? max + P.max.gain * (1 - max / P.max.cap) : max;
}

/** Une journée type depuis le plafond du réveil : par heure, le plafond et le souffle au plus bas. */
function simulate(wake: number): { hour: number; ceiling: number; breath: number; what: string }[] {
  const out: { hour: number; ceiling: number; breath: number; what: string }[] = [];
  let c = wake;
  for (const d of DAY) {
    for (let h = d.from; h < d.to; h++) {
      c = Math.max(0, c - d.ceiling / (d.to - d.from));
      out.push({ hour: h + 1, ceiling: c, breath: c * d.breathLow, what: d.what });
    }
  }
  return out;
}

// --- les tableaux de la conception ---
const lines: string[] = [];
const r1 = (x: number) => (Math.round(x * 10) / 10).toString().replace('.', ',');
let max = P.max.start;
const day1 = simulate(max);
lines.push('Journée type (maximum 100, réveil à 6 h, plafond plein) :', '| Heure | Ce que fait Xéros | Plafond | Souffle au plus bas |', '| --- | --- | --- | --- |', '| 6 h | réveil | 100 | 100 |');
for (const h of day1) lines.push(`| ${h.hour} h | ${h.what} | ${r1(h.ceiling)} | ${r1(h.breath)} |`);
const bed1 = day1[day1.length - 1].ceiling;
lines.push('', 'Trois jours d’entraînement (la même journée, coucher 22 h, lever 6 h) :', '| Jour | Maximum au réveil | Plafond au réveil | Plafond au coucher | Maximum le lendemain |', '| --- | --- | --- | --- | --- |');
let wake = max;
for (let d = 1; d <= 3; d++) {
  const sim = simulate(wake);
  const bed = sim[sim.length - 1].ceiling;
  const next = trained(max, bed, wake);
  lines.push(`| ${d} | ${r1(max)} | ${r1(wake)} | ${r1(bed)} | ${r1(next)} |`);
  wake = morning(next, bed, P.sleep.sleepHours);
  max = next;
}
// la nuit blanche : la journée type, puis veillée jusqu'à 6 h, sommeil de 6 h à 14 h ; la nuit courte : 4 h de sommeil
const awake = bed1 - P.sleep.nightAwakePerHour * 8;
const afterWhite = morning(P.max.start, awake, P.sleep.sleepHours);
const shortNight = morning(P.max.start, bed1, 4);
// la vraie nuit blanche : aucun sommeil ; Xéros continue le lendemain avec le plafond de la veille, usé par la veillée
const noSleep = bed1 - P.sleep.nightAwakePerHour * 8;
lines.push(
  '',
  `Nuit blanche : couché à 6 h au lieu de 22 h, le plafond de ${r1(bed1)} descend à ${r1(awake)} en veillant ; levé à 14 h (8 h de sommeil), plafond ${r1(afterWhite)} au lieu de ${r1(morning(P.max.start, bed1, 8))} ; la demi-journée est perdue.`,
  `Nuit courte (coucher 2 h, lever 6 h : 4 h de sommeil) : plafond ${r1(shortNight)} au réveil.`,
  `Vraie nuit blanche (aucun sommeil) : à 6 h, plafond ${r1(noSleep)} (et le souffle au plus ce plafond) ; fatigué (sous ${r1(P.tired * 100)}) : pas de course, marche à ${P.tiredWalk * 100} % ; ${r1(noSleep)} points de travail avant l'épuisement (à peu près une heure d'abattage) ; le maximum ne monte pas (pas de nuit).`,
);
console.log(lines.join('\n'));

// --- l'image ---
const W = 640;
const H = 500;
const png = new PNG({ width: W, height: H });
const put = (x: number, y: number, c: [number, number, number]) => {
  const X = Math.round(x);
  const Y = Math.round(y);
  if (X < 0 || Y < 0 || X >= W || Y >= H) return;
  const k = (Y * W + X) * 4;
  png.data[k] = c[0];
  png.data[k + 1] = c[1];
  png.data[k + 2] = c[2];
  png.data[k + 3] = 255;
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, [36, 32, 26]);
// la courbe : 6 h à 22 h en abscisse (un trait par heure, plus clair toutes les 6 h), 0 à 110 points en ordonnée (un trait tous les 25)
const gx = (h: number) => 40 + ((h - 6) / 16) * 560;
const gy = (v: number) => 210 - (v / 110) * 180;
for (let h = 6; h <= 22; h++) for (let y = gy(110); y <= gy(0); y++) put(gx(h), y, h % 6 === 0 ? [80, 72, 60] : [52, 46, 38]);
for (let v = 0; v <= 100; v += 25) for (let x = gx(6); x <= gx(22); x++) put(x, gy(v), [60, 54, 44]);
const curve = (pts: [number, number][], c: [number, number, number]) => {
  for (let i = 1; i < pts.length; i++) {
    const [h0, v0] = pts[i - 1];
    const [h1, v1] = pts[i];
    for (let k = 0; k <= 60; k++) {
      const t = k / 60;
      put(gx(h0 + (h1 - h0) * t), gy(v0 + (v1 - v0) * t), c);
      put(gx(h0 + (h1 - h0) * t), gy(v0 + (v1 - v0) * t) + 1, c);
    }
  }
};
// le maximum (gris clair), le plafond (ocre), le souffle au plus bas (vert)
curve([[6, 100], [22, 100]], [150, 140, 120]);
curve([[6, 100], ...day1.map((h) => [h.hour, h.ceiling] as [number, number])], [200, 120, 50]);
curve([[6, 100], ...day1.map((h) => [h.hour - 0.5, h.breath] as [number, number]), [22, bed1]], [120, 190, 90]);
// la barre à trois teintes, à quelques moments : 6 h, 7 h 30 (abattre), 16 h 30 (course et mannequin), 22 h, le 3e jour au réveil
const moments: [number, number, number][] = [
  [100, 100, 100],
  [day1[1].breath, day1[1].ceiling, 100],
  [day1[10].breath, day1[10].ceiling, 100],
  [bed1, bed1, 100],
  [max, max, max],
];
const proposal = 'art/proposals/barre-endurance.ts';
if (existsSync(proposal)) {
  const { staminaBar } = await import(`../${proposal}`);
  const S = 4;
  moments.forEach(([s, c, m], i) => {
    const { grid, palette } = staminaBar(s, c, m);
    grid.forEach((row: string, y: number) =>
      [...row].forEach((ch, x) => {
        const hex = palette[ch];
        if (!hex || ch === '.') return;
        const n = parseInt(hex.slice(1, 7), 16);
        for (let v = 0; v < S; v++) for (let u = 0; u < S; u++) put(40 + x * S + u, 240 + i * 50 + y * S + v, [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
      }),
    );
  });
}
writeFileSync('.art-preview/temps-endurance.png', PNG.sync.write(png));
console.log('\n.art-preview/temps-endurance.png');
