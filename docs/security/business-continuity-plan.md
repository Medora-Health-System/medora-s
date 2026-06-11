# Business Continuity Plan

**Program:** GOV.4  
**Version:** 1.0 (draft)

---

## 1. Purpose

Maintain essential Medora services during disruptive events (outage, vendor failure, key personnel unavailability).

---

## 2. Critical business functions

| Function | Priority | Max tolerable downtime |
|----------|----------|------------------------|
| Clinical chart access (read) | **Critical** | 4 hours |
| Medication administration (write) | **Critical** | 4 hours |
| Order entry | **High** | 8 hours |
| Billing export | **Medium** | 24 hours |
| Admin / reporting | **Low** | 48 hours |

---

## 3. Scenarios

| Scenario | Response |
|----------|----------|
| **Railway DB outage** | DR plan — restore from backup |
| **Vercel outage** | API may remain up; communicate Customer may use API directly if emergency path documented |
| **API deployment bad release** | Rollback git SHA on Railway |
| **Key person unavailable** | Cross-train second `MEDORA_SUPER_ADMIN`; document secrets access |
| **Regional internet loss (Haiti clinic)** | Customer offline mode (future); today: local downtime procedures at clinic |

---

## 4. Communication

- Customer status notification via [email / status page TBD]
- Internal war room per incident-response-plan.md

---

## 5. Minimum staffing

At least **two** personnel capable of:

- Railway/Vercel deploy
- Database restore drill
- Secret rotation (with runbook)

---

## 6. Plan maintenance

Review quarterly with DR drill results.

---

**Related:** `disaster-recovery-plan.md`, `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`
