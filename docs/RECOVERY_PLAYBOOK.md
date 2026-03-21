# Recovery playbook (Medora-S)

Operational steps to **restore** files or compare history **without** losing `main`. Commands assume repo root; run `./scripts/check-workspace-root.sh` first.

## Recover a **single file** from Git

From **current branch** (discard local changes to match last commit):

```bash
git restore path/to/file
```

From **another commit** (e.g. `main` or a tag):

```bash
git show main:apps/web/app/app/encounters/[id]/page.tsx > /tmp/page.tsx   # inspect
git checkout main -- apps/web/app/app/encounters/[id]/page.tsx
```

From a **tag**:

```bash
git checkout medora-stable-20250318-lab-routing -- apps/web/src/lib/orderItemDisplayFr.ts
```

Then review `git diff`, test, and commit.

**Paths with brackets** must be quoted in zsh/bash:

```bash
git checkout main -- 'apps/web/app/app/encounters/[id]/page.tsx'
```

## Recover a **folder**

Same idea — path is a directory:

```bash
git restore apps/web/src/components/worklists/
```

Or from a revision:

```bash
git checkout medora-stable-20250318-lab-routing -- apps/web/src/components/worklists/
```

## Compare **current branch** vs **stable** (`main`)

```bash
git fetch origin
git diff main...HEAD
git log main..HEAD --oneline
```

One-dot vs two-dot:

- `main..HEAD` — commits on `HEAD` not in `main`
- `main...HEAD` — symmetric diff (useful for merge bases)

Compare **one file** across branches:

```bash
git diff main:apps/web/src/lib/orderItemDisplayFr.ts HEAD:apps/web/src/lib/orderItemDisplayFr.ts
```

## Find the **last good version** with `git log` / `git diff`

Search commit messages:

```bash
git log --oneline --grep='checkpoint'
git log --oneline -- apps/web/src/lib/orderItemDisplayFr.ts
```

Inspect history of a file:

```bash
git log -p -- apps/web/src/lib/orderItemDisplayFr.ts
```

Show file at a commit:

```bash
git show abc1234:apps/web/src/lib/orderItemDisplayFr.ts | head -80
```

Binary search (manual): checkout an **old** commit in a **detached** state, test, note good/bad, then narrow (or use `git bisect` for regressions).

## Create a **recovery branch** without touching `main`

Stay on your work; create a branch from a **known-good** point:

```bash
git fetch origin
git checkout -b recovery/lab-detail main
# or from a tag:
git checkout -b recovery/lab-detail medora-stable-20250318-lab-routing
```

Cherry-pick fixes from another branch:

```bash
git cherry-pick <commit-sha>
```

Push and open a PR:

```bash
git push -u origin recovery/lab-detail
```

**Do not** rewrite `main` with `git reset --hard` on a shared repo unless the team explicitly allows it.

## Related

- [RELEASE_CHECKPOINTS.md](./RELEASE_CHECKPOINTS.md)
- [STABILITY_WORKFLOW.md](./STABILITY_WORKFLOW.md)
- [STARTUP_RULES.md](./STARTUP_RULES.md)
