# Pre-merge gate (Medora-S)

Checklist before merging to **`main`** or promoting a **release** candidate. Adapt to your CI; run locally if CI is partial.

## One command — build + typecheck (recommended)

From the **monorepo root**, run **before every merge**:

```bash
pnpm verify
```

Equivalent to `./scripts/verify-stability.sh` (shared build, web `tsc --noEmit`, `prisma generate` for the API package, then api `tsc --noEmit`). No database migrations or e2e.

**Granular** (same steps, run separately if debugging):

```bash
pnpm verify:shared
pnpm verify:web
pnpm verify:api
```

## Build & types

- [ ] **Workspace root** verified (`./scripts/check-workspace-root.sh`) — *also enforced by `pnpm verify`*
- [ ] **Stability verify** — `pnpm verify` passes
- [ ] **`@medora/shared` build passes**  
  `pnpm --filter @medora/shared build`
- [ ] **Web typecheck passes**  
  `pnpm --filter @medora/web exec tsc --noEmit`
- [ ] **Web build passes**  
  `pnpm --filter @medora/web build`
- [ ] **API typecheck passes**  
  `pnpm --filter @medora/api exec tsc --noEmit -p tsconfig.build.json`  
  *(or rely on `nest build` below if your team skips standalone `tsc`)*
- [ ] **API build passes**  
  `pnpm --filter @medora/api build`

## Database

- [ ] **Prisma client generated** (after schema changes)  
  `pnpm --filter @medora/api prisma:generate`
- [ ] **Migrations** applied in the target environment (dev: `prisma:migrate`; prod-style: `migrate deploy` per your runbook)

## Quality & safety

- [ ] **Smoke tests** executed for impacted roles — `docs/SMOKE_TEST_CHECKLIST.md`
- [ ] **No mixed concerns** in the same merge: large **UI redesign** + **clinical / workflow logic** → split PRs first (`docs/STABILITY_WORKFLOW.md`)
- [ ] **No accidental nested lockfiles** under `apps/*` (`docs/STARTUP_RULES.md`)

## Optional but recommended

- [ ] **Checkpoint or stability tag** exists for this milestone (`docs/RELEASE_CHECKPOINTS.md`, `scripts/create-stability-tag.sh`)
- [ ] **`.next` cleaned** if the PR touched App Router / layout / shell (`rm -rf apps/web/.next`)

---

**Approver**: _________________  **Date**: _________________
