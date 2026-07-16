/**
 * Phase 12 — HINTS (Head Impulse, Nystagmus, Test of Skew) exam documentation safety.
 *
 * HINTS is documented here strictly as a structured **documentation** aid, mirroring
 * `ocularExamFoundation.ts`. It is explicitly NOT treated as a validated automated stroke
 * rule-out tool. This module never auto-excludes stroke, never classifies vertigo as
 * peripheral or central (see `vertigoDifferentiationEngine.ts`), and never sets
 * disposition. Documentation is only permitted for continuous acute vestibular syndrome;
 * it is disallowed for episodic positional dizziness, where HINTS is not applicable.
 */

export const HINTS_SAFETY_DISCLAIMER =
  "HINTS (Head Impulse, Nystagmus, Test of Skew) findings are documentation-only and do not constitute a validated automated stroke rule-out tool. HINTS must never be used to autonomously exclude stroke or central vertigo; imaging and disposition decisions remain with the treating clinician.";

export type AcuteVestibularSyndromeTiming =
  | "continuous_acute"
  | "episodic_positional"
  | "episodic_spontaneous"
  | "unknown";

export type HintsDocumentationContext = {
  /** Explicit timing classification when known; text patterns are used only as a fallback. */
  timing?: AcuteVestibularSyndromeTiming;
  documentedFlags?: readonly string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Documentation is allowed ONLY for a continuous acute vestibular syndrome (spontaneous
 * onset, continuous/constant vertigo lasting hours to days). It is disallowed for episodic
 * positional dizziness (e.g. BPPV-pattern symptoms) and for any other non-continuous
 * pattern, and defaults to disallowed when the timing cannot be established — this module
 * never widens HINTS documentation eligibility on ambiguous input.
 */
export function isHintsDocumentationAllowed(context: HintsDocumentationContext): boolean {
  if (context.timing === "continuous_acute") return true;
  if (context.timing && context.timing !== "unknown") return false;

  const text = normalize([...(context.documentedFlags ?? [])].join(" "));
  const explicitlyEpisodicOrPositional =
    /episodic|positional|triggered by (head movement|position change|rolling)|comes and goes|seconds? in duration|\bbppv\b/.test(
      text
    );
  if (explicitlyEpisodicOrPositional) return false;

  const explicitlyContinuousAcute =
    /continuous (vertigo|dizziness|vestibular)|acute vestibular syndrome|persistent vertigo since onset|constant vertigo/.test(
      text
    );
  return explicitlyContinuousAcute;
}

export type HintsFieldKey = "head_impulse" | "nystagmus" | "skew";

export type HintsFieldDescriptor = {
  key: HintsFieldKey;
  labelKey: string;
  allowedValues: readonly string[];
  documentationOnly: true;
};

export type HintsDocumentationFields = {
  headImpulse: HintsFieldDescriptor;
  nystagmus: HintsFieldDescriptor;
  skew: HintsFieldDescriptor;
};

/**
 * Builds three separate documentation-only field descriptors — head impulse, nystagmus,
 * and test of skew are never merged into a single composite "HINTS result" value, and
 * none of them ever resolves to an automated stroke-positive/negative classification.
 */
export function buildHintsDocumentationFields(): HintsDocumentationFields {
  return {
    headImpulse: {
      key: "head_impulse",
      labelKey: "providerDocumentationComplaintIntel.hintsExam.headImpulseLabel",
      allowedValues: ["normal_catch_up_absent", "abnormal_catch_up_saccade", "not_assessed"],
      documentationOnly: true,
    },
    nystagmus: {
      key: "nystagmus",
      labelKey: "providerDocumentationComplaintIntel.hintsExam.nystagmusLabel",
      allowedValues: [
        "unidirectional_horizontal",
        "direction_changing",
        "vertical",
        "torsional",
        "absent",
        "not_assessed",
      ],
      documentationOnly: true,
    },
    skew: {
      key: "skew",
      labelKey: "providerDocumentationComplaintIntel.hintsExam.skewLabel",
      allowedValues: ["present", "absent", "not_assessed"],
      documentationOnly: true,
    },
  };
}
