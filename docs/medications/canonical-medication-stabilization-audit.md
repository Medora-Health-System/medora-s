# Canonical Medication Stabilization Audit (M1.5H)

**Program:** Haiti Canonical Medication Architecture  
**Phase:** M1.5H — final stabilization audit (audit only)  
**Date:** 2026-06-02  
**Constraints:** No code, seeds, migrations, DB writes, search/activation/billing/MAR changes.

**Predecessors:** M1.5D (manifest) · M1.5E (linkage backfill) · M1.5F (provider search cutover audit) · M1.5G (activation pilot)

**Data sources:** Read-only local PostgreSQL (2026-06-02) · shared manifest dist · static `apps/api` review · M1.5F/G docs  
**Production Haiti clinic:** NOT VERIFIED

**Companion:** [canonical-medication-stabilization-readiness.md](./canonical-medication-stabilization-readiness.md) · [canonical-medication-stabilization-risk-register.md](./canonical-medication-stabilization-risk-register.md) · [enterprise-formulary-expansion-readiness.md](./enterprise-formulary-expansion-readiness.md)

---

## Executive summary

| Question | Answer |
|----------|--------|
| Is Haiti medication **architecture** (design + gates + phases M1.5D–G) complete? | **Yes** — manifest, quarantine, linkage, search audit, pilot activation, rollback are implemented and tested in CI |
| Is Haiti medication **runtime data** stabilized on audited DB? | **No** — M1.5E backfill not applied; **64** acetaminophen baseline products linked to clinical catalogs; **73** active `19G1-ACET-*` catalog rows pollute provider search |
| **Final decision** | **HAITI MEDICATION ARCHITECTURE NOT STABILIZED** (operational gate) |
| **SAFE / NOT SAFE** | **NOT SAFE** for enterprise formulary expansion or canonical search cutover |
| **M1.6A enterprise formulary expansion audit** | **NOT READY** |

---

## Part 1 — Final architecture inventory

### 1.1 Entity counts (local DB, read-only)

| Entity | Count | Notes |
|--------|------:|-------|
| `CatalogMedication` (active) | **320** | Includes **73** `19G1-ACET-*` noise rows + **247** Haiti-derived codes |
| `CatalogMedication` (total) | 320 | All active |
| `MedicationConcept` | **1,087** | **980** acetaminophen-named concepts (import noise) |
| `MedicationProduct` | **1,077** | **0** active; **1,077** inactive |
| `MedicationPackage` | **1,077** | 0 orphan packages |
| Products with `legacyCatalogMedicationId` | **64** | All match acetaminophen clone → catalog (wrong links) |
| Products with `HAITI_M15E_CANONICAL_LINKAGE_ONLY` | **0** | M1.5E backfill **not executed** on this DB |
| Products with `HAITI_M15G_PILOT_ACTIVATED` | **0** | Pilot not activated (expected pre-pilot) |
| Inactive quarantine-style canonical rows | **~1,013** | Acet/insulin/blocked-med concepts; inactive products |
| `MedicationSafetyProfile` | 833 | Sparse vs 1,087 concepts |
| `MedicationBillingProfile` | 458 | Package-level billing metadata |

### 1.2 Manifest / design inventory (M1.5D–G, no DB)

| Bucket | Count |
|--------|------:|
| Linkage manifest entries | **247** |
| `MISSING_CANONICAL_TARGET` | 192 |
| `MANUAL_REVIEW` | 55 |
| T1 tranche | 82 |
| M1.5G pilot eligible (auto) | **38** |
| M1.5G deferred manual review | **19** |
| M1.5G safety excluded | **25** |

### 1.3 Provider-search visible rows (estimate)

Provider order search uses **`CatalogMedication.isActive`** + `filterProviderSearchCatalogIds` (linked inactive products excluded unless M1.5E marker).

| Slice | Count | In provider index today? |
|-------|------:|--------------------------|
| Haiti formulary codes (active, non-19G) | **247** | **Yes** (subject to gate) |
| Active `19G1-ACET-*` catalog rows | **73** | **Yes** — **search pollution** |
| Canonical-only (no catalog) | 0 | **No** |
| M1.5G pilot-activated | 0 | N/A |

**Part 1 verdict:** **FAIL** — inventory architecture is documented and gated, but **local DB still carries baseline clone catalog pollution and wrong FK links**.

---

## Part 2 — Linkage integrity audit

| Check | Result | Evidence |
|-------|--------|----------|
| Broken concept/product/package chains | **PASS** | 0 orphan products/packages (SQL) |
| Duplicate `legacyCatalogMedicationId` | **PASS** | 0 catalogs with >1 product (SQL) |
| Broken legacy FK (missing catalog) | **PASS** | 0 broken FKs (SQL) |
| Catalog linked to quarantined acet/insulin products | **FAIL** | **64** products: acetaminophen concept → `legacyCatalogMedicationId` set |
| Haiti meds linked to `19G` baseline clones | **FAIL** | Same **64** links; catalog codes are Haiti but product codes are `19G1-ACET-*` |
| Acetaminophen/insulin clone activation | **PASS** | 0 active products; quarantine rules block M1.5E/G activation |
| M1.5E clean Haiti chains (192 expected) | **FAIL** | 0 M1.5E markers; only **64** partial/wrong links |

**Linkage integrity score (local DB):** **35/100**  
**Linkage integrity score (post–M1.5E design, if executed):** **78/100** (M1.5F estimate)

**Part 2 verdict:** **FAIL**

---

## Part 3 — Pilot activation audit (M1.5G)

| Check | Result |
|-------|--------|
| T1 candidates ≤ 82 | **PASS** — 82 |
| Auto-eligible rows = 38 | **PASS** |
| Manual review deferred = 19 | **PASS** |
| Safety excluded = 25 | **PASS** |
| No enterprise / bulk activation in code | **PASS** — scoped to `HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE` |
| Rollback helper exists | **PASS** — `rollbackHaitiCanonicalActivationPilot` |
| Pilot executed on local DB | **N/A** — 0 `HAITI_M15G_PILOT_ACTIVATED` rows |

**Part 3 verdict:** **PASS** (program design); **N/A** on local DB until M1.5E + staged pilot.

---

## Part 4 — Provider search stability audit

**Authority:** `MedicationCatalogService.search` → `CatalogMedication` IDs only; canonical enriches metadata; gate via `filterProviderSearchCatalogIds`.

### 4.1 Structural checks

| Check | Result |
|-------|--------|
| Legacy `CatalogMedication` remains search identity | **PASS** |
| No canonical-only provider rows | **PASS** |
| No second medication ID in search DTO | **PASS** |
| M1.5E linkage-only gate preserved in code | **PASS** |
| Clone catalog pollution | **FAIL** — **73** active `19G1-ACET-*` rows |

### 4.2 Query smoke (local DB, catalog `isActive` + text match)

| Query | Direct hits | Alias hits | Assessment |
|-------|------------:|-----------:|------------|
| acetaminophen | 8 | 5 | **FAIL** — includes `19G1-ACET-*` codes |
| paracetamol | 5 | 0 | **PASS** — Haiti PARACETAMOL SKUs |
| Tylenol | 2 | 2 | **PARTIAL** — mixes Haiti + legacy alias |
| ceftriaxone | 2 | 0 | **PASS** |
| Rocephin | 1 | 2 | **PASS** |
| ondansetron | 3 | 0 | **PASS** |
| Zofran | 3 | 3 | **PASS** |
| furosemide | 2 | 0 | **PASS** |
| Lasix | 1 | 2 | **PASS** |
| lorazepam | 2 | 0 | **PASS** |
| Ativan | 2 | 2 | **PASS** |
| hydromorphone | 1 | 0 | **PASS** |
| Dilaudid | 1 | 1 | **PASS** |

**Part 4 verdict:** **PARTIAL** — core Haiti ER/IV brands resolve; **acetaminophen path is polluted** by baseline clone catalog rows until remediation.

---

## Part 5 — Billing stability audit (M1.4A–D)

| Check | Result |
|-------|--------|
| No billing engine changes in M1.5D–H | **PASS** |
| `billingCodeDefault` on catalog preserved | **PASS** — no cutover altering catalog IDs |
| M1.4B manifest / `BillingCatalog` mappings | **PASS** — code unchanged; 458 package billing profiles |
| HCPCS / J-code resolution path | **PASS** — `resolveMedicationHcpcsForCatalogRow` + manifest |
| NDC manifest (M1.4B) | **PASS** — validation in M1.5G pilot |
| Charge capture / infusion metadata | **PASS** — no MAR/billing workflow edits in M1.5D–G |
| Pilot activation breaks billing | **N/A** — 0 pilot activations locally |

**Part 5 verdict:** **PASS** (architecture); billing **depends on catalog ID stability** — do not replace catalog keys during expansion.

---

## Part 6 — Governance stability audit (M1.3)

| Check | Result |
|-------|--------|
| Controlled / high-alert / LASA manifests | **PASS** — unchanged |
| Catalog `isControlled`, witness, double-sign flags | **PASS** |
| `MedicationSafetyProfile` coverage | **PARTIAL** — 833 profiles vs 1,087 concepts; Haiti concepts often lack profiles until M1.3 seed on new chains |
| MAR UI governance utils | **PASS** — catalog-keyed |
| Legal chart governance summaries | **PASS** — no M1.5D–H regressions in code |
| M1.5G pilot changes governance rules | **PASS** — none |

**Part 6 verdict:** **PASS** with **MEDIUM** residual risk on sparse safety profiles for future activated Haiti products.

---

## Part 7 — Quarantine stability audit

| Deny class | Code gate | Local DB |
|------------|-----------|----------|
| Acetaminophen clone family | `isQuarantinedCanonicalProduct` | **PASS** — 980 concepts quarantined; not activatable |
| Insulin clone family | same | **PASS** — 52 concepts |
| Blocked-med tests | same | **PASS** — 55 concepts |
| 19G / PRI_ER import prefixes | `productCodeLooksQuarantined` | **PASS** on products; **FAIL** on **73 active catalog** clone rows still searchable |
| Duplicate NDC clusters | manifest set | **PASS** in linkage validation |
| Import/test products | inactive + gate | **PASS** for canonical path |

**Part 7 verdict:** **FAIL** — quarantine blocks canonical activation but **does not remove legacy `19G1-ACET-*` catalog rows** from provider search.

---

## Part 8 — Performance stability audit

| Surface | Risk | Rationale |
|---------|------|-----------|
| Provider medication search | **LOW** | Unchanged query shape; batched gate + metadata |
| Medication order entry | **LOW** | Catalog-ID orders |
| MAR loading | **LOW** | No schema change |
| Billing enrichment | **LOW** | Catalog-keyed capture |
| Chart export | **LOW** | No new joins in export path |
| Canonical lookup (master explorer) | **MEDIUM** | Large concept table (1k+); not on provider hot path |

**Overall performance risk:** **LOW** for clinic MVP paths; **MEDIUM** if enterprise search adds canonical-first index without pagination.

---

## Part 9 — Rollback readiness audit

| Capability | Result |
|------------|--------|
| Deactivate pilot products | **PASS** — `rollbackHaitiCanonicalActivationPilot` |
| Preserve `CatalogMedication` | **PASS** — no deletes |
| Preserve billing / governance / linkage | **PASS** — deactivates only; restores M1.5E marker |
| Restore pre-pilot search behavior | **PASS** — design + unit tests |
| Exercised on local DB | **N/A** — 0 pilot rows |

**Part 9 verdict:** **PASS** (code readiness)

---

## Part 10 — Remaining gap register (summary)

See [canonical-medication-stabilization-risk-register.md](./canonical-medication-stabilization-risk-register.md).

| Gap | Severity |
|-----|----------|
| 64 acetaminophen baseline → Haiti catalog links | **CRITICAL** |
| 73 active `19G1-ACET-*` catalog search rows | **CRITICAL** |
| M1.5E backfill not applied (0/192 clean links) | **HIGH** |
| Warfarin / Coumadin absent from Haiti formulary | **HIGH** |
| Enoxaparin / Lovenox absent | **HIGH** |
| 55 `MANUAL_REVIEW` linkage rows (controlled, LASA, opioids) | **HIGH** |
| Vaccine / anticoag formulary gaps | **MEDIUM** |
| Sparse safety profiles on new Haiti concepts | **MEDIUM** |
| Production billing seed / NDC gaps (M1.4B local) | **MEDIUM** |
| Shared alias collisions (rsi, sedation, …) | **MEDIUM** |

---

## Part 11 — Final Haiti medication decision

### **HAITI MEDICATION ARCHITECTURE NOT STABILIZED**

**Rationale:** M1.5D–G **program artifacts** are complete and CI-green, but the **audited database** fails linkage integrity and provider-search pollution checks. Stabilization requires:

1. Execute M1.5E linkage backfill (or equivalent) on target environment.  
2. Remediate **64** wrong acetaminophen `legacyCatalogMedicationId` links and **deactivate/remove** `19G1-ACET-*` catalog rows from provider index.  
3. Complete M1.5G pilot in **one facility** with metrics; confirm zero search inflation.  
4. Close **HIGH** formulary gaps (warfarin, enoxaparin) before anticoag expansion.

### **SAFE / NOT SAFE**

| Scope | Verdict |
|-------|---------|
| Continue **legacy** Haiti provider search (247 codes) | **SAFE (conditional)** — exclude 19G acet catalog pollution first |
| M1.5G pilot activation (38 rows) | **SAFE (conditional)** — after M1.5E + acet remediation |
| Canonical search cutover | **NOT SAFE** |
| Enterprise formulary expansion (M1.6A) | **NOT SAFE** |

---

## Part 12 — Enterprise expansion readiness

**M1.6A — Enterprise Formulary Expansion Audit:** **NOT READY**

Prerequisites before M1.6A:

- [ ] M1.5E applied; ≥75% integrity on pilot-eligible set  
- [ ] Baseline acet catalog pollution remediated  
- [ ] M1.5G pilot PASS with rollback drill  
- [ ] Provider search **PASS** (not PARTIAL) on alias matrix  
- [ ] Medical director sign-off on 55 `MANUAL_REVIEW` rows  

---

## Validation (M1.5H)

| Command | Result |
|---------|--------|
| `pnpm --filter @medora/api exec prisma validate` | **PASS** |
| `pnpm --filter @medora/api run build` | **PASS** |
| `pnpm --filter @medora/shared test` | **PASS** — 1056 tests |
| `pnpm verify:web` | **PASS** |

No DB writes · no seeds · no migrations.
