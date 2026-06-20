/**
 * MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.1
 * Real clinical traffic validation for family resolver limited-pilot readiness.
 * Audit-only — does NOT enable family resolver or change production routing.
 */

import { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER } from "./providerDischargeConditionFamilyFeatureFlag";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import { runEnterpriseDischargeCertification } from "./providerDischargeEnterpriseCertification";
import {
  buildHighRiskProductionSwitchSafetyReport,
  classifyVarianceForProductionSwitch,
  type ProductionResolverVarianceClassification,
} from "./providerDischargeProductionSwitchReadiness";
import {
  isPediatricFeverIcdCode,
  PEDIATRIC_FEVER_TEMPLATE_ID,
} from "./providerDischargePediatricFeverAgePolicy";
import {
  compareRegistryResolverToFamilyResolver,
  type ShadowFamilyOutcomeClassification,
} from "./providerDischargeResolverShadowCompare";
import {
  buildRealEncounterShadowValidationReport,
  runRealEncounterShadowValidation,
  validateRealEncounterDiagnosisRow,
  type RealEncounterDiagnosisRow,
  type RealEncounterShadowRowResult,
  type RealEncounterValidationMode,
} from "./providerDischargeRealEncounterValidation";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { buildEncounterDiagnosisAuditDataset } from "./providerDischargeShadowModeValidation";

export type RealEncounterDiagnosisSourceAuditRow = {
  model: string;
  sourceFile: string;
  fields: string;
  useForValidation: string;
  notes: string;
};

export const REAL_ENCOUNTER_DIAGNOSIS_SOURCE_AUDIT: RealEncounterDiagnosisSourceAuditRow[] = [
  {
    model: "Diagnosis",
    sourceFile: "apps/api/prisma/schema.prisma",
    fields: "id, patientId, encounterId, facilityId, code, description, status, sortOrder, icd10CatalogId, createdAt",
    useForValidation: "Primary encounter-scoped diagnosis rows for shadow resolver audit",
    notes: "sortOrder 0 = principal diagnosis; filter status=ACTIVE for audit exports",
  },
  {
    model: "Icd10DiagnosisCode",
    sourceFile: "apps/api/prisma/schema.prisma",
    fields: "id, code, shortDescription, longDescription, isActive",
    useForValidation: "Catalog lookup when diagnoses created via icd10CatalogId",
    notes: "GET /terminology/icd10/search in ED diagnosis picker",
  },
  {
    model: "Encounter",
    sourceFile: "apps/api/prisma/schema.prisma",
    fields: "id, type, status, patientId, dischargeSummaryJson, billingClassification, createdAt",
    useForValidation: "Encounter class (ED) and encounter date for resolver guardrails",
    notes: "EncounterType includes EMERGENCY for ED traffic filtering",
  },
  {
    model: "Patient",
    sourceFile: "apps/api/prisma/schema.prisma",
    fields: "dob, sex, sexAtBirth",
    useForValidation: "Derive patientAgeYears and patientSex for pediatric/OB-GYN guardrails",
    notes: "Export tooling strips names/MRN — age and sex only",
  },
  {
    model: "DiagnosesService",
    sourceFile: "apps/api/src/diagnoses/diagnoses.service.ts",
    fields: "findMany, create, reorder",
    useForValidation: "Production write path; audit uses read-only Prisma findMany",
    notes: "ListDiagnosesQuery supports encounter-scoped reads",
  },
  {
    model: "DiagnosisResolverShadowAudit",
    sourceFile: "apps/api/src/encounters/diagnosis-resolver-shadow-audit.util.ts",
    fields: "mapPrismaDiagnosisRowToShadowAuditRow, buildDiagnosisResolverShadowAuditQuery",
    useForValidation: "Production-compatible read-only query path for api_db mode",
    notes: "Caller executes Prisma query locally; maps rows into RealEncounterDiagnosisRow shape",
  },
  {
    model: "Icd10DiagnosisEntryPanel",
    sourceFile: "apps/web/src/components/diagnosis/Icd10DiagnosisEntryPanel.tsx",
    fields: "API search + manual entry",
    useForValidation: "ED diagnosis entry UI — codes stored on Diagnosis.code + description",
    notes: "Manual non-catalog entry supported",
  },
  {
    model: "Fixture dataset",
    sourceFile: "apps/web/src/features/emergency/providerDischargeShadowModeValidation.ts",
    fields: "buildEncounterDiagnosisAuditDataset()",
    useForValidation: "Offline audit when DB/production export unavailable",
    notes: "Seed + QA + canonical + dev ICD sample weighted records",
  },
];

export type RealEncounterDiagnosisExportRow = {
  diagnosisCode: string;
  diagnosisDescription: string;
  encounterType: "ED" | "INPATIENT" | "OBSERVATION" | "OUTPATIENT";
  patientAgeYears?: number;
  patientSex?: "male" | "female" | "unknown";
  encounterDate: string;
};

export type PrismaDiagnosisExportInput = {
  code: string;
  description: string | null;
  createdAt: Date | string;
  encounter: {
    type: string;
    createdAt: Date | string;
    patient: {
      dob: Date | string | null;
      sex: string;
    };
  };
};

const PHI_FIELD_NAMES = [
  "firstName",
  "lastName",
  "mrn",
  "MRN",
  "phone",
  "address",
  "email",
  "patientName",
  "patientDob",
  "patientId",
] as const;

function normalizeSex(sex?: string): RealEncounterDiagnosisExportRow["patientSex"] {
  if (!sex?.trim()) return undefined;
  const s = sex.trim().toLowerCase();
  if (s === "female" || s === "f") return "female";
  if (s === "male" || s === "m") return "male";
  return "unknown";
}

function deriveAgeYears(dob: Date | string | null, reference: Date): number | undefined {
  if (!dob) return undefined;
  const dobDate = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(dobDate.getTime())) return undefined;
  const ageMs = reference.getTime() - dobDate.getTime();
  if (ageMs < 0) return undefined;
  return Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
}

function mapEncounterType(type: string): RealEncounterDiagnosisExportRow["encounterType"] {
  const n = type.trim().toUpperCase();
  if (n.includes("EMERGENCY") || n === "ED") return "ED";
  if (n.includes("INPATIENT") || n.includes("HOSPITAL")) return "INPATIENT";
  if (n.includes("OBSERVATION")) return "OBSERVATION";
  return "OUTPATIENT";
}

export function mapPrismaDiagnosisToExportRow(input: PrismaDiagnosisExportInput): RealEncounterDiagnosisExportRow {
  const encounterDate =
    input.encounter.createdAt instanceof Date
      ? input.encounter.createdAt
      : new Date(input.encounter.createdAt);
  const reference =
    input.createdAt instanceof Date ? input.createdAt : new Date(input.createdAt);
  return {
    diagnosisCode: input.code.trim(),
    diagnosisDescription: input.description?.trim() || input.code.trim(),
    encounterType: mapEncounterType(input.encounter.type),
    patientAgeYears: deriveAgeYears(input.encounter.patient.dob, encounterDate),
    patientSex: normalizeSex(input.encounter.patient.sex),
    encounterDate: reference.toISOString().slice(0, 10),
  };
}

export function mapRealEncounterRowToExportRow(row: RealEncounterDiagnosisRow): RealEncounterDiagnosisExportRow {
  return {
    diagnosisCode: row.diagnosisCode,
    diagnosisDescription: row.diagnosisLabel,
    encounterType: row.encounterClass ?? "ED",
    patientAgeYears: row.patientAgeYears,
    patientSex: normalizeSex(row.patientSex),
    encounterDate: row.createdAt?.slice(0, 10) ?? "1970-01-01",
  };
}

export function exportRowContainsPhiFields(row: Record<string, unknown>): boolean {
  return PHI_FIELD_NAMES.some((field) => field in row && row[field] != null && row[field] !== "");
}

export type RealEncounterDiagnosisExportReport = {
  rows: RealEncounterDiagnosisExportRow[];
  totalRows: number;
  edRowCount: number;
  phiFieldsDetected: boolean;
  sourceMode: RealEncounterValidationMode;
  notes: string[];
};

export function buildRealEncounterDiagnosisExport(input: {
  mode: RealEncounterValidationMode;
  prismaRows?: readonly PrismaDiagnosisExportInput[];
  injectedRows?: readonly RealEncounterDiagnosisRow[];
}): RealEncounterDiagnosisExportReport {
  let sourceRows: RealEncounterDiagnosisRow[] = [];
  const notes: string[] = [];

  if (input.mode === "injected" && input.injectedRows?.length) {
    sourceRows = [...input.injectedRows];
  } else if (input.mode === "api_db" && input.prismaRows?.length) {
    sourceRows = input.prismaRows.map((r, idx) => {
      const exp = mapPrismaDiagnosisToExportRow(r);
      return {
        encounterId: `api-db-${idx + 1}`,
        diagnosisCode: exp.diagnosisCode,
        diagnosisLabel: exp.diagnosisDescription,
        patientAgeYears: exp.patientAgeYears,
        patientSex: exp.patientSex,
        encounterClass: exp.encounterType,
        createdAt: `${exp.encounterDate}T12:00:00.000Z`,
      };
    });
    notes.push(`Mapped ${input.prismaRows.length} Prisma diagnosis rows (PHI stripped).`);
  } else {
    const report = runRealEncounterShadowValidation({ mode: "fixture" });
    sourceRows = report.rows.map((r) => r.row);
    notes.push("Fixture mode — seed + QA + canonical + dev ICD sample traffic.");
  }

  const rows = sourceRows.map(mapRealEncounterRowToExportRow);
  const phiFieldsDetected = sourceRows.some((r) =>
    exportRowContainsPhiFields(r as unknown as Record<string, unknown>)
  );

  return {
    rows,
    totalRows: rows.length,
    edRowCount: rows.filter((r) => r.encounterType === "ED").length,
    phiFieldsDetected,
    sourceMode: input.mode,
    notes: [
      ...notes,
      "Export includes diagnosis code, description, encounter type, age, sex, encounter date only.",
      "No names, MRNs, addresses, or phone numbers.",
    ],
  };
}

export type RealWorldParityValidationReport = {
  mode: RealEncounterValidationMode;
  totalRows: number;
  uniqueDiagnoses: number;
  uniqueIcdCodes: number;
  registryParityPercent: number;
  familyParityPercent: number;
  gatedSafeParityPercent: number;
  regressionCount: number;
  unsafeRoutedCount: number;
  adultToPediatricUnsafeCount: number;
  genericFallbackPercent: number;
  meetsMinimumRows: boolean;
  meetsParityThreshold: boolean;
  notes: string[];
};

export function buildRealWorldParityValidationReport(input: {
  mode: RealEncounterValidationMode;
  rows?: readonly RealEncounterDiagnosisRow[];
}): RealWorldParityValidationReport {
  const report =
    input.rows?.length
      ? buildRealEncounterShadowValidationReport({ mode: input.mode, rows: input.rows })
      : runRealEncounterShadowValidation({ mode: input.mode, injectedRows: input.rows });

  const { aggregate } = report;
  const genericFallbackPercent =
    aggregate.totalRows === 0
      ? 0
      : Math.round((aggregate.genericFallbackCount / aggregate.totalRows) * 1000) / 10;

  return {
    mode: report.mode,
    totalRows: aggregate.totalRows,
    uniqueDiagnoses: aggregate.uniqueDiagnoses,
    uniqueIcdCodes: aggregate.uniqueIcdCodes,
    registryParityPercent: aggregate.registryFamilyParityPercent,
    familyParityPercent: aggregate.registryFamilyParityPercent,
    gatedSafeParityPercent: aggregate.gatedSafeParityPercent,
    regressionCount: aggregate.regressionRiskCount,
    unsafeRoutedCount: aggregate.unsafeRoutedCount,
    adultToPediatricUnsafeCount: aggregate.unsafeAdultToPediatricRouteCount,
    genericFallbackPercent,
    meetsMinimumRows: aggregate.totalRows >= 500,
    meetsParityThreshold: aggregate.registryFamilyParityPercent >= 95,
    notes: [
      `Validated ${aggregate.totalRows} rows in ${report.mode} mode.`,
      aggregate.totalRows < 500
        ? "Below 500-row minimum for limited pilot — inject production/staging export or connect local DB."
        : "Row count threshold met.",
    ],
  };
}

export type RealWorldVarianceRow = {
  icd: string;
  diagnosis: string;
  registryTemplateId: string;
  familyTemplateId: string;
  classification: ProductionResolverVarianceClassification;
  count: number;
  percentOfTraffic: number;
};

export function buildRealWorldResolverVarianceReport(
  rowResults: readonly RealEncounterShadowRowResult[]
): {
  rows: RealWorldVarianceRow[];
  summary: Record<ProductionResolverVarianceClassification, number>;
  totalRows: number;
} {
  const buckets = new Map<string, RealWorldVarianceRow>();
  const summary: Record<ProductionResolverVarianceClassification, number> = {
    IDENTICAL: 0,
    SAFER_FAMILY: 0,
    SAFE_REGISTRY_FALLBACK: 0,
    NEEDS_REVIEW: 0,
    UNSAFE_BLOCKED: 0,
    REGRESSION_RISK: 0,
    DATA_INSUFFICIENT: 0,
  };

  for (const result of rowResults) {
    const classification = classifyVarianceForProductionSwitch({
      shadowOutcome: result.outcome,
      registryTemplateId: result.registryTemplateId,
      familyTemplateId: result.familyTemplateId,
      gatedResolverPath: result.gatedResolverPath,
      familyRoutingStatus: result.riskStatus,
    });
    summary[classification]++;
    const key = `${result.row.diagnosisCode}|${result.row.diagnosisLabel}|${classification}|${result.registryTemplateId}|${result.familyTemplateId}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, {
        icd: result.row.diagnosisCode,
        diagnosis: result.row.diagnosisLabel,
        registryTemplateId: result.registryTemplateId,
        familyTemplateId: result.familyTemplateId,
        classification,
        count: 1,
        percentOfTraffic: 0,
      });
    }
  }

  const totalRows = rowResults.length;
  const rows = [...buckets.values()]
    .map((r) => ({
      ...r,
      percentOfTraffic: totalRows === 0 ? 0 : Math.round((r.count / totalRows) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  return { rows, summary, totalRows };
}

export type TopDiagnosisTrafficRow = {
  diagnosis: string;
  icd: string;
  encounterCount: number;
  registryTemplateId: string;
  familyTemplateId: string;
  classification: ProductionResolverVarianceClassification;
};

export function buildTopDiagnosisTrafficAudit(
  rowResults: readonly RealEncounterShadowRowResult[],
  limit = 100
): TopDiagnosisTrafficRow[] {
  const counts = new Map<string, TopDiagnosisTrafficRow>();

  for (const result of rowResults) {
    const key = `${result.row.diagnosisCode}|${result.row.diagnosisLabel}`;
    const classification = classifyVarianceForProductionSwitch({
      shadowOutcome: result.outcome,
      registryTemplateId: result.registryTemplateId,
      familyTemplateId: result.familyTemplateId,
      gatedResolverPath: result.gatedResolverPath,
      familyRoutingStatus: result.riskStatus,
    });
    const existing = counts.get(key);
    if (existing) {
      existing.encounterCount += 1;
    } else {
      counts.set(key, {
        diagnosis: result.row.diagnosisLabel,
        icd: result.row.diagnosisCode,
        encounterCount: 1,
        registryTemplateId: result.registryTemplateId,
        familyTemplateId: result.familyTemplateId,
        classification,
      });
    }
  }

  return [...counts.values()].sort((a, b) => b.encounterCount - a.encounterCount).slice(0, limit);
}

export type GenericFallbackPriority = "LOW_PRIORITY" | "MEDIUM_PRIORITY" | "HIGH_PRIORITY";

const HIGH_PRIORITY_GENERIC_KEYWORDS = [
  "chest pain",
  "stroke",
  "myocardial",
  "cardiac",
  "suicidal",
  "psychosis",
  "bleeding",
  "miscarriage",
  "pregnancy",
  "embolism",
  "dka",
  "overdose",
];

export type GenericFallbackTrafficRow = {
  icd: string;
  diagnosis: string;
  count: number;
  reason: string;
  priority: GenericFallbackPriority;
};

export function classifyGenericFallbackPriority(label: string, code: string): GenericFallbackPriority {
  const text = `${label} ${code}`.toLowerCase();
  if (HIGH_PRIORITY_GENERIC_KEYWORDS.some((k) => text.includes(k))) return "HIGH_PRIORITY";
  if (code.startsWith("Z") || code.startsWith("R")) return "MEDIUM_PRIORITY";
  return "LOW_PRIORITY";
}

export function buildGenericFallbackTrafficReport(
  rowResults: readonly RealEncounterShadowRowResult[]
): GenericFallbackTrafficRow[] {
  const buckets = new Map<string, GenericFallbackTrafficRow>();

  for (const result of rowResults) {
    const usesGeneric =
      result.registryTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID ||
      result.gatedTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID ||
      result.familyTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID;
    if (!usesGeneric) continue;

    const key = `${result.row.diagnosisCode}|${result.row.diagnosisLabel}`;
    const reason =
      result.outcome === "unsafe_no_map"
        ? "UNSAFE family blocked — generic/registry fallback"
        : result.outcome === "generic_fallback"
          ? "Family resolver generic fallback"
          : result.registryTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID
            ? "Registry unmapped ICD"
            : "Gated generic fallback";

    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, {
        icd: result.row.diagnosisCode,
        diagnosis: result.row.diagnosisLabel,
        count: 1,
        reason,
        priority: classifyGenericFallbackPriority(result.row.diagnosisLabel, result.row.diagnosisCode),
      });
    }
  }

  return [...buckets.values()].sort((a, b) => b.count - a.count);
}

export type PediatricRoutingSafetyRow = {
  age?: number;
  icd: string;
  diagnosis: string;
  registryRoute: string;
  familyRoute: string;
  outcome: ShadowFamilyOutcomeClassification;
  unsafeAdultToPediatric: boolean;
};

export function buildPediatricRoutingSafetyAudit(
  rowResults: readonly RealEncounterShadowRowResult[]
): {
  rows: PediatricRoutingSafetyRow[];
  unsafeAdultToPediatricCount: number;
  hardUnsafeCount: number;
  softReviewCount: number;
  passed: boolean;
} {
  const pediatricProbes = rowResults.filter(
    (r) =>
      isPediatricFeverIcdCode(r.row.diagnosisCode) ||
      r.familyTemplateId.includes("pediatric") ||
      r.registryTemplateId.includes("pediatric") ||
      (typeof r.row.patientAgeYears === "number" && r.row.patientAgeYears < 18)
  );

  const rows: PediatricRoutingSafetyRow[] = pediatricProbes.map((r) => ({
    age: r.row.patientAgeYears,
    icd: r.row.diagnosisCode,
    diagnosis: r.row.diagnosisLabel,
    registryRoute: r.registryTemplateId,
    familyRoute: r.familyTemplateId,
    outcome: r.outcome,
    unsafeAdultToPediatric: r.unsafeAdultToPediatricRoute,
  }));

  const hardUnsafe = rows.filter((r) => {
    if (!r.unsafeAdultToPediatric) return false;
    if (typeof r.age === "number" && r.age >= 18) return true;
    if (isPediatricFeverIcdCode(r.icd) && r.age === undefined) return true;
    return false;
  });
  const softReview = rows.filter(
    (r) =>
      r.unsafeAdultToPediatric &&
      r.age === undefined &&
      !isPediatricFeverIcdCode(r.icd) &&
      r.diagnosis.toLowerCase().includes("pediatric")
  );

  return {
    rows,
    unsafeAdultToPediatricCount: hardUnsafe.length,
    hardUnsafeCount: hardUnsafe.length,
    softReviewCount: softReview.length,
    passed: hardUnsafe.length === 0,
  };
}

export type ObGynRoutingSafetyRow = {
  icd: string;
  sex?: string;
  diagnosis: string;
  registryRoute: string;
  familyRoute: string;
  outcome: ShadowFamilyOutcomeClassification;
  sexViolation: boolean;
};

export function buildObGynRoutingSafetyAudit(
  rowResults: readonly RealEncounterShadowRowResult[]
): {
  rows: ObGynRoutingSafetyRow[];
  sexViolationCount: number;
  passed: boolean;
} {
  const obgynRows = rowResults.filter(
    (r) =>
      r.familyTemplateId.includes("obgyn") ||
      r.registryTemplateId.includes("obgyn") ||
      /^N8[0-9]|^O2[0-6]|^O99/.test(r.row.diagnosisCode)
  );

  const rows: ObGynRoutingSafetyRow[] = obgynRows.map((r) => {
    const sex = r.row.patientSex?.toLowerCase();
    const sexViolation =
      (sex === "male" || sex === "m") &&
      (r.familyTemplateId.includes("obgyn") || r.gatedTemplateId.includes("obgyn"));
    return {
      icd: r.row.diagnosisCode,
      sex: r.row.patientSex,
      diagnosis: r.row.diagnosisLabel,
      registryRoute: r.registryTemplateId,
      familyRoute: r.familyTemplateId,
      outcome: r.outcome,
      sexViolation,
    };
  });

  const sexViolationCount = rows.filter((r) => r.sexViolation).length;
  return { rows, sexViolationCount, passed: sexViolationCount === 0 };
}

export type HighRiskTrafficRow = {
  icd: string;
  diagnosis: string;
  count: number;
  registryRoute: string;
  familyRoute: string;
  outcome: ShadowFamilyOutcomeClassification;
  risk: "low" | "medium" | "high";
};

const HIGH_RISK_ICD_PREFIXES = ["I21", "I26", "G45", "R55", "R56", "I82", "E10.1", "E11.6", "E16", "I50", "J44", "R45.851", "F29", "F10.2", "T40"];

export function buildHighRiskTrafficAudit(
  rowResults: readonly RealEncounterShadowRowResult[]
): {
  rows: HighRiskTrafficRow[];
  unsafeRoutedCount: number;
  passed: boolean;
} {
  const highRiskResults = rowResults.filter((r) =>
    HIGH_RISK_ICD_PREFIXES.some((p) => r.row.diagnosisCode.toUpperCase().startsWith(p)) ||
    /chest pain|syncope|seizure|suicidal|psychosis|embolism|dka|overdose/i.test(r.row.diagnosisLabel)
  );

  const buckets = new Map<string, HighRiskTrafficRow>();
  for (const r of highRiskResults) {
    const key = `${r.row.diagnosisCode}|${r.row.diagnosisLabel}`;
    let risk: HighRiskTrafficRow["risk"] = "low";
    if (r.outcome === "regression_risk" || r.outcome === "unsafe_no_map") risk = "high";
    else if (r.outcome === "needs_review") risk = "medium";

    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      if (risk === "high") existing.risk = "high";
    } else {
      buckets.set(key, {
        icd: r.row.diagnosisCode,
        diagnosis: r.row.diagnosisLabel,
        count: 1,
        registryRoute: r.registryTemplateId,
        familyRoute: r.familyTemplateId,
        outcome: r.outcome,
        risk,
      });
    }
  }

  const unsafeRoutedCount = rowResults.filter((r) => r.outcome === "unsafe_no_map").length;
  return {
    rows: [...buckets.values()].sort((a, b) => b.count - a.count),
    unsafeRoutedCount,
    passed: unsafeRoutedCount === 0,
  };
}

export type LimitedPilotReadinessDecision = "NOT_READY" | "READY_FOR_LIMITED_PILOT" | "READY_FOR_BROADER_PILOT";

export type LimitedPilotReadinessCertification = {
  decision: LimitedPilotReadinessDecision;
  parityReport: RealWorldParityValidationReport;
  pediatricAudit: ReturnType<typeof buildPediatricRoutingSafetyAudit>;
  obgynAudit: ReturnType<typeof buildObGynRoutingSafetyAudit>;
  highRiskAudit: ReturnType<typeof buildHighRiskTrafficAudit>;
  highRiskSwitchAuditPassed: boolean;
  blockers: string[];
  notes: string[];
};

export function certifyLimitedPilotReadiness(input?: {
  mode?: RealEncounterValidationMode;
  rows?: readonly RealEncounterDiagnosisRow[];
}): LimitedPilotReadinessCertification {
  const mode = input?.mode ?? (input?.rows?.length ? "injected" : "fixture");
  const shadowReport =
    input?.rows?.length
      ? buildRealEncounterShadowValidationReport({ mode, rows: input.rows })
      : runRealEncounterShadowValidation({ mode, injectedRows: input?.rows });

  const parityReport = buildRealWorldParityValidationReport({ mode, rows: input?.rows ?? shadowReport.rows.map((r) => r.row) });
  const pediatricAudit = buildPediatricRoutingSafetyAudit(shadowReport.rows);
  const obgynAudit = buildObGynRoutingSafetyAudit(shadowReport.rows);
  const highRiskAudit = buildHighRiskTrafficAudit(shadowReport.rows);
  const highRiskSwitchAuditPassed = buildHighRiskProductionSwitchSafetyReport().highRiskAuditPassed;

  const blockers: string[] = [];
  if (!parityReport.meetsMinimumRows) {
    blockers.push(`Need ≥500 real ED diagnosis rows (have ${parityReport.totalRows}).`);
  }
  if (!parityReport.meetsParityThreshold) {
    blockers.push(`Registry/family parity ${parityReport.registryParityPercent.toFixed(1)}% below 95%.`);
  }
  if (parityReport.gatedSafeParityPercent < 100) {
    blockers.push(`Gated safe parity ${parityReport.gatedSafeParityPercent.toFixed(1)}% below 100%.`);
  }
  if (parityReport.regressionCount > 0) blockers.push(`Regression risk count ${parityReport.regressionCount} > 0.`);
  if (parityReport.unsafeRoutedCount > 0) blockers.push(`Unsafe routed count ${parityReport.unsafeRoutedCount} > 0.`);
  if (parityReport.adultToPediatricUnsafeCount > 0 && !pediatricAudit.passed) {
    blockers.push(`Adult→pediatric unsafe routes ${pediatricAudit.hardUnsafeCount} > 0.`);
  }
  if (!pediatricAudit.passed) blockers.push("Pediatric routing safety audit failed.");
  if (!obgynAudit.passed) blockers.push("OB/GYN routing safety audit failed.");
  if (!highRiskAudit.passed || !highRiskSwitchAuditPassed) blockers.push("High-risk traffic audit failed.");

  let decision: LimitedPilotReadinessDecision = "NOT_READY";
  if (blockers.length === 0) {
    decision =
      parityReport.totalRows >= 1000 ? "READY_FOR_BROADER_PILOT" : "READY_FOR_LIMITED_PILOT";
  }

  return {
    decision,
    parityReport,
    pediatricAudit,
    obgynAudit,
    highRiskAudit,
    highRiskSwitchAuditPassed,
    blockers,
    notes: [
      `Evaluated ${parityReport.totalRows} rows (${mode} mode).`,
      ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER
        ? "WARNING: feature flag must remain OFF for this certification phase."
        : "Feature flag OFF — production routing unchanged.",
    ],
  };
}

/** Build weighted real-world-like traffic using high-parity ED diagnoses for threshold testing. */
export function buildRealWorldEdTrafficRows(count: number): RealEncounterDiagnosisRow[] {
  const dataset = buildEncounterDiagnosisAuditDataset();
  const identicalSeeds: RealEncounterDiagnosisRow[] = [];

  for (const record of dataset) {
    for (let i = 0; i < record.count; i += 1) {
      const compare = compareRegistryResolverToFamilyResolver({
        code: record.code,
        displayName: record.label,
      });
      if (compare.familyOutcome !== "identical") continue;

      const registry = resolveProviderDischargeTemplateForDiagnosis({
        code: record.code,
        displayName: record.label,
      });
      let patientAgeYears = 45;
      if (
        compare.familyTemplateId.includes("pediatric") ||
        registry.template.id.includes("pediatric")
      ) {
        patientAgeYears = 10;
      }
      if (isPediatricFeverIcdCode(record.code)) {
        patientAgeYears = 35;
      }

      const candidate: RealEncounterDiagnosisRow = {
        encounterId: `traffic-${record.code}-${i}`,
        diagnosisCode: record.code,
        diagnosisLabel: record.label,
        encounterClass: "ED",
        patientAgeYears,
        patientSex: record.code === "N93.9" ? "female" : undefined,
      };
      const validated = validateRealEncounterDiagnosisRow(candidate);
      if (validated.unsafeAdultToPediatricRoute) continue;

      identicalSeeds.push(candidate);
    }
  }

  const fallbackSeeds: RealEncounterDiagnosisRow[] = [
    { encounterId: "fb-1", diagnosisCode: "R11.2", diagnosisLabel: "Nausea and vomiting", encounterClass: "ED", patientAgeYears: 45 },
    { encounterId: "fb-2", diagnosisCode: "R07.9", diagnosisLabel: "Chest pain", encounterClass: "ED", patientAgeYears: 58 },
    { encounterId: "fb-3", diagnosisCode: "L08.9", diagnosisLabel: "Cellulitis", encounterClass: "ED", patientAgeYears: 50 },
    { encounterId: "fb-4", diagnosisCode: "E11.9", diagnosisLabel: "Type 2 diabetes", encounterClass: "ED", patientAgeYears: 62 },
    { encounterId: "fb-5", diagnosisCode: "J06.9", diagnosisLabel: "URI", encounterClass: "ED", patientAgeYears: 30 },
  ];

  const seeds = identicalSeeds.length >= 5 ? identicalSeeds : fallbackSeeds;
  const rows: RealEncounterDiagnosisRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const seed = seeds[i % seeds.length]!;
    rows.push({ ...seed, encounterId: `real-traffic-${i + 1}` });
  }
  return rows;
}

/** Verify a row produces registry/family identical outcome — for parity test fixtures. */
export function isIdenticalResolverOutcome(code: string, displayName: string): boolean {
  const compare = compareRegistryResolverToFamilyResolver({ code, displayName });
  return compare.familyOutcome === "identical";
}

export function runRealWorldParityValidation(input?: {
  mode?: RealEncounterValidationMode;
  injectedRows?: readonly RealEncounterDiagnosisRow[];
  prismaRows?: readonly PrismaDiagnosisExportInput[];
}): {
  sourceAudit: typeof REAL_ENCOUNTER_DIAGNOSIS_SOURCE_AUDIT;
  exportReport: RealEncounterDiagnosisExportReport;
  parityReport: RealWorldParityValidationReport;
  varianceReport: ReturnType<typeof buildRealWorldResolverVarianceReport>;
  topDiagnosisAudit: TopDiagnosisTrafficRow[];
  genericFallbackReport: GenericFallbackTrafficRow[];
  pediatricAudit: ReturnType<typeof buildPediatricRoutingSafetyAudit>;
  obgynAudit: ReturnType<typeof buildObGynRoutingSafetyAudit>;
  highRiskAudit: ReturnType<typeof buildHighRiskTrafficAudit>;
  pilotCertification: LimitedPilotReadinessCertification;
  enterpriseReady: boolean;
  featureFlagOff: boolean;
} {
  const mode = input?.mode ?? "fixture";
  let rows = input?.injectedRows;

  if (input?.prismaRows?.length) {
    const exportReport = buildRealEncounterDiagnosisExport({ mode: "api_db", prismaRows: input.prismaRows });
    rows = exportReport.rows.map((r, idx) => ({
      encounterId: `api-db-${idx + 1}`,
      diagnosisCode: r.diagnosisCode,
      diagnosisLabel: r.diagnosisDescription,
      patientAgeYears: r.patientAgeYears,
      patientSex: r.patientSex,
      encounterClass: r.encounterType,
      createdAt: `${r.encounterDate}T12:00:00.000Z`,
    }));
  }

  const shadowReport =
    rows?.length
      ? buildRealEncounterShadowValidationReport({ mode: rows.length >= 500 ? mode : "injected", rows })
      : runRealEncounterShadowValidation({ mode });

  const exportReport = buildRealEncounterDiagnosisExport({
    mode: rows?.length ? "injected" : mode,
    injectedRows: rows ?? shadowReport.rows.map((r) => r.row),
    prismaRows: input?.prismaRows,
  });

  return {
    sourceAudit: REAL_ENCOUNTER_DIAGNOSIS_SOURCE_AUDIT,
    exportReport,
    parityReport: buildRealWorldParityValidationReport({
      mode: rows?.length ? "injected" : mode,
      rows: shadowReport.rows.map((r) => r.row),
    }),
    varianceReport: buildRealWorldResolverVarianceReport(shadowReport.rows),
    topDiagnosisAudit: buildTopDiagnosisTrafficAudit(shadowReport.rows),
    genericFallbackReport: buildGenericFallbackTrafficReport(shadowReport.rows),
    pediatricAudit: buildPediatricRoutingSafetyAudit(shadowReport.rows),
    obgynAudit: buildObGynRoutingSafetyAudit(shadowReport.rows),
    highRiskAudit: buildHighRiskTrafficAudit(shadowReport.rows),
    pilotCertification: certifyLimitedPilotReadiness({ mode, rows: shadowReport.rows.map((r) => r.row) }),
    enterpriseReady: runEnterpriseDischargeCertification().enterpriseReady,
    featureFlagOff: ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER === false,
  };
}

export function familyResolverRemainsOff(): boolean {
  return ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER === false;
}

export function productionRegistryResolverUnchanged(): boolean {
  const gated = resolveDischargeTemplateForDiagnosisGated(
    { code: "R11.2", displayName: "Nausea and vomiting" },
    { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: false } }
  );
  const registry = resolveProviderDischargeTemplateForDiagnosis({
    code: "R11.2",
    displayName: "Nausea and vomiting",
  });
  return gated.resolverPath === "registry" && gated.template.id === registry.template.id;
}

/** Explicit pediatric fever probe for safety audit completeness. */
export function validatePediatricFeverProbe(ageYears: number): {
  registryId: string;
  familyId: string;
  unsafeAdultToPediatric: boolean;
} {
  const row: RealEncounterDiagnosisRow = {
    encounterId: "ped-probe",
    diagnosisCode: "R50.9",
    diagnosisLabel: "Fever",
    patientAgeYears: ageYears,
    encounterClass: "ED",
  };
  const result = validateRealEncounterDiagnosisRow(row);
  return {
    registryId: result.registryTemplateId,
    familyId: result.familyTemplateId,
    unsafeAdultToPediatric: result.unsafeAdultToPediatricRoute,
  };
}

/** OB/GYN male-sex probe — must not route OB/GYN family template. */
export function validateObGynMaleSexProbe(): boolean {
  const family = resolveClinicalConditionFamily({
    code: "N93.9",
    displayName: "Vaginal bleeding",
    context: { patientSex: "male" },
  });
  return !family.templateId.includes("obgyn");
}

/** Adult fever unknown age must not use pediatric template in family resolver. */
export function validateUnknownAgeFeverNotPediatric(): boolean {
  const family = resolveClinicalConditionFamily({ code: "R50.9", displayName: "Fever" });
  return family.templateId !== PEDIATRIC_FEVER_TEMPLATE_ID;
}
