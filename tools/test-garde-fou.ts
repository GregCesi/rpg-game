// Test du hook Stop .claude/hooks/chantier-stop.mjs : chaque état du chantier, dans un dossier temporaire.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const script = resolve('.claude/hooks/chantier-stop.mjs')
const dossier = mkdtempSync(join(tmpdir(), 'garde-fou-'))
mkdirSync(join(dossier, '.claude'))
const etat = join(dossier, '.claude', 'chantier.json')
const arrets = join(dossier, '.claude', 'chantier.arrets')
const notifs = join(dossier, 'notifications.txt')

let echecs = 0
function verifie(cas: string, ok: boolean, detail = ''): void {
  if (!ok) {
    echecs++
    console.error(`ÉCHEC ${cas}${detail ? ' : ' + detail : ''}`)
  }
}

function lance(actif: boolean): { bloque: boolean; raison: string; code: number | null } {
  const r = spawnSync('node', [script], {
    input: JSON.stringify({ stop_hook_active: actif, cwd: dossier }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dossier, CHANTIER_NOTIF_FICHIER: notifs },
    encoding: 'utf8',
  })
  const sortie = r.stdout.trim()
  if (!sortie) return { bloque: false, raison: '', code: r.status }
  const json = JSON.parse(sortie)
  return { bloque: json.decision === 'block', raison: json.reason ?? '', code: r.status }
}

const notifications = (): string => (existsSync(notifs) ? readFileSync(notifs, 'utf8') : '')
const reset = (): void => {
  for (const f of [etat, arrets, notifs]) rmSync(f, { force: true })
}

try {
  // sans fichier : l'arrêt passe, sans notification
  reset()
  let r = lance(false)
  verifie('sans fichier : passe', !r.bloque && r.code === 0)
  verifie('sans fichier : pas de notification', notifications() === '')

  // en cours : refusé, avec une raison qui nomme le fichier et les deux états de sortie
  reset()
  writeFileSync(etat, '{"etat": "en-cours"}')
  r = lance(false)
  verifie('en-cours : refusé', r.bloque && r.code === 0)
  verifie('en-cours : la raison nomme chantier.json, attente et fini', /chantier\.json/.test(r.raison) && /attente/.test(r.raison) && /fini/.test(r.raison))

  // attente : passe, avec la raison dans la notification
  reset()
  writeFileSync(etat, '{"etat": "attente", "raison": "cadrage fini"}')
  r = lance(false)
  verifie('attente : passe', !r.bloque)
  verifie('attente : notification', notifications().trim() === 'Claude Code attend : cadrage fini', notifications())

  // fini : passe, avec sa notification
  reset()
  writeFileSync(etat, '{"etat": "fini"}')
  r = lance(false)
  verifie('fini : passe', !r.bloque)
  verifie('fini : notification', notifications().trim() === 'Claude Code a fini le chantier', notifications())

  // illisible : passe
  reset()
  writeFileSync(etat, '{pas du json')
  r = lance(false)
  verifie('illisible : passe', !r.bloque && r.code === 0)

  // cinq refus d'affilée, puis passage avec sa notification, puis compteur remis à zéro
  reset()
  writeFileSync(etat, '{"etat": "en-cours"}')
  for (let i = 1; i <= 5; i++) {
    r = lance(i > 1)
    verifie(`refus ${i}`, r.bloque)
  }
  verifie('compteur à 5', readFileSync(arrets, 'utf8') === '5')
  r = lance(true)
  verifie('6e arrêt : passe', !r.bloque)
  verifie('6e arrêt : notification', /s'arrête après 5 relances sans avancer/.test(notifications()), notifications())
  verifie('6e arrêt : compteur remis à zéro', !existsSync(arrets))

  // un nouvel arrêt (stop_hook_active faux) repart de zéro
  reset()
  writeFileSync(etat, '{"etat": "en-cours"}')
  lance(false)
  lance(true)
  lance(true)
  lance(false)
  verifie('stop_hook_active faux : compteur à 1', readFileSync(arrets, 'utf8') === '1')

  // un arrêt qui passe remet le compteur à zéro
  writeFileSync(etat, '{"etat": "fini"}')
  lance(true)
  verifie('arrêt qui passe : compteur remis à zéro', !existsSync(arrets))
} finally {
  rmSync(dossier, { recursive: true, force: true })
}

if (echecs > 0) {
  console.error(`${echecs} échec(s) dans test-garde-fou`)
  process.exit(1)
}
console.log('test-garde-fou : tout passe')
