# Panneau « vers la ville » (`signpost`)

Le poteau indicateur planté au bord de la route officielle, à l'est du village, là où la route sort du monde (CONCEPTION, « Le
monde »). On ne va pas encore à la ville : le panneau le dit.

## Identité
- Clé : `signpost`.
- Nom affiché : panneau.
- Nature : objet du monde (`props.json`), fixé : ne se prend pas.
- Mains : aucune.
- Âge : bois travaillé (poteau équarri, planche) : `"aged": true` ; posé vieux au bord de la route (il est là depuis longtemps), le
  dessin de chaque âge tiré par le build.

## Masse
- Pas encore déplaçable (planté) : pas de masse.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Poteau équarri de 12 × 12 cm, 1,90 m hors sol ; une planche de 80 × 20 cm (3 cm d'épaisseur) clouée en haut, son bout taillé en
  flèche vers l'est. Boîte : 85 cm (largeur, poteau compris) × 12 cm (profondeur) × 190 cm.
- Une pierre de calage de 25 × 25 × 10 cm au pied du poteau, du côté de la flèche (ajoutée au dessin : vue de côté, un poteau et une
  planche en haut ne remplissent pas leur boîte, et le gabarit des vues de côté demande sa hauteur ; à valider par Grégoire).
- À l'écran, vue de face (planche est-ouest) : 17 × 39 px (85 / 5 ; 190 / 5 + 12 / 10).
- Vue de côté (planche vue par la tranche, nord-sud) : 6 × 45 px (largeur portée au plancher de lisibilité de 6 px ; hauteur
  190 / 5 + 85 / 10 = 46,5, à 2 px près). Le poteau est dessiné à 4 px (20 cm), la planche à 6 rangées, pour être lisibles.
- Collision : le pied du poteau seul (`bodies`, juste dans la vue `signpost`, celle qui est posée).

## Vues
- Symétrie : quatre (`four`) : la flèche a un sens.
  - `signpost` : vu du sud, la flèche vers l'est (à droite), la face peinte visible.
  - `signpost-r1` : un quart de tour : la flèche vers le sud (vers nous), la planche vue par la tranche, en raccourci.
  - `signpost-r2` : la flèche vers l'ouest (à gauche), le dos de la planche.
  - `signpost-r3` : la flèche vers le nord (fuyante), la planche par la tranche.
- Pas d'écriture lisible à cette taille : des traits sombres sur la planche suggèrent l'inscription ; le texte est dit par E.
- Fantôme : son image (mode construction).

## Variantes naturelles
Aucune : fait par le charpentier.

## Regroupement
Seul.

## Gestes
- E court : lire (« Vers la ville. La route n'est pas encore pour moi. », dit par Xéros), dialogue `signpost-town`.

## Origine
Planté par la ville au bord de la route officielle (zone `route-de-la-ville`).

## Devenir
Il reste ; plus tard, d'autres panneaux aux carrefours du monde.

## Transformations
Aucune.

## Métier
Charpentier (`carpenter`).

## Vérification
- Aperçu : `collection.png` (ses quatre vues), `monde.png` (sa place).
- En jeu : `npm run test:monde` (Xéros va jusqu'au panneau et le lit).
