# MEDUI.D4C.9A — Certification

**Feature:** Enterprise Service-Line Department Provisioning Correction  
**Branch:** `d4c9-enterprise-facility-service-line-configuration-billing-workflow`  
**Status:** **CERTIFIED** (pending human review)  
**Commit / push / deploy:** **NONE**

## Verdict

**MEDUI.D4C.9A — ENTERPRISE SERVICE-LINE DEPARTMENT PROVISIONING — CERTIFIED**

Re-certifies:

**MEDUI.D4C.9 — ENTERPRISE FACILITY CAPABILITY GOVERNANCE — CERTIFIED** (with prior deferrals)

## Production root cause

Confirmed: DENTAL mapper fallthrough + unsafe `as DepartmentCode` cast against Prisma enum missing `DENTAL` → `PrismaClientValidationError` on `department.findUnique` during service-config PATCH.

## Architecture

DENTAL = operational DepartmentCode. Specialties ≠ departments.

## Migration

`apps/api/prisma/migrations/20261108120000_d4c9a_dental_department_code`  
`ALTER TYPE "DepartmentCode" ADD VALUE IF NOT EXISTS 'DENTAL';`

**Apply locally after review. Do not deploy to Railway from this session.**

## Seed

NONE

## Validation

See final report in agent response.
