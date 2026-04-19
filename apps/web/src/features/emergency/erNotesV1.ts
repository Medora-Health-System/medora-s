/**
 * ER structured notes under `Encounter.nursingAssessment.erNotesV1` (Json).
 * Persists via PATCH /encounters/:id { nursingAssessment }. Does not use `encounter.notes`.
 */

export const ER_NOTES_V1_KEY = "erNotesV1" as const;

const MEDORA_ER_NOTES_V1_LEGACY_PREFIX = "MEDORA_ER_NOTES_V1\n";

const MAX_FIELD = 12000;

export type ErNoteCategory = "provider" | "nursing" | "technician" | "other";

/** Per-category last save (same pattern as erDispositionV1.signature). */
export type ErNoteCategoryMeta = {
  savedAt: string;
  savedByDisplayName: string;
};

export type ErNotesV1Stored = {
  provider?: string;
  nursing?: string;
  technician?: string;
  other?: string;
  /** Set for each non-empty category on save — who last edited that category’s text. */
  categoryLastSaved?: Partial<Record<ErNoteCategory, ErNoteCategoryMeta>>;
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

function isCategoryMeta(v: unknown): v is ErNoteCategoryMeta {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return typeof o.savedAt === "string" && typeof o.savedByDisplayName === "string";
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

/** Last-save attribution per category (for UI). */
export function readErNotesCategoryMetaFromNursingAssessment(
  nursingAssessment: unknown
): Partial<Record<ErNoteCategory, ErNoteCategoryMeta>> {
  const out: Partial<Record<ErNoteCategory, ErNoteCategoryMeta>> = {};
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return out;
  }
  const raw = (nursingAssessment as Record<string, unknown>)[ER_NOTES_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  const m = o.categoryLastSaved;
  if (!m || typeof m !== "object" || Array.isArray(m)) return out;
  const box = m as Record<string, unknown>;
  for (const k of CATEGORIES) {
    const v = box[k];
    if (isCategoryMeta(v)) {
      out[k] = {
        savedAt: v.savedAt.trim(),
        savedByDisplayName: v.savedByDisplayName.trim().slice(0, 200),
      };
    }
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

export type ErNotesSaveMeta = {
  savedAt: string;
  savedByDisplayName: string;
};

/**
 * Merge ER notes into nursingAssessment; preserves all other keys (erDispositionV1, etc.).
 * Records `categoryLastSaved` for each non-empty category using the current save meta.
 */
export function mergeErNotesV1IntoNursingAssessment(
  previousNursingAssessment: unknown,
  parts: Record<ErNoteCategory, string>,
  saveMeta: ErNotesSaveMeta
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const textPayload: Partial<Record<ErNoteCategory, string>> = {};
  for (const k of CATEGORIES) {
    const v = parts[k].trim().slice(0, MAX_FIELD);
    if (v) textPayload[k] = v;
  }

  const categoryLastSaved: Partial<Record<ErNoteCategory, ErNoteCategoryMeta>> = {};
  for (const k of CATEGORIES) {
    if (textPayload[k]) {
      categoryLastSaved[k] = {
        savedAt: saveMeta.savedAt,
        savedByDisplayName: saveMeta.savedByDisplayName,
      };
    }
  }

  const hasText = Object.keys(textPayload).length > 0;
  if (!hasText) {
    delete base[ER_NOTES_V1_KEY];
    return base;
  }

  const blob: ErNotesV1Stored = {
    ...textPayload,
    ...(Object.keys(categoryLastSaved).length > 0 ? { categoryLastSaved } : {}),
  };
  base[ER_NOTES_V1_KEY] = blob;
  return base;
}
