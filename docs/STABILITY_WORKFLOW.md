# Stability workflow (Medora-S)

Process guardrails to avoid losing working clinical features between refactors. **No substitute for code review** — use with discipline.

## Branch strategy

| Branch pattern | Purpose |
|----------------|---------|
| `main` | **Stable only** — merges from `feature/*`, `hotfix/*`, or `recovery/*` after smoke tests pass. |
| `feature/clinical-*` | Clinical workflows: encounters, orders, worklists, triage, pathways, nursing, results. |
| `feature/ui-*` | UI-only changes (still no redesign mixed with workflow in the same branch). |
| `hotfix/*` | Urgent production fixes; minimal scope. |
| `recovery/*` | Restoring regressions; prefer small PRs; document what was restored. |

## Rules (non-negotiable)

1. **Never mix** workflow / clinical behavior changes with **major UI redesign** in the same branch. Split PRs.
2. **Every working milestone must be committed** (small commits > one huge blob).
3. **Before any risky change**, create a **checkpoint commit** (see `scripts/pre-change-checkpoint.sh`).
4. **Do not merge to `main`** unless **smoke tests** pass (see `docs/SMOKE_TEST_CHECKLIST.md`).
5. **Major UI redesign**: design in **Figma** (or your agreed design tool) **first**, then implement in `feature/ui-*` — not the other way around.

## Workspace & cache hygiene

- **Always run `./scripts/check-workspace-root.sh` before risky work** (merges, big refactors, `pnpm install` troubleshooting) so commands run from the real monorepo root — not `apps/web`, not a parent folder with another lockfile.
- **Always clean `apps/web/.next`** after **shell / layout / App Router** refactors, middleware changes, or when the UI looks “stuck” on an old build (`rm -rf apps/web/.next` or `./scripts/dev-reset.sh` / `./scripts/start-medora-dev.sh --clean-next`).
- Details: [STARTUP_RULES.md](./STARTUP_RULES.md).

## Recovery steps (exact commands)

When something broke and you need to compare or roll back:

```bash
# 1) What changed?
git status
git diff

# 2) Discard uncommitted changes to a file (careful: destructive)
git restore path/to/file

# 3) Discard all uncommitted changes in tracked files
git restore .

# 4) Switch branch (stash or commit first if you have local work)
git checkout other-branch

# 5) Tag a known-good state for later comparison
git tag -a restore-2025-03-18-clinical -m "Stable: nursing + worklist detail"
git push origin restore-2025-03-18-clinical   # optional, share tag
```

List tags: `git tag -l 'restore-*'`

## Local development — startup (from repo root)

```bash
pnpm install

# Database (if using Docker Postgres from repo)
cp infra/docker/.env.example infra/docker/.env   # once
docker compose -f infra/docker/docker-compose.yml up -d

# API
cp apps/api/.env.example apps/api/.env           # once, then edit secrets
pnpm --filter @medora/api prisma:generate
pnpm --filter @medora/api prisma:migrate
pnpm --filter @medora/api prisma:seed            # optional demo data
pnpm --filter @medora/api dev
# Default API: http://localhost:3000 — see apps/api for port

# Web (separate terminal)
rm -rf apps/web/.next                            # if stale Next cache
PORT=3002 pnpm --filter @medora/web dev
```

Shared package: if you change `packages/shared`, rebuild consumers as needed:

```bash
pnpm --filter @medora/shared build
# or from root, if configured:
pnpm build
```

## Prisma / migrations (API)

From repo root:

```bash
pnpm --filter @medora/api prisma:generate
pnpm --filter @medora/api prisma:migrate
pnpm --filter @medora/api prisma:seed
```

Create migration after schema change (in `apps/api` context — see `apps/api/package.json` for exact script names).

## Clear Next.js cache (web)

```bash
rm -rf apps/web/.next
```

Or use `scripts/dev-reset.sh`.

## Demo / QA role checklist (quick)

Use **separate users** or facility-role assignments per role. See **`docs/SMOKE_TEST_CHECKLIST.md`** for the full matrix.

Minimum before merging clinical changes:

- [ ] **ADMIN** — login, admin area loads
- [ ] **PROVIDER** — encounter open, create order (lab + med intent)
- [ ] **RN** — encounter, triage/vitals, nursing tab if applicable
- [ ] **LAB** — lab worklist, order detail from **Voir**
- [ ] **RADIOLOGY** — rad worklist, order detail from **Voir**
- [ ] **PHARMACY** — pharmacy worklist, order detail from **Voir**
- [ ] **FRONT_DESK** — registration / allowed encounters list
- [ ] **BILLING** — billing route allowed (no 403 loop)

## Scripts in this repo

| Script | Purpose |
|--------|---------|
| `scripts/check-workspace-root.sh` | Fail fast if not at monorepo root |
| `scripts/verify-stability.sh` / `pnpm verify` | Shared build + web/API typecheck + `prisma generate` (no e2e) |
| `scripts/start-medora-dev.sh` | Optional `--clean-next`, then print API/Web/shared commands |
| `scripts/dev-reset.sh` | Remove `.next`, print restart hints |
| `scripts/pre-change-checkpoint.sh` | Interactive checkpoint commit |
| `scripts/post-change-smoke-check.sh` | Print smoke-test reminders |
| `scripts/create-stability-tag.sh` | Create `medora-stable-YYYYMMDD-<slug>` tag |

## Related

- [RELEASE_CHECKPOINTS.md](./RELEASE_CHECKPOINTS.md)
- [RECOVERY_PLAYBOOK.md](./RECOVERY_PLAYBOOK.md)
- [PRE_MERGE_GATE.md](./PRE_MERGE_GATE.md)
- [STARTUP_RULES.md](./STARTUP_RULES.md)
- [SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md)
