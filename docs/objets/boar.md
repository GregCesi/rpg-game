# Sanglier (`boar`)

Le sanglier des forêts profondes (chantier « sangliers », 4 novembre 2026 ; CONCEPTION, « Les créatures ») : une bête dangereuse qui
dort le jour à sa bauge, erre la nuit, et charge Xéros en ligne droite. Ce n'est pas un objet qu'on prend : vivant, c'est une
**créature** (une entrée de `src/content/creatures.json`) ; tué, il devient un objet, le [sanglier mort](dead-boar.md).

## Identité
- Clé : `boar` (clé de la créature dans `creatures.json`, et clé de sa planche de dessins `boar`).
- Nom affiché : sanglier.
- Nature : créature (moteur commun : `src/world/creature.ts`, la charge `src/world/charge.ts`, la bauge `src/world/warren.ts`, le jeu
  `src/systems/creatures.ts`) ; elle encaisse les coups (`target` : 30 points de vie, matière `fur`, peau `hide` de 120 J).
- Mains : ne se prend pas vivant. Mort : le sanglier mort, à deux mains (trop lourd pour Xéros).
- Âge : non.

## Masse
- **80 kg** (un adulte au milieu de la fourchette : la laie 60 à 80 kg, le mâle 100 à 110). C'est la masse du sanglier mort qu'il devient.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 140 cm de long (tête et corps), 40 cm de large, 80 cm au garrot. Boîte 140 × 40 × 80.
- De profil (est-ouest) : **28 × 20 px** (L × (H + D/2)), au gabarit.
- De face et de dos (nord-sud) : le gabarit donne **8 × 30 px** (W × (H + L/2)) ; dessinés à **10 × 30** (la tolérance de 2 px prise
  pour la masse de la tête, validée par Grégoire avec la variante C).
- En charge : 28 px de long, 19 à 21 de haut selon la phase du galop.
- Collision : aucune pour Xéros (`body` : non) ; lui contourne ce qui a un corps quand il marche, et s'y heurte quand il charge.

## Vues
La planche `boar` (art/world/boar.ts, dessins art/world/boar-shapes.ts, la variante C validée le 4 novembre 2026) : chaque pose dans
trois directions dessinées (`down`, `up`, `right` ; `left` est le miroir de `right`), frames de 46 × 40, chaque image avec sa durée.
- **La fouille** (`graze`, 4 × 200 ms) : le groin au sol qui pousse, les mottes qui volent.
- **Debout** (`sit`, `alert`) : arrêté, la hure levée ; aux aguets, tourné vers Xéros.
- **La marche** (`hop`, 4 × 160 ms) : au pas, la tête qui hoche.
- **L'annonce** (`tell`, 4 × 150 ms : 0,6 s) : tête basse, soies hérissées, queue dressée, une patte qui gratte.
- **La charge** (`charge`, 4 × 80 ms) : le galop, deux suspensions.
- **Le choc** (`impact`, 60, 110, 150, 250 ms) : la tête cogne et rebondit, l'arrière décolle, il recule ; puis **sonné** (`stunned`,
  4 × 260 ms en boucle) : il titube, tête basse.
- **Couché à la bauge** (`rest`, 2 × 1 000 ms) : sur le ventre, pattes repliées, le dos qui gonfle.
- **La mort** (`die`, 150, 180, 200, 1 500 ms) : les antérieurs cèdent, il s'écroule, roule, reste sur le flanc pattes raides ; dessinée
  de profil (de face et de dos, la même bascule).
- Fantôme, case d'interface, porté : non (vivant, il ne se prend pas).

## Variantes naturelles
Une seule robe (brun-gris, la joue grise, les défenses blanches). Plus tard, en données : le solitaire, la laie et ses marcassins.

## Regroupement
Une **bauge** : un rectangle `Warren` de Tiled (sa créature, sa population) ; la bauge est au milieu du rectangle, chaque bête y a sa
place. Huit sangliers en quatre bauges, une par zone de forêt profonde (`foret-profonde-nord` 2, `foret-profonde` 1,
`foret-profonde-sud` 2, `foret-des-ronces` 3), jamais près de la ferme.

## Gestes
- Il ne se prend pas, ne se pose pas, ne se lance pas vivant.
- Clic de la main qui tient une arme, un outil, une ressource, ou d'une main vide : le frapper. Un objet lancé le touche s'il passe sur
  lui, en vol, sous sa hauteur.

## Comportement (`creatures.json`, CONCEPTION « Les créatures »)
- **Le jour** (7 h à 19 h) : couché à sa bauge, il dort ; il perçoit Xéros deux fois moins loin (`asleep` 0,5) ; un sur dix est debout
  et fouille à 10 m de la bauge. **La nuit** : tous debout, ils fouillent jusqu'à 60 m de la bauge (`range` de `schedule`).
- **Perception** (m, aux aguets / il réagit) : immobile 4 / 2, discret 7 / 4, à la marche 12 / 8, à la course 16 / 11 ; il se calme
  6 s après que Xéros a cessé d'approcher. Réglables dans ?dieu (« Créatures »).
- **La charge** : Xéros dans sa distance de réaction **et la ligne libre** (rien de dur entre eux ; un buisson ne compte pas) :
  l'annonce (0,6 s), la ligne visée une fois à sa fin, jamais corrigée ; il accélère à 8 m/s² jusqu'à 11 m/s, court jusqu'à l'endroit
  où était Xéros plus 4 m (au plus 25 m), freine à 9 m/s², souffle 1,5 s, puis recharge s'il voit encore Xéros. Il traverse les
  buissons en les secouant ; tout autre corps l'arrête ; le bord de la zone aussi.
- **Le choc contre Xéros** : choc mou, il l'emporte ; l'énergie perdue (½ μ v², 2 259 J à pleine vitesse) blesse Xéros pour 15 %
  (`tusk`) : 35 points sur 100, trois charges l'évanouissent ; Xéros glisse 2,5 m (frottement 0,7) et reste 1,5 s à terre.
- **Le choc contre un obstacle** : toute l'énergie reste dans la bête : sonnée 5 s à pleine charge (4 840 J), au prorata ; pas sonnée
  sous 1 500 J (6 m/s).
- **Blessé** : il charge aussitôt s'il a la ligne ; frappé pendant qu'il est sonné, il le reste jusqu'au bout, puis charge s'il est blessé.

## Travail
Aucun.

## Arme
Aucune. C'est une cible : `target`, **30 points de vie**, matière `fur` (les touffes de poil du lapin), **peau de 120 J** (`hide`) :
elle encaisse 120 J de chaque choc, sauf la part que coupe un tranchant (`edge` de l'outil : la hache 1). À la force de Xéros : la hache,
quatre coups d'en haut ; la branche, vingt-deux ; le poing et l'épée de bois, jamais (world/strike.ts `throughHide`, la même règle pour
toute cible). Frapper une bête qui charge compte comme une bête arrêtée (la vitesse ajoutée viendra avec l'épieu).

## Origine
Né à sa bauge : quand il en manque (tués), une naissance toutes les 72 h de jeu remet la population à niveau.

## Devenir
- Blessé : il garde sa vie dans la partie (GameState) et reste couché à la bauge jusqu'à sa guérison (2 jours).
- Tué : il bascule sur le flanc, puis devient un [sanglier mort](dead-boar.md) de sa masse, là où il meurt.

## Transformations
Aucune (le dépeçage viendra, sur le sanglier mort).

## Métier
Aucun (une bête sauvage).

## Vérification
- Aperçus : les planches validées de `npx tsx tools/essai-sangliers-c.ts` (`.art-preview/sangliers-c-*.png`).
- Tests : `tools/test-charge.ts` (test:fast : la charge, le choc, la bauge), `npm run test:sangliers` (en jeu : il voit Xéros, annonce,
  charge et le renverse ; il s'assomme sur un tronc ; Xéros le tue à la hache ; la marche discrète passe à côté).
- Outils de test (`?dieu`, « Créatures ») : « Faire sortir près de Xéros » (une bête se lève et vient), les distances, les cercles.
