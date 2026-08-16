# MEDUI.D5A.5B — Enterprise Dental Final Clinical Completion & Production Authoring Gate

**Branch:** `d5a5-enterprise-dental-complete-clinical-board`  
**Migration:** NONE (reuses `20261110120000_d5a5_enterprise_dental_complete_clinical_board`)  
**Commit / push / deploy:** STOP — not done

## Production defect reproduced

OPEN Dental encounter still showed « Lecture seule » on Parodontie / Plan / Procédures.

## Root causes (stacked)

1. **Capability:** profession group prefers ADMIN over PROVIDER → ADMIN+PROVIDER lost clinical write caps (fixed D5A.5A; retained).
2. **Workspace lock drift:** UI OR’d `isEncounterLocked` (SIGNED evaluation) into perio/plan/procedures/odontogram, forcing Lecture seule even when API `canEdit=true`.
3. **Opaque denial:** ADMIN-only users (common pilot login) correctly lack PROVIDER caps but UI only said « Lecture seule » without explaining PROVIDER is required.
4. **History:** Dental only linked out to patient chart — not inline enterprise history authoring.

## Authorization architecture

Single projection: `resolveEnterpriseDentalEncounterAuthoring` (shared)  
API: `GET /dental-care/encounters/:id/authoring` + domain `canEdit` / `readOnlyReason`  
Guard attaches `dentalCareRoleCodes` for the same resolver.

Invariant: PROVIDER (or ADMIN+PROVIDER) + dental enabled + OPEN Dental = writable.  
ADMIN-only / FRONT_DESK / BILLING / SUPER_ADMIN-alone = clinical read-only.

## Medical History

Inline editor in Dental → `PATCH /patients/:id/clinical-history-profile/sections/*` + allergy modal.  
Encounter ack remains `dentalHistoryReviewV1`. No `DentalMedicalHistory`.
