/** MEDUI.MEDICATION.PULMONARY_RUNTIME_UI_AND_INFUSION_COMPLETION.1 */

import {
  isRespiratoryMedicationResponseCode,
  type ParsedRespiratoryMedicationResponse,
  type RespiratoryMedicationResponseCode,
  type RespiratoryMedicationResponsePayload,
} from "./respiratoryMedicationResponseGovernance.js";

export const MAR_RESPIRATORY_MEDICATION_RESPONSE_NOTE_PREFIX = "MAR_RESPIRATORY_RESPONSE:";

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function parseOptionalNumber(value: unknown, min: number, max: number): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function parseOptionalBool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function validateRespiratoryMedicationResponsePayload(
  payload: RespiratoryMedicationResponsePayload
): { ok: true; value: RespiratoryMedicationResponsePayload } | { ok: false; message: string } {
  if (!isRespiratoryMedicationResponseCode(payload.responseCode)) {
    return { ok: false, message: "Code de réponse respiratoire invalide." };
  }
  return { ok: true, value: payload };
}

function serializeRespiratoryResponseLine(payload: ParsedRespiratoryMedicationResponse): string {
  return `${MAR_RESPIRATORY_MEDICATION_RESPONSE_NOTE_PREFIX} ${JSON.stringify({
    responseCode: payload.responseCode,
    responseDetail: payload.responseDetail,
    responseTime: payload.responseTime,
    documentedAt: payload.documentedAt,
    respiratoryRateBefore: payload.respiratoryRateBefore,
    respiratoryRateAfter: payload.respiratoryRateAfter,
    oxygenSaturationBefore: payload.oxygenSaturationBefore,
    oxygenSaturationAfter: payload.oxygenSaturationAfter,
    wheezingBefore: payload.wheezingBefore,
    wheezingAfter: payload.wheezingAfter,
    workOfBreathing: payload.workOfBreathing,
    nebulizerCompletion: payload.nebulizerCompletion,
    mdiSpacerUsed: payload.mdiSpacerUsed,
    treatmentRefused: payload.treatmentRefused,
    treatmentInterrupted: payload.treatmentInterrupted,
    noAdverseReaction: payload.noAdverseReaction,
    patientTolerated: payload.patientTolerated,
    documentedBy: payload.documentedBy ?? null,
    documentedByInitials: payload.documentedByInitials ?? null,
    documentedByDisplayName: payload.documentedByDisplayName ?? null,
    documentedByUserId: payload.documentedByUserId ?? null,
    documentedByName: payload.documentedByName ?? null,
  })}`;
}

export type BuildRespiratoryMedicationResponseNotesPayload = RespiratoryMedicationResponsePayload & {
  nebulizerCompletion?: boolean | null;
  mdiSpacerUsed?: boolean | null;
  treatmentRefused?: boolean | null;
  treatmentInterrupted?: boolean | null;
};

/** Append respiratory response line to MAR notes (never overwrites prior responses). */
export function buildRespiratoryMedicationResponseNotes(
  existingNotes: string | null | undefined,
  payload: BuildRespiratoryMedicationResponseNotesPayload
): { ok: true; notes: string } | { ok: false; message: string } {
  const validated = validateRespiratoryMedicationResponsePayload(payload);
  if (!validated.ok) return validated;

  const line = serializeRespiratoryResponseLine({
    responseCode: validated.value.responseCode,
    responseDetail: normalizeOptionalText(validated.value.responseDetail),
    responseTime: normalizeOptionalText(validated.value.responseTime),
    documentedAt: validated.value.documentedAt ?? new Date().toISOString(),
    respiratoryRateBefore: validated.value.respiratoryRateBefore ?? null,
    respiratoryRateAfter: validated.value.respiratoryRateAfter ?? null,
    oxygenSaturationBefore: validated.value.oxygenSaturationBefore ?? null,
    oxygenSaturationAfter: validated.value.oxygenSaturationAfter ?? null,
    wheezingBefore: validated.value.wheezingBefore ?? null,
    wheezingAfter: validated.value.wheezingAfter ?? null,
    workOfBreathing: normalizeOptionalText(validated.value.workOfBreathing),
    nebulizerCompletion: payload.nebulizerCompletion ?? null,
    mdiSpacerUsed: payload.mdiSpacerUsed ?? null,
    treatmentRefused: payload.treatmentRefused ?? null,
    treatmentInterrupted: payload.treatmentInterrupted ?? null,
    noAdverseReaction: validated.value.noAdverseReaction ?? null,
    patientTolerated: validated.value.patientTolerated ?? null,
    documentedBy: validated.value.documentedBy ?? null,
    documentedByInitials: validated.value.documentedByInitials ?? null,
    documentedByDisplayName: validated.value.documentedByDisplayName ?? null,
    documentedByUserId: validated.value.documentedByUserId ?? null,
    documentedByName: validated.value.documentedByName ?? null,
  });

  const base = existingNotes?.trim() ? `${existingNotes.trim()}\n` : "";
  return { ok: true, notes: `${base}${line}` };
}

function parseResponseJson(raw: string): ParsedRespiratoryMedicationResponse | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const responseCode = parsed.responseCode;
    if (!isRespiratoryMedicationResponseCode(String(responseCode))) return null;
    const documentedAt =
      typeof parsed.documentedAt === "string" && parsed.documentedAt.trim()
        ? parsed.documentedAt.trim()
        : null;
    if (!documentedAt || !Number.isFinite(new Date(documentedAt).getTime())) return null;

    return {
      responseCode: responseCode as RespiratoryMedicationResponseCode,
      responseDetail:
        typeof parsed.responseDetail === "string" ? parsed.responseDetail.trim() || null : null,
      responseTime:
        typeof parsed.responseTime === "string" && parsed.responseTime.trim()
          ? parsed.responseTime.trim()
          : null,
      documentedAt,
      respiratoryRateBefore: parseOptionalNumber(parsed.respiratoryRateBefore, 0, 80),
      respiratoryRateAfter: parseOptionalNumber(parsed.respiratoryRateAfter, 0, 80),
      oxygenSaturationBefore: parseOptionalNumber(parsed.oxygenSaturationBefore, 0, 100),
      oxygenSaturationAfter: parseOptionalNumber(parsed.oxygenSaturationAfter, 0, 100),
      wheezingBefore: parseOptionalBool(parsed.wheezingBefore),
      wheezingAfter: parseOptionalBool(parsed.wheezingAfter),
      workOfBreathing:
        typeof parsed.workOfBreathing === "string" ? parsed.workOfBreathing.trim() || null : null,
      nebulizerCompletion: parseOptionalBool(parsed.nebulizerCompletion),
      mdiSpacerUsed: parseOptionalBool(parsed.mdiSpacerUsed),
      treatmentRefused: parseOptionalBool(parsed.treatmentRefused),
      treatmentInterrupted: parseOptionalBool(parsed.treatmentInterrupted),
      noAdverseReaction: parseOptionalBool(parsed.noAdverseReaction),
      patientTolerated: parseOptionalBool(parsed.patientTolerated),
      documentedBy:
        typeof parsed.documentedBy === "string" && parsed.documentedBy.trim()
          ? parsed.documentedBy.trim()
          : null,
      documentedByInitials:
        typeof parsed.documentedByInitials === "string" && parsed.documentedByInitials.trim()
          ? parsed.documentedByInitials.trim()
          : null,
      documentedByDisplayName:
        typeof parsed.documentedByDisplayName === "string" && parsed.documentedByDisplayName.trim()
          ? parsed.documentedByDisplayName.trim()
          : null,
      documentedByUserId:
        typeof parsed.documentedByUserId === "string" && parsed.documentedByUserId.trim()
          ? parsed.documentedByUserId.trim()
          : null,
      documentedByName:
        typeof parsed.documentedByName === "string" && parsed.documentedByName.trim()
          ? parsed.documentedByName.trim()
          : null,
    };
  } catch {
    return null;
  }
}

export function parseRespiratoryMedicationResponseNotes(
  notes: string | null | undefined
): ParsedRespiratoryMedicationResponse[] {
  if (!notes?.trim()) return [];
  const results: ParsedRespiratoryMedicationResponse[] = [];
  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(MAR_RESPIRATORY_MEDICATION_RESPONSE_NOTE_PREFIX)) continue;
    const raw = trimmed.slice(MAR_RESPIRATORY_MEDICATION_RESPONSE_NOTE_PREFIX.length).trim();
    const parsed = parseResponseJson(raw);
    if (parsed) results.push(parsed);
  }
  return results;
}

export function sortRespiratoryMedicationResponsesNewestFirst(
  responses: ParsedRespiratoryMedicationResponse[]
): ParsedRespiratoryMedicationResponse[] {
  return [...responses].sort(
    (a, b) => new Date(b.documentedAt).getTime() - new Date(a.documentedAt).getTime()
  );
}

export function marAdministrationHasRespiratoryMedicationResponse(
  notes: string | null | undefined
): boolean {
  return parseRespiratoryMedicationResponseNotes(notes).length > 0;
}
