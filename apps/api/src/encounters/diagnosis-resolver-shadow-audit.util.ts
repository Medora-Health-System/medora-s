/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.6
 * Read-only encounter diagnosis row mapping for shadow resolver audits.
 */

export type DiagnosisResolverShadowAuditRow = {
  encounterId: string;
  patientId?: string;
  patientDob?: string;
  patientAgeYears?: number;
  patientSex?: string;
  diagnosisCode: string;
  diagnosisLabel: string;
  isPrimary?: boolean;
  encounterClass?: "ED" | "INPATIENT" | "OBSERVATION" | "OUTPATIENT";
  createdAt?: string;
};

type PrismaDiagnosisAuditRow = {
  id: string;
  encounterId: string;
  patientId: string;
  code: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  encounter: {
    type: string;
    createdAt: Date;
    patient: {
      dob: Date | null;
      sex: string;
    };
  };
};

function mapEncounterClass(
  encounterType: string
): DiagnosisResolverShadowAuditRow["encounterClass"] {
  const normalized = encounterType.trim().toUpperCase();
  if (normalized.includes("EMERGENCY") || normalized === "ED") return "ED";
  if (normalized.includes("INPATIENT") || normalized.includes("HOSPITAL")) {
    return "INPATIENT";
  }
  if (normalized.includes("OBSERVATION")) return "OBSERVATION";
  return "OUTPATIENT";
}

function deriveAgeYears(dob: Date | null, reference: Date): number | undefined {
  if (!dob) return undefined;
  const refMs = reference.getTime();
  const dobMs = dob.getTime();
  if (!Number.isFinite(refMs) || !Number.isFinite(dobMs) || dobMs > refMs) return undefined;
  const ageMs = refMs - dobMs;
  const years = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
  return years >= 0 ? years : undefined;
}

export function mapPrismaDiagnosisRowToShadowAuditRow(
  row: PrismaDiagnosisAuditRow
): DiagnosisResolverShadowAuditRow {
  const reference = row.encounter.createdAt ?? row.createdAt;
  return {
    encounterId: row.encounterId,
    patientId: row.patientId,
    patientDob: row.encounter.patient.dob?.toISOString().slice(0, 10),
    patientAgeYears: deriveAgeYears(row.encounter.patient.dob, reference),
    patientSex: row.encounter.patient.sex,
    diagnosisCode: row.code,
    diagnosisLabel: row.description?.trim() || row.code,
    isPrimary: row.sortOrder === 0,
    encounterClass: mapEncounterClass(row.encounter.type),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Prisma select shape for read-only shadow audit queries. */
export const DIAGNOSIS_RESOLVER_SHADOW_AUDIT_SELECT = {
  id: true,
  encounterId: true,
  patientId: true,
  code: true,
  description: true,
  sortOrder: true,
  createdAt: true,
  encounter: {
    select: {
      type: true,
      createdAt: true,
      patient: {
        select: {
          dob: true,
          sex: true,
        },
      },
    },
  },
} as const;

export type DiagnosisResolverShadowAuditQueryOptions = {
  facilityId?: string;
  encounterType?: string;
  limit?: number;
  offset?: number;
};

/**
 * Builds a read-only Prisma findMany args object for local dev DB audits.
 * Caller executes the query — this module does not open DB connections.
 */
export function buildDiagnosisResolverShadowAuditQuery(
  options: DiagnosisResolverShadowAuditQueryOptions = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 5000);
  const offset = Math.max(options.offset ?? 0, 0);
  return {
    where: {
      status: "ACTIVE" as const,
      ...(options.facilityId ? { facilityId: options.facilityId } : {}),
      ...(options.encounterType
        ? { encounter: { type: options.encounterType as never } }
        : {}),
    },
    select: DIAGNOSIS_RESOLVER_SHADOW_AUDIT_SELECT,
    orderBy: [{ createdAt: "desc" as const }],
    take: limit,
    skip: offset,
  };
}

export const REAL_ENCOUNTER_DIAGNOSIS_DATA_SOURCE_AUDIT = [
  {
    model: "Diagnosis",
    sourceFile: "apps/api/prisma/schema.prisma",
    fields: "id, patientId, encounterId, facilityId, code, description, status, sortOrder, icd10CatalogId, createdAt",
    useForValidation: "Primary encounter-scoped diagnosis rows for shadow resolver audit",
    notes: "sortOrder 0 = principal diagnosis convention",
  },
  {
    model: "Icd10DiagnosisCode",
    sourceFile: "apps/api/prisma/schema.prisma",
    fields: "id, code, shortDescription, longDescription, isActive",
    useForValidation: "Catalog lookup when diagnoses created via icd10CatalogId",
    notes: "Optional FK from Diagnosis.icd10CatalogId",
  },
  {
    model: "Encounter",
    sourceFile: "apps/api/prisma/schema.prisma",
    fields: "id, type, status, patientId, dischargeSummaryJson, billingClassification",
    useForValidation: "Encounter class / ED context for resolver guardrails",
    notes: "dischargeSummaryJson stores structured discharge documentation",
  },
  {
    model: "Patient",
    sourceFile: "apps/api/prisma/schema.prisma",
    fields: "dob, sex, sexAtBirth",
    useForValidation: "Age and sex context for pediatric fever policy",
    notes: "DOB used to derive patientAgeYears at encounter time",
  },
  {
    model: "Diagnoses API",
    sourceFile: "apps/api/src/diagnoses/diagnoses.service.ts",
    fields: "create, findMany, reorder",
    useForValidation: "Read-only export via Prisma findMany in local dev",
    notes: "POST encounters/:id/diagnoses for writes — audit uses read path only",
  },
  {
    model: "Seed diagnoses",
    sourceFile: "apps/api/prisma/seed.ts",
    fields: "I10, J06.9, R10.9, E11.9, L20.9, A09, D64.9, M17.9, A01.04",
    useForValidation: "Fixture mode baseline when production export unavailable",
    notes: "No R50.9 in seed — fever policy validated via injected rows",
  },
] as const;
