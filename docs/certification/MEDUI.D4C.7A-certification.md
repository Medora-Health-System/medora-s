# MEDUI.D4C.7A — Certification

## Verdict

**CERTIFIED**

All fixable ambulatory MDM localization and duplicate discharge presentation gates pass. No migration. No ClinicMDM / ClinicDischarge forks. U.S. ED high-value catalog and ED/Hospital clinical-rationale fields unchanged when `encounterMode` is not `AMBULATORY`. Signed notes are never translated in place.

## Certification id

`MEDUI.D4C.7A`

## Final report (27 sections)

### 1. Git verification
Branch `d4c7a-ambulatory-mdm-localization-discharge-cleanup`; clean at start; `origin/main` fetched; HEAD contained latest main including D4C.7 / D4C.5B.3 / D4C.5B.2. No commit/push/merge.

### 2. Phase check
Phase 1 Clinic MVP — in scope. French UI via i18n.

### 3. STOP gates
Pass: no unrelated dirty tree at start; no ClinicMDM; no second discharge persistence model; no global U.S. ED narrative rewrite; no in-place signed translation.

### 4. Screenshot defect A
Justification clinique + Actions immédiates removed from ambulatory presentation via care-setting filter (not collapse/placeholder).

### 5. Screenshot defect B
French ambulatory MDM catalog inserts French narrative; ED English catalog retained for ED mode.

### 6. Screenshot defect C
Obsolete flat PatientDischargeInstructionsClosureCard unmounted from ambulatory Suivi/sortie; D4C.7 diagnosis-driven section remains sole engine.

### 7. Purpose
French-authored ambulatory Clinic MDM + single discharge engine; ED/Hospital unchanged.

### 8. Language authority
Authored-document / app locale drives MDM inserts; Facility.country = jurisdiction only.

### 9. MDM path audit
Registry → labels → ambulatory fragment keys → preview/summary → save (omit empty hidden) → sign → print/Summary reuse.

### 10. French ambulatory catalog
`providerDocumentationMdmHighValueAmbulatory` FR/EN: MDM standard, patient concern, ECG, diagnostic studies, smoking cessation, PMP — no ED boilerplate.

### 11. Template apply parity
Ambulatory options remap fragment keys + insert targets; preview/summary use field text (same language as insert).

### 12. Legacy English refresh
Explicit Appliquer le français / Actualiser; preserves free text; signed immutable.

### 13. Right-side summary
Follows authored field text; no independent English catalog regenerate.

### 14. Duplicate discharge
Presentation-only removal of flat card; historical JSON preserved; one save/print path.

### 15. Non-regression
Clinic D4C.7 facility wording / FR discharge; ED Med Eval fields present; Hospital untouched.

### 16. i18n
Mirrored `clinicCareD4c7a.*` + ambulatory MDM catalog EN/FR; FR chrome labels already French.

### 17. Tests A–H
Shared 8 + web 8 D4C.7A; regressions D4C.7 / D4C.5B.2 / MDM dropdown included in focused run.

### 18. Migration
None. No ClinicMDM table. No silent seed change.

### 19. Validation
shared/api/web build OK; web `tsc --noEmit` OK; `prisma validate` OK; `git diff --check` OK.

### 20. Docs
Audit + clinical + certification under `docs/clinical/` and `docs/certification/`.

### 21. Enterprise domain audit
See table below — all Duplicate Prevented ✔.

### 22. Architecture
Reuse ProviderDocumentationWorkspace + D4C.7 ProviderDischargeDocumentationSection.

### 23. ED unchanged
ED `encounterMode` keeps clinical rationale / immediate actions and ED high-value fragment keys.

### 24. Hospital / Observation unchanged
No presentation filter for non-AMBULATORY modes.

### 25. Signed immutability
Apply French gated on `!signedOrFinalized`; addendum remains canonical path for signed amendments.

### 26. Persistence
Empty hidden ambulatory MDM fields omitted from stored documentation blob; historical discharge flat fields not wiped.

### 27. Recommended next (not blockers)
Optional future: French ED high-value clinical catalog (separate from ambulatory). Historical flat discharge UI remains available in ED only.

## Tests

| Suite | Counts |
|-------|--------|
| Shared D4C.7A A–H | **8 passed** |
| Web D4C.7A source guards A–H | **8 passed** |
| Shared D4C.7 regression | **13 passed** |
| Shared D4C.5B.2 regression | **12 passed** |
| Web D4C.7 regression | **8 passed** |
| Web D4C.5B.2 regression | **12 passed** |
| Web MDM template dropdown | **23 passed** |
| **Total focused validation** | **84 passed** |

Validation: `@medora/shared` build OK · `@medora/api` build OK · `@medora/web` build OK · web `tsc --noEmit` OK · `prisma validate` OK · `git diff --check` OK · migration none.

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Provider documentation / MDM | ProviderDocumentationWorkspace | ✔ | Ambulatory presentation filter + ambulatory MDM catalog | ✔ (no ClinicMDM) |
| MDM high-value templates | providerDocumentationMdmTemplateCatalog | ✔ | Care-setting fragment/field remap | ✔ |
| Discharge instructions | ProviderDischargeDocumentationSection (D4C.7) | ✔ | Single ambulatory mount | ✔ |
| Flat patient instructions card | PatientDischargeInstructionsClosureCard | ✔ (ED only) | Removed from ambulatory compose | ✔ |
| Print | DischargePrintLayout | ✔ | — | ✔ |
| Summary | EmergencyVisitSummaryPanel | ✔ | — | ✔ |
| Authored locale | App / authored-document locale | ✔ | Explicit Apply French / Refresh | ✔ |
| Jurisdiction | Facility.country | ✔ | Not used as language authority | ✔ |

## Phase

Phase 1 Clinic MVP — French UI via mirrored `en.ts` / `fr.ts` (`clinicCareD4c7a.*`, `providerDocumentationMdmHighValueAmbulatory.*`).

## Documented deferrals

None required for certification. Optional future work (not blockers):

| Item | Note |
|------|------|
| Full French ED high-value MDM catalog | ED FR UI still uses English clinical fragments in `providerDocumentationMdmHighValue` (pre-existing). Ambulatory uses separate French ambulatory catalog. |
| Historical flat discharge JSON UI | Data preserved; ambulatory presentation removed only. |
