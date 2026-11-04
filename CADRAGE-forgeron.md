# Chantier « forgeron » : cadrage

Le forgeron du village, en essai. Rien ne change dans le jeu : des planches dans `.art-preview/`, des dessins dans
`art/proposals/`, des outils `tools/essai-forgeron*.ts`.

## 1. Ce que j'ai lu

- `CLAUDE.md`, `docs/STYLE.md` (section 6, les personnages : frame de 32 × 48, pieds à y=45, le portrait fait référence pour les
  couleurs ; section 8, le gabarit : 5 cm par pixel, les personnages à 12 px de large).
- Xéros (`art/characters/xeros.ts`, 12 × 32 px pour 1,60 m) et la mère (`art/characters/mother.ts`), leurs portraits 64 px
  (`art/portraits/`). Leur tête fait à peu près un tiers de leur hauteur : le style du jeu a déjà une grosse tête.
- Les deux essais ratés (`art/proposals/forgeron.ts`, planche `tools/essai-forge-forgeron.ts`, régénérée dans
  `.art-preview/forge-forgeron.png`) :
  - essai 1 : visage rond et doux, cheveux raides en rideau autour d'un visage étroit, aucune carrure : féminin ;
  - essai 2 : 18 × 38 px, tête de 12 px de large sur des épaules de 18 px (rapport 1,5) ; à x1, il se lit comme un Xéros allongé, pas
    comme un colosse. De face, un rectangle d'un seul tenant : les bras ne se détachent pas du torse. Le portrait a des rides et des
    joues creusées : vieux et dur.
- La forge du jeu (plan `forge`, posée à l'entrée ouest du village) et sa visite (`tools/test-forge-visite.ts`), pour la planche du
  forgeron devant l'enclume. Le zoom de départ du jeu est x3 (`ZOOM_STEPS.start` de `src/config.ts`).

## 2. Comment rendre la masse à cette taille

- **La silhouette en V, pas le rectangle.** Ce qui ratait l'essai 2, c'est que la largeur était la même de haut en bas. Ici, les
  épaules débordent de loin (deltoïdes ronds, 24 à 26 px de large d'un bout à l'autre), la taille rentre (16 à 18 px aux hanches), les
  jambes sont solides mais moins larges que le haut. À x1, c'est cette pente qui dit « colosse ».
- **Les bras décollés.** Un pixel ou deux d'air (ou d'ombre du flanc) entre le bras et le torse, du deltoïde au coude, les mains
  posées à l'écart des hanches. Des avant-bras plus larges que le haut du bras, des poings de 3 à 4 px.
- **Le cou de taureau.** Le cou aussi large que la mâchoire, les trapèzes qui descendent en pente du cou aux épaules : la tête semble
  posée sur le torse.
- **La poitrine en tonneau sous le tablier.** La bavette du tablier est plus étroite que la poitrine : les pectoraux débordent de part
  et d'autre, le haut de la poitrine nu au-dessus. Les flancs nus entre le tablier et les bras.
- **La force, pas la graisse.** Pas de ventre, pas de bajoues : les volumes se dessinent par des ombres franches (le creux sous le
  deltoïde, le pli du coude, le bord du pectoral), une lumière en haut à gauche.
- **La grosse tête, lisible.** 14 px de large environ (Xéros : 12), soit un peu plus que les vraies proportions d'un homme de 1,95 m.
  Le visage carré : mâchoire large dont l'angle se voit, menton fort, nez fort, des yeux calmes (un pixel de paupière, pas de
  sourcils froncés), la moustache blonde. Aucune ride, aucune ombre de joue creuse.
- **Les cheveux.** Blond doré chaud, jusqu'aux épaules ou un peu plus, en mèches séparées par des ombres (pas un rideau d'une seule
  couleur), deux ou trois mèches qui tombent sur le front, les pointes qui ondulent sur les épaules ; un reflet clair par mèche.
- **Les couleurs nouvelles.** Le cuir épais du tablier (une rampe de quatre bruns), le blond doré (une rampe de quatre, plus chaude que
  le chaume de l'essai 2), la peau hâlée. Elles sont déclarées dans le dessin d'essai (`art/proposals/forgeron-colosse.ts`) ; elles
  entreront dans `art/palette.ts`, nommées, quand le personnage sera intégré (aucun fichier du jeu ne change dans ce chantier).

## 3. Les écarts au gabarit (voulus, à déclarer à l'intégration)

| Écart | Gabarit | Forgeron | Raison |
|---|---|---|---|
| Hauteur | 1,95 m → 39 px | 39 px | conforme |
| Largeur | personnages à 12 px (60 cm) | 24 à 28 px | sa carrure est le personnage ; les bras écartés comptent |
| Tête | proportions des personnages du jeu | environ 14 × 13 px | lecture du visage et du caractère (comme le têtard : tête stylisée) |
| Frame | 32 × 48 | 32 × 48 si la silhouette tient dans 30 px ; sinon 40 × 48 | voir question 4 |

## 4. Les variantes proposées

Trois corps, trois têtes, trois coiffures, de face (planche `forgeron-variantes.png`) :

- **A, « le chêne »** : le V le plus marqué (épaules les plus larges, taille la plus serrée), bras longs et décollés ; tête carrée ;
  cheveux aux épaules, raie sur le côté, deux mèches sur le front. *Recommandée* : c'est la plus lisible à x1, la force sans la
  lourdeur.
- **B, « le bœuf »** : plus trapu, le tronc le plus épais (le tonneau), le cou le plus large ; tête la plus large ; cheveux plus
  longs, passés les épaules, une mèche qui barre le front.
- **C, « le géant tranquille »** : poitrine haute, bras les plus énormes, la tête la plus grosse ; cheveux rejetés en arrière qui
  ondulent, deux mèches qui retombent devant les oreilles.

## 5. Les questions (chacune avec ma recommandation)

1. **Quelle variante ?** Je recommande **A**. On peut aussi prendre le corps de l'une et la tête ou les cheveux d'une autre.
2. **Cheveux lâchés ou attachés ?** Je recommande **lâchés** comme allure de tous les jours (c'est ce qui le distingue de loin), et les
   cheveux attachés réservés aux gestes de la forge, plus tard.
3. **Rasé avec la moustache, ou la barbe de quelques jours ?** Je recommande **rasé avec la moustache** (ta description) ; la barbe de
   quelques jours est sur la planche des portraits pour comparer.
4. **La frame :** je recommande de **garder 32 × 48** si la variante choisie tient dans 30 px de large ; sinon une frame de 40 × 48 pour
   lui seul (à vérifier à l'intégration : les points d'accroche et les gestes sont calés sur 32 × 48).
5. **Les brassards de cuir :** je recommande **oui, aux deux avant-bras**, sobres (deux pixels de cuir) : ils disent le métier et
   soulignent les avant-bras.
6. **La collision aux pieds** (pour plus tard) : je recommande **14 × 8 px (70 × 40 cm)** au lieu de 10 × 8, pour qu'on ne le
   traverse pas par les épaules.
7. **Son nom :** en as-tu un ? Sinon je proposerai trois noms à la prochaine étape, avec son dialogue d'accueil.

## 6. Les planches

- `.art-preview/forgeron-variantes.png` : A, B et C de face, x4 puis x1, avec Xéros et la mère, et l'essai 2 en x1 pour comparer
  (`npx tsx tools/essai-forgeron.ts`).
- `.art-preview/forgeron-vues.png` : la variante A de face, de profil et de dos, x4 et x2, cheveux lâchés et attachés (même outil).
- `.art-preview/forgeron-portrait.png` : les portraits 64 px des trois variantes, rasé et barbe de quelques jours, avec ceux de
  Xéros et de la mère (`npx tsx tools/essai-forgeron-portrait.ts`).
- `.art-preview/forgeron-forge.png` : la variante A dans la forge du jeu, devant l'enclume, x2 et au zoom de départ (x3)
  (`npx tsx tools/essai-forgeron-forge.ts`).

Pas d'animation : on choisit d'abord le personnage.
