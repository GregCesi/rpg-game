# Poteau de l'abri (la pièce de bois debout)

Une fiche pour les poteaux de l'abri à bois : la même pièce, à deux hauteurs (le toit penche vers le sud, à 20°). Depuis le 30 octobre 2026 (« abri en vraies pièces »), **un poteau n'est plus un objet à part** : c'est la poutre posée, la pièce de bois debout (`wood-piece`, `axis: 'up'`, fiche `wood-piece.md`, section *Debout*). Les anciens `shed-post-high` et `shed-post-low` sont retirés (leurs numéros restent réservés dans le registre des tuiles).

## Identité
- Clé : `wood-piece` (réglages `axis: 'up'`, `length` 300 au nord, 180 au sud, équarrie), les deux du nord côté haut, les deux du sud côté bas.
- Nom affiché : poteau.
- Nature : la pièce de bois dressée, sans `take` : pièces de bâtiment, places de l'étape « les poteaux » du plan `woodshed` (`plans.json`, étape ouverte : les fantômes paraissent quand les quatre dés sont posés, chaque place demande une poutre équarrie de la longueur du poteau).
- Mains : aucune une fois dressé ; la poutre qui le devient se porte à deux mains (1,80 m) ou ne se porte pas (3 m).

## Dimensions (gabarit)
- Bois équarri à la hache, section 20 × 20 cm. Hauteur hors dé : **3,00 m** au nord, **1,80 m** au sud (1,70 m jusqu'au 30 octobre 2026 : la grille de 20 cm du bois, voir CONCEPTION *Le bois* ; pente de 18,7°) ; il repose sur
  son dé (15 cm), donc sa tête est à 3,15 m et 1,85 m du sol. Contour compris.
- La chute de 1,30 m sur 3,55 m d'entraxe nord-sud (71 px) donne la pente du toit : atan(130 / 355) = 20,1°. D'est en
  ouest, 3,05 m d'axe en axe (61 px) ; 3,25 m hors tout (65 px, de la face ouest du poteau ouest à la face est du poteau
  est).
- Boîte (`box`), debout (`woodDims` : section 20 × 20, hauteur = longueur).
- À l'écran : W = 8 px (l'épaisseur de la poutre couchée, règle D étendue) ; H + tête = 60 + 4 = **8 × 64** (haut), 36 + 4 = **8 × 40** (bas).
- Sous lui, dans son image, 3 rangées vides : la hauteur du dé. Le bas de l'image est le bord sud du poteau au sol
  (c'est sa profondeur d'affichage) ; son pied se dessine sur le dessus du dé.
- Dans `plans.json` (en cm depuis le piquet nord-ouest, coin bas gauche de l'image de 8 px de large) : (−20, 10) et (285, 10) au nord,
  (−20, 365) et (285, 365) au sud, chacun exactement sur son dé de 40 cm (même largeur, pied sur la face du dessus). `validate.ts` le vérifie.

## Masse
- Pas déplaçable une fois dressé : pas de masse saisie. La poutre dont il vient pèse, bois vert de 900 kg/m³ : 20 × 20 × 300 cm,
  108 kg (côté haut : trop lourde pour Xéros, qui porte 70 kg, la mère aide) ; 20 × 20 × 180 cm, 65 kg (côté bas : portée).

## Vues
- Debout : l'image assemblée de la pièce (`woodTexture`, planche `wood-normal-up`, aspect `beam`), la même poutre que la couchée :
  mêmes faces claires dressées, la tête en bois de bout avec ses cernes. Pas d'ombre portée : le dé la porte. Le fantôme de la place
  est cette même image en transparence.
- En main, case d'interface, fantôme, porté : aucun (pas encore).

## Regroupement
Seul ; quatre par abri, aux quatre coins : nord-ouest, nord-est, sud-ouest, sud-est.

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Places du plan `woodshed`. Une poutre équarrie à la doloire (arbre normal abattu, ébranché, coupé à 1,80 m ou 3 m, 12 coups) :
le poteau bas est porté et dressé avec E sur son dé ; le poteau haut est équarri au pied de son dé, puis dressé avec l'aide de la
mère (E maintenu, fondu). Le chantier garde la pièce de bois d'origine (`pieces`).

## Devenir
Porte les sablières. **C'est la seule pièce de l'abri qui bloque le passage** : une collision de 4 × 4 px (20 × 20 cm)
à son pied (`body`).

## Vérification
- Aperçu : `.art-preview/bois.png` (la poutre couchée à côté de la même debout), `.art-preview/woodshed-2.png` (les quatre poteaux sur
  leurs dés, refaits avec les vraies pièces), avec Xéros à côté : le poteau haut le dépasse d'environ 30 px, le bas d'environ 6 (sa tête à 1,85 m).
- `npm run test:poteaux` (captures : `POTEAUX_SHOTS=1`, `.art-preview/poteaux-*.png`).
- En jeu : se cogner à chaque poteau ; passer entre deux poteaux ; passer derrière un poteau (il cache Xéros) et devant
  (Xéros le cache).
