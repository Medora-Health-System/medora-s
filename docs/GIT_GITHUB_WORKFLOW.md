# Git & GitHub workflow (Medora-S)

Strict, low-friction habits so **working code** is rarely lost. Complements [STABILITY_WORKFLOW.md](./STABILITY_WORKFLOW.md), [RELEASE_CHECKPOINTS.md](./RELEASE_CHECKPOINTS.md), and [RECOVERY_PLAYBOOK.md](./RECOVERY_PLAYBOOK.md).

---

## Core rules

### Never work directly on `main`

- `main` is the **integration line** for known-good history. Do **not** commit experimental or half-finished work there.
- Always use a **feature branch**; merge via PR (or fast-forward only when policy allows and CI is green).

### Always create a branch from a **stable baseline**

- Prefer branching from **up-to-date `origin/main`** (or a **release/stability tag** if you are patching a frozen line):

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b <type>/<short-description>
```

- If `main` is noisy, branch from the **last tag** you trust: `git checkout -b fix/foo medora-stable-YYYYMMDD-slug`

### One topic per branch

- **One** user-visible theme or fix (e.g. “lab acknowledge”, “encounter vitals”, “RBAC route guard”).
- Split unrelated changes into **separate branches/PRs** — easier review, safer revert, cleaner `git bisect`.

### Open a PR even for solo work when the branch is **risky**

- Risky = touches **auth**, **orders**, **clinical paths**, **migrations**, **large refactors**, or **many files**.
- A PR gives you **diff review**, **CI signal** (if any), and a **merge checkpoint** — even if you merge your own PR after self-review.

### Commit often

- Small commits with **clear messages** beat one giant “WIP”.
- Use `checkpoint:` in the subject when saving a known-good slice ([RELEASE_CHECKPOINTS.md](./RELEASE_CHECKPOINTS.md)).

### Checkpoint before **large Cursor (or AI) edits**

- Run `./scripts/pre-change-checkpoint.sh` or commit manually **before** multi-file AI refactors.
- If the edit goes wrong, you can **revert** or **reset** to the checkpoint without guessing.

### Tag known-good states

- After a vertical slice is smoke-tested, create a stability tag: `./scripts/create-stability-tag.sh`  
  Format: `medora-stable-YYYYMMDD-<slug>` ([RELEASE_CHECKPOINTS.md](./RELEASE_CHECKPOINTS.md)).

### Push before dangerous refactors

- `git push -u origin <branch>` so your work exists **off-machine** before risky rebases, `reset`, or history surgery.

### Use **recovery branches**, not panic edits on `main`

- If something broke, **do not** force “fixes” straight on `main` under stress.
- Create `recovery/<topic>` from a **good commit or tag**, cherry-pick or restore files, then PR back. See [RECOVERY_PLAYBOOK.md](./RECOVERY_PLAYBOOK.md).

---

## How to recover a lost feature from GitHub history

Use this when code “disappeared” after a merge, rebase, or bad edit — the history is usually still on **GitHub** or in **local reflog**.

### 1. Find commits that touched a path

```bash
git fetch origin
git log --oneline -- path/to/file.ts
git log --oneline -- apps/web/src/components/foo/
```

### 2. Inspect a file at a specific commit

```bash
git show <commit>:path/to/file.ts | less
# Quote paths with special characters:
git show <commit>:'apps/web/app/app/encounters/[id]/page.tsx' | head -100
```

### 3. Restore that version of the file into your working tree

```bash
git checkout <commit> -- path/to/file.ts
git checkout <commit> -- apps/web/src/components/foo/
```

Review with `git diff`, test, then commit on a **branch** (not directly on `main` if policy forbids).

### 4. Compare your branch to `origin/main`

```bash
git fetch origin
git log origin/main..HEAD --oneline
git diff origin/main...HEAD
```

See what you have that `main` does not, and the reverse:

```bash
git log HEAD..origin/main --oneline
```

### 5. Create a recovery branch (does not touch `main` locally until you merge)

```bash
git fetch origin
git checkout -b recovery/<feature-name> origin/main
# restore files from a good commit:
git cherry-pick <commit-sha>
# or:
git checkout <good-commit> -- path/to/restored/files
```

Push and open a PR: `git push -u origin recovery/<feature-name>`.

### If the commit only exists on GitHub

- Find the commit on the GitHub UI (file history / compare), note the **full SHA**, then locally: `git fetch origin` and `git show <sha>` / `git cherry-pick <sha>`.

---

## Related

- [RECOVERY_PLAYBOOK.md](./RECOVERY_PLAYBOOK.md) — file/folder restore, tags, diff patterns
- [RELEASE_CHECKPOINTS.md](./RELEASE_CHECKPOINTS.md) — checkpoints and tags
- [PRE_MERGE_GATE.md](./PRE_MERGE_GATE.md) — before merging to `main`
- GitHub PR template: `.github/pull_request_template.md`
