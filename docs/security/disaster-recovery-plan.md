# Disaster Recovery Plan

**Program:** GOV.4  
**Version:** 1.0 (draft)  
**RTO target:** 4 hours (initial); refine per SLA  
**RPO target:** 24 hours (Railway backup default — confirm with vendor)

---

## 1. Scope

Recovery of Medora production:

- PostgreSQL clinical database (Railway)
- API service (Railway)
- Web BFF (Vercel)

---

## 2. Architecture dependencies

| Component | Provider | Stateful? | Recovery method |
|-----------|----------|-----------|-----------------|
| Postgres | Railway | **Yes** | Point-in-time / clone restore |
| API | Railway | No | Redeploy container from git SHA |
| Web | Vercel | No | Redeploy from git SHA |

---

## 3. Backup strategy

- **Database:** Railway automated backups (operator responsibility)
- **Application state:** None on web tier; sessions in DB + JWT
- **Secrets:** Railway/Vercel env vars — maintain secure offline vault copy

**Env gates:**

- `MEDORA_BACKUP_POLICY_CONFIRMED=true`
- `MEDORA_LAST_RESTORE_DRILL_AT` — ISO timestamp

**Reference:** `docs/ER_RESTORE_DRILL_CHECKLIST.md`, `backup-readiness.service.ts`

---

## 4. Recovery procedures

### 4.1 Database corruption / loss

1. Declare SEV-1 incident (IR plan)
2. Stop writes if partial corruption suspected
3. Clone Railway Postgres to new instance from latest clean backup
4. Update `DATABASE_URL` on API service
5. Run migration verify (`prisma migrate deploy`)
6. Smoke test: auth, patient chart read, audit write
7. Resume traffic; monitor error rates

### 4.2 API region failure

1. Redeploy API to healthy region (Railway config)
2. Verify DB connectivity
3. Check CORS and cookie domains

### 4.3 Web failure

1. Rollback Vercel deployment to last known good
2. Verify BFF → API connectivity

---

## 5. Restore drill

| Requirement | Frequency |
|-------------|-----------|
| Full clone-restore to staging | **Semi-annual minimum** |
| Document evidence | Ticket + update `MEDORA_LAST_RESTORE_DRILL_AT` |
| Validate JWT/chart signing secrets mirrored | Per checklist |

---

## 6. RTO / RPO refinement

Before first hospital SLA:

- Confirm Railway backup retention and PITR
- Set contractual RTO/RPO in MSA
- Automate health checks post-restore

---

## 7. Exclusions

- Customer-local workstation recovery
- Clearinghouse vendor outages (separate playbook)

---

**Owner:** Platform operations (`MEDORA_SUPER_ADMIN`)
