# P3-F production cutover runbook

**Do not execute production writes from this document until an operator explicitly authorizes them.**
This file is the ordered cutover procedure. It is not a license to import.

DX is complete only when production certifies:

- EN = selectable / selectable exact ICD-10-CM labels
- FR = selectable / selectable exact ICD-10-CM labels
- ES = selectable / selectable exact ICD-10-CM labels

Expected selectable count is **release-specific**. Derive it from the selected release manifest (`resolveIcd10CmReleaseManifest(release).expectedBillableRows`) and compare against that catalog. FY2026 is **74,719** today; FY2027 (and later) will differ. The operator must pass `--release=` explicitly. Do not silently import FY2026 because it was the development target.

Required safety zeros:

- CROSS_LANGUAGE_FALLBACK = 0
- CATEGORY_SUBSTITUTIONS = 0
- ALIAS_USED_AS_DISPLAY = 0
- CONSUMER_USED_AS_CLINICIAN = 0
- DUPLICATE_EFFECTIVE_CLINICIAN_LABELS = 0

## STOP conditions (abort; do not continue)

Abort immediately on any of:

- **Wrong environment** — host is localhost, CI, Railway staging, or not the named production host.
- **Unknown / ambiguous DB target** — `DATABASE_URL` host/name not verified. Do not print or commit secrets; confirm host + database name only.
- **Migration mismatch** — `pnpm --filter @medora/api exec prisma migrate status` is not fully applied. P3-F adds **no** migration; do not run production migrations from this runbook.
- **Missing backup/snapshot** — no restorable snapshot taken immediately before writes.
- **Source licensing approval absent** — no written approval that the FR/ES artifact is a licensed U.S. ICD-10-CM clinician terminology (not WHO CIM / CIE / ICD-10-CA / ICD-10-AM / machine translation).
- **Artifact missing** — FR or ES file not present at the operator path.
- **Checksum mismatch** — official catalog ZIP SHA-256 ≠ selected-release manifest `artifactSha256`, or licensed `ARTIFACT_SHA256` ≠ the independently recorded operator checksum.
- **Wrong release** — `--release` omitted, inferred, or not the intended annual release (FY2026 vs FY2027+).
- **Unexpected dry-run rejection** — `REJECTED_*` > 0 unless each reject is understood and `--allow-rejects` is explicitly approved.
- **Unknown codes** — `REJECTED_UNKNOWN_CODE` > 0 on a file claimed to be complete for the target release.
- **Category/header contamination** — `REJECTED_NONSELECTABLE` ignored, or headers ingested as clinician labels.
- **Duplicate effective winner** — `DUPLICATE_EFFECTIVE_CLINICIAN_LABELS` ≠ 0.
- **Safety certifier failure** — `icd:certify-multilingual:safety --release=<selected>` exit ≠ 0.
- **Coverage certifier failure / incomplete FR/ES** — coverage exit 2 is the honest result until EN=FR=ES=expected/expected. Do not weaken gates. Incomplete coverage is **not** DX complete.
- **API smoke failure** — search/list/chart-summary locale presentation fails, or canonical `Diagnosis.code` changes with locale.
- **Production UI smoke failure** — `ICD10_P3F_SMOKE_*` matrix fails.
- **Billing regression** — 837P / 837I / claim export / diagnosis pointers emit localized labels instead of canonical ICD-10-CM codes.
- **Signed/history regression** — frozen ED/inpatient snapshots or chart export text rewritten.

There is **no** complete in-repo FR/ES source. If `SOURCE_FR_FULL` / `SOURCE_ES_FULL` remain `NOT_AVAILABLE`, stop after catalog + governed seed. Do not invent labels.

Importer writes are **chunked and resumable** (default `--chunk-size=500`). `IMPORT_STATUS=PARTIAL` + `FAILED_CHUNK` means repair+resume, not a false 74,719 claim. Coverage certifier must keep failing until complete.

## Required order

1. **Verify deployment version** includes merged PR #219 and the P3-F commit that adds `icd:import-licensed-terminology`.
2. **Identify production DB target** (`DATABASE_URL` host/name). Refuse localhost / CI / Railway staging.
3. **Verify migration status:** `pnpm --filter @medora/api exec prisma migrate status` — terminology foundation must already be applied. P3-F adds **no** migration.
4. **Take production backup / snapshot.** Record restore command. Do not proceed without it.
5. **Validate official FY2026 artifact checksum** against `apps/api/prisma/icd/icd10-cm-release-manifest.ts`.
6. **Dry-run official ICD import:**
   `pnpm --filter @medora/api icd:dry-run -- --file /secure/path/icd10cm-Code-Descriptions-2026.zip --release 2026`
7. **Import official FY2026 catalog** (only after dry-run matches manifest).
8. **Verify persisted counts:** 98,186 rows, 74,719 selectable, 23,467 category/nonbillable.
9. **Dry-run FR source** (operator local path; never git):
   `pnpm --filter @medora/api run icd:import-licensed-terminology -- --file=/secure/path/fr.jsonl --release=FY2026 --dry-run`
10. **Dry-run ES source** (same importer, ES artifact).
11. **Ingest FR** (remove `--dry-run` only after dry-run `VALID_EXACT` is accepted).
12. **Ingest ES**.
13. **Recompute effective terminology** (importer already calls `recomputeIcd10EffectiveClinicianLabels`; re-run only if a manual repair was needed).
14. **Run safety certifier:**
    `pnpm --filter @medora/api run icd:certify-multilingual:safety -- --release=FY2026`
    Required: exit 0, fallback/category/alias/consumer/duplicate = 0.
15. **Run coverage certifier:**
    `pnpm --filter @medora/api run icd:certify-multilingual:coverage -- --release=FY2026`
    Required for DX complete: EN=FR=ES=74,719/74,719, exit 0. Incomplete licensed coverage must remain exit 2.
16. **Verify 74,719/74,719 per locale** from certifier `EN_EXACT` / `FR_EXACT` / `ES_EXACT` and `EXPECTED_BILLABLE_ROWS`.
17. **API smoke** — search + list + chart-summary presentation for EN/FR/ES. Canonical `Diagnosis.code` unchanged across locale switch.
18. **Production web smoke** — execute `ICD10_P3F_SMOKE_SEARCH_TERMS` and `ICD10_P3F_SMOKE_CODES` in EN/FR/ES (`packages/shared/src/icd10/icd10P3fProductionSmokeMatrix.ts`).
19. **Billing identity verification** — 837P/837I/claim export/diagnosis pointers still use canonical ICD-10-CM codes (`Diagnosis.code` / `buildOrderedDiagnosisCodesForClaimExport`), never FR/ES display labels.
20. **Signed/history regression** — frozen snapshots keep stored historical text; live presentation may resolve the active locale via `sourceKind` / terminology rows. No retranslation of signed artifacts.
21. **Do not weaken certifier gates.** Incomplete FR/ES must remain coverage exit 2.

Licensed ingest notes:

- `--release=` is **required**. Example uses FY2026 only while that is the selected production catalog.
- Compare `VALID_EXACT` / coverage against **that release’s** selectable count, not a forever 74,719.
- Record report fields: `ARTIFACT_SHA256`, `ARTIFACT_FILE_NAME` (basename only), `SOURCE_ID`, `TERMINOLOGY_VERSION`, `TARGET_RELEASE`, `LOCALES`, `IMPORT_STATUS`, `FAILED_CHUNK`.
- Do not persist the operator absolute file path on terminology rows.
- Partial import: `IMPORT_STATUS=PARTIAL`. Retry the **same** artifact; completed source identities are UNCHANGED. Do not duplicate.

## Rollback vs repair+resume

Do **not** recommend a destructive DB reset. Distinguish:

### ROLLBACK (restore snapshot from step 4)

Use when clinical identity, billing identity, or signed history may be wrong, or the catalog itself is corrupted.

- **A. Official catalog import failure** — restore snapshot. Re-validate ZIP checksum + `--release`. Dry-run again. Do not import a different year silently.
- **D. Certification failure that indicates duplicate effective winners, alias-as-display, category substitution, or canonical code mutation** — restore snapshot. Do not delete terminology rows ad hoc.
- **E. Deployment / UI smoke failure after a release was already certified in DB** — roll back the **application** deploy first. Restore DB snapshot only if smoke proves persisted clinical/billing/history corruption.

### REPAIR + RESUME (do not restore unless rollback criteria above apply)

Licensed terminology rows are keyed by source identity. Completed chunk transactions remain. Retry is idempotent.

- **B. Partial licensed terminology import** (`IMPORT_STATUS=PARTIAL`, `FAILED_CHUNK=N`) — leave committed chunks. Fix the operational cause (timeout, connectivity). Re-run the **same** artifact with the same `--release` / `sourceId` / `terminologyVersion`. Planner marks completed identities UNCHANGED and inserts the remainder. Then certify. Coverage must stay incomplete until FR/ES exact counts match the selected release.
- **C. Effective recompute failure** (`FAILED_PHASE=RECOMPUTE`) — rows may exist with `isEffective=false`. Do not insert duplicates. Re-run the same artifact (UNCHANGED path) so the importer recomputes unique identities again. Then run safety + coverage certifiers.

Never “finish” DX by seeding placeholders, promoting aliases, inheriting category labels, or translating English.

## Licensed artifact contract (operator file; not in git)

CSV or JSONL. Per record:

- `code` (ICD-10-CM)
- `locale` (`fr` or `es` only on this path)
- `label` (exact clinician wording from the licensed source — not a translation performed by Medora)
- `sourceId`
- `terminologyVersion`
- `provenance` (`LICENSED_VENDOR` or localized `OFFICIAL_SOURCE`)
- `status` (default `APPROVED`)
- `sourcePriority` (optional; default 50 for vendor)
- `labelRegister` must be `CLINICIAN_PREFERRED` (consumer/alias registers are rejected)

Artifact-level `codeSystem` / `releaseVersion` may be omitted when `--release` is passed and every row is that release.

Do **not** commit license keys, vendor dumps, or full FR/ES dictionaries.

## P3-F.8-ES FY2027 Spanish production ingest (operator-only)

Spanish FY2027 terminology is **not** imported on Railway start, seed, or migrate. Prisma seed loads `FY2026-MEDORA-DEV-SAMPLE` only. Production catalog + terminology require explicit operator commands. This pull request does **not** write production.

Do **not** execute these writes from Cursor unless the operator has verified the production `DATABASE_URL` host/name (print host + database name only — never credentials), snapshot, and licensing.

Never delete historical terminology rows. FY2026 catalog and FY2026 Spanish remain. FY2027 Spanish is additive for `releaseVersion=FY2027` only.

Expected after a complete authorized ingest:

| Release | EN exact | ES exact | ES code-only |
|---|---|---|---|
| FY2026 | 74,719 / 74,719 | 74,719 / 74,719 | 0 |
| FY2027 | 74,879 / 74,879 | 74,879 / 74,879 | 0 |

### 0. Pre-ingest production presence (mandatory — abort if any is missing)

Terminology rows must never float without the matching canonical catalog. Query counts only (no secrets):

```
PRODUCTION_FY2026_CATALOG_PRESENT  — ICD-10-CM FY2026 selectable/billable = 74,719
PRODUCTION_FY2027_CATALOG_PRESENT  — ICD-10-CM FY2027 selectable/billable = 74,879
PRODUCTION_ES_FY2026_PRESENT       — FY2026 ES exact clinician labels = 74,719 (code-only = 0)
PRODUCTION_ES_FY2027_PRESENT       — FY2027 ES exact clinician labels (expect 0 before this ingest; 74,879 after)
```

```
pnpm --filter @medora/api run icd:certify-multilingual:coverage -- --release=FY2026
pnpm --filter @medora/api run icd:certify-multilingual:coverage -- --release=FY2027
```

If `PRODUCTION_FY2027_CATALOG_PRESENT` is false (FY2027 selectable ≠ 74,879), **STOP**. Import the official FY2027 catalog first (`icd:dry-run` then `icd:import --release 2027` after ZIP SHA-256 matches `ICD10_CM_FY2027_MANIFEST.artifactSha256`). Do not ingest Spanish terminology for a missing canonical release.

If `PRODUCTION_ES_FY2026_PRESENT` is false, **STOP**. Complete FY2026 Spanish (P3-F.7) before FY2027 Spanish. Do not carry-forward from an incomplete FY2026 set.

If `PRODUCTION_ES_FY2027_PRESENT` is already 74,879 / 74,879, this ingest is a no-op candidate: dry-run must show `ROWS_REJECTED=0` and inserts = 0 (UNCHANGED). Do not delete and reload.

### 1. Required source artifacts (operator local paths — never git)

| Artifact | How obtained | Expected SHA-256 |
|---|---|---|
| CIE-10-ES 2026 workbook | Ministry `Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx` | `3695159d8f9a5a77e7ecdcee29657debbee4ed74b470a6d6143e99c80a5782fc` (`ICD10_CIE10ES_ARTIFACT_SHA256`) |
| Official FY2026 ICD-10-CM ZIP | CDC FTP `icd10cm-Code-Descriptions-2026.zip` (`ICD10_CM_FY2026_MANIFEST.sourceUrl`) | `a852eb91b3344ae38476e63816976ee1eeb94dcced7151118324f060e8499f88` |
| Inner FY2026 order file | Unzip the FY2026 ZIP → `icd10cm-order-2026.txt` | `6dc95c9c7e96c734806e1682f4bf9df76251d60e99199bba0d375ba3dd11026b` |
| Official FY2027 ICD-10-CM ZIP | CDC FTP `icd10cm-code-descriptions-2027.zip` (`ICD10_CM_FY2027_MANIFEST.sourceUrl`) | `93e3ad6004badf470c55bfe679b748ae88fd9b2b421851e409eec382c7713b9a` |
| Inner FY2027 order file | Unzip the FY2027 ZIP → `icd10cm-code-descriptions-2027/icd10cm-order-2027.txt` | `38981fb2c1226e2b92393cef7d921d2293494dd184b5ad039dde08e4b364265f` |

Do **not** commit the XLSX, CDC ZIP, order files, or the generated 74,879-row JSONL.

### 2. Required SHA-256 checks (before build)

```
shasum -a 256 /secure/path/Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx
shasum -a 256 /secure/path/icd10cm-Code-Descriptions-2026.zip
shasum -a 256 /secure/path/icd10cm-order-2026.txt
shasum -a 256 /secure/path/icd10cm-code-descriptions-2027.zip
shasum -a 256 /secure/path/icd10cm-order-2027.txt
```

Abort on any mismatch. The emit CLI also re-checks the XLSX and both order files and refuses approval on mismatch.

### 3. Exact artifact-build command

Build on a trusted workstation from **repository code + the five source checksums above**. This path does **not** read database terminology rows and does **not** use `/tmp` leftovers, the P3-F.7 worktree, or hand-edited JSONL.

```
pnpm --filter @medora/shared build
pnpm --filter @medora/api run icd:fy2027-es-terminology -- \
  --release=FY2027 \
  --emit-from-sources \
  --cie10es=/secure/path/Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx \
  --fy2026-us=/secure/path/icd10cm-order-2026.txt \
  --fy2027-us=/secure/path/icd10cm-order-2027.txt \
  --combined-out=/secure/path/medora-p3f8-es-fy2027-combined.jsonl \
  --certify-semantics \
  --approve-semantically-certified
```

Composition (must match CLI output):

- `SOURCE_EXACT_ROWS=74118` (CIE-10-ES official, unchanged concepts)
- `GOVERNED_CARRY_FORWARD_ROWS=567` (81 P2 `MEDORA_DX_GOVERNED` + 486 P3-F.7 gap)
- `GOVERNED_NEW_CHANGED_ROWS=194` (190 new + 4 description-changed)
- `TOTAL_ARTIFACT_ROWS=74879`
- `DUPLICATE_CODES=0`
- `SEMANTIC_PASS=194` `SEMANTIC_REVIEW_REQUIRED=0` `SEMANTIC_FAIL=0`

### 4. Expected generated artifact SHA-256

`ICD10_FY2027_ES_COMBINED_ARTIFACT_SHA256` =

`9445fd10dba09f3d234c136ddfa05b002f4d9f00e41036b6ec5b49be0a7a4ecc`

The CLI prints `ARTIFACT_SHA256` and `ARTIFACT_SHA_MATCH`. **STOP** if `ARTIFACT_SHA_MATCH=NO` or `TOTAL_ARTIFACT_ROWS≠74879`.

Independent check:

```
shasum -a 256 /secure/path/medora-p3f8-es-fy2027-combined.jsonl
```

This SHA is the order-file sequence (carry-forward in FY2027 order-file order, then 194 governed). It is the production-reproducible digest. A localhost Prisma `findMany` dump of the same 74,879 records can differ in **row order only**.

### 5. Expected rows

`TOTAL_ARTIFACT_ROWS` must be **74879**. `74118 + 567 + 194 = 74879`.

### 6. Production dry-run (zero writes)

```
pnpm --filter @medora/api run icd:import-licensed-terminology -- \
  --file=/secure/path/medora-p3f8-es-fy2027-combined.jsonl \
  --release=FY2027 \
  --dry-run \
  --allow-mixed-source-ids
```

`--allow-mixed-source-ids` is required: the file mixes CIE-10-ES, P2 governed, P3-F.7 gap carry-forward, and P3-F.8 governed `sourceId` / `terminologyVersion` values. `--release=FY2027` is required. Never pass `--release=FY2026`.

### 7. Rejection gate

Abort if any of:

- `ROWS_REJECTED > 0`
- `REJECTED_UNKNOWN_CODE > 0`
- checksum of `--file` ≠ `9445fd10…`
- `--release` is missing or not `FY2027`

Do not `--allow-rejects`. Do not continue to apply.

### 8. Actual ingest (same artifact, same SHA, FY2027 only)

After dry-run is clean and snapshot exists:

```
pnpm --filter @medora/api run icd:import-licensed-terminology -- \
  --file=/secure/path/medora-p3f8-es-fy2027-combined.jsonl \
  --release=FY2027 \
  --allow-mixed-source-ids
```

Importer is chunked/resumable. Do not delete FY2026 (or any historical) terminology to “make room”.

### 9. Post-ingest certification

```
pnpm --filter @medora/api run icd:certify-multilingual:safety -- --release=FY2026
pnpm --filter @medora/api run icd:certify-multilingual:coverage -- --release=FY2026
pnpm --filter @medora/api run icd:certify-multilingual:safety -- --release=FY2027
pnpm --filter @medora/api run icd:certify-multilingual:coverage -- --release=FY2027
pnpm --filter @medora/api run icd:certify-spanish-fy2027-gap -- --release=FY2027
```

Required: safety zeros; FY2026 ES 74,719/74,719; FY2027 ES 74,879/74,879; ES code-only = 0 both releases. French coverage may remain incomplete — do not weaken that gate.

### 10. FY2026 preservation check

After FY2027 ingest, FY2026 must still certify:

- EN = 74,719 / 74,719
- ES = 74,719 / 74,719
- ES code-only = 0
- no FY2026 terminology row mutated (`terminologyVersion` / labels / provenance unchanged)

### 11. FY2027 release-specific verification

- EN = 74,879 / 74,879
- ES = 74,879 / 74,879
- ES code-only = 0
- date of service 2026-09-30 → FY2026; 2026-10-01+ → FY2027
- search must not use `DISTINCT ON ("code")` across releases
- canonical `Diagnosis.code` / billing identity / signed history unchanged

### 12. No deletion of historical terminology

Do not `DELETE` / truncate `Icd10DiagnosisTerminology` or `Icd10DiagnosisCode` for FY2026 (or any prior release) as part of this cutover. Rollback is restore-snapshot, not row deletion.

French coverage may remain incomplete. Spanish **implementation** is complete in this branch; Spanish **production** is complete only after this operator ingest + production browser smoke. `DX_COMPLETE` remains **NO** until French is complete.
