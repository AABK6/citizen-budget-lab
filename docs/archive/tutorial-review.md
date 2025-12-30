# Tutorial review

> Archived: historical review kept for reference. For current docs, see `docs/README.md`.

## Findings
- Tutorial metadata (targetId/position) is not used; the overlay stays centered so users are not guided to the intended controls. (frontend/app/build/components/TutorialOverlay.tsx)
- Step copy shows garbled accents/encoding, which hurts clarity on first login. (frontend/app/build/components/TutorialOverlay.tsx)
- The flow does not cover revenue-side controls or apply/clear actions, so key actions are skipped. (frontend/app/build/components/TutorialOverlay.tsx)
- Navigation lacks Back/Skip, limiting review or deferring the tour. (frontend/app/build/components/TutorialOverlay.tsx)
- First-time gating is a single localStorage flag with no versioning or account scope, so it is device-specific and will not reappear after updates. (frontend/app/build/components/TutorialOverlay.tsx)

## Recommendations / Next steps
1. Fix tutorial copy/encoding and expand steps to include revenue panel actions and apply/clear flows.
2. Implement anchored callouts using targetId/position (or a tour library) and auto-scroll to targets.
3. Add Back/Skip controls and a progress indicator that supports resuming.
4. Version the has_seen_tutorial key (or store per user) so updated tutorials can be re-shown.

## Addendum
- Onboarding should be per-device (localStorage)
