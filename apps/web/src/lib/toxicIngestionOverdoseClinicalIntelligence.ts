/**
 * Phase 16 (Commit 1) — overdose / toxic ingestion clinical documentation context.
 * Documentation advisory only — never establishes a diagnosis, antidote selection, dose,
 * decontamination, admission, transfer, psychiatric disposition, or “medical clearance.”
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  resolveToxicologyToxidromeRedFlags,
  type ToxicologyToxidromeRedFlagInput,
} from "./toxicologyToxidromeRedFlagEngine";
import { isToxicAmountUnknown, parseToxicExposureFromText } from "./toxicExposureFoundation";

export type ToxicIngestionOverdoseBranch =
  | "acetaminophen"
  | "salicylate"
  | "opioid"
  | "benzodiazepine_sedative"
  | "antidepressant"
  | "cardiovascular_agent"
  | "lithium_anticonvulsant"
  | "iron"
  | "unknown_ingestion"
  | "mixed_overdose"
  | "intentional_overdose"
  | "accidental_ingestion"
  | "delayed_release_concern"
  | "pediatric_ingestion"
  | "other";

export type ToxicIngestionOverdoseContext = {
  branches: ToxicIngestionOverdoseBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveToxicologyToxidromeRedFlags>["categories"];
  amountUnknown: boolean;
  psychiatricLinkageAdvisory: boolean;
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const HIGH_ACUITY_LOCK: readonly ToxicIngestionOverdoseBranch[] = [
  "intentional_overdose",
  "unknown_ingestion",
  "mixed_overdose",
  "delayed_release_concern",
  "cardiovascular_agent",
];

export const TOXIC_INGESTION_OVERDOSE_DISCHARGE_FAMILY: Record<ToxicIngestionOverdoseBranch, string | null> = {
  acetaminophen: "acetaminophen_exposure_followup_v1",
  salicylate: "salicylate_exposure_followup_v1",
  opioid: "opioid_overdose_post_observation_v1",
  benzodiazepine_sedative: "sedative_overdose_post_observation_v1",
  antidepressant: "unknown_ingestion_post_observation_v1",
  cardiovascular_agent: null,
  lithium_anticonvulsant: null,
  iron: null,
  unknown_ingestion: "unknown_ingestion_post_observation_v1",
  mixed_overdose: "unknown_ingestion_post_observation_v1",
  intentional_overdose: null,
  accidental_ingestion: "accidental_ingestion_v1",
  delayed_release_concern: null,
  pediatric_ingestion: "accidental_ingestion_v1",
  other: "low_risk_toxic_exposure_v1",
};

/** Documentation advisory only. Never invents dose or states medical clearance. */
export function resolveToxicIngestionOverdoseContext(
  input: ToxicologyToxidromeRedFlagInput
): ToxicIngestionOverdoseContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const exposure = parseToxicExposureFromText(text);
  const amountUnknown = isToxicAmountUnknown(exposure);
  const branches: ToxicIngestionOverdoseBranch[] = [];
  const redFlags = resolveToxicologyToxidromeRedFlags(input);

  if (/acetaminophen|paracetamol|4-aminophenol|tylenol/.test(text)) branches.push("acetaminophen");
  if (/salicylate|aspirin|\basa\b overdose|aspirin overdose/.test(text)) branches.push("salicylate");
  if (
    redFlags.categories.includes("opioid_toxidrome") ||
    /opioid (overdose|poisoning|toxicity)|fentanyl overdose|methadone overdose/.test(text)
  ) {
    branches.push("opioid");
  }
  if (
    redFlags.categories.includes("sedative_toxidrome") ||
    /benzodiazepine (overdose|poisoning)|sedative.?hypnotic (overdose|poisoning)/.test(text)
  ) {
    branches.push("benzodiazepine_sedative");
  }
  if (/antidepressant (overdose|poisoning|toxicity)|ssri overdose|tca overdose|tricyclic/.test(text)) {
    branches.push("antidepressant");
  }
  if (
    redFlags.categories.includes("severe_cardiovascular_toxicity") ||
    /beta.?blocker (overdose|poisoning)|calcium.?channel.?blocker|digoxin toxicity|clonidine (overdose|toxicity)/.test(
      text
    )
  ) {
    branches.push("cardiovascular_agent");
  }
  if (/lithium (toxicity|poisoning|overdose)|anticonvulsant (toxicity|overdose)|carbamazepine toxicity|phenytoin toxicity|valproate toxicity/.test(text)) {
    branches.push("lithium_anticonvulsant");
  }
  if (/iron (poisoning|overdose|toxicity)/.test(text)) branches.push("iron");
  if (
    redFlags.categories.includes("unknown_high_risk_ingestion") ||
    /unknown ingestion|unknown overdose|ingestion of unknown/.test(text)
  ) {
    branches.push("unknown_ingestion");
  }
  if (/mixed overdose|polysubstance overdose|co.?ingestion overdose/.test(text) || exposure.mixture === "mixed") {
    branches.push("mixed_overdose");
  }
  if (
    redFlags.categories.includes("intentional_self_harm_linkage") ||
    exposure.intent === "intentional" ||
    /intentional (overdose|ingestion)|suicidal (overdose|ingestion)/.test(text)
  ) {
    branches.push("intentional_overdose");
  }
  if (exposure.intent === "accidental" || /accidental (ingestion|overdose)/.test(text)) {
    branches.push("accidental_ingestion");
  }
  if (
    exposure.delayedReleaseConcernReported ||
    exposure.bodyPackerOrStufferConcernReported ||
    /extended.?release|delayed.?release|body.?packer|body.?stuffer/.test(text)
  ) {
    branches.push("delayed_release_concern");
  }
  if (exposure.pediatricContextReported || /pediatric (ingestion|overdose)|child ingested|toddler ingestion/.test(text)) {
    branches.push("pediatric_ingestion");
  }

  if (branches.length === 0 && /overdose|poisoning|toxic ingestion|ingestion/.test(text)) {
    branches.push("other");
  }
  if (branches.length === 0) branches.push("other");

  const psychiatricLinkageAdvisory = branches.includes("intentional_overdose");
  const isFollowUpContext =
    /follow[- ]?up|post-?acute|post.?observation|observation complete|known (stable|resolving)|interval exam/.test(
      text
    );
  const isHighAcuityLocked = branches.some((branch) => HIGH_ACUITY_LOCK.includes(branch));

  const pickFamily = (): string | null => {
    if (isHighAcuityLocked && !isFollowUpContext) return null;
    if (branches.includes("intentional_overdose") && !isFollowUpContext) return null;
    if (branches.includes("cardiovascular_agent") && !isFollowUpContext) return null;
    if (branches.includes("delayed_release_concern") && !isFollowUpContext) return null;
    if (branches.includes("unknown_ingestion")) return TOXIC_INGESTION_OVERDOSE_DISCHARGE_FAMILY.unknown_ingestion;
    if (branches.includes("mixed_overdose")) return TOXIC_INGESTION_OVERDOSE_DISCHARGE_FAMILY.mixed_overdose;
    if (branches.includes("acetaminophen")) return TOXIC_INGESTION_OVERDOSE_DISCHARGE_FAMILY.acetaminophen;
    if (branches.includes("salicylate")) return TOXIC_INGESTION_OVERDOSE_DISCHARGE_FAMILY.salicylate;
    if (branches.includes("opioid")) return TOXIC_INGESTION_OVERDOSE_DISCHARGE_FAMILY.opioid;
    if (branches.includes("benzodiazepine_sedative")) {
      return TOXIC_INGESTION_OVERDOSE_DISCHARGE_FAMILY.benzodiazepine_sedative;
    }
    if (branches.includes("pediatric_ingestion") || branches.includes("accidental_ingestion")) {
      return TOXIC_INGESTION_OVERDOSE_DISCHARGE_FAMILY.accidental_ingestion;
    }
    if (branches.includes("intentional_overdose") && isFollowUpContext) {
      return "poison_control_followup_v1";
    }
    return TOXIC_INGESTION_OVERDOSE_DISCHARGE_FAMILY.other;
  };

  return {
    branches: [...new Set(branches)],
    dischargeFamilyId: pickFamily(),
    redFlagCategories: redFlags.categories,
    amountUnknown,
    psychiatricLinkageAdvisory,
  };
}

const BRANCH_PRIORITY: Record<string, number> = {
  intentional_self_harm_linkage: 100,
  intentional_overdose: 98,
  severe_cardiovascular_toxicity: 95,
  unknown_high_risk_ingestion: 92,
  unknown_ingestion: 90,
  mixed_overdose: 88,
  delayed_release_concern: 86,
  opioid_toxidrome: 84,
  opioid: 82,
  acetaminophen: 70,
  salicylate: 68,
  benzodiazepine_sedative: 65,
  pediatric_ingestion: 55,
  accidental_ingestion: 40,
  other: 0,
};

/** Reorders click-only documentation suggestions; never changes diagnosis or treatment. */
export function adaptToxicIngestionOverdoseIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<ToxicIngestionOverdoseContext, "branches" | "redFlagCategories">
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
