# MEDUI.RES.2A.1 — Canonical diagnostic result template restoration + acknowledgement reliability

**Status:** Implementation complete in worktree (uncommitted). **Do not commit / push / PR / merge / deploy** until explicitly authorized.

## Verdict

**CERTIFY WITH CONDITIONS** — automated + code-path proof complete; interactive Nest/browser UAT for ack click-count and print was **NOT AVAILABLE** in this session (DB execute probe failed schema URL wiring; Nest live click path not re-run). Prior RES.2A live CBC row with `observations[]` remains the data authority proof.

## Root causes (audit)

1. **Lab/Rad chart smash:** `ORDER_ITEM_RESULT_SUMMARY_SELECT` omitted `resultData`; encounter Results + chart summary therefore fed only `resultText` into `ClinicalResultViewer`, skipping structured `observations[]` / `report{}` even when present in DB.
2. **Ack multi-click:** Successful POST was followed by GET `/encounters/:id/orders` that hit **10s GET dedupe TTL cache** (stale unacked payload), wiping UI acknowledgement; busy cleared in `finally` so the button reappeared.

## Fixes

- Include lightweight `resultData` on SUMMARY + chart summary; strip attachment `dataBase64` via `projectResultDataForListRead`.
- Always render canonical 5-column Lab table (Parameter | Result | Flag | Reference range | Units).
- Keep shared Imaging sections with emphasized Impression.
- Ack: optimistic local patch + dedupe invalidate + mutable-path TTL=0 + API returns `acknowledgedByDisplayFr`.

## Governance

| Item | Value |
|------|-------|
| Prisma change | NO |
| Migration | NO |
| Seed | NO |
| New Result store | NO |
| New renderer engine | NO |
| Facility-specific logic | NO |
| ED redesign | NO |
