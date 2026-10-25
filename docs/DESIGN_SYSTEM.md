# DESIGN_SYSTEM — Entre Nous

## 1. Direction artistique
**« Un soir d'hiver à deux ».** Un salon le soir : plaid, bougie, lumière chaude et basse,
papier épais, encre douce. Chaleureux, intime, rassurant, un peu artisanal. Jamais
clinique, jamais « SaaS » : on doit se sentir à la maison, pas dans un outil.

Mots-clés : cocon, lumière, complicité, douceur, précision.

Principes :
- **Lumière et matière** : halo chaud en haut de page (lampe), grain de papier très discret
  (`body::before`, bruit SVG, opacité 4,5 % clair / 6 % sombre, `soft-light`), ombres
  colorées prune (jamais gris pur), rayons généreux, cartes « coussin ».
- **Une seule action évidente** par écran (bouton corail en dégradé), le reste en
  surfaces douces.
- **Discrétion visible** : verrous, mentions rassurantes, aucune donnée intime en évidence.

À éviter : cœurs en motif, photos stock de couples, dégradés saturés, écrans denses,
iconographie enfantine, stéréotypes de genre, tableaux de bord « corporate ».

## 2. Couleurs

### Palette de marque
| Token | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `--ivory` | `#F9F3EA` | — | fond principal clair |
| `--blush` (rose poudré) | `#EFCBC3` | `#3B2A32` (surface) | surfaces douces, piliers « S'aimer » |
| `--coral` (terracotta) | `#D8664D` | `#F08F78` | action principale, accent émotionnel |
| `--plum` (prune) | `#4B2A46` | `#DDC3DD` | titres, texte fort, cartes immersives |
| `--plum-deep` / `--night` | `#2F1D33` | `#16101A` | surfaces « nuit » : jeu en cours, « On fait quoi ? », Double Secret |
| `--champagne` | `#ECD9B4` | `#8F7449` | surlignages, Premium |
| `--honey` (miel) | `#D9A441` | `#E3B35C` | chaleur, carte postale, piliers « S'amuser », bandeau démo |
| `--sage` (sauge) | `#6E9B7F` | `#7FB391` | états positifs, piliers « Construire » |
| `--charcoal` | `#2D2530` | `#1C1519` (fond) | texte, fond veilleuse |

### Tokens sémantiques
```
--bg / --bg-elevated / --bg-muted        page, cartes, zones secondaires
--bg-blush / --bg-honey / --bg-sage      surfaces teintées
--night / --night-elevated / --night-fg  surfaces immersives
--fg / --fg-muted / --fg-subtle          texte
--border / --border-strong               séparateurs
--primary / --primary-fg                 corail (dégradé primary → primary-hover sur les boutons)
--secondary / --secondary-fg             prune
--accent / --accent-fg                   champagne (Premium)
--success --warning --danger --info --ring
--glow / --halo / --halo-2               halos (lampe) et lueurs
--shadow-soft / --shadow-card / --shadow-lift / --shadow-glow
```
Mode sombre « veilleuse » : fond brun-prune `#1C1519` (jamais noir), cartes `#261D23`,
texte ivoire `#F5ECE2`, corail adouci, prune comme accent clair. Activation via
`data-theme="dark"` (préférence système par défaut).

Contraste : tous les couples texte/fond ≥ 4,5:1 (AA). Le corail sur ivoire est réservé
aux éléments ≥ 18 px, aux surtitres en capitales espacées et aux fonds pleins avec texte blanc.

## 3. Typographie
- Titres : **Fraunces** (variable). Axes exploités : `opsz` 144 et `SOFT` 100 + `WONK` 1
  sur les `h1` et la classe `.font-display-soft` (côté manuscrit) ; `.font-display-italic`
  pour les phrases douces (question du jour, révélations, citation). Poids 500.
- Texte : **Inter** (variable) — 400/500/600. Surtitres : 11 px, capitales, interlettrage 0,18 em, corail.
- Échelle (web) : 12 / 14 / 16 / 18 / 22 / 28 / 36 / 44 / 56 / 70 (héros).
- Interligne : 1,5 texte, 1,12 titres. `text-wrap: balance` sur les titres, `pretty` sur les paragraphes.

## 4. Espacement, rayons, ombres
- Grille 4 pt : 4, 8, 12, 16, 24, 32, 48, 64.
- Rayons : `sm 12px`, `md 18px`, `lg 28px`, `pill 999px`. Cartes `lg`.
- Ombres colorées prune : `card` (repos), `soft` (surfaces nuit, boutons), `lift` (survol,
  dialogues), `glow` (halo corail). Bordures 1 px `--border` sur les cartes claires.
- Composants de composition (`packages/ui`) : `Surface` (section enveloppante avec halo,
  tons warm / night / honey / blush), `Glow`, `SectionHeader` (surtitre + titre + note),
  `Doodle` (pictos monochromes tracés à main levée : tasse, plaid, bougie, guirlande,
  carnet, lune, clés, cœur noué, valise, étincelle, verrou), `Card` tons default / warm /
  blush / champagne / honey / sage / plum / night avec `interactive` (élévation au survol),
  `Badge` tons honey / sage / night, `EmptyState` avec doodle.

### Identité « Les cartes du soir »
Écran à part, volontairement non générique : table de nuit (`.card-table`, dégradé prune profond,
vignette basse, liseré intérieur en pointillés), **sceaux de cire** pour les niveaux (`.wax-seal`,
chiffres romains, flamme pour « Feu »), carte à retourner en 3D (`.card3d`, dos à motif de points
`.card-back-pattern`, face papier crème `.card-front-paper` à coins ornementaux `.card-corner`),
texte de la carte en Fraunces italique. Minuteur discret, deux actions seulement (« Fait », « Autre carte »).

## 5. Mouvement
- Micro-animations : `animate-rise` (apparition + stagger via `--i`), `animate-bloom`,
  `animate-curtain` (révélation des réponses), `animate-float` (illustrations), `hover-lift`.
- Durées 150 / 250 / 420 ms, courbe `--ease`. `prefers-reduced-motion` neutralise tout.

- Durées : 150 ms (micro), 250 ms (transitions), 400 ms (révélations).
- Courbe : `cubic-bezier(.2,.8,.2,1)`.
- Moments signature : révélation simultanée des réponses (deux cartes qui se retournent),
  compte à rebours de surprise, case cochée des listes (coche dessinée).
- Respecte `prefers-reduced-motion`.

## 6. Composants (packages/ui)
Base : `Button` (primary, secondary, ghost, danger ; tailles sm/md/lg ; état loading),
`Card`, `Input`, `Textarea`, `Label`, `Field` (label + aide + erreur), `Badge`, `Avatar`,
`Skeleton`, `EmptyState`, `Dialog`, `Sheet` (mobile bottom sheet), `Tabs`, `Toast`,
`Switch`, `Segmented` (choix « Maintenant / Ce soir / Ce week-end »), `Chip`
(ambiances), `ProgressRing`, `Calendar` (jour/semaine/mois), `RevealCard` (jeux),
`CountdownBadge`, `PaywallCard`.

Chaque composant : accessible (rôles ARIA, focus), thémable, documenté par un exemple dans
`apps/web/app/(dev)/styleguide` (hors production).

## 7. Iconographie et illustration
Icônes : Lucide (trait 1,75). Illustrations : formes organiques abstraites générées en SVG
(ellipses superposées en blush/champagne/prune avec flou), jamais de personnages genrés.

## 8. Écrans mobiles
- Navigation par onglets (5 max) : Accueil, Agenda, Jouer, Nous, Plus.
- Bouton « On fait quoi ? » : pastille flottante corail au centre de la barre.
- Bottom sheets pour les flux courts ; pages pleines pour l'agenda et les jeux.
- États : vide (illustration + action), chargement (skeleton), erreur (message +
  réessayer), hors ligne (bandeau).

## 9. Ton rédactionnel
Tutoiement collectif (« vous » pour le couple), phrases courtes, chaleur sans mièvrerie,
aucune injonction culpabilisante. Les refus sont toujours proposés sans justification
(« Passer », « Pas pour nous »).
