# Qualtrics Integration Runbook

Ce document explique, pas a pas, comment brancher la simulation `budget-citoyen.fr/build` dans Qualtrics avec recuperation fiable des donnees de vote.

## 1. Ce que fait l'integration

Flux 1 (`Qualtrics -> simulation`):
- Qualtrics charge l'iframe avec `source=qualtrics` et un identifiant repondant `ID`.

Flux 2 (`simulation -> Qualtrics`):
- Quand l'utilisateur clique "Deposer mon vote", la simulation envoie un message `postMessage` au parent avec un objet `embeddedData` (`CBL_*`).
- Le JavaScript Qualtrics capte ce message et ecrit ces valeurs dans les Embedded Data Qualtrics.

## 2. Embedded Data a creer dans Survey Flow

Dans `Survey Flow`, ajoute ces champs (exactement):

- `CBL_SCENARIO_ID`
- `CBL_RESPONDENT_ID`
- `CBL_SESSION_SEC`
- `CBL_CHANNEL`
- `CBL_ENTRY_PATH`
- `CBL_SUBMIT_TS`
- `CBL_SNAPSHOT_V`
- `CBL_SNAPSHOT_SHA256`
- `CBL_SNAPSHOT_TRUNCATED`
- `CBL_SNAPSHOT_MODE`
- `CBL_SNAPSHOT_B64`
- `CBL_BACKEND_PERSISTED`
- `CBL_BACKEND_ERROR`

## 3. HTML de la question (iframe)

Dans la question Qualtrics qui integre la simulation, utilise une iframe de ce type:

```html
<iframe
  src="https://www.budget-citoyen.fr/build?source=qualtrics&ID=${e://Field/ResponseID}"
  width="100%"
  height="900"
  style="border:0;"
  allow="clipboard-write"
></iframe>
```

Points importants:
- `source=qualtrics` active le canal Qualtrics dans l'app.
- `ID=...` est l'identifiant repondant transmis a la simulation.
- Tu peux remplacer `${e://Field/ResponseID}` par un autre champ panel si necessaire.
- Erreur frequente: une iframe en `https://www.budget-citoyen.fr/build` sans `?source=qualtrics&ID=...` affiche bien la simulation, mais ne permet pas un suivi panel fiable (`respondentId` absent).

## 4. JavaScript Qualtrics a ajouter sur la question

Dans la question, clique `Add JavaScript` et colle ce code:

```javascript
Qualtrics.SurveyEngine.addOnload(function () {
  const allowedOrigins = new Set([
    "https://www.budget-citoyen.fr",
    "https://budget-citoyen.fr"
  ]);

  const toStr = (v) => (v === undefined || v === null ? "" : String(v));

  const onMessage = (event) => {
    if (!allowedOrigins.has(event.origin)) return;

    const data = event.data || {};
    if (data.type !== "CBL_VOTE_SUBMITTED_V1") return;

    const ed = data.embeddedData || {};
    const keys = [
      "CBL_SCENARIO_ID",
      "CBL_RESPONDENT_ID",
      "CBL_SESSION_SEC",
      "CBL_CHANNEL",
      "CBL_ENTRY_PATH",
      "CBL_SUBMIT_TS",
      "CBL_SNAPSHOT_V",
      "CBL_SNAPSHOT_SHA256",
      "CBL_SNAPSHOT_TRUNCATED",
      "CBL_SNAPSHOT_MODE",
      "CBL_SNAPSHOT_B64"
    ];

    keys.forEach((k) => {
      Qualtrics.SurveyEngine.setEmbeddedData(k, toStr(ed[k]));
    });

    Qualtrics.SurveyEngine.setEmbeddedData(
      "CBL_BACKEND_PERSISTED",
      data.backendPersisted ? "1" : "0"
    );
    Qualtrics.SurveyEngine.setEmbeddedData(
      "CBL_BACKEND_ERROR",
      toStr(data.backendError)
    );
  };

  window.addEventListener("message", onMessage, false);

  Qualtrics.SurveyEngine.addOnUnload(function () {
    window.removeEventListener("message", onMessage, false);
  });
});
```

## 5. Ce que contient `CBL_SNAPSHOT_B64`

- C'est une copie de secours du vote final.
- Format: JSON compresse puis encode en base64url.
- Si trop gros, la simulation degrade automatiquement (`full -> ids -> minimal`).
- Si encore trop gros: le contenu est vide, mais hash et flags restent renseignes.

Les champs utiles:
- `CBL_SNAPSHOT_SHA256`: hash du snapshot non compresse (verification/reconciliation).
- `CBL_SNAPSHOT_TRUNCATED`: `1` si version reduite.
- `CBL_SNAPSHOT_MODE`: `full`, `ids`, ou `minimal`.

## 6. Verification de bout en bout

Checklist rapide:

1. Lancer un preview Qualtrics.
2. Faire un vote dans l'iframe.
3. Cliquer `Next` dans Qualtrics.
4. Exporter la reponse test et verifier que les champs `CBL_*` sont remplis.

Verification cote code:

```bash
python tools/verify_qualtrics_integration.py
python tools/verify_qualtrics_integration.py --graphql-url https://[API_HOST]/graphql
```

## 7. Troubleshooting

Si les champs `CBL_*` restent vides:
- Verifier que l'URL iframe contient bien `source=qualtrics&ID=...`.
- Verifier que le JS est bien attache a la meme question que l'iframe.
- Verifier les `allowedOrigins` dans le listener.
- Verifier que la mutation backend deployee expose bien les arguments `submitVote` attendus.

Si `CBL_BACKEND_PERSISTED=0`:
- Le message est bien recu par Qualtrics mais la sauvegarde serveur a echoue.
- Conserver la reponse Qualtrics et investiguer l'API (`/health`, logs Cloud Run).
