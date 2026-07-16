/**
 * Phase 12 — vertigo differentiation documentation context (documentation advisory only).
 *
 * This module NEVER autonomously classifies vertigo as peripheral or central. It only
 * captures documentation branches (BPPV, vestibular neuritis, labyrinthitis, Meniere-type
 * episodic vertigo, and central-vertigo-concern red flags) and surfaces the same
 * documentation-only red-flag prompts from `entEmergencyRedFlagEngine.ts`. The treating
 * clinician — using the full history, exam, HINTS findings where appropriate (see
 * `hintsExaminationSafety.ts`), and imaging judgment — makes the actual peripheral-versus-
 * central determination and any disposition decision.
 */
import {
  resolveEntEmergencyRedFlags,
  type EntEmergencyRedFlagCategory,
  type EntEmergencyRedFlagInput,
} from "./entEmergencyRedFlagEngine";

export type VertigoDifferentiationBranch =
  | "bppv"
  | "vestibular_neuritis"
  | "labyrinthitis"
  | "meniere_type"
  | "central_vertigo_concern";

export type VertigoDifferentiationContext = {
  branches: VertigoDifferentiationBranch[];
  redFlagCategories: EntEmergencyRedFlagCategory[];
  /** Documentation-only advisory prompts; never a diagnosis, consult, or disposition. */
  prompts: string[];
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const NEVER_CLASSIFIES_DISCLAIMER =
  "This module documents vertigo branch findings only; it never autonomously classifies vertigo as peripheral or central. That determination remains with the treating clinician using the full history, exam, HINTS findings where appropriate, and imaging judgment.";

/**
 * Documentation advisory only. Captures which vertigo documentation branches are
 * suggested by the text and forwards any ENT emergency red-flag prompts. Never asserts a
 * peripheral-versus-central classification and never sets disposition.
 */
export function resolveVertigoDifferentiationContext(
  input: EntEmergencyRedFlagInput
): VertigoDifferentiationContext {
  const text = normalize([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: VertigoDifferentiationBranch[] = [];

  if (/\bbppv\b|benign paroxysmal positional vertigo|positional vertigo triggered by (head movement|rolling in bed|lying down)|dix.?hallpike/.test(text)) {
    branches.push("bppv");
  }
  if (/labyrinthitis|vestibular neuritis with hearing loss/.test(text)) {
    branches.push("labyrinthitis");
  } else if (/vestibular neuritis|acute unilateral vestibulopathy/.test(text)) {
    branches.push("vestibular_neuritis");
  }
  if (/meniere|meni[eè]re|episodic vertigo with (hearing loss|tinnitus|aural fullness)/.test(text)) {
    branches.push("meniere_type");
  }

  const redFlags = resolveEntEmergencyRedFlags(input);
  const hasCentralVertigoRedFlag = redFlags.categories.includes("central_vertigo");
  if (
    hasCentralVertigoRedFlag ||
    /truncal ataxia|inability to walk unassisted|direction.?changing nystagmus|vertical nystagmus|gaze.?evoked nystagmus/.test(text)
  ) {
    branches.push("central_vertigo_concern");
  }

  const prompts = [NEVER_CLASSIFIES_DISCLAIMER, ...redFlags.prompts];

  return { branches: [...new Set(branches)], redFlagCategories: redFlags.categories, prompts };
}
