# MEDUI.D4C.9A — Enterprise Service-Line Department Provisioning Correction

## Production root cause (proven)

`mapServiceLineToPrismaDepartmentCodes("DENTAL")` previously fell through to `return [line]` → `["DENTAL"]`.

`facility-department-seed.util.ts` cast:

```ts
const code = rawCode as DepartmentCode;
```

Prisma `DepartmentCode` enum did **not** include `DENTAL`, so:

`PATCH /admin/facilities/:id/service-config` → `ensureFacilityServiceLineDepartments` → `department.findUnique` → **PrismaClientValidationError** → HTTP 500.

## Architecture decision

**DENTAL is a true operational `DepartmentCode`.**

Rationale (D5A.1–D5A.4): independent Dental workspace, appointments, encounters, worklist, odontogram, specialties, future procedures — same operational pattern as LABORATORY / RADIOLOGY.

Hierarchy:

```
Facility → Service line DENTAL → Department DENTAL → Specialties (care profile JSON)
```

Specialties (ORTHODONTICS, GENERAL_DENTISTRY, …) remain **not** DepartmentCode values.

DENTAL is **not** mapped to PRIMARY_CARE and is **not** added to hospital `CLINICAL_DEPARTMENT_REGISTRY` (clinical seed does not force Dental onto every hospital). Provisioning is **service-line driven only**.

## Fix

1. Additive Prisma enum value `DENTAL` + migration `20261108120000_d4c9a_dental_department_code`
2. Typed `mapServiceLineToPrismaDepartmentCodes` → `readonly PrismaDepartmentCodeToken[]` (exhaustive switch; no fallthrough cast)
3. Seed util validates tokens against live `Object.values(DepartmentCode)` before findUnique/create
4. Typed API error `FACILITY_SERVICE_LINE_DEPARTMENT_MAPPING_INVALID` (defense-in-depth; catalog should never hit it)
5. D4C.9 transactional update preserved (facility + departments + audit)

## Migration

**REQUIRED** — local apply only after review. Do not deploy/push from this agent session.
