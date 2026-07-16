/**
 * Phase 12 — throat / neck / upper airway emergency clinical documentation context.
 * Mirrors `eyeComplaintClinicalIntelligence.ts` (Phase 11). Documentation advisory only —
 * never establishes a diagnosis, disposition, or airway management decision. Ownership of
 * the actual clinical decision (airway intervention, consult, admit) stays with the
 * treating clinician.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { resolveEntEmergencyRedFlags, type EntEmergencyRedFlagInput } from "./entEmergencyRedFlagEngine";

export type EntThroatNeckAirwayBranch =
  | "pharyngitis_tonsillitis"
  | "peritonsillar_abscess"
  | "retropharyngeal_abscess"
  | "parapharyngeal_deep_neck"
  | "ludwig_angina"
  | "epiglottitis"
  | "odontogenic_spread"
  | "sialadenitis"
  | "salivary_obstruction"
  | "throat_foreign_body"
  | "airway_foreign_body";

export type EntThroatNeckAirwayContext = {
  branches: EntThroatNeckAirwayBranch[];
  dischargeFamilyId: string | null;
  redFlagCategories: ReturnType<typeof resolveEntEmergencyRedFlags>["categories"];
};

const norm = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Airway-threatening branches that must never fall through to a routine discharge family. */
const AIRWAY_THREATENING_LOCK: readonly EntThroatNeckAirwayBranch[] = [
  "peritonsillar_abscess",
  "retropharyngeal_abscess",
  "parapharyngeal_deep_neck",
  "ludwig_angina",
  "epiglottitis",
  "airway_foreign_body",
];

export const ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY: Record<EntThroatNeckAirwayBranch, string> = {
  pharyngitis_tonsillitis: "pharyngitis_tonsillitis_followup",
  peritonsillar_abscess: "peritonsillar_abscess_followup",
  retropharyngeal_abscess: "retropharyngeal_abscess_followup",
  parapharyngeal_deep_neck: "deep_neck_infection_followup",
  ludwig_angina: "ludwig_angina_followup",
  epiglottitis: "epiglottitis_followup",
  odontogenic_spread: "odontogenic_spread_followup",
  sialadenitis: "sialadenitis_followup",
  salivary_obstruction: "salivary_obstruction_followup",
  throat_foreign_body: "throat_foreign_body_followup",
  airway_foreign_body: "airway_foreign_body_followup",
};

/** True whenever a documented branch is airway-threatening and requires PTA/RPA/Ludwig/epiglottitis-level caution. */
function isAirwayThreateningPresentation(
  branches: readonly EntThroatNeckAirwayBranch[],
  hasAirwayRedFlag: boolean
): boolean {
  return branches.some((branch) => AIRWAY_THREATENING_LOCK.includes(branch)) || hasAirwayRedFlag;
}

/** Documentation advisory only. Never establishes a diagnosis, airway management decision, or disposition. */
export function resolveEntThroatNeckAirwayContext(input: EntEmergencyRedFlagInput): EntThroatNeckAirwayContext {
  const text = norm([input.code, input.displayName, ...(input.documentedFlags ?? [])].filter(Boolean).join(" "));
  const branches: EntThroatNeckAirwayBranch[] = [];

  if (/peritonsillar abscess|quinsy/.test(text)) branches.push("peritonsillar_abscess");
  else if (/pharyngitis|tonsillitis|sore throat/.test(text)) branches.push("pharyngitis_tonsillitis");

  if (/retropharyngeal abscess|prevertebral (soft tissue )?swelling/.test(text)) branches.push("retropharyngeal_abscess");
  if (/parapharyngeal abscess|deep neck (space )?infection/.test(text)) branches.push("parapharyngeal_deep_neck");
  if (/ludwig'?s? angina|bilateral submandibular (swelling|induration)|floor of mouth swelling/.test(text)) {
    branches.push("ludwig_angina");
  }
  if (/epiglottitis|thumbprint sign/.test(text)) branches.push("epiglottitis");
  if (/odontogenic (infection|abscess|spread)|dental (infection|abscess) spread/.test(text)) branches.push("odontogenic_spread");
  if (/sialadenitis|salivary gland infection/.test(text)) branches.push("sialadenitis");
  if (/sialolithiasis|salivary (duct|gland) obstruction|salivary stone/.test(text)) branches.push("salivary_obstruction");

  if (/airway foreign body|foreign body (in|obstructing) (the )?airway|choking (episode|obstruction)/.test(text)) {
    branches.push("airway_foreign_body");
  } else if (/foreign body in (the )?throat|throat foreign body|fish bone|food bolus (impaction|stuck)/.test(text)) {
    branches.push("throat_foreign_body");
  }

  const isFollowUpContext = /follow[- ]?up|recheck|known (stable|resolving)|interval exam|post-?operative check/.test(text);
  const redFlags = resolveEntEmergencyRedFlags(input);
  const hasAirwayRedFlag =
    redFlags.categories.includes("airway_compromise") ||
    redFlags.categories.includes("ludwig_angina") ||
    redFlags.categories.includes("epiglottitis") ||
    redFlags.categories.includes("deep_neck_infection") ||
    redFlags.categories.includes("retropharyngeal_abscess");
  const isAirwayLocked = isAirwayThreateningPresentation(branches, hasAirwayRedFlag);

  const dischargeFamilyId =
    isAirwayLocked
      ? isFollowUpContext
        ? airwayThreateningFollowUpFamily(branches)
        : null
      : branches.includes("throat_foreign_body")
      ? ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.throat_foreign_body
      : branches.includes("odontogenic_spread")
      ? ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.odontogenic_spread
      : branches.includes("sialadenitis")
      ? ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.sialadenitis
      : branches.includes("salivary_obstruction")
      ? ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.salivary_obstruction
      : branches.includes("pharyngitis_tonsillitis")
      ? ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.pharyngitis_tonsillitis
      : null;

  return { branches: [...new Set(branches)], dischargeFamilyId, redFlagCategories: redFlags.categories };
}

function airwayThreateningFollowUpFamily(branches: readonly EntThroatNeckAirwayBranch[]): string {
  if (branches.includes("epiglottitis")) return ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.epiglottitis;
  if (branches.includes("ludwig_angina")) return ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.ludwig_angina;
  if (branches.includes("retropharyngeal_abscess")) return ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.retropharyngeal_abscess;
  if (branches.includes("parapharyngeal_deep_neck")) return ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.parapharyngeal_deep_neck;
  if (branches.includes("peritonsillar_abscess")) return ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.peritonsillar_abscess;
  if (branches.includes("airway_foreign_body")) return ENT_THROAT_NECK_AIRWAY_DISCHARGE_FAMILY.airway_foreign_body;
  return "ent_throat_neck_airway_high_acuity_followup";
}

const BRANCH_PRIORITY: Record<string, number> = {
  airway_compromise: 100,
  epiglottitis: 98,
  ludwig_angina: 96,
  deep_neck_infection: 92,
  retropharyngeal_abscess: 90,
  parapharyngeal_deep_neck: 88,
  airway_foreign_body: 86,
  peritonsillar_abscess: 80,
  button_battery_foreign_body: 78,
  odontogenic_spread: 40,
  sialadenitis: 35,
  salivary_obstruction: 30,
  throat_foreign_body: 25,
  pharyngitis_tonsillitis: 10,
};

/** Reorders click-only documentation suggestions; it never changes diagnosis, airway status, or disposition. */
export function adaptEntThroatNeckAirwayIntel(
  intel: ProviderDocumentationComplaintIntelligence,
  context: Pick<EntThroatNeckAirwayContext, "branches" | "redFlagCategories">
): ProviderDocumentationComplaintIntelligence {
  const weightedHints = [
    ...context.redFlagCategories.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 85 })),
    ...context.branches.map((value) => ({ hint: value.replace(/_/g, " "), weight: BRANCH_PRIORITY[value] ?? 40 })),
  ];
  const score = (key: string) => {
    const compactKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    let best = 0;
    for (const { hint, weight } of weightedHints) {
      const compactHint = hint.replace(/[^a-z0-9]/g, "");
      if (compactKey.includes(compactHint)) {
        best = Math.max(best, weight);
      }
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
