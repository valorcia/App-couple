# DESIGN_SYSTEM — Entre Nous

## 1. Direction artistique
**« Papier & encre ».** Un magazine imprimé des années 70 qu'on lirait sous un plaid : papier
crème, encre prune-noire, orange brûlé, jaune marqueur, olive. Filets fins et doubles filets
plutôt que cartes, angles presque droits, ombres portées **dures** (encre pleine, décalées de
3 à 6 px), titres Fraunces très gras et légèrement bancals (axe `WONK`), libellés en petites
capitales numérotés (folios), surlignages au marqueur, tampons penchés, pictos tracés à la main.

Ce que cette direction refuse, parce que c'est le « look IA » : cartes arrondies à ombres douces,
dégradés et halos pastel, surtitres en capitales espacées, icônes dans des ronds, boutons pilule,
grilles symétriques de cartes identiques.

Mots-clés : imprimé, chaleureux, tactile, un peu insolent, précis.

## 2. Couleurs

### Palette de marque
| Token | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `--paper` | `#F3E7D3` | `#1D1418` (bistre) | fond, papier |
| `--paper-2` / `--paper-3` | `#EADBC2` / `#E0CFB0` | `#271C21` / `#33262C` | zones secondaires |
| `--ink` | `#271922` | `#F1E4D0` (crème) | texte, contours, ombres dures, affiches |
| `--orange` (primary) | `#E0582B` | `#F08A5A` | action principale, folios |
| `--marker` | `#F2BF45` | `#D9A63A` | surlignage, carte postale, bandeau démo, tampon Premium |
| `--olive` (sage) | `#6E7F4B` | `#93A86A` | états positifs |
| `--rose` (blush) | `#E3A79A` / surface `#EFCFC4` | `#4A2F36` | papier rose (piliers « S'aimer », dernière page) |
| `--plum` | `#4B2A46` | `#E8C8DC` | encre secondaire |

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
Mode sombre : papier bistre `#1D1418` (jamais noir ni gris), encre crème `#F1E4D0`, orange adouci,
marqueur doré ; les ombres dures passent en noir. Activation via
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
- Rayons : `sm 3px`, `md 6px`, `lg 10px` ; la pilule est réservée aux sceaux et avatars.
- Ombres portées dures en encre : `card` 3 px, `hard`/`soft` 4 px, `lift` 6 px (survol : la carte
  se soulève de 2 px, au clic elle s'écrase). Contours 1 px encre à 30 % sur les feuilles, 2 px
  encre pleine sur les panneaux et boutons. Utilitaires : `.rule`, `.rule-strong`, `.rule-double`,
  `.label-sc`, `.marker`, `.stamp`, `.tape`, `.arch`.
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
