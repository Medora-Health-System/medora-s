# Enterprise ER Summary V2 — Clinical Record Layout

Phase: `MEDUI.SUMMARY.ENTERPRISE_PHASE_3B` / `3C`  
Status: **Opt-in only** — legacy Summary remains default until explicit production cutover approval.

## What this feature does

When enabled, the ER **Summary** tab renders `EncounterClinicalRecordSummaryView` instead of the legacy stacked layout.

The V2 layout:

- Projects encounter data through `EncounterClinicalRecord` (shared package).
- Shows one primary provider note (signed → saved → draft) with older versions collapsed under **Version history**.
- Shows one row per lab result and one row per imaging report (no order lifecycle noise in the medical summary).
- Shows medication administrations only in MAR.
- Separates operational events into a collapsed **Audit / Operational Timeline** section.
- Keeps closure readiness, print packet, and close workflow **unchanged**.

**No database migration, seed, or API change is required.**

---

## Feature flag

| Variable | Values | Scope |
|----------|--------|-------|
| `NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2` | `true` to enable V2 | Build-time / Vercel env |

Default when unset or not `true`: **legacy Summary**.

### Enable in Vercel (staging or production)

1. Open the Medora web project in Vercel → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2`
   - **Value:** `true`
   - **Environment:** Staging first; Production only after UAT sign-off.
3. Redeploy the web app (env vars are baked at build time for Next.js public vars).

### Test locally

**Option A — `.env.local` (recommended for persistent local testing)**

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2=true
```

Restart `pnpm dev` after changing env.

**Option B — Dev-only browser override (non-production builds only)**

```js
localStorage.setItem("medora:SUMMARY_CLINICAL_RECORD_V2", "true");
location.reload();
```

To disable locally:

```js
localStorage.removeItem("medora:SUMMARY_CLINICAL_RECORD_V2");
location.reload();
```

> **Production safety:** `localStorage` override is **ignored** when `NODE_ENV === "production"`. Only the env var can enable V2 in production.

---

## Disable quickly (rollback)

### Staging / production (Vercel)

1. Set `NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2` to `false` or remove the variable.
2. Redeploy web.
3. All users immediately see legacy Summary on next page load.

**Rollback time:** one redeploy (~minutes). No data migration or DB rollback.

### Local dev

Remove `.env.local` entry or clear `localStorage` key (see above).

---

## Runtime safety

| Condition | Behavior |
|-----------|----------|
| Flag off | Legacy Summary always |
| Flag on + projection succeeds | V2 clinical record Summary |
| Flag on + projection throws | **Silent fallback** to legacy Summary |
| V2 section empty | Empty-state message per section (not blank page) |
| Audit timeline slot crashes | Error banner in audit section only; clinical summary remains |

Parity dev logging (`[EncounterClinicalRecord parity]`) logs **counts and booleans only** — no PHI. Logging is **disabled in production**.

---

## Clinician UAT checklist

Use one test ER encounter per scenario unless noted. Record tester initials, date/time, role, and pass/fail.

### Preconditions

- [ ] Test patient with open ER encounter.
- [ ] Users available: `PROVIDER`, `RN`, `PHARMACY` (if MAR meds used).
- [ ] V2 enabled in staging via `NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2=true`.
- [ ] Legacy fallback verified once by disabling flag and redeploying (or local toggle).

### Chest pain encounter (structural smoke test)

- [ ] Chief complaint and presentation visible in separate sections.
- [ ] Vitals timeline shows documented vitals (or clear empty state).
- [ ] Encounter header shows patient, arrival, room when documented.
- [ ] No duplicate blocks of the same narrative text.

### Lab results

- [ ] Order a lab and record a verified result.
- [ ] Summary shows **one row** per lab study in Results.
- [ ] No acknowledged/started/reviewed lifecycle rows in the medical summary.
- [ ] Link to **Results tab** works for full interactive view.

### Imaging results

- [ ] Order imaging and finalize report.
- [ ] Summary shows **one row** per imaging study.
- [ ] No duplicate imaging narrative in provider or results sections.

### Medication administration (MAR)

- [ ] Administer a medication via MAR.
- [ ] MAR section lists administration only (not order workflow events).

### Nursing notes

- [ ] Document initial nursing assessment and at least one reassessment.
- [ ] Latest nursing note visible; older versions under collapsed **Version history**.

### Provider note

- [ ] Save and sign provider assessment.
- [ ] **One** primary provider note shown (signed label when signed).
- [ ] Older saves collapsed under **Version history** — not repeated in main view.
- [ ] Draft clearly labeled if not signed (not shown as final documentation).

### Procedures

- [ ] Document a procedure.
- [ ] Procedure appears once in Procedures section.

### Disposition

- [ ] Set disposition / discharge documentation.
- [ ] Disposition section shows summary lines (or empty state if not documented).

### Closure readiness

- [ ] Open Summary on open encounter with disposition gaps.
- [ ] `DispositionReadinessBanner` still appears **below** the summary panel (unchanged).
- [ ] Close/certification review flow unchanged.

### Audit timeline

- [ ] Audit / Operational Timeline section is **collapsed by default**.
- [ ] Expanding shows command timeline / operational events.
- [ ] Clinical timeline shows milestones only (not every ack/start event).

### Print packet

- [ ] Print ER packet from closure surface.
- [ ] Print output **unchanged** from pre-V2 behavior (V2 does not alter `printErPacket`).

### Duplicate / safety checks

- [ ] No duplicate provider notes in primary summary.
- [ ] No duplicate lab/radiology rows.
- [ ] No drafts presented as signed final documentation.
- [ ] Disable flag → legacy Summary returns with all data still visible.

### Sign-off

| Role | Name | Date | Pass/Fail |
|------|------|------|-----------|
| Clinical lead | | | |
| Nursing lead | | | |
| Engineering | | | |

---

## Default-on cutover plan (Phase 3D — not approved yet)

**Do not enable default-on until UAT sign-off above is complete.**

Recommended sequence:

1. **Staging UAT** — full checklist pass with V2 env var on staging.
2. **Pilot clinic window** — enable V2 for one facility via env var; monitor for 1–2 weeks.
3. **Rollback drill** — confirm disable + redeploy restores legacy in &lt;15 minutes.
4. **Production enable** — set `NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2=true` in production Vercel env; redeploy.
5. **Legacy retention** — keep legacy code path for **one release cycle** after default-on.
6. **Phase 3D** — after stable period, consider making V2 default in code with env opt-out (`=false`) before removing legacy.

---

## Related code

| File | Role |
|------|------|
| `apps/web/src/features/emergency/summaryClinicalRecordFeatureFlag.ts` | Flag resolution |
| `apps/web/src/features/emergency/summaryClinicalRecordRuntimeSafety.ts` | V2 vs legacy decision |
| `apps/web/src/features/emergency/EncounterClinicalRecordSummaryView.tsx` | V2 UI |
| `apps/web/src/features/emergency/EmergencyVisitSummaryPanel.tsx` | Flag branch + fallback |
| `apps/web/src/features/emergency/useEncounterClinicalRecord.ts` | Projection hook |
| `packages/shared/src/encounters/encounterClinicalRecord*` | Shared projection |

---

## Seed / migration

| Item | Required |
|------|----------|
| Seed | **NO** |
| Migration | **NO** |
| Production migration | **NO** |
