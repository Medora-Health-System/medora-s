# Medora language separation architecture (Phase 19U)

Medora-S is a **French-first** clinic product, but **English UI must never show French chrome or catalog metadata labels**, and **French UI must not show English chrome** where localized copy exists. This document defines permanent boundaries for web UI work.

## Core rules

### 1. UI chrome uses `t()`

All user-visible interface strings — navigation, titles, buttons, labels, placeholders, table headers, empty states, loading text, validation messages, toasts — **must** come from `apps/web/src/i18n/messages/en.ts` and `fr.ts` via `useI18n().t()`.

Do not hardcode French or English literals in TSX/TS for UI chrome.

### 2. Catalog metadata normalizes by locale

Medication (and similar catalog) **route**, **dosage form**, **frequency**, and **therapeutic class** values stored in the database or returned by API search **must not** be rendered raw in UI when they are classification labels.

Use locale-aware display utilities (see `localizedMedicationDisplay.ts`; centralized expansion in Phase 19U.2) before showing subtitles, order lines, MAR hints, or pharmacy search rows.

**Never** render raw `secondaryText`, `metadata.route`, `metadata.dosageForm`, or `metadata.therapeuticClass` directly in English UI.

### 3. Patient and provider free text is preserved

Text entered by clinicians, registration staff, or patients (narratives, allergy detail, manual order labels, comments) **must be stored and displayed exactly as entered**. Do not auto-translate on read or write.

### 4. Signed and persisted chart text is immutable

Saved clinical documentation, MAR administration notes, triage summaries already written to the chart, legal exports, and audit payloads **must never be auto-translated** when the user changes UI language later.

Language applies to **how new content is generated at save time**, not retroactive mutation of the legal record.

### 5. Generated summaries use active locale at save time

When the system **generates** a summary line for the user to append (e.g. structured home medication line at triage save), build that string in the **current UI locale** only at creation time. Once saved, treat it as chart content (rule 4).

### 6. No cross-language i18n fallback

`I18nProvider.t()` and `i18nMessage()`:

- Resolve keys against the **active locale root only**.
- **Missing keys return the dotted key path** — never fall back to the other language catalog.
- Do not merge FR into EN or EN into FR at runtime.

### 7. Error messages require explicit locale

`normalizeUserFacingError(message, locale)` **requires** an explicit `SupportedLanguage`. UI code must pass `useI18n().language`. Non-UI modules without locale context must pass an explicit locale constant — do not rely on a French default parameter.

## What must always be localized

| Category | Examples |
|----------|----------|
| UI chrome | Save, Cancel, Search, table headers |
| Workflow labels | Order status, MAR action labels |
| Catalog metadata labels | oral / orale, tablet / comprimé, Antidiabetic / Antidiabétique |
| User-facing API errors | Mapped via `normalizeUserFacingError` + i18n fallbacks |
| Generated summary templates | Home-med structured line at save |

## What must never be auto-translated

| Category | Examples |
|----------|----------|
| Saved clinical notes | HPI, exam, MDM, nursing narrative |
| Persisted chart summaries | `medicationsSummary` lines already saved |
| MAR notes already recorded | Including injection site lines in notes |
| Medication proper names | Metformin, Jardiance (display as catalog/clinician entered) |
| Ingredient / generic names | empagliflozin |
| Patient-entered free text | Allergy narrative, manual labels |
| Legal / export content | Signed chart PDFs, ROI disclosures |

## Future PR checklist

Before merging UI work:

1. No new hardcoded UI strings in components (use `t()`).
2. No raw catalog route/form/class in display code (normalize or use Phase 19U.2 utilities).
3. New i18n keys added to **both** `en.ts` and `fr.ts` with matching paths.
4. English strings in `en.ts` must not contain forbidden French UI tokens (see `i18nLanguageBoundary.test.ts`).
5. `normalizeUserFacingError` callers pass explicit locale in UI paths.
6. Do not auto-translate persisted clinical content.

## Phased remediation (19U)

| Phase | Focus |
|-------|--------|
| **19U.1** | Guardrails, tests, doc, high-risk EN catalog cleanup |
| **19U.2** | Centralized catalog display normalization |
| **19U.3** | Medication / home / allergy / MAR locale cleanup |
| **19U.4** | Forbidden-token regression across catalog / order / MAR |
| **19U.5** | App-wide hardcoded string cleanup |
| **19U.6** | Final language separation audit |

## Tests

Automated guards live in:

- `apps/web/src/i18n/messages/i18nLanguageBoundary.test.ts`

Run with `pnpm --filter @medora/web test`.
