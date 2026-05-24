# Medora language separation architecture (Phase 19U)

Medora-S is a **French-first** clinic product, but **English UI must never show French chrome or catalog metadata labels**, and **French UI must not show English chrome** where localized copy exists. This document defines permanent boundaries for **whole-EMR** web UI work.

## Scope (whole-EMR)

Applies to all user-facing surfaces under `apps/web`:

- Triage, provider documentation, nursing documentation, MAR, orders, pharmacy, billing
- Admin, patient records, chart export UI, ROI, MSPP
- Vaccinations, pathways, procedure documentation, medication inventory, catalog import
- All routes under `apps/web/app`, components under `src/components`, features under `src/features`, and libs that emit UI chrome

## Content classes

| Class | Rule | Examples |
|-------|------|----------|
| **A — UI chrome** | Must use `t()` from locale dictionaries; render in active language only | Save, Cancel, table headers, loading text |
| **B — Catalog metadata** | Normalize by locale before display; never raw French labels in EN UI | route, dosage form, therapeutic class |
| **C — Patient/provider free text** | Preserve exactly as entered | HPI, allergy narrative, manual order labels |
| **D — Signed chart / legal record** | Never auto-translate or mutate on locale switch | Saved MAR notes, persisted summaries, exports |
| **E — Generated summaries** | Build in active UI locale **at creation time** only; then treat as Class D | Home-med structured line at triage save |

## Core rules

### 1. UI chrome uses `t()`

All user-visible interface strings must come from `apps/web/src/i18n/messages/en.ts` and `fr.ts` via `useI18n().t()`.

Do not hardcode French or English literals in TSX/TS for UI chrome.

### 2. Catalog metadata normalizes by locale

Medication (and similar catalog) **route**, **dosage form**, **frequency**, and **therapeutic class** values stored in the database or returned by API search **must not** be rendered raw in UI when they are classification labels.

Use locale-aware display utilities (`localizedMedicationDisplay.ts`) before showing subtitles, order lines, MAR hints, or pharmacy search rows.

### 3. Patient and provider free text is preserved

Text entered by clinicians, registration staff, or patients **must be stored and displayed exactly as entered**. Do not auto-translate on read or write.

### 4. Signed and persisted chart text is immutable

Saved clinical documentation, MAR administration notes, triage summaries already written to the chart, legal exports, and audit payloads **must never be auto-translated** when the user changes UI language later.

### 5. Generated summaries use active locale at save time

When the system **generates** a summary line for the user to append, build that string in the **current UI locale** only at creation time. Once saved, treat it as chart content (rule 4).

### 6. No cross-language i18n fallback

`I18nProvider.t()` and `i18nMessage()`:

- Resolve keys against the **active locale root only**.
- **Missing keys return the dotted key path** — never fall back to the other language catalog.

### 7. Error messages require explicit locale

`normalizeUserFacingError(message, locale)` **requires** an explicit `SupportedLanguage`. UI code must pass `useI18n().language`.

## Adding new UI strings

1. Add the **same key path** to both `en.ts` and `fr.ts`.
2. Use `const { t } = useI18n()` in components — no hardcoded chrome.
3. Run `pnpm --filter @medora/web test` — key parity and forbidden-token gates must pass.

## Adding catalog metadata safely

1. Store raw catalog values unchanged (Class B source data).
2. Display via `normalizeMedicationDisplayForLocale`, `formatCatalogMedicationSubtitleForLocale`, or related helpers.
3. Do not pass normalized strings to safety engines or persistence unless the user explicitly edited them.

## Requesting an allowlist exception

Exceptions belong in `apps/web/src/i18n/messages/i18nLanguageBoundary.allowlist.ts` as `LANGUAGE_BOUNDARY_ALLOWLIST` entries with:

- `scope` — `hardcodedFrenchSource`, `enMessage`, `frMessage`, or `enMessageDiacritic`
- `path` — `apps/web/` relative file path or dotted i18n key prefix
- `token` — exact forbidden token, or `"*"` for whole-file deferral
- `reason` — why the exception exists (minimum one clear sentence)
- `cleanupPhase` — `19U.5`, `19U.6`, or `permanent`

Vague file-level deferrals without reason are not allowed. New features should not add allowlist entries unless truly blocked on a later cleanup phase.

## New features — language-boundary tests

Before merging UI work:

1. No new hardcoded UI strings in components (use `t()`).
2. No raw catalog route/form/class in display code.
3. New i18n keys in **both** `en.ts` and `fr.ts`.
4. English strings in `en.ts` must not contain forbidden French UI tokens.
5. French strings in `fr.ts` must not contain forbidden English UI chrome where localized copy exists.
6. Do not auto-translate persisted clinical content.
7. If deferral is unavoidable, add a structured `LANGUAGE_BOUNDARY_ALLOWLIST` entry.

## Phased remediation (19U)

| Phase | Focus |
|-------|--------|
| **19U.1** | Guardrails, tests, doc, high-risk EN catalog cleanup |
| **19U.2** | Centralized catalog display normalization |
| **19U.3** | Medication / home / allergy / MAR locale cleanup |
| **19U.4** | Whole-EMR forbidden-token regression gates + locale leak detection (CI) |
| **19U.5** | App-wide hardcoded string cleanup |
| **19U.6** | Final language separation audit |

## Tests (CI)

Automated guards live in:

- `apps/web/src/i18n/messages/i18nLanguageBoundary.test.ts` — key parity, EN/FR forbidden tokens, whole-EMR hardcoded French scan, fallback behavior
- `apps/web/src/i18n/messages/localeLeakRegression19U4.test.ts` — catalog leak scan, medication component contracts
- `apps/web/src/i18n/messages/i18nLanguageBoundary.allowlist.ts` — `LANGUAGE_BOUNDARY_ALLOWLIST` (controlled deferrals)
- `apps/web/src/i18n/messages/wholeEmrLocaleScan19U4.ts` — static scan helpers (test infrastructure)

Run with `pnpm --filter @medora/web test`.

Scans **exclude**: test files, i18n message catalogs, clinical free-text fixtures, `uiLabels.ts` (legacy FR source), and saved chart examples containing French medication words as patient-entered content.
