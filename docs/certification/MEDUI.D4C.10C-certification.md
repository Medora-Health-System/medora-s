# MEDUI.D4C.10C — Certification Report

**Title:** Enterprise Encounter Creation Race Hardening & Atomic Duplicate Prevention  
**Date:** 2026-08-15  
**Branch:** `d4c10a-enterprise-encounter-service-line-provenance` (same worktree as D4C.10A/10B)  
**Base:** `origin/main` @ `5101eb5eb`

---

## Verdict

**CERTIFIED (code + focused + PostgreSQL concurrent tests + local builds)** — commit/push/deploy gates remain STOP.

Migration: **NONE**

---

## Race root cause

TOCTOU on `GENERAL_CREATE`: concurrent requests for the same facility/patient/service/episode could both pass `evaluateConcurrentEncounterCreate` before either insert committed.

## Atomicity mechanism

`pg_advisory_xact_lock` inside Prisma `$transaction`, keyed by facility + patient + serviceLine + episode (`UNBOUND` | `APPT:{id}`).

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing | Reused | Extended | Duplicate Prevented |
|--------|----------|--------|----------|---------------------|
| Encounter (enterprise) | ✔ | ✔ | race lock on create | ✔ no second engine |
| Concurrent policy D4C.10B | ✔ | ✔ | — | ✔ |
| serviceLine D4C.10A | ✔ | ✔ | — | ✔ |
| Dental-specific lock | — | — | — | ✔ none created |
| Hospital D3E.6D | ✔ | ✔ | untouched | ✔ |
| Patient / Facility | ✔ | ✔ | facilityId in lock | ✔ |
| Billing create path | ✔ | ✔ | no create billing | ✔ no double create side effects |
| AuditLog ENCOUNTER_CREATE | ✔ | ✔ | only on actual create | ✔ |

---

## Behavior matrix

| Scenario | Outcome |
|----------|---------|
| Same-service unbound concurrent | One OPEN row; second reuses / same id |
| Distinct service lines concurrent | Two OPEN rows allowed |
| Same appointment concurrent check-in | One encounter |
| Different appointment IDs | Two Clinic encounters allowed |
| Cross-facility | No lock/reuse sharing |
| Legacy null serviceLine | Unchanged (D4C.10B) |

---

## Validation (local)

| Check | Status |
|-------|--------|
| shared race + policy + D3E.6D | ✔ 21 |
| API race unit + lock util + postgres concurrent | ✔ 34 (incl. 7 postgres) |
| D4C.10A API | ✔ 8 |
| web D3E.6D + Dental D5A.3/3B | ✔ 19 |
| `@medora/shared` / `@medora/api` / `@medora/web` build | ✔ |
| web `tsc --noEmit` | ✔ |
| `prisma validate` | ✔ |
| Migration (10C) | **NONE** |
| Seed | Unchanged |
| `git diff --check` | ✔ |
| Commit / push / deploy | **STOP** |

---

## Stop gate

DO NOT COMMIT / PUSH / DEPLOY (per prompt).
