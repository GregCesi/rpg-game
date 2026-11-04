// Planche des plans de l'intérieur du tunnel (chantier « relief », CADRAGE.md section 13, hors jeu) :
//   npx tsx tools/essai-relief-plans-v1.ts  écrit  .art-preview/relief-plans-v1.png (premiers plans, non validés)
// Des schémas en aplats (coupes, écrans, la maison pour comparer), pas des dessins : art/proposals/relief-plans-v1.ts.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { PLAN_H, PLAN_W, drawReliefPlans } from '../art/proposals/relief-plans-v1';
import { Sheet } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sheet = new Sheet(PLAN_W, PLAN_H, [40, 44, 36]);
drawReliefPlans(sheet);
const out = join(ROOT, '.art-preview', 'relief-plans-v1.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-relief-plans-v1 -> ${out} (${sheet.w} x ${sheet.h})`);
