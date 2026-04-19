/**
 * ER structured notes under `Encounter.nursingAssessment.erNotesV1` (Json).
 * Persists via PATCH /encounters/:id { nursingAssessment }. Does not use `encounter.notes`.
 */

export const ER_NOTES_V1_KEY = "erNotesV1" as const;

const MEDORA_ER_NOTES_V1_LEGACY_PREFIX = "MEDORA_ER_NOTES_V1\n";

const MAX_FIELD = 12000;

export type ErNoteCategory = "provider" | "nursing" | "technician" | "other";

export type ErNotesV1Stored = {
  provider?: string;
  nursing?: string;
  technician?: string;
  other?: string;
};

const CATEGORIES: ErNoteCategory[] = ["provider", "nursing", "technician", "other"];

function emptyParts(): Record<ErNoteCategory, string> {
  return { provider: "", nursing: "", technician: "", other: "" };
}

function hasAnyPart(parts: Record<ErNoteCategory, string>): boolean {
  return CATEGORIES.some((k) => parts[k].trim().length > 0);
}

function strField(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

/** Read structured blob from nursingAssessment (no legacy migration). */
export function readErNotesV1FromNursingAssessment(nursingAssessment: unknown): Record<ErNoteCategory, string> {
  const out = emptyParts();
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return out;
  }
  const raw = (nursingAssessment as Record<string, unknown>)[ER_NOTES_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  for (const k of CATEGORIES) {
    out[k] = strField(o[k], MAX_FIELD);
  }
  return out;
}

function parseLegacyMedoraNotesBlobInNotesField(notes: string): Record<ErNoteCategory, string> | null {
  if (!notes.startsWith(MEDORA_ER_NOTES_V1_LEGACY_PREFIX)) return null;
  try {
    const json = JSON.parse(notes.slice(MEDORA_ER_NOTES_V1_LEGACY_PREFIX.length));
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    const o = json as Record<string, unknown>;
    const parts = emptyParts();
    for (const k of CATEGORIES) {
      parts[k] = strField(o[k], MAX_FIELD);
    }
    return parts;
  } catch {
    return null;
  }
}

/**
 * Build UI state: prefer `erNotesV1` on nursingAssessment; else migrate from legacy `encounter.notes`
 * (plain text → provider, or old MEDORA_ER_NOTES_V1 JSON wrongly stored in notes).
 */
export function buildErNotesPartsForUi(
  nursingAssessment: unknown,
  encounterNotes: string | null | undefined
): Record<ErNoteCategory, string> {
  const fromNa = readErNotesV1FromNursingAssessment(nursingAssessment);
  if (hasAnyPart(fromNa)) return fromNa;

  const n = typeof encounterNotes === "string" ? encounterNotes : "";
  if (!n.trim()) return emptyParts();

  const fromMedoraBlob = parseLegacyMedoraNotesBlobInNotesField(n);
  if (fromMedoraBlob && hasAnyPart(fromMedoraBlob)) return fromMedoraBlob;

  return { ...emptyParts(), provider: n.trim().slice(0, MAX_FIELD) };
}

/**
 * Merge ER notes into nursingAssessment; preserves all other keys (erDispositionV1, etc.).
 */
export function mergeErNotesV1IntoNursingAssessment(
  previousNursingAssessment: unknown,
  parts: Record<ErNoteCategory, string>
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const stored: ErNotesV1Stored = {};
  for (const k of CATEGORIES) {
    const v = parts[k].trim().slice(0, MAX_FIELD);
    if (v) (stored as Record<string, string>)[k] = v;
  }
  if (Object.keys(stored).length === 0) {
    delete base[ER_NOTES_V1_KEY];
  } else {
    base[ER_NOTES_V1_KEY] = stored;
  }
  return base;
}
