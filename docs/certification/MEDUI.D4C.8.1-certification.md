# MEDUI.D4C.8.1 certification

## Verdict

**PASS — certified for draft pull-request review.** No deployment or merge is authorized by this certification.

## Evidence matrix

| Requirement | Implementation evidence | Test/check evidence | Result |
|---|---|---|---|
| CLOSED derives from `Encounter.status` | `projectEncounterListLifecycle` uses strict equality with `"CLOSED"`. | Focused Vitest: status authority case. | PASS |
| `dischargedAt` does not imply CLOSED | Projection contract and implementation do not consume `dischargedAt`. | Focused Vitest: OPEN fixture carrying `dischargedAt` remains open. | PASS |
| Persistent accessible lock | CLOSED row renders a visible localized badge with `role="status"`, `aria-label`, title, and decorative SVG. It is outside the permission-controlled action. | Focused Vitest: source-level accessibility and permission-order invariant. | PASS |
| Present authoritative `closedAt` | CLOSED projection exposes a non-null `closedAt`; the row formats it using the active locale. | Focused Vitest: CLOSED timestamp is retained and OPEN timestamp is suppressed. | PASS |
| One route for OPEN and CLOSED | Projection always builds `/app/encounters/:encounterId`; the existing Link uses it. | Focused Vitest exercises both statuses. | PASS |
| No `/closed-chart` or `/record` viewer | No alternate viewer was implemented. | Focused Vitest asserts neither route appears in the target surface. | PASS |
| Preserve OPEN behavior | OPEN remains unlocked, keeps its localized status, and retains the existing action/route. | Focused Vitest covers OPEN projection and canonical navigation. | PASS |
| Existing API projection is sufficient | `ENCOUNTER_LIST_SELECT` composes `ENCOUNTER_CORE_SELECT`, which already contains lifecycle/reopen fields. | Preimplementation source audit. | PASS |
| Database work not required | UI-only projection consumes existing fields. | Git diff/schema audit. | PASS |

## Executed validation

- Focused: `npm run test --workspace=@medora/web -- --run src/components/patient-chart/encounterListProjection.d4c8-1.test.ts` — 1 file passed; 5 tests passed.
- Typecheck: `npx tsc --noEmit -p apps/web/tsconfig.json` — failed on three pre-existing CSS side-effect imports (`msppRapportPrint.css` twice and `globals.css`); no D4C.8.1 diagnostic was reported. Next.js' integrated type validation subsequently passed in the production build.
- Lint: `npm run lint --workspace=@medora/web` — exited 0; the repository script reports that lint is not configured.
- Whole-web tests: `npm run test --workspace=@medora/web` — failed with 458 failed/299 passed files and 4 failed/2,605 passed tests. Reported failures are pre-existing unrelated source-contract and language-boundary assertions; the focused D4C.8.1 file passed independently.
- Production build: `npm run build --workspace=@medora/web` — passed after the implementation defect found by the first run was corrected; 161 static pages generated and the authoritative `/app/encounters/[id]` dynamic route compiled.

## Residual risk

The focused UI test deliberately tests the deterministic projection directly and statically certifies the rendered accessibility/route wiring because the web workspace does not currently provide a DOM component-test harness. Manual visual review remains appropriate during draft PR review.
