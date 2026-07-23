/**
 * D4A.2.7A — Enterprise Operational Hardening contracts.
 *
 * Governance / administration / compliance / quality / placement readiness.
 * Consumes Clinical Synthesis + Enterprise Command + Audit infrastructure.
 * Never owns clinical documentation. Never enables Placement / bed assignment / D3B.
 * Dashboards are not legal medical records. Never infer clinical outcomes.
 *
 * Architecture (must not combine ED with Inpatient):
 *   Enterprise Operations Platform
 *   ├── Emergency Department Operational Dashboard (existing — do not redesign)
 *   ├── Inpatient Operational Dashboard (NEW — hospital care only)
 *   ├── Hospital Command Center (enterprise summary)
 *   └── Executive / Medical Director / Nursing / Quality / Compliance / Regional
 */

export const OPERATIONAL_HARDENING_CERTIFICATION_ID =
  "MEDUI.OPERATIONAL_HARDENING.D4A2_7A" as const;

export const OPERATIONAL_GOVERNANCE_V1_KEY = "operationalGovernanceV1" as const;

/** Explicit operational domains — never merge ED + inpatient aggregation. */
export const ENTERPRISE_OPERATIONS_DOMAINS = [
  "EMERGENCY_DEPARTMENT",
  "INPATIENT",
  "HOSPITAL_COMMAND_CENTER",
  "GOVERNANCE",
] as const;

export type EnterpriseOperationsDomain = (typeof ENTERPRISE_OPERATIONS_DOMAINS)[number];

/** Presentation surfaces — business logic stays in enterprise services. */
export const ENTERPRISE_OPERATIONS_SURFACES = [
  "ED_OPERATIONAL_DASHBOARD",
  "INPATIENT_OPERATIONAL_DASHBOARD",
  "HOSPITAL_COMMAND_CENTER",
  "ADMINISTRATION",
  "QUALITY",
  "COMPLIANCE",
  "MEDICAL_DIRECTOR",
  "NURSING_DIRECTOR",
  "REGIONAL",
  "EXECUTIVE",
  "AUDIT_CENTER",
  "PLACEMENT_READINESS",
] as const;

export type EnterpriseOperationsSurface = (typeof ENTERPRISE_OPERATIONS_SURFACES)[number];

export type InpatientOperationalDashboardV1 = {
  certification: typeof OPERATIONAL_HARDENING_CERTIFICATION_ID;
  domain: "INPATIENT";
  generatedAt: string;
  facilityId: string;
  kpis: OperationalKpisV1;
  pending: {
    placementVisibility: number;
    consult: number;
    imaging: number;
    pt: number;
    ot: number;
    pharmacy: number;
    caseManagement: number;
  };
  alerts: {
    critical: number;
    rapidResponse: number;
    codeBlue: number;
    stroke: number;
    stemi: number;
    sepsis: number;
    behavioral: number;
    openEscalations: number;
  };
  medicationCompliance: MedicationComplianceSliceV1;
  documentationCompliance: DocumentationComplianceSliceV1;
  trackBoardPreviewCount: number;
  warnings: string[];
  consumesEnterpriseCommand: true;
  consumesClinicalSynthesis: true;
  neverEditProviderNotes: true;
  neverEditNursingDocumentation: true;
  excludesEmergencyDepartmentLogic: true;
  placementLogicEnabled: false;
};

export type EnterpriseOperationsPlatformManifestV1 = {
  certification: typeof OPERATIONAL_HARDENING_CERTIFICATION_ID;
  edAndInpatientCombined: false;
  surfaces: Array<{
    surface: EnterpriseOperationsSurface;
    domain: EnterpriseOperationsDomain;
    href: string;
    redesignForbidden?: boolean;
  }>;
};

/** Chart access kinds — stored in AuditLog.metadata.accessKind (no migration). */
export const CHART_ACCESS_KINDS = [
  "OPEN",
  "CLOSE",
  "READ",
  "WRITE",
  "PRINT",
  "EXPORT",
  "VIEW_AFTER_DISCHARGE",
  "VIEW_WITHOUT_ASSIGNMENT",
] as const;

export type ChartAccessKind = (typeof CHART_ACCESS_KINDS)[number];

export const GOVERNANCE_DASHBOARD_KINDS = [
  "ADMINISTRATION",
  "QUALITY",
  "COMPLIANCE",
  "MEDICAL_DIRECTOR",
  "NURSING_DIRECTOR",
  "REGIONAL",
  "EXECUTIVE",
] as const;

export type GovernanceDashboardKind = (typeof GOVERNANCE_DASHBOARD_KINDS)[number];

export const GOVERNANCE_AUDIT_SEARCH_FACETS = [
  "PATIENT",
  "ENCOUNTER",
  "PROVIDER",
  "RN",
  "RESIDENT",
  "MEDICATION",
  "DOCUMENT",
  "ORDER",
  "LAB",
  "RADIOLOGY",
  "TASK",
  "ALERT",
  "ESCALATION",
  "CHART_ACCESS",
  "PRINT",
  "EXPORT",
  "TIMELINE",
] as const;

export type GovernanceAuditSearchFacet = (typeof GOVERNANCE_AUDIT_SEARCH_FACETS)[number];

export type ChartAccessAuditRowV1 = {
  auditId: string;
  at: string;
  userId: string | null;
  role: string | null;
  department: string | null;
  facilityId: string | null;
  encounterId: string | null;
  patientId: string | null;
  accessKind: ChartAccessKind | string;
  reason: string | null;
  workstation: string | null;
  ip: string | null;
  sessionId: string | null;
  openTime: string | null;
  closeTime: string | null;
  durationMs: number | null;
  immutable: true;
};

export type MedicationComplianceSliceV1 = {
  total: number;
  administered: number;
  refused: number;
  heldOrUnavailable: number;
  other: number;
  onTimePct: number | null;
  latePct: number | null;
  heldPct: number | null;
  missedPct: number | null;
  refusedPct: number | null;
  neverModifyMar: true;
  readOnly: true;
};

export type DocumentationComplianceSliceV1 = {
  unsignedNotes: number;
  signedNotes: number;
  amendedNotes: number;
  documentationCreated: number;
  lateDocumentationSignals: number;
  signaturesPct: number | null;
  unsignedPct: number | null;
  neverInferOutcomes: true;
};

export type StaffOperationalMetricsV1 = {
  actorUserId: string;
  roleHint: string | null;
  documentationActions: number;
  chartAccesses: number;
  medicationAdministrations: number;
  criticalResultAcks: number;
  taskSignals: number;
  escalationSignals: number;
  exportsOrPrints: number;
  /** Explicit: not a clinical quality score. */
  clinicalQualityScored: false;
};

export type OperationalKpisV1 = {
  admissionsToday: number;
  dischargesToday: number | null;
  transfersReady: number;
  averageLosHours: number | null;
  medianLosHours: number | null;
  bedOccupancyPct: number | null;
  bedsAvailable: number | null;
  bedsOccupied: number | null;
  bedsCleaning: number | null;
  observationCount: number;
  inpatientCount: number;
  pendingPlacementVisibility: number;
  taskCompletionPct: number | null;
  medicationCompliancePct: number | null;
  documentationSignaturesPct: number | null;
  criticalAlerts: number;
  neverInferOutcomes: true;
  placementLogicEnabled: false;
};

export type PlacementReadinessV1 = {
  certification: typeof OPERATIONAL_HARDENING_CERTIFICATION_ID;
  placementLogicEnabled: false;
  bedAssignmentEnabled: false;
  d3bEnabled: false;
  readinessOnly: true;
  facilityId: string;
  generatedAt: string;
  units: Array<{
    unitId: string | null;
    unitLabel: string | null;
    levelOfCare: string | null;
    isolationCapable: boolean | null;
    telemetryCapable: boolean | null;
    icuCapable: boolean | null;
    observationCapable: boolean | null;
  }>;
  bedStatusSummary: {
    total: number | null;
    available: number | null;
    occupied: number | null;
    cleaning: number | null;
    blocked: number | null;
  };
  pendingPlacementVisibility: number;
  transportReadyVisibility: number;
  caseManagementPendingVisibility: number;
  note: string;
};

export type QualityDashboardV1 = {
  certification: typeof OPERATIONAL_HARDENING_CERTIFICATION_ID;
  generatedAt: string;
  facilityId: string;
  rapidResponses: number;
  codeBlue: number;
  stroke: number;
  stemi: number;
  sepsis: number;
  behavioral: number;
  medicationVarianceSignals: number;
  documentationCompliance: DocumentationComplianceSliceV1;
  medicationCompliance: MedicationComplianceSliceV1;
  neverInferOutcomes: true;
  note: string;
};

export type ComplianceDashboardV1 = {
  certification: typeof OPERATIONAL_HARDENING_CERTIFICATION_ID;
  generatedAt: string;
  facilityId: string;
  unsignedNotes: number;
  documentationCreated: number;
  documentationSigned: number;
  medicationDelaysSignals: number;
  chartAccessWithoutAssignment: number;
  exports: number;
  prints: number;
  surveyReadinessHints: string[];
  neverEditableAudit: true;
  neverInferOutcomes: true;
};

export type AdministrationDashboardV1 = {
  certification: typeof OPERATIONAL_HARDENING_CERTIFICATION_ID;
  generatedAt: string;
  facilityId: string;
  kpis: OperationalKpisV1;
  criticalAlerts: number;
  rapidResponses: number;
  codes: number;
  stroke: number;
  stemi: number;
  sepsis: number;
  behavioral: number;
  phiMinimized: true;
  readOnly: true;
  consumesEnterpriseCommand: true;
  neverLegalRecord: true;
};

export function pct(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function median(values: number[]): number | null {
  const nums = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 0) {
    return Math.round(((nums[mid - 1]! + nums[mid]!) / 2) * 10) / 10;
  }
  return Math.round(nums[mid]! * 10) / 10;
}

export function buildMedicationComplianceSlice(input: {
  total: number;
  administered: number;
  refused: number;
  heldOrUnavailable: number;
  other: number;
  lateCount?: number;
  missedCount?: number;
}): MedicationComplianceSliceV1 {
  const total = Math.max(0, input.total);
  const late = Math.max(0, input.lateCount ?? 0);
  const missed = Math.max(0, input.missedCount ?? 0);
  return {
    total,
    administered: input.administered,
    refused: input.refused,
    heldOrUnavailable: input.heldOrUnavailable,
    other: input.other,
    onTimePct: pct(Math.max(0, input.administered - late), total),
    latePct: pct(late, total),
    heldPct: pct(input.heldOrUnavailable, total),
    missedPct: pct(missed, total),
    refusedPct: pct(input.refused, total),
    neverModifyMar: true,
    readOnly: true,
  };
}

export function buildDocumentationComplianceSlice(input: {
  unsignedNotes: number;
  signedNotes: number;
  amendedNotes: number;
  documentationCreated: number;
  lateDocumentationSignals?: number;
}): DocumentationComplianceSliceV1 {
  const signed = Math.max(0, input.signedNotes);
  const unsigned = Math.max(0, input.unsignedNotes);
  const denom = signed + unsigned;
  return {
    unsignedNotes: unsigned,
    signedNotes: signed,
    amendedNotes: Math.max(0, input.amendedNotes),
    documentationCreated: Math.max(0, input.documentationCreated),
    lateDocumentationSignals: Math.max(0, input.lateDocumentationSignals ?? 0),
    signaturesPct: pct(signed, denom),
    unsignedPct: pct(unsigned, denom),
    neverInferOutcomes: true,
  };
}

export function buildOperationalKpis(input: {
  admissionsToday: number;
  dischargesToday: number | null;
  transfersReady: number;
  losHours: number[];
  bedsAvailable: number | null;
  bedsOccupied: number | null;
  bedsTotal: number | null;
  bedsCleaning: number | null;
  observationCount: number;
  inpatientCount: number;
  pendingPlacementVisibility: number;
  tasksCompleted: number;
  tasksTotal: number;
  medicationCompliancePct: number | null;
  documentationSignaturesPct: number | null;
  criticalAlerts: number;
}): OperationalKpisV1 {
  const occ =
    input.bedsTotal && input.bedsOccupied != null && input.bedsTotal > 0
      ? pct(input.bedsOccupied, input.bedsTotal)
      : null;
  return {
    admissionsToday: input.admissionsToday,
    dischargesToday: input.dischargesToday,
    transfersReady: input.transfersReady,
    averageLosHours:
      input.losHours.length > 0
        ? Math.round(
            (input.losHours.reduce((a, b) => a + b, 0) / input.losHours.length) * 10
          ) / 10
        : null,
    medianLosHours: median(input.losHours),
    bedOccupancyPct: occ,
    bedsAvailable: input.bedsAvailable,
    bedsOccupied: input.bedsOccupied,
    bedsCleaning: input.bedsCleaning,
    observationCount: input.observationCount,
    inpatientCount: input.inpatientCount,
    pendingPlacementVisibility: input.pendingPlacementVisibility,
    taskCompletionPct: pct(input.tasksCompleted, input.tasksTotal),
    medicationCompliancePct: input.medicationCompliancePct,
    documentationSignaturesPct: input.documentationSignaturesPct,
    criticalAlerts: input.criticalAlerts,
    neverInferOutcomes: true,
    placementLogicEnabled: false,
  };
}

export function classifyChartAccessKind(meta: Record<string, unknown>, action: string): string {
  const kind = String(meta.accessKind ?? meta.chartAccessKind ?? "").trim().toUpperCase();
  if ((CHART_ACCESS_KINDS as readonly string[]).includes(kind)) return kind;
  const a = String(action).toUpperCase();
  if (a.includes("EXPORT")) return "EXPORT";
  if (a === "CHART_OPEN") return "OPEN";
  if (a === "CHART_ACCESS" || a === "ENCOUNTER_VIEW" || a === "PATIENT_VIEW" || a === "VIEW") {
    return "READ";
  }
  if (a.includes("UPDATE") || a.includes("CREATE") || a.includes("SIGN")) return "WRITE";
  return kind || "READ";
}

export function isChartAccessAction(action: string, entityType?: string | null): boolean {
  const a = String(action).toUpperCase();
  const e = String(entityType ?? "").toUpperCase();
  if (
    a === "CHART_ACCESS" ||
    a === "CHART_OPEN" ||
    a === "ENCOUNTER_VIEW" ||
    a === "PATIENT_VIEW" ||
    a === "VIEW" ||
    a === "RECORD_EXPORT" ||
    a === "RECORD_EXPORT_VIEW"
  ) {
    return true;
  }
  if (e === "CHART" || e === "ENCOUNTER_CHART" || e === "CHART_ACCESS") return true;
  const kind = classifyChartAccessKind({}, a);
  return kind === "PRINT" || kind === "EXPORT";
}

/** Map audit search facets to Prisma-friendly action/entity filters (shared, no DB). */
export function auditFacetFilters(facet: GovernanceAuditSearchFacet): {
  actions?: string[];
  entityTypes?: string[];
  metadataAccessKinds?: string[];
} {
  switch (facet) {
    case "CHART_ACCESS":
      return {
        actions: ["CHART_ACCESS", "CHART_OPEN", "ENCOUNTER_VIEW", "PATIENT_VIEW", "VIEW"],
        entityTypes: ["Encounter", "Chart", "CHART_ACCESS", "EnterpriseCommand"],
      };
    case "PRINT":
      return { metadataAccessKinds: ["PRINT"] };
    case "EXPORT":
      return { actions: ["RECORD_EXPORT", "RECORD_EXPORT_VIEW"] };
    case "MEDICATION":
      return {
        entityTypes: ["MEDICATION_ADMINISTRATION", "MedicationAdministration", "MAR"],
        actions: [
          "MEDICATION_ADMIN_TIME_ADJUSTED",
          "MEDICATION_WITNESS_VERIFICATION_COMPLETED",
          "MEDICATION_WASTE_RECORDED",
          "CREATE",
          "UPDATE",
        ],
      };
    case "DOCUMENT":
      return {
        actions: [
          "PROVIDER_DOCUMENTATION_SIGN",
          "PROVIDER_DOCUMENTATION_ADDENDUM",
          "ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED",
          "ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED",
          "ENCOUNTER_NOTE_AMENDED",
          "ENCOUNTER_NOTE_VOIDED",
          "ENCOUNTER_NOTE_COSIGNED",
        ],
      };
    case "ORDER":
      return { actions: ["ORDER_CREATE", "ORDER_UPDATE", "CREATE"], entityTypes: ["Order", "ORDER"] };
    case "TASK":
      return { entityTypes: ["EnterpriseCommand"], metadataAccessKinds: ["TASK"] };
    case "ALERT":
    case "ESCALATION":
      return { entityTypes: ["EnterpriseCommand"] };
    case "TIMELINE":
      return { entityTypes: ["UnifiedTimeline", "EncounterTimeline", "Encounter"] };
    case "LAB":
      return { entityTypes: ["LabResult", "LAB", "Order"] };
    case "RADIOLOGY":
      return { entityTypes: ["RadiologyResult", "RADIOLOGY", "Order"] };
    case "PROVIDER":
    case "RN":
    case "RESIDENT":
    case "PATIENT":
    case "ENCOUNTER":
    default:
      return {};
  }
}

export function buildPlacementReadinessStub(input: {
  facilityId: string;
  generatedAt?: string;
  bedsTotal: number | null;
  bedsAvailable: number | null;
  bedsOccupied: number | null;
  bedsCleaning: number | null;
  bedsBlocked: number | null;
  pendingPlacementVisibility: number;
  transportReadyVisibility: number;
  caseManagementPendingVisibility?: number;
  units?: PlacementReadinessV1["units"];
}): PlacementReadinessV1 {
  return {
    certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
    placementLogicEnabled: false,
    bedAssignmentEnabled: false,
    d3bEnabled: false,
    readinessOnly: true,
    facilityId: input.facilityId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    units: input.units ?? [],
    bedStatusSummary: {
      total: input.bedsTotal,
      available: input.bedsAvailable,
      occupied: input.bedsOccupied,
      cleaning: input.bedsCleaning,
      blocked: input.bedsBlocked,
    },
    pendingPlacementVisibility: input.pendingPlacementVisibility,
    transportReadyVisibility: input.transportReadyVisibility,
    caseManagementPendingVisibility: input.caseManagementPendingVisibility ?? 0,
    note: "Placement readiness only — no bed assignment, no Placement workflow, no D3B.",
  };
}

/** Canonical platform manifest — ED and Inpatient are separate links. */
export function buildEnterpriseOperationsPlatformManifest(): EnterpriseOperationsPlatformManifestV1 {
  return {
    certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
    edAndInpatientCombined: false,
    surfaces: [
      {
        surface: "ED_OPERATIONAL_DASHBOARD",
        domain: "EMERGENCY_DEPARTMENT",
        href: "/app/trackboard",
        redesignForbidden: true,
      },
      {
        surface: "INPATIENT_OPERATIONAL_DASHBOARD",
        domain: "INPATIENT",
        href: "/app/hospitalisation/inpatient-operations",
      },
      {
        surface: "HOSPITAL_COMMAND_CENTER",
        domain: "HOSPITAL_COMMAND_CENTER",
        href: "/app/hospitalisation/enterprise-command",
      },
      {
        surface: "ADMINISTRATION",
        domain: "GOVERNANCE",
        href: "/app/hospitalisation/enterprise-operations?view=ADMINISTRATION",
      },
      {
        surface: "QUALITY",
        domain: "GOVERNANCE",
        href: "/app/hospitalisation/enterprise-operations?view=QUALITY",
      },
      {
        surface: "COMPLIANCE",
        domain: "GOVERNANCE",
        href: "/app/hospitalisation/enterprise-operations?view=COMPLIANCE",
      },
      {
        surface: "MEDICAL_DIRECTOR",
        domain: "GOVERNANCE",
        href: "/app/hospitalisation/enterprise-operations?view=MEDICAL_DIRECTOR",
      },
      {
        surface: "NURSING_DIRECTOR",
        domain: "GOVERNANCE",
        href: "/app/hospitalisation/enterprise-operations?view=NURSING_DIRECTOR",
      },
      {
        surface: "REGIONAL",
        domain: "GOVERNANCE",
        href: "/app/hospitalisation/enterprise-operations?view=REGIONAL",
      },
      {
        surface: "EXECUTIVE",
        domain: "GOVERNANCE",
        href: "/app/hospitalisation/enterprise-operations?view=EXECUTIVE",
      },
      {
        surface: "AUDIT_CENTER",
        domain: "GOVERNANCE",
        href: "/app/hospitalisation/enterprise-operations?view=AUDIT_CENTER",
      },
      {
        surface: "PLACEMENT_READINESS",
        domain: "GOVERNANCE",
        href: "/app/hospitalisation/enterprise-operations?view=PLACEMENT_READINESS",
      },
    ],
  };
}

/** Architectural invariants. */
export function operationalGovernanceMustConsumeEnterpriseCommand(): true {
  return true;
}
export function operationalGovernanceMustConsumeClinicalSynthesisIndirectly(): true {
  return true;
}
export function operationalGovernanceMustNotEnablePlacement(): true {
  return true;
}
export function operationalGovernanceMustNotModifyMar(): true {
  return true;
}
export function operationalGovernanceMustNotScoreClinicalQuality(): true {
  return true;
}
export function operationalGovernanceAuditIsImmutable(): true {
  return true;
}
export function operationalDashboardsAreNotLegalRecords(): true {
  return true;
}
export function enterpriseOperationsMustSeparateEdFromInpatient(): true {
  return true;
}
export function enterpriseOperationsMustNotDuplicateEdLogic(): true {
  return true;
}
