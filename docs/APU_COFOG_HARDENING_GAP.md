# Durcissement APU/COFOG - ecarts restants (audit 2026-02-26)

## Objectif

Identifier ce qu'il reste a durcir pour que la baseline integre correctement tout le perimetre APU (APUC + APUL + ASSO) avec une ventilation COFOG robuste, en gardant la typologie actuelle de simulation.

## Constat actuel dans le code

Etat constate sur la branche `baseline-2027-snapshot-rollout`:

- Le patch "voted 2026" est construit a partir de:
  - LFI ETAT B (missions CP) + ETAT A (agregats et lignes recettes),
  - LFSS (equilibre par branche + agregat ASSO en % PIB).
- Ce patch est applique ensuite sur la baseline LEGO par reallocation des blocs existants.

Chiffrage actuel (snapshot `data/cache/lego_baseline_2026.json`):

- Depenses totales: 1 154.81 MdEUR.
- Cibles depenses appliquees: 1 141.79 MdEUR (98.87% du total).
- Ecart non cible explicitement: 13.03 MdEUR (principalement `M_CIVIL_PROT`).
- Recettes totales: 1 003.46 MdEUR.
- Fermeture macro forcee en recettes: +19.42 MdEUR (`apu_macro_closure_state_non_fiscal_delta_eur`).

References code:

- Construction des cibles depenses via ETAT B + LFSS branches:
  - `tools/apply_voted_2026_to_lego_baseline.py:354`
  - `tools/apply_voted_2026_to_lego_baseline.py:376`
- Avertissement explicite de "proportional residual for uncovered APU blocks":
  - `tools/apply_voted_2026_to_lego_baseline.py:708`
  - `data/cache/lego_baseline_2026.json:324`
- Fermeture macro du deficit via delta force dans `state_non_fiscal`:
  - `tools/apply_voted_2026_to_lego_baseline.py:436`
  - `tools/apply_voted_2026_to_lego_baseline.py:591`
  - `data/cache/lego_baseline_2026.json:358`
- Proxy interets de la dette via COFOG 01.7 (pas de D.41 direct):
  - `services/api/cache_warm.py:1196`
  - `services/api/cache_warm.py:1205`
- Fallbacks temporels et approximations encore actifs:
  - `services/api/cache_warm.py:1224`
  - `services/api/cache_warm.py:1363`

## Gaps restants a couvrir

### 0) Blind spots metier par bloc treemap (prioritaires)

Au-dela des gaps techniques, les angles morts metier les plus probables sont:

- `M_TRANSPORT`: forte composante APUL (regions, AOM, departements/communes) pas encore ancree bloc-a-bloc.
- `M_EDU`: ancrage Etat robuste, mais couverture incomplete de la depense locale (batiments scolaires, entretien, personnels techniques, investissements).
- `M_SOLIDARITY`: risque de sous-couverture APUL sur RSA/APA/PCH/ASE (principalement departements), hors perimetre Etat/LFSS branche.
- `M_HOUSING`: bloc actuellement a 0 dans le snapshot 2026, incompatible avec une vision APU complete.
- `M_CIVIL_PROT`: bloc present dans la baseline mais non cible explicitement par l'overlay 2026.
- `M_ENVIRONMENT`: composantes locales (dechets, assainissement, eau) potentiellement sous-ancrees.
- `M_CULTURE` (incluant `sport_youth` et `media_public`): part locale significative a verifier explicitement.
- `M_TERRITORIES`: attention specifique au risque de double compte entre transferts Etat->collectivites et depenses APUL finales.

Impact:

- Risque de biais par bloc meme si le total APU global est ferme.
- Risque d'ecarts visibles face aux ordres de grandeur metier attendus sur transport, education locale, social departemental.

### 1) Couverture APU incomplete pour 2026 vote

- Le bundle consolide `state` + `social`, mais pas un pilier APUL structure:
  - `tools/build_voted_2026_aggregates.py:31`
  - `tools/build_voted_2026_aggregates.py:137`
- Les budgets APUL ne sont pas votes par le Parlement. Ils sont votes par chaque assemblee locale, puis consolides ex post en comptabilite nationale.

Impact:

- Pas de cible APUL explicite par bloc de treemap.
- Une partie du total APU est traitee par residu plutot que par ancrage source.

### 2) Couverture COFOG incomplete au moment de l'overlay

- Cibles appliquees sur 18 masses seulement.
- Masses presentes dans les mappings depenses mais non ciblees par l'overlay: `M_CIVIL_PROT`, `M_HOUSING`, `M_TEST`.
- Dans l'etat actuel, le "trou" est surtout `M_CIVIL_PROT` (environ 13.03 MdEUR), traite indirectement.

Impact:

- Le treemap reste coherent en total, mais pas 100% ancre par cible officielle bloc-a-bloc.

### 3) Recettes: fermeture par residu macro

- Les recettes groupees couvrent tout le total simulation, mais un delta de fermeture est injecte pour caler le deficit macro:
  - `apu_macro_closure_state_non_fiscal_delta_eur` dans `meta.voted_2026_overlay`.
- Cela masque l'absence de ventilation complete "votee" pour toutes les recettes APU (notamment hors Etat et hors agregat branche LFSS).

Impact:

- Deficit total aligne, mais attribution de certaines recettes reste modelisee et non directement observee.

### 4) Dependance a des fallbacks dans le warmer

- Fallback "last available observation" si annee manquante.
- Approximation "major-only" si flux incomplet.
- D.41 toujours proxy.

Impact:

- Robustesse operationnelle bonne, mais robustesse statistique "triple check strict" insuffisante.

## Recherche officielle: ce qui est disponible et ce qui ne l'est pas

Sources officielles confirmees (consultees le 2026-02-26):

1. LFI 2026 votee (Etat) - Legifrance + texte AN
- https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155
- https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0227.raw

2. LFSS 2026 votee (ASSO/branches) - Legifrance + texte AN
- https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053226384
- https://www.assemblee-nationale.fr/dyn/docs/PRJLANR5L17BTA0199.raw

3. Ventilation SS plus fine (recettes/depenses) - Annexes PLFSS
- https://www.securite-sociale.fr/home/actualites/plfss-2026-les-annexes-et-les.html

4. APUL (budgets locaux) - donnees DGCL / collectivites
- https://www.collectivites-locales.gouv.fr/finances-locales/les-donnees-des-finances-locales
- https://www.collectivites-locales.gouv.fr/finances-locales/recueil-des-budgets-primitifs-communaux-et-intercommunaux
- https://www.collectivites-locales.gouv.fr/finances-locales/le-budget-des-collectivites-locales

5. Comptes APU / COFOG (reference comptabilite nationale)
- https://www.insee.fr/fr/statistiques/8574707
- https://www.insee.fr/fr/statistiques/8625329
- https://ec.europa.eu/eurostat/cache/metadata/en/gov_10a_exp_esms.htm
- https://ec.europa.eu/eurostat/cache/metadata/en/gov_10a_taxag_esms.htm
- https://ec.europa.eu/eurostat/cache/metadata/en/gov_10a_main_esms.htm

Point cle de disponibilite:

- Les comptes nationaux APU/COFOG detailes ne sont pas publies en temps reel sur l'annee votee.
- Pour 2026, un niveau "100% observe" APU+COFOG n'est pas integralement disponible immediatement; il faut un schema d'estimation explicite et trace jusqu'a publication officielle.

## Plan de durcissement recommande

### P0 - Supprimer les residus "silencieux"

- Introduire un artefact canonique `data/reference/apu_2026_targets.json` avec 3 piliers explicites:
  - `state`,
  - `social`,
  - `local`.
- Ajouter un champ `source_quality` par cellule cible (`voted`, `observed`, `estimated`).
- Interdire en mode strict:
  - `apu_macro_closure_state_non_fiscal_delta_eur`,
  - allocation proportionnelle implicite des blocs non couverts.
- Ajouter des "tests sentinelles" sur blocs sensibles APUL:
  - transport,
  - education locale,
  - social departemental (RSA et assimiles),
  - logement.

Critere de sortie P0:

- `meta.voted_2026_overlay` ne contient plus de fermeture macro residuelle.
- Tous les blocs treemap affiches ont un statut de source explicite.

### P1 - Couvrir APUL de maniere tracable

- Construire un pipeline APUL 2026 base sur sources DGCL (BP 2026), puis consolidation interne.
- Ajouter scripts de verification dedies:
  - `tools/verify_apul_2026.py`,
  - `data/reference/apul_2026_verified.csv`.
- Documenter les regles de passage APUL -> blocs simulation.

Critere de sortie P1:

- Un target APUL explicite entre dans le bundle consolide.
- Plus de residu APUL dans les blocs.

### P2 - Couverture COFOG complete et stable

- Ajouter une table passerelle versionnee:
  - `data/reference/cofog_bridge_apu_2026.csv`
  - dimensions minimales: `subsector`, `cofog`, `na_item`, `mass_id`, `weight`, `source`.
- Completer la couverture des masses manquantes (`M_CIVIL_PROT`, `M_HOUSING`) avec regles explicites.
- Geler des tests de fermeture:
  - fermeture par sous-secteur,
  - fermeture par COFOG,
  - fermeture par masse treemap.
- Ajouter des garde-fous anti-double-compte (obligatoires):
  - travailler en perimetre `S13 consolide` comme cible de verite,
  - ne jamais additionner transfert interne APU + depense finale financee par ce transfert,
  - separer "financement" et "usage final" pour les flux Etat->APUL,
  - pour RSA/APA/PCH/ASE: compter la prestation finale une seule fois.

Critere de sortie P2:

- Ecart de fermeture < 0.1% pour chaque axe (`subsector`, `cofog`, `mass_id`).
- 0 double compte detecte sur les tests de flux internes APU.

### P3 - Mode strict de production

- Ajouter un mode `STRICT_OFFICIAL=1` dans le warmer/overlay:
  - echec si fallback temporel,
  - echec si D.41 proxy sans source alternative.
- Conserver un mode `SNAPSHOT_FAST=1` pour la prod UI, mais avec build bloque si controles stricts echouent.

Critere de sortie P3:

- Build prod impossible si une source critique manque ou si un fallback non autorise est utilise.

## Checklist "definition of done" APU/COFOG

- 100% des blocs treemap relies a une cible explicite (pas de residu implicite).
- 100% des cibles taguees `voted` / `observed` / `estimated`.
- 0 fallback silencieux en mode strict.
- 0 proxy D.41 en mode strict (ou justification documentee + validation metier explicite).
- Reconciliation automatique:
  - total depenses APU,
  - total recettes APU,
  - solde APU,
  - cloture par sous-secteur.
- Tests metier obligatoires sur blocs APUL sensibles:
  - transport,
  - education locale,
  - social departemental (RSA et assimiles),
  - logement,
  - securite civile.
- Validation anti-double-compte sur transferts internes APU (Etat->APUL, APUL->operateurs).

## Decision methodologique conseillee

Pour la robustesse:

- A court terme 2026: conserver le snapshot mais expliciter les zones estimees (surtout APUL/COFOG fin).
- A moyen terme: basculer vers une baseline "hybride tracee" (voted + observe + estime), sans fermeture cachee.
- A publication des comptes nationaux complets 2026: remplacer automatiquement les composantes estimees par observees.
