# Change Management Policy

**Program:** GOV.4  
**Version:** 1.0 (draft)

---

## 1. Purpose

Control production changes to reduce security and clinical safety risk.

---

## 2. Scope

Application releases, database migrations, infrastructure config, secret rotation.

---

## 3. Change categories

| Category | Examples | Approval |
|----------|----------|----------|
| **Standard** | Bug fix, UI copy | Peer review + CI pass |
| **Significant** | Auth, RBAC, MAR governance, schema migration | Review + regression tests |
| **Emergency** | Active incident hotfix | IC approval; retrospective review within 48h |

---

## 4. Process

1. Change ticket / PR description with risk summary
2. Code review and automated tests (`pnpm verify` where applicable)
3. Staging validation (if available)
4. Production deploy per `docs/DEPLOYMENT_RUNBOOK.md`
5. Post-deploy smoke test (auth, chart read, critical workflow)
6. Monitor system-health for 24h after significant changes

---

## 5. Database migrations

- Unique timestamp prefixes (see prisma-migrations rule)
- No destructive migrations on clinical tables without backup
- `prisma migrate deploy` on Railway after merge
- Never `migrate reset` on production

---

## 6. Rollback

- Web: Vercel instant rollback
- API: redeploy prior SHA
- DB: forward-fix preferred; restore DR if catastrophic

---

## 7. Documentation

Significant clinical or security changes update relevant runbooks and compliance matrix.

---

## 8. Freeze windows

Optional change freeze during customer go-live — notify ops calendar.

---

**Reference:** `docs/DEPLOYMENT_RUNBOOK.md`, `docs/GIT_GITHUB_WORKFLOW.md`
