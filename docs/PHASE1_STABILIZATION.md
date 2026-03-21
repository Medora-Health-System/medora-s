# Medora-S Phase 1 Stabilization — Summary

## 1. Architectural decisions

- **Prescription (Rx):** Reused existing `Order` (type MEDICATION) + `OrderItem` flow. No separate Prescription entity. Optional fields added on Order (prescriber name, license, contact) and OrderItem (strength, refillCount); sig/instructions remain in `notes`. Pharmacy queue and worklist unchanged; MEDICATION orders already appear there.
- **Registration dashboard:** Role-based nav filter: when user has only FRONT_DESK (no ADMIN/clinical roles), sidebar shows only Accueil/Inscription, Patients, Suivis. Same app layout; no separate app.
- **Vitals:** Triage model and `vitalsJson` unchanged. Chart summary now includes triage (vitals) per encounter; patient résumé displays a "Signes vitaux récents" section.
- **RBAC:** Smallest change: nav filtered by role set (registration-only vs pharmacy-only vs full). No schema change for roles; API already had FRONT_DESK where needed; added FRONT_DESK to follow-ups GET and patients GET/:id and GET/:id/encounters. Pharmacy nav: removed PROVIDER/RN from pharmacy inventory/low-stock/expiring so only PHARMACY and ADMIN see those links when they have no clinical role.

---

## 2. Schema changes

**File:** `apps/api/prisma/schema.prisma`

- **Order:** added optional `prescriberName`, `prescriberLicense`, `prescriberContact` (String?).
- **OrderItem:** added optional `strength` (String?), `refillCount` (Int?).

**Migration:** `20260319024736_add_prescription_fields`

---

## 3. API changes

- **Orders:** `POST /encounters/:encounterId/orders` accepts optional `prescriberName`, `prescriberLicense`, `prescriberContact` on body; each item accepts optional `strength`, `refillCount`. Orders service persists them.
- **Chart summary:** `GET /patients/:id/chart-summary` — response `recentEncounters[]` now includes `triage: { vitalsJson, triageCompleteAt, chiefComplaint, esi }` per encounter when present.
- **Follow-ups:** `GET /follow-ups/upcoming` and `GET /patients/:patientId/follow-ups` now allow `FRONT_DESK`.
- **Patients:** `GET /patients/:id` and `GET /patients/:id/encounters` now allow `FRONT_DESK`.

No new endpoints. Pharmacy catalog: existing `GET /pharmacy/catalog-medications` used by the create-Rx form.

---

## 4. UI pages / components updated

| Area | File(s) | Change |
|------|---------|--------|
| Vitals labels | `apps/web/app/app/encounters/[id]/page.tsx` | Tab "Tri / Constantes" → "Signes vitaux"; headings and button text updated to "Signes vitaux" / "Valeurs" / "Enregistrer les signes vitaux". |
| Chart summary + vitals | `apps/web/src/lib/chartApi.ts` | `ChartSummary.recentEncounters[].triage` typed. |
| Patient résumé | `apps/web/app/app/patients/[id]/page.tsx` | New section "Signes vitaux récents" listing encounters with vitals (date, ESI, Temp, FC, TA, SpO2, Poids, Taille). |
| Chart summary backend | `apps/api/src/patients/chart-summary.service.ts` | Encounters query includes `triage: { select: vitalsJson, triageCompleteAt, chiefComplaint, esi }`; mapped into response. |
| Registration dashboard | `apps/web/app/app/layout.tsx` | Nav filter: if only FRONT_DESK → show only Accueil, Patients, Suivis. If only PHARMACY (no ADMIN/PROVIDER/RN) → show only pharmacy-worklist, pharmacy inventory, dispense, low-stock, expiring. |
| Registration page | `apps/web/app/app/registration/page.tsx` | Content: "Patients et consultations" (link to Patients, create consultation CTA); "Suivis à venir" (link to follow-ups, list of next 10 with patient name, date, reason). Uses `fetchUpcomingFollowUps`. |
| Pharmacy nav | `apps/web/app/app/layout.tsx` | Inventory, dispense, low-stock, expiring restricted to `["PHARMACY", "ADMIN"]` (removed PROVIDER, RN). |
| Create order modal (Rx) | `apps/web/app/app/encounters/[id]/page.tsx` | MEDICATION tab: load catalog from `GET /pharmacy/catalog-medications`; form fields prescriber name/license/contact; per-item strength, posologie (notes), quantity, refills; submit includes new fields. |
| Orders list + print | `apps/web/app/app/encounters/[id]/page.tsx` | OrdersTab receives `encounter`; "Imprimer" button for MEDICATION orders; `handlePrintRx(order)` opens print window with patient, date, prescriber, items (catalogItemId, strength, notes, quantity, refillCount). |
| Pharmacy worklist | `apps/web/app/app/pharmacy-worklist/page.tsx` | "Imprimer" button per order; same print logic (patient, prescriber, items). |

---

## 5. RBAC changes

- **Nav (UI):** Registration-only users (FRONT_DESK only) see: Accueil / Inscription, Patients, Suivis. Pharmacy-only users (PHARMACY, no ADMIN/PROVIDER/RN) see only pharmacy worklist and pharmacy inventory/dispense/low-stock/expiring. No change to role enum or DB.
- **API:** FRONT_DESK can: GET patients search, GET patient by id, GET patient encounters, GET follow-ups/upcoming, GET patients/:id/follow-ups. Provider-only prescribing for MEDICATION orders unchanged (orders controller).

---

## 6. Testing checklist

- [ ] **Vitals:** Rename — Encounter page tab shows "Signes vitaux"; form heading "Signes vitaux", subsection "Valeurs"; button "Enregistrer les signes vitaux".
- [ ] **Vitals persistence:** Save vitals in an open encounter → reload → values persist. Close encounter → reopen → vitals read-only.
- [ ] **Chart summary vitals:** Save vitals for an encounter → open patient → Résumé tab → "Signes vitaux récents" shows that encounter with correct values (Temp, FC, TA, etc.).
- [ ] **Registration dashboard:** Log in as FRONT_DESK-only → sidebar shows only Accueil / Inscription, Patients, Suivis. Open Accueil → see "Patients et consultations" and "Suivis à venir" with link to follow-ups and list.
- [ ] **Registration follow-ups:** As FRONT_DESK, open Accueil → "Suivis à venir" loads; "Voir et gérer les suivis" opens follow-ups page; list shows patient names and dates.
- [ ] **Pharmacy nav:** Log in as PHARMACY-only → sidebar shows only Liste pharmacie, Stock pharmacie, Dispenser médicament, Stock faible, Stock à péremption (no trackboard, nursing, patients, etc.).
- [ ] **Create Rx (provider):** As PROVIDER, open encounter → Ordres → Créer un ordre → Médicaments → catalogue loads; add medication; fill dosage, posologie, qté, renouv.; fill prescriber name/license/contact → submit. Order appears in list; appears in pharmacy worklist.
- [ ] **Print Rx (encounter):** On encounter orders list, MEDICATION order has "Imprimer" → opens print window with patient, date, prescriber, table of items (dosage, posologie, qté, renouv.) → print dialog.
- [ ] **Pharmacy worklist + print:** As PHARMACY, open Liste pharmacie → each order row has "Imprimer" → same print view. Process order (Acquitter / Démarrer / Terminer) still works.
- [ ] **Protected routes (admin):** As ADMIN, /trackboard, /patients/search, /pharmacy/inventory-low-stock, /public-health/disease-summary, /billing/queue, /worklists/pharmacy return 200.
- [ ] **UI in French:** All new or changed labels are in French (Signes vitaux, Ordonnance, Prescripteur, Posologie, etc.).

---

## Files changed (concise)

- `apps/api/prisma/schema.prisma` — Order + OrderItem prescription fields
- `apps/api/prisma/migrations/20260319024736_add_prescription_fields/migration.sql` — migration
- `packages/shared/src/schemas/patient.ts` — orderCreateDtoSchema + orderItemCreateDtoSchema extended
- `apps/api/src/orders/orders.service.ts` — persist prescriber + item strength/refillCount
- `apps/api/src/patients/chart-summary.service.ts` — include triage in chart summary
- `apps/api/src/follow-ups/follow-ups.controller.ts` — FRONT_DESK on GET upcoming + GET patient follow-ups
- `apps/api/src/patients/patients.controller.ts` — FRONT_DESK on GET :id and GET :id/encounters
- `apps/web/src/lib/chartApi.ts` — ChartSummary type with triage on recentEncounters
- `apps/web/app/app/encounters/[id]/page.tsx` — vitals labels, CreateOrderModal Rx fields + catalog API, OrdersTab print + encounter prop
- `apps/web/app/app/patients/[id]/page.tsx` — Signes vitaux récents section
- `apps/web/app/app/layout.tsx` — nav filters (registration-only, pharmacy-only), FRONT_DESK on Patients/Suivis, pharmacy roles tightened
- `apps/web/app/app/registration/page.tsx` — full registration dashboard content (patients, follow-ups)
- `apps/web/app/app/pharmacy-worklist/page.tsx` — Imprimer button and handlePrintRx
