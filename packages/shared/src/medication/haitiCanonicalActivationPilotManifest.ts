/**
 * M1.5G — Haiti canonical activation pilot manifest (T1 ER/IV only, ≤82 cap).
 */

import { HAITI_CANONICAL_LINKAGE_MANIFEST } from "./haitiCanonicalMedicationLinkageManifest.js";
import { productCodeLooksQuarantined } from "./haitiCanonicalMedicationMatching.js";
import { isQuarantinedCanonicalProduct } from "./haitiCanonicalMedicationQuarantine.js";
import type { HaitiCanonicalActivationPilotEntry } from "./haitiCanonicalActivationPilotTypes.js";
import type { HaitiCanonicalMedicationLinkageEntry } from "./haitiCanonicalMedicationLinkageTypes.js";

export const HAITI_CANONICAL_ACTIVATION_PILOT_VERSION = "M1.5G" as const;

/** Maximum T1 rows in linkage manifest (billable ER/IV scope). */
export const HAITI_CANONICAL_ACTIVATION_PILOT_T1_CAP = 82 as const;

function safetyExcluded(entry: HaitiCanonicalMedicationLinkageEntry): string | null {
  if (entry.safetyFlags.controlled) return "controlled substance";
  if (entry.safetyFlags.highAlert) return "high-alert medication";
  if (entry.safetyFlags.lasa) return "LASA pair";
  if (entry.safetyFlags.opioid) return "opioid";
  if (entry.safetyFlags.insulin) return "insulin";
  if (entry.safetyFlags.anticoagulant) return "anticoagulant";
  return null;
}

function classifyPilotEntry(entry: HaitiCanonicalMedicationLinkageEntry): HaitiCanonicalActivationPilotEntry {
  const safetyReason = safetyExcluded(entry);
  if (safetyReason) {
    return {
      catalogMedicationCode: entry.catalogMedicationCode,
      genericName: entry.genericName,
      displayName: entry.displayName,
      proposedConceptCode: entry.proposedConceptCode,
      proposedProductCode: entry.proposedProductCode,
      proposedPackageCode: entry.proposedPackageCode,
      tranche: entry.tranche,
      safetyFlags: entry.safetyFlags,
      billingFlags: entry.billingFlags,
      linkageStatus: entry.linkageStatus,
      reviewerRequired: entry.reviewerRequired,
      pilotStatus: "PILOT_EXCLUDED_SAFETY",
      pilotEligible: false,
      pilotRationale: `Excluded from pilot: ${safetyReason}`,
    };
  }

  if (productCodeLooksQuarantined(entry.proposedProductCode)) {
    return {
      catalogMedicationCode: entry.catalogMedicationCode,
      genericName: entry.genericName,
      displayName: entry.displayName,
      proposedConceptCode: entry.proposedConceptCode,
      proposedProductCode: entry.proposedProductCode,
      proposedPackageCode: entry.proposedPackageCode,
      tranche: entry.tranche,
      safetyFlags: entry.safetyFlags,
      billingFlags: entry.billingFlags,
      linkageStatus: entry.linkageStatus,
      reviewerRequired: entry.reviewerRequired,
      pilotStatus: "PILOT_EXCLUDED_QUARANTINE",
      pilotEligible: false,
      pilotRationale: "Proposed product code matches quarantine deny-list prefix",
    };
  }

  const quarantine = isQuarantinedCanonicalProduct({
    productCode: entry.proposedProductCode,
    conceptGenericName: entry.genericName,
  });
  if (quarantine === "QUARANTINE") {
    return {
      catalogMedicationCode: entry.catalogMedicationCode,
      genericName: entry.genericName,
      displayName: entry.displayName,
      proposedConceptCode: entry.proposedConceptCode,
      proposedProductCode: entry.proposedProductCode,
      proposedPackageCode: entry.proposedPackageCode,
      tranche: entry.tranche,
      safetyFlags: entry.safetyFlags,
      billingFlags: entry.billingFlags,
      linkageStatus: entry.linkageStatus,
      reviewerRequired: entry.reviewerRequired,
      pilotStatus: "PILOT_EXCLUDED_QUARANTINE",
      pilotEligible: false,
      pilotRationale: "Quarantine classifier rejects proposed Haiti target",
    };
  }

  if (entry.linkageStatus === "DO_NOT_LINK" || entry.linkageStatus === "MANUAL_REVIEW") {
    return {
      catalogMedicationCode: entry.catalogMedicationCode,
      genericName: entry.genericName,
      displayName: entry.displayName,
      proposedConceptCode: entry.proposedConceptCode,
      proposedProductCode: entry.proposedProductCode,
      proposedPackageCode: entry.proposedPackageCode,
      tranche: entry.tranche,
      safetyFlags: entry.safetyFlags,
      billingFlags: entry.billingFlags,
      linkageStatus: entry.linkageStatus,
      reviewerRequired: entry.reviewerRequired,
      pilotStatus:
        entry.linkageStatus === "MANUAL_REVIEW"
          ? "PILOT_DEFERRED_MANUAL_REVIEW"
          : "PILOT_EXCLUDED_LINKAGE",
      pilotEligible: false,
      pilotRationale:
        entry.linkageStatus === "MANUAL_REVIEW"
          ? "Linkage manifest requires manual review before activation"
          : "Linkage status DO_NOT_LINK",
    };
  }

  if (entry.linkageStatus !== "MISSING_CANONICAL_TARGET" && entry.linkageStatus !== "LINK_READY") {
    return {
      catalogMedicationCode: entry.catalogMedicationCode,
      genericName: entry.genericName,
      displayName: entry.displayName,
      proposedConceptCode: entry.proposedConceptCode,
      proposedProductCode: entry.proposedProductCode,
      proposedPackageCode: entry.proposedPackageCode,
      tranche: entry.tranche,
      safetyFlags: entry.safetyFlags,
      billingFlags: entry.billingFlags,
      linkageStatus: entry.linkageStatus,
      reviewerRequired: entry.reviewerRequired,
      pilotStatus: "PILOT_EXCLUDED_LINKAGE",
      pilotEligible: false,
      pilotRationale: `Unsupported linkage status ${entry.linkageStatus}`,
    };
  }

  return {
    catalogMedicationCode: entry.catalogMedicationCode,
    genericName: entry.genericName,
    displayName: entry.displayName,
    proposedConceptCode: entry.proposedConceptCode,
    proposedProductCode: entry.proposedProductCode,
    proposedPackageCode: entry.proposedPackageCode,
    tranche: entry.tranche,
    safetyFlags: entry.safetyFlags,
    billingFlags: entry.billingFlags,
    linkageStatus: entry.linkageStatus,
    reviewerRequired: entry.reviewerRequired,
    pilotStatus: "PILOT_ELIGIBLE",
    pilotEligible: true,
    pilotRationale: "T1 ER/IV billable Haiti row — auto-eligible for M1.5G pilot activation",
  };
}

/** All T1 linkage rows (≤82) with pilot eligibility classification. */
export const HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST: HaitiCanonicalActivationPilotEntry[] =
  HAITI_CANONICAL_LINKAGE_MANIFEST.filter((e) => e.tranche === "T1").map(classifyPilotEntry);

/** Rows that may be activated by the M1.5G helper without manual sign-off. */
export const HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE: HaitiCanonicalActivationPilotEntry[] =
  HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.filter((e) => e.pilotEligible);

export const HAITI_CANONICAL_ACTIVATION_PILOT_BY_CATALOG_CODE: Record<
  string,
  HaitiCanonicalActivationPilotEntry
> = Object.fromEntries(
  HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.map((e) => [e.catalogMedicationCode, e])
);

export const HAITI_CANONICAL_ACTIVATION_PILOT_STATS = {
  t1Total: HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.length,
  pilotEligible: HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE.length,
  deferredManualReview: HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.filter(
    (e) => e.pilotStatus === "PILOT_DEFERRED_MANUAL_REVIEW"
  ).length,
  excludedSafety: HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.filter(
    (e) => e.pilotStatus === "PILOT_EXCLUDED_SAFETY"
  ).length,
} as const;
