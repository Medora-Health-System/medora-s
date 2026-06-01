# Wave 1 Rollback Plan (Phase W2.2 — Final)

**Phase:** W2.2 — design only  
**Date:** 2026-06-01  
**Scope:** **37** codes from workbook `wave=1`  

---

## 1. Principles

- **No hard deletes** on `CatalogImagingStudy` or orders.  
- Deactivate by `isActive=false` using workbook code list.  
- Do not alter W1 44-row classifier mapping.

---

## 2. Rollback procedures

### 2.1 CatalogImagingStudy

1. Set `isActive=false` for all 37 Wave 1 `catalogCode` values.  
2. Verify active catalog returns to **44** (+ inactive `CT_HEAD`).  

### 2.2 ImagingStudyAlias

1. Deactivate aliases pointing to Wave 1 codes.  
2. Revert `XR_CHEST` tuple aliases only if tuple pass was part of failed deploy.  

### 2.3 Classifier rollback

- **Preferred:** leave FKs on inactive rows.  
- **Optional:** null FKs on deactivated rows only.  
- **Never** change `MRI_SPINE` or W1 44-row tuples.

### 2.4 Deployment rollback

1. Revert seed migration / prior API build.  
2. Run preflight on 44-row baseline.  

---

## 3. Runtime impact

| Area | Impact |
|------|--------|
| New Wave 1 orders | Blocked |
| Existing 44 codes | Unchanged |
| Staging test orders on W1 codes | Historical orphan if any |
| Billing | None (CPT not active) |
| Search | Wave 1 strings may fail until aliases removed |

---

## 4. Recovery time (estimate)

| Step | Duration |
|------|----------|
| Deactivate 37 codes | **< 5 min** |
| Alias cleanup | **15–30 min** |
| Deploy revert | **10–20 min** |
| Preflight + smoke | **30–60 min** |
| **Total recovery** | **~1–2 hours** (staging) |

---

*No rollback executed in W2.2.*
