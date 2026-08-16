# MEDUI.D5A.5B Manual UAT Results

**Date:** 2026-08-16  
**Environment:** Local (`localhost:3001` API + `localhost:3002` web)  
**Facility:** Clinique Bon Samaritain (Dental enabled for UAT)  
**Actor (A–K):** `provider@medora.local` (PROVIDER)  
**Actor (L):** `admin@medora.local` (ADMIN only)  
**Encounter:** OPEN `serviceLine=DENTAL`, `providerDocumentationStatus=SIGNED`  
**Harness:** `apps/api/scripts/uat-d5a5b-dental-authoring.ts` (authenticated API = same authoring policy as UI)

| Test | Result | Notes |
|------|--------|-------|
| A Authoring authority | **PASS** | `isReadOnly=false`; perio/plan/procedures/odontogram `canEdit=true` despite SIGNED evaluation |
| B Medical history inline | **PASS** | Enterprise PMH + allergy PATCH from Dental context; reload confirms same patient profile |
| C History review | **PASS** | `dentalHistoryReviewV1` reviewed + note persist on encounter |
| D Odontogram | **PASS** | Single + bulk ToothFinding records (per-tooth); reload |
| E Periodontal | **PASS** | Status/stage/grade/extent/narrative + 6 sites; still editable after save |
| F Treatment plan | **PASS** | Benefits/risks/alternatives/items; reload editable |
| G Procedures | **PASS** | Performed procedure persist + list |
| H Overview | **PASS** | clinical-record projects history review, odontogram, perio, plan, procedures, documents |
| I Print | **PASS** | chart-export HTML (~9KB) with dental content |
| J Signing independence | **PASS** | Covered by A (SIGNED eval, board still writable) |
| K Close | **PASS** | Close with D4C.7J ack → perio `canEdit=false` |
| L ADMIN negative | **PASS** | `readOnlyReason=NO_CLINICAL_CAPABILITY`; clinical write denied |

## Verdict

**Manual UAT A–L: PASS (local authenticated harness).**

Recommended certification upgrade: **MEDUI.D5A.5B — CERTIFIED** for local authoring gate, pending any additional browser walkthrough the clinic team wants on the same PROVIDER account.

## Preconditions used

- Dental enabled on facility service lines for local UAT  
- PROVIDER membership present  
- OPEN Dental encounter with SIGNED evaluation (independence proof)

## STOP

No commit / push / deploy performed as part of this UAT run.
