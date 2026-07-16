import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { resolveSpineRedFlags, type SpineRedFlagInput } from "./spineRedFlagEngine";

export type SpineBackPainBranch =
  | "cervical_strain" | "thoracic_strain" | "lumbar_strain" | "radiculopathy" | "sciatica"
  | "disc" | "stenosis" | "myelopathy" | "cauda" | "infection" | "malignancy";

export type SpineBackPainContext = {
  branches: SpineBackPainBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveSpineRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function resolveSpineBackPainContext(input: SpineRedFlagInput): SpineBackPainContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: SpineBackPainBranch[] = [];
  if (/cervical|neck strain|m54\.2/.test(text)) branches.push("cervical_strain");
  if (/thoracic/.test(text)) branches.push("thoracic_strain");
  if (/lumbar|low back|m54\.5/.test(text)) branches.push("lumbar_strain");
  if (/radiculopathy|m54\.1|m54\.16|m54\.12/.test(text)) branches.push("radiculopathy");
  if (/sciatica|m54\.3|m54\.4/.test(text)) branches.push("sciatica");
  if (/disc|herniat|m50|m51/.test(text)) branches.push("disc");
  if (/stenosis|m48/.test(text)) branches.push("stenosis");
  if (/myelopath/.test(text)) branches.push("myelopathy");
  if (/cauda|g83\.4/.test(text)) branches.push("cauda");
  if (/epidural abscess|discitis|osteomyelitis|m46/.test(text)) branches.push("infection");
  if (/malignan|cancer|pathologic/.test(text)) branches.push("malignancy");
  const redFlags = resolveSpineRedFlags(input);
  const dischargeFamilyId =
    branches.includes("cauda") ? "post_caudal_red_flag_evaluation"
    : branches.includes("infection") || branches.includes("malignancy") ? null
    : branches.includes("sciatica") || branches.includes("radiculopathy") ? "lumbar_radiculopathy_sciatica"
    : branches.includes("disc") ? "disc_herniation_conservative"
    : branches.includes("stenosis") ? "spinal_stenosis"
    : branches.includes("cervical_strain") ? "cervical_strain"
    : branches.includes("thoracic_strain") ? "thoracic_strain"
    : branches.includes("lumbar_strain") ? "lumbar_strain"
    : "acute_mechanical_back_pain";
  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

const BRANCH_PRIORITY: Record<string, number> = {
  cauda: 100,
  cauda_equina: 100,
  infection: 95,
  malignancy: 95,
  myelopathy: 85,
  stenosis: 70,
  disc: 65,
  radiculopathy: 60,
  sciatica: 55,
  lumbar_strain: 40,
  thoracic_strain: 40,
  cervical_strain: 40,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis or disposition. */
export function adaptSpineBackPainComplaintIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<SpineBackPainContext, "branches" | "redFlagCategories">,
): ProviderDocumentationComplaintIntelligence {
  const weightedHints = [
    ...context.redFlagCategories.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 90 })),
    ...context.branches.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 50 })),
  ];
  const score = (key: string) => {
    const lower = key.toLowerCase();
    let best = 0;
    for (const { hint, weight } of weightedHints) {
      if (lower.includes(hint) || (hint.includes("cauda") && lower.includes("cauda"))) {
        best = Math.max(best, weight);
      }
    }
    return best;
  };
  const prioritize = (keys?: string[]) => keys?.slice().sort((a, b) => score(b) - score(a));
  return { ...intel, hpi: prioritize(intel.hpi), rosRedFlags: prioritize(intel.rosRedFlags), mdmPlanSummary: prioritize(intel.mdmPlanSummary) };
}
