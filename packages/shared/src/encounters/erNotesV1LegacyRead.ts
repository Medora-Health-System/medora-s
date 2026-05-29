/**
 * Read-only helpers for legacy `nursingAssessment.erNotesV1` (MEDNOTE.1 display merge).
 */

export const ER_NOTES_V1_KEY = "erNotesV1" as const;

export type ErNoteCategory = "provider" | "nursing" | "technician" | "other";

export type ErNoteCategoryMeta = {
  savedAt: string;
  savedByDisplayName: string;
};

const CATEGORIES: ErNoteCategory[] = ["provider", "nursing", "technician", "other"];
const MAX_FIELD = 12000;

const CATEGORY_TO_NOTE_TYPE = {
  provider: "PROVIDER",
  nursing: "NURSING",
  technician: "TECHNICIAN",
  other: "OTHER",
} as const;

function emptyParts(): Record<ErNoteCategory, string> {
  return { provider: "", nursing: "", technician: "", other: "" };
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

export function legacyErNotesV1DisplayEntries(
  nursingAssessment: unknown,
  encounterId: string
): Array<{
  id: string;
  encounterId: string;
  noteType: (typeof CATEGORY_TO_NOTE_TYPE)[ErNoteCategory];
  body: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  createdAt: string;
  legacy: true;
}> {
  const parts = readErNotesV1FromNursingAssessment(nursingAssessment);
  const meta = readErNotesCategoryMetaFromNursingAssessment(nursingAssessment);
  const out: Array<{
    id: string;
    encounterId: string;
    noteType: (typeof CATEGORY_TO_NOTE_TYPE)[ErNoteCategory];
    body: string;
    authorDisplayName: string;
    authorRoleTitle: string;
    createdAt: string;
    legacy: true;
  }> = [];
  for (const category of CATEGORIES) {
    const body = parts[category].trim();
    if (!body) continue;
    const m = meta[category];
    out.push({
      id: `legacy-erNotesV1-${encounterId}-${category}`,
      encounterId,
      noteType: CATEGORY_TO_NOTE_TYPE[category],
      body,
      authorDisplayName: m?.savedByDisplayName ?? "—",
      authorRoleTitle: "—",
      createdAt: m?.savedAt ?? new Date(0).toISOString(),
      legacy: true,
    });
  }
  return out;
}
