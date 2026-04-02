# Smoke test checklist (Medora-S)

Run after meaningful changes to auth, routing, encounters, orders, or worklists. **Login as each role** (or use dedicated test users per facility). Use French UI as shipped.

**Global**

- [ ] API up (`GET /health` or configured health URL)
- [ ] Web loads `/login`
- [ ] Logout clears session; protected `/app` redirects when unauthenticated

---

## FRONT_DESK

| Step | Check |
|------|--------|
| Login | Success with FRONT_DESK user |
| Landing | Lands on allowed home (e.g. registration / encounters list per `landingRoute`) |
| Allowed navigation | `/app/registration`, `/app/patients`, `/app/encounters` (list), `/app/follow-ups`, `/app/billing`, `/app/fracture` as configured |
| Restricted | No access to clinical-only areas (e.g. provider-only tools) — expect redirect or empty nav |
| Core workflow | Open **encounters list** → open **one encounter detail** allowed for reception (if RBAC permits) |

---

## RN

| Step | Check |
|------|--------|
| Login | Success |
| Landing | e.g. `/app/nursing` or trackboard per role order |
| Allowed navigation | Encounters, patients, triage/vitals on encounter, nursing assessment tab if visible, orders view |
| Restricted | Cannot access admin-only routes |
| Core workflow | Open encounter → **Signes vitaux** / triage save → **Évaluation infirmière** section visible and save (if applicable) |

---

## PROVIDER

| Step | Check |
|------|--------|
| Login | Success |
| Landing | e.g. `/app/provider` |
| Allowed navigation | Encounters, diagnostics, orders, create order modal |
| Restricted | No unrestricted admin user management unless also ADMIN |
| Core workflow | Open encounter → **Ordres** → **Créer un ordre** → add lab line + med line → **destination** (administrer vs pharmacie) → submit |

---

## PHARMACY

| Step | Check |
|------|--------|
| Login | Success |
| Landing | Pharmacy home / worklist per config |
| Allowed navigation | `/app/pharmacy`, `/app/pharmacy-worklist`, inventory/dispense routes as listed in sidebar |
| Restricted | No lab/rad tech-only queues unless also those roles |
| Core workflow | **Liste pharmacie** → **Voir le détail** on a row → detail page loads (no “Établissement requis” stuck state) |

---

## LAB

| Step | Check |
|------|--------|
| Login | Success |
| Landing | e.g. `/app/lab-worklist` |
| Allowed navigation | Lab worklist (and lab-related routes as in sidebar) |
| Restricted | No radiology queue |
| Core workflow | **Liste laboratoire** → **Voir** → `/app/lab-worklist/commande/[orderId]` loads with order content |

---

## RADIOLOGY

| Step | Check |
|------|--------|
| Login | Success |
| Landing | e.g. `/app/rad-worklist` |
| Allowed navigation | Radiology worklist |
| Restricted | No lab queue |
| Core workflow | **Liste imagerie** → **Voir** → `/app/rad-worklist/commande/[orderId]` loads |

---

## BILLING

| Step | Check |
|------|--------|
| Login | Success |
| Landing | Billing area or default landing per role |
| Allowed navigation | `/app/billing`, allowed encounter list if configured |
| Restricted | No admin user screens unless ADMIN |
| Core workflow | Open **billing** page without redirect loop; view at least one billing-related screen |

---

## ADMIN

| Step | Check |
|------|--------|
| Login | Success |
| Landing | `/app/admin` or equivalent |
| Allowed navigation | Admin + all app routes (full smoke optional) |
| Restricted | N/A (full access) |
| Core workflow | Open **Administration** → users/facility sanity check; spot-check one clinical path (encounter + order) |

---

## Order / label sanity (any clinical role with orders)

- [ ] Encounter **Ordres** tab shows **real line names** (not only generic group titles when API returns enriched labels).
- [ ] No raw **UUID** in user-visible labels for order lines.

See also: `docs/STABILITY_WORKFLOW.md`.
