/**
 * Shared tetanus advisory prompts for trauma wound families.
 * Advisory only — never auto-orders vaccine or immunoglobulin.
 * "Rust" alone is not a treatment rule.
 */

export type TetanusWoundCategory =
  | "clean_minor"
  | "contaminated"
  | "puncture"
  | "bite"
  | "burn"
  | "crush"
  | "penetrating"
  | "unknown";

export type TetanusAdvisoryInput = {
  woundCategory?: TetanusWoundCategory;
  lastTetanusDateKnown?: boolean;
  primarySeriesComplete?: boolean | "unknown";
  immunocompromised?: boolean;
  rustMentioned?: boolean;
};

export type TetanusAdvisoryPrompt = {
  id: string;
  text: string;
  /** Never true — treatment remains clinician-ordered. */
  autoOrder: false;
};

export function buildTetanusAdvisoryPrompts(input: TetanusAdvisoryInput = {}): TetanusAdvisoryPrompt[] {
  const prompts: TetanusAdvisoryPrompt[] = [
    {
      id: "review_immunization_history",
      text: "Review tetanus immunization history and date of last tetanus-containing vaccine.",
      autoOrder: false,
    },
  ];
  if (input.primarySeriesComplete === "unknown" || input.lastTetanusDateKnown === false) {
    prompts.push({
      id: "unknown_history",
      text: "Tetanus vaccination history is incomplete or unknown; document series status before deciding prophylaxis.",
      autoOrder: false,
    });
  }
  if (
    input.woundCategory === "contaminated" ||
    input.woundCategory === "puncture" ||
    input.woundCategory === "bite" ||
    input.woundCategory === "burn" ||
    input.woundCategory === "crush" ||
    input.woundCategory === "penetrating"
  ) {
    prompts.push({
      id: "high_risk_wound_category",
      text: "Wound category may increase tetanus risk; confirm immunization plan with clinician judgment.",
      autoOrder: false,
    });
  }
  if (input.immunocompromised) {
    prompts.push({
      id: "immunocompromised",
      text: "Immunocompromised status may affect tetanus planning; clinician-directed decision required.",
      autoOrder: false,
    });
  }
  if (input.rustMentioned) {
    prompts.push({
      id: "rust_not_decisive",
      text: "Rust exposure alone does not determine tetanus prophylaxis; use wound characteristics and immunization status.",
      autoOrder: false,
    });
  }
  prompts.push({
    id: "no_auto_order",
    text: "Do not auto-order tetanus vaccine or immunoglobulin; document given, ordered, or declined when applicable.",
    autoOrder: false,
  });
  return prompts;
}

export function tetanusAppliesToHumanBite(): boolean {
  return true;
}

export function tetanusAppliesToAnimalBite(): boolean {
  return true;
}
