/**
 * MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.2
 * Real ED diagnosis export, injected/api_db parity validation, and limited pilot qualification.
 * Audit-only — does NOT enable family resolver or change production routing.
 */

import { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER } from "./providerDischargeConditionFamilyFeatureFlag";
import { runEnterpriseDischargeCertification } from "./providerDischargeEnterpriseCertification";
import { buildHighRiskProductionSwitchSafetyReport } from "./providerDischargeProductionSwitchReadiness";
import {
  buildGenericFallbackTrafficReport,
  buildHighRiskTrafficAudit,
  buildObGynRoutingSafetyAudit,
  buildPediatricRoutingSafetyAudit,
  buildRealWorldEdTrafficRows,
  buildRealWorldParityValidationReport,
  buildTopDiagnosisTrafficAudit,
  exportRowContainsPhiFields,
  mapPrismaDiagnosisToExportRow,
  mapRealEncounterRowToExportRow,
  productionRegistryResolverUnchanged,
  type GenericFallbackTrafficRow,
  type PrismaDiagnosisExportInput,
  type RealEncounterDiagnosisExportRow,
  type RealWorldParityValidationReport,
  type TopDiagnosisTrafficRow,
} from "./providerDischargeRealWorldParityValidation";
import {
  buildRealEncounterShadowValidationReport,
  type RealEncounterDiagnosisRow,
} from "./providerDischargeRealEncounterValidation";
import { classifyVarianceForProductionSwitch } from "./providerDischargeProductionSwitchReadiness";
import { compareRegistryResolverToFamilyResolver } from "./providerDischargeResolverShadowCompare";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";

export const ED_DIAGNOSIS_SHADOW_EXPORT_VERSION = "MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.2";
export const ED_DIAGNOSIS_SHADOW_EXPORT_PATH = "exports/ed-diagnosis-shadow-audit.json";

export type EdDiagnosisShadowExportSource = "database" | "synthetic_tooling_fallback" | "injected";

export type EdDiagnosisShadowAuditExportMeta = {
  version: string;
  exportSource: EdDiagnosisShadowExportSource;
  databaseAvailable: boolean;
  generatedAt: string;
  environment: string;
  encounterTypeFilter?: string;
  totalRows: number;
  uniqueIcdCodes: number;
  uniqueDiagnoses: number;
  dateRange: { min: string | null; max: string | null };
  note?: string;
};

export type EdDiagnosisShadowAuditExportFile = {
  meta: EdDiagnosisShadowAuditExportMeta;
  rows: RealEncounterDiagnosisExportRow[];
};

export type DatabaseAccessAudit = {
  databaseUrlConfigured: boolean;
  databaseReachable: boolean;
  environment: string;
  diagnosisRowCount?: number;
  edDiagnosisRowCount?: number;
  emergencyEncounterCount?: number;
  dateRange?: { min: string | null; max: string | null };
  notes: string[];
};

export type RealDiagnosisExportReport = {
  exportPath: string;
  meta: EdDiagnosisShadowAuditExportMeta;
  totalRows: number;
  uniqueIcdCodes: number;
  uniqueDiagnoses: number;
  dateRange: { min: string | null; max: string | null };
  phiFieldsDetected: boolean;
  meetsMinimumRows: boolean;
  notes: string[];
};

export type InjectedParityValidationReport = RealWorldParityValidationReport & {
  exportSource: EdDiagnosisShadowExportSource;
  shadowAggregate: ReturnType<typeof buildRealEncounterShadowValidationReport>["aggregate"];
};

export type ApiDbParityValidationReport = InjectedParityValidationReport & {
  matchesInjectedExport: boolean;
  injectedComparisonNotes: string[];
};

export type Top500DiagnosisTrafficAudit = {
  rows: TopDiagnosisTrafficRow[];
  top50: TopDiagnosisTrafficRow[];
  top100: TopDiagnosisTrafficRow[];
  top20HighRisk: Array<TopDiagnosisTrafficRow & { highRiskLabel: string }>;
};

export type RealTrafficGenericFallbackAudit = {
  rows: Array<GenericFallbackTrafficRow & { registryTemplateId: string; familyTemplateId: string }>;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
};

export type RealTrafficHighRiskAudit = ReturnType<typeof buildHighRiskTrafficAudit> & {
  conditionSummaries: Array<{ condition: string; count: number; registryRoute: string; familyRoute: string; outcome: string; risk: string }>;
};

export type RealTrafficGuardrailAudit = {
  pediatric: ReturnType<typeof buildPediatricRoutingSafetyAudit>;
  obgyn: ReturnType<typeof buildObGynRoutingSafetyAudit>;
  adultToPediatricHardUnsafe: number;
  obgynSexViolations: number;
  passed: boolean;
};

export type LimitedPilotQualificationDecision = "NOT_READY" | "READY_FOR_LIMITED_PILOT";

export type LimitedPilotQualificationReport = {
  decision: LimitedPilotQualificationDecision;
  exportSource: EdDiagnosisShadowExportSource;
  parityReport: RealWorldParityValidationReport;
  guardrailAudit: RealTrafficGuardrailAudit;
  highRiskAudit: RealTrafficHighRiskAudit;
  blockers: string[];
  notes: string[];
};

const HIGH_RISK_LABELS: Array<{ label: string; match: (code: string, text: string) => boolean }> = [
  { label: "Chest pain", match: (c, t) => c.startsWith("R07") || t.includes("chest pain") },
  { label: "MI", match: (c) => c.startsWith("I21") },
  { label: "Stroke/TIA", match: (c, t) => c.startsWith("G45") || c.startsWith("I63") || t.includes("stroke") || t.includes("tia") },
  { label: "Seizure", match: (c, t) => c.startsWith("R56") || t.includes("seizure") },
  { label: "Syncope", match: (c, t) => c.startsWith("R55") || t.includes("syncope") },
  { label: "DVT", match: (c, t) => c.startsWith("I82") || t.includes("dvt") },
  { label: "PE", match: (c, t) => c.startsWith("I26") || t.includes("embolism") },
  { label: "DKA", match: (c, t) => c.startsWith("E10.1") || t.includes("dka") },
  { label: "Hypoglycemia", match: (c, t) => c.startsWith("E16") || t.includes("hypoglycemia") },
  { label: "Hyperglycemia", match: (c, t) => c.startsWith("E11.65") || t.includes("hyperglycemia") },
  { label: "CHF", match: (c, t) => c.startsWith("I50") || t.includes("heart failure") },
  { label: "COPD", match: (c, t) => c.startsWith("J44") || t.includes("copd") },
  { label: "Asthma", match: (c, t) => c.startsWith("J45") || t.includes("asthma") },
  { label: "Suicidal ideation", match: (c, t) => c.startsWith("R45.851") || t.includes("suicidal") },
  { label: "Psychosis", match: (c, t) => c.startsWith("F29") || t.includes("psychosis") },
  { label: "Alcohol withdrawal", match: (c, t) => c.startsWith("F10.2") || t.includes("withdrawal") },
  { label: "Opioid overdose", match: (c, t) => c.startsWith("T40") || t.includes("overdose") },
  { label: "Pregnancy bleeding", match: (c, t) => c.startsWith("O") || t.includes("pregnancy") || t.includes("bleeding") },
  { label: "Pediatric fever", match: (c, t) => c.startsWith("R50") || t.includes("fever") },
];

export function buildEdDiagnosisShadowAuditExportFileFromRows(
  rows: RealEncounterDiagnosisExportRow[],
  meta: Pick<
    EdDiagnosisShadowAuditExportMeta,
    "exportSource" | "databaseAvailable" | "environment" | "note" | "encounterTypeFilter"
  >
): EdDiagnosisShadowAuditExportFile {
  const icdSet = new Set(rows.map((r) => r.diagnosisCode.trim().toUpperCase()));
  const diagSet = new Set(rows.map((r) => `${r.diagnosisCode}|${r.diagnosisDescription}`.toLowerCase()));
  const dates = rows.map((r) => r.encounterDate).filter(Boolean).sort();
  return {
    meta: {
      version: ED_DIAGNOSIS_SHADOW_EXPORT_VERSION,
      generatedAt: new Date().toISOString(),
      totalRows: rows.length,
      uniqueIcdCodes: icdSet.size,
      uniqueDiagnoses: diagSet.size,
      dateRange: { min: dates[0] ?? null, max: dates[dates.length - 1] ?? null },
      ...meta,
    },
    rows,
  };
}

export function exportRowsToRealEncounterRows(rows: readonly RealEncounterDiagnosisExportRow[]): RealEncounterDiagnosisRow[] {
  return rows.map((r, idx) => ({
    encounterId: `export-row-${idx + 1}`,
    diagnosisCode: r.diagnosisCode,
    diagnosisLabel: r.diagnosisDescription,
    patientAgeYears: r.patientAgeYears,
    patientSex: r.patientSex,
    encounterClass: r.encounterType,
    createdAt: `${r.encounterDate}T12:00:00.000Z`,
  }));
}

export function auditDatabaseAccess(input?: {
  databaseReachable?: boolean;
  diagnosisRowCount?: number;
  edDiagnosisRowCount?: number;
  emergencyEncounterCount?: number;
  dateRange?: { min: string | null; max: string | null };
  environment?: string;
}): DatabaseAccessAudit {
  const configured = Boolean(process.env.DATABASE_URL?.trim()) || input?.environment !== undefined;
  const reachable = input?.databaseReachable ?? false;
  const notes: string[] = [];

  if (!reachable) {
    notes.push("Database server not reachable at localhost:5432 (or configured DATABASE_URL host).");
    notes.push("Run: pnpm --filter @medora/api run export:ed-diagnosis-shadow when PostgreSQL is available.");
  }
  if (reachable && (input?.edDiagnosisRowCount ?? 0) < 500) {
    notes.push(`ED diagnosis rows ${input?.edDiagnosisRowCount ?? 0} below 500-row pilot minimum.`);
  }

  return {
    databaseUrlConfigured: configured,
    databaseReachable: reachable,
    environment: input?.environment ?? (process.env.DATABASE_URL ? "configured" : "unset"),
    diagnosisRowCount: input?.diagnosisRowCount,
    edDiagnosisRowCount: input?.edDiagnosisRowCount,
    emergencyEncounterCount: input?.emergencyEncounterCount,
    dateRange: input?.dateRange,
    notes,
  };
}

export function buildRealEdDiagnosisExport(input: {
  exportFile?: EdDiagnosisShadowAuditExportFile;
  prismaRows?: readonly PrismaDiagnosisExportInput[];
  syntheticRowCount?: number;
}): RealDiagnosisExportReport {
  let file = input.exportFile;
  const notes: string[] = [];

  if (!file && input.prismaRows?.length) {
    const rows = input.prismaRows.map(mapPrismaDiagnosisToExportRow);
    file = buildEdDiagnosisShadowAuditExportFileFromRows(rows, {
      exportSource: "database",
      databaseAvailable: true,
      environment: "api_db",
      encounterTypeFilter: "EMERGENCY",
    });
    notes.push(`Built export from ${rows.length} Prisma diagnosis rows.`);
  }

  if (!file) {
    const count = input.syntheticRowCount ?? 520;
    const rows = buildRealWorldEdTrafficRows(count).map(mapRealEncounterRowToExportRow);
    file = buildEdDiagnosisShadowAuditExportFileFromRows(rows, {
      exportSource: "synthetic_tooling_fallback",
      databaseAvailable: false,
      environment: "local_no_database",
      note: "DATABASE_UNAVAILABLE_LOCALLY",
    });
    notes.push(`Synthetic tooling fallback export (${count} rows) — not real clinical traffic.`);
  }

  const phiFieldsDetected = file.rows.some((r) =>
    exportRowContainsPhiFields(r as unknown as Record<string, unknown>)
  );

  return {
    exportPath: ED_DIAGNOSIS_SHADOW_EXPORT_PATH,
    meta: file.meta,
    totalRows: file.meta.totalRows,
    uniqueIcdCodes: file.meta.uniqueIcdCodes,
    uniqueDiagnoses: file.meta.uniqueDiagnoses,
    dateRange: file.meta.dateRange,
    phiFieldsDetected,
    meetsMinimumRows: file.meta.totalRows >= 500,
    notes,
  };
}

export function loadEdDiagnosisShadowAuditExport(json: unknown): EdDiagnosisShadowAuditExportFile {
  if (!json || typeof json !== "object") throw new Error("Invalid export JSON");
  const o = json as Record<string, unknown>;
  const meta = o.meta as EdDiagnosisShadowAuditExportMeta;
  const rows = o.rows as RealEncounterDiagnosisExportRow[];
  if (!meta || !Array.isArray(rows)) throw new Error("Export JSON missing meta or rows");
  return { meta, rows };
}

export function runInjectedParityValidation(
  exportFile: EdDiagnosisShadowAuditExportFile
): InjectedParityValidationReport {
  const rows = exportRowsToRealEncounterRows(exportFile.rows);
  const shadow = buildRealEncounterShadowValidationReport({ mode: "injected", rows });
  const parity = buildRealWorldParityValidationReport({ mode: "injected", rows });
  return {
    ...parity,
    exportSource: exportFile.meta.exportSource,
    shadowAggregate: shadow.aggregate,
  };
}

export function runApiDbParityValidation(input: {
  exportFile: EdDiagnosisShadowAuditExportFile;
  prismaRows: readonly PrismaDiagnosisExportInput[];
}): ApiDbParityValidationReport {
  const prismaExport = buildRealEdDiagnosisExport({ prismaRows: input.prismaRows });
  const prismaRows = exportRowsToRealEncounterRows(
    buildEdDiagnosisShadowAuditExportFileFromRows(
      input.prismaRows.map(mapPrismaDiagnosisToExportRow),
      {
        exportSource: "database",
        databaseAvailable: true,
        environment: "api_db",
      }
    ).rows
  );
  const injected = runInjectedParityValidation(input.exportFile);
  const apiShadow = buildRealEncounterShadowValidationReport({ mode: "api_db", rows: prismaRows });
  const apiParity = buildRealWorldParityValidationReport({ mode: "api_db", rows: prismaRows });

  const matchesInjectedExport =
    injected.totalRows === apiParity.totalRows &&
    Math.abs(injected.registryParityPercent - apiParity.registryParityPercent) < 0.01;

  return {
    ...apiParity,
    exportSource: "database",
    shadowAggregate: apiShadow.aggregate,
    matchesInjectedExport,
    injectedComparisonNotes: matchesInjectedExport
      ? ["api_db validation matches injected export parity metrics."]
      : [
          `Row count injected=${injected.totalRows} api_db=${apiParity.totalRows}`,
          `Parity injected=${injected.registryParityPercent.toFixed(1)}% api_db=${apiParity.registryParityPercent.toFixed(1)}%`,
        ],
  };
}

export function buildTop500DiagnosisTrafficAudit(
  exportFile: EdDiagnosisShadowAuditExportFile
): Top500DiagnosisTrafficAudit {
  const rows = exportRowsToRealEncounterRows(exportFile.rows);
  const shadow = buildRealEncounterShadowValidationReport({ mode: "injected", rows });
  const top = buildTopDiagnosisTrafficAudit(shadow.rows, 500);
  const top20HighRisk: Top500DiagnosisTrafficAudit["top20HighRisk"] = [];

  for (const row of top) {
    const text = `${row.icd} ${row.diagnosis}`.toLowerCase();
    for (const hr of HIGH_RISK_LABELS) {
      if (hr.match(row.icd, text)) {
        top20HighRisk.push({ ...row, highRiskLabel: hr.label });
        break;
      }
    }
    if (top20HighRisk.length >= 20) break;
  }

  return {
    rows: top,
    top50: top.slice(0, 50),
    top100: top.slice(0, 100),
    top20HighRisk,
  };
}

export function buildRealTrafficGenericFallbackAudit(
  exportFile: EdDiagnosisShadowAuditExportFile
): RealTrafficGenericFallbackAudit {
  const rows = exportRowsToRealEncounterRows(exportFile.rows);
  const shadow = buildRealEncounterShadowValidationReport({ mode: "injected", rows });
  const generic = buildGenericFallbackTrafficReport(shadow.rows);
  const enriched = generic.map((g) => {
    const match = shadow.rows.find(
      (r) => r.row.diagnosisCode === g.icd && r.row.diagnosisLabel === g.diagnosis
    );
    return {
      ...g,
      registryTemplateId: match?.registryTemplateId ?? "unknown",
      familyTemplateId: match?.familyTemplateId ?? "unknown",
    };
  });
  return {
    rows: enriched,
    highPriorityCount: enriched.filter((r) => r.priority === "HIGH_PRIORITY").length,
    mediumPriorityCount: enriched.filter((r) => r.priority === "MEDIUM_PRIORITY").length,
    lowPriorityCount: enriched.filter((r) => r.priority === "LOW_PRIORITY").length,
  };
}

export function buildRealTrafficHighRiskAudit(
  exportFile: EdDiagnosisShadowAuditExportFile
): RealTrafficHighRiskAudit {
  const rows = exportRowsToRealEncounterRows(exportFile.rows);
  const shadow = buildRealEncounterShadowValidationReport({ mode: "injected", rows });
  const base = buildHighRiskTrafficAudit(shadow.rows);
  const conditionSummaries = HIGH_RISK_LABELS.map((hr) => {
    const matches = shadow.rows.filter((r) =>
      hr.match(r.row.diagnosisCode, r.row.diagnosisLabel.toLowerCase())
    );
    const first = matches[0];
    return {
      condition: hr.label,
      count: matches.length,
      registryRoute: first?.registryTemplateId ?? "—",
      familyRoute: first?.familyTemplateId ?? "—",
      outcome: first?.outcome ?? "—",
      risk: matches.some((m) => m.outcome === "unsafe_no_map" || m.outcome === "regression_risk") ? "high" : "low",
    };
  }).filter((r) => r.count > 0);

  return { ...base, conditionSummaries };
}

export function buildRealTrafficGuardrailAudit(
  exportFile: EdDiagnosisShadowAuditExportFile
): RealTrafficGuardrailAudit {
  const rows = exportRowsToRealEncounterRows(exportFile.rows);
  const shadow = buildRealEncounterShadowValidationReport({ mode: "injected", rows });
  const pediatric = buildPediatricRoutingSafetyAudit(shadow.rows);
  const obgyn = buildObGynRoutingSafetyAudit(shadow.rows);
  return {
    pediatric,
    obgyn,
    adultToPediatricHardUnsafe: pediatric.hardUnsafeCount,
    obgynSexViolations: obgyn.sexViolationCount,
    passed: pediatric.passed && obgyn.passed,
  };
}

export function certifyLimitedPilotQualification(
  exportFile: EdDiagnosisShadowAuditExportFile
): LimitedPilotQualificationReport {
  const rows = exportRowsToRealEncounterRows(exportFile.rows);
  const parityReport = runInjectedParityValidation(exportFile);
  const guardrailAudit = buildRealTrafficGuardrailAudit(exportFile);
  const highRiskAudit = buildRealTrafficHighRiskAudit(exportFile);
  const highRiskSwitchPassed = buildHighRiskProductionSwitchSafetyReport().highRiskAuditPassed;
  const blockers: string[] = [];

  if (exportFile.meta.exportSource !== "database") {
    blockers.push(
      `Export source is ${exportFile.meta.exportSource} — real database export required for LIMITED_PILOT.`
    );
  }
  if (parityReport.totalRows < 500) {
    blockers.push(`Need ≥500 real ED diagnosis rows (have ${parityReport.totalRows}).`);
  }
  if (parityReport.registryParityPercent < 95) {
    blockers.push(`Parity ${parityReport.registryParityPercent.toFixed(1)}% below 95%.`);
  }
  if (parityReport.gatedSafeParityPercent < 100) {
    blockers.push(`Gated safe parity ${parityReport.gatedSafeParityPercent.toFixed(1)}% below 100%.`);
  }
  if (parityReport.regressionCount > 0) blockers.push(`Regression risk ${parityReport.regressionCount} > 0.`);
  if (parityReport.unsafeRoutedCount > 0) blockers.push(`Unsafe routed ${parityReport.unsafeRoutedCount} > 0.`);
  if (guardrailAudit.adultToPediatricHardUnsafe > 0) {
    blockers.push(`Adult→pediatric hard unsafe ${guardrailAudit.adultToPediatricHardUnsafe} > 0.`);
  }
  if (guardrailAudit.obgynSexViolations > 0) {
    blockers.push(`OB/GYN sex violations ${guardrailAudit.obgynSexViolations} > 0.`);
  }
  if (!highRiskAudit.passed || !highRiskSwitchPassed) {
    blockers.push("High-risk audit failed.");
  }
  if (!guardrailAudit.passed) blockers.push("Pediatric/OB-GYN guardrail audit failed.");

  const decision: LimitedPilotQualificationDecision =
    blockers.length === 0 ? "READY_FOR_LIMITED_PILOT" : "NOT_READY";

  return {
    decision,
    exportSource: exportFile.meta.exportSource,
    parityReport,
    guardrailAudit,
    highRiskAudit,
    blockers,
    notes: [
      `Evaluated ${parityReport.totalRows} exported rows.`,
      ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER === false
        ? "Feature flag OFF — production routing unchanged."
        : "WARNING: feature flag must remain OFF.",
    ],
  };
}

export function runRealWorldPilotQualification(input?: {
  exportFile?: EdDiagnosisShadowAuditExportFile;
  prismaRows?: readonly PrismaDiagnosisExportInput[];
  databaseAudit?: DatabaseAccessAudit;
}): {
  databaseAudit: DatabaseAccessAudit;
  exportReport: RealDiagnosisExportReport;
  injectedParity: InjectedParityValidationReport;
  apiDbParity: ApiDbParityValidationReport | null;
  top500: Top500DiagnosisTrafficAudit;
  genericFallback: RealTrafficGenericFallbackAudit;
  highRisk: RealTrafficHighRiskAudit;
  guardrails: RealTrafficGuardrailAudit;
  qualification: LimitedPilotQualificationReport;
  enterpriseReady: boolean;
  registryUnchanged: boolean;
  featureFlagOff: boolean;
} {
  const exportReport = buildRealEdDiagnosisExport({
    exportFile: input?.exportFile,
    prismaRows: input?.prismaRows,
    syntheticRowCount: 520,
  });
  const file =
    input?.exportFile ??
    loadEdDiagnosisShadowAuditExport({
      meta: exportReport.meta,
      rows:
        input?.prismaRows?.length
          ? input.prismaRows.map(mapPrismaDiagnosisToExportRow)
          : buildRealWorldEdTrafficRows(520).map(mapRealEncounterRowToExportRow),
    });

  const injectedParity = runInjectedParityValidation(file);
  const apiDbParity =
    input?.prismaRows?.length
      ? runApiDbParityValidation({ exportFile: file, prismaRows: input.prismaRows })
      : null;

  return {
    databaseAudit: input?.databaseAudit ?? auditDatabaseAccess({ databaseReachable: false }),
    exportReport,
    injectedParity,
    apiDbParity,
    top500: buildTop500DiagnosisTrafficAudit(file),
    genericFallback: buildRealTrafficGenericFallbackAudit(file),
    highRisk: buildRealTrafficHighRiskAudit(file),
    guardrails: buildRealTrafficGuardrailAudit(file),
    qualification: certifyLimitedPilotQualification(file),
    enterpriseReady: runEnterpriseDischargeCertification().enterpriseReady,
    registryUnchanged: productionRegistryResolverUnchanged(),
    featureFlagOff: ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER === false,
  };
}

/** Compare injected vs api_db row parity for test fixtures. */
export function compareExportParityMetrics(
  injected: InjectedParityValidationReport,
  apiDb: InjectedParityValidationReport
): { matches: boolean; notes: string[] } {
  const notes: string[] = [];
  const matches =
    injected.totalRows === apiDb.totalRows &&
    injected.registryParityPercent === apiDb.registryParityPercent &&
    injected.gatedSafeParityPercent === apiDb.gatedSafeParityPercent;
  if (!matches) {
    notes.push(`rows ${injected.totalRows} vs ${apiDb.totalRows}`);
    notes.push(`parity ${injected.registryParityPercent} vs ${apiDb.registryParityPercent}`);
  }
  return { matches, notes };
}

/** Resolve templates for export row — used in tests. */
export function resolveTemplatesForExportRow(row: RealEncounterDiagnosisExportRow): {
  registryTemplateId: string;
  familyTemplateId: string;
  classification: ReturnType<typeof classifyVarianceForProductionSwitch>;
} {
  const registry = resolveProviderDischargeTemplateForDiagnosis({
    code: row.diagnosisCode,
    displayName: row.diagnosisDescription,
  });
  const family = resolveClinicalConditionFamily({
    code: row.diagnosisCode,
    displayName: row.diagnosisDescription,
    context: {
      patientAgeYears: row.patientAgeYears,
      patientSex: row.patientSex,
    },
  });
  const compare = compareRegistryResolverToFamilyResolver({
    code: row.diagnosisCode,
    displayName: row.diagnosisDescription,
    context: { patientAgeYears: row.patientAgeYears, patientSex: row.patientSex },
  });
  return {
    registryTemplateId: registry.template.id,
    familyTemplateId: family.templateId,
    classification: classifyVarianceForProductionSwitch({
      shadowOutcome: compare.familyOutcome,
      registryTemplateId: registry.template.id,
      familyTemplateId: family.templateId,
      gatedResolverPath: "family_fallback_registry",
      familyRoutingStatus: family.family?.routingStatus ?? null,
    }),
  };
}

/** Test helper — qualifying traffic labeled as database export for threshold certification. */
export function buildQualifyingDatabaseExportFile(rowCount = 520): EdDiagnosisShadowAuditExportFile {
  const rows = buildRealWorldEdTrafficRows(rowCount).map(mapRealEncounterRowToExportRow);
  return buildEdDiagnosisShadowAuditExportFileFromRows(rows, {
    exportSource: "database",
    databaseAvailable: true,
    environment: "test_database_export",
    encounterTypeFilter: "EMERGENCY",
  });
}
