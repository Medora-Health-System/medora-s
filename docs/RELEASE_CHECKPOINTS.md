# Release & checkpoints (Medora-S)

Lightweight discipline so **working states** stay identifiable in Git history and tags.

## What qualifies as a checkpoint?

A **checkpoint** is a **commit** (or small series) where a **vertical slice** is known-good in your environment:

- Smoke-tested for the relevant roles (see `docs/SMOKE_TEST_CHECKLIST.md`).
- No known **blocker** for that slice (e.g. “cannot open encounter”, “worklist detail broken”).
- Prefer **small, descriptive commits** over one huge “WIP”.

Examples of good checkpoint themes:

- `checkpoint: registration stable`
- `checkpoint: encounter stable`
- `checkpoint: lab routing stable`
- `checkpoint: pharmacy stable`
- `checkpoint: nursing assessment + Notes Inf labels`

Use the prefix **`checkpoint:`** in the **first line** of the commit message so `git log --grep=checkpoint` stays useful.

## Naming convention — checkpoint commits

Format (subject line):

```text
checkpoint: <short description in English or French>
```

Examples:

```text
checkpoint: lab worklist detail loads
checkpoint: ordonnance destination admin / pharmacie
checkpoint: order labels catalog priority
```

Optional body: ticket ID, what was tested, known follow-ups.

## Naming convention — stability tags

Immutable markers for **known-good** points (often on `main` after merge, or on a release branch).

**Format:**

```text
medora-stable-YYYYMMDD-<slug>
```

| Part | Meaning |
|------|---------|
| `medora-stable-` | Fixed prefix |
| `YYYYMMDD` | **UTC or local date** — pick one convention per team and stick to it |
| `<slug>` | Short kebab-case: `registration`, `encounter`, `lab-routing`, `pharmacy`, `pre-demo-2025` |

**Examples:**

- `medora-stable-20250318-lab-routing`
- `medora-stable-20250320-pharmacy`
- `medora-stable-20250401-demo-haiti`

**Create a tag** (interactive helper):

```bash
./scripts/create-stability-tag.sh
```

Then push (see script output):

```bash
git push origin <tagname>
# or
git push origin --tags
```

## When to create a **recovery** branch

Create a branch named e.g. `recovery/<topic>` when:

- You must **restore** behavior from an older commit/tag **without** rewriting `main`.
- You want to **cherry-pick** or replay fixes while keeping `main` protected.

Do **not** force-push `main` to “go back”; prefer recovery branch + PR.

## When to cut a **release** branch

Use a **release branch** (e.g. `release/v0.3.0` or `release/2025-03-demo`) when:

- You freeze a candidate for **demo, staging, or production**.
- Only **bugfixes** and release chores go in; new features wait for the next cycle.

Merge back to `main` after release, or tag the release commit from this branch.

## When to **avoid** merging

Do **not** merge into `main` (or do not promote a release) when:

- **Smoke tests** for critical roles have not been run (`docs/SMOKE_TEST_CHECKLIST.md`).
- **Migrations** are not applied / not reviewed for production.
- The same PR **mixes** large **UI redesign** with **clinical logic** — split first (`docs/STABILITY_WORKFLOW.md`).
- CI / build is red (shared, API, web builds).
- You are unsure of the **workspace root** or have **nested lockfiles** — fix environment first (`docs/STARTUP_RULES.md`).

## Related

- `scripts/create-stability-tag.sh`
- `scripts/pre-change-checkpoint.sh` (WIP commit before risky edits)
- [STABILITY_WORKFLOW.md](./STABILITY_WORKFLOW.md)
- [RECOVERY_PLAYBOOK.md](./RECOVERY_PLAYBOOK.md)
- [PRE_MERGE_GATE.md](./PRE_MERGE_GATE.md)
