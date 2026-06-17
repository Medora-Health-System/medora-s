/** MEDUI.ED.MAR.H9L — medication response documentation governance (append-only notes). */

import { extractMarUserFreeTextNotes } from "./medicationAdministrationInjectionSite.js";

export const MAR_MEDICATION_RESPONSE_NOTE_PREFIX = "MAR_MEDICATION_RESPONSE:";

export const MAR_MEDICATION_RESPONSE_CODES = [
  "NO_ADVERSE_REACTION",
  "EFFECTIVE",
  "PARTIALLY_EFFECTIVE",
  "INEFFECTIVE",
  "SYMPTOMS_IMPROVED",
  "NO_CHANGE",
  "PAIN_REDUCED",
  "PAIN_UNCHANGED",
  "NAUSEA_REDUCED",
  "NAUSEA_UNCHANGED",
  "RESPIRATORY_IMPROVED",
  "SEDATION_PRESENT",
  "ADVERSE_REACTION_REPORTED",
  "OTHER",
] as const;

export type MarMedicationResponseCode = (typeof MAR_MEDICATION_RESPONSE_CODES)[number];

export type MarMedicationResponseSeverity = "routine" | "neutral" | "safety";

export type MarMedicationResponsePayload = {
  responseCode: MarMedicationResponseCode;
  responseDetail?: string | null;
  responseTime?: string | null;
  documentedAt?: string | null;
  painBefore?: number | null;
  painAfter?: number | null;
};

export type ParsedMarMedicationResponse = {
  responseCode: MarMedicationResponseCode;
  responseDetail: string | null;
  responseTime: string | null;
  documentedAt: string;
  painBefore: number | null;
  painAfter: number | null;
};

export type MarMedicationResponseValidationResult =
  | { ok: true; value: Required<Pick<MarMedicationResponsePayload, "responseCode">> & MarMedicationResponsePayload }
  | { ok: false; message: string };

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function parsePainScore(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 10) return null;
  return n;
}

export function isMarMedicationResponseCode(
  value: string | null | undefined
): value is MarMedicationResponseCode {
  const v = value?.trim();
  return Boolean(v && (MAR_MEDICATION_RESPONSE_CODES as readonly string[]).includes(v));
}

export function resolveMarMedicationResponseLabelKey(
  code: MarMedicationResponseCode | string | null | undefined
): string | null {
  const v = code?.trim();
  if (!v || !isMarMedicationResponseCode(v)) return null;
  return `marMedicationResponse.codes.${v}`;
}

export function resolveMarMedicationResponseSeverity(
  code: MarMedicationResponseCode | string | null | undefined
): MarMedicationResponseSeverity {
  const v = code?.trim();
  if (!v || !isMarMedicationResponseCode(v)) return "routine";
  if (v === "ADVERSE_REACTION_REPORTED" || v === "SEDATION_PRESENT") return "safety";
  if (v === "PARTIALLY_EFFECTIVE") return "neutral";
  return "routine";
}

export function validateMarMedicationResponse(
  input: MarMedicationResponsePayload
): MarMedicationResponseValidationResult {
  const responseCode = input.responseCode?.trim();
  if (!responseCode || !isMarMedicationResponseCode(responseCode)) {
    return { ok: false, message: "Invalid medication response code." };
  }

  const responseDetail = normalizeOptionalText(input.responseDetail);
  if (responseCode === "OTHER" && !responseDetail) {
    return { ok: false, message: "Comment is required when response is Other." };
  }
  if (responseCode === "ADVERSE_REACTION_REPORTED" && !responseDetail) {
    return { ok: false, message: "Comment is required when reporting an adverse reaction." };
  }

  const painBefore =
    input.painBefore == null ? null : parsePainScore(input.painBefore);
  if (input.painBefore != null && painBefore == null) {
    return { ok: false, message: "Pain before must be an integer from 0 to 10." };
  }

  const painAfter = input.painAfter == null ? null : parsePainScore(input.painAfter);
  if (input.painAfter != null && painAfter == null) {
    return { ok: false, message: "Pain after must be an integer from 0 to 10." };
  }

  const responseTime = normalizeOptionalText(input.responseTime);
  if (responseTime) {
    const t = new Date(responseTime).getTime();
    if (!Number.isFinite(t)) {
      return { ok: false, message: "Response time must be a valid ISO timestamp." };
    }
  }

  const documentedAt = normalizeOptionalText(input.documentedAt) ?? new Date().toISOString();
  if (!Number.isFinite(new Date(documentedAt).getTime())) {
    return { ok: false, message: "Documented time must be a valid ISO timestamp." };
  }

  return {
    ok: true,
    value: {
      responseCode,
      responseDetail,
      responseTime,
      documentedAt,
      painBefore,
      painAfter,
    },
  };
}

function serializeMarMedicationResponseLine(payload: ParsedMarMedicationResponse): string {
  return `${MAR_MEDICATION_RESPONSE_NOTE_PREFIX} ${JSON.stringify({
    responseCode: payload.responseCode,
    responseDetail: payload.responseDetail,
    responseTime: payload.responseTime,
    documentedAt: payload.documentedAt,
    painBefore: payload.painBefore,
    painAfter: payload.painAfter,
  })}`;
}

/** Append a structured response line to MAR notes (never overwrites prior responses). */
export function buildMarMedicationResponseNotes(
  existingNotes: string | null | undefined,
  payload: MarMedicationResponsePayload
): { ok: true; notes: string } | { ok: false; message: string } {
  const validated = validateMarMedicationResponse(payload);
  if (!validated.ok) return validated;

  const line = serializeMarMedicationResponseLine({
    responseCode: validated.value.responseCode,
    responseDetail: validated.value.responseDetail ?? null,
    responseTime: validated.value.responseTime ?? null,
    documentedAt: validated.value.documentedAt ?? new Date().toISOString(),
    painBefore: validated.value.painBefore ?? null,
    painAfter: validated.value.painAfter ?? null,
  });

  const base = existingNotes?.trim() ? `${existingNotes.trim()}\n` : "";
  return { ok: true, notes: `${base}${line}` };
}

function parseResponseJson(raw: string): ParsedMarMedicationResponse | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const responseCode = parsed.responseCode;
    if (typeof responseCode !== "string" || !isMarMedicationResponseCode(responseCode)) return null;
    const documentedAt =
      typeof parsed.documentedAt === "string" && parsed.documentedAt.trim()
        ? parsed.documentedAt.trim()
        : null;
    if (!documentedAt || !Number.isFinite(new Date(documentedAt).getTime())) return null;

    const responseDetail =
      typeof parsed.responseDetail === "string" ? parsed.responseDetail.trim() || null : null;
    const responseTime =
      typeof parsed.responseTime === "string" && parsed.responseTime.trim()
        ? parsed.responseTime.trim()
        : null;

    const painBefore = parsePainScore(parsed.painBefore);
    const painAfter = parsePainScore(parsed.painAfter);

    return {
      responseCode,
      responseDetail,
      responseTime,
      documentedAt,
      painBefore,
      painAfter,
    };
  } catch {
    return null;
  }
}

/** Parse all structured medication response entries from MAR notes (newest line order preserved). */
export function parseMarMedicationResponseNotes(
  notes: string | null | undefined
): ParsedMarMedicationResponse[] {
  if (!notes?.trim()) return [];
  const results: ParsedMarMedicationResponse[] = [];
  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(MAR_MEDICATION_RESPONSE_NOTE_PREFIX)) continue;
    const raw = trimmed.slice(MAR_MEDICATION_RESPONSE_NOTE_PREFIX.length).trim();
    const parsed = parseResponseJson(raw);
    if (parsed) results.push(parsed);
  }
  return results;
}

/** Newest-first ordering for display. */
export function sortMarMedicationResponsesNewestFirst(
  responses: ParsedMarMedicationResponse[]
): ParsedMarMedicationResponse[] {
  return [...responses].sort((a, b) => {
    const aTime = new Date(a.documentedAt).getTime();
    const bTime = new Date(b.documentedAt).getTime();
    return bTime - aTime;
  });
}

/** Whether administration notes contain any medication response documentation. */
export function marAdministrationHasMedicationResponse(
  notes: string | null | undefined
): boolean {
  return parseMarMedicationResponseNotes(notes).length > 0;
}

/** Highest-severity response badge for timeline cells. */
export function resolveMarMedicationResponseBadgeSeverity(
  notes: string | null | undefined
): MarMedicationResponseSeverity | null {
  const responses = parseMarMedicationResponseNotes(notes);
  if (responses.length === 0) return null;
  let severity: MarMedicationResponseSeverity = "routine";
  for (const response of responses) {
    const next = resolveMarMedicationResponseSeverity(response.responseCode);
    if (next === "safety") return "safety";
    if (next === "neutral") severity = "neutral";
  }
  return severity;
}

export type MarMedicationResponseTimelineBadge = {
  label: "RESPONSE";
  displayLabel: string;
  count: number;
  severity: MarMedicationResponseSeverity;
};

/** Build timeline RESPONSE badge with optional count (H9L.1). */
export function buildMarMedicationResponseTimelineBadge(
  notes: string | null | undefined
): MarMedicationResponseTimelineBadge | null {
  const responses = parseMarMedicationResponseNotes(notes);
  if (responses.length === 0) return null;
  const severity = resolveMarMedicationResponseBadgeSeverity(notes);
  if (!severity) return null;
  const count = responses.length;
  return {
    label: "RESPONSE",
    displayLabel: count > 1 ? `RESPONSE (${count})` : "RESPONSE",
    count,
    severity,
  };
}

/** Strip structured response lines from notes for free-text display. */
export function extractMarMedicationResponseFreeTextNotes(
  notes: string | null | undefined
): string | null {
  if (!notes?.trim()) return null;
  const withoutStructured = notes
    .split("\n")
    .filter((line) => !line.trim().startsWith(MAR_MEDICATION_RESPONSE_NOTE_PREFIX))
    .join("\n");
  return extractMarUserFreeTextNotes(withoutStructured);
}
