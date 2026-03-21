# Clinical regression matrix (Medora-S)

> **Release gate:** If **any** item below fails in the target environment, **do not** cut a demo or production release until fixed or explicitly waived with documented risk. Use with [PRE_MERGE_GATE.md](./PRE_MERGE_GATE.md) and [SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md).

Manual QA: run in a **clean browser profile** or after hard refresh; note **role**, **browser**, and **build/commit** tested.

---

## A. Registration

- [ ] **Create patient** — new patient can be created with required fields; patient appears in search / chart access path.
- [ ] **Age calculation** — displayed age (or DOB-derived age) is correct for known test DOBs.
- [ ] **Sex required** — submission blocked or clearly validated if sex is mandatory; saved value appears correctly after save.
- [ ] **Duplicate check** — system warns or blocks when creating a likely duplicate (per product rules); user can proceed or resolve without data loss.
- [ ] **Create encounter** — encounter can be opened/created for the patient from the registration flow (or linked workflow).
- [ ] **Room assignment** — room/bed (or location) assignment persists and displays where expected.
- [ ] **Assigned physician** — assigned provider/physician is visible and persists on the encounter.

---

## B. Patient chart

- [ ] **Header demographics** — name, identifiers, key demographics match source data.
- [ ] **Latest vitals visible** — most recent vitals are shown without navigating away from the chart landing view (or per agreed UX).
- [ ] **Chronological clinical timeline** — events appear in sensible chronological order; new entries appear after refresh.
- [ ] **Notes** — clinical notes can be viewed and added per role; content persists.
- [ ] **Results** — lab/radiology (and other) results appear in chart context; status is clear.
- [ ] **Meds** — medications list reflects current state; additions/changes visible after save.
- [ ] **Follow-ups** — follow-up items (tasks, referrals, or scheduled follow-ups per product) visible and actionable where applicable.

---

## C. Encounter

- [ ] **Vital signs** — vitals can be entered/viewed; units and timestamps are plausible; save works.
- [ ] **Nursing documentation** — nursing documentation section works end-to-end for RN (or equivalent) role.
- [ ] **Provider evaluation** — provider evaluation/assessment section accessible and savable for provider role.
- [ ] **Diagnosis flow** — diagnoses can be added/selected per workflow; they persist and display correctly.
- [ ] **Order creation** — orders (labs, imaging, meds, etc.) can be placed from encounter; they appear on downstream lists.
- [ ] **Medication intent — administer in chart** — option/path for in-chart administration works when intended; documentation ties to encounter/patient.
- [ ] **Medication intent — send to pharmacy** — pharmacy-bound medication orders appear in pharmacy workflow with correct detail.
- [ ] **Discharge section presence** — discharge/summary section (or equivalent) is present and usable per role when closing an encounter.

---

## D. Lab

- [ ] **Order appears** — new lab order appears on lab worklist or queue after placement.
- [ ] **Real name visible** — test/panel name is human-readable and matches catalog intent (not only internal codes).
- [ ] **Acknowledge** — lab user can acknowledge the order; status updates propagate.
- [ ] **Start** — start/in-progress transition works; timestamps or status visible.
- [ ] **Complete** — completion marks order done; no stuck “in progress” without override path.
- [ ] **Upload PDF/JPEG** — file can be attached/uploaded where supported; no silent failure.
- [ ] **Result reaches patient chart** — completed result (and attachment if applicable) visible on patient chart/results.

---

## E. Radiology

- [ ] **Order appears** — radiology order appears on radiology worklist or queue.
- [ ] **Real exam name visible** — exam/modality description is clear to the user (not only codes).
- [ ] **Acknowledge** — radiology user can acknowledge; status updates.
- [ ] **Start** — start/in-progress works as for lab.
- [ ] **Complete** — completion clears the workflow appropriately.
- [ ] **Upload result** — report or image/upload path works per product (PDF/image/URL as designed).
- [ ] **Result reaches patient chart** — result visible on patient chart with correct association.

---

## F. Pharmacy

- [ ] **Order appears** — pharmacy sees medication orders intended for pharmacy.
- [ ] **Medication detail visible** — drug name, strength, route, instructions (as applicable) are readable.
- [ ] **Dispense recording** — dispense/delivery step can be recorded; status updates for other roles if applicable.
- [ ] **Medication history linked to patient** — patient medication history reflects dispensed/ordered items consistently with chart.

---

## G. Admin / RBAC

- [ ] **Create user** — admin can create a new user with email/login per policy.
- [ ] **Assign role** — role assignment saves and is reflected on next login/session.
- [ ] **Role landing** — each tested role lands on the expected home/dashboard (or default route).
- [ ] **Restricted routes blocked** — user without permission cannot access restricted URLs (403/redirect/not found per product); no data leak in UI.

---

## H. Offline basics

- [ ] **Cached pages open** — previously loaded app shell or key pages still open when offline (per PWA/offline design).
- [ ] **Queue works** — actions taken offline are queued (or user sees clear offline state); no duplicate silent submits on flaky network.
- [ ] **No silent failure on reconnect** — when back online, queue sync succeeds or user sees explicit error/retry; nothing “lost” without notice.

---

## Related

- [PRE_MERGE_GATE.md](./PRE_MERGE_GATE.md)
- [SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md)
- [RELEASE_CHECKPOINTS.md](./RELEASE_CHECKPOINTS.md)
