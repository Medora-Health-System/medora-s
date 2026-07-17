/**
 * Phase 16 (Commit 1) — substance intoxication / withdrawal clinical documentation context.
 * Does not conflate intoxication with withdrawal. CIWA-Ar/COWS remain documentation-reviewed
 * if obtained — never score-driven medication orders or disposition.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveToxicologyToxidromeRedFlags,
  type ToxicologyToxidromeRedFlagInput,
} from "./toxicologyToxidromeRedFlagEngine";

export type SubstanceIntoxicationWithdrawalBranch =
  | "alcohol_intoxication"
  | "alcohol_withdrawal"
  | "opioid_intoxication"
  | "opioid_withdrawal"
  | "stimulant_intoxication"
  | "cannabis_intoxication"
  | "sedative_withdrawal"
  | "polysubstance"
  | "other";

export type SubstanceIntoxicationWithdrawalContext = {
  branches: SubstanceIntoxicationWithdrawalBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveToxicologyToxidromeRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly SubstanceIntoxicationWithdrawalBranch[] = ["alcohol_withdrawal", "polysubstance"];

export const SUBSTANCE_INTOXICATION_WITHDRAWAL_DISCHARGE_FAMILY: Record<
  SubstanceIntoxicationWithdrawalBranch,
  string | null
> = {
  alcohol_intoxication: "alcohol_intoxication_v1",
  alcohol_withdrawal: "alcohol_withdrawal_post_acute_v1",
  opioid_intoxication: "opioid_overdose_post_observation_v1",
  opioid_withdrawal: null,
  stimulant_intoxication: "stimulant_intoxication_v1",
  cannabis_intoxication: "cannabis_intoxication_v1",
  sedative_withdrawal: null,
  polysubstance: "unknown_ingestion_post_observation_v1",
  other: "low_risk_toxic_exposure_v1",
};

/** Documentation advisory only. Intoxication and withdrawal remain distinct branches. */
export function resolveSubstanceIntoxicationWithdrawalContext(
  input: ToxicologyToxidromeRedFlagInput
): SubstanceIntoxicationWithdrawalContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: SubstanceIntoxicationWithdrawalBranch[] = [];
  const redFlags = resolveToxicologyToxidromeRedFlags(input);

  const hasWithdrawalLanguage = /\bwithdrawal\b|\bciwa\b|\bcows\b|\bdelirium tremens\b|\bdt\b/.test(text);
  const hasIntoxicationLanguage = /\bintoxication\b|\bintoxicated\b|\bacute intoxication\b/.test(text);

  if (/alcohol withdrawal|ethanol withdrawal|delirium tremens|withdrawal seizure/.test(text) || (hasWithdrawalLanguage && /alcohol|ethanol/.test(text))) {
    branches.push("alcohol_withdrawal");
  } else if (/alcohol intoxication|ethanol intoxication|acute alcohol intoxication/.test(text) || (hasIntoxicationLanguage && /alcohol|ethanol/.test(text))) {
    branches.push("alcohol_intoxication");
  } else if (/alcohol|ethanol/.test(text) && !hasWithdrawalLanguage) {
    branches.push("alcohol_intoxication");
  }

  if (/opioid withdrawal|heroin withdrawal|fentanyl withdrawal/.test(text) || (hasWithdrawalLanguage && /opioid|heroin|fentanyl|methadone/.test(text))) {
    branches.push("opioid_withdrawal");
  } else if (
    redFlags.categories.includes("opioid_toxidrome") ||
    /opioid intoxication|opioid overdose|heroin intoxication|fentanyl intoxication/.test(text)
  ) {
    branches.push("opioid_intoxication");
  }

  if (
    redFlags.categories.includes("sympathomimetic") ||
    /stimulant intoxication|cocaine (toxicity|intoxication)|methamphetamine intoxication|amphetamine intoxication/.test(
      text
    )
  ) {
    branches.push("stimulant_intoxication");
  }

  if (/cannabis intoxication|marijuana intoxication|thc intoxication|synthetic cannabinoid/.test(text)) {
    branches.push("cannabis_intoxication");
  }

  if (/sedative withdrawal|benzodiazepine withdrawal|gaba.?ergic withdrawal/.test(text)) {
    branches.push("sedative_withdrawal");
  }

  if (/polysubstance|mixed intoxication|multiple substances/.test(text)) {
    branches.push("polysubstance");
  }

  if (branches.length === 0 && (/intoxication|withdrawal|substance/.test(text) || redFlags.categories.includes("withdrawal_delirium_concern"))) {
    if (redFlags.categories.includes("withdrawal_delirium_concern")) branches.push("alcohol_withdrawal");
    else branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  // Guard: never let a pure intoxication phrase also force withdrawal without withdrawal language.
  if (branches.includes("alcohol_intoxication") && branches.includes("alcohol_withdrawal") && !hasWithdrawalLanguage) {
    const idx = branches.indexOf("alcohol_withdrawal");
    if (idx >= 0) branches.splice(idx, 1);
  }

  const severeWithdrawal =
    branches.includes("alcohol_withdrawal") &&
    (/seizure|delirium tremens|\bdt\b|withdrawal delirium/.test(text) ||
      redFlags.categories.includes("withdrawal_delirium_concern"));
  const isFollowUpContext = /follow[- ]?up|post-?acute|post.?observation|known (stable|resolving)/.test(text);
  const isHighAcuityLocked =
    (branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch)) && severeWithdrawal) ||
    (branches.includes("polysubstance") && /severe|unstable|coma|respiratory depression/.test(text));

  const pickFamily = (): string | null => {
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("alcohol_withdrawal")) {
      return isFollowUpContext || !severeWithdrawal
        ? SUBSTANCE_INTOXICATION_WITHDRAWAL_DISCHARGE_FAMILY.alcohol_withdrawal
        : null;
    }
    if (branches.includes("polysubstance") && !isFollowUpContext) return null;
    if (branches.includes("alcohol_intoxication")) {
      return SUBSTANCE_INTOXICATION_WITHDRAWAL_DISCHARGE_FAMILY.alcohol_intoxication;
    }
    if (branches.includes("opioid_intoxication")) {
      return isFollowUpContext
        ? SUBSTANCE_INTOXICATION_WITHDRAWAL_DISCHARGE_FAMILY.opioid_intoxication
        : null;
    }
    if (branches.includes("stimulant_intoxication")) {
      return SUBSTANCE_INTOXICATION_WITHDRAWAL_DISCHARGE_FAMILY.stimulant_intoxication;
    }
    if (branches.includes("cannabis_intoxication")) {
      return SUBSTANCE_INTOXICATION_WITHDRAWAL_DISCHARGE_FAMILY.cannabis_intoxication;
    }
    return SUBSTANCE_INTOXICATION_WITHDRAWAL_DISCHARGE_FAMILY.other;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  withdrawal_delirium_concern: 100,
  alcohol_withdrawal: 95,
  sedative_withdrawal: 90,
  polysubstance: 85,
  opioid_intoxication: 80,
  stimulant_intoxication: 70,
  alcohol_intoxication: 60,
  cannabis_intoxication: 40,
  opioid_withdrawal: 50,
  other: 0,
};

export function adaptSubstanceIntoxicationWithdrawalIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<SubstanceIntoxicationWithdrawalContext, "branches" | "redFlagCategories">
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
