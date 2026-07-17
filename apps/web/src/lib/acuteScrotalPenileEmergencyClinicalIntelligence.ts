/**
 * Phase 17 (Commit 1) — acute scrotal / penile emergency clinical documentation context.
 * Fournier overlap documented only — Phase 13 NSTI ownership preserved. Documentation
 * advisory only — never excludes torsion and never establishes a diagnosis.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveObGynUrologyRedFlags,
  type ObGynUrologyRedFlagInput,
} from "./obGynUrologyRedFlagEngine";

export type AcuteScrotalPenileEmergencyBranch =
  | "testicular_torsion"
  | "epididymitis"
  | "fournier_overlap"
  | "priapism"
  | "penile_fracture"
  | "paraphimosis"
  | "other";

export type AcuteScrotalPenileEmergencyContext = {
  branches: AcuteScrotalPenileEmergencyBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveObGynUrologyRedFlags>["categories"];
  torsionExclusionForbidden: true;
  fournierPhase13OverlapOnly: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly AcuteScrotalPenileEmergencyBranch[] = [
  "testicular_torsion",
  "priapism",
];

export const ACUTE_SCROTAL_PENILE_EMERGENCY_DISCHARGE_FAMILY: Record<
  AcuteScrotalPenileEmergencyBranch,
  string | null
> = {
  testicular_torsion: null,
  epididymitis: "epididymitis_followup_v1",
  fournier_overlap: null,
  priapism: null,
  penile_fracture: null,
  paraphimosis: "paraphimosis_followup_v1",
  other: "scrotal_pain_followup_v1",
};

/** Documentation advisory only. Doppler presence does not exclude torsion. */
export function resolveAcuteScrotalPenileEmergencyContext(
  input: ObGynUrologyRedFlagInput
): AcuteScrotalPenileEmergencyContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: AcuteScrotalPenileEmergencyBranch[] = [];
  const redFlags = resolveObGynUrologyRedFlags(input);

  if (
    redFlags.categories.includes("testicular_torsion_concern") ||
    /testicular torsion|torsion of testis|acute scrotum with (nausea|vomiting)/.test(text)
  ) {
    branches.push("testicular_torsion");
  }
  if (/epididymitis|epididymo.?orchitis/.test(text)) branches.push("epididymitis");
  if (redFlags.categories.includes("fournier_concern") || /fournier|perineal necrotizing|scrotal gangrene/.test(text)) {
    branches.push("fournier_overlap");
  }
  if (/priapism|prolonged erection/.test(text)) branches.push("priapism");
  if (/penile fracture|snap.*penis|buckling injury penis/.test(text)) branches.push("penile_fracture");
  if (/paraphimosis|trapped foreskin|cannot reduce foreskin/.test(text)) branches.push("paraphimosis");

  if (branches.length === 0 && /scrotal|testicular|penile|genital pain/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const torsionConcern =
    branches.includes("testicular_torsion") ||
    redFlags.categories.includes("testicular_torsion_concern");
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|known (stable|resolving)|interval exam|observation complete/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const pickFamily = (): string | null => {
    if (torsionConcern && !isFollowUpContext) return null;
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("fournier_overlap") && !isFollowUpContext) return null;
    if (branches.includes("penile_fracture") && !isFollowUpContext) return null;
    if (branches.includes("epididymitis") && isFollowUpContext) {
      return ACUTE_SCROTAL_PENILE_EMERGENCY_DISCHARGE_FAMILY.epididymitis;
    }
    if (branches.includes("paraphimosis") && isFollowUpContext) {
      return ACUTE_SCROTAL_PENILE_EMERGENCY_DISCHARGE_FAMILY.paraphimosis;
    }
    if (isFollowUpContext) return ACUTE_SCROTAL_PENILE_EMERGENCY_DISCHARGE_FAMILY.other;
    return null;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    torsionExclusionForbidden: true,
    fournierPhase13OverlapOnly: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  testicular_torsion_concern: 100,
  testicular_torsion: 98,
  fournier_concern: 92,
  fournier_overlap: 90,
  priapism: 88,
  penile_fracture: 85,
  epididymitis: 60,
  paraphimosis: 55,
  other: 0,
};

export function adaptAcuteScrotalPenileEmergencyIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<AcuteScrotalPenileEmergencyContext, "branches" | "redFlagCategories">
): ProviderDocumentationComplaintIntelligence {
  const weightedHints = [
    ...context.redFlagCategories.map((value) => ({
      hint: value.replace(/_/g, " "),
      weight: BRANCH_PRIORITY[value] ?? 85,
    })),
    ...context.branches.map((value) => ({
      hint: value.replace(/_/g, " "),
      weight: BRANCH_PRIORITY[value] ?? 40,
    })),
  ];
  const score = (key: string) => {
    const compactKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    let best = 0;
    for (const { hint, weight } of weightedHints) {
      const compactHint = hint.replace(/[^a-z0-9]/g, "");
      if (compactKey.includes(compactHint)) best = Math.max(best, weight);
    }
    return best;
  };
  const prioritize = (keys?: string[]) => keys?.slice().sort((a, b) => score(b) - score(a));
  return {
    ...intel,
    hpi: prioritize(intel.hpi),
    rosRedFlags: prioritize(intel.rosRedFlags),
    mdmPlanSummary: prioritize(intel.mdmPlanSummary),
  };
}
