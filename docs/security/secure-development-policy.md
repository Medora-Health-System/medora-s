# Secure Development Policy

**Program:** GOV.4  
**Version:** 1.0 (draft)

---

## 1. Purpose

Integrate security into Medora software development lifecycle (SDLC).

---

## 2. Scope

All changes to `apps/api`, `apps/web`, `packages/shared`, infrastructure as code.

---

## 3. Requirements

### 3.1 Design

- Threat consideration for features handling PHI
- Feature flags for high-risk clinical modules (medication scheduling, MAR)
- Shared responsibility documented for new integrations

### 3.2 Implementation

- TypeScript strict mode; validated DTOs (Zod/class-validator)
- Parameterized DB access (Prisma)
- No secrets in git; use env vars
- PHI-safe audit metadata (IDs not clinical text)
- Use `redact-phi.ts` patterns for logs

### 3.3 Code review

- At least one reviewer for production paths
- Security-sensitive changes: auth, RBAC, audit, break-glass, billing export

### 3.4 Testing

- Unit/integration tests for auth and governance regressions
- Harness tests for medication completion contracts

### 3.5 Deployment

- Migrations reviewed for data safety (RESTRICT over CASCADE for clinical data)
- Follow `change-management-policy.md`
- No `--no-verify` on production releases

---

## 4. Prohibited practices

- Copying production PHI to dev environments without de-identification
- Disabling audit for convenience
- Bypassing RBAC in production API routes
- Hardcoded credentials

---

## 5. Dependency management

- Pin versions in lockfile
- Weekly audit review
- No copyleft license introduction without legal review

---

## 6. Security training

Engineers complete Module C of `hipaa-training-program.md`.

---

**Related:** `vulnerability-management-policy.md`, `.cursor/rules/data-safety-principles.mdc`
