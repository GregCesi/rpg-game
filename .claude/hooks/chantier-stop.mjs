#!/usr/bin/env node
// Hook Stop de Claude Code : refuse l'arrêt tant que le chantier est « en-cours »
// (CLAUDE.md, « Façon de travailler », règle 4). Sans dépendance.
//
// Entrée (stdin) : JSON du hook Stop, dont `stop_hook_active` (vrai quand la session
// continue déjà à cause d'un refus de ce hook) et `cwd`.
// Sortie : rien (l'arrêt passe) ou {"decision":"block","reason":"..."} (l'arrêt est refusé).
// État du chantier : .claude/chantier.json, écrit par la session elle-même :
//   {"etat":"en-cours"} | {"etat":"attente","raison":"..."} | {"etat":"fini"}
// Compteur des refus d'affilée : .claude/chantier.arrets (au-delà de MAX, l'arrêt passe).

import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MAX = 5

// Lecture de l'entrée du hook (illisible : on la traite comme vide).
let entree = {}
try {
  entree = JSON.parse(readFileSync(0, 'utf8') || '{}')
} catch {
  entree = {}
}

const dossier = process.env.CLAUDE_PROJECT_DIR || entree.cwd || process.cwd()
const fichierEtat = join(dossier, '.claude', 'chantier.json')
const fichierArrets = join(dossier, '.claude', 'chantier.arrets')

// Notification macOS ; CHANTIER_NOTIF_FICHIER (tests) la écrit dans un fichier à la place.
function notifier(message) {
  const fichier = process.env.CHANTIER_NOTIF_FICHIER
  if (fichier) {
    appendFileSync(fichier, message + '\n')
    return
  }
  try {
    const texte = message.replace(/[\\"]/g, ' ')
    execFileSync('osascript', ['-e', `display notification "${texte}" with title "Xéros"`], { stdio: 'ignore' })
  } catch {
    // pas de notification possible (autre système) : l'arrêt passe quand même
  }
}

function lireArrets() {
  try {
    const n = parseInt(readFileSync(fichierArrets, 'utf8'), 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

function ecrireArrets(n) {
  try {
    if (n <= 0) {
      if (existsSync(fichierArrets)) unlinkSync(fichierArrets)
    } else {
      writeFileSync(fichierArrets, String(n))
    }
  } catch {
    // le compteur est une sécurité : s'il ne s'écrit pas, on ne bloque pas le hook
  }
}

// Un arrêt qui passe remet le compteur à zéro.
function laisserPasser(message) {
  ecrireArrets(0)
  if (message) notifier(message)
  process.exit(0)
}

// Un nouvel arrêt (la session ne continuait pas à cause de nous) : on repart de zéro.
if (!entree.stop_hook_active) ecrireArrets(0)

// Sans fichier, ou fichier illisible : l'arrêt passe.
let chantier
try {
  chantier = JSON.parse(readFileSync(fichierEtat, 'utf8'))
} catch {
  laisserPasser()
}

const etat = chantier && typeof chantier === 'object' ? chantier.etat : undefined

if (etat === 'attente') {
  laisserPasser(`Claude Code attend : ${chantier.raison ?? 'sans raison donnée'}`)
}
if (etat === 'fini') {
  laisserPasser('Claude Code a fini le chantier')
}
if (etat !== 'en-cours') {
  laisserPasser() // état inconnu : on ne bloque pas
}

// « en-cours » : on refuse, sauf après MAX refus d'affilée.
const deja = lireArrets()
if (deja >= MAX) {
  laisserPasser(`Claude Code s'arrête après ${MAX} relances sans avancer : regarde son terminal`)
}
ecrireArrets(deja + 1)

const raison =
  "Le chantier n'est pas fini (.claude/chantier.json : « en-cours »). Reprends tout de suite par une action " +
  "(un outil, une modification), sans annoncer de plan ni écrire « je continue ». Tu ne t'arrêtes que pour un arrêt " +
  "prévu par la « Façon de travailler » de CLAUDE.md (cadrage fini, accord de dessin attendu, chantier terminé) : " +
  'écris alors {"etat": "attente", "raison": "..."} (avec sa raison) ou {"etat": "fini"} dans .claude/chantier.json, ' +
  "puis arrête-toi."
process.stdout.write(JSON.stringify({ decision: 'block', reason: raison }))
process.exit(0)
