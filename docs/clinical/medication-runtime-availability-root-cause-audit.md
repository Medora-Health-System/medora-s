# Medication Runtime Availability — Root-Cause Audit

**Certification ID (prior, invalidated for production):** `MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION`
**New certification target:** `MEDUI.MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_COMPLETION`
**Audit date:** 2026-07-19
**Facility shown in failing UI:** Wayne Urgent Care Emergency Room

> Prior “100% / 5301 families CERTIFIED” artifacts are **not** evidence of production provider experience until this discrepancy is closed.

---

## Executive answer

**Why did certification say medications were complete while real provider search failed?**

Because certification APPLY + measurement ran against the **local** Postgres database (`localhost:5432/medora`), while the Medora provider UI for Wayne Urgent Care uses the **Railway production** Postgres database (`switchyard.proxy.rlwy.net` / database `railway`).

Production is missing the completed catalog content. The UI failures are an exact match to production database state, not a search-ranking mystery on a complete catalog.

---

## 1. Discrepancy (measured)

| Probe | Local certification DB | Railway production DB (Wayne facility) |
|-------|------------------------|----------------------------------------|
| Host | `localhost` | `switchyard.proxy.rlwy.net` (public proxy) |
| Database | `medora` | `railway` |
| Active `CatalogMedication` | **10,739** | **553** |
| Alias rows | **42,385** | **2,347** |
| Distinct active generics | **~5,246** | **303** |
| Biktarvy / bictegravir-emtricitabine-TAF rows | present | **0** |
| Empagliflozin 10 mg | present | **1** |
| Empagliflozin 25 mg | present | **0** |
| Aliases containing `bikt` | present | **0** |
| `jard` / `jardiance` aliases | present | **2** (10 mg only path) |
| Wayne Urgent Care facility | **absent** | **present** |

### Real provider search (`MedicationCatalogService.search`, purpose=`order`, limit=40)

Against **production** DB, facility **Wayne Urgent Care Emergency Room**:

| Query | Results | Strengths |
|-------|--------:|-----------|
| `jard` | 1 | 10 mg only |
| `Jardiance` | 1 | 10 mg only |
| `Biktar` | 0 | — |
| `Biktarvy` | 0 | — |
| `bikt` | 0 | — |
| `Empagliflozin` | 1 | 10 mg only |

This matches the reported UI exactly.

Against **local** DB, the same hard-acceptance families pass via the real `MedicationCatalogService` provider-availability validator (hard acceptance PASS; corpus ~98.6%).

---

## 2. Git / deployment state

| Item | Evidence |
|------|----------|
| Branch | `main` |
| `origin/main..HEAD` | empty (completion commits **pushed**) |
| HEAD / origin tip | `4073e28fa` (universal orderability docs) |
| Local web `API_URL` | `http://localhost:3001` |
| Local API `DATABASE_URL` | `localhost:5432/medora` |
| Production API | `https://api.medoras.com` (Railway service `medora-s`, Online) |
| Production Postgres | Railway `Postgres` service, schema up to date (165 migrations) |
| Medication APPLY auto-run on deploy | **No** — importers are explicit CLI commands |

A Git push deploys **code**, not catalog rows. Catalog content requires an explicit database APPLY against the target `DATABASE_URL`.

---

## 3. Import / APPLY audit (programs)

| Program | Commit stack | Mode used for “certification” | Database mutated | Runtime-visible on production UI? |
|---------|--------------|-------------------------------|------------------|-----------------------------------|
| Wave 2 catalog | on `origin/main` | APPLY (historical local) | local `medora` | **No** |
| Wave 3 | on `origin/main` | APPLY (historical local) | local `medora` | **No** |
| Wave 4 | on `origin/main` | APPLY (historical local) | local `medora` | **No** |
| Orderable Catalog Completion | on `origin/main` | APPLY (historical local) | local `medora` | **No** |
| Formulation & Strength Completion | on `origin/main` | APPLY (historical local) | local `medora` | **No** |
| Universal Common Medication Orderability | on `origin/main` | APPLY (historical local) | local `medora` | **No** |

**Proof:** Production baseline before any remediating APPLY was 553 active catalog rows / 0 Biktarvy / no Empagliflozin 25 mg. Local certification DB retained the completed corpus.

Production DRY_RUN (Wave 3, 2026-07-19): would create ~**1,887** `CatalogMedication` rows from approved curated candidates (including Bictegravir/Emtricitabine/TAF family) against the production baseline of 732 total / 395 distinct generics.

---

## 4. Provider search path (actual)

```
CreateOrderModal ("Search and add")
  → SharedCatalogAutocomplete (MEDICATION limit=40)
    → GET /api/backend/catalog/medications/search
      → OrderCatalogController.searchMedications
        → MedicationCatalogService.search
          → CatalogMedication + MedicationAlias (+ optional MedicationSearchAlias)
          → filterProviderSearchCatalogIds (activation/formulary gate)
```

### Validator discrepancy (why 5,301 @ 100% was misleading)

| Validator | Path | Trust for production UI? |
|-----------|------|--------------------------|
| Universal common-orderability VALIDATE | **In-memory snapshot** (`searchProviderSnapshot`); hardcodes `formularyOnFormulary: false` | **No** — bypasses Nest HTTP + can diverge from facility formulary |
| Formulation provider-availability | Real `MedicationCatalogService.search` | **Yes for search path**, but still ran against **local** DB |
| Prior CERTIFIED decision | Combined local DB + universal snapshot metrics | **Invalid for production** |

The universal benchmark is a useful clinical corpus definition, but its VALIDATE path is **not** the production Nest endpoint and was never executed against Railway Postgres.

---

## 5. Facility / formulary

- Production facility **Wayne Urgent Care Emergency Room** exists and is active.
- Hard probes used that facility id with `purpose: "order"`.
- Failures are explained by **missing catalog rows / aliases** in production, not by a Wayne-only formulary hide of otherwise-present Biktarvy/25 mg rows (those rows are absent globally in production).

---

## 6. Answers to required questions

1. **Why 100% vs UI fail?** Local-DB certification + snapshot validator vs production DB content gap.
2. **Certification database?** Local `localhost:5432/medora`.
3. **UI database?** Railway production Postgres (`railway` via public proxy host `switchyard.proxy.rlwy.net`).
4. **Were completion imports applied to runtime DB?** **No.**
5. **Missing / inactive / hidden / filtered?** **Completely absent** (Biktarvy; Empagliflozin 25 mg). Jardiance 10 mg present → AVAILABLE_PARTIAL.
6. **Web/API deployment current?** Code commits are on `origin/main`; Railway API is online. Git SHA env vars were unset in the checked runtime; content gap dominates UI failure regardless.
7. **Aliases persisted (production)?** Not for Biktarvy (`bikt*` alias count = 0).
8. **Strengths in active CatalogMedication?** Empagliflozin 25 mg **not** in production.
9. **Facility formulary hiding?** Not the primary cause for these probes (rows absent).
10. **Did validator reproduce actual provider path?** Formulation validator uses real service; universal did **not**. Neither used production DB.
11–13. **True production availability (pre-remediation):** ~303 distinct active generics / 553 active rows — far below local certification corpus; Biktarvy COMPLETELY_ABSENT; Jardiance AVAILABLE_PARTIAL.
14. **Required work:** Explicit production `DATABASE_URL` APPLY of approved Wave/formulation/universal importers; re-probe Wayne facility via `MedicationCatalogService.search`; new runtime certification only after production evidence.

---

## 7. Safety constraints for remediation

- No fabricated RxCUI/NDC/strength/form/route
- No patient order / MAR / chart / CDS mutations
- Prefer idempotent APPLY from approved curated manifests already in-repo
- Separate **code deploy** from **database APPLY**

---

## 8. Remediation performed (production DB APPLY)

Executed against Railway production Postgres via `DATABASE_PUBLIC_URL` (host `switchyard.proxy.rlwy.net`, database `railway`):

| Step | Result |
|------|--------|
| Wave 2 catalog APPLY | +1833 catalog rows; baseline 732 → 2565 |
| Wave 3 APPLY | +1097 catalog rows; baseline 2565 → 4449 |
| Formulation APPLY | +46 variants; hardAcceptancePass **true** on production path |
| Universal APPLY | Connection drop mid-run (P1017); retry recommended |

### After hard-acceptance probe (Wayne Urgent Care, real `MedicationCatalogService.search`)

| Query | Before | After |
|-------|--------|-------|
| `jard` | 1 result (10 mg only) | 10 mg **and** 25 mg present |
| `Jardiance` | 10 mg only | 10 mg **and** 25 mg |
| `Biktar` / `Biktarvy` / `bikt` | 0 results | Bictegravir/Emtricitabine/TAF 50/200/25 mg |

### After representative clinical gap inventory (40 families, production, Wayne)

- searchPassRate: **1.0**
- orderabilityPassRate: **1.0**
- COMPLETELY_ABSENT: **0**
- AVAILABLE_COMPLETE: **40**
- catalogActive: **4316**
- aliasCount: **26070**

---

## 9. Operator commands (do not guess DATABASE_URL)

```bash
# Production APPLY (redacted; uses Railway public DB URL)
railway run --service Postgres --environment production -- sh -c '
  export DATABASE_URL="$DATABASE_PUBLIC_URL"
  cd apps/api
  pnpm exec ts-node --transpile-only prisma/medications/wave2/run-medication-knowledge-expansion-wave2-catalog-cli.ts APPLY
  pnpm exec ts-node --transpile-only prisma/medications/wave3/run-medication-knowledge-expansion-wave3-cli.ts APPLY
  pnpm exec ts-node --transpile-only prisma/medications/formulation-completion/run-medication-formulation-strength-completion-cli.ts APPLY
  pnpm exec ts-node --transpile-only prisma/medications/universal-completion/run-medication-universal-common-orderability-cli.ts APPLY
'

# Production verification
railway run --service Postgres --environment production -- sh -c '
  export DATABASE_URL="$DATABASE_PUBLIC_URL"
  cd apps/api
  pnpm exec ts-node --transpile-only prisma/medications/runtime-remediation/probe-provider-search-hard-acceptance.ts
  pnpm exec ts-node --transpile-only prisma/medications/runtime-remediation/run-runtime-clinical-gap-inventory.ts
'
```

Refresh the provider UI after APPLY (no code deploy required for catalog rows if API already online).
