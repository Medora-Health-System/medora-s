export type ClinicalOnsetPrecision = "UNKNOWN" | "DATE" | "DATETIME";
export type ClinicalOnsetChoice = "UNKNOWN" | "NOW" | "CUSTOM_DATE" | "CUSTOM_DATETIME";

export type ClinicalOnsetValue = {
  choice: ClinicalOnsetChoice;
  /** YYYY-MM-DD for CUSTOM_DATE / CUSTOM_DATETIME */
  dateLocal?: string;
  /** HH:mm for CUSTOM_DATETIME */
  timeLocal?: string;
};

export type ClinicalOnsetApiPayload = {
  onsetDate: string | null;
  onsetPrecision: ClinicalOnsetPrecision;
};

export function defaultClinicalOnsetValue(): ClinicalOnsetValue {
  return { choice: "UNKNOWN" };
}

export function clinicalOnsetFromStored(input: {
  onsetDate: string | null | undefined;
  onsetPrecision?: string | null;
}): ClinicalOnsetValue {
  const precision = (input.onsetPrecision ?? "").toUpperCase();
  if (!input.onsetDate || precision === "UNKNOWN") {
    return { choice: "UNKNOWN" };
  }
  const d = new Date(input.onsetDate);
  if (Number.isNaN(d.getTime())) return { choice: "UNKNOWN" };
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateLocal = `${yyyy}-${mm}-${dd}`;
  if (precision === "DATE") {
    return { choice: "CUSTOM_DATE", dateLocal };
  }
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { choice: "CUSTOM_DATETIME", dateLocal, timeLocal: `${hh}:${min}` };
}

export function isClinicalOnsetComplete(value: ClinicalOnsetValue): boolean {
  if (value.choice === "UNKNOWN" || value.choice === "NOW") return true;
  if (value.choice === "CUSTOM_DATE") return Boolean(value.dateLocal?.trim());
  if (value.choice === "CUSTOM_DATETIME") {
    return Boolean(value.dateLocal?.trim() && value.timeLocal?.trim());
  }
  return false;
}

export function buildClinicalOnsetApiPayload(
  value: ClinicalOnsetValue,
  now = new Date()
): ClinicalOnsetApiPayload | { error: "incomplete" | "future" } {
  if (!isClinicalOnsetComplete(value)) return { error: "incomplete" };

  if (value.choice === "UNKNOWN") {
    return { onsetDate: null, onsetPrecision: "UNKNOWN" };
  }

  if (value.choice === "NOW") {
    return { onsetDate: now.toISOString(), onsetPrecision: "DATETIME" };
  }

  const dateLocal = value.dateLocal!.trim();
  if (value.choice === "CUSTOM_DATE") {
    const candidate = new Date(`${dateLocal}T12:00:00`);
    if (Number.isNaN(candidate.getTime())) return { error: "incomplete" };
    if (candidate.getTime() > now.getTime() + 2 * 60 * 60 * 1000) return { error: "future" };
    return { onsetDate: `${dateLocal}T00:00:00.000Z`, onsetPrecision: "DATE" };
  }

  const timeLocal = value.timeLocal!.trim();
  const candidate = new Date(`${dateLocal}T${timeLocal}:00`);
  if (Number.isNaN(candidate.getTime())) return { error: "incomplete" };
  if (candidate.getTime() > now.getTime() + 2 * 60 * 60 * 1000) return { error: "future" };
  return { onsetDate: candidate.toISOString(), onsetPrecision: "DATETIME" };
}

export function formatClinicalOnsetDisplay(
  onsetDate: string | null | undefined,
  onsetPrecision: string | null | undefined,
  locale: string,
  unknownLabel: string
): string {
  if (!onsetDate || (onsetPrecision ?? "").toUpperCase() === "UNKNOWN") return unknownLabel;
  const d = new Date(onsetDate);
  if (Number.isNaN(d.getTime())) return unknownLabel;
  if ((onsetPrecision ?? "").toUpperCase() === "DATE") {
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  }
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDocumentedAt(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
