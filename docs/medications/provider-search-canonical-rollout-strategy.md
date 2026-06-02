# Provider Search Canonical Cutover — Rollout Strategy (M1.5F)

**Date:** 2026-06-02  
**Recommended strategy:** **D — Phased rollout**  
**Rejected for MVP:** **B — Canonical only**, **C — Hybrid dual-index**

**Parent:** [provider-search-canonical-cutover-audit.md](./provider-search-canonical-cutover-audit.md)

---

## Strategy D — Phased rollout (recommended)

### Principles

1. **`CatalogMedication` remains the provider search identity** until a future schema phase wires `OrderItem.medicationProductId` / `medicationPackageId` for MVP orders.  
2. **Canonical layer supplies** governance, billing package profiles, and future formulary — not a parallel search index in pilot.  
3. **Never bulk-activate** the **993** import products.  
4. **Per-row enablement** via `orderSearchEnabled` in runtime activation metadata + facility formulary approval.  
5. **Remove `HAITI_M15E_CANONICAL_LINKAGE_ONLY` marker** only when intentionally enabling search for that product (M1.5G).  
6. **One visible row per Haiti clinical SKU** — dedupe on `catalogMedicationId`.

### Architecture (pilot state)

```text
Provider types "rocephin"
  → GET /catalog/medications/search
  → CatalogMedication match (legacy)
  → filterProviderSearchCatalogIds (exclude bad links unless M1.5E marker / enabled)
  → attachCanonicalReadMetadata (badges, optional canonical aliases display)
  → UI shows single catalog row
```

### What changes in pilot (M1.5G) — not in M1.5F

- `MedicationProduct.isActive` / `MedicationConcept.isActive` → true for T1 only  
- `FacilityFormularyItem.isOnFormulary` → true for default package  
- Runtime `orderSearchEnabled` → true  
- Remove M1.5E linkage-only marker when enabling  
- M1.3 governance seeds on Haiti concepts  

### What does **not** change in pilot

- API route or DTO `id` field (still catalog UUID)  
- Order creation payload (`catalogMedicationId`)  
- MAR documentation keys  
- Billing externalCode keys (catalog code)

---

## Exact cutover sequence

| Step | Phase | Action | Exit criteria |
|------|-------|--------|---------------|
| 1 | M1.5E | Run backfill on **staging** (env flag) | 192 links, 0 conflicts, dry-run PASS |
| 2 | Remediation | Unlink **60** `19G1-ACET` baseline FKs from clinical catalogs | No acetaminophen baseline link on Haiti rows |
| 3 | M1.5F | Accept audit (**this document**) | Sign-off checklist in risk register |
| 4 | M1.4B | Billing remediation on staging | `billingCodeDefault` on billable T1 rows |
| 5 | M1.3C–E | Governance seeds on Haiti `conceptId`s | Safety profiles exist for T3 prep |
| 6 | M1.5G T1 | Enable **≤82** T1 products only | Search count stable; acetaminophen query ≤ policy |
| 7 | Monitor | 1–2 weeks pilot metrics | No duplicate orders; billing capture OK |
| 8 | M1.5G T2–T5 | Waves 2–5 with reviews | Per tranche sign-off |
| 9 | M1.5H | Stabilization audit | Enterprise readiness re-score |

---

## Part 10 — Phased activation plan (tranches)

Aligned with `HAITI_CANONICAL_LINKAGE_MANIFEST.tranche` (M1.5D):

| Tranche | Clinical scope | Approx. rows | Link wave | Search enable |
|---------|----------------|--------------|-----------|---------------|
| **T1** | Billable ER/IV (HCPCS manifest) | **82** | M1.5E wave 1 | **M1.5G pilot** |
| **T2** | Antibiotics | **~65** | M1.5E wave 2 | After T1 PASS |
| **T3** | Controlled, high-alert, LASA, opioid | **9+** (+ manual) | M1.5E wave 3 | Medical director + pharmacy |
| **T4** | Essential chronic | **~122** | M1.5E wave 4 | Staged |
| **T5** | Remaining formulary | **~43** | M1.5E wave 5 | Staged |

**MANUAL_REVIEW (55):** Do not enable search until manifest `reviewerRequired` cleared.

---

## Strategy comparison (summary)

| | A Legacy only | B Canonical only | C Hybrid index | **D Phased** |
|--|---------------|------------------|----------------|--------------|
| Safety | ★★★★★ | ★ | ★★ | ★★★★ |
| Complexity | ★ | ★★★★ | ★★★★★ | ★★★ |
| Haiti fit | ★★★ | ★ | ★★ | ★★★★★ |
| Rollback | Easy | Hard | Hard | **Easy** |

---

## Part 11 — Rollback procedure

### Trigger rollback if

- Search row count increases >10% without approved catalog additions  
- `acetaminophen` returns >3 catalog IDs in order search  
- Orders fail validation after activation  
- Billing capture loses HCPCS on T1 sample  

### Steps (no data loss)

1. **Disable runtime search** for pilot products:  
   - Set `orderSearchEnabled: false` via governance disable endpoint or batch script on T1 `productId`s.  
2. **Restore M1.5E marker** (optional): re-append `HAITI_M15E_CANONICAL_LINKAGE_ONLY` to `governanceNotes` if catalogs vanished from search.  
3. **Set `isActive: false`** on pilot products/concepts (optional — keeps linkage for audit).  
4. **Do not delete** `CatalogMedication`, `MedicationConcept`, `MedicationProduct`, or `MedicationPackage` rows.  
5. **Sever link only if necessary:** `legacyCatalogMedicationId = NULL` on affected products (last resort).  
6. **Verify:** `GET /catalog/medications/search?q=ceftriaxone` returns pre-pilot catalog set.  
7. **Document** rollback in facility change log.

### Rollback time target

< 15 minutes for T1 pilot (≤82 products) using product ID list from activation runbook.

---

## Performance guardrails (Railway / pilot)

- Keep client `limit` ≤ **50** (already enforced server-side).  
- Avoid enabling >**100** products in first week.  
- Run search cardinality checks off-hours.  
- Monitor p95 on `/catalog/medications/search` — alert if >2× baseline.

---

## Future work (post-MVP, not M1.5F/G)

- Optional `medicationPackageId` on `OrderItem` for dispense-ready sites  
- Canonical-first search behind feature flag (requires dedupe + facility formulary index)  
- Retire legacy catalog-only path when 100% orders use package FKs  

---

## Sign-off

| Role | Decision |
|------|----------|
| Engineering | Strategy **D** approved for design |
| Clinical / pharmacy | Required before M1.5G T1 |
| Cutover READY | **NO** until checklist in risk register complete |
