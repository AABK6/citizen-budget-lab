# Bug Report: Scenario Race Condition & Persistent Error

## Issue Description
Users experience an intermittent "Scenario not found" (fr: "Échec du chargement du scénario") error when applying reforms or navigating between scenarios. This occurs because the frontend attempts to fetch the scenario DSL from the backend immediately after creating it. Due to the asynchronous nature of React state updates vs URL updates, a race condition often triggers a fetch for a scenario ID that might not yet be resolvable or is stale.

## Root Cause Analysis
The application uses a **"Read-After-Write"** pattern which is inherently fragile in this architecture:
1.  **Frontend**: Calls `runScenario` (Mutation).
2.  **Backend**: Computes result, stores DSL in `scenario_dsl_store` (Memory), returns `id`.
3.  **Frontend**: Receives `id`. Updates URL `?scenarioId=...`.
4.  **Frontend (`useEffect`)**: Detects URL change. Fires `getScenarioDslQuery` to get the DSL string.
5.  **Race**: If Step 4 happens on a stale URL (before the update propagates) or if the backend store has any latency, the Query returns 404 or fetches the wrong data.

## Current Mitigations (Applied)
1.  **`skipFetchRef`**: A `useRef` flag designed to ignore URL changes triggered by internal navigation.
2.  **Synchronous State**: `setScenarioId` is called immediately in `runScenario` to reduce state lag.
3.  **Fetch Guards**: `fetchDsl` aborts if `scenarioIdRef` doesn't match the URL (stale fetch protection).
4.  **Retries**: `fetchDsl` retries 3 times on failure.

## Recommended Permanent Fix (Architectural)
The current mitigations are complex state guards. The proper fix is to eliminate the secondary fetch entirely by retrieving the DSL **during the mutation**.

**Actions Required**:
1.  **Modify GraphQL Query**: Update `runScenarioMutation` in `frontend/lib/queries.ts` to request the `dsl` field. The backend `RunScenarioPayload` already supports this field.
2.  **Frontend Update**: In `BuildPageClient.tsx`, `runScenario` function should:
    *   Read the `dsl` string directly from the `runScenario` mutation response.
    *   Call `setDslObject(parseDsl(atob(dsl)))` immediately.
3.  **Disable Fetch**: The `useEffect` hook responsible for `fetchDsl` should be updated to skip fetching if the Data is already present or if the navigation was internal.

This change moves the application to an **Atomic UI** pattern, removing the second network request and eliminating the race condition root cause.
