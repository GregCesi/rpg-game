// Essai (chantier « maison du coq », hors jeu) : le tableau du catalogue des pièces, pour CADRAGE-coq.md section 9.
// npx tsx tools/essai-coq-catalogue-table.ts écrit le tableau en Markdown sur la sortie standard, d'après la source unique des
// pièces (art/proposals/coq-catalogue-data.ts) et les mesures du gabarit faites par les deux planches du pixel-artist
// (.art-preview/coq-catalogue-pierre.json et coq-catalogue-bois.json, écrits par tools/essai-coq-catalogue-pierre.ts et
// tools/essai-coq-catalogue-bois.ts : à lancer d'abord).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARRY, GROUPS, PIECES, massOf, type Piece } from '../art/proposals/coq-catalogue-data';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Une vue mesurée ; `okRule` : jugée par la règle D (docs/STYLE.md section 8, la pièce couchée nord-sud), quand la planche l'applique. */
interface Measure { key: string; view: string; expected: [number, number]; drawn: [number, number]; ok: boolean; okRule?: boolean }
const measures: Measure[] = [];
for (const f of ['coq-catalogue-pierre.json', 'coq-catalogue-bois.json']) {
  const p = join(ROOT, '.art-preview', f);
  if (existsSync(p)) measures.push(...(JSON.parse(readFileSync(p, 'utf8')) as Measure[]));
  else console.error(`(manque ${f} : lancer sa planche d'abord)`);
}

const MATTER: Record<Piece['matter'], string> = { stone: 'calcaire', wood: 'bois (chêne)', iron: 'fer', fixed: '' };
const kg = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('fr-FR') : n >= 10 ? String(Math.round(n)) : n.toFixed(1).replace('.', ','));
const viewsOf = (p: Piece) => (p.views === 'four' ? 'R0 R1 R2 R3' : p.views === 'symmetric' ? 'R0 R1 (R2 = R0, R3 = R1)' : 'une (ronde)');

function gabarit(p: Piece): string {
  const ms = measures.filter((m) => m.key === p.key);
  if (!ms.length) return 'non mesuré';
  const bad = ms.filter((m) => !m.ok && !m.okRule);
  const ruled = ms.some((m) => !m.ok && m.okRule);
  if (!bad.length) return ruled ? 'OK (R1 par la règle D)' : 'OK';
  return 'HORS TOLÉRANCE (' + bad.map((m) => `${m.view} : ${m.drawn.join(' × ')} px pour ${m.expected.map((v) => Math.round(v)).join(' × ')}`).join(' ; ') + ')';
}

function origin(p: Piece): string {
  if (p.forge) return 'nouvelle : **la seule lauze du jeu** (remplace celle de la forge)';
  if (p.woodLook) return 'nouvel aspect du bois (`wood.json`)';
  if (p.existing) return `existe : \`${p.existing}\``;
  return 'nouvelle';
}

const out: string[] = [];
for (const g of GROUPS) {
  const ps = PIECES.filter((p) => p.group === g.key);
  if (!ps.length) continue;
  out.push(`#### ${g.title}`, '');
  out.push('| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const p of ps) {
    const m = massOf(p);
    const mass = p.matter === 'fixed' && !m ? '—' : `${kg(m)} kg${m > CARRY ? ' (à deux, ou plus)' : ''}`;
    const matter = p.matter === 'fixed' ? (p.group === 'meubles' ? 'laine, étoffe ou étain' : p.group === 'sols' ? 'terre' : 'verre et plomb') : MATTER[p.matter];
    const dims = p.dims.shape === 'flat' ? '—' : `${p.dims.w} × ${p.dims.d} × ${p.dims.h}`;
    out.push(`| **${p.name}** \`${p.key}\` | ${dims} | ${mass} | ${matter} | ${viewsOf(p)} | ${gabarit(p)} | ${origin(p)} | ${p.count} |`);
  }
  out.push('');
}
const done = measures.length;
const bad = measures.filter((m) => !m.ok && !m.okRule).length;
out.push(`*${PIECES.length} pièces ; ${done} vues mesurées, ${bad} hors tolérance (± 2 px, \`TOLERANCE\` de src/content/gabarit.ts).*`);
console.log(out.join('\n'));
