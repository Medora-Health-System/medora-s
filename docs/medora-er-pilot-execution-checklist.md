# MEDORA ER Pilot Execution Checklist

**Scope:** Operational pilot steps and measurement only. This document does not change clinical authority, product behavior, or configuration.

**PHI safety (mandatory):**

- Use **synthetic encounters only** (test facility / demo data as approved by your program).
- **Do not** paste real patient names, MRNs, dates of birth, addresses, or narrative clinical detail into this checklist or the issues log.
- **Do not** use identifiers that resemble production medical record numbers.
- Issues log entries must be **factual and anonymized** (e.g. “MAR submit failed after validation”); never copy chart text or dictation.

---

## Synthetic encounter references (examples)

Use **opaque labels** only. Do not combine with real-looking personal names.

| Label        | Use in scenarios        |
|-------------|---------------------------|
| **CP-001**  | Chest pain path           |
| **SEP-002** | Sepsis path               |
| **DC-003**  | Simple discharge path     |
| **RN-004**  | Multi-role / RN path      |

Optional free-text slot: **one line, operational only** — e.g. “chest pain scenario, demo encounter” — **not** a clinical summary with identifiers.

---

## 1. Chest pain scenario

**Encounter ref.:** CP-001 (synthetic)

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Arrival / triage documented per clinic SOP | ☐ |
| 2 | Open emergency encounter for synthetic reference CP-001 | ☐ |
| 3 | Apply chest-pain order set (labs + imaging as applicable) | ☐ |
| 4 | **Document ECG/EKG** via procedure flow — not as a CARE order line for ECG | ☐ |
| 5 | Confirm ECG documentation appears under procedures / structured documentation as expected | ☐ |
| 6 | Complete department steps (lab / imaging / pharmacy / nursing) per role | ☐ |
| 7 | MAR: track medication administration when medication lines exist | ☐ |
| 8 | Close the clinical loop (summary / disposition per protocol) | ☐ |

**Observe:** skipped bundle lines; time to first order; ECG via procedure vs imaging order (reporting rules unchanged).

---

## 2. Sepsis scenario

**Encounter ref.:** SEP-002 (synthetic)

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Triage / sepsis pathway documented per SOP | ☐ |
| 2 | Apply sepsis order set (per catalog configuration) | ☐ |
| 3 | Department acknowledgements where applicable | ☐ |
| 4 | Fluids / medications per orders — MAR when applicable | ☐ |
| 5 | Reassessment documented | ☐ |

**Observe:** skipped items (catalog, rights, protocol); time to first relevant order.

---

## 3. Simple discharge scenario

**Encounter ref.:** DC-003 (synthetic)

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Minimal visit completed end-to-end | ☐ |
| 2 | Disposition / discharge fields completed per workflow | ☐ |
| 3 | Patient instructions / follow-up if required by workflow | ☐ |
| 4 | Encounter closed without unexpected blocking | ☐ |

**Observe:** documentation blockers; missed required tabs.

---

## 4. RN / provider multi-role scenario

**Encounter ref.:** RN-004 (synthetic). Use **separate test accounts** per role policy.

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Provider: orders / imaging / prescriptions per role | ☐ |
| 2 | RN: CARE workflow tasks (not duplicating full procedure modals) | ☐ |
| 3 | RN: MAR for relevant medication lines | ☐ |
| 4 | Actions denied or disabled align with **role** (not mistaken as bug) | ☐ |

**Observe:** RBAC; no cross-role data exposure.

---

## 5. What to measure

Define **T0** once for the pilot (e.g. encounter open or triage saved) and keep it consistent.

| Metric | Definition | How to record |
|--------|------------|----------------|
| **Time to orders** | Minutes from T0 to first submitted order | Minutes; order type |
| **Skipped order-set items** | Bundle lines not applied or explicitly skipped | Count + reason category (catalog / rights / clinical choice) — **no PHI** |
| **Time to MAR** | Minutes from T0 (or from first active med line) to first MAR action | Only if medications in scope |
| **Missed tabs / domains** | Required views not opened per scenario | Tab names only |
| **Documentation blockers** | Cannot proceed (validation, banner, closed encounter) | Short description; **encounter ref. CP-001 style only** — no chart paste |

---

## 6. Go / no-go criteria

**Go**

- No **unworkaroundable** critical failure on all four scenario paths (save, role-appropriate actions, close).
- RBAC and audit expectations acceptable to pilot leads.
- Skipped bundle items **explained** (test data vs product defect).
- Escalation path and issues logging agreed.

**No-go**

- Data integrity or role-boundary concerns.
- Repeated inability to close encounter or complete disposition safely.
- Any practice that would mix **production PHI** into pilot logs or screenshots.

---

## 7. Issues log template

**Do not** paste clinical narrative, identifiers, or screenshots containing PHI.

| ID | Date | Scenario | Encounter ref. (synthetic) | Severity | Summary (no PHI) | Expected | Observed | Area | Blocking? | Owner |
|----|------|----------|----------------------------|----------|------------------|----------|----------|------|------------|-------|
| INC- | | CP / SEP / DC / RN | CP-001 | P1–P4 | | | | | Y/N | |

**Severity (example):** P1 = safety/data; P2 = workflow blocked; P3 = friction; P4 = cosmetic.

---

## 8. Migration / seed status

- **No database migration** is required to *run* this checklist (operational pilot only).
- **No seed** is required *for the checklist document itself**; synthetic data must come from **approved** test/demo provisioning for your environment only.

---

## Commit note

Safe to commit as **documentation only** alongside other clinical UX documentation (e.g. Phase 4), provided this file is the only change or is grouped with other non-secret, non-PHI docs. **Do not** commit real pilot findings or filled logs containing PHI.
