# Access Control Policy

**Program:** GOV.4  
**Version:** 1.0 (draft)

---

## 1. Purpose

Ensure only authorized workforce and users access Medora systems and PHI per minimum necessary principle.

---

## 2. Principles

- **Least privilege** — minimum role for job function
- **Separation of duties** — billing vs clinical where feasible
- **Facility scoping** — all clinical access bound to `facilityId`
- **No shared accounts**
- **MFA** for production access and privileged roles (required in production — P0)

---

## 3. Medora workforce access

| System | Access model |
|--------|--------------|
| GitHub / repo | Individual accounts; 2FA required |
| Railway / Vercel | Named users; least privilege |
| Production DB | Break-glass only; no routine direct access |
| Customer prod PHI | **Prohibited** except approved support with audit |

Provisioning/deprovisioning within **24 hours** of role change.

---

## 4. Customer user access (platform)

| Mechanism | Implementation |
|-----------|----------------|
| Authentication | Email + password; MFA when enabled |
| Authorization | `RoleCode` per facility (`ADMIN`, `RN`, `PROVIDER`, etc.) |
| Facility boundary | `x-facility-id` header + JWT validation |
| Emergency access | Break-glass with reason + 20-minute TTL |
| Session | JWT access + refresh; revoke on password change |
| Platform operator | `MEDORA_SUPER_ADMIN` — backup/system health only |

---

## 5. Access reviews

| Scope | Frequency |
|-------|-----------|
| Medora workforce infra access | Quarterly |
| `MEDORA_SUPER_ADMIN` assignments | Quarterly |
| Customer recommendation | Annual role review (Customer responsibility) |

---

## 6. Password standards

Per `packages/shared/src/password-policy.ts`:

- Minimum 12 characters
- Upper, lower, digit, symbol
- Argon2 storage

---

## 7. Violations

Sanctions per HR policy; may include termination and law enforcement referral.

---

**Product reference:** `roles.guard.ts`, `UserRole`, `break-glass.service.ts`
