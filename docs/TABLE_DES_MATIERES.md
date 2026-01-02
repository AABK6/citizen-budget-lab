# Documentation - Table des Matières

Ce dossier contient la documentation technique et fonctionnelle du projet **Citizen Budget Lab**. Voici un guide rapide pour vous orienter.

## 📌 Point d'entrée

*   **[`README.md`](./README.md)**
    *   **Quoi :** Index court (anglais) vers les docs "current" + conventions d'archivage.
    *   **Pour qui :** Toute personne qui arrive sur le repo.

## 📘 Documentation Générale

*   **[`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md)**
    *   **Quoi :** La vision produit, les fonctionnalités clés et la roadmap macro.
    *   **Pour qui :** Tout le monde. C'est le point de départ pour comprendre "pourquoi" et "quoi".

*   **[`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md)**
    *   **Quoi :** Guide d'installation (backend/frontend), architecture technique, commandes de build, outils d'administration (Editor), et processus de CI/CD.
    *   **Pour qui :** Développeurs souhaitant installer ou contribuer au projet.

*   **[`DATA_MANIFEST.md`](./DATA_MANIFEST.md)**
    *   **Quoi :** L'inventaire de toutes les sources de données (Eurostat, PLF, etc.), des fichiers de configuration et des pipelines de données (warmers, dbt).
    *   **Pour qui :** Data engineers et développeurs travaillant sur la data.

## 🏗️ Méthodologie & Architecture

*   **[`LEGO_METHOD.md`](./LEGO_METHOD.md)**
    *   **Quoi :** Explication détaillée de la méthode "LEGO" : comment les budgets officiels sont découpés en briques, comment les calculs de déficit fonctionnent, et les hypothèses macroéconomiques.
    *   **Pour qui :** Économistes, data analysts et curieux du modèle de calcul.

*   **[`REFACTOR_PLAN.md`](./REFACTOR_PLAN.md)**
    *   **Quoi :** Historique et plan de la refonte technique majeure (migration vers un data warehouse dbt).
    *   **Pour qui :** Tech leads (utile pour comprendre l'état actuel de la dette technique).

## 📂 Références & Migrations

*   **[`plf_missions_programmes.md`](./plf_missions_programmes.md)**
    *   **Quoi :** Nomenclature officielle des missions et programmes du PLF 2025/2026 utilisée dans l'application.
    *   **Pour qui :** Data teams vérifiant les correspondances budgétaires.

*   **[`ADMIN_LENS.md`](./ADMIN_LENS.md)**
    *   **Quoi :** Documentation "source-of-truth" sur la vue administrative (Missions) : données, mappings, APIs (GraphQL) et points d'attention.
    *   **Pour qui :** Développeurs backend/frontend + data.

## 🗄️ Archives

*   **[`archive/README.md`](./archive/README.md)**
    *   **Quoi :** Index des documents obsolètes ou purement historiques.

*   **[`archive/UX_OVERHAUL_PLAN.md`](./archive/UX_OVERHAUL_PLAN.md)**
    *   **Quoi :** Plan de refonte UX/UI (historique).

*   **[`archive/tutorial-review.md`](./archive/tutorial-review.md)**
    *   **Quoi :** Audit du tutoriel d'onboarding (historique).

*   **[`archive/design_mockups/`](./archive/design_mockups/)**
    *   **Quoi :** Mockups HTML pour la refonte du builder (historique).

*   **[`archive/admin_lens_migration.md`](./archive/admin_lens_migration.md)**
    *   **Quoi :** Ancien plan de migration (historique) vers la vue administrative.
