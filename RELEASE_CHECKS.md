# Release acceptance — September 27, 2026

## Local product

- Official posting retrieved in a browser; Job Identification 32372 confirmed.
- Separate DiversityJobs capture and actual eight-page saved PDF extraction retained. Saved footer tracking query removed; no job text backfilled.
- 9 topics, 24 role drills, 10 personal career-practice cards, 16 separately classified career fact fragments.
- 45 files under `content/`, including the derived validation transcript.
- Content validator exit code 0. Deterministic content SHA-256: `cc155b9b9894e0c1203f0f1ba3784b23e44c2dd6dc4e31095aa5674bc40eae9c`.
- 12/12 rejection tests pass: missing frontmatter, illegal class, missing inference lineage, missing posting URL, replaced posting body, manual generated edit, wrong hash, removed tension topic, insufficient drills, missing candidate source, promoted evidence class, invented excerpt.

## Browser checks

Tested over an HTTP static server under `/nfcu-ltd-spm-role-study/`, matching the planned Pages subpath.

- Phone viewport 390 × 844: readable layout, bottom navigation, no horizontal overflow.
- Desktop viewport 1280 × 720: no horizontal overflow; home renders the complete content counts.
- 3 / 10 / 25 minute choices show the expected initial times. Start decrements, pause preserves remaining time.
- Posting-only filter hides industry, inference, drills, and candidate material. A topic retained only its posting records. Keyboard Space toggles the filter.
- Completion persisted after reload. It represents practice, not competence.
- Search for Operating BEAT returned its correctly bounded career card.
- DevTools network-disabled reload succeeded; career material was available offline. Final `20260927-r3` app also reloaded offline successfully. Normal networking and viewport emulation were restored on the final acceptance tab.
- Source excerpts remain available in expandable panels; duplicate drill wrappers were removed.
- Reset now uses an inline Cancel / Confirm reset group with keyboard focus handling. Both routes were tested. A native confirmation in an earlier development version stalled the automation tab; that behavior is removed from the release.
- No application warning/error logs were observed during core acceptance. This is a bounded browser review, not a full assistive-technology certification or physical-device install test.

## Privacy and evidence

The owner authorized this public edition without sign-in. The wider career workspace, original personal source documents, private intake report, private provenance paths, held operational/contract material, and contact identifiers are outside the publishing tree. User statements, issuer copies, training, personal projects, and practice prompts remain distinct.

The wider career repository's existing integrity check remains 88/89 because of its unrelated `application_tracker` route. This application does not repair or claim to certify that separate repository.

## Publication

`docs/` is a generated copy of the accepted app; `PAGES_MANIFEST.json` records every exported file's digest. Source validation also checks the exported bytes once that manifest exists. This file reports local acceptance and is not proof that a remote repository or live site has been created. Confirm remote publication independently.

## Known release limits

Progress transfer is manual export/import, not cloud sync. There is no AI coaching, speech transcription, automatic source refresh, or interview-format prediction. Offline use requires one successful online visit and retained browser storage. Employer-specific philosophies, calibration rules, cycle ownership, system/role access, reporting structure, and interview format remain unanswered.
