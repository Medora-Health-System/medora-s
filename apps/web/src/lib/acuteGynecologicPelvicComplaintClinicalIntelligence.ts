/**
 * Phase 17 (Commit 1) — acute gynecologic / pelvic complaint clinical documentation context.
 * Documentation advisory only — never excludes torsion, never forces forensic exam for
 * sexual assault, and never establishes a diagnosis.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveObGynUrologyRedFlags,
  type ObGynUrologyRedFlagInput,
} from "./obGynUrologyRedFlagEngine";
import { parseReproductiveGuFromText } from "./reproductiveGuFoundation";

export type AcuteGynecologicPelvicComplaintBranch =
  | "ovarian_torsion"
  | "ruptured_cyst"
  | "pid"
  | "tubo_ovarian_abscess"
  | "endometriosis_flare"
  | "sexual_assault_linkage"
  | "other";

export type AcuteGynecologicPelvicComplaintContext = {
  branches: AcuteGynecologicPelvicComplaintBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveObGynUrologyRedFlags>["categories"];
  torsionExclusionForbidden: true;
  sexualAssaultLinkOnly: true;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly AcuteGynecologicPelvicComplaintBranch[] = [
  "ovarian_torsion",
  "tubo_ovarian_abscess",
];

export const ACUTE_GYNECOLOGIC_PELVIC_COMPLAINT_DISCHARGE_FAMILY: Record<
  AcuteGynecologicPelvicComplaintBranch,
  string | null
> = {
  ovarian_torsion: null,
  ruptured_cyst: "ruptured_ovarian_cyst_followup_v1",
  pid: "pid_followup_v1",
  tubo_ovarian_abscess: null,
  endometriosis_flare: "pelvic_pain_followup_v1",
  sexual_assault_linkage: null,
  other: "pelvic_pain_followup_v1",
};

/** Documentation advisory only. Doppler presence does not exclude torsion. */
export function resolveAcuteGynecologicPelvicComplaintContext(
  input: ObGynUrologyRedFlagInput
): AcuteGynecologicPelvicComplaintContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  parseReproductiveGuFromText(text);
  const branches: AcuteGynecologicPelvicComplaintBranch[] = [];
  const redFlags = resolveObGynUrologyRedFlags(input);

  if (
    redFlags.categories.includes("ovarian_torsion_concern") ||
    /ovarian torsion|adnexal torsion|torsion concern/.test(text)
  ) {
    branches.push("ovarian_torsion");
  }
  if (/ruptured (ovarian )?cyst|hemorrhagic cyst|corpus luteum rupture/.test(text)) {
    branches.push("ruptured_cyst");
  }
  if (/pid|pelvic inflammatory disease|salpingitis/.test(text)) branches.push("pid");
  if (/tubo.?ovarian abscess|toa\b/.test(text)) branches.push("tubo_ovarian_abscess");
  if (/endometriosis|endometrioma flare/.test(text)) branches.push("endometriosis_flare");
  if (/sexual assault|rape|non.?consensual/.test(text)) branches.push("sexual_assault_linkage");

  if (branches.length === 0 && /pelvic pain|gynecologic|adnexal|ovarian/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const torsionConcern =
    branches.includes("ovarian_torsion") ||
    redFlags.categories.includes("ovarian_torsion_concern");
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|known (stable|resolving)|interval exam|observation complete/.test(text);
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const pickFamily = (): string | null => {
    if (torsionConcern && !isFollowUpContext) return null;
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("sexual_assault_linkage") && !isFollowUpContext) return null;
    if (branches.includes("tubo_ovarian_abscess") && !isFollowUpContext) return null;
    if (branches.includes("ruptured_cyst") && isFollowUpContext) {
      return ACUTE_GYNECOLOGIC_PELVIC_COMPLAINT_DISCHARGE_FAMILY.ruptured_cyst;
    }
    if (branches.includes("pid") && isFollowUpContext) {
      return ACUTE_GYNECOLOGIC_PELVIC_COMPLAINT_DISCHARGE_FAMILY.pid;
    }
    if (isFollowUpContext) return ACUTE_GYNECOLOGIC_PELVIC_COMPLAINT_DISCHARGE_FAMILY.other;
    return null;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    torsionExclusionForbidden: true,
    sexualAssaultLinkOnly: true,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  ovarian_torsion_concern: 100,
  ovarian_torsion: 98,
  tubo_ovarian_abscess: 90,
  pid: 70,
  ruptured_cyst: 65,
  sexual_assault_linkage: 60,
  endometriosis_flare: 50,
  other: 0,
};

export function adaptAcuteGynecologicPelvicComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<AcuteGynecologicPelvicComplaintContext, "branches" | "redFlagCategories">
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
