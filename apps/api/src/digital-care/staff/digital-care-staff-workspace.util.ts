import { parseClinicalStructuredResultData } from "@medora/shared";

export function digitalCarePatientDisplayName(patient: {
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}): string {
  const name = [patient.firstName, patient.middleName, patient.lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return name || "Patient";
}

export function digitalCareAgeYears(dob: Date | string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const birth = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function digitalCareVisitType(
  type: string | null | undefined,
  billingClassification?: string | null,
): "ED" | "INPATIENT" | "CLINIC" | "URGENT" | "OBSERVATION" | "OTHER" {
  if (billingClassification === "OBSERVATION") return "OBSERVATION";
  switch (type) {
    case "EMERGENCY":
      return "ED";
    case "INPATIENT":
      return "INPATIENT";
    case "OUTPATIENT":
      return "CLINIC";
    case "URGENT_CARE":
      return "URGENT";
    default:
      return "OTHER";
  }
}

export function digitalCareLooksLikeUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export function digitalCareInitials(displayName: string): string {
  const parts = displayName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !digitalCareLooksLikeUuid(part));
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? "P"}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function digitalCareParseSearchDate(raw: string): Date | null {
  const needle = raw.trim();
  if (!needle) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(needle);
  if (iso) {
    const date = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(needle);
  if (!slash) return null;
  const first = Number(slash[1]);
  const second = Number(slash[2]);
  const year = Number(slash[3]);
  const monthFirst = first > 12 ? second : first;
  const dayFirst = first > 12 ? first : second;
  const date = new Date(Date.UTC(year, monthFirst - 1, dayFirst));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function digitalCareSearchHaystack(input: {
  displayName: string;
  mrn?: string | null;
  phone?: string | null;
  email?: string | null;
  dob?: Date | string | null;
  visitType?: string | null;
  unit?: string | null;
}): string {
  const dob =
    input.dob instanceof Date
      ? input.dob.toISOString().slice(0, 10)
      : typeof input.dob === "string"
        ? input.dob.slice(0, 10)
        : "";
  return [input.displayName, input.mrn, input.phone, input.email, dob, input.visitType, input.unit]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export type DigitalCareResultRow = {
  test: string;
  result: string;
  unit: string | null;
  reference: string | null;
  flag: string | null;
};

export function digitalCareParseResultRows(resultData: unknown, resultText: string | null): DigitalCareResultRow[] {
  const structured = parseClinicalStructuredResultData(resultData);
  if (structured?.resultType === "LAB") {
    return structured.observations.map((observation) => ({
      test: observation.name,
      result: observation.value,
      unit: observation.unit ?? null,
      reference:
        observation.referenceText ??
        (observation.referenceLow != null || observation.referenceHigh != null
          ? `${observation.referenceLow ?? ""} – ${observation.referenceHigh ?? ""}`.trim()
          : null),
      flag: observation.flag ?? null,
    }));
  }
  if (resultData && typeof resultData === "object" && !Array.isArray(resultData)) {
    const rows = (resultData as Record<string, unknown>).rows;
    if (Array.isArray(rows)) {
      return rows
        .filter((row) => row && typeof row === "object")
        .map((row) => {
          const item = row as Record<string, unknown>;
          const test = String(item.test ?? item.label ?? item.name ?? "").trim();
          const result = String(item.result ?? item.value ?? item.display ?? "").trim();
          const unit = item.unit != null ? String(item.unit) : null;
          const reference =
            item.reference != null
              ? String(item.reference)
              : item.refLow != null || item.refHigh != null
                ? `${item.refLow ?? ""} – ${item.refHigh ?? ""}`.trim()
                : null;
          const flag = item.flag != null ? String(item.flag) : item.abnormal === true ? "ABN" : null;
          return { test, result, unit, reference, flag };
        })
        .filter((row) => row.test || row.result);
    }
  }
  if (!resultText?.trim()) return [];
  return resultText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [test, rest] = line.split(/[:\t]/);
      return { test: (test ?? line).trim(), result: (rest ?? "").trim(), unit: null, reference: null, flag: null };
    });
}

export function digitalCareImagingReport(resultData: unknown): {
  indication: string | null;
  technique: string | null;
  comparison: string | null;
  findings: string | null;
  impression: string | null;
  recommendation: string | null;
} | null {
  const structured = parseClinicalStructuredResultData(resultData);
  if (structured?.resultType !== "IMAGING") return null;
  const report = structured.report;
  return {
    indication: report.indication ?? null,
    technique: report.technique ?? null,
    comparison: report.comparison ?? null,
    findings: report.findings ?? null,
    impression: report.impression ?? null,
    recommendation: report.recommendation ?? null,
  };
}

export function digitalCareMedicationBucket(input: {
  encounterType?: string | null;
  fulfillment?: string | null;
  lifecycle?: string | null;
  orderStatus?: string | null;
  cancelledAt?: string | null;
}): "HOME" | "ED" | "HOSPITAL" | "DISCHARGE" | "PENDING" | "PHARMACY" | "DISCONTINUED" {
  if (input.cancelledAt || input.lifecycle === "DISCONTINUED" || input.orderStatus === "CANCELLED") {
    return "DISCONTINUED";
  }
  if (input.fulfillment === "PHARMACY_DISPENSE") return "PHARMACY";
  if (input.orderStatus === "PENDING") return "PENDING";
  if (input.encounterType === "EMERGENCY") return "ED";
  if (input.encounterType === "INPATIENT") return "HOSPITAL";
  if (input.lifecycle === "COMPLETED") return "DISCHARGE";
  return "PENDING";
}
