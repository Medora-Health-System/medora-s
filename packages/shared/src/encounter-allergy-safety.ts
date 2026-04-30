/** Matches `MEDORA_ER_TRIAGE_V1_KEY` in web — ER triage blob inside `Triage.vitalsJson`. */
export const MEDORA_ER_TRIAGE_V1_STORAGE_KEY = "medoraErTriageV1" as const;

function trimStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function appendUnique(parts: string[], s: string | null) {
  if (!s) return;
  if (!parts.includes(s)) parts.push(s);
}

function allergyStringsFromErTriageV1Blob(blob: unknown): string[] {
  if (!blob || typeof blob !== "object" || Array.isArray(blob)) return [];
  const o = blob as Record<string, unknown>;
  const out: string[] = [];
  for (const k of ["medicationAllergiesDetail", "foodAllergiesDetail", "additionalAllergyInfo"] as const) {
    const t = trimStr(o[k]);
    if (t) out.push(t);
  }
  return out;
}

/**
 * Returns a short merged summary if any allergy-related free-text is documented
 * on the encounter (vitals / infirmier / triage). Used for medication safety gates (MVP).
 */
export function getEncounterAllergyDocumentationSummary(input: {
  vitals?: unknown;
  nursingAssessment?: unknown;
  triageVitalsJson?: unknown;
}): string | null {
  const parts: string[] = [];

  if (input.vitals && typeof input.vitals === "object" && !Array.isArray(input.vitals)) {
    const v = input.vitals as Record<string, unknown>;
    appendUnique(parts, trimStr(v.allergyNote));
  }

  if (input.nursingAssessment && typeof input.nursingAssessment === "object" && !Array.isArray(input.nursingAssessment)) {
    const na = input.nursingAssessment as Record<string, unknown>;
    const nev1 = na.nursingEvalV1;
    if (nev1 && typeof nev1 === "object" && !Array.isArray(nev1)) {
      const sections = (nev1 as Record<string, unknown>).sections;
      if (sections && typeof sections === "object" && !Array.isArray(sections)) {
        const securite = (sections as Record<string, unknown>).securite;
        if (securite && typeof securite === "object") {
          appendUnique(parts, trimStr((securite as { text?: unknown }).text));
        }
      }
    }
  }

  if (input.triageVitalsJson && typeof input.triageVitalsJson === "object" && !Array.isArray(input.triageVitalsJson)) {
    const tj = input.triageVitalsJson as Record<string, unknown>;
    appendUnique(parts, trimStr(tj.allergyNote));
    const er = tj[MEDORA_ER_TRIAGE_V1_STORAGE_KEY];
    for (const s of allergyStringsFromErTriageV1Blob(er)) appendUnique(parts, s);
  }

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function encounterHasMedicationSafetyAllergyDocumentation(input: {
  vitals?: unknown;
  nursingAssessment?: unknown;
  triageVitalsJson?: unknown;
}): boolean {
  return getEncounterAllergyDocumentationSummary(input) != null;
}
