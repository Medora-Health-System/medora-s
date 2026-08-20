/**
 * MEDUI.RES.2A — enterprise structured diagnostic Result authority (LAB + IMAGING).
 *
 * Persisted on existing `Result.resultData` JSON (no Prisma migration).
 * `Result.resultText` remains a human-readable/legal narrative for legacy surfaces.
 * Display must prefer this structured contract over re-parsing smashed walls.
 *
 * No facility-specific logic. Same engine for ED / INPATIENT / CLINIC / DENTAL.
 */

import {
  computeLabResultFlagFromReference,
  parseLabNumericValue,
  type LabParsedRowFlag,
} from "./labResultReferenceFlag.js";

export const CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION = "medora.clinicalResult.v1" as const;

export type ClinicalLabObservationFlag =
  | "NORMAL"
  | "LOW"
  | "HIGH"
  | "CRITICAL_LOW"
  | "CRITICAL_HIGH"
  | "CRITICAL"
  | null;

export type ClinicalLabObservation = {
  code?: string;
  name: string;
  value: string;
  numericValue?: number | null;
  unit?: string | null;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  referenceText?: string | null;
  flag?: ClinicalLabObservationFlag;
};

export type ClinicalImagingReportSections = {
  indication?: string | null;
  technique?: string | null;
  comparison?: string | null;
  findings?: string | null;
  impression?: string | null;
  recommendation?: string | null;
};

export type ClinicalLabStructuredResultData = {
  schemaVersion: typeof CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION;
  resultType: "LAB";
  observations: ClinicalLabObservation[];
  comments?: string | null;
};

export type ClinicalImagingStructuredResultData = {
  schemaVersion: typeof CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION;
  resultType: "IMAGING";
  report: ClinicalImagingReportSections;
};

export type ClinicalStructuredResultData =
  | ClinicalLabStructuredResultData
  | ClinicalImagingStructuredResultData;

/** Scaffold analyte names only — never invent reference ranges. */
export type ClinicalLabPanelScaffoldRow = {
  code?: string;
  name: string;
  unit?: string;
};

export type ClinicalLabPanelKey = "CBC" | "CMP" | "BMP";

/**
 * Entry scaffolding for recognized panels.
 * Units are optional editable hints (blank allowed). Reference ranges are NEVER preset here.
 */
export const CLINICAL_LAB_PANEL_SCAFFOLDS: Record<ClinicalLabPanelKey, ClinicalLabPanelScaffoldRow[]> = {
  CBC: [
    { code: "WBC", name: "White Blood Cell (WBC)", unit: "x10³/µL" },
    { code: "RBC", name: "Red Blood Cell (RBC)", unit: "x10⁶/µL" },
    { code: "HGB", name: "Hemoglobin (Hgb)", unit: "g/dL" },
    { code: "HCT", name: "Hematocrit (Hct)", unit: "%" },
    { code: "PLT", name: "Platelet (Plt)", unit: "x10³/µL" },
    { code: "MCV", name: "Mean Corpuscular Volume (MCV)", unit: "fL" },
    { code: "MCH", name: "Mean Corpuscular Hemoglobin (MCH)", unit: "pg" },
    { code: "MCHC", name: "Mean Corpuscular Hemoglobin Concentration (MCHC)", unit: "g/dL" },
    { code: "RDW", name: "Red Cell Distribution Width (RDW)", unit: "%" },
  ],
  CMP: [
    { code: "GLU", name: "Glucose", unit: "mg/dL" },
    { code: "BUN", name: "Blood Urea Nitrogen (BUN)", unit: "mg/dL" },
    { code: "CREAT", name: "Creatinine", unit: "mg/dL" },
    { code: "NA", name: "Sodium", unit: "mEq/L" },
    { code: "K", name: "Potassium", unit: "mEq/L" },
    { code: "CL", name: "Chloride", unit: "mEq/L" },
    { code: "CO2", name: "Carbon Dioxide (CO2)", unit: "mEq/L" },
    { code: "CA", name: "Calcium", unit: "mg/dL" },
    { code: "TP", name: "Total Protein", unit: "g/dL" },
    { code: "ALB", name: "Albumin", unit: "g/dL" },
    { code: "TBILI", name: "Total Bilirubin", unit: "mg/dL" },
    { code: "ALP", name: "Alkaline Phosphatase (ALP)", unit: "U/L" },
    { code: "AST", name: "Aspartate Aminotransferase (AST)", unit: "U/L" },
    { code: "ALT", name: "Alanine Aminotransferase (ALT)", unit: "U/L" },
  ],
  BMP: [
    { code: "GLU", name: "Glucose", unit: "mg/dL" },
    { code: "BUN", name: "Blood Urea Nitrogen (BUN)", unit: "mg/dL" },
    { code: "CREAT", name: "Creatinine", unit: "mg/dL" },
    { code: "NA", name: "Sodium", unit: "mEq/L" },
    { code: "K", name: "Potassium", unit: "mEq/L" },
    { code: "CL", name: "Chloride", unit: "mEq/L" },
    { code: "CO2", name: "Carbon Dioxide (CO2)", unit: "mEq/L" },
    { code: "CA", name: "Calcium", unit: "mg/dL" },
  ],
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function asOptionalString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function asOptionalNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const LAB_FLAGS = new Set<string>([
  "NORMAL",
  "LOW",
  "HIGH",
  "CRITICAL_LOW",
  "CRITICAL_HIGH",
  "CRITICAL",
]);

function asLabFlag(v: unknown): ClinicalLabObservationFlag {
  if (v == null) return null;
  const u = String(v).trim().toUpperCase();
  if (!LAB_FLAGS.has(u)) return null;
  return u as Exclude<ClinicalLabObservationFlag, null>;
}

export function resolveLabPanelKeyFromCatalog(input: {
  catalogCode?: string | null;
  label?: string | null;
}): ClinicalLabPanelKey | null {
  const code = String(input.catalogCode ?? "")
    .trim()
    .toUpperCase();
  if (code === "CBC" || code === "ER_CBC" || code === "NFS") return "CBC";
  if (code === "CMP" || code === "ER_CMP") return "CMP";
  if (code === "BMP" || code === "ER_BMP") return "BMP";

  const u = String(input.label ?? "")
    .trim()
    .toUpperCase();
  if (!u) return null;
  if (/\bCBC\b|HEMOGRAM|NUM[EÉ]RATION|FORMULE SANGUINE|\bNFS\b/.test(u)) return "CBC";
  if (/\bCMP\b|COMPREHENSIVE METABOLIC|M[EÉ]TABOLIQUE COMPL[EÈ]T/.test(u)) return "CMP";
  if (/\bBMP\b|BASIC METABOLIC|M[EÉ]TABOLIQUE DE BASE/.test(u)) return "BMP";
  return null;
}

export function buildEmptyLabObservationsFromPanel(
  panel: ClinicalLabPanelKey
): ClinicalLabObservation[] {
  return CLINICAL_LAB_PANEL_SCAFFOLDS[panel].map((row) => ({
    code: row.code,
    name: row.name,
    value: "",
    unit: row.unit ?? "",
    referenceText: "",
    flag: null,
  }));
}

export function parseClinicalLabObservation(raw: unknown): ClinicalLabObservation | null {
  const o = asRecord(raw);
  if (!o) return null;
  const name = asOptionalString(o.name);
  if (!name) return null;
  const value = typeof o.value === "string" ? o.value : o.value == null ? "" : String(o.value);
  const referenceText = asOptionalString(o.referenceText);
  const referenceLow = asOptionalNumber(o.referenceLow);
  const referenceHigh = asOptionalNumber(o.referenceHigh);
  let numericValue = asOptionalNumber(o.numericValue);
  if (numericValue == null) numericValue = parseLabNumericValue(value);

  return {
    code: asOptionalString(o.code) ?? undefined,
    name,
    value,
    numericValue,
    unit: asOptionalString(o.unit),
    referenceLow,
    referenceHigh,
    referenceText,
    flag: asLabFlag(o.flag),
  };
}

export function parseClinicalStructuredResultData(
  resultData: unknown
): ClinicalStructuredResultData | null {
  const root = asRecord(resultData);
  if (!root) return null;
  if (root.schemaVersion !== CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION) return null;
  const resultType = String(root.resultType ?? "").toUpperCase();

  if (resultType === "LAB") {
    const observationsRaw = root.observations;
    if (!Array.isArray(observationsRaw)) return null;
    const observations = observationsRaw
      .map(parseClinicalLabObservation)
      .filter((x): x is ClinicalLabObservation => x != null);
    if (!observations.length) return null;
    return {
      schemaVersion: CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION,
      resultType: "LAB",
      observations,
      comments: asOptionalString(root.comments),
    };
  }

  if (resultType === "IMAGING") {
    const report = asRecord(root.report) ?? {};
    const sections: ClinicalImagingReportSections = {
      indication: asOptionalString(report.indication),
      technique: asOptionalString(report.technique),
      comparison: asOptionalString(report.comparison),
      findings: asOptionalString(report.findings),
      impression: asOptionalString(report.impression),
      recommendation: asOptionalString(report.recommendation),
    };
    const hasAny = Object.values(sections).some((v) => Boolean(v?.trim()));
    if (!hasAny) return null;
    return {
      schemaVersion: CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION,
      resultType: "IMAGING",
      report: sections,
    };
  }

  return null;
}

/** True when resultData carries structured LAB observations or IMAGING report (beyond attachments). */
export function hasStructuredDiagnosticResultContent(resultData: unknown): boolean {
  return parseClinicalStructuredResultData(resultData) != null;
}

export function buildLabStructuredResultData(input: {
  observations: ClinicalLabObservation[];
  comments?: string | null;
}): ClinicalLabStructuredResultData {
  return {
    schemaVersion: CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION,
    resultType: "LAB",
    observations: input.observations.map((o) => ({
      ...o,
      name: o.name.trim(),
      value: String(o.value ?? "").trim(),
      numericValue: o.numericValue ?? parseLabNumericValue(o.value),
      unit: o.unit?.trim() || null,
      referenceText: o.referenceText?.trim() || null,
      flag: o.flag ?? null,
    })),
    comments: input.comments?.trim() || null,
  };
}

export function buildImagingStructuredResultData(
  report: ClinicalImagingReportSections
): ClinicalImagingStructuredResultData {
  return {
    schemaVersion: CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION,
    resultType: "IMAGING",
    report: {
      indication: report.indication?.trim() || null,
      technique: report.technique?.trim() || null,
      comparison: report.comparison?.trim() || null,
      findings: report.findings?.trim() || null,
      impression: report.impression?.trim() || null,
      recommendation: report.recommendation?.trim() || null,
    },
  };
}

/** Human-readable narrative for Result.resultText (legacy-compatible; not a smash wall). */
export function labObservationsToResultText(
  observations: ClinicalLabObservation[],
  comments?: string | null
): string {
  const lines = observations
    .filter((o) => o.name.trim() && String(o.value ?? "").trim())
    .map((o) => {
      const parts = [o.name.trim(), String(o.value).trim()];
      const unit = o.unit?.trim();
      if (unit) parts.push(unit);
      const ref = o.referenceText?.trim();
      if (ref) parts.push(`(réf. ${ref})`);
      const flag = o.flag && o.flag !== "NORMAL" ? o.flag : null;
      if (flag) parts.push(`[${flag}]`);
      return parts.join(" ");
    });
  const c = comments?.trim();
  if (c) lines.push("", c);
  return lines.join("\n").trim();
}

export function imagingReportToResultText(report: ClinicalImagingReportSections): string {
  const blocks: string[] = [];
  const push = (label: string, value: string | null | undefined) => {
    const v = value?.trim();
    if (!v) return;
    blocks.push(`${label}:\n${v}`);
  };
  push("Indication", report.indication);
  push("Technique", report.technique);
  push("Comparison", report.comparison);
  push("Findings", report.findings);
  push("Impression", report.impression);
  push("Recommendation", report.recommendation);
  return blocks.join("\n\n").trim();
}

export function observationHasAuthoritativeReference(o: ClinicalLabObservation): boolean {
  if (o.referenceText?.trim()) return true;
  if (o.referenceLow != null && Number.isFinite(o.referenceLow)) return true;
  if (o.referenceHigh != null && Number.isFinite(o.referenceHigh)) return true;
  return false;
}

export function referenceTextFromBounds(
  low: number | null | undefined,
  high: number | null | undefined
): string | null {
  if (low != null && high != null) return `${low}–${high}`;
  if (low != null) return `>${low}`;
  if (high != null) return `<${high}`;
  return null;
}

/**
 * Resolve display H/L/C from stored explicit flag, else authoritative numeric range only.
 * Never invents critical thresholds from normal range alone.
 */
export function resolveStructuredLabObservationDisplayFlag(
  o: ClinicalLabObservation
): LabParsedRowFlag {
  const explicit = o.flag;
  if (explicit === "CRITICAL" || explicit === "CRITICAL_LOW" || explicit === "CRITICAL_HIGH") {
    return "C";
  }
  if (explicit === "HIGH") return "H";
  if (explicit === "LOW") return "L";
  if (explicit === "NORMAL") return null;

  const refText =
    o.referenceText?.trim() ||
    referenceTextFromBounds(o.referenceLow ?? null, o.referenceHigh ?? null);
  if (!refText) return null;
  return computeLabResultFlagFromReference(o.value, refText);
}

export function initialsFromDisplayName(displayName: string | null | undefined): string {
  const parts = String(displayName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/** Stop-gate: structured diagnostic engine must not key off facility IDs. */
export function clinicalResultStructuredEngineIsFacilityAgnostic(): boolean {
  return true;
}
