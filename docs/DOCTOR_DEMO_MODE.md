# Doctor & clinic demo mode (Medora-S)

Process so demos to **doctors and clinic leaders** run from a **predictable, stable** state — not from experimental branches or half-finished work.

> **Rule:** If you cannot meet the checklist below, **postpone** the demo or **narrow the story** (fewer roles, read-only walkthrough) rather than improvising on unstable code.

---

## Principles

- **Always demo from a stable branch only** — e.g. `main` after merge, or a **`release/*`** branch, or a commit checked out by **stability tag** (`medora-stable-YYYYMMDD-<slug>`). Never demo from `feat/*` unless the team explicitly tagged that commit as demo-safe.
- **Never demo from an active `recovery/*` branch** — recovery branches are for rescue work; they are not a promise of completeness.
- **Always reset `apps/web/.next` before the demo** if **shell, layout, `app/` tree, or middleware** changed recently — stale Next.js cache causes wrong UI and broken routes (`docs/STARTUP_RULES.md`).
- **Use seeded demo accounts** — passwords and emails come from `apps/api/prisma/seed.ts` (see table below); do not rely on ad-hoc accounts created during testing unless you re-seed or document them.
- **Use fixed demo patients / encounters** — pick **named patients and encounters from seed data** before the demo; write their IDs or search terms on a sticky note so you are not searching blindly live.
- **Do a smoke run ~30 minutes before the demo** — walk the **Demo flow recommended** section once; use `docs/SMOKE_TEST_CHECKLIST.md` and optionally `docs/CLINICAL_REGRESSION_MATRIX.md` for depth.
- **Have one fallback per role** — primary user = seed email for that role; **fallback** = `admin@medora.local` (ADMIN) in a **second browser profile** to unblock RBAC or re-create a session if a role login fails. If policy requires non-admin fallback, create a **backup user per role** in Admin **before** demo day.
- **Do not apply migrations right before the demo** unless **required** for the demo environment to run — migrations are high-risk windows; schedule them earlier and re-smoke after.
- **Create a git tag before the demo** — marks the exact tree you showed: `./scripts/create-stability-tag.sh` → e.g. `medora-stable-YYYYMMDD-doctor-demo` (`docs/RELEASE_CHECKPOINTS.md`).

### Seeded demo logins (after `prisma:seed`)

Password for seeded demo users is printed at end of seed (typically **`Admin123!`** — confirm in seed output / `README`).

| Role | Primary email (seed) |
|------|----------------------|
| ADMIN | `admin@medora.local` |
| FRONT_DESK | `frontdesk@medora.local` |
| RN | `rn@medora.local` |
| PROVIDER (physician) | `provider@medora.local` |
| LAB | `lab@medora.local` |
| RADIOLOGY | `radiology@medora.local` |
| PHARMACY | `pharmacy@medora.local` |
| BILLING | `billing@medora.local` |

---

## Demo flow recommended

Run in this order so the **story** matches the patient journey (registration → care → diagnostics → fulfillment → governance).

1. **Front Desk** — registration / encounter entry as appropriate; show clean handoff to clinical staff.
2. **RN** — vitals / nursing line on an encounter tied to the demo patient.
3. **Physician** — assessment, diagnosis, orders (lab + med intent if in scope).
4. **Lab** — order visible on lab worklist → acknowledge → complete path (and result on chart if in scope).
5. **Radiology** — same pattern for imaging orders.
6. **Pharmacy** — order visible → detail → dispense / history link to patient.
7. **Admin** — user/role sanity check only if time; avoid risky config changes live.

---

## If something breaks 10 minutes before demo

Do **not** hot-patch production logic in the browser or push a rushed commit.

1. **Switch to stable tag or branch** — `git fetch origin && git checkout main && git pull` or `git checkout medora-stable-YYYYMMDD-<slug>` (the tag you created for the demo).
2. **Clean Next.js cache** — `rm -rf apps/web/.next` or `./scripts/dev-reset.sh`
3. **Restart web** — e.g. `PORT=3002 pnpm --filter @medora/web dev` (see `README` for port).
4. **Restart API** — `pnpm --filter @medora/api dev`
5. **Avoid hot refactor** — no “just one quick fix” on `main` minutes before guests arrive.
6. **Hide unfinished features instead of patching live** — skip that screen, use a different seeded encounter, or narrate “coming next sprint” rather than debugging in front of clinicians.

---

## Exact pre-demo commands (local)

Run from **monorepo root** (verify with `./scripts/check-workspace-root.sh`).

```bash
# 1) Know what you are running
git fetch origin
git status
git rev-parse HEAD
# Optional: tag this commit for the demo
./scripts/create-stability-tag.sh
# e.g. medora-stable-$(date +%Y%m%d)-doctor-demo

# 2) Clean Next cache if layout/shell changed recently
./scripts/dev-reset.sh
# or: rm -rf apps/web/.next

# 3) Dependencies (if you pulled or switched branches recently)
pnpm install

# 4) API: generate client + migrate ONLY if not already applied for this DB
pnpm --filter @medora/api prisma:generate
# Avoid last-minute migrate unless required; if you must:
# pnpm --filter @medora/api prisma:migrate

# 5) Seed / DB — only if DB is empty or you need fresh demo data
pnpm --filter @medora/api prisma:seed

# 6) Shared package (if shared code changed)
pnpm --filter @medora/shared build

# 7) Health check (API must be running in another terminal)
curl -sSf http://localhost:3000/health

# 8) Start servers (two terminals)
# Terminal A — API
pnpm --filter @medora/api dev

# Terminal B — Web
PORT=3002 pnpm --filter @medora/web dev
```

**~30 minutes before:** open `docs/SMOKE_TEST_CHECKLIST.md` and click through **Front Desk → … → Admin** for the roles you will show.

---

## Related

- [GIT_GITHUB_WORKFLOW.md](./GIT_GITHUB_WORKFLOW.md)
- [RELEASE_CHECKPOINTS.md](./RELEASE_CHECKPOINTS.md)
- [PRE_MERGE_GATE.md](./PRE_MERGE_GATE.md)
- [SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md)
- [CLINICAL_REGRESSION_MATRIX.md](./CLINICAL_REGRESSION_MATRIX.md)
- [STARTUP_RULES.md](./STARTUP_RULES.md)
