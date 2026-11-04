// Planche des plans du chemin creux (chantier « relief », CADRAGE.md section 13.1 à 13.5, hors jeu) :
//   npx tsx tools/essai-relief-plans.ts  écrit  .art-preview/relief-plans.png
// Des schémas en gros aplats (deux coupes, la vue de dessus, trois écrans du jeu) : art/proposals/relief-plans.ts.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { PLAN_BG, PLAN_H, PLAN_W, drawReliefPlans } from '../art/proposals/relief-plans';
import { Sheet } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sheet = new Sheet(PLAN_W, PLAN_H, PLAN_BG);
const used = Math.min(PLAN_H, drawReliefPlans(sheet));
// la planche coupée à ce qui a été dessiné
const png = new PNG({ width: PLAN_W, height: used });
sheet.png.data.copy(png.data, 0, 0, PLAN_W * used * 4);
const out = join(ROOT, '.art-preview', 'relief-plans.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(png));
console.log(`essai-relief-plans -> ${out} (${PLAN_W} x ${used})`);
