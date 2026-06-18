export type ExternalBillingExportReadinessStatus = "READY" | "READY_WITH_WARNINGS" | "NOT_READY";

export type ExternalBillingExportCertificationSummary = {
  status: ExternalBillingExportReadinessStatus;
  encounterCount: number;
  lineCount: number;
  missingPatientCount: number;
  missingEncounterCount: number;
  missingDiagnosisCount: number;
  missingClinicalPayloadCount: number;
  warningCount: number;
  blockerCount: number;
  warnings: string[];
  blockers: string[];
};

export type ExternalBillingExportCertificationLineInput = {
  encounterId: string;
  patientId?: string | null;
  mrn?: string | null;
  billingStatus?: string | null;
  medoraCode?: string | null;
  performedByTitle?: string | null;
  hasClinicalPayload?: boolean;
  isUnmapped?: boolean;
};

export type ExternalBillingExportCertificationEncounterInput = {
  encounterId: string;
  patientId?: string | null;
  mrn?: string | null;
  diagnosisCount: number;
  lineCount: number;
};

export type ExternalBillingExportCertificationInput = {
  facilityId?: string | null;
  encounters: readonly ExternalBillingExportCertificationEncounterInput[];
  lines: readonly ExternalBillingExportCertificationLineInput[];
  /** Internal Medora claim readiness — informational only; must not block external export. */
  internalBillingReady?: boolean;
};

export const EXTERNAL_BILLING_EXPORT_CSV_HEADERS = [
  "export_batch_id",
  "exported_at",
  "facility_id",
  "facility_name",
  "patient_id",
  "mrn",
  "patient_name",
  "dob",
  "sex",
  "encounter_id",
  "encounter_number",
  "encounter_type",
  "encounter_status",
  "arrival_at",
  "closed_at",
  "primary_provider_name",
  "primary_provider_title",
  "primary_diagnosis_code",
  "primary_diagnosis_description",
  "line_id",
  "source_type",
  "category",
  "medora_code",
  "display_name",
  "status",
  "performed_at",
  "performed_by_name",
  "performed_by_title",
  "billing_status",
  "billing_code_default",
  "coding_instruction",
  "clinical_summary",
  "clinical_payload_json",
] as const;

export const MAX_EXTERNAL_BILLING_WEEKLY_ENCOUNTER_COUNT = 500;

export function parseUtcCalendarDate(date: string): { start: Date; end: Date; date: string } {
  const trimmed = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("date must be YYYY-MM-DD");
  }
  const start = new Date(`${trimmed}T00:00:00.000Z`);
  const end = new Date(`${trimmed}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid date");
  }
  return { start, end, date: trimmed };
}

/** weekStart inclusive through weekStart + 6 days (7 calendar days, UTC). */
export function parseUtcWeekRange(weekStart: string): {
  weekStart: string;
  periodStart: string;
  periodEnd: string;
  start: Date;
  end: Date;
} {
  const { start, date } = parseUtcCalendarDate(weekStart);
  const endDay = new Date(start);
  endDay.setUTCDate(endDay.getUTCDate() + 6);
  const periodEnd = endDay.toISOString().slice(0, 10);
  const end = new Date(`${periodEnd}T23:59:59.999Z`);
  return {
    weekStart: date,
    periodStart: date,
    periodEnd,
    start,
    end,
  };
}

export function buildExternalBillingExportCertificationSummary(
  input: ExternalBillingExportCertificationInput
): ExternalBillingExportCertificationSummary {
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (!input.facilityId?.trim()) {
    blockers.push("Missing facility id");
  }

  const encounterCount = input.encounters.length;
  const lineCount = input.lines.length;

  if (encounterCount === 0) {
    blockers.push("No closed encounters in export period");
  }
  if (lineCount === 0 && encounterCount > 0) {
    blockers.push("No exportable line items");
  }

  let missingPatientCount = 0;
  let missingEncounterCount = 0;
  let missingDiagnosisCount = 0;
  let missingClinicalPayloadCount = 0;
  let candidateOnlyCount = 0;
  let unmappedCount = 0;
  let missingProviderTitleCount = 0;

  for (const enc of input.encounters) {
    if (!enc.encounterId?.trim()) {
      missingEncounterCount += 1;
      blockers.push("Missing encounter id");
      continue;
    }
    const hasPatient = Boolean(enc.patientId?.trim()) || Boolean(enc.mrn?.trim());
    if (!hasPatient) {
      missingPatientCount += 1;
    }
    if (enc.diagnosisCount === 0) {
      missingDiagnosisCount += 1;
    }
  }

  if (missingPatientCount > 0) {
    blockers.push(`Missing patient identifiers on ${missingPatientCount} encounter(s)`);
  }
  if (missingEncounterCount > 0) {
    blockers.push(`Missing encounter id on ${missingEncounterCount} row(s)`);
  }

  for (const line of input.lines) {
    if (!line.encounterId?.trim()) {
      missingEncounterCount += 1;
    }
    const hasPatient = Boolean(line.patientId?.trim()) || Boolean(line.mrn?.trim());
    if (!hasPatient) {
      missingPatientCount += 1;
    }
    if (line.hasClinicalPayload === false) {
      missingClinicalPayloadCount += 1;
    }
    if (line.billingStatus === "candidate_only") {
      candidateOnlyCount += 1;
    }
    if (line.isUnmapped) {
      unmappedCount += 1;
    }
    if (!line.performedByTitle?.trim()) {
      missingProviderTitleCount += 1;
    }
  }

  if (candidateOnlyCount > 0) {
    warnings.push(`${candidateOnlyCount} candidate-only billing code(s)`);
  }
  if (unmappedCount > 0) {
    warnings.push(`${unmappedCount} unmapped charge line(s)`);
  }
  if (missingProviderTitleCount > 0) {
    warnings.push(`${missingProviderTitleCount} missing optional provider title(s)`);
  }
  if (missingDiagnosisCount > 0) {
    warnings.push(`${missingDiagnosisCount} encounter(s) without documented diagnosis`);
  }
  if (missingClinicalPayloadCount > 0) {
    warnings.push(`${missingClinicalPayloadCount} line(s) without clinical payload`);
  }

  const blockerCount = blockers.length;
  const warningCount = warnings.length;

  let status: ExternalBillingExportReadinessStatus = "READY";
  if (blockerCount > 0) {
    status = "NOT_READY";
  } else if (warningCount > 0) {
    status = "READY_WITH_WARNINGS";
  }

  return {
    status,
    encounterCount,
    lineCount,
    missingPatientCount,
    missingEncounterCount,
    missingDiagnosisCount,
    missingClinicalPayloadCount,
    warningCount,
    blockerCount,
    warnings,
    blockers,
  };
}
