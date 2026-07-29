import { MAR_ALLERGY_ACKNOWLEDGEMENT_VERSION } from "./auth/enterpriseMarSafetyAckRxPrintAuthorityD4c7h.js";

/** Matches `MEDORA_ER_TRIAGE_V1_KEY` in web — ER triage blob inside `Triage.vitalsJson`. */
export const MEDORA_ER_TRIAGE_V1_STORAGE_KEY = "medoraErTriageV1" as const;

export { MAR_ALLERGY_ACKNOWLEDGEMENT_VERSION };

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

/**
 * Distinct allergy documentation categories for MAR acknowledgement copy.
 * Do not collapse NKDA / unknown / known into one boolean for display.
 */
export type MarAllergySafetyCategory =
  | "NONE"
  | "NO_KNOWN_ALLERGIES"
  | "KNOWN_ALLERGY_OR_INTOLERANCE"
  | "STATUS_UNKNOWN";

function normalizeAllergyCompare(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** True when free-text documents NKDA / no known allergies (not a positive allergen). */
export function isNoKnownAllergyDocumentationText(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;
  const n = normalizeAllergyCompare(text);
  if (n === "nkda" || n === "nka" || n === "nkl") return true;
  if (/\bnkda\b/.test(n) || /\bnka\b/.test(n)) return true;
  if (n.includes("aucune allergie")) return true;
  if (n.includes("pas d allergie") || n.includes("pas d'allergie")) return true;
  if (n.includes("no known allerg")) return true;
  if (n.includes("no known drug allerg")) return true;
  if (n.includes("allergie medicamenteuse connue") && n.includes("aucune")) return true;
  return false;
}

/** True when text indicates allergy status not reviewed / unknown. */
export function isAllergyStatusUnknownDocumentationText(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;
  const n = normalizeAllergyCompare(text);
  if (n.includes("non verifie") || n.includes("non revu") || n.includes("non documente")) return true;
  if (n.includes("statut allergique inconnu") || n.includes("allergies inconnues")) return true;
  if (n.includes("not reviewed") || n.includes("unknown allerg") || n.includes("allergy status unknown")) {
    return true;
  }
  if (n === "unknown" || n === "inconnu" || n === "inconnue") return true;
  return false;
}

export function classifyMarAllergyDocumentationSummary(
  summary: string | null | undefined
): MarAllergySafetyCategory {
  if (summary == null || !String(summary).trim()) return "NONE";
  if (isAllergyStatusUnknownDocumentationText(summary)) return "STATUS_UNKNOWN";
  if (isNoKnownAllergyDocumentationText(summary)) return "NO_KNOWN_ALLERGIES";
  return "KNOWN_ALLERGY_OR_INTOLERANCE";
}

export type MarAllergySafetyEvaluation = {
  category: MarAllergySafetyCategory;
  summary: string | null;
  acknowledgementRequired: boolean;
  acknowledgementVersion: typeof MAR_ALLERGY_ACKNOWLEDGEMENT_VERSION;
};

/**
 * When encounter allergy free-text exists, MAR administration requires explicit ack.
 * NKDA / unknown still require acknowledgement of status review — not a false "allergy exists" claim.
 */
export function evaluateMarAllergySafetyForAdministration(input: {
  vitals?: unknown;
  nursingAssessment?: unknown;
  triageVitalsJson?: unknown;
}): MarAllergySafetyEvaluation {
  const summary = getEncounterAllergyDocumentationSummary(input);
  const category = classifyMarAllergyDocumentationSummary(summary);
  return {
    category,
    summary,
    acknowledgementRequired: category !== "NONE",
    acknowledgementVersion: MAR_ALLERGY_ACKNOWLEDGEMENT_VERSION,
  };
}

/** Server error text from medication-administration allergy gate (FR). */
export function isMarAllergyAcknowledgementServerMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const n = normalizeAllergyCompare(message);
  return (
    n.includes("allergies ou intolerances sont documentees") ||
    n.includes("confirmez avant d enregistrer l administration") ||
    n.includes("safetyacknowledgedmedicationallergies")
  );
}
