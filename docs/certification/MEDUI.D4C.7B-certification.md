# MEDUI.D4C.7B — Certification

## Verdict

**CERTIFIED WITH DOCUMENTED DEFERRALS**

All fixable Clinic Pharmacy navigation, inventory-alert privacy, and Consultations routing gates pass. Admin private Clinic dashboard inventory widget deferred to **D4C.8**. Facility Pharmacy capability remains config-driven (no silent seed). Canonical pharmacy role is Prisma **`PHARMACY`** (`PHARMACIST` soft alias only).

## Certification id

`MEDUI.D4C.7B`

## Final report (32 sections)

### 1. Git verification
Branch `d4c7b-clinic-pharmacy-consultations-navigation`; clean at start; `origin/main` fetched; HEAD contained D4C.7A / D4C.7 / D4C.5B.3 / D4C.6. No commit/push/merge.

### 2. Pharmacy navigation defect
Clinic left nav lacked clear Pharmacie entry with Clinic ambulatory context; fixed via care-setting href rewrite + FR label + clinic entry query.

### 3. Consultation routing defect
Consultations → `/app/encounters` → ED `/trackboard` → 403 when `!edEnabled` → “Impossible de charger les consultations.”

### 4. Enterprise Pharmacy authority reused
`/app/pharmacy` remains canonical; thin adapter only.

### 5. Pharmacy menu placement
Global sidebar PHARMACIE group; primary **Pharmacie** / **Pharmacy**; Clinic top-tab redirects to same board.

### 6. Pharmacy role authorization
ADMIN + PHARMACY only; Provider/RN/MA/Front Desk/Billing/Lab/Rad denied unless they hold PHARMACY.

### 7. Direct-route protection
`landingRoute` + facility `pharmacyEnabled` + membership; not visual-hide-only. Alert APIs PHARMACY/ADMIN.

### 8. Selected facility preservation
Session facility / `x-facility-id` unchanged.

### 9. Ambulatory Pharmacy filtering
`source=clinic-care` and/or `ambulatory=1` → D4C.7 ambulatory queue filter.

### 10. Pharmacy board preservation
Queue, inventory, dispense, low stock, expiring, worklist, verification retained.

### 11. Inventory-alert privacy
Clinical Board never exposes; ordinary clinical roles blocked on alert APIs.

### 12. Admin alert behavior
Pharmacy (+ existing ED/Hospital when canManagePharmacy). Private Clinic Admin widget → D4C.8.

### 13. Pharmacist alert behavior
Full operational alerts inside Pharmacy; no Admin financial analytics grant.

### 14. Shared Clinical Board non-exposure
Confirmed — no PharmacyAlertsCard on Clinic Clinical Board analytics view.

### 15. Consultations route root cause
ED-gated trackboard API used for Clinic nav list.

### 16. New Consultations route
`/app/clinic-care/encounters` via typed sidebar resolver + clinic-only page gate.

### 17. Active Clinic Workspace routing
`workspace=ambulatory` + role section + `from=consultations`.

### 18. Role-aware default sections
Provider medical-evaluation; RN/MA intake; Pharmacy medications; Front Desk follow-up; Admin summary.

### 19. Consultation projection behavior
Ambulatory trackboard projection; search/date/flow filters; no first-patient auto-open.

### 20. Error/empty-state correction
Successful empty vs load error + retry distinguished.

### 21. Generic encounters non-regression
`EncountersLegacyOpenList` retained for ED / mixed facilities; clinic-only redirects.

### 22. French i18n
Pharmacie, Alertes de pharmacie, Stock faible, Expiration prochaine, Inventaire, Délivrer, Liste de travail; mirrored EN keys.

### 23. Files changed
Shared D4C.7B module + tests; navigationVisibility; encounters gate; ambulatory encounters view; pharmacy redirect/page; inventory controller; i18n; docs.

### 24. Tests with exact counts

| Suite | Counts |
|-------|--------|
| Shared D4C.7B A–H | **8 passed** |
| Web D4C.7B source guards A–H | **8 passed** |
| Shared D4C.7A regression | **8 passed** |
| Shared D4C.7 regression | **13 passed** |
| Shared D4C.5B workspace | **3 passed** |
| Web D4C.7 regression | **8 passed** |
| Web D4C.7A regression | **8 passed** |
| Web D4C.5B workspace | **12 passed** |
| Web D4C.2A / D4C.2A.1 | **14 passed** |
| Web D4C.1 clinic nav | **6 passed** |
| Web facility navigation visibility | **10 passed** |
| **Total focused validation** | **98 passed** |

Note: `navigationRoleVisibility` has 2 pre-existing failures on `origin/main` (unrelated to D4C.7B); excluded from focused gate.

### 25. TypeScript result
`apps/web` `tsc --noEmit` — OK (exit 0).

### 26. Build results
`@medora/shared` build OK · `@medora/api` build OK · `@medora/web` build OK.

### 27. Prisma validate/generate
`prisma validate` OK. Generate ran as API prebuild only; no schema change.

### 28. Migration and seed status
None. No silent Pharmacy capability grant for CLINIC defaults. Canonical role = `PHARMACY` (not seeded `PHARMACIST`).

### 29. Manual validation checklist
- Clinic ADMIN with pharmacyEnabled: sees Pharmacie → ambulatory pharmacy board
- Clinic PROVIDER: no Pharmacie; Consultations → ambulatory list → Active Workspace
- Clinic-only facility: no “Impossible de charger les consultations” on Consultations
- Clinical Board: no inventory alerts
- ED facility: `/app/encounters` legacy list still loads when Clinic Care off / ED on

### 30. Deferrals
| Item | Note |
|------|------|
| Admin Clinic private inventory-alert widget | D4C.8 |
| Clinic facility Pharmacy capability enablement | Facility config / ops — not seed in 7B |

### 31. Certification recommendation
**CERTIFIED WITH DOCUMENTED DEFERRALS** (D4C.8 Admin widget; facility Pharmacy config remains explicit).

### 32. Git status
Uncommitted implementation on branch (do not commit/push/merge per milestone).

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Pharmacy board | `/app/pharmacy` | ✔ | Clinic entry query + ambulatory filter | ✔ (no ClinicPharmacy) |
| Pharmacy inventory alerts | PharmacyAlertsCard + inventory APIs | ✔ | Role restrict alerts | ✔ |
| Encounter list | ClinicCareAmbulatoryEncountersView | ✔ | Role open path + error states | ✔ (no ClinicConsultation) |
| Active Clinic Workspace | D4C.5B ambulatory shell | ✔ | Role default section helper | ✔ |
| Global sidebar | sidebarNavConfig + nav areas | ✔ | Care-setting href rewriter | ✔ |
| Facility capabilities | D4C.1 pharmacyEnabled | ✔ | — | ✔ |

## Phase

Phase 1 Clinic MVP — French UI via i18n.

## Documented deferrals

| Item | Milestone |
|------|-----------|
| Private Admin Clinic dashboard inventory/expiration widget | D4C.8 |
| Silent CLINIC default Pharmacy service line | Not done — configure per facility |
