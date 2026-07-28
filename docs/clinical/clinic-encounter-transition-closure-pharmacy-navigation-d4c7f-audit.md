# MEDUI.D4C.7F — Audit

**Certification:** MEDUI.D4C.7F  
**Branch:** `d4c7f-clinic-encounter-transition-closure-pharmacy-navigation`  
**Base:** `origin/main` @ `b3e5d1ba3` (includes D4C.7E via PR #78)  
**Date:** 2026-07-28  
**Package manager:** npm workspaces (`package-lock.json`; AGENTS.md)

## 0. Git verification

| Check | Result |
|-------|--------|
| `git fetch origin` | OK |
| Branch | `d4c7f-clinic-encounter-transition-closure-pharmacy-navigation` |
| Created from | `origin/main` (D4C.7E present on main) |
| HEAD | `b3e5d1ba3` (+ local D4C.7F working tree) |
| `origin/main` | `b3e5d1ba3` |
| Ancestors | D4C.7E, 7D, 7C/7B, 7A, 7, 6 present |
| Unrelated dirty tree at start | Clean before branch create |

## Production defects

| ID | Defect | Root cause | Fix |
|----|--------|------------|-----|
| A | Hard close on pending orders + `[object Object]` | `ACTIVE_ORDERS` hard blocker; ambulatory silent-ack missed `errorCode`; `blockers.join` on objects | Typed `ENCOUNTER_PENDING_ITEMS`; modal + ack; serialize `b.message` |
| B | Stale action button | Weak busy guard; no pending labels; PATCH without cache invalidation | Immediate disable/pending FR labels; server-confirmed state; invalidate on transition |
| C | Question-mark icons | Exact href map missed clinic-care rewrites + query strings | Pathname normalize + aliases |
| D | Clinic Admin Pharmacy incomplete | Landing-only ambulatory rewrite; broken icons | Full pharmacy path rewrite when `pharmacyEnabled` |

## Closure policy classification

| Guard | Class | Notes |
|-------|-------|-------|
| Active infusion (START without STOP) | **Non-overridable** | `ACTIVE_INFUSION_RUNNING` |
| Concurrent close / version conflict | **Non-overridable** | Existing API conflict |
| Pending lab / imaging / meds / care (ambulatory) | **Overridable pending** | Modal + `acknowledgePendingItems` (PROVIDER) |
| `ACTIVE_ORDERS_UNRESOLVED` (ER/UC) | **Overridable via existing disposition ack** | Preserved for ED cert/UI |
| Unsigned provider docs / vitals / discharge blockers | **Existing disposition ack** | Not Clinic-only invention |
| Critical-result immediate | **Not currently a close blocker** | Documented; no new Clinic safety |
| Billing incomplete / external Rx / open follow-up | **Informational** | Do not block close |

## Audit structure

Generic `AuditLog.metadata` on `ENCOUNTER_CLOSE` is sufficient (no migration):

- `pendingItemsOverride`, `acknowledgementVersion`, `pendingItemCategories`, `pendingItemIds`, `pendingItemsOverrideReason`, `actorRole`, status fields

Admin summarizer allowlist extended; `close_override` tag includes pending override.

## Pharmacy

- No Clinic Pharmacy engine
- ADMIN + `pharmacyEnabled` / PHARMACY → full enterprise routes
- Admin operational ≠ pharmacist verify (`D4C7F_ADMIN_PHARMACY_CLINICAL_AUTHORITY`)
- Alerts remain off shared Clinical Board (D4C.7B)

## STOP conditions checked

- No Clinic-only encounter status
- No bypass of `EncountersService.close`
- No delete/silent-complete of pending orders
- No second Pharmacy dashboard
- No setTimeout refresh hack
- No new icon package
