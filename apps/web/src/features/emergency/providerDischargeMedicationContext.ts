/**
 * MEDUI.ED.DISCHARGE.PATIENT_SPECIFIC_ADDITIONS.4
 * Conservative medication-name extraction for discharge personalization context.
 * Display names only — no dosing, frequency, or inferred medication use from diagnoses.
 */

import type { HomeMedicationEntryForm, HomeMedicationStatus } from "./homeMedicationEntry";
import { erTriageV1FormFromVitalsJson } from "./medoraErTriageV1";
import type {
  ProviderDischargeDocumentationForm,
  ProviderDischargeMedicationLine,
} from "./providerDischargeDocumentationModel";
import { hydrateProviderDischargeDocumentationForm } from "./providerDischargeDocumentationModel";
import type { ErEdSummaryMarEventRow, ErEdSummaryMedicationOrderRow } from "./erEdSummaryMedicationMar";

export type DischargeMedicationSourceInput = {
  /** Explicit caller-provided names (highest trust when supplied). */
  explicitMedicationNames?: readonly string[];
  homeMedicationEntries?: readonly HomeMedicationEntryForm[];
  homeMedicationsSummary?: string | null;
  medicationOrderRows?: readonly ErEdSummaryMedicationOrderRow[];
  marEventRows?: readonly ErEdSummaryMarEventRow[];
  rawMedicationOrders?: readonly unknown[];
  providerDischargeMedicationLines?: readonly ProviderDischargeMedicationLine[];
  providerDischargeForm?: ProviderDischargeDocumentationForm;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
};

export type MedicationSourceWiringAuditRow = {
  source: string;
  fileOrModel: string;
  medicationNameField: string;
  activeCurrent: boolean | "partial";
  safeForDischargePersonalization: boolean;
  notes: string;
};

/** Phase 1 — static audit of medication sources relevant to ED discharge personalization. */
export const MEDICATION_SOURCE_WIRING_AUDIT: MedicationSourceWiringAuditRow[] = [
  {
    source: "Home medication entry (triage)",
    fileOrModel: "homeMedicationEntry.ts → HomeMedicationEntryForm.medicationName",
    medicationNameField: "medicationName",
    activeCurrent: true,
    safeForDischargePersonalization: true,
    notes: "Use when status is active; skip inactive/in_error",
  },
  {
    source: "Triage medications summary",
    fileOrModel: "medoraErTriageV1.ts → ErTriageV1Form.medicationsSummary",
    medicationNameField: "medicationsSummary (newline lines)",
    activeCurrent: true,
    safeForDischargePersonalization: true,
    notes: "Documentation-only home med lines; extract display name before dose tokens",
  },
  {
    source: "Patient clinical history profile",
    fileOrModel: "packages/shared patientClinicalHistoryProfile homeMedications",
    medicationNameField: "medicationsSummary",
    activeCurrent: "partial",
    safeForDischargePersonalization: true,
    notes: "Carry-forward into triage; same summary extraction",
  },
  {
    source: "Active medication orders",
    fileOrModel: "erEdSummaryMedicationMar.ts → ErEdSummaryMedicationOrderRow",
    medicationNameField: "medicationName",
    activeCurrent: true,
    safeForDischargePersonalization: true,
    notes: "Skip CANCELLED/DISCONTINUED statuses",
  },
  {
    source: "MAR administrations",
    fileOrModel: "erEdSummaryMedicationMar.ts → ErEdSummaryMarEventRow",
    medicationNameField: "medicationLabelSnapshot / medicationName",
    activeCurrent: true,
    safeForDischargePersonalization: true,
    notes: "Encounter-administered meds only; skip withheld/not-given actions",
  },
  {
    source: "Provider discharge medication lines",
    fileOrModel: "providerDischargeDocumentationModel → ProviderDischargeMedicationLine.displayName",
    medicationNameField: "displayName",
    activeCurrent: true,
    safeForDischargePersonalization: true,
    notes: "Discharge-specific med lines on diagnosis cards",
  },
  {
    source: "Discharge summary JSON",
    fileOrModel: "encounter.dischargeSummaryJson providerDischarge* fields",
    medicationNameField: "diagnosisDocs[].medicationLines[].displayName",
    activeCurrent: true,
    safeForDischargePersonalization: true,
    notes: "Read-only hydration; does not mutate saved JSON",
  },
  {
    source: "Medication reconciliation",
    fileOrModel: "Not a dedicated persisted model in MVP",
    medicationNameField: "—",
    activeCurrent: false,
    safeForDischargePersonalization: false,
    notes: "Captured via triage home meds summary instead",
  },
  {
    source: "Prescriptions / pharmacy dispense",
    fileOrModel: "chartApi ChartSummary.recentMedicationDispenses",
    medicationNameField: "catalogMedication.name",
    activeCurrent: "partial",
    safeForDischargePersonalization: false,
    notes: "Historical dispenses — not wired (avoid stale home med inference)",
  },
  {
    source: "Explicit PatientSpecificDischargeContext.medicationNames",
    fileOrModel: "providerDischargePatientSpecificAdditions.ts",
    medicationNameField: "medicationNames",
    activeCurrent: true,
    safeForDischargePersonalization: true,
    notes: "Caller override; merged last with dedupe",
  },
];

const INACTIVE_HOME_MED_STATUSES = new Set<HomeMedicationStatus>(["inactive", "in_error"]);

const INACTIVE_ORDER_STATUS_FRAGMENTS = [
  "cancel",
  "cancelled",
  "canceled",
  "discontinu",
  "provider_discontinued",
  "order_cancelled",
  "stopped",
  "void",
] as const;

const MAR_NON_ADMINISTERED_ACTION_FRAGMENTS = [
  "not given",
  "refused",
  "held",
  "withheld",
  "omitted",
  "non administr",
  "non-administr",
] as const;

const UNKNOWN_MEDICATION_TOKENS = new Set(["—", "-", "unknown", "n/a", "na", "none", ""]);

function readStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeMedicationDisplayName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function isKnownMedicationName(name: string): boolean {
  const normalized = normalizeMedicationDisplayName(name);
  if (!normalized) return false;
  if (UNKNOWN_MEDICATION_TOKENS.has(normalized.toLowerCase())) return false;
  return true;
}

export function isActiveHomeMedicationStatus(status: HomeMedicationStatus | string | undefined): boolean {
  if (!status) return true;
  return !INACTIVE_HOME_MED_STATUSES.has(status as HomeMedicationStatus);
}

export function isActiveMedicationOrderStatus(status: string | undefined | null): boolean {
  const normalized = readStr(status ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized || normalized === "—") return true;
  return !INACTIVE_ORDER_STATUS_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

export function isAdministeredMarAction(action: string | undefined | null): boolean {
  const normalized = readStr(action ?? "").toLowerCase();
  if (!normalized) return true;
  return !MAR_NON_ADMINISTERED_ACTION_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

export function dedupeMedicationNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = normalizeMedicationDisplayName(raw);
    if (!isKnownMedicationName(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Extract display name from a triage home-med summary line (before dose/route tokens). */
export function extractMedicationNameFromSummaryLine(line: string): string | null {
  const trimmed = normalizeMedicationDisplayName(line);
  if (!isKnownMedicationName(trimmed)) return null;

  const doseMatch = trimmed.match(
    /^(.+?)\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mL|unit|units?|%|ui|iu)\b/i
  );
  if (doseMatch?.[1]?.trim()) return normalizeMedicationDisplayName(doseMatch[1]);

  const routeMatch = trimmed.match(/^(.+?)\s+(?:PO|IV|IM|SC|SL|PR|INH|TOP|NG|GT|TD|OPHT|OTIC)\b/i);
  if (routeMatch?.[1]?.trim()) return normalizeMedicationDisplayName(routeMatch[1]);

  return trimmed;
}

export function extractMedicationNamesFromHomeMedications(
  entries: readonly HomeMedicationEntryForm[]
): string[] {
  return dedupeMedicationNames(
    entries
      .filter((entry) => isActiveHomeMedicationStatus(entry.status))
      .map((entry) => entry.medicationName)
  );
}

export function extractMedicationNamesFromHomeMedicationsSummary(summary: string | null | undefined): string[] {
  if (!summary?.trim()) return [];
  return dedupeMedicationNames(
    summary
      .split(/\r?\n/)
      .map(extractMedicationNameFromSummaryLine)
      .filter((name): name is string => Boolean(name))
  );
}

export function extractMedicationNamesFromOrders(
  rows: readonly ErEdSummaryMedicationOrderRow[]
): string[] {
  return dedupeMedicationNames(
    rows
      .filter((row) => isActiveMedicationOrderStatus(row.status))
      .map((row) => row.medicationName)
  );
}

export function extractMedicationNamesFromRawOrders(orders: readonly unknown[]): string[] {
  const names: string[] = [];
  for (const orderRaw of orders) {
    if (!orderRaw || typeof orderRaw !== "object" || Array.isArray(orderRaw)) continue;
    const order = orderRaw as Record<string, unknown>;
    const orderStatus = readStr(order.status);
    if (!isActiveMedicationOrderStatus(orderStatus)) continue;
    const items = Array.isArray(order.items) ? order.items : [];
    for (const itemRaw of items) {
      if (!itemRaw || typeof itemRaw !== "object" || Array.isArray(itemRaw)) continue;
      const item = itemRaw as Record<string, unknown>;
      if (readStr(item.catalogItemType) !== "MEDICATION") continue;
      const itemStatus = readStr(item.status) || readStr(item.lifecycleState) || orderStatus;
      if (!isActiveMedicationOrderStatus(itemStatus)) continue;
      const label =
        readStr(item.displayName) ||
        readStr(item.manualLabel) ||
        readStr((item.catalogMedication as { name?: string } | undefined)?.name) ||
        readStr(item.medicationName);
      if (label) names.push(label);
    }
  }
  return dedupeMedicationNames(names);
}

export function extractMedicationNamesFromMarEvents(rows: readonly ErEdSummaryMarEventRow[]): string[] {
  return dedupeMedicationNames(
    rows
      .filter((row) => isAdministeredMarAction(row.action))
      .map((row) => row.medicationName)
  );
}

export function extractMedicationNamesFromMedicationLines(
  lines: readonly ProviderDischargeMedicationLine[]
): string[] {
  return dedupeMedicationNames(lines.map((line) => line.displayName));
}

export function extractMedicationNamesFromProviderDischargeForm(
  form: ProviderDischargeDocumentationForm
): string[] {
  const names: string[] = [];
  for (const doc of form.diagnosisDocs) {
    names.push(...extractMedicationNamesFromMedicationLines(doc.medicationLines ?? []));
  }
  return dedupeMedicationNames(names);
}

export function extractMedicationNamesFromDischargeJson(dischargeSummaryJson: unknown): string[] {
  const form = hydrateProviderDischargeDocumentationForm(dischargeSummaryJson);
  return extractMedicationNamesFromProviderDischargeForm(form);
}

export function extractMedicationNamesFromNursingAssessment(nursingAssessment: unknown): string[] {
  if (!nursingAssessment) return [];
  try {
    const er = erTriageV1FormFromVitalsJson(nursingAssessment);
    return extractMedicationNamesFromHomeMedicationsSummary(er.medicationsSummary);
  } catch {
    return [];
  }
}

export function mergeMedicationNamesForDischargeContext(
  sources: DischargeMedicationSourceInput
): string[] {
  const buckets: string[][] = [];

  if (sources.homeMedicationEntries?.length) {
    buckets.push(extractMedicationNamesFromHomeMedications(sources.homeMedicationEntries));
  }
  if (sources.homeMedicationsSummary) {
    buckets.push(extractMedicationNamesFromHomeMedicationsSummary(sources.homeMedicationsSummary));
  }
  if (sources.nursingAssessment) {
    buckets.push(extractMedicationNamesFromNursingAssessment(sources.nursingAssessment));
  }
  if (sources.medicationOrderRows?.length) {
    buckets.push(extractMedicationNamesFromOrders(sources.medicationOrderRows));
  }
  if (sources.rawMedicationOrders?.length) {
    buckets.push(extractMedicationNamesFromRawOrders(sources.rawMedicationOrders));
  }
  if (sources.marEventRows?.length) {
    buckets.push(extractMedicationNamesFromMarEvents(sources.marEventRows));
  }
  if (sources.providerDischargeMedicationLines?.length) {
    buckets.push(extractMedicationNamesFromMedicationLines(sources.providerDischargeMedicationLines));
  }
  if (sources.providerDischargeForm) {
    buckets.push(extractMedicationNamesFromProviderDischargeForm(sources.providerDischargeForm));
  }
  if (sources.dischargeSummaryJson) {
    buckets.push(extractMedicationNamesFromDischargeJson(sources.dischargeSummaryJson));
  }
  if (sources.explicitMedicationNames?.length) {
    buckets.push(dedupeMedicationNames(sources.explicitMedicationNames));
  }

  return dedupeMedicationNames(buckets.flat());
}

export function buildDischargeMedicationContextFromSources(
  sources: DischargeMedicationSourceInput
): { medicationNames: string[] } {
  return { medicationNames: mergeMedicationNamesForDischargeContext(sources) };
}
