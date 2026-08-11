# ED clinical notes → Summary → legal record certification

## Final verdict: CONDITIONAL PASS

All targeted legal-note projection suites and all three production builds completed successfully. The focused ER clinical-record print runner completed with 8/9 tests passing; its sole failure is the pre-existing facility-address formatting assertion (the renderer emits the street and city/state/postal code on separate centered lines while the test expects one comma-joined line). The same completed runner proves that `narrativeNotes` renders the authoritative note body, author, role, and timestamp in the print packet. No legal-note projection failure remains.

## Exact validation results

| Validation | Exit | Aggregate | Result |
|---|---:|---|---|
| Shared targeted projection/catalog | 0 | 2 files, 32 tests passed | PASS |
| API encounter-notes + legal-chart | 0 | 2 suites, 44 tests passed | PASS |
| Web targeted legal record | 0 | 4 files, 32 tests passed | PASS |
| ER clinical-record print | 1 | 1 file; 8 passed, 1 failed | CONDITIONAL — unrelated address assertion only |
| Shared build | 0 | `tsc -p tsconfig.json` completed | PASS |
| API build | 0 | Prisma generation completed; `nest build` exited 0 | PASS |
| Web production build | 0 | compiled, typechecked, collected data, generated 173/173 pages, finalized optimization | PASS |

Warnings were limited to npm's future `http-proxy` configuration warning, Vite's deprecated CJS Node API warning, Next's experimental `serverActions` notice, Next telemetry information, and Prisma's deprecated `package.json#prisma` configuration warning. None is a clinical-note failure.

The API tests initially failed before the shared package was built because `@medora/shared` declarations were unavailable. After the required shared build, the exact API command was rerun to its final Jest aggregate and passed 44/44 tests.

## Legal-record invariant matrix

| # | Invariant | Evidence | Result |
|---:|---|---|---|
| 1 | Relational nursing note appears in Summary projection | shared builder chronology test and Summary renderer wiring test | PASS |
| 2 | Relational provider note appears | web adapter projection test and shared provider/amendment rows | PASS |
| 3 | Technician/other types remain registered/projected | focused shared lifecycle rows plus typed catalog | PASS |
| 4 | Amendment retains original and linkage | append-only API amendment test and shared `amendedFromNoteId` assertion | PASS |
| 5 | Voided note retains status | API list/void tests and shared `VOIDED` projection assertion | PASS |
| 6 | Cosigned note retains status | API cosign test and shared `COSIGNED` projection assertion | PASS |
| 7 | Foreign encounter note rejected | shared foreign `encounterId` assertion | PASS |
| 8 | Duplicate source id deduplicated | shared duplicate-id assertion | PASS |
| 9 | Two historical notes remain chronological | shared ordered ids/body assertions | PASS |
| 10 | Persisted author identity preserved | shared/web `authorUserId`, name and role assertions | PASS |
| 11 | Persisted timestamp preserved | web exact `createdAt` assertion | PASS |
| 12 | Viewer cannot replace authorship | API persisted author snapshots and pure builder inputs; no viewer parameter | PASS |
| 13 | Note body remains verbatim | web multilingual clinical-text equality and print assertion | PASS |
| 14 | Clinical body is not translated | French-locale web projection retains mixed-language body exactly | PASS |
| 15 | Summary and print consume same projection | web source-wiring regression plus print render regression | PASS |
| 16 | Patient chart remains authoritative-source connected | API legal-chart/encounter-note suites and existing chart/export readers | PASS |
| 17 | Nursing narrative remains immutable event-backed history | nursing restoration suite and existing reassessment event reader | PASS |
| 18 | No Summary note persistence | source audit and pure projection builder; API creates only `EncounterNote` | PASS |
| 19 | No note body in logs | API audit allowlist/forbidden-key regression | PASS |
| 20 | Every catalog source has disposition | catalog uniqueness/disposition/reason test | PASS |

Nested encounter responses legitimately type `encounterNotes` as nullable and may omit per-row `encounterId` because the parent query is already encounter/facility scoped. Validation found the production type mismatch. The input compatibility type now accepts nullable nested arrays and optional row ids, while the builder continues rejecting every explicitly foreign encounter id and invalid id/body/time row.

## Source catalog and record governance

Every registered source has exactly one of `INCLUDE_FULL`, `INCLUDE_STRUCTURED`, `REFERENCE`, or `EXCLUDE_WITH_REASON`. No registered disposition is undefined, and the only exclusion has a non-empty reason. Relational notes remain authoritative `EncounterNote` rows; legacy `erNotesV1` and immutable `NURSING_ASSESSMENT_SAVED` compatibility remain unchanged. No Summary-specific persistence, narrative translation, or PHI logging was introduced.

## Database and delivery boundary

Prisma schema changed: **NO**. Migration required: **NO**. Local migration: **NOT REQUIRED**. Production migration: **NOT REQUIRED**. Seed: **NOT REQUIRED**.

No production access, production migration, seed, deployment, or merge occurred.

## Residual risks

The facility-address assertion remains a separate, known print-format defect and was deliberately not modified. Older JSON sources can lack immutable user ids or complete signature metadata. Some pre-existing latest-state JSON domains do not provide a universal signed amendment ledger. These limitations were not hidden by invented statuses or duplicate persistence.
