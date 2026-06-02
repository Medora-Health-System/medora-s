import type { HaitiCanonicalMedicationLinkageEntry } from "./haitiCanonicalMedicationLinkageTypes.js";

export const HAITI_PILOT_ACTIVATION_STATUS_VALUES = [
  "PILOT_ELIGIBLE",
  "PILOT_DEFERRED_MANUAL_REVIEW",
  "PILOT_EXCLUDED_SAFETY",
  "PILOT_EXCLUDED_LINKAGE",
  "PILOT_EXCLUDED_QUARANTINE",
] as const;

export type HaitiPilotActivationStatus = (typeof HAITI_PILOT_ACTIVATION_STATUS_VALUES)[number];

export type HaitiCanonicalActivationPilotEntry = Pick<
  HaitiCanonicalMedicationLinkageEntry,
  | "catalogMedicationCode"
  | "genericName"
  | "displayName"
  | "proposedConceptCode"
  | "proposedProductCode"
  | "proposedPackageCode"
  | "tranche"
  | "safetyFlags"
  | "billingFlags"
  | "linkageStatus"
  | "reviewerRequired"
> & {
  pilotStatus: HaitiPilotActivationStatus;
  pilotEligible: boolean;
  pilotRationale: string;
};

export type HaitiPilotActivationValidationIssue = {
  kind: string;
  catalogMedicationCode?: string;
  message: string;
  severity: "blocking" | "warning";
};

export type HaitiPilotReadinessScores = {
  activationSafety: number;
  searchSafety: number;
  billingSafety: number;
  governanceSafety: number;
  orderingSafety: number;
  enterpriseReadiness: number;
};
